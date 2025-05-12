import React, { useState, useEffect } from 'react';
import './DataTable.css';

const DataTable = ({ data, onDataUpdate }) => {
  const [tableData, setTableData] = useState([]);
  const [showSummary, setShowSummary] = useState(true);
  const [summary, setSummary] = useState({
    mean: {},
    min: {},
    max: {},
    std: {}
  });
  
  // Sample data for when no data is provided
  const sampleData = [
    {
      id: 1,
      date: '2023-01-01',
      energy_use: 12500,
      transport: 3200,
      waste: 1.8,
      water: 15000,
      fuel: 850,
      emissions: 8.2,
      production: 1200,
      grid_intensity: 0.42
    },
    {
      id: 2,
      date: '2023-02-01',
      energy_use: 11800,
      transport: 2950,
      waste: 1.5,
      water: 14200,
      fuel: 780,
      emissions: 7.8,
      production: 1150,
      grid_intensity: 0.41
    },
    {
      id: 3,
      date: '2023-03-01',
      energy_use: 12200,
      transport: 3100,
      waste: 1.7,
      water: 14800,
      fuel: 820,
      emissions: 8.0,
      production: 1180,
      grid_intensity: 0.42
    }
  ];
  
  // Update table data when data prop changes
  useEffect(() => {
    if (data && data.length > 0) {
      // Process data to ensure all values are properly formatted
      const processedData = data.map(item => {
        // Format date properly
        let formattedDate = item.date;
        if (formattedDate) {
          try {
            // Try to convert to proper date format
            const dateObj = new Date(formattedDate);
            if (!isNaN(dateObj.getTime())) {
              // Valid date, format as YYYY-MM-DD
              formattedDate = dateObj.toISOString().split('T')[0];
            }
          } catch (e) {
            console.error('Error formatting date:', e);
          }
        }
        
        return {
          ...item,
          id: item.id || Date.now() + Math.random(),
          date: formattedDate,
          energy_use: item.energy_use !== undefined ? item.energy_use : '',
          transport: item.transport !== undefined ? item.transport : '',
          waste: item.waste !== undefined ? item.waste : '',
          water: item.water !== undefined ? item.water : '',
          fuel: item.fuel !== undefined ? item.fuel : '',
          emissions: item.emissions !== undefined ? item.emissions : '',
          production: item.production !== undefined ? item.production : '',
          grid_intensity: item.grid_intensity !== undefined ? item.grid_intensity : ''
        };
      });
      
      setTableData(processedData);
    } else {
      // Use sample data if no data is provided
      setTableData([...sampleData]);
    }
  }, [data, sampleData]);
  
  // Calculate summary statistics whenever tableData changes
  useEffect(() => {
    if (tableData.length > 0) {
      calculateSummary(tableData);
    }
  }, [tableData]);
  
  // Calculate summary statistics
  const calculateSummary = (data) => {
    if (!data || data.length === 0) return;
    
    const summaryData = {
      mean: {},
      min: {},
      max: {},
      std: {}
    };
    
    // Determine available columns
    const numericColumns = [
      'energy_use', 'transport', 'waste', 'water', 
      'fuel', 'emissions', 'production', 'grid_intensity'
    ];
    
    numericColumns.forEach(col => {
      // Filter out empty values and ensure numeric conversion
      const values = data
        .map(item => {
          // Handle various formats and types
          let val = item[col];
          if (val === null || val === undefined || val === '') return null;
          if (typeof val === 'string') {
            // Remove any non-numeric characters except decimal point
            val = val.replace(/[^0-9.]/g, '');
          }
          return val;
        })
        .filter(value => value !== null)
        .map(value => {
          const num = parseFloat(value);
          return isNaN(num) ? 0 : num;
        });
      
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
  
  // Handle cell value change - allow any input without validation
  const handleCellChange = (rowIndex, columnName, value) => {
    const updatedData = [...tableData];
    
    // Simply update the value without any validation
    updatedData[rowIndex][columnName] = value;
    
    // Update the table data
    setTableData(updatedData);
    
    // Notify parent component
    onDataUpdate(updatedData);
  };
  
  // Add a new row to the table
  const handleAddRow = () => {
    // Get the last date in the table
    let lastDate = new Date();
    if (tableData.length > 0) {
      const lastRow = tableData[tableData.length - 1];
      if (lastRow.date) {
        lastDate = new Date(lastRow.date);
        // Add one month to the last date
        lastDate.setMonth(lastDate.getMonth() + 1);
      }
    }
    
    // Format the date as YYYY-MM-DD
    const formattedDate = lastDate.toISOString().split('T')[0];
    
    const newRow = {
      id: Date.now(),
      date: formattedDate,
      energy_use: '',
      transport: '',
      waste: '',
      water: '',
      fuel: '',
      emissions: '',
      production: '',
      grid_intensity: ''
    };
    
    const updatedData = [...tableData, newRow];
    setTableData(updatedData);
    onDataUpdate(updatedData);
  };
  
  // Delete a row from the table
  const handleDeleteRow = (rowIndex) => {
    const updatedData = tableData.filter((_, index) => index !== rowIndex);
    setTableData(updatedData);
    onDataUpdate(updatedData);
  };
  
  // Convert string values to numbers for calculations
  const parseNumericValue = (value) => {
    if (value === '' || value === null || value === undefined) return 0;
    return parseFloat(value) || 0;
  };
  
  // Toggle summary display
  const toggleSummary = () => {
    setShowSummary(!showSummary);
  };
  
  // Format number for display
  const formatNumber = (value, decimals = 2) => {
    if (value === null || value === undefined || value === '') return '';
    
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    
    return num.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  };
  
  // Render summary metrics
  const renderSummaryMetrics = () => {
    if (!summary || Object.keys(summary.mean).length === 0) {
      return <p>No data available for summary</p>;
    }
    
    const columns = [
      'energy_use', 'transport', 'waste', 'water', 
      'fuel', 'emissions', 'production', 'grid_intensity'
    ];
    
    return (
      <div className="summary-metrics">
        {columns.map(col => (
          <div className="metric-card" key={col}>
            <h4>{getColumnHeader(col)}</h4>
            <div className="metric-values">
              <div className="metric-value">
                <span className="metric-value-label">Mean</span>
                <span className="metric-value-number">
                  {formatNumber(summary.mean[col])}
                </span>
              </div>
              <div className="metric-value">
                <span className="metric-value-label">Min</span>
                <span className="metric-value-number">
                  {formatNumber(summary.min[col])}
                </span>
              </div>
              <div className="metric-value">
                <span className="metric-value-label">Max</span>
                <span className="metric-value-number highlight">
                  {formatNumber(summary.max[col])}
                </span>
              </div>
              <div className="metric-value">
                <span className="metric-value-label">Std Dev</span>
                <span className="metric-value-number">
                  {formatNumber(summary.std[col])}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  // Get column header with units
  const getColumnHeader = (column) => {
    switch (column) {
      case 'energy_use': return 'Energy Use (kWh)';
      case 'transport': return 'Transport (km)';
      case 'waste': return 'Waste (tons)';
      case 'water': return 'Water (liters)';
      case 'fuel': return 'Fuel (liters)';
      case 'emissions': return 'Emissions (tons CO2e)';
      case 'production': return 'Production (units)';
      case 'grid_intensity': return 'Grid Intensity (kg CO2e/kWh)';
      default: return column.charAt(0).toUpperCase() + column.slice(1).replace('_', ' ');
    }
  };
  
  return (
    <div className="data-table-container">
      <div className="table-info-banner">
        <div className="info-icon">ℹ️</div>
        <div className="info-text">
          <p>This table shows <strong>monthly emissions data</strong> required for Prophet forecasting.</p>
          <p>Each row represents one month's data. For accurate forecasting, ensure data is chronological with no gaps.</p>
          <p>You can edit cells directly, add new rows, or upload your own CSV/Excel file with the same structure.</p>
        </div>
      </div>
      
      <div className="table-controls">
        <button className="add-row-btn" onClick={handleAddRow}>
          <span className="btn-icon">+</span> Add Monthly Row
        </button>
        <button className="toggle-summary-btn" onClick={toggleSummary}>
          {showSummary ? 'Hide Summary' : 'Show Summary'}
        </button>
      </div>
      
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ minWidth: '120px' }}>Date</th>
              <th>Energy Use (kWh)</th>
              <th>Transport (km)</th>
              <th>Waste (tons)</th>
              <th>Water (liters)</th>
              <th>Fuel (liters)</th>
              <th>Emissions (tons CO2e)</th>
              <th>Production (units)</th>
              <th>Grid Intensity (kg CO2e/kWh)</th>
              <th className="action-column">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, rowIndex) => (
              <tr key={row.id || rowIndex}>
                <td>
                  <input
                    type="date"
                    className="cell-input date-input"
                    value={row.date ? (typeof row.date === 'string' ? row.date.split('T')[0] : '') : ''}
                    onChange={(e) => handleCellChange(rowIndex, 'date', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="any"
                    className="cell-input numeric"
                    value={row.energy_use !== undefined ? row.energy_use : ''}
                    onChange={(e) => handleCellChange(rowIndex, 'energy_use', e.target.value)}
                    placeholder="0.00"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="any"
                    className="cell-input numeric"
                    value={row.transport !== undefined ? row.transport : ''}
                    onChange={(e) => handleCellChange(rowIndex, 'transport', e.target.value)}
                    placeholder="0.00"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="any"
                    className="cell-input numeric"
                    value={row.waste !== undefined ? row.waste : ''}
                    onChange={(e) => handleCellChange(rowIndex, 'waste', e.target.value)}
                    placeholder="0.00"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="any"
                    className="cell-input numeric"
                    value={row.water !== undefined ? row.water : ''}
                    onChange={(e) => handleCellChange(rowIndex, 'water', e.target.value)}
                    placeholder="0.00"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="any"
                    className="cell-input numeric"
                    value={row.fuel !== undefined ? row.fuel : ''}
                    onChange={(e) => handleCellChange(rowIndex, 'fuel', e.target.value)}
                    placeholder="0.00"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="any"
                    className="cell-input numeric"
                    value={row.emissions !== undefined ? row.emissions : ''}
                    onChange={(e) => handleCellChange(rowIndex, 'emissions', e.target.value)}
                    placeholder="0.00"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="any"
                    className="cell-input numeric"
                    value={row.production !== undefined ? row.production : ''}
                    onChange={(e) => handleCellChange(rowIndex, 'production', e.target.value)}
                    placeholder="0.00"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="any"
                    className="cell-input numeric"
                    value={row.grid_intensity !== undefined ? row.grid_intensity : ''}
                    onChange={(e) => handleCellChange(rowIndex, 'grid_intensity', e.target.value)}
                    placeholder="0.00"
                  />
                </td>
                <td className="action-cell">
                  <button
                    className="delete-row-btn"
                    onClick={() => handleDeleteRow(rowIndex)}
                    title="Delete this row"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {showSummary && tableData.length > 0 && (
        <div className="data-summary-card">
          <h3>Data Summary Statistics</h3>
          {renderSummaryMetrics()}
        </div>
      )}
      
      <div className="table-guide">
        <h4>File Upload Guide</h4>
        <p>Your CSV or Excel file should have these columns:</p>
        <div className="guide-columns">
          <ul>
            <li><strong>date</strong>: YYYY-MM-DD format (e.g., 2023-01-01)</li>
            <li><strong>energy_use (kWh)</strong>: Numeric value</li>
            <li><strong>transport (km)</strong>: Numeric value</li>
            <li><strong>waste (tons)</strong>: Numeric value</li>
            <li><strong>water (liters)</strong>: Numeric value</li>
            <li><strong>fuel (liters)</strong>: Numeric value</li>
            <li><strong>emissions (tons CO2e)</strong>: Numeric value</li>
            <li><strong>production (units)</strong>: Numeric value</li>
            <li><strong>grid_intensity (kg CO2e/kWh)</strong>: Numeric value</li>
          </ul>
        </div>
        <p className="guide-note">Note: Ensure each row represents one month of data for accurate forecasting.</p>
      </div>
    </div>
  );
};

export default DataTable;
