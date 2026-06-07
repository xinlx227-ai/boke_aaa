import { getRequestIp, trimUserAgent } from "./auth.js";
import { parseDeviceInfo } from "./device.js";
import { prisma } from "./prisma.js";

export const SECURITY_AUDIT_EVENTS = {
  LOGIN_SUCCESS: "login_success",
  LOGIN_FAILED: "login_failed",
  LOGOUT: "logout",
  PASSWORD_CHANGED: "password_changed",
  SESSION_REVOKED: "session_revoked",
  BINDINGS_UPDATED: "bindings_updated"
};

function normalizeMetadata(metadata) {
  if (!metadata || typeof metadata !== "object") {
    return {};
  }

  return metadata;
}

export function requestAuditContext(req) {
  return {
    ipAddress: getRequestIp(req),
    userAgent: trimUserAgent(req.headers["user-agent"])
  };
}

export async function recordSecurityAuditEvent(
  {
    userId,
    sessionId = null,
    eventType,
    ipAddress = null,
    userAgent = null,
    metadata = {}
  },
  tx = prisma
) {
  if (!userId || !eventType) {
    return null;
  }

  return tx.$executeRaw`
    INSERT INTO security_audit_events (user_id, session_id, event_type, ip_address, user_agent, metadata, created_at)
    VALUES (
      ${userId},
      ${sessionId},
      ${eventType},
      ${ipAddress},
      ${userAgent},
      ${JSON.stringify(normalizeMetadata(metadata))},
      CURRENT_TIMESTAMP(3)
    )
  `;
}

export function formatSecurityAuditEvent(event) {
  const eventType = event.eventType || event.event_type;
  const ipAddress = event.ipAddress || event.ip_address || null;
  const userAgent = event.userAgent || event.user_agent || null;
  const createdAt = event.createdAt || event.created_at;

  return {
    id: event.id,
    eventType,
    ipAddress,
    userAgent,
    device: parseDeviceInfo(userAgent),
    metadata: event.metadata || {},
    createdAt
  };
}
