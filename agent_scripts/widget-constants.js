/**
 * Shared constants for widget source file handling.
 *
 * CANONICAL SOURCE — these values must match @miyagi/canvas-schema
 * (packages/canvas-schema/src/widgetSourceConstants.ts) which is used
 * by WidgetBuildService.ts on the API server.
 *
 * Used by: generate-widget.js, generate-canvas.js, unpack-canvas-state.js
 */

/**
 * File extensions considered user-editable source files.
 * Files with these extensions are collected into the widget's `sources` map
 * and round-tripped through canvas-state.json.
 */
const SOURCE_EXTENSIONS = new Set(['.tsx', '.ts', '.jsx', '.js', '.css', '.json']);

/**
 * Root-level files in the widget directory that are widget-owned.
 * These are included in `sources` alongside `src/` files and
 * round-trip through canvas-state.json.
 */
const ROOT_LEVEL_WIDGET_FILES = ['tsconfig.json'];

/**
 * Path to the base template inside the Docker container.
 * Synced from packages/widget-starter-template/template/ at image build time
 * via deploy-cloudflare.sh → sync:template-sources.
 */
const BASE_TEMPLATE_DIR = '/app/scripts/agent_scripts/templates/starter';

module.exports = {
  SOURCE_EXTENSIONS,
  ROOT_LEVEL_WIDGET_FILES,
  BASE_TEMPLATE_DIR,
};
