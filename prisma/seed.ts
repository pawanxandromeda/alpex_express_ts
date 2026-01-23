import "dotenv/config";
import bcrypt from "bcryptjs";
import prisma from "../src/config/postgres"; 

async function main() {
  const passwordHash = await bcrypt.hash("admin@123", 10);

  const admin = await prisma.employee.upsert({
    where: { username: "admin@alpex.com" },
    update: {},
    create: {
      username: "admin@alpex.com",
      password: passwordHash,
      authorization: "admin",
      status: "Active",
      name: "Pawan Sharma",
      designation: "Software Engineer",
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
