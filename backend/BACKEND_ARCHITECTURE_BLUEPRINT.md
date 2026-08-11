# Backend Architecture Blueprint

This document captures the reusable backend engineering style of this codebase. It is intentionally business-domain neutral: use it as the standard for future Express, Node.js, MongoDB/Mongoose, MySQL, file-upload, email, cron, and API-service projects without copying feature-specific logic.

## 1. Project Overview

### Overall architecture style

Use a modular Express backend built around feature routers, controllers, service functions, Mongoose models, middleware, validators, upload helpers, mailers, scripts, utilities, and configuration modules.

The architecture is layered but pragmatic:

```text
Client
  -> Express app
  -> Router
  -> Middleware
  -> Controller
  -> Validator
  -> Service
  -> Model / Database / External provider
  -> Service
  -> Controller or direct response
  -> JSON response
  -> Client
```

The current style does not use a separate repository folder. Services import models directly and perform database operations with Mongoose or MySQL pools. If a future project becomes larger, repositories may be added below services, but controllers must still never call repositories directly.

### Architectural philosophy

Keep project bootstrapping in `app.js`, HTTP route registration in `router/`, request-facing orchestration in `controllers/`, business and database work in `services/`, schema definitions in `models/`, request checks in `validators/`, reusable integrations in `uploads/`, `mailer/`, `config/`, `utils/`, and background tasks in `scripts/`.

Prefer simple CommonJS modules, explicit imports, named exported functions, and feature-oriented files over framework-heavy abstractions. Let each folder have one clear reason to exist.

### Layered architecture

The app is organized as:

- Entry layer: `app.js` loads environment variables, connects infrastructure, attaches global middleware, mounts routers, and starts the HTTP server.
- Routing layer: `router/*.js` defines URL paths, HTTP methods, and middleware chain order.
- Controller layer: `controllers/*.js` receives `req` and `res`, validates input when a validator exists, calls one service function, and catches unexpected errors.
- Service layer: `services/*.js` owns business rules, database reads/writes, file upload calls, email calls, pagination, filtering, role checks, and final JSON responses.
- Data layer: `models/*.js` defines Mongoose schemas, refs, indexes, enums, subdocuments, timestamps, and serialization behavior.
- Infrastructure layer: `config/*.js`, `uploads/*.js`, `mailer/*.js`, `scripts/*.js`, and `utils/*.js`.

### Data flow

Request data enters through `req.body`, `req.query`, `req.params`, `req.files`, and `req.user`. JWT middleware attaches decoded token data to `req.user`. Services normalize request values, fetch current user records when needed, perform authorization checks, build MongoDB queries, call external services, and send JSON responses.

### Request lifecycle

The standard request lifecycle is:

1. Express receives request.
2. CORS, body parser, and logger middleware run.
3. Route-specific middleware runs, usually JWT and optional multer upload.
4. Controller validates the body if a Joi schema exists.
5. Controller calls the matching service.
6. Service reads authenticated user from `req.user`.
7. Service performs role, ownership, and existence checks.
8. Service performs database, upload, email, or utility work.
9. Service returns `res.status(...).json(...)` or `res.status(...).send(...)`.
10. Errors are logged with `console.error` and returned as JSON with `statusCode`.

### Design principles

- Keep the route file declarative.
- Keep controllers thin.
- Put most endpoint behavior in services.
- Use Mongoose schemas as the source of database structure.
- Use Joi for structured request validation.
- Use JWT middleware for protected routes.
- Use consistent JSON envelopes with `success`, `message`, `data`, and `statusCode`.
- Use `timestamps: true` on Mongoose models by default.
- Use indexes for fields queried often.
- Keep integration details behind small helper modules.

### Scalability approach

Scale by adding one route, controller, service, model, validator, mailer, upload helper, utility, or script per responsibility. Avoid monolithic files when a feature gains independent concerns. For large domains, split service files by subdomain while keeping the same naming and dependency rules.

### Maintainability strategy

Maintainability comes from predictable file placement, direct import paths, explicit request flow, small middleware, schema-level constraints, consistent response shapes, and repeatable module creation. New projects should preserve this shape even when the domain changes.

## 2. Complete Folder Structure

### Root

Root contains application bootstrap files and package metadata.

Belongs here:

- `app.js`
- `package.json`
- `package-lock.json`
- documentation such as this blueprint

Never place controllers, models, services, or feature logic directly in root.

### `config/`

Purpose: infrastructure configuration and connection factories.

Belongs here:

- Mongo connection modules
- MySQL pool factories
- mail transporter setup
- provider clients that are global application infrastructure

Never place endpoint business logic, route handlers, schemas, or response mapping here.

Naming: use descriptive lower camel or environment-specific names such as `uatDB.js`, `prodDB.js`, and `transporter.js`.

Imports: config modules may import `dotenv`, `path`, provider SDKs, and low-level clients. They should not import controllers or services.

### `controllers/`

Purpose: request-facing endpoint functions.

Belongs here:

- `authController.js`
- `jobController.js`
- feature controller files named after their API area

Never place schema definitions, raw upload provider logic, mail template HTML, cron scheduling, or large aggregation pipelines here.

Naming: `<feature>Controller.js`, except legacy files may use concise names. Export named async functions.

### `services/`

Purpose: business operations and database orchestration.

Belongs here:

- database calls through models
- filtering, sorting, pagination
- role and ownership decisions
- external API calls
- email trigger calls
- file upload calls
- response construction

Never place Express route definitions here. Do not initialize global app middleware here.

Naming: `<feature>Service.js`. Service functions use a `fetch` prefix in this project, for example `fetchGetAllJobs`, `fetchCreateTicket`, `fetchVerifyOtp`. Preserve this style for consistency.

### `models/`

Purpose: Mongoose schema and model definitions.

Belongs here:

- schemas
- sub-schemas
- refs
- indexes
- enums
- timestamps
- serialization transforms

Never place route handlers, email sending, upload code, or request parsing here.

Naming: `<feature>Model.js` or clear domain noun files. Export `mongoose.model(...)`.

### `router/`

Purpose: Express router definitions.

Belongs here:

- route paths
- HTTP methods
- route-specific middleware order
- controller binding

Never place business logic here except tiny exceptional routes. Avoid importing models directly in new route files.

Naming: `<feature>Routes.js` for new modules. Use `express.Router()`.

### `middleware/`

Purpose: reusable Express middleware.

Belongs here:

- JWT authentication
- authorization helpers
- future validation middleware
- future sanitization, caching, and error middleware

Never place endpoint-specific services here.

Naming: `<purpose>Middleware.js`, for example `jwtMiddleware.js`.

### `validators/`

Purpose: Joi request validation schemas.

Belongs here:

- body validators
- query validators
- params validators
- reusable field-level Joi fragments

Never place database calls or controller responses beyond validation schema definitions.

Naming: `<feature>Validators.js`. Export named Joi schemas in lower camel case.

### `uploads/`

Purpose: file upload middleware and storage provider helpers.

Belongs here:

- multer configuration
- file filters
- file size limits
- temporary disk or memory storage decisions
- S3 upload helper services
- filename sanitization

Never place feature business logic or model definitions here.

Naming: `upload.js` for shared multer, `uploadImage.js` for image-only multer, and `<asset>UploadService.js` for provider upload helpers.

### `mailer/`

Purpose: email sending functions.

Belongs here:

- mail option construction
- transporter usage
- email recipient resolution
- calling template functions

Never place HTML template bodies here. Never place route handlers here.

Naming: `<feature>Mailer.js` or concise feature names.

### `emailTemplates/`

Purpose: HTML email template functions organized by feature and recipient.

Belongs here:

- pure template functions
- static subject-independent HTML structure
- recipient-specific template folders

Never place transporter calls, route handlers, or database queries here.

Naming: `<event>Template.js`, grouped by feature and recipient.

### `responses/`

Purpose: reusable response mappers for complex output formatting.

Belongs here:

- functions that transform DB rows/documents into API payloads
- date formatting for response DTOs
- response envelopes for repeated formats

Never place database writes or route registration here. If a response mapper must query a database, document that dependency and prefer moving it to service logic in new code.

### `scripts/`

Purpose: background jobs, cron jobs, import scripts, and operational data sync.

Belongs here:

- `node-cron` schedules
- database seed/import jobs
- one-off migration scripts
- scheduled email/report jobs

Never place request/response handlers here.

Naming: `<feature>Script.js` for import scripts and `<feature>Cron.js` for scheduled work.

### `utils/`

Purpose: pure or mostly pure reusable helpers.

Belongs here:

- formatting
- Excel/report generation
- reusable date helpers
- parsing helpers
- reusable constants if no separate constants folder exists

Never place Express handlers or business workflows here.

### `private/`

Purpose: local private assets used by scripts or imports.

Belongs here:

- private CSV/XLSX input files
- non-public seed data

Never serve this directory publicly.

### `node_modules/`

Dependency installation output. Never edit manually.

## 3. File Naming Standards

- Controllers: `<feature>Controller.js`; exported functions should be endpoint actions such as `getProfile`, `updateProfile`, `createInterview`.
- Routes: `<feature>Routes.js`; router variable should be `<feature>Router`.
- Services: `<feature>Service.js`; service functions commonly use `fetch<Action>` naming.
- Models: `<feature>Model.js` or domain noun; model names are PascalCase or existing collection-compatible names.
- Repositories: if added later, `<feature>Repository.js`; only services may import them.
- Middlewares: `<purpose>Middleware.js`.
- Validators: `<feature>Validators.js`; export Joi schemas as lower camel case names.
- Utilities: `<verbOrNoun>.js`, for example `generatePendingTicketsExcel.js`.
- Constants: if introduced, `constants/<domain>Constants.js`.
- Configurations: clear provider/environment names such as `uatDB.js`, `prodDB.js`, `transporter.js`.
- Enums: if introduced, `enums/<domain>Enums.js`; otherwise keep enum arrays near models or services.
- DTOs and response schemas: put reusable response mappers in `responses/<feature>Response.js`.
- Types and interfaces: in JavaScript projects, document object shapes with clear naming; if TypeScript is adopted, use `types/<feature>Types.ts`.
- Sockets: `sockets/<feature>Socket.js` if real-time features are introduced.
- Cron jobs: `scripts/<feature>Cron.js`.
- Queues: `queues/<feature>Queue.js` if queue processing is introduced.
- Events: `events/<feature>Events.js` if event emitters are introduced.
- Emails: `mailer/<feature>Mailer.js`.
- Templates: `emailTemplates/<feature>/<event>Template.js`.
- Helpers: `utils/<helperName>.js`.
- Database files: `config/<environmentOrProvider>DB.js`.

Use lower camel case for functions and variables, PascalCase for schemas and Mongoose model constants, and uppercase only for true constants or environment variables.

## 4. API Development Pattern

This project's API pattern must be copied as a wiring style, not replaced with a different backend style. Future projects should keep the same route -> controller -> service structure, the same `req, res` handoff into services, the same CommonJS exports, and the same feature-wise router mounting pattern.

Standard endpoint flow:

```text
Client
  -> Route
  -> Middleware
  -> Validation
  -> Authentication
  -> Authorization
  -> Controller
  -> Service
  -> Model / Database / Provider
  -> Service
  -> Response JSON
  -> Client
```

### Route responsibility

Routes define HTTP verb, path, middleware chain, and controller. Route files should be readable at a glance.

The route files follow this exact pattern:

```js
const express = require("express");
const featureRouter = express.Router();
const jwtMiddleware = require("../middleware/jwtMiddleware");
const { getAllItems, getItemDetail, createItem } = require("../controllers/featureController");

featureRouter.get("/getAllItems", jwtMiddleware, getAllItems);
featureRouter.get("/getItemDetail/:id", jwtMiddleware, getItemDetail);
featureRouter.post("/createItem", jwtMiddleware, createItem);

module.exports = featureRouter;
```

Route conventions to preserve:

- Create one router variable per feature, for example `authRouter`, `jobRouter`, `userProfileRouter`.
- Import controllers through object destructuring.
- Attach middleware inline in the route declaration.
- Put JWT middleware before the controller.
- Put upload middleware after JWT and before controller.
- Use action-oriented endpoint names when matching this project style, such as `/getAllItems`, `/getItemDetail/:id`, `/createItem`, `/updateItem`.
- Keep route files as wiring files. New route files should not contain database queries.

### Middleware responsibility

Middleware handles cross-cutting concerns before controller execution: JWT verification, upload parsing, future validation middleware, and future security middleware.

### Controller responsibility

Controllers should validate when a Joi schema exists, call exactly one service function for the main operation, and catch unexpected errors.

The controller files follow this exact pattern:

```js
const { createItemSchema } = require("../validators/featureValidators");
const { fetchCreateItem, fetchAllItems } = require("../services/featureService");

const createItem = async (req, res) => {
  try {
    const { error } = createItemSchema.validate(req.body);
    if (error) return res.status(422).json({ message: error.details[0].message });
    fetchCreateItem(req, res);
  } catch (error) {
    console.error("Error Create Item:", error);
    return res.status(500).json({ message: error.message, statusCode: 500 });
  }
};

const getAllItems = async (req, res) => {
  try {
    fetchAllItems(req, res);
  } catch (error) {
    console.error("Error Get All Items:", error);
    return res.status(500).json({ message: error.message, statusCode: 500 });
  }
};

module.exports = { createItem, getAllItems };
```

Controller conventions to preserve:

- Controllers are thin API wrappers.
- Controller function names are user-facing actions, such as `sendOTP`, `verifyOTP`, `getAllJobs`, `createInterview`, `updateProfile`.
- Service function names usually add a `fetch` prefix, such as `fetchOtp`, `fetchVerifyOtp`, `fetchGetAllJobs`, `fetchCreateInterview`.
- Controllers pass the complete `req` and `res` objects to services.
- Controllers do not manually map service return values.
- Controllers do not instantiate models for new APIs unless the endpoint is extremely small and legacy-compatible.

### Service responsibility

Services perform the real endpoint work: current-user lookup, authorization checks, model queries, updates, uploads, emails, date calculations, pagination, and final response creation.

The service files follow this exact pattern:

```js
const FeatureModel = require("../models/featureModel");
const User = require("../models/userModel");

const fetchAllItems = async (req, res) => {
  try {
    const decoded = req.user;
    const user = await User.findOne({ _id: decoded.mongoId });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found", statusCode: 404 });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const query = {};

    const items = await FeatureModel.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await FeatureModel.countDocuments(query);
    return res.status(200).json({ success: true, total, page, limit, data: items, statusCode: 200 });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message, statusCode: 500 });
  }
};

module.exports = { fetchAllItems };
```

Service conventions to preserve:

- Services receive `(req, res)` directly.
- Services return Express responses directly with `res.status(...).json(...)` or `res.status(...).send(...)`.
- Services fetch the authenticated user when protected behavior depends on identity.
- Services perform role checks and return `403` when access is denied.
- Services perform not-found checks before writes.
- Services build query objects locally from params/query/body.
- Services use Mongoose models directly.
- Services own pagination, filters, sorting, projection, populate, and aggregation.
- Services own side effects such as upload cleanup and email triggers.

### Model/database responsibility

Models define durable structure, indexes, refs, enums, timestamps, and document behavior. Query details live in services or future repositories.

## 5. Controller Standards

Controllers are async functions receiving `(req, res)`.

Allowed logic:

- run Joi validation
- return `422` for validation failures
- call a service function
- catch and log unexpected errors
- return a `500` response if the service call throws

Forbidden logic:

- long database workflows
- large aggregation pipelines
- provider SDK calls
- upload-to-S3 implementation
- email transport implementation
- cron scheduling
- hidden side effects unrelated to request orchestration

Error handling:

```js
try {
  await fetchSomeAction(req, res);
} catch (error) {
  console.error("Error Some Action:", error);
  return res.status(500).json({ message: error.message, statusCode: 500 });
}
```

Calling services:

- Import service functions by name.
- Pass `req` and `res` to match current project style.
- Prefer `await` when the service returns a promise.

HTTP status handling:

- `200` for successful reads and updates.
- `201` only when a resource is explicitly created and the current module wants creation semantics.
- `202` for accepted logging/async intake.
- `400` for malformed request values.
- `401` for invalid or expired authentication.
- `403` for missing authorization token or forbidden access.
- `404` for missing resource or user.
- `422` for validation/business rule failures.
- `500` for unexpected errors.

Naming:

- Controller action names should describe the endpoint: `getAllJobs`, `getJobDetail`, `updateProfile`.
- Use comments sparingly to label endpoint groups.

## 6. Service Layer Standards

Services are the primary implementation layer.

Responsibilities:

- business rules
- authenticated user lookup
- authorization and ownership checks
- request parsing and normalization
- Mongoose queries and updates
- MySQL queries through pools where needed
- pagination, filtering, sorting, projection
- file upload orchestration
- email trigger orchestration
- response JSON construction

Transactions:

- Use MongoDB transactions only when multiple writes must succeed or fail together.
- For current simple flows, sequential writes with guarded error handling are acceptable.
- When using external providers, avoid holding database transactions across network calls.

Validation responsibilities:

- Request shape validation belongs in Joi/controller.
- Existence, ownership, role, date ordering, uniqueness, and state-transition validation belongs in services.

External API calls:

- Keep provider setup in config/helper modules when reusable.
- Wrap provider calls in try/catch.
- Log provider errors with enough context.
- Return a stable API error to the client.

Data transformation:

- Services may transform database documents for endpoint needs.
- Use `.lean()` for read-only list/detail results that do not need Mongoose document methods.
- Use response mappers for repeated formatting.

Exception handling:

- Catch errors inside services and return JSON responses.
- If a helper throws, service should clean up any temporary files and respond with `success: false`.

Reusability rules:

- Put helper functions inside a service only if they are feature-private.
- Move shared helpers to `utils/`, `uploads/`, `mailer/`, or `responses/`.

## 7. Repository / Database Layer

Current standard: services directly import models and call Mongoose query APIs.

Allowed database patterns:

- `find`, `findOne`, `findById`
- `create`, `save`
- `findByIdAndUpdate`, `findOneAndUpdate`
- `bulkWrite` for batch upserts
- `insertMany` for import scripts
- `countDocuments` for pagination
- `aggregate` for dashboards and reporting
- `populate` for referenced user/detail records
- `select` and projection objects for smaller payloads
- `lean` for read-only performance

Queries:

- Build query objects incrementally from `req.query`.
- Convert numeric query values with `parseInt` or `Number`.
- Use regex search only on intended text fields.
- Use `$or`, `$in`, `$nin`, `$elemMatch`, and date operators as needed.

Aggregation:

- Keep large dashboard/reporting aggregations in services.
- Use named pipeline variables.
- Use `allowDiskUse: true` when a report may become large.

Pagination:

```js
const page = parseInt(req.query.page) || 1;
const limit = parseInt(req.query.limit) || 10;
const skip = (page - 1) * limit;
```

Return `total`, `page`, `limit`, and `data` where practical.

Projection:

- Use `.select("fieldA fieldB")` or projection objects to avoid leaking sensitive or unnecessary fields.
- Exclude passwords and internal fields from user responses.

Filtering and sorting:

- Lists default to newest first with `.sort({ createdAt: -1 })`.
- Reports may sort alphabetically or by computed totals.

Optimization:

- Add indexes to frequently filtered fields.
- Prefer `.lean()` for read-only results.
- Use bulk operations for many related writes.
- Avoid loading full related documents when `populate(..., "field list")` is enough.

Future repository option:

If repositories are introduced, keep them below services:

```text
Controller -> Service -> Repository -> Model
```

Repositories should return data, not Express responses.

## 8. Model Standards

Use Mongoose schemas for MongoDB collections.

Schema organization:

- Require `mongoose`.
- Define sub-schemas first.
- Define main schema.
- Add indexes or serialization transforms after schema creation.
- Export the model at the bottom.

Indexes:

- Add `index: true` on frequently queried fields.
- Add compound indexes for common combined filters.
- Add unique indexes for natural uniqueness.

Virtuals:

- Enable virtuals in `toJSON` only when the API requires them.

Hooks:

- Use hooks for model-intrinsic behavior only, not request-specific side effects.

Statics and methods:

- Add only when reused across services.

Relationships:

- Use `ref` for related documents.
- Match ref names to the actual model names.
- Populate only fields required by the response.

Validation:

- Use `required`, `enum`, `default`, `trim`, `lowercase`, and type constraints.
- Keep request-specific validation in Joi, not only in Mongoose.

Timestamps:

- Use `{ timestamps: true }` by default.

Subdocuments:

- Use `{ _id: false }` when subdocuments do not need identity.
- Use `{ _id: true }` when array elements are updated individually.

## 9. Routing Standards

Route organization:

- One router file per feature area.
- Import controller functions at the top.
- Import middleware at the top.
- Declare routes in a compact list.
- Export the router.

Versioning:

- Current style mounts under `/api/<feature>`.
- For future versioning, prefer `/api/v1/<feature>` and keep versioned routers grouped.

Grouping:

- Group routes by feature, not HTTP method.
- Keep auth routes, user routes, dashboard routes, file-backed routes, and admin routes in separate routers when they grow.

REST conventions:

- Current code uses action-oriented paths such as `/getProfile` and `/createTicket`.
- For strict REST projects, use resource paths such as `GET /profiles/me` while preserving the same folder and layer rules.

Nested routes:

- Use params for detail endpoints: `/:id`, `/:jobId`.
- Use nested paths only when ownership is clear, for example `/tickets/:ticketId/comments`.

Admin routes:

- Protect with JWT and role checks.
- Prefer separate route groups when admin behavior diverges.

Public routes:

- Keep public routes explicit and limited.
- Do not attach JWT middleware to public auth initiation routes.

## 10. Middleware Pattern

Execution order:

1. Global CORS
2. Body parser
3. Request logger
4. Router mount
5. Route-specific JWT middleware
6. Route-specific upload middleware
7. Controller

Authentication:

`jwtMiddleware.js` reads `Authorization: Bearer <token>`, verifies with `process.env.JWT_KEY`, loads the user, checks manual logout invalidation, attaches decoded token to `req.user`, and calls `next()`.

Authorization:

Role checks currently live inside services. Future shared authorization middleware may be added for repeated role gates.

Validation:

Current validation is controller-level Joi validation. Future projects may wrap Joi schemas in a middleware factory if many endpoints need it.

Logging:

Global HTTP logging uses `morgan('dev')`. Business/event logging is implemented through a service writing activity records.

Error handling:

Current style uses local try/catch in controllers/services. A future global error handler may be added after route registration.

File upload:

Use multer middleware in routes before controllers: `upload.any()` or image-specific middleware.

Caching:

Not currently implemented. Add caching at service/helper boundaries, not in controllers.

Security:

Current implemented controls include CORS, JWT, file type filters, file size limits, password hashing dependency availability, environment variables, and schema validation. Future projects should add Helmet and input sanitization.

## 11. Validation Pattern

Validation library: Joi.

Folder organization:

- Put validators in `validators/<feature>Validators.js`.
- Export named schemas.

Reusable validators:

- Use `Joi.alternatives().try(...)` for fields that accept multiple formats.
- Use `.messages(...)` for user-facing validation messages.
- Use `.pattern(...)` for strict formats such as phone and OTP values.

Request validation flow:

```js
const { error } = schema.validate(req.body);
if (error) return res.status(422).json({ message: error.details[0].message });
```

Custom validators:

- Use Joi custom validators for reusable complex rules.
- Keep database-backed validation in services.

Error messages:

- Return the first Joi detail message.
- Prefer clear messages such as `"OTP must be exactly 6 digits"`.

## 12. Authentication Architecture

JWT flow:

1. User initiates login with email or phone.
2. Service normalizes identifier.
3. Service generates OTP.
4. OTP is sent through email or SMS provider.
5. OTP verification validates code and expiry.
6. Service signs JWT with `JWT_KEY`.
7. JWT payload includes durable identifiers and role data.
8. Token is returned in response and `Authorization` header.
9. Protected routes require `Authorization: Bearer <token>`.

Refresh tokens:

Not currently implemented. Future projects can add refresh tokens as a separate model and middleware flow.

Password hashing:

`bcryptjs` is available. Store only hashed passwords. Never return password hashes.

Sessions:

Session activity is tracked in a model with login time, logout time, expiry time, duration, and logout reason.

Cookies:

Current style uses headers rather than cookies.

Headers:

Use `Authorization` for bearer tokens.

Token verification:

Middleware verifies token, checks user existence, checks manual logout timestamp against token issue time, and handles token expiry by updating session activity.

Protected routes:

Attach `jwtMiddleware` in route files for every authenticated endpoint.

## 13. Authorization Pattern

Authorization is service-level and role-based.

Patterns:

- Check `req.user.role`.
- Fetch the current user from DB before sensitive operations.
- Compare ownership fields such as `createdBy`, `userProfileId`, or assigned user arrays.
- Return `403` for forbidden role access.
- Return `404` when the target resource or user does not exist.

Role-based access:

- Store role on user model and in JWT payload.
- Use explicit role strings and keep role checks close to business rules.

Admin routes:

- Admin endpoints should either have service-level role checks or a shared role middleware.

Ownership validation:

- Never rely only on request parameters for ownership.
- Always combine authenticated identity with model filters or service checks.

## 14. Response Structure

Standard success response:

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {},
  "statusCode": 200
}
```

Standard error response:

```json
{
  "success": false,
  "message": "Error message",
  "statusCode": 500
}
```

Pagination response:

```json
{
  "success": true,
  "total": 100,
  "page": 1,
  "limit": 10,
  "data": [],
  "statusCode": 200
}
```

Validation response:

```json
{
  "message": "Validation message"
}
```

Authentication response:

```json
{
  "status": true,
  "message": "OTP verified successfully",
  "token": "<jwt>",
  "user": {},
  "statusCode": 200
}
```

Future projects should normalize on `success`, not `status`, unless maintaining compatibility with an existing client.

## 15. Error Handling Standard

Current standard:

- Local try/catch in controller and service functions.
- Log errors with `console.error`.
- Return JSON with `message` and `statusCode`.
- Use explicit status codes for expected failures.

Custom errors:

Not currently implemented. Future projects may introduce `AppError` with `statusCode`, but services should still return the same response envelope.

Global error handler:

Not currently present. If added, mount after all routers:

```js
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal server error",
    statusCode: err.statusCode || 500,
  });
});
```

Logging:

- Log provider errors, DB errors, JWT errors, and cron errors.
- Avoid logging secrets, passwords, raw tokens, or sensitive files.

HTTP mapping:

- Missing token: `403`
- Invalid token: `401`
- Expired token: `401`
- Validation failure: `422`
- Bad date/input format: `400`
- Forbidden role: `403`
- Missing resource: `404`
- Unexpected error: `500`

## 16. Utility Layer

Utilities are standalone helpers that can be reused by services, scripts, or mailers.

Allowed utilities:

- date formatting
- Excel generation
- parsing
- filename normalization
- encryption helpers
- constants
- response-neutral formatting

Date helpers:

- Use `toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })` where IST output is required.
- Keep timezone-specific formatting centralized when repeated.

Formatting:

- Response-specific formatting belongs in `responses/`.
- General file/report formatting belongs in `utils/`.

Parsing:

- Parse JSON strings from multipart requests inside services.
- Validate parsed results before use.

## 17. Configuration Management

Environment variables:

- Load with `dotenv`.
- Use `path.join(__dirname, "../.env")` where modules need direct loading.
- Access secrets through `process.env`.

Config files:

- DB connections in `config/*DB.js`.
- Mail transport in `config/transporter.js`.
- Provider clients may live in config or provider-specific helper modules.

Initialization:

- `app.js` should call database connection before `app.listen`.
- Scripts should initialize any required DB connection before running.

Secrets:

- Never hardcode secrets in future projects.
- Keep database credentials, JWT keys, SMTP passwords, and cloud keys in environment variables.

Application settings:

- Use environment variables for port, CORS origins, provider credentials, bucket names, URLs, and cron recipient addresses.

## 18. Database Connection Architecture

MongoDB:

- Use Mongoose.
- Export an async `connectDb` function.
- Throw or exit if URI is missing.
- Call `mongoose.connect(URI)`.
- Log connected database name.

MySQL:

- Use `mysql2/promise`.
- Create a singleton pool.
- Set `waitForConnections`, `connectionLimit`, and `queueLimit`.
- Test connection with `pool.getConnection()` and release it.

Pooling:

- Mongoose manages connection pooling internally.
- MySQL uses explicit pool singleton.

Retry strategy:

- Current style fails fast with `process.exit(1)`.
- Future projects may add retry with backoff for production resilience.

Connection lifecycle:

- Initialize before server listen.
- Scripts should close connections when long-running behavior is not expected.

## 19. Logging Pattern

Logger:

- Current standard uses `console.log` and `console.error`.
- HTTP logs use `morgan('dev')`.

Request logging:

- Keep `morgan` as global middleware.
- Use activity logging models for user interaction/event records.

Error logging:

- Include context labels: `"JWT Error:"`, `"S3 Upload Error:"`, `"Activity Log Error:"`.
- Avoid dumping secrets.

Performance logging:

- Add targeted logs around batch writes, provider calls, and cron jobs only when useful.

Future logger:

- A future project may replace console with Winston or Pino while preserving the same log contexts and layers.

## 20. Security Standards

Implemented or expected standards:

- CORS allowlist with credentials.
- JWT verification on protected routes.
- Manual logout invalidates older tokens.
- Token expiry updates session activity.
- Joi validation for auth payloads.
- Multer file type filters.
- Upload file size limits.
- Mongoose schema enums and required fields.
- Password hashing with bcrypt for password-based flows.
- Environment variables for secrets.

Helmet:

- Add `helmet()` globally in future projects.

Input sanitization:

- Sanitize body/query/params to reduce injection risk.

Mongo injection prevention:

- Avoid passing raw request objects directly into queries.
- Build allowlisted query objects.

XSS prevention:

- Sanitize user-provided rich text.
- Escape output in templates.

JWT security:

- Use strong `JWT_KEY`.
- Keep expiration short enough for risk profile.
- Do not log full tokens.

Environment security:

- Never commit `.env`.
- Never hardcode provider secrets.

## 21. Performance Optimization

Indexes:

- Index user, session, ticket, status, priority, key, and relation fields used in filters.

Lean queries:

- Use `.lean()` for read-only responses.

Pagination:

- Paginate list endpoints with `page`, `limit`, `skip`, and `countDocuments`.

Caching:

- Not currently implemented. Add cache behind services for read-heavy dashboards or static lists.

Compression:

- Add HTTP compression in future projects with `compression`.

Streaming:

- Stream local files to S3 with `fs.createReadStream`.
- Generate binary report buffers in utilities.

Async operations:

- Send non-critical emails asynchronously after primary writes.
- Use `Promise.all` for independent email sends.
- Use `setImmediate` for fire-and-forget notifications when the response should not wait.

## 22. API Versioning Strategy

Current mount pattern:

```text
/api/auth
/api/user
/api/job
```

Future versioned pattern:

```text
/api/v1/auth
/api/v1/users
/api/v1/jobs
```

Folder organization:

- Keep current folders if only one version exists.
- For multiple versions, add `router/v1/`, `controllers/v1/`, or version-specific modules only where behavior differs.

Backward compatibility:

- Do not change response shapes or paths without client migration.
- Add new fields instead of renaming existing fields.

Migration strategy:

- Keep old router mounted.
- Add new router under new version.
- Deprecate after clients migrate.

## 23. Code Style Guide

Indentation:

- Use 2 spaces in new files.
- Preserve local style when editing legacy files.

Naming:

- lower camel case for variables and functions.
- PascalCase for Mongoose models and schema constants.
- UPPER_SNAKE_CASE for environment variables.

Functions:

- Prefer focused async functions.
- Keep endpoint functions named and exported.

Arrow functions:

- Use arrow functions for controllers, services, helpers, and callbacks.

Classes:

- Avoid classes unless a provider SDK or custom error abstraction needs them.

Imports:

- Use CommonJS `require`.
- Group built-in modules first, third-party modules next, local modules last when practical.

Exports:

- Use `module.exports = { namedFunction }` for multiple functions.
- Use `module.exports = singleValue` for one model, router, or utility.

Comments:

- Comments should explain purpose or non-obvious behavior.
- Avoid comments that repeat the code.

File length:

- Keep controllers short.
- Services may grow for complex workflows, but split when unrelated workflows accumulate.

Function length:

- Prefer functions under 80 lines.
- Extract private helpers for repeated or nested logic.

Formatting:

- Use semicolons consistently in new code.
- Avoid unnecessary blank lines.
- Keep JSON responses readable.

## 24. Dependency Rules

### Exact wiring contract

Future projects generated from this blueprint must preserve this wiring contract:

```text
app.js
  imports router/<feature>Routes.js
  mounts with app.use("/api/<feature>", featureRouter)

router/<feature>Routes.js
  creates express.Router()
  imports middleware
  imports controllers
  defines method + path + middleware + controller
  exports router

controllers/<feature>Controller.js
  imports validators if present
  imports services
  defines async controller functions
  validates req.body when needed
  calls fetch<ServiceAction>(req, res)
  catches errors and returns 500
  exports controller functions

services/<feature>Service.js
  imports models/helpers/mailers/uploads/utils
  defines async fetch<ServiceAction>(req, res)
  reads req.params, req.query, req.body, req.files, req.user
  performs DB/provider/business work
  sends final API response
  exports service functions
```

This means future code should not switch to a pattern where controllers return values and a generic response middleware formats them, unless the whole project is intentionally migrated. The reusable standard here is the existing direct-response service style.

Allowed imports:

```text
app.js
  -> config
  -> router
  -> scripts needed at startup

router
  -> controllers
  -> middleware
  -> uploads

controllers
  -> validators
  -> services

services
  -> models
  -> uploads
  -> mailer
  -> utils
  -> responses
  -> config when needed

models
  -> mongoose only

middleware
  -> models when identity lookup is required
  -> config/env

mailer
  -> config/transporter
  -> emailTemplates

emailTemplates
  -> no app layers

scripts
  -> models
  -> services only if reusable and safe outside HTTP
  -> mailer
  -> utils
  -> config

utils
  -> third-party libraries
  -> no controllers/routes
```

Forbidden dependency directions:

- Models must not import services or controllers.
- Utils must not import controllers or routes.
- Routes must not perform service-level database logic in new code.
- Controllers must not import provider SDKs directly.
- Mail templates must not send mail.

Dependency diagram:

```text
                app.js
                  |
               router
                  |
             middleware
                  |
              controller
                  |
               service
        /      /    |     \       \
    models uploads mailer utils responses
                 |
          emailTemplates
```

## 25. Module Creation Blueprint

To create a new module:

1. Create model if persistence is needed: `models/<feature>Model.js`.
2. Add schema fields, refs, enums, indexes, timestamps, and export model.
3. Create validator if request body/query/params need validation: `validators/<feature>Validators.js`.
4. Create service: `services/<feature>Service.js`.
5. Add service functions named `fetch<Action>`.
6. Implement current-user lookup, authorization, database work, provider calls, and response envelopes inside the service.
7. Create controller: `controllers/<feature>Controller.js`.
8. Import validator and service.
9. Validate request if applicable.
10. Call the service as `fetch<Action>(req, res)` inside try/catch.
11. Create router: `router/<feature>Routes.js`.
12. Import middleware and controller.
13. Define routes with HTTP method, action-style path, JWT middleware, optional upload middleware, and controller in that order.
14. Mount router in `app.js` under `/api/<feature>`.
15. Add mailer/template/upload/utils only if the module needs them.
16. Test public, authenticated, validation, not-found, forbidden, and error paths.

## 26. End-to-End Request Lifecycle

Example protected upload endpoint:

1. Client sends `POST /api/<feature>/<action>` with bearer token and multipart body.
2. CORS checks origin.
3. Body parser or multer parses request.
4. Morgan logs method and URL.
5. JWT middleware verifies token.
6. JWT middleware fetches user and checks logout invalidation.
7. Multer validates file type and size.
8. Controller validates request body with Joi if schema exists.
9. Controller calls `fetch<Action>(req, res)`.
10. Service loads current user from `req.user.mongoId`.
11. Service checks role and resource ownership.
12. Service uploads file through upload helper if present.
13. Service removes local temp file after provider upload.
14. Service writes or reads database data.
15. Service triggers email/report/log side effects if needed.
16. Service sends JSON response.
17. If any step fails, the nearest catch logs and returns structured JSON error.

## 27. Reusable Development Workflow

Use this workflow for every new API:

1. Identify feature boundary and folder placement.
2. Define database schema or reuse existing model.
3. Define request contract and Joi validation.
4. Define route path, method, middleware, and controller.
5. Implement controller as thin orchestration.
6. Implement service behavior.
7. Add helper utilities only for reusable behavior.
8. Add email/upload integrations behind helper modules.
9. Return a consistent JSON envelope.
10. Manually test success and failure paths.
11. Review imports and dependency direction.
12. Check secrets, logs, and response fields for leaks.

## 28. Coding Standards Checklist

Every pull request should satisfy:

- Files are placed in the correct folder.
- New route is mounted in `app.js`.
- Protected endpoints use JWT middleware.
- Upload endpoints use appropriate multer middleware.
- Controllers are thin.
- Services own business and DB logic.
- Joi validators exist for non-trivial request bodies.
- Responses include `success`, `message` where useful, `data` where useful, and `statusCode`.
- Errors are caught and logged.
- Models use timestamps.
- Frequent filters have indexes.
- Sensitive fields are not returned.
- File uploads validate MIME type, extension, and size.
- Temp files are cleaned up after upload failures or success.
- Emails use mailer and template folders.
- Environment variables are used for secrets.
- No hardcoded secrets are introduced.
- Lists are paginated where they can grow.
- Read-only Mongoose lists use `.lean()` where practical.
- Import direction follows the dependency rules.

## 29. Best Practices Extracted From This Project

- Clear Express application bootstrap.
- Feature-based router files.
- Consistent controller-service split.
- Joi validation for auth payloads.
- JWT middleware with user lookup.
- Manual logout invalidation using `signOutAt`.
- Session activity tracking.
- Mongoose timestamps across models.
- Schema enums for allowed statuses/types.
- Indexes on common query fields.
- Pagination with page and limit.
- Projection and `select` for smaller responses.
- `populate` with selected fields.
- `.lean()` for read-only response shaping.
- Bulk writes for questionnaire-style upserts.
- File upload filters and size limits.
- S3 upload helpers separate from business services.
- Local temp file cleanup after upload.
- Mailer functions separate from templates.
- Cron jobs isolated in `scripts/`.
- Utility-generated Excel reports.
- CORS allowlist for frontend origins.
- Environment-driven provider credentials.
- Startup DB connection before listening.

## 30. Anti-Patterns

This architecture avoids or should avoid:

- Business logic in `app.js`.
- Large route handlers in `router/`.
- Database workflows in controllers.
- Mongoose schema definitions outside `models/`.
- Sending email directly from controllers.
- Embedding HTML templates in services.
- Hardcoding secrets or credentials.
- Returning password hashes or raw tokens in logs.
- Unbounded list endpoints.
- Raw request objects passed directly into Mongo queries.
- Uploads without file type and size checks.
- Provider SDK setup duplicated across services.
- Background cron code inside request handlers.
- Cross-layer circular imports.

Current legacy deviations to avoid in new code:

- Inconsistent `success` vs `status` response flags.
- Service functions that respond without being awaited by controllers.
- Route files importing models directly.
- Hardcoded provider credentials.
- Duplicate `module.exports` in a file.
- Typos in filenames or route names.

## 31. Future Project Template

Any future backend project can reuse this architecture by replacing domain nouns only.

For an ERP, CRM, HRMS, e-commerce, hospital, banking, school, chat, or AI platform backend:

- Keep `app.js` as bootstrap.
- Keep one router per feature.
- Keep one controller per feature.
- Keep one service per feature.
- Keep Mongoose models in `models/`.
- Keep request validators in `validators/`.
- Keep uploads in `uploads/`.
- Keep mailers and templates separate.
- Keep scheduled tasks in `scripts/`.
- Keep reusable helpers in `utils/`.
- Keep response mappers in `responses/`.
- Keep configuration in `config/`.

Do not copy business rules, role names, ticket categories, email recipients, or model fields. Copy the engineering pattern, request flow, dependency direction, response discipline, and module creation workflow.

## 32. Instructions For AI

When generating new backend modules for a future project, follow these rules strictly:

1. Do not explain the old project or copy its business logic.
2. Use CommonJS `require` and `module.exports`.
3. Place each file in the correct folder.
4. Name files with the standards in this document.
5. Add a route file under `router/`.
6. Add a controller file under `controllers/`.
7. Add a service file under `services/`.
8. Add a Mongoose model under `models/` only when persistence is needed.
9. Add a Joi validator under `validators/` for request bodies that need structure.
10. Register the router in `app.js` under `/api/<feature>` or `/api/v1/<feature>`.
11. Put JWT middleware in the router for protected endpoints.
12. Put multer middleware in the router before controllers for file endpoints.
13. Keep controller functions small.
14. Let controllers validate and call one service function.
15. Put business rules, database calls, uploads, emails, and response generation in services.
16. Preserve the existing API wiring style exactly: `router` calls `controller`, `controller` calls `fetch...Service(req, res)`, and `service` sends the final response.
17. Use action-style route names when matching this codebase, such as `/getAll...`, `/get...Detail/:id`, `/create...`, `/update...`, `/delete...`.
18. Use controller function names without the `fetch` prefix and service function names with the `fetch` prefix.
19. Do not generate repository classes, base controllers, decorators, dependency injection containers, generic response wrappers, or a different framework unless explicitly requested.
20. Do not move response formatting out of services for new modules; keep the service-owned response style.
21. Use `req.user.mongoId` and `req.user.role` style authenticated identity where JWT payload supports it.
22. Fetch the current user from DB before sensitive operations.
23. Check role and ownership in services.
24. Build Mongo queries from allowlisted request fields.
25. Paginate list endpoints.
26. Use `sort({ createdAt: -1 })` for newest-first lists unless another order is required.
27. Use `countDocuments` with paginated lists.
28. Use `.lean()` for read-only list/detail responses.
29. Use `select` and `populate` with explicit fields.
30. Use schema enums, refs, indexes, defaults, trim, lowercase, and timestamps.
31. Return JSON envelopes with `success`, `message`, `data`, and `statusCode`.
32. Return validation failures with status `422`.
33. Return missing resources with status `404`.
34. Return forbidden access with status `403`.
35. Return invalid/expired auth with status `401`.
36. Return unexpected failures with status `500`.
37. Log errors with contextual `console.error` messages.
38. Never log secrets, passwords, or full tokens.
39. Keep provider clients and transporters in config/helper modules.
40. Keep email HTML in `emailTemplates/`.
41. Keep email sending in `mailer/`.
42. Keep upload provider logic in `uploads/`.
43. Clean up temporary files after upload success or failure.
44. Keep cron and import work in `scripts/`.
45. Keep reusable pure helpers in `utils/`.
46. Do not introduce repositories unless the module is large enough to justify them; if introduced, only services may import repositories.
47. Preserve dependency direction and avoid circular imports.
48. Avoid project-specific names in reusable templates.
49. Generate code that fits the existing architecture before adding new abstractions.
