import { prisma } from "../lib/prisma.js";
import { hashTokenId, sanitizeUser, verifyAccessToken } from "../lib/auth.js";

function sendUnauthorized(res, message = "请先登录。") {
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
      return sendUnauthorized(res, "登录凭证无效。");
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
      return sendUnauthorized(res, "登录状态已过期或失效，请重新登录。");
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
      return sendUnauthorized(res, "登录状态已过期或失效，请重新登录。");
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
    return sendUnauthorized(res, "登录凭证无效或已过期。");
  }
}
