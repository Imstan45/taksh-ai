import{describe,expect,it}from"vitest";import{engineOutputSchema,reportSchema,setupSchema}from"./schemas";
describe("Interview Arena schemas",()=>{
 it("accepts a complete setup",()=>expect(setupSchema.safeParse({targetRole:"Backend Engineer",mode:"practice",interviewer:"maya",difficulty:"intermediate"}).success).toBe(true));
 it("strips provider-only fields",()=>expect(engineOutputSchema.parse({reply:"Question?",stage:"technical",shouldComplete:false,questionType:"technical",internal_reason:"secret"})).not.toHaveProperty("internal_reason"));
 it("rejects out-of-range report scores",()=>expect(reportSchema.safeParse({overallScore:101,scores:{communication:80,technical:80,problemSolving:80,confidence:80},strengths:[],improvements:[],evidence:[],summary:"Summary"}).success).toBe(false));
});
