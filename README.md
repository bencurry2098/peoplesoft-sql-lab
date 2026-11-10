# PeopleSoft SQL Lab

A practice course for the SQL a PeopleSoft payroll developer writes every day: effective dating,
the Payroll for North America tables, window functions, reconciliation and safe data fixes.

It runs entirely in a browser. There is nothing to install and no server.

- 23 lessons, 60 exercises that check your answer against a reference result
- 16 PeopleSoft style tables with a year of biweekly payroll for a 16 person company
- An Oracle flavored SQL engine: `SYSDATE`, `TO_DATE`, `NVL`, `DECODE`, `MINUS`, `FETCH FIRST`,
  window functions, `COMMIT` and `ROLLBACK`
- A lab clock, so you can move "today" and watch future dated rows become current
- A script that loads the same data into a real Oracle database

## Run it

**Easiest:** open `index.html` in a browser. Double clicking the file works.

**Single file:** `dist/peoplesoft-sql-lab.html` is the whole lab in one file. Copy it anywhere.

**Local server, optional:**

```
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Put it on GitHub

```
git init
git add .
git commit -m "PeopleSoft SQL Lab"
git branch -M main
git remote add origin https://github.com/YOUR_USER/peoplesoft-sql-lab.git
git push -u origin main
```

To host it for free, open the repository on GitHub, go to Settings, then Pages, choose
"Deploy from a branch", pick `main` and `/ (root)`, and save. The lab appears at
`https://YOUR_USER.github.io/peoplesoft-sql-lab/` and works on a phone.

## Practice on real Oracle

`oracle/peoplesoft_lab_oracle.sql` creates the same tables and rows in a real Oracle database.
Run it in an empty practice schema in Oracle Database Free or on Oracle Live SQL.
Never run it in a real PeopleSoft database: it drops and recreates tables with PeopleSoft names.

The lab treats 2026-11-10 as today. On real Oracle `SYSDATE` is the real date, so substitute
`DATE '2026-11-10'` for `SYSDATE` to get the same answers as the lab.

This script is generated and has not been run against a live Oracle instance. If a statement
fails, please fix `tools/build.js` rather than the generated file.

## Course outline

| Module | Lessons |
| --- | --- |
| Orientation | How PeopleSoft stores data. The Oracle you will type every day. |
| Effective dating | EFFDT. PS_JOB and EFFSEQ. As of any date. Joining effective dated tables. Traps. |
| Payroll data | Pay calendar and paycheck. Earnings. Deductions and taxes. |
| Window functions | How they work. Ranking. Effective dating with ROW_NUMBER. LAG and LEAD. Running totals and frames. More analytic tools. |
| Investigation patterns | Finding what is missing. Pivots and set operators. Reconciliation. |
| Data fixes | The safe data fix routine. |
| Tickets | Five support tickets that combine everything. |
| Reference | Where this SQL shows up in PeopleTools. Lab versus real Oracle. |

## Repository layout

```
index.html            the app shell
css/style.css         styles, light and dark
js/schema.js          table definitions
js/seed.js            deterministic data generator
js/engine.js          Oracle compatibility layer and the answer checker
js/course.js          course registry
js/lessons-1.js       orientation, effective dating, payroll data
js/lessons-2.js       window functions, investigation, data fixes, tickets, reference
js/app.js             user interface
vendor/sql-asm.js     sql.js 1.14.2, SQLite compiled to JavaScript
tools/test.js         runs every example and solution
tools/build.js        rebuilds dist/ and oracle/
dist/                 generated single file version
oracle/               generated Oracle script
```

## Changing it

Lessons are plain JavaScript objects in `js/lessons-1.js` and `js/lessons-2.js`. Each exercise has a
prompt, hints and a reference solution. An answer passes when its rows match the rows the reference
solution returns, so any correct query passes.

After editing, with Node.js installed:

```
node tools/test.js      # every example and solution must run
node tools/build.js     # regenerate dist/ and oracle/
```

## What to keep in mind

- The tables are simplified. Real records have many more columns, and your site may be customized.
  Check record definitions in Application Designer.
- The payroll tables follow Payroll for North America. Global Payroll and the federal tables are
  different, though effective dating and the SQL techniques carry over.
- How reversed and adjusted checks are flagged varies. Look at a real one in your own data.
- The engine is SQLite underneath. The lesson "Lab versus real Oracle" lists every known difference.
- The practice data contains deliberate errors. Finding them is part of the course.

## License

MIT for this project. sql.js is MIT licensed, see `vendor/SQLJS-LICENSE`.
PeopleSoft and Oracle are trademarks of Oracle. This project is not affiliated with Oracle.
All people and data are invented.
