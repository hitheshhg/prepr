import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, CameraOff, Eye, ShieldCheck, Activity, Cpu, Sparkles, RefreshCw } from 'lucide-react';
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

// Module-level cache so FaceLandmarker persists across component unmounts/remounts
let cachedLandmarker: FaceLandmarker | null = null;
let cachedResolver: any = null;
let landmarkerLoadingPromise: Promise<FaceLandmarker | null> | null = null;

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
  const animFrameIdRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number>(0);
  const lastTelemetryTimeRef = useRef<number>(0);

  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [demoMode, setDemoMode] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [modelStatus, setModelStatus] = useState<'loading' | 'ready-gpu' | 'ready-cpu' | 'optical-fallback'>('loading');
  const [faceDetected, setFaceDetected] = useState(false);
  const [headPose, setHeadPose] = useState<HeadPose>({ yaw: 0, pitch: 0, roll: 0 });
  const [gazeStatus, setGazeStatus] = useState<'optimal' | 'divergent' | 'distracted'>('optimal');
  const [showMeshOverlay, setShowMeshOverlay] = useState(true);

  // Keep callback refs so render loop doesn't re-create on each prop change
  const onRecordEyeContactRef = useRef(onRecordEyeContact);
  onRecordEyeContactRef.current = onRecordEyeContact;

  const onUpdatePostureRef = useRef(onUpdatePosture);
  onUpdatePostureRef.current = onUpdatePosture;

  const isActiveRef = useRef(isActive);
  isActiveRef.current = isActive;

  // 1. Initialize MediaPipe Face Landmarker (Offline local /wasm & model, with CDN failover)
  useEffect(() => {
    let isMounted = true;

    const loadLandmarker = async (): Promise<FaceLandmarker | null> => {
      if (cachedLandmarker) {
        if (isMounted) setModelStatus('ready-gpu');
        return cachedLandmarker;
      }

      if (landmarkerLoadingPromise) {
        const lm = await landmarkerLoadingPromise;
        if (isMounted && lm) setModelStatus('ready-gpu');
        return lm;
      }

      landmarkerLoadingPromise = (async () => {
        // Step A: Load WASM binaries (try local /wasm first, fallback to pinned 1.2.2 CDN)
        let resolver = cachedResolver;
        if (!resolver) {
          try {
            resolver = await FilesetResolver.forVisionTasks('/wasm');
            cachedResolver = resolver;
          } catch (e1) {
            console.warn('[WebcamVision] Local /wasm load failed, falling back to CDN...', e1);
            try {
              resolver = await FilesetResolver.forVisionTasks(
                'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.2/wasm'
              );
              cachedResolver = resolver;
            } catch (e2) {
              console.warn('[WebcamVision] CDN wasm load failed; optical tracker active:', e2);
              return null;
            }
          }
        }

        // Step B: Initialize FaceLandmarker with GPU first, then CPU
        const modelPaths = [
          '/models/face_landmarker.task',
          'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
        ];

        for (const modelPath of modelPaths) {
          try {
            const lm = await FaceLandmarker.createFromOptions(resolver, {
              baseOptions: {
                modelAssetPath: modelPath,
                delegate: 'GPU',
              },
              outputFaceBlendshapes: true,
              outputFacialTransformationMatrixes: true,
              runningMode: 'VIDEO',
              numFaces: 1,
            });
            cachedLandmarker = lm;
            if (isMounted) setModelStatus('ready-gpu');
            return lm;
          } catch (gpuErr) {
            console.warn(`[WebcamVision] GPU delegate failed for ${modelPath}, trying CPU...`, gpuErr);
            try {
              const lmCpu = await FaceLandmarker.createFromOptions(resolver, {
                baseOptions: {
                  modelAssetPath: modelPath,
                  delegate: 'CPU',
                },
                outputFaceBlendshapes: true,
                outputFacialTransformationMatrixes: false,
                runningMode: 'VIDEO',
                numFaces: 1,
              });
              cachedLandmarker = lmCpu;
              if (isMounted) setModelStatus('ready-cpu');
              return lmCpu;
            } catch (cpuErr) {
              console.warn(`[WebcamVision] CPU delegate failed for ${modelPath}:`, cpuErr);
            }
          }
        }

        return null;
      })();

      const result = await landmarkerLoadingPromise;
      if (isMounted) {
        if (result) {
          setModelStatus((prev) => (prev === 'loading' ? 'ready-gpu' : prev));
        } else {
          setModelStatus('optical-fallback');
        }
      }
      return result;
    };

    loadLandmarker();

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Camera Stream Lifecycle Management
  useEffect(() => {
    let active = true;

    if (demoMode) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setPermissionError(null);
      return;
    }

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

    const startCamera = async () => {
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

        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        setPermissionError(null);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            if (active && videoRef.current) {
              videoRef.current.play().catch((playErr) => {
                console.warn('[WebcamVision] Video auto-play blocked or failed:', playErr);
              });
            }
          };
          // Also call play immediately
          videoRef.current.play().catch(() => {});
        }
      } catch (err: any) {
        console.warn('[WebcamVision] Webcam permission denied or unavailable:', err);
        if (active) {
          const msg =
            err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError'
              ? 'Camera permission denied. Click "Enable Camera" and allow browser access.'
              : err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError'
              ? 'No camera found. Try Demo Mode below to test the Vision HUD.'
              : 'Camera in use or unavailable. Check browser permissions or try Demo Mode.';
          setPermissionError(msg);
          setCameraEnabled(false);
        }
      }
    };

    startCamera();

    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [cameraEnabled, demoMode]);

  // 3. Compute Head Pose (Yaw, Pitch, Roll) from 3D Face Landmarks
  const calculateHeadPose = useCallback((landmarks: Array<{ x: number; y: number; z: number }>): HeadPose => {
    if (!landmarks || landmarks.length < 468) {
      return { yaw: 0, pitch: 0, roll: 0 };
    }

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

  // 4. Main Optical & MediaPipe Landmark Analysis Render Loop
  useEffect(() => {
    let isSubscribed = true;

    const renderLoop = () => {
      if (!isSubscribed) return;

      const canvas = canvasRef.current;
      const video = videoRef.current;

      // DEMO / SIMULATION MODE
      if (demoMode) {
        if (canvas) {
          const width = 640;
          const height = 480;
          if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
          }

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, width, height);

            const now = performance.now();
            // Gentle procedural head movement
            const simYaw = Math.round(Math.sin(now * 0.0012) * 8);
            const simPitch = Math.round(Math.cos(now * 0.0009) * 5);
            const simRoll = Math.round(Math.sin(now * 0.0007) * 3);
            const pose = { yaw: simYaw, pitch: simPitch, roll: simRoll };

            setHeadPose(pose);
            setFaceDetected(true);
            setGazeStatus('optimal');

            // Draw high-tech biometric wireframe on dark backdrop
            ctx.save();
            ctx.fillStyle = '#090a0f';
            ctx.fillRect(0, 0, width, height);

            // Subtle cyber grid lines
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
            ctx.lineWidth = 1;
            for (let x = 40; x < width; x += 40) {
              ctx.beginPath();
              ctx.moveTo(x, 0);
              ctx.lineTo(x, height);
              ctx.stroke();
            }
            for (let y = 40; y < height; y += 40) {
              ctx.beginPath();
              ctx.moveTo(0, y);
              ctx.lineTo(width, y);
              ctx.stroke();
            }

            const cx = width / 2 + simYaw * 2;
            const cy = height / 2 + simPitch * 2;

            // Face Oval Contour
            ctx.strokeStyle = 'rgba(16, 185, 129, 0.65)';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.ellipse(cx, cy - 10, 85, 120, (simRoll * Math.PI) / 180, 0, 2 * Math.PI);
            ctx.stroke();

            // Eye Contours
            const eyeSpacing = 42;
            const eyeY = cy - 22;
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
            ctx.lineWidth = 1.4;

            // Left Eye
            ctx.beginPath();
            ctx.ellipse(cx - eyeSpacing, eyeY, 18, 9, 0, 0, 2 * Math.PI);
            ctx.stroke();
            ctx.fillStyle = '#10b981';
            ctx.beginPath();
            ctx.arc(cx - eyeSpacing + simYaw * 0.3, eyeY + simPitch * 0.3, 4, 0, 2 * Math.PI);
            ctx.fill();

            // Right Eye
            ctx.beginPath();
            ctx.ellipse(cx + eyeSpacing, eyeY, 18, 9, 0, 0, 2 * Math.PI);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(cx + eyeSpacing + simYaw * 0.3, eyeY + simPitch * 0.3, 4, 0, 2 * Math.PI);
            ctx.fill();

            // Nose Reticle
            const noseX = cx + simYaw * 0.8;
            const noseY = cy + 18;
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(noseX, noseY, 8, 0, 2 * Math.PI);
            ctx.stroke();

            // Gaze Vector
            ctx.beginPath();
            ctx.moveTo(noseX, noseY);
            ctx.lineTo(noseX + simYaw * 2, noseY + simPitch * 2);
            ctx.stroke();

            // Lips Outline
            ctx.strokeStyle = 'rgba(16, 185, 129, 0.5)';
            ctx.beginPath();
            ctx.ellipse(cx, cy + 62, 34, 12, 0, 0, 2 * Math.PI);
            ctx.stroke();

            ctx.restore();

            // Emit live telemetry at 2.5Hz
            if (now - lastTelemetryTimeRef.current > 400) {
              lastTelemetryTimeRef.current = now;
              if (isActiveRef.current) {
                onRecordEyeContactRef.current(94);
                onUpdatePostureRef.current('attentive');
              }
            }
          }
        }

        animFrameIdRef.current = requestAnimationFrame(renderLoop);
        return;
      }

      // LIVE CAMERA FEED MODE
      if (!cameraEnabled || !video || !canvas) {
        animFrameIdRef.current = requestAnimationFrame(renderLoop);
        return;
      }

      if (video.readyState >= 2) {
        const width = video.videoWidth || 640;
        const height = video.videoHeight || 480;

        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
        }

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, width, height);

          // Path A: MediaPipe 468-point 3D Landmarker Detection
          if (cachedLandmarker) {
            try {
              const now = performance.now();
              const startTimeMs = Math.max(now, (lastTimestampRef.current || 0) + 1);
              lastTimestampRef.current = startTimeMs;

              const results = cachedLandmarker.detectForVideo(video, startTimeMs);

              if (results.faceLandmarks && results.faceLandmarks.length > 0) {
                const landmarks = results.faceLandmarks[0];
                setFaceDetected(true);

                const pose = calculateHeadPose(landmarks);
                setHeadPose(pose);

                const absYaw = Math.abs(pose.yaw);
                const absPitch = Math.abs(pose.pitch);

                let gaze: 'optimal' | 'divergent' | 'distracted' = 'optimal';
                let eyeScore = 95;
                let posture: 'attentive' | 'stable' | 'fidgeting' = 'attentive';

                if (absYaw < 12 && absPitch < 10) {
                  gaze = 'optimal';
                  eyeScore = Math.max(88, 96 - absYaw);
                  posture = 'attentive';
                } else if (absYaw < 24 && absPitch < 18) {
                  gaze = 'divergent';
                  eyeScore = Math.max(60, 85 - absYaw * 1.5);
                  posture = 'stable';
                } else {
                  gaze = 'distracted';
                  eyeScore = Math.max(35, 60 - absYaw * 2);
                  posture = 'fidgeting';
                }

                setGazeStatus(gaze);

                // Throttled telemetry emission
                if (now - lastTelemetryTimeRef.current > 400) {
                  lastTelemetryTimeRef.current = now;
                  if (isActiveRef.current) {
                    onRecordEyeContactRef.current(Math.round(eyeScore));
                    onUpdatePostureRef.current(posture);
                  }
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
                  ctx.strokeStyle =
                    gaze === 'optimal'
                      ? '#10b981'
                      : gaze === 'divergent'
                      ? '#f59e0b'
                      : '#f43f5e';
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
                const now = performance.now();
                if (now - lastTelemetryTimeRef.current > 400) {
                  lastTelemetryTimeRef.current = now;
                  if (isActiveRef.current) {
                    onRecordEyeContactRef.current(45);
                    onUpdatePostureRef.current('fidgeting');
                  }
                }
              }
            } catch (inferErr) {
              // Frame dropped or busy
            }
          }
          // Path B: Real-time Optical Vision Fallback (Instant when MediaPipe is loading)
          else {
            try {
              // Analyze center quadrant energy & presence
              const sampleW = 64;
              const sampleH = 48;
              const offCanvas = document.createElement('canvas');
              offCanvas.width = sampleW;
              offCanvas.height = sampleH;
              const offCtx = offCanvas.getContext('2d');

              if (offCtx) {
                offCtx.drawImage(video, 0, 0, sampleW, sampleH);
                const imgData = offCtx.getImageData(0, 0, sampleW, sampleH);
                const d = imgData.data;

                let centerSum = 0;
                let edgeSum = 0;

                for (let y = 10; y < 38; y++) {
                  for (let x = 16; x < 48; x++) {
                    const idx = (y * sampleW + x) * 4;
                    centerSum += (d[idx] + d[idx + 1] + d[idx + 2]) / 3;
                  }
                }
                for (let y = 0; y < sampleH; y += 4) {
                  for (let x = 0; x < sampleW; x += 4) {
                    const idx = (y * sampleW + x) * 4;
                    edgeSum += (d[idx] + d[idx + 1] + d[idx + 2]) / 3;
                  }
                }

                const ratio = centerSum / Math.max(1, edgeSum * 3.5);
                const isEngaged = ratio > 0.65;
                setFaceDetected(isEngaged);

                const now = performance.now();
                if (now - lastTelemetryTimeRef.current > 400) {
                  lastTelemetryTimeRef.current = now;
                  if (isActiveRef.current) {
                    onRecordEyeContactRef.current(isEngaged ? 92 : 55);
                    onUpdatePostureRef.current(isEngaged ? 'attentive' : 'stable');
                  }
                }

                // Render High-Tech Optical Target Box on Video
                if (isEngaged && showMeshOverlay) {
                  const boxW = width * 0.42;
                  const boxH = height * 0.58;
                  const bx = (width - boxW) / 2;
                  const by = (height - boxH) / 2;

                  ctx.save();
                  ctx.strokeStyle = '#10b981';
                  ctx.lineWidth = 1.5;

                  // Corner brackets
                  const corner = 20;
                  // Top Left
                  ctx.beginPath();
                  ctx.moveTo(bx, by + corner);
                  ctx.lineTo(bx, by);
                  ctx.lineTo(bx + corner, by);
                  ctx.stroke();
                  // Top Right
                  ctx.beginPath();
                  ctx.moveTo(bx + boxW - corner, by);
                  ctx.lineTo(bx + boxW, by);
                  ctx.lineTo(bx + boxW, by + corner);
                  ctx.stroke();
                  // Bottom Left
                  ctx.beginPath();
                  ctx.moveTo(bx, by + boxH - corner);
                  ctx.lineTo(bx, by + boxH);
                  ctx.lineTo(bx + corner, by + boxH);
                  ctx.stroke();
                  // Bottom Right
                  ctx.beginPath();
                  ctx.moveTo(bx + boxW - corner, by + boxH);
                  ctx.lineTo(bx + boxW, by + boxH);
                  ctx.lineTo(bx + boxW, by + boxH - corner);
                  ctx.stroke();

                  // Center Eye Crosshair
                  const eyeCenterY = by + boxH * 0.35;
                  ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
                  ctx.beginPath();
                  ctx.arc(width / 2, eyeCenterY, 12, 0, 2 * Math.PI);
                  ctx.stroke();

                  ctx.restore();
                }
              }
            } catch (err) {
              // Frame dropped
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
  }, [cameraEnabled, demoMode, calculateHeadPose, showMeshOverlay]);

  return (
    <div
      className={`relative rounded-2xl overflow-hidden border border-[var(--bento-border)] bg-[var(--bento-bg)] shadow-[var(--bento-shadow)] flex flex-col justify-between ${className}`}
    >
      {/* Top HUD Status Bar */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-3.5 py-2.5 bg-gradient-to-b from-black/85 via-black/50 to-transparent">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              (cameraEnabled || demoMode) && faceDetected
                ? 'bg-emerald-400 animate-pulse'
                : 'bg-amber-400'
            }`}
          />
          <span className="text-[10px] font-mono tracking-wider text-neutral-300 uppercase flex items-center gap-1.5">
            <span>Vision HUD</span>
            {demoMode ? (
              <span className="text-sky-400 font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-sky-400" /> Demo Simulator
              </span>
            ) : modelStatus === 'ready-gpu' ? (
              <span className="text-emerald-400 font-semibold">• 468p 3D Mesh (GPU)</span>
            ) : modelStatus === 'ready-cpu' ? (
              <span className="text-emerald-400 font-semibold">• 468p 3D Mesh (CPU)</span>
            ) : modelStatus === 'optical-fallback' ? (
              <span className="text-emerald-400 font-semibold">• Optical Tracker</span>
            ) : (
              <span className="text-neutral-400 flex items-center gap-1">
                <Cpu className="w-3 h-3 animate-spin" /> Initializing HUD...
              </span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowMeshOverlay(!showMeshOverlay)}
            className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
              showMeshOverlay
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-white/10 text-neutral-400 border border-white/10'
            }`}
            title="Toggle biometric wireframe overlay"
          >
            HUD
          </button>

          {!demoMode && (
            <button
              type="button"
              onClick={() => setCameraEnabled(!cameraEnabled)}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white transition-colors"
              title={cameraEnabled ? 'Disable Camera' : 'Enable Camera'}
            >
              {cameraEnabled ? (
                <Camera className="w-3.5 h-3.5" />
              ) : (
                <CameraOff className="w-3.5 h-3.5 text-rose-400" />
              )}
            </button>
          )}

          {demoMode && (
            <button
              type="button"
              onClick={() => {
                setDemoMode(false);
                setCameraEnabled(true);
              }}
              className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/15 text-white hover:bg-white/25 transition-colors"
              title="Return to real camera stream"
            >
              Use Real Camera
            </button>
          )}
        </div>
      </div>

      {/* Video Viewport with Live Canvas Overlay */}
      <div className="relative flex-1 min-h-[220px] w-full flex items-center justify-center bg-black overflow-hidden">
        {demoMode ? (
          <>
            <canvas
              ref={canvasRef}
              className="w-full h-full object-cover transform -scale-x-100"
            />
            {/* Live Head Pose & Gaze HUD Pill */}
            {faceDetected && (
              <div className="absolute bottom-2 left-2 z-20 px-2.5 py-1 rounded-xl bg-black/75 border border-white/15 backdrop-blur-md font-mono text-[10px] text-neutral-300 flex items-center gap-2 select-none shadow-lg">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="uppercase font-semibold">Direct Contact</span>
                </span>
                <span className="text-neutral-500">•</span>
                <span className="text-neutral-400">
                  Y:{headPose.yaw > 0 ? `+${headPose.yaw}` : headPose.yaw}° P:{headPose.pitch > 0 ? `+${headPose.pitch}` : headPose.pitch}° R:{headPose.roll > 0 ? `+${headPose.roll}` : headPose.roll}°
                </span>
              </div>
            )}
          </>
        ) : cameraEnabled ? (
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
                    {gazeStatus === 'optimal'
                      ? 'Direct Contact'
                      : gazeStatus === 'divergent'
                      ? 'Slight Angle'
                      : 'Averted Gaze'}
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
          <div className="flex flex-col items-center justify-center p-6 text-center space-y-3 max-w-sm">
            <CameraOff className="w-9 h-9 text-neutral-500" />
            <div className="space-y-1">
              <p className="text-xs text-neutral-300 font-medium">Camera Feed Disabled</p>
              <p className="text-[11px] text-neutral-400 font-mono leading-relaxed">
                {permissionError || 'Camera stream is currently inactive.'}
              </p>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setCameraEnabled(true);
                  setDemoMode(false);
                }}
                className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 text-xs font-mono transition-colors flex items-center gap-1.5"
              >
                <RefreshCw className="w-3 h-3" /> Enable Camera
              </button>
              <button
                type="button"
                onClick={() => setDemoMode(true)}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white text-xs font-mono transition-colors flex items-center gap-1.5"
              >
                <Sparkles className="w-3 h-3 text-sky-400" /> Test Demo HUD
              </button>
            </div>
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
