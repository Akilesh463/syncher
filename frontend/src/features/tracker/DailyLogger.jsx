import { useState, useEffect, useCallback } from 'react';
import { trackerAPI } from '../../api/client';
import { motion, AnimatePresence } from 'framer-motion';
import './DailyLogger.css';

// Safe date helpers — always work in LOCAL time, no timezone shift
const dateToStr = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const addDays = (dateStr, n) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + n);
  return dateToStr(date);
};

const MOODS = [
  { value: 'happy', emoji: '😊', label: 'Happy' },
  { value: 'calm', emoji: '😌', label: 'Calm' },
  { value: 'energetic', emoji: '⚡', label: 'Energetic' },
  { value: 'low', emoji: '😔', label: 'Low' },
  { value: 'irritated', emoji: '😤', label: 'Irritated' },
  { value: 'anxious', emoji: '😰', label: 'Anxious' },
  { value: 'sad', emoji: '😢', label: 'Sad' },
];

const FLOWS = [
  { value: 'none', label: 'None', color: '#6b6580' },
  { value: 'spotting', label: 'Spotting', color: '#fb923c' },
  { value: 'light', label: 'Light', color: '#f87171' },
  { value: 'medium', label: 'Medium', color: '#ef4444' },
  { value: 'heavy', label: 'Heavy', color: '#dc2626' },
];

const SYMPTOMS = [
  'cramps', 'headache', 'bloating', 'fatigue', 'nausea',
  'breast_tenderness', 'back_pain', 'acne', 'cravings',
  'insomnia', 'dizziness', 'mood_swings',
];

const FLOW_EMOJI = { none: '⚪', spotting: '🟠', light: '🔴', medium: '🩸', heavy: '💧' };
const MOOD_EMOJI = { happy: '😊', calm: '😌', energetic: '⚡', low: '😔', irritated: '😤', anxious: '😰', sad: '😢' };

const todayStr = () => dateToStr(new Date());

const defaultLog = () => ({
  period_status: 'none',
  pain_level: 0,
  mood: 'calm',
  flow_intensity: 'none',
  sleep_hours: 7,
  stress_level: 0,
  exercise_minutes: 0,
  water_intake: 0,
  notes: '',
  symptoms: [],
});

export default function DailyLogger() {
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [logData, setLogData] = useState(defaultLog());
  const [existingId, setExistingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('log'); // 'log' | 'history'
  const [historyLogs, setHistoryLogs] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedLog, setExpandedLog] = useState(null);

  const loadDateLog = useCallback(async (date) => {
    setLoading(true);
    setExistingId(null);
    setLogData(defaultLog());
    try {
      if (date === todayStr()) {
        const { data } = await trackerAPI.getToday();
        if (data) populateForm(data);
      } else {
        const { data } = await trackerAPI.getDailyLogs({ start_date: date, end_date: date });
        // Handle both paginated ({results: [...]}) and flat array responses
        const logs = Array.isArray(data) ? data : (data?.results ?? []);
        if (logs.length > 0) populateForm(logs[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const populateForm = (data) => {
    setLogData({
      period_status: data.period_status || 'none',
      pain_level: data.pain_level || 0,
      mood: data.mood || 'calm',
      flow_intensity: data.flow_intensity || 'none',
      sleep_hours: data.sleep_hours ?? 7,
      stress_level: data.stress_level || 0,
      exercise_minutes: data.exercise_minutes || 0,
      water_intake: data.water_intake || 0,
      notes: data.notes || '',
      symptoms: (data.symptoms || []).map(s => s.category),
    });
    setExistingId(data.id);
  };

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const { data } = await trackerAPI.getDailyLogs({});
      // Handle both paginated ({results: [...]}) and flat array responses
      const logs = Array.isArray(data) ? data : (data?.results ?? []);
      setHistoryLogs(logs);
    } catch (err) {
      console.error(err);
      setHistoryLogs([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDateLog(selectedDate);
  }, [selectedDate, loadDateLog]);

  useEffect(() => {
    if (activeTab === 'history') loadHistory();
  }, [activeTab, loadHistory]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...logData,
        date: selectedDate,
        symptoms: logData.symptoms.map(s => ({ category: s, severity: logData.pain_level || 1 })),
      };

      if (existingId) {
        await trackerAPI.updateDailyLog(existingId, payload);
      } else {
        const { data } = await trackerAPI.createDailyLog(payload);
        setExistingId(data.id);
      }

      if (logData.period_status === 'started') {
        try {
          await trackerAPI.createCycle({ start_date: selectedDate, period_length: 5 });
        } catch {}
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      // Refresh history if open
      if (activeTab === 'history') loadHistory();
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  const toggleSymptom = (symptom) => {
    setLogData(prev => ({
      ...prev,
      symptoms: prev.symptoms.includes(symptom)
        ? prev.symptoms.filter(s => s !== symptom)
        : [...prev.symptoms, symptom],
    }));
  };

  const isToday = selectedDate === todayStr();
  const isFuture = selectedDate > todayStr();

  const formatDisplayDate = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  };

  return (
    <div className="daily-logger">
      {/* Tabs */}
      <div className="logger-tabs">
        <button
          className={`logger-tab ${activeTab === 'log' ? 'active' : ''}`}
          onClick={() => setActiveTab('log')}
        >
          📝 Daily Log
        </button>
        <button
          className={`logger-tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          📅 History
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'log' ? (
          <motion.div
            key="log"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25 }}
          >
            {/* Date Picker Header */}
            <div className="logger-header">
              <div className="date-selector-row">
                <div className="date-nav">
                  <button
                    className="date-arrow"
                    onClick={() => setSelectedDate(addDays(selectedDate, -1))}
                    title="Previous day"
                  >‹</button>

                  <div className="date-display-wrap">
                    <input
                      type="date"
                      className="date-picker-input"
                      value={selectedDate}
                      max={todayStr()}
                      onChange={e => { if (e.target.value) setSelectedDate(e.target.value); }}
                    />
                    <div className="date-display-label">
                      {isToday ? '📅 Today' : formatDisplayDate(selectedDate)}
                    </div>
                  </div>

                  <button
                    className="date-arrow"
                    onClick={() => {
                      const next = addDays(selectedDate, 1);
                      if (next <= todayStr()) setSelectedDate(next);
                    }}
                    disabled={isToday}
                    title="Next day"
                  >›</button>
                </div>

                {!isToday && (
                  <button className="btn-today" onClick={() => setSelectedDate(todayStr())}>
                    Jump to Today
                  </button>
                )}
              </div>

              {existingId && !loading && (
                <div className="existing-badge">✓ Log exists for this date — editing</div>
              )}
              {!existingId && !loading && !isFuture && (
                <div className="new-badge">+ New log for this date</div>
              )}
            </div>

            {isFuture ? (
              <div className="future-msg glass-card">
                <span>🔮</span>
                <p>You can't log data for future dates.</p>
              </div>
            ) : loading ? (
              <div className="skeleton" style={{ height: 400, borderRadius: 16 }} />
            ) : (
              <>
                <div className="logger-grid">
                  {/* Period Status */}
                  <div className="log-section glass-card">
                    <h4>🩸 Period Status</h4>
                    <div className="status-options">
                      {['none', 'started', 'ongoing', 'ended'].map(status => (
                        <button
                          key={status}
                          className={`status-btn ${logData.period_status === status ? 'active' : ''}`}
                          onClick={() => setLogData(prev => ({ ...prev, period_status: status }))}
                        >
                          {status === 'none' ? '❌ No Period' :
                           status === 'started' ? '🔴 Started' :
                           status === 'ongoing' ? '🩸 Ongoing' : '✅ Ended'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Mood */}
                  <div className="log-section glass-card">
                    <h4>😊 Mood</h4>
                    <div className="mood-grid">
                      {MOODS.map(m => (
                        <button
                          key={m.value}
                          className={`mood-btn ${logData.mood === m.value ? 'active' : ''}`}
                          onClick={() => setLogData(prev => ({ ...prev, mood: m.value }))}
                        >
                          <span className="mood-emoji">{m.emoji}</span>
                          <span className="mood-label">{m.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Pain Level */}
                  <div className="log-section glass-card">
                    <h4>😣 Pain Level <span className="slider-value">{logData.pain_level}/5</span></h4>
                    <input
                      type="range" min="0" max="5" step="1"
                      value={logData.pain_level}
                      onChange={(e) => setLogData(prev => ({ ...prev, pain_level: parseInt(e.target.value) }))}
                      className="range-slider"
                    />
                    <div className="range-labels">
                      <span>None</span><span>Mild</span><span>Severe</span>
                    </div>
                  </div>

                  {/* Flow */}
                  <div className="log-section glass-card">
                    <h4>💧 Flow Intensity</h4>
                    <div className="flow-options">
                      {FLOWS.map(f => (
                        <button
                          key={f.value}
                          className={`flow-btn ${logData.flow_intensity === f.value ? 'active' : ''}`}
                          onClick={() => setLogData(prev => ({ ...prev, flow_intensity: f.value }))}
                          style={{ '--flow-color': f.color }}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Lifestyle */}
                  <div className="log-section glass-card">
                    <h4>🌙 Lifestyle</h4>
                    <div className="lifestyle-inputs">
                      <div className="lifestyle-item">
                        <label>😴 Sleep (hours)</label>
                        <input
                          type="number" min="0" max="14" step="0.5"
                          value={logData.sleep_hours}
                          onChange={(e) => setLogData(prev => ({ ...prev, sleep_hours: parseFloat(e.target.value) }))}
                          className="input-field input-sm"
                        />
                      </div>
                      <div className="lifestyle-item">
                        <label>😰 Stress (0-5)</label>
                        <input
                          type="range" min="0" max="5" step="1"
                          value={logData.stress_level}
                          onChange={(e) => setLogData(prev => ({ ...prev, stress_level: parseInt(e.target.value) }))}
                          className="range-slider"
                        />
                      </div>
                      <div className="lifestyle-item">
                        <label>🏃 Exercise (min)</label>
                        <input
                          type="number" min="0" max="300" step="5"
                          value={logData.exercise_minutes}
                          onChange={(e) => setLogData(prev => ({ ...prev, exercise_minutes: parseInt(e.target.value) }))}
                          className="input-field input-sm"
                        />
                      </div>
                      <div className="lifestyle-item">
                        <label>💧 Water (glasses)</label>
                        <input
                          type="number" min="0" max="20"
                          value={logData.water_intake}
                          onChange={(e) => setLogData(prev => ({ ...prev, water_intake: parseInt(e.target.value) }))}
                          className="input-field input-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Symptoms */}
                  <div className="log-section glass-card">
                    <h4>🩺 Symptoms</h4>
                    <div className="symptom-grid">
                      {SYMPTOMS.map(s => (
                        <button
                          key={s}
                          className={`symptom-btn ${logData.symptoms.includes(s) ? 'active' : ''}`}
                          onClick={() => toggleSymptom(s)}
                        >
                          {s.replace(/_/g, ' ')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="log-section glass-card full-width">
                    <h4>📝 Notes</h4>
                    <textarea
                      className="input-field notes-input"
                      placeholder="Anything else you'd like to note..."
                      value={logData.notes}
                      onChange={(e) => setLogData(prev => ({ ...prev, notes: e.target.value }))}
                      rows={3}
                    />
                  </div>
                </div>

                <motion.button
                  className="btn btn-primary btn-lg btn-full save-btn"
                  onClick={handleSave}
                  disabled={saving}
                  whileTap={{ scale: 0.97 }}
                >
                  {saving ? <span className="btn-loader" /> :
                   saved ? '✅ Saved!' :
                   existingId ? '💾 Update Log' : '💾 Save Log'}
                </motion.button>
              </>
            )}
          </motion.div>
        ) : (
          /* HISTORY TAB */
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25 }}
          >
            <div className="logger-header">
              <h2>📅 Log History</h2>
              <p>All your past health entries</p>
            </div>

            {historyLoading ? (
              <div className="skeleton" style={{ height: 300, borderRadius: 16 }} />
            ) : historyLogs.length === 0 ? (
              <div className="empty-history glass-card">
                <div className="empty-icon">📋</div>
                <h3>No logs yet</h3>
                <p>Switch to the Daily Log tab to record your first entry.</p>
                <button className="btn btn-primary" onClick={() => setActiveTab('log')}>
                  Start Logging
                </button>
              </div>
            ) : (
              <div className="history-list">
                {historyLogs.map(log => (
                  <motion.div
                    key={log.id}
                    className={`history-card glass-card ${expandedLog === log.id ? 'expanded' : ''}`}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div
                      className="history-card-header"
                      onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                    >
                      <div className="history-date-col">
                        <span className="history-date">{formatDisplayDate(log.date)}</span>
                        {log.date === todayStr() && <span className="today-pill">Today</span>}
                      </div>
                      <div className="history-summary-chips">
                        <span className="chip">{MOOD_EMOJI[log.mood] || '😌'} {log.mood}</span>
                        {log.flow_intensity !== 'none' && (
                          <span className="chip chip-flow">{FLOW_EMOJI[log.flow_intensity]} {log.flow_intensity}</span>
                        )}
                        {log.period_status !== 'none' && (
                          <span className="chip chip-period">🩸 {log.period_status}</span>
                        )}
                        {Array.isArray(log.symptoms) && log.symptoms.length > 0 && (
                          <span className="chip chip-symptoms">🩺 {log.symptoms.length} symptom{log.symptoms.length > 1 ? 's' : ''}</span>
                        )}
                      </div>
                      <div className="history-actions">
                        <button
                          className="btn-edit-log"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDate(log.date);
                            setActiveTab('log');
                          }}
                          title="Edit this log"
                        >✏️</button>
                        <span className="expand-arrow">{expandedLog === log.id ? '▲' : '▼'}</span>
                      </div>
                    </div>

                    <AnimatePresence>
                      {expandedLog === log.id && (
                        <motion.div
                          className="history-detail"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className="detail-grid">
                            <div className="detail-item">
                              <span className="detail-label">😣 Pain</span>
                              <span className="detail-value">{log.pain_level}/5</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">😰 Stress</span>
                              <span className="detail-value">{log.stress_level}/5</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">😴 Sleep</span>
                              <span className="detail-value">{log.sleep_hours}h</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">🏃 Exercise</span>
                              <span className="detail-value">{log.exercise_minutes} min</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">💧 Water</span>
                              <span className="detail-value">{log.water_intake} glasses</span>
                            </div>
                          </div>
                          {Array.isArray(log.symptoms) && log.symptoms.length > 0 && (
                            <div className="detail-symptoms">
                              <span className="detail-label">🩺 Symptoms:</span>
                              <div className="symptom-chips">
                                {log.symptoms.map((s, idx) => (
                                  <span key={s.id ?? idx} className="symptom-chip">
                                    {(s.category || s).replace(/_/g, ' ')}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {log.notes && (
                            <div className="detail-notes">
                              <span className="detail-label">📝 Notes:</span>
                              <p>{log.notes}</p>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
