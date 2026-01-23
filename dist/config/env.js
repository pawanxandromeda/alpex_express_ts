"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
// env.ts
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
/**
 * Get required environment variable
 */
function required(key) {
    const value = process.env[key];
    if (!value) {
        throw new Error(`❌ Environment variable ${key} is missing`);
    }
    return value;
}
/**
 * Parse number safely
 */
function number(key) {
    const value = required(key);
    const parsed = Number(value);
    if (isNaN(parsed)) {
        throw new Error(`❌ Environment variable ${key} must be a number`);
    }
    return parsed;
}
/**
 * JWT expiresIn parser - Always return string for jsonwebtoken compatibility
 */
function expires(key) {
    const value = required(key);
    // If it's a number string, convert to number (seconds)
    if (!isNaN(Number(value))) {
        return Number(value); // ✅ return number
    }
    // Already a string format like "15m", "1h", "7d"
    return value; // ✅ return string duration
}
exports.env = {
    /** Server */
    port: number("PORT"),
    nodeEnv: process.env.NODE_ENV ?? "development",
    /** Database */
    databaseUrl: required("DATABASE_URL"),
    /** JWT */
    jwtSecret: required("JWT_SECRET"),
    jwtRefreshSecret: required("JWT_REFRESH_SECRET"),
    jwtExpiresIn: expires("JWT_EXPIRES_IN"),
    jwtRefreshExpiresIn: expires("JWT_REFRESH_EXPIRES_IN"),
    /** Optional S3 for design uploads */
    s3Bucket: process.env.S3_BUCKET ?? "",
    awsRegion: process.env.AWS_REGION ?? "",
    awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
    awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
};
