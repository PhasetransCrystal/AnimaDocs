# 自定义组件

项目的自定义 React 组件位于 `website/src/components/`，可以直接在 MDX 文档中导入并使用。

## SortableTable

`SortableTable` 位于 `website/src/components/SortableTable/`，用于展示支持排序的数据表格。

在 MDX 文件中导入组件：

```mdx
import SortableTable from '@site/src/components/SortableTable';
```

然后传入列定义和数据：

```mdx
export const columns = [
  {key: 'name', label: '名称', sortable: false},
  {key: 'power', label: '攻击力'},
  {key: 'speed', label: '速度'},
];

export const data = [
  {id: 'a', name: '项目 A', power: 80, speed: 60},
  {id: 'b', name: '项目 B', power: 95, speed: 70},
];

<SortableTable
  columns={columns}
  data={data}
  rowKey="id"
  defaultSort={{key: 'power', direction: 'desc'}}
/>
```

主要属性：

- `columns`：列定义数组。每列至少包含 `key` 和 `label`；设置 `sortable: false` 可禁用该列排序。
- `data`：表格行数据数组。
- `rowKey`：每行数据的唯一键。
- `defaultSort`：初始排序列和方向。
- `render`：自定义单元格渲染函数。
- `sortValue`：提供用于排序的值，适合格式化显示值与实际排序值不同的场景。

可排序列默认按降序排列。点击当前列会在升序和降序之间切换，点击其他列会切换排序列。

## HomepageFeatures

`HomepageFeatures` 位于 `website/src/components/HomepageFeatures/`，用于渲染首页的功能介绍区域，目前由 `website/src/pages/index.tsx` 使用。修改该组件时，请同时检查首页布局和响应式样式。

## ContributorCard

`ContributorCard` 位于 `website/src/components/ContributorCard/`，用于展示单个教程贡献者的头像、名称、简介和 GitHub 链接。

作者资料统一维护在 `website/src/data/contibutors.ts`，文档只需要在 frontmatter 中填写作者 ID：

```md
---
authors:
  - landis
---
```

作者 ID 必须先存在于贡献者注册表中。卡片使用注册表生成的 GitHub 头像地址和主页地址；头像加载失败时会显示作者姓名首字母占位。

## 文档作者署名

`website/src/theme/DocItem/Footer/` 是对 Docusaurus 文档 Footer 的包装。只要当前文档的 `authors` 列非空，系统就会在原始 Footer 前自动追加“本文作者”区域，并复用 `ContributorCard` 渲染每位作者。

作者署名的渲染关系如下：

```text
文档 frontmatter.authors
        ↓
buildContributors()
        ↓
ContributorCredits
        ↓
ContributorCard
```

不要在 `ContributorCard` 中读取文档 frontmatter；作者页或其他页面可以直接传入 `ResolvedContributor` 复用卡片。修改卡片视觉效果时，主要调整 `ContributorCard/styles.module.css` 和 `ContributorCredits/styles.module.css`，不要改变 `ContributorCard` 的 props 或 `buildContributors()` 的返回字段。

## 添加新组件

1. 在 `website/src/components/` 下创建组件目录和 `index.tsx`。
2. 如有需要，在同一目录添加 `styles.module.css`。
3. 在页面或 MDX 文件中通过 `@site/src/components/...` 导入。
4. 执行 `npm run typecheck` 和 `npm run build` 检查类型与生产构建。
