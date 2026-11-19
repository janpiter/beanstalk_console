import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react(), {
    name: 'legacy-action-dev-proxy',
    configureServer(server) {
      server.middlewares.use((request, _response, next) => {
        if (request.method === 'POST' && /^\/(?:beanstalk\/)?\?/.test(request.url)) {
          request.url = '/_legacy_post' + request.url;
        }
        next();
      });
    },
  }],
  publicDir: false,
  base: './',
  server: {
    proxy: {
      '/api': process.env.VITE_API_TARGET || 'http://127.0.0.1:3080',
      '/beanstalk/api': process.env.VITE_API_TARGET || 'http://127.0.0.1:3080',
      '/_legacy_post': {
        target: process.env.VITE_API_TARGET || 'http://127.0.0.1:3080',
        rewrite: path => path.slice('/_legacy_post'.length),
      },
    },
  },
});
