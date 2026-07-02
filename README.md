# Taksh AI

AI-powered placement preparation for engineering students.

## Local setup

1. Use Node.js 22 or newer and pnpm.
2. Copy `.env.example` to `.env` and set PostgreSQL, Auth.js, and Resend values.
3. Run `pnpm install`.
4. Run `pnpm db:migrate` to create the database.
5. Run `pnpm dev`.

Generate `AUTH_SECRET` with `openssl rand -base64 32`. Production deployments must configure `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, `RESEND_API_KEY`, `EMAIL_FROM`, and `NEXT_PUBLIC_APP_URL`.

## Quality checks

`pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`.

## Authentication

Module 1 provides registration, email verification and resend, credentials login, logout, forgot/reset password, JWT sessions, protected routes, role-based access for students/college administrators/super administrators, database-backed throttling, secure one-time hashed tokens, password hashing, audit events, and generic responses that prevent account enumeration.
