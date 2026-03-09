import type { DevToolbarApp } from "astro";

interface AnnotationSummary {
  url: string;
  x: number;
  y: number;
  comment: string;
  intent: string;
  severity: string;
  status: string;
}

const app: DevToolbarApp = {
  init(canvas, app) {
    const container = document.createElement("astro-dev-toolbar-window");

    const style = document.createElement("style");
    style.textContent = `
      .instruckt-panel {
        padding: 16px;
        font-family: system-ui, -apple-system, sans-serif;
      }
      .instruckt-title {
        font-size: 14px;
        font-weight: 600;
        margin-bottom: 12px;
        color: white;
      }
      .instruckt-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-height: 300px;
        overflow-y: auto;
      }
      .instruckt-item {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 6px;
        padding: 10px;
        cursor: pointer;
        transition: background 0.15s;
      }
      .instruckt-item:hover {
        background: rgba(255, 255, 255, 0.15);
      }
      .instruckt-item-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 4px;
      }
      .instruckt-intent {
        font-size: 11px;
        font-weight: 500;
        text-transform: uppercase;
        padding: 2px 6px;
        border-radius: 3px;
        background: rgba(99, 102, 241, 0.3);
        color: #a5b4fc;
      }
      .instruckt-intent.fix { background: rgba(239, 68, 68, 0.3); color: #fca5a5; }
      .instruckt-intent.change { background: rgba(234, 179, 8, 0.3); color: #fde047; }
      .instruckt-intent.question { background: rgba(59, 130, 246, 0.3); color: #93c5fd; }
      .instruckt-intent.approve { background: rgba(34, 197, 94, 0.3); color: #86efac; }
      .instruckt-severity {
        font-size: 10px;
        color: rgba(255, 255, 255, 0.5);
      }
      .instruckt-comment {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.8);
        line-height: 1.4;
      }
      .instruckt-url {
        font-size: 10px;
        color: rgba(255, 255, 255, 0.4);
        margin-top: 4px;
      }
      .instruckt-empty {
        color: rgba(255, 255, 255, 0.5);
        font-size: 13px;
        text-align: center;
        padding: 20px;
      }
      .instruckt-refresh {
        background: rgba(99, 102, 241, 0.3);
        border: none;
        color: white;
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 12px;
        margin-top: 12px;
        width: 100%;
        transition: background 0.15s;
      }
      .instruckt-refresh:hover {
        background: rgba(99, 102, 241, 0.5);
      }
    `;

    const panel = document.createElement("div");
    panel.className = "instruckt-panel";

    async function loadAnnotations() {
      try {
        const response = await fetch("/api/instruckt/annotations");
        const annotations = await response.json();
        const pending = annotations.filter(
          (a: AnnotationSummary) => a.status === "pending",
        );

        // Update badge
        if (pending.length > 0) {
          app.toggleNotification({ state: true, level: "warning" });
        } else {
          app.toggleNotification({ state: false });
        }

        if (pending.length === 0) {
          panel.innerHTML = `
            <div class="instruckt-title">Pending Annotations</div>
            <div class="instruckt-empty">No pending annotations</div>
            <button class="instruckt-refresh">Refresh</button>
          `;
        } else {
          panel.innerHTML = `
            <div class="instruckt-title">Pending Annotations (${pending.length})</div>
            <div class="instruckt-list">
              ${pending
                .map(
                  (a: AnnotationSummary) => `
                <div class="instruckt-item" data-url="${a.url}" data-x="${a.x}" data-y="${a.y}">
                  <div class="instruckt-item-header">
                    <span class="instruckt-intent ${a.intent}">${a.intent}</span>
                    <span class="instruckt-severity">${a.severity}</span>
                  </div>
                  <div class="instruckt-comment">${escapeHtml(a.comment)}</div>
                  <div class="instruckt-url">${a.url}</div>
                </div>
              `,
                )
                .join("")}
            </div>
            <button class="instruckt-refresh">Refresh</button>
          `;
        }

        // Add click handlers
        panel.querySelectorAll(".instruckt-item").forEach((item) => {
          item.addEventListener("click", () => {
            const url = (item as HTMLElement).dataset.url;
            if (url && window.location.pathname !== url) {
              window.location.href = url;
            }
          });
        });

        panel
          .querySelector(".instruckt-refresh")
          ?.addEventListener("click", loadAnnotations);
      } catch {
        panel.innerHTML = `
          <div class="instruckt-title">Instruckt</div>
          <div class="instruckt-empty">Failed to load annotations</div>
          <button class="instruckt-refresh">Retry</button>
        `;
        panel
          .querySelector(".instruckt-refresh")
          ?.addEventListener("click", loadAnnotations);
      }
    }

    function escapeHtml(text: string): string {
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    }

    container.appendChild(style);
    container.appendChild(panel);
    canvas.appendChild(container);

    // Load annotations when panel opens
    app.onToggled(({ state }) => {
      if (state) {
        loadAnnotations();
      }
    });

    // Initial load for badge
    loadAnnotations();
  },
};

export default app;
