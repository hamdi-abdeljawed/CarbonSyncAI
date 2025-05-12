# CarbonSync AI - Yazaki Tunisia Carbon Footprint Optimization Tool

A full-stack web application designed specifically for Yazaki Tunisia to predict, analyze, and optimize their carbon footprint using advanced time series forecasting with Prophet. This application features a modern, futuristic AI-themed UI with interactive data visualization and powerful predictive capabilities to support sustainability initiatives.

![CarbonSync AI](https://img.shields.io/badge/CarbonSync-AI-00c8ff)
![Version](https://img.shields.io/badge/version-1.0.0-blue)
![React](https://img.shields.io/badge/React-18.2.0-61dafb)
![Flask](https://img.shields.io/badge/Flask-2.2.3-black)
![Prophet](https://img.shields.io/badge/Prophet-1.1.2-lightgrey)

## Features

- **Intelligent Data Processing**: 
  - Smart column mapping that automatically detects and standardizes various input formats
  - Support for multiple date formats and decimal separators
  - Robust error handling for data inconsistencies

- **Advanced Data Management**:
  - Dynamic editable data table with decimal number support
  - Drag-and-drop file upload for CSV and Excel files
  - Automatic data validation and cleaning
  - Summary statistics with mean, min, max, and standard deviation

- **Powerful Forecasting Engine**:
  - Prophet-based time series forecasting with configurable parameters
  - Adjustable forecast periods (1-36 months)
  - Prediction intervals showing uncertainty ranges
  - Fallback forecasting methods when Prophet is unavailable

- **Optimization & Insights**:
  - AI-driven suggestions to reduce carbon footprint
  - Impact analysis of different factors on emissions
  - Scenario modeling for different reduction strategies
  - Prioritized recommendations based on impact potential

- **Interactive Visualization**:
  - Animated line charts with smooth transitions
  - Color-coded data series for actual, forecasted, and optimized scenarios
  - Responsive design that works on various screen sizes
  - Tooltip information for detailed data points

- **Export & Sharing**:
  - Download forecast results as CSV for further analysis
  - Printable reports with key metrics and visualizations

## Project Structure

The project is organized into two main components with a clear separation of concerns:

### Frontend (React)

```
frontend/
├── public/                 # Static files and index.html
├── src/
│   ├── components/         # React components
│   │   ├── DataTable.js    # Interactive data table component
│   │   ├── ForecastChart.js # Time series visualization
│   │   ├── Header.js       # Application header
│   │   ├── LoadingBar.js   # Loading indicator
│   │   ├── OptimizationPanel.js # Carbon reduction suggestions
│   │   ├── TabPanel.js     # Tab navigation
│   │   └── UploadZone.js   # File upload component
│   ├── App.js             # Main application component
│   ├── index.js           # Application entry point
│   └── styles/            # CSS and styling files
└── package.json           # Dependencies and scripts
```

### Backend (Flask)

```
backend/
├── app.py                 # Main Flask application
├── requirements.txt       # Python dependencies
├── utils/                 # Utility functions
│   ├── data_processing.py # Data cleaning and transformation
│   └── forecasting.py     # Time series forecasting models
└── sample_data/           # Example datasets for testing
```

## Setup Instructions

### Backend Setup

1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Create a virtual environment (recommended):
   ```
   python -m venv venv
   ```

3. Activate the virtual environment:
   - Windows:
     ```
     venv\Scripts\activate
     ```
   - macOS/Linux:
     ```
     source venv/bin/activate
     ```

4. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

5. Run the Flask application:
   ```
   python app.py
   ```
   The backend server will start on http://localhost:5000

### Frontend Setup

1. Navigate to the frontend directory:
   ```
   cd frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm start
   ```
   The frontend application will start on http://localhost:3000

## Data Format and Requirements

### Required Data Structure
The application is designed to work with monthly carbon emissions data. The system can automatically map various column names to the standard format, but ideally, your data should include:

| Column | Description | Unit | Example |
|--------|-------------|------|--------|
| `date` | Reporting period | YYYY-MM-DD | 2023-01-01 |
| `energy_use` | Electricity consumption | kWh | 12500 |
| `transport` | Transportation distance | km | 3200 |
| `waste` | Waste generated | tons | 1.8 |
| `water` | Water consumption | liters | 15000 |
| `fuel` | Fuel consumption | liters | 850 |
| `emissions` | Carbon emissions | tons CO2e | 8.2 |
| `production` | Production output | units | 1200 |
| `grid_intensity` | Electricity grid carbon intensity | kg CO2e/kWh | 0.42 |

### Flexible Input Handling
The system can recognize various column naming conventions and formats:
- Date columns can be in various formats (DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, etc.)
- Column names are matched flexibly (e.g., "Energy (kWh)", "energy_kwh", "electricity" all map to energy_use)
- Units are automatically converted if needed (e.g., kg to tons, m³ to liters)

### Data Preparation Tips
- Ensure data is organized chronologically by month
- Each row should represent one month's data
- For best forecasting results, provide at least 12 months of historical data
- Avoid gaps in the time series when possible

## Technologies Used

### Frontend
- **React 18**: Modern JavaScript library for building user interfaces
- **Chart.js 4**: Powerful and flexible data visualization library
- **react-dropzone**: Drag and drop file upload component
- **Axios**: Promise-based HTTP client for API requests
- **CSS3 with custom properties**: Modern styling with variables for theme consistency
- **HTML5 semantic elements**: Accessible and SEO-friendly markup
- **Responsive design**: Mobile-first approach that works on all devices

### Backend
- **Flask 2.2.3**: Lightweight WSGI web application framework
- **Prophet 1.1.2**: Facebook's time series forecasting procedure
- **Pandas 1.5.3**: Data manipulation and analysis library
- **NumPy 1.24.2**: Scientific computing and numerical operations
- **scikit-learn 1.2.2**: Machine learning library for fallback forecasting
- **openpyxl 3.1.2**: Library for reading/writing Excel files
- **Flask-CORS**: Cross-Origin Resource Sharing support

### Development Tools
- **npm**: Package manager for JavaScript
- **pip**: Package installer for Python
- **Git**: Version control system
- **VSCode**: Code editor with extensions for React and Python

## License

This project is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.

## About the Project

### Purpose and Goals
CarbonSync AI was developed specifically for Yazaki Tunisia to support their sustainability initiatives and carbon footprint reduction efforts. The application aims to:

- Provide accurate forecasting of future carbon emissions based on historical patterns
- Identify key drivers of carbon emissions across different operational areas
- Generate actionable recommendations for emissions reduction
- Track progress toward sustainability goals over time
- Support data-driven decision making for environmental initiatives

### Methodology
The forecasting engine uses Facebook's Prophet algorithm, which is particularly well-suited for time series data with strong seasonal patterns and multiple seasonality levels. The model accounts for:

- Weekly, monthly, and yearly seasonality in emissions data
- Holiday effects and special events
- Trend changes and growth patterns
- The impact of various factors (energy use, transport, etc.) on emissions

### Future Development
Planned enhancements for future versions include:

- Integration with real-time data sources and IoT devices
- Enhanced machine learning models for more accurate predictions
- Expanded optimization scenarios with cost-benefit analysis
- Benchmarking against industry standards and competitors
- Mobile application for on-the-go monitoring

## Acknowledgments

Developed for Yazaki Tunisia to support their sustainability initiatives and carbon footprint reduction efforts. Special thanks to the Yazaki environmental team for their input and feedback during the development process.
