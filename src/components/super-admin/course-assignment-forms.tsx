"use client";
import { useState } from "react";
import { ActionFeedbackForm } from "@/components/feedback/action-feedback-form";
import { courseAudience, type InstitutionType } from "@/lib/institution-content";
type Institution={id:string;name:string;institution_type:InstitutionType}; type Student={id:string;email:string;institution_type:InstitutionType};
export function CourseAssignmentForms({courses,institutions,students,grantAction,assignAction}:{courses:string[];institutions:Institution[];students:Student[];grantAction:(data:FormData)=>Promise<void>;assignAction:(data:FormData)=>Promise<void>}) {
  const [institutionId,setInstitutionId]=useState(""),[studentId,setStudentId]=useState("");
  const institutionType=institutions.find(item=>item.id===institutionId)?.institution_type;
  const studentType=students.find(item=>item.id===studentId)?.institution_type;
  const eligible=(type?:InstitutionType)=>type?courses.filter(course=>courseAudience(course)==="all"||courseAudience(course)===type):[];
  return <div className="grid gap-6 lg:grid-cols-2">
    <ActionFeedbackForm action={grantAction} successMessage="Course access granted successfully." pendingMessage="Granting course access…" className="glass-card space-y-4"><h2 className="text-xl font-semibold">Make course available</h2><select className="field" name="institutionId" required value={institutionId} onChange={e=>setInstitutionId(e.target.value)}><option value="">Choose institution first</option>{institutions.map(item=><option value={item.id} key={item.id}>{item.name} ({item.institution_type})</option>)}</select><select className="field" name="course" required disabled={!institutionType}><option value="">{institutionType?"Choose an eligible course":"Select an institution first"}</option>{eligible(institutionType).map(course=><option key={course}>{course}</option>)}</select><p className="text-xs text-zinc-500">The list automatically follows the institution’s education level.</p><button className="btn-primary">Grant course</button></ActionFeedbackForm>
    <ActionFeedbackForm action={assignAction} successMessage="Course assigned successfully." pendingMessage="Assigning course…" className="glass-card space-y-4"><h2 className="text-xl font-semibold">Assign to student</h2><select className="field" name="studentId" required value={studentId} onChange={e=>setStudentId(e.target.value)}><option value="">Choose student first</option>{students.map(item=><option value={item.id} key={item.id}>{item.email} ({item.institution_type})</option>)}</select><select className="field" name="course" required disabled={!studentType}><option value="">{studentType?"Choose an eligible course":"Select a student first"}</option>{eligible(studentType).map(course=><option key={course}>{course}</option>)}</select><p className="text-xs text-zinc-500">Assigning also makes the selected course available to the student’s institution.</p><button className="btn-primary">Assign course</button></ActionFeedbackForm>
  </div>;
}
