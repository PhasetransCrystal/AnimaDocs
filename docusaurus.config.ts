import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'AnimaDocs',
  tagline: 'ComfyUI / Anima workflow field notes',
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
      title: 'AnimaDocs',
      logo: {
        alt: 'AnimaDocs mark',
        src: 'img/anima-mark-day.svg',
        srcDark: 'img/anima-mark-night.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Docs',
        },
        {to: '/blog', label: 'Notes', position: 'left'},
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
          title: 'AnimaDocs',
          items: [
            {
              label: 'Start reading',
              to: '/docs/intro',
            },
          ],
        },
        {
          title: 'Index',
          items: [
            {
              label: 'Theory / Anima',
              to: '/docs/theory/anima',
            },
            {
              label: 'Notes / Blog',
              to: '/blog',
            },
            {
              label: 'Project source',
              href: 'https://github.com/Mon-Landis/AnimaDocs',
            },
          ],
        },
        {
          title: 'Signal',
          items: [
            {
              label: 'GitHub repository',
              href: 'https://github.com/Mon-Landis/AnimaDocs',
            },
          ],
        },
      ],
      copyright: `Copyright (c) ${new Date().getFullYear()} AnimaDocs. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
