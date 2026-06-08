<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";

const API_BASE_URL = "/api";
const ASSET_BASE_URL = "";
const TOKEN_STORAGE_KEY = "private-blog-token";
const THEME_STORAGE_KEY = "private-blog-theme";
const VISITOR_STORAGE_KEY = "private-blog-visitor-id";
const DEFAULT_DOCUMENT_TITLE = document.title;
const DEFAULT_META_DESCRIPTION = "私人博客系统 - 探索与记录";

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
const adminReviewArticleSectionRef = ref(null);
const adminReviewCommentSectionRef = ref(null);
const userPanelReadChartRef = ref(null);
const userPanelCategoryChartRef = ref(null);
const articleCommentsCardRef = ref(null);
const userPanelNoticeCardRef = ref(null);
let messageTimer = null;
let adminVisitChartInstance = null;
let adminCategoryChartInstance = null;
let userPanelReadChartInstance = null;
let userPanelCategoryChartInstance = null;
let trafficChartInstance = null;
const currentUser = ref(null);
const currentSession = ref(null);
const publishedArticles = ref([]);
const adminArticles = ref([]);
const adminReviewArticles = ref([]);
const userArticles = ref([]);
const popularArticles = ref([]);
const selectedArticle = ref(null);
const comments = ref([]);
const searchInput = ref("");
const articleHeaderSearchInput = ref("");
const searchPageInput = ref("");
const searchQuery = ref("");
const searchResults = ref([]);
const searchLoading = ref(false);
const categories = ref([]);
const tags = ref([]);
const importResult = ref(null);
const siteSummary = ref({
  todayVisits: 0,
  totalLikes: 0,
  totalViews: 0,
  totalFavorites: 0,
  visitTrend: []
});
const adminActiveTab = ref("overview");
const adminMobileNavOpen = ref(false);
const adminOverviewLoading = ref(false);
const adminReviewLoading = ref(false);
const adminUsersLoading = ref(false);
const adminTaxonomyLoading = ref(false);
const adminManagedArticlesLoading = ref(false);
const adminReviewActionId = ref(null);
const adminUserActionId = ref(null);
const adminTaxonomyActionKey = ref("");
const adminArticleActionId = ref(null);
const adminRejectTarget = ref(null);
const adminRejectNote = ref("");
const adminReviewPreviewOpen = ref(false);
const adminReviewPreviewMode = ref("review");
const adminReviewPreviewArticle = ref(null);
const adminUserPreviewOpen = ref(false);
const adminUserPreview = ref(null);
const adminUsers = ref([]);
const adminTaxonomies = ref({
  categories: [],
  tags: []
});
const adminManagedArticles = ref([]);
const adminRiskComments = ref([]);
const adminOverview = ref({
  summary: {
    userCount: 0,
    articleCount: 0,
    commentCount: 0,
    todayVisits: 0
  },
  visitTrend: []
});
const adminReviewTaskSummary = ref({
  pendingArticleCount: 0,
  flaggedCommentCount: 0,
  hasPendingReview: false
});
const pendingAdminReviewFocus = ref("");
const returnArticleSlugAfterLogin = ref("");
const activeReplyTarget = ref(null);
const expandedReplyCommentIds = ref(new Set());
const DEFAULT_VISIBLE_REPLY_COUNT = 2;
const userPanelActiveTab = ref("overview");
const userPanelMobileNavOpen = ref(false);
const userPanelSummaryLoading = ref(false);
const userPanelFavoritesLoading = ref(false);
const userPanelSocialLoading = ref(false);
const userPanelSecurityLoading = ref(false);
const userPanelFavoriteSearch = ref("");
const userPanelFavoriteCategory = ref("");
const userPanelFavoriteActionSlug = ref("");
const userPanelSessionActionId = ref(null);
const userPanelSecurityEvents = ref([]);
const userPanelUnreadCount = ref(0);
const articleReturnTarget = ref(null);
const pendingArticleScrollTarget = ref(null);
const pendingUserPanelScrollTarget = ref(null);
const userPanelPasswordSaving = ref(false);
const userPanelBindingsSaving = ref(false);
const userPanelSummary = ref({
  articleCount: 0,
  viewCount: 0,
  likeCount: 0,
  favoriteCount: 0,
  savedFavoriteCount: 0,
  commentCount: 0,
  interactionCount: 0,
  activeSessionCount: 0,
  deltas: {},
  readTrend: [],
  categoryDistribution: [],
  bindings: {
    phoneNumber: null,
    wechatBound: false,
    qqBound: false,
    alipayBound: false
  }
});
const userPanelFavorites = ref([]);
const userPanelComments = ref([]);
const userPanelInteractions = ref([]);
const userPanelSessions = ref([]);
const articleEditorSettingsCollapsed = ref(false);
const articleEditorSettingsOpen = ref(false);
const articleEditorMoreMenuOpen = ref(false);
const articleEditorSeoOpen = ref(false);
const articleEditorMarkdownRef = ref(null);
const articleEditorImageInputRef = ref(null);
const articleEditorCoverInputRef = ref(null);
const articleEditorImageModalOpen = ref(false);
const articleEditorImageFiles = ref([]);
const articleEditorImageSelection = ref({ start: 0, end: 0 });
const articleEditorImageDragActive = ref(false);
const articleEditorArticleId = ref(null);
const articleEditorLoaded = ref(false);
const articleEditorSaving = ref(false);
const articleEditorSubmitting = ref(false);
const articleEditorWithdrawing = ref(false);
const articleEditorDeleting = ref(false);
const articleEditorPreviewLoading = ref(false);
const articleEditorPreviewOpen = ref(false);
const articleEditorPreview = ref(null);
const articleEditorSnapshot = ref("");
const articleEditorStatus = ref("DRAFT");
const articleEditorSubmittedAt = ref(null);
const articleEditorReviewNote = ref("");

const userPanelTabs = [
  { id: "overview", label: "数据看板", icon: "mdi:view-dashboard-outline" },
  { id: "articles", label: "我的文章", icon: "mdi:file-document-edit-outline" },
  { id: "favorites", label: "我的收藏", icon: "mdi:bookmark-outline" },
  { id: "social", label: "社交互动", icon: "mdi:comment-account-outline" },
  { id: "security", label: "安全设置", icon: "mdi:shield-check-outline" }
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
    id: "articles",
    label: "已发布文章",
    icon: "mdi:file-document-multiple-outline"
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

const userPanelPasswordForm = reactive({
  currentPassword: "",
  newPassword: "",
  confirmPassword: ""
});

const userPanelBindingsForm = reactive({
  phoneNumber: "",
  wechatBound: false,
  qqBound: false,
  alipayBound: false
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
  coverImageUrl: "",
  coverAlt: "",
  coverRatio: "16:9",
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

const adminUserFilters = reactive({
  q: "",
  status: "",
  role: ""
});

const adminArticleFilters = reactive({
  q: "",
  categoryId: "",
  status: ""
});

const adminTaxonomyFilters = reactive({
  q: ""
});

const adminCategoryForm = reactive({
  name: ""
});

const adminTagForm = reactive({
  name: ""
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
const userPanelArticleRows = computed(() =>
  userArticles.value.map((article) => ({
    ...article,
    displayTitle: article.title || "未命名草稿",
    categoryLabel: article.category?.name || "未分类",
    statusLabel: articleStatusLabel(article.status),
    viewsLabel: formatCompactNumber(article.stats?.viewCount || 0),
    dateLabel: formatDate(article.updatedAt || article.createdAt)
  }))
);
const userPanelDashboardStats = computed(() => [
  {
    label: "我的文章",
    value: formatCompactNumber(userPanelSummary.value.articleCount),
    delta: userPanelSummary.value.deltas?.articleCount || null,
    icon: "mdi:file-document-multiple-outline",
    tone: "orange"
  },
  {
    label: "站内阅读",
    value: formatCompactNumber(userPanelSummary.value.viewCount),
    delta: userPanelSummary.value.deltas?.viewCount || null,
    icon: "mdi:eye-outline",
    tone: "blue"
  },
  {
    label: "站内点赞",
    value: formatCompactNumber(userPanelSummary.value.likeCount),
    delta: userPanelSummary.value.deltas?.likeCount || null,
    icon: "mdi:heart-outline",
    tone: "rose"
  },
  {
    label: "站内收藏",
    value: formatCompactNumber(userPanelSummary.value.favoriteCount),
    delta: userPanelSummary.value.deltas?.favoriteCount || null,
    icon: "mdi:bookmark-outline",
    tone: "purple"
  }
]);
const userPanelReadTrend = computed(() => {
  const rows = Array.isArray(userPanelSummary.value.readTrend) ? userPanelSummary.value.readTrend : [];

  if (rows.length > 0) {
    return rows.map((item) => ({
      date: item.date,
      label: item.label,
      value: Number(item.value || 0)
    }));
  }

  return ["周一", "周二", "周三", "周四", "周五", "周六", "周日"].map((label) => ({
    label,
    value: 0
  }));
});
const userPanelCategoryDistribution = computed(() => {
  const rows = Array.isArray(userPanelSummary.value.categoryDistribution)
    ? userPanelSummary.value.categoryDistribution
    : [];

  return rows
    .map((item, index) => ({
      name: item.name || "未分类",
      value: Number(item.value || 0),
      color: ADMIN_CATEGORY_COLORS[index % ADMIN_CATEGORY_COLORS.length]
    }))
    .filter((item) => item.value > 0);
});
const userPanelHasCategoryDistribution = computed(() => userPanelCategoryDistribution.value.length > 0);
const userPanelFavoriteRows = computed(() =>
  userPanelFavorites.value.map((item) => ({
    ...item.article,
    favoritedAt: item.favoritedAt,
    summaryText: articlePlainSummary(item.article),
    categoryLabel: item.article.category?.name || "未分类",
    authorLabel: item.article.author?.username || "未知作者",
    dateLabel: formatDate(item.favoritedAt),
    coverLabel: favoriteCoverLabel(item.article),
    coverTone: favoriteCoverTone(item.article)
  }))
);
const userPanelFavoriteCategories = computed(() => {
  const categoryMap = new Map();

  for (const article of userPanelFavoriteRows.value) {
    const name = article.categoryLabel || "未分类";
    categoryMap.set(name, (categoryMap.get(name) || 0) + 1);
  }

  return Array.from(categoryMap, ([name, count]) => ({ name, count })).sort((first, second) => second.count - first.count);
});
const userPanelFavoriteStatCards = computed(() => [
  {
    label: "收藏总数",
    value: userPanelFavoriteRows.value.length,
    tone: "orange"
  },
  ...userPanelFavoriteCategories.value.slice(0, 3).map((item, index) => ({
    label: item.name,
    value: item.count,
    tone: ["blue", "rose", "purple"][index] || "orange"
  }))
]);
const filteredUserPanelFavorites = computed(() => {
  const keyword = userPanelFavoriteSearch.value.trim().toLowerCase();
  const category = userPanelFavoriteCategory.value;

  return userPanelFavoriteRows.value.filter((article) => {
    const matchesCategory = !category || article.categoryLabel === category;
    const searchable = [
      article.title,
      article.summaryText,
      article.authorLabel,
      article.categoryLabel,
      ...(article.tags || []).map((tag) => tag.name)
    ]
      .join(" ")
      .toLowerCase();

    return matchesCategory && (!keyword || searchable.includes(keyword));
  });
});
const userPanelCommentRows = computed(() =>
  userPanelComments.value.map((comment) => ({
    ...comment,
    typeLabel: comment.type === "reply" ? "回复" : "评论",
    dateLabel: formatDate(comment.createdAt),
    authorLabel: comment.author?.username || "未知用户",
    initial: (comment.author?.username || (comment.type === "reply" ? "R" : "C"))[0]?.toUpperCase() || "C",
    replyToLabel: comment.replyToUser?.username ? `回复 @${comment.replyToUser.username}` : ""
  }))
);
const userPanelInteractionRows = computed(() =>
  userPanelInteractions.value.map((interaction) => ({
    ...interaction,
    dateLabel: formatDate(interaction.createdAt),
    icon: interactionIcon(interaction.type),
    tone: interactionTone(interaction.type),
    isRead: Boolean(interaction.isRead)
  }))
);
const hasUnreadNotifications = computed(() => userPanelUnreadCount.value > 0);
const hasAdminReviewTasks = computed(() => Boolean(adminReviewTaskSummary.value.hasPendingReview));
const hasTopbarNoticeDot = computed(() => (isAdmin.value ? hasAdminReviewTasks.value : hasUnreadNotifications.value));
const notificationButtonTitle = computed(() => (isAdmin.value ? "内容审核待办" : "通知"));
const notificationButtonAriaLabel = computed(() =>
  isAdmin.value && hasAdminReviewTasks.value ? "内容审核有待处理事项" : notificationButtonTitle.value
);
const userPanelActiveSessionCount = computed(() => userPanelSessions.value.length || userPanelSummary.value.activeSessionCount || 0);
const userPanelSessionRows = computed(() =>
  userPanelSessions.value.map((session) => ({
    ...session,
    title: session.isCurrent ? "当前设备" : "登录设备",
    browserLabel: session.deviceName || compactUserAgent(session.userAgent),
    ipLabel: session.ipAddress || "未知 IP",
    activeLabel: formatDate(session.lastActiveAt)
  }))
);
const userPanelSecurityEventRows = computed(() =>
  userPanelSecurityEvents.value.map((event) => {
    const deviceName = event.device?.deviceName || compactUserAgent(event.userAgent);

    return {
      ...event,
      title: securityEventTitle(event.eventType),
      icon: securityEventIcon(event.eventType),
      tone: securityEventTone(event.eventType),
      dateLabel: formatDate(event.createdAt),
      detail: `${deviceName} · ${event.ipAddress || "未知 IP"}`
    };
  })
);
const articleEditorTags = computed(() => tagTextToArray(articleEditorForm.tagNamesText));
const articleEditorCoverPreviewUrl = computed(() => assetUrl(articleEditorForm.coverImageUrl));
const articleEditorSnapshotValue = computed(() =>
  JSON.stringify({
    title: articleEditorForm.title,
    categoryName: articleEditorForm.categoryName,
    tagNamesText: articleEditorForm.tagNamesText,
    coverImageUrl: articleEditorForm.coverImageUrl,
    coverAlt: articleEditorForm.coverAlt,
    coverRatio: articleEditorForm.coverRatio,
    seoTitle: articleEditorForm.seoTitle,
    seoKeywords: articleEditorForm.seoKeywords,
    seoDescription: articleEditorForm.seoDescription,
    allowComments: articleEditorForm.allowComments,
    pinned: articleEditorForm.pinned,
    contentMarkdown: articleEditorForm.contentMarkdown
  })
);
const articleEditorHasUnsavedChanges = computed(
  () => isArticleEditorView.value && articleEditorLoaded.value && articleEditorSnapshotValue.value !== articleEditorSnapshot.value
);
const articleEditorIsLocked = computed(() => articleEditorStatus.value === "PENDING_REVIEW");
const articleEditorCanDelete = computed(() => ["DRAFT", "REJECTED"].includes(articleEditorStatus.value) && articleEditorArticleId.value);
const articleEditorStatusText = computed(() => articleStatusLabel(articleEditorStatus.value));
const articleEditorPreviewHtml = computed(() => mapAssetUrls(articleEditorPreview.value?.contentHtml || ""));
const adminReviewPreviewHtml = computed(() => mapAssetUrls(adminReviewPreviewArticle.value?.contentHtml || ""));
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
const selectedArticleAllowsComments = computed(() => selectedArticle.value?.allowComments !== false);
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
const adminIsLoading = computed(
  () =>
    adminOverviewLoading.value ||
    adminReviewLoading.value ||
    adminUsersLoading.value ||
    adminTaxonomyLoading.value ||
    adminManagedArticlesLoading.value
);
const adminUserRows = computed(() =>
  adminUsers.value.map((user, index) => ({
    ...user,
    statusLabel: user.isDisabled ? "已禁用" : "正常",
    color: ADMIN_CATEGORY_COLORS[index % ADMIN_CATEGORY_COLORS.length],
    createdLabel: formatDate(user.createdAt),
    roleLabel: user.role === "ADMIN" ? "管理员" : "普通用户"
  }))
);
const adminManagedArticleRows = computed(() =>
  adminManagedArticles.value.map((article) => ({
    ...article,
    statusLabel: article.status === "ARCHIVED" ? "已下架" : "已发布",
    dateLabel: formatDate(article.publishedAt || article.updatedAt || article.createdAt),
    metricLabel: `${formatCompactNumber(article.stats?.viewCount || 0)} 阅读 · ${formatCompactNumber(article.stats?.likeCount || 0)} 赞 · ${formatCompactNumber(article.stats?.commentCount || 0)} 评`
  }))
);
const adminTaxonomyCategoryRows = computed(() =>
  adminTaxonomies.value.categories.map((category, index) => ({
    ...category,
    color: ADMIN_CATEGORY_COLORS[index % ADMIN_CATEGORY_COLORS.length]
  }))
);
const adminTaxonomyTagRows = computed(() =>
  adminTaxonomies.value.tags.map((tag, index) => ({
    ...tag,
    color: ADMIN_CATEGORY_COLORS[index % ADMIN_CATEGORY_COLORS.length]
  }))
);
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
    articles: "管理已发布和已下架文章",
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
const searchResultRows = computed(() =>
  searchResults.value.map((article) => ({
    ...article,
    summaryText: articlePlainSummary(article),
    categoryLabel: article.category?.name || "未分类",
    authorLabel: article.author?.username || "未知作者",
    dateLabel: articleDisplayDate(article),
    statsLabel: `${formatCompactNumber(article.stats?.viewCount || 0)} 阅读 · ${formatCompactNumber(article.stats?.likeCount || 0)} 赞 · ${formatCompactNumber(article.stats?.favoriteCount || 0)} 收藏`
  }))
);
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

function assetUrl(url) {
  const value = String(url || "").trim();

  if (!value) {
    return "";
  }

  if (/^(https?:)?\/\//i.test(value) || value.startsWith("data:")) {
    return value;
  }

  return value.startsWith("/uploads/") ? `${ASSET_BASE_URL}${value}` : value;
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

function articlePlainSummary(article) {
  const seoDescription = String(article?.seoDescription || "").trim();

  if (seoDescription) {
    return seoDescription.length > 96 ? `${seoDescription.slice(0, 95)}...` : seoDescription;
  }

  const markdown = String(article?.contentMarkdown || "")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#>*_`~|-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const htmlText = String(article?.contentHtml || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const text = markdown || htmlText || "暂无摘要";

  return text.length > 96 ? `${text.slice(0, 95)}...` : text;
}

function favoriteCoverLabel(article) {
  return (article?.category?.name || article?.title || "收藏").slice(0, 2).toUpperCase();
}

function favoriteCoverTone(article) {
  const tones = ["orange", "blue", "rose", "purple", "green"];
  const seed = String(article?.category?.slug || article?.slug || article?.title || "")
    .split("")
    .reduce((total, char) => total + char.charCodeAt(0), 0);

  return tones[seed % tones.length];
}

function compactUserAgent(userAgent) {
  const value = String(userAgent || "").trim();

  if (!value) {
    return "未知浏览器";
  }

  const browser =
    value.match(/Edg\/([\d.]+)/)?.[0]?.replace("/", " ") ||
    value.match(/Chrome\/([\d.]+)/)?.[0]?.replace("/", " ") ||
    value.match(/Firefox\/([\d.]+)/)?.[0]?.replace("/", " ") ||
    value.match(/Safari\/([\d.]+)/)?.[0]?.replace("/", " ") ||
    "浏览器";
  const system = value.includes("Windows")
    ? "Windows"
    : value.includes("Mac OS")
      ? "macOS"
      : value.includes("Android")
        ? "Android"
        : value.includes("iPhone") || value.includes("iPad")
          ? "iOS"
          : "未知系统";

  return `${browser} · ${system}`;
}

function interactionIcon(type) {
  if (type === "reply_to_my_comment" || type === "comment_on_my_article") {
    return "mdi:comment-outline";
  }

  if (type === "favorite_my_article") {
    return "mdi:bookmark-heart-outline";
  }

  return "mdi:heart-outline";
}

function interactionTone(type) {
  if (type === "reply_to_my_comment") {
    return "orange";
  }

  if (type === "comment_on_my_article") {
    return "blue";
  }

  if (type === "favorite_my_article") {
    return "purple";
  }

  return "rose";
}

function interactionShouldScrollToComments(type) {
  return ["reply_to_my_comment", "comment_on_my_article", "like_my_comment"].includes(type);
}

function securityEventTitle(eventType) {
  return {
    login_success: "登录成功",
    login_failed: "登录失败",
    logout: "退出登录",
    password_changed: "修改密码",
    session_revoked: "注销登录设备",
    bindings_updated: "更新账号绑定设置"
  }[eventType] || "安全活动";
}

function securityEventIcon(eventType) {
  return {
    login_success: "mdi:login-variant",
    login_failed: "mdi:alert-circle-outline",
    logout: "mdi:logout-variant",
    password_changed: "mdi:lock-reset",
    session_revoked: "mdi:cellphone-remove",
    bindings_updated: "mdi:shield-account-outline"
  }[eventType] || "mdi:shield-check-outline";
}

function securityEventTone(eventType) {
  if (eventType === "login_failed") {
    return "rose";
  }

  if (eventType === "password_changed" || eventType === "session_revoked") {
    return "orange";
  }

  if (eventType === "bindings_updated") {
    return "purple";
  }

  return "blue";
}

function scrollToArticleComments() {
  nextTick(() => {
    articleCommentsCardRef.value?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  });
}

function scrollToUserPanelNoticeCard() {
  nextTick(() => {
    userPanelNoticeCardRef.value?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  });
}

function scrollToAdminReviewFocus() {
  const targetRef = pendingAdminReviewFocus.value === "comments"
    ? adminReviewCommentSectionRef
    : adminReviewArticleSectionRef;

  pendingAdminReviewFocus.value = "";

  nextTick(() => {
    targetRef.value?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  });
}

function createArticleReturnTarget() {
  if (view.value === "article" && articleReturnTarget.value) {
    return articleReturnTarget.value;
  }

  if (view.value === "dashboard" && isAuthenticated.value && !isAdmin.value) {
    return {
      hash: "dashboard",
      userPanelTab: userPanelActiveTab.value
    };
  }

  if (view.value === "admin" && isAdmin.value) {
    return {
      hash: "admin"
    };
  }

  if (view.value === "search") {
    return {
      hash: searchQuery.value ? `search?q=${encodeURIComponent(searchQuery.value)}` : "search"
    };
  }

  return {
    hash: ""
  };
}

function articleReturnTargetForUserNotices() {
  return {
    hash: "dashboard",
    userPanelTab: "social",
    scrollTarget: "notices"
  };
}

function resetUserPanelData() {
  userPanelSummary.value = {
    articleCount: 0,
    viewCount: 0,
    likeCount: 0,
    favoriteCount: 0,
    savedFavoriteCount: 0,
    commentCount: 0,
    interactionCount: 0,
    activeSessionCount: 0,
    deltas: {},
    readTrend: [],
    categoryDistribution: [],
    bindings: {
      phoneNumber: null,
      wechatBound: false,
      qqBound: false,
      alipayBound: false
    }
  };
  userPanelFavorites.value = [];
  userPanelComments.value = [];
  userPanelInteractions.value = [];
  userPanelSessions.value = [];
  userPanelSecurityEvents.value = [];
  userPanelUnreadCount.value = 0;
  userPanelFavoriteSearch.value = "";
  userPanelFavoriteCategory.value = "";
  userPanelPasswordForm.currentPassword = "";
  userPanelPasswordForm.newPassword = "";
  userPanelPasswordForm.confirmPassword = "";
  userPanelBindingsForm.phoneNumber = "";
  userPanelBindingsForm.wechatBound = false;
  userPanelBindingsForm.qqBound = false;
  userPanelBindingsForm.alipayBound = false;
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

  if (hash.startsWith("search")) {
    const queryString = hash.includes("?") ? hash.slice(hash.indexOf("?") + 1) : "";
    const params = new URLSearchParams(queryString);

    return {
      viewName: "search",
      slug: null,
      query: params.get("q") || ""
    };
  }

  if (["article/new", "article-edit/new", "articleedit/new"].includes(hash)) {
    return {
      viewName: "articleEditor",
      slug: null,
      articleId: null
    };
  }

  if (hash.startsWith("article/edit/")) {
    return {
      viewName: "articleEditor",
      slug: null,
      articleId: Number(decodeURIComponent(hash.slice("article/edit/".length))) || null
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
  if (view.value === "articleEditor" && articleEditorHasUnsavedChanges.value) {
    if (!confirmLeaveArticleEditor()) {
      return;
    }
  }

  window.location.hash = nextHash ? `#${nextHash}` : "";
  mobileMenuOpen.value = false;
}

function openSearchPage(query) {
  const normalizedQuery = String(query || "").trim();

  if (!normalizedQuery) {
    return;
  }

  setHash(`search?q=${encodeURIComponent(normalizedQuery)}`);
}

function submitTopSearch() {
  openSearchPage(searchInput.value);
}

function submitArticleHeaderSearch() {
  openSearchPage(articleHeaderSearchInput.value);
}

function submitSearchPage() {
  openSearchPage(searchPageInput.value);
}

function openSearchShell() {
  setHash(searchQuery.value ? `search?q=${encodeURIComponent(searchQuery.value)}` : "search");
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

function articleStatusLabel(status) {
  return {
    DRAFT: "草稿",
    PENDING_REVIEW: "待审核",
    REJECTED: "未通过",
    PUBLISHED: "已发布",
    ARCHIVED: "已归档"
  }[status] || "草稿";
}

function resetArticleEditorForm() {
  articleEditorArticleId.value = null;
  articleEditorStatus.value = "DRAFT";
  articleEditorSubmittedAt.value = null;
  articleEditorReviewNote.value = "";
  articleEditorForm.title = "";
  articleEditorForm.categoryName = "";
  articleEditorForm.tagNamesText = "";
  articleEditorForm.tagInput = "";
  articleEditorForm.coverImageUrl = "";
  articleEditorForm.coverAlt = "";
  articleEditorForm.coverRatio = "16:9";
  articleEditorForm.seoTitle = "";
  articleEditorForm.seoKeywords = "";
  articleEditorForm.seoDescription = "";
  articleEditorForm.allowComments = true;
  articleEditorForm.pinned = false;
  articleEditorForm.contentMarkdown = "";
  articleEditorLoaded.value = true;
  saveArticleEditorSnapshot();
}

function fillArticleEditorForm(article) {
  articleEditorArticleId.value = article?.id || null;
  articleEditorStatus.value = article?.status || "DRAFT";
  articleEditorSubmittedAt.value = article?.submittedAt || null;
  articleEditorReviewNote.value = article?.reviewNote || "";
  articleEditorForm.title = article?.title === "未命名草稿" ? "" : article?.title || "";
  articleEditorForm.categoryName = article?.category?.name || "";
  articleEditorForm.tagNamesText = (article?.tags || []).map((tag) => tag.name).join(", ");
  articleEditorForm.tagInput = "";
  articleEditorForm.coverImageUrl = article?.coverImageUrl || "";
  articleEditorForm.coverAlt = article?.coverAlt || "";
  articleEditorForm.coverRatio = article?.coverRatio || "16:9";
  articleEditorForm.seoTitle = article?.seoTitle || "";
  articleEditorForm.seoKeywords = article?.seoKeywords || "";
  articleEditorForm.seoDescription = article?.seoDescription || "";
  articleEditorForm.allowComments = article?.allowComments !== false;
  articleEditorForm.pinned = Boolean(article?.isPinned);
  articleEditorForm.contentMarkdown = article?.contentMarkdown || "";
  articleEditorLoaded.value = true;
  saveArticleEditorSnapshot();
  syncArticleEditorTextareaHeight();
}

function saveArticleEditorSnapshot() {
  articleEditorSnapshot.value = articleEditorSnapshotValue.value;
}

function confirmLeaveArticleEditor() {
  if (!articleEditorHasUnsavedChanges.value) {
    return true;
  }

  return window.confirm("当前文章有未保存改动，确定要离开吗？");
}

function requestNavigation(nextHash) {
  setHash(nextHash);
}

function clearAuthState(nextMessage = "登录状态已失效，请重新登录。", nextHash = "") {
  token.value = "";
  currentUser.value = null;
  currentSession.value = null;
  adminArticles.value = [];
  userArticles.value = [];
  resetUserPanelData();
  articleEditorLoaded.value = false;
  articleEditorSnapshot.value = articleEditorSnapshotValue.value;
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
    siteSummary.value = {
      todayVisits: 0,
      totalLikes: 0,
      totalViews: 0,
      totalFavorites: 0,
      visitTrend: [],
      ...(payload.summary || {})
    };
    initTrafficChart();
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
    if (pendingArticleScrollTarget.value === "comments") {
      pendingArticleScrollTarget.value = null;
      scrollToArticleComments();
    }
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
  const { viewName, slug, articleId, authMode: nextAuthMode, query } = parseHash();

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

  if (viewName === "dashboard") {
    loadUserPanelTabData();
    if (pendingUserPanelScrollTarget.value === "notices") {
      pendingUserPanelScrollTarget.value = null;
      scrollToUserPanelNoticeCard();
    }
  }

  if (viewName === "admin") {
    if (adminActiveTab.value === "review") {
      loadAdminReviews().then(() => {
        if (pendingAdminReviewFocus.value) {
          scrollToAdminReviewFocus();
        }
      });
    } else {
      refreshAdminCurrentTab();
    }
  }

  if (viewName === "articleEditor") {
    if (articleId && articleEditorArticleId.value !== articleId) {
      loadArticleEditorDraft(articleId);
    } else if (!articleId && articleEditorArticleId.value !== null) {
      resetArticleEditorForm();
    } else if (!articleId && !articleEditorLoaded.value) {
      resetArticleEditorForm();
    }
  }

  if (viewName === "article" && slug) {
    loadArticleDetail(slug);
    return;
  }

  if (viewName === "search") {
    articleReturnTarget.value = null;
    if (query !== searchQuery.value || (query && searchResults.value.length === 0)) {
      loadSearchResults(query);
    }
  }

  articleReturnTarget.value = null;

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

async function loadSearchResults(query) {
  const normalizedQuery = String(query || "").trim();
  searchQuery.value = normalizedQuery;
  searchPageInput.value = normalizedQuery;

  if (!normalizedQuery) {
    searchResults.value = [];
    return;
  }

  searchLoading.value = true;

  try {
    const payload = await apiFetch(`/articles?q=${encodeURIComponent(normalizedQuery)}`);
    searchResults.value = payload.articles || [];
  } catch (error) {
    if (error.message !== "UNAUTHORIZED") {
      setMessage(error.message);
    }
  } finally {
    searchLoading.value = false;
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

function adminUserQueryString() {
  const params = new URLSearchParams();

  if (adminUserFilters.q.trim()) {
    params.set("q", adminUserFilters.q.trim());
  }

  if (adminUserFilters.status) {
    params.set("status", adminUserFilters.status);
  }

  if (adminUserFilters.role) {
    params.set("role", adminUserFilters.role);
  }

  return params.toString();
}

async function loadAdminUsers() {
  if (!isAdmin.value) {
    adminUsers.value = [];
    return;
  }

  adminUsersLoading.value = true;

  try {
    const query = adminUserQueryString();
    const payload = await apiFetch(query ? `/admin/users?${query}` : "/admin/users");
    adminUsers.value = payload.users || [];
  } catch (error) {
    if (error.message !== "UNAUTHORIZED") {
      setMessage(error.message);
    }
  } finally {
    adminUsersLoading.value = false;
  }
}

function adminArticleQueryString() {
  const params = new URLSearchParams();

  if (adminArticleFilters.q.trim()) {
    params.set("q", adminArticleFilters.q.trim());
  }

  if (adminArticleFilters.categoryId) {
    params.set("categoryId", adminArticleFilters.categoryId);
  }

  if (adminArticleFilters.status) {
    params.set("status", adminArticleFilters.status);
  }

  return params.toString();
}

async function loadAdminManagedArticles() {
  if (!isAdmin.value) {
    adminManagedArticles.value = [];
    return;
  }

  adminManagedArticlesLoading.value = true;

  try {
    const query = adminArticleQueryString();
    const payload = await apiFetch(query ? `/admin/articles?${query}` : "/admin/articles");
    adminManagedArticles.value = payload.articles || [];
  } catch (error) {
    if (error.message !== "UNAUTHORIZED") {
      setMessage(error.message);
    }
  } finally {
    adminManagedArticlesLoading.value = false;
  }
}

async function loadAdminTaxonomies() {
  if (!isAdmin.value) {
    adminTaxonomies.value = {
      categories: [],
      tags: []
    };
    return;
  }

  adminTaxonomyLoading.value = true;

  try {
    const params = new URLSearchParams();

    if (adminTaxonomyFilters.q.trim()) {
      params.set("q", adminTaxonomyFilters.q.trim());
    }

    const query = params.toString();
    const payload = await apiFetch(query ? `/admin/taxonomies?${query}` : "/admin/taxonomies");
    adminTaxonomies.value = {
      categories: payload.categories || [],
      tags: payload.tags || []
    };
  } catch (error) {
    if (error.message !== "UNAUTHORIZED") {
      setMessage(error.message);
    }
  } finally {
    adminTaxonomyLoading.value = false;
  }
}

async function loadUserArticles() {
  if (!isAuthenticated.value || isAdmin.value) {
    userArticles.value = [];
    return;
  }

  try {
    const payload = await apiFetch("/articles/me");
    userArticles.value = payload.articles || [];
  } catch (error) {
    if (error.message !== "UNAUTHORIZED") {
      setMessage(error.message);
    }
  }
}

function syncUserPanelBindingForm(bindings = userPanelSummary.value.bindings) {
  userPanelBindingsForm.phoneNumber = bindings?.phoneNumber || "";
  userPanelBindingsForm.wechatBound = Boolean(bindings?.wechatBound);
  userPanelBindingsForm.qqBound = Boolean(bindings?.qqBound);
  userPanelBindingsForm.alipayBound = Boolean(bindings?.alipayBound);
}

async function loadUserPanelSummary() {
  if (!isAuthenticated.value || isAdmin.value) {
    resetUserPanelData();
    return;
  }

  userPanelSummaryLoading.value = true;

  try {
    const payload = await apiFetch("/users/me/summary");
    userPanelSummary.value = {
      ...userPanelSummary.value,
      ...(payload.summary || {}),
      bindings: {
        ...userPanelSummary.value.bindings,
        ...(payload.summary?.bindings || {})
      }
    };
    syncUserPanelBindingForm(userPanelSummary.value.bindings);
    await nextTick();
    renderUserPanelCharts();
  } catch (error) {
    if (error.message !== "UNAUTHORIZED") {
      setMessage(error.message);
    }
  } finally {
    userPanelSummaryLoading.value = false;
  }
}

async function loadUserPanelFavorites() {
  if (!isAuthenticated.value || isAdmin.value) {
    userPanelFavorites.value = [];
    return;
  }

  userPanelFavoritesLoading.value = true;

  try {
    const payload = await apiFetch("/users/me/favorites");
    userPanelFavorites.value = payload.favorites || [];
  } catch (error) {
    if (error.message !== "UNAUTHORIZED") {
      setMessage(error.message);
    }
  } finally {
    userPanelFavoritesLoading.value = false;
  }
}

async function loadUserPanelSocial() {
  if (!isAuthenticated.value || isAdmin.value) {
    userPanelComments.value = [];
    userPanelInteractions.value = [];
    userPanelUnreadCount.value = 0;
    return;
  }

  userPanelSocialLoading.value = true;

  try {
    const [commentsPayload, interactionsPayload] = await Promise.all([
      apiFetch("/users/me/comments"),
      apiFetch("/users/me/interactions")
    ]);
    userPanelComments.value = commentsPayload.comments || [];
    userPanelInteractions.value = interactionsPayload.interactions || [];
    userPanelUnreadCount.value = Number(interactionsPayload.unreadCount || 0);
  } catch (error) {
    if (error.message !== "UNAUTHORIZED") {
      setMessage(error.message);
    }
  } finally {
    userPanelSocialLoading.value = false;
  }
}

async function refreshUserPanelNotificationState() {
  if (!isAuthenticated.value || isAdmin.value) {
    userPanelInteractions.value = [];
    userPanelUnreadCount.value = 0;
    return;
  }

  try {
    const payload = await apiFetch("/users/me/interactions");
    userPanelInteractions.value = payload.interactions || [];
    userPanelUnreadCount.value = Number(payload.unreadCount || 0);
  } catch (error) {
    if (error.message !== "UNAUTHORIZED") {
      setMessage(error.message);
    }
  }
}

async function loadUserPanelSessions() {
  if (!isAuthenticated.value || isAdmin.value) {
    userPanelSessions.value = [];
    return;
  }

  userPanelSecurityLoading.value = true;

  try {
    const payload = await apiFetch("/users/me/sessions");
    userPanelSessions.value = payload.sessions || [];
  } catch (error) {
    if (error.message !== "UNAUTHORIZED") {
      setMessage(error.message);
    }
  } finally {
    userPanelSecurityLoading.value = false;
  }
}

async function loadUserPanelSecurityEvents() {
  if (!isAuthenticated.value || isAdmin.value) {
    userPanelSecurityEvents.value = [];
    return;
  }

  try {
    const payload = await apiFetch("/users/me/security-events");
    userPanelSecurityEvents.value = payload.events || [];
  } catch (error) {
    if (error.message !== "UNAUTHORIZED") {
      setMessage(error.message);
    }
  }
}

async function loadUserPanelSecurity() {
  userPanelSecurityLoading.value = true;

  try {
    await Promise.all([loadUserPanelSummary(), loadUserPanelSessions(), loadUserPanelSecurityEvents()]);
  } finally {
    userPanelSecurityLoading.value = false;
  }
}

async function loadUserPanelTabData(tabId = userPanelActiveTab.value) {
  if (!isAuthenticated.value || isAdmin.value) {
    return;
  }

  if (tabId === "overview") {
    await loadUserPanelSummary();
    return;
  }

  if (tabId === "articles") {
    await Promise.all([loadUserArticles(), loadUserPanelSummary()]);
    return;
  }

  if (tabId === "favorites") {
    await Promise.all([loadUserPanelFavorites(), loadUserPanelSummary()]);
    return;
  }

  if (tabId === "social") {
    await Promise.all([loadUserPanelSocial(), loadUserPanelSummary()]);
    return;
  }

  if (tabId === "security") {
    await loadUserPanelSecurity();
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

async function loadAdminReviews() {
  if (!isAdmin.value) {
    adminReviewArticles.value = [];
    adminRiskComments.value = [];
    adminReviewTaskSummary.value = {
      pendingArticleCount: 0,
      flaggedCommentCount: 0,
      hasPendingReview: false
    };
    return;
  }

  adminReviewLoading.value = true;

  try {
    const [reviewPayload, moderationPayload] = await Promise.all([
      apiFetch("/articles/admin/reviews"),
      apiFetch("/admin/comments/moderation")
    ]);
    adminReviewArticles.value = reviewPayload.articles || [];
    adminRiskComments.value = moderationPayload.comments || [];
    adminReviewTaskSummary.value = {
      pendingArticleCount: adminReviewArticles.value.length,
      flaggedCommentCount: adminRiskComments.value.length,
      hasPendingReview: adminReviewArticles.value.length > 0 || adminRiskComments.value.length > 0
    };
  } catch (error) {
    if (error.message !== "UNAUTHORIZED") {
      setMessage(error.message);
    }
  } finally {
    adminReviewLoading.value = false;
  }
}

async function refreshAdminReviewTaskSummary() {
  if (!isAdmin.value) {
    adminReviewTaskSummary.value = {
      pendingArticleCount: 0,
      flaggedCommentCount: 0,
      hasPendingReview: false
    };
    return;
  }

  try {
    const payload = await apiFetch("/admin/review-tasks/summary");
    adminReviewTaskSummary.value = {
      pendingArticleCount: Number(payload.reviewTasks?.pendingArticleCount || 0),
      flaggedCommentCount: Number(payload.reviewTasks?.flaggedCommentCount || 0),
      hasPendingReview: Boolean(payload.reviewTasks?.hasPendingReview)
    };
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
      await Promise.all([
        loadAdminArticles(),
        loadAdminOverview(),
        loadAdminReviews(),
        loadAdminUsers(),
        loadAdminTaxonomies(),
        loadAdminManagedArticles(),
        refreshAdminReviewTaskSummary()
      ]);
    } else {
      await refreshUserPanelNotificationState();
    }
  } catch (error) {
    if (error.message !== "UNAUTHORIZED") {
      setMessage(error.message);
    }
  } finally {
    loading.value = false;
  }
}

function clearUserPanelFavoriteFilters() {
  userPanelFavoriteSearch.value = "";
  userPanelFavoriteCategory.value = "";
}

function openUserPanelArticle(slug) {
  if (slug) {
    openArticle(slug);
  }
}

function openUserPanelArticleTarget(slug, target = null, returnTarget = null) {
  if (!slug) {
    return;
  }

  pendingArticleScrollTarget.value = target;
  openArticle(slug, returnTarget);
}

async function readUserPanelNotice(notice) {
  if (!notice?.notificationKey) {
    return;
  }

  try {
    await apiFetch(`/users/me/interactions/${encodeURIComponent(notice.notificationKey)}/read`, {
      method: "PATCH"
    });
    userPanelInteractions.value = userPanelInteractions.value.map((interaction) =>
      interaction.notificationKey === notice.notificationKey
        ? {
            ...interaction,
            isRead: true,
            readAt: new Date().toISOString()
          }
        : interaction
    );
    userPanelUnreadCount.value = Math.max(0, userPanelUnreadCount.value - (notice.isRead ? 0 : 1));
  } catch (error) {
    if (error.message !== "UNAUTHORIZED") {
      setMessage(error.message);
    }
  }
}

async function openUserPanelNotice(notice) {
  await readUserPanelNotice(notice);
  openUserPanelArticleTarget(
    notice.article?.slug,
    interactionShouldScrollToComments(notice.type) ? "comments" : null,
    articleReturnTargetForUserNotices()
  );
}

async function markAllUserPanelNoticesRead() {
  if (!userPanelUnreadCount.value) {
    return;
  }

  try {
    await apiFetch("/users/me/interactions/read-all", {
      method: "PATCH"
    });
    userPanelInteractions.value = userPanelInteractions.value.map((interaction) => ({
      ...interaction,
      isRead: true,
      readAt: interaction.readAt || new Date().toISOString()
    }));
    userPanelUnreadCount.value = 0;
  } catch (error) {
    if (error.message !== "UNAUTHORIZED") {
      setMessage(error.message);
    }
  }
}

async function removeUserPanelFavorite(article) {
  if (!article?.slug) {
    return;
  }

  userPanelFavoriteActionSlug.value = article.slug;

  try {
    await apiFetch(`/articles/${encodeURIComponent(article.slug)}/favorites`, {
      method: "DELETE"
    });
    setMessage("已取消收藏。");
    await Promise.all([loadUserPanelFavorites(), loadUserPanelSummary(), loadPopularArticles()]);
  } catch (error) {
    if (error.message !== "UNAUTHORIZED") {
      setMessage(error.message);
    }
  } finally {
    userPanelFavoriteActionSlug.value = "";
  }
}

async function submitUserPanelPassword() {
  userPanelPasswordSaving.value = true;

  try {
    const payload = await apiFetch("/users/me/password", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(userPanelPasswordForm)
    });
    userPanelPasswordForm.currentPassword = "";
    userPanelPasswordForm.newPassword = "";
    userPanelPasswordForm.confirmPassword = "";
    setMessage(payload.message || "密码已更新。");
    await Promise.all([loadUserPanelSessions(), loadUserPanelSecurityEvents()]);
  } catch (error) {
    if (error.message !== "UNAUTHORIZED") {
      setMessage(error.message);
    }
  } finally {
    userPanelPasswordSaving.value = false;
  }
}

async function saveUserPanelBindings() {
  userPanelBindingsSaving.value = true;

  try {
    const payload = await apiFetch("/users/me/bindings", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(userPanelBindingsForm)
    });
    currentUser.value = payload.user || currentUser.value;
    userPanelSummary.value = {
      ...userPanelSummary.value,
      bindings: payload.bindings || userPanelSummary.value.bindings
    };
    syncUserPanelBindingForm(userPanelSummary.value.bindings);
    setMessage("绑定状态已保存。");
    await loadUserPanelSecurityEvents();
  } catch (error) {
    if (error.message !== "UNAUTHORIZED") {
      setMessage(error.message);
    }
  } finally {
    userPanelBindingsSaving.value = false;
  }
}

async function clearUserPanelPhone() {
  userPanelBindingsForm.phoneNumber = "";
  await saveUserPanelBindings();
}

async function toggleUserPanelBinding(key) {
  userPanelBindingsForm[key] = !userPanelBindingsForm[key];
  await saveUserPanelBindings();
}

async function revokeUserPanelSession(session) {
  if (!session?.id) {
    return;
  }

  const confirmText = session.isCurrent
    ? "确定注销当前设备吗？注销后需要重新登录。"
    : "确定注销这个登录设备吗？";

  if (!window.confirm(confirmText)) {
    return;
  }

  userPanelSessionActionId.value = session.id;

  try {
    const payload = await apiFetch(`/users/me/sessions/${session.id}`, {
      method: "DELETE"
    });

    if (payload.loggedOutCurrent) {
      clearAuthState("当前设备已注销，请重新登录。", "");
      return;
    }

    setMessage("登录设备已注销。");
    await Promise.all([loadUserPanelSessions(), loadUserPanelSummary(), loadUserPanelSecurityEvents()]);
  } catch (error) {
    if (error.message !== "UNAUTHORIZED") {
      setMessage(error.message);
    }
  } finally {
    userPanelSessionActionId.value = null;
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
    await Promise.all([
      loadPublishedArticles(),
      loadPopularArticles(),
      loadUserArticles(),
      loadUserPanelSummary(),
      refreshUserPanelNotificationState()
    ]);
    if (returnSlug) {
      returnArticleSlugAfterLogin.value = "";
      articleReturnTarget.value = {
        hash: ""
      };
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

function openArticle(slug, returnTarget = null) {
  if (!slug) {
    return;
  }

  articleReturnTarget.value = returnTarget || createArticleReturnTarget();
  setHash(`article/${encodeURIComponent(slug)}`);
}

function openPublicHome() {
  articleReturnTarget.value = null;
  searchInput.value = "";
  articleHeaderSearchInput.value = "";
  setHash("");
}

function returnFromArticle() {
  const target = articleReturnTarget.value;
  articleReturnTarget.value = null;

  if (target?.userPanelTab) {
    userPanelActiveTab.value = target.userPanelTab;
    pendingUserPanelScrollTarget.value = target.scrollTarget || null;
  }

  setHash(target?.hash || "");
}

function toggleMobileMenu() {
  mobileMenuOpen.value = !mobileMenuOpen.value;
}

function closeMobileMenu() {
  mobileMenuOpen.value = false;
}

function setUserPanelTab(tabId) {
  if (userPanelActiveTab.value === "overview" && tabId !== "overview") {
    disposeUserPanelCharts();
  }

  userPanelActiveTab.value = tabId;
  userPanelMobileNavOpen.value = false;
  loadUserPanelTabData(tabId);

  if (tabId === "overview") {
    nextTick(renderUserPanelCharts);
  }
}

function toggleUserPanelMobileNav() {
  userPanelMobileNavOpen.value = !userPanelMobileNavOpen.value;
}

function closeUserPanelMobileNav() {
  userPanelMobileNavOpen.value = false;
}

async function openAdminReviewTasks() {
  if (view.value === "articleEditor" && articleEditorHasUnsavedChanges.value && !confirmLeaveArticleEditor()) {
    return;
  }

  articleEditorMoreMenuOpen.value = false;
  mobileMenuOpen.value = false;
  adminActiveTab.value = "review";
  adminMobileNavOpen.value = false;
  window.location.hash = "#admin";
  await Promise.all([loadAdminReviews(), refreshAdminReviewTaskSummary()]);
  pendingAdminReviewFocus.value = adminReviewTaskSummary.value.pendingArticleCount > 0 ? "articles" : "comments";
  await nextTick();
  scrollToAdminReviewFocus();
}

function openUserPanelNotifications() {
  if (isAdmin.value) {
    openAdminReviewTasks();
    return;
  }

  if (view.value === "articleEditor" && articleEditorHasUnsavedChanges.value && !confirmLeaveArticleEditor()) {
    return;
  }

  articleEditorMoreMenuOpen.value = false;
  userPanelActiveTab.value = "social";
  userPanelMobileNavOpen.value = false;
  window.location.hash = "#dashboard";
  mobileMenuOpen.value = false;
  loadUserPanelTabData("social");
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
  if (articleEditorIsLocked.value) {
    return;
  }

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
  if (articleEditorIsLocked.value) {
    return;
  }

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

function articleEditorRequestBody() {
  return {
    title: articleEditorForm.title,
    categoryName: articleEditorForm.categoryName,
    tagNames: tagTextToArray(articleEditorForm.tagNamesText),
    coverImageUrl: articleEditorForm.coverImageUrl,
    coverAlt: articleEditorForm.coverAlt,
    coverRatio: articleEditorForm.coverRatio,
    seoTitle: articleEditorForm.seoTitle,
    seoKeywords: articleEditorForm.seoKeywords,
    seoDescription: articleEditorForm.seoDescription,
    allowComments: articleEditorForm.allowComments,
    isPinned: articleEditorForm.pinned,
    contentMarkdown: articleEditorForm.contentMarkdown
  };
}

async function loadArticleEditorDraft(articleId) {
  if (!articleId) {
    resetArticleEditorForm();
    return;
  }

  articleEditorLoaded.value = false;

  try {
    const payload = await apiFetch(`/articles/drafts/${articleId}`);
    fillArticleEditorForm(payload.article);
  } catch (error) {
    if (error.message !== "UNAUTHORIZED") {
      setMessage(error.message);
      requestNavigation("dashboard");
    }
  }
}

async function saveArticleEditorDraft() {
  if (articleEditorIsLocked.value) {
    setMessage("文章已提交审核，修改前请先撤回到草稿。");
    return;
  }

  articleEditorSaving.value = true;
  setMessage("");

  try {
    const isNewDraft = !articleEditorArticleId.value;
    const payload = await apiFetch(
      articleEditorArticleId.value ? `/articles/drafts/${articleEditorArticleId.value}` : "/articles/drafts",
      {
        method: articleEditorArticleId.value ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(articleEditorRequestBody())
      }
    );
    fillArticleEditorForm(payload.article);
    await loadUserArticles();
    setMessage("草稿已保存。");

    if (isNewDraft && payload.article?.id) {
      setHash(`article/edit/${payload.article.id}`);
    }
  } catch (error) {
    if (error.message !== "UNAUTHORIZED") {
      setMessage(error.message);
    }
  } finally {
    articleEditorSaving.value = false;
  }
}

async function submitArticleEditorForReview() {
  if (articleEditorIsLocked.value) {
    setMessage("文章已经在审核中。");
    return;
  }

  const confirmed = window.confirm("提交后文章将锁定，修改需要先撤回到草稿。确定提交审核吗？");

  if (!confirmed) {
    return;
  }

  articleEditorSubmitting.value = true;
  setMessage("");

  try {
    const isNewDraft = !articleEditorArticleId.value;
    const requestBody = articleEditorRequestBody();
    const payload = await apiFetch(
      articleEditorArticleId.value ? `/articles/drafts/${articleEditorArticleId.value}/submit` : "/articles/drafts",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(articleEditorArticleId.value ? requestBody : { ...requestBody, submit: true })
      }
    );
    fillArticleEditorForm(payload.article);
    await loadUserArticles();
    setMessage("已提交审核，文章已锁定。");

    if (isNewDraft && payload.article?.id) {
      setHash(`article/edit/${payload.article.id}`);
    }
  } catch (error) {
    if (error.message !== "UNAUTHORIZED") {
      setMessage(error.message);
    }
  } finally {
    articleEditorSubmitting.value = false;
  }
}

async function withdrawArticleEditorSubmission() {
  if (!articleEditorArticleId.value || articleEditorStatus.value !== "PENDING_REVIEW") {
    return;
  }

  articleEditorWithdrawing.value = true;
  setMessage("");

  try {
    const payload = await apiFetch(`/articles/drafts/${articleEditorArticleId.value}/withdraw`, {
      method: "POST"
    });
    fillArticleEditorForm(payload.article);
    await loadUserArticles();
    setMessage("已撤回到草稿，可以继续修改。");
  } catch (error) {
    if (error.message !== "UNAUTHORIZED") {
      setMessage(error.message);
    }
  } finally {
    articleEditorWithdrawing.value = false;
  }
}

async function openArticleEditorPreview() {
  articleEditorPreviewLoading.value = true;
  setMessage("");

  try {
    const payload = await apiFetch("/articles/preview", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(articleEditorRequestBody())
    });
    articleEditorPreview.value = payload.preview;
    articleEditorPreviewOpen.value = true;
  } catch (error) {
    if (error.message !== "UNAUTHORIZED") {
      setMessage(error.message);
    }
  } finally {
    articleEditorPreviewLoading.value = false;
  }
}

function closeArticleEditorPreview() {
  articleEditorPreviewOpen.value = false;
}

async function deleteUserArticle(article) {
  if (!article?.id) {
    return;
  }

  if (!["DRAFT", "REJECTED"].includes(article.status)) {
    setMessage("只能删除草稿或未通过文章。");
    return;
  }

  const confirmed = window.confirm("确定删除这篇文章吗？删除后无法恢复。");

  if (!confirmed) {
    return;
  }

  articleEditorDeleting.value = true;

  try {
    await apiFetch(`/articles/drafts/${article.id}`, {
      method: "DELETE"
    });
    await loadUserArticles();
    if (articleEditorArticleId.value === article.id) {
      resetArticleEditorForm();
      requestNavigation("dashboard");
    }
    setMessage("文章已删除。");
  } catch (error) {
    if (error.message !== "UNAUTHORIZED") {
      setMessage(error.message);
    }
  } finally {
    articleEditorDeleting.value = false;
  }
}

function openArticleEditor() {
  requestNavigation("article/new");
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
  articleEditorForm.coverRatio = ratio;
}

function chooseArticleEditorCover() {
  if (articleEditorIsLocked.value) {
    return;
  }

  articleEditorCoverInputRef.value?.click();
}

async function uploadArticleEditorCover(event) {
  const file = event.target.files?.[0];
  event.target.value = "";

  if (!file) {
    return;
  }

  if (!file.type.startsWith("image/")) {
    setMessage("请选择图片文件。");
    return;
  }

  uploadingImage.value = true;
  setMessage("");

  try {
    const formData = new FormData();
    formData.append("images", file);

    const payload = await apiFetch("/articles/uploads/images", {
      method: "POST",
      body: formData
    });
    const image = payload.images?.[0];

    if (!image?.imageUrl) {
      setMessage("封面上传失败，请重试。");
      return;
    }

    articleEditorForm.coverImageUrl = image.imageUrl;
    articleEditorForm.coverAlt = articleEditorForm.coverAlt || image.originalName || "";
    setMessage("封面已上传。");
  } catch (error) {
    if (error.message !== "UNAUTHORIZED") {
      setMessage(error.message);
    }
  } finally {
    uploadingImage.value = false;
  }
}

function clearArticleEditorCover() {
  if (articleEditorIsLocked.value) {
    return;
  }

  articleEditorForm.coverImageUrl = "";
  articleEditorForm.coverAlt = "";
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
    未通过: "is-rejected",
    DRAFT: "is-draft",
    PENDING_REVIEW: "is-review",
    PUBLISHED: "is-published",
    REJECTED: "is-rejected"
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

function openUserArticleEditor(article) {
  if (!article?.id) {
    return;
  }

  if (article.status === "PUBLISHED") {
    openArticle(article.slug);
    return;
  }

  requestNavigation(`article/edit/${article.id}`);
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
  } else if (tabId === "users") {
    loadAdminUsers();
  } else if (tabId === "articles") {
    loadAdminManagedArticles();
  } else if (tabId === "review") {
    loadAdminReviews();
  } else if (tabId === "taxonomy") {
    loadAdminTaxonomies();
  }
}

async function loadAdminRiskComments() {
  if (!isAdmin.value) {
    adminRiskComments.value = [];
    adminReviewTaskSummary.value = {
      pendingArticleCount: 0,
      flaggedCommentCount: 0,
      hasPendingReview: false
    };
    return;
  }

  try {
    const payload = await apiFetch("/admin/comments/moderation");
    adminRiskComments.value = payload.comments || [];
    adminReviewTaskSummary.value = {
      pendingArticleCount: adminReviewTaskSummary.value.pendingArticleCount || adminReviewArticles.value.length,
      flaggedCommentCount: adminRiskComments.value.length,
      hasPendingReview: (adminReviewTaskSummary.value.pendingArticleCount || adminReviewArticles.value.length) > 0 || adminRiskComments.value.length > 0
    };
  } catch (error) {
    if (error.message !== "UNAUTHORIZED") {
      setMessage(error.message);
    }
  }
}

function refreshAdminCurrentTab() {
  if (adminActiveTab.value === "users") {
    loadAdminUsers();
    return;
  }

  if (adminActiveTab.value === "articles") {
    loadAdminManagedArticles();
    return;
  }

  if (adminActiveTab.value === "review") {
    loadAdminReviews();
    return;
  }

  if (adminActiveTab.value === "taxonomy") {
    loadAdminTaxonomies();
    return;
  }

  loadAdminOverview();
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

function confirmDangerAction({ message: warningMessage, expected, label = "名称" }) {
  const confirmed = window.confirm(warningMessage);

  if (!confirmed) {
    return null;
  }

  const typed = window.prompt(`请输入${label}「${expected}」以确认删除。`);

  if (typed === null) {
    return null;
  }

  if (typed.trim() !== String(expected || "").trim()) {
    setMessage(`${label}不匹配，已取消操作。`);
    return null;
  }

  return typed.trim();
}

function openAdminReviewPreview(article, mode = "review") {
  adminReviewPreviewArticle.value = article;
  adminReviewPreviewMode.value = mode;
  adminReviewPreviewOpen.value = true;
}

function openAdminManagedArticlePreview(article) {
  openAdminReviewPreview(article, "managedArticle");
}

function closeAdminReviewPreview() {
  adminReviewPreviewOpen.value = false;
  adminReviewPreviewMode.value = "review";
}

function openAdminUserPreview(user) {
  adminUserPreview.value = user;
  adminUserPreviewOpen.value = true;
}

function closeAdminUserPreview() {
  adminUserPreviewOpen.value = false;
  adminUserPreview.value = null;
}

async function updateAdminUserDisabled(user) {
  if (!user?.id || user.role !== "USER") {
    setMessage("只能管理普通用户。");
    return;
  }

  const nextDisabled = !user.isDisabled;
  const confirmed = window.confirm(
    nextDisabled
      ? `确定禁用用户「${user.username}」吗？该用户会被立即踢下线，后续无法登录。`
      : `确定启用用户「${user.username}」吗？`
  );

  if (!confirmed) {
    return;
  }

  adminUserActionId.value = user.id;

  try {
    await apiFetch(`/admin/users/${user.id}/disabled`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        isDisabled: nextDisabled
      })
    });
    setMessage(nextDisabled ? "用户已禁用并踢下线。" : "用户已启用。");
    await Promise.all([loadAdminUsers(), loadAdminOverview()]);
    const refreshedUser = adminUserRows.value.find((item) => item.id === user.id);
    if (adminUserPreviewOpen.value && refreshedUser) {
      adminUserPreview.value = refreshedUser;
    }
  } catch (error) {
    if (error.message !== "UNAUTHORIZED") {
      setMessage(error.message);
    }
  } finally {
    adminUserActionId.value = null;
  }
}

async function deleteAdminUser(user) {
  if (!user?.id || user.role !== "USER") {
    setMessage("只能删除普通用户。");
    return;
  }

  const confirmName = confirmDangerAction({
    label: "用户名",
    expected: user.username,
    message: `确定删除用户「${user.username}」吗？这会同时删除 TA 的文章、评论、点赞、收藏、会话等关联数据，且无法恢复。`
  });

  if (!confirmName) {
    return;
  }

  adminUserActionId.value = user.id;

  try {
    await apiFetch(`/admin/users/${user.id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        confirmName
      })
    });
    setMessage(`用户「${user.username}」已删除。`);
    await Promise.all([loadAdminUsers(), loadAdminOverview(), loadPublishedArticles(), loadArticleFilters(), loadAdminManagedArticles()]);
    if (adminUserPreviewOpen.value && adminUserPreview.value?.id === user.id) {
      closeAdminUserPreview();
    }
  } catch (error) {
    if (error.message !== "UNAUTHORIZED") {
      setMessage(error.message);
    }
  } finally {
    adminUserActionId.value = null;
  }
}

async function updateAdminManagedArticleStatus(article, status) {
  if (!article?.id) {
    return;
  }

  const actionLabel = status === "ARCHIVED" ? "下架" : "重新发布";
  const confirmed = window.confirm(
    status === "ARCHIVED"
      ? `确定下架《${article.title}》吗？下架后公开页面将不再展示，但会保留评论、点赞、收藏和统计。`
      : `确定重新发布《${article.title}》吗？文章会重新出现在公开页面。`
  );

  if (!confirmed) {
    return;
  }

  adminArticleActionId.value = article.id;

  try {
    await apiFetch(`/admin/articles/${article.id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        status
      })
    });
    setMessage(`文章已${actionLabel}。`);
    await Promise.all([loadAdminManagedArticles(), loadPublishedArticles(), loadAdminOverview(), refreshPublicStats()]);
  } catch (error) {
    if (error.message !== "UNAUTHORIZED") {
      setMessage(error.message);
    }
  } finally {
    adminArticleActionId.value = null;
  }
}

async function deleteAdminManagedArticle(article) {
  if (!article?.id) {
    return;
  }

  const confirmTitle = confirmDangerAction({
    label: "文章标题",
    expected: article.title,
    message: `确定删除文章《${article.title}》吗？这会清除文章本体及评论、点赞、收藏、阅读、图片等关联数据，且无法恢复。`
  });

  if (!confirmTitle) {
    return;
  }

  adminArticleActionId.value = article.id;

  try {
    await apiFetch(`/admin/articles/${article.id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        confirmTitle
      })
    });
    setMessage(`文章《${article.title}》已删除。`);
    await Promise.all([loadAdminManagedArticles(), loadPublishedArticles(), loadAdminOverview(), loadArticleFilters(), refreshPublicStats()]);
    if (selectedArticle.value?.id === article.id) {
      selectedArticle.value = null;
      comments.value = [];
    }
  } catch (error) {
    if (error.message !== "UNAUTHORIZED") {
      setMessage(error.message);
    }
  } finally {
    adminArticleActionId.value = null;
  }
}

async function createAdminCategory() {
  const name = adminCategoryForm.name.trim();

  if (!name) {
    setMessage("请输入分类名称。");
    return;
  }

  adminTaxonomyActionKey.value = "category:create";

  try {
    await apiFetch("/admin/categories", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name
      })
    });
    adminCategoryForm.name = "";
    setMessage("分类已新增。");
    await Promise.all([loadAdminTaxonomies(), loadArticleFilters()]);
  } catch (error) {
    if (error.message !== "UNAUTHORIZED") {
      setMessage(error.message);
    }
  } finally {
    adminTaxonomyActionKey.value = "";
  }
}

async function renameAdminCategory(category) {
  const name = window.prompt("请输入新的分类名称。", category.name);

  if (name === null) {
    return;
  }

  const nextName = name.trim();

  if (!nextName) {
    setMessage("分类名称不能为空。");
    return;
  }

  adminTaxonomyActionKey.value = `category:${category.id}`;

  try {
    await apiFetch(`/admin/categories/${category.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: nextName
      })
    });
    setMessage("分类已更新。");
    await Promise.all([loadAdminTaxonomies(), loadArticleFilters(), loadPublishedArticles(), loadAdminManagedArticles()]);
  } catch (error) {
    if (error.message !== "UNAUTHORIZED") {
      setMessage(error.message);
    }
  } finally {
    adminTaxonomyActionKey.value = "";
  }
}

async function deleteAdminCategory(category) {
  const confirmName =
    category.articleCount > 0
      ? confirmDangerAction({
          label: "分类名称",
          expected: category.name,
          message: `分类「${category.name}」正在被 ${category.articleCount} 篇文章使用。删除后这些文章会移除此分类，确定继续吗？`
        })
      : "";

  if (category.articleCount > 0 && !confirmName) {
    return;
  }

  adminTaxonomyActionKey.value = `category:${category.id}`;

  try {
    await apiFetch(`/admin/categories/${category.id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(
        confirmName
          ? {
              confirmName
            }
          : {}
      )
    });
    setMessage("分类已删除。");
    await Promise.all([loadAdminTaxonomies(), loadArticleFilters(), loadPublishedArticles(), loadAdminManagedArticles()]);
  } catch (error) {
    if (error.message !== "UNAUTHORIZED") {
      setMessage(error.message);
    }
  } finally {
    adminTaxonomyActionKey.value = "";
  }
}

async function createAdminTag() {
  const name = adminTagForm.name.trim();

  if (!name) {
    setMessage("请输入标签名称。");
    return;
  }

  adminTaxonomyActionKey.value = "tag:create";

  try {
    await apiFetch("/admin/tags", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name
      })
    });
    adminTagForm.name = "";
    setMessage("标签已新增。");
    await Promise.all([loadAdminTaxonomies(), loadArticleFilters()]);
  } catch (error) {
    if (error.message !== "UNAUTHORIZED") {
      setMessage(error.message);
    }
  } finally {
    adminTaxonomyActionKey.value = "";
  }
}

async function renameAdminTag(tag) {
  const name = window.prompt("请输入新的标签名称。", tag.name);

  if (name === null) {
    return;
  }

  const nextName = name.trim();

  if (!nextName) {
    setMessage("标签名称不能为空。");
    return;
  }

  adminTaxonomyActionKey.value = `tag:${tag.id}`;

  try {
    await apiFetch(`/admin/tags/${tag.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: nextName
      })
    });
    setMessage("标签已更新。");
    await Promise.all([loadAdminTaxonomies(), loadArticleFilters(), loadPublishedArticles(), loadAdminManagedArticles()]);
  } catch (error) {
    if (error.message !== "UNAUTHORIZED") {
      setMessage(error.message);
    }
  } finally {
    adminTaxonomyActionKey.value = "";
  }
}

async function deleteAdminTag(tag) {
  const confirmName =
    tag.articleCount > 0
      ? confirmDangerAction({
          label: "标签名称",
          expected: tag.name,
          message: `标签「${tag.name}」正在被 ${tag.articleCount} 篇文章使用。删除后这些文章会移除此标签，确定继续吗？`
        })
      : "";

  if (tag.articleCount > 0 && !confirmName) {
    return;
  }

  adminTaxonomyActionKey.value = `tag:${tag.id}`;

  try {
    await apiFetch(`/admin/tags/${tag.id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(
        confirmName
          ? {
              confirmName
            }
          : {}
      )
    });
    setMessage("标签已删除。");
    await Promise.all([loadAdminTaxonomies(), loadArticleFilters(), loadPublishedArticles(), loadAdminManagedArticles()]);
  } catch (error) {
    if (error.message !== "UNAUTHORIZED") {
      setMessage(error.message);
    }
  } finally {
    adminTaxonomyActionKey.value = "";
  }
}

async function approveAdminReviewArticle(article) {
  if (!article?.id) {
    return;
  }

  const confirmed = window.confirm("审核通过后文章将立即发布并公开可见，确定通过吗？");

  if (!confirmed) {
    return;
  }

  adminReviewActionId.value = article.id;
  setMessage("");

  try {
    const payload = await apiFetch(`/articles/admin/reviews/${article.id}/approve`, {
      method: "POST"
    });
    setMessage("文章已审核通过并发布。");
    closeAdminReviewPreview();
    await Promise.all([loadAdminReviews(), loadAdminArticles(), loadPublishedArticles(), refreshPublicStats(), refreshAdminReviewTaskSummary()]);
    if (payload.article?.slug) {
      replaceArticleInList(payload.article);
    }
  } catch (error) {
    if (error.message !== "UNAUTHORIZED") {
      setMessage(error.message);
    }
  } finally {
    adminReviewActionId.value = null;
  }
}

function openAdminRejectDialog(article) {
  adminRejectTarget.value = article;
  adminRejectNote.value = "";
}

function closeAdminRejectDialog() {
  adminRejectTarget.value = null;
  adminRejectNote.value = "";
}

async function rejectAdminReviewArticle() {
  if (!adminRejectTarget.value?.id) {
    return;
  }

  const reviewNote = adminRejectNote.value.trim();

  if (!reviewNote) {
    setMessage("请填写驳回原因。");
    return;
  }

  adminReviewActionId.value = adminRejectTarget.value.id;
  setMessage("");

  try {
    await apiFetch(`/articles/admin/reviews/${adminRejectTarget.value.id}/reject`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        reviewNote
      })
    });
    setMessage("文章已驳回，原因已同步给用户。");
    closeAdminRejectDialog();
    closeAdminReviewPreview();
    await Promise.all([loadAdminReviews(), loadAdminArticles(), refreshAdminReviewTaskSummary()]);
  } catch (error) {
    if (error.message !== "UNAUTHORIZED") {
      setMessage(error.message);
    }
  } finally {
    adminReviewActionId.value = null;
  }
}

async function ignoreAdminRiskComment(comment) {
  if (!comment?.id) {
    return;
  }

  adminReviewActionId.value = comment.id;
  setMessage("");

  try {
    await apiFetch(`/admin/comments/${comment.id}/moderation/ignore`, {
      method: "PATCH"
    });
    setMessage("已忽略这条敏感评论提示。");
    await Promise.all([loadAdminRiskComments(), refreshAdminReviewTaskSummary()]);
  } catch (error) {
    if (error.message !== "UNAUTHORIZED") {
      setMessage(error.message);
    }
  } finally {
    adminReviewActionId.value = null;
  }
}

async function deleteAdminRiskComment(comment) {
  if (!comment?.id) {
    return;
  }

  const label = comment.type === "reply" ? "这条敏感回复" : "这条敏感评论";
  const confirmed = window.confirm(`确定删除${label}吗？删除后无法恢复。`);

  if (!confirmed) {
    return;
  }

  adminReviewActionId.value = comment.id;
  setMessage("");

  try {
    await apiFetch(`/admin/comments/${comment.id}`, {
      method: "DELETE"
    });
    setMessage(comment.type === "reply" ? "敏感回复已删除。" : "敏感评论已删除。");
    await Promise.all([
      loadAdminRiskComments(),
      refreshAdminReviewTaskSummary(),
      loadAdminOverview(),
      selectedArticle.value?.slug ? loadComments(selectedArticle.value.slug) : Promise.resolve(),
      userPanelActiveTab.value === "social" ? loadUserPanelSocial() : Promise.resolve()
    ]);
  } catch (error) {
    if (error.message !== "UNAUTHORIZED") {
      setMessage(error.message);
    }
  } finally {
    adminReviewActionId.value = null;
  }
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

  if (!selectedArticleAllowsComments.value) {
    setMessage("该文章已关闭评论。");
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

function handleBeforeUnload(event) {
  if (!articleEditorHasUnsavedChanges.value) {
    return;
  }

  event.preventDefault();
  event.returnValue = "";
}

function shouldRecordHomeVisit() {
  const { viewName, authMode: nextAuthMode } = parseHash();
  return viewName === "public" && !nextAuthMode;
}

function disposeTrafficChart() {
  if (trafficChartInstance) {
    trafficChartInstance.dispose();
    trafficChartInstance = null;
  }
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

function disposeUserPanelCharts() {
  if (userPanelReadChartInstance) {
    userPanelReadChartInstance.dispose();
    userPanelReadChartInstance = null;
  }

  if (userPanelCategoryChartInstance) {
    userPanelCategoryChartInstance.dispose();
    userPanelCategoryChartInstance = null;
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

function renderUserPanelCharts() {
  nextTick(() => {
    if (typeof echarts === "undefined" || !isUserPanelView.value || userPanelActiveTab.value !== "overview") {
      return;
    }

    const readEl = userPanelReadChartRef.value;
    const categoryEl = userPanelCategoryChartRef.value;

    if (readEl) {
      if (userPanelReadChartInstance && userPanelReadChartInstance.getDom() !== readEl) {
        userPanelReadChartInstance.dispose();
        userPanelReadChartInstance = null;
      }

      if (!userPanelReadChartInstance) {
        userPanelReadChartInstance = echarts.init(readEl);
      }

      const trend = userPanelReadTrend.value;
      userPanelReadChartInstance.setOption({
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
          left: 48,
          right: 18,
          top: 24,
          bottom: 34
        },
        xAxis: {
          type: "category",
          data: trend.map((item) => item.label),
          boundaryGap: false,
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
            color: "#8b95a5",
            fontSize: 12
          }
        },
        series: [
          {
            name: "阅读量",
            type: "line",
            smooth: true,
            symbol: "circle",
            symbolSize: 6,
            data: trend.map((item) => item.value),
            lineStyle: {
              color: "#ff6b35",
              width: 4
            },
            itemStyle: {
              color: "#ff6b35",
              borderColor: "#ffffff",
              borderWidth: 2
            },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: "rgba(255, 107, 53, 0.22)" },
                { offset: 1, color: "rgba(255, 107, 53, 0.02)" }
              ])
            }
          }
        ]
      });
    }

    if (categoryEl && userPanelHasCategoryDistribution.value) {
      if (userPanelCategoryChartInstance && userPanelCategoryChartInstance.getDom() !== categoryEl) {
        userPanelCategoryChartInstance.dispose();
        userPanelCategoryChartInstance = null;
      }

      if (!userPanelCategoryChartInstance) {
        userPanelCategoryChartInstance = echarts.init(categoryEl);
      }

      userPanelCategoryChartInstance.setOption({
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
            radius: ["46%", "72%"],
            center: ["50%", "44%"],
            avoidLabelOverlap: true,
            itemStyle: {
              borderRadius: 9,
              borderColor: "#ffffff",
              borderWidth: 4
            },
            label: {
              show: false
            },
            data: userPanelCategoryDistribution.value.map((item) => ({
              value: item.value,
              name: item.name,
              itemStyle: {
                color: item.color
              }
            }))
          }
        ]
      });
    } else if (userPanelCategoryChartInstance) {
      userPanelCategoryChartInstance.dispose();
      userPanelCategoryChartInstance = null;
    }
  });
}

function resizeUserPanelCharts() {
  userPanelReadChartInstance?.resize();
  userPanelCategoryChartInstance?.resize();
}

function resizeCharts() {
  trafficChartInstance?.resize();
  resizeAdminCharts();
  resizeUserPanelCharts();
}

function ensureMetaDescriptionElement() {
  let meta = document.querySelector('meta[name="description"]');

  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "description");
    document.head.appendChild(meta);
  }

  return meta;
}

function syncDocumentSeo() {
  if (view.value !== "article" || !selectedArticle.value) {
    document.title = DEFAULT_DOCUMENT_TITLE;
    ensureMetaDescriptionElement().setAttribute("content", DEFAULT_META_DESCRIPTION);
    return;
  }

  const title = selectedArticle.value.seoTitle || selectedArticle.value.title || DEFAULT_DOCUMENT_TITLE;
  document.title = title;
  ensureMetaDescriptionElement().setAttribute("content", articlePlainSummary(selectedArticle.value));
}

function initTrafficChart() {
  nextTick(() => {
    const el = trafficChartRef.value;
    if (!el || typeof echarts === "undefined") return;
    try {
      if (!trafficChartInstance || trafficChartInstance.getDom?.() !== el) {
        trafficChartInstance?.dispose();
        trafficChartInstance = echarts.init(el);
      }

      const trend = siteSummary.value.visitTrend?.length
        ? siteSummary.value.visitTrend
        : Array.from({ length: 7 }, (_item, index) => ({
            label: `D-${6 - index}`,
            value: 0
          }));

      trafficChartInstance.setOption({
        grid: { left: 0, right: 0, top: 10, bottom: 0 },
        xAxis: { type: "category", data: trend.map((item) => item.label), show: false },
        yAxis: { type: "value", show: false },
        series: [{
          data: trend.map((item) => item.value),
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
  } else {
    disposeTrafficChart();
  }

  if (newVal === "articleEditor") {
    syncArticleEditorTextareaHeight();
  }

  if (newVal === "admin") {
    nextTick(renderAdminCharts);
  } else {
    closeAdminMobileNav();
  }

  if (newVal === "dashboard") {
    nextTick(renderUserPanelCharts);
  } else {
    disposeUserPanelCharts();
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

watch([userPanelActiveTab, userPanelReadTrend, userPanelCategoryDistribution], () => {
  if (isUserPanelView.value && userPanelActiveTab.value === "overview") {
    renderUserPanelCharts();
  }
});

watch([view, selectedArticle], syncDocumentSeo);

onMounted(async () => {
  applyThemeMode();
  window.addEventListener("hashchange", handleHashChange);
  window.addEventListener("scroll", handleScroll, { passive: true });
  window.addEventListener("resize", resizeCharts);
  window.addEventListener("beforeunload", handleBeforeUnload);
  await Promise.all([loadPublishedArticles(), loadArticleFilters(), refreshPublicStats()]);
  if (token.value) {
    await loadProfile();
    await loadUserArticles();
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
  window.removeEventListener("resize", resizeCharts);
  window.removeEventListener("beforeunload", handleBeforeUnload);
  disposeTrafficChart();
  disposeAdminCharts();
  disposeUserPanelCharts();
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

  <div
    v-if="isArticleEditorView && articleEditorPreviewOpen"
    class="article-editor-preview-overlay"
    role="presentation"
    @click.self="closeArticleEditorPreview"
  >
    <section
      class="article-editor-preview-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="article-editor-preview-title"
    >
      <header>
        <div>
          <span>文章预览</span>
          <h2 id="article-editor-preview-title">{{ articleEditorPreview?.title || '未命名草稿' }}</h2>
          <p>
            {{ articleEditorPreview?.category?.name || '未分类' }}
            <template v-if="articleEditorPreview?.tags?.length">
              · {{ articleEditorPreview.tags.map((tag) => tag.name).join(' / ') }}
            </template>
          </p>
        </div>
        <button type="button" aria-label="关闭预览" @click="closeArticleEditorPreview">
          <iconify-icon icon="mdi:close" width="26"></iconify-icon>
        </button>
      </header>
      <main>
        <div
          v-if="articleEditorPreviewHtml"
          class="article-html article-detail-html article-editor-preview-html"
          v-html="articleEditorPreviewHtml"
        ></div>
        <div v-else class="article-editor-preview-empty">
          <iconify-icon icon="mdi:file-document-outline" width="44"></iconify-icon>
          <strong>暂无正文内容</strong>
          <p>继续在编辑器中撰写 Markdown 后再预览。</p>
        </div>
      </main>
    </section>
  </div>

  <div
    v-if="view === 'admin' && adminReviewPreviewOpen"
    class="article-editor-preview-overlay"
    role="presentation"
    @click.self="closeAdminReviewPreview"
  >
    <section
      class="article-editor-preview-modal admin-review-preview-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-review-preview-title"
    >
      <header>
        <div>
          <span>审核预览</span>
          <h2 id="admin-review-preview-title">{{ adminReviewPreviewArticle?.title || '未命名文章' }}</h2>
          <p>
            作者：{{ adminReviewPreviewArticle?.author?.username || '未知用户' }}
            · {{ adminReviewPreviewArticle?.category?.name || '未分类' }}
            <template v-if="adminReviewPreviewArticle?.tags?.length">
              · {{ adminReviewPreviewArticle.tags.map((tag) => tag.name).join(' / ') }}
            </template>
          </p>
        </div>
        <button type="button" aria-label="关闭审核预览" @click="closeAdminReviewPreview">
          <iconify-icon icon="mdi:close" width="26"></iconify-icon>
        </button>
      </header>
      <main>
        <div
          v-if="adminReviewPreviewHtml"
          class="article-html article-detail-html article-editor-preview-html"
          v-html="adminReviewPreviewHtml"
        ></div>
        <div v-else class="article-editor-preview-empty">
          <iconify-icon icon="mdi:file-document-outline" width="44"></iconify-icon>
          <strong>暂无正文内容</strong>
          <p>这篇投稿没有可预览的正文。</p>
        </div>
      </main>
      <footer v-if="adminReviewPreviewMode === 'review'" class="admin-review-preview-actions">
        <button type="button" @click="closeAdminReviewPreview">关闭</button>
        <button
          class="reject"
          type="button"
          :disabled="adminReviewActionId === adminReviewPreviewArticle?.id"
          @click="openAdminRejectDialog(adminReviewPreviewArticle)"
        >驳回</button>
        <button
          class="approve"
          type="button"
          :disabled="adminReviewActionId === adminReviewPreviewArticle?.id"
          @click="approveAdminReviewArticle(adminReviewPreviewArticle)"
        >通过并发布</button>
      </footer>
      <footer v-else class="admin-review-preview-actions">
        <button type="button" @click="closeAdminReviewPreview">关闭</button>
      </footer>
    </section>
  </div>

  <div
    v-if="view === 'admin' && adminUserPreviewOpen"
    class="admin-user-preview-overlay"
    role="presentation"
    @click.self="closeAdminUserPreview"
  >
    <aside class="admin-user-preview-drawer" role="dialog" aria-modal="true" aria-labelledby="admin-user-preview-title">
      <header>
        <div class="admin-user-preview-identity">
          <span class="admin-user-avatar" :style="{ backgroundColor: adminUserPreview?.color }">
            {{ adminUserPreview?.username?.[0]?.toUpperCase() || '?' }}
          </span>
          <div>
            <small>用户预览</small>
            <h2 id="admin-user-preview-title">{{ adminUserPreview?.username || '未知用户' }}</h2>
            <p>{{ adminUserPreview?.email || '未填写邮箱' }}</p>
          </div>
        </div>
        <button type="button" aria-label="关闭用户预览" @click="closeAdminUserPreview">
          <iconify-icon icon="mdi:close" width="24"></iconify-icon>
        </button>
      </header>

      <main>
        <section class="admin-user-preview-status">
          <mark :class="{ 'is-disabled': adminUserPreview?.isDisabled }">{{ adminUserPreview?.statusLabel }}</mark>
          <span>{{ adminUserPreview?.roleLabel }}</span>
        </section>

        <section class="admin-user-preview-grid">
          <div>
            <span>注册时间</span>
            <strong>{{ adminUserPreview?.createdLabel || '-' }}</strong>
          </div>
          <div>
            <span>更新时间</span>
            <strong>{{ formatDate(adminUserPreview?.updatedAt) }}</strong>
          </div>
          <div>
            <span>文章</span>
            <strong>{{ formatCompactNumber(adminUserPreview?.stats?.articleCount || 0) }}</strong>
          </div>
          <div>
            <span>评论</span>
            <strong>{{ formatCompactNumber(adminUserPreview?.stats?.commentCount || 0) }}</strong>
          </div>
          <div>
            <span>点赞</span>
            <strong>{{ formatCompactNumber(adminUserPreview?.stats?.likeCount || 0) }}</strong>
          </div>
          <div>
            <span>收藏</span>
            <strong>{{ formatCompactNumber(adminUserPreview?.stats?.favoriteCount || 0) }}</strong>
          </div>
          <div>
            <span>活跃会话</span>
            <strong>{{ formatCompactNumber(adminUserPreview?.stats?.activeSessionCount || 0) }}</strong>
          </div>
          <div>
            <span>用户 ID</span>
            <strong>{{ adminUserPreview?.id || '-' }}</strong>
          </div>
        </section>

        <p class="admin-user-preview-note">
          {{ adminUserPreview?.role === 'ADMIN' ? '管理员账号受保护，不能在此禁用或删除。' : '普通用户可禁用或删除；删除会连带移除 TA 的文章、评论、点赞、收藏、会话等数据。' }}
        </p>
      </main>

      <footer>
        <button type="button" @click="closeAdminUserPreview">关闭</button>
        <button
          v-if="adminUserPreview?.role === 'USER'"
          class="toggle"
          type="button"
          :disabled="adminUserActionId === adminUserPreview?.id"
          @click="updateAdminUserDisabled(adminUserPreview)"
        >
          {{ adminUserPreview?.isDisabled ? "启用" : "禁用" }}
        </button>
        <button
          v-if="adminUserPreview?.role === 'USER'"
          class="danger"
          type="button"
          :disabled="adminUserActionId === adminUserPreview?.id"
          @click="deleteAdminUser(adminUserPreview)"
        >删除</button>
      </footer>
    </aside>
  </div>

  <div
    v-if="adminRejectTarget"
    class="article-editor-preview-overlay"
    role="presentation"
    @click.self="closeAdminRejectDialog"
  >
    <section class="admin-reject-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-reject-title">
      <header>
        <div>
          <span>驳回文章</span>
          <h2 id="admin-reject-title">{{ adminRejectTarget?.title || '未命名文章' }}</h2>
        </div>
        <button type="button" aria-label="关闭驳回弹窗" @click="closeAdminRejectDialog">
          <iconify-icon icon="mdi:close" width="24"></iconify-icon>
        </button>
      </header>
      <label>
        <span>驳回原因</span>
        <textarea v-model="adminRejectNote" maxlength="500" placeholder="请说明需要修改的具体原因..." rows="5"></textarea>
      </label>
      <footer>
        <button type="button" @click="closeAdminRejectDialog">取消</button>
        <button
          class="reject"
          type="button"
          :disabled="adminReviewActionId === adminRejectTarget?.id"
          @click="rejectAdminReviewArticle"
        >确认驳回</button>
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
          <button class="article-return-button" type="button" @click="returnFromArticle">
            <iconify-icon icon="mdi:arrow-left" width="20"></iconify-icon>
            <span class="icon-fallback" aria-hidden="true">←</span>
            <span>返回</span>
          </button>
        </div>

        <form class="article-header-search hidden md:flex" @submit.prevent="submitArticleHeaderSearch">
          <iconify-icon class="text-slate-400 mr-2 shrink-0" icon="mdi:magnify"></iconify-icon>
          <input
            v-model.trim="articleHeaderSearchInput"
            aria-label="搜索文章、标签或关键词"
            class="bg-transparent border-none outline-none text-sm w-full placeholder:text-slate-400"
            placeholder="搜索文章、标签或关键词..."
            type="search"
          />
          <kbd class="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 bg-white border border-slate-200 rounded ml-2">⌘K</kbd>
        </form>

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
          <button v-if="isAuthenticated" class="p-2 text-slate-500 hover:text-orange-500 transition-colors relative" :title="notificationButtonTitle" :aria-label="notificationButtonAriaLabel" type="button" @click="openUserPanelNotifications">
            <iconify-icon icon="mdi:bell-outline" width="22"></iconify-icon>
            <span v-if="hasTopbarNoticeDot" class="absolute top-2 right-2 w-2 h-2 bg-orange-500 rounded-full border-2 border-white"></span>
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

        <form v-if="view !== 'admin'" class="hidden md:flex items-center bg-slate-100 rounded-full px-4 py-1.5 w-96 border border-transparent focus-within:border-orange-300 focus-within:bg-white transition-all" @submit.prevent="submitTopSearch">
          <iconify-icon class="text-slate-400 mr-2 shrink-0" icon="mdi:magnify"></iconify-icon>
          <input
            v-model.trim="searchInput"
            class="bg-transparent border-none outline-none text-sm w-full placeholder:text-slate-400"
            placeholder="搜索文章、标签或关键词..."
            type="search"
          />
          <kbd class="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 bg-white border border-slate-200 rounded ml-2">⌘K</kbd>
        </form>

        <div :class="view === 'admin' ? 'admin-topbar-actions' : 'flex items-center gap-4'">
          <button
            v-if="view !== 'admin'"
            class="md:hidden p-2 text-slate-500 hover:text-orange-500 transition-colors"
            title="搜索"
            type="button"
            @click="openSearchShell"
          >
            <iconify-icon icon="mdi:magnify" width="22"></iconify-icon>
          </button>
          <button
            :class="view === 'admin' ? 'admin-topbar-icon-action' : 'p-2 text-slate-500 hover:text-orange-500 dark:text-slate-300 dark:hover:text-orange-300 transition-colors'"
            :title="isDarkMode ? '切换到亮色模式' : '切换到暗色模式'"
            type="button"
            @click="toggleThemeMode"
          >
            <iconify-icon :icon="isDarkMode ? 'mdi:weather-sunny' : 'mdi:weather-night'" width="22"></iconify-icon>
          </button>
          <button v-if="isAuthenticated" :class="view === 'admin' ? 'admin-topbar-icon-action' : 'p-2 text-slate-500 hover:text-orange-500 transition-colors relative'" :title="notificationButtonTitle" :aria-label="notificationButtonAriaLabel" type="button" @click="openUserPanelNotifications">
            <iconify-icon icon="mdi:bell-outline" width="22"></iconify-icon>
            <span v-if="hasTopbarNoticeDot" :class="view === 'admin' ? 'admin-topbar-notice-dot' : 'absolute top-2 right-2 w-2 h-2 bg-orange-500 rounded-full border-2 border-white'"></span>
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
        <button class="user-panel-icon-action" type="button" :title="notificationButtonTitle" :aria-label="notificationButtonAriaLabel" @click="openUserPanelNotifications">
          <iconify-icon icon="mdi:bell-outline" width="22"></iconify-icon>
          <span v-if="hasTopbarNoticeDot"></span>
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
            <article v-for="stat in userPanelDashboardStats" :key="stat.label" class="user-panel-stat-card" :class="`tone-${stat.tone}`">
              <div>
                <span>
                  <iconify-icon :icon="stat.icon" width="24"></iconify-icon>
                </span>
                <small class="user-panel-stat-delta" :class="`is-${stat.delta?.tone || 'neutral'}`">
                  {{ stat.delta?.label || "无变化" }}
                </small>
              </div>
              <p>{{ stat.label }}</p>
              <strong>{{ stat.value }}</strong>
            </article>
          </div>

          <div class="user-panel-chart-grid">
            <article class="user-panel-card user-panel-chart-card">
              <div class="user-panel-card-head">
                <div>
                  <h2>近7日阅读趋势</h2>
                  <p>统计你已发布文章的真实阅读记录。</p>
                </div>
              </div>
              <div ref="userPanelReadChartRef" class="user-panel-echart"></div>
            </article>
            <article class="user-panel-card user-panel-chart-card user-panel-category-card">
              <div class="user-panel-card-head">
                <div>
                  <h2>文章分类分布</h2>
                  <p>按你创建的文章分类统计。</p>
                </div>
              </div>
              <div v-if="userPanelHasCategoryDistribution" ref="userPanelCategoryChartRef" class="user-panel-echart user-panel-donut-chart"></div>
              <div v-else class="user-panel-chart-empty">
                <iconify-icon icon="mdi:chart-donut" width="34"></iconify-icon>
                <strong>暂无分类数据</strong>
              </div>
            </article>
          </div>
        </section>

        <section v-else-if="userPanelActiveTab === 'articles'" class="user-panel-tab">
          <div class="user-panel-card">
            <div class="user-panel-card-head">
              <div>
                <h2>我的文章</h2>
                <p>草稿可继续编辑，提交审核后需撤回才能修改。</p>
              </div>
              <button type="button" @click="loadUserArticles">
                <iconify-icon icon="mdi:refresh" width="20"></iconify-icon>
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
                  <tr v-for="article in userPanelArticleRows" :key="article.id">
                    <td>
                      <div class="user-panel-article-title">
                        <span><iconify-icon icon="mdi:file-document-outline" width="20"></iconify-icon></span>
                        <strong>{{ article.displayTitle }}</strong>
                      </div>
                      <small v-if="article.reviewNote && article.status === 'REJECTED'" class="user-panel-article-note">
                        驳回原因：{{ article.reviewNote }}
                      </small>
                    </td>
                    <td>{{ article.categoryLabel }}</td>
                    <td><span class="user-panel-status" :class="userPanelArticleStatusClass(article.statusLabel)">{{ article.statusLabel }}</span></td>
                    <td>{{ article.viewsLabel }}</td>
                    <td>{{ article.dateLabel }}</td>
                    <td>
                      <button type="button" :title="article.status === 'PUBLISHED' ? '查看' : '编辑'" @click="openUserArticleEditor(article)">
                        <iconify-icon icon="mdi:pencil-outline" width="18"></iconify-icon>
                      </button>
                      <button
                        v-if="article.status === 'PENDING_REVIEW'"
                        type="button"
                        title="撤回"
                        @click="openUserArticleEditor(article)"
                      >
                        <iconify-icon icon="mdi:undo-variant" width="18"></iconify-icon>
                      </button>
                      <button
                        v-if="['DRAFT', 'REJECTED'].includes(article.status)"
                        type="button"
                        title="删除"
                        @click="deleteUserArticle(article)"
                      >
                        <iconify-icon icon="mdi:trash-can-outline" width="18"></iconify-icon>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
              <p v-if="userPanelArticleRows.length === 0" class="admin-empty-text">暂无文章，点击右上角发布新文章开始写作。</p>
            </div>
          </div>
        </section>

        <section v-else-if="userPanelActiveTab === 'favorites'" class="user-panel-tab">
          <div class="user-panel-card user-panel-filter-card">
            <label class="user-panel-search-box">
              <iconify-icon icon="mdi:magnify" width="22"></iconify-icon>
              <input v-model="userPanelFavoriteSearch" placeholder="搜索收藏文章..." type="search" />
            </label>
            <label class="user-panel-select-box">
              <span class="sr-only">收藏分类</span>
              <select v-model="userPanelFavoriteCategory">
                <option value="">全部分类</option>
                <option v-for="category in userPanelFavoriteCategories" :key="category.name" :value="category.name">
                  {{ category.name }}
                </option>
              </select>
              <iconify-icon icon="mdi:chevron-down" width="20"></iconify-icon>
            </label>
            <button class="user-panel-text-action" type="button" @click="clearUserPanelFavoriteFilters">清空筛选</button>
          </div>

          <div class="user-panel-favorite-stats">
            <article v-for="stat in userPanelFavoriteStatCards" :key="stat.label" class="user-panel-favorite-stat" :class="`tone-${stat.tone}`">
              <strong>{{ stat.value }}</strong>
              <span>{{ stat.label }}</span>
            </article>
          </div>

          <div class="user-panel-card">
            <div class="user-panel-card-head">
              <div>
                <h2>我的收藏</h2>
                <p>最多展示最近 50 条公开收藏，列表可滚动浏览。</p>
              </div>
              <button type="button" :disabled="userPanelFavoritesLoading" @click="loadUserPanelFavorites">
                <iconify-icon icon="mdi:refresh" width="20"></iconify-icon>
              </button>
            </div>
            <div class="user-panel-favorite-list user-panel-scroll-area">
              <article v-for="article in filteredUserPanelFavorites" :key="article.id" class="user-panel-favorite-item">
                <button class="user-panel-favorite-cover" :class="`tone-${article.coverTone}`" type="button" @click="openUserPanelArticle(article.slug)">
                  {{ article.coverLabel }}
                </button>
                <div class="user-panel-favorite-body">
                  <button class="user-panel-link-title" type="button" @click="openUserPanelArticle(article.slug)">{{ article.title }}</button>
                  <span class="user-panel-tag-chip">{{ article.categoryLabel }}</span>
                  <p>{{ article.summaryText }}</p>
                  <div class="user-panel-favorite-meta">
                    <span>作者：{{ article.authorLabel }}</span>
                    <span>收藏于：{{ article.dateLabel }}</span>
                    <span>阅读：{{ formatCompactNumber(article.stats?.viewCount) }}</span>
                    <span>点赞：{{ formatCompactNumber(article.stats?.likeCount) }}</span>
                    <span>收藏：{{ formatCompactNumber(article.stats?.favoriteCount) }}</span>
                  </div>
                  <div class="user-panel-tag-row">
                    <span v-for="tag in article.tags" :key="tag.id || tag.name">#{{ tag.name }}</span>
                  </div>
                </div>
                <button class="user-panel-muted-action" :disabled="userPanelFavoriteActionSlug === article.slug" type="button" @click="removeUserPanelFavorite(article)">
                  {{ userPanelFavoriteActionSlug === article.slug ? "处理中" : "取消收藏" }}
                </button>
              </article>
              <div v-if="!userPanelFavoritesLoading && filteredUserPanelFavorites.length === 0" class="user-panel-inline-empty">
                <iconify-icon icon="mdi:bookmark-outline" width="34"></iconify-icon>
                <strong>暂无匹配收藏</strong>
                <p>可以清空筛选，或去首页阅读并收藏文章。</p>
                <button type="button" @click="openPublicHome">去首页阅读</button>
              </div>
            </div>
          </div>
        </section>

        <section v-else-if="userPanelActiveTab === 'social'" class="user-panel-tab">
          <div class="user-panel-social-grid">
            <article class="user-panel-card user-panel-social-main">
              <div class="user-panel-card-head">
                <div>
                  <h2><iconify-icon icon="mdi:comment-text-outline" width="22"></iconify-icon> 评论管理</h2>
                  <p>查看其他用户在你文章下发表的评论和回复。</p>
                </div>
                <button type="button" :disabled="userPanelSocialLoading" @click="loadUserPanelSocial">
                  <iconify-icon icon="mdi:refresh" width="20"></iconify-icon>
                </button>
              </div>
              <div class="user-panel-comment-list user-panel-scroll-area">
                <article v-for="comment in userPanelCommentRows" :key="comment.id" class="user-panel-comment-item">
                  <span class="user-panel-comment-avatar">{{ comment.initial }}</span>
                  <div>
                    <div class="user-panel-comment-meta">
                      <strong>{{ comment.authorLabel }}</strong>
                      <span>{{ comment.dateLabel }}</span>
                    </div>
                    <button class="user-panel-comment-article" type="button" @click="openUserPanelArticle(comment.article?.slug)">
                      {{ comment.typeLabel }}文章：{{ comment.article?.title || "未知文章" }}
                    </button>
                    <p v-if="comment.replyToLabel" class="user-panel-reply-target">{{ comment.replyToLabel }}</p>
                    <p class="user-panel-comment-content">{{ comment.excerpt }}</p>
                  </div>
                </article>
                <div v-if="!userPanelSocialLoading && userPanelCommentRows.length === 0" class="user-panel-inline-empty">
                  <iconify-icon icon="mdi:comment-outline" width="34"></iconify-icon>
                  <strong>暂无评论记录</strong>
                  <p>当其他用户评论你的文章后，这里会显示评论记录。</p>
                </div>
              </div>
            </article>
            <article ref="userPanelNoticeCardRef" class="user-panel-card user-panel-notice-card">
              <div class="user-panel-card-head">
                <div>
                  <h2><iconify-icon icon="mdi:bell-outline" width="22"></iconify-icon> 消息通知</h2>
                  <p>来自评论、点赞和收藏的最新互动。</p>
                </div>
                <button type="button" :disabled="userPanelSocialLoading || !userPanelUnreadCount" @click="markAllUserPanelNoticesRead">
                  全部已读
                </button>
              </div>
              <div class="user-panel-notice-list user-panel-scroll-area">
                <button
                  v-for="notice in userPanelInteractionRows"
                  :key="notice.id"
                  class="user-panel-notice-item"
                  :class="[`tone-${notice.tone}`, { 'is-unread': !notice.isRead }]"
                  type="button"
                  @click="openUserPanelNotice(notice)"
                >
                  <span class="user-panel-notice-icon"><iconify-icon :icon="notice.icon" width="20"></iconify-icon></span>
                  <div>
                    <strong>{{ notice.message }}</strong>
                    <em>{{ notice.article?.title }}</em>
                    <small>{{ notice.dateLabel }}</small>
                  </div>
                  <i v-if="!notice.isRead" class="user-panel-unread-dot" aria-hidden="true"></i>
                </button>
                <div v-if="!userPanelSocialLoading && userPanelInteractionRows.length === 0" class="user-panel-inline-empty">
                  <iconify-icon icon="mdi:bell-sleep-outline" width="34"></iconify-icon>
                  <strong>暂无互动通知</strong>
                  <p>当有人评论、回复、点赞或收藏你的内容时，会出现在这里。</p>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section v-else-if="userPanelActiveTab === 'security'" class="user-panel-tab">
          <div class="user-panel-security-layout">
            <div class="user-panel-security-stack">
              <article class="user-panel-card user-panel-form-card">
                <div class="user-panel-card-head">
                  <div>
                    <h2>修改登录密码</h2>
                    <p>更新后会保留当前设备，其他设备将退出登录。</p>
                  </div>
                </div>
                <form @submit.prevent="submitUserPanelPassword">
                  <label>
                    <span>当前密码</span>
                    <input v-model="userPanelPasswordForm.currentPassword" autocomplete="current-password" placeholder="请输入当前密码" type="password" />
                  </label>
                  <label>
                    <span>新密码</span>
                    <input v-model="userPanelPasswordForm.newPassword" autocomplete="new-password" placeholder="请输入新密码" type="password" />
                  </label>
                  <label>
                    <span>确认新密码</span>
                    <input v-model="userPanelPasswordForm.confirmPassword" autocomplete="new-password" placeholder="请再次输入新密码" type="password" />
                  </label>
                  <button type="submit" :disabled="userPanelPasswordSaving">{{ userPanelPasswordSaving ? "更新中" : "更新密码" }}</button>
                </form>
              </article>
              <article class="user-panel-card user-panel-form-card">
                <div class="user-panel-card-head">
                  <div>
                    <h2>手机号码绑定</h2>
                    <p>当前仅保存手机号，本版不做短信验证。</p>
                  </div>
                </div>
                <form class="user-panel-phone-form" @submit.prevent="saveUserPanelBindings">
                  <label>
                    <span>手机号码</span>
                    <input v-model.trim="userPanelBindingsForm.phoneNumber" autocomplete="tel" placeholder="请输入手机号" type="tel" />
                  </label>
                  <button type="submit" :disabled="userPanelBindingsSaving">{{ userPanelBindingsSaving ? "保存中" : "保存手机号" }}</button>
                  <button class="user-panel-secondary-button" type="button" :disabled="userPanelBindingsSaving || !userPanelBindingsForm.phoneNumber" @click="clearUserPanelPhone">清空</button>
                </form>
              </article>
              <article class="user-panel-card">
                <div class="user-panel-card-head">
                  <div>
                    <h2>第三方账号绑定</h2>
                    <p>仅保存本地绑定标记，不进行真实第三方授权。</p>
                  </div>
                </div>
                <div class="user-panel-bind-grid">
                  <button type="button" :class="{ 'is-bound': userPanelBindingsForm.wechatBound }" :disabled="userPanelBindingsSaving" @click="toggleUserPanelBinding('wechatBound')">
                    <iconify-icon icon="mdi:wechat" width="24"></iconify-icon>
                    <span>微信</span>
                    <small>{{ userPanelBindingsForm.wechatBound ? "取消绑定" : "标记已绑定" }}</small>
                  </button>
                  <button type="button" :class="{ 'is-bound': userPanelBindingsForm.qqBound }" :disabled="userPanelBindingsSaving" @click="toggleUserPanelBinding('qqBound')">
                    <iconify-icon icon="mdi:qqchat" width="24"></iconify-icon>
                    <span>QQ</span>
                    <small>{{ userPanelBindingsForm.qqBound ? "取消绑定" : "标记已绑定" }}</small>
                  </button>
                  <button type="button" :class="{ 'is-bound': userPanelBindingsForm.alipayBound }" :disabled="userPanelBindingsSaving" @click="toggleUserPanelBinding('alipayBound')">
                    <iconify-icon icon="mdi:credit-card-outline" width="24"></iconify-icon>
                    <span>支付宝</span>
                    <small>{{ userPanelBindingsForm.alipayBound ? "取消绑定" : "标记已绑定" }}</small>
                  </button>
                </div>
              </article>
              <article class="user-panel-card user-panel-audit-card">
                <div class="user-panel-card-head">
                  <div>
                    <h2>最近安全活动</h2>
                    <p>展示最近 5 条登录、密码和绑定相关记录。</p>
                  </div>
                  <button type="button" :disabled="userPanelSecurityLoading" @click="loadUserPanelSecurityEvents">
                    <iconify-icon icon="mdi:refresh" width="20"></iconify-icon>
                  </button>
                </div>
                <div class="user-panel-audit-list">
                  <article v-for="event in userPanelSecurityEventRows" :key="event.id" class="user-panel-audit-item" :class="`tone-${event.tone}`">
                    <span class="user-panel-audit-icon">
                      <iconify-icon :icon="event.icon" width="20"></iconify-icon>
                    </span>
                    <div>
                      <strong>{{ event.title }}</strong>
                      <p>{{ event.detail }}</p>
                    </div>
                    <time>{{ event.dateLabel }}</time>
                  </article>
                  <div v-if="!userPanelSecurityLoading && userPanelSecurityEventRows.length === 0" class="user-panel-inline-empty">
                    <iconify-icon icon="mdi:shield-check-outline" width="34"></iconify-icon>
                    <strong>暂无安全活动</strong>
                  </div>
                </div>
              </article>
            </div>
            <aside class="user-panel-device-card user-panel-card">
              <div class="user-panel-card-head">
                <div>
                  <h2>登录设备</h2>
                  <p>{{ userPanelActiveSessionCount }} 个活跃设备，当前设备会被标记。</p>
                </div>
                <button type="button" :disabled="userPanelSecurityLoading" @click="loadUserPanelSessions">
                  <iconify-icon icon="mdi:refresh" width="20"></iconify-icon>
                </button>
              </div>
              <div class="user-panel-session-list user-panel-scroll-area">
                <article v-for="session in userPanelSessionRows" :key="session.id" class="user-panel-session-item" :class="{ 'is-current': session.isCurrent }">
                  <span class="user-panel-session-icon">
                    <iconify-icon :icon="session.isCurrent ? 'mdi:cellphone-key' : 'mdi:devices'" width="20"></iconify-icon>
                  </span>
                  <div>
                    <strong>{{ session.title }}</strong>
                    <p>{{ session.browserLabel }}</p>
                    <small>{{ session.ipLabel }} · {{ session.activeLabel }}</small>
                  </div>
                  <button type="button" :disabled="userPanelSessionActionId === session.id" @click="revokeUserPanelSession(session)">
                    {{ userPanelSessionActionId === session.id ? "处理中" : "注销" }}
                  </button>
                </article>
                <div v-if="!userPanelSecurityLoading && userPanelSessions.length === 0" class="user-panel-inline-empty">
                  <iconify-icon icon="mdi:devices" width="34"></iconify-icon>
                  <strong>暂无活跃设备</strong>
                </div>
              </div>
            </aside>
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
        <button
          class="article-editor-preview-action"
          type="button"
          :disabled="articleEditorPreviewLoading"
          @click="openArticleEditorPreview"
        >
          <iconify-icon icon="mdi:eye-outline" width="19"></iconify-icon>
          <span>{{ articleEditorPreviewLoading ? "生成中" : "预览" }}</span>
        </button>
        <button
          v-if="articleEditorStatus === 'PENDING_REVIEW'"
          class="article-editor-preview-action"
          type="button"
          :disabled="articleEditorWithdrawing"
          @click="withdrawArticleEditorSubmission"
        >
          <iconify-icon icon="mdi:undo-variant" width="19"></iconify-icon>
          <span>{{ articleEditorWithdrawing ? "撤回中" : "撤回" }}</span>
        </button>
        <button
          v-else
          class="article-editor-publish-action"
          type="button"
          :disabled="articleEditorSubmitting"
          @click="submitArticleEditorForReview"
        >
          <iconify-icon icon="mdi:send-outline" width="19"></iconify-icon>
          <span>{{ articleEditorSubmitting ? "提交中" : "提交审核" }}</span>
        </button>
        <button
          class="user-panel-icon-action"
          :title="isDarkMode ? '切换到亮色模式' : '切换到暗色模式'"
          type="button"
          @click="toggleThemeMode"
        >
          <iconify-icon :icon="isDarkMode ? 'mdi:weather-sunny' : 'mdi:weather-night'" width="22"></iconify-icon>
        </button>
        <button class="user-panel-icon-action" type="button" :title="notificationButtonTitle" :aria-label="notificationButtonAriaLabel" @click="openUserPanelNotifications">
          <iconify-icon icon="mdi:bell-outline" width="22"></iconify-icon>
          <span v-if="hasTopbarNoticeDot"></span>
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
            <p>当前状态：{{ articleEditorStatusText }}。提交审核后需撤回才能修改。</p>
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
          <button
            class="article-editor-cover-dropzone"
            type="button"
            :disabled="articleEditorIsLocked || uploadingImage"
            @click="chooseArticleEditorCover"
          >
            <img v-if="articleEditorCoverPreviewUrl" :alt="articleEditorForm.coverAlt || '文章封面'" :src="articleEditorCoverPreviewUrl" />
            <template v-else>
              <iconify-icon icon="mdi:image-plus-outline" width="34"></iconify-icon>
              <strong>点击上传封面</strong>
              <small>支持 JPG、PNG、WebP</small>
            </template>
          </button>
          <input ref="articleEditorCoverInputRef" class="sr-only" type="file" accept="image/*" @change="uploadArticleEditorCover" />
          <label class="article-editor-cover-alt">
            <span>封面替代文本</span>
            <input v-model.trim="articleEditorForm.coverAlt" placeholder="描述封面内容" type="text" :disabled="articleEditorIsLocked" />
          </label>
          <div class="article-editor-ratio-group" aria-label="封面比例">
            <button
              v-for="ratio in ['16:9', '4:3', '1:1']"
              :key="ratio"
              :class="{ 'is-active': articleEditorForm.coverRatio === ratio }"
              type="button"
              :disabled="articleEditorIsLocked"
              @click="setArticleEditorCoverRatio(ratio)"
            >
              {{ ratio }}
            </button>
            <button type="button" title="移除封面" :disabled="articleEditorIsLocked || !articleEditorForm.coverImageUrl" @click="clearArticleEditorCover">
              <iconify-icon icon="mdi:refresh" width="16"></iconify-icon>
            </button>
          </div>
        </div>

        <div class="article-editor-setting-group">
          <h3>分类</h3>
          <label class="article-editor-select">
            <span class="sr-only">分类</span>
            <select v-model="articleEditorForm.categoryName" :disabled="articleEditorIsLocked">
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
              <button type="button" :aria-label="`移除 ${tag}`" :disabled="articleEditorIsLocked" @click="removeArticleEditorTag(tag)">
                <iconify-icon icon="mdi:close" width="13"></iconify-icon>
              </button>
            </span>
          </div>
          <div class="article-editor-tag-input">
            <input
              v-model.trim="articleEditorForm.tagInput"
              placeholder="输入标签并回车"
              type="text"
              :disabled="articleEditorIsLocked"
              @keydown.enter.prevent="addArticleEditorTag()"
            />
            <button type="button" :disabled="articleEditorIsLocked" @click="addArticleEditorTag()">
              <iconify-icon icon="mdi:plus" width="18"></iconify-icon>
            </button>
          </div>
          <div class="article-editor-preset-tags">
            <small>常用标签：</small>
            <button
              v-for="tag in ['CSS', 'Vue', 'Python', 'TypeScript']"
              :key="tag"
              type="button"
              :disabled="articleEditorIsLocked"
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
              <input v-model.trim="articleEditorForm.seoTitle" placeholder="输入 Meta 标题" type="text" :disabled="articleEditorIsLocked" />
            </label>
            <label>
              <span>Meta 关键词</span>
              <input v-model.trim="articleEditorForm.seoKeywords" placeholder="关键词，用逗号分隔" type="text" :disabled="articleEditorIsLocked" />
            </label>
            <label>
              <span>搜索预览描述</span>
              <textarea v-model="articleEditorForm.seoDescription" placeholder="输入文章摘要，用于搜索引擎展示" rows="3" :disabled="articleEditorIsLocked"></textarea>
            </label>
          </div>
        </div>

        <div class="article-editor-setting-group article-editor-advanced-section">
          <h3>高级设置</h3>
          <label class="article-editor-toggle-row">
            <span>允许评论</span>
            <input v-model="articleEditorForm.allowComments" aria-label="允许评论" type="checkbox" :disabled="articleEditorIsLocked" />
          </label>
          <label class="article-editor-toggle-row">
            <span>置顶文章</span>
            <input v-model="articleEditorForm.pinned" aria-label="置顶文章" type="checkbox" :disabled="articleEditorIsLocked" />
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
            :disabled="articleEditorIsLocked"
          />

          <div v-if="articleEditorStatus === 'PENDING_REVIEW'" class="article-editor-state-banner">
            <iconify-icon icon="mdi:lock-outline" width="20"></iconify-icon>
            <span>文章已提交审核，当前为只读状态。需要修改时请先撤回到草稿。</span>
          </div>
          <div v-else-if="articleEditorStatus === 'REJECTED' && articleEditorReviewNote" class="article-editor-state-banner is-rejected">
            <iconify-icon icon="mdi:alert-circle-outline" width="20"></iconify-icon>
            <span>上次驳回原因：{{ articleEditorReviewNote }}</span>
          </div>

          <div class="article-editor-toolbar" aria-label="Markdown 工具栏">
            <button type="button" title="一级标题" :disabled="articleEditorIsLocked" @click="insertArticleEditorHeading(1)">H</button>
            <span></span>
            <button type="button" title="加粗" :disabled="articleEditorIsLocked" @click="insertArticleEditorInline({ before: '**', after: '**', placeholder: '加粗文本' })">
              <iconify-icon icon="mdi:format-bold" width="20"></iconify-icon>
            </button>
            <button type="button" title="斜体" :disabled="articleEditorIsLocked" @click="insertArticleEditorInline({ before: '*', after: '*', placeholder: '斜体文本' })">
              <iconify-icon icon="mdi:format-italic" width="20"></iconify-icon>
            </button>
            <button type="button" title="引用" :disabled="articleEditorIsLocked" @click="insertArticleEditorQuote">
              <iconify-icon icon="mdi:format-quote-open" width="20"></iconify-icon>
            </button>
            <button type="button" title="代码" :disabled="articleEditorIsLocked" @click="insertArticleEditorCode">
              <iconify-icon icon="mdi:code-tags" width="20"></iconify-icon>
            </button>
            <span></span>
            <button type="button" title="无序列表" :disabled="articleEditorIsLocked" @click="insertArticleEditorList(false)">
              <iconify-icon icon="mdi:format-list-bulleted" width="20"></iconify-icon>
            </button>
            <button type="button" title="有序列表" :disabled="articleEditorIsLocked" @click="insertArticleEditorList(true)">
              <iconify-icon icon="mdi:format-list-numbered" width="20"></iconify-icon>
            </button>
            <button type="button" title="插入链接" :disabled="articleEditorIsLocked" @click="insertArticleEditorLink">
              <iconify-icon icon="mdi:link-variant" width="20"></iconify-icon>
            </button>
            <button type="button" title="插入图片" :disabled="articleEditorIsLocked" @click="openArticleEditorImageModal">
              <iconify-icon icon="mdi:image-outline" width="20"></iconify-icon>
            </button>
            <div class="article-editor-more">
              <button
                type="button"
                title="更多"
                aria-haspopup="menu"
                :aria-expanded="articleEditorMoreMenuOpen"
                :disabled="articleEditorIsLocked"
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
            :disabled="articleEditorIsLocked"
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
        <button
          class="article-editor-footer-draft"
          type="button"
          :disabled="articleEditorSaving || articleEditorIsLocked"
          @click="saveArticleEditorDraft"
        >
          <iconify-icon icon="mdi:content-save-outline" width="20"></iconify-icon>
          <span>{{ articleEditorSaving ? "保存中" : "保存草稿" }}</span>
        </button>
        <small>{{ articleEditorHasUnsavedChanges ? "有未保存改动" : "当前内容已保存" }}</small>
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
          <button class="admin-refresh-button" type="button" :disabled="adminIsLoading" @click="refreshAdminCurrentTab">
            <iconify-icon icon="mdi:refresh" width="20"></iconify-icon>
            {{ adminIsLoading ? "刷新中" : "刷新数据" }}
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
                <p>敏感评论队列当前有 <strong>{{ adminRiskComments.length }}</strong> 条待处理</p>
                <time>实时</time>
              </div>
            </div>
          </section>
        </template>

        <template v-else-if="adminActiveTab === 'users'">
          <section class="admin-card admin-filter-card admin-user-filter-card">
            <div class="admin-filter-search">
              <iconify-icon icon="mdi:magnify" width="20"></iconify-icon>
              <input v-model.trim="adminUserFilters.q" placeholder="搜索用户名或邮箱..." type="search" @keydown.enter.prevent="loadAdminUsers" />
            </div>
            <select v-model="adminUserFilters.status" aria-label="状态筛选" @change="loadAdminUsers">
              <option value="">全部状态</option>
              <option value="active">正常</option>
              <option value="disabled">已禁用</option>
            </select>
            <select v-model="adminUserFilters.role" aria-label="角色筛选" @change="loadAdminUsers">
              <option value="">全部角色</option>
              <option value="USER">普通用户</option>
              <option value="ADMIN">管理员</option>
            </select>
            <button type="button" :disabled="adminUsersLoading" @click="loadAdminUsers">
              <iconify-icon icon="mdi:filter-outline" width="18"></iconify-icon>
              {{ adminUsersLoading ? "加载中" : "筛选" }}
            </button>
          </section>

          <section class="admin-card admin-table-card">
            <div class="admin-user-table admin-scroll-table">
              <div class="admin-user-row admin-user-head">
                <span>用户</span>
                <span>邮箱</span>
                <span>注册时间</span>
                <span>状态</span>
                <span>操作</span>
              </div>
              <div v-for="user in adminUserRows" :key="user.id" class="admin-user-row">
                <div class="admin-user-cell-main">
                  <span class="admin-user-avatar" :style="{ backgroundColor: user.color }">{{ user.username[0]?.toUpperCase() }}</span>
                  <div>
                    <strong>{{ user.username }}</strong>
                    <small>{{ user.roleLabel }} · {{ formatCompactNumber(user.stats.articleCount) }} 篇文章</small>
                  </div>
                </div>
                <span>{{ user.email }}</span>
                <span>{{ user.createdLabel }}</span>
                <span>
                  <mark :class="{ 'is-disabled': user.isDisabled }">{{ user.statusLabel }}</mark>
                </span>
                <div class="admin-user-actions">
                  <button class="view" type="button" :disabled="adminUserActionId === user.id" @click="openAdminUserPreview(user)">查看</button>
                  <button
                    v-if="user.role === 'USER'"
                    class="toggle"
                    type="button"
                    :disabled="adminUserActionId === user.id"
                    @click="updateAdminUserDisabled(user)"
                  >
                    {{ user.isDisabled ? "启用" : "禁用" }}
                  </button>
                  <button v-if="user.role === 'USER'" class="danger" type="button" :disabled="adminUserActionId === user.id" @click="deleteAdminUser(user)">删除</button>
                  <span v-else class="admin-muted-action">受保护</span>
                </div>
              </div>
              <p v-if="!adminUsersLoading && adminUserRows.length === 0" class="admin-empty-text admin-table-empty">暂无匹配用户。</p>
              <p v-if="adminUsersLoading" class="admin-empty-text admin-table-empty">正在加载用户...</p>
            </div>
            <footer class="admin-table-footer">
              <span>当前筛选显示 {{ adminUserRows.length }} 条，列表区域可滚动。</span>
              <span>仅普通用户可禁用或删除。</span>
            </footer>
          </section>
        </template>

        <template v-else-if="adminActiveTab === 'articles'">
          <section class="admin-card admin-filter-card admin-article-filter-card">
            <div class="admin-filter-search">
              <iconify-icon icon="mdi:magnify" width="20"></iconify-icon>
              <input v-model.trim="adminArticleFilters.q" placeholder="搜索标题、Slug 或作者..." type="search" @keydown.enter.prevent="loadAdminManagedArticles" />
            </div>
            <select v-model="adminArticleFilters.categoryId" aria-label="分类筛选" @change="loadAdminManagedArticles">
              <option value="">全部分类</option>
              <option v-for="category in categories" :key="category.id" :value="category.id">{{ category.name }}</option>
            </select>
            <select v-model="adminArticleFilters.status" aria-label="状态筛选" @change="loadAdminManagedArticles">
              <option value="">全部状态</option>
              <option value="published">已发布</option>
              <option value="archived">已下架</option>
            </select>
            <button type="button" :disabled="adminManagedArticlesLoading" @click="loadAdminManagedArticles">
              <iconify-icon icon="mdi:filter-outline" width="18"></iconify-icon>
              {{ adminManagedArticlesLoading ? "加载中" : "筛选" }}
            </button>
          </section>

          <section class="admin-card admin-review-card admin-managed-article-card">
            <div class="admin-card-header">
              <h2>
                <iconify-icon icon="mdi:file-document-multiple-outline" width="24"></iconify-icon>
                已发布文章管理
              </h2>
              <span>{{ adminManagedArticleRows.length }} 条结果</span>
            </div>
            <div class="admin-review-list admin-scroll-list">
              <article v-for="article in adminManagedArticleRows" :key="article.id" class="admin-review-item admin-managed-article-item">
                <div>
                  <h3>{{ article.title }}</h3>
                  <p>
                    作者：{{ article.author?.username || '未知用户' }}
                    · 分类：{{ article.category?.name || '未分类' }}
                    · {{ article.dateLabel }}
                  </p>
                  <div class="admin-risk-tags">
                    <span :class="{ reason: article.status === 'ARCHIVED' }">{{ article.statusLabel }}</span>
                    <span>{{ article.metricLabel }}</span>
                    <span v-for="tag in article.tags.slice(0, 3)" :key="tag.id">{{ tag.name }}</span>
                  </div>
                </div>
                <div class="admin-review-actions admin-managed-article-actions">
                  <button class="neutral" type="button" @click="openAdminManagedArticlePreview(article)">预览</button>
                  <button
                    v-if="article.status === 'PUBLISHED'"
                    class="offline"
                    type="button"
                    :disabled="adminArticleActionId === article.id"
                    @click="updateAdminManagedArticleStatus(article, 'ARCHIVED')"
                  >下架</button>
                  <button
                    v-else
                    class="approve"
                    type="button"
                    :disabled="adminArticleActionId === article.id"
                    @click="updateAdminManagedArticleStatus(article, 'PUBLISHED')"
                  >发布</button>
                  <button class="delete" type="button" :disabled="adminArticleActionId === article.id" @click="deleteAdminManagedArticle(article)">删除</button>
                </div>
              </article>
              <p v-if="!adminManagedArticlesLoading && adminManagedArticleRows.length === 0" class="admin-empty-text">暂无匹配文章。</p>
              <p v-if="adminManagedArticlesLoading" class="admin-empty-text">正在加载文章...</p>
            </div>
          </section>
        </template>

        <template v-else-if="adminActiveTab === 'review'">
          <section ref="adminReviewArticleSectionRef" class="admin-card admin-review-card">
            <div class="admin-card-header">
              <h2>
                <iconify-icon icon="mdi:file-document-check-outline" width="24"></iconify-icon>
                待审核文章
              </h2>
              <span>{{ adminReviewArticles.length }} 条待审</span>
            </div>
            <div class="admin-review-list">
              <article v-for="article in adminReviewArticles" :key="article.id" class="admin-review-item">
                <div>
                  <h3>{{ article.title }}</h3>
                  <p>
                    作者：{{ article.author?.username || '未知用户' }}
                    · 分类：{{ article.category?.name || '未分类' }}
                    · 提交时间：{{ formatDate(article.submittedAt || article.updatedAt) }}
                  </p>
                </div>
                <div class="admin-review-actions">
                  <button class="neutral" type="button" @click="openAdminReviewPreview(article)">预览</button>
                  <button
                    class="approve"
                    type="button"
                    :disabled="adminReviewActionId === article.id"
                    @click="approveAdminReviewArticle(article)"
                  >通过</button>
                  <button
                    class="reject"
                    type="button"
                    :disabled="adminReviewActionId === article.id"
                    @click="openAdminRejectDialog(article)"
                  >驳回</button>
                </div>
              </article>
              <p v-if="!adminReviewLoading && adminReviewArticles.length === 0" class="admin-empty-text">暂无待审核文章。</p>
              <p v-if="adminReviewLoading" class="admin-empty-text">正在加载待审核文章...</p>
            </div>
          </section>

          <section ref="adminReviewCommentSectionRef" class="admin-card admin-review-card">
            <div class="admin-card-header">
              <h2>
                <iconify-icon icon="mdi:comment-alert-outline" width="24"></iconify-icon>
                敏感评论
              </h2>
              <span>{{ adminRiskComments.length }} 条待处理</span>
            </div>
            <div class="admin-review-list">
              <article v-for="comment in adminRiskComments" :key="comment.id" class="admin-review-item admin-comment-risk-item">
                <div>
                  <p>{{ comment.content }}</p>
                  <div class="admin-risk-meta">
                    <strong>{{ comment.type === 'reply' ? '回复者' : '评论者' }}：{{ comment.author?.username || '未知用户' }}</strong>
                    <span>文章：{{ comment.article?.title || '未知文章' }}</span>
                    <span v-if="comment.replyToUser">回复 @{{ comment.replyToUser.username }}</span>
                    <time>{{ formatDate(comment.createdAt) }}</time>
                  </div>
                  <div class="admin-risk-tags">
                    <span v-for="reason in comment.moderation?.reasons || []" :key="reason" class="reason">{{ reason }}</span>
                    <span v-for="keyword in comment.moderation?.keywords || []" :key="keyword">{{ keyword }}</span>
                  </div>
                </div>
                <div class="admin-review-actions">
                  <button class="neutral" type="button" :disabled="adminReviewActionId === comment.id" @click="ignoreAdminRiskComment(comment)">忽略</button>
                  <button class="delete" type="button" :disabled="adminReviewActionId === comment.id" @click="deleteAdminRiskComment(comment)">删除</button>
                </div>
              </article>
              <p v-if="!adminReviewLoading && adminRiskComments.length === 0" class="admin-empty-text">暂无待处理敏感评论。</p>
              <p v-if="adminReviewLoading" class="admin-empty-text">正在加载敏感评论...</p>
            </div>
          </section>
        </template>

        <template v-else-if="adminActiveTab === 'taxonomy'">
          <section class="admin-card admin-filter-card admin-taxonomy-filter-card">
            <div class="admin-filter-search">
              <iconify-icon icon="mdi:magnify" width="20"></iconify-icon>
              <input v-model.trim="adminTaxonomyFilters.q" placeholder="搜索分类或标签..." type="search" @keydown.enter.prevent="loadAdminTaxonomies" />
            </div>
            <button type="button" :disabled="adminTaxonomyLoading" @click="loadAdminTaxonomies">
              <iconify-icon icon="mdi:filter-outline" width="18"></iconify-icon>
              {{ adminTaxonomyLoading ? "加载中" : "筛选" }}
            </button>
          </section>
          <section class="admin-taxonomy-grid">
            <article class="admin-card">
              <div class="admin-card-header">
                <h2>
                  <iconify-icon icon="mdi:folder-outline" width="24"></iconify-icon>
                  文章分类管理
                </h2>
              </div>
              <div class="admin-taxonomy-list admin-scroll-list">
                <div v-for="category in adminTaxonomyCategoryRows" :key="category.id" class="admin-taxonomy-item">
                  <div>
                    <span class="admin-taxonomy-dot" :style="{ backgroundColor: category.color }"></span>
                    <strong>{{ category.name }}</strong>
                    <small>{{ formatCompactNumber(category.articleCount) }} 篇文章使用</small>
                  </div>
                  <div>
                    <button type="button" :disabled="adminTaxonomyActionKey === `category:${category.id}`" @click="renameAdminCategory(category)"><iconify-icon icon="mdi:pencil-outline" width="18"></iconify-icon></button>
                    <button type="button" :disabled="adminTaxonomyActionKey === `category:${category.id}`" @click="deleteAdminCategory(category)"><iconify-icon icon="mdi:trash-can-outline" width="18"></iconify-icon></button>
                  </div>
                </div>
                <p v-if="!adminTaxonomyLoading && adminTaxonomyCategoryRows.length === 0" class="admin-empty-text">暂无分类。</p>
                <p v-if="adminTaxonomyLoading" class="admin-empty-text">正在加载分类...</p>
              </div>
              <form class="admin-inline-create" @submit.prevent="createAdminCategory">
                <input v-model.trim="adminCategoryForm.name" placeholder="新增分类名称..." type="text" />
                <button type="submit" :disabled="adminTaxonomyActionKey === 'category:create'">新增</button>
              </form>
            </article>

            <article class="admin-card">
              <div class="admin-card-header">
                <h2>
                  <iconify-icon icon="mdi:tag-outline" width="24"></iconify-icon>
                  文章标签管理
                </h2>
              </div>
              <div class="admin-tag-cloud admin-scroll-list">
                <span v-for="tag in adminTaxonomyTagRows" :key="tag.id" :style="{ '--tag-color': tag.color }">
                  {{ tag.name }}
                  <small>{{ formatCompactNumber(tag.articleCount) }}</small>
                  <button type="button" title="重命名标签" :disabled="adminTaxonomyActionKey === `tag:${tag.id}`" @click="renameAdminTag(tag)">
                    <iconify-icon icon="mdi:pencil-outline" width="15"></iconify-icon>
                  </button>
                  <button type="button" title="删除标签" :disabled="adminTaxonomyActionKey === `tag:${tag.id}`" @click="deleteAdminTag(tag)">
                    <iconify-icon icon="mdi:close" width="15"></iconify-icon>
                  </button>
                </span>
                <p v-if="!adminTaxonomyLoading && adminTaxonomyTagRows.length === 0" class="admin-empty-text">暂无标签。</p>
                <p v-if="adminTaxonomyLoading" class="admin-empty-text">正在加载标签...</p>
              </div>
              <form class="admin-inline-create" @submit.prevent="createAdminTag">
                <input v-model.trim="adminTagForm.name" placeholder="输入新标签名称..." type="text" />
                <button type="submit" :disabled="adminTaxonomyActionKey === 'tag:create'">新增</button>
              </form>
            </article>
          </section>
        </template>
      </section>
    </main>
  </template>

  <main
    v-else-if="!isUserPanelView && !isArticleEditorView"
    class="max-w-[1440px] mx-auto px-6 py-8 grid grid-cols-1 gap-8 items-start"
    :class="view === 'article' ? 'article-detail-shell' : view === 'search' ? 'search-page-layout' : 'lg:grid-cols-[320px_minmax(0,1fr)]'"
  >
    <!-- ===== 左侧操作区 (Sidebar) ===== -->
    <aside
      v-if="view === 'public' || (view === 'article' && selectedArticle)"
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
                      <img v-if="article.coverImageUrl" class="latest-article-cover-image" :alt="article.coverAlt || article.title" :src="assetUrl(article.coverImageUrl)" />
                      <iconify-icon v-else icon="mdi:file-document-edit-outline" width="48" class="text-orange-300"></iconify-icon>
                      <span v-if="article.isPinned" class="absolute top-4 right-4 px-2 py-1 bg-orange-500 text-white text-[10px] font-bold rounded-md shadow-sm">置顶</span>
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

      <template v-else-if="view === 'search'">
        <section class="search-page-shell">
          <div class="search-page-hero">
            <div>
              <span>Search</span>
              <h1>搜索文章</h1>
              <p>按标题、正文、分类或标签查找已发布内容。</p>
            </div>
            <form class="search-page-form" @submit.prevent="submitSearchPage">
              <iconify-icon icon="mdi:magnify" width="22"></iconify-icon>
              <input
                v-model.trim="searchPageInput"
                aria-label="搜索文章"
                placeholder="输入关键词、分类或标签"
                type="search"
              />
              <button type="submit">搜索</button>
            </form>
          </div>

          <div class="search-page-summary">
            <p v-if="searchQuery">
              “{{ searchQuery }}” 共找到 <strong>{{ searchResultRows.length }}</strong> 篇文章
            </p>
            <p v-else>输入关键词开始搜索。</p>
          </div>

          <section class="search-results-panel">
            <p v-if="searchLoading" class="search-empty-state">正在搜索...</p>
            <div v-else-if="searchQuery && searchResultRows.length === 0" class="search-empty-state">
              <iconify-icon icon="mdi:file-search-outline" width="46"></iconify-icon>
              <strong>没有匹配结果</strong>
              <span>换个关键词、分类或标签试试。</span>
            </div>
            <div v-else-if="!searchQuery" class="search-empty-state">
              <iconify-icon icon="mdi:magnify" width="46"></iconify-icon>
              <strong>搜索已发布文章</strong>
              <span>搜索范围包含标题、正文、分类和标签。</span>
            </div>
            <template v-else>
              <template v-for="article in searchResultRows" :key="article.id">
                <article class="search-result-card" @click="openArticle(article.slug)">
                  <div class="search-result-cover">
                    <img v-if="article.coverImageUrl" :alt="article.coverAlt || article.title" :src="assetUrl(article.coverImageUrl)" />
                    <iconify-icon v-else icon="mdi:file-document-edit-outline" width="34"></iconify-icon>
                  </div>
                  <div class="search-result-body">
                    <div class="search-result-meta">
                      <span>{{ article.categoryLabel }}</span>
                      <time>{{ article.dateLabel }}</time>
                    </div>
                    <h2>{{ article.title }}</h2>
                    <p>{{ article.summaryText }}</p>
                    <div class="search-result-footer">
                      <span>{{ article.authorLabel }}</span>
                      <span>{{ article.statsLabel }}</span>
                    </div>
                    <div v-if="article.tags?.length" class="search-result-tags">
                      <span v-for="tag in article.tags" :key="tag.id">{{ tag.name }}</span>
                    </div>
                  </div>
                </article>
              </template>
            </template>
          </section>
        </section>
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
              <img v-if="selectedArticle.coverImageUrl" :alt="selectedArticle.coverAlt || selectedArticle.title" :src="assetUrl(selectedArticle.coverImageUrl)" />
              <iconify-icon v-else icon="mdi:file-document-outline" width="58"></iconify-icon>
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

          <section ref="articleCommentsCardRef" class="article-comments-card">
            <div class="article-card-title">
              <iconify-icon icon="mdi:comment-outline" width="32"></iconify-icon>
              <h2>评论 ({{ commentTotalCount }})</h2>
            </div>
            <form v-if="selectedArticleAllowsComments && isAuthenticated && !activeReplyTarget" class="article-comment-form" @submit.prevent="submitComment">
              <textarea v-model.trim="commentForm.content" :disabled="postingComment" maxlength="2000" placeholder="写下你的评论..." required />
              <button :disabled="postingComment || !commentForm.content" type="submit">{{ postingComment ? "发布中..." : "发表评论" }}</button>
            </form>
            <div v-else-if="!selectedArticleAllowsComments" class="article-login-hint">
              该文章已关闭评论。
            </div>
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
                    <button v-if="selectedArticleAllowsComments" type="button" @click="startReply(comment)">
                      回复
                    </button>
                    <button v-if="isAdmin" type="button" @click="deleteComment(comment)">删除</button>
                  </div>

                  <form
                    v-if="selectedArticleAllowsComments && isAuthenticated && isReplyingTo(comment)"
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
                          <button v-if="selectedArticleAllowsComments" type="button" @click="startReply(comment, reply)">回复</button>
                          <button v-if="isAdmin" type="button" @click="deleteComment(reply)">删除</button>
                        </div>
                        <form
                          v-if="selectedArticleAllowsComments && isAuthenticated && isReplyingTo(comment, reply)"
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
