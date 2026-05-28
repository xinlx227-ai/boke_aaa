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

  const categoryResult = await apiRequest("/articles?category=guides");
  assert.equal(categoryResult.status, 200);
  assert.ok(categoryResult.body.articles.some((article) => article.slug === updatedSlug));

  const tagResult = await apiRequest("/articles?tag=markdown");
  assert.equal(tagResult.status, 200);
  assert.ok(tagResult.body.articles.some((article) => article.slug === updatedSlug));

  const filtersResult = await apiRequest("/articles/filters");
  assert.equal(filtersResult.status, 200);
  assert.ok(filtersResult.body.categories.some((category) => category.slug === "guides"));
  assert.ok(filtersResult.body.tags.some((tag) => tag.slug === "markdown"));

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
  const adminEmail = `${adminUsername}@example.com`;
  const userEmail = `${userUsername}@example.com`;
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

  const createReplyReadyComment = await apiRequest(`/comments/articles/${articleSlug}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${userLogin.body.token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      content: "Reply-ready comment",
      parentId: createComment.body.comment.id
    })
  });
  assert.equal(createReplyReadyComment.status, 201);
  assert.equal(createReplyReadyComment.body.comment.parentId, createComment.body.comment.id);

  const publicList = await apiRequest(`/comments/articles/${articleSlug}`);
  assert.equal(publicList.status, 200);
  assert.equal(publicList.body.comments.length, 2);
  assert.equal(publicList.body.comments[0].user.username, userUsername);

  const userDelete = await apiRequest(`/comments/${createComment.body.comment.id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${userLogin.body.token}`
    }
  });
  assert.equal(userDelete.status, 403);

  const adminDelete = await apiRequest(`/comments/${createReplyReadyComment.body.comment.id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${adminLogin.body.token}`
    }
  });
  assert.equal(adminDelete.status, 200);

  const remainingList = await apiRequest(`/comments/articles/${articleSlug}`);
  assert.equal(remainingList.status, 200);
  assert.equal(remainingList.body.comments.length, 1);

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
      email: adminEmail
    }
  });
});
