# AnimaDocs 美术层重构 · 2026-09-05

## 2026-09-06 首屏布局与翻页

- 保存性检查点：`283cb5b`，已推送 `main`；包含本轮开始前的美术重构与用户文档修改。
- 首屏上方用于原创背景图，标题和目录卡底部对齐。目录保留内容、去掉重复大插画。
- 桌面通过 `HomepageHeader/useHeroPaging.ts` 实测内容高度，预留美术区；仅在当前视口能完整容纳内容且为精确指针设备时启用整段翻页。
- 向下滚轮、PageDown、下方向键或空格触发平滑翻页。背景上移离开后，同一份标题/卡片 DOM 在导航下方 sticky 停留；继续滚动自然离开。过渡区向上滚动或对应向上键可回到首屏。
- 只有封面与过渡区处理整页输入；正文仍是浏览器原生滚动，不使用全站 mandatory snap，不复制标题/按钮，不创建额外滚动容器。
- 移动端、平板、低高度窗口、大字号撑高内容以及 reduced-motion 使用自然滚动。手机按钮尽量在首屏底部，完整目录自然进入下一屏，避免强制跳页跳过内容。
- 保留 Ctrl/Meta/Shift 组合、横向手势、输入框、菜单、嵌套滚动区行为；导航离开时清理监听器、ResizeObserver、定时器和动画帧。
- `paging/`：本轮浏览器截图，桌面封面、过渡停留、继续滚动、窄屏目录和超宽屏。使用应用内浏览器验证双主题滚轮、上翻、按钮跳转，控制台没有捕获到错误。
- 浏览器检查覆盖 320、390、768、1024、1440、3440 宽度，没有页面横向溢出。600px 高矮屏检测到首屏需额外阅读空间后禁用强制翻页。
- `node artifacts/visual-refresh/verify-paging.cjs`：模拟 DOM 的交互检查，覆盖滚轮、反向、键盘、输入豁免、菜单、reduced-motion 动态改变及卸载清理；不是浏览器键盘事件的端到端测试。
- `npm.cmd run typecheck` 和 `npm.cmd run build` 通过。仍存在下文记录的原文档锚点警告；沙箱内 Docusaurus 的更新检查也报告配置存储权限不足，不影响静态构建。
- 本轮新改动未自动提交或再次推送；保存性检查点保留不动。

### 2026-09-06 翻页边界修正

- 原生滚动结束后，若仍在封面过渡区，平滑归位到最近端点；正文区域不吸附。支持 `scrollend` 时等待原生滚动结束，避免拖住滚动条暂停时被防抖定时器抢走位置；旧环境使用 160ms 防抖兜底。
- 标题/卡片的承接高度改为内容实测高度、sticky 偏移和实际边框之和，消除落点后约 44px 的额外停留；删除落点后的滚轮冷却及向下正文区多余的反向捕获范围。
- 应用内浏览器 1440×900 实测：翻页落点 `scrollY=840`、内容顶部 `80px`；继续滚动 `12px` 后，分别为 `852` 和 `68px`，确认直接随滚动移动；回到落点再上翻可返回 `scrollY=0`。
- 扩展 `verify-paging.cjs` 覆盖拖住/松开、无 pointer 事件的原生滚动结束、旧环境防抖、最近端点、无重复归位、动画中断、移动端与 reduced-motion 豁免、焦点及清理。回归脚本、类型检查、生产构建通过。
- 验证限制：应用内浏览器工具不能命中浏览器原生滚动条滑块，拖拽逻辑由模拟事件回归覆盖，不冒充实际鼠标拖拽端到端测试；需在真实浏览器手动验收滑块拖动。

### 2026-09-06 主题切换后滚动归位失效：焦点修正

- 检查分离结构：背景 `VisualStudy` 使用绝对定位及 `pointer-events: none`，标题/卡片仍使用同一组 DOM/ref；主题按钮由 Docusaurus 提供，不在美术层中。本次没有合并美术与交互层，也没有修改布局或配色。
- 实际错误路径：主题切换后 `document.activeElement` 仍为主题按钮，`settle()` 复用了输入事件的 `ignoreTarget()`，将普通按钮的残留焦点当成应豁免的控件操作，直接跳过原生滚动结束后的归位。重测或多等渲染帧不会改变此判断。
- 修正：区分事件目标与残留焦点；普通按钮保留焦点不再禁用滚动归位，但按钮自身的键盘/滚轮事件仍走原生行为。输入框、可编辑区域、弹窗、导航菜单、嵌套滚动区和链接焦点保护保持不变；不强制 blur。
- 撤去上一轮主题观察器中强行终止动画及双帧等待，只保留合并到下一帧的几何重测。主题美术更新不再主动取消正在进行的翻页。
- 失败先行回归：旧代码在“保留主题按钮焦点、切换后拖动松开”用例中实际归位次数为 0，期望为 1；修正后通过。覆盖日→夜→日重复切换、原生 scrollend/防抖回退、有/无 scrollbar pointer 事件、键盘激活不拦截、保护焦点、真实变化的承接高度及监听清理。
- 生产页面浏览器验证：切换主题后焦点确实留在 BUTTON；1440×900 日间下翻到 `840px`、内容顶部 `80px`，落点切为夜间仍为 `840px`，再滚动 `12px` 后为 `852px`、内容顶部 `68px`，没有恢复额外 sticky 停留。浏览器原生滑块拖动仍受工具限制，该路径以失败先行的事件回归覆盖，不宣称已完成滑块端到端验收。
- 回归脚本、类型检查及生产构建通过；已有文档锚点和更新检查配置权限提示未改动。

### 2026-09-06 流程图配色语义与宽屏收束

- 本轮只实施节点配色与宽屏留白。日夜独立底板的新美术方向等待用户确认，现有两套背景及左右装饰文本保留。
- 将原来六种不明确的 tone 归并为输入准备、绘制核心、结果输出。输入统一中性灰，核心日间蓝/夜间红，输出日间墨色/夜间暖白；补充节点内角色文字，避免仅凭颜色理解含义。
- 连接线、箭头和端口使用统一的流程连接 token，移除依赖 nth-child 的任意红色分支；不更改已有节点顺序和分支含义。
- 桌面图体居中限宽 64rem（默认 1024px），底板继续全宽，底部说明与图体对齐；中等宽度和手机仍使用既有响应式排列。手机底板增加 60px 高度供长说明换行，不裁切正文。
- 1920px 实测图体从 1636px 收至 1024px，核心节点从约 515px 收至 317px；3440px 下图体仍为 1024px，底板为 2168px。
- 生产页检查：1920px 日夜主题、3440px 夜间、390px 夜间、320px 日夜及900px日间；最终记录没有页面横向溢出或节点文字裁切。五个输入节点颜色一致，核心分别为日蓝/夜红。截图与最终测量记录位于 `workflow-refinement/`；其中基线和迭代截图保留供比较。
- 类型检查、生产构建与差异检查通过。已有文档锚点及更新检查配置权限提示保留；未提交或推送。

### 2026-09-06 流程图追加 VAE 分支与弹性宽度

- 按后续反馈，新增“图像编码”及其下方“加载 VAE”，形成绘制→图像编码→图片保存、VAE→图像编码两条连接；共九个节点、八条连线。节点采用拓扑顺序编号，图像编码名称按用户要求保留。
- 替代上一轮的 64rem 图体上限：两侧使用有上限的适度内缩，内部网格按比例自动拉宽。1920px 下图体约1564px，3440px下约1926px，不再固定1024px。
- 节点网格的列、行和间隔与 SVG 使用同一比例坐标，五列桌面与两列窄屏分别定义；为每条线标明 data-from/data-to，检查端点确实落在对应节点边缘。
- 底部说明独立以1.4rem内边距贴近整个底板，不再跟随图体留白。主模型、文本编码器、VAE加载及图片保存使用日间金色、夜间橙色；核心仍为日蓝/夜红，其他处理节点为中性色。
- 保持两套背景与左右装饰文本不变，第三步美术仍等待用户决定。窄屏维持VAE在图像编码下方，保存位于下方另一侧，使用明确方向的连接线；增加纵向空间避免长标题裁切。
- 验证1920px双主题、1024px夜间、320px双主题、3440px日间：九个节点无裁切、无页面横向溢出；八条线的起终点与实测节点边缘误差小于1px。副色与底部独立定位检查通过，记录为 `workflow-refinement/expanded-report.json`。
- 类型检查、生产构建及差异检查通过；已有内容锚点和更新检查权限提示未改动。未提交或推送。

### 2026-09-06 第三步：独立日夜流程图底板

- 用户确认后实施两套独立底板，拆为 `HomepageFeatures/WorkflowArt.tsx` 和 `workflow-art.module.css`。主组件只挂载装饰层；原九个节点、八条连线、弹性宽度和底部说明定位不改动。
- 夜间：左边缘外偏下的极坐标网格；右侧第二圆心的白色粗弧及两段低透明度宽环；桌面五个水平分布的十字，十字上下断开后接延伸线。SVG mask 在弧线与延伸线交叉处留白，节点自身不透明表面遮住背后装饰。两组低亮度红色伪代码文字替代旧像素团。
- 日间：纸白与蓝灰正交网格、独立斜向浅蓝纸面、右侧圆弧/矩形制图结构、角部套准标记及少量编号。不是夜间底板的简单换色，保留已有左右浅色装饰文字。
- 响应式：1024px 下隐藏会侵入核心节点的第一组日志，保留另一组；996px及以下隐藏装饰小字，夜间十字减为三个、网格和环带降密度。两种主题的装饰层互斥显示，均为绝对定位、pointer-events:none、aria-hidden，不接入滚动和主题状态逻辑；forced-colors 隐藏装饰。
- 素材来源：对照 lanart-alpha-v1 的 night-02-orbit 与 day-02-plan 参考图分析线条层级和构图，本次产物均为原创 CSS/SVG。没有裁切、复制或打包参考图，没有引入位图生成或第三方美术资产；复用已有颗粒纹理 token。
- 浏览器实测覆盖1920px双主题、1024px双主题、320px双主题与3440px夜间：无页面横向溢出、无节点文字裁切、无装饰小字或十字与节点重叠；仅显示对应主题美术，装饰层不接收鼠标事件。
- `workflow-art/day-1920.png` 与 `night-1920.png` 是实际页面截图的底板局部裁切，不是效果图生成。另保留整屏截图及 `report.json`。截图工具的直接clip结果不符合预期，最终局部预览从完整截图按实测区域裁出，未修改画面内容。
- 类型检查、生产构建、翻页回归及差异检查通过。原文档锚点和更新检查权限提示保留；本轮未提交或推送。

### 2026-09-06 夜间底板修订：等角红网格与上方圆心

- 按用户标注图，将白弧圆心从右侧96%/42%移到76%/-42%，位于底板上方框外并较原位置向左移动。六条白弧半径等差增长，透明度逐圈递减，不再使用不规则虚线段。
- 极坐标圆心仍在左边缘外的-8%/78%。旧版射线确实按终点百分比手排，并非等角分布；改为在该原点的独立1×1 SVG坐标系内，用 rotate(angle) 生成-90°至90°、每隔10°的19条射线。无拉伸viewBox，宽高比不会改变夹角，长射线统一由底板裁切。网格改为低透明度暗红色。
- 白色半透明环带保留两条，窄带16–30px、宽带42–88px。沿用十字与延伸线的切除mask；1920px实测窄带覆盖69%位置十字、宽带覆盖50%位置十字，两处均产生遮罩切除。
- 两组装饰文本各六行，改用虚构十六进制转储、寄存器与偏移样式，不再描述实际工作流或状态。移动到节点空白区域，较窄桌面减少一组，手机隐藏；日间设计、九个节点、八条连线及布局未更改。
- 新增 `node artifacts/visual-refresh/verify-workflow-art.cjs`，检查SSR输出中的共同原点、10°旋转、等距渐隐白弧、两种环带及装饰语义。浏览器另外核对1920/1024/320下计算后的旋转矩阵，角度误差小于0.0001°，没有装饰小字重叠、节点裁切或页面横向溢出。
- 预览：`workflow-art/night-revised-1920.png`；完整截图与 `night-revised-report.json` 同目录。类型检查、生产构建、翻页回归和美术几何回归通过，原有构建提示保留；未提交或推送。

## 范围与约束

- 保留首页左侧标题、右侧目录、工作流、学习路径、教程范围的顺序与分栏。
- 保留文档的左侧导航、正文、右侧目录以及全部文档内容和链接。
- 不修改现有贡献者组件、用户正在编辑的文档、原图或文档 footer 扩展。
- 排版只调整字距、行高、标记与统计数字层级；不重排界面。761–900px 的工作流只放宽原四列的最小宽度，修复末端节点裁切。

## 参考库存与转译

参考来源为 `lanart-alpha-v1/references/reference-images` 的 11 张案例图片。它们仅作视觉研究，没有复制、裁切、描摹或作为生产资产分发。

| 维度 | 日间 | 夜间 |
| --- | --- | --- |
| 色彩角色 | 保留纸白、钴蓝、墨黑、黄铜；蓝色用于制图及结构 | 保留石墨、朱红、暖灰；琥珀色用于悬停和键盘焦点 |
| 几何 | 直角纸面、透视坐标、薄片叠层、定位标记 | 圆角主框、镜片截面、刻度环、椭圆轨道 |
| 线条与材质 | 受控网格弯曲形成曲面；细线与实色底板分层 | 原创光学装置示意；暖灰线描、红色圆形焦点 |
| 排版 | 大标题与等宽索引对比；取消过密的标题行叠压 | 同一语义骨架；强调暖白标题与红色信号 |
| 构图 | 研究图限制在右侧，目录面板形成完整局部图版 | 大圆形焦点置于目录后方，正文区域保留暗色留白 |
| 文档阅读 | 去除穿过长正文的背景网格；保留标题页签与刻度 | 深色阅读底、低密度轨道页签，不给正文叠加噪点 |

## 实现与资产来源

- `website/src/components/VisualStudy/index.tsx`：本次原创 SVG，数学生成的曲面线网及逐项编写的镜片/轨道图形。固定几何，没有随机值或外部请求。
- `website/src/components/VisualStudy/styles.module.css`：`backgroundArt`、`diagramArt`、`noiseLayer` 图层；两种材质由 CSS 主题适配器切换。噪点是固定 seed 的内嵌 SVG 滤镜，低透明度且限定在装饰区域。
- `website/src/css/art-adapters.css`：共享导航、侧栏、文章标题、链接、代码、表格、提示块、分页与页脚的材质层；通过 Docusaurus `customCss` 数组在原主题后加载，不编辑框架依赖。
- `website/src/pages/index.module.css`：保留布局规则，删除 62 条已失去 DOM 对应关系的旧装饰规则。
- 所有新增视觉均为源码内原创 CSS/SVG，没有使用图像模型或引入第三方成品图，不产生新的外部素材授权依赖。
- 遵循 `lanart-synerg-v1` 的媒介选择：这些效果属于可控几何，不需要专门的位图制作。装饰不可用或进入强制颜色模式时，语义文本、控件和链接仍然完整。

## 迭代记录

- `baseline/`：编辑前首页及文档基线，390×844、1440×900、3440×1440，昼夜两组。初始基线直接设置主题属性，不作为主题持久化验证证据。
- `iteration-01/`：首轮 SVG 替换和阅读材质层。复核后修正主题截图方法，改为真实点击切换按钮并等待样式稳定。
- `final/`：移动端图形安全区与对比度调整过程。早期检查将未触发加载的 lazy 图片误报为损坏，最终检查改为截图前触发加载并等待完成，没有为任何图片添加跳过白名单。
- `final-verified/`：生产构建的最终截图和 `report.json`，应以此目录为验收证据。
- 截图和报告是本地生成物，已加入 `.gitignore`，没有被打包到网站。未创建分支、提交或推送。

## 验证

执行环境：本地 Chrome，无头 Playwright；生产预览 `http://127.0.0.1:4173`。

- 全量截图：5 条路由 × 2 个主题 × 3 种视口，共 30 张整页截图；另有首页/文档首屏、移动菜单与强制颜色截图。
- 路由：`/`、`/docs/intro`、`/docs/install`、`/docs/first_workflow`、`/docs/theory/anima`。
- 主视口：390×844、1440×900、3440×1440；额外检查宽度 320、768、1024。
- 检查页面横向溢出、标题边界、局部裁切、文档图片加载和浏览器运行异常。
- 检查主题切换及刷新/跨页持久化、主按钮导航、键盘焦点、正文目录锚点、表格排序、移动导航打开与关闭。
- 检查 reduced-motion 和 forced-colors；装饰层可以移除，控件仍保留。
- 主按钮文字对比度：日间 5.98:1、夜间 4.57:1；悬停分别 17.87:1、9.99:1。这是指定控件的检查结果，不宣称全站 WCAG 合规。
- `npm.cmd run typecheck`、`npm.cmd run build`、`git diff --check` 通过。

### 已知内容警告

生产构建报告 `/docs/first_workflow` 中的 `#基本生图流程` 指向不存在的锚点。相关文档属于用户已有修改，本轮未编辑，也未通过关闭检查来掩盖警告。

### 复现

`verify.cjs` 是本轮截图和验收工具，不新增产品依赖或测试框架。需要可解析的 `playwright` 包及本机 Chrome，可使用桌面运行时的 `NODE_PATH`。

```powershell
$env:VISUAL_BASE_URL = 'http://127.0.0.1:4173'
$env:VISUAL_ROUND = 'final-verified'
node artifacts/visual-refresh/verify.cjs
```

### Workflow night refinement — 2026-09-06

- Distributed the two decorative hex/register blocks between the lower center and upper right, away from node cards and workflow connectors. Narrow desktop retains one block; mobile hides both.
- Reduced white orbit arcs from six to four, with equal radial spacing and opacity levels of 1 / 0.62 / 0.32 / 0.12. Kept the two unequal broad bands and the red 10-degree polar grid.
- Replaced rectangular registration halos with reciprocal SVG luminance masks. Bands and registration crosses/guides share unmasked source geometry: each subtracts the other, so their intersection reveals the underlying artwork instead of retaining a white cross or painting a background-colored patch. Band opacity is applied only to visible instances; mask silhouettes remain opaque.
- Day artwork, semantic nodes, connectors, shared layout and paging code were not changed in this refinement.
- Passed workflow-art regression, paging regression, TypeScript checking and production build. Existing broken documentation anchor and update-check permission warnings remain unrelated.
- Browser checks at 1920, 1024 and 320 pixels found no horizontal overflow, clipped nodes or decorative-log/card intersections. Switching to day mode shows only the day adapter.
- Actual production preview: `workflow-art/night-knockout-1920.png`; DOM measurements: `workflow-art/knockout-report.json`.
