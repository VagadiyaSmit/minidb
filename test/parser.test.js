const test = require('node:test');
const assert = require('node:assert');
const { tokenize } = require('../src/tokenizer');
const { parse } = require('../src/parser');

const p = sql => parse(tokenize(sql));

test('create table', () => {
  assert.deepStrictEqual(p('CREATE TABLE users (id INT, name TEXT);'), {
    type: 'CREATE_TABLE',
    table: 'users',
    columns: [{ name: 'id', type: 'INT' }, { name: 'name', type: 'TEXT' }],
  });
});

test('insert', () => {
  assert.deepStrictEqual(p("insert into users values (1, 'Smit')"), {
    type: 'INSERT',
    table: 'users',
    values: [1, 'Smit'],
  });
});

test('create table errors', () => {
  assert.throws(() => p('CREATE TABLE users'), /Expected '\('/);
  assert.throws(() => p('CREATE TABLE users (id)'), /Expected column type/);
  assert.throws(() => p('CREATE TABLE users (id INT, id TEXT)'), /Duplicate column/);
  assert.throws(() => p('CREATE TABLE users (id INT,)'), /Expected column name/);
});

test('insert errors', () => {
  assert.throws(() => p('INSERT INTO users VALUES ()'), /Expected a number/);
  assert.throws(() => p('INSERT users VALUES (1)'), /Expected INTO/);
  assert.throws(() => p('INSERT INTO users VALUES (1) banana'), /Unexpected 'banana'/);
  assert.throws(() => p('INSERT INTO users VALUES (1'), /Expected '\)'/);
});

test('empty and unsupported', () => {
  assert.throws(() => p(''), /Empty query/);
  assert.throws(() => p('DROP TABLE users'), /Unsupported statement/);
});

test('select', () => {
  assert.deepStrictEqual(p('SELECT * FROM users'), {
    type: 'SELECT', columns: ['*'], table: 'users', where: null,
  });
  assert.deepStrictEqual(p('select id, name from users where id >= 2;'), {
    type: 'SELECT', columns: ['id', 'name'], table: 'users',
    where: { left: 'id', op: '>=', right: 2 },
  });
});

test('select errors', () => {
  assert.throws(() => p('SELECT FROM users'), /Expected column name but found 'FROM'/);
  assert.throws(() => p('SELECT name, FROM users'), /Expected column name/);
  assert.throws(() => p('SELECT * users'), /Expected FROM/);
  assert.throws(() => p('SELECT * FROM users WHERE'), /Expected column name/);
  assert.throws(() => p('SELECT * FROM users WHERE id 5'), /Expected a comparison operator/);
  assert.throws(() => p('SELECT * FROM users WHERE id >'), /Expected a number/);
  assert.throws(() => p('SELECT * FROM users WHERE id > 1 AND'), /Expected column name/);
  assert.throws(() => p('SELECT * FROM users WHERE id > 1 AND'), /Expected column name/);
});

test('where and/or precedence', () => {
  const c = (left, op, right) => ({ left, op, right });
  assert.deepStrictEqual(p('SELECT * FROM t WHERE a = 1 AND b = 2').where, {
    type: 'AND', conditions: [c('a', '=', 1), c('b', '=', 2)],
  });
  // AND binds tighter than OR
  assert.deepStrictEqual(p('SELECT * FROM t WHERE a = 1 OR b = 2 AND c = 3').where, {
    type: 'OR',
    conditions: [c('a', '=', 1), { type: 'AND', conditions: [c('b', '=', 2), c('c', '=', 3)] }],
  });
});

test('update and delete', () => {
  assert.deepStrictEqual(p("UPDATE users SET name = 'X', id = 5 WHERE id = 1"), {
    type: 'UPDATE', table: 'users',
    changes: { name: 'X', id: 5 },
    where: { left: 'id', op: '=', right: 1 },
  });
  assert.deepStrictEqual(p('delete from users;'), { type: 'DELETE', table: 'users', where: null });
});

test('update and delete errors', () => {
  assert.throws(() => p('UPDATE users'), /Expected SET/);
  assert.throws(() => p('UPDATE users SET name'), /Expected '='/);
  assert.throws(() => p('UPDATE users SET name ='), /Expected a number/);
  assert.throws(() => p('UPDATE users SET a = 1, a = 2'), /Duplicate column in SET/);
  assert.throws(() => p('UPDATE users SET a = 1 WHERE'), /Expected column name/);
  assert.throws(() => p('DELETE users'), /Expected FROM/);
  assert.throws(() => p('DELETE FROM'), /Expected table name/);
});