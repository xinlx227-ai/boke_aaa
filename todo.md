# 公开搜索、首页趋势与投稿编辑器元信息规划

更新时间：2026-06-08

## 目标

分两阶段补齐公开阅读和投稿编辑体验：

- 阶段一：补齐公开阅读体验，做独立搜索页，并把公开首页“阅读趋势”改成真实访问数据。
- 阶段二：补齐投稿编辑器元信息，让封面、SEO、允许评论、置顶文章从草稿保存到审核发布，再在公开页面和搜索结果中生效。

## 阶段一：独立搜索页 + 公开首页真实趋势图

### 独立搜索页

新增前端视图 `#search?q=关键词`。

顶部搜索框行为：

- 首页顶部搜索框输入后按回车进入搜索页。
- 文章详情页顶部搜索框从只读占位改成可输入，按回车进入同一个搜索页。
- 搜索页自身也提供搜索输入框，支持再次搜索。
- 移动端使用紧凑搜索入口或搜索输入进入同一个搜索页。

搜索页内容：

- 显示当前关键词。
- 显示结果数量。
- 无结果时显示空状态。
- 结果卡片展示标题、分类、标签、摘要、发布时间、阅读/点赞/收藏等已有统计。
- 点击结果进入文章详情页。

后端搜索能力：

- 继续复用 `GET /api/articles?q=&category=&tag=`，不新增并行搜索接口。
- 关键词匹配范围扩展为标题、正文、分类名称/slug、标签名称/slug。
- 只返回 `PUBLISHED` 文章。

第一版不做：

- 搜索高亮。
- 搜索历史。
- 自动补全。

### 公开首页真实趋势图

扩展 `GET /api/articles/stats/summary`，在现有 `summary` 中增加 `visitTrend`。

返回格式：

```json
{
  "summary": {
    "todayVisits": 0,
    "totalLikes": 0,
    "totalViews": 0,
    "totalFavorites": 0,
    "visitTrend": [
      {
        "date": "2026-06-02",
        "label": "06-02",
        "value": 0
      }
    ]
  }
}
```

统计口径：

- 使用近 7 个 `Asia/Shanghai` 自然日。
- `label` 使用 `MM-DD`。
- 数据来自 `site_visits`。
- 统计首页和已发布文章页访问。
- 匿名访客按 `visitorId` 去重。
- 登录用户按 `userId` 去重。
- 与管理后台概览的近 7 日访问趋势口径保持一致。

前端行为：

- 公开首页右侧“阅读趋势”图表使用真实 `visitTrend` 渲染。
- 无数据时显示 0 值趋势。
- 下方“今日阅读”和“总点赞”继续使用现有真实统计。
- 不再使用静态占位数据。

## 阶段二：投稿编辑器封面、SEO、高级设置闭环

### 数据模型

给文章新增元信息字段：

- `coverImageUrl` / `cover_image_url`
- `coverAlt` / `cover_alt`
- `coverRatio` / `cover_ratio`
- `seoTitle` / `seo_title`
- `seoKeywords` / `seo_keywords`
- `seoDescription` / `seo_description`
- `allowComments` / `allow_comments`，默认 `true`
- `isPinned` / `is_pinned`，默认 `false`

需要新增 Prisma migration，并同步更新 Prisma schema。

### 投稿草稿接口

扩展这些接口读写并返回新增元信息：

- `POST /api/articles/drafts`
- `PATCH /api/articles/drafts/:id`
- `POST /api/articles/drafts/:id/submit`
- `GET /api/articles/drafts/:id`
- `GET /api/articles/me`

规则保持不变：

- 不自动创建空草稿。
- 只在用户手动保存草稿或提交审核时创建/更新文章记录。
- 提交后文章锁定。
- 修改已提交文章必须先撤回到草稿。

### 封面上传

封面第一版复用现有普通用户图片上传入口：

- 上传成功后把返回的图片 URL 写入 `coverImageUrl`。
- 封面比例按钮写入 `coverRatio`，默认 `16:9`。
- 可保存 `coverAlt`，用于图片替代文本。
- 不强制把封面绑定到 `article_images`。
- 不迁移已有正文图片到封面字段。

### SEO 设置

投稿编辑器保存：

- `seoTitle`
- `seoKeywords`
- `seoDescription`

公开展示：

- 文章详情页 `<title>` 优先使用 `seoTitle`。
- meta description 优先使用 `seoDescription`。
- SEO 字段为空时回退到文章标题和正文摘要。

搜索结果：

- 摘要优先使用 `seoDescription`。
- 为空时回退到正文截断摘要。

### 高级设置

第一版保留现有 UI 中的两个开关：

- 允许评论：`allowComments`
- 置顶文章：`isPinned`

生效规则：

- `allowComments=false` 时，文章详情页隐藏评论输入入口，并提示该文章已关闭评论。
- `allowComments=false` 时，后端拒绝新评论。
- `isPinned=true` 时，公开首页文章排序优先置顶，再按发布时间排序。
- 搜索页不做置顶优先，只按搜索结果的现有时间排序展示。

因为文章发布前经过管理员审核，第一版不额外新增后台置顶开关。

### 公开展示

发布后的公开文章对象返回新增字段。

消费范围：

- 首页最新发布卡片使用 `coverImageUrl`。
- 搜索结果卡片使用 `coverImageUrl`。
- 文章详情页使用 `coverImageUrl`。
- 无封面时沿用现有占位视觉。

## 测试计划

后端测试：

- 公开搜索可匹配标题、正文、分类名称/slug、标签名称/slug。
- 搜索不返回非发布文章。
- `GET /api/articles/stats/summary` 返回 7 天趋势。
- 趋势空数据补 0。
- 趋势日期按 `Asia/Shanghai` 自然日生成。
- 草稿保存、读取、提交、撤回后保留封面、SEO、高级设置字段。
- `allowComments=false` 时创建评论被拒绝。
- `isPinned=true` 的文章在公开首页列表优先排序。

前端验证：

- 首页顶部搜索回车进入 `#search?q=...`。
- 文章详情顶部搜索可用，并进入同一个搜索页。
- 搜索页刷新后仍能根据 URL 查询结果。
- 搜索页空结果、再次搜索、点击结果进入文章详情都正常。
- 首页趋势图显示真实数据并兼容空数据。
- 投稿编辑器保存后刷新仍保留封面、SEO 和高级设置。
- 投稿提交审核后编辑器锁定。
- 撤回后可继续修改元信息。

常规验证命令：

```bash
npm test --workspace server
npm run build
npx prisma validate --schema prisma/schema.prisma
git diff --check
```

## 明确不做

- 阶段一不做搜索高亮、搜索历史、自动补全。
- 阶段一不新增独立搜索 API。
- 阶段二不做富文本编辑器迁移。
- 阶段二不做真实自动保存。
- 阶段二不做完整审核历史管理。
- 阶段二不把封面强制归入 `article_images`。
- 阶段二不迁移已有正文图片为封面。
