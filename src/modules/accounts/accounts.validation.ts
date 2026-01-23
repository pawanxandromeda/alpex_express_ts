import { z } from "zod";

export const createBillSchema = z.object({
  billDate: z.string().optional(),
  billNo: z.string().optional(),
  partyName: z.string().optional(),
  billAmt: z.number().optional(),
  receivedAmount: z.number().optional(),
  balanceAmount: z.number().optional(),
  dueDate: z.string().optional(),
  pdcAmount: z.number().optional(),
  pdcDate: z.string().optional(),
  chqNo: z.string().optional(),
  pdcReceiveDate: z.string().optional(),
  dueDays: z.number().optional(),
  marketingPersonnelName: z.string().optional(),
  accountsComments: z.string().optional(),
  chequesExpected: z.boolean().optional(),
  remarks: z.string().optional(),
  salesComments: z.string().optional(),
  purchaseOrderId: z.string(),
});
