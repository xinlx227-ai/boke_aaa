<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue";

const API_BASE_URL = "http://localhost:3000/api";
const ASSET_BASE_URL = "http://localhost:3000";
const TOKEN_STORAGE_KEY = "private-blog-token";

const view = ref("public");
const token = ref(localStorage.getItem(TOKEN_STORAGE_KEY) || "");
const loading = ref(false);
const submitLoading = ref(false);
const articleLoading = ref(false);
const commentsLoading = ref(false);
const savingArticle = ref(false);
const uploadingImage = ref(false);
const importingArticles = ref(false);
const postingComment = ref(false);
const mobileMenuOpen = ref(false);
const tocOpen = ref(false);
const message = ref("");
let messageTimer = null;
const currentUser = ref(null);
const currentSession = ref(null);
const publishedArticles = ref([]);
const adminArticles = ref([]);
const selectedArticle = ref(null);
const comments = ref([]);
const categories = ref([]);
const tags = ref([]);
const importResult = ref(null);

const filters = reactive({
  q: "",
  category: "",
  tag: ""
});

const loginForm = reactive({
  account: "",
  password: ""
});

const registerForm = reactive({
  username: "",
  email: "",
  password: ""
});

const articleForm = reactive({
  id: null,
  title: "",
  slug: "",
  chapterOrder: 0,
  categoryName: "",
  tagNamesText: "",
  contentMarkdown: ""
});

const imageForm = reactive({
  altText: ""
});

const commentForm = reactive({
  content: "",
  parentId: null
});

const isAuthenticated = computed(() => Boolean(token.value && currentUser.value));
const isAdmin = computed(() => currentUser.value?.role === "ADMIN");
const roleLabel = computed(() => (isAdmin.value ? "管理员" : "普通用户"));
const selectedArticleHtml = computed(() => mapAssetUrls(selectedArticle.value?.contentHtml || ""));
const selectedToc = computed(() => selectedArticle.value?.toc || []);
const editorHeading = computed(() => (articleForm.id ? `编辑：${articleForm.title || "未命名文章"}` : "新建文章"));

function mapAssetUrls(html) {
  return String(html || "").replace(/(src|href)="\/uploads\//g, `$1="${ASSET_BASE_URL}/uploads/`);
}

function tagTextToArray(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseHash() {
  const hash = window.location.hash.replace(/^#/, "");

  if (!hash) {
    return {
      viewName: "public",
      slug: null
    };
  }

  if (["login", "register", "dashboard", "admin"].includes(hash)) {
    return {
      viewName: hash,
      slug: null
    };
  }

  if (hash.startsWith("article/")) {
    return {
      viewName: "article",
      slug: decodeURIComponent(hash.slice("article/".length))
    };
  }

  return {
    viewName: "public",
    slug: null
  };
}

function setHash(nextHash) {
  window.location.hash = nextHash ? `#${nextHash}` : "";
  mobileMenuOpen.value = false;
}

function clearArticleForm() {
  articleForm.id = null;
  articleForm.title = "";
  articleForm.slug = "";
  articleForm.chapterOrder = 0;
  articleForm.categoryName = "";
  articleForm.tagNamesText = "";
  articleForm.contentMarkdown = "";
  imageForm.altText = "";
}

function setMessage(nextMessage) {
  if (messageTimer) {
    clearTimeout(messageTimer);
    messageTimer = null;
  }

  message.value = nextMessage;

  if (nextMessage) {
    messageTimer = window.setTimeout(() => {
      message.value = "";
      messageTimer = null;
    }, 1800);
  }
}

function clearAuthState(nextMessage = "登录状态已失效，请重新登录。") {
  token.value = "";
  currentUser.value = null;
  currentSession.value = null;
  adminArticles.value = [];
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  setMessage(nextMessage);
  setHash("login");
}

async function apiFetch(path, options = {}) {
  const headers = {
    ...(options.headers || {})
  };

  if (token.value) {
    headers.Authorization = `Bearer ${token.value}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

  let payload = null;

  try {
    payload = await response.json();
  } catch (_error) {
    payload = null;
  }

  if (response.status === 401) {
    clearAuthState(payload?.message || "登录已过期，请重新登录。");
    throw new Error("UNAUTHORIZED");
  }

  if (!response.ok) {
    throw new Error(payload?.message || "请求失败。");
  }

  return payload;
}

function articleQueryString() {
  const params = new URLSearchParams();

  if (filters.q.trim()) {
    params.set("q", filters.q.trim());
  }

  if (filters.category) {
    params.set("category", filters.category);
  }

  if (filters.tag) {
    params.set("tag", filters.tag);
  }

  return params.toString();
}

async function loadArticleFilters() {
  try {
    const payload = await apiFetch("/articles/filters");
    categories.value = payload.categories;
    tags.value = payload.tags;
  } catch (error) {
    if (error.message !== "UNAUTHORIZED") {
      setMessage(error.message);
    }
  }
}

async function loadComments(slug) {
  if (!slug) {
    comments.value = [];
    return;
  }

  commentsLoading.value = true;

  try {
    const payload = await apiFetch(`/comments/articles/${encodeURIComponent(slug)}`);
    comments.value = payload.comments;
  } catch (error) {
    if (error.message !== "UNAUTHORIZED") {
      setMessage(error.message);
    }
  } finally {
    commentsLoading.value = false;
  }
}

async function loadArticleDetail(slug) {
  if (!slug) {
    return;
  }

  articleLoading.value = true;

  try {
    const payload = await apiFetch(`/articles/${encodeURIComponent(slug)}`);
    selectedArticle.value = payload.article;
    tocOpen.value = false;
    await loadComments(payload.article.slug);
  } catch (error) {
    if (error.message !== "UNAUTHORIZED") {
      setMessage(error.message);
      setHash("");
    }
  } finally {
    articleLoading.value = false;
  }
}

function syncViewToHash() {
  const { viewName, slug } = parseHash();

  if (viewName === "admin" && !isAdmin.value) {
    view.value = isAuthenticated.value ? "dashboard" : "login";
    return;
  }

  if (viewName === "dashboard" && !isAuthenticated.value) {
    view.value = "login";
    return;
  }

  view.value = viewName;

  if (viewName === "article" && slug) {
    loadArticleDetail(slug);
    return;
  }

  if (viewName === "public" && !selectedArticle.value && publishedArticles.value.length > 0) {
    selectedArticle.value = publishedArticles.value[0];
  }
}

async function loadPublishedArticles() {
  articleLoading.value = true;

  try {
    const query = articleQueryString();
    const payload = await apiFetch(query ? `/articles?${query}` : "/articles");
    publishedArticles.value = payload.articles;

    const { viewName, slug } = parseHash();

    if (viewName === "article" && slug) {
      const matchedArticle = payload.articles.find((article) => article.slug === slug);

      if (matchedArticle) {
        selectedArticle.value = matchedArticle;
      }
      return;
    }

    if (payload.articles.length > 0) {
      selectedArticle.value = payload.articles[0];
    } else if (view.value === "public") {
      selectedArticle.value = null;
      comments.value = [];
    }
  } catch (error) {
    if (error.message !== "UNAUTHORIZED") {
      setMessage(error.message);
    }
  } finally {
    articleLoading.value = false;
  }
}

async function loadAdminArticles() {
  if (!isAdmin.value) {
    adminArticles.value = [];
    return;
  }

  try {
    const payload = await apiFetch("/articles/admin/list");
    adminArticles.value = payload.articles;
  } catch (error) {
    if (error.message !== "UNAUTHORIZED") {
      setMessage(error.message);
    }
  }
}

async function loadProfile() {
  if (!token.value) {
    return;
  }

  loading.value = true;

  try {
    const payload = await apiFetch("/auth/me");
    currentUser.value = payload.user;
    currentSession.value = payload.session;
    if (payload.user.role === "ADMIN") {
      await loadAdminArticles();
    }
  } catch (error) {
    if (error.message !== "UNAUTHORIZED") {
      setMessage(error.message);
    }
  } finally {
    loading.value = false;
  }
}

async function applyFilters() {
  await loadPublishedArticles();
  setHash("");
}

async function clearFilters() {
  filters.q = "";
  filters.category = "";
  filters.tag = "";
  await loadPublishedArticles();
  setHash("");
}

async function submitRegister() {
  submitLoading.value = true;
  setMessage("");

  try {
    const payload = await apiFetch("/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(registerForm)
    });

    setMessage(`${payload.user.username} 注册成功，请登录。`);
    loginForm.account = payload.user.email;
    loginForm.password = "";
    registerForm.username = "";
    registerForm.email = "";
    registerForm.password = "";
    setHash("login");
  } catch (error) {
    setMessage(error.message);
  } finally {
    submitLoading.value = false;
  }
}

async function submitLogin() {
  submitLoading.value = true;
  setMessage("");

  try {
    const payload = await apiFetch("/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(loginForm)
    });

    token.value = payload.token;
    localStorage.setItem(TOKEN_STORAGE_KEY, payload.token);
    currentUser.value = payload.user;
    currentSession.value = {
      deviceId: payload.deviceId
    };
    loginForm.password = "";
    setMessage(`欢迎回来，${payload.user.username}。`);
    await loadProfile();
    setHash(payload.user.role === "ADMIN" ? "admin" : "dashboard");
  } catch (error) {
    if (error.message !== "UNAUTHORIZED") {
      setMessage(error.message);
    }
  } finally {
    submitLoading.value = false;
  }
}

async function logout() {
  submitLoading.value = true;

  try {
    await apiFetch("/auth/logout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    if (error.message !== "UNAUTHORIZED") {
      setMessage(error.message);
    }
  } finally {
    submitLoading.value = false;
    clearAuthState("已退出登录。");
  }
}

function openArticle(slug) {
  setHash(`article/${encodeURIComponent(slug)}`);
}

function openPublicHome() {
  setHash("");
}

function openUserDashboard() {
  setHash("dashboard");
}

function openAdminDashboard() {
  setHash("admin");
}

function openCreateArticle() {
  clearArticleForm();
  setHash("admin");
}

function editArticle(article) {
  articleForm.id = article.id;
  articleForm.title = article.title;
  articleForm.slug = article.slug;
  articleForm.chapterOrder = article.chapterOrder;
  articleForm.categoryName = article.category?.name || "";
  articleForm.tagNamesText = (article.tags || []).map((tag) => tag.name).join(", ");
  articleForm.contentMarkdown = article.contentMarkdown;
  setHash("admin");
}

async function saveArticle() {
  savingArticle.value = true;
  setMessage("");

  const requestBody = {
    title: articleForm.title,
    slug: articleForm.slug,
    chapterOrder: articleForm.chapterOrder,
    categoryName: articleForm.categoryName,
    tagNames: tagTextToArray(articleForm.tagNamesText),
    contentMarkdown: articleForm.contentMarkdown
  };

  try {
    const payload = await apiFetch(articleForm.id ? `/articles/admin/${articleForm.id}` : "/articles/admin", {
      method: articleForm.id ? "PATCH" : "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    articleForm.id = payload.article.id;
    articleForm.title = payload.article.title;
    articleForm.slug = payload.article.slug;
    articleForm.chapterOrder = payload.article.chapterOrder;
    articleForm.categoryName = payload.article.category?.name || "";
    articleForm.tagNamesText = payload.article.tags.map((tag) => tag.name).join(", ");
    articleForm.contentMarkdown = payload.article.contentMarkdown;
    setMessage(articleForm.id ? "文章已保存。" : "文章已创建。");
    await Promise.all([loadAdminArticles(), loadPublishedArticles(), loadArticleFilters()]);
  } catch (error) {
    if (error.message !== "UNAUTHORIZED") {
      setMessage(error.message);
    }
  } finally {
    savingArticle.value = false;
  }
}

async function publishCurrentArticle() {
  if (!articleForm.id) {
    setMessage("请先保存文章，再发布。");
    return;
  }

  savingArticle.value = true;

  try {
    const payload = await apiFetch(`/articles/admin/${articleForm.id}/publish`, {
      method: "POST"
    });
    setMessage(`文章《${payload.article.title}》已发布。`);
    await Promise.all([loadAdminArticles(), loadPublishedArticles(), loadArticleFilters(), loadArticleDetail(payload.article.slug)]);
    setHash(`article/${encodeURIComponent(payload.article.slug)}`);
  } catch (error) {
    if (error.message !== "UNAUTHORIZED") {
      setMessage(error.message);
    }
  } finally {
    savingArticle.value = false;
  }
}

async function deleteArticle(article) {
  if (!window.confirm(`确定删除《${article.title}》吗？`)) {
    return;
  }

  savingArticle.value = true;

  try {
    await apiFetch(`/articles/admin/${article.id}`, {
      method: "DELETE"
    });
    if (articleForm.id === article.id) {
      clearArticleForm();
    }
    if (selectedArticle.value?.id === article.id) {
      selectedArticle.value = null;
      comments.value = [];
    }
    setMessage(`文章《${article.title}》已删除。`);
    await Promise.all([loadAdminArticles(), loadPublishedArticles(), loadArticleFilters()]);
    openPublicHome();
  } catch (error) {
    if (error.message !== "UNAUTHORIZED") {
      setMessage(error.message);
    }
  } finally {
    savingArticle.value = false;
  }
}

async function uploadImage(event) {
  const file = event.target.files?.[0];
  event.target.value = "";

  if (!file) {
    return;
  }

  if (!articleForm.id) {
    setMessage("请先保存文章，再上传图片。");
    return;
  }

  uploadingImage.value = true;

  try {
    const formData = new FormData();
    formData.append("image", file);
    formData.append("altText", imageForm.altText);

    const payload = await apiFetch(`/articles/admin/${articleForm.id}/images`, {
      method: "POST",
      body: formData
    });

    articleForm.contentMarkdown = [articleForm.contentMarkdown, payload.markdown].filter(Boolean).join("\n\n");
    imageForm.altText = "";
    setMessage("图片已上传，Markdown 已插入编辑器。");
    await loadAdminArticles();
  } catch (error) {
    if (error.message !== "UNAUTHORIZED") {
      setMessage(error.message);
    }
  } finally {
    uploadingImage.value = false;
  }
}

async function importArticles(event) {
  const file = event.target.files?.[0];
  event.target.value = "";

  if (!file) {
    return;
  }

  importingArticles.value = true;
  importResult.value = null;
  setMessage("");

  try {
    const formData = new FormData();
    formData.append("archive", file);

    const payload = await apiFetch("/articles/admin/import", {
      method: "POST",
      body: formData
    });

    importResult.value = payload;
    setMessage(`导入完成：成功 ${payload.summary.imported} 篇，失败 ${payload.summary.failed} 篇。`);
    await Promise.all([loadAdminArticles(), loadPublishedArticles(), loadArticleFilters()]);
  } catch (error) {
    if (error.message !== "UNAUTHORIZED") {
      setMessage(error.message);
    }
  } finally {
    importingArticles.value = false;
  }
}

async function submitComment() {
  if (!selectedArticle.value) {
    return;
  }

  postingComment.value = true;
  setMessage("");

  try {
    await apiFetch(`/comments/articles/${encodeURIComponent(selectedArticle.value.slug)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(commentForm)
    });
    commentForm.content = "";
    commentForm.parentId = null;
    setMessage("评论已发布。");
    await loadComments(selectedArticle.value.slug);
  } catch (error) {
    if (error.message !== "UNAUTHORIZED") {
      setMessage(error.message);
    }
  } finally {
    postingComment.value = false;
  }
}

async function deleteComment(comment) {
  if (!window.confirm("确定删除这条评论吗？")) {
    return;
  }

  try {
    await apiFetch(`/comments/${comment.id}`, {
      method: "DELETE"
    });
    setMessage("评论已删除。");
    await loadComments(selectedArticle.value?.slug);
  } catch (error) {
    if (error.message !== "UNAUTHORIZED") {
      setMessage(error.message);
    }
  }
}

function formatDate(value) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function handleHashChange() {
  syncViewToHash();
}

onMounted(async () => {
  window.addEventListener("hashchange", handleHashChange);
  await Promise.all([loadPublishedArticles(), loadArticleFilters()]);
  if (token.value) {
    await loadProfile();
  }
  syncViewToHash();
});

onBeforeUnmount(() => {
  window.removeEventListener("hashchange", handleHashChange);
  if (messageTimer) {
    clearTimeout(messageTimer);
  }
});
</script>

<template>
  <div class="page-shell">
    <div v-if="message" class="toast-message" role="status" aria-live="polite">
      {{ message }}
    </div>

    <header class="mobile-topbar">
      <button
        class="mobile-menu-button"
        type="button"
        :aria-expanded="mobileMenuOpen"
        aria-controls="site-menu"
        @click="mobileMenuOpen = !mobileMenuOpen"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>
      <strong>私人博客</strong>
      <button class="ghost-button compact-button" type="button" @click="openPublicHome">首页</button>
    </header>

    <aside id="site-menu" class="sidebar" :class="{ open: mobileMenuOpen }">
      <div class="sidebar-card brand-card">
        <p class="eyebrow">私人博客</p>
        <h1>文章与章节</h1>
        <p class="muted">搜索文章，按分类和标签筛选，阅读时用目录快速跳转。</p>
      </div>

      <div class="sidebar-card">
        <div class="section-header">
          <h2>筛选文章</h2>
          <button class="ghost-button" type="button" @click="clearFilters">清空</button>
        </div>
        <form class="stack-form" @submit.prevent="applyFilters">
          <label>
            <span>搜索</span>
            <input v-model.trim="filters.q" placeholder="标题或正文关键词" />
          </label>
          <label>
            <span>分类</span>
            <select v-model="filters.category">
              <option value="">全部分类</option>
              <option v-for="category in categories" :key="category.id" :value="category.slug">
                {{ category.name }}
              </option>
            </select>
          </label>
          <label>
            <span>标签</span>
            <select v-model="filters.tag">
              <option value="">全部标签</option>
              <option v-for="tag in tags" :key="tag.id" :value="tag.slug">
                {{ tag.name }}
              </option>
            </select>
          </label>
          <button class="primary-button" type="submit">应用筛选</button>
        </form>
      </div>

      <div class="sidebar-card">
        <div class="section-header">
          <h2>文章列表</h2>
          <button class="ghost-button" type="button" @click="openPublicHome">首页</button>
        </div>
        <p v-if="articleLoading" class="muted">正在加载文章...</p>
        <p v-else-if="publishedArticles.length === 0" class="muted">没有匹配的已发布文章。</p>
        <ul v-else class="article-list">
          <li v-for="article in publishedArticles" :key="article.id">
            <button class="article-link" type="button" @click="openArticle(article.slug)">
              <span>{{ article.title }}</span>
              <small>{{ article.category?.name || "未分类" }}</small>
            </button>
          </li>
        </ul>
      </div>

      <div class="sidebar-card">
        <div class="section-header">
          <h2>账户</h2>
          <button
            v-if="isAuthenticated"
            class="ghost-button"
            :disabled="submitLoading"
            type="button"
            @click="logout"
          >
            退出
          </button>
        </div>

        <template v-if="!isAuthenticated">
          <div class="panel-switch">
            <button class="switch-button" :class="{ active: view === 'login' }" type="button" @click="setHash('login')">
              登录
            </button>
            <button
              class="switch-button"
              :class="{ active: view === 'register' }"
              type="button"
              @click="setHash('register')"
            >
              注册
            </button>
          </div>

          <form v-if="view === 'register'" class="stack-form" @submit.prevent="submitRegister">
            <label>
              <span>用户名</span>
              <input v-model.trim="registerForm.username" autocomplete="username" required />
            </label>
            <label>
              <span>邮箱</span>
              <input v-model.trim="registerForm.email" autocomplete="email" required type="email" />
            </label>
            <label>
              <span>密码</span>
              <input v-model="registerForm.password" autocomplete="new-password" required type="password" />
            </label>
            <button class="primary-button" :disabled="submitLoading" type="submit">
              {{ submitLoading ? "注册中..." : "注册" }}
            </button>
          </form>

          <form v-else class="stack-form" @submit.prevent="submitLogin">
            <label>
              <span>账号</span>
              <input v-model.trim="loginForm.account" autocomplete="username" placeholder="用户名或邮箱" required />
            </label>
            <label>
              <span>密码</span>
              <input v-model="loginForm.password" autocomplete="current-password" required type="password" />
            </label>
            <button class="primary-button" :disabled="submitLoading || loading" type="submit">
              {{ submitLoading ? "登录中..." : "登录" }}
            </button>
          </form>
        </template>

        <template v-else>
          <dl class="profile-grid">
            <div>
              <dt>用户名</dt>
              <dd>{{ currentUser?.username }}</dd>
            </div>
            <div>
              <dt>角色</dt>
              <dd>{{ roleLabel }}</dd>
            </div>
            <div>
              <dt>设备</dt>
              <dd>{{ currentSession?.deviceId }}</dd>
            </div>
          </dl>

          <div class="admin-actions">
            <button class="ghost-button" type="button" @click="openUserDashboard">用户面板</button>
            <button v-if="isAdmin" class="primary-button" type="button" @click="openAdminDashboard">
              管理后台
            </button>
          </div>
        </template>
      </div>
    </aside>

    <main class="main-panel">
      <section v-if="view === 'dashboard' && isAuthenticated && !isAdmin" class="workspace-card article-card">
        <div class="article-meta">
          <p class="eyebrow">用户面板</p>
          <h2>你好，{{ currentUser?.username }}</h2>
          <p class="muted">当前身份是 {{ roleLabel }}，可以浏览已发布文章并发表评论。</p>
        </div>
      </section>

      <section v-else-if="view === 'admin' && isAdmin" class="workspace-grid">
        <article class="workspace-card editor-card">
          <div class="section-header">
            <div>
              <p class="eyebrow">文章编辑</p>
              <h2>{{ editorHeading }}</h2>
              <p class="muted">当前管理员：{{ currentUser?.username }}</p>
            </div>
            <div class="button-row">
              <button class="ghost-button" type="button" @click="clearArticleForm">清空</button>
              <button class="primary-button" :disabled="savingArticle" type="button" @click="saveArticle">
                {{ savingArticle ? "保存中..." : articleForm.id ? "保存修改" : "创建文章" }}
              </button>
              <button
                class="primary-button"
                :disabled="savingArticle || !articleForm.id"
                type="button"
                @click="publishCurrentArticle"
              >
                发布
              </button>
            </div>
          </div>

          <div class="stack-form editor-form">
            <label>
              <span>标题</span>
              <input v-model.trim="articleForm.title" placeholder="文章标题" />
            </label>
            <div class="inline-fields">
              <label>
                <span>Slug</span>
                <input v-model.trim="articleForm.slug" placeholder="custom-slug" />
              </label>
              <label>
                <span>排序</span>
                <input v-model.number="articleForm.chapterOrder" type="number" />
              </label>
            </div>
            <div class="inline-fields">
              <label>
                <span>分类</span>
                <input v-model.trim="articleForm.categoryName" placeholder="例如：随笔" />
              </label>
              <label>
                <span>标签</span>
                <input v-model.trim="articleForm.tagNamesText" placeholder="逗号分隔，例如 Vue, Markdown" />
              </label>
            </div>
            <label>
              <span>Markdown</span>
              <textarea v-model="articleForm.contentMarkdown" class="markdown-editor" placeholder="# 文章正文" />
            </label>
          </div>

          <div class="upload-panel">
            <div>
              <h3>插入图片</h3>
              <p class="muted">上传后会生成 Markdown 图片链接并追加到正文。</p>
            </div>
            <div class="inline-fields">
              <label>
                <span>图片说明</span>
                <input v-model.trim="imageForm.altText" placeholder="图片说明" />
              </label>
              <label class="file-field">
                <span>选择图片</span>
                <input :disabled="uploadingImage" accept="image/*" type="file" @change="uploadImage" />
              </label>
            </div>
          </div>

          <div class="upload-panel">
            <div>
              <h3>批量导入文章</h3>
              <p class="muted">上传 zip。系统会按 `.md` 文件名排序导入，并转换 `images/...` 图片引用。</p>
            </div>
            <label class="file-field">
              <span>选择 zip 文件</span>
              <input :disabled="importingArticles" accept=".zip,application/zip" type="file" @change="importArticles" />
            </label>

            <div v-if="importResult" class="import-log">
              <h4>导入日志</h4>
              <p>
                成功 {{ importResult.summary.imported }} 篇，失败 {{ importResult.summary.failed }} 篇，
                缺失图片 {{ importResult.summary.missingImages }} 个，格式错误
                {{ importResult.summary.formatErrors }} 个。
              </p>
            </div>
          </div>
        </article>

        <article class="workspace-card manager-card">
          <div class="section-header">
            <div>
              <p class="eyebrow">文章管理</p>
              <h2>草稿与已发布</h2>
            </div>
            <button class="ghost-button" type="button" @click="openCreateArticle">新建</button>
          </div>

          <p v-if="adminArticles.length === 0" class="muted">还没有文章。</p>
          <ul v-else class="article-manager-list">
            <li v-for="article in adminArticles" :key="article.id" class="manager-item">
              <div>
                <strong>{{ article.title }}</strong>
                <p>{{ article.slug }}</p>
                <small>
                  {{ article.status }} - {{ article.category?.name || "未分类" }} -
                  {{ article.tags.map((tag) => tag.name).join(", ") || "无标签" }}
                </small>
              </div>
              <div class="button-row compact-row">
                <button class="ghost-button" type="button" @click="editArticle(article)">编辑</button>
                <button
                  class="ghost-button"
                  type="button"
                  :disabled="article.status !== 'PUBLISHED'"
                  @click="openArticle(article.slug)"
                >
                  查看
                </button>
                <button class="ghost-button danger-button" type="button" @click="deleteArticle(article)">
                  删除
                </button>
              </div>
            </li>
          </ul>
        </article>
      </section>

      <section v-else class="workspace-card article-card">
        <template v-if="selectedArticle">
          <div class="article-layout">
            <article>
              <div class="article-meta">
                <p class="eyebrow">文章</p>
                <h2>{{ selectedArticle.title }}</h2>
                <p class="muted">
                  作者 {{ selectedArticle.author?.username || "未知作者" }} -
                  {{ selectedArticle.category?.name || "未分类" }}
                </p>
                <div v-if="selectedArticle.tags.length" class="tag-row">
                  <button
                    v-for="tag in selectedArticle.tags"
                    :key="tag.id"
                    class="tag-chip"
                    type="button"
                    @click="filters.tag = tag.slug; applyFilters()"
                  >
                    {{ tag.name }}
                  </button>
                </div>
              </div>
              <div class="article-html" v-html="selectedArticleHtml" />

              <section class="comments-section">
                <div class="section-header">
                  <div>
                    <p class="eyebrow">评论</p>
                    <h3>{{ comments.length }} 条评论</h3>
                  </div>
                </div>

                <p v-if="commentsLoading" class="muted">正在加载评论...</p>
                <p v-else-if="comments.length === 0" class="muted">还没有评论。</p>
                <ul v-else class="comment-list">
                  <li v-for="comment in comments" :key="comment.id" class="comment-item">
                    <div class="comment-main" :class="{ reply: comment.parentId }">
                      <div class="comment-header">
                        <strong>{{ comment.user?.username || "未知用户" }}</strong>
                        <span>{{ formatDate(comment.createdAt) }}</span>
                      </div>
                      <p>{{ comment.content }}</p>
                      <small v-if="comment.parentId">回复评论 #{{ comment.parentId }}</small>
                    </div>
                    <button v-if="isAdmin" class="ghost-button danger-button" type="button" @click="deleteComment(comment)">
                      删除
                    </button>
                  </li>
                </ul>

                <form v-if="isAuthenticated" class="comment-form" @submit.prevent="submitComment">
                  <label>
                    <span>发表评论</span>
                    <textarea
                      v-model.trim="commentForm.content"
                      :disabled="postingComment"
                      maxlength="2000"
                      placeholder="写下你的想法..."
                      required
                    />
                  </label>
                  <button class="primary-button" :disabled="postingComment || !commentForm.content" type="submit">
                    {{ postingComment ? "发布中..." : "发布评论" }}
                  </button>
                </form>
                <p v-else class="muted comment-login-hint">登录后可以发表评论。</p>
              </section>
            </article>

            <nav v-if="selectedToc.length" class="toc-panel" :class="{ open: tocOpen }">
              <button class="toc-toggle" type="button" @click="tocOpen = !tocOpen">
                文章目录
              </button>
              <ol>
                <li v-for="item in selectedToc" :key="item.id" :class="`toc-level-${item.level}`">
                  <a :href="`#${item.id}`">{{ item.title }}</a>
                </li>
              </ol>
            </nav>
          </div>
        </template>
        <template v-else>
          <p class="eyebrow">首页</p>
          <h2>请选择一篇文章</h2>
          <p class="muted">文章发布后会出现在左侧列表。</p>
        </template>
      </section>
    </main>
  </div>
</template>
