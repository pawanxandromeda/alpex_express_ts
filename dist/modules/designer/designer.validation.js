"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.designActionSchema = void 0;
const zod_1 = require("zod");
exports.designActionSchema = zod_1.z.object({
    action: zod_1.z.enum(["approve", "reject"]),
    comments: zod_1.z.string().optional(),
});
