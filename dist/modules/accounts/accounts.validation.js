"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBillSchema = void 0;
const zod_1 = require("zod");
exports.createBillSchema = zod_1.z.object({
    billDate: zod_1.z.string().optional(),
    billNo: zod_1.z.string().optional(),
    partyName: zod_1.z.string().optional(),
    billAmt: zod_1.z.number().optional(),
    receivedAmount: zod_1.z.number().optional(),
    balanceAmount: zod_1.z.number().optional(),
    dueDate: zod_1.z.string().optional(),
    pdcAmount: zod_1.z.number().optional(),
    pdcDate: zod_1.z.string().optional(),
    chqNo: zod_1.z.string().optional(),
    pdcReceiveDate: zod_1.z.string().optional(),
    dueDays: zod_1.z.number().optional(),
    marketingPersonnelName: zod_1.z.string().optional(),
    accountsComments: zod_1.z.string().optional(),
    chequesExpected: zod_1.z.boolean().optional(),
    remarks: zod_1.z.string().optional(),
    salesComments: zod_1.z.string().optional(),
    purchaseOrderId: zod_1.z.string(),
});
