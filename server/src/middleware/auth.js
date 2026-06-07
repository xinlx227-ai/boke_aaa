import { prisma } from "../lib/prisma.js";
import { hashTokenId, sanitizeUser, verifyAccessToken } from "../lib/auth.js";

function sendUnauthorized(res, message = "请先登录。") {
  return res.status(401).json({ message });
}

async function userIsDisabled(userId) {
  const rows = await prisma.$queryRaw`
    SELECT is_disabled AS isDisabled
    FROM users
    WHERE id = ${userId}
    LIMIT 1
  `;

  return Boolean(rows[0]?.isDisabled);
}

async function resolveAuth(req) {
  const authorizationHeader = req.headers.authorization;

  if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authorizationHeader.slice("Bearer ".length).trim();

  const payload = verifyAccessToken(token);
  const userId = Number(payload.sub);
  const sessionId = Number(payload.sessionId);
  const deviceId = payload.deviceId;
  const tokenId = payload.jti;

  if (!userId || !sessionId || !deviceId || !tokenId) {
    return null;
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
    return null;
  }

  if (await userIsDisabled(userId)) {
    return null;
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
    return null;
  }

  return {
    auth: {
      userId,
      sessionId,
      deviceId,
      role: payload.role
    },
    user: sanitizeUser(session.user)
  };
}

export async function attachOptionalAuth(req, _res, next) {
  try {
    const resolved = await resolveAuth(req);

    if (resolved) {
      req.auth = resolved.auth;
      req.user = resolved.user;
    }

    return next();
  } catch (_error) {
    return next();
  }
}

export async function requireAuth(req, res, next) {
  try {
    const resolved = await resolveAuth(req);

    if (!resolved) {
      return sendUnauthorized(res);
    }

    req.auth = resolved.auth;
    req.user = resolved.user;

    return next();
  } catch (_error) {
    return sendUnauthorized(res, "登录凭证无效或已过期。");
  }
}
