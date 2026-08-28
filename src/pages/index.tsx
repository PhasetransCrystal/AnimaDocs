import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import HomepageFeatures from '@site/src/components/HomepageFeatures';

import styles from './index.module.css';

function HomepageHeader(): ReactNode {
  const {siteConfig} = useDocusaurusContext();

  return (
    <header className={styles.heroBanner}>
      <div className={styles.heroAtmosphere} aria-hidden="true">
        <span className={styles.atmosphereDisc} />
        <span className={styles.atmosphereOrbit} />
        <span className={styles.atmosphereSlash} />
        <span className={styles.atmosphereBlock} />
      </div>
      <div className={styles.heroGrid} aria-hidden="true" />
      <div className="container">
        <div className={styles.heroLayout}>
          <div className={styles.heroCopy}>
            <p className={styles.kicker}>ANIMADOCS / WORKFLOW FIELD NOTES</p>
            <Heading as="h1">{siteConfig.title}</Heading>
            <p className={styles.heroTitle}>把节点，连成可理解的图像工作流。</p>
            <p className={styles.heroSubtitle}>
              一份围绕 ComfyUI 与 Anima 的实践档案：从基础概念、节点关系到模型参数，
              让每一次出图都能被复盘、解释和复用。
            </p>
            <div className={styles.actions}>
              <Link className={styles.primaryAction} to="/docs/intro">
                <span>进入文档</span>
                <span aria-hidden="true">→</span>
              </Link>
              <Link className={styles.secondaryAction} to="/docs/theory/anima">
                查看理论篇
              </Link>
            </div>
          </div>

          <aside className={styles.signalPanel} aria-label="Documentation index">
            <div className={styles.panelTopline}>
              <span>NOW INDEXING</span>
              <span>01 / 03</span>
            </div>
            <div className={styles.panelDiagram} aria-hidden="true">
              <span className={styles.panelDiagramDisc} />
              <span className={styles.panelDiagramOrbit} />
              <span className={styles.panelDiagramOrbitSecondary} />
              <span className={styles.panelDiagramCore}>A</span>
              <span className={styles.panelDiagramAxis} />
              <span className={styles.panelDiagramCaption}>MODEL / 2B</span>
            </div>
            <p className={styles.panelTitle}>ANIMA / COMFYUI</p>
            <ol className={styles.indexList}>
              <li className={styles.indexItemActive}>
                <span>01</span>
                <span>基础概念与入口</span>
              </li>
              <li>
                <span>02</span>
                <span>理论与模型拆解</span>
              </li>
              <li>
                <span>03</span>
                <span>实验记录与更新</span>
              </li>
            </ol>
            <div className={styles.panelStats} aria-label="Current index status">
              <span><strong>02B</strong><small>MODEL</small></span>
              <span><strong>24</strong><small>NODES</small></span>
              <span><strong>OPEN</strong><small>STATE</small></span>
            </div>
            <div className={styles.panelFooter}>
              <span>STATUS</span>
              <strong>OPEN / READING</strong>
            </div>
          </aside>
        </div>

        <div className={styles.signalBar} aria-label="Site sections">
          <span className={styles.signalBarMarker} aria-hidden="true" />
          <span>DOCS</span>
          <span>THEORY</span>
          <span>NOTES</span>
          <span className={styles.signalBarLine} aria-hidden="true" />
          <span className={styles.signalBarMeta}>LOCAL KNOWLEDGE BASE / 2026</span>
        </div>
      </div>
    </header>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();

  return (
    <Layout
      title={`Field notes from ${siteConfig.title}`}
      description="ComfyUI and Anima workflow field notes">
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
