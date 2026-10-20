# OfficeFlow project status

**Date:** 2026-10-20<br>
**Scope:** Current implementation status after connecting the finance, reporting, audit, notification, and authentication flows.<br>
**Spec sources:** `docs/SPEC.md` (converted from `docs/OfficeFlow_Project_Task_Documentation_Sudharsanan.pdf`); invoice layout reference `docs/invoice_template.docx`; README; `docs/openapi.yaml`.

## Current implementation

The application now has mounted and authenticated APIs for dashboard, invoices, payments, expenses, reports, audit logs, and notifications. The corresponding frontend screens are connected to those APIs; invoice creation/conversion/edit/email, payment entry, expense entry/edit/receipt download, and report exports/charts are functional. Authentication includes validated login, rate limiting, rotating httpOnly refresh cookies, logout, and expiring hashed password-reset/invitation tokens. Settings updates are validated, administrator permissions are explicit, uploaded receipts are not publicly served, and interactive API docs are available at `/api-docs`. Calendar now supports month/week/day views, timed events, categories, meeting details, and bounded weekly/monthly recurring task creation.

Remaining optional enhancements: calendar recurrence editing currently creates individual dated occurrences, and invitation accept is routed through the password reset form; invoice reminder delivery is in-app/daily rather than real-time/email. The OpenAPI file documents the connected core routes, though some request/response schemas remain summary-level. Password-reset and invoice email require working SMTP. The initial administrator must be explicitly configured or created once through `/api/auth/setup-admin`; there is no shipped default password.

## Historical baseline audit

The detailed module table below records the repository state before this implementation work; “missing” and “broken” descriptions in that table are historical, not current.

**Legend**

| Status | Meaning |
|--------|---------|
| Complete | Core spec behavior exists on both sides and talks to the real API |
| Partial | Some real implementation exists; important spec items missing or stubbed |
| Missing | No usable implementation (or frontend-only empty shell) |

---

## Pre-implementation module status table

| Module | Backend (models / routes / controllers) | Frontend (pages / UI) | Connected to real API? | Status | What exactly is missing or broken |
|--------|-----------------------------------------|------------------------|------------------------|--------|-----------------------------------|
| 1. Dashboard | No dashboard/stats routes. Quotation `GET /api/quotations/stats/summary` exists but is unused here. No aggregates for invoices, payments, expenses, revenue, pending payments, upcoming events, or recent activity. | `frontend/src/pages/Dashboard/Dashboard.jsx` — hardcoded KPI cards (`0` / `₹0`), “Live Mode” badge, placeholder chart copy, empty upcoming-events panel. Quick-action buttons do not navigate. | No | **Missing** | Entire dashboard API; live totals from DB; revenue, outstanding, expenses; upcoming events; recent activity; working quick actions; loading/error states; Recharts. |
| 2. Authentication & Security | Partial. `POST /api/auth/login`, `POST /api/auth/setup-admin`. User model: bcrypt hash, JWT sign/verify, inactive-user block. App-level helmet, CORS, rate limit (500/15 min on `/api`), mongo-sanitize, hpp, cookie-parser. No refresh tokens, no logout route, no forgot/reset routes. Login has no Joi schema. Default admin is seeded on boot (`admin@officeflow.local` / `Admin@123`). | Login talks to `/api/auth/login`. Logout is client-only (clears localStorage). Forgot/reset pages fake success with `setTimeout`. Credentials prefilled on login. JWT in localStorage. | Login/logout UI: login yes, rest no | **Partial** | Access + refresh JWT pair; httpOnly refresh cookies; `POST /auth/logout`; forgot/reset with hashed tokens; invitation/set-password using `invitationToken`; login-specific rate limit; Joi on auth; no default password in UI; 401 interceptor does not redirect to login. |
| 3. User Management | Solid. `User` model; `/api/users` CRUD-ish: create, list, get, update, status, `/me`, password. Validators, RBAC, activity logs. Welcome email + temp password. | `Users.jsx` (admin) and `Profile.jsx` wired to `users.api.js`. Loading/error/empty-ish on users list. | Yes (users + profile) | **Partial** | No invitation accept / first-login password set (token unused). Invite emails only send SMTP in `NODE_ENV=production`. Team members cannot be “deleted” (deactivate only — may be OK). Avatar upload not implemented (avatar is a string). |
| 4. Roles & Permissions | `permissions.js` + `can()` / `requireAdmin`. Roles `admin` \| `team_member`. Profile update strips role. Create forces `team_member` unless admin explicitly sets `admin`. Last-admin protections on demote/deactivate. | Sidebar hides Team Members / Logs / Settings for non-admins. Users page checks `isAdmin`. UI-only hiding; routes like `/users` still exist if URL is typed. | Yes where user APIs exist | **Partial** | `hasPermission` returns **true for every admin action**, even undefined modules. Team members can still open `/invoices`, `/payments`, etc. (empty shells). No frontend route guards by permission. `setup-admin` is public (harmless after seed, risky if seed is disabled). |
| 5. Calendar | `CalendarEvent` + `/api/events` list/create/update/delete + assignees. Date-range query. Joi. Tests exist. Model is a **task** (`title`, `description`, `date`, `assignedTo`, `status` todo/in_progress/done). **No** activityLogger on CUD. | Custom month grid in `Calendar.jsx` (not FullCalendar). CRUD + status toggle + assignees. Loading/error toasts. | Yes (task calendar) | **Partial** | FullCalendar day/week/month; location; meeting link; categories/colors; recurring events; reminders; timed events; multi-assignee; shared views beyond a month grid; activity logs; team_member cannot delete (by design of permissions). |
| 6. Clients | Full CRUD + archive + activity + details with quotations/invoices totals. GSTIN validation, search, pagination. Tests. | List + create/edit modal + details with quotation/invoice tabs. Uses `clients.api.js`. | Yes | **Partial** | Invoice/payment tabs stay empty until invoices exist. Client delete blocked if invoices exist (intended). No dedicated “related invoices” API beyond embedding in details. |
| 7. Quotations | Strong. Numbering `QT/FY/0001`, server totals (CGST/SGST/IGST), drafts, status machine, expiry cron, PDF (PDFKit), email, duplicate, summary, OpenAPI comments + `docs/openapi.yaml`. Tests. | List, form, detail, PDF download, email, status, duplicate. Loading/error/empty. | Yes | **Partial** | Convert accepted quotation → invoice (field `convertedToInvoice` unused). Swagger UI not hosted. Email requires real SMTP (throws if missing). Team members can read **all** quotations, not only their own (ownership only on update/delete). |
| 8. Invoices | **Model only** (`Invoice.js`): number, items, GST fields, paid/balance, statuses. No routes, controllers, services, validators, PDF, email, numbering usage, overdue cron. Item schema lacks SAC / per-line CGST/SGST. | `Invoices.jsx` empty table; Create button dead. | No | **Missing** | Full invoice module: CRUD, convert from accepted quotation, `INV/FY/0001`, server totals, PDF matching invoice template (logo, header, receiver, payment conditions, S.No/Description/SAC/Price/CGST/SGST/Total, subtotal, total, Indian amount in words, thank-you/notes), email, overdue status job. |
| 9. Payments | None (no model/routes). Settings only have a payment number prefix. | `Payments.jsx` empty table; Record button dead. | No | **Missing** | Payment model + API; partial/full; method/date/reference; outstanding; history; auto invoice status Paid / Partially Paid / Unpaid; activity logs. |
| 10. Expenses | None. Upload middleware is **logo-only** (images, 2MB). | `Expenses.jsx` empty table. | No | **Missing** | Expense model/API; categories; receipt upload (type/size); filters; summary; activity logs. |
| 11. Reports | None. | `Reports.jsx` placeholder (“Phase 10”). Export buttons dead. | No | **Missing** | Revenue vs expense, quotation conversion, invoice/payment, outstanding, date filters, PDF/Excel export. `exceljs` and `recharts` not installed. |
| 12. Notifications & Activity Logs | `ActivityLog` model + logger service used by users/clients/quotations/settings/login. `getLogs()` **has no HTTP route**. Cron only expires quotations. No Notification model, no event reminders, no invoice due/overdue alerts. | `ActivityLogs.jsx` empty table, no fetch. Bell in Topbar is decorative (always shows a dot). | No (logs UI); writes happen internally | **Partial** | `GET /api/logs` (admin); frontend list with user/timestamp; notification store + APIs; reminder/due/overdue jobs + in-app (and email) alerts. Calendar CUD does not log. |
| 13. Settings | Singleton `Setting` + GET/PUT, logo upload, GST/defaults/prefixes/terms/bank. Activity log on update. **PUT is not Joi-validated** (`setting.validator.js` unused). | `Settings.jsx` loads/saves via `settings.api.js`. Admin-only in sidebar. Profile/password lives on Profile page. | Yes (company settings) | **Partial** | Wire `setting.validator.js`. Profile/password already elsewhere. No dedicated GST “config” beyond company state + default rate. |

**Cross-cutting (not a numbered module)**

| Area | Backend | Frontend | Connected? | Status | Gaps |
|------|---------|----------|------------|--------|------|
| Swagger / OpenAPI | YAML + JSDoc on quotation routes only. No `swagger-ui-express` / `swagger-jsdoc`. | n/a | n/a | **Partial** | Interactive `/api/docs`; document auth, users, clients, events, settings, and future modules. |
| Tests | Jest + Supertest: health, db, counter, users, clients, quotations, calendar, settings, pricing, amountInWords. No auth, invoice, payment, expense, reports, logs tests. No frontend tests. | No test script. | n/a | **Partial** | Auth/security tests; remaining modules; ESLint; frontend tests. |
| README / env / Git | README exists; `.env` gitignored; `.env.example` present. | `.env.example` has `VITE_API_URL`. | n/a | **Partial** | README lists FullCalendar, Recharts, ExcelJS, pdfkit-table as if installed. Spec PDF missing. Many uncommitted files; Git history is not a finished, clean module-by-module record. |

---

## (a) Bugs or errors found (from code review)

1. **Default admin auto-seed** (`server.js` → `ensureDefaultAdmin`) creates `admin@officeflow.local` / `Admin@123` on every empty DB. Login page prints those credentials.
2. **Server start depends on MongoDB.** If `connectDB()` fails in development it returns `null`, then `ensureDefaultAdmin()` still runs and will throw (`User.findOne` with no connection).
3. **CORS** always allows `http://localhost:5173` in addition to `FRONTEND_URL`, including production.
4. **JWT secret fallback** `dev_secret_officeflow` if `JWT_SECRET` is unset (`auth.middleware.js`).
5. **Auth login** has no Joi validation; `setup-admin` is unauthenticated and weakly validated.
6. **Forgot/reset password** UI claims success without hitting the API. User fields `resetPasswordToken` / `invitationToken` are never consumed.
7. **Welcome mail** logs set-password URL (and uses a temp password) in non-production; invitation flow is incomplete because reset page ignores `?token=`.
8. **Settings PUT** skips Joi (`setting.validator.js` unused); nested JSON is `JSON.parse`’d from multipart strings.
9. **Calendar CUD** does not call `activityLogger` (project rule: every create/update/delete must).
10. **Duplicate PDF generators:** `quotationPdf.js` is used by quotations; `pdf.service.js` is a second, unused quotation/invoice sketch.
11. **Invoice model vs quotation items** will not map cleanly (no SAC, no per-line tax, `clientId` vs quotation `client`).
12. **Dashboard / invoices / payments / expenses / reports / logs** buttons do nothing; empty `data={[]}` with `isLoading={false}` (empty state only, never loading/error from API).
13. **Axios 401** clears storage but does not navigate to `/login`; user can sit on a broken protected page.
14. **Quotation PDF download** uses `responseType: 'blob'` through an interceptor that assumes JSON envelopes; error blobs may surface as opaque failures.
15. **Admin permission wildcard** ignores the permissions matrix (`if (role === 'admin') return true`).
16. **Topbar search** is non-functional; notification bell always shows unread.
17. **Health check** reports `success: true` even when `database.status === 'disconnected'`.
18. **Frontend `package.json` has no `lint` script**; backend has no ESLint at all.

---

## (b) Security gaps against the spec

| Spec item | Current state |
|-----------|----------------|
| bcrypt passwords | Present (`bcryptjs`, `select: false`, pre-save hash). |
| JWT access + refresh | Access token only (`JWT_EXPIRES_IN` default `7d`). No refresh token, no rotation, no blacklist. |
| Protected routes | Backend: `verifyToken` + `can()` on implemented modules. Frontend: token check only (`ProtectedLayout`); no role-based route protection. |
| Forgot / reset password | Not implemented (UI mock). |
| Rate limiting | Global 500 req / 15 min on `/api`. No stricter login limiter. |
| Helmet | Enabled with defaults. |
| CORS | Restricted-ish, but localhost is always allowed. |
| NoSQL injection | `express-mongo-sanitize` + Joi on most write routes. Auth login unsanitized beyond Mongoose. |
| Never expose stack traces / tokens / hashes | Error handler omits stack in JSON. Mailer may log invite URLs. Login response does not include password (toJSON strip). |
| Permissions on backend | Yes for users/clients/quotations/events/settings. No APIs yet for invoices/payments/expenses/reports/logs. |
| Privilege escalation | Profile cannot set role. Admin can create another admin. Public `setup-admin` if no admin exists. Seeded known password. |
| Secrets | `.env` gitignored. `.env.example` uses placeholder JWT/SMTP. Fallback JWT secret in code. |
| Uploads | Logo only; random filenames; MIME+ext check; 2MB. `/uploads` is statically served (OK for logos; unsafe if receipts are added without auth). |

---

## (c) Hardcoded or mock data

- Dashboard KPI values `'0'` / `'₹0'` and “charts will render when connected” copy.
- Invoices, Payments, Expenses, Activity Logs: always `data={[]}`.
- Reports: static “Analytics Engine Ready / Phase 10” copy; export buttons no-ops.
- Forgot/Reset: `setTimeout` + toast “Phase 2 feature”.
- Login defaults: `admin@officeflow.local` / `Admin@123` plus on-screen hint.
- `AuthContext` / `App.jsx` still special-case `mock_dev_token`.
- Mailer: console `[Mailer Mock]` unless SMTP is configured **and** `NODE_ENV=production`.
- Setting model defaults: sample company name, email, phone, Tamil Nadu, payment/quotation boilerplate.
- Topbar bell always shows a notification dot.
- OpenAPI/README describe ExcelJS, FullCalendar, Recharts as if present.

Not counted as mock: Input `placeholder=` attributes; Jest `mockRejectedValueOnce` in tests.

---

## (d) Missing dependencies and env variables

**README / spec vs `package.json`**

| Claimed | Installed? |
|---------|------------|
| FullCalendar (+ plugins) | **No** (frontend) |
| Recharts | **No** |
| ExcelJS | **No** (backend) |
| swagger-ui-express / swagger-jsdoc | **No** |
| pdfkit-table | **No** (README lists it; quotations use PDFKit directly) |
| ESLint / frontend test runner | **No** |
| PDFKit, Nodemailer, Jest, Supertest, Joi, Helmet, etc. | Yes (backend) |

**`backend/.env.example` has:** `NODE_ENV`, `PORT`, `FRONTEND_URL`, `MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`.

**Missing from example (used or needed):**

- `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRES_IN`
- `MONGO_URI_TEST` (tests already read it)
- Cookie / CSRF settings if refresh cookies are added
- Optional `JWT_SECRET` length guidance (example is a placeholder)

**`frontend/.env.example`:** `VITE_API_URL` only — sufficient for current app.

---

## (e) Will the app start? (code review, not executed in this step)

**Likely yes, if MongoDB is running and env files exist.**

- Backend entry: `backend/server.js` loads dotenv, connects Mongo, seeds admin, starts cron, listens on `PORT` (default 5000).
- Frontend: Vite SPA (`frontend/vite.config.js`); no compile-time dependency on missing FullCalendar packages because they are unused.
- Failure modes: Mongo down → `ensureDefaultAdmin` throws, process may not listen. Missing `backend/.env` → mongoose fallbacks to `localhost:27017/officeflow` still attempted. SMTP missing does **not** block boot (mailer stays mock except quotation send, which fails at request time).

**Commands to run (do this on your machine):**

```bash
# 1. MongoDB must be running (local :27017 or Atlas URI)

# 2. Backend
cd backend
cp .env.example .env    # PowerShell: Copy-Item .env.example .env
npm install
npm run dev             # http://localhost:5000  health: GET /api/health
npm test                # Jest (needs Mongo; uses MONGO_URI_TEST or officeflow_test)

# 3. Frontend (second terminal)
cd frontend
cp .env.example .env
npm install
npm run dev             # http://localhost:5173
```

Sign in with `admin@officeflow.local` / `Admin@123` after first backend start. There is **no** `npm run lint` in either package.

This audit did **not** start the servers or run tests; the statements above are from reading `package.json`, `server.js`, `app.js`, and Vite config.

---

## Historical recommended build order (baseline audit)

| Order | Item | Size | Why first |
|-------|------|------|-----------|
| 1 | Auth completion: refresh JWT, logout, forgot/reset (use existing User token fields), login Joi + tighter rate limit, stop shipping default password in the UI, 401 redirect | **Medium** | Everything else sits behind a real session. Spec security is incomplete. |
| 2 | Activity logs API + Logs page (reuse `ActivityLoggerService.getLogs`) | **Small** | Logger already writes; UI is an empty table. Unlocks audit for later modules. |
| 3 | Calendar: call `activityLogger` on CUD; keep current API | **Small** | Rule gap, tiny change. |
| 4 | Settings: attach existing Joi validator | **Small** | File already written, unused. |
| 5 | Dashboard API + wire Dashboard.jsx (clients/quotations counts, later invoices) | **Medium** | Visible “empty product” today; can grow as finance modules land. |
| 6 | Invoices (model upgrade + routes/services/PDF/email + convert from accepted quotation) | **Large** | Blocks payments, reports, client financials, dashboard revenue. |
| 7 | Payments (partial/full, outstanding, invoice status) | **Medium** | Natural follow-on to invoices. |
| 8 | Expenses + receipt upload (separate multer, not logo) | **Medium** | Needed for reports revenue vs expense. |
| 9 | Notifications + cron (event reminders, invoice due/overdue) | **Medium** | Depends on calendar + invoices. |
| 10 | FullCalendar upgrade (day/week/month, location, link, colors, recurrence, reminders) | **Large** | Current month-task UI is usable; spec calendar is a rewrite, not a blocker for billing. |
| 11 | Reports (aggregations + Recharts + ExcelJS/PDF export) | **Large** | Needs invoices, payments, expenses in DB. |
| 12 | Swagger UI for all routes; expand `docs/openapi.yaml` | **Medium** | Can be updated after each module; do a pass when invoices exist. |
| 13 | Tests for auth + new modules; add ESLint; frontend tests; commit hygiene | **Medium** | Continuous, not a single dump at the end. |
| 14 | Restore spec PDF / invoice DOCX into `docs/` if they exist locally | **Small** | Audit could not open them; invoice PDF should match the template. |

**Do not rewrite working clients, users, quotations, or settings UIs.** Extend them (e.g. “Create invoice from quotation” on quotation detail).

---

## How to use this document

Use the current implementation summary at the top for project status. The module gap table and recommended order above are preserved as the historical pre-implementation audit.
