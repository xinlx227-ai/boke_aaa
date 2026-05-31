# Handoff: codex-project-boke 当前状态

## 本次交接用途

用户已完成两轮功能开发：先将阅读量、点赞、收藏、热门排行等静态或本地展示接入真实后端统计 API；随后在其上继续开发评论区主评论点赞和抖音式一层回复。两个功能分支均已 fast-forward 合并到 `main` 并推送到 `origin/main`。本文件用于让下一位 Agent 在当前 `main` 上继续工作。

## 建议下个 Agent 使用的技能

- `handoff`：上下文再次接近上限时继续更新本文件。
- `browser:browser`：如用户要求打开、点击或验收本地页面时使用；此前 in-app browser / node_repl 在 Windows 上偶发 sandbox 错误，必要时可退回构建、HTTP 检查和命令行验证。
- `$grill-me`：用户继续要求追问设计方案或用该技能名时使用；遵循“一次只问一个问题，并给推荐答案”。

## 仓库与分支

- 仓库路径：`D:\project\codex-project-boke`
- 当前分支：`main`
- `main` 与 `origin/main` 在本次统计 API 开始前均指向 `b251ad6 Update homepage sidebar handoff notes`。
- `codex/article-apiset` 指向 `1a2f29b Add article statistics APIs`，基于 `main`。
- `codex/comment-thread-interactions` 指向 `5bb0079 comment`，基于 `codex/article-apiset`。
- 当前 `main` / `origin/main` 已指向 `5bb0079 comment`，包含统计 API、评论区互动和上一轮文档更新。
- 远端：`origin https://gitee.com/xinlx227/my_first_blog.git`
- 不要提交、回滚或覆盖用户自己的未提交改动；继续工作前先检查工作区。

当前分支结构：

```text
b251ad6 Update homepage sidebar handoff notes
└─ 1a2f29b Add article statistics APIs
   └─ 7f683c9 Add threaded comment interactions
      └─ 5bb0079 comment  (main, origin/main, codex/comment-thread-interactions)

codex/article-apiset -> 1a2f29b
```

继续工作前建议先执行：

```bash
git status --short --branch
git log --oneline --decorate -5
git diff -- client/src/App.vue client/src/style.css server/src/routes/comments.js server/prisma/schema.prisma
git diff -- README.md handoff.md
```

## 用户约束与偏好

- 用户使用中文沟通，回答优先中文。
- 3000 端口是用户自己的后端服务；不要占用或关闭 3000。
- 如需临时启动前端验收，可使用 5174 或其他空闲端口，结束前停止临时服务。
- 用户此前明确说视觉截图可自行查看，不需要 Agent 主动截图。
- 不要泄露真实 token、密码、测试账号等敏感信息。
- 如果上下文快满，主动提示“快要超出上下文了”，并建议更新 `handoff.md`。

## 项目概况

这是一个 Vue 3 + Vite + Tailwind CSS 前端、Express + Prisma + MySQL 后端的私有博客系统。已具备认证、文章发布、Markdown 渲染、安全 HTML、图片上传、zip 批量导入、评论、公开阅读页、搜索、分类、标签、目录、首页排序、文章详情页新 UI，以及真实阅读/点赞/收藏/热门排行统计能力。

## 本次已完成：评论区主评论点赞与一层回复

提交：`7f683c9 Add threaded comment interactions`；随后文档更新提交 `5bb0079 comment` 已一并合入 `main` / `origin/main`。

### 数据库与迁移

新增迁移：

- `server/prisma/migrations/20260531110000_comment_threads/migration.sql`

新增或调整：

- `comments.reply_to_comment_id`：记录精确回复目标；回复某条回复时仍归属主评论，但可显示“回复 @用户名”。
- `comment_likes`：主评论点赞明细表，主键为 `(comment_id, user_id)`，保证同一用户同一评论只能点赞一次。
- `schema.prisma` 已新增 `CommentLike`、`replyToCommentId`、`replyTo` / `targetedReplies` 关系。

本迁移已应用到测试库 `private_blog_test` 用于跑测试；开发库/线上库在使用前仍需对对应环境执行：

```bash
npm run prisma:deploy
```

### 评论规则

- 只有主评论支持点赞；回复不支持点赞。
- 主评论作者本人不能点赞自己的评论，其他登录用户可点赞/取消。
- 同一用户同一主评论只能点赞一次。
- 未登录用户点击评论点赞或回复时，前端提示登录，登录后回到文章，不自动补执行操作。
- 回复采用一层楼中楼：回复某条回复时，新回复仍挂到主评论下，并显示 `回复 @用户名`。
- 默认展示 2 条回复，支持展开/收起。
- 主评论和回复都计入文章评论数和热门分。
- 管理员可删除评论；删除主评论时删除其直接回复，删除回复时只删该回复。

安全审查备注：当前评论内容前端使用 Vue 插值渲染，不使用 `v-html`；评论接口 raw SQL 使用 Prisma tagged `$queryRaw` / `$executeRaw` 和 `Prisma.join`，未发现直接 SQL 注入点；认证使用 `Authorization: Bearer`，评论区 CSRF 风险较低；敏感操作使用 `POST` / `DELETE`，未使用 `GET`。待改进点：删除主评论时只清理直接回复，若历史数据存在多层 `parent_id`，可能留下孤儿回复；评论列表暂未分页，高评论量文章存在性能隐患。

### 后端 API

- `GET /api/comments/articles/:slug`：返回主评论 + 回复树形结构，并返回 `count`。
- `POST /api/comments/articles/:slug`：创建主评论或回复，需登录。
- `POST /api/comments/:id/likes`：点赞主评论，需登录；评论作者本人禁止点赞。
- `DELETE /api/comments/:id/likes`：取消主评论点赞，需登录。
- `DELETE /api/comments/:id`：管理员删除评论。

### 前端接入

- `client/src/App.vue`：评论区改为树形渲染，评论标题显示主评论 + 回复总数。
- 主评论显示真实点赞数和点赞状态；作者本人点赞按钮置灰。
- 回复只显示“回复/删除”，不显示点赞。
- 回复输入框在被回复的评论/回复下方展开。
- `client/src/style.css`：新增楼中楼回复列表、回复输入框、点赞状态、暗色模式和移动端样式。

## 本次已完成：真实统计 API

### 数据库与迁移

新增迁移：

- `server/prisma/migrations/20260530120000_article_stats/migration.sql`

新增统计相关模型和表：

- `article_stats`：文章统计汇总，包含 `view_count`、`like_count`、`favorite_count`。
- `article_views`：文章阅读明细，用于自然日去重。
- `article_likes`：用户点赞明细，同一用户同一文章唯一。
- `article_favorites`：用户收藏明细，同一用户同一文章唯一。
- `site_visits`：公开首页和文章详情访问明细，用于“今日阅读”。

迁移已应用到本地开发库 `private_blog` 和测试库 `private_blog_test`。

### 统计规则

- 阅读量：打开文章详情页时写入，按 `Asia/Shanghai` 自然日去重。
- 匿名阅读：前端生成 `private-blog-visitor-id` 并通过 `visitorId` / `X-Visitor-Id` 传给后端。
- 登录阅读：按用户身份计数。
- 今日阅读：统计公开首页和文章详情访问，不统计登录/注册、用户面板、管理后台。
- 点赞和收藏：必须登录；同一用户同一文章只能点赞/收藏一次，可取消。
- 未登录点击点赞/收藏：提示先登录，进入登录视图，登录后回到原文章，不自动补执行操作。
- 热门排行：只包含 `PUBLISHED` 文章，按综合热度分排序：

```text
hotScore = views * 1 + likes * 5 + favorites * 8 + comments * 3
```

- 详情页指标条只显示阅读、点赞、评论，不显示收藏数。
- 收藏列表本次未做。
- 旧静态假数据未迁移，真实统计从 0 开始；评论数来自真实 `APPROVED` 评论。

### 后端 API

新增或增强：

- `GET /api/articles`：文章列表返回 `stats`。
- `GET /api/articles/:slug`：文章详情返回 `stats` 和个人状态。
- `POST /api/articles/:slug/views`：记录文章阅读。
- `POST /api/articles/:slug/likes`：点赞，需登录。
- `DELETE /api/articles/:slug/likes`：取消点赞，需登录。
- `POST /api/articles/:slug/favorites`：收藏，需登录。
- `DELETE /api/articles/:slug/favorites`：取消收藏，需登录。
- `POST /api/articles/site-visits`：记录公开首页访问。
- `GET /api/articles/stats/summary`：返回今日阅读、全站总点赞等。
- `GET /api/articles/popular?limit=3`：返回热门文章排行。

`stats` 形状：

```json
{
  "viewCount": 0,
  "likeCount": 0,
  "favoriteCount": 0,
  "commentCount": 0,
  "likedByMe": false,
  "favoritedByMe": false
}
```

实现备注：本次后端统计逻辑使用 Prisma raw SQL 访问新增统计表，避免本机 Prisma Client 生成时被 Windows DLL 锁占用影响开发；`schema.prisma` 和迁移仍已完整更新。

### 前端接入

- 移除详情页阅读数、点赞数、收藏状态、热门排行、阅读趋势下方数字的静态/本地展示。
- 详情页阅读/点赞/评论指标条改为真实数据。
- 顶部与底部点赞/收藏按钮同步后端 `likedByMe` / `favoritedByMe`。
- 点赞/收藏使用乐观更新，失败时回滚并提示。
- 右侧“阅读趋势”图形仍为第一版视觉占位；下方“今日阅读”和“总点赞”改为真实 summary 数据。
- 右侧“最受欢迎”改为真实热门排行，点击可进入文章详情。
- 作者卡“获赞”改为当前作者已发布文章真实点赞数；粉丝仍是静态展示。

## 当前 UI 与功能状态

- 首页是当前新 UI 的主视觉标准。
- 公开首页、登录/注册侧边栏、明暗色调切换已是新 UI。
- 首页“最新发布”按 `publishedAt` / `createdAt` 倒序分页展示，每页 4 篇。
- 最新发布分页来自 `codex/index-layout`，桌面端固定两行两列四卡位，最后一页不足 4 篇时保留空位，分页位置不随文章数量上移。
- 最新发布文章卡片桌面端定高，标题和摘要通过固定行数截断；移动端保持自然高度。
- 首页左侧文章列表按 `chapterOrder` 升序显示。
- 登录态下公开首页左侧“文章列表”卡片使用 `lg:h-[760px]`，未登录态保持 `lg:h-[620px]`。
- 首页右侧保留热门标签、阅读趋势、最受欢迎，其中统计数据已接入真实 API。
- 文章详情页只保留左侧栏 + 中间正文两栏；右侧栏已移除。
- 详情页左侧栏为紧凑作者卡、条件显示的目录、筛选文章、文章列表。
- 详情页点赞/收藏已由前端本地状态改为后端持久化状态。
- 详情页评论区已支持主评论点赞、回复输入框、默认 2 条回复和展开/收起。
- 移动端详情页优先正文，左侧内容折叠为抽屉。
- 用户面板和管理后台仍为旧 UI，通过 `.legacy-ui` 隔离。

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

## 最近重要提交

- `5bb0079 comment`：上一轮 README/handoff 文档更新，当前 `main` / `origin/main` / `codex/comment-thread-interactions`。
- `7f683c9 Add threaded comment interactions`：当前 `codex/comment-thread-interactions`，新增评论区主评论点赞、评论回复树形结构、回复 UI、`comment_likes` 迁移和测试。
- `1a2f29b Add article statistics APIs`：`codex/article-apiset`，新增阅读/点赞/收藏/热门排行真实统计 API 和前端接入。
- `b251ad6 Update homepage sidebar handoff notes`：本次统计 API 开始前的 `HEAD` / `main` / `origin/main`。
- `60074c7 Update handoff after index layout merge`：首页侧栏交接更新。
- `d461d5b Merge index layout updates into main`：将 `codex/index-layout` 合并进 `main`。
- `b328f4e Add stable homepage latest pagination`：稳定首页最新发布分页、四卡位占位和文章卡片定高。
- `c07cac4 Update article detail UI`：文章详情页 UI 调整。

## 最近验证

评论区互动工作已执行：

```bash
npm test --workspace server
npm run build
git diff --check
node --env-file=.env.test ..\node_modules\prisma\build\index.js validate --schema prisma\schema.prisma
```

结果均通过。

还执行过本地前端临时预览：

- 使用 `http://127.0.0.1:5174/`。
- `Invoke-WebRequest http://127.0.0.1:5174/` 返回 200。
- 临时 Vite 进程已停止，未占用用户的 `3000` 后端端口。

数据库迁移状态：

```bash
node --env-file=.env.test ..\node_modules\prisma\build\index.js migrate deploy --schema prisma\schema.prisma
```

上述命令已将 `20260531110000_comment_threads` 应用到测试库 `private_blog_test`。本轮未对开发库或线上库执行 `npm run prisma:deploy`；使用评论区新功能前需在对应环境执行迁移。

分支合并与推送状态：

- `codex/article-apiset` 已 fast-forward 合并到 `main`，并推送 `origin/main` 到 `1a2f29b`。
- `codex/comment-thread-interactions` 已 fast-forward 合并到 `main`，并推送 `origin/main` 到 `5bb0079`。

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
- 本次曾尝试 `npm run prisma:generate`，在 Windows 上遇到 Prisma Client DLL rename 被占用：`query_engine-windows.dll.node.tmp... -> query_engine-windows.dll.node`。当前统计代码使用 raw SQL，不依赖生成后的新 Prisma Client 模型；等没有 Node/Prisma 进程占用时可再运行生成。

## 后续建议

- 可继续改造用户面板和管理后台旧 UI。
- 可基于 `article_stats` 和 `site_visits` 做真实阅读趋势折线图；第一版目前只把趋势卡下方数字接真。
- 可做“我的收藏列表”，本次只实现收藏状态和计数。
- 可补充评论分页、评论审核。
- 可修复安全审查中提到的评论删除边界：删除主评论时递归清理历史多层回复，或先迁移历史 `parent_id` 到一层结构。
- 可给 `comment_likes` 增加 `(user_id, comment_id)` 复合索引，优化用户态 `likedByMe` 查询。
- 可将粉丝数、作者关注等继续接入真实后端模型。
