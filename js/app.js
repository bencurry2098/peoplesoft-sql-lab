// The lab user interface. Plain DOM code with no framework and no build step.
(function () {
  'use strict';

  var STORE_KEY = 'pslab.v1';
  var MAX_ROWS_SHOWN = 300;
  var state = {
    SQL: null, bytes: null, labDate: PSSeed.DEFAULT_LAB_DATE,
    done: {}, drafts: {}, scratch: null, boxes: {}, boxCount: 0
  };
  var main = document.getElementById('main');
  var nav = document.getElementById('nav');

  // Read saved progress. Storage can be unavailable, so every access is guarded.
  function loadSaved() {
    try {
      var raw = window.localStorage.getItem(STORE_KEY);
      if (!raw) return;
      var saved = JSON.parse(raw);
      state.done = saved.done || {};
      state.drafts = saved.drafts || {};
    } catch (e) {
      state.done = {};
      state.drafts = {};
    }
  }

  // Save progress and drafts.
  function save() {
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify({ done: state.done, drafts: state.drafts }));
    } catch (e) {
      return;
    }
  }

  // Escape text for safe insertion into HTML.
  function esc(text) {
    return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  var KEYWORDS = ('SELECT FROM WHERE AND OR NOT IN IS NULL AS ON JOIN LEFT RIGHT FULL INNER OUTER GROUP BY ORDER HAVING ' +
    'DISTINCT UNION ALL MINUS INTERSECT EXISTS BETWEEN LIKE CASE WHEN THEN ELSE END WITH OVER PARTITION ROWS RANGE ' +
    'UNBOUNDED PRECEDING FOLLOWING CURRENT ROW DESC ASC INSERT INTO VALUES UPDATE SET DELETE CREATE TABLE COMMIT ' +
    'ROLLBACK FETCH FIRST ONLY DATE SYSDATE DUAL NULLS LAST WITHIN').split(' ');

  // Color SQL for display. Used for solutions, which are read only.
  function highlight(sql) {
    return sql.replace(/(--[^\n]*)|('(?:[^']|'')*')|(\b\d+(?:\.\d+)?\b)|(\b[A-Za-z_][A-Za-z0-9_$#]*\b)|([\s\S])/g,
      function (m, cmt, str, num, word, other) {
        if (cmt) return '<span class="tok-cmt">' + esc(cmt) + '</span>';
        if (str) return '<span class="tok-str">' + esc(str) + '</span>';
        if (num) return '<span class="tok-num">' + esc(num) + '</span>';
        if (word) return KEYWORDS.indexOf(word.toUpperCase()) >= 0 ? '<span class="tok-kw">' + esc(word) + '</span>' : esc(word);
        return esc(other);
      });
  }

  // Count the exercises finished in a lesson.
  function lessonProgress(lesson) {
    var list = lesson.exercises || [];
    var done = list.filter(function (e) { return state.done[e.id]; }).length;
    return { done: done, total: list.length };
  }

  // The small done-of-total counter shown beside a lesson.
  function countHtml(lesson) {
    var p = lessonProgress(lesson);
    if (!p.total) return '';
    return '<span class="count' + (p.done === p.total ? ' done' : '') + '">' + p.done + '/' + p.total + '</span>';
  }

  // Draw the side navigation.
  function renderNav(currentId) {
    var html = '<ul><li><a href="#home"' + (currentId === 'home' ? ' class="current" aria-current="page"' : '') + '>Overview</a></li></ul>';
    PSCourse.modules.forEach(function (mod) {
      html += '<h2>' + esc(mod.title) + '</h2><ul>';
      mod.lessons.forEach(function (l) {
        html += '<li><a href="#' + l.id + '"' + (currentId === l.id ? ' class="current" aria-current="page"' : '') + '>' +
          '<span>' + esc(l.title) + '</span>' + countHtml(l) + '</a></li>';
      });
      html += '</ul>';
    });
    html += '<h2>Tools</h2><ul>' +
      '<li><a href="#scratchpad"' + (currentId === 'scratchpad' ? ' class="current" aria-current="page"' : '') + '>Scratchpad</a></li>' +
      '<li><a href="#tables"' + (currentId === 'tables' ? ' class="current" aria-current="page"' : '') + '>Tables</a></li></ul>';
    nav.innerHTML = html;
  }

  // Update the progress chip in the header.
  function renderProgress() {
    var all = PSCourse.exercises();
    var done = all.filter(function (x) { return state.done[x.exercise.id]; }).length;
    document.getElementById('progress').innerHTML = done + ' of ' + all.length + '<span class="long"> exercises done</span>';
  }

  // Build the HTML for one result set.
  function gridHtml(rows, label) {
    var numeric = rows.columns.map(function (c, i) {
      var any = false;
      for (var r = 0; r < rows.rows.length; r++) {
        var v = rows.rows[r][i];
        if (v === null) continue;
        if (typeof v !== 'number' || PSEngine.isDateValue(v)) return false;
        any = true;
      }
      return any;
    });
    var html = label ? '<div class="resultlabel">' + esc(label) + '</div>' : '';
    html += '<div class="printout"><div class="scroll" tabindex="0"><table class="grid"><thead><tr>';
    rows.columns.forEach(function (c, i) { html += '<th' + (numeric[i] ? ' class="num"' : '') + '>' + esc(c) + '</th>'; });
    html += '</tr></thead><tbody>';
    rows.rows.slice(0, MAX_ROWS_SHOWN).forEach(function (row) {
      html += '<tr>';
      row.forEach(function (v, i) {
        var f = PSEngine.formatValue(v);
        if (f === null) html += '<td class="null">null</td>';
        else html += '<td' + (numeric[i] ? ' class="num"' : '') + '>' + esc(f) + '</td>';
      });
      html += '</tr>';
    });
    html += '</tbody></table></div></div>';
    var total = rows.total === undefined ? rows.rows.length : rows.total;
    var count = total === 0 ? 'no rows selected' : total + (total === 1 ? ' row' : ' rows');
    if (total > MAX_ROWS_SHOWN) count += ', showing the first ' + MAX_ROWS_SHOWN;
    return html + '<div class="rowcount">' + count + '</div>';
  }

  // Build the HTML for everything a run produced.
  function resultHtml(result, lastLabel) {
    var html = '';
    result.warnings.forEach(function (w) { html += '<div class="warning">' + esc(w) + '</div>'; });
    var lastRowsIndex = -1;
    result.items.forEach(function (it, i) { if (it.kind === 'rows') lastRowsIndex = i; });
    result.items.forEach(function (it, i) {
      if (it.kind === 'rows') html += gridHtml(it, lastLabel && i === lastRowsIndex ? lastLabel : '');
      else if (it.kind === 'msg') html += '<div class="message">' + esc(it.text) + '</div>';
      else html += '<div class="error">' + (it.of > 1 ? 'Statement ' + it.statement + ' of ' + it.of + ': ' : '') + esc(it.text) + '</div>';
    });
    return html;
  }

  // Size a text area to its content.
  function autosize(ta) {
    var lines = ta.value.split('\n').length;
    ta.rows = Math.max(4, Math.min(lines + 1, 32));
  }

  // Build a query box. Options: kind, sql, original, exercise.
  function queryBox(opts) {
    var id = 'box' + (++state.boxCount);
    state.boxes[id] = opts;
    var ex = opts.exercise;
    var buttons = '<button class="btn primary" data-act="run">Run</button>';
    if (ex) {
      buttons += '<button class="btn check" data-act="check">Check answer</button>' +
        '<span class="spacer"></span>' +
        (ex.hints && ex.hints.length ? '<button class="btn quiet" data-act="hint">Hint</button>' : '') +
        '<button class="btn quiet" data-act="solution">Show solution</button>' +
        '<button class="btn quiet" data-act="restore">Start over</button>';
    } else if (opts.kind === 'scratch') {
      buttons += '<span class="keyhint">Ctrl or Cmd + Enter runs</span><span class="spacer"></span>' +
        '<button class="btn quiet" data-act="resetdb">Reset the database</button>';
    } else {
      buttons += '<span class="keyhint">Edit it and run again</span><span class="spacer"></span>' +
        '<button class="btn quiet" data-act="restore">Restore</button>';
    }
    return '<div class="querybox" id="' + id + '">' +
      '<label class="visually-hidden" for="' + id + '-sql">SQL</label>' +
      '<textarea id="' + id + '-sql" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off"' +
      (opts.placeholder ? ' placeholder="' + esc(opts.placeholder) + '"' : '') + '>' + esc(opts.sql || '') + '</textarea>' +
      '<div class="actions">' + buttons + '</div>' +
      '<div class="hints" hidden></div><div class="solution" hidden></div>' +
      '<div class="output" aria-live="polite"></div></div>';
  }

  // Run SQL on a throwaway copy of the seeded database.
  function runFresh(sql, readOnly) {
    var eng = PSEngine.create(state.SQL, state.bytes, { labDate: state.labDate });
    try {
      return { result: eng.run(sql, { readOnly: readOnly, maxRows: 2000 }), engine: eng };
    } catch (e) {
      eng.close();
      throw e;
    }
  }

  // The scratchpad keeps one database open so changes persist between runs.
  function scratchEngine() {
    if (!state.scratch) state.scratch = PSEngine.create(state.SQL, state.bytes, { labDate: state.labDate });
    return state.scratch;
  }

  // Handle the Run button for any kind of box.
  function actRun(box, opts, ta, out) {
    var sql = ta.value;
    var ex = opts.exercise;
    if (opts.kind === 'scratch') {
      var eng = scratchEngine();
      var res = eng.run(sql, { maxRows: 2000 });
      out.innerHTML = resultHtml(res) + (eng.hasUncommitted()
        ? '<div class="warning">You have uncommitted changes. Run COMMIT to keep them or ROLLBACK to undo them.</div>' : '');
      return;
    }
    if (ex && ex.verify) {
      var run = runFresh(sql, false);
      var label = '';
      if (run.result.ok) {
        var after = run.engine.run(ex.verify);
        var rows = PSEngine.lastRows(after);
        if (rows) { run.result.items.push(rows); label = ex.verifyLabel; }
      }
      run.engine.close();
      out.innerHTML = resultHtml(run.result, label);
      return;
    }
    var r = runFresh(sql, true);
    r.engine.close();
    out.innerHTML = resultHtml(r.result);
  }

  // Handle the Check answer button.
  function actCheck(box, opts, ta, out) {
    var ex = opts.exercise;
    var verdict = PSEngine.check(state.SQL, state.bytes, state.labDate, ex, ta.value);
    out.innerHTML = resultHtml(verdict.result, ex.verify ? ex.verifyLabel : '') +
      '<div class="verdict ' + (verdict.pass ? 'pass' : 'fail') + '">' + esc(verdict.message) + '</div>';
    if (verdict.pass && !state.done[ex.id]) {
      state.done[ex.id] = true;
      save();
      renderProgress();
      renderNav(currentRoute());
      var mark = document.getElementById('mark-' + ex.id);
      if (mark) mark.hidden = false;
    }
  }

  // React to button clicks inside the main area.
  main.addEventListener('click', function (ev) {
    var btn = ev.target.closest('[data-act]');
    if (!btn) return;
    var act = btn.getAttribute('data-act');
    if (act === 'resetprogress') {
      if (window.confirm('Clear your progress and saved drafts?')) {
        state.done = {};
        state.drafts = {};
        save();
        route();
      }
      return;
    }
    if (act === 'preview') {
      var target = document.getElementById(btn.getAttribute('data-target'));
      var r = runFresh('SELECT * FROM ' + btn.getAttribute('data-table') + ' FETCH FIRST 5 ROWS ONLY', true);
      r.engine.close();
      target.innerHTML = resultHtml(r.result);
      return;
    }
    var box = btn.closest('.querybox');
    if (!box) return;
    var opts = state.boxes[box.id];
    var ta = box.querySelector('textarea');
    var out = box.querySelector('.output');
    var ex = opts.exercise;
    if (act === 'run') actRun(box, opts, ta, out);
    else if (act === 'check') actCheck(box, opts, ta, out);
    else if (act === 'restore') {
      ta.value = opts.original || '';
      autosize(ta);
      out.innerHTML = '';
      if (ex) { delete state.drafts[ex.id]; save(); }
    } else if (act === 'hint') {
      var hints = box.querySelector('.hints');
      var shown = hints.children.length;
      if (shown < ex.hints.length) {
        hints.hidden = false;
        hints.insertAdjacentHTML('beforeend', '<p>' + ex.hints[shown] + '</p>');
      }
      if (hints.children.length >= ex.hints.length) btn.disabled = true;
    } else if (act === 'solution') {
      var sol = box.querySelector('.solution');
      if (sol.hidden) {
        sol.innerHTML = '<div class="resultlabel">Reference solution. Other correct answers pass too.</div>' +
          '<pre class="sql">' + highlight(ex.solution) + '</pre>' +
          '<div class="actions"><button class="btn" data-act="usesolution">Copy into the editor</button></div>';
        sol.hidden = false;
        btn.textContent = 'Hide solution';
      } else {
        sol.hidden = true;
        btn.textContent = 'Show solution';
      }
    } else if (act === 'usesolution') {
      ta.value = ex.solution;
      autosize(ta);
      state.drafts[ex.id] = ta.value;
      save();
    } else if (act === 'resetdb') {
      if (state.scratch) state.scratch.reset();
      out.innerHTML = '<div class="message">The database is back to its original state.</div>';
    }
  });

  // Keyboard handling in editors: run with Ctrl or Cmd + Enter, indent with Tab.
  main.addEventListener('keydown', function (ev) {
    var ta = ev.target;
    if (ta.tagName !== 'TEXTAREA') return;
    if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) {
      ev.preventDefault();
      ta.closest('.querybox').querySelector('[data-act="run"]').click();
    } else if (ev.key === 'Tab' && !ev.shiftKey && !ev.altKey && !ev.ctrlKey && !ev.metaKey) {
      ev.preventDefault();
      var start = ta.selectionStart;
      ta.value = ta.value.slice(0, start) + '  ' + ta.value.slice(ta.selectionEnd);
      ta.selectionStart = ta.selectionEnd = start + 2;
    }
  });

  // Save drafts as the learner types.
  main.addEventListener('input', function (ev) {
    var ta = ev.target;
    if (ta.tagName !== 'TEXTAREA') return;
    autosize(ta);
    var opts = state.boxes[ta.closest('.querybox').id];
    if (opts.exercise) state.drafts[opts.exercise.id] = ta.value;
    else if (opts.kind === 'scratch') state.drafts.scratchpad = ta.value;
    else return;
    save();
  });

  // Turn lesson body blocks into HTML.
  function bodyHtml(blocks) {
    return blocks.map(function (b) {
      if (typeof b === 'string') return '<p>' + b + '</p>';
      if (b.h) return '<h3>' + b.h + '</h3>';
      if (b.note) return '<div class="note">' + b.note + '</div>';
      if (b.list) return '<ul>' + b.list.map(function (i) { return '<li>' + i + '</li>'; }).join('') + '</ul>';
      if (b.sql) return queryBox({ kind: 'example', sql: b.sql, original: b.sql });
      return '';
    }).join('');
  }

  // Describe what a correct answer looks like without giving it away.
  function shapeHtml(ex) {
    if (ex.verify) return 'Your statements run on a fresh copy of the data every time, so you can retry freely.';
    var want = PSEngine.expected(state.SQL, state.bytes, state.labDate, ex);
    if (!want) return '';
    return 'A correct answer has ' + want.rows.length + (want.rows.length === 1 ? ' row' : ' rows') + ' and ' +
      want.columns.length + (want.columns.length === 1 ? ' column' : ' columns') +
      '. Column names are up to you.';
  }

  // Draw one exercise.
  function exerciseHtml(ex) {
    var draft = state.drafts[ex.id];
    var starter = ex.starter || '';
    return '<section class="exercise" id="ex-' + ex.id + '">' +
      '<div class="exercise-head"><h3>' + esc(ex.title) + '</h3>' +
      '<span class="done-mark" id="mark-' + ex.id + '"' + (state.done[ex.id] ? '' : ' hidden') + '>Done</span></div>' +
      '<p>' + ex.prompt + '</p><p class="shape">' + shapeHtml(ex) + '</p>' +
      queryBox({ kind: 'exercise', exercise: ex, sql: draft !== undefined ? draft : starter, original: starter, placeholder: 'Write your SQL here' }) +
      '</section>';
  }

  // Draw a lesson page.
  function renderLesson(lesson) {
    var all = PSCourse.lessons();
    var idx = all.indexOf(lesson);
    var html = '<div class="column"><h1>' + esc(lesson.title) + '</h1><p class="lede">' + esc(lesson.summary) + '</p>' +
      '<div class="prose">' + bodyHtml(lesson.body) + '</div>';
    if (lesson.exercises && lesson.exercises.length) {
      html += '<h2 class="section">Exercises</h2>' + lesson.exercises.map(exerciseHtml).join('');
    }
    html += '<div class="pager">';
    if (idx > 0) html += '<a class="prev" href="#' + all[idx - 1].id + '"><span>Previous</span>' + esc(all[idx - 1].title) + '</a>';
    if (idx < all.length - 1) html += '<a class="next" href="#' + all[idx + 1].id + '"><span>Next</span>' + esc(all[idx + 1].title) + '</a>';
    html += '</div></div>';
    main.innerHTML = html;
    document.title = lesson.title + ' | PeopleSoft SQL Lab';
  }

  // Draw the overview page.
  function renderHome() {
    var hero = "SELECT P.NAME, J.DEPTID, J.JOBCODE, J.EFFDT, J.ACTION, J.ANNUAL_RT\nFROM PS_JOB J\nJOIN PS_PERSONAL_DATA P ON P.EMPLID = J.EMPLID\nWHERE J.EFFDT = (SELECT MAX(J1.EFFDT) FROM PS_JOB J1\n                 WHERE J1.EMPLID = J.EMPLID\n                   AND J1.EMPL_RCD = J.EMPL_RCD\n                   AND J1.EFFDT <= SYSDATE)\n  AND J.EFFSEQ = (SELECT MAX(J2.EFFSEQ) FROM PS_JOB J2\n                  WHERE J2.EMPLID = J.EMPLID\n                    AND J2.EMPL_RCD = J.EMPL_RCD\n                    AND J2.EFFDT = J.EFFDT)\nORDER BY P.NAME";
    var html = '<div class="column"><h1>PeopleSoft SQL Lab</h1>' +
      '<p class="lede">Practice the SQL a PeopleSoft payroll developer writes every day, against tables shaped like the real ones.</p>' +
      '<p>This query is the one you will write most often: the row in effect today for every job. It runs in your browser on a small practice company. Edit it and run it again.</p>' +
      queryBox({ kind: 'example', sql: hero, original: hero }) +
      '<p>The course starts with how PeopleSoft stores data, spends most of its time on effective dating and the payroll tables, then covers window functions, investigation queries and data fixes. Each lesson has short reading, examples you can edit, and exercises that check your answer against a reference result.</p>';
    PSCourse.modules.forEach(function (mod) {
      html += '<h2 class="section">' + esc(mod.title) + '</h2><ul class="outline">';
      mod.lessons.forEach(function (l) {
        html += '<li><a href="#' + l.id + '"><span><span class="outline-title">' + esc(l.title) + '</span>' +
          '<span class="outline-summary">' + esc(l.summary) + '</span></span>' + countHtml(l) + '</a></li>';
      });
      html += '</ul>';
    });
    html += '<h2 class="section">Tools</h2><ul class="outline">' +
      '<li><a href="#scratchpad"><span><span class="outline-title">Scratchpad</span><span class="outline-summary">Run anything, including updates, inserts and deletes, with commit and rollback.</span></span></a></li>' +
      '<li><a href="#tables"><span><span class="outline-title">Tables</span><span class="outline-summary">Every table, its key and its columns.</span></span></a></li></ul>' +
      '<p class="small">Progress and drafts are saved in this browser only. <button class="btn quiet" data-act="resetprogress">Clear progress</button></p></div>';
    main.innerHTML = html;
    document.title = 'PeopleSoft SQL Lab';
    var first = main.querySelector('.querybox [data-act="run"]');
    if (first) first.click();
  }

  // Draw the scratchpad.
  function renderScratch() {
    var draft = state.drafts.scratchpad !== undefined ? state.drafts.scratchpad : 'SELECT *\nFROM PS_JOB\nWHERE EMPLID = \'100002\'\nORDER BY EFFDT, EFFSEQ';
    main.innerHTML = '<div class="column"><h1>Scratchpad</h1>' +
      '<p class="lede">A database of your own. Changes stay until you reset it or reload the page.</p>' +
      '<p>Separate statements with semicolons. Inserts, updates and deletes open a transaction, as in Oracle: nothing is permanent until you run <code>COMMIT</code>, and <code>ROLLBACK</code> undoes it. <code>DESC PS_JOB</code> lists a table’s columns.</p></div>' +
      queryBox({ kind: 'scratch', sql: draft });
    document.title = 'Scratchpad | PeopleSoft SQL Lab';
  }

  // Draw the table reference.
  function renderTables() {
    var html = '<div class="column"><h1>Tables</h1>' +
      '<p class="lede">Simplified versions of delivered PeopleSoft records. Key columns are marked.</p>';
    ['People', 'Payroll', 'Setup'].forEach(function (group) {
      html += '<h2 class="section">' + group + '</h2>';
      PSSchema.tables.filter(function (t) { return t.group === group; }).forEach(function (t) {
        html += '<details class="table-card"><summary><span class="tname">' + t.name + '</span><span class="tdescr">' + esc(t.descr) + '</span></summary>' +
          '<div class="body"><p class="keys">Key: ' + t.keys.join(', ') + '</p>' +
          '<table class="cols"><thead><tr><th>Column</th><th>Type</th><th>Notes</th></tr></thead><tbody>';
        t.cols.forEach(function (c) {
          var isKey = t.keys.indexOf(c[0]) >= 0;
          html += '<tr><td' + (isKey ? ' class="keycol"' : '') + '>' + c[0] + (isKey ? ' (key)' : '') + '</td><td>' + c[1] + '</td><td>' + esc(c[2]) + '</td></tr>';
        });
        html += '</tbody></table><div class="actions"><button class="btn" data-act="preview" data-table="' + t.name + '" data-target="prev-' + t.name + '">Show 5 rows</button></div>' +
          '<div class="output" id="prev-' + t.name + '"></div></div></details>';
      });
    });
    main.innerHTML = html + '</div>';
    document.title = 'Tables | PeopleSoft SQL Lab';
  }

  // The current view name taken from the address.
  function currentRoute() {
    var name = window.location.hash.replace(/^#/, '');
    if (name === 'scratchpad' || name === 'tables') return name;
    return PSCourse.findLesson(name) ? name : 'home';
  }

  // Show the view named in the address.
  function route() {
    var name = currentRoute();
    state.boxes = {};
    if (name === 'home') renderHome();
    else if (name === 'scratchpad') renderScratch();
    else if (name === 'tables') renderTables();
    else renderLesson(PSCourse.findLesson(name));
    Array.prototype.forEach.call(main.querySelectorAll('textarea'), autosize);
    renderNav(name);
    renderProgress();
    nav.classList.remove('open');
    document.getElementById('menu').setAttribute('aria-expanded', 'false');
    window.scrollTo(0, 0);
  }

  // Lab date control in the header.
  var dateInput = document.getElementById('labdate');
  function showLabDate() {
    dateInput.value = state.labDate;
    document.getElementById('labdate-wrap').classList.toggle('changed', state.labDate !== PSSeed.DEFAULT_LAB_DATE);
    document.getElementById('labdate-reset').hidden = state.labDate === PSSeed.DEFAULT_LAB_DATE;
  }
  function setLabDate(iso) {
    if (PSEngine.toJulian(iso) === null) { showLabDate(); return; }
    state.labDate = iso;
    if (state.scratch) state.scratch.setLabDate(iso);
    showLabDate();
    if (state.SQL) route();
  }
  dateInput.addEventListener('change', function () { setLabDate(dateInput.value); });
  document.getElementById('labdate-reset').addEventListener('click', function () { setLabDate(PSSeed.DEFAULT_LAB_DATE); });

  // Menu button for small screens.
  document.getElementById('menu').addEventListener('click', function () {
    var open = nav.classList.toggle('open');
    this.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  // Start up: load the SQL engine, build the database, then show the first view.
  loadSaved();
  showLabDate();
  window.initSqlJs().then(function (SQL) {
    state.SQL = SQL;
    state.bytes = PSEngine.buildSeedBytes(SQL);
    window.addEventListener('hashchange', route);
    route();
  }).catch(function (err) {
    main.innerHTML = '<div class="column"><h1>The lab could not start</h1><div class="error">' + esc(err && err.message ? err.message : err) + '</div></div>';
  });
})();
