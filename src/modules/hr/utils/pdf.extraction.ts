// const pdfParse = require('pdf-parse');
//   import { PDFDocument } from 'pdf-lib';
// import axios from 'axios';
// import path from 'path';
// import fs from 'fs';
// import { logger } from '../../../common/utils/logger';


// /** 
//  * PDF Extraction Service for HR Documents
//  * Supports extracting data from Aadhar, PAN, Licenses, etc.
//  */

// interface ExtractedDocumentData {
//   rawText: string;
//   // extractedFields: Record<string, any>;
//   confidence: number;
//   extractedAt: Date;
// }

// interface DocumentExtractionResult {
//   success: boolean;
//   data?: ExtractedDocumentData;
//   error?: string;

// }

// class PDFExtractionService {
//   /**
//    * Extract text and data from PDF file
//    */
//   async extractFromFile(filePath: string): Promise<DocumentExtractionResult> {
//     try {
//       const fileBuffer = fs.readFileSync(filePath);
//       return await this.extractPDFData(fileBuffer);
//     } catch (error: any) {
//       logger.error('PDF extraction error:', error);
//       return {
//         success: false,
//         error: `Failed to extract PDF: ${error.message}`,
//       };
//     }
//   }

//   /**
//    * Extract text and data from PDF URL
//    */
//   async extractFromUrl(fileUrl: string): Promise<DocumentExtractionResult> {
//     try {
//       const response = await axios.get(fileUrl, {
//         responseType: 'arraybuffer',
//       });
//       const fileBuffer = Buffer.from(response.data);
//       return await this.extractPDFData(fileBuffer);
//     } catch (error: any) {
//       logger.error('PDF extraction from URL error:', error);
//       return {
//         success: false,
//         error: `Failed to extract PDF from URL: ${error.message}`,
//       };
//     }
//   }

//   /**
//    * Internal method to extract PDF data
//    */
//   private async extractPDFData(fileBuffer: Buffer): Promise<DocumentExtractionResult> {
//     try {
//       const pdfData = await pdfParse(fileBuffer);
//       const rawText = pdfData.text;

//       const extractedFields = this.parseDocumentText(rawText);

//       return {
//         success: true,
//         data: {
//           rawText,
//           extractedFields,
//           confidence: this.calculateConfidence(extractedFields),
//           extractedAt: new Date(),
//         },
//       };
//     } catch (error: any) {
//       logger.error('Error parsing PDF:', error);
//       return {
//         success: false,
//         error: `Error parsing PDF: ${error.message}`,
//     private async extractPDFData(fileBuffer: Buffer): Promise<DocumentExtractionResult> {
//       try {
//         const pdfDoc = await PDFDocument.load(fileBuffer);
//         let rawText = '';
//         const pages = pdfDoc.getPages();
//         for (const page of pages) {
//           rawText += page.getTextContent ? await page.getTextContent() : page.getText() || '';
//         }
//         // Fallback: pdf-lib does not have getTextContent, so use extractText()
//         if (!rawText) {
//           rawText = pages.map(page => page.getText ? page.getText() : '').join('\n');
//         }
//   /**
//    * Parse document text and extract structured data
//    */
//   private parseDocumentText(text: string): Record<string, any> {
//     const fields: Record<string, any> = {};

//     // Aadhar Number extraction
//     const aadharMatch = text.match(/\b(\d{4}\s?\d{4}\s?\d{4})\b/);
//     if (aadharMatch) {
//       fields.aadharNumber = aadharMatch[1].replace(/\s/g, '');
//     }

//     // PAN extraction
//     const panMatch = text.match(/\b([A-Z]{5}[0-9]{4}[A-Z]{1})\b/);
//     if (panMatch) {
//       fields.panNumber = panMatch[1];
//     }

//     // Email extraction
//     const emailMatch = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
//     if (emailMatch) {
//       fields.email = emailMatch[1];
//     }

//     // Phone extraction
//     const phoneMatch = text.match(/\b(\+?91[-.\s]?[6-9]\d{9})\b/);
//     if (phoneMatch) {
//       fields.phone = phoneMatch[1].replace(/[-.\s]/g, '');
//     }

//     // Name extraction (usually first line or after "Name:")
//     const nameMatch = text.match(/(?:Name[:\s]+)?([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)/);
//     if (nameMatch) {
//       fields.name = nameMatch[1];
//     }

//     // Date of Birth extraction
//     const dobMatch = text.match(/(?:DOB|Date of Birth|Born)[:\s]*(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i);
//     if (dobMatch) {
//       fields.dateOfBirth = dobMatch[1];
//     }

//     // Gender extraction
//     const genderMatch = text.match(/(?:Gender|Sex)[:\s]*([MF]ale|[MF])\b/i);
//     if (genderMatch) {
//       fields.gender = genderMatch[1];
//     }

//     // Address extraction
//     const addressMatch = text.match(/(?:Address|Address[:\s]+)([^\n]+)/i);
//     if (addressMatch) {
//       fields.address = addressMatch[1].trim();
//     }

//     // Father's name extraction
//     const fatherMatch = text.match(/(?:Father['']?s?|Father Name)[:\s]*([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)/i);
//     if (fatherMatch) {
//       fields.fatherName = fatherMatch[1];
//     }

//     // Spouse name extraction
//     const spouseMatch = text.match(/(?:Spouse|Spouse Name)[:\s]*([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)/i);
//     if (spouseMatch) {
//       fields.spouseName = spouseMatch[1];
//     }

//     // Blood Group extraction
//     const bloodGroupMatch = text.match(/(?:Blood|Blood Group)[:\s]*([AB]?O[\+\-]?)/i);
//     if (bloodGroupMatch) {
//       fields.bloodGroup = bloodGroupMatch[1];
//     }

//     // Document validity/Expiry extraction
//     const expiryMatch = text.match(/(?:Valid|Expires|Expiry)[:\s]*(?:Till|Until|Upto)?[:\s]*(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i);
//     if (expiryMatch) {
//       fields.expiryDate = expiryMatch[1];
//     }

//     // Issue date extraction
//     const issueMatch = text.match(/(?:Issue Year|Issued)[:\s]*(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i);
//     if (issueMatch) {
//       fields.issueDate = issueMatch[1];
//     }

//     // Bank Account extraction
//     const bankMatch = text.match(/\b(\d{10,18})\b/);
//     if (bankMatch) {
//       fields.bankAccountNumber = bankMatch[1];
//     }

//     // IFSC extraction
//     const ifscMatch = text.match(/\b([A-Z]{4}0[A-Z0-9]{6})\b/);
//     if (ifscMatch) {
//       fields.ifscCode = ifscMatch[1];
//     }

//     return fields;
//   }

//   /**
//    * Calculate confidence score based on extracted fields
//    */
//   private calculateConfidence(fields: Record<string, any>): number {
//     const possibleFields = [
//       'aadharNumber',
//       'panNumber',
//       'name',
//       'dateOfBirth',
//       'email',
//       'phone',
//       'address',
//       'fatherName',
//     ];

//     const extractedCount = Object.keys(fields).filter((key) =>
//       possibleFields.includes(key) && fields[key]
//     ).length;

//     return Math.round((extractedCount / possibleFields.length) * 100);
//   }

//   /**
//    * Validate extracted Aadhar data
//    */
//   validateAadhar(aadharData: Record<string, any>): boolean {
//     return (
//       aadharData.aadharNumber &&
//       aadharData.name &&
//       aadharData.dateOfBirth &&
//       aadharData.fatherName
//     );
//   }

//   /**
//    * Validate extracted PAN data
//    */
//   validatePAN(panData: Record<string, any>): boolean {
//     return (
//       panData.panNumber &&
//       panData.name &&
//       /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panData.panNumber)
//     );
//   }

//   /**
//    * Validate extracted License data
//    */
//   validateLicense(licenseData: Record<string, any>): boolean {
//     return (
//       licenseData.licenseNumber &&
//       licenseData.name &&
//       licenseData.expiryDate
//     );
//   }
// }

// export const pdfExtractionService = new PDFExtractionService();
// export type { ExtractedDocumentData, DocumentExtractionResult };
