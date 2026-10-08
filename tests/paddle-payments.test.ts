import {createHmac} from "node:crypto";
import {describe,expect,it} from "vitest";
import {verifyPaddleSignature} from "@/lib/payments/paddle";

describe("Paddle webhook security",()=>{
 it("accepts a valid signature within the replay window",()=>{const raw='{"event_id":"evt_1"}',secret="pdl_ntfset_test",timestamp="1787825000",signature=createHmac("sha256",secret).update(`${timestamp}:${raw}`).digest("hex");expect(verifyPaddleSignature(raw,`ts=${timestamp};h1=${signature}`,secret,1787825050)).toBe(true);});
 it("rejects tampering, malformed headers and stale events",()=>{const raw="{}",secret="secret",timestamp="1787825000",signature=createHmac("sha256",secret).update(`${timestamp}:${raw}`).digest("hex");expect(verifyPaddleSignature("{x}",`ts=${timestamp};h1=${signature}`,secret,1787825050)).toBe(false);expect(verifyPaddleSignature(raw,"bad",secret,1787825050)).toBe(false);expect(verifyPaddleSignature(raw,`ts=${timestamp};h1=${signature}`,secret,1787826000)).toBe(false);});
});
