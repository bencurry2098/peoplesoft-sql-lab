// Lessons, part two: window functions, investigation patterns, data fixes, tickets and reference.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) factory(require('./course.js'));
  else factory(root.PSCourse);
})(typeof self !== 'undefined' ? self : this, function (PSCourse) {
  'use strict';

  // A WITH clause holding the current job rows, used as a starting point in several exercises.
  var CUR = 'WITH CUR AS (\n  ' + PSCourse.CURRENT_JOB + '\n)\n';

  // Module 4: window functions.
  PSCourse.add({
    id: 'window-functions',
    title: 'Window functions',
    lessons: [
      {
        id: 'how-windows-work',
        title: 'How window functions work',
        summary: 'OVER, PARTITION BY, and why every row survives.',
        body: [
          "<code>GROUP BY</code> collapses rows: ask for total gross per pay group and the individual checks are gone. A <b>window function</b> computes across a set of rows too, but returns its answer on every row and collapses nothing. That is what lets you show a check next to the total it belongs to.",
          "Any aggregate becomes a window function when you add <code>OVER (...)</code>. The parentheses describe the window, the set of rows the function sees from the current row:",
          { list: [
            "<code>OVER ()</code>: every row in the result.",
            "<code>OVER (PARTITION BY x)</code>: only rows that share this row’s <code>x</code>. Like <code>GROUP BY</code>, without the collapse.",
            "<code>OVER (PARTITION BY x ORDER BY y)</code>: the partition, put in order. Ordering is what ranking, previous row and running total functions need."
          ] },
          { sql: "SELECT C.PAYGROUP, C.EMPLID, C.TOTAL_GROSS,\n       SUM(C.TOTAL_GROSS) OVER () AS ALL_GROSS,\n       SUM(C.TOTAL_GROSS) OVER (PARTITION BY C.PAYGROUP) AS PAYGROUP_GROSS,\n       COUNT(*) OVER (PARTITION BY C.PAYGROUP) AS PAYGROUP_CHECKS\nFROM PS_PAY_CHECK C\nWHERE C.PAY_END_DT = DATE '2026-10-31'\nORDER BY C.PAYGROUP, C.EMPLID" },
          { h: "When they run" },
          "Oracle evaluates a query in a fixed order: <code>FROM</code> and joins, <code>WHERE</code>, <code>GROUP BY</code>, <code>HAVING</code>, then window functions, then <code>DISTINCT</code> and <code>ORDER BY</code>. Two consequences follow.",
          { list: [
            "Window functions see only the rows that survived <code>WHERE</code>. Filter to one pay period and the window is that pay period.",
            "You cannot filter on a window function in the same query’s <code>WHERE</code>, because <code>WHERE</code> has already run. Compute it in an inline view or a <code>WITH</code> clause and filter in the query around it."
          ] },
          { note: "Many exercises from here on start with <code>WITH CUR AS (...)</code>, the current job rows you built in the effective dating lessons. A <code>WITH</code> clause names a query so the main query can select from it like a table." }
        ],
        exercises: [
          {
            id: 'd1-1', title: 'Share of the pay group',
            prompt: "For checks in pay group <code>BW2</code> with <code>PAY_END_DT</code> 31 October 2026, return <code>EMPLID</code>, <code>TOTAL_GROSS</code>, the total gross of all those checks, and each check’s percentage of that total rounded to one decimal.",
            hints: ["<code>SUM(TOTAL_GROSS) OVER ()</code> puts the grand total on every row.", "Percentage: <code>ROUND(100 * TOTAL_GROSS / SUM(TOTAL_GROSS) OVER (), 1)</code>."],
            solution: `SELECT EMPLID, TOTAL_GROSS,
       SUM(TOTAL_GROSS) OVER () AS GROUP_GROSS,
       ROUND(100 * TOTAL_GROSS / SUM(TOTAL_GROSS) OVER (), 1) AS PCT_OF_GROUP
FROM PS_PAY_CHECK
WHERE PAYGROUP = 'BW2'
  AND PAY_END_DT = DATE '2026-10-31'`
          },
          {
            id: 'd1-2', title: 'Salary against the department average',
            prompt: "For current job rows with <code>HR_STATUS</code> A, return <code>EMPLID</code>, <code>DEPTID</code>, <code>ANNUAL_RT</code>, the department’s average <code>ANNUAL_RT</code> rounded to a whole number, and the difference between the two.",
            hints: ["<code>AVG(ANNUAL_RT) OVER (PARTITION BY DEPTID)</code>.", "Repeat the rounded average expression for the difference: <code>ANNUAL_RT - ROUND(AVG(...) OVER (...))</code>."],
            starter: CUR + "SELECT EMPLID, DEPTID, ANNUAL_RT\nFROM CUR\nWHERE HR_STATUS = 'A'",
            solution: CUR + `SELECT EMPLID, DEPTID, ANNUAL_RT,
       ROUND(AVG(ANNUAL_RT) OVER (PARTITION BY DEPTID)) AS DEPT_AVG,
       ANNUAL_RT - ROUND(AVG(ANNUAL_RT) OVER (PARTITION BY DEPTID)) AS DIFF
FROM CUR
WHERE HR_STATUS = 'A'`
          }
        ]
      },
      {
        id: 'ranking',
        title: 'ROW_NUMBER, RANK and DENSE_RANK',
        summary: 'Three ways to number rows, and what each does with ties.',
        body: [
          "The ranking functions number the rows of each partition in the order you give. They differ only in how they treat ties.",
          { list: [
            "<code>ROW_NUMBER()</code>: 1, 2, 3, 4. Always unique. Tied rows get different numbers, and which gets which is arbitrary unless your <code>ORDER BY</code> breaks the tie.",
            "<code>RANK()</code>: 1, 2, 2, 4. Ties share a rank and the next rank skips, like a race.",
            "<code>DENSE_RANK()</code>: 1, 2, 2, 3. Ties share a rank and nothing is skipped."
          ] },
          "Department 10100 has two people on exactly the same salary, so all three behave differently there:",
          { sql: CUR + "SELECT EMPLID, ANNUAL_RT,\n       ROW_NUMBER() OVER (ORDER BY ANNUAL_RT DESC) AS ROW_NUM,\n       RANK() OVER (ORDER BY ANNUAL_RT DESC) AS RNK,\n       DENSE_RANK() OVER (ORDER BY ANNUAL_RT DESC) AS DENSE_RNK\nFROM CUR\nWHERE DEPTID = '10100'\n  AND HR_STATUS = 'A'" },
          { h: "Which one to use" },
          { list: [
            "Exactly one row per group, such as the latest check or the current row: <code>ROW_NUMBER()</code>, with an <code>ORDER BY</code> that cannot tie.",
            "Top N where ties should all be included: <code>RANK()</code>.",
            "The Nth distinct value, such as the second highest salary: <code>DENSE_RANK()</code>."
          ] },
          { h: "Top N per group" },
          "Rank inside a subquery, then filter outside it. This shape is worth memorizing, because it answers every “first, last, top or latest per something” question.",
          { sql: "SELECT EMPLID, EMPL_RCD, PAY_END_DT, TOTAL_GROSS\nFROM (\n  SELECT C.EMPLID, C.EMPL_RCD, C.PAY_END_DT, C.TOTAL_GROSS,\n         ROW_NUMBER() OVER (PARTITION BY C.EMPLID, C.EMPL_RCD\n                            ORDER BY C.PAY_END_DT DESC, C.SEPCHK DESC) AS RN\n  FROM PS_PAY_CHECK C\n  WHERE C.PAYCHECK_STATUS = 'F'\n    AND C.OFF_CYCLE = 'N'\n)\nWHERE RN = 1\nORDER BY EMPLID, EMPL_RCD" }
        ],
        exercises: [
          {
            id: 'd2-1', title: 'Rank salaries inside each department',
            prompt: "For current job rows with <code>HR_STATUS</code> A, return <code>EMPLID</code>, <code>DEPTID</code>, <code>ANNUAL_RT</code>, and both the <code>RANK</code> and the <code>DENSE_RANK</code> of the salary within its department, highest first.",
            hints: ["Both functions use the same window: <code>OVER (PARTITION BY DEPTID ORDER BY ANNUAL_RT DESC)</code>."],
            starter: CUR + "SELECT EMPLID, DEPTID, ANNUAL_RT\nFROM CUR\nWHERE HR_STATUS = 'A'",
            solution: CUR + `SELECT EMPLID, DEPTID, ANNUAL_RT,
       RANK() OVER (PARTITION BY DEPTID ORDER BY ANNUAL_RT DESC) AS RNK,
       DENSE_RANK() OVER (PARTITION BY DEPTID ORDER BY ANNUAL_RT DESC) AS DENSE_RNK
FROM CUR
WHERE HR_STATUS = 'A'`
          },
          {
            id: 'd2-2', title: 'Top two earners per department',
            prompt: "Return <code>DEPTID</code>, <code>EMPLID</code>, <code>ANNUAL_RT</code> and the rank, for current active job rows (<code>HR_STATUS</code> A) ranked first or second by salary in their department. Use <code>RANK</code>.",
            hints: ["You cannot write <code>WHERE RANK() ... &lt;= 2</code>. Rank in an inline view or a second <code>WITH</code> query, then filter.", "A second query in the same <code>WITH</code> is separated by a comma: <code>WITH CUR AS (...), RANKED AS (...)</code>."],
            requires: [{ pattern: 'RANK\\s*\\(', label: 'RANK()' }],
            starter: CUR + "SELECT DEPTID, EMPLID, ANNUAL_RT\nFROM CUR\nWHERE HR_STATUS = 'A'",
            solution: 'WITH CUR AS (\n  ' + PSCourse.CURRENT_JOB + `
),
RANKED AS (
  SELECT DEPTID, EMPLID, ANNUAL_RT,
         RANK() OVER (PARTITION BY DEPTID ORDER BY ANNUAL_RT DESC) AS RNK
  FROM CUR
  WHERE HR_STATUS = 'A'
)
SELECT DEPTID, EMPLID, ANNUAL_RT, RNK
FROM RANKED
WHERE RNK <= 2`
          },
          {
            id: 'd2-3', title: 'Each person’s biggest check',
            prompt: "Among confirmed checks (<code>PAYCHECK_STATUS = 'F'</code>), return <code>EMPLID</code>, <code>PAY_END_DT</code> and <code>NET_PAY</code> for each employee’s highest net check. When several checks tie, take the one with the latest <code>PAY_END_DT</code>.",
            hints: ["One row per employee means <code>ROW_NUMBER()</code>.", "<code>PARTITION BY EMPLID ORDER BY NET_PAY DESC, PAY_END_DT DESC</code>, then keep row 1."],
            requires: [{ pattern: 'ROW_NUMBER\\s*\\(', label: 'ROW_NUMBER()' }],
            solution: `SELECT EMPLID, PAY_END_DT, NET_PAY
FROM (
  SELECT C.EMPLID, C.PAY_END_DT, C.NET_PAY,
         ROW_NUMBER() OVER (PARTITION BY C.EMPLID
                            ORDER BY C.NET_PAY DESC, C.PAY_END_DT DESC) AS RN
  FROM PS_PAY_CHECK C
  WHERE C.PAYCHECK_STATUS = 'F'
)
WHERE RN = 1`
          }
        ]
      },
      {
        id: 'effective-dating-with-row-number',
        title: 'Effective dating with ROW_NUMBER',
        summary: 'The current row as a top one per group problem.',
        body: [
          "“The row with the latest <code>EFFDT</code>, and the highest <code>EFFSEQ</code> on that date, for each job” is a top one per group question. So <code>ROW_NUMBER</code> can replace both correlated subqueries with a single ordering:",
          { sql: "SELECT EMPLID, EMPL_RCD, EFFDT, EFFSEQ, ACTION, DEPTID\nFROM (\n  SELECT J.*,\n         ROW_NUMBER() OVER (PARTITION BY J.EMPLID, J.EMPL_RCD\n                            ORDER BY J.EFFDT DESC, J.EFFSEQ DESC) AS RN\n  FROM PS_JOB J\n  WHERE J.EFFDT <= SYSDATE\n)\nWHERE RN = 1\n  AND EMPLID IN ('100002', '100012')" },
          "Three details carry the logic. The partition is the key without <code>EFFDT</code> and <code>EFFSEQ</code>. The ordering is descending on both, so row 1 is the top of stack. And the date cap sits in the inner <code>WHERE</code>, so future rows are removed <b>before</b> numbering. Put the cap outside and row 1 may be a future row that then gets filtered away, leaving nothing for that person.",
          { h: "Which form to use" },
          { list: [
            "The <b>subquery</b> form is what delivered PeopleSoft code, PS Query and most of your colleagues use. You must read and write it fluently, and it is the only form PS Query generates.",
            "The <b>ROW_NUMBER</b> form reads the table once, cannot forget <code>EFFSEQ</code>, and extends to things the subquery form does badly, such as the row before the current one. It suits SQR, Application Engine SQL and ad hoc investigation.",
            "Status filters follow the same rule as before: number first, then test <code>EMPL_STATUS</code> or <code>EFF_STATUS</code> on row 1 in the outer query."
          ] },
          { note: "The same shape finds the latest row in tables that are not effective dated at all, such as the most recent month in a balance table. The second exercise does exactly that." }
        ],
        exercises: [
          {
            id: 'd3-1', title: 'Current job rows, the other way',
            prompt: "Return <code>EMPLID</code>, <code>EMPL_RCD</code>, <code>EFFDT</code>, <code>EFFSEQ</code>, <code>DEPTID</code>, <code>JOBCODE</code> and <code>EMPL_STATUS</code> for the current row of every job, using <code>ROW_NUMBER</code> instead of <code>MAX</code> subqueries.",
            hints: ["Partition by <code>EMPLID, EMPL_RCD</code>. Order by <code>EFFDT DESC, EFFSEQ DESC</code>.", "<code>EFFDT &lt;= SYSDATE</code> goes inside, with the numbering. <code>RN = 1</code> goes outside."],
            requires: [{ pattern: 'ROW_NUMBER\\s*\\(', label: 'ROW_NUMBER()' }],
            wrong: [{ rows: 15, msg: "If 100012 pushed someone out, or a person vanished, check that the date cap is inside the subquery with the numbering." }],
            solution: `SELECT EMPLID, EMPL_RCD, EFFDT, EFFSEQ, DEPTID, JOBCODE, EMPL_STATUS
FROM (
  SELECT J.*,
         ROW_NUMBER() OVER (PARTITION BY J.EMPLID, J.EMPL_RCD
                            ORDER BY J.EFFDT DESC, J.EFFSEQ DESC) AS RN
  FROM PS_JOB J
  WHERE J.EFFDT <= SYSDATE
)
WHERE RN = 1`
          },
          {
            id: 'd3-2', title: 'Latest balance row',
            prompt: "<code>PS_EARNINGS_BAL</code> has a row only for months with activity, and the latest month holds the year to date figure. For earnings code <code>REG</code> in balance year 2026, return <code>EMPLID</code>, <code>EMPL_RCD</code>, <code>BALANCE_PERIOD</code> and <code>GRS_YTD</code> from each job’s latest row.",
            hints: ["Partition by <code>EMPLID, EMPL_RCD</code> and order by <code>BALANCE_PERIOD DESC</code>.", "Filter <code>ERNCD</code> and <code>BALANCE_YEAR</code> inside, before numbering."],
            requires: [{ pattern: 'ROW_NUMBER\\s*\\(', label: 'ROW_NUMBER()' }],
            solution: `SELECT EMPLID, EMPL_RCD, BALANCE_PERIOD, GRS_YTD
FROM (
  SELECT B.*,
         ROW_NUMBER() OVER (PARTITION BY B.EMPLID, B.EMPL_RCD
                            ORDER BY B.BALANCE_PERIOD DESC) AS RN
  FROM PS_EARNINGS_BAL B
  WHERE B.ERNCD = 'REG'
    AND B.BALANCE_YEAR = 2026
)
WHERE RN = 1`
          },
          {
            id: 'd3-3', title: 'The very first row',
            prompt: "Return <code>EMPLID</code>, <code>EMPL_RCD</code>, <code>EFFDT</code> and <code>ACTION</code> for the earliest row of every job in <code>PS_JOB</code>, including jobs that start in the future.",
            hints: ["Flip the ordering to ascending and drop the date cap."],
            requires: [{ pattern: 'ROW_NUMBER\\s*\\(', label: 'ROW_NUMBER()' }],
            solution: `SELECT EMPLID, EMPL_RCD, EFFDT, ACTION
FROM (
  SELECT J.*,
         ROW_NUMBER() OVER (PARTITION BY J.EMPLID, J.EMPL_RCD
                            ORDER BY J.EFFDT, J.EFFSEQ) AS RN
  FROM PS_JOB J
)
WHERE RN = 1`
          }
        ]
      },
      {
        id: 'lag-and-lead',
        title: 'LAG and LEAD',
        summary: 'Reading the previous or next row without a self join.',
        body: [
          "<code>LAG(x)</code> returns the value of <code>x</code> from the previous row of the partition, in window order. <code>LEAD(x)</code> returns it from the next row. The first row has no previous row and the last has no next, so they return null there. A second argument reaches further back and a third supplies a default: <code>LAG(x, 1, 0)</code>.",
          { sql: "SELECT J.EFFDT, J.ACTION, J.ANNUAL_RT,\n       LAG(J.ANNUAL_RT) OVER (ORDER BY J.EFFDT, J.EFFSEQ) AS PREV_RT,\n       LEAD(J.EFFDT) OVER (ORDER BY J.EFFDT, J.EFFSEQ) AS NEXT_EFFDT\nFROM PS_JOB J\nWHERE J.EMPLID = '100013'\nORDER BY J.EFFDT, J.EFFSEQ" },
          { h: "Why they suit effective dated data" },
          "Effective dated history is a sequence of states, and the usual questions are about the steps between them. What did this row change? How long did it last? Before window functions each of those needed a self join with yet another <code>MAX</code> subquery to find the neighbouring row.",
          { list: [
            "<b>What changed</b>: compare a column with its <code>LAG</code>. A raise is <code>ANNUAL_RT - LAG(ANNUAL_RT)</code>.",
            "<b>End dates</b>: a row lasts until the day before the next row starts, so its end date is <code>LEAD(EFFDT) - 1</code>. The current row has no next row and stays open ended.",
            "<b>Paycheck variance</b>: compare each check to the same person’s previous check to catch pay that jumped or dropped."
          ] },
          { note: "With one person in the <code>WHERE</code> clause you can omit <code>PARTITION BY</code>. With many people it is essential. Without it, the first row of one employee reads the last row of another." }
        ],
        exercises: [
          {
            id: 'd4-1', title: 'Raise history', ordered: true,
            prompt: "For employee 100009, return each job row’s <code>EFFDT</code>, <code>ANNUAL_RT</code>, the previous row’s <code>ANNUAL_RT</code>, and the change between them. Sort by <code>EFFDT</code>.",
            hints: ["<code>LAG(ANNUAL_RT) OVER (ORDER BY EFFDT, EFFSEQ)</code>.", "The first row has no previous rate, so its last two columns are null. That is expected."],
            solution: `SELECT EFFDT, ANNUAL_RT,
       LAG(ANNUAL_RT) OVER (ORDER BY EFFDT, EFFSEQ) AS PREV_RT,
       ANNUAL_RT - LAG(ANNUAL_RT) OVER (ORDER BY EFFDT, EFFSEQ) AS CHANGE
FROM PS_JOB
WHERE EMPLID = '100009'
ORDER BY EFFDT`
          },
          {
            id: 'd4-2', title: 'Give every row an end date', ordered: true,
            prompt: "For employee 100001, return each job row’s <code>EFFDT</code>, the date the row stopped being in effect (the day before the next row starts, null for the last row), and <code>ANNUAL_RT</code>. Sort by <code>EFFDT</code>.",
            hints: ["<code>LEAD(EFFDT) OVER (ORDER BY EFFDT, EFFSEQ)</code> is the next row’s start.", "Subtract 1 from a date to get the day before."],
            solution: `SELECT EFFDT,
       LEAD(EFFDT) OVER (ORDER BY EFFDT, EFFSEQ) - 1 AS END_DT,
       ANNUAL_RT
FROM PS_JOB
WHERE EMPLID = '100001'
ORDER BY EFFDT`
          },
          {
            id: 'd4-3', title: 'Checks that jumped or dropped',
            prompt: "A standard payroll audit. Among regular checks (<code>OFF_CYCLE = 'N'</code>, <code>SEPCHK = 0</code>, not merely calculated), find checks whose <code>TOTAL_GROSS</code> differs from the same job’s previous check by more than 20 percent of the previous amount. Return <code>EMPLID</code>, <code>EMPL_RCD</code>, <code>PAY_END_DT</code>, <code>TOTAL_GROSS</code> and the previous gross.",
            hints: ["<code>LAG(TOTAL_GROSS) OVER (PARTITION BY EMPLID, EMPL_RCD ORDER BY PAY_END_DT)</code> in an inline view.", "Outside it: <code>WHERE ABS(TOTAL_GROSS - PREV_GROSS) &gt; 0.2 * PREV_GROSS</code>."],
            requires: [{ pattern: 'LAG\\s*\\(', label: 'LAG()' }],
            solution: `SELECT EMPLID, EMPL_RCD, PAY_END_DT, TOTAL_GROSS, PREV_GROSS
FROM (
  SELECT C.EMPLID, C.EMPL_RCD, C.PAY_END_DT, C.TOTAL_GROSS,
         LAG(C.TOTAL_GROSS) OVER (PARTITION BY C.EMPLID, C.EMPL_RCD
                                  ORDER BY C.PAY_END_DT) AS PREV_GROSS
  FROM PS_PAY_CHECK C
  WHERE C.OFF_CYCLE = 'N'
    AND C.SEPCHK = 0
    AND C.PAYCHECK_STATUS <> 'C'
)
WHERE ABS(TOTAL_GROSS - PREV_GROSS) > 0.2 * PREV_GROSS`
          }
        ]
      },
      {
        id: 'running-totals-and-frames',
        title: 'Running totals and frames',
        summary: 'Year to date sums, ROWS against RANGE, and moving averages.',
        body: [
          "Add <code>ORDER BY</code> to an aggregate’s window and it stops covering the whole partition. It covers the rows from the start of the partition up to the current row. That is a running total, and it is how you rebuild year to date figures from individual checks.",
          { sql: "SELECT C.PAY_END_DT, C.TOTAL_GROSS,\n       SUM(C.TOTAL_GROSS) OVER (ORDER BY C.PAY_END_DT) AS YTD_GROSS\nFROM PS_PAY_CHECK C\nWHERE C.EMPLID = '100016'\n  AND C.PAYCHECK_STATUS = 'F'\nORDER BY C.PAY_END_DT\nFETCH FIRST 6 ROWS ONLY" },
          { h: "The frame" },
          "The rows a window function actually uses are its <b>frame</b>. When there is an <code>ORDER BY</code> and you say nothing more, the frame is <code>RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW</code>. <code>RANGE</code> works on values, so “current row” means the current row <b>and every row that ties with it</b> in the ordering. Employee 100009 has two checks with the same date, and the default frame gives both the same running total:",
          { sql: "SELECT C.CHECK_DT, C.SEPCHK, C.TOTAL_GROSS,\n       SUM(C.TOTAL_GROSS) OVER (ORDER BY C.CHECK_DT) AS RANGE_DEFAULT,\n       SUM(C.TOTAL_GROSS) OVER (ORDER BY C.CHECK_DT, C.SEPCHK\n                                ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS ROWS_EXPLICIT\nFROM PS_PAY_CHECK C\nWHERE C.EMPLID = '100009'\n  AND C.PAYCHECK_STATUS = 'F'\n  AND C.CHECK_DT BETWEEN DATE '2026-03-01' AND DATE '2026-04-15'\nORDER BY C.CHECK_DT, C.SEPCHK" },
          "<code>ROWS</code> counts physical rows, so each row adds exactly itself. For running totals, write <code>ROWS</code> explicitly and order by something unique. Then you never have to wonder.",
          { h: "Other frames" },
          { list: [
            "<code>ROWS BETWEEN 2 PRECEDING AND CURRENT ROW</code>: this row and the two before it. A three row moving average.",
            "<code>ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING</code>: the whole partition, even with an <code>ORDER BY</code>.",
            "Add <code>PARTITION BY</code> to restart the total. Partition by employee and quarter for quarter to date, by employee and year for year to date."
          ] }
        ],
        exercises: [
          {
            id: 'd5-1', title: 'Year to date gross', ordered: true,
            prompt: "For employee 100002’s confirmed checks (<code>PAYCHECK_STATUS = 'F'</code>), return <code>PAY_END_DT</code>, <code>TOTAL_GROSS</code> and the running total of gross, sorted by <code>PAY_END_DT</code>.",
            hints: ["<code>SUM(TOTAL_GROSS) OVER (ORDER BY PAY_END_DT ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)</code>."],
            solution: `SELECT PAY_END_DT, TOTAL_GROSS,
       SUM(TOTAL_GROSS) OVER (ORDER BY PAY_END_DT
                              ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS YTD_GROSS
FROM PS_PAY_CHECK
WHERE EMPLID = '100002'
  AND PAYCHECK_STATUS = 'F'
ORDER BY PAY_END_DT`
          },
          {
            id: 'd5-2', title: 'Quarter to date beside year to date', ordered: true,
            prompt: "For employee 100009’s confirmed checks, return <code>CHECK_DT</code>, <code>SEPCHK</code>, <code>TOTAL_GROSS</code>, quarter to date gross and year to date gross. Quarters follow <code>CHECK_DT</code>. Treat his two checks on the same date as separate steps, main check first. Sort by <code>CHECK_DT</code>, then <code>SEPCHK</code>.",
            hints: ["Year to date: order by <code>CHECK_DT, SEPCHK</code> with a <code>ROWS</code> frame.", "Quarter to date is the same window with <code>PARTITION BY TO_CHAR(CHECK_DT, 'Q')</code> in front."],
            solution: `SELECT CHECK_DT, SEPCHK, TOTAL_GROSS,
       SUM(TOTAL_GROSS) OVER (PARTITION BY TO_CHAR(CHECK_DT, 'Q')
                              ORDER BY CHECK_DT, SEPCHK
                              ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS QTD_GROSS,
       SUM(TOTAL_GROSS) OVER (ORDER BY CHECK_DT, SEPCHK
                              ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS YTD_GROSS
FROM PS_PAY_CHECK
WHERE EMPLID = '100009'
  AND PAYCHECK_STATUS = 'F'
ORDER BY CHECK_DT, SEPCHK`
          },
          {
            id: 'd5-3', title: 'Smoothing overtime', ordered: true,
            prompt: "For employee 100002, using <code>PS_PAY_EARNINGS</code> rows with <code>PAY_END_DT</code> on or before 31 October 2026, return <code>PAY_END_DT</code>, <code>OT_HRS</code> and the average of <code>OT_HRS</code> over that period and the two before it, rounded to two decimals. Sort by <code>PAY_END_DT</code>.",
            hints: ["<code>AVG(OT_HRS) OVER (ORDER BY PAY_END_DT ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)</code>.", "The first two rows average over fewer rows. That is normal."],
            solution: `SELECT PAY_END_DT, OT_HRS,
       ROUND(AVG(OT_HRS) OVER (ORDER BY PAY_END_DT
                               ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2) AS OT_3_PERIOD_AVG
FROM PS_PAY_EARNINGS
WHERE EMPLID = '100002'
  AND PAY_END_DT <= DATE '2026-10-31'
ORDER BY PAY_END_DT`
          }
        ]
      },
      {
        id: 'more-analytic-tools',
        title: 'More analytic tools',
        summary: 'FIRST_VALUE, NTILE, counting over a window, and ranking aggregates.',
        body: [
          { h: "FIRST_VALUE and the LAST_VALUE trap" },
          "<code>FIRST_VALUE(x)</code> returns <code>x</code> from the first row of the frame, which makes it easy to put a starting value on every row. <code>LAST_VALUE(x)</code> looks like its mirror image and is a well known trap: with the default frame the last row of the frame <b>is the current row</b>, so it just returns the current value. Either widen the frame to <code>UNBOUNDED FOLLOWING</code>, or use <code>FIRST_VALUE</code> with the order reversed.",
          { sql: "SELECT J.EFFDT, J.ANNUAL_RT,\n       FIRST_VALUE(J.ANNUAL_RT) OVER (ORDER BY J.EFFDT, J.EFFSEQ) AS STARTING_RT,\n       LAST_VALUE(J.ANNUAL_RT) OVER (ORDER BY J.EFFDT, J.EFFSEQ) AS LAST_VALUE_TRAP,\n       LAST_VALUE(J.ANNUAL_RT) OVER (ORDER BY J.EFFDT, J.EFFSEQ\n                                     ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS LATEST_RT\nFROM PS_JOB J\nWHERE J.EMPLID = '100015'\nORDER BY J.EFFDT" },
          { h: "NTILE" },
          "<code>NTILE(4)</code> deals the ordered rows into four buckets of nearly equal size and returns the bucket number. Quartiles and deciles for compensation reports come from this. Like <code>ROW_NUMBER</code>, it needs a tie breaker in the ordering to be repeatable.",
          { h: "Counting over a window" },
          "<code>COUNT(*) OVER (PARTITION BY ...)</code> puts the size of each group on every row. Filter where it is greater than 1 and you get the duplicate rows themselves, complete, rather than the bare keys that <code>GROUP BY ... HAVING</code> gives you.",
          { h: "Windows over aggregates" },
          "Window functions run after <code>GROUP BY</code>, so they can rank grouped totals in the same query:",
          { sql: "SELECT C.DEPTID, SUM(C.TOTAL_GROSS) AS DEPT_GROSS,\n       RANK() OVER (ORDER BY SUM(C.TOTAL_GROSS) DESC) AS RNK\nFROM PS_PAY_CHECK C\nWHERE C.PAYCHECK_STATUS <> 'C'\nGROUP BY C.DEPTID" },
          { h: "Oracle extras you will meet" },
          { list: [
            "<code>MAX(x) KEEP (DENSE_RANK LAST ORDER BY EFFDT, EFFSEQ)</code>: the value of <code>x</code> on the latest row, as an ordinary aggregate. Compact, Oracle only, and common in tuned PeopleSoft SQL.",
            "<code>LISTAGG(x, ', ') WITHIN GROUP (ORDER BY y)</code>: glue a group’s values into one string. The lab supports it.",
            "<code>RATIO_TO_REPORT(x) OVER (...)</code>: a value’s share of its window total.",
            "<code>LAG(x) IGNORE NULLS</code>: skip nulls when looking back."
          ] },
          { note: "The lab runs <code>LISTAGG</code> but not <code>KEEP</code>, <code>RATIO_TO_REPORT</code> or <code>IGNORE NULLS</code>. See “Lab versus real Oracle” in the reference section." }
        ],
        exercises: [
          {
            id: 'd6-1', title: 'Starting pay and pay now',
            prompt: "For employment record 0, using job rows effective on or before today, return one row per <code>EMPLID</code> with the starting <code>ANNUAL_RT</code> and the current <code>ANNUAL_RT</code>.",
            hints: ["Two <code>FIRST_VALUE</code> calls with opposite orderings, both partitioned by <code>EMPLID</code>.", "Every job row returns the same pair, so add <code>DISTINCT</code>."],
            requires: [{ pattern: 'FIRST_VALUE\\s*\\(|LAST_VALUE\\s*\\(', label: 'FIRST_VALUE() or LAST_VALUE()' }],
            solution: `SELECT DISTINCT EMPLID,
       FIRST_VALUE(ANNUAL_RT) OVER (PARTITION BY EMPLID ORDER BY EFFDT, EFFSEQ) AS STARTING_RT,
       FIRST_VALUE(ANNUAL_RT) OVER (PARTITION BY EMPLID ORDER BY EFFDT DESC, EFFSEQ DESC) AS CURRENT_RT
FROM PS_JOB
WHERE EMPL_RCD = 0
  AND EFFDT <= SYSDATE`
          },
          {
            id: 'd6-2', title: 'Salary quartiles',
            prompt: "For current job rows that are active (<code>HR_STATUS</code> A) and salaried (<code>EMPL_TYPE</code> S), return <code>EMPLID</code>, <code>ANNUAL_RT</code> and the salary quartile, where quartile 1 is the highest paid. Break ties by <code>EMPLID</code>.",
            hints: ["<code>NTILE(4) OVER (ORDER BY ANNUAL_RT DESC, EMPLID)</code>."],
            starter: CUR + "SELECT EMPLID, ANNUAL_RT\nFROM CUR\nWHERE HR_STATUS = 'A'\n  AND EMPL_TYPE = 'S'",
            solution: CUR + `SELECT EMPLID, ANNUAL_RT,
       NTILE(4) OVER (ORDER BY ANNUAL_RT DESC, EMPLID) AS QUARTILE
FROM CUR
WHERE HR_STATUS = 'A'
  AND EMPL_TYPE = 'S'`
          },
          {
            id: 'd6-3', title: 'Show the duplicates themselves',
            prompt: "Earlier you found which job had two rows on one date. Now return the rows: <code>EMPLID</code>, <code>EFFDT</code>, <code>EFFSEQ</code> and <code>ACTION</code> for every <code>PS_JOB</code> row that shares its <code>EMPLID</code>, <code>EMPL_RCD</code> and <code>EFFDT</code> with another row.",
            hints: ["<code>COUNT(*) OVER (PARTITION BY EMPLID, EMPL_RCD, EFFDT)</code> in an inline view.", "Filter where the count is greater than 1."],
            requires: [{ pattern: 'OVER\\s*\\(', label: 'a window function' }],
            solution: `SELECT EMPLID, EFFDT, EFFSEQ, ACTION
FROM (
  SELECT J.*,
         COUNT(*) OVER (PARTITION BY J.EMPLID, J.EMPL_RCD, J.EFFDT) AS SAME_DAY
  FROM PS_JOB J
)
WHERE SAME_DAY > 1`
          }
        ]
      }
    ]
  });

  // Module 5: investigation patterns.
  PSCourse.add({
    id: 'investigation',
    title: 'Investigation patterns',
    lessons: [
      {
        id: 'missing-and-orphaned',
        title: 'Finding what is missing',
        summary: 'NOT EXISTS for missing paychecks and orphaned codes.',
        body: [
          "A good share of support work is finding things that should exist and do not: the employee with no check, the code with no setup row. The tool is <code>NOT EXISTS</code> with a correlated subquery.",
          { sql: "SELECT P.EMPLID, P.NAME\nFROM PS_PERSONAL_DATA P\nWHERE NOT EXISTS (SELECT 'X'\n                  FROM PS_EMPLOYMENT E\n                  WHERE E.EMPLID = P.EMPLID\n                    AND E.HIRE_DT <= SYSDATE)" },
          "<code>EXISTS</code> only asks whether the subquery returns any row at all, so what it selects is irrelevant. PeopleSoft code conventionally selects <code>'X'</code>.",
          { h: "Why not NOT IN" },
          "<code>NOT IN (subquery)</code> looks equivalent and has a trap: if the subquery returns even one null, <code>NOT IN</code> is never true and the query returns nothing. PeopleSoft’s character fields are not null, which hides the problem for years, until someone uses a date or an expression. <code>NOT EXISTS</code> has no such trap and also correlates on several columns, which <code>NOT IN</code> cannot do cleanly.",
          { h: "Missing paychecks" },
          "“Who should have been paid and was not” combines three things you already know: the job row as of the pay period end date, a status filter on that row, and <code>NOT EXISTS</code> against <code>PS_PAY_CHECK</code>. The first exercise is that query."
        ],
        exercises: [
          {
            id: 'e1-1', title: 'Active but not paid',
            prompt: "Someone was missed in the period ending 3 October 2026. Return <code>EMPLID</code> and <code>EMPL_RCD</code> for every job that was active (<code>EMPL_STATUS = 'A'</code>) as of that date and has no row in <code>PS_PAY_CHECK</code> for that <code>PAY_END_DT</code>.",
            hints: ["Use the as-of pattern on <code>PS_JOB</code> with <code>DATE '2026-10-03'</code>.", "Add <code>NOT EXISTS (SELECT 'X' FROM PS_PAY_CHECK C WHERE C.EMPLID = J.EMPLID AND C.EMPL_RCD = J.EMPL_RCD AND C.PAY_END_DT = DATE '2026-10-03')</code>."],
            solution: `SELECT J.EMPLID, J.EMPL_RCD
FROM PS_JOB J
WHERE J.EMPL_STATUS = 'A'
  AND J.EFFDT = (SELECT MAX(J1.EFFDT) FROM PS_JOB J1
                 WHERE J1.EMPLID = J.EMPLID
                   AND J1.EMPL_RCD = J.EMPL_RCD
                   AND J1.EFFDT <= DATE '2026-10-03')
  AND J.EFFSEQ = (SELECT MAX(J2.EFFSEQ) FROM PS_JOB J2
                  WHERE J2.EMPLID = J.EMPLID
                    AND J2.EMPL_RCD = J.EMPL_RCD
                    AND J2.EFFDT = J.EFFDT)
  AND NOT EXISTS (SELECT 'X' FROM PS_PAY_CHECK C
                  WHERE C.EMPLID = J.EMPLID
                    AND C.EMPL_RCD = J.EMPL_RCD
                    AND C.PAY_END_DT = DATE '2026-10-03')`
          },
          {
            id: 'e1-2', title: 'Codes with no setup row',
            prompt: "Return each distinct <code>ERNCD</code> used in <code>PS_PAY_OTH_EARNS</code> that has no row at all in <code>PS_EARNINGS_TBL</code>.",
            hints: ["<code>SELECT DISTINCT O.ERNCD ... WHERE NOT EXISTS (...)</code>, correlated on <code>ERNCD</code>."],
            solution: `SELECT DISTINCT O.ERNCD
FROM PS_PAY_OTH_EARNS O
WHERE NOT EXISTS (SELECT 'X' FROM PS_EARNINGS_TBL E
                  WHERE E.ERNCD = O.ERNCD)`
          }
        ]
      },
      {
        id: 'pivots-and-set-operators',
        title: 'Pivoting and comparing sets',
        summary: 'Rows into columns with CASE, and MINUS for quick comparisons.',
        body: [
          { h: "Rows into columns" },
          "Payroll detail is stored tall: one row per tax, per deduction, per earnings code. Reports want it wide: one row per check with a column for each. The portable technique is conditional aggregation, an aggregate wrapped around a <code>CASE</code> that lets through only the rows for that column.",
          { sql: "SELECT D.PAY_END_DT,\n       SUM(CASE WHEN D.DEDCD = 'MEDIC' AND D.DED_CLASS = 'B' THEN D.DED_CUR ELSE 0 END) AS MEDICAL_EE,\n       SUM(CASE WHEN D.DEDCD = 'MEDIC' AND D.DED_CLASS = 'N' THEN D.DED_CUR ELSE 0 END) AS MEDICAL_ER,\n       SUM(CASE WHEN D.DEDCD = '401K' THEN D.DED_CUR ELSE 0 END) AS K401\nFROM PS_PAY_DEDUCTION D\nWHERE D.PAY_END_DT >= DATE '2026-10-03'\nGROUP BY D.PAY_END_DT\nORDER BY D.PAY_END_DT" },
          "Oracle also has a <code>PIVOT</code> clause that does the same thing. Conditional aggregation is what you will find in existing SQR and Application Engine code, and it works in every database.",
          { h: "Set operators" },
          "Set operators combine whole result sets. <code>UNION ALL</code> stacks them. <code>UNION</code> stacks them and removes duplicates, at the cost of a sort. <code>INTERSECT</code> keeps rows found in both. <code>MINUS</code>, Oracle’s name for what the standard calls <code>EXCEPT</code>, keeps rows from the first query that are not in the second.",
          "<code>MINUS</code> is the quickest way to compare two things that should match: a table against its backup, this run’s output against the last one, test against production.",
          { sql: "SELECT DEPTID FROM PS_DEPT_TBL\nMINUS\nSELECT DEPTID FROM PS_JOB" }
        ],
        exercises: [
          {
            id: 'e2-1', title: 'Taxes side by side',
            prompt: "For every check with <code>PAY_END_DT</code> 31 October 2026, return <code>EMPLID</code>, <code>PAYGROUP</code> and four tax columns: federal withholding (<code>$U</code>, class H), employee OASDI (<code>$U</code>, class D), employee Medicare (<code>$U</code>, class F) and Virginia withholding (<code>VA</code>, class H).",
            hints: ["Join <code>PS_PAY_TAX</code> to <code>PS_PAY_CHECK</code> on seven keys and group by <code>C.EMPLID, C.PAYGROUP</code>.", "Each column is <code>SUM(CASE WHEN T.STATE = ... AND T.TAX_CLASS = ... THEN T.TAX_CUR ELSE 0 END)</code>."],
            solution: `SELECT C.EMPLID, C.PAYGROUP,
       SUM(CASE WHEN T.STATE = '$U' AND T.TAX_CLASS = 'H' THEN T.TAX_CUR ELSE 0 END) AS FED_WITHHOLDING,
       SUM(CASE WHEN T.STATE = '$U' AND T.TAX_CLASS = 'D' THEN T.TAX_CUR ELSE 0 END) AS OASDI_EE,
       SUM(CASE WHEN T.STATE = '$U' AND T.TAX_CLASS = 'F' THEN T.TAX_CUR ELSE 0 END) AS MEDICARE_EE,
       SUM(CASE WHEN T.STATE = 'VA' AND T.TAX_CLASS = 'H' THEN T.TAX_CUR ELSE 0 END) AS VA_WITHHOLDING
FROM PS_PAY_TAX T
JOIN PS_PAY_CHECK C
  ON C.COMPANY = T.COMPANY
 AND C.PAYGROUP = T.PAYGROUP
 AND C.PAY_END_DT = T.PAY_END_DT
 AND C.OFF_CYCLE = T.OFF_CYCLE
 AND C.PAGE_NUM = T.PAGE_NUM
 AND C.LINE_NUM = T.LINE_NUM
 AND C.SEPCHK = T.SEPCHK
WHERE C.PAY_END_DT = DATE '2026-10-31'
GROUP BY C.EMPLID, C.PAYGROUP`
          },
          {
            id: 'e2-2', title: 'People who have never been paid',
            prompt: "Using <code>MINUS</code>, return the <code>EMPLID</code> of everyone in <code>PS_PERSONAL_DATA</code> who has no row in <code>PS_PAY_CHECK</code>.",
            hints: ["Two single column queries with <code>MINUS</code> between them."],
            requires: [{ pattern: '\\bMINUS\\b', label: 'MINUS' }],
            solution: `SELECT EMPLID FROM PS_PERSONAL_DATA
MINUS
SELECT EMPLID FROM PS_PAY_CHECK`
          }
        ]
      },
      {
        id: 'reconciliation',
        title: 'Reconciliation',
        summary: 'Proving that headers match detail and balances match checks.',
        body: [
          "Payroll stores the same money at several levels. The check header has totals. The earnings, tax and deduction rows have the detail. The balance tables have running sums. They are meant to agree, and when a year end report is off, the job is to find where they stopped agreeing.",
          "Every reconciliation query has the same three steps:",
          { list: [
            "<b>Summarize each side to the same grain.</b> One row per check, or one row per employee and earnings code. Use a <code>WITH</code> query for each side.",
            "<b>Join the two summaries</b> on that grain. Use an outer join if a row could be missing entirely from one side.",
            "<b>Keep the rows that differ.</b> Compare rounded amounts, because sums of decimals can differ in the last binary digit."
          ] },
          { sql: "WITH DETAIL AS (\n  SELECT COMPANY, PAYGROUP, PAY_END_DT, OFF_CYCLE, PAGE_NUM, LINE_NUM, SEPCHK,\n         SUM(TAX_CUR) AS TAXES\n  FROM PS_PAY_TAX\n  WHERE TAX_CLASS IN ('H', 'D', 'F')\n  GROUP BY COMPANY, PAYGROUP, PAY_END_DT, OFF_CYCLE, PAGE_NUM, LINE_NUM, SEPCHK\n)\nSELECT COUNT(*) AS CHECKS_COMPARED,\n       SUM(CASE WHEN ROUND(C.TOTAL_TAXES, 2) <> ROUND(D.TAXES, 2) THEN 1 ELSE 0 END) AS MISMATCHES\nFROM PS_PAY_CHECK C\nJOIN DETAIL D\n  ON D.COMPANY = C.COMPANY\n AND D.PAYGROUP = C.PAYGROUP\n AND D.PAY_END_DT = C.PAY_END_DT\n AND D.OFF_CYCLE = C.OFF_CYCLE\n AND D.PAGE_NUM = C.PAGE_NUM\n AND D.LINE_NUM = C.LINE_NUM\n AND D.SEPCHK = C.SEPCHK" },
          "Taxes tie out on every check. Gross and the earnings balances do not, and the two exercises find where.",
          { note: "Earnings detail is spread over two tables. A check’s gross is <code>REG_EARNS + REG_HRLY_EARNS + OT_HRLY_EARNS</code> from <code>PS_PAY_EARNINGS</code> plus its <code>OTH_EARNS</code>. Summarize other earnings to one row per earnings line before joining them, or a line with two other earnings codes counts its regular pay twice." }
        ],
        exercises: [
          {
            id: 'e3-1', title: 'Header against earnings detail',
            prompt: "Find every check whose <code>TOTAL_GROSS</code> does not equal the sum of its earnings detail. Return <code>EMPLID</code>, <code>PAY_END_DT</code>, <code>TOTAL_GROSS</code> and the detail total.",
            hints: ["Step one: other earnings summed per earnings line (six keys plus <code>ADDL_NBR</code>). The starter has it.", "Step two: earnings summed per check (seven keys including <code>E.SEPCHK</code>), adding <code>NVL(O.OTH_EARNS, 0)</code> through a <code>LEFT JOIN</code>.", "Step three: join to <code>PS_PAY_CHECK</code> and keep rows where the rounded amounts differ."],
            starter: `WITH OTH AS (
  SELECT COMPANY, PAYGROUP, PAY_END_DT, OFF_CYCLE, PAGE_NUM, LINE_NUM, ADDL_NBR,
         SUM(OTH_EARNS) AS OTH_EARNS
  FROM PS_PAY_OTH_EARNS
  GROUP BY COMPANY, PAYGROUP, PAY_END_DT, OFF_CYCLE, PAGE_NUM, LINE_NUM, ADDL_NBR
)
SELECT * FROM OTH`,
            solution: `WITH OTH AS (
  SELECT COMPANY, PAYGROUP, PAY_END_DT, OFF_CYCLE, PAGE_NUM, LINE_NUM, ADDL_NBR,
         SUM(OTH_EARNS) AS OTH_EARNS
  FROM PS_PAY_OTH_EARNS
  GROUP BY COMPANY, PAYGROUP, PAY_END_DT, OFF_CYCLE, PAGE_NUM, LINE_NUM, ADDL_NBR
),
DETAIL AS (
  SELECT E.COMPANY, E.PAYGROUP, E.PAY_END_DT, E.OFF_CYCLE, E.PAGE_NUM, E.LINE_NUM, E.SEPCHK,
         SUM(E.REG_EARNS + E.REG_HRLY_EARNS + E.OT_HRLY_EARNS + NVL(O.OTH_EARNS, 0)) AS DETAIL_GROSS
  FROM PS_PAY_EARNINGS E
  LEFT JOIN OTH O
    ON O.COMPANY = E.COMPANY
   AND O.PAYGROUP = E.PAYGROUP
   AND O.PAY_END_DT = E.PAY_END_DT
   AND O.OFF_CYCLE = E.OFF_CYCLE
   AND O.PAGE_NUM = E.PAGE_NUM
   AND O.LINE_NUM = E.LINE_NUM
   AND O.ADDL_NBR = E.ADDL_NBR
  GROUP BY E.COMPANY, E.PAYGROUP, E.PAY_END_DT, E.OFF_CYCLE, E.PAGE_NUM, E.LINE_NUM, E.SEPCHK
)
SELECT C.EMPLID, C.PAY_END_DT, C.TOTAL_GROSS, D.DETAIL_GROSS
FROM PS_PAY_CHECK C
JOIN DETAIL D
  ON D.COMPANY = C.COMPANY
 AND D.PAYGROUP = C.PAYGROUP
 AND D.PAY_END_DT = C.PAY_END_DT
 AND D.OFF_CYCLE = C.OFF_CYCLE
 AND D.PAGE_NUM = C.PAGE_NUM
 AND D.LINE_NUM = C.LINE_NUM
 AND D.SEPCHK = C.SEPCHK
WHERE ROUND(C.TOTAL_GROSS, 2) <> ROUND(D.DETAIL_GROSS, 2)`
          },
          {
            id: 'e3-2', title: 'Balances against checks',
            prompt: "Compare each job’s year to date regular earnings balance with its checks. One side is <code>GRS_YTD</code> from the latest <code>REG</code> row in <code>PS_EARNINGS_BAL</code> for 2026. The other is the sum of <code>REG_EARNS + REG_HRLY_EARNS</code> from <code>PS_PAY_EARNINGS</code> for checks that are not merely calculated. Return <code>EMPLID</code>, <code>EMPL_RCD</code>, the balance and the check total, for jobs where they differ.",
            hints: ["The balance side is the “latest balance row” exercise from the window functions module.", "The check side joins <code>PS_PAY_EARNINGS</code> to <code>PS_PAY_CHECK</code> on seven keys for the status, grouped by <code>E.EMPLID, E.EMPL_RCD</code>.", "Join the two on <code>EMPLID</code> and <code>EMPL_RCD</code> and compare with <code>ROUND(..., 2)</code>."],
            solution: `WITH BAL AS (
  SELECT EMPLID, EMPL_RCD, GRS_YTD
  FROM (
    SELECT B.*,
           ROW_NUMBER() OVER (PARTITION BY B.EMPLID, B.EMPL_RCD
                              ORDER BY B.BALANCE_PERIOD DESC) AS RN
    FROM PS_EARNINGS_BAL B
    WHERE B.ERNCD = 'REG'
      AND B.BALANCE_YEAR = 2026
  )
  WHERE RN = 1
),
CHK AS (
  SELECT E.EMPLID, E.EMPL_RCD, SUM(E.REG_EARNS + E.REG_HRLY_EARNS) AS CHECK_YTD
  FROM PS_PAY_EARNINGS E
  JOIN PS_PAY_CHECK C
    ON C.COMPANY = E.COMPANY
   AND C.PAYGROUP = E.PAYGROUP
   AND C.PAY_END_DT = E.PAY_END_DT
   AND C.OFF_CYCLE = E.OFF_CYCLE
   AND C.PAGE_NUM = E.PAGE_NUM
   AND C.LINE_NUM = E.LINE_NUM
   AND C.SEPCHK = E.SEPCHK
  WHERE C.PAYCHECK_STATUS <> 'C'
  GROUP BY E.EMPLID, E.EMPL_RCD
)
SELECT B.EMPLID, B.EMPL_RCD, B.GRS_YTD, K.CHECK_YTD
FROM BAL B
JOIN CHK K
  ON K.EMPLID = B.EMPLID
 AND K.EMPL_RCD = B.EMPL_RCD
WHERE ROUND(B.GRS_YTD, 2) <> ROUND(K.CHECK_YTD, 2)`
          }
        ]
      }
    ]
  });

  // Module 6: data fixes.
  PSCourse.add({
    id: 'data-fixes',
    title: 'Data fixes',
    lessons: [
      {
        id: 'safe-data-fixes',
        title: 'The safe data fix routine',
        summary: 'Select, count, back up, change, verify, and only then commit.',
        body: [
          "Sooner or later a ticket asks you to change data directly. On a government contract that change goes through change control: you write a script, someone reviews it, it runs in a test environment first, and often a DBA runs it in production rather than you. What you are judged on is whether the script changes exactly the intended rows and nothing else.",
          { h: "The routine" },
          { list: [
            "<b>Select first.</b> Write the <code>WHERE</code> clause as a <code>SELECT</code> and look at the rows. Record the count.",
            "<b>Back up.</b> Copy the rows you are about to touch: <code>CREATE TABLE PS_X_BKP AS SELECT ... WHERE ...</code> with the same <code>WHERE</code>.",
            "<b>Change.</b> Run the <code>UPDATE</code>, <code>INSERT</code> or <code>DELETE</code> with that same <code>WHERE</code>. The row count must match step one.",
            "<b>Verify.</b> Select again and compare with what the ticket asked for.",
            "<b>Commit, or roll back.</b> Until you <code>COMMIT</code>, <code>ROLLBACK</code> undoes everything. If the count was wrong, roll back and find out why."
          ] },
          { sql: "SELECT COUNT(*) FROM PS_JOB WHERE EMPLID = '100011';\n\nUPDATE PS_JOB SET DEPTID = '99999' WHERE EMPLID = '100011';\n\nSELECT EMPLID, EFFDT, DEPTID FROM PS_JOB WHERE EMPLID = '100011';\n\nROLLBACK;\n\nSELECT EMPLID, EFFDT, DEPTID FROM PS_JOB WHERE EMPLID = '100011';" },
          "That update was careless on purpose. It changed <b>every</b> row for the employee and rewrote history. Which brings up the question specific to effective dated tables.",
          { h: "Correct the row, or add a row?" },
          { list: [
            "If the data was <b>wrong from the start</b>, such as a mistyped department, correct the existing row. This is what Correction mode does online. Your <code>UPDATE</code> must select that one row by its full key, <code>EFFDT</code> and <code>EFFSEQ</code> included.",
            "If something <b>changed in the real world</b>, such as a transfer or a raise, history must be kept. Insert a new row with a new <code>EFFDT</code>, copying the other columns from the current row with <code>INSERT ... SELECT</code>."
          ] },
          { note: "Direct SQL skips everything the online pages do: edits, defaults, related tables and audit. <code>PS_JOB</code> has sibling records at work that must stay in step with it, and payroll balances follow their own rules. Before any fix, ask which other tables carry the same data. In this lab the tables are independent, which is what makes it a safe place to practice the mechanics." },
          "The exercises below run your statements against a fresh copy of the database every time, then show the affected rows. Use the scratchpad if you want to experiment with <code>COMMIT</code> and <code>ROLLBACK</code> yourself."
        ],
        exercises: [
          {
            id: 'f1-1', title: 'Correct one row',
            prompt: "Employee 100011’s current job row still points at department 10500, which was closed. The ticket says the department was keyed wrongly and should be <code>10300</code>. Update <b>only the current row</b>. His earlier row is true history and must keep 10500.",
            hints: ["Write it as a <code>SELECT</code> first, with both effective date subqueries, and confirm it returns one row.", "Then turn it into <code>UPDATE PS_JOB J SET DEPTID = '10300' WHERE ...</code> with the same conditions."],
            verify: "SELECT EFFDT, EFFSEQ, DEPTID FROM PS_JOB WHERE EMPLID = '100011' ORDER BY EFFDT, EFFSEQ",
            verifyLabel: "Job rows for 100011 after your statements",
            starter: "SELECT J.EMPLID, J.EFFDT, J.EFFSEQ, J.DEPTID\nFROM PS_JOB J\nWHERE J.EMPLID = '100011'",
            solution: `UPDATE PS_JOB J
SET DEPTID = '10300'
WHERE J.EMPLID = '100011'
  AND J.EMPL_RCD = 0
  AND J.EFFDT = (SELECT MAX(J1.EFFDT) FROM PS_JOB J1
                 WHERE J1.EMPLID = J.EMPLID
                   AND J1.EMPL_RCD = J.EMPL_RCD
                   AND J1.EFFDT <= SYSDATE)
  AND J.EFFSEQ = (SELECT MAX(J2.EFFSEQ) FROM PS_JOB J2
                  WHERE J2.EMPLID = J.EMPLID
                    AND J2.EMPL_RCD = J.EMPL_RCD
                    AND J2.EFFDT = J.EFFDT)`
          },
          {
            id: 'f1-2', title: 'Add an effective dated row',
            prompt: "Employee 100016 has been approved for a raise to 62,500 a year, effective 15 November 2026. Insert a new <code>PS_JOB</code> row for it: <code>EFFDT</code> 15 November 2026, <code>EFFSEQ</code> 0, <code>ACTION</code> <code>PAY</code>, <code>ACTION_REASON</code> <code>MER</code>, <code>COMPRATE</code> and <code>ANNUAL_RT</code> 62500, <code>HOURLY_RT</code> 62500 divided by 2080 rounded to six decimals. Copy every other column from her current row.",
            hints: ["The starter lists every column in order. Replace the values that change and keep <code>J.</code> columns for the rest.", "The <code>SELECT</code> half must return exactly one row: her current row. Run it alone first if you are unsure."],
            verify: "SELECT EFFDT, EFFSEQ, ACTION, ACTION_REASON, DEPTID, JOBCODE, EMPL_STATUS, COMPRATE, ANNUAL_RT, HOURLY_RT FROM PS_JOB WHERE EMPLID = '100016' ORDER BY EFFDT, EFFSEQ",
            verifyLabel: "Job rows for 100016 after your statements",
            starter: `INSERT INTO PS_JOB
  (EMPLID, EMPL_RCD, EFFDT, EFFSEQ, ACTION, ACTION_REASON, EMPL_STATUS, HR_STATUS,
   BUSINESS_UNIT, SETID_DEPT, DEPTID, SETID_JOBCODE, JOBCODE, COMPANY, PAYGROUP,
   EMPL_TYPE, STD_HOURS, COMP_FREQUENCY, COMPRATE, ANNUAL_RT, HOURLY_RT,
   FULL_PART_TIME, REG_TEMP)
SELECT J.EMPLID, J.EMPL_RCD, J.EFFDT, J.EFFSEQ, J.ACTION, J.ACTION_REASON, J.EMPL_STATUS, J.HR_STATUS,
       J.BUSINESS_UNIT, J.SETID_DEPT, J.DEPTID, J.SETID_JOBCODE, J.JOBCODE, J.COMPANY, J.PAYGROUP,
       J.EMPL_TYPE, J.STD_HOURS, J.COMP_FREQUENCY, J.COMPRATE, J.ANNUAL_RT, J.HOURLY_RT,
       J.FULL_PART_TIME, J.REG_TEMP
FROM PS_JOB J
WHERE J.EMPLID = '100016'`,
            solution: `INSERT INTO PS_JOB
  (EMPLID, EMPL_RCD, EFFDT, EFFSEQ, ACTION, ACTION_REASON, EMPL_STATUS, HR_STATUS,
   BUSINESS_UNIT, SETID_DEPT, DEPTID, SETID_JOBCODE, JOBCODE, COMPANY, PAYGROUP,
   EMPL_TYPE, STD_HOURS, COMP_FREQUENCY, COMPRATE, ANNUAL_RT, HOURLY_RT,
   FULL_PART_TIME, REG_TEMP)
SELECT J.EMPLID, J.EMPL_RCD, DATE '2026-11-15', 0, 'PAY', 'MER', J.EMPL_STATUS, J.HR_STATUS,
       J.BUSINESS_UNIT, J.SETID_DEPT, J.DEPTID, J.SETID_JOBCODE, J.JOBCODE, J.COMPANY, J.PAYGROUP,
       J.EMPL_TYPE, J.STD_HOURS, J.COMP_FREQUENCY, 62500, 62500, ROUND(62500 / 2080, 6),
       J.FULL_PART_TIME, J.REG_TEMP
FROM PS_JOB J
WHERE J.EMPLID = '100016'
  AND J.EMPL_RCD = 0
  AND J.EFFDT = (SELECT MAX(J1.EFFDT) FROM PS_JOB J1
                 WHERE J1.EMPLID = J.EMPLID
                   AND J1.EMPL_RCD = J.EMPL_RCD
                   AND J1.EFFDT <= SYSDATE)
  AND J.EFFSEQ = (SELECT MAX(J2.EFFSEQ) FROM PS_JOB J2
                  WHERE J2.EMPLID = J.EMPLID
                    AND J2.EMPL_RCD = J.EMPL_RCD
                    AND J2.EFFDT = J.EFFDT)`
          },
          {
            id: 'f1-3', title: 'Back up, then recode',
            prompt: "One row in <code>PS_PAY_OTH_EARNS</code> uses earnings code <code>XTR</code>, which does not exist. Payroll confirms it should have been <code>AWD</code>. First copy the affected rows into a new table named <code>PS_OTH_EARNS_BKP</code>, then change the code on the original.",
            hints: ["<code>CREATE TABLE PS_OTH_EARNS_BKP AS SELECT * FROM PS_PAY_OTH_EARNS WHERE ERNCD = 'XTR'</code>.", "Then <code>UPDATE PS_PAY_OTH_EARNS SET ERNCD = 'AWD' WHERE ERNCD = 'XTR'</code>. Separate the statements with a semicolon."],
            verify: "SELECT (SELECT COUNT(*) FROM PS_OTH_EARNS_BKP) AS BACKUP_ROWS, (SELECT COUNT(*) FROM PS_PAY_OTH_EARNS WHERE ERNCD = 'XTR') AS XTR_ROWS_LEFT, (SELECT COUNT(*) FROM PS_PAY_OTH_EARNS WHERE ERNCD = 'AWD') AS AWD_ROWS FROM DUAL",
            verifyLabel: "Row counts after your statements",
            solution: `CREATE TABLE PS_OTH_EARNS_BKP AS
SELECT * FROM PS_PAY_OTH_EARNS WHERE ERNCD = 'XTR';

UPDATE PS_PAY_OTH_EARNS SET ERNCD = 'AWD' WHERE ERNCD = 'XTR';

COMMIT;`
          }
        ]
      }
    ]
  });

  // Module 7: tickets that combine everything.
  PSCourse.add({
    id: 'tickets',
    title: 'Tickets',
    lessons: [
      {
        id: 'support-tickets',
        title: 'Five support tickets',
        summary: 'Realistic requests with no hints about which technique to use.',
        body: [
          "These are written the way requests arrive: by someone who knows payroll and does not know or care how the tables work. Each needs techniques from more than one module. The hints are there, but try each one cold first. Working out which pattern a vague request needs is the real skill.",
          { h: "Before writing any SQL" },
          { list: [
            "<b>As of when?</b> Today, a pay period end date, a check date, year end?",
            "<b>Which people?</b> Active by <code>EMPL_STATUS</code> or by <code>HR_STATUS</code>? One row per person, or per job?",
            "<b>Which checks?</b> Confirmed only? Off-cycle included? What about reversals?",
            "<b>What is the grain?</b> Say what one row of the answer represents before you start. Most wrong totals come from a join that quietly changed it."
          ] }
        ],
        exercises: [
          {
            id: 'g1-1', title: 'Ticket 1: “Her May check looks wrong”',
            prompt: "Employee 100010 called about the pay period ending 16 May 2026. Show everything that was issued to her for that period: <code>OFF_CYCLE</code>, <code>PAGE_NUM</code>, <code>LINE_NUM</code>, <code>PAYCHECK_STATUS</code>, <code>PAYCHECK_OPTION</code>, <code>CHECK_DT</code>, <code>TOTAL_GROSS</code> and <code>NET_PAY</code>.",
            hints: ["No status filter. The point is to see every row."],
            solution: `SELECT OFF_CYCLE, PAGE_NUM, LINE_NUM, PAYCHECK_STATUS, PAYCHECK_OPTION, CHECK_DT, TOTAL_GROSS, NET_PAY
FROM PS_PAY_CHECK
WHERE EMPLID = '100010'
  AND PAY_END_DT = DATE '2026-05-16'`
          },
          {
            id: 'g1-2', title: 'Ticket 2: “So what was she actually paid?”',
            prompt: "Same employee, same period. Return a single row with the gross and net she ended up with once the reversal is taken into account.",
            hints: ["The original and its reversal cancel. Sum all three rows."],
            solution: `SELECT SUM(TOTAL_GROSS) AS GROSS, SUM(NET_PAY) AS NET
FROM PS_PAY_CHECK
WHERE EMPLID = '100010'
  AND PAY_END_DT = DATE '2026-05-16'`
          },
          {
            id: 'g1-3', title: 'Ticket 3: “Headcount by department at mid year”',
            prompt: "Finance wants headcount as of 30 June 2026. Return <code>DEPTID</code>, the department name as of that date, the number of jobs with <code>HR_STATUS</code> A as of that date, and their average <code>ANNUAL_RT</code> rounded to a whole number.",
            hints: ["As-of job rows with <code>DATE '2026-06-30'</code>, joined to as-of department rows with the same date.", "Group by <code>J.DEPTID, D.DESCR</code>."],
            solution: `SELECT J.DEPTID, D.DESCR, COUNT(*) AS HEADCOUNT, ROUND(AVG(J.ANNUAL_RT)) AS AVG_ANNUAL_RT
FROM PS_JOB J
JOIN PS_DEPT_TBL D
  ON D.SETID = J.SETID_DEPT
 AND D.DEPTID = J.DEPTID
WHERE J.HR_STATUS = 'A'
  AND J.EFFDT = (SELECT MAX(J1.EFFDT) FROM PS_JOB J1
                 WHERE J1.EMPLID = J.EMPLID
                   AND J1.EMPL_RCD = J.EMPL_RCD
                   AND J1.EFFDT <= DATE '2026-06-30')
  AND J.EFFSEQ = (SELECT MAX(J2.EFFSEQ) FROM PS_JOB J2
                  WHERE J2.EMPLID = J.EMPLID
                    AND J2.EMPL_RCD = J.EMPL_RCD
                    AND J2.EFFDT = J.EFFDT)
  AND D.EFFDT = (SELECT MAX(D1.EFFDT) FROM PS_DEPT_TBL D1
                 WHERE D1.SETID = D.SETID
                   AND D1.DEPTID = D.DEPTID
                   AND D1.EFFDT <= DATE '2026-06-30')
GROUP BY J.DEPTID, D.DESCR`
          },
          {
            id: 'g1-4', title: 'Ticket 4: “Which raises this year were over 5 percent?”',
            prompt: "Audit wants every pay rate change (<code>ACTION = 'PAY'</code>) effective from 1 January 2026 through today where <code>ANNUAL_RT</code> rose by more than 5 percent over the row before it. Return <code>EMPLID</code>, <code>EFFDT</code>, the previous rate, the new rate and the percentage increase rounded to one decimal.",
            hints: ["Compute <code>LAG(ANNUAL_RT)</code> over each job’s <b>whole</b> history in an inline view. Filtering to 2026 first would hide the row before.", "Order the window by <code>EFFDT, EFFSEQ</code>, so a same day raise compares with the row just before it.", "Filter by action, date and percentage in the outer query."],
            solution: `SELECT EMPLID, EFFDT, PREV_RT, ANNUAL_RT,
       ROUND(100 * (ANNUAL_RT - PREV_RT) / PREV_RT, 1) AS PCT_INCREASE
FROM (
  SELECT J.EMPLID, J.EFFDT, J.ACTION, J.ANNUAL_RT,
         LAG(J.ANNUAL_RT) OVER (PARTITION BY J.EMPLID, J.EMPL_RCD
                                ORDER BY J.EFFDT, J.EFFSEQ) AS PREV_RT
  FROM PS_JOB J
)
WHERE ACTION = 'PAY'
  AND EFFDT BETWEEN DATE '2026-01-01' AND SYSDATE
  AND (ANNUAL_RT - PREV_RT) / PREV_RT > 0.05`
          },
          {
            id: 'g1-5', title: 'Ticket 5: “Year to date by employee, highest first”',
            prompt: "Return <code>EMPLID</code>, <code>NAME</code>, year to date gross, year to date net and a rank by gross (1 for the highest), from checks that are not merely calculated. One row per employee.",
            hints: ["Group <code>PS_PAY_CHECK</code> by <code>EMPLID, NAME</code>.", "A window function can rank an aggregate: <code>RANK() OVER (ORDER BY SUM(TOTAL_GROSS) DESC)</code>."],
            solution: `SELECT EMPLID, NAME,
       SUM(TOTAL_GROSS) AS YTD_GROSS,
       SUM(NET_PAY) AS YTD_NET,
       RANK() OVER (ORDER BY SUM(TOTAL_GROSS) DESC) AS GROSS_RANK
FROM PS_PAY_CHECK
WHERE PAYCHECK_STATUS <> 'C'
GROUP BY EMPLID, NAME`
          }
        ]
      }
    ]
  });

  // Module 8: reference pages with no exercises.
  PSCourse.add({
    id: 'reference',
    title: 'Reference',
    lessons: [
      {
        id: 'sql-in-peopletools',
        title: 'Where this SQL shows up in PeopleTools',
        summary: 'PS Query, meta-SQL, Application Engine and SQR.',
        body: [
          "You will rarely type raw SQL into production. The same logic appears inside PeopleTools, wearing different clothes. Knowing the plain SQL underneath is what lets you debug all of them.",
          { h: "PS Query" },
          "Query Manager builds SQL from records and fields you pick. When you add an effective dated record it <b>adds the effective date criteria for you</b>, defaulting to “effective date on or before the current date, last sequence”. You can edit that criterion to use a different as-of date, a field from another record, or first or last effective date, or you can remove it to see all history. View the generated SQL on the query’s SQL tab and you will recognize the two subqueries from this course. PS Query also adds joins to query security records, which limit rows to what the user is allowed to see. Extra tables you did not pick in the generated SQL are usually that.",
          { h: "Meta-SQL" },
          "PeopleCode, Application Engine and views use <b>meta-SQL</b>, tokens that PeopleTools expands into real SQL for the database in use. The ones you will meet first:",
          { list: [
            "<code>%CurrentDateIn</code>: today’s date, with no time, in the right syntax. The PeopleTools equivalent of this lab’s <code>SYSDATE</code>.",
            "<code>%DateIn('2026-01-31')</code> and <code>%DateOut(EFFDT)</code>: convert a date going into, or coming out of, SQL without depending on database date formats.",
            "<code>%EffDtCheck(DEPT_TBL D1, D, %CurrentDateIn)</code>: expands into the <code>EFFDT = (SELECT MAX(EFFDT) ...)</code> subquery, correlated on the record’s keys. It does not handle <code>EFFSEQ</code>, so for <code>PS_JOB</code> you still write that part.",
            "<code>%Table(JOB)</code>: the table name for a record. It matters for temporary tables in Application Engine, where the real table name changes with each process instance.",
            "<code>%Join(COMMON_KEYS, JOB A, PERSONAL_DATA B)</code>: generates the join conditions for the keys two records share.",
            "<code>%Bind(EMPLID)</code>: in Application Engine, substitutes a value from the state record."
          ] },
          { note: "Exact syntax and behaviour of meta-SQL vary a little between PeopleTools releases. Check PeopleBooks for your release before relying on a detail here." },
          { h: "Application Engine" },
          "An Application Engine program is a set of SQL steps run in order: usually set based <code>INSERT ... SELECT</code> and <code>UPDATE</code> statements against temporary tables, with a state record carrying values between steps. The window functions and <code>WITH</code> clauses in this course work in Application Engine SQL, because Oracle runs it.",
          { h: "SQR" },
          "Older reports and interfaces, including much of delivered payroll reporting, are written in SQR, with SQL inside <code>begin-select</code> blocks. The SQL is plain Oracle, often in the older style: <code>(+)</code> outer joins, <code>DECODE</code>, and effective date subqueries everywhere.",
          { h: "Tracing" },
          "When a page or process misbehaves, a SQL trace shows the statements PeopleTools actually sent to the database. Reading a trace is the same skill as reading the queries in this course, with bind variables in place of constants."
        ]
      },
      {
        id: 'lab-versus-oracle',
        title: 'Lab versus real Oracle',
        summary: 'What this practice engine does differently from the database at work.',
        body: [
          "The lab runs your SQL on SQLite, compiled to JavaScript, behind a layer that translates Oracle syntax and adds Oracle functions. That is what lets it run in a browser with nothing to install. It is close to Oracle and it is not Oracle. These are the differences that matter.",
          { h: "Supported Oracle features" },
          { list: [
            "Dates: <code>SYSDATE</code>, <code>DATE '...'</code> literals, <code>TO_DATE</code>, <code>TO_CHAR</code>, <code>TRUNC</code>, <code>ADD_MONTHS</code>, <code>MONTHS_BETWEEN</code>, <code>LAST_DAY</code>, <code>EXTRACT</code>, and date arithmetic in days.",
            "Functions: <code>NVL</code>, <code>NVL2</code>, <code>DECODE</code>, <code>GREATEST</code>, <code>LEAST</code>, <code>INSTR</code>, <code>SUBSTR</code>, <code>LPAD</code>, <code>RPAD</code>, <code>INITCAP</code>, <code>TO_NUMBER</code>, <code>MOD</code>, <code>CEIL</code>, <code>FLOOR</code>, <code>LISTAGG</code>.",
            "Syntax: <code>FROM DUAL</code>, <code>MINUS</code>, <code>FETCH FIRST n ROWS ONLY</code>, <code>WITH</code> clauses, every window function used in the course, <code>CREATE TABLE ... AS SELECT</code>, <code>COMMIT</code> and <code>ROLLBACK</code>, and <code>DESC table</code>."
          ] },
          { h: "Not supported" },
          { list: [
            "<code>ROWNUM</code>, the <code>(+)</code> outer join marker, <code>PIVOT</code>, <code>CONNECT BY</code>, <code>MERGE</code>, <code>KEEP (DENSE_RANK ...)</code>, <code>RATIO_TO_REPORT</code>, <code>IGNORE NULLS</code>, PL/SQL blocks, and optimizer hints.",
            "Time of day. Every date in the lab is a whole day."
          ] },
          { h: "Where the lab is more forgiving than Oracle" },
          "These run here and fail, or behave differently, at work. Write the Oracle form as a habit.",
          { list: [
            "<b>Aliases in WHERE and GROUP BY.</b> The lab lets you reuse a column alias there. Oracle does not: repeat the expression, or wrap the query in an inline view.",
            "<b>SELECT without FROM.</b> The lab allows it. Oracle needs <code>FROM DUAL</code>.",
            "<b>Bare date strings.</b> The lab recognizes <code>'2026-01-31'</code> as a date and warns you. Oracle converts strings using session settings and may raise an error or, worse, silently compare text.",
            "<b>Sorting nulls.</b> Oracle puts nulls last in ascending order. The lab puts them first. Say <code>NULLS FIRST</code> or <code>NULLS LAST</code> when it matters.",
            "<b>Empty strings.</b> In Oracle <code>''</code> is null. In the lab it is an empty string. PeopleSoft sidesteps this by storing a single space.",
            "<b>Division by zero.</b> Oracle raises ORA-01476. The lab returns null.",
            "<b>GROUP BY strictness.</b> Oracle rejects a selected column that is neither grouped nor aggregated (ORA-00979). The lab lets it through and picks an arbitrary value."
          ] },
          { h: "Practicing on real Oracle" },
          "The repository includes <code>oracle/peoplesoft_lab_oracle.sql</code>, which creates the same tables and data in a real Oracle database. Run it in Oracle Database Free or on Oracle Live SQL, and every solution in this course runs there unchanged. One difference: real <code>SYSDATE</code> is the real date, while the data is built around November 2026. Substitute <code>DATE '2026-11-10'</code> for <code>SYSDATE</code> to get the same answers as the lab.",
          { note: "The tables here are simplified. Real PeopleSoft records have many more columns: <code>PS_JOB</code> has well over a hundred. The keys and relationships are modeled on delivered Payroll for North America, but your site’s configuration and customizations are the final word. Check record definitions in Application Designer." }
        ]
      }
    ]
  });
});
