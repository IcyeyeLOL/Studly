#!/usr/bin/env node
/**
 * Feature Installation Script (CommonJS)
 *
 * Works in two environments:
 *   Local:     node packages/widget-starter-template/scripts/add-feature.js <id> <dir>
 *   Container: node agent_scripts/add-feature.js <id> <widget-dir>
 *
 * Usage:
 *   node add-feature.js --list                  List features by category
 *   node add-feature.js --info <id>             Feature details
 *   node add-feature.js <id> <widget-dir>       Install feature into widget dir
 */

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Environment-aware features path resolution
// ---------------------------------------------------------------------------

function findFeaturesDir() {
  const candidates = [
    // Container: agent_scripts/add-feature.js → agent_scripts/templates/features/
    path.resolve(__dirname, 'templates', 'features'),
    // Local: scripts/add-feature.js → ../features/
    path.resolve(__dirname, '..', 'features'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  console.error('Error: Could not find features directory. Searched:');
  candidates.forEach(c => console.error('  ' + c));
  process.exit(1);
}

const FEATURES_DIR = findFeaturesDir();

// ---------------------------------------------------------------------------
// In container, resolve widget-dir relative to roomPath from container_vars
// ---------------------------------------------------------------------------

function resolveWidgetDir(raw) {
  if (!raw) return null;

  // Absolute path — use as-is
  if (path.isAbsolute(raw)) return raw;

  // Try container_vars.json for room-relative resolution
  const containerVarsPath = '/app/container_vars.json';
  if (fs.existsSync(containerVarsPath)) {
    try {
      const vars = JSON.parse(fs.readFileSync(containerVarsPath, 'utf-8'));
      if (vars.currentRoomPath) {
        return path.resolve(vars.currentRoomPath, raw);
      }
    } catch (e) {
      console.error('Warning: failed to read container_vars.json:', e.message);
    }
  }

  // Fallback: resolve relative to cwd
  return path.resolve(raw);
}

// ---------------------------------------------------------------------------
// Category labels & ordering
// ---------------------------------------------------------------------------

const CATEGORY_LABELS = {
  data: 'Data Features',
  nav: 'Navigation',
  layout: 'Layouts',
  display: 'Display',
};

const CATEGORY_ORDER = ['data', 'nav', 'layout', 'display'];

// ---------------------------------------------------------------------------
// Core helpers
// ---------------------------------------------------------------------------

function loadFeatureConfig(featureId) {
  const configPath = path.join(FEATURES_DIR, featureId, 'feature.json');
  if (!fs.existsSync(configPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch (e) {
    console.error(`Error reading ${configPath}:`, e.message);
    return null;
  }
}

function listFeatures() {
  const entries = fs.readdirSync(FEATURES_DIR, { withFileTypes: true });
  const configs = [];
  for (const e of entries) {
    if (e.isDirectory() && e.name !== 'scripts') {
      const config = loadFeatureConfig(e.name);
      if (config) configs.push(config);
    }
  }
  return configs;
}

function groupByCategory(features) {
  const groups = new Map();
  for (const f of features) {
    const category = f.category || 'other';
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push(f);
  }
  return groups;
}

function copyFile(src, dest) {
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(src, dest);
}

// ---------------------------------------------------------------------------
// Install files
// ---------------------------------------------------------------------------

function installFeature(config, targetDir) {
  let copied = 0;
  let skipped = 0;

  for (const file of config.files) {
    const srcPath = path.join(FEATURES_DIR, config.id, file.src);
    const destPath = path.join(targetDir, file.dest);

    if (!fs.existsSync(srcPath)) {
      console.error(`   Warning: source not found: ${file.src}`);
      continue;
    }

    if (fs.existsSync(destPath)) {
      console.log(`   Exists (skipped): ${file.dest}`);
      skipped++;
    } else {
      copyFile(srcPath, destPath);
      console.log(`   Copied: ${file.dest}`);
      copied++;
    }
  }

  return { copied, skipped };
}

// ---------------------------------------------------------------------------
// Schema auto-integration (structural parse — no comments needed)
// ---------------------------------------------------------------------------

function integrateSchema(config, targetDir) {
  if (!config.schema) return false;

  const schemasPath = path.join(targetDir, 'src', 'schemas.ts');
  if (!fs.existsSync(schemasPath)) {
    console.log('   Warning: Cannot integrate schema — src/schemas.ts not found');
    return false;
  }

  let content = fs.readFileSync(schemasPath, 'utf-8');
  const { exportName, importPath, spreadOperator } = config.schema;

  // Already integrated? Check for actual import statement (not comments)
  const importPattern = new RegExp(`^import\\s+\\{[^}]*\\b${exportName}\\b`, 'm');
  if (importPattern.test(content)) {
    console.log(`   Schema already present: ${exportName}`);
    return false;
  }

  // 1. Add import before "export const schemas"
  const importLine = `import { ${exportName} } from '${importPath}'`;
  content = content.replace(
    /export const schemas/,
    `${importLine}\n\nexport const schemas`
  );

  // 2. Find the schemas array opening and insert entry after it
  const schemaEntry = spreadOperator ? `...${exportName}` : exportName;
  content = content.replace(
    /export const schemas:\s*CollectionSchema\[\]\s*=\s*\[/,
    `export const schemas: CollectionSchema[] = [\n  ${schemaEntry},`
  );

  fs.writeFileSync(schemasPath, content);
  console.log(`   Schema integrated: ${exportName} -> schemas.ts`);
  return true;
}

// ---------------------------------------------------------------------------
// Post-install instructions (route & nav — agent wires manually)
// ---------------------------------------------------------------------------

function printPostInstallInstructions(config) {
  const instructions = [];

  if (config.route) {
    const { path: routePath, component, importPath } = config.route;
    instructions.push(
      `Add route to App.tsx:\n` +
      `     import ${component} from '${importPath}'\n` +
      `     <Route path="${routePath}" element={<${component} />} />`
    );

    const label = component.replace(/Page$/, '');
    instructions.push(
      `Add nav item for '${routePath}' with label '${label}'`
    );
  }

  if (instructions.length > 0) {
    console.log('\n--- Manual wiring needed ---\n');
    instructions.forEach((inst, i) => {
      console.log(`${i + 1}. ${inst}\n`);
    });
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const args = process.argv.slice(2);

  // --help
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log('\nFeature Installation Script\n');
    console.log('Usage: node add-feature.js <feature-id> <widget-dir>\n');
    console.log('Commands:');
    console.log('  <feature-id> <dir>  Install a feature into widget dir');
    console.log('  --list, -l          List all available features');
    console.log('  --info <id>         Show detailed info about a feature');
    console.log('  --help, -h          Show this help\n');

    const features = listFeatures();
    const groups = groupByCategory(features);

    for (const category of CATEGORY_ORDER) {
      const categoryFeatures = groups.get(category);
      if (categoryFeatures && categoryFeatures.length > 0) {
        console.log(`\n${CATEGORY_LABELS[category] || category}:`);
        for (const f of categoryFeatures) {
          console.log(`  ${f.id.padEnd(22)} ${f.name}`);
        }
      }
    }

    console.log('\nExamples:');
    console.log('  add feature items-crud widget-my-app-ABC123');
    console.log('  node add-feature.js items-crud ../my-app');
    process.exit(0);
  }

  // --list
  if (args[0] === '--list' || args[0] === '-l') {
    console.log('\nAvailable Features\n');

    const features = listFeatures();
    const groups = groupByCategory(features);

    for (const category of CATEGORY_ORDER) {
      const categoryFeatures = groups.get(category);
      if (categoryFeatures && categoryFeatures.length > 0) {
        console.log(`${CATEGORY_LABELS[category] || category}:`);
        for (const f of categoryFeatures) {
          console.log(`  ${f.id.padEnd(22)} ${f.name.padEnd(24)} ${f.description}`);
        }
        console.log('');
      }
    }

    console.log('Use: node add-feature.js --info <feature-id>');
    process.exit(0);
  }

  // --info
  if (args[0] === '--info' || args[0] === '-i') {
    const featureId = args[1];
    if (!featureId) {
      console.error('\nError: Please specify a feature ID');
      process.exit(1);
    }
    const config = loadFeatureConfig(featureId);
    if (!config) {
      console.error(`\nError: Unknown feature: ${featureId}`);
      console.error('Use --list to see available features');
      process.exit(1);
    }

    console.log(`\n${config.name} (${config.id})`);
    if (config.category) {
      console.log(`   Category: ${CATEGORY_LABELS[config.category] || config.category}`);
    }
    console.log(`   ${config.description}\n`);
    console.log(`   ${config.details}\n`);

    console.log('   Files:');
    config.files.forEach(f => console.log(`   - ${f.src} -> ${f.dest}`));

    console.log('\n   Integration steps:');
    config.instructions.forEach((inst, i) => console.log(`   ${i + 1}. ${inst}`));

    if (config.patterns && config.patterns.length > 0) {
      console.log('\n   Patterns:');
      config.patterns.forEach(p => console.log(`   - ${p}`));
    }

    if (config.example) {
      console.log('\n   Example:');
      config.example.split('\n').forEach(line => console.log(`   ${line}`));
    }
    console.log('');
    process.exit(0);
  }

  // Install feature
  const featureId = args[0];
  const rawDir = args[1];
  const targetDir = resolveWidgetDir(rawDir);

  if (!targetDir) {
    console.error('\nError: Please specify a widget directory');
    console.error('Usage: node add-feature.js <feature-id> <widget-dir>');
    process.exit(1);
  }

  const config = loadFeatureConfig(featureId);
  if (!config) {
    console.error(`\nError: Unknown feature: ${featureId}`);
    console.error('Use --list to see available features');
    process.exit(1);
  }

  if (!fs.existsSync(targetDir)) {
    console.error(`\nError: Target directory not found: ${targetDir}`);
    process.exit(1);
  }

  console.log(`\nInstalling: ${config.name}`);
  console.log(`   ${config.description}`);
  console.log(`   Target: ${targetDir}`);

  const { copied, skipped } = installFeature(config, targetDir);

  console.log(`\nCopied ${copied} file(s)${skipped > 0 ? `, skipped ${skipped} existing` : ''}`);

  // Always integrate schema
  integrateSchema(config, targetDir);

  // Print manual wiring instructions
  printPostInstallInstructions(config);

  if (config.patterns && config.patterns.length > 0) {
    console.log('--- Key patterns ---\n');
    config.patterns.forEach(p => console.log(`- ${p}`));
    console.log('');
  }
}

main();
