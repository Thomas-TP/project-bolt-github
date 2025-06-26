import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          },
          {
            urlPattern: /^https:\/\/api\..*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 // 1 day
              }
            }
          },
          {
            urlPattern: ({ request }) => request.destination === 'document',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pages-cache',
              networkTimeoutSeconds: 3,
              plugins: [{
                cacheKeyWillBeUsed: async ({ request }) => {
                  return `${request.url}`;
                },
                handlerDidError: async () => {
                  // Offline fallback désactivé pour routes SPA
                  return Response.error();
                }
              }]
            }
          }
        ],
        // additionalManifestEntries supprimé pour éviter le doublon offline.html
        skipWaiting: true,
        clientsClaim: true,
      },
      manifest: {
        id: '/helpdesk-git/',
        name: 'HelpDesk-GIT',
        short_name: 'HelpDesk-GIT',
        description: 'Application de support technique HelpDesk-GIT - Gestion professionnelle des tickets et assistance.',
        theme_color: '#1e40af',
        background_color: '#ffffff',
        display: 'standalone',
        display_override: ['window-controls-overlay', 'standalone'],
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',        lang: 'fr',
        dir: 'ltr',categories: ['business', 'productivity', 'utilities'],
        iarc_rating_id: 'e84b072d-71b3-4d3e-86ae-31a8ce4e53b7',
        icons: [
          {
            src: '/icons/icon-72x72.png',
            sizes: '72x72',
            type: 'image/png',
            purpose: 'maskable any'
          },
          {
            src: '/icons/icon-96x96.png',
            sizes: '96x96',
            type: 'image/png',
            purpose: 'maskable any'
          },
          {
            src: '/icons/icon-128x128.png',
            sizes: '128x128',
            type: 'image/png',
            purpose: 'maskable any'
          },
          {
            src: '/icons/icon-144x144.png',
            sizes: '144x144',
            type: 'image/png',
            purpose: 'maskable any'
          },
          {
            src: '/icons/icon-152x152.png',
            sizes: '152x152',
            type: 'image/png',
            purpose: 'maskable any'
          },
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable any'
          },
          {
            src: '/icons/icon-384x384.png',
            sizes: '384x384',
            type: 'image/png',
            purpose: 'maskable any'
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable any'
          }
        ],
        screenshots: [
          {
            src: '/screenshots/desktop-screenshot.png',
            sizes: '1280x720',
            type: 'image/png',
            form_factor: 'wide',
            label: 'Vue du tableau de bord HelpDesk'
          },
          {
            src: '/screenshots/mobile-screenshot.png',
            sizes: '750x1334',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'Interface mobile HelpDesk'
          }
        ],
        related_applications: [],
        prefer_related_applications: false,
        edge_side_panel: {
          preferred_width: 400
        },
        launch_handler: {
          client_mode: 'navigate-existing'
        },
        shortcuts: [
          {
            name: 'Créer un ticket',
            short_name: 'Nouveau ticket',
            description: 'Créer un nouveau ticket de support',
            url: '/tickets/create',
            icons: [
              {
                src: '/icons/icon-96x96.png',
                sizes: '96x96'
              }
            ]
          },
          {
            name: 'Tableau de bord',
            short_name: 'Dashboard',
            description: 'Accéder au tableau de bord principal',
            url: '/dashboard',
            icons: [
              {
                src: '/icons/icon-96x96.png',
                sizes: '96x96'
              }
            ]
          }
        ],
        protocol_handlers: [
          {
            protocol: 'mailto',
            url: '/tickets/create?email=%s'
          }
        ],
        file_handlers: [
          {
            action: '/tickets/create',
            accept: {
              'text/plain': ['.txt', '.log'],
              'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
              'application/pdf': ['.pdf']
            }
          }
        ],
        share_target: {
          action: '/tickets/share',
          method: 'POST',
          enctype: 'multipart/form-data',
          params: {
            title: 'title',
            text: 'text',
            url: 'url',
            files: [
              {
                name: 'files',
                accept: ['image/*', 'text/plain', 'application/pdf']
              }
            ]
          }        },
        handle_links: 'preferred',
        scope_extensions: [
          {
            origin: 'https://www.git.swiss'
          }
        ],
        widgets: [
          {
            name: 'Tickets HelpDesk',
            short_name: 'Tickets',
            description: 'Widget de gestion des tickets de support',
            tag: 'tickets',
            template: 'tickets-template',
            ms_ac_template: 'adaptive',
            data: '/api/widgets/tickets',
            type: 'application/json',
            screenshots: [
              {
                src: '/screenshots/widget-tickets-256.png',
                sizes: '256x256',
                label: 'Widget Tickets 256x256'
              }
            ],
            icons: [
              {
                src: '/icons/icon-192x192.png',
                sizes: '192x192'
              }
            ],
            update: 3600
          }
        ]
      }
    })
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: 'index.html'
    }
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
