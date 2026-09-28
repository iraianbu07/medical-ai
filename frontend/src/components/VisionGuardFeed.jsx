import React, { useRef, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const VisionGuardFeed = ({ onAssessmentUpdate, activeScenario, onScenarioChange }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [isStreaming, setIsStreaming] = useState(false);
  const [processedImage, setProcessedImage] = useState(null);
  const [showOverlay, setShowOverlay] = useState(true);
  const [faceLocked, setFaceLocked] = useState(false);
  const [assessment, setAssessment] = useState({
    pain_score: 0,
    pain_level: 'Awaiting Feed',
    consciousness_state: 'Standby',
    facial_symmetry: 0,
    respiratory_effort: 'Normal',
    perfusion_status: 'Normal',
    adjusted_vgi: 0,
    risk_level: 'STANDBY'
  });
  const [cameraError, setCameraError] = useState('');
  const [statusMessage, setStatusMessage] = useState('Camera standby · Click to start live optical scan');

  // Start live webcam
  const startCamera = async () => {
    setCameraError('');
    setStatusMessage('Accessing local camera hardware...');
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
          setStatusMessage('Live webcam video streaming active · Multimodal AI scanning');
          if (onScenarioChange) onScenarioChange('live');
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
    setStatusMessage('Camera feed stopped · Optical sensor standing by');
  };

  // Capture frame from the real playing video and send to backend
  const captureAndSendFrame = useCallback(async () => {
    if (!isStreaming || !videoRef.current) return;
    const video = videoRef.current;

    if (video.readyState < video.HAVE_CURRENT_DATA || video.videoWidth === 0) {
      return;
    }

    const canvas = canvasRef.current || document.createElement('canvas');
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

          const painVal = res.data.pain_score || 0;
          const painText = res.data.pain_level || (painVal >= 7 ? 'Severe Pain' : painVal >= 4 ? 'Moderate Pain' : 'Relaxed');
          const conscious = res.data.consciousness_state || 'Alert';
          const symm = res.data.facial_symmetry || 95;
          const pred = res.data.prediction_impact || {};

          setAssessment({
            pain_score: painVal,
            pain_level: painText,
            consciousness_state: conscious,
            facial_symmetry: symm,
            respiratory_effort: res.data.respiratory_effort || 'Normal',
            perfusion_status: res.data.perfusion_status || 'Normal Perfusion',
            adjusted_vgi: pred.adjusted_vgi || 20,
            risk_level: pred.risk_level || 'STABLE'
          });

          if (isFace) {
            setStatusMessage(`Patient Face Locked · Pain ${painVal}/10 · ${conscious} · Symmetry ${symm}%`);
          } else {
            setStatusMessage('Searching for patient face in camera view...');
          }

          if (onAssessmentUpdate) {
            onAssessmentUpdate({
              ...res.data,
              is_live: true
            });
          }
        }
      } catch (err) {
        // Silently tolerate single network frame dropped
      }
    }, 'image/jpeg', 0.82);
  }, [isStreaming, onAssessmentUpdate]);

  // Regular frame extraction timer
  useEffect(() => {
    let interval = null;
    if (isStreaming) {
      interval = setInterval(captureAndSendFrame, 750);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isStreaming, captureAndSendFrame]);

  // Clean up media tracks on unmount
  useEffect(() => {
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative">
      {/* Top Header & Controls */}
      <div className="p-3 border-b border-slate-800 flex flex-wrap justify-between items-center bg-slate-900/90 gap-2 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Optical Computer Vision Feed
              {isStreaming && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-400">{statusMessage}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isStreaming && (
            <button
              onClick={() => setShowOverlay(v => !v)}
              className="px-2.5 py-1 rounded-lg text-xs bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-colors"
            >
              {showOverlay ? 'AI HUD: Active' : 'Raw Video Feed'}
            </button>
          )}

          <button
            onClick={isStreaming ? stopCamera : startCamera}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md flex items-center gap-1.5 ${
              isStreaming
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : 'bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white shadow-cyan-500/20'
            }`}
          >
            {isStreaming ? (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Stop Camera
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                </svg>
                Start Live Camera
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Video Display Canvas */}
      <div className="relative flex-1 bg-black flex flex-col items-center justify-center overflow-hidden min-h-[400px]">
        {/* Hidden capture canvas for frame extraction */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Real Live Video Element */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${isStreaming && (!processedImage || !showOverlay) ? 'block' : isStreaming ? 'hidden' : 'hidden'}`}
          style={{ transform: 'scaleX(-1)' }}
        />

        {/* OpenCV / MediaPipe Annotated Output Frame */}
        {isStreaming && processedImage && showOverlay && (
          <img
            src={processedImage}
            alt="Multimodal Computer Vision Stream"
            className="w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />
        )}

        {/* Standby screen when live webcam is not active */}
        {!isStreaming && (
          <div className="text-center p-8 text-slate-400 flex flex-col items-center max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 text-3xl mb-3 shadow-lg shadow-cyan-500/10">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <h4 className="text-base font-bold text-white mb-1">Live Optical Patient Sensing</h4>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Activate your webcam for real-time contactless patient assessment. The MediaPipe & OpenCV engine analyzes facial pain action units (AU4/6/25), eye tracking (EAR), and facial symmetry to actively update clinical deterioration risk.
            </p>

            {cameraError && (
              <div className="mb-4 p-2.5 rounded-xl bg-rose-950/70 border border-rose-500/40 text-rose-300 text-xs text-left">
                <strong>Camera Notice:</strong> {cameraError}
              </div>
            )}

            <button
              onClick={startCamera}
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 shadow-xl shadow-cyan-500/25 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              </svg>
              Turn On Webcam & Track Expressions
            </button>
          </div>
        )}

        {/* Live Overlay Biomarker Badges on Stream */}
        {isStreaming && (
          <>
            <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none">
              <div className="bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-cyan-500/30 shadow-lg">
                <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Facial Pain (FLACC AI)</div>
                <div className="text-lg font-black flex items-baseline gap-1">
                  <span className={assessment.pain_score >= 7 ? 'text-rose-400' : assessment.pain_score >= 4 ? 'text-amber-400' : 'text-emerald-400'}>
                    {faceLocked ? `${assessment.pain_score}/10` : '--'}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400">[{assessment.pain_level}]</span>
                </div>
              </div>

              <div className="bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-cyan-500/30 shadow-lg">
                <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Consciousness (EAR)</div>
                <div className="text-sm font-bold text-cyan-400">
                  {faceLocked ? assessment.consciousness_state : '--'}
                </div>
              </div>
            </div>

            <div className="absolute top-4 right-4 flex flex-col gap-2 items-end pointer-events-none">
              <div className="bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-cyan-500/30 shadow-lg text-right">
                <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Facial Symmetry (FAST)</div>
                <div className="text-lg font-black flex items-baseline gap-0.5 justify-end">
                  <span className={assessment.facial_symmetry < 78 ? 'text-purple-400' : 'text-emerald-400'}>
                    {faceLocked ? `${assessment.facial_symmetry}%` : '--'}
                  </span>
                </div>
              </div>

              <div className="bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-indigo-500/30 shadow-lg text-right">
                <div className="text-[9px] uppercase font-bold text-indigo-300 tracking-wider">Dynamic VGI Shift</div>
                <div className="text-lg font-black flex items-baseline gap-1 justify-end">
                  <span className={assessment.adjusted_vgi >= 80 ? 'text-rose-400' : assessment.adjusted_vgi >= 50 ? 'text-amber-400' : 'text-emerald-400'}>
                    {faceLocked ? `${assessment.adjusted_vgi}/100` : '--'}
                  </span>
                  <span className="text-[9px] font-bold text-slate-400">[{assessment.risk_level}]</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Clinical Telemetry Footer */}
      <div className="bg-slate-900/90 px-4 py-2 border-t border-slate-800 flex justify-between items-center text-xs">
        <div className="flex items-center gap-2">
          <span className="text-cyan-400 font-mono text-[11px]">Optical Action Units: AU4 · AU6 · AU25 · EAR</span>
        </div>
        <div className="text-slate-400 font-mono text-[11px]">
          Status: <span className={faceLocked ? "text-emerald-400 font-bold" : isStreaming ? "text-amber-400 font-bold" : "text-slate-400"}>
            {faceLocked ? "Face Locked" : isStreaming ? "Searching for Face" : "Standby"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default VisionGuardFeed;
