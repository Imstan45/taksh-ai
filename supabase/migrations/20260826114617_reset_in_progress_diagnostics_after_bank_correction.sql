-- Saved option mappings refer to the previous option order. Restart only unfinished attempts.
update public.diagnostic_attempts
set status='TIME_EXPIRED', submitted_at=coalesce(submitted_at,now()), updated_at=now()
where assessment_id='taksh-skill-diagnostic-v1' and status in('NOT_STARTED','IN_PROGRESS');
