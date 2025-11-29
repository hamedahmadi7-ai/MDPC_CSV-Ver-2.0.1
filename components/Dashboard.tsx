
import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { PharmaSystem, ComplianceStatus } from '../types';
import { AlertTriangle, CheckCircle, Activity, Server, MousePointerClick, ShieldAlert, Download, TrendingUp } from 'lucide-react';
import { pdfService } from '../services/pdfService';

interface DashboardProps {
  systems: PharmaSystem[];
  onDrillDown: (type?: string, status?: string, risk?: string) => void;
}

const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#9CA3AF'];

// Custom Tooltip with Black Background and Detailed info
const CustomTooltip = ({ active, payload, label, systems }: any) => {
  if (active && payload && payload.length) {
    const count = payload[0].value;
    const total = systems ? systems.length : 1;
    const percentage = Math.round((count / total) * 100);

    return (
      <div className="bg-gray-900 text-white p-4 rounded-lg shadow-xl border border-gray-700 min-w-[150px]">
        <p className="font-bold text-sm mb-2 border-b border-gray-700 pb-1">{label || payload[0].name}</p>
        <div className="space-y-1">
          {payload.map((entry: any, index: number) => (
             <div key={index} className="text-xs">
               <div className="flex justify-between items-center mb-1">
                 <span style={{ color: entry.color }}>Count:</span>
                 <span className="font-mono font-bold">{entry.value}</span>
               </div>
               {/* Show percentage if appropriate */}
               {(entry.name !== 'Trend' && entry.name !== 'Baseline') && (
                 <div className="flex justify-between items-center text-gray-400">
                   <span>Share:</span>
                   <span className="font-mono">~{percentage}%</span>
                 </div>
               )}
               {/* Show Average for bar chart */}
               {entry.payload.avgProgress !== undefined && (
                 <div className="flex justify-between items-center text-blue-300 mt-1">
                   <span>Avg Progress:</span>
                   <span className="font-mono">{entry.payload.avgProgress}%</span>
                 </div>
               )}
             </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export const Dashboard: React.FC<DashboardProps> = ({ systems, onDrillDown }) => {
  
  // Calculate Stats
  const totalSystems = systems.length;
  const compliantCount = systems.filter(s => s.status === ComplianceStatus.COMPLIANT).length;
  const deviationCount = systems.reduce((acc, curr) => acc + curr.deviationsCount, 0);
  const avgProgress = totalSystems > 0 
    ? Math.round(systems.reduce((acc, curr) => acc + curr.progress, 0) / totalSystems) 
    : 0;

  // Prepare Chart Data: Status Distribution
  const statusData = [
    { name: 'Compliant', value: systems.filter(s => s.status === ComplianceStatus.COMPLIANT).length },
    { name: 'In Progress', value: systems.filter(s => s.status === ComplianceStatus.IN_PROGRESS).length },
    { name: 'Deviation', value: systems.filter(s => s.status === ComplianceStatus.DEVIATION).length },
    { name: 'Not Started', value: systems.filter(s => s.status === ComplianceStatus.NOT_STARTED).length },
  ].filter(d => d.value > 0);

  // Prepare Chart Data: Risk Distribution
  const riskData = [
    { name: 'High', value: systems.filter(s => s.riskLevel === 'High').length, color: '#EF4444', gradientId: 'riskHigh' },
    { name: 'Medium', value: systems.filter(s => s.riskLevel === 'Medium').length, color: '#F59E0B', gradientId: 'riskMed' },
    { name: 'Low', value: systems.filter(s => s.riskLevel === 'Low').length, color: '#10B981', gradientId: 'riskLow' },
  ].filter(d => d.value > 0);

  // Prepare Chart Data: Progress by Type
  const typeGroups = systems.reduce((acc, curr) => {
    if (!acc[curr.type]) acc[curr.type] = { type: curr.type, count: 0, progressSum: 0 };
    acc[curr.type].count += 1;
    acc[curr.type].progressSum += curr.progress;
    return acc;
  }, {} as Record<string, { type: string, count: number, progressSum: number }>);

  const barData = Object.values(typeGroups).map((g: { type: string; count: number; progressSum: number }) => ({
    name: g.type.split(' ')[0], // Short name
    avgProgress: Math.round(g.progressSum / g.count),
    count: g.count,
    fullType: g.type
  }));

  // Trend Data (Simulated for visualization)
  const trendData = barData.map((d, i) => ({
    name: d.name,
    Trend: d.avgProgress,
    Baseline: Math.max(0, d.avgProgress - 15)
  }));

  return (
    <div className="space-y-6">
      
      {/* Export Action */}
      <div className="flex justify-end">
        <button 
          onClick={() => pdfService.generateDashboardPDF(systems)}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 shadow-sm transition-colors font-medium"
        >
          <Download size={16} /> Export Dashboard Report
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div 
          onClick={() => onDrillDown()}
          className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 group-hover:text-blue-600 transition-colors">Total Assets</p>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white">{totalSystems}</h3>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full shadow-inner group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50">
              <Server size={24} />
            </div>
          </div>
        </div>

        <div 
          onClick={() => onDrillDown(undefined, ComplianceStatus.COMPLIANT)}
          className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 hover:shadow-md hover:border-green-200 dark:hover:border-green-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 group-hover:text-green-600 transition-colors">Overall Compliance</p>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white">
                {totalSystems > 0 ? Math.round((compliantCount / totalSystems) * 100) : 0}%
              </h3>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full shadow-inner group-hover:bg-green-100 dark:group-hover:bg-green-900/50">
              <CheckCircle size={24} />
            </div>
          </div>
        </div>

        <div 
          onClick={() => onDrillDown(undefined, ComplianceStatus.DEVIATION)}
          className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 hover:shadow-md hover:border-red-200 dark:hover:border-red-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 group-hover:text-red-600 transition-colors">Active Deviations</p>
              <h3 className="text-2xl font-bold text-red-600">{deviationCount}</h3>
            </div>
            <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full shadow-inner group-hover:bg-red-100 dark:group-hover:bg-red-900/50">
              <AlertTriangle size={24} />
            </div>
          </div>
        </div>

        <div 
          onClick={() => onDrillDown(undefined, ComplianceStatus.IN_PROGRESS)}
          className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 hover:shadow-md hover:border-purple-200 dark:hover:border-purple-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 group-hover:text-purple-600 transition-colors">Avg Validation %</p>
              <h3 className="text-2xl font-bold text-purple-600 dark:text-purple-400">{avgProgress}%</h3>
            </div>
            <div className="p-3 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full shadow-inner group-hover:bg-purple-100 dark:group-hover:bg-purple-900/50">
              <Activity size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid: 2x2 Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* 1. Validation Trend (3D Visualization) */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 h-80 relative group">
            <div className="flex items-center gap-2 mb-4">
               <TrendingUp className="text-indigo-500" size={20}/>
               <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Validation Trend (3D Visualization)</h3>
            </div>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 25 }}>
                <defs>
                  <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                  <filter id="shadow" height="130%">
                    <feGaussianBlur in="SourceAlpha" stdDeviation="3"/> 
                    <feOffset dx="2" dy="2" result="offsetblur"/>
                    <feMerge> 
                      <feMergeNode/>
                      <feMergeNode in="SourceGraphic"/> 
                    </feMerge>
                  </filter>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" strokeOpacity={0.3} />
                <XAxis dataKey="name" stroke="#9CA3AF" tick={{fontSize: 10}} interval={0} />
                <YAxis stroke="#9CA3AF" />
                <Tooltip content={<CustomTooltip systems={systems} />} />
                <Area 
                  type="monotone" 
                  dataKey="Trend" 
                  stroke="#6366f1" 
                  fillOpacity={1} 
                  fill="url(#colorTrend)" 
                  strokeWidth={3}
                  filter="url(#shadow)"
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
        </div>

        {/* 2. Avg Progress Bar Chart */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 h-80 relative group">
            <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-blue-500 flex items-center gap-1">
              <MousePointerClick size={14}/> Click bars to view details
            </div>
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">Avg. Progress by System Type</h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={barData} 
                layout="vertical" 
                margin={{ top: 5, right: 30, left: 40, bottom: 20 }}
              >
                <defs>
                  <linearGradient id="cylinderGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#60A5FA" stopOpacity={0.9}/>
                    <stop offset="50%" stopColor="#3B82F6" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#2563EB" stopOpacity={0.9}/>
                  </linearGradient>
                  <filter id="barShadow" height="130%">
                    <feGaussianBlur in="SourceAlpha" stdDeviation="2"/> 
                    <feOffset dx="2" dy="2" result="offsetblur"/>
                    <feComponentTransfer>
                      <feFuncA type="linear" slope="0.3"/>
                    </feComponentTransfer>
                    <feMerge> 
                      <feMergeNode/>
                      <feMergeNode in="SourceGraphic"/> 
                    </feMerge>
                  </filter>
                </defs>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" strokeOpacity={0.3} />
                <XAxis type="number" domain={[0, 100]} stroke="#9CA3AF" />
                <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 10, fill: '#9CA3AF'}} stroke="#9CA3AF" />
                <Tooltip content={<CustomTooltip systems={systems} />} cursor={{fill: 'transparent'}} />
                <Bar 
                  dataKey="avgProgress" 
                  fill="url(#cylinderGradient)" 
                  radius={[0, 6, 6, 0]} 
                  barSize={20}
                  filter="url(#barShadow)"
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={(data: any) => onDrillDown(data.fullType, undefined, undefined)}
                />
              </BarChart>
            </ResponsiveContainer>
        </div>

        {/* 3. Compliance Pie Chart */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 h-80 relative group">
          <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-blue-500 flex items-center gap-1">
             <MousePointerClick size={14}/> Click slices to view details
          </div>
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">Compliance Status Distribution</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <defs>
                 {statusData.map((entry, index) => (
                    <radialGradient id={`3dGradient${index}`} cx="50%" cy="50%" r="70%" fx="50%" fy="50%" key={index}>
                      <stop offset="30%" stopColor={COLORS[index % COLORS.length]} stopOpacity={1} />
                      <stop offset="100%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.6} />
                    </radialGradient>
                 ))}
                 <filter id="pieShadow" height="130%">
                  <feGaussianBlur in="SourceAlpha" stdDeviation="3"/> 
                  <feOffset dx="3" dy="3" result="offsetblur"/>
                  <feComponentTransfer>
                    <feFuncA type="linear" slope="0.4"/>
                  </feComponentTransfer>
                  <feMerge> 
                    <feMergeNode/>
                    <feMergeNode in="SourceGraphic"/> 
                  </feMerge>
                </filter>
              </defs>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={4}
                dataKey="value"
                filter="url(#pieShadow)"
                onClick={(data) => onDrillDown(undefined, data.name, undefined)}
                className="cursor-pointer"
              >
                {statusData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={`url(#3dGradient${index})`} 
                    stroke="#fff"
                    strokeWidth={2}
                    className="hover:opacity-80 transition-opacity"
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip systems={systems} />} />
              <Legend verticalAlign="bottom" height={36} iconType="circle"/>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* 4. Risk Level Chart */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 h-80 relative group">
          <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-blue-500 flex items-center gap-1">
             <MousePointerClick size={14}/> Click to filter by Risk
          </div>
          <div className="flex items-center gap-2 mb-4">
             <ShieldAlert className="text-gray-400" size={20}/>
             <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Risk Assessment Overview</h3>
          </div>
          
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <defs>
                  <linearGradient id="riskHigh" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#EF4444" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#991B1B" stopOpacity={1}/>
                  </linearGradient>
                  <linearGradient id="riskMed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F59E0B" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#92400E" stopOpacity={1}/>
                  </linearGradient>
                  <linearGradient id="riskLow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#065F46" stopOpacity={1}/>
                  </linearGradient>
                  <filter id="riskShadow" height="130%">
                    <feGaussianBlur in="SourceAlpha" stdDeviation="3"/> 
                    <feOffset dx="3" dy="3" result="offsetblur"/>
                    <feComponentTransfer>
                      <feFuncA type="linear" slope="0.4"/>
                    </feComponentTransfer>
                    <feMerge> 
                      <feMergeNode/>
                      <feMergeNode in="SourceGraphic"/> 
                    </feMerge>
                  </filter>
              </defs>
              <Pie
                data={riskData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={4}
                dataKey="value"
                filter="url(#riskShadow)"
                onClick={(data) => onDrillDown(undefined, undefined, data.name)}
                className="cursor-pointer"
              >
                {riskData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={`url(#${entry.gradientId})`} 
                    stroke="#fff"
                    strokeWidth={2}
                    className="hover:opacity-80 transition-opacity"
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip systems={systems} />} />
              <Legend verticalAlign="bottom" height={36} iconType="circle"/>
            </PieChart>
          </ResponsiveContainer>
        </div>

      </div>
    </div>
  );
};
