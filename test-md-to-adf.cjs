const md2adf = require('md-to-adf');
const doc = md2adf('Hello <br> world\n\n| H |\n|---|\n| A <br/> B |');
console.log(JSON.stringify(doc, null, 2));
