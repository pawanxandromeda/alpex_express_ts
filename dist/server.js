"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const postgres_1 = __importDefault(require("./config/postgres"));
const PORT = process.env.PORT || 5000;
async function startServer() {
    try {
        // Check DB connection
        await postgres_1.default.$queryRaw `SELECT 1`;
        console.log("✅ Database connected successfully!");
        // Start server only if DB is connected
        app_1.default.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });
    }
    catch (err) {
        console.error("❌ Database connection failed:", err);
        process.exit(1); // Exit if DB not connected
    }
}
startServer();
