import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';
import './Auth.css';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    email: '', username: '', password: '', password_confirm: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.password_confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await register(formData);
      navigate('/onboarding');
    } catch (err) {
      const errors = err.response?.data;
      if (errors) {
        const firstError = Object.values(errors).flat()[0];
        setError(typeof firstError === 'string' ? firstError : 'Registration failed.');
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-shapes">
        <div className="shape shape-1" />
        <div className="shape shape-2" />
        <div className="shape shape-3" />
      </div>

      <motion.div 
        className="auth-container"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="auth-header">
          <div className="auth-logo">
            <div className="logo-icon-lg">S</div>
          </div>
          <h1>Create Account</h1>
          <p>Join SYNCHER and take control of your health</p>
        </div>

        {error && (
          <motion.div 
            className="auth-error"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-group">
            <label htmlFor="email">Email</label>
            <input
              id="email" name="email" type="email"
              className="input-field"
              placeholder="your@email.com"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="username">Username</label>
            <input
              id="username" name="username" type="text"
              className="input-field"
              placeholder="Choose a username"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </div>

          <div className="input-row">
            <div className="input-group">
              <label htmlFor="password">Password</label>
              <input
                id="password" name="password" type="password"
                className="input-field"
                placeholder="Min 8 characters"
                value={formData.password}
                onChange={handleChange}
                required minLength={8}
              />
            </div>
            <div className="input-group">
              <label htmlFor="password_confirm">Confirm</label>
              <input
                id="password_confirm" name="password_confirm" type="password"
                className="input-field"
                placeholder="Repeat password"
                value={formData.password_confirm}
                onChange={handleChange}
                required minLength={8}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg btn-full"
            disabled={loading}
          >
            {loading ? <span className="btn-loader" /> : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          <p>Already have an account? <Link to="/login">Sign in</Link></p>
        </div>
      </motion.div>
    </div>
  );
}
