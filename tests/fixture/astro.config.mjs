import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import instruckt from 'instruckt-astro';

export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [instruckt({ enabled: true })]
});
