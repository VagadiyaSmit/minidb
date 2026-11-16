function parse(tokens) {
  let pos = 0;

  const peek = () => tokens[pos];
  const next = () => tokens[pos++];
  const describe = t => (t ? `'${t.value}'` : 'end of input');

  function isSymbol(sym) {
    const t = peek();
    return t !== undefined && t.type === 'SYMBOL' && t.value === sym;
  }

  function matchSymbol(sym) {
    if (isSymbol(sym)) { pos++; return true; }
    return false;
  }

  function expectKeyword(word) {
    const t = next();
    if (!t || t.type !== 'KEYWORD' || t.value !== word) {
      throw new Error(`Expected ${word} but found ${describe(t)}`);
    }
  }

  function expectSymbol(sym) {
    const t = next();
    if (!t || t.type !== 'SYMBOL' || t.value !== sym) {
      throw new Error(`Expected '${sym}' but found ${describe(t)}`);
    }
  }

  function expectIdent(what) {
    const t = next();
    if (!t || t.type !== 'IDENT') {
      throw new Error(`Expected ${what} but found ${describe(t)}`);
    }
    return t.value;
  }

  function parseLiteral() {
    const t = next();
    if (!t || (t.type !== 'NUMBER' && t.type !== 'STRING')) {
      throw new Error(`Expected a number or 'string' but found ${describe(t)}`);
    }
    return t.value;
  }

  // CREATE TABLE users (id INT, name TEXT)
  function parseCreate() {
    expectKeyword('CREATE');
    expectKeyword('TABLE');
    const table = expectIdent('table name');
    expectSymbol('(');

    const columns = [];
    do {
      const name = expectIdent('column name');
      const t = next();
      if (!t || t.type !== 'KEYWORD' || (t.value !== 'INT' && t.value !== 'TEXT')) {
        throw new Error(`Expected column type INT or TEXT but found ${describe(t)}`);
      }
      if (columns.some(c => c.name === name)) {
        throw new Error(`Duplicate column: ${name}`);
      }
      columns.push({ name, type: t.value });
    } while (matchSymbol(','));

    expectSymbol(')');
    return { type: 'CREATE_TABLE', table, columns };
  }

  // INSERT INTO users VALUES (1, 'Smit')
  function parseInsert() {
    expectKeyword('INSERT');
    expectKeyword('INTO');
    const table = expectIdent('table name');
    expectKeyword('VALUES');
    expectSymbol('(');

    const values = [];
    do {
      values.push(parseLiteral());
    } while (matchSymbol(','));

    expectSymbol(')');
    return { type: 'INSERT', table, values };
  }

  function isKeyword(word) {
    const t = peek();
    return t !== undefined && t.type === 'KEYWORD' && t.value === word;
  }

  const COMPARISON_OPS = new Set(['=', '!=', '<', '>', '<=', '>=']);

  // age > 18
  function parseCondition() {
    const left = expectIdent('column name');
    const t = next();
    if (!t || t.type !== 'SYMBOL' || !COMPARISON_OPS.has(t.value)) {
      throw new Error(`Expected a comparison operator but found ${describe(t)}`);
    }
    const right = parseLiteral();
    return { left, op: t.value, right };
  }

    // a AND b AND c
  function parseAnd() {
    const parts = [parseCondition()];
    while (isKeyword('AND')) { pos++; parts.push(parseCondition()); }
    return parts.length === 1 ? parts[0] : { type: 'AND', conditions: parts };
  }

  // x OR y OR z, where each part may be an AND group
  function parseWhere() {
    const parts = [parseAnd()];
    while (isKeyword('OR')) { pos++; parts.push(parseAnd()); }
    return parts.length === 1 ? parts[0] : { type: 'OR', conditions: parts };
  }


  // SELECT * FROM users WHERE age > 18
  function parseSelect() {
    expectKeyword('SELECT');

    let columns;
    if (matchSymbol('*')) {
      columns = ['*'];
    } else {
      columns = [];
      do {
        columns.push(expectIdent('column name'));
      } while (matchSymbol(','));
    }

    expectKeyword('FROM');
    const table = expectIdent('table name');

    let where = null;
    if (isKeyword('WHERE')) {
      pos++;
      where = parseWhere();
    }
    return { type: 'SELECT', columns, table, where };
  }

    function parseOptionalWhere() {
    if (isKeyword('WHERE')) { pos++; return parseWhere(); }
    return null;
  }

  // UPDATE users SET name = 'X', id = 5 WHERE id = 1
  function parseUpdate() {
    expectKeyword('UPDATE');
    const table = expectIdent('table name');
    expectKeyword('SET');
    const changes = {};
    do {
      const col = expectIdent('column name');
      expectSymbol('=');
      if (Object.hasOwn(changes, col)) throw new Error(`Duplicate column in SET: ${col}`);
      changes[col] = parseLiteral();
    } while (matchSymbol(','));
    return { type: 'UPDATE', table, changes, where: parseOptionalWhere() };
  }

  // DELETE FROM users WHERE id = 1
  function parseDelete() {
    expectKeyword('DELETE');
    expectKeyword('FROM');
    const table = expectIdent('table name');
    return { type: 'DELETE', table, where: parseOptionalWhere() };
  }

  const first = peek();
  if (!first) throw new Error('Empty query');

  let ast;
  if (first.type === 'KEYWORD' && first.value === 'CREATE') ast = parseCreate();
  else if (first.type === 'KEYWORD' && first.value === 'INSERT') ast = parseInsert();
  else if (first.type === 'KEYWORD' && first.value === 'SELECT') ast = parseSelect();
  else if (first.type === 'KEYWORD' && first.value === 'UPDATE') ast = parseUpdate();
  else if (first.type === 'KEYWORD' && first.value === 'DELETE') ast = parseDelete();
  else throw new Error(`Unsupported statement starting with ${describe(first)}`);

  matchSymbol(';');
  if (pos < tokens.length) {
    throw new Error(`Unexpected ${describe(peek())} after end of statement`);
  }
  return ast;


}

module.exports = { parse };