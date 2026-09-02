import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("non-technical diagnostic pathway",()=>{
 const route=readFileSync("src/app/api/diagnostic/attempt/route.ts","utf8");
 it("selects exactly 25 non-technical questions using server-side category quotas",()=>{
  const branch=route.slice(route.indexOf("const selected=nonTechnical"),route.indexOf(":verification?"));
  expect(branch).toContain("category='quantitative_aptitude'");expect(branch).toContain("limit 10");
  expect(branch).toContain("category='logical_reasoning'");expect(branch).toContain("limit 7");
  expect(branch).toContain("category='english_verbal'");expect(branch).toContain("limit 8");
  expect(branch).not.toContain("database_technical");
  expect(route).toContain("const expected=nonTechnical?25");
 });
 it("enforces a server timer of 25 minutes and persists the pathway",()=>{
  expect(route).toContain("const duration=nonTechnical?1500");
  expect(route).toContain("diagnostic_track,technical_track");
 });
});
