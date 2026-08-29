import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import {useDocsData} from '@docusaurus/plugin-content-docs/client';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import HomepageFeatures from '@site/src/components/HomepageFeatures';

import styles from './index.module.css';

const contributorCount = 1;
const thirdPartyToolCount = 0;

const heroRadialRays = [-66, -55, -44, -33, -22, -11, 0, 11, 22, 33, 44, 55, 66].map(
  (angle, index) => {
    const radians = angle * Math.PI / 180;
    return {
      x: 500 + Math.cos(radians) * 720,
      y: 500 + Math.sin(radians) * 720,
      opacity: 0.26 + (6 - Math.abs(index - 6)) * 0.018,
    };
  },
);

function HomepageHeader(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  const docsData = useDocsData(undefined);
  const latestVersion = docsData.versions.find((version) => version.isLast) ?? docsData.versions[0];
  const tutorialCount = latestVersion?.docs.filter((doc) => !doc.unlisted).length ?? 0;

  return (
    <header className={styles.heroBanner}>
      <div className={styles.heroBackground} aria-hidden="true">
        <div className={styles.heroAtmosphere}>
          <span className={styles.atmosphereDisc} />
          <span className={styles.atmosphereOrbit} />
          <span className={styles.atmosphereSlash} />
          <span className={styles.atmosphereBlock} />
          <span className={styles.atmosphereFrame} />
          <span className={styles.atmosphereTicks}>
            <svg className={styles.atmosphereRadialGrid} viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid meet">
              <g aria-hidden="true">
                {heroRadialRays.map((ray, index) => (
                  <line
                    key={index}
                    x1="500"
                    y1="500"
                    x2={ray.x}
                    y2={ray.y}
                    opacity={ray.opacity}
                  />
                ))}
              </g>
            </svg>
          </span>
          <span className={styles.atmosphereLabel}>工作流 / 01</span>
        </div>
        <div className={styles.heroGrid} />
      </div>
      <div className={styles.heroContent}>
        <div className="container">
          <div className={styles.heroLayout}>
          <div className={styles.heroCopy}>
            <p className={styles.kicker}>CUI-ANIMA / 教程</p>
            <Heading as="h1" aria-label={siteConfig.title}>
              <span>Cui-Anima</span><wbr /><span>集合教程</span>
            </Heading>
            <p className={styles.heroTitle}>
              <span>ComfyUI 与 Anima</span>{' '}<span>的使用指南</span>
            </p>
            <p className={styles.heroSubtitle}>
              涵盖本地安装、节点连接、模型配置和图像生成，提供可直接复现的步骤与示例。
            </p>
            <div className={styles.actions}>
              <Link className={styles.primaryAction} to="/docs/intro">
                <span>开始阅读</span>
                <span aria-hidden="true">→</span>
              </Link>
              <button className={styles.secondaryAction} type="button" disabled title="暂未开放">
                原理篇
              </button>
            </div>
          </div>

          <aside className={styles.signalPanel} aria-label="文档目录">
            <span className={styles.panelRibbon} aria-hidden="true">目录 / 01</span>
            <div className={styles.panelTopline}>
              <span>内容目录</span>
              <span>01 / 03</span>
            </div>
            <div className={styles.panelDiagram} aria-hidden="true">
              <span className={styles.panelDiagramDisc} />
              <span className={styles.panelDiagramOrbit} />
              <span className={styles.panelDiagramOrbitSecondary} />
              <span className={styles.panelDiagramCore}>A</span>
              <span className={styles.panelDiagramAxis} />
              <span className={styles.panelDiagramCaption}>模型 / 2B</span>
            </div>
            <p className={styles.panelTitle}>ComfyUI / Anima</p>
            <ol className={styles.indexList}>
              <li className={styles.indexItemActive}>
                <span>01</span>
                <span>基础教程</span>
              </li>
              <li>
                <span>02</span>
                <span>原理讲解</span>
              </li>
              <li>
                <span>03</span>
                <span>第三方工具推荐</span>
              </li>
            </ol>
            <div className={styles.panelStats} aria-label="项目统计">
              <span><strong>{tutorialCount}</strong><small>教程篇数</small></span>
              <span><strong>{contributorCount}</strong><small>贡献人数</small></span>
              <span><strong>{thirdPartyToolCount}</strong><small>第三方工具</small></span>
            </div>
            <div className={styles.panelFooter}>
              <span>状态</span>
              <strong>持续更新</strong>
            </div>
          </aside>
          </div>

          <div className={styles.signalBar} aria-label="内容分类">
            <span className={styles.signalBarMarker} aria-hidden="true" />
            <span>文档</span>
            <span>原理</span>
            <span>实践</span>
            <span className={styles.signalBarLine} aria-hidden="true" />
            <span className={styles.signalBarMeta}>持续更新 / 2026</span>
          </div>
        </div>
      </div>
    </header>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();

  return (
    <Layout
      title={siteConfig.title}
      description={siteConfig.tagline}>
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
