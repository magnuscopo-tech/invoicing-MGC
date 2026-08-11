# Invoicing Tool — Backend

Node.js / Express / MongoDB API for generating Quotations, Proforma Invoices and Tax Invoices with PDF output.

API reference for frontend integration: **[API_DOCUMENTATION.md](API_DOCUMENTATION.md)**

## Setup

```bash
npm install
cp .env.example .env      # then fill in MONGO_URI and JWT_KEY
npm run dev               # or: npm start
```

Create the first admin account:

```bash
node scripts/seedAdminScript.js "Finance Admin" admin@company.com StrongPass123
```

`npm install` downloads a Chrome build for Puppeteer. On a server without one, install Chrome and point `PUPPETEER_EXECUTABLE_PATH` at it.

## Environment

| Variable | Purpose |
|---|---|
| `PORT` | HTTP port (default 5000) |
| `MONGO_URI` | MongoDB connection string |
| `JWT_KEY` | Token signing secret |
| `JWT_EXPIRES_IN` | Token lifetime (default `7d`) |
| `APP_BASE_URL` | Public URL of this API — builds absolute logo/signature/PDF URLs |
| `CORS_ORIGINS` | Comma-separated allowlist; empty allows all |
| `RESTRICT_REGISTRATION` | `true` closes public `/register`; admins add users via `/createUser` |
| `PUPPETEER_EXECUTABLE_PATH` | Optional system Chrome path |

## Structure

Follows `BACKEND_ARCHITECTURE_BLUEPRINT.md`: route → controller → service → model, with services owning business logic and sending the response.

```
app.js                  bootstrap: env, db, middleware, routers, error handler
config/                 db.js, constants.js (GST rate, doc labels, prefixes, regexes)
router/                 <feature>Routes.js — paths, JWT, upload middleware
controllers/            <feature>Controller.js — Joi validation, one service call
services/               <feature>Service.js — business logic + response
                        numberingService, calculationService, pdfService, wordsService,
                        auditLogService — domain helpers that return data
models/                 <feature>Model.js — Mongoose schemas and indexes
validators/             <feature>Validators.js — Joi schemas
responses/              documentResponse.js — list/detail mappers
uploads/                uploadImage.js — multer config, type and size filters
templates/              quotation.hbs, invoice.hbs, partials/
utils/                  dateHelper, moneyHelper, fileHelper
scripts/                seedAdminScript.js
public/uploads/         logos/, signatures/, documents/ — served at /uploads
```

## Domain rules

- **Numbering** — `MCQ/{year}-{serial}` for quotations (resets 1 Jan), `MCI/{FY}/{serial}` for proforma and invoices (resets 1 Apr). Counters are per company + year and incremented atomically. `getNextNumber` only peeks, so abandoned drafts never consume a serial.
- **Proforma → Invoice reuses the same number.** Quotation → Proforma mints a new one, since quotations use a separate series.
- **GST is a fixed 18% server constant.** `gstPercent` in a request body is rejected.
- **Totals are always recomputed server-side.** Client-sent amounts are discarded.
- **Terms are per document type.** `Company.defaultTerms` has `quotation` / `proforma` / `invoice` slots; conversion swaps them unless the user had customized the text.
- **Preview and PDF share one Handlebars render**, so they cannot drift apart.
- **Referenced records are never hard-deleted** — companies, clients and services deactivate; non-draft documents cancel.

## Verified behaviour

End-to-end tested against a live MongoDB: auth and token invalidation, all CRUD, validation rules (GSTIN/PAN/IFSC/discount/date ordering), numbering and FY rollover, the full conversion chain with terms handling, PDF generation and download, uploads with type/size rejection, and 23 concurrent creates producing 23 unique serials with no gaps.
