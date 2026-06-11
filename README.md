# Private Blog System

一个面向个人写作、投稿审核和内容运营的全栈博客系统。项目不是简单的文章列表 Demo，而是一套已经打通公开阅读、用户投稿、管理员审核、内容管理、互动统计和安全设置的本地私有博客平台。

前端使用 Vue 3、Vite、Tailwind CSS 和 TipTap，后端使用 Express、Prisma 和 MySQL。正文以 Markdown 作为唯一权威存储，同时提供接近所见即所得的 TipTap 写作体验。

## 项目能做什么

### 公开读者

- 浏览首页、最新文章、热门文章、分类和标签。
- 阅读文章详情，查看目录、封面、阅读量、点赞数、收藏数和评论数。
- 搜索已发布文章，按标题、正文、分类和标签发现内容。
- 查看真实访问趋势和热门排行。
- 登录后点赞、收藏、评论和回复。

### 普通用户

- 注册、登录，并在独立用户工作台管理自己的内容。
- 创建草稿、手动保存、提交审核、撤回修改和删除可编辑文章。
- 使用 TipTap 编辑器写作，支持标题、引用、代码、列表、链接、图片、表格、数学公式和 raw HTML 占位块。
- 批量上传 `.md` / `.txt` 文件，一文件生成一篇草稿。
- 查看自己的文章、收藏、收到的评论、互动通知和安全活动。
- 管理登录设备、修改密码、本地绑定手机号和第三方账号标记。

### 管理员

- 查看站点概览、注册用户数、文章数、评论数和今日访问。
- 管理用户，支持搜索、筛选、禁用、启用和删除普通用户。
- 管理已发布文章，支持预览、下架、重新发布和删除。
- 审核普通用户投稿，支持通过发布和填写驳回原因。
- 处理敏感评论队列，支持查看命中原因、忽略提示和删除评论。
- 管理分类和标签，支持新增、改名和删除。

## 核心亮点

- **Markdown 是权威数据源**：文章正文始终保存为 `contentMarkdown`，便于迁移、备份和二次处理。
- **TipTap 即时编辑体验**：写作区支持结构化表格、数学公式、图片、链接、代码块和基础排版。
- **安全 HTML 保留**：复杂 HTML 会作为 raw HTML block 保留，公开渲染前由服务端白名单过滤。
- **完整投稿流程**：普通用户从草稿到提交审核，管理员从待审核队列到通过或驳回，流程闭环已经打通。
- **真实互动统计**：阅读、点赞、收藏、评论、热门排行和访问趋势都来自真实数据。
- **用户中心闭环**：收藏、评论、互动通知、会话设备、密码修改和安全审计都已接入真实接口。
- **管理员后台闭环**：用户管理、文章管理、分类标签、投稿审核和敏感评论审核都已落地。
- **统一暗色主题**：公开页、用户工作台、发布页、管理后台和弹窗共享 CSS 变量主题系统。

## 技术栈

| 层级 | 技术 |
| --- | --- |
| 前端 | Vue 3, Vite 5, Tailwind CSS 4, TipTap 3, KaTeX |
| 后端 | Node.js, Express |
| 数据库 | MySQL 8 |
| ORM | Prisma |
| 认证 | JWT, bcrypt |
| Markdown | markdown-it, sanitize-html |
| 上传与导入 | multer, adm-zip |
| 图表 | ECharts |
| 测试 | Node.js test runner |

## 功能地图

| 模块 | 已实现能力 |
| --- | --- |
| 公开首页 | 最新文章、热门标签、阅读趋势、最受欢迎、暗色模式、响应式布局 |
| 文章详情 | Markdown 渲染、TOC、封面、阅读统计、点赞、收藏、评论、移动端抽屉 |
| 搜索发现 | 公开搜索页、分类筛选、标签筛选、热门排行 |
| 投稿编辑器 | TipTap 写作、Markdown 存储、图片上传、表格、数学公式、raw HTML、即时预览 |
| 投稿流程 | 手动保存草稿、提交审核、撤回、删除、批量导入草稿、提交后锁定 |
| 用户工作台 | 数据看板、我的文章、我的收藏、社交互动、安全设置 |
| 管理后台 | 站点概览、用户管理、已发布文章管理、内容审核、分类标签管理 |
| 评论系统 | 主评论、一级回复、评论点赞、作者禁自赞、敏感评论队列 |
| 统计系统 | 阅读去重、点赞收藏统计、热门分、近 7 日趋势、作者数据 |
| 安全与会话 | JWT 登录、三设备限制、会话注销、密码修改、安全审计 |

## 项目结构

```text
.
|-- client/
|   |-- src/
|   |   |-- components/
|   |   |-- App.vue
|   |   |-- articleTiptapMarkdown.js
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
|   |   |-- lib/
|   |   |-- middleware/
|   |   |-- routes/
|   |   |-- app.js
|   |   `-- server.js
|   |-- test/
|   `-- package.json
|-- package.json
|-- README.md
`-- handoff.md
```

## 快速开始

### 环境要求

- Node.js 20+
- npm 10+
- MySQL 8+

### 安装依赖

```bash
npm install
```

### 配置环境变量

复制 `server/.env.example` 为 `server/.env`，并修改数据库连接。

```env
DATABASE_URL="mysql://root:password@localhost:3306/private_blog"
PORT=3000
CLIENT_URL="http://localhost:5173"
JWT_SECRET="replace-with-a-strong-secret"
JWT_EXPIRES_IN="7d"
```

测试环境使用 `server/.env.test`，默认连接 `private_blog_test`。

### 初始化数据库

```bash
npm run prisma:generate
npm run prisma:deploy
```

### 启动开发环境

```bash
npm run dev
```

默认地址：

| 服务 | 地址 |
| --- | --- |
| 前端 | `http://localhost:5173` |
| 后端健康检查 | `http://localhost:3000/api/health` |

## 常用命令

```bash
npm run dev
npm run dev:client
npm run dev:server
npm run build
npm run start
npm test --workspace server
```

## 验证状态

当前主线已经通过核心验证：

```bash
npm test --workspace server
npm run build
git diff --check
```

后端测试覆盖认证、文章发布、Markdown 安全渲染、TipTap Markdown 转换、图片上传、草稿投稿、投稿审核、批量导入、公开搜索、评论、敏感评论审核、统计、用户中心、安全设置和管理员管理等流程。

`npm run build` 当前会提示 TipTap / KaTeX 相关编辑器 chunk 大于 500 kB，这是已知构建警告，不影响构建结果。

## 主要 API

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`

### Articles

- `GET /api/articles`
- `GET /api/articles/filters`
- `GET /api/articles/popular?limit=5`
- `GET /api/articles/stats/summary`
- `GET /api/articles/:slug`
- `POST /api/articles/:slug/views`
- `POST /api/articles/site-visits`
- `POST /api/articles/:slug/likes`
- `DELETE /api/articles/:slug/likes`
- `POST /api/articles/:slug/favorites`
- `DELETE /api/articles/:slug/favorites`

### Drafts

- `GET /api/articles/me`
- `POST /api/articles/preview`
- `POST /api/articles/uploads/images`
- `POST /api/articles/drafts/import`
- `GET /api/articles/drafts/:id`
- `POST /api/articles/drafts`
- `PATCH /api/articles/drafts/:id`
- `POST /api/articles/drafts/:id/submit`
- `POST /api/articles/drafts/:id/withdraw`
- `DELETE /api/articles/drafts/:id`

### Admin

- `GET /api/articles/admin/overview`
- `GET /api/articles/admin/list`
- `POST /api/articles/admin`
- `PATCH /api/articles/admin/:id`
- `POST /api/articles/admin/:id/publish`
- `DELETE /api/articles/admin/:id`
- `GET /api/articles/admin/reviews`
- `POST /api/articles/admin/reviews/:id/approve`
- `POST /api/articles/admin/reviews/:id/reject`
- `GET /api/admin/review-tasks/summary`
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
- `GET /api/admin/comments/moderation`
- `PATCH /api/admin/comments/:id/moderation/ignore`
- `DELETE /api/admin/comments/:id`

### Comments

- `GET /api/comments/articles/:slug`
- `POST /api/comments/articles/:slug`
- `POST /api/comments/:id/likes`
- `DELETE /api/comments/:id/likes`
- `DELETE /api/comments/:id`

### Users

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

## 管理员账号

新注册用户默认是 `USER`。如果需要在本地测试管理员能力，可以在数据库中手动提升角色：

```sql
UPDATE users
SET role = 'ADMIN'
WHERE email = 'your-admin@example.com';
```

## 设计边界

- 正文以 Markdown 为唯一权威存储，TipTap 负责编辑体验，不追求源码逐字保真。
- 表格第一版面向标准 Markdown pipe table；复杂表格会作为 raw HTML block 保留。
- raw HTML 允许保留和编辑，但公开渲染前必须经过服务端白名单过滤。
- 投稿不做真实自动保存，只提供手动保存草稿和离开前未保存提醒。
- 文章提交审核后默认锁定，必须撤回到草稿后才能继续修改。
- 管理员审核目前聚焦待审核队列和敏感评论队列，不做完整历史审核管理。

## 后续方向

- 将 raw HTML 编辑入口从轻量 prompt 升级为正式源码模态框。
- 补充浏览器端表格、数学公式和 raw HTML 的可视化验收。
- 为管理员后台补充更完整的审核历史、批量操作和权限管理。
- 为评论系统补充分页、审核历史和更细的风险等级。
- 接入真实短信验证码和第三方 OAuth。

## 交接说明

更细的开发记录、历史决策、验证日志和下一轮建议见 `handoff.md`。
