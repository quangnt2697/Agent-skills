import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const scriptPath = path.resolve(__dirname, '..', 'n8n-nodes', 'ba', 'jira-clean-payload.js');

function runCleanPayloadNode(payload, env = {}) {
  const code = fs.readFileSync(scriptPath, 'utf8');
  const mockInput = {
    first: () => ({ json: payload })
  };
  const mockEnv = {
    AGENT_WORKSPACE_DIR: path.resolve(__dirname, '..', '..'),
    ATLASSIAN_BASE_URL: 'https://entrade.atlassian.net',
    ...env
  };

  const fn = new Function('$input', '$env', 'require', code);
  return fn(mockInput, mockEnv, require);
}

test('jira-clean-payload: trích xuất đa nguồn Parent, Comments, Linked Issues, Remote Links, Confluence Docs và Attachments', () => {
  // Mock HTTP GET responses cho /remotelink, parent, linked issue, confluence và attachment
  globalThis.__mockJiraCleanHttpGet = (url) => {
    if (url.endsWith('/rest/api/3/issue/G3PTP-TESTMULTI/remotelink')) {
      return JSON.stringify([
        {
          id: 101,
          object: {
            url: 'https://entrade.atlassian.net/wiki/spaces/KRX/pages/777666/RemoteLinkedSpec',
            title: 'Tài liệu KRX gắn qua Remote Link'
          }
        }
      ]);
    }
    if (url.includes('/rest/api/3/issue/G3PTP-EPIC1')) {
      return JSON.stringify({
        key: 'G3PTP-EPIC1',
        fields: {
          summary: 'Epic Nâng Cấp Hệ Thống Khớp Lệnh',
          status: { name: 'In Progress' },
          issuetype: { name: 'Epic' },
          description: {
            type: 'doc',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Nội dung chi tiết của Epic: áp dụng cho toàn bộ 3 sàn HOSE, HNX, UPCoM.' }]
              }
            ]
          }
        }
      });
    }
    if (url.includes('/rest/api/3/issue/G3PTP-555')) {
      return JSON.stringify({
        key: 'G3PTP-555',
        fields: {
          summary: 'Dịch vụ xác thực SmartOTP',
          status: { name: 'Done' },
          issuetype: { name: 'Task' },
          description: {
            type: 'doc',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Mô tả chi tiết của ticket liên kết G3PTP-555: Token OTP có hiệu lực 60 giây.' }]
              }
            ]
          }
        }
      });
    }
    if (url.includes('/wiki/api/v2/pages/999888')) {
      return JSON.stringify({
        id: '999888',
        title: 'OrderGuide',
        body: {
          storage: {
            value: '<h2>Quy tắc đặt lệnh</h2><p>Khối lượng tối thiểu lô chẵn là 100 cổ phiếu.</p>'
          }
        }
      });
    }
    if (url.includes('/wiki/api/v2/pages/777666')) {
      return JSON.stringify({
        id: '777666',
        title: 'RemoteLinkedSpec',
        body: {
          storage: {
            value: '<h2>Quy định KRX</h2><p>Không cho phép sửa giá lệnh ATO và ATC trong phiên định kỳ.</p>'
          }
        }
      });
    }
    if (url === 'https://jira/att-1') {
      return 'Noi dung file dinh kem rules.txt';
    }
    return null;
  };

  try {
    const mockJiraData = {
      key: 'G3PTP-TESTMULTI',
      fields: {
        summary: 'Thử nghiệm tính năng Đa nguồn',
        issuetype: { name: 'Story' },
        status: { name: 'Open' },
        priority: { name: 'High' },
        assignee: { displayName: 'Tester' },
        reporter: { displayName: 'BA PO' },
        description: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                { type: 'text', text: 'Xem tài liệu tại https://entrade.atlassian.net/wiki/spaces/TECH/pages/999888/OrderGuide' }
              ]
            }
          ]
        },
        parent: {
          key: 'G3PTP-EPIC1',
          fields: {
            summary: 'Epic Nâng Cấp Hệ Thống Khớp Lệnh',
            status: { name: 'In Progress' },
            issuetype: { name: 'Epic' }
          }
        },
        comment: {
          comments: [
            {
              id: 'c1',
              author: { displayName: 'Dev Lead' },
              created: '2026-10-29T10:00:00.000Z',
              body: {
                type: 'doc',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'Chốt bước giá cho sàn HOSE là 10đ.' }]
                  }
                ]
              }
            }
          ]
        },
        issuelinks: [
          {
            type: { outward: 'blocks', inward: 'is blocked by' },
            outwardIssue: {
              key: 'G3PTP-555',
              fields: { summary: 'Dịch vụ xác thực SmartOTP', status: { name: 'Done' }, issuetype: { name: 'Task' } }
            }
          }
        ],
        attachment: [
          { id: 'att-1', filename: 'rules.txt', size: 1024, mimeType: 'text/plain', content: 'https://jira/att-1' }
        ]
      }
    };

    const result = runCleanPayloadNode(mockJiraData);
    assert.equal(result.length, 1);
    const data = result[0].json;

    assert.equal(data.isError, false);
    assert.equal(data.issueKey, 'G3PTP-TESTMULTI');

    // 1. Kiểm tra Parent (cả summary + description hydrated)
    assert.ok(data.parent);
    assert.equal(data.parent.key, 'G3PTP-EPIC1');
    assert.ok(data.parent.descriptionMarkdown.includes('áp dụng cho toàn bộ 3 sàn HOSE, HNX, UPCoM'));

    // 2. Kiểm tra Comments
    assert.equal(data.comments.length, 1);
    assert.equal(data.comments[0].author, 'Dev Lead');
    assert.ok(data.comments[0].body.includes('Chốt bước giá cho sàn HOSE là 10đ'));

    // 3. Kiểm tra Linked Issues (cả description hydrated)
    assert.equal(data.linkedIssues.length, 1);
    assert.equal(data.linkedIssues[0].key, 'G3PTP-555');
    assert.ok(data.linkedIssues[0].descriptionMarkdown.includes('Token OTP có hiệu lực 60 giây'));

    // 4. Kiểm tra Confluence Links (từ cả description + /remotelink) & Confluence Docs
    assert.equal(data.confluenceLinks.length, 2);
    assert.ok(data.confluenceLinks.some(u => u.includes('999888')));
    assert.ok(data.confluenceLinks.some(u => u.includes('777666')));
    assert.equal(data.confluenceDocs.length, 2);

    // 5. Kiểm tra các file hydrated trên đĩa trong source/ và source/refs/
    const wsDir = path.resolve(__dirname, '..', '..', 'workspace', 'issues', 'G3PTP-TESTMULTI', 'source');
    const refsDir = path.join(wsDir, 'refs');
    assert.ok(fs.existsSync(path.join(wsDir, 'multi-source-context.md')));
    assert.ok(fs.existsSync(path.join(refsDir, 'parent-G3PTP-EPIC1.md')));
    assert.ok(fs.existsSync(path.join(refsDir, 'linked-G3PTP-555.md')));
    assert.ok(fs.existsSync(path.join(refsDir, 'confluence-999888.md')));
    assert.ok(fs.existsSync(path.join(refsDir, 'confluence-777666.md')));
    assert.ok(fs.existsSync(path.join(refsDir, 'rules.txt')));

    const multiCtx = fs.readFileSync(path.join(wsDir, 'multi-source-context.md'), 'utf8');
    assert.ok(multiCtx.includes('áp dụng cho toàn bộ 3 sàn HOSE, HNX, UPCoM'));
    assert.ok(multiCtx.includes('Token OTP có hiệu lực 60 giây'));
    assert.ok(multiCtx.includes('Khối lượng tối thiểu lô chẵn là 100 cổ phiếu'));
    assert.ok(multiCtx.includes('Không cho phép sửa giá lệnh ATO và ATC'));

    // Cleanup
    fs.rmSync(path.resolve(__dirname, '..', '..', 'workspace', 'issues', 'G3PTP-TESTMULTI'), { recursive: true, force: true });
  } finally {
    delete globalThis.__mockJiraCleanHttpGet;
  }
});
