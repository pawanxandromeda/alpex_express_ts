import dotenv from "dotenv";
dotenv.config();
import express, { Application } from "express";
import cors, { CorsOptions } from "cors";

import helmet from "helmet";
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
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);


app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const allowedOrigins: string[] = [
  "http://localhost:8080",
  "https://alpex-dashboard.vercel.app",
];


const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE","PATCH", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
  ],
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

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




export default app;
