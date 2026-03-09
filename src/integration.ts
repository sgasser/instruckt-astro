import { fileURLToPath } from "node:url";
import node from "@astrojs/node";
import type { AstroIntegration } from "astro";

export interface MarkerColors {
  default?: string;
  screenshot?: string;
  dismissed?: string;
}

export interface InstrucktOptions {
  enabled?: boolean;
  endpoint?: string;
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  theme?: "auto" | "light" | "dark";
  adapters?: ("vue" | "react" | "svelte" | "livewire")[];
  colors?: MarkerColors;
  keys?: {
    annotate?: string;
    freeze?: string;
    screenshot?: string;
    clearPage?: string;
  };
  cdnUrl?: string;
}

const DEFAULT_CDN_URL =
  "https://cdn.jsdelivr.net/npm/instruckt@0.4.21/dist/instruckt.iife.js";

export default function instruckt(
  options: InstrucktOptions = {},
): AstroIntegration {
  const enabled = options.enabled ?? process.env.NODE_ENV !== "production";

  const resolvedOptions = {
    endpoint: options.endpoint ?? "/api/instruckt",
    position: options.position ?? "bottom-right",
    theme: options.theme ?? "auto",
    adapters: options.adapters ?? [],
    colors: options.colors ?? {},
    keys: options.keys ?? {},
    cdnUrl: options.cdnUrl ?? DEFAULT_CDN_URL,
  };

  return {
    name: "instruckt-astro",
    hooks: {
      "astro:config:setup": ({
        config,
        injectRoute,
        injectScript,
        updateConfig,
        addDevToolbarApp,
        logger,
      }) => {
        if (!enabled) {
          logger.info("instruckt-astro disabled (set enabled: true to enable)");
          return;
        }

        // Auto-configure node adapter if none is set
        if (!config.adapter) {
          updateConfig({
            adapter: node({ mode: "standalone" }),
          });
          logger.info(
            "Auto-configured @astrojs/node adapter for on-demand API routes",
          );
        }

        injectRoute({
          pattern: "/api/instruckt/annotations",
          entrypoint: "instruckt-astro/dist/api/annotations.js",
          prerender: false,
        });
        injectRoute({
          pattern: "/api/instruckt/annotations/[id]",
          entrypoint: "instruckt-astro/dist/api/annotation-by-id.js",
          prerender: false,
        });
        injectRoute({
          pattern: "/api/instruckt/screenshots/[filename]",
          entrypoint: "instruckt-astro/dist/api/screenshots.js",
          prerender: false,
        });

        const virtualModuleId = "virtual:instruckt-config";
        const resolvedVirtualModuleId = `\0${virtualModuleId}`;

        updateConfig({
          vite: {
            plugins: [
              {
                name: "instruckt-virtual-config",
                resolveId(id) {
                  if (id === virtualModuleId) return resolvedVirtualModuleId;
                },
                load(id) {
                  if (id === resolvedVirtualModuleId) {
                    return `export const config = ${JSON.stringify(resolvedOptions)};`;
                  }
                },
              },
            ],
          },
        });

        // Use IIFE script loading like instruckt-laravel does
        injectScript(
          "head-inline",
          `
          (function() {
            if (window.__instruckt) return;
            function boot() {
              if (typeof Instruckt === 'undefined') return;
              window.__instruckt = Instruckt.init({
                endpoint: '${resolvedOptions.endpoint}',
                position: '${resolvedOptions.position}',
                theme: '${resolvedOptions.theme}',
                adapters: ${JSON.stringify(resolvedOptions.adapters)},
                colors: ${JSON.stringify(resolvedOptions.colors)},
                keys: ${JSON.stringify(resolvedOptions.keys)}
              });
            }
            var s = document.createElement('script');
            s.src = '${resolvedOptions.cdnUrl}';
            s.onload = boot;
            document.head.appendChild(s);
          })();
        `,
        );

        // Add dev toolbar app for viewing annotations
        addDevToolbarApp({
          id: "instruckt",
          name: "Instruckt",
          icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><circle cx="12" cy="10" r="1"/></svg>`,
          entrypoint: fileURLToPath(
            new URL("./toolbar/app.js", import.meta.url),
          ),
        });

        logger.info("instruckt-astro integration loaded");
      },

      "astro:config:done": ({ injectTypes }) => {
        injectTypes({
          filename: "instruckt-astro.d.ts",
          content: `
declare module 'virtual:instruckt-config' {
  export const config: {
    endpoint: string;
    position: string;
    theme: string;
    adapters: string[];
    keys: Record<string, string>;
  };
}
`,
        });
      },
    },
  };
}
