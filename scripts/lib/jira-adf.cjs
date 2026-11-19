/**
 * Shared CommonJS/ESM helper: Markdown -> Jira ADF (Atlassian Document Format)
 * Dùng chung cho cả CLI (`jira-push-spec.js`), `n8n-client.js`, và các node CommonJS trong n8n.
 */
'use strict';

const path = require('node:path');
const rawMd2Adf = require('md-to-adf');
const md2adf = (rawMd2Adf && rawMd2Adf.default) || rawMd2Adf;

const HARD_BREAK_TOKEN = '⁣HARDBREAK⁣';
const DEFAULT_MEDIA_LAYOUT = 'align-start';
const PORTRAIT_MEDIA_MAX_WIDTH = 160;
const LANDSCAPE_MEDIA_MAX_WIDTH = 320;

const ALLOWED_LANGUAGES = new Set([
  'abap', 'actionscript', 'ada', 'arduino', 'autoit', 'c', 'c++', 'clojure',
  'coffeescript', 'csharp', 'css', 'cuda', 'd', 'dart', 'delphi', 'elixir',
  'erlang', 'fortran', 'foxpro', 'go', 'graphql', 'groovy', 'haskell', 'haxe',
  'html', 'java', 'javascript', 'json', 'julia', 'kotlin', 'latex', 'lisp',
  'lua', 'mathematica', 'matlab', 'objective-c', 'ocaml', 'pascal', 'perl',
  'php', 'powershell', 'prolog', 'puppet', 'python', 'qml', 'r', 'racket',
  'restructuredtext', 'ruby', 'rust', 'sass', 'scala', 'scheme', 'shell',
  'sql', 'standardml', 'swift', 'tcl', 'tex', 'typescript', 'vala', 'vbnet',
  'verilog', 'vhdl', 'xml', 'xquery'
]);

function normalizeIssueKey(raw) {
  if (!raw) return null;
  const match = String(raw).match(/([A-Z][A-Z0-9]*-\d+)/i);
  return match ? match[1].toUpperCase() : null;
}

function isTableDelimiter(line) {
  return /^\s*\|?[\s:|-]*-[\s:|-]*\|?\s*$/.test(line) && line.includes('-');
}

function isTableRow(line) {
  return /^\s*\|.*\|\s*$/.test(line.trim()) || (/\|/.test(line) && line.trim().startsWith('|'));
}

function splitBlocks(markdown) {
  const lines = markdown.split('\n');
  const blocks = [];
  let buffer = [];
  let inCodeBlock = false;

  const flush = () => {
    if (buffer.length) blocks.push({ type: 'md', lines: buffer });
    buffer = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/^\s*```/.test(line)) inCodeBlock = !inCodeBlock;

    const imgMatch = !inCodeBlock && line.match(/^\s*!\[([^\]]*)\]\(([^)]+)\)\s*$/);
    if (imgMatch) {
      flush();
      blocks.push({
        type: 'image',
        alt: imgMatch[1].trim(),
        src: imgMatch[2].trim(),
        raw: line
      });
      continue;
    }

    if (!inCodeBlock
      && isTableRow(line)
      && i + 1 < lines.length
      && isTableDelimiter(lines[i + 1])
      && isTableRow(lines[i + 1])) {
      flush();
      const tableLines = [line, lines[i + 1]];
      let j = i + 2;
      while (j < lines.length && isTableRow(lines[j]) && lines[j].trim() !== '') {
        tableLines.push(lines[j]);
        j++;
      }
      blocks.push({ type: 'table', lines: tableLines });
      i = j - 1;
      continue;
    }

    buffer.push(line);
  }

  flush();
  return blocks;
}

function splitRow(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
}

function toPlainAdf(markdown) {
  return JSON.parse(JSON.stringify(md2adf(markdown)));
}

function applyHardBreaks(node, inCodeBlock = false) {
  if (!node || typeof node !== 'object') return node;

  const isCodeBlock = inCodeBlock || node.type === 'codeBlock';

  if (Array.isArray(node.content)) {
    const rebuilt = [];

    for (const child of node.content) {
      if (child.type === 'text' && (child.text.includes(HARD_BREAK_TOKEN) || /<br\s*\/?>/i.test(child.text))) {
        if (isCodeBlock) {
          child.text = child.text.split(HARD_BREAK_TOKEN).join('');
          rebuilt.push(child);
        } else {
          const normalizedText = child.text.replace(/<br\s*\/?>/gi, HARD_BREAK_TOKEN);
          const parts = normalizedText.split(HARD_BREAK_TOKEN);
          parts.forEach((part, index) => {
            if (index > 0) rebuilt.push({ type: 'hardBreak' });
            const text = index > 0 ? part.replace(/^\s+/, '') : part;
            if (text) rebuilt.push({ ...child, text });
          });
        }
      } else {
        rebuilt.push(applyHardBreaks(child, isCodeBlock));
      }
    }

    node.content = rebuilt;
  }

  return node;
}

function inlineContent(text) {
  if (!text) return [];
  const doc = applyHardBreaks(toPlainAdf(text));
  const first = (doc.content || [])[0];
  if (!first || !first.content) return text ? [{ type: 'text', text }] : [];
  return first.content;
}

function tableCell(text, isHeader) {
  const content = inlineContent(text);
  return {
    type: isHeader ? 'tableHeader' : 'tableCell',
    attrs: {},
    content: [content.length
      ? { type: 'paragraph', content }
      : { type: 'paragraph', content: [] }]
  };
}

function markdownTableToAdf(tableLines) {
  const header = splitRow(tableLines[0]);
  const bodyLines = tableLines.slice(2);
  const columnCount = header.length;

  const rows = [{
    type: 'tableRow',
    content: header.map(cell => tableCell(cell, true))
  }];

  for (const line of bodyLines) {
    const cells = splitRow(line);
    while (cells.length < columnCount) cells.push('');
    rows.push({
      type: 'tableRow',
      content: cells.slice(0, columnCount).map(cell => tableCell(cell, false))
    });
  }

  return {
    type: 'table',
    attrs: { isNumberColumnEnabled: false, layout: 'default' },
    content: rows
  };
}

function sanitizeCodeBlocks(node) {
  if (!node || typeof node !== 'object') return node;

  if (node.type === 'codeBlock' && node.attrs && node.attrs.language) {
    if (!ALLOWED_LANGUAGES.has(node.attrs.language)) {
      delete node.attrs.language;
    }
  }

  if (Array.isArray(node.content)) {
    for (const child of node.content) {
      sanitizeCodeBlocks(child);
    }
  }

  return node;
}

function getImageDimensionsFromBuffer(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 10) return null;

  // PNG: signature 89 50 4E 47 0D 0A 1A 0A, IHDR width/height at offsets 16..23
  if (buf.length >= 24 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) {
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    if (width > 0 && height > 0) return { width, height };
  }

  // GIF: GIF87a / GIF89a width/height LE at offsets 6..9
  if (buf.length >= 10 && buf.toString('ascii', 0, 3) === 'GIF') {
    const width = buf.readUInt16LE(6);
    const height = buf.readUInt16LE(8);
    if (width > 0 && height > 0) return { width, height };
  }

  // JPEG: scan SOF0..SOF3/SOF5..SOF15 markers (FFC0..FFCF except DHT=FFC4, JPG=FFC8, DAC=FFCC)
  if (buf.length >= 4 && buf[0] === 0xFF && buf[1] === 0xD8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xFF) { i++; continue; }
      while (i < buf.length && buf[i] === 0xFF) i++;
      if (i >= buf.length) break;
      const marker = buf[i];
      i++;
      if (marker === 0xD8 || marker === 0xD9 || marker === 0x00 || marker === 0x01 || (marker >= 0xD0 && marker <= 0xD7)) {
        continue;
      }
      if (i + 1 >= buf.length) break;
      const segLen = buf.readUInt16BE(i);
      if (marker >= 0xC0 && marker <= 0xCF && marker !== 0xC4 && marker !== 0xC8 && marker !== 0xCC) {
        if (i + 6 < buf.length) {
          const height = buf.readUInt16BE(i + 3);
          const width = buf.readUInt16BE(i + 5);
          if (width > 0 && height > 0) return { width, height };
        }
        break;
      }
      if (segLen < 2) break;
      i += segLen;
    }
  }

  return null;
}

function computeJiraMediaDimensions(naturalWidth, naturalHeight) {
  if (!(naturalWidth > 0 && naturalHeight > 0)) {
    return { width: PORTRAIT_MEDIA_MAX_WIDTH };
  }
  const maxWidth = naturalWidth > naturalHeight ? LANDSCAPE_MEDIA_MAX_WIDTH : PORTRAIT_MEDIA_MAX_WIDTH;
  const width = Math.min(Math.round(naturalWidth), maxWidth);
  const height = Math.max(1, Math.round((naturalHeight * width) / naturalWidth));
  return { width, height };
}

async function resolveJiraMediaUuid(contentUrl, authHeader) {
  if (!contentUrl || !authHeader || typeof fetch !== 'function') return null;
  try {
    const res = await fetch(contentUrl, {
      method: 'GET',
      headers: { Authorization: authHeader },
      redirect: 'manual'
    });
    const loc = res.headers && typeof res.headers.get === 'function' ? res.headers.get('location') : '';
    const m = String(loc || '').match(/\/file\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\b/i);
    return m ? m[1] : null;
  } catch (_) {
    return null;
  }
}

function imageBlockToAdf(block, attachmentMap = {}) {
  const filename = path.basename(block.src);
  const attach = attachmentMap[filename]
    || attachmentMap[block.src]
    || Object.values(attachmentMap).find(a => a && a.filename === filename);

  const naturalWidth = attach && Number(attach.naturalWidth || attach.width);
  const naturalHeight = attach && Number(attach.naturalHeight || attach.height);
  const dims = computeJiraMediaDimensions(naturalWidth, naturalHeight);
  const singleAttrs = {
    width: dims.width,
    widthType: 'pixel',
    layout: DEFAULT_MEDIA_LAYOUT
  };
  const dimMediaAttrs = dims.height ? { width: dims.width, height: dims.height } : {};
  const altText = block.alt || filename;

  if (attach && attach.mediaId) {
    return {
      type: 'mediaSingle',
      attrs: singleAttrs,
      content: [
        {
          type: 'media',
          attrs: {
            id: String(attach.mediaId),
            type: 'file',
            collection: '',
            alt: altText,
            ...dimMediaAttrs
          }
        }
      ]
    };
  }

  if (attach && (attach.content || attach.url)) {
    return {
      type: 'mediaSingle',
      attrs: singleAttrs,
      content: [
        {
          type: 'media',
          attrs: {
            type: 'external',
            url: attach.content || attach.url,
            alt: altText,
            ...dimMediaAttrs
          }
        }
      ]
    };
  }

  if (attach && attach.id) {
    return {
      type: 'mediaSingle',
      attrs: singleAttrs,
      content: [
        {
          type: 'media',
          attrs: {
            id: String(attach.id),
            type: 'file',
            collection: '',
            alt: altText,
            ...dimMediaAttrs
          }
        }
      ]
    };
  }

  if (block.src.startsWith('http://') || block.src.startsWith('https://')) {
    return {
      type: 'mediaSingle',
      attrs: singleAttrs,
      content: [
        {
          type: 'media',
          attrs: {
            type: 'external',
            url: block.src,
            alt: altText,
            ...dimMediaAttrs
          }
        }
      ]
    };
  }

  return {
    type: 'mediaSingle',
    attrs: singleAttrs,
    content: [
      {
        type: 'media',
        attrs: {
          id: `local-${filename}`,
          type: 'file',
          collection: '',
          alt: altText,
          ...dimMediaAttrs
        }
      }
    ]
  };
}

function stripHtmlCommentsOutsideCode(markdown) {
  const lines = String(markdown || '').split('\n');
  let inCode = false;
  const out = [];
  let inHtmlComment = false;

  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      if (!inHtmlComment) inCode = !inCode;
      out.push(line);
      continue;
    }
    if (inCode) {
      out.push(line);
      continue;
    }

    let cur = line;
    if (inHtmlComment) {
      const endIdx = cur.indexOf('-->');
      if (endIdx === -1) continue;
      cur = cur.slice(endIdx + 3);
      inHtmlComment = false;
    }

    cur = cur.replace(/<!--[\s\S]*?-->/g, '');
    const openIdx = cur.indexOf('<!--');
    if (openIdx !== -1) {
      cur = cur.slice(0, openIdx);
      inHtmlComment = true;
    }

    if (cur.trim() !== '' || line.trim() === '') {
      out.push(cur);
    }
  }
  return out.join('\n');
}

function markdownToAdf(markdown, attachmentMap = {}) {
  const cleaned = stripHtmlCommentsOutsideCode(markdown);
  const marked = cleaned.replace(/[ \t]{2,}\r?\n/g, `${HARD_BREAK_TOKEN}\n`);
  const content = [];

  for (const block of splitBlocks(marked)) {
    if (block.type === 'table') {
      content.push(markdownTableToAdf(block.lines));
      continue;
    }

    if (block.type === 'image') {
      content.push(imageBlockToAdf(block, attachmentMap));
      continue;
    }

    const text = block.lines.join('\n');
    if (!text.trim()) continue;

    const doc = applyHardBreaks(toPlainAdf(text));
    sanitizeCodeBlocks(doc);
    content.push(...(doc.content || []));
  }

  return { type: 'doc', version: 1, content };
}

module.exports = {
  HARD_BREAK_TOKEN,
  ALLOWED_LANGUAGES,
  DEFAULT_MEDIA_LAYOUT,
  PORTRAIT_MEDIA_MAX_WIDTH,
  LANDSCAPE_MEDIA_MAX_WIDTH,
  normalizeIssueKey,
  stripHtmlCommentsOutsideCode,
  getImageDimensionsFromBuffer,
  computeJiraMediaDimensions,
  resolveJiraMediaUuid,
  splitBlocks,
  imageBlockToAdf,
  markdownToAdf,
};

if (require.main === module && process.argv.includes('--stdin')) {
  const fs = require('node:fs');
  const raw = fs.readFileSync(0, 'utf8');
  const parsed = JSON.parse(raw || '{}');
  const md = typeof parsed.markdown === 'string' ? parsed.markdown : '';
  const map = (parsed.attachmentMap && typeof parsed.attachmentMap === 'object') ? parsed.attachmentMap : {};
  process.stdout.write(JSON.stringify(markdownToAdf(md, map)));
}
