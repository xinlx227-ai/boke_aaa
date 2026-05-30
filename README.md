# Private Blog System - 私有博客系统

一个本地全栈私有博客项目，前端使用 Vue 3 + Vite + Tailwind CSS，后端使用 Express + Prisma + MySQL。项目已经完成认证、文章发布、Markdown 渲染、图片上传、批量导入、评论、公开阅读页、搜索/分类/标签/目录等基础能力；当前分支正在将文章详情页 UI 向首页风格统一。

## 当前状态

| 项目 | 状态 |
| --- | --- |
| 当前分支 | `codex/article-detail-ui` |
| 主要未提交改动 | `client/src/App.vue`、`client/src/style.css`、`README.md`、`codex-project-boke-handoff.md` |
| 最新 UI 工作 | 文章详情页已向首页统一，包含首页同款顶部导航骨架、左侧用户/筛选/文章列表、深色 hero、统计条、正文卡片、底部互动条、评论区、作者/目录/标签/推荐右栏和移动端抽屉 |
| 最近验证 | 2026-05-29：`npm run build` 通过 |
| 交接文档 | `codex-project-boke-handoff.md` |

注意：本仓库当前仍保留未提交的前端 UI 改动。继续开发前请先查看：

```bash
git status --short
git diff -- client/src/App.vue client/src/style.css
```

## 当前 UI 说明

- 首页是当前新 UI 的主视觉标准。
- 文章详情页已按首页风格重排为三栏：左侧复用首页用户信息、筛选文章和文章列表；中间为文章阅读主体；右侧为作者卡片、目录、热门标签和相关推荐。
- 详情页顶部保留 `MyBlog Pro`、返回、搜索框视觉预留、点赞/收藏/分享、暗色切换、通知和用户胶囊。
- 详情页点赞/收藏目前是前端本地状态，顶部与底部互动条同步；刷新后不会持久化。
- 移动端优先展示文章内容，左侧筛选折叠为抽屉，作者卡片/热门标签/目录卡隐藏，相关推荐放到评论区之后。
- 用户面板和管理后台仍是旧 UI，通过 `.legacy-ui` 隔离。

## 功能概览

### 公开阅读体验

- 公开文章列表
- 文章搜索
- 分类筛选
- 标签筛选
- 文章详情页渲染
- Markdown 生成目录 TOC
- 评论列表
- 移动端响应式布局

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

### 评论

- 匿名用户可读取评论
- 登录用户可发布评论
- 评论支持 `parent_id` 字段，为后续回复 UI 预留
- 管理员可删除评论

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
`-- codex-project-boke-handoff.md
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
- `GET /api/articles/:slug`

管理员接口：

- `GET /api/articles/admin/list`
- `POST /api/articles/admin`
- `PATCH /api/articles/admin/:id`
- `POST /api/articles/admin/:id/publish`
- `DELETE /api/articles/admin/:id`
- `POST /api/articles/admin/:id/images`
- `POST /api/articles/admin/import`

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

当前后端测试覆盖认证、会话限制、文章创建、Markdown 安全渲染、图片上传、批量导入、搜索/分类/标签、TOC、评论读取/创建/删除等流程。

## 管理员账号说明

新注册用户默认是 `USER`。如果需要立即测试文章发布，可在本地数据库中手动提升角色：

```sql
UPDATE users
SET role = 'ADMIN'
WHERE email = 'your-admin@example.com';
```

## 后续建议

- 让用户自行查看文章详情页桌面和移动端视觉效果，并按反馈微调。
- 继续改造用户面板和管理后台旧 UI。
- 将热门排行、阅读趋势、阅读量、点赞/收藏、作者粉丝、相关推荐等静态或本地展示对接真实统计 API。
- 补充分页、评论审核、嵌套回复 UI。
