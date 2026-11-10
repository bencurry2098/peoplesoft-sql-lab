// The lab engine. It runs Oracle flavored SQL on top of SQLite compiled to JavaScript.
// It rewrites Oracle syntax that SQLite lacks and registers Oracle functions.
// Dates are stored as Julian day numbers so date arithmetic behaves like Oracle.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./schema.js'), require('./seed.js'));
  else root.PSEngine = factory(root.PSSchema, root.PSSeed);
})(typeof self !== 'undefined' ? self : this, function (PSSchema, PSSeed) {
  'use strict';

  var MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  var MONTH_NAMES = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
  var DAY_NAMES = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  var JD_EPOCH = 2440587.5;
  var JD_MIN = 2415020.5;
  var JD_MAX = 2488069.5;

  // An error meant to be shown to the learner as is.
  function LabError(message) { this.name = 'LabError'; this.message = message; }
  LabError.prototype = Object.create(Error.prototype);

  // Convert year, month, day to a Julian day number. Returns null for impossible dates.
  function ymdToJulian(y, m, d) {
    var t = Date.UTC(y, m - 1, d);
    var back = new Date(t);
    if (back.getUTCFullYear() !== y || back.getUTCMonth() !== m - 1 || back.getUTCDate() !== d) return null;
    return t / 86400000 + JD_EPOCH;
  }

  // Convert an ISO date string to a Julian day number.
  function toJulian(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    return m ? ymdToJulian(+m[1], +m[2], +m[3]) : null;
  }

  // Convert a Julian day number to a JavaScript date in UTC.
  function julianToDate(jd) { return new Date(Math.round((jd - JD_EPOCH) * 86400000)); }

  // Convert a Julian day number to an ISO date string.
  function fromJulian(jd) { return julianToDate(jd).toISOString().slice(0, 10); }

  // Dates are the only numbers in this range that end in exactly one half.
  function isDateValue(v) {
    return typeof v === 'number' && v >= JD_MIN && v <= JD_MAX && Math.abs((v % 1) - 0.5) < 1e-9;
  }

  // Parse the date formats people type without a format mask.
  function parseLooseDate(text) {
    var s = String(text).trim();
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (m) return ymdToJulian(+m[1], +m[2], +m[3]);
    m = /^(\d{1,2})-([A-Za-z]{3})-(\d{2}|\d{4})$/.exec(s);
    if (m) {
      var mon = MONTHS.indexOf(m[2].toUpperCase());
      if (mon < 0) return null;
      var y = +m[3];
      if (m[3].length === 2) y += y < 50 ? 2000 : 1900;
      return ymdToJulian(y, mon + 1, +m[1]);
    }
    return null;
  }

  // Parse a string with an Oracle format mask such as YYYY-MM-DD or MM/DD/YYYY.
  function parseWithFormat(text, fmt) {
    var parts = [];
    var re = String(fmt).replace(/YYYY|RRRR|YY|RR|MONTH|MON|MM|DD|HH24|HH|MI|SS|[^A-Za-z0-9]+|./gi, function (tok) {
      var up = tok.toUpperCase();
      if (up === 'YYYY' || up === 'RRRR') { parts.push('y4'); return '(\\d{4})'; }
      if (up === 'YY' || up === 'RR') { parts.push('y2'); return '(\\d{2})'; }
      if (up === 'MONTH') { parts.push('month'); return '([A-Za-z]+)'; }
      if (up === 'MON') { parts.push('mon'); return '([A-Za-z]{3})'; }
      if (up === 'MM') { parts.push('m'); return '(\\d{1,2})'; }
      if (up === 'DD') { parts.push('d'); return '(\\d{1,2})'; }
      if (up === 'HH24' || up === 'HH' || up === 'MI' || up === 'SS') { parts.push('skip'); return '(\\d{1,2})'; }
      return tok.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&');
    });
    var m = new RegExp('^\\s*' + re + '\\s*$').exec(String(text));
    if (!m) throw new LabError('ORA-01861: literal does not match format string');
    var y = 1, mo = 1, d = 1;
    parts.forEach(function (p, i) {
      var v = m[i + 1];
      if (p === 'y4') y = +v;
      else if (p === 'y2') y = +v + (+v < 50 ? 2000 : 1900);
      else if (p === 'm') mo = +v;
      else if (p === 'd') d = +v;
      else if (p === 'mon') mo = MONTHS.indexOf(v.toUpperCase()) + 1;
      else if (p === 'month') mo = MONTH_NAMES.indexOf(v.toUpperCase()) + 1;
    });
    var jd = mo >= 1 ? ymdToJulian(y, mo, d) : null;
    if (jd === null) throw new LabError('ORA-01839: date not valid for month specified');
    return jd;
  }

  // Match the letter case of a format token, as Oracle does for MON, MONTH and DAY.
  function caseLike(tok, word) {
    if (tok === tok.toUpperCase()) return word;
    if (tok[0] === tok[0].toUpperCase()) return word[0] + word.slice(1).toLowerCase();
    return word.toLowerCase();
  }

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  // Format a date with an Oracle format mask.
  function formatDate(jd, fmt) {
    var d = julianToDate(jd);
    var y = d.getUTCFullYear(), mo = d.getUTCMonth(), day = d.getUTCDate(), dow = d.getUTCDay();
    return String(fmt).replace(/"[^"]*"|YYYY|RRRR|YY|RR|MONTH|MON|MM|DDD|DD|DAY|DY|D|Q|HH24|HH|MI|SS/gi, function (tok) {
      var up = tok.toUpperCase();
      if (tok[0] === '"') return tok.slice(1, -1);
      if (up === 'YYYY' || up === 'RRRR') return String(y);
      if (up === 'YY' || up === 'RR') return pad2(y % 100);
      if (up === 'MONTH') return caseLike(tok, MONTH_NAMES[mo]);
      if (up === 'MON') return caseLike(tok, MONTHS[mo]);
      if (up === 'MM') return pad2(mo + 1);
      if (up === 'DD') return pad2(day);
      if (up === 'DDD') return String(Math.round((Date.UTC(y, mo, day) - Date.UTC(y, 0, 1)) / 86400000) + 1);
      if (up === 'DAY') return caseLike(tok, DAY_NAMES[dow]);
      if (up === 'DY') return caseLike(tok, DAY_NAMES[dow].slice(0, 3));
      if (up === 'D') return String(dow + 1);
      if (up === 'Q') return String(Math.floor(mo / 3) + 1);
      return '00';
    });
  }

  // Format a number with a simple Oracle mask such as 999,990.00.
  function formatNumber(n, fmt) {
    var f = String(fmt).toUpperCase();
    var decimals = f.indexOf('.') >= 0 ? f.slice(f.indexOf('.') + 1).replace(/[^09]/g, '').length : 0;
    var s = Math.abs(n).toFixed(decimals);
    if (f.indexOf(',') >= 0) {
      var bits = s.split('.');
      bits[0] = bits[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      s = bits.join('.');
    }
    return (n < 0 ? '-' : '') + (f.indexOf('$') >= 0 ? '$' : '') + s;
  }

  // The Oracle functions the lab adds to SQLite. Each receives plain JavaScript values.
  var ORACLE_FUNCTIONS = {
    NVL: function (a, b) { return a === null ? b : a; },
    NVL2: function (a, b, c) { return a !== null ? b : c; },
    // DECODE treats two nulls as a match, unlike the equals operator.
    DECODE: function () {
      var a = arguments;
      if (a.length < 3) throw new LabError('ORA-00938: not enough arguments for function DECODE');
      for (var i = 1; i + 1 < a.length; i += 2) if (a[0] === a[i]) return a[i + 1];
      return a.length % 2 === 0 ? a[a.length - 1] : null;
    },
    GREATEST: function () {
      var best = arguments[0];
      for (var i = 0; i < arguments.length; i++) { if (arguments[i] === null) return null; if (arguments[i] > best) best = arguments[i]; }
      return best;
    },
    LEAST: function () {
      var best = arguments[0];
      for (var i = 0; i < arguments.length; i++) { if (arguments[i] === null) return null; if (arguments[i] < best) best = arguments[i]; }
      return best;
    },
    TO_DATE: function (s, fmt) {
      if (s === null) return null;
      if (typeof s === 'number') return s;
      if (fmt === undefined || fmt === null) {
        var jd = parseLooseDate(s);
        if (jd === null) throw new LabError('ORA-01861: literal does not match format string');
        return jd;
      }
      return parseWithFormat(s, fmt);
    },
    TO_CHAR: function (v, fmt) {
      if (v === null) return null;
      if (fmt === undefined || fmt === null) return isDateValue(v) ? formatDate(v, 'DD-MON-YY') : String(v);
      if (typeof v === 'number' && /[YMDQH]/i.test(fmt) && !/[09]/.test(fmt)) return formatDate(v, fmt);
      if (typeof v === 'number') return formatNumber(v, fmt);
      return String(v);
    },
    TO_NUMBER: function (s) {
      if (s === null) return null;
      var n = Number(String(s).replace(/,/g, ''));
      if (isNaN(n)) throw new LabError('ORA-01722: invalid number');
      return n;
    },
    // ADD_MONTHS keeps the last day of the month on the last day, as Oracle does.
    ADD_MONTHS: function (jd, n) {
      if (jd === null || n === null) return null;
      var d = julianToDate(jd);
      var y = d.getUTCFullYear(), m = d.getUTCMonth(), day = d.getUTCDate();
      var lastOfSource = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
      var lastOfTarget = new Date(Date.UTC(y, m + n + 1, 0)).getUTCDate();
      var newDay = day === lastOfSource ? lastOfTarget : Math.min(day, lastOfTarget);
      return Date.UTC(y, m + n, newDay) / 86400000 + JD_EPOCH;
    },
    MONTHS_BETWEEN: function (a, b) {
      if (a === null || b === null) return null;
      var da = julianToDate(a), db = julianToDate(b);
      var months = (da.getUTCFullYear() - db.getUTCFullYear()) * 12 + (da.getUTCMonth() - db.getUTCMonth());
      var lastA = new Date(Date.UTC(da.getUTCFullYear(), da.getUTCMonth() + 1, 0)).getUTCDate() === da.getUTCDate();
      var lastB = new Date(Date.UTC(db.getUTCFullYear(), db.getUTCMonth() + 1, 0)).getUTCDate() === db.getUTCDate();
      if (da.getUTCDate() === db.getUTCDate() || (lastA && lastB)) return months;
      return months + (da.getUTCDate() - db.getUTCDate()) / 31;
    },
    LAST_DAY: function (jd) {
      if (jd === null) return null;
      var d = julianToDate(jd);
      return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0) / 86400000 + JD_EPOCH;
    },
    // TRUNC works on dates with a format and on numbers with a digit count.
    ORA_TRUNC: function (v, arg) {
      if (v === null) return null;
      if (typeof arg === 'string' || (arg === undefined && isDateValue(v))) {
        var d = julianToDate(v);
        var y = d.getUTCFullYear(), m = d.getUTCMonth(), day = d.getUTCDate();
        var f = (arg || 'DD').toUpperCase();
        if (f === 'YYYY' || f === 'YEAR' || f === 'YY' || f === 'Y') { m = 0; day = 1; }
        else if (f === 'MM' || f === 'MONTH' || f === 'MON') { day = 1; }
        else if (f === 'Q') { m = Math.floor(m / 3) * 3; day = 1; }
        return Date.UTC(y, m, day) / 86400000 + JD_EPOCH;
      }
      var p = Math.pow(10, arg || 0);
      return (v < 0 ? Math.ceil(v * p) : Math.floor(v * p)) / p;
    },
    ORA_EXTRACT: function (part, jd) {
      if (jd === null) return null;
      var d = julianToDate(jd);
      if (part === 'YEAR') return d.getUTCFullYear();
      if (part === 'MONTH') return d.getUTCMonth() + 1;
      return d.getUTCDate();
    },
    ORA_INSTR: function (s, sub, pos, nth) {
      if (s === null || sub === null) return null;
      var from = (pos || 1) - 1, idx = -1;
      for (var i = 0; i < (nth || 1); i++) {
        idx = String(s).indexOf(String(sub), from);
        if (idx < 0) return 0;
        from = idx + 1;
      }
      return idx + 1;
    },
    LPAD: function (s, n, p) {
      if (s === null) return null;
      s = String(s); p = p === undefined ? ' ' : String(p);
      while (s.length < n) s = p + s;
      return s.slice(0, n);
    },
    RPAD: function (s, n, p) {
      if (s === null) return null;
      s = String(s); p = p === undefined ? ' ' : String(p);
      while (s.length < n) s = s + p;
      return s.slice(0, n);
    },
    INITCAP: function (s) {
      if (s === null) return null;
      return String(s).toLowerCase().replace(/(^|[^a-z0-9])([a-z])/g, function (m, a, b) { return a + b.toUpperCase(); });
    },
    ORA_MOD: function (a, b) { return a === null || b === null ? null : (b === 0 ? a : a % b); },
    ORA_CEIL: function (a) { return a === null ? null : Math.ceil(a); },
    ORA_FLOOR: function (a) { return a === null ? null : Math.floor(a); },
    ORA_POWER: function (a, b) { return a === null || b === null ? null : Math.pow(a, b); },
    ORA_SIGN: function (a) { return a === null ? null : (a > 0 ? 1 : (a < 0 ? -1 : 0)); },
    ORA_SQRT: function (a) { return a === null ? null : Math.sqrt(a); }
  };

  // Register every Oracle function on a database connection.
  // A length of -1 tells SQLite the function accepts any number of arguments.
  function registerFunctions(db) {
    Object.keys(ORACLE_FUNCTIONS).forEach(function (name) {
      var impl = ORACLE_FUNCTIONS[name];
      var wrapper = function () { return impl.apply(null, arguments); };
      Object.defineProperty(wrapper, 'length', { value: -1 });
      db.create_function(name, wrapper);
    });
  }

  // Pull string literals, quoted identifiers and comments out of the SQL text.
  // Literals become placeholders so later rewrites never touch their contents.
  function tokenize(sql) {
    var code = '', lits = [], qids = [], i = 0, n = sql.length;
    while (i < n) {
      var ch = sql[i], next = sql[i + 1];
      if (ch === '-' && next === '-') {
        while (i < n && sql[i] !== '\n') i++;
        code += ' ';
      } else if (ch === '/' && next === '*') {
        var close = sql.indexOf('*/', i + 2);
        i = close < 0 ? n : close + 2;
        code += ' ';
      } else if (ch === "'") {
        var j = i + 1;
        for (;;) {
          if (j >= n) throw new LabError('ORA-01756: quoted string not properly terminated');
          if (sql[j] === "'" && sql[j + 1] === "'") { j += 2; continue; }
          if (sql[j] === "'") break;
          j++;
        }
        lits.push(sql.slice(i, j + 1));
        code += '__PSLIT' + (lits.length - 1) + '__';
        i = j + 1;
      } else if (ch === '"') {
        var k = sql.indexOf('"', i + 1);
        if (k < 0) throw new LabError('ORA-01740: missing double quote in identifier');
        qids.push(sql.slice(i, k + 1));
        code += '__PSQID' + (qids.length - 1) + '__';
        i = k + 1;
      } else {
        code += ch;
        i++;
      }
    }
    return { code: code, lits: lits, qids: qids };
  }

  // The text inside a quoted literal, with doubled quotes collapsed.
  function literalText(raw) { return raw.slice(1, -1).replace(/''/g, "'"); }

  // Put literals and quoted identifiers back into the rewritten SQL.
  function restore(code, tok) {
    return code
      .replace(/__PSLIT(\d+)__/g, function (m, n) { return tok.lits[+n]; })
      .replace(/__PSQID(\d+)__/g, function (m, n) { return tok.qids[+n]; });
  }

  // Classify a statement by its first keyword.
  function statementKind(code) {
    var m = /^[\s(]*([A-Za-z]+)/.exec(code);
    var w = m ? m[1].toUpperCase() : '';
    if (w === 'SELECT' || w === 'WITH') return 'query';
    if (w === 'INSERT' || w === 'UPDATE' || w === 'DELETE' || w === 'MERGE') return 'dml';
    if (w === 'CREATE' || w === 'DROP' || w === 'ALTER' || w === 'TRUNCATE') return 'ddl';
    if (w === 'COMMIT' || w === 'ROLLBACK') return 'tcl';
    if (w === 'DESC' || w === 'DESCRIBE') return 'describe';
    return 'other';
  }

  // Rewrite one Oracle statement into SQL that SQLite can run.
  function translate(code, tok, labJulian, warnings) {
    if (/\(\s*\+\s*\)/.test(code)) {
      throw new LabError('The old (+) outer join syntax is not supported in the lab. Use LEFT JOIN ... ON instead. You will still see (+) in older PeopleSoft SQL.');
    }
    if (/\bROWNUM\b/i.test(code)) {
      throw new LabError('ROWNUM is not supported in the lab. Use FETCH FIRST n ROWS ONLY, or ROW_NUMBER() in a subquery.');
    }
    if (/\bPIVOT\s*\(/i.test(code)) {
      throw new LabError('PIVOT is not supported in the lab. Pivot with SUM(CASE WHEN ... END), which works everywhere.');
    }
    if (/\bKEEP\s*\(/i.test(code)) {
      throw new LabError('KEEP (DENSE_RANK ...) is Oracle only and not supported in the lab. Use ROW_NUMBER() in a subquery instead.');
    }

    // ANSI date literals such as DATE '2026-01-01'.
    code = code.replace(/\bDATE\s+__PSLIT(\d+)__/gi, function (m, n) {
      var jd = toJulian(literalText(tok.lits[+n]));
      if (jd === null) throw new LabError('ORA-01861: literal does not match format string. DATE literals must look like DATE \'2026-01-31\'.');
      return String(jd);
    });

    // Bare strings that look like dates are treated as dates, with a warning.
    code = code.replace(/__PSLIT(\d+)__/g, function (m, n, offset, whole) {
      var before = whole.slice(0, offset);
      if (/\bTO_DATE\s*\(\s*$/i.test(before)) return m;
      if (/\bTO_CHAR\s*\((?:[^()]|\([^()]*\))*\)\s*(?:=|<>|!=|<=|>=|<|>|LIKE|IN\s*\(|,)\s*(?:__PSLIT\d+__\s*,\s*)*$/i.test(before)) return m;
      var text = literalText(tok.lits[+n]);
      var jd = parseLooseDate(text);
      if (jd === null) return m;
      var note = "The lab treated '" + text + "' as a date. In real Oracle write DATE '" + fromJulian(jd) + "' or TO_DATE('" + fromJulian(jd) + "', 'YYYY-MM-DD') so the comparison never depends on session settings.";
      if (warnings.indexOf(note) < 0) warnings.push(note);
      return String(jd);
    });

    code = code.replace(/\b(SYSDATE|CURRENT_DATE)\b/gi, String(labJulian));
    code = code.replace(/\bMINUS\b/gi, 'EXCEPT');
    code = code.replace(/\bOFFSET\s+(\d+)\s+ROWS?\s+FETCH\s+(?:FIRST|NEXT)\s+(\d+)\s+ROWS?\s+ONLY\b/gi, 'LIMIT $2 OFFSET $1');
    code = code.replace(/\bFETCH\s+(?:FIRST|NEXT)\s+(\d+)\s+ROWS?\s+ONLY\b/gi, 'LIMIT $1');
    code = code.replace(/\bFETCH\s+(?:FIRST|NEXT)\s+ROW\s+ONLY\b/gi, 'LIMIT 1');
    code = code.replace(/\bEXTRACT\s*\(\s*(YEAR|MONTH|DAY)\s+FROM\s+/gi, function (m, part) { return "ORA_EXTRACT('" + part.toUpperCase() + "', "; });
    code = code.replace(/\bLISTAGG\s*\(((?:[^()]|\([^()]*\))*)\)\s*WITHIN\s+GROUP\s*\(\s*(ORDER\s+BY(?:[^()]|\([^()]*\))*)\)/gi, 'GROUP_CONCAT($1 $2)');
    code = code.replace(/\b(TRUNC|INSTR|MOD|CEIL|FLOOR|POWER|SIGN|SQRT)\s*\(/gi, function (m, name) { return 'ORA_' + name.toUpperCase() + '('; });

    // Oracle division always keeps decimals. SQLite would truncate integers.
    code = code.replace(/\//g, '*1.0/');

    // Small DML differences between the two databases.
    code = code.replace(/^(\s*)TRUNCATE\s+TABLE\s+/i, '$1DELETE FROM ');
    code = code.replace(/^(\s*)DELETE\s+(?!FROM\b)/i, '$1DELETE FROM ');
    code = code.replace(/^(\s*DELETE\s+FROM\s+\w+)\s+(?!WHERE\b|AS\b)(\w+)\b/i, '$1 AS $2');
    code = code.replace(/^(\s*UPDATE\s+\w+)\s+(?!SET\b|AS\b)(\w+)\s+SET\b/i, '$1 AS $2 SET');

    return restore(code, tok);
  }

  // Turn a column heading back into what Oracle would show for the original SQL.
  function prettyColumn(name, labDate, quoted) {
    if (quoted.indexOf('"' + name + '"') >= 0) return name;
    var lab = toJulian(labDate);
    return String(name)
      .replace(/\b(24\d{5}\.5)\b/g, function (m) { return +m === lab ? 'SYSDATE' : "DATE '" + fromJulian(+m) + "'"; })
      .replace(/\*1\.0\//g, '/')
      .replace(/ORA_EXTRACT\('(\w+)', /g, 'EXTRACT($1 FROM ')
      .replace(/ORA_/g, '')
      .toUpperCase();
  }

  // Translate common SQLite messages into the Oracle errors a learner will meet at work.
  function friendlyError(err) {
    var msg = String(err && err.message ? err.message : err);
    if (err instanceof LabError) return msg;
    var m;
    if ((m = /no such table: (\S+)/.exec(msg))) return 'ORA-00942: table or view does not exist (' + m[1] + ')';
    if ((m = /no such column: (\S+)/.exec(msg))) return 'ORA-00904: "' + m[1].toUpperCase() + '": invalid identifier';
    if ((m = /ambiguous column name: (\S+)/.exec(msg))) return 'ORA-00918: column ambiguously defined (' + m[1] + '). Prefix it with a table alias.';
    if ((m = /no such function: (\S+)/.exec(msg))) return 'ORA-00904: "' + m[1].replace(/^ORA_/, '') + '": invalid identifier. This function is not available in the lab.';
    if (/UNIQUE constraint failed/.test(msg)) return 'ORA-00001: unique constraint violated. A row with that key already exists.';
    if (/NOT NULL constraint failed: (\S+)/.test(msg)) return 'ORA-01400: cannot insert NULL into ' + /failed: (\S+)/.exec(msg)[1] + '. PeopleSoft character fields hold a single space when blank.';
    if ((m = /near "([^"]*)": syntax error/.exec(msg))) return 'ORA-00933: SQL command not properly ended, or a syntax error near ' + m[1].replace(/__PS(LIT|QID)\d+__/g, 'a quoted value');
    if (/incomplete input/.test(msg)) return 'ORA-00936: missing expression. The statement ends too early.';
    if (/misuse of window function/.test(msg)) return 'ORA-30483: window functions are not allowed here. Compute them in a subquery or CTE, then filter outside it.';
    if (/misuse of aggregate/.test(msg)) return 'ORA-00934: group function is not allowed here. Use HAVING, or a subquery.';
    if (/table (\S+) already exists/.test(msg)) return 'ORA-00955: name is already used by an existing object';
    return msg.replace(/ORA_(TRUNC|INSTR|MOD|CEIL|FLOOR|POWER|SIGN|SQRT)/g, '$1');
  }

  // Create the seeded database once and return its bytes.
  // Every working copy is opened from these bytes, so resets are instant.
  function buildSeedBytes(SQL) {
    var db = new SQL.Database();
    var data = PSSeed.build();
    db.run('BEGIN');
    db.run('CREATE TABLE DUAL (DUMMY VARCHAR2(1))');
    db.run("INSERT INTO DUAL VALUES ('X')");
    PSSchema.tables.forEach(function (t) {
      db.run(PSSchema.ddl(t));
      db.run(PSSchema.keyIndex(t));
      var marks = t.cols.map(function () { return '?'; }).join(',');
      var stmt = db.prepare('INSERT INTO ' + t.name + ' VALUES (' + marks + ')');
      var dateCols = t.cols.map(function (c) { return PSSchema.isDate(c[1]); });
      data[t.name].forEach(function (row) {
        stmt.run(row.map(function (v, i) {
          if (v === null) return null;
          if (dateCols[i]) return toJulian(v);
          return v === 0 ? 0 : v;
        }));
      });
      stmt.free();
    });
    db.run('COMMIT');
    var bytes = db.export();
    db.close();
    return bytes;
  }

  // Open a working database from the seed bytes.
  function create(SQL, bytes, options) {
    var opts = options || {};
    var db, inTxn = false;
    var labDate = opts.labDate || PSSeed.DEFAULT_LAB_DATE;

    function open() {
      db = new SQL.Database(bytes);
      registerFunctions(db);
      db.run('PRAGMA case_sensitive_like = ON');
      inTxn = false;
    }
    open();

    // Run a query and collect its rows.
    function query(sql, maxRows, quoted) {
      var stmt = db.prepare(sql);
      try {
        var columns = stmt.getColumnNames().map(function (c) { return prettyColumn(c, labDate, quoted || []); });
        var rows = [], total = 0;
        while (stmt.step()) {
          total++;
          if (!maxRows || rows.length < maxRows) rows.push(stmt.get());
        }
        return { kind: 'rows', columns: columns, rows: rows, total: total };
      } finally {
        stmt.free();
      }
    }

    // Describe a table the way SQL*Plus does.
    function describe(code) {
      var m = /^\s*DESC(?:RIBE)?\s+(\w+)/i.exec(code);
      if (!m) throw new LabError('Usage: DESC table_name');
      var info = query('PRAGMA table_info(' + m[1] + ')');
      if (!info.rows.length) throw new LabError('ORA-04043: object ' + m[1].toUpperCase() + ' does not exist');
      return {
        kind: 'rows', columns: ['Name', 'Null?', 'Type'], total: info.rows.length,
        rows: info.rows.map(function (r) { return [r[1], r[3] ? 'NOT NULL' : '', r[2]]; })
      };
    }

    // Run one or more statements separated by semicolons.
    function run(sqlText, runOptions) {
      var ro = runOptions || {};
      var out = { items: [], warnings: [], ok: true };
      var tok;
      try {
        tok = tokenize(String(sqlText));
      } catch (e) {
        out.ok = false;
        out.items.push({ kind: 'error', text: friendlyError(e) });
        return out;
      }
      var statements = tok.code.split(';').map(function (s) { return s.replace(/^\s*\/\s*$/gm, ''); })
        .filter(function (s) { return s.trim().length > 0; });
      if (!statements.length) {
        out.ok = false;
        out.items.push({ kind: 'error', text: 'There is no SQL to run yet.' });
        return out;
      }
      var labJulian = toJulian(labDate);
      for (var i = 0; i < statements.length; i++) {
        var code = statements[i];
        try {
          var kind = statementKind(code);
          if (ro.readOnly && kind !== 'query' && kind !== 'describe') {
            throw new LabError('This box runs queries only. Use the scratchpad to change data.');
          }
          if (kind === 'describe') { out.items.push(describe(code)); continue; }
          if (kind === 'tcl') {
            var word = /^\s*(\w+)/.exec(code)[1].toUpperCase();
            if (inTxn) { db.run(word); inTxn = false; }
            out.items.push({ kind: 'msg', text: word === 'COMMIT' ? 'Commit complete.' : 'Rollback complete.' });
            continue;
          }
          var sql = translate(code, tok, labJulian, out.warnings);
          if (kind === 'query') {
            out.items.push(query(sql, ro.maxRows, tok.qids));
          } else if (kind === 'dml') {
            if (!inTxn) { db.run('BEGIN'); inTxn = true; }
            db.run(sql);
            var count = db.getRowsModified();
            var verb = /^\s*(\w+)/.exec(code)[1].toUpperCase();
            var past = { INSERT: 'created', UPDATE: 'updated', DELETE: 'deleted', MERGE: 'merged' }[verb];
            out.items.push({ kind: 'msg', text: count + (count === 1 ? ' row ' : ' rows ') + past + '.' });
          } else if (kind === 'ddl') {
            // Oracle commits before and after DDL. The lab does the same.
            if (inTxn) { db.run('COMMIT'); inTxn = false; }
            db.run(sql);
            var what = /^\s*(\w+)(?:\s+UNIQUE)?\s+(\w+)/i.exec(code);
            var noun = what ? what[2].charAt(0).toUpperCase() + what[2].slice(1).toLowerCase() : 'Object';
            var done = { CREATE: 'created', DROP: 'dropped', ALTER: 'altered', TRUNCATE: 'truncated' }[what ? what[1].toUpperCase() : ''] || 'changed';
            out.items.push({ kind: 'msg', text: noun + ' ' + done + '.' });
          } else {
            throw new LabError('ORA-00900: invalid SQL statement');
          }
        } catch (e) {
          out.ok = false;
          out.items.push({ kind: 'error', text: friendlyError(e), statement: i + 1, of: statements.length });
          break;
        }
      }
      return out;
    }

    return {
      run: run,
      reset: function () { db.close(); open(); },
      close: function () { db.close(); },
      hasUncommitted: function () { return inTxn; },
      setLabDate: function (iso) { if (toJulian(iso) !== null) labDate = iso; },
      getLabDate: function () { return labDate; }
    };
  }

  // Format a value for display. Returns null for SQL null.
  function formatValue(v) {
    if (v === null || v === undefined) return null;
    if (isDateValue(v)) return fromJulian(v);
    if (typeof v === 'number') {
      if (Number.isInteger(v)) return String(v);
      return String(Math.round(v * 1e6) / 1e6);
    }
    return String(v);
  }

  // Normalize a value so equal answers compare equal.
  function normalize(v) {
    if (v === null || v === undefined) return null;
    if (typeof v === 'number') return Math.round(v * 100) / 100 + 0;
    return String(v).replace(/\s+$/, '');
  }

  function rowKey(row) { return JSON.stringify(row.map(normalize)); }

  function showRow(row) { return '(' + row.map(function (v) { var f = formatValue(v); return f === null ? 'null' : f; }).join(', ') + ')'; }

  // The last result set produced by a run, if any.
  function lastRows(result) {
    for (var i = result.items.length - 1; i >= 0; i--) if (result.items[i].kind === 'rows') return result.items[i];
    return null;
  }

  // Run the reference solution for an exercise and return what a correct answer looks like.
  function expected(SQL, bytes, labDate, ex) {
    var eng = create(SQL, bytes, { labDate: labDate });
    try {
      var res = eng.run(ex.solution);
      if (res.ok && ex.verify) res = eng.run(ex.verify);
      return res.ok ? lastRows(res) : null;
    } finally {
      eng.close();
    }
  }

  // Check a learner answer against the reference solution on a fresh copy of the data.
  function check(SQL, bytes, labDate, ex, userSql) {
    var want = expected(SQL, bytes, labDate, ex);
    var eng = create(SQL, bytes, { labDate: labDate });
    var res, got;
    try {
      res = eng.run(userSql, { readOnly: !ex.verify });
      if (res.ok && ex.verify) {
        var after = eng.run(ex.verify);
        if (!after.ok) {
          return { pass: false, result: res, message: 'Your statements ran, but the check query failed: ' + after.items[after.items.length - 1].text };
        }
        res.items.push(lastRows(after));
      }
      got = res.ok ? lastRows(res) : null;
    } finally {
      eng.close();
    }
    if (!res.ok) return { pass: false, result: res, message: 'Fix the error first, then check again.' };
    if (!got) return { pass: false, result: res, message: 'Your SQL did not return any rows to check. Finish with a SELECT.' };
    if (!want) return { pass: false, result: res, message: 'The reference solution failed to run. Please report this exercise.' };

    if (got.columns.length !== want.columns.length) {
      return { pass: false, result: res, message: 'Expected ' + want.columns.length + ' columns (' + want.columns.join(', ') + ') but your query returns ' + got.columns.length + '.' };
    }
    if (got.rows.length !== want.rows.length) {
      var tip = '';
      (ex.wrong || []).forEach(function (w) { if (w.rows === got.rows.length) tip = ' ' + w.msg; });
      return { pass: false, result: res, message: 'Expected ' + want.rows.length + ' rows but your query returns ' + got.rows.length + '.' + tip };
    }
    var wantKeys = want.rows.map(rowKey), gotKeys = got.rows.map(rowKey);
    var sortedWant = wantKeys.slice().sort(), sortedGot = gotKeys.slice().sort();
    for (var i = 0; i < sortedWant.length; i++) {
      if (sortedWant[i] !== sortedGot[i]) {
        var missing = want.rows[wantKeys.indexOf(sortedWant.filter(function (k) { return sortedGot.indexOf(k) < 0; })[0])];
        var extra = got.rows[gotKeys.indexOf(sortedGot.filter(function (k) { return sortedWant.indexOf(k) < 0; })[0])];
        var detail = '';
        if (missing) detail += ' A correct answer includes ' + showRow(missing) + '.';
        if (extra) detail += ' Yours includes ' + showRow(extra) + ' instead.';
        return { pass: false, result: res, message: 'The row count is right but some values differ.' + detail };
      }
    }
    if (ex.ordered) {
      for (var k = 0; k < wantKeys.length; k++) {
        if (wantKeys[k] !== gotKeys[k]) return { pass: false, result: res, message: 'The rows are right but the order is not. Check your ORDER BY.' };
      }
    }
    var missed = (ex.requires || []).filter(function (r) { return !new RegExp(r.pattern, 'i').test(userSql); });
    if (missed.length) return { pass: false, result: res, message: 'The rows are right, but this exercise asks you to use ' + missed[0].label + '.' };
    return { pass: true, result: res, message: 'Correct. ' + want.rows.length + (want.rows.length === 1 ? ' row matches' : ' rows match') + ' the reference answer.' };
  }

  return {
    buildSeedBytes: buildSeedBytes, create: create, check: check, expected: expected, lastRows: lastRows,
    formatValue: formatValue, isDateValue: isDateValue, toJulian: toJulian, fromJulian: fromJulian, tokenize: tokenize
  };
});
