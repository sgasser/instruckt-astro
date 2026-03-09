import type { APIRoute } from "astro";
import { Store } from "../store.js";

const VALID_FILENAME = /^[A-Z0-9]{26}\.(png|svg)$/;

export const GET: APIRoute = async ({ params }) => {
  const { filename } = params;
  if (!filename || !VALID_FILENAME.test(filename)) {
    return new Response("Not found", { status: 404 });
  }

  const data = await Store.getScreenshot(filename);
  if (!data) {
    return new Response("Not found", { status: 404 });
  }

  const contentType = filename.endsWith(".svg") ? "image/svg+xml" : "image/png";
  return new Response(new Uint8Array(data), {
    headers: { "Content-Type": contentType },
  });
};
