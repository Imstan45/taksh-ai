export const juniorsExamConfigs={
  "jee-main":{title:"JEE Main Paper 1",durationMinutes:180,totalQuestions:75,totalMarks:300,negativeMarking:true,sections:[{subject:"Mathematics",questions:25,marks:100},{subject:"Physics",questions:25,marks:100},{subject:"Chemistry",questions:25,marks:100}],scoring:"+4 correct, −1 incorrect, 0 unanswered"},
  "tg-eapcet":{title:"TG EAPCET Engineering",durationMinutes:180,totalQuestions:160,totalMarks:160,negativeMarking:false,sections:[{subject:"Mathematics",questions:80,marks:80},{subject:"Physics",questions:40,marks:40},{subject:"Chemistry",questions:40,marks:40}],scoring:"+1 correct, no negative marking"},
  "ap-eapcet":{title:"AP EAPCET Engineering",durationMinutes:180,totalQuestions:160,totalMarks:160,negativeMarking:false,sections:[{subject:"Mathematics",questions:80,marks:80},{subject:"Physics",questions:40,marks:40},{subject:"Chemistry",questions:40,marks:40}],scoring:"+1 correct, no negative marking"},
} as const;
export type JuniorsExamCode=keyof typeof juniorsExamConfigs;
