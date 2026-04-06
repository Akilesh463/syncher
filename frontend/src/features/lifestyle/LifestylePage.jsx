import { useState, useEffect } from 'react';
import { insightsAPI } from '../../api/client';
import { motion } from 'framer-motion';
import '../insights/Analytics.css';

const PHASE_CONFIG = {
  menstrual: { color: '#ef4444', emoji: '🩸', label: 'Menstrual Phase', gradient: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.05))' },
  follicular: { color: '#22c55e', emoji: '🌱', label: 'Follicular Phase', gradient: 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.05))' },
  ovulation: { color: '#f59e0b', emoji: '✨', label: 'Ovulation Phase', gradient: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.05))' },
  luteal: { color: '#8b5cf6', emoji: '🌙', label: 'Luteal Phase', gradient: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(139,92,246,0.05))' },
  unknown: { color: '#6b6580', emoji: '❓', label: 'Unknown Phase', gradient: 'linear-gradient(135deg, rgba(107,101,128,0.15), rgba(107,101,128,0.05))' },
};

const SECTION_TITLES = {
  diet: '🥗 Diet & Nutrition',
  exercise: '🏋️ Exercise',
  selfcare: '🛁 Self Care',
  productivity: '🎯 Productivity',
  general: '💡 General Tips',
};

export default function LifestylePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    try {
      const { data } = await insightsAPI.getRecommendations();
      setData(data);
    } catch {}
    setLoading(false);
  };

  if (loading) {
    return <div className="skeleton" style={{ height: 300, borderRadius: 16 }} />;
  }

  const phase = data?.phase || 'unknown';
  const phaseInfo = data?.phase_info || {};
  const config = PHASE_CONFIG[phase] || PHASE_CONFIG.unknown;
  const recs = data?.recommendations || {};

  return (
    <div className="lifestyle-page">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="lifestyle-header">
          <h2>❤️ Lifestyle Intelligence</h2>
          <p>Personalized recommendations based on your current hormonal phase</p>
        </div>

        {/* Phase Banner */}
        <div 
          className="phase-banner glass-card"
          style={{ 
            background: config.gradient,
            border: `1px solid ${config.color}30`,
          }}
        >
          <div className="phase-emoji-lg">{config.emoji}</div>
          <div className="phase-banner-info">
            <h3 style={{ color: config.color }}>{config.label}</h3>
            <p>{phaseInfo.description || 'Log your cycles to get phase-specific recommendations'}</p>
            {phaseInfo.day_of_cycle > 0 && (
              <span className="badge" style={{ marginTop: 8 }}>
                Day {phaseInfo.day_of_cycle} of your cycle
              </span>
            )}
          </div>
        </div>

        {/* Recommendations by Category */}
        {Object.entries(recs).map(([category, items]) => (
          <div key={category} className="rec-section">
            <h3>{SECTION_TITLES[category] || category}</h3>
            <div className="rec-grid">
              {items.map((rec, i) => (
                <motion.div 
                  key={i}
                  className="rec-card glass-card"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div className="rec-icon">{rec.icon}</div>
                  <div>
                    <h4>{rec.title}</h4>
                    <p>{rec.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
