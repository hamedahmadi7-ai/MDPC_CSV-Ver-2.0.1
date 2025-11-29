
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { PharmaSystem } from "../types";

export const pdfService = {
  addCompanyHeader: (doc: jsPDF, title: string) => {
    const pageWidth = doc.internal.pageSize.width;
    
    // Logo text as fallback/primary if no image
    doc.setFontSize(22);
    doc.setTextColor(75, 85, 99); // Gray-700
    doc.setFont("helvetica", "bold");
    doc.text("MDPC", pageWidth / 2, 15, { align: "center" });
    
    doc.setFontSize(12);
    doc.text("Masoon Darou Pharmaceutical Company", pageWidth / 2, 22, { align: "center" });
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text("Computer System Validation (GAMP 5)", pageWidth / 2, 27, { align: "center" });
    
    doc.setLineWidth(0.5);
    doc.setDrawColor(200, 200, 200);
    doc.line(10, 32, pageWidth - 10, 32);
    
    // Report Title
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text(title, 14, 42);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - 14, 42, { align: "right" });
  },

  addCompanyFooter: (doc: jsPDF) => {
    const pageCount = doc.internal.getNumberOfPages();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.line(10, pageHeight - 15, pageWidth - 10, pageHeight - 15);
      doc.text(`Page ${i} of ${pageCount} - MDPC Confidential GxP Record`, pageWidth / 2, pageHeight - 10, { align: "center" });
    }
  },

  generateDashboardPDF: (systems: PharmaSystem[]) => {
    const doc = new jsPDF();
    pdfService.addCompanyHeader(doc, "Validation Dashboard Executive Summary");

    // KPI Summary Section
    const total = systems.length;
    const compliant = systems.filter(s => s.status === 'Compliant').length;
    const deviations = systems.filter(s => s.status.includes('Deviation')).length;
    const inProgress = systems.filter(s => s.status === 'In Progress').length;
    
    const kpiData = [
      ['Metric', 'Count', 'Percentage'],
      ['Total Assets', total, '100%'],
      ['Compliant', compliant, `${total > 0 ? Math.round(compliant/total*100) : 0}%`],
      ['Active Deviations', deviations, `${total > 0 ? Math.round(deviations/total*100) : 0}%`],
      ['In Progress', inProgress, `${total > 0 ? Math.round(inProgress/total*100) : 0}%`]
    ];

    autoTable(doc, {
      startY: 50,
      head: [['KPI Metric', 'Count', 'Status']],
      body: kpiData.slice(1),
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] }, // Indigo
      styles: { fontSize: 10 }
    });

    // Detailed List
    const tableData = systems.map(s => [
      s.name,
      s.type,
      s.riskLevel,
      s.status,
      `${s.progress}%`
    ]);

    doc.setFontSize(12);
    doc.setTextColor(0,0,0);
    doc.text("System Asset Inventory Status", 14, (doc as any).lastAutoTable.finalY + 15);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['System Name', 'Type', 'Risk Level', 'Compliance Status', 'Progress']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [55, 65, 81] } // Gray-700
    });

    pdfService.addCompanyFooter(doc);
    doc.save("MDPC_Dashboard_Report.pdf");
  }
};
