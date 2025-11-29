
import React, { useState } from 'react';
import { SystemType, PharmaSystem, ValidationStage, ComplianceStatus } from '../types';
import { analyzeSystemRisk } from '../services/geminiService';
import { Sparkles, Loader2 } from 'lucide-react';

interface SystemFormProps {
  onAdd: (system: PharmaSystem) => void;
  onCancel: () => void;
}

export const SystemForm: React.FC<SystemFormProps> = ({ onAdd, onCancel }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<SystemType>(SystemType.WATER_SYSTEM);
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newSystem: PharmaSystem = {
      id: Date.now().toString(),
      name,
      type,
      location,
      riskLevel: 'Medium', // Default, would be set by form or AI in real app
      currentStage: ValidationStage.URS,
      status: ComplianceStatus.NOT_STARTED,
      progress: 0,
      lastValidationDate: 'N/A',
      deviationsCount: 0
    };
    onAdd(newSystem);
  };

  const handleRiskAnalysis = async () => {
    if (!description) return;
    setIsLoading(true);
    const result = await analyzeSystemRisk(description, type);
    setAiAnalysis(result);
    setIsLoading(false);
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
      <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Add New Pharmaceutical Asset</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">System Name / ID</label>
            <input 
              required
              type="text" 
              placeholder="e.g., TOC-Analyzer-01"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">System Type</label>
            <select 
              value={type}
              onChange={(e) => setType(e.target.value as SystemType)}
              className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
            >
              {Object.values(SystemType).map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
            <input 
              required
              type="text" 
              placeholder="e.g., Building A, Room 101"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
            />
        </div>

        <div>
           <div className="flex justify-between items-center mb-1">
             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">System Description (for Risk Assessment)</label>
             <button 
               type="button"
               onClick={handleRiskAnalysis}
               disabled={!description || isLoading}
               className="text-xs flex items-center gap-1 text-purple-600 hover:text-purple-700 disabled:opacity-50"
             >
                {isLoading ? <Loader2 className="animate-spin" size={12}/> : <Sparkles size={12}/>}
                Analyze Risk with AI
             </button>
           </div>
           <textarea 
             rows={3}
             value={description}
             onChange={(e) => setDescription(e.target.value)}
             className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
             placeholder="Describe the system function and components..."
           />
        </div>

        {aiAnalysis && (
          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-100 dark:border-purple-800 text-sm">
            <h4 className="font-bold text-purple-800 dark:text-purple-300 flex items-center gap-2 mb-2">
              <Sparkles size={14}/> AI Risk Assessment
            </h4>
            <div className="prose prose-sm max-w-none text-purple-900 dark:text-purple-200">
               <div dangerouslySetInnerHTML={{ __html: aiAnalysis.replace(/\n/g, '<br />') }} />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4">
          <button 
            type="button" 
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg text-sm"
          >
            Cancel
          </button>
          <button 
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm text-sm"
          >
            Add System
          </button>
        </div>

      </form>
    </div>
  );
};
