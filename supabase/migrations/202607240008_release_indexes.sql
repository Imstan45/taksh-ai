begin;
create index if not exists user_roles_directory_idx on public.user_roles(institution_id,role,account_status,user_id);
create index if not exists invitations_expiry_idx on public.invitations(status,expires_at) where status='pending';
create index if not exists assignments_batch_active_idx on public.student_course_assignments(institution_id,batch_id,active);
create index if not exists progress_activity_idx on public.student_content_progress(student_id,last_viewed_at desc);
create index if not exists feedback_student_idx on public.faculty_feedback(student_id,created_at desc);
insert into public.schema_migrations(version,description) values('202607240008','August release directory, invitation, assignment, and activity indexes') on conflict(version) do nothing;
commit;
