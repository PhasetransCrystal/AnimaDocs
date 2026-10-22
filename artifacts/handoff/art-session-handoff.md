# AnimaDocs 美术重构 · 会话交接

## 1. 当前状态

- 分支 main，HEAD `e34a7ea`，已全部推送（`origin/main == main`）。
- 本会话（2026-10-22）新增并推送的提交：
  - `dec071c` 首屏性能整理（见第 2.1 节）。
  - `6862f28` 日间强调色改墨黑：light `--anima-gold: var(--anima-ink)`；夜间 `#c5a26b` 不变。
  - `e34a7ea` 文档：`DESIGN_ASSETS.md` 新增“实现约定”，`artifacts/visual-refresh/README.md` 新增 2026-10-22 记录。
- 实验分支 `exp/hero-art-off`（2d8403c）：只作对照用，不要合并。
- 未跟踪文件只有 `artifacts/handoff/`（本文件所在目录，不提交）。下一个主题的需求稿：`artifacts/handoff/launch-orbit-brief.md`。
- 规则：每轮改动完成后提交检查点；用户要求时才推送（本会话用户要求每步推送）。只 stage 本轮改动的文件，绝不 stage `website/docs/**`、`website/static/**`、`website/sidebars.ts`。
- 技能：`lanart-alpha-v1`（参考图驱动的双模式界面）、`lanart-synerg-v1`（素材协作）。截图放在 `artifacts/hero-redesign/`（已 gitignore）。

## 2. 已完成的美术工作

- 首屏日间 `DayAtlas` / 夜间 `NightObservatory`、动效、滚动暂停、文档底板、整合轮：见提交 8991f6e 到 bf3a8fb，细节以代码为准。
- 已知环境问题：本机 Windows 关闭了“在 Windows 中显示动画”，Chrome 报告 `prefers-reduced-motion: reduce`，所以本地默认不播放动画，也不做切换过渡。这是正确的无障碍行为。截图和探针都要模拟 `reducedMotion: 'no-preference'`。

### 日夜切换过渡（046a80f 到 648b5c9，用户测试反馈：“流畅度和渲染都不错”）

- `website/src/clientModules/themeTransition.ts`，在 `docusaurus.config.ts` 的 `clientModules` 中注册：
  - 主路径：`ENABLE_VIEW_TRANSITION = true`。在捕获阶段拦截 `[class*="colorModeToggle"] button` 的点击，给 html 加上 `theme-vt` class，然后在 `document.startViewTransition()` 里重放这次点击，`finished` 后移除 class。
  - 回退路径：浏览器不支持 View Transitions 时，用 MutationObserver 监听 `data-theme`，给 html 加 `theme-transitioning` class 520ms，期间对颜色类属性做 transition，美术底板交叉淡化。
  - reduced-motion 下两条路径都跳过，直接切换。
- `website/src/css/art-adapters.css`，文件末尾、`@media (max-width: 996px)` 之前：
  - `--anima-theme-switch-duration: 520ms`。
  - `theme-transitioning` 规则：全局颜色 transition；`[data-theme-art]` 下的 `[data-art-mode]` 两张底板同时显示并淡入；过渡期间底板内部动画设为 `animation: none`。原因：运行中的 SVG 动画会让 Chrome 每帧取消并重启页面上的颜色 transition。
  - `theme-vt` 规则：
    - 过渡期间暂停美术动画（`animation-play-state: paused`），并关闭全部 transition。
    - `::view-transition-old(root)` 设为 `animation-name: none`，旧快照保持不透明。
    - `::view-transition-new(root)` 使用自定义的 `animaThemeFadeIn` 动画（opacity 0 到 1），配合 `mix-blend-mode: normal`。
  - 必须用自定义 keyframes：Chrome UA 自带的 `-ua-mix-blend-mode-plus-lighter` 是通过动画施加的，会覆盖作者写的 `mix-blend-mode`，导致颜色相加，出现过曝和粉色。
  - `art-adapters.css` 新增 token `--anima-art-night: #0d1014`。
- 美术底板结构：
  - `VisualStudy/index.tsx` 拆成两个 svg：`.dayPlate[data-art-mode="day"]` 和 `.nightPlate[data-art-mode="night"]`，外层容器带 `data-theme-art`。
  - `WorkflowArt.tsx` 的 `DayStudy` 和 `NightStudy` 同样带 `data-art-mode`。
  - 平时用 `display:none` 隐藏非当前模式的底板，没有渲染开销。
- 路线卡斜切渐变（`HomepageFeatures/styles.module.css`，约第 595 行）：用 `@property` 注册 `--route-surface` 和 `--route-wash` 两个颜色变量，让渐变颜色可以过渡。其他纯渐变表面以后也可以用同样方法。
- 颜色字面量 token 化（946a08b）：VisualStudy、index.module.css、HomepageFeatures、workflow-art 共替换 24 处。596dcf5 恢复了两处 dark `#171a20`（路线卡背景、`.panelStatus` 颜色）。
- 性能：切换期间每 900ms 的帧数从 21-29 提升到 38-55。

### 2.1 首屏性能整理（dec071c，2026-10-22）

- `useHeroPaging.ts`：
  - 非 passive 的 wheel 监听只在分页区间内绑定（`syncWheel`）；先做便宜的位置判断，再调 `ignoreTarget`；`ignoreTarget` 只在元素可滚动时才调 `getComputedStyle`。
  - 新增 `artRef`，每帧把 transform 直接写到 `.heroArt` 的 inline style，不再在 section 上写会继承的 `--art-travel`；删掉了无用的 `--hero-progress`。
  - `measure()` 先读后写；未变化的值不重复写。
  - 滚动中或离开首屏时在 `.heroArt` 上设置 `data-art-paused`，由 VisualStudy 的 `:global([data-art-paused])` 规则暂停动画。
- `VisualStudy`：日间方块改成预先旋转好的 path，透明度用 `--tile-alpha` 走 fill/stroke-opacity（mask-image 下的 transform 属性和逐元素 opacity 属性会让层数爆炸）；刻度、地块、加号合并成少量 path（CSS 选择器已改为 `.landN path`）；`guideCircle` 改为 stroke-dashoffset 动画（`guideCrawl`）；`nodeBlink` 改为 fill-opacity。
- `themeTransition.ts`：`theme-vt` class 在 VT update 回调里添加，与主题切换合并为一次 recalc。
- 结果（生产构建，4x CPU）：日间层数 38→7（45.9→26.1MB），空闲 layerize 408→约 50ms，wheel 区域 266→10，scrollend 强制重排 31.9→约 3ms；无内存泄漏。切换主任务约 70-90ms，主要是约 600 个元素的主题 recalc 和 SVG 文本布局，属于固有开销。夜间层数未变（30），layerize 854→约 427。
- 原生 CSS scroll-snap 未采用：与 sticky 承接设计冲突。

## 3. 关键文件

| 文件 | 作用 |
| --- | --- |
| `website/src/clientModules/themeTransition.ts` | 切换过渡入口（View Transitions 和 class 回退） |
| `website/src/css/art-adapters.css` | 美术适配层，加载顺序在 custom.css 之后；末尾是切换过渡规则 |
| `website/src/css/custom.css` | 设计 token（`:root` 约 7-64 行，dark 约 66-114 行） |
| `website/src/components/VisualStudy/index.tsx` + `styles.module.css` | 首屏 SVG，日夜两张底板 |
| `website/src/pages/index.tsx` + `index.module.css` | 首屏 DOM、目录面板、`--hero-accent` |
| `website/src/components/HomepageHeader/useHeroPaging.ts` | 首屏分页吸附与滚动暂停，不能改坏 |
| `website/src/components/HomepageFeatures/*` | 学习路线卡、workflow 美术 |
| `DESIGN_ASSETS.md`、`artifacts/visual-refresh/README.md` | 美术开发规范文档（已更新，e34a7ea） |

token（light / dark）：ink `#111820` / `#ece9e3`；paper `#f1f3f2` / `#121419`；blue `#245dcc` / `#8daeff`；red `#c6383d` / `#e34549`；gold `var(--anima-ink)`（日间改墨黑，6862f28）/ `#c5a26b`；dark interactive 为 amber `#f2b35d`。

## 4. 任务状态

1. 已完成：日间金色改墨黑（方案 A，6862f28）。A/B/C 对比图在 `artifacts/hero-redesign/gold-preview/`（运行时注入 CSS 生成，没有改源码）。
   - 仍未 token 化的字面量（以后需要时再做）：VisualStudy 的 `.field` `#e7edf4`、wash `#dce6f5/#c9d8ef/#e8eef7`、land0-6、terrace0-7、discLens `#a8272e`、SVG 渐变色标（`#3474e8/#1d4aa6` 等）。
2. 已完成：规范文档（e34a7ea）。`DESIGN_ASSETS.md` 新增“实现约定”一节。
3. 已完成：skill 更新（在仓库外，不需要提交）。`SKILL.md` 新增 Mode switching、Motion and rendering budget、Verification techniques 三节；`references/case-study-animadocs.md` 新增实现备注；新增 `references/animadocs-hero-kit/`（e34a7ea 时的 8 个源码快照、4 张截图、移植说明 README）。
4. 切换形态升级：已并入下一个主题，见 `launch-orbit-brief.md` 第 4 节的问题 5。

## 5. 下一个会话的主题：日间发射场 / 夜间宇宙轨道

- 需求稿：`artifacts/handoff/launch-orbit-brief.md`。内容包括现状、高度计（325 m ↔ 799,000 km）、升空编排（T0-T4，反向为降落）、文档页趋同候选 F-01 到 F-10，以及 8 个核心问题。
- 先和用户讨论需求稿里的问题，再动手做原型。原型建议放在实验分支上。

## 6. 验证流程

- 开发服务器由用户自己运行，地址 `http://localhost:3000`（监听 ::1，不要用 127.0.0.1）。
- 在 `website/` 下运行 `npx.cmd tsc --noEmit`；再运行 `npm.cmd run build *> $env:TEMP\opencode\build.log`，检查日志中有 `[SUCCESS]`。
- 临时工具目录 `C:\Users\ADMINI~1\AppData\Local\Temp\opencode`（playwright-core 1.48.2，使用本机 Chrome）：
  - `hero-capture.cjs <outdir>`：截取 light/dark × 390x844、1440x900、3440x1440。
  - `style-snapshot.cjs` / `style-diff.cjs`：计算样式快照 diff。`before.json` 是 3c02d48 的快照，现在因为 SVG 结构变化已经不再干净，下一轮先重新生成基线。
  - `vt-mid.cjs <outdir>`：用 CDP 把动画放慢 10 倍，截取 VT 过程中 500 / 2600 / 4600 ms 和结束时的画面。
  - `vt-probe.cjs`：查看切换时的 class、VT 伪元素动画数和 CSSTransition 数。
  - `fps-probe.cjs`：切换后 900ms 内的 rAF 帧数，每个方向跑 3 次。
  - `switch-capture.cjs`、`switch-probe*.cjs`、`lag-probe.cjs`、`anim-list.cjs`：class 回退路径的调试工具。
  - 本会话新增（默认连接生产预览 `http://localhost:3100`，用 `BASE_URL` 可改地址）：
    - `perf-probe.cjs <label>` → `perf-<label>.json`：4x CPU 下的层数、空闲/交互 trace、强制布局调用栈、长帧（按阶段归类）、空闲堆增长。`perf-sum.cjs <labels...>` 把多次结果并排对比。
    - `snap.cjs <outdir>`：暂停动画后截取确定性画面。`pixdiff.cjs <dirA> <dirB>` 做像素对比，加 `HEAT=1` 输出热图。
    - `toggle-trace.cjs <light|dark>`：切换时主线程的耗时拆解。`leak-check.cjs`：GC 后堆、节点、监听器数量。`paging-check.cjs`：分页行为和 wheel 绑定。
    - `gold-preview.cjs` / `gold-sheet.cjs`：运行时注入配色并拼对比图。
  - 生产预览：在 `website/` 下 `npm run serve -- --port 3100 --no-open`，服务的是 `website/build`，改代码后要重新 build。性能数据以生产构建为准，不用 dev server。

## 7. Subagent 调度准则

- 机械性工作（grep 审计、批量替换、截图跑批、style diff、文档初稿）交给 subagent，主模型只负责设计决策、审阅和最终改动。
- 模型：在 `C:\Users\Administrator\.config\opencode\opencode.json` 里，explore 和 general 都是 `sc-gm/deepseek-v4.1-flash`。`opencode.jsonc` 含明文 key，不要回显。
- 每个 subagent 只做一件事。prompt 要写清：目标文件和行号、允许改哪些文件、验证命令、简短的返回格式；并且明确禁止提交、推送或修改用户文档。
- 上次的 token 化 subagent 把 `#0d1014` 错误地映射成 `--anima-paper`（实际值为 `#121419`），说明“近似值算等值”需要主模型逐条抽查。

## 8. 上下文管理

- DCP 插件已固定为 `@tarquinen/opencode-dcp@3.2.0`。`dcp.jsonc` 的阈值已调高：全局 max 150K / min 75K；opus 200K / 100K；sonnet 180K / 90K。原来的默认值是 100K / 50K。
- 上一会话发现的问题：
  - 压缩通知里的“-XK removed”是整个会话的累计值，不是单次压缩的量。
  - 长会话中压不掉的部分（系统提示、工具定义、摘要、最近若干轮）约 130K，高于旧的 100K 上限，所以每轮都会报警，导致反复做几乎无效的压缩。
- 准则：只在阶段结束（提交后）压缩。如果压缩后总量仍然不降，说明已经到了下限，就不要再压了，改为写交接文档并开新会话。
- 读文件时用 offset/limit 精确读取；不要重复读截图，确有需要时只读一两张关键帧。
- 2026-10-22 会话因上下文过长结束（性能整理、配色、文档、skill 都已完成）。新会话先读本文件和 `launch-orbit-brief.md`。
