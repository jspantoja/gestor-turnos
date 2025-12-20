import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import fs from 'fs';
import path from 'path';

// Custom plugin to bump version
const versionBumpPlugin = () => {
  return {
    name: 'version-bump',
    buildStart: () => {
      const packagePath = path.resolve(__dirname, 'package.json');
      const constantsPath = path.resolve(__dirname, 'src', 'config', 'constants.js');

      // 1. Update package.json
      const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      const versionParts = pkg.version.split('.').map(Number);
      versionParts[2] = (versionParts[2] || 0) + 1;
      pkg.version = versionParts.join('.');
      fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
      console.log(`✅ Version bumped to ${pkg.version} in package.json`);

      // 2. Update constants.js
      let constantsFileContent = fs.readFileSync(constantsPath, 'utf8');
      const today = new Date();
      const buildDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      constantsFileContent = constantsFileContent.replace(
        /(export const APP_VERSION = )".*";/,
        `$1"${pkg.version}";`
      );
      constantsFileContent = constantsFileContent.replace(
        /(export const LAST_UPDATE = )".*";/,
        `$1"${buildDate}";`
      );
      fs.writeFileSync(constantsPath, constantsFileContent, 'utf8');
      console.log(`✅ Updated APP_VERSION to ${pkg.version} and LAST_UPDATE to ${buildDate} in constants.js`);
    }
  };
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    versionBumpPlugin(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'Gestor de Turnos',
        short_name: 'Turnos',
        description: 'Sistema de gestión de turnos de trabajo',
        theme_color: '#000000',
        background_color: '#f5f5f7',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'firebase-storage-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          },
          {
            urlPattern: /^https:\/\/.*\.firebaseio\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'firebase-data-cache',
              networkTimeoutSeconds: 10
            }
          }
        ]
      }
    })
  ],
})
