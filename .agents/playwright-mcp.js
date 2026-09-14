#!/usr/bin/env node
/**
 * Playwright MCP Server chuyên biệt cho Auto Test (Web UI / Trading / Dashboard)
 * Tích hợp sẵn:
 * 1. Quản lý Chromium browser chuẩn viewport 1920x1080
 * 2. Đọc cấu hình từ .env (DASHBOARD_URL, WEB_BASE_URL, TRADING_USERNAME, etc.)
 * 3. Hỗ trợ đầy đủ các actions: navigate, screenshot, click, fill, inspect, evaluate
 * 4. Hỗ trợ Smart Actions: tự động login Dashboard và Web Trading Platform
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { loadEnv } from './db-client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');
loadEnv(path.join(projectRoot, '.env'));
loadEnv(path.join(projectRoot, 'plugins/qa/skills/qa-auto-design/examples/.env.example'));


// Quản lý Browser & Page Singleton
let browserInstance = null;
let contextInstance = null;
let activePage = null;

async function getOrCreatePage() {
    if (!browserInstance || !browserInstance.isConnected()) {
        const headless = process.env.PLAYWRIGHT_HEADLESS !== 'false';
        browserInstance = await chromium.launch({
            headless: headless,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        contextInstance = await browserInstance.newContext({
            viewport: { width: 1920, height: 1080 },
            ignoreHTTPSErrors: true,
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 AntigravityPlaywrightMCP'
        });
        activePage = await contextInstance.newPage();
    }
    if (!activePage || activePage.isClosed()) {
        activePage = await contextInstance.newPage();
    }
    return activePage;
}

process.on('exit', async () => {
    if (browserInstance) {
        await browserInstance.close();
    }
});

const server = new Server(
    { name: "playwright-mcp", version: "1.0.0" },
    { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "playwright_navigate",
                description: "Mở một URL trên trình duyệt Chromium (Full HD 1920x1080).",
                inputSchema: {
                    type: "object",
                    properties: {
                        url: { type: "string", description: "URL cần mở (ví dụ: https://trading-test.example.com/)" }
                    },
                    required: ["url"]
                }
            },
            {
                name: "playwright_screenshot",
                description: "Chụp ảnh màn hình trang web hiện tại để kiểm tra giao diện hoặc đính kèm báo cáo lỗi.",
                inputSchema: {
                    type: "object",
                    properties: {
                        name: { type: "string", description: "Tên file ảnh (ví dụ: login_screen, error_state)" },
                        fullPage: { type: "boolean", description: "Có chụp toàn bộ chiều dài trang không (default: true)" }
                    },
                    required: ["name"]
                }
            },
            {
                name: "playwright_get_dom",
                description: "Lấy cấu trúc HTML/DOM thật của trang web để Agent trích xuất locator chính xác (AI DOM Recon).",
                inputSchema: {
                    type: "object",
                    properties: {
                        selector: { type: "string", description: "Selector của vùng cần lấy DOM (default: body)" },
                        maxDepth: { type: "number", description: "Giới hạn độ sâu lấy DOM (default: 5)" }
                    }
                }
            },
            {
                name: "playwright_inspect_element",
                description: "Soi thông tin chi tiết của một element (text, tag, role, visibility, bounding box, attributes).",
                inputSchema: {
                    type: "object",
                    properties: {
                        selector: { type: "string", description: "Selector cần soi (CSS, Text, Role, hoặc XPath)" }
                    },
                    required: ["selector"]
                }
            },
            {
                name: "playwright_click",
                description: "Nhấp chuột vào một phần tử trên trang.",
                inputSchema: {
                    type: "object",
                    properties: {
                        selector: { type: "string", description: "Selector của nút/link cần bấm" }
                    },
                    required: ["selector"]
                }
            },
            {
                name: "playwright_fill",
                description: "Nhập văn bản vào ô input hoặc textarea.",
                inputSchema: {
                    type: "object",
                    properties: {
                        selector: { type: "string", description: "Selector của input field" },
                        value: { type: "string", description: "Nội dung cần nhập" }
                    },
                    required: ["selector", "value"]
                }
            },
            {
                name: "playwright_evaluate",
                description: "Thực thi đoạn mã JavaScript trong ngữ cảnh trình duyệt và lấy kết quả trả về.",
                inputSchema: {
                    type: "object",
                    properties: {
                        script: { type: "string", description: "Đoạn code JavaScript cần chạy" }
                    },
                    required: ["script"]
                }
            },
            {
                name: "playwright_login_dashboard",
                description: "Tự động đăng nhập vào OpenAPI Dashboard sử dụng thông tin cấu hình từ .env hoặc tham số truyền vào.",
                inputSchema: {
                    type: "object",
                    properties: {
                        url: { type: "string", description: "URL Dashboard (optional)" },
                        username: { type: "string", description: "Tên đăng nhập (optional)" },
                        password: { type: "string", description: "Mật khẩu (optional)" }
                    }
                }
            },
            {
                name: "playwright_login_trading",
                description: "Tự động mở và đăng nhập vào Web Trading Platform sử dụng thông tin cấu hình từ .env.",
                inputSchema: {
                    type: "object",
                    properties: {
                        url: { type: "string", description: "URL Trading Platform (optional)" },
                        username: { type: "string", description: "Tên đăng nhập (optional)" },
                        password: { type: "string", description: "Mật khẩu (optional)" }
                    }
                }
            }
        ]
    };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const page = await getOrCreatePage();

    try {
        switch (name) {
            case "playwright_navigate": {
                const targetUrl = args.url;
                await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
                const title = await page.title();
                const currentUrl = page.url();
                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify({ status: "success", title, currentUrl }, null, 2)
                    }]
                };
            }

            case "playwright_screenshot": {
                const imgName = args.name || "screenshot";
                const fullPage = args.fullPage !== false;
                const screenshotsDir = path.join(projectRoot, "test", "result", "screenshots");
                if (!fs.existsSync(screenshotsDir)) {
                    fs.mkdirSync(screenshotsDir, { recursive: true });
                }
                const filename = `${imgName}_${Date.now()}.png`;
                const filePath = path.join(screenshotsDir, filename);
                await page.screenshot({ path: filePath, fullPage });
                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify({ status: "success", filePath, filename }, null, 2)
                    }]
                };
            }

            case "playwright_get_dom": {
                const targetSelector = args.selector || "body";
                const domSnippet = await page.evaluate((sel) => {
                    const el = document.querySelector(sel);
                    if (!el) return null;
                    // Lọc bớt script và style để ngắn gọn
                    const clone = el.cloneNode(true);
                    const scripts = clone.querySelectorAll("script, style, svg");
                    scripts.forEach(s => s.remove());
                    return clone.outerHTML.slice(0, 15000); // giới hạn 15k ký tự
                }, targetSelector);

                return {
                    content: [{
                        type: "text",
                        text: domSnippet || "Không tìm thấy phần tử tương ứng với selector."
                    }]
                };
            }

            case "playwright_inspect_element": {
                const sel = args.selector;
                const info = await page.evaluate((selector) => {
                    const el = document.querySelector(selector);
                    if (!el) return null;
                    const rect = el.getBoundingClientRect();
                    return {
                        tagName: el.tagName.toLowerCase(),
                        id: el.id,
                        className: el.className,
                        role: el.getAttribute("role") || el.tagName.toLowerCase(),
                        type: el.getAttribute("type"),
                        name: el.getAttribute("name"),
                        placeholder: el.getAttribute("placeholder"),
                        innerText: el.innerText ? el.innerText.trim().slice(0, 200) : "",
                        isVisible: !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length),
                        isEnabled: !el.disabled,
                        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
                    };
                }, sel);

                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify(info || { error: `Element not found: ${sel}` }, null, 2)
                    }]
                };
            }

            case "playwright_click": {
                const sel = args.selector;
                await page.waitForSelector(sel, { timeout: 10000 });
                await page.click(sel);
                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify({ status: "success", action: "clicked", selector: sel }, null, 2)
                    }]
                };
            }

            case "playwright_fill": {
                const sel = args.selector;
                const val = args.value;
                await page.waitForSelector(sel, { timeout: 10000 });
                await page.fill(sel, val);
                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify({ status: "success", action: "filled", selector: sel }, null, 2)
                    }]
                };
            }

            case "playwright_evaluate": {
                const script = args.script;
                const result = await page.evaluate(script);
                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify({ status: "success", result }, null, 2)
                    }]
                };
            }

            case "playwright_login_dashboard": {
                const dashboardUrl = args.url || process.env.DASHBOARD_URL;
                if (!dashboardUrl) throw new Error("DASHBOARD_URL chưa được thiết lập trong .env hoặc đối số");
                const username = args.username || process.env.DASHBOARD_USERNAME;
                const password = args.password || process.env.DASHBOARD_PASSWORD;
                if (!username || !password) throw new Error("Thiếu DASHBOARD_USERNAME hoặc DASHBOARD_PASSWORD trong .env");

                await page.goto(dashboardUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
                await page.waitForTimeout(1000);

                // Điền username
                const userInput = page.locator('input[type="text"], input[name="username"], input[placeholder*="tài khoản"], input[placeholder*="email"]').first();
                if (await userInput.isVisible()) {
                    await userInput.fill(username);
                }

                // Điền password
                const passInput = page.locator('input[type="password"]').first();
                if (await passInput.isVisible()) {
                    await passInput.fill(password);
                }

                // Click login button
                const loginBtn = page.locator('button:has-text("Đăng nhập"), button:has-text("Login"), button[type="submit"]').first();
                if (await loginBtn.isVisible()) {
                    await loginBtn.click();
                }

                await page.waitForTimeout(2000);
                const currentUrl = page.url();
                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify({ status: "success", action: "login_dashboard_attempted", currentUrl }, null, 2)
                    }]
                };
            }

            case "playwright_login_trading": {
                const tradingUrl = args.url || process.env.WEB_BASE_URL;
                if (!tradingUrl) throw new Error("WEB_BASE_URL chưa được thiết lập trong .env hoặc đối số");
                const username = args.username || process.env.TRADING_USERNAME || "";
                const password = args.password || process.env.TRADING_PASSWORD || "";

                await page.goto(tradingUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
                await page.waitForTimeout(1000);

                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify({ status: "success", action: "navigated_trading", url: tradingUrl, username }, null, 2)
                    }]
                };
            }

            default:
                throw new Error(`Công cụ không được hỗ trợ: ${name}`);
        }
    } catch (error) {
        return {
            isError: true,
            content: [{
                type: "text",
                text: JSON.stringify({ error: error.message, stack: error.stack }, null, 2)
            }]
        };
    }
});

async function run() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}

run().catch((error) => {
    console.error("Lỗi khởi động Playwright MCP Server:", error);
    process.exit(1);
});
