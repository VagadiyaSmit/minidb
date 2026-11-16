const Database = require('../src/database');

const db = new Database('data/test.json');

if (!db.tables.users) {
  db.createTable('users', [{ name: 'id', type: 'INT' }, { name: 'name', type: 'TEXT' }]);
  db.insert('users', { id: 1, name: 'Smit' });
  db.insert('users', { id: 2, name: 'Amit' });
  console.log('First run: created and inserted.');
}

console.table(db.select('users'));
console.table(db.select('users', r => r.id > 1));
db.update('users', r => r.id === 2, { name: 'Changed' });
db.delete('users', r => r.id === 1);
console.table(db.select('users'));