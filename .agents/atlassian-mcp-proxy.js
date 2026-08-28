#!/usr/bin/env node
/**
 * Atlassian Rovo MCP - Headless Stdio Proxy
 * Chuyển đổi giao thức kết nối MCP từ Stdio sang SSE/HTTP.
 * Tự động đọc xác thực từ file `.env` (không lộ Token vào hệ thống Git).
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// 1. Đọc file .env một cách an toàn
function loadEnv(filePath) {
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, 'utf-8');
    content.split(/\r?\n/).forEach(line => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
            let key = match[1];
            let value = match[2] || '';
            value = value.replace(/(^['"]|['"]$)/g, '').trim();
            if (process.env[key] === undefined) {
                process.env[key] = value;
            }
        }
    });
}

// Vì script nằm trong `.agents/`, root là thư mục cha
const projectRoot = path.join(__dirname, '..');
loadEnv(path.join(projectRoot, '.env'));

const email = process.env.ATLASSIAN_EMAIL;
const token = process.env.ATLASSIAN_API_TOKEN;

if (!email || !token) {
    console.error("LỖI: Không tìm thấy ATLASSIAN_EMAIL hoặc ATLASSIAN_API_TOKEN trong file .env");
    process.exit(1);
}

// 2. Chuẩn bị kết nối SSE
const authHeader = 'Basic ' + Buffer.from(`${email}:${token}`).toString('base64');
const sseUrl = 'https://mcp.atlassian.com/v1/mcp'; // Headless endpoint
let postUrl = ''; // Sẽ được cấp qua sự kiện 'endpoint' từ SSE

const sseReq = https.get(sseUrl, {
    headers: {
        'Authorization': authHeader,
        'Accept': 'text/event-stream'
    }
}, (res) => {
    if (res.statusCode !== 200) {
        console.error(`Lỗi kết nối SSE: HTTP ${res.statusCode}`);
        process.exit(1);
    }

    let buffer = '';
    let currentEvent = 'message';

    res.on('data', (chunk) => {
        buffer += chunk.toString();
        let lines = buffer.split(/\r?\n/);
        buffer = lines.pop(); // Giữ lại phần chưa hoàn chỉnh

        for (let line of lines) {
            if (line.startsWith('event:')) {
                currentEvent = line.slice(6).trim();
            } else if (line.startsWith('data:')) {
                const data = line.slice(5).trim();
                
                if (currentEvent === 'endpoint') {
                    // MCP Spec: event 'endpoint' chứa URL để gửi tin nhắn POST
                    postUrl = data.startsWith('http') ? data : new URL(data, sseUrl).toString();
                    currentEvent = 'message'; // reset
                } else {
                    // Ghi thẳng JSON-RPC message ra stdout (cho IDE đọc)
                    process.stdout.write(data + '\n');
                    currentEvent = 'message'; // reset
                }
            } else if (line === '') {
                // Hết block event
                currentEvent = 'message';
            }
        }
    });
});

sseReq.on('error', (err) => {
    console.error("Lỗi SSE Request:", err);
    process.exit(1);
});

// 3. Đọc từ Stdin (tin nhắn từ IDE) và đẩy qua POST
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout, // Chỉ dùng để interface, ta ghi đè process.stdout ở trên
    terminal: false
});

// Hàng đợi tin nhắn trong trường hợp IDE gửi trước khi postUrl kịp khởi tạo
const messageQueue = [];

function flushQueue() {
    if (!postUrl) return;
    while (messageQueue.length > 0) {
        const msg = messageQueue.shift();
        sendPostRequest(msg);
    }
}

// Lắng nghe liên tục để xử lý hàng đợi (hoặc chờ IDE đợi Server Init)
const checkInterval = setInterval(() => {
    if (postUrl && messageQueue.length > 0) {
        flushQueue();
    }
}, 50);

function sendPostRequest(postData) {
    const urlObj = new URL(postUrl);
    const postReq = https.request(urlObj, {
        method: 'POST',
        headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    }, (res) => {
        // Response rỗng, kết quả sẽ được trả về qua luồng SSE
        res.on('data', () => {}); 
    });
    
    postReq.on('error', (err) => {
        console.error("Lỗi POST Request:", err);
    });
    
    postReq.write(postData);
    postReq.end();
}

rl.on('line', (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    
    if (!postUrl) {
        messageQueue.push(trimmed);
    } else {
        sendPostRequest(trimmed);
    }
});
