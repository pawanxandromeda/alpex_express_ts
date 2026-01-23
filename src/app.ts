import dotenv from "dotenv";
dotenv.config();

import express, { Application, Request, Response, NextFunction } from "express";
import cors, { CorsOptions } from "cors";
import helmet from "helmet";

// Routes
import employeeRoutes from "./modules/employee/employee.routes";
import authRoutes from "./modules/auth/auth.routes";
import customerRoutes from "./modules/customer/customer.routes";
import todosRoutes from "./modules/todo/todo.routes";
import purchaseOrderRoutes from "./modules/purchaseOrder/purchaseOrder.routes";
import designerRoutes from "./modules/designer/designer.routes";
import accountsRoutes from "./modules/accounts/accounts.routes";
import ppicRoutes from "./modules/ppic/ppic.routes";

const app: Application = express();

/* =========================
   CORS CONFIG (VERY IMPORTANT)
   ========================= */

const allowedOrigins = [
  "https://alpex-dashboard.vercel.app",
  "http://localhost:5173",
];

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow server-to-server, Railway health checks, Postman
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // ❌ DO NOT throw error (breaks browser)
    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
  ],
};

// CORS MUST be first
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

/* =========================
   SECURITY & BODY PARSING
   ========================= */

app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

/* =========================
   HEALTH CHECK (REQUIRED)
   ========================= */

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

/* =========================
   API ROUTES
   ========================= */

app.use("/api/employees", employeeRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/todos", todosRoutes);
app.use("/api/po", purchaseOrderRoutes);
app.use("/api/designer", designerRoutes);
app.use("/api/accounts", accountsRoutes);
app.use("/api/ppic", ppicRoutes);

/* =========================
   GLOBAL ERROR HANDLER
   ========================= */

app.use(
  (err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error("🔥 Error:", err);
    res.status(err.status || 500).json({
      success: false,
      message: err.message || "Internal Server Error",
    });
  }
);

export default app;
