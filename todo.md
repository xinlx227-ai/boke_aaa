# 私人博客项目交接报告

更新时间：2026-05-02

## 当前状态

项目已经从本地开发推进到线上可访问阶段。

- 代码仓库：`https://gitee.com/xinlx227/my_first_blog.git`
- 线上访问地址：`http://114.55.34.117`
- 服务器：阿里云轻量应用服务器，华东 1（杭州）
- 部署目录：`/www/wwwroot/private-blog`
- 后端进程：PM2 管理，进程名 `private-blog-api`
- 前端托管：Nginx 静态文件服务
- 后端代理：Nginx 将 `/api/` 转发到 `http://127.0.0.1:3000/api/`
- 上传文件访问：Nginx 将 `/uploads/` 映射到 `server/uploads/`

## 已完成能力

### 账号与登录

- 用户注册
- 用户登录
- 用户退出
- bcrypt 密码加密
- JWT 登录态
- `user_sessions` 会话表
- 同一用户最多 3 个设备在线
- 第 4 个设备登录时，最早登录设备会被踢下线
- 登录失效时前端会回到登录状态

### 文章系统

- 管理员发布 Markdown 文章
- 管理员编辑文章
- 管理员删除文章
- 文章 Markdown 原文保存到 `content_markdown`
- 渲染后的安全 HTML 保存到 `content_html`
- Markdown 渲染经过 XSS 清洗
- 前台文章列表
- 前台文章详情
- 文章内容不会因为渲染丢失原文

### 图片能力

- 管理员可以上传文章图片
- 图片保存在 `server/uploads/articles/{articleId}/`
- 上传接口返回可直接粘贴到 Markdown 的图片语法
- 前台文章详情可以显示文章图片
- 线上 Nginx 已配置 `/uploads/` 访问路径

### 批量导入

- 管理员可以上传 `.zip`
- zip 内 Markdown 文件按文件名前缀排序导入
- 每个 Markdown 文件导入为一篇文章
- Markdown 中引用的 `images/a.png` 会转换为系统可访问图片地址
- 导入过程返回日志：
  - 成功导入的文章
  - 缺失图片
  - 不支持的文件
  - 单个文件失败原因
- 单篇失败不会影响其他文章继续导入

### 评论系统

- 文章详情页显示评论列表
- 未登录用户可以查看评论
- 登录用户可以发表评论
- 管理员可以删除评论
- 评论表支持 `parent_id`，后续可以扩展回复功能

### 阅读体验

- 文章搜索：按标题和正文内容搜索
- 分类：文章可绑定一个分类
- 标签：文章可绑定多个标签
- 前台可按分类或标签筛选文章
- 文章详情页根据 Markdown 标题生成目录 TOC
- TOC 可点击跳转章节
- 移动端 TOC 可折叠

### 移动端适配

- 375px 宽度下避免横向滚动
- 图片 `max-width: 100%; height: auto`
- 顶部导航在手机端变成折叠菜单
- 评论输入框保持在页面正常流中，不遮挡内容
- 文章正文行距适合手机阅读

### 提示组件

- 页面上方居中显示提示
- 1.8 秒后自动消失
- 多次调用时新提示覆盖旧提示
- 已缩小尺寸，适配 PC 和移动端

## 线上部署关键命令

### 拉取最新代码

```bash
cd /www/wwwroot/private-blog
git pull
```

### 安装依赖

```bash
cd /www/wwwroot/private-blog
npm install
```

### Prisma 生成与迁移

如果提示 `@prisma/client did not initialize yet`，先执行：

```bash
cd /www/wwwroot/private-blog/server
npx prisma generate
```

执行数据库迁移：

```bash
cd /www/wwwroot/private-blog/server
npx prisma migrate deploy
```

### 构建前端

```bash
cd /www/wwwroot/private-blog
npm run build --workspace client
```

### 后端临时启动

```bash
cd /www/wwwroot/private-blog/server
npm run start
```

### PM2 常驻运行

```bash
cd /www/wwwroot/private-blog/server
pm2 start src/server.js --name private-blog-api
pm2 save
```

### 查看后端状态

```bash
pm2 status
pm2 logs private-blog-api
```

### 重启后端

```bash
pm2 restart private-blog-api
```

### 重载 Nginx

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 重要问题记录

### 1. 前端线上提示 Failed to fetch

原因：

- 前端最初写死了 `http://localhost:3000/api`
- 用户公网访问时，浏览器里的 `localhost` 指向访问者自己的电脑，不是服务器

处理：

- 已改为相对路径 `/api`
- 图片资源基地址也改为相对路径

相关文件：

- `client/src/App.vue`

### 2. Prisma 在服务器上 ESM 导入报错

原因：

- Node 20 + Prisma CommonJS 包在服务器上不支持部分命名导入

处理：

- Prisma 相关导入已改为默认导入后解构

相关文件：

- `server/src/lib/prisma.js`
- `server/src/routes/articles.js`
- `server/src/routes/auth.js`
- `server/src/routes/comments.js`

### 3. Prisma Client 未生成

报错：

```text
@prisma/client did not initialize yet. Please run "prisma generate"
```

处理：

```bash
cd /www/wwwroot/private-blog/server
npx prisma generate
```

## 本地开发命令

### 启动前后端

```powershell
npm run dev
```

### 只启动前端

```powershell
npm run dev:client
```

### 只启动后端

```powershell
npm run dev:server
```

### 后端测试

```powershell
npm test --workspace server
```

### 前端构建

```powershell
npm run build --workspace client
```

## 最近验证结果

本地已验证：

- `npm test --workspace server`：4 个测试通过
- `npm run build --workspace client`：构建通过

服务器已验证：

- `curl http://127.0.0.1:3000/api/articles` 返回 `{"articles":[]}`
- `curl http://114.55.34.117/api/articles` 返回 `{"articles":[]}`
- 前端可以通过公网访问
- Nginx `/api` 代理可用

## 后续精细化修改建议

### 优先级 P0：正式使用前建议完成

- 创建正式管理员账号，并删除或禁用测试账号
- 修改线上 `JWT_SECRET` 为更长的随机字符串
- 检查 `server/.env` 不要提交到仓库
- 确认阿里云安全组只开放必要端口：80、443、SSH 端口
- 给数据库用户使用独立强密码，不要使用服务器登录密码

### 优先级 P1：个人博客体验优化

- 设计个人首页：
  - 头像
  - 昵称
  - 简介
  - 社交链接
  - 最新文章
- 增加“关于我”页面
- 增加文章归档页，按年份和月份归类
- 文章列表增加摘要、阅读时间、发布时间
- 文章详情增加上一篇/下一篇
- 标签和分类做成更精致的筛选栏
- 评论区增加空状态、加载状态和删除确认

### 优先级 P2：后台管理优化

- 后台文章列表增加搜索、状态筛选、批量删除
- Markdown 编辑器增加实时预览
- 图片上传后增加图片库选择
- 批量导入结果支持下载日志
- 添加草稿/发布状态的清晰切换
- 管理员首页增加统计：
  - 文章数量
  - 评论数量
  - 分类数量
  - 标签数量

### 优先级 P3：安全与稳定性

- 注册、登录、评论接口增加频率限制
- 评论内容增加长度限制和更清晰的错误提示
- 上传图片限制文件大小和 MIME 类型
- zip 批量导入增加总大小限制
- 增加后端请求日志
- 增加数据库备份脚本
- 配置 HTTPS；如果没有域名，先继续使用 HTTP

### 优先级 P4：长期扩展

- 评论回复功能
- 评论审核功能
- 文章置顶
- 文章浏览量
- 文章点赞
- RSS 订阅
- 站点地图 `sitemap.xml`
- SEO meta 信息
- 暗色模式
- 主题色自定义

## 下一次继续工作建议

如果后续继续做个人精修，可以从下面三条路线选一条：

1. 先做个人主页和关于页，让网站更像真正的个人博客。
2. 先做后台 Markdown 编辑器预览和图片库，让写文章更舒服。
3. 先做安全加固和备份脚本，让线上运行更放心。

推荐下一步：

```text
请继续这个私人博客项目。先阅读 todo.md，然后帮我做个人首页和关于我页面，要求风格简洁、适合个人博客，并保持移动端适配。
```
