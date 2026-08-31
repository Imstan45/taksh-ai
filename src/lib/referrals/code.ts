export function salesReferralCode(fullName: string) {
  const base = fullName.normalize("NFKD").replace(/[^a-z]/gi, "").toUpperCase().slice(0, 7) || "TAKSH";
  return `${base}${crypto.randomUUID().replace(/[^a-f0-9]/gi, "").slice(0, 4).toUpperCase()}`.slice(0, 12);
}
