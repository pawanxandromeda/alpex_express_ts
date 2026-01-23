import app from "./app";
import prisma from "./config/postgres";


const PORT = process.env.PORT || 5000;



async function startServer() {
  try {
    // Check DB connection
    await prisma.$queryRaw`SELECT 1`;
    console.log("✅ Database connected successfully!");

    // Start server only if DB is connected
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Database connection failed:", err);
    process.exit(1); // Exit if DB not connected
  }
}

startServer();
