import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import {useDocsData} from '@docusaurus/plugin-content-docs/client';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import VisualStudy from '@site/src/components/VisualStudy';

import styles from './index.module.css';

const contributorCount = 1;
const thirdPartyToolCount = 0;

function DirectoryPanel({tutorialCount}: {tutorialCount: number}): ReactNode {
  return (
    <aside className={styles.signalPanel} aria-label="文档目录">
      <div className={styles.panelHeader}>
        <span className={styles.panelEyebrow}>目录索引 / 01</span>
        <span className={styles.panelStatus}>LIVE</span>
      </div>
      <div className={styles.panelVisual} aria-hidden="true">
        <VisualStudy variant="specimen" />
        <span className={styles.panelVisualNote}>MODEL / 2B</span>
      </div>
      <div className={styles.panelBody}>
        <div className={styles.panelTitleRow}>
          <p className={styles.panelTitle}>ComfyUI / Anima</p>
          <span className={styles.panelPage}>01—03</span>
        </div>
        <ol className={styles.indexList}>
          <li className={styles.indexItemActive}>
            <span>01</span>
            <span>基础教程</span>
            <span aria-hidden="true">↗</span>
          </li>
          <li>
            <span>02</span>
            <span>原理讲解</span>
            <span aria-hidden="true">—</span>
          </li>
          <li>
            <span>03</span>
            <span>第三方工具</span>
            <span aria-hidden="true">—</span>
          </li>
        </ol>
        <div className={styles.panelStats} aria-label="项目统计">
          <span><strong>{tutorialCount}</strong><small>教程篇数</small></span>
          <span><strong>{contributorCount}</strong><small>贡献人数</small></span>
          <span><strong>{thirdPartyToolCount}</strong><small>工具收录</small></span>
        </div>
        <div className={styles.panelFooter}>
          <span>状态 / 文档维护</span>
          <strong>持续更新</strong>
        </div>
      </div>
    </aside>
  );
}

function HomepageHeader(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  const docsData = useDocsData(undefined);
  const latestVersion = docsData.versions.find((version) => version.isLast) ?? docsData.versions[0];
  const tutorialCount = latestVersion?.docs.filter((doc) => !doc.unlisted).length ?? 0;

  return (
    <header className={styles.heroBanner}>
      <div className={styles.heroArt} aria-hidden="true">
        <VisualStudy />
        <span className={styles.heroArtRule} />
      </div>

      <div className={styles.heroContent}>
        <div className="container">
          <div className={styles.heroTopline}>
            <span>ANIMA DOCUMENTATION SYSTEM</span>
            <span>REV. 2026 / 08</span>
          </div>
          <div className={styles.heroLayout}>
            <div className={styles.heroCopy}>
              <p className={styles.kicker}>CUI-ANIMA / 教程首页</p>
              <Heading as="h1" aria-label={siteConfig.title}>
                <span>Cui-Anima</span>
                <span>集合教程</span>
              </Heading>
              <p className={styles.heroTitle}>ComfyUI 与 Anima 的使用指南</p>
              <p className={styles.heroSubtitle}>
                从本地安装到图像生成，按可复现的步骤学习节点、模型与工作流配置。
              </p>
              <div className={styles.actions}>
                <Link className={styles.primaryAction} to="/docs/intro">
                  <span>开始阅读</span>
                  <span aria-hidden="true">↗</span>
                </Link>
                <Link className={styles.secondaryAction} to="/docs/theory/anima">
                  <span>查看原理</span>
                  <span aria-hidden="true">＋</span>
                </Link>
              </div>
            </div>

            <DirectoryPanel tutorialCount={tutorialCount} />
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
    <Layout title={siteConfig.title} description={siteConfig.tagline}>
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
