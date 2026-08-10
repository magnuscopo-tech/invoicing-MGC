# Invoicing Tool — API Documentation

Backend for the Quotation → Proforma Invoice → Tax Invoice workflow.

- **Base URL:** `http://localhost:5000` (set `APP_BASE_URL` per environment)
- **API prefix:** `/api`
- **Content type:** `application/json` for every endpoint except the two file uploads (`multipart/form-data`)
- **Auth:** `Authorization: Bearer <token>` on every route except `POST /api/auth/register`, `POST /api/auth/login` and `GET /health`

---

## 1. Conventions

### Response envelopes

Success:

```json
{ "success": true, "message": "…", "data": {}, "statusCode": 200 }
```

Paginated list:

```json
{ "success": true, "message": "…", "total": 100, "page": 1, "limit": 20, "data": [], "statusCode": 200 }
```

Error:

```json
{ "success": false, "message": "…", "statusCode": 404 }
```

Joi validation failure — **note this envelope has only `message`**, no `success`/`statusCode`:

```json
{ "message": "GSTIN must be a valid 15 character GSTIN" }
```

> **Frontend tip:** read the error text as `res.data?.message` in both cases. Only the first Joi failure is returned per request.

### Status codes

| Code | Meaning |
|---|---|
| 200 | Successful read / update |
| 201 | Resource created (register, create *, convert) |
| 401 | Invalid, expired, or invalidated token |
| 403 | Missing token, deactivated account, or insufficient role |
| 404 | Resource or route not found |
| 422 | Validation or business-rule failure |
| 429 | Auth rate limit exceeded (30 requests / 15 min on `/api/auth/*`) |
| 500 | Unexpected server error |

### Money and GST

- Currency is **INR only**. All amounts are plain numbers rounded to 2 decimals.
- **GST is fixed at 18%** and is a server constant. Sending `gstPercent` in any request body is rejected with 422. The frontend should render the literal label `GST @ 18%` and never offer a rate input.
- The frontend may recalculate totals live for UI feedback, but **the server recalculates on every write and persists its own result**. Any `amount`, `subTotal`, `gstAmount` or `totalAmount` sent by the client is ignored.

Formulas the server uses (mirror these for live preview):

```
lineAmount   = qty * unitPrice * (1 - discountPercent / 100)
subTotal     = sum(lineAmount)
gstAmount    = gstApplicable ? subTotal * 0.18 : 0
totalAmount  = subTotal + gstAmount
```

### Document numbering

| Type | Format | Example | Resets |
|---|---|---|---|
| Quotation | `MCQ/{calendarYear}-{serial}` | `MCQ/2026-008` | 1 January |
| Proforma / Invoice | `MCI/{FY}/{serial}` | `MCI/26-27/003` | 1 April |

Indian FY runs 1 April → 31 March, so an `issueDate` of `2026-04-01` yields `26-27` and `2026-03-31` yields `25-26`. Serials are zero-padded to 3 digits and counted per **(series, company, year)**.

---

## 2. Auth — `/api/auth`

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | public | Create an account, returns a token |
| POST | `/api/auth/createUser` | required (admin) | Same as register, for use when `RESTRICT_REGISTRATION=true` |
| POST | `/api/auth/login` | public | Log in |
| GET | `/api/auth/getProfile` | required | Current user |
| POST | `/api/auth/changePassword` | required | Change password (invalidates existing tokens) |
| POST | `/api/auth/logout` | required | Invalidates every token issued before now |
| GET | `/api/auth/getAllUsers` | required (admin) | Team roster for the admin dashboard |
| PUT | `/api/auth/updateUserStatus/:id` | required (admin) | Activate / deactivate or change a role |

### POST `/api/auth/register`

```json
{
  "name": "Finance Admin",
  "email": "admin@company.com",
  "password": "StrongPass123",
  "role": "admin"
}
```

`password` min 8 chars. `role` is `admin` | `finance_user` (default `finance_user`).

**201**

```json
{
  "success": true,
  "message": "Account created successfully",
  "token": "eyJhbGciOi…",
  "data": { "_id": "…", "name": "Finance Admin", "email": "admin@company.com", "role": "admin", "isActive": true, "createdAt": "…" },
  "statusCode": 201
}
```

> The token is on the **top level**, not inside `data`.

### POST `/api/auth/login`

```json
{ "email": "admin@company.com", "password": "StrongPass123" }
```

**200** — same shape as register. `401` on wrong credentials, `403` if the account is deactivated.

### POST `/api/auth/changePassword`

```json
{ "currentPassword": "StrongPass123", "newPassword": "EvenStronger456" }
```

**200.** All existing tokens are invalidated — redirect to login afterwards.

### GET `/api/auth/getAllUsers`

Admin only. Query: `page`, `limit`, `role` (`admin`|`finance_user`), `isActive`, `search` (name or email). Paginated envelope; `passwordHash` is never returned.

### PUT `/api/auth/updateUserStatus/:id`

Admin only. Body takes `isActive`, `role`, or both — at least one is required.

```json
{ "isActive": false }
```

Two rules worth knowing:

- **You cannot change your own status or role** (422). Locking yourself out of the only admin account is not recoverable from inside the app.
- A successful change stamps `signOutAt`, so the affected user's existing tokens stop working **immediately** rather than at expiry. A deactivated user's next request returns 401.

### Roles

All authenticated users have full read/write access to companies, clients, services and documents. The `admin` role is required for:

- the five `delete*` endpoints,
- the two user-management endpoints above,
- **every endpoint under `/api/report`** (§7) — reporting aggregates the entire workspace.

Non-admins calling a report endpoint get `403` with `"This report is available to admin users only"`.

**Creating the first admin:** run `node scripts/seedAdminScript.js "Name" admin@example.com StrongPass123`. After that, an admin adds team members through `POST /api/auth/createUser`, which is the only route that can grant a role. Public `POST /api/auth/register` should be closed in production with `RESTRICT_REGISTRATION=true`.

---

## 3. Company — `/api/company`

Your own seller profiles. Multiple companies are supported; a document always names one.

| Method | Path | Notes |
|---|---|---|
| GET | `/api/company/getAllCompanies` | paginated |
| GET | `/api/company/getCompanyDetail/:id` | |
| POST | `/api/company/createCompany` | |
| PUT | `/api/company/updateCompany/:id` | partial update |
| DELETE | `/api/company/deleteCompany/:id` | **admin only**, soft-deletes when referenced |
| POST | `/api/company/uploadCompanyLogo/:id` | multipart |
| POST | `/api/company/uploadCompanySignature/:id` | multipart |

### GET `/api/company/getAllCompanies`

Query: `page` (default 1), `limit` (default 20), `isActive` (`true`/`false`), `search` (name, case-insensitive).

### POST `/api/company/createCompany`

```json
{
  "name": "Magnuscopo LLP",
  "gstin": "29ACGFM6419B1Z9",
  "pan": "ACGFM6419B",
  "stateCode": "29",
  "address": "No 12, MG Road\nBengaluru 560001",
  "email": "accounts@magnuscopo.com",
  "phone": "+91 90000 00000",
  "website": "https://magnuscopo.com",
  "bankDetails": {
    "accountName": "Magnuscopo LLP",
    "accountNumber": "1234567890",
    "ifsc": "HDFC0001234",
    "bankName": "HDFC Bank",
    "branch": "MG Road",
    "bankGstin": "29ACGFM6419B1Z9"
  },
  "defaultTerms": {
    "quotation": "1. 50% advance payable on confirmation.\n2. Quotation validity: 1 week.",
    "proforma":  "1. Payable by the due date.\n2. No refunds after delivery.",
    "invoice":   "1. Payable by the due date.\n2. Confidentiality applies."
  }
}
```

**Required:** `name`, `gstin`, `pan`, `stateCode`, `address`, `bankDetails` (with `accountName`, `accountNumber`, `ifsc`).

**Format rules** (all return 422):

| Field | Rule | Example |
|---|---|---|
| `gstin`, `bankGstin` | 15-char GSTIN | `29ACGFM6419B1Z9` |
| `pan` | 10-char PAN | `ACGFM6419B` |
| `ifsc` | 11-char IFSC | `HDFC0001234` |
| `stateCode` | exactly 2 digits | `29` |

`defaultTerms` is a **three-slot object**. Each slot seeds `notesTerms` on a new document of that type, and drives the terms swap on conversion (§6). Populate all three.

**201** returns the company. `logoUrl` / `signatureUrl` come back as **absolute URLs** (empty string when unset).

### PUT `/api/company/updateCompany/:id`

Send only the fields you are changing; at least one is required. `bankDetails` and `defaultTerms` are replaced wholesale when present, so send the complete sub-object.

### DELETE `/api/company/deleteCompany/:id`

Admin only. If any document references the company it is **deactivated instead of deleted**, so historical documents keep rendering:

```json
{ "success": true, "message": "Company is used by 7 document(s), so it was deactivated instead of deleted",
  "data": { "_id": "…", "isActive": false, "softDeleted": true }, "statusCode": 200 }
```

Check `data.softDeleted` to decide whether to remove the row or grey it out.

### POST `/api/company/uploadCompanyLogo/:id` and `/uploadCompanySignature/:id`

`multipart/form-data`, field name **`file`**. PNG / JPG / WEBP only, max **2 MB**, one file per request.

```js
const form = new FormData();
form.append("file", fileInput.files[0]);
await axios.post(`/api/company/uploadCompanyLogo/${id}`, form, {
  headers: { Authorization: `Bearer ${token}` },
});
```

**200**

```json
{ "success": true, "message": "Logo uploaded successfully",
  "data": { "_id": "…", "logoUrl": "http://localhost:5000/uploads/logos/1712…-logo.png", "path": "/uploads/logos/1712…-logo.png" },
  "statusCode": 200 }
```

The signature response uses the key `signatureUrl`. The previous file is deleted automatically. Errors: 422 for wrong type, oversize, or missing file.

Uploaded assets are publicly served from `/uploads/**` — no token needed to render them in an `<img>`.

---

## 4. Client — `/api/client`

| Method | Path | Notes |
|---|---|---|
| GET | `/api/client/getAllClients` | paginated |
| GET | `/api/client/getClientDetail/:id` | also returns `documentCount` |
| POST | `/api/client/createClient` | |
| PUT | `/api/client/updateClient/:id` | |
| DELETE | `/api/client/deleteClient/:id` | **admin only**, soft-deletes when referenced |

Query on list: `page`, `limit`, `isActive`, `search` (matches name, contact person, email).

### POST `/api/client/createClient`

```json
{
  "name": "Atya Ebiz Solutions LLP",
  "address": "Plot 44, Hitech City\nHyderabad 500081",
  "gstin": "36AAECA1234F1Z5",
  "stateCode": "36",
  "contactPerson": "Ravi K",
  "email": "ravi@atya.com",
  "phone": "+91 90000 11111"
}
```

**Required:** `name`, `address`. `gstin` is optional on the record, **but a proforma or tax invoice cannot be created for a client without one** (422). A quotation works either way and never prints the buyer GSTIN.

---

## 5. Service catalog — `/api/service`

| Method | Path | Notes |
|---|---|---|
| GET | `/api/service/getAllServices` | paginated, `limit` default 50 |
| GET | `/api/service/getServiceDetail/:id` | |
| POST | `/api/service/createService` | |
| PUT | `/api/service/updateService/:id` | |
| DELETE | `/api/service/deleteService/:id` | **admin only**, soft-deletes when referenced |

```json
{
  "name": "1–2 Professionally Edited Videos",
  "description": "Editing package",
  "defaultUnitPrice": 10000,
  "unit": "package"
}
```

Only `name` is required. These are catalog defaults for the item builder — the user can override description, price and unit per document line.

---

## 6. Documents — `/api/document`

The core resource. One model covers all three types, distinguished by `docType`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/document/getNextNumber` | Preview the next number (no commit) |
| GET | `/api/document/getAllDocuments` | History, filterable + paginated |
| GET | `/api/document/getDocumentDetail/:id` | Full document |
| GET | `/api/document/getDocumentChain/:id` | Quotation → Proforma → Invoice chain |
| GET | `/api/document/previewDocumentHtml/:id` | Rendered HTML for the preview modal |
| GET | `/api/document/downloadDocument/:id` | Streams the stored PDF |
| POST | `/api/document/createDocument` | Creates, commits the serial, computes totals |
| POST | `/api/document/convertDocument/:id` | Clone to the next stage |
| POST | `/api/document/generateDocumentPdf/:id` | Render + store the PDF |
| PUT | `/api/document/updateDocument/:id` | Edit, recalc, bump version |
| PUT | `/api/document/updateDocumentStatus/:id` | Status only |
| DELETE | `/api/document/deleteDocument/:id` | **admin only**, cancels when not a draft |

### 6.1 GET `/api/document/getNextNumber`

Query: `type` (required, `quotation`|`proforma`|`invoice`), `companyId` (required), `date` (optional ISO date, defaults to today — the FY is derived from it).

```
GET /api/document/getNextNumber?type=invoice&companyId=66…&date=2026-05-10
```

```json
{ "success": true, "message": "Next document number generated",
  "data": { "docType": "invoice", "yearKey": "26-27", "serialNumber": 3, "docNumber": "MCI/26-27/003", "committed": false, "docLabel": "Tax Invoice" },
  "statusCode": 200 }
```

**`committed: false` is the whole point** — this is a read-only peek, so abandoned drafts never burn a serial. Call it as often as you like (e.g. when the user changes type or issue date); it is idempotent. The number is only reserved at `createDocument`, and the value you get back there may differ if someone else saved first. Display it as a preview, not a promise.

### 6.2 POST `/api/document/createDocument`

```json
{
  "docType": "quotation",
  "company": "66a1…",
  "client": "66a2…",
  "issueDate": "2026-05-10",
  "dueDate": "2026-05-17",
  "introLine": "With reference to your enquiry, we are pleased to submit our quotation as below.",
  "gstApplicable": false,
  "notesTerms": "1. 50% advance payable on confirmation.",
  "status": "draft",
  "items": [
    { "serviceRef": "66a3…", "description": "1–2 Professionally Edited Videos", "unit": "package", "qty": 1, "unitPrice": 12000, "discountPercent": 0 },
    { "description": "Photography coverage", "unit": "day", "qty": 2, "unitPrice": 1080, "discountPercent": 10 }
  ]
}
```

**Required:** `docType`, `company`, `client`, `issueDate`, `items` (min 1).

**Defaults applied server-side when omitted:**

| Field | Default |
|---|---|
| `gstApplicable` | `false` for `quotation`, `true` for `proforma`/`invoice` |
| `notesTerms` | `company.defaultTerms[docType]` |
| `status` | `"draft"` |
| `introLine` | `""`, and **forced to `""` for non-quotations** |
| item `discountPercent` | `0` |
| item `unit` | `"unit"` |

**Rejections (422):** empty `items`; `dueDate` earlier than `issueDate`; `discountPercent` outside 0–100; negative `qty`/`unitPrice`; any `gstPercent` key; a proforma/invoice whose client has no GSTIN. **404** for an unknown `company` or `client`.

**201** returns the full document with `company` and `client` populated as objects (see 6.4 for the shape).

### 6.3 GET `/api/document/getAllDocuments`

Query — all optional, all validated (an unknown enum value returns 422):

| Param | Notes |
|---|---|
| `page` | default 1 |
| `limit` | default 20, max 100 |
| `client` | client id |
| `company` | company id |
| `docType` | `quotation` \| `proforma` \| `invoice` |
| `status` | `draft` \| `generated` \| `sent` \| `paid` \| `cancelled` |
| `fromDate` / `toDate` | filter on `issueDate`, inclusive |
| `search` | matches `docNumber`, case-insensitive |

Sorted newest first. Each row is the compact shape — `items`, `notesTerms` and `amountInWords` are **omitted**; fetch the detail endpoint for those. `company` and `client` are populated with `{ _id, name, gstin }`.

```json
{
  "success": true, "total": 42, "page": 1, "limit": 20,
  "data": [{
    "_id": "66b…", "docType": "invoice", "docLabel": "Tax Invoice", "docNumber": "MCI/26-27/003",
    "financialYearOrYear": "26-27", "serialNumber": 3,
    "company": { "_id": "66a1…", "name": "Magnuscopo LLP", "gstin": "29ACGFM6419B1Z9" },
    "client":  { "_id": "66a2…", "name": "Atya Ebiz Solutions LLP", "gstin": "36AAECA1234F1Z5" },
    "issueDate": "2026-05-10T00:00:00.000Z", "dueDate": "2026-05-17T00:00:00.000Z",
    "subTotal": 14160, "gstApplicable": true, "gstPercent": 18, "gstAmount": 2548.8, "totalAmount": 16708.8,
    "status": "paid", "version": 1,
    "pdfUrl": "http://localhost:5000/uploads/documents/MCI-26-27-003-invoice-v1.pdf",
    "hasPdf": true, "convertedFrom": "66b0…", "convertedToCount": 0,
    "createdAt": "…", "updatedAt": "…"
  }],
  "statusCode": 200
}
```

### 6.4 GET `/api/document/getDocumentDetail/:id`

Everything above, plus:

```json
{
  "introLine": "With reference to your enquiry…",
  "items": [
    { "serviceRef": "66a3…", "description": "…", "unit": "package", "qty": 1, "unitPrice": 12000, "discountPercent": 0, "amount": 12000 }
  ],
  "amountInWords": "Sixteen Thousand Seven Hundred Eight Rupees Eighty Paise Only",
  "notesTerms": "1. Payable by the due date.",
  "dueDateLabel": "Due Date",
  "showBuyerGstin": true,
  "pdfGeneratedAt": "2026-05-10T09:12:00.000Z",
  "convertedTo": ["66b2…"],
  "gstPercentConstant": 18
}
```

`company` and `client` are populated in full here (address, PAN, bank details, `defaultTerms`, …), which is what the preview needs.

Two fields exist so the UI does not re-derive type rules:

- **`dueDateLabel`** — `"Valid Until"` for a quotation, `"Due Date"` otherwise. Use it as the field label.
- **`showBuyerGstin`** — `false` for a quotation. Hide the buyer GSTIN row when false, even though `client.gstin` may hold a value.

### 6.5 PUT `/api/document/updateDocument/:id`

Partial update; at least one field required. Accepts `company`, `client`, `issueDate`, `dueDate`, `introLine`, `items`, `gstApplicable`, `notesTerms`, `status`.

`docType`, `docNumber`, `serialNumber` and `financialYearOrYear` are **immutable** — a saved document never changes its identity or series.

Side effects on every successful update:

- Totals are recomputed whenever `items` or `gstApplicable` changes.
- `version` is incremented.
- **`pdfUrl` is cleared and `hasPdf` becomes `false`** — the stored PDF no longer matches the data, so regenerate it before offering a download.

**422** if the document status is `paid` or `cancelled` (`"A paid document can no longer be edited"`), or if `dueDate` < `issueDate`. `introLine` is ignored on non-quotations.

**Price lock.** A quotation is the negotiation document, so its `items` stay editable for as long as the document is editable at all — re-pricing it in place is how a negotiation round is recorded, and each save bumps `version`. A proforma or tax invoice freezes its money once it reaches status `sent`/`paid` or approval status `approved`. From that point `items` and `gstApplicable` are rejected with 422, while `issueDate`, `dueDate`, `notesTerms` remain editable. The `priceLocked` boolean on every document response tells the UI which state it is in, so the form can disable the amounts rather than surface a 422.

### 6.6 POST `/api/document/convertDocument/:id`

Body:

```json
{ "toType": "invoice", "issueDate": "2026-05-20", "dueDate": "2026-06-05", "termsStrategy": "auto" }
```

`toType` (`proforma` | `invoice`) is required. `issueDate` / `dueDate` default to the source values.

**Numbering — the rule that matters:**

**Stage order — the chain advances one step at a time.** A quotation can only become a proforma; a proforma can only become a tax invoice. Quotation → invoice is rejected, because the proforma is the step that turns the negotiated figure into the fixed price the client pays against.

| Conversion | Number |
|---|---|
| Proforma → Invoice | **Reuses the exact same `MCI/…` number.** No serial is consumed. |
| Quotation → Proforma | Mints a **new** `MCI/…` number, because the quotation lives in the separate `MCQ` series. |

The response carries `data.conversion.reusedDocNumber` so the UI can say either "same number as the proforma" or show the newly minted one.

**What is cloned byte-identical:** company, client, all items, `subTotal`, and (unless overridden) `issueDate`.

**What changes:** `docType`, `docLabel`, `gstApplicable` (`true` for both targets, so totals are recomputed with GST when converting from a quotation), `introLine` (cleared — it belongs to quotations only), `status` (`"draft"`), `version` (`1`), `convertedFrom`.

**Terms handling (`termsStrategy`):**

| Value | Behaviour |
|---|---|
| `auto` (default) | Swap to `company.defaultTerms[toType]` **only if** the source terms were still the untouched default for their own type. If the user had customized them, they carry over unchanged. |
| `swap` | Always replace with the target type's standard terms. |
| `keep` | Always carry the source text over. |

The response includes `data.conversion.termsWereCustom`. **When it is `true`, show the user the choice** — "Keep your custom terms" vs "Replace with standard [Proforma] terms" — and re-issue with `termsStrategy: "keep"` or `"swap"` rather than silently picking one. (`auto` already keeps custom text, so this is a confirmation, not a rescue.)

**Rejections (422):** converting to the same type; converting to anything other than the next stage, including quotation → invoice (`"A quotation can only become a proforma invoice…"`); converting a tax invoice (terminal stage); converting a cancelled document; converting the same source to the same target twice (`"This document was already converted to a proforma (MCI/26-27/001)"`); the client has no GSTIN.

**201** returns the new document, plus:

```json
"conversion": { "reusedDocNumber": true, "termsWereCustom": false, "termsStrategyApplied": "auto" }
```

**Payment confirmation.** There is no separate payment endpoint. A tax invoice is only ever raised once the client has settled, so **approving a tax invoice is the act that confirms payment**: the invoice is set to `status: "paid"` with `paidAt` and `paymentConfirmedBy` stamped, and the proforma it was converted from is marked `paid` at the same moment — it is the same money, billed once. Approving a quotation or a proforma has no effect on status. Because of this, an admin should only approve a tax invoice once the payment has actually landed.

### 6.7 GET `/api/document/previewDocumentHtml/:id`

Returns **`text/html`**, not JSON. This is the exact Handlebars output the PDF is printed from, so the preview and the downloaded file cannot drift apart.

Because it needs the auth header, fetch it as text and inject it rather than pointing an `<iframe src>` at it:

```js
const { data: html } = await axios.get(`/api/document/previewDocumentHtml/${id}`, {
  headers: { Authorization: `Bearer ${token}` },
  responseType: "text",
});
iframeRef.current.srcdoc = html;
```

The page is A4-width and self-contained; images load from the public `/uploads` URLs.

### 6.8 POST `/api/document/generateDocumentPdf/:id`

No body. Renders with headless Chrome and stores the file. Takes ~1–3 s — show a spinner.

```json
{ "success": true, "message": "PDF generated successfully",
  "data": {
    "_id": "66b…", "docNumber": "MCI/26-27/003",
    "fileName": "MCI-26-27-003-invoice-v1.pdf",
    "pdfPath": "/uploads/documents/MCI-26-27-003-invoice-v1.pdf",
    "pdfUrl": "http://localhost:5000/uploads/documents/MCI-26-27-003-invoice-v1.pdf",
    "downloadUrl": "/api/document/downloadDocument/66b…",
    "size": 51201, "status": "generated" },
  "statusCode": 200 }
```

Slashes in the document number are sanitized to hyphens in the filename. A document whose status was `draft` moves to `generated`. Re-running replaces the previous file. **422** if the document has no items.

### 6.9 GET `/api/document/downloadDocument/:id`

Streams the stored PDF as an attachment (`application/pdf`). Requires the auth header, so trigger it as a blob:

```js
const res = await axios.get(`/api/document/downloadDocument/${id}`, {
  headers: { Authorization: `Bearer ${token}` },
  responseType: "blob",
});
const url = URL.createObjectURL(res.data);
const a = Object.assign(document.createElement("a"), { href: url, download: `${docNumber.replace(/\//g, "-")}.pdf` });
a.click();
URL.revokeObjectURL(url);
```

**404** with `"No PDF has been generated for this document yet"` — call `generateDocumentPdf` first. Alternatively use the unauthenticated `pdfUrl` for a direct link.

### 6.10 GET `/api/document/getDocumentChain/:id`

Works from any member of the chain — it walks to the root and collects every descendant.

```json
{ "success": true, "data": { "rootId": "66b0…", "chain": [
    { "docType": "quotation", "docNumber": "MCQ/2026-008", "status": "generated", "totalAmount": 14160, "…": "…" },
    { "docType": "proforma",  "docNumber": "MCI/26-27/003", "status": "draft",     "totalAmount": 16708.8, "…": "…" },
    { "docType": "invoice",   "docNumber": "MCI/26-27/003", "status": "paid",      "totalAmount": 16708.8, "…": "…" }
  ] }, "statusCode": 200 }
```

Entries use the compact list shape and are ordered root-first. Note the proforma and invoice sharing one number — that is correct, not a bug.

### 6.11 PUT `/api/document/updateDocumentStatus/:id`

```json
{ "status": "sent" }
```

One of `draft`, `generated`, `sent`, `cancelled`. Any transition between those is permitted, but `cancelled` locks the document against further edits (6.5).

**`paid` cannot be set through this endpoint, or through `items`-style updates in 6.5.** A document reaches `paid` only by approving its tax invoice, which settles the invoice and its proforma together; allowing it to be written directly would let the two disagree. Sending `{ "status": "paid" }` on a document that is not already paid returns **422**. The UI should omit `paid` from the status picker for this reason.

**200** → `{ "data": { "_id": "…", "status": "sent" } }`

### 6.12 DELETE `/api/document/deleteDocument/:id`

Admin only. A document is hard-deleted **only** when it is still a `draft` with no conversions. Otherwise it is set to `cancelled` so the numbering series and audit trail stay intact:

```json
{ "success": true, "message": "Document is no longer a draft, so it was cancelled instead of deleted",
  "data": { "_id": "…", "status": "cancelled", "softDeleted": true }, "statusCode": 200 }
```

Branch on `data.softDeleted`.

---

## 7. Reports — `/api/report`

**Every endpoint in this section is admin only** (`403` otherwise). These power the admin dashboard.

### 7.1 Revenue recognition rules

Every figure below obeys the same four rules. Read them once and the numbers stop being ambiguous:

| Rule | Meaning |
|---|---|
| **Revenue = tax invoices only** | A quotation is an estimate and a proforma is a pre-payment request. Neither is ever counted as revenue — both are reported separately as **pipeline**. A proforma that has been paid is excluded from pipeline, because that money is already counted as revenue on its tax invoice. |
| **Cancelled is always excluded** | From every monetary figure, in every report. |
| **Collected** | Invoices whose status is `paid` — which, under the current flow, means the invoice was approved. |
| **Receivables = issued, unpaid proformas** | See below. **Not** unpaid tax invoices. |
| **GST liability** | `gstAmount` summed over non-cancelled invoices. |

Because a proforma and its tax invoice share a number but are two records, summing across all document types would double-count. That is exactly why revenue is invoice-only.

**Why receivables sit on the proforma.** The client pays against the proforma; the tax invoice is raised afterwards and approving it is what confirms the payment, which marks it `paid` immediately. An unpaid tax invoice is therefore only a few minutes of transient state — the money genuinely owed is a proforma that went out and has not come back. A proforma counts as a receivable when it is **issued** (`status: "sent"`, or `approvalStatus: "approved"`) and is not yet `paid` or `cancelled`. A draft still being prepared internally is not money owed by anyone. This is the same line the price lock draws, so "the price is final" and "the client owes it" describe the same set of documents.

### 7.2 Shared scope parameters

All reports accept the same optional scope, applied to `issueDate`:

| Param | Notes |
|---|---|
| `companyId` | restrict to one seller entity |
| `clientId` | restrict to one buyer |
| `fromDate` / `toDate` | inclusive, matched on `issueDate` |

`getRevenueTrend` and `getGstSummary` also take `months` (3–36, default 12) and apply a rolling window that **overrides** `fromDate`. `getTopClients` takes `limit` (1–50, default 10).

### 7.3 Endpoint reference

| Method | Path | Returns |
|---|---|---|
| GET | `/api/report/getFinancialSummary` | Headline KPIs, ratios and pipeline |
| GET | `/api/report/getRevenueTrend` | Monthly invoiced / collected / GST series |
| GET | `/api/report/getDocumentBreakdown` | Value and counts by type and by status |
| GET | `/api/report/getTopClients` | Ranked client revenue |
| GET | `/api/report/getGstSummary` | Monthly + per-FY GST liability |
| GET | `/api/report/getReceivablesAgeing` | Overdue proforma buckets + collections worklist |
| GET | `/api/report/getConversionFunnel` | Quotation → proforma → invoice → paid |
| GET | `/api/report/getCompanyPerformance` | Revenue per seller entity |
| GET | `/api/report/getWorkspaceOverview` | Master-data health counts |
| GET | `/api/report/getAuditTrail` | Paginated audit log |
| GET | `/api/report/getDocumentLedger` | Document-wise financial record |

### 7.4 GET `/api/report/getFinancialSummary`

```json
{ "success": true, "data": {
  "scope": { "companyId": null, "clientId": null, "fromDate": null, "toDate": null },
  "gstPercent": 18,
  "documentCount": 146,
  "invoiced":    { "count": 46, "subTotal": 2650000, "gstAmount": 477000, "totalAmount": 3127000 },
  "collected":   { "count": 31, "subTotal": 1600000, "gstAmount": 288000, "totalAmount": 1888000 },
  "outstanding": { "count": 15, "totalAmount": 1239000, "basis": "proforma" },
  "overdue":     { "count": 6,  "totalAmount": 486000 },
  "pipeline": {
    "quotation": { "count": 62, "subTotal": 4100000, "gstAmount": 0, "totalAmount": 4100000 },
    "proforma":  { "count": 38, "subTotal": 2457627, "gstAmount": 442373, "totalAmount": 2900000 }
  },
  "gst": { "taxableValue": 2650000, "gstAmount": 477000, "totalWithGst": 3127000 },
  "ratios": { "collectionRate": 60.4, "quotationConversionRate": 61.3, "averageInvoiceValue": 67978 },
  "counts": { "quotationsConverted": 38, "quotationsTotal": 62, "drafts": 9, "cancelled": 4 }
}, "statusCode": 200 }
```

`outstanding` and `overdue` are both measured on **issued, unpaid proformas** (7.1), not on tax invoices — `outstanding.basis` states this explicitly. `overdue` counts those whose `dueDate` is strictly before the start of today, so a proforma due *today* is not yet overdue; this matches the day-granularity used by `getReceivablesAgeing`, so the KPI tile and the ageing table always agree. **A document with no `dueDate` is never treated as overdue.**

`collectionRate` is `collected / (collected + outstanding)` — the share of everything that reached the "client owes it" stage which has since been settled. It is deliberately **not** `collected / invoiced`: because a tax invoice is only raised once payment is confirmed, that ratio would always read ~100%.

### 7.5 GET `/api/report/getRevenueTrend`

Returns one entry per month for the whole window — **months with no activity are returned as zeros rather than omitted**, so a chart's time axis stays continuous and does not silently compress empty periods.

```json
{ "data": { "months": 12, "series": [
  { "month": "2026-05", "label": "May 26", "invoiced": 289000, "collected": 210000,
    "outstanding": 79000, "gstAmount": 44085, "quotationValue": 360000,
    "proformaValue": 120000, "invoiceCount": 5 }
] } }
```

### 7.6 GET `/api/report/getReceivablesAgeing`

Buckets **issued, unpaid proformas** (7.1) by days past due: `notDue`, `0-30`, `31-60`, `61-90`, `90+`. `basis` names the document type being aged, so the UI can label itself without hardcoding the assumption.

```json
{ "data": {
  "totalOutstanding": 1239000,
  "basis": "proforma",
  "buckets": [ { "bucket": "90+", "label": "90+ days", "count": 1, "totalAmount": 80000 } ],
  "documents": [ { "_id": "66b…", "docNumber": "MCI/26-27/010", "docType": "proforma",
    "clientName": "Atya Ebiz Solutions LLP", "issueDate": "…", "dueDate": "…",
    "totalAmount": 80000, "status": "sent", "approvalStatus": "approved",
    "daysOverdue": 116, "bucket": "90+" } ]
} }
```

`documents` is the collections worklist — **capped at the 50 most overdue**, sorted worst first. `buckets` and `totalOutstanding` are computed over **every** matching document, so the totals are complete even though the list is truncated.

> **Breaking change:** this array was previously named `invoices` and contained tax invoices. It is now `documents` and contains proformas.

### 7.7 GET `/api/report/getConversionFunnel`

```json
{ "data": {
  "stages": [
    { "stage": "quotation", "label": "Quotations", "count": 62, "totalAmount": 4100000, "conversionRate": 100 },
    { "stage": "paid", "label": "Paid", "count": 31, "totalAmount": 1888000, "conversionRate": 50 }
  ],
  "quotationsConverted": 38, "quotationConversionRate": 61.3
} }
```

`conversionRate` on each stage is measured against the **first** stage, so the funnel reads top-down. Every tax invoice now comes from a proforma, so the stages only ever narrow — historical data created before the stage order was enforced may still show an invoice with no proforma above it.

### 7.8 GET `/api/report/getGstSummary`

Monthly series plus `byFinancialYear` (1 April → 31 March, the way GST is actually filed) and `totals`. Covers non-cancelled invoices with `gstApplicable: true`.

### 7.9 GET `/api/report/getDocumentLedger`

The document-wise financial record. Query adds `page`, `limit` (max 200, default 50), `docType`, `status`, `search` (document number).

Alongside the page of rows it returns **`totals` computed over the entire filtered set, not just the current page** — so the ledger footer is a real total.

```json
{ "success": true, "total": 146, "page": 1, "limit": 50,
  "totals": { "subTotal": 2650000, "gstAmount": 477000, "totalAmount": 3127000 },
  "data": [ { "_id": "…", "docNumber": "MCI/26-27/003", "docType": "invoice",
    "subTotal": 14160, "gstApplicable": true, "gstPercent": 18, "gstAmount": 2548.8,
    "totalAmount": 16708.8, "status": "paid", "hasPdf": true } ] }
```

### 7.10 GET `/api/report/getAuditTrail`

Query: `page`, `limit` (max 100), `action`, `entityType` (`document`|`company`|`client`|`service`|`user`), `performedBy`, `fromDate`, `toDate`. Newest first, with `performedBy` and the linked document populated.

---

## 8. Type / field rule matrix

Everything the UI needs to branch on:

| Rule | Quotation | Proforma | Tax Invoice |
|---|---|---|---|
| `docLabel` | `Quotation` | `Proforma Invoice` | `Tax Invoice` |
| Number series | `MCQ/2026-008` | `MCI/26-27/003` | same as its proforma |
| `gstApplicable` default | `false` | `true` | `true` |
| GST rows on the document | hidden, flat total | Subtotal / GST @ 18% / Payable | same |
| Buyer GSTIN | hidden | shown | shown |
| Client GSTIN required to create | no | **yes** | **yes** |
| `introLine` | shown | forced empty | forced empty |
| `dueDate` label | `Valid Until` | `Due Date` | `Due Date` |
| Terms seeded from | `defaultTerms.quotation` | `defaultTerms.proforma` | `defaultTerms.invoice` |
| Can convert to | proforma | invoice | — (terminal) |
| Prices negotiable | yes, always | until `sent`/`approved` | until `sent`/`approved` |
| Approval confirms payment | no | no | **yes** — marks it and its proforma `paid` |

---

## 9. Suggested wizard call sequence

1. `GET /api/company/getAllCompanies`, `GET /api/client/getAllClients`, `GET /api/service/getAllServices` — populate the dropdowns.
2. **Step A/B** — on type or company change: `GET /api/document/getNextNumber?type=&companyId=&date=` → show the preview number.
3. **Step C–G** — build the form locally. Pre-fill `notesTerms` from the selected company's `defaultTerms[docType]`, and item rows from the chosen service's `defaultUnitPrice` / `unit`. Compute totals client-side for live feedback.
4. **Step H preview** — save first with `POST /api/document/createDocument` (this commits the real number), then `GET /api/document/previewDocumentHtml/:id` into the modal.
5. **Generate** — `POST /api/document/generateDocumentPdf/:id`, then `GET /api/document/downloadDocument/:id`.
6. **Post-generation prompt** — offer the next stage via `POST /api/document/convertDocument/:id`. If the response's `conversion.termsWereCustom` is `true`, surface the keep/replace choice and re-issue with an explicit `termsStrategy`.
7. **History** — `GET /api/document/getAllDocuments` with filters; row click → `getDocumentDetail`; chain link → `getDocumentChain`.

> Because the preview needs a saved record, the natural flow is create-then-preview. If you want preview-before-save, render the totals locally — the numbers will match, since the server uses the formulas in §1.

---

## 10. Health check

`GET /health` (no auth) → `{ "success": true, "message": "Invoicing API is running", "data": { "uptime": 12.3 }, "statusCode": 200 }`

---

## 11. Endpoint index

```
GET    /health

POST   /api/auth/register
POST   /api/auth/createUser              (auth, admin)
POST   /api/auth/login
GET    /api/auth/getProfile
POST   /api/auth/changePassword
POST   /api/auth/logout
GET    /api/auth/getAllUsers                     (admin)
PUT    /api/auth/updateUserStatus/:id            (admin)

GET    /api/company/getAllCompanies
GET    /api/company/getCompanyDetail/:id
POST   /api/company/createCompany
PUT    /api/company/updateCompany/:id
DELETE /api/company/deleteCompany/:id            (admin)
POST   /api/company/uploadCompanyLogo/:id        (multipart, field "file")
POST   /api/company/uploadCompanySignature/:id   (multipart, field "file")

GET    /api/client/getAllClients
GET    /api/client/getClientDetail/:id
POST   /api/client/createClient
PUT    /api/client/updateClient/:id
DELETE /api/client/deleteClient/:id              (admin)

GET    /api/service/getAllServices
GET    /api/service/getServiceDetail/:id
POST   /api/service/createService
PUT    /api/service/updateService/:id
DELETE /api/service/deleteService/:id            (admin)

GET    /api/document/getNextNumber?type=&companyId=&date=
GET    /api/document/getAllDocuments
GET    /api/document/getDocumentDetail/:id
GET    /api/document/getDocumentChain/:id
GET    /api/document/previewDocumentHtml/:id     (returns text/html)
GET    /api/document/downloadDocument/:id        (returns application/pdf)
POST   /api/document/createDocument
POST   /api/document/convertDocument/:id
POST   /api/document/generateDocumentPdf/:id
PUT    /api/document/updateDocument/:id
PUT    /api/document/updateDocumentStatus/:id
DELETE /api/document/deleteDocument/:id          (admin)

GET    /api/report/getFinancialSummary           (admin)
GET    /api/report/getRevenueTrend               (admin)
GET    /api/report/getDocumentBreakdown          (admin)
GET    /api/report/getTopClients                 (admin)
GET    /api/report/getGstSummary                 (admin)
GET    /api/report/getReceivablesAgeing          (admin)
GET    /api/report/getConversionFunnel           (admin)
GET    /api/report/getCompanyPerformance         (admin)
GET    /api/report/getWorkspaceOverview          (admin)
GET    /api/report/getAuditTrail                 (admin)
GET    /api/report/getDocumentLedger             (admin)

GET    /uploads/**                               (public static: logos, signatures, PDFs)
```
