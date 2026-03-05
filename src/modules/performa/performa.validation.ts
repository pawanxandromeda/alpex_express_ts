import { z } from "zod";

export const createPIValidation = z.object({
  body: z.object({
    customerId: z.string().nonempty("Customer ID is required"),
    brandName: z.string().optional(),
    partyName: z.string().optional(),
    gstNo: z.string().optional(),
    composition: z.string().optional(),
    compositionId: z.string().optional(),
    piQty: z.string().optional(),
    piRate: z.string().optional(),
    amount: z.string().optional(),
    mrp: z.string().optional(),
    paymentTerms: z.string().optional(),
    deliveryTerms: z.string().optional(),
    address: z.string().optional(),
    notes: z.string().optional(),
    cycChargesQuantity: z.string().optional(),
    companyChargesQuantity: z.string().optional(),
    clientPayableCharges: z.string().optional(),
    packStyle: z.string().optional(),
    packType: z.string().optional(),
    formType: z.string().optional(),
  }),
});

const updatePIShape = {
  brandName: z.string().optional(),
  partyName: z.string().optional(),
  gstNo: z.string().optional(),
  composition: z.string().optional(),
  compositionId: z.string().optional(),
  piQty: z.string().optional(),
  piRate: z.string().optional(),
  amount: z.string().optional(),
  mrp: z.string().optional(),
  paymentTerms: z.string().optional(),
  deliveryTerms: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  cycChargesQuantity: z.string().optional(),
  companyChargesQuantity: z.string().optional(),
  clientPayableCharges: z.string().optional(),
  packStyle: z.string().optional(),
  packType: z.string().optional(),
  formType: z.string().optional(),
};

export const updatePIValidation = z.object({
  params: z.object({
    piId: z.string().uuid("Invalid PI ID"),
  }),
  body: z
    .object(updatePIShape)
    .partial()
    .refine((obj) => Object.keys(obj).length > 0, {
      message: "At least one field must be provided for update",
    }),
});

export const convertToPOValidation = z.object({
  params: z.object({
    piId: z.string().uuid("Invalid PI ID"),
  }),
  body: z.object({}).optional(),
});

export const rejectPIValidation = z.object({
  params: z.object({
    piId: z.string().uuid("Invalid PI ID"),
  }),
  body: z.object({
    rejectionReason: z.string().nonempty("Rejection reason is required"),
  }),
});
