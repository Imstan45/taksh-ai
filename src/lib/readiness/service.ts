export const READINESS_STATUSES=["PLACEMENT_READY","VERIFIED_PLACEMENT_READY","VERIFICATION_REQUIRED","NEARLY_READY","DEVELOPMENT_REQUIRED","FOUNDATION_REQUIRED","ASSESSMENT_INCOMPLETE","ASSESSMENT_INVALID","MANUAL_REVIEW"] as const;
export type ReadinessStatus=(typeof READINESS_STATUSES)[number];
export type ReadinessThresholds={placementReadyMin:number;nearlyReadyMin:number;developmentRequiredMin:number;suspiciousSpeedSeconds:number;integrityInvalidationEvents:number;verificationScoreMin:number};
export type ReadinessDecision={status:ReadinessStatus;suspiciousSpeed:boolean;verificationStatus:"NOT_REQUIRED"|"REQUIRED"|"VERIFIED"|"MANUAL_REVIEW";integrityStatus:"VALID"|"WARNING"|"INVALID"};

export function classifyReadiness(input:{score:number;durationSeconds:number;integrityEvents:number;stage?:"primary"|"verification"},config:ReadinessThresholds):ReadinessDecision{
  const integrityStatus=input.integrityEvents>=config.integrityInvalidationEvents?"INVALID":input.integrityEvents>0?"WARNING":"VALID";
  if(integrityStatus==="INVALID")return{status:"ASSESSMENT_INVALID",suspiciousSpeed:false,verificationStatus:"NOT_REQUIRED",integrityStatus};
  if(input.stage==="verification"){
    return input.score>=config.verificationScoreMin
      ?{status:"VERIFIED_PLACEMENT_READY",suspiciousSpeed:false,verificationStatus:"VERIFIED",integrityStatus}
      :{status:"MANUAL_REVIEW",suspiciousSpeed:false,verificationStatus:"MANUAL_REVIEW",integrityStatus};
  }
  const suspiciousSpeed=input.score>=config.placementReadyMin&&input.durationSeconds<config.suspiciousSpeedSeconds;
  if(suspiciousSpeed)return{status:"VERIFICATION_REQUIRED",suspiciousSpeed:true,verificationStatus:"REQUIRED",integrityStatus};
  if(input.score>=config.placementReadyMin)return{status:"PLACEMENT_READY",suspiciousSpeed:false,verificationStatus:"NOT_REQUIRED",integrityStatus};
  if(input.score>=config.nearlyReadyMin)return{status:"NEARLY_READY",suspiciousSpeed:false,verificationStatus:"NOT_REQUIRED",integrityStatus};
  if(input.score>=config.developmentRequiredMin)return{status:"DEVELOPMENT_REQUIRED",suspiciousSpeed:false,verificationStatus:"NOT_REQUIRED",integrityStatus};
  return{status:"FOUNDATION_REQUIRED",suspiciousSpeed:false,verificationStatus:"NOT_REQUIRED",integrityStatus};
}

export function isEmployerEligible(input:{status:ReadinessStatus;profileComplete:boolean;employerSharingConsent:boolean}){
  return input.profileComplete&&input.employerSharingConsent&&["PLACEMENT_READY","VERIFIED_PLACEMENT_READY"].includes(input.status);
}

export const readinessLabels:Record<ReadinessStatus,string>={PLACEMENT_READY:"Placement Ready",VERIFIED_PLACEMENT_READY:"Verified — Placement Ready",VERIFICATION_REQUIRED:"Verification Required",NEARLY_READY:"Nearly Ready",DEVELOPMENT_REQUIRED:"Development Required",FOUNDATION_REQUIRED:"Foundation Required",ASSESSMENT_INCOMPLETE:"Assessment Incomplete",ASSESSMENT_INVALID:"Assessment Invalid",MANUAL_REVIEW:"Manual Review"};
