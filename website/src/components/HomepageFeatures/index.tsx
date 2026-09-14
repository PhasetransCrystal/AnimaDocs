import {type ReactNode} from 'react';
import Link from '@docusaurus/Link';

import styles from './styles.module.css';
import WorkflowArt from './WorkflowArt';

type SectionItem = {
  index: string;
  label: string;
  title: string;
  description: string;
  to?: string;
  action: string;
  meta: string;
};

type WorkflowNode = {
  index: string;
  key: string;
  title: string;
  detail: string;
  tone: 'input' | 'resource' | 'core' | 'process' | 'output';
};


const sectionItems: SectionItem[] = [
  {
    index: '01',
    label: '部署',
    title: '基础配置使用',
    description: '安装 ComfyUI 与 Anima，确认显存、模型文件和运行环境。',
    to: '/docs/install',
    action: '打开教程',
    meta: '基础环境 / 01',
  },
  {
    index: '02',
    label: '节点',
    title: '画风效果调整与提示词编写',
    description: '相关教程尚未完成，内容发布后再开放入口。',
    action: '暂未开放',
    meta: '节点逻辑 / 02',
  },
  {
    index: '03',
    label: '调试',
    title: '第三方节点或工具的灵活使用',
    description: '相关教程尚未完成，内容发布后再开放入口。',
    action: '暂未开放',
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
  {index: '01', key: 'model', title: '加载主模型', detail: 'MODEL', tone: 'resource'},
  {index: '02', key: 'attachments', title: '应用附件', detail: 'LoRA / ControlNet 等', tone: 'input'},
  {index: '03', key: 'canvas', title: '构造画布', detail: 'Latent / 空白或已有图像', tone: 'input'},
  {index: '04', key: 'encoder', title: '加载文本编码器', detail: 'TEXT ENCODER', tone: 'resource'},
  {index: '05', key: 'prompt', title: '编码提示词', detail: 'CONDITIONING', tone: 'input'},
  {index: '06', key: 'draw', title: '图形绘制', detail: '采样器 / 出图核心', tone: 'core'},
  {index: '07', key: 'vae', title: '加载 VAE', detail: 'VAE', tone: 'resource'},
  {index: '08', key: 'image', title: '图像编码', detail: 'VAE / 图像转换', tone: 'process'},
  {index: '09', key: 'save', title: '图片保存', detail: 'OUTPUT', tone: 'output'},
];

const nodePositionClasses: Record<string, string> = {
  model: styles.nodeModel,
  attachments: styles.nodeAttachments,
  canvas: styles.nodeCanvas,
  encoder: styles.nodeEncoder,
  prompt: styles.nodePrompt,
  draw: styles.nodeDraw,
  vae: styles.nodeVae,
  image: styles.nodeImage,
  save: styles.nodeSave,
};

const nodeToneClasses: Record<WorkflowNode['tone'], string> = {
  input: styles.toneInput,
  resource: styles.toneResource,
  core: styles.toneCore,
  process: styles.toneProcess,
  output: styles.toneOutput,
};

const nodeRoleLabels: Record<WorkflowNode['tone'], string> = {
  input: '输入准备',
  resource: '资源加载',
  core: '绘制核心',
  process: '图像转换',
  output: '结果输出',
};


function WorkflowBoard(): ReactNode {
  return (
    <div className={styles.workflowBoard}>
      <WorkflowArt />
      <div className={styles.workflowEdgeCopy} aria-hidden="true">
        <span className={styles.edgeCopyInput}>TEXT<br />CONDITIONING</span>
        <span className={styles.edgeCopyOutput}>IMAGE<br />RESULT</span>
      </div>
      <div className={styles.workflowGraph} role="list" aria-label="三路输入汇合到图形绘制，结合 VAE 完成图像编码后保存图片">
        {workflowNodes.map((node) => (
          <div
            className={`${styles.workflowNode} ${nodePositionClasses[node.key]} ${nodeToneClasses[node.tone]}`}
            key={node.key}
            data-workflow-node={node.key}
            role="listitem"
          >
            <span className={styles.workflowNodeMeta}>
              <span className={styles.workflowNodeIndex}>{node.index}</span>
              <span className={styles.workflowNodeRole}>{nodeRoleLabels[node.tone]}</span>
            </span>
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
            <path data-from="model" data-to="attachments" d="M180 44.8 H210" />
            <path data-from="attachments" data-to="draw" d="M390 44.8 H405 V160 H420" />
            <path data-from="canvas" data-to="draw" d="M180 160 H420" />
            <path data-from="encoder" data-to="prompt" d="M180 275.2 H210" />
            <path data-from="prompt" data-to="draw" d="M390 275.2 H405 V160 H420" />
            <path data-from="draw" data-to="image" d="M600 160 H630" />
            <path data-from="vae" data-to="image" d="M720 230.4 V204.8" />
            <path data-from="image" data-to="save" d="M810 160 H840" />
          </g>
        </svg>
        <svg className={styles.workflowConnectionsMobile} viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <marker id="workflow-arrow-mobile-v2" markerWidth="10" markerHeight="10" markerUnits="userSpaceOnUse" refX="8" refY="5" orient="auto">
              <path d="M0,0 L10,5 L0,10 Z" />
            </marker>
          </defs>
          <g>
            <path data-from="model" data-to="attachments" d="M470 65 H530" />
            <path data-from="attachments" data-to="draw" d="M1000 65 H1020 V500 H500 V522" />
            <path data-from="canvas" data-to="draw" d="M470 239 H500 V522" />
            <path data-from="encoder" data-to="prompt" d="M470 413 H530" />
            <path data-from="prompt" data-to="draw" d="M1000 413 H1020 V500 H500 V522" />
            <path data-from="draw" data-to="image" d="M500 652 V696" />
            <path data-from="vae" data-to="image" d="M235 870 V826" />
            <path data-from="image" data-to="save" d="M765 826 V870" />
            <g className={styles.workflowPorts}>
              <circle cx="470" cy="65" r="5" />
              <circle cx="530" cy="65" r="5" />
              <circle cx="1000" cy="65" r="5" />
              <circle cx="470" cy="239" r="5" />
              <circle cx="470" cy="413" r="5" />
              <circle cx="530" cy="413" r="5" />
              <circle cx="1000" cy="413" r="5" />
              <circle cx="500" cy="522" r="5" />
              <circle cx="500" cy="652" r="5" />
              <circle cx="500" cy="696" r="5" />
              <circle cx="235" cy="870" r="5" />
              <circle cx="235" cy="826" r="5" />
              <circle cx="765" cy="826" r="5" />
              <circle cx="765" cy="870" r="5" />
            </g>
          </g>
        </svg>
      </div>
      <div className={styles.workflowEdgeLabels}>
        <span className={styles.edgeLabelInput}><strong>文本条件</strong><small>提示词经过编码后进入绘制</small></span>
        <span className={styles.edgeLabelLine} aria-hidden="true" />
        <span className={styles.edgeLabelOutput}><strong>图像结果</strong><small>经 VAE 转换后保存输出</small></span>
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
              <h2 id="workflow-title">从输入到图像输出</h2>
            </div>
            <p className={styles.workflowMeta}>三路输入 · 一个绘制核心 · 一个输出</p>
          </div>
          <p className={styles.workflowLead}>
            主模型、画布和文本条件分别准备，统一交给采样器完成图形绘制。
          </p>
          <WorkflowBoard />
        </section>

        <section className={styles.learningSection} aria-labelledby="learning-title">
          <div className={`${styles.sectionRail} ${styles.sectionRailLearning}`} aria-hidden="true">
            <span>02</span>
            <i />
            <span>PATH</span>
          </div>
          <div className={styles.learningHeader}>
            <div>
              <p className={styles.sectionKicker}>内容导航 / 学习路径</p>
              <h2 id="learning-title">
                <span>按顺序学习</span>
                <span>ComfyUI 与 Anima</span>
              </h2>
            </div>
            <p className={styles.learningLead}>从环境配置开始，逐步掌握节点连接、模型参数和实践方法。</p>
          </div>

          <div className={styles.learningLayout}>
            <div className={styles.learningIntro}>
              <span className={styles.learningIntroIndex}>学习状态</span>
              <p>先完成本地安装并验证首张图，再进入节点、画风与扩展工具。</p>
              <div className={styles.learningLegend}>
                <span><i className={styles.legendBlue} />已开放教程</span>
                <span><i className={styles.legendRed} />计划中的后续章节</span>
              </div>
            </div>
            <nav className={styles.learningRoutes} aria-label="学习路径">
              {sectionItems.map((item) => {
                const routeContent = (
                  <>
                    <span className={styles.routeIndex}>{item.index}</span>
                    <span className={styles.routeSignal} aria-hidden="true" />
                    <span className={styles.routeCopy}>
                      <span className={styles.routeMeta}>{item.meta}</span>
                      <strong>{item.title}</strong>
                      <span>{item.description}</span>
                    </span>
                    <span className={styles.routeAction}>
                      <span>{item.action}</span>
                      <span aria-hidden="true">{item.to ? '↗' : '—'}</span>
                    </span>
                  </>
                );

                return item.to ? (
                  <Link className={styles.learningRoute} key={item.index} to={item.to}>
                    {routeContent}
                  </Link>
                ) : (
                  <div className={`${styles.learningRoute} ${styles.learningRouteDisabled}`} key={item.index} aria-disabled="true">
                    {routeContent}
                  </div>
                );
              })}
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
