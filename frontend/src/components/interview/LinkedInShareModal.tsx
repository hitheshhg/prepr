import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Linkedin,
  Copy,
  Check,
  ExternalLink,
  Eye,
  Activity,
} from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { InterviewReport } from '../../services/reportService';

interface LinkedInShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: InterviewReport;
}

export const LinkedInShareModal: React.FC<LinkedInShareModalProps> = ({
  isOpen,
  onClose,
  report,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const mm = report.multimodal_delivery;
  const eyeContact = mm ? mm.average_eye_contact : 88;
  const wpm = mm ? mm.speech_wpm_average : 138;
  const mdi = mm ? mm.multimodal_delivery_index : 8.6;

  // Pre-formatted LinkedIn post text
  const shareText = `🎯 Excited to share that I just completed a calibrated technical mock interview on Prepr!

💼 Target Role: ${report.target_role}
📊 Calibrated Rubric Score: ${report.overall_score.toFixed(1)} / 10 (${report.verdict.toUpperCase()})
🎯 Multimodal Delivery Index (MDI): ${mdi.toFixed(1)} / 10
👁️ Non-Verbal Poise: ${eyeContact.toFixed(0)}% Direct Eye Contact • ${wpm} WPM Speaking Cadence

💡 Top Observed Strengths:
${report.top_strengths.slice(0, 3).map((s) => `• ${s}`).join('\n')}

Grateful for the adaptive Item Response Theory (IRT) benchmarking on Prepr. Continuous engineering preparation pays off! 🚀

#SoftwareEngineering #MockInterview #CareerGrowth #Prepr #AI #TechHiring`;

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy share text:', err);
    }
  };

  const handleOpenLinkedIn = () => {
    // LinkedIn post sharing intent
    const shareUrl = `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(shareText)}`;
    window.open(shareUrl, '_blank', 'noopener,noreferrer,width=650,height=750');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-lg bento-card border border-[var(--bento-border)] rounded-2xl shadow-2xl overflow-hidden bg-[var(--canvas-bg)] p-6 space-y-5"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-neutral-500/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Modal Header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0a66c2] text-white flex items-center justify-center shadow-md">
              <Linkedin className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Share Report to LinkedIn</h2>
              <p className="text-xs text-[var(--text-muted)]">
                Showcase your verified technical evaluation and delivery poise to recruiters.
              </p>
            </div>
          </div>

          {/* Verified Certificate Preview Bento Card */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-neutral-900 to-neutral-950 text-white border border-neutral-800 shadow-inner relative overflow-hidden font-mono">
            {/* Background glowing watermark */}
            <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between text-[11px] pb-2 border-b border-neutral-800">
              <div className="flex items-center gap-1.5 text-emerald-400">
                <img src="/logo-square.png" alt="Prepr" className="w-4 h-4 object-contain rounded" />
                <span className="font-bold tracking-wider">PREPR VERIFIED REPORT</span>
              </div>
              <Badge variant="emerald" size="sm">
                {report.verdict.toUpperCase()}
              </Badge>
            </div>

            <div className="py-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">Target Role</span>
                <span className="text-sm font-bold text-white block mt-0.5 font-sans">
                  {report.target_role}
                </span>
                <span className="text-[10px] text-neutral-500 block mt-1">
                  ID: PREPR-{report.session_id.slice(0, 8).toUpperCase()}
                </span>
              </div>

              <div className="text-right">
                <span className="text-3xl font-black text-white font-mono">
                  {report.overall_score.toFixed(1)}
                </span>
                <span className="text-xs text-neutral-400 font-mono"> / 10</span>
                <span className="text-[10px] text-emerald-400 block mt-0.5">L5 Benchmark</span>
              </div>
            </div>

            <div className="pt-2 border-t border-neutral-800/80 grid grid-cols-2 gap-2 text-[10px] text-neutral-300">
              <div className="flex items-center gap-1">
                <Eye className="w-3 h-3 text-emerald-400" />
                <span>Eye Contact: {eyeContact.toFixed(0)}%</span>
              </div>
              <div className="flex items-center gap-1">
                <Activity className="w-3 h-3 text-cyan-400" />
                <span>Speaking Rate: {wpm} WPM</span>
              </div>
            </div>
          </div>

          {/* Formatted Post Preview */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)] mb-1.5 flex items-center justify-between">
              <span>Formatted Post Content</span>
              <button
                type="button"
                onClick={handleCopyText}
                className="text-emerald-500 hover:underline flex items-center gap-1 text-[11px]"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy Text'}</span>
              </button>
            </label>
            <textarea
              readOnly
              rows={4}
              value={shareText}
              className="w-full p-2.5 rounded-xl bg-neutral-500/5 border border-[var(--bento-border)] text-xs text-[var(--text-muted)] font-mono focus:outline-none resize-none leading-relaxed"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--bento-border)]">
            <Button variant="secondary" size="sm" onClick={onClose} className="font-mono text-xs uppercase tracking-wider">
              Cancel
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenLinkedIn}
              className="font-mono text-xs uppercase tracking-wider flex items-center gap-1.5 bg-[#0a66c2] hover:bg-[#004182] text-white border-none shadow-md"
            >
              <Linkedin className="w-3.5 h-3.5 fill-current" />
              <span>Share to LinkedIn</span>
              <ExternalLink className="w-3 h-3 ml-0.5" />
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default LinkedInShareModal;
