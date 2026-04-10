import { useState, useEffect } from 'react';
import { trackerAPI, predictionAPI, insightsAPI } from '../../api/client';
import { motion } from 'framer-motion';
import { 
  LineChart, Line, AreaChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import CycleCalendar from '../../components/CycleCalendar';
import './Dashboard.css';

const PHASE_CONFIG = {
  menstrual: { color: '#ef4444', emoji: '🩸', label: 'Menstrual' },
  follicular: { color: '#22c55e', emoji: '🌱', label: 'Follicular' },
  ovulation: { color: '#f59e0b', emoji: '✨', label: 'Ovulation' },
  luteal: { color: '#8b5cf6', emoji: '🌙', label: 'Luteal' },
  unknown: { color: '#6b6580', emoji: '❓', label: 'Unknown' },
};

export default function Dashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [dashRes, predRes, insRes] = await Promise.all([
        trackerAPI.getDashboard(),
        predictionAPI.getPrediction().catch(() => ({ data: null })),
        insightsAPI.getInsights().catch(() => ({ data: [] })),
      ]);
      setDashboard(dashRes.data);
      setPrediction(predRes.data);
      setInsights(insRes.data || []);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTrainModel = async () => {
    try {
      const res = await predictionAPI.trainModel();
      alert(res.data.message);
      // Reload to get new model predictions
      loadDashboard();
    } catch (err) {
      alert(err.response?.data?.message || 'Error training model');
    }
  };

  if (loading) {
    return (
      <div className="dashboard">
        <div className="dashboard-loading">
          {[1,2,3,4].map(i => (
            <div key={i} className="skeleton" style={{ height: 180, borderRadius: 16 }} />
          ))}
        </div>
      </div>
    );
  }

  const phase = dashboard?.current_phase || {};
  const phaseConfig = PHASE_CONFIG[phase.phase] || PHASE_CONFIG.unknown;
  const stats = dashboard?.stats || {};
  const pred = prediction || dashboard?.prediction || {};

  // Build cycle chart data
  const cycleData = (dashboard?.recent_cycles || [])
    .filter(c => c.cycle_length)
    .reverse()
    .map((c, i) => ({
      name: `Cycle ${i + 1}`,
      length: c.cycle_length,
      avg: stats.avg_cycle_length || 28,
    }));

  // Build symptom chart from recent logs
  const symptomData = (dashboard?.recent_logs || [])
    .reverse()
    .map(log => ({
      date: new Date(log.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
      pain: log.pain_level,
      stress: log.stress_level,
      sleep: log.sleep_hours || 0,
    }));

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="dashboard">
      <motion.div 
        className="dashboard-grid"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Phase Card */}
        <motion.div 
          className="dash-card phase-card"
          variants={itemVariants}
          style={{ '--phase-clr': phaseConfig.color }}
        >
          <div className="phase-visual">
            <div className="phase-ring">
              <svg viewBox="0 0 100 100" className="phase-svg">
                <circle cx="50" cy="50" r="42" className="phase-ring-bg" />
                <circle 
                  cx="50" cy="50" r="42" 
                  className="phase-ring-progress"
                  style={{
                    strokeDasharray: `${(phase.day_of_cycle / (phase.total_cycle_length || 28)) * 264} 264`,
                    stroke: phaseConfig.color,
                  }}
                />
              </svg>
              <div className="phase-ring-center">
                <span className="phase-emoji">{phaseConfig.emoji}</span>
                <span className="phase-day">Day {phase.day_of_cycle || '?'}</span>
              </div>
            </div>
          </div>
          <div className="phase-info">
            <h3 style={{ color: phaseConfig.color }}>{phaseConfig.label} Phase</h3>
            <p>{phase.description || 'Start tracking to see your cycle phase'}</p>
          </div>
        </motion.div>

        {/* Period Countdown */}
        <motion.div className="dash-card countdown-card" variants={itemVariants}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h4>Next Period</h4>
              <span className="badge">
                {pred.confidence_score ? `${Math.round(pred.confidence_score * 100)}% confidence` : '—'}
              </span>
            </div>
            <button 
              onClick={handleTrainModel}
              style={{
                background: 'var(--primary-500)',
                color: 'white',
                border: 'none',
                padding: '0.4rem 0.8rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.85rem'
              }}
            >
              Train AI Model
            </button>
          </div>
          <div className="countdown-display">
            <span className="countdown-number">
              {pred.days_until_period ?? pred.days_until ?? '—'}
            </span>
            <span className="countdown-label">days away</span>
          </div>
          <p className="countdown-date">
            {pred.next_period_date 
              ? new Date(pred.next_period_date).toLocaleDateString('en', { 
                  month: 'long', day: 'numeric', year: 'numeric' 
                })
              : 'Log more cycles for predictions'}
          </p>
        </motion.div>

        {/* Ovulation Window */}
        <motion.div className="dash-card ovulation-card" variants={itemVariants}>
          <div className="card-header">
            <h4>Ovulation Window</h4>
            <span className="badge badge-warning">🥚 Fertility</span>
          </div>
          {pred.ovulation_date ? (
            <>
              <div className="ovulation-date">
                {new Date(pred.ovulation_date).toLocaleDateString('en', { 
                  month: 'short', day: 'numeric' 
                })}
              </div>
              <p className="ovulation-window">
                Fertile window: {pred.fertile_window_start && new Date(pred.fertile_window_start).toLocaleDateString('en', { month: 'short', day: 'numeric' })} 
                {' → '}
                {pred.fertile_window_end && new Date(pred.fertile_window_end).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
              </p>
            </>
          ) : (
            <p className="text-muted">Not enough data yet</p>
          )}
        </motion.div>

        {/* Cycle Health Score */}
        <motion.div className="dash-card score-card" variants={itemVariants}>
          <div className="card-header">
            <h4>Cycle Regularity</h4>
          </div>
          <div className="score-display">
            <div className="score-circle" style={{
              background: `conic-gradient(
                ${stats.regularity_score >= 70 ? 'var(--success-500)' : stats.regularity_score >= 40 ? 'var(--warning-500)' : 'var(--danger-500)'} 
                ${(stats.regularity_score || 0) * 3.6}deg, 
                var(--bg-tertiary) 0deg
              )`
            }}>
              <div className="score-inner">
                <span className="score-value">{stats.regularity_score || 0}</span>
                <span className="score-label">/100</span>
              </div>
            </div>
          </div>
          <p className="score-text">
            {stats.total_cycles || 0} cycles tracked • ±{stats.cycle_std_dev || 0} days variance
          </p>
        </motion.div>

        {/* Cycle Calendar */}
        <motion.div variants={itemVariants}>
          <CycleCalendar
            cycles={dashboard?.recent_cycles || []}
            prediction={pred}
            phase={phase}
            stats={stats}
          />
        </motion.div>

        {/* Cycle Trends Chart */}
        <motion.div className="dash-card chart-card" variants={itemVariants}>
          <div className="card-header">
            <h4>Cycle Length Trends</h4>
          </div>
          {cycleData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={cycleData}>
                <defs>
                  <linearGradient id="colorCycle" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b1eff" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b1eff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: '#6b6580', fontSize: 12 }} />
                <YAxis tick={{ fill: '#6b6580', fontSize: 12 }} domain={['auto', 'auto']} />
                <Tooltip 
                  contentStyle={{ 
                    background: 'rgba(26,26,46,0.95)', 
                    border: '1px solid rgba(139,30,255,0.2)',
                    borderRadius: 8,
                    color: '#f0eef6'
                  }} 
                />
                <Area 
                  type="monotone" dataKey="length" 
                  stroke="#8b1eff" strokeWidth={2}
                  fill="url(#colorCycle)" 
                  dot={{ fill: '#8b1eff', r: 4 }}
                />
                <Line 
                  type="monotone" dataKey="avg" 
                  stroke="#f43f5e" strokeDasharray="5 5" 
                  strokeWidth={1.5} dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-chart">
              <p>Log at least 2 cycles to see trends</p>
            </div>
          )}
        </motion.div>

        {/* Symptom Trends */}
        <motion.div className="dash-card chart-card" variants={itemVariants}>
          <div className="card-header">
            <h4>Recent Symptoms</h4>
          </div>
          {symptomData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={symptomData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: '#6b6580', fontSize: 12 }} />
                <YAxis tick={{ fill: '#6b6580', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ 
                    background: 'rgba(26,26,46,0.95)', 
                    border: '1px solid rgba(139,30,255,0.2)',
                    borderRadius: 8,
                    color: '#f0eef6'
                  }} 
                />
                <Line type="monotone" dataKey="pain" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} name="Pain" />
                <Line type="monotone" dataKey="stress" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} name="Stress" />
                <Line type="monotone" dataKey="sleep" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} name="Sleep (hrs)" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-chart">
              <p>Start logging daily to see symptom trends</p>
            </div>
          )}
        </motion.div>

        {/* Health Insights */}
        <motion.div className="dash-card insights-card" variants={itemVariants}>
          <div className="card-header">
            <h4>💡 Health Insights</h4>
          </div>
          <div className="insights-list">
            {insights.length > 0 ? (
              insights.slice(0, 4).map((insight) => (
                <div key={insight.id} className={`insight-item severity-${insight.severity}`}>
                  <div className="insight-badge">
                    {insight.severity === 'alert' ? '🚨' : 
                     insight.severity === 'warning' ? '⚠️' : 
                     insight.severity === 'tip' ? '💡' : 'ℹ️'}
                  </div>
                  <div className="insight-content">
                    <strong>{insight.title}</strong>
                    <p>{insight.description}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="insight-item">
                <div className="insight-badge">📊</div>
                <div className="insight-content">
                  <strong>Getting Started</strong>
                  <p>Log your daily symptoms and cycles to receive personalized health insights.</p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
