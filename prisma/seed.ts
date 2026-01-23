import "dotenv/config";
import bcrypt from "bcryptjs";
import prisma from "../src/config/postgres"; 

async function main() {
  const passwordHash = await bcrypt.hash("admin@123", 10);

  const admin = await prisma.employee.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      password: passwordHash,
      authorization: "admin",
      status: "Active",
      name: "Admin",
      designation: "Admin",
      department: "admin",
      shiftType: "Day",
      employmentHistory: ["Initial system admin"],
    },
  });

  console.log("✅ Admin user seeded:", admin.username);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
