# Hero 性能优化手段汇总（2026-10-25）

用于以后的手机端优化和其它区域。状态：**已上线**＝在 main 上；**无效**＝测过没收益；**未测试**＝只有上限探针的数据，没有实现。

测试机是 Iris Xe、DPR 2。整个切换过程 GPU 都是满载，瓶颈主要在光栅化和合成全视口图层，主线程基本不是瓶颈。指标是快相窗口内 <20ms 的帧数（launch 440-920ms、landing 350-900ms）。

## 已上线

| 手段 | 位置 | 要点 | 收益 |
| --- | --- | --- | --- |
| 静态合批 | `VisualStudy/index.tsx`（`991b18e`） | 星点按距离带和透明度分桶合成 path，非闪烁像素按组和色调合并；保留动画分组用的 data 属性 | DOM 1118→1049，GPU 栅格约 -30% |
| 阴影双层 opacity 切换 | `pages/index.tsx` `.signalFrame` | 亮暗两种大模糊阴影分别放在 `::before`/`::after` 上，只切换 opacity；隐藏的一侧用 0.004，不用 0（opacity 0 的层不栅格化，翻转时仍会出尖峰） | 消除翻转时 100-135ms 的尖峰 |
| 悬停预挂载 | `heroThemeSwitch.ts` prime | pointerover/pointerdown/focusin 时提前挂载夜间图版 | 首帧挂载间隙降低（触屏无效） |
| 预分流 + 实测分档 | `heroArtLite.ts` | 先按 WebGL 渲染器字符串、软件光栅、核数/内存、物理像素量预分流；明确低配直接 lite，独显先给 full，其余为 `pending`（切换走 lite、静置循环不量化）再测 rAF，连续两窗 <48fps 进 lite；所有降载都挂在 `[data-art-lite]` 下 | 前提条件；判定前的切换也不卡 |
| 慢循环量化 | `VisualStudy/styles.module.css` lite 块 | 用 `steps()` 把慢循环降到约 12Hz，漂移改为 8 段关键帧 | 静置 26→60fps |
| clip-path 圆改圆角盒 | `dayClip()` | 用 left/top/width/height 的圆角盒加反向偏移，代替 clip-path（后者每帧栅格一张 4097² 的遮罩） | 明显 |
| 逐层位图缓存 | `heroPlateCache.ts` | 空闲时把各 SVG 层序列化成 0.5x canvas，切换时进场层和静态的退场层显示位图；分辨率按 `max(1, min(dpr,2)*0.5)` 计算 | +2 帧左右 |
| 色盘 overlay | `colourDisc()` | 背景设为静态终点色，再让 `::after` 上的起始色淡出，只走合成器 | 小 |
| 主题翻转局部化 | `inkAt()` / `clearInk()` + CSS `[data-hero-ink]` | lite 下 clip 边缘经过标题时只给 hero 文本、navbar、高度计设局部 `data-theme`；整页翻转推迟到结束；墨水作用域取消颜色过渡 | 长帧 145-200ms→75-100ms |
| ladder 独立 svg | `HeroAxis` + `animateAxis(liteRun)` | 刻度和文字放进单独的外层 svg，做像素 transform（合成器动画），不在 SVG 内部做 `<g>` translate | landing +3 帧 |

## 无效（不要再试）

- 给 SVG 子元素加 `will-change`：SVG 子元素无法独立合成。
- 提升背景、noise、轴、actors 为独立层：无变化。
- 对整张美术图做 CSS `scale` 降采样：更差，Chrome 按最终尺寸栅格化。CDP 模拟 DPR 1 也不改变栅格量。
- 暂停 CSS 循环动画、只去掉 transform 或 opacity、淡出后再隐藏图层：都没有收益。
- 把 noise 和 `::after` 换成纯色：同样贵。成本来自全视口四边形的数量（带宽），与内容无关。
- 只把进场场景合成一张位图：几乎没有收益，必须连退场场景一起做。
- 取整 clip 盒坐标、给图层固定自定义属性：没有收益。

## 未测试：四图全部预渲染

日夜两个场景各合成一张整图，包含该场景全部底板层、背景渐变、`::after` 渐隐和 noise。切换时，launch 和 landing 的退场、进场一共四个位置全部只显示位图加圆角盒遮罩；切换期间隐藏所有底板 SVG，结束后换回。小循环元素（刻度环、彗星等）可以保留为活体 SVG。

- 上限探针（只是注入 CSS 隐藏元素，不是实现）：launch 15→21-22，landing 20→33（≈60fps）。保留背景和 noise 时 launch 只有 16，所以背景、`::after` 和 noise 必须烘进位图。保留循环元素只多花 1-2 帧。
- 要解决的问题：
  - 退场场景的相位：现有缓存按相位 0 烘焙，活体循环停在别的位置，切换时会跳。可以在点击时按当前 currentTime 同步重烘，但会增加主线程开销；或者切换时让循环元素保持活体。
  - 背景渐变和 noise 要画进 canvas（用 `createLinearGradient` / `createRadialGradient`，noise 用 data URI 图片平铺）。
  - 尺寸变化或 DPR 变化时要失效重烘。显存占用约为每张整图 1585x761x4 字节。
- 手机端可以复用：VT 快照前的样式失效，可以用同样的"位图 + 遮罩"减少；手机的夜间板几何（205% 宽偏移）不同，需要单独计算。

## 方法上的经验

- 先做全隐藏的上限探针，再逐项恢复，比逐项去掉更容易看出成本在哪里。
- 测量前确认测试机窗口没有最小化（最小化后 rAF 只有 1fps），并且没有其它标签页在跑动画。
- 测完要重新加载干净页面，不要把探针变体留在标签页里给用户手测。
