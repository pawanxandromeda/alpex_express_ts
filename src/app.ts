import express, { Application, Request, Response } from "express";
import helmet from "helmet";

/* ROUTES */
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

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// 🔥 Let API Gateway handle CORS, just allow OPTIONS to pass
// Let API Gateway handle CORS, just allow OPTIONS to pass
app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", (req.headers.origin as string) || "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type,Authorization,X-Requested-With,Access-Control-Request-Method,Access-Control-Request-Headers"
    );
    res.setHeader("Access-Control-Allow-Credentials", "true");
    return res.sendStatus(204);
  }
  next();
});

/* ROUTES */
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

app.get("/health", (_req, res) => res.status(200).json({ status: "OK" }));

app.use((_req, res) => res.status(404).json({ message: "Route not found" }));

export default app;
