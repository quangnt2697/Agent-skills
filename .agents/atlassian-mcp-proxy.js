#!/usr/bin/env node
/**
 * Atlassian Rovo MCP - Headless Stdio Proxy
 * Chuyển đổi giao thức kết nối MCP từ Stdio sang HTTP Streamable MCP của Atlassian.
 * Tự động đọc xác thực từ file `.env` (không lộ Token vào hệ thống Git).
 */

import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { loadEnv } from './db-client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');
loadEnv(path.join(projectRoot, '.env'));


const email = process.env.ATLASSIAN_EMAIL;
const token = process.env.ATLASSIAN_API_TOKEN;

if (!email || !token) {
    console.error("LỖI: Không tìm thấy ATLASSIAN_EMAIL hoặc ATLASSIAN_API_TOKEN trong file .env");
    process.exit(1);
}

const authHeader = 'Basic ' + Buffer.from(`${email}:${token}`).toString('base64');
const mcpUrl = new URL('https://mcp.atlassian.com/v1/mcp');

let sessionId = null;
const messageQueue = [];
let isSending = false;

async function processQueue() {
    if (isSending || messageQueue.length === 0) return;
    isSending = true;

    while (messageQueue.length > 0) {
        const msg = messageQueue.shift();
        try {
            await sendPost(msg);
        } catch (err) {
            console.error("Lỗi gửi MCP request tới Atlassian:", err.message);
        }
    }

    isSending = false;
}

function sendPost(postData) {
    return new Promise((resolve, reject) => {
        const headers = {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/event-stream',
            'Content-Length': Buffer.byteLength(postData)
        };

        if (sessionId) {
            headers['mcp-session-id'] = sessionId;
        }

        const req = https.request(mcpUrl, {
            method: 'POST',
            headers: headers
        }, (res) => {
            if (res.headers['mcp-session-id']) {
                sessionId = res.headers['mcp-session-id'];
            }

            let buffer = '';
            res.on('data', (chunk) => {
                buffer += chunk.toString();
                const lines = buffer.split(/\r?\n/);
                buffer = lines.pop(); // Giữ lại phần chưa hoàn chỉnh

                for (const line of lines) {
                    if (line.startsWith('data:')) {
                        const data = line.slice(5).trim();
                        if (data) {
                            process.stdout.write(data + '\n');
                        }
                    }
                }
            });

            res.on('end', () => {
                if (buffer.trim()) {
                    if (buffer.startsWith('data:')) {
                        const data = buffer.slice(5).trim();
                        if (data) process.stdout.write(data + '\n');
                    } else if (buffer.startsWith('{')) {
                        process.stdout.write(buffer.trim() + '\n');
                    }
                }
                resolve();
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        req.write(postData);
        req.end();
    });
}

// 2. Đọc từ Stdin (tin nhắn từ IDE)
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
});

rl.on('line', (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    messageQueue.push(trimmed);
    processQueue();
});

function cleanup() {
    process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
rl.on('close', cleanup);
process.stdin.on('close', cleanup);
