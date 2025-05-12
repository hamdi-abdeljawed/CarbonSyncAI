import React, { useEffect, useRef } from 'react';
import './ForecastChart.css';

const ForecastChart = ({ data, forecast, optimizedForecast, impacts }) => {
  const chartRef = useRef(null);

  useEffect(() => {
    if (!forecast || !chartRef.current) return;
    
    // Clear previous chart
    chartRef.current.innerHTML = '';
    
    // Create a simple SVG chart
    const createChart = () => {
      const container = chartRef.current;
      
      // Process data to ensure one point per month
      const processedData = processMonthlyData(data);
      const processedForecast = processForecastData(forecast);
      const processedOptimized = optimizedForecast ? processForecastData(optimizedForecast) : [];
      
      // Ensure no overlap between historical and forecast data
      // Find the latest date in historical data
      if (processedData.length > 0 && processedForecast.length > 0) {
        const latestHistoricalDate = new Date(processedData[processedData.length - 1].month + '-01');
        
        // Filter out any forecast data that overlaps with historical data
        const filteredForecast = processedForecast.filter(item => {
          const forecastDate = new Date(item.month + '-01');
          return forecastDate > latestHistoricalDate;
        });
        
        // Replace processed forecast with filtered forecast
        processedForecast.length = 0;
        processedForecast.push(...filteredForecast);
        
        // Do the same for optimized forecast if it exists
        if (processedOptimized.length > 0) {
          const filteredOptimized = processedOptimized.filter(item => {
            const optimizedDate = new Date(item.month + '-01');
            return optimizedDate > latestHistoricalDate;
          });
          
          processedOptimized.length = 0;
          processedOptimized.push(...filteredOptimized);
        }
      }
      
      // Find min and max values for scaling
      const allValues = [
        ...processedData.map(d => d.emissions),
        ...processedForecast.map(d => d.emissions),
        ...processedForecast.map(d => d.upper),
        ...processedForecast.map(d => d.lower),
        ...processedOptimized.map(d => d.emissions)
      ].filter(v => v !== null && v !== undefined);
      
      const minValue = Math.min(...allValues) * 0.9;
      const maxValue = Math.max(...allValues) * 1.1;
      
      // Combine all months for x-axis, ensuring correct order
      let allMonths = [];
      
      // Add historical months first
      allMonths = [...processedData.map(d => d.monthLabel)];
      
      // Then add forecast months
      const forecastMonths = processedForecast.map(d => d.monthLabel);
      const optimizedMonths = processedOptimized.map(d => d.monthLabel);
      
      // Combine all unique months and ensure they're in chronological order
      const uniqueMonths = Array.from(new Set([...allMonths, ...forecastMonths, ...optimizedMonths]));
      
      // Sort months chronologically
      uniqueMonths.sort((a, b) => {
        const dateA = new Date(a);
        const dateB = new Date(b);
        return dateA - dateB;
      });
      
      // Chart dimensions
      const chartWidth = 1200;
      const chartHeight = 600;
      const marginLeft = 120;
      const marginRight = 60;
      const marginTop = 60;
      const marginBottom = 150; // Increased bottom margin for labels
      
      const graphWidth = chartWidth - marginLeft - marginRight;
      const graphHeight = chartHeight - marginTop - marginBottom;
      
      // Create SVG element
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', chartWidth);
      svg.setAttribute('height', chartHeight);
      svg.style.display = 'block';
      svg.style.margin = '0 auto';
      svg.style.background = 'rgba(0, 0, 0, 0.2)';
      svg.style.borderRadius = '10px';
      
      // Add title
      const title = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      title.setAttribute('x', chartWidth / 2);
      title.setAttribute('y', 30);
      title.setAttribute('text-anchor', 'middle');
      title.setAttribute('font-family', 'Orbitron, sans-serif');
      title.setAttribute('font-size', '22px');
      title.setAttribute('fill', '#FFFFFF');
      title.textContent = 'Monthly Carbon Emissions Forecast';
      svg.appendChild(title);
      
      // Create group for graph
      const graph = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      graph.setAttribute('transform', `translate(${marginLeft}, ${marginTop})`);
      svg.appendChild(graph);
      
      // Helper function to convert data point to position
      const getX = (index) => (index / (uniqueMonths.length - 1)) * graphWidth;
      const getY = (value) => graphHeight - ((value - minValue) / (maxValue - minValue)) * graphHeight;
      
      // Draw x and y axes
      const xAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      xAxis.setAttribute('x1', 0);
      xAxis.setAttribute('y1', graphHeight);
      xAxis.setAttribute('x2', graphWidth);
      xAxis.setAttribute('y2', graphHeight);
      xAxis.setAttribute('stroke', '#FFFFFF');
      xAxis.setAttribute('stroke-width', '2');
      graph.appendChild(xAxis);
      
      const yAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      yAxis.setAttribute('x1', 0);
      yAxis.setAttribute('y1', 0);
      yAxis.setAttribute('x2', 0);
      yAxis.setAttribute('y2', graphHeight);
      yAxis.setAttribute('stroke', '#FFFFFF');
      yAxis.setAttribute('stroke-width', '2');
      graph.appendChild(yAxis);
      
      // Draw x-axis labels
      uniqueMonths.forEach((month, index) => {
        const x = getX(index);
        
        // Draw tick
        const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        tick.setAttribute('x1', x);
        tick.setAttribute('y1', graphHeight);
        tick.setAttribute('x2', x);
        tick.setAttribute('y2', graphHeight + 10);
        tick.setAttribute('stroke', '#FFFFFF');
        tick.setAttribute('stroke-width', '2');
        graph.appendChild(tick);
        
        // Draw label - only show every other month if there are many months
        if (uniqueMonths.length <= 12 || index % 2 === 0) {
          const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          label.setAttribute('x', x);
          label.setAttribute('y', graphHeight + 30);
          label.setAttribute('text-anchor', 'middle');
          label.setAttribute('font-family', 'Roboto, sans-serif');
          label.setAttribute('font-size', '14px');
          label.setAttribute('fill', '#FFFFFF');
          label.setAttribute('transform', `rotate(45, ${x}, ${graphHeight + 30})`);
          
          // Shorten month labels if too many
          let displayText = month;
          if (uniqueMonths.length > 12) {
            const parts = month.split(' ');
            displayText = parts[0].substring(0, 3) + ' ' + parts[1];
          }
          
          label.textContent = displayText;
          graph.appendChild(label);
        }
      });
      
      // Draw y-axis labels
      const yTicks = 5;
      for (let i = 0; i <= yTicks; i++) {
        const value = minValue + ((maxValue - minValue) * (i / yTicks));
        const y = getY(value);
        
        // Draw tick
        const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        tick.setAttribute('x1', -10);
        tick.setAttribute('y1', y);
        tick.setAttribute('x2', 0);
        tick.setAttribute('y2', y);
        tick.setAttribute('stroke', '#FFFFFF');
        tick.setAttribute('stroke-width', '2');
        graph.appendChild(tick);
        
        // Draw label
        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('x', -15);
        label.setAttribute('y', y + 5);
        label.setAttribute('text-anchor', 'end');
        label.setAttribute('font-family', 'Roboto, sans-serif');
        label.setAttribute('font-size', '14px');
        label.setAttribute('fill', '#FFFFFF');
        label.textContent = value.toFixed(1);
        graph.appendChild(label);
        
        // Draw grid line
        const gridLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        gridLine.setAttribute('x1', 0);
        gridLine.setAttribute('y1', y);
        gridLine.setAttribute('x2', graphWidth);
        gridLine.setAttribute('y2', y);
        gridLine.setAttribute('stroke', 'rgba(255, 255, 255, 0.1)');
        gridLine.setAttribute('stroke-width', '1');
        graph.appendChild(gridLine);
      }
      
      // Draw axis titles
      const xTitle = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      xTitle.setAttribute('x', graphWidth / 2);
      xTitle.setAttribute('y', graphHeight + 70);
      xTitle.setAttribute('text-anchor', 'middle');
      xTitle.setAttribute('font-family', 'Orbitron, sans-serif');
      xTitle.setAttribute('font-size', '16px');
      xTitle.setAttribute('fill', '#FFFFFF');
      xTitle.textContent = 'Month';
      graph.appendChild(xTitle);
      
      const yTitle = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      yTitle.setAttribute('transform', `rotate(-90, -70, ${graphHeight / 2})`);
      yTitle.setAttribute('x', -70);
      yTitle.setAttribute('y', graphHeight / 2);
      yTitle.setAttribute('text-anchor', 'middle');
      yTitle.setAttribute('font-family', 'Orbitron, sans-serif');
      yTitle.setAttribute('font-size', '16px');
      yTitle.setAttribute('fill', '#FFFFFF');
      yTitle.textContent = 'Emissions (tons CO2e)';
      graph.appendChild(yTitle);
      
      // Draw data lines and points
      
      // Draw actual data
      if (processedData.length > 0) {
        // Draw line
        let pathD = '';
        processedData.forEach((point, i) => {
          const monthIndex = uniqueMonths.indexOf(point.monthLabel);
          if (monthIndex !== -1) {
            const x = getX(monthIndex);
            const y = getY(point.emissions);
            
            if (i === 0) {
              pathD = `M ${x} ${y}`;
            } else {
              pathD += ` L ${x} ${y}`;
            }
          }
        });
        
        const actualPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        actualPath.setAttribute('d', pathD);
        actualPath.setAttribute('fill', 'none');
        actualPath.setAttribute('stroke', '#00FFFF');
        actualPath.setAttribute('stroke-width', '3');
        graph.appendChild(actualPath);
        
        // Draw points
        processedData.forEach(point => {
          const monthIndex = uniqueMonths.indexOf(point.monthLabel);
          if (monthIndex !== -1) {
            const x = getX(monthIndex);
            const y = getY(point.emissions);
            
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', x);
            circle.setAttribute('cy', y);
            circle.setAttribute('r', '8');
            circle.setAttribute('fill', '#00FFFF');
            circle.setAttribute('stroke', '#000000');
            circle.setAttribute('stroke-width', '2');
            
            // Add tooltip data
            circle.setAttribute('data-month', point.monthLabel);
            circle.setAttribute('data-value', point.emissions.toFixed(2));
            circle.setAttribute('data-type', 'Actual');
            
            // Add hover effect
            circle.addEventListener('mouseover', showTooltip);
            circle.addEventListener('mouseout', hideTooltip);
            
            graph.appendChild(circle);
          }
        });
      }
      
      // Draw forecast data
      if (processedForecast.length > 0) {
        // Draw confidence interval
        let upperPathD = '';
        let lowerPathD = '';
        
        processedForecast.forEach((point, i) => {
          const monthIndex = uniqueMonths.indexOf(point.monthLabel);
          if (monthIndex !== -1) {
            const x = getX(monthIndex);
            const upperY = getY(point.upper);
            const lowerY = getY(point.lower);
            
            if (i === 0) {
              upperPathD = `M ${x} ${upperY}`;
              lowerPathD = `M ${x} ${lowerY}`;
            } else {
              upperPathD += ` L ${x} ${upperY}`;
              lowerPathD += ` L ${x} ${lowerY}`;
            }
          }
        });
        
        // Draw upper bound
        const upperPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        upperPath.setAttribute('d', upperPathD);
        upperPath.setAttribute('fill', 'none');
        upperPath.setAttribute('stroke', 'rgba(255, 0, 255, 0.3)');
        upperPath.setAttribute('stroke-width', '2');
        upperPath.setAttribute('stroke-dasharray', '5,5');
        graph.appendChild(upperPath);
        
        // Draw lower bound
        const lowerPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        lowerPath.setAttribute('d', lowerPathD);
        lowerPath.setAttribute('fill', 'none');
        lowerPath.setAttribute('stroke', 'rgba(255, 0, 255, 0.3)');
        lowerPath.setAttribute('stroke-width', '2');
        lowerPath.setAttribute('stroke-dasharray', '5,5');
        graph.appendChild(lowerPath);
        
        // Fill confidence interval
        const confidencePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        confidencePath.setAttribute('d', `${upperPathD} L ${getX(uniqueMonths.indexOf(processedForecast[processedForecast.length-1].monthLabel))} ${getY(processedForecast[processedForecast.length-1].lower)} ${lowerPathD.replace('M', 'L')} Z`);
        confidencePath.setAttribute('fill', 'rgba(255, 0, 255, 0.1)');
        confidencePath.setAttribute('stroke', 'none');
        graph.insertBefore(confidencePath, upperPath);
        
        // Draw forecast line
        let pathD = '';
        processedForecast.forEach((point, i) => {
          const monthIndex = uniqueMonths.indexOf(point.monthLabel);
          if (monthIndex !== -1) {
            const x = getX(monthIndex);
            const y = getY(point.emissions);
            
            if (i === 0) {
              pathD = `M ${x} ${y}`;
            } else {
              pathD += ` L ${x} ${y}`;
            }
          }
        });
        
        const forecastPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        forecastPath.setAttribute('d', pathD);
        forecastPath.setAttribute('fill', 'none');
        forecastPath.setAttribute('stroke', '#FF00FF');
        forecastPath.setAttribute('stroke-width', '3');
        graph.appendChild(forecastPath);
        
        // Draw points
        processedForecast.forEach(point => {
          const monthIndex = uniqueMonths.indexOf(point.monthLabel);
          if (monthIndex !== -1) {
            const x = getX(monthIndex);
            const y = getY(point.emissions);
            
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', x);
            circle.setAttribute('cy', y);
            circle.setAttribute('r', '8');
            circle.setAttribute('fill', '#FF00FF');
            circle.setAttribute('stroke', '#000000');
            circle.setAttribute('stroke-width', '2');
            
            // Add tooltip data
            circle.setAttribute('data-month', point.monthLabel);
            circle.setAttribute('data-value', point.emissions.toFixed(2));
            circle.setAttribute('data-type', 'Forecast');
            
            // Add hover effect
            circle.addEventListener('mouseover', showTooltip);
            circle.addEventListener('mouseout', hideTooltip);
            
            graph.appendChild(circle);
          }
        });
      }
      
      // Draw optimized forecast data
      if (processedOptimized.length > 0) {
        // Draw line
        let pathD = '';
        processedOptimized.forEach((point, i) => {
          const monthIndex = uniqueMonths.indexOf(point.monthLabel);
          if (monthIndex !== -1) {
            const x = getX(monthIndex);
            const y = getY(point.emissions);
            
            if (i === 0) {
              pathD = `M ${x} ${y}`;
            } else {
              pathD += ` L ${x} ${y}`;
            }
          }
        });
        
        const optimizedPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        optimizedPath.setAttribute('d', pathD);
        optimizedPath.setAttribute('fill', 'none');
        optimizedPath.setAttribute('stroke', '#00FF00');
        optimizedPath.setAttribute('stroke-width', '3');
        optimizedPath.setAttribute('stroke-dasharray', '5,5');
        graph.appendChild(optimizedPath);
        
        // Draw points
        processedOptimized.forEach(point => {
          const monthIndex = uniqueMonths.indexOf(point.monthLabel);
          if (monthIndex !== -1) {
            const x = getX(monthIndex);
            const y = getY(point.emissions);
            
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', x);
            circle.setAttribute('cy', y);
            circle.setAttribute('r', '8');
            circle.setAttribute('fill', '#00FF00');
            circle.setAttribute('stroke', '#000000');
            circle.setAttribute('stroke-width', '2');
            
            // Add tooltip data
            circle.setAttribute('data-month', point.monthLabel);
            circle.setAttribute('data-value', point.emissions.toFixed(2));
            circle.setAttribute('data-type', 'Optimized');
            
            // Add hover effect
            circle.addEventListener('mouseover', showTooltip);
            circle.addEventListener('mouseout', hideTooltip);
            
            graph.appendChild(circle);
          }
        });
      }
      
      // Create legend
      const legendGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      legendGroup.setAttribute('transform', `translate(${marginLeft + 20}, ${marginTop - 30})`);
      
      const legendItems = [
        { label: 'Actual Emissions', color: '#00FFFF' },
        { label: 'Forecast Emissions', color: '#FF00FF' },
        { label: 'Optimized Emissions', color: '#00FF00' }
      ];
      
      legendItems.forEach((item, index) => {
        const x = index * 200; // Increased spacing between legend items
        
        // Draw color box
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', x);
        rect.setAttribute('y', 0);
        rect.setAttribute('width', 15);
        rect.setAttribute('height', 15);
        rect.setAttribute('fill', item.color);
        rect.setAttribute('stroke', '#000000');
        rect.setAttribute('stroke-width', '1');
        legendGroup.appendChild(rect);
        
        // Draw label
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', x + 20);
        text.setAttribute('y', 12);
        text.setAttribute('font-family', 'Roboto, sans-serif');
        text.setAttribute('font-size', '12px');
        text.setAttribute('fill', '#FFFFFF');
        text.textContent = item.label;
        legendGroup.appendChild(text);
      });
      
      svg.appendChild(legendGroup);
      
      // Create tooltip
      const tooltip = document.createElement('div');
      tooltip.className = 'chart-tooltip';
      tooltip.style.display = 'none';
      tooltip.style.position = 'absolute';
      tooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
      tooltip.style.color = '#FFFFFF';
      tooltip.style.padding = '10px';
      tooltip.style.borderRadius = '5px';
      tooltip.style.pointerEvents = 'none';
      tooltip.style.zIndex = '1000';
      tooltip.style.fontFamily = 'Roboto, sans-serif';
      tooltip.style.fontSize = '12px';
      tooltip.style.border = '1px solid rgba(0, 255, 255, 0.5)';
      tooltip.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
      document.body.appendChild(tooltip);
      
      // Tooltip functions
      function showTooltip(event) {
        const circle = event.target;
        const month = circle.getAttribute('data-month');
        const value = circle.getAttribute('data-value');
        const type = circle.getAttribute('data-type');
        
        tooltip.innerHTML = `
          <div style="font-weight: bold; margin-bottom: 5px; color: #00FFFF;">${month}</div>
          <div>${type} Emissions: ${value} tons CO2e</div>
        `;
        
        tooltip.style.display = 'block';
        
        // Position tooltip near the point but avoid edges
        const rect = svg.getBoundingClientRect();
        const circleRect = circle.getBoundingClientRect();
        
        // Calculate position to avoid going off-screen
        let leftPos = circleRect.left + window.scrollX + 10;
        let topPos = circleRect.top + window.scrollY - 40;
        
        // Adjust if tooltip would go off right edge
        if (leftPos + 200 > window.innerWidth) {
          leftPos = circleRect.left + window.scrollX - 210;
        }
        
        // Adjust if tooltip would go off top edge
        if (topPos < 10) {
          topPos = circleRect.top + window.scrollY + 20;
        }
        
        tooltip.style.left = `${leftPos}px`;
        tooltip.style.top = `${topPos}px`;
        
        // Highlight the point
        circle.setAttribute('r', '10');
      }
      
      function hideTooltip(event) {
        tooltip.style.display = 'none';
        
        // Reset point size
        event.target.setAttribute('r', '8');
      }
      
      // Add the SVG to the container
      container.appendChild(svg);
      
      // Clean up tooltip when component unmounts
      return () => {
        if (tooltip && tooltip.parentNode) {
          tooltip.parentNode.removeChild(tooltip);
        }
      };
    };
    
    // Create the chart
    const cleanup = createChart();
    
    // Add impact factors section if available
    if (impacts && Object.keys(impacts).length > 0) {
      const impactSection = document.createElement('div');
      impactSection.className = 'impact-factors';
      
      const impactTitle = document.createElement('h4');
      impactTitle.textContent = 'Key Impact Factors';
      impactSection.appendChild(impactTitle);
      
      const impactList = document.createElement('div');
      impactList.className = 'impact-list';
      
      // Sort impacts by score
      const sortedImpacts = Object.entries(impacts)
        .sort((a, b) => Math.abs(b[1].impact_score) - Math.abs(a[1].impact_score))
        .slice(0, 3);
      
      sortedImpacts.forEach(([factor, data], index) => {
        let factorName = factor;
        if (factor === 'energy_use') factorName = 'Energy Use';
        if (factor === 'transport') factorName = 'Transport';
        if (factor === 'waste') factorName = 'Waste';
        if (factor === 'water') factorName = 'Water';
        if (factor === 'fuel') factorName = 'Fuel';
        if (factor === 'grid_intensity') factorName = 'Grid Intensity';
        
        const impactItem = document.createElement('div');
        impactItem.className = 'impact-item';
        
        const impactRank = document.createElement('div');
        impactRank.className = 'impact-rank';
        impactRank.textContent = index + 1;
        
        const impactInfo = document.createElement('div');
        impactInfo.className = 'impact-info';
        
        const impactName = document.createElement('div');
        impactName.className = 'impact-name';
        impactName.textContent = factorName;
        
        const impactScore = document.createElement('div');
        impactScore.className = 'impact-score';
        
        const impactValue = document.createElement('span');
        impactValue.className = 'impact-value';
        impactValue.textContent = Math.abs(data.impact_score).toFixed(2);
        
        impactScore.textContent = 'Impact Score: ';
        impactScore.appendChild(impactValue);
        
        impactInfo.appendChild(impactName);
        impactInfo.appendChild(impactScore);
        
        impactItem.appendChild(impactRank);
        impactItem.appendChild(impactInfo);
        
        impactList.appendChild(impactItem);
      });
      
      impactSection.appendChild(impactList);
      chartRef.current.appendChild(impactSection);
    }
    
    // Add forecast data table below the chart
    if (forecast && forecast.length > 0) {
      const tableContainer = document.createElement('div');
      tableContainer.className = 'forecast-table-container';
      tableContainer.style.marginTop = '30px';
      tableContainer.style.width = '100%';
      tableContainer.style.overflowX = 'auto';
      
      const table = document.createElement('table');
      table.className = 'forecast-table';
      table.style.width = '100%';
      table.style.borderCollapse = 'collapse';
      table.style.color = '#FFFFFF';
      table.style.fontFamily = 'Roboto, sans-serif';
      table.style.fontSize = '14px';
      table.style.textAlign = 'center';
      
      // Create table header
      const thead = document.createElement('thead');
      const headerRow = document.createElement('tr');
      
      const headers = ['Month', 'Predicted Emissions', 'Lower Bound', 'Upper Bound'];
      if (optimizedForecast && optimizedForecast.length > 0) {
        headers.push('Optimized Emissions', 'Potential Savings');
      }
      
      headers.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        th.style.padding = '10px';
        th.style.borderBottom = '1px solid rgba(0, 255, 255, 0.3)';
        th.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
        headerRow.appendChild(th);
      });
      
      thead.appendChild(headerRow);
      table.appendChild(thead);
      
      // Create table body
      const tbody = document.createElement('tbody');
      
      // Process forecast data for table
      const tableData = processForecastData(forecast);
      const optimizedData = optimizedForecast ? processForecastData(optimizedForecast) : [];
      
      tableData.forEach((item, index) => {
        const row = document.createElement('tr');
        row.style.backgroundColor = index % 2 === 0 ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.1)';
        
        // Month
        const monthCell = document.createElement('td');
        monthCell.textContent = item.monthLabel;
        monthCell.style.padding = '8px';
        row.appendChild(monthCell);
        
        // Predicted Emissions
        const emissionsCell = document.createElement('td');
        emissionsCell.textContent = item.emissions.toFixed(2);
        emissionsCell.style.padding = '8px';
        row.appendChild(emissionsCell);
        
        // Lower Bound
        const lowerCell = document.createElement('td');
        lowerCell.textContent = item.lower.toFixed(2);
        lowerCell.style.padding = '8px';
        row.appendChild(lowerCell);
        
        // Upper Bound
        const upperCell = document.createElement('td');
        upperCell.textContent = item.upper.toFixed(2);
        upperCell.style.padding = '8px';
        row.appendChild(upperCell);
        
        // Add optimized data if available
        if (optimizedData.length > 0) {
          const optimizedItem = optimizedData[index];
          
          // Optimized Emissions
          const optimizedCell = document.createElement('td');
          optimizedCell.textContent = optimizedItem.emissions.toFixed(2);
          optimizedCell.style.padding = '8px';
          optimizedCell.style.color = '#00FF00';
          row.appendChild(optimizedCell);
          
          // Potential Savings
          const savingsCell = document.createElement('td');
          const savings = item.emissions - optimizedItem.emissions;
          savingsCell.textContent = savings.toFixed(2);
          savingsCell.style.padding = '8px';
          savingsCell.style.color = savings > 0 ? '#00FF00' : '#FF0000';
          row.appendChild(savingsCell);
        }
        
        tbody.appendChild(row);
      });
      
      table.appendChild(tbody);
      tableContainer.appendChild(table);
      chartRef.current.appendChild(tableContainer);
    }
    
    // Return cleanup function
    return cleanup;
  }, [data, forecast, optimizedForecast, impacts]);

  // Process actual data to ensure one point per month
  const processMonthlyData = (data) => {
    if (!data || data.length === 0) return [];
    
    // Group by month
    const monthlyData = {};
    
    data.forEach(item => {
      if (!item.date || !item.emissions) return;
      
      const date = new Date(item.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthKey,
          monthLabel: `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`,
          emissions: 0
        };
      }
      
      monthlyData[monthKey].emissions += parseFloat(item.emissions) || 0;
    });
    
    // Convert to array and sort by month
    return Object.values(monthlyData)
      .sort((a, b) => a.month.localeCompare(b.month));
  };
  
  // Process forecast data
  const processForecastData = (forecastData) => {
    if (!forecastData || forecastData.length === 0) return [];
    
    return forecastData.map(item => {
      const date = new Date(item.ds);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      return {
        month: monthKey,
        monthLabel: `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`,
        emissions: item.predicted_emissions,
        lower: item.lower_bound,
        upper: item.upper_bound
      };
    }).sort((a, b) => a.month.localeCompare(b.month)); // Ensure forecast data is sorted by month
  };

  return (
    <div className="forecast-chart-container">
      <div ref={chartRef} className="chart-area" style={{ minHeight: '600px' }}></div>
    </div>
  );
};

export default ForecastChart;
