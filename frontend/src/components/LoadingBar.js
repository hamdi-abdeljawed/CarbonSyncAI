import React from 'react';
import './LoadingBar.css';

const LoadingBar = ({ isLoading }) => {
  if (!isLoading) return null;
  
  return (
    <div className="loading-bar-container">
      <div className="loading-bar">
        <div className="loading-bar-progress"></div>
      </div>
    </div>
  );
};

export default LoadingBar;
