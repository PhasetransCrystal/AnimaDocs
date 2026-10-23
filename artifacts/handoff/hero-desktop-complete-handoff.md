# 头版电脑端完成交接（2026-10-23）

## 状态

- 首页 hero 电脑端（>640px）美术与日夜切换动画已完成，用户确认，已合并推送 main（`69e3ff0`），GitHub Pages 自动部署。
- 基线：tag `hero-baseline-1`（`c5f171f`），自由发挥版 tag `free-v1/v2/v3`，分支 `exp/hero-free` 与 main 同步。
- 下一步：① 优化手机端（≤640）切换动画；② 其它区域（HomepageFeatures / 文档页等）美术元素。
- 风格特化 skill：`~/.config/opencode/skills/lanart-orbit-v1/SKILL.md`（视觉词汇、分层契约、编排、用户否决项、性能经验）。通用规则仍见 `lanart-alpha-v1`。

## 代码地图

| 文件 | 职责 |
| --- | --- |
| `website/src/components/VisualStudy/index.tsx` | 日/夜场景分层 SVG、actor 叠层、坐标轴、`HERO_ANCHORS` / `CRAFT` / `AXIS_DECADE` 导出 |
| `website/src/components/VisualStudy/styles.module.css` | 场景钉死 token、各层样式、`html[data-hero-switching='desktop']` 显示规则 |
| `website/src/components/HomepageHeader/heroThemeSwitch.ts` | WAAPI 时间线（launch/landing 各 1200ms）、移动端 VT 圆揭示、锁定/看门狗/收尾 |
| `.../altimeterDriver.ts`、`Altimeter.tsx`、`altimeter.module.css` | 高度计（对数插值 325 m → 799,000 km） |
| `.../useHeroThemeSwitch.ts`、`useHeroPaging.ts` | 安装控制器；切换期间暂停翻页、延后 measure |
| `website/src/utils/heroSwitchHook.ts`、`clientModules/themeTransition.ts` | 点击拦截优先交给 hero，其次 VT，再次 class 回退 |
| `website/src/css/art-adapters.css` 末尾 | `hero-vt` 伪元素、切换期间仅 navbar/hero 文本颜色过渡 |

## 关键约定

- 锚点：白色卫星 viewBox (611.2, 310.8)。所有圆形遮罩、色盘、连线、轴原点都以它为中心；新增连线必须从锚点出发。
- 场景内只做整层 opacity/transform/clip；滤镜在 launch 中关闭、950ms 恢复。
- 主题翻转时刻按标题与遮罩边缘距离计算（`flipTime`），不要写死。
- 时间线所有 `at` ≤ total；Timeline 会把 offset 钳成单调。
- 夜间左侧约 20%、底部被渐隐覆盖，装饰不要放进去。
- 用户否决过：块状马赛克、六边形链、灰方块散布、倒计时环、红球缩放、太长的粗线。

## 手机端现状（下一步起点）

- ≤640：淡出当前场景 180ms → `startViewTransition` → `::view-transition-new(root)` 从顶部中心圆形揭示 600ms；无 actor、无轴；高度计横向刻度条。
- 夜间板在 ≤640 是 205% 宽偏移（`inset 112px auto auto -78%`），锚点位置与桌面不同，若要做锚定动画需单独换算。
- 4x CPU：mobile launch 一个 ~65ms 长任务（VT 快照前 recalc），首帧间隙 ~125ms；landing 无长任务。可优化方向：快照前减少样式失效、去掉 180ms 预淡出、给移动端补一个轻量锚定元素（如卫星→圆心细线）。

## 验证工具（临时目录 `C:\Users\ADMINI~1\AppData\Local\Temp\opencode`，playwright-core）

- `node snap.cjs <outdir>`：静态 light/dark × 1440/390。
- `node hero-switch-frames.cjs <outdir> http://localhost:3100`：桌面/宽屏/手机 × 双向抽帧 + 结束态 JSON。
- `node switch-perf.cjs http://localhost:3100 4`：长任务与帧间隙。
- `node hero-edge.cjs http://localhost:3100`：连点、Enter/Space、滚轮、后台、减弱动效、外部改主题。
- 截图放 `artifacts/hero-redesign/`（gitignored）。必须模拟 `reducedMotion: 'no-preference'`。
- 构建：`website/` 下 `npx.cmd tsc --noEmit`；`npm.cmd run build`；预览 `npm run serve -- --port 3100 --no-open`。

## 最近一次结果（`69e3ff0`）

- tsc/build 通过；6 组切换抽帧无报错、结束态干净。
- 4x CPU：desktop launch 长任务 [866ms, 94ms]；landing [548ms, 65ms]；mobile launch [231ms, 61ms]；mobile landing 无。

## 规则

- 每轮 checkpoint 提交；推送需用户要求（部署只从 main 触发）。
- 不提交 `website/docs/**`、`website/static/**`、`website/sidebars.ts`。
