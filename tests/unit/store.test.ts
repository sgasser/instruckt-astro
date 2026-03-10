import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { Store } from '../../src/store.js';

const DATA_DIR = join(process.cwd(), '.instruckt');

describe('Store', () => {
  beforeEach(async () => {
    await fs.rm(DATA_DIR, { recursive: true, force: true });
  });

  afterEach(async () => {
    await fs.rm(DATA_DIR, { recursive: true, force: true });
  });

  describe('getAllAnnotations', () => {
    it('returns empty array when no file exists', async () => {
      const annotations = await Store.getAllAnnotations();
      expect(annotations).toEqual([]);
    });
  });

  describe('createAnnotation', () => {
    it('creates annotation with generated id and timestamps', async () => {
      const data = {
        url: '/',
        x: 100,
        y: 200,
        comment: 'Test comment',
        element: 'button',
        intent: 'fix' as const,
        severity: 'important' as const
      };

      const annotation = await Store.createAnnotation(data);

      expect(annotation.id).toBeDefined();
      expect(annotation.id.length).toBe(26); // ULID length
      expect(annotation.status).toBe('pending');
      expect(annotation.created_at).toBeDefined();
      expect(annotation.updated_at).toBeDefined();
      expect(annotation.comment).toBe('Test comment');
    });

    it('persists annotation to file', async () => {
      await Store.createAnnotation({
        url: '/',
        x: 100,
        y: 200,
        comment: 'Persisted',
        element: 'div',
        intent: 'fix' as const,
        severity: 'important' as const
      });

      const all = await Store.getAllAnnotations();
      expect(all).toHaveLength(1);
      expect(all[0].comment).toBe('Persisted');
    });
  });

  describe('getAnnotation', () => {
    it('returns annotation by id', async () => {
      const created = await Store.createAnnotation({
        url: '/',
        x: 100,
        y: 200,
        comment: 'Find me',
        element: 'span',
        intent: 'change' as const,
        severity: 'suggestion' as const
      });

      const found = await Store.getAnnotation(created.id);
      expect(found).not.toBeNull();
      expect(found?.comment).toBe('Find me');
    });

    it('returns null for non-existent id', async () => {
      const found = await Store.getAnnotation('non-existent-id');
      expect(found).toBeNull();
    });
  });

  describe('getPendingAnnotations', () => {
    it('filters to only pending annotations', async () => {
      const a1 = await Store.createAnnotation({
        url: '/',
        x: 100,
        y: 200,
        comment: 'Pending 1',
        element: 'div',
        intent: 'fix' as const,
        severity: 'important' as const
      });

      await Store.createAnnotation({
        url: '/',
        x: 150,
        y: 250,
        comment: 'Pending 2',
        element: 'span',
        intent: 'fix' as const,
        severity: 'important' as const
      });

      await Store.updateAnnotation(a1.id, { status: 'resolved' });

      const pending = await Store.getPendingAnnotations();
      expect(pending).toHaveLength(1);
      expect(pending[0].comment).toBe('Pending 2');
    });
  });

  describe('updateAnnotation', () => {
    it('updates status and sets resolved fields', async () => {
      const created = await Store.createAnnotation({
        url: '/',
        x: 100,
        y: 200,
        comment: 'To resolve',
        element: 'button',
        intent: 'fix' as const,
        severity: 'blocking' as const
      });

      const updated = await Store.updateAnnotation(created.id, {
        status: 'resolved',
        resolved_by: 'agent'
      });

      expect(updated?.status).toBe('resolved');
      expect(updated?.resolved_by).toBe('agent');
      expect(updated?.resolved_at).toBeDefined();
    });

    it('updates comment', async () => {
      const created = await Store.createAnnotation({
        url: '/',
        x: 100,
        y: 200,
        comment: 'Original',
        element: 'p',
        intent: 'question' as const,
        severity: 'suggestion' as const
      });

      const updated = await Store.updateAnnotation(created.id, {
        comment: 'Updated comment'
      });

      expect(updated?.comment).toBe('Updated comment');
    });

    it('returns null for non-existent id', async () => {
      const result = await Store.updateAnnotation('non-existent', { status: 'resolved' });
      expect(result).toBeNull();
    });
  });

  describe('screenshot handling', () => {
    it('saves base64 PNG screenshot', async () => {
      const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const dataUrl = `data:image/png;base64,${pngBase64}`;

      const annotation = await Store.createAnnotation({
        url: '/',
        x: 100,
        y: 200,
        comment: 'With screenshot',
        element: 'div',
        screenshot: dataUrl,
        intent: 'fix' as const,
        severity: 'important' as const
      });

      expect(annotation.screenshot).toBeDefined();
      expect(annotation.screenshot).toMatch(/\.png$/);
    });

    it('retrieves saved screenshot', async () => {
      const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const dataUrl = `data:image/png;base64,${pngBase64}`;

      const annotation = await Store.createAnnotation({
        url: '/',
        x: 100,
        y: 200,
        comment: 'Screenshot test',
        element: 'img',
        screenshot: dataUrl,
        intent: 'fix' as const,
        severity: 'important' as const
      });

      const data = await Store.getScreenshotByPath(annotation.screenshot!);
      expect(data).not.toBeNull();
      expect(data).toBeInstanceOf(Buffer);
    });

    it('deletes screenshot on resolve', async () => {
      const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const dataUrl = `data:image/png;base64,${pngBase64}`;

      const annotation = await Store.createAnnotation({
        url: '/',
        x: 100,
        y: 200,
        comment: 'Delete screenshot test',
        element: 'canvas',
        screenshot: dataUrl,
        intent: 'fix' as const,
        severity: 'important' as const
      });

      const screenshotPath = annotation.screenshot!;
      await Store.updateAnnotation(annotation.id, { status: 'resolved' });

      const data = await Store.getScreenshotByPath(screenshotPath);
      expect(data).toBeNull();
    });
  });
});
