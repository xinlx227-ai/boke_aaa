# Private Blog System

This repository contains a staged full-stack private blog project built with Vue 3, Express, MySQL, and Prisma.

The project currently includes two working milestones:
- Task 2: authentication and session management
- Task 3: article publishing with Markdown, safe HTML rendering, and image uploads
- Task 4: admin batch article import from Markdown zip archives
- Task 5: comments and mobile responsive layout
- Task 6: public reading experience with search, categories, tags, and table of contents

## Implemented Features

### Authentication

- user registration with bcrypt password hashing
- JWT-based login
- per-login `device_id` generation
- `user_sessions` tracking
- automatic eviction when a user exceeds 3 active devices
- protected API validation against both JWT and active session state
- client-side redirect back to login when a session becomes invalid

### Article Publishing

- admin-only article create, edit, publish, and delete
- Markdown stored in `content_markdown`
- sanitized rendered HTML stored in `content_html`
- XSS-safe Markdown rendering via `markdown-it` + `sanitize-html`
- article image uploads stored under `uploads/articles/{articleId}/`
- image upload API returns a Markdown snippet ready to paste into the editor
- admin batch import from `.zip` files containing Markdown and images
- imported Markdown files are sorted by filename and created as draft articles
- imported local image references such as `images/a.png` are copied to article uploads and rewritten to `/uploads/articles/{articleId}/...`
- import API returns detailed logs for imported articles, missing images, unsupported files, and per-file failures
- public published article list and article detail rendering
- public article search by title or Markdown content
- public article filtering by category or tag
- article detail responses include a Markdown-generated table of contents

### Taxonomy

- articles can belong to one category
- articles can have multiple tags
- category and tag metadata are returned with article list and detail responses
- public filter metadata is available for building navigation controls

### Comments

- published article detail pages show comments
- anonymous visitors can read comments
- logged-in users can post comments
- comments store `parent_id` for future reply support
- admins can delete comments

### Mobile Layout

- top navigation collapses into a mobile menu
- 375px wide screens avoid horizontal page scrolling
- article images use `max-width: 100%` and `height: auto`
- comment form stays in normal page flow and does not cover content
- article body line-height is tuned for phone reading
- article table of contents collapses on mobile

## Tech Stack

- Frontend: Vue 3 + Vite
- Backend: Node.js + Express
- Database: MySQL
- ORM: Prisma
- Auth: JWT + `user_sessions`
- Markdown: `markdown-it`
- HTML sanitizing: `sanitize-html`
- Uploads: `multer`
- Zip parsing: `adm-zip`
- Password hashing: `bcrypt`

## Project Structure

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
|   |   |   `-- env.js
|   |   |-- lib/
|   |   |   |-- auth.js
|   |   |   |-- markdown.js
|   |   |   `-- prisma.js
|   |   |-- middleware/
|   |   |   |-- auth.js
|   |   |   `-- role.js
|   |   |-- routes/
|   |   |   |-- articles.js
|   |   |   |-- auth.js
|   |   |   |-- comments.js
|   |   |   `-- index.js
|   |   |-- app.js
|   |   `-- server.js
|   |-- test/
|   |   |-- articles.test.js
|   |   `-- auth.test.js
|   |-- uploads/
|   |   `-- articles/
|   |-- .env
|   |-- .env.example
|   |-- .env.test
|   `-- package.json
|-- package.json
`-- README.md
```

## Environment Requirements

- Node.js 20+
- npm 10+
- MySQL 8+

## Environment Variables

### Main environment

Create `server/.env` from `server/.env.example`.

```env
DATABASE_URL="mysql://root:password@localhost:3306/private_blog"
PORT=3000
CLIENT_URL="http://localhost:5173"
JWT_SECRET="replace-with-a-strong-secret"
JWT_EXPIRES_IN="7d"
```

### Test environment

`server/.env.test` is used by the backend test suite.

```env
DATABASE_URL="mysql://root:password@localhost:3306/private_blog_test"
PORT=3000
CLIENT_URL="http://localhost:5173"
JWT_SECRET="replace-with-a-strong-secret"
JWT_EXPIRES_IN="7d"
```

## Install

Run from the repository root:

```bash
npm install
```

## Database Migration

If the migration files already exist, apply them with:

```bash
npm run prisma:generate
npm run prisma:deploy
```

If you are creating a new local migration during development:

```bash
npm run prisma:migrate -- --name your_migration_name
```

## Development

Start both frontend and backend:

```bash
npm run dev
```

Default URLs:

- frontend: [http://localhost:5173](http://localhost:5173)
- backend health check: [http://localhost:3000/api/health](http://localhost:3000/api/health)

## Backend Test

Run the backend integration tests:

```bash
npm test --workspace server
```

The backend test suite uses the isolated `private_blog_test` database defined in `server/.env.test`.

Current backend test coverage:
- registration
- bcrypt password hashing
- JWT login
- `user_sessions` writes
- three-device active-session limit
- invalidated session returning `401`
- logout invalidating the current session
- admin article creation
- Markdown to HTML generation
- XSS sanitization checks
- image upload handling
- Markdown zip batch import
- import logs for successful articles, missing images, unsupported files, and failed files
- public article search by content
- public article filtering by category and tag
- article detail table of contents generation
- public comment listing
- authenticated comment creation
- `parent_id` validation for reply-ready comments
- admin-only comment deletion
- public published article retrieval
- article deletion

## Frontend Build

```bash
npm run build --workspace client
```

## Auth API

### `POST /api/auth/register`

Request body:

```json
{
  "username": "alice",
  "email": "alice@example.com",
  "password": "Passw0rd!"
}
```

### `POST /api/auth/login`

Request body:

```json
{
  "account": "alice@example.com",
  "password": "Passw0rd!"
}
```

Response body:

```json
{
  "token": "<jwt>",
  "deviceId": "<uuid>",
  "user": {
    "id": 1,
    "username": "alice",
    "email": "alice@example.com",
    "role": "USER",
    "createdAt": "2026-05-01T00:00:00.000Z"
  }
}
```

### `GET /api/auth/me`

Requires `Authorization: Bearer <jwt>`.

### `POST /api/auth/logout`

Requires `Authorization: Bearer <jwt>`.

## Article API

### Public endpoints

- `GET /api/articles`
  Returns published articles only. Supports optional query parameters:
  - `q`: search article title or Markdown content
  - `category`: category slug
  - `tag`: tag slug
- `GET /api/articles/filters`
  Returns categories and tags for public filter controls.
- `GET /api/articles/:slug`
  Returns a published article detail with rendered `content_html`, category, tags, and `toc`.

### Admin endpoints

These endpoints require a logged-in user with `role = ADMIN`.

- `GET /api/articles/admin/list`
- `POST /api/articles/admin`
- `PATCH /api/articles/admin/:id`
- `POST /api/articles/admin/:id/publish`
- `DELETE /api/articles/admin/:id`
- `POST /api/articles/admin/:id/images`
- `POST /api/articles/admin/import`

### Create or update article payload

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

### Article detail TOC response

Article detail responses include a `toc` array generated from Markdown headings:

```json
{
  "article": {
    "title": "Hello Markdown",
    "contentHtml": "<h1 id=\"heading\">Heading</h1>",
    "category": {
      "name": "Guides",
      "slug": "guides"
    },
    "tags": [
      {
        "name": "Markdown",
        "slug": "markdown"
      }
    ],
    "toc": [
      {
        "id": "heading",
        "level": 1,
        "title": "Heading"
      }
    ]
  }
}
```

### Upload image response

Example response:

```json
{
  "image": {
    "id": 1,
    "imageUrl": "/uploads/articles/12/1714555555555-demo.png",
    "altText": "Demo image",
    "sortOrder": 0
  },
  "markdown": "![Demo image](/uploads/articles/12/1714555555555-demo.png)"
}
```

### Batch import articles

`POST /api/articles/admin/import`

Requires `Authorization: Bearer <jwt>` and `role = ADMIN`.

Request content type: `multipart/form-data`

Form field:

- `archive`: a `.zip` file

Supported zip layout:

```text
01-first-chapter.md
02-second-chapter.md
03-third-chapter.md
images/a.png
images/b.jpg
```

Import behavior:

- every `.md` file becomes one draft article
- Markdown files are sorted by filename with numeric ordering
- the article title is read from the first `# Heading`; if no heading exists, it falls back to the filename
- the article slug is generated from the Markdown filename
- Markdown image references such as `images/a.png` are copied to `uploads/articles/{articleId}/`
- copied images are rewritten to `/uploads/articles/{articleId}/{fileName}`
- one failed Markdown file does not stop the rest of the import
- unsupported files are reported as format errors

Example response:

```json
{
  "imported": [
    {
      "file": "01-first-chapter.md",
      "article": {
        "id": 12,
        "title": "First Chapter",
        "slug": "01-first-chapter",
        "status": "DRAFT"
      }
    }
  ],
  "missingImages": [
    {
      "articleId": 13,
      "path": "images/missing.jpg"
    }
  ],
  "formatErrors": [
    {
      "file": "notes.txt",
      "reason": "Unsupported file type. Only .md and common image files are imported."
    }
  ],
  "failed": [
    {
      "file": "02-duplicate.md",
      "reason": "An article with that slug already exists."
    }
  ],
  "summary": {
    "imported": 1,
    "missingImages": 1,
    "formatErrors": 1,
    "failed": 1
  }
}
```

## Comment API

### `GET /api/comments/articles/:slug`

Returns approved comments for a published article. This endpoint is public.

### `POST /api/comments/articles/:slug`

Requires `Authorization: Bearer <jwt>`.

Request body:

```json
{
  "content": "A useful comment",
  "parentId": null
}
```

`parentId` is optional. When provided, it must reference an approved comment on the same article.

### `DELETE /api/comments/:id`

Requires a logged-in admin.

## Admin Role Note

Newly registered users default to `USER`.

If you want to test article publishing immediately, promote a user manually:

```sql
UPDATE users
SET role = 'ADMIN'
WHERE email = 'your-admin@example.com';
```

## Current Status

Implemented:
- workspace setup with frontend/backend split
- Prisma schema and migration
- safe Markdown rendering utilities
- auth routes and session middleware
- frontend login/register flow
- admin article publishing workflow
- image upload and Markdown insertion support
- admin Markdown zip batch import workflow
- article search, category filtering, tag filtering, and TOC
- article comment list, posting, and admin deletion
- mobile top menu and 375px responsive layout
- public article list and detail rendering
- backend integration tests for auth and articles

Last local validation on 2026-05-02:
- `npm install` passed
- `npm run prisma:deploy` passed; production database applied `20260502113000_reading_experience`
- `npm test --workspace server` passed, 4/4 tests
- `npm run build --workspace client` passed

Next suggested milestone:
- pagination, comment moderation, richer public blog navigation, and nested reply UI
