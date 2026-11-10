// Builds every row of practice data in plain JavaScript.
// The data is deterministic so results are the same on every machine.
// Dates are ISO strings here. The engine converts them when it loads the tables.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./schema.js'));
  else root.PSSeed = factory(root.PSSchema);
})(typeof self !== 'undefined' ? self : this, function (PSSchema) {
  'use strict';

  // The date the lab treats as today unless the learner changes it.
  var DEFAULT_LAB_DATE = '2026-11-10';

  // Round to cents and avoid floating point drift.
  function r2(x) { return Math.round((x + (x >= 0 ? 1e-9 : -1e-9)) * 100) / 100; }

  // Add days to an ISO date string.
  function addDays(iso, n) {
    var d = new Date(iso + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  }

  // Count Monday to Friday days between two ISO dates, inclusive.
  function weekdays(fromIso, toIso) {
    var n = 0;
    for (var d = fromIso; d <= toIso; d = addDays(d, 1)) {
      var dow = new Date(d + 'T00:00:00Z').getUTCDay();
      if (dow !== 0 && dow !== 6) n++;
    }
    return n;
  }

  function build() {
    var out = {};
    PSSchema.tables.forEach(function (t) { out[t.name] = []; });

    // Push one row given as an object. Every column must be supplied.
    function put(table, obj) {
      var def = PSSchema.find(table);
      var row = def.cols.map(function (c) {
        if (!(c[0] in obj)) throw new Error('Seed is missing ' + table + '.' + c[0]);
        return obj[c[0]];
      });
      out[table].push(row);
    }

    // People.
    var people = [
      ['100001', 'Alvarez', 'Maria', 'Reston', 'VA'],
      ['100002', 'Brooks', 'Daniel', 'Herndon', 'VA'],
      ['100003', 'Chen', 'Wei', 'Fairfax', 'VA'],
      ['100004', 'Davis', 'Latoya', 'Arlington', 'VA'],
      ['100005', 'Evans', 'Robert', 'Vienna', 'VA'],
      ['100006', 'Foster', 'Priya', 'Reston', 'VA'],
      ['100007', 'Garcia', 'Tomas', 'Chantilly', 'VA'],
      ['100008', 'Hughes', 'Emily', 'Sterling', 'VA'],
      ['100009', 'Ito', 'Kenji', 'McLean', 'VA'],
      ['100010', 'Jones', 'Aisha', 'Manassas', 'VA'],
      ['100011', 'Kim', 'Sung', 'Centreville', 'VA'],
      ['100012', 'Lopez', 'Carmen', 'Alexandria', 'VA'],
      ['100013', 'Miller', 'Grace', 'Leesburg', 'VA'],
      ['100014', 'Nguyen', 'Bao', 'Ashburn', 'VA'],
      ['100015', 'Owens', 'Patrick', 'Oakton', 'VA'],
      ['100016', 'Patel', 'Nisha', 'Herndon', 'VA']
    ];
    var nameOf = {};
    people.forEach(function (p) {
      nameOf[p[0]] = p[1] + ',' + p[2];
      put('PS_PERSONAL_DATA', { EMPLID: p[0], NAME: p[1] + ',' + p[2], LAST_NAME: p[1], FIRST_NAME: p[2], CITY: p[3], STATE: p[4] });
    });

    // Employment rows: emplid, rcd, hire, rehire, termination.
    [
      ['100001', 0, '2019-06-03', null, null],
      ['100002', 0, '2020-03-16', null, null],
      ['100003', 0, '2018-09-10', null, '2026-06-27'],
      ['100004', 0, '2021-02-15', null, null],
      ['100005', 0, '2017-05-01', null, null],
      ['100005', 1, '2025-09-01', null, null],
      ['100006', 0, '2022-04-04', '2026-02-08', null],
      ['100007', 0, '2020-10-05', null, null],
      ['100008', 0, '2026-08-17', null, null],
      ['100009', 0, '2015-01-12', null, null],
      ['100010', 0, '2023-06-12', null, null],
      ['100011', 0, '2024-11-04', null, null],
      ['100012', 0, '2027-01-04', null, null],
      ['100013', 0, '2016-08-01', null, null],
      ['100014', 0, '2023-09-18', null, null],
      ['100015', 0, '2014-03-03', null, null],
      ['100016', 0, '2025-05-19', null, null]
    ].forEach(function (e) {
      put('PS_EMPLOYMENT', { EMPLID: e[0], EMPL_RCD: e[1], HIRE_DT: e[2], REHIRE_DT: e[3], TERMINATION_DT: e[4] });
    });

    // Job history. Kept as objects so the payroll generator can read them.
    var jobs = [];
    // Arguments: emplid, rcd, effdt, effseq, action, reason, status, dept, jobcode, paygroup, type, weekly hours, rate.
    // The rate is annual for salaried rows and hourly for hourly rows.
    function job(emplid, rcd, effdt, effseq, action, reason, status, dept, jobcode, pg, type, std, rate) {
      var annual = type === 'S' ? rate : r2(rate * 2080 * (std / 40));
      var hourly = type === 'S' ? Math.round(rate / 2080 * 1e6) / 1e6 : rate;
      jobs.push({
        EMPLID: emplid, EMPL_RCD: rcd, EFFDT: effdt, EFFSEQ: effseq, ACTION: action, ACTION_REASON: reason,
        EMPL_STATUS: status, HR_STATUS: status === 'T' ? 'I' : 'A', BUSINESS_UNIT: 'GBIBU',
        SETID_DEPT: 'SHARE', DEPTID: dept, SETID_JOBCODE: 'SHARE', JOBCODE: jobcode,
        COMPANY: 'GBI', PAYGROUP: pg, EMPL_TYPE: type, STD_HOURS: std,
        COMP_FREQUENCY: type === 'S' ? 'A' : 'H', COMPRATE: rate, ANNUAL_RT: annual, HOURLY_RT: hourly,
        FULL_PART_TIME: std >= 30 ? 'F' : 'P', REG_TEMP: 'R'
      });
    }

    // Alvarez: steady raises, a promotion, and a future dated raise.
    job('100001', 0, '2019-06-03', 0, 'HIR', 'NHR', 'A', '10100', 'PAY001', 'BW1', 'S', 40, 62000);
    job('100001', 0, '2021-01-01', 0, 'PAY', 'MER', 'A', '10100', 'PAY001', 'BW1', 'S', 40, 65100);
    job('100001', 0, '2023-01-01', 0, 'PAY', 'MER', 'A', '10100', 'PAY001', 'BW1', 'S', 40, 68400);
    job('100001', 0, '2024-07-01', 0, 'PRO', 'PRM', 'A', '10100', 'PAY002', 'BW1', 'S', 40, 76000);
    job('100001', 0, '2026-01-01', 0, 'PAY', 'MER', 'A', '10100', 'PAY002', 'BW1', 'S', 40, 79800);
    job('100001', 0, '2027-01-01', 0, 'PAY', 'MER', 'A', '10100', 'PAY002', 'BW1', 'S', 40, 83000);
    // Brooks: hourly, and two rows on the same day in 2026.
    job('100002', 0, '2020-03-16', 0, 'HIR', 'NHR', 'A', '10500', 'FLD001', 'BW2', 'H', 40, 24.5);
    job('100002', 0, '2022-03-01', 0, 'PAY', 'MER', 'A', '10500', 'FLD001', 'BW2', 'H', 40, 26);
    job('100002', 0, '2024-03-01', 0, 'PAY', 'MER', 'A', '10500', 'FLD001', 'BW2', 'H', 40, 27.5);
    job('100002', 0, '2026-03-01', 0, 'XFR', 'REO', 'A', '10300', 'ITD003', 'BW2', 'H', 40, 27.5);
    job('100002', 0, '2026-03-01', 1, 'PAY', 'ADJ', 'A', '10300', 'ITD003', 'BW2', 'H', 40, 29.75);
    // Chen: terminated in the middle of 2026.
    job('100003', 0, '2018-09-10', 0, 'HIR', 'NHR', 'A', '10400', 'FIN001', 'BW1', 'S', 40, 58000);
    job('100003', 0, '2022-01-01', 0, 'PAY', 'MER', 'A', '10400', 'FIN001', 'BW1', 'S', 40, 63000);
    job('100003', 0, '2025-01-01', 0, 'PAY', 'MER', 'A', '10400', 'FIN001', 'BW1', 'S', 40, 66500);
    job('100003', 0, '2026-06-28', 0, 'TER', 'RES', 'T', '10400', 'FIN001', 'BW1', 'S', 40, 66500);
    // Davis: unpaid leave and a return from leave.
    job('100004', 0, '2021-02-15', 0, 'HIR', 'NHR', 'A', '10200', 'HRG001', 'BW1', 'S', 40, 61000);
    job('100004', 0, '2023-07-01', 0, 'PAY', 'MER', 'A', '10200', 'HRG001', 'BW1', 'S', 40, 64000);
    job('100004', 0, '2026-04-05', 0, 'LOA', 'FML', 'L', '10200', 'HRG001', 'BW1', 'S', 40, 64000);
    job('100004', 0, '2026-07-12', 0, 'RFL', 'RFL', 'A', '10200', 'HRG001', 'BW1', 'S', 40, 64000);
    // Evans: two concurrent jobs.
    job('100005', 0, '2017-05-01', 0, 'HIR', 'NHR', 'A', '10300', 'ITD001', 'BW1', 'S', 40, 82000);
    job('100005', 0, '2022-01-01', 0, 'PRO', 'PRM', 'A', '10300', 'ITD002', 'BW1', 'S', 40, 95000);
    job('100005', 0, '2025-01-01', 0, 'PAY', 'MER', 'A', '10300', 'ITD002', 'BW1', 'S', 40, 99000);
    job('100005', 1, '2025-09-01', 0, 'ADL', 'ADL', 'A', '10200', 'TRN001', 'BW2', 'H', 8, 35);
    // Foster: terminated in 2024 and rehired in 2026.
    job('100006', 0, '2022-04-04', 0, 'HIR', 'NHR', 'A', '10100', 'PAY001', 'BW1', 'S', 40, 59000);
    job('100006', 0, '2024-08-31', 0, 'TER', 'RES', 'T', '10100', 'PAY001', 'BW1', 'S', 40, 59000);
    job('100006', 0, '2026-02-08', 0, 'REH', 'REH', 'A', '10100', 'PAY001', 'BW1', 'S', 40, 64000);
    // Garcia: department transfer and then a raise.
    job('100007', 0, '2020-10-05', 0, 'HIR', 'NHR', 'A', '10400', 'FIN001', 'BW1', 'S', 40, 57000);
    job('100007', 0, '2023-01-01', 0, 'PAY', 'MER', 'A', '10400', 'FIN001', 'BW1', 'S', 40, 60500);
    job('100007', 0, '2026-05-03', 0, 'XFR', 'REO', 'A', '10100', 'PAY001', 'BW1', 'S', 40, 60500);
    job('100007', 0, '2026-09-06', 0, 'PAY', 'MER', 'A', '10100', 'PAY001', 'BW1', 'S', 40, 64000);
    // Hughes: hired in the middle of a pay period.
    job('100008', 0, '2026-08-17', 0, 'HIR', 'NHR', 'A', '10300', 'ITD003', 'BW2', 'H', 40, 23);
    // Ito: long history ending as a manager.
    job('100009', 0, '2015-01-12', 0, 'HIR', 'NHR', 'A', '10400', 'FIN001', 'BW1', 'S', 40, 70000);
    job('100009', 0, '2018-01-01', 0, 'PRO', 'PRM', 'A', '10100', 'MGR001', 'BW1', 'S', 40, 98000);
    job('100009', 0, '2021-01-01', 0, 'PAY', 'MER', 'A', '10100', 'MGR001', 'BW1', 'S', 40, 105000);
    job('100009', 0, '2024-01-01', 0, 'PAY', 'MER', 'A', '10100', 'MGR001', 'BW1', 'S', 40, 112000);
    job('100009', 0, '2026-01-01', 0, 'PAY', 'MER', 'A', '10100', 'MGR001', 'BW1', 'S', 40, 118000);
    // Jones: hourly, moved out of Field Services when it closed.
    job('100010', 0, '2023-06-12', 0, 'HIR', 'NHR', 'A', '10500', 'FLD001', 'BW2', 'H', 40, 22);
    job('100010', 0, '2025-06-01', 0, 'PAY', 'MER', 'A', '10500', 'FLD001', 'BW2', 'H', 40, 23.5);
    job('100010', 0, '2026-07-01', 0, 'XFR', 'REO', 'A', '10300', 'ITD003', 'BW2', 'H', 40, 23.5);
    // Kim: still sits in Field Services after it was inactivated. This is planted bad data.
    job('100011', 0, '2024-11-04', 0, 'HIR', 'NHR', 'A', '10500', 'FLD001', 'BW2', 'H', 40, 21);
    job('100011', 0, '2025-11-01', 0, 'PAY', 'MER', 'A', '10500', 'FLD001', 'BW2', 'H', 40, 22.25);
    // Lopez: a future hire. Her only row is not effective yet.
    job('100012', 0, '2027-01-04', 0, 'HIR', 'NHR', 'A', '10200', 'HRG001', 'BW1', 'S', 40, 60000);
    // Miller, Nguyen, Owens, Patel: steady salaried histories.
    job('100013', 0, '2016-08-01', 0, 'HIR', 'NHR', 'A', '10200', 'HRG001', 'BW1', 'S', 40, 60000);
    job('100013', 0, '2020-01-01', 0, 'PRO', 'PRM', 'A', '10200', 'MGR001', 'BW1', 'S', 40, 90000);
    job('100013', 0, '2023-01-01', 0, 'PAY', 'MER', 'A', '10200', 'MGR001', 'BW1', 'S', 40, 96000);
    job('100013', 0, '2026-01-01', 0, 'PAY', 'MER', 'A', '10200', 'MGR001', 'BW1', 'S', 40, 101000);
    job('100014', 0, '2023-09-18', 0, 'HIR', 'NHR', 'A', '10300', 'ITD001', 'BW1', 'S', 40, 78000);
    job('100014', 0, '2025-01-01', 0, 'PAY', 'MER', 'A', '10300', 'ITD001', 'BW1', 'S', 40, 81500);
    job('100014', 0, '2026-01-01', 0, 'PAY', 'MER', 'A', '10300', 'ITD001', 'BW1', 'S', 40, 84000);
    job('100015', 0, '2014-03-03', 0, 'HIR', 'NHR', 'A', '10400', 'FIN001', 'BW1', 'S', 40, 55000);
    job('100015', 0, '2019-01-01', 0, 'PRO', 'PRM', 'A', '10400', 'FIN002', 'BW1', 'S', 40, 72000);
    job('100015', 0, '2023-01-01', 0, 'PAY', 'MER', 'A', '10400', 'FIN002', 'BW1', 'S', 40, 78000);
    job('100015', 0, '2026-01-01', 0, 'PAY', 'MER', 'A', '10400', 'FIN002', 'BW1', 'S', 40, 81000);
    job('100016', 0, '2025-05-19', 0, 'HIR', 'NHR', 'A', '10400', 'FIN001', 'BW1', 'S', 40, 58500);
    job('100016', 0, '2026-05-17', 0, 'PAY', 'MER', 'A', '10400', 'FIN001', 'BW1', 'S', 40, 60500);
    jobs.forEach(function (j) { put('PS_JOB', j); });

    // Departments. Note the renames, the inactivation and the future dated row.
    [
      ['10100', '1990-01-01', 'A', 'Payroll Operations', 'Payroll', '100009'],
      ['10200', '1990-01-01', 'A', 'Personnel', 'Personnel', ' '],
      ['10200', '2015-07-01', 'A', 'Human Resources', 'HR', '100013'],
      ['10300', '1990-01-01', 'A', 'Data Processing', 'Data Proc', ' '],
      ['10300', '2024-01-01', 'A', 'Information Technology', 'IT', '100005'],
      ['10400', '1990-01-01', 'A', 'Finance', 'Finance', '100015'],
      ['10500', '1990-01-01', 'A', 'Field Services', 'Field Svc', ' '],
      ['10500', '2026-07-01', 'I', 'Field Services', 'Field Svc', ' '],
      ['10600', '2027-01-01', 'A', 'Analytics', 'Analytics', ' ']
    ].forEach(function (d) {
      put('PS_DEPT_TBL', { SETID: 'SHARE', DEPTID: d[0], EFFDT: d[1], EFF_STATUS: d[2], DESCR: d[3], DESCRSHORT: d[4], MANAGER_ID: d[5] });
    });

    // Job codes.
    [
      ['PAY001', '1990-01-01', 'Payroll Analyst', 'Pay Anlst'],
      ['PAY002', '1990-01-01', 'Senior Payroll Analyst', 'Sr Pay An'],
      ['HRG001', '1990-01-01', 'HR Generalist', 'HR Gen'],
      ['ITD001', '1990-01-01', 'Programmer', 'Programmer'],
      ['ITD001', '2019-01-01', 'Software Developer', 'Developer'],
      ['ITD002', '1990-01-01', 'Senior Software Developer', 'Sr Dev'],
      ['ITD003', '1990-01-01', 'IT Support Technician', 'IT Supp'],
      ['FIN001', '1990-01-01', 'Accountant', 'Acct'],
      ['FIN002', '1990-01-01', 'Senior Accountant', 'Sr Acct'],
      ['FLD001', '1990-01-01', 'Field Technician', 'Field Tech'],
      ['MGR001', '1990-01-01', 'Manager', 'Manager'],
      ['TRN001', '1990-01-01', 'Trainer', 'Trainer']
    ].forEach(function (j) {
      put('PS_JOBCODE_TBL', { SETID: 'SHARE', JOBCODE: j[0], EFFDT: j[1], EFF_STATUS: 'A', DESCR: j[2], DESCRSHORT: j[3] });
    });

    // Action descriptions.
    [
      ['HIR', 'Hire'], ['REH', 'Rehire'], ['PAY', 'Pay Rate Change'], ['PRO', 'Promotion'], ['XFR', 'Transfer'],
      ['LOA', 'Leave of Absence'], ['RFL', 'Return from Leave'], ['TER', 'Termination'], ['ADL', 'Additional Job'], ['DTA', 'Data Change']
    ].forEach(function (a) {
      put('PS_ACTION_TBL', { ACTION: a[0], EFFDT: '1900-01-01', EFF_STATUS: 'A', ACTION_DESCR: a[1] });
    });

    // Translate values.
    [
      ['EMPL_STATUS', 'A', 'Active', 'Active'], ['EMPL_STATUS', 'L', 'Leave of Absence', 'Leave'],
      ['EMPL_STATUS', 'P', 'Leave With Pay', 'Paid Leave'], ['EMPL_STATUS', 'T', 'Terminated', 'Terminated'],
      ['EMPL_STATUS', 'R', 'Retired', 'Retired'], ['EMPL_STATUS', 'S', 'Suspended', 'Suspended'],
      ['EMPL_TYPE', 'S', 'Salaried', 'Salaried'], ['EMPL_TYPE', 'H', 'Hourly', 'Hourly'],
      ['FULL_PART_TIME', 'F', 'Full-Time', 'Full-Time'], ['FULL_PART_TIME', 'P', 'Part-Time', 'Part-Time'],
      ['PAYCHECK_STATUS', 'C', 'Calculated', 'Calculated'], ['PAYCHECK_STATUS', 'F', 'Confirmed', 'Confirmed'],
      ['PAYCHECK_STATUS', 'R', 'Reversed', 'Reversed'], ['PAYCHECK_STATUS', 'A', 'Adjusted', 'Adjusted'],
      ['PAYCHECK_OPTION', 'A', 'Advice', 'Advice'], ['PAYCHECK_OPTION', 'C', 'Check', 'Check'],
      ['PAYCHECK_OPTION', 'R', 'Check Reversal', 'Reversal'],
      ['DED_CLASS', 'A', 'After-Tax', 'After-Tax'], ['DED_CLASS', 'B', 'Before-Tax', 'Before-Tax'],
      ['DED_CLASS', 'N', 'Nontaxable Benefit', 'Nontax Ben'], ['DED_CLASS', 'T', 'Taxable Benefit', 'Tax Ben'],
      ['TAX_CLASS', 'H', 'Withholding', 'Withhold'], ['TAX_CLASS', 'D', 'OASDI/EE', 'OASDI/EE'],
      ['TAX_CLASS', 'E', 'OASDI/ER', 'OASDI/ER'], ['TAX_CLASS', 'F', 'Medicare/EE', 'Med/EE'],
      ['TAX_CLASS', 'Q', 'Medicare/ER', 'Med/ER'], ['TAX_CLASS', 'U', 'Unemployment ER', 'Unempl ER']
    ].forEach(function (x) {
      put('PSXLATITEM', { FIELDNAME: x[0], FIELDVALUE: x[1], EFFDT: '1900-01-01', EFF_STATUS: 'A', XLATLONGNAME: x[2], XLATSHORTNAME: x[3] });
    });

    // Earnings codes. XTR is deliberately missing so one paycheck row is an orphan.
    [
      ['REG', '1990-01-01', 'A', 'Regular', 'Regular'],
      ['OTP', '1990-01-01', 'A', 'Overtime', 'Overtime'],
      ['BON', '1990-01-01', 'A', 'Bonus', 'Bonus'],
      ['AWD', '1990-01-01', 'A', 'Spot Award', 'Award'],
      ['SHF', '1990-01-01', 'A', 'Shift Premium', 'Shift Prm'],
      ['SHF', '2025-01-01', 'A', 'Shift Differential', 'Shift Dif'],
      ['CMP', '1990-01-01', 'A', 'Comp Time Payout', 'Comp Time'],
      ['CMP', '2024-01-01', 'I', 'Comp Time Payout', 'Comp Time']
    ].forEach(function (e) {
      put('PS_EARNINGS_TBL', { ERNCD: e[0], EFFDT: e[1], EFF_STATUS: e[2], DESCR: e[3], DESCRSHORT: e[4] });
    });

    // Deduction codes.
    [
      ['10', 'MEDIC', 'Medical'], ['11', 'DENTAL', 'Dental'], ['40', '401K', '401(k) Savings'],
      ['00', 'UNWAY', 'United Way'], ['00', 'GARN', 'Garnishment'], ['00', 'PARK', 'Parking']
    ].forEach(function (d) {
      put('PS_DEDUCTION_TBL', { PLAN_TYPE: d[0], DEDCD: d[1], EFFDT: '1990-01-01', DESCR: d[2] });
    });

    // Find the job row in effect on a date. This is effective dating in plain code.
    function jobAsOf(emplid, rcd, date) {
      var best = null;
      jobs.forEach(function (j) {
        if (j.EMPLID !== emplid || j.EMPL_RCD !== rcd || j.EFFDT > date) return;
        if (!best || j.EFFDT > best.EFFDT || (j.EFFDT === best.EFFDT && j.EFFSEQ > best.EFFSEQ)) best = j;
      });
      return best;
    }

    // Benefit and deduction elections per employee and employment record.
    var elections = {
      '100001|0': { med: 'PPO', dental: true, k401: 0.06, gen: [['UNWAY', 10]] },
      '100002|0': { med: 'HMO', dental: false, k401: 0.03, gen: [['GARN', 150]] },
      '100003|0': { med: 'PPO', dental: true, k401: 0.05, gen: [] },
      '100004|0': { med: 'HMO', dental: true, k401: 0.04, gen: [] },
      '100005|0': { med: 'PPO', dental: true, k401: 0.10, gen: [] },
      '100006|0': { med: 'HMO', dental: false, k401: 0, gen: [] },
      '100007|0': { med: 'PPO', dental: false, k401: 0.05, gen: [] },
      '100009|0': { med: 'PPO', dental: true, k401: 0.12, gen: [['PARK', 22]] },
      '100010|0': { med: 'HMO', dental: false, k401: 0.02, gen: [] },
      '100011|0': { med: 'HMO', dental: false, k401: 0, gen: [] },
      '100013|0': { med: 'PPO', dental: true, k401: 0.08, gen: [['UNWAY', 25]] },
      '100014|0': { med: 'PPO', dental: false, k401: 0.06, gen: [] },
      '100015|0': { med: 'HMO', dental: true, k401: 0.07, gen: [['PARK', 22]] },
      '100016|0': { med: 'HMO', dental: true, k401: 0.04, gen: [] }
    };
    var MED = { PPO: { plan: 'MEDPPO', ee: 142.5, er: 410 }, HMO: { plan: 'MEDHMO', ee: 96, er: 365 } };

    // Running totals used to build the balance table at the end.
    var balances = {};
    function addBalance(emplid, rcd, erncd, checkDt, hrs, grs) {
      if (!hrs && !grs) return;
      var key = emplid + '|' + rcd + '|' + erncd;
      var month = parseInt(checkDt.slice(5, 7), 10);
      balances[key] = balances[key] || {};
      balances[key][month] = balances[key][month] || { hrs: 0, grs: 0 };
      balances[key][month].hrs = r2(balances[key][month].hrs + hrs);
      balances[key][month].grs = r2(balances[key][month].grs + grs);
    }

    var checkNbr = 100000;

    // Write one paycheck with its earnings, taxes and deductions.
    // A sign of -1 writes the mirror image used for a reversal.
    function emitCheck(c) {
      var s = c.sign || 1;
      var j = c.job;
      var key = { COMPANY: 'GBI', PAYGROUP: c.pg, PAY_END_DT: c.end, OFF_CYCLE: c.offCycle || 'N', PAGE_NUM: c.page, LINE_NUM: c.line };
      function withKey(extra) {
        var o = {};
        Object.keys(key).forEach(function (k) { o[k] = key[k]; });
        Object.keys(extra).forEach(function (k) { o[k] = extra[k]; });
        return o;
      }
      var e = c.earn;
      var oth = c.oth || [];
      var othTotal = oth.reduce(function (a, o) { return r2(a + o[2]); }, 0);
      var gross = r2(e.regEarns + e.regHrly + e.otHrly + othTotal);

      put('PS_PAY_EARNINGS', withKey({
        ADDL_NBR: c.addl || 0, SEPCHK: c.sepchk || 0, EMPLID: j.EMPLID, EMPL_RCD: j.EMPL_RCD,
        EARNS_BEGIN_DT: c.earnsBegin, EARNS_END_DT: c.end, HOURLY_RT: j.HOURLY_RT,
        REG_HRS: s * e.regHrs, OT_HRS: s * e.otHrs, REG_HRLY_EARNS: s * e.regHrly, OT_HRLY_EARNS: s * e.otHrly,
        REG_EARN_HRS: s * e.regEarnHrs, REG_EARNS: s * e.regEarns
      }));
      oth.forEach(function (o) {
        put('PS_PAY_OTH_EARNS', withKey({ ADDL_NBR: c.addl || 0, ERNCD: o[0], OTH_HRS: s * o[1], OTH_EARNS: s * o[2] }));
      });

      // Deductions apply to the main check only, and only when there is enough pay.
      var deds = [];
      var el = (c.sepchk || gross < 600) ? null : elections[j.EMPLID + '|' + j.EMPL_RCD];
      var sec125 = 0, k401 = 0;
      if (el) {
        if (el.med) {
          deds.push(['10', MED[el.med].plan, 'MEDIC', 'B', MED[el.med].ee]);
          deds.push(['10', MED[el.med].plan, 'MEDIC', 'N', MED[el.med].er]);
          sec125 += MED[el.med].ee;
        }
        if (el.dental) { deds.push(['11', 'DENTAL', 'DENTAL', 'B', 18.75]); sec125 += 18.75; }
        if (el.k401) { k401 = r2(gross * el.k401); deds.push(['40', 'K401', '401K', 'B', k401]); }
        el.gen.forEach(function (g) { deds.push(['00', ' ', g[0], 'A', g[1]]); });
      }
      var totalDeds = 0;
      deds.forEach(function (d) {
        if (d[3] !== 'N') totalDeds = r2(totalDeds + d[4]);
        put('PS_PAY_DEDUCTION', withKey({ SEPCHK: c.sepchk || 0, PLAN_TYPE: d[0], BENEFIT_PLAN: d[1], DEDCD: d[2], DED_CLASS: d[3], DED_CUR: s * d[4] }));
      });

      // Taxes. Medical and dental reduce every taxable gross. 401k reduces income tax only.
      var ficaGross = r2(gross - sec125);
      var fedGross = r2(gross - sec125 - k401);
      var fwtRate = c.sepchk ? 0.22 : (j.ANNUAL_RT < 60000 ? 0.10 : (j.ANNUAL_RT < 90000 ? 0.13 : 0.17));
      var fwt = r2(fedGross * fwtRate), oasdi = r2(ficaGross * 0.062), medi = r2(ficaGross * 0.0145), st = r2(fedGross * 0.045);
      [
        ['$U', 'H', fedGross, fwt], ['$U', 'D', ficaGross, oasdi], ['$U', 'F', ficaGross, medi],
        ['$U', 'E', ficaGross, oasdi], ['$U', 'Q', ficaGross, medi], ['VA', 'H', fedGross, st]
      ].forEach(function (t) {
        put('PS_PAY_TAX', withKey({ SEPCHK: c.sepchk || 0, STATE: t[0], LOCALITY: ' ', TAX_CLASS: t[1], TXGRS_CUR: s * t[2], TAX_CUR: s * t[3] }));
      });
      var totalTaxes = r2(fwt + oasdi + medi + st);
      var net = r2(gross - totalTaxes - totalDeds);

      var confirmed = c.status !== 'C';
      var nbr = 0;
      if (confirmed) nbr = c.reuseNbr || ++checkNbr;
      put('PS_PAY_CHECK', withKey({
        SEPCHK: c.sepchk || 0, EMPLID: j.EMPLID, EMPL_RCD: j.EMPL_RCD, NAME: nameOf[j.EMPLID], DEPTID: j.DEPTID,
        PAYCHECK_NBR: nbr, CHECK_DT: c.checkDt, PAYCHECK_STATUS: c.status, PAYCHECK_OPTION: c.option,
        TOTAL_GROSS: r2(s * gross + (c.headerBump || 0)), TOTAL_TAXES: s * totalTaxes, TOTAL_DEDUCTIONS: s * totalDeds,
        NET_PAY: r2(s * net + (c.headerBump || 0))
      }));

      // Confirmed activity feeds the balances by check date.
      if (confirmed) {
        addBalance(j.EMPLID, j.EMPL_RCD, 'REG', c.checkDt, s * (e.regHrs + e.regEarnHrs), s * (e.regHrly + e.regEarns));
        addBalance(j.EMPLID, j.EMPL_RCD, 'OTP', c.checkDt, s * e.otHrs, s * e.otHrly);
        oth.forEach(function (o) { addBalance(j.EMPLID, j.EMPL_RCD, o[0], c.checkDt, s * o[1], s * o[2]); });
      }
      return nbr;
    }

    // Overtime hours follow a fixed pattern so the data never changes.
    var OT_PATTERN = [0, 4, 2, 6, 0, 8, 3, 0, 5, 2];
    function overtime(emplid, rcd, idx) {
      if (rcd !== 0) return 0;
      return OT_PATTERN[(idx * 3 + parseInt(emplid.slice(-2), 10)) % 10];
    }

    // One time bonuses paid in the period ending 2026-03-21.
    var BONUS = { '100013': 4000, '100001': 1500, '100015': 1500, '100005': 2500, '100014': 1000 };

    // Every person and employment record that can be paid.
    var payees = [];
    jobs.forEach(function (j) {
      var k = j.EMPLID + '|' + j.EMPL_RCD;
      if (payees.indexOf(k) < 0) payees.push(k);
    });
    payees.sort();

    // Pay periods: 26 biweekly periods in 2026 for each pay group.
    var LAST_CONFIRMED = '2026-10-31';
    var IN_PROGRESS = '2026-11-14';
    var idx = 0;
    for (var end = '2026-01-10'; end <= '2026-12-26'; end = addDays(end, 14)) {
      idx++;
      var begin = addDays(end, -13);
      var checkDt = addDays(end, 6);
      var confirmed = end <= LAST_CONFIRMED;
      var calculated = confirmed || end === IN_PROGRESS;
      ['BW1', 'BW2'].forEach(function (pg) {
        put('PS_PAY_CALENDAR', {
          COMPANY: 'GBI', PAYGROUP: pg, PAY_END_DT: end, PAY_BEGIN_DT: begin, CHECK_DT: checkDt,
          RUN_ID: 'B26' + (idx < 10 ? '0' : '') + idx,
          PAY_SHEETS_RUN: calculated ? 'Y' : 'N', PAY_CALC_RUN: calculated ? 'Y' : 'N', PAY_CONFIRM_RUN: confirmed ? 'Y' : 'N'
        });
        if (!calculated) return;

        var lineIdx = 0;
        payees.forEach(function (k) {
          var emplid = k.split('|')[0], rcd = parseInt(k.split('|')[1], 10);
          var j = jobAsOf(emplid, rcd, end);
          if (!j || j.EMPL_STATUS !== 'A' || j.PAYGROUP !== pg) return;
          // Planted problem: Patel has no check for the period ending 2026-10-03.
          if (emplid === '100016' && end === '2026-10-03') return;

          // Prorate the first period after a hire, rehire or added job.
          var frac = 1, earnsBegin = begin;
          jobs.forEach(function (h) {
            if (h.EMPLID === emplid && h.EMPL_RCD === rcd && ['HIR', 'REH', 'ADL'].indexOf(h.ACTION) >= 0 && h.EFFDT > begin && h.EFFDT <= end) {
              frac = weekdays(h.EFFDT, end) / 10;
              earnsBegin = h.EFFDT;
            }
          });

          var earn = { regHrs: 0, otHrs: 0, regHrly: 0, otHrly: 0, regEarnHrs: 0, regEarns: 0 };
          var oth = [];
          if (j.EMPL_TYPE === 'S') {
            earn.regEarnHrs = r2(j.STD_HOURS * 2 * frac);
            earn.regEarns = r2(j.ANNUAL_RT / 26 * frac);
            if (end === '2026-03-21' && BONUS[emplid]) oth.push(['BON', 0, BONUS[emplid]]);
            if (emplid === '100016' && end === '2026-08-22') oth.push(['AWD', 0, 250]);
          } else {
            earn.regHrs = r2(j.STD_HOURS * 2 * frac);
            earn.otHrs = overtime(emplid, rcd, idx);
            // Planted problem: Jones was paid 20 overtime hours instead of 2 in this period.
            if (emplid === '100010' && end === '2026-05-16') earn.otHrs = 20;
            earn.regHrly = r2(earn.regHrs * j.HOURLY_RT);
            earn.otHrly = r2(earn.otHrs * j.HOURLY_RT * 1.5);
            if (emplid === '100002') oth.push(['SHF', 20, 30]);
            if (emplid === '100010' && idx % 2 === 0) oth.push(['SHF', 12, 18]);
            // Planted problem: an earnings code that does not exist in PS_EARNINGS_TBL.
            if (emplid === '100011' && end === '2026-09-19') oth.push(['XTR', 0, 75]);
          }

          var page = Math.floor(lineIdx / 8) + 1, line = (lineIdx % 8) + 1;
          lineIdx++;
          var option = (emplid === '100011' || emplid === '100008') ? 'C' : 'A';
          var base = {
            pg: pg, end: end, page: page, line: line, job: j, earnsBegin: earnsBegin, checkDt: checkDt,
            status: confirmed ? 'F' : 'C', option: option, earn: earn, oth: oth
          };

          // Planted problem: this header was bumped by 100 so it no longer matches its detail.
          if (emplid === '100014' && end === '2026-08-08') base.headerBump = 100;

          // The Jones overpayment is reversed and reissued off cycle.
          if (emplid === '100010' && end === '2026-05-16') {
            base.status = 'R';
            var nbr = emitCheck(base);
            emitCheck({
              pg: pg, end: end, offCycle: 'Y', page: 1, line: 1, job: j, earnsBegin: earnsBegin, checkDt: '2026-05-27',
              status: 'F', option: 'R', earn: earn, oth: oth, sign: -1, reuseNbr: nbr
            });
            var fixed = { regHrs: earn.regHrs, otHrs: 2, regHrly: earn.regHrly, otHrly: r2(2 * j.HOURLY_RT * 1.5), regEarnHrs: 0, regEarns: 0 };
            emitCheck({
              pg: pg, end: end, offCycle: 'Y', page: 1, line: 2, job: j, earnsBegin: earnsBegin, checkDt: '2026-05-27',
              status: 'F', option: 'A', earn: fixed, oth: oth
            });
            return;
          }

          emitCheck(base);

          // Ito receives his bonus on a separate check in the same line.
          if (emplid === '100009' && end === '2026-03-21') {
            emitCheck({
              pg: pg, end: end, page: page, line: line, sepchk: 1, addl: 1, job: j, earnsBegin: earnsBegin, checkDt: checkDt,
              status: 'F', option: option,
              earn: { regHrs: 0, otHrs: 0, regHrly: 0, otHrly: 0, regEarnHrs: 0, regEarns: 0 }, oth: [['BON', 0, 5000]]
            });
          }
        });
      });
    }

    // Turn the monthly activity into balance rows with running totals.
    Object.keys(balances).sort().forEach(function (key) {
      var parts = key.split('|');
      var ytdH = 0, ytdG = 0, qtdH = 0, qtdG = 0, lastQtr = 0;
      Object.keys(balances[key]).map(Number).sort(function (a, b) { return a - b; }).forEach(function (month) {
        var m = balances[key][month];
        var qtr = Math.ceil(month / 3);
        if (qtr !== lastQtr) { qtdH = 0; qtdG = 0; lastQtr = qtr; }
        ytdH = r2(ytdH + m.hrs); ytdG = r2(ytdG + m.grs);
        qtdH = r2(qtdH + m.hrs); qtdG = r2(qtdG + m.grs);
        // Planted problem: the Owens regular balance is short by 500 from September on.
        var short = (parts[0] === '100015' && parts[2] === 'REG' && month >= 9) ? 500 : 0;
        var shortQ = (short && month === 9) ? 500 : 0;
        put('PS_EARNINGS_BAL', {
          EMPLID: parts[0], COMPANY: 'GBI', BALANCE_ID: 'CY', BALANCE_YEAR: 2026, BALANCE_QTR: qtr, BALANCE_PERIOD: month,
          EMPL_RCD: parseInt(parts[1], 10), SPCL_BALANCE: 'N', ERNCD: parts[2],
          HRS_YTD: ytdH, HRS_QTD: qtdH, HRS_MTD: m.hrs,
          GRS_YTD: r2(ytdG - short), GRS_QTD: r2(qtdG - shortQ), GRS_MTD: r2(m.grs - shortQ)
        });
      });
    });

    return out;
  }

  return { build: build, DEFAULT_LAB_DATE: DEFAULT_LAB_DATE };
});
