// designer.service.ts
import prisma from "../../config/postgres";
import { uploadBufferToS3 } from "../../common/utils/s3";
import { randomUUID } from "crypto";
import {
  createAuditAction,
  addActionToLog,
  getAuditLog,
  trackFieldChanges,
} from "../../common/utils/auditLog";

export const getDesignerList = async (page: number = 1, limit: number = 10) => {
  const skip = (page - 1) * limit;

  // const whereCondition = {
  //   mdApproval: "Approved",
  //   accountsApproval: "Approved",
  // };

  const [data, total] = await Promise.all([
    prisma.purchaseOrder.findMany({
      skip,
      take: limit,
      // where: whereCondition,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        poNo: true,
        poDate: true,
        brandName: true,
        partyName: true,
        orderThrough: true,
        composition: true,
        section: true,
        tabletCapsuleDrySyrupBottle: true,
        roundOvalTablet: true,
        tabletColour: true,
        aluAluBlisterStripBottle: true,
        packStyle: true,
        productNewOld: true,
        batchQty: true,
        pvcColourBase: true,
        foilSize: true,
        design: true,
        designerApproval: true,
        createdAt: true,
      },
    }),

    prisma.purchaseOrder.count({
      // where: whereCondition,
    }),
  ]);

  return { data, total, page, limit };
};

export const updateDesignSpecs = async (
  poId: string,
  data: any,
  employeeId: string
) => {
  // 1️⃣ Validate designer
  const emp = await prisma.employee.findUnique({
    where: { id: employeeId },
  });

  if (!emp || emp.department.toLowerCase() !== "design") {
    throw new Error("Only designer can update specs");
  }

  // 2️⃣ Fetch existing PO & actions
  const poRecord: any = await prisma.purchaseOrder.findUnique({
    where: { id: poId },
    select: {
      designerActions: true,
      timestamp: true,
      tabletCapsuleDrySyrupBottle: true,
      roundOvalTablet: true,
      tabletColour: true,
      aluAluBlisterStripBottle: true,
      packStyle: true,
      productNewOld: true,
      batchQty: true,
      pvcColourBase: true,
      foilSize: true,
    },
  });

  if (!poRecord) {
    throw new Error("Purchase Order not found");
  }

  const existingActions = Array.isArray(poRecord.designerActions)
    ? poRecord.designerActions
    : [];

  // 3️⃣ Create action with remarks
  const newAction = {
    id: randomUUID(),
    employeeId,
    employeeName: emp.name,
    action: "Specs Updated",
    remarks: data.remarks ?? null, // ✅ DESIGNER REMARKS
    createdAt: new Date().toISOString(),
  };

  // 4️⃣ Track changes for audit log
  const trackableFields = {
    tabletCapsuleDrySyrupBottle: poRecord.tabletCapsuleDrySyrupBottle,
    roundOvalTablet: poRecord.roundOvalTablet,
    tabletColour: poRecord.tabletColour,
    aluAluBlisterStripBottle: poRecord.aluAluBlisterStripBottle,
    packStyle: poRecord.packStyle,
    productNewOld: poRecord.productNewOld,
    batchQty: poRecord.batchQty,
    pvcColourBase: poRecord.pvcColourBase,
    foilSize: poRecord.foilSize,
  };

  const changes = trackFieldChanges(trackableFields, data);

  // Get existing audit log
  const auditLog = getAuditLog(poRecord.timestamp);

  // Create audit action for design update
  const designUpdateAction = createAuditAction({
    actionType: "DESIGN_SPECS_UPDATE",
    performedBy: {
      employeeId,
      name: emp.name,
      department: emp.department,
    },
    description: `Design specifications updated - ${Object.keys(changes).length} spec(s) changed`,
    changes: Object.keys(changes).length > 0 ? changes : undefined,
    remarks: data.remarks,
  });

  // Add action to audit log
  const updatedLog = addActionToLog(auditLog, designUpdateAction);

  // 5️⃣ Remove remarks from main update payload
  const { remarks, ...specsData } = data;

  // 6️⃣ Update PO
  const updated = await prisma.purchaseOrder.update({
    where: { id: poId },
    data: {
      // 🔹 Allowed design spec fields
      tabletCapsuleDrySyrupBottle: specsData.tabletCapsuleDrySyrupBottle,
      roundOvalTablet: specsData.roundOvalTablet,
      tabletColour: specsData.tabletColour,
      aluAluBlisterStripBottle: specsData.aluAluBlisterStripBottle,
      packStyle: specsData.packStyle,
      productNewOld: specsData.productNewOld,
      batchQty: specsData.batchQty,
      pvcColourBase: specsData.pvcColourBase,
      foilSize: specsData.foilSize,

      // 🔹 Reset approval
      designerApproval: "Pending",

      // 🔹 Append action log
      designerActions: [...existingActions, newAction],

      // 🔹 Add to audit timestamp
      timestamp: JSON.stringify(updatedLog),
    },
  });

  return updated;
};

export const uploadDesign = async (
  poId: string,
  buffer: Buffer,
  originalName: string,
  mimeType: string,
  employeeId: string
) => {
  const emp = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!emp) throw new Error("Employee not found");

  if (emp.department.toLowerCase() !== "designer") {
    throw new Error("Only designer can upload design");
  }

  const key = `designs/${poId}/${Date.now()}-${originalName.replace(/\s+/g, "_")}`;
  const url = await uploadBufferToS3(buffer, key, mimeType);

  // append action to PO designerActions
  const poRecord: any = await prisma.purchaseOrder.findUnique({
    where: { id: poId },
    select: { designerActions: true, design: true, timestamp: true },
  });
  const actions = Array.isArray(poRecord?.designerActions) ? poRecord.designerActions : [];

  const newAction = {
    id: randomUUID(),
    employeeId,
    action: "Design Uploaded",
    comments: null,
    createdAt: new Date().toISOString(),
  };

  // Get existing audit log
  const auditLog = getAuditLog(poRecord?.timestamp);

  // Create audit action for design upload
  const designUploadAction = createAuditAction({
    actionType: "DESIGN_UPLOAD",
    performedBy: {
      employeeId,
      name: emp.name,
      department: emp.department,
    },
    description: `Design file uploaded - ${originalName}`,
    changes: {
      design: {
        oldValue: poRecord?.design || null,
        newValue: url,
      },
    },
  });

  // Add action to audit log
  const updatedLog = addActionToLog(auditLog, designUploadAction);

  const updatedPO = await prisma.purchaseOrder.update({
    where: { id: poId },
    data: {
      design: url,
      designerApproval: "Pending",
      designerActions: [...actions, newAction],
      timestamp: JSON.stringify(updatedLog),
    } as any,
  });

  return updatedPO;
};

export const actionOnDesign = async (
  poId: string,
  action: string,
  comments: string | undefined,
  employeeId: string
) => {
  const emp = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!emp) throw new Error("Employee not found");
  if ((emp.department || "").toLowerCase() !== "design")
    throw new Error("Only designer department members can approve or reject designs");

  if (!["approve", "reject"].includes(action)) throw new Error("Invalid action");

  const dbAction = action === "approve" ? "Approved" : "Rejected";

  // append approval/rejection action
  const poRecord: any = await prisma.purchaseOrder.findUnique({
    where: { id: poId },
    select: { designerActions: true, designerApproval: true, timestamp: true },
  });
  const actions = Array.isArray(poRecord?.designerActions) ? poRecord.designerActions : [];

  const newAction = {
    id: randomUUID(),
    employeeId,
    action: dbAction,
    comments: comments || null,
    createdAt: new Date().toISOString(),
  };

  // Get existing audit log
  const auditLog = getAuditLog(poRecord?.timestamp);

  // Create audit action for design approval/rejection
  const designActionAudit = createAuditAction({
    actionType: `DESIGN_${dbAction.toUpperCase()}`,
    performedBy: {
      employeeId,
      name: emp.name,
      department: emp.department,
    },
    description: `Design ${dbAction.toLowerCase()} by designer`,
    remarks: comments,
    approvalStatus: {
      designerApproval: dbAction,
    },
  });

  // Add action to audit log
  const updatedLog = addActionToLog(auditLog, designActionAudit);

  const updated = await prisma.purchaseOrder.update({
    where: { id: poId },
    data: {
      designerApproval: dbAction,
      designerActions: [...actions, newAction],
      timestamp: JSON.stringify(updatedLog),
    } as any,
  });

  return updated;
};