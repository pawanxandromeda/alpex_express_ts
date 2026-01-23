"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeBoolean = exports.normalizeDate = exports.normalizeNumber = exports.toSafeString = void 0;
const toSafeString = (value) => {
    if (value === null || value === undefined)
        return null;
    if (typeof value === "string")
        return value.trim();
    if (typeof value === "number")
        return String(value);
    if (typeof value === "boolean")
        return value ? "true" : "false";
    if (value instanceof Date)
        return value.toISOString();
    return String(value).trim();
};
exports.toSafeString = toSafeString;
const normalizeNumber = (value) => {
    if (!value)
        return 0;
    const n = Number(String(value).replace(/[^0-9.-]/g, ""));
    return isNaN(n) ? 0 : n;
};
exports.normalizeNumber = normalizeNumber;
const normalizeDate = (value) => {
    if (!value)
        return null;
    if (typeof value === "number") {
        return new Date(Math.round((value - 25569) * 86400 * 1000));
    }
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
};
exports.normalizeDate = normalizeDate;
const normalizeBoolean = (value) => {
    if (!value)
        return false;
    const str = String(value).toLowerCase().trim();
    return ["true", "yes", "1", "approved", "pending"].includes(str);
};
exports.normalizeBoolean = normalizeBoolean;
