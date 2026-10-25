# Hero 低配机性能交接（2026-10-25，第三轮）

用户目标：低性能设备上首页 hero 的昼夜切换动画要流畅。静置动画已经基本解决，主要剩切换。第三轮后用户在测试机上确认 lite 切换"挺流畅"，剩下的是细节修正（见"第三轮"一节），前端实际效果由用户自己测试。

## 约束（用户原话要点）

1. 高性能机的动画效果不能受影响，视觉和美术副作用要尽量小。所有降载手段都挂在 `[data-art-lite]` 下。
2. 需要简化动画时，优先砍背景底板相关的分层美术动画，例如相近元素合批。缩放点相关的圆、坐标系这类元素尽量不动。
3. 必须在测试机上测，不是本机。远程方式见 `hero-switch-perf-handoff.md` 的"测试机远程测量"一节；地址已从仓库清理，再测时由用户重新提供。
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

## 降分辨率：为什么 CSS 不行、位图为什么可行

- Chrome 按图层最终显示尺寸光栅化。CSS `scale` 降采样只会画出缩小的画面，不会低分辨率画完再放大；先缩小再还原会触发按新尺度的全量重画。CDP 模拟 DPR 1 也不改变光栅尺寸。SVG/DOM 没有"低分辨率渲染"的开关。
- 唯一可行路径是 canvas：backing store 低分辨率，CSS 尺寸铺满，由合成器放大。现在 0.5x 底板实测只比直接隐藏慢约 2 帧，截图看不出发虚。效果有限，是因为只覆盖了进场底板，其他活体 SVG 仍在逐帧重绘。
- 上限参考：切换状态挂载但不播动画时 60fps；场景、actors、轴、色盘全部去掉约 81 帧。也就是说，切换期间屏幕上只剩位图做 opacity/transform 合成时，可以接近 60fps。
- **待修 bug**：`heroPlateCache.ts` 的分辨率是 `clientWidth × min(dpr,2) × 0.5`。DPR 2 的测试机上正好等于 1x CSS 像素，但 DPR 1 的低配屏会变成 0.5x CSS 像素，会明显发糊。应改为按 CSS 像素定，例如 `max(1, dpr × 0.5)`，或按设备单独定。DPR 1 的效果还没验证过。

## 用户补充的方案方向（2026-10-24，下一会话优先考虑）

1. **lite 档完全去掉底板部分的动画**，只保留基于缩放点的切换动画：clip 圆、色盘、轴、卫星、缩放点相关的 actors。底板（d-ocean、d-tiles、d-lines、d-guide、n-grid、n-core、n-marks、n-ticks、n-orbits 的淡入淡出、缩放、旋转、逐组步进，以及 star/pixel/craft）在切换期间不做任何动画。
2. **日夜两套底板都持久化位图缓存**：切换过程中就是"位图 + 遮罩"。退场场景显示自己的整张位图，进场场景是另一张整张位图，由圆形遮罩（圆角盒或 canvas `arc`）显露；切换期间隐藏全部底板 SVG，结束后换回。
   - 现有缓存逐层生成，可以改成每个场景合成一张整图。
   - 要处理 idle 动画的相位：烘焙时 currentTime 对齐 0，或者在点击瞬间同步重烘退场场景。
   - n-ticks 和 n-orbits 里有刻度环和卫星。要先确认它们静止烘进位图是否可以接受，卫星和环可以保留为活体小 SVG。
3. **坐标轴合批 / 缓存**。现状（`VisualStudy/index.tsx` 中的 `HeroAxis`，`heroThemeSwitch.ts` 中的 `animateAxis`）：
   - 刻度已经合批，每个方向一条 `path`（`H_TICKS` / `V_TICKS`）。
   - 每个方向的数字和名称是独立的 `<text>`。
   - 4 条 arm 各自做 dashoffset 动画。
   - ladder 是 SVG `<g>` 做 translate。这是 SVG 内部 transform，会让整张 axis svg 逐帧重画。
   - 日夜各有一份 HeroAxis 副本，两份同时在动。

   可以做：把 ladder（刻度加文字）烘成小 canvas 或 img，改成对 HTML 元素做 transform，这样是纯合成；arm 改成 HTML 细条做 `scaleX` / `scaleY`，替代 dashoffset。外观要和原来一致。
4. **还不够再引入第三方渲染库**，优先保证渲染效果。例如 PixiJS（WebGL）：把缓存位图做纹理、用遮罩，轴和 actors 用 Graphics 逐帧画，切换期间整个 hero 只有一张 WebGL canvas。注意事项：
   - 测试机瓶颈是 Iris Xe 的 Skia SVG 光栅化，少量贴图四边形的 WebGL 绘制要便宜得多。
   - 要评估包体积（只在 lite 档动态 import）、WebGL 上下文丢失的回退、文字渲染一致性。
   - 依赖要锁定精确版本。

## 第三轮（2026-10-25）

提交（均未 push）：

| 提交 | 内容 |
| --- | --- |
| `9a322d8` | clip 保持注册；所有场景图层都做位图；修 DPR 1 位图尺寸（上面"待修 bug"已解决）。 |
| `8bd6df2` | lite 日间位图随关闭的 clip 一起离场；位图保留 SVG transform 属性。 |
| `def2a81` | 主题翻转局部化（激进候选 3）。lite 下在 clip 边缘经过标题时（`INK_LEAD_MS = 40`），给 `[data-hero-ink]` 作用域（heroArtRule、heroToplineFrame、heroContent，临时加上 navbar）设局部 `data-theme`；整页 `data-theme` 推迟到 `finish()`。CSS：`custom.css` / `art-adapters.css` 的 light 变量块加了 `[data-hero-ink][data-theme='light']`；`index.module.css` 的 dark 规则加 `:not(:where([data-hero-ink][data-theme='light'] *))`；墨水作用域取消 200ms 颜色过渡。 |
| `e6bc2f3` | 坐标轴 ladder 改为独立 svg（用户方向 3 的一部分）。`HeroAxis` 给每个方向多渲染一个 `svg[data-hero-ladder]`；lite 下 `art.dataset.liteLadder` 隐藏原 SVG 内 ladder，对外层 svg 做像素 transform（合成器动画）。 |
| `e4f5bc2` | 用户指出的细节：lite 日→夜不再按冲击波逐块隐藏蓝色方块，方块随 clip 关闭离场；墨水期 navbar 背景垫一层 `--anima-paper`（navbar 是 0.94 透明度，原来会透出旧主题底色，结束时轻微跳色）；navbar logo 在墨水时刻换 src（`useHeroThemeSwitch` 传入 day/night mark URL）；高度计地名随墨水作用域切换。 |

full 档全部不变（均在 `lite ? … : …` 或 `[data-art-lite]` 分支）。

测量（新指标：`remote-swwin.cjs`，快相窗口内 <20ms 的帧数，launch 440-920ms、landing 350-900ms；输出 `L`=launch 亮→暗，`D`=landing 暗→亮；gap=最大帧间隔）：

| 版本 | launch 快帧 / gap | landing 快帧 / gap |
| --- | --- | --- |
| `8bd6df2` | 14 / 170-200ms | 12 / 145ms |
| `def2a81` | 17 / 75ms | 14-15 / 96ms |
| `e6bc2f3` | 15 / 80-100ms | 19-20 / 55-70ms |

（`def2a81` 一行在标签纠正前记录，L/D 可能对调。）

第三轮归因（var54-74 探针）：

- 主线程已不是瓶颈：切换期间主线程任务都在 13-20ms，翻转长帧移到了结束时（约 86ms）。GPU 整段饱和。
- landing 的成本几乎全在 art：ladder 滚动（已解决），退场夜景活体层 n-core/n-marks/n-ticks/n-orbits 合计约 +6 快帧（与循环动画、transform、淡出后残留都无关，是这些全视口层本身）。
- launch 的成本分散：活体 SVG 层、轴、actors、场景背景渐变和 `::after`、noise 层各 +1~4。noise 和 `::after` 换成纯色也同样贵，说明是全视口合成四边形的数量（带宽）而不是光栅内容；切换中途绘制层面积约 74 个视口（静置 22）。
- 上限探针：两个场景各只保留一张静态位图、去掉背景/::after/noise（var69 `two`）可到 launch 21-22、landing 33（≈60fps）；保留背景和 noise 时 launch 回到 16。只合并进场场景几乎无收益，必须退场场景也是位图。
- 无效：CSS 缩放降采样（更差）、will-change 提升、暂停 CSS 循环、取整 clip 盒坐标、只合并进场场景。

未做（用户已确认当前效果可接受，属于可选的下一步）：每个场景整张位图（含背景渐变、::after、noise，循环元素保留活体），切换时退场和进场都只显示位图 + clip。退场场景要在点击时按当前相位处理（现有缓存按相位 0 烘焙）。

坑：`git worktree remove --force` 会跟随 node_modules junction 删掉真实依赖，先 `cmd /c rmdir` 掉 junction；测量脚本会把最后一个变体留在标签页里，测完要重新加载干净页面；测试机窗口经常被最小化（rAF 降到 1fps），每次测量前 `remote-winprobe.cjs <cdp> maximize`。

## 测量工具

脚本都在 `%TEMP%\opencode`，不在仓库里，可能被清理。依赖 playwright-core，CDP 地址从命令行参数传入。

- `remote-swwin.cjs <cdp> <site> <variants.json> [reps]`（第三轮主用，替代旧的 `remote-swvar.cjs`）：快相窗口帧数对比，变体可以注入 CSS/JS。环境变量：FORCE=lite|full（写入 sessionStorage 结论）、WAITPLATES=1（等位图画好再点）、SEQ=1（打印帧序列）。`remote-showvar.cjs <cdp> <site> <variants.json> <name>`：把某个变体留在标签页里给用户手测。`remote-tshots.cjs <cdp> <site> <outDir> <launch|landing>` + `sheet.cjs`：切换过程连拍和拼图。
- `remote-swattr.cjs <cdp> <site> [launch|landing]`：trace 后按图层统计光栅化耗时和 DOM 归属，并按进程汇总。另有 MAIN=1、INVAL=1、NOCLICK=1、PAINTS=1。
- `remote-midshot.cjs`（切换中途冻结截图）、`remote-platecmp.cjs`（位图与 SVG 对比截图）、`remote-idle.cjs` / `remote-lite.cjs`（静置帧率）、`remote-layers.cjs`（静置图层与 paint 计数）。
- `gen-var*.cjs`：生成探针变体。常用 hook：用 `Element.prototype.animate` 去掉某个属性或丢掉某组动画。
- `remote-quiet.cjs <cdp> pause|resume`：暂停/恢复测试机上其他标签页的动画。`remote-winprobe.cjs <cdp> list|maximize|normal`（原 `remote-winstate.cjs`）：开发标签页窗口原本是 maximized。测量前 pause，结束后 resume 并 maximize。

## 环境状态

- 远程测试链路已结束使用，地址和网络配置不再记录在仓库里。
- 构建命令（在 `website/` 下）：`npx.cmd tsc --noEmit`、`npm.cmd run build`。
- 每轮做一个检查点提交。不提交 `website/docs/**`、`website/static/**`、`website/sidebars.ts`。提交前跑 IP 检查（命令见 `hero-switch-perf-handoff.md` 末尾）。
