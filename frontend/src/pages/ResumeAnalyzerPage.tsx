import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Sparkles, 
  Check, 
  Plus, 
  Briefcase, 
  Mic,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import ScoreGauge from '../components/ui/ScoreGauge';
import { api } from '../services/api';

interface ATSAnalysis {
  overall_score: number;
  breakdown: {
    keyword_match_score: number;
    section_completeness_score: number;
    formatting_score: number;
    action_verbs_score: number;
    quantifiable_impact_score: number;
  };
  matched_keywords: string[];
  missing_keywords: string[];
  actionable_tips: string[];
  target_role: string;
  parsed_data: {
    candidate_name: string;
    contact?: {
      email?: string;
      phone?: string;
    };
    technical_skills: string[];
    experience: Array<{
      role: string;
      company: string;
    }>;
  };
}

const PRESET_JDS: Record<string, { role: string; jd: string }> = {
  fullstack: {
    role: 'Full Stack Developer',
    jd: `We are looking for a Full Stack Software Engineer proficient in Python, FastAPI, React, TypeScript, and MongoDB Atlas. The candidate will design resilient microservices, build responsive frontend user interfaces, optimize database queries with indexing, and automate Docker deployments. Knowledge of Redis caching and WebSockets is highly desired.`,
  },
  backend: {
    role: 'Backend Systems Engineer',
    jd: `Seeking a Backend Engineer experienced in Python, FastAPI, PostgreSQL, Redis, and distributed systems. Responsible for high-concurrency API architecture, asynchronous worker pools, relational schema optimization, and Docker container orchestration. Experience with Kafka and microservices architecture is preferred.`,
  },
  frontend: {
    role: 'Frontend UI/UX Engineer',
    jd: `Looking for a Senior Frontend Engineer specialized in React 18, TypeScript, Tailwind CSS, and state management. You will construct high-performance web applications, implement micro-interactions using Framer Motion, optimize Lighthouse core web vitals, and integrate WebSocket real-time feeds.`,
  },
};

const SAMPLE_RESUME_TEXT = `Hithesh HG
Full Stack Software Engineer
Email: hitheshhg@gmail.com | Phone: +91 9876543210 | GitHub: github.com/hitheshhg | LinkedIn: linkedin.com/in/hitheshhg

SUMMARY
Results-driven Full Stack Developer with expertise in building scalable, real-time web applications using Python, FastAPI, React, TypeScript, and MongoDB.

TECHNICAL SKILLS
Languages: Python, TypeScript, JavaScript, SQL
Frameworks: FastAPI, React.js, Tailwind CSS, Node.js
Databases & Cloud: MongoDB Atlas, Redis, PostgreSQL, Docker, AWS
Tools: Git, Pytest, WebSockets

EXPERIENCE
Senior Full Stack Developer | Tech Innovations (2023 - Present)
• Architected and deployed microservices backend using FastAPI and MongoDB, handling over 10,000 requests per minute with 99.9% uptime.
• Reduced API endpoint response times by 45% through implementation of Redis caching and compound database indexing strategies.
• Engineered responsive frontend user interfaces with React and TypeScript, boosting user engagement metrics by 30%.
• Automated CI/CD deployment pipelines using Docker and GitHub Actions, cutting release turnaround time from 2 hours to 15 minutes.

PROJECTS
InterviewIQ - Voice AI Mock Interview Platform
• Built real-time WebSocket interview platform with Web Speech API audio processing and Google Gemini structured evaluation.
• Implemented deterministic ATS scoring engine analyzing keyword density, action verbs, and quantified metric achievements.

EDUCATION
Bachelor of Engineering in Computer Science & Engineering (2020 - 2024)
Visvesvaraya Technological University (VTU) | CGPA: 8.9/10`;

export const ResumeAnalyzerPage: React.FC = () => {
  const { token } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [file, setFile] = useState<File | null>(null);
  const [targetRole, setTargetRole] = useState('Full Stack Developer');
  const [jobDescription, setJobDescription] = useState(PRESET_JDS.fullstack.jd);
  const [activePreset, setActivePreset] = useState<string>('fullstack');

  // UI Processing State
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<ATSAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Set Preset JD
  const handleSelectPreset = (key: string) => {
    setActivePreset(key);
    setTargetRole(PRESET_JDS[key].role);
    setJobDescription(PRESET_JDS[key].jd);
  };

  // Drag and Drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelected = (selectedFile: File) => {
    setError(null);
    const validExtensions = ['.pdf', '.docx'];
    const hasValidExt = validExtensions.some((ext) => selectedFile.name.toLowerCase().endsWith(ext));

    if (!hasValidExt) {
      setError('Please upload a PDF or DOCX resume document.');
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('File size exceeds the 5MB limit.');
      return;
    }

    setFile(selectedFile);
  };

  // Submit Upload & Analysis
  const handleAnalyze = async () => {
    setError(null);
    setAnalyzing(true);
    setAnalysis(null);

    try {
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('target_role', targetRole);
        formData.append('job_description', jobDescription);

        const headers: Record<string, string> = { 'Content-Type': 'multipart/form-data' };
        if (token) headers.Authorization = `Bearer ${token}`;

        const res = await api.post('/api/v1/resume/upload', formData, { headers });
        setAnalysis(res.data.ats_analysis);
      } else {
        const params = new URLSearchParams();
        params.append('resume_text', SAMPLE_RESUME_TEXT);
        params.append('target_role', targetRole);
        params.append('job_description', jobDescription);

        const res = await api.post('/api/v1/resume/analyze-text', params);
        setAnalysis(res.data);
      }
    } catch (err: unknown) {
      const errorResponse = err as { response?: { data?: { detail?: string } } };
      setError(
        errorResponse.response?.data?.detail ||
          'Failed to complete resume analysis. Please verify your file format.'
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const handleLoadSampleResume = () => {
    setFile(null);
    handleAnalyze();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="border-b border-[var(--bento-border)] pb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="wix-pill text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Deterministic ATS Engine
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          Resume ATS Scanner
        </h1>
        <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
          Evaluate keyword density, quantified metrics, action verbs, and structural compliance against target job descriptions.
        </p>
      </div>

      {/* Main Form Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        
        {/* Left Column: File Upload Area (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <Card padding="md">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold flex items-center gap-2">
                <FileText className="w-4 h-4 text-[var(--text-main)]" />
                Resume document
              </span>
              <button
                type="button"
                onClick={handleLoadSampleResume}
                className="text-xs font-mono font-medium hover:underline flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Use sample resume
              </button>
            </div>

            {/* Drag & Drop Zone */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
                dragActive
                  ? 'border-neutral-900 dark:border-white bg-neutral-500/10 scale-[1.01]'
                  : file
                  ? 'border-emerald-500/50 bg-emerald-500/5'
                  : 'border-[var(--bento-border)] hover:border-neutral-400 dark:hover:border-neutral-600 bg-neutral-500/[0.02]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileSelected(e.target.files[0])}
              />

              {file ? (
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
                    <Check className="w-6 h-6" />
                  </div>
                  <div className="font-semibold text-sm">{file.name}</div>
                  <div className="text-xs text-[var(--text-muted)] font-mono">
                    {Math.round(file.size / 1024)} KB • Click or drop another file to replace
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-neutral-500/10 text-[var(--text-main)] flex items-center justify-center border border-[var(--bento-border)]">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold">Click to upload</span> or drag and drop
                  </div>
                  <div className="text-xs text-[var(--text-muted)] font-mono">
                    PDF or DOCX documents up to 5MB (Standard fonts recommended)
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-300 text-xs flex items-center gap-2 font-mono">
                <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Target Job Description (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Card padding="md">
            <h3 className="text-sm font-bold mb-2 flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              Target Job Description (JD)
            </h3>

            {/* Presets */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {Object.keys(PRESET_JDS).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleSelectPreset(key)}
                  className={`text-xs px-2.5 py-1 rounded-lg border font-mono transition-colors ${
                    activePreset === key
                      ? 'bg-neutral-900 text-white dark:bg-white dark:text-black border-neutral-900 dark:border-white font-semibold'
                      : 'bg-neutral-500/5 text-[var(--text-muted)] border-[var(--bento-border)] hover:text-[var(--text-main)]'
                  }`}
                >
                  {PRESET_JDS[key].role}
                </button>
              ))}
            </div>

            <textarea
              rows={6}
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste target job description or requirements here..."
              className="w-full p-3 rounded-xl bg-[var(--canvas-bg)] border border-[var(--bento-border)] text-xs text-[var(--text-main)] placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 resize-none font-sans leading-relaxed"
            />

            <Button
              variant="primary"
              size="md"
              loading={analyzing}
              icon={<Sparkles className="w-4 h-4" />}
              onClick={handleAnalyze}
              className="w-full mt-3 font-mono text-xs uppercase tracking-wider"
            >
              {analyzing ? 'Scanning...' : 'Scan resume'}
            </Button>
          </Card>
        </div>

      </div>

      {/* Analysis Results Section */}
      <AnimatePresence>
        {analysis && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Top Score Banner Card */}
            <Card padding="lg">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                
                {/* Score Gauge */}
                <div className="md:col-span-4 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-[var(--bento-border)] pb-6 md:pb-0">
                  <ScoreGauge
                    score={analysis.overall_score}
                    size={200}
                    strokeWidth={14}
                    label="ATS Match Score"
                    sublabel={analysis.target_role}
                  />
                  <div className="mt-4">
                    <Badge variant={analysis.overall_score >= 75 ? 'emerald' : analysis.overall_score >= 50 ? 'cyan' : 'amber'} pulse>
                      {analysis.overall_score >= 75 ? 'Strong Interview Candidate' : analysis.overall_score >= 50 ? 'Moderate Match Rate' : 'Needs Optimization'}
                    </Badge>
                  </div>
                </div>

                {/* Section-Wise Breakdown Progress Bars */}
                <div className="md:col-span-8 space-y-4 text-left">
                  <div>
                    <h3 className="text-lg font-bold">ATS Scoring Breakdown</h3>
                    <p className="text-xs text-[var(--text-muted)] font-mono">
                      Mathematical weights: 35% keywords • 20% sections • 15% metrics • 15% action verbs • 15% formatting
                    </p>
                  </div>

                  <div className="space-y-3 pt-1">
                    {[
                      { name: 'Keyword Match Coverage', score: analysis.breakdown.keyword_match_score },
                      { name: 'Section Completeness', score: analysis.breakdown.section_completeness_score },
                      { name: 'Quantifiable Metrics & Numbers', score: analysis.breakdown.quantifiable_impact_score },
                      { name: 'Technical Action Verbs', score: analysis.breakdown.action_verbs_score },
                      { name: 'Formatting & Contact Info', score: analysis.breakdown.formatting_score },
                    ].map((item) => (
                      <div key={item.name} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium text-[var(--text-main)]">{item.name}</span>
                          <span className="font-mono font-bold">{Math.round(item.score)}%</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-neutral-500/10 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${item.score}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            className="h-full rounded-full bg-neutral-900 dark:bg-white"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </Card>

            {/* Keyword Match Matrix Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
              
              {/* Matched Keywords */}
              <Card padding="md">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">Matched Core Keywords ({analysis.matched_keywords.length})</h4>
                    <p className="text-[11px] text-[var(--text-muted)]">Verified in both resume and target JD</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {analysis.matched_keywords.map((kw) => (
                    <span
                      key={kw}
                      className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono flex items-center gap-1"
                    >
                      <Check className="w-3 h-3 text-emerald-500" />
                      {kw}
                    </span>
                  ))}
                  {analysis.matched_keywords.length === 0 && (
                    <span className="text-xs text-[var(--text-muted)] italic font-mono">No direct keyword overlap detected.</span>
                  )}
                </div>
              </Card>

              {/* Missing Keywords */}
              <Card padding="md">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">Missing Skill Gaps ({analysis.missing_keywords.length})</h4>
                    <p className="text-[11px] text-[var(--text-muted)]">Required by JD; consider integrating where applicable</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {analysis.missing_keywords.map((kw) => (
                    <span
                      key={kw}
                      className="text-xs px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-mono flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3 text-amber-500" />
                      {kw}
                    </span>
                  ))}
                  {analysis.missing_keywords.length === 0 && (
                    <span className="text-xs text-emerald-500 font-mono">Exceptional coverage! No missing required skills.</span>
                  )}
                </div>
              </Card>

            </div>

            {/* Actionable Recommendations */}
            <Card padding="md" className="text-left">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 rounded-lg bg-neutral-500/10 text-[var(--text-main)] border border-[var(--bento-border)]">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold">Actionable Optimization Recommendations</h4>
                  <p className="text-[11px] text-[var(--text-muted)]">Targeted steps to raise your ATS compliance before submitting applications</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {analysis.actionable_tips.map((tip, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-neutral-500/5 border border-[var(--bento-border)] text-xs text-[var(--text-main)] flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-md bg-neutral-900 text-white dark:bg-white dark:text-black flex items-center justify-center font-mono text-[10px] font-bold flex-shrink-0 mt-0.5">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span className="leading-relaxed">{tip}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Gateway CTA to Mock Interview */}
            <Card padding="lg" className="text-center relative overflow-hidden">
              <h3 className="text-lg font-bold tracking-tight">
                Ready to practice live voice roleplay?
              </h3>
              <p className="text-xs text-[var(--text-muted)] max-w-lg mx-auto mt-1">
                Roleplay technical and behavioral questions calibrated to your resume.
              </p>

              <div className="mt-4 flex justify-center">
                <Button
                  size="md"
                  variant="primary"
                  icon={<Mic className="w-4 h-4" />}
                  onClick={() => window.location.href = '/interview'}
                  className="font-mono text-xs uppercase tracking-wider"
                >
                  Start interview <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </Card>

          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default ResumeAnalyzerPage;
