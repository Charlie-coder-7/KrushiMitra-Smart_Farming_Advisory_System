import path from "node:path";
import { mkdir } from "node:fs/promises";
import { createApp } from "./app.js";

const dataDir = path.resolve(process.env.DATA_DIR || "./data");
await mkdir(dataDir, { recursive: true });
const { app, db } = createApp({
  databasePath:
    process.env.DATABASE_PATH || path.join(dataDir, "krushi.sqlite"),
  uploadDir: process.env.UPLOAD_DIR || path.join(dataDir, "uploads"),
  webDir: process.env.WEB_DIR || path.resolve("./dist"),
});
const port = Number(process.env.PORT || 8080);
const server = app.listen(port, "0.0.0.0", () =>
  console.log(`Krushi Mitra listening on http://localhost:${port}`),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () =>
    server.close(() => {
      db.close();
      process.exit(0);
    }),
  );
