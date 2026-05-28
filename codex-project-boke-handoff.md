# Handoff: codex-project-boke 当前状态

## 项目与 Git 状态

- 仓库路径：`D:\project\codex-project-boke`
- 当前分支：`codex/ui-layout`。
- 最新本地提交：`a3edf0c Refine article ordering and homepage layout`。
- `main`、`origin/main`、`origin/HEAD` 仍指向 `aa89f5f Update branch handoff after new UI merge`。
- 当前 `codex/ui-layout` 领先 `main` / `origin/main` 1 个提交，尚未推送远端。
- 版本标签仍保留：
  - `version-1` 指向旧 UI 阶段。
  - `version-2` 指向新 UI/暗色模式阶段。
- 最近已知远端：Gitee `https://gitee.com/xinlx227/my_first_blog.git`。
- 当前仍有一个历史 stash：`stash@{0}: On main: preserve handoff before merging dev-new-ui`。清理前先查看内容，避免误删有用信息。
- 继续工作前先运行 `git status --short --branch`，避免覆盖用户已有改动。

## 用户约束与偏好

- 用户使用中文沟通，回答优先中文。
- 3000 端口是用户自己开的服务；后续验收不要占用或关闭 3000 端口，需要启动服务时使用其他端口。
- 用户已经完成视觉验收时，不要重复质疑视觉结果。
- 除非用户明确要求，不要把临时补充信息写入 README。
- 用户希望 Agent 在快要超出上下文时主动提示：“快要超出上下文了”，并建议生成或更新 handoff。
- 不要提交、回滚或覆盖用户已有改动，除非用户明确要求。
- 不要在对话或文档中写入真实 token、密码、测试账号等敏感信息。

## 已完成基础能力

Task 2 到 Task 6 已完成：

- 认证与会话管理。
- 文章发布、Markdown 渲染、安全 HTML、图片上传。
- 管理员 Markdown zip 批量导入。
- 评论与移动端响应式布局。
- 公开阅读体验，包括搜索、分类、标签、TOC。

## 当前 UI 与首页状态

- 公开首页、登录/注册侧边栏已经是新 UI。
- 登录/注册表单在首页左侧卡片内切换，不再作为独立页面视图。
- 登录成功后不再跳转文章详情、dashboard 或 admin；只更新用户状态并留在首页。
- 退出登录后清除用户状态并回到首页初始状态。
- 顶部登录/注册入口已改为未登录头像入口，避免与左侧登录表重复。
- 首页页脚已挪到主网格全宽区域。
- 左侧文章列表为定高区域，文章过多时内部滚动；列表按文章序号 `chapterOrder` 升序显示。
- “最新发布”区域只展示最新发布的 4 篇文章，按发布时间倒序变化。
- “最受欢迎”区域为定高卡片：`h-[400px] lg:h-[440px]`，不使用内部滚动；按当前条目样式约容纳 6-7 条。
- 文章详情、用户面板、管理后台仍属于旧 UI，通过 `.legacy-ui` 隔离。
- 已实现明暗色调切换：
  - 右上角主题按钮可切换亮色/暗色。
  - 主题偏好保存到 `localStorage`。
  - 新 UI 有较完整暗色适配，旧 UI 有基础暗色兼容。
- 登录、注册、文章、评论、权限、上传、导入等用户可见提示词已经中文化。

## 最新业务改动

- 新增 `published_at` / `publishedAt` 字段，用于保存首次发布时间。
- 迁移文件：
  - `server/prisma/migrations/20260528162000_add_article_published_at/migration.sql`
  - `server/prisma/migrations/20260528163500_drop_article_chapter_order_index/migration.sql`
- 已对本地开发库 `private_blog` 和测试库 `private_blog_test` 执行迁移。
- 后端发布接口会在文章首次发布时写入 `published_at`；再次发布不会覆盖原发布时间。
- 公开文章列表接口按发布时间倒序返回，前端再取最新 4 篇展示。
- `chapterOrder` 现在作为“第几篇文章”的序号：
  - 新建文章未显式传排序时，后端自动设为当前总文章数 + 1。
  - 前端新建/清空表单时自动填入当前已知文章数 + 1。
  - 管理员可手动修改文章序号。
  - 手动移动文章到某个序号时，其他文章会自动顺延，避免多个文章同序号。
- 后台文章列表按 `chapterOrder` 升序显示，并展示“第 X 篇”。

## 最近验证

- 2026-05-28：`npm run build` 通过。
- 2026-05-28：`npm test --workspace server` 通过，4/4 tests passed。
- 2026-05-28：已提交 `a3edf0c Refine article ordering and homepage layout`。

## 待做与风险

- `codex/ui-layout` 尚未推送远端；如需共享，后续执行 push。
- 新增迁移已在本地开发库和测试库应用；其他环境需要执行 `npm run prisma:deploy`。
- 文章详情页仍需按新 UI 风格改造。
- 用户面板仍需按新 UI 风格改造。
- 管理后台仍需按新 UI 风格改造。
- 旧 UI 暗色模式只有基础兼容，后续可继续补细节。
- 首页阅读趋势和热门排行仍是静态假数据，后续可对接后端统计 API。
- 当前 `codex-project-boke-handoff.md` 和 `README.md` 本轮更新后尚未提交。

## 建议下个 Agent 使用的技能

- `browser:browser`：如果需要继续做本地页面视觉验收。
- 普通 Vue/Express 修改不需要特殊技能，优先读取 `client/src/App.vue`、`client/src/style.css`、`server/src/routes/*`。
- 若继续做 Vercel/Next 相关任务再考虑 Vercel 插件；当前项目是 Vue/Express，不需要默认使用。

## 下一步建议

- 如果继续做 UI，优先改造文章详情页，因为这是公开阅读体验里仍然最明显的旧 UI。
- 如果继续做功能，优先考虑分页、评论审核、更丰富的公开博客导航和嵌套回复 UI。
- 如果要验收首页视觉，使用非 3000 的端口启动前端或后端服务。
