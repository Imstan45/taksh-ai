import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { salesReferralCode } from "@/lib/referrals/code";

const migration=readFileSync("supabase/migrations/20260831150000_sales_rep_referrals.sql","utf8");
const challengeMigration=readFileSync("supabase/migrations/20260828140300_sales_challenge_module.sql","utf8");
const attribution=readFileSync("src/lib/sales-challenge/attribution.ts","utf8");
const portalMigration=readFileSync("supabase/migrations/20260901090000_sales_partner_portal.sql","utf8");
describe("Sales Rep referrals",()=>{
 it("creates stable-format, human-readable referral codes",()=>{const code=salesReferralCode("Surya Kumar");expect(code).toMatch(/^TAKSH-SURYAK[A-F0-9]{4}$/);expect(code).not.toMatch(/^\d+$/)});
 it("enforces one auditable sale per verified order",()=>{expect(migration).toContain("payment_order_id uuid not null unique");expect(migration).toContain("payments_sync_verified_referral_sale");expect(migration).toContain("new.status='captured'")});
 it("uses a 30-day, first-touch attribution model",()=>{expect(migration).toContain("interval '30 days'");expect(attribution).toContain("pg_advisory_xact_lock");expect(challengeMigration).toContain("sales_referral_registered_user_unique")});
 it("protects rep data with owner-only RLS",()=>{for(const value of["alter table public.sales_reps enable row level security","sales_reps_own_read","referral_sales_rep_own_read","sales_attribution_owner_read","revoke all on public.sales_reps,public.referral_sales from anon,authenticated"])expect(migration).toContain(value)});
 it("automatically reflects refunds",()=>{expect(migration).toContain("payments_sync_referral_sale_refund");expect(migration).toContain("'partially_refunded'");expect(migration).toContain("refunded_amount_in_paise")});
 it("supports review-only self-registration without weakening owner RLS",()=>{expect(portalMigration).toContain("'pending','active','suspended','rejected'");expect(portalMigration).toContain("alter column referral_code drop not null");expect(portalMigration).not.toContain("disable row level security")});
});
