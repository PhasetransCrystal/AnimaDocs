import type {ReactNode} from 'react';
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

const sectionItems: SectionItem[] = [
  {
    index: '01',
    label: 'DOCUMENTS',
    title: '从节点开始',
    description: '先建立 ComfyUI 与 Anima 的共同语境，再进入可复用的工作流。',
    to: '/docs/intro',
    action: '打开序章',
  },
  {
    index: '02',
    label: 'THEORY',
    title: '理解模型为何这样工作',
    description: '把模型结构、提示词和生成结果放回同一张因果图里观察。',
    to: '/docs/theory/anima',
    action: '查看理论篇',
  },
  {
    index: '03',
    label: 'NOTES',
    title: '记录正在发生的实验',
    description: '博客用于保存参数、发现和仍在变化中的实践判断。',
    to: '/blog',
    action: '进入记录',
  },
];

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className={styles.sectionHeader}>
          <p className={styles.sectionKicker}>READING PATH / 00</p>
          <Heading as="h2">从工作流的骨架开始。</Heading>
          <p>
            这里不是模板说明页，而是一份持续整理中的知识底稿。沿着编号进入，按自己的节奏建立坐标。
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
          <span>ANIMADOCS / OPEN INDEX</span>
          <span>CONTENT FIRST / DECORATION SECOND</span>
        </div>
      </div>
    </section>
  );
}
