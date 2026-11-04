# ClauseGuard — Backend

AI-assisted contract obligation management API.

**Core principle:** the AI tells ClauseGuard *what the contract says*. ClauseGuard decides *what to do with that information*. Every AI-extracted obligation enters the system as `potential` and requires an explicit human decision before it becomes actionable.

> ### AI and legal disclaimer
>
> ClauseGuard's contract analysis is an **assistive extraction layer, not legal advice**, and must not be presented as an authoritative legal interpretation. The AI may miss obligations, invent nuance, or misread clauses. Human review is a mandatory part of the workflow, not an optional step. Nothing the AI produces is ever auto-confirmed.

---

## Table of contents

- [Technology stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment setup](#environment-setup)
- [MongoDB setup](#mongodb-setup)
- [AI provider setup](#ai-provider-setup)
- [Running the server](#running-the-server)
- [Testing](#testing)
- [API reference](#api-reference)
- [Authentication flow](#authentication-flow)
- [Contract processing flow](#contract-processing-flow)
- [AI processing flow](#ai-processing-flow)
- [Obligation review workflow](#obligation-review-workflow)
- [Reminder scheduler](#reminder-scheduler)
- [Architecture](#architecture)
- [Security model](#security-model)
- [Known limitations](#known-limitations)

---

## Technology stack

| Concern | Choice |
| --- | --- |
| Runtime | Node.js 22.13.0+ |
| Language | TypeScript 5 (strict) |
| Framework | Express 4 |
| Database | MongoDB 6+ via Mongoose 8 |
| Auth | JWT (`jsonwebtoken`) + bcrypt (`bcryptjs`) |
| Validation | Zod |
| File upload | Multer 2 (memory storage) |
| PDF extraction | `pdfjs-dist 6` (official PDF.js ESM build) |
| AI | Google Gemini or Groq via REST provider implementations |
| Scheduling | `node-cron` 4 |
| Email | Resend REST API via `fetch` |
| HTTP client | Axios |
| Testing | Jest + ts-jest + Supertest |
| Linting | ESLint 9 (flat config) + typescript-eslint |

---

## Prerequisites

- **Node.js 22.13.0 or newer** (`node -v`)
- **npm 10 or newer**
- **A running MongoDB instance** (local, Docker, or Atlas)
- **A Gemini or Groq API key** — required for contract analysis; choose the matching `AI_PROVIDER`. The API starts without the selected key, but analysis will fail with `AI_NOT_CONFIGURED`.

---

## Installation

```bash
npm install
cp .env.example .env
# edit .env — at minimum set MONGODB_URI, JWT_SECRET and GEMINI_API_KEY
```

---

## Environment setup

Every variable is validated at startup by a Zod schema in `src/config/env.ts`. If anything required is missing or malformed, the process exits immediately with a message naming the offending variable — it never starts in a half-configured state.

| Variable | Required | Default | Notes |
| --- | --- | --- | --- |
| `NODE_ENV` | no | `development` | `development` \| `test` \| `production` |
| `PORT` | no | `4000` | HTTP port |
| `LOG_LEVEL` | no | `info` | `debug` \| `info` \| `warn` \| `error` \| `silent` |
| `MONGODB_URI` | **yes** | — | MongoDB connection string |
| `JWT_SECRET` | **yes** | — | Minimum 32 characters. Generate with `openssl rand -hex 32` |
| `JWT_EXPIRES_IN` | no | `7d` | Token lifetime |
| `BCRYPT_SALT_ROUNDS` | no | `12` | Cost factor, 8â€“15 |
| `FRONTEND_URL` | no; required in production | — | HTTPS URL in production; used to construct links in email |
| `RESEND_API_KEY` | no; required in production | — | Resend API key for email delivery |
| `EMAIL_FROM` | no; required in production | — | Sender address configured and verified with Resend |
| `AI_PROVIDER` | no | `gemini` | `gemini` or `groq` |
| `GEMINI_API_KEY` | when using Gemini | — | Without the selected provider key, analysis fails |
| `GEMINI_MODEL` | no | `gemini-2.0-flash` | |
| `GEMINI_API_BASE_URL` | no | Google's endpoint | Override for a proxy or gateway |
| `GROQ_API_KEY` | when using Groq | — | Required when `AI_PROVIDER=groq` |
| `GROQ_MODEL` | no | `llama-3.3-70b-versatile` | |
| `GROQ_API_BASE_URL` | no | Groq's OpenAI-compatible endpoint | |
| `AI_REQUEST_TIMEOUT_MS` | no | `60000` | Request abort threshold |
| `AI_MAX_INPUT_CHARS` | no | `120000` | Text beyond this is truncated before analysis |
| `UPLOAD_DIR` | no | `uploads` | Relative paths resolve from the project root |
| `MAX_FILE_SIZE` | no | `10485760` | 10 MB, in bytes |
| `CORS_ORIGIN` | no | `*` in development/test | `*` is allowed only outside production; use comma-separated HTTPS origins in production |
| `RATE_LIMIT_WINDOW_MS` | no | `900000` | 15 minutes |
| `RATE_LIMIT_MAX` | no | `300` | Global bucket |
| `AUTH_RATE_LIMIT_MAX` | no | `20` | Stricter bucket for credential endpoints |
| `SCHEDULER_ENABLED` | no | `true` | `true` \| `false` |
| `REMINDER_CRON` | no | `* * * * *` | Reminder dispatch schedule |
| `OVERDUE_CRON` | no | `0 * * * *` | Overdue sweep schedule |
| `SCHEDULER_TIMEZONE` | no | `UTC` | See [timezone strategy](#timezone-strategy) |
| `REMINDER_BATCH_SIZE` | no | `50` | Max reminders per dispatch pass |
| `REMINDER_MAX_ATTEMPTS` | no | `3` | Retries before a reminder is marked `failed` |
| `TEST_MONGODB_URI` | no | — | Enables the database-backed test suites |

**Never commit `.env`.** It is git-ignored, and `.env.example` contains only placeholders.

---

## MongoDB setup

**Docker (quickest):**

```bash
docker run -d --name clauseguard-mongo -p 27017:27017 mongo:7
```

Then set:

```
MONGODB_URI=mongodb://127.0.0.1:27017/clauseguard
```

**MongoDB Atlas:** create a cluster, add your IP to the access list, and use the provided SRV string:

```
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/clauseguard?retryWrites=true&w=majority
```

Indexes are created automatically outside production (`autoIndex` is off in production — build them as part of your deploy). The indexes the application relies on:

- `User.email` — unique
- `Contract.ownerId`, `Contract.status`, `(ownerId, createdAt)`, `(ownerId, status)`
- `Obligation.ownerId`, `contractId`, `deadline`, `status`, `(ownerId, status)`, `(ownerId, deadline)`, `(contractId, status)`
- `Reminder.ownerId`, `reminderDate`, `status`, `(status, reminderDate)`, `(ownerId, reminderDate)`
- `Reminder.(obligationId, reminderDate)` — unique, partial on `status: 'scheduled'`, preventing duplicate pending reminders

---

## AI provider setup

Choose `AI_PROVIDER=gemini` and configure `GEMINI_API_KEY`, or choose `AI_PROVIDER=groq` and configure `GROQ_API_KEY`. Set the corresponding model variable if needed.

Provider credentials are read from the environment and are not returned in API responses. The Gemini provider sends its key in the `x-goog-api-key` header; Groq uses a bearer authorization header. Do not expose either key in client-side variables.

**Swapping providers.** All provider-specific code lives in `src/services/ai/`. To add one:

1. Implement the `AiProvider` interface (`provider.interface.ts`) — `name`, `isConfigured()`, `complete()`.
2. Register it in the `createProvider()` switch in `ai.service.ts`.
3. Add its value to the `AI_PROVIDER` enum in `src/config/env.ts`.

No business logic changes, because nothing outside that folder knows which provider is in use.

---

## Running the server

```bash
npm run dev        # watch mode via tsx
npm run build      # compile TypeScript to dist/
npm start          # run the compiled build
npm run typecheck  # type check without emitting
npm run lint       # ESLint
npm run lint:fix   # ESLint with autofix
npm test           # Jest
```

Health check:

```bash
curl http://localhost:4000/api/health
# {"success":true,"message":"ClauseGuard API is running"}

curl http://localhost:4000/api/health/ready
# adds database status, AI configuration state and uptime; 503 when not ready
```

---

## Testing

```bash
npm test
```

The suite is in two halves.

**Always run** — unit tests and API tests that need no database: password hashing, JWT handling, AI output validation, PDF extraction, document storage and path-traversal defence, logger redaction, obligation state machine, request validation, authentication rejection, and file-upload validation.

**Database-backed** — full API flows, the contract pipeline, the obligation review workflow, the reminder scheduler, and cross-user isolation. These run **only** when `TEST_MONGODB_URI` is set:

```bash
TEST_MONGODB_URI=mongodb://127.0.0.1:27017/clauseguard-test npm test
```

Without it they report as **skipped**, not passed. Point it at a **disposable database** — the suite clears collections between tests and drops the database at the end.

Tests should not call a live AI API; AI behavior is tested with provider stubs (including through `setAiProvider()`).

---

## API reference

Base path: `/api`. All responses share one envelope.

**Success**

```json
{ "success": true, "data": { }, "message": "Optional", "pagination": { } }
```

**Error**

```json
{ "success": false, "message": "Human-readable safe message", "code": "MACHINE_READABLE_CODE", "details": [ ] }
```

### Health

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| GET | `/api/health` | — | Liveness probe |
| GET | `/api/health/ready` | — | Readiness: database connection; also reports AI configuration and uptime |

### Authentication

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | — | Create an account; returns a JWT |
| POST | `/api/auth/login` | — | Sign in; returns a JWT |
| GET | `/api/auth/me` | âœ… | Current user |

### Users

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| PATCH | `/api/users/me` | âœ… | Update profile (`name`) |
| POST | `/api/users/me/password` | âœ… | Change password |

### Contracts

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| POST | `/api/contracts/upload` | âœ… | Upload a PDF (`multipart/form-data`, field `file`, optional `title`) |
| GET | `/api/contracts` | âœ… | List; `page`, `limit`, `status`, `search`, `sortBy`, `sortOrder` |
| GET | `/api/contracts/:id` | âœ… | Details plus per-status obligation counts |
| DELETE | `/api/contracts/:id` | âœ… | Delete contract, obligations, reminders and the stored file |

### Obligations

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| GET | `/api/obligations` | âœ… | List; `page`, `limit`, `status`, `contractId`, `dueBefore`, `dueAfter`, `search`, `sortBy`, `sortOrder` |
| GET | `/api/obligations/stats` | âœ… | Per-status counts for the current user |
| GET | `/api/obligations/:id` | âœ… | Details |
| PATCH | `/api/obligations/:id` | âœ… | Confirm, reject, complete, or edit content |
| DELETE | `/api/obligations/:id` | âœ… | Delete the obligation and its reminders |

### Reminders

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| POST | `/api/reminders` | âœ… | Schedule (`obligationId`, `reminderDate`, `channel`, `message`) |
| GET | `/api/reminders` | âœ… | List; `page`, `limit`, `status`, `obligationId`, `sortBy`, `sortOrder` |
| GET | `/api/reminders/:id` | âœ… | Details |
| PATCH | `/api/reminders/:id` | âœ… | Reschedule, edit, cancel or re-arm |
| DELETE | `/api/reminders/:id` | âœ… | Cancel if scheduled; delete otherwise |

### Example

```bash
# Register
curl -X POST http://localhost:4000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Ada","email":"ada@example.com","password":"ValidPass123"}'

# Upload a contract
curl -X POST http://localhost:4000/api/contracts/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F 'title=Services Agreement' \
  -F 'file=@./agreement.pdf'

# Review: confirm an obligation
curl -X PATCH http://localhost:4000/api/obligations/$ID \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"status":"confirmed"}'
```

---

## Authentication flow

1. `POST /api/auth/register` — the password is validated (10+ chars, mixed case, a digit), hashed with bcrypt, and stored as `passwordHash`. The field is `select: false`, so it never appears in a query result unless explicitly requested, and it is stripped from every JSON response.
2. A JWT is signed with `sub` (user id), `email` and issuer `clauseguard`.
3. Clients send `Authorization: Bearer <token>`.
4. `authenticate` verifies the signature, expiry and issuer, then confirms the user still exists — so deleting a user immediately invalidates their outstanding tokens.
5. Every failure mode returns a generic 401 with a distinct machine-readable code (`MISSING_TOKEN`, `INVALID_TOKEN`, `TOKEN_EXPIRED`).

Login responses are deliberately identical for "no such account" and "wrong password", down to the message and code, so the endpoint cannot be used to enumerate registered addresses.

---

## Contract processing flow

```
POST /api/contracts/upload
  â†’ multer buffers the file in memory (never straight to disk)
  â†’ declared MIME type and extension checked
  â†’ %PDF magic bytes verified against the actual content
  â†’ SHA-256 checksum computed
  â†’ file written under UPLOAD_DIR/<ownerId>/<uuid>.pdf, mode 0600
  â†’ Contract created with status "uploaded"
  â†’ 201 returned immediately
  â†’ processing continues off the request cycle
```

Status progression:

| Status | Meaning |
| --- | --- |
| `uploaded` | Stored, queued for processing |
| `processing` | Extracting text |
| `analyzing` | Awaiting the AI provider |
| `review` | Obligations extracted, **awaiting human review** |
| `completed` | Reserved for your own completion semantics |
| `failed` | See `processingError` — `{ stage, code, message, occurredAt }` |

A contract **never** reaches `completed` automatically. The terminal state of automated processing is `review`.

Failures are recorded on the contract with the stage that failed (`extraction`, `analysis`, `persistence`) and a safe error code — never a stack trace or raw contract content.

---

## AI processing flow

```
PDF â†’ text extraction â†’ normalisation â†’ truncation â†’ AI provider
    â†’ raw text â†’ JSON extraction â†’ Zod schema validation
    â†’ potential obligations â†’ human review
```

Guarantees at each step:

- **Extraction** — pdf.js reads pages sequentially and releases each one. Password-protected, corrupt and image-only PDFs each produce a distinct operational error (`PDF_PASSWORD_PROTECTED`, `PDF_EXTRACTION_FAILED`, `PDF_NO_TEXT_LAYER`). OCR is not supported.
- **Normalisation** — rejoins hyphenated line breaks, collapses whitespace, normalises smart quotes and dashes.
- **Truncation** — documents over `AI_MAX_INPUT_CHARS` are cut at a paragraph boundary and flagged `textTruncated`; the prompt tells the model the document was truncated.
- **Validation** — the model's reply is stripped of code fences, JSON-parsed, and run through a Zod schema. Anything that fails is rejected with `AI_INVALID_RESPONSE_SHAPE`. **Unvalidated model output never reaches the database.**
- **Persistence** — every obligation is written with `status: 'potential'` and `aiGenerated: true`.

Distinct error codes let a client respond sensibly: `AI_NOT_CONFIGURED`, `AI_TIMEOUT`, `AI_RATE_LIMITED`, `AI_AUTH_ERROR`, `AI_CONTENT_BLOCKED`, `AI_EMPTY_RESPONSE`, `AI_MALFORMED_RESPONSE`, `AI_INVALID_RESPONSE_SHAPE`, `AI_PROVIDER_ERROR`.

---

## Obligation review workflow

```
        â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
        â”‚  potential  â”‚  â† AI output always lands here
        â””â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”˜
         â”Œâ”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”
         â–¼           â–¼
   â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
   â”‚ confirmed â”‚ â”‚ rejected â”‚
   â””â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
    â”Œâ”€â”€â”€â”€â”´â”€â”€â”€â”€â”
    â–¼         â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚completedâ”‚ â”‚ overdue â”‚  â† set by the scheduler, never by a client
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

Transitions are enforced against an explicit map in `src/config/constants.ts`; an illegal move returns `INVALID_STATUS_TRANSITION`. `overdue` is derived from the deadline and cannot be assigned through the API (`STATUS_NOT_USER_ASSIGNABLE`).

Editing an obligation sets `editedByUser: true` but leaves `sourceClause`, `confidence` and `aiExplanation` untouched, so the original AI suggestion stays auditable next to the human's version.

Rejecting an obligation cancels its pending reminders.

---

## Reminder scheduler

Two cron jobs run in-process, started by `startScheduler()` and completely isolated from HTTP handling.

**Reminder dispatch** (`REMINDER_CRON`, default every minute)

1. Atomically claims a due reminder with a conditional update on `status: 'scheduled'` — two workers racing for the same document cannot both win.
2. Skips delivery if the obligation was deleted, completed or rejected in the meantime, marking the reminder `cancelled`.
3. Delivers through the selected channel: `log` writes a structured reminder event to application logs; `email` looks up the reminder owner's account address and sends through Resend.
4. On success: `sent` with `sentAt`. On failure: back to `scheduled` with the error recorded, or `failed` once `REMINDER_MAX_ATTEMPTS` is exhausted.

A claim older than five minutes is treated as abandoned and retried, so a crash mid-delivery does not strand a reminder. `noOverlap` prevents a slow pass from stacking on itself. Errors are logged explicitly and never swallowed.

**Overdue sweep** (`OVERDUE_CRON`, default hourly) — moves confirmed obligations past their deadline to `overdue`.

Both jobs skip cleanly when the database is disconnected. Set `SCHEDULER_ENABLED=false` to run an API-only instance (useful when scaling horizontally — see [Known limitations](#known-limitations)).

### Timezone strategy

**Everything is UTC.** Dates are stored as UTC, compared as UTC, and cron runs against `SCHEDULER_TIMEZONE` (UTC by default). Rendering into a user's local timezone is a presentation concern for the client.

---

## Architecture

```
Request â†’ Middleware â†’ Route â†’ Controller â†’ Service â†’ Model â†’ MongoDB â†’ Response
```

```
src/
â”œâ”€â”€ config/        env validation, database connection, constants
â”œâ”€â”€ controllers/   thin HTTP adapters — no business logic
â”œâ”€â”€ middleware/    auth, validation, upload, rate limiting, errors, request context
â”œâ”€â”€ models/        Mongoose schemas and indexes
â”œâ”€â”€ routes/        route definitions
â”œâ”€â”€ services/      all business logic
â”‚   â”œâ”€â”€ ai/        provider interface, Gemini and Groq providers, prompt, output schema
â”‚   â”œâ”€â”€ auth       registration, login, current user
â”‚   â”œâ”€â”€ contract   upload, list, details, delete
â”‚   â”œâ”€â”€ document   file storage (swappable for S3)
â”‚   â”œâ”€â”€ pdf        text extraction and normalisation
â”‚   â”œâ”€â”€ obligation review workflow and state machine
â”‚   â”œâ”€â”€ reminder   reminder lifecycle
â”‚   â”œâ”€â”€ notification  delivery channels
â”‚   â””â”€â”€ processing the pipeline orchestrator
â”œâ”€â”€ jobs/          scheduler, reminder dispatch, overdue sweep
â”œâ”€â”€ utils/         JWT, password, responses, errors, logger, dates
â”œâ”€â”€ validators/    Zod request schemas
â”œâ”€â”€ types/         shared types
â”œâ”€â”€ app.ts         Express wiring (no listening — import-safe for tests)
â””â”€â”€ server.ts      startup, scheduler, graceful shutdown
```

Rules the codebase follows: controllers contain no business logic; all business logic is in services; AI code is confined to `services/ai/`; file processing is separate from contract logic; background jobs are isolated from HTTP handling.

`app.ts` deliberately does not connect to the database or listen on a port, so tests can import the app directly.

---

## Security model

- **Ownership scoping** — every contract, obligation and reminder query is filtered by `ownerId` at the service layer. A non-owner receives **404, not 403**, so the API never confirms that someone else's resource exists.
- **Passwords** — bcrypt, cost 12 by default, `select: false`, stripped from all responses. Login timing is evened out for unknown accounts.
- **JWT** — issuer-checked, expiry-checked, user-existence-checked. The secret must be at least 32 characters.
- **Upload validation** — declared MIME type, file extension, real magic bytes, and a size ceiling. Client filenames are sanitised for display only and never influence the storage path; storage keys are UUIDs and are stripped from API responses. Path traversal is blocked twice over.
- **Injection** — Mongoose `sanitizeFilter` strips query operators from request-derived filters; user-supplied search terms are regex-escaped before use.
- **Rate limiting** — three buckets: global, stricter for credential endpoints, and an hourly cap on uploads.
- **Headers and CORS** — Helmet, `x-powered-by` disabled, explicit origin allowlist.
- **Logging** — structured JSON with automatic redaction of passwords, hashes, tokens, API keys, connection strings, and raw contract text and clauses.
- **Errors** — one centralised handler. Stack traces appear in development only; 5xx messages are generic in production.
- **Secrets** — environment only. Nothing is hardcoded and `.env` is git-ignored.

---

## Known limitations

These are deliberate boundaries of this build, not oversights:

1. **Email delivery depends on external configuration.** The default reminder channel is `log`, which writes a structured event to the application log. The `email` channel is implemented through Resend and requires `RESEND_API_KEY`, `EMAIL_FROM`, and a sender domain verified with Resend. Resend test mode may restrict recipients. Real email delivery has not been verified for this repository. Email errors can cause retries and eventually mark a reminder failed.
2. **Processing runs in-process.** Analysis is handed off the request cycle with `setImmediate`, not a durable queue, so work in flight is lost if the process dies mid-analysis. `enqueueContractProcessing()` is the single seam where BullMQ or SQS would go.
3. **The scheduler is in-process.** The atomic claim makes multi-instance operation safe, but each instance runs its own cron. For horizontal scaling, run one instance with `SCHEDULER_ENABLED=true` and the rest with it off.
4. **File storage is local disk.** Fine for one node; multi-node deployments need shared storage. `services/document.service.ts` has a narrow surface (`store`/`read`/`remove`) specifically so it can be replaced with S3.
5. **No OCR.** Scanned or image-only PDFs are rejected with `PDF_NO_TEXT_LAYER` rather than silently producing empty analysis.
6. **Long contracts are truncated**, not chunked, at `AI_MAX_INPUT_CHARS`. The contract is flagged `textTruncated` and the model is told. Chunk-and-merge would be the next step.
7. **No refresh tokens or revocation list.** Access tokens are valid until they expire; deleting the user is the only immediate revocation. Add a token version field or a denylist if you need sign-out-everywhere.
8. **No role system.** Every resource is owned by exactly one user; there is no sharing, no team, no admin.
9. **Rate limiting is in-memory.** Counters are per-process and reset on restart; use a shared store (Redis) behind a load balancer.
10. **Database-backed tests require a MongoDB instance.** Without `TEST_MONGODB_URI` they are skipped, not passed.
11. **Deployment security settings need review.** Production startup requires explicit HTTPS CORS origins. Non-production wildcard mode disables credentialed CORS. The `log` reminder channel records delivery metadata and identifiers without obligation titles or reminder messages.

---

## License

No license is currently included. Do not assume permission to reuse or distribute this project until a license is selected and added.
