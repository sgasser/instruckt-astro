import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { Store } from "../store.js";

const server = new McpServer({
  name: "instruckt",
  version: "1.0.0",
});

server.tool(
  "instruckt_get_all_pending",
  "Get all pending annotations (unresolved user feedback from the browser)",
  {},
  async () => {
    const annotations = await Store.getPendingAnnotations();

    const cleaned = annotations.map((a) => ({
      ...a,
      screenshot: !!a.screenshot,
    }));

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            { count: annotations.length, annotations: cleaned },
            null,
            2,
          ),
        },
      ],
    };
  },
);

server.tool(
  "instruckt_get_screenshot",
  "Get base64-encoded screenshot for an annotation",
  {
    annotation_id: z.string().describe("The annotation ID"),
  },
  async ({ annotation_id }) => {
    const annotation = await Store.getAnnotation(annotation_id);

    if (!annotation?.screenshot) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ error: "No screenshot found" }),
          },
        ],
        isError: true,
      };
    }

    const data = await Store.getScreenshot(annotation.screenshot);
    if (!data) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ error: "Screenshot file missing" }),
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text",
          text: data.toString("base64"),
        },
      ],
    };
  },
);

server.tool(
  "instruckt_resolve",
  "Mark an annotation as resolved after fixing the issue",
  {
    annotation_id: z.string().describe("The annotation ID to resolve"),
  },
  async ({ annotation_id }) => {
    const annotation = await Store.updateAnnotation(annotation_id, {
      status: "resolved",
      resolved_by: "agent",
    });

    if (!annotation) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ error: "Annotation not found" }),
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ ok: true, annotation }),
        },
      ],
    };
  },
);

export async function startMcpServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("instruckt MCP server running on stdio");
}

startMcpServer().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
