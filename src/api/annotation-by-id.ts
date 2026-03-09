import type { APIRoute } from "astro";
import { z } from "zod";
import { Store } from "../store.js";

const UpdateSchema = z.object({
  status: z.enum(["pending", "resolved", "dismissed"]).optional(),
  comment: z.string().max(2000).optional(),
});

export const GET: APIRoute = async ({ params }) => {
  const { id } = params;
  if (!id) {
    return new Response(JSON.stringify({ error: "Missing id" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const annotation = await Store.getAnnotation(id);
  if (!annotation) {
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify(annotation), {
    headers: { "Content-Type": "application/json" },
  });
};

export const PATCH: APIRoute = async ({ params, request }) => {
  const { id } = params;
  if (!id) {
    return new Response(JSON.stringify({ error: "Missing id" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await request.json();
    const updates = UpdateSchema.parse(body);
    const annotation = await Store.updateAnnotation(id, updates);

    if (!annotation) {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(annotation), {
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
