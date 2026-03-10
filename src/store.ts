import { promises as fs } from "node:fs";
import { join } from "node:path";
import { ulid } from "ulid";

const DATA_DIR = join(process.cwd(), ".instruckt");
const ANNOTATIONS_FILE = join(DATA_DIR, "annotations.json");
const SCREENSHOTS_DIR = join(DATA_DIR, "screenshots");

export interface Annotation {
  id: string;
  url: string;
  x: number;
  y: number;
  comment: string;
  element: string;
  element_path?: string;
  css_classes?: string;
  nearby_text?: string;
  selected_text?: string;
  bounding_box?: { x: number; y: number; width: number; height: number };
  screenshot?: string;
  intent: "fix" | "change" | "question" | "approve";
  severity: "blocking" | "important" | "suggestion";
  status: "pending" | "resolved" | "dismissed";
  framework?: Record<string, unknown>;
  thread?: Array<{ role: string; content: string; timestamp: string }>;
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
}

export class Store {
  static async ensureDir(): Promise<void> {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.mkdir(SCREENSHOTS_DIR, { recursive: true });
  }

  static async getAllAnnotations(): Promise<Annotation[]> {
    try {
      const data = await fs.readFile(ANNOTATIONS_FILE, "utf-8");
      return JSON.parse(data);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return [];
      }
      throw error;
    }
  }

  static async getPendingAnnotations(): Promise<Annotation[]> {
    const all = await Store.getAllAnnotations();
    return all.filter((a) => a.status === "pending");
  }

  static async getAnnotation(id: string): Promise<Annotation | null> {
    const all = await Store.getAllAnnotations();
    return all.find((a) => a.id === id) ?? null;
  }

  static async createAnnotation(
    data: Omit<Annotation, "id" | "status" | "created_at" | "updated_at">,
  ): Promise<Annotation> {
    await Store.ensureDir();

    const now = new Date().toISOString();
    const id = ulid();
    const annotation: Annotation = {
      ...data,
      id,
      status: "pending",
      created_at: now,
      updated_at: now,
    };

    if (data.screenshot?.startsWith("data:")) {
      const saved = await Store.saveScreenshot(id, data.screenshot);
      if (saved) annotation.screenshot = saved;
    }

    const all = await Store.getAllAnnotations();
    all.push(annotation);
    await fs.writeFile(ANNOTATIONS_FILE, JSON.stringify(all, null, 2));

    return annotation;
  }

  static async updateAnnotation(
    id: string,
    fields: Partial<
      Pick<Annotation, "status" | "comment" | "resolved_by" | "thread">
    >,
  ): Promise<Annotation | null> {
    const all = await Store.getAllAnnotations();
    const index = all.findIndex((a) => a.id === id);
    if (index === -1) return null;

    const annotation = all[index];

    if (fields.status) annotation.status = fields.status;
    if (fields.comment) annotation.comment = fields.comment;
    if (fields.resolved_by) annotation.resolved_by = fields.resolved_by;
    if (fields.thread) annotation.thread = fields.thread;

    annotation.updated_at = new Date().toISOString();

    if (fields.status === "resolved" || fields.status === "dismissed") {
      annotation.resolved_at = annotation.updated_at;
      annotation.resolved_by = annotation.resolved_by ?? "human";
      if (annotation.screenshot) {
        await Store.deleteScreenshot(annotation.screenshot);
      }
    }

    await fs.writeFile(ANNOTATIONS_FILE, JSON.stringify(all, null, 2));
    return annotation;
  }

  static async saveScreenshot(
    id: string,
    dataUrl: string,
  ): Promise<string | null> {
    await Store.ensureDir();

    if (!dataUrl.startsWith("data:image/")) {
      return null;
    }

    const [header, data] = dataUrl.split(",", 2);
    if (!data) return null;

    let binary: Buffer;
    let ext: string;

    if (header.includes(";base64")) {
      binary = Buffer.from(data, "base64");
      ext = header.includes("image/svg+xml") ? "svg" : "png";
    } else {
      // URL-encoded (e.g. SVG data URLs from snapdom)
      binary = Buffer.from(decodeURIComponent(data), "utf-8");
      ext = "svg";
    }

    if (!binary.length) return null;

    // Use annotation ID as filename (matches Laravel)
    const filename = `${id}.${ext}`;
    const filepath = join(SCREENSHOTS_DIR, filename);

    await fs.writeFile(filepath, binary);
    return `screenshots/${filename}`;
  }

  static isValidScreenshotPath(path: string): boolean {
    return /^screenshots\/[A-Z0-9]{26}\.(png|svg)$/.test(path);
  }

  static async getScreenshotByPath(
    screenshotPath: string,
  ): Promise<Buffer | null> {
    // Expects full path like "screenshots/01ABC.png" (matches Laravel)
    if (!Store.isValidScreenshotPath(screenshotPath)) {
      return null;
    }
    try {
      return await fs.readFile(join(DATA_DIR, screenshotPath));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }
      throw error;
    }
  }

  static async getScreenshotByFilename(
    filename: string,
  ): Promise<Buffer | null> {
    // Expects just filename like "01ABC.png" (for API route)
    if (!/^[A-Z0-9]{26}\.(png|svg)$/.test(filename)) {
      return null;
    }
    try {
      return await fs.readFile(join(SCREENSHOTS_DIR, filename));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }
      throw error;
    }
  }

  static async deleteScreenshot(screenshotPath: string): Promise<void> {
    // Expects full path like "screenshots/01ABC.png" (matches Laravel)
    if (!Store.isValidScreenshotPath(screenshotPath)) {
      return;
    }
    try {
      await fs.unlink(join(DATA_DIR, screenshotPath));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }
}
