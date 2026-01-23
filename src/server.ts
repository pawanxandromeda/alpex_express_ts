import app from "./app";
import prisma from "./config/postgres";

const PORT = process.env.PORT ? Number(process.env.PORT) : 5000;

// 🚀 Start server immediately
app.listen(PORT, "0.0.0.0", async () => {
  console.log(`🚀 Server listening on port ${PORT}`);

  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("✅ Database connected successfully!");
  } catch (err) {
    console.error("❌ Database connection failed:", err);
    // Do NOT exit — Railway already attached DNS
  }
});
