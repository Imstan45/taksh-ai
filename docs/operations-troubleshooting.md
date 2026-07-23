# Taksh operations troubleshooting

- **Invitation failed:** confirm the user has no active pending invitation, verify Supabase email delivery, then resend from the user directory. Confirm `NEXT_PUBLIC_APP_URL` is an allowed redirect.
- **Student missing:** search the institution Student directory, then verify `user_roles.institution_id`, `account_status`, and the active academic membership.
- **Course not visible:** verify the Super Admin institution grant, active Student assignment, assignment dates, and published Content Factory lessons.
- **Assessment not visible:** verify published status, availability dates, active assignment, and the Student's batch/cohort membership.
- **Submission failed:** check attempt status, time limit and maximum attempts. A submitted attempt is intentionally locked against replay.
- **Suspended account:** reactivate from the institution directory or Super Admin user controls. A new session may be required.
- **Wrong institution:** correct the role record and academic membership; never copy tenant records manually.
- **Migration mismatch:** run `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/release-verify.sql` and apply only the next ordered migration.
- **Missing configuration:** call `/api/health`; add the reported variable to the deployment environment without logging its value.

Required Supabase redirect allow-list entries:

- `${NEXT_PUBLIC_APP_URL}/accept-invitation`
- `${NEXT_PUBLIC_APP_URL}/verify-email`
- `${NEXT_PUBLIC_APP_URL}/reset-password`
- `${NEXT_PUBLIC_APP_URL}/api/auth/callback/credentials`
- `${NEXT_PUBLIC_CONTENT_FACTORY_URL}/auth/callback`
