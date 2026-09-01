export function salesReferralCode(fullName: string) {
  const base = fullName.normalize("NFKD").replace(/[^a-z]/gi, "").toUpperCase().slice(0, 6) || "REP";
  const suffix = crypto.randomUUID().replace(/[^a-f0-9]/gi, "").slice(0, 4).toUpperCase();
  return `TAKSH-${base}${suffix}`;
}
