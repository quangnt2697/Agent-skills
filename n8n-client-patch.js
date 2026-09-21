// --- Thêm đoạn code này vào cuối file n8n-client.js để hỗ trợ CLI ---
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const action = args[0];
  if (!action) {
    console.error("Usage: node n8n-client.js <action> [args...]");
    process.exit(1);
  }

  (async () => {
    try {
      let result;
      switch(action) {
        case 'ping':
          result = await isN8nAvailable();
          break;
        case 'prepJiraContext':
          result = await prepJiraContext(args[1]);
          break;
        case 'batchSquashPush':
          result = await batchSquashPush(JSON.parse(args[1] || '{}'));
          break;
        case 'getStandupReport':
          result = await getStandupReport();
          break;
        case 'triggerAsyncTest':
          result = await triggerAsyncTest(JSON.parse(args[1] || '{}'));
          break;
        default:
          console.error(`Unknown action: ${action}`);
          process.exit(1);
      }
      console.log(JSON.stringify(result, null, 2));
    } catch (e) {
      console.error(JSON.stringify({ error: e.message }));
      process.exit(1);
    }
  })();
}
