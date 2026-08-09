import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'MobileProof',
  description: 'Auditable React Native verification',
  cleanUrls: true,
  themeConfig: {
    nav: [{ text: 'Guide', link: '/guide/quickstart' }, { text: 'Reference', link: '/reference/cli' }],
    sidebar: [
      { text: 'Guide', items: [
        { text: 'Quickstart', link: '/guide/quickstart' },
        { text: 'Architecture', link: '/guide/architecture' },
        { text: 'Configuration', link: '/guide/configuration' },
        { text: 'Selectors', link: '/guide/selectors' },
        { text: 'Adapters', link: '/guide/adapters' },
        { text: 'CI', link: '/guide/ci' },
        { text: 'Security', link: '/guide/security' },
        { text: 'Troubleshooting', link: '/guide/troubleshooting' },
        { text: 'Limitations', link: '/guide/limitations' },
      ] },
      { text: 'Reference', items: [
        { text: 'CLI', link: '/reference/cli' },
        { text: 'Config', link: '/reference/config' },
        { text: 'Artifacts', link: '/reference/artifacts' },
      ] },
    ],
  },
});
