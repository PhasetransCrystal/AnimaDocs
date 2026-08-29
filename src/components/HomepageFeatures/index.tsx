import {Fragment, type ReactNode} from 'react';
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
  {index: '04', title: '图形绘制', detail: '采样器 / 出图核心', tone: 'ink'},
  {index: '05', title: '图片保存', detail: 'OUTPUT', tone: 'blue'},
];

const textWorkflowNodes: WorkflowNode[] = [
  {index: 'T1', title: '加载文本编码器', detail: 'TEXT ENCODER', tone: 'gold'},
  {index: 'T2', title: '编码提示词', detail: 'CONDITIONING', tone: 'red'},
];

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className={styles.workflowBand}>
          <span className={styles.workflowStamp} aria-hidden="true">流程 / 05</span>
          <div className={styles.workflowHeader}>
            <span className={styles.workflowKicker}>工作流 / 图像生成流程</span>
            <span className={styles.workflowMeta}>5 个主节点 + 2 个文本节点</span>
          </div>
          <div className={styles.workflowDiagram} aria-label="ComfyUI 图像生成基础工作流">
            <div className={styles.workflowTrack} role="list" aria-label="主图像路径">
              {workflowNodes.map((node, index) => (
                <Fragment key={node.index}>
                  <div className={`${styles.workflowNode} ${styles[`tone${node.tone}`]}`} role="listitem">
                    <span className={styles.workflowNodeIndex}>{node.index}</span>
                    <span className={styles.workflowNodeTitle}>{node.title}</span>
                    <span className={styles.workflowNodeDetail}>{node.detail}</span>
                  </div>
                  {index < workflowNodes.length - 1 ? (
                    <span className={styles.workflowConnector} aria-hidden="true" />
                  ) : null}
                </Fragment>
              ))}
            </div>
            <div className={styles.workflowBranch} role="list" aria-label="文本条件路径">
              {textWorkflowNodes.map((node, index) => (
                <Fragment key={node.index}>
                  <div className={`${styles.workflowNode} ${styles[`tone${node.tone}`]}`} role="listitem">
                    <span className={styles.workflowNodeIndex}>{node.index}</span>
                    <span className={styles.workflowNodeTitle}>{node.title}</span>
                    <span className={styles.workflowNodeDetail}>{node.detail}</span>
                  </div>
                  {index < textWorkflowNodes.length - 1 ? (
                    <span className={styles.workflowConnector} aria-hidden="true" />
                  ) : null}
                </Fragment>
              ))}
              <span className={styles.workflowBranchJoin} aria-hidden="true" />
            </div>
          </div>
          <div className={styles.workflowFooter}>
            <span className={styles.workflowEdgeLabel}>
              <span className={styles.workflowEdgeDecor} aria-hidden="true">TEXT CONDITIONING</span>
              <span>文本条件</span>
            </span>
            <span className={styles.workflowFooterLine} aria-hidden="true" />
            <span className={styles.workflowEdgeLabel}>
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
