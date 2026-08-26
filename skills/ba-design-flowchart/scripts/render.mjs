#!/usr/bin/env node

import { execSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { DEFAULT_PNG_WIDTH, parsePngWidth, renderSvgToPng } from './png.mjs';
import { renderWithMmdc, selectEngine, warnIgnoredFlags } from './mmdc-engine.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const skillRoot = join(__dirname, '..');

function toAsciiTheme(colors) {
  if (!colors) return undefined;

  const border = colors.border ?? colors.fg;
  const line = colors.line ?? colors.fg;
  const arrow = colors.accent ?? colors.line ?? colors.fg;
  const corner = colors.border ?? colors.line ?? colors.fg;
  const junction = colors.accent ?? colors.border ?? colors.line ?? colors.fg;

  return {
    ...(colors.fg && { fg: colors.fg }),
    ...(border && { border }),
    ...(line && { line }),
    ...(arrow && { arrow }),
    ...(colors.accent && { accent: colors.accent }),
    ...(colors.bg && { bg: colors.bg }),
    ...(corner && { corner }),
    ...(junction && { junction }),
  };
}

async function loadBeautifulMermaid() {
  try {
    return await import('beautiful-mermaid');
  } catch {}

  console.error('[beautiful-mermaid] Dependency not found. Installing automatically...');
  try {
    execSync('npm install --no-fund --no-audit', {
      cwd: skillRoot,
      stdio: ['pipe', 'pipe', 'inherit'],
      timeout: 120000,
    });
    console.error('[beautiful-mermaid] Installed successfully.\n');
  } catch (e) {
    console.error(`[beautiful-mermaid] Auto-install failed: ${e.message}`);
    console.error(`Manual fix: cd ${skillRoot} && npm install`);
    process.exit(1);
  }

  try {
    const pkgPath = join(skillRoot, 'node_modules', 'beautiful-mermaid', 'dist', 'index.js');
    return await import(pkgPath);
  } catch (e) {
    console.error(`[beautiful-mermaid] Failed to load after install: ${e.message}`);
    process.exit(1);
  }
}

const PARSE_DEFAULTS = {
  input: null,
  output: null,
  format: 'svg',
  engine: 'mmdc',
  engineExplicit: false,
  theme: null,
  bg: null,
  fg: null,
  font: 'Inter',
  transparent: false,
  useAscii: false,
  paddingX: 5,
  paddingY: 5,
  boxBorderPadding: 1,
  colorMode: 'auto',
  padding: 40,
  nodeSpacing: 24,
  layerSpacing: 40,
  componentSpacing: 24,
  interactive: false,
  width: DEFAULT_PNG_WIDTH,
};

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { ...PARSE_DEFAULTS };

  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    const val = args[i + 1];

    switch (key) {
      case '--input': case '-i': opts.input = val; i++; break;
      case '--output': case '-o': opts.output = val; i++; break;
      case '--format': case '-f': opts.format = val; i++; break;
      case '--engine': case '-e': opts.engine = val; opts.engineExplicit = true; i++; break;
      case '--theme': case '-t': opts.theme = val; i++; break;
      case '--bg': opts.bg = val; i++; break;
      case '--fg': opts.fg = val; i++; break;
      case '--line': opts.line = val; i++; break;
      case '--accent': opts.accent = val; i++; break;
      case '--muted': opts.muted = val; i++; break;
      case '--surface': opts.surface = val; i++; break;
      case '--border': opts.border = val; i++; break;
      case '--font': opts.font = val; i++; break;
      case '--transparent': opts.transparent = true; break;
      case '--use-ascii': opts.useAscii = true; break;
      case '--padding-x': opts.paddingX = parseInt(val); i++; break;
      case '--padding-y': opts.paddingY = parseInt(val); i++; break;
      case '--box-border-padding': opts.boxBorderPadding = parseInt(val); i++; break;
      case '--color-mode': opts.colorMode = val; i++; break;
      case '--padding': opts.padding = parseInt(val); i++; break;
      case '--node-spacing': opts.nodeSpacing = parseInt(val); i++; break;
      case '--layer-spacing': opts.layerSpacing = parseInt(val); i++; break;
      case '--component-spacing': opts.componentSpacing = parseInt(val); i++; break;
      case '--interactive': opts.interactive = true; break;
      case '--width':
        if (val === undefined) throw new Error('--width requires a value.');
        opts.width = val; i++; break;
      case '--help': case '-h':
        console.log(`Usage: node render.mjs --input <file> [options]

Options:
  -i, --input <file>       Input Mermaid file (.mmd) [required]
  -o, --output <file>      Output file (default: stdout; input.png for PNG)
  -f, --format <fmt>       Output format: svg | png | ascii (default: svg)
  -e, --engine <name>      Layout engine: mmdc | beautiful (default: mmdc)
                           mmdc      = Mermaid chuẩn, cần Chrome, bố cục đúng Rule 7
                           beautiful = beautiful-mermaid, không cần trình duyệt,
                                       hỗ trợ ascii + 15 theme
  -t, --theme <name>       Theme name (e.g. tokyo-night, dracula)
      --bg <hex>           Background color
      --fg <hex>           Foreground color
      --line <hex>         Edge/connector color
      --accent <hex>       Arrow heads and highlights color
      --muted <hex>        Secondary text color
      --surface <hex>      Node fill tint color
      --border <hex>       Node stroke color
      --font <name>        Font family (default: Inter)
      --transparent        Transparent background (SVG and PNG)
      --width <n>          PNG width in pixels (100-10000, default: 800)
      --use-ascii          Pure ASCII instead of Unicode (ASCII only)
      --padding-x <n>      Horizontal spacing (ASCII only, default: 5)
      --padding-y <n>      Vertical spacing (ASCII only, default: 5)
      --box-border-padding <n>  Padding inside node boxes (ASCII only, default: 1)
      --color-mode <mode>  ASCII colors: none | auto | ansi16 | ansi256 | truecolor | html
      --padding <n>        SVG canvas padding in px (default: 40)
      --node-spacing <n>   SVG horizontal node spacing (default: 24)
      --layer-spacing <n>  SVG vertical layer spacing (default: 40)
      --component-spacing <n>  SVG disconnected component spacing (default: 24)
      --interactive        Enable XY chart hover tooltips (SVG only)`);
        process.exit(0);
    }
  }

  if (!opts.input) {
    console.error('Error: --input is required. Use --help for usage.');
    process.exit(1);
  }

  if (!existsSync(opts.input)) {
    console.error(`Error: Input file not found: ${opts.input}`);
    process.exit(1);
  }

  if (!['svg', 'png', 'ascii'].includes(opts.format)) {
    console.error(`Error: Unsupported format: ${opts.format}. Use svg, png, or ascii.`);
    process.exit(1);
  }

  if (!['mmdc', 'beautiful'].includes(opts.engine)) {
    console.error(`Error: Unsupported engine: ${opts.engine}. Use mmdc or beautiful.`);
    process.exit(1);
  }

  if (opts.format === 'png') {
    opts.width = parsePngWidth(opts.width);
  }

  return opts;
}

function outputPathFor(opts, ext) {
  const path = opts.output ?? (
    /\.mmd$/i.test(opts.input) ? opts.input.replace(/\.mmd$/i, ext) : `${opts.input}${ext}`
  );
  // batch.mjs đã tự tạo thư mục đích; render.mjs làm tương tự để mmdc không báo
  // "Output directory doesn't exist" và beautiful không ném ENOENT.
  mkdirSync(dirname(path), { recursive: true });
  return path;
}

async function main() {
  const opts = parseArgs();
  const { engine, chrome } = selectEngine({
    requested: opts.engine,
    format: opts.format,
    explicit: opts.engineExplicit,
  });

  if (engine === 'mmdc') {
    warnIgnoredFlags(opts, PARSE_DEFAULTS);
    const output = outputPathFor(opts, opts.format === 'png' ? '.png' : '.svg');
    renderWithMmdc({
      input: opts.input,
      output,
      format: opts.format,
      width: opts.width,
      bg: opts.bg,
      fg: opts.fg,
      transparent: opts.transparent,
      theme: opts.theme,
      font: opts.font,
      chrome,
    });
    console.log(`${opts.format.toUpperCase()} diagram saved to ${output}`);
    return;
  }

  const { renderMermaidSVG, renderMermaidASCII, THEMES } = await loadBeautifulMermaid();
  const input = readFileSync(opts.input, 'utf8');

  if (opts.theme && !Object.prototype.hasOwnProperty.call(THEMES, opts.theme)) {
    throw new Error(`Unknown theme: ${opts.theme}. Run node scripts/themes.mjs to list themes.`);
  }
  const theme = opts.theme ? THEMES[opts.theme] : undefined;
  const customColors = {
    ...(opts.bg && { bg: opts.bg }),
    ...(opts.fg && { fg: opts.fg }),
    ...(opts.line && { line: opts.line }),
    ...(opts.accent && { accent: opts.accent }),
    ...(opts.border && { border: opts.border }),
  };
  const asciiColors = theme || (Object.keys(customColors).length > 0 ? customColors : undefined);

  if (opts.format === 'ascii') {
    const ascii = renderMermaidASCII(input, {
      useAscii: opts.useAscii,
      paddingX: opts.paddingX,
      paddingY: opts.paddingY,
      boxBorderPadding: opts.boxBorderPadding,
      colorMode: opts.colorMode,
      theme: toAsciiTheme(asciiColors),
    });
    if (opts.output) {
      writeFileSync(opts.output, ascii);
      console.log(`ASCII diagram saved to ${opts.output}`);
    } else {
      console.log(ascii);
    }
  } else {
    const colors = theme || {
      bg: opts.bg ?? '#FFFFFF',
      fg: opts.fg ?? '#27272A',
      ...(opts.line && { line: opts.line }),
      ...(opts.accent && { accent: opts.accent }),
      ...(opts.muted && { muted: opts.muted }),
      ...(opts.surface && { surface: opts.surface }),
      ...(opts.border && { border: opts.border }),
    };

    const svg = renderMermaidSVG(input, {
      ...colors,
      font: opts.font,
      transparent: opts.transparent,
      padding: opts.padding,
      nodeSpacing: opts.nodeSpacing,
      layerSpacing: opts.layerSpacing,
      componentSpacing: opts.componentSpacing,
      interactive: opts.interactive,
    });

    if (opts.format === 'png') {
      const outputPath = outputPathFor(opts, '.png');
      writeFileSync(outputPath, renderSvgToPng(svg, opts.width));
      console.log(`PNG diagram saved to ${outputPath}`);
    } else if (opts.output) {
      writeFileSync(outputPathFor(opts, '.svg'), svg);
      console.log(`SVG diagram saved to ${opts.output}`);
    } else {
      console.log(svg);
    }
  }
}

main().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
