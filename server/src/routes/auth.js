import prismaPkg from "@prisma/client";
import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import {
  MAX_ACTIVE_SESSIONS,
  comparePassword,
  generateDeviceId,
  generateTokenId,
  getRequestIp,
  hashPassword,
  hashTokenId,
  sanitizeUser,
  signAccessToken,
  trimUserAgent
} from "../lib/auth.js";
import { requireAuth } from "../middleware/auth.js";

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

    const passwordIsValid = await comparePassword(password, user.passwordHash);

    if (!passwordIsValid) {
      return res.status(401).json({
        message: "用户名/邮箱或密码错误。"
      });
    }

    const deviceId = generateDeviceId();
    const tokenId = generateTokenId();
    const tokenHash = hashTokenId(tokenId);
    const ipAddress = getRequestIp(req);
    const userAgent = trimUserAgent(req.headers["user-agent"]);

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

    return res.json({
      ok: true
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
