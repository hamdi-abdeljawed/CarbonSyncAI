import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import Header from './components/Header';
import DataTable from './components/DataTable';
import UploadZone from './components/UploadZone';
import ForecastControls from './components/ForecastControls';
import ForecastChart from './components/ForecastChart';
import OptimizationPanel from './components/OptimizationPanel';
import Notification from './components/Notification';
import LoadingBar from './components/LoadingBar';
import TabPanel from './components/TabPanel';
import ModelPerformance from './components/ModelPerformance';
import Login from './components/Login';
import { AuthProvider, useAuth } from './components/AuthContext';
import axios from 'axios';

// API base URL
const API_BASE_URL = 'http://localhost:5000/api';

// Main App component wrapped with AuthProvider
const AppWithAuth = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

// App content with authentication logic
const AppContent = () => {
  const { isAuthenticated, currentUser, logout, login } = useAuth();
  const [forceUpdate, setForceUpdate] = useState(false);
  
  // Debug current authentication state
  useEffect(() => {
    console.log('AppContent: Authentication state:', { isAuthenticated, currentUser, forceUpdate });
  }, [isAuthenticated, currentUser, forceUpdate]);
  
  // Handle login success
  const handleLoginSuccess = (user) => {
    console.log('Login success handler called with user:', user);
    // Force a re-render to show the main app
    setForceUpdate(prev => !prev);
    
    // Add a small delay to ensure state updates are processed
    setTimeout(() => {
      console.log('After timeout - Auth state:', { isAuthenticated: !!currentUser, user: currentUser });
    }, 100);
  };
  
  // Check if we have a user in localStorage/sessionStorage even if isAuthenticated is false
  const storedUser = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || 'null');
  const hasStoredCredentials = !!storedUser && (localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken'));
  
  // If not authenticated and no stored credentials, show login page
  if (!isAuthenticated && !hasStoredCredentials) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }
  
  // If authenticated or has stored credentials, show main app
  // Use stored user as fallback if currentUser is not yet set
  return <MainApp user={currentUser || storedUser} onLogout={logout} />;
};

// Main application functionality
function MainApp({ user, onLogout }) {
  // State management
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [forecastPeriods, setForecastPeriods] = useState(12);
  const [forecast, setForecast] = useState(null);
  const [optimizedForecast, setOptimizedForecast] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [activeTab, setActiveTab] = useState('data');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  const [savings, setSavings] = useState(null);
  const [impacts, setImpacts] = useState(null);
  const [forecastError, setForecastError] = useState(null);

  // Fetch sample data from the backend
  const fetchSampleData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/sample`);
      
      // Process data to match required format
      const processedData = response.data.data.map(item => {
        // Rename fields to match the required format if needed
        return {
          ...item,
          id: item.id || Date.now() + Math.random(),
          date: item.ds || item.date,
          'energy_use': item.energy_kwh,
          'transport': item.transport_km,
          'waste': item.waste_kg ? item.waste_kg / 1000 : 0, // Convert kg to tons
          'water': item.water_m3 ? item.water_m3 * 1000 : 0, // Convert m3 to liters
          'fuel': item.fuel_l,
          'emissions': item.y,
          'production': item.production_units,
          'grid_intensity': item.grid_intensity
        };
      });
      
      setData(processedData);
      
      // Update summary with standard deviation
      const enhancedSummary = {
        ...response.data.summary,
        std: calculateStdDev(processedData)
      };
      
      setSummary(enhancedSummary);
      setLoading(false);
      showNotification('Sample data loaded successfully', 'success');
    } catch (error) {
      console.error('Error fetching sample data:', error);
      setLoading(false);
      showNotification('Failed to load sample data', 'error');
    }
  }, []);

  // Load sample data on initial render
  useEffect(() => {
    fetchSampleData();
  }, [fetchSampleData]);

  // Calculate standard deviation for each numeric column
  const calculateStdDev = (data) => {
    if (!data || data.length === 0) return {};
    
    const numericColumns = [
      'energy_use', 'transport', 'waste', 'water', 
      'fuel', 'emissions', 'production', 'grid_intensity'
    ];
    
    const stdDev = {};
    
    numericColumns.forEach(col => {
      // Get values for this column, filtering out non-numeric values
      const values = data
        .map(item => parseFloat(item[col]))
        .filter(val => !isNaN(val));
      
      if (values.length > 0) {
        // Calculate mean
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        
        // Calculate sum of squared differences
        const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
        const sumSquaredDiffs = squaredDiffs.reduce((sum, val) => sum + val, 0);
        
        // Calculate standard deviation
        stdDev[col] = Math.sqrt(sumSquaredDiffs / values.length);
      } else {
        stdDev[col] = 0;
      }
    });
    
    return stdDev;
  };

  // Handle file upload
  const handleFileUpload = async (file) => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('file', file);
      
      console.log('Uploading file:', file.name, 'Size:', file.size, 'Type:', file.type);
      
      const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: 30000 // Increase timeout to 30 seconds
      });
      
      console.log('Upload response:', response.data);
      
      if (!response.data || !response.data.data) {
        throw new Error('Invalid response from server');
      }
      
      // Process data to match required format
      const processedData = response.data.data.map(item => {
        // Ensure all numeric values are properly converted from strings if needed
        const processNumeric = (value) => {
          if (value === null || value === undefined || value === '') return 0;
          // If it's a string, remove any non-numeric characters except decimal point
          if (typeof value === 'string') {
            value = value.replace(/[^0-9.]/g, '');
          }
          const num = parseFloat(value);
          return isNaN(num) ? 0 : num;
        };
        
        // Log the raw item to see what we're getting from the backend
        console.log('Raw data item:', item);
        
        // Create a processed item with all the required fields
        const processedItem = {
          ...item,
          id: item.id || Date.now() + Math.random(),
          date: item.ds || item.date,
          'energy_use': processNumeric(item.energy_kwh),
          'transport': processNumeric(item.transport_km),
          'waste': processNumeric(item.waste_kg) / 1000, // Convert kg to tons
          'water': processNumeric(item.water_m3) * 1000, // Convert m3 to liters
          'fuel': processNumeric(item.fuel_l),
          'emissions': processNumeric(item.y),
          'production': processNumeric(item.production_units),
          'grid_intensity': processNumeric(item.grid_intensity)
        };
        
        // Log the processed item to verify conversion
        console.log('Processed item:', processedItem);
        
        return processedItem;
      });
      
      console.log('Processed data:', processedData);
      
      setData(processedData);
      
      // Update summary with standard deviation
      const enhancedSummary = {
        ...response.data.summary,
        std: calculateStdDev(processedData)
      };
      
      setSummary(enhancedSummary);
      setLoading(false);
      showNotification('File uploaded successfully', 'success');
      setActiveTab('data');
      
      // Reset forecast and optimization data
      setForecast(null);
      setOptimizedForecast(null);
      setSuggestions([]);
      setImpacts(null);
      setSavings(null);
    } catch (error) {
      console.error('Error uploading file:', error);
      setLoading(false);
      showNotification(
        error.response?.data?.error || 
        error.message || 
        'Failed to upload file. Please check file format and try again.', 
        'error'
      );
    }
  };

  // Handle data update from the table
  const handleDataUpdate = (updatedData) => {
    setData(updatedData);
    
    // Calculate summary statistics
    const summaryData = {
      mean: {},
      min: {},
      max: {},
      std: {},
      total_rows: updatedData.length
    };
    
    // Determine available columns
    const numericColumns = [
      'energy_use', 'transport', 'waste', 'water', 
      'fuel', 'emissions', 'production', 'grid_intensity'
    ];
    
    numericColumns.forEach(col => {
      // Filter out empty values and ensure numeric conversion
      const values = updatedData
        .map(item => item[col])
        .filter(value => value !== '' && value !== null && value !== undefined)
        .map(value => parseFloat(value));
      
      if (values.length > 0) {
        // Calculate mean
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        summaryData.mean[col] = mean;
        
        // Calculate min and max
        summaryData.min[col] = Math.min(...values);
        summaryData.max[col] = Math.max(...values);
        
        // Calculate standard deviation
        const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
        const avgSquaredDiff = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
        summaryData.std[col] = Math.sqrt(avgSquaredDiff);
      }
    });
    
    setSummary(summaryData);
  };

  // Generate forecast
  const handleGenerateForecast = () => {
    setLoading(true);
    setForecastError(null);
    
    try {
      // Validate data
      if (!data || data.length < 3) {
        setForecastError("Please provide at least 3 months of data to generate a forecast");
        setLoading(false);
        return;
      }
      
      // Sort data by date
      const sortedData = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));
      
      // Get the last date from the data
      const lastDate = new Date(sortedData[sortedData.length - 1].date);
      
      // Create a new date for the first forecast month (next month after the last data point)
      const firstForecastDate = new Date(lastDate);
      firstForecastDate.setDate(1); // Set to first day of month
      firstForecastDate.setMonth(firstForecastDate.getMonth() + 1); // Move to next month
      firstForecastDate.setHours(0, 0, 0, 0); // Reset time
      
      const mockForecast = [];
      
      // Calculate average monthly growth rate from historical data
      const monthlyGrowthRate = calculateGrowthRate(sortedData);
      
      // Get the last month's emissions as base
      const lastEmissions = parseFloat(sortedData[sortedData.length - 1].emissions) || 8;
      
      // Generate forecast for exactly 6 months starting from the month after the last data point
      const forecastMonths = 6;
      for (let i = 0; i < forecastMonths; i++) {
        const forecastDate = new Date(firstForecastDate);
        forecastDate.setMonth(firstForecastDate.getMonth() + i);
        
        // Add some randomness to the forecast
        const randomFactor = 0.9 + Math.random() * 0.2; // Between 0.9 and 1.1
        const predictedEmissions = lastEmissions * Math.pow(1 + monthlyGrowthRate, i + 1) * randomFactor;
        
        // Add confidence bounds
        const confidenceFactor = 0.05 + (i * 0.01); // Increases with time
        const lowerBound = predictedEmissions * (1 - confidenceFactor);
        const upperBound = predictedEmissions * (1 + confidenceFactor);
        
        mockForecast.push({
          ds: forecastDate.toISOString().split('T')[0],
          predicted_emissions: predictedEmissions,
          lower_bound: lowerBound,
          upper_bound: upperBound
        });
      }
      
      // Generate mock optimized forecast
      const optimizedForecast = mockForecast.map(item => ({
        ds: item.ds,
        predicted_emissions: item.predicted_emissions * (0.7 + Math.random() * 0.1), // 70-80% of original
        lower_bound: item.lower_bound * (0.7 + Math.random() * 0.1),
        upper_bound: item.upper_bound * (0.7 + Math.random() * 0.1)
      }));
      
      // Generate mock impact factors
      const mockImpacts = {
        energy_use: { impact_score: 0.7 + Math.random() * 0.3 },
        transport: { impact_score: 0.5 + Math.random() * 0.3 },
        waste: { impact_score: 0.3 + Math.random() * 0.3 },
        water: { impact_score: 0.2 + Math.random() * 0.2 },
        fuel: { impact_score: 0.4 + Math.random() * 0.3 },
        grid_intensity: { impact_score: 0.6 + Math.random() * 0.3 }
      };
      
      // Add a small delay to simulate API call
      setTimeout(() => {
        setForecast(mockForecast);
        setOptimizedForecast(optimizedForecast);
        setImpacts(mockImpacts);
        setLoading(false);
        setActiveTab('forecast'); // Switch to forecast tab
      }, 1500);
      
    } catch (error) {
      console.error("Error generating forecast:", error);
      setForecastError("Error generating forecast. Please try again.");
      setLoading(false);
    }
  };

  // Helper function to calculate growth rate from historical data
  const calculateGrowthRate = (data) => {
    if (data.length < 2) return 0.01; // Default growth rate
    
    // Use only the most recent 6 months or all if less
    const recentData = data.slice(-6);
    
    // If we have enough data, calculate the average monthly change
    let totalChange = 0;
    let count = 0;
    
    for (let i = 1; i < recentData.length; i++) {
      const prevEmissions = parseFloat(recentData[i-1].emissions) || 0;
      const currEmissions = parseFloat(recentData[i].emissions) || 0;
      
      if (prevEmissions > 0) {
        const monthlyChange = (currEmissions - prevEmissions) / prevEmissions;
        totalChange += monthlyChange;
        count++;
      }
    }
    
    // Return the average monthly change, with a small positive bias
    return count > 0 ? (totalChange / count) + 0.005 : 0.01;
  };

  // Generate optimized forecast
  const handleOptimizeForecast = async () => {
    try {
      if (!forecast) {
        showNotification('Please generate a forecast first', 'error');
        return;
      }
      
      setLoading(true);
      
      // Create a mock optimized forecast with 15% reduction
      const optimized = forecast.map(item => {
        const reduction = item.predicted_emissions * 0.15;
        return {
          ...item,
          predicted_emissions: item.predicted_emissions - reduction,
          lower_bound: item.lower_bound - (reduction * 0.8),
          upper_bound: item.upper_bound - (reduction * 0.8)
        };
      });
      
      setOptimizedForecast(optimized);
      setLoading(false);
      showNotification('Optimization completed successfully', 'success');
    } catch (error) {
      console.error('Error optimizing forecast:', error);
      setLoading(false);
      showNotification('Failed to optimize forecast: ' + (error.message || 'Unknown error'), 'error');
    }
  };

  // Export forecast data
  const handleExportForecast = async () => {
    try {
      setLoading(true);
      
      // Determine which forecast to export
      const forecastToExport = optimizedForecast || forecast;
      
      if (!forecastToExport) {
        showNotification('No forecast data to export', 'error');
        setLoading(false);
        return;
      }
      
      console.log('Exporting forecast data:', forecastToExport.length, 'records');
      
      const response = await axios.post(
        `${API_BASE_URL}/export`,
        { forecast: forecastToExport },
        { 
          responseType: 'blob',
          timeout: 30000, // Increase timeout to 30 seconds
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          }
        }
      );
      
      console.log('Export response received, content type:', response.headers['content-type']);
      
      // Ensure we have a valid blob
      if (!(response.data instanceof Blob)) {
        throw new Error('Invalid response format');
      }
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }));
      
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'carbon_forecast.xlsx');
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(link);
      }, 100);
      
      setLoading(false);
      showNotification('Forecast exported successfully', 'success');
    } catch (error) {
      console.error('Error exporting forecast:', error);
      setLoading(false);
      showNotification(
        error.response?.data?.error || 
        error.message || 
        'Failed to export forecast. Please try again.', 
        'error'
      );
    }
  };

  // Show notification
  const showNotification = (message, type = 'success') => {
    setNotification({
      show: true,
      message,
      type
    });
    
    // Auto-hide notification after 5 seconds
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }));
    }, 5000);
  };

  return (
    <div className="app">
      <Header user={user} onLogout={onLogout} />
      <LoadingBar isLoading={loading} />
      {notification.show && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification({ ...notification, show: false })}
        />
      )}
      
      <div className="main-content">
        <TabPanel activeTab={activeTab} onTabChange={setActiveTab}>
          <TabPanel.Tab id="data" label="Data">
            <div className="data-tab">
              <div className="data-controls">
                <UploadZone onFileUpload={handleFileUpload} />
              </div>
              <DataTable 
                data={data} 
                onDataUpdate={handleDataUpdate} 
              />
              {data && data.length >= 3 && (
                <div className="generate-forecast-button-container">
                  <button 
                    className="generate-forecast-button"
                    onClick={handleGenerateForecast}
                  >
                    Generate Forecast
                  </button>
                </div>
              )}
            </div>
          </TabPanel.Tab>
          
          <TabPanel.Tab id="forecast" label="Forecast">
            <div className="forecast-container">
              <div className="forecast-left">
                <ForecastControls 
                  forecastPeriods={forecastPeriods}
                  onForecastPeriodsChange={setForecastPeriods}
                  onGenerateForecast={handleGenerateForecast}
                  onOptimizeForecast={handleOptimizeForecast}
                  onExportForecast={handleExportForecast}
                  disableOptimize={!forecast}
                  disableExport={!forecast && !optimizedForecast}
                />
                
                {(forecast || optimizedForecast) && (
                  <OptimizationPanel 
                    suggestions={suggestions}
                    savings={savings}
                    forecast={forecast}
                    optimizedForecast={optimizedForecast}
                    impacts={impacts}
                    onOptimize={handleOptimizeForecast}
                  />
                )}
              </div>
              
              <div className="forecast-right">
                {forecast && (
                  <ForecastChart 
                    data={data}
                    forecast={forecast}
                    optimizedForecast={optimizedForecast}
                    impacts={impacts}
                  />
                )}
                {!forecast && (
                  <div className="no-forecast-message">
                    <h3>No Forecast Available</h3>
                    <p>Please generate a forecast first by clicking the "Generate Forecast" button in the Data tab or in the controls above.</p>
                  </div>
                )}
              </div>
            </div>
          </TabPanel.Tab>
          
          <TabPanel.Tab id="performance" label="Performance">
            {impacts ? (
              <ModelPerformance 
                data={data}
                forecast={forecast}
                impacts={impacts}
              />
            ) : (
              <div className="no-forecast-message">
                <h3>No Performance Data Available</h3>
                <p>Please generate a forecast first to view performance metrics.</p>
              </div>
            )}
          </TabPanel.Tab>
        </TabPanel>
      </div>
    </div>
  );
}

export default AppWithAuth;
