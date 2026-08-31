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

## 添加新组件

1. 在 `website/src/components/` 下创建组件目录和 `index.tsx`。
2. 如有需要，在同一目录添加 `styles.module.css`。
3. 在页面或 MDX 文件中通过 `@site/src/components/...` 导入。
4. 执行 `npm run typecheck` 和 `npm run build` 检查类型与生产构建。
