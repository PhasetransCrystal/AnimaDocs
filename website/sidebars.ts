import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const sidebars: SidebarsConfig = {
  // Keep the learning path explicit so new files do not change its order.
  tutorialSidebar: [
    {type: 'doc', id: 'intro', label: '序'},
    {type: 'doc', id: 'install', label: '安装'},
  ],
};

export default sidebars;
