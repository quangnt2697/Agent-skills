const fs = require('fs');
const path = require('path');
const md2adf = require('md-to-adf');

// --- Hỗ trợ parse .env thủ công (vì không cài dotenv) ---
function loadEnv() {
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
        const envConfig = fs.readFileSync(envPath, 'utf8');
        envConfig.split('\n').forEach(line => {
            const match = line.match(/^([^#\s][^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                let value = match[2].trim();
                if (value.startsWith('"') && value.endsWith('"')) {
                    value = value.slice(1, -1);
                } else if (value.startsWith("'") && value.endsWith("'")) {
                    value = value.slice(1, -1);
                }
                process.env[key] = value;
            }
        });
    }
}

async function main() {
    loadEnv();

    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.error("❌ Cách dùng: node jira-push-spec.js <JIRA_ISSUE_KEY> <ĐƯỜNG_DẪN_FILE_MD>");
        process.exit(1);
    }

    const issueKey = args[0];
    const mdFilePath = args[1];

    const baseUrl = process.env.JIRA_BASE_URL?.replace(/\/$/, '');
    const email = process.env.JIRA_EMAIL;
    const apiToken = process.env.JIRA_API_TOKEN;

    if (!baseUrl || !email || !apiToken) {
        console.error("❌ Thiếu biến môi trường (JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN). Vui lòng check file .env");
        process.exit(1);
    }

    if (!fs.existsSync(mdFilePath)) {
        console.error(`❌ Không tìm thấy file Markdown: ${mdFilePath}`);
        process.exit(1);
    }

    console.log(`⏳ Đang đọc file: ${mdFilePath}`);
    let markdownContent = fs.readFileSync(mdFilePath, 'utf8');

    console.log(`⏳ Đang chuyển đổi Markdown sang Jira ADF...`);
    let adfContent;
    try {
        adfContent = md2adf(markdownContent);
    } catch (err) {
        console.error("❌ Lỗi khi parse Markdown sang ADF:", err.message);
        process.exit(1);
    }

    const apiUrl = `${baseUrl}/rest/api/3/issue/${issueKey}`;
    console.log(`🌐 Đang đẩy lên Jira: ${apiUrl}`);

    const authHeader = 'Basic ' + Buffer.from(`${email}:${apiToken}`).toString('base64');

    const body = {
        fields: {
            description: adfContent
        }
    };

    try {
        const response = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
                'Authorization': authHeader,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (response.ok) {
            console.log(`✅ Thành công! Đã ghi đè Description của ticket ${issueKey}.`);
            console.log(`👉 Xem ticket tại: ${baseUrl}/browse/${issueKey}`);
        } else {
            const errorText = await response.text();
            console.error(`❌ Cập nhật thất bại. HTTP Status: ${response.status}`);
            console.error("Chi tiết lỗi:", errorText);
            process.exit(1);
        }
    } catch (err) {
        console.error("❌ Lỗi mạng khi gọi Jira API:", err.message);
        process.exit(1);
    }
}

main();
