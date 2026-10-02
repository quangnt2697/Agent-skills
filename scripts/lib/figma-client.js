/**
 * Figma API Client (`scripts/lib/figma-client.js`)
 *
 * Tiện ích tương tác với Figma REST API:
 * - Trích xuất fileKey và nodeId từ Figma URL
 * - Lấy metadata và thông tin node thiết kế (GET /v1/files/:key/nodes)
 * - Tải ảnh render PNG chất lượng cao của frame/component (GET /v1/images/:key)
 *
 * Sử dụng token từ biến môi trường: FIGMA_API_TOKEN
 */

import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..', '..');

dotenv.config({ path: path.join(projectRoot, '.env') });

const FIGMA_API_BASE = 'https://api.figma.com/v1';

/**
 * Phân tích URL Figma để lấy fileKey và nodeId
 * @param {string} url Hoặc URL đầy đủ hoặc fileKey
 * @returns {{ fileKey: string, nodeId: string|null }}
 */
export function parseFigmaUrl(url) {
  if (!url) return { fileKey: '', nodeId: null };

  // Nếu chuỗi là URL
  if (url.startsWith('http://') || url.startsWith('https://')) {
    try {
      const parsed = new URL(url);
      const pathParts = parsed.pathname.split('/').filter(Boolean);
      // Format: /file/:key/:title hoặc /design/:key/:title
      const keyIndex = pathParts.findIndex(p => p === 'file' || p === 'design');
      let fileKey = '';
      if (keyIndex !== -1 && pathParts[keyIndex + 1]) {
        fileKey = pathParts[keyIndex + 1];
      }

      let nodeId = parsed.searchParams.get('node-id') || null;
      if (nodeId) {
        // Figma URL thường mã hóa dấu : thành %3A hoặc - thành dấu :
        nodeId = decodeURIComponent(nodeId).replace(/-/g, ':');
      }

      return { fileKey, nodeId };
    } catch {
      return { fileKey: url, nodeId: null };
    }
  }

  // Nếu truyền trực tiếp fileKey
  return { fileKey: url, nodeId: null };
}

/**
 * Lấy header xác thực Figma API
 * @param {string} [tokenOverride] Token ghi đè nếu có
 * @returns {object}
 */
function getFigmaHeaders(tokenOverride) {
  const token = tokenOverride || process.env.FIGMA_API_TOKEN;
  if (!token || token === 'your_figma_personal_access_token_here') {
    throw new Error('Thiếu FIGMA_API_TOKEN trong .env. Vui lòng cấu hình token để sử dụng tính năng Figma.');
  }
  return {
    'X-Figma-Token': token,
    'Accept': 'application/json'
  };
}

/**
 * Lấy thông tin chi tiết node từ Figma
 * @param {string} fileKey ID của file Figma
 * @param {string} nodeId ID của node (VD: "123:456")
 * @param {object} [options]
 * @returns {Promise<object>}
 */
export async function fetchFigmaNodes(fileKey, nodeId, options = {}) {
  const headers = getFigmaHeaders(options.token);
  const cleanNodeId = nodeId.replace(/-/g, ':');
  const url = `${FIGMA_API_BASE}/files/${fileKey}/nodes?ids=${encodeURIComponent(cleanNodeId)}`;

  const res = await fetch(url, { headers });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Figma API Error ${res.status}: ${errorText}`);
  }

  return await res.json();
}

/**
 * Xuất ảnh PNG của một frame/node từ Figma và tải về máy
 * @param {string} fileKey ID file Figma hoặc URL
 * @param {string} nodeId ID của node (nếu URL đã có nodeId có thể để null)
 * @param {string} outputPath Đường dẫn lưu ảnh PNG
 * @param {object} [options] { scale: 2, format: 'png', token }
 * @returns {Promise<{ success: boolean, outputPath: string, imageUrl: string }>}
 */
export async function exportFigmaImage(fileKeyOrUrl, nodeId, outputPath, options = {}) {
  const parsed = parseFigmaUrl(fileKeyOrUrl);
  const fileKey = parsed.fileKey;
  const targetNodeId = (nodeId || parsed.nodeId || '').replace(/-/g, ':');

  if (!fileKey) {
    throw new Error('Không xác định được fileKey từ input: ' + fileKeyOrUrl);
  }
  if (!targetNodeId) {
    throw new Error('Chưa cung cấp nodeId cho node cần xuất ảnh.');
  }

  const headers = getFigmaHeaders(options.token);
  const scale = options.scale || 2;
  const format = options.format || 'png';
  const url = `${FIGMA_API_BASE}/images/${fileKey}?ids=${encodeURIComponent(targetNodeId)}&format=${format}&scale=${scale}`;

  const res = await fetch(url, { headers });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Figma API Export Error ${res.status}: ${errorText}`);
  }

  const data = await res.json();
  const imageUrl = data.images ? data.images[targetNodeId] : null;

  if (!imageUrl) {
    throw new Error(`Không lấy được link ảnh render cho nodeId: ${targetNodeId}`);
  }

  // Tải file ảnh về
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) {
    throw new Error(`Tải ảnh từ CDN Figma thất bại: HTTP ${imgRes.status}`);
  }

  const arrayBuffer = await imgRes.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const resolvedOutput = path.resolve(outputPath);
  fs.mkdirSync(path.dirname(resolvedOutput), { recursive: true });
  fs.writeFileSync(resolvedOutput, buffer);

  return {
    success: true,
    outputPath: resolvedOutput,
    imageUrl
  };
}

// ── CLI ENTRYPOINT ──────────────────────────────────────────────────────────
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const action = args[0];

  if (!action) {
    console.error("Usage: node figma-client.js <exportImage|fetchNode> [args...]");
    process.exit(1);
  }

  (async () => {
    try {
      if (action === 'exportImage') {
        // node figma-client.js exportImage <urlOrKey> <nodeId> <outputPath>
        const [_, urlOrKey, nodeId, outputPath, scale] = args;
        const result = await exportFigmaImage(urlOrKey, nodeId, outputPath, { scale: Number(scale) || 2 });
        console.log(JSON.stringify(result, null, 2));
      } else if (action === 'fetchNode') {
        const [_, urlOrKey, nodeId] = args;
        const parsed = parseFigmaUrl(urlOrKey);
        const key = parsed.fileKey;
        const id = nodeId || parsed.nodeId;
        const result = await fetchFigmaNodes(key, id);
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.error(`Unknown action: ${action}`);
        process.exit(1);
      }
    } catch (e) {
      console.error(JSON.stringify({ error: e.message }));
      process.exit(1);
    }
  })();
}
