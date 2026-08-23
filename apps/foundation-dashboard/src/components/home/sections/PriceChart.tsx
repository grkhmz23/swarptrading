'use client';

import React, { useEffect, useRef } from 'react';

interface PriceChartProps {
  data: { timestamp: number; price: number }[];
  width?: number | string;
  height?: number;
  color?: string;
  showGradient?: boolean;
}

export const PriceChart: React.FC<PriceChartProps> = ({ 
  data, 
  width = 300, 
  height = 120, 
  color = '#40E0D0',
  showGradient = true
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data || data.length === 0) return;

    const svg = svgRef.current;
    if (!svg) return;

    // Use a fixed width for calculations, SVG will scale to container
    const chartWidth = 800; // Fixed width for calculations
    
    // Clear previous content
    svg.innerHTML = '';

    // Find min and max prices for scaling
    const prices = data.map(d => d.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;

    const pathData = data
      .map((point, index) => {
        const x = (index / (data.length - 1)) * chartWidth;
        const y = height - ((point.price - minPrice) / priceRange) * height;
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');

    // Create gradient and area path only if showGradient is true
    if (showGradient) {
      const areaData = `${pathData} L ${chartWidth} ${height} L 0 ${height} Z`;

      const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
      gradient.setAttribute('id', 'chartGradient');
      gradient.setAttribute('x1', '0%');
      gradient.setAttribute('y1', '0%');
      gradient.setAttribute('x2', '0%');
      gradient.setAttribute('y2', '100%');

      const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
      stop1.setAttribute('offset', '0%');
      stop1.setAttribute('stop-color', color);
      stop1.setAttribute('stop-opacity', '0.3');

      const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
      stop2.setAttribute('offset', '100%');
      stop2.setAttribute('stop-color', color);
      stop2.setAttribute('stop-opacity', '0');

      gradient.appendChild(stop1);
      gradient.appendChild(stop2);
      defs.appendChild(gradient);
      svg.appendChild(defs);

      const areaPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      areaPath.setAttribute('d', areaData);
      areaPath.setAttribute('fill', 'url(#chartGradient)');
      svg.appendChild(areaPath);
    }

    const linePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    linePath.setAttribute('d', pathData);
    linePath.setAttribute('stroke', color);
    linePath.setAttribute('stroke-width', '3');
    linePath.setAttribute('fill', 'none');
    linePath.setAttribute('stroke-linecap', 'round');
    linePath.setAttribute('stroke-linejoin', 'round');
    linePath.setAttribute('vector-effect', 'non-scaling-stroke');
    svg.appendChild(linePath);

  }, [data, height, color, showGradient]);

  if (!data || data.length === 0) {
    return (
      <div 
        className="flex items-center justify-center bg-[#090A11] rounded-lg text-[#636466] text-sm"
        style={{ width, height }}
      >
        Loading chart...
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <svg
        ref={svgRef}
        width="100%"
        height={height}
        viewBox={`0 0 800 ${height}`}
        className="w-full h-full"
        preserveAspectRatio="none"
      />
    </div>
  );
};