begin;

-- Remove legacy anonymous Content Factory permissions.
drop policy if exists "Taksh admin can read curriculum" on public.taksh_curriculum;
drop policy if exists "Taksh admin can manage curriculum" on public.taksh_curriculum;
drop policy if exists "Taksh admin can read assets" on public.taksh_content_assets;
drop policy if exists "Taksh admin can create assets" on public.taksh_content_assets;
drop policy if exists "Taksh admin can update assets" on public.taksh_content_assets;
drop policy if exists "Taksh admin can delete assets" on public.taksh_content_assets;
drop policy if exists "Taksh admin can read versions" on public.taksh_content_versions;
drop policy if exists "Taksh admin can create versions" on public.taksh_content_versions;

revoke all on public.taksh_curriculum from anon;
revoke all on public.taksh_content_assets from anon;
revoke all on public.taksh_content_versions from anon;
revoke all on public.content_publication_history from anon;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'institutions','user_roles','departments','academic_batches','cohorts',
    'user_academic_memberships','faculty_assignments','students','student_profiles',
    'courses','course_modules','course_topics','course_subtopics','taksh_curriculum',
    'taksh_content_assets','taksh_content_versions','content_publication_history',
    'institution_course_access','student_course_assignments','student_content_progress',
    'student_xp_ledger','student_streaks','badges','student_badge_awards',
    'question_topics','question_bank','assessments','assessment_questions',
    'assessment_assignments','assessment_attempts','assessment_responses',
    'faculty_feedback','invitations','audit_logs'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end $$;

drop policy if exists user_roles_self_read on public.user_roles;
create policy user_roles_self_read on public.user_roles
for select to authenticated using (user_id = auth.uid() or public.is_super_admin());

drop policy if exists institutions_scoped_read on public.institutions;
create policy institutions_scoped_read on public.institutions
for select to authenticated using (public.is_super_admin() or id = public.current_institution_id());

drop policy if exists departments_scoped_read on public.departments;
create policy departments_scoped_read on public.departments
for select to authenticated using (public.is_super_admin() or institution_id = public.current_institution_id());

drop policy if exists batches_scoped_read on public.academic_batches;
create policy batches_scoped_read on public.academic_batches
for select to authenticated using (public.is_super_admin() or institution_id = public.current_institution_id());

drop policy if exists cohorts_scoped_read on public.cohorts;
create policy cohorts_scoped_read on public.cohorts
for select to authenticated using (public.is_super_admin() or institution_id = public.current_institution_id());

drop policy if exists memberships_scoped_read on public.user_academic_memberships;
create policy memberships_scoped_read on public.user_academic_memberships
for select to authenticated using (
  public.is_super_admin()
  or user_id = auth.uid()
  or (
    institution_id = public.current_institution_id()
    and public.current_user_role() in ('COLLEGE_ADMIN', 'FACULTY')
  )
);

drop policy if exists faculty_assignments_scoped_read on public.faculty_assignments;
create policy faculty_assignments_scoped_read on public.faculty_assignments
for select to authenticated using (
  public.is_super_admin()
  or faculty_id = auth.uid()
  or (
    institution_id = public.current_institution_id()
    and public.current_user_role() = 'COLLEGE_ADMIN'
  )
);

drop policy if exists students_scoped_read on public.students;
create policy students_scoped_read on public.students
for select to authenticated using (
  id = auth.uid()
  or public.is_super_admin()
  or exists (
    select 1 from public.user_roles student_role
    where student_role.user_id = students.id
      and student_role.institution_id = public.current_institution_id()
      and public.current_user_role() = 'COLLEGE_ADMIN'
  )
  or exists (
    select 1
    from public.user_academic_memberships student_membership
    join public.faculty_assignments assignment
      on assignment.faculty_id = auth.uid()
     and assignment.institution_id = student_membership.institution_id
     and assignment.active
     and (
       assignment.batch_id is null or assignment.batch_id = student_membership.batch_id
     )
     and (
       assignment.cohort_id is null or assignment.cohort_id = student_membership.cohort_id
     )
    where student_membership.user_id = students.id
      and student_membership.active
  )
);

drop policy if exists profiles_scoped_read on public.student_profiles;
create policy profiles_scoped_read on public.student_profiles
for select to authenticated using (
  student_id = auth.uid()
  or public.is_super_admin()
  or exists (
    select 1 from public.user_roles student_role
    where student_role.user_id = student_profiles.student_id
      and student_role.institution_id = public.current_institution_id()
      and public.current_user_role() = 'COLLEGE_ADMIN'
  )
  or exists (
    select 1
    from public.user_academic_memberships student_membership
    join public.faculty_assignments assignment
      on assignment.faculty_id = auth.uid()
     and assignment.institution_id = student_membership.institution_id
     and assignment.active
     and (assignment.batch_id is null or assignment.batch_id = student_membership.batch_id)
     and (assignment.cohort_id is null or assignment.cohort_id = student_membership.cohort_id)
    where student_membership.user_id = student_profiles.student_id
      and student_membership.active
  )
);

drop policy if exists curriculum_authenticated_read on public.taksh_curriculum;
create policy curriculum_authenticated_read on public.taksh_curriculum
for select to authenticated using (active);

drop policy if exists assets_assigned_published_read on public.taksh_content_assets;
create policy assets_assigned_published_read on public.taksh_content_assets
for select to authenticated using (
  public.is_super_admin()
  or (
    status = 'published'
    and exists (
      select 1 from public.student_course_assignments assignment
      where assignment.student_id = auth.uid()
        and assignment.course = taksh_content_assets.course
        and assignment.active
        and assignment.revoked_at is null
        and (assignment.starts_at is null or assignment.starts_at <= now())
        and (assignment.due_at is null or assignment.due_at >= now())
    )
  )
  or (
    status in ('approved', 'published')
    and public.current_user_role() in ('COLLEGE_ADMIN', 'FACULTY')
    and exists (
      select 1 from public.institution_course_access access
      where access.institution_id = public.current_institution_id()
        and access.course = taksh_content_assets.course
        and access.active
    )
  )
);

drop policy if exists content_versions_super_admin_read on public.taksh_content_versions;
create policy content_versions_super_admin_read on public.taksh_content_versions
for select to authenticated using (public.is_super_admin());

drop policy if exists publication_history_super_admin_read on public.content_publication_history;
create policy publication_history_super_admin_read on public.content_publication_history
for select to authenticated using (public.is_super_admin());

drop policy if exists course_access_scoped_read on public.institution_course_access;
create policy course_access_scoped_read on public.institution_course_access
for select to authenticated using (public.is_super_admin() or institution_id = public.current_institution_id());

drop policy if exists assignments_scoped_read on public.student_course_assignments;
create policy assignments_scoped_read on public.student_course_assignments
for select to authenticated using (
  student_id = auth.uid()
  or public.is_super_admin()
  or (
    institution_id = public.current_institution_id()
    and public.current_user_role() in ('COLLEGE_ADMIN', 'FACULTY')
  )
);

drop policy if exists progress_own_read on public.student_content_progress;
create policy progress_own_read on public.student_content_progress
for select to authenticated using (
  student_id = auth.uid()
  or public.is_super_admin()
  or (
    public.current_user_role() in ('COLLEGE_ADMIN', 'FACULTY')
    and exists (
      select 1 from public.user_roles student_role
      where student_role.user_id = student_content_progress.student_id
        and student_role.institution_id = public.current_institution_id()
    )
  )
);

drop policy if exists xp_own_read on public.student_xp_ledger;
create policy xp_own_read on public.student_xp_ledger
for select to authenticated using (student_id = auth.uid() or public.is_super_admin());

drop policy if exists streak_own_read on public.student_streaks;
create policy streak_own_read on public.student_streaks
for select to authenticated using (student_id = auth.uid() or public.is_super_admin());

drop policy if exists badge_catalog_read on public.badges;
create policy badge_catalog_read on public.badges for select to authenticated using (active);

drop policy if exists badge_awards_own_read on public.student_badge_awards;
create policy badge_awards_own_read on public.student_badge_awards
for select to authenticated using (student_id = auth.uid() or public.is_super_admin());

drop policy if exists question_topics_staff_read on public.question_topics;
create policy question_topics_staff_read on public.question_topics
for select to authenticated using (
  public.is_super_admin()
  or (
    public.current_user_role() in ('COLLEGE_ADMIN', 'FACULTY')
    and (institution_id is null or institution_id = public.current_institution_id())
  )
);

drop policy if exists question_bank_staff_read on public.question_bank;
create policy question_bank_staff_read on public.question_bank
for select to authenticated using (
  public.is_super_admin()
  or (
    public.current_user_role() in ('COLLEGE_ADMIN', 'FACULTY')
    and (institution_id is null or institution_id = public.current_institution_id())
  )
);

drop policy if exists assessments_scoped_read on public.assessments;
create policy assessments_scoped_read on public.assessments
for select to authenticated using (
  public.is_super_admin()
  or (
    institution_id = public.current_institution_id()
    and public.current_user_role() in ('COLLEGE_ADMIN', 'FACULTY')
  )
  or (
    status = 'published'
    and exists (
      select 1 from public.assessment_assignments assignment
      where assignment.assessment_id = assessments.id
        and assignment.active
        and (
          assignment.student_id = auth.uid()
          or assignment.batch_id in (
            select batch_id from public.user_academic_memberships
            where user_id = auth.uid() and active
          )
          or assignment.cohort_id in (
            select cohort_id from public.user_academic_memberships
            where user_id = auth.uid() and active
          )
        )
    )
  )
);

drop policy if exists attempts_scoped_read on public.assessment_attempts;
create policy attempts_scoped_read on public.assessment_attempts
for select to authenticated using (
  student_id = auth.uid()
  or public.is_super_admin()
  or exists (
    select 1 from public.assessments assessment
    where assessment.id = assessment_attempts.assessment_id
      and assessment.institution_id = public.current_institution_id()
      and public.current_user_role() in ('COLLEGE_ADMIN', 'FACULTY')
  )
);

drop policy if exists responses_scoped_read on public.assessment_responses;
create policy responses_scoped_read on public.assessment_responses
for select to authenticated using (
  exists (
    select 1 from public.assessment_attempts attempt
    where attempt.id = assessment_responses.attempt_id
      and (
        attempt.student_id = auth.uid()
        or public.is_super_admin()
        or exists (
          select 1 from public.assessments assessment
          where assessment.id = attempt.assessment_id
            and assessment.institution_id = public.current_institution_id()
            and public.current_user_role() in ('COLLEGE_ADMIN', 'FACULTY')
        )
      )
  )
);

drop policy if exists invitations_admin_read on public.invitations;
create policy invitations_admin_read on public.invitations
for select to authenticated using (
  public.is_super_admin()
  or (institution_id = public.current_institution_id() and public.current_user_role() = 'COLLEGE_ADMIN')
);

drop policy if exists audit_logs_scoped_read on public.audit_logs;
create policy audit_logs_scoped_read on public.audit_logs
for select to authenticated using (
  public.is_super_admin()
  or (institution_id = public.current_institution_id() and public.current_user_role() = 'COLLEGE_ADMIN')
);

insert into public.schema_migrations (version, description)
values ('202607240002', 'Tenant isolation and Content Factory RLS')
on conflict (version) do nothing;

commit;
notify pgrst, 'reload schema';
