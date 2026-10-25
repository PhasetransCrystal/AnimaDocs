# 首页 hero 完成，转入其它内容美术优化（2026-10-25）

## 状态

- 首页 hero 的美术、日夜切换动画、低配 lite 档均已完成，用户确认。已推送 main（`79d8d88`），GitHub Pages 自动部署。
- 历史细节：桌面编排见 `hero-desktop-complete-handoff.md`，低配性能见 `hero-lowend-perf-handoff.md`（第三轮）。
- 下一步：其它内容的美术优化。hero 相关文件原则上不再动；如果必须改，要同时验证 full 和 lite 两档的切换。

## full / lite 档位

- 前端没有可见标识，用户看不出自己是哪一档。
- 判定：`HomepageHeader/heroArtLite.ts` 进入首页 1.8s 后测静置帧率。连续两个 1.6s 窗口低于 48fps 判为 lite，不低于 55fps 判为 full，介于两者之间不下结论。结果写在 sessionStorage `anima-hero-art-lite`（`lite` / `full`），同一标签页会话内不重测。开启"减弱动效"时不测。
- 查看方法：DevTools 里看 hero 外层 `.heroArt` 上是否有 `data-art-lite="true"`，或者看上面那个 sessionStorage 值。手动强制某一档：把该值设成 `lite` 或 `full` 再刷新。

## 下一阶段范围（待和用户确认优先级）

| 区域 | 文件 | 现状 |
| --- | --- | --- |
| 首页 workflow 区 | `components/HomepageFeatures/index.tsx`（`WorkflowBoard` 103 行起）、`WorkflowArt.tsx`（`DayStudy` / `NightStudy`，外层 `[data-theme-art]`）、`workflow-art.module.css`（128 行，forced-colors 下隐藏）、`styles.module.css`（647 行） | 节点图 + 日夜背景小图，走普通 class 切换过渡 |
| 首页学习路线区 | 同上 `index.tsx` 210 行起；路线卡斜切渐变用 `@property --route-surface/--route-wash`（`styles.module.css` 约 595 行） | 路线卡、图例、范围列表、脚注 |
| 文档页 | `css/art-adapters.css`：文档样式 40-262 行，文档底板 287-357 行，切换过渡 369 行起；`theme/DocItem/Footer/index.tsx` | 已有日夜底板和刻度装饰。`launch-orbit-brief.md` 第 3 节有文档页候选 F-01 到 F-10，未筛选 |
| 组件 | `ContributorCredits`、`ContributorCard`、`SortableTable` | 未做过美术 |

参考：`launch-orbit-brief.md` 的原则是"首屏是表演，文档页是仪表"，以可读性为先，不放常驻动画。风格 skill 用 `lanart-orbit-v1` / `lanart-alpha-v1`。

## 不能破坏的约定

- 非 hero 区域的日夜切换走 `clientModules/themeTransition.ts`：View Transition，或者回退到 `html.theme-transitioning`（520ms）。`[data-theme-art]` 下的美术按整张底板交叉淡化（`art-adapters.css` 385 行起），新增美术也要挂 `data-theme-art` / `data-art-mode`，不要让大量 SVG 填充色逐个过渡。
- hero lite 档切换时，整页 `data-theme` 要等到动画结束（约 1.2s）才翻转。在这之前只有 `[data-hero-ink]` 作用域局部换主题。新写的 dark 规则如果可能命中 hero 文本或 navbar，要用 `:not(:where([data-hero-ink][data-theme='light'] *))` 排除，写法参照 `pages/index.module.css`。
- 不加 `!important` 级别的全局颜色过渡。`art-adapters.css` 457 行起的 hero 切换过渡清单不要扩大。
- 颜色用 token（`custom.css` 7 行起的 light 变量块，67 行起的 dark 变量块），不写字面量。

## 验证

- 构建在 `website/` 下：`npx.cmd tsc --noEmit`、`npm.cmd run build`。
- 前端实际效果由用户自己测，我们只负责编译验证。
- 远程测试机的地址和网络配置已从仓库清理。需要再测时由用户重新提供，不写进仓库。
- 已用过的性能优化手段汇总见 `perf-techniques.md`（手机端优化可复用）。

## 规则

- 每轮做检查点提交。推送要用户要求（部署只从 main 触发）。
- 不提交 `website/docs/**`、`website/static/**`、`website/sidebars.ts`。
- 提交前检查 IP：`git diff --cached | Select-String -Pattern '\b\d{1,3}(\.\d{1,3}){3}\b'` 结果必须为空。
- 不要把 node_modules 用 junction 挂进 worktree 之后再 `git worktree remove --force`，那样会删掉真实依赖。
