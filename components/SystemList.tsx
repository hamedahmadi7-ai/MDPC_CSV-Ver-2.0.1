
import React, { useState, useEffect, useRef } from 'react';
import { PharmaSystem, ComplianceStatus, SystemType, InspectionRecord, SpreadsheetCell, ExcelAnalysisResult, SOP, User, UserRole } from '../types';
import { FileText, MoreVertical, Clock, History, Plus, Search, Calendar, Save, Upload, FileSpreadsheet, AlertTriangle, CheckCircle, XCircle, ArrowRight, Download, Eraser, PenTool, BookOpen, Trash2, Lock, ShieldCheck, Sparkles, FileType, Printer, FileCheck, Filter, X, ArrowLeft, ClipboardCheck, Loader2, Droplets, Fan, FlaskConical, Thermometer, Code, Wind, Languages } from 'lucide-react';
import { generateTestProtocols, validateSpreadsheet, analyzeSOP, translateToPersian } from '../services/geminiService';
import { storageService } from '../services/storageService';
import { pdfService } from '../services/pdfService';
import * as XLSX from 'xlsx';
import { jsPDF } from "jspdf";
import 'jspdf-autotable';

interface SystemListProps {
  systems: PharmaSystem[];
  currentUser: User;
  onUpdateStatus: (id: string, newProgress: number) => void;
  initialFilters?: { type?: string; status?: string; risk?: string };
  onClearFilters?: () => void;
  onBackToDashboard?: () => void;
}

// Configuration for dynamic parameters based on System Type
const SYSTEM_PARAMS: Record<SystemType, { name: string; inputType: 'number' | 'text' | 'select'; options?: string[]; unit?: string; label?: string; gampGuideline?: string }[]> = {
  [SystemType.WATER_SYSTEM]: [
    { name: 'conductivity', label: 'Conductivity', unit: 'µS/cm', inputType: 'number', gampGuideline: 'Critical Quality Attribute (CQA) - Must be recorded.' },
    { name: 'toc', label: 'TOC', unit: 'ppb', inputType: 'number', gampGuideline: 'Ensure value is within validated range.' },
    { name: 'temp', label: 'Loop Temperature', unit: '°C', inputType: 'number', gampGuideline: 'Verify sanitization cycles.' },
    { name: 'flow', label: 'Flow Rate', unit: 'L/min', inputType: 'number', gampGuideline: 'Turbulent flow verification.' }
  ],
  [SystemType.HVAC]: [
    { name: 'diff_pressure', label: 'Differential Pressure', unit: 'Pa', inputType: 'number', gampGuideline: 'Cascade verification between zones.' },
    { name: 'temp', label: 'Temperature', unit: '°C', inputType: 'number', gampGuideline: 'Critical Process Parameter (CPP).' },
    { name: 'humidity', label: 'Relative Humidity', unit: '%', inputType: 'number', gampGuideline: 'Critical for product stability.' },
    { name: 'hepa_integrity', label: 'HEPA Filter Integrity', unit: '%', inputType: 'number', gampGuideline: 'Annual requalification data.' }
  ],
  [SystemType.LAB_EQUIPMENT]: [
    { name: 'audit_trail', label: 'Audit Trail Review', inputType: 'select', options: ['Pass', 'Fail', 'Pass with minor findings'], gampGuideline: '21 CFR Part 11: Check for unauthorized deletions.' },
    { name: 'calibration_offset', label: 'Calibration Offset', unit: '', inputType: 'number', gampGuideline: 'Traceability to NIST standards.' },
    { name: 'system_suitability', label: 'System Suitability', unit: '%', inputType: 'number', gampGuideline: 'Performance check before run.' },
    { name: 'data_backup', label: 'Data Backup Verification', inputType: 'select', options: ['Verified', 'Failed'], gampGuideline: 'Ensure raw data is secured.' }
  ],
  [SystemType.MONITORING]: [
    { name: 'sensor_drift', label: 'Sensor Drift', unit: '°C', inputType: 'number', gampGuideline: 'Compare against reference probe.' },
    { name: 'battery', label: 'Battery Level', unit: '%', inputType: 'number', gampGuideline: 'Risk of data loss if < 20%.' },
    { name: 'alarm_test', label: 'Alarm Function Test', inputType: 'select', options: ['Pass', 'Fail'], gampGuideline: 'Challenge test High/Low limits.' },
    { name: 'signal', label: 'Signal Strength', unit: 'dBm', inputType: 'number', gampGuideline: 'Connectivity check.' }
  ],
  [SystemType.SOFTWARE]: [
    { name: 'access_review', label: 'User Access Review', inputType: 'select', options: ['Completed', 'Pending'], gampGuideline: 'Periodic review of active accounts.' },
    { name: 'esignature', label: 'E-Signature Check', inputType: 'select', options: ['Verified', 'Issue Found'], gampGuideline: 'Unique ID/Password required.' },
    { name: 'error_logs', label: 'Error Log Review', unit: 'Count', inputType: 'number', gampGuideline: 'Check for critical system errors.' },
    { name: 'backup_restore', label: 'Backup & Restore Test', inputType: 'select', options: ['Successful', 'Failed'], gampGuideline: 'Disaster recovery verification.' }
  ]
};

export const SystemList: React.FC<SystemListProps> = ({ systems, currentUser, onUpdateStatus, initialFilters, onClearFilters, onBackToDashboard }) => {
  const [selectedSystem, setSelectedSystem] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'history' | 'excel' | 'sops'>('details');
  const [aiProtocols, setAiProtocols] = useState<Record<string, string>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [filteredSystems, setFilteredSystems] = useState<PharmaSystem[]>(systems);

  // Filter State
  useEffect(() => {
    let result = systems;
    if (initialFilters?.type) {
      result = result.filter(s => s.type === initialFilters.type);
    }
    if (initialFilters?.status) {
      result = result.filter(s => s.status === initialFilters.status);
    }
    if (initialFilters?.risk) {
      result = result.filter(s => s.riskLevel === initialFilters.risk);
    }
    setFilteredSystems(result);
  }, [systems, initialFilters]);

  // Inspection History State
  const [inspections, setInspections] = useState<InspectionRecord[]>([]);
  const [isAddingInspection, setIsAddingInspection] = useState(false);
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
  
  // New Inspection Form State
  const [newInspection, setNewInspection] = useState<Partial<InspectionRecord>>({
    inspectorName: '',
    notes: '',
    parameters: {}
  });

  // Signature State
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Excel Analysis State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAnalyzingExcel, setIsAnalyzingExcel] = useState(false);
  const [excelResult, setExcelResult] = useState<ExcelAnalysisResult | null>(null);
  const [excelHistory, setExcelHistory] = useState<ExcelAnalysisResult[]>([]);
  const [currentExcelFile, setCurrentExcelFile] = useState<File | null>(null);
  const [originalExcelData, setOriginalExcelData] = useState<ArrayBuffer | null>(null);

  // SOP State
  const [sops, setSops] = useState<SOP[]>([]);
  const [isUploadingSOP, setIsUploadingSOP] = useState(false);
  const [isAnalyzingSOP, setIsAnalyzingSOP] = useState(false);
  const [newSOP, setNewSOP] = useState<Partial<SOP> & { contentText?: string }>({
    title: '',
    version: '1.0',
    category: 'Operation',
    contentText: '' // New field to simulate content for AI
  });
  const sopFileInputRef = useRef<HTMLInputElement>(null);

  // --- RESTORE DRAFTS ON MOUNT ---
  useEffect(() => {
    // Restore Inspection Draft
    const inspectionDraft = storageService.getUserDraft(currentUser.id, 'inspection_form');
    if (inspectionDraft) {
      setNewInspection(inspectionDraft);
      if (Object.keys(inspectionDraft).length > 0) setIsAddingInspection(true);
    }

    // Restore SOP Draft
    const sopDraft = storageService.getUserDraft(currentUser.id, 'sop_form');
    if (sopDraft) {
      setNewSOP(sopDraft);
      if (sopDraft.title || sopDraft.contentText) setIsUploadingSOP(true);
    }
  }, [currentUser.id]);

  // --- AUTO SAVE DRAFTS ---
  useEffect(() => {
    // Debounce save to avoid thrashing storage
    const timer = setTimeout(() => {
      if (isAddingInspection) {
        storageService.saveUserDraft(currentUser.id, 'inspection_form', newInspection);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [newInspection, isAddingInspection, currentUser.id]);

  useEffect(() => {
    const timer = setTimeout(() => {
       if (isUploadingSOP) {
         storageService.saveUserDraft(currentUser.id, 'sop_form', newSOP);
       }
    }, 1000);
    return () => clearTimeout(timer);
  }, [newSOP, isUploadingSOP, currentUser.id]);


  // Load data when a system is selected or tab changes
  useEffect(() => {
    if (selectedSystem) {
       // Check if we need to reset tab (e.g., leaving Excel tab when switching to non-software system)
       const sys = systems.find(s => s.id === selectedSystem);
       if (sys && sys.type !== SystemType.SOFTWARE && activeTab === 'excel') {
         setActiveTab('details');
       }

       if (activeTab === 'history') {
         loadInspections(selectedSystem);
       } else if (activeTab === 'excel') {
         loadExcelHistory(selectedSystem);
         loadSOPs(selectedSystem); // Also load SOPs for the Excel tab reference
       } else if (activeTab === 'sops') {
         loadSOPs(selectedSystem);
       }
    }
    // Reset Current Excel Result on system change
    if (selectedSystem && activeTab !== 'excel') {
       setExcelResult(null);
       setCurrentExcelFile(null);
    }
  }, [selectedSystem, activeTab, dateFilter, systems]);

  // --- High DPI Canvas Setup ---
  useEffect(() => {
    if (isAddingInspection && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Get the device pixel ratio, falling back to 1.
      const dpr = window.devicePixelRatio || 1;
      
      // Get the size of the canvas in CSS pixels.
      const rect = canvas.getBoundingClientRect();
      
      // Give the canvas pixel dimensions of their CSS size * the device pixel ratio.
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      
      // Scale all drawing operations by the dpr, so you don't have to worry about the difference.
      ctx.scale(dpr, dpr);
      
      // Initial styling
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#000000';
    }
  }, [isAddingInspection]);

  const loadInspections = async (sysId: string) => {
    if (dateFilter.start || dateFilter.end) {
      const filtered = await storageService.filterInspections(sysId, dateFilter.start, dateFilter.end);
      setInspections(filtered);
    } else {
      const all = await storageService.getInspections(sysId);
      setInspections(all);
    }
  };

  const loadExcelHistory = async (sysId: string) => {
    const reports = await storageService.getExcelReports(sysId);
    setExcelHistory(reports);
  };

  const loadSOPs = async (sysId: string) => {
    const data = await storageService.getSOPs(sysId);
    setSops(data);
  };

  const handleGenerateProtocols = async (system: PharmaSystem) => {
    setLoadingId(system.id);
    const protocols = await generateTestProtocols(system.name, system.type, system.currentStage);
    setAiProtocols(prev => ({...prev, [system.id]: protocols}));
    setLoadingId(null);
  };

  const handleQuickGenerate = (e: React.MouseEvent, sys: PharmaSystem) => {
    e.stopPropagation();
    setSelectedSystem(sys.id);
    setActiveTab('details');
    handleGenerateProtocols(sys);
  };

  const handleTranslateProtocol = async (sysId: string) => {
    if (!aiProtocols[sysId]) return;
    setLoadingId(sysId);
    const translated = await translateToPersian(aiProtocols[sysId]);
    setAiProtocols(prev => ({...prev, [sysId]: translated}));
    setLoadingId(null);
  };

  // --- Signature Logic ---
  const getCoordinates = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ((e as unknown as React.TouchEvent).touches && (e as unknown as React.TouchEvent).touches.length > 0) {
      clientX = (e as unknown as React.TouchEvent).touches[0].clientX;
      clientY = (e as unknown as React.TouchEvent).touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault(); // Prevent scrolling on touch
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const { x, y } = getCoordinates(e, canvas);
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2.5; // Slightly thicker
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a'; // Slate 900
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    // e.preventDefault(); // Prevent scrolling - handled by CSS touch-action
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const { x, y } = getCoordinates(e, canvas);

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      // Clear considering the scale
      ctx?.save();
      ctx?.setTransform(1, 0, 0, 1, 0, 0);
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
      ctx?.restore();
    }
  };

  const handleSaveInspection = async (sysId: string) => {
    if (!newInspection.inspectorName || !newInspection.date) {
      alert("Please fill in Date and Inspector Name");
      return;
    }

    const signatureData = canvasRef.current?.toDataURL();
    
    const record: InspectionRecord = {
      id: Date.now().toString(),
      systemId: sysId,
      date: newInspection.date!,
      inspectorName: newInspection.inspectorName!,
      notes: newInspection.notes || '',
      parameters: newInspection.parameters || {},
      signature: signatureData
    };

    await storageService.saveInspection(record);
    setNewInspection({ inspectorName: '', notes: '', parameters: {} });
    clearSignature();
    setIsAddingInspection(false);
    loadInspections(sysId);
    
    // Clear draft after successful save
    storageService.clearSpecificDraft(currentUser.id, 'inspection_form');
  };

  const handleExportHistory = (sysId: string) => {
    const sys = systems.find(s => s.id === sysId);
    const data = inspections.map(i => ({
      Date: i.date,
      Inspector: i.inspectorName,
      Notes: i.notes,
      ...i.parameters
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "History");
    XLSX.writeFile(wb, `${sys?.name || 'System'}_History.xlsx`);
  };

  const handleExportPDF = (sys: PharmaSystem) => {
    const doc = new jsPDF();
    pdfService.addCompanyHeader(doc, `Validation Report: ${sys.name}`);

    // System Info
    doc.setFontSize(12);
    doc.text(`Type: ${sys.type}`, 14, 55);
    doc.text(`Location: ${sys.location}`, 14, 62);
    doc.text(`Current Stage: ${sys.currentStage}`, 14, 69);
    doc.text(`Status: ${sys.status}`, 14, 76);

    // Protocol Content
    if (aiProtocols[sys.id]) {
        doc.setFontSize(14);
        doc.text("Generated Validation Protocols (MDPC-AI)", 14, 90);
        doc.setFontSize(10);
        
        const splitText = doc.splitTextToSize(aiProtocols[sys.id], 180);
        doc.text(splitText, 14, 100);
    } else {
        doc.text("No protocols generated yet.", 14, 90);
    }

    pdfService.addCompanyFooter(doc);
    doc.save(`${sys.name}_Validation_Report.pdf`);
  };

  const handleExportListReport = () => {
    const doc = new jsPDF();
    pdfService.addCompanyHeader(doc, "System Assets Inventory Report");
    
    const tableData = filteredSystems.map(s => [
      s.name, s.type, s.riskLevel, s.status, `${s.progress}%`
    ]);

    (doc as any).autoTable({
       startY: 50,
       head: [['System Name', 'Type', 'Risk', 'Status', 'Progress']],
       body: tableData,
       theme: 'grid',
       styles: { fontSize: 10 }
    });

    pdfService.addCompanyFooter(doc);
    doc.save("MDPC_Systems_List.pdf");
  };

  // --- Excel File Logic ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, sysId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCurrentExcelFile(file);
    setIsAnalyzingExcel(true);
    
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target?.result;
      setOriginalExcelData(bstr as ArrayBuffer); // Save original for recreation
      
      const wb = XLSX.read(bstr, { type: 'array' }); // Read as array buffer
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
      
      const cells: SpreadsheetCell[] = [];
      const range = XLSX.utils.decode_range(ws['!ref'] || "A1:A1");

      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cell_address = { c: C, r: R };
          const cell_ref = XLSX.utils.encode_cell(cell_address);
          const cell = ws[cell_ref];
          if (cell) {
             // Check if it's a formula (starts with =) or has .f property
             let formula = "";
             if (cell.f) formula = "=" + cell.f;
             else if (typeof cell.v === 'string' && cell.v.startsWith('=')) formula = cell.v;

             if (formula) {
               cells.push({
                 address: cell_ref,
                 formula: formula,
                 value: cell.v
               });
             }
          }
        }
      }

      // Find Active SOP for this system to use as context
      const activeSOP = sops.find(s => s.isActive && s.category === 'Spreadsheet Validation');
      const sopContext = activeSOP ? activeSOP.extractedRules : undefined;

      // Analyze with MDPC
      const analysis = await validateSpreadsheet(file.name, cells, sopContext);
      analysis.systemId = sysId;
      analysis.date = new Date().toISOString();
      if (activeSOP) analysis.referencedSopTitle = activeSOP.title;

      setExcelResult(analysis);
      setIsAnalyzingExcel(false);
      
      // Auto save report
      await storageService.saveExcelReport(analysis);
      loadExcelHistory(sysId);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDownloadCorrectedExcel = () => {
    if (!originalExcelData || !excelResult || !currentExcelFile) return;

    try {
        const wb = XLSX.read(originalExcelData, { type: 'array' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];

        // Apply corrections
        excelResult.discrepancies.forEach(disc => {
            if (disc.suggestedValue || disc.suggestedFormula) {
                if (!ws[disc.address]) return;
                
                if (disc.suggestedFormula) {
                     ws[disc.address].f = disc.suggestedFormula.replace('=', '');
                     ws[disc.address].v = undefined;
                } 
                else if (disc.suggestedValue) {
                    ws[disc.address].v = disc.suggestedValue;
                    delete ws[disc.address].f; 
                }
                
                if (!ws[disc.address].c) ws[disc.address].c = [];
                ws[disc.address].c.push({ t: `MDPC Correction: ${disc.reason}` });
            }
        });

        XLSX.writeFile(wb, `Corrected_${currentExcelFile.name}`);

    } catch (e) {
        console.error("Error generating corrected excel", e);
        alert("Could not generate corrected file.");
    }
  };

  // --- SOP Logic ---
  const handleSOPUpload = async () => {
    if (!newSOP.title || !sopFileInputRef.current?.files?.[0]) return;
    
    setIsUploadingSOP(true);
    setIsAnalyzingSOP(true);
    const file = sopFileInputRef.current.files[0];

    // Simulate reading text from PDF/Doc (In real app, need backend parser)
    // Here we use the mock content text provided by user or a placeholder
    const contentText = newSOP.contentText || "Simulated SOP content for " + file.name;

    // AI Extraction
    const analysis = await analyzeSOP(newSOP.title!, newSOP.category as string, contentText);
    
    const sop: SOP = {
      id: Date.now().toString(),
      systemId: selectedSystem!,
      title: newSOP.title!,
      version: newSOP.version || '1.0',
      category: newSOP.category as any,
      fileName: file.name,
      uploadDate: new Date().toISOString(),
      uploadedBy: currentUser.name,
      isActive: true, // Default to active
      
      aiComplianceStatus: analysis.status as any, // Deprecated but kept for type
      aiAnalysisReport: analysis.report,
      extractedRules: analysis.rules
    };

    await storageService.saveSOP(sop);
    setNewSOP({ title: '', version: '1.0', category: 'Operation', contentText: '' });
    if (sopFileInputRef.current) sopFileInputRef.current.value = '';
    
    setIsUploadingSOP(false);
    setIsAnalyzingSOP(false);
    loadSOPs(selectedSystem!);
    
    storageService.clearSpecificDraft(currentUser.id, 'sop_form');
  };

  const handleDeleteSOP = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Stop click from bubbling
    e.preventDefault(); // Prevent form submission if any
    
    if (currentUser.role !== UserRole.ADMIN) {
      alert("Only Admins can delete SOPs.");
      return;
    }
    
    if (confirm("Are you sure you want to delete this SOP?")) {
      await storageService.deleteSOP(id);
      loadSOPs(selectedSystem!);
    }
  };


  return (
    <div className="flex h-full gap-6">
      
      {/* Left List Panel */}
      <div className={`w-1/3 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col ${selectedSystem ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-gray-100 dark:border-slate-700">
           <h3 className="font-bold text-gray-700 dark:text-gray-200 mb-2">Systems Inventory</h3>
           <div className="relative">
             <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
             <input 
               type="text" 
               placeholder="Search assets..." 
               className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
             />
           </div>
           
           {/* Active Filters Banner */}
           {Object.keys(initialFilters || {}).length > 0 && (
             <div className="mt-3 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-2 rounded-lg text-xs flex items-center justify-between border border-blue-100 dark:border-blue-900/50">
                <div className="flex items-center gap-2">
                  <Filter size={12} />
                  <span>
                    Filtered by: 
                    {initialFilters?.type && <span className="font-bold ml-1">{initialFilters.type}</span>}
                    {initialFilters?.status && <span className="font-bold ml-1">{initialFilters.status}</span>}
                    {initialFilters?.risk && <span className="font-bold ml-1">Risk: {initialFilters.risk}</span>}
                  </span>
                </div>
                <button onClick={onClearFilters} className="hover:bg-blue-100 dark:hover:bg-blue-900/50 p-1 rounded">
                  <X size={12} />
                </button>
             </div>
           )}

           <button 
             onClick={handleExportListReport}
             className="mt-3 w-full flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 py-1 border border-dashed border-gray-300 dark:border-slate-600 rounded hover:bg-gray-50 dark:hover:bg-slate-700"
           >
             <Printer size={12} /> Print Asset List
           </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-slate-600">
          {filteredSystems.map(sys => (
            <div 
              key={sys.id}
              onClick={() => setSelectedSystem(sys.id)}
              className={`p-4 rounded-lg cursor-pointer transition-all border ${selectedSystem === sys.id ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800 shadow-sm' : 'bg-white dark:bg-slate-800 border-transparent hover:bg-gray-50 dark:hover:bg-slate-700 hover:border-gray-200 dark:hover:border-slate-600'}`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${selectedSystem === sys.id ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400' : 'bg-gray-100 dark:bg-slate-900 text-gray-500 dark:text-gray-400'}`}>
                    {sys.type === SystemType.WATER_SYSTEM && <Droplets size={20} className={selectedSystem === sys.id ? "animate-[bounce_1s_infinite]" : ""} />}
                    {sys.type === SystemType.HVAC && <Fan size={20} style={selectedSystem === sys.id ? { animation: 'spin-variable 3s infinite' } : {}} />}
                    {sys.type === SystemType.LAB_EQUIPMENT && (
                         <div className="relative">
                           <FlaskConical size={20} /> 
                           {selectedSystem === sys.id && (
                             <>
                              <div className="absolute bottom-1 left-2 w-1 h-1 bg-current rounded-full" style={{animation: 'bubbleFloat 2s infinite ease-in'}}></div>
                              <div className="absolute bottom-2 left-2.5 w-1 h-1 bg-current rounded-full" style={{animation: 'bubbleFloat 2s infinite 0.5s ease-in'}}></div>
                             </>
                           )}
                         </div>
                    )}
                    {sys.type === SystemType.MONITORING && <Thermometer size={20} className={selectedSystem === sys.id ? "animate-pulse" : ""} />}
                    {sys.type === SystemType.SOFTWARE && <Code size={20} />}
                  </div>
                  <div>
                    <h4 className={`font-semibold text-sm ${selectedSystem === sys.id ? 'text-indigo-900 dark:text-indigo-100' : 'text-gray-800 dark:text-gray-200'}`}>{sys.name}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{sys.type}</p>
                  </div>
                </div>
                {/* Quick Action */}
                <button 
                   onClick={(e) => handleQuickGenerate(e, sys)}
                   className="text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-1 rounded transition-colors"
                   title="Quick Generate Checklist"
                >
                  <ClipboardCheck size={16} />
                </button>
              </div>
              
              <div className="flex items-center justify-between text-xs mt-3">
                 <span className={`px-2 py-0.5 rounded-full ${
                   sys.status === ComplianceStatus.COMPLIANT ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                   sys.status === ComplianceStatus.DEVIATION ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                   sys.status === ComplianceStatus.IN_PROGRESS ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                   'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                 }`}>
                   {sys.status}
                 </span>
                 <span className="text-gray-400 dark:text-gray-500">{sys.progress}% Validated</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Detail Panel */}
      <div className={`flex-1 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col ${selectedSystem ? 'flex' : 'hidden md:flex'}`}>
        {selectedSystem ? (
          (() => {
            const sys = systems.find(s => s.id === selectedSystem)!;
            
            // Conditionally define tabs based on system type
            const tabs = [
              {id: 'details', label: 'Validation Protocol', icon: FileText},
              {id: 'history', label: 'Inspection History', icon: History},
              // Only show Excel Validation for GAMP 5 Software
              ...(sys.type === SystemType.SOFTWARE ? [{id: 'excel', label: 'Excel Validation', icon: FileSpreadsheet}] : []),
              {id: 'sops', label: 'SOPs & Documentation', icon: BookOpen}
            ];

            return (
              <>
                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-start bg-gray-50/50 dark:bg-slate-900/20">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      {/* Mobile Back Button */}
                      <button onClick={() => setSelectedSystem(null)} className="md:hidden text-gray-500 dark:text-gray-400 hover:text-gray-700">
                        <ArrowLeft size={20} />
                      </button>
                      <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{sys.name}</h2>
                      <span className={`px-2 py-1 rounded text-xs font-bold ${sys.riskLevel === 'High' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'}`}>
                        {sys.riskLevel} Risk
                      </span>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm flex items-center gap-2">
                       {sys.location} • {sys.type}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleExportPDF(sys)}
                      className="px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 text-sm flex items-center gap-2 shadow-sm"
                    >
                      <Download size={16} /> Export Report
                    </button>
                    {onBackToDashboard && (
                       <button 
                         onClick={onBackToDashboard}
                         className="px-3 py-2 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-sm font-medium flex items-center gap-2"
                       >
                         <ArrowLeft size={16} /> Back to Main
                       </button>
                    )}
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 dark:border-slate-700 px-6">
                  {tabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`px-4 py-4 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
                        activeTab === tab.id ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                      }`}
                    >
                      <tab.icon size={16} /> {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30 dark:bg-slate-900/10 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-slate-600">
                  
                  {/* --- DETAILS TAB --- */}
                  {activeTab === 'details' && (
                    <div className="space-y-6">
                      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                          <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                            <Sparkles className="text-indigo-500" size={18} />
                            MDPC Generated Protocol ({sys.currentStage})
                          </h3>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleGenerateProtocols(sys)}
                              disabled={!!loadingId}
                              className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 shadow-sm"
                            >
                              {loadingId === sys.id ? <Loader2 className="animate-spin" size={16}/> : <Sparkles size={16}/>}
                              Generate GAMP 5 Checklist
                            </button>
                            {aiProtocols[sys.id] && (
                                <button 
                                  onClick={() => handleTranslateProtocol(sys.id)}
                                  disabled={!!loadingId}
                                  className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2 shadow-sm"
                                >
                                  {loadingId === sys.id ? <Loader2 className="animate-spin" size={16}/> : <Languages size={16}/>}
                                  Translate to Persian
                                </button>
                            )}
                          </div>
                        </div>

                        {loadingId === sys.id && (
                          <div className="p-8 text-center text-gray-500 dark:text-gray-400 animate-pulse bg-gray-50 dark:bg-slate-900 rounded-lg">
                            Generating compliant validation protocols...
                          </div>
                        )}

                        {aiProtocols[sys.id] && !loadingId && (
                          <div className="prose prose-sm max-w-none bg-gray-50 dark:bg-slate-900/50 p-6 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300">
                            <div dangerouslySetInnerHTML={{ __html: aiProtocols[sys.id].replace(/\n/g, '<br />') }} />
                          </div>
                        )}

                        {!aiProtocols[sys.id] && !loadingId && (
                           <div className="text-center py-12 text-gray-400 dark:text-gray-500">
                             <Sparkles size={48} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                             <p>No protocols generated yet.</p>
                             <button onClick={() => handleGenerateProtocols(sys)} className="text-indigo-600 hover:underline mt-2">Generate Now</button>
                           </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* --- HISTORY TAB --- */}
                  {activeTab === 'history' && (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                           <h3 className="font-bold text-gray-800 dark:text-gray-200">Inspection Log</h3>
                           <button onClick={() => handleExportHistory(sys.id)} className="text-green-600 text-xs flex items-center gap-1 hover:underline">
                             <FileSpreadsheet size={14}/> Export Excel
                           </button>
                        </div>
                        <button 
                          onClick={() => setIsAddingInspection(!isAddingInspection)}
                          className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 rounded-lg text-sm hover:bg-blue-100 dark:hover:bg-blue-900/50 flex items-center gap-1 font-medium"
                        >
                          <Plus size={16} /> New Entry
                        </button>
                      </div>

                      {isAddingInspection && (
                        <div className="bg-blue-50 dark:bg-slate-800 p-6 rounded-xl border border-blue-100 dark:border-slate-700 animate-fade-in">
                          <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-4 flex items-center gap-2">
                             <PenTool size={16}/> New Inspection Entry
                          </h4>
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Date</label>
                              <input 
                                type="date" 
                                value={newInspection.date || ''}
                                onChange={(e) => setNewInspection({...newInspection, date: e.target.value})}
                                className="w-full bg-white dark:bg-slate-700 text-gray-900 dark:text-white border border-gray-300 dark:border-slate-600 rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Inspector Name</label>
                              <input 
                                type="text" 
                                value={newInspection.inspectorName || ''}
                                onChange={(e) => setNewInspection({...newInspection, inspectorName: e.target.value})}
                                className="w-full bg-white dark:bg-slate-700 text-gray-900 dark:text-white border border-gray-300 dark:border-slate-600 rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Enter Name"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 mb-4">
                             {SYSTEM_PARAMS[sys.type]?.map(param => (
                               <div key={param.name}>
                                 <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 flex justify-between">
                                    {param.label} {param.unit ? `(${param.unit})` : ''}
                                    {param.gampGuideline && <span className="text-[10px] text-blue-400 italic" title={param.gampGuideline}>GAMP Info</span>}
                                 </label>
                                 {param.inputType === 'select' ? (
                                    <select 
                                      value={newInspection.parameters?.[param.name] || ''}
                                      onChange={(e) => setNewInspection({
                                        ...newInspection, 
                                        parameters: {...newInspection.parameters, [param.name]: e.target.value}
                                      })}
                                      className="w-full bg-white dark:bg-slate-700 text-gray-900 dark:text-white border border-gray-300 dark:border-slate-600 rounded p-2 text-sm"
                                    >
                                      <option value="">Select...</option>
                                      {param.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                 ) : (
                                    <input 
                                      type={param.inputType}
                                      value={newInspection.parameters?.[param.name] || ''}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        // Enforce numeric only if inputType number
                                        if (param.inputType === 'number' && isNaN(Number(val)) && val !== '') return;
                                        setNewInspection({
                                          ...newInspection, 
                                          parameters: {...newInspection.parameters, [param.name]: val}
                                        })
                                      }}
                                      className="w-full bg-white dark:bg-slate-700 text-gray-900 dark:text-white border border-gray-300 dark:border-slate-600 rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                 )}
                               </div>
                             ))}
                          </div>

                          <div className="mb-4">
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Notes / Observations</label>
                            <textarea 
                              value={newInspection.notes || ''}
                              onChange={(e) => setNewInspection({...newInspection, notes: e.target.value})}
                              className="w-full bg-white dark:bg-slate-700 text-gray-900 dark:text-white border border-gray-300 dark:border-slate-600 rounded p-2 text-sm h-20 focus:ring-2 focus:ring-blue-500 outline-none"
                            ></textarea>
                          </div>
                          
                          {/* Signature Pad */}
                          <div className="mb-4">
                             <div className="flex justify-between items-center mb-1">
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Inspector Signature</label>
                                <button type="button" onClick={clearSignature} className="text-xs text-red-500 flex items-center gap-1 hover:underline"><Eraser size={12}/> Clear</button>
                             </div>
                             <div className="border border-gray-300 dark:border-slate-600 rounded bg-white relative">
                                <canvas
                                  ref={canvasRef}
                                  className="w-full h-32 touch-none cursor-crosshair block"
                                  style={{ touchAction: 'none' }}
                                  onMouseDown={startDrawing}
                                  onMouseMove={draw}
                                  onMouseUp={stopDrawing}
                                  onMouseLeave={stopDrawing}
                                  onTouchStart={startDrawing}
                                  onTouchMove={draw}
                                  onTouchEnd={stopDrawing}
                                />
                                <div className="absolute bottom-4 left-4 right-4 border-b border-gray-200 pointer-events-none text-[10px] text-gray-300">Sign above this line</div>
                             </div>
                          </div>

                          <div className="flex justify-end gap-2">
                             <button onClick={() => setIsAddingInspection(false)} className="px-4 py-2 text-gray-500 dark:text-gray-400 text-sm hover:text-gray-700 dark:hover:text-gray-200">Cancel</button>
                             <button onClick={() => handleSaveInspection(sys.id)} className="px-6 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 shadow-sm">Save Record</button>
                          </div>
                        </div>
                      )}

                      <div className="space-y-3">
                         {inspections.length === 0 ? (
                            <p className="text-gray-400 text-center py-8 text-sm italic">No inspection records found.</p>
                         ) : inspections.map(record => (
                           <div key={record.id} className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                              <div className="flex justify-between items-start mb-2">
                                 <div>
                                    <h5 className="font-medium text-gray-800 dark:text-gray-200 text-sm">{record.date}</h5>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Inspector: {record.inspectorName}</p>
                                 </div>
                                 <span className="text-xs bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded">ID: {record.id.slice(-4)}</span>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3 bg-gray-50 dark:bg-slate-900/50 p-2 rounded text-xs text-gray-700 dark:text-gray-300">
                                 {Object.entries(record.parameters).map(([key, val]) => (
                                    <div key={key}>
                                       <span className="font-semibold text-gray-500 dark:text-gray-400 block capitalize">{key.replace(/_/g, ' ')}:</span>
                                       {val}
                                    </div>
                                 ))}
                              </div>
                              {record.notes && <p className="text-xs text-gray-600 dark:text-gray-400 italic border-l-2 border-gray-300 dark:border-slate-600 pl-2 mb-2">{record.notes}</p>}
                              {record.signature && (
                                <div className="mt-2 pt-2 border-t border-gray-100 dark:border-slate-700">
                                  <p className="text-[10px] text-gray-400 mb-1">Signed Electronically:</p>
                                  <img src={record.signature} alt="Signature" className="h-8 opacity-70 bg-white rounded p-1" />
                                </div>
                              )}
                           </div>
                         ))}
                      </div>
                    </div>
                  )}

                  {/* --- EXCEL VALIDATION TAB --- */}
                  {activeTab === 'excel' && (
                    <div className="space-y-6">
                      <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 p-6 rounded-xl text-center">
                         <div className="flex flex-col items-center gap-3">
                            <div className="bg-white dark:bg-slate-800 p-3 rounded-full shadow-sm">
                               <FileSpreadsheet className="text-indigo-600 dark:text-indigo-400" size={32} />
                            </div>
                            <h3 className="font-bold text-indigo-900 dark:text-indigo-100">Spreadsheet Validation (GAMP 5)</h3>
                            <p className="text-sm text-indigo-700 dark:text-indigo-300 max-w-md">
                              Upload Excel calculation sheets to validate formulas against GAMP 5 integrity rules. 
                              <br/><span className="text-xs opacity-75">(Checks for: Broken formulas, hardcoded values, audit trail compliance)</span>
                            </p>
                            
                            {/* Retention Policy Badge */}
                            <div className="inline-flex items-center gap-1 bg-indigo-200 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide">
                              <ShieldCheck size={10} /> 6-Month Data Retention Policy Active
                            </div>

                            <input 
                              type="file" 
                              accept=".xlsx, .xls"
                              ref={fileInputRef}
                              className="hidden"
                              onChange={(e) => handleFileUpload(e, sys.id)}
                            />
                            
                            <button 
                              onClick={() => fileInputRef.current?.click()}
                              disabled={isAnalyzingExcel}
                              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-md transition-all flex items-center gap-2"
                            >
                              {isAnalyzingExcel ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
                              Upload Spreadsheet
                            </button>
                         </div>
                      </div>

                      {/* Current Analysis Result */}
                      {excelResult && (
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-lg overflow-hidden animate-fade-in-up">
                           <div className={`p-4 border-b flex justify-between items-center ${excelResult.isValid ? 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800'}`}>
                              <div className="flex items-center gap-2">
                                 {excelResult.isValid ? <CheckCircle className="text-green-600 dark:text-green-400" size={20}/> : <XCircle className="text-red-600 dark:text-red-400" size={20}/>}
                                 <h4 className={`font-bold ${excelResult.isValid ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
                                    Validation Result: {excelResult.isValid ? 'Passed' : 'Issues Found'}
                                 </h4>
                              </div>
                              <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">{excelResult.fileName}</span>
                           </div>
                           
                           <div className="p-6">
                              <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">{excelResult.summary}</p>
                              {excelResult.referencedSopTitle && (
                                <p className="text-xs text-blue-600 dark:text-blue-300 mb-4 bg-blue-50 dark:bg-blue-900/30 inline-block px-2 py-1 rounded border border-blue-100 dark:border-blue-800">
                                   Validated against SOP: <strong>{excelResult.referencedSopTitle}</strong>
                                </p>
                              )}
                              
                              <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                                 <div className="bg-gray-50 dark:bg-slate-900/50 p-3 rounded">
                                    <span className="text-gray-500 dark:text-gray-400 block text-xs uppercase">Total Formulas</span>
                                    <span className="font-bold text-gray-800 dark:text-gray-200 text-xl">{excelResult.totalFormulas}</span>
                                 </div>
                                 <div className="bg-gray-50 dark:bg-slate-900/50 p-3 rounded">
                                    <span className="text-gray-500 dark:text-gray-400 block text-xs uppercase">Discrepancies</span>
                                    <span className="font-bold text-gray-800 dark:text-gray-200 text-xl">{excelResult.discrepancies.length}</span>
                                 </div>
                              </div>

                              {excelResult.discrepancies.length > 0 && (
                                 <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm border-collapse">
                                      <thead>
                                        <tr className="bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300">
                                          <th className="p-2 border dark:border-slate-600">Cell</th>
                                          <th className="p-2 border dark:border-slate-600">Current Value</th>
                                          <th className="p-2 border dark:border-slate-600">Suggested True Value</th>
                                          <th className="p-2 border dark:border-slate-600">Issue / Suggestion</th>
                                          <th className="p-2 border dark:border-slate-600">Severity</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {excelResult.discrepancies.map((disc, idx) => (
                                          <tr key={idx} className="border-b dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700">
                                             <td className="p-2 font-mono text-indigo-600 dark:text-indigo-400 font-bold border dark:border-slate-600">{disc.address}</td>
                                             <td className="p-2 font-mono text-gray-800 dark:text-gray-200 border dark:border-slate-600 bg-red-50/50 dark:bg-red-900/20">{disc.value}</td>
                                             <td className="p-2 font-mono text-green-700 dark:text-green-300 border dark:border-slate-600 bg-green-50/50 dark:bg-green-900/20 font-bold">
                                                {disc.suggestedValue || '-'}
                                             </td>
                                             <td className="p-2 text-gray-600 dark:text-gray-300 border dark:border-slate-600">
                                                <div className="font-semibold text-red-600 dark:text-red-400 mb-1">{disc.reason}</div>
                                                {disc.suggestedFormula && (
                                                   <div className="text-xs text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 p-1 rounded font-mono">
                                                     Try: {disc.suggestedFormula}
                                                   </div>
                                                )}
                                             </td>
                                             <td className="p-2 border dark:border-slate-600">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                                  disc.severity === 'High' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                                                }`}>
                                                  {disc.severity}
                                                </span>
                                             </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                 </div>
                              )}

                              {/* Action Buttons for Report */}
                              <div className="flex gap-2 mt-6 border-t dark:border-slate-700 pt-4">
                                <button className="px-3 py-2 text-xs bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 rounded flex items-center gap-2">
                                   <Download size={14}/> PDF Report
                                </button>
                                <button className="px-3 py-2 text-xs bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 rounded flex items-center gap-2">
                                   <FileType size={14}/> Word Report
                                </button>
                                
                                <div className="flex-1"></div>

                                {/* Download Corrected Excel */}
                                <button 
                                   onClick={handleDownloadCorrectedExcel}
                                   className="px-4 py-2 text-xs bg-green-600 hover:bg-green-700 text-white rounded flex items-center gap-2 shadow-sm font-bold animate-pulse"
                                >
                                   <FileCheck size={14}/> Download Corrected Excel
                                </button>
                              </div>
                           </div>
                        </div>
                      )}

                      {/* Excel History List */}
                      {excelHistory.length > 0 && (
                         <div className="mt-8">
                            <h4 className="font-bold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2">
                               <History size={16}/> Previous Validations (Retained 6 Months)
                            </h4>
                            <div className="space-y-2">
                               {excelHistory.map((rep, idx) => (
                                  <div key={idx} className="flex justify-between items-center bg-white dark:bg-slate-800 p-3 rounded border border-gray-100 dark:border-slate-700 text-sm hover:bg-gray-50 dark:hover:bg-slate-700">
                                     <div>
                                        <div className="font-medium text-gray-800 dark:text-gray-200">{rep.fileName}</div>
                                        <div className="text-xs text-gray-400">
                                           Date: {new Date(rep.date!).toLocaleDateString()} • Retention until: {rep.retentionDate}
                                        </div>
                                     </div>
                                     <div className="flex items-center gap-4">
                                        <span className={`text-xs font-bold ${rep.isValid ? 'text-green-600' : 'text-red-500'}`}>
                                           {rep.isValid ? 'Valid' : 'Errors'}
                                        </span>
                                     </div>
                                  </div>
                               ))}
                            </div>
                         </div>
                      )}
                    </div>
                  )}

                  {/* --- SOPs TAB --- */}
                  {activeTab === 'sops' && (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <h3 className="font-bold text-gray-800 dark:text-gray-200">SOPs & Documentation</h3>
                        <div className="flex gap-2">
                           <input 
                             type="file" 
                             accept=".pdf,.doc,.docx,.txt"
                             ref={sopFileInputRef}
                             className="hidden"
                           />
                           <button 
                             onClick={() => setIsUploadingSOP(!isUploadingSOP)}
                             className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg text-sm hover:bg-indigo-100 dark:hover:bg-indigo-900/50 flex items-center gap-1 font-medium"
                           >
                             <Upload size={16} /> Upload SOP
                           </button>
                        </div>
                      </div>

                      {isUploadingSOP && (
                         <div className="bg-indigo-50 dark:bg-indigo-900/20 p-5 rounded-xl border border-indigo-100 dark:border-indigo-800 animate-fade-in">
                            <h4 className="font-semibold text-indigo-800 dark:text-indigo-200 mb-2">Upload Expert Information (SOP)</h4>
                            <p className="text-xs text-indigo-600 dark:text-indigo-300 mb-4 bg-white/50 dark:bg-slate-900/30 p-2 rounded border border-indigo-200 dark:border-indigo-700">
                               Note: This upload is for **Rule Extraction** only. The system will analyze this document to understand validation limits for future checks. It does NOT validate the document itself.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                               <input 
                                 type="text" 
                                 placeholder="SOP Title"
                                 value={newSOP.title}
                                 onChange={e => setNewSOP({...newSOP, title: e.target.value})}
                                 className="p-2 border rounded text-sm w-full bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-slate-600"
                               />
                               <select
                                 value={newSOP.category}
                                 onChange={e => setNewSOP({...newSOP, category: e.target.value as any})}
                                 className="p-2 border rounded text-sm w-full bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-slate-600"
                               >
                                  <option value="Operation">Operation</option>
                                  <option value="Validation">Validation</option>
                                  <option value="Maintenance">Maintenance</option>
                                  <option value="Spreadsheet Validation">Spreadsheet Validation</option>
                                </select>
                               <div className="col-span-2">
                                  <textarea
                                    placeholder="Paste SOP content text here (Simulating PDF parsing)..."
                                    value={newSOP.contentText || ''}
                                    onChange={e => setNewSOP({...newSOP, contentText: e.target.value})}
                                    className="w-full p-2 border rounded text-sm h-24 bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-slate-600"
                                  ></textarea>
                               </div>
                               <div className="col-span-2">
                                 <input 
                                    type="file" 
                                    ref={sopFileInputRef}
                                    className="block w-full text-sm text-gray-500 dark:text-gray-400
                                      file:mr-4 file:py-2 file:px-4
                                      file:rounded-full file:border-0
                                      file:text-xs file:font-semibold
                                      file:bg-indigo-100 file:text-indigo-700 dark:file:bg-indigo-900 dark:file:text-indigo-300
                                      hover:file:bg-indigo-200 dark:hover:file:bg-indigo-800
                                    "
                                  />
                               </div>
                            </div>
                            <div className="flex justify-end gap-2">
                               <button onClick={() => setIsUploadingSOP(false)} className="px-3 py-1 text-gray-500 dark:text-gray-400 text-xs">Cancel</button>
                               <button 
                                 onClick={handleSOPUpload} 
                                 disabled={isAnalyzingSOP}
                                 className="px-4 py-1.5 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-700 flex items-center gap-2"
                               >
                                 {isAnalyzingSOP ? <Loader2 className="animate-spin" size={14}/> : <Sparkles size={14}/>}
                                 Upload & Extract Rules
                               </button>
                            </div>
                         </div>
                      )}

                      <div className="space-y-2">
                         {sops.length === 0 ? (
                            <p className="text-gray-400 text-center py-8 text-sm italic">No SOPs linked to this system.</p>
                         ) : sops.map(sop => (
                            <div key={sop.id} className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow flex justify-between items-start">
                               <div>
                                  <div className="flex items-center gap-2">
                                     <FileText size={16} className="text-gray-400"/>
                                     <h5 className="font-medium text-gray-800 dark:text-gray-200 text-sm">{sop.title}</h5>
                                     <span className="text-[10px] bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-gray-500 dark:text-gray-400">v{sop.version}</span>
                                     {sop.isActive && <span className="text-[10px] bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded border border-green-100 dark:border-green-800">Active Rules</span>}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex gap-3">
                                     <span>{sop.category}</span>
                                     <span>• {new Date(sop.uploadDate).toLocaleDateString()}</span>
                                     <span>• By: {sop.uploadedBy}</span>
                                  </div>
                                  {sop.extractedRules && (
                                     <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-slate-900/50 p-2 rounded border border-gray-200 dark:border-slate-700">
                                        <strong className="text-gray-700 dark:text-gray-300">Extracted Rules:</strong> {sop.extractedRules.substring(0, 100)}...
                                     </div>
                                  )}
                               </div>
                               <button 
                                 type="button"
                                 onClick={(e) => handleDeleteSOP(e, sop.id)}
                                 className="text-gray-300 hover:text-red-500 p-1"
                                 title="Delete SOP"
                               >
                                  <Trash2 size={16} />
                               </button>
                            </div>
                         ))}
                      </div>
                    </div>
                  )}

                </div>
              </>
            );
          })()
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-300 dark:text-gray-600">
             <div className="w-16 h-16 bg-gray-50 dark:bg-slate-900/50 rounded-full flex items-center justify-center mb-4">
               <Server size={32} />
             </div>
             <p className="text-lg font-medium">Select an asset to view details</p>
             <p className="text-sm">Manage validation protocols, inspections, and SOPs.</p>
          </div>
        )}
      </div>

      {/* --- SERVER ICON MOCK FOR EMPTY STATE --- */}
      {/* (Adding the Server icon import at top of file since used here) */}
      <div className="hidden">
         <Server />
      </div>

    </div>
  );
};

// Add missing icon import manually since I used it in empty state
const Server = ({size, className}: {size?: number, className?: string}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="20" height="8" x="2" y="2" rx="2" ry="2"/><rect width="20" height="8" x="2" y="14" rx="2" ry="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/></svg>
);
