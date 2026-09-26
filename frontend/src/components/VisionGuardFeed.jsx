import React, { useRef, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const VisionGuardFeed = ({ patientId, onVitalsUpdate }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [isStreaming, setIsStreaming] = useState(false);
  const [processedImage, setProcessedImage] = useState(null);
  const [showOverlay, setShowOverlay] = useState(true);
  const [faceLocked, setFaceLocked] = useState(false);
  const [vitals, setVitals] = useState({
    hr: '--',
    rr: '--',
    pain: '--',
    cyanosis: false
  });
  const [cameraError, setCameraError] = useState('');
  const [statusMessage, setStatusMessage] = useState('Camera standby');

  const startCamera = async () => {
    setCameraError('');
    setStatusMessage('Accessing local camera...');
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Webcam media API is not supported in this browser environment.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().catch(e => console.error("Play error:", e));
          setIsStreaming(true);
          setStatusMessage('Live webcam video streaming active');
        };
      }
    } catch (err) {
      console.error("Camera access error:", err);
      setCameraError(err.message || 'Could not access webcam. Please allow camera permissions.');
      setStatusMessage('Camera access failed');
      setIsStreaming(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
    setProcessedImage(null);
    setFaceLocked(false);
    setStatusMessage('Camera feed stopped');
  };

  // Capture frame from the real playing video and send to backend OpenCV MediaPipe
  const captureAndSendFrame = useCallback(async () => {
    if (!isStreaming || !videoRef.current) return;
    const video = videoRef.current;

    if (video.readyState < video.HAVE_CURRENT_DATA || video.videoWidth === 0) {
      return;
    }

    let canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const formData = new FormData();
      formData.append('file', blob, 'webcam_frame.jpg');

      try {
        const token = localStorage.getItem('vg_token') || localStorage.getItem('token') || '';
        const headers = { 'Content-Type': 'multipart/form-data' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        let res;
        const cameraEndpoint = `${import.meta.env.VITE_API_URL || ''}/vitals/camera`;
        try {
          res = await axios.post(cameraEndpoint, formData, { headers, timeout: 3500 });
        } catch (e) {
          res = await axios.post('/vitals/camera', formData, { headers, timeout: 3500 });
        }

        if (res.data && res.data.status === 'success') {
          const isFace = !!res.data.face_detected;
          setFaceLocked(isFace);

          if (res.data.image) {
            setProcessedImage(`data:image/jpeg;base64,${res.data.image}`);
          }

          if (isFace && res.data.heart_rate > 0) {
            setVitals({
              hr: res.data.heart_rate,
              rr: res.data.respiratory_rate,
              pain: res.data.pain_score,
              cyanosis: res.data.cyanosis_risk
            });
            setStatusMessage('Subject face locked • rPPG pulse analyzing');

            if (onVitalsUpdate) {
              onVitalsUpdate({
                heart_rate: res.data.heart_rate,
                respiratory_rate: res.data.respiratory_rate,
                pain_score: res.data.pain_score,
                cyanosis_risk: res.data.cyanosis_risk,
                face_detected: true
              });
            }
          } else {
            setStatusMessage('Align your face in the camera view to scan vitals');
            if (onVitalsUpdate) {
              onVitalsUpdate({
                heart_rate: 0,
                respiratory_rate: 0,
                pain_score: 0,
                cyanosis_risk: false,
                face_detected: false
              });
            }
          }
        }
      } catch (err) {
        console.error("Error processing webcam frame:", err);
      }
    }, 'image/jpeg', 0.85);
  }, [isStreaming, onVitalsUpdate]);

  useEffect(() => {
    let intervalId;
    if (isStreaming) {
      intervalId = setInterval(captureAndSendFrame, 1000); // Send 1 real frame per second to CV
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isStreaming, captureAndSendFrame]);

  useEffect(() => {
    return () => stopCamera();
  }, []);

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden shadow-2xl flex flex-col h-full">
      {/* Top Header & Controls */}
      <div className="p-3 border-b border-gray-800 flex flex-wrap justify-between items-center bg-gray-900/90 gap-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400">
            📹
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Real Camera Video Capture
              {isStreaming && (
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
              )}
            </h3>
            <p className="text-[11px] text-gray-400">{statusMessage}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isStreaming && (
            <button
              onClick={() => setShowOverlay(v => !v)}
              className="px-2.5 py-1 rounded-lg text-xs bg-gray-800 text-gray-300 hover:text-white border border-gray-700"
            >
              {showOverlay ? '👁️ AI HUD: On' : '📹 Raw Feed'}
            </button>
          )}

          <button
            onClick={isStreaming ? stopCamera : startCamera}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md ${
              isStreaming
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : 'bg-cyan-600 hover:bg-cyan-500 text-white animate-pulse'
            }`}
          >
            {isStreaming ? '⏹ Stop Camera' : '▶ Start Real Camera'}
          </button>
        </div>
      </div>

      {/* Main Video Display Area */}
      <div className="relative flex-1 bg-black flex flex-col items-center justify-center overflow-hidden min-h-[380px]">
        {/* Hidden capture canvas for frame extraction */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Real Live Video Element (Always visible when streaming!) */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${isStreaming && (!processedImage || !showOverlay) ? 'block' : isStreaming ? 'hidden' : 'hidden'}`}
          style={{ transform: 'scaleX(-1)' }}
        />

        {/* OpenCV Annotated Output Frame (When available and overlay toggled) */}
        {isStreaming && processedImage && showOverlay && (
          <img
            src={processedImage}
            alt="Real-time Computer Vision Annotated Stream"
            className="w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />
        )}

        {/* Standby screen when camera is not running */}
        {!isStreaming && (
          <div className="text-center p-6 text-gray-400 flex flex-col items-center max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 text-3xl mb-3 shadow-lg shadow-cyan-500/10">
              📷
            </div>
            <h4 className="text-base font-bold text-white mb-1">Webcam Direct Video Sensing</h4>
            <p className="text-xs text-gray-400 mb-4">
              Click the button below to turn on your webcam. The OpenCV engine extracts real-time facial micro-circulation (rPPG) and chest breathing movement to calculate live vitals.
            </p>

            {cameraError && (
              <div className="mb-4 p-2.5 rounded-xl bg-rose-950/70 border border-rose-500/40 text-rose-300 text-xs text-left">
                ⚠️ <strong>Camera Notice:</strong> {cameraError}
              </div>
            )}

            <button
              onClick={startCamera}
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-indigo-600 shadow-xl shadow-cyan-500/25 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
            >
              ▶ Turn On Webcam & Scan Vitals
            </button>
          </div>
        )}

        {/* Overlay Real-time Vitals HUD */}
        {isStreaming && (
          <>
            <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none">
              <div className="bg-slate-900/85 backdrop-blur-md px-3.5 py-2 rounded-xl border border-cyan-500/30 shadow-lg">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Heart Rate (rPPG)</div>
                <div className="text-xl font-black text-emerald-400 flex items-baseline gap-1">
                  {faceLocked ? vitals.hr : '--'} <span className="text-[10px] font-semibold text-slate-400">BPM</span>
                </div>
              </div>
              <div className="bg-slate-900/85 backdrop-blur-md px-3.5 py-2 rounded-xl border border-cyan-500/30 shadow-lg">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Respiration (RPM)</div>
                <div className="text-xl font-black text-cyan-400 flex items-baseline gap-1">
                  {faceLocked ? vitals.rr : '--'} <span className="text-[10px] font-semibold text-slate-400">RPM</span>
                </div>
              </div>
            </div>

            <div className="absolute top-4 right-4 flex flex-col gap-2 items-end pointer-events-none">
              <div className="bg-slate-900/85 backdrop-blur-md px-3.5 py-2 rounded-xl border border-cyan-500/30 shadow-lg text-right">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Facial Pain Index</div>
                <div className="text-xl font-black text-amber-400 flex items-baseline gap-0.5 justify-end">
                  {faceLocked ? vitals.pain : '0'}<span className="text-xs text-slate-500">/5</span>
                </div>
              </div>

              {faceLocked && vitals.cyanosis ? (
                <div className="bg-rose-950/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-rose-500 text-right animate-pulse">
                  <div className="text-[10px] font-bold text-rose-300">CLINICAL ALERT</div>
                  <div className="text-xs font-black text-white">Cyanosis Risk Detected</div>
                </div>
              ) : faceLocked ? (
                <div className="bg-emerald-950/80 backdrop-blur-md px-3 py-1 rounded-xl border border-emerald-500/40 text-right">
                  <div className="text-[10px] text-emerald-400 font-semibold">✓ Normal Perfusion</div>
                </div>
              ) : (
                <div className="bg-amber-950/80 backdrop-blur-md px-3 py-1 rounded-xl border border-amber-500/40 text-right">
                  <div className="text-[10px] text-amber-300 font-semibold">👤 Please Face Camera</div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Clinical Telemetry Footer */}
      <div className="bg-slate-900/90 px-4 py-2 border-t border-slate-800 flex justify-between items-center text-xs">
        <div className="flex items-center gap-2">
          <span className="text-cyan-400 font-mono text-[11px]">● Optical rPPG Telemetry</span>
          <span className="text-slate-500 hidden sm:inline">• Contactless Physiological Monitoring</span>
        </div>
        <div className="text-slate-400 font-mono text-[11px]">
          Status: <span className={faceLocked ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
            {faceLocked ? "Face Locked" : isStreaming ? "Searching for Face" : "Standby"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default VisionGuardFeed;
