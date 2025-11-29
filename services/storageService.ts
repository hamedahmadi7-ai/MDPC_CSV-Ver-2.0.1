
import { InspectionRecord, ExcelAnalysisResult, SOP } from '../types';

const INSPECTIONS_KEY = 'pharma_csv_inspections';
const EXCEL_REPORTS_KEY = 'pharma_csv_excel_reports';
const SOPS_KEY = 'pharma_csv_sops';
const USER_DRAFTS_KEY = 'pharma_csv_user_drafts';

// Simulate a database delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const storageService = {
  
  // --- Inspection Records ---

  getInspections: async (systemId: string): Promise<InspectionRecord[]> => {
    await delay(200); 
    const data = localStorage.getItem(INSPECTIONS_KEY);
    if (!data) return [];
    
    const allRecords: InspectionRecord[] = JSON.parse(data);
    // Sort by date descending
    return allRecords
      .filter(r => r.systemId === systemId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  saveInspection: async (record: InspectionRecord): Promise<void> => {
    await delay(300);
    const data = localStorage.getItem(INSPECTIONS_KEY);
    const allRecords: InspectionRecord[] = data ? JSON.parse(data) : [];
    
    allRecords.push(record);
    localStorage.setItem(INSPECTIONS_KEY, JSON.stringify(allRecords));
  },

  filterInspections: async (systemId: string, startDate: string, endDate: string): Promise<InspectionRecord[]> => {
    const records = await storageService.getInspections(systemId);
    
    const start = startDate ? new Date(startDate).getTime() : 0;
    const end = endDate ? new Date(endDate).getTime() : Number.MAX_SAFE_INTEGER;

    return records.filter(r => {
      const recordTime = new Date(r.date).getTime();
      return recordTime >= start && recordTime <= end;
    });
  },

  // --- Excel Validation Reports ---

  getExcelReports: async (systemId: string): Promise<ExcelAnalysisResult[]> => {
    await delay(200);
    const data = localStorage.getItem(EXCEL_REPORTS_KEY);
    if (!data) return [];

    const allReports: ExcelAnalysisResult[] = JSON.parse(data);
    return allReports
      .filter(r => r.systemId === systemId)
      .sort((a, b) => (b.date ? new Date(b.date).getTime() : 0) - (a.date ? new Date(a.date).getTime() : 0));
  },

  saveExcelReport: async (report: ExcelAnalysisResult): Promise<void> => {
    await delay(300);
    const data = localStorage.getItem(EXCEL_REPORTS_KEY);
    const allReports: ExcelAnalysisResult[] = data ? JSON.parse(data) : [];
    
    // Calculate 6-month retention policy
    const retention = new Date();
    retention.setMonth(retention.getMonth() + 6);
    report.retentionDate = retention.toISOString().split('T')[0];

    allReports.push(report);
    localStorage.setItem(EXCEL_REPORTS_KEY, JSON.stringify(allReports));
  },

  // --- SOP Management (GMP/GAMP 5) ---

  getSOPs: async (systemId: string): Promise<SOP[]> => {
    await delay(200);
    const data = localStorage.getItem(SOPS_KEY);
    if (!data) return [];

    const allSops: SOP[] = JSON.parse(data);
    return allSops
      .filter(s => s.systemId === systemId)
      .sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());
  },

  saveSOP: async (sop: SOP): Promise<void> => {
    await delay(300);
    const data = localStorage.getItem(SOPS_KEY);
    let allSops: SOP[] = data ? JSON.parse(data) : [];
    
    allSops.push(sop);
    localStorage.setItem(SOPS_KEY, JSON.stringify(allSops));
  },

  deleteSOP: async (sopId: string): Promise<void> => {
    await delay(300);
    const data = localStorage.getItem(SOPS_KEY);
    if (!data) return;

    let allSops: SOP[] = JSON.parse(data);
    allSops = allSops.filter(s => s.id !== sopId);
    localStorage.setItem(SOPS_KEY, JSON.stringify(allSops));
  },

  // --- User Profile / Drafts Management ---

  saveUserDraft: (userId: string, key: string, data: any) => {
    const store = localStorage.getItem(USER_DRAFTS_KEY);
    const drafts = store ? JSON.parse(store) : {};
    
    if (!drafts[userId]) drafts[userId] = {};
    drafts[userId][key] = data;
    
    localStorage.setItem(USER_DRAFTS_KEY, JSON.stringify(drafts));
  },

  getUserDraft: (userId: string, key: string): any => {
    const store = localStorage.getItem(USER_DRAFTS_KEY);
    if (!store) return null;
    const drafts = JSON.parse(store);
    return drafts[userId]?.[key] || null;
  },

  clearUserDrafts: (userId: string) => {
    const store = localStorage.getItem(USER_DRAFTS_KEY);
    if (!store) return;
    const drafts = JSON.parse(store);
    
    if (drafts[userId]) {
      delete drafts[userId];
      localStorage.setItem(USER_DRAFTS_KEY, JSON.stringify(drafts));
    }
  },
  
  clearSpecificDraft: (userId: string, key: string) => {
    const store = localStorage.getItem(USER_DRAFTS_KEY);
    if (!store) return;
    const drafts = JSON.parse(store);
    
    if (drafts[userId] && drafts[userId][key]) {
      delete drafts[userId][key];
      localStorage.setItem(USER_DRAFTS_KEY, JSON.stringify(drafts));
    }
  }
};