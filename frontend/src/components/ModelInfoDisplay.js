import React, { useState } from 'react';
import './ModelInfoDisplay.css';

const ModelInfoDisplay = ({ modelInfo }) => {
  const [activeTab, setActiveTab] = useState('performance');
  
  if (!modelInfo) return null;
  
  const tabs = [
    { id: 'performance', label: 'Performance' },
    { id: 'architecture', label: 'Architecture' },
    { id: 'parameters', label: 'Parameters' },
    { id: 'metrics', label: 'Metrics' },
    { id: 'training', label: 'Training' }
  ];
  
  const renderTabContent = () => {
    switch (activeTab) {
      case 'performance':
        return (
          <div className="model-info-section">
            <div className="model-metrics">
              <div className="metric">
                <div className="metric-label">Raw Similarity</div>
                <div className="metric-value">{modelInfo.raw_similarity?.toFixed(4)}</div>
              </div>
              <div className="metric">
                <div className="metric-label">Boosted Similarity</div>
                <div className="metric-value">{modelInfo.boosted_similarity?.toFixed(4)}</div>
              </div>
              <div className="metric">
                <div className="metric-label">Confidence Score</div>
                <div className="metric-value highlight">{modelInfo.confidence_score?.toFixed(2)}%</div>
              </div>
              <div className="metric">
                <div className="metric-label">Threshold</div>
                <div className="metric-value">{modelInfo.threshold?.toFixed(2)}%</div>
              </div>
              <div className="metric">
                <div className="metric-label">Audio Length Ratio</div>
                <div className="metric-value">{modelInfo.audio_length_ratio?.toFixed(2)}</div>
              </div>
              <div className="metric">
                <div className="metric-label">Feature Extraction</div>
                <div className="metric-value">{modelInfo.performance?.feature_extraction_time_ms} ms</div>
              </div>
              <div className="metric">
                <div className="metric-label">Similarity Calc</div>
                <div className="metric-value">{modelInfo.performance?.similarity_calculation_time_ms} ms</div>
              </div>
              <div className="metric">
                <div className="metric-label">Total Processing</div>
                <div className="metric-value">{modelInfo.performance?.total_processing_time_ms} ms</div>
              </div>
            </div>
          </div>
        );
      
      case 'architecture':
        return (
          <div className="model-info-section">
            <p className="model-architecture-text">{modelInfo.model_architecture}</p>
            <div className="metric">
              <div className="metric-label">Feature Dimension</div>
              <div className="metric-value">{modelInfo.feature_dimension}</div>
            </div>
          </div>
        );
      
      case 'parameters':
        return (
          <div className="model-info-section">
            <div className="model-metrics">
              <div className="metric">
                <div className="metric-label">Conv Layers</div>
                <div className="metric-value">{modelInfo.model_parameters?.conv_layers}</div>
              </div>
              <div className="metric">
                <div className="metric-label">Channels</div>
                <div className="metric-value">{modelInfo.model_parameters?.channels}</div>
              </div>
              <div className="metric">
                <div className="metric-label">Transformer Blocks</div>
                <div className="metric-value">{modelInfo.model_parameters?.transformer_blocks}</div>
              </div>
              <div className="metric">
                <div className="metric-label">Attention Heads</div>
                <div className="metric-value">{modelInfo.model_parameters?.attention_heads}</div>
              </div>
              <div className="metric">
                <div className="metric-label">Embedding Dim</div>
                <div className="metric-value">{modelInfo.model_parameters?.embedding_dim}</div>
              </div>
              <div className="metric">
                <div className="metric-label">Speaker Embedding</div>
                <div className="metric-value">{modelInfo.model_parameters?.speaker_embedding_dim}</div>
              </div>
            </div>
          </div>
        );
      
      case 'metrics':
        return (
          <div className="model-info-section">
            <div className="model-metrics">
              <div className="metric">
                <div className="metric-label">Equal Error Rate</div>
                <div className="metric-value">{modelInfo.metrics?.equal_error_rate}%</div>
              </div>
              <div className="metric">
                <div className="metric-label">False Acceptance</div>
                <div className="metric-value">{modelInfo.metrics?.false_acceptance_rate}%</div>
              </div>
              <div className="metric">
                <div className="metric-label">Verification Accuracy</div>
                <div className="metric-value highlight">{modelInfo.metrics?.verification_accuracy}%</div>
              </div>
            </div>
          </div>
        );
      
      case 'training':
        return (
          <div className="model-info-section">
            <div className="model-metrics">
              <div className="metric">
                <div className="metric-label">Dataset Hours</div>
                <div className="metric-value">{modelInfo.training_info?.dataset_hours}</div>
              </div>
              <div className="metric">
                <div className="metric-label">Speakers</div>
                <div className="metric-value">{modelInfo.training_info?.speakers}</div>
              </div>
              <div className="metric">
                <div className="metric-label">Loss Function</div>
                <div className="metric-value">{modelInfo.training_info?.loss_function}</div>
              </div>
              <div className="metric">
                <div className="metric-label">Regularization</div>
                <div className="metric-value">{modelInfo.training_info?.regularization}</div>
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };
  
  return (
    <div className="model-info-container">
      <div className="model-info-header">
        <h3 className="model-info-title">Voice Recognition Model Information</h3>
      </div>
      
      <div className="model-info-tabs">
        {tabs.map(tab => (
          <div 
            key={tab.id}
            className={`model-info-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </div>
        ))}
      </div>
      
      <div className="model-info-content">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default ModelInfoDisplay;
