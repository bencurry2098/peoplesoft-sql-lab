// Table definitions for the practice database.
// Modeled on delivered PeopleSoft HCM and Payroll for North America records.
// Column lists are trimmed so the tables stay readable.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PSSchema = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Short type helpers so the column lists stay compact.
  var C = function (n) { return 'VARCHAR2(' + n + ')'; };
  var N = function (p, s) { return s ? 'NUMBER(' + p + ',' + s + ')' : 'NUMBER(' + p + ')'; };
  var D = 'DATE';

  // The seven part key shared by the paycheck and its child tables.
  var PAYKEY = [
    ['COMPANY', C(3), 'Company that issued the check'],
    ['PAYGROUP', C(3), 'Group of employees paid on the same schedule'],
    ['PAY_END_DT', D, 'Last day of the pay period'],
    ['OFF_CYCLE', C(1), 'Y for off-cycle checks, N for the regular run'],
    ['PAGE_NUM', N(4), 'Paysheet page number'],
    ['LINE_NUM', N(2), 'Paysheet line number, one employee per line']
  ];

  var tables = [
    {
      name: 'PS_PERSONAL_DATA', group: 'People',
      descr: 'One row per person. A flattened snapshot of name and address.',
      keys: ['EMPLID'],
      cols: [
        ['EMPLID', C(11), 'Employee ID. A character field, never a number'],
        ['NAME', C(50), 'Stored as Last,First'],
        ['LAST_NAME', C(30), ''],
        ['FIRST_NAME', C(30), ''],
        ['CITY', C(30), ''],
        ['STATE', C(6), '']
      ]
    },
    {
      name: 'PS_EMPLOYMENT', group: 'People',
      descr: 'One row per person and employment record. Hire and termination dates.',
      keys: ['EMPLID', 'EMPL_RCD'],
      cols: [
        ['EMPLID', C(11), ''],
        ['EMPL_RCD', N(3), 'Employment record number. 0 is the first job, 1 a concurrent job'],
        ['HIRE_DT', D, 'Original hire date'],
        ['REHIRE_DT', D, 'Null unless the person was rehired'],
        ['TERMINATION_DT', D, 'Null while the person is employed']
      ]
    },
    {
      name: 'PS_JOB', group: 'People',
      descr: 'Job history. Effective dated and effective sequenced. The center of HCM.',
      keys: ['EMPLID', 'EMPL_RCD', 'EFFDT', 'EFFSEQ'],
      cols: [
        ['EMPLID', C(11), ''],
        ['EMPL_RCD', N(3), 'Employment record number'],
        ['EFFDT', D, 'Date this row takes effect'],
        ['EFFSEQ', N(3), 'Orders several rows that share one EFFDT'],
        ['ACTION', C(3), 'What happened: HIR, PAY, PRO, XFR, LOA, RFL, TER, REH, ADL'],
        ['ACTION_REASON', C(3), 'Why it happened'],
        ['EMPL_STATUS', C(1), 'A active, L leave, T terminated. See PSXLATITEM'],
        ['HR_STATUS', C(1), 'A active or I inactive. Leave still counts as active'],
        ['BUSINESS_UNIT', C(5), ''],
        ['SETID_DEPT', C(5), 'SetID used to look up the department'],
        ['DEPTID', C(10), ''],
        ['SETID_JOBCODE', C(5), 'SetID used to look up the job code'],
        ['JOBCODE', C(6), ''],
        ['COMPANY', C(3), ''],
        ['PAYGROUP', C(3), ''],
        ['EMPL_TYPE', C(1), 'S salaried or H hourly'],
        ['STD_HOURS', N(6, 2), 'Standard hours per week'],
        ['COMP_FREQUENCY', C(5), 'A annual or H hourly'],
        ['COMPRATE', N(18, 6), 'Rate in the compensation frequency'],
        ['ANNUAL_RT', N(18, 3), ''],
        ['HOURLY_RT', N(18, 6), ''],
        ['FULL_PART_TIME', C(1), 'F or P'],
        ['REG_TEMP', C(1), 'R regular or T temporary']
      ]
    },
    {
      name: 'PS_DEPT_TBL', group: 'Setup',
      descr: 'Departments. Effective dated setup table keyed by SetID.',
      keys: ['SETID', 'DEPTID', 'EFFDT'],
      cols: [
        ['SETID', C(5), ''],
        ['DEPTID', C(10), ''],
        ['EFFDT', D, ''],
        ['EFF_STATUS', C(1), 'A active or I inactive as of this row'],
        ['DESCR', C(30), ''],
        ['DESCRSHORT', C(10), ''],
        ['MANAGER_ID', C(11), 'EMPLID of the manager, or a blank']
      ]
    },
    {
      name: 'PS_JOBCODE_TBL', group: 'Setup',
      descr: 'Job codes. Effective dated setup table keyed by SetID.',
      keys: ['SETID', 'JOBCODE', 'EFFDT'],
      cols: [
        ['SETID', C(5), ''],
        ['JOBCODE', C(6), ''],
        ['EFFDT', D, ''],
        ['EFF_STATUS', C(1), ''],
        ['DESCR', C(30), ''],
        ['DESCRSHORT', C(10), '']
      ]
    },
    {
      name: 'PS_ACTION_TBL', group: 'Setup',
      descr: 'Descriptions for the ACTION codes on PS_JOB.',
      keys: ['ACTION', 'EFFDT'],
      cols: [
        ['ACTION', C(3), ''],
        ['EFFDT', D, ''],
        ['EFF_STATUS', C(1), ''],
        ['ACTION_DESCR', C(30), '']
      ]
    },
    {
      name: 'PSXLATITEM', group: 'Setup',
      descr: 'Translate values. Descriptions for short coded fields. A PeopleTools table, so no underscore after PS.',
      keys: ['FIELDNAME', 'FIELDVALUE', 'EFFDT'],
      cols: [
        ['FIELDNAME', C(18), 'The field the code belongs to, such as EMPL_STATUS'],
        ['FIELDVALUE', C(4), 'The code itself'],
        ['EFFDT', D, ''],
        ['EFF_STATUS', C(1), ''],
        ['XLATLONGNAME', C(30), ''],
        ['XLATSHORTNAME', C(10), '']
      ]
    },
    {
      name: 'PS_PAY_CALENDAR', group: 'Payroll',
      descr: 'One row per company, pay group and pay period. Tracks how far the run has progressed.',
      keys: ['COMPANY', 'PAYGROUP', 'PAY_END_DT'],
      cols: [
        ['COMPANY', C(3), ''],
        ['PAYGROUP', C(3), ''],
        ['PAY_END_DT', D, ''],
        ['PAY_BEGIN_DT', D, ''],
        ['CHECK_DT', D, 'Date the money is paid. Taxes and balances follow this date'],
        ['RUN_ID', C(10), 'Pay run ID that ties calendars together'],
        ['PAY_SHEETS_RUN', C(1), 'Y once paysheets exist'],
        ['PAY_CALC_RUN', C(1), 'Y once pay calculation has run'],
        ['PAY_CONFIRM_RUN', C(1), 'Y once the run is confirmed and final']
      ]
    },
    {
      name: 'PS_PAY_CHECK', group: 'Payroll',
      descr: 'One row per paycheck. The header for earnings, taxes and deductions.',
      keys: ['COMPANY', 'PAYGROUP', 'PAY_END_DT', 'OFF_CYCLE', 'PAGE_NUM', 'LINE_NUM', 'SEPCHK'],
      cols: PAYKEY.concat([
        ['SEPCHK', N(1), 'Separate check number. 0 is the main check'],
        ['EMPLID', C(11), ''],
        ['EMPL_RCD', N(3), ''],
        ['NAME', C(50), ''],
        ['DEPTID', C(10), 'Department at the time of the check'],
        ['PAYCHECK_NBR', N(15), '0 until the check is confirmed'],
        ['CHECK_DT', D, ''],
        ['PAYCHECK_STATUS', C(1), 'C calculated, F confirmed, R reversed, A adjusted'],
        ['PAYCHECK_OPTION', C(1), 'A advice, C check, R check reversal'],
        ['TOTAL_GROSS', N(12, 2), ''],
        ['TOTAL_TAXES', N(12, 2), 'Employee paid taxes only'],
        ['TOTAL_DEDUCTIONS', N(12, 2), 'Employee paid deductions only'],
        ['NET_PAY', N(12, 2), '']
      ])
    },
    {
      name: 'PS_PAY_EARNINGS', group: 'Payroll',
      descr: 'Regular and overtime hours and earnings for each paysheet line.',
      keys: ['COMPANY', 'PAYGROUP', 'PAY_END_DT', 'OFF_CYCLE', 'PAGE_NUM', 'LINE_NUM', 'ADDL_NBR'],
      cols: PAYKEY.concat([
        ['ADDL_NBR', N(3), 'Additional line number. 0 is the main line'],
        ['SEPCHK', N(1), 'Which check on the line this earnings row is paid on'],
        ['EMPLID', C(11), ''],
        ['EMPL_RCD', N(3), ''],
        ['EARNS_BEGIN_DT', D, ''],
        ['EARNS_END_DT', D, ''],
        ['HOURLY_RT', N(18, 6), ''],
        ['REG_HRS', N(6, 2), 'Regular hours for hourly employees'],
        ['OT_HRS', N(6, 2), 'Overtime hours'],
        ['REG_HRLY_EARNS', N(10, 2), 'Regular earnings for hourly employees'],
        ['OT_HRLY_EARNS', N(10, 2), 'Overtime earnings'],
        ['REG_EARN_HRS', N(6, 2), 'Hours behind salaried regular earnings'],
        ['REG_EARNS', N(10, 2), 'Regular earnings for salaried employees']
      ])
    },
    {
      name: 'PS_PAY_OTH_EARNS', group: 'Payroll',
      descr: 'Other earnings such as bonuses and shift pay. Child of PS_PAY_EARNINGS. No EMPLID column.',
      keys: ['COMPANY', 'PAYGROUP', 'PAY_END_DT', 'OFF_CYCLE', 'PAGE_NUM', 'LINE_NUM', 'ADDL_NBR', 'ERNCD'],
      cols: PAYKEY.concat([
        ['ADDL_NBR', N(3), ''],
        ['ERNCD', C(3), 'Earnings code. Described in PS_EARNINGS_TBL'],
        ['OTH_HRS', N(6, 2), ''],
        ['OTH_EARNS', N(10, 2), '']
      ])
    },
    {
      name: 'PS_PAY_DEDUCTION', group: 'Payroll',
      descr: 'Deductions taken on each check. Child of PS_PAY_CHECK. No EMPLID column.',
      keys: ['COMPANY', 'PAYGROUP', 'PAY_END_DT', 'OFF_CYCLE', 'PAGE_NUM', 'LINE_NUM', 'SEPCHK', 'PLAN_TYPE', 'BENEFIT_PLAN', 'DEDCD', 'DED_CLASS'],
      cols: PAYKEY.concat([
        ['SEPCHK', N(1), ''],
        ['PLAN_TYPE', C(2), '00 general, 10 medical, 11 dental, 40 401k'],
        ['BENEFIT_PLAN', C(6), 'A blank for general deductions'],
        ['DEDCD', C(6), 'Deduction code'],
        ['DED_CLASS', C(1), 'A after tax, B before tax, N employer paid nontaxable benefit'],
        ['DED_CUR', N(10, 2), 'Amount on this check']
      ])
    },
    {
      name: 'PS_PAY_TAX', group: 'Payroll',
      descr: 'Taxes on each check. Child of PS_PAY_CHECK. No EMPLID column.',
      keys: ['COMPANY', 'PAYGROUP', 'PAY_END_DT', 'OFF_CYCLE', 'PAGE_NUM', 'LINE_NUM', 'SEPCHK', 'STATE', 'LOCALITY', 'TAX_CLASS'],
      cols: PAYKEY.concat([
        ['SEPCHK', N(1), ''],
        ['STATE', C(6), '$U means federal. Otherwise a state code'],
        ['LOCALITY', C(10), 'A blank unless it is a local tax'],
        ['TAX_CLASS', C(1), 'H withholding, D OASDI employee, F Medicare employee, E and Q employer shares'],
        ['TXGRS_CUR', N(10, 2), 'Taxable gross on this check'],
        ['TAX_CUR', N(10, 2), 'Tax on this check']
      ])
    },
    {
      name: 'PS_EARNINGS_TBL', group: 'Setup',
      descr: 'Earnings codes. Effective dated setup table.',
      keys: ['ERNCD', 'EFFDT'],
      cols: [
        ['ERNCD', C(3), ''],
        ['EFFDT', D, ''],
        ['EFF_STATUS', C(1), ''],
        ['DESCR', C(30), ''],
        ['DESCRSHORT', C(10), '']
      ]
    },
    {
      name: 'PS_DEDUCTION_TBL', group: 'Setup',
      descr: 'Deduction codes. Effective dated setup table.',
      keys: ['PLAN_TYPE', 'DEDCD', 'EFFDT'],
      cols: [
        ['PLAN_TYPE', C(2), ''],
        ['DEDCD', C(6), ''],
        ['EFFDT', D, ''],
        ['DESCR', C(30), '']
      ]
    },
    {
      name: 'PS_EARNINGS_BAL', group: 'Payroll',
      descr: 'Month, quarter and year to date earnings balances. Updated when a run is confirmed.',
      keys: ['EMPLID', 'COMPANY', 'BALANCE_ID', 'BALANCE_YEAR', 'BALANCE_QTR', 'BALANCE_PERIOD', 'EMPL_RCD', 'SPCL_BALANCE', 'ERNCD'],
      cols: [
        ['EMPLID', C(11), ''],
        ['COMPANY', C(3), ''],
        ['BALANCE_ID', C(2), 'CY for calendar year'],
        ['BALANCE_YEAR', N(4), ''],
        ['BALANCE_QTR', N(1), ''],
        ['BALANCE_PERIOD', N(2), 'Month number. A row exists only for months with activity'],
        ['EMPL_RCD', N(3), ''],
        ['SPCL_BALANCE', C(1), ''],
        ['ERNCD', C(3), ''],
        ['HRS_YTD', N(8, 2), ''],
        ['HRS_QTD', N(8, 2), ''],
        ['HRS_MTD', N(8, 2), ''],
        ['GRS_YTD', N(12, 2), ''],
        ['GRS_QTD', N(12, 2), ''],
        ['GRS_MTD', N(12, 2), '']
      ]
    }
  ];

  // True when a column type is a date.
  function isDate(type) { return type === 'DATE'; }

  // Build the CREATE TABLE statement for one table.
  // PeopleSoft makes character and number columns NOT NULL. Dates may be null.
  function ddl(t) {
    var lines = t.cols.map(function (c) {
      return '  ' + c[0] + ' ' + c[1] + (isDate(c[1]) ? '' : ' NOT NULL');
    });
    return 'CREATE TABLE ' + t.name + ' (\n' + lines.join(',\n') + '\n)';
  }

  // Build the unique key index for one table.
  function keyIndex(t) {
    var short = t.name.replace(/^PS_?/, '');
    return 'CREATE UNIQUE INDEX PSU_' + short + ' ON ' + t.name + ' (' + t.keys.join(', ') + ')';
  }

  // Find a table definition by name.
  function find(name) {
    var up = String(name).toUpperCase();
    for (var i = 0; i < tables.length; i++) if (tables[i].name === up) return tables[i];
    return null;
  }

  return { tables: tables, ddl: ddl, keyIndex: keyIndex, isDate: isDate, find: find };
});
