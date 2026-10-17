# OfficeFlow — Centralized Office Management System

OfficeFlow is a centralized full-stack MERN web application engineered to manage daily business operations: team schedules, client directory, quotation generation, automated invoicing, payment tracking, expense management with receipts, activity auditing, and financial analytics.

---

## 1. Project Overview & Objectives

- **Centralized Operations**: Manage daily business workflows, schedules, quotations, invoices, and expenses in one secure platform.
- **Role-Based Access Control**: Strict backend-enforced authorization differentiating Administrator and Team Member capabilities.
- **Financial Integrity**: Server-computed totals, discounts, GST (18%), and balance tracking with zero client-side trust.
- **Document Generation**: Automated PDF generation for quotations and invoices using PDFKit, and spreadsheet exports via ExcelJS.
- **Auditability**: Complete activity logging capturing actor, action, target entity, timestamp, and metadata.

---

## 2. Technology Stack

### Backend
- **Runtime**: Node.js (v18+)
- **Framework**: Express.js 4
- **Database**: MongoDB + Mongoose 8
- **Authentication**: JWT (`jsonwebtoken`) + `bcryptjs`
- **Security Middleware**: `helmet`, `cors`, `express-rate-limit`, `express-mongo-sanitize`, `hpp`, `cookie-parser`
- **Validation**: Server-side request validation (`joi`)
- **Document & PDF**: `pdfkit`, `pdfkit-table`
- **Spreadsheets**: `exceljs`
- **Emails**: `nodemailer`
- **Testing**: `jest`, `supertest`

### Frontend
- **Framework**: React 18 (Vite SPA)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Routing**: React Router DOM (v6)
- **HTTP Client**: Axios with centralized request/response interceptors
- **Calendar**: FullCalendar (DayGrid, TimeGrid, Interaction)
- **Charts**: Recharts

---

## 3. Architecture & Folder Structure

```
d:/ofice/
├── docs/
│   └── OfficeFlow_Project_Task_Documentation_Sudharsanan.pdf
├── backend/
│   ├── .env.example
│   ├── .env
│   ├── server.js
│   ├── package.json
│   ├── uploads/
│   └── src/
│       ├── config/        # Database and service configs
│       ├── models/        # Mongoose data models
│       ├── controllers/   # HTTP request handlers
│       ├── services/      # Business logic & calculations
│       ├── routes/        # Express API endpoints
│       ├── middleware/    # Auth, RBAC, error handlers
│       ├── validators/    # Joi validation schemas
│       ├── utils/         # apiResponse, logger, helpers
│       └── tests/         # Jest & Supertest test suites
└── frontend/
    ├── .env.example
    ├── .env
    ├── index.html
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    └── src/
        ├── api/           # Axios instance & endpoints
        ├── components/    # Reusable UI controls (Button, Modal, Table, etc.)
        ├── context/       # Auth & Toast state providers
        ├── pages/         # Screen views (Dashboard, Invoices, etc.)
        └── utils/         # Formatters and client helpers
```

---

## 4. Prerequisites

- **Node.js**: `v18.0.0` or later (tested on `v22.12.0`)
- **npm**: `v9.0.0` or later
- **MongoDB**: Local Community Server (`v6.x` / `v8.x`) running on port `27017` or MongoDB Atlas URI

---

## 5. Installation & Setup

### Step 1: Clone Repository
```bash
git clone <repository-url>
cd ofice
```

### Step 2: Configure Environment Variables

#### Backend
```bash
cd backend
cp .env.example .env
```
Ensure `MONGO_URI` points to your running MongoDB instance:
```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
MONGO_URI=mongodb://localhost:27017/officeflow
JWT_SECRET=your_jwt_secret_key_min_32_characters_placeholder
JWT_EXPIRES_IN=7d
```

#### Frontend
```bash
cd ../frontend
cp .env.example .env
```
Default configuration:
```env
VITE_API_URL=http://localhost:5000/api
```

### Step 3: Install Dependencies
```bash
# Backend dependencies
cd backend
npm install

# Frontend dependencies
cd ../frontend
npm install
```

---

## 6. Running the Applications

### Start Backend Development Server
```bash
cd backend
npm run dev
```
Backend runs at: `http://localhost:5000`  
Health check endpoint: `http://localhost:5000/api/health`

### Start Frontend Development Server
```bash
cd frontend
npm run dev
```
Frontend runs at: `http://localhost:5173`

---

## 7. Running Backend Tests

```bash
cd backend
npm test
```
Executes Jest test suites verifying health routes, 404 handler, error formatting, and Indian Financial Year sequential number generation.

---

## 8. Commit Conventions

All commits follow the Conventional Commits specification:
- `feat:` New user-facing feature or API endpoint
- `fix:` Bug fix
- `docs:` Documentation updates
- `chore:` Tooling, dependencies, scaffolding, build configurations
- `refactor:` Code restructuring without behavioral changes
