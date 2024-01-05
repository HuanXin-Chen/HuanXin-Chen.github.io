## ✍️Introduction
A personal static webpage developed using the astro framework.<br />
The website is developed based on [situ-note](https://github.com/situ2001/situ-note) and packaged using npm.<br />
combining personal circumstances to simplify the deployment and push process.<br />
The image hosting is stored in Yuque, and the cross-domain restrictionThe image hosting is stored in Yuque, and the cross-domain restriction is solved to request image resources.<br />
# 🤖Astro Starter Kit
```go
npm create astro@latest -- --template basics
```
## 🚀 Project Structure
Inside of your Astro project, you'll see the following folders and files:
```go
/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   └── Card.astro
│   ├── layouts/
│   │   └── Layout.astro
│   └── pages/
│       └── index.astro
└── package.json
```
Astro looks for .astro or .md files in the src/pages/ directory. Each page is exposed as a route based on its file name.<br />There's nothing special about src/components/, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.<br />Any static assets, like images, can be placed in the public/ directory.
## 🧞 Commands
All commands are run from the root of the project, from a terminal:

| Command | Action |
| --- | --- |
| npm install | Installs dependencies |
| npm run dev | Starts local dev server at localhost:4321 |
| npm run build | Build your production site to ./dist/ |
| npm run preview | Preview your build locally, before deploying |
| npm run astro ... | Run CLI commands like astro add, astro check |
| npm run astro -- --help | Get help using the Astro CLI |

## 🙊Deploy
Using the GitHub Page.
```go
name: Deploy to GitHub Pages

on:
  # 每次推送到 `main` 分支时触发这个“工作流程”
  # 如果你使用了别的分支名，请按需将 `main` 替换成你的分支名
  push:
    branches: [ new-blog ]
  # 允许你在 GitHub 上的 Actions 标签中手动触发此“工作流程”
  workflow_dispatch:

# 允许 job 克隆 repo 并创建一个 page deployment
permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout your repository using git
        uses: actions/checkout@v3
      - name: Install, build, and upload your site
        uses: withastro/action@v1
          # with:
          # path: . # 存储库中 Astro 项目的根位置。（可选）
          # node-version: 18 # 用于构建站点的特定 Node.js 版本，默认为 18。（可选）
        # package-manager: pnpm@latest # 应使用哪个 Node.js 包管理器来安装依赖项和构建站点。会根据存储库中的 lockfile 自动检测。（可选）

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v1

```
## 💣MD-Title
All required！
```go
---
title:
comments:
date:
categories:
description:
---

```
