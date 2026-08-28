import { describe, expect, it } from "vitest";
import { scoreChallenge, type SalesMetrics } from "@/lib/sales-challenge/scoring";

const metrics = (values: Partial<SalesMetrics> = {}): SalesMetrics => ({ uniqueVisitors: 0, qualifiedRegistrations: 0, assessmentCompletions: 0, payingCustomers: 0, grossRevenue: 0, refundedRevenue: 0, netRevenue: 0, complianceScore: 0, ...values });

describe("sales challenge scoring", () => {
  it("weights the category leaders according to the published 70/15/10/5 model", () => {
    const [leader] = scoreChallenge([metrics({ qualifiedRegistrations: 20, payingCustomers: 10, grossRevenue: 100_000, netRevenue: 100_000, complianceScore: 5 })]);
    expect(leader.finalScore).toBe(100);
    expect(leader.rank).toBe(1);
    expect(leader.conversionProvisional).toBe(false);
  });

  it("subtracts refunds before ranking revenue", () => {
    const rows = scoreChallenge([
      metrics({ qualifiedRegistrations: 20, payingCustomers: 5, grossRevenue: 200_000, refundedRevenue: 150_000, netRevenue: 50_000 }),
      metrics({ qualifiedRegistrations: 20, payingCustomers: 4, grossRevenue: 120_000, netRevenue: 120_000 }),
    ]);
    expect(rows[0].sourceIndex).toBe(1);
    expect(rows[0].revenueScore).toBe(70);
  });

  it("marks conversion as provisional and scales it below the sample threshold", () => {
    const rows = scoreChallenge([
      metrics({ qualifiedRegistrations: 2, payingCustomers: 2, netRevenue: 100 }),
      metrics({ qualifiedRegistrations: 20, payingCustomers: 10, netRevenue: 100 }),
    ], 20);
    const smallSample = rows.find(row => row.sourceIndex === 0)!;
    expect(smallSample.conversionProvisional).toBe(true);
    expect(smallSample.conversionScore).toBeLessThan(10);
  });
});
