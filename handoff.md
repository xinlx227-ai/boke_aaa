# Handoff: codex-project-boke 当前状态

## 本次交接用途

本项目已经完成多轮主要工作：真实阅读/点赞/收藏/热门排行统计 API、评论区主评论点赞与一层回复、普通用户面板新 UI、独立发布新文章页面 UI，以及管理员后台新 UI。`codex/newadmin-ui` 已合并到 `main`，合并冲突已解决，验证已通过，`main` 已推送到 `origin/main`，本地已合并功能分支已清理。

## 建议下个 Agent 使用的技能

- `handoff`：上下文再次接近上限时继续更新本文件。
- `browser:browser`：如用户要求打开、点击或验收本地页面时使用；此前 in-app browser / node_repl 在 Windows 上偶发 sandbox 错误，必要时可退回构建、HTTP 检查和命令行验证。
- `$grill-me`：用户继续要求追问设计方案或用该技能名时使用；遵循“一次只问一个问题，并给推荐答案”。

## 仓库与分支

- 仓库路径：`D:\project\codex-project-boke`
- 当前主线分支：`main`
- 远端：`origin https://gitee.com/xinlx227/my_first_blog.git`
- `codex/article-apiset`、`codex/comment-thread-interactions`、`codex/newuser-ui`、`articleedit-ui`、`codex/newadmin-ui` 已合并进 `main` 并推送到 `origin/main`。
- 当前 `main` 与 `origin/main` 对齐，最新提交为 `dce4263 Merge admin dashboard UI`。
- 本地已合并功能分支已清理，当前只保留 `main`。

继续工作前建议先执行：

```bash
git status --short --branch
git log --oneline --decorate -6
git diff -- client/src/App.vue client/src/style.css server/src/routes/articles.js README.md handoff.md
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

这是一个 Vue 3 + Vite + Tailwind CSS 前端、Express + Prisma + MySQL 后端的私有博客系统。已具备认证、文章发布、Markdown 渲染、安全 HTML、图片上传、zip 批量导入、评论、公开阅读页、搜索、分类、标签、目录、首页排序、文章详情页新 UI、普通用户面板新 UI、独立发布新文章页面 UI、管理后台新 UI，以及真实阅读/点赞/收藏/热门排行统计能力。

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
- 工具栏保留标题、加粗、斜体、引用、代码、列表、链接、图片等入口，次要功能放入“更多”菜单占位。
- 发布页暗色模式为整页一致的深蓝灰写作主题，左侧设置区比正文区稍亮。
- 封面、分类、标签、SEO、高级设置、工具栏、预览、发布、批量上传、保存草稿均为 UI 占位，不接真实后端。

## 已完成：普通用户面板新 UI

工作分支：`codex/newuser-ui`，后续由 `articleedit-ui` 继承并已合并进 `main`。

- 用户面板进入 `#dashboard` 后使用独立工作台布局，不再套公开首页的左侧筛选栏。
- 顶部栏采用 `MyBlog Pro` 品牌 + 返回首页；右侧保留明暗模式切换、通知占位和用户胶囊。
- 侧边栏 Tab 为：数据看板、我的文章、我的收藏、社交互动、安全设置。
- 数据看板尽量接现有真实数据：站内文章数来自 `publishedArticles`，站内阅读/点赞/收藏来自 `siteSummary`。
- 近 7 日阅读趋势和文章分类分布当前为 CSS 占位图，代码中保留后续用 ECharts 接入真实数据的 TODO。
- “我的文章”是未来投稿中心 UI 预演，状态为 `草稿`、`待审核`、`已发布`、`未通过`。
- “我的收藏”“社交互动”“安全设置”目前是视觉与提示占位。
- 社交互动未来方向是“我的评论 + 收到的互动通知”，不是粉丝/关注或私信体系。

## 当前 UI 与功能状态

- 首页是当前新 UI 的主视觉标准。
- 公开首页、登录/注册侧边栏、明暗色调切换已是新 UI。
- 首页“最新发布”按 `publishedAt` / `createdAt` 倒序分页展示，每页 4 篇。
- 最新发布分页桌面端固定两行两列四卡位，最后一页不足 4 篇时保留空位，分页位置不随文章数量上移。
- 文章详情页只保留左侧栏 + 中间正文两栏；右侧栏已移除。
- 详情页点赞/收藏已由前端本地状态改为后端持久化状态。
- 详情页评论区已支持主评论点赞、回复输入框、默认 2 条回复和展开/收起。
- 普通用户面板已重构为新 UI，不再通过 `.legacy-ui` 渲染。
- 发布新文章页面已重构为独立专注写作 UI。
- 管理后台已改为独立新 UI：顶部导航按首页新 UI，左侧保留站点概览、用户管理、内容审核、分类标签；管理员顶部搜索框已移除。
- 管理后台站点概览已接入只读统计接口，近 7 日访问趋势为 ECharts 柱状图并显示 `MM-DD` 日期，文章分类分布为 ECharts 环形图。
- 管理后台用户管理、内容审核、敏感评论、分类标签管理当前先做 UI 和提示交互，不改数据库、不改审核流程。

## 后端与数据状态

- `published_at` / `publishedAt` 字段已合入，用于保存首次发布时间。
- 已有迁移：
  - `server/prisma/migrations/20260528162000_add_article_published_at/migration.sql`
  - `server/prisma/migrations/20260528163500_drop_article_chapter_order_index/migration.sql`
  - `server/prisma/migrations/20260530120000_article_stats/migration.sql`
  - `server/prisma/migrations/20260531110000_comment_threads/migration.sql`
- 后端发布接口首次发布时写入 `published_at`，再次发布不覆盖原首次发布时间。
- `chapterOrder` 作为文章序号，新建默认当前文章总数 + 1；手动重排时会顺延其他文章。
- 评论区接口仍主要使用 Prisma raw SQL 访问新评论点赞表/新回复目标字段，以降低本机 Prisma Client 生成被 Windows DLL 占用时的阻塞风险；`schema.prisma` 和迁移已完整更新。
- 管理员概览接口新增在 `server/src/routes/articles.js`，不新增迁移。

## 最近重要提交

- `02607fa Refactor admin dashboard UI`：管理员后台新 UI 和只读管理员概览统计接口。
- `83da31d 文章编辑页面`：发布页专注写作体验与文档更新，已合并进 `main`。
- `2414be6 Refactor user panel UI`：普通用户面板新 UI，已合并进 `main`。
- `ee60ec2 Update handoff after merging comment interactions`：评论互动合并后的文档提交。
- `5bb0079 comment`：评论互动文档更新。
- `7f683c9 Add threaded comment interactions`：评论区主评论点赞和一层回复。
- `1a2f29b Add article statistics APIs`：真实统计 API 和前端接入。

## 最近验证

本轮合并完成后已执行：

```bash
npm test --workspace server
npm run build
git diff --check
node --env-file=.env.test ..\node_modules\prisma\build\index.js validate --schema prisma\schema.prisma
```

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

- 给用户面板补后端能力：投稿/审核状态、我的文章真实列表、我的收藏列表、我的评论与互动通知、修改密码、手机绑定、第三方账号绑定。
- 发布页编辑器建议先实现 Markdown 工具栏真实插入语法；确认需要富文本写作体验后再接 Tiptap / ProseMirror。
- 将管理后台用户管理、内容审核、敏感评论、分类标签管理接入真实后端接口；当前只做 UI 和提示交互。
- 基于 `site_visits` 做公开首页和用户面板的真实趋势图；当前管理后台概览已用该数据做近 7 日访问柱状图。
- 补充评论分页、评论审核，以及敏感词/敏感话题检测流程。
- 修复评论删除边界：删除主评论时递归清理历史多层回复，或先迁移历史 `parent_id` 到一层结构。
- 给 `comment_likes` 增加 `(user_id, comment_id)` 复合索引，优化用户态 `likedByMe` 查询。
- 将粉丝数、作者关注等继续接入真实后端模型。
