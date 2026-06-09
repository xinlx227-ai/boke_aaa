import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import AdmZip from "adm-zip";

let server;
let baseUrl;
let prisma;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsRoot = path.resolve(__dirname, "../uploads/articles");
const draftUploadsRoot = path.resolve(__dirname, "../uploads/article-drafts");

before(async () => {
  const [{ default: app }, prismaModule] = await Promise.all([
    import("../src/app.js"),
    import("../src/lib/prisma.js")
  ]);

  prisma = prismaModule.prisma;

  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const address = server.address();
      baseUrl = `http://127.0.0.1:${address.port}/api`;
      resolve();
    });
  });
});

after(async () => {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }

  if (prisma) {
    await prisma.$disconnect();
  }
});

async function apiRequest(pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: {
      ...(options.headers || {})
    }
  });

  let body = null;

  try {
    body = await response.json();
  } catch (_error) {
    body = null;
  }

  return {
    status: response.status,
    body
  };
}

async function createRegisteredUser({ username, email, password = "Passw0rd!", role = "USER" }) {
  const registerResult = await apiRequest("/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      username,
      email,
      password
    })
  });

  assert.equal(registerResult.status, 201);

  if (role !== "USER") {
    await prisma.user.update({
      where: {
        email
      },
      data: {
        role
      }
    });
  }

  const loginResult = await apiRequest("/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      account: email,
      password
    })
  });

  assert.equal(loginResult.status, 200);

  return {
    user: loginResult.body.user,
    token: loginResult.body.token
  };
}

test("admin article publishing flow stores markdown, sanitizes HTML, uploads images, and exposes published detail", async () => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  const username = `editor_${suffix}`;
  const email = `${username}@example.com`;
  const password = "Passw0rd!";
  const initialSlug = `hello-markdown-${suffix}`;
  const updatedSlug = `hello-markdown-updated-${suffix}`;

  const registerResult = await apiRequest("/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      username,
      email,
      password
    })
  });

  assert.equal(registerResult.status, 201);

  await prisma.user.update({
    where: {
      email
    },
    data: {
      role: "ADMIN"
    }
  });

  const loginResult = await apiRequest("/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      account: email,
      password
    })
  });

  assert.equal(loginResult.status, 200);
  const token = loginResult.body.token;

  const createResult = await apiRequest("/articles/admin", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      title: "Hello Markdown",
      slug: initialSlug,
      chapterOrder: 1,
      contentMarkdown: [
        "# Heading",
        "",
        "A paragraph with **bold** text.",
        "",
        "<script>alert('xss')</script>",
        "",
        "[bad](javascript:alert('xss'))"
      ].join("\n")
    })
  });

  assert.equal(createResult.status, 201);
  assert.equal(createResult.body.article.status, "DRAFT");
  assert.match(createResult.body.article.contentHtml, /<h1 id="heading">Heading<\/h1>/);
  assert.doesNotMatch(createResult.body.article.contentHtml, /<script>/i);
  assert.doesNotMatch(createResult.body.article.contentHtml, /href="javascript:/i);

  const articleId = createResult.body.article.id;

  const articleCountBeforeAutoOrder = await prisma.article.count();
  const autoOrderResult = await apiRequest("/articles/admin", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      title: "Auto Ordered Article",
      slug: `auto-ordered-${suffix}`,
      contentMarkdown: "# Auto Ordered Article"
    })
  });

  assert.equal(autoOrderResult.status, 201);
  assert.equal(autoOrderResult.body.article.chapterOrder, articleCountBeforeAutoOrder + 1);

  const manualReorderResult = await apiRequest(`/articles/admin/${autoOrderResult.body.article.id}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      title: "Auto Ordered Article",
      slug: `auto-ordered-${suffix}`,
      chapterOrder: 1,
      contentMarkdown: "# Auto Ordered Article"
    })
  });

  assert.equal(manualReorderResult.status, 200);
  assert.equal(manualReorderResult.body.article.chapterOrder, 1);

  const shiftedArticle = await prisma.article.findUnique({
    where: {
      id: articleId
    }
  });
  assert.equal(shiftedArticle.chapterOrder, 2);

  const updateResult = await apiRequest(`/articles/admin/${articleId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      title: "Hello Markdown Updated",
      slug: updatedSlug,
      chapterOrder: 2,
      categoryName: "Guides",
      tagNames: ["Markdown", "Vue"],
      contentMarkdown: [
        "# Updated Heading",
        "",
        "## Reading Experience",
        "",
        "Inline image placeholder:",
        "",
        "![Alt](/uploads/articles/1/demo.png)"
      ].join("\n")
    })
  });

  assert.equal(updateResult.status, 200);
  assert.equal(updateResult.body.article.slug, updatedSlug);
  assert.equal(updateResult.body.article.category.slug, "guides");
  assert.deepEqual(
    updateResult.body.article.tags.map((tag) => tag.slug),
    ["markdown", "vue"]
  );
  assert.match(updateResult.body.article.contentHtml, /Updated Heading/);
  assert.match(updateResult.body.article.contentHtml, /id="updated-heading"/);
  assert.match(updateResult.body.article.contentHtml, /\/uploads\/articles\/1\/demo\.png/);

  const imageBuffer = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO6s9WQAAAAASUVORK5CYII=",
    "base64"
  );
  const imageForm = new FormData();
  imageForm.append("altText", "Demo image");
  imageForm.append("image", new Blob([imageBuffer], { type: "image/png" }), "demo.png");

  const uploadResult = await apiRequest(`/articles/admin/${articleId}/images`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: imageForm
  });

  assert.equal(uploadResult.status, 201);
  assert.match(uploadResult.body.image.imageUrl, new RegExp(`/uploads/articles/${articleId}/`));
  assert.match(uploadResult.body.markdown, /^!\[Demo image\]\(\/uploads\/articles\//);

  const updateWithUploadedImageResult = await apiRequest(`/articles/admin/${articleId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      title: "Hello Markdown Updated",
      slug: updatedSlug,
      chapterOrder: 2,
      categoryName: "Guides",
      tagNames: ["Markdown", "Vue"],
      contentMarkdown: [
        "# Updated Heading",
        "",
        "## Reading Experience",
        "",
        "Inline image from upload:",
        "",
        uploadResult.body.markdown
      ].join("\n")
    })
  });

  assert.equal(updateWithUploadedImageResult.status, 200);
  assert.match(updateWithUploadedImageResult.body.article.contentMarkdown, new RegExp(uploadResult.body.image.imageUrl));
  assert.match(updateWithUploadedImageResult.body.article.contentHtml, new RegExp(uploadResult.body.image.imageUrl));

  const uploadedArticle = await prisma.article.findUnique({
    where: {
      id: articleId
    },
    include: {
      images: true
    }
  });

  assert.equal(uploadedArticle.images.length, 1);
  assert.match(uploadedArticle.images[0].imageUrl, new RegExp(`/uploads/articles/${articleId}/`));

  const publishResult = await apiRequest(`/articles/admin/${articleId}/publish`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  assert.equal(publishResult.status, 200);
  assert.equal(publishResult.body.article.status, "PUBLISHED");

  const publicListResult = await apiRequest("/articles");
  assert.equal(publicListResult.status, 200);
  assert.ok(publicListResult.body.articles.some((article) => article.slug === updatedSlug));

  const searchResult = await apiRequest("/articles?q=Reading");
  assert.equal(searchResult.status, 200);
  assert.ok(searchResult.body.articles.some((article) => article.slug === updatedSlug));

  const categorySearchResult = await apiRequest("/articles?q=Guides");
  assert.equal(categorySearchResult.status, 200);
  assert.ok(categorySearchResult.body.articles.some((article) => article.slug === updatedSlug));

  const tagSearchResult = await apiRequest("/articles?q=Vue");
  assert.equal(tagSearchResult.status, 200);
  assert.ok(tagSearchResult.body.articles.some((article) => article.slug === updatedSlug));

  const categoryResult = await apiRequest("/articles?category=guides");
  assert.equal(categoryResult.status, 200);
  assert.ok(categoryResult.body.articles.some((article) => article.slug === updatedSlug));

  const tagResult = await apiRequest("/articles?tag=markdown");
  assert.equal(tagResult.status, 200);
  assert.ok(tagResult.body.articles.some((article) => article.slug === updatedSlug));

  const filtersResult = await apiRequest("/articles/filters");
  assert.equal(filtersResult.status, 200);
  const guidesCategory = filtersResult.body.categories.find((category) => category.slug === "guides");
  assert.ok(guidesCategory);
  assert.ok(guidesCategory.articleCount >= 1);
  assert.ok(guidesCategory.createdAt);
  const markdownTag = filtersResult.body.tags.find((tag) => tag.slug === "markdown");
  assert.ok(markdownTag);
  assert.ok(markdownTag.articleCount >= 1);
  assert.ok(markdownTag.createdAt);

  const publicDetailResult = await apiRequest(`/articles/${updatedSlug}`);
  assert.equal(publicDetailResult.status, 200);
  assert.match(publicDetailResult.body.article.contentHtml, /Updated Heading/);
  assert.match(publicDetailResult.body.article.contentMarkdown, new RegExp(uploadResult.body.image.imageUrl));
  assert.match(publicDetailResult.body.article.contentHtml, new RegExp(uploadResult.body.image.imageUrl));
  assert.deepEqual(
    publicDetailResult.body.article.toc.map((item) => item.id),
    ["updated-heading", "reading-experience"]
  );

  const uploadsDirectory = path.join(uploadsRoot, String(articleId));
  const uploadedFiles = await fs.readdir(uploadsDirectory);
  assert.equal(uploadedFiles.length, 1);

  const deleteResult = await apiRequest(`/articles/admin/${articleId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  assert.equal(deleteResult.status, 200);

  const deletedArticle = await prisma.article.findUnique({
    where: {
      id: articleId
    }
  });
  assert.equal(deletedArticle, null);

  await prisma.user.delete({
    where: {
      email
    }
  });
});

test("regular users can upload draft editor images while admins are blocked from the user upload path", async () => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  const userAccount = await createRegisteredUser({
    username: `draft_image_${suffix}`,
    email: `draft_image_${suffix}@example.com`
  });
  const adminAccount = await createRegisteredUser({
    username: `draft_image_admin_${suffix}`,
    email: `draft_image_admin_${suffix}@example.com`,
    role: "ADMIN"
  });
  const imageBuffer = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO6s9WQAAAAASUVORK5CYII=",
    "base64"
  );

  const form = new FormData();
  form.append("images", new Blob([imageBuffer], { type: "image/png" }), "draft-one.png");
  form.append("images", new Blob([imageBuffer], { type: "image/png" }), "draft-two.png");

  const uploadResult = await apiRequest("/articles/uploads/images", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${userAccount.token}`
    },
    body: form
  });

  assert.equal(uploadResult.status, 201);
  assert.equal(uploadResult.body.images.length, 2);
  assert.match(uploadResult.body.images[0].imageUrl, new RegExp(`/uploads/article-drafts/${userAccount.user.id}/`));
  assert.match(uploadResult.body.images[0].markdown, /^!\[draft-one\]\(\/uploads\/article-drafts\//);

  const userDraftDirectory = path.join(draftUploadsRoot, String(userAccount.user.id));
  const uploadedFiles = await fs.readdir(userDraftDirectory);
  assert.equal(uploadedFiles.length, 2);

  const adminForm = new FormData();
  adminForm.append("images", new Blob([imageBuffer], { type: "image/png" }), "admin-draft.png");

  const adminUploadResult = await apiRequest("/articles/uploads/images", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminAccount.token}`
    },
    body: adminForm
  });

  assert.equal(adminUploadResult.status, 403);

  await fs.rm(userDraftDirectory, {
    recursive: true,
    force: true
  });
  await prisma.user.deleteMany({
    where: {
      email: {
        in: [`draft_image_${suffix}@example.com`, `draft_image_admin_${suffix}@example.com`]
      }
    }
  });
});

test("regular users can save drafts, submit for review, withdraw, and delete editable articles", async () => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  const userAccount = await createRegisteredUser({
    username: `submission_${suffix}`,
    email: `submission_${suffix}@example.com`
  });

  const createDraftResult = await apiRequest("/articles/drafts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${userAccount.token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contentMarkdown: ""
    })
  });

  assert.equal(createDraftResult.status, 201);
  assert.equal(createDraftResult.body.article.status, "DRAFT");
  assert.equal(createDraftResult.body.article.title, "未命名草稿");
  assert.match(createDraftResult.body.article.slug, /^draft-/);
  const draftId = createDraftResult.body.article.id;

  const invalidSubmitResult = await apiRequest(`/articles/drafts/${draftId}/submit`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${userAccount.token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      title: "缺少分类的投稿",
      contentMarkdown: "# 缺少分类的投稿"
    })
  });

  assert.equal(invalidSubmitResult.status, 400);
  assert.match(invalidSubmitResult.body.message, /分类/);

  const submitResult = await apiRequest(`/articles/drafts/${draftId}/submit`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${userAccount.token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      title: "用户投稿文章",
      categoryName: "投稿测试",
      tagNames: ["投稿", "审核"],
      contentMarkdown: "# 用户投稿文章\n\n等待管理员审核。"
    })
  });

  assert.equal(submitResult.status, 200);
  assert.equal(submitResult.body.article.status, "PENDING_REVIEW");
  assert.equal(submitResult.body.article.category.slug, "投稿测试");
  assert.ok(submitResult.body.article.submittedAt);
  assert.equal(submitResult.body.article.slug, "用户投稿文章");

  const publicListResult = await apiRequest("/articles");
  assert.equal(publicListResult.status, 200);
  assert.equal(publicListResult.body.articles.some((article) => article.id === draftId), false);

  const editSubmittedResult = await apiRequest(`/articles/drafts/${draftId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${userAccount.token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      title: "用户投稿文章更新",
      categoryName: "投稿测试",
      contentMarkdown: "# 用户投稿文章更新"
    })
  });

  assert.equal(editSubmittedResult.status, 409);

  const deleteSubmittedResult = await apiRequest(`/articles/drafts/${draftId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${userAccount.token}`
    }
  });

  assert.equal(deleteSubmittedResult.status, 409);

  const withdrawResult = await apiRequest(`/articles/drafts/${draftId}/withdraw`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${userAccount.token}`
    }
  });

  assert.equal(withdrawResult.status, 200);
  assert.equal(withdrawResult.body.article.status, "DRAFT");

  const updateDraftResult = await apiRequest(`/articles/drafts/${draftId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${userAccount.token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      title: "用户投稿文章第二版",
      categoryName: "投稿测试",
      tagNames: ["投稿"],
      contentMarkdown: "# 用户投稿文章第二版"
    })
  });

  assert.equal(updateDraftResult.status, 200);
  assert.equal(updateDraftResult.body.article.status, "DRAFT");
  assert.equal(updateDraftResult.body.article.slug, submitResult.body.article.slug);

  const myArticlesResult = await apiRequest("/articles/me", {
    headers: {
      Authorization: `Bearer ${userAccount.token}`
    }
  });

  assert.equal(myArticlesResult.status, 200);
  assert.ok(myArticlesResult.body.articles.some((article) => article.id === draftId));

  const deleteDraftResult = await apiRequest(`/articles/drafts/${draftId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${userAccount.token}`
    }
  });

  assert.equal(deleteDraftResult.status, 200);

  const deletedArticle = await prisma.article.findUnique({
    where: {
      id: draftId
    }
  });
  assert.equal(deletedArticle, null);

  await prisma.user.delete({
    where: {
      email: `submission_${suffix}@example.com`
    }
  });
});

test("article submission metadata persists and drives public comments and pinning", async () => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  const userAccount = await createRegisteredUser({
    username: `metadata_user_${suffix}`,
    email: `metadata_user_${suffix}@example.com`
  });
  const adminAccount = await createRegisteredUser({
    username: `metadata_admin_${suffix}`,
    email: `metadata_admin_${suffix}@example.com`,
    role: "ADMIN"
  });
  const commenterAccount = await createRegisteredUser({
    username: `metadata_commenter_${suffix}`,
    email: `metadata_commenter_${suffix}@example.com`
  });
  const categoryName = `Metadata ${suffix}`;

  const createDraftResult = await apiRequest("/articles/drafts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${userAccount.token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      title: `Metadata Draft ${suffix}`,
      categoryName,
      tagNames: ["SEO", "Cover"],
      coverImageUrl: "/uploads/article-drafts/metadata-cover.png",
      coverAlt: "Metadata cover alt",
      coverRatio: "4:3",
      seoTitle: "Metadata SEO Title",
      seoKeywords: "metadata,seo",
      seoDescription: "Metadata SEO description.",
      allowComments: false,
      isPinned: true,
      contentMarkdown: "# Metadata Draft\n\nMetadata body."
    })
  });

  assert.equal(createDraftResult.status, 201);
  assert.equal(createDraftResult.body.article.coverImageUrl, "/uploads/article-drafts/metadata-cover.png");
  assert.equal(createDraftResult.body.article.coverAlt, "Metadata cover alt");
  assert.equal(createDraftResult.body.article.coverRatio, "4:3");
  assert.equal(createDraftResult.body.article.seoTitle, "Metadata SEO Title");
  assert.equal(createDraftResult.body.article.seoKeywords, "metadata,seo");
  assert.equal(createDraftResult.body.article.seoDescription, "Metadata SEO description.");
  assert.equal(createDraftResult.body.article.allowComments, false);
  assert.equal(createDraftResult.body.article.isPinned, true);
  const metadataCategory = createDraftResult.body.article.category;

  const draftId = createDraftResult.body.article.id;
  const loadedDraftResult = await apiRequest(`/articles/drafts/${draftId}`, {
    headers: {
      Authorization: `Bearer ${userAccount.token}`
    }
  });

  assert.equal(loadedDraftResult.status, 200);
  assert.equal(loadedDraftResult.body.article.coverImageUrl, "/uploads/article-drafts/metadata-cover.png");
  assert.equal(loadedDraftResult.body.article.seoDescription, "Metadata SEO description.");

  const submitResult = await apiRequest(`/articles/drafts/${draftId}/submit`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${userAccount.token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      title: `Metadata Published ${suffix}`,
      categoryName,
      tagNames: ["SEO", "Cover"],
      contentMarkdown: "# Metadata Published\n\nMetadata published body."
    })
  });

  assert.equal(submitResult.status, 200);
  assert.equal(submitResult.body.article.status, "PENDING_REVIEW");
  assert.equal(submitResult.body.article.coverImageUrl, "/uploads/article-drafts/metadata-cover.png");
  assert.equal(submitResult.body.article.allowComments, false);
  assert.equal(submitResult.body.article.isPinned, true);

  const olderArticle = await prisma.article.create({
    data: {
      authorId: adminAccount.user.id,
      title: `Older Metadata Article ${suffix}`,
      slug: `older-metadata-${suffix}`,
      contentMarkdown: "# Older Metadata",
      contentHtml: "<h1>Older Metadata</h1>",
      chapterOrder: 1,
      categoryId: metadataCategory.id,
      status: "PUBLISHED",
      publishedAt: new Date(Date.now() - 60 * 60 * 1000)
    }
  });
  await prisma.article.create({
    data: {
      authorId: adminAccount.user.id,
      title: `Newer Metadata Article ${suffix}`,
      slug: `newer-metadata-${suffix}`,
      contentMarkdown: "# Newer Metadata",
      contentHtml: "<h1>Newer Metadata</h1>",
      chapterOrder: 2,
      categoryId: metadataCategory.id,
      status: "PUBLISHED",
      publishedAt: new Date()
    }
  });

  const approveResult = await apiRequest(`/articles/admin/reviews/${draftId}/approve`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminAccount.token}`
    }
  });

  assert.equal(approveResult.status, 200);
  assert.equal(approveResult.body.article.status, "PUBLISHED");
  assert.equal(approveResult.body.article.coverImageUrl, "/uploads/article-drafts/metadata-cover.png");
  assert.equal(approveResult.body.article.seoDescription, "Metadata SEO description.");
  assert.equal(approveResult.body.article.allowComments, false);
  assert.equal(approveResult.body.article.isPinned, true);

  const publicDetailResult = await apiRequest(`/articles/${approveResult.body.article.slug}`);
  assert.equal(publicDetailResult.status, 200);
  assert.equal(publicDetailResult.body.article.coverImageUrl, "/uploads/article-drafts/metadata-cover.png");
  assert.equal(publicDetailResult.body.article.seoTitle, "Metadata SEO Title");
  assert.equal(publicDetailResult.body.article.allowComments, false);

  await prisma.article.update({
    where: {
      id: draftId
    },
    data: {
      publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
    }
  });

  const blockedComment = await apiRequest(`/comments/articles/${approveResult.body.article.slug}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${commenterAccount.token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      content: "Should be blocked."
    })
  });
  assert.equal(blockedComment.status, 403);

  const publicListResult = await apiRequest(`/articles?category=${encodeURIComponent(metadataCategory.slug)}`);
  assert.equal(publicListResult.status, 200);
  assert.equal(publicListResult.body.articles[0].id, draftId);

  const searchResult = await apiRequest(`/articles?q=${encodeURIComponent(categoryName)}`);
  assert.equal(searchResult.status, 200);
  assert.ok(searchResult.body.articles.some((article) => article.id === draftId));
  assert.equal(searchResult.body.articles[0].slug, `newer-metadata-${suffix}`);

  await prisma.article.deleteMany({
    where: {
      id: {
        in: [draftId, olderArticle.id]
      }
    }
  });
  await prisma.article.deleteMany({
    where: {
      slug: `newer-metadata-${suffix}`
    }
  });
  await prisma.user.deleteMany({
    where: {
      email: {
        in: [
          `metadata_user_${suffix}@example.com`,
          `metadata_admin_${suffix}@example.com`,
          `metadata_commenter_${suffix}@example.com`
        ]
      }
    }
  });
});

test("logged-in users can preview unsaved markdown without creating an article", async () => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  const userAccount = await createRegisteredUser({
    username: `preview_${suffix}`,
    email: `preview_${suffix}@example.com`
  });
  const articleCountBeforePreview = await prisma.article.count();

  const previewResult = await apiRequest("/articles/preview", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${userAccount.token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      title: "",
      categoryName: "",
      tagNames: ["预览", "Markdown"],
      contentMarkdown: "# Preview Heading\n\n<script>alert('xss')</script>\n\n**正文**"
    })
  });

  assert.equal(previewResult.status, 200);
  assert.equal(previewResult.body.preview.title, "未命名草稿");
  assert.match(previewResult.body.preview.contentHtml, /<h1 id="preview-heading">Preview Heading<\/h1>/);
  assert.match(previewResult.body.preview.contentHtml, /<strong>正文<\/strong>/);
  assert.doesNotMatch(previewResult.body.preview.contentHtml, /<script>/i);
  assert.deepEqual(
    previewResult.body.preview.tags.map((tag) => tag.slug),
    ["预览", "markdown"]
  );

  const articleCountAfterPreview = await prisma.article.count();
  assert.equal(articleCountAfterPreview, articleCountBeforePreview);

  await prisma.user.delete({
    where: {
      email: `preview_${suffix}@example.com`
    }
  });
});

test("admins can approve or reject pending user submissions", async () => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  const userAccount = await createRegisteredUser({
    username: `review_user_${suffix}`,
    email: `review_user_${suffix}@example.com`
  });
  const adminAccount = await createRegisteredUser({
    username: `review_admin_${suffix}`,
    email: `review_admin_${suffix}@example.com`,
    role: "ADMIN"
  });

  async function submitArticle(title) {
    const result = await apiRequest("/articles/drafts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${userAccount.token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        submit: true,
        title,
        categoryName: "审核测试",
        tagNames: ["审核"],
        contentMarkdown: `# ${title}\n\n等待审核。`
      })
    });

    assert.equal(result.status, 201);
    assert.equal(result.body.article.status, "PENDING_REVIEW");
    return result.body.article;
  }

  const approveTarget = await submitArticle("审核通过文章");
  const rejectTarget = await submitArticle("审核驳回文章");

  const reviewListResult = await apiRequest("/articles/admin/reviews", {
    headers: {
      Authorization: `Bearer ${adminAccount.token}`
    }
  });

  assert.equal(reviewListResult.status, 200);
  assert.ok(reviewListResult.body.articles.some((article) => article.id === approveTarget.id));
  assert.ok(reviewListResult.body.articles.some((article) => article.id === rejectTarget.id));

  const taskSummaryResult = await apiRequest("/admin/review-tasks/summary", {
    headers: {
      Authorization: `Bearer ${adminAccount.token}`
    }
  });
  assert.equal(taskSummaryResult.status, 200);
  assert.ok(taskSummaryResult.body.reviewTasks.hasPendingReview);
  assert.ok(taskSummaryResult.body.reviewTasks.pendingArticleCount >= 2);
  const pendingArticleCountBeforeReview = taskSummaryResult.body.reviewTasks.pendingArticleCount;

  const approveResult = await apiRequest(`/articles/admin/reviews/${approveTarget.id}/approve`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminAccount.token}`
    }
  });

  assert.equal(approveResult.status, 200);
  assert.equal(approveResult.body.article.status, "PUBLISHED");
  assert.ok(approveResult.body.article.publishedAt);
  assert.ok(approveResult.body.article.reviewedAt);
  assert.equal(approveResult.body.article.reviewer.id, adminAccount.user.id);

  const publicDetailResult = await apiRequest(`/articles/${approveResult.body.article.slug}`);
  assert.equal(publicDetailResult.status, 200);
  assert.equal(publicDetailResult.body.article.id, approveTarget.id);

  const missingReasonResult = await apiRequest(`/articles/admin/reviews/${rejectTarget.id}/reject`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminAccount.token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      reviewNote: ""
    })
  });

  assert.equal(missingReasonResult.status, 400);

  const rejectResult = await apiRequest(`/articles/admin/reviews/${rejectTarget.id}/reject`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminAccount.token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      reviewNote: "标题需要更具体。"
    })
  });

  assert.equal(rejectResult.status, 200);
  assert.equal(rejectResult.body.article.status, "REJECTED");
  assert.equal(rejectResult.body.article.reviewNote, "标题需要更具体。");
  assert.ok(rejectResult.body.article.reviewedAt);
  assert.equal(rejectResult.body.article.reviewer.id, adminAccount.user.id);

  const userArticlesResult = await apiRequest("/articles/me", {
    headers: {
      Authorization: `Bearer ${userAccount.token}`
    }
  });

  assert.equal(userArticlesResult.status, 200);
  assert.ok(
    userArticlesResult.body.articles.some(
      (article) => article.id === rejectTarget.id && article.status === "REJECTED" && article.reviewNote === "标题需要更具体。"
    )
  );

  const reviewListAfterResult = await apiRequest("/articles/admin/reviews", {
    headers: {
      Authorization: `Bearer ${adminAccount.token}`
    }
  });

  assert.equal(reviewListAfterResult.status, 200);
  assert.equal(reviewListAfterResult.body.articles.some((article) => article.id === approveTarget.id), false);
  assert.equal(reviewListAfterResult.body.articles.some((article) => article.id === rejectTarget.id), false);

  const taskSummaryAfterResult = await apiRequest("/admin/review-tasks/summary", {
    headers: {
      Authorization: `Bearer ${adminAccount.token}`
    }
  });
  assert.equal(taskSummaryAfterResult.status, 200);
  assert.equal(taskSummaryAfterResult.body.reviewTasks.pendingArticleCount, pendingArticleCountBeforeReview - 2);

  await prisma.user.deleteMany({
    where: {
      email: {
        in: [`review_user_${suffix}@example.com`, `review_admin_${suffix}@example.com`]
      }
    }
  });
});

test("admin can import markdown articles from a zip and receive detailed import logs", async () => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  const username = `importer_${suffix}`;
  const email = `${username}@example.com`;
  const password = "Passw0rd!";

  const registerResult = await apiRequest("/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      username,
      email,
      password
    })
  });

  assert.equal(registerResult.status, 201);

  await prisma.user.update({
    where: {
      email
    },
    data: {
      role: "ADMIN"
    }
  });

  const loginResult = await apiRequest("/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      account: email,
      password
    })
  });

  assert.equal(loginResult.status, 200);
  const token = loginResult.body.token;
  const existingConflict = await prisma.article.create({
    data: {
      authorId: loginResult.body.user.id,
      title: "Existing duplicate slug",
      slug: `01-${suffix}-duplicate`,
      contentMarkdown: "Existing",
      contentHtml: "Existing",
      chapterOrder: 0,
      status: "DRAFT"
    }
  });

  const zip = new AdmZip();
  zip.addFile(
    `01-${suffix}-first.md`,
    Buffer.from(["# First chapter", "", "![A](images/a.png)", "", "Body one"].join("\n"), "utf8")
  );
  zip.addFile(
    `01-${suffix}-duplicate.md`,
    Buffer.from(["# Duplicate chapter", "", "This article should fail because its slug exists."].join("\n"), "utf8")
  );
  zip.addFile(
    `02-${suffix}-second.md`,
    Buffer.from(["# Second chapter", "", "![Missing](images/missing.jpg)", "", "Body two"].join("\n"), "utf8")
  );
  zip.addFile("images/a.png", Buffer.from("fake image content"));
  zip.addFile("notes.txt", Buffer.from("unsupported"));

  const importForm = new FormData();
  importForm.append(
    "archive",
    new Blob([zip.toBuffer()], {
      type: "application/zip"
    }),
    "articles.zip"
  );

  const importResult = await apiRequest("/articles/admin/import", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: importForm
  });

  assert.equal(importResult.status, 201);
  assert.equal(importResult.body.summary.imported, 2);
  assert.equal(importResult.body.summary.failed, 1);
  assert.equal(importResult.body.summary.missingImages, 1);
  assert.equal(importResult.body.summary.formatErrors, 1);

  assert.deepEqual(
    importResult.body.imported.map((item) => item.article.title),
    ["First chapter", "Second chapter"]
  );
  assert.match(importResult.body.imported[0].article.contentMarkdown, /\/uploads\/articles\/\d+\//);
  assert.doesNotMatch(importResult.body.imported[1].article.contentMarkdown, /\/uploads\/articles\/\d+\//);
  assert.equal(importResult.body.missingImages[0].path, "images/missing.jpg");
  assert.equal(importResult.body.formatErrors[0].file, "notes.txt");
  assert.match(importResult.body.failed[0].reason, /Slug 的文章已存在/);

  const importedIds = importResult.body.imported.map((item) => item.article.id);

  for (const articleId of importedIds) {
    await prisma.article.delete({
      where: {
        id: articleId
      }
    });

    await fs.rm(path.join(uploadsRoot, String(articleId)), {
      recursive: true,
      force: true
    });
  }

  await prisma.article.delete({
    where: {
      id: existingConflict.id
    }
  });

  await prisma.user.delete({
    where: {
      email
    }
  });
});

test("article comments can be viewed publicly, created by users, and deleted by admins", async () => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  const adminUsername = `comment_admin_${suffix}`;
  const userUsername = `comment_user_${suffix}`;
  const otherUsername = `comment_other_${suffix}`;
  const adminEmail = `${adminUsername}@example.com`;
  const userEmail = `${userUsername}@example.com`;
  const otherEmail = `${otherUsername}@example.com`;
  const password = "Passw0rd!";
  const articleSlug = `commented-article-${suffix}`;

  const adminRegister = await apiRequest("/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      username: adminUsername,
      email: adminEmail,
      password
    })
  });
  assert.equal(adminRegister.status, 201);

  await prisma.user.update({
    where: {
      email: adminEmail
    },
    data: {
      role: "ADMIN"
    }
  });

  const userRegister = await apiRequest("/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      username: userUsername,
      email: userEmail,
      password
    })
  });
  assert.equal(userRegister.status, 201);

  const otherRegister = await apiRequest("/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      username: otherUsername,
      email: otherEmail,
      password
    })
  });
  assert.equal(otherRegister.status, 201);

  const adminLogin = await apiRequest("/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      account: adminEmail,
      password
    })
  });
  assert.equal(adminLogin.status, 200);

  const userLogin = await apiRequest("/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      account: userEmail,
      password
    })
  });
  assert.equal(userLogin.status, 200);

  const otherLogin = await apiRequest("/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      account: otherEmail,
      password
    })
  });
  assert.equal(otherLogin.status, 200);

  const article = await prisma.article.create({
    data: {
      authorId: adminLogin.body.user.id,
      title: "Commented Article",
      slug: articleSlug,
      contentMarkdown: "# Commented Article",
      contentHtml: "<h1>Commented Article</h1>",
      chapterOrder: 1,
      status: "PUBLISHED"
    }
  });

  const emptyList = await apiRequest(`/comments/articles/${articleSlug}`);
  assert.equal(emptyList.status, 200);
  assert.deepEqual(emptyList.body.comments, []);

  const unauthenticatedCreate = await apiRequest(`/comments/articles/${articleSlug}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      content: "Anonymous comment"
    })
  });
  assert.equal(unauthenticatedCreate.status, 401);

  const createComment = await apiRequest(`/comments/articles/${articleSlug}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${userLogin.body.token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      content: "A useful comment"
    })
  });
  assert.equal(createComment.status, 201);
  assert.equal(createComment.body.comment.content, "A useful comment");
  assert.equal(createComment.body.comment.parentId, null);
  assert.equal(createComment.body.comment.likeCount, 0);
  assert.equal(createComment.body.comment.likedByMe, false);

  const createReply = await apiRequest(`/comments/articles/${articleSlug}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${otherLogin.body.token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      content: "First reply",
      parentId: createComment.body.comment.id,
      replyToCommentId: createComment.body.comment.id
    })
  });
  assert.equal(createReply.status, 201);
  assert.equal(createReply.body.comment.parentId, createComment.body.comment.id);
  assert.equal(createReply.body.comment.replyToCommentId, createComment.body.comment.id);
  assert.equal(createReply.body.comment.replyToUser.username, userUsername);

  const createNestedReply = await apiRequest(`/comments/articles/${articleSlug}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${userLogin.body.token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      content: "Nested reply",
      parentId: createComment.body.comment.id,
      replyToCommentId: createReply.body.comment.id
    })
  });
  assert.equal(createNestedReply.status, 201);
  assert.equal(createNestedReply.body.comment.parentId, createComment.body.comment.id);
  assert.equal(createNestedReply.body.comment.replyToCommentId, createReply.body.comment.id);
  assert.equal(createNestedReply.body.comment.replyToUser.username, otherUsername);

  const selfLike = await apiRequest(`/comments/${createComment.body.comment.id}/likes`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${userLogin.body.token}`
    }
  });
  assert.equal(selfLike.status, 403);

  const likeReply = await apiRequest(`/comments/${createReply.body.comment.id}/likes`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${userLogin.body.token}`
    }
  });
  assert.equal(likeReply.status, 400);

  const likeComment = await apiRequest(`/comments/${createComment.body.comment.id}/likes`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${otherLogin.body.token}`
    }
  });
  assert.equal(likeComment.status, 200);
  assert.equal(likeComment.body.changed, true);
  assert.equal(likeComment.body.likeCount, 1);
  assert.equal(likeComment.body.likedByMe, true);

  const publicList = await apiRequest(`/comments/articles/${articleSlug}`);
  assert.equal(publicList.status, 200);
  assert.equal(publicList.body.count, 3);
  assert.equal(publicList.body.comments.length, 1);
  assert.equal(publicList.body.comments[0].user.username, userUsername);
  assert.equal(publicList.body.comments[0].likeCount, 1);
  assert.equal(publicList.body.comments[0].likedByMe, false);
  assert.equal(publicList.body.comments[0].replies.length, 2);
  assert.equal(publicList.body.comments[0].replies[0].replyToUser.username, userUsername);
  assert.equal(publicList.body.comments[0].replies[1].replyToUser.username, otherUsername);

  const likedList = await apiRequest(`/comments/articles/${articleSlug}`, {
    headers: {
      Authorization: `Bearer ${otherLogin.body.token}`
    }
  });
  assert.equal(likedList.status, 200);
  assert.equal(likedList.body.comments[0].likedByMe, true);

  const unlikeComment = await apiRequest(`/comments/${createComment.body.comment.id}/likes`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${otherLogin.body.token}`
    }
  });
  assert.equal(unlikeComment.status, 200);
  assert.equal(unlikeComment.body.changed, true);
  assert.equal(unlikeComment.body.likeCount, 0);

  const userDelete = await apiRequest(`/comments/${createComment.body.comment.id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${userLogin.body.token}`
    }
  });
  assert.equal(userDelete.status, 403);

  const adminDeleteReply = await apiRequest(`/comments/${createReply.body.comment.id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${adminLogin.body.token}`
    }
  });
  assert.equal(adminDeleteReply.status, 200);

  const afterReplyDeleteList = await apiRequest(`/comments/articles/${articleSlug}`);
  assert.equal(afterReplyDeleteList.status, 200);
  assert.equal(afterReplyDeleteList.body.count, 2);
  assert.equal(afterReplyDeleteList.body.comments[0].replies.length, 1);

  const adminDeleteRoot = await apiRequest(`/comments/${createComment.body.comment.id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${adminLogin.body.token}`
    }
  });
  assert.equal(adminDeleteRoot.status, 200);

  const remainingList = await apiRequest(`/comments/articles/${articleSlug}`);
  assert.equal(remainingList.status, 200);
  assert.equal(remainingList.body.comments.length, 0);

  await prisma.article.delete({
    where: {
      id: article.id
    }
  });
  await prisma.user.delete({
    where: {
      email: userEmail
    }
  });
  await prisma.user.delete({
    where: {
      email: otherEmail
    }
  });
  await prisma.user.delete({
    where: {
      email: adminEmail
    }
  });
});

test("admins can review real sensitive comment queue", async () => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  const admin = await createRegisteredUser({
    username: `risk_admin_${suffix}`,
    email: `risk_admin_${suffix}@example.com`,
    role: "ADMIN"
  });
  const user = await createRegisteredUser({
    username: `risk_user_${suffix}`,
    email: `risk_user_${suffix}@example.com`
  });
  const other = await createRegisteredUser({
    username: `risk_other_${suffix}`,
    email: `risk_other_${suffix}@example.com`
  });
  const articleSlug = `risk-comment-article-${suffix}`;

  const article = await prisma.article.create({
    data: {
      authorId: admin.user.id,
      title: "Risk Comment Article",
      slug: articleSlug,
      contentMarkdown: "# Risk Comment Article",
      contentHtml: "<h1>Risk Comment Article</h1>",
      chapterOrder: 1,
      status: "PUBLISHED"
    }
  });

  try {
    const flaggedComment = await apiRequest(`/comments/articles/${articleSlug}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${user.token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        content: "加微信 risk123 免费领取资料"
      })
    });
    assert.equal(flaggedComment.status, 201);

    const flaggedReply = await apiRequest(`/comments/articles/${articleSlug}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${other.token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        content: "这个回复包含博彩风险",
        parentId: flaggedComment.body.comment.id,
        replyToCommentId: flaggedComment.body.comment.id
      })
    });
    assert.equal(flaggedReply.status, 201);

    const safeComment = await apiRequest(`/comments/articles/${articleSlug}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${other.token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        content: "这是一条正常评论"
      })
    });
    assert.equal(safeComment.status, 201);

    const historyCommentId = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        INSERT INTO comments (
          article_id,
          user_id,
          content,
          status,
          created_at,
          updated_at
        )
        VALUES (
          ${article.id},
          ${user.user.id},
          ${"历史评论包含 fuck 风险词"},
          "APPROVED",
          CURRENT_TIMESTAMP(3),
          CURRENT_TIMESTAMP(3)
        )
      `;
      const rows = await tx.$queryRaw`SELECT LAST_INSERT_ID() AS id`;
      return Number(rows[0].id);
    });

    const reviewQueue = await apiRequest("/admin/comments/moderation", {
      headers: {
        Authorization: `Bearer ${admin.token}`
      }
    });
    assert.equal(reviewQueue.status, 200);
    assert.ok(reviewQueue.body.backfilledCount >= 1);

    const queuedIds = new Set(reviewQueue.body.comments.map((comment) => comment.id));
    assert.ok(queuedIds.has(flaggedComment.body.comment.id));
    assert.ok(queuedIds.has(flaggedReply.body.comment.id));
    assert.ok(queuedIds.has(historyCommentId));
    assert.equal(queuedIds.has(safeComment.body.comment.id), false);

    const queuedReply = reviewQueue.body.comments.find((comment) => comment.id === flaggedReply.body.comment.id);
    assert.equal(queuedReply.type, "reply");
    assert.equal(queuedReply.replyToUser.username, user.user.username);
    assert.ok(queuedReply.moderation.reasons.includes("违法风险"));
    assert.ok(queuedReply.moderation.keywords.includes("博彩"));

    const riskSummary = await apiRequest("/admin/review-tasks/summary", {
      headers: {
        Authorization: `Bearer ${admin.token}`
      }
    });
    assert.equal(riskSummary.status, 200);
    assert.ok(riskSummary.body.reviewTasks.hasPendingReview);
    assert.ok(riskSummary.body.reviewTasks.flaggedCommentCount >= 3);

    const ignoreResult = await apiRequest(`/admin/comments/${flaggedComment.body.comment.id}/moderation/ignore`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${admin.token}`
      }
    });
    assert.equal(ignoreResult.status, 200);

    const afterIgnoreQueue = await apiRequest("/admin/comments/moderation", {
      headers: {
        Authorization: `Bearer ${admin.token}`
      }
    });
    assert.equal(afterIgnoreQueue.status, 200);
    assert.equal(
      afterIgnoreQueue.body.comments.some((comment) => comment.id === flaggedComment.body.comment.id),
      false
    );

    const riskSummaryAfterIgnore = await apiRequest("/admin/review-tasks/summary", {
      headers: {
        Authorization: `Bearer ${admin.token}`
      }
    });
    assert.equal(riskSummaryAfterIgnore.status, 200);
    assert.ok(riskSummaryAfterIgnore.body.reviewTasks.flaggedCommentCount >= 2);

    const publicAfterIgnore = await apiRequest(`/comments/articles/${articleSlug}`);
    assert.equal(publicAfterIgnore.status, 200);
    assert.ok(
      publicAfterIgnore.body.comments.some((comment) => comment.id === flaggedComment.body.comment.id)
    );

    const deleteResult = await apiRequest(`/admin/comments/${flaggedReply.body.comment.id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${admin.token}`
      }
    });
    assert.equal(deleteResult.status, 200);

    const afterDeleteQueue = await apiRequest("/admin/comments/moderation", {
      headers: {
        Authorization: `Bearer ${admin.token}`
      }
    });
    assert.equal(afterDeleteQueue.status, 200);
    assert.equal(
      afterDeleteQueue.body.comments.some((comment) => comment.id === flaggedReply.body.comment.id),
      false
    );

    const publicAfterDelete = await apiRequest(`/comments/articles/${articleSlug}`);
    assert.equal(publicAfterDelete.status, 200);
    const parentAfterDelete = publicAfterDelete.body.comments.find(
      (comment) => comment.id === flaggedComment.body.comment.id
    );
    assert.ok(parentAfterDelete);
    assert.equal(
      parentAfterDelete.replies.some((reply) => reply.id === flaggedReply.body.comment.id),
      false
    );
  } finally {
    await prisma.article.delete({
      where: {
        id: article.id
      }
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [admin.user.email, user.user.email, other.user.email]
        }
      }
    });
  }
});

test("user panel APIs expose favorites, comments, interactions, sessions, password, and bindings", async () => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  const panelEmail = `panel_user_${suffix}@example.com`;
  const otherEmail = `panel_other_${suffix}@example.com`;
  const thirdEmail = `panel_third_${suffix}@example.com`;

  try {
    const panelUser = await createRegisteredUser({
      username: `panel_user_${suffix}`,
      email: panelEmail
    });
    const otherUser = await createRegisteredUser({
      username: `panel_other_${suffix}`,
      email: otherEmail
    });
    const thirdUser = await createRegisteredUser({
      username: `panel_third_${suffix}`,
      email: thirdEmail
    });
    const category = await prisma.category.create({
      data: {
        name: `Panel Category ${suffix}`,
        slug: `panel-category-${suffix}`
      }
    });
    const panelArticle = await prisma.article.create({
      data: {
        authorId: panelUser.user.id,
        categoryId: category.id,
        title: "Panel Owned Article",
        slug: `panel-owned-${suffix}`,
        contentMarkdown: "# Panel Owned Article",
        contentHtml: "<h1>Panel Owned Article</h1>",
        chapterOrder: 1,
        status: "PUBLISHED",
        publishedAt: new Date()
      }
    });
    const favoriteTarget = await prisma.article.create({
      data: {
        authorId: otherUser.user.id,
        categoryId: category.id,
        title: "Favorite Target Article",
        slug: `favorite-target-${suffix}`,
        contentMarkdown: "# Favorite Target Article",
        contentHtml: "<h1>Favorite Target Article</h1>",
        chapterOrder: 2,
        status: "PUBLISHED",
        publishedAt: new Date()
      }
    });
    await prisma.articleStats.create({
      data: {
        articleId: panelArticle.id,
        viewCount: 98,
        likeCount: 200,
        favoriteCount: 99
      }
    });

    const favoriteResult = await apiRequest(`/articles/${favoriteTarget.slug}/favorites`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${panelUser.token}`
    }
  });
  assert.equal(favoriteResult.status, 200);
  assert.equal(favoriteResult.body.changed, true);

  const myComment = await apiRequest(`/comments/articles/${favoriteTarget.slug}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${panelUser.token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      content: "This is my panel comment."
    })
  });
  assert.equal(myComment.status, 201);

  const replyToMyComment = await apiRequest(`/comments/articles/${favoriteTarget.slug}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${otherUser.token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      content: "Replying to the panel comment.",
      parentId: myComment.body.comment.id,
      replyToCommentId: myComment.body.comment.id
    })
  });
  assert.equal(replyToMyComment.status, 201);

  const commentOnMyArticle = await apiRequest(`/comments/articles/${panelArticle.slug}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${otherUser.token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      content: "Commenting on your article."
    })
  });
  assert.equal(commentOnMyArticle.status, 201);

  const likeMyArticle = await apiRequest(`/articles/${panelArticle.slug}/likes`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${otherUser.token}`
    }
  });
  assert.equal(likeMyArticle.status, 200);

  const favoriteMyArticle = await apiRequest(`/articles/${panelArticle.slug}/favorites`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${otherUser.token}`
    }
  });
  assert.equal(favoriteMyArticle.status, 200);

  const likeMyComment = await apiRequest(`/comments/${myComment.body.comment.id}/likes`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${otherUser.token}`
    }
  });
  assert.equal(likeMyComment.status, 200);

  const firstRead = await apiRequest(`/articles/${panelArticle.slug}/views`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      visitorId: `panel-visitor-a-${suffix}`
    })
  });
  assert.equal(firstRead.status, 200);
  assert.equal(firstRead.body.counted, true);

  const secondRead = await apiRequest(`/articles/${panelArticle.slug}/views`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      visitorId: `panel-visitor-b-${suffix}`
    })
  });
  assert.equal(secondRead.status, 200);
  assert.equal(secondRead.body.counted, true);

  const summaryResult = await apiRequest("/users/me/summary", {
    headers: {
      Authorization: `Bearer ${panelUser.token}`
    }
  });
  assert.equal(summaryResult.status, 200);
  assert.equal(summaryResult.body.summary.articleCount, 1);
  assert.equal(summaryResult.body.summary.viewCount, 100);
  assert.equal(summaryResult.body.summary.likeCount, 201);
  assert.equal(summaryResult.body.summary.favoriteCount, 100);
  assert.equal(summaryResult.body.summary.savedFavoriteCount, 1);
  assert.equal(summaryResult.body.summary.commentCount, 1);
  assert.equal(summaryResult.body.summary.interactionCount, 5);
  assert.equal(summaryResult.body.summary.readTrend.length, 7);
  assert.ok(summaryResult.body.summary.readTrend.reduce((total, item) => total + item.value, 0) >= 2);
  assert.equal(summaryResult.body.summary.deltas.articleCount.label, "无变化");
  assert.equal(summaryResult.body.summary.deltas.articleCount.tone, "neutral");
  assert.equal(summaryResult.body.summary.deltas.viewCount.label, "+2%");
  assert.equal(summaryResult.body.summary.deltas.viewCount.tone, "positive");
  assert.equal(summaryResult.body.summary.deltas.likeCount.label, "+1");
  assert.equal(summaryResult.body.summary.deltas.favoriteCount.label, "+1%");
  assert.deepEqual(summaryResult.body.summary.categoryDistribution[0], {
    name: category.name,
    value: 1
  });

  const favoritesResult = await apiRequest("/users/me/favorites", {
    headers: {
      Authorization: `Bearer ${panelUser.token}`
    }
  });
  assert.equal(favoritesResult.status, 200);
  assert.equal(favoritesResult.body.favorites.length, 1);
  assert.equal(favoritesResult.body.favorites[0].article.slug, favoriteTarget.slug);
  assert.equal(favoritesResult.body.favorites[0].article.category.slug, category.slug);
  assert.ok(favoritesResult.body.favorites[0].favoritedAt);

  const commentsResult = await apiRequest("/users/me/comments", {
    headers: {
      Authorization: `Bearer ${panelUser.token}`
    }
  });
  assert.equal(commentsResult.status, 200);
  assert.equal(commentsResult.body.comments.length, 1);
  assert.equal(commentsResult.body.comments[0].type, "comment");
  assert.equal(commentsResult.body.comments[0].article.slug, panelArticle.slug);
  assert.equal(commentsResult.body.comments[0].author.username, otherUser.user.username);
  assert.equal(commentsResult.body.comments[0].excerpt, "Commenting on your article.");

  const interactionsResult = await apiRequest("/users/me/interactions", {
    headers: {
      Authorization: `Bearer ${panelUser.token}`
    }
  });
  assert.equal(interactionsResult.status, 200);
  assert.deepEqual(
    new Set(interactionsResult.body.interactions.map((interaction) => interaction.type)),
    new Set(["reply_to_my_comment", "comment_on_my_article", "like_my_article", "favorite_my_article", "like_my_comment"])
  );
  assert.equal(interactionsResult.body.unreadCount, 5);
  assert.ok(interactionsResult.body.interactions.every((interaction) => interaction.notificationKey));
  assert.ok(interactionsResult.body.interactions.every((interaction) => interaction.isRead === false));
  assert.equal(
    interactionsResult.body.interactions.filter((interaction) => interaction.type === "reply_to_my_comment").length,
    1
  );

  const firstInteraction = interactionsResult.body.interactions[0];
  const readOneResult = await apiRequest(`/users/me/interactions/${encodeURIComponent(firstInteraction.notificationKey)}/read`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${panelUser.token}`
    }
  });
  assert.equal(readOneResult.status, 200);
  assert.equal(readOneResult.body.notificationKey, firstInteraction.notificationKey);

  const interactionsAfterReadOne = await apiRequest("/users/me/interactions", {
    headers: {
      Authorization: `Bearer ${panelUser.token}`
    }
  });
  assert.equal(interactionsAfterReadOne.status, 200);
  assert.equal(interactionsAfterReadOne.body.unreadCount, 4);
  assert.equal(
    interactionsAfterReadOne.body.interactions.find((interaction) => interaction.notificationKey === firstInteraction.notificationKey)?.isRead,
    true
  );

  const readAllResult = await apiRequest("/users/me/interactions/read-all", {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${panelUser.token}`
    }
  });
  assert.equal(readAllResult.status, 200);
  assert.ok(readAllResult.body.changed >= 5);

  const interactionsAfterReadAll = await apiRequest("/users/me/interactions", {
    headers: {
      Authorization: `Bearer ${panelUser.token}`
    }
  });
  assert.equal(interactionsAfterReadAll.status, 200);
  assert.equal(interactionsAfterReadAll.body.unreadCount, 0);
  assert.ok(interactionsAfterReadAll.body.interactions.every((interaction) => interaction.isRead === true));

  const clearFavoriteResult = await apiRequest(`/articles/${favoriteTarget.slug}/favorites`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${panelUser.token}`
    }
  });
  assert.equal(clearFavoriteResult.status, 200);
  assert.equal(clearFavoriteResult.body.changed, true);
  const favoriteDeleteEvents = await prisma.$queryRaw`
    SELECT delta
    FROM article_metric_events
    WHERE article_id = ${favoriteTarget.id}
      AND user_id = ${otherUser.user.id}
      AND actor_user_id = ${panelUser.user.id}
      AND metric = 'favorites'
      AND delta = -1
  `;
  assert.equal(Number(favoriteDeleteEvents[0]?.delta), -1);

  const favoritesAfterDeleteResult = await apiRequest("/users/me/favorites", {
    headers: {
      Authorization: `Bearer ${panelUser.token}`
    }
  });
  assert.equal(favoritesAfterDeleteResult.status, 200);
  assert.equal(favoritesAfterDeleteResult.body.favorites.length, 0);

  const secondLogin = await apiRequest("/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      account: `panel_user_${suffix}@example.com`,
      password: "Passw0rd!"
    })
  });
  assert.equal(secondLogin.status, 200);

  const sessionsResult = await apiRequest("/users/me/sessions", {
    headers: {
      Authorization: `Bearer ${secondLogin.body.token}`
    }
  });
  assert.equal(sessionsResult.status, 200);
  assert.ok(sessionsResult.body.sessions.length >= 2);
  assert.equal(sessionsResult.body.sessions.filter((session) => session.isCurrent).length, 1);
  assert.ok(sessionsResult.body.sessions.every((session) => session.deviceName));
  assert.ok(sessionsResult.body.sessions.every((session) => session.browserName));
  assert.ok(sessionsResult.body.sessions.every((session) => session.osName));
  assert.ok(sessionsResult.body.sessions.every((session) => session.deviceType));
  const oldSession = sessionsResult.body.sessions.find((session) => !session.isCurrent);
  assert.ok(oldSession);

  const deleteSessionResult = await apiRequest(`/users/me/sessions/${oldSession.id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${secondLogin.body.token}`
    }
  });
  assert.equal(deleteSessionResult.status, 200);
  assert.equal(deleteSessionResult.body.loggedOutCurrent, false);

  const deletedSessionMe = await apiRequest("/auth/me", {
    headers: {
      Authorization: `Bearer ${panelUser.token}`
    }
  });
  assert.equal(deletedSessionMe.status, 401);

  const thirdLogin = await apiRequest("/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      account: `panel_user_${suffix}@example.com`,
      password: "Passw0rd!"
    })
  });
  assert.equal(thirdLogin.status, 200);

  const wrongPasswordResult = await apiRequest("/users/me/password", {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${secondLogin.body.token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      currentPassword: "wrong-password",
      newPassword: "NewPassw0rd!",
      confirmPassword: "NewPassw0rd!"
    })
  });
  assert.equal(wrongPasswordResult.status, 401);

  const changePasswordResult = await apiRequest("/users/me/password", {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${secondLogin.body.token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      currentPassword: "Passw0rd!",
      newPassword: "NewPassw0rd!",
      confirmPassword: "NewPassw0rd!"
    })
  });
  assert.equal(changePasswordResult.status, 200);

  const currentSessionAfterPassword = await apiRequest("/auth/me", {
    headers: {
      Authorization: `Bearer ${secondLogin.body.token}`
    }
  });
  assert.equal(currentSessionAfterPassword.status, 200);

  const otherSessionAfterPassword = await apiRequest("/auth/me", {
    headers: {
      Authorization: `Bearer ${thirdLogin.body.token}`
    }
  });
  assert.equal(otherSessionAfterPassword.status, 401);

  const oldPasswordLogin = await apiRequest("/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      account: `panel_user_${suffix}@example.com`,
      password: "Passw0rd!"
    })
  });
  assert.equal(oldPasswordLogin.status, 401);

  const newPasswordLogin = await apiRequest("/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      account: `panel_user_${suffix}@example.com`,
      password: "NewPassw0rd!"
    })
  });
  assert.equal(newPasswordLogin.status, 200);

  const invalidPhoneResult = await apiRequest("/users/me/bindings", {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${secondLogin.body.token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      phoneNumber: "123",
      wechatBound: true
    })
  });
  assert.equal(invalidPhoneResult.status, 400);

  const bindingResult = await apiRequest("/users/me/bindings", {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${secondLogin.body.token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      phoneNumber: "13812345678",
      wechatBound: true,
      qqBound: false,
      alipayBound: true
    })
  });
  assert.equal(bindingResult.status, 200);
  assert.equal(bindingResult.body.bindings.phoneNumber, "13812345678");
  assert.equal(bindingResult.body.bindings.wechatBound, true);
  assert.equal(bindingResult.body.bindings.alipayBound, true);

  const duplicatePhoneResult = await apiRequest("/users/me/bindings", {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${thirdUser.token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      phoneNumber: "13812345678"
    })
  });
  assert.equal(duplicatePhoneResult.status, 409);

  const clearBindingResult = await apiRequest("/users/me/bindings", {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${secondLogin.body.token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      phoneNumber: "",
      wechatBound: false,
      qqBound: false,
      alipayBound: false
    })
  });
  assert.equal(clearBindingResult.status, 200);
  assert.equal(clearBindingResult.body.bindings.phoneNumber, null);
  assert.equal(clearBindingResult.body.bindings.wechatBound, false);

  const securityEventsResult = await apiRequest("/users/me/security-events", {
    headers: {
      Authorization: `Bearer ${secondLogin.body.token}`
    }
  });
  assert.equal(securityEventsResult.status, 200);
  assert.ok(securityEventsResult.body.events.length <= 5);
  assert.ok(securityEventsResult.body.events.length >= 5);
  assert.ok(securityEventsResult.body.events.every((event) => event.eventType));
  assert.ok(securityEventsResult.body.events.every((event) => event.device?.deviceName));
  assert.ok(
    securityEventsResult.body.events.some((event) => event.eventType === "bindings_updated")
  );
  assert.ok(
    securityEventsResult.body.events.some((event) => event.eventType === "password_changed")
  );

  const sessionRevokedEvents = await prisma.$queryRaw`
    SELECT event_type AS eventType
    FROM security_audit_events
    WHERE user_id = ${panelUser.user.id}
      AND event_type = 'session_revoked'
  `;
  assert.ok(sessionRevokedEvents.length >= 1);

    await prisma.user.deleteMany({
      where: {
        email: {
          in: [panelEmail, otherEmail, thirdEmail]
        }
      }
    });
  } finally {
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [panelEmail, otherEmail, thirdEmail]
        }
      }
    });
  }
});

test("article stats APIs count real reads, reactions, favorites, comments, and popular ranking", async () => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  const adminEmail = `stats_admin_${suffix}@example.com`;
  const userEmail = `stats_user_${suffix}@example.com`;
  const visitorId = `visitor-${suffix}`;
  const otherVisitorId = `visitor-other-${suffix}`;
  const firstSlug = `stats-first-${suffix}`;
  const secondSlug = `stats-second-${suffix}`;

  const admin = await createRegisteredUser({
    username: `stats_admin_${suffix}`,
    email: adminEmail,
    role: "ADMIN"
  });
  const user = await createRegisteredUser({
    username: `stats_user_${suffix}`,
    email: userEmail
  });

  const firstArticle = await prisma.article.create({
    data: {
      authorId: admin.user.id,
      title: "Stats First Article",
      slug: firstSlug,
      contentMarkdown: "# Stats First Article",
      contentHtml: "<h1>Stats First Article</h1>",
      chapterOrder: 1,
      status: "PUBLISHED"
    }
  });
  const secondArticle = await prisma.article.create({
    data: {
      authorId: admin.user.id,
      title: "Stats Second Article",
      slug: secondSlug,
      contentMarkdown: "# Stats Second Article",
      contentHtml: "<h1>Stats Second Article</h1>",
      chapterOrder: 2,
      status: "PUBLISHED"
    }
  });

  try {
  const missingVisitorView = await apiRequest(`/articles/${firstSlug}/views`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({})
  });
  assert.equal(missingVisitorView.status, 400);

  const firstView = await apiRequest(`/articles/${firstSlug}/views`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Visitor-Id": visitorId
    },
    body: JSON.stringify({
      visitorId
    })
  });
  assert.equal(firstView.status, 200);
  assert.equal(firstView.body.counted, true);
  assert.equal(firstView.body.article.stats.viewCount, 1);

  const duplicateView = await apiRequest(`/articles/${firstSlug}/views`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Visitor-Id": visitorId
    },
    body: JSON.stringify({
      visitorId
    })
  });
  assert.equal(duplicateView.status, 200);
  assert.equal(duplicateView.body.counted, false);
  assert.equal(duplicateView.body.article.stats.viewCount, 1);

  const otherVisitorView = await apiRequest(`/articles/${firstSlug}/views`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Visitor-Id": otherVisitorId
    },
    body: JSON.stringify({
      visitorId: otherVisitorId
    })
  });
  assert.equal(otherVisitorView.status, 200);
  assert.equal(otherVisitorView.body.counted, true);
  assert.equal(otherVisitorView.body.article.stats.viewCount, 2);

  const anonymousLike = await apiRequest(`/articles/${firstSlug}/likes`, {
    method: "POST"
  });
  assert.equal(anonymousLike.status, 401);

  const like = await apiRequest(`/articles/${firstSlug}/likes`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${user.token}`
    }
  });
  assert.equal(like.status, 200);
  assert.equal(like.body.changed, true);
  assert.equal(like.body.article.stats.likeCount, 1);
  assert.equal(like.body.article.stats.likedByMe, true);

  const duplicateLike = await apiRequest(`/articles/${firstSlug}/likes`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${user.token}`
    }
  });
  assert.equal(duplicateLike.status, 200);
  assert.equal(duplicateLike.body.changed, false);
  assert.equal(duplicateLike.body.article.stats.likeCount, 1);

  const favorite = await apiRequest(`/articles/${firstSlug}/favorites`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${user.token}`
    }
  });
  assert.equal(favorite.status, 200);
  assert.equal(favorite.body.changed, true);
  assert.equal(favorite.body.article.stats.favoriteCount, 1);
  assert.equal(favorite.body.article.stats.favoritedByMe, true);

  const comment = await apiRequest(`/comments/articles/${firstSlug}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${user.token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      content: "Stats comment"
    })
  });
  assert.equal(comment.status, 201);

  await prisma.$executeRaw`
    INSERT INTO article_stats (article_id, view_count, like_count, favorite_count, created_at, updated_at)
    VALUES (${secondArticle.id}, 0, 4, 0, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))
    ON DUPLICATE KEY UPDATE like_count = 4
  `;

  const detail = await apiRequest(`/articles/${firstSlug}`, {
    headers: {
      Authorization: `Bearer ${user.token}`
    }
  });
  assert.equal(detail.status, 200);
  assert.equal(detail.body.article.stats.viewCount, 2);
  assert.equal(detail.body.article.stats.likeCount, 1);
  assert.equal(detail.body.article.stats.favoriteCount, 1);
  assert.equal(detail.body.article.stats.commentCount, 1);
  assert.equal(detail.body.article.stats.likedByMe, true);
  assert.equal(detail.body.article.stats.favoritedByMe, true);

  const homeVisit = await apiRequest("/articles/site-visits", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Visitor-Id": visitorId
    },
    body: JSON.stringify({
      pageType: "home",
      visitorId
    })
  });
  assert.equal(homeVisit.status, 200);
  assert.equal(homeVisit.body.counted, true);

  const duplicateHomeVisit = await apiRequest("/articles/site-visits", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Visitor-Id": visitorId
    },
    body: JSON.stringify({
      pageType: "home",
      visitorId
    })
  });
  assert.equal(duplicateHomeVisit.status, 200);
  assert.equal(duplicateHomeVisit.body.counted, false);

  const summary = await apiRequest("/articles/stats/summary");
  assert.equal(summary.status, 200);
  assert.ok(summary.body.summary.todayVisits >= 3);
  assert.ok(summary.body.summary.totalLikes >= 5);
  assert.equal(summary.body.summary.visitTrend.length, 7);
  assert.deepEqual(
    summary.body.summary.visitTrend.map((item) => Object.keys(item)),
    Array.from({ length: 7 }, () => ["date", "label", "value"])
  );
  assert.ok(summary.body.summary.visitTrend.at(-1).value >= 2);

  await prisma.$executeRaw`
    INSERT INTO article_stats (article_id, view_count, like_count, favorite_count, created_at, updated_at)
    VALUES
      (${firstArticle.id}, 1000000000, 0, 0, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
      (${secondArticle.id}, 1000000100, 0, 0, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))
    ON DUPLICATE KEY UPDATE
      view_count = VALUES(view_count),
      like_count = VALUES(like_count),
      favorite_count = VALUES(favorite_count),
      updated_at = CURRENT_TIMESTAMP(3)
  `;

  const popular = await apiRequest("/articles/popular?limit=2");
  assert.equal(popular.status, 200);
  assert.equal(popular.body.articles.length, 2);
  assert.equal(popular.body.articles[0].slug, secondSlug);
  assert.equal(popular.body.articles[1].slug, firstSlug);

  const unlike = await apiRequest(`/articles/${firstSlug}/likes`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${user.token}`
    }
  });
  assert.equal(unlike.status, 200);
  assert.equal(unlike.body.changed, true);
  assert.equal(unlike.body.article.stats.likeCount, 0);
  assert.equal(unlike.body.article.stats.likedByMe, false);

  const unfavorite = await apiRequest(`/articles/${firstSlug}/favorites`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${user.token}`
    }
  });
  assert.equal(unfavorite.status, 200);
  assert.equal(unfavorite.body.changed, true);
  assert.equal(unfavorite.body.article.stats.favoriteCount, 0);
  assert.equal(unfavorite.body.article.stats.favoritedByMe, false);

  } finally {
    await prisma.article.deleteMany({
      where: {
        id: {
          in: [firstArticle.id, secondArticle.id]
        }
      }
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [userEmail, adminEmail]
        }
      }
    });
  }
});

test("admin management APIs manage users, taxonomies, and published articles", async () => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  const admin = await createRegisteredUser({
    username: `mgmt_admin_${suffix}`,
    email: `mgmt_admin_${suffix}@example.com`,
    role: "ADMIN"
  });
  const user = await createRegisteredUser({
    username: `mgmt_user_${suffix}`,
    email: `mgmt_user_${suffix}@example.com`
  });
  const protectedAdmin = await createRegisteredUser({
    username: `mgmt_guard_${suffix}`,
    email: `mgmt_guard_${suffix}@example.com`,
    role: "ADMIN"
  });

  const category = await prisma.category.create({
    data: {
      name: `Mgmt Category ${suffix}`,
      slug: `mgmt-category-${suffix}`
    }
  });
  const tag = await prisma.tag.create({
    data: {
      name: `Mgmt Tag ${suffix}`,
      slug: `mgmt-tag-${suffix}`
    }
  });
  const unusedCategory = await prisma.category.create({
    data: {
      name: `Mgmt Empty Category ${suffix}`,
      slug: `mgmt-empty-category-${suffix}`
    }
  });
  const unusedTag = await prisma.tag.create({
    data: {
      name: `Mgmt Empty Tag ${suffix}`,
      slug: `mgmt-empty-tag-${suffix}`
    }
  });
  const article = await prisma.article.create({
    data: {
      authorId: user.user.id,
      categoryId: category.id,
      title: `Mgmt Published ${suffix}`,
      slug: `mgmt-published-${suffix}`,
      contentMarkdown: "# Managed",
      contentHtml: "<h1>Managed</h1>",
      chapterOrder: 1,
      status: "PUBLISHED",
      publishedAt: new Date(),
      tags: {
        create: [
          {
            tagId: tag.id
          }
        ]
      }
    },
    include: {
      tags: true
    }
  });
  await prisma.articleStats.create({
    data: {
      articleId: article.id,
      viewCount: 3,
      likeCount: 2,
      favoriteCount: 1
    }
  });

  try {
    const unauthorizedUsers = await apiRequest("/admin/users");
    assert.equal(unauthorizedUsers.status, 401);

    const userList = await apiRequest(`/admin/users?q=${encodeURIComponent(user.user.username)}`, {
      headers: {
        Authorization: `Bearer ${admin.token}`
      }
    });
    assert.equal(userList.status, 200);
    assert.equal(userList.body.users.length, 1);
    assert.equal(userList.body.users[0].username, user.user.username);
    assert.equal(userList.body.users[0].stats.articleCount, 1);

    const disableUser = await apiRequest(`/admin/users/${user.user.id}/disabled`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${admin.token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        isDisabled: true
      })
    });
    assert.equal(disableUser.status, 200);
    assert.equal(disableUser.body.user.isDisabled, true);
    assert.equal(disableUser.body.user.stats.activeSessionCount, 0);

    const disabledSession = await apiRequest("/auth/me", {
      headers: {
        Authorization: `Bearer ${user.token}`
      }
    });
    assert.equal(disabledSession.status, 401);

    const disabledLogin = await apiRequest("/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        account: user.user.email,
        password: "Passw0rd!"
      })
    });
    assert.equal(disabledLogin.status, 403);

    const enableUser = await apiRequest(`/admin/users/${user.user.id}/disabled`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${admin.token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        isDisabled: false
      })
    });
    assert.equal(enableUser.status, 200);
    assert.equal(enableUser.body.user.isDisabled, false);

    const categoryDeleteMismatch = await apiRequest(`/admin/categories/${category.id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${admin.token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        confirmName: "wrong"
      })
    });
    assert.equal(categoryDeleteMismatch.status, 400);

    const deleteUnusedCategory = await apiRequest(`/admin/categories/${unusedCategory.id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${admin.token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({})
    });
    assert.equal(deleteUnusedCategory.status, 200);
    assert.equal(deleteUnusedCategory.body.removedFromArticleCount, 0);

    const deleteCategory = await apiRequest(`/admin/categories/${category.id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${admin.token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        confirmName: category.name
      })
    });
    assert.equal(deleteCategory.status, 200);
    assert.equal(deleteCategory.body.removedFromArticleCount, 1);

    const articleWithoutCategory = await prisma.article.findUnique({
      where: {
        id: article.id
      }
    });
    assert.equal(articleWithoutCategory.categoryId, null);

    const deleteUnusedTag = await apiRequest(`/admin/tags/${unusedTag.id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${admin.token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({})
    });
    assert.equal(deleteUnusedTag.status, 200);
    assert.equal(deleteUnusedTag.body.removedFromArticleCount, 0);

    const deleteTag = await apiRequest(`/admin/tags/${tag.id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${admin.token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        confirmName: tag.name
      })
    });
    assert.equal(deleteTag.status, 200);
    assert.equal(deleteTag.body.removedFromArticleCount, 1);

    const tagLinks = await prisma.articleTag.count({
      where: {
        articleId: article.id,
        tagId: tag.id
      }
    });
    assert.equal(tagLinks, 0);

    const archiveArticle = await apiRequest(`/admin/articles/${article.id}/status`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${admin.token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        status: "ARCHIVED"
      })
    });
    assert.equal(archiveArticle.status, 200);
    assert.equal(archiveArticle.body.article.status, "ARCHIVED");

    const archivedPublicDetail = await apiRequest(`/articles/${article.slug}`);
    assert.equal(archivedPublicDetail.status, 404);

    const republishArticle = await apiRequest(`/admin/articles/${article.id}/status`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${admin.token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        status: "PUBLISHED"
      })
    });
    assert.equal(republishArticle.status, 200);
    assert.equal(republishArticle.body.article.status, "PUBLISHED");

    const adminDelete = await apiRequest(`/admin/users/${protectedAdmin.user.id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${admin.token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        confirmName: protectedAdmin.user.username
      })
    });
    assert.equal(adminDelete.status, 403);

    const deleteUser = await apiRequest(`/admin/users/${user.user.id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${admin.token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        confirmName: user.user.username
      })
    });
    assert.equal(deleteUser.status, 200);
    assert.equal(deleteUser.body.deleted.articleCount, 1);

    const deletedArticle = await prisma.article.findUnique({
      where: {
        id: article.id
      }
    });
    assert.equal(deletedArticle, null);
  } finally {
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [admin.user.email, user.user.email, protectedAdmin.user.email]
        }
      }
    });
    await prisma.category.deleteMany({
      where: {
        slug: {
          in: [`mgmt-category-${suffix}`, `mgmt-empty-category-${suffix}`]
        }
      }
    });
    await prisma.tag.deleteMany({
      where: {
        slug: {
          in: [`mgmt-tag-${suffix}`, `mgmt-empty-tag-${suffix}`]
        }
      }
    });
  }
});
