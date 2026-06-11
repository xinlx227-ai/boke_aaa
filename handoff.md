# Handoff: codex-project-boke 当前状态

## 2026-06-10 最新快照：TipTap 表格、数学和安全 HTML

- 当前工作分支：`codex/edit-math-excel`
- 最新功能提交：`f3b164d Add table math and safe HTML editor support`、`2f19f6b Add raw HTML source editing`、`749d41a Add table deletion control`
- 当前同步状态：本地功能分支已完成并验证，尚未合并到 `main` 或推送远端；本次 `$work-end` 会追加 repo-local 文档收尾提交。
- 本轮继续以 `contentMarkdown` 作为唯一权威正文存储，补齐投稿编辑器中的标准 Markdown pipe table、数学公式、复杂 HTML 保留与服务端安全过滤策略；脚注保留原始 Markdown 文本。

### 本轮已完成

- 新增/更新依赖：客户端 `@tiptap/extension-table`、`@tiptap/extension-mathematics`、`katex`，服务端 `katex`。
- `client/src/articleTiptapMarkdown.js` 已支持标准 Markdown pipe table、行内 `$...$`、块级 `$$...$$`、raw HTML block、代码块语言和脚注原文保留的转换/序列化。
- `client/src/components/ArticleTiptapEditor.vue` 使用官方 `TableKit` 与 `Mathematics`；“更多”菜单中的表格/数学公式现在插入真实 TipTap 节点，不再只是文本模板。
- “更多”菜单新增置灰式“删除表格”按钮；光标在表格内时可执行 TipTap `deleteTable()` 删除当前所在表格，不在表格内时按钮禁用。
- 复杂 HTML 进入自定义 `rawHtmlBlock`，编辑态显示占位块；点击占位块可用源码弹窗编辑原始 HTML，序列化后仍保存在 `contentMarkdown`。
- 普通投稿即时预览改用后端 `contentHtml`，与管理员审核和公开阅读页共享服务端 Markdown/安全 HTML 渲染路径。
- `server/src/lib/markdown.js` 启用表格、数学渲染和白名单 HTML 过滤；阻断 `script`、`iframe`、表单、事件属性、`style`、`javascript:` 等危险内容，允许站内 `/uploads/...` 图片。
- 脚注本轮不接脚注 UI 或 markdown-it footnote 插件，继续作为普通 Markdown 原文保留。

### 关键改动文件

- `client/package.json`
- `package-lock.json`
- `server/package.json`
- `client/src/App.vue`
- `client/src/main.js`
- `client/src/style.css`
- `client/src/articleTiptapMarkdown.js`
- `client/src/components/ArticleTiptapEditor.vue`
- `client/src/components/ArticleTiptapPreview.vue`
- `server/src/lib/markdown.js`
- `server/test/markdown.test.js`
- `README.md`
- `handoff.md`

### 验证

功能提交期间已通过：

```bash
node --test server/test/markdown.test.js
npm test --workspace server
npm run build
git diff --check
```

- 后端测试 16/16 通过。
- 前端构建通过；TipTap/KaTeX 相关编辑器 chunk 大于 500 kB，Vite 仅给出 chunk size warning。
- 新增删除表格控制后，2026-06-11 再次执行 `npm run build` 和 `git diff --check` 通过。
- `git diff --check` 仅输出已知 LF/CRLF 提示，无空白错误。
- 本轮启动过本地 dev server 并用 HTTP 检查确认前端首页与后端 articles API 返回 200；未做浏览器截图验收。

本次文档收尾继续执行：

```bash
git diff --check -- README.md handoff.md
```

### 已知边界与风险

- 第一版 Markdown 转换追求语义一致，不保证源码逐字保真；用户已接受这一点。
- 表格第一版仅支持标准 Markdown pipe table；可删除光标所在表格，但合并单元格、嵌套表格和复杂 HTML 表格不会转为结构化 TipTap 表格，可作为 raw HTML block 保留。
- raw HTML 的源码编辑入口是轻量 `window.prompt`，不是完整模态源码编辑器。
- 数学公式依赖 KaTeX；复杂或非法 LaTeX 以 `throwOnError: false` 策略尽量渲染。
- TipTap/KaTeX 让编辑器 chunk 明显增大，当前仅记录 Vite chunk size warning。

### 下一步建议

- 若要合并本轮功能，按既有流程执行 `$merge-main codex/edit-math-excel`：先验证，再 fast-forward 到 `main`。
- 若继续打磨编辑器，可把 raw HTML prompt 升级为源码模态框，并补浏览器端表格/数学/HTML 的可视验收。

## 2026-06-09 最新快照：投稿批量上传与评论区滚动

- 当前工作分支：`main`
- 最新功能提交：`d62f526 Add draft batch import and comment scrolling`
- 当前同步状态：该工作已通过 `$merge-main codex/undo-something` 合并到 `main` 并推送；本地功能分支已删除。
- 本轮完成两项用户确认范围：文章详情评论区自然增长到约 15 条主评论后内部滚动；投稿编辑器底部“批量上传”按参考图接入真实 `.md/.txt` 批量导入，一文件生成一篇草稿。

### 本轮已完成

- 新增普通用户批量导入草稿接口：`POST /api/articles/drafts/import`。
- 接口仅允许登录的非管理员用户使用；管理员继续使用既有后台 zip 导入。
- 批量导入支持 `.md` 和 `.txt`，单次最多 20 个文件，单文件 1 MB；每个合法文件创建一篇 `DRAFT`，标题取文件名去扩展名，正文保留文件内容，slug 自动去重。
- 导入采用部分成功策略：非法类型、空文件、超大文件或创建失败会逐文件返回失败原因，不回滚其他成功草稿。
- 投稿编辑器底部“批量上传”从占位按钮改为弹窗：支持点击选择和拖拽、队列去重、不可导入预检、等待/导入中/已导入/失败状态徽标、导入完成后手动关闭，并刷新“我的文章”列表。
- 当前编辑器有未保存改动时，弹窗提示“当前编辑内容不会被覆盖，请记得保存当前草稿”；批量导入不会覆盖当前编辑内容。
- 评论区保留原自然增高行为；当主评论数量超过 15 条时，仅评论列表区域设置最大高度和内部滚动，回复展开也在该滚动区域内展示。
- 新增服务端测试覆盖普通用户多文件导入、重复文件名 slug 去重、空文件/非法类型/超大文件逐文件失败、管理员 403 和超过 20 个文件上限。

### 关键改动文件

- `client/src/App.vue`
- `client/src/style.css`
- `server/src/routes/articles.js`
- `server/test/articles.test.js`
- `README.md`
- `handoff.md`

### 验证

功能提交前已通过：

```bash
npm test --workspace server
npm run build
git diff --check
```

- 后端测试 14/14 通过，包含新增批量导入草稿用例。
- 前端构建通过。
- `git diff --check` 仅输出已知 LF/CRLF 提示，无空白错误。
- 用户明确要求不用截图，本轮未做截图验证。

文档收尾继续执行：

```bash
git diff --check -- README.md handoff.md
```

### 下一步建议

- 后续可考虑给批量导入结果项增加“直接编辑该草稿”的快捷入口；本轮按用户确认只展示结果并刷新“我的文章”列表。
- 若继续扩展导入解析，可再单独讨论 Frontmatter、从首个 H1 提取标题、本地图片包/zip、分类标签批量元数据等能力；本轮明确不做这些智能解析。

## 2026-06-09 最新快照：最新文章 Hero 封面展示

- 当前工作分支：`codex/fengmian`
- 最新功能提交：`d3dac2f Polish latest article hero media`
- 当前同步状态：该历史分支已通过 `$merge-main codex/fengmian` 合并到 `main` 并推送；`d7dd617 Update handoff and README` 为合并后的主线文档提交。
- 本轮完成公开首页顶部 Hero 语义与媒体展示修正：从“精选推荐”改为“最新文章”，继续取按发布时间倒序的第一篇已发布文章；文章详情页 Hero 徽标从“精选推荐”改为“文章详情”。

### 本轮已完成

- 首页 Hero 变量从 `featuredArticle` 改为 `latestArticle`，让代码语义与页面文案一致。
- 首页 Hero 图片优先级调整为：`coverImageUrl` 封面图 > 正文 Markdown / HTML 第一张图片 > `images` 列表第一张图片 > 原渐变占位。
- 首页 Hero 有图片时会铺满显示并叠加暗色遮罩和底部渐变，保证标题、日期和“继续阅读”按钮可读。
- 文章详情页顶部徽标改为“文章详情”，避免详情页继续显示“精选推荐”造成误解。

### 关键改动文件

- `client/src/App.vue`
- `README.md`
- `handoff.md`

### 验证

已通过：

```bash
npm run build
git diff --check -- client/src/App.vue
```

文档收尾中继续执行：

```bash
git diff --check -- README.md handoff.md
```

- 前端构建通过。
- `git diff --check -- client/src/App.vue` 仅输出已知 LF/CRLF 提示，无空白错误。

### 下一步建议

- 该历史结果已合并；若继续封面体验相关工作，从当前主线或当前功能分支重新确认基点后再改。
- 若继续统一封面体验，可复用 `articlePreviewImageUrl()` 逻辑评估是否也应用到最新发布卡片、搜索结果卡片或文章详情 Hero。

## 2026-06-09 最新快照：公开首页侧栏列表收束

- 当前工作分支：`main`
- 最新本地功能提交：`ed39762 Polish public home sidebar lists`
- 当前同步状态：该历史工作后续已被后面的主线文档和功能分支状态覆盖；继续工作请以顶部最新快照和当前 Git 状态为准。
- 本轮完成公开首页右侧栏和页脚列表优化：热门标签最多 9 个，最受欢迎最多 5 篇且固定为较短卡片高度，底部分类目录最多 5 个。

### 本轮已完成

- “最受欢迎”请求从 `/articles/popular?limit=3` 改为 `/articles/popular?limit=5`，仍沿用热度分规则：阅读 * 1、点赞 * 5、收藏 * 8、评论 * 3；同分时后端按文章时间和 ID 新的排前。
- 公开首页“最受欢迎”卡片从可被右侧栏拉伸改为固定 `h-[360px]`，列表间距收紧，标题单行截断，以容纳最多 5 条。
- `GET /api/articles/filters` 为分类和标签返回 `articleCount` 与 `createdAt`。统计范围为已发布文章：分类统计 `PUBLISHED` 文章的 `categoryId`，标签统计已发布文章的 `article_tags` 关联。
- 公开首页“热门标签”最多展示 9 个，按已发布文章使用次数降序排列；使用次数相同则按标签创建时间从早到晚排列。
- 公开页脚“分类目录”最多展示 5 个，按已发布文章使用次数降序排列；使用次数相同则按分类创建时间从早到晚排列。
- 补充后端测试，确认公开筛选接口返回分类/标签使用数和创建时间；同时修稳热门排行测试，避免共享测试库残留数据影响排序断言。

### 关键改动文件

- `client/src/App.vue`
- `client/src/style.css`
- `server/src/routes/articles.js`
- `server/test/articles.test.js`
- `README.md`

### 验证

已通过：

```bash
npm test --workspace server
npm run build
node --env-file=.env.test ..\node_modules\prisma\build\index.js validate --schema prisma\schema.prisma
git diff --check
git diff --check -- README.md handoff.md
```

- 后端测试 13/13 通过。
- 前端构建通过。
- Prisma 校验在默认沙箱先遇到已知 `EPERM: operation not permitted, lstat 'C:\Users\27871'`，按既有流程在真实工作区重跑后通过。
- `git diff --check` 仅输出 LF/CRLF 提示，无空白错误。

### 下一步建议

- 如需把本轮结果同步到远端，推送 `main` 到 `origin/main`。
- 后续若继续优化公开首页，建议先从 `main` 当前状态创建新分支；视觉验收可由用户自行查看，除非明确要求 Agent 打开浏览器截图。
- 若继续调整列表数量或排序规则，优先复用 `articleCount + createdAt` 的公开筛选接口字段，避免新增并行接口。

## 2026-06-08 最新快照：公开搜索、文章元数据闭环与审核待办入口

- 当前工作分支：`main`
- 最新主线提交：`cc361a1 Update handoff and README`
- 最新功能提交：`7554433 Add admin review task notification bell`、`9190994 Add public search page and visit trend`、`aa5a50e Add article editor metadata workflow`
- 本次 `$merge-main codex/public-search-editor-plan` 已把公开搜索、真实访问趋势和文章元数据闭环合并进 `main`，并保留已合并的管理员审核待办通知铃铛。

### 本轮已完成

- 公开搜索页已完成：`#search?q=...` 可展示已发布文章结果，顶部搜索、文章详情搜索和移动端搜索都会进入该页。
- 后端 `GET /api/articles` 的搜索范围已扩展到标题、正文、分类名称/slug、标签名称/slug，并仍只返回 `PUBLISHED` 文章。
- 首页阅读趋势已改为真实 `summary.visitTrend`，按最近 7 个 `Asia/Shanghai` 自然日从 `site_visits` 聚合，匿名用户按 `visitorId` 去重，登录用户按 `userId` 去重。
- 文章编辑器已接入真实封面上传、封面说明、封面比例、SEO 标题、SEO 关键词、SEO 描述、允许评论和置顶设置。
- 文章元数据会从草稿保存、提交审核、管理员通过发布一路保留，并在用户文章列表、管理员审核、公开文章列表、搜索结果和文章详情中返回。
- `allowComments=false` 时，前端隐藏评论输入和回复入口，后端会拒绝新评论；历史评论仍可阅读。
- `isPinned=true` 时，公开首页列表优先展示置顶文章；搜索结果保持关键词相关顺序，不额外置顶。
- 文章详情页会使用 `seoTitle` 更新 document title，并用 `seoDescription` 或摘要更新 meta description。
- 管理员全站通知图标已作为内容审核待办入口，待审核文章或敏感评论存在时显示红点，并可进入内容审核页定位待处理队列。

### 关键改动文件

- `client/src/App.vue`
- `client/src/style.css`
- `server/prisma/schema.prisma`
- `server/prisma/migrations/20260608143000_article_editor_metadata/migration.sql`
- `server/src/routes/articles.js`
- `server/src/routes/comments.js`
- `server/src/routes/admin.js`
- `server/src/routes/users.js`
- `server/test/articles.test.js`

### 验证与数据库

已通过：

```bash
npm test --workspace server
npm run build
npx prisma validate --schema prisma/schema.prisma
git diff --check
```

- 合并前后 `codex/public-search-editor-plan` / `main` 后端测试均为 13/13 通过。
- 本地测试库 `private_blog_test` 已通过迁移应用 `20260608143000_article_editor_metadata`。
- 本地开发库 `private_blog` 也已应用同一迁移；用户此前遇到的 `cover_image_url` 缺列错误已通过迁移解决，并已用 `http://127.0.0.1:3000/api/articles` 验证新字段返回。
- 如果新环境再次出现 `private_blog.articles.cover_image_url` 缺列，进入 `server` 目录执行 `npx prisma migrate deploy --schema prisma/schema.prisma`，或在仓库根目录执行项目封装的 Prisma deploy 命令。

### 下一步建议

- 如需继续新一轮工作，从已同步的 `main` / `origin/main` 创建新分支。
- 新一轮规划前先查看 `todo.md`，阶段一和阶段二已实现；搜索高亮、搜索历史、自动补全、完整审核历史、真实自动保存等仍按此前范围裁剪暂不做。
- 推荐技能：`$merge-main` 用于合并推送清理，`$work-began` 用于新会话接续，`$grill-me` 用于新计划范围追问。

## 本次交接用途

本项目已经完成多轮主要工作：真实阅读/点赞/收藏/热门排行统计 API、评论区主评论点赞与一层回复、普通用户面板新 UI、独立发布新文章页面 UI、管理员后台新 UI、用户/管理员工作台视觉统一和 CSS 变量暗色主题系统、文章编辑页旧版公共 UI 误渲染修复、普通用户草稿投稿和管理员待审核队列、用户面板收藏/社交/安全闭环、管理员用户管理、分类标签管理、已发布文章管理、敏感评论审核真实接口、管理员审核待办通知铃铛、公开搜索页、真实 7 日访问趋势、文章封面/SEO/评论开关/置顶的草稿到发布闭环、投稿批量上传草稿、评论区超过约 15 条后的内部滚动、普通用户投稿 TipTap 即时渲染编辑器，以及当前分支上的标准 Markdown pipe table、删除光标所在表格、数学公式和安全 raw HTML 支持。当前工作分支是 `codex/edit-math-excel`，功能线已本地提交并验证，尚未合并或推送。

## 建议下个 Agent 使用的技能

- `handoff`：上下文再次接近上限时继续更新本文件。
- `browser:control-in-app-browser`：如用户要求打开、点击或验收本地页面时使用；此前 in-app browser / node_repl 在 Windows 上偶发 sandbox 错误，必要时可退回构建、HTTP 检查和命令行验证。
- `$grill-me`：用户继续要求追问设计方案或用该技能名时使用；遵循“一次只问一个问题，并给推荐答案”。
- `$merge-main`：后续合并新功能分支时使用，先验证再 fast-forward 到 `main`。

## 仓库与分支

- 仓库路径：`D:\project\codex-project-boke`
- 当前工作分支：`codex/edit-math-excel`
- 当前同步状态：本地功能分支已完成并验证，尚未合并到 `main` 或推送远端；本次 `$work-end` 将追加 repo-local 文档收尾提交。
- 当前功能提交：`f3b164d Add table math and safe HTML editor support`、`2f19f6b Add raw HTML source editing`、`749d41a Add table deletion control`
- 远端：`origin https://gitee.com/xinlx227/my_first_blog.git`
- `codex/article-apiset`、`codex/comment-thread-interactions`、`codex/newuser-ui`、`articleedit-ui`、`codex/newadmin-ui`、`codex/someting-recover`、`codex/admin-ui-improvements` 已合并进 `main` 并推送到 `origin/main`。
- `codex/admin-review-notification-bell` 已合并并推送，功能提交为 `7554433`
- `codex/public-search-editor-plan` 包含 `9190994`、`aa5a50e` 和文档提交 `35904c2`，已合并到 `main`
- `codex/fengmian` 已通过 `$merge-main` 合并到 `main` 并推送，功能提交为 `d3dac2f`
- `codex/undo-something` 已通过 `$merge-main` 合并到 `main` 并推送，功能提交为 `d62f526`，收尾提交为 `30ada84`
- `codex/tiptap-article-editor` 已通过 `$merge-main` 合并到 `main` 并推送，功能提交为 `c3ffc2f`，收尾提交为 `2a2006f`
- `codex/edit-math-excel` 为当前本地功能分支，尚未合并；下一步可执行 `$merge-main codex/edit-math-excel`
- `todo.md` 在 `codex/public-search-editor-plan` 中已更新为阶段完成后的规划状态
- 本次 `$work-end` 在已有功能提交基础上刷新并提交 `README.md` / `handoff.md`，记录 `749d41a Add table deletion control` 的删除表格入口。

继续工作前建议先执行：

```bash
git status --short --branch
git log --oneline --decorate -6
git diff -- README.md handoff.md
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

这是一个 Vue 3 + Vite + Tailwind CSS 前端、Express + Prisma + MySQL 后端的私有博客系统。已具备认证、文章发布、Markdown 渲染、安全 HTML、图片上传、zip 批量导入、评论、公开阅读页、搜索、分类、标签、目录、首页排序、文章详情页新 UI、普通用户面板新 UI、独立发布新文章页面 UI、管理后台新 UI、文章编辑页路由隔离修复、真实阅读/点赞/收藏/热门排行统计能力、普通用户草稿投稿/管理员审核、用户面板收藏/社交/安全闭环，以及管理员用户管理、分类标签管理、已发布文章管理、敏感评论审核和审核待办通知铃铛真实接口。

## 本次完成：管理员审核待办通知铃铛

工作分支：`codex/admin-review-notification-bell`。

功能提交：

- `7554433 Add admin review task notification bell`

改动文件：

- `client/src/App.vue`
- `server/src/routes/admin.js`
- `server/test/articles.test.js`
- `README.md`
- `handoff.md`

### 行为与边界

- 管理员账号的全站顶部通知图标复用为内容审核待办入口，不再走普通用户互动通知入口。
- 待审核文章或敏感评论任一队列存在待处理项时显示红点；红点不显示数量。
- 点击通知图标进入管理后台“内容审核”，优先定位待审核文章；如果没有待审核文章但有敏感评论，则定位敏感评论区域。
- 预览待审核文章不会清除红点；通过/驳回文章、忽略/删除敏感评论后会刷新待办状态。
- 没有做轮询；待办状态在登录/初始化、进入审核入口和关键审核动作后刷新。

### 后端与测试

- 新增轻量接口：`GET /api/admin/review-tasks/summary`。
- 接口复用现有管理后台数据源，返回 `pendingArticleCount`、`flaggedCommentCount` 和 `hasPendingReview`。
- 接口会先执行敏感评论 backfill，再统计 `PENDING_REVIEW` 文章和 `APPROVED + FLAGGED` 评论。
- `server/test/articles.test.js` 已补充待审核文章队列与敏感评论队列的汇总接口断言。

### 验证

已执行：

```bash
npm test --workspace server
npm run build
npx prisma validate --schema prisma/schema.prisma
git diff --check
```

结果：

- `npm test --workspace server` 通过，后端测试 12/12。
- `npm run build` 通过。
- `npx prisma validate --schema prisma/schema.prisma` 在默认沙箱先遇到 `EPERM: operation not permitted, lstat 'C:\Users\27871'`，按权限流程在真实工作区重跑后通过。
- `git diff --check` 通过，仅输出 LF/CRLF 提示。

## 本次完成：管理员真实管理闭环

工作分支：`codex/admin-ui-improvements`，已 fast-forward 合并到 `main` 并推送到 `origin/main`。

本节记录本轮实现和文档更新。

改动文件：

- `client/src/App.vue`
- `client/src/style.css`
- `server/prisma/schema.prisma`
- `server/prisma/migrations/20260607113000_admin_management_loop/migration.sql`
- `server/prisma/migrations/20260608110000_comment_moderation_queue/migration.sql`
- `server/src/lib/auth.js`
- `server/src/lib/commentModeration.js`
- `server/src/middleware/auth.js`
- `server/src/routes/auth.js`
- `server/src/routes/admin.js`
- `server/src/routes/comments.js`
- `server/src/routes/index.js`
- `server/test/articles.test.js`
- `README.md`
- `handoff.md`

### 设计决策

- 用户要求新增一个独立侧栏项用于管理已经发布的文章，最终侧栏为：站点概览、用户管理、已发布文章、内容审核、分类标签。
- 用户管理允许硬删除，但只允许删除 `USER`；删除前提示会连带删除文章、评论、点赞、收藏、会话等关联数据，并要求输入用户名确认。
- 分类/标签允许删除正在被文章使用的项；删除分类会将相关文章 `categoryId` 置空，删除标签会移除对应 `article_tags` 关联；删除前提示“正在被文章使用”，并要求输入名称确认。
- 已发布文章管理范围为列表、搜索/分类筛选、预览、下架/重新发布和删除，不做编辑。
- 下架复用现有 `ARCHIVED` 状态，重新发布恢复为 `PUBLISHED`。
- 管理列表不做分页，使用滚动区域；用户和文章筛选走后端查询。
- 敏感评论第一版使用本地规则/关键词检测进入真实审核队列，当前只做待处理队列、忽略和删除，不做完整审核历史管理。
- 全站暗色模式采用 CSS 变量主题系统，重点统一暗色页面底色、卡片面、表单面、边框、文字层级和语义色；浅色模式基本保持原观感。

### 后端与数据

- 新增 `users.is_disabled`，迁移文件为 `server/prisma/migrations/20260607113000_admin_management_loop/migration.sql`。
- 新增 `server/src/routes/admin.js` 并挂载到 `/api/admin`。
- 新增管理接口：`GET /api/admin/users`、`PATCH /api/admin/users/:id/disabled`、`DELETE /api/admin/users/:id`。
- 新增分类标签接口：`GET /api/admin/taxonomies`、`POST/PATCH/DELETE /api/admin/categories`、`POST/PATCH/DELETE /api/admin/tags`。
- 新增已发布文章接口：`GET /api/admin/articles`、`PATCH /api/admin/articles/:id/status`、`DELETE /api/admin/articles/:id`。
- 新增敏感评论审核字段：`comments.moderation_status`、`moderation_reason`、`moderation_keywords`、`moderated_at`、`moderator_id`，迁移文件为 `server/prisma/migrations/20260608110000_comment_moderation_queue/migration.sql`。
- 新增 `server/src/lib/commentModeration.js`，评论创建时通过 `detectCommentModeration()` 写入 `FLAGGED` 队列信息。
- 新增敏感评论接口：`GET /api/admin/comments/moderation`、`PATCH /api/admin/comments/:id/moderation/ignore`、`DELETE /api/admin/comments/:id`。
- 禁用用户会停用该用户活跃会话；登录时拒绝禁用账号，已有 token 通过 `requireAuth` 时也会被拦截。
- 当前 Prisma Client 生成曾遇到 Windows DLL rename 锁定，因此 `is_disabled` 和评论审核字段的运行时读写使用 raw SQL；`schema.prisma` 和迁移仍已完整更新。
- 开发库 `private_blog` 和测试库 `private_blog_test` 均已应用 `20260607113000_admin_management_loop`。

### 前端管理后台

- 用户管理改为真实数据：搜索、状态筛选、角色筛选、右侧抽屉查看用户详情、禁用/启用、普通用户硬删除；管理员账号显示为受保护。
- 新增“已发布文章”栏：支持后端搜索、分类筛选、状态筛选、预览、下架、重新发布和删除。
- 分类标签页改为真实数据：分类/标签新增、重命名、删除，并显示被多少文章使用；分类管理和标签管理各自独立滚动，互不拉伸。
- 所有管理列表不分页，采用列表内部滚动区域。
- 删除用户和文章仍使用二次确认并要求输入目标用户名/标题；分类和标签仅在正在被文章使用时要求输入名称确认，未被使用时直接删除。
- “敏感评论”从静态 UI 示例改为真实审核队列，展示评论/回复内容、命中原因、关键词、作者、文章和时间，并支持忽略或删除。
- 已发布文章操作按钮按预览蓝、发布绿、下架橙、删除红区分语义；用户管理禁用/删除和敏感评论按钮保持较小的紧凑尺寸。
- 暗色主题在 `client/src/style.css` 增加 `:root` / `.dark` 变量，迁移管理员、用户面板、文章详情、编辑器、弹窗、遗留 UI 和 Tailwind 模板冲突色；暗色下减少大面积橙色，保留少量暖橙强调。

### 验证

已执行：

```bash
npx prisma validate --schema prisma/schema.prisma
npm test --workspace server
npm run build
git diff --check
```

结果：

- `npx prisma validate --schema prisma/schema.prisma` 在默认沙箱先遇到 `EPERM: operation not permitted, lstat 'C:\Users\27871'`，按权限流程在真实工作区重跑后通过。
- `npm test --workspace server` 通过，后端测试 12/12，包含真实敏感评论队列、忽略和删除用例。
- `npm run build` 通过。
- `git diff --check` 仅输出 LF/CRLF 提示。

## 本次完成：用户中心安全闭环

工作分支：`main`。

功能提交：

- `87053f7 Add user center security features`

改动文件：

- `client/src/App.vue`
- `client/src/style.css`
- `package-lock.json`
- `server/package.json`
- `server/prisma/schema.prisma`
- `server/prisma/migrations/20260607100000_user_center_security_loop/migration.sql`
- `server/src/lib/device.js`
- `server/src/lib/securityAudit.js`
- `server/src/routes/auth.js`
- `server/src/routes/users.js`
- `server/test/articles.test.js`
- `server/test/auth.test.js`
- `todo.md`

### 后端与数据

- 新增依赖 `ua-parser-js`，通过 `server/src/lib/device.js` 将 `user_sessions.user_agent` 解析为 `deviceName`、浏览器、系统和设备类型。
- 新增 `user_notification_reads` 表，记录派生互动通知的轻量已读状态；通知正文仍从评论、文章点赞、文章收藏和评论点赞实时派生，不复制到通知表。
- `/api/users/me/interactions` 现在返回 `notificationKey`、`isRead`、`readAt` 和 `unreadCount`。
- 新增 `PATCH /api/users/me/interactions/:key/read` 和 `PATCH /api/users/me/interactions/read-all`，支持单条已读和全部已读。
- 新增 `security_audit_events` 表和 `server/src/lib/securityAudit.js`，记录登录成功、已存在账号登录失败、退出登录、修改密码、注销会话和本地绑定状态变更。
- 新增 `GET /api/users/me/security-events`，返回当前用户最近 5 条安全活动。
- 登录失败审计只针对已存在账号写入，不存在账号不写入，避免泄露账号探测信号。

### 前端用户面板

- 顶部通知入口和社交互动通知列表接入未读数；通知卡片显示未读状态。
- 点击通知卡片会先标记该条已读，再跳转到相关文章；评论相关通知跳转后滚动到评论区。
- 社交互动支持“全部已读”操作。
- 安全设置设备列表优先展示后端返回的友好设备名称。
- “第三方账号绑定”下方新增“最近安全活动”，展示事件、时间、设备摘要和 IP。

### 边界

- 仍不接真实短信验证码。
- 仍不接真实微信/QQ/支付宝 OAuth，第三方账号继续只保存本地绑定标记。
- 第一版不做管理员全站安全审计后台。
- 互动通知保持实时派生，不改成完整通知表。

### 验证

新增后端测试覆盖互动通知默认未读、单条已读、全部已读、会话设备名称解析、空 userAgent 兜底、登录/退出/改密/会话注销/绑定变更审计事件，以及最近安全活动查询。

建议本轮文档同步后执行：

```bash
npm test --workspace server
npm run build
npx prisma validate --schema prisma/schema.prisma
git diff --check
```

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
- 通知已读/未读已在后续安全闭环中完成，使用 `user_notification_reads` 记录派生通知的已读状态，不新增完整通知表。
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

### 合并收尾

- `codex/user-panel-features` 已通过 `git merge --ff-only codex/user-panel-features` 合并到 `main`。
- 合并前和合并后均执行了 `npm test --workspace server`、`npm run build`、`git diff --check`、`npx prisma validate --schema prisma/schema.prisma`。
- 合并后后端测试 10/10 通过，包含用户面板 API 用例。
- `main` 已推送到 `origin/main`；第一次推送遇到 gitee 443 连接失败，按权限流程重试后成功。
- 本地功能分支 `codex/user-panel-features` 已通过 `git branch -d codex/user-panel-features` 删除。

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
- 阶段 1 当时只保存标题、正文、后端生成并尽量稳定的 slug、分类、标签和状态；后续分支已补齐封面、SEO、高级设置持久化和底部批量上传草稿导入。
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

- 该历史轮次没有接入真实投稿、保存草稿、预览、发布、封面上传或底部“批量上传文章”功能；后续分支已补齐投稿/草稿/预览/发布、封面元数据和底部批量上传草稿导入。
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
- 当时管理后台用户管理、敏感评论、分类标签管理仍是 UI 占位和提示交互；当前 `codex/admin-ui-improvements` 已补齐用户管理、分类标签和敏感评论真实接口。

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
- 用户管理页当时只做 UI：搜索、筛选、查看、禁用、删除按钮统一提示后续接入；当前 `codex/admin-ui-improvements` 已接真实用户管理接口并新增 `users.is_disabled`。
- 内容审核页当时只做 UI：待审核文章使用静态示例数据，通过/驳回按钮只提示后续接入投稿审核流程；后续文章草稿投稿分支已接真实待审核队列。
- “敏感评论”当时为 UI 示例，不是后端检测结果；当前 `codex/admin-ui-improvements` 已将其接入真实审核队列。
- 分类标签新增、编辑、删除当时为 UI 占位；当前 `codex/admin-ui-improvements` 已接真实新增、改名和删除接口。

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
- 该历史轮次中封面、分类、标签、SEO、高级设置、预览、发布、批量上传、保存草稿仍为 UI 占位；后续分支已补齐投稿后端、封面/SEO/高级设置持久化和底部批量上传草稿导入。

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
- 全站暗色模式已重构为 `client/src/style.css` 中的 `:root` / `.dark` CSS 变量主题系统；管理员、用户面板、文章详情、编辑器、弹窗和常见 Tailwind 冲突色统一为中性深灰蓝暗色基线，橙色面积已降低并保留在激活态/按钮/提示等语义强调上。
- 发布新文章页面已重构为独立专注写作 UI。
- 管理后台已改为独立新 UI：顶部导航按首页/用户面板新 UI，左侧保留站点概览、用户管理、内容审核、分类标签；管理员顶部搜索框已移除，布局宽度和侧栏色彩已向用户面板对齐。
- 管理后台站点概览已接入只读统计接口，近 7 日访问趋势为 ECharts 柱状图并显示 `MM-DD` 日期，文章分类分布为 ECharts 环形图。
- 管理后台用户管理、已发布文章、分类标签和敏感评论均已接真实接口；内容审核已接真实待审核文章队列。

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
  - `server/prisma/migrations/20260607100000_user_center_security_loop/migration.sql`
  - `server/prisma/migrations/20260607113000_admin_management_loop/migration.sql`
- 后端发布接口首次发布时写入 `published_at`，再次发布不覆盖原首次发布时间。
- `chapterOrder` 作为文章序号，新建默认当前文章总数 + 1；手动重排时会顺延其他文章。
- 评论区接口仍主要使用 Prisma raw SQL 访问新评论点赞表/新回复目标字段，以降低本机 Prisma Client 生成被 Windows DLL 占用时的阻塞风险；`schema.prisma` 和迁移已完整更新。
- 管理员概览接口和待审核队列接口新增在 `server/src/routes/articles.js`；待审核队列会读取 `PENDING_REVIEW` 文章。
- 普通用户草稿/投稿接口也在 `server/src/routes/articles.js`；保存草稿和提交审核都复用 `articles` 表。
- 用户中心接口新增在 `server/src/routes/users.js`；收藏、评论、互动通知、通知已读/未读、会话、密码、绑定状态和安全活动都需要登录。
- 会话设备解析在 `server/src/lib/device.js`，安全审计写入与格式化在 `server/src/lib/securityAudit.js`。
- 管理员真实管理接口新增在 `server/src/routes/admin.js`，挂载为 `/api/admin`；覆盖用户管理、分类标签管理和已发布文章管理。
- `users.is_disabled` 用于禁用普通用户；当前运行时读写用 raw SQL，避免本机 Prisma Client DLL 锁定导致生成失败时阻塞功能。

## 最近重要提交

- `ebd0132 Implement comment moderation and dark theme polish`：管理员真实管理闭环、敏感评论审核队列、暗色主题与管理按钮语义化收尾，已合并并推送到 `main`。
- `62736d9 Update handoff and README`：管理员真实管理闭环实现前后的文档同步。
- `a781309 Polish admin management interactions`：管理后台交互和按钮语义化调整。
- `dc44946 Add admin management features`：用户管理、分类标签、已发布文章管理和 `/api/admin/*` 基础能力。
- `d4d2039 Update handoff and README`：本轮功能分支前在 `main` 上提交的文档同步基点。
- `87053f7 Add user center security features`：通知已读/未读、会话设备解析、安全审计事件、最近安全活动展示和相关测试。
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

当前 `main` 已在合并 `codex/admin-ui-improvements` 前后执行：

```bash
npx prisma validate --schema prisma/schema.prisma
npm test --workspace server
npm run build
git diff --check
```

说明：`prisma validate` 默认沙箱先遇到 `EPERM: operation not permitted, lstat 'C:\Users\27871'`，真实工作区重跑通过；`npm run build` 通过；后端测试 12/12 通过；`git diff --check` 仅 LF/CRLF 提示。

最近用户中心安全闭环工作已合并到 `main`，新增后端用例覆盖默认未读、单条已读、全部已读、设备解析、安全审计写入和最近安全活动查询。建议本轮文档同步后执行完整验证：

```bash
npm test --workspace server
npm run build
npx prisma validate --schema prisma/schema.prisma
git diff --check
```

最近用户面板功能工作已合并到 `main` 并执行：

```bash
node --check server/src/routes/articles.js
node --check server/src/routes/users.js
node --check server/test/articles.test.js
npm test --workspace server
npm run build
git diff --check
npx prisma validate --schema prisma/schema.prisma
```

说明：本轮开发库和测试库迁移均已应用。合并前后验证均通过，合并后后端测试 10/10 通过。`npm run prisma:generate --workspace server` 曾在 Windows 上遇到 Prisma Client DLL rename 锁定问题，当前新增表访问使用 raw SQL，不依赖生成后的新 Prisma Client 模型；等没有 Node/Prisma 进程占用时可再运行生成。

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

- 如需继续完善用户中心，可评估真实短信验证码、真实微信/QQ/支付宝 OAuth、通知精确定位/高亮、更完整的安全审计筛选和管理员全站安全审计后台。
- 投稿编辑器底部批量上传已完成第一版；下一步可补充真实自动保存、更完整的审核历史、批量导入后快速跳转编辑，或在 Markdown 投稿链路稳定后再评估 Tiptap / ProseMirror。
- 管理后台用户管理后续可补充批量操作和管理员权限管理；当前仅允许管理 `USER`，已提供右侧抽屉查看基础详情与统计。
- 管理后台已发布文章后续可补充编辑入口、批量下架和审核历史联动；当前只做列表、预览、上下架和删除。
- 敏感评论当前已接本地规则检测和后台处理队列；后续可补充规则配置、审核历史、批量处理和更细的风险等级。
- 公开首页和管理后台概览均已基于 `site_visits` 展示近 7 日访问趋势，用户面板已接当前用户文章阅读趋势；后续可补充访问来源、页面路径分布和趋势筛选。
- 补充评论分页、评论审核，以及敏感词/敏感话题检测流程。
- 修复评论删除边界：删除主评论时递归清理历史多层回复，或先迁移历史 `parent_id` 到一层结构。
- 给 `comment_likes` 增加 `(user_id, comment_id)` 复合索引，优化用户态 `likedByMe` 查询。
- 将粉丝数、作者关注等继续接入真实后端模型。
