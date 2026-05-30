# Handoff: codex-project-boke 当前状态

## 本次交接用途

用户要求继续把当前会话压缩到本仓库交接文档中，固定路径为 `D:\project\codex-project-boke\codex-project-boke-handoff.md`，并同步总结/更新 `README.md`。用户此前明确要求：先不提交。

## 建议下个 Agent 使用的技能

- `browser:browser`：如需继续验收本地文章详情页 UI、交互或移动端布局。注意：本轮 in-app browser / node_repl 仍出现 Windows sandbox 相关错误。
- `handoff`：如上下文再次接近上限，请继续更新本文件。
- 常规 Vue/Express 修改不需要特殊技能，优先读取 `client/src/App.vue`、`client/src/style.css`、`server/src/routes/*`。

## 仓库与分支

- 仓库路径：`D:\project\codex-project-boke`
- 当前分支：`codex/article-detail-ui`
- 当前未提交改动：
  - `client/src/App.vue`
  - `client/src/style.css`
  - `README.md`
  - `codex-project-boke-handoff.md`
- 不要提交、回滚或覆盖用户已有改动，除非用户明确要求。

继续工作前先执行：

```bash
git status --short
git diff -- client/src/App.vue client/src/style.css
git diff -- README.md codex-project-boke-handoff.md
```

## 用户约束与偏好

- 用户使用中文沟通，回答优先中文。
- 3000 端口是用户自己的后端服务；不要占用或关闭 3000。
- 如果要启动前端临时验收，5173 被占用时可使用 5174 或其他端口，结束前应停止临时服务。
- 本轮曾临时启动 `http://127.0.0.1:5174/`，已停止。
- 用户明确说不需要 Agent 做截图，用户会自己查看视觉结果。
- 用户已经完成视觉验收时，不要重复质疑视觉结果。
- 不要泄露真实 token、密码、测试账号等敏感信息。
- 用户希望 Agent 在快要超出上下文时主动提示“快要超出上下文了”，并建议更新 handoff。

## 项目概况

这是一个 Vue 3 + Vite + Tailwind CSS 前端、Express + Prisma + MySQL 后端的私有博客系统。

已完成基础能力：

- 认证与会话管理
- 文章发布、Markdown 渲染、安全 HTML、图片上传
- 管理员 Markdown zip 批量导入
- 评论与移动端响应式布局
- 公开阅读体验：搜索、分类、标签、TOC

## 当前 UI 状态

- 公开首页、登录/注册侧边栏已经是新 UI。
- 文章详情页正在当前分支重构为新 UI，并已按“首页为主视觉标准，详情页向首页统一”的方向完成一轮实现。
- 用户面板、管理后台仍属于旧 UI，通过 `.legacy-ui` 隔离。
- 已实现明暗色调切换，偏好保存到 `localStorage`。

## 本轮用户确认过的设计决策

- 统一标准：以首页 UI 为主，详情页向首页统一。
- 顶部导航：左侧 `MyBlog Pro | 返回`，返回在品牌右侧并用细分隔线隔开；中间保留首页同款搜索框视觉但暂不接功能；右侧保留喜欢、收藏、转发，并继续显示暗色切换、通知、用户胶囊。
- 详情页主视觉：使用首页同款深色渐变 hero，而不是浅黄封面。
- 统计条：保留在 hero 下方，不放入 hero。
- 左侧栏：详情页完整复用首页左栏，包括登录/用户信息卡、筛选文章、文章列表；当前文章轻量高亮。
- 左侧栏行为：桌面端 sticky；文章列表内部滚动；移动端折叠为入口/抽屉，正文优先。
- 右侧栏顺序：作者卡片、目录、热门标签、相关推荐；目录无 TOC 时隐藏，桌面端目录卡 sticky。
- 移动端顺序：顶部导航、深色 hero、统计条、正文、底部互动条、评论区、相关推荐；移动端隐藏作者卡片/热门标签，目录不作为完整卡片显示。
- 回到顶部：页面超过约 0.6 屏后显示右下角半透明浮动按钮，不够长不显示。
- 交互状态：点赞/收藏只做前端本地状态，顶部和底部同步；分享只做复制链接反馈；暂不接后端持久化。

## 本轮代码改动摘要

- `client/src/App.vue`
  - 新增点赞、收藏本地状态集合：`likedArticleSlugs`、`favoritedArticleSlugs`。
  - 新增 `selectedArticleSlug`、`isSelectedArticleLiked`、`isSelectedArticleFavorited` 等 computed，并让点赞数随本地点赞态临时变化。
  - `likeArticle`、`favoriteArticle` 改为可切换状态；`shareArticle` 继续复制当前链接并提示。
  - `applyFilters`、`clearFilters` 在详情页不再强制 `setHash("")`，筛选只刷新文章列表，不自动跳回首页。
  - 新增移动端左栏开关、关闭、文章点击关闭抽屉、滚动监听和 `scrollToTop`。
  - 详情页顶部改成首页完整导航骨架：品牌、返回、搜索视觉预留、文章操作、暗色切换、通知、用户胶囊。
  - 详情页左侧复用首页登录/用户信息卡、筛选卡、文章列表卡，并对当前文章加高亮。
  - 中间主内容改为深色 hero + 原统计条 + 正文卡片 + 底部互动条 + 评论区。
  - 右侧栏顺序改为作者卡、目录、热门标签、相关推荐。
  - 新增移动端“文章筛选”入口、移动遮罩和右下角回到顶部按钮。

- `client/src/style.css`
  - 新增详情页三栏布局：左栏约 320px，中间自适应，右栏约 300-320px。
  - 详情页整体继续使用首页浅米色背景和白色卡片体系。
  - 新增顶部详情页导航样式、文章操作按钮激活态、搜索视觉预留样式。
  - 新增左栏 sticky、当前文章浅橙高亮、移动端抽屉样式。
  - 深色 hero 改为首页风格的深色渐变、弱化文件图标装饰和标题/元信息覆盖。
  - 正文排版轻微压缩以适配三栏布局，保持阅读优先。
  - 右侧作者卡、目录、标签、相关推荐样式收窄到首页右栏密度。
  - 增加回到顶部按钮、移动端隐藏作者/热门标签/目录卡、相关推荐移动端后置等响应式规则。
  - 保留并扩展 dark mode 兼容。

## README.md 更新摘要

`README.md` 已从旧英文/历史状态说明改写为中文项目说明，并在本轮补充为当前详情页统一后的状态。文档现在包含：

- 当前分支和未提交改动提示。
- 最新文章详情页 UI 工作说明。
- 功能概览、技术栈、项目结构。
- 环境变量、本地 MySQL 注意事项、安装和迁移流程。
- 本地开发脚本、常用命令、API 摘要。
- 测试与构建说明、管理员账号说明、后续建议。

本轮 README 需要体现的最新状态：

- 文章详情页已向首页统一，不再只是“按参考图重构”。
- 顶部导航、三栏布局、左侧复用首页侧栏、深色 hero、右侧作者/目录/标签/推荐、移动端抽屉和相关推荐后置均已实现。
- 点赞/收藏为前端本地状态，后续如需真实数据应接后端 API。

## 最近验证

- 2026-05-29：`npm run build` 通过。
- 最近构建结果摘要：
  - `dist/index.html`
  - `dist/assets/index-BZp7DsWO.css`
  - `dist/assets/index--Xq2Iudm.js`
- `git diff --check -- client/src/App.vue client/src/style.css` 通过，仅提示 Windows 下 LF/CRLF 替换 warning。
- 曾启动 `npm run dev -- --host 127.0.0.1 --port 5174` 做本地页面服务，服务已停止。
- 用户明确表示不需要截图，后续由用户自行查看。

## 浏览器验收备注

本轮尝试使用 in-app browser / node_repl 时仍报：

```text
node_repl kernel exited unexpectedly ... windows sandbox failed: spawn setup refresh
```

随后尝试 Edge headless 截图，但用户明确说不需要做截图，因此停止该方向。后续如需浏览器验收：

- 不要动用户的 3000 端口。
- 若 5173 已占用，用 5174 或其他端口启动前端。
- 验收完成后停止临时服务。
- 如果用户说自己查看，就不要继续截图。

## 本地 MySQL 备注

之前排查数据库连接错误时发现：

- `private_blog` 数据库存在于 `MySQL80` 实例中。
- 另一个名为 `MySQL` 的服务曾占用/使用不同数据目录。
- 用户曾要求临时关闭当前 MySQL、释放 3306，然后开启 `MySQL80` 检查旧数据。
- 已把 `D:\developtool\mysql-8.0.25-winx64\my.ini` 中 `MySQL` 的默认端口从 3306 改为 3307，并生成过备份 `my.ini.bak-20260529-142955`。
- 修改 Windows 服务 `MySQL` 为非开机自启动时遇到权限不足，需要管理员 PowerShell 执行：

```powershell
sc.exe config MySQL start= demand
```

不要在文档或回复中暴露真实数据库密码。

## 仍建议继续做的事

- 让用户自行查看文章详情页桌面和移动端视觉效果，并根据反馈微调。
- 如视觉通过，可考虑让用户确认是否提交当前分支。
- 后续可继续改造用户面板和管理后台旧 UI。
- 可将阅读量、点赞量、收藏状态、作者粉丝、相关推荐等静态/本地展示逐步接入真实后端统计 API。
- 如果继续增强详情页移动端，可补一个轻量目录折叠入口；当前移动端完整目录卡已隐藏。
