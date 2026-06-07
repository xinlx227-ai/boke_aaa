# 用户中心安全闭环计划

更新时间：2026-06-06

## 目标

下一步完善用户中心里的三个安全相关能力：

- 通知已读/未读状态
- 会话设备名称解析
- 更完整的安全审计

这轮目标是做一个用户本人可见的小闭环：用户可以看到互动通知是否已读、能更清楚地识别当前登录设备，并能在安全设置中查看最近安全活动。

## 明确不做

- 不实现真实短信验证码。
- 不实现微信/QQ/支付宝真实 OAuth。
- 微信/QQ/支付宝继续只保存本地绑定标记。
- 第一版不做管理员全站安全审计后台。
- 第一版不把互动通知改成完整通知表。

## 当前状态

- 互动通知当前由 `/api/users/me/interactions` 从评论、文章点赞、文章收藏、评论点赞实时派生。
- 当前没有通知表，也没有已读/未读状态。
- `user_sessions` 已保存 `deviceId`、`ipAddress`、`userAgent`、`lastActiveAt` 和 `isActive`。
- 前端目前只粗略展示 userAgent，不做完整设备名称解析。
- 修改密码、注销会话、手机号/本地绑定状态变更目前没有统一安全审计记录。

## 实现方案

### 1. 通知已读/未读

保留现有互动通知实时派生逻辑，不复制通知正文，不重写评论/点赞/收藏写入链路。

新增一张轻量已读状态表，用于记录当前用户对派生通知的阅读状态。

建议通知 key 使用稳定组合：

```text
type:eventId:actorId
```

示例：

```text
comment_on_my_article:123:8
like_my_article:42:9
favorite_my_article:42:11
like_my_comment:55:7
reply_to_my_comment:91:6
```

接口建议：

- `GET /api/users/me/interactions`：继续返回互动通知，同时增加 `isRead`、`readAt` 和 `unreadCount`。
- `PATCH /api/users/me/interactions/:key/read`：标记单条通知为已读。
- `PATCH /api/users/me/interactions/read-all`：标记当前用户所有已派生通知为已读。

前端行为：

- 用户面板通知列表显示未读标记。
- 顶部通知按钮显示未读状态。
- 未读通知卡片显示橙色红点，点击通知卡片标记该条已读并跳转到相关文章。
- 评论相关通知跳转到文章详情后滚动到评论区，不做单条评论精准高亮。
- 支持全部标记已读。

### 2. 会话设备名称解析

使用 `ua-parser-js` 解析 `user_sessions.user_agent`。

后端在会话列表中返回友好设备信息，前端不再自己猜测设备名称。

建议返回字段：

```json
{
  "deviceName": "Chrome on Windows",
  "browserName": "Chrome",
  "browserVersion": "125",
  "osName": "Windows",
  "osVersion": "10",
  "deviceType": "desktop"
}
```

兼容规则：

- 空 `userAgent` 返回 `未知设备`。
- 无法识别浏览器时返回 `未知浏览器`。
- 无法识别系统时返回 `未知系统`。
- `deviceType` 默认使用 `desktop`，移动端识别为 `mobile` 或 `tablet`。

前端行为：

- 安全设置页设备列表优先展示 `deviceName`。
- 次要信息展示 IP、最近活跃时间和是否当前设备。
- 注销会话逻辑保持不变。

### 3. 安全审计

新增 `security_audit_events` 表，记录用户本人安全相关动作。

第一版记录事件：

- 登录成功
- 退出登录
- 修改密码
- 注销会话
- 手机号保存或清空
- 微信/QQ/支付宝本地绑定状态变更

建议字段：

```text
id
user_id
session_id
event_type
event_summary
ip_address
user_agent
metadata
created_at
```

接口建议：

- `GET /api/users/me/security-events`：返回当前用户最近 5 条安全活动。

前端行为：

- 安全设置页在“第三方账号绑定”下面新增“最近安全活动”模块。
- 每条记录展示事件名称、时间、设备摘要和 IP。
- metadata 只用于补充展示，不暴露敏感 token、密码或真实密钥。

## 数据迁移建议

新增迁移：

```text
server/prisma/migrations/<timestamp>_user_center_security_loop/migration.sql
```

新增模型建议：

```prisma
model UserNotificationRead {
  id              Int      @id @default(autoincrement())
  userId          Int      @map("user_id")
  notificationKey String   @map("notification_key") @db.VarChar(191)
  readAt          DateTime @default(now()) @map("read_at")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  @@unique([userId, notificationKey])
  @@index([userId, readAt])
  @@map("user_notification_reads")
}

model SecurityAuditEvent {
  id           Int      @id @default(autoincrement())
  userId       Int      @map("user_id")
  sessionId    Int?     @map("session_id")
  eventType    String   @map("event_type") @db.VarChar(80)
  ipAddress    String?  @map("ip_address") @db.VarChar(45)
  userAgent    String?  @map("user_agent") @db.VarChar(500)
  metadata     Json?
  createdAt    DateTime @default(now()) @map("created_at")

  @@index([userId, createdAt])
  @@index([eventType, createdAt])
  @@map("security_audit_events")
}
```

## 测试计划

后端测试：

- 互动通知默认未读。
- 单条通知标记已读后返回 `isRead: true`。
- 全部标记已读后 `unreadCount` 为 0。
- 登录成功写入安全审计事件。
- 已存在账号登录失败时写入安全审计事件，不存在账号不写入。
- 退出登录写入安全审计事件。
- 修改密码写入安全审计事件，并保持“其他设备退出登录”逻辑。
- 注销会话写入安全审计事件。
- 手机号和本地绑定状态变更写入安全审计事件。
- 会话列表返回解析后的浏览器、系统、设备类型。
- 空 `userAgent` 不报错，并返回未知设备信息。

前端验证：

- 通知列表展示未读状态。
- 单条已读和全部已读交互后刷新状态正确。
- 点击通知卡片后完成已读并跳转到文章；评论相关通知滚动到评论区。
- 设备列表展示友好设备名称。
- 第三方账号绑定下方展示最近 5 条安全事件。

命令：

```bash
npm test --workspace server
npm run build
npx prisma validate --schema prisma/schema.prisma
git diff --check
```

## 实施顺序

1. 新增 Prisma schema 和 SQL migration。
2. 安装并接入 `ua-parser-js`。
3. 抽取通知 key 生成和已读状态合并逻辑。
4. 增加通知已读接口。
5. 增加安全审计写入 helper。
6. 在登录、退出、改密、注销会话、绑定变更中写入审计事件。
7. 增加安全审计查询接口。
8. 更新用户面板前端通知列表、设备列表和安全活动模块。
9. 补充后端测试。
10. 运行验证命令。

## 验收标准

- 通知已读/未读、设备解析、安全审计的计划完整可读。
- 文档明确记录短信验证码和真实 OAuth 不做。
- 后续实现时不需要重新决定第一版范围。
