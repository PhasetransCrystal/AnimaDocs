import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'Cui-Anima集合教程',
  tagline: 'ComfyUI 与 Anima 的安装、配置和使用教程',
  favicon: 'img/anima-mark-day.svg',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'https://your-docusaurus-site.example.com',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'Mon-Landis', // Usually your GitHub org/user name.
  projectName: 'AnimaDocs', // Usually your repo name.

  onBrokenLinks: 'throw',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  markdown: {
    mermaid: true,
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl:
            'https://github.com/Mon-Landis/AnimaDocs/tree/main/',
        },
        blog: {
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          editUrl:
            'https://github.com/Mon-Landis/AnimaDocs/tree/main/',
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themes: ['@docusaurus/theme-mermaid'],

  themeConfig: {
    // Replace with your project's social card
    image: 'img/anima-social-card.svg',
    colorMode: {
      defaultMode: 'light',
      disableSwitch: false,
      // Keep the toggle binary so navigation never exposes a third system mode.
      respectPrefersColorScheme: false,
    },
    navbar: {
      title: 'Cui-Anima集合教程',
      logo: {
        alt: 'Cui-Anima集合教程标志',
        src: 'img/anima-mark-day.svg',
        srcDark: 'img/anima-mark-night.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: '文档',
        },
        {to: '/blog', label: '日志', position: 'left'},
        {
          href: 'https://github.com/Mon-Landis/AnimaDocs',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Cui-Anima集合教程',
          items: [
            {
              label: '开始阅读',
              to: '/docs/intro',
            },
          ],
        },
        {
          title: '内容索引',
          items: [
            {
              label: 'Anima 原理',
              to: '/docs/theory/anima',
            },
            {
              label: '实践记录',
              to: '/blog',
            },
            {
              label: '项目源码',
              href: 'https://github.com/Mon-Landis/AnimaDocs',
            },
          ],
        },
        {
          title: '项目链接',
          items: [
            {
              label: 'GitHub 仓库',
              href: 'https://github.com/Mon-Landis/AnimaDocs',
            },
          ],
        },
      ],
      copyright: `Copyright (c) ${new Date().getFullYear()} Cui-Anima集合教程。基于 Docusaurus 构建。`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
