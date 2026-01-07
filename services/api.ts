import { GoogleGenAI } from "@google/genai";

// Config Constants
const ASSEMBLYAI_API_KEY = "4a07d7f7399f447b9ff969c458df945f";
const CLOUDINARY_CLOUD_NAME = "dfp563ini";
const CLOUDINARY_UPLOAD_PRESET = "Ai-interview";

const VIDEO_CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`;
const RESUME_CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
const ASSEMBLYAI_TRANSCRIPT_ENDPOINT = 'https://api.assemblyai.com/v2/transcript';

// --- Gemini API ---
// Note: Client-side API usage is generally insecure for production but maintained here as per legacy code structure.
// Using process.env.API_KEY as per coding guidelines
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

export const generateInterviewQuestions = async (jobTitle: string, jobDescription: string, candidateExp: string, base64Resume: string, mimeType: string) => {
  const prompt = `You are an AI interviewer. Your task is to generate 5 diverse interview questions for a candidate applying for the "${jobTitle}" role.
The job description is: "${jobDescription}"
The candidate's stated experience is: ${candidateExp}.
Review the attached resume image to understand the candidate's background, skills, and experience.
Generate 5 interview questions that are relevant to the job and the candidate's resume.
Instructions:
1. Provide EXACTLY 5 questions.
2. Each question must be on a NEW LINE.
3. DO NOT include numbering (e.g., 1., 2., - ), bullet points (* ), or any introductory/concluding text.
4. Just provide the plain question text, one per line.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Resume
            }
          }
        ]
      }
    });

    const text = response.text || "";
    const cleanText = text.replace(/^\s*[\d\.\-\*\+]+\s*/gm, '').replace(/\*\*/g, '').trim();
    return cleanText.split('\n').map(q => q.trim()).filter(q => q && q.length > 15).slice(0, 5);
  } catch (error: any) {
    console.error("Gemini Generate Questions Error:", error);
    throw new Error(error.message || "Failed to generate questions");
  }
};

export const generateFeedback = async (
  jobTitle: string, 
  jobDescription: string, 
  candidateExp: string, 
  base64Resume: string, 
  mimeType: string,
  questions: string[],
  transcripts: string[]
) => {
  let feedbackPrompt = `You are an AI hiring assistant evaluating a candidate's interview performance for the "${jobTitle}" role.
Job Description: "${jobDescription}"
Candidate Stated Experience: ${candidateExp}
Candidate Resume: [Attached Image]

Interview Questions & Answers:
---\n`;

  questions.forEach((q, i) => {
    const transcript = transcripts[i] || '(Transcription Unavailable)';
    feedbackPrompt += `Question ${i + 1}: ${q}\nAnswer ${i + 1} Transcription: ${transcript}\n---\n`;
  });

  feedbackPrompt += `\n---\nEvaluation Instructions:
Analyze the provided information based on the job description and candidate's resume and transcribed answers.
Provide a structured evaluation covering:
1. **Resume Analysis:** Evaluate how well the candidate's background/skills from the resume align with the job requirements.
2. **Answer Quality:** Analyze the quality of the transcribed answers for clarity, relevance, depth, and communication skills.
3. **Overall Evaluation:** Provide a concise summary.

Finally, provide numerical scores in the specific format "[Score]/100". Ensure scores are integers between 0 and 100.
* **Resume Score:** Assess score based *only* on the resume's relevance.
* **Q&A Score:** Assess score based *only* on the answers.
* **Overall Score:** Weighted score (Resume ~45%, Q&A ~55%).

Output Format (Use Markdown Headings EXACTLY as listed):
**Resume Analysis:**
[Analysis]

**Answer Quality:**
[Analysis]

**Overall Evaluation:**
[Summary]

**Scores:**
Resume Score: [Score]/100
Q&A Score: [Score]/100
Overall Score: [Score]/100`;

  try {
     const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { text: feedbackPrompt },
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Resume
            }
          }
        ]
      }
    });
    return response.text || "AI feedback generation failed.";
  } catch (error: any) {
     console.error("Gemini Feedback Error:", error);
     throw new Error(error.message);
  }
};

// --- Cloudinary ---
export const uploadToCloudinary = async (blob: Blob, resourceType: 'video' | 'image') => {
  const isVideo = resourceType === 'video';
  const uploadUrl = isVideo ? VIDEO_CLOUDINARY_UPLOAD_URL : RESUME_CLOUDINARY_UPLOAD_URL;
  const formData = new FormData();
  formData.append('file', blob);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

  try {
    const response = await fetch(uploadUrl, { method: 'POST', body: formData });
    const data = await response.json();
    if (!response.ok || data.error) throw new Error(data.error?.message || response.statusText);
    return data.secure_url;
  } catch (error: any) {
    console.error("Cloudinary Upload Error:", error);
    throw error;
  }
};

// --- AssemblyAI ---
export const requestTranscription = async (audioUrl: string) => {
  try {
    const response = await fetch(ASSEMBLYAI_TRANSCRIPT_ENDPOINT, {
      method: 'POST',
      headers: { 'authorization': ASSEMBLYAI_API_KEY },
      body: JSON.stringify({ audio_url: audioUrl })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Transcription request failed");
    return data.id;
  } catch (error: any) {
    console.error("AssemblyAI Request Error:", error);
    throw error;
  }
};

export const fetchTranscriptText = async (transcriptId: string) => {
  try {
    const response = await fetch(`${ASSEMBLYAI_TRANSCRIPT_ENDPOINT}/${transcriptId}`, {
      method: 'GET',
      headers: { 'authorization': ASSEMBLYAI_API_KEY }
    });
    const data = await response.json();
    if (data.status === 'completed') return { status: 'completed', text: data.text || '(No speech detected)' };
    if (data.status === 'error') return { status: 'error', text: `Error: ${data.error}` };
    return { status: data.status, text: null }; // queued or processing
  } catch (error: any) {
    return { status: 'error', text: `Error: ${error.message}` };
  }
};