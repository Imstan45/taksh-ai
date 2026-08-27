export const DODO_COURSE_PRODUCT_ID="pdt_0NmI0yzxw3VYoft8MSf79";
export const DODO_BUNDLE_PRODUCT_ID="pdt_0NmI0z3LxxNsHOUPSO6vM";
export function dodoEnvironment(){return process.env.DODO_PAYMENTS_ENVIRONMENT==="live_mode"?"live_mode":"test_mode" as const;}
export function dodoProductId(type:"course"|"bundle"){return type==="bundle"?DODO_BUNDLE_PRODUCT_ID:DODO_COURSE_PRODUCT_ID;}
