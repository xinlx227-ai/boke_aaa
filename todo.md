# Private Blog Project Handoff

## Current Status

This project has completed:

- Task 2: authentication and session management
- Task 3: article publishing

## Completed Features

### Auth

- user registration
- bcrypt password hashing
- JWT login
- `device_id` generation on each login
- `user_sessions` tracking
- maximum 3 active sessions per user
- oldest active session is disabled automatically when limit is exceeded
- protected API checks both JWT and session validity
- invalid session returns `401`
- frontend automatically returns to login on `401`

### Article Publishing

- admin can create articles
- admin can edit articles
- admin can publish articles
- admin can delete articles
- Markdown is stored in `content_markdown`
- safe rendered HTML is stored in `content_html`
- Markdown rendering is sanitized against XSS
- image upload is supported
- uploaded article images are stored under `uploads/articles/{articleId}/`
- upload API returns Markdown image snippet
- public article detail page renders `content_html`

### Frontend

- UI text has been changed to Chinese
- public view, user dashboard, and admin dashboard are separated
- after login:
  - normal user goes to user dashboard
  - admin goes to admin dashboard
- logged-in page shows current username

## Database

### Production database

- `private_blog`

### Test database

- `private_blog_test`

Notes:

- test environment uses `server/.env.test`
- backend test suite runs against `private_blog_test`

## Accounts

### Admin account

- username: `lxlx`
- password: `123456`
- role: `ADMIN`

### Normal user account

- username: `bong`
- password: `123789`
- role: `USER`

Notes:

- both passwords were repaired to valid bcrypt hashes
- if login fails again, first check whether frontend/backend are connected to the correct environment

## Important Runtime Notes

- frontend should be opened with:
  - `http://localhost:5173`
- avoid:
  - `http://127.0.0.1:5173`

Reason:

- backend `CLIENT_URL` currently uses `http://localhost:5173`
- using `127.0.0.1` may trigger fetch/CORS confusion depending on which local service is running

## Start Commands

### Start both frontend and backend

```powershell
npm run dev
```

### Start frontend only

```powershell
npm run dev:client
```

### Start backend only

```powershell
npm run dev:server
```

## Stop Commands

### Stop manually in current terminal

```powershell
Ctrl + C
```

### Force-stop ports 3000 and 5173

```powershell
Get-NetTCPConnection -LocalPort 3000,5173 -State Listen -ErrorAction SilentlyContinue |
Select-Object -ExpandProperty OwningProcess -Unique |
ForEach-Object { Stop-Process -Id $_ -Force }
```

## Validation Status

Verified successfully:

- `npm install`
- `npm run prisma:deploy`
- `npm test --workspace server`
- `npm run build --workspace client`

## Suggested Next Tasks

Recommended next milestone:

- comment system
- comment moderation
- richer public article list and navigation
- better admin dashboard polish
- optional bootstrap rule for first registered user becoming admin

## If Continuing Later

Suggested prompt for next session:

```text
继续私人博客项目：
- 已完成任务2：登录/注册/JWT/user_sessions/3设备限制
- 已完成任务3：文章创建、编辑、发布、删除、Markdown、XSS过滤、图片上传
- 前端已改成中文，并区分游客/用户中心/管理员后台
- 正式库：private_blog
- 测试库：private_blog_test
- admin账号：lxlx
- user账号：bong
```
