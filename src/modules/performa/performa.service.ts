import prisma from "../../config/postgres";
import redis from "../../config/redis";
import { AppError, ERROR_CODES } from "../../common/utils/errorMessages";

interface LineItemPayload {
  itemNo: number;
  brandName?: string;
  composition?: string;
  compositionId?: string;
  orderType?: string;
  packing?: string;
  section?: string;
  qty?: string;
  mrp?: string;
  rate?: string;
  amount?: string;
  gst?: string;
}

interface CreatePIPayload {
  customerId: string;
  
  // Customer & Shipping
  brandName?: string;
  partyName?: string;
  gstNo?: string;
  address?: string;
  section?: string;
  
  // Transport Details
  transporter?: string;
  destination?: string;
  modeOfTransport?: string;
  courier?: string;
  
  // Composition
  composition?: string;
  compositionId?: string;
  lineItems?: LineItemPayload[];
  
  // Legacy fields
  piQty?: string;
  piRate?: string;
  amount?: string;
  mrp?: string;
  
  // Financial
  paymentTerms?: string;
  deliveryTerms?: string;
  subtotal?: string;
  gstAmount?: string;
  grandTotal?: string;
  advance?: string;
  orderType?: string;
  notes?: string;
  
  // CYC Charges Details
  cycChargesQuantity?: string;
  companyChargesQuantity?: string;
  clientPayableCharges?: string;
  
  // Packing Details
  packStyle?: string;
  packType?: string;
  formType?: string;
  numberOfShippers?: string;
  productType?: string;
  
  // Approval
  preparedByEmployeeId?: string;
  checkedByEmployeeId?: string;
  accountantEmployeeId?: string;
  designerEmployeeId?: string;
  authorisedByEmployeeId?: string;
  
  // Bank & T&C
  bankDetails?: any;
  termsAndConditions?: any;
  
  createdBy: string;
}



export class ProformaInvoiceService {
  /**
   * Create a new Proforma Invoice
   */
static async createPI(payload: CreatePIPayload) {
  try {
    return await prisma.$transaction(async (tx) => {
      // 1️⃣ Verify customer
      const customer = await tx.customer.findUnique({
        where: { id: payload.customerId },
      });

      if (!customer) {
        throw new AppError("Customer not found", ERROR_CODES.CUSTOMER_NOT_FOUND);
      }

      // 1.5️⃣ Validate compositionId if provided
      if (payload.compositionId) {
        const composition = await tx.compositionMaster.findUnique({
          where: { id: payload.compositionId },
        });
        if (!composition) {
          throw new AppError(
            "Composition not found",
            ERROR_CODES.VALIDATION_ERROR
          );
        }
      }

      // Validate line item compositions if provided
      if (payload.lineItems && payload.lineItems.length > 0) {
        for (const item of payload.lineItems) {
          if (item.compositionId) {
            const composition = await tx.compositionMaster.findUnique({
              where: { id: item.compositionId },
            });
            if (!composition) {
              throw new AppError(
                `Composition not found for line item ${item.itemNo}`,
                ERROR_CODES.VALIDATION_ERROR
              );
            }
          }
        }
      }

      // 2️⃣ Generate PI No → ALP/PI/YEAR/COUNT
      const year = new Date().getFullYear();

      const lastPI = await tx.proformaInvoice.findFirst({
        where: {
          piNo: {
            startsWith: `ALP/PI/${year}/`,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          piNo: true,
        },
      });

      let count = 1;
      if (lastPI?.piNo) {
        const lastCount = parseInt(lastPI.piNo.split("/").pop() || "0", 10);
        count = lastCount + 1;
      }

      const piNo = `ALP/PI/${year}/${String(count).padStart(4, "0")}`;

      // 3️⃣ Create PI
      const pi = await tx.proformaInvoice.create({
        data: {
          piNo,
          piDate: new Date(),
          customerId: payload.customerId,
          brandName: payload.brandName,
          partyName: payload.partyName || customer.customerName,
          gstNo: payload.gstNo || customer.gstrNo,
          address: payload.address || customer.address,
          section: payload.section,

          transporter: payload.transporter,
          destination: payload.destination,
          modeOfTransport: payload.modeOfTransport,
          courier: payload.courier,

          composition: payload.composition,
          compositionId: payload.compositionId,

          paymentTerms: payload.paymentTerms || customer.paymentTerms,
          deliveryTerms: payload.deliveryTerms,
          subtotal: payload.subtotal || payload.amount,
          gstAmount: payload.gstAmount,
          grandTotal: payload.grandTotal,
          advance: payload.advance,
          orderType: payload.orderType || "NEW",
          notes: payload.notes,

          preparedByEmployeeId: payload.preparedByEmployeeId,
          checkedByEmployeeId: payload.checkedByEmployeeId,
          accountantEmployeeId: payload.accountantEmployeeId,
          designerEmployeeId: payload.designerEmployeeId,
          authorisedByEmployeeId: payload.authorisedByEmployeeId,

          bankDetails: payload.bankDetails,
          termsAndConditions: payload.termsAndConditions,

          piQty: payload.piQty,
          piRate: payload.piRate,
          amount: payload.amount,
          mrp: payload.mrp,
          
          cycChargesQuantity: payload.cycChargesQuantity,
          companyChargesQuantity: payload.companyChargesQuantity,
          clientPayableCharges: payload.clientPayableCharges,
          
          packStyle: payload.packStyle,
          packType: payload.packType,
          formType: payload.formType,
          numberOfShippers: payload.numberOfShippers,
          productType: payload.productType,

          createdBy: payload.createdBy,
          status: "Draft",

          lineItems: {
            createMany: {
              data: (payload.lineItems || []).map(item => ({
                itemNo: item.itemNo,
                brandName: item.brandName,
                composition: item.composition,
                compositionId: item.compositionId,
                orderType: item.orderType,
                packing: item.packing,
                section: item.section,
                qty: item.qty,
                mrp: item.mrp,
                rate: item.rate,
                amount: item.amount,
                gst: item.gst,
              })),
            },
          },
        },
        include: {
          customer: true,
          compositionMaster: true,
          lineItems: true,
          preparedBy: { select: { id: true, name: true, email: true } },
          checkedBy: { select: { id: true, name: true, email: true } },
          accountant: { select: { id: true, name: true, email: true } },
          designer: { select: { id: true, name: true, email: true } },
          authorisedBy: { select: { id: true, name: true, email: true } },
        },
      });

      await this.invalidatePICache();
      return pi;
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      "Failed to create Proforma Invoice",
      ERROR_CODES.INTERNAL_SERVER_ERROR
    );
  }
}

  /**
   * Add/Update line items
   */
  static async addLineItems(piId: string, lineItems: LineItemPayload[]) {
    try {
      const pi = await this.getPIById(piId);

      if (pi.status !== "Draft") {
        throw new AppError("Only draft PIs can be updated", ERROR_CODES.VALIDATION_ERROR);
      }

      // Delete existing line items
      await prisma.proformaInvoiceLineItem.deleteMany({
        where: { piId },
      });

      // Create new line items
      await prisma.proformaInvoiceLineItem.createMany({
        data: lineItems.map(item => ({
          piId,
          itemNo: item.itemNo,
          brandName: item.brandName,
          composition: item.composition,
          compositionId: item.compositionId,
          orderType: item.orderType,
          packing: item.packing,
          section: item.section,
          qty: item.qty,
          mrp: item.mrp,
          rate: item.rate,
          amount: item.amount,
          gst: item.gst,
        })),
      });

      const updated = await this.getPIById(piId);
      await this.invalidatePICache();
      return updated;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to add line items", ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }


  /**
   * Get PI details with full information
   */
  static async getPIById(piId: string) {
    try {
      const pi = await prisma.proformaInvoice.findUnique({
        where: { id: piId },
        include: {
          customer: true,
          compositionMaster: true,
          lineItems: { orderBy: { itemNo: "asc" } },
          preparedBy: { select: { id: true, name: true, email: true, department: true } },
          checkedBy: { select: { id: true, name: true, email: true, department: true } },
          accountant: { select: { id: true, name: true, email: true, department: true } },
          designer: { select: { id: true, name: true, email: true, department: true } },
          authorisedBy: { select: { id: true, name: true, email: true, department: true } },
        },
      });

      if (!pi) {
        throw new AppError("Proforma Invoice not found", ERROR_CODES.NOT_FOUND);
      }

      return pi;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to fetch Proforma Invoice", ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * List all PIs with filters and pagination
   */
  static async listPIs(filters: any, page: number = 1, limit: number = 10, createdByEmployeeId?: string) {
    try {
      const skip = (page - 1) * limit;

      const where: any = {};

      if (createdByEmployeeId) where.createdBy = createdByEmployeeId;
      if (filters.customerId) where.customerId = filters.customerId;
      if (filters.status) where.status = filters.status;
      if (filters.verificationStatus) where.verificationStatus = filters.verificationStatus;
      if (filters.searchTerm) {
        where.OR = [
          { piNo: { contains: filters.searchTerm, mode: "insensitive" } },
          { partyName: { contains: filters.searchTerm, mode: "insensitive" } },
          { customer: { customerName: { contains: filters.searchTerm, mode: "insensitive" } } },
        ];
      }

      const [pis, total] = await Promise.all([
        prisma.proformaInvoice.findMany({
          where,
          include: {
            customer: true,
            compositionMaster: true,
            lineItems: { orderBy: { itemNo: "asc" } },
          },
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
        }),
        prisma.proformaInvoice.count({ where }),
      ]);

      return {
        data: pis,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new AppError("Failed to fetch Proforma Invoices", ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Send PI to customer
   */
  static async sendPI(piId: string, sentBy: string) {
    try {
      const pi = await this.getPIById(piId);

      if (pi.status !== "Draft") {
        throw new AppError("Only draft PIs can be sent", ERROR_CODES.VALIDATION_ERROR);
      }

      const updated = await prisma.proformaInvoice.update({
        where: { id: piId },
        data: {
          status: "Sent",
          updatedAt: new Date(),
        },
        include: {
          customer: true,
          lineItems: { orderBy: { itemNo: "asc" } },
        },
      });

      await this.invalidatePICache();
      return updated;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to send Proforma Invoice", ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Verify PI (Sales approval)
   */
  static async verifyPI(piId: string, verifiedBy: string) {
    try {
      const pi = await this.getPIById(piId);

      if (!["Draft", "Sent"].includes(pi.status)) {
        throw new AppError("PI cannot be verified in current status", ERROR_CODES.VALIDATION_ERROR);
      }

      const updated = await prisma.proformaInvoice.update({
        where: { id: piId },
        data: {
          status: "Verified",
          verificationStatus: "Verified",
          verifiedBy,
          verifiedAt: new Date(),
          rejectionReason: null,
          updatedAt: new Date(),
        },
        include: {
          customer: true,
          lineItems: { orderBy: { itemNo: "asc" } },
        },
      });

      await this.invalidatePICache();
      return updated;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to verify Proforma Invoice", ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Reject PI with reason
   */
  static async rejectPI(piId: string, rejectionReason: string, rejectedBy: string) {
    try {
      const pi = await this.getPIById(piId);

      if (!["Draft", "Sent", "Verified"].includes(pi.status)) {
        throw new AppError("PI cannot be rejected in current status", ERROR_CODES.VALIDATION_ERROR);
      }

      const updated = await prisma.proformaInvoice.update({
        where: { id: piId },
        data: {
          status: "Rejected",
          verificationStatus: "Rejected",
          rejectionReason,
          verifiedBy: rejectedBy,
          verifiedAt: new Date(),
          updatedAt: new Date(),
        },
        include: {
          customer: true,
          lineItems: { orderBy: { itemNo: "asc" } },
        },
      });

      await this.invalidatePICache();
      return updated;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to reject Proforma Invoice", ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Convert PI to PO (even if not verified, and update verified status)
   */
static async convertToPO(
  piId: string,
  convertedBy: string
) {
  try {
    return await prisma.$transaction(async (tx) => {
      const pi = await this.getPIById(piId);

      // 1️⃣ Generate PO Number → ALP/YEAR/SEQUENCE (matching frontend format)
      const year = new Date().getFullYear();

      const lastPO = await prisma.purchaseOrder.findFirst({
        where: {
          poNo: {
            startsWith: `ALP/${year}/`,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          poNo: true,
        },
      });

      let count = 1;
      if (lastPO?.poNo) {
        const lastCount = parseInt(lastPO.poNo.split("/").pop() || "0", 10);
        count = lastCount + 1;
      }

      const poNo = `ALP/${year}/${String(count).padStart(4, "0")}`;

      // 2️⃣ Calculate batchQty (quantity * packStyle)
      let batchQty: string | undefined;
      if (pi.piQty && pi.packStyle) {
        const qty = parseFloat(pi.piQty) || 0;
        const packStyle = parseFloat(pi.packStyle) || 0;
        batchQty = (qty * packStyle).toString();
      }

      // 2️⃣ Create PO
      const purchaseOrder = await tx.purchaseOrder.create({
        data: {
          poNo,
          poDate: new Date(),
          customerId: pi.customerId,
          gstNo: pi.gstNo,
          brandName: pi.brandName,
          partyName: pi.partyName,
          composition: pi.composition,
          compositionId: pi.compositionId,
          poQty: pi.piQty,
          poRate: pi.piRate,
          amount: pi.amount,
          mrp: pi.mrp,
          paymentTerms: pi.paymentTerms,
          address: pi.address,
          notes: pi.notes,
          cycChargesQuantity: pi.cycChargesQuantity,
          companyChargesQuantity: pi.companyChargesQuantity,
          clientPayableCharges: pi.clientPayableCharges,
          assignedToEmployeeId: convertedBy,

          // Store packStyle in aluAluBlisterStripBottle column
          aluAluBlisterStripBottle: pi.packType,
          
          // Store packType in tabletCapsuleDrySyrupBottle column
          tabletCapsuleDrySyrupBottle: pi.formType,
          packStyle: pi.packStyle, // Store packStyle in a separate column for easier access
          
          // Map new fields
          noOfShippers: pi.numberOfShippers,
          productNewOld: pi.productType,
          
          // Store calculated batchQty
          batchQty: batchQty,

          overallStatus: "Pending",
          showStatus: "Order Pending",
          mdApproval: "Pending",
          accountsApproval: "Pending",
          designerApproval: "Pending",
          ppicApproval: "Pending",
        },
      });

      // 3️⃣ Update PI
      const updatedPI = await tx.proformaInvoice.update({
        where: { id: piId },
        data: {
          status: "Converted",
          verificationStatus: "Verified",
          verifiedBy: convertedBy,
          verifiedAt: new Date(),
          convertedToPOId: purchaseOrder.id,
          convertedAt: new Date(),
          convertedBy,
          updatedAt: new Date(),
        },
        include: {
          customer: true,
          compositionMaster: true,
        },
      });

      await this.invalidatePICache();

      return {
        proformaInvoice: updatedPI,
        purchaseOrder,
      };
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      "Failed to convert PI to PO",
      ERROR_CODES.INTERNAL_SERVER_ERROR
    );
  }
}
  /**
   * Update PI details
   */
  static async updatePI(piId: string, updateData: Partial<CreatePIPayload>) {
    try {
      const pi = await this.getPIById(piId);

      if (pi.status !== "Draft") {
        throw new AppError("Only draft PIs can be updated", ERROR_CODES.VALIDATION_ERROR);
      }

      // Exclude lineItems from updateData as they're handled separately
      const { lineItems, createdBy, ...data } = updateData;

      const updated = await prisma.proformaInvoice.update({
        where: { id: piId },
        data: {
          ...data,
          updatedAt: new Date(),
        },
        include: {
          customer: true,
          compositionMaster: true,
          lineItems: { orderBy: { itemNo: "asc" } },
        },
      });

      await this.invalidatePICache();
      return updated;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to update Proforma Invoice", ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Delete PI (only draft PIs can be deleted)
   */
  static async deletePI(piId: string) {
    try {
      const pi = await this.getPIById(piId);

      if (pi.status !== "Draft") {
        throw new AppError("Only draft PIs can be deleted", ERROR_CODES.VALIDATION_ERROR);
      }

      await prisma.proformaInvoice.delete({
        where: { id: piId },
      });

      await this.invalidatePICache();

      return { success: true, message: "Proforma Invoice deleted successfully" };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to delete Proforma Invoice", ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Get PI statistics
   */
  static async getPIStatistics(customerId?: string) {
    try {
      const where: any = {};
      if (customerId) where.customerId = customerId;

      const [draft, sent, verified, rejected, converted] = await Promise.all([
        prisma.proformaInvoice.count({ where: { ...where, status: "Draft" } }),
        prisma.proformaInvoice.count({ where: { ...where, status: "Sent" } }),
        prisma.proformaInvoice.count({ where: { ...where, status: "Verified" } }),
        prisma.proformaInvoice.count({ where: { ...where, status: "Rejected" } }),
        prisma.proformaInvoice.count({ where: { ...where, status: "Converted" } }),
      ]);

      return {
        draft,
        sent,
        verified,
        rejected,
        converted,
        total: draft + sent + verified + rejected + converted,
      };
    } catch (error) {
      throw new AppError("Failed to fetch PI statistics", ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Add approvals to PI
   */
  static async addApprovals(
    piId: string,
    approvals: {
      preparedByEmployeeId?: string;
      checkedByEmployeeId?: string;
      accountantEmployeeId?: string;
      designerEmployeeId?: string;
      authorisedByEmployeeId?: string;
    }
  ) {
    try {
      const updated = await prisma.proformaInvoice.update({
        where: { id: piId },
        data: {
          ...approvals,
          updatedAt: new Date(),
        },
        include: {
          customer: true,
          lineItems: { orderBy: { itemNo: "asc" } },
          preparedBy: { select: { id: true, name: true, email: true } },
          checkedBy: { select: { id: true, name: true, email: true } },
          accountant: { select: { id: true, name: true, email: true } },
          designer: { select: { id: true, name: true, email: true } },
          authorisedBy: { select: { id: true, name: true, email: true } },
        },
      });

      await this.invalidatePICache();
      return updated;
    } catch (error) {
      throw new AppError("Failed to add approvals", ERROR_CODES.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Invalidate PI-related cache
   */
  private static async invalidatePICache() {
    try {
      if (!redis) {
        return;
      }
      // Use Redis SCAN with timeout to avoid blocking operations on Lambda
      // For faster operations, skip pattern deletion and rely on key expiration
      // This prevents EPIPE errors from long-running keys() operations
      console.log("🗑️ Cache invalidation skipped (relying on key expiration)");
      return;
    } catch (error) {
      console.error("Cache invalidation error:", error);
    }
  }
}

export default ProformaInvoiceService;
