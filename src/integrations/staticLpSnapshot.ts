import type { AstroIntegration } from 'astro';

export function staticLpSnapshot(): AstroIntegration {
  return {
    name: 'static-lp-snapshot',
    hooks: {
      'astro:build:done': async ({ dir }) => {
        const { snapshotProfessionPages } = await import('../lib/staticLpSnapshot');
        await snapshotProfessionPages(dir);
      },
    },
  };
}
