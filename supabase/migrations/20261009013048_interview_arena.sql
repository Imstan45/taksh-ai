begin;

insert into public.products(code,name,description,product_type,price_in_paise,display_order,metadata)
values ('interview-arena-5','AI Interview Arena · 5 interviews','Five voice-first AI mock interviews, up to 15 minutes each.','bundle',19900,5,'{"interview_credits":5,"duration_minutes":15,"validity_days":90}')
on conflict(code) do update set name=excluded.name,description=excluded.description,price_in_paise=excluded.price_in_paise,metadata=excluded.metadata,active=true,updated_at=now();

create table public.interview_packages (
 id uuid primary key default gen_random_uuid(), product_id uuid not null unique references public.products(id) on delete restrict,
 code text not null unique, interview_count integer not null check(interview_count>0), duration_minutes integer not null check(duration_minutes between 5 and 60),
 validity_days integer not null check(validity_days between 1 and 365), active boolean not null default true, created_at timestamptz not null default now()
);
insert into public.interview_packages(product_id,code,interview_count,duration_minutes,validity_days)
select id,'interview-arena-5',5,15,90 from public.products where code='interview-arena-5' on conflict(code) do nothing;

create table public.interview_purchases (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 package_id uuid not null references public.interview_packages(id) on delete restrict, payment_id uuid not null unique references public.payments(id) on delete restrict,
 credits_granted integer not null check(credits_granted>0), expires_at timestamptz not null, fulfilled_at timestamptz not null default now()
);
create index interview_purchases_user_idx on public.interview_purchases(user_id,fulfilled_at desc);

create table public.interview_resumes (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 storage_key text not null unique, original_name text not null, mime_type text not null check(mime_type in ('application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document')),
 size_bytes integer not null check(size_bytes between 1 and 5242880), extracted_text text, created_at timestamptz not null default now(), deleted_at timestamptz
);

create table public.interview_sessions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 resume_id uuid references public.interview_resumes(id) on delete set null, mode text not null check(mode in ('practice','real')),
 interviewer text not null check(interviewer in ('alex','maya')), target_role text not null check(char_length(target_role) between 2 and 120),
 difficulty text not null check(difficulty in ('beginner','intermediate','advanced')), status text not null default 'draft' check(status in ('draft','active','completed','expired','abandoned','failed')),
 stage text not null default 'introduction' check(stage in ('introduction','background','technical','behavioral','candidate_questions','closing')),
 duration_seconds integer not null default 900 check(duration_seconds between 300 and 3600), started_at timestamptz, expires_at timestamptz, completed_at timestamptz,
 credit_reserved boolean not null default false, version integer not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index interview_sessions_user_idx on public.interview_sessions(user_id,created_at desc);

create table public.interview_credit_ledger (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 purchase_id uuid references public.interview_purchases(id) on delete restrict, session_id uuid references public.interview_sessions(id) on delete restrict,
 event_type text not null check(event_type in ('grant','reserve','release','consume','expire','refund')),
 available_delta integer not null, reserved_delta integer not null, idempotency_key text not null unique, expires_at timestamptz, created_at timestamptz not null default now(),
 check(available_delta <> 0 or reserved_delta <> 0 or event_type='consume')
);
create index interview_credit_ledger_balance_idx on public.interview_credit_ledger(user_id,created_at);

create table public.interview_messages (
 id uuid primary key default gen_random_uuid(), session_id uuid not null references public.interview_sessions(id) on delete cascade,
 sequence integer not null check(sequence>0), role text not null check(role in ('interviewer','candidate','system')),
 content text not null check(char_length(content) between 1 and 12000), stage text not null, transcription_confidence numeric(5,4), metadata jsonb not null default '{}', created_at timestamptz not null default now(), unique(session_id,sequence)
);

create table public.interview_reports (
 id uuid primary key default gen_random_uuid(), session_id uuid not null unique references public.interview_sessions(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade, status text not null default 'pending' check(status in ('pending','generating','ready','failed')),
 overall_score integer check(overall_score between 0 and 100), scores jsonb, strengths jsonb, improvements jsonb, evidence jsonb, summary text,
 error_message text, generated_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

alter table public.interview_packages enable row level security; alter table public.interview_purchases enable row level security;
alter table public.interview_resumes enable row level security; alter table public.interview_sessions enable row level security;
alter table public.interview_credit_ledger enable row level security; alter table public.interview_messages enable row level security; alter table public.interview_reports enable row level security;
revoke all on public.interview_packages,public.interview_purchases,public.interview_resumes,public.interview_sessions,public.interview_credit_ledger,public.interview_messages,public.interview_reports from anon,authenticated;
grant select on public.interview_packages to authenticated;
grant select on public.interview_purchases,public.interview_resumes,public.interview_sessions,public.interview_credit_ledger,public.interview_messages,public.interview_reports to authenticated;
create policy interview_packages_read on public.interview_packages for select to authenticated using(active);
create policy interview_purchases_owner on public.interview_purchases for select to authenticated using(auth.uid()=user_id or public.is_super_admin());
create policy interview_resumes_owner on public.interview_resumes for select to authenticated using(auth.uid()=user_id or public.is_super_admin());
create policy interview_sessions_owner on public.interview_sessions for select to authenticated using(auth.uid()=user_id or public.is_super_admin());
create policy interview_ledger_owner on public.interview_credit_ledger for select to authenticated using(auth.uid()=user_id or public.is_super_admin());
create policy interview_messages_owner on public.interview_messages for select to authenticated using(exists(select 1 from public.interview_sessions s where s.id=session_id and (s.user_id=auth.uid() or public.is_super_admin())));
create policy interview_reports_owner on public.interview_reports for select to authenticated using(auth.uid()=user_id or public.is_super_admin());

insert into public.schema_migrations(version,description) values ('20261009013048','Interview Arena packages, credits, sessions, transcripts, resumes and reports') on conflict do nothing;
commit;
