const { load, save } = require('./storage');
const Table = require('./table');

class Database {
  constructor(file) {
    this.file = file;
    this.tables = {};
    const data = load(file);
    for (const [name, t] of Object.entries(data.tables)) {
      const table = new Table(name, t.columns);
      table.rows = t.rows;
      this.tables[name] = table;
    }
  }

  _persist() {
    const data = { tables: {} };
    for (const [name, t] of Object.entries(this.tables)) {
      data.tables[name] = { columns: t.columns, rows: t.rows };
    }
    save(this.file, data);
  }

  getTable(name) {
    const t = this.tables[name];
    if (!t) throw new Error(`No such table: ${name}`);
    return t;
  }

  createTable(name, columns) {
    if (this.tables[name]) throw new Error(`Table already exists: ${name}`);
    this.tables[name] = new Table(name, columns);
    this._persist();
  }

  insert(name, values) {
    this.getTable(name).insert(values);
    this._persist();
  }

  select(name, where) {
    return this.getTable(name).select(where);
  }

  update(name, where, changes) {
    const n = this.getTable(name).update(where, changes);
    this._persist();
    return n;
  }

  delete(name, where) {
    const n = this.getTable(name).delete(where);
    this._persist();
    return n;
  }
}

module.exports = Database;