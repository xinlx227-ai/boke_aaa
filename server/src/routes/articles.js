import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import AdmZip from "adm-zip";
import multer from "multer";
import prismaPkg from "@prisma/client";
import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { renderMarkdownToSafeHtml, renderMarkdownToSafeHtmlWithToc } from "../lib/markdown.js";
import { attachOptionalAuth, requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/role.js";

const { Prisma, ArticleStatus, CommentStatus } = prismaPkg;
const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsRoot = path.resolve(__dirname, "../../uploads/articles");
const draftUploadsRoot = path.resolve(__dirname, "../../uploads/article-drafts");
const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000;
const HOT_SCORE_WEIGHTS = {
  views: 1,
  likes: 5,
  favorites: 8,
  comments: 3
};
const SUBMISSION_STATUS = {
  DRAFT: "DRAFT",
  PENDING_REVIEW: "PENDING_REVIEW",
  REJECTED: "REJECTED",
  PUBLISHED: "PUBLISHED",
  ARCHIVED: "ARCHIVED"
};
const USER_EDITABLE_STATUSES = new Set([SUBMISSION_STATUS.DRAFT, SUBMISSION_STATUS.REJECTED]);
const USER_DELETABLE_STATUSES = new Set([SUBMISSION_STATUS.DRAFT, SUBMISSION_STATUS.REJECTED]);

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

function normalizeTagNames(value) {
  if (Array.isArray(value)) {
    return Array.from(new Set(value.map(normalizeName).filter(Boolean))).slice(0, 20);
  }

  return String(value || "")
    .split(",")
    .map(normalizeName)
    .filter(Boolean)
    .slice(0, 20);
}

function normalizeZipPath(value) {
  return String(value || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");
}

function isMarkdownPath(value) {
  return /\.md$/i.test(value);
}

function isSupportedImagePath(value) {
  return /\.(png|jpe?g|gif|webp)$/i.test(value);
}

function stripMarkdownExtension(value) {
  return String(value || "").replace(/\.md$/i, "");
}

function titleFromMarkdownFile(entryName, contentMarkdown) {
  const heading = String(contentMarkdown || "").match(/^#\s+(.+)$/m)?.[1]?.trim();

  if (heading) {
    return heading.slice(0, 200);
  }

  const baseName = stripMarkdownExtension(path.posix.basename(entryName));
  const title = baseName.replace(/^\d+[-_.\s]*/, "").trim() || baseName;
  return title.slice(0, 200);
}

function slugFromMarkdownFile(entryName) {
  const baseName = stripMarkdownExtension(path.posix.basename(entryName));
  return slugify(baseName);
}

function parseChapterOrder(value) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.trunc(parsed);
}

function hasExplicitChapterOrder(input) {
  return input && Object.prototype.hasOwnProperty.call(input, "chapterOrder") && input.chapterOrder !== "";
}

async function nextArticleChapterOrder() {
  return (await prisma.article.count()) + 1;
}

function clampChapterOrder(value, maxOrder) {
  const parsed = parseChapterOrder(value);

  if (parsed < 1) {
    return 1;
  }

  return Math.min(parsed, maxOrder);
}

async function moveArticleToChapterOrder(articleId, requestedOrder) {
  await prisma.$transaction(async (tx) => {
    const articles = await tx.article.findMany({
      select: {
        id: true,
        chapterOrder: true
      },
      orderBy: [
        {
          chapterOrder: "asc"
        },
        {
          id: "asc"
        }
      ]
    });
    const movedArticle = articles.find((article) => article.id === articleId);

    if (!movedArticle) {
      return;
    }

    const targetIndex = clampChapterOrder(requestedOrder, articles.length) - 1;
    const orderedArticles = articles.filter((article) => article.id !== articleId);
    orderedArticles.splice(targetIndex, 0, movedArticle);

    await Promise.all(
      orderedArticles.map((article, index) =>
        tx.article.update({
          where: {
            id: article.id
          },
          data: {
            chapterOrder: index + 1
          }
        })
      )
    );
  });
}

function sanitizeFilename(name) {
  return String(name || "image")
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "image";
}

function escapeMarkdownAltText(value) {
  return String(value || "图片")
    .replace(/[\r\n]+/g, " ")
    .replace(/\\/g, "\\\\")
    .replace(/]/g, "\\]")
    .trim() || "图片";
}

function emptyArticleStats() {
  return {
    viewCount: 0,
    likeCount: 0,
    favoriteCount: 0,
    commentCount: 0,
    likedByMe: false,
    favoritedByMe: false
  };
}

function formatArticle(article) {
  const stats = {
    ...emptyArticleStats(),
    ...(article.stats || {})
  };

  return {
    id: article.id,
    title: article.title,
    slug: article.slug,
    contentMarkdown: article.contentMarkdown,
    contentHtml: article.contentHtml,
    chapterOrder: article.chapterOrder,
    status: article.status,
    publishedAt: article.publishedAt,
    submittedAt: article.submittedAt,
    reviewedAt: article.reviewedAt,
    reviewNote: article.reviewNote,
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
    toc: Array.isArray(article.toc) ? article.toc : [],
    author: article.author
      ? {
          id: article.author.id,
          username: article.author.username,
          email: article.author.email,
          role: article.author.role
        }
      : null,
    reviewer: article.reviewer
      ? {
          id: article.reviewer.id,
          username: article.reviewer.username,
          email: article.reviewer.email,
          role: article.reviewer.role
        }
      : null,
    images: Array.isArray(article.images)
      ? article.images.map((image) => ({
          id: image.id,
          imageUrl: image.imageUrl,
          altText: image.altText,
          sortOrder: image.sortOrder,
          createdAt: image.createdAt,
          updatedAt: image.updatedAt
        }))
      : [],
    stats
  };
}

function articleTimelineValue(article) {
  const time = new Date(article?.publishedAt || article?.createdAt || 0).getTime();
  return Number.isFinite(time) ? time : 0;
}

function sortByPublishedTime(articles) {
  return [...articles].sort((firstArticle, secondArticle) => {
    const timeDiff = articleTimelineValue(secondArticle) - articleTimelineValue(firstArticle);

    if (timeDiff !== 0) {
      return timeDiff;
    }

    return (secondArticle.id || 0) - (firstArticle.id || 0);
  });
}

function getShanghaiDayWindow(now = new Date()) {
  const timestamp = now.getTime();
  const shanghaiDate = new Date(timestamp + SHANGHAI_OFFSET_MS);
  const year = shanghaiDate.getUTCFullYear();
  const month = shanghaiDate.getUTCMonth();
  const date = shanghaiDate.getUTCDate();
  const start = new Date(Date.UTC(year, month, date) - SHANGHAI_OFFSET_MS);
  const end = new Date(Date.UTC(year, month, date + 1) - SHANGHAI_OFFSET_MS);

  return {
    start,
    end
  };
}

function formatShanghaiDayLabel(dayStart) {
  const shanghaiDate = new Date(dayStart.getTime() + SHANGHAI_OFFSET_MS);
  const month = String(shanghaiDate.getUTCMonth() + 1).padStart(2, "0");
  const date = String(shanghaiDate.getUTCDate()).padStart(2, "0");

  return `${month}-${date}`;
}

function formatShanghaiDateKey(dayStart) {
  const shanghaiDate = new Date(dayStart.getTime() + SHANGHAI_OFFSET_MS);
  const year = shanghaiDate.getUTCFullYear();
  const month = String(shanghaiDate.getUTCMonth() + 1).padStart(2, "0");
  const date = String(shanghaiDate.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${date}`;
}

function getRecentShanghaiDayWindows(dayCount = 7, now = new Date()) {
  return Array.from({ length: dayCount }, (_item, index) => {
    const dayOffset = dayCount - index - 1;
    return getShanghaiDayWindow(new Date(now.getTime() - dayOffset * 24 * 60 * 60 * 1000));
  });
}

function normalizeVisitorId(value) {
  const visitorId = String(value || "").trim();

  if (!visitorId) {
    return null;
  }

  return visitorId.slice(0, 100);
}

function requestVisitorId(req) {
  return normalizeVisitorId(req.body?.visitorId || req.query?.visitorId || req.headers["x-visitor-id"]);
}

function actorWhere({ userId, visitorId }) {
  if (userId) {
    return {
      userId
    };
  }

  return {
    visitorId: visitorId || null
  };
}

function articleStatsFromRecord(stats) {
  return {
    viewCount: stats?.viewCount || 0,
    likeCount: stats?.likeCount || 0,
    favoriteCount: stats?.favoriteCount || 0
  };
}

function hotScoreFromStats(stats) {
  return (
    (stats?.viewCount || 0) * HOT_SCORE_WEIGHTS.views +
    (stats?.likeCount || 0) * HOT_SCORE_WEIGHTS.likes +
    (stats?.favoriteCount || 0) * HOT_SCORE_WEIGHTS.favorites +
    (stats?.commentCount || 0) * HOT_SCORE_WEIGHTS.comments
  );
}

async function findPublishedArticleBySlug(slug, options = {}) {
  return prisma.article.findFirst({
    where: {
      slug,
      status: ArticleStatus.PUBLISHED
    },
    ...options
  });
}

async function ensureArticleStats(articleId, tx = prisma) {
  await tx.$executeRaw`
    INSERT INTO article_stats (article_id, view_count, like_count, favorite_count, created_at, updated_at)
    VALUES (${articleId}, 0, 0, 0, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))
    ON DUPLICATE KEY UPDATE article_id = article_id
  `;
}

async function buildStatsByArticleId(articleIds, userId = null) {
  const uniqueArticleIds = Array.from(new Set(articleIds.filter(Boolean)));
  const statsByArticleId = new Map();

  if (uniqueArticleIds.length === 0) {
    return statsByArticleId;
  }

  const [statsRows, commentCounts, likedRows, favoritedRows] = await Promise.all([
    prisma.$queryRaw`
      SELECT
        article_id AS articleId,
        view_count AS viewCount,
        like_count AS likeCount,
        favorite_count AS favoriteCount
      FROM article_stats
      WHERE article_id IN (${Prisma.join(uniqueArticleIds)})
    `,
    prisma.comment.groupBy({
      by: ["articleId"],
      where: {
        articleId: {
          in: uniqueArticleIds
        },
        status: CommentStatus.APPROVED
      },
      _count: {
        _all: true
      }
    }),
    userId
      ? prisma.$queryRaw`
          SELECT article_id AS articleId
          FROM article_likes
          WHERE user_id = ${userId}
            AND article_id IN (${Prisma.join(uniqueArticleIds)})
        `
      : [],
    userId
      ? prisma.$queryRaw`
          SELECT article_id AS articleId
          FROM article_favorites
          WHERE user_id = ${userId}
            AND article_id IN (${Prisma.join(uniqueArticleIds)})
        `
      : []
  ]);

  const rawStatsByArticleId = new Map(statsRows.map((stats) => [Number(stats.articleId), stats]));
  const commentCountByArticleId = new Map(commentCounts.map((item) => [item.articleId, item._count._all]));
  const likedArticleIds = new Set(likedRows.map((item) => Number(item.articleId)));
  const favoritedArticleIds = new Set(favoritedRows.map((item) => Number(item.articleId)));

  for (const articleId of uniqueArticleIds) {
    statsByArticleId.set(articleId, {
      ...emptyArticleStats(),
      ...articleStatsFromRecord(rawStatsByArticleId.get(articleId)),
      commentCount: commentCountByArticleId.get(articleId) || 0,
      likedByMe: likedArticleIds.has(articleId),
      favoritedByMe: favoritedArticleIds.has(articleId)
    });
  }

  return statsByArticleId;
}

async function withArticleStats(articles, userId = null) {
  const statsByArticleId = await buildStatsByArticleId(
    articles.map((article) => article.id),
    userId
  );

  return articles.map((article) => ({
    ...article,
    stats: statsByArticleId.get(article.id) || emptyArticleStats()
  }));
}

async function formatArticleWithStats(article, userId = null) {
  const [articleWithStats] = await withArticleStats([article], userId);
  return formatArticle(articleWithStats);
}

async function recordSiteVisit({ pageType, articleId = null, userId = null, visitorId, now = new Date() }) {
  const normalizedVisitorId = normalizeVisitorId(visitorId);

  if (!userId && !normalizedVisitorId) {
    return false;
  }

  const dayWindow = getShanghaiDayWindow(now);
  const where = {
    pageType,
    articleId,
    visitedAt: {
      gte: dayWindow.start,
      lt: dayWindow.end
    },
    ...actorWhere({
      userId,
      visitorId: normalizedVisitorId
    })
  };
  const existingVisit = await prisma.$queryRaw`
    SELECT id
    FROM site_visits
    WHERE page_type = ${where.pageType}
      AND (${where.articleId} IS NULL AND article_id IS NULL OR article_id = ${where.articleId})
      AND visited_at >= ${where.visitedAt.gte}
      AND visited_at < ${where.visitedAt.lt}
      AND (${userId ? Prisma.sql`user_id = ${userId}` : Prisma.sql`visitor_id = ${normalizedVisitorId}`})
    LIMIT 1
  `;

  if (existingVisit.length > 0) {
    return false;
  }

  await prisma.$executeRaw`
    INSERT INTO site_visits (page_type, article_id, user_id, visitor_id, visited_at, created_at)
    VALUES (${pageType}, ${articleId}, ${userId}, ${userId ? null : normalizedVisitorId}, ${now}, CURRENT_TIMESTAMP(3))
  `;

  return true;
}

async function recordArticleView({ articleId, userId = null, visitorId, now = new Date() }) {
  const normalizedVisitorId = normalizeVisitorId(visitorId);

  if (!userId && !normalizedVisitorId) {
    return false;
  }

  const dayWindow = getShanghaiDayWindow(now);
  const viewWhere = {
    articleId,
    viewedAt: {
      gte: dayWindow.start,
      lt: dayWindow.end
    },
    ...actorWhere({
      userId,
      visitorId: normalizedVisitorId
    })
  };
  const existingView = await prisma.$queryRaw`
    SELECT id
    FROM article_views
    WHERE article_id = ${viewWhere.articleId}
      AND viewed_at >= ${viewWhere.viewedAt.gte}
      AND viewed_at < ${viewWhere.viewedAt.lt}
      AND (${userId ? Prisma.sql`user_id = ${userId}` : Prisma.sql`visitor_id = ${normalizedVisitorId}`})
    LIMIT 1
  `;

  if (existingView.length > 0) {
    await recordSiteVisit({
      pageType: "article",
      articleId,
      userId,
      visitorId: normalizedVisitorId,
      now
    });
    return false;
  }

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      INSERT INTO article_views (article_id, user_id, visitor_id, viewed_at, created_at)
      VALUES (${articleId}, ${userId}, ${userId ? null : normalizedVisitorId}, ${now}, CURRENT_TIMESTAMP(3))
    `;
    await tx.$executeRaw`
      INSERT INTO article_stats (article_id, view_count, like_count, favorite_count, created_at, updated_at)
      VALUES (${articleId}, 1, 0, 0, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))
      ON DUPLICATE KEY UPDATE view_count = view_count + 1, updated_at = CURRENT_TIMESTAMP(3)
    `;
  });

  await recordSiteVisit({
    pageType: "article",
    articleId,
    userId,
    visitorId: normalizedVisitorId,
    now
  });

  return true;
}

async function getPublishedArticleStatsSummary() {
  const articles = await prisma.article.findMany({
    where: {
      status: ArticleStatus.PUBLISHED
    },
    select: {
      id: true
    }
  });
  const articleIds = articles.map((article) => article.id);

  if (articleIds.length === 0) {
    return {
      totalLikes: 0,
      totalViews: 0,
      totalFavorites: 0
    };
  }

  const summaryRows = await prisma.$queryRaw`
    SELECT
      COALESCE(SUM(view_count), 0) AS totalViews,
      COALESCE(SUM(like_count), 0) AS totalLikes,
      COALESCE(SUM(favorite_count), 0) AS totalFavorites
    FROM article_stats
    WHERE article_id IN (${Prisma.join(articleIds)})
  `;
  const summary = summaryRows[0] || {};

  return {
    totalLikes: Number(summary.totalLikes || 0),
    totalViews: Number(summary.totalViews || 0),
    totalFavorites: Number(summary.totalFavorites || 0)
  };
}

function isMissingPublishedAtColumnError(error) {
  const message = `${error?.message || ""} ${error?.meta?.message || ""}`;
  return message.includes("published_at") && (message.includes("Unknown column") || message.includes("no such column"));
}

async function withArticlePublishTimes(articles) {
  if (articles.length === 0) {
    return articles;
  }

  try {
    const rows = await prisma.$queryRaw`
      SELECT id, published_at AS publishedAt
      FROM articles
      WHERE id IN (${Prisma.join(articles.map((article) => article.id))})
    `;
    const publishTimesById = new Map(rows.map((row) => [Number(row.id), row.publishedAt]));

    return articles.map((article) => ({
      ...article,
      publishedAt: publishTimesById.get(article.id) || null
    }));
  } catch (error) {
    if (isMissingPublishedAtColumnError(error)) {
      return articles;
    }

    throw error;
  }
}

async function setPublishedAtIfMissing(articleId) {
  try {
    await prisma.$executeRaw`
      UPDATE articles
      SET published_at = COALESCE(published_at, CURRENT_TIMESTAMP(3))
      WHERE id = ${articleId}
    `;
  } catch (error) {
    if (!isMissingPublishedAtColumnError(error)) {
      throw error;
    }
  }
}

function buildArticleData(input) {
  const title = String(input?.title || "").trim();
  const requestedSlug = String(input?.slug || "").trim();
  const slug = slugify(requestedSlug || title);
  const contentMarkdown = String(input?.contentMarkdown || "");
  const rendered = renderMarkdownToSafeHtmlWithToc(contentMarkdown);
  const chapterOrder = hasExplicitChapterOrder(input) ? parseChapterOrder(input.chapterOrder) : null;
  const categoryName = normalizeName(input?.categoryName);
  const tagNames = normalizeTagNames(input?.tagNames ?? input?.tags);

  if (!title) {
    return {
      error: "请输入文章标题。"
    };
  }

  if (!slug) {
    return {
      error: "无法根据标题生成有效的 Slug。"
    };
  }

  if (title.length > 200) {
    return {
      error: "文章标题不能超过 200 个字符。"
    };
  }

  if (slug.length > 220) {
    return {
      error: "Slug 不能超过 220 个字符。"
    };
  }

  return {
    data: {
      title,
      slug,
      contentMarkdown,
      contentHtml: rendered.html,
      ...(chapterOrder === null ? {} : { chapterOrder }),
      categoryName,
      tagNames
    },
    toc: rendered.toc
  };
}

async function uniqueArticleSlug(baseSlug, excludeArticleId = null) {
  const normalizedBase = slugify(baseSlug) || "article";
  const base = normalizedBase.slice(0, 210).replace(/-+$/g, "") || "article";

  for (let index = 0; index < 1000; index += 1) {
    const suffix = index === 0 ? "" : `-${index + 1}`;
    const slug = `${base.slice(0, 220 - suffix.length)}${suffix}`;
    const existingArticle = await prisma.article.findUnique({
      where: {
        slug
      },
      select: {
        id: true
      }
    });

    if (!existingArticle || existingArticle.id === excludeArticleId) {
      return slug;
    }
  }

  return `${base.slice(0, 205)}-${Date.now().toString(36)}`;
}

function isGeneratedDraftSlug(slug) {
  return /^draft-\d+-[a-z0-9]+$/i.test(String(slug || ""));
}

async function buildUserArticleData(input, options = {}) {
  const strict = Boolean(options.strict);
  const existingArticle = options.existingArticle || null;
  const userId = Number(options.userId);
  const title = String(input?.title || "").trim();
  const contentMarkdown = String(input?.contentMarkdown || "");
  const rendered = renderMarkdownToSafeHtmlWithToc(contentMarkdown);
  const categoryName = normalizeName(input?.categoryName);
  const tagNames = normalizeTagNames(input?.tagNames ?? input?.tags);

  if (title.length > 200) {
    return {
      error: "文章标题不能超过 200 个字符。"
    };
  }

  if (strict) {
    if (!title) {
      return {
        error: "提交审核前请输入文章标题。"
      };
    }

    if (!contentMarkdown.trim()) {
      return {
        error: "提交审核前请输入文章正文。"
      };
    }

    if (!categoryName) {
      return {
        error: "提交审核前请选择文章分类。"
      };
    }
  }

  const normalizedTitle = title || "未命名草稿";
  const shouldRegenerateSlug =
    !existingArticle ||
    (strict && isGeneratedDraftSlug(existingArticle.slug) && title);
  const slug = shouldRegenerateSlug
    ? await uniqueArticleSlug(title || `draft-${userId}-${Date.now().toString(36)}`, existingArticle?.id)
    : existingArticle.slug;

  return {
    data: {
      title: normalizedTitle,
      slug,
      contentMarkdown,
      contentHtml: rendered.html,
      categoryName,
      tagNames
    },
    toc: rendered.toc
  };
}

async function upsertCategoryByName(name) {
  const categoryName = normalizeName(name);

  if (!categoryName) {
    return null;
  }

  const slug = slugify(categoryName);

  return prisma.category.upsert({
    where: {
      slug
    },
    create: {
      name: categoryName,
      slug
    },
    update: {
      name: categoryName
    }
  });
}

async function upsertTagsByNames(names) {
  const tagNames = normalizeTagNames(names);

  return Promise.all(
    tagNames.map((name) => {
      const slug = slugify(name);

      return prisma.tag.upsert({
        where: {
          slug
        },
        create: {
          name,
          slug
        },
        update: {
          name
        }
      });
    })
  );
}

async function buildArticleRelations(input) {
  const category = await upsertCategoryByName(input.categoryName);
  const tags = await upsertTagsByNames(input.tagNames);

  return {
    categoryId: category?.id ?? null,
    tagIds: tags.map((tag) => tag.id)
  };
}

async function replaceArticleTags(articleId, tagIds) {
  await prisma.articleTag.deleteMany({
    where: {
      articleId
    }
  });

  if (tagIds.length === 0) {
    return;
  }

  await prisma.articleTag.createMany({
    data: tagIds.map((tagId) => ({
      articleId,
      tagId
    })),
    skipDuplicates: true
  });
}

function articleInclude() {
  return {
    author: true,
    reviewer: true,
    category: true,
    tags: {
      include: {
        tag: true
      },
      orderBy: {
        tag: {
          name: "asc"
        }
      }
    },
    images: {
      orderBy: {
        sortOrder: "asc"
      }
    }
  };
}

function buildPublicArticleWhere(query) {
  const search = String(query?.q || query?.search || "").trim();
  const category = String(query?.category || "").trim();
  const tag = String(query?.tag || "").trim();

  return {
    status: ArticleStatus.PUBLISHED,
    ...(search
      ? {
          OR: [
            {
              title: {
                contains: search
              }
            },
            {
              contentMarkdown: {
                contains: search
              }
            }
          ]
        }
      : {}),
    ...(category
      ? {
          category: {
            slug: category
          }
        }
      : {}),
    ...(tag
      ? {
          tags: {
            some: {
              tag: {
                slug: tag
              }
            }
          }
        }
      : {})
  };
}

async function ensureArticleExists(articleId) {
  return prisma.article.findUnique({
    where: {
      id: articleId
    }
  });
}

const upload = multer({
  storage: multer.diskStorage({
    destination(req, _file, callback) {
      const articleId = Number(req.params.id);
      const destination = path.join(uploadsRoot, String(articleId));
      fs.mkdirSync(destination, { recursive: true });
      callback(null, destination);
    },
    filename(_req, file, callback) {
      const extension = path.extname(file.originalname) || ".png";
      const baseName = sanitizeFilename(path.basename(file.originalname, extension));
      callback(null, `${Date.now()}-${baseName}${extension.toLowerCase()}`);
    }
  }),
  fileFilter(_req, file, callback) {
    if (!file.mimetype.startsWith("image/")) {
      callback(new Error("只支持上传图片文件。"));
      return;
    }

    callback(null, true);
  },
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

const draftImageUpload = multer({
  storage: multer.diskStorage({
    destination(req, _file, callback) {
      const userId = Number(req.auth?.userId);
      const destination = path.join(draftUploadsRoot, String(userId || "unknown"));
      fs.mkdirSync(destination, { recursive: true });
      callback(null, destination);
    },
    filename(_req, file, callback) {
      const extension = path.extname(file.originalname) || ".png";
      const baseName = sanitizeFilename(path.basename(file.originalname, extension));
      callback(null, `${Date.now()}-${Math.random().toString(16).slice(2, 8)}-${baseName}${extension.toLowerCase()}`);
    }
  }),
  fileFilter(_req, file, callback) {
    if (!file.mimetype.startsWith("image/")) {
      callback(new Error("只支持上传图片文件。"));
      return;
    }

    callback(null, true);
  },
  limits: {
    files: 20,
    fileSize: 5 * 1024 * 1024
  }
});

const importUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter(_req, file, callback) {
    const isZip =
      file.mimetype === "application/zip" ||
      file.mimetype === "application/x-zip-compressed" ||
      /\.zip$/i.test(file.originalname);

    if (!isZip) {
      callback(new Error("只支持上传 zip 压缩包。"));
      return;
    }

    callback(null, true);
  },
  limits: {
    fileSize: 20 * 1024 * 1024
  }
});

function collectZipEntries(zip) {
  const markdownEntries = [];
  const imageEntries = new Map();
  const formatErrors = [];

  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) {
      continue;
    }

    const entryName = normalizeZipPath(entry.entryName);

    if (!entryName || entryName.includes("../")) {
      formatErrors.push({
        file: entry.entryName,
        reason: "压缩包路径无效。"
      });
      continue;
    }

    if (isMarkdownPath(entryName)) {
      markdownEntries.push({
        entry,
        entryName
      });
      continue;
    }

    if (isSupportedImagePath(entryName)) {
      imageEntries.set(entryName.toLowerCase(), {
        entry,
        entryName
      });
      continue;
    }

    formatErrors.push({
      file: entryName,
      reason: "文件类型不支持，只能导入 .md 文件和常见图片文件。"
    });
  }

  markdownEntries.sort((left, right) =>
    left.entryName.localeCompare(right.entryName, "zh-Hans-CN", {
      numeric: true,
      sensitivity: "base"
    })
  );

  return {
    markdownEntries,
    imageEntries,
    formatErrors
  };
}

async function importArticleImages({ articleId, contentMarkdown, imageEntries, missingImages }) {
  const articleDirectory = path.join(uploadsRoot, String(articleId));
  const imageRecords = new Map();

  const rewrittenMarkdown = String(contentMarkdown || "").replace(
    /(!\[[^\]]*]\()([^)\s]+)(\))/g,
    (match, prefix, imagePath, suffix) => {
      if (/^(https?:)?\/\//i.test(imagePath) || imagePath.startsWith("/uploads/")) {
        return match;
      }

      const normalizedImagePath = normalizeZipPath(decodeURIComponent(imagePath));
      const imageEntry = imageEntries.get(normalizedImagePath.toLowerCase());

      if (!imageEntry) {
        missingImages.push({
          articleId,
          path: normalizedImagePath
        });
        return match;
      }

      const existingImage = imageRecords.get(normalizedImagePath);

      if (existingImage) {
        return `${prefix}${existingImage.imageUrl}${suffix}`;
      }

      fs.mkdirSync(articleDirectory, { recursive: true });
      const safeFileName = `${Date.now()}-${imageRecords.size + 1}-${sanitizeFilename(
        path.posix.basename(imageEntry.entryName)
      )}`;
      const destination = path.join(articleDirectory, safeFileName);
      fs.writeFileSync(destination, imageEntry.entry.getData());

      const imageUrl = `/uploads/articles/${articleId}/${safeFileName}`;
      imageRecords.set(normalizedImagePath, {
        imageUrl,
        altText: null,
        sortOrder: imageRecords.size
      });

      return `${prefix}${imageUrl}${suffix}`;
    }
  );

  if (imageRecords.size > 0) {
    await prisma.articleImage.createMany({
      data: Array.from(imageRecords.values()).map((image) => ({
        articleId,
        imageUrl: image.imageUrl,
        altText: image.altText,
        sortOrder: image.sortOrder
      }))
    });
  }

  return rewrittenMarkdown;
}

router.get("/", attachOptionalAuth, async (req, res, next) => {
  try {
    const articles = await prisma.article.findMany({
      where: buildPublicArticleWhere(req.query),
      orderBy: [
        {
          createdAt: "desc"
        },
        {
          id: "desc"
        }
      ],
      include: articleInclude()
    });
    const articlesWithPublishTimes = await withArticlePublishTimes(articles);
    const articlesWithStats = await withArticleStats(articlesWithPublishTimes, req.auth?.userId);

    return res.json({
      articles: sortByPublishedTime(articlesWithStats).map(formatArticle)
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/site-visits", attachOptionalAuth, async (req, res, next) => {
  try {
    const pageType = String(req.body?.pageType || "").trim();
    const visitorId = requestVisitorId(req);

    if (pageType !== "home") {
      return res.status(400).json({
        message: "访问页面类型无效。"
      });
    }

    if (!req.auth?.userId && !visitorId) {
      return res.status(400).json({
        message: "缺少访问者标识。"
      });
    }

    const counted = await recordSiteVisit({
      pageType,
      userId: req.auth?.userId || null,
      visitorId
    });

    return res.json({
      counted
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/stats/summary", async (_req, res, next) => {
  try {
    const dayWindow = getShanghaiDayWindow();
    const [todayVisitRows, articleSummary] = await Promise.all([
      prisma.$queryRaw`
        SELECT COUNT(*) AS count
        FROM site_visits sv
        LEFT JOIN articles a ON a.id = sv.article_id
        WHERE sv.visited_at >= ${dayWindow.start}
          AND sv.visited_at < ${dayWindow.end}
          AND (
            sv.page_type = 'home'
            OR (sv.page_type = 'article' AND a.status = ${ArticleStatus.PUBLISHED})
          )
      `,
      getPublishedArticleStatsSummary()
    ]);
    const todayVisits = Number(todayVisitRows[0]?.count || 0);

    return res.json({
      summary: {
        todayVisits,
        totalLikes: articleSummary.totalLikes,
        totalViews: articleSummary.totalViews,
        totalFavorites: articleSummary.totalFavorites
      }
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/popular", attachOptionalAuth, async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number(req.query?.limit) || 3, 1), 10);
    const articles = await prisma.article.findMany({
      where: {
        status: ArticleStatus.PUBLISHED
      },
      orderBy: [
        {
          publishedAt: "desc"
        },
        {
          createdAt: "desc"
        },
        {
          id: "desc"
        }
      ],
      include: articleInclude()
    });
    const articlesWithPublishTimes = await withArticlePublishTimes(articles);
    const articlesWithStats = await withArticleStats(articlesWithPublishTimes, req.auth?.userId);
    const popularArticles = [...articlesWithStats]
      .sort((firstArticle, secondArticle) => {
        const scoreDiff = hotScoreFromStats(secondArticle.stats) - hotScoreFromStats(firstArticle.stats);

        if (scoreDiff !== 0) {
          return scoreDiff;
        }

        const timeDiff = articleTimelineValue(secondArticle) - articleTimelineValue(firstArticle);

        if (timeDiff !== 0) {
          return timeDiff;
        }

        return (secondArticle.id || 0) - (firstArticle.id || 0);
      })
      .slice(0, limit)
      .map((article) => ({
        ...formatArticle(article),
        hotScore: hotScoreFromStats(article.stats)
      }));

    return res.json({
      articles: popularArticles
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/filters", async (_req, res, next) => {
  try {
    const [categories, tags] = await Promise.all([
      prisma.category.findMany({
        orderBy: {
          name: "asc"
        }
      }),
      prisma.tag.findMany({
        orderBy: {
          name: "asc"
        }
      })
    ]);

    return res.json({
      categories: categories.map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug
      })),
      tags: tags.map((tag) => ({
        id: tag.id,
        name: tag.name,
        slug: tag.slug
      }))
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    if (req.user?.role === "ADMIN") {
      return res.status(403).json({
        message: "管理员不使用普通用户投稿列表。"
      });
    }

    const articles = await prisma.article.findMany({
      where: {
        authorId: req.auth.userId,
        status: {
          in: [
            SUBMISSION_STATUS.DRAFT,
            SUBMISSION_STATUS.PENDING_REVIEW,
            SUBMISSION_STATUS.REJECTED,
            SUBMISSION_STATUS.PUBLISHED
          ]
        }
      },
      orderBy: [
        {
          updatedAt: "desc"
        },
        {
          id: "desc"
        }
      ],
      include: articleInclude()
    });
    const articlesWithStats = await withArticleStats(articles, req.auth.userId);

    return res.json({
      articles: articlesWithStats.map(formatArticle)
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/preview", requireAuth, async (req, res, next) => {
  try {
    const title = String(req.body?.title || "").trim() || "未命名草稿";
    const contentMarkdown = String(req.body?.contentMarkdown || "");
    const categoryName = normalizeName(req.body?.categoryName);
    const tagNames = normalizeTagNames(req.body?.tagNames ?? req.body?.tags);
    const rendered = renderMarkdownToSafeHtmlWithToc(contentMarkdown);

    return res.json({
      preview: {
        title: title.slice(0, 200),
        contentMarkdown,
        contentHtml: rendered.html,
        toc: rendered.toc,
        category: categoryName
          ? {
              name: categoryName,
              slug: slugify(categoryName)
            }
          : null,
        tags: tagNames.map((name) => ({
          name,
          slug: slugify(name)
        }))
      }
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/drafts/:id", requireAuth, async (req, res, next) => {
  try {
    if (req.user?.role === "ADMIN") {
      return res.status(403).json({
        message: "管理员不使用普通用户投稿编辑入口。"
      });
    }

    const articleId = Number(req.params.id);

    if (!articleId) {
      return res.status(400).json({
        message: "文章 ID 无效。"
      });
    }

    const article = await prisma.article.findFirst({
      where: {
        id: articleId,
        authorId: req.auth.userId
      },
      include: articleInclude()
    });

    if (!article) {
      return res.status(404).json({
        message: "文章不存在。"
      });
    }

    return res.json({
      article: formatArticle(article)
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/drafts", requireAuth, async (req, res, next) => {
  try {
    if (req.user?.role === "ADMIN") {
      return res.status(403).json({
        message: "管理员不使用普通用户投稿草稿入口。"
      });
    }

    const shouldSubmit = Boolean(req.body?.submit);
    const built = await buildUserArticleData(req.body, {
      strict: shouldSubmit,
      userId: req.auth.userId
    });

    if (built.error) {
      return res.status(400).json({
        message: built.error
      });
    }

    const { categoryName, tagNames, ...articleData } = built.data;
    const relations = await buildArticleRelations({
      categoryName,
      tagNames
    });
    const article = await prisma.article.create({
      data: {
        ...articleData,
        chapterOrder: await nextArticleChapterOrder(),
        categoryId: relations.categoryId,
        authorId: req.auth.userId,
        status: shouldSubmit ? SUBMISSION_STATUS.PENDING_REVIEW : SUBMISSION_STATUS.DRAFT,
        submittedAt: shouldSubmit ? new Date() : null
      },
      include: articleInclude()
    });

    await replaceArticleTags(article.id, relations.tagIds);

    const articleWithTags = await prisma.article.findUnique({
      where: {
        id: article.id
      },
      include: articleInclude()
    });

    return res.status(201).json({
      article: formatArticle(articleWithTags)
    });
  } catch (error) {
    return next(error);
  }
});

router.patch("/drafts/:id", requireAuth, async (req, res, next) => {
  try {
    if (req.user?.role === "ADMIN") {
      return res.status(403).json({
        message: "管理员不使用普通用户投稿草稿入口。"
      });
    }

    const articleId = Number(req.params.id);

    if (!articleId) {
      return res.status(400).json({
        message: "文章 ID 无效。"
      });
    }

    const existingArticle = await prisma.article.findFirst({
      where: {
        id: articleId,
        authorId: req.auth.userId
      }
    });

    if (!existingArticle) {
      return res.status(404).json({
        message: "文章不存在。"
      });
    }

    if (!USER_EDITABLE_STATUSES.has(existingArticle.status)) {
      return res.status(409).json({
        message: "文章已提交审核，修改前请先撤回到草稿。"
      });
    }

    const built = await buildUserArticleData(req.body, {
      existingArticle,
      userId: req.auth.userId
    });

    if (built.error) {
      return res.status(400).json({
        message: built.error
      });
    }

    const { categoryName, tagNames, ...articleData } = built.data;
    const relations = await buildArticleRelations({
      categoryName,
      tagNames
    });

    await replaceArticleTags(articleId, relations.tagIds);

    const article = await prisma.article.update({
      where: {
        id: articleId
      },
      data: {
        ...articleData,
        categoryId: relations.categoryId,
        status: SUBMISSION_STATUS.DRAFT
      },
      include: articleInclude()
    });

    return res.json({
      article: formatArticle(article)
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/drafts/:id/submit", requireAuth, async (req, res, next) => {
  try {
    if (req.user?.role === "ADMIN") {
      return res.status(403).json({
        message: "管理员不使用普通用户投稿提交入口。"
      });
    }

    const articleId = Number(req.params.id);

    if (!articleId) {
      return res.status(400).json({
        message: "文章 ID 无效。"
      });
    }

    const existingArticle = await prisma.article.findFirst({
      where: {
        id: articleId,
        authorId: req.auth.userId
      }
    });

    if (!existingArticle) {
      return res.status(404).json({
        message: "文章不存在。"
      });
    }

    if (!USER_EDITABLE_STATUSES.has(existingArticle.status)) {
      return res.status(409).json({
        message: "文章已经提交审核。"
      });
    }

    const built = await buildUserArticleData(req.body, {
      strict: true,
      existingArticle,
      userId: req.auth.userId
    });

    if (built.error) {
      return res.status(400).json({
        message: built.error
      });
    }

    const { categoryName, tagNames, ...articleData } = built.data;
    const relations = await buildArticleRelations({
      categoryName,
      tagNames
    });

    await replaceArticleTags(articleId, relations.tagIds);

    const article = await prisma.article.update({
      where: {
        id: articleId
      },
      data: {
        ...articleData,
        categoryId: relations.categoryId,
        status: SUBMISSION_STATUS.PENDING_REVIEW,
        submittedAt: new Date()
      },
      include: articleInclude()
    });

    return res.json({
      article: formatArticle(article)
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/drafts/:id/withdraw", requireAuth, async (req, res, next) => {
  try {
    if (req.user?.role === "ADMIN") {
      return res.status(403).json({
        message: "管理员不使用普通用户投稿撤回入口。"
      });
    }

    const articleId = Number(req.params.id);

    if (!articleId) {
      return res.status(400).json({
        message: "文章 ID 无效。"
      });
    }

    const existingArticle = await prisma.article.findFirst({
      where: {
        id: articleId,
        authorId: req.auth.userId
      }
    });

    if (!existingArticle) {
      return res.status(404).json({
        message: "文章不存在。"
      });
    }

    if (existingArticle.status !== SUBMISSION_STATUS.PENDING_REVIEW) {
      return res.status(409).json({
        message: "只有待审核文章可以撤回。"
      });
    }

    const article = await prisma.article.update({
      where: {
        id: articleId
      },
      data: {
        status: SUBMISSION_STATUS.DRAFT
      },
      include: articleInclude()
    });

    return res.json({
      article: formatArticle(article)
    });
  } catch (error) {
    return next(error);
  }
});

router.delete("/drafts/:id", requireAuth, async (req, res, next) => {
  try {
    if (req.user?.role === "ADMIN") {
      return res.status(403).json({
        message: "管理员不使用普通用户投稿删除入口。"
      });
    }

    const articleId = Number(req.params.id);

    if (!articleId) {
      return res.status(400).json({
        message: "文章 ID 无效。"
      });
    }

    const existingArticle = await prisma.article.findFirst({
      where: {
        id: articleId,
        authorId: req.auth.userId
      }
    });

    if (!existingArticle) {
      return res.status(404).json({
        message: "文章不存在。"
      });
    }

    if (!USER_DELETABLE_STATUSES.has(existingArticle.status)) {
      return res.status(409).json({
        message: "只能删除草稿或未通过文章。"
      });
    }

    await prisma.article.delete({
      where: {
        id: articleId
      }
    });

    return res.json({
      ok: true
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/admin/list", requireAuth, requireRole("ADMIN"), async (_req, res, next) => {
  try {
    const articles = await prisma.article.findMany({
      orderBy: [
        {
          chapterOrder: "asc"
        },
        {
          id: "asc"
        }
      ],
      include: articleInclude()
    });

    return res.json({
      articles: articles.map(formatArticle)
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/admin/overview", requireAuth, requireRole("ADMIN"), async (_req, res, next) => {
  try {
    const recentWindows = getRecentShanghaiDayWindows(7);
    const firstWindow = recentWindows[0];
    const lastWindow = recentWindows[recentWindows.length - 1];
    const todayWindow = getShanghaiDayWindow();

    const [userCount, articleCount, commentCount, todayVisitRows, visitRows] = await Promise.all([
      prisma.user.count(),
      prisma.article.count(),
      prisma.comment.count(),
      prisma.$queryRaw`
        SELECT COUNT(*) AS count
        FROM site_visits sv
        LEFT JOIN articles a ON a.id = sv.article_id
        WHERE sv.visited_at >= ${todayWindow.start}
          AND sv.visited_at < ${todayWindow.end}
          AND (
            sv.page_type = 'home'
            OR (sv.page_type = 'article' AND a.status = ${ArticleStatus.PUBLISHED})
          )
      `,
      prisma.$queryRaw`
        SELECT
          sv.user_id AS userId,
          sv.visitor_id AS visitorId,
          sv.visited_at AS visitedAt
        FROM site_visits sv
        LEFT JOIN articles a ON a.id = sv.article_id
        WHERE sv.visited_at >= ${firstWindow.start}
          AND sv.visited_at < ${lastWindow.end}
          AND (
            sv.page_type = 'home'
            OR (sv.page_type = 'article' AND a.status = ${ArticleStatus.PUBLISHED})
          )
      `
    ]);

    const visitorsByDay = recentWindows.map(() => new Set());

    for (const row of visitRows) {
      const visitedAt = new Date(row.visitedAt);
      const dayIndex = recentWindows.findIndex(
        (window) => visitedAt >= window.start && visitedAt < window.end
      );

      if (dayIndex < 0) {
        continue;
      }

      const visitorKey = row.userId
        ? `user:${Number(row.userId)}`
        : row.visitorId
          ? `visitor:${row.visitorId}`
          : null;

      if (visitorKey) {
        visitorsByDay[dayIndex].add(visitorKey);
      }
    }

    return res.json({
      summary: {
        userCount,
        articleCount,
        commentCount,
        todayVisits: Number(todayVisitRows[0]?.count || 0)
      },
      visitTrend: recentWindows.map((window, index) => ({
        date: formatShanghaiDateKey(window.start),
        label: formatShanghaiDayLabel(window.start),
        value: visitorsByDay[index].size
      }))
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/admin/reviews", requireAuth, requireRole("ADMIN"), async (_req, res, next) => {
  try {
    const articles = await prisma.article.findMany({
      where: {
        status: SUBMISSION_STATUS.PENDING_REVIEW
      },
      orderBy: [
        {
          submittedAt: "asc"
        },
        {
          updatedAt: "asc"
        },
        {
          id: "asc"
        }
      ],
      include: articleInclude()
    });

    return res.json({
      articles: articles.map(formatArticle)
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/admin/reviews/:id/approve", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const articleId = Number(req.params.id);

    if (!articleId) {
      return res.status(400).json({
        message: "文章 ID 无效。"
      });
    }

    const existingArticle = await ensureArticleExists(articleId);

    if (!existingArticle) {
      return res.status(404).json({
        message: "文章不存在。"
      });
    }

    if (existingArticle.status !== SUBMISSION_STATUS.PENDING_REVIEW) {
      return res.status(409).json({
        message: "只有待审核文章可以通过审核。"
      });
    }

    const reviewedAt = new Date();
    const article = await prisma.article.update({
      where: {
        id: articleId
      },
      data: {
        status: SUBMISSION_STATUS.PUBLISHED,
        reviewedAt,
        reviewerId: req.auth.userId,
        reviewNote: null
      },
      include: articleInclude()
    });
    await setPublishedAtIfMissing(articleId);
    const [articleWithPublishTime] = await withArticlePublishTimes([article]);

    return res.json({
      article: formatArticle(articleWithPublishTime)
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/admin/reviews/:id/reject", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const articleId = Number(req.params.id);
    const reviewNote = String(req.body?.reviewNote || "").trim();

    if (!articleId) {
      return res.status(400).json({
        message: "文章 ID 无效。"
      });
    }

    if (!reviewNote) {
      return res.status(400).json({
        message: "请填写驳回原因。"
      });
    }

    if (reviewNote.length > 500) {
      return res.status(400).json({
        message: "驳回原因不能超过 500 个字符。"
      });
    }

    const existingArticle = await ensureArticleExists(articleId);

    if (!existingArticle) {
      return res.status(404).json({
        message: "文章不存在。"
      });
    }

    if (existingArticle.status !== SUBMISSION_STATUS.PENDING_REVIEW) {
      return res.status(409).json({
        message: "只有待审核文章可以驳回。"
      });
    }

    const article = await prisma.article.update({
      where: {
        id: articleId
      },
      data: {
        status: SUBMISSION_STATUS.REJECTED,
        reviewedAt: new Date(),
        reviewerId: req.auth.userId,
        reviewNote
      },
      include: articleInclude()
    });

    return res.json({
      article: formatArticle(article)
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/:slug", attachOptionalAuth, async (req, res, next) => {
  try {
    const article = await findPublishedArticleBySlug(req.params.slug, {
      include: articleInclude()
    });

    if (!article) {
      return res.status(404).json({
        message: "文章不存在。"
      });
    }

    return res.json({
      article: await formatArticleWithStats({
        ...article,
        toc: renderMarkdownToSafeHtmlWithToc(article.contentMarkdown).toc
      }, req.auth?.userId)
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/:slug/views", attachOptionalAuth, async (req, res, next) => {
  try {
    const article = await findPublishedArticleBySlug(req.params.slug, {
      include: articleInclude()
    });

    if (!article) {
      return res.status(404).json({
        message: "文章不存在。"
      });
    }

    const visitorId = requestVisitorId(req);

    if (!req.auth?.userId && !visitorId) {
      return res.status(400).json({
        message: "缺少访问者标识。"
      });
    }

    const counted = await recordArticleView({
      articleId: article.id,
      userId: req.auth?.userId || null,
      visitorId
    });

    return res.json({
      counted,
      article: await formatArticleWithStats({
        ...article,
        toc: renderMarkdownToSafeHtmlWithToc(article.contentMarkdown).toc
      }, req.auth?.userId)
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/:slug/likes", requireAuth, async (req, res, next) => {
  try {
    const article = await findPublishedArticleBySlug(req.params.slug, {
      include: articleInclude()
    });

    if (!article) {
      return res.status(404).json({
        message: "文章不存在。"
      });
    }

    let changed = false;

    await prisma.$transaction(async (tx) => {
      await ensureArticleStats(article.id, tx);
      const inserted = await tx.$executeRaw`
        INSERT IGNORE INTO article_likes (article_id, user_id, created_at)
        VALUES (${article.id}, ${req.auth.userId}, CURRENT_TIMESTAMP(3))
      `;

      if (Number(inserted) > 0) {
        await tx.$executeRaw`
          UPDATE article_stats
          SET like_count = like_count + 1, updated_at = CURRENT_TIMESTAMP(3)
          WHERE article_id = ${article.id}
        `;
        changed = true;
      }
    });

    return res.json({
      changed,
      article: await formatArticleWithStats(article, req.auth.userId)
    });
  } catch (error) {
    return next(error);
  }
});

router.delete("/:slug/likes", requireAuth, async (req, res, next) => {
  try {
    const article = await findPublishedArticleBySlug(req.params.slug, {
      include: articleInclude()
    });

    if (!article) {
      return res.status(404).json({
        message: "文章不存在。"
      });
    }

    let changed = false;

    await prisma.$transaction(async (tx) => {
      const deleted = await tx.$executeRaw`
        DELETE FROM article_likes
        WHERE article_id = ${article.id}
          AND user_id = ${req.auth.userId}
      `;

      if (Number(deleted) > 0) {
        await ensureArticleStats(article.id, tx);
        await tx.$executeRaw`
          UPDATE article_stats
          SET like_count = GREATEST(like_count - 1, 0), updated_at = CURRENT_TIMESTAMP(3)
          WHERE article_id = ${article.id}
        `;
        changed = true;
      }
    });

    return res.json({
      changed,
      article: await formatArticleWithStats(article, req.auth.userId)
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/:slug/favorites", requireAuth, async (req, res, next) => {
  try {
    const article = await findPublishedArticleBySlug(req.params.slug, {
      include: articleInclude()
    });

    if (!article) {
      return res.status(404).json({
        message: "文章不存在。"
      });
    }

    let changed = false;

    await prisma.$transaction(async (tx) => {
      await ensureArticleStats(article.id, tx);
      const inserted = await tx.$executeRaw`
        INSERT IGNORE INTO article_favorites (article_id, user_id, created_at)
        VALUES (${article.id}, ${req.auth.userId}, CURRENT_TIMESTAMP(3))
      `;

      if (Number(inserted) > 0) {
        await tx.$executeRaw`
          UPDATE article_stats
          SET favorite_count = favorite_count + 1, updated_at = CURRENT_TIMESTAMP(3)
          WHERE article_id = ${article.id}
        `;
        changed = true;
      }
    });

    return res.json({
      changed,
      article: await formatArticleWithStats(article, req.auth.userId)
    });
  } catch (error) {
    return next(error);
  }
});

router.delete("/:slug/favorites", requireAuth, async (req, res, next) => {
  try {
    const article = await findPublishedArticleBySlug(req.params.slug, {
      include: articleInclude()
    });

    if (!article) {
      return res.status(404).json({
        message: "文章不存在。"
      });
    }

    let changed = false;

    await prisma.$transaction(async (tx) => {
      const deleted = await tx.$executeRaw`
        DELETE FROM article_favorites
        WHERE article_id = ${article.id}
          AND user_id = ${req.auth.userId}
      `;

      if (Number(deleted) > 0) {
        await ensureArticleStats(article.id, tx);
        await tx.$executeRaw`
          UPDATE article_stats
          SET favorite_count = GREATEST(favorite_count - 1, 0), updated_at = CURRENT_TIMESTAMP(3)
          WHERE article_id = ${article.id}
        `;
        changed = true;
      }
    });

    return res.json({
      changed,
      article: await formatArticleWithStats(article, req.auth.userId)
    });
  } catch (error) {
    return next(error);
  }
});

router.post(
  "/admin/import",
  requireAuth,
  requireRole("ADMIN"),
  importUpload.single("archive"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: "请选择要导入的 zip 文件。"
        });
      }

      let zip;

      try {
        zip = new AdmZip(req.file.buffer);
      } catch (_error) {
        return res.status(400).json({
          message: "上传的文件不是有效的 zip 压缩包。"
        });
      }

      const { markdownEntries, imageEntries, formatErrors } = collectZipEntries(zip);
      const imported = [];
      const failed = [];
      const missingImages = [];

      for (const [index, markdownEntry] of markdownEntries.entries()) {
        let articleId = null;

        try {
          const contentMarkdown = markdownEntry.entry.getData().toString("utf8");
          const title = titleFromMarkdownFile(markdownEntry.entryName, contentMarkdown);
          const slug = slugFromMarkdownFile(markdownEntry.entryName) || `article-${index + 1}`;

          if (!title) {
            failed.push({
              file: markdownEntry.entryName,
              reason: "无法从 Markdown 文件生成标题。"
            });
            continue;
          }

          const article = await prisma.article.create({
            data: {
              authorId: req.auth.userId,
              title,
              slug,
              contentMarkdown,
              contentHtml: renderMarkdownToSafeHtml(contentMarkdown),
              chapterOrder: await nextArticleChapterOrder(),
              status: ArticleStatus.DRAFT
            }
          });
          articleId = article.id;

          const rewrittenMarkdown = await importArticleImages({
            articleId,
            contentMarkdown,
            imageEntries,
            missingImages
          });

          const updatedArticle = await prisma.article.update({
            where: {
              id: articleId
            },
            data: {
              contentMarkdown: rewrittenMarkdown,
              contentHtml: renderMarkdownToSafeHtml(rewrittenMarkdown)
            },
            include: articleInclude()
          });

          imported.push({
            file: markdownEntry.entryName,
            article: formatArticle(updatedArticle)
          });
        } catch (error) {
          if (articleId) {
            await prisma.article.delete({
              where: {
                id: articleId
              }
            });

            const articleDirectory = path.join(uploadsRoot, String(articleId));

            if (fs.existsSync(articleDirectory)) {
              fs.rmSync(articleDirectory, { recursive: true, force: true });
            }
          }

          const reason =
            error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
              ? "该 Slug 的文章已存在。"
              : error.message || "文章导入失败。";

          failed.push({
            file: markdownEntry.entryName,
            reason
          });
        }
      }

      return res.status(201).json({
        imported,
        missingImages,
        formatErrors,
        failed,
        summary: {
          imported: imported.length,
          missingImages: missingImages.length,
          formatErrors: formatErrors.length,
          failed: failed.length
        }
      });
    } catch (error) {
      return next(error);
    }
  }
);

router.post(
  "/uploads/images",
  requireAuth,
  (req, res, next) => {
    if (req.user?.role === "ADMIN") {
      return res.status(403).json({
        message: "管理员不再使用投稿图片上传入口。"
      });
    }

    return next();
  },
  draftImageUpload.array("images", 20),
  async (req, res, next) => {
    try {
      const files = Array.isArray(req.files) ? req.files : [];

      if (files.length === 0) {
        return res.status(400).json({
          message: "请选择要上传的图片文件。"
        });
      }

      const userId = Number(req.auth.userId);
      const images = files.map((file) => {
        const imageUrl = `/uploads/article-drafts/${userId}/${file.filename}`;
        const altText = escapeMarkdownAltText(path.basename(file.originalname, path.extname(file.originalname)));

        return {
          imageUrl,
          originalName: file.originalname,
          size: file.size,
          markdown: `![${altText}](${imageUrl})`
        };
      });

      return res.status(201).json({
        images
      });
    } catch (error) {
      return next(error);
    }
  }
);

router.post("/admin", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const built = buildArticleData(req.body);

    if (built.error) {
      return res.status(400).json({
        message: built.error
      });
    }

    const { categoryName, tagNames, ...articleData } = built.data;
    const requestedChapterOrder = articleData.chapterOrder ?? (await nextArticleChapterOrder());
    const relations = await buildArticleRelations({
      categoryName,
      tagNames
    });

    const article = await prisma.article.create({
      data: {
        ...articleData,
        chapterOrder: requestedChapterOrder,
        categoryId: relations.categoryId,
        authorId: req.auth.userId,
        status: ArticleStatus.DRAFT
      },
      include: articleInclude()
    });

    await replaceArticleTags(article.id, relations.tagIds);
    await moveArticleToChapterOrder(article.id, requestedChapterOrder);

    const articleWithTags = await prisma.article.findUnique({
      where: {
        id: article.id
      },
      include: articleInclude()
    });

    return res.status(201).json({
      article: formatArticle(articleWithTags)
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return res.status(409).json({
        message: "该 Slug 的文章已存在。"
      });
    }

    return next(error);
  }
});

router.patch("/admin/:id", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const articleId = Number(req.params.id);

    if (!articleId) {
      return res.status(400).json({
        message: "文章 ID 无效。"
      });
    }

    const existingArticle = await ensureArticleExists(articleId);

    if (!existingArticle) {
      return res.status(404).json({
        message: "文章不存在。"
      });
    }

    const built = buildArticleData(req.body);

    if (built.error) {
      return res.status(400).json({
        message: built.error
      });
    }

    const { categoryName, tagNames, ...articleData } = built.data;
    const requestedChapterOrder = articleData.chapterOrder ?? existingArticle.chapterOrder;
    const relations = await buildArticleRelations({
      categoryName,
      tagNames
    });

    await replaceArticleTags(articleId, relations.tagIds);

    await prisma.article.update({
      where: {
        id: articleId
      },
      data: {
        ...articleData,
        categoryId: relations.categoryId
      },
      include: articleInclude()
    });
    await moveArticleToChapterOrder(articleId, requestedChapterOrder);

    const article = await prisma.article.findUnique({
      where: {
        id: articleId
      },
      include: articleInclude()
    });

    return res.json({
      article: formatArticle(article)
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return res.status(409).json({
        message: "该 Slug 的文章已存在。"
      });
    }

    return next(error);
  }
});

router.post("/admin/:id/publish", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const articleId = Number(req.params.id);

    if (!articleId) {
      return res.status(400).json({
        message: "文章 ID 无效。"
      });
    }

    const existingArticle = await ensureArticleExists(articleId);

    if (!existingArticle) {
      return res.status(404).json({
        message: "文章不存在。"
      });
    }

    const article = await prisma.article.update({
      where: {
        id: articleId
      },
      data: {
        status: ArticleStatus.PUBLISHED
      },
      include: articleInclude()
    });
    await setPublishedAtIfMissing(articleId);
    const [articleWithPublishTime] = await withArticlePublishTimes([article]);

    return res.json({
      article: formatArticle(articleWithPublishTime)
    });
  } catch (error) {
    return next(error);
  }
});

router.delete("/admin/:id", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const articleId = Number(req.params.id);

    if (!articleId) {
      return res.status(400).json({
        message: "文章 ID 无效。"
      });
    }

    const existingArticle = await ensureArticleExists(articleId);

    if (!existingArticle) {
      return res.status(404).json({
        message: "文章不存在。"
      });
    }

    await prisma.article.delete({
      where: {
        id: articleId
      }
    });

    const articleDirectory = path.join(uploadsRoot, String(articleId));

    if (fs.existsSync(articleDirectory)) {
      fs.rmSync(articleDirectory, { recursive: true, force: true });
    }

    return res.json({
      ok: true
    });
  } catch (error) {
    return next(error);
  }
});

router.post(
  "/admin/:id/images",
  requireAuth,
  requireRole("ADMIN"),
  upload.single("image"),
  async (req, res, next) => {
    // Legacy admin authoring path. The new user submission editor uses /articles/uploads/images.
    try {
      const articleId = Number(req.params.id);

      if (!articleId) {
        return res.status(400).json({
          message: "文章 ID 无效。"
        });
      }

      const existingArticle = await ensureArticleExists(articleId);

      if (!existingArticle) {
        if (req.file?.path && fs.existsSync(req.file.path)) {
          fs.rmSync(req.file.path, { force: true });
        }

        return res.status(404).json({
          message: "文章不存在。"
        });
      }

      if (!req.file) {
        return res.status(400).json({
          message: "请选择要上传的图片文件。"
        });
      }

      const imageUrl = `/uploads/articles/${articleId}/${req.file.filename}`;
      const altText = String(req.body?.altText || "").trim() || null;
      const sortOrder = parseChapterOrder(req.body?.sortOrder);

      const image = await prisma.articleImage.create({
        data: {
          articleId,
          imageUrl,
          altText,
          sortOrder
        }
      });

      return res.status(201).json({
        image: {
          id: image.id,
          imageUrl: image.imageUrl,
          altText: image.altText,
          sortOrder: image.sortOrder
        },
        markdown: `![${altText || "Article image"}](${imageUrl})`
      });
    } catch (error) {
      return next(error);
    }
  }
);

export default router;
