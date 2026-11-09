import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, CameraOff, Eye, ShieldCheck, Activity, Cpu } from 'lucide-react';
import { FaceLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision';
import { DeliveryMetrics } from '../../hooks/useDeliveryAnalytics';

interface WebcamVisionTrackerProps {
  isActive: boolean;
  deliveryMetrics: DeliveryMetrics;
  onRecordEyeContact: (score: number) => void;
  onUpdatePosture: (posture: 'attentive' | 'stable' | 'fidgeting') => void;
  className?: string;
}

interface HeadPose {
  yaw: number;
  pitch: number;
  roll: number;
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
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);

  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [faceLandmarkerLoaded, setFaceLandmarkerLoaded] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [headPose, setHeadPose] = useState<HeadPose>({ yaw: 0, pitch: 0, roll: 0 });
  const [gazeStatus, setGazeStatus] = useState<'optimal' | 'divergent' | 'distracted'>('optimal');
  const [showMeshOverlay, setShowMeshOverlay] = useState(true);

  // 1. Initialize Camera Stream
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
            frameRate: { ideal: 30, max: 30 },
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

  // 2. Initialize MediaPipe Face Landmarker (468-point 3D Mesh + Iris)
  useEffect(() => {
    let isMounted = true;

    const initMediaPipe = async () => {
      try {
        const filesetResolver = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );

        if (!isMounted) return;

        const landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU',
          },
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: true,
          runningMode: 'VIDEO',
          numFaces: 1,
        });

        if (isMounted) {
          landmarkerRef.current = landmarker;
          setFaceLandmarkerLoaded(true);
        }
      } catch (err) {
        console.warn('MediaPipe GPU initialization failed; falling back to CPU or optical tracker:', err);
        try {
          const filesetResolver = await FilesetResolver.forVisionTasks(
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
          );
          if (!isMounted) return;
          const landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
            baseOptions: {
              modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
              delegate: 'CPU',
            },
            outputFaceBlendshapes: true,
            outputFacialTransformationMatrixes: false,
            runningMode: 'VIDEO',
            numFaces: 1,
          });
          if (isMounted) {
            landmarkerRef.current = landmarker;
            setFaceLandmarkerLoaded(true);
          }
        } catch (cpuErr) {
          console.warn('MediaPipe unavailable; using optical brightness fallback:', cpuErr);
        }
      }
    };

    initMediaPipe();

    return () => {
      isMounted = false;
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
        landmarkerRef.current = null;
      }
    };
  }, []);

  // 3. Compute Head Pose (Yaw, Pitch, Roll) from 3D Face Landmarks
  const calculateHeadPose = useCallback((landmarks: Array<{ x: number; y: number; z: number }>): HeadPose => {
    if (!landmarks || landmarks.length < 468) {
      return { yaw: 0, pitch: 0, roll: 0 };
    }

    // Key anatomical landmark points:
    // 1: Nose tip
    // 152: Chin bottom
    // 10: Forehead top
    // 33: Left eye outer corner
    // 263: Right eye outer corner

    const nose = landmarks[1];
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];
    const chin = landmarks[152];
    const forehead = landmarks[10];

    const eyeMidX = (leftEye.x + rightEye.x) / 2;
    const eyeDist = Math.hypot(rightEye.x - leftEye.x, rightEye.y - leftEye.y) || 0.1;

    // Horizontal head turn (Yaw in degrees)
    const deltaX = (nose.x - eyeMidX) / eyeDist;
    const yaw = Math.round(deltaX * 95);

    // Vertical head nod (Pitch in degrees)
    const faceHeight = Math.abs(chin.y - forehead.y) || 0.1;
    const faceMidY = (chin.y + forehead.y) / 2;
    const deltaY = (nose.y - faceMidY) / faceHeight;
    const pitch = Math.round((deltaY - 0.1) * 110);

    // Lateral head tilt (Roll in degrees)
    const roll = Math.round(
      Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x) * (180 / Math.PI)
    );

    return { yaw, pitch, roll };
  }, []);

  // 4. Real-time Optical Analysis & Landmark Rendering Loop
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !cameraEnabled) return;

    let isSubscribed = true;

    const renderLoop = () => {
      if (!isSubscribed) return;

      if (video.readyState >= 2 && video.currentTime !== lastVideoTimeRef.current) {
        lastVideoTimeRef.current = video.currentTime;

        const width = video.videoWidth || 640;
        const height = video.videoHeight || 480;

        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
        }

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, width, height);

          // A. MediaPipe High-Precision 468-Point Mesh Mode
          if (landmarkerRef.current && faceLandmarkerLoaded) {
            try {
              const startTimeMs = performance.now();
              const results = landmarkerRef.current.detectForVideo(video, startTimeMs);

              if (results.faceLandmarks && results.faceLandmarks.length > 0) {
                const landmarks = results.faceLandmarks[0];
                setFaceDetected(true);

                const pose = calculateHeadPose(landmarks);
                setHeadPose(pose);

                // Gaze & Eye Contact Metrics
                const absYaw = Math.abs(pose.yaw);
                const absPitch = Math.abs(pose.pitch);

                let gaze: 'optimal' | 'divergent' | 'distracted' = 'optimal';
                let eyeScore = 94;

                if (absYaw < 12 && absPitch < 10) {
                  gaze = 'optimal';
                  eyeScore = Math.max(88, 96 - absYaw);
                  onUpdatePosture('attentive');
                } else if (absYaw < 24 && absPitch < 18) {
                  gaze = 'divergent';
                  eyeScore = Math.max(60, 85 - absYaw * 1.5);
                  onUpdatePosture('stable');
                } else {
                  gaze = 'distracted';
                  eyeScore = Math.max(35, 60 - absYaw * 2);
                  onUpdatePosture('fidgeting');
                }

                setGazeStatus(gaze);
                if (isActive) {
                  onRecordEyeContact(Math.round(eyeScore));
                }

                // Render High-Tech Biometric HUD on Canvas
                if (showMeshOverlay) {
                  const drawingUtils = new DrawingUtils(ctx);

                  // 1. Subtle Face Oval Boundary
                  drawingUtils.drawConnectors(
                    landmarks,
                    FaceLandmarker.FACE_LANDMARKS_FACE_OVAL,
                    { color: 'rgba(16, 185, 129, 0.45)', lineWidth: 1.2 }
                  );

                  // 2. Eyes & Eyebrow Contours
                  drawingUtils.drawConnectors(
                    landmarks,
                    FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE,
                    { color: 'rgba(56, 189, 248, 0.65)', lineWidth: 1.2 }
                  );
                  drawingUtils.drawConnectors(
                    landmarks,
                    FaceLandmarker.FACE_LANDMARKS_LEFT_EYE,
                    { color: 'rgba(56, 189, 248, 0.65)', lineWidth: 1.2 }
                  );
                  drawingUtils.drawConnectors(
                    landmarks,
                    FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW,
                    { color: 'rgba(16, 185, 129, 0.4)', lineWidth: 1 }
                  );
                  drawingUtils.drawConnectors(
                    landmarks,
                    FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW,
                    { color: 'rgba(16, 185, 129, 0.4)', lineWidth: 1 }
                  );

                  // 3. Lips Contour
                  drawingUtils.drawConnectors(
                    landmarks,
                    FaceLandmarker.FACE_LANDMARKS_LIPS,
                    { color: 'rgba(16, 185, 129, 0.35)', lineWidth: 1 }
                  );

                  // 4. Iris Pupils
                  drawingUtils.drawConnectors(
                    landmarks,
                    FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS,
                    { color: '#10b981', lineWidth: 2 }
                  );
                  drawingUtils.drawConnectors(
                    landmarks,
                    FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS,
                    { color: '#10b981', lineWidth: 2 }
                  );

                  // 5. 3D Gaze Orientation Target Reticle at Nose Tip
                  const noseTip = landmarks[1];
                  const nx = noseTip.x * width;
                  const ny = noseTip.y * height;

                  ctx.save();
                  ctx.strokeStyle = gaze === 'optimal' ? '#10b981' : gaze === 'divergent' ? '#f59e0b' : '#f43f5e';
                  ctx.lineWidth = 1.5;
                  ctx.beginPath();
                  ctx.arc(nx, ny, 8, 0, 2 * Math.PI);
                  ctx.stroke();

                  // Direction vector line
                  ctx.beginPath();
                  ctx.moveTo(nx, ny);
                  ctx.lineTo(nx + pose.yaw * 1.5, ny + pose.pitch * 1.5);
                  ctx.stroke();
                  ctx.restore();
                }
              } else {
                setFaceDetected(false);
                if (isActive) {
                  onRecordEyeContact(40);
                  onUpdatePosture('fidgeting');
                }
              }
            } catch {
              // Frame dropped or busy
            }
          }
          // B. Fast Optical Energy Fallback (Before MediaPipe initializes)
          else {
            try {
              ctx.drawImage(video, 0, 0, 80, 60);
              const frame = ctx.getImageData(0, 0, 80, 60);
              const data = frame.data;
              let centerEnergy = 0;
              let totalEnergy = 0;

              for (let y = 15; y < 45; y++) {
                for (let x = 20; x < 60; x++) {
                  const idx = (y * 80 + x) * 4;
                  centerEnergy += (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                }
              }
              for (let i = 0; i < data.length; i += 4) {
                totalEnergy += (data[i] + data[i + 1] + data[i + 2]) / 3;
              }

              const isEngaged = centerEnergy / (totalEnergy || 1) > 0.32;
              setFaceDetected(isEngaged);
              if (isActive) {
                onRecordEyeContact(isEngaged ? 88 : 45);
                onUpdatePosture(isEngaged ? 'attentive' : 'stable');
              }
            } catch {
              // Canvas security policy fallback
            }
          }
        }
      }

      animFrameIdRef.current = requestAnimationFrame(renderLoop);
    };

    animFrameIdRef.current = requestAnimationFrame(renderLoop);

    return () => {
      isSubscribed = false;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [cameraEnabled, faceLandmarkerLoaded, isActive, calculateHeadPose, onRecordEyeContact, onUpdatePosture, showMeshOverlay]);

  return (
    <div
      className={`relative rounded-2xl overflow-hidden border border-[var(--bento-border)] bg-[var(--bento-bg)] shadow-[var(--bento-shadow)] flex flex-col justify-between ${className}`}
    >
      {/* Top HUD Status Bar */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-3.5 py-2.5 bg-gradient-to-b from-black/85 via-black/50 to-transparent">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              cameraEnabled && faceDetected
                ? 'bg-emerald-400 animate-pulse'
                : 'bg-amber-400'
            }`}
          />
          <span className="text-[10px] font-mono tracking-wider text-neutral-300 uppercase flex items-center gap-1.5">
            <span>Vision HUD</span>
            {faceLandmarkerLoaded ? (
              <span className="text-emerald-400 font-semibold">• 468p 3D Mesh</span>
            ) : (
              <span className="text-neutral-400 flex items-center gap-1">
                <Cpu className="w-3 h-3 animate-spin" /> Loading Model...
              </span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {faceLandmarkerLoaded && (
            <button
              type="button"
              onClick={() => setShowMeshOverlay(!showMeshOverlay)}
              className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                showMeshOverlay
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-white/10 text-neutral-400 border border-white/10'
              }`}
              title="Toggle 3D mesh wireframe display"
            >
              Mesh
            </button>
          )}

          <button
            type="button"
            onClick={() => setCameraEnabled(!cameraEnabled)}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white transition-colors"
            title={cameraEnabled ? 'Disable Camera' : 'Enable Camera'}
          >
            {cameraEnabled ? <Camera className="w-3.5 h-3.5" /> : <CameraOff className="w-3.5 h-3.5 text-rose-400" />}
          </button>
        </div>
      </div>

      {/* Video Viewport with Live Canvas Overlay */}
      <div className="relative flex-1 min-h-[220px] w-full flex items-center justify-center bg-black overflow-hidden">
        {cameraEnabled ? (
          <>
            {/* Raw Webcam Stream (mirrored horizontally) */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform -scale-x-100"
            />

            {/* 3D Landmarks & Reticle Canvas (mirrored to match video) */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full object-cover pointer-events-none transform -scale-x-100"
            />

            {/* Live Head Pose & Gaze HUD Pill */}
            {faceDetected && (
              <div className="absolute bottom-2 left-2 z-20 px-2.5 py-1 rounded-xl bg-black/75 border border-white/15 backdrop-blur-md font-mono text-[10px] text-neutral-300 flex items-center gap-2 select-none shadow-lg">
                <span className="flex items-center gap-1">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      gazeStatus === 'optimal'
                        ? 'bg-emerald-400 animate-pulse'
                        : gazeStatus === 'divergent'
                        ? 'bg-amber-400'
                        : 'bg-rose-400'
                    }`}
                  />
                  <span className="uppercase font-semibold">
                    {gazeStatus === 'optimal' ? 'Direct Contact' : gazeStatus === 'divergent' ? 'Slight Angle' : 'Averted Gaze'}
                  </span>
                </span>
                <span className="text-neutral-500">•</span>
                <span className="text-neutral-400">
                  Y:{headPose.yaw > 0 ? `+${headPose.yaw}` : headPose.yaw}° P:{headPose.pitch > 0 ? `+${headPose.pitch}` : headPose.pitch}° R:{headPose.roll > 0 ? `+${headPose.roll}` : headPose.roll}°
                </span>
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
      <div className="px-3.5 py-2.5 bg-black/85 border-t border-white/10 grid grid-cols-3 gap-2 text-center text-xs">
        {/* Metric 1: Eye Contact */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1 text-[10px] text-neutral-400 font-mono">
            <Eye className="w-3.5 h-3.5 text-emerald-400" />
            <span>Eye Contact</span>
          </div>
          <span className="font-bold text-white font-mono mt-0.5">
            {deliveryMetrics.eyeContactScore}%
          </span>
        </div>

        {/* Metric 2: Speech Fillers */}
        <div className="flex flex-col items-center border-x border-white/10 px-1">
          <div className="flex items-center gap-1 text-[10px] text-neutral-400 font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
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
            <Activity className="w-3.5 h-3.5 text-neutral-300" />
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
