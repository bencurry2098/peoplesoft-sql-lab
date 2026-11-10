// Runs every example and every reference solution against the lab engine.
// Usage: node tools/test.js [-v]
const path = require('path');
const root = path.join(__dirname, '..');
const initSqlJs = require(path.join(root, 'vendor', 'sql-asm.js'));
const PSEngine = require(path.join(root, 'js', 'engine.js'));
const PSCourse = require(path.join(root, 'js', 'course.js'));
require(path.join(root, 'js', 'lessons-1.js'));
require(path.join(root, 'js', 'lessons-2.js'));

const verbose = process.argv.includes('-v');

initSqlJs().then(function (SQL) {
  const bytes = PSEngine.buildSeedBytes(SQL);
  const labDate = '2026-11-10';
  let failures = 0, examples = 0, exercises = 0;
  const seen = {};

  // Print a result set in a compact form.
  function show(rows) {
    console.log('    ' + rows.columns.join(' | '));
    rows.rows.slice(0, 30).forEach(function (r) { console.log('    ' + r.map(PSEngine.formatValue).join(' | ')); });
  }

  PSCourse.lessons().forEach(function (lesson) {
    // Every example block must run without an error.
    lesson.body.forEach(function (block) {
      if (!block.sql) return;
      examples++;
      const eng = PSEngine.create(SQL, bytes, { labDate: labDate });
      const res = eng.run(block.sql);
      eng.close();
      if (!res.ok) {
        failures++;
        console.log('FAIL example in ' + lesson.id + ': ' + res.items[res.items.length - 1].text);
      } else if (verbose) {
        console.log('example in ' + lesson.id);
        const last = PSEngine.lastRows(res);
        if (last) show(last);
      }
    });

    // Every solution must pass its own check, and a blank answer must not.
    (lesson.exercises || []).forEach(function (ex) {
      exercises++;
      if (seen[ex.id]) { failures++; console.log('FAIL duplicate exercise id ' + ex.id); }
      seen[ex.id] = true;
      const want = PSEngine.expected(SQL, bytes, labDate, ex);
      const result = PSEngine.check(SQL, bytes, labDate, ex, ex.solution);
      if (!want || !result.pass) {
        failures++;
        console.log('FAIL ' + ex.id + ': ' + result.message);
        return;
      }
      if (want.rows.length === 0) { failures++; console.log('FAIL ' + ex.id + ': solution returns no rows'); }
      if (ex.starter) {
        const s = PSEngine.check(SQL, bytes, labDate, ex, ex.starter);
        if (s.pass) { failures++; console.log('FAIL ' + ex.id + ': the starter already passes'); }
        if (!s.result.ok && !ex.verify) { failures++; console.log('FAIL ' + ex.id + ': the starter does not run: ' + s.result.items[s.result.items.length - 1].text); }
      }
      console.log('ok   ' + ex.id + '  ' + want.rows.length + ' rows, ' + want.columns.length + ' columns');
      if (verbose) show(want);
    });
  });

  console.log('\n' + examples + ' examples and ' + exercises + ' exercises checked, ' + failures + ' failures.');
  process.exit(failures ? 1 : 0);
});
