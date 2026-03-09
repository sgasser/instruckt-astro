# instruckt-astro

Visual annotation feedback for AI coding agents in Astro. Enables users to annotate UI elements directly in the browser, which AI agents can then read and resolve via MCP.

## Installation

```bash
bun add -D instruckt-astro
```

## Configuration

Add the integration to your Astro config:

```typescript
// astro.config.mjs
import { defineConfig } from 'astro/config';
import instruckt from 'instruckt-astro';

export default defineConfig({
  integrations: [instruckt()]
});
```

### Options

```typescript
instruckt({
  enabled: true,                    // Default: true in dev, false in prod
  endpoint: '/api/instruckt',       // Custom API prefix
  position: 'bottom-right',         // Toolbar position
  theme: 'auto',                    // auto | light | dark
  adapters: ['vue', 'react'],       // Framework detection
  colors: {
    default: '#6366f1',             // Marker color
    screenshot: '#22c55e',          // Marker with screenshot
    dismissed: '#71717a'            // Dismissed marker
  },
  keys: {
    annotate: 'a',
    freeze: 'f',
    screenshot: 'c',
    clearPage: 'x'
  },
  cdnUrl: 'https://cdn.jsdelivr.net/npm/instruckt@0.4.21/dist/instruckt.iife.js'
})
```

## MCP Setup

Add to your project's `.mcp.json`:

```json
{
  "mcpServers": {
    "instruckt": {
      "command": "npx",
      "args": ["instruckt-mcp"],
      "cwd": "/absolute/path/to/project"
    }
  }
}
```

## MCP Tools

- `instruckt_get_all_pending` - Get all pending annotations
- `instruckt_get_screenshot` - Get base64-encoded screenshot for an annotation
- `instruckt_resolve` - Mark an annotation as resolved

## Usage

1. Run your Astro dev server
2. Press 'A' to enter annotation mode
3. Click on any element to annotate
4. Add a comment and save
5. Use Claude Code (or any MCP client) to read and resolve annotations

## Dev Toolbar

The integration adds an app to Astro's dev toolbar that shows pending annotations. Click the chat bubble icon in the toolbar to:
- View all pending annotations
- See annotation intent and severity
- Navigate to annotated pages

## API Endpoints

- `GET /api/instruckt/annotations` - List all annotations
- `POST /api/instruckt/annotations` - Create annotation
- `PATCH /api/instruckt/annotations/[id]` - Update annotation status
- `GET /api/instruckt/screenshots/[filename]` - Get screenshot image

## Development

```bash
bun install
bun run build       # Build package
bun run test        # Run unit tests
bun run test:e2e    # Run E2E tests
bun run test:all    # Run all tests
```

## Storage

Annotations are stored in `.instruckt/` in your project root. Add to `.gitignore`:

```
.instruckt/
```

## Requirements

- Astro 5.x (adapter auto-configured)

## Credits

This package is an Astro port of [instruckt-laravel](https://github.com/joshcirre/instruckt-laravel) by [Josh Cirre](https://github.com/joshcirre). It uses the [instruckt](https://github.com/joshcirre/instruckt) frontend library for the visual annotation UI.

Thank you Josh for creating this excellent tool for AI-assisted development workflows.

## License

MIT
