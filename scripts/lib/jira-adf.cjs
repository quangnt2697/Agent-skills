/**
 * Shared CommonJS/ESM helper: Markdown -> Jira ADF (Atlassian Document Format)
 * Dùng chung cho cả CLI (`jira-push-spec.js`), `n8n-client.js`, và các node CommonJS trong n8n.
 */
'use strict';

const path = require('node:path');
const rawMd2Adf = require('md-to-adf');
const md2adf = (rawMd2Adf && rawMd2Adf.default) || rawMd2Adf;

const HARD_BREAK_TOKEN = '⁣HARDBREAK⁣';

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

function imageBlockToAdf(block, attachmentMap = {}) {
  const filename = path.basename(block.src);
  const attach = attachmentMap[filename]
    || attachmentMap[block.src]
    || Object.values(attachmentMap).find(a => a && a.filename === filename);

  if (attach && (attach.content || attach.url)) {
    return {
      type: 'mediaSingle',
      attrs: { layout: 'center' },
      content: [
        {
          type: 'media',
          attrs: {
            type: 'external',
            url: attach.content || attach.url,
            alt: block.alt || filename
          }
        }
      ]
    };
  }

  if (attach && attach.id) {
    return {
      type: 'mediaSingle',
      attrs: { layout: 'center' },
      content: [
        {
          type: 'media',
          attrs: {
            id: String(attach.id),
            type: 'file',
            collection: '',
            alt: block.alt || filename
          }
        }
      ]
    };
  }

  if (block.src.startsWith('http://') || block.src.startsWith('https://')) {
    return {
      type: 'mediaSingle',
      attrs: { layout: 'center' },
      content: [
        {
          type: 'media',
          attrs: {
            type: 'external',
            url: block.src,
            alt: block.alt || filename
          }
        }
      ]
    };
  }

  return {
    type: 'mediaSingle',
    attrs: { layout: 'center' },
    content: [
      {
        type: 'media',
        attrs: {
          id: `local-${filename}`,
          type: 'file',
          collection: '',
          alt: block.alt || filename
        }
      }
    ]
  };
}

function markdownToAdf(markdown, attachmentMap = {}) {
  const marked = markdown.replace(/[ \t]{2,}\r?\n/g, `${HARD_BREAK_TOKEN}\n`);
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
  normalizeIssueKey,
  splitBlocks,
  imageBlockToAdf,
  markdownToAdf,
};
