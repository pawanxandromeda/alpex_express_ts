import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pkg from "pg";

const { Pool } = pkg;

const pool = new Pool({
  host: "localhost",
  port: 5432,
  user: "pawan",
  password: "pawan",
  database: "alpex_pharma",
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
  log: ["info", "warn", "error"],
});

export default prisma;
