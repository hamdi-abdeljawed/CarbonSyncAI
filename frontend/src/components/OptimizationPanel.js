import React, { useState } from 'react';
import './OptimizationPanel.css';

const OptimizationPanel = ({ suggestions, savings, forecast, optimizedForecast, impacts, onOptimize }) => {
  const [expandedSuggestion, setExpandedSuggestion] = useState(null);
  
  // Calculate total potential savings if not provided
  const calculateSavings = () => {
    if (savings) return savings;
    
    if (forecast && optimizedForecast && forecast.length > 0 && optimizedForecast.length > 0) {
      let totalOriginal = 0;
      let totalOptimized = 0;
      
      for (let i = 0; i < forecast.length; i++) {
        totalOriginal += forecast[i].predicted_emissions || 0;
        totalOptimized += optimizedForecast[i].predicted_emissions || 0;
      }
      
      const totalSavings = totalOriginal - totalOptimized;
      const percentageSavings = (totalSavings / totalOriginal) * 100;
      
      return {
        total: totalSavings,
        percentage: percentageSavings
      };
    }
    
    return null;
  };
  
  const calculatedSavings = calculateSavings();
  
  // Generate default suggestions if none provided
  const defaultSuggestions = () => {
    if (suggestions && suggestions.length > 0) return suggestions;
    
    if (impacts) {
      const sortedImpacts = Object.entries(impacts)
        .sort((a, b) => b[1].impact_score - a[1].impact_score);
      
      return sortedImpacts.map(([factor, data]) => {
        let factorName = factor;
        let action = '';
        let description = '';
        let estimatedSaving = data.impact_score * 2; // Just an example calculation
        
        switch(factor) {
          case 'energy_use':
            factorName = 'Energy Use';
            action = 'Reduce energy consumption by 15%';
            description = 'Implement energy-efficient lighting, optimize HVAC systems, and consider renewable energy sources to reduce overall energy consumption.';
            break;
          case 'transport':
            factorName = 'Transport';
            action = 'Optimize transportation routes';
            description = 'Redesign logistics routes, implement fleet management systems, and consider electric vehicles to reduce transport-related emissions.';
            break;
          case 'waste':
            factorName = 'Waste';
            action = 'Implement waste reduction program';
            description = 'Establish recycling programs, reduce packaging waste, and implement circular economy principles to minimize waste generation.';
            break;
          case 'water':
            factorName = 'Water';
            action = 'Reduce water consumption';
            description = 'Install water-efficient fixtures, implement water recycling systems, and optimize production processes to reduce water usage.';
            break;
          case 'fuel':
            factorName = 'Fuel';
            action = 'Switch to cleaner fuel alternatives';
            description = 'Transition to biofuels, optimize combustion processes, and implement fuel efficiency measures to reduce fuel-related emissions.';
            break;
          case 'grid_intensity':
            factorName = 'Grid Intensity';
            action = 'Shift energy usage to low-intensity periods';
            description = 'Implement load shifting strategies, utilize energy storage, and schedule energy-intensive operations during periods of lower grid carbon intensity.';
            break;
          default:
            action = `Optimize ${factorName}`;
            description = `Implement measures to reduce emissions from ${factorName}.`;
        }
        
        return {
          factor: factorName,
          action,
          description,
          estimated_saving: estimatedSaving,
          impact_score: data.impact_score
        };
      });
    }
    
    return [];
  };
  
  const generatedSuggestions = defaultSuggestions();
  
  const toggleSuggestion = (index) => {
    if (expandedSuggestion === index) {
      setExpandedSuggestion(null);
    } else {
      setExpandedSuggestion(index);
    }
  };
  
  return (
    <div className="optimization-panel">
      <h3 className="card-title">Optimization Suggestions</h3>
      
      {generatedSuggestions.length > 0 ? (
        <div className="suggestions-list">
          {generatedSuggestions.map((suggestion, index) => (
            <div 
              key={index} 
              className={`suggestion-item ${expandedSuggestion === index ? 'expanded' : ''}`}
              onClick={() => toggleSuggestion(index)}
            >
              <div className="suggestion-header">
                <div className="suggestion-icon" style={{ backgroundColor: `rgba(0, 255, ${255 - index * 40}, 0.7)` }}>{index + 1}</div>
                <div className="suggestion-content">
                  <div className="suggestion-action">{suggestion.action}</div>
                  <div className="suggestion-saving">
                    Estimated saving: <span>{suggestion.estimated_saving ? suggestion.estimated_saving.toFixed(2) : '0.00'}</span> tons CO2e
                  </div>
                </div>
                <div className="suggestion-expand-icon">{expandedSuggestion === index ? '▼' : '▶'}</div>
              </div>
              
              {expandedSuggestion === index && (
                <div className="suggestion-details">
                  <p className="suggestion-description">{suggestion.description}</p>
                  <div className="suggestion-impact">
                    <div className="impact-label">Impact Score:</div>
                    <div className="impact-bar-container">
                      <div 
                        className="impact-bar" 
                        style={{ width: `${Math.min(suggestion.impact_score * 100, 100)}%` }}
                      ></div>
                    </div>
                    <div className="impact-value">{(suggestion.impact_score * 100).toFixed(0)}%</div>
                  </div>
                  <div className="suggestion-implementation">
                    <h4>Implementation Steps:</h4>
                    <ol>
                      <li>Conduct assessment of current {suggestion.factor.toLowerCase()} usage patterns</li>
                      <li>Identify key areas for improvement and set reduction targets</li>
                      <li>Implement recommended changes and monitor progress</li>
                      <li>Evaluate results and adjust strategies as needed</li>
                    </ol>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="no-suggestions">
          No optimization suggestions available yet. Generate a forecast first.
        </div>
      )}
      
      {calculatedSavings && (
        <div className="savings-summary">
          <div className="savings-title">Total Potential Savings</div>
          <div className="savings-value">{calculatedSavings.total.toFixed(2)} tons CO2e</div>
          <div className="savings-percentage">({calculatedSavings.percentage.toFixed(2)}% reduction)</div>
        </div>
      )}
      
      {generatedSuggestions.length > 0 && !optimizedForecast && (
        <div className="optimization-actions">
          <button className="btn btn-secondary" onClick={onOptimize}>
            Apply Optimizations
          </button>
        </div>
      )}
      
      {optimizedForecast && (
        <div className="optimization-summary">
          <h4>Optimization Summary</h4>
          <div className="summary-metrics">
            <div className="metric">
              <div className="metric-label">Total Emissions Before</div>
              <div className="metric-value">
                {forecast ? forecast.reduce((sum, item) => sum + (item.predicted_emissions || 0), 0).toFixed(2) : '0.00'} tons CO2e
              </div>
            </div>
            <div className="metric">
              <div className="metric-label">Total Emissions After</div>
              <div className="metric-value">
                {optimizedForecast ? optimizedForecast.reduce((sum, item) => sum + (item.predicted_emissions || 0), 0).toFixed(2) : '0.00'} tons CO2e
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OptimizationPanel;
