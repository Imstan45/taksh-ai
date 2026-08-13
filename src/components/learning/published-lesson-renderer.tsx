"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Award, Bookmark, Check, ChevronLeft, RotateCcw } from "lucide-react";
import type { PublishedLessonContent } from "@/lib/learning/schema";
import { lessonToCards, type LessonCard } from "@/lib/learning/cards";

type Props = { lesson: { id:string;course:string;module:string;topic:string;subtopic:string;title:string;difficulty:string;content_version:number;progress_percentage:number|null;last_section:string|null;content:PublishedLessonContent }; nextSlug:string|null };

const tone: Record<LessonCard["type"], string> = { goal:"violet",concept:"violet",rule:"blue",method:"blue",example:"emerald",mistake:"amber",memory:"violet",checkpoint:"fuchsia",revision:"emerald" };

export function PublishedLessonRenderer({ lesson, nextSlug }: Props) {
  const cards=useMemo(()=>lessonToCards(lesson.content),[lesson.content]);
  const restored=Math.max(0,cards.findIndex((card)=>card.id===lesson.last_section));
  const [index,setIndex]=useState(restored);
  const [revealed,setRevealed]=useState<Record<string,boolean>>({});
  const [bookmarks,setBookmarks]=useState<Set<string>>(new Set());
  const [completed,setCompleted]=useState(lesson.progress_percentage===100);
  const card=cards[index]; const progress=completed?100:Math.round(((index+1)/cards.length)*95);

  const save=useCallback(async(cardId:string,percentage:number,complete=false)=>{await fetch("/api/learning/progress",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contentId:lesson.id,course:lesson.course,module:lesson.module,topic:lesson.topic,subtopic:lesson.subtopic,contentVersion:lesson.content_version,lastSection:cardId,progressPercentage:percentage,complete})})},[lesson]);
  useEffect(()=>{if(!card||completed)return;const timer=window.setTimeout(()=>void save(card.id,progress),500);return()=>window.clearTimeout(timer)},[card,completed,progress,save]);
  useEffect(()=>{const key=(event:KeyboardEvent)=>{if(event.key==="ArrowRight"&&index<cards.length-1)setIndex(value=>value+1);if(event.key==="ArrowLeft"&&index>0)setIndex(value=>value-1)};window.addEventListener("keydown",key);return()=>window.removeEventListener("keydown",key)},[cards.length,index]);

  async function finish(){await save("revision",100,true);setCompleted(true)}
  function toggleBookmark(){setBookmarks(current=>{const next=new Set(current);if(next.has(card.id))next.delete(card.id);else next.add(card.id);return next})}
  if(!card)return null;
  return <main className="card-lesson-page">
    <header className="card-lesson-header"><Link aria-label="Back to course" href={`/student/courses/${lesson.course.toLowerCase().replaceAll(" ","-")}`}><ChevronLeft/>Course</Link><div><span>{lesson.topic}</span><strong>{index+1} / {cards.length}</strong></div><button aria-label={bookmarks.has(card.id)?"Remove bookmark":"Bookmark card"} className={bookmarks.has(card.id)?"active":""} onClick={toggleBookmark}><Bookmark/></button></header>
    <div className="card-progress" aria-label={`${progress}% complete`}><span style={{width:`${progress}%`}}/></div>
    <section className="card-stage">
      <div className={`learning-card tone-${tone[card.type]}`} key={card.id}>
        <div className="learning-card-top"><p>{card.eyebrow}</p><span>{lesson.difficulty}</span></div>
        <h1>{card.title}</h1><p className="learning-card-body">{card.body}</p>
        {card.points?.length?<ul>{card.points.map((point)=><li key={point}><Check/>{point}</li>)}</ul>:null}
        {card.prompt?<p className="card-prompt">{card.prompt}</p>:null}
        {card.answer&&!revealed[card.id]?<button className="reveal-button" onClick={()=>setRevealed(current=>({...current,[card.id]:true}))}>Reveal answer</button>:null}
        {card.answer&&revealed[card.id]?<div className="card-answer"><small>Answer</small><strong>{card.answer}</strong>{card.explanation?<p>{card.explanation}</p>:null}<button onClick={()=>setRevealed(current=>({...current,[card.id]:false}))}><RotateCcw/>Try again</button></div>:null}
      </div>
    </section>
    <footer className="card-controls"><button className="card-secondary" disabled={index===0} onClick={()=>setIndex(value=>value-1)}><ArrowLeft/>Previous</button>{index<cards.length-1?<button className="card-primary" onClick={()=>setIndex(value=>value+1)}>Next<ArrowRight/></button>:completed?<Link className="card-primary" href={nextSlug?`/student/learn/${nextSlug}`:"/student/courses"}>{nextSlug?"Next lesson":"Courses"}<ArrowRight/></Link>:<button className="card-primary" onClick={()=>void finish()}><Award/>Complete lesson</button>}</footer>
  </main>;
}
