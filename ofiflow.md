---
description: OfficeFlow project rules
alwaysApply: true
---
OfficeFlow = MERN office management system (JavaScript only). Spec: docs/OfficeFlow_Project_Task_Documentation_Sudharsanan.pdf
Stack: React(Vite)+Tailwind, Node+Express 4, MongoDB+Mongoose, JWT+bcrypt, FullCalendar, Recharts, PDFKit, Swagger, Nodemailer, ExcelJS, Jest+Supertest.
Structure: /backend (config, models, routes, controllers, services, middleware, validators, utils, tests) and /frontend (api, components, pages, hooks, context, utils).
Rules:
- Routes → controllers → services. Permissions enforced on the BACKEND.
- Validate and sanitize all input on the server. Never commit .env; keep .env.example updated.
- Never expose stack traces, tokens or password hashes.
- Response format: { success, message, data, errors? } with correct status codes.
- Totals are always calculated on the server. No mock data in final code.
- Every create/update/delete calls activityLogger.
- Reuse existing code and match existing conventions. Don't rewrite working code.
- Show loading, empty and error states in every screen.
- After each task: run lint/tests and summarize files changed and how to test.
