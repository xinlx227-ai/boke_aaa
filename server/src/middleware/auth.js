import { prisma } from "../lib/prisma.js";
import { hashTokenId, sanitizeUser, verifyAccessToken } from "../lib/auth.js";

function sendUnauthorized(res, message = "Authentication required.") {
  return res.status(401).json({ message });
}

export async function requireAuth(req, res, next) {
  const authorizationHeader = req.headers.authorization;

  if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
    return sendUnauthorized(res);
  }

  const token = authorizationHeader.slice("Bearer ".length).trim();

  try {
    const payload = verifyAccessToken(token);
    const userId = Number(payload.sub);
    const sessionId = Number(payload.sessionId);
    const deviceId = payload.deviceId;
    const tokenId = payload.jti;

    if (!userId || !sessionId || !deviceId || !tokenId) {
      return sendUnauthorized(res, "Invalid session token.");
    }

    const session = await prisma.userSession.findUnique({
      where: {
        id: sessionId
      },
      include: {
        user: true
      }
    });

    if (
      !session ||
      !session.isActive ||
      session.userId !== userId ||
      session.deviceId !== deviceId ||
      session.tokenHash !== hashTokenId(tokenId)
    ) {
      return sendUnauthorized(res, "Session has expired or is no longer valid.");
    }

    const touchResult = await prisma.userSession.updateMany({
      where: {
        id: sessionId,
        userId,
        isActive: true
      },
      data: {
        lastActiveAt: new Date()
      }
    });

    if (touchResult.count === 0) {
      return sendUnauthorized(res, "Session has expired or is no longer valid.");
    }

    req.auth = {
      userId,
      sessionId,
      deviceId,
      role: payload.role
    };
    req.user = sanitizeUser(session.user);

    return next();
  } catch (_error) {
    return sendUnauthorized(res, "Invalid or expired token.");
  }
}
