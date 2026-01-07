import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, addDoc, collection, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { uploadToCloudinary, generateInterviewQuestions, requestTranscription, fetchTranscriptText, generateFeedback } from '../services/api';
import { Job, InterviewState } from '../types';
import Recharts from 'recharts'; // Dummy import

// --- Types ---
type WizardStep = 'check-exists' | 'instructions' | 'upload' | 'setup' | 'interview' | 'processing' | 'finish';

const QUESTION_TIME_MS = 2 * 60 * 1000; // 2 minutes

// --- Helper: PDF to PNG ---
const convertPdfToPng = async (file: File): Promise<File> => {
  try {
    const pdfjsLib = await import('pdfjs-dist');
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
    }
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1.0 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error("Canvas context failed");
    await page.render({ canvasContext: context, viewport }).promise;
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(new File([blob], file.name.replace(/\.pdf$/i, '.png'), { type: 'image/png' }));
        else reject(new Error("Canvas conversion failed"));
      }, 'image/png');
    });
  } catch (err) {
    console.error(err);
    throw new Error("PDF conversion failed. Please ensure 'pdfjs-dist' is installed or upload an image.");
  }
};

// --- Component: Tic-Tac-Toe (Glassmorphic & Dark Mode) ---
const TicTacToe: React.FC = () => {
  const [board, setBoard] = useState<(string | null)[]>(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);
  const [winner, setWinner] = useState<string | null>(null);

  const checkWinner = (squares: (string | null)[]) => {
    const lines = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) return squares[a];
    }
    return null;
  };

  const handleClick = (i: number) => {
    if (winner || board[i] || !isXNext) return;
    const newBoard = [...board];
    newBoard[i] = 'X';
    setBoard(newBoard);
    setIsXNext(false);
    const w = checkWinner(newBoard);
    if (w) setWinner(w);
  };

  useEffect(() => {
    if (!isXNext && !winner) {
      const timer = setTimeout(() => {
        const available = board.map((v, i) => v === null ? i : null).filter(v => v !== null);
        if (available.length > 0) {
          const random = available[Math.floor(Math.random() * available.length)];
          const newBoard = [...board];
          newBoard[random as number] = 'O';
          setBoard(newBoard);
          setIsXNext(true);
          const w = checkWinner(newBoard);
          if (w) setWinner(w);
        }
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [isXNext, winner, board]);

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/80 dark:bg-gray-900/90 backdrop-blur-md rounded-xl transition-all duration-300">
      <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
        {winner ? (winner === 'X' ? 'You Won! 🎉' : 'AI Won! 🤖') : (isXNext ? 'Your Turn (X)' : 'AI Thinking...')}
      </h3>
      <div className="grid grid-cols-3 gap-2 mb-6">
        {board.map((cell, i) => (
          <button 
            key={i} 
            onClick={() => handleClick(i)} 
            disabled={!!cell || !!winner || !isXNext} 
            className={`w-20 h-20 text-3xl font-bold flex items-center justify-center rounded-xl shadow-inner transition-all 
              ${cell === 'X' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400' : 
                cell === 'O' ? 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400' : 
                'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700'}`}
          >
            {cell}
          </button>
        ))}
      </div>
      {winner ? (
        <button onClick={() => { setBoard(Array(9).fill(null)); setIsXNext(true); setWinner(null); }} className="bg-primary hover:bg-primary-dark text-white px-6 py-2 rounded-lg font-bold shadow-lg transition-colors">
          Play Again
        </button>
      ) : (
        <p className="text-gray-500 dark:text-gray-400 animate-pulse font-medium">Uploading... Play while you wait!</p>
      )}
    </div>
  );
};

// --- Main Wizard Component ---
const InterviewWizard: React.FC = () => {
  const { jobId } = useParams();
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();

  // Global Interview State
  const [step, setStep] = useState<WizardStep>('check-exists');
  const [job, setJob] = useState<Job | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [interviewState, setInterviewState] = useState<InterviewState>({
    jobId: '', jobTitle: '', jobDescription: '', candidateResumeURL: null, candidateResumeMimeType: null,
    questions: [], answers: [], videoURLs: [], transcriptIds: [], transcriptTexts: [], currentQuestionIndex: 0
  });
  
  const [loadingMsg, setLoadingMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [tabSwitches, setTabSwitches] = useState(0);
  const [speedStatus, setSpeedStatus] = useState<string | null>(null);

  // 1. Init
  useEffect(() => {
    const init = async () => {
      if (!user || !jobId) return;
      try {
        const q = query(collection(db, 'interviews'), where('candidateUID', '==', user.uid), where('jobId', '==', jobId));
        const snap = await getDocs(q);
        if (!snap.empty) {
          alert("Interview already completed.");
          navigate('/candidate/interviews');
          return;
        }
        const jobDoc = await getDoc(doc(db, 'jobs', jobId));
        if (!jobDoc.exists()) throw new Error("Job not found");
        setJob({ id: jobDoc.id, ...jobDoc.data() } as Job);
        setStep('instructions');
      } catch (err) { setErrorMsg("Initialization failed."); }
    };
    init();
  }, [user, jobId, navigate]);

  // 2. Resume Logic
  const handleResumeUpload = async () => {
    if (!resumeFile || !job) return;
    setLoadingMsg("Uploading resume and analyzing profile...");
    setStep('setup'); 

    try {
      let fileToProcess = resumeFile;
      if (resumeFile.type === 'application/pdf') {
        setLoadingMsg("Converting PDF to Image...");
        fileToProcess = await convertPdfToPng(resumeFile);
      }
      const resumeUrl = await uploadToCloudinary(fileToProcess, 'image');
      const reader = new FileReader();
      reader.readAsDataURL(fileToProcess);
      reader.onloadend = async () => {
        try {
          const base64String = (reader.result as string).split(',')[1];
          setLoadingMsg("AI is generating tailored questions... (approx 30s)");
          const questions = await generateInterviewQuestions(
            job.title, job.description, `${userProfile?.experience || 0} years`, base64String, fileToProcess.type
          );
          setInterviewState(prev => ({
            ...prev, jobId: job.id, jobTitle: job.title, jobDescription: job.description, candidateResumeURL: resumeUrl, candidateResumeMimeType: fileToProcess.type,
            questions: questions, answers: Array(questions.length).fill(null), videoURLs: Array(questions.length).fill(null), transcriptIds: Array(questions.length).fill(null), transcriptTexts: Array(questions.length).fill(null),
          }));
          setStep('interview');
        } catch (inner: any) {
          setErrorMsg(`Failed: ${inner.message}`);
          setStep('upload');
        }
      };
    } catch (err: any) { setErrorMsg(err.message); setStep('upload'); }
  };

  const checkSpeed = () => {
    setSpeedStatus("Checking...");
    const start = Date.now();
    const img = new Image();
    img.onload = () => {
      const duration = (Date.now() - start) / 1000;
      const speed = (50 * 8) / duration; 
      setSpeedStatus(speed > 1000 ? "Excellent 🚀" : speed > 500 ? "Good 🟢" : "Weak 🔴");
    };
    img.src = "https://i.ibb.co/3y9DKsB6/Yellow-and-Black-Illustrative-Education-Logo-1.png?t=" + start;
  };

  // --- RENDER ---
  const Container = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 dark:from-gray-900 dark:to-black text-gray-800 dark:text-gray-100 flex flex-col items-center justify-center p-4 transition-colors duration-500">
      {children}
    </div>
  );

  if (step === 'check-exists' || !job) {
    return (
      <Container>
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 border-t-4 border-blue-500 rounded-full animate-spin"></div>
          <div className="absolute inset-3 border-t-4 border-purple-500 rounded-full animate-spin reverse"></div>
        </div>
      </Container>
    );
  }

  if (step === 'instructions') {
    return (
      <Container>
        <div className="max-w-3xl w-full bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700">
          <h2 className="text-3xl font-extrabold text-center mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Ready for your AI Interview?
          </h2>
          <p className="text-center text-gray-500 dark:text-gray-400 mb-8">Role: {job.title}</p>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl flex items-start gap-4">
              <div className="bg-blue-100 dark:bg-blue-800 p-2 rounded-lg text-blue-600 dark:text-blue-300"><i className="fas fa-video text-xl"></i></div>
              <div><h4 className="font-bold">Camera On</h4><p className="text-sm text-gray-600 dark:text-gray-400">Ensure good lighting.</p></div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl flex items-start gap-4">
               <div className="bg-purple-100 dark:bg-purple-800 p-2 rounded-lg text-purple-600 dark:text-purple-300"><i className="fas fa-clock text-xl"></i></div>
               <div><h4 className="font-bold">2 Minutes</h4><p className="text-sm text-gray-600 dark:text-gray-400">Time limit per answer.</p></div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl flex items-start gap-4">
               <div className="bg-green-100 dark:bg-green-800 p-2 rounded-lg text-green-600 dark:text-green-300"><i className="fas fa-brain text-xl"></i></div>
               <div><h4 className="font-bold">AI Generated</h4><p className="text-sm text-gray-600 dark:text-gray-400">Tailored to your resume.</p></div>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl flex items-start gap-4">
               <div className="bg-red-100 dark:bg-red-800 p-2 rounded-lg text-red-600 dark:text-red-300"><i className="fas fa-eye text-xl"></i></div>
               <div><h4 className="font-bold">Proctored</h4><p className="text-sm text-gray-600 dark:text-gray-400">Tab switching is tracked.</p></div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t dark:border-gray-700">
             <button onClick={checkSpeed} className="text-sm font-medium flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors">
               <i className="fas fa-wifi"></i> Check Speed {speedStatus && <span className={`px-2 py-0.5 rounded text-xs ${speedStatus.includes('Excellent') || speedStatus.includes('Good') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{speedStatus}</span>}
             </button>
             <button onClick={() => setStep('upload')} className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:shadow-lg hover:scale-[1.02] transition-all">
               I'm Ready, Let's Go
             </button>
          </div>
        </div>
      </Container>
    );
  }

  if (step === 'upload') {
    return (
      <Container>
        <div className="max-w-md w-full bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700">
          <h2 className="text-2xl font-bold mb-2">Upload Resume</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">We'll scan this to ask you relevant questions.</p>
          
          {errorMsg && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm border border-red-200 dark:border-red-800">{errorMsg}</div>}
          
          <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors mb-6 group">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
               <i className={`fas fa-cloud-upload-alt text-3xl mb-3 ${resumeFile ? 'text-green-500' : 'text-gray-400 group-hover:text-blue-500'}`}></i>
               <p className="text-sm text-gray-500 dark:text-gray-400">{resumeFile ? resumeFile.name : "Click to upload PDF or Image"}</p>
            </div>
            <input type="file" className="hidden" accept="image/*, application/pdf" onChange={(e) => setResumeFile(e.target.files?.[0] || null)} />
          </label>

          <div className="flex justify-between items-center">
            <button onClick={() => setStep('instructions')} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 font-medium">Back</button>
            <button onClick={handleResumeUpload} disabled={!resumeFile} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md">
              Start Interview
            </button>
          </div>
        </div>
      </Container>
    );
  }

  if (step === 'setup' || step === 'processing') {
    return (
      <Container>
        <div className="flex flex-col items-center max-w-md text-center">
           <div className="relative w-24 h-24 mb-6">
             <div className="absolute inset-0 border-4 border-gray-200 dark:border-gray-700 rounded-full"></div>
             <div className="absolute inset-0 border-4 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
             <i className="fas fa-robot absolute inset-0 flex items-center justify-center text-3xl text-gray-400 dark:text-gray-500"></i>
           </div>
           <h3 className="text-xl font-bold text-gray-800 dark:text-white animate-pulse">{loadingMsg}</h3>
           <p className="mt-4 text-gray-500 dark:text-gray-400 italic text-sm">"The first computer mouse was made of wood."</p>
        </div>
      </Container>
    );
  }

  if (step === 'interview') {
    return (
      <ActiveInterviewSession 
        state={interviewState} 
        setState={setInterviewState}
        onFinish={() => setStep('finish')}
        onTabSwitch={() => setTabSwitches(prev => prev + 1)}
      />
    );
  }

  if (step === 'finish') {
    return <InterviewSubmission state={interviewState} tabSwitches={tabSwitches} user={user!} userProfile={userProfile!} />;
  }

  return null;
};

// --- Sub-Component: Active Interview (Immersive) ---
const ActiveInterviewSession: React.FC<{
  state: InterviewState;
  setState: React.Dispatch<React.SetStateAction<InterviewState>>;
  onFinish: () => void;
  onTabSwitch: () => void;
}> = ({ state, setState, onFinish, onTabSwitch }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_MS / 1000);
  const [countdown, setCountdown] = useState(5);
  const [processingVideo, setProcessingVideo] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const currentQ = state.questions[state.currentQuestionIndex];

  // Tab Visibility
  useEffect(() => {
    const handleVisibility = () => { if (document.hidden) onTabSwitch(); };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [onTabSwitch]);

  // Fullscreen Logic to Hide Navbar
  useEffect(() => {
    const enterFullscreen = async () => {
      try {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } catch (e) { console.error("Fullscreen blocked", e); }
    };
    enterFullscreen();
  }, []);

  // Camera
  useEffect(() => {
    const setupCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: true });
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (err) { alert("Camera permission denied. Please allow access."); }
    };
    setupCamera();
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, []);

  // TTS
  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(currentQ);
        window.speechSynthesis.speak(utterance);
      }, 500);
    }
  }, [currentQ]);

  // Auto-Logic
  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(t);
    } else if (countdown === 0 && !isRecording && !processingVideo && !isStopping) {
      startRecording();
    }
  }, [countdown, isRecording, processingVideo, isStopping]);

  useEffect(() => {
    if (isRecording && timeLeft > 0) {
      const t = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearTimeout(t);
    } else if (isRecording && timeLeft === 0) {
      stopRecording();
    }
  }, [isRecording, timeLeft]);

  const startRecording = () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    if (!streamRef.current) return;
    
    const recorder = new MediaRecorder(streamRef.current, { videoBitsPerSecond: 250000 });
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onstop = async () => {
      setProcessingVideo(true);
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      chunksRef.current = [];
      let videoUrl: string | null = null;
      let transcriptId: string | null = null;
      try {
        videoUrl = await uploadToCloudinary(blob, 'video');
        transcriptId = await requestTranscription(videoUrl);
      } catch (err) { console.error("Upload error", err); } 

      const idx = state.currentQuestionIndex;
      const isLast = idx >= state.questions.length - 1;
      
      setState(prev => {
         const newVids = [...prev.videoURLs]; newVids[idx] = videoUrl;
         const newTrans = [...prev.transcriptIds]; newTrans[idx] = transcriptId;
         const newAns = [...prev.answers]; newAns[idx] = "Answered";
         return { ...prev, videoURLs: newVids, transcriptIds: newTrans, answers: newAns, currentQuestionIndex: isLast ? idx : idx + 1 };
      });

      setProcessingVideo(false);
      setIsStopping(false);
      if (isLast) onFinish();
      else {
        setCountdown(5);
        setTimeLeft(QUESTION_TIME_MS / 1000);
      }
    };
    mediaRecorderRef.current = recorder;
    recorder.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      setIsStopping(true);
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // --- ZEN MODE CONTAINER (Hides Navbar via z-index & fixed positioning) ---
  return (
    <div className="fixed inset-0 z-[9999] bg-black text-white flex flex-col items-center justify-center p-4 overflow-hidden">
      
      {/* Header Info */}
      <div className="absolute top-4 left-6 flex items-center gap-4 z-10">
        <div className="flex flex-col">
          <span className="text-gray-400 text-xs uppercase tracking-widest">Question</span>
          <span className="text-xl font-bold">{state.currentQuestionIndex + 1} <span className="text-gray-600 text-lg">/ {state.questions.length}</span></span>
        </div>
      </div>

      <div className="absolute top-4 right-6 z-10">
         <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-mono font-bold ${timeLeft < 30 ? 'bg-red-900/50 text-red-400 border border-red-800' : 'bg-gray-800/50 text-white border border-gray-700'}`}>
           <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`}></div>
           {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
         </div>
      </div>

      {/* Main Video Area */}
      <div className="relative w-full max-w-5xl aspect-video bg-gray-900 rounded-3xl overflow-hidden shadow-2xl border border-gray-800 ring-1 ring-gray-700">
        {processingVideo && <TicTacToe />}
        
        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover transform scale-x-[-1]" />

        {/* Countdown Overlay */}
        {countdown > 0 && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-20">
             <p className="text-gray-300 text-xl font-light mb-2 tracking-widest uppercase">Get Ready</p>
             <span className="text-9xl font-black text-transparent bg-clip-text bg-gradient-to-br from-blue-400 to-purple-500 animate-ping" style={{ animationDuration: '1s' }}>{countdown}</span>
          </div>
        )}
        
        {/* Recording Indicator */}
        {isRecording && (
          <div className="absolute top-6 left-6 flex items-center gap-2 bg-red-600/90 text-white px-3 py-1 rounded text-xs font-bold uppercase tracking-wider shadow-lg animate-pulse">
            <span>REC</span>
          </div>
        )}

        {/* Question Overlay (Bottom) */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-8 pt-20">
           <div className="max-w-4xl mx-auto">
             <h2 className="text-2xl md:text-3xl font-semibold leading-tight text-white drop-shadow-md">{currentQ}</h2>
           </div>
        </div>
      </div>

      {/* Controls */}
      <div className="mt-8 flex gap-4">
         {isRecording ? (
           <button onClick={stopRecording} className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-full font-bold shadow-lg shadow-red-900/20 transform transition hover:scale-105 active:scale-95 flex items-center gap-2">
             <div className="w-3 h-3 bg-white rounded-sm"></div> Stop & Submit
           </button>
         ) : processingVideo || isStopping ? (
           <div className="text-gray-400 animate-pulse flex items-center gap-2">
             <i className="fas fa-circle-notch fa-spin"></i> Processing Answer...
           </div>
         ) : (
           <div className="text-gray-500 text-sm">Waiting for auto-start...</div>
         )}
      </div>
    </div>
  );
};

// --- Submission Screen ---
const InterviewSubmission: React.FC<{
  state: InterviewState;
  tabSwitches: number;
  user: any;
  userProfile: any;
}> = ({ state, tabSwitches, user, userProfile }) => {
  const [status, setStatus] = useState("Finalizing transcripts...");
  const navigate = useNavigate();
  const [factIndex, setFactIndex] = useState(0);
  const facts = [
    "The first computer bug was a real moth.", "Symbolics.com was the first domain.", "NASA's internet is 91 GB/s.",
    "The Firefox logo is a red panda.", "Email existed before the Web."
  ];

  useEffect(() => {
    const i = setInterval(() => setFactIndex(p => (p + 1) % facts.length), 4000);
    return () => clearInterval(i);
  }, [facts.length]);

  useEffect(() => {
    const finalize = async () => {
      try {
        setStatus("Fetching transcripts...");
        const transcriptTexts = await Promise.all(
          state.transcriptIds.map(async (id) => {
            if (!id) return "";
            for (let i = 0; i < 10; i++) {
               await new Promise(r => setTimeout(r, 2000));
               const res = await fetchTranscriptText(id);
               if (res.status === 'completed') return res.text!;
               if (res.status === 'error') return "Error";
            }
            return "";
          })
        );
        
        setStatus("AI Analyzing performance...");
        const resp = await fetch(state.candidateResumeURL!);
        const blob = await resp.blob();
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
            const base64Resume = (reader.result as string).split(',')[1];
            const feedbackRaw = await generateFeedback(
              state.jobTitle, state.jobDescription, `${userProfile.experience} years`, base64Resume, state.candidateResumeMimeType!, state.questions, transcriptTexts
            );
            const parseScore = (regex: RegExp) => (feedbackRaw.match(regex) ? feedbackRaw.match(regex)![1] + "/100" : "N/A");
            
            setStatus("Saving Report...");
            const docRef = await addDoc(collection(db, 'interviews'), {
              ...state, transcriptTexts, feedback: feedbackRaw,
              score: parseScore(/Overall Score:\s*(\d{1,3})/i),
              resumeScore: parseScore(/Resume Score:\s*(\d{1,3})/i),
              qnaScore: parseScore(/Q&A Score:\s*(\d{1,3})/i),
              candidateUID: user.uid, candidateName: userProfile.fullname, candidateEmail: user.email, status: 'Pending', submittedAt: serverTimestamp(), meta: { tabSwitchCount: tabSwitches }
            });
            navigate(`/report/${docRef.id}`);
        };
      } catch (err) { setStatus("Error saving. Please contact support."); }
    };
    finalize();
  }, [state, navigate, user, userProfile, tabSwitches]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
      <div className="relative w-24 h-24 mb-8">
        <div className="absolute inset-0 border-4 border-green-100 dark:border-gray-800 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-t-green-500 border-r-green-400 border-b-transparent border-l-transparent rounded-full animate-spin"></div>
        <i className="fas fa-check absolute inset-0 flex items-center justify-center text-3xl text-green-500"></i>
      </div>
      <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Interview Complete</h2>
      <p className="text-gray-500 dark:text-gray-400 mb-12 animate-pulse">{status}</p>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl max-w-lg text-center border border-gray-100 dark:border-gray-700 shadow-xl">
        <p className="text-xs font-bold text-blue-500 uppercase mb-3 tracking-widest">Tech Fact</p>
        <p className="text-gray-700 dark:text-gray-300 italic text-lg transition-all duration-500">"{facts[factIndex]}"</p>
      </div>
    </div>
  );
};

export default InterviewWizard;