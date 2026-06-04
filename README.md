# Private Blog System - 私有博客系统

一个本地全栈私有博客项目，前端使用 Vue 3 + Vite + Tailwind CSS，后端使用 Express + Prisma + MySQL。项目已经完成认证、文章发布、Markdown 渲染、图片上传、批量导入、评论、公开阅读页、搜索、分类、标签、目录、首页排序、文章详情页新 UI、用户面板新 UI、独立发布新文章页面 UI、管理后台新 UI、用户/管理员工作台视觉统一与暗色模式补齐、文章编辑页旧版公共 UI 误渲染修复，以及真实阅读/点赞/收藏/热门排行统计能力。

## 当前状态

| 项目 | 状态 |
| --- | --- |
| 当前工作分支 | `main` |
| 最新 UI 工作 | 普通用户面板新 UI、独立发布新文章页面 UI、管理员后台新 UI、用户/管理员工作台视觉统一和暗色模式补齐均已合并到 `main`；发布页为专注写作布局，管理后台为独立后台布局；文章编辑页下方旧版公共 UI 误渲染已修复 |
| 最新功能工作 | 阅读量、点赞、收藏、今日阅读、热门排行等已接入真实后端统计 API；评论区已支持主评论点赞和抖音式一层回复；管理员后台新增只读概览统计 API |
| 首页布局 | 最新发布按发布时间分页展示，每页 4 篇；左侧文章列表按文章序号显示；右侧保留热门标签、阅读趋势和最受欢迎 |
| 文章排序 | `chapterOrder` 作为文章序号，新建默认总数 + 1，管理员可手动重排 |
| 发布时间 | `published_at` / `publishedAt` 保存首次发布时间，用于最新发布排序 |
| 统计与互动数据 | 新增 `article_stats`、`article_views`、`article_likes`、`article_favorites`、`site_visits`、`comment_likes` |
| 最近验证 | 2026-06-04：发布页 Markdown 工具栏真实插入语法、普通用户多图上传并插入 Markdown 后，执行 `npm test --workspace server`、`npm run build`、`git diff --check`，均通过；此前修复文章编辑页旧版公共 UI 误渲染后执行 `npm run build`、`git diff --check`，均通过 |
| 合并状态 | `codex/article-apiset`、`codex/comment-thread-interactions`、`codex/newuser-ui`、`articleedit-ui`、`codex/newadmin-ui`、`codex/someting-recover` 均已合并并推送到 `origin/main`；本地已合并分支已清理，仅保留 `main` |
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
- 首页右侧保留热门标签、阅读趋势和最受欢迎区域。
- 阅读趋势图形第一版仍是视觉占位；下方“今日阅读”和“总点赞”已接入真实统计。
- “最受欢迎”已从静态占位改为真实热门排行。
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
- 用户面板顶部导航采用 `MyBlog Pro` 品牌、返回首页、明暗模式切换、通知占位和用户胶囊；退出登录保留在左侧栏底部。
- 用户面板左侧导航包含数据看板、我的文章、我的收藏、社交互动、安全设置；移动端使用抽屉式导航。
- 用户面板 `#dashboard` 已补齐暗色模式，顶部栏、左侧栏、卡片、表格、表单、空状态和占位图统一为深蓝灰工作台风格，并与管理后台暗色视觉对齐。
- 用户面板数据看板尽量复用现有真实统计：站内文章、阅读、点赞、收藏；近 7 日阅读趋势和文章分类分布暂用 CSS 占位，并在代码中保留后续接入 ECharts 的 TODO。
- “我的文章”按未来投稿流程预留 `草稿`、`待审核`、`已发布`、`未通过` 四种状态；当前只做 UI 占位，未新增后端 API。
- “我的收藏”“社交互动”“安全设置”当前为 UI 占位和提示交互，后续需要补收藏列表、我的评论/互动通知、修改密码/绑定手机/第三方绑定等接口。
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
- 发布页面的图片按钮已接普通用户草稿图片上传接口，支持多图上传并按光标位置插入 Markdown；封面、分类、标签、SEO、高级设置、预览、发布、批量上传和保存草稿仍为 UI 占位，不接真实投稿后端。
- 文章编辑页主路由已阻止公开首页主内容链路继续渲染，不会在编辑器下方再出现旧版用户页面 UI。
- 管理后台已重构为独立后台 UI，顶部导航沿用首页的 `MyBlog Pro` 品牌、明暗切换、通知和用户胶囊；管理员页面顶部不显示搜索框，布局宽度、左侧栏色彩和顶部栏图标/账号区已向用户面板对齐。
- 管理后台左侧导航包含站点概览、用户管理、内容审核、分类标签；移动端使用抽屉式导航。
- 管理后台默认进入站点概览，统计卡尽量复用真实数据：注册账号数、文章数、评论数、今日访问。
- 管理后台“近7日访问趋势”使用 ECharts 柱状图，按 `Asia/Shanghai` 自然日展示 `MM-DD` 日期；匿名用户按 `visitorId` 去重，登录用户按 `userId` 去重，只统计首页和文章页访问。
- 管理后台“文章分类分布”使用 ECharts 环形图，基于已发布文章的真实分类聚合。
- 管理后台用户管理当前为 UI 占位，搜索/筛选/查看/禁用/删除按钮只提示后续接入，未新增用户禁用或删除接口。
- 管理后台内容审核当前为 UI 占位：待审核文章使用静态示例数据，通过/驳回按钮只提示后续接入投稿审核流程。
- 管理后台敏感评论当前为 UI 示例，不是后端检测结果；忽略/删除按钮只提示后续接入。
- 分类标签页读取现有真实分类和标签展示，但新增、编辑、删除操作仍是 UI 占位。

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
- 数据看板显示站内文章、阅读、点赞、收藏等已有统计
- 近 7 日阅读趋势和文章分类分布为 CSS 占位图，代码中标注后续使用 ECharts 接入真实数据
- “我的文章”保留未来投稿中心 UI，状态规划为 `草稿`、`待审核`、`已发布`、`未通过`
- “我的收藏”“社交互动”“安全设置”保留完整视觉和占位提示，当前不提交真实后端请求

### 发布新文章页面

- 普通用户从用户面板顶部“发布新文章”按钮进入 `#article/new`
- 页面独立于用户面板 Tab，不在左侧导航新增入口
- 顶部导航沿用用户面板视觉，并提供返回用户面板、预览和发布按钮
- 主体为 Markdown 编辑器外观 + 真实 Markdown 语法插入工具栏
- 左侧设置包含文章封面、分类、标签、SEO 设置和高级设置
- 标签、SEO 设置和高级设置按参考图重新规划模块间距；SEO 标题为普通折叠标题，不再呈现输入框式边框
- 底部状态栏为细白底工具栏，高级设置使用按钮式开关
- 移动端默认显示编辑区，文章设置通过顶部设置按钮打开抽屉
- 当前不调用管理员文章接口；本轮仅新增普通用户草稿图片上传 API，真实投稿/草稿/审核后端仍未接入。

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
- 用户管理、内容审核、敏感评论处理、分类标签管理当前为 UI 占位和提示交互。
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

本项目当前包含 `published_at` 相关迁移、取消 `chapterOrder` 唯一索引的迁移、文章统计相关迁移，以及评论回复/评论点赞相关迁移。其他环境同步代码后需要执行迁移部署。

最近新增迁移：

```text
server/prisma/migrations/20260530120000_article_stats/migration.sql
server/prisma/migrations/20260531110000_comment_threads/migration.sql
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
- `GET /api/articles/popular?limit=3`
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

管理员接口：

- `GET /api/articles/admin/overview`
- `GET /api/articles/admin/list`
- `POST /api/articles/admin`
- `PATCH /api/articles/admin/:id`
- `POST /api/articles/admin/:id/publish`
- `DELETE /api/articles/admin/:id`
- `POST /api/articles/admin/:id/images`（旧管理端写作图片链路，当前新发布页不再使用）
- `POST /api/articles/admin/import`

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

## 测试与构建

后端测试：

```bash
npm test --workspace server
```

前端构建：

```bash
npm run build
```

当前后端测试覆盖认证、会话限制、文章创建、Markdown 安全渲染、图片上传、批量导入、搜索/分类/标签、TOC、评论读取/创建/删除、评论回复、评论点赞/取消、评论作者禁止自赞、回复禁止点赞、文章序号、首次发布时间、阅读去重、点赞/收藏登录限制、热门排行和全站 summary 等流程。

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

- 可将管理后台用户管理、内容审核、敏感评论、分类标签管理接入真实后端接口。
- 可基于 `site_visits` 做公开首页和用户面板的真实趋势图；当前公开首页阅读趋势图形仍有占位性质。
- 给用户面板补后端能力：用户投稿/审核状态、我的文章真实列表、我的收藏列表、我的评论与互动通知、修改密码和账号绑定。
- 发布页编辑器下一步可接真实草稿、投稿、预览和审核流程；是否需要富文本体验可等 Markdown 投稿链路稳定后再评估 Tiptap / ProseMirror。
- 补充评论分页、评论审核、删除主评论时递归清理历史多层回复。
- 将粉丝数、作者关注等静态展示接入真实后端模型。
