const test = require('node:test');
const assert = require('node:assert');
const { tokenize } = require('../src/tokenizer');

test('basic select', () => {
  assert.deepStrictEqual(tokenize('SELECT * FROM users WHERE age > 18'), [
    { type: 'KEYWORD', value: 'SELECT' },
    { type: 'SYMBOL', value: '*' },
    { type: 'KEYWORD', value: 'FROM' },
    { type: 'IDENT', value: 'users' },
    { type: 'KEYWORD', value: 'WHERE' },
    { type: 'IDENT', value: 'age' },
    { type: 'SYMBOL', value: '>' },
    { type: 'NUMBER', value: 18 },
  ]);
});

test('keywords are case-insensitive, identifiers keep case', () => {
  const t = tokenize('select Name from Users');
  assert.strictEqual(t[0].value, 'SELECT');
  assert.strictEqual(t[1].value, 'Name');
});

test('strings and two-character operators', () => {
  const t = tokenize("WHERE name != 'Smit' AND age >= 5");
  assert.deepStrictEqual(t[2], { type: 'SYMBOL', value: '!=' });
  assert.deepStrictEqual(t[3], { type: 'STRING', value: 'Smit' });
  assert.deepStrictEqual(t[6], { type: 'SYMBOL', value: '>=' });
});

test('throws on unknown character', () => {
  assert.throws(() => tokenize('SELECT @ FROM users'), /Unexpected input/);
});

test('throws on unterminated string', () => {
  assert.throws(() => tokenize("WHERE name = 'abc"), /Unexpected input/);
});