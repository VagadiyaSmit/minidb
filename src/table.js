class Table {
  constructor(name, columns) {
    this.name = name;
    this.columns = columns; // [{ name: 'id', type: 'INT' }, ...]
    this.rows = [];
  }

  _check(col, v) {
    if (col.type === 'INT' && !Number.isInteger(v)) throw new Error(`${col.name} must be INT`);
    if (col.type === 'TEXT' && typeof v !== 'string') throw new Error(`${col.name} must be TEXT`);
  }

  insert(values) {
    const row = {};
    for (const col of this.columns) {
      this._check(col, values[col.name]);
      row[col.name] = values[col.name];
    }
    this.rows.push(row);
  }

  select(where = () => true) {
    return this.rows.filter(where);
  }

  update(where, changes) {
    for (const key of Object.keys(changes)) {
      const col = this.columns.find(c => c.name === key);
      if (!col) throw new Error(`Unknown column: ${key}`);
      this._check(col, changes[key]);
    }
    let count = 0;
    for (const row of this.rows) {
      if (where(row)) { Object.assign(row, changes); count++; }
    }
    return count;
  }

  delete(where) {
    const before = this.rows.length;
    this.rows = this.rows.filter(r => !where(r));
    return before - this.rows.length;
  }
}

module.exports = Table;