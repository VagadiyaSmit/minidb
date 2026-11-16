const fs = require('fs');
const path = require('path');

function load(file) {
  if (!fs.existsSync(file)) return { tables: {} };
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function save(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, file);
}

module.exports = { load, save };