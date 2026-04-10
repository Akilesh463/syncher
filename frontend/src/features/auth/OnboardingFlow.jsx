import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../api/client';
import { motion, AnimatePresence } from 'framer-motion';
import { HiPlus, HiXMark, HiExclamationTriangle } from 'react-icons/hi2';
import './Auth.css';

const TOTAL_STEPS = 2;

export default function OnboardingFlow() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    date_of_birth: '',
    weight: '',
    height: '',
    activity_level: 'moderate',
    // Each entry has start_date and end_date
    cycle_history: [
      { start_date: '', end_date: '' },
      { start_date: '', end_date: '' },
      { start_date: '', end_date: '' },
    ],
  });
  const { updateProfile } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const addCycleEntry = () => {
    setFormData(prev => ({
      ...prev,
      cycle_history: [...prev.cycle_history, { start_date: '', end_date: '' }],
    }));
  };

  const removeCycleEntry = (index) => {
    if (formData.cycle_history.length <= 3) return;
    setFormData(prev => ({
      ...prev,
      cycle_history: prev.cycle_history.filter((_, i) => i !== index),
    }));
  };

  const updateCycleEntry = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      cycle_history: prev.cycle_history.map((entry, i) =>
        i === index ? { ...entry, [field]: value } : entry
      ),
    }));
  };

  const validateStep = () => {
    setError('');

    if (step === 2) {
      // Validate that all 3 required entries have both dates
      const filledEntries = formData.cycle_history.filter(
        e => e.start_date.trim() !== '' && e.end_date.trim() !== ''
      );
      if (filledEntries.length < 3) {
        setError('Please enter start and end dates for at least 3 periods.');
        return false;
      }

      const today = new Date();
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

      for (const entry of filledEntries) {
        const start = new Date(entry.start_date);
        const end = new Date(entry.end_date);

        if (start > today || end > today) {
          setError('Period dates cannot be in the future.');
          return false;
        }
        if (start < twoYearsAgo) {
          setError('Please enter period dates from the last 2 years.');
          return false;
        }
        if (end < start) {
          setError('Period end date must be on or after the start date.');
          return false;
        }
        // Period shouldn't be longer than 15 days
        const periodDays = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
        if (periodDays > 15) {
          setError('Period length seems too long (>15 days). Please check your dates.');
          return false;
        }
      }

      // Validate start dates are unique
      const startDates = filledEntries.map(e => e.start_date);
      const uniqueStarts = [...new Set(startDates)];
      if (uniqueStarts.length !== startDates.length) {
        setError('Each period must have a unique start date.');
        return false;
      }

      // Validate periods don't overlap
      const sorted = [...filledEntries].sort(
        (a, b) => new Date(a.start_date) - new Date(b.start_date)
      );
      for (let i = 1; i < sorted.length; i++) {
        const prevEnd = new Date(sorted[i - 1].end_date);
        const currStart = new Date(sorted[i].start_date);
        if (currStart <= prevEnd) {
          setError('Period dates should not overlap.');
          return false;
        }
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;

    setLoading(true);
    setError('');
    try {
      // Filter to only filled entries
      const filledEntries = formData.cycle_history.filter(
        e => e.start_date && e.end_date
      );

      const payload = {
        weight: formData.weight ? parseFloat(formData.weight) : null,
        height: formData.height ? parseFloat(formData.height) : null,
        activity_level: formData.activity_level,
        date_of_birth: formData.date_of_birth || null,
        cycle_history: filledEntries,
      };

      const { data } = await authAPI.onboarding(payload);
      updateProfile(data.profile);
      navigate('/dashboard');
    } catch (err) {
      console.error('Onboarding error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (!validateStep()) return;
    if (step < TOTAL_STEPS) setStep(step + 1);
    else handleSubmit();
  };

  const prevStep = () => {
    setError('');
    if (step > 1) setStep(step - 1);
  };

  // Compute preview from filled entries
  const filledEntries = formData.cycle_history.filter(
    e => e.start_date && e.end_date
  );

  return (
    <div className="onboarding-page">
      <div className="auth-bg-shapes">
        <div className="shape shape-1" />
        <div className="shape shape-2" />
      </div>

      <motion.div 
        className="onboarding-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="onboarding-header">
          <h1>Let's Set Up SYNCHER</h1>
          <p>We need some info to personalize your experience</p>
          <div className="step-indicator">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={`step-dot ${i + 1 === step ? 'active' : ''} ${i + 1 < step ? 'completed' : ''}`}
              />
            ))}
          </div>
        </div>

        {error && (
          <motion.div 
            className="auth-error"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <HiExclamationTriangle style={{ flexShrink: 0 }} />
            {error}
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {step === 1 && (
              <div className="onboarding-form">
                <h3>📋 Basic Information</h3>
                <div className="input-group">
                  <label>Date of Birth</label>
                  <input
                    type="date" name="date_of_birth"
                    className="input-field"
                    value={formData.date_of_birth}
                    onChange={handleChange}
                  />
                </div>
                <div className="input-row">
                  <div className="input-group">
                    <label>Weight (kg)</label>
                    <input
                      type="number" name="weight"
                      className="input-field"
                      placeholder="e.g. 60"
                      value={formData.weight}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="input-group">
                    <label>Height (cm)</label>
                    <input
                      type="number" name="height"
                      className="input-field"
                      placeholder="e.g. 165"
                      value={formData.height}
                      onChange={handleChange}
                    />
                  </div>
                </div>
                <div className="input-group">
                  <label>Activity Level</label>
                  <select
                    name="activity_level"
                    className="select-field"
                    value={formData.activity_level}
                    onChange={handleChange}
                  >
                    <option value="sedentary">Sedentary</option>
                    <option value="light">Lightly Active</option>
                    <option value="moderate">Moderately Active</option>
                    <option value="active">Very Active</option>
                  </select>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="onboarding-form">
                <h3>📅 Your Last 3 Periods</h3>
                <div className="cycle-history-intro">
                  <p>Enter the <strong>start date</strong> and <strong>end date</strong> of your last 3 periods. SYNCHER will calculate your cycle length and period duration automatically.</p>
                </div>
                <div className="date-inputs">
                  {formData.cycle_history.map((entry, i) => (
                    <div key={i} className="date-entry-card">
                      <div className="date-label">
                        {i < 3 ? (
                          <span className="date-required">
                            {i === 0 ? '🔴 Most Recent Period' : 
                             i === 1 ? '🔴 Period Before That' : 
                             '🔴 3rd Most Recent'}
                          </span>
                        ) : (
                          <span className="date-optional">➕ Additional Period</span>
                        )}
                      </div>
                      <div className="date-range-row">
                        <div className="date-range-field">
                          <span className="date-range-label">Start</span>
                          <input
                            type="date"
                            className={`input-field ${i < 3 && !entry.start_date ? 'input-required' : ''}`}
                            value={entry.start_date}
                            onChange={(e) => updateCycleEntry(i, 'start_date', e.target.value)}
                            max={new Date().toISOString().split('T')[0]}
                            required={i < 3}
                          />
                        </div>
                        <div className="date-range-field">
                          <span className="date-range-label">End</span>
                          <input
                            type="date"
                            className={`input-field ${i < 3 && !entry.end_date ? 'input-required' : ''}`}
                            value={entry.end_date}
                            onChange={(e) => updateCycleEntry(i, 'end_date', e.target.value)}
                            min={entry.start_date || undefined}
                            max={new Date().toISOString().split('T')[0]}
                            required={i < 3}
                          />
                        </div>
                        {i >= 3 && (
                          <button
                            className="remove-date-btn"
                            onClick={() => removeCycleEntry(i)}
                          >
                            <HiXMark />
                          </button>
                        )}
                      </div>
                      {/* Show computed period length inline */}
                      {entry.start_date && entry.end_date && (
                        <div className="period-length-badge">
                          {Math.round((new Date(entry.end_date) - new Date(entry.start_date)) / (1000 * 60 * 60 * 24)) + 1} day period
                        </div>
                      )}
                    </div>
                  ))}
                  <button className="add-date-btn" onClick={addCycleEntry}>
                    <HiPlus /> Add more periods (improves accuracy)
                  </button>
                </div>

                {/* Preview section */}
                {filledEntries.length >= 2 && (() => {
                  const sorted = [...filledEntries].sort(
                    (a, b) => new Date(a.start_date) - new Date(b.start_date)
                  );
                  const gaps = [];
                  const periodLengths = [];
                  for (let i = 0; i < sorted.length; i++) {
                    const pLen = Math.round(
                      (new Date(sorted[i].end_date) - new Date(sorted[i].start_date)) / (1000 * 60 * 60 * 24)
                    ) + 1;
                    periodLengths.push(pLen);
                    if (i > 0) {
                      const diff = Math.round(
                        (new Date(sorted[i].start_date) - new Date(sorted[i - 1].start_date)) / (1000 * 60 * 60 * 24)
                      );
                      gaps.push(diff);
                    }
                  }
                  const avgCycle = gaps.length > 0
                    ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length)
                    : null;
                  const avgPeriod = Math.round(
                    periodLengths.reduce((a, b) => a + b, 0) / periodLengths.length
                  );
                  const lastStart = new Date(sorted[sorted.length - 1].start_date);
                  const nextPeriod = avgCycle
                    ? new Date(lastStart.getTime() + avgCycle * 24 * 60 * 60 * 1000)
                    : null;
                  const ovulation = nextPeriod
                    ? new Date(nextPeriod.getTime() - 14 * 24 * 60 * 60 * 1000)
                    : null;

                  return (
                    <div className="prediction-preview">
                      <h4>📊 Quick Preview</h4>
                      <div className="preview-stats">
                        {avgCycle && (
                          <>
                            <div className="preview-stat">
                              <span className="preview-label">Avg Cycle</span>
                              <span className="preview-value">{avgCycle} days</span>
                            </div>
                            <div className="preview-stat">
                              <span className="preview-label">Avg Period</span>
                              <span className="preview-value">{avgPeriod} days</span>
                            </div>
                            <div className="preview-stat">
                              <span className="preview-label">Next Period</span>
                              <span className="preview-value">
                                {nextPeriod.toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="onboarding-actions">
          {step > 1 && (
            <button className="btn btn-secondary" onClick={prevStep}>
              Back
            </button>
          )}
          <button
            className="btn btn-primary btn-lg"
            onClick={nextStep}
            disabled={loading}
            style={{ flex: 1 }}
          >
            {loading ? <span className="btn-loader" /> :
              step === TOTAL_STEPS ? '🚀 Complete Setup' : 'Next'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
