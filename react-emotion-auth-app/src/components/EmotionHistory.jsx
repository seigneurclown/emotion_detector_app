import React, { useState, useEffect, useCallback } from 'react';
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
  Happy: '#10b981',
  Sad: '#3b82f6',
  Angry: '#ef4444',
  Surprise: '#f59e0b',
  Neutral: '#8b5cf6',
  Fear: '#ec4899',
  Disgust: '#14b8a6',
};

export const EmotionHistory = () => {
  const { authFetch } = useAuth();

  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedEmotion, setSelectedEmotion] = useState('');
  const [selectedSnapshot, setSelectedSnapshot] = useState(null);

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      let url = '/api/emotion-logs?limit=100';
      if (selectedEmotion) {
        url += `&emotion=${encodeURIComponent(selectedEmotion)}`;
      }

      const res = await authFetch(url);
      if (!res.ok) {
        throw new Error('Failed to load emotion history');
      }

      const data = await res.json();
      setLogs(data.logs || []);
      setStats(data.stats || null);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error fetching records');
    } finally {
      setLoading(false);
    }
  }, [authFetch, selectedEmotion]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this emotion log?')) return;

    try {
      const res = await authFetch(`/api/emotion-logs/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setLogs((prev) => prev.filter((item) => item.id !== id));
        fetchHistory(); // Refresh statistics
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const formatDate = (isoString) => {
    const d = new Date(isoString);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="app-layout">
      <Navbar />

      <main className="main-content">
        <div className="history-container">
          <div className="history-header">
            <div>
              <h2>Emotion History & Analytics</h2>
              <p className="subtitle">
                Inspect and track your recorded emotional states over time
              </p>
            </div>

            <div className="history-filters">
              <select
                value={selectedEmotion}
                onChange={(e) => setSelectedEmotion(e.target.value)}
                className="select-filter"
              >
                <option value="">All Emotions</option>
                <option value="Happy">Happy 😄</option>
                <option value="Sad">Sad 😢</option>
                <option value="Angry">Angry 😡</option>
                <option value="Surprise">Surprise 😲</option>
                <option value="Neutral">Neutral 😐</option>
                <option value="Fear">Fear 😨</option>
                <option value="Disgust">Disgust 🤢</option>
              </select>

              <button onClick={fetchHistory} className="btn-secondary" title="Refresh">
                🔄 Refresh
              </button>
            </div>
          </div>

          {error && <div className="alert-error">{error}</div>}

          {/* Analytics Summary */}
          {stats && (
            <div className="stats-row">
              <div className="stat-card">
                <span className="stat-label">Total Logs</span>
                <span className="stat-number">{stats.totalDetections}</span>
              </div>

              <div className="stat-card">
                <span className="stat-label">Primary Emotion</span>
                <div className="stat-primary-emotion">
                  <span className="emoji-small">
                    {EMOTION_EMOJIS[stats.mostFrequentEmotion] || '—'}
                  </span>
                  <span
                    className="stat-value"
                    style={{
                      color: EMOTION_COLORS[stats.mostFrequentEmotion] || '#94a3b8',
                    }}
                  >
                    {stats.mostFrequentEmotion || 'N/A'}
                  </span>
                </div>
              </div>

              <div className="stat-card">
                <span className="stat-label">Average Confidence</span>
                <span className="stat-number">
                  {stats.averageConfidence ? `${(stats.averageConfidence * 100).toFixed(1)}%` : '0%'}
                </span>
              </div>
            </div>
          )}

          {/* Breakdown progress bars */}
          {stats && stats.breakdown && Object.keys(stats.breakdown).length > 0 && (
            <div className="breakdown-card">
              <h3>Emotion Distribution</h3>
              <div className="breakdown-grid">
                {Object.entries(stats.breakdown).map(([emotion, count]) => {
                  const percentage = ((count / stats.totalDetections) * 100).toFixed(1);
                  const color = EMOTION_COLORS[emotion] || '#3b82f6';
                  return (
                    <div key={emotion} className="breakdown-item">
                      <div className="breakdown-header">
                        <span>
                          {EMOTION_EMOJIS[emotion]} {emotion}
                        </span>
                        <span>{percentage}% ({count})</span>
                      </div>
                      <div className="breakdown-track">
                        <div
                          className="breakdown-fill"
                          style={{ width: `${percentage}%`, backgroundColor: color }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Logs Table */}
          <div className="table-card">
            {loading ? (
              <div className="table-loading">Loading records...</div>
            ) : logs.length === 0 ? (
              <div className="table-empty">
                <div className="empty-icon">📂</div>
                <h3>No emotion records found</h3>
                <p>Go to the Live Detector and start recording or auto-logging your emotions.</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="logs-table">
                  <thead>
                    <tr>
                      <th>Snapshot</th>
                      <th>Emotion</th>
                      <th>Confidence</th>
                      <th>Timestamp</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => {
                      const color = EMOTION_COLORS[log.detectedEmotion] || '#94a3b8';
                      return (
                        <tr key={log.id}>
                          <td>
                            {log.snapshotUrl ? (
                              <img
                                src={log.snapshotUrl}
                                alt="Face snapshot"
                                className="snapshot-thumbnail"
                                onClick={() => setSelectedSnapshot(log.snapshotUrl)}
                                title="Click to enlarge"
                              />
                            ) : (
                              <span className="no-snapshot">No image</span>
                            )}
                          </td>
                          <td>
                            <span
                              className="emotion-pill"
                              style={{
                                backgroundColor: `${color}20`,
                                color: color,
                                borderColor: color,
                              }}
                            >
                              {EMOTION_EMOJIS[log.detectedEmotion]} {log.detectedEmotion}
                            </span>
                          </td>
                          <td className="confidence-col">
                            {(log.confidenceScore * 100).toFixed(1)}%
                          </td>
                          <td className="date-col">{formatDate(log.createdAt)}</td>
                          <td>
                            <button
                              onClick={() => handleDelete(log.id)}
                              className="btn-delete"
                              title="Delete record"
                            >
                              ✕
                            </button>
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

        {/* Snapshot Modal */}
        {selectedSnapshot && (
          <div className="modal-overlay" onClick={() => setSelectedSnapshot(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3>Snapshot Preview</h3>
              <img src={selectedSnapshot} alt="Enlarged snapshot" className="modal-image" />
              <button onClick={() => setSelectedSnapshot(null)} className="btn-primary">
                Close
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
