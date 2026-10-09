export const INTERVIEW_PRODUCT_CODE="interview-arena-5";
export const INTERVIEW_DURATION_SECONDS=900;
export const MAX_AUDIO_BYTES=12*1024*1024;
export const MAX_RESUME_BYTES=5*1024*1024;
export function interviewProviderConfig(){
 const apiKey=process.env.GROQ_API_KEY;
 if(!apiKey)throw new Error("Interview AI is not configured. Add GROQ_API_KEY.");
 return{apiKey,baseUrl:process.env.GROQ_BASE_URL??"https://api.groq.com/openai/v1",chatModel:process.env.INTERVIEW_CHAT_MODEL??"openai/gpt-oss-20b",transcriptionModel:process.env.INTERVIEW_TRANSCRIPTION_MODEL??"whisper-large-v3-turbo"};
}
