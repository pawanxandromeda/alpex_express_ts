import "dotenv/config";
import prisma from "../src/config/postgres";

async function main() {
  const result = await prisma.purchaseOrder.deleteMany({});

  console.log(`🗑️ Deleted ${result.count} customers`);
}

main()
  .catch((err) => {
    console.error("❌ Error deleting customers:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
