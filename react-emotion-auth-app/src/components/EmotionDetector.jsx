import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Navbar } from './Navbar';
import { useAuth } from '../context/AuthContext';

const EMOTION_EMOJIS = {
  Happy: '😄',
  Sad: '😢',
  Angry: '😡',
  Surprise: '😲',
  Neutral: '😐',
  Fear: '😨',
  Disgust: '🤢',
};

const EMOTION_COLORS = {
  Happy: '#2ecc71',
  Neutral: '#95a5a6',
  Surprise: '#f1c40f',
  Sad: '#3498db',
  Angry: '#e74c3c',
  Fear: '#9b59b6',
  Disgust: '#e67e22',
};

export const EmotionDetector = () => {
  const { user } = useAuth();

  const videoRef = useRef(null);
  const overlayRef = useRef(null);
  const sendCanvasRef = useRef(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [currentEmotion, setCurrentEmotion] = useState(null);
  const [currentConfidence, setCurrentConfidence] = useState(0);
  const [faceCount, setFaceCount] = useState(0);
  const [fps, setFps] = useState(0);

  // Auto-Log state & session
  const [autoLog, setAutoLog] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [sessionLogsCount, setSessionLogsCount] = useState(0);
  const [toastMessage, setToastMessage] = useState('');

  const sessionIdRef = useRef('');
  const loopRef = useRef(null);
  const isSendingRef = useRef(false);
  const lastAutoLogTimeRef = useRef(0);
  const frameCountRef = useRef(0);
  const lastFpsTimeRef = useRef(Date.now());
  const currentFacesRef = useRef([]);

  // Toast notification
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 2800);
  };

  // Toggle Auto-Log handler
  const handleToggleAutoLog = (e) => {
    const isChecked = e.target.checked;
    setAutoLog(isChecked);

    if (isChecked) {
      const newSessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      setSessionId(newSessionId);
      sessionIdRef.current = newSessionId;
      setSessionLogsCount(0);
      showToast(`Bắt đầu phiên Auto-Log: ${newSessionId}`);
    } else {
      showToast('Đã dừng Auto-Log');
    }
  };

  // Start Camera
  const startCamera = async () => {
    try {
      setCameraError('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          setCameraActive(true);
        };
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setCameraError('Không thể truy cập camera. Vui lòng cấp quyền webcam trên trình duyệt.');
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (loopRef.current) {
      clearInterval(loopRef.current);
      loopRef.current = null;
    }

    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      const tracks = stream.getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }

    if (overlayRef.current) {
      const ctx = overlayRef.current.getContext('2d');
      ctx.clearRect(0, 0, 640, 480);
    }

    setCameraActive(false);
    setCurrentEmotion(null);
    setCurrentConfidence(0);
    setFaceCount(0);
  };

  // Gửi batch log đến MongoDB qua Flask POST /api/logs
  const sendBatchLog = useCallback(
    async (currentSessionId, facesToLog) => {
      if (!facesToLog || facesToLog.length === 0) return;

      try {
        const payload = {
          session_id: currentSessionId || `sess_${Date.now()}`,
          user_email: user?.email || 'anonymous@user.com',
          faces: facesToLog,
        };

        const res = await fetch('/api/logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const data = await res.json();
          const count = data.inserted_count || facesToLog.length;
          setSessionLogsCount((prev) => prev + count);
          showToast(`Đã lưu ${count} log vào MongoDB`);
        } else {
          console.warn('Lưu log thất bại, status:', res.status);
        }
      } catch (err) {
        console.error('Lỗi khi gửi log đến MongoDB:', err);
      }
    },
    [user]
  );

  // Manual trigger button
  const handleManualLog = () => {
    if (!cameraActive || currentFacesRef.current.length === 0) {
      showToast('Không có khuôn mặt nào được nhận diện để lưu');
      return;
    }

    const activeSession = sessionIdRef.current || `sess_${Date.now()}`;
    if (!sessionIdRef.current) {
      setSessionId(activeSession);
      sessionIdRef.current = activeSession;
    }

    sendBatchLog(activeSession, currentFacesRef.current);
  };

  // Vẽ bounding box và nhãn cảm xúc lên canvas overlay
  const drawBoxes = (faces) => {
    if (!overlayRef.current) return;
    const ctx = overlayRef.current.getContext('2d');
    ctx.clearRect(0, 0, 640, 480);

    faces.forEach((item) => {
      const { x, y, w, h } = item.box;
      const emotion = item.emotion;
      const color = EMOTION_COLORS[emotion] || '#2ecc71';

      // Vẽ viền chữ nhật
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(x, y, w, h, 6);
      } else {
        ctx.rect(x, y, w, h);
      }
      ctx.stroke();

      // Vẽ khung nền chữ
      const emoji = EMOTION_EMOJIS[emotion] || '';
      const text = `${emoji} ${emotion} ${item.confidence}%`;
      ctx.font = 'bold 15px Inter, Arial, sans-serif';
      const textWidth = ctx.measureText(text).width;

      const badgeY = y > 28 ? y - 28 : y;
      ctx.fillStyle = color;
      ctx.fillRect(x, badgeY, textWidth + 14, 24);

      ctx.fillStyle = '#ffffff';
      ctx.fillText(text, x + 7, badgeY + 17);
    });
  };

  // Detection Loop
  useEffect(() => {
    if (!cameraActive) return;

    if (!sendCanvasRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      sendCanvasRef.current = canvas;
    }

    const sendCanvas = sendCanvasRef.current;
    const sendCtx = sendCanvas.getContext('2d');

    loopRef.current = setInterval(async () => {
      if (isSendingRef.current || !videoRef.current || videoRef.current.readyState < 2) {
        return;
      }

      isSendingRef.current = true;

      try {
        // Trích xuất frame từ video
        sendCtx.drawImage(videoRef.current, 0, 0, 640, 480);
        const base64Data = sendCanvas.toDataURL('image/jpeg', 0.6);

        // Gửi đến Flask PyTorch CNN (/predict)
        const response = await fetch('/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64Data }),
        });

        if (response.ok) {
          const data = await response.json();
          const faces = data.faces || [];
          currentFacesRef.current = faces;
          setFaceCount(faces.length);
          drawBoxes(faces);

          // Tính FPS
          frameCountRef.current++;
          const now = Date.now();
          if (now - lastFpsTimeRef.current >= 1000) {
            setFps(frameCountRef.current);
            frameCountRef.current = 0;
            lastFpsTimeRef.current = now;
          }

          if (faces.length > 0) {
            const bestFace = faces.reduce((prev, curr) =>
              curr.confidence > prev.confidence ? curr : prev
            );

            setCurrentEmotion(bestFace.emotion);
            setCurrentConfidence(bestFace.confidence);

            // AUTO-LOG: Cứ mỗi 2 giây gửi batch log vào MongoDB
            if (autoLog && sessionIdRef.current) {
              if (now - lastAutoLogTimeRef.current >= 2000) {
                lastAutoLogTimeRef.current = now;
                sendBatchLog(sessionIdRef.current, faces);
              }
            }
          } else {
            setCurrentEmotion(null);
            setCurrentConfidence(0);
          }
        }
      } catch (err) {
        console.error('Frame prediction error:', err);
      } finally {
        isSendingRef.current = false;
      }
    }, 160);

    return () => {
      if (loopRef.current) {
        clearInterval(loopRef.current);
      }
    };
  }, [cameraActive, autoLog, sendBatchLog]);

  // Dọn dẹp webcam khi unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="app-layout">
      <Navbar />

      <main className="main-content">
        {toastMessage && <div className="toast">{toastMessage}</div>}

        <div className="detector-container">
          {/* Top Control Bar */}
          <div className="control-bar">
            <div className="control-left">
              <h2>Real-Time Facial Emotion Recognition</h2>
              <p className="subtitle">
                Mô hình PyTorch CNN (FER-2013) & lưu trữ MongoDB phiên làm việc
              </p>
            </div>

            <div className="control-actions">
              <label className="toggle-label" title="Tự động ghi log vào MongoDB mỗi 2 giây">
                <input
                  type="checkbox"
                  checked={autoLog}
                  onChange={handleToggleAutoLog}
                />
                <span className="toggle-text">Auto-Log to Database</span>
              </label>

              {cameraActive ? (
                <button onClick={stopCamera} className="btn-danger">
                  Stop Camera
                </button>
              ) : (
                <button onClick={startCamera} className="btn-success">
                  Start Camera
                </button>
              )}

              <button
                onClick={handleManualLog}
                className="btn-accent"
                disabled={!cameraActive || !currentEmotion}
              >
                📸 Capture & Log
              </button>
            </div>
          </div>

          {cameraError && <div className="alert-error">{cameraError}</div>}

          {/* Main Grid: Video Stream + Telemetry */}
          <div className="detector-grid">
            <div className="video-card">
              <div className="video-wrapper">
                <video
                  ref={videoRef}
                  width="640"
                  height="480"
                  playsInline
                  muted
                  style={{ display: cameraActive ? 'block' : 'none' }}
                />
                <canvas
                  ref={overlayRef}
                  width="640"
                  height="480"
                  className="canvas-overlay"
                  style={{ display: cameraActive ? 'block' : 'none' }}
                />

                {!cameraActive && (
                  <div className="camera-placeholder">
                    <div className="placeholder-icon">📷</div>
                    <h3>Camera đang tắt</h3>
                    <p>Bấm "Start Camera" để bắt đầu nhận diện cảm xúc theo thời gian thực</p>
                    <button onClick={startCamera} className="btn-primary" style={{ marginTop: '1rem' }}>
                      Bật Webcam
                    </button>
                  </div>
                )}
              </div>

              <div className="stream-footer">
                <span className="status-indicator">
                  <span className={`dot ${cameraActive ? 'online' : 'offline'}`}></span>
                  {cameraActive ? `AI Running (${fps} FPS)` : 'Camera Inactive'}
                </span>
                <span className="faces-badge">
                  Số khuôn mặt: <strong>{faceCount}</strong>
                </span>
              </div>
            </div>

            {/* Telemetry & Stats Panel */}
            <div className="telemetry-panel">
              <div className="stat-card emotion-focus-card">
                <span className="stat-label">Cảm xúc hiện tại</span>
                {currentEmotion ? (
                  <div className="emotion-display">
                    <span className="emoji-large">{EMOTION_EMOJIS[currentEmotion] || '🎭'}</span>
                    <span
                      className="emotion-name"
                      style={{ color: EMOTION_COLORS[currentEmotion] || '#fff' }}
                    >
                      {currentEmotion}
                    </span>
                  </div>
                ) : (
                  <div className="emotion-empty">
                    <span>{cameraActive ? 'Đang phân tích khung hình...' : 'Chưa phát hiện khuôn mặt'}</span>
                  </div>
                )}
              </div>

              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-label">Độ tin cậy (Confidence)</span>
                  <span className="confidence-value">{currentConfidence}%</span>
                </div>
                <div className="progress-bar-bg">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${currentConfidence}%`,
                      backgroundColor: currentEmotion
                        ? EMOTION_COLORS[currentEmotion]
                        : '#3b82f6',
                    }}
                  ></div>
                </div>
              </div>

              <div className="stat-card info-card">
                <div className="mini-stat">
                  <span className="mini-label">Session Logs Created</span>
                  <span className="mini-value">{sessionLogsCount}</span>
                </div>
                <div className="mini-stat">
                  <span className="mini-label">Auto-Log Status</span>
                  <span className={`status-tag ${autoLog ? 'tag-active' : 'tag-muted'}`}>
                    {autoLog ? 'Active (mỗi 2s)' : 'Disabled'}
                  </span>
                </div>
              </div>

              {sessionId && (
                <div className="stat-card" style={{ padding: '0.8rem 1rem' }}>
                  <span className="stat-label">Current Session ID</span>
                  <div style={{ fontSize: '0.85rem', color: '#60a5fa', wordBreak: 'break-all', marginTop: '4px', fontFamily: 'monospace' }}>
                    {sessionId}
                  </div>
                </div>
              )}

              <div className="quick-guide-card">
                <h4>Thông tin hệ thống</h4>
                <ul>
                  <li><strong>AI Model:</strong> PyTorch FER-2013 CNN (:5000)</li>
                  <li><strong>Database:</strong> MongoDB (:27017) qua Docker Compose</li>
                  <li><strong>Lưu trữ:</strong> Collection <code>prediction_logs</code></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
