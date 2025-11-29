
export enum SystemType {
  WATER_SYSTEM = 'Water System (WFI/PW)',
  HVAC = 'HVAC / Air Handling',
  LAB_EQUIPMENT = 'Lab Equipment (HPLC/TOC)',
  MONITORING = 'Env. Monitoring (Fridge/Sensors)',
  SOFTWARE = 'GAMP 5 Software'
}

export enum ValidationStage {
  URS = 'URS (User Requirements)',
  IQ = 'IQ (Installation Qualification)',
  OQ = 'OQ (Operational Qualification)',
  PQ = 'PQ (Performance Qualification)',
  VSR = 'Validation Summary Report'
}

export enum ComplianceStatus {
  COMPLIANT = 'Compliant',
  IN_PROGRESS = 'In Progress',
  DEVIATION = 'Deviation/Non-Compliant',
  NOT_STARTED = 'Not Started'
}

export enum UserRole {
  ADMIN = 'Admin / QA Manager',
  OPERATOR = 'Operator / Analyst'
}

export interface User {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  password?: string;
  lastLogin?: string;
}

export interface SOP {
  id: string;
  systemId: string;
  title: string;
  version: string;
  category: 'Operation' | 'Validation' | 'Maintenance' | 'Spreadsheet Validation' | 'Safety';
  fileName: string;
  uploadDate: string;
  uploadedBy: string;
  isActive: boolean;
  
  // AI Analysis Fields
  aiComplianceStatus?: 'Compliant' | 'Non-Compliant' | 'Pending';
  aiAnalysisReport?: string;
  extractedRules?: string;
}

export interface ValidationTest {
  id: string;
  testName: string;
  acceptanceCriteria: string;
  result: 'Pass' | 'Fail' | 'Pending';
  executedBy?: string;
  date?: string;
}

export interface InspectionRecord {
  id: string;
  systemId: string;
  date: string;
  inspectorName: string;
  notes: string;
  parameters: Record<string, string>; 
  signature?: string;
}

export interface PharmaSystem {
  id: string;
  name: string;
  type: SystemType;
  location: string;
  riskLevel: 'High' | 'Medium' | 'Low';
  currentStage: ValidationStage;
  status: ComplianceStatus;
  progress: number;
  lastValidationDate: string;
  deviationsCount: number;
}

export interface RiskAssessmentResponse {
  riskScore: number;
  mitigationPlan: string;
  criticalParameters: string[];
}

export interface SpreadsheetCell {
  address: string;
  formula: string;
  value: any;
}

export interface ExcelAnalysisResult {
  id?: string;
  systemId?: string;
  date?: string;
  fileName: string;
  retentionDate?: string; // New: 6-month retention policy date
  totalFormulas: number;
  discrepancies: Array<{
    address: string;
    formula: string;
    value: any;
    reason: string;
    severity: 'High' | 'Medium' | 'Low';
    suggestedFormula?: string;
    suggestedValue?: string; // New: True Value suggestion
  }>;
  isValid: boolean;
  summary: string;
  referencedSopTitle?: string;
}
