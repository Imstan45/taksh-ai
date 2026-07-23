begin;

-- Older Taksh deployments may already contain tables with fewer columns.
-- Add canonical columns before the production baseline creates indexes/policies.
-- Function return types cannot be changed with CREATE OR REPLACE. Remove legacy
-- authorization helpers and dependent legacy policies; migrations 001 and 002
-- recreate the canonical functions and complete RLS policy set.
drop function if exists public.current_user_role() cascade;
drop function if exists public.current_institution_id() cascade;
drop function if exists public.is_super_admin() cascade;
drop function if exists public.verify_taksh_schema() cascade;

do $$
begin
  if to_regclass('public.audit_logs') is not null then
    alter table public.audit_logs add column if not exists actor_id uuid references auth.users(id) on delete set null;
    alter table public.audit_logs add column if not exists institution_id uuid;
    alter table public.audit_logs add column if not exists action text not null default 'legacy.event';
    alter table public.audit_logs add column if not exists target_type text not null default 'legacy';
    alter table public.audit_logs add column if not exists target_id text not null default 'unknown';
    alter table public.audit_logs add column if not exists previous_values jsonb;
    alter table public.audit_logs add column if not exists new_values jsonb;
    alter table public.audit_logs add column if not exists metadata jsonb not null default '{}'::jsonb;
    alter table public.audit_logs add column if not exists created_at timestamptz not null default now();
  end if;

  if to_regclass('public.institutions') is not null then
    alter table public.institutions add column if not exists status text not null default 'active';
    alter table public.institutions add column if not exists metadata jsonb not null default '{}'::jsonb;
    alter table public.institutions add column if not exists created_at timestamptz not null default now();
    alter table public.institutions add column if not exists updated_at timestamptz not null default now();
  end if;
end $$;

-- Add the audit-log institution FK only after the canonical institutions table
-- exists. Migration 001 safely creates that table when it is absent.
commit;
