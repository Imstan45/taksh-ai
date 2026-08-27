import {afterEach,describe,expect,it} from "vitest";
import {DODO_BUNDLE_PRODUCT_ID,DODO_COURSE_PRODUCT_ID,dodoEnvironment,dodoProductId} from "@/lib/payments/dodo-config";

describe("Dodo payment mapping",()=>{
 const original=process.env.DODO_PAYMENTS_ENVIRONMENT;
 afterEach(()=>{if(original===undefined)delete process.env.DODO_PAYMENTS_ENVIRONMENT;else process.env.DODO_PAYMENTS_ENVIRONMENT=original;});
 it("maps every individual course to the live 499 product",()=>expect(dodoProductId("course")).toBe(DODO_COURSE_PRODUCT_ID));
 it("maps the complete bundle to the live 999 product",()=>expect(dodoProductId("bundle")).toBe(DODO_BUNDLE_PRODUCT_ID));
 it("defaults safely to test mode",()=>{delete process.env.DODO_PAYMENTS_ENVIRONMENT;expect(dodoEnvironment()).toBe("test_mode");});
 it("uses live mode only when explicitly configured",()=>{process.env.DODO_PAYMENTS_ENVIRONMENT="live_mode";expect(dodoEnvironment()).toBe("live_mode");});
});
