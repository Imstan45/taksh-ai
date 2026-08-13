import { z } from "zod";
import { requireFactorySession } from "@/lib/content-factory/auth";
import { buildAuthoredLesson, findAuthoredItem } from "@/lib/content-factory/authored-curriculum";

const inputSchema=z.object({course:z.string(),module:z.string(),topic:z.string(),subtopic:z.string()});
export async function POST(request:Request){
  if(!await requireFactorySession(request))return Response.json({error:"Forbidden"},{status:403});
  const parsed=inputSchema.safeParse(await request.json());
  if(!parsed.success)return Response.json({error:"Invalid curriculum identity."},{status:400});
  const item=findAuthoredItem(parsed.data.course,parsed.data.module,parsed.data.topic,parsed.data.subtopic);
  if(!item)return Response.json({error:"This curriculum item has not been authored yet."},{status:404});
  return Response.json({content:buildAuthoredLesson(item),model:"Taksh authored engine",responseTime:0});
}
