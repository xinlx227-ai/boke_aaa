# Handoff: codex-project-boke 当前状态

## 本次交接用途

本项目已经完成多轮主要工作：真实阅读/点赞/收藏/热门排行统计 API、评论区主评论点赞与一层回复、普通用户面板新 UI、独立发布新文章页面 UI、管理员后台新 UI、用户/管理员工作台视觉统一和暗色模式补齐、文章编辑页旧版公共 UI 误渲染修复、普通用户草稿投稿和管理员待审核队列，以及用户面板收藏、社交互动、安全设置和个人统计增量闭环。当前功能分支为 `codex/user-panel-features`，已提交 `8ccee52 完善用户面板功能与统计增量`，尚未合并到 `main`。

## 建议下个 Agent 使用的技能

- `handoff`：上下文再次接近上限时继续更新本文件。
- `browser:browser`：如用户要求打开、点击或验收本地页面时使用；此前 in-app browser / node_repl 在 Windows 上偶发 sandbox 错误，必要时可退回构建、HTTP 检查和命令行验证。
- `$grill-me`：用户继续要求追问设计方案或用该技能名时使用；遵循“一次只问一个问题，并给推荐答案”。

## 仓库与分支

- 仓库路径：`D:\project\codex-project-boke`
- 当前工作分支：`codex/user-panel-features`
- 基线主线：`main` / `origin/main` 当前在 `6f98e74 Update handoff and README`
- 远端：`origin https://gitee.com/xinlx227/my_first_blog.git`
- `codex/article-apiset`、`codex/comment-thread-interactions`、`codex/newuser-ui`、`articleedit-ui`、`codex/newadmin-ui`、`codex/someting-recover` 已合并进 `main` 并推送到 `origin/main`。
- 当前功能提交：`8ccee52 完善用户面板功能与统计增量`
- 当前工作区在文档收尾前是干净状态；`README.md` / `handoff.md` 会在本次 `$work-end` 中追加文档提交。

继续工作前建议先执行：

```bash
git status --short --branch
git log --oneline --decorate -6
git diff -- client/src/App.vue client/src/style.css server/src/routes/users.js server/src/routes/articles.js server/prisma/schema.prisma server/test/articles.test.js README.md handoff.md
git diff --check
```

## 用户约束与偏好

- 用户使用中文沟通，回答优先中文。
- 3000 端口是用户自己的后端服务；不要占用或关闭 3000。
- 如需临时启动前端验收，可使用 5174 或其他空闲端口，结束前停止临时服务。
- 用户此前明确说视觉截图可自行查看，不需要 Agent 主动截图。
- 不要泄露真实 token、密码、测试账号等敏感信息。
- 如果上下文快满，主动提示“快要超出上下文了”，并建议更新 `handoff.md`。

## 项目概况

这是一个 Vue 3 + Vite + Tailwind CSS 前端、Express + Prisma + MySQL 后端的私有博客系统。已具备认证、文章发布、Markdown 渲染、安全 HTML、图片上传、zip 批量导入、评论、公开阅读页、搜索、分类、标签、目录、首页排序、文章详情页新 UI、普通用户面板新 UI、独立发布新文章页面 UI、管理后台新 UI、文章编辑页路由隔离修复、真实阅读/点赞/收藏/热门排行统计能力、普通用户草稿投稿/管理员审核，以及用户面板收藏、社交互动、安全设置和个人统计增量闭环。

## 本次完成：完善用户面板功能与统计增量

工作分支：`codex/user-panel-features`。

功能提交：

- `8ccee52 完善用户面板功能与统计增量`

改动文件：

- `client/src/App.vue`
- `client/src/style.css`
- `server/src/routes/users.js`
- `server/src/routes/articles.js`
- `server/src/routes/index.js`
- `server/src/lib/auth.js`
- `server/prisma/schema.prisma`
- `server/prisma/migrations/20260606110000_user_panel_bindings/migration.sql`
- `server/prisma/migrations/20260606113000_article_metric_events/migration.sql`
- `server/test/articles.test.js`

### 后端与数据

- 新增 `server/src/routes/users.js`，挂载为 `/api/users`。
- 新增接口：`GET /api/users/me/summary`、`GET /api/users/me/favorites`、`GET /api/users/me/comments`、`GET /api/users/me/interactions`、`GET /api/users/me/sessions`、`DELETE /api/users/me/sessions/:id`、`PATCH /api/users/me/password`、`PATCH /api/users/me/bindings`。
- `users` 新增 `phone_number`、`wechat_bound`、`qq_bound`、`alipay_bound`；手机号唯一，第三方字段只表示本地绑定标记。
- `sanitizeUser` 已让 `/api/auth/me` 返回手机号和本地绑定状态。
- 新增 `article_metric_events`，用于记录当前用户文章的文章数、阅读、点赞、收藏增量事件。
- 文章发布/删除、有效阅读、点赞/取消、收藏/取消会记录作者维度指标事件；`summary.deltas` 按今日事件相对昨日结束时总量计算。
- 修改密码成功后保留当前会话并停用其他会话；会话注销若注销当前设备，前端会清理 token 并回到登录态。

### 前端用户面板

- 数据看板展示“我的文章”、该用户文章的站内阅读、站内点赞、站内收藏，并显示相对昨日结束时总量的增量；低于 1% 的变化显示数量，达到 1% 及以上显示百分比。
- 数据看板恢复并接入当前用户文章的近 7 日阅读趋势和文章分类分布 ECharts 图表。
- “我的收藏”接真实列表，只返回仍为 `PUBLISHED` 的收藏文章；支持搜索、分类筛选、最多 3 个真实分类统计卡、跳转阅读和取消收藏。
- “社交互动”中评论管理展示其他用户评论/回复当前用户文章的内容；消息通知从回复、文章被赞、文章被收藏、评论被赞等数据实时派生，排除当前用户自己的动作。
- “安全设置”接真实修改密码、手机号保存/清空、微信/QQ/支付宝本地绑定标记、登录设备列表和注销按钮。
- 用户面板 tab 切换懒加载对应数据；提交安全设置、取消收藏、注销设备后刷新相关列表和 summary。

### 边界

- 第一版不接短信服务，不接真实微信/QQ/支付宝 OAuth。
- 第一版不做通知已读/未读，不新增通知表。
- “我的文章”沿用上一轮已完成的真实投稿列表，本轮只做必要联动刷新。
- `npm run prisma:generate --workspace server` 曾在 Windows 上遇到 Prisma Client DLL rename 锁定问题；新增表访问使用 raw SQL，当前功能不依赖生成后的新 Prisma Client 模型。

### 验证

```bash
node --check server/src/routes/articles.js
node --check server/src/routes/users.js
node --check server/test/articles.test.js
npm test --workspace server
npm run build
git diff --check
npx prisma validate --schema prisma/schema.prisma
```

## 本次完成：文章草稿投稿与管理员审核流程

工作分支：`codex/article-drafts-submission`。

功能提交：

- `2207bab Add article submission review workflow`

改动文件：

- `client/src/App.vue`
- `client/src/style.css`
- `server/src/routes/articles.js`
- `server/prisma/schema.prisma`
- `server/prisma/migrations/20260605110000_article_submission_workflow/migration.sql`
- `server/test/articles.test.js`

### 阶段 1：用户草稿/投稿

- 复用 `articles` 表，`ArticleStatus` 扩展为 `DRAFT`、`PENDING_REVIEW`、`REJECTED`、`PUBLISHED`、`ARCHIVED`。
- `articles` 新增 `submitted_at`、`reviewed_at`、`reviewer_id`、`review_note`，并建立审核人外键。
- 普通用户写作入口复用发布页，新增 `#article/edit/:id` 作为草稿/投稿编辑入口。
- 不自动创建空草稿；只有手动保存草稿或提交审核时才创建/更新数据库记录。
- 阶段 1 只保存标题、正文、后端生成并尽量稳定的 slug、分类、标签和状态；封面、SEO、高级设置、批量上传继续是 UI 占位。
- 草稿校验宽松，提交审核校验严格；提交时会提醒用户提交后文章锁定。
- 提交后锁定编辑，待审核文章允许随时撤回到草稿；普通用户只能删除自己的草稿和被驳回文章。
- 用户面板“我的文章”已接真实列表，不再使用静态占位。
- 预览为未保存内容即时预览，走 `POST /api/articles/preview`，不会创建数据库记录。

### 阶段 2：管理员待审核队列

- 管理后台内容审核页接入真实 `PENDING_REVIEW` 队列。
- 管理员可在审核前预览文章正文。
- 通过审核会将文章置为 `PUBLISHED`，写入 `publishedAt`、`reviewedAt`、`reviewerId`，并公开可见。
- 驳回审核必须填写 `reviewNote`，文章置为 `REJECTED`，用户侧“我的文章”可看到驳回原因。
- 阶段 2 默认只做待审核队列；历史审核记录暂未做完整管理。

### 新增接口

- 用户接口：`GET /api/articles/me`
- 用户接口：`POST /api/articles/preview`
- 用户接口：`GET /api/articles/drafts/:id`
- 用户接口：`POST /api/articles/drafts`
- 用户接口：`PATCH /api/articles/drafts/:id`
- 用户接口：`POST /api/articles/drafts/:id/submit`
- 用户接口：`POST /api/articles/drafts/:id/withdraw`
- 用户接口：`DELETE /api/articles/drafts/:id`
- 管理员接口：`GET /api/articles/admin/reviews`
- 管理员接口：`POST /api/articles/admin/reviews/:id/approve`
- 管理员接口：`POST /api/articles/admin/reviews/:id/reject`

### 验证

```bash
npm test --workspace server
npm run build
git diff --check
```

说明：`npm run prisma:generate`、`npm run prisma:deploy` 和测试库迁移首次在默认沙箱内遇到 `EPERM: operation not permitted, lstat 'C:\Users\27871'`，按权限流程重跑后通过。`git diff --check` 只有 LF/CRLF 提示。本地已有 `http://localhost:5173` 和 `http://localhost:3000` 服务返回 200；未主动关闭用户已有进程。

## 本次完成：发布页 Markdown 工具栏真实插入与用户图片上传

工作分支：`codex/markdown-act`。

改动文件：

- `client/src/App.vue`
- `client/src/style.css`
- `server/src/routes/articles.js`
- `server/test/articles.test.js`
- `README.md`
- `handoff.md`

### 范围与行为

- 发布页工具栏不再只是占位：H 默认为 H1；加粗、斜体、引用、代码、无序/有序列表、链接会按当前选区包裹或插入占位文本，并选中占位文本方便继续输入。
- “更多”菜单新增 H1/H2/H3，并接入分隔线、表格、数学公式模板和清除选区格式。
- 图片按钮打开独立多图上传弹窗，UI 参考用户提供的“批量上传”弹窗风格；支持选择或拖拽多张图片，上传后按打开弹窗前的光标位置插入多行 Markdown 图片语法。
- 新增普通用户专用接口 `POST /api/articles/uploads/images`，只允许登录的非管理员用户上传，文件保存到 `server/uploads/article-drafts/{userId}/`，不写 `article_images` 表。
- 管理员不再负责新发布页写作链路。旧的 `POST /api/articles/admin/:id/images` 仅作为历史管理端图片接口保留，并已在代码中备注新发布页不再使用。

### 边界

- 本轮没有接入真实投稿、保存草稿、预览、发布、封面上传或底部“批量上传文章”功能。
- “数学公式”只插入 LaTeX 文本模板，当前 Markdown 渲染端仍未接 KaTeX/MathJax。
- 图片上传是真实文件上传，但当前属于普通用户草稿图片，不和正式文章记录关联；后续投稿后端完成后再决定迁移或绑定策略。

## 本次完成：文章编辑页旧版公共 UI 误渲染修复

工作分支：`main`，已提交并推送到 `origin/main`。

改动文件：

- `client/src/App.vue`

### 原因与修复

- 文章编辑页由 `isArticleEditorView` 分支渲染后，后面的主内容区又开启了另一套独立条件链。
- 当 `isArticleEditorView` 为 true 时，管理后台分支为 false，随后的公开首页 `v-else` 仍会命中，导致编辑器下方出现旧版用户页面 UI。
- 修复方式是在管理后台模板和公开首页主内容入口都排除 `isUserPanelView` 与 `isArticleEditorView`，保证用户面板和文章编辑页是完整独立页面，不再继续渲染公开首页主内容链路。

### 验证

```bash
npm run build
git diff --check
```

## 本次完成：用户/管理员工作台视觉统一与暗色模式补齐

工作分支：`codex/someting-recover`，已合并进 `main` 并推送到 `origin/main`。

改动文件：

- `client/src/App.vue`
- `client/src/style.css`
- `README.md`
- `handoff.md`

### 范围与设计决策

- 管理后台整体宽度从居中 1440px 容器调整为全宽工作台，视觉比例向普通用户面板对齐。
- 管理后台左侧栏、选中态、主内容留白、卡片圆角、阴影和按钮圆角向用户面板统一。
- 管理员顶部导航栏新增专属 `admin-topbar` 样式，右侧明暗切换、通知、分隔线和账号区改为与用户面板一致的圆形浅底图标和头像/文字结构。
- 管理员登录后，公开首页左侧用户信息卡片不再显示“用户面板”，只显示“管理后台”和“退出”；“管理后台”占用普通用户“用户面板”的主按钮位置。
- 普通用户面板 `#dashboard` 暗色模式已补齐，并与管理后台暗色风格统一为深蓝灰工作台：顶部栏、左侧栏、导航、统计卡片、占位图、表格、空状态、社交互动卡片、安全表单和绑定按钮都有暗色覆盖。
- 公开首页和管理员顶部栏的 `MyBlog Pro` 品牌文字补齐暗色可读性：暗色下 `MyBlog` 使用浅色，`Pro` 保持橙色强调。

### 边界

- 本轮只改前端 UI 和文档，不新增后端接口、不改数据库、不改权限模型。
- 用户面板中的“我的收藏”“社交互动”“安全设置”已接入真实接口；第三方账号绑定仍仅为本地状态标记。
- 管理后台用户管理、敏感评论、分类标签管理仍是 UI 占位和提示交互；内容审核后续已接真实待审核队列。

## 本次完成：管理员后台新 UI

工作分支：`codex/newadmin-ui`。

改动文件：

- `client/src/App.vue`
- `client/src/style.css`
- `server/src/routes/articles.js`
- `README.md`
- `handoff.md`

### 范围与设计决策

- 管理员页面风格参考 `C:\Users\27871\Desktop\myblog-pro_v5_admin-panel.html`，顶部导航栏以首页新 UI 为准。
- 管理后台进入 `#admin` 后使用独立后台布局，不再套公开首页的筛选栏和文章列表。
- 顶部导航保留 `MyBlog Pro` 品牌、明暗模式切换、通知占位和用户胶囊；管理员页顶部不显示搜索框。
- 左侧侧边栏保留，包含站点概览、用户管理、内容审核、分类标签。
- 默认进入站点概览。
- 管理员当前定位为审核和管理，不再参与撰写文章；未来撰写文章功能规划放在普通用户投稿流程中。

### 数据与占位边界

- 新增只读管理员概览接口：`GET /api/articles/admin/overview`。
- 概览统计卡尽量复用真实数据：注册账号数、文章数、评论数、今日访问。
- 近 7 日访问趋势使用 `site_visits`，按 `Asia/Shanghai` 自然日统计，只统计首页和文章页访问；匿名用户按 `visitorId` 去重，登录用户按 `userId` 去重。
- 近 7 日访问趋势横轴显示 `MM-DD`，不是周一到周日。
- 概览页图表使用 ECharts：访问趋势为柱状图，文章分类分布为环形图。
- 文章分类分布基于已发布文章分类聚合；分类标签页读取现有 `categories` / `tags` 展示。
- 用户管理页当前只做 UI：搜索、筛选、查看、禁用、删除按钮统一提示后续接入；未新增用户禁用状态字段或用户删除接口。
- 内容审核页当前只做 UI：待审核文章使用静态示例数据，通过/驳回按钮只提示后续接入投稿审核流程。
- “敏感评论”当前为 UI 示例，不是后端检测结果；忽略/删除按钮只提示后续接入。
- 分类标签新增、编辑、删除当前为 UI 占位。

### 图表切换修复

- 从用户管理或内容审核切回站点概览时，ECharts 实例可能仍绑定旧 DOM。
- 代码在离开概览时调用 `disposeAdminCharts()`，并在重新渲染前检查 `chart.getDom()` 是否仍为当前 ref；不一致时销毁并重新初始化。
- 本轮与 `main` 合并时，已保留用户面板、发布页的状态和 watcher，并合入管理员图表生命周期逻辑。

## 已完成：发布页专注写作体验

工作分支：`articleedit-ui`，已合并进 `main`。

- 独立发布页路由为 `#article/new`，并兼容 `#article-edit/new`、`#articleedit/new`。
- 页面仅允许普通登录用户进入；管理员不进入该投稿 UI。
- 桌面端使用左侧文章设置面板 + 右侧 Markdown 编辑区 + 底部状态栏；移动端设置面板收进抽屉。
- 正文编辑继续使用 `textarea`，输入、聚焦和视图切换时同步高度；正文框不做内部滚动。
- 工具栏已经支持真实 Markdown 插入；图片入口走普通用户草稿图片上传接口，不走管理员文章图片接口。
- 发布页暗色模式为整页一致的深蓝灰写作主题，左侧设置区比正文区稍亮。
- 封面、分类、标签、SEO、高级设置、预览、发布、批量上传、保存草稿仍为 UI 占位，不接真实投稿后端。

## 已完成：普通用户面板新 UI

工作分支：`codex/newuser-ui`，后续由 `articleedit-ui` 继承并已合并进 `main`。

- 用户面板进入 `#dashboard` 后使用独立工作台布局，不再套公开首页的左侧筛选栏。
- 顶部栏采用 `MyBlog Pro` 品牌 + 返回首页；右侧保留明暗模式切换、通知占位和用户胶囊。
- 侧边栏 Tab 为：数据看板、我的文章、我的收藏、社交互动、安全设置。
- 暗色模式已补齐，视觉与管理后台暗色风格对齐。
- 数据看板接入用户个人汇总：我的文章、该用户文章的站内阅读、站内点赞、站内收藏及相对昨日结束时总量的增量。
- 近 7 日阅读趋势和文章分类分布已使用 ECharts 接入当前用户文章数据。
- “我的文章”是未来投稿中心 UI 预演，状态为 `草稿`、`待审核`、`已发布`、`未通过`。
- “我的收藏”已接真实收藏列表并支持取消收藏。
- 社交互动已实现“收到的评论 + 收到的互动通知”，不是粉丝/关注或私信体系。
- “安全设置”已接修改密码、手机号、本地第三方绑定状态和登录设备管理。

## 当前 UI 与功能状态

- 首页是当前新 UI 的主视觉标准。
- 公开首页、登录/注册侧边栏、明暗色调切换已是新 UI。
- 首页“最新发布”按 `publishedAt` / `createdAt` 倒序分页展示，每页 4 篇。
- 最新发布分页桌面端固定两行两列四卡位，最后一页不足 4 篇时保留空位，分页位置不随文章数量上移。
- 文章详情页只保留左侧栏 + 中间正文两栏；右侧栏已移除。
- 详情页点赞/收藏已由前端本地状态改为后端持久化状态。
- 详情页评论区已支持主评论点赞、回复输入框、默认 2 条回复和展开/收起。
- 普通用户面板已重构为新 UI，不再通过 `.legacy-ui` 渲染。
- 普通用户面板暗色模式已补齐为深蓝灰工作台风格。
- 发布新文章页面已重构为独立专注写作 UI。
- 管理后台已改为独立新 UI：顶部导航按首页/用户面板新 UI，左侧保留站点概览、用户管理、内容审核、分类标签；管理员顶部搜索框已移除，布局宽度和侧栏色彩已向用户面板对齐。
- 管理后台站点概览已接入只读统计接口，近 7 日访问趋势为 ECharts 柱状图并显示 `MM-DD` 日期，文章分类分布为 ECharts 环形图。
- 管理后台用户管理、敏感评论、分类标签管理当前先做 UI 和提示交互；内容审核已接真实待审核队列。

## 后端与数据状态

- `published_at` / `publishedAt` 字段已合入，用于保存首次发布时间。
- 已有迁移：
  - `server/prisma/migrations/20260528162000_add_article_published_at/migration.sql`
  - `server/prisma/migrations/20260528163500_drop_article_chapter_order_index/migration.sql`
  - `server/prisma/migrations/20260530120000_article_stats/migration.sql`
  - `server/prisma/migrations/20260531110000_comment_threads/migration.sql`
  - `server/prisma/migrations/20260605110000_article_submission_workflow/migration.sql`
  - `server/prisma/migrations/20260606110000_user_panel_bindings/migration.sql`
  - `server/prisma/migrations/20260606113000_article_metric_events/migration.sql`
- 后端发布接口首次发布时写入 `published_at`，再次发布不覆盖原首次发布时间。
- `chapterOrder` 作为文章序号，新建默认当前文章总数 + 1；手动重排时会顺延其他文章。
- 评论区接口仍主要使用 Prisma raw SQL 访问新评论点赞表/新回复目标字段，以降低本机 Prisma Client 生成被 Windows DLL 占用时的阻塞风险；`schema.prisma` 和迁移已完整更新。
- 管理员概览接口和待审核队列接口新增在 `server/src/routes/articles.js`；待审核队列会读取 `PENDING_REVIEW` 文章。
- 普通用户草稿/投稿接口也在 `server/src/routes/articles.js`；保存草稿和提交审核都复用 `articles` 表。
- 用户中心接口新增在 `server/src/routes/users.js`；收藏、评论、互动通知、会话、密码和绑定状态都需要登录。

## 最近重要提交

- `8ccee52 完善用户面板功能与统计增量`：用户面板收藏、收到的评论、互动通知、安全设置、会话管理、绑定状态和个人统计增量。
- `2207bab Add article submission review workflow`：普通用户草稿投稿、即时预览、真实“我的文章”列表和管理员待审核队列。
- `b26de92 Implement markdown toolbar uploads`：发布页 Markdown 工具栏真实插入和普通用户草稿图片上传。
- `3e0fe4d Fix article editor route rendering`：修复文章编辑页下方误渲染旧版公共首页/用户页面 UI。
- `d96d90f Polish dashboard and admin dark UI`：用户/管理员工作台视觉统一、用户面板暗色模式补齐、首页/后台品牌暗色可读性修复。
- `02607fa Refactor admin dashboard UI`：管理员后台新 UI 和只读管理员概览统计接口。
- `83da31d 文章编辑页面`：发布页专注写作体验与文档更新，已合并进 `main`。
- `2414be6 Refactor user panel UI`：普通用户面板新 UI，已合并进 `main`。
- `ee60ec2 Update handoff after merging comment interactions`：评论互动合并后的文档提交。
- `5bb0079 comment`：评论互动文档更新。
- `7f683c9 Add threaded comment interactions`：评论区主评论点赞和一层回复。
- `1a2f29b Add article statistics APIs`：真实统计 API 和前端接入。

## 最近验证

最近用户面板功能工作已执行：

```bash
node --check server/src/routes/articles.js
node --check server/src/routes/users.js
node --check server/test/articles.test.js
npm test --workspace server
npm run build
git diff --check
npx prisma validate --schema prisma/schema.prisma
```

说明：本轮开发库和测试库迁移均已应用。`npm run prisma:generate --workspace server` 曾在 Windows 上遇到 Prisma Client DLL rename 锁定问题，当前新增表访问使用 raw SQL，不依赖生成后的新 Prisma Client 模型；等没有 Node/Prisma 进程占用时可再运行生成。

最近文章草稿投稿与管理员审核流程已执行：

```bash
npm test --workspace server
npm run build
git diff --check
```

最近文章编辑页路由修复已执行：

```bash
npm run build
git diff --check
```

最近 `codex/someting-recover` 合并完成后已执行：

```bash
npm test --workspace server
npm run build
git diff --check
node --env-file=.env.test ..\node_modules\prisma\build\index.js validate --schema prisma\schema.prisma
```

说明：`prisma validate` 首次在沙箱内遇到 `EPERM: operation not permitted, lstat 'C:\Users\27871'`，按权限流程重跑后通过。`git push origin main` 首次遇到 gitee 443 连接失败，按权限流程重试后成功。

此前评论区互动工作已执行上述命令并通过；管理员后台分支自身也已执行 `npm test --workspace server`、`npm run build`、`git diff --check` 并通过。

## 本地 MySQL 备注

- `private_blog` 数据库存在于 `MySQL80` 实例中。
- 另一个名为 `MySQL` 的服务曾占用或使用不同数据目录。
- 已把 `D:\developtool\mysql-8.0.25-winx64\my.ini` 中 `MySQL` 默认端口从 3306 改为 3307，并生成过备份 `my.ini.bak-20260529-142955`。
- 修改 Windows 服务 `MySQL` 为非开机自启动时遇到权限不足，需要管理员 PowerShell 执行：

```powershell
sc.exe config MySQL start= demand
```

不要在文档或回复中暴露真实数据库密码。

## 后端启动注意

- 若网页显示“请求失败”且 Vite 日志出现 `ECONNREFUSED`，先检查后端 `3000` 是否正在监听。
- 近期曾遇到后端因 Prisma Client 生成文件缺失而崩溃，错误为 `Cannot find module '.prisma/client/default'`；恢复方式是执行 `npm run prisma:generate`，这不会修改数据库数据。
- 曾尝试 `npm run prisma:generate`，在 Windows 上遇到 Prisma Client DLL rename 被占用：`query_engine-windows.dll.node.tmp... -> query_engine-windows.dll.node`。当前统计代码使用 raw SQL，不依赖生成后的新 Prisma Client 模型；等没有 Node/Prisma 进程占用时可再运行生成。

## 后续建议

- 如需继续完善用户中心，可评估通知已读/未读、真实短信验证码、真实微信/QQ/支付宝 OAuth、会话设备名称解析和更完整的安全审计。
- 投稿编辑器下一步建议接封面、SEO、高级设置、批量上传、真实自动保存或更完整的审核历史；是否需要富文本体验可等 Markdown 投稿链路稳定后再评估 Tiptap / ProseMirror。
- 将管理后台用户管理、敏感评论、分类标签管理接入真实后端接口；内容审核阶段 2 已完成待审核队列，历史审核记录暂未做完整管理。
- 基于 `site_visits` 做公开首页的真实趋势图；当前管理后台概览已用该数据做近 7 日访问柱状图，用户面板已接当前用户文章阅读趋势。
- 补充评论分页、评论审核，以及敏感词/敏感话题检测流程。
- 修复评论删除边界：删除主评论时递归清理历史多层回复，或先迁移历史 `parent_id` 到一层结构。
- 给 `comment_likes` 增加 `(user_id, comment_id)` 复合索引，优化用户态 `likedByMe` 查询。
- 将粉丝数、作者关注等继续接入真实后端模型。
