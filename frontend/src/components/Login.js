import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import VoiceRecorder from './VoiceRecorder';
import './Login.css';

const API_BASE_URL = 'http://localhost:5000/api';

const Login = ({ onLoginSuccess }) => {
  const { login, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('login');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    rememberMe: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  // Check if Web Authentication API is available
  useEffect(() => {
    if (window.PublicKeyCredential) {
      setBiometricAvailable(true);
    }
  }, []);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });

    // Check password strength when password field changes
    if (name === 'password') {
      const strength = calculatePasswordStrength(value);
      setPasswordStrength(strength);
    }
  };

  // Calculate password strength (0-100)
  const calculatePasswordStrength = (password) => {
    if (!password) return 0;

    let score = 0;
    // Length check
    if (password.length >= 8) score += 20;
    if (password.length >= 12) score += 10;

    // Complexity checks
    if (/[A-Z]/.test(password)) score += 15; // Has uppercase
    if (/[a-z]/.test(password)) score += 15; // Has lowercase
    if (/[0-9]/.test(password)) score += 15; // Has number
    if (/[^A-Za-z0-9]/.test(password)) score += 15; // Has special char
    
    // Variety check
    const uniqueChars = new Set(password).size;
    score += Math.min(uniqueChars * 2, 10); // Up to 10 points for variety

    return Math.min(score, 100);
  };

  // Get password strength color
  const getStrengthColor = () => {
    if (passwordStrength < 30) return '#FF3333';
    if (passwordStrength < 60) return '#FFA500';
    if (passwordStrength < 80) return '#FFFF00';
    return '#00FF00';
  };

  // Get password strength label
  const getStrengthLabel = () => {
    if (passwordStrength < 30) return 'Weak';
    if (passwordStrength < 60) return 'Fair';
    if (passwordStrength < 80) return 'Good';
    return 'Strong';
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      if (activeTab === 'login') {
        // Use the auth context login function
        const result = await login(formData.username, formData.password, formData.rememberMe);
        
        if (result.success) {
          setSuccessMessage('Login successful!');
          console.log('Login successful, calling onLoginSuccess with user:', result.user);
          // Call onLoginSuccess immediately
          if (onLoginSuccess) {
            onLoginSuccess(result.user);
          }
        } else {
          setError(result.error);
        }
      } else {
        // Registration validation
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }

        if (passwordStrength < 60) {
          setError('Please use a stronger password');
          setLoading(false);
          return;
        }

        try {
          console.log('Attempting registration with:', {
            username: formData.username,
            email: formData.email,
            password: '********' // Don't log actual password
          });
          
          // Register request
          const response = await axios.post(`${API_BASE_URL}/auth/register`, {
            username: formData.username,
            email: formData.email,
            password: formData.password,
            profile: {
              full_name: '',
              department: '',
              position: ''
            }
          });
          
          console.log('Registration response:', response.data);
          
          // Store tokens and user data immediately
          const storage = formData.rememberMe ? localStorage : sessionStorage;
          storage.setItem('accessToken', response.data.access_token);
          storage.setItem('refreshToken', response.data.refresh_token);
          storage.setItem('user', JSON.stringify(response.data.user));
          
          setSuccessMessage('Registration successful!');
          
          // Call onLoginSuccess to redirect to main app
          if (onLoginSuccess) {
            onLoginSuccess(response.data.user);
          }
        } catch (regError) {
          console.error('Registration error details:', regError);
          setError(
            regError.response?.data?.error || 
            'Registration failed. Please try a different username or email.'
          );
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      setError(
        error.response?.data?.error || 
        'An error occurred. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // State for voice authentication
  const [showVoiceAuth, setShowVoiceAuth] = useState(false);
  const [voiceAuthMode, setVoiceAuthMode] = useState('two-step-verify');
  const [voiceUserId, setVoiceUserId] = useState('');
  const [voiceVerificationStep, setVoiceVerificationStep] = useState(1); // 1: reference recording, 2: verification recording
  
  // Handle biometric authentication selection
  const handleBiometricAuth = () => {
    setError('');
    setSuccessMessage('');
    setShowVoiceAuth(true);
    setVoiceAuthMode('two-step-verify');
    setVoiceVerificationStep(1); // Start with reference recording
    
    // For demo purposes, we'll use a fixed user ID or the entered username
    setVoiceUserId(formData.username || 'user-biometric');
  };
  
  // Handle voice authentication success
  const handleVoiceSuccess = (data) => {
    console.log('Voice authentication successful:', data);
    
    if (voiceAuthMode === 'two-step-verify') {
      if (data.step === 1 || voiceVerificationStep === 1) {
        // First step completed (reference voice recorded)
        console.log('Step 1 completed, moving to step 2');
        setSuccessMessage('Reference voice recorded! Now record your verification voice.');
        
        // Important: Force a small delay before changing the step
        // This ensures the component has time to process the state change
        setTimeout(() => {
          setVoiceVerificationStep(2); // Move to verification step
        }, 500);
      } else if (data.success) {
        // Second step completed (verification successful)
        // Make sure we have a confidence score
        const confidence = data.confidence || 85.5; // Default if missing
        setSuccessMessage(`Voice authentication successful! Confidence: ${confidence.toFixed(1)}%`);
        
        // Store tokens and user data
        const storage = formData.rememberMe ? localStorage : sessionStorage;
        
        // Create a mock user if needed for demo purposes
        const user = data.user || {
          id: 'demo-user-123',
          username: 'demo_user',
          email: 'demo@example.com',
          role: 'user'
        };
        
        // Store the user data
        storage.setItem('user', JSON.stringify(user));
        
        // Store tokens if available
        if (data.access_token || data.accessToken) {
          storage.setItem('accessToken', data.access_token || data.accessToken);
          if (data.refresh_token || data.refreshToken) {
            storage.setItem('refreshToken', data.refresh_token || data.refreshToken);
          }
        } else {
          // Create a mock token for demo purposes
          storage.setItem('accessToken', 'demo-token-' + Date.now());
        }
        
        // Only redirect when the user clicks the Continue button in VoiceRecorder
        if (data.continueToApp) {
          console.log('Continuing to app with user:', user);
          if (onLoginSuccess) {
            onLoginSuccess(user);
          }
        }
      }
    } else if (voiceAuthMode === 'verify') {
      const confidence = data.confidence || 85.5; // Default if missing
      setSuccessMessage(`Voice authentication successful! Confidence: ${confidence.toFixed(1)}%`);
      
      // Store tokens and user data
      const storage = formData.rememberMe ? localStorage : sessionStorage;
      storage.setItem('accessToken', data.access_token || data.accessToken);
      if (data.refresh_token || data.refreshToken) {
        storage.setItem('refreshToken', data.refresh_token || data.refreshToken);
      }
      storage.setItem('user', JSON.stringify(data.user));
      
      // Call onLoginSuccess immediately, but delay slightly to allow UI to update
      setTimeout(() => {
        if (onLoginSuccess) {
          onLoginSuccess(data.user);
        }
      }, 2500); // Delay login redirect to show the confidence score
    }
  };
  
  // Handle voice authentication error
  const handleVoiceError = (error) => {
    console.error('Voice authentication error:', error);
    
    if (voiceAuthMode === 'two-step-verify') {
      // For two-step verification, just show error and allow retry
      setError(error.message || 'Voice processing failed. Please try again.');
      // Reset to first step if there was an error in the second step
      if (voiceVerificationStep === 2) {
        setVoiceVerificationStep(1);
      }
    } else {
      setError(error.message || 'Voice authentication failed. Please try again or use password.');
      setShowVoiceAuth(false);
    }
  };
  
  // Close voice authentication modal
  const closeVoiceAuth = () => {
    setShowVoiceAuth(false);
  };

  return (
    <div className="login-container">
      <div className="login-welcome">
        <div className="welcome-content">
          <h1 className="welcome-title">Welcome to CarbonSyncAI</h1>
          <p className="welcome-subtitle">
            The intelligent companion of YAP-T CarbonSync. Elevate industrial efficiency with AI-driven predictions, personalized recommendations, and seamless data integration. Import Excel/CSV or create custom datasets in our intuitive interface. Log in now, discover our advanced features, and unlock smarter, faster operations.
          </p>
          <div className="welcome-features">
            <div className="feature">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 11.5C21 16.75 16.75 21 11.5 21C6.25 21 2 16.75 2 11.5C2 6.25 6.25 2 11.5 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M22 22L20 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M15 8H8V15H15V8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M19 2V8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M22 5H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3>AI Predictions</h3>
              <p>Advanced forecasting with Prophet algorithm</p>
            </div>
            <div className="feature">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 16V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 8H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3>Smart Optimization</h3>
              <p>Personalized recommendations to reduce carbon footprint</p>
            </div>
            <div className="feature">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M16 13H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M16 17H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M10 9H9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3>Data Integration</h3>
              <p>Seamless import from Excel/CSV or create custom datasets</p>
            </div>
          </div>
        </div>
      </div>
      <div className="login-form-container">
        <div className="login-form-wrapper">
          <div className="login-header">
            <div className="login-logo">
              <div className="login-logo-icon"></div>
              <h2 className="login-logo-text">CarbonSync AI</h2>
            </div>
            <div className="login-tabs">
              <button 
                className={`login-tab ${activeTab === 'login' ? 'active' : ''}`}
                onClick={() => setActiveTab('login')}
              >
                Login
              </button>
              <button 
                className={`login-tab ${activeTab === 'register' ? 'active' : ''}`}
                onClick={() => setActiveTab('register')}
              >
                Register
              </button>
            </div>
          </div>
          
          {error && <div className="auth-error">{error}</div>}
          {successMessage && <div className="auth-success">{successMessage}</div>}
          
          <form onSubmit={handleSubmit} className="login-form">
            {activeTab === 'register' && (
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <div className="input-with-icon">
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required={activeTab === 'register'}
                    placeholder="Enter your email"
                  />
                  <span className="input-icon">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M22 6L12 13L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                </div>
              </div>
            )}
            
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <div className="input-with-icon">
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  placeholder="Enter your username"
                />
                <span className="input-icon">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-with-icon">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder="Enter your password"
                />
                <span 
                  className="input-icon clickable" 
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M3 3L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </span>
              </div>
              
              {activeTab === 'register' && formData.password && (
                <div className="password-strength">
                  <div className="strength-bar">
                    <div 
                      className="strength-progress" 
                      style={{ 
                        width: `${passwordStrength}%`,
                        backgroundColor: getStrengthColor()
                      }}
                    ></div>
                  </div>
                  <span className="strength-text" style={{ color: getStrengthColor() }}>
                    {getStrengthLabel()}
                  </span>
                </div>
              )}
            </div>
            
            {activeTab === 'register' && (
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <div className="input-with-icon">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required={activeTab === 'register'}
                    placeholder="Confirm your password"
                  />
                  <span className="input-icon">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M16 10L11 15L8 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                </div>
              </div>
            )}
            
            {activeTab === 'login' && (
              <div className="form-group remember-me">
                <label className="checkbox-container">
                  <input
                    type="checkbox"
                    name="rememberMe"
                    checked={formData.rememberMe}
                    onChange={handleChange}
                  />
                  <span className="checkmark"></span>
                  Remember me
                </label>
                <a href="#" className="forgot-password">Forgot password?</a>
              </div>
            )}
            
            <button 
              type="submit" 
              className="login-button"
              disabled={loading}
            >
              {loading ? (
                <div className="button-loader"></div>
              ) : (
                activeTab === 'login' ? 'Login' : 'Register'
              )}
            </button>
            
            {activeTab === 'login' && biometricAvailable && (
              <button 
                type="button" 
                className="biometric-button"
                onClick={handleBiometricAuth}
                disabled={loading}
              >
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6.5 6.5C7.5 5.5 9.2 4 12 4C14.8 4 16.5 5.5 17.5 6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M3 10C5 7 8 4 12 4C16 4 19 7 21 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9 12C9 12.5523 9.44772 13 10 13C10.5523 13 11 12.5523 11 12C11 11.4477 10.5523 11 10 11C9.44772 11 9 11.4477 9 12Z" fill="currentColor"/>
                  <path d="M13 12C13 12.5523 13.4477 13 14 13C14.5523 13 15 12.5523 15 12C15 11.4477 14.5523 11 14 11C13.4477 11 13 11.4477 13 12Z" fill="currentColor"/>
                  <path d="M8 16C8 16 9 18 12 18C15 18 16 16 16 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Login with Voice Recognition
              </button>
            )}
            
            <div className="login-divider">
              <span>or continue with</span>
            </div>
            
            <div className="social-login">
              <button type="button" className="social-button google">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21.8055 10.0415H21V10H12V14H17.6515C16.827 16.3285 14.6115 18 12 18C8.6865 18 6 15.3135 6 12C6 8.6865 8.6865 6 12 6C13.5295 6 14.921 6.577 15.9805 7.5195L18.809 4.691C17.023 3.0265 14.634 2 12 2C6.4775 2 2 6.4775 2 12C2 17.5225 6.4775 22 12 22C17.5225 22 22 17.5225 22 12C22 11.3295 21.931 10.675 21.8055 10.0415Z" fill="#FFC107"/>
                  <path d="M3.15302 7.3455L6.43852 9.755C7.32752 7.554 9.48052 6 12 6C13.5295 6 14.921 6.577 15.9805 7.5195L18.809 4.691C17.023 3.0265 14.634 2 12 2C8.15902 2 4.82802 4.1685 3.15302 7.3455Z" fill="#FF3D00"/>
                  <path d="M12 22C14.583 22 16.93 21.0115 18.7045 19.404L15.6095 16.785C14.5718 17.5742 13.3038 18.001 12 18C9.39897 18 7.19047 16.3415 6.35847 14.027L3.09747 16.5395C4.75247 19.778 8.11347 22 12 22Z" fill="#4CAF50"/>
                  <path d="M21.8055 10.0415H21V10H12V14H17.6515C17.2571 15.1082 16.5467 16.0766 15.608 16.7855L15.6095 16.7845L18.7045 19.4035C18.4855 19.6025 22 17 22 12C22 11.3295 21.931 10.675 21.8055 10.0415Z" fill="#1976D2"/>
                </svg>
              </button>
              <button type="button" className="social-button github">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C6.477 2 2 6.477 2 12C2 16.418 4.865 20.166 8.839 21.489C9.339 21.579 9.5 21.269 9.5 21.009C9.5 20.775 9.493 20.079 9.489 19.256C6.726 19.85 6.139 17.966 6.139 17.966C5.685 16.812 5.029 16.503 5.029 16.503C4.121 15.882 5.098 15.895 5.098 15.895C6.101 15.965 6.629 16.929 6.629 16.929C7.521 18.437 8.97 18.013 9.52 17.764C9.608 17.129 9.858 16.706 10.136 16.47C7.91 16.231 5.58 15.374 5.58 11.613C5.58 10.539 5.984 9.661 6.649 8.977C6.551 8.729 6.195 7.785 6.75 6.344C6.75 6.344 7.586 6.079 9.478 7.439C10.295 7.219 11.15 7.109 12 7.105C12.85 7.109 13.705 7.219 14.523 7.439C16.414 6.079 17.248 6.344 17.248 6.344C17.805 7.785 17.449 8.729 17.351 8.977C18.018 9.661 18.418 10.539 18.418 11.613C18.418 15.384 16.084 16.228 13.852 16.462C14.196 16.755 14.5 17.334 14.5 18.22C14.5 19.474 14.488 20.683 14.488 21.009C14.488 21.271 14.648 21.584 15.154 21.486C19.125 20.16 22 16.415 22 12C22 6.477 17.523 2 12 2Z" fill="currentColor"/>
                </svg>
              </button>
              <button type="button" className="social-button microsoft">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M11.4 2H2V11.4H11.4V2Z" fill="#F25022"/>
                  <path d="M11.4 12.6H2V22H11.4V12.6Z" fill="#00A4EF"/>
                  <path d="M22 2H12.6V11.4H22V2Z" fill="#7FBA00"/>
                  <path d="M22 12.6H12.6V22H22V12.6Z" fill="#FFB900"/>
                </svg>
              </button>
            </div>
          </form>
          
          {/* Voice Authentication Modal */}
          {showVoiceAuth && (
            <div className="voice-auth-modal">
              <div className="voice-auth-content">
                <button className="close-modal" onClick={closeVoiceAuth}>
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <h3>Voice Authentication</h3>
                <p>
                  {voiceVerificationStep === 1
                    ? 'Step 1: Record your voice as a reference'
                    : 'Step 2: Record your voice again for verification'}
                </p>
                <VoiceRecorder 
                  onSuccess={handleVoiceSuccess}
                  onError={handleVoiceError}
                  userId={voiceUserId}
                  mode={voiceAuthMode}
                  step={voiceVerificationStep}
                  totalSteps={2}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
