import {type CSSProperties, type ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Heading from '@theme/Heading';

import styles from './styles.module.css';

type SectionItem = {
  index: string;
  label: string;
  title: string;
  description: string;
  to: string;
  action: string;
  meta: string;
};

type WorkflowNode = {
  index: string;
  key: string;
  title: string;
  detail: string;
  tone: 'model' | 'support' | 'canvas' | 'text' | 'core' | 'output';
};

type PixelIsland = {
  x: number;
  y: number;
  opacity: number;
  rotation: number;
  cells: string[];
};

const sectionItems: SectionItem[] = [
  {
    index: '01',
    label: '部署',
    title: '本地环境与首次运行',
    description: '安装 ComfyUI 与 Anima，确认显存、模型文件和运行环境。',
    to: '/docs/intro',
    action: '开始部署',
    meta: '基础环境 / 01',
  },
  {
    index: '02',
    label: '节点',
    title: '原版节点与连接',
    description: '按输入、处理和输出理解常用节点，搭建可复用的基础工作流。',
    to: '/docs/theory/anima',
    action: '查看节点原理',
    meta: '节点逻辑 / 02',
  },
  {
    index: '03',
    label: '调试',
    title: '画风测试与扩展',
    description: '记录采样参数、第三方节点和本地训练的测试结果。',
    to: '/blog',
    action: '进入实践记录',
    meta: '实验记录 / 03',
  },
];

const scopeItems = [
  {index: '01', title: '本地部署', detail: '安装 ComfyUI 与 Anima'},
  {index: '02', title: '原版节点', detail: '理解输入、处理与输出'},
  {index: '03', title: '画风调试', detail: '记录参数并复现结果'},
  {index: '04', title: '第三方节点', detail: '扩展功能与常用工作流'},
  {index: '05', title: '本地训练', detail: '准备数据并验证模型'},
];

const workflowNodes: WorkflowNode[] = [
  {index: '01', key: 'model', title: '加载主模型', detail: 'MODEL', tone: 'model'},
  {index: '02', key: 'attachments', title: '应用附件', detail: 'LoRA / ControlNet 等', tone: 'support'},
  {index: '03', key: 'canvas', title: '构造画布', detail: 'Latent / 空白或已有图像', tone: 'canvas'},
  {index: '04', key: 'encoder', title: '加载文本编码器', detail: 'TEXT ENCODER', tone: 'text'},
  {index: '05', key: 'prompt', title: '编码提示词', detail: 'CONDITIONING', tone: 'support'},
  {index: '06', key: 'draw', title: '图形绘制', detail: '采样器 / 出图核心', tone: 'core'},
  {index: '07', key: 'save', title: '图片保存', detail: 'OUTPUT', tone: 'output'},
];

const nodePositionClasses: Record<string, string> = {
  model: styles.nodeModel,
  attachments: styles.nodeAttachments,
  canvas: styles.nodeCanvas,
  encoder: styles.nodeEncoder,
  prompt: styles.nodePrompt,
  draw: styles.nodeDraw,
  save: styles.nodeSave,
};

const nodeToneClasses: Record<WorkflowNode['tone'], string> = {
  model: styles.toneModel,
  support: styles.toneSupport,
  canvas: styles.toneCanvas,
  text: styles.toneText,
  core: styles.toneCore,
  output: styles.toneOutput,
};

const nightIslands: PixelIsland[] = [
  {
    x: 71,
    y: 24,
    opacity: 0.58,
    rotation: -8,
    cells: ['....o....', '...###...', '..#####..', '.######..', '.###@##..', '..######.', '...####..', '....##...'],
  },
  {
    x: 78,
    y: 73,
    opacity: 0.38,
    rotation: 9,
    cells: ['.....', '..o..', '.###.', '#####', '.###.', '..#..'],
  },
  {
    x: 57,
    y: 82,
    opacity: 0.26,
    rotation: -4,
    cells: ['..s....', '.###...', '#####..', '.####..', '..##s..'],
  },
];

const dayIslands: PixelIsland[] = [
  {
    x: 22,
    y: 26,
    opacity: 0.34,
    rotation: -7,
    cells: ['....', '.##.', '####', '.###', '..#.', '..s.'],
  },
  {
    x: 76,
    y: 76,
    opacity: 0.28,
    rotation: 10,
    cells: ['..s...', '.###..', '#####.', '..###.', '...#..'],
  },
  {
    x: 48,
    y: 18,
    opacity: 0.2,
    rotation: 3,
    cells: ['..', '.#', '##', '.s'],
  },
];

function IslandLayer({islands, mode}: {islands: PixelIsland[]; mode: 'night' | 'day'}): ReactNode {
  return (
    <div className={mode === 'night' ? styles.nightIslandLayer : styles.dayIslandLayer}>
      {islands.map((island, islandIndex) => {
        const columnCount = Math.max(...island.cells.map((row) => row.length));
        return (
          <span
            className={styles.pixelIsland}
            key={`${mode}-${island.x}-${island.y}-${islandIndex}`}
            style={{
              left: `${island.x}%`,
              top: `${island.y}%`,
              opacity: island.opacity,
              transform: `translate(-50%, -50%) rotate(${island.rotation}deg)`,
              gridTemplateColumns: `repeat(${columnCount}, 0.58rem)`,
              gridTemplateRows: `repeat(${island.cells.length}, 0.58rem)`,
            } as CSSProperties}
          >
            {island.cells.flatMap((row, rowIndex) =>
              [...row].map((cell, columnIndex) =>
                cell === '.' ? null : (
                  <i
                    className={`${styles.pixelCell} ${cell === 'o' ? styles.pixelHollow : ''} ${cell === 's' ? styles.pixelSoft : ''} ${cell === '@' ? styles.pixelAccent : ''}`}
                    key={`${rowIndex}-${columnIndex}`}
                    style={{gridColumnStart: columnIndex + 1, gridRowStart: rowIndex + 1}}
                  />
                ),
              ),
            )}
          </span>
        );
      })}
    </div>
  );
}

function WorkflowBoard(): ReactNode {
  return (
    <div className={styles.workflowBoard}>
      <div className={styles.workflowNightArt} aria-hidden="true">
        <svg viewBox="0 0 1200 520" preserveAspectRatio="none">
          <g>
            <circle cx="-150" cy="270" r="190" />
            <circle cx="-150" cy="270" r="350" />
            <circle cx="-150" cy="270" r="560" />
            <line x1="-150" y1="270" x2="1030" y2="20" />
            <line x1="-150" y1="270" x2="1120" y2="130" />
            <line x1="-150" y1="270" x2="1190" y2="270" />
            <line x1="-150" y1="270" x2="1120" y2="410" />
            <line x1="-150" y1="270" x2="1030" y2="500" />
          </g>
        </svg>
        <IslandLayer islands={nightIslands} mode="night" />
      </div>
      <div className={styles.workflowDayArt} aria-hidden="true">
        <span className={styles.dayWorkflowPlane} />
        <span className={styles.dayWorkflowGrid} />
        <span className={`${styles.dayWorkflowRule} ${styles.dayWorkflowRuleOne}`} />
        <span className={`${styles.dayWorkflowRule} ${styles.dayWorkflowRuleTwo}`} />
        <IslandLayer islands={dayIslands} mode="day" />
      </div>
      <div className={styles.workflowEdgeCopy} aria-hidden="true">
        <span className={styles.edgeCopyInput}>TEXT<br />CONDITIONING</span>
        <span className={styles.edgeCopyOutput}>IMAGE<br />RESULT</span>
      </div>
      <div className={styles.workflowGraph} role="list" aria-label="三路输入汇合到图形绘制，再输出图片">
        {workflowNodes.map((node) => (
          <div
            className={`${styles.workflowNode} ${nodePositionClasses[node.key]} ${nodeToneClasses[node.tone]}`}
            key={node.key}
            role="listitem"
          >
            <span className={styles.workflowNodeIndex}>{node.index}</span>
            <span className={styles.workflowNodeTitle}>{node.title}</span>
            <span className={styles.workflowNodeDetail}>{node.detail}</span>
          </div>
        ))}
        <svg className={styles.workflowConnections} viewBox="0 0 1000 320" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <marker id="workflow-arrow-desktop" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8" />
            </marker>
          </defs>
          <g>
            <path d="M210 52 H286" />
            <path d="M454 52 H530 V160 H610" />
            <path d="M210 160 H610" />
            <path d="M210 268 H286" />
            <path d="M454 268 H530 V160 H610" />
            <path d="M795 160 H870" />
          </g>
        </svg>
        <svg className={styles.workflowConnectionsMobile} viewBox="0 0 1000 560" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <marker id="workflow-arrow-mobile-v2" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8" />
            </marker>
          </defs>
          <g>
            <path d="M420 46 H580" />
            <path d="M790 88 V138" />
            <path d="M420 190 H580" />
            <path d="M420 328 H580" />
            <path d="M790 330 V280" />
            <path d="M790 365 V490" />
          </g>
        </svg>
      </div>
      <div className={styles.workflowEdgeLabels}>
        <span className={styles.edgeLabelInput}><strong>文本条件</strong><small>提示词经过编码后进入绘制</small></span>
        <span className={styles.edgeLabelLine} aria-hidden="true" />
        <span className={styles.edgeLabelOutput}><strong>图像结果</strong><small>采样完成后保存输出</small></span>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <section className={styles.workflowSection} aria-labelledby="workflow-title">
          <div className={styles.sectionRail} aria-hidden="true">
            <span>01</span>
            <i />
            <span>FLOW</span>
          </div>
          <div className={styles.workflowHeading}>
            <div>
              <p className={styles.sectionKicker}>工作流 / 图像生成流程</p>
              <Heading as="h2" id="workflow-title">从输入到图像输出</Heading>
            </div>
            <p className={styles.workflowMeta}>三路输入 · 一个绘制核心 · 一个输出</p>
          </div>
          <p className={styles.workflowLead}>
            主模型、画布和文本条件分别准备，统一交给采样器完成图形绘制。
          </p>
          <WorkflowBoard />
        </section>

        <section className={styles.learningSection} aria-labelledby="learning-title">
          <div className={styles.learningHeader}>
            <div className={styles.learningHeaderMark} aria-hidden="true">02</div>
            <div>
              <p className={styles.sectionKicker}>内容导航 / 学习路径</p>
              <Heading as="h2" id="learning-title">
                <span>按顺序学习</span>
                <span>ComfyUI 与 Anima</span>
              </Heading>
            </div>
            <p className={styles.learningLead}>从环境配置开始，逐步掌握节点连接、模型参数和实践方法。</p>
          </div>

          <div className={styles.learningLayout}>
            <div className={styles.learningIntro}>
              <span className={styles.learningIntroIndex}>ROUTE / 03</span>
              <p>三条入口对应文档、原理和实践记录。每一项都提供可直接执行的下一步。</p>
              <div className={styles.learningLegend}>
                <span><i className={styles.legendBlue} />必修内容</span>
                <span><i className={styles.legendRed} />实验内容</span>
              </div>
            </div>
            <nav className={styles.learningRoutes} aria-label="学习路径">
              {sectionItems.map((item) => (
                <Link className={styles.learningRoute} key={item.index} to={item.to}>
                  <span className={styles.routeIndex}>{item.index}</span>
                  <span className={styles.routeSignal} aria-hidden="true" />
                  <span className={styles.routeCopy}>
                    <span className={styles.routeMeta}>{item.meta}</span>
                    <strong>{item.title}</strong>
                    <span>{item.description}</span>
                  </span>
                  <span className={styles.routeAction}><span>{item.action}</span><span aria-hidden="true">↗</span></span>
                </Link>
              ))}
            </nav>
          </div>

          <div className={styles.scopeRail}>
            <span className={styles.scopeTitle}>教程范围</span>
            <ol className={styles.scopeList}>
              {scopeItems.map((item) => (
                <li key={item.index}>
                  <span>{item.index}</span>
                  <strong>{item.title}</strong>
                  <small>{item.detail}</small>
                </li>
              ))}
            </ol>
          </div>

          <div className={styles.sectionFootnote}>
            <span>CUI-ANIMA / 内容索引</span>
            <span>持续更新</span>
          </div>
        </section>
      </div>
    </section>
  );
}
