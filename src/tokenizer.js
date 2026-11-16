const KEYWORDS = new Set([
  'SELECT', 'FROM', 'WHERE', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET',
  'DELETE', 'CREATE', 'TABLE', 'AND', 'OR', 'INT', 'TEXT',
]);

const TOKEN_RE = /\s*(>=|<=|!=|=|<|>|\(|\)|,|\*|;|'[^']*'|\d+|[A-Za-z_]\w*)/y;

function tokenize(sql) {
  const tokens = [];
  let pos = 0;

  while (true) {
    TOKEN_RE.lastIndex = pos;
    const m = TOKEN_RE.exec(sql);
    if (!m) break;
    pos = TOKEN_RE.lastIndex;

    const t = m[1];
    if (/^\d+$/.test(t)) tokens.push({ type: 'NUMBER', value: Number(t) });
    else if (t.startsWith("'")) tokens.push({ type: 'STRING', value: t.slice(1, -1) });
    else if (KEYWORDS.has(t.toUpperCase())) tokens.push({ type: 'KEYWORD', value: t.toUpperCase() });
    else if (/^[A-Za-z_]/.test(t)) tokens.push({ type: 'IDENT', value: t });
    else tokens.push({ type: 'SYMBOL', value: t });
  }

  const rest = sql.slice(pos).trim();
  if (rest !== '') throw new Error(`Unexpected input near: ${rest.slice(0, 15)}`);
  return tokens;
}

module.exports = { tokenize };