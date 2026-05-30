# Handoff: codex-project-boke 当前状态

## 本次交接用途

用户要求更新仓库内的 `handoff.md` 和 `README.md`，提交并推送远端。本文件用于让下一位 Agent 在当前 `main` 状态上继续工作。

## 建议下个 Agent 使用的技能

- `handoff`：上下文再次接近上限时继续更新本文件。
- `browser:browser`：如用户要求打开、点击或验收本地页面时使用；本机此前的 in-app browser / node_repl 偶发 Windows sandbox 错误，必要时可退回构建和命令行检查。
- `$grill-me`：用户继续要求追问设计方案或用该技能名时使用；遵循“一次只问一个问题，并给推荐答案”。

## 仓库与分支

- 仓库路径：`D:\project\codex-project-boke`
- 当前主分支：`main`
- 远端：`origin https://gitee.com/xinlx227/my_first_blog.git`
- 当前最新功能合并：`d461d5b Merge index layout updates into main`
- `codex/index-layout` 已合并到 `main`，功能提交为 `b328f4e Add stable homepage latest pagination`。
- 本次文档更新提交并推送后，应以 `git log --oneline --decorate -5` 和 `git status --short --branch` 确认 `main` 与 `origin/main` 状态。
- `codex/article-detail-ui` 已合并到 `main`、推送到 Gitee，并删除本地分支。
- `codex/ui-layout` 已合并到 `main` 并推送到 Gitee；本地分支此前已删除。
- 不要提交、回滚或覆盖用户自己的未提交改动；继续工作前先检查工作区。

继续工作前建议先执行：

```bash
git status --short --branch
git log --oneline --decorate -5
git diff -- client/src/App.vue client/src/style.css
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

这是一个 Vue 3 + Vite + Tailwind CSS 前端、Express + Prisma + MySQL 后端的私有博客系统。已具备认证、文章发布、Markdown 渲染、安全 HTML、图片上传、zip 批量导入、评论、公开阅读页、搜索、分类、标签、目录、首页排序和文章详情页新 UI 等能力。

## 当前 UI 与功能状态

- 首页是当前新 UI 的主视觉标准。
- 公开首页、登录/注册侧边栏、明暗色调切换已是新 UI。
- 首页“最新发布”按 `publishedAt` / `createdAt` 倒序分页展示，每页 4 篇。
- 最新发布分页不是旧提交 `22c919d` 的简单恢复；当前实现来自 `codex/index-layout`，桌面端固定为两行两列四卡位，最后一页不足 4 篇时保留空位，分页位置不随文章数量上移。
- 最新发布文章卡片桌面端定高，标题和摘要通过固定行数截断，避免不同内容长度撑高卡片；移动端保持自然高度。
- 首页左侧文章列表按 `chapterOrder` 升序显示。
- 登录态下公开首页左侧“文章列表”卡片使用 `lg:h-[760px]`，用于让白色卡片底部与右侧“最受欢迎”区域底部对齐；未登录态仍保持 `lg:h-[620px]`。
- 首页右侧保留热门标签、阅读趋势、最受欢迎。
- 文章详情页只保留左侧栏 + 中间正文两栏；右侧栏已移除，详情页不显示热门标签和相关推荐。
- 详情页左侧栏为紧凑作者卡、条件显示的目录、筛选文章、文章列表。目录放在筛选文章上方，当前文章无目录时不显示。
- 详情页左侧滚动条已隐藏，但保留鼠标滚轮滚动。
- 详情页评论区已按参考图调整，评论头像为圆形首字头像。
- 详情页点赞/收藏是前端本地状态，顶部与底部互动条同步，刷新后不持久化。
- 移动端详情页优先正文，左侧内容折叠为抽屉。
- 用户面板和管理后台仍为旧 UI，通过 `.legacy-ui` 隔离。

## 后端与数据状态

- 已新增并合入 `published_at` / `publishedAt` 字段，用于保存首次发布时间。
- 已新增迁移：
  - `server/prisma/migrations/20260528162000_add_article_published_at/migration.sql`
  - `server/prisma/migrations/20260528163500_drop_article_chapter_order_index/migration.sql`
- 后端发布接口首次发布时写入 `published_at`，再次发布不覆盖原首次发布时间。
- `chapterOrder` 作为文章序号，新建默认当前文章总数 + 1；手动重排时会顺延其他文章。

## 最近重要提交

- `c07cac4 Update article detail UI`：文章详情页 UI 调整、作者卡/目录/评论区/左栏滚动条等。
- `cc9206d Merge ui layout updates into main`：合并首页布局、文章排序、`published_at` 迁移、后端逻辑和测试。
- `22c919d Add homepage latest articles pagination`：曾加入首页最新发布分页。
- `46586b8 Revert "Add homepage latest articles pagination"`：按用户要求撤销 `22c919d` 并推送 Gitee。
- `b328f4e Add stable homepage latest pagination`：在 `codex/index-layout` 中重新实现稳定的首页最新发布分页、四卡位占位和文章卡片定高。
- `d461d5b Merge index layout updates into main`：将 `codex/index-layout` 合并进 `main`。
- 最近一次小调整：登录态下公开首页左侧“文章列表”卡片高度改为 `lg:h-[760px]`，只影响公开首页登录态，不影响未登录态和文章详情页。

## 最近验证

- 合并 `codex/ui-layout` 时执行过：
  - `npm run build` 通过
  - `npm test --workspace server` 通过，4/4 passed
  - `git diff --check` 通过
- 撤销首页分页提交后确认过：
  - `git status --short --branch` 显示 `main` 与 `origin/main` 一致
  - `git log --oneline --decorate -4` 显示 `46586b8` 同时位于 `HEAD` 和 `origin/main`
- 合并 `codex/index-layout` 前后执行过：
  - `git diff --check` 通过
  - `npm run build` 通过
  - 为对比 `main` 原首页曾创建过 `D:\project\codex-project-boke-main` 预览 worktree，后续已删除；`5180` 预览服务已停止。
- 调整登录态文章列表高度后执行过：
  - `git diff --check` 通过
  - `npm run build` 通过；若普通沙箱出现 Vite 绝对路径错误，可在真实工作区重跑构建。

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
- 当时只读验证过 `MySQL80` 正在运行，`/api/articles` 能返回现有文章，说明 `private_blog` 数据未丢失。

## 后续建议

- 若用户继续调整首页空白区域或分页位置，以 `main` 旧首页视觉比例为基准；不要把文章卡片拉得过高。
- 最新发布分页已重新实现，后续若改动，应保持桌面端四卡位和分页位置稳定。
- 可继续改造用户面板和管理后台旧 UI。
- 可将阅读量、点赞量、收藏状态、作者粉丝、阅读趋势、热门排行等静态或本地展示逐步接入真实后端统计 API。
- 可补充分页、评论审核、嵌套回复 UI，但应先确认用户要改的是首页还是文章详情页。
