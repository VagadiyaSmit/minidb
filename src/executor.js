const OPS = {
  '=': (a, b) => a === b,
  '!=': (a, b) => a !== b,
  '>': (a, b) => a > b,
  '<': (a, b) => a < b,
  '>=': (a, b) => a >= b,
  '<=': (a, b) => a <= b,
};

function buildPredicate(where, table) {
  if (!where) return () => true;

  if (where.type === 'AND' || where.type === 'OR') {
    const preds = where.conditions.map(c => buildPredicate(c, table));
    return where.type === 'AND'
      ? row => preds.every(p => p(row))
      : row => preds.some(p => p(row));
  }

  const col = table.columns.find(c => c.name === where.left);
  if (!col) throw new Error(`Unknown column: ${where.left}`);
  const expected = col.type === 'INT' ? 'number' : 'string';
  if (typeof where.right !== expected) {
    throw new Error(`Cannot compare ${col.name} (${col.type}) with a ${typeof where.right}`);
  }
  const fn = OPS[where.op];
  return row => fn(row[where.left], where.right);
}

function execute(ast, db) {
  switch (ast.type) {
    case 'CREATE_TABLE':
      db.createTable(ast.table, ast.columns);
      return `Table '${ast.table}' created`;

    case 'INSERT': {
      const table = db.getTable(ast.table);
      if (ast.values.length !== table.columns.length) {
        throw new Error(
          `Table '${ast.table}' has ${table.columns.length} columns but ${ast.values.length} values were given`
        );
      }
      const row = {};
      table.columns.forEach((col, i) => { row[col.name] = ast.values[i]; });
      db.insert(ast.table, row);
      return '1 row inserted';
    }

    case 'SELECT': {
      const table = db.getTable(ast.table);
      const names = ast.columns[0] === '*' ? table.columns.map(c => c.name) : ast.columns;
      for (const n of names) {
        if (!table.columns.some(c => c.name === n)) throw new Error(`Unknown column: ${n}`);
      }
      const rows = db.select(ast.table, buildPredicate(ast.where, table));
      return rows.map(r => {
        const out = {};
        for (const n of names) out[n] = r[n];
        return out;
      });
    
    }
    case 'UPDATE': {
      const table = db.getTable(ast.table);
      const pred = buildPredicate(ast.where, table);
      const n = db.update(ast.table, pred, ast.changes);
      return `${n} row(s) updated`;
    }

    case 'DELETE': {
      const table = db.getTable(ast.table);
      const pred = buildPredicate(ast.where, table);
      const n = db.delete(ast.table, pred);
      return `${n} row(s) deleted`;
    }

    default:
      throw new Error(`Cannot execute ${ast.type}`);
  }
}

module.exports = { execute };