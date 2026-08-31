# AnimaDocs

AnimaDocs 是一个面向中文用户的 ComfyUI 与 Anima 教程项目，集中介绍 ComfyUI 的基本概念、工作流、安装配置，以及 Anima 模型的使用方法和相关原理。

文档站点使用 [Docusaurus](https://docusaurus.io/) 基础框架构建，在线访问地址为 [anima.ptcrys.net](https://anima.ptcrys.net)。站点源码和内容都位于 `website/` 目录。

## 项目结构

```text
website/
├── docs/                 # 文档内容（Markdown/MDX）
├── blog/                 # 博客文章（框架残留，待重构并改为作者页）
├── src/components/       # 自定义 React 组件
├── src/css/              # 全局样式
├── static/               # 图片、CNAME 等静态资源
├── docusaurus.config.ts  # Docusaurus 配置
└── sidebars.ts           # 文档侧边栏配置
```

## 环境要求

- Node.js `>= 20`
- npm（项目使用 `package-lock.json` 管理依赖）

## 额外依赖

除 Docusaurus 核心包和经典主题外，项目还使用了以下依赖：

- `@docusaurus/theme-mermaid`：渲染 Mermaid 流程图、时序图等图表
- `@docusaurus/faster`：使用 Rspack 等更快的构建能力
- `@mdx-js/react`：在 MDX 文档中使用 React 组件
- `react`、`react-dom`：自定义页面和组件的运行时依赖
- `prism-react-renderer`：代码高亮主题
- `clsx`：组合 CSS class 名称

这些依赖已经写入 `website/package.json`，首次安装时不需要单独下载。若要在其他 Docusaurus 项目中启用 Mermaid，可执行：

```bash
npm install @docusaurus/theme-mermaid
```

## 快速开始

### 1. 安装依赖

在项目根目录执行：

```bash
cd website
npm ci
```

### 2. 启动开发服务器

```bash
npm run start
```

若使用jetbrain系列产品，可以在右上角新建配置，`package.json`选择`根目录\website\package.json`，命令选择`start`。

启动后访问 <http://localhost:3000/>。修改文档或组件后，开发服务器通常会自动刷新。

### 3. 新建文档

在 `website/docs/` 下新建 `.md` 或 `.mdx` 文件。例如新建 `website/docs/guide/basic.md`：

```md
---
sidebar_label: 基础指南
---

# 基础指南

这里开始编写文档内容。
```

文件的文档 ID 默认由文件路径决定。本例的 ID 是 `guide/basic`。

### 4. 添加侧边栏条目

编辑 `website/sidebars.ts`，在需要的位置加入文档条目：

```ts
{
  type: 'doc', id: '[文档路径]', label: '[前端名字]'
}
```

其中 `id` 必须与文档路径对应（不包含 `.md` 或 `.mdx` 扩展名）。保存后，文档会出现在站点侧边栏中。

### 5. 构建检查

```bash
npm run build
```

构建产物会生成到 `website/build/`。本地预览构建结果可以执行：

```bash
npm run serve
```

## 自定义组件

项目提供了可在 MDX 文档中复用的 React 组件。组件的使用方式、参数和示例请参阅[自定义组件说明](CUSTOM_COMPONENTS.md)。

## 部署

推送到 `main` 分支后，GitHub Actions 会自动构建 `website/` 并发布到 `gh-pages` 分支。站点通过自定义域名 <https://anima.ptcrys.net> 访问；域名配置文件位于 `website/static/CNAME`。

如需手动部署，可在 `website/` 目录执行：

```bash
npm run deploy
```
