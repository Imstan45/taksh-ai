import { describe,expect,it } from "vitest";
import { readinessBand } from "@/lib/diagnostic/scoring";
describe("placement readiness bands",()=>{
  it.each([[100,"Placement Ready"],[80,"Placement Ready"],[79,"Almost Ready"],[60,"Almost Ready"],[59,"Needs Preparation"],[40,"Needs Preparation"],[39,"Foundation Required"],[0,"Foundation Required"]] as const)("maps %s",(score,label)=>expect(readinessBand(score)).toBe(label));
});
