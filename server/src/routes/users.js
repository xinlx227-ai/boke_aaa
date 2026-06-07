import prismaPkg from "@prisma/client";
import { Router } from "express";
import { comparePassword, hashPassword, sanitizeUser } from "../lib/auth.js";
import { parseDeviceInfo } from "../lib/device.js";
import { prisma } from "../lib/prisma.js";
import {
  SECURITY_AUDIT_EVENTS,
  formatSecurityAuditEvent,
  recordSecurityAuditEvent,
  requestAuditContext
} from "../lib/securityAudit.js";
import { requireAuth } from "../middleware/auth.js";

const { ArticleStatus, CommentStatus, Prisma } = prismaPkg;
const router = Router();

const MAX_PANEL_ITEMS = 50;
const PHONE_PATTERN = /^1[3-9]\d{9}$/;
const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const ARTICLE_METRICS = {
  ARTICLES: "articles",
  VIEWS: "views",
  LIKES: "likes",
  FAVORITES: "favorites"
};

function emptyStats() {
  return {
    viewCount: 0,
    likeCount: 0,
    favoriteCount: 0,
    commentCount: 0,
    likedByMe: false,
    favoritedByMe: true
  };
}

function formatPublicArticle(article, stats = emptyStats()) {
  return {
    id: article.id,
    title: article.title,
    slug: article.slug,
    contentMarkdown: article.contentMarkdown,
    contentHtml: article.contentHtml,
    status: article.status,
    publishedAt: article.publishedAt,
    createdAt: article.createdAt,
    updatedAt: article.updatedAt,
    category: article.category
      ? {
          id: article.category.id,
          name: article.category.name,
          slug: article.category.slug
        }
      : null,
    tags: Array.isArray(article.tags)
      ? article.tags.map((articleTag) => ({
          id: articleTag.tag.id,
          name: articleTag.tag.name,
          slug: articleTag.tag.slug
        }))
      : [],
    author: article.author
      ? {
          id: article.author.id,
          username: article.author.username,
          email: article.author.email,
          role: article.author.role
        }
      : null,
    stats: {
      ...emptyStats(),
      ...stats
    }
  };
}

function compactUser(user) {
  return user
    ? {
        id: Number(user.id),
        username: user.username,
        role: user.role
      }
    : null;
}

function truncateText(value, maxLength = 160) {
  const text = String(value || "").replace(/\s+/g, " ").trim();

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1)}…`;
}

function formatSession(session, currentSessionId) {
  const device = parseDeviceInfo(session.userAgent);

  return {
    id: session.id,
    deviceId: session.deviceId,
    ipAddress: session.ipAddress,
    userAgent: session.userAgent,
    ...device,
    lastActiveAt: session.lastActiveAt,
    createdAt: session.createdAt,
    isCurrent: session.id === currentSessionId
  };
}

function phoneNumberFromInput(value) {
  const phoneNumber = String(value || "").trim();

  return phoneNumber || null;
}

function bindingBoolean(value) {
  return value === true;
}

function formatDashboardDelta(delta, previousTotal) {
  const value = Number(delta || 0);
  const base = Number(previousTotal || 0);
  const tone = value > 0 ? "positive" : value < 0 ? "negative" : "neutral";

  if (value === 0) {
    return {
      value,
      percent: null,
      label: "无变化",
      tone
    };
  }

  if (base > 0) {
    const percent = Math.abs(value / base) * 100;

    if (percent >= 1) {
      return {
        value,
        percent,
        label: `${value > 0 ? "+" : "-"}${percent.toFixed(percent >= 10 ? 0 : 1).replace(/\.0$/, "")}%`,
        tone
      };
    }
  }

  return {
    value,
    percent: null,
    label: `${value > 0 ? "+" : ""}${value}`,
    tone
  };
}

function startOfShanghaiDay(date = new Date()) {
  const shifted = new Date(date.getTime() + SHANGHAI_OFFSET_MS);
  shifted.setUTCHours(0, 0, 0, 0);

  return new Date(shifted.getTime() - SHANGHAI_OFFSET_MS);
}

function addDays(date, days) {
  return new Date(date.getTime() + days * DAY_MS);
}

function formatShanghaiDateKey(date) {
  const shifted = new Date(date.getTime() + SHANGHAI_OFFSET_MS);
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const day = String(shifted.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatShanghaiDayLabel(date) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    weekday: "short"
  }).format(date);
}

function recentShanghaiDayWindows(days = 7) {
  const todayStart = startOfShanghaiDay(new Date());

  return Array.from({ length: days }, (_item, index) => {
    const start = addDays(todayStart, index - days + 1);

    return {
      start,
      end: addDays(start, 1),
      date: formatShanghaiDateKey(start),
      label: formatShanghaiDayLabel(start)
    };
  });
}

async function getUserBindings(userId) {
  const rows = await prisma.$queryRaw`
    SELECT
      phone_number AS phoneNumber,
      wechat_bound AS wechatBound,
      qq_bound AS qqBound,
      alipay_bound AS alipayBound
    FROM users
    WHERE id = ${userId}
    LIMIT 1
  `;
  const bindings = rows[0] || {};

  return {
    phoneNumber: bindings.phoneNumber || null,
    wechatBound: Boolean(bindings.wechatBound),
    qqBound: Boolean(bindings.qqBound),
    alipayBound: Boolean(bindings.alipayBound)
  };
}

function dateValue(value) {
  const time = new Date(value || 0).getTime();
  return Number.isFinite(time) ? time : 0;
}

function interactionMessage(type, actorName, articleTitle) {
  if (type === "reply_to_my_comment") {
    return `${actorName}回复了你的评论`;
  }

  if (type === "comment_on_my_article") {
    return `${actorName}评论了你的文章《${articleTitle}》`;
  }

  if (type === "like_my_article") {
    return `${actorName}点赞了你的文章《${articleTitle}》`;
  }

  if (type === "favorite_my_article") {
    return `${actorName}收藏了你的文章《${articleTitle}》`;
  }

  return `${actorName}点赞了你的评论`;
}

function notificationKeyFromRow(row) {
  return `${row.type}:${Number(row.eventId)}:${Number(row.actorId || 0)}`;
}

function mapInteraction(row) {
  const type = row.type;
  const actor = compactUser({
    id: row.actorId,
    username: row.actorUsername,
    role: row.actorRole
  });
  const article = {
    id: Number(row.articleId),
    title: row.articleTitle,
    slug: row.articleSlug
  };
  const notificationKey = row.notificationKey || notificationKeyFromRow(row);

  return {
    id: notificationKey,
    notificationKey,
    type,
    message: interactionMessage(type, actor?.username || "用户", article.title),
    createdAt: row.createdAt,
    isRead: Boolean(row.readAt),
    readAt: row.readAt || null,
    actor,
    article,
    commentId: row.commentId == null ? null : Number(row.commentId)
  };
}

async function getInteractionRows(userId, tx = prisma) {
  const rows = await tx.$queryRaw`
    SELECT
      interactions.*,
      CONCAT(interactions.type, ':', interactions.eventId, ':', interactions.actorId) AS notificationKey,
      unr.read_at AS readAt
    FROM (
      SELECT
        c.id AS eventId,
        CASE
          WHEN target.user_id = ${userId} THEN 'reply_to_my_comment'
          ELSE 'comment_on_my_article'
        END AS type,
        c.created_at AS createdAt,
        c.id AS commentId,
        actor.id AS actorId,
        actor.username AS actorUsername,
        actor.role AS actorRole,
        a.id AS articleId,
        a.title AS articleTitle,
        a.slug AS articleSlug
      FROM comments c
      INNER JOIN articles a ON a.id = c.article_id
      INNER JOIN users actor ON actor.id = c.user_id
      LEFT JOIN comments target ON target.id = c.reply_to_comment_id
      WHERE c.user_id <> ${userId}
        AND c.status = ${CommentStatus.APPROVED}
        AND a.status = ${ArticleStatus.PUBLISHED}
        AND (
          target.user_id = ${userId}
          OR (a.author_id = ${userId} AND (target.user_id IS NULL OR target.user_id <> ${userId}))
        )
      UNION ALL
      SELECT
        al.article_id AS eventId,
        'like_my_article' AS type,
        al.created_at AS createdAt,
        NULL AS commentId,
        actor.id AS actorId,
        actor.username AS actorUsername,
        actor.role AS actorRole,
        a.id AS articleId,
        a.title AS articleTitle,
        a.slug AS articleSlug
      FROM article_likes al
      INNER JOIN articles a ON a.id = al.article_id
      INNER JOIN users actor ON actor.id = al.user_id
      WHERE a.author_id = ${userId}
        AND a.status = ${ArticleStatus.PUBLISHED}
        AND al.user_id <> ${userId}
      UNION ALL
      SELECT
        af.article_id AS eventId,
        'favorite_my_article' AS type,
        af.created_at AS createdAt,
        NULL AS commentId,
        actor.id AS actorId,
        actor.username AS actorUsername,
        actor.role AS actorRole,
        a.id AS articleId,
        a.title AS articleTitle,
        a.slug AS articleSlug
      FROM article_favorites af
      INNER JOIN articles a ON a.id = af.article_id
      INNER JOIN users actor ON actor.id = af.user_id
      WHERE a.author_id = ${userId}
        AND a.status = ${ArticleStatus.PUBLISHED}
        AND af.user_id <> ${userId}
      UNION ALL
      SELECT
        cl.comment_id AS eventId,
        'like_my_comment' AS type,
        cl.created_at AS createdAt,
        c.id AS commentId,
        actor.id AS actorId,
        actor.username AS actorUsername,
        actor.role AS actorRole,
        a.id AS articleId,
        a.title AS articleTitle,
        a.slug AS articleSlug
      FROM comment_likes cl
      INNER JOIN comments c ON c.id = cl.comment_id
      INNER JOIN articles a ON a.id = c.article_id
      INNER JOIN users actor ON actor.id = cl.user_id
      WHERE c.user_id = ${userId}
        AND c.parent_id IS NULL
        AND c.status = ${CommentStatus.APPROVED}
        AND a.status = ${ArticleStatus.PUBLISHED}
        AND cl.user_id <> ${userId}
    ) interactions
    LEFT JOIN user_notification_reads unr
      ON unr.user_id = ${userId}
      AND unr.notification_key = CONCAT(interactions.type, ':', interactions.eventId, ':', interactions.actorId)
    ORDER BY interactions.createdAt DESC
    LIMIT ${MAX_PANEL_ITEMS}
  `;

  return rows;
}

async function upsertNotificationRead(userId, notificationKey, tx = prisma) {
  await tx.$executeRaw`
    INSERT INTO user_notification_reads (user_id, notification_key, read_at, created_at, updated_at)
    VALUES (${userId}, ${notificationKey}, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))
    ON DUPLICATE KEY UPDATE
      read_at = CURRENT_TIMESTAMP(3),
      updated_at = CURRENT_TIMESTAMP(3)
  `;
}

function summarizeBindingChanges(previousBindings, nextBindings) {
  const fields = ["phoneNumber", "wechatBound", "qqBound", "alipayBound"];

  return fields
    .filter((field) => previousBindings[field] !== nextBindings[field])
    .reduce((changes, field) => {
      changes[field] = {
        from: previousBindings[field],
        to: nextBindings[field]
      };

      return changes;
    }, {});
}

async function getStatsByArticleIds(articleIds, currentUserId) {
  if (articleIds.length === 0) {
    return new Map();
  }

  const [statsRows, commentRows, likedRows, favoritedRows] = await Promise.all([
    prisma.$queryRaw`
      SELECT
        article_id AS articleId,
        view_count AS viewCount,
        like_count AS likeCount,
        favorite_count AS favoriteCount
      FROM article_stats
      WHERE article_id IN (${Prisma.join(articleIds)})
    `,
    prisma.comment.groupBy({
      by: ["articleId"],
      where: {
        articleId: {
          in: articleIds
        },
        status: CommentStatus.APPROVED
      },
      _count: {
        _all: true
      }
    }),
    prisma.articleLike.findMany({
      where: {
        articleId: {
          in: articleIds
        },
        userId: currentUserId
      },
      select: {
        articleId: true
      }
    }),
    prisma.articleFavorite.findMany({
      where: {
        articleId: {
          in: articleIds
        },
        userId: currentUserId
      },
      select: {
        articleId: true
      }
    })
  ]);
  const rawStats = new Map(statsRows.map((item) => [Number(item.articleId), item]));
  const comments = new Map(commentRows.map((item) => [item.articleId, item._count._all]));
  const liked = new Set(likedRows.map((item) => item.articleId));
  const favorited = new Set(favoritedRows.map((item) => item.articleId));
  const statsByArticleId = new Map();

  for (const articleId of articleIds) {
    const stats = rawStats.get(articleId);
    statsByArticleId.set(articleId, {
      viewCount: Number(stats?.viewCount || 0),
      likeCount: Number(stats?.likeCount || 0),
      favoriteCount: Number(stats?.favoriteCount || 0),
      commentCount: comments.get(articleId) || 0,
      likedByMe: liked.has(articleId),
      favoritedByMe: favorited.has(articleId)
    });
  }

  return statsByArticleId;
}

async function getInteractionCount(userId) {
  const rows = await prisma.$queryRaw`
    SELECT COUNT(*) AS count
    FROM (
      SELECT c.id
      FROM comments c
      INNER JOIN articles a ON a.id = c.article_id
      WHERE c.user_id <> ${userId}
        AND c.status = ${CommentStatus.APPROVED}
        AND a.status = ${ArticleStatus.PUBLISHED}
        AND (
          a.author_id = ${userId}
          OR EXISTS (
            SELECT 1
            FROM comments target
            WHERE target.id = c.reply_to_comment_id
              AND target.user_id = ${userId}
          )
        )
      UNION ALL
      SELECT al.article_id
      FROM article_likes al
      INNER JOIN articles a ON a.id = al.article_id
      WHERE a.author_id = ${userId}
        AND a.status = ${ArticleStatus.PUBLISHED}
        AND al.user_id <> ${userId}
      UNION ALL
      SELECT af.article_id
      FROM article_favorites af
      INNER JOIN articles a ON a.id = af.article_id
      WHERE a.author_id = ${userId}
        AND a.status = ${ArticleStatus.PUBLISHED}
        AND af.user_id <> ${userId}
      UNION ALL
      SELECT cl.comment_id
      FROM comment_likes cl
      INNER JOIN comments c ON c.id = cl.comment_id
      INNER JOIN articles a ON a.id = c.article_id
      WHERE c.user_id = ${userId}
        AND c.parent_id IS NULL
        AND c.status = ${CommentStatus.APPROVED}
        AND a.status = ${ArticleStatus.PUBLISHED}
        AND cl.user_id <> ${userId}
    ) events
  `;

  return Number(rows[0]?.count || 0);
}

async function getAuthorReadTrend(userId) {
  const windows = recentShanghaiDayWindows();
  const firstWindow = windows[0];
  const lastWindow = windows[windows.length - 1];
  const rows = await prisma.$queryRaw`
    SELECT
      DATE_FORMAT(DATE_ADD(av.viewed_at, INTERVAL 8 HOUR), '%Y-%m-%d') AS dateKey,
      COUNT(*) AS value
    FROM article_views av
    INNER JOIN articles a ON a.id = av.article_id
    WHERE a.author_id = ${userId}
      AND a.status = ${ArticleStatus.PUBLISHED}
      AND av.viewed_at >= ${firstWindow.start}
      AND av.viewed_at < ${lastWindow.end}
    GROUP BY dateKey
  `;
  const valuesByDate = new Map(rows.map((row) => [String(row.dateKey), Number(row.value || 0)]));

  return windows.map((window) => ({
    date: window.date,
    label: window.label,
    value: valuesByDate.get(window.date) || 0
  }));
}

async function getAuthorCategoryDistribution(userId) {
  const rows = await prisma.$queryRaw`
    SELECT
      COALESCE(c.name, '未分类') AS name,
      COUNT(*) AS value
    FROM articles a
    LEFT JOIN categories c ON c.id = a.category_id
    WHERE a.author_id = ${userId}
    GROUP BY COALESCE(c.name, '未分类')
    ORDER BY value DESC, name ASC
    LIMIT 6
  `;

  return rows.map((row) => ({
    name: row.name,
    value: Number(row.value || 0)
  }));
}

async function getDashboardDeltas(userId, currentTotals) {
  const todayStart = startOfShanghaiDay(new Date());
  const tomorrowStart = addDays(todayStart, 1);
  const metrics = [
    ARTICLE_METRICS.ARTICLES,
    ARTICLE_METRICS.VIEWS,
    ARTICLE_METRICS.LIKES,
    ARTICLE_METRICS.FAVORITES
  ];
  const rows = await prisma.$queryRaw`
    SELECT
      metric,
      COALESCE(SUM(delta), 0) AS value
    FROM article_metric_events
    WHERE user_id = ${userId}
      AND metric IN (${Prisma.join(metrics)})
      AND occurred_at >= ${todayStart}
      AND occurred_at < ${tomorrowStart}
    GROUP BY metric
  `;
  const todayDeltas = new Map(rows.map((row) => [String(row.metric), Number(row.value || 0)]));

  return {
    articleCount: formatDashboardDelta(todayDeltas.get(ARTICLE_METRICS.ARTICLES) || 0, currentTotals.articleCount - (todayDeltas.get(ARTICLE_METRICS.ARTICLES) || 0)),
    viewCount: formatDashboardDelta(todayDeltas.get(ARTICLE_METRICS.VIEWS) || 0, currentTotals.viewCount - (todayDeltas.get(ARTICLE_METRICS.VIEWS) || 0)),
    likeCount: formatDashboardDelta(todayDeltas.get(ARTICLE_METRICS.LIKES) || 0, currentTotals.likeCount - (todayDeltas.get(ARTICLE_METRICS.LIKES) || 0)),
    favoriteCount: formatDashboardDelta(todayDeltas.get(ARTICLE_METRICS.FAVORITES) || 0, currentTotals.favoriteCount - (todayDeltas.get(ARTICLE_METRICS.FAVORITES) || 0))
  };
}

router.get("/me/summary", requireAuth, async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const [
      articleCount,
      favoriteCount,
      commentCount,
      activeSessionCount,
      interactionCount,
      authorStatsRows,
      readTrend,
      categoryDistribution,
      bindings
    ] = await Promise.all([
      prisma.article.count({
        where: {
          authorId: userId
        }
      }),
      prisma.articleFavorite.count({
        where: {
          userId,
          article: {
            status: ArticleStatus.PUBLISHED
          }
        }
      }),
      prisma.comment.count({
        where: {
          userId: {
            not: userId
          },
          status: CommentStatus.APPROVED,
          article: {
            authorId: userId,
            status: ArticleStatus.PUBLISHED
          }
        }
      }),
      prisma.userSession.count({
        where: {
          userId,
          isActive: true
        }
      }),
      getInteractionCount(userId),
      prisma.$queryRaw`
        SELECT
          COALESCE(SUM(s.view_count), 0) AS viewCount,
          COALESCE(SUM(s.like_count), 0) AS likeCount,
          COALESCE(SUM(s.favorite_count), 0) AS favoriteCount
        FROM articles a
        LEFT JOIN article_stats s ON s.article_id = a.id
        WHERE a.author_id = ${userId}
          AND a.status = ${ArticleStatus.PUBLISHED}
      `,
      getAuthorReadTrend(userId),
      getAuthorCategoryDistribution(userId),
      getUserBindings(userId)
    ]);
    const authorStats = authorStatsRows[0] || {};
    const totals = {
      articleCount,
      viewCount: Number(authorStats.viewCount || 0),
      likeCount: Number(authorStats.likeCount || 0),
      favoriteCount: Number(authorStats.favoriteCount || 0)
    };
    const deltas = await getDashboardDeltas(userId, totals);

    return res.json({
      summary: {
        articleCount: totals.articleCount,
        viewCount: totals.viewCount,
        likeCount: totals.likeCount,
        favoriteCount: totals.favoriteCount,
        savedFavoriteCount: favoriteCount,
        commentCount,
        interactionCount,
        activeSessionCount,
        deltas,
        readTrend,
        categoryDistribution,
        bindings: {
          phoneNumber: bindings.phoneNumber,
          wechatBound: bindings.wechatBound,
          qqBound: bindings.qqBound,
          alipayBound: bindings.alipayBound
        }
      }
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/me/favorites", requireAuth, async (req, res, next) => {
  try {
    const favorites = await prisma.articleFavorite.findMany({
      where: {
        userId: req.auth.userId,
        article: {
          status: ArticleStatus.PUBLISHED
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: MAX_PANEL_ITEMS,
      include: {
        article: {
          include: {
            author: true,
            category: true,
            tags: {
              include: {
                tag: true
              }
            }
          }
        }
      }
    });
    const articleIds = favorites.map((favorite) => favorite.articleId);
    const statsByArticleId = await getStatsByArticleIds(articleIds, req.auth.userId);

    return res.json({
      favorites: favorites.map((favorite) => ({
        favoritedAt: favorite.createdAt,
        article: formatPublicArticle(favorite.article, statsByArticleId.get(favorite.articleId))
      }))
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/me/comments", requireAuth, async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const comments = await prisma.comment.findMany({
      where: {
        userId: {
          not: userId
        },
        status: CommentStatus.APPROVED,
        article: {
          authorId: userId,
          status: ArticleStatus.PUBLISHED
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: MAX_PANEL_ITEMS,
      include: {
        article: {
          select: {
            id: true,
            title: true,
            slug: true
          }
        },
        replyTo: {
          include: {
            user: true
          }
        },
        user: true
      }
    });

    return res.json({
      comments: comments.map((comment) => ({
        id: comment.id,
        articleId: comment.articleId,
        parentId: comment.parentId,
        replyToCommentId: comment.replyToCommentId,
        type: comment.parentId ? "reply" : "comment",
        content: comment.content,
        excerpt: truncateText(comment.content),
        createdAt: comment.createdAt,
        article: comment.article,
        author: compactUser(comment.user),
        replyToUser: compactUser(comment.replyTo?.user)
      }))
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/me/interactions", requireAuth, async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const rows = await getInteractionRows(userId);
    const interactions = rows.map(mapInteraction);

    return res.json({
      interactions,
      unreadCount: interactions.filter((interaction) => !interaction.isRead).length
    });
  } catch (error) {
    return next(error);
  }
});

router.patch("/me/interactions/read-all", requireAuth, async (req, res, next) => {
  try {
    const rows = await getInteractionRows(req.auth.userId);
    const notificationKeys = [...new Set(rows.map((row) => row.notificationKey || notificationKeyFromRow(row)))];

    await prisma.$transaction(
      notificationKeys.map((notificationKey) => prisma.$executeRaw`
        INSERT INTO user_notification_reads (user_id, notification_key, read_at, created_at, updated_at)
        VALUES (${req.auth.userId}, ${notificationKey}, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))
        ON DUPLICATE KEY UPDATE
          read_at = CURRENT_TIMESTAMP(3),
          updated_at = CURRENT_TIMESTAMP(3)
      `)
    );

    return res.json({
      ok: true,
      changed: notificationKeys.length
    });
  } catch (error) {
    return next(error);
  }
});

router.patch("/me/interactions/:key/read", requireAuth, async (req, res, next) => {
  try {
    const notificationKey = String(req.params.key || "").trim();

    if (!notificationKey) {
      return res.status(400).json({
        message: "通知标识无效。"
      });
    }

    const rows = await getInteractionRows(req.auth.userId);
    const exists = rows.some((row) => (row.notificationKey || notificationKeyFromRow(row)) === notificationKey);

    if (!exists) {
      return res.status(404).json({
        message: "通知不存在或不可访问。"
      });
    }

    await upsertNotificationRead(req.auth.userId, notificationKey);

    return res.json({
      ok: true,
      notificationKey
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/me/sessions", requireAuth, async (req, res, next) => {
  try {
    const sessions = await prisma.userSession.findMany({
      where: {
        userId: req.auth.userId,
        isActive: true
      },
      orderBy: {
        lastActiveAt: "desc"
      }
    });

    return res.json({
      sessions: sessions.map((session) => formatSession(session, req.auth.sessionId))
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/me/security-events", requireAuth, async (req, res, next) => {
  try {
    const rows = await prisma.$queryRaw`
      SELECT
        id,
        event_type AS eventType,
        ip_address AS ipAddress,
        user_agent AS userAgent,
        metadata,
        created_at AS createdAt
      FROM security_audit_events
      WHERE user_id = ${req.auth.userId}
      ORDER BY created_at DESC
      LIMIT 5
    `;

    return res.json({
      events: rows.map(formatSecurityAuditEvent)
    });
  } catch (error) {
    return next(error);
  }
});

router.delete("/me/sessions/:id", requireAuth, async (req, res, next) => {
  try {
    const sessionId = Number(req.params.id);

    if (!Number.isInteger(sessionId) || sessionId <= 0) {
      return res.status(400).json({
        message: "会话 ID 无效。"
      });
    }

    const auditContext = requestAuditContext(req);
    const result = await prisma.$transaction(async (tx) => {
      const updateResult = await tx.userSession.updateMany({
        where: {
          id: sessionId,
          userId: req.auth.userId,
          isActive: true
        },
        data: {
          isActive: false
        }
      });

      if (updateResult.count > 0) {
        await recordSecurityAuditEvent(
          {
            userId: req.auth.userId,
            sessionId: req.auth.sessionId,
            eventType: SECURITY_AUDIT_EVENTS.SESSION_REVOKED,
            ...auditContext,
            metadata: {
              revokedSessionId: sessionId,
              revokedCurrentSession: sessionId === req.auth.sessionId
            }
          },
          tx
        );
      }

      return updateResult;
    });

    return res.json({
      ok: true,
      changed: result.count > 0,
      loggedOutCurrent: sessionId === req.auth.sessionId
    });
  } catch (error) {
    return next(error);
  }
});

router.patch("/me/password", requireAuth, async (req, res, next) => {
  try {
    const currentPassword = String(req.body?.currentPassword || "");
    const newPassword = String(req.body?.newPassword || "");
    const confirmPassword = String(req.body?.confirmPassword || "");

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        message: "请填写当前密码、新密码和确认密码。"
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        message: "两次输入的新密码不一致。"
      });
    }

    if (newPassword.length < 8 || newPassword.length > 72) {
      return res.status(400).json({
        message: "新密码长度必须在 8 到 72 个字符之间。"
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        id: req.auth.userId
      }
    });

    if (!user || !(await comparePassword(currentPassword, user.passwordHash))) {
      return res.status(401).json({
        message: "当前密码错误。"
      });
    }

    const passwordHash = await hashPassword(newPassword);
    const auditContext = requestAuditContext(req);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: {
          id: req.auth.userId
        },
        data: {
          passwordHash
        }
      });
      const deactivatedSessions = await tx.userSession.updateMany({
        where: {
          userId: req.auth.userId,
          isActive: true,
          id: {
            not: req.auth.sessionId
          }
        },
        data: {
          isActive: false
        }
      });
      await recordSecurityAuditEvent(
        {
          userId: req.auth.userId,
          sessionId: req.auth.sessionId,
          eventType: SECURITY_AUDIT_EVENTS.PASSWORD_CHANGED,
          ...auditContext,
          metadata: {
            deactivatedSessionCount: deactivatedSessions.count
          }
        },
        tx
      );
    });

    return res.json({
      ok: true,
      message: "密码已更新，其他设备已退出登录。"
    });
  } catch (error) {
    return next(error);
  }
});

router.patch("/me/bindings", requireAuth, async (req, res, next) => {
  try {
    const phoneNumber = phoneNumberFromInput(req.body?.phoneNumber);

    if (phoneNumber && !PHONE_PATTERN.test(phoneNumber)) {
      return res.status(400).json({
        message: "请输入有效的中国大陆手机号。"
      });
    }

    const duplicateRows = phoneNumber
      ? await prisma.$queryRaw`
          SELECT id
          FROM users
          WHERE phone_number = ${phoneNumber}
            AND id <> ${req.auth.userId}
          LIMIT 1
        `
      : [];

    if (duplicateRows.length > 0) {
      return res.status(409).json({
        message: "该手机号已被其他账号绑定。"
      });
    }

    const previousBindings = await getUserBindings(req.auth.userId);
    const nextBindings = {
      phoneNumber,
      wechatBound: bindingBoolean(req.body?.wechatBound),
      qqBound: bindingBoolean(req.body?.qqBound),
      alipayBound: bindingBoolean(req.body?.alipayBound)
    };
    const bindingChanges = summarizeBindingChanges(previousBindings, nextBindings);
    const auditContext = requestAuditContext(req);

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        UPDATE users
        SET
          phone_number = ${nextBindings.phoneNumber},
          wechat_bound = ${nextBindings.wechatBound},
          qq_bound = ${nextBindings.qqBound},
          alipay_bound = ${nextBindings.alipayBound},
          updated_at = CURRENT_TIMESTAMP(3)
        WHERE id = ${req.auth.userId}
      `;

      if (Object.keys(bindingChanges).length > 0) {
        await recordSecurityAuditEvent(
          {
            userId: req.auth.userId,
            sessionId: req.auth.sessionId,
            eventType: SECURITY_AUDIT_EVENTS.BINDINGS_UPDATED,
            ...auditContext,
            metadata: {
              changes: bindingChanges
            }
          },
          tx
        );
      }
    });

    const user = await prisma.user.findUnique({
      where: {
        id: req.auth.userId
      }
    });
    const bindings = await getUserBindings(req.auth.userId);

    return res.json({
      user: {
        ...sanitizeUser(user),
        ...bindings
      },
      bindings
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return res.status(409).json({
        message: "该手机号已被其他账号绑定。"
      });
    }

    return next(error);
  }
});

export default router;
