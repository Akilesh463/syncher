import { useState, useEffect } from 'react';
import { trackerAPI, predictionAPI } from '../../api/client';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import './Analytics.css';

const COLORS = ['#8b1eff', '#f43f5e', '#22c55e', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6'];

export default function AnalyticsPage() {
  const [dashboard, setDashboard] = useState(null);
  const [symptomData, setSymptomData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [dashRes, sympRes] = await Promise.all([
        trackerAPI.getDashboard(),
        predictionAPI.getSymptomAnalytics().catch(() => ({ data: {} })),
      ]);
      setDashboard(dashRes.data);
      setSymptomData(sympRes.data);
    } catch {}
    setLoading(false);
  };

  if (loading) {
    return <div className="skeleton" style={{ height: 400, borderRadius: 16 }} />;
  }

  const stats = dashboard?.stats || {};
  const logs = (dashboard?.recent_logs || []).reverse();
  const cycles = (dashboard?.recent_cycles || []).filter(c => c.cycle_length).reverse();

  // Mood distribution for pie chart
  const moodDist = symptomData?.mood_distribution || {};
  const moodPieData = Object.entries(moodDist).map(([mood, count]) => ({
    name: mood.charAt(0).toUpperCase() + mood.slice(1),
    value: count,
  }));

  // Pain trend data
  const painData = logs.map(l => ({
    date: new Date(l.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    pain: l.pain_level,
    stress: l.stress_level,
  }));

  // Cycle length chart
  const cycleChartData = cycles.map((c, i) => ({
    cycle: `Cycle ${i + 1}`,
    length: c.cycle_length,
  }));

  // Sleep data
  const sleepData = logs.filter(l => l.sleep_hours).map(l => ({
    date: new Date(l.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    sleep: l.sleep_hours,
  }));

  return (
    <div className="analytics-page">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="analytics-header">
          <h2>📊 Health Analytics</h2>
          <p>Deep dive into your health patterns and trends</p>
        </div>

        {/* Stats cards */}
        <div className="stats-row">
          <div className="stat-card glass-card">
            <span className="stat-label">Avg Cycle</span>
            <span className="stat-value">{stats.avg_cycle_length || 28}</span>
            <span className="stat-unit">days</span>
          </div>
          <div className="stat-card glass-card">
            <span className="stat-label">Avg Period</span>
            <span className="stat-value">{stats.avg_period_length || 5}</span>
            <span className="stat-unit">days</span>
          </div>
          <div className="stat-card glass-card">
            <span className="stat-label">Avg Pain</span>
            <span className="stat-value">{symptomData?.avg_pain || 0}</span>
            <span className="stat-unit">/ 5</span>
          </div>
          <div className="stat-card glass-card">
            <span className="stat-label">Avg Sleep</span>
            <span className="stat-value">{symptomData?.avg_sleep || 7}</span>
            <span className="stat-unit">hours</span>
          </div>
        </div>

        <div className="analytics-grid">
          {/* Cycle Length Chart */}
          <div className="analytics-card glass-card">
            <h4>📏 Cycle Length History</h4>
            {cycleChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={cycleChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="cycle" tick={{ fill: '#6b6580', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#6b6580', fontSize: 12 }} />
                  <Tooltip contentStyle={{
                    background: 'rgba(26,26,46,0.95)',
                    border: '1px solid rgba(139,30,255,0.2)',
                    borderRadius: 8, color: '#f0eef6'
                  }} />
                  <Bar dataKey="length" fill="#8b1eff" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-chart"><p>Not enough cycle data yet</p></div>
            )}
          </div>

          {/* Pain & Stress Trends */}
          <div className="analytics-card glass-card">
            <h4>😣 Pain & Stress Trends</h4>
            {painData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={painData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fill: '#6b6580', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#6b6580', fontSize: 12 }} domain={[0, 5]} />
                  <Tooltip contentStyle={{
                    background: 'rgba(26,26,46,0.95)',
                    border: '1px solid rgba(139,30,255,0.2)',
                    borderRadius: 8, color: '#f0eef6'
                  }} />
                  <Legend />
                  <Line type="monotone" dataKey="pain" stroke="#ef4444" strokeWidth={2} name="Pain" />
                  <Line type="monotone" dataKey="stress" stroke="#f59e0b" strokeWidth={2} name="Stress" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-chart"><p>Start logging to see trends</p></div>
            )}
          </div>

          {/* Mood Distribution */}
          <div className="analytics-card glass-card">
            <h4>😊 Mood Distribution</h4>
            {moodPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={moodPieData}
                    cx="50%" cy="50%"
                    innerRadius={60} outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {moodPieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{
                    background: 'rgba(26,26,46,0.95)',
                    border: '1px solid rgba(139,30,255,0.2)',
                    borderRadius: 8, color: '#f0eef6'
                  }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-chart"><p>Log your mood to see distribution</p></div>
            )}
          </div>

          {/* Sleep Chart */}
          <div className="analytics-card glass-card">
            <h4>😴 Sleep Patterns</h4>
            {sleepData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={sleepData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fill: '#6b6580', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#6b6580', fontSize: 12 }} domain={[0, 12]} />
                  <Tooltip contentStyle={{
                    background: 'rgba(26,26,46,0.95)',
                    border: '1px solid rgba(139,30,255,0.2)',
                    borderRadius: 8, color: '#f0eef6'
                  }} />
                  <Bar dataKey="sleep" fill="#22c55e" radius={[8, 8, 0, 0]} name="Sleep (hrs)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-chart"><p>Log your sleep to see patterns</p></div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
