const Database = require('../src/database');
const db = new Database('data/test.json');

try { db.insert('users', { id: 'abc', name: 'x' }); }
catch (e) { console.log('Expected error 1:', e.message); }

try { db.select('nope'); }
catch (e) { console.log('Expected error 2:', e.message); }

try { db.update('users', () => true, { age: 5 }); }
catch (e) { console.log('Expected error 3:', e.message); }