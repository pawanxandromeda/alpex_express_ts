import "dotenv/config";
import bcrypt from "bcryptjs";
import prisma from "../src/config/postgres";
import { Status } from "@prisma/client";

async function main() {
  const password = "admin@123";
  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.employee.upsert({
    where: { username: "admin" },
    update: {}, // do nothing if exists
    create: {
      username: "admin",
      password: passwordHash,
      name: "System Admin",
      email: "admin@example.com",    // required
      phone: "9999999999",           // required
      role: "admin",
      department: "admin",
      status: "Active",
      createdByRole: "Superuser",
    },
  });

  console.log("✅ Admin user seeded:", admin.username);
  console.log("ℹ️ Use this password to log in:", password);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
