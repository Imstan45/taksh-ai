import{describe,expect,it}from"vitest";import{isSalesManagerPath,roleCanAccessPath,roleHome}from"../src/types/roles";

describe("Sales Manager authorization",()=>{
  it("lands in Sales Rep operations",()=>expect(roleHome("SALES_MANAGER")).toBe("/super-admin/sales-reps"));
  it.each(["/super-admin/sales-reps","/super-admin/sales-reps/rep-id","/super-admin/payments"])("allows %s",path=>expect(roleCanAccessPath("SALES_MANAGER",path)).toBe(true));
  it.each(["/super-admin","/super-admin/users","/super-admin/access","/superadmin/content-factory","/admin","/sales/dashboard","/dashboard","/super-admin/payments-export"])("denies %s",path=>expect(roleCanAccessPath("SALES_MANAGER",path)).toBe(false));
  it("matches complete route segments only",()=>expect(isSalesManagerPath("/super-admin/sales-reps-secret")).toBe(false));
});
