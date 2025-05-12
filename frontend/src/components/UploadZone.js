import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import './UploadZone.css';

const UploadZone = ({ onFileUpload }) => {
  const [error, setError] = useState(null);
  
  // Define required columns for validation
  const requiredColumns = [
    'date', 'energy_use (kWh)', 'transport (km)', 'waste (tons)', 
    'water (liters)', 'fuel (liters)', 'emissions (tons CO2e)', 
    'production (units)', 'grid_intensity (kg CO2e/kWh)'
  ];
  
  // Validate file content before uploading
  const validateFile = useCallback(async (file) => {
    return new Promise((resolve, reject) => {
      // First check file size - reject if too large (>10MB)
      const maxSizeInBytes = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSizeInBytes) {
        reject(new Error(`File size too large (${(file.size / (1024 * 1024)).toFixed(2)}MB). Maximum allowed size is 10MB.`));
        return;
      }
      
      // Check file type
      if (!file.name.endsWith('.csv') && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        reject(new Error('Unsupported file format. Please upload a CSV or Excel file.'));
        return;
      }
      
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const content = event.target.result;
          let headers = [];
          
          // Parse CSV or Excel based on file extension
          if (file.name.endsWith('.csv')) {
            // Simple CSV parsing
            const lines = content.split('\n');
            if (lines.length === 0) {
              reject(new Error('CSV file appears to be empty'));
              return;
            }
            
            if (lines.length < 2) {
              reject(new Error('CSV file must contain at least a header row and one data row'));
              return;
            }
            
            headers = lines[0].split(',').map(h => h.trim());
            
            // Check for minimum required columns in CSV files
            // We need at least a date column and one data column
            const hasDateColumn = headers.some(h => {
              const lowerHeader = h.toLowerCase();
              return lowerHeader === 'date' || lowerHeader === 'ds' || 
                     lowerHeader === 'datetime' || lowerHeader === 'time' || 
                     lowerHeader === 'period';
            });
            
            const hasDataColumn = headers.some(h => {
              const lowerHeader = h.toLowerCase();
              return lowerHeader.includes('energy') || lowerHeader.includes('emissions') || 
                     lowerHeader.includes('transport') || lowerHeader.includes('carbon') || 
                     lowerHeader.includes('waste') || lowerHeader.includes('water') || 
                     lowerHeader.includes('fuel') || lowerHeader === 'y';
            });
            
            if (!hasDateColumn) {
              reject(new Error('Missing date column. Please include a column named "date" or similar.'));
              return;
            }
            
            if (!hasDataColumn) {
              reject(new Error('Missing data columns. Please include at least one column for emissions, energy, or other metrics.'));
              return;
            }
            
            console.log('CSV validation passed. Headers:', headers);
            resolve(file);
          } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
            // For Excel files, we'll rely on backend validation
            // Just check if file is not empty
            if (content.length === 0) {
              reject(new Error('Excel file appears to be empty'));
              return;
            }
            
            console.log('Excel file validation: File size OK, sending to backend for processing');
            // For Excel files, we'll skip detailed validation and let the backend handle it
            // The backend has been updated to be more flexible with column names
            resolve(file);
            return;
          }
        } catch (err) {
          console.error('File validation error:', err);
          reject(new Error('Failed to parse file: ' + err.message));
        }
      };
      
      reader.onerror = (event) => {
        console.error('File reader error:', event);
        reject(new Error('Failed to read file. Please try again with a different file.'));
      };
      
      // Read file as text for CSV, as array buffer for Excel
      if (file.name.endsWith('.csv')) {
        reader.readAsText(file);
      } else {
        reader.readAsArrayBuffer(file);
      }
    });
  }, [requiredColumns]);
  
  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setError(null);
      
      try {
        console.log('File dropped:', file.name, 'Size:', file.size, 'Type:', file.type);
        // Validate file before uploading
        await validateFile(file);
        onFileUpload(file);
      } catch (err) {
        console.error('File validation failed:', err);
        setError(err.message);
        // Auto-hide error after 8 seconds
        setTimeout(() => setError(null), 8000);
      }
    } else {
      setError('No file selected or file was rejected');
      setTimeout(() => setError(null), 5000);
    }
  }, [onFileUpload, validateFile]);

  const { getRootProps, getInputProps, isDragActive, isDragAccept, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    multiple: false
  });

  return (
    <div className="card upload-zone-container">
      <h3 className="card-title">Data Input</h3>
      <div 
        {...getRootProps()} 
        className={`upload-zone ${isDragActive ? 'active' : ''} ${isDragAccept ? 'accept' : ''} ${isDragReject ? 'reject' : ''} ${error ? 'error' : ''}`}
      >
        <input {...getInputProps()} />
        <div className="upload-icon"></div>
        {isDragActive ? (
          <p>Drop the file here...</p>
        ) : (
          <p>Drag & drop a CSV or Excel file here, or click to select</p>
        )}
        <p className="upload-format">Supported formats: .csv, .xlsx, .xls</p>
        <p className="upload-requirements">
          Required columns: date, energy_use (kWh), transport (km), waste (tons), 
          water (liters), fuel (liters), emissions (tons CO2e), production (units), 
          grid_intensity (kg CO2e/kWh)
        </p>
      </div>
      
      {error && (
        <div className="upload-error">
          <p>{error}</p>
        </div>
      )}
    </div>
  );
};

export default UploadZone;
