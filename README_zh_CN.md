![封面](./docs/docs/public/rin-logo.png)

[English](./README.md) | 简体中文

![GitHub commit activity](https://img.shields.io/github/commit-activity/w/openRin/Rin?style=for-the-badge)
![GitHub branch check runs](https://img.shields.io/github/check-runs/openRin/Rin/main?style=for-the-badge)
![GitHub top language](https://img.shields.io/github/languages/top/openRin/Rin?style=for-the-badge)
![GitHub License](https://img.shields.io/github/license/openRin/Rin?style=for-the-badge)
![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/openRin/Rin/deploy.yml?style=for-the-badge)

[![Discord](https://img.shields.io/badge/Discord-openRin-red?style=for-the-badge&color=%236e7acc)](https://discord.gg/JWbSTHvAPN)
[![Telegram](https://img.shields.io/badge/Telegram-openRin-red?style=for-the-badge&color=%233390EC)](https://t.me/openRin)

## 项目简介

Rin 是一个基于 Cloudflare 开发者平台构建的现代化、无服务器博客系统，完全利用 Cloudflare Pages 托管、Workers 提供无服务器函数、D1 作为 SQLite 数据库、R2 进行对象存储。仅需一个指向 Cloudflare 的域名即可部署你的个人博客，无需服务器运维。

## 在线演示

https://xeu.life

## 功能特性

- **用户认证与管理**：支持 GitHub OAuth 和传统的账号密码登录。首个注册用户自动成为管理员。
- **Moments**：在专门的社交媒体风格流中分享简短的想法和生活动态。
- **全文搜索**：利用内置搜索功能快速查找文章。
- **内容创作**：通过丰富的编辑器撰写和编辑文章，包含 Monaco 编辑器改进及 WordPress 导入支持。
- **渲染增强**：支持 Mermaid 图表、KaTeX 数学公式、呼出（Callouts）、警示（Alerts）以及图片灯箱，提升阅读体验。
- **实时自动保存**：本地草稿实时自动保存，不同文章之间互不干扰。
- **隐私控制**：可将文章标记为“仅自己可见”，用作私有草稿或个人笔记，并支持跨设备同步。
- **图片管理**：通过拖放或粘贴上传图片至兼容 S3 的存储（如 Cloudflare R2），并自动生成链接。
- **自定义别名与不公开文章**：为文章设置友好的 URL（如 `/about`），并可选择将文章从首页列表中隐藏。
- **文章置顶与相邻文章**：将重要文章置顶，并可在相邻文章间轻松切换。
- **友情链接**：管理友链，后端每 20 分钟自动检查链接可用性。
- **评论系统**：功能齐全的评论系统，支持回复、管理及 Webhook 通知。
- **访问统计**：利用基于 HyperLogLog 的 PV/UV 统计功能追踪文章表现。
- **Rin CLI**：统一的命令行工具，用于开发、数据库迁移及一键部署。
- **类型安全**：通过 `@rin/api` 包在客户端和服务器之间共享 TypeScript 类型，实现端到端类型安全。
- ……更多功能请访问 https://xeu.life 探索。

## 文档

### 快速开始

```bash
# 1. 克隆仓库
git clone https://github.com/openRin/Rin.git && cd Rin

# 2. 安装依赖
bun install

# 3. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入你的配置信息

# 4. 启动开发服务器
bun run dev
```

访问 http://localhost:5173 开始开发！

### 测试

运行测试套件以确保一切正常：

```bash
# 运行所有测试（客户端 + 服务器）
bun run test

# 仅运行服务器测试
bun run test:server

# 运行测试并设置覆盖率
bun run test:coverage
```

### 一键部署

使用一条命令即可将前端和后端同时部署到 Cloudflare：

```bash
# 部署所有内容（前端+后端）
bun run deploy

# 仅部署后端
bun run deploy:server

# 仅部署前端
bun run deploy:client
```

**必需的环境变量：**

- `CLOUDFLARE_API_TOKEN` - 您的 Cloudflare API 令牌
- `CLOUDFLARE_ACCOUNT_ID` - 您的 Cloudflare 帐户 ID

**可选的环境变量：**

- `WORKER_NAME` - 后端工作进程名称（默认值：`rin-server`）
- `PAGES_NAME` - 前端页面名称（默认值：`rin-client`）
- `DB_NAME` - D1 数据库名称（默认值：`rin`）
- `R2_BUCKET_NAME` - R2 存储桶名称。设置后，部署会自动推导对应的 `S3_*` 配置；未设置时，不会自动选择任何 bucket。

部署脚本将自动执行以下操作：

- 自动检测并创建 D1 数据库如果不存在
- 仅在显式设置 `R2_BUCKET_NAME` 时，自动推导对应的 `S3_*` 存储配置
- 部署后端到 Workers
- 构建前端并将其部署到 Pages
- 运行数据库迁移

### GitHub Actions Workflows

存储库包含多个自动化工作流程：

- **`ci.yml`** - 每次推送/PR 都会运行类型检查和格式验证
- **`test.yml`** - 运行全面的测试（服务器+客户端），并生成覆盖率报告
- **`build.yml`** - 构建项目并触发部署
- **`deploy.yml`** - 部署到 Cloudflare Pages 和 Workers

**必备变量 (Repository Settings → Secrets and variables → Actions):**

- `CLOUDFLARE_API_TOKEN` - 您的 Cloudflare API 令牌，包含 Workers 和 Pages 权限
- `CLOUDFLARE_ACCOUNT_ID` - 您的 Cloudflare 帐户 ID

**可选配置(Repository Settings → Secrets and variables → Variables):**

- `WORKER_NAME`, `PAGES_NAME`, `DB_NAME` - 资源名称
- `NAME`, `DESCRIPTION`, `AVATAR` - 站点配置
- `R2_BUCKET_NAME` - 要使用的特定 R2 存储桶
- `GOOGLE_VERIFICATION`, `MICROSOFT_VERIFICATION` - 用于搜索引擎的站点验证代号（如 Google Search Console、Bing Webmaster Tools）
- `GOOGLE_ANALYTICS_ID`, `MICROSOFT_CLARITY_ID` - 站点统计分析 ID（如 GA4 的 G-XXXXX、Clarity 项目 ID）

### AI 增强功能 (由 Cloudflare Workers AI 驱动)

Rin 充分利用了 Cloudflare Workers AI 的免费模型，为创作者提供了一系列智能工具。请确保您的 Cloudflare Worker 已配置 `AI` 绑定。

- **AI 摘要**: 自动生成 150-300 字的文章摘要。经过优化的 Prompt 确保摘要自然、完整且不被截断。
- **AI 标签**: 自动根据文章内容提取相关的关键词标签。
- **AI 配图**: 利用 Stable Diffusion 或 DreamShaper 模型，根据文章标题生成独一无二的封面图。
- **AI 排版**: 一键优化 Markdown 排版、纠正错别字、统一标点符号，特别优化了中英文混排体验。
- **模型切换**: 可以在后台设置中自由切换多种 Workers AI 免费模型（如 Llama, Mistral, Gemma 等），并自定义模型配置。

> **关于 SEO**: Rin 会根据配置自动生成 SEO 友好的元数据（Open Graph、Twitter Cards），并自动将 AI 生成的摘要填入 meta 标签，有助于搜索引擎收录和提升网站传播度。

完整文档请访问 https://docs.openrin.org。

## 社区与支持

- 加入我们的 https://discord.gg/JWbSTHvAPN 参与讨论或获取帮助。
- 关注 https://t.me/openRin 频道获取最新动态。
- 发现 Bug 或有功能建议？欢迎在 GitHub 上提交 Issue。

## Star 历史

<a href="https://star-history.com/#openRin/Rin&Date">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=openRin/Rin&type=Date&theme=dark" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=openRin/Rin&type=Date" />
   <img alt="Star 历史图表" src="https://api.star-history.com/svg?repos=openRin/Rin&type=Date" />
 </picture>
</a>

## 参与贡献

我们欢迎各种形式的贡献——代码、文档、设计和想法。请查阅我们的[贡献指南](https://docs.openrin.org/guide/contribution.html)，一起参与 Rin 的构建！

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
