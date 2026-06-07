import bcrypt from "bcrypt";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

const PASSWORD_SALT_ROUNDS = 10;
export const MAX_ACTIVE_SESSIONS = 3;

export function hashPassword(password) {
  return bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
}

export function comparePassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

export function generateDeviceId() {
  return crypto.randomUUID();
}

export function generateTokenId() {
  return crypto.randomUUID();
}

export function hashTokenId(tokenId) {
  return crypto.createHash("sha256").update(tokenId).digest("hex");
}

export function signAccessToken({ userId, sessionId, deviceId, role, tokenId }) {
  return jwt.sign(
    {
      sessionId,
      deviceId,
      role
    },
    env.jwtSecret,
    {
      subject: String(userId),
      jwtid: tokenId,
      expiresIn: env.jwtExpiresIn
    }
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.jwtSecret);
}

export function sanitizeUser(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    phoneNumber: user.phoneNumber ?? null,
    wechatBound: Boolean(user.wechatBound),
    qqBound: Boolean(user.qqBound),
    alipayBound: Boolean(user.alipayBound),
    role: user.role,
    isDisabled: Boolean(user.isDisabled),
    createdAt: user.createdAt
  };
}

export function getRequestIp(req) {
  const forwardedFor = req.headers["x-forwarded-for"];

  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0].trim();
  }

  return req.ip ?? null;
}

export function trimUserAgent(userAgent) {
  if (typeof userAgent !== "string" || !userAgent.trim()) {
    return null;
  }

  return userAgent.slice(0, 500);
}
