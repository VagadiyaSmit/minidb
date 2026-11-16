const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Database = require('../src/database');
const { tokenize } = require('../src/tokenizer');
const { parse } = require('../src/parser');
const { execute } = require('../src/executor');

function freshDb() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'minidb-'));
  const file = path.join(dir, 'db.json');
  return { file, db: new Database(file) };
}
const run = (db, sql) => execute(parse(tokenize(sql)), db);

test('create and insert', () => {
  const { db } = freshDb();
  run(db, 'CREATE TABLE users (id INT, name TEXT)');
  run(db, "INSERT INTO users VALUES (1, 'Smit')");
  assert.deepStrictEqual(db.select('users'), [{ id: 1, name: 'Smit' }]);
});

test('data persists across a new Database instance', () => {
  const { file, db } = freshDb();
  run(db, 'CREATE TABLE users (id INT, name TEXT)');
  run(db, "INSERT INTO users VALUES (1, 'Smit')");
  const reopened = new Database(file);
  assert.deepStrictEqual(reopened.select('users'), [{ id: 1, name: 'Smit' }]);
});

test('executor errors', () => {
  const { db } = freshDb();
  run(db, 'CREATE TABLE users (id INT, name TEXT)');
  assert.throws(() => run(db, 'CREATE TABLE users (id INT)'), /already exists/);
  assert.throws(() => run(db, "INSERT INTO nope VALUES (1)"), /No such table/);
  assert.throws(() => run(db, "INSERT INTO users VALUES (1)"), /2 columns but 1 values/);
  assert.throws(() => run(db, "INSERT INTO users VALUES ('x', 'y')"), /id must be INT/);
  assert.strictEqual(db.select('users').length, 0); // failed inserts left nothing behind
});

function seeded() {
  const { db } = freshDb();
  run(db, 'CREATE TABLE users (id INT, name TEXT)');
  run(db, "INSERT INTO users VALUES (1, 'Smit')");
  run(db, "INSERT INTO users VALUES (2, 'Amit')");
  run(db, "INSERT INTO users VALUES (3, 'Zara')");
  return db;
}

test('select all and projection', () => {
  const db = seeded();
  assert.strictEqual(run(db, 'SELECT * FROM users').length, 3);
  assert.deepStrictEqual(run(db, 'SELECT name FROM users'), [
    { name: 'Smit' }, { name: 'Amit' }, { name: 'Zara' },
  ]);
});

test('select where', () => {
  const db = seeded();
  assert.deepStrictEqual(run(db, 'SELECT id FROM users WHERE id > 1'), [{ id: 2 }, { id: 3 }]);
  assert.deepStrictEqual(run(db, "SELECT id FROM users WHERE name = 'Amit'"), [{ id: 2 }]);
  assert.deepStrictEqual(run(db, 'SELECT * FROM users WHERE id = 99'), []);
});

test('select errors', () => {
  const db = seeded();
  assert.throws(() => run(db, 'SELECT nope FROM users'), /Unknown column: nope/);
  assert.throws(() => run(db, 'SELECT * FROM users WHERE nope = 1'), /Unknown column: nope/);
  assert.throws(() => run(db, "SELECT * FROM users WHERE id = 'x'"), /Cannot compare id \(INT\) with a string/);
  assert.throws(() => run(db, 'SELECT * FROM nope'), /No such table/);
});

test('select result cannot mutate stored data', () => {
  const db = seeded();
  run(db, 'SELECT * FROM users')[0].name = 'HACKED';
  assert.strictEqual(db.select('users')[0].name, 'Smit');
});

test('select where and/or', () => {
  const db = seeded();
  assert.deepStrictEqual(run(db, 'SELECT id FROM users WHERE id > 1 AND id < 3'), [{ id: 2 }]);
  assert.deepStrictEqual(
    run(db, "SELECT id FROM users WHERE id = 1 OR name = 'Zara'"), [{ id: 1 }, { id: 3 }]);
  // precedence: id = 1 OR (id = 2 AND name = 'Zara'). Left-to-right evaluation would return [].
  assert.deepStrictEqual(
    run(db, "SELECT id FROM users WHERE id = 1 OR id = 2 AND name = 'Zara'"), [{ id: 1 }]);
  assert.throws(() => run(db, 'SELECT * FROM users WHERE id = 1 OR nope = 2'), /Unknown column: nope/);
});

test('update', () => {
  const db = seeded();
  assert.strictEqual(run(db, "UPDATE users SET name = 'Z' WHERE id = 1"), '1 row(s) updated');
  assert.deepStrictEqual(run(db, 'SELECT name FROM users WHERE id = 1'), [{ name: 'Z' }]);
  assert.strictEqual(run(db, "UPDATE users SET name = 'All'"), '3 row(s) updated');
  assert.strictEqual(run(db, "UPDATE users SET name = 'n' WHERE id = 99"), '0 row(s) updated');
});

test('delete', () => {
  const db = seeded();
  assert.strictEqual(run(db, 'DELETE FROM users WHERE id > 1'), '2 row(s) deleted');
  assert.deepStrictEqual(run(db, 'SELECT id FROM users'), [{ id: 1 }]);
  assert.strictEqual(run(db, 'DELETE FROM users'), '1 row(s) deleted');
  assert.deepStrictEqual(run(db, 'SELECT * FROM users'), []);
});

test('failed update changes nothing', () => {
  const db = seeded();
  assert.throws(() => run(db, "UPDATE users SET name = 'Q', id = 'x'"), /id must be INT/);
  assert.throws(() => run(db, 'UPDATE users SET nope = 1'), /Unknown column: nope/);
  assert.throws(() => run(db, "UPDATE users SET name = 'Q' WHERE nope = 1"), /Unknown column: nope/);
  assert.deepStrictEqual(run(db, 'SELECT name FROM users'), [
    { name: 'Smit' }, { name: 'Amit' }, { name: 'Zara' },
  ]);
});