# Hero 低配机性能交接（2026-10-24，第二轮）

用户目标：低性能设备上首页 hero 的昼夜切换动画要流畅。静置动画已经基本解决，主要剩切换。本轮效果仍不理想，下一会话改用更激进的方案。

## 约束（用户原话要点）

1. 高性能机的动画效果不能受影响，视觉和美术副作用要尽量小。所有降载手段都挂在 `[data-art-lite]` 下。
2. 需要简化动画时，优先砍背景底板相关的分层美术动画，例如相近元素合批。缩放点相关的圆、坐标系这类元素尽量不动。
3. 必须在测试机上测，不是本机。远程链路见本地文件 `hero-switch-perf-handoff.md` 的"测试机远程测量链路"一节。那一节含真实 IP，不能提交；本文件不含 IP。
4. 可以让 pool-astra（gpt-6-astra）参与交叉研究。用户提出的方向：降低动画部分的采样分辨率；进入主页时空闲预渲染日夜两套底板缓存，离开时释放。

## 当前状态

提交如下（均未 push）：

| 提交 | 内容 |
| --- | --- |
| `1cbce10` | 静置 lite 档。`HomepageHeader/heroArtLite.ts` 用 rAF 测静置帧率：连续两个窗口 <48fps 就给外层 heroArt（artRef div）加 `data-art-lite`；>=55fps 记为 full。结论存在 sessionStorage `anima-hero-art-lite`，值为 `lite` 或 `full`。`VisualStudy/styles.module.css` 的 lite 块用 `steps()` 把慢循环量化到约 12Hz，彗星约 20Hz；地形和镜片漂移用 8 段缓动关键帧。 |
| `ac24bb5` | lite 切换第一部分。日间 clip-path 圆改成 `[data-hero-clip]` 圆角盒（`.dayClip` 静止时是 `display: contents`）。新增 `HomepageHeader/heroPlateCache.ts`：空闲时把 d-ocean、d-tiles、n-grid、n-core、n-marks 序列化成半分辨率 canvas，插在源 svg 前，以 `data-live` / `data-plated` 切换显示；卸载时 dispose。切换时只给进场场景用位图。craft 连线带 `data-plate-skip`，保持活体动画。 |
| `3aaa708` | lite 色盘：静态终点色加 `::after` 起始色透明度淡出，替代 backgroundColor 补间。为此 `Timeline.add` 新增 `pseudoElement` 参数。 |

`heroThemeSwitch.ts` 里与本轮相关的结构：`isLite()`、`syncPlates()`（MutationObserver 监听 `data-art-lite` 后惰性创建缓存）、`usePlate(run, name)`、`dayClip(run, lite, g, S, keys)`、`colourDisc(run, lite, keys)`。`buildLaunch` / `buildLanding` 现在接收 `(run, g, lite)`。full 档的关键帧保持原样。

## 测量结果

测试机配置：Intel Iris Xe（D3D11），1600x865，DPR 2，生产构建。指标是切换开始后 1.4s 内的 rAF 帧数，60fps 约等于 84 帧。

| 状态 | 亮→暗 launch | 暗→亮 landing |
| --- | --- | --- |
| full 档（原路径，高配也走这里） | 21 | 24 |
| lite：圆角裁剪 | 28 | 31 |
| lite：+ 底板位图 | 30 | 33 |
| lite：+ 色盘 overlay（当前） | 27-30 | 33-39 |

静置帧率：full 档亮 26、暗 30；lite 档亮 60、暗 58。

切换期间的帧序列特征：点击后第 3-4 帧有一个 117-250ms 的长帧，之后多数帧 33-50ms，翻转附近还有 100-230ms 的尖峰。

## 归因结论（都有探针数据支撑）

- 瓶颈在 GPU，CrGpuMain 整段切换都是饱和的。具体是两块：一是光栅化（`DoEndRasterCHROMIUM::Flush`），即逐帧重画多张 3170x1610 的 SVG 图层；二是合成渲染通道（`FinishPaintRenderPass`）。主线程平时较轻，只有主题翻转那一帧例外。
- 已经挂载但不播动画的切换状态是 60fps，说明成本来自动画导致的 SVG 内部重绘，不是图层数量本身。
- 把场景、actors、轴、色盘全部隐藏可以到约 81 帧（≈60fps）。单独去掉任何一项都只有 +3~11 帧，成本是分散叠加的。
- 当前 lite 档剩余开销的排序：
  1. 主题翻转长任务：launch 约 170ms，landing 约 250ms，其中 UpdateLayoutTree 70-120ms（整页约 1069 个元素重算），另有 TimerFire 26-45ms。
  2. heroArt 父层（3170x1610）重光栅化。
  3. n-orbits 的缩放。
  4. 高度计读数，每帧改文字。
  5. shock、trace、axis 的 dashoffset。
  
  逐项去掉的效果都在噪声范围内（±3-5 帧），只有第 1 项比较明确。
- lite 静置时 heroArt 层在 114 帧里一直在重光栅化（nodeBlink 一类未合成的动画在往父层画）。帧率不受影响，但 GPU 一直半忙，会带进切换开头。

## 已试过、无效或不可行

- 单独隐藏某一层，或去掉 blur/grain/mask/blend/vector-effect：均无明显收益。
- `will-change` 提升 SVG 子元素：SVG 子元素无法独立合成。
- 预挂载（primed）、常驻 will-change：无收益。
- 低于 5 帧的小项：下方 main/footer 用 content-visibility（翻转重算 45→36ms）、关 backdrop-filter、停 noise。
- 用 transform 做 clip（缩放加反向缩放）：比圆角盒更差。
- 色盘大尺寸预缩放：无收益。色盘背景色改 steps：只有部分收益。
- 降分辨率这条路：
  - CDP 模拟 DPR 1 时栅格量不变。
  - 对整个 art 做 CSS `scale` 降采样无效，Chrome 按最终尺度光栅化；那次探针还把底图缩到了左上角，只是注入的探针，不在代码里。
  - 唯一可行的降采样手段是 canvas 位图，目前底板已经是 0.5x。
- 测试机上用户的开发标签页（3010）在跑动画，会污染测量，但不是主因。

## 激进方案候选

按预期收益排序，均只在 lite 档生效：

1. 整段切换改成单个 canvas 逐帧绘制。底板用缓存位图 `drawImage`，圆形裁剪用 `arc`，色盘用 `fillStyle`；轴、actors、卫星、刻度环用 `Path2D` 按原时间线采样重画，可以在 0.5-0.75x 分辨率下绘制。切换期间隐藏全部 SVG 场景，结束后换回。这样只剩一张合成层，没有 SVG 重绘，是收益上限最高的方向，但要在 canvas 里复刻时间线和几何；坐标从 `measure()` / `toPx()` 来，锚点是 viewBox (611.2, 310.8)。
2. 退场场景也位图化。切换开始的瞬间，把当前活体场景（含相位）同步烘成 canvas。可以先暂停 idle 动画，读 currentTime 后再烘焙，或者沿用缓存但把活体动画 currentTime 对齐到 0。再把 n-ticks、n-orbits 也做成位图，旋转和缩放改成对 canvas 做 transform。视觉不变，但要验证刻度环旋转在位图下是否发虚。
3. 主题翻转局部化。lite 下先只让 hero 子树翻转（用局部属性或局部 CSS 变量），整页 `data-theme` 推迟到动画结束后或空闲时再翻，以消除 170-250ms 长帧。要检查 navbar、高度计等依赖全局主题的 200ms 颜色过渡。
4. 静置 lite 档把 d-lines 等常驻 SVG 提升为独立合成层，或停掉 nodeBlink，消除父层持续重光栅化。注意：给日间图层加 will-change 会改变静止画面的抗锯齿，所以只放在 lite 档。
5. 实在不够的话，再砍或简化 actors 里的 shock、trace、ripple，需先征得用户同意（保护圆和坐标系）。

## 测量工具

脚本都在 `%TEMP%\opencode`，不在仓库里，可能被清理。依赖 playwright-core，CDP 地址从命令行参数传入。

- `remote-swvar.cjs <cdp> <site> <variants.json> [reps]`：切换帧数对比，变体可以注入 CSS/JS。环境变量：FORCE=lite|full（写入 sessionStorage 结论）、WAITPLATES=1（等位图画好再点）、SEQ=1（打印帧序列）。
- `remote-swattr.cjs <cdp> <site> [launch|landing]`：trace 后按图层统计光栅化耗时和 DOM 归属，并按进程汇总。另有 MAIN=1、INVAL=1、NOCLICK=1、PAINTS=1。
- `remote-midshot.cjs`（切换中途冻结截图）、`remote-platecmp.cjs`（位图与 SVG 对比截图）、`remote-idle.cjs` / `remote-lite.cjs`（静置帧率）、`remote-layers.cjs`（静置图层与 paint 计数）。
- `gen-var*.cjs`：生成探针变体。常用 hook：用 `Element.prototype.animate` 去掉某个属性或丢掉某组动画。
- `remote-quiet.cjs <cdp> pause|resume`：暂停/恢复测试机上其他标签页的动画。`remote-winstate.cjs <cdp> list|minimize|restore|maximize`：开发标签页窗口原本是 maximized。测量前 pause，结束后 resume 并 maximize。

## 环境状态

- 本机 3100 的生产服务和防火墙规则 "AnimaDocs prod 3100" 仍开着，只放行测试机。rebuild 后不需要重启服务。
- 测试机上的 portproxy 和 "CDP 9223" 规则仍在，需要用户删除。
- 构建命令（在 `website/` 下）：`npx.cmd tsc --noEmit`、`npm.cmd run build`。
- 每轮做一个检查点提交。不提交 `website/docs/**`、`website/static/**`、`website/sidebars.ts`。提交前跑 26.x IP 检查。
