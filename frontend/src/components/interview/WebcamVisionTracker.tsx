import React, { useRef, useEffect, useState } from 'react';
import { Camera, CameraOff, Eye, ShieldCheck, Activity } from 'lucide-react';
import { DeliveryMetrics } from '../../hooks/useDeliveryAnalytics';

interface WebcamVisionTrackerProps {
  isActive: boolean;
  deliveryMetrics: DeliveryMetrics;
  onRecordEyeContact: (score: number) => void;
  onUpdatePosture: (posture: 'attentive' | 'stable' | 'fidgeting') => void;
  className?: string;
}

export const WebcamVisionTracker: React.FC<WebcamVisionTrackerProps> = ({
  isActive,
  deliveryMetrics,
  onRecordEyeContact,
  onUpdatePosture,
  className = '',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [faceDetected, setFaceDetected] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // Initialize and attach camera stream
  useEffect(() => {
    let active = true;

    const startCamera = async () => {
      if (!cameraEnabled) {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user',
          },
          audio: false,
        });

        if (active) {
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
          setPermissionError(null);
        } else {
          stream.getTracks().forEach((t) => t.stop());
        }
      } catch (err: unknown) {
        console.warn('Webcam permission was rejected or unavailable:', err);
        if (active) {
          setPermissionError('Camera access not granted or unavailable.');
          setCameraEnabled(false);
        }
      }
    };

    startCamera();

    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraEnabled]);

  // Optical flow / Face analysis simulation
  useEffect(() => {
    let animId: number;

    const analyzeFrame = () => {
      if (!cameraEnabled || !isActive || !videoRef.current || !canvasRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video.readyState >= 2) {
        canvas.width = 80;
        canvas.height = 60;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(video, 0, 0, 80, 60);

          try {
            const frame = ctx.getImageData(0, 0, 80, 60);
            const data = frame.data;

            // Optical center energy check
            let centerEnergy = 0;
            let totalEnergy = 0;

            for (let y = 15; y < 45; y++) {
              for (let x = 20; x < 60; x++) {
                const idx = (y * 80 + x) * 4;
                const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                centerEnergy += brightness;
              }
            }

            for (let i = 0; i < data.length; i += 4) {
              totalEnergy += (data[i] + data[i + 1] + data[i + 2]) / 3;
            }

            const centerRatio = centerEnergy / (totalEnergy || 1);
            const isEngaged = centerRatio > 0.32;
            setFaceDetected(isEngaged);

            if (isEngaged) {
              onRecordEyeContact(88);
              onUpdatePosture('attentive');
            } else {
              onRecordEyeContact(45);
              onUpdatePosture('fidgeting');
            }
          } catch {
            // Ignore security limits for canvas readback
          }
        }
      }

      animId = requestAnimationFrame(analyzeFrame);
    };

    const interval = setInterval(analyzeFrame, 250);
    return () => {
      clearInterval(interval);
      cancelAnimationFrame(animId);
    };
  }, [cameraEnabled, isActive, onRecordEyeContact, onUpdatePosture]);

  return (
    <div
      className={`relative rounded-2xl overflow-hidden border border-[var(--bento-border)] bg-[var(--bento-bg)] shadow-[var(--bento-shadow)] flex flex-col justify-between ${className}`}
    >
      {/* Top HUD Status Bar */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-3.5 py-2.5 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              cameraEnabled && faceDetected
                ? 'bg-emerald-400 animate-pulse'
                : 'bg-amber-400'
            }`}
          />
          <span className="text-[10px] font-mono tracking-wider text-neutral-300 uppercase">
            Computer Vision HUD
          </span>
        </div>

        <button
          type="button"
          onClick={() => setCameraEnabled(!cameraEnabled)}
          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white transition-colors"
          title={cameraEnabled ? 'Disable Camera' : 'Enable Camera'}
        >
          {cameraEnabled ? <Camera className="w-3.5 h-3.5" /> : <CameraOff className="w-3.5 h-3.5 text-rose-400" />}
        </button>
      </div>

      {/* Video Viewport / Disabled Fallback */}
      <div className="relative flex-1 min-h-[220px] w-full flex items-center justify-center bg-black/60 overflow-hidden">
        {cameraEnabled ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform -scale-x-100"
            />
            {/* Hidden canvas for optical processing */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Face Tracking Target Reticle */}
            {faceDetected && (
              <div className="absolute inset-x-[22%] inset-y-[15%] border border-emerald-400/50 rounded-3xl pointer-events-none transition-all duration-300">
                <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-emerald-400" />
                <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-emerald-400" />
                <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-emerald-400" />
                <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-emerald-400" />

                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent animate-pulse" />
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-center space-y-2">
            <CameraOff className="w-8 h-8 text-neutral-500" />
            <p className="text-xs text-neutral-400 font-mono">
              {permissionError || 'Camera feed disabled.'}
            </p>
            <button
              type="button"
              onClick={() => setCameraEnabled(true)}
              className="text-xs text-emerald-500 hover:underline font-mono"
            >
              Enable camera feed
            </button>
          </div>
        )}
      </div>

      {/* Bottom Live Metrics Overlay Bar */}
      <div className="px-3.5 py-2.5 bg-black/75 border-t border-white/10 grid grid-cols-3 gap-2 text-center text-xs">
        {/* Metric 1: Eye Contact */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1 text-[10px] text-neutral-400 font-mono">
            <Eye className="w-3 h-3 text-emerald-400" />
            <span>Eye Contact</span>
          </div>
          <span className="font-bold text-white font-mono mt-0.5">
            {deliveryMetrics.eyeContactScore}%
          </span>
        </div>

        {/* Metric 2: Filler Words */}
        <div className="flex flex-col items-center border-x border-white/10 px-1">
          <div className="flex items-center gap-1 text-[10px] text-neutral-400 font-mono">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>Fillers</span>
          </div>
          <span
            className={`font-bold font-mono mt-0.5 ${
              deliveryMetrics.fillerRating === 'crisp'
                ? 'text-emerald-400'
                : deliveryMetrics.fillerRating === 'moderate'
                ? 'text-amber-400'
                : 'text-rose-400'
            }`}
          >
            {deliveryMetrics.fillerCount} ({deliveryMetrics.fillerRating})
          </span>
        </div>

        {/* Metric 3: Speaking Tempo */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1 text-[10px] text-neutral-400 font-mono">
            <Activity className="w-3 h-3 text-neutral-300" />
            <span>Pacing</span>
          </div>
          <span className="font-bold text-white font-mono mt-0.5">
            {deliveryMetrics.wpm > 0 ? `${deliveryMetrics.wpm} WPM` : 'Steady'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default WebcamVisionTracker;
