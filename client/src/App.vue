<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";

const API_BASE_URL = "/api";
const ASSET_BASE_URL = "";
const TOKEN_STORAGE_KEY = "private-blog-token";
const THEME_STORAGE_KEY = "private-blog-theme";

const view = ref("public");
const authMode = ref("login");
const themeMode = ref(localStorage.getItem(THEME_STORAGE_KEY) || "light");
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
const showBackToTop = ref(false);
const latestPage = ref(1);
const message = ref("");
const trafficChartRef = ref(null);
const popularPostsPlaceholder = [
  { title: "如何建立高效的个人知识库系统", views: "3.2k 阅读" },
  { title: "2024 前端开发者必备技能树", views: "2.8k 阅读" },
  { title: "Figma 插件推荐：提升 200% 效率", views: "2.5k 阅读" }
];
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
const likedArticleSlugs = ref(new Set());
const favoritedArticleSlugs = ref(new Set());

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
const isDarkMode = computed(() => themeMode.value === "dark");
const roleLabel = computed(() => (isAdmin.value ? "管理员" : "普通用户"));
const selectedArticleHtml = computed(() => mapAssetUrls(selectedArticle.value?.contentHtml || ""));
const selectedToc = computed(() => selectedArticle.value?.toc || []);
const editorHeading = computed(() => (articleForm.id ? `编辑：${articleForm.title || "未命名文章"}` : "新建文章"));
const selectedArticleAuthorName = computed(() => selectedArticle.value?.author?.username || "未知作者");
const selectedArticleAuthorInitial = computed(() => selectedArticleAuthorName.value[0]?.toUpperCase() || "?");
const selectedArticleReadTime = computed(() => {
  const plainText = String(selectedArticle.value?.contentMarkdown || "").replace(/[#>*_`[\]()!-]/g, "");
  const estimatedMinutes = Math.max(1, Math.ceil(plainText.length / 450));
  return `${estimatedMinutes} 分钟阅读`;
});
const selectedArticleSlug = computed(() => selectedArticle.value?.slug || "");
const isSelectedArticleLiked = computed(() => Boolean(selectedArticleSlug.value && likedArticleSlugs.value.has(selectedArticleSlug.value)));
const isSelectedArticleFavorited = computed(() => Boolean(selectedArticleSlug.value && favoritedArticleSlugs.value.has(selectedArticleSlug.value)));
const selectedArticleStats = computed(() => ({
  views: "3,284",
  likes: 168 + (isSelectedArticleLiked.value ? 1 : 0),
  comments: comments.value.length
}));
const authorStats = computed(() => ({
  articles: Math.max(publishedArticles.value.length, 42),
  followers: "1.2k",
  likes: "8.5k"
}));

function articleSortTime(article) {
  const time = new Date(article?.publishedAt || article?.createdAt || 0).getTime();
  return Number.isFinite(time) ? time : 0;
}

function articleOrderValue(article) {
  const order = Number(article?.chapterOrder);
  return Number.isFinite(order) ? order : Number.MAX_SAFE_INTEGER;
}

const sortedPublishedArticles = computed(() =>
  [...publishedArticles.value].sort((firstArticle, secondArticle) => {
    const timeDiff = articleSortTime(secondArticle) - articleSortTime(firstArticle);

    if (timeDiff !== 0) {
      return timeDiff;
    }

    return (secondArticle.id || 0) - (firstArticle.id || 0);
  })
);
const latestPageSize = 4;
const latestPageCount = computed(() => Math.max(1, Math.ceil(sortedPublishedArticles.value.length / latestPageSize)));
const latestPageNumbers = computed(() => Array.from({ length: latestPageCount.value }, (_item, index) => index + 1));
const latestPublishedArticles = computed(() => {
  const startIndex = (latestPage.value - 1) * latestPageSize;
  return sortedPublishedArticles.value.slice(startIndex, startIndex + latestPageSize);
});
const featuredArticle = computed(() => sortedPublishedArticles.value[0] || null);
const orderedPublishedArticles = computed(() =>
  [...publishedArticles.value].sort((firstArticle, secondArticle) => {
    const orderDiff = articleOrderValue(firstArticle) - articleOrderValue(secondArticle);

    if (orderDiff !== 0) {
      return orderDiff;
    }

    return (firstArticle.id || 0) - (secondArticle.id || 0);
  })
);
const nextArticleOrder = computed(() => {
  const knownArticleIds = new Set(
    [...publishedArticles.value, ...adminArticles.value]
      .map((article) => article.id)
      .filter(Boolean)
  );
  return knownArticleIds.size + 1;
});

watch(latestPageCount, (pageCount) => {
  if (latestPage.value > pageCount) {
    latestPage.value = pageCount;
  }
});

function mapAssetUrls(html) {
  return String(html || "").replace(/(src|href)="\/uploads\//g, `$1="${ASSET_BASE_URL}/uploads/`);
}

function tagTextToArray(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function applyThemeMode() {
  document.documentElement.classList.toggle("dark", isDarkMode.value);
}

function toggleThemeMode() {
  themeMode.value = isDarkMode.value ? "light" : "dark";
  localStorage.setItem(THEME_STORAGE_KEY, themeMode.value);
  applyThemeMode();
}

function setLatestPage(page) {
  latestPage.value = Math.min(Math.max(1, page), latestPageCount.value);
}

function goToPreviousLatestPage() {
  setLatestPage(latestPage.value - 1);
}

function goToNextLatestPage() {
  setLatestPage(latestPage.value + 1);
}

function likeArticle() {
  if (!selectedArticleSlug.value) {
    return;
  }

  const nextLikedArticleSlugs = new Set(likedArticleSlugs.value);

  if (nextLikedArticleSlugs.has(selectedArticleSlug.value)) {
    nextLikedArticleSlugs.delete(selectedArticleSlug.value);
    setMessage("已取消点赞。");
  } else {
    nextLikedArticleSlugs.add(selectedArticleSlug.value);
    setMessage("已收到你的点赞。");
  }

  likedArticleSlugs.value = nextLikedArticleSlugs;
}

function favoriteArticle() {
  if (!selectedArticleSlug.value) {
    return;
  }

  const nextFavoritedArticleSlugs = new Set(favoritedArticleSlugs.value);

  if (nextFavoritedArticleSlugs.has(selectedArticleSlug.value)) {
    nextFavoritedArticleSlugs.delete(selectedArticleSlug.value);
    setMessage("已取消收藏。");
  } else {
    nextFavoritedArticleSlugs.add(selectedArticleSlug.value);
    setMessage("文章已加入收藏。");
  }

  favoritedArticleSlugs.value = nextFavoritedArticleSlugs;
}

async function shareArticle() {
  try {
    await navigator.clipboard.writeText(window.location.href);
    setMessage("文章链接已复制。");
  } catch (_error) {
    setMessage("复制失败，请手动复制地址栏链接。");
  }
}

function parseHash() {
  const hash = window.location.hash.replace(/^#/, "");

  if (!hash) {
    return {
      viewName: "public",
      slug: null
    };
  }

  if (["login", "register"].includes(hash)) {
    return {
      viewName: "public",
      slug: null,
      authMode: hash
    };
  }

  if (["dashboard", "admin"].includes(hash)) {
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

function showLoginForm() {
  authMode.value = "login";
  setHash("");
}

function showRegisterForm() {
  authMode.value = "register";
  setHash("");
}

function clearArticleForm() {
  articleForm.id = null;
  articleForm.title = "";
  articleForm.slug = "";
  articleForm.chapterOrder = nextArticleOrder.value;
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

function clearAuthState(nextMessage = "登录状态已失效，请重新登录。", nextHash = "") {
  token.value = "";
  currentUser.value = null;
  currentSession.value = null;
  adminArticles.value = [];
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  authMode.value = "login";
  setMessage(nextMessage);
  setHash(nextHash);
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
  const { viewName, slug, authMode: nextAuthMode } = parseHash();

  if (nextAuthMode && !isAuthenticated.value) {
    authMode.value = nextAuthMode;
  }

  if (viewName === "admin" && !isAdmin.value) {
    view.value = isAuthenticated.value ? "public" : "login";
    return;
  }

  if (viewName === "dashboard" && !isAuthenticated.value) {
    view.value = "public";
    return;
  }

  view.value = viewName;

  if (viewName === "article" && slug) {
    loadArticleDetail(slug);
    return;
  }

  if (viewName === "public" && !selectedArticle.value && sortedPublishedArticles.value.length > 0) {
    selectedArticle.value = sortedPublishedArticles.value[0];
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
      selectedArticle.value = sortedPublishedArticles.value[0];
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
  latestPage.value = 1;
  await loadPublishedArticles();
}

async function clearFilters() {
  filters.q = "";
  filters.category = "";
  filters.tag = "";
  latestPage.value = 1;
  await loadPublishedArticles();
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
    showLoginForm();
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
    setHash("");
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
    clearAuthState("已退出登录。", "");
  }
}

function openArticle(slug) {
  setHash(`article/${encodeURIComponent(slug)}`);
}

function openPublicHome() {
  setHash("");
}

function toggleMobileMenu() {
  mobileMenuOpen.value = !mobileMenuOpen.value;
}

function closeMobileMenu() {
  mobileMenuOpen.value = false;
}

function handleArticleNavClick(slug) {
  closeMobileMenu();
  openArticle(slug);
}

function handleScroll() {
  showBackToTop.value = window.scrollY > window.innerHeight * 0.6;
}

function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
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
  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return "时间未知";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function articleDisplayDate(article) {
  return formatDate(article?.publishedAt || article?.createdAt);
}

function handleHashChange() {
  syncViewToHash();
}

function initTrafficChart() {
  nextTick(() => {
    const el = trafficChartRef.value;
    if (!el || typeof echarts === "undefined") return;
    try {
      const myChart = echarts.init(el);
      myChart.setOption({
        grid: { left: 0, right: 0, top: 10, bottom: 0 },
        xAxis: { type: "category", data: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], show: false },
        yAxis: { type: "value", show: false },
        series: [{
          data: [820, 932, 901, 934, 1290, 1330, 1320],
          type: "line",
          smooth: true,
          symbol: "none",
          lineStyle: { color: "#F97316", width: 3 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(249, 115, 22, 0.3)" },
              { offset: 1, color: "rgba(249, 115, 22, 0)" }
            ])
          }
        }]
      });
      window.addEventListener("resize", () => myChart.resize());
    } catch (_e) {
      // ECharts 尚未加载完成，静默跳过
    }
  });
}

watch(view, (newVal) => {
  if (newVal === "public") {
    initTrafficChart();
  }
});

onMounted(async () => {
  applyThemeMode();
  window.addEventListener("hashchange", handleHashChange);
  window.addEventListener("scroll", handleScroll, { passive: true });
  await Promise.all([loadPublishedArticles(), loadArticleFilters()]);
  if (token.value) {
    await loadProfile();
  }
  if (!articleForm.id && articleForm.chapterOrder === 0) {
    articleForm.chapterOrder = nextArticleOrder.value;
  }
  syncViewToHash();
  initTrafficChart();
  handleScroll();
});

onBeforeUnmount(() => {
  window.removeEventListener("hashchange", handleHashChange);
  window.removeEventListener("scroll", handleScroll);
  if (messageTimer) {
    clearTimeout(messageTimer);
  }
});
</script>

<template>
  <div v-if="message" class="toast-message" role="status" aria-live="polite">
    {{ message }}
  </div>
  <button
    v-if="view === 'article' && selectedArticle && mobileMenuOpen"
    class="article-mobile-overlay"
    type="button"
    aria-label="关闭文章筛选"
    @click="closeMobileMenu"
  ></button>

  <!-- ===== 顶部导航栏 (新 UI) ===== -->
  <header
    class="sticky top-0 z-50 w-full border-b"
    :class="view === 'article' ? 'article-detail-header bg-white/95 border-slate-200 backdrop-blur' : 'glass-effect border-orange-100/50'"
  >
    <div class="max-w-[1440px] mx-auto px-6 h-16 flex items-center justify-between">
      <template v-if="view === 'article'">
        <div class="article-header-left">
          <button class="flex items-center gap-2 cursor-pointer" type="button" @click="openPublicHome">
            <span class="brand-logo-mark compact">
              <iconify-icon icon="mdi:feather" width="24"></iconify-icon>
              <span class="brand-feather-fallback" aria-hidden="true"></span>
            </span>
            <span class="brand-logo-text compact">MyBlog <span>Pro</span></span>
          </button>
          <span class="article-header-divider"></span>
          <button class="article-return-button" type="button" @click="openPublicHome">
            <iconify-icon icon="mdi:arrow-left" width="20"></iconify-icon>
            <span class="icon-fallback" aria-hidden="true">←</span>
            <span>返回</span>
          </button>
        </div>

        <div class="article-header-search hidden md:flex">
          <iconify-icon class="text-slate-400 mr-2 shrink-0" icon="mdi:magnify"></iconify-icon>
          <input
            aria-label="搜索文章、标签或关键词"
            class="bg-transparent border-none outline-none text-sm w-full placeholder:text-slate-400"
            placeholder="搜索文章、标签或关键词..."
            readonly
            type="text"
          />
          <kbd class="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 bg-white border border-slate-200 rounded ml-2">⌘K</kbd>
        </div>

        <div class="article-header-actions">
          <div class="article-action-group">
            <button class="article-icon-button" :class="{ 'is-active': isSelectedArticleLiked }" type="button" title="点赞" @click="likeArticle">
              <iconify-icon :icon="isSelectedArticleLiked ? 'mdi:heart' : 'mdi:heart-outline'" width="24"></iconify-icon>
              <span class="icon-fallback" aria-hidden="true">♡</span>
            </button>
            <button class="article-icon-button" :class="{ 'is-active': isSelectedArticleFavorited }" type="button" title="收藏" @click="favoriteArticle">
              <iconify-icon :icon="isSelectedArticleFavorited ? 'mdi:bookmark' : 'mdi:bookmark-outline'" width="24"></iconify-icon>
              <span class="bookmark-icon-fallback" aria-hidden="true"></span>
            </button>
            <button class="article-icon-button" type="button" title="分享" @click="shareArticle">
              <iconify-icon icon="mdi:share-variant-outline" width="24"></iconify-icon>
              <span class="icon-fallback" aria-hidden="true">⌯</span>
            </button>
          </div>
          <div class="h-8 w-[1px] bg-slate-200 mx-1"></div>
          <button
            class="p-2 text-slate-500 hover:text-orange-500 dark:text-slate-300 dark:hover:text-orange-300 transition-colors"
            :title="isDarkMode ? '切换到亮色模式' : '切换到暗色模式'"
            type="button"
            @click="toggleThemeMode"
          >
            <iconify-icon :icon="isDarkMode ? 'mdi:weather-sunny' : 'mdi:weather-night'" width="22"></iconify-icon>
          </button>
          <button v-if="isAuthenticated" class="p-2 text-slate-500 hover:text-orange-500 transition-colors relative" title="通知" type="button">
            <iconify-icon icon="mdi:bell-outline" width="22"></iconify-icon>
            <span class="absolute top-2 right-2 w-2 h-2 bg-orange-500 rounded-full border-2 border-white"></span>
          </button>

          <template v-if="!isAuthenticated">
            <button class="w-10 h-10 rounded-full bg-slate-100 hover:bg-orange-50 text-slate-500 hover:text-orange-500 flex items-center justify-center transition-all" title="账户" type="button" @click="showLoginForm">
              <iconify-icon icon="mdi:account-outline" width="24"></iconify-icon>
            </button>
          </template>

          <template v-else>
            <div class="flex items-center gap-3 px-2 py-1.5 rounded-full bg-white border border-slate-100 shadow-sm cursor-pointer group relative hover:border-orange-200 hover:shadow-md transition-all" @click="isAdmin ? openAdminDashboard() : openUserDashboard()">
              <div class="w-9 h-9 rounded-full bg-orange-100 overflow-hidden flex items-center justify-center text-orange-600 text-sm font-bold">
                {{ (currentUser?.username || '?')[0].toUpperCase() }}
              </div>
              <div class="hidden sm:block pr-2 leading-tight">
                <p class="text-sm font-bold text-slate-800 group-hover:text-orange-500 transition-colors">{{ currentUser?.username || '用户' }}</p>
                <p class="text-[10px] text-slate-400">{{ roleLabel }}</p>
              </div>
            </div>
          </template>
        </div>
      </template>
      <template v-else>
        <div class="flex items-center gap-2 cursor-pointer" @click="openPublicHome">
          <div class="brand-logo-mark compact">
            <iconify-icon icon="mdi:feather" width="24"></iconify-icon>
            <span class="brand-feather-fallback" aria-hidden="true"></span>
          </div>
          <span class="brand-logo-text compact">MyBlog <span>Pro</span></span>
        </div>

        <div class="hidden md:flex items-center bg-slate-100 rounded-full px-4 py-1.5 w-96 border border-transparent focus-within:border-orange-300 focus-within:bg-white transition-all">
          <iconify-icon class="text-slate-400 mr-2 shrink-0" icon="mdi:magnify"></iconify-icon>
          <input
            v-model.trim="filters.q"
            class="bg-transparent border-none outline-none text-sm w-full placeholder:text-slate-400"
            placeholder="搜索文章、标签或关键词..."
            type="text"
            @keydown.enter="applyFilters"
          />
          <kbd class="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 bg-white border border-slate-200 rounded ml-2">⌘K</kbd>
        </div>

        <div class="flex items-center gap-4">
          <button
            class="p-2 text-slate-500 hover:text-orange-500 dark:text-slate-300 dark:hover:text-orange-300 transition-colors"
            :title="isDarkMode ? '切换到亮色模式' : '切换到暗色模式'"
            type="button"
            @click="toggleThemeMode"
          >
            <iconify-icon :icon="isDarkMode ? 'mdi:weather-sunny' : 'mdi:weather-night'" width="22"></iconify-icon>
          </button>
          <button v-if="isAuthenticated" class="p-2 text-slate-500 hover:text-orange-500 transition-colors relative" title="通知" type="button">
            <iconify-icon icon="mdi:bell-outline" width="22"></iconify-icon>
            <span class="absolute top-2 right-2 w-2 h-2 bg-orange-500 rounded-full border-2 border-white"></span>
          </button>
          <div class="h-8 w-[1px] bg-slate-200 mx-1"></div>

          <!-- 未登录：显示登录/注册按钮 -->
          <template v-if="!isAuthenticated">
            <button class="w-10 h-10 rounded-full bg-slate-100 hover:bg-orange-50 text-slate-500 hover:text-orange-500 flex items-center justify-center transition-all" title="账户" type="button" @click="showLoginForm">
              <iconify-icon icon="mdi:account-outline" width="24"></iconify-icon>
            </button>
          </template>

          <!-- 已登录：显示用户头像 -->
          <template v-else>
            <div class="flex items-center gap-3 px-2 py-1.5 rounded-full bg-white border border-slate-100 shadow-sm cursor-pointer group relative hover:border-orange-200 hover:shadow-md transition-all" @click="isAdmin ? openAdminDashboard() : openUserDashboard()">
              <div class="w-9 h-9 rounded-full bg-orange-100 overflow-hidden flex items-center justify-center text-orange-600 text-sm font-bold">
                {{ (currentUser?.username || '?')[0].toUpperCase() }}
              </div>
              <div class="hidden sm:block pr-2 leading-tight">
                <p class="text-sm font-bold text-slate-800 group-hover:text-orange-500 transition-colors">{{ currentUser?.username || '用户' }}</p>
                <p class="text-[10px] text-slate-400">{{ roleLabel }}</p>
              </div>
            </div>
          </template>
        </div>
      </template>
    </div>
  </header>

  <!-- ===== 主内容区 ===== -->
  <main
    class="max-w-[1440px] mx-auto px-6 py-8 grid grid-cols-1 gap-8 items-start"
    :class="view === 'article' ? 'article-detail-shell' : 'lg:grid-cols-[320px_minmax(0,1fr)]'"
  >
    <!-- ===== 左侧操作区 (Sidebar) ===== -->
    <aside
      v-if="view !== 'article' || selectedArticle"
      :class="view === 'article' ? ['article-left-sidebar scrollbar-hidden', { 'is-open': mobileMenuOpen }] : 'w-full flex flex-col gap-6 lg:self-stretch'"
    >
      <!-- 登录/注册卡片 -->
      <section v-if="view !== 'article'" class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 card-hover">
        <template v-if="!isAuthenticated">
          <div class="flex gap-2 mb-6">
            <button
              type="button"
              class="flex-1 py-2 text-sm font-bold transition-all"
              :class="authMode === 'login' ? 'active-tab' : 'text-slate-400 hover:text-slate-600'"
              @click="showLoginForm"
            >登录</button>
            <button
              type="button"
              class="flex-1 py-2 text-sm font-bold transition-all"
              :class="authMode === 'register' ? 'active-tab' : 'text-slate-400 hover:text-slate-600'"
              @click="showRegisterForm"
            >注册</button>
          </div>
          <div class="space-y-4">
            <!-- 注册表单 -->
            <template v-if="authMode === 'register'">
              <form class="space-y-4" @submit.prevent="submitRegister">
                <div>
                  <input v-model.trim="registerForm.email" autocomplete="email" class="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all" placeholder="电子邮箱" type="email" />
                </div>
                <div>
                  <input v-model.trim="registerForm.username" autocomplete="username" class="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all" placeholder="设置用户名" type="text" />
                </div>
                <div>
                  <input v-model="registerForm.password" autocomplete="new-password" class="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all" placeholder="设置密码" type="password" />
                </div>
                <button class="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all active:scale-[0.98]" :disabled="submitLoading" type="submit">
                  {{ submitLoading ? "注册中..." : "确认注册" }}
                </button>
              </form>
            </template>
            <!-- 登录表单 -->
            <template v-else>
              <form class="space-y-4" @submit.prevent="submitLogin">
                <div>
                  <input v-model.trim="loginForm.account" autocomplete="username" class="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all" placeholder="用户名或邮箱" type="text" />
                </div>
                <div>
                  <input v-model="loginForm.password" autocomplete="current-password" class="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all" placeholder="密码" type="password" />
                </div>
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <input aria-label="记住我" class="w-4 h-4 accent-orange-500" type="checkbox" />
                    <span class="text-xs text-slate-500">记住我</span>
                  </div>
                </div>
                <button class="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all active:scale-[0.98]" :disabled="submitLoading || loading" type="submit">
                  {{ submitLoading ? "登录中..." : "确认提交" }}
                </button>
              </form>
            </template>
          </div>
        </template>
        <!-- 已登录：显示账户信息 -->
        <template v-else>
          <div class="flex items-center gap-3 mb-4">
            <div class="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-lg font-bold">
              {{ (currentUser?.username || '?')[0].toUpperCase() }}
            </div>
            <div>
              <p class="font-bold text-slate-800">{{ currentUser?.username }}</p>
              <p class="text-xs text-slate-400">{{ roleLabel }} · {{ currentSession?.deviceId || '未知设备' }}</p>
            </div>
          </div>
          <div class="flex gap-2">
            <button class="flex-1 py-2 text-sm font-semibold text-slate-600 bg-slate-50 rounded-xl hover:bg-slate-100 transition-all" type="button" @click="openUserDashboard">用户面板</button>
            <button v-if="isAdmin" class="flex-1 py-2 text-sm font-semibold text-white bg-orange-500 rounded-xl hover:bg-orange-600 transition-all" type="button" @click="openAdminDashboard">管理后台</button>
            <button class="px-3 py-2 text-sm font-semibold text-red-500 bg-red-50 rounded-xl hover:bg-red-100 transition-all" type="button" @click="logout" :disabled="submitLoading">退出</button>
          </div>
        </template>
      </section>

      <section v-else class="article-side-card author-card article-left-author-card">
        <div class="author-row">
          <span class="article-avatar large">{{ selectedArticleAuthorInitial }}</span>
          <div>
            <h3>{{ selectedArticleAuthorName }}</h3>
            <p>博客作者</p>
          </div>
        </div>
        <div class="author-stats">
          <div>
            <strong>{{ authorStats.articles }}</strong>
            <span>文章</span>
          </div>
          <div>
            <strong>{{ authorStats.followers }}</strong>
            <span>粉丝</span>
          </div>
          <div>
            <strong>{{ authorStats.likes }}</strong>
            <span>获赞</span>
          </div>
        </div>
        <button type="button">
          <iconify-icon icon="mdi:account-outline" width="22"></iconify-icon>
          关注作者
        </button>
      </section>

      <nav v-if="view === 'article' && selectedToc?.length" class="article-side-card article-toc-card article-left-toc-card">
        <h3>
          <iconify-icon icon="mdi:format-list-bulleted" width="24"></iconify-icon>
          目录
        </h3>
        <ol>
          <li v-for="item in selectedToc" :key="item.id" :class="`toc-level-${item.level}`">
            <a :href="`#${item.id}`">{{ item.title }}</a>
          </li>
        </ol>
      </nav>

      <!-- 筛选文章卡片 -->
      <section class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 card-hover">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-bold text-slate-800 flex items-center gap-2">
            <iconify-icon class="text-orange-500" icon="mdi:filter-variant"></iconify-icon>
            筛选文章
          </h3>
          <button class="text-xs text-blue-500 hover:underline" type="button" @click="clearFilters">清空</button>
        </div>
        <form class="space-y-4" @submit.prevent="applyFilters">
          <div>
            <span class="text-xs font-semibold text-slate-400 mb-1.5 block">关键词搜索</span>
            <input v-model.trim="filters.q" class="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all" placeholder="标题或正文关键词" type="text" />
          </div>
          <div>
            <span class="text-xs font-semibold text-slate-400 mb-1.5 block">全部分类</span>
            <select v-model="filters.category" class="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all appearance-none">
              <option value="">全部分类</option>
              <option v-for="category in categories" :key="category.id" :value="category.slug">{{ category.name }}</option>
            </select>
          </div>
          <div>
            <span class="text-xs font-semibold text-slate-400 mb-1.5 block">全部标签</span>
            <select v-model="filters.tag" class="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all appearance-none">
              <option value="">全部标签</option>
              <option v-for="tag in tags" :key="tag.id" :value="tag.slug">{{ tag.name }}</option>
            </select>
          </div>
          <button class="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl shadow-lg shadow-orange-500/30 transition-all flex items-center justify-center gap-2 active:scale-[0.98]" type="submit">
            应用筛选
          </button>
        </form>
      </section>

      <!-- 文章列表卡片 -->
      <section
        class="article-sidebar-list-card bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col card-hover"
        :class="view === 'article' ? '' : ['h-[520px]', isAuthenticated ? 'lg:h-[760px]' : 'lg:h-[620px]']"
      >
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-bold text-slate-800 flex items-center gap-2">
            <iconify-icon class="text-orange-500" icon="mdi:format-list-bulleted"></iconify-icon>
            文章列表
          </h3>
          <button class="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors" type="button" @click="openPublicHome">首页</button>
        </div>
        <div class="flex-1 min-h-0 overflow-y-auto custom-scrollbar scrollbar-hidden space-y-3 pr-1">
          <p v-if="articleLoading" class="text-sm text-slate-400 text-center py-8">正在加载文章...</p>
          <template v-else-if="orderedPublishedArticles.length === 0">
            <div class="flex flex-col items-center justify-center py-10 text-center">
              <iconify-icon icon="mdi:folder-open-outline" width="48"></iconify-icon>
              <p class="text-sm font-bold mt-2 text-slate-500">暂无匹配文章</p>
              <p class="text-xs mt-1 text-slate-400">换个关键词试试</p>
              <button class="mt-4 text-xs px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition-colors" type="button" @click="clearFilters">清空筛选</button>
            </div>
          </template>
          <template v-else>
            <div
              v-for="article in orderedPublishedArticles"
              :key="article.id"
              class="p-3 hover:bg-orange-50 rounded-xl cursor-pointer group transition-all border border-transparent hover:border-orange-100"
              :class="{ 'article-list-item-active': view === 'article' && article.slug === selectedArticleSlug }"
              @click="handleArticleNavClick(article.slug)"
            >
              <h4 class="text-sm font-semibold text-slate-700 group-hover:text-orange-600 transition-colors line-clamp-1">{{ article.title }}</h4>
              <p class="text-xs text-slate-400 mt-1 flex items-center gap-2">
                <iconify-icon icon="mdi:clock-outline"></iconify-icon>
                {{ article.category?.name || '未分类' }} · {{ articleDisplayDate(article) }}
              </p>
            </div>
          </template>
        </div>
      </section>
    </aside>

    <!-- ===== 右侧内容区 ===== -->
    <div v-if="view !== 'article'" class="flex-1 flex flex-col gap-8 min-w-0">

      <!-- ========== PUBLIC 视图 (新 UI) ========== -->
      <template v-if="view === 'public'">
        <!-- Hero 精选文章 -->
        <section v-if="featuredArticle" class="relative w-full h-[400px] rounded-3xl overflow-hidden group cursor-pointer shadow-xl" @click="openArticle(featuredArticle.slug)">
          <div class="absolute inset-0 bg-gradient-to-br from-orange-500/20 via-slate-900/50 to-slate-900"></div>
          <div class="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"></div>
          <div class="absolute bottom-0 left-0 p-8 md:p-12 w-full md:w-3/4">
            <div class="flex items-center gap-3 mb-4">
              <span class="px-3 py-1 bg-orange-500 text-white text-xs font-bold rounded-full">精选推荐</span>
              <span class="text-slate-300 text-xs flex items-center gap-1">
                <iconify-icon icon="mdi:calendar"></iconify-icon>
                {{ articleDisplayDate(featuredArticle) }}
              </span>
            </div>
            <h1 class="text-3xl md:text-4xl font-bold text-white mb-4 group-hover:text-orange-400 transition-colors leading-tight">
              {{ featuredArticle.title }}
            </h1>
            <p class="text-slate-300 text-sm md:text-base line-clamp-2 mb-6 opacity-90">
              {{ featuredArticle.category?.name || '未分类' }} · 作者 {{ featuredArticle.author?.username || '未知' }}
            </p>
            <button class="flex items-center gap-2 text-white font-bold group/btn" type="button">
              继续阅读 <iconify-icon class="group-hover/btn:translate-x-2 transition-transform" icon="mdi:arrow-right"></iconify-icon>
            </button>
          </div>
        </section>
        <section v-else class="relative w-full h-[400px] rounded-3xl overflow-hidden shadow-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
          <div class="text-center">
            <iconify-icon icon="mdi:feather" width="64" class="text-slate-300"></iconify-icon>
            <p class="text-slate-400 mt-4 text-lg">欢迎来到我的博客</p>
            <p class="text-slate-400 text-sm">文章发布后将在这里展示</p>
          </div>
        </section>

        <!-- 文章流与侧边栏容器 -->
        <div class="flex flex-col xl:flex-row gap-8">
          <!-- 文章列表 Grid -->
          <div class="flex-1 space-y-8">
            <div class="flex items-center justify-between">
              <h2 class="text-2xl font-bold text-slate-900">最新发布</h2>
            </div>

            <p v-if="articleLoading" class="text-center py-12 text-slate-400">正在加载文章...</p>
            <div v-else-if="latestPublishedArticles.length === 0" class="text-center py-12">
              <iconify-icon icon="mdi:file-document-outline" width="48" class="text-slate-300"></iconify-icon>
              <p class="text-slate-400 mt-2">还没有已发布的文章。</p>
            </div>
            <div v-else class="latest-paged-list">
              <div class="latest-page-stage">
                <div class="latest-article-grid grid grid-cols-1 md:grid-cols-2 gap-6">
                  <article
                    v-for="article in latestPublishedArticles"
                    :key="article.id"
                    class="latest-article-card bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm card-hover flex flex-col cursor-pointer"
                    @click="openArticle(article.slug)"
                  >
                    <div class="h-48 overflow-hidden relative bg-gradient-to-br from-orange-100 to-amber-50 flex items-center justify-center">
                      <iconify-icon icon="mdi:file-document-edit-outline" width="48" class="text-orange-300"></iconify-icon>
                      <span class="absolute top-4 left-4 px-2 py-1 bg-white/90 backdrop-blur text-[10px] font-bold rounded-md shadow-sm">{{ article.category?.name || '未分类' }}</span>
                    </div>
                    <div class="p-6 flex-1 flex flex-col">
                      <h3 class="latest-article-title text-lg font-bold text-slate-900 mb-3 hover:text-orange-500 transition-colors line-clamp-2">{{ article.title }}</h3>
                      <p class="latest-article-excerpt text-sm text-slate-500 line-clamp-3 mb-4 flex-1">{{ article.contentMarkdown?.slice(0, 150) || '暂无摘要' }}...</p>
                      <div class="flex items-center justify-between pt-4 border-t border-slate-50">
                        <div class="flex items-center gap-2">
                          <div class="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-[10px] font-bold">{{ (article.author?.username || '?')[0]?.toUpperCase() }}</div>
                          <span class="text-xs text-slate-400">{{ article.author?.username || '未知' }}</span>
                        </div>
                        <span class="text-[10px] text-slate-400">{{ articleDisplayDate(article) }}</span>
                      </div>
                    </div>
                  </article>
                </div>
              </div>

              <nav class="latest-pagination" aria-label="最新发布分页">
                <button type="button" :disabled="latestPage === 1" @click="goToPreviousLatestPage">
                  <iconify-icon icon="mdi:chevron-left" width="20"></iconify-icon>
                  上一页
                </button>
                <div class="latest-page-numbers">
                  <button
                    v-for="page in latestPageNumbers"
                    :key="page"
                    :aria-current="page === latestPage ? 'page' : undefined"
                    :class="{ 'is-active': page === latestPage }"
                    type="button"
                    @click="setLatestPage(page)"
                  >
                    {{ page }}
                  </button>
                </div>
                <button type="button" :disabled="latestPage === latestPageCount" @click="goToNextLatestPage">
                  下一页
                  <iconify-icon icon="mdi:chevron-right" width="20"></iconify-icon>
                </button>
              </nav>
            </div>
          </div>

          <!-- 内容区右侧小边栏 -->
          <aside class="w-full xl:w-[280px] flex flex-col gap-8">
            <!-- 标签云 -->
            <section class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 class="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <iconify-icon class="text-orange-500" icon="mdi:tag-multiple"></iconify-icon>
                热门标签
              </h3>
              <div v-if="tags.length === 0" class="text-xs text-slate-400 text-center py-4">暂无标签</div>
              <div v-else class="flex flex-wrap gap-2">
                <span
                  v-for="tag in tags"
                  :key="tag.id"
                  class="px-3 py-1.5 bg-slate-50 text-slate-600 text-xs rounded-lg hover:bg-orange-500 hover:text-white cursor-pointer transition-all"
                  @click="filters.tag = tag.slug; applyFilters()"
                >{{ tag.name }}</span>
              </div>
            </section>

            <!-- 阅读趋势 (ECharts - 静态占位) -->
            <section class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 class="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <iconify-icon class="text-orange-500" icon="mdi:chart-line"></iconify-icon>
                阅读趋势
              </h3>
              <div ref="trafficChartRef" class="w-full h-32"></div>
              <div class="mt-4 grid grid-cols-2 gap-4">
                <div class="text-center">
                  <p class="text-[10px] text-slate-400 uppercase font-bold">今日阅读</p>
                  <p class="text-lg font-bold text-slate-900">1,284</p>
                </div>
                <div class="text-center">
                  <p class="text-[10px] text-slate-400 uppercase font-bold">总点赞</p>
                  <p class="text-lg font-bold text-slate-900">8.5k</p>
                </div>
              </div>
            </section>

            <!-- 热门排行 (静态占位) -->
            <section class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-[400px] lg:h-[440px] flex flex-col overflow-hidden">
              <h3 class="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <iconify-icon class="text-orange-500" icon="mdi:fire"></iconify-icon>
                最受欢迎
              </h3>
              <div class="space-y-4">
                <div v-for="(item, idx) in popularPostsPlaceholder" :key="idx" class="flex gap-3 group cursor-pointer">
                  <span class="text-xl font-black text-slate-100 group-hover:text-orange-100 transition-colors">{{ String(idx + 1).padStart(2, '0') }}</span>
                  <div>
                    <h4 class="text-xs font-bold text-slate-700 line-clamp-2 group-hover:text-orange-500 transition-all">{{ item.title }}</h4>
                    <p class="text-[10px] text-slate-400 mt-1">{{ item.views }}</p>
                  </div>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </template>

      <!-- ========== LEGACY 视图 (旧 UI, 样式隔离) ========== -->
      <template v-else>
        <div class="legacy-ui w-full">
          <!-- 用户面板 -->
          <section v-if="view === 'dashboard' && isAuthenticated && !isAdmin" class="workspace-card">
            <div class="article-meta">
              <p class="eyebrow">用户面板</p>
              <h2>你好，{{ currentUser?.username }}</h2>
              <p class="muted">当前身份是 {{ roleLabel }}，可以浏览已发布文章并发表评论。</p>
            </div>
          </section>

          <!-- 管理后台 -->
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
                  <button class="primary-button" :disabled="savingArticle || !articleForm.id" type="button" @click="publishCurrentArticle">发布</button>
                </div>
              </div>
              <div class="stack-form editor-form">
                <div class="form-field"><span>标题</span><input v-model.trim="articleForm.title" placeholder="文章标题" /></div>
                <div class="inline-fields">
                  <div class="form-field"><span>Slug</span><input v-model.trim="articleForm.slug" placeholder="例如：my-article" /></div>
                  <div class="form-field"><span>排序</span><input v-model.number="articleForm.chapterOrder" min="1" step="1" type="number" /></div>
                </div>
                <div class="inline-fields">
                  <div class="form-field"><span>分类</span><input v-model.trim="articleForm.categoryName" placeholder="例如：随笔" /></div>
                  <div class="form-field"><span>标签</span><input v-model.trim="articleForm.tagNamesText" placeholder="逗号分隔，例如 Vue, Markdown" /></div>
                </div>
                <div class="form-field"><span>Markdown</span><textarea v-model="articleForm.contentMarkdown" class="markdown-editor" placeholder="# 文章正文" /></div>
              </div>
              <div class="upload-panel">
                <div><h3>插入图片</h3><p class="muted">上传后会生成 Markdown 图片链接并追加到正文。</p></div>
                <div class="inline-fields">
                  <div class="form-field"><span>图片说明</span><input v-model.trim="imageForm.altText" placeholder="图片说明" /></div>
                  <div class="form-field file-field"><span>选择图片</span><input :disabled="uploadingImage" accept="image/*" type="file" @change="uploadImage" /></div>
                </div>
              </div>
              <div class="upload-panel">
                <div><h3>批量导入文章</h3><p class="muted">上传 zip。系统会按 `.md` 文件名排序导入，并转换 `images/...` 图片引用。</p></div>
                <div class="form-field file-field"><span>选择 zip 文件</span><input :disabled="importingArticles" accept=".zip,application/zip" type="file" @change="importArticles" /></div>
                <div v-if="importResult" class="import-log">
                  <h4>导入日志</h4>
                  <p>成功 {{ importResult.summary.imported }} 篇，失败 {{ importResult.summary.failed }} 篇，缺失图片 {{ importResult.summary.missingImages }} 个，格式错误 {{ importResult.summary.formatErrors }} 个。</p>
                </div>
              </div>
            </article>
            <article class="workspace-card manager-card">
              <div class="section-header">
                <div><p class="eyebrow">文章管理</p><h2>草稿与已发布</h2></div>
                <button class="ghost-button" type="button" @click="openCreateArticle">新建</button>
              </div>
              <p v-if="adminArticles.length === 0" class="muted">还没有文章。</p>
              <ul v-else class="article-manager-list">
                <li v-for="article in adminArticles" :key="article.id" class="manager-item">
                  <div>
                    <strong>{{ article.title }}</strong>
                    <p>{{ article.slug }}</p>
                    <small>第 {{ article.chapterOrder }} 篇 - {{ article.status }} - {{ article.category?.name || "未分类" }} - {{ article.tags.map((tag) => tag.name).join(", ") || "无标签" }}</small>
                  </div>
                  <div class="button-row compact-row">
                    <button class="ghost-button" type="button" @click="editArticle(article)">编辑</button>
                    <button class="ghost-button" type="button" :disabled="article.status !== 'PUBLISHED'" @click="openArticle(article.slug)">查看</button>
                    <button class="ghost-button danger-button" type="button" @click="deleteArticle(article)">删除</button>
                  </div>
                </li>
              </ul>
            </article>
          </section>

          <section v-else class="workspace-card article-card">
            <p class="eyebrow">首页</p>
            <h2>请选择一篇文章</h2>
            <p class="muted">文章发布后会出现在左侧列表。</p>
          </section>
        </div>
      </template>

    </div>

    <template v-if="view === 'article'">
      <section v-if="articleLoading && !selectedArticle" class="article-loading-card">
        <iconify-icon icon="mdi:loading" width="34"></iconify-icon>
        <p>正在加载文章...</p>
      </section>
      <section v-else-if="selectedArticle" class="article-detail-layout">
        <div class="article-detail-main">
          <button class="article-mobile-filter-button" type="button" @click="toggleMobileMenu">
            <iconify-icon icon="mdi:filter-variant" width="20"></iconify-icon>
            文章筛选
          </button>

          <section class="article-hero-card">
            <div class="article-hero-content">
              <div class="article-hero-meta">
                <span class="article-badge">精选推荐</span>
                <span class="article-hero-date">
                  <iconify-icon icon="mdi:calendar"></iconify-icon>
                  {{ formatDate(selectedArticle.createdAt) }}
                </span>
              </div>
              <h1>{{ selectedArticle.title }}</h1>
              <p>{{ selectedArticle.category?.name || '未分类' }} · 作者 {{ selectedArticleAuthorName }}</p>
            </div>
            <div class="article-hero-icon">
              <iconify-icon icon="mdi:file-document-outline" width="58"></iconify-icon>
              <span class="file-icon-fallback hero" aria-hidden="true"></span>
            </div>
          </section>

          <section class="article-title-section">
            <div class="article-meta-row">
              <span class="article-avatar small">{{ selectedArticleAuthorInitial }}</span>
              <strong>{{ selectedArticleAuthorName }}</strong>
              <span class="article-meta-item">
                <iconify-icon icon="mdi:calendar-blank-outline" width="20"></iconify-icon>
                {{ formatDate(selectedArticle.createdAt) }}
              </span>
              <span class="article-meta-item">
                <iconify-icon icon="mdi:clock-outline" width="20"></iconify-icon>
                {{ selectedArticleReadTime }}
              </span>
            </div>
            <div class="article-stats-strip">
              <span>
                <iconify-icon icon="mdi:eye-outline" width="22"></iconify-icon>
                <strong>{{ selectedArticleStats.views }}</strong>
                阅读
              </span>
              <span>
                <iconify-icon icon="mdi:thumb-up-outline" width="22"></iconify-icon>
                <strong>{{ selectedArticleStats.likes }}</strong>
                点赞
              </span>
              <span>
                <iconify-icon icon="mdi:comment-outline" width="22"></iconify-icon>
                <strong>{{ selectedArticleStats.comments }}</strong>
                评论
              </span>
            </div>
          </section>

          <article class="article-content-card">
            <div class="article-html article-detail-html" v-html="selectedArticleHtml" />
          </article>

          <section class="article-action-strip">
            <p>觉得文章不错？</p>
            <div class="article-action-buttons">
              <button :class="{ 'is-active': isSelectedArticleLiked }" type="button" @click="likeArticle">
                <iconify-icon :icon="isSelectedArticleLiked ? 'mdi:heart' : 'mdi:heart-outline'" width="24"></iconify-icon>
                点赞 {{ selectedArticleStats.likes }}
              </button>
              <button :class="{ 'is-active': isSelectedArticleFavorited }" type="button" @click="favoriteArticle">
                <iconify-icon :icon="isSelectedArticleFavorited ? 'mdi:bookmark' : 'mdi:bookmark-outline'" width="24"></iconify-icon>
                收藏
              </button>
              <button type="button" @click="shareArticle">
                <iconify-icon icon="mdi:share-variant-outline" width="24"></iconify-icon>
                分享
              </button>
            </div>
          </section>

          <section class="article-comments-card">
            <div class="article-card-title">
              <iconify-icon icon="mdi:comment-outline" width="32"></iconify-icon>
              <h2>评论 ({{ comments.length }})</h2>
            </div>
            <form v-if="isAuthenticated" class="article-comment-form" @submit.prevent="submitComment">
              <textarea v-model.trim="commentForm.content" :disabled="postingComment" maxlength="2000" placeholder="写下你的评论..." required />
              <button :disabled="postingComment || !commentForm.content" type="submit">{{ postingComment ? "发布中..." : "发表评论" }}</button>
            </form>
            <div v-else class="article-login-hint">
              登录后可以发表评论。
              <button type="button" @click="showLoginForm">去登录</button>
            </div>

            <div class="article-comments-divider"></div>
            <p v-if="commentsLoading" class="article-muted">正在加载评论...</p>
            <p v-else-if="comments.length === 0" class="article-muted">还没有评论。</p>
            <ul v-else class="article-comment-list">
              <li v-for="comment in comments" :key="comment.id" class="article-comment-item">
                <span class="article-avatar article-comment-avatar">{{ (comment.user?.username || '访')[0]?.toUpperCase() }}</span>
                <div class="article-comment-body">
                  <div class="article-comment-head">
                    <strong>{{ comment.user?.username || "未知用户" }}</strong>
                    <time>{{ formatDate(comment.createdAt) }}</time>
                  </div>
                  <p>{{ comment.content }}</p>
                  <div class="article-comment-actions">
                    <span>
                      <iconify-icon icon="mdi:thumb-up-outline" width="16"></iconify-icon>
                      {{ Math.max(1, comment.id % 13) }}
                    </span>
                    <span>回复</span>
                    <button v-if="isAdmin" type="button" @click="deleteComment(comment)">删除</button>
                  </div>
                </div>
              </li>
            </ul>
          </section>
        </div>

      </section>
      <section v-else class="article-loading-card">
        <p>文章不存在或尚未发布。</p>
        <button type="button" @click="openPublicHome">返回首页</button>
      </section>
    </template>

    <button
      v-if="view === 'article' && showBackToTop"
      class="back-to-top-button"
      type="button"
      title="回到顶部"
      @click="scrollToTop"
    >
      <iconify-icon icon="mdi:arrow-up" width="22"></iconify-icon>
      <span class="icon-fallback" aria-hidden="true">↑</span>
    </button>

    <!-- 页脚 -->
    <footer v-if="view === 'public'" class="bg-white border-t border-slate-100 rounded-2xl py-12 px-6 lg:col-span-2">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-12">
        <div class="col-span-1">
          <div class="flex items-center gap-2 mb-6">
            <div class="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white">
              <iconify-icon icon="mdi:feather" width="20"></iconify-icon>
            </div>
            <span class="text-xl font-bold tracking-tight text-slate-900">MyBlog</span>
          </div>
          <p class="text-sm text-slate-500 leading-relaxed mb-6">这是一个专注于分享技术、设计与生活思考的私人空间。我们相信文字的力量，也相信记录的意义。</p>
          <div class="flex gap-4">
            <a class="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-orange-500 hover:text-white transition-all" href="#"><iconify-icon icon="mdi:github"></iconify-icon></a>
            <a class="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-orange-500 hover:text-white transition-all" href="#"><iconify-icon icon="mdi:twitter"></iconify-icon></a>
          </div>
        </div>
        <div>
          <h4 class="font-bold text-slate-900 mb-6">快速链接</h4>
          <ul class="space-y-4 text-sm text-slate-500">
            <li><a class="hover:text-orange-500 transition-colors cursor-pointer" @click.prevent="openPublicHome">首页</a></li>
            <li><a class="hover:text-orange-500 transition-colors cursor-pointer">文章归档</a></li>
            <li><a class="hover:text-orange-500 transition-colors cursor-pointer">友情链接</a></li>
          </ul>
        </div>
        <div>
          <h4 class="font-bold text-slate-900 mb-6">分类目录</h4>
          <ul class="space-y-4 text-sm text-slate-500">
            <li v-for="cat in categories" :key="cat.id">
              <a class="hover:text-orange-500 transition-colors cursor-pointer" @click="filters.category = cat.slug; applyFilters()">{{ cat.name }}</a>
            </li>
            <li v-if="categories.length === 0"><span class="text-slate-300">暂无分类</span></li>
          </ul>
        </div>
        <div>
          <h4 class="font-bold text-slate-900 mb-6">关于</h4>
          <p class="text-sm text-slate-500 leading-relaxed">基于 Vue 3 + Tailwind CSS 构建的私人博客系统。</p>
        </div>
      </div>
      <div class="mt-12 pt-8 border-t border-slate-50 text-center text-xs text-slate-400">
        &copy; 2024 MyBlog Pro. Built with Vue 3 &amp; Tailwind CSS.
      </div>
    </footer>
  </main>
</template>
