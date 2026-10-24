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
