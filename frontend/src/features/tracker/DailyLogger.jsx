import { useState, useEffect } from 'react';
import { trackerAPI } from '../../api/client';
import { motion } from 'framer-motion';
import './DailyLogger.css';

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

export default function DailyLogger() {
  const [logData, setLogData] = useState({
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
  const [existingId, setExistingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadToday();
  }, []);

  const loadToday = async () => {
    try {
      const { data } = await trackerAPI.getToday();
      if (data) {
        setLogData({
          period_status: data.period_status || 'none',
          pain_level: data.pain_level || 0,
          mood: data.mood || 'calm',
          flow_intensity: data.flow_intensity || 'none',
          sleep_hours: data.sleep_hours || 7,
          stress_level: data.stress_level || 0,
          exercise_minutes: data.exercise_minutes || 0,
          water_intake: data.water_intake || 0,
          notes: data.notes || '',
          symptoms: (data.symptoms || []).map(s => s.category),
        });
        setExistingId(data.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...logData,
        date: new Date().toISOString().split('T')[0],
        symptoms: logData.symptoms.map(s => ({ category: s, severity: logData.pain_level || 1 })),
      };

      if (existingId) {
        await trackerAPI.updateDailyLog(existingId, payload);
      } else {
        const { data } = await trackerAPI.createDailyLog(payload);
        setExistingId(data.id);
      }

      // If period started, create a cycle log
      if (logData.period_status === 'started') {
        try {
          await trackerAPI.createCycle({
            start_date: new Date().toISOString().split('T')[0],
            period_length: 5,
          });
        } catch {}
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
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

  if (loading) {
    return <div className="skeleton" style={{ height: 400, borderRadius: 16 }} />;
  }

  return (
    <div className="daily-logger">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="logger-header">
          <h2>📝 Daily Log</h2>
          <p>How are you feeling today?</p>
        </div>

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
                  {s.replace('_', ' ')}
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

        {/* Save Button */}
        <motion.button
          className="btn btn-primary btn-lg btn-full save-btn"
          onClick={handleSave}
          disabled={saving}
          whileTap={{ scale: 0.97 }}
        >
          {saving ? <span className="btn-loader" /> :
           saved ? '✅ Saved!' : '💾 Save Today\'s Log'}
        </motion.button>
      </motion.div>
    </div>
  );
}
