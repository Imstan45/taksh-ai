import {auth} from "@/auth";
export async function interviewUser(){const session=await auth();if(!session?.user||session.user.role!=="STUDENT")return null;return session.user}
