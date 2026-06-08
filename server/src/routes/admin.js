import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import prismaPkg from "@prisma/client";
import { Router } from "express";
import {
  COMMENT_MODERATION_STATUS,
  detectCommentModeration,
  formatCommentModeration
} from "../lib/commentModeration.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/role.js";

const { ArticleStatus, CommentStatus, Prisma } = prismaPkg;
const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsRoot = path.resolve(__dirname, "../../uploads/articles");
const draftUploadsRoot = path.resolve(__dirname, "../../uploads/article-drafts");
const ADMIN_ARTICLE_STATUSES = new Set([ArticleStatus.PUBLISHED, ArticleStatus.ARCHIVED]);
const ARTICLE_METRIC = {
  ARTICLES: "articles"
};

router.use(requireAuth, requireRole("ADMIN"));

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeName(value) {
  return String(value || "").trim().slice(0, 80);
}

function normalizeSearch(value) {
  return String(value || "").trim();
}

function requireConfirmation(actual, provided, label) {
  if (String(provided || "").trim() !== String(actual || "").trim()) {
    return `${label}确认文本不匹配。`;
  }

  return null;
}

function prismaUniqueMessage(error, message) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return {
      status: 409,
      body: {
        message
      }
    };
  }

  return null;
}

function formatAdminUser(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    phoneNumber: user.phoneNumber ?? null,
    role: user.role,
    isDisabled: Boolean(user.isDisabled ?? user._adminIsDisabled),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    stats: {
      articleCount: user._count?.articles || 0,
      commentCount: user._count?.comments || 0,
      likeCount: (user._count?.articleLikes || 0) + (user._count?.commentLikes || 0),
      favoriteCount: user._count?.articleFavorites || 0,
      activeSessionCount: user._count?.sessions || 0
    }
  };
}

async function getDisabledStatesByUserId(userIds) {
  const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));

  if (uniqueUserIds.length === 0) {
    return new Map();
  }

  const rows = await prisma.$queryRaw`
    SELECT id, is_disabled AS isDisabled
    FROM users
    WHERE id IN (${Prisma.join(uniqueUserIds)})
  `;

  return new Map(rows.map((row) => [Number(row.id), Boolean(row.isDisabled)]));
}

async function userWithAdminState(user) {
  if (!user?.id) {
    return user;
  }

  const disabledStates = await getDisabledStatesByUserId([user.id]);

  return {
    ...user,
    _adminIsDisabled: disabledStates.get(user.id) || false
  };
}

function articleInclude() {
  return {
    author: true,
    category: true,
    tags: {
      include: {
        tag: true
      }
    },
    stats: true
  };
}

function emptyArticleStats() {
  return {
    viewCount: 0,
    likeCount: 0,
    favoriteCount: 0,
    commentCount: 0
  };
}

function formatAdminArticle(article) {
  return {
    id: article.id,
    title: article.title,
    slug: article.slug,
    contentMarkdown: article.contentMarkdown,
    contentHtml: article.contentHtml,
    coverImageUrl: article.coverImageUrl || null,
    coverAlt: article.coverAlt || null,
    coverRatio: article.coverRatio || "16:9",
    seoTitle: article.seoTitle || null,
    seoKeywords: article.seoKeywords || null,
    seoDescription: article.seoDescription || null,
    allowComments: article.allowComments !== false,
    isPinned: Boolean(article.isPinned),
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
      ...emptyArticleStats(),
      ...(article.stats || {}),
      commentCount: article._count?.comments || 0
    }
  };
}

function rowUser(row, prefix) {
  const id = row[`${prefix}Id`];

  if (!id) {
    return null;
  }

  return {
    id: Number(id),
    username: row[`${prefix}Username`],
    email: row[`${prefix}Email`] || null,
    role: row[`${prefix}Role`]
  };
}

function formatAdminModerationComment(row) {
  const parentId = row.parentId == null ? null : Number(row.parentId);

  return {
    id: Number(row.id),
    articleId: Number(row.articleId),
    parentId,
    replyToCommentId: row.replyToCommentId == null ? null : Number(row.replyToCommentId),
    type: parentId ? "reply" : "comment",
    content: row.content,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    moderation: formatCommentModeration(row),
    author: rowUser(row, "author"),
    replyToUser: rowUser(row, "replyToUser"),
    article: {
      id: Number(row.articleId),
      title: row.articleTitle,
      slug: row.articleSlug
    }
  };
}

async function recordArticleMetricEvent({ articleId, userId, delta }, tx = prisma) {
  await tx.articleMetricEvent.create({
    data: {
      articleId,
      userId,
      metric: ARTICLE_METRIC.ARTICLES,
      delta
    }
  });
}

function cleanupArticleUploads(articleIds) {
  for (const articleId of articleIds) {
    const articleDirectory = path.join(uploadsRoot, String(articleId));

    if (fs.existsSync(articleDirectory)) {
      fs.rmSync(articleDirectory, {
        recursive: true,
        force: true
      });
    }
  }
}

function cleanupDraftUploads(userId) {
  const draftDirectory = path.join(draftUploadsRoot, String(userId));

  if (fs.existsSync(draftDirectory)) {
    fs.rmSync(draftDirectory, {
      recursive: true,
      force: true
    });
  }
}

async function findAdminManagedArticle(articleId) {
  return prisma.article.findFirst({
    where: {
      id: articleId,
      status: {
        in: [ArticleStatus.PUBLISHED, ArticleStatus.ARCHIVED]
      }
    },
    include: {
      ...articleInclude(),
      _count: {
        select: {
          comments: true
        }
      }
    }
  });
}

async function flagMatchedComments(comments, tx = prisma) {
  const flagged = [];

  for (const comment of comments) {
    const moderation = detectCommentModeration(comment.content);

    if (!moderation) {
      continue;
    }

    await tx.$executeRaw`
      UPDATE comments
      SET moderation_status = ${COMMENT_MODERATION_STATUS.FLAGGED},
          moderation_reason = ${moderation.reasonText},
          moderation_keywords = ${moderation.keywordText},
          moderated_at = NULL,
          moderator_id = NULL,
          updated_at = updated_at
      WHERE id = ${comment.id}
        AND moderation_status IS NULL
    `;
    flagged.push(comment.id);
  }

  return flagged;
}

async function backfillSensitiveComments() {
  const candidates = await prisma.$queryRaw`
    SELECT id, content
    FROM comments
    WHERE status = ${CommentStatus.APPROVED}
      AND moderation_status IS NULL
    ORDER BY created_at DESC, id DESC
    LIMIT 200
  `;

  return flagMatchedComments(candidates.map((comment) => ({
    id: Number(comment.id),
    content: comment.content
  })));
}

async function loadFlaggedSensitiveComments() {
  const rows = await prisma.$queryRaw`
    SELECT
      c.id,
      c.article_id AS articleId,
      c.user_id AS userId,
      c.parent_id AS parentId,
      c.reply_to_comment_id AS replyToCommentId,
      c.content,
      c.status,
      c.moderation_status AS moderationStatus,
      c.moderation_reason AS moderationReason,
      c.moderation_keywords AS moderationKeywords,
      c.moderated_at AS moderatedAt,
      c.moderator_id AS moderatorId,
      c.created_at AS createdAt,
      c.updated_at AS updatedAt,
      a.title AS articleTitle,
      a.slug AS articleSlug,
      author.id AS authorId,
      author.username AS authorUsername,
      author.email AS authorEmail,
      author.role AS authorRole,
      reply_user.id AS replyToUserId,
      reply_user.username AS replyToUserUsername,
      reply_user.email AS replyToUserEmail,
      reply_user.role AS replyToUserRole
    FROM comments c
    INNER JOIN articles a ON a.id = c.article_id
    INNER JOIN users author ON author.id = c.user_id
    LEFT JOIN comments reply_target ON reply_target.id = c.reply_to_comment_id
    LEFT JOIN users reply_user ON reply_user.id = reply_target.user_id
    WHERE c.status = ${CommentStatus.APPROVED}
      AND c.moderation_status = ${COMMENT_MODERATION_STATUS.FLAGGED}
    ORDER BY c.created_at DESC, c.id DESC
    LIMIT 100
  `;

  return rows.map(formatAdminModerationComment);
}

async function deleteCommentWithReplies(commentId, tx = prisma) {
  const comment = await tx.comment.findUnique({
    where: {
      id: commentId
    }
  });

  if (!comment) {
    return null;
  }

  if (!comment.parentId) {
    await tx.comment.deleteMany({
      where: {
        parentId: comment.id
      }
    });
  }

  await tx.comment.delete({
    where: {
      id: comment.id
    }
  });

  return comment;
}

router.get("/comments/moderation", async (_req, res, next) => {
  try {
    const backfilledCommentIds = await backfillSensitiveComments();
    const comments = await loadFlaggedSensitiveComments();

    return res.json({
      comments,
      backfilledCount: backfilledCommentIds.length
    });
  } catch (error) {
    return next(error);
  }
});

router.patch("/comments/:id/moderation/ignore", async (req, res, next) => {
  try {
    const commentId = Number(req.params.id);

    if (!commentId) {
      return res.status(400).json({
        message: "评论 ID 无效。"
      });
    }

    const comments = await prisma.$queryRaw`
      SELECT id, status, moderation_status AS moderationStatus
      FROM comments
      WHERE id = ${commentId}
      LIMIT 1
    `;
    const comment = comments[0];

    if (!comment) {
      return res.status(404).json({
        message: "评论不存在。"
      });
    }

    if (comment.status !== CommentStatus.APPROVED) {
      return res.status(404).json({
        message: "评论不存在。"
      });
    }

    if (comment.moderationStatus !== COMMENT_MODERATION_STATUS.FLAGGED) {
      return res.status(400).json({
        message: "这条评论不在敏感评论队列中。"
      });
    }

    await prisma.$executeRaw`
      UPDATE comments
      SET moderation_status = ${COMMENT_MODERATION_STATUS.IGNORED},
          moderated_at = CURRENT_TIMESTAMP(3),
          moderator_id = ${req.auth.userId}
      WHERE id = ${commentId}
    `;

    return res.json({
      ok: true,
      commentId
    });
  } catch (error) {
    return next(error);
  }
});

router.delete("/comments/:id", async (req, res, next) => {
  try {
    const commentId = Number(req.params.id);

    if (!commentId) {
      return res.status(400).json({
        message: "评论 ID 无效。"
      });
    }

    const comments = await prisma.$queryRaw`
      SELECT id, status, moderation_status AS moderationStatus
      FROM comments
      WHERE id = ${commentId}
      LIMIT 1
    `;
    const comment = comments[0];

    if (!comment) {
      return res.status(404).json({
        message: "评论不存在。"
      });
    }

    if (comment.status !== CommentStatus.APPROVED) {
      return res.status(404).json({
        message: "评论不存在。"
      });
    }

    if (comment.moderationStatus !== COMMENT_MODERATION_STATUS.FLAGGED) {
      return res.status(400).json({
        message: "这条评论不在敏感评论队列中。"
      });
    }

    const deletedComment = await prisma.$transaction((tx) => deleteCommentWithReplies(commentId, tx));

    if (!deletedComment) {
      return res.status(404).json({
        message: "评论不存在。"
      });
    }

    return res.json({
      ok: true,
      deleted: {
        commentId,
        parentId: deletedComment.parentId
      }
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/users", async (req, res, next) => {
  try {
    const query = normalizeSearch(req.query.q);
    const status = normalizeSearch(req.query.status);
    const role = normalizeSearch(req.query.role);
    const where = {
      ...(query
        ? {
            OR: [
              {
                username: {
                  contains: query
                }
              },
              {
                email: {
                  contains: query
                }
              }
            ]
          }
        : {}),
      ...(role === "ADMIN" || role === "USER" ? { role } : {})
    };

    const rawUsers = await prisma.user.findMany({
      where,
      orderBy: [
        {
          createdAt: "desc"
        },
        {
          id: "desc"
        }
      ],
      include: {
        _count: {
          select: {
            articles: true,
            comments: true,
            articleLikes: true,
            commentLikes: true,
            articleFavorites: true,
            sessions: {
              where: {
                isActive: true
              }
            }
          }
        }
      }
    });
    const disabledStates = await getDisabledStatesByUserId(rawUsers.map((user) => user.id));
    const users = rawUsers
      .map((user) => ({
        ...user,
        _adminIsDisabled: disabledStates.get(user.id) || false
      }))
      .filter((user) => {
        if (status === "active") {
          return !user._adminIsDisabled;
        }

        if (status === "disabled") {
          return user._adminIsDisabled;
        }

        return true;
      });

    return res.json({
      users: users.map(formatAdminUser)
    });
  } catch (error) {
    return next(error);
  }
});

router.patch("/users/:id/disabled", async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    const isDisabled = req.body?.isDisabled === true;

    if (!userId) {
      return res.status(400).json({
        message: "用户 ID 无效。"
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        id: userId
      }
    });

    if (!existingUser) {
      return res.status(404).json({
        message: "用户不存在。"
      });
    }

    if (existingUser.role !== "USER") {
      return res.status(403).json({
        message: "只能禁用或启用普通用户。"
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        UPDATE users
        SET is_disabled = ${isDisabled}
        WHERE id = ${userId}
      `;

      if (isDisabled) {
        await tx.userSession.updateMany({
          where: {
            userId,
            isActive: true
          },
          data: {
            isActive: false
          }
        });
      }
    });

    const user = await prisma.user.findUnique({
      where: {
        id: userId
      },
      include: {
        _count: {
          select: {
            articles: true,
            comments: true,
            articleLikes: true,
            commentLikes: true,
            articleFavorites: true,
            sessions: {
              where: {
                isActive: true
              }
            }
          }
        }
      }
    });

    return res.json({
      user: formatAdminUser(await userWithAdminState(user))
    });
  } catch (error) {
    return next(error);
  }
});

router.delete("/users/:id", async (req, res, next) => {
  try {
    const userId = Number(req.params.id);

    if (!userId) {
      return res.status(400).json({
        message: "用户 ID 无效。"
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        id: userId
      },
      include: {
        articles: {
          select: {
            id: true
          }
        }
      }
    });

    if (!existingUser) {
      return res.status(404).json({
        message: "用户不存在。"
      });
    }

    if (existingUser.role !== "USER") {
      return res.status(403).json({
        message: "只能删除普通用户。"
      });
    }

    const confirmationError = requireConfirmation(existingUser.username, req.body?.confirmName, "用户名");

    if (confirmationError) {
      return res.status(400).json({
        message: confirmationError
      });
    }

    const articleIds = existingUser.articles.map((article) => article.id);

    await prisma.$transaction(async (tx) => {
      await tx.articleMetricEvent.deleteMany({
        where: {
          OR: [
            {
              userId
            },
            {
              actorUserId: userId
            },
            {
              articleId: {
                in: articleIds
              }
            }
          ]
        }
      });
      await tx.userNotificationRead.deleteMany({
        where: {
          userId
        }
      });
      await tx.securityAuditEvent.deleteMany({
        where: {
          userId
        }
      });
      await tx.articleVersion.updateMany({
        where: {
          editorId: userId
        },
        data: {
          editorId: null
        }
      });
      await tx.article.updateMany({
        where: {
          reviewerId: userId
        },
        data: {
          reviewerId: null
        }
      });
      await tx.user.delete({
        where: {
          id: userId
        }
      });
    });

    cleanupArticleUploads(articleIds);
    cleanupDraftUploads(userId);

    return res.json({
      ok: true,
      deleted: {
        userId,
        username: existingUser.username,
        articleCount: articleIds.length
      }
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/taxonomies", async (req, res, next) => {
  try {
    const query = normalizeSearch(req.query.q);
    const categoryWhere = query
      ? {
          name: {
            contains: query
          }
        }
      : {};
    const tagWhere = categoryWhere;

    const [categories, tags] = await Promise.all([
      prisma.category.findMany({
        where: categoryWhere,
        orderBy: {
          name: "asc"
        },
        include: {
          _count: {
            select: {
              articles: true
            }
          }
        }
      }),
      prisma.tag.findMany({
        where: tagWhere,
        orderBy: {
          name: "asc"
        },
        include: {
          _count: {
            select: {
              articles: true
            }
          }
        }
      })
    ]);

    return res.json({
      categories: categories.map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        articleCount: category._count.articles,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt
      })),
      tags: tags.map((tag) => ({
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
        articleCount: tag._count.articles,
        createdAt: tag.createdAt,
        updatedAt: tag.updatedAt
      }))
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/categories", async (req, res, next) => {
  try {
    const name = normalizeName(req.body?.name);
    const slug = slugify(name);

    if (!name) {
      return res.status(400).json({
        message: "请输入分类名称。"
      });
    }

    if (!slug) {
      return res.status(400).json({
        message: "无法根据分类名称生成有效 Slug。"
      });
    }

    const category = await prisma.category.create({
      data: {
        name,
        slug
      },
      include: {
        _count: {
          select: {
            articles: true
          }
        }
      }
    });

    return res.status(201).json({
      category: {
        id: category.id,
        name: category.name,
        slug: category.slug,
        articleCount: category._count.articles,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt
      }
    });
  } catch (error) {
    const uniqueError = prismaUniqueMessage(error, "分类名称或 Slug 已存在。");

    if (uniqueError) {
      return res.status(uniqueError.status).json(uniqueError.body);
    }

    return next(error);
  }
});

router.patch("/categories/:id", async (req, res, next) => {
  try {
    const categoryId = Number(req.params.id);
    const name = normalizeName(req.body?.name);
    const slug = slugify(name);

    if (!categoryId) {
      return res.status(400).json({
        message: "分类 ID 无效。"
      });
    }

    if (!name) {
      return res.status(400).json({
        message: "请输入分类名称。"
      });
    }

    if (!slug) {
      return res.status(400).json({
        message: "无法根据分类名称生成有效 Slug。"
      });
    }

    const category = await prisma.category.update({
      where: {
        id: categoryId
      },
      data: {
        name,
        slug
      },
      include: {
        _count: {
          select: {
            articles: true
          }
        }
      }
    });

    return res.json({
      category: {
        id: category.id,
        name: category.name,
        slug: category.slug,
        articleCount: category._count.articles,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt
      }
    });
  } catch (error) {
    const uniqueError = prismaUniqueMessage(error, "分类名称或 Slug 已存在。");

    if (uniqueError) {
      return res.status(uniqueError.status).json(uniqueError.body);
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return res.status(404).json({
        message: "分类不存在。"
      });
    }

    return next(error);
  }
});

router.delete("/categories/:id", async (req, res, next) => {
  try {
    const categoryId = Number(req.params.id);

    if (!categoryId) {
      return res.status(400).json({
        message: "分类 ID 无效。"
      });
    }

    const category = await prisma.category.findUnique({
      where: {
        id: categoryId
      },
      include: {
        _count: {
          select: {
            articles: true
          }
        }
      }
    });

    if (!category) {
      return res.status(404).json({
        message: "分类不存在。"
      });
    }

    const confirmationError =
      category._count.articles > 0
        ? requireConfirmation(category.name, req.body?.confirmName, "分类名称")
        : null;

    if (confirmationError) {
      return res.status(400).json({
        message: confirmationError
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.article.updateMany({
        where: {
          categoryId
        },
        data: {
          categoryId: null
        }
      });
      await tx.category.delete({
        where: {
          id: categoryId
        }
      });
    });

    return res.json({
      ok: true,
      removedFromArticleCount: category._count.articles
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/tags", async (req, res, next) => {
  try {
    const name = normalizeName(req.body?.name);
    const slug = slugify(name);

    if (!name) {
      return res.status(400).json({
        message: "请输入标签名称。"
      });
    }

    if (!slug) {
      return res.status(400).json({
        message: "无法根据标签名称生成有效 Slug。"
      });
    }

    const tag = await prisma.tag.create({
      data: {
        name,
        slug
      },
      include: {
        _count: {
          select: {
            articles: true
          }
        }
      }
    });

    return res.status(201).json({
      tag: {
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
        articleCount: tag._count.articles,
        createdAt: tag.createdAt,
        updatedAt: tag.updatedAt
      }
    });
  } catch (error) {
    const uniqueError = prismaUniqueMessage(error, "标签名称或 Slug 已存在。");

    if (uniqueError) {
      return res.status(uniqueError.status).json(uniqueError.body);
    }

    return next(error);
  }
});

router.patch("/tags/:id", async (req, res, next) => {
  try {
    const tagId = Number(req.params.id);
    const name = normalizeName(req.body?.name);
    const slug = slugify(name);

    if (!tagId) {
      return res.status(400).json({
        message: "标签 ID 无效。"
      });
    }

    if (!name) {
      return res.status(400).json({
        message: "请输入标签名称。"
      });
    }

    if (!slug) {
      return res.status(400).json({
        message: "无法根据标签名称生成有效 Slug。"
      });
    }

    const tag = await prisma.tag.update({
      where: {
        id: tagId
      },
      data: {
        name,
        slug
      },
      include: {
        _count: {
          select: {
            articles: true
          }
        }
      }
    });

    return res.json({
      tag: {
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
        articleCount: tag._count.articles,
        createdAt: tag.createdAt,
        updatedAt: tag.updatedAt
      }
    });
  } catch (error) {
    const uniqueError = prismaUniqueMessage(error, "标签名称或 Slug 已存在。");

    if (uniqueError) {
      return res.status(uniqueError.status).json(uniqueError.body);
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return res.status(404).json({
        message: "标签不存在。"
      });
    }

    return next(error);
  }
});

router.delete("/tags/:id", async (req, res, next) => {
  try {
    const tagId = Number(req.params.id);

    if (!tagId) {
      return res.status(400).json({
        message: "标签 ID 无效。"
      });
    }

    const tag = await prisma.tag.findUnique({
      where: {
        id: tagId
      },
      include: {
        _count: {
          select: {
            articles: true
          }
        }
      }
    });

    if (!tag) {
      return res.status(404).json({
        message: "标签不存在。"
      });
    }

    const confirmationError =
      tag._count.articles > 0 ? requireConfirmation(tag.name, req.body?.confirmName, "标签名称") : null;

    if (confirmationError) {
      return res.status(400).json({
        message: confirmationError
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.articleTag.deleteMany({
        where: {
          tagId
        }
      });
      await tx.tag.delete({
        where: {
          id: tagId
        }
      });
    });

    return res.json({
      ok: true,
      removedFromArticleCount: tag._count.articles
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/articles", async (req, res, next) => {
  try {
    const query = normalizeSearch(req.query.q);
    const categoryId = Number(req.query.categoryId || 0);
    const statusQuery = normalizeSearch(req.query.status);
    const statuses =
      statusQuery === "published"
        ? [ArticleStatus.PUBLISHED]
        : statusQuery === "archived"
          ? [ArticleStatus.ARCHIVED]
          : [ArticleStatus.PUBLISHED, ArticleStatus.ARCHIVED];
    const articles = await prisma.article.findMany({
      where: {
        status: {
          in: statuses
        },
        ...(categoryId ? { categoryId } : {}),
        ...(query
          ? {
              OR: [
                {
                  title: {
                    contains: query
                  }
                },
                {
                  slug: {
                    contains: query
                  }
                },
                {
                  author: {
                    username: {
                      contains: query
                    }
                  }
                }
              ]
            }
          : {})
      },
      orderBy: [
        {
          publishedAt: "desc"
        },
        {
          updatedAt: "desc"
        },
        {
          id: "desc"
        }
      ],
      include: {
        ...articleInclude(),
        _count: {
          select: {
            comments: true
          }
        }
      }
    });

    return res.json({
      articles: articles.map(formatAdminArticle)
    });
  } catch (error) {
    return next(error);
  }
});

router.patch("/articles/:id/status", async (req, res, next) => {
  try {
    const articleId = Number(req.params.id);
    const status = String(req.body?.status || "").trim();

    if (!articleId) {
      return res.status(400).json({
        message: "文章 ID 无效。"
      });
    }

    if (!ADMIN_ARTICLE_STATUSES.has(status)) {
      return res.status(400).json({
        message: "只能切换已发布或已下架状态。"
      });
    }

    const existingArticle = await findAdminManagedArticle(articleId);

    if (!existingArticle) {
      return res.status(404).json({
        message: "文章不存在，或不属于已发布/已下架文章。"
      });
    }

    const article = await prisma.$transaction(async (tx) => {
      const updatedArticle = await tx.article.update({
        where: {
          id: articleId
        },
        data: {
          status,
          ...(status === ArticleStatus.PUBLISHED
            ? {
                publishedAt: existingArticle.publishedAt || new Date()
              }
            : {})
        },
        include: {
          ...articleInclude(),
          _count: {
            select: {
              comments: true
            }
          }
        }
      });

      if (existingArticle.status === ArticleStatus.PUBLISHED && status === ArticleStatus.ARCHIVED) {
        await recordArticleMetricEvent(
          {
            articleId,
            userId: existingArticle.authorId,
            delta: -1
          },
          tx
        );
      }

      if (existingArticle.status === ArticleStatus.ARCHIVED && status === ArticleStatus.PUBLISHED) {
        await recordArticleMetricEvent(
          {
            articleId,
            userId: existingArticle.authorId,
            delta: 1
          },
          tx
        );
      }

      return updatedArticle;
    });

    return res.json({
      article: formatAdminArticle(article)
    });
  } catch (error) {
    return next(error);
  }
});

router.delete("/articles/:id", async (req, res, next) => {
  try {
    const articleId = Number(req.params.id);

    if (!articleId) {
      return res.status(400).json({
        message: "文章 ID 无效。"
      });
    }

    const existingArticle = await findAdminManagedArticle(articleId);

    if (!existingArticle) {
      return res.status(404).json({
        message: "文章不存在，或不属于已发布/已下架文章。"
      });
    }

    const confirmationError = requireConfirmation(existingArticle.title, req.body?.confirmTitle, "文章标题");

    if (confirmationError) {
      return res.status(400).json({
        message: confirmationError
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.articleMetricEvent.deleteMany({
        where: {
          articleId
        }
      });

      if (existingArticle.status === ArticleStatus.PUBLISHED) {
        await recordArticleMetricEvent(
          {
            articleId,
            userId: existingArticle.authorId,
            delta: -1
          },
          tx
        );
      }

      await tx.article.delete({
        where: {
          id: articleId
        }
      });
    });

    cleanupArticleUploads([articleId]);

    return res.json({
      ok: true,
      deleted: {
        articleId,
        title: existingArticle.title
      }
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
