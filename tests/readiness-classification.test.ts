import{describe,expect,it}from"vitest";import{classifyReadiness,isEmployerEligible}from"../src/lib/readiness/service";
const config={placementReadyMin:95,nearlyReadyMin:85,developmentRequiredMin:70,suspiciousSpeedSeconds:720,integrityInvalidationEvents:3,verificationScoreMin:85};
describe("career readiness decisions",()=>{
  it.each([[97,2100,"PLACEMENT_READY"],[94,1800,"NEARLY_READY"],[76,1800,"DEVELOPMENT_REQUIRED"],[55,1800,"FOUNDATION_REQUIRED"]] as const)("classifies %s",(score,duration,status)=>expect(classifyReadiness({score,durationSeconds:duration,integrityEvents:0},config).status).toBe(status));
  it("requires verification for a very fast high score",()=>expect(classifyReadiness({score:97,durationSeconds:540,integrityEvents:0},config).status).toBe("VERIFICATION_REQUIRED"));
  it("invalidates repeated integrity events without calling it failure",()=>expect(classifyReadiness({score:97,durationSeconds:2100,integrityEvents:3},config).status).toBe("ASSESSMENT_INVALID"));
  it("verifies a consistent second-stage result",()=>expect(classifyReadiness({score:90,durationSeconds:600,integrityEvents:0,stage:"verification"},config).status).toBe("VERIFIED_PLACEMENT_READY"));
  it("never makes purchase part of employer eligibility",()=>{expect(isEmployerEligible({status:"PLACEMENT_READY",profileComplete:true,employerSharingConsent:true})).toBe(true);expect(isEmployerEligible({status:"PLACEMENT_READY",profileComplete:true,employerSharingConsent:false})).toBe(false);expect(isEmployerEligible({status:"DEVELOPMENT_REQUIRED",profileComplete:true,employerSharingConsent:true})).toBe(false)});
});
