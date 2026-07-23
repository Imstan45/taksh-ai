# Taksh Content Factory

The production-ready Content Factory application for Taksh AI. It generates
curriculum content with Gemini, supports ordered curriculum batches, and stores
draft, reviewed, approved, and published assets in Supabase.

## Git deployment

Create a separate Vercel project from the `Imstan45/taksh-ai` repository and set
its Root Directory to:

```text
content factory
```

The included `vercel.json` builds this folder as a standalone Next.js app.

Configure these environment variables in the deployment:

```text
GEMINI_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

After Vercel assigns the deployment URL, add it to the main Taksh AI project:

```text
NEXT_PUBLIC_CONTENT_FACTORY_URL=https://your-content-factory.vercel.app
```

## Local development

```bash
pnpm install
pnpm dev
```
