"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPOSchema = void 0;
const zod_1 = require("zod");
exports.createPOSchema = zod_1.z.object({
    poNo: zod_1.z.string(),
    gstNo: zod_1.z.string(),
    poDate: zod_1.z.date().optional(),
    overallStatus: zod_1.z.string().optional(),
});
