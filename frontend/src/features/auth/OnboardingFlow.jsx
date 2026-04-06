import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../api/client';
import { motion, AnimatePresence } from 'framer-motion';
import { HiPlus, HiXMark, HiExclamationTriangle } from 'react-icons/hi2';
import './Auth.css';

const TOTAL_STEPS = 3;

export default function OnboardingFlow() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    date_of_birth: '',
    weight: '',
    height: '',
    avg_cycle_length: 28,
    avg_period_length: 5,
    activity_level: 'moderate',
    cycle_history: ['', '', ''],  // Start with 3 required fields
  });
  const { updateProfile } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const addCycleDate = () => {
    setFormData(prev => ({
      ...prev,
      cycle_history: [...prev.cycle_history, ''],
    }));
  };

  const removeCycleDate = (index) => {
    if (formData.cycle_history.length <= 3) return; // Can't remove below 3
    setFormData(prev => ({
      ...prev,
      cycle_history: prev.cycle_history.filter((_, i) => i !== index),
    }));
  };

  const updateCycleDate = (index, value) => {
    setFormData(prev => ({
      ...prev,
      cycle_history: prev.cycle_history.map((d, i) => i === index ? value : d),
    }));
  };

  const validateStep = () => {
    setError('');

    if (step === 3) {
      // Validate that all 3 required dates are filled
      const filledDates = formData.cycle_history.filter(d => d.trim() !== '');
      if (filledDates.length < 3) {
        setError('Please enter at least 3 period start dates for accurate predictions.');
        return false;
      }

      // Validate dates are not in the future
      const today = new Date();
      for (const dateStr of filledDates) {
        const d = new Date(dateStr);
        if (d > today) {
          setError('Period dates cannot be in the future.');
          return false;
        }
      }

      // Validate dates are unique
      const uniqueDates = [...new Set(filledDates)];
      if (uniqueDates.length !== filledDates.length) {
        setError('Each period date must be unique.');
        return false;
      }

      // Validate dates are in reasonable range (not more than 2 years ago)
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      for (const dateStr of filledDates) {
        const d = new Date(dateStr);
        if (d < twoYearsAgo) {
          setError('Please enter period dates from the last 2 years.');
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
      const payload = {
        ...formData,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        height: formData.height ? parseFloat(formData.height) : null,
        avg_cycle_length: parseInt(formData.avg_cycle_length),
        avg_period_length: parseInt(formData.avg_period_length),
        date_of_birth: formData.date_of_birth || null,
        cycle_history: formData.cycle_history.filter(d => d),
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

  // Sort cycle history dates for display
  const filledDates = formData.cycle_history.filter(d => d);
  const sortedDates = [...filledDates].sort((a, b) => new Date(b) - new Date(a));

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
                <h3>🩸 Cycle Information</h3>
                <div className="input-row">
                  <div className="input-group">
                    <label>Average Cycle Length (days)</label>
                    <input
                      type="number" name="avg_cycle_length"
                      className="input-field"
                      value={formData.avg_cycle_length}
                      onChange={handleChange}
                      min={18} max={45}
                    />
                  </div>
                  <div className="input-group">
                    <label>Average Period Length (days)</label>
                    <input
                      type="number" name="avg_period_length"
                      className="input-field"
                      value={formData.avg_period_length}
                      onChange={handleChange}
                      min={1} max={10}
                    />
                  </div>
                </div>
                <div className="cycle-info-note">
                  <p>💡 <strong>Not sure?</strong> 28 days is the average cycle length. Your period length is how many days you typically bleed.</p>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="onboarding-form">
                <h3>📅 Your Last 3 Period Start Dates</h3>
                <div className="cycle-history-intro">
                  <p>Enter the <strong>first day</strong> of your last 3 periods. This is essential for SYNCHER to predict your next period and ovulation window accurately.</p>
                </div>
                <div className="date-inputs">
                  {formData.cycle_history.map((date, i) => (
                    <div key={i} className="date-input-row">
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
                      <div className="date-input-controls">
                        <input
                          type="date"
                          className={`input-field ${i < 3 && !date ? 'input-required' : ''}`}
                          value={date}
                          onChange={(e) => updateCycleDate(i, e.target.value)}
                          max={new Date().toISOString().split('T')[0]}
                          required={i < 3}
                        />
                        {i >= 3 && (
                          <button
                            className="remove-date-btn"
                            onClick={() => removeCycleDate(i)}
                          >
                            <HiXMark />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  <button className="add-date-btn" onClick={addCycleDate}>
                    <HiPlus /> Add more period dates (improves accuracy)
                  </button>
                </div>

                {/* Preview section */}
                {filledDates.length >= 2 && (
                  <div className="prediction-preview">
                    <h4>📊 Quick Preview</h4>
                    {(() => {
                      const sorted = [...filledDates].sort((a, b) => new Date(a) - new Date(b));
                      const gaps = [];
                      for (let i = 1; i < sorted.length; i++) {
                        const diff = Math.round((new Date(sorted[i]) - new Date(sorted[i-1])) / (1000 * 60 * 60 * 24));
                        gaps.push(diff);
                      }
                      const avgCycle = gaps.length > 0 ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : null;
                      const lastDate = new Date(sorted[sorted.length - 1]);
                      const nextPeriod = avgCycle ? new Date(lastDate.getTime() + avgCycle * 24 * 60 * 60 * 1000) : null;
                      const ovulation = nextPeriod ? new Date(nextPeriod.getTime() - 14 * 24 * 60 * 60 * 1000) : null;

                      return (
                        <div className="preview-stats">
                          {avgCycle && (
                            <>
                              <div className="preview-stat">
                                <span className="preview-label">Avg Cycle</span>
                                <span className="preview-value">{avgCycle} days</span>
                              </div>
                              <div className="preview-stat">
                                <span className="preview-label">Next Period</span>
                                <span className="preview-value">
                                  {nextPeriod.toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                                </span>
                              </div>
                              <div className="preview-stat">
                                <span className="preview-label">Ovulation</span>
                                <span className="preview-value">
                                  ~{ovulation.toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
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
