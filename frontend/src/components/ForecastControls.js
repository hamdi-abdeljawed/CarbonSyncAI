import React from 'react';
import './ForecastControls.css';

const ForecastControls = ({ 
  forecastPeriods, 
  onForecastPeriodsChange, 
  onGenerateForecast, 
  onOptimizeForecast, 
  onExportForecast,
  disableOptimize,
  disableExport
}) => {
  return (
    <div className="card forecast-controls">
      <h3 className="card-title">Forecast Controls</h3>
      
      <div className="form-control">
        <label htmlFor="forecast-periods">Forecast Periods (1-24 months)</label>
        <div className="slider-container">
          <input 
            type="range" 
            id="forecast-periods" 
            min="1" 
            max="24" 
            value={forecastPeriods} 
            onChange={(e) => onForecastPeriodsChange(parseInt(e.target.value))}
            className="neon-slider"
          />
          <div className="slider-value">{forecastPeriods}</div>
        </div>
      </div>
      
      <div className="controls-buttons">
        <button 
          className="btn btn-primary generate-forecast-btn" 
          onClick={onGenerateForecast}
        >
          Generate Forecast
        </button>
        
        <button 
          className="btn btn-secondary" 
          onClick={onOptimizeForecast}
          disabled={disableOptimize}
        >
          Optimize
        </button>
        
        <button 
          className="btn btn-success" 
          onClick={onExportForecast}
          disabled={disableExport}
        >
          Export
        </button>
      </div>
    </div>
  );
};

export default ForecastControls;
