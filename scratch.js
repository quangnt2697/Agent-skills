const fs = require('fs');
const file = 'n8n-workflows/mattermost-single-router.json';
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

// 1. Update AI Prompt
const aiNode = data.nodes.find(n => n.name === 'Antigravity Intent Recognition');
if (aiNode) {
  aiNode.parameters.jsonBody = aiNode.parameters.jsonBody.replace(
    'standup|test|jira|squash|sync|help',
    'standup|run-test|recon|jira|squash|sync|help'
  ).replace(
    'test=chạy test/kiểm thử/recon',
    'run-test=chạy test/kiểm thử (params.issueKey bắt buộc), recon=đối chiếu dữ liệu/watchdog'
  );
}

// 2. Update Fallback Parse AI Output
const parseNode = data.nodes.find(n => n.name === 'Parse AI Output');
if (parseNode) {
  let jsCode = parseNode.parameters.jsCode;
  
  jsCode = jsCode.replace(
    `if (clean.includes('test') || clean.includes('kiểm thử') || clean.includes('recon')) return { intent: 'test' };`,
    `if (clean.includes('recon')) return { intent: 'recon' };\n  if (clean.includes('test') || clean.includes('kiểm thử')) {\n    const match = clean.match(/([a-z0-9]+-[0-9]+)/i);\n    return { intent: 'run-test', params: { issueKey: match ? match[1].toUpperCase() : '' } };\n  }`
  );
  
  jsCode = jsCode.replace(
    `const validIntents = ['standup', 'test', 'jira', 'squash', 'sync', 'help'];`,
    `const validIntents = ['standup', 'run-test', 'recon', 'jira', 'squash', 'sync', 'help'];`
  );
  
  jsCode = jsCode.replace(
    `if (data.intent === 'jira' && (!data.params || !data.params.issueKey)) {`,
    `if ((data.intent === 'jira' || data.intent === 'run-test') && (!data.params || !data.params.issueKey)) {`
  );
  
  parseNode.parameters.jsCode = jsCode;
}

// 3. Update Switch Node
const switchNode = data.nodes.find(n => n.name === 'Switch by Intent');
if (switchNode) {
  switchNode.parameters.output = `={{ ['standup', 'run-test', 'recon', 'jira', 'squash', 'sync'].indexOf($json.intent) !== -1 ? ['standup', 'run-test', 'recon', 'jira', 'squash', 'sync'].indexOf($json.intent) : 6 }}`;
  switchNode.parameters.numberOutputs = 7;
}

// 4. Rename Execute Test/Recon Workflow to Execute Recon Workflow
const reconNode = data.nodes.find(n => n.name === 'Execute Test/Recon Workflow');
if (reconNode) {
  reconNode.name = 'Execute Recon Workflow';
}

// 5. Add new Execute QA Run Test Workflow
const qaRunTestNodeId = "qa-run-test-node-" + Date.now();
const qaRunTestNode = {
  "parameters": {
    "workflowId": "qa-run-test-workflow-id",
    "mode": "wait"
  },
  "id": qaRunTestNodeId,
  "name": "Execute QA Run Test",
  "type": "n8n-nodes-base.executeWorkflow",
  "typeVersion": 1,
  "position": [
    1160,
    150
  ],
  "onError": "continueRegularOutput"
};
data.nodes.push(qaRunTestNode);

// 6. Update Help Menu
const helpNode = data.nodes.find(n => n.name === 'Respond Help Menu');
if (helpNode) {
  helpNode.parameters.jsonBody = helpNode.parameters.jsonBody
    .replace('`/agent test`: Khảo sát đối chiếu dữ liệu thị trường KRX MDDS Ticks v3 hôm nay.', '`/agent recon`: Khảo sát đối chiếu dữ liệu thị trường KRX MDDS Ticks v3 hôm nay.\\n- `/agent run-test <issueKey>`: Thực thi kiểm thử automation cho issue được chỉ định (tự động tìm file test trong thư mục workspace).');
}

// 7. Update connections from Switch Node
if (data.connections['Switch by Intent'] && data.connections['Switch by Intent']['main'] && data.connections['Switch by Intent']['main'][0]) {
  const switchOutputs = data.connections['Switch by Intent']['main'][0];
  
  // Create a completely new outputs array mapping to ['standup', 'run-test', 'recon', 'jira', 'squash', 'sync', 'help']
  const newOutputs = [
    [{ "node": "Execute Standup Workflow", "type": "main", "index": 0 }], // standup (0)
    [{ "node": "Execute QA Run Test", "type": "main", "index": 0 }],      // run-test (1)
    [{ "node": "Execute Recon Workflow", "type": "main", "index": 0 }],   // recon (2)
    [{ "node": "Execute Jira Ingestor", "type": "main", "index": 0 }],    // jira (3)
    [{ "node": "Execute Squash Pusher", "type": "main", "index": 0 }],    // squash (4)
    [{ "node": "Execute Repo Sync Workflow", "type": "main", "index": 0 }], // sync (5)
    [{ "node": "Respond Help Menu", "type": "main", "index": 0 }]         // help (6)
  ];
  data.connections['Switch by Intent']['main'] = [newOutputs];
}

// 8. Connect new node to Error check
if (data.connections['Execute QA Run Test'] === undefined) {
  data.connections['Execute QA Run Test'] = {
    "main": [
      [
        {
          "node": "Check Router Execution Error",
          "type": "main",
          "index": 0
        }
      ]
    ]
  };
}

// 9. Re-connect Execute Recon Workflow properly (name changed)
if (data.connections['Execute Test/Recon Workflow']) {
  data.connections['Execute Recon Workflow'] = data.connections['Execute Test/Recon Workflow'];
  delete data.connections['Execute Test/Recon Workflow'];
}

fs.writeFileSync(file, JSON.stringify(data, null, 2));
console.log('Done modifying mattermost-single-router.json');
