const bank:Record<string,string[]>={
 introduction:["Please introduce yourself and explain why this role interests you."],
 background:["Tell me about a project you are proud of and your specific contribution.","Which experience best prepared you for this role?"],
 technical:["Walk me through how you would approach a difficult task in this role.","Describe a technical trade-off you made and how you evaluated it."],
 behavioral:["Tell me about a disagreement with a teammate and how you resolved it.","Describe a failure, what you learned, and what you changed afterward."],
 candidate_questions:["What would you like to ask about the role or team?"],
 closing:["Give me your concise closing pitch for why you are a strong fit."],
};
export function fallbackQuestion(stage:string,index=0){const choices=bank[stage]??bank.technical;return choices[index%choices.length]}
