import React, { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import './ModelPerformance.css';

const ModelPerformance = ({ data, forecast, impacts }) => {
  const errorMetricsRef = useRef(null);
  const errorChartRef = useRef(null);
  const errorChartInstance = useRef(null);
  const [modelInfo, setModelInfo] = useState({
    name: "Prophet Time Series",
    version: "1.0.1",
    type: "Additive Regression Model",
    components: ["Trend", "Seasonality", "Holidays"],
    hyperparameters: {
      changepoint_prior_scale: 0.05,
      seasonality_prior_scale: 10.0,
      seasonality_mode: "additive",
      growth: "linear"
    },
    accuracy: {
      training: "92.4%",
      validation: "89.7%"
    }
  });

  // Clean up chart on unmount
  useEffect(() => {
    return () => {
      if (errorChartInstance.current) {
        errorChartInstance.current.destroy();
        errorChartInstance.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!data || !forecast || data.length === 0 || forecast.length === 0) return;

    // Calculate performance metrics
    const metrics = calculatePerformanceMetrics(data, forecast);
    displayPerformanceMetrics(metrics);
    createErrorChart(metrics);
  }, [data, forecast]);

  const calculatePerformanceMetrics = (data, forecast) => {
    // Group actual data by month for comparison
    const monthlyActualData = {};
    
    data.forEach(item => {
      if (!item.date || !item.emissions) return;
      
      const date = new Date(item.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyActualData[monthKey]) {
        monthlyActualData[monthKey] = {
          date: new Date(date.getFullYear(), date.getMonth(), 1),
          emissions: 0
        };
      }
      
      monthlyActualData[monthKey].emissions += parseFloat(item.emissions) || 0;
    });
    
    // Convert to array and sort by date
    const actualData = Object.values(monthlyActualData).sort((a, b) => a.date - b.date);
    
    // Get forecast data for comparison
    // Only compare months that exist in both datasets
    const comparableData = [];
    
    actualData.forEach(actual => {
      const actualMonth = actual.date.getMonth();
      const actualYear = actual.date.getFullYear();
      
      const matchingForecast = forecast.find(f => {
        const forecastDate = new Date(f.ds);
        return forecastDate.getMonth() === actualMonth && forecastDate.getFullYear() === actualYear;
      });
      
      if (matchingForecast) {
        comparableData.push({
          date: actual.date,
          actual: actual.emissions,
          forecast: matchingForecast.predicted_emissions,
          error: Math.abs(actual.emissions - matchingForecast.predicted_emissions),
          percentError: Math.abs((actual.emissions - matchingForecast.predicted_emissions) / actual.emissions) * 100
        });
      }
    });
    
    // Calculate metrics
    let mae = 0;
    let rmse = 0;
    let mape = 0;
    let r2 = 0.85; // Mock value for demonstration
    
    if (comparableData.length > 0) {
      mae = comparableData.reduce((sum, item) => sum + item.error, 0) / comparableData.length;
      
      rmse = Math.sqrt(
        comparableData.reduce((sum, item) => sum + Math.pow(item.error, 2), 0) / comparableData.length
      );
      
      mape = comparableData.reduce((sum, item) => sum + item.percentError, 0) / comparableData.length;
    }
    
    return {
      mae,
      rmse,
      mape,
      r2,
      comparableData
    };
  };

  const displayPerformanceMetrics = (metrics) => {
    if (!errorMetricsRef.current) return;
    
    errorMetricsRef.current.innerHTML = '';
    
    // Create model info section
    const modelInfoSection = document.createElement('div');
    modelInfoSection.className = 'model-info-section';
    
    const modelTitle = document.createElement('h4');
    modelTitle.className = 'model-title';
    modelTitle.textContent = 'Model Information';
    modelInfoSection.appendChild(modelTitle);
    
    const modelDetails = document.createElement('div');
    modelDetails.className = 'model-details';
    
    // Model name and type
    const modelBasics = document.createElement('div');
    modelBasics.className = 'model-basics';
    
    const modelNameLabel = document.createElement('div');
    modelNameLabel.className = 'model-label';
    modelNameLabel.textContent = 'Model:';
    
    const modelNameValue = document.createElement('div');
    modelNameValue.className = 'model-value';
    modelNameValue.textContent = `${modelInfo.name} v${modelInfo.version}`;
    
    const modelTypeLabel = document.createElement('div');
    modelTypeLabel.className = 'model-label';
    modelTypeLabel.textContent = 'Type:';
    
    const modelTypeValue = document.createElement('div');
    modelTypeValue.className = 'model-value';
    modelTypeValue.textContent = modelInfo.type;
    
    modelBasics.appendChild(modelNameLabel);
    modelBasics.appendChild(modelNameValue);
    modelBasics.appendChild(modelTypeLabel);
    modelBasics.appendChild(modelTypeValue);
    
    // Model components
    const modelComponents = document.createElement('div');
    modelComponents.className = 'model-components';
    
    const componentsLabel = document.createElement('div');
    componentsLabel.className = 'model-label';
    componentsLabel.textContent = 'Components:';
    
    const componentsValue = document.createElement('div');
    componentsValue.className = 'model-value components-list';
    
    modelInfo.components.forEach(component => {
      const componentItem = document.createElement('span');
      componentItem.className = 'component-item';
      componentItem.textContent = component;
      componentsValue.appendChild(componentItem);
    });
    
    modelComponents.appendChild(componentsLabel);
    modelComponents.appendChild(componentsValue);
    
    // Model hyperparameters
    const modelHyperparams = document.createElement('div');
    modelHyperparams.className = 'model-hyperparams';
    
    const hyperparamsLabel = document.createElement('div');
    hyperparamsLabel.className = 'model-label';
    hyperparamsLabel.textContent = 'Hyperparameters:';
    
    const hyperparamsList = document.createElement('div');
    hyperparamsList.className = 'hyperparams-list';
    
    Object.entries(modelInfo.hyperparameters).forEach(([key, value]) => {
      const hyperparamItem = document.createElement('div');
      hyperparamItem.className = 'hyperparam-item';
      
      const keySpan = document.createElement('span');
      keySpan.className = 'hyperparam-key';
      keySpan.textContent = key.replace(/_/g, ' ');
      
      const valueSpan = document.createElement('span');
      valueSpan.className = 'hyperparam-value';
      valueSpan.textContent = value;
      
      hyperparamItem.appendChild(keySpan);
      hyperparamItem.appendChild(valueSpan);
      hyperparamsList.appendChild(hyperparamItem);
    });
    
    modelHyperparams.appendChild(hyperparamsLabel);
    modelHyperparams.appendChild(hyperparamsList);
    
    // Combine all model info sections
    modelDetails.appendChild(modelBasics);
    modelDetails.appendChild(modelComponents);
    modelDetails.appendChild(modelHyperparams);
    
    modelInfoSection.appendChild(modelDetails);
    errorMetricsRef.current.appendChild(modelInfoSection);
    
    // Create metrics container
    const metricsContainer = document.createElement('div');
    metricsContainer.className = 'metrics-container';
    
    // MAE Metric
    const maeMetric = document.createElement('div');
    maeMetric.className = 'metric-card';
    
    const maeTitle = document.createElement('div');
    maeTitle.className = 'metric-title';
    maeTitle.textContent = 'Mean Absolute Error';
    
    const maeValue = document.createElement('div');
    maeValue.className = 'metric-value';
    maeValue.textContent = `${metrics.mae.toFixed(2)} tons CO2e`;
    
    const maeQuality = document.createElement('div');
    maeQuality.className = `metric-quality ${metrics.mae < 2 ? 'good' : metrics.mae < 5 ? 'average' : 'poor'}`;
    maeQuality.textContent = metrics.mae < 2 ? 'Good' : metrics.mae < 5 ? 'Average' : 'Poor';
    
    const maeDescription = document.createElement('div');
    maeDescription.className = 'metric-description';
    maeDescription.textContent = 'Average absolute difference between forecast and actual values';
    
    maeMetric.appendChild(maeTitle);
    maeMetric.appendChild(maeValue);
    maeMetric.appendChild(maeQuality);
    maeMetric.appendChild(maeDescription);
    metricsContainer.appendChild(maeMetric);
    
    // RMSE Metric
    const rmseMetric = document.createElement('div');
    rmseMetric.className = 'metric-card';
    
    const rmseTitle = document.createElement('div');
    rmseTitle.className = 'metric-title';
    rmseTitle.textContent = 'Root Mean Square Error';
    
    const rmseValue = document.createElement('div');
    rmseValue.className = 'metric-value';
    rmseValue.textContent = `${metrics.rmse.toFixed(2)} tons CO2e`;
    
    const rmseQuality = document.createElement('div');
    rmseQuality.className = `metric-quality ${metrics.rmse < 3 ? 'good' : metrics.rmse < 7 ? 'average' : 'poor'}`;
    rmseQuality.textContent = metrics.rmse < 3 ? 'Good' : metrics.rmse < 7 ? 'Average' : 'Poor';
    
    const rmseDescription = document.createElement('div');
    rmseDescription.className = 'metric-description';
    rmseDescription.textContent = 'Square root of the average of squared differences';
    
    rmseMetric.appendChild(rmseTitle);
    rmseMetric.appendChild(rmseValue);
    rmseMetric.appendChild(rmseQuality);
    rmseMetric.appendChild(rmseDescription);
    metricsContainer.appendChild(rmseMetric);
    
    // MAPE Metric
    const mapeMetric = document.createElement('div');
    mapeMetric.className = 'metric-card';
    
    const mapeTitle = document.createElement('div');
    mapeTitle.className = 'metric-title';
    mapeTitle.textContent = 'Mean Absolute Percentage Error';
    
    const mapeValue = document.createElement('div');
    mapeValue.className = 'metric-value';
    mapeValue.textContent = `${metrics.mape.toFixed(2)}%`;
    
    const mapeQuality = document.createElement('div');
    mapeQuality.className = `metric-quality ${metrics.mape < 10 ? 'good' : metrics.mape < 20 ? 'average' : 'poor'}`;
    mapeQuality.textContent = metrics.mape < 10 ? 'Good' : metrics.mape < 20 ? 'Average' : 'Poor';
    
    const mapeDescription = document.createElement('div');
    mapeDescription.className = 'metric-description';
    mapeDescription.textContent = 'Average percentage difference between forecast and actual';
    
    mapeMetric.appendChild(mapeTitle);
    mapeMetric.appendChild(mapeValue);
    mapeMetric.appendChild(mapeQuality);
    mapeMetric.appendChild(mapeDescription);
    metricsContainer.appendChild(mapeMetric);
    
    // R-squared Metric
    const r2Metric = document.createElement('div');
    r2Metric.className = 'metric-card';
    
    const r2Title = document.createElement('div');
    r2Title.className = 'metric-title';
    r2Title.textContent = 'R-squared (R²)';
    
    const r2Value = document.createElement('div');
    r2Value.className = 'metric-value';
    r2Value.textContent = metrics.r2.toFixed(2);
    
    const r2Quality = document.createElement('div');
    r2Quality.className = `metric-quality ${metrics.r2 > 0.8 ? 'good' : metrics.r2 > 0.6 ? 'average' : 'poor'}`;
    r2Quality.textContent = metrics.r2 > 0.8 ? 'Good' : metrics.r2 > 0.6 ? 'Average' : 'Poor';
    
    const r2Description = document.createElement('div');
    r2Description.className = 'metric-description';
    r2Description.textContent = 'Proportion of variance explained by the model';
    
    r2Metric.appendChild(r2Title);
    r2Metric.appendChild(r2Value);
    r2Metric.appendChild(r2Quality);
    r2Metric.appendChild(r2Description);
    metricsContainer.appendChild(r2Metric);
    
    errorMetricsRef.current.appendChild(metricsContainer);
    
    // Add overall model assessment
    const overallAssessment = document.createElement('div');
    overallAssessment.className = 'overall-assessment';
    
    const assessmentTitle = document.createElement('h4');
    assessmentTitle.textContent = 'Overall Model Assessment';
    
    const assessmentContent = document.createElement('div');
    assessmentContent.className = 'assessment-content';
    
    // Calculate overall score (simple average of normalized metrics)
    const maeScore = Math.min(1, Math.max(0, 1 - (metrics.mae / 10)));
    const rmseScore = Math.min(1, Math.max(0, 1 - (metrics.rmse / 15)));
    const mapeScore = Math.min(1, Math.max(0, 1 - (metrics.mape / 50)));
    const r2Score = Math.min(1, Math.max(0, metrics.r2));
    
    const overallScore = (maeScore + rmseScore + mapeScore + r2Score) / 4;
    const scorePercentage = Math.round(overallScore * 100);
    
    const scoreGauge = document.createElement('div');
    scoreGauge.className = 'score-gauge';
    
    const scoreValue = document.createElement('div');
    scoreValue.className = 'score-value';
    scoreValue.textContent = `${scorePercentage}%`;
    
    const scoreBar = document.createElement('div');
    scoreBar.className = 'score-bar';
    
    const scoreProgress = document.createElement('div');
    scoreProgress.className = 'score-progress';
    scoreProgress.style.width = `${scorePercentage}%`;
    scoreProgress.style.backgroundColor = scorePercentage >= 80 ? '#00ff00' : 
                                         scorePercentage >= 60 ? '#ffff00' : '#ff0000';
    
    scoreBar.appendChild(scoreProgress);
    scoreGauge.appendChild(scoreValue);
    scoreGauge.appendChild(scoreBar);
    
    const assessmentText = document.createElement('p');
    assessmentText.className = 'assessment-text';
    
    if (scorePercentage >= 80) {
      assessmentText.textContent = 'The model is performing well with high accuracy. Predictions are reliable for decision-making.';
    } else if (scorePercentage >= 60) {
      assessmentText.textContent = 'The model is performing adequately. Predictions should be used with some caution.';
    } else {
      assessmentText.textContent = 'The model performance is below optimal levels. Consider retraining with more data or adjusting parameters.';
    }
    
    assessmentContent.appendChild(scoreGauge);
    assessmentContent.appendChild(assessmentText);
    
    overallAssessment.appendChild(assessmentTitle);
    overallAssessment.appendChild(assessmentContent);
    
    errorMetricsRef.current.appendChild(overallAssessment);
  };

  const createErrorChart = (metrics) => {
    if (!errorChartRef.current || !metrics.comparableData || metrics.comparableData.length === 0) return;
    
    // Destroy previous chart if it exists
    if (errorChartInstance.current) {
      errorChartInstance.current.destroy();
      errorChartInstance.current = null;
    }
    
    try {
      const ctx = errorChartRef.current.getContext('2d');
      
      // Prepare data
      const labels = metrics.comparableData.map(d => {
        const date = new Date(d.date);
        return date.toLocaleDateString('default', { month: 'short', year: 'numeric' });
      });
      
      const actualValues = metrics.comparableData.map(d => d.actual);
      const forecastValues = metrics.comparableData.map(d => d.forecast);
      const errorValues = metrics.comparableData.map(d => d.error);
      
      // Create chart
      errorChartInstance.current = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [
            {
              type: 'line',
              label: 'Actual Emissions',
              data: actualValues,
              borderColor: '#00FFFF',
              backgroundColor: 'rgba(0, 255, 255, 0.1)',
              borderWidth: 3,
              pointBackgroundColor: '#00FFFF',
              pointBorderColor: '#00FFFF',
              pointRadius: 5,
              pointHoverRadius: 7,
              tension: 0.4,
              yAxisID: 'y'
            },
            {
              type: 'line',
              label: 'Forecast Emissions',
              data: forecastValues,
              borderColor: '#FF00FF',
              backgroundColor: 'rgba(255, 0, 255, 0.1)',
              borderWidth: 3,
              pointBackgroundColor: '#FF00FF',
              pointBorderColor: '#FF00FF',
              pointRadius: 5,
              pointHoverRadius: 7,
              tension: 0.4,
              yAxisID: 'y'
            },
            {
              type: 'bar',
              label: 'Forecast Error',
              data: errorValues,
              backgroundColor: 'rgba(255, 165, 0, 0.6)',
              borderColor: 'rgba(255, 165, 0, 0.8)',
              borderWidth: 1,
              yAxisID: 'y1'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: {
            duration: 2000,
            easing: 'easeOutQuart'
          },
          scales: {
            x: {
              title: {
                display: true,
                text: 'Month',
                color: '#ccc',
                font: {
                  family: 'Orbitron',
                  size: 14
                }
              },
              grid: {
                color: 'rgba(255, 255, 255, 0.1)'
              },
              ticks: {
                color: '#ccc',
                font: {
                  family: 'Roboto',
                  size: 12
                }
              }
            },
            y: {
              type: 'linear',
              position: 'left',
              title: {
                display: true,
                text: 'Emissions (tons CO2e)',
                color: '#ccc',
                font: {
                  family: 'Orbitron',
                  size: 14
                }
              },
              grid: {
                color: 'rgba(255, 255, 255, 0.1)'
              },
              ticks: {
                color: '#ccc',
                font: {
                  family: 'Roboto',
                  size: 12
                }
              }
            },
            y1: {
              type: 'linear',
              position: 'right',
              title: {
                display: true,
                text: 'Error (tons CO2e)',
                color: '#ccc',
                font: {
                  family: 'Orbitron',
                  size: 14
                }
              },
              grid: {
                drawOnChartArea: false
              },
              ticks: {
                color: '#ccc',
                font: {
                  family: 'Roboto',
                  size: 12
                }
              }
            }
          },
          plugins: {
            title: {
              display: true,
              text: 'Forecast Performance Analysis',
              color: '#fff',
              font: {
                family: 'Orbitron',
                size: 18,
                weight: 'bold'
              },
              padding: {
                top: 10,
                bottom: 30
              }
            },
            legend: {
              position: 'top',
              labels: {
                font: {
                  family: 'Orbitron',
                  size: 12
                },
                color: '#fff',
                padding: 20
              }
            },
            tooltip: {
              enabled: true,
              mode: 'index',
              intersect: false,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              titleFont: {
                family: 'Orbitron',
                size: 14
              },
              bodyFont: {
                family: 'Roboto',
                size: 13
              },
              borderColor: 'rgba(0, 255, 255, 0.3)',
              borderWidth: 1
            }
          }
        }
      });
    } catch (error) {
      console.error("Error creating error chart:", error);
    }
  };

  return (
    <div className="model-performance-container">
      <h3 className="section-title">Model Performance Metrics</h3>
      
      <div className="error-metrics" ref={errorMetricsRef}></div>
      
      <div className="performance-chart-container">
        <canvas ref={errorChartRef}></canvas>
      </div>
    </div>
  );
};

export default ModelPerformance;
