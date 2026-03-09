import type { APIRoute } from "astro";
import { z } from "zod";
import { Store } from "../store.js";

const CreateSchema = z.object({
  url: z.string().max(2048),
  x: z.number(),
  y: z.number(),
  comment: z.string().max(2000),
  element: z.string().max(255),
  element_path: z.string().max(2048).optional(),
  css_classes: z.string().optional(),
  nearby_text: z.string().max(500).optional(),
  selected_text: z.string().max(500).optional(),
  bounding_box: z
    .object({
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number(),
    })
    .optional(),
  screenshot: z.string().optional(),
  intent: z.enum(["fix", "change", "question", "approve"]).default("fix"),
  severity: z
    .enum(["blocking", "important", "suggestion"])
    .default("important"),
  framework: z.record(z.unknown()).optional(),
});

export const GET: APIRoute = async () => {
  const annotations = await Store.getAllAnnotations();
  return new Response(JSON.stringify(annotations), {
    headers: { "Content-Type": "application/json" },
  });
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const data = CreateSchema.parse(body);
    const annotation = await Store.createAnnotation(data);

    return new Response(JSON.stringify(annotation), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? error.errors
            .map((e) => `${e.path.join(".")}: ${e.message}`)
            .join(", ")
        : "Invalid request";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
};
