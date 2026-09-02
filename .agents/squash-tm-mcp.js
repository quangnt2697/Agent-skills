#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { CallToolRequestSchema, ListToolsRequestSchema } = require("@modelcontextprotocol/sdk/types.js");

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
                description: "Đẩy Gherkin script lên Squash TM (Test Case) và tự động gán vào Sprint tương ứng trong Campaign Workspace.",
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

async function callApi(method, endpoint, payload = null) {
    const url = `${process.env.SQUASH_BASE_URL}${endpoint}`;
    const headers = {
        "Authorization": `Bearer ${process.env.SQUASH_API_TOKEN}`,
        "Accept": "application/json"
    };
    if (payload) {
        headers["Content-Type"] = "application/json";
    }
    const options = { method, headers };
    if (payload) options.body = JSON.stringify(payload);

    const res = await fetch(url, options);
    if (!res.ok) {
        throw new Error(`API Error ${res.status}: ${await res.text()}`);
    }
    return await res.json();
}

async function extractCookieAndXsrf(response, cookiesMap) {
    const setCookieHeaders = response.headers.getSetCookie ? response.headers.getSetCookie() : [];
    let xsrfToken = null;
    for (const c of setCookieHeaders) {
        const cookiePair = c.split(';')[0];
        const [k, ...vs] = cookiePair.split('=');
        const v = vs.join('=');
        cookiesMap.set(k.trim(), v.trim());
        if (k.trim() === 'XSRF-TOKEN') {
            xsrfToken = v.trim();
        }
    }
    return xsrfToken;
}

function getCookieString(cookiesMap) {
    return Array.from(cookiesMap.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
}

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === "squash_push_full_pipeline") {
        const { issueKey, nameJira, gherkinContent } = request.params.arguments;
        const testCaseName = `${issueKey}-${nameJira}`;
        let logs = [];
        
        try {
            // PHASE A: REST API
            logs.push("1. Tìm Sprint mới nhất từ Requirement Workspace (Folder G.3.1)...");
            const reqFolders = await callApi("GET", `/api/rest/latest/requirement-folders/${process.env.SQUASH_REQ_G31_FOLDER_ID}/content`);
            const sprintFolders = (reqFolders._embedded?.content || []).filter(f => /^EnTrade Sprint \d+$/.test(f.name));
            sprintFolders.sort((a, b) => {
                const nA = parseInt(a.name.match(/\d+/)[0]);
                const nB = parseInt(b.name.match(/\d+/)[0]);
                return nA - nB;
            });
            const latestSprint = sprintFolders.pop();
            if (!latestSprint) throw new Error("Không tìm thấy thư mục 'EnTrade Sprint xxx'");
            logs.push(`Tìm thấy Sprint: ${latestSprint.name}`);
            const sprintNumber = latestSprint.name.match(/\d+/)[0];

            logs.push("2. Đồng bộ thư mục sang Test Case Workspace...");
            const tcFolders = await callApi("GET", `/api/rest/latest/test-case-folders/${process.env.SQUASH_TC_G31_FOLDER_ID}/content?size=100`);
            let targetTcFolder = (tcFolders._embedded?.content || []).find(f => f.name === latestSprint.name);
            if (!targetTcFolder) {
                targetTcFolder = await callApi("POST", "/api/rest/latest/test-case-folders", {
                    _type: "test-case-folder",
                    name: latestSprint.name,
                    parent: { _type: "test-case-folder", id: process.env.SQUASH_TC_G31_FOLDER_ID }
                });
                logs.push(`Đã tạo mới thư mục Test Case ID: ${targetTcFolder.id}`);
            }

            logs.push(`3. Kiểm tra Test Case: ${testCaseName}`);
            const searchRes = await callApi("GET", `/api/rest/latest/test-cases?search=${encodeURIComponent(`name~"${testCaseName}"`)}&size=100`);
            let tcId = (searchRes._embedded?.['test-cases'] || []).find(tc => tc.name === testCaseName)?.id;
            if (!tcId) {
                const newTc = await callApi("POST", "/api/rest/latest/test-cases", {
                    _type: "scripted-test-case",
                    name: testCaseName,
                    description: "Auto-generated test case from Jira",
                    parent: { _type: "test-case-folder", id: targetTcFolder.id }
                });
                tcId = newTc.id;
                logs.push(`Đã tạo Test Case mới ID: ${tcId}`);
            }

            logs.push("4. Cập nhật script Gherkin...");
            await callApi("PATCH", `/api/rest/latest/test-cases/${tcId}`, {
                _type: "scripted-test-case",
                script: gherkinContent
            });
            logs.push("✅ Phase A hoàn tất!");

            // PHASE B: Backend API
            logs.push("5. Đăng nhập Campaign Workspace...");
            const cookiesMap = new Map();
            let loginPageRes = await fetch(`${process.env.SQUASH_BASE_URL}/login`);
            let xsrfToken = await extractCookieAndXsrf(loginPageRes, cookiesMap);

            const loginRes = await fetch(`${process.env.SQUASH_BASE_URL}/backend/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "X-XSRF-TOKEN": xsrfToken,
                    "Cookie": getCookieString(cookiesMap)
                },
                body: `username=${encodeURIComponent(process.env.SQUASH_USERNAME)}&password=${encodeURIComponent(process.env.SQUASH_PASSWORD)}`
            });
            xsrfToken = await extractCookieAndXsrf(loginRes, cookiesMap) || xsrfToken;
            if (loginRes.status !== 200 && loginRes.status !== 204) {
                logs.push(`⚠️ Đăng nhập thất bại. Bỏ qua Phase B.`);
                return { content: [{ type: "text", text: logs.join('\n') }] };
            }

            logs.push("6. Dò node Sprint...");
            let treeJson = await fetch(`${process.env.SQUASH_BASE_URL}/backend/campaign-tree`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "X-XSRF-TOKEN": xsrfToken, "Cookie": getCookieString(cookiesMap) },
                body: JSON.stringify({ openedNodes: [], selectedNodes: [] })
            }).then(r => r.json());
            
            // Recursive expansion to find nested Sprint nodes
            const pid = process.env.SQUASH_PROJECT_ID;
            let prevOpened = "[]";
            let openedNodes = [];
            
            while (true) {
                // Collect nodes to open
                let newOpened = [];
                function collectNodes(obj) {
                    if (!obj || typeof obj !== 'object') return;
                    if (Array.isArray(obj)) {
                        obj.forEach(collectNodes);
                        return;
                    }
                    const idStr = obj.id ? obj.id.toString() : "";
                    if (idStr && /^(CampaignLibrary|SprintGroup|CampaignFolder)-\d+$/.test(idStr)) {
                        if (!idStr.startsWith("CampaignLibrary-") || idStr === `CampaignLibrary-${pid}`) {
                            newOpened.push(idStr);
                        }
                    }
                    Object.values(obj).forEach(collectNodes);
                }
                collectNodes(treeJson);
                
                // Keep unique
                openedNodes = [...new Set(newOpened)];
                const currentOpenedStr = JSON.stringify(openedNodes.sort());
                
                if (currentOpenedStr === prevOpened || openedNodes.length === 0) {
                    break;
                }
                prevOpened = currentOpenedStr;
                
                treeJson = await fetch(`${process.env.SQUASH_BASE_URL}/backend/campaign-tree`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "X-XSRF-TOKEN": xsrfToken, "Cookie": getCookieString(cookiesMap) },
                    body: JSON.stringify({ openedNodes, selectedNodes: [] })
                }).then(r => r.json());
            }

            let sprintNode = null;
            function searchTree(obj) {
                if (!obj || typeof obj !== 'object') return;
                if (Array.isArray(obj)) {
                    obj.forEach(searchTree);
                    return;
                }
                const idStr = obj.id ? obj.id.toString() : "";
                if (idStr && idStr.startsWith("Sprint-") && obj.name && obj.name.includes(sprintNumber)) {
                    sprintNode = obj;
                }
                Object.values(obj).forEach(searchTree);
            }
            searchTree(treeJson);

            if (!sprintNode) {
                logs.push(`⚠️ Không tìm thấy node Sprint ${sprintNumber} trong Campaign Workspace.`);
                return { content: [{ type: "text", text: logs.join('\n') }] };
            }
            const sprintId = sprintNode.id.replace("Sprint-", "");

            logs.push(`7. Tìm requirement reference ${issueKey}...`);
            const sprintView = await fetch(`${process.env.SQUASH_BASE_URL}/backend/sprint-view/${sprintId}?frontEndErrorIsHandled=true`, {
                headers: { "X-XSRF-TOKEN": xsrfToken, "Cookie": getCookieString(cookiesMap) }
            }).then(r => r.json());

            let reqVersionId = null;
            function searchReq(obj) {
                if (!obj) return;
                if (obj.reference && obj.reference.toLowerCase() === issueKey.toLowerCase()) {
                    reqVersionId = obj.id || obj.sprintReqVersionId || obj.sprintReqVersionBindingId;
                }
                if (typeof obj === 'object') Object.values(obj).forEach(searchReq);
            }
            searchReq(sprintView);

            if (!reqVersionId) {
                logs.push(`⚠️ Không tìm thấy requirement.`);
                return { content: [{ type: "text", text: logs.join('\n') }] };
            }

            logs.push("8. Gán Test Case vào test plan...");
            await fetch(`${process.env.SQUASH_BASE_URL}/backend/sprint-req-version/${reqVersionId}/test-plan-items`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "X-XSRF-TOKEN": xsrfToken, "Cookie": getCookieString(cookiesMap) },
                body: JSON.stringify({ testCaseIds: [tcId] })
            });

            logs.push(`✅ Hoàn tất toàn bộ quy trình đẩy lên Squash TM cho ${testCaseName}`);
            return { content: [{ type: "text", text: logs.join('\n') }] };
        } catch (error) {
            logs.push(`❌ ERROR: ${error.message}`);
            return { isError: true, content: [{ type: "text", text: logs.join('\n') }] };
        }
    }
});

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
main();
