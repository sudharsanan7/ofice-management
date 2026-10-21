# OfficeFlow — Centralized Office Management System

OfficeFlow is a centralized full-stack MERN web application engineered to manage daily business operations: team schedules, client directory, quotation generation, automated invoicing, payment tracking, expense management with receipts, activity auditing, and financial analytics.

---

## 1. Project Overview & Objectives

- **Centralized Operations**: Manage daily business workflows, schedules, quotations, invoices, payments, and expenses in one secure platform.
- **Role-Based Access Control (RBAC)**: Strict backend-enforced authorization differentiating Administrator and Team Member capabilities.
- **Financial Integrity**: Server-computed subtotals, discounts, GST (CGST/SGST intrastate or IGST interstate), and balance tracking with zero client-side trust.
- **Quotation & Invoice Management**: Financial-year sequential numbering (`QT/FY/0001`, `INV/FY/0001`, `PAY/FY/0001`), server-side tax/discount calculation, draft ownership, status history, expiry/overdue automation, downloadable PDFs, and email delivery.
- **Document & Report Generation**: Automated PDF generation for quotations, invoices, and reports using PDFKit, and multi-sheet spreadsheet exports via ExcelJS.
- **Auditability**: Complete activity logging capturing actor, action, target entity, timestamp, IP address, and metadata.

---

## 2. Features & Module Descriptions

| Module | Description |
|--------|-------------|
| **Module 1: Dashboard** | Live KPI cards (total clients, active quotations, total invoices, revenue collected, pending payments, recorded expenses), upcoming calendar events, recent activity feed, and quick actions. |
| **Module 2: Authentication & Security** | Role-aware login (`admin` / `team_member`), bcrypt password hashing, short-lived JWT access tokens + rotating `httpOnly` refresh cookies, logout, forgot/reset password with hashed one-time tokens, and strict input validation. |
| **Module 3: User Management** | Admin creation of team members with invitation setup emails, search/role/status filtering, profile editing, activation/deactivation, and self-service profile & password updates. |
| **Module 4: Role & Permission Management** | Central permissions matrix (`src/config/permissions.js`) enforced on every API route via `verifyToken` and `can(module, action)` middleware, plus last-admin demotion/deactivation guards. |
| **Module 5: Common Calendar** | Month, week, and day views; create, view, edit, status-toggle, and delete events with start/end times, location, online meeting URL, color-coded categories, team member assignment, and weekly/monthly recurrence. |
| **Module 6: Client Management** | Full CRUD and archive/restore for clients, 15-character GSTIN validation with state code extraction, linked quotations/invoices tabs, financial summary cards, and client activity trail. |
| **Module 7: Quotation Management** | Create/edit/duplicate quotations, multi-item SAC/discount/GST calculations, validity dates, terms & conditions, status workflow (`draft`, `sent`, `accepted`, `rejected`, `expired`), PDF download, email dispatch, and one-click conversion to invoice. |
| **Module 8: Invoice Management** | Create invoices manually or convert accepted quotations, edit unpaid invoices, view line items and status history (`unpaid`, `partially_paid`, `paid`, `overdue`), download template-matched PDFs, and email invoices to clients. |
| **Module 9: Payment Management** | Record partial or full payments with payment method, date, and reference number; prevent overpayments; automatically recalculate invoice `amountPaid`, `balanceDue`, and status. |
| **Module 10: Expense Management** | Record categorized expenses with date and amount, upload private supporting receipts (PDF/PNG/JPG/WebP up to 5MB served only via authenticated route), filter by category/date/search, and view totals. |
| **Module 11: Reports & Analytics** | Date-range filtered financial summaries (revenue, expenses, net), monthly revenue vs. expense bar chart (Recharts), quotation conversion metrics, invoices by status, payments by method, outstanding balances, and PDF/Excel exports. |
| **Module 12: Notifications & Activity Logs** | In-app notification center for upcoming events and due/overdue invoices (generated via nightly cron jobs) and an Admin-only system activity audit log table. |
| **Module 13: System Settings** | Configure company legal name, CIN, GSTIN, registered state (for intra/inter-state GST), logo upload, numbering prefixes, default validity/due days, standard terms, and bank/UPI remittance details. |

---

## 3. Technology Stack

### Backend
- **Runtime**: Node.js (`v18+`)
- **Framework**: Express.js 4
- **Database**: MongoDB + Mongoose 8
- **Authentication**: JWT (`jsonwebtoken`) + `bcryptjs` + `cookie-parser`
- **Security Middleware**: `helmet`, `cors`, `express-rate-limit`, `express-mongo-sanitize`, `hpp`
- **Validation**: Server-side request validation (`joi`)
- **Document & PDF**: `pdfkit`
- **Spreadsheets**: `exceljs`
- **Scheduled Jobs**: `node-cron`
- **Emails**: `nodemailer`
- **API Docs**: `swagger-ui-express`, `swagger-jsdoc`
- **Testing**: `jest`, `supertest`

### Frontend
- **Framework**: React 18 (Vite SPA)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Routing**: React Router DOM (v6)
- **HTTP Client**: Axios with centralized request/response interceptors and automatic token refresh
- **Calendar**: Custom Month/Week/Day calendar & FullCalendar packages
- **Charts**: Recharts

---

## 4. System Architecture & Folder Structure

```
d:/ofice/
├── docs/
│   ├── OfficeFlow_Project_Task_Documentation_Sudharsanan.pdf
│   ├── SPEC.md
│   ├── PROJECT_STATUS.md
│   ├── invoice_template.docx
│   └── openapi.yaml
├── backend/
│   ├── .env.example
│   ├── server.js
│   ├── package.json
│   ├── uploads/           # Company logos (public) & expense receipts (private)
│   └── src/
│       ├── app.js         # Express app & middleware pipeline
│       ├── config/        # Database, cron jobs, and RBAC permissions matrix
│       ├── models/        # Mongoose schemas (User, Client, Quotation, Invoice, Payment, Expense, etc.)
│       ├── controllers/   # HTTP request handlers
│       ├── services/      # Business logic, GST pricing, PDF & Excel generators, mailer
│       ├── routes/        # Express API routes
│       ├── middleware/    # Auth, RBAC, Multer upload, Joi validation, error handler
│       ├── validators/    # Joi validation schemas
│       ├── utils/         # apiResponse, asyncHandler, amountInWords, errors
│       └── tests/         # Jest & Supertest integration/unit test suites
└── frontend/
    ├── .env.example
    ├── index.html
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    └── src/
        ├── api/           # Axios client & module API wrappers
        ├── components/    # Reusable UI controls (Button, Modal, Table, Badge, Input, etc.)
        ├── context/       # AuthContext & ToastContext providers
        ├── pages/         # Screen views for all 13 modules
        └── utils/         # Currency and date formatters
```

### Database Schema Overview
- **`User`**: `name`, `email` (unique), `password` (bcrypt), `phone`, `designation`, `role` (`admin` | `team_member`), `status` (`active` | `inactive`), `refreshTokenHash`, `resetPasswordToken`, `resetPasswordExpires`.
- **`Client`**: `companyName`, `contactPerson`, `email`, `phone`, `cin`, `gstin`, `stateCode`, `billingAddress`, `notes`, `status` (`active` | `archived`), `createdBy`.
- **`Quotation`**: `quotationNumber` (unique), `client`, `issueDate`, `validUntil`, `items[]` (description, sacCode, quantity, unitPrice, discount, gstRate, cgst, sgst, igst, lineTotal), `taxType` (`intra` | `inter`), `subtotal`, `totalDiscount`, `cgstTotal`, `sgstTotal`, `igstTotal`, `grandTotal`, `status`, `statusHistory[]`, `convertedToInvoice`.
- **`Invoice`**: `invoiceNumber` (unique), `quotationId`, `clientId`, `issueDate`, `dueDate`, `items[]`, `taxType`, `subtotal`, `totalDiscount`, `gstAmount`, `grandTotal`, `amountPaid`, `balanceDue`, `status` (`unpaid` | `partially_paid` | `paid` | `overdue`), `statusHistory[]`.
- **`Payment`**: `paymentNumber` (unique), `invoice`, `client`, `amount`, `method` (`upi`, `bank_transfer`, `cheque`, `cash`, `card`, `other`), `paymentDate`, `referenceNumber`, `createdBy`.
- **`Expense`**: `category`, `description`, `amount`, `expenseDate`, `receiptPath`, `receiptOriginalName`, `createdBy`.
- **`CalendarEvent`**: `title`, `description`, `date`, `startTime`, `endTime`, `location`, `meetingUrl`, `category`, `seriesId`, `assignedTo`, `status` (`todo` | `in_progress` | `done`).
- **`Notification`**: `user`, `type`, `title`, `message`, `entity`, `entityId`, `read`.
- **`ActivityLog`**: `user`, `action`, `entity`, `entityId`, `meta`, `ipAddress`, `timestamp`.
- **`Setting`** & **`Counter`**: Singleton company configuration and atomic financial-year sequence counters.

---

## 5. Prerequisites & Installation

- **Node.js**: `v18.0.0` or later (tested on `v22.x`)
- **npm**: `v9.0.0` or later
- **MongoDB**: Local Community Server (`v6.x` / `v8.x`) on `mongodb://localhost:27017` or a MongoDB Atlas cluster URI.

```bash
# 1. Clone the repository
git clone <repository-url>
cd ofice

# 2. Install Backend dependencies
cd backend
npm install

# 3. Install Frontend dependencies
cd ../frontend
npm install
```

---

## 6. Environment Variable Configuration (`.env`)

Copy `.env.example` to `.env` in both `backend/` and `frontend/`. Never commit `.env` files to Git.

### Backend (`backend/.env`)
```bash
cd backend
cp .env.example .env
```

| Variable | Required | Description / Example |
|----------|----------|-----------------------|
| `NODE_ENV` | Yes | `development` or `production` |
| `PORT` | Yes | Backend HTTP port (default: `5000`) |
| `FRONTEND_URL` | Yes | Allowed CORS origin & email link base URL (e.g. `http://localhost:5173` or `https://your-domain.com`) |
| `MONGO_URI` | Yes | MongoDB connection string (e.g. `mongodb://localhost:27017/officeflow` or MongoDB Atlas `mongodb+srv://...`) |
| `JWT_SECRET` | Yes | Access token signing secret (**must be 32+ random characters in production**) |
| `JWT_EXPIRES_IN` | Yes | Access token TTL (default: `15m`) |
| `JWT_REFRESH_SECRET` | Yes | Refresh token signing secret (**must be 32+ random characters in production**) |
| `JWT_REFRESH_EXPIRES_IN` | Yes | Refresh token TTL (default: `7d`) |
| `ADMIN_NAME` | Optional | Initial admin display name seeded on first startup |
| `ADMIN_EMAIL` | Optional | Initial admin email seeded on first startup |
| `ADMIN_PASSWORD` | Optional | Initial admin password (min 8 chars). If omitted, use `POST /api/auth/setup-admin` once |
| `MONGO_URI_TEST` | Optional | Separate database URI used by `npm test` (default: `mongodb://localhost:27017/officeflow_test`) |
| `SMTP_HOST` | For Email | SMTP server hostname (e.g. `smtp.gmail.com`, `smtp.sendgrid.net`, `smtp.mailtrap.io`) |
| `SMTP_PORT` | For Email | SMTP port (`587` for TLS or `465` for SSL) |
| `SMTP_USER` | For Email | SMTP username / email address |
| `SMTP_PASS` | For Email | SMTP password or App Password |
| `SMTP_FROM` | For Email | Sender address (e.g. `noreply@yourdomain.com`) |

### Frontend (`frontend/.env`)
```bash
cd frontend
cp .env.example .env
```

| Variable | Required | Description / Example |
|----------|----------|-----------------------|
| `VITE_API_URL` | Yes | Backend API base URL (e.g. `http://localhost:5000/api` locally, or `https://api.yourdomain.com/api` in production) |

---

## 7. MongoDB Setup Instructions

- **Local MongoDB**: Ensure the `MongoDB` Windows service or `mongod` daemon is running on port `27017`. Mongoose will automatically create the `officeflow` database and indexes on startup.
- **MongoDB Atlas (Cloud / Production)**:
  1. Create a cluster on [MongoDB Atlas](https://www.mongodb.com/atlas).
  2. Create a database user and whitelist your server IP (or `0.0.0.0/0` for cloud hosts like Render/Railway).
  3. Set `MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/officeflow?retryWrites=true&w=majority` in `backend/.env`.

---

## 8. Frontend & Backend Startup Commands

### Start Backend
```bash
cd backend
npm run dev     # Development with nodemon on http://localhost:5000
npm start       # Production start (node server.js)
```
- Health check: `GET http://localhost:5000/api/health`

### Start Frontend
```bash
cd frontend
npm run dev     # Vite dev server on http://localhost:5173
npm run build   # Production bundle into frontend/dist/
npm run preview # Preview production build locally
```

---

## 9. Authentication & Role Permission Explanation

- **Authentication**: Users sign in at `/api/auth/login` and receive a short-lived JWT access token (`15m`) plus an `httpOnly` rotating refresh token cookie (`7d`, scoped to `/api/auth`). When an access token expires, the frontend Axios interceptor transparently refreshes it via `POST /api/auth/refresh`.
- **Administrator (`admin`)**: Full access to all modules, including Team Member Management (`/users`), System Settings (`/settings`), Activity Audit Logs (`/logs`), client deletion, invoice editing/deletion, payment deletion, and expense deletion.
- **Team Member (`team_member`)**: Can access Dashboard, Calendar (create/update tasks), Clients (create/view/edit), Quotations (create/view/send, plus edit/delete own drafts), Invoices (create/convert/view/download/send), Payments (record/view), Expenses (create/view/edit own), Reports (view/export), and own Profile/Password. Cannot create admin accounts, elevate roles, delete financial records, or view system audit logs.

---

## 10. API Endpoint Documentation & Swagger Setup

- OpenAPI 3.0 specification: [`docs/openapi.yaml`](docs/openapi.yaml)
- Interactive Swagger UI (when backend is running): **`http://localhost:5000/api-docs`**

---

## 11. Testing Instructions

```bash
cd backend
npm test
```
Runs 13 Jest + Supertest test suites (91 tests) covering authentication, token rotation, RBAC permissions, user management, client CRUD/archiving, quotation lifecycle & PDF generation, invoice creation/conversion/email/edit guards, partial/full payments & overpayment rejection, private receipt uploads, calendar events & recurrence, settings validation, Indian currency words, and health checks.

---

## 12. Known Limitations & Future Enhancements

- **Email Delivery**: Quotation, invoice, and password-reset emails require valid SMTP credentials (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`). In development without SMTP configured, welcome emails log the setup link to the server console.
- **Local File Storage**: Uploaded company logos and expense receipts are stored on disk under `backend/uploads/`. For multi-instance or ephemeral cloud containers, migrating uploads to S3/Cloudinary or mounting a persistent disk is recommended.
- **Recurring Calendar Series**: Recurring tasks expand into bounded individual documents (up to 52 occurrences) so each occurrence can be tracked and completed independently.

---

## 13. Deployment / Hosting Instructions

1. **Database**: Provision a MongoDB Atlas cluster and copy the `mongodb+srv://...` connection string.
2. **Backend Hosting (Render / Railway / VPS)**:
   - Set Root Directory to `backend`, Build Command to `npm install`, and Start Command to `npm start`.
   - Set `NODE_ENV=production` and configure all required environment variables from Section 6 (`MONGO_URI`, `FRONTEND_URL`, 32+ char `JWT_SECRET` and `JWT_REFRESH_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `SMTP_*`).
   - Attach a persistent disk to `/backend/uploads` if you want uploaded logos and receipts to persist across container redeploys.
3. **Frontend Hosting (Vercel / Netlify / Cloudflare Pages / Static Host)**:
   - Set Root Directory to `frontend`, Build Command to `npm run build`, and Output Directory to `dist`.
   - Set `VITE_API_URL=https://<your-backend-domain>/api`.
   - Configure SPA fallback routing so all routes (`/*`) rewrite to `/index.html`.
