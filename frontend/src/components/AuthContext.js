import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

// Create the context
const AuthContext = createContext();

// Custom hook to use the auth context
export const useAuth = () => {
  return useContext(AuthContext);
};

// Provider component
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Debug authentication state changes
  useEffect(() => {
    console.log('Auth state changed:', { isAuthenticated, currentUser });
  }, [isAuthenticated, currentUser]);

  // Check if user is already logged in on initial load
  useEffect(() => {
    const checkAuthStatus = async () => {
      const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || 'null');
      const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
      
      if (user && token) {
        // Set up axios default headers
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        try {
          // Verify token is still valid
          const response = await axios.get(`${API_BASE_URL}/auth/profile`);
          setCurrentUser(response.data.user);
          setIsAuthenticated(true);
        } catch (error) {
          // Token might be expired, try to refresh
          const refreshToken = localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');
          
          if (refreshToken) {
            try {
              const refreshResponse = await axios.post(`${API_BASE_URL}/auth/refresh`, {}, {
                headers: { 'Authorization': `Bearer ${refreshToken}` }
              });
              
              // Update token
              const storage = localStorage.getItem('accessToken') ? localStorage : sessionStorage;
              storage.setItem('accessToken', refreshResponse.data.access_token);
              
              // Set up axios default headers with new token
              axios.defaults.headers.common['Authorization'] = `Bearer ${refreshResponse.data.access_token}`;
              
              // Get user profile with new token
              const profileResponse = await axios.get(`${API_BASE_URL}/auth/profile`);
              setCurrentUser(profileResponse.data.user);
              setIsAuthenticated(true);
            } catch (refreshError) {
              // Refresh token also expired, clear everything
              logout();
            }
          } else {
            // No refresh token, clear everything
            logout();
          }
        }
      }
      
      setLoading(false);
    };
    
    checkAuthStatus();
  }, []);

  // Login function
  const login = async (username, password, rememberMe = false) => {
    try {
      console.log('Attempting login for:', username);
      
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        username,
        password
      });
      
      console.log('Login response:', response.data);
      
      const { user, access_token, refresh_token } = response.data;
      
      // Store tokens and user data
      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem('accessToken', access_token);
      storage.setItem('refreshToken', refresh_token);
      storage.setItem('user', JSON.stringify(user));
      
      // Set up axios default headers
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      // Update state
      setCurrentUser(user);
      setIsAuthenticated(true);
      
      console.log('Authentication state updated:', { user, isAuthenticated: true });
      
      return { success: true, user };
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Login failed. Please check your credentials.'
      };
    }
  };

  // Register function
  const register = async (userData) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/register`, userData);
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Registration failed. Please try again.'
      };
    }
  };

  // Logout function
  const logout = () => {
    // Clear tokens and user data
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
    sessionStorage.removeItem('user');
    
    // Clear axios default headers
    delete axios.defaults.headers.common['Authorization'];
    
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  // Update user profile
  const updateProfile = async (profileData) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/auth/profile`, profileData);
      
      // Update stored user data
      const storage = localStorage.getItem('user') ? localStorage : sessionStorage;
      storage.setItem('user', JSON.stringify(response.data.user));
      
      setCurrentUser(response.data.user);
      
      return { success: true, user: response.data.user };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Failed to update profile. Please try again.'
      };
    }
  };

  // Change password
  const changePassword = async (currentPassword, newPassword) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/change-password`, {
        current_password: currentPassword,
        new_password: newPassword
      });
      
      return { success: true, message: response.data.message };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Failed to change password. Please try again.'
      };
    }
  };

  // Context value
  const value = {
    currentUser,
    isAuthenticated,
    loading,
    login,
    register,
    logout,
    updateProfile,
    changePassword
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
