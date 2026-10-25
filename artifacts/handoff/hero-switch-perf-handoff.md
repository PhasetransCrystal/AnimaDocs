# Hero 昼夜切换性能优化交接（2026-10-24）

## 结论

闪屏/掉帧主因不在主线程，而是 GPU 重新栅格化尖峰（帧率高时也会出现空白/旧瓦片）。尖峰集中在三处：

1. 切换开始时挂载另一张图版并提升图层（2560x1600 约 200ms 帧间隙）。
2. 发射动画 950ms 处重新启用夜间滤镜（feTurbulence + blur）造成的重栅格（约 100ms）。
3. 主题翻转时 `.signalPanel` 的大模糊 box-shadow 在亮/暗之间变化（约 100-135ms）。

方块（d-tiles）不是瓶颈：已经是 7 个分组的 opacity 步进，隐藏方块或去掉 mask 都测不出收益。日→夜（landing）剩余的轻微卡顿与 600ms 主题翻转的全页样式重算（约 1000 个元素）重合。

## 改动

- `HomepageHeader/heroThemeSwitch.ts`：删除发射期间关闭滤镜的逻辑（`FILTERS_OFF_DURING_LAUNCH`、`LAUNCH_FILTERS_ON_MS`）。新增预挂载：在切换按钮上触发 pointerover/pointerdown/focusin 时设置 `art.dataset.heroPrimed`（仅限亮色主题、桌面宽度且未开启减少动态效果），离开 1.5s 后释放，`finish()` 时清除。
- `VisualStudy/styles.module.css`：`[data-hero-primed]` 时挂载夜间图版，只给夜间图层加 will-change（给日间图层加会改变静止画面的抗锯齿，所以没加）。新增 `.nightStars .starFill`。
- `pages/index.tsx` + `index.module.css`：`.signalPanel` 外包一层 `.signalFrame`，两种阴影分别放在 `::before` / `::after` 上，翻转时只切换 opacity。隐藏的一侧用 0.004 而不是 0，因为 opacity 为 0 的图层不会被栅格化，翻转时仍会出现尖峰。
- `VisualStudy/index.tsx`：静态合批。星点按距离带、按透明度分桶（0.05 一档）合并成 path，亮星十字每带合成一条 path；非闪烁像素按组和色调合并，闪烁像素保留独立 rect；夜/日 mosaic 按色调合并。动画分组的 data 属性（`data-star-group`、`data-pixel-group`）全部保留。wash 色块之间互相重叠且半透明，暂未合并。

## 测量（headless Chrome，悬停后点击）

- 2560x1600 发射：帧间隙从 207/66/135/111ms 降到约 87/69/77ms，GPU 栅格从约 600ms 降到约 400ms。
- 1440 下 CPU 4 倍降速：合批后发射 GPU 栅格 267ms，日→夜 214ms。
- DOM：全页 1118 → 1049，图版 593 → 527（n-marks 113 → 51）。
- 逐帧像素对比（合批前）：与基线一致，只有旋转刻度环存在抗锯齿抖动。

## 遗留问题

- 不经过悬停直接点击（触屏）时，首帧挂载间隙仍约 290ms。
- 本机的高分屏是 ToDesk/Oray 虚拟显示器，远程采集本身也可能造成撕裂。
- 低配机需要部署后实测。
- 后续可选方向：合并 wash 色块（需要接受重叠叠加效果的变化）、合并坐标轴/文字以外的静态元素、把图版烘焙成位图、为低配机做降级。

## 临时工具

位于 `%TEMP%\opencode`：`flip-probe3.cjs`、`probe-ab.ps1`（支持 `-Rate`，环境变量 HOVER=1）、`det-frames.cjs`、`pixdiff.cjs`、`prime-check.cjs`、`dom-count2.cjs`。需要通过 Start-Job + Wait-Job 加超时运行。

## 测试机远程测量

- 方式：本机用 playwright-core `connectOverCDP` 连测试机上带 `--remote-debugging-port` 启动的 Chrome，被测页面是本机的生产构建（`npm run serve`）。脚本不调用 `browser.close()`，避免关掉远程浏览器。
- 测试机信息：Intel Iris Xe（ANGLE D3D11），8 核，屏幕 1600x1000 且 DPR 2，视口宽度大于 640（走桌面切换路径），prefers-reduced-motion 未开启。
- 地址、端口转发和防火墙配置已从仓库清理（2026-10-25）。需要再测时由用户重新提供；不要把地址写进仓库文件，脚本从命令行参数读取。

## 低配 lite 档（第二轮，提交 1cbce10 / ac24bb5 / 3aaa708）

测量全部在测试机真实硬件上进行：生产构建（3100），1600x865，DPR 2。测量前先暂停测试机上开发标签页（3010）的动画，因为它会抢 GPU。

- 分档：`HomepageHeader/heroArtLite.ts` 在静置可见时用 rAF 采样。<48fps 连续两个窗口就给外层 heroArt 设置 `data-art-lite`；>=55 记为 full，不再检测。结论存在 sessionStorage `anima-hero-art-lite`。高配机永远不会进入 lite，所有 lite 规则都挂在这个属性下。
- 静置：瓶颈是 SVG 内部的慢循环动画（routeCrawl、guideCircle、terraceDrift、lensDrift、tickSpin、orbitComet）每帧重栅格整张 3170x1610 图层。lite 档用 steps() 把它们量化到约 12Hz（彗星约 20Hz），漂移改成 8 段缓动关键帧。pulse、flicker、nodeBlink 不动。结果：亮 26→60fps，暗 30→58fps。
- 切换，以下改动仅在 lite 档生效（`heroThemeSwitch.ts` 每次切换读取 `isLite()`）：
  - 日间场景的 clip-path 圆改成 `[data-hero-clip]` 圆角盒（left/top/width/height + 反向 translate），几何与原 clip 圆一致。原 clip-path 每帧会栅格一张 4097x4097 的遮罩层。
  - `heroPlateCache.ts`：进入主页后在空闲时把 d-ocean、d-tiles、n-grid、n-core、n-marks 序列化成半分辨率 canvas，离开主页（卸载）时释放。切换时只给"进场"的场景使用位图（launch 用夜间三张，landing 用日间两张）；退场场景、坐标轴、圆、轨道、刻度环、actors 仍是 SVG。craft 连线标了 `data-plate-skip`，保持活体动画。
  - 色盘的 backgroundColor 补间改成静态终点色 + `::after` 起始色透明度淡出（插值结果相同，只走合成器）。
- 结果（每 1.4s 帧数，60fps 约 84）：full 档 亮 21 / 暗 24（与原基线一致）；lite 档 亮 27-30 / 暗 33-39。
- 已知视觉差异（仅 lite）：landing 时日间方块随 clip 一次性显露，不再按距离逐组步进；夜间 stars/pixels/labels 改为整体一次淡入，不再分波。
- 剩余开销：主题翻转那一帧整页样式重算（launch 约 170ms、landing 约 250ms 的长任务，其中 UpdateLayoutTree 70-120ms）；heroArt 父层重栅格；n-orbits 缩放；高度计读数每帧更新文字。逐项单独去掉都在噪声范围内，只有主题翻转的长任务比较明确。
- 测量脚本在 `%TEMP%\opencode`：`remote-swvar.cjs`（变体对比，环境变量 FORCE=lite|full、WAITPLATES=1、SEQ=1）、`remote-swattr.cjs`（按图层统计栅格耗时，MAIN/INVAL/NOCLICK）、`remote-midshot.cjs`（切换中途冻结截图）、`remote-platecmp.cjs`（位图与 SVG 对比截图）、`remote-quiet.cjs pause|resume`、`remote-winstate.cjs list|minimize|restore`。

## 推送保护

仓库公开推送到 GitHub。任何 IP 地址都不要写进仓库文件；远程测量脚本放在 `%TEMP%\opencode`，地址从命令行参数传入。提交前下面这条命令必须没有输出：

```powershell
git diff --cached | Select-String -Pattern '\b\d{1,3}(\.\d{1,3}){3}\b'
```
