#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { loadEnv } from './db-client.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

loadEnv(path.join(projectRoot, '.env'));

const server = new Server(
    { name: "squash-tm-mcp", version: "1.0.0" },
    { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "squash_push_full_pipeline",
                description: "Đẩy Gherkin script lên Squash TM (Test Case), tự động xóa execution cũ nếu có, đồng bộ Campaign Workspace (clean & add mới).",
                inputSchema: {
                    type: "object",
                    properties: {
                        issueKey: { type: "string", description: "Mã JIRA (ví dụ: ENT-1234)" },
                        nameJira: { type: "string", description: "Tên ticket JIRA" },
                        gherkinContent: { type: "string", description: "Nội dung Gherkin" }
                    },
                    required: ["issueKey", "nameJira", "gherkinContent"]
                }
            }
        ]
    };
});

function execCurl(args) {
    const res = cp.spawnSync('curl', args, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
    if (res.error) throw res.error;
    return res.stdout || '';
}

function callApi(method, endpoint, payload = null) {
    const url = `${process.env.SQUASH_BASE_URL}${endpoint}`;
    const args = [
        '-s',
        '--max-time', '60',
        '-X', method,
        url,
        '-H', `Authorization: Bearer ${process.env.SQUASH_API_TOKEN}`,
        '-H', 'Accept: application/json'
    ];
    if (payload) {
        args.push('-H', 'Content-Type: application/json');
        args.push('-d', JSON.stringify(payload));
    }
    const out = execCurl(args);
    if (!out) return null;
    try {
        return JSON.parse(out);
    } catch {
        return out;
    }
}

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === "squash_push_full_pipeline") {
        const { issueKey, nameJira, gherkinContent } = request.params.arguments;
        const testCaseName = `${issueKey}-${nameJira}`;
        let logs = [];
        const cookieJar = path.join('/tmp', `squash_mcp_cookie_${Date.now()}_${Math.random().toString(36).slice(2)}.txt`);

        try {
            // Khởi tạo session cookie jar
            const getXsrf = () => {
                if (!fs.existsSync(cookieJar)) return '';
                const lines = fs.readFileSync(cookieJar, 'utf-8').split('\n');
                for (let i = lines.length - 1; i >= 0; i--) {
                    const parts = lines[i].split(/\t|\s+/);
                    if (parts.includes('XSRF-TOKEN')) {
                        return parts[parts.length - 1].trim();
                    }
                }
                return '';
            };

            const callBackend = (method, endpoint, payload = null) => {
                const url = `${process.env.SQUASH_BASE_URL}${endpoint}`;
                const xsrf = getXsrf();
                const args = [
                    '-s',
                    '-b', cookieJar,
                    '-c', cookieJar,
                    '-X', method,
                    url,
                    '-H', `Origin: ${process.env.SQUASH_BASE_URL}`,
                    '-H', `Referer: ${process.env.SQUASH_BASE_URL}/campaign-workspace`,
                    '-H', 'User-Agent: Mozilla/5.0',
                    '-H', 'Accept: application/json, text/plain, */*',
                    '-H', `X-XSRF-TOKEN: ${xsrf}`
                ];
                if (payload) {
                    args.push('-H', 'Content-Type: application/json');
                    args.push('--data-raw', JSON.stringify(payload));
                }
                const out = execCurl(args);
                if (!out) return null;
                try {
                    return JSON.parse(out);
                } catch {
                    return out;
                }
            };

            // Đăng nhập session backend
            let hasBackendSession = false;
            if (process.env.SQUASH_USERNAME && process.env.SQUASH_PASSWORD) {
                logs.push("Khởi tạo session backend Squash TM...");
                execCurl(['-s', '-L', '-o', '/dev/null', '-c', cookieJar, '-H', 'User-Agent: Mozilla/5.0', `${process.env.SQUASH_BASE_URL}/login`]);
                const initXsrf = getXsrf();
                if (initXsrf) {
                    execCurl([
                        '-s', '-b', cookieJar, '-c', cookieJar,
                        '-X', 'POST', `${process.env.SQUASH_BASE_URL}/backend/login`,
                        '-H', `Origin: ${process.env.SQUASH_BASE_URL}`,
                        '-H', `Referer: ${process.env.SQUASH_BASE_URL}/login`,
                        '-H', 'User-Agent: Mozilla/5.0',
                        '-H', 'Accept: application/json, text/plain, */*',
                        '-H', 'Content-Type: application/x-www-form-urlencoded',
                        '-H', `X-XSRF-TOKEN: ${initXsrf}`,
                        '--data-urlencode', `username=${process.env.SQUASH_USERNAME}`,
                        '--data-urlencode', `password=${process.env.SQUASH_PASSWORD}`
                    ]);
                    hasBackendSession = true;
                    logs.push(`✅ Đăng nhập backend thành công (${process.env.SQUASH_USERNAME})`);
                }
            }

            // PHASE A: Test Case Workspace
            logs.push("1. Tìm Sprint mới nhất từ Test Case Workspace (Folder G.3.1)...");
            const tcFolders = callApi("GET", `/api/rest/latest/test-case-folders/${process.env.SQUASH_TC_G31_FOLDER_ID}/content?size=100`);
            const sprintFolders = (tcFolders?._embedded?.content || []).filter(f => /Sprint \d+$/i.test(f.name));
            sprintFolders.sort((a, b) => {
                const nA = parseInt(a.name.match(/\d+/)[0]);
                const nB = parseInt(b.name.match(/\d+/)[0]);
                return nA - nB;
            });
            let latestSprint = sprintFolders.pop();

            if (!latestSprint && process.env.SQUASH_REQ_G31_FOLDER_ID) {
                logs.push("Chưa thấy Sprint bên Test Case, quét Requirement Workspace...");
                const reqFolders = callApi("GET", `/api/rest/latest/requirement-folders/${process.env.SQUASH_REQ_G31_FOLDER_ID}/content?size=100`);
                const reqSprints = (reqFolders?._embedded?.content || []).filter(f => /Sprint \d+$/i.test(f.name));
                reqSprints.sort((a, b) => parseInt(a.name.match(/\d+/)[0]) - parseInt(b.name.match(/\d+/)[0]));
                latestSprint = reqSprints.pop();
            }

            if (!latestSprint) throw new Error("Không tìm thấy thư mục 'Sprint xxx'");
            logs.push(`Tìm thấy Sprint: ${latestSprint.name}`);
            const sprintNumber = latestSprint.name.match(/\d+/)[0];

            let targetTcFolder = (tcFolders?._embedded?.content || []).find(f => f.name === latestSprint.name);
            if (!targetTcFolder) {
                targetTcFolder = callApi("POST", "/api/rest/latest/test-case-folders", {
                    _type: "test-case-folder",
                    name: latestSprint.name,
                    parent: { _type: "test-case-folder", id: process.env.SQUASH_TC_G31_FOLDER_ID }
                });
                logs.push(`Đã tạo mới thư mục Test Case ID: ${targetTcFolder.id}`);
            } else {
                logs.push(`Thư mục Test Case đã tồn tại ID: ${targetTcFolder.id}`);
            }

            logs.push(`2. Kiểm tra Test Case: ${testCaseName}...`);
            const content = callApi("GET", `/api/rest/latest/test-case-folders/${targetTcFolder.id}/content?size=100`);
            let targetTestCase = (content?._embedded?.content || []).find(f => f.name === testCaseName || f.name.startsWith(`${issueKey}-`));

            if (!targetTestCase) {
                targetTestCase = callApi("POST", "/api/rest/latest/test-cases", {
                    _type: "scripted-test-case",
                    name: testCaseName,
                    description: "Auto-generated test case from Jira",
                    parent: { _type: "test-case-folder", id: targetTcFolder.id }
                });
                logs.push(`Đã tạo mới Test Case ID: ${targetTestCase.id}`);
            } else {
                logs.push(`Test Case đã tồn tại ID: ${targetTestCase.id}`);

                // XÓA EXECUTION CŨ CỦA TEST CASE
                if (hasBackendSession) {
                    logs.push(`Kiểm tra executions cũ của Test Case ${targetTestCase.id}...`);
                    const execGridPayload = {
                        gridRequest: 1,
                        size: 50,
                        page: 0,
                        gridId: "test-case-view-execution"
                    };
                    const execRes = callBackend("POST", `/backend/test-case/${targetTestCase.id}/executions`, execGridPayload);
                    const oldExecIds = (execRes?.dataRows || []).map(r => r.id).filter(Boolean);
                    if (oldExecIds.length > 0) {
                        for (const execId of oldExecIds) {
                            callApi("DELETE", `/api/rest/latest/executions/${execId}`);
                            callBackend("DELETE", `/backend/executions/${execId}`);
                            logs.push(`✅ Đã xóa execution cũ: ${execId}`);
                        }
                    } else {
                        logs.push("Không có execution cũ nào cần xóa.");
                    }
                }
            }

            logs.push("3. Cập nhật script Gherkin...");
            callApi("PATCH", `/api/rest/latest/test-cases/${targetTestCase.id}`, {
                _type: "scripted-test-case",
                script: gherkinContent
            });
            logs.push("✅ Đã cập nhật script Gherkin thành công");

            // PHASE B: Campaign Workspace
            let sprintReqVersionId = null;
            if (hasBackendSession) {
                logs.push(`4. Dò node Sprint '${latestSprint.name}' trong Campaign Workspace...`);
                let openedNodes = [`CampaignLibrary-${process.env.SQUASH_PROJECT_ID}`];
                let treeJson = callBackend("POST", "/backend/campaign-tree", { openedNodes, selectedNodes: [] });

                // Mở các nhóm con
                const childGroups = (treeJson?.dataRows || [])
                    .filter(r => r.parentRowId === `CampaignLibrary-${process.env.SQUASH_PROJECT_ID}`)
                    .map(r => r.id);
                if (childGroups.length > 0) {
                    openedNodes = Array.from(new Set([...openedNodes, ...childGroups]));
                    treeJson = callBackend("POST", "/backend/campaign-tree", { openedNodes, selectedNodes: [] });
                }

                // Khớp Sprint
                const sprintNode = (treeJson?.dataRows || []).find(r => 
                    r.id && /^Sprint-\d+$/.test(r.id) && 
                    (r.data?.NAME === latestSprint.name || (r.data?.NAME && r.data.NAME.includes(sprintNumber)))
                );

                if (sprintNode) {
                    const sprintId = sprintNode.id.replace('Sprint-', '');
                    logs.push(`✅ Khớp Sprint trong Campaign ID: ${sprintId}`);

                    logs.push(`5. Tìm requirement '${issueKey}' trong Sprint ${sprintId}...`);
                    const sprintView = callBackend("GET", `/backend/sprint-view/${sprintId}?frontEndErrorIsHandled=true`);
                    
                    // Tìm requirement version
                    function findReq(obj) {
                        if (!obj || typeof obj !== 'object') return null;
                        if (obj.reference && obj.reference.toLowerCase() === issueKey.toLowerCase()) {
                            return obj.id || obj.sprintReqVersionId;
                        }
                        for (const val of Object.values(obj)) {
                            const found = findReq(val);
                            if (found) return found;
                        }
                        return null;
                    }
                    sprintReqVersionId = findReq(sprintView);

                    if (sprintReqVersionId) {
                        logs.push(`✅ Tìm thấy Sprint Requirement Version ID: ${sprintReqVersionId}`);

                        // Gán Test Case vào requirement
                        logs.push(`6. Gán Test Case #${targetTestCase.id} vào requirement trong Campaign...`);
                        callBackend("POST", `/backend/sprint-req-version/${sprintReqVersionId}/test-plan-items`, {
                            testCaseIds: [targetTestCase.id]
                        });
                        logs.push(`✅ Đã gán thành công Test Case vào requirement ${issueKey}!`);
                    } else {
                        logs.push(`⚠️ Không tìm thấy requirement có reference '${issueKey}' trong Sprint ${sprintId}`);
                    }
                } else {
                    logs.push(`⚠️ Không khớp được node Sprint trong Campaign Workspace`);
                }
            }

            // Ghi metadata đồng bộ
            const syncDir = path.join(projectRoot, `workspace/${issueKey}/test`);
            if (fs.existsSync(syncDir)) {
                const syncData = {
                    testCaseId: targetTestCase.id,
                    testCaseName: testCaseName,
                    sprintName: latestSprint.name,
                    sprintReqVersionId: sprintReqVersionId || null,
                    syncedAt: new Date().toISOString()
                };
                fs.writeFileSync(path.join(syncDir, 'squash_sync.json'), JSON.stringify(syncData, null, 2));
                logs.push(`Đã lưu truy vết vào ${syncDir}/squash_sync.json`);
            }

            return {
                content: [{
                    type: "text",
                    text: logs.join("\n") + `\n\n🎉 Hoàn tất đẩy kịch bản lên Squash TM (Test Case ID: ${targetTestCase.id})`
                }]
            };

        } catch (error) {
            return {
                isError: true,
                content: [{
                    type: "text",
                    text: `Lỗi khi push lên Squash TM:\n${logs.join("\n")}\n\nChi tiết lỗi: ${error.message}`
                }]
            };
        } finally {
            if (fs.existsSync(cookieJar)) fs.unlinkSync(cookieJar);
        }
    }
    throw new Error(`Tool not found: ${request.params.name}`);
});

async function run() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}

run().catch(console.error);
