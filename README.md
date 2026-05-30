# Private Blog System - 私有博客系统

一个本地全栈私有博客项目，前端使用 Vue 3 + Vite + Tailwind CSS，后端使用 Express + Prisma + MySQL。项目已经完成认证、文章发布、Markdown 渲染、图片上传、批量导入、评论、公开阅读页、搜索、分类、标签、目录、首页排序、文章详情页新 UI，以及真实阅读/点赞/收藏/热门排行统计能力。

## 当前状态

| 项目 | 状态 |
| --- | --- |
| 当前工作分支 | `codex/article-apiset` |
| 最新已合并 UI 工作 | `codex/article-detail-ui`、`codex/ui-layout`、`codex/index-layout` 均已合并到 `main` |
| 最新功能工作 | 阅读量、点赞、收藏、今日阅读、热门排行等已接入真实后端统计 API |
| 首页布局 | 最新发布按发布时间分页展示，每页 4 篇；左侧文章列表按文章序号显示；右侧保留热门标签、阅读趋势和最受欢迎 |
| 文章排序 | `chapterOrder` 作为文章序号，新建默认总数 + 1，管理员可手动重排 |
| 发布时间 | `published_at` / `publishedAt` 保存首次发布时间，用于最新发布排序 |
| 统计数据 | 新增 `article_stats`、`article_views`、`article_likes`、`article_favorites`、`site_visits` |
| 最近验证 | 2026-05-30：`npm test --workspace server`、`npm run build`、`git diff --check` 均通过 |
| 交接文档 | `handoff.md` |

## 当前 UI 说明

- 首页是当前新 UI 的主视觉标准。
- 公开首页、登录/注册侧边栏、明暗色调切换已经是新 UI。
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
- 详情页目录只在当前文章存在 TOC 时显示，并位于作者卡和筛选文章之间。
- 详情页右侧栏已移除，热门标签和相关推荐不在详情页显示，主内容区域向右扩展。
- 移动端优先展示文章内容，左侧信息折叠为抽屉；抽屉内保留作者卡、目录、筛选和文章列表。
- 用户面板和管理后台仍是旧 UI，通过 `.legacy-ui` 隔离。

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
- 评论列表
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

### 评论

- 匿名用户可读取评论
- 登录用户可发布评论
- 评论支持 `parent_id` 字段，为后续回复 UI 预留
- 管理员可删除评论
- 已通过统计 API 真实计入文章评论数和热门分

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

本项目当前包含 `published_at` 相关迁移、取消 `chapterOrder` 唯一索引的迁移，以及文章统计相关迁移。其他环境同步代码后需要执行迁移部署。

本次统计 API 新增迁移：

```text
server/prisma/migrations/20260530120000_article_stats/migration.sql
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

管理员接口：

- `GET /api/articles/admin/list`
- `POST /api/articles/admin`
- `PATCH /api/articles/admin/:id`
- `POST /api/articles/admin/:id/publish`
- `DELETE /api/articles/admin/:id`
- `POST /api/articles/admin/:id/images`
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
- `DELETE /api/comments/:id`

## 测试与构建

后端测试：

```bash
npm test --workspace server
```

前端构建：

```bash
npm run build
```

当前后端测试覆盖认证、会话限制、文章创建、Markdown 安全渲染、图片上传、批量导入、搜索/分类/标签、TOC、评论读取/创建/删除、文章序号、首次发布时间、阅读去重、点赞/收藏登录限制、热门排行和全站 summary 等流程。

本次统计 API 工作已验证：

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

- 基于 `site_visits` 做真实阅读趋势折线图；当前第一版只把趋势卡下方数字接真。
- 继续改造用户面板和管理后台旧 UI。
- 增加“我的收藏列表”，本次只实现收藏状态和计数。
- 补充分页、评论审核、嵌套回复 UI。
- 将粉丝数、作者关注等静态展示接入真实后端模型。
