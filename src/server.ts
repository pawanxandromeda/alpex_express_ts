import app from "./app";
import prisma from "./config/postgres";

const PORT = Number(process.env.PORT) || 5000;

async function startServer() {
  try {
    // Check DB connection
    await prisma.$queryRaw`SELECT 1`;
    console.log("✅ Database connected successfully!");

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Database connection failed:", err);
    process.exit(1);
  }
}

startServer();
