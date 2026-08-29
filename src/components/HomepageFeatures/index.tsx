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
    label: '文档',
    title: '基础概念与安装',
    description: '了解 ComfyUI、Anima 及本地运行所需的基础环境。',
    to: '/docs/intro',
    action: '阅读文档',
  },
  {
    index: '02',
    label: '原理',
    title: '模型与参数',
    description: '说明模型结构、提示词和生成参数如何影响结果。',
    to: '/docs/theory/anima',
    action: '查看 Anima 原理',
  },
  {
    index: '03',
    label: '实践',
    title: '工作流与记录',
    description: '记录测试过程、参数调整和可复用的工作流。',
    to: '/blog',
    action: '查看实践记录',
  },
];

const workflowNodes: WorkflowNode[] = [
  {index: '01', title: '加载模型', detail: '模型', tone: 'blue'},
  {index: '02', title: '编码文本', detail: '文本编码', tone: 'gold'},
  {index: '03', title: '配置提示词', detail: '提示词', tone: 'red'},
  {index: '04', title: '图片绘制', detail: '采样', tone: 'ink'},
  {index: '05', title: '图片保存', detail: '输出', tone: 'blue'},
];

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className={styles.workflowBand}>
          <span className={styles.workflowStamp} aria-hidden="true">流程 / 05</span>
          <div className={styles.workflowHeader}>
            <span className={styles.workflowKicker}>工作流 / 图像生成流程</span>
            <span className={styles.workflowMeta}>5 个核心节点</span>
          </div>
          <div className={styles.workflowTrack}>
            {workflowNodes.map((node, index) => (
              <Fragment key={node.index}>
                <div className={`${styles.workflowNode} ${styles[`tone${node.tone}`]}`}>
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
          <div className={styles.workflowFooter}>
            <span>文本条件</span>
            <span className={styles.workflowFooterLine} aria-hidden="true" />
            <span>图像结果</span>
          </div>
        </div>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionHeaderMark} aria-hidden="true">02</span>
          <p className={styles.sectionKicker}>内容导航 / 00</p>
          <Heading as="h2">按顺序学习 ComfyUI 与 Anima</Heading>
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
