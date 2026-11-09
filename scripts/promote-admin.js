import { DatabaseSync } from "node:sqlite";
import path from "node:path";

const email = process.argv[2]?.trim().toLowerCase();
if (!email || !email.includes("@")) {
  console.error("Usage: node scripts/promote-admin.js admin@example.com");
  process.exit(2);
}
const dbPath = process.env.DATABASE_PATH || path.resolve("data/krushi.sqlite");
const db = new DatabaseSync(dbPath);
try {
  const farmer = db.prepare("SELECT id,email FROM farmers WHERE email=?").get(email);
  if (!farmer) {
    console.error("No farmer account found for that email. Register it first, then run this command.");
    process.exitCode = 1;
  } else {
    db.prepare("UPDATE farmers SET role='admin',is_active=1 WHERE id=?").run(farmer.id);
    console.log(`Administrator access enabled for ${farmer.email}. Sign out and sign in again to refresh the session.`);
  }
} finally {
  db.close();
}
