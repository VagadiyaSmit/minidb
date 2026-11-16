const readline = require('readline');
const Database = require('./database');
const { tokenize } = require('./tokenizer');
const { parse } = require('./parser');
const { execute } = require('./executor');

const db = new Database('data/minidb.json');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: 'minidb> ',
});

console.log("MiniDB. Type SQL, or '.exit' to quit.");
rl.prompt();

rl.on('line', line => {
  const input = line.trim();
  if (input === '.exit') { rl.close(); return; }
  if (input !== '') {
    try {
      const result = execute(parse(tokenize(input)), db);
      if (Array.isArray(result)) {
        if (result.length === 0) console.log('(0 rows)');
        else console.table(result);
      } else console.log(result);

    } catch (e) {
      console.log('Error:', e.message);
    }
  }
  rl.prompt();
});

rl.on('close', () => process.exit(0));