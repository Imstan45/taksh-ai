import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type CandidateExportRow = {
  name: string | null;
  email: string | null;
  current_score: number | null;
  readiness_status: string | null;
  diagnostic_track: string | null;
  technical_track: string | null;
  verification_status: string | null;
};

function csv(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const searchParams = new URL(request.url).searchParams;
  const status = searchParams.get("status") || null;
  const track = searchParams.get("track") || null;
  const missing = searchParams.get("missing") || null;
  const rows = await prisma.$queryRaw<CandidateExportRow[]>`
    select profile.full_name name, profile.email, candidate.current_score,
      candidate.readiness_status, candidate.diagnostic_track, candidate.technical_track,
      candidate.verification_status
    from public.students profile
    left join public.candidate_readiness candidate on candidate.user_id = profile.id
    left join public.diagnostic_attempts attempt on attempt.id = candidate.latest_attempt_id
    where (${status}::text is null or coalesce(candidate.readiness_status, 'ASSESSMENT_INCOMPLETE') = ${status})
      and (${track}::text is null or candidate.diagnostic_track = ${track})
      and (${missing}::text is null
        or (${missing} = 'diagnostic' and candidate.latest_attempt_id is null)
        or (${missing} = 'phone' and nullif(trim(profile.phone), '') is null)
        or (${missing} = 'profile' and not coalesce(candidate.profile_complete, false))
        or (${missing} = 'technical_track' and candidate.diagnostic_track = 'technical' and nullif(trim(candidate.technical_track), '') is null)
        or (${missing} = 'category_scores' and candidate.latest_attempt_id is not null and coalesce(attempt.category_scores, '{}'::jsonb) = '{}'::jsonb)
        or (${missing} = 'integrity' and (coalesce(attempt.suspicious_speed, false) or coalesce(attempt.integrity_status, 'UNKNOWN') not in ('VALID', 'CLEAR')))
        or (${missing} = 'below_95' and candidate.current_score < 95))
    order by coalesce(candidate.updated_at, profile.updated_at) desc`;

  const headers = ["Name", "Email", "Score", "Readiness status", "Diagnostic track", "Technical track", "Verification status"];
  const lines = [
    headers.map(csv).join(","),
    ...rows.map(row => [
      row.name,
      row.email,
      row.current_score,
      row.readiness_status ?? "ASSESSMENT_INCOMPLETE",
      row.diagnostic_track,
      row.technical_track,
      row.verification_status,
    ].map(csv).join(",")),
  ];

  return new Response(`\uFEFF${lines.join("\r\n")}`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="taksh-candidates.csv"',
      "cache-control": "private, no-store",
    },
  });
}
