![Cover](./docs/docs/public/rin-logo.png)

English | [简体中文](./README_zh_CN.md)

![GitHub commit activity](https://img.shields.io/github/commit-activity/w/openRin/Rin?style=for-the-badge)
![GitHub branch check runs](https://img.shields.io/github/check-runs/openRin/Rin/main?style=for-the-badge)
![GitHub top language](https://img.shields.io/github/languages/top/openRin/Rin?style=for-the-badge)
![GitHub License](https://img.shields.io/github/license/openRin/Rin?style=for-the-badge)
![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/openRin/Rin/deploy.yml?style=for-the-badge)

[![Discord](https://img.shields.io/badge/Discord-openRin-red?style=for-the-badge&color=%236e7acc)](https://discord.gg/JWbSTHvAPN)
[![Telegram](https://img.shields.io/badge/Telegram-openRin-red?style=for-the-badge&color=%233390EC)](https://t.me/openRin)

## Introduction

Rin is a modern, serverless blog platform built entirely on Cloudflare's developer platform: Pages for hosting, Workers for serverless functions, D1 for SQLite database, and R2 for object storage. Deploy your personal blog with just a domain name pointed to Cloudflare—no server management required.

## Live Demo

https://xeu.life

## Features

- **Authentication & Management**: Support for GitHub OAuth and traditional username/password login. The first registered user becomes an administrator.
- **Moments**: Share short thoughts and life updates in a dedicated social-media-style stream.
- **Full-text Search**: Quickly find articles using the built-in search functionality.
- **Content Creation**: Write and edit articles with a rich editor featuring Monaco improvements, manual date input, and WordPress import support.
- **Enhanced Rendering**: Support for Mermaid diagrams, KaTeX math formulas, callouts, alerts, embedded HTML fragments, and an image lightbox.
- **Summary Optimization**: Smart article summaries in listings that filter out raw image code for a cleaner look.
- **Featured Images**: Automatically detect the first image in the article body and use it as the cover image in listings.
- **Real-time Autosave**: Local drafts are saved automatically in real-time, with isolation between different articles.
- **Privacy Control**: Mark articles as "Visible only to me" for private drafts or personal notes, synchronized across devices.
- **Image Management**: Upload images to S3-compatible storage (e.g., Cloudflare R2) via drag-and-drop or paste, with automatic link generation.
- **Custom Slugs & Unlisted Posts**: Assign friendly URLs (e.g., `/about`) and optionally hide posts from the public homepage listing.
- **Pinned & Adjacent Articles**: Pin important posts to the top and navigate easily between adjacent articles.
- **Blogroll**: Manage friend links with automatic health checks every 20 minutes.
- **Comment System**: Full-featured comment system with replies, moderation, and Webhook notifications.
- **Visitor Statistics**: Track article performance with PV/UV statistics powered by HyperLogLog.
- **Rin CLI**: A unified command-line tool for development, database migrations, and one-click deployment.
- **Favicon Customization**: Support for uploading custom Favicons (Fixed 500 errors in previous versions).
- **Type Safety**: End-to-end type safety using shared TypeScript types via the `@rin/api` package.
- ...and more! Explore all features at https://xeu.life.

## Documentation

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/openRin/Rin.git && cd Rin

# 2. Install dependencies
bun install

# 3. Configure environment variables
cp .env.example .env.local
# Edit .env.local with your own configuration

# 4. Start the development server
bun run dev
```

Visit http://localhost:5173 to start hacking!

### Testing

Run the test suite to ensure everything works:

```bash
# Run all tests (client + server)
bun run test

# Run server tests only
bun run test:server

# Run tests with coverage
bun run test:coverage
```

### One-Command Deployment

Deploy both frontend and backend to Cloudflare with a single command:

```bash
# Deploy everything (frontend + backend)
bun run deploy

# Deploy only backend
bun run deploy:server

# Deploy only frontend
bun run deploy:client
```

**Required environment variables:**

- `CLOUDFLARE_API_TOKEN` - Your Cloudflare API token
- `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare account ID

**Optional environment variables:**

- `WORKER_NAME` - Backend worker name (default: `rin-server`)
- `PAGES_NAME` - Frontend pages name (default: `rin-client`)
- `DB_NAME` - D1 database name (default: `rin`)
- `R2_BUCKET_NAME` - R2 bucket name. If set, deploy derives the matching `S3_*` values automatically. If unset, no bucket is auto-selected.

The deployment script will automatically:

- Create D1 database if it doesn't exist
- Derive `S3_*` storage settings from `R2_BUCKET_NAME` only when it is explicitly set
- Deploy backend to Workers
- Build and deploy frontend to Pages
- Run database migrations

### GitHub Actions Workflows

The repository includes several automated workflows:

- **`ci.yml`** - Runs type checking and formatting validation on every push/PR
- **`test.yml`** - Runs comprehensive tests (server + client) with coverage reporting
- **`build.yml`** - Builds the project and triggers deployment
- **`deploy.yml`** - Deploys to Cloudflare Pages and Workers

**Required secrets (Repository Settings → Secrets and variables → Actions):**

- `CLOUDFLARE_API_TOKEN` - Your Cloudflare API token with Workers and Pages permissions
- `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare account ID

**Optional configuration (Repository Settings → Secrets and variables → Variables):**

- `WORKER_NAME`, `PAGES_NAME`, `DB_NAME` - Resource names
- `NAME`, `DESCRIPTION`, `AVATAR` - Site configuration
- `R2_BUCKET_NAME` - Specific R2 bucket to use
- `GOOGLE_VERIFICATION`, `MICROSOFT_VERIFICATION` - Site verification codes for search engines (e.g., Google Search Console, Bing Webmaster Tools)
- `GOOGLE_ANALYTICS_ID`, `MICROSOFT_CLARITY_ID` - Analytics tracking IDs (e.g., GA4 G-XXXXX, Clarity project ID)

### AI Features (powered by Cloudflare Workers AI)

Rin leverages Workers AI to provide a suite of intelligent features for content creators. Ensure you have the `AI` binding configured in your Cloudflare Worker.

- **AI Summary**: Automatically generate a 150-300 word summary of your article. Optimized prompts ensure the summary is natural and complete.
- **AI Tags**: Extract relevant hashtags from your content automatically.
- **AI Featured Image**: Generate a unique cover image for your article using Stable Diffusion or DreamShaper models based on your title.
- **AI Reformatting**: One-click optimization of Markdown formatting, spelling correction, and typography (especially for mixed Chinese/English content).
- **Model Selection**: Choose between various free Workers AI models (Llama, Mistral, Gemma, etc.) and customize model settings in the dashboard.

> **Note on SEO**: Rin automatically generates SEO-friendly metadata (Open Graph, Twitter Cards) based on your site name, description, and avatar. It also includes the AI-generated summary in meta tags to improve search engine visibility.

Full documentation is available at https://docs.openrin.org.

## Community & Support

- Join our https://discord.gg/JWbSTHvAPN for discussions and help.
- Follow updates on https://t.me/openRin.
- Found a bug or have a feature request? Please open an issue on GitHub.

## Star History

<a href="https://star-history.com/#openRin/Rin&Date">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=openRin/Rin&type=Date&theme=dark" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=openRin/Rin&type=Date" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=openRin/Rin&type=Date" />
 </picture>
</a>

## Contributing

We welcome contributions of all kinds—code, documentation, design, and ideas. Please check out our [contributing guidelines](https://docs.openrin.org/en/guide/contribution.html) and join us in building Rin together!

## License

```
MIT License

Copyright (c) 2024 Xeu

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
