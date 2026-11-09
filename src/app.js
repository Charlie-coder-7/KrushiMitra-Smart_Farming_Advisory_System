import express from "express";
import multer from "multer";
import { DatabaseSync } from "node:sqlite";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { randomUUID, randomBytes } from "node:crypto";
import { createHash, timingSafeEqual } from "node:crypto";
import { fileURLToPath } from "node:url";
import {
  hashPassword,
  newSessionToken,
  tokenDigest,
  verifyPassword,
} from "./security.js";
import { cleanLocation, validateDiagnosis } from "./validation.js";
import {
  getGeminiAdvisory,
  getWeather,
  reverseGeocode,
  translateAssessmentText,
} from "./advisory.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const imageExt = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
};
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
});
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function initializeDatabase(db) {
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS farmers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'farmer',
      is_active INTEGER NOT NULL DEFAULT 1,
      phone TEXT,
      district TEXT,
      block TEXT,
      village TEXT,
      latitude REAL,
      longitude REAL,
      soil_ph REAL,
      soil_n REAL,
      soil_p REAL,
      soil_k REAL,
      soil_organic_carbon REAL,
      farm_size_acres REAL,
      soil_type TEXT,
      irrigation_source TEXT,
      farming_experience_years INTEGER,
      language TEXT NOT NULL DEFAULT 'en',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      farmer_id INTEGER NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS auth_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      farmer_id INTEGER,
      email TEXT NOT NULL,
      event TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS password_reset_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL COLLATE NOCASE,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      resolved_at TEXT
    );
    CREATE INDEX IF NOT EXISTS auth_events_created ON auth_events(created_at DESC);
    CREATE TABLE IF NOT EXISTS diagnoses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      farmer_id INTEGER NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
      crop TEXT NOT NULL,
      growth_stage TEXT,
      district TEXT,
      block TEXT,
      village TEXT,
      latitude REAL,
      longitude REAL,
      image_key TEXT NOT NULL,
      probable_issue TEXT NOT NULL,
      causes TEXT,
      active_ingredients TEXT,
      organic_alternatives TEXT,
      prevention TEXT,
      irrigation TEXT,
      timing TEXT,
      weather TEXT,
      soil TEXT,
      provider TEXT NOT NULL,
      language TEXT NOT NULL DEFAULT 'en',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS diagnoses_farmer_created ON diagnoses(farmer_id, created_at DESC);
  `);
  for (const [table, column, type] of [
    ["farmers", "role", "TEXT NOT NULL DEFAULT 'farmer'"],
    ["farmers", "is_active", "INTEGER NOT NULL DEFAULT 1"],
    ["farmers", "latitude", "REAL"],
    ["farmers", "longitude", "REAL"],
    ["farmers", "soil_ph", "REAL"],
    ["farmers", "soil_n", "REAL"],
    ["farmers", "soil_p", "REAL"],
    ["farmers", "soil_k", "REAL"],
    ["farmers", "soil_organic_carbon", "REAL"],
    ["farmers", "farm_size_acres", "REAL"],
    ["farmers", "soil_type", "TEXT"],
    ["farmers", "irrigation_source", "TEXT"],
    ["farmers", "farming_experience_years", "INTEGER"],
    ["diagnoses", "latitude", "REAL"],
    ["diagnoses", "longitude", "REAL"],
    ["diagnoses", "language", "TEXT NOT NULL DEFAULT 'en'"],
  ]) {
    const columns = db.prepare(`PRAGMA table_info(${table})`).all();
    if (!columns.some((item) => item.name === column))
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  }
  for (const row of db
    .prepare(
      "SELECT id,probable_issue,causes,active_ingredients,organic_alternatives,prevention,irrigation,timing,weather,soil FROM diagnoses WHERE language='en'",
    )
    .all()) {
    if (
      Object.values(row).some(
        (value) => typeof value === "string" && /[\u0B00-\u0B7F]/.test(value),
      )
    )
      db.prepare("UPDATE diagnoses SET language='or' WHERE id=?").run(row.id);
  }
}

function publicFarmer(farmer) {
  return {
    id: farmer.id,
    name: farmer.name,
    email: farmer.email,
    phone: farmer.phone,
    district: farmer.district,
    block: farmer.block,
    village: farmer.village,
    latitude: farmer.latitude,
    longitude: farmer.longitude,
    soilPh: farmer.soil_ph,
    soilNitrogen: farmer.soil_n,
    soilPhosphorus: farmer.soil_p,
    soilPotassium: farmer.soil_k,
    soilOrganicCarbon: farmer.soil_organic_carbon,
    farmSizeAcres: farmer.farm_size_acres,
    soilType: farmer.soil_type,
    irrigationSource: farmer.irrigation_source,
    farmingExperienceYears: farmer.farming_experience_years,
    language: farmer.language,
    role: farmer.role || "farmer",
  };
}

function parseSoilValue(value, minimum, maximum) {
  if (value === undefined) return undefined;
  if (value === "" || value === null) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= minimum && number <= maximum
    ? number
    : NaN;
}

function soilSummary(farmer, language) {
  const values = [];
  if (farmer.soil_ph != null) values.push(`pH ${farmer.soil_ph}`);
  if (farmer.soil_n != null) values.push(`N ${farmer.soil_n} kg/ha`);
  if (farmer.soil_p != null) values.push(`P ${farmer.soil_p} kg/ha`);
  if (farmer.soil_k != null) values.push(`K ${farmer.soil_k} kg/ha`);
  if (farmer.soil_organic_carbon != null)
    values.push(`Organic carbon ${farmer.soil_organic_carbon}%`);
  if (values.length) return values.join(" · ");
  return language === "or"
    ? "ମାଟିର pH ଓ ପୋଷକ ସ୍ତର ଜାଣିବା ପାଇଁ ଆପଣଙ୍କ କ୍ଷେତର ମାଟି ପରୀକ୍ଷା କରାନ୍ତୁ।"
    : "Get your field soil tested to find its pH and nutrient levels.";
}

function publicDiagnosis(row) {
  return {
    id: row.id,
    crop: row.crop,
    growthStage: row.growth_stage,
    district: row.district,
    block: row.block,
    village: row.village,
    latitude: row.latitude,
    longitude: row.longitude,
    probableIssue: row.probable_issue,
    causes: row.causes,
    activeIngredients: row.active_ingredients,
    organicAlternatives: row.organic_alternatives,
    prevention: row.prevention,
    irrigation: row.irrigation,
    timing: row.timing,
    weather: row.weather,
    soil: row.soil,
    provider: row.provider,
    language: row.language || "en",
    createdAt: row.created_at,
  };
}

function setSessionCookie(res, token, secure) {
  res.cookie("km_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export function createApp({
  databasePath = ":memory:",
  uploadDir = path.resolve(here, "../data/uploads"),
  webDir = path.resolve(here, "../dist"),
  env = process.env,
  fetchImpl = fetch,
} = {}) {
  const db = new DatabaseSync(databasePath);
  initializeDatabase(db);
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "32kb" }));
  app.get("/api/status", (_req, res) => {
    const configured = Boolean(env.GEMINI_API_KEY);
    const hasAdmin = db.prepare("SELECT COUNT(*) AS count FROM farmers WHERE role='admin'").get().count > 0;
    const adminContactEmail = db.prepare("SELECT email FROM farmers WHERE role='admin' AND is_active=1 ORDER BY id LIMIT 1").get()?.email || env.ADMIN_EMAIL || "";
    res.json({
      status: "ok",
      adminSetupAvailable: Boolean(env.ADMIN_SETUP_KEY && env.ADMIN_SETUP_KEY.length >= 20 && !hasAdmin),
      adminContactEmail,
      integrations: {
        cropAnalysis: {
          provider: configured
            ? "Gemini image analysis"
            : "Gemini setup required",
          configured,
          model: configured
            ? env.GEMINI_MODEL || "gemini-3.8-flash"
            : "Not configured",
        },
        weather: "Open-Meteo (keyless), WeatherAPI optional",
        storage: "private local filesystem",
      },
    });
  });

  function currentFarmer(req) {
    const token =
      req.cookies?.km_session || parseCookie(req.headers.cookie, "km_session");
    if (!token) return null;
    const row = db
      .prepare(
        "SELECT farmers.* FROM sessions JOIN farmers ON farmers.id=sessions.farmer_id WHERE token_hash=? AND expires_at>? AND farmers.is_active=1",
      )
      .get(tokenDigest(token), Date.now());
    return row || null;
  }

  // Small cookie parser keeps the API dependency-free beyond Express and Multer.
  app.use((req, _res, next) => {
    req.cookies = Object.fromEntries(
      (req.headers.cookie || "")
        .split(";")
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => {
          const i = part.indexOf("=");
          return [part.slice(0, i), decodeURIComponent(part.slice(i + 1))];
        }),
    );
    next();
  });

  function requireFarmer(req, res, next) {
    const farmer = currentFarmer(req);
    if (!farmer)
      return res.status(401).json({ error: "Please sign in to continue." });
    req.farmer = farmer;
    next();
  }

  function requireAdmin(req, res, next) {
    if (req.farmer.role !== "admin")
      return res.status(403).json({ error: "Administrator access required." });
    next();
  }

  function recordAuthEvent(farmerId, email, event) {
    db.prepare("INSERT INTO auth_events(farmer_id,email,event) VALUES(?,?,?)")
      .run(farmerId ?? null, String(email || "unknown").slice(0, 200), event);
  }

  function startSession(farmerId, res) {
    const token = newSessionToken();
    db.prepare(
      "INSERT INTO sessions(token_hash,farmer_id,expires_at) VALUES(?,?,?)",
    ).run(tokenDigest(token), farmerId, Date.now() + 7 * 24 * 60 * 60 * 1000);
    setSessionCookie(res, token, env.COOKIE_SECURE === "true");
  }

  app.post("/api/admin/setup", (req, res) => {
    const { name, email, password, setupKey } = req.body || {};
    if (!env.ADMIN_SETUP_KEY || env.ADMIN_SETUP_KEY.length < 20)
      return res.status(503).json({ error: "Administrator setup is not enabled on this server." });
    const suppliedKey = typeof setupKey === "string" ? setupKey : "";
    const expectedDigest = createHash("sha256").update(env.ADMIN_SETUP_KEY).digest();
    const suppliedDigest = createHash("sha256").update(suppliedKey).digest();
    if (!timingSafeEqual(expectedDigest, suppliedDigest))
      return res.status(403).json({ error: "The administrator setup key is incorrect." });
    if (typeof name !== "string" || !name.trim() || name.trim().length > 100)
      return res.status(400).json({ error: "Enter your name (up to 100 characters)." });
    if (typeof email !== "string" || !emailPattern.test(email.trim()) || email.length > 200)
      return res.status(400).json({ error: "Enter a valid email address." });
    if (typeof password !== "string" || password.length < 8 || password.length > 100)
      return res.status(400).json({ error: "Choose a password between 8 and 100 characters." });
    db.exec("BEGIN IMMEDIATE");
    try {
      if (db.prepare("SELECT 1 FROM farmers WHERE role='admin' LIMIT 1").get()) {
        db.exec("ROLLBACK");
        return res.status(409).json({ error: "Administrator setup has already been completed." });
      }
      const result = db.prepare("INSERT INTO farmers(name,email,password_hash,role,language) VALUES(?,?,?,'admin',?)")
        .run(name.trim(), email.trim().toLowerCase(), hashPassword(password), ["en", "or"].includes(req.body.language) ? req.body.language : "en");
      const farmer = db.prepare("SELECT * FROM farmers WHERE id=?").get(Number(result.lastInsertRowid));
      db.prepare("INSERT INTO auth_events(farmer_id,email,event) VALUES(?,?,?)").run(farmer.id, farmer.email, "admin_created");
      db.exec("COMMIT");
      startSession(farmer.id, res);
      res.status(201).json(publicFarmer(farmer));
    } catch (error) {
      db.exec("ROLLBACK");
      if (String(error.message).includes("UNIQUE")) return res.status(409).json({ error: "An account with this email already exists." });
      throw error;
    }
  });

  app.post("/api/auth/register", (req, res) => {
    const { name, email, password } = req.body || {};
    const language = ["en", "or"].includes(req.body?.language)
      ? req.body.language
      : "en";
    if (typeof name !== "string" || !name.trim() || name.trim().length > 100)
      return res
        .status(400)
        .json({ error: "Enter your name (up to 100 characters)." });
    if (
      typeof email !== "string" ||
      !emailPattern.test(email.trim()) ||
      email.length > 200
    )
      return res.status(400).json({ error: "Enter a valid email address." });
    if (
      typeof password !== "string" ||
      password.length < 8 ||
      password.length > 100
    )
      return res
        .status(400)
        .json({ error: "Choose a password between 8 and 100 characters." });
    try {
      const result = db
        .prepare(
          "INSERT INTO farmers(name,email,password_hash,language) VALUES(?,?,?,?)",
        )
        .run(
          name.trim(),
          email.trim().toLowerCase(),
          hashPassword(password),
          language,
        );
      const farmer = db
        .prepare("SELECT * FROM farmers WHERE id=?")
        .get(Number(result.lastInsertRowid));
      recordAuthEvent(farmer.id, farmer.email, "account_created");
      startSession(farmer.id, res);
      res.status(201).json(publicFarmer(farmer));
    } catch (error) {
      if (String(error.message).includes("UNIQUE"))
        return res
          .status(409)
          .json({ error: "An account with this email already exists." });
      throw error;
    }
  });

  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body || {};
    if (typeof email !== "string" || typeof password !== "string")
      return res.status(400).json({ error: "Enter your email and password." });
    const farmer = db
      .prepare("SELECT * FROM farmers WHERE email=?")
      .get(email.trim());
    if (!farmer || !verifyPassword(password, farmer.password_hash)) {
      recordAuthEvent(farmer?.id, email.trim().toLowerCase(), "login_failed");
      return res.status(401).json({ error: "Email or password is incorrect." });
    }
    if (farmer.role === "admin")
      return res.status(403).json({ error: "Use the administrator sign-in page." });
    if (!farmer.is_active) {
      recordAuthEvent(farmer.id, farmer.email, "login_blocked");
      return res.status(403).json({ error: "This account is disabled. Contact the administrator." });
    }
    const old =
      req.cookies?.km_session || parseCookie(req.headers.cookie, "km_session");
    if (old)
      db.prepare("DELETE FROM sessions WHERE token_hash=?").run(
        tokenDigest(old),
      );
    startSession(farmer.id, res);
    recordAuthEvent(farmer.id, farmer.email, "login_success");
    res.json(publicFarmer(farmer));
  });

  app.post("/api/auth/password-reset-request", (req, res) => {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    if (!emailPattern.test(email) || email.length > 200)
      return res.status(400).json({ error: "Enter a valid email address." });
    const farmer = db.prepare("SELECT id FROM farmers WHERE email=? AND role='farmer'").get(email);
    if (farmer) {
      const pending = db.prepare("SELECT id FROM password_reset_requests WHERE email=? AND status='pending' LIMIT 1").get(email);
      if (!pending) db.prepare("INSERT INTO password_reset_requests(email) VALUES(?)").run(email);
      recordAuthEvent(farmer.id, email, "password_reset_requested");
    }
    // Keep the response identical for existing and unknown addresses.
    res.json({ message: "If the account exists, a reset request has been sent to the administrator." });
  });

  app.post("/api/admin/login", (req, res) => {
    const { email, password } = req.body || {};
    if (typeof email !== "string" || typeof password !== "string")
      return res.status(400).json({ error: "Enter your administrator email and password." });
    const farmer = db.prepare("SELECT * FROM farmers WHERE email=?").get(email.trim());
    if (!farmer || !verifyPassword(password, farmer.password_hash) || farmer.role !== "admin") {
      recordAuthEvent(farmer?.id, email.trim().toLowerCase(), "admin_login_failed");
      return res.status(401).json({ error: "Administrator email or password is incorrect." });
    }
    if (!farmer.is_active) {
      recordAuthEvent(farmer.id, farmer.email, "admin_login_blocked");
      return res.status(403).json({ error: "This administrator account is disabled." });
    }
    const old = req.cookies?.km_session || parseCookie(req.headers.cookie, "km_session");
    if (old) db.prepare("DELETE FROM sessions WHERE token_hash=?").run(tokenDigest(old));
    startSession(farmer.id, res);
    recordAuthEvent(farmer.id, farmer.email, "admin_login_success");
    res.json(publicFarmer(farmer));
  });

  app.post("/api/auth/logout", requireFarmer, (req, res) => {
    const token =
      req.cookies?.km_session || parseCookie(req.headers.cookie, "km_session");
    db.prepare("DELETE FROM sessions WHERE token_hash=?").run(
      tokenDigest(token),
    );
    recordAuthEvent(req.farmer.id, req.farmer.email, "logout");
    res.clearCookie("km_session", {
      httpOnly: true,
      sameSite: "lax",
      secure: env.COOKIE_SECURE === "true",
      path: "/",
    });
    res.status(204).end();
  });

  app.get("/api/admin/overview", requireFarmer, requireAdmin, (req, res) => {
    const today = new Date().toISOString().slice(0, 10);
    const defaultFrom = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const from = typeof req.query.from === "string" ? req.query.from : defaultFrom;
    const to = typeof req.query.to === "string" ? req.query.to : today;
    const validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
    if (!validDate(from) || !validDate(to) || from > to)
      return res.status(400).json({ error: "Choose a valid date range." });
    const dayCount = Math.floor((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000) + 1;
    if (dayCount > 366)
      return res.status(400).json({ error: "Activity ranges can include up to 366 days." });
    const farmers = db.prepare(`
      SELECT f.id,f.name,f.email,f.role,f.is_active,f.created_at,
        (SELECT MAX(created_at) FROM auth_events e WHERE e.farmer_id=f.id AND e.event IN ('login_success','admin_login_success')) AS last_login,
        (SELECT COUNT(*) FROM sessions s WHERE s.farmer_id=f.id AND s.expires_at>?) AS active_sessions,
        (SELECT COUNT(*) FROM diagnoses d WHERE d.farmer_id=f.id) AS assessment_count
      FROM farmers f ORDER BY f.created_at DESC
    `).all(Date.now());
    const events = db.prepare("SELECT id,farmer_id,email,event,created_at FROM auth_events ORDER BY id DESC LIMIT 100").all();
    const activeSessions = db.prepare(`
      SELECT s.farmer_id,f.name,f.email,s.expires_at FROM sessions s
      JOIN farmers f ON f.id=s.farmer_id WHERE s.expires_at>? AND f.is_active=1 ORDER BY s.expires_at DESC
    `).all(Date.now());
    const passwordResetRequests = db.prepare("SELECT id,email,status,created_at,resolved_at FROM password_reset_requests ORDER BY CASE status WHEN 'pending' THEN 0 ELSE 1 END, id DESC LIMIT 100").all();
    const activity = db.prepare(`
      WITH RECURSIVE days(day) AS (
        SELECT ? UNION ALL SELECT date(day, '+1 day') FROM days WHERE day < ?
      )
      SELECT days.day AS date,
        (SELECT COUNT(*) FROM farmers f WHERE date(f.created_at)=days.day) AS accounts,
        (SELECT COUNT(*) FROM auth_events e WHERE date(e.created_at)=days.day AND e.event IN ('login_success','admin_login_success')) AS logins,
        (SELECT COUNT(*) FROM diagnoses d WHERE date(d.created_at)=days.day) AS assessments
      FROM days ORDER BY days.day
    `).all(from, to);
    const dbReady = db.prepare("SELECT 1 AS ready").get()?.ready === 1;
    res.json({
      farmers,
      events,
      activeSessions,
      passwordResetRequests,
      range: { from, to },
      activity,
      health: {
        api: "healthy",
        database: dbReady ? "connected" : "unavailable",
        cropAnalysis: env.GEMINI_API_KEY ? "configured · not live-tested" : "not configured",
        weather: env.WEATHER_API_KEY ? "Open-Meteo available · WeatherAPI configured · not live-tested" : "Open-Meteo available · WeatherAPI not configured",
        storage: "private local filesystem",
        uptimeSeconds: Math.floor(process.uptime()),
      },
    });
  });

  app.post("/api/admin/password-reset-requests/:id/resolve", requireFarmer, requireAdmin, (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1)
      return res.status(400).json({ error: "Invalid reset request." });
    const reset = db.prepare("SELECT * FROM password_reset_requests WHERE id=? AND status='pending'").get(id);
    if (!reset) return res.status(404).json({ error: "This reset request is no longer pending." });
    const farmer = db.prepare("SELECT id FROM farmers WHERE email=? AND role='farmer'").get(reset.email);
    if (!farmer) return res.status(404).json({ error: "Farmer account not found." });
    const password = randomBytes(12).toString("base64url");
    db.prepare("UPDATE farmers SET password_hash=? WHERE id=?").run(hashPassword(password), farmer.id);
    db.prepare("DELETE FROM sessions WHERE farmer_id=?").run(farmer.id);
    db.prepare("UPDATE password_reset_requests SET status='resolved',resolved_at=CURRENT_TIMESTAMP WHERE id=?").run(id);
    recordAuthEvent(req.farmer.id, req.farmer.email, `password_reset_resolved:${farmer.id}`);
    res.json({ ok: true, temporaryPassword: password });
  });

  app.post("/api/admin/password-reset-requests/:id/reject", requireFarmer, requireAdmin, (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1)
      return res.status(400).json({ error: "Invalid reset request." });
    const result = db.prepare("UPDATE password_reset_requests SET status='rejected',resolved_at=CURRENT_TIMESTAMP WHERE id=? AND status='pending'").run(id);
    if (!result.changes)
      return res.status(404).json({ error: "This reset request is no longer pending." });
    recordAuthEvent(req.farmer.id, req.farmer.email, `password_reset_rejected:${id}`);
    res.json({ ok: true });
  });

  app.patch("/api/admin/farmers/:id", requireFarmer, requireAdmin, (req, res) => {
    const id = Number(req.params.id);
    const active = req.body?.active;
    const role = req.body?.role;
    if (!Number.isSafeInteger(id) || id < 1 || (active === undefined && role === undefined) || (active !== undefined && typeof active !== "boolean") || (role !== undefined && !["farmer", "admin"].includes(role)))
      return res.status(400).json({ error: "Choose a valid account role or status." });
    const target = db.prepare("SELECT id,role FROM farmers WHERE id=?").get(id);
    if (!target) return res.status(404).json({ error: "Account not found." });
    const nextRole = role ?? target.role;
    const nextActive = active ?? Boolean(db.prepare("SELECT is_active FROM farmers WHERE id=?").get(id).is_active);
    if (id === req.farmer.id && (!nextActive || nextRole !== "admin"))
      return res.status(400).json({ error: "You cannot disable or demote your own administrator account." });
    const remainsAdmin = nextRole === "admin" && nextActive;
    const removesActiveAdmin = target.role === "admin" && Boolean(db.prepare("SELECT is_active FROM farmers WHERE id=?").get(id).is_active) && !remainsAdmin;
    if (removesActiveAdmin && db.prepare("SELECT COUNT(*) AS count FROM farmers WHERE role='admin' AND is_active=1").get().count < 2)
      return res.status(400).json({ error: "Keep at least one active administrator." });
    db.prepare("UPDATE farmers SET role=?,is_active=? WHERE id=?").run(nextRole, nextActive ? 1 : 0, id);
    if (!nextActive) db.prepare("DELETE FROM sessions WHERE farmer_id=?").run(id);
    if (role !== undefined && role !== target.role) recordAuthEvent(req.farmer.id, req.farmer.email, `role_changed:${id}:${nextRole}`);
    if (active !== undefined) recordAuthEvent(req.farmer.id, req.farmer.email, active ? `account_enabled:${id}` : `account_disabled:${id}`);
    res.json({ ok: true, role: nextRole, active: nextActive });
  });

  app.post("/api/admin/farmers/:id/revoke-sessions", requireFarmer, requireAdmin, (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: "Choose a valid account." });
    const target = db.prepare("SELECT id,email FROM farmers WHERE id=?").get(id);
    if (!target) return res.status(404).json({ error: "Account not found." });
    const result = db.prepare("DELETE FROM sessions WHERE farmer_id=?").run(id);
    recordAuthEvent(req.farmer.id, req.farmer.email, `sessions_revoked:${id}`);
    res.json({ ok: true, revoked: Number(result.changes) });
  });

  app.get("/api/auth/me", requireFarmer, (req, res) =>
    res.json(publicFarmer(req.farmer)),
  );
  app.put("/api/auth/me", requireFarmer, (req, res) => {
    const body = req.body || {};
    const phone = Object.hasOwn(body, "phone") ? body.phone : req.farmer.phone;
    const district = Object.hasOwn(body, "district")
      ? body.district
      : req.farmer.district;
    const block = Object.hasOwn(body, "block") ? body.block : req.farmer.block;
    const village = Object.hasOwn(body, "village")
      ? body.village
      : req.farmer.village;
    const language = body.language;
    if (phone != null && (typeof phone !== "string" || phone.length > 30))
      return res
        .status(400)
        .json({ error: "Phone must be 30 characters or fewer." });
    if (language != null && !["en", "or"].includes(language))
      return res.status(400).json({ error: "Choose English or Odia." });
    const latitude = Object.hasOwn(body, "latitude")
      ? parseCoordinate(body.latitude, "latitude")
      : req.farmer.latitude;
    const longitude = Object.hasOwn(body, "longitude")
      ? parseCoordinate(body.longitude, "longitude")
      : req.farmer.longitude;
    if (
      (Object.hasOwn(body, "latitude") &&
        body.latitude != null &&
        body.latitude !== "" &&
        latitude == null) ||
      (Object.hasOwn(body, "longitude") &&
        body.longitude != null &&
        body.longitude !== "" &&
        longitude == null)
    )
      return res.status(400).json({ error: "Enter valid GPS coordinates." });
    if ((latitude == null) !== (longitude == null))
      return res
        .status(400)
        .json({
          error: "GPS latitude and longitude must be provided together.",
        });
    const [safeVillage, safeBlock, safeDistrict] = cleanLocation(
      village,
      block,
      district,
    );
    const soilPh = parseSoilValue(body.soilPh, 0, 14);
    const soilNitrogen = parseSoilValue(body.soilNitrogen, 0, 100000);
    const soilPhosphorus = parseSoilValue(body.soilPhosphorus, 0, 100000);
    const soilPotassium = parseSoilValue(body.soilPotassium, 0, 100000);
    const soilOrganicCarbon = parseSoilValue(body.soilOrganicCarbon, 0, 100);
    if (
      [
        soilPh,
        soilNitrogen,
        soilPhosphorus,
        soilPotassium,
        soilOrganicCarbon,
      ].some(Number.isNaN)
    )
      return res.status(400).json({ error: "Enter valid soil test values." });
    const farmSizeRaw = Object.hasOwn(body, "farmSizeAcres")
      ? body.farmSizeAcres
      : req.farmer.farm_size_acres;
    const farmSizeAcres =
      farmSizeRaw === "" || farmSizeRaw == null ? null : Number(farmSizeRaw);
    const experienceRaw = Object.hasOwn(body, "farmingExperienceYears")
      ? body.farmingExperienceYears
      : req.farmer.farming_experience_years;
    const experienceYears =
      experienceRaw === "" || experienceRaw == null
        ? null
        : Number(experienceRaw);
    const soilType = Object.hasOwn(body, "soilType")
      ? body.soilType
      : req.farmer.soil_type;
    const irrigationSource = Object.hasOwn(body, "irrigationSource")
      ? body.irrigationSource
      : req.farmer.irrigation_source;
    if (
      farmSizeAcres != null &&
      (!Number.isFinite(farmSizeAcres) ||
        farmSizeAcres < 0 ||
        farmSizeAcres > 100000)
    )
      return res.status(400).json({ error: "Enter a valid farm size." });
    if (
      experienceYears != null &&
      (!Number.isInteger(experienceYears) ||
        experienceYears < 0 ||
        experienceYears > 100)
    )
      return res
        .status(400)
        .json({ error: "Enter valid farming experience in years." });
    if (
      soilType != null &&
      (typeof soilType !== "string" || soilType.length > 80)
    )
      return res
        .status(400)
        .json({ error: "Soil type must be 80 characters or fewer." });
    if (
      irrigationSource != null &&
      (typeof irrigationSource !== "string" || irrigationSource.length > 80)
    )
      return res
        .status(400)
        .json({ error: "Irrigation source must be 80 characters or fewer." });
    db.prepare(
      "UPDATE farmers SET phone=?,district=?,block=?,village=?,latitude=?,longitude=?,soil_ph=?,soil_n=?,soil_p=?,soil_k=?,soil_organic_carbon=?,farm_size_acres=?,soil_type=?,irrigation_source=?,farming_experience_years=?,language=? WHERE id=?",
    ).run(
      typeof phone === "string" ? phone.trim() || null : null,
      safeDistrict || null,
      safeBlock || null,
      safeVillage || null,
      latitude,
      longitude,
      soilPh === undefined ? req.farmer.soil_ph : soilPh,
      soilNitrogen === undefined ? req.farmer.soil_n : soilNitrogen,
      soilPhosphorus === undefined ? req.farmer.soil_p : soilPhosphorus,
      soilPotassium === undefined ? req.farmer.soil_k : soilPotassium,
      soilOrganicCarbon === undefined
        ? req.farmer.soil_organic_carbon
        : soilOrganicCarbon,
      farmSizeAcres,
      typeof soilType === "string" ? soilType.trim() || null : null,
      typeof irrigationSource === "string"
        ? irrigationSource.trim() || null
        : null,
      experienceYears,
      language || req.farmer.language,
      req.farmer.id,
    );
    res.json(
      publicFarmer(
        db.prepare("SELECT * FROM farmers WHERE id=?").get(req.farmer.id),
      ),
    );
  });

  app.get("/api/location/reverse", requireFarmer, async (req, res) => {
    const latitude = parseCoordinate(req.query.latitude, "latitude");
    const longitude = parseCoordinate(req.query.longitude, "longitude");
    if (latitude == null || longitude == null)
      return res.status(400).json({ error: "Enter valid GPS coordinates." });
    const location = await reverseGeocode({
      latitude,
      longitude,
      language: req.farmer.language,
      fetchImpl,
    });
    res.json({ location });
  });

  app.get("/api/weather/current", requireFarmer, async (req, res) => {
    if (
      (req.query.latitude === undefined) !==
      (req.query.longitude === undefined)
    )
      return res
        .status(400)
        .json({
          error: "GPS latitude and longitude must be provided together.",
        });
    const latitude =
      req.query.latitude === undefined
        ? req.farmer.latitude
        : parseCoordinate(req.query.latitude, "latitude");
    const longitude =
      req.query.longitude === undefined
        ? req.farmer.longitude
        : parseCoordinate(req.query.longitude, "longitude");
    if ((latitude == null) !== (longitude == null))
      return res
        .status(400)
        .json({
          error: "GPS latitude and longitude must be provided together.",
        });
    if (
      (req.query.latitude !== undefined && latitude == null) ||
      (req.query.longitude !== undefined && longitude == null)
    )
      return res.status(400).json({ error: "Enter valid GPS coordinates." });
    const weather = await getWeather({
      district: req.query.district || req.farmer.district,
      block: req.query.block || req.farmer.block,
      village: req.query.village || req.farmer.village,
      latitude,
      longitude,
      language: req.farmer.language,
      apiKey: env.WEATHER_API_KEY,
      apiUrl: env.WEATHER_API_URL,
      fetchImpl,
    });
    if (weather.provider === "Unavailable")
      return res
        .status(503)
        .json({ error: weather.summary, provider: weather.provider });
    res.json(weather);
  });

  app.post('/api/diagnoses', requireFarmer, upload.single('image'), async (req, res, next) => {
    try {
      const validationError = validateDiagnosis({ crop: req.body.crop, file: req.file });
      if (validationError) return res.status(400).json({ error: validationError });
      const [village, block, district] = cleanLocation(req.body.village || req.farmer.village, req.body.block || req.farmer.block, req.body.district || req.farmer.district);
      // If a farmer edits the diagnosis location, don't silently use saved GPS
      // coordinates for the previous place. Weather can geocode the new locality.
      const samePlace = (a, b) => String(a || '').trim().toLocaleLowerCase() === String(b || '').trim().toLocaleLowerCase();
      const locationChanged = !samePlace(village, req.farmer.village) || !samePlace(block, req.farmer.block) || !samePlace(district, req.farmer.district);
      const latitude = req.body.latitude === undefined ? (locationChanged ? null : req.farmer.latitude) : parseCoordinate(req.body.latitude, 'latitude');
      const longitude = req.body.longitude === undefined ? (locationChanged ? null : req.farmer.longitude) : parseCoordinate(req.body.longitude, 'longitude');
      if ((latitude == null) !== (longitude == null) || req.body.latitude !== undefined && latitude == null || req.body.longitude !== undefined && longitude == null) return res.status(400).json({ error: 'Enter a valid GPS latitude and longitude.' });
      const stage = typeof req.body.growthStage === 'string' ? req.body.growthStage.trim().slice(0, 100) : '';
      // Respect either explicit UI choice. Falling back to the saved profile
      // only when the request omits language caused English requests to render in Odia.
      const language = ['en', 'or'].includes(req.body.language) ? req.body.language : req.farmer.language;
      const symptom = typeof req.body.symptom === 'string' ? req.body.symptom.trim() : 'unsure';
      if (!env.GEMINI_API_KEY) {
        return res.status(503).json({ code: 'GEMINI_UNAVAILABLE', error: 'Gemini image analysis is not configured on the server. Add GEMINI_API_KEY and restart the backend.' });
      }
      let advisory;
      try {
        advisory = await getGeminiAdvisory({ crop: req.body.crop.trim(), growthStage: stage, symptom, district, block, village, farmerContext: { farmSizeAcres: req.farmer.farm_size_acres, soilType: req.farmer.soil_type, irrigationSource: req.farmer.irrigation_source, farmingExperienceYears: req.farmer.farming_experience_years, soil: soilSummary(req.farmer, language) }, image: req.file.buffer, mimeType: req.file.mimetype, apiKey: env.GEMINI_API_KEY, model: env.GEMINI_MODEL || 'gemini-3.8-flash', language, fetchImpl });
      } catch (error) {
        console.warn(`[crop-analysis] Gemini analysis failed: ${error.message}`);
        return res.status(502).json({ code: 'GEMINI_ANALYSIS_FAILED', error: 'Gemini could not analyze this photo. Check the server API key, model, quota, and image, then try again.' });
      }
      await mkdir(uploadDir, { recursive: true });
      const imageKey = `${randomUUID()}${imageExt[req.file.mimetype]}`;
      await writeFile(path.join(uploadDir, imageKey), req.file.buffer, { flag: 'wx', mode: 0o600 });
      // Crop guidance is the primary action. Keep weather as optional context,
      // even if a provider throws unexpectedly or the request times out.
      let weather;
      try {
        weather = await getWeather({ district, block, village, latitude, longitude, language, apiKey: env.WEATHER_API_KEY, apiUrl: env.WEATHER_API_URL, fetchImpl });
      } catch {
        weather = { provider: 'Unavailable', summary: language === 'or' ? 'ଏହି ଯାଞ୍ଚ ପାଇଁ ପାଣିପାଗ ତଥ୍ୟ ଉପଲବ୍ଧ ନାହିଁ।' : 'Weather information is unavailable for this crop check.' };
      }
      const soil = soilSummary(req.farmer, language);
      const insert = db.prepare(`INSERT INTO diagnoses(farmer_id,crop,growth_stage,district,block,village,latitude,longitude,image_key,probable_issue,causes,active_ingredients,organic_alternatives,prevention,irrigation,timing,weather,soil,provider,language)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
        const result = insert.run(
          req.farmer.id,
          req.body.crop.trim(),
          stage || null,
          district || null,
          block || null,
          village || null,
          latitude,
          longitude,
          imageKey,
          advisory.probableIssue,
          advisory.causes,
          advisory.activeIngredients,
          advisory.organicAlternatives,
          advisory.preventiveMeasures,
          advisory.irrigationGuidance,
          advisory.treatmentTiming,
          weather.summary,
          soil,
          `${advisory.provider} · weather: ${weather.provider}`,
          language,
        );
        res
          .status(201)
          .json(
            publicDiagnosis(
              db
                .prepare("SELECT * FROM diagnoses WHERE id=? AND farmer_id=?")
                .get(Number(result.lastInsertRowid), req.farmer.id),
            ),
          );
      } catch (error) {
        next(error);
      }
    },
  );

  app.post("/api/diagnoses/translate", requireFarmer, async (req, res) => {
    const id = Number(req.body?.id);
    const language = req.body?.language;
    if (!Number.isSafeInteger(id) || id < 1 || !["en", "or"].includes(language))
      return res
        .status(400)
        .json({ error: "Choose a report and a supported language." });
    const row = db
      .prepare("SELECT * FROM diagnoses WHERE id=? AND farmer_id=?")
      .get(id, req.farmer.id);
    if (!row)
      return res
        .status(404)
        .json({ error: "Assessment report was not found." });
    if (row.language === language) return res.json(publicDiagnosis(row));
    if (!env.GEMINI_API_KEY)
      return res
        .status(503)
        .json({
          code: "GEMINI_UNAVAILABLE",
          error:
            "Live report translation needs Gemini configured on the backend.",
        });
    try {
      const translated = await translateAssessmentText({ targetLanguage: language, apiKey: env.GEMINI_API_KEY, model: env.GEMINI_MODEL || 'gemini-3.8-flash', fetchImpl, fields: { probableIssue: row.probable_issue, causes: row.causes, activeIngredients: row.active_ingredients, organicAlternatives: row.organic_alternatives, prevention: row.prevention, irrigation: row.irrigation, timing: row.timing, weather: row.weather, soil: row.soil } });
      res.json({ ...publicDiagnosis(row), ...translated, language });
    } catch (error) {
      console.warn(
        `[assessment-translation] Gemini translation failed: ${error.message}`,
      );
      res
        .status(502)
        .json({
          code: "TRANSLATION_FAILED",
          error: "Could not translate this report right now. Please try again.",
        });
    }
  });

  app.get("/api/diagnoses", requireFarmer, (req, res) => {
    const rows = db
      .prepare(
        "SELECT * FROM diagnoses WHERE farmer_id=? ORDER BY created_at DESC,id DESC",
      )
      .all(req.farmer.id);
    res.json(rows.map(publicDiagnosis));
  });

  if (existsSync(path.join(webDir, "index.html"))) {
    app.use(express.static(webDir, { index: false, maxAge: "1h" }));
    app.get("*splat", (req, res, next) => {
      if (req.path.startsWith("/api/")) return next();
      res.sendFile(path.join(webDir, "index.html"));
    });
  }

  app.use((error, _req, res, _next) => {
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE")
      return res
        .status(400)
        .json({ error: "Choose an image smaller than 8 MB." });
    console.error(error);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  });
  return { app, db };
}

function parseCookie(header, key) {
  const item = (header || "")
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${key}=`));
  return item ? decodeURIComponent(item.slice(key.length + 1)) : null;
}

function parseCoordinate(value, axis) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  const limit = axis === "latitude" ? 90 : 180;
  return Number.isFinite(number) && number >= -limit && number <= limit
    ? number
    : null;
}
