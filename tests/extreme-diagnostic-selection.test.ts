import{describe,expect,it}from"vitest";

const quotas={normal:{quantitative_aptitude:7,logical_reasoning:6,english_verbal:6,database_technical:11},extreme:{quantitative_aptitude:3,logical_reasoning:2,english_verbal:2,database_technical:3}} as const;
function rng(seed:number){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}}
function shuffle<T>(values:T[],random:()=>number){const copy=[...values];for(let index=copy.length-1;index>0;index--){const target=Math.floor(random()*(index+1));[copy[index],copy[target]]=[copy[target],copy[index]]}return copy}
function attempt(seed:number){const random=rng(seed),selected:string[]=[];for(const band of ["normal","extreme"] as const)for(const [category,count]of Object.entries(quotas[band])){const pool=Array.from({length:50},(_,index)=>`${band}-${category}-${index}`);selected.push(...shuffle(pool,random).slice(0,count))}return shuffle(selected,random)}

describe("extreme diagnostic selection",()=>{
 it("builds repeated 40-question attempts with exactly 10 extreme and no duplicates",()=>{for(let seed=1;seed<=100;seed++){const ids=attempt(seed);expect(ids).toHaveLength(40);expect(ids.filter(id=>id.startsWith("extreme-"))).toHaveLength(10);expect(ids.filter(id=>id.startsWith("normal-"))).toHaveLength(30);expect(new Set(ids).size).toBe(40)}});
 it("selects different extreme IDs independently",()=>{expect(attempt(11).filter(id=>id.startsWith("extreme-"))).not.toEqual(attempt(12).filter(id=>id.startsWith("extreme-")))});
 it("preserves the correct answer through option randomization",()=>{const original=["wrong-1","correct","wrong-2","wrong-3"],correct=original[1];for(let seed=1;seed<=100;seed++){const ordered=shuffle(original,rng(seed));const displayLetter="ABCD"[ordered.indexOf(correct)];expect(ordered["ABCD".indexOf(displayLetter)]).toBe(correct)}});
});
