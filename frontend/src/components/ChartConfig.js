import Chart from 'chart.js/auto';

// Configure global Chart.js defaults
Chart.defaults.color = '#ccc';
Chart.defaults.font.family = 'Roboto, sans-serif';

// Set default animations
Chart.defaults.animation = {
  duration: 1000,
  easing: 'easeOutQuart'
};

// Set default tooltip styles
Chart.defaults.plugins.tooltip = {
  backgroundColor: 'rgba(0, 0, 0, 0.8)',
  titleFont: {
    family: 'Orbitron, sans-serif',
    size: 14
  },
  bodyFont: {
    family: 'Roboto, sans-serif',
    size: 13
  },
  borderColor: 'rgba(0, 255, 255, 0.3)',
  borderWidth: 1
};

// Set default legend styles
Chart.defaults.plugins.legend = {
  labels: {
    font: {
      family: 'Orbitron, sans-serif',
      size: 12
    },
    color: '#fff'
  }
};

// Set default scale styles
Chart.defaults.scales.linear = {
  grid: {
    color: 'rgba(255, 255, 255, 0.1)'
  },
  ticks: {
    color: '#ccc',
    font: {
      family: 'Roboto, sans-serif',
      size: 11
    }
  }
};

export default Chart;
