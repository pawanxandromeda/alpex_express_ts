import prisma from '../../../config/postgres';
import { logger, logAction } from '../../../common/utils/logger';
import { pdfExtractionService } from '../utils/pdf.extraction';
import { CreateEmployeeDocument } from '../hr.validation';

/**
 * EMPLOYEE DOCUMENT SERVICE
 */
export const employeeDocumentService = {
  async uploadDocument(data: any) {
    try {
      const document = await prisma.employeeDocument.create({
        data: {
          ...data,
          verificationStatus: 'Pending',
        },
        include: {
          employee: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Extract PDF data if file is PDF
      if (data.fileUrl.endsWith('.pdf')) {
        const extractionResult = await pdfExtractionService.extractFromUrl(data.fileUrl);
        if (extractionResult.success && extractionResult.data) {
          await prisma.employeeDocument.update({
            where: { id: document.id },
            data: {
              extractedData: extractionResult.data.extractedFields as any,
            },
          });
        }
      }

      // Log the action to audit trail
      await logAction({
        action: 'UPLOAD_DOCUMENT',
        performedBy: data.employeeId,
        targetId: document.id,
        details: {
          documentType: data.documentType,
          fileName: data.documentName,
        },
      });

      logger.info(`Document uploaded: ${document.id}`);
      return document;
    } catch (error: any) {
      logger.error('Error uploading document:', error);
      throw error;
    }
  },

  async verifyDocument(id: string, status: string, verifiedBy?: string, remarks?: string) {
    try {
      const document = await prisma.employeeDocument.update({
        where: { id },
        data: {
          verificationStatus: status,
          verifiedBy,
          verifiedAt: new Date(),
          remarks,
        },
        include: {
          employee: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Log the action to audit trail
      await logAction({
        action: 'VERIFY_DOCUMENT',
        performedBy: verifiedBy || 'SYSTEM',
        targetId: id,
        details: {
          verificationStatus: status,
          remarks,
        },
      });

      logger.info(`Document verified: ${id}`);
      return document;
    } catch (error: any) {
      logger.error('Error verifying document:', error);
      throw error;
    }
  },

  async getEmployeeDocuments(employeeId: string) {
    try {
      const documents = await prisma.employeeDocument.findMany({
        where: { employeeId },
        include: {
          employee: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return documents;
    } catch (error: any) {
      logger.error('Error fetching documents:', error);
      throw error;
    }
  },

  async extractDocumentData(fileUrl: string) {
    try {
      const result = await pdfExtractionService.extractFromUrl(fileUrl);
      return result;
    } catch (error: any) {
      logger.error('Error extracting document data:', error);
      throw error;
    }
  },
};
