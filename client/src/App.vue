<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";

const API_BASE_URL = "/api";
const ASSET_BASE_URL = "";
const TOKEN_STORAGE_KEY = "private-blog-token";
const THEME_STORAGE_KEY = "private-blog-theme";
const VISITOR_STORAGE_KEY = "private-blog-visitor-id";

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
const adminVisitChartRef = ref(null);
const adminCategoryChartRef = ref(null);
let messageTimer = null;
let adminVisitChartInstance = null;
let adminCategoryChartInstance = null;
const currentUser = ref(null);
const currentSession = ref(null);
const publishedArticles = ref([]);
const adminArticles = ref([]);
const popularArticles = ref([]);
const selectedArticle = ref(null);
const comments = ref([]);
const categories = ref([]);
const tags = ref([]);
const importResult = ref(null);
const siteSummary = ref({
  todayVisits: 0,
  totalLikes: 0,
  totalViews: 0,
  totalFavorites: 0
});
const adminActiveTab = ref("overview");
const adminMobileNavOpen = ref(false);
const adminOverviewLoading = ref(false);
const adminOverview = ref({
  summary: {
    userCount: 0,
    articleCount: 0,
    commentCount: 0,
    todayVisits: 0
  },
  visitTrend: []
});
const returnArticleSlugAfterLogin = ref("");
const activeReplyTarget = ref(null);
const expandedReplyCommentIds = ref(new Set());
const DEFAULT_VISIBLE_REPLY_COUNT = 2;
const userPanelActiveTab = ref("overview");
const userPanelMobileNavOpen = ref(false);
const articleEditorSettingsCollapsed = ref(false);
const articleEditorSettingsOpen = ref(false);
const articleEditorMoreMenuOpen = ref(false);
const articleEditorSeoOpen = ref(false);
const articleEditorCoverRatio = ref("16:9");
const articleEditorMarkdownRef = ref(null);
const articleEditorImageInputRef = ref(null);
const articleEditorImageModalOpen = ref(false);
const articleEditorImageFiles = ref([]);
const articleEditorImageSelection = ref({ start: 0, end: 0 });
const articleEditorImageDragActive = ref(false);

const userPanelTabs = [
  { id: "overview", label: "数据看板", icon: "mdi:view-dashboard-outline" },
  { id: "articles", label: "我的文章", icon: "mdi:file-document-edit-outline" },
  { id: "favorites", label: "我的收藏", icon: "mdi:bookmark-outline" },
  { id: "social", label: "社交互动", icon: "mdi:comment-account-outline" },
  { id: "security", label: "安全设置", icon: "mdi:shield-check-outline" }
];

const userPanelArticleRows = [
  { title: "投稿功能接入后显示文章标题", category: "未选择", status: "草稿", views: "--", date: "--" },
  { title: "提交审核后显示审核进度", category: "分类", status: "待审核", views: "--", date: "--" },
  { title: "审核通过后进入公开阅读页", category: "分类", status: "已发布", views: "--", date: "--" },
  { title: "未通过文章可修改后重新提交", category: "分类", status: "未通过", views: "--", date: "--" }
];

const ADMIN_CATEGORY_COLORS = ["#3b82f6", "#ff6b35", "#a855f7", "#22c55e", "#f59e0b", "#14b8a6"];

const adminTabs = [
  {
    id: "overview",
    label: "站点概览",
    icon: "mdi:chart-box-outline"
  },
  {
    id: "users",
    label: "用户管理",
    icon: "mdi:account-group-outline"
  },
  {
    id: "review",
    label: "内容审核",
    icon: "mdi:shield-check-outline"
  },
  {
    id: "taxonomy",
    label: "分类标签",
    icon: "mdi:tag-outline"
  }
];

const adminUserRows = [
  {
    username: "fuck",
    email: "fuck@example.com",
    createdAt: "2024-01-15",
    status: "正常",
    color: "#f97316"
  },
  {
    username: "张三",
    email: "zhangsan@example.com",
    createdAt: "2024-03-20",
    status: "正常",
    color: "#3b82f6"
  },
  {
    username: "李四",
    email: "lisi@example.com",
    createdAt: "2024-05-10",
    status: "已禁用",
    color: "#a855f7"
  },
  {
    username: "王五",
    email: "wangwu@example.com",
    createdAt: "2024-06-05",
    status: "正常",
    color: "#22c55e"
  },
  {
    username: "赵六",
    email: "zhaoliu@example.com",
    createdAt: "2024-07-18",
    status: "已禁用",
    color: "#ef4444"
  },
  {
    username: "孙七",
    email: "sunqi@example.com",
    createdAt: "2024-08-22",
    status: "正常",
    color: "#14b8a6"
  }
];

const adminReviewArticles = [
  {
    title: "如何搭建个人博客网站",
    author: "张三",
    submittedAt: "2026-05-30 14:23"
  },
  {
    title: "Vue3 vs React：2026 年前端框架对比",
    author: "李四",
    submittedAt: "2026-05-29 09:15"
  },
  {
    title: "我的旅行日记：云南大理深度游",
    author: "王五",
    submittedAt: "2026-05-28 16:42"
  }
];

const adminRiskComments = [
  {
    content: "加微信 xxx123 免费领取教程，限时分享内部资料，大家快来。",
    author: "周八",
    article: "2025年度总结",
    createdAt: "2026-05-28 22:15",
    reason: "疑似广告推广",
    keywords: ["加微信", "免费领取"]
  },
  {
    content: "这段评论引发了争议话题讨论，建议管理员先确认上下文后再放行。",
    author: "孙七",
    article: "Spring Boot 实战教程",
    createdAt: "2026-05-29 11:30",
    reason: "敏感话题",
    keywords: ["争议话题"]
  },
  {
    content: "内容里包含攻击性表达和不适合公开展示的词汇，需要人工复核。",
    author: "赵六",
    article: "React 入门指南",
    createdAt: "2026-05-30 18:05",
    reason: "敏感词汇",
    keywords: ["攻击性表达"]
  }
];

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

const articleEditorForm = reactive({
  title: "",
  categoryName: "",
  tagNamesText: "Vue, Markdown",
  tagInput: "",
  seoTitle: "",
  seoKeywords: "",
  seoDescription: "",
  allowComments: true,
  pinned: false,
  contentMarkdown: ""
});

const imageForm = reactive({
  altText: ""
});

const commentForm = reactive({
  content: "",
  parentId: null,
  replyToCommentId: null
});

const isAuthenticated = computed(() => Boolean(token.value && currentUser.value));
const isAdmin = computed(() => currentUser.value?.role === "ADMIN");
const isDarkMode = computed(() => themeMode.value === "dark");
const roleLabel = computed(() => (isAdmin.value ? "管理员" : "普通用户"));
const isUserPanelView = computed(() => view.value === "dashboard" && isAuthenticated.value && !isAdmin.value);
const isArticleEditorView = computed(() => view.value === "articleEditor" && isAuthenticated.value && !isAdmin.value);
const currentUserInitial = computed(() => (currentUser.value?.username || "?")[0]?.toUpperCase() || "?");
const userPanelActiveTitle = computed(() => userPanelTabs.find((tab) => tab.id === userPanelActiveTab.value)?.label || "用户面板");
const userPanelStats = computed(() => [
  {
    label: "站内文章",
    value: formatCompactNumber(publishedArticles.value.length),
    note: "当前已发布",
    icon: "mdi:file-document-multiple-outline",
    tone: "orange"
  },
  {
    label: "站内阅读",
    value: formatCompactNumber(siteSummary.value.totalViews),
    note: "真实统计",
    icon: "mdi:eye-outline",
    tone: "blue"
  },
  {
    label: "站内点赞",
    value: formatCompactNumber(siteSummary.value.totalLikes),
    note: "真实统计",
    icon: "mdi:heart-outline",
    tone: "rose"
  },
  {
    label: "站内收藏",
    value: formatCompactNumber(siteSummary.value.totalFavorites),
    note: "真实统计",
    icon: "mdi:bookmark-outline",
    tone: "purple"
  }
]);
const userPanelCategoryStats = computed(() => {
  const counts = new Map();

  for (const article of publishedArticles.value) {
    const categoryName = article.category?.name || "未分类";
    counts.set(categoryName, (counts.get(categoryName) || 0) + 1);
  }

  return Array.from(counts, ([name, count]) => ({
    name,
    count
  })).slice(0, 4);
});
const articleEditorTags = computed(() => tagTextToArray(articleEditorForm.tagNamesText));
const articleEditorWordCount = computed(() => String(articleEditorForm.contentMarkdown || "").trim().length);
const articleEditorLineCount = computed(() => {
  const content = String(articleEditorForm.contentMarkdown || "");
  return content ? content.split(/\r?\n/).length : 1;
});
const articleEditorImageUploadDisabled = computed(() => uploadingImage.value || articleEditorImageFiles.value.length === 0);
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
const isSelectedArticleLiked = computed(() => Boolean(selectedArticle.value?.stats?.likedByMe));
const isSelectedArticleFavorited = computed(() => Boolean(selectedArticle.value?.stats?.favoritedByMe));
const commentTotalCount = computed(() =>
  comments.value.reduce((total, comment) => total + 1 + (comment.replies?.length || 0), 0)
);
const selectedArticleStats = computed(() => ({
  views: formatCompactNumber(selectedArticle.value?.stats?.viewCount || 0),
  likes: formatCompactNumber(selectedArticle.value?.stats?.likeCount || 0),
  comments: formatCompactNumber(commentTotalCount.value)
}));
const authorStats = computed(() => ({
  articles: publishedArticles.value.length,
  followers: "1.2k",
  likes: formatCompactNumber(
    publishedArticles.value
      .filter((article) => article.author?.id && article.author.id === selectedArticle.value?.author?.id)
      .reduce((total, article) => total + Number(article.stats?.likeCount || 0), 0)
  )
}));
const adminSummaryCards = computed(() => [
  {
    label: "注册账号",
    value: adminOverview.value.summary.userCount,
    icon: "mdi:account-group-outline",
    tone: "blue"
  },
  {
    label: "文章总数",
    value: adminOverview.value.summary.articleCount || adminArticles.value.length || publishedArticles.value.length,
    icon: "mdi:file-document-outline",
    tone: "orange"
  },
  {
    label: "评论总数",
    value: adminOverview.value.summary.commentCount,
    icon: "mdi:comment-text-outline",
    tone: "green"
  },
  {
    label: "今日访问",
    value: adminOverview.value.summary.todayVisits || siteSummary.value.todayVisits,
    icon: "mdi:eye-outline",
    tone: "purple"
  }
]);
const adminCategoryStats = computed(() => {
  const categoryCounts = new Map();

  for (const article of publishedArticles.value) {
    const categoryName = article.category?.name || "未分类";
    categoryCounts.set(categoryName, (categoryCounts.get(categoryName) || 0) + 1);
  }

  if (categoryCounts.size === 0) {
    return categories.value.slice(0, 5).map((category, index) => ({
      name: category.name,
      value: 0,
      color: ADMIN_CATEGORY_COLORS[index % ADMIN_CATEGORY_COLORS.length]
    }));
  }

  return Array.from(categoryCounts.entries()).map(([name, value], index) => ({
    name,
    value,
    color: ADMIN_CATEGORY_COLORS[index % ADMIN_CATEGORY_COLORS.length]
  }));
});
const adminTagStats = computed(() =>
  tags.value.map((tag, index) => ({
    ...tag,
    color: ADMIN_CATEGORY_COLORS[index % ADMIN_CATEGORY_COLORS.length]
  }))
);
const adminPageTitle = computed(() => adminTabs.find((tab) => tab.id === adminActiveTab.value)?.label || "站点概览");
const adminPageSubtitle = computed(() => {
  const subtitles = {
    overview: "博客运营数据一览",
    users: "管理所有注册用户",
    review: "审核用户提交的文章和风险评论",
    taxonomy: "管理文章分类和标签"
  };

  return subtitles[adminActiveTab.value] || "";
});

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

function getVisitorId() {
  let visitorId = localStorage.getItem(VISITOR_STORAGE_KEY);

  if (!visitorId) {
    visitorId = crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(VISITOR_STORAGE_KEY, visitorId);
  }

  return visitorId;
}

function formatCompactNumber(value) {
  const number = Number(value) || 0;

  if (number >= 10000) {
    return `${(number / 10000).toFixed(number >= 100000 ? 0 : 1).replace(/\.0$/, "")}w`;
  }

  if (number >= 1000) {
    return `${(number / 1000).toFixed(number >= 10000 ? 0 : 1).replace(/\.0$/, "")}k`;
  }

  return new Intl.NumberFormat("zh-CN").format(number);
}

function rawStatNumber(value) {
  return Number(value) || 0;
}

function mergeArticleStats(targetArticle, sourceArticle) {
  if (!targetArticle || !sourceArticle?.stats) {
    return targetArticle;
  }

  return {
    ...targetArticle,
    stats: {
      ...(targetArticle.stats || {}),
      ...sourceArticle.stats
    }
  };
}

function replaceArticleInList(article) {
  if (!article?.id) {
    return;
  }

  publishedArticles.value = publishedArticles.value.map((item) =>
    item.id === article.id ? mergeArticleStats(item, article) : item
  );
  popularArticles.value = popularArticles.value.map((item) =>
    item.id === article.id ? mergeArticleStats(item, article) : item
  );

  if (selectedArticle.value?.id === article.id) {
    selectedArticle.value = mergeArticleStats(selectedArticle.value, article);
  }
}

function optimisticSelectedArticleStats(patch) {
  if (!selectedArticle.value) {
    return null;
  }

  const previousArticle = selectedArticle.value;
  selectedArticle.value = {
    ...selectedArticle.value,
    stats: {
      ...(selectedArticle.value.stats || {}),
      ...patch
    }
  };
  replaceArticleInList(selectedArticle.value);
  return previousArticle;
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

function requireLoginForArticleAction() {
  if (isAuthenticated.value) {
    return true;
  }

  returnArticleSlugAfterLogin.value = selectedArticleSlug.value;
  setMessage("请先登录后再操作。");
  authMode.value = "login";
  setHash("login");
  return false;
}

function requireLoginForCommentAction() {
  if (isAuthenticated.value) {
    return true;
  }

  returnArticleSlugAfterLogin.value = selectedArticleSlug.value;
  setMessage("请先登录后再操作。");
  authMode.value = "login";
  setHash("login");
  return false;
}

function resetCommentForm() {
  commentForm.content = "";
  commentForm.parentId = null;
  commentForm.replyToCommentId = null;
  activeReplyTarget.value = null;
}

function getReplyContext(comment, reply = null) {
  const target = reply || comment;

  return {
    parentId: comment.id,
    replyToCommentId: target.id,
    username: target.user?.username || "用户"
  };
}

function startReply(comment, reply = null) {
  if (!requireLoginForCommentAction()) {
    return;
  }

  activeReplyTarget.value = getReplyContext(comment, reply);
  commentForm.parentId = activeReplyTarget.value.parentId;
  commentForm.replyToCommentId = activeReplyTarget.value.replyToCommentId;
  commentForm.content = "";
}

function cancelReply() {
  resetCommentForm();
}

function isReplyingTo(comment, reply = null) {
  const targetId = reply?.id || comment.id;

  return (
    activeReplyTarget.value?.parentId === comment.id &&
    activeReplyTarget.value?.replyToCommentId === targetId
  );
}

function visibleReplies(comment) {
  if (expandedReplyCommentIds.value.has(comment.id)) {
    return comment.replies || [];
  }

  return (comment.replies || []).slice(0, DEFAULT_VISIBLE_REPLY_COUNT);
}

function hiddenReplyCount(comment) {
  return Math.max(0, (comment.replies?.length || 0) - DEFAULT_VISIBLE_REPLY_COUNT);
}

function toggleReplies(comment) {
  const nextExpandedIds = new Set(expandedReplyCommentIds.value);

  if (nextExpandedIds.has(comment.id)) {
    nextExpandedIds.delete(comment.id);
  } else {
    nextExpandedIds.add(comment.id);
  }

  expandedReplyCommentIds.value = nextExpandedIds;
}

function patchComment(commentId, patch) {
  comments.value = comments.value.map((comment) =>
    comment.id === commentId
      ? {
          ...comment,
          ...patch
        }
      : comment
  );
}

function isMyComment(comment) {
  return Boolean(currentUser.value?.id && comment.userId === currentUser.value.id);
}

async function likeArticle() {
  if (!selectedArticleSlug.value) {
    return;
  }

  if (!requireLoginForArticleAction()) {
    return;
  }

  const wasLiked = isSelectedArticleLiked.value;
  const currentLikeCount = rawStatNumber(selectedArticle.value?.stats?.likeCount);
  const previousArticle = optimisticSelectedArticleStats({
    likedByMe: !wasLiked,
    likeCount: Math.max(0, currentLikeCount + (wasLiked ? -1 : 1))
  });

  try {
    const payload = await apiFetch(`/articles/${encodeURIComponent(selectedArticleSlug.value)}/likes`, {
      method: wasLiked ? "DELETE" : "POST"
    });
    replaceArticleInList(payload.article);
    setMessage(wasLiked ? "已取消点赞。" : "已收到你的点赞。");
    await Promise.all([loadSiteSummary(), loadPopularArticles()]);
  } catch (error) {
    if (previousArticle) {
      selectedArticle.value = previousArticle;
      replaceArticleInList(previousArticle);
    }
    if (error.message !== "UNAUTHORIZED") {
      setMessage(error.message);
    }
  }
}

async function favoriteArticle() {
  if (!selectedArticleSlug.value) {
    return;
  }

  if (!requireLoginForArticleAction()) {
    return;
  }

  const wasFavorited = isSelectedArticleFavorited.value;
  const currentFavoriteCount = rawStatNumber(selectedArticle.value?.stats?.favoriteCount);
  const previousArticle = optimisticSelectedArticleStats({
    favoritedByMe: !wasFavorited,
    favoriteCount: Math.max(0, currentFavoriteCount + (wasFavorited ? -1 : 1))
  });

  try {
    const payload = await apiFetch(`/articles/${encodeURIComponent(selectedArticleSlug.value)}/favorites`, {
      method: wasFavorited ? "DELETE" : "POST"
    });
    replaceArticleInList(payload.article);
    setMessage(wasFavorited ? "已取消收藏。" : "文章已加入收藏。");
    await loadPopularArticles();
  } catch (error) {
    if (previousArticle) {
      selectedArticle.value = previousArticle;
      replaceArticleInList(previousArticle);
    }
    if (error.message !== "UNAUTHORIZED") {
      setMessage(error.message);
    }
  }
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

  if (["article/new", "article-edit/new", "articleedit/new"].includes(hash)) {
    return {
      viewName: "articleEditor",
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

async function loadSiteSummary() {
  try {
    const payload = await apiFetch("/articles/stats/summary");
    siteSummary.value = payload.summary;
  } catch (error) {
    if (error.message !== "UNAUTHORIZED") {
      setMessage(error.message);
    }
  }
}

async function loadPopularArticles() {
  try {
    const payload = await apiFetch("/articles/popular?limit=3");
    popularArticles.value = payload.articles;
  } catch (error) {
    if (error.message !== "UNAUTHORIZED") {
      setMessage(error.message);
    }
  }
}

async function recordHomeVisit() {
  try {
    await apiFetch("/articles/site-visits", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Visitor-Id": getVisitorId()
      },
      body: JSON.stringify({
        pageType: "home",
        visitorId: getVisitorId()
      })
    });
    await loadSiteSummary();
  } catch (error) {
    if (error.message !== "UNAUTHORIZED") {
      setMessage(error.message);
    }
  }
}

async function recordArticleView(slug) {
  if (!slug) {
    return;
  }

  try {
    const payload = await apiFetch(`/articles/${encodeURIComponent(slug)}/views`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Visitor-Id": getVisitorId()
      },
      body: JSON.stringify({
        visitorId: getVisitorId()
      })
    });
    replaceArticleInList(payload.article);
    await loadSiteSummary();
  } catch (error) {
    if (error.message !== "UNAUTHORIZED") {
      setMessage(error.message);
    }
  }
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
    resetCommentForm();
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
    await recordArticleView(payload.article.slug);
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

  if ((viewName === "dashboard" || viewName === "articleEditor") && !isAuthenticated.value) {
    view.value = "public";
    return;
  }

  if (viewName === "articleEditor" && isAdmin.value) {
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

  if (viewName !== "dashboard") {
    userPanelMobileNavOpen.value = false;
  }

  if (viewName !== "articleEditor") {
    articleEditorSettingsOpen.value = false;
    articleEditorSettingsCollapsed.value = false;
    articleEditorMoreMenuOpen.value = false;
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

async function refreshPublicStats() {
  await Promise.all([loadSiteSummary(), loadPopularArticles()]);
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

async function loadAdminOverview() {
  if (!isAdmin.value) {
    adminOverview.value = {
      summary: {
        userCount: 0,
        articleCount: 0,
        commentCount: 0,
        todayVisits: 0
      },
      visitTrend: []
    };
    return;
  }

  adminOverviewLoading.value = true;

  try {
    const payload = await apiFetch("/articles/admin/overview");
    adminOverview.value = payload;
    await nextTick();
    renderAdminCharts();
  } catch (error) {
    if (error.message !== "UNAUTHORIZED") {
      setMessage(error.message);
    }
  } finally {
    adminOverviewLoading.value = false;
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
      await Promise.all([loadAdminArticles(), loadAdminOverview()]);
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
    const returnSlug = returnArticleSlugAfterLogin.value;
    setMessage(`欢迎回来，${payload.user.username}。`);
    await loadProfile();
    await Promise.all([loadPublishedArticles(), loadPopularArticles()]);
    if (returnSlug) {
      returnArticleSlugAfterLogin.value = "";
      setHash(`article/${encodeURIComponent(returnSlug)}`);
    } else {
      setHash("");
    }
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

function setUserPanelTab(tabId) {
  userPanelActiveTab.value = tabId;
  userPanelMobileNavOpen.value = false;
}

function toggleUserPanelMobileNav() {
  userPanelMobileNavOpen.value = !userPanelMobileNavOpen.value;
}

function closeUserPanelMobileNav() {
  userPanelMobileNavOpen.value = false;
}

function showUserPanelPlaceholder(featureName) {
  setMessage(`${featureName}后续接入。`);
}

function showArticleEditorPlaceholder(featureName) {
  articleEditorMoreMenuOpen.value = false;
  setMessage(`${featureName}后续接入投稿审核流程。`);
}

function focusArticleEditorTextarea(selectionStart = null, selectionEnd = null) {
  nextTick(() => {
    const textarea = articleEditorMarkdownRef.value;

    if (!textarea) {
      return;
    }

    textarea.focus();
    if (selectionStart !== null && selectionEnd !== null) {
      textarea.setSelectionRange(selectionStart, selectionEnd);
    }
    syncArticleEditorTextareaHeight();
  });
}

function replaceArticleEditorSelection(text, selectionStart = null, selectionEnd = null) {
  const textarea = articleEditorMarkdownRef.value;
  const currentValue = articleEditorForm.contentMarkdown || "";
  const start = textarea?.selectionStart ?? articleEditorImageSelection.value.start ?? currentValue.length;
  const end = textarea?.selectionEnd ?? articleEditorImageSelection.value.end ?? start;
  const nextText = String(text || "");

  articleEditorForm.contentMarkdown = `${currentValue.slice(0, start)}${nextText}${currentValue.slice(end)}`;
  const nextSelectionStart = selectionStart === null ? start + nextText.length : start + selectionStart;
  const nextSelectionEnd = selectionEnd === null ? nextSelectionStart : start + selectionEnd;
  focusArticleEditorTextarea(nextSelectionStart, nextSelectionEnd);
}

function selectedArticleEditorText(fallback = "") {
  const textarea = articleEditorMarkdownRef.value;
  const currentValue = articleEditorForm.contentMarkdown || "";

  if (!textarea) {
    return fallback;
  }

  const selectedText = currentValue.slice(textarea.selectionStart, textarea.selectionEnd);
  return selectedText || fallback;
}

function normalizeMarkdownBlockInsertion(markdown) {
  const textarea = articleEditorMarkdownRef.value;
  const currentValue = articleEditorForm.contentMarkdown || "";
  const start = textarea?.selectionStart ?? articleEditorImageSelection.value.start ?? currentValue.length;
  const before = currentValue.slice(0, start);
  const after = currentValue.slice(textarea?.selectionEnd ?? articleEditorImageSelection.value.end ?? start);
  const prefix = before && !before.endsWith("\n") ? "\n\n" : before.endsWith("\n\n") || !before ? "" : "\n";
  const suffix = after && !after.startsWith("\n") ? "\n\n" : "";

  return {
    text: `${prefix}${markdown}${suffix}`,
    contentOffset: prefix.length
  };
}

function insertArticleEditorInline({ before = "", after = "", placeholder = "文本" }) {
  articleEditorMoreMenuOpen.value = false;
  const selection = selectedArticleEditorText(placeholder);
  const text = `${before}${selection}${after}`;
  const selectedStart = before.length;
  const selectedEnd = before.length + selection.length;
  replaceArticleEditorSelection(text, selectedStart, selectedEnd);
}

function insertArticleEditorBlock(markdown, selectStart = null, selectEnd = null) {
  articleEditorMoreMenuOpen.value = false;
  const block = normalizeMarkdownBlockInsertion(markdown);
  replaceArticleEditorSelection(
    block.text,
    selectStart === null ? null : block.contentOffset + selectStart,
    selectEnd === null ? null : block.contentOffset + selectEnd
  );
}

function insertArticleEditorHeading(level = 1) {
  const headingLevel = Math.min(Math.max(Number(level) || 1, 1), 6);
  const selection = selectedArticleEditorText("标题");
  const markdown = `${"#".repeat(headingLevel)} ${selection}`;
  insertArticleEditorBlock(markdown, headingLevel + 1, headingLevel + 1 + selection.length);
}

function insertArticleEditorQuote() {
  const selection = selectedArticleEditorText("引用内容");
  const markdown = selection
    .split(/\r?\n/)
    .map((line) => `> ${line || " "}`)
    .join("\n");
  insertArticleEditorBlock(markdown, 2, 2 + selection.length);
}

function insertArticleEditorCode() {
  const selection = selectedArticleEditorText("code");

  if (selection.includes("\n")) {
    insertArticleEditorBlock(`\`\`\`\n${selection}\n\`\`\``, 4, 4 + selection.length);
    return;
  }

  insertArticleEditorInline({ before: "`", after: "`", placeholder: "code" });
}

function insertArticleEditorList(ordered = false) {
  const selection = selectedArticleEditorText(ordered ? "第一项\n第二项" : "列表项\n列表项");
  const lines = selection.split(/\r?\n/);
  const markdown = lines
    .map((line, index) => `${ordered ? `${index + 1}.` : "-"} ${line || "列表项"}`)
    .join("\n");
  const firstMarkerLength = ordered ? 3 : 2;
  insertArticleEditorBlock(markdown, firstMarkerLength, firstMarkerLength + (lines[0] || "列表项").length);
}

function insertArticleEditorLink() {
  const selection = selectedArticleEditorText("链接文本");
  const url = "https://example.com";
  const markdown = `[${selection}](${url})`;
  replaceArticleEditorSelection(markdown, selection.length + 3, selection.length + 3 + url.length);
}

function insertArticleEditorDivider() {
  insertArticleEditorBlock("---");
}

function insertArticleEditorTable() {
  const markdown = [
    "| 列 1 | 列 2 |",
    "| --- | --- |",
    "| 内容 | 内容 |"
  ].join("\n");
  insertArticleEditorBlock(markdown, 2, 5);
}

function insertArticleEditorMath() {
  const formula = "E = mc^2";
  insertArticleEditorBlock(`$$\n${formula}\n$$`, 3, 3 + formula.length);
}

function clearArticleEditorFormatting() {
  articleEditorMoreMenuOpen.value = false;
  const textarea = articleEditorMarkdownRef.value;
  const currentValue = articleEditorForm.contentMarkdown || "";

  if (!textarea || textarea.selectionStart === textarea.selectionEnd) {
    setMessage("请先选择要清除格式的文字。");
    focusArticleEditorTextarea();
    return;
  }

  const selectedText = currentValue.slice(textarea.selectionStart, textarea.selectionEnd);
  const plainText = selectedText
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/^\s*(?:[-*+]|\d+\.)\s+/gm, "")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/(`{1,3})([\s\S]*?)\1/g, "$2")
    .replace(/(\*\*|__)([\s\S]*?)\1/g, "$2")
    .replace(/(\*|_)([\s\S]*?)\1/g, "$2")
    .replace(/~~([\s\S]*?)~~/g, "$1");

  replaceArticleEditorSelection(plainText, 0, plainText.length);
}

function formatArticleEditorFileSize(size) {
  const bytes = Number(size) || 0;

  if (bytes >= 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(1).replace(/\.0$/, "")} MB`;
  }

  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function rememberArticleEditorSelection() {
  const textarea = articleEditorMarkdownRef.value;
  const length = (articleEditorForm.contentMarkdown || "").length;

  articleEditorImageSelection.value = {
    start: textarea?.selectionStart ?? length,
    end: textarea?.selectionEnd ?? textarea?.selectionStart ?? length
  };
}

function openArticleEditorImageModal() {
  articleEditorMoreMenuOpen.value = false;
  rememberArticleEditorSelection();
  articleEditorImageModalOpen.value = true;
}

function closeArticleEditorImageModal() {
  if (uploadingImage.value) {
    return;
  }

  articleEditorImageModalOpen.value = false;
  articleEditorImageDragActive.value = false;
  articleEditorImageFiles.value = [];
}

function chooseArticleEditorImages() {
  articleEditorImageInputRef.value?.click();
}

function addArticleEditorImageFiles(fileList) {
  const nextFiles = Array.from(fileList || []).filter((file) => file.type.startsWith("image/"));

  if (nextFiles.length === 0) {
    setMessage("请选择图片文件。");
    return;
  }

  articleEditorImageFiles.value = [...articleEditorImageFiles.value, ...nextFiles].slice(0, 20);
}

function handleArticleEditorImageInput(event) {
  addArticleEditorImageFiles(event.target.files);
  event.target.value = "";
}

function handleArticleEditorImageDrop(event) {
  articleEditorImageDragActive.value = false;
  addArticleEditorImageFiles(event.dataTransfer?.files);
}

function removeArticleEditorImageFile(index) {
  articleEditorImageFiles.value = articleEditorImageFiles.value.filter((_file, fileIndex) => fileIndex !== index);
}

function insertArticleEditorImageMarkdown(markdownItems) {
  const markdown = markdownItems.filter(Boolean).join("\n");

  if (!markdown) {
    return;
  }

  const currentValue = articleEditorForm.contentMarkdown || "";
  const start = articleEditorImageSelection.value.start ?? currentValue.length;
  const end = articleEditorImageSelection.value.end ?? start;
  const before = currentValue.slice(0, start);
  const after = currentValue.slice(end);
  const prefix = before && !before.endsWith("\n") ? "\n\n" : before.endsWith("\n\n") || !before ? "" : "\n";
  const suffix = after && !after.startsWith("\n") ? "\n\n" : "";
  const insertedText = `${prefix}${markdown}${suffix}`;

  articleEditorForm.contentMarkdown = `${before}${insertedText}${after}`;
  articleEditorImageModalOpen.value = false;
  articleEditorImageFiles.value = [];
  focusArticleEditorTextarea(start + insertedText.length, start + insertedText.length);
}

async function uploadArticleEditorImages() {
  if (articleEditorImageUploadDisabled.value) {
    return;
  }

  uploadingImage.value = true;
  setMessage("");

  try {
    const formData = new FormData();

    for (const file of articleEditorImageFiles.value) {
      formData.append("images", file);
    }

    const payload = await apiFetch("/articles/uploads/images", {
      method: "POST",
      body: formData
    });
    insertArticleEditorImageMarkdown((payload.images || []).map((image) => image.markdown));
    setMessage(`已上传 ${payload.images?.length || 0} 张图片并插入 Markdown。`);
  } catch (error) {
    if (error.message !== "UNAUTHORIZED") {
      setMessage(error.message);
    }
  } finally {
    uploadingImage.value = false;
  }
}

function openArticleEditor() {
  setHash("article/new");
}

function closeArticleEditorSettings() {
  articleEditorSettingsOpen.value = false;
}

function toggleArticleEditorSettings() {
  articleEditorSettingsOpen.value = !articleEditorSettingsOpen.value;
}

function toggleArticleEditorSettingsCollapsed() {
  articleEditorSettingsCollapsed.value = !articleEditorSettingsCollapsed.value;
  articleEditorSettingsOpen.value = false;
}

function openArticleEditorSettingsPanel() {
  articleEditorSettingsCollapsed.value = false;
  articleEditorSettingsOpen.value = true;
}

function toggleArticleEditorMoreMenu() {
  articleEditorMoreMenuOpen.value = !articleEditorMoreMenuOpen.value;
}

function closeArticleEditorMoreMenu() {
  articleEditorMoreMenuOpen.value = false;
}

function syncArticleEditorTextareaHeight() {
  nextTick(() => {
    const textarea = articleEditorMarkdownRef.value;

    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  });
}

function toggleArticleEditorSeo() {
  articleEditorSeoOpen.value = !articleEditorSeoOpen.value;
}

function setArticleEditorCoverRatio(ratio) {
  articleEditorCoverRatio.value = ratio;
}

function addArticleEditorTag(tagName = articleEditorForm.tagInput) {
  const nextTag = String(tagName || "").trim();

  if (!nextTag) {
    return;
  }

  const nextTags = new Set(articleEditorTags.value);
  nextTags.add(nextTag);
  articleEditorForm.tagNamesText = Array.from(nextTags).join(", ");
  articleEditorForm.tagInput = "";
}

function removeArticleEditorTag(tagName) {
  articleEditorForm.tagNamesText = articleEditorTags.value
    .filter((tag) => tag !== tagName)
    .join(", ");
}

function userPanelArticleStatusClass(status) {
  return {
    草稿: "is-draft",
    待审核: "is-review",
    已发布: "is-published",
    未通过: "is-rejected"
  }[status] || "is-draft";
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

function openArticleEditorFromDashboard() {
  closeUserPanelMobileNav();
  openArticleEditor();
}

function openAdminDashboard() {
  if (!adminActiveTab.value) {
    adminActiveTab.value = "overview";
  }
  setHash("admin");
}

function openCreateArticle() {
  clearArticleForm();
  setHash("admin");
}

function setAdminTab(tabId) {
  if (adminActiveTab.value === "overview" && tabId !== "overview") {
    disposeAdminCharts();
  }

  adminActiveTab.value = tabId;
  adminMobileNavOpen.value = false;
  if (tabId === "overview") {
    nextTick(renderAdminCharts);
  }
}

function toggleAdminMobileNav() {
  adminMobileNavOpen.value = !adminMobileNavOpen.value;
}

function closeAdminMobileNav() {
  adminMobileNavOpen.value = false;
}

function showAdminPlaceholder(action) {
  setMessage(`${action}将在后续接入。`);
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

  if (!requireLoginForCommentAction()) {
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
    const parentId = commentForm.parentId;
    if (parentId) {
      expandedReplyCommentIds.value = new Set([...expandedReplyCommentIds.value, parentId]);
    }
    resetCommentForm();
    setMessage(parentId ? "回复已发布。" : "评论已发布。");
    await loadComments(selectedArticle.value.slug);
    await loadArticleDetail(selectedArticle.value.slug);
    await loadPopularArticles();
  } catch (error) {
    if (error.message !== "UNAUTHORIZED") {
      setMessage(error.message);
    }
  } finally {
    postingComment.value = false;
  }
}

async function likeComment(comment) {
  if (!requireLoginForCommentAction()) {
    return;
  }

  if (isMyComment(comment)) {
    setMessage("不能点赞自己的评论。");
    return;
  }

  const wasLiked = Boolean(comment.likedByMe);
  const previousComment = { ...comment };
  patchComment(comment.id, {
    likedByMe: !wasLiked,
    likeCount: Math.max(0, Number(comment.likeCount || 0) + (wasLiked ? -1 : 1))
  });

  try {
    const payload = await apiFetch(`/comments/${comment.id}/likes`, {
      method: wasLiked ? "DELETE" : "POST"
    });
    patchComment(comment.id, {
      likedByMe: payload.likedByMe,
      likeCount: payload.likeCount
    });
  } catch (error) {
    patchComment(comment.id, previousComment);
    if (error.message !== "UNAUTHORIZED") {
      setMessage(error.message);
    }
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
    if (selectedArticle.value?.slug) {
      await loadArticleDetail(selectedArticle.value.slug);
      await loadPopularArticles();
    }
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

function shouldRecordHomeVisit() {
  const { viewName, authMode: nextAuthMode } = parseHash();
  return viewName === "public" && !nextAuthMode;
}

function disposeAdminCharts() {
  if (adminVisitChartInstance) {
    adminVisitChartInstance.dispose();
    adminVisitChartInstance = null;
  }

  if (adminCategoryChartInstance) {
    adminCategoryChartInstance.dispose();
    adminCategoryChartInstance = null;
  }
}

function renderAdminCharts() {
  nextTick(() => {
    if (typeof echarts === "undefined" || view.value !== "admin" || adminActiveTab.value !== "overview") {
      return;
    }

    const visitEl = adminVisitChartRef.value;
    const categoryEl = adminCategoryChartRef.value;

    if (visitEl) {
      if (adminVisitChartInstance && adminVisitChartInstance.getDom() !== visitEl) {
        adminVisitChartInstance.dispose();
        adminVisitChartInstance = null;
      }

      if (!adminVisitChartInstance) {
        adminVisitChartInstance = echarts.init(visitEl);
      }

      const trend = adminOverview.value.visitTrend?.length
        ? adminOverview.value.visitTrend
        : [
            { label: "周一", value: 0 },
            { label: "周二", value: 0 },
            { label: "周三", value: 0 },
            { label: "周四", value: 0 },
            { label: "周五", value: 0 },
            { label: "周六", value: 0 },
            { label: "周日", value: 0 }
          ];

      adminVisitChartInstance.setOption({
        tooltip: {
          trigger: "axis",
          backgroundColor: "#ffffff",
          borderColor: "#ff6b35",
          borderWidth: 1,
          textStyle: {
            color: "#111827"
          }
        },
        grid: {
          left: 44,
          right: 20,
          top: 16,
          bottom: 34
        },
        xAxis: {
          type: "category",
          data: trend.map((item) => item.label),
          axisTick: {
            show: false
          },
          axisLine: {
            lineStyle: {
              color: "#e5e7eb"
            }
          },
          axisLabel: {
            color: "#9ca3af",
            fontSize: 12
          }
        },
        yAxis: {
          type: "value",
          minInterval: 1,
          splitLine: {
            lineStyle: {
              color: "#f1f5f9",
              type: "dashed"
            }
          },
          axisLabel: {
            color: "#9ca3af",
            fontSize: 12
          }
        },
        series: [
          {
            name: "访问设备",
            type: "bar",
            barWidth: "38%",
            data: trend.map((item) => item.value),
            itemStyle: {
              borderRadius: [9, 9, 0, 0],
              color: {
                type: "linear",
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: "#ff6b35" },
                  { offset: 1, color: "#ff9a6b" }
                ]
              }
            }
          }
        ]
      });
    }

    if (categoryEl) {
      if (adminCategoryChartInstance && adminCategoryChartInstance.getDom() !== categoryEl) {
        adminCategoryChartInstance.dispose();
        adminCategoryChartInstance = null;
      }

      if (!adminCategoryChartInstance) {
        adminCategoryChartInstance = echarts.init(categoryEl);
      }

      const categoriesForChart = adminCategoryStats.value.length
        ? adminCategoryStats.value
        : [{ name: "暂无分类", value: 1, color: "#e5e7eb" }];

      adminCategoryChartInstance.setOption({
        tooltip: {
          trigger: "item",
          backgroundColor: "#ffffff",
          borderColor: "#ff6b35",
          borderWidth: 1,
          textStyle: {
            color: "#111827"
          },
          formatter: "{b}: {c} 篇 ({d}%)"
        },
        legend: {
          bottom: 0,
          left: "center",
          itemWidth: 10,
          itemHeight: 10,
          textStyle: {
            color: "#64748b",
            fontSize: 12
          }
        },
        series: [
          {
            type: "pie",
            radius: ["48%", "72%"],
            center: ["50%", "45%"],
            avoidLabelOverlap: true,
            itemStyle: {
              borderRadius: 8,
              borderColor: "#ffffff",
              borderWidth: 4
            },
            label: {
              show: false
            },
            data: categoriesForChart.map((item) => ({
              value: item.value || 0,
              name: item.name,
              itemStyle: {
                color: item.color
              }
            }))
          }
        ]
      });
    }
  });
}

function resizeAdminCharts() {
  adminVisitChartInstance?.resize();
  adminCategoryChartInstance?.resize();
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
    if (shouldRecordHomeVisit()) {
      recordHomeVisit();
    }
  }

  if (newVal === "articleEditor") {
    syncArticleEditorTextareaHeight();
  }

  if (newVal === "admin") {
    nextTick(renderAdminCharts);
  } else {
    closeAdminMobileNav();
  }
});

watch(() => articleEditorForm.contentMarkdown, () => {
  if (isArticleEditorView.value) {
    syncArticleEditorTextareaHeight();
  }
});

watch([adminActiveTab, adminCategoryStats], () => {
  if (view.value === "admin" && adminActiveTab.value === "overview") {
    renderAdminCharts();
  }
});

onMounted(async () => {
  applyThemeMode();
  window.addEventListener("hashchange", handleHashChange);
  window.addEventListener("scroll", handleScroll, { passive: true });
  window.addEventListener("resize", resizeAdminCharts);
  await Promise.all([loadPublishedArticles(), loadArticleFilters(), refreshPublicStats()]);
  if (token.value) {
    await loadProfile();
  }
  if (!articleForm.id && articleForm.chapterOrder === 0) {
    articleForm.chapterOrder = nextArticleOrder.value;
  }
  syncViewToHash();
  if (view.value === "public" && shouldRecordHomeVisit()) {
    await recordHomeVisit();
  }
  initTrafficChart();
  handleScroll();
});

onBeforeUnmount(() => {
  window.removeEventListener("hashchange", handleHashChange);
  window.removeEventListener("scroll", handleScroll);
  window.removeEventListener("resize", resizeAdminCharts);
  disposeAdminCharts();
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
  <button
    v-if="isUserPanelView && userPanelMobileNavOpen"
    class="user-panel-overlay"
    type="button"
    aria-label="关闭用户面板导航"
    @click="closeUserPanelMobileNav"
  ></button>
  <button
    v-if="isArticleEditorView && articleEditorSettingsOpen"
    class="article-editor-overlay"
    type="button"
    aria-label="关闭文章设置"
    @click="closeArticleEditorSettings"
  ></button>
  <div
    v-if="isArticleEditorView && articleEditorImageModalOpen"
    class="article-editor-upload-overlay"
    role="presentation"
    @click.self="closeArticleEditorImageModal"
  >
    <section
      class="article-editor-upload-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="article-editor-upload-title"
    >
      <header>
        <h2 id="article-editor-upload-title">插入图片</h2>
        <button type="button" aria-label="关闭插入图片" @click="closeArticleEditorImageModal">
          <iconify-icon icon="mdi:close" width="32"></iconify-icon>
        </button>
      </header>
      <div class="article-editor-upload-body">
        <button
          class="article-editor-upload-dropzone"
          :class="{ 'is-dragging': articleEditorImageDragActive }"
          type="button"
          @click="chooseArticleEditorImages"
          @dragenter.prevent="articleEditorImageDragActive = true"
          @dragover.prevent="articleEditorImageDragActive = true"
          @dragleave.prevent="articleEditorImageDragActive = false"
          @drop.prevent="handleArticleEditorImageDrop"
        >
          <span>
            <iconify-icon icon="mdi:file-upload-outline" width="34"></iconify-icon>
          </span>
          <strong>选择或拖拽图片到此处</strong>
          <small>支持 JPG、PNG、GIF、WebP，单次最多 20 张</small>
        </button>
        <input
          ref="articleEditorImageInputRef"
          class="sr-only"
          type="file"
          accept="image/*"
          multiple
          @change="handleArticleEditorImageInput"
        />
        <div v-if="articleEditorImageFiles.length" class="article-editor-upload-list" aria-label="待上传图片">
          <article v-for="(file, index) in articleEditorImageFiles" :key="`${file.name}-${file.size}-${index}`">
            <iconify-icon icon="mdi:image-outline" width="24"></iconify-icon>
            <div>
              <strong>{{ file.name }}</strong>
              <small>{{ formatArticleEditorFileSize(file.size) }}</small>
            </div>
            <span>等待上传</span>
            <button type="button" aria-label="移除图片" @click="removeArticleEditorImageFile(index)">
              <iconify-icon icon="mdi:close" width="18"></iconify-icon>
            </button>
          </article>
        </div>
      </div>
      <footer>
        <button type="button" @click="closeArticleEditorImageModal">取消</button>
        <button
          class="article-editor-upload-submit"
          type="button"
          :disabled="articleEditorImageUploadDisabled"
          @click="uploadArticleEditorImages"
        >
          {{ uploadingImage ? "上传中..." : "上传并插入" }}
        </button>
      </footer>
    </section>
  </div>

  <!-- ===== 顶部导航栏 (新 UI) ===== -->
  <header
    v-if="!isUserPanelView && !isArticleEditorView"
    class="sticky top-0 z-50 w-full border-b"
    :class="view === 'article' ? 'article-detail-header bg-white/95 border-slate-200 backdrop-blur' : view === 'admin' ? 'admin-topbar' : 'glass-effect border-orange-100/50'"
  >
    <div :class="view === 'admin' ? 'admin-topbar-inner' : 'max-w-[1440px] mx-auto px-6 h-16 flex items-center justify-between'">
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

        <div v-if="view !== 'admin'" class="hidden md:flex items-center bg-slate-100 rounded-full px-4 py-1.5 w-96 border border-transparent focus-within:border-orange-300 focus-within:bg-white transition-all">
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

        <div :class="view === 'admin' ? 'admin-topbar-actions' : 'flex items-center gap-4'">
          <button
            :class="view === 'admin' ? 'admin-topbar-icon-action' : 'p-2 text-slate-500 hover:text-orange-500 dark:text-slate-300 dark:hover:text-orange-300 transition-colors'"
            :title="isDarkMode ? '切换到亮色模式' : '切换到暗色模式'"
            type="button"
            @click="toggleThemeMode"
          >
            <iconify-icon :icon="isDarkMode ? 'mdi:weather-sunny' : 'mdi:weather-night'" width="22"></iconify-icon>
          </button>
          <button v-if="isAuthenticated" :class="view === 'admin' ? 'admin-topbar-icon-action' : 'p-2 text-slate-500 hover:text-orange-500 transition-colors relative'" title="通知" type="button">
            <iconify-icon icon="mdi:bell-outline" width="22"></iconify-icon>
            <span :class="view === 'admin' ? 'admin-topbar-notice-dot' : 'absolute top-2 right-2 w-2 h-2 bg-orange-500 rounded-full border-2 border-white'"></span>
          </button>
          <div :class="view === 'admin' ? 'admin-topbar-divider' : 'h-8 w-[1px] bg-slate-200 mx-1'"></div>

          <!-- 未登录：显示登录/注册按钮 -->
          <template v-if="!isAuthenticated">
            <button :class="view === 'admin' ? 'admin-topbar-icon-action' : 'w-10 h-10 rounded-full bg-slate-100 hover:bg-orange-50 text-slate-500 hover:text-orange-500 flex items-center justify-center transition-all'" title="账户" type="button" @click="showLoginForm">
              <iconify-icon icon="mdi:account-outline" width="24"></iconify-icon>
            </button>
          </template>

          <!-- 已登录：显示用户头像 -->
          <template v-else>
            <div :class="view === 'admin' ? 'admin-topbar-account' : 'flex items-center gap-3 px-2 py-1.5 rounded-full bg-white border border-slate-100 shadow-sm cursor-pointer group relative hover:border-orange-200 hover:shadow-md transition-all'" @click="isAdmin ? openAdminDashboard() : openUserDashboard()">
              <div :class="view === 'admin' ? 'admin-topbar-avatar' : 'w-9 h-9 rounded-full bg-orange-100 overflow-hidden flex items-center justify-center text-orange-600 text-sm font-bold'">
                {{ (currentUser?.username || '?')[0].toUpperCase() }}
              </div>
              <div :class="view === 'admin' ? 'admin-topbar-account-text' : 'hidden sm:block pr-2 leading-tight'">
                <p class="text-sm font-bold text-slate-800 group-hover:text-orange-500 transition-colors">{{ currentUser?.username || '用户' }}</p>
                <p class="text-[10px] text-slate-400">{{ roleLabel }}</p>
              </div>
            </div>
          </template>
        </div>
      </template>
    </div>
  </header>

  <section v-if="isUserPanelView" class="user-panel-shell">
    <header class="user-panel-topbar">
      <div class="user-panel-brand">
        <button class="user-panel-menu-button" type="button" aria-label="打开用户面板导航" @click="toggleUserPanelMobileNav">
          <iconify-icon icon="mdi:menu" width="22"></iconify-icon>
        </button>
        <button class="user-panel-logo" type="button" @click="openPublicHome">
          <span class="brand-logo-mark compact">
            <iconify-icon icon="mdi:feather" width="24"></iconify-icon>
            <span class="brand-feather-fallback" aria-hidden="true"></span>
          </span>
          <span class="brand-logo-text compact">MyBlog <span>Pro</span></span>
        </button>
        <span class="user-panel-header-divider"></span>
        <button class="user-panel-return-link" type="button" @click="openPublicHome">
          <iconify-icon icon="mdi:arrow-left" width="20"></iconify-icon>
          <span>返回首页</span>
        </button>
      </div>
      <div class="user-panel-topbar-actions">
        <button
          class="user-panel-icon-action"
          :title="isDarkMode ? '切换到亮色模式' : '切换到暗色模式'"
          type="button"
          @click="toggleThemeMode"
        >
          <iconify-icon :icon="isDarkMode ? 'mdi:weather-sunny' : 'mdi:weather-night'" width="22"></iconify-icon>
        </button>
        <button class="user-panel-icon-action" type="button" title="通知" @click="showUserPanelPlaceholder('消息通知')">
          <iconify-icon icon="mdi:bell-outline" width="22"></iconify-icon>
          <span></span>
        </button>
        <div class="user-panel-account">
          <span class="user-panel-avatar">{{ currentUserInitial }}</span>
          <div>
            <strong>{{ currentUser?.username }}</strong>
            <small>{{ roleLabel }}</small>
          </div>
        </div>
      </div>
    </header>

    <div class="user-panel-frame">
      <aside class="user-panel-sidebar" :class="{ 'is-open': userPanelMobileNavOpen }">
        <div class="user-panel-sidebar-profile">
          <span class="user-panel-avatar large">{{ currentUserInitial }}</span>
          <div>
            <strong>{{ currentUser?.username }}</strong>
            <small>{{ roleLabel }} · {{ currentSession?.deviceId || '未知设备' }}</small>
          </div>
        </div>
        <nav class="user-panel-nav" aria-label="用户面板导航">
          <button
            v-for="tab in userPanelTabs"
            :key="tab.id"
            :class="{ 'is-active': userPanelActiveTab === tab.id }"
            type="button"
            @click="setUserPanelTab(tab.id)"
          >
            <iconify-icon :icon="tab.icon" width="22"></iconify-icon>
            <span>{{ tab.label }}</span>
          </button>
        </nav>
        <button class="user-panel-sidebar-logout" :disabled="submitLoading" type="button" @click="logout">
          <iconify-icon icon="mdi:logout" width="20"></iconify-icon>
          <span>退出登录</span>
        </button>
      </aside>

      <main class="user-panel-main">
        <div class="user-panel-page-head">
          <div>
            <h1>{{ userPanelActiveTitle }}</h1>
          </div>
          <button class="user-panel-primary-action" type="button" @click="openArticleEditorFromDashboard">
            <iconify-icon icon="mdi:plus" width="20"></iconify-icon>
            <span>发布新文章</span>
          </button>
        </div>

        <section v-if="userPanelActiveTab === 'overview'" class="user-panel-tab">
          <div class="user-panel-stat-grid">
            <article v-for="stat in userPanelStats" :key="stat.label" class="user-panel-stat-card" :class="`tone-${stat.tone}`">
              <div>
                <span>
                  <iconify-icon :icon="stat.icon" width="24"></iconify-icon>
                </span>
                <small>{{ stat.note }}</small>
              </div>
              <p>{{ stat.label }}</p>
              <strong>{{ stat.value }}</strong>
            </article>
          </div>

          <div class="user-panel-chart-grid">
            <article class="user-panel-card user-panel-chart-card">
              <div class="user-panel-card-head">
                <div>
                  <h2>近 7 日阅读趋势</h2>
                  <p>后续接入 ECharts 折线图，当前为 CSS 占位。</p>
                </div>
              </div>
              <!-- TODO: 后续用 ECharts 接入真实近 7 日阅读趋势数据。 -->
              <div class="user-panel-line-chart" aria-label="近 7 日阅读趋势占位图">
                <span style="height: 34%"></span>
                <span style="height: 58%"></span>
                <span style="height: 44%"></span>
                <span style="height: 72%"></span>
                <span style="height: 52%"></span>
                <span style="height: 78%"></span>
                <span style="height: 66%"></span>
              </div>
            </article>
            <article class="user-panel-card user-panel-category-card">
              <div class="user-panel-card-head">
                <div>
                  <h2>文章分类分布</h2>
                  <p>后续接入 ECharts 环形图，当前为 CSS 占位。</p>
                </div>
              </div>
              <!-- TODO: 后续用 ECharts 接入真实文章分类分布数据。 -->
              <div class="user-panel-donut" aria-label="文章分类分布占位图"></div>
              <div class="user-panel-category-list">
                <p v-if="userPanelCategoryStats.length === 0">暂无分类数据</p>
                <div v-for="item in userPanelCategoryStats" :key="item.name">
                  <span></span>
                  <strong>{{ item.name }}</strong>
                  <small>{{ item.count }} 篇</small>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section v-else-if="userPanelActiveTab === 'articles'" class="user-panel-tab">
          <div class="user-panel-card">
            <div class="user-panel-card-head">
              <div>
                <h2>我的文章</h2>
                <p>未来注册用户可写文章，状态流转为草稿、待审核、已发布、未通过。</p>
              </div>
              <button type="button" @click="showUserPanelPlaceholder('文章筛选')">
                <iconify-icon icon="mdi:tune-variant" width="20"></iconify-icon>
              </button>
            </div>
            <div class="user-panel-table-wrap">
              <table class="user-panel-table">
                <thead>
                  <tr>
                    <th>文章标题</th>
                    <th>分类</th>
                    <th>状态</th>
                    <th>阅读量</th>
                    <th>更新时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="article in userPanelArticleRows" :key="article.title">
                    <td>
                      <div class="user-panel-article-title">
                        <span><iconify-icon icon="mdi:file-document-outline" width="20"></iconify-icon></span>
                        <strong>{{ article.title }}</strong>
                      </div>
                    </td>
                    <td>{{ article.category }}</td>
                    <td><span class="user-panel-status" :class="userPanelArticleStatusClass(article.status)">{{ article.status }}</span></td>
                    <td>{{ article.views }}</td>
                    <td>{{ article.date }}</td>
                    <td>
                      <button type="button" title="编辑" @click="showUserPanelPlaceholder('文章编辑')">
                        <iconify-icon icon="mdi:pencil-outline" width="18"></iconify-icon>
                      </button>
                      <button type="button" title="删除" @click="showUserPanelPlaceholder('文章删除')">
                        <iconify-icon icon="mdi:trash-can-outline" width="18"></iconify-icon>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section v-else-if="userPanelActiveTab === 'favorites'" class="user-panel-tab">
          <div class="user-panel-card user-panel-empty-card">
            <iconify-icon icon="mdi:bookmark-heart-outline" width="54"></iconify-icon>
            <h2>我的收藏列表后续接入</h2>
            <p>当前版本只完成用户面板 UI。收藏状态和计数已存在，后续可补充收藏列表 API。</p>
            <button type="button" @click="openPublicHome">去首页阅读文章</button>
          </div>
        </section>

        <section v-else-if="userPanelActiveTab === 'social'" class="user-panel-tab">
          <div class="user-panel-social-grid">
            <article class="user-panel-card">
              <div class="user-panel-card-head">
                <div>
                  <h2>我的评论</h2>
                  <p>后续展示我发表的评论与回复记录。</p>
                </div>
              </div>
              <div class="user-panel-comment-placeholder">
                <span class="user-panel-avatar">评</span>
                <div>
                  <strong>评论记录后续接入</strong>
                  <p>将展示评论内容、所属文章和快捷跳转。</p>
                </div>
              </div>
            </article>
            <article class="user-panel-card">
              <div class="user-panel-card-head">
                <div>
                  <h2>互动通知</h2>
                  <p>后续展示回复、点赞、收藏等互动。</p>
                </div>
              </div>
              <div class="user-panel-notice-list">
                <div>
                  <span><iconify-icon icon="mdi:heart-outline" width="20"></iconify-icon></span>
                  <p>你的文章获得点赞后会显示在这里。</p>
                </div>
                <div>
                  <span><iconify-icon icon="mdi:comment-outline" width="20"></iconify-icon></span>
                  <p>有人回复你的评论后会显示在这里。</p>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section v-else-if="userPanelActiveTab === 'security'" class="user-panel-tab">
          <div class="user-panel-security-stack">
            <article class="user-panel-card user-panel-form-card">
              <div class="user-panel-card-head">
                <div>
                  <h2>修改登录密码</h2>
                  <p>表单 UI 已预留，接口后续接入。</p>
                </div>
              </div>
              <form @submit.prevent="showUserPanelPlaceholder('修改密码')">
                <label>
                  <span>当前密码</span>
                  <input autocomplete="current-password" placeholder="请输入当前密码" type="password" />
                </label>
                <label>
                  <span>新密码</span>
                  <input autocomplete="new-password" placeholder="请输入新密码" type="password" />
                </label>
                <label>
                  <span>确认新密码</span>
                  <input autocomplete="new-password" placeholder="请再次输入新密码" type="password" />
                </label>
                <button type="submit">更新密码</button>
              </form>
            </article>
            <article class="user-panel-card user-panel-form-card">
              <div class="user-panel-card-head">
                <div>
                  <h2>手机号码绑定</h2>
                  <p>验证码与手机号绑定接口后续接入。</p>
                </div>
              </div>
              <form @submit.prevent="showUserPanelPlaceholder('手机绑定')">
                <label>
                  <span>更换新手机号</span>
                  <input placeholder="请输入手机号" type="text" />
                </label>
                <label>
                  <span>短信验证码</span>
                  <input placeholder="6 位验证码" type="text" />
                </label>
                <button type="submit">确认修改</button>
              </form>
            </article>
            <article class="user-panel-card">
              <div class="user-panel-card-head">
                <div>
                  <h2>第三方账号绑定</h2>
                  <p>微信、QQ、支付宝等绑定能力后续接入。</p>
                </div>
              </div>
              <div class="user-panel-bind-grid">
                <button type="button" @click="showUserPanelPlaceholder('微信绑定')">
                  <iconify-icon icon="mdi:wechat" width="24"></iconify-icon>
                  <span>微信</span>
                  <small>去绑定</small>
                </button>
                <button type="button" @click="showUserPanelPlaceholder('QQ 绑定')">
                  <iconify-icon icon="mdi:qqchat" width="24"></iconify-icon>
                  <span>QQ</span>
                  <small>去绑定</small>
                </button>
                <button type="button" @click="showUserPanelPlaceholder('支付宝绑定')">
                  <iconify-icon icon="mdi:credit-card-outline" width="24"></iconify-icon>
                  <span>支付宝</span>
                  <small>去绑定</small>
                </button>
              </div>
            </article>
          </div>
        </section>
      </main>
    </div>
  </section>

  <section v-else-if="isArticleEditorView" class="article-editor-shell" :class="{ 'is-settings-collapsed': articleEditorSettingsCollapsed }">
    <header class="user-panel-topbar article-editor-topbar">
      <div class="user-panel-brand">
        <button class="article-editor-settings-button" type="button" aria-label="打开文章设置" @click="openArticleEditorSettingsPanel">
          <iconify-icon icon="mdi:tune-variant" width="22"></iconify-icon>
        </button>
        <button class="user-panel-logo" type="button" @click="openPublicHome">
          <span class="brand-logo-mark compact">
            <iconify-icon icon="mdi:feather" width="24"></iconify-icon>
            <span class="brand-feather-fallback" aria-hidden="true"></span>
          </span>
          <span class="brand-logo-text compact">MyBlog <span>Pro</span></span>
        </button>
        <span class="user-panel-header-divider"></span>
        <button class="user-panel-return-link" type="button" @click="openUserDashboard">
          <iconify-icon icon="mdi:arrow-left" width="20"></iconify-icon>
          <span>返回用户面板</span>
        </button>
      </div>
      <div class="user-panel-topbar-actions article-editor-topbar-actions">
        <button class="article-editor-preview-action" type="button" @click="showArticleEditorPlaceholder('文章预览')">
          <iconify-icon icon="mdi:eye-outline" width="19"></iconify-icon>
          <span>预览</span>
        </button>
        <button class="article-editor-publish-action" type="button" @click="showArticleEditorPlaceholder('投稿发布')">
          <iconify-icon icon="mdi:send-outline" width="19"></iconify-icon>
          <span>发布</span>
        </button>
        <button
          class="user-panel-icon-action"
          :title="isDarkMode ? '切换到亮色模式' : '切换到暗色模式'"
          type="button"
          @click="toggleThemeMode"
        >
          <iconify-icon :icon="isDarkMode ? 'mdi:weather-sunny' : 'mdi:weather-night'" width="22"></iconify-icon>
        </button>
        <button class="user-panel-icon-action" type="button" title="通知" @click="showUserPanelPlaceholder('消息通知')">
          <iconify-icon icon="mdi:bell-outline" width="22"></iconify-icon>
          <span></span>
        </button>
        <div class="user-panel-account">
          <span class="user-panel-avatar">{{ currentUserInitial }}</span>
          <div>
            <strong>{{ currentUser?.username }}</strong>
            <small>{{ roleLabel }}</small>
          </div>
        </div>
      </div>
    </header>

    <div class="article-editor-frame" :class="{ 'is-settings-collapsed': articleEditorSettingsCollapsed }">
      <aside class="article-editor-settings-panel" :class="{ 'is-open': articleEditorSettingsOpen, 'is-collapsed': articleEditorSettingsCollapsed }">
        <div class="article-editor-settings-head">
          <div>
            <h2>文章设置</h2>
            <p>当前为投稿页面 UI，占位交互后续接入。</p>
          </div>
          <button class="article-editor-settings-close" type="button" aria-label="关闭文章设置" @click="closeArticleEditorSettings">
            <iconify-icon icon="mdi:close" width="20"></iconify-icon>
          </button>
          <button class="article-editor-settings-collapse" type="button" aria-label="收起文章设置" @click="toggleArticleEditorSettingsCollapsed">
            <iconify-icon icon="mdi:panel-left-close" width="20"></iconify-icon>
          </button>
        </div>

        <div class="article-editor-setting-group">
          <div class="article-editor-setting-title">
            <h3>文章封面</h3>
            <span>建议 16:9</span>
          </div>
          <button class="article-editor-cover-dropzone" type="button" @click="showArticleEditorPlaceholder('封面上传')">
            <iconify-icon icon="mdi:image-plus-outline" width="34"></iconify-icon>
            <strong>点击或拖拽上传封面</strong>
            <small>支持 JPG、PNG、WebP</small>
          </button>
          <div class="article-editor-ratio-group" aria-label="封面比例">
            <button
              v-for="ratio in ['16:9', '4:3', '1:1']"
              :key="ratio"
              :class="{ 'is-active': articleEditorCoverRatio === ratio }"
              type="button"
              @click="setArticleEditorCoverRatio(ratio)"
            >
              {{ ratio }}
            </button>
            <button type="button" title="重新上传" @click="showArticleEditorPlaceholder('重新上传封面')">
              <iconify-icon icon="mdi:refresh" width="16"></iconify-icon>
            </button>
          </div>
        </div>

        <div class="article-editor-setting-group">
          <h3>分类</h3>
          <label class="article-editor-select">
            <span class="sr-only">分类</span>
            <select v-model="articleEditorForm.categoryName">
              <option value="">全部分类</option>
              <option v-for="category in categories" :key="category.id" :value="category.name">{{ category.name }}</option>
              <option value="技术">技术</option>
              <option value="生活">生活</option>
              <option value="随笔">随笔</option>
            </select>
            <iconify-icon icon="mdi:chevron-down" width="20"></iconify-icon>
          </label>
        </div>

        <div class="article-editor-setting-group article-editor-tags-section">
          <h3>标签</h3>
          <div class="article-editor-tag-list">
            <span v-for="tag in articleEditorTags" :key="tag">
              {{ tag }}
              <button type="button" :aria-label="`移除 ${tag}`" @click="removeArticleEditorTag(tag)">
                <iconify-icon icon="mdi:close" width="13"></iconify-icon>
              </button>
            </span>
          </div>
          <div class="article-editor-tag-input">
            <input
              v-model.trim="articleEditorForm.tagInput"
              placeholder="输入标签并回车"
              type="text"
              @keydown.enter.prevent="addArticleEditorTag()"
            />
            <button type="button" @click="addArticleEditorTag()">
              <iconify-icon icon="mdi:plus" width="18"></iconify-icon>
            </button>
          </div>
          <div class="article-editor-preset-tags">
            <small>常用标签：</small>
            <button
              v-for="tag in ['CSS', 'Vue', 'Python', 'TypeScript']"
              :key="tag"
              type="button"
              @click="addArticleEditorTag(tag)"
            >
              {{ tag }}
            </button>
          </div>
        </div>

        <div class="article-editor-setting-group article-editor-seo-section">
          <button class="article-editor-collapse-button" type="button" @click="toggleArticleEditorSeo">
            <span>SEO 设置</span>
            <iconify-icon :class="{ 'is-open': articleEditorSeoOpen }" icon="mdi:chevron-down" width="20"></iconify-icon>
          </button>
          <div v-if="articleEditorSeoOpen" class="article-editor-seo-fields">
            <label>
              <span>Meta 标题</span>
              <input v-model.trim="articleEditorForm.seoTitle" placeholder="输入 Meta 标题" type="text" />
            </label>
            <label>
              <span>Meta 关键词</span>
              <input v-model.trim="articleEditorForm.seoKeywords" placeholder="关键词，用逗号分隔" type="text" />
            </label>
            <label>
              <span>搜索预览描述</span>
              <textarea v-model="articleEditorForm.seoDescription" placeholder="输入文章摘要，用于搜索引擎展示" rows="3"></textarea>
            </label>
          </div>
        </div>

        <div class="article-editor-setting-group article-editor-advanced-section">
          <h3>高级设置</h3>
          <label class="article-editor-toggle-row">
            <span>允许评论</span>
            <input v-model="articleEditorForm.allowComments" aria-label="允许评论" type="checkbox" />
          </label>
          <label class="article-editor-toggle-row">
            <span>置顶文章</span>
            <input v-model="articleEditorForm.pinned" aria-label="置顶文章" type="checkbox" />
          </label>
        </div>
      </aside>

      <main class="article-editor-main">
        <div class="article-editor-workspace">
          <input
            v-model.trim="articleEditorForm.title"
            class="article-editor-title-input"
            placeholder="请输入文章标题..."
            type="text"
          />

          <div class="article-editor-toolbar" aria-label="Markdown 工具栏">
            <button type="button" title="一级标题" @click="insertArticleEditorHeading(1)">H</button>
            <span></span>
            <button type="button" title="加粗" @click="insertArticleEditorInline({ before: '**', after: '**', placeholder: '加粗文本' })">
              <iconify-icon icon="mdi:format-bold" width="20"></iconify-icon>
            </button>
            <button type="button" title="斜体" @click="insertArticleEditorInline({ before: '*', after: '*', placeholder: '斜体文本' })">
              <iconify-icon icon="mdi:format-italic" width="20"></iconify-icon>
            </button>
            <button type="button" title="引用" @click="insertArticleEditorQuote">
              <iconify-icon icon="mdi:format-quote-open" width="20"></iconify-icon>
            </button>
            <button type="button" title="代码" @click="insertArticleEditorCode">
              <iconify-icon icon="mdi:code-tags" width="20"></iconify-icon>
            </button>
            <span></span>
            <button type="button" title="无序列表" @click="insertArticleEditorList(false)">
              <iconify-icon icon="mdi:format-list-bulleted" width="20"></iconify-icon>
            </button>
            <button type="button" title="有序列表" @click="insertArticleEditorList(true)">
              <iconify-icon icon="mdi:format-list-numbered" width="20"></iconify-icon>
            </button>
            <button type="button" title="插入链接" @click="insertArticleEditorLink">
              <iconify-icon icon="mdi:link-variant" width="20"></iconify-icon>
            </button>
            <button type="button" title="插入图片" @click="openArticleEditorImageModal">
              <iconify-icon icon="mdi:image-outline" width="20"></iconify-icon>
            </button>
            <div class="article-editor-more">
              <button
                type="button"
                title="更多"
                aria-haspopup="menu"
                :aria-expanded="articleEditorMoreMenuOpen"
                @click="toggleArticleEditorMoreMenu"
              >
                <iconify-icon icon="mdi:dots-horizontal" width="22"></iconify-icon>
              </button>
              <div v-if="articleEditorMoreMenuOpen" class="article-editor-more-menu" role="menu">
                <button type="button" role="menuitem" @click="insertArticleEditorHeading(1)">
                  <span>H1</span>
                  <span>一级标题</span>
                </button>
                <button type="button" role="menuitem" @click="insertArticleEditorHeading(2)">
                  <span>H2</span>
                  <span>二级标题</span>
                </button>
                <button type="button" role="menuitem" @click="insertArticleEditorHeading(3)">
                  <span>H3</span>
                  <span>三级标题</span>
                </button>
                <button type="button" role="menuitem" @click="insertArticleEditorDivider">
                  <iconify-icon icon="mdi:minus" width="18"></iconify-icon>
                  <span>分隔线</span>
                </button>
                <button type="button" role="menuitem" @click="insertArticleEditorTable">
                  <iconify-icon icon="mdi:table" width="18"></iconify-icon>
                  <span>表格</span>
                </button>
                <button type="button" role="menuitem" @click="insertArticleEditorMath">
                  <iconify-icon icon="mdi:sigma" width="18"></iconify-icon>
                  <span>数学公式</span>
                </button>
                <button type="button" role="menuitem" @click="clearArticleEditorFormatting">
                  <iconify-icon icon="mdi:format-clear" width="18"></iconify-icon>
                  <span>清除格式</span>
                </button>
              </div>
            </div>
          </div>

          <textarea
            ref="articleEditorMarkdownRef"
            v-model="articleEditorForm.contentMarkdown"
            class="article-editor-markdown-input"
            placeholder="开始撰写 Markdown 正文..."
            @input="syncArticleEditorTextareaHeight"
            @focus="closeArticleEditorMoreMenu"
          ></textarea>
        </div>
      </main>
    </div>

    <footer class="article-editor-footer">
      <div class="article-editor-footer-actions">
        <button class="article-editor-footer-upload" type="button" @click="showArticleEditorPlaceholder('批量上传')">
          <iconify-icon icon="mdi:cloud-upload-outline" width="20"></iconify-icon>
          <span>批量上传</span>
        </button>
        <button class="article-editor-footer-draft" type="button" @click="showArticleEditorPlaceholder('保存草稿')">
          <iconify-icon icon="mdi:content-save-outline" width="20"></iconify-icon>
          <span>保存草稿</span>
        </button>
        <small>已自动保存于 --:--:--</small>
      </div>
      <div class="article-editor-footer-meta">
        <span>{{ articleEditorWordCount }} 字</span>
        <span>{{ articleEditorLineCount }} 行</span>
      </div>
    </footer>
  </section>

  <!-- ===== 主内容区 ===== -->
  <template v-if="!isUserPanelView && !isArticleEditorView && view === 'admin' && isAdmin">
    <button
      v-if="adminMobileNavOpen"
      class="admin-mobile-overlay"
      type="button"
      aria-label="关闭管理员导航"
      @click="closeAdminMobileNav"
    ></button>
    <main class="admin-shell">
      <button class="admin-mobile-menu-button" type="button" @click="toggleAdminMobileNav">
        <iconify-icon icon="mdi:menu" width="22"></iconify-icon>
        管理菜单
      </button>

      <aside class="admin-sidebar" :class="{ 'is-open': adminMobileNavOpen }">
        <nav class="admin-nav-list" aria-label="管理员菜单">
          <button
            v-for="tab in adminTabs"
            :key="tab.id"
            class="admin-nav-item"
            :class="{ 'is-active': adminActiveTab === tab.id }"
            type="button"
            @click="setAdminTab(tab.id)"
          >
            <iconify-icon :icon="tab.icon" width="22"></iconify-icon>
            <span>{{ tab.label }}</span>
          </button>
        </nav>
        <button class="admin-sidebar-home" type="button" @click="openPublicHome">
          <iconify-icon icon="mdi:arrow-left" width="18"></iconify-icon>
          返回博客首页
        </button>
      </aside>

      <section class="admin-main">
        <header class="admin-page-header">
          <div>
            <h1>{{ adminPageTitle }}</h1>
            <p>{{ adminPageSubtitle }}</p>
          </div>
          <button class="admin-refresh-button" type="button" :disabled="adminOverviewLoading" @click="loadAdminOverview">
            <iconify-icon icon="mdi:refresh" width="20"></iconify-icon>
            {{ adminOverviewLoading ? "刷新中" : "刷新数据" }}
          </button>
        </header>

        <template v-if="adminActiveTab === 'overview'">
          <section class="admin-stat-grid">
            <article
              v-for="card in adminSummaryCards"
              :key="card.label"
              class="admin-stat-card"
              :class="`tone-${card.tone}`"
            >
              <div class="admin-stat-icon">
                <iconify-icon :icon="card.icon" width="24"></iconify-icon>
              </div>
              <div>
                <p>{{ card.label }}</p>
                <strong>{{ formatCompactNumber(card.value) }}</strong>
              </div>
            </article>
          </section>

          <section class="admin-chart-grid">
            <article class="admin-card admin-chart-card admin-chart-card-wide">
              <h2>近7日访问趋势</h2>
              <div ref="adminVisitChartRef" class="admin-chart admin-visit-chart"></div>
            </article>
            <article class="admin-card admin-chart-card">
              <h2>文章分类分布</h2>
              <div ref="adminCategoryChartRef" class="admin-chart admin-category-chart"></div>
            </article>
          </section>

          <section class="admin-card">
            <div class="admin-card-header">
              <h2>最新动态</h2>
            </div>
            <div class="admin-activity-list">
              <div class="admin-activity-item">
                <span class="admin-activity-icon blue"><iconify-icon icon="mdi:account-plus-outline" width="18"></iconify-icon></span>
                <p>注册账号总数已更新为 <strong>{{ formatCompactNumber(adminOverview.summary.userCount) }}</strong></p>
                <time>实时</time>
              </div>
              <div class="admin-activity-item">
                <span class="admin-activity-icon orange"><iconify-icon icon="mdi:file-document-outline" width="18"></iconify-icon></span>
                <p>当前站内共有 <strong>{{ formatCompactNumber(adminOverview.summary.articleCount || adminArticles.length) }}</strong> 篇文章</p>
                <time>实时</time>
              </div>
              <div class="admin-activity-item">
                <span class="admin-activity-icon green"><iconify-icon icon="mdi:comment-text-outline" width="18"></iconify-icon></span>
                <p>敏感评论面板当前展示 <strong>{{ adminRiskComments.length }}</strong> 条待处理样例</p>
                <time>占位</time>
              </div>
            </div>
          </section>
        </template>

        <template v-else-if="adminActiveTab === 'users'">
          <section class="admin-card admin-filter-card">
            <div class="admin-filter-search">
              <iconify-icon icon="mdi:magnify" width="20"></iconify-icon>
              <input readonly placeholder="搜索用户名或邮箱..." type="text" />
            </div>
            <select aria-label="时间筛选">
              <option>全部时间</option>
              <option>近7天</option>
              <option>近30天</option>
            </select>
            <select aria-label="状态筛选">
              <option>全部状态</option>
              <option>正常</option>
              <option>已禁用</option>
            </select>
            <button type="button" @click="showAdminPlaceholder('用户筛选')">
              <iconify-icon icon="mdi:filter-outline" width="18"></iconify-icon>
              筛选
            </button>
          </section>

          <section class="admin-card admin-table-card">
            <div class="admin-user-table">
              <div class="admin-user-row admin-user-head">
                <span>用户</span>
                <span>邮箱</span>
                <span>注册时间</span>
                <span>状态</span>
                <span>操作</span>
              </div>
              <div v-for="user in adminUserRows" :key="user.email" class="admin-user-row">
                <div class="admin-user-cell-main">
                  <span class="admin-user-avatar" :style="{ backgroundColor: user.color }">{{ user.username[0]?.toUpperCase() }}</span>
                  <strong>{{ user.username }}</strong>
                </div>
                <span>{{ user.email }}</span>
                <span>{{ user.createdAt }}</span>
                <span>
                  <mark :class="{ 'is-disabled': user.status === '已禁用' }">{{ user.status }}</mark>
                </span>
                <div class="admin-user-actions">
                  <button type="button" @click="showAdminPlaceholder('查看用户详情')">查看</button>
                  <button
                    class="toggle"
                    type="button"
                    @click="showAdminPlaceholder(user.status === '已禁用' ? '启用用户' : '禁用用户')"
                  >
                    {{ user.status === "已禁用" ? "启用" : "禁用" }}
                  </button>
                  <button class="danger" type="button" @click="showAdminPlaceholder('删除用户')">删除</button>
                </div>
              </div>
            </div>
            <footer class="admin-table-footer">
              <span>显示 1 到 {{ adminUserRows.length }} 条，共 {{ formatCompactNumber(adminOverview.summary.userCount || adminUserRows.length) }} 条数据</span>
              <div class="admin-pagination">
                <button type="button" @click="showAdminPlaceholder('用户分页')">上一页</button>
                <button class="is-active" type="button">1</button>
                <button type="button" @click="showAdminPlaceholder('用户分页')">2</button>
                <button type="button" @click="showAdminPlaceholder('用户分页')">3</button>
                <button type="button" @click="showAdminPlaceholder('用户分页')">下一页</button>
              </div>
            </footer>
          </section>
        </template>

        <template v-else-if="adminActiveTab === 'review'">
          <section class="admin-card admin-review-card">
            <div class="admin-card-header">
              <h2>
                <iconify-icon icon="mdi:file-document-check-outline" width="24"></iconify-icon>
                待审核文章
              </h2>
              <span>{{ adminReviewArticles.length }} 条待审</span>
            </div>
            <div class="admin-review-list">
              <article v-for="article in adminReviewArticles" :key="article.title" class="admin-review-item">
                <div>
                  <h3>{{ article.title }}</h3>
                  <p>作者：{{ article.author }} · 提交时间：{{ article.submittedAt }}</p>
                </div>
                <div class="admin-review-actions">
                  <button class="approve" type="button" @click="showAdminPlaceholder('通过文章审核')">通过</button>
                  <button class="reject" type="button" @click="showAdminPlaceholder('驳回文章')">驳回</button>
                </div>
              </article>
            </div>
          </section>

          <section class="admin-card admin-review-card">
            <div class="admin-card-header">
              <h2>
                <iconify-icon icon="mdi:comment-alert-outline" width="24"></iconify-icon>
                敏感评论
              </h2>
              <span>{{ adminRiskComments.length }} 条待处理</span>
            </div>
            <div class="admin-review-list">
              <article v-for="comment in adminRiskComments" :key="comment.content" class="admin-review-item admin-comment-risk-item">
                <div>
                  <p>{{ comment.content }}</p>
                  <div class="admin-risk-meta">
                    <strong>评论者：{{ comment.author }}</strong>
                    <span>文章：{{ comment.article }}</span>
                    <time>{{ comment.createdAt }}</time>
                  </div>
                  <div class="admin-risk-tags">
                    <span class="reason">{{ comment.reason }}</span>
                    <span v-for="keyword in comment.keywords" :key="keyword">{{ keyword }}</span>
                  </div>
                </div>
                <div class="admin-review-actions">
                  <button class="neutral" type="button" @click="showAdminPlaceholder('忽略风险提示')">忽略</button>
                  <button class="delete" type="button" @click="showAdminPlaceholder('删除敏感评论')">删除</button>
                </div>
              </article>
            </div>
          </section>
        </template>

        <template v-else-if="adminActiveTab === 'taxonomy'">
          <section class="admin-taxonomy-grid">
            <article class="admin-card">
              <div class="admin-card-header">
                <h2>
                  <iconify-icon icon="mdi:folder-outline" width="24"></iconify-icon>
                  文章分类管理
                </h2>
              </div>
              <div class="admin-taxonomy-list">
                <div v-for="category in adminCategoryStats" :key="category.name" class="admin-taxonomy-item">
                  <div>
                    <span class="admin-taxonomy-dot" :style="{ backgroundColor: category.color }"></span>
                    <strong>{{ category.name }}</strong>
                    <small>{{ category.value }} 篇文章</small>
                  </div>
                  <div>
                    <button type="button" @click="showAdminPlaceholder('编辑分类')"><iconify-icon icon="mdi:pencil-outline" width="18"></iconify-icon></button>
                    <button type="button" @click="showAdminPlaceholder('删除分类')"><iconify-icon icon="mdi:trash-can-outline" width="18"></iconify-icon></button>
                  </div>
                </div>
                <p v-if="adminCategoryStats.length === 0" class="admin-empty-text">暂无分类。</p>
              </div>
              <div class="admin-inline-create">
                <input readonly placeholder="新增分类名称..." type="text" />
                <button type="button" @click="showAdminPlaceholder('新增分类')">新增</button>
              </div>
            </article>

            <article class="admin-card">
              <div class="admin-card-header">
                <h2>
                  <iconify-icon icon="mdi:tag-outline" width="24"></iconify-icon>
                  文章标签管理
                </h2>
              </div>
              <div class="admin-tag-cloud">
                <span v-for="tag in adminTagStats" :key="tag.id" :style="{ '--tag-color': tag.color }">
                  {{ tag.name }}
                  <button type="button" @click="showAdminPlaceholder('删除标签')">
                    <iconify-icon icon="mdi:close" width="15"></iconify-icon>
                  </button>
                </span>
                <p v-if="adminTagStats.length === 0" class="admin-empty-text">暂无标签。</p>
              </div>
              <div class="admin-inline-create">
                <input readonly placeholder="输入新标签名称..." type="text" />
                <button type="button" @click="showAdminPlaceholder('新增标签')">新增</button>
              </div>
            </article>
          </section>
        </template>
      </section>
    </main>
  </template>

  <main
    v-else-if="!isUserPanelView && !isArticleEditorView"
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
            <button v-if="isAdmin" class="flex-1 py-2 text-sm font-semibold text-white bg-orange-500 rounded-xl hover:bg-orange-600 transition-all" type="button" @click="openAdminDashboard">管理后台</button>
            <button v-else class="flex-1 py-2 text-sm font-semibold text-slate-600 bg-slate-50 rounded-xl hover:bg-slate-100 transition-all" type="button" @click="openUserDashboard">用户面板</button>
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
                  <p class="text-lg font-bold text-slate-900">{{ formatCompactNumber(siteSummary.todayVisits) }}</p>
                </div>
                <div class="text-center">
                  <p class="text-[10px] text-slate-400 uppercase font-bold">总点赞</p>
                  <p class="text-lg font-bold text-slate-900">{{ formatCompactNumber(siteSummary.totalLikes) }}</p>
                </div>
              </div>
            </section>

            <!-- 热门排行 -->
            <section class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-[400px] lg:h-[440px] flex flex-col overflow-hidden">
              <h3 class="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <iconify-icon class="text-orange-500" icon="mdi:fire"></iconify-icon>
                最受欢迎
              </h3>
              <p v-if="popularArticles.length === 0" class="text-xs text-slate-400 text-center py-8">暂无热门文章</p>
              <div v-else class="space-y-4">
                <div
                  v-for="(item, idx) in popularArticles"
                  :key="item.id"
                  class="flex gap-3 group cursor-pointer"
                  @click="openArticle(item.slug)"
                >
                  <span class="text-xl font-black text-slate-100 group-hover:text-orange-100 transition-colors">{{ String(idx + 1).padStart(2, '0') }}</span>
                  <div>
                    <h4 class="text-xs font-bold text-slate-700 line-clamp-2 group-hover:text-orange-500 transition-all">{{ item.title }}</h4>
                    <p class="text-[10px] text-slate-400 mt-1">{{ formatCompactNumber(item.stats?.viewCount || 0) }} 阅读</p>
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
              <h2>评论 ({{ commentTotalCount }})</h2>
            </div>
            <form v-if="isAuthenticated && !activeReplyTarget" class="article-comment-form" @submit.prevent="submitComment">
              <textarea v-model.trim="commentForm.content" :disabled="postingComment" maxlength="2000" placeholder="写下你的评论..." required />
              <button :disabled="postingComment || !commentForm.content" type="submit">{{ postingComment ? "发布中..." : "发表评论" }}</button>
            </form>
            <div v-else-if="!isAuthenticated" class="article-login-hint">
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
                    <button
                      :class="{ 'is-active': comment.likedByMe }"
                      :disabled="isMyComment(comment)"
                      :title="isMyComment(comment) ? '不能点赞自己的评论' : '点赞评论'"
                      type="button"
                      @click="likeComment(comment)"
                    >
                      <iconify-icon :icon="comment.likedByMe ? 'mdi:thumb-up' : 'mdi:thumb-up-outline'" width="16"></iconify-icon>
                      {{ comment.likeCount || 0 }}
                    </button>
                    <button type="button" @click="startReply(comment)">
                      回复
                    </button>
                    <button v-if="isAdmin" type="button" @click="deleteComment(comment)">删除</button>
                  </div>

                  <form
                    v-if="isAuthenticated && isReplyingTo(comment)"
                    class="article-comment-form article-reply-form"
                    @submit.prevent="submitComment"
                  >
                    <p>回复 @{{ activeReplyTarget.username }}</p>
                    <textarea v-model.trim="commentForm.content" :disabled="postingComment" maxlength="2000" placeholder="写下你的回复..." required />
                    <div class="article-reply-form-actions">
                      <button type="button" @click="cancelReply">取消</button>
                      <button :disabled="postingComment || !commentForm.content" type="submit">{{ postingComment ? "发布中..." : "发表回复" }}</button>
                    </div>
                  </form>

                  <div v-if="comment.replies?.length" class="article-reply-list">
                    <div v-for="reply in visibleReplies(comment)" :key="reply.id" class="article-reply-item">
                      <span class="article-avatar article-reply-avatar">{{ (reply.user?.username || '访')[0]?.toUpperCase() }}</span>
                      <div class="article-reply-body">
                        <div class="article-comment-head">
                          <strong>{{ reply.user?.username || "未知用户" }}</strong>
                          <time>{{ formatDate(reply.createdAt) }}</time>
                        </div>
                        <p>
                          <template v-if="reply.replyToUser && reply.replyToUser.id !== reply.user?.id">
                            <span>回复 @{{ reply.replyToUser.username }}：</span>
                          </template>
                          {{ reply.content }}
                        </p>
                        <div class="article-comment-actions">
                          <button type="button" @click="startReply(comment, reply)">回复</button>
                          <button v-if="isAdmin" type="button" @click="deleteComment(reply)">删除</button>
                        </div>
                        <form
                          v-if="isAuthenticated && isReplyingTo(comment, reply)"
                          class="article-comment-form article-reply-form"
                          @submit.prevent="submitComment"
                        >
                          <p>回复 @{{ activeReplyTarget.username }}</p>
                          <textarea v-model.trim="commentForm.content" :disabled="postingComment" maxlength="2000" placeholder="写下你的回复..." required />
                          <div class="article-reply-form-actions">
                            <button type="button" @click="cancelReply">取消</button>
                            <button :disabled="postingComment || !commentForm.content" type="submit">{{ postingComment ? "发布中..." : "发表回复" }}</button>
                          </div>
                        </form>
                      </div>
                    </div>
                    <button
                      v-if="hiddenReplyCount(comment) > 0 || expandedReplyCommentIds.has(comment.id)"
                      class="article-replies-toggle"
                      type="button"
                      @click="toggleReplies(comment)"
                    >
                      <template v-if="expandedReplyCommentIds.has(comment.id)">收起回复</template>
                      <template v-else>展开 {{ hiddenReplyCount(comment) }} 条回复</template>
                    </button>
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
