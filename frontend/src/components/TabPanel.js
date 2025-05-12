import React from 'react';
import './TabPanel.css';

const TabPanel = ({ activeTab, onTabChange, children }) => {
  // Extract tab information from children
  const tabs = React.Children.map(children, child => {
    if (child && child.type === TabPanel.Tab) {
      return {
        id: child.props.id,
        label: child.props.label,
        disabled: child.props.disabled || false
      };
    }
    return null;
  }).filter(Boolean);
  
  // Handle tab click
  const handleTabClick = (tabId) => {
    if (onTabChange && typeof onTabChange === 'function') {
      onTabChange(tabId);
    }
  };
  
  return (
    <div className="tab-panel">
      <div className="tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => handleTabClick(tab.id)}
            disabled={tab.disabled}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      <div className="tab-content">
        {React.Children.map(children, child => {
          if (child && child.type === TabPanel.Tab && child.props.id === activeTab) {
            return child.props.children;
          }
          return null;
        })}
      </div>
    </div>
  );
};

// Tab component for children
TabPanel.Tab = ({ id, label, disabled, children }) => {
  // This is just a placeholder component for structure
  // It doesn't render anything directly
  return null;
};

export default TabPanel;
