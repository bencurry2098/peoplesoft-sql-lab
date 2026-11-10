// Lessons, part one: orientation, effective dating and the payroll tables.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) factory(require('./course.js'));
  else factory(root.PSCourse);
})(typeof self !== 'undefined' ? self : this, function (PSCourse) {
  'use strict';

  // Module 1: orientation.
  PSCourse.add({
    id: 'orientation',
    title: 'Orientation',
    lessons: [
      {
        id: 'how-peoplesoft-stores-data',
        title: 'How PeopleSoft stores data',
        summary: 'Records, keys, blanks and the habits that differ from a textbook database.',
        body: [
          "PeopleSoft developers talk about <b>records</b>, not tables. A record is defined in Application Designer, and the database table behind it is the record name with <code>PS_</code> in front. The record <code>JOB</code> lives in the table <code>PS_JOB</code>. Tables that belong to PeopleTools itself have no underscore: <code>PSRECDEFN</code>, <code>PSXLATITEM</code>, <code>PSOPRDEFN</code>.",
          { h: "Four habits to unlearn" },
          { list: [
            "<b>There are no foreign keys.</b> The application enforces relationships, the database does not. Orphan rows are possible, and finding them is a routine support task.",
            "<b>Character fields are never null.</b> A blank character field holds a single space, so you test <code>DEPTID = ' '</code>, not <code>DEPTID IS NULL</code>. Number fields default to zero. Only date fields can be null.",
            "<b>IDs are text.</b> <code>EMPLID</code> is a character field. Compare it to <code>'100001'</code> in quotes, or Oracle converts every row to a number to compare and ignores the index.",
            "<b>Keys are long and shared.</b> Child tables repeat the full key of their parent. Leave one key column out of a join and the row count multiplies without any error."
          ] },
          "This lab holds a small company, <code>GBI</code>, with 16 people and one year of biweekly payroll. Open the Tables page any time to see every column, or type <code>DESC PS_JOB</code> in a query box.",
          { sql: "SELECT EMPLID, NAME, CITY\nFROM PS_PERSONAL_DATA\nWHERE EMPLID = '100009'" },
          { note: "The <code>NAME</code> field is stored as <code>Last,First</code> with no space after the comma. Reports usually need it split or flipped, which you will do in the next lesson." }
        ],
        exercises: [
          {
            id: 'a1-1', title: 'Everyone, in name order', ordered: true,
            prompt: "Return <code>EMPLID</code> and <code>NAME</code> for every row in <code>PS_PERSONAL_DATA</code>, sorted by <code>NAME</code>.",
            hints: ["One table, two columns, one <code>ORDER BY</code>."],
            solution: `SELECT EMPLID, NAME
FROM PS_PERSONAL_DATA
ORDER BY NAME`
          },
          {
            id: 'a1-2', title: 'Departments with no manager',
            prompt: "Some rows in <code>PS_DEPT_TBL</code> have no manager assigned. Return <code>DEPTID</code>, <code>EFFDT</code> and <code>DESCR</code> for those rows.",
            hints: ["<code>MANAGER_ID</code> is a character field. What does PeopleSoft store in a blank character field?", "Compare it to a single space: <code>MANAGER_ID = ' '</code>."],
            wrong: [{ rows: 0, msg: "IS NULL finds nothing here. PeopleSoft stores a single space in a blank character field." }],
            solution: `SELECT DEPTID, EFFDT, DESCR
FROM PS_DEPT_TBL
WHERE MANAGER_ID = ' '`
          },
          {
            id: 'a1-3', title: 'Still employed',
            prompt: "Date fields are the exception: they really are null when empty. Return <code>EMPLID</code>, <code>EMPL_RCD</code> and <code>HIRE_DT</code> from <code>PS_EMPLOYMENT</code> for rows with no termination date.",
            hints: ["Dates use <code>IS NULL</code>."],
            solution: `SELECT EMPLID, EMPL_RCD, HIRE_DT
FROM PS_EMPLOYMENT
WHERE TERMINATION_DT IS NULL`
          }
        ]
      },
      {
        id: 'oracle-dialect',
        title: 'The Oracle you will type every day',
        summary: 'Dates, NVL, DECODE, string functions and DUAL.',
        body: [
          "PeopleSoft at a federal site almost always runs on Oracle. You already know <code>SELECT</code>, so this lesson covers only the Oracle pieces that show up constantly in PeopleSoft SQL.",
          { h: "Dates" },
          "<code>SYSDATE</code> is now. Subtracting two dates gives days, and adding a number to a date moves it by that many days. Never compare a date column to a bare string. Use <code>TO_DATE</code> with a format mask, or an ANSI literal such as <code>DATE '2026-01-31'</code>.",
          { sql: "SELECT SYSDATE AS TODAY,\n       SYSDATE - 30 AS THIRTY_DAYS_AGO,\n       TO_DATE('01/31/2026', 'MM/DD/YYYY') AS PARSED,\n       TO_CHAR(SYSDATE, 'Day, DD Mon YYYY') AS PRETTY,\n       TRUNC(SYSDATE, 'MM') AS FIRST_OF_MONTH,\n       ADD_MONTHS(SYSDATE, 3) AS IN_THREE_MONTHS,\n       LAST_DAY(SYSDATE) AS MONTH_END\nFROM DUAL" },
          { note: "The lab has its own clock. <code>SYSDATE</code> returns the lab date shown at the top of the page, 10 November 2026 unless you change it. That keeps every exercise repeatable, and changing it lets you watch future dated rows become current." },
          { h: "Nulls and codes" },
          "<code>NVL(x, y)</code> returns <code>y</code> when <code>x</code> is null. <code>DECODE</code> is Oracle’s older shorthand for a simple <code>CASE</code>, and you will read a great deal of it in delivered code. Write <code>CASE</code> in new work.",
          { sql: "SELECT EMPLID, EMPL_RCD,\n       NVL(TERMINATION_DT, SYSDATE) AS END_OR_TODAY,\n       DECODE(EMPL_RCD, 0, 'Primary job', 'Additional job') AS OLD_STYLE,\n       CASE WHEN REHIRE_DT IS NOT NULL THEN 'Rehire' ELSE 'Original hire' END AS NEW_STYLE\nFROM PS_EMPLOYMENT\nWHERE EMPLID IN ('100003', '100005', '100006')" },
          { h: "Strings and DUAL" },
          "Join strings with <code>||</code>. <code>SUBSTR(s, start, length)</code> counts from 1, and <code>INSTR(s, ',')</code> returns the position of the comma. <code>DUAL</code> is a one row table for selecting expressions. To keep only the first rows of a result, modern Oracle uses <code>FETCH FIRST 5 ROWS ONLY</code>.",
          { sql: "SELECT NAME,\n       INSTR(NAME, ',') AS COMMA_AT,\n       SUBSTR(NAME, 1, INSTR(NAME, ',') - 1) AS LAST_PART\nFROM PS_PERSONAL_DATA\nORDER BY NAME\nFETCH FIRST 5 ROWS ONLY" }
        ],
        exercises: [
          {
            id: 'a2-1', title: 'Years of service',
            prompt: "From <code>PS_EMPLOYMENT</code>, for employment record 0 and people hired on or before today, return <code>EMPLID</code>, <code>HIRE_DT</code> and whole years of service as of <code>SYSDATE</code>.",
            hints: ["<code>MONTHS_BETWEEN(later, earlier)</code> returns months, with a fraction.", "Divide by 12 and wrap it in <code>FLOOR</code>."],
            solution: `SELECT EMPLID, HIRE_DT,
       FLOOR(MONTHS_BETWEEN(SYSDATE, HIRE_DT) / 12) AS YEARS_OF_SERVICE
FROM PS_EMPLOYMENT
WHERE EMPL_RCD = 0
  AND HIRE_DT <= SYSDATE`
          },
          {
            id: 'a2-2', title: 'Flip the name',
            prompt: "Return <code>EMPLID</code> and the person’s name as <code>First Last</code>, built only from the <code>NAME</code> column of <code>PS_PERSONAL_DATA</code>.",
            hints: ["Everything after the comma is the first name: <code>SUBSTR(NAME, INSTR(NAME, ',') + 1)</code>.", "Join the two halves with <code>|| ' ' ||</code>."],
            solution: `SELECT EMPLID,
       SUBSTR(NAME, INSTR(NAME, ',') + 1) || ' ' || SUBSTR(NAME, 1, INSTR(NAME, ',') - 1) AS FULL_NAME
FROM PS_PERSONAL_DATA`
          },
          {
            id: 'a2-3', title: 'Where each pay period stands', ordered: true,
            prompt: "For pay group <code>BW1</code> in <code>PS_PAY_CALENDAR</code>, return <code>PAY_END_DT</code>, <code>CHECK_DT</code>, the number of days between them, and a status: <code>CONFIRMED</code> when <code>PAY_CONFIRM_RUN</code> is Y, otherwise <code>CALCULATED</code> when <code>PAY_CALC_RUN</code> is Y, otherwise <code>OPEN</code>. Sort by <code>PAY_END_DT</code>.",
            hints: ["Date minus date is a number of days.", "Use a <code>CASE</code> with two <code>WHEN</code> branches and an <code>ELSE</code>. Order matters: test confirmed first."],
            solution: `SELECT PAY_END_DT, CHECK_DT,
       CHECK_DT - PAY_END_DT AS DAYS_TO_CHECK,
       CASE WHEN PAY_CONFIRM_RUN = 'Y' THEN 'CONFIRMED'
            WHEN PAY_CALC_RUN = 'Y' THEN 'CALCULATED'
            ELSE 'OPEN' END AS RUN_STATUS
FROM PS_PAY_CALENDAR
WHERE PAYGROUP = 'BW1'
ORDER BY PAY_END_DT`
          }
        ]
      }
    ]
  });

  // Module 2: effective dating.
  PSCourse.add({
    id: 'effective-dating',
    title: 'Effective dating',
    lessons: [
      {
        id: 'effdt-basics',
        title: 'EFFDT: rows that stack up over time',
        summary: 'Why history is never overwritten, and the subquery that finds the current row.',
        body: [
          "PeopleSoft rarely updates a row to record a change. It inserts a new row with a new <b>effective date</b>, <code>EFFDT</code>, and leaves the old rows in place as history. A row is in effect from its <code>EFFDT</code> until the next row for the same key begins. There is no end date column.",
          { sql: "SELECT DEPTID, EFFDT, EFF_STATUS, DESCR\nFROM PS_DEPT_TBL\nWHERE DEPTID IN ('10300', '10500', '10600')\nORDER BY DEPTID, EFFDT" },
          "Department 10300 was renamed in 2024. Department 10500 was inactivated in July 2026. Department 10600 does not exist yet: its only row is dated in the future. Three kinds of row can exist for any key:",
          { list: [
            "<b>History</b>: rows that have been replaced by a later row.",
            "<b>Current</b>: the row with the latest <code>EFFDT</code> that is not after today. People call it the top of stack.",
            "<b>Future</b>: rows whose <code>EFFDT</code> has not arrived."
          ] },
          { h: "The current row" },
          "To get the current row you ask, for each key, for the greatest <code>EFFDT</code> that is on or before today. The standard form is a correlated subquery. You will type this pattern more than any other SQL in this job.",
          { sql: "SELECT D.DEPTID, D.EFFDT, D.EFF_STATUS, D.DESCR\nFROM PS_DEPT_TBL D\nWHERE D.SETID = 'SHARE'\n  AND D.EFFDT = (SELECT MAX(D1.EFFDT)\n                 FROM PS_DEPT_TBL D1\n                 WHERE D1.SETID = D.SETID\n                   AND D1.DEPTID = D.DEPTID\n                   AND D1.EFFDT <= SYSDATE)" },
          "Read the subquery slowly. It joins back to the outer row on <b>every key except <code>EFFDT</code></b>, and it caps the date with <code>&lt;= SYSDATE</code> so future rows are ignored. Forget a key column and rows from other departments leak into the <code>MAX</code>. Forget the date cap and you report the future.",
          { h: "EFF_STATUS belongs outside" },
          "Setup tables carry <code>EFF_STATUS</code>, A for active or I for inactive. A value is inactivated by adding a new row with status I. So the test for active must be made on the current row, in the outer query. If you put <code>EFF_STATUS = 'A'</code> inside the subquery, you skip the inactive row and return the stale active row beneath it.",
          { note: "Rule of thumb: the subquery finds <i>which</i> row is current. The outer query decides whether you want it." }
        ],
        exercises: [
          {
            id: 'b1-1', title: 'Current department rows',
            prompt: "Return <code>DEPTID</code>, <code>EFFDT</code>, <code>EFF_STATUS</code> and <code>DESCR</code> for the current row of every department in SetID <code>SHARE</code>, whether active or not.",
            hints: ["Start from the example above. It already answers this.", "The subquery correlates on <code>SETID</code> and <code>DEPTID</code> and caps <code>EFFDT</code> at <code>SYSDATE</code>."],
            wrong: [
              { rows: 9, msg: "That is every row, including history. Add the effective date subquery." },
              { rows: 6, msg: "Department 10600 is future dated. Cap the subquery with EFFDT <= SYSDATE." }
            ],
            solution: `SELECT D.DEPTID, D.EFFDT, D.EFF_STATUS, D.DESCR
FROM PS_DEPT_TBL D
WHERE D.SETID = 'SHARE'
  AND D.EFFDT = (SELECT MAX(D1.EFFDT)
                 FROM PS_DEPT_TBL D1
                 WHERE D1.SETID = D.SETID
                   AND D1.DEPTID = D.DEPTID
                   AND D1.EFFDT <= SYSDATE)`
          },
          {
            id: 'b1-2', title: 'Departments that are active today',
            prompt: "Return <code>DEPTID</code> and <code>DESCR</code> for departments in SetID <code>SHARE</code> that are active as of today.",
            hints: ["Find the current row first, then test its status.", "<code>EFF_STATUS = 'A'</code> goes in the outer <code>WHERE</code>, not inside the subquery."],
            wrong: [{ rows: 5, msg: "Field Services (10500) was inactivated in July 2026. If it is in your result, your status test is inside the subquery and it found the old active row." }],
            solution: `SELECT D.DEPTID, D.DESCR
FROM PS_DEPT_TBL D
WHERE D.SETID = 'SHARE'
  AND D.EFF_STATUS = 'A'
  AND D.EFFDT = (SELECT MAX(D1.EFFDT)
                 FROM PS_DEPT_TBL D1
                 WHERE D1.SETID = D.SETID
                   AND D1.DEPTID = D.DEPTID
                   AND D1.EFFDT <= SYSDATE)`
          },
          {
            id: 'b1-3', title: 'Earnings codes as they were',
            prompt: "The same pattern works for any date. Return <code>ERNCD</code>, <code>DESCR</code> and <code>EFF_STATUS</code> from <code>PS_EARNINGS_TBL</code> as the codes stood on 30 June 2024.",
            hints: ["Replace <code>SYSDATE</code> with a date literal: <code>DATE '2024-06-30'</code>.", "<code>PS_EARNINGS_TBL</code> has only one key besides <code>EFFDT</code>."],
            solution: `SELECT E.ERNCD, E.DESCR, E.EFF_STATUS
FROM PS_EARNINGS_TBL E
WHERE E.EFFDT = (SELECT MAX(E1.EFFDT)
                 FROM PS_EARNINGS_TBL E1
                 WHERE E1.ERNCD = E.ERNCD
                   AND E1.EFFDT <= DATE '2024-06-30')`
          }
        ]
      },
      {
        id: 'job-and-effseq',
        title: 'PS_JOB and EFFSEQ',
        summary: 'The most queried table in HCM, and the second subquery it needs.',
        body: [
          "<code>PS_JOB</code> holds every job event for every person: hires, raises, transfers, leaves and terminations. Its key is <code>EMPLID</code>, <code>EMPL_RCD</code>, <code>EFFDT</code>, <code>EFFSEQ</code>.",
          { list: [
            "<code>EMPL_RCD</code> separates concurrent jobs. Most people only have record 0. Employee 100005 has records 0 and 1, two jobs at once, each with its own history.",
            "<code>EFFSEQ</code> orders several events on the <b>same day</b>. A transfer and a raise entered for the same date become sequence 0 and sequence 1.",
            "<code>ACTION</code> says what happened. <code>EMPL_STATUS</code> and <code>HR_STATUS</code> say where that leaves the person."
          ] },
          { sql: "SELECT EMPLID, EMPL_RCD, EFFDT, EFFSEQ, ACTION, DEPTID, JOBCODE, HOURLY_RT\nFROM PS_JOB\nWHERE EMPLID = '100002'\nORDER BY EFFDT, EFFSEQ" },
          "Look at 1 March 2026. Two rows share the date, so <code>MAX(EFFDT)</code> alone returns both. The current row is the one with the highest <code>EFFSEQ</code> on the latest date, and that takes a second subquery:",
          { sql: PSCourse.CURRENT_JOB.replace('SELECT J.*', 'SELECT J.EMPLID, J.EMPL_RCD, J.EFFDT, J.EFFSEQ, J.ACTION, J.HOURLY_RT').replace('  WHERE J.EFFDT', "  WHERE J.EMPLID = '100002'\n    AND J.EFFDT") },
          "The <code>EFFSEQ</code> subquery correlates on every key <b>including</b> <code>EFFDT</code>: of the rows on that date, take the last. Leaving it out is the classic PS_JOB bug. The query looks right, passes testing, and then doubles one person the first time two events land on the same day.",
          { h: "Who counts as an employee" },
          "<code>EMPL_STATUS</code> is detailed: A active, L unpaid leave, P paid leave, T terminated, and more. <code>HR_STATUS</code> is the summary: A for anyone still employed, including people on leave, and I for anyone who has left. Ask which one the report means before you write the filter. Payroll usually cares about <code>EMPL_STATUS</code>, and headcount about <code>HR_STATUS</code>."
        ],
        exercises: [
          {
            id: 'b2-1', title: 'Everyone’s current job row',
            prompt: "Return <code>EMPLID</code>, <code>EMPL_RCD</code>, <code>EFFDT</code>, <code>EFFSEQ</code>, <code>DEPTID</code>, <code>JOBCODE</code> and <code>EMPL_STATUS</code> for the current row of every job in <code>PS_JOB</code>.",
            hints: ["Two subqueries: <code>MAX(EFFDT)</code> on or before <code>SYSDATE</code>, then <code>MAX(EFFSEQ)</code> for that date.", "Both correlate on <code>EMPLID</code> and <code>EMPL_RCD</code>. The second also correlates on <code>EFFDT</code>."],
            wrong: [
              { rows: 17, msg: "One row too many. Either employee 100002 appears twice because the EFFSEQ subquery is missing, or 100012 appears because the date cap is missing." },
              { rows: 15, msg: "One row short. Employee 100005 has two jobs, so the subqueries must correlate on EMPL_RCD as well as EMPLID." }
            ],
            solution: PSCourse.CURRENT_JOB.replace('SELECT J.*', 'SELECT J.EMPLID, J.EMPL_RCD, J.EFFDT, J.EFFSEQ, J.DEPTID, J.JOBCODE, J.EMPL_STATUS').replace(/\n  /g, '\n')
          },
          {
            id: 'b2-2', title: 'Active roster with names',
            prompt: "Return <code>EMPLID</code>, <code>NAME</code>, <code>EMPL_RCD</code>, <code>DEPTID</code> and <code>ANNUAL_RT</code> for every job whose current row has <code>HR_STATUS</code> A. Names come from <code>PS_PERSONAL_DATA</code>.",
            hints: ["Join <code>PS_PERSONAL_DATA</code> on <code>EMPLID</code>. It is not effective dated.", "The status test goes in the outer query, on the current row."],
            solution: `SELECT J.EMPLID, P.NAME, J.EMPL_RCD, J.DEPTID, J.ANNUAL_RT
FROM PS_JOB J
JOIN PS_PERSONAL_DATA P ON P.EMPLID = J.EMPLID
WHERE J.HR_STATUS = 'A'
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
            id: 'b2-3', title: 'Find the same day events',
            prompt: "Which jobs have more than one row on a single date? Return <code>EMPLID</code>, <code>EMPL_RCD</code>, <code>EFFDT</code> and the number of rows, for dates with more than one row.",
            hints: ["Group by the key without <code>EFFSEQ</code>.", "<code>HAVING COUNT(*) &gt; 1</code>."],
            solution: `SELECT EMPLID, EMPL_RCD, EFFDT, COUNT(*) AS ROWS_ON_DATE
FROM PS_JOB
GROUP BY EMPLID, EMPL_RCD, EFFDT
HAVING COUNT(*) > 1`
          }
        ]
      },
      {
        id: 'as-of-dates',
        title: 'As of any date',
        summary: 'Past dates, future rows, and the row in effect for each paycheck.',
        body: [
          "“Current” is only one question. Payroll asks about other dates all the time: what was her rate at year end, which department was he in on the last day of the period, what changes are already keyed for next year. The pattern stays the same. Only the date in the cap changes.",
          { sql: "SELECT J.EMPLID, J.EFFDT, J.ACTION, J.EMPL_STATUS, J.ANNUAL_RT\nFROM PS_JOB J\nWHERE J.EMPLID = '100006'\n  AND J.EFFDT = (SELECT MAX(J1.EFFDT) FROM PS_JOB J1\n                 WHERE J1.EMPLID = J.EMPLID\n                   AND J1.EMPL_RCD = J.EMPL_RCD\n                   AND J1.EFFDT <= DATE '2025-06-30')\n  AND J.EFFSEQ = (SELECT MAX(J2.EFFSEQ) FROM PS_JOB J2\n                  WHERE J2.EMPLID = J.EMPLID\n                    AND J2.EMPL_RCD = J.EMPL_RCD\n                    AND J2.EFFDT = J.EFFDT)" },
          "In mid 2025 employee 100006 was terminated. Run it again with a 2026 date and she is active, because she was rehired. A person who had not been hired by the as-of date returns no row at all.",
          { h: "As of a date on another row" },
          "The date does not have to be a constant. The most useful version in payroll caps the subquery with a date from the row you are joining to, such as the pay period end date on a paycheck. Each check then finds the job row that was in effect for that period.",
          { sql: "SELECT C.PAY_END_DT, C.TOTAL_GROSS, J.EFFDT AS JOB_EFFDT, J.DEPTID, J.HOURLY_RT\nFROM PS_PAY_CHECK C\nJOIN PS_JOB J\n  ON J.EMPLID = C.EMPLID\n AND J.EMPL_RCD = C.EMPL_RCD\nWHERE C.EMPLID = '100002'\n  AND C.OFF_CYCLE = 'N'\n  AND C.PAY_END_DT BETWEEN DATE '2026-02-07' AND DATE '2026-04-04'\n  AND J.EFFDT = (SELECT MAX(J1.EFFDT) FROM PS_JOB J1\n                 WHERE J1.EMPLID = J.EMPLID\n                   AND J1.EMPL_RCD = J.EMPL_RCD\n                   AND J1.EFFDT <= C.PAY_END_DT)\n  AND J.EFFSEQ = (SELECT MAX(J2.EFFSEQ) FROM PS_JOB J2\n                  WHERE J2.EMPLID = J.EMPLID\n                    AND J2.EMPL_RCD = J.EMPL_RCD\n                    AND J2.EFFDT = J.EFFDT)\nORDER BY C.PAY_END_DT" },
          { note: "The lab’s payroll pays each period at the job row in effect on <code>PAY_END_DT</code>. Real payroll prorates a rate change that lands in the middle of a period, so expect split earnings lines at work." },
          { h: "Time travel" },
          "Change the lab date at the top of the page to 15 January 2027 and rerun any current row query. The future dated rows are now current, with no change to the SQL. That is exactly what happens in production on the morning a future row comes due. Set the date back when you are done."
        ],
        exercises: [
          {
            id: 'b3-1', title: 'The roster at year end 2025',
            prompt: "Return <code>EMPLID</code>, <code>EMPL_RCD</code>, <code>DEPTID</code>, <code>EMPL_STATUS</code> and <code>ANNUAL_RT</code> for every job as it stood on 31 December 2025. Include terminated people.",
            hints: ["Use the current row pattern with <code>DATE '2025-12-31'</code> in place of <code>SYSDATE</code>."],
            solution: `SELECT J.EMPLID, J.EMPL_RCD, J.DEPTID, J.EMPL_STATUS, J.ANNUAL_RT
FROM PS_JOB J
WHERE J.EFFDT = (SELECT MAX(J1.EFFDT) FROM PS_JOB J1
                 WHERE J1.EMPLID = J.EMPLID
                   AND J1.EMPL_RCD = J.EMPL_RCD
                   AND J1.EFFDT <= DATE '2025-12-31')
  AND J.EFFSEQ = (SELECT MAX(J2.EFFSEQ) FROM PS_JOB J2
                  WHERE J2.EMPLID = J.EMPLID
                    AND J2.EMPL_RCD = J.EMPL_RCD
                    AND J2.EFFDT = J.EFFDT)`
          },
          {
            id: 'b3-2', title: 'What is already keyed for the future',
            prompt: "Return <code>EMPLID</code>, <code>EFFDT</code>, <code>ACTION</code> and <code>ANNUAL_RT</code> for every <code>PS_JOB</code> row that has not taken effect yet.",
            hints: ["No subquery needed. Future rows are simply those dated after today."],
            solution: `SELECT EMPLID, EFFDT, ACTION, ANNUAL_RT
FROM PS_JOB
WHERE EFFDT > SYSDATE`
          },
          {
            id: 'b3-3', title: 'The job behind each paycheck', ordered: true,
            prompt: "Employee 100007 changed departments and then got a raise during 2026. For each of his confirmed checks (<code>PAYCHECK_STATUS = 'F'</code>), return <code>PAY_END_DT</code>, and the <code>DEPTID</code> and <code>ANNUAL_RT</code> from the job row in effect on that <code>PAY_END_DT</code>. Sort by <code>PAY_END_DT</code>.",
            hints: ["Join <code>PS_PAY_CHECK</code> to <code>PS_JOB</code> on <code>EMPLID</code> and <code>EMPL_RCD</code>.", "Cap the <code>EFFDT</code> subquery with <code>C.PAY_END_DT</code> instead of <code>SYSDATE</code>.", "Take <code>DEPTID</code> from the job row. The copy on the check happens to match here, but the exercise is the join."],
            solution: `SELECT C.PAY_END_DT, J.DEPTID, J.ANNUAL_RT
FROM PS_PAY_CHECK C
JOIN PS_JOB J
  ON J.EMPLID = C.EMPLID
 AND J.EMPL_RCD = C.EMPL_RCD
WHERE C.EMPLID = '100007'
  AND C.PAYCHECK_STATUS = 'F'
  AND J.EFFDT = (SELECT MAX(J1.EFFDT) FROM PS_JOB J1
                 WHERE J1.EMPLID = J.EMPLID
                   AND J1.EMPL_RCD = J.EMPL_RCD
                   AND J1.EFFDT <= C.PAY_END_DT)
  AND J.EFFSEQ = (SELECT MAX(J2.EFFSEQ) FROM PS_JOB J2
                  WHERE J2.EMPLID = J.EMPLID
                    AND J2.EMPL_RCD = J.EMPL_RCD
                    AND J2.EFFDT = J.EFFDT)
ORDER BY C.PAY_END_DT`
          }
        ]
      },
      {
        id: 'joining-effective-dated-tables',
        title: 'Joining effective dated tables',
        summary: 'Each table needs its own date logic. SetIDs and translate values.',
        body: [
          "A job row stores codes, not descriptions. The department name lives in <code>PS_DEPT_TBL</code>, the job title in <code>PS_JOBCODE_TBL</code>, and both of those are effective dated too. <b>Every effective dated table in a query needs its own effective date subquery.</b> One subquery on <code>PS_JOB</code> does nothing for the department table joined to it.",
          { h: "SetID" },
          "Setup tables are keyed by <code>SETID</code> so that business units can share one set of departments or keep their own. The job row tells you which SetID to use: join <code>PS_DEPT_TBL</code> on <code>SETID_DEPT</code> and <code>PS_JOBCODE_TBL</code> on <code>SETID_JOBCODE</code>. This lab has one SetID, <code>SHARE</code>. Join on it anyway, because production will have several and the missing join multiplies rows.",
          { sql: "SELECT J.EMPLID, J.DEPTID, D.DESCR AS DEPT_NAME\nFROM PS_JOB J\nJOIN PS_DEPT_TBL D\n  ON D.SETID = J.SETID_DEPT\n AND D.DEPTID = J.DEPTID\nWHERE J.EMPLID = '100014'\n  AND J.EFFDT = (SELECT MAX(J1.EFFDT) FROM PS_JOB J1\n                 WHERE J1.EMPLID = J.EMPLID\n                   AND J1.EMPL_RCD = J.EMPL_RCD\n                   AND J1.EFFDT <= SYSDATE)\n  AND J.EFFSEQ = (SELECT MAX(J2.EFFSEQ) FROM PS_JOB J2\n                  WHERE J2.EMPLID = J.EMPLID\n                    AND J2.EMPL_RCD = J.EMPL_RCD\n                    AND J2.EFFDT = J.EFFDT)\n  AND D.EFFDT = (SELECT MAX(D1.EFFDT) FROM PS_DEPT_TBL D1\n                 WHERE D1.SETID = D.SETID\n                   AND D1.DEPTID = D.DEPTID\n                   AND D1.EFFDT <= SYSDATE)" },
          { h: "Which date for the description?" },
          "The department subquery above uses <code>SYSDATE</code>: the name as it is today. For a history report you often want the name as it was when the job row took effect. Then the cap becomes <code>D1.EFFDT &lt;= J.EFFDT</code>. Both are correct. They answer different questions, so check which one the requester means.",
          { h: "Translate values" },
          "Short codes such as <code>EMPL_STATUS</code> have no setup table of their own. Their descriptions are <b>translate values</b> in <code>PSXLATITEM</code>, keyed by <code>FIELDNAME</code> and <code>FIELDVALUE</code>, and yes, effective dated.",
          { sql: "SELECT FIELDNAME, FIELDVALUE, XLATLONGNAME, XLATSHORTNAME\nFROM PSXLATITEM\nWHERE FIELDNAME IN ('EMPL_STATUS', 'PAYCHECK_STATUS')\nORDER BY FIELDNAME, FIELDVALUE" }
        ],
        exercises: [
          {
            id: 'b4-1', title: 'Roster with department and job title',
            prompt: "For every job whose current row has <code>HR_STATUS</code> A, return <code>EMPLID</code>, <code>NAME</code>, the department <code>DESCR</code> and the job code <code>DESCR</code>, both as of today.",
            hints: ["Four tables: <code>PS_JOB</code>, <code>PS_PERSONAL_DATA</code>, <code>PS_DEPT_TBL</code>, <code>PS_JOBCODE_TBL</code>.", "Three of them are effective dated, so you need subqueries for all three. Only <code>PS_JOB</code> needs <code>EFFSEQ</code>.", "Join the setup tables on <code>SETID_DEPT</code> and <code>SETID_JOBCODE</code>."],
            solution: `SELECT J.EMPLID, P.NAME, D.DESCR AS DEPT_NAME, JC.DESCR AS JOB_TITLE
FROM PS_JOB J
JOIN PS_PERSONAL_DATA P ON P.EMPLID = J.EMPLID
JOIN PS_DEPT_TBL D
  ON D.SETID = J.SETID_DEPT
 AND D.DEPTID = J.DEPTID
JOIN PS_JOBCODE_TBL JC
  ON JC.SETID = J.SETID_JOBCODE
 AND JC.JOBCODE = J.JOBCODE
WHERE J.HR_STATUS = 'A'
  AND J.EFFDT = (SELECT MAX(J1.EFFDT) FROM PS_JOB J1
                 WHERE J1.EMPLID = J.EMPLID
                   AND J1.EMPL_RCD = J.EMPL_RCD
                   AND J1.EFFDT <= SYSDATE)
  AND J.EFFSEQ = (SELECT MAX(J2.EFFSEQ) FROM PS_JOB J2
                  WHERE J2.EMPLID = J.EMPLID
                    AND J2.EMPL_RCD = J.EMPL_RCD
                    AND J2.EFFDT = J.EFFDT)
  AND D.EFFDT = (SELECT MAX(D1.EFFDT) FROM PS_DEPT_TBL D1
                 WHERE D1.SETID = D.SETID
                   AND D1.DEPTID = D.DEPTID
                   AND D1.EFFDT <= SYSDATE)
  AND JC.EFFDT = (SELECT MAX(JC1.EFFDT) FROM PS_JOBCODE_TBL JC1
                  WHERE JC1.SETID = JC.SETID
                    AND JC1.JOBCODE = JC.JOBCODE
                    AND JC1.EFFDT <= SYSDATE)`
          },
          {
            id: 'b4-2', title: 'The department name at the time', ordered: true,
            prompt: "For employee 100005, employment record 0, return every job row’s <code>EFFDT</code>, <code>DEPTID</code> and the department <code>DESCR</code> <b>as it was on that row’s effective date</b>. Sort by <code>EFFDT</code>.",
            hints: ["You want all of his job rows, so <code>PS_JOB</code> needs no effective date subquery here.", "Cap the department subquery with <code>J.EFFDT</code>."],
            solution: `SELECT J.EFFDT, J.DEPTID, D.DESCR
FROM PS_JOB J
JOIN PS_DEPT_TBL D
  ON D.SETID = J.SETID_DEPT
 AND D.DEPTID = J.DEPTID
WHERE J.EMPLID = '100005'
  AND J.EMPL_RCD = 0
  AND D.EFFDT = (SELECT MAX(D1.EFFDT) FROM PS_DEPT_TBL D1
                 WHERE D1.SETID = D.SETID
                   AND D1.DEPTID = D.DEPTID
                   AND D1.EFFDT <= J.EFFDT)
ORDER BY J.EFFDT`
          },
          {
            id: 'b4-3', title: 'Spell out the status',
            prompt: "Return <code>EMPLID</code>, <code>EMPL_RCD</code>, <code>EMPL_STATUS</code> and its <code>XLATLONGNAME</code> for the current row of every job.",
            hints: ["Join <code>PSXLATITEM</code> on <code>FIELDNAME = 'EMPL_STATUS'</code> and <code>FIELDVALUE = J.EMPL_STATUS</code>.", "Translate values are effective dated. Give them a subquery too."],
            solution: `SELECT J.EMPLID, J.EMPL_RCD, J.EMPL_STATUS, X.XLATLONGNAME
FROM PS_JOB J
JOIN PSXLATITEM X
  ON X.FIELDNAME = 'EMPL_STATUS'
 AND X.FIELDVALUE = J.EMPL_STATUS
WHERE J.EFFDT = (SELECT MAX(J1.EFFDT) FROM PS_JOB J1
                 WHERE J1.EMPLID = J.EMPLID
                   AND J1.EMPL_RCD = J.EMPL_RCD
                   AND J1.EFFDT <= SYSDATE)
  AND J.EFFSEQ = (SELECT MAX(J2.EFFSEQ) FROM PS_JOB J2
                  WHERE J2.EMPLID = J.EMPLID
                    AND J2.EMPL_RCD = J.EMPL_RCD
                    AND J2.EFFDT = J.EFFDT)
  AND X.EFFDT = (SELECT MAX(X1.EFFDT) FROM PSXLATITEM X1
                 WHERE X1.FIELDNAME = X.FIELDNAME
                   AND X1.FIELDVALUE = X.FIELDVALUE
                   AND X1.EFFDT <= SYSDATE)`
          }
        ]
      },
      {
        id: 'effective-dating-traps',
        title: 'Effective dating traps',
        summary: 'Stale references and outer joins, the two that reach production.',
        body: [
          "Most effective dating bugs are one of five mistakes. You have met three: a missing <code>EFFSEQ</code> subquery, a missing key in the correlation, and <code>EFF_STATUS</code> tested in the wrong place. Here are the other two.",
          { h: "Stale references" },
          "Nothing stops a job row from pointing at a department that was later inactivated. The application checks the department when the job row is saved, and never again. So current job rows can reference inactive setup values, and a query that inner joins to “active departments only” silently drops those people. When a headcount is one short, this is the first thing to check.",
          { h: "Outer joins" },
          "Suppose you want every person, with their current job if they have one. A <code>LEFT JOIN</code> to <code>PS_JOB</code> is right, but the effective date conditions cannot go in the <code>WHERE</code> clause: a condition on the outer joined table there throws away the rows with no match, and the outer join quietly becomes an inner join.",
          "The dependable fix is to resolve the effective dating first, in an inline view or a <code>WITH</code> clause, and outer join to the finished result:",
          { sql: "SELECT P.EMPLID, P.NAME, CJ.DEPTID\nFROM PS_PERSONAL_DATA P\nLEFT JOIN (\n" + PSCourse.CURRENT_JOB + "\n) CJ ON CJ.EMPLID = P.EMPLID\nWHERE P.EMPLID IN ('100011', '100012')" },
          { note: "Older PeopleSoft SQL uses Oracle’s <code>(+)</code> outer join marker, which cannot be combined with a subquery at all (ORA-01799). You will read it in delivered code. Write ANSI joins in new work." }
        ],
        exercises: [
          {
            id: 'b5-1', title: 'Jobs in a closed department',
            prompt: "Find every job whose current row points at a department whose current row is inactive. Return <code>EMPLID</code> and <code>DEPTID</code>.",
            hints: ["Current job row joined to current department row, then test the department’s <code>EFF_STATUS</code>.", "Both subqueries cap at <code>SYSDATE</code>."],
            solution: `SELECT J.EMPLID, J.DEPTID
FROM PS_JOB J
JOIN PS_DEPT_TBL D
  ON D.SETID = J.SETID_DEPT
 AND D.DEPTID = J.DEPTID
WHERE D.EFF_STATUS = 'I'
  AND J.EFFDT = (SELECT MAX(J1.EFFDT) FROM PS_JOB J1
                 WHERE J1.EMPLID = J.EMPLID
                   AND J1.EMPL_RCD = J.EMPL_RCD
                   AND J1.EFFDT <= SYSDATE)
  AND J.EFFSEQ = (SELECT MAX(J2.EFFSEQ) FROM PS_JOB J2
                  WHERE J2.EMPLID = J.EMPLID
                    AND J2.EMPL_RCD = J.EMPL_RCD
                    AND J2.EFFDT = J.EFFDT)
  AND D.EFFDT = (SELECT MAX(D1.EFFDT) FROM PS_DEPT_TBL D1
                 WHERE D1.SETID = D.SETID
                   AND D1.DEPTID = D.DEPTID
                   AND D1.EFFDT <= SYSDATE)`
          },
          {
            id: 'b5-2', title: 'Every person, job or not',
            prompt: "Return <code>EMPLID</code>, <code>NAME</code>, <code>EMPL_RCD</code> and <code>DEPTID</code> for every person in <code>PS_PERSONAL_DATA</code>, using their current job rows. A person with no current job row must still appear, with nulls.",
            hints: ["Put the current row logic in an inline view, then <code>LEFT JOIN</code> to it.", "The starter already contains the inline view."],
            wrong: [{ rows: 16, msg: "Employee 100012 is missing. Her only job row is future dated, so an inner join, or a WHERE condition on the job table, drops her." }],
            starter: "SELECT P.EMPLID, P.NAME\nFROM PS_PERSONAL_DATA P\nLEFT JOIN (\n" + PSCourse.CURRENT_JOB + "\n) CJ ON CJ.EMPLID = P.EMPLID",
            solution: "SELECT P.EMPLID, P.NAME, CJ.EMPL_RCD, CJ.DEPTID\nFROM PS_PERSONAL_DATA P\nLEFT JOIN (\n" + PSCourse.CURRENT_JOB + "\n) CJ ON CJ.EMPLID = P.EMPLID"
          }
        ]
      }
    ]
  });

  // The join between a paycheck and one of its child tables, used in many solutions.
  var CHECK_KEYS_T = 'T.COMPANY = C.COMPANY\n AND T.PAYGROUP = C.PAYGROUP\n AND T.PAY_END_DT = C.PAY_END_DT\n AND T.OFF_CYCLE = C.OFF_CYCLE\n AND T.PAGE_NUM = C.PAGE_NUM\n AND T.LINE_NUM = C.LINE_NUM\n AND T.SEPCHK = C.SEPCHK';

  // Module 3: the payroll tables.
  PSCourse.add({
    id: 'payroll-data',
    title: 'Payroll data',
    lessons: [
      {
        id: 'calendar-and-paycheck',
        title: 'The pay calendar and the paycheck',
        summary: 'How a pay run is identified, and the seven part key you will join on.',
        body: [
          "Payroll for North America groups employees into <b>pay groups</b> that share a schedule. <code>PS_PAY_CALENDAR</code> has one row per company, pay group and pay period, and its flags show how far the run has gone: paysheets created, pay calculated, pay confirmed. Confirmation is the point of no return. It finalizes the checks and updates the year to date balances.",
          { sql: "SELECT PAYGROUP, PAY_BEGIN_DT, PAY_END_DT, CHECK_DT, PAY_CALC_RUN, PAY_CONFIRM_RUN\nFROM PS_PAY_CALENDAR\nWHERE PAY_END_DT >= DATE '2026-10-17'\nORDER BY PAY_END_DT, PAYGROUP" },
          { h: "PS_PAY_CHECK" },
          "Each paycheck is a row in <code>PS_PAY_CHECK</code>. Its key is not the employee. It is the check’s position on the paysheet:",
          { list: [
            "<code>COMPANY</code>, <code>PAYGROUP</code>, <code>PAY_END_DT</code>: which pay run.",
            "<code>OFF_CYCLE</code>: N for the scheduled run, Y for checks cut outside it.",
            "<code>PAGE_NUM</code>, <code>LINE_NUM</code>: the paysheet page and line. One employee per line.",
            "<code>SEPCHK</code>: 0 for the main check, 1 and up when a line pays a separate check, such as a bonus."
          ] },
          "Earnings, taxes and deductions all hang off that key. <code>EMPLID</code> is on the check as an ordinary column, which is how you get from a person to their checks.",
          { sql: "SELECT PAY_END_DT, OFF_CYCLE, PAGE_NUM, LINE_NUM, SEPCHK, PAYCHECK_STATUS,\n       TOTAL_GROSS, TOTAL_TAXES, TOTAL_DEDUCTIONS, NET_PAY\nFROM PS_PAY_CHECK\nWHERE EMPLID = '100009'\n  AND PAY_END_DT BETWEEN DATE '2026-03-07' AND DATE '2026-04-04'\nORDER BY PAY_END_DT, SEPCHK" },
          { h: "Status" },
          "<code>PAYCHECK_STATUS</code> is C while a check is only calculated and F once confirmed. Calculated checks can still change or vanish, so reports on what was paid exclude C. When a confirmed check is reversed, the original is kept and flagged, and a negative mirror image is added, so the pair sums to zero. In this lab the original is marked R and the mirror image is a confirmed check with <code>PAYCHECK_OPTION</code> R. Sites differ in the details, so look at a real reversal in your own data before you rely on any filter.",
          { note: "Two dates matter on every check. <code>PAY_END_DT</code> says which period the work belongs to. <code>CHECK_DT</code> says when the money was paid, and taxes, W-2 wages and balances follow the check date. A period ending 26 December with a check dated 1 January belongs to the new tax year." }
        ],
        exercises: [
          {
            id: 'c1-1', title: 'One person’s checks', ordered: true,
            prompt: "Return <code>PAY_END_DT</code>, <code>CHECK_DT</code>, <code>TOTAL_GROSS</code> and <code>NET_PAY</code> for the confirmed checks (<code>PAYCHECK_STATUS = 'F'</code>) of employee 100001, sorted by <code>PAY_END_DT</code>.",
            hints: ["A plain filter on <code>PS_PAY_CHECK</code>. Remember that <code>EMPLID</code> is text."],
            solution: `SELECT PAY_END_DT, CHECK_DT, TOTAL_GROSS, NET_PAY
FROM PS_PAY_CHECK
WHERE EMPLID = '100001'
  AND PAYCHECK_STATUS = 'F'
ORDER BY PAY_END_DT`
          },
          {
            id: 'c1-2', title: 'Totals for each pay period', ordered: true,
            prompt: "For every pay period, across both pay groups, return <code>PAY_END_DT</code>, the number of checks, total gross and total net. Leave out checks that are only calculated. Sort by <code>PAY_END_DT</code>.",
            hints: ["Group by <code>PAY_END_DT</code>.", "Exclude calculated checks with <code>PAYCHECK_STATUS &lt;&gt; 'C'</code>. Keep reversals, because their negative amounts are what make the totals right."],
            solution: `SELECT PAY_END_DT, COUNT(*) AS CHECKS,
       SUM(TOTAL_GROSS) AS GROSS, SUM(NET_PAY) AS NET
FROM PS_PAY_CHECK
WHERE PAYCHECK_STATUS <> 'C'
GROUP BY PAY_END_DT
ORDER BY PAY_END_DT`
          },
          {
            id: 'c1-3', title: 'The run in progress',
            prompt: "Which pay calendars have been calculated but not yet confirmed? Return <code>PAYGROUP</code>, <code>PAY_END_DT</code> and <code>CHECK_DT</code>.",
            hints: ["Two flags on <code>PS_PAY_CALENDAR</code>."],
            solution: `SELECT PAYGROUP, PAY_END_DT, CHECK_DT
FROM PS_PAY_CALENDAR
WHERE PAY_CALC_RUN = 'Y'
  AND PAY_CONFIRM_RUN = 'N'`
          }
        ]
      },
      {
        id: 'earnings',
        title: 'Earnings',
        summary: 'Regular pay, overtime and other earnings, and how they attach to a check.',
        body: [
          "Earnings sit in two tables. <code>PS_PAY_EARNINGS</code> has one row per paysheet line and <code>ADDL_NBR</code>, holding regular and overtime pay. <code>PS_PAY_OTH_EARNS</code> is its child, with one row per earnings code for everything else: bonuses, shift pay, awards.",
          { list: [
            "Hourly employees are paid through <code>REG_HRS</code> and <code>REG_HRLY_EARNS</code>, plus <code>OT_HRS</code> and <code>OT_HRLY_EARNS</code>.",
            "Salaried employees are paid through <code>REG_EARN_HRS</code> and <code>REG_EARNS</code>.",
            "So regular pay for a mixed population is <code>REG_EARNS + REG_HRLY_EARNS</code>. Summing only one of them is a common way to lose half the company."
          ] },
          { sql: "SELECT E.EMPLID, E.ADDL_NBR, E.SEPCHK, E.REG_HRS, E.OT_HRS,\n       E.REG_HRLY_EARNS, E.OT_HRLY_EARNS, E.REG_EARNS\nFROM PS_PAY_EARNINGS E\nWHERE E.PAY_END_DT = DATE '2026-10-31'\n  AND E.EMPLID IN ('100002', '100009')" },
          { h: "Joining the levels" },
          "<code>PS_PAY_EARNINGS</code> carries a <code>SEPCHK</code> column saying which check on the line each earnings row is paid on. To join earnings to their check you need all seven columns: company, pay group, pay end date, off cycle, page, line and <code>SEPCHK</code>. <code>PS_PAY_OTH_EARNS</code> joins to its parent earnings row on the first six plus <code>ADDL_NBR</code>, and has no <code>EMPLID</code> of its own.",
          { sql: "SELECT E.EMPLID, O.ERNCD, O.OTH_HRS, O.OTH_EARNS\nFROM PS_PAY_OTH_EARNS O\nJOIN PS_PAY_EARNINGS E\n  ON E.COMPANY = O.COMPANY\n AND E.PAYGROUP = O.PAYGROUP\n AND E.PAY_END_DT = O.PAY_END_DT\n AND E.OFF_CYCLE = O.OFF_CYCLE\n AND E.PAGE_NUM = O.PAGE_NUM\n AND E.LINE_NUM = O.LINE_NUM\n AND E.ADDL_NBR = O.ADDL_NBR\nWHERE O.PAY_END_DT = DATE '2026-03-21'\nORDER BY E.EMPLID" },
          { note: "Typing six or seven join conditions feels excessive until the day you leave one out. Skip <code>OFF_CYCLE</code> and an off-cycle check silently doubles against the regular one. When a total looks too high, count your join columns first." }
        ],
        exercises: [
          {
            id: 'c2-1', title: 'Overtime for the year',
            prompt: "Return <code>EMPLID</code>, total overtime hours and total overtime earnings for each employee with any overtime in 2026. Count only checks that are not merely calculated, which means joining to <code>PS_PAY_CHECK</code> for the status.",
            hints: ["Join <code>PS_PAY_EARNINGS</code> to <code>PS_PAY_CHECK</code> on all seven key columns, including <code>SEPCHK</code>.", "Filter <code>C.PAYCHECK_STATUS &lt;&gt; 'C'</code>, group by <code>E.EMPLID</code>, and keep groups with <code>HAVING SUM(E.OT_HRS) &gt; 0</code>."],
            solution: `SELECT E.EMPLID, SUM(E.OT_HRS) AS OT_HOURS, SUM(E.OT_HRLY_EARNS) AS OT_EARNINGS
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
GROUP BY E.EMPLID
HAVING SUM(E.OT_HRS) > 0`
          },
          {
            id: 'c2-2', title: 'Other earnings by code',
            prompt: "Return each <code>ERNCD</code> in <code>PS_PAY_OTH_EARNS</code>, its current description from <code>PS_EARNINGS_TBL</code>, and the total <code>OTH_EARNS</code>. Leave out checks that are only calculated. A code with no row in the earnings table must still appear, with a null description.",
            hints: ["Status lives on the check: join other earnings to earnings (six keys plus <code>ADDL_NBR</code>), then earnings to the check (seven keys).", "Resolve the current row of <code>PS_EARNINGS_TBL</code> in an inline view, then <code>LEFT JOIN</code> it on <code>ERNCD</code>.", "Group by the code and the description."],
            wrong: [{ rows: 3, msg: "One code is missing. It has no row in PS_EARNINGS_TBL, so an inner join drops it." }],
            solution: `SELECT O.ERNCD, ET.DESCR, SUM(O.OTH_EARNS) AS TOTAL_EARNS
FROM PS_PAY_OTH_EARNS O
JOIN PS_PAY_EARNINGS E
  ON E.COMPANY = O.COMPANY
 AND E.PAYGROUP = O.PAYGROUP
 AND E.PAY_END_DT = O.PAY_END_DT
 AND E.OFF_CYCLE = O.OFF_CYCLE
 AND E.PAGE_NUM = O.PAGE_NUM
 AND E.LINE_NUM = O.LINE_NUM
 AND E.ADDL_NBR = O.ADDL_NBR
JOIN PS_PAY_CHECK C
  ON C.COMPANY = E.COMPANY
 AND C.PAYGROUP = E.PAYGROUP
 AND C.PAY_END_DT = E.PAY_END_DT
 AND C.OFF_CYCLE = E.OFF_CYCLE
 AND C.PAGE_NUM = E.PAGE_NUM
 AND C.LINE_NUM = E.LINE_NUM
 AND C.SEPCHK = E.SEPCHK
LEFT JOIN (
  SELECT T.ERNCD, T.DESCR
  FROM PS_EARNINGS_TBL T
  WHERE T.EFFDT = (SELECT MAX(T1.EFFDT) FROM PS_EARNINGS_TBL T1
                   WHERE T1.ERNCD = T.ERNCD
                     AND T1.EFFDT <= SYSDATE)
) ET ON ET.ERNCD = O.ERNCD
WHERE C.PAYCHECK_STATUS <> 'C'
GROUP BY O.ERNCD, ET.DESCR`
          },
          {
            id: 'c2-3', title: 'Two checks on one line',
            prompt: "Employee 100009 received two checks for the period ending 21 March 2026. Return <code>ADDL_NBR</code>, <code>SEPCHK</code>, <code>REG_EARNS</code>, <code>ERNCD</code> and <code>OTH_EARNS</code> for his earnings rows that period, keeping earnings rows that have no other earnings.",
            hints: ["Start from <code>PS_PAY_EARNINGS</code> and <code>LEFT JOIN</code> <code>PS_PAY_OTH_EARNS</code> on six keys plus <code>ADDL_NBR</code>.", "Filter on <code>E.EMPLID</code> and <code>E.PAY_END_DT</code>. Those conditions are on the left table, so they are safe in the <code>WHERE</code>."],
            solution: `SELECT E.ADDL_NBR, E.SEPCHK, E.REG_EARNS, O.ERNCD, O.OTH_EARNS
FROM PS_PAY_EARNINGS E
LEFT JOIN PS_PAY_OTH_EARNS O
  ON O.COMPANY = E.COMPANY
 AND O.PAYGROUP = E.PAYGROUP
 AND O.PAY_END_DT = E.PAY_END_DT
 AND O.OFF_CYCLE = E.OFF_CYCLE
 AND O.PAGE_NUM = E.PAGE_NUM
 AND O.LINE_NUM = E.LINE_NUM
 AND O.ADDL_NBR = E.ADDL_NBR
WHERE E.EMPLID = '100009'
  AND E.PAY_END_DT = DATE '2026-03-21'`
          }
        ]
      },
      {
        id: 'deductions-and-taxes',
        title: 'Deductions and taxes',
        summary: 'Tables with no EMPLID, classes that change the meaning of an amount, and the fan-out trap.',
        body: [
          "<code>PS_PAY_DEDUCTION</code> and <code>PS_PAY_TAX</code> are children of the check, keyed by the seven check columns plus their own codes. Neither has an <code>EMPLID</code>. To report deductions or taxes by person you always join to <code>PS_PAY_CHECK</code>.",
          { h: "Deduction class" },
          "One benefit can produce several rows on a check, told apart by <code>DED_CLASS</code>. B is taken before tax and A after tax, and both come out of the employee’s pay. N is a nontaxable benefit paid by the employer: it is a cost to the company and never touches net pay. Add up <code>DED_CUR</code> without a class filter and you mix the employee’s money with the employer’s.",
          { sql: "SELECT D.PLAN_TYPE, D.DEDCD, D.DED_CLASS, D.DED_CUR\nFROM PS_PAY_DEDUCTION D\nJOIN PS_PAY_CHECK C\n  ON C.COMPANY = D.COMPANY\n AND C.PAYGROUP = D.PAYGROUP\n AND C.PAY_END_DT = D.PAY_END_DT\n AND C.OFF_CYCLE = D.OFF_CYCLE\n AND C.PAGE_NUM = D.PAGE_NUM\n AND C.LINE_NUM = D.LINE_NUM\n AND C.SEPCHK = D.SEPCHK\nWHERE C.EMPLID = '100001'\n  AND C.PAY_END_DT = DATE '2026-10-31'\nORDER BY D.PLAN_TYPE, D.DED_CLASS" },
          { h: "Tax class" },
          "<code>PS_PAY_TAX</code> has a row per jurisdiction and <code>TAX_CLASS</code>. Federal rows have <code>STATE = '$U'</code>, state rows carry the state code. Class H is income tax withholding, D is the employee’s OASDI (Social Security), F is the employee’s Medicare. E and Q are the employer’s matching shares, which again are not the employee’s money.",
          { sql: "SELECT T.STATE, T.TAX_CLASS, X.XLATLONGNAME, T.TXGRS_CUR, T.TAX_CUR\nFROM PS_PAY_TAX T\nJOIN PS_PAY_CHECK C\n  ON " + CHECK_KEYS_T.replace(/T\.(\w+) = C\.\1/g, 'C.$1 = T.$1') + "\nJOIN PSXLATITEM X\n  ON X.FIELDNAME = 'TAX_CLASS'\n AND X.FIELDVALUE = T.TAX_CLASS\nWHERE C.EMPLID = '100001'\n  AND C.PAY_END_DT = DATE '2026-10-31'\nORDER BY T.STATE, T.TAX_CLASS" },
          { h: "The fan-out trap" },
          "A check has several tax rows and several deduction rows. Join both child tables to the check in one query and every tax row pairs with every deduction row: six taxes and four deductions make twenty four rows, and both sums come out several times too large. No error is raised.",
          "The cure is to <b>aggregate each child to one row per check first</b>, then join those summaries to the check. Inline views or <code>WITH</code> clauses both work, and the exercise below needs exactly that."
        ],
        exercises: [
          {
            id: 'c3-1', title: '401(k) contributions for the year',
            prompt: "Return <code>EMPLID</code>, <code>NAME</code> and total before-tax 401(k) deductions (<code>DEDCD = '401K'</code>, <code>DED_CLASS = 'B'</code>) for each employee, from checks that are not merely calculated. <code>NAME</code> is on the check.",
            hints: ["Join <code>PS_PAY_DEDUCTION</code> to <code>PS_PAY_CHECK</code> on seven key columns.", "Group by <code>C.EMPLID, C.NAME</code>."],
            solution: `SELECT C.EMPLID, C.NAME, SUM(D.DED_CUR) AS K401_YTD
FROM PS_PAY_DEDUCTION D
JOIN PS_PAY_CHECK C
  ON C.COMPANY = D.COMPANY
 AND C.PAYGROUP = D.PAYGROUP
 AND C.PAY_END_DT = D.PAY_END_DT
 AND C.OFF_CYCLE = D.OFF_CYCLE
 AND C.PAGE_NUM = D.PAGE_NUM
 AND C.LINE_NUM = D.LINE_NUM
 AND C.SEPCHK = D.SEPCHK
WHERE D.DEDCD = '401K'
  AND D.DED_CLASS = 'B'
  AND C.PAYCHECK_STATUS <> 'C'
GROUP BY C.EMPLID, C.NAME`
          },
          {
            id: 'c3-2', title: 'Federal withholding by quarter',
            prompt: "Return the calendar quarter of the <b>check date</b> and total federal income tax withheld (<code>STATE = '$U'</code>, <code>TAX_CLASS = 'H'</code>), for checks that are not merely calculated. One row per quarter.",
            hints: ["<code>TO_CHAR(C.CHECK_DT, 'Q')</code> returns the quarter as text.", "Group by the same expression you select."],
            solution: `SELECT TO_CHAR(C.CHECK_DT, 'Q') AS QTR, SUM(T.TAX_CUR) AS FEDERAL_WITHHOLDING
FROM PS_PAY_TAX T
JOIN PS_PAY_CHECK C
  ON C.COMPANY = T.COMPANY
 AND C.PAYGROUP = T.PAYGROUP
 AND C.PAY_END_DT = T.PAY_END_DT
 AND C.OFF_CYCLE = T.OFF_CYCLE
 AND C.PAGE_NUM = T.PAGE_NUM
 AND C.LINE_NUM = T.LINE_NUM
 AND C.SEPCHK = T.SEPCHK
WHERE T.STATE = '$U'
  AND T.TAX_CLASS = 'H'
  AND C.PAYCHECK_STATUS <> 'C'
GROUP BY TO_CHAR(C.CHECK_DT, 'Q')`
          },
          {
            id: 'c3-3', title: 'Gross to net from the detail',
            prompt: "For every check with <code>PAY_END_DT</code> 31 October 2026, return <code>EMPLID</code>, <code>PAYGROUP</code>, <code>TOTAL_GROSS</code>, employee taxes summed from <code>PS_PAY_TAX</code> (classes H, D and F), employee deductions summed from <code>PS_PAY_DEDUCTION</code> (classes A and B, zero when there are none) and <code>NET_PAY</code>. If your detail is right, gross minus the two sums equals net on every row.",
            hints: ["Build one summary per child table, grouped by the seven check key columns. The starter has the tax summary done.", "<code>LEFT JOIN</code> the deduction summary, because some checks have no deductions, and wrap it in <code>NVL(..., 0)</code>."],
            wrong: [{ rows: 13, msg: "Two checks have no deductions at all. Use a LEFT JOIN to the deduction summary so they stay in the result." }],
            starter: `WITH TAX AS (
  SELECT COMPANY, PAYGROUP, PAY_END_DT, OFF_CYCLE, PAGE_NUM, LINE_NUM, SEPCHK,
         SUM(TAX_CUR) AS EE_TAXES
  FROM PS_PAY_TAX
  WHERE TAX_CLASS IN ('H', 'D', 'F')
  GROUP BY COMPANY, PAYGROUP, PAY_END_DT, OFF_CYCLE, PAGE_NUM, LINE_NUM, SEPCHK
)
SELECT C.EMPLID, C.PAYGROUP, C.TOTAL_GROSS, T.EE_TAXES, C.NET_PAY
FROM PS_PAY_CHECK C
JOIN TAX T
  ON T.COMPANY = C.COMPANY
 AND T.PAYGROUP = C.PAYGROUP
 AND T.PAY_END_DT = C.PAY_END_DT
 AND T.OFF_CYCLE = C.OFF_CYCLE
 AND T.PAGE_NUM = C.PAGE_NUM
 AND T.LINE_NUM = C.LINE_NUM
 AND T.SEPCHK = C.SEPCHK
WHERE C.PAY_END_DT = DATE '2026-10-31'`,
            solution: `WITH TAX AS (
  SELECT COMPANY, PAYGROUP, PAY_END_DT, OFF_CYCLE, PAGE_NUM, LINE_NUM, SEPCHK,
         SUM(TAX_CUR) AS EE_TAXES
  FROM PS_PAY_TAX
  WHERE TAX_CLASS IN ('H', 'D', 'F')
  GROUP BY COMPANY, PAYGROUP, PAY_END_DT, OFF_CYCLE, PAGE_NUM, LINE_NUM, SEPCHK
),
DED AS (
  SELECT COMPANY, PAYGROUP, PAY_END_DT, OFF_CYCLE, PAGE_NUM, LINE_NUM, SEPCHK,
         SUM(DED_CUR) AS EE_DEDS
  FROM PS_PAY_DEDUCTION
  WHERE DED_CLASS IN ('A', 'B')
  GROUP BY COMPANY, PAYGROUP, PAY_END_DT, OFF_CYCLE, PAGE_NUM, LINE_NUM, SEPCHK
)
SELECT C.EMPLID, C.PAYGROUP, C.TOTAL_GROSS, T.EE_TAXES, NVL(D.EE_DEDS, 0) AS EE_DEDS, C.NET_PAY
FROM PS_PAY_CHECK C
JOIN TAX T
  ON T.COMPANY = C.COMPANY
 AND T.PAYGROUP = C.PAYGROUP
 AND T.PAY_END_DT = C.PAY_END_DT
 AND T.OFF_CYCLE = C.OFF_CYCLE
 AND T.PAGE_NUM = C.PAGE_NUM
 AND T.LINE_NUM = C.LINE_NUM
 AND T.SEPCHK = C.SEPCHK
LEFT JOIN DED D
  ON D.COMPANY = C.COMPANY
 AND D.PAYGROUP = C.PAYGROUP
 AND D.PAY_END_DT = C.PAY_END_DT
 AND D.OFF_CYCLE = C.OFF_CYCLE
 AND D.PAGE_NUM = C.PAGE_NUM
 AND D.LINE_NUM = C.LINE_NUM
 AND D.SEPCHK = C.SEPCHK
WHERE C.PAY_END_DT = DATE '2026-10-31'`
          }
        ]
      }
    ]
  });
});
