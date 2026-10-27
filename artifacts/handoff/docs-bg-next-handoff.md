# 首页全部完成，转入文档页背景重设计（2026-10-28）

## 状态

- 首页（hero、workflow 区、学习路线区）的美术和动画全部完成，用户确认。已推送 main，GitHub Pages 自动部署。
- 下一步：重新设计文档页背景。首页相关文件原则上不再动；如果必须改，要同时验证 full 和 lite 两档的切换。
- 历史细节：`hero-desktop-complete-handoff.md`（桌面编排）、`hero-lowend-perf-handoff.md`（低配性能）、`perf-techniques.md`（优化手段汇总）、`hero-done-next-art-handoff.md`（约定和规则，仍然有效）。

## hero 档位（本轮最后一次改动）

`HomepageHeader/heroArtLite.ts` 分两步判定，结果挂在外层 `.heroArt`（`pages/index.tsx` 的 artRef div）的 `data-art-lite` 上：

| 状态 | 含义 | 切换动画 | 静置循环 |
| --- | --- | --- | --- |
| `true` | 低配 | lite | 量化（约 12Hz） |
| `pending` | 尚未判定 | lite | 不量化（探测要测原始循环） |
| 无属性 | full，或开启了减弱动效 | full | 原样 |

1. 硬件预分流（挂载时一次）：WebGL 渲染器字符串、`failIfMajorPerformanceCaveat` 软件光栅、`hardwareConcurrency` / `deviceMemory`、物理像素量（视口 × DPR²）。
   - 软件光栅，或核数 ≤4 且内存 ≤4GB：直接 `true`，不再探测（量化后的循环总能测到约 60fps，探测推翻不了）。
   - 独显（NVIDIA / Radeon RX / Arc A）：先给 full，探测继续核实。
   - 集显（Intel / Iris / Mali / Adreno 等）且像素量 ≥ 3.5M：直接 `true`。测试机 Iris Xe 1600×865 DPR 2 约 5.5M。Apple GPU 不走这条，交给探测。
   - 其余：`pending`。
2. 帧率探测：进入首页 1.8s 后，静置可见时测两个 1.6s 窗口。<48fps 连续两窗判 lite，≥55 判 full，中间不下结论（本次加载保持预分流结果，下次再测）。探测期间设 `data-art-probe`，位图缓存等空闲任务会避开。
3. 结论存 sessionStorage `anima-hero-art-lite`（`lite` / `full`），同一标签页会话内不重测。

配套改动：`VisualStudy/styles.module.css` 的量化选择器和 `heroSceneBake.ts` 的半分辨率烘焙只认 `[data-art-lite='true']`；`heroThemeSwitch.ts` 的 `isLite()` 把 `pending` 也算 lite，探测期间不建位图缓存，切换结束后重新同步缓存。

### 查看与强制

- 隐藏标签：`.heroArt` 里有 `<span data-hero-tier hidden>`，只在 DOM 里，不上报。
  `document.querySelector('[data-hero-tier]').dataset` 返回 `heroTier`（full / lite / pending）、`source`（stored / hint / probe / probe-borderline / probing / reduced-motion）、`reason`、`gpu`、`fps`、`windows`。
- 重新判定：`sessionStorage.removeItem('anima-hero-art-lite')` 后刷新。
- 强制某一档：把该值设成 `lite` 或 `full` 再刷新。

已知取舍：高配机如果被归为 `pending`，在约 3.5s 内切换会走一次 lite；位图缓存约 1.2s 后才就绪。

## 下一阶段：文档页背景重设计

### 现状盘点（2026-10-28 读代码所得，没在浏览器里看过）

- 文档底板在 `website/src/css/art-adapters.css` 287-357 行：
  - `main[class*='docMainContainer']`：96px 平铺 SVG 网格（`--anima-doc-tile-day` 钴蓝、`--anima-doc-tile-night` 暖灰，24px 细线、96px 主线、主交点小十字），`background-attachment: fixed`，侧栏和正文共用同一张网格。
  - 夜间 `::before`：右上（92% 120px）红点加同心环，mask 环形渐隐；`::after`：左下同心环。两者都是 `position: fixed`，日间 `display: none`。
  - 侧栏 `.theme-doc-sidebar-container` 用同一张网格叠 grain 和纵向 wash（343-357 行）；`::before` 是顶部 7px 刻度条（46-58 行）。
  - 分页 `.pagination-nav__sublabel::before` 是 5px 方块标记（359-367 行）。
- `website/src/css/custom.css` 里还有早期装饰：`.main-wrapper::before/::after`（148-172、758-777 行）、`.theme-doc-markdown::before/::after`（424-449、804-811 行）、`.theme-doc-sidebar-container::before`（351、795 行）。它们已经被 `art-adapters.css` 23、46-58、68 行覆盖或 `display: none`，重设计时可以一起清理，但要先确认首页和其它页面不依赖它们。
- 组件：`website/src/theme/DocItem/Footer/index.tsx` 只插入 `ContributorCredits`，与背景无关。
- 候选方向：`launch-orbit-brief.md` 第 3 节 F-01 到 F-10。和背景直接相关的是 F-09（底板视差）、F-10（按目录层级分高度带）、F-05（h2 卡门线）。都没筛选过。

### 设计约束

- 原则沿用 `launch-orbit-brief.md`："首屏是表演，文档页是仪表"。可读性第一，不放常驻动画。
- 用户对首页 workflow 夜间背景的反馈同样适用：背景只起装饰作用，保留美术特征但不抢视野。参照日间构造图的强度，元素靠边裁切，有效不透明度大约 0.15-0.25，大面积的白色条带和高对比圆盘会被认为抢眼。
- 不改 `website/docs/**`，只能通过主题 CSS、swizzle 组件或 clientModule 实现。
- 日夜切换走 `clientModules/themeTransition.ts`（View Transition，回退到 `html.theme-transitioning` 520ms）。新增的 SVG 美术要挂在 `[data-theme-art]` / `[data-art-mode]` 下，按整张底板交叉淡化（`art-adapters.css` 385 行起），不要让大量填充色逐个过渡。
- `position: fixed` 的全视口伪元素在低配机上每次滚动都可能重新合成。参照 `perf-techniques.md`：成本来自全视口四边形的数量，与内容无关，叠层宜少。
- 颜色用 token（`custom.css` 7 行起的 light 变量块、67 行起的 dark 变量块）。新写的 dark 规则如果可能命中 hero 文本或 navbar，要加 `:not(:where([data-hero-ink][data-theme='light'] *))`。
- 手机端（≤996px 侧栏折叠）要单独检查网格密度和装饰位置。

### 建议的第一步

1. 先截取日间、夜间、窄屏的现状图给用户，确认哪些元素保留。
2. 和用户确认方向（F-09 / F-10 是否接受，是否沿用首页的恒星和轨道母题）后再出方案。风格 skill 用 `lanart-alpha-v1`（skill 列表里目前没有 `lanart-orbit-v1`）。

## 验证与规则

- 构建在 `website/` 下：`npx.cmd tsc --noEmit`、`npm.cmd run build`。前端实际效果由用户自己测。
- `verify-paging.cjs` 一直报 `artRef.current` 的 TypeError，改动之前就有，与本轮无关。`verify.cjs` 需要 playwright，本机没装。
- 每轮做检查点提交，推送要用户要求。不提交 `website/docs/**`、`website/static/**`、`website/sidebars.ts`。
- 提交前检查 IP：`git diff --cached | Select-String -Pattern '\b\d{1,3}(\.\d{1,3}){3}\b'`，结果必须为空。
