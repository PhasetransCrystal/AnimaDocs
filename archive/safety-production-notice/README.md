# 安全生产告示归档

这里保存从站点临时迁出的“安全生产告示”完整内容。归档保留了原始 website 路径结构，方便以后恢复。

## 已归档内容

- website/docs/safety-production-notice.mdx：公告文档页，原路由为 /docs/safety-production-notice
- website/src/css/safety-notice.css：公告专用样式
- website/static/doc.png：研究人员 A 头像
- website/static/prts.png：研究人员 B 头像
- website/static/amiya.png：异常生物图片
- website/static/bianyi.jpg：形态变异图片
- website/static/ccc.jpg：二次污染表情图片

文档中的五张图片均为正文行内图片，引用路径分别为 /doc.png、/prts.png、/amiya.png、/bianyi.jpg 和 /ccc.jpg。

## 站点侧清理内容

- 从 website/sidebars.ts 的 tutorialSidebar 移除了 safety-production-notice 条目
- 从 website/docusaurus.config.ts 的 customCss 数组移除了 ./src/css/safety-notice.css
- 将公告 MDX 和专用 CSS 从现用 website 目录迁入本归档

## 恢复方式

1. 将本目录下 website 内的文件按相同相对路径复制回项目根目录的 website。
2. 在 website/sidebars.ts 的 tutorialSidebar 中重新加入 safety-production-notice 文档条目。
3. 在 website/docusaurus.config.ts 的 theme.customCss 数组中重新加入 ./src/css/safety-notice.css。
4. 在 website 目录依次执行 npm run clear 和 npm run build。

恢复时请勿使用 git reset 或覆盖整个配置文件，以免影响其他未提交改动。
