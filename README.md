# Private Blog System - 私有博客系统

一个本地全栈私有博客项目，前端使用 Vue 3 + Vite + Tailwind CSS，后端使用 Express + Prisma + MySQL。项目已经完成认证、文章发布、Markdown 渲染、图片上传、批量导入、评论、公开阅读页、公开搜索页、分类、标签、目录、首页排序、文章详情页新 UI、用户面板新 UI、独立发布新文章页面 UI、管理后台新 UI、用户/管理员工作台视觉统一与 CSS 变量暗色主题系统、文章编辑页旧版公共 UI 误渲染修复、真实阅读/点赞/收藏/热门排行统计能力、普通用户草稿投稿和管理员待审核队列、用户面板收藏/社交/安全闭环、管理员用户管理、分类标签管理、已发布文章管理、敏感评论审核真实接口、管理员审核待办通知铃铛，以及文章封面、SEO、高级设置的草稿到发布闭环。

## 当前状态

| 项目 | 状态 |
| --- | --- |
| 当前工作分支 | `main` |
| 最新 UI 工作 | 公开首页右侧栏完成收束：热门标签最多 9 个，最受欢迎固定高度并显示最多 5 篇，底部分类目录显示最多 5 个高频分类；公开搜索页、文章封面展示和编辑器元数据表单仍为最新完整链路 |
| 最新功能工作 | 公开筛选接口为分类和标签补充已发布文章使用数与创建时间；首页热门标签、底部分类目录按使用量排序，同数按创建时间先后排序；最受欢迎排行最多取 5 篇并沿用热度分规则 |
| 首页布局 | 最新发布按发布时间分页展示，每页 4 篇；左侧文章列表按文章序号显示；右侧保留热门标签、阅读趋势和最受欢迎，侧栏列表数量和高度已收束 |
| 文章排序 | `chapterOrder` 作为文章序号，新建默认总数 + 1，管理员可手动重排 |
| 发布时间 | `published_at` / `publishedAt` 保存首次发布时间，用于最新发布排序 |
| 统计与互动数据 | 新增 `article_stats`、`article_views`、`article_likes`、`article_favorites`、`site_visits`、`comment_likes`、`article_metric_events`、`user_notification_reads`、`security_audit_events`，以及 `users.is_disabled`、评论 `moderation_*` 审核字段和首页 `summary.visitTrend` 真实访问趋势 |
| 最近验证 | 2026-06-09：`ed39762` 提交前已执行 `npm test --workspace server`、`npm run build`、`node --env-file=.env.test ..\node_modules\prisma\build\index.js validate --schema prisma\schema.prisma`、`git diff --check`；后端测试 13/13 通过，Prisma 校验在真实工作区通过 |
| 合并状态 | `main` 本地包含 `ed39762 Polish public home sidebar lists`，当前领先 `origin/main` 1 个提交，尚未推送 |
| 交接文档 | `handoff.md` |

## 当前 UI 说明

- 首页是当前新 UI 的主视觉标准。
- 公开首页、登录/注册侧边栏、明暗色调切换已经是新 UI。
- 公开首页顶部品牌文字已补齐暗色模式可读性，暗色下 `MyBlog` 使用浅色、`Pro` 保持橙色强调。
- 管理员登录后，公开首页左侧用户信息卡片只显示“管理后台”和“退出”；“管理后台”占用普通用户“用户面板”的主按钮位置。
- 首页“最新发布”按发布时间分页展示，每页 4 篇。
- 最新发布分页采用稳定布局：桌面端固定两行两列四卡位，最后一页不足 4 篇时保留空位，分页位置不随文章数量上移。
- 最新发布文章卡片桌面端定高，长标题和长摘要会按固定行数截断；移动端保持自然高度。
- 登录态下公开首页左侧“文章列表”卡片高度为 `lg:h-[760px]`，用于和右侧“最受欢迎”区域底部对齐；未登录态保持 `lg:h-[620px]`。
- 首页右侧保留热门标签、阅读趋势和最受欢迎区域；热门标签最多展示 9 个，按已发布文章使用次数降序排列，同数按标签创建时间从早到晚排列。
- 阅读趋势图形已接入最近 7 日真实访问趋势；下方“今日阅读”和“总点赞”也已接入真实统计。
- “最受欢迎”已从静态占位改为真实热门排行，固定为较短卡片高度，最多展示 5 篇。
- 文章详情页已按首页风格重排为两栏：左侧为作者卡、目录、筛选文章和文章列表；中间为文章阅读主体。
- 详情页顶部保留 `MyBlog Pro`、返回、搜索框视觉预留、点赞/收藏/分享、暗色切换、通知和用户胶囊。
- 详情页阅读、点赞、评论指标条已接入真实统计。
- 详情页点赞/收藏为后端持久化状态，顶部与底部互动条同步；未登录点击会提示登录。
- 评论区主评论已接入真实点赞，评论作者本人不能点赞自己的评论，其他登录用户可点赞/取消。
- 评论区回复采用一层楼中楼：回复某条回复时仍归到主评论下，并显示“回复 @用户名”；默认展示 2 条回复，可展开/收起。
- 详情页目录只在当前文章存在 TOC 时显示，并位于作者卡和筛选文章之间。
- 详情页右侧栏已移除，热门标签和相关推荐不在详情页显示，主内容区域向右扩展。
- 移动端优先展示文章内容，左侧信息折叠为抽屉；抽屉内保留作者卡、目录、筛选和文章列表。
- 普通用户面板已重构为独立工作台 UI，不再使用公开首页左右栏；管理后台也已重构为独立后台 UI，不再通过 `.legacy-ui` 渲染。
- 用户面板顶部导航采用 `MyBlog Pro` 品牌、返回首页、明暗模式切换、通知未读状态和用户胶囊；退出登录保留在左侧栏底部。
- 用户面板左侧导航包含数据看板、我的文章、我的收藏、社交互动、安全设置；移动端使用抽屉式导航。
- 用户面板 `#dashboard` 已补齐暗色模式，顶部栏、左侧栏、卡片、表格、表单、空状态和占位图统一为深蓝灰工作台风格，并与管理后台暗色视觉对齐。
- 全站暗色模式已抽象为 `client/src/style.css` 中的 `:root` / `.dark` CSS 变量主题系统，统一页面底色、卡片面、表单面、边框、文本层级、阴影和语义色；浅色模式基本保持原有观感。
- 管理后台、用户面板、文章详情、发布编辑器、弹窗、遗留 UI 和常见 Tailwind 模板冲突色都已接入暗色变量基线，暗色下以中性深灰蓝为主，橙色仅用于激活态、按钮和提示等语义强调。
- 用户面板数据看板显示当前用户自己的文章总数、该用户文章的站内阅读、站内点赞、站内收藏，并展示相对昨日结束时总量的增量；低于 1% 的变化用数量显示，达到 1% 及以上用百分比显示。
- 用户面板数据看板已接入近 7 日阅读趋势和文章分类分布 ECharts 图表，统计范围为当前用户文章。
- “我的文章”已接真实文章列表，展示 `草稿`、`待审核`、`已发布`、`未通过` 状态；待审核文章允许撤回到草稿，普通用户只能删除自己的草稿和被驳回文章。
- “我的收藏”已接真实收藏列表，只返回当前用户收藏的已发布文章；支持搜索、分类筛选、最多 3 个真实分类统计卡、跳转阅读和取消收藏。
- “社交互动”已接真实数据：评论管理展示其他用户评论/回复当前用户文章的内容；消息通知从评论、文章点赞、文章收藏和评论点赞实时派生，并通过轻量已读表支持未读标记、单条已读和全部已读。
- “安全设置”已接真实表单：修改密码、手机号本地保存、微信/QQ/支付宝本地绑定标记、登录设备列表、会话注销、友好设备名称和最近安全活动。
- 普通用户面板顶部右侧“发布新文章”进入独立发布页面 `#article/new`，左侧导航不新增发布项。
- 发布页面顶部沿用用户面板导航视觉，提供“返回用户面板”、预览、发布、明暗切换、通知和用户胶囊。
- 发布页面采用桌面端左侧 sticky 文章设置栏 + 右侧 Markdown 专注写作区；移动端文章设置收进抽屉。
- 发布页面左侧设置面板按参考图重排标签、SEO 设置和高级设置，模块之间用分隔线与留白组织。
- 发布页面左侧设置栏在桌面端保持独立滚动，正文区按页面自然滚动。
- 发布页面写作区继续使用 `textarea`，正文输入区自动增高，不在正文框内部滚动。
- 发布页面工具栏已压缩为一行轻量工具栏，主工具栏支持 H1、加粗、斜体、引用、代码、列表、链接和图片插入；“更多”菜单支持 H1/H2/H3、分隔线、表格、数学公式模板和清除选区格式。
- 发布页面底部状态栏保持原来的整页底部位置：橙色“批量上传”、灰色“保存草稿”和轻量自动保存提示。
- 发布页面暗色模式已改为整页一致的深蓝灰写作主题，左侧设置区比正文区稍亮，主要依靠边框、轻阴影、层级色差和少量橘色强调保留纸张感。
- 高级设置中的“允许评论”“置顶文章”使用按钮式开关控件。
- 发布页面复用为 `#article/new` 新建入口和 `#article/edit/:id` 草稿/投稿编辑入口；当前已保存标题、正文、后端生成 slug、分类、标签、封面、SEO、高级设置和状态，底部批量上传仍按后续范围处理。
- 发布页面支持手动保存草稿、提交审核、撤回到草稿、删除可删除文章和未保存内容即时预览；不自动创建空草稿，不做真实自动保存，离开未保存内容时会提醒。
- 普通用户不能手动编辑 slug，后端自动生成并尽量保持稳定；提交审核前进行严格必填校验，保存草稿校验较宽松；提交后文章锁定，需撤回到草稿才能继续修改。
- 文章编辑页主路由已阻止公开首页主内容链路继续渲染，不会在编辑器下方再出现旧版用户页面 UI。
- 管理后台已重构为独立后台 UI，顶部导航沿用首页的 `MyBlog Pro` 品牌、明暗切换、通知和用户胶囊；管理员页面顶部不显示搜索框，布局宽度、左侧栏色彩和顶部栏图标/账号区已向用户面板对齐。
- 管理员账号的顶部通知图标已改为内容审核待办入口：待审核文章或敏感评论存在时显示红点；点击进入管理后台“内容审核”，优先定位待审核文章，无待审核文章时定位敏感评论。
- 管理后台左侧导航包含站点概览、用户管理、已发布文章、内容审核、分类标签；移动端使用抽屉式导航。
- 管理后台默认进入站点概览，统计卡尽量复用真实数据：注册账号数、文章数、评论数、今日访问。
- 管理后台“近7日访问趋势”使用 ECharts 柱状图，按 `Asia/Shanghai` 自然日展示 `MM-DD` 日期；匿名用户按 `visitorId` 去重，登录用户按 `userId` 去重，只统计首页和文章页访问。
- 管理后台“文章分类分布”使用 ECharts 环形图，基于已发布文章的真实分类聚合。
- 管理后台用户管理已接真实接口：支持后端搜索、状态/角色筛选、右侧抽屉查看用户详情、禁用/启用普通用户和硬删除普通用户；禁用会停用该用户活跃会话，登录和已有 token 都会被拦截。
- 管理后台已发布文章页已接真实接口：支持搜索、分类/状态筛选、预览、下架到 `ARCHIVED`、重新发布为 `PUBLISHED` 和删除；本轮不做编辑入口。
- 管理后台内容审核已接真实待审核文章队列，支持管理员预览、通过并发布、驳回并填写原因；历史审核记录暂未做完整管理。
- 管理后台敏感评论已从 UI 示例改为真实审核队列：评论创建时按本地规则写入 `FLAGGED`，后台可查看命中原因/关键词、忽略提示或删除评论/回复。
- 分类标签页已接真实接口，支持分类/标签新增、改名和删除；分类管理和标签管理各自独立滚动，互不拉伸；删除正在被文章使用的分类会将相关文章分类置空，删除正在被文章使用的标签会移除对应文章标签关联，前端会提示正在被使用，未被使用时直接删除。

## 功能概览

### 公开阅读体验

- 公开文章列表
- 首页精选文章
- 最新发布分页，每页 4 篇文章
- 按 `publishedAt` 排序的最新发布
- 按 `chapterOrder` 排序的文章序号列表
- 文章搜索
- 分类筛选
- 标签筛选
- 文章详情页渲染
- Markdown 生成目录 TOC
- 评论列表与一层回复
- 移动端响应式布局
- 首页最新发布分页已稳定实现，桌面端分页位置按四卡位区域固定

### 真实统计能力

- 文章阅读量真实计数
- 公开首页和文章详情访问计入“今日阅读”
- 阅读和站点访问按 `Asia/Shanghai` 自然日去重
- 匿名访客通过前端 `private-blog-visitor-id` 去重
- 登录用户通过用户身份去重
- 点赞必须登录，同一用户同一文章只能点赞一次，可取消
- 收藏必须登录，同一用户同一文章只能收藏一次，可取消
- 文章详情返回 `likedByMe` / `favoritedByMe`
- 文章详情指标显示真实阅读、点赞、评论
- 热门排行按综合热度分排序，仅包含已发布文章

热门排行分数：

```text
hotScore = views * 1 + likes * 5 + favorites * 8 + comments * 3
```

### 认证与会话

- 用户注册
- bcrypt 密码哈希
- JWT 登录
- 登录设备 `device_id`
- `user_sessions` 会话记录
- 超过 3 个活跃设备后自动淘汰旧会话
- 登录态校验和退出登录

### 用户面板

- 普通用户进入 `#dashboard` 后显示独立工作台布局
- 桌面端为顶部栏 + 左侧固定导航 + 主内容区
- 移动端为顶部栏 + 抽屉式导航 + 单列内容
- 数据看板显示“我的文章”、该用户文章的站内阅读、站内点赞、站内收藏，并显示相对昨日结束时总量的增量
- 近 7 日阅读趋势和文章分类分布使用 ECharts，数据范围为当前用户文章
- “我的文章”读取真实用户文章列表，状态包含 `草稿`、`待审核`、`已发布`、`未通过`
- 草稿和驳回文章可继续编辑或删除，待审核文章可撤回到草稿，已提交文章默认锁定编辑
- “我的收藏”读取真实收藏列表，仅展示仍为 `PUBLISHED` 的文章，支持取消收藏后刷新列表和统计
- “社交互动”读取其他用户对当前用户文章的评论/回复，并派生回复、文章被赞/收藏、评论被赞等互动通知
- “安全设置”接入真实修改密码、手机号本地保存、第三方本地绑定标记和登录设备注销

### 发布新文章页面

- 普通用户从用户面板顶部“发布新文章”按钮进入 `#article/new`
- 页面独立于用户面板 Tab，不在左侧导航新增入口
- 顶部导航沿用用户面板视觉，并提供返回用户面板、预览和发布按钮
- 主体为 Markdown 编辑器外观 + 真实 Markdown 语法插入工具栏
- 左侧设置包含文章封面、分类、标签、SEO 设置和高级设置
- 标签、SEO 设置和高级设置按参考图重新规划模块间距；SEO 标题为普通折叠标题，不再呈现输入框式边框
- 底部状态栏为细白底工具栏，高级设置使用按钮式开关
- 移动端默认显示编辑区，文章设置通过顶部设置按钮打开抽屉
- 当前不调用管理员文章接口；普通用户写作链路使用独立草稿/投稿 API。
- 当前已持久化标题、正文、slug、分类、标签、封面、SEO、高级设置和状态；底部批量上传仍按后续范围处理。
- 提供未保存内容即时预览，但不做真实自动保存；只有手动保存草稿或提交审核时才创建/更新数据库记录。

### 管理员文章能力

- 创建、编辑、发布、删除文章
- Markdown 原文存储
- 安全 HTML 渲染存储
- 图片上传到 `uploads/articles/{articleId}/`
- 图片上传接口返回可直接粘贴的 Markdown
- Markdown zip 批量导入
- 导入时复制本地图片并重写图片路径
- 导入结果包含成功、缺失图片、格式错误、失败文件日志
- `chapterOrder` 自动编号和手动重排
- 首次发布写入 `published_at`，再次发布不覆盖原首次发布时间

### 管理员后台

- `#admin` 显示独立后台工作台布局，不再使用公开首页左右栏。
- 顶部导航沿用首页品牌风格，但管理员页不显示搜索框。
- 站点概览展示真实注册账号数、文章数、评论数、今日访问。
- 近 7 日访问趋势来自只读管理员概览接口，按日期展示柱状图。
- 文章分类分布基于当前已发布文章分类聚合展示环形图。
- 用户管理已接真实列表、搜索、筛选、右侧抽屉查看、禁用/启用和普通用户硬删除。
- 已发布文章管理已接真实列表、搜索、分类筛选、预览、下架/重新发布和删除。
- 内容审核已接真实待审核文章队列，支持预览、通过发布和驳回原因。
- 分类标签管理已接真实新增、改名和删除。
- 敏感评论处理已接真实审核队列，支持查看命中原因/关键词、忽略和删除。
- 管理员当前主要负责审核和管理；撰写文章能力后续规划放到普通用户投稿流程中。

### 评论

- 匿名用户可读取评论
- 登录用户可发布评论
- 评论接口返回主评论 + 回复树形结构
- 回复采用一层楼中楼结构，回复的回复仍归属主评论，并通过 `reply_to_comment_id` 记录精确回复目标
- 默认展示 2 条回复，支持展开/收起
- 只有主评论支持点赞；回复不支持点赞
- 主评论作者本人不能点赞自己的评论，其他登录用户可点赞/取消
- 同一用户同一主评论只能点赞一次
- 管理员可删除评论
- 删除主评论时会删除其直接回复；删除回复只删除该回复
- 评论和回复都计入文章评论数和热门分

## 技术栈

| 层级 | 技术 |
| --- | --- |
| 前端 | Vue 3、Vite 5、Tailwind CSS |
| 后端 | Node.js、Express |
| 数据库 | MySQL 8 |
| ORM | Prisma |
| 认证 | JWT、bcrypt |
| Markdown | markdown-it、sanitize-html |
| 上传 | multer |
| 压缩包导入 | adm-zip |
| 测试 | Node.js test runner |

## 项目结构

```text
.
|-- client/
|   |-- src/
|   |   |-- App.vue
|   |   |-- main.js
|   |   `-- style.css
|   |-- index.html
|   |-- package.json
|   `-- vite.config.js
|-- server/
|   |-- prisma/
|   |   |-- migrations/
|   |   `-- schema.prisma
|   |-- src/
|   |   |-- config/
|   |   |-- lib/
|   |   |-- middleware/
|   |   |-- routes/
|   |   |-- app.js
|   |   `-- server.js
|   |-- test/
|   |-- uploads/
|   `-- package.json
|-- package.json
|-- README.md
`-- handoff.md
```

## 环境要求

- Node.js 20+
- npm 10+
- MySQL 8+

## 环境变量

复制 `server/.env.example` 为 `server/.env`，并按本机数据库实际配置调整。

```env
DATABASE_URL="mysql://root:password@localhost:3306/private_blog"
PORT=3000
CLIENT_URL="http://localhost:5173"
JWT_SECRET="replace-with-a-strong-secret"
JWT_EXPIRES_IN="7d"
```

测试环境使用 `server/.env.test`，默认连接 `private_blog_test`。

本地 MySQL 注意事项：

- 确保 `server/.env` 指向当前真正运行的 MySQL 实例。
- 不要让两个 MySQL 服务同时抢占 `3306`。
- 如果本机把 MySQL 默认端口改到 `3307`，也要同步修改 `DATABASE_URL`。

## 安装

在仓库根目录执行：

```bash
npm install
```

## 数据库迁移

生成 Prisma Client：

```bash
npm run prisma:generate
```

应用已有迁移：

```bash
npm run prisma:deploy
```

开发新迁移时使用：

```bash
npm run prisma:migrate -- --name your_migration_name
```

本项目当前包含 `published_at` 相关迁移、取消 `chapterOrder` 唯一索引的迁移、文章统计相关迁移、评论回复/评论点赞相关迁移、文章草稿投稿/审核状态相关迁移、用户面板绑定字段迁移、作者指标事件表迁移、用户通知已读/安全审计迁移、管理员用户禁用字段迁移、评论审核字段迁移，以及文章封面/SEO/高级设置元数据迁移。其他环境同步代码后需要执行迁移部署。

最近新增迁移：

```text
server/prisma/migrations/20260530120000_article_stats/migration.sql
server/prisma/migrations/20260531110000_comment_threads/migration.sql
server/prisma/migrations/20260605110000_article_submission_workflow/migration.sql
server/prisma/migrations/20260606110000_user_panel_bindings/migration.sql
server/prisma/migrations/20260606113000_article_metric_events/migration.sql
server/prisma/migrations/20260607100000_user_center_security_loop/migration.sql
server/prisma/migrations/20260607113000_admin_management_loop/migration.sql
server/prisma/migrations/20260608110000_comment_moderation_queue/migration.sql
server/prisma/migrations/20260608143000_article_editor_metadata/migration.sql
```

## 本地开发

同时启动前端和后端：

```bash
npm run dev
```

默认地址：

| 服务 | 地址 |
| --- | --- |
| 前端 | `http://localhost:5173` |
| 后端健康检查 | `http://localhost:3000/api/health` |

如果用户或其他进程已经占用 `3000` 或 `5173`，请不要直接关闭对方服务，改用其他端口进行临时验收。

如果前端显示“请求失败”且 Vite 日志出现 `ECONNREFUSED`，通常是后端 `3000` 未启动或已崩溃。若后端报错 `Cannot find module '.prisma/client/default'`，执行以下命令重新生成 Prisma Client：

```bash
npm run prisma:generate
```

该命令只生成本地 Prisma Client，不会修改数据库数据。

注意：本次统计 API 开发时曾遇到 Windows 上 Prisma Client DLL 被占用导致 `npm run prisma:generate` 失败。当前统计实现使用 raw SQL 访问新增表，不依赖生成后的新 Prisma Client 模型；等没有 Node/Prisma 进程占用时可再运行生成。

## 常用脚本

```bash
npm run dev
npm run dev:client
npm run dev:server
npm run build
npm run start
npm test --workspace server
```

## API 摘要

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`

### Articles

公开接口：

- `GET /api/articles`
- `GET /api/articles/filters`
- `GET /api/articles/popular?limit=5`
- `GET /api/articles/stats/summary`
- `GET /api/articles/:slug`
- `POST /api/articles/:slug/views`
- `POST /api/articles/site-visits`

登录用户互动接口：

- `POST /api/articles/:slug/likes`
- `DELETE /api/articles/:slug/likes`
- `POST /api/articles/:slug/favorites`
- `DELETE /api/articles/:slug/favorites`
- `POST /api/articles/uploads/images`（普通用户发布页草稿图片上传，支持多图，返回可插入的 Markdown）
- `GET /api/articles/me`
- `POST /api/articles/preview`（未保存内容即时预览，不创建文章记录）
- `GET /api/articles/drafts/:id`
- `POST /api/articles/drafts`
- `PATCH /api/articles/drafts/:id`
- `POST /api/articles/drafts/:id/submit`
- `POST /api/articles/drafts/:id/withdraw`
- `DELETE /api/articles/drafts/:id`

管理员接口：

- `GET /api/articles/admin/overview`
- `GET /api/articles/admin/list`
- `POST /api/articles/admin`
- `PATCH /api/articles/admin/:id`
- `POST /api/articles/admin/:id/publish`
- `DELETE /api/articles/admin/:id`
- `POST /api/articles/admin/:id/images`（旧管理端写作图片链路，当前新发布页不再使用）
- `POST /api/articles/admin/import`
- `GET /api/articles/admin/reviews`
- `POST /api/articles/admin/reviews/:id/approve`
- `POST /api/articles/admin/reviews/:id/reject`

管理员管理接口：

- `GET /api/admin/users`
- `PATCH /api/admin/users/:id/disabled`
- `DELETE /api/admin/users/:id`
- `GET /api/admin/taxonomies`
- `POST /api/admin/categories`
- `PATCH /api/admin/categories/:id`
- `DELETE /api/admin/categories/:id`
- `POST /api/admin/tags`
- `PATCH /api/admin/tags/:id`
- `DELETE /api/admin/tags/:id`
- `GET /api/admin/articles`
- `PATCH /api/admin/articles/:id/status`
- `DELETE /api/admin/articles/:id`
- `GET /api/admin/review-tasks/summary`
- `GET /api/admin/comments/moderation`
- `PATCH /api/admin/comments/:id/moderation/ignore`
- `DELETE /api/admin/comments/:id`

管理员管理边界：

- 只能禁用、启用或删除 `USER`，不能删除 `ADMIN`。
- 删除用户是硬删除，会连带删除该用户文章、评论、点赞、收藏、会话等关联数据；前端会要求输入用户名确认。
- 删除正在被文章使用的分类/标签允许继续执行；分类会从相关文章移除，标签会移除对应文章标签关联；前端会提示正在被文章使用并要求输入名称确认。未被文章使用的分类/标签可直接删除，不要求二次输入。
- 已发布文章管理不提供编辑入口；下架使用现有 `ARCHIVED` 状态，重新发布恢复为 `PUBLISHED`。
- 敏感评论队列使用本地关键词/规则检测，当前只处理 `FLAGGED` 队列、忽略和删除；暂不做完整历史审核记录或机器学习分类。

文章接口返回的统计字段：

```json
{
  "stats": {
    "viewCount": 0,
    "likeCount": 0,
    "favoriteCount": 0,
    "commentCount": 0,
    "likedByMe": false,
    "favoritedByMe": false
  }
}
```

创建或更新文章示例：

```json
{
  "title": "Hello Markdown",
  "slug": "hello-markdown",
  "chapterOrder": 1,
  "categoryName": "Guides",
  "tagNames": ["Markdown", "Vue"],
  "contentMarkdown": "# Heading\n\nArticle body"
}
```

### Comments

- `GET /api/comments/articles/:slug`
- `POST /api/comments/articles/:slug`
- `POST /api/comments/:id/likes`
- `DELETE /api/comments/:id/likes`
- `DELETE /api/comments/:id`

评论列表接口返回树形结构：

```json
{
  "comments": [
    {
      "id": 1,
      "content": "A useful comment",
      "likeCount": 1,
      "likedByMe": false,
      "replies": [
        {
          "id": 2,
          "parentId": 1,
          "replyToCommentId": 1,
          "content": "First reply",
          "replyToUser": {
            "username": "comment_user"
          }
        }
      ]
    }
  ],
  "count": 2
}
```

### Users

所有用户中心接口都需要登录，路由挂载在 `/api/users` 下：

- `GET /api/users/me/summary`
- `GET /api/users/me/favorites`
- `GET /api/users/me/comments`
- `GET /api/users/me/interactions`
- `PATCH /api/users/me/interactions/:key/read`
- `PATCH /api/users/me/interactions/read-all`
- `GET /api/users/me/sessions`
- `DELETE /api/users/me/sessions/:id`
- `PATCH /api/users/me/password`
- `PATCH /api/users/me/bindings`
- `GET /api/users/me/security-events`

边界说明：

- 收藏列表只返回当前用户收藏的已发布文章。
- 评论管理展示其他用户评论/回复当前用户文章的内容，不是展示自己发过的评论。
- 互动通知从现有评论、文章点赞、文章收藏和评论点赞实时派生，排除当前用户自己的动作；已读状态保存在 `user_notification_reads`，不复制通知正文。
- 第三方绑定只保存微信/QQ/支付宝本地标记，不代表已经完成真实 OAuth 授权。
- 修改密码成功后保留当前会话，停用其他会话。
- 会话列表返回 `deviceName`、浏览器、系统和设备类型等解析后的设备信息。
- 登录成功、已存在账号登录失败、退出登录、修改密码、注销会话和本地绑定变更会写入 `security_audit_events`，用户安全设置页展示最近 5 条安全活动。

## 测试与构建

后端测试：

```bash
npm test --workspace server
```

前端构建：

```bash
npm run build
```

当前后端测试覆盖认证、会话限制、文章创建、Markdown 安全渲染、图片上传、普通用户草稿/投稿/撤回/删除、未保存内容预览、管理员待审列表/通过/驳回、管理员审核待办汇总接口、批量导入、搜索/分类/标签、TOC、评论读取/创建/删除、评论回复、评论敏感检测队列/忽略/删除、评论点赞/取消、评论作者禁止自赞、回复禁止点赞、文章序号、首次发布时间、阅读去重、点赞/收藏登录限制、热门排行、全站 summary、用户面板收藏列表、收到的评论、互动通知、通知已读/未读、修改密码、会话管理、设备解析、手机号唯一性、本地绑定状态、安全审计、管理员用户禁用/硬删除、分类标签删除关联处理、已发布文章下架/重新发布等流程。

当前管理员审核待办通知铃铛工作已在 `codex/admin-review-notification-bell` 验证：

```bash
npm test --workspace server
npm run build
npx prisma validate --schema prisma/schema.prisma
git diff --check
```

说明：本轮新增 `/api/admin/review-tasks/summary` 轻量汇总接口，复用现有待审核文章和敏感评论队列数据。`prisma validate` 在默认沙箱仍会遇到 `EPERM: operation not permitted, lstat 'C:\Users\27871'`，按权限流程在真实工作区重跑后通过；`git diff --check` 仅输出 LF/CRLF 提示。

当前管理员真实管理功能已合并到 `main` 并验证：

```bash
npm test --workspace server
npm run build
node --env-file=.env.test ..\node_modules\prisma\build\index.js validate --schema prisma\schema.prisma
git diff --check
```

说明：本轮新增 `users.is_disabled`、评论 `moderation_*` 字段和 `/api/admin/*` 管理接口。开发库和测试库均已执行 `npm run prisma:deploy --workspace server` 或等效 `prisma migrate deploy`。`npm run prisma:generate --workspace server` 曾因 Windows Prisma Client DLL rename 被占用失败；新增禁用字段和评论审核字段运行时使用 raw SQL 读写，不阻塞当前功能。`prisma validate` 在默认沙箱曾遇到 `EPERM: operation not permitted, lstat 'C:\Users\27871'`，按权限流程在真实工作区重跑后通过。

最近用户中心安全闭环工作已合并到 `main`：

```bash
npm test --workspace server
npm run build
npx prisma validate --schema prisma/schema.prisma
git diff --check
```

说明：当前主线提交 `87053f7 Add user center security features` 已新增 `ua-parser-js`、`user_notification_reads`、`security_audit_events`、通知已读接口、设备解析 helper、安全审计 helper 和前端安全活动展示。新增后端用例覆盖默认未读、单条已读、全部已读、设备名称解析、登录/退出/改密/会话注销/绑定变更审计事件，以及最近安全活动查询。

最近用户面板功能工作已合并到 `main` 并验证：

```bash
npm test --workspace server
npm run build
git diff --check
npx prisma validate --schema prisma/schema.prisma
```

说明：本轮开发库和测试库迁移均已应用。`codex/user-panel-features` 已 fast-forward 合并进 `main` 并推送到 `origin/main`，本地功能分支已删除。合并后后端测试 10/10 通过。`npm run prisma:generate --workspace server` 曾在 Windows 上遇到 Prisma Client DLL rename 锁定问题，当前新增表访问使用 raw SQL，不依赖生成后的新 Prisma Client 模型；等没有 Node/Prisma 进程占用时可再运行生成。

最近文章草稿投稿与管理员审核工作已验证：

```bash
npm test --workspace server
npm run build
git diff --check
```

说明：本轮 `npm run prisma:generate`、`npm run prisma:deploy` 和测试库迁移在默认沙箱内遇到 `EPERM: operation not permitted, lstat 'C:\Users\27871'`，按权限流程重跑后已通过；`git diff --check` 仅输出 LF/CRLF 提示。

最近发布新文章页面 UI 工作已验证：

```bash
npm run build
```

最近用户面板 UI 工作已验证：

```bash
npm run build
git diff --check
```

说明：本轮尝试使用 in-app browser 验收时遇到 Windows sandbox `spawn setup refresh` 错误，已退回构建、HTTP 检查和命令行验证。临时前端预览曾使用 `http://127.0.0.1:5174/`，返回 200 后已停止。

最近评论区互动工作已验证：

```bash
npm test --workspace server
npm run build
git diff --check
node --env-file=.env.test ..\node_modules\prisma\build\index.js validate --schema prisma\schema.prisma
```

最近管理员后台新 UI 已验证：

```bash
npm test --workspace server
npm run build
git diff --check
```

## 管理员账号说明

新注册用户默认是 `USER`。如果需要立即测试文章发布，可在本地数据库中手动提升角色：

```sql
UPDATE users
SET role = 'ADMIN'
WHERE email = 'your-admin@example.com';
```

## 后续建议

- 敏感评论当前已接本地规则检测和后台处理队列；后续可补充更完整的规则配置、审核历史、批量处理和更细的风险等级。
- 管理后台用户管理后续可补充更细的用户详情、批量操作和管理员权限管理；当前仅允许管理 `USER`。
- 已发布文章管理后续可补充后台编辑入口、批量下架和审核历史联动；当前仅做列表、预览、上下架和删除。
- 公开首页阅读趋势已基于 `site_visits` 接入真实近 7 日趋势；后续可补充更细的访问来源、页面路径分布和趋势筛选。
- 投稿编辑器后续可继续补充底部批量上传、真实自动保存或更完整的审核历史；是否需要富文本体验可等 Markdown 投稿链路稳定后再评估 Tiptap / ProseMirror。
- 如需继续完善用户中心，可评估真实短信验证码、真实微信/QQ/支付宝 OAuth、通知精确定位/高亮、更完整的安全审计筛选和管理员全站安全审计后台。
- 补充评论分页、评论审核、删除主评论时递归清理历史多层回复。
- 将粉丝数、作者关注等静态展示接入真实后端模型。
