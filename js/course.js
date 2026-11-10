// The course registry. Lesson files call PSCourse.add to register a module.
// A lesson body is a list of blocks: a string is a paragraph of HTML,
// { h } is a heading, { sql } is a runnable example, { note } is a callout
// and { list } is a bulleted list.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PSCourse = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var modules = [];

  // The effective date filter that picks the current PS_JOB row.
  // Starters reuse it so later lessons can focus on the new idea.
  var CURRENT_JOB =
    'SELECT J.*\n' +
    '  FROM PS_JOB J\n' +
    '  WHERE J.EFFDT = (SELECT MAX(J1.EFFDT) FROM PS_JOB J1\n' +
    '                   WHERE J1.EMPLID = J.EMPLID\n' +
    '                     AND J1.EMPL_RCD = J.EMPL_RCD\n' +
    '                     AND J1.EFFDT <= SYSDATE)\n' +
    '    AND J.EFFSEQ = (SELECT MAX(J2.EFFSEQ) FROM PS_JOB J2\n' +
    '                    WHERE J2.EMPLID = J.EMPLID\n' +
    '                      AND J2.EMPL_RCD = J.EMPL_RCD\n' +
    '                      AND J2.EFFDT = J.EFFDT)';

  // Register one module of lessons.
  function add(mod) { modules.push(mod); }

  // Every lesson in course order.
  function lessons() {
    var all = [];
    modules.forEach(function (m) { m.lessons.forEach(function (l) { all.push(l); }); });
    return all;
  }

  // Every exercise in course order, tagged with its lesson.
  function exercises() {
    var all = [];
    lessons().forEach(function (l) {
      (l.exercises || []).forEach(function (e) { all.push({ lesson: l, exercise: e }); });
    });
    return all;
  }

  // Find a lesson by its id.
  function findLesson(id) {
    var found = null;
    lessons().forEach(function (l) { if (l.id === id) found = l; });
    return found;
  }

  return { modules: modules, add: add, lessons: lessons, exercises: exercises, findLesson: findLesson, CURRENT_JOB: CURRENT_JOB };
});
