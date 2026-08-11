// Creates the first admin account so the API can be used before any UI exists.
// Usage: node scripts/seedAdminScript.js "Name" admin@example.com StrongPass123
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const connectDb = require("../config/db");
const User = require("../models/userModel");

const run = async () => {
  const [name, email, password] = process.argv.slice(2);
  if (!name || !email || !password) {
    console.error(
      'Usage: node scripts/seedAdminScript.js "Name" email@example.com password'
    );
    process.exit(1);
  }

  await connectDb();

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    console.log(`User already exists: ${existing.email} (${existing.role})`);
    await mongoose.connection.close();
    process.exit(0);
  }

  const user = await User.create({
    name,
    email: email.toLowerCase(),
    passwordHash: await bcrypt.hash(password, 10),
    role: "admin",
  });

  console.log(`Admin created: ${user.email}`);
  await mongoose.connection.close();
  process.exit(0);
};

run().catch(async (error) => {
  console.error("Seed Admin Error:", error.message);
  await mongoose.connection.close().catch(() => {});
  process.exit(1);
});
