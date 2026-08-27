import {readFileSync} from "node:fs";
import assert from "node:assert/strict";

const sql=readFileSync(new URL("../supabase/diagnostic-question-seed.sql",import.meta.url),"utf8");
const match=sql.match(/\$diagnostic\$(\[.*\])\$diagnostic\$/s);
assert(match,"Diagnostic JSON payload was not found.");
const questions=JSON.parse(match[1]);
const letters="ABCD";
const answer=question=>question[`option_${question.correct_answer.toLowerCase()}`];

assert.equal(questions.length,400);
assert.equal(new Set(questions.map(question=>question.id)).size,400);
assert(!/[^\x00-\x7F]/.test(JSON.stringify(questions)),"Non-ASCII or corrupted text remains in the bank.");
const fingerprints=questions.map(question=>JSON.stringify([question.question_text,[question.option_a,question.option_b,question.option_c,question.option_d].toSorted()]));
assert.equal(new Set(fingerprints).size,400,"Duplicate question-and-option sets remain in the bank.");

const counts={},difficulties={},answers={A:0,B:0,C:0,D:0};
for(const question of questions){
  counts[question.category]=(counts[question.category]??0)+1;
  difficulties[question.difficulty]=(difficulties[question.difficulty]??0)+1;
  answers[question.correct_answer]++;
  const options=[question.option_a,question.option_b,question.option_c,question.option_d];
  assert.equal(new Set(options).size,4,`${question.id} has duplicate options.`);
  assert(letters.includes(question.correct_answer),`${question.id} has an invalid answer key.`);
  assert(question.explanation.length>=20,`${question.id} needs a useful explanation.`);
  assert(question.estimated_time_seconds>=30&&question.estimated_time_seconds<=120,`${question.id} has an unreasonable time estimate.`);
}
assert.deepEqual(counts,{logical_reasoning:110,quantitative_aptitude:100,english_verbal:100,database_technical:90});
assert.deepEqual(difficulties,{1:80,2:200,3:120});
assert.deepEqual(answers,{A:100,B:100,C:100,D:100});
const additional=questions.filter(question=>/^(lr2-|qa2-|ev2-|tech2-)/.test(question.id));
assert.equal(additional.length,200,"The second bank must contain exactly 200 questions.");
const additionalCategories={},additionalDifficulties={},additionalAnswers={A:0,B:0,C:0,D:0};
for(const question of additional){
  additionalCategories[question.category]=(additionalCategories[question.category]??0)+1;
  additionalDifficulties[question.difficulty]=(additionalDifficulties[question.difficulty]??0)+1;
  additionalAnswers[question.correct_answer]++;
}
assert.deepEqual(additionalCategories,{logical_reasoning:50,quantitative_aptitude:50,english_verbal:50,database_technical:50});
assert.deepEqual(additionalDifficulties,{1:40,2:100,3:60});
assert.deepEqual(additionalAnswers,{A:50,B:50,C:50,D:50});

for(let i=1;i<=20;i++){
  const question=questions.find(item=>item.id===`lr-series-${i}`),a=2+i,b=3+(i%7),second=a+b;
  assert.equal(Number(answer(question)),((second*a+b)*a+b),`${question.id} answer is wrong.`);
}
for(let i=1;i<=20;i++){
  const question=questions.find(item=>item.id===`lr-rank-${i}`),left=1+(i%3);
  assert.equal(Number(answer(question)),left+1,`${question.id} answer is wrong.`);
}
for(let i=1;i<=20;i++){
  const question=questions.find(item=>item.id===`lr-direction-${i}`),y=3+(i%5);
  assert.equal(answer(question),`${2*y+2} m east`,`${question.id} answer is wrong.`);
}
for(let i=1;i<=25;i++){
  const question=questions.find(item=>item.id===`qa-profit-${i}`),cp=100+4*i,markup=20+(i%6)*5,discount=5+(i%4)*5;
  const selling=Math.round(cp*(1+markup/100)*(1-discount/100)*100)/100;
  const profit=Math.round((selling-cp)/cp*10000)/100;
  assert.equal(answer(question),`${profit}%`,`${question.id} answer is wrong.`);
}
for(let i=1;i<=25;i++){
  const question=questions.find(item=>item.id===`qa-work-${i}`),a=8+(i%7),b=10+(i%9),t=1+(i%2);
  const days=Math.round((1-t*(1/a+1/b))*b*100)/100;
  assert(days>0,`${question.id} finishes before A leaves.`);
  assert.equal(answer(question),days.toFixed(2),`${question.id} answer is wrong.`);
}
for(let i=1;i<=20;i++){
  const question=questions.find(item=>item.id===`lr2-arithmetic-${i}`),first=12+i,difference=2+(i%7);
  assert.equal(Number(answer(question)),first+7*difference,`${question.id} answer is wrong.`);
}
for(let i=1;i<=15;i++){
  const question=questions.find(item=>item.id===`lr2-rank-${i}`),total=24+i,top=3+(i%10);
  assert.equal(Number(answer(question)),total-top+1,`${question.id} answer is wrong.`);
}
const codingWords=["MATH","CODE","TEAM","LOGIC","SKILL","TRAIN","LEARN","FOCUS","READY","APPLY","THINK","SOLVE","BUILD","QUERY","VALUE"];
codingWords.forEach((word,index)=>{
  const shift=1+(index%3),expected=[...word].map(char=>String.fromCharCode(65+(char.charCodeAt(0)-65+shift)%26)).join("");
  assert.equal(answer(questions.find(item=>item.id===`lr2-code-${index+1}`)),expected,`lr2-code-${index+1} answer is wrong.`);
});
for(let i=1;i<=15;i++){
  const question=questions.find(item=>item.id===`qa2-interest-${i}`),principal=1000+200*i,rate=5+(i%6),years=2+(i%4);
  assert.equal(answer(question),`INR ${principal*rate*years/100}`,`${question.id} answer is wrong.`);
}
for(let i=1;i<=15;i++){
  const question=questions.find(item=>item.id===`qa2-average-${i}`),start=10+i,step=2+(i%5);
  assert.equal(Number(answer(question)),start+2*step,`${question.id} answer is wrong.`);
}
for(let i=1;i<=10;i++){
  const question=questions.find(item=>item.id===`qa2-ratio-${i}`),left=2+(i%5),units=8+i;
  assert.equal(answer(question),`INR ${left*units}`,`${question.id} answer is wrong.`);
}
for(let i=1;i<=10;i++){
  const question=questions.find(item=>item.id===`qa2-speed-${i}`),speed=35+5*i,hours=2+(i%4);
  assert.equal(answer(question),`${speed*hours} km`,`${question.id} answer is wrong.`);
}

console.log(JSON.stringify({questions:questions.length,categories:counts,difficultyDistribution:difficulties,answerPositions:answers,verifiedGeneratedAnswers:210,curatedLanguageAndTechnical:190}));
