# Taksh AI

AI-powered placement preparation for engineering students.

## Local setup

1. Use Node.js 22 or newer and pnpm.
2. Copy `.env.example` to `.env` and set the Supabase PostgreSQL/API, Auth.js, and Vercel Blob values.
3. Run `pnpm install`.
4. Run `pnpm db:pull` when the existing Supabase schema changes.
5. Run `pnpm dev`.

Generate `AUTH_SECRET` with `openssl rand -base64 32`. Production deployments must configure `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, `RESEND_API_KEY`, `EMAIL_FROM`, and `NEXT_PUBLIC_APP_URL`.

## Quality checks

`pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`.

## Authentication

Module 1 uses the existing Supabase Auth project for registration, email verification and resend, credentials login, logout, forgot/reset password, then issues protected app sessions with role-based access for students, college administrators, and super administrators.

## Student profile

Module 2 reuses the existing `students` and `student_profiles` tables for personal and education details, skills and programming languages, career targets, placement status, achievements, certificates, projects, completion scoring, and private PDF resume uploads through Vercel Blob.
