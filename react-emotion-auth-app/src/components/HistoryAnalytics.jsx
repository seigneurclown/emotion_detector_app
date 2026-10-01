import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './Navbar';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Filler,
} from 'chart.js';
import { Doughnut, Line } from 'react-chartjs-2';

// Đăng ký các module cần thiết của Chart.js
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Filler
);

const EMOTIONS = ['Happy', 'Neutral', 'Surprise', 'Sad', 'Angry', 'Fear', 'Disgust'];

const EMOTION_COLORS = {
  Happy: '#2ecc71',
  Neutral: '#95a5a6',
  Surprise: '#f1c40f',
  Sad: '#3498db',
  Angry: '#e74c3c',
  Fear: '#9b59b6',
  Disgust: '#e67e22',
};

const EMOTION_EMOJIS = {
  Happy: '😄',
  Neutral: '😐',
  Surprise: '😲',
  Sad: '😢',
  Angry: '😡',
  Fear: '😨',
  Disgust: '🤢',
};

export const HistoryAnalytics = () => {
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState('all');
  const [analytics, setAnalytics] = useState({
    total_logs: 0,
    dominant_emotion: null,
    avg_confidence: 0,
    distribution: { Happy: 0, Neutral: 0, Surprise: 0, Sad: 0, Angry: 0, Fear: 0, Disgust: 0 },
    timeline: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 1. Tải danh sách 10 phiên gần nhất từ MongoDB
  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/sessions');
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách session:', err);
    }
  }, []);

  // 2. Tải dữ liệu phân tích và diễn biến timeline
  const fetchAnalytics = useCallback(async (sessionIdToFetch) => {
    try {
      setLoading(true);
      setError('');
      const target = sessionIdToFetch || 'all';
      const res = await fetch(`/api/analytics/${target}`);

      if (!res.ok) {
        throw new Error(`Mã lỗi HTTP: ${res.status}`);
      }

      const data = await res.json();
      setAnalytics({
        total_logs: data.total_logs || 0,
        dominant_emotion: data.dominant_emotion || null,
        avg_confidence: data.avg_confidence || 0,
        distribution: data.distribution || {},
        timeline: data.timeline || [],
      });
    } catch (err) {
      console.error('Lỗi tải dữ liệu analytics:', err);
      setError('Không thể tải dữ liệu từ MongoDB. Vui lòng đảm bảo container Docker emotion_mongodb đang chạy.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
    fetchAnalytics(selectedSession);
  }, [fetchSessions, fetchAnalytics, selectedSession]);

  const handleRefresh = () => {
    fetchSessions();
    fetchAnalytics(selectedSession);
  };

  const handleSessionChange = (e) => {
    const newSession = e.target.value;
    setSelectedSession(newSession);
    fetchAnalytics(newSession);
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return '—';
    const d = new Date(isoString);
    return d.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatTimeOnly = (isoString) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    return d.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // ==========================================
  // Dữ liệu cho Doughnut Chart (Distribution)
  // ==========================================
  const distributionData = {
    labels: EMOTIONS.map((em) => `${EMOTION_EMOJIS[em]} ${em}`),
    datasets: [
      {
        data: EMOTIONS.map((em) => analytics.distribution[em] || 0),
        backgroundColor: EMOTIONS.map((em) => EMOTION_COLORS[em]),
        borderColor: '#1e293b',
        borderWidth: 2,
        hoverOffset: 6,
      },
    ],
  };

  const distributionOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: '#f8fafc',
          font: { family: 'Inter', size: 12 },
          padding: 12,
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const val = context.raw || 0;
            const total = analytics.total_logs || 1;
            const pct = ((val / total) * 100).toFixed(1);
            return ` ${context.label}: ${val} lần (${pct}%)`;
          },
        },
      },
    },
  };

  // ==========================================
  // Dữ liệu cho Line Chart (Confidence Timeline)
  // ==========================================
  const timelineData = {
    labels: analytics.timeline.map((item) => formatTimeOnly(item.timestamp)),
    datasets: [
      {
        label: 'Độ tin cậy (%)',
        data: analytics.timeline.map((item) => item.confidence),
        borderColor: '#38bdf8',
        backgroundColor: 'rgba(56, 189, 248, 0.12)',
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 7,
        pointBackgroundColor: analytics.timeline.map(
          (item) => EMOTION_COLORS[item.emotion] || '#38bdf8'
        ),
        pointBorderColor: '#0f172a',
        pointBorderWidth: 1.5,
      },
    ],
  };

  const timelineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1e293b',
        titleColor: '#f8fafc',
        bodyColor: '#38bdf8',
        borderColor: '#334155',
        borderWidth: 1,
        padding: 10,
        callbacks: {
          title: (context) => `Thời gian: ${context[0].label}`,
          label: (context) => {
            const index = context.dataIndex;
            const item = analytics.timeline[index];
            const em = item?.emotion || 'N/A';
            return [
              `Cảm xúc: ${EMOTION_EMOJIS[em] || ''} ${em}`,
              `Confidence: ${context.parsed.y}%`,
            ];
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(51, 65, 85, 0.4)' },
        ticks: { color: '#94a3b8', maxTicksLimit: 10, font: { size: 11 } },
      },
      y: {
        min: 0,
        max: 100,
        grid: { color: 'rgba(51, 65, 85, 0.4)' },
        ticks: {
          color: '#94a3b8',
          callback: (value) => `${value}%`,
          font: { size: 11 },
        },
      },
    },
  };

  // 15 bản ghi gần nhất cho bảng dữ liệu (nghịch đảo timeline để bản ghi mới nhất ở trên đầu)
  const recentLogs = [...analytics.timeline].reverse().slice(0, 15);

  return (
    <div className="app-layout">
      <Navbar />

      <main className="main-content">
        <div className="analytics-page">
          {/* Top Control Bar */}
          <div className="analytics-toolbar">
            <div className="toolbar-info">
              <h2>History & Emotion Analytics</h2>
              <p className="subtitle">
                Thống kê và phân tích kết quả nhận diện lưu trữ từ MongoDB
              </p>
            </div>

            <div className="toolbar-actions">
              <div className="session-select-wrapper">
                <label htmlFor="session-select">Chọn phiên:</label>
                <select
                  id="session-select"
                  value={selectedSession}
                  onChange={handleSessionChange}
                  className="session-select"
                >
                  <option value="all">Tất cả phiên (All Sessions)</option>
                  {sessions.map((s) => (
                    <option key={s.session_id} value={s.session_id}>
                      {s.session_id} ({s.total_logs || 0} logs)
                    </option>
                  ))}
                </select>
              </div>

              <button onClick={handleRefresh} className="btn-refresh" title="Làm mới dữ liệu">
                🔄 Tải lại
              </button>
            </div>
          </div>

          {error && <div className="alert-error">{error}</div>}

          {/* Overview Summary Cards */}
          <div className="summary-cards-grid">
            <div className="summary-card">
              <span className="card-label">Tổng số log đã ghi</span>
              <span className="card-value">{analytics.total_logs}</span>
              <span className="card-subtext">bản ghi nhận diện</span>
            </div>

            <div className="summary-card">
              <span className="card-label">Cảm xúc chiếm ưu thế</span>
              {analytics.dominant_emotion ? (
                <div className="card-dominant">
                  <span className="dominant-emoji">
                    {EMOTION_EMOJIS[analytics.dominant_emotion] || '🎭'}
                  </span>
                  <span
                    className="card-value"
                    style={{ color: EMOTION_COLORS[analytics.dominant_emotion] || '#f8fafc' }}
                  >
                    {analytics.dominant_emotion}
                  </span>
                </div>
              ) : (
                <span className="card-value card-empty">Chưa có dữ liệu</span>
              )}
              <span className="card-subtext">tần suất xuất hiện cao nhất</span>
            </div>

            <div className="summary-card">
              <span className="card-label">Độ tin cậy trung bình</span>
              <span className="card-value" style={{ color: '#38bdf8' }}>
                {analytics.avg_confidence}%
              </span>
              <span className="card-subtext">Average Confidence</span>
            </div>
          </div>

          {/* Biểu đồ: Doughnut Chart & Line Chart */}
          <div className="charts-grid">
            {/* Biểu đồ 1: Emotion Distribution */}
            <div className="chart-card">
              <div className="chart-card-header">
                <h3>Emotion Distribution</h3>
                <span className="chart-badge">Tỷ lệ 7 cảm xúc</span>
              </div>
              <div className="chart-body doughnut-container">
                {analytics.total_logs > 0 ? (
                  <Doughnut data={distributionData} options={distributionOptions} />
                ) : (
                  <div className="chart-empty">Chưa có dữ liệu nhận diện trong phiên này</div>
                )}
              </div>
            </div>

            {/* Biểu đồ 2: Confidence Timeline */}
            <div className="chart-card">
              <div className="chart-card-header">
                <h3>Confidence & Emotion Timeline</h3>
                <span className="chart-badge">50 log gần nhất</span>
              </div>
              <div className="chart-body line-container">
                {analytics.timeline.length > 0 ? (
                  <Line data={timelineData} options={timelineOptions} />
                ) : (
                  <div className="chart-empty">Chưa có dữ liệu timeline trong phiên này</div>
                )}
              </div>
            </div>
          </div>

          {/* Bảng dữ liệu chi tiết: 15 bản ghi gần nhất */}
          <div className="table-card-analytics">
            <div className="table-header">
              <h3>Bảng chi tiết (15 bản ghi gần nhất)</h3>
              <span className="table-count">Tổng hiển thị: {recentLogs.length} dòng</span>
            </div>

            {recentLogs.length === 0 ? (
              <div className="table-empty-box">
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📭</div>
                <p>Chưa có bản ghi nhận diện nào được lưu vào MongoDB cho phiên này.</p>
              </div>
            ) : (
              <div className="table-scroll-container">
                <table className="analytics-table">
                  <thead>
                    <tr>
                      <th>Thời gian (UTC/Local)</th>
                      <th>Cảm xúc nhận diện</th>
                      <th>Độ tin cậy (Confidence)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentLogs.map((log, idx) => {
                      const color = EMOTION_COLORS[log.emotion] || '#94a3b8';
                      return (
                        <tr key={idx}>
                          <td className="time-cell">{formatDateTime(log.timestamp)}</td>
                          <td>
                            <span
                              className="emotion-tag"
                              style={{
                                backgroundColor: `${color}22`,
                                borderColor: color,
                                color: color,
                              }}
                            >
                              {EMOTION_EMOJIS[log.emotion]} {log.emotion}
                            </span>
                          </td>
                          <td className="confidence-cell">
                            <div className="confidence-wrapper">
                              <span className="confidence-pct">{log.confidence}%</span>
                              <div className="mini-progress-bg">
                                <div
                                  className="mini-progress-fill"
                                  style={{
                                    width: `${log.confidence}%`,
                                    backgroundColor: color,
                                  }}
                                ></div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
