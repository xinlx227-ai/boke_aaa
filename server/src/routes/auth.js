import prismaPkg from "@prisma/client";
import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import {
  MAX_ACTIVE_SESSIONS,
  comparePassword,
  generateDeviceId,
  generateTokenId,
  hashPassword,
  hashTokenId,
  sanitizeUser,
  signAccessToken
} from "../lib/auth.js";
import { requireAuth } from "../middleware/auth.js";
import { SECURITY_AUDIT_EVENTS, recordSecurityAuditEvent, requestAuditContext } from "../lib/securityAudit.js";

const { Prisma } = prismaPkg;
const router = Router();

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizeUsername(username) {
  return String(username || "").trim();
}

function normalizeAccount(account) {
  return String(account || "").trim();
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

function validateRegistrationInput({ username, email, password }) {
  if (username.length < 3 || username.length > 50) {
    return "用户名长度必须在 3 到 50 个字符之间。";
  }

  if (!/^[\w-]+$/u.test(username)) {
    return "用户名只能包含字母、数字、下划线和连字符。";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) {
    return "请输入有效的电子邮箱地址。";
  }

  if (password.length < 8 || password.length > 72) {
    return "密码长度必须在 8 到 72 个字符之间。";
  }

  return null;
}

router.post("/register", async (req, res, next) => {
  try {
    const username = normalizeUsername(req.body?.username);
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");
    const validationError = validateRegistrationInput({ username, email, password });

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash
      }
    });

    return res.status(201).json({
      message: "注册成功。",
      user: sanitizeUser(user)
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return res.status(409).json({
        message: "用户名或邮箱已存在。"
      });
    }

    return next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const account = normalizeAccount(req.body?.account);
    const password = String(req.body?.password || "");

    if (!account && !password) {
      return res.status(400).json({
        message: "请输入用户名或邮箱和密码。"
      });
    }

    if (!account) {
      return res.status(400).json({
        message: "请输入用户名或邮箱。"
      });
    }

    if (!password) {
      return res.status(400).json({
        message: "请输入密码。"
      });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          {
            username: account
          },
          {
            email: account.toLowerCase()
          }
        ]
      }
    });

    if (!user) {
      return res.status(401).json({
        message: "用户名/邮箱或密码错误。"
      });
    }

    const auditContext = requestAuditContext(req);
    const passwordIsValid = await comparePassword(password, user.passwordHash);

    if (!passwordIsValid) {
      try {
        await recordSecurityAuditEvent({
          userId: user.id,
          eventType: SECURITY_AUDIT_EVENTS.LOGIN_FAILED,
          ...auditContext,
          metadata: {
            account
          }
        });
      } catch (_error) {
        // Login failure audit is best-effort so failed writes do not leak behavior.
      }

      return res.status(401).json({
        message: "用户名/邮箱或密码错误。"
      });
    }

    if (await userIsDisabled(user.id)) {
      return res.status(403).json({
        message: "账号已被禁用，请联系管理员。"
      });
    }

    const deviceId = generateDeviceId();
    const tokenId = generateTokenId();
    const tokenHash = hashTokenId(tokenId);
    const ipAddress = auditContext.ipAddress;
    const userAgent = auditContext.userAgent;

    const session = await prisma.$transaction(async (tx) => {
      const createdSession = await tx.userSession.create({
        data: {
          userId: user.id,
          deviceId,
          ipAddress,
          userAgent,
          tokenHash,
          lastActiveAt: new Date()
        }
      });

      const activeSessions = await tx.userSession.findMany({
        where: {
          userId: user.id,
          isActive: true
        },
        orderBy: [
          {
            lastActiveAt: "asc"
          },
          {
            createdAt: "asc"
          }
        ],
        select: {
          id: true
        }
      });

      if (activeSessions.length > MAX_ACTIVE_SESSIONS) {
        const sessionIdsToDeactivate = activeSessions
          .slice(0, activeSessions.length - MAX_ACTIVE_SESSIONS)
          .map((item) => item.id);

        await tx.userSession.updateMany({
          where: {
            id: {
              in: sessionIdsToDeactivate
            }
          },
          data: {
            isActive: false
          }
        });
      }

      await recordSecurityAuditEvent(
        {
          userId: user.id,
          sessionId: createdSession.id,
          eventType: SECURITY_AUDIT_EVENTS.LOGIN_SUCCESS,
          ipAddress,
          userAgent,
          metadata: {
            deactivatedSessionCount:
              activeSessions.length > MAX_ACTIVE_SESSIONS ? activeSessions.length - MAX_ACTIVE_SESSIONS : 0
          }
        },
        tx
      );

      return createdSession;
    });

    const token = signAccessToken({
      userId: user.id,
      sessionId: session.id,
      deviceId,
      role: user.role,
      tokenId
    });

    return res.json({
      token,
      deviceId,
      user: sanitizeUser(user)
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/me", requireAuth, async (req, res) => {
  return res.json({
    user: req.user,
    session: {
      id: req.auth.sessionId,
      deviceId: req.auth.deviceId
    }
  });
});

router.post("/logout", requireAuth, async (req, res, next) => {
  try {
    const auditContext = requestAuditContext(req);

    await prisma.userSession.updateMany({
      where: {
        id: req.auth.sessionId,
        userId: req.auth.userId,
        isActive: true
      },
      data: {
        isActive: false
      }
    });

    try {
      await recordSecurityAuditEvent({
        userId: req.auth.userId,
        sessionId: req.auth.sessionId,
        eventType: SECURITY_AUDIT_EVENTS.LOGOUT,
        ...auditContext
      });
    } catch (_error) {
      // Logout should not be blocked if best-effort audit logging fails.
    }

    return res.json({
      ok: true
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
