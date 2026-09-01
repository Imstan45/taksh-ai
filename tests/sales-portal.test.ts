import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const auth=readFileSync("src/auth.ts","utf8");
const registration=readFileSync("src/app/api/auth/sales-register/route.ts","utf8");
const dashboard=readFileSync("src/app/sales/dashboard/page.tsx","utf8");
const adminActions=readFileSync("src/app/super-admin/sales-reps/actions.ts","utf8");
const studentRegistration=readFileSync("src/app/api/auth/register/route.ts","utf8");
const createOrder=readFileSync("src/app/api/payments/create-order/route.ts","utf8");

describe("Dedicated Sales Portal",()=>{
  it("keeps student registration unchanged and gives Sales Reps their own role",()=>{
    expect(studentRegistration).toContain('app_metadata: { role: "STUDENT" }');
    expect(registration).toContain('app_metadata: { role: "SALES_REP" }');
    expect(registration).toContain("'pending'");
  });
  it("routes non-active Sales Reps only to the pending screen",()=>{
    expect(auth).toContain('path === "/sales/pending"');
    expect(auth).toContain('new URL("/sales/pending"');
    expect(auth).toContain('path.startsWith("/sales") || path.startsWith("/sales-rep")');
  });
  it("requires active status for analytics and never returns fake values",()=>{
    expect(dashboard).toContain('rep.status!=="active"');
    expect(dashboard).toContain("public.referral_sales");
    expect(dashboard).toContain("No referral activity yet");
  });
  it("keeps status changes server-side and Super Admin-only",()=>{
    expect(adminActions).toContain("requireSuper()");
    expect(adminActions).toContain('if(!["active","suspended","rejected"].includes(status))');
    expect(adminActions).toContain("authorization_version=authorization_version+1");
  });
  it("links Razorpay and PayU orders to the existing sales attribution",()=>{
    expect(createOrder).toContain("currentSalesAttribution(session.user.id)");
    expect(createOrder).toContain("sales_attribution_id");
  });
});
