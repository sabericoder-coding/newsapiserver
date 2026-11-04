import { createHmac, timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";

const COOKIE_NAME = "cp_admin_session";
const SESSION_DURATION_SECONDS = 8 * 60 * 60;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILED_LOGINS = 5;

const failedLogins = new Map<string, { count: number; resetAt: number }>();

function getClientKey(ip: string | undefined): string {
  return ip || "unknown";
}

export const loginRateLimit: RequestHandler = (req, res, next) => {
  const key = getClientKey(req.ip);
  const now = Date.now();
  const record = failedLogins.get(key);

  if (!record || record.resetAt <= now) {
    failedLogins.delete(key);
    next();
    return;
  }

  if (record.count >= MAX_FAILED_LOGINS) {
    res.setHeader("Retry-After", String(Math.ceil((record.resetAt - now) / 1000)));
    res.status(429).json({ error: "Too many failed login attempts. Try again later." });
    return;
  }

  next();
};

function recordFailedLogin(ip: string | undefined): void {
  const key = getClientKey(ip);
  const now = Date.now();
  const existing = failedLogins.get(key);

  if (!existing || existing.resetAt <= now) {
    failedLogins.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return;
  }

  existing.count += 1;
}

function clearFailedLogins(ip: string | undefined): void {
  failedLogins.delete(getClientKey(ip));
}

function getSessionSecret(): string {
  const secret = process.env["ADMIN_SESSION_SECRET"];
  if (!secret || secret.length < 32) {
    throw new Error("ADMIN_SESSION_SECRET must contain at least 32 characters.");
  }
  return secret;
}

function safeEqual(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  return aBuffer.length === bBuffer.length && timingSafeEqual(aBuffer, bBuffer);
}

function sign(payload: string): string {
  return createHmac("sha256", getSessionSecret())
    .update(payload)
    .digest("base64url");
}

function createSessionToken(): string {
  const payload = Buffer.from(
    JSON.stringify({
      exp: Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS,
    }),
  ).toString("base64url");

  return `${payload}.${sign(payload)}`;
}

function isValidSession(token: string | undefined): boolean {
  if (!token) return false;

  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [payload, signature] = parts;
  if (!payload || !signature) return false;

  try {
    if (!safeEqual(signature, sign(payload))) return false;

    const decoded: unknown = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    );

    if (
      typeof decoded !== "object" ||
      decoded === null ||
      !("exp" in decoded) ||
      typeof decoded.exp !== "number"
    ) {
      return false;
    }

    return decoded.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

const cookieOptions = {
  httpOnly: true,
  secure: process.env["NODE_ENV"] === "production",
  sameSite: "strict" as const,
  path: "/",
  maxAge: SESSION_DURATION_SECONDS * 1000,
};

export const adminLoginHandler: RequestHandler = (req, res) => {
  const configuredPassword = process.env["ADMIN_DASHBOARD_PASSWORD"];

  if (!configuredPassword) {
    res.status(503).json({ error: "Admin dashboard is not configured." });
    return;
  }

  try {
    getSessionSecret();
  } catch {
    res.status(503).json({ error: "Admin dashboard is not configured." });
    return;
  }

  const body: unknown = req.body;
  const suppliedPassword =
    typeof body === "object" &&
    body !== null &&
    "password" in body &&
    typeof body.password === "string"
      ? body.password
      : "";

  if (!safeEqual(suppliedPassword, configuredPassword)) {
    recordFailedLogin(req.ip);
    res.status(401).json({ error: "Invalid password." });
    return;
  }

  clearFailedLogins(req.ip);
  res.cookie(COOKIE_NAME, createSessionToken(), cookieOptions);
  res.status(200).json({ authenticated: true });
};

export const requireAdminSession: RequestHandler = (req, res, next) => {
  try {
    const token = req.cookies?.[COOKIE_NAME] as string | undefined;

    if (!isValidSession(token)) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }

    next();
  } catch {
    res.status(503).json({ error: "Admin authentication is not configured." });
  }
};

export const adminLogoutHandler: RequestHandler = (_req, res) => {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: process.env["NODE_ENV"] === "production",
    sameSite: "strict",
    path: "/",
  });

  res.status(200).json({ authenticated: false });
};
