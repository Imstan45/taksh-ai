# Database deployment

Apply the migrations exactly in filename order:

1. `202607240001_production_baseline.sql`
2. `202607240002_tenant_security.sql`
3. `202607240003_operational_integrity.sql`
4. `202607240004_secure_aptitude_attempts.sql`
5. `202607240005_institutional_assessments.sql`

With Supabase CLI:

```sh
supabase link --project-ref YOUR_PROJECT_REF
supabase db dump --linked --file supabase/backups/pre-production-foundation.sql
supabase db push --linked --dry-run
supabase db push --linked
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/verify.sql
```

The dump is the rollback artifact. Stop if the dry run reports objects outside these ordered migrations.
