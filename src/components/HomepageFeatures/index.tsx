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
};

type WorkflowNode = {
  index: string;
  title: string;
  detail: string;
  tone: 'blue' | 'red' | 'gold' | 'ink';
};

type NoiseIsland = {
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
    description: '完成 ComfyUI 与 Anima 的安装，确认显存、模型文件和运行环境。',
    to: '/docs/intro',
    action: '开始部署',
  },
  {
    index: '02',
    label: '节点',
    title: '原版节点与连接',
    description: '按输入、处理和输出理解常用节点，搭建可复用的基础工作流。',
    to: '/docs/theory/anima',
    action: '查看节点原理',
  },
  {
    index: '03',
    label: '调试',
    title: '画风测试与扩展',
    description: '记录采样参数、第三方节点和本地训练的测试结果。',
    to: '/blog',
    action: '进入实践记录',
  },
];

const workflowNodes: WorkflowNode[] = [
  {index: '01', title: '加载主模型', detail: 'MODEL', tone: 'blue'},
  {index: '02', title: '应用附件', detail: 'LoRA / ControlNet 等', tone: 'red'},
  {index: '03', title: '构造画布', detail: 'Latent / 空白或已有图像', tone: 'gold'},
  {index: '04', title: '加载文本编码器', detail: 'TEXT ENCODER', tone: 'gold'},
  {index: '05', title: '编码提示词', detail: 'CONDITIONING', tone: 'red'},
  {index: '06', title: '图形绘制', detail: '采样器 / 出图核心', tone: 'ink'},
  {index: '07', title: '图片保存', detail: 'OUTPUT', tone: 'blue'},
];

// Stable, neighbourhood-sampled islands keep the texture reproducible while
// preserving the irregular silhouette of a small pixel cluster.
const workflowIslands: NoiseIsland[] = [
  {
    x: 76,
    y: 42,
    opacity: 0.62,
    rotation: -8,
    cells: [
      '......s....',
      '....o##....',
      '...#####...',
      '..######s..',
      '..###@##...',
      '.#######...',
      '..######...',
      '...####....',
      '....##.s...',
    ],
  },
  {
    x: 63,
    y: 66,
    opacity: 0.36,
    rotation: 12,
    cells: [
      '....s....',
      '...o##...',
      '..#####..',
      '.######..',
      '..##@##..',
      '...####..',
      '....#s...',
    ],
  },
  {
    x: 86,
    y: 24,
    opacity: 0.34,
    rotation: -18,
    cells: [
      '.....s...',
      '....#....',
      '...o###..',
      '..#####..',
      '...###...',
      '....##...',
    ],
  },
  {
    x: 57,
    y: 51,
    opacity: 0.28,
    rotation: 5,
    cells: [
      '....s....',
      '...##....',
      '..####...',
      '.##o##...',
      '..###....',
    ],
  },
];

const polarRings = [150, 285, 420, 555, 690];
const polarRayPoints = Array.from({length: 7}, (_, index) => {
  const angle = (156 + index * 6) * Math.PI / 180;
  return {
    x: 1120 + Math.cos(angle) * 980,
    y: 180 + Math.sin(angle) * 980,
  };
});

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className={styles.workflowBand}>
          <span className={styles.workflowStamp} aria-hidden="true">流程 / 05</span>
          <div className={styles.workflowHeader}>
            <span className={styles.workflowKicker}>工作流 / 图像生成流程</span>
            <span className={styles.workflowMeta}>3 路输入 · 1 个核心 · 1 个输出</span>
          </div>
          <div className={styles.workflowDiagram} aria-label="ComfyUI 图像生成基础工作流">
            <span className={styles.workflowPolarGrid} aria-hidden="true">
              <svg className={styles.workflowPolarGridSvg} viewBox="0 0 1000 360" preserveAspectRatio="none">
                <g>
                  {polarRings.map((radius) => (
                    <circle key={radius} cx="1120" cy="180" r={radius} />
                  ))}
                  {polarRayPoints.map((point, index) => (
                    <line key={index} x1="1120" y1="180" x2={point.x} y2={point.y} />
                  ))}
                </g>
              </svg>
            </span>
            <span className={styles.workflowNoiseField} aria-hidden="true">
              {workflowIslands.map((island, islandIndex) => (
                <span
                  className={styles.workflowNoiseIsland}
                  key={`${island.x}-${island.y}-${islandIndex}`}
                  style={{
                    left: `${island.x}%`,
                    top: `${island.y}%`,
                    opacity: island.opacity,
                    transform: `translate(-50%, -50%) rotate(${island.rotation}deg)`,
                    gridTemplateColumns: `repeat(${Math.max(...island.cells.map((row) => row.length))}, var(--island-cell))`,
                    gridTemplateRows: `repeat(${island.cells.length}, var(--island-cell))`,
                  } as CSSProperties}
                >
                  {island.cells.flatMap((row, rowIndex) =>
                    [...row].map((cell, columnIndex) =>
                      cell === '.' ? null : (
                        <i
                          className={`${styles.workflowNoiseCell} ${cell === 'o' ? styles.noiseHollow : styles.noiseSolid} ${cell === '@' ? styles.noiseMarker : ''}`}
                          key={`${rowIndex}-${columnIndex}`}
                          style={{
                            gridColumnStart: columnIndex + 1,
                            gridRowStart: rowIndex + 1,
                            opacity: cell === 's' ? 0.45 : 1,
                          }}
                        />
                      ),
                    ),
                  )}
                </span>
              ))}
            </span>
            <span className={styles.workflowDecorativeCopy} aria-hidden="true">
              <span className={styles.decorativeInput}>TEXT<br />CONDITIONING</span>
              <span className={styles.decorativeResult}>IMAGE<br />RESULT</span>
            </span>
            <div className={styles.workflowGraph} role="list" aria-label="三路输入汇合到图形绘制">
              <div className={`${styles.workflowNode} ${styles[`tone${workflowNodes[0].tone}`]} ${styles.nodeModel}`} role="listitem">
                <span className={styles.workflowNodeIndex}>{workflowNodes[0].index}</span>
                <span className={styles.workflowNodeTitle}>{workflowNodes[0].title}</span>
                <span className={styles.workflowNodeDetail}>{workflowNodes[0].detail}</span>
              </div>
              <div className={`${styles.workflowNode} ${styles[`tone${workflowNodes[1].tone}`]} ${styles.nodeAttachments}`} role="listitem">
                <span className={styles.workflowNodeIndex}>{workflowNodes[1].index}</span>
                <span className={styles.workflowNodeTitle}>{workflowNodes[1].title}</span>
                <span className={styles.workflowNodeDetail}>{workflowNodes[1].detail}</span>
              </div>
              <div className={`${styles.workflowNode} ${styles[`tone${workflowNodes[2].tone}`]} ${styles.nodeCanvas}`} role="listitem">
                <span className={styles.workflowNodeIndex}>{workflowNodes[2].index}</span>
                <span className={styles.workflowNodeTitle}>{workflowNodes[2].title}</span>
                <span className={styles.workflowNodeDetail}>{workflowNodes[2].detail}</span>
              </div>
              <div className={`${styles.workflowNode} ${styles[`tone${workflowNodes[3].tone}`]} ${styles.nodeEncoder}`} role="listitem">
                <span className={styles.workflowNodeIndex}>{workflowNodes[3].index}</span>
                <span className={styles.workflowNodeTitle}>{workflowNodes[3].title}</span>
                <span className={styles.workflowNodeDetail}>{workflowNodes[3].detail}</span>
              </div>
              <div className={`${styles.workflowNode} ${styles[`tone${workflowNodes[4].tone}`]} ${styles.nodePrompt}`} role="listitem">
                <span className={styles.workflowNodeIndex}>{workflowNodes[4].index}</span>
                <span className={styles.workflowNodeTitle}>{workflowNodes[4].title}</span>
                <span className={styles.workflowNodeDetail}>{workflowNodes[4].detail}</span>
              </div>
              <div className={`${styles.workflowNode} ${styles[`tone${workflowNodes[5].tone}`]} ${styles.nodeDraw}`} role="listitem">
                <span className={styles.workflowNodeIndex}>{workflowNodes[5].index}</span>
                <span className={styles.workflowNodeTitle}>{workflowNodes[5].title}</span>
                <span className={styles.workflowNodeDetail}>{workflowNodes[5].detail}</span>
              </div>
              <div className={`${styles.workflowNode} ${styles[`tone${workflowNodes[6].tone}`]} ${styles.nodeSave}`} role="listitem">
                <span className={styles.workflowNodeIndex}>{workflowNodes[6].index}</span>
                <span className={styles.workflowNodeTitle}>{workflowNodes[6].title}</span>
                <span className={styles.workflowNodeDetail}>{workflowNodes[6].detail}</span>
              </div>
              <svg className={styles.workflowConnections} viewBox="0 0 1000 320" preserveAspectRatio="none" aria-hidden="true">
                <defs>
                  <marker id="workflow-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                    <path d="M0,0 L8,4 L0,8" />
                  </marker>
                </defs>
                <g>
                  <path d="M220 58 H245" />
                  <path d="M445 58 H510 V164 H575" />
                  <path d="M220 164 H575" />
                  <path d="M220 270 H245" />
                  <path d="M445 270 H510 V164 H575" />
                  <path d="M785 164 H810" />
                </g>
              </svg>
              <svg className={styles.workflowConnectionsMobile} viewBox="0 0 1000 500" preserveAspectRatio="none" aria-hidden="true">
                <defs>
                  <marker id="workflow-arrow-mobile" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                    <path d="M0,0 L8,4 L0,8" />
                  </marker>
                </defs>
                <g>
                  <path d="M430 55 H570" />
                  <path d="M785 100 V145" />
                  <path d="M430 190 H570" />
                  <path d="M430 325 H570" />
                  <path d="M785 325 V250" />
                  <path d="M785 235 V415" />
                </g>
              </svg>
            </div>
          </div>
          <div className={styles.workflowFooter}>
            <span className={`${styles.workflowEdgeLabel} ${styles.workflowTextInput}`}>
              <span className={styles.workflowEdgeDecor} aria-hidden="true">TEXT CONDITIONING</span>
              <span>文本条件</span>
            </span>
            <span className={styles.workflowFooterLine} aria-hidden="true" />
            <span className={`${styles.workflowEdgeLabel} ${styles.workflowImageOutput}`}>
              <span className={styles.workflowEdgeDecor} aria-hidden="true">IMAGE RESULT</span>
              <span>图像结果</span>
            </span>
          </div>
        </div>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionHeaderMark} aria-hidden="true">02</span>
          <p className={styles.sectionKicker}>内容导航 / 00</p>
          <Heading as="h2">
            <span className={styles.headingLine}>按顺序学习</span>
            <span className={styles.headingLine}>ComfyUI 与 Anima</span>
          </Heading>
          <p>
            从基础概念和安装配置开始，逐步学习节点工作流、模型参数与实践方法。
          </p>
        </div>

        <div className={styles.sectionList}>
          {sectionItems.map((item) => (
            <Link className={styles.sectionItem} key={item.index} to={item.to}>
              <span className={styles.sectionIndex}>{item.index}</span>
              <span className={styles.sectionSignal} aria-hidden="true" />
              <span className={styles.sectionBody}>
                <span className={styles.sectionLabel}>{item.label}</span>
                <span className={styles.sectionTitle}>{item.title}</span>
                <span className={styles.sectionDescription}>{item.description}</span>
              </span>
              <span className={styles.sectionAction}>
                <span>{item.action}</span>
                <span aria-hidden="true">→</span>
              </span>
            </Link>
          ))}
        </div>

        <div className={styles.sectionFootnote}>
          <span>CUI-ANIMA / 内容索引</span>
          <span>持续更新</span>
        </div>
      </div>
    </section>
  );
}
