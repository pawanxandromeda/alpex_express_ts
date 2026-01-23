"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = __importDefault(require("pg"));
const { Pool } = pg_1.default;
const pool = new Pool({
    host: "localhost",
    port: 5432,
    user: "pawan",
    password: "pawan",
    database: "alpex_pharma",
});
const adapter = new adapter_pg_1.PrismaPg(pool);
const prisma = new client_1.PrismaClient({
    adapter,
    log: ["info", "warn", "error"],
});
exports.default = prisma;
