import dotenv from "dotenv";
dotenv.config();

import express, { Application } from "express";
import cors from "cors";
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
import masterRoutes from "./modules/master/master.routes";
import ppicfilterRoutes from "./modules/ppic/ppic-advanced-filter.routes";

const app: Application = express();

/* -------------------- SECURITY -------------------- */
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

/* -------------------- BODY PARSERS -------------------- */
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

/* -------------------- CORS -------------------- */
const allowedOrigins = [
  "https://www.thealpex.com",
  "http://localhost:3000",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server & tools like Postman
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("CORS not allowed"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
    ],
  })
);

// VERY IMPORTANT for preflight
app.options("*", cors());

/* -------------------- ROUTES -------------------- */
app.use("/api/employees", employeeRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/todos", todosRoutes);
app.use("/api/po", purchaseOrderRoutes);
app.use("/api/designer", designerRoutes);
app.use("/api/accounts", accountsRoutes);
app.use("/api/ppic", ppicRoutes);
app.use("/api/master", masterRoutes);
app.use("/api/ppicfilter", ppicfilterRoutes);

/* -------------------- HEALTH CHECK -------------------- */
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "OK" });
});

export default app;
