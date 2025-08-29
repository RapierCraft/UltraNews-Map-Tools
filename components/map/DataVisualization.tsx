'use client';

import { useMemo } from 'react';
import { useTheme } from 'next-themes';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, LineChart as LineChartIcon, PieChart as PieChartIcon, Table } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import DefinitionCard from './DefinitionCard';

interface TableData {
  caption?: string;
  headers: string[];
  data: string[][];
}

interface DataVisualizationProps {
  tableData: TableData;
  index: number;
}

interface ChartData {
  name: string;
  value: number;
  [key: string]: string | number;
}

const CHART_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', 
  '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'
];

// Enhanced terms for cascading hyperlinks (subset focused on data/geographic terms)
const ENHANCED_TERMS = {
  'population': 'Population',
  'area': 'Area',
  'elevation': 'Elevation', 
  'founded': 'City',
  'established': 'History',
  'GDP': 'Gross domestic product',
  'economy': 'Economy',
  'government': 'Government',
  'mayor': 'Mayor',
  'city council': 'City council',
  'metropolitan': 'Metropolitan area',
  'urban': 'Urban area',
  'suburban': 'Suburb',
  'district': 'District',
  'borough': 'Borough',
  'county': 'County',
  'state': 'U.S. state',
  'province': 'Province',
  'country': 'Country'
};

const enhanceTextWithDefinitionCards = (text: string): React.ReactNode => {
  let result: React.ReactNode[] = [];
  let lastIndex = 0;
  
  // Sort terms by length (longest first) to avoid partial matches
  const sortedTerms = Object.keys(ENHANCED_TERMS).sort((a, b) => b.length - a.length);
  const replacements: { start: number; end: number; term: string; target: string }[] = [];
  
  // Find all matches
  sortedTerms.forEach(term => {
    const regex = new RegExp(`\\b${term}\\b`, 'gi');
    let match;
    while ((match = regex.exec(text)) !== null) {
      const overlap = replacements.some(r => 
        (match.index >= r.start && match.index < r.end) ||
        (match.index + match[0].length > r.start && match.index + match[0].length <= r.end)
      );
      
      if (!overlap) {
        replacements.push({
          start: match.index,
          end: match.index + match[0].length,
          term: match[0],
          target: ENHANCED_TERMS[term as keyof typeof ENHANCED_TERMS]
        });
      }
    }
  });
  
  // Sort replacements by position
  replacements.sort((a, b) => a.start - b.start);
  
  // Build the result
  replacements.forEach((replacement, index) => {
    // Add text before this replacement
    if (replacement.start > lastIndex) {
      result.push(text.substring(lastIndex, replacement.start));
    }
    
    // Add the linked term using DefinitionCard
    result.push(
      <DefinitionCard key={`${replacement.target}-${index}`} term={replacement.target}>
        {replacement.term}
      </DefinitionCard>
    );
    
    lastIndex = replacement.end;
  });
  
  // Add remaining text
  if (lastIndex < text.length) {
    result.push(text.substring(lastIndex));
  }
  
  return result.length > 0 ? result : text;
};

const analyzeTableForChart = (tableData: TableData): { 
  chartType: 'bar' | 'line' | 'pie' | 'table'; 
  data: ChartData[]; 
  config: any;
  shouldVisualize: boolean;
} => {
  const { headers, data } = tableData;
  
  if (headers.length < 2 || data.length === 0) {
    return { chartType: 'table', data: [], config: {}, shouldVisualize: false };
  }

  // Check if data is suitable for visualization
  const hasNumericData = data.some(row => 
    row.slice(1).some(cell => {
      // Check for climate-specific patterns
      if (cell?.includes('°C') || cell?.includes('°F') || cell?.includes('mm') || 
          cell?.includes('%') || cell?.includes('millibars') || cell?.includes('mph')) {
        return true;
      }
      // Remove common units and symbols, then check if numeric
      const cleanCell = cell?.replace(/[°C°F%,\s]/g, '').replace(/[^\d.-]/g, '');
      return cleanCell && !isNaN(parseFloat(cleanCell)) && isFinite(parseFloat(cleanCell));
    })
  );

  // More lenient criteria for climate/geographic data
  const isClimateOrGeoData = headers.some(h => 
    /month|temperature|rainfall|precipitation|humidity|climate|weather|elevation|population|year|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i.test(h)
  ) || tableData.caption?.toLowerCase().includes('climate') ||
      data.some(row => /jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i.test(row[0]));

  // Force visualization for climate data
  if (!hasNumericData && !isClimateOrGeoData) {
    return { chartType: 'table', data: [], config: {}, shouldVisualize: false };
  }

  // Determine chart type based on headers and data patterns
  const firstColumnIsCategory = data.every(row => isNaN(parseFloat(row[0])));
  const hasTimeData = headers[0]?.toLowerCase().includes('year') || 
                     headers[0]?.toLowerCase().includes('date') ||
                     data.some(row => /\d{4}/.test(row[0])); // Year pattern
                     
  // Check for month data (climate tables)
  const hasMonthData = headers[0]?.toLowerCase().includes('month') ||
                      data.some(row => /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(row[0]));

  // Convert data to chart format
  const chartData: ChartData[] = data.slice(0, 15).map(row => {
    const item: ChartData = { name: row[0] || 'Unknown' };
    
    headers.slice(1).forEach((header, idx) => {
      const cellValue = row[idx + 1];
      
          // Enhanced numeric extraction for climate data
      let numValue: number;
      if (cellValue?.includes('°C')) {
        // Temperature data - extract the first number before °C
        const tempMatch = cellValue.match(/(-?\d+(?:\.\d+)?)/);
        numValue = tempMatch ? parseFloat(tempMatch[1]) : 0;
      } else if (cellValue?.includes('°F')) {
        // Convert Fahrenheit to Celsius for consistency
        const tempMatch = cellValue.match(/(-?\d+(?:\.\d+)?)/);
        if (tempMatch) {
          const fahrenheit = parseFloat(tempMatch[1]);
          numValue = (fahrenheit - 32) * 5/9; // Convert to Celsius
        } else {
          numValue = 0;
        }
      } else if (cellValue?.includes('%')) {
        // Percentage data
        numValue = parseFloat(cellValue.replace(/[%\s]/g, ''));
      } else if (cellValue?.includes('mm')) {
        // Precipitation data
        const mmMatch = cellValue.match(/(\d+(?:\.\d+)?)/);
        numValue = mmMatch ? parseFloat(mmMatch[1]) : 0;
      } else if (cellValue?.includes('millibars') || cellValue?.includes('milibars')) {
        // Pressure data
        const pressureMatch = cellValue.match(/(\d+(?:\.\d+)?)/);
        numValue = pressureMatch ? parseFloat(pressureMatch[1]) : 0;
      } else if (cellValue?.includes('kilometres per hour') || cellValue?.includes('mph')) {
        // Wind speed data
        const windMatch = cellValue.match(/(\d+(?:\.\d+)?)/);
        numValue = windMatch ? parseFloat(windMatch[1]) : 0;
      } else {
        // General numeric extraction
        const numMatch = cellValue?.match(/(\d+(?:\.\d+)?)/);
        numValue = numMatch ? parseFloat(numMatch[1]) : 0;
      }
      
      if (!isNaN(numValue) && isFinite(numValue)) {
        item[header] = numValue;
      } else {
        item[header] = cellValue || '';
      }
    });
    
    // For pie charts, use the first numeric column as 'value'
    const firstNumericValue = Object.entries(item)
      .find(([key, val]) => key !== 'name' && typeof val === 'number')?.[1] as number;
    
    if (firstNumericValue !== undefined) {
      item.value = firstNumericValue;
    }
    
    return item;
  }).filter(item => {
    // Ensure at least one numeric value exists
    return Object.entries(item).some(([key, val]) => key !== 'name' && typeof val === 'number');
  });

  // Create chart config
  const config: any = {};
  headers.slice(1).forEach((header, idx) => {
    config[header] = {
      label: header,
      color: CHART_COLORS[idx % CHART_COLORS.length],
    };
  });

  // Determine chart type
  let chartType: 'bar' | 'line' | 'pie' | 'table' = 'bar';
  
  // Climate data gets special treatment - always visualize if possible
  if (isClimateOrGeoData && chartData.length >= 1) {
    if (hasTimeData || hasMonthData) {
      chartType = 'line'; // Climate time series (monthly/yearly data)
    } else {
      chartType = 'bar'; // Other climate data as bar chart
    }
  } else if ((hasTimeData || hasMonthData) && chartData.length > 3) {
    chartType = 'line'; // General time series
  } else if (headers.length === 2 && firstColumnIsCategory && chartData.length <= 8) {
    chartType = 'pie';
  } else if (headers.length <= 8 && chartData.length <= 20) {
    chartType = 'bar';
  } else {
    chartType = 'table';
  }

  // Debug logging for climate table detection
  if (tableData.caption?.toLowerCase().includes('climate') || headers.some(h => /temperature|rainfall|month/i.test(h))) {
    console.log('Climate table detected:', {
      caption: tableData.caption,
      headers,
      hasNumericData,
      chartDataLength: chartData.length,
      chartType,
      shouldVisualize: chartData.length > 0 && hasNumericData
    });
  }

  return {
    chartType,
    data: chartData,
    config,
    shouldVisualize: chartData.length > 0 && (hasNumericData || isClimateOrGeoData)
  };
};

export default function DataVisualization({ tableData, index }: DataVisualizationProps) {
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const analysis = useMemo(() => analyzeTableForChart(tableData), [tableData]);
  
  if (!analysis.shouldVisualize) {
    // Show regular table for non-visualizable data
    return (
      <div className="space-y-3">
        {tableData.caption && (
          <h4 className={`text-lg font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
            {tableData.caption}
          </h4>
        )}
        <div className="overflow-x-auto max-w-full">
          <table className={`w-full table-fixed border-collapse ${isDark ? 'border-gray-600' : 'border-gray-300'} border rounded-lg overflow-hidden`}>
            {tableData.headers.length > 0 && (
              <thead>
                <tr className={isDark ? 'bg-gray-800' : 'bg-gray-50'}>
                  {tableData.headers.map((header: string, headerIdx: number) => (
                    <th key={headerIdx} className={`border ${isDark ? 'border-gray-600' : 'border-gray-300'} px-4 py-2 text-left font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'} break-words`}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {tableData.data.slice(0, 10).map((row: string[], rowIdx: number) => (
                <tr key={rowIdx} className={`${rowIdx % 2 === 0 ? (isDark ? 'bg-gray-900/30' : 'bg-white') : (isDark ? 'bg-gray-800/30' : 'bg-gray-50/50')}`}>
                  {row.map((cell: string, cellIdx: number) => (
                    <td key={cellIdx} className={`border ${isDark ? 'border-gray-600' : 'border-gray-300'} px-4 py-2 ${isDark ? 'text-gray-300' : 'text-gray-700'} break-words max-w-xs`}>
                      {enhanceTextWithDefinitionCards(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const renderChart = () => {
    const { chartType, data, config } = analysis;
    
    switch (chartType) {
      case 'pie':
        return (
          <ChartContainer config={config} className="h-[300px]">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent />} />
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
        );
        
      case 'line':
        return (
          <ChartContainer config={config} className="h-[300px]">
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              {Object.keys(config).map((key, idx) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={config[key].color}
                  strokeWidth={2}
                  dot={{ fill: config[key].color, strokeWidth: 2, r: 4 }}
                  connectNulls={false}
                />
              ))}
            </LineChart>
          </ChartContainer>
        );
        
      case 'bar':
      default:
        return (
          <ChartContainer config={config} className="h-[300px]">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              {Object.keys(config).map((key, idx) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={config[key].color}
                  radius={[2, 2, 0, 0]}
                />
              ))}
            </BarChart>
          </ChartContainer>
        );
    }
  };

  const getChartIcon = () => {
    switch (analysis.chartType) {
      case 'pie': return <PieChartIcon className="w-4 h-4" />;
      case 'line': return <LineChartIcon className="w-4 h-4" />;
      case 'bar': return <BarChart3 className="w-4 h-4" />;
      default: return <Table className="w-4 h-4" />;
    }
  };

  return (
    <Card className={`${isDark ? 'bg-gray-800/40 border-gray-700' : 'bg-white border-gray-200'} shadow-sm max-w-full overflow-hidden`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getChartIcon()}
            <CardTitle className={`text-sm ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              {tableData.caption || `Data Visualization ${index + 1}`}
            </CardTitle>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {analysis.chartType.charAt(0).toUpperCase() + analysis.chartType.slice(1)} Chart
            </Badge>
            
            <div className="flex rounded-md border">
              <Button
                variant={viewMode === 'chart' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('chart')}
                className="h-6 px-2 text-xs rounded-r-none"
              >
                Chart
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="h-6 px-2 text-xs rounded-l-none"
              >
                Table
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="max-w-full overflow-hidden">
        {viewMode === 'chart' ? (
          <div className="w-full">
            {renderChart()}
          </div>
        ) : (
          <div className="overflow-x-auto max-w-full">
            <table className={`w-full table-fixed border-collapse ${isDark ? 'border-gray-600' : 'border-gray-300'} border rounded-lg overflow-hidden`}>
              {tableData.headers.length > 0 && (
                <thead>
                  <tr className={isDark ? 'bg-gray-800' : 'bg-gray-50'}>
                    {tableData.headers.map((header: string, headerIdx: number) => (
                      <th key={headerIdx} className={`border ${isDark ? 'border-gray-600' : 'border-gray-300'} px-4 py-2 text-left font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'} break-words`}>
                        {enhanceTextWithDefinitionCards(header)}
                      </th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody>
                {tableData.data.slice(0, 10).map((row: string[], rowIdx: number) => (
                  <tr key={rowIdx} className={`${rowIdx % 2 === 0 ? (isDark ? 'bg-gray-900/30' : 'bg-white') : (isDark ? 'bg-gray-800/30' : 'bg-gray-50/50')}`}>
                    {row.map((cell: string, cellIdx: number) => (
                      <td key={cellIdx} className={`border ${isDark ? 'border-gray-600' : 'border-gray-300'} px-4 py-2 ${isDark ? 'text-gray-300' : 'text-gray-700'} break-words max-w-xs`}>
                        {enhanceTextWithDefinitionCards(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        <div className="mt-3 text-xs text-center">
          <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>
            {viewMode === 'chart' 
              ? `Interactive ${analysis.chartType} chart • Click table view for raw data`
              : 'Raw table data • Click chart view for visualization'
            }
          </span>
        </div>
      </CardContent>
    </Card>
  );
}