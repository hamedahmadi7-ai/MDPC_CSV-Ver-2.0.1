
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { SystemType, SpreadsheetCell, ExcelAnalysisResult } from "../types";

/**
 * Generates a list of recommended test protocols (IQ/OQ/PQ) based on the system type.
 */
export const generateTestProtocols = async (
  systemName: string,
  systemType: SystemType,
  stage: string
): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `
      You are a Senior Computer System Validation (CSV) Expert in the Pharmaceutical Industry adhering to GAMP 5 and FDA 21 CFR Part 11 guidelines.
      
      I need a checklist of critical validation tests for a specific asset.
      
      Asset Name: ${systemName}
      Asset Type: ${systemType}
      Validation Stage: ${stage}

      Context:
      - If Water System: Focus on conductivity, TOC, flow rates, valve logic.
      - If HVAC: Focus on differential pressure, HEPA filter integrity, temperature/humidity control.
      - If HPLC/TOC (Lab): Focus on software security, audit trails, data integrity, calculation verification.
      - If Monitoring (Fridge): Focus on sensor accuracy, alarm thresholds, data logging gaps.
      - If GAMP 5 Software: Focus on calculation verification, access control, audit trail, electronic signature.

      Please provide a structured list of 5-7 specific tests with acceptance criteria.
      Format the output as a clean Markdown list.
    `;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "No protocols generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error generating protocols. Please check your API key.";
  }
};

/**
 * Analyzes risk for a system description.
 */
export const analyzeSystemRisk = async (
  description: string,
  systemType: SystemType
): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `
      Perform a simplified FMEA (Failure Mode and Effects Analysis) risk assessment for the following pharma system.
      
      System Type: ${systemType}
      Description: ${description}

      Identify:
      1. Potential Failure Modes (Data Integrity, Patient Safety, Product Quality).
      2. Impact Assessment (High/Medium/Low).
      3. Recommended Mitigation Strategies.

      Keep the response concise and formatted as Markdown.
    `;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Unable to analyze risk.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error analyzing risk.";
  }
};

/**
 * Analyzes an SOP content (simulated via text) against GAMP 5 / FDA standards.
 * Extracts rules for future validation.
 */
export const analyzeSOP = async (
  title: string,
  category: string,
  contentSnippet: string 
): Promise<{ status: 'Compliant' | 'Non-Compliant'; report: string; rules: string }> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `
      You are a Quality Assurance Assistant for Pharma CSV.
      
      I am uploading an SOP for "Expert Self Information". 
      **DO NOT CRITIQUE** the SOP for compliance. Assume the expert information is correct.
      
      Your goal is to **EXTRACT** the actionable Validation Rules, Acceptance Criteria, or Numeric Limits found in the text so they can be applied to the system later during Excel validation.

      SOP Title: ${title}
      Category: ${category}
      Content/Summary: "${contentSnippet}"

      Tasks:
      1. Identify any numeric limits (e.g. "Conductivity < 1.3", "Temperature 20-25C").
      2. Identify mandatory procedural checks (e.g. "Must have double signature").
      
      Return JSON:
      {
        "status": "Compliant", 
        "report": "Summary of rules extracted from expert info.",
        "rules": "A concise text block of extracted rules to be used for validation checks later."
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            status: { type: Type.STRING },
            report: { type: Type.STRING },
            rules: { type: Type.STRING }
          }
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    return {
      status: 'Compliant', 
      report: result.report || 'Rules extracted successfully.',
      rules: result.rules || 'No specific rules extracted.'
    };

  } catch (error) {
    console.error("Gemini SOP Analysis Error:", error);
    return {
      status: 'Non-Compliant',
      report: 'AI Service Error during SOP analysis.',
      rules: ''
    };
  }
};

/**
 * Validates Excel formulas for GAMP 5 compliance, using OPTIONAL SOP Context.
 */
export const validateSpreadsheet = async (
  fileName: string,
  cells: SpreadsheetCell[],
  sopContext?: string 
): Promise<ExcelAnalysisResult> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const formulaCells = cells.filter(c => c.formula).slice(0, 50); 
    
    if (formulaCells.length === 0) {
        return {
            fileName,
            totalFormulas: 0,
            discrepancies: [],
            isValid: true,
            summary: "No formulas found in the spreadsheet."
        };
    }

    const prompt = `
      You are a CSV GAMP 5 Validator specializing in Spreadsheet Validation and Data Integrity (ALCOA+ principles).
      Analyze the following Excel formulas and their calculated values.
      
      **CRITICAL - ACTIVE SOP RULES (Expert Self Info)**:
      The following rules are extracted from the approved SOP ("${sopContext || 'General GAMP 5 Guidelines'}"):
      ${sopContext ? sopContext : "No specific SOP provided. Use standard GAMP 5 best practices (No hardcoding, data integrity)."}
      
      Task:
      Check the formulas below. Flag discrepancies if they violate GAMP 5, ALCOA+, OR the specific SOP rules above.
      
      Specifically look for:
      1. Hardcoded values in formula cells (Violates 'Original').
      2. Logic errors that yield incorrect values (Violates 'Accurate').
      3. Broken chains of calculation.

      Data to Analyze:
      ${JSON.stringify(formulaCells)}

      Return the response in strictly JSON format matching this schema:
      {
        "discrepancies": [
          { 
            "address": "A1", 
            "formula": "...", 
            "value": "...", 
            "reason": "Violates SOP Rule: [Rule] OR Hardcoded value", 
            "severity": "High" | "Medium" | "Low",
            "suggestedFormula": "Correct GAMP5 formula (e.g. use reference instead of number)",
            "suggestedValue": "The True Value or Correct Result based on rules/math" 
          }
        ],
        "summary": "Brief analysis summary referencing the SOP if applicable..."
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            discrepancies: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  address: { type: Type.STRING },
                  formula: { type: Type.STRING },
                  value: { type: Type.STRING },
                  reason: { type: Type.STRING },
                  severity: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
                  suggestedFormula: { type: Type.STRING },
                  suggestedValue: { type: Type.STRING }
                }
              }
            },
            summary: { type: Type.STRING }
          }
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    
    return {
      fileName,
      totalFormulas: formulaCells.length,
      discrepancies: result.discrepancies || [],
      isValid: (result.discrepancies || []).length === 0,
      summary: result.summary || "Analysis complete."
    };

  } catch (error) {
    console.error("Gemini Excel Analysis Error:", error);
    return {
      fileName,
      totalFormulas: 0,
      discrepancies: [{
        address: "System",
        formula: "N/A",
        value: "Error",
        reason: "AI Analysis Failed",
        severity: "High"
      }],
      isValid: false,
      summary: "Could not perform AI validation."
    };
  }
};

/**
 * Translates text to Persian (Farsi) using Gemini.
 */
export const translateToPersian = async (text: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `
      You are a professional Pharmaceutical Translator.
      Translate the following Computer System Validation (CSV) protocol/checklist from English to Persian (Farsi).
      Ensure technical terms (like IQ, OQ, PQ, GAMP 5, User Requirements) are either kept in English or used with their standard Persian technical equivalents.
      The tone should be formal and suitable for official documentation.

      Text to translate:
      ${text}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || text;
  } catch (error) {
    console.error("Translation Error:", error);
    return text;
  }
};
