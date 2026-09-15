(() => {
  "use strict";

  /* =========================================================
     STRETCH MY CHECK
     RECURRING FINANCES
     PART 1 — STATE + HELPERS + RECURRENCE ENGINE
  ========================================================= */

  const sb =
    window.supabaseClient;

  if (!sb) {
    console.error(
      "Stretch My Check Recurring Finances: Supabase client is unavailable."
    );

    return;
  }

  /* =========================================================
     STATE
  ========================================================= */

  let recurringIncome =
    [];

  let recurringExpenses =
    [];

  let editingItem =
    null;

  let editingKind =
    null;

  let initialized =
    false;

  /* =========================================================
     MONEY HELPERS
  ========================================================= */

  function money(value) {
    const number =
      parseFloat(value);

    return Number.isFinite(number)
      ? number
      : 0;
  }

  function roundMoney(value) {
    return (
      Math.round(
        (
          money(value) +
          Number.EPSILON
        ) *
          100
      ) /
      100
    );
  }

  function currency(value) {
    return new Intl.NumberFormat(
      "en-US",
      {
        style:
          "currency",

        currency:
          "USD"
      }
    ).format(
      money(value)
    );
  }

  /* =========================================================
     TEXT HELPERS
  ========================================================= */

  function esc(value) {
    return String(
      value ?? ""
    )
      .replace(
        /&/g,
        "&amp;"
      )
      .replace(
        /</g,
        "&lt;"
      )
      .replace(
        />/g,
        "&gt;"
      )
      .replace(
        /"/g,
        "&quot;"
      )
      .replace(
        /'/g,
        "&#039;"
      );
  }

  function plural(
    count,
    singular,
    pluralForm = null
  ) {
    return count === 1
      ? singular
      : (
          pluralForm ||
          `${singular}s`
        );
  }

  /* =========================================================
     USER
  ========================================================= */

  async function currentUser() {
    const {
      data,
      error
    } =
      await sb.auth
        .getUser();

    if (error) {
      console.error(
        "Recurring Finances user lookup failed:",
        error
      );

      return null;
    }

    return (
      data?.user ||
      null
    );
  }

  /* =========================================================
     LOCAL DATE HELPERS

     We deliberately work with local calendar dates instead of
     UTC timestamps because these are bill/paycheck dates.
  ========================================================= */

  function todayLocal() {
    const now =
      new Date();

    return new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
  }

  function dateOnly(value) {
    if (!value) {
      return null;
    }

    if (
      value instanceof
      Date
    ) {
      return new Date(
        value.getFullYear(),
        value.getMonth(),
        value.getDate()
      );
    }

    const match =
      String(value)
        .match(
          /^(\d{4})-(\d{2})-(\d{2})$/
        );

    if (match) {
      return new Date(
        Number(match[1]),
        Number(match[2]) - 1,
        Number(match[3])
      );
    }

    const parsed =
      new Date(value);

    if (
      Number.isNaN(
        parsed.getTime()
      )
    ) {
      return null;
    }

    return new Date(
      parsed.getFullYear(),
      parsed.getMonth(),
      parsed.getDate()
    );
  }

  function dateKey(value) {
    const date =
      dateOnly(value);

    if (!date) {
      return "";
    }

    const year =
      date.getFullYear();

    const month =
      String(
        date.getMonth() +
          1
      ).padStart(
        2,
        "0"
      );

    const day =
      String(
        date.getDate()
      ).padStart(
        2,
        "0"
      );

    return `${year}-${month}-${day}`;
  }

  function formatDate(value) {
    const date =
      dateOnly(value);

    if (!date) {
      return "Not set";
    }

    return date.toLocaleDateString(
      "en-US",
      {
        month:
          "short",

        day:
          "numeric",

        year:
          "numeric"
      }
    );
  }

  function formatShortDate(value) {
    const date =
      dateOnly(value);

    if (!date) {
      return "Not set";
    }

    return date.toLocaleDateString(
      "en-US",
      {
        month:
          "short",

        day:
          "numeric"
      }
    );
  }

  function compareDates(
    a,
    b
  ) {
    const first =
      dateOnly(a);

    const second =
      dateOnly(b);

    if (
      !first ||
      !second
    ) {
      return 0;
    }

    return (
      first.getTime() -
      second.getTime()
    );
  }

  function addDays(
    value,
    days
  ) {
    const date =
      dateOnly(value);

    if (!date) {
      return null;
    }

    const result =
      new Date(date);

    result.setDate(
      result.getDate() +
        days
    );

    return result;
  }

  /* =========================================================
     MONTH HELPERS
  ========================================================= */

  function daysInMonth(
    year,
    monthIndex
  ) {
    return new Date(
      year,
      monthIndex + 1,
      0
    ).getDate();
  }

  function safeMonthDate(
    year,
    monthIndex,
    requestedDay
  ) {
    const maximum =
      daysInMonth(
        year,
        monthIndex
      );

    const safeDay =
      Math.min(
        Math.max(
          Number(
            requestedDay
          ) || 1,
          1
        ),
        maximum
      );

    return new Date(
      year,
      monthIndex,
      safeDay
    );
  }

  function addMonthsSafe(
    value,
    count,
    requestedDay = null
  ) {
    const date =
      dateOnly(value);

    if (!date) {
      return null;
    }

    const target =
      new Date(
        date.getFullYear(),
        date.getMonth() +
          count,
        1
      );

    const day =
      requestedDay ??
      date.getDate();

    return safeMonthDate(
      target.getFullYear(),
      target.getMonth(),
      day
    );
  }

  /* =========================================================
     FREQUENCY LABELS
  ========================================================= */

  function frequencyLabel(
    frequency
  ) {
    const labels = {
      weekly:
        "Weekly",

      biweekly:
        "Every 2 Weeks",

      semimonthly:
        "Twice Monthly",

      monthly:
        "Monthly"
    };

    return (
      labels[
        frequency
      ] ||
      frequency ||
      "Recurring"
    );
  }

  function priorityLabel(
    priority
  ) {
    const labels = {
      essential:
        "Essential",

      important:
        "Important",

      lower:
        "Lower Priority"
    };

    return (
      labels[
        priority
      ] ||
      "Essential"
    );
  }

  function expenseTypeLabel(
    type
  ) {
    return type ===
      "flexible"
      ? "Flexible"
      : "Fixed";
  }

  /* =========================================================
     SEMI-MONTHLY DATE GENERATOR

     Example:
       first_day  = 11
       second_day = 25

     For days such as 31:
       February -> Feb 28/29
       April    -> Apr 30
  ========================================================= */

  function semiMonthlyDatesForMonth(
    year,
    monthIndex,
    firstDay,
    secondDay
  ) {
    const days =
      [
        Number(firstDay),
        Number(secondDay)
      ]
        .filter(
          day =>
            Number.isFinite(day) &&
            day >= 1 &&
            day <= 31
        )
        .sort(
          (
            a,
            b
          ) =>
            a - b
        );

    const results =
      days.map(
        day =>
          safeMonthDate(
            year,
            monthIndex,
            day
          )
      );

    /*
      If two requested dates collapse onto the same final day
      of a short month, keep only one calendar occurrence.
    */

    const unique =
      new Map();

    results.forEach(
      date => {
        unique.set(
          dateKey(date),
          date
        );
      }
    );

    return [
      ...unique.values()
    ].sort(
      (
        a,
        b
      ) =>
        a.getTime() -
        b.getTime()
    );
  }

  /* =========================================================
     MONTHLY DATE GENERATOR
  ========================================================= */

  function monthlyDates(
    dueDay,
    startDate,
    endDate
  ) {
    const start =
      dateOnly(startDate);

    const end =
      dateOnly(endDate);

    if (
      !start ||
      !end ||
      !dueDay
    ) {
      return [];
    }

    const dates =
      [];

    let cursor =
      new Date(
        start.getFullYear(),
        start.getMonth(),
        1
      );

    const lastMonth =
      new Date(
        end.getFullYear(),
        end.getMonth(),
        1
      );

    while (
      cursor <=
      lastMonth
    ) {
      const occurrence =
        safeMonthDate(
          cursor.getFullYear(),
          cursor.getMonth(),
          dueDay
        );

      if (
        occurrence >=
          start &&
        occurrence <=
          end
      ) {
        dates.push(
          occurrence
        );
      }

      cursor =
        new Date(
          cursor.getFullYear(),
          cursor.getMonth() +
            1,
          1
        );
    }

    return dates;
  }

  /* =========================================================
     SEMI-MONTHLY RANGE GENERATOR
  ========================================================= */

  function semiMonthlyDates(
    firstDay,
    secondDay,
    startDate,
    endDate
  ) {
    const start =
      dateOnly(startDate);

    const end =
      dateOnly(endDate);

    if (
      !start ||
      !end
    ) {
      return [];
    }

    const dates =
      [];

    let cursor =
      new Date(
        start.getFullYear(),
        start.getMonth(),
        1
      );

    const lastMonth =
      new Date(
        end.getFullYear(),
        end.getMonth(),
        1
      );

    while (
      cursor <=
      lastMonth
    ) {
      const monthDates =
        semiMonthlyDatesForMonth(
          cursor.getFullYear(),
          cursor.getMonth(),
          firstDay,
          secondDay
        );

      monthDates.forEach(
        occurrence => {
          if (
            occurrence >=
              start &&
            occurrence <=
              end
          ) {
            dates.push(
              occurrence
            );
          }
        }
      );

      cursor =
        new Date(
          cursor.getFullYear(),
          cursor.getMonth() +
            1,
          1
        );
    }

    return dates.sort(
      (
        a,
        b
      ) =>
        a.getTime() -
        b.getTime()
    );
  }

  /* =========================================================
     WEEKLY / BIWEEKLY RANGE GENERATOR
  ========================================================= */

  function intervalDates(
    anchorDate,
    intervalDays,
    startDate,
    endDate
  ) {
    const anchor =
      dateOnly(
        anchorDate
      );

    const start =
      dateOnly(
        startDate
      );

    const end =
      dateOnly(
        endDate
      );

    if (
      !anchor ||
      !start ||
      !end
    ) {
      return [];
    }

    const interval =
      Math.max(
        1,
        Number(
          intervalDays
        ) || 1
      );

    let cursor =
      new Date(
        anchor
      );

    /*
      Move forward when anchor is before our requested range.
    */

    if (
      cursor <
      start
    ) {
      const difference =
        start.getTime() -
        cursor.getTime();

      const dayDifference =
        Math.floor(
          difference /
          86400000
        );

      const jumps =
        Math.floor(
          dayDifference /
          interval
        );

      cursor =
        addDays(
          cursor,
          jumps *
            interval
        );

      while (
        cursor <
        start
      ) {
        cursor =
          addDays(
            cursor,
            interval
          );
      }
    }

    /*
      If the saved anchor happens to be after the requested
      start, we simply begin from that anchor.
    */

    const dates =
      [];

    while (
      cursor &&
      cursor <=
        end
    ) {
      if (
        cursor >=
        start
      ) {
        dates.push(
          new Date(
            cursor
          )
        );
      }

      cursor =
        addDays(
          cursor,
          interval
        );
    }

    return dates;
  }

  /* =========================================================
     GENERAL INCOME OCCURRENCES
  ========================================================= */

  function incomeOccurrences(
    item,
    startDate,
    endDate
  ) {
    if (
      !item ||
      item.active ===
        false
    ) {
      return [];
    }

    const frequency =
      item.frequency;

    if (
      frequency ===
      "weekly"
    ) {
      return intervalDates(
        item.next_date,
        7,
        startDate,
        endDate
      );
    }

    if (
      frequency ===
      "biweekly"
    ) {
      return intervalDates(
        item.next_date,
        14,
        startDate,
        endDate
      );
    }

    if (
      frequency ===
      "monthly"
    ) {
      const anchor =
        dateOnly(
          item.next_date
        );

      if (!anchor) {
        return [];
      }

      return monthlyDates(
        anchor.getDate(),
        startDate,
        endDate
      );
    }

    if (
      frequency ===
      "semimonthly"
    ) {
      return semiMonthlyDates(
        item.first_day,
        item.second_day,
        startDate,
        endDate
      );
    }

    return [];
  }

  /* =========================================================
     GENERAL EXPENSE OCCURRENCES
  ========================================================= */

  function expenseOccurrences(
    item,
    startDate,
    endDate
  ) {
    if (
      !item ||
      item.active ===
        false
    ) {
      return [];
    }

    const frequency =
      item.frequency;

    if (
      frequency ===
      "weekly"
    ) {
      return intervalDates(
        item.next_date,
        7,
        startDate,
        endDate
      );
    }

    if (
      frequency ===
      "biweekly"
    ) {
      return intervalDates(
        item.next_date,
        14,
        startDate,
        endDate
      );
    }

    if (
      frequency ===
      "monthly"
    ) {
      return monthlyDates(
        item.due_day,
        startDate,
        endDate
      );
    }

    if (
      frequency ===
      "semimonthly"
    ) {
      return semiMonthlyDates(
        item.due_day,
        item.second_due_day,
        startDate,
        endDate
      );
    }

    return [];
  }

  /* =========================================================
     NEXT OCCURRENCE
  ========================================================= */

  function nextIncomeOccurrence(
    item,
    fromDate =
      todayLocal()
  ) {
    const start =
      dateOnly(
        fromDate
      );

    const end =
      addMonthsSafe(
        start,
        18
      );

    return (
      incomeOccurrences(
        item,
        start,
        end
      )[0] ||
      null
    );
  }

  function nextExpenseOccurrence(
    item,
    fromDate =
      todayLocal()
  ) {
    const start =
      dateOnly(
        fromDate
      );

    const end =
      addMonthsSafe(
        start,
        18
      );

    return (
      expenseOccurrences(
        item,
        start,
        end
      )[0] ||
      null
    );
  }

  /* =========================================================
     UPCOMING OCCURRENCE COLLECTION
  ========================================================= */

  function upcomingOccurrences(
    startDate =
      todayLocal(),
    monthsAhead =
      3
  ) {
    const start =
      dateOnly(
        startDate
      );

    const end =
      addMonthsSafe(
        start,
        monthsAhead
      );

    const occurrences =
      [];

    recurringIncome
      .filter(
        item =>
          item.active !==
          false
      )
      .forEach(
        item => {
          incomeOccurrences(
            item,
            start,
            end
          ).forEach(
            date => {
              occurrences.push({
                kind:
                  "income",

                sourceId:
                  item.id,

                name:
                  item.income_name,

                amount:
                  roundMoney(
                    item.amount
                  ),

                frequency:
                  item.frequency,

                date,

                dateKey:
                  dateKey(
                    date
                  ),

                source:
                  item
              });
            }
          );
        }
      );

    recurringExpenses
      .filter(
        item =>
          item.active !==
          false
      )
      .forEach(
        item => {
          expenseOccurrences(
            item,
            start,
            end
          ).forEach(
            date => {
              occurrences.push({
                kind:
                  "expense",

                sourceId:
                  item.id,

                name:
                  item.expense_name,

                amount:
                  roundMoney(
                    item.amount
                  ),

                frequency:
                  item.frequency,

                expenseType:
                  item.expense_type,

                priority:
                  item.priority,

                date,

                dateKey:
                  dateKey(
                    date
                  ),

                source:
                  item
              });
            }
          );
        }
      );

    occurrences.sort(
      (
        a,
        b
      ) => {
        const difference =
          compareDates(
            a.date,
            b.date
          );

        if (
          difference !==
          0
        ) {
          return difference;
        }

        /*
          Income appears before expenses on the same day.
        */

        if (
          a.kind !==
          b.kind
        ) {
          return a.kind ===
            "income"
            ? -1
            : 1;
        }

        return String(
          a.name
        ).localeCompare(
          String(
            b.name
          )
        );
      }
    );

    return occurrences;
  }

  /* =========================================================
     APPROXIMATE MONTHLY TOTALS
  ========================================================= */

  function monthlyMultiplier(
    frequency
  ) {
    switch (
      frequency
    ) {
      case "weekly":
        return (
          52 /
          12
        );

      case "biweekly":
        return (
          26 /
          12
        );

      case "semimonthly":
        return 2;

      case "monthly":
      default:
        return 1;
    }
  }

  function estimatedMonthlyIncome() {
    return roundMoney(
      recurringIncome
        .filter(
          item =>
            item.active !==
            false
        )
        .reduce(
          (
            total,
            item
          ) =>
            total +
            (
              money(
                item.amount
              ) *
              monthlyMultiplier(
                item.frequency
              )
            ),
          0
        )
    );
  }

  function estimatedMonthlyExpenses() {
    return roundMoney(
      recurringExpenses
        .filter(
          item =>
            item.active !==
            false
        )
        .reduce(
          (
            total,
            item
          ) =>
            total +
            (
              money(
                item.amount
              ) *
              monthlyMultiplier(
                item.frequency
              )
            ),
          0
        )
    );
  }

  function estimatedMonthlyRoom() {
    return roundMoney(
      estimatedMonthlyIncome() -
      estimatedMonthlyExpenses()
    );
  }

  /* =========================================================
     ACTIVE COUNTS
  ========================================================= */

  function activeIncomeCount() {
    return recurringIncome
      .filter(
        item =>
          item.active !==
          false
      )
      .length;
  }

  function activeExpenseCount() {
    return recurringExpenses
      .filter(
        item =>
          item.active !==
          false
      )
      .length;
  }
    /* =========================================================
     PAGE / MODAL REFERENCES
  ========================================================= */

  let recurringPage =
    null;

  let recurringApp =
    null;

  let recurringModal =
    null;

  let recurringModalTitle =
    null;

  let recurringModalBody =
    null;

  let recurringMessage =
    null;

  /* =========================================================
     STYLES
  ========================================================= */

  function installStyles() {
    const STYLE_ID =
      "smcRecurringStylesV1";

    if (
      document.getElementById(
        STYLE_ID
      )
    ) {
      return;
    }

    const style =
      document.createElement(
        "style"
      );

    style.id =
      STYLE_ID;

    style.textContent = `

      /* =====================================================
         RECURRING PAGE
      ===================================================== */

      #smcRecurringPage {
        padding-bottom: 48px;
      }

      #smcRecurringApp {
        display: grid;
        gap: 24px;
      }

      .smc-recurring-summary {
        display: grid;
        grid-template-columns:
          repeat(
            4,
            minmax(0, 1fr)
          );
        gap: 16px;
      }

      .smc-recurring-summary-card {
        min-width: 0;
        padding: 19px;
        border: 1px solid
          rgba(116, 170, 190, .17);
        border-radius: 16px;
        background:
          linear-gradient(
            145deg,
            #10232d,
            #0c1a22
          );
      }

      .smc-recurring-summary-label {
        margin-bottom: 8px;
        color: #9db5bf;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: .055em;
        text-transform: uppercase;
      }

      .smc-recurring-summary-value {
        color: #ffffff;
        font-size: 24px;
        font-weight: 850;
        line-height: 1.15;
      }

      .smc-recurring-summary-value.good {
        color: #58e2bf;
      }

      .smc-recurring-summary-value.tight {
        color: #f4c86b;
      }

      .smc-recurring-summary-value.negative {
        color: #ff8c8c;
      }

      .smc-recurring-summary-note {
        margin-top: 7px;
        color: #96adb7;
        font-size: 11px;
        line-height: 1.5;
      }

      /* =====================================================
         MAIN WORKSPACE
      ===================================================== */

      .smc-recurring-workspace {
        display: grid;
        grid-template-columns:
          minmax(0, 1fr)
          minmax(0, 1fr);
        gap: 22px;
        align-items: start;
      }

      .smc-recurring-section {
        min-width: 0;
        overflow: hidden;
        border: 1px solid
          rgba(116, 170, 190, .17);
        border-radius: 18px;
        background:
          linear-gradient(
            145deg,
            #10232d,
            #0c1a22
          );
      }

      .smc-recurring-section-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 14px;
        padding: 20px;
        border-bottom: 1px solid
          rgba(116, 170, 190, .13);
      }

      .smc-recurring-section-heading {
        min-width: 0;
      }

      .smc-recurring-section-heading h2 {
        margin: 0;
        color: #ffffff;
        font-size: 19px;
        line-height: 1.2;
      }

      .smc-recurring-section-heading p {
        margin: 6px 0 0;
        color: #9db2bb;
        font-size: 12px;
        line-height: 1.55;
      }

      .smc-recurring-add-button {
        flex: 0 0 auto;
        min-height: 41px;
        padding: 9px 15px;
        border: 1px solid
          rgba(69, 225, 192, .30);
        border-radius: 999px;
        background:
          rgba(33, 128, 113, .15);
        color: #65e7c8;
        font-size: 12px;
        font-weight: 850;
        cursor: pointer;
        transition:
          background .15s ease,
          border-color .15s ease,
          transform .15s ease;
      }

      .smc-recurring-add-button:hover {
        background:
          rgba(33, 128, 113, .25);
        border-color:
          rgba(69, 225, 192, .50);
        transform:
          translateY(-1px);
      }

      .smc-recurring-list {
        display: grid;
        gap: 14px;
        padding: 18px;
      }

      /* =====================================================
         RECURRING ITEM CARDS
      ===================================================== */

      .smc-recurring-card {
        min-width: 0;
        padding: 17px;
        border: 1px solid
          rgba(116, 170, 190, .15);
        border-radius: 15px;
        background: #0b1c25;
      }

      .smc-recurring-card.paused {
        opacity: .68;
      }

      .smc-recurring-card-top {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
      }

      .smc-recurring-card-main {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        min-width: 0;
      }

      .smc-recurring-icon {
        display: grid;
        place-items: center;
        flex: 0 0 auto;
        width: 42px;
        height: 42px;
        border: 1px solid
          rgba(69, 225, 192, .20);
        border-radius: 13px;
        background:
          rgba(69, 225, 192, .08);
        font-size: 20px;
      }

      .smc-recurring-card-title-wrap {
        min-width: 0;
      }

      .smc-recurring-card-title {
        overflow: hidden;
        color: #ffffff;
        font-size: 15px;
        font-weight: 850;
        line-height: 1.3;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .smc-recurring-card-frequency {
        margin-top: 4px;
        color: #91abb5;
        font-size: 11px;
        line-height: 1.4;
      }

      .smc-recurring-status {
        flex: 0 0 auto;
        padding: 5px 8px;
        border: 1px solid
          rgba(69, 225, 192, .23);
        border-radius: 999px;
        background:
          rgba(69, 225, 192, .08);
        color: #62e3c3;
        font-size: 10px;
        font-weight: 850;
        letter-spacing: .035em;
        text-transform: uppercase;
      }

      .smc-recurring-status.paused {
        border-color:
          rgba(180, 196, 204, .18);
        background:
          rgba(180, 196, 204, .06);
        color: #a9bbc2;
      }

      .smc-recurring-amount {
        margin-top: 17px;
        color: #ffffff;
        font-size: 23px;
        font-weight: 850;
        line-height: 1.1;
      }

      .smc-recurring-amount.income {
        color: #5be1bf;
      }

      .smc-recurring-amount-label {
        margin-top: 4px;
        color: #8fa8b2;
        font-size: 10px;
        font-weight: 750;
        letter-spacing: .04em;
        text-transform: uppercase;
      }

      .smc-recurring-card-details {
        display: grid;
        grid-template-columns:
          repeat(
            2,
            minmax(0, 1fr)
          );
        gap: 10px;
        margin-top: 16px;
      }

      .smc-recurring-detail {
        min-width: 0;
        padding: 10px 11px;
        border: 1px solid
          rgba(116, 170, 190, .12);
        border-radius: 11px;
        background: #091820;
      }

      .smc-recurring-detail-label {
        color: #8fa7b1;
        font-size: 10px;
        font-weight: 750;
        letter-spacing: .035em;
        text-transform: uppercase;
      }

      .smc-recurring-detail-value {
        margin-top: 5px;
        overflow: hidden;
        color: #f5f8f9;
        font-size: 12px;
        font-weight: 750;
        line-height: 1.4;
        text-overflow: ellipsis;
      }

      .smc-recurring-card-actions {
        display: grid;
        grid-template-columns:
          1fr 1fr;
        gap: 9px;
        margin-top: 15px;
      }

      .smc-recurring-card-button {
        min-height: 39px;
        padding: 8px 11px;
        border: 1px solid
          rgba(116, 170, 190, .20);
        border-radius: 11px;
        background: #102630;
        color: #f3f7f8;
        font-size: 12px;
        font-weight: 800;
        cursor: pointer;
      }

      .smc-recurring-card-button:hover {
        border-color:
          rgba(69, 225, 192, .35);
      }

      .smc-recurring-card-button.pause {
        color: #b8cad1;
      }

      /* =====================================================
         EMPTY STATES
      ===================================================== */

      .smc-recurring-empty {
        padding: 36px 20px;
        text-align: center;
        border: 1px dashed
          rgba(116, 170, 190, .18);
        border-radius: 14px;
        background:
          rgba(5, 18, 24, .24);
      }

      .smc-recurring-empty-icon {
        font-size: 27px;
      }

      .smc-recurring-empty h3 {
        margin: 12px 0 6px;
        color: #ffffff;
        font-size: 16px;
      }

      .smc-recurring-empty p {
        max-width: 390px;
        margin: 0 auto;
        color: #9db2bb;
        font-size: 12px;
        line-height: 1.6;
      }

      .smc-recurring-empty button {
        margin-top: 16px;
      }

      /* =====================================================
         UPCOMING PREVIEW
      ===================================================== */

      .smc-recurring-preview {
        overflow: hidden;
        border: 1px solid
          rgba(116, 170, 190, .17);
        border-radius: 18px;
        background:
          linear-gradient(
            145deg,
            #10232d,
            #0c1a22
          );
      }

      .smc-recurring-preview-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 15px;
        padding: 20px;
        border-bottom: 1px solid
          rgba(116, 170, 190, .13);
      }

      .smc-recurring-preview-header h2 {
        margin: 0;
        color: #ffffff;
        font-size: 19px;
      }

      .smc-recurring-preview-header p {
        margin: 6px 0 0;
        color: #9db2bb;
        font-size: 12px;
        line-height: 1.55;
      }

      .smc-recurring-preview-window {
        flex: 0 0 auto;
        padding: 7px 10px;
        border: 1px solid
          rgba(69, 225, 192, .20);
        border-radius: 999px;
        background:
          rgba(69, 225, 192, .07);
        color: #65e7c8;
        font-size: 10px;
        font-weight: 800;
        text-transform: uppercase;
      }

      .smc-recurring-timeline {
        display: grid;
        gap: 10px;
        padding: 18px;
      }

      .smc-recurring-event {
        display: grid;
        grid-template-columns:
          95px
          minmax(0, 1fr)
          auto;
        gap: 13px;
        align-items: center;
        padding: 12px 13px;
        border: 1px solid
          rgba(116, 170, 190, .12);
        border-radius: 12px;
        background: #091a22;
      }

      .smc-recurring-event-date {
        color: #a6bac2;
        font-size: 11px;
        font-weight: 750;
      }

      .smc-recurring-event-main {
        min-width: 0;
      }

      .smc-recurring-event-name {
        overflow: hidden;
        color: #ffffff;
        font-size: 12px;
        font-weight: 800;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .smc-recurring-event-type {
        margin-top: 3px;
        color: #8fa8b2;
        font-size: 10px;
      }

      .smc-recurring-event-amount {
        color: #ffffff;
        font-size: 13px;
        font-weight: 850;
        white-space: nowrap;
      }

      .smc-recurring-event-amount.income {
        color: #5be1bf;
      }

      .smc-recurring-event-amount.expense {
        color: #f1c17b;
      }

      /* =====================================================
         SIGNED OUT
      ===================================================== */

      .smc-recurring-signed-out {
        padding: 30px;
        border: 1px solid
          rgba(116, 170, 190, .17);
        border-radius: 18px;
        background:
          linear-gradient(
            145deg,
            #10232d,
            #0c1a22
          );
        text-align: center;
      }

      .smc-recurring-signed-out h2 {
        margin: 0 0 8px;
        color: #ffffff;
        font-size: 20px;
      }

      .smc-recurring-signed-out p {
        margin: 0;
        color: #9eb3bc;
        font-size: 12px;
        line-height: 1.6;
      }

      /* =====================================================
         MODAL
      ===================================================== */

      .smc-recurring-modal-backdrop {
        position: fixed;
        inset: 0;
        z-index: 99999;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 22px;
        overflow-y: auto;
        background:
          rgba(2, 9, 13, .78);
        backdrop-filter:
          blur(5px);
      }

      .smc-recurring-modal-backdrop.open {
        display: flex;
      }

      .smc-recurring-modal {
        width: min(
          620px,
          100%
        );
        max-height:
          calc(100vh - 44px);
        overflow-y: auto;
        border: 1px solid
          rgba(116, 170, 190, .22);
        border-radius: 19px;
        background: #0d2029;
        box-shadow:
          0 24px 80px
          rgba(0, 0, 0, .45);
      }

      .smc-recurring-modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 15px;
        padding: 19px 20px;
        border-bottom: 1px solid
          rgba(116, 170, 190, .14);
      }

      .smc-recurring-modal-header h2 {
        margin: 0;
        color: #ffffff;
        font-size: 19px;
      }

      .smc-recurring-modal-close {
        display: grid;
        place-items: center;
        width: 37px;
        height: 37px;
        border: 1px solid
          rgba(116, 170, 190, .18);
        border-radius: 11px;
        background: #102630;
        color: #d8e3e7;
        font-size: 19px;
        cursor: pointer;
      }

      .smc-recurring-modal-body {
        display: grid;
        gap: 15px;
        padding: 20px;
      }

      .smc-recurring-field {
        display: grid;
        gap: 7px;
      }

      .smc-recurring-field label {
        color: #b9cad0 !important;
        font-size: 12px !important;
        font-weight: 750;
      }

      .smc-recurring-field input,
      .smc-recurring-field select,
      .smc-recurring-field textarea {
        width: 100%;
        box-sizing: border-box;
        min-height: 43px;
        padding: 10px 12px;
        border: 1px solid
          rgba(116, 170, 190, .20);
        border-radius: 11px;
        outline: none;
        background: #081820;
        color: #f4f8f9;
        font-size: 14px !important;
      }

      .smc-recurring-field textarea {
        min-height: 86px;
        resize: vertical;
      }

      .smc-recurring-field input:focus,
      .smc-recurring-field select:focus,
      .smc-recurring-field textarea:focus {
        border-color:
          rgba(69, 225, 192, .55);
        box-shadow:
          0 0 0 3px
          rgba(69, 225, 192, .07);
      }

      .smc-recurring-field-note {
        color: #8fa8b2;
        font-size: 11px;
        line-height: 1.5;
      }

      .smc-recurring-grid-2 {
        display: grid;
        grid-template-columns:
          repeat(
            2,
            minmax(0, 1fr)
          );
        gap: 13px;
      }

      .smc-recurring-schedule-fields {
        display: grid;
        gap: 13px;
      }

      .smc-recurring-message {
        display: none;
        padding: 11px 12px;
        border: 1px solid
          rgba(255, 135, 135, .24);
        border-radius: 10px;
        background:
          rgba(255, 110, 110, .07);
        color: #ffb0b0;
        font-size: 12px;
        line-height: 1.5;
      }

      .smc-recurring-message.show {
        display: block;
      }

      .smc-recurring-modal-actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 9px;
        padding-top: 5px;
      }

      .smc-recurring-modal-actions button {
        min-height: 41px;
        padding: 9px 14px;
        border-radius: 11px;
        font-size: 12px;
        font-weight: 850;
        cursor: pointer;
      }

      .smc-recurring-save {
        border: 1px solid
          rgba(69, 225, 192, .35);
        background: #1a8f79;
        color: #ffffff;
      }

      .smc-recurring-cancel {
        border: 1px solid
          rgba(116, 170, 190, .20);
        background: #102630;
        color: #dce6e9;
      }

      .smc-recurring-delete {
        margin-right: auto;
        border: 1px solid
          rgba(255, 116, 116, .24);
        background:
          rgba(255, 100, 100, .07);
        color: #ff9d9d;
      }

      /* =====================================================
         RESPONSIVE
      ===================================================== */

      @media (
        max-width: 1100px
      ) {

        .smc-recurring-summary {
          grid-template-columns:
            repeat(
              2,
              minmax(0, 1fr)
            );
        }

        .smc-recurring-workspace {
          grid-template-columns:
            1fr;
        }

      }

      @media (
        max-width: 720px
      ) {

        #smcRecurringApp {
          gap: 18px;
        }

        .smc-recurring-summary {
          grid-template-columns:
            1fr;
          gap: 12px;
        }

        .smc-recurring-section-header,
        .smc-recurring-preview-header {
          flex-direction: column;
          align-items: stretch;
        }

        .smc-recurring-add-button {
          width: 100%;
        }

        .smc-recurring-card-details {
          grid-template-columns:
            1fr;
        }

        .smc-recurring-event {
          grid-template-columns:
            1fr auto;
        }

        .smc-recurring-event-date {
          grid-column:
            1 / -1;
        }

        .smc-recurring-grid-2 {
          grid-template-columns:
            1fr;
        }

        .smc-recurring-modal-actions {
          flex-direction: column;
          align-items: stretch;
        }

        .smc-recurring-modal-actions button {
          width: 100%;
        }

        .smc-recurring-delete {
          margin-right: 0;
        }

      }

    `;

    document.head
      .appendChild(
        style
      );
  }

  /* =========================================================
     FIND APP CONTENT AREA
  ========================================================= */

  function appContentArea() {
    return (
      document.querySelector(
        "#smcAppShell .smc-main-content"
      ) ||
      document.querySelector(
        "#smcAppShell main"
      ) ||
      document.getElementById(
        "smcAppContent"
      )
    );
  }

  /* =========================================================
     BUILD PAGE
  ========================================================= */

  function buildPage() {
    installStyles();

    if (
      document.getElementById(
        "smcRecurringPage"
      )
    ) {
      recurringPage =
        document.getElementById(
          "smcRecurringPage"
        );

      recurringApp =
        document.getElementById(
          "smcRecurringApp"
        );

      return true;
    }

    const content =
      appContentArea();

    if (!content) {
      return false;
    }

    recurringPage =
      document.createElement(
        "section"
      );

    recurringPage.id =
      "smcRecurringPage";

    recurringPage.className =
      "smc-page";

    recurringPage.style.display =
      "none";

    recurringPage.innerHTML = `
      <div
        class="smc-page-heading"
      >
        <h1>
          Recurring Finances
        </h1>

        <p>
          Set up the money that repeats so you don't have to rebuild your budget every payday.
        </p>
      </div>

      <div
        id="smcRecurringSignedOut"
        class="smc-recurring-signed-out"
        style="display:none;"
      >
        <h2>
          Sign in to use Recurring Finances
        </h2>

        <p>
          Your recurring paychecks and bills are saved securely to your account.
        </p>
      </div>

      <div
        id="smcRecurringApp"
      >

        <div
          id="smcRecurringSummary"
          class="smc-recurring-summary"
        ></div>

        <div
          class="smc-recurring-workspace"
        >

          <section
            class="smc-recurring-section"
          >
            <div
              class="smc-recurring-section-header"
            >
              <div
                class="smc-recurring-section-heading"
              >
                <h2>
                  Recurring Income
                </h2>

                <p>
                  Add paychecks and other income you receive on a regular schedule.
                </p>
              </div>

              <button
                id="smcAddRecurringIncome"
                class="smc-recurring-add-button"
                type="button"
              >
                + Add Income
              </button>
            </div>

            <div
              id="smcRecurringIncomeList"
              class="smc-recurring-list"
            ></div>
          </section>

          <section
            class="smc-recurring-section"
          >
            <div
              class="smc-recurring-section-header"
            >
              <div
                class="smc-recurring-section-heading"
              >
                <h2>
                  Recurring Bills & Expenses
                </h2>

                <p>
                  Save regular bills and expenses with their normal timing and priority.
                </p>
              </div>

              <button
                id="smcAddRecurringExpense"
                class="smc-recurring-add-button"
                type="button"
              >
                + Add Expense
              </button>
            </div>

            <div
              id="smcRecurringExpenseList"
              class="smc-recurring-list"
            ></div>
          </section>

        </div>

        <section
          class="smc-recurring-preview"
        >
          <div
            class="smc-recurring-preview-header"
          >
            <div>
              <h2>
                What's Coming Up
              </h2>

              <p>
                A preview of your active recurring income and expenses over the next 3 months.
              </p>
            </div>

            <div
              class="smc-recurring-preview-window"
            >
              Next 3 Months
            </div>
          </div>

          <div
            id="smcRecurringTimeline"
            class="smc-recurring-timeline"
          ></div>
        </section>

      </div>
    `;

    content.appendChild(
      recurringPage
    );

    recurringApp =
      document.getElementById(
        "smcRecurringApp"
      );

    document
      .getElementById(
        "smcAddRecurringIncome"
      )
      ?.addEventListener(
        "click",
        () =>
          showRecurringForm(
            "income"
          )
      );

    document
      .getElementById(
        "smcAddRecurringExpense"
      )
      ?.addEventListener(
        "click",
        () =>
          showRecurringForm(
            "expense"
          )
      );

    buildModal();

    return true;
  }

  /* =========================================================
     BUILD MODAL
  ========================================================= */

  function buildModal() {
    if (
      document.getElementById(
        "smcRecurringModalBackdrop"
      )
    ) {
      recurringModal =
        document.getElementById(
          "smcRecurringModalBackdrop"
        );

      recurringModalTitle =
        document.getElementById(
          "smcRecurringModalTitle"
        );

      recurringModalBody =
        document.getElementById(
          "smcRecurringModalBody"
        );

      return;
    }

    recurringModal =
      document.createElement(
        "div"
      );

    recurringModal.id =
      "smcRecurringModalBackdrop";

    recurringModal.className =
      "smc-recurring-modal-backdrop";

    recurringModal.innerHTML = `
      <div
        class="smc-recurring-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="smcRecurringModalTitle"
      >
        <div
          class="smc-recurring-modal-header"
        >
          <h2
            id="smcRecurringModalTitle"
          >
            Recurring Finance
          </h2>

          <button
            id="smcRecurringModalClose"
            class="smc-recurring-modal-close"
            type="button"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div
          id="smcRecurringModalBody"
          class="smc-recurring-modal-body"
        ></div>
      </div>
    `;

    document.body
      .appendChild(
        recurringModal
      );

    recurringModalTitle =
      document.getElementById(
        "smcRecurringModalTitle"
      );

    recurringModalBody =
      document.getElementById(
        "smcRecurringModalBody"
      );

    document
      .getElementById(
        "smcRecurringModalClose"
      )
      ?.addEventListener(
        "click",
        closeRecurringModal
      );

    recurringModal
      .addEventListener(
        "click",
        event => {
          if (
            event.target ===
            recurringModal
          ) {
            closeRecurringModal();
          }
        }
      );

    document
      .addEventListener(
        "keydown",
        event => {
          if (
            event.key ===
              "Escape" &&
            recurringModal
              ?.classList
              .contains(
                "open"
              )
          ) {
            closeRecurringModal();
          }
        }
      );
  }

  /* =========================================================
     MODAL OPEN / CLOSE
  ========================================================= */

  function openRecurringModal() {
    if (!recurringModal) {
      buildModal();
    }

    recurringModal
      ?.classList
      .add(
        "open"
      );

    document.body.style.overflow =
      "hidden";
  }

  function closeRecurringModal() {
    recurringModal
      ?.classList
      .remove(
        "open"
      );

    document.body.style.overflow =
      "";

    editingItem =
      null;

    editingKind =
      null;

    recurringMessage =
      null;
  }

  /* =========================================================
     MODAL MESSAGE
  ========================================================= */

  function clearRecurringMessage() {
    if (
      recurringMessage
    ) {
      recurringMessage
        .classList
        .remove(
          "show"
        );

      recurringMessage.textContent =
        "";
    }
  }

  function showRecurringMessage(
    message
  ) {
    if (
      !recurringMessage
    ) {
      recurringMessage =
        document.getElementById(
          "smcRecurringMessage"
        );
    }

    if (
      !recurringMessage
    ) {
      return;
    }

    recurringMessage.textContent =
      message;

    recurringMessage
      .classList
      .add(
        "show"
      );
  }

  /* =========================================================
     SCHEDULE DESCRIPTION
  ========================================================= */

  function incomeScheduleText(
    item
  ) {
    if (!item) {
      return "";
    }

    if (
      item.frequency ===
        "weekly"
    ) {
      return `Weekly starting ${formatDate(
        item.next_date
      )}`;
    }

    if (
      item.frequency ===
        "biweekly"
    ) {
      return `Every 2 weeks starting ${formatDate(
        item.next_date
      )}`;
    }

    if (
      item.frequency ===
        "monthly"
    ) {
      const anchor =
        dateOnly(
          item.next_date
        );

      return anchor
        ? `Monthly around day ${anchor.getDate()}`
        : "Monthly";
    }

    if (
      item.frequency ===
        "semimonthly"
    ) {
      return `Twice monthly — days ${
        item.first_day ||
        "?"
      } & ${
        item.second_day ||
        "?"
      }`;
    }

    return frequencyLabel(
      item.frequency
    );
  }

  function expenseScheduleText(
    item
  ) {
    if (!item) {
      return "";
    }

    if (
      item.frequency ===
        "weekly"
    ) {
      return `Weekly starting ${formatDate(
        item.next_date
      )}`;
    }

    if (
      item.frequency ===
        "biweekly"
    ) {
      return `Every 2 weeks starting ${formatDate(
        item.next_date
      )}`;
    }

    if (
      item.frequency ===
        "monthly"
    ) {
      return `Monthly — day ${
        item.due_day ||
        "?"
      }`;
    }

    if (
      item.frequency ===
        "semimonthly"
    ) {
      return `Twice monthly — days ${
        item.due_day ||
        "?"
      } & ${
        item.second_due_day ||
        "?"
      }`;
    }

    return frequencyLabel(
      item.frequency
    );
  }

  /* =========================================================
     SUMMARY RENDER
  ========================================================= */

  function renderSummary() {
    const target =
      document.getElementById(
        "smcRecurringSummary"
      );

    if (!target) {
      return;
    }

    const income =
      estimatedMonthlyIncome();

    const expenses =
      estimatedMonthlyExpenses();

    const room =
      estimatedMonthlyRoom();

    let roomClass =
      "good";

    if (
      room <
      0
    ) {
      roomClass =
        "negative";
    } else if (
      room <
      100
    ) {
      roomClass =
        "tight";
    }

    target.innerHTML = `
      <div
        class="smc-recurring-summary-card"
      >
        <div
          class="smc-recurring-summary-label"
        >
          Monthly Income
        </div>

        <div
          class="smc-recurring-summary-value"
        >
          ${currency(
            income
          )}
        </div>

        <div
          class="smc-recurring-summary-note"
        >
          ${
            activeIncomeCount()
          }
          active
          ${plural(
            activeIncomeCount(),
            "income source"
          )}
        </div>
      </div>

      <div
        class="smc-recurring-summary-card"
      >
        <div
          class="smc-recurring-summary-label"
        >
          Monthly Expenses
        </div>

        <div
          class="smc-recurring-summary-value"
        >
          ${currency(
            expenses
          )}
        </div>

        <div
          class="smc-recurring-summary-note"
        >
          ${
            activeExpenseCount()
          }
          active
          ${plural(
            activeExpenseCount(),
            "expense"
          )}
        </div>
      </div>

      <div
        class="smc-recurring-summary-card"
      >
        <div
          class="smc-recurring-summary-label"
        >
          Estimated Room
        </div>

        <div
          class="smc-recurring-summary-value ${roomClass}"
        >
          ${currency(
            room
          )}
        </div>

        <div
          class="smc-recurring-summary-note"
        >
          Income minus recurring expenses
        </div>
      </div>

      <div
        class="smc-recurring-summary-card"
      >
        <div
          class="smc-recurring-summary-label"
        >
          Active Items
        </div>

        <div
          class="smc-recurring-summary-value"
        >
          ${
            activeIncomeCount() +
            activeExpenseCount()
          }
        </div>

        <div
          class="smc-recurring-summary-note"
        >
          Paused items are not included
        </div>
      </div>
    `;
  }

  /* =========================================================
     EMPTY STATE
  ========================================================= */

  function recurringEmptyState(
    kind
  ) {
    const income =
      kind ===
      "income";

    return `
      <div
        class="smc-recurring-empty"
      >
        <div
          class="smc-recurring-empty-icon"
        >
          ${
            income
              ? "💵"
              : "🧾"
          }
        </div>

        <h3>
          ${
            income
              ? "Add your regular income"
              : "Add your regular bills"
          }
        </h3>

        <p>
          ${
            income
              ? "Save paychecks or other repeating income once and Stretch My Check will remember the schedule."
              : "Save rent, utilities, subscriptions, insurance, and other repeating expenses so you don't have to enter them every time."
          }
        </p>

        <button
          class="smc-recurring-add-button"
          type="button"
          data-recurring-empty-add="${
            income
              ? "income"
              : "expense"
          }"
        >
          ${
            income
              ? "+ Add Income"
              : "+ Add Expense"
          }
        </button>
      </div>
    `;
  }
    /* =========================================================
     RENDER INCOME CARDS
  ========================================================= */

  function renderIncomeList() {
    const target =
      document.getElementById(
        "smcRecurringIncomeList"
      );

    if (!target) {
      return;
    }

    if (
      !recurringIncome.length
    ) {
      target.innerHTML =
        recurringEmptyState(
          "income"
        );

      bindEmptyButtons();

      return;
    }

    target.innerHTML =
      recurringIncome
        .map(
          item => {
            const active =
              item.active !==
              false;

            const next =
              active
                ? nextIncomeOccurrence(
                    item
                  )
                : null;

            return `
              <article
                class="
                  smc-recurring-card
                  ${
                    active
                      ? ""
                      : "paused"
                  }
                "
              >

                <div
                  class="smc-recurring-card-top"
                >

                  <div
                    class="smc-recurring-card-main"
                  >

                    <div
                      class="smc-recurring-icon"
                    >
                      💵
                    </div>

                    <div
                      class="smc-recurring-card-title-wrap"
                    >

                      <div
                        class="smc-recurring-card-title"
                      >
                        ${esc(
                          item.income_name
                        )}
                      </div>

                      <div
                        class="smc-recurring-card-frequency"
                      >
                        ${esc(
                          incomeScheduleText(
                            item
                          )
                        )}
                      </div>

                    </div>

                  </div>

                  <div
                    class="
                      smc-recurring-status
                      ${
                        active
                          ? ""
                          : "paused"
                      }
                    "
                  >
                    ${
                      active
                        ? "Active"
                        : "Paused"
                    }
                  </div>

                </div>

                <div
                  class="smc-recurring-amount income"
                >
                  ${currency(
                    item.amount
                  )}
                </div>

                <div
                  class="smc-recurring-amount-label"
                >
                  Per Payment
                </div>

                <div
                  class="smc-recurring-card-details"
                >

                  <div
                    class="smc-recurring-detail"
                  >

                    <div
                      class="smc-recurring-detail-label"
                    >
                      Frequency
                    </div>

                    <div
                      class="smc-recurring-detail-value"
                    >
                      ${esc(
                        frequencyLabel(
                          item.frequency
                        )
                      )}
                    </div>

                  </div>

                  <div
                    class="smc-recurring-detail"
                  >

                    <div
                      class="smc-recurring-detail-label"
                    >
                      Next Payment
                    </div>

                    <div
                      class="smc-recurring-detail-value"
                    >
                      ${
                        active
                          ? formatDate(
                              next
                            )
                          : "Paused"
                      }
                    </div>

                  </div>

                </div>

                <div
                  class="smc-recurring-card-actions"
                >

                  <button
                    class="smc-recurring-card-button"
                    type="button"
                    data-recurring-edit-income="${
                      item.id
                    }"
                  >
                    Manage
                  </button>

                  <button
                    class="smc-recurring-card-button pause"
                    type="button"
                    data-recurring-toggle-income="${
                      item.id
                    }"
                  >
                    ${
                      active
                        ? "Pause"
                        : "Resume"
                    }
                  </button>

                </div>

              </article>
            `;
          }
        )
        .join("");

    target
      .querySelectorAll(
        "[data-recurring-edit-income]"
      )
      .forEach(
        button => {
          button.onclick =
            () => {
              const item =
                recurringIncome.find(
                  entry =>
                    Number(
                      entry.id
                    ) ===
                    Number(
                      button.dataset
                        .recurringEditIncome
                    )
                );

              if (item) {
                showRecurringForm(
                  "income",
                  item
                );
              }
            };
        }
      );

    target
      .querySelectorAll(
        "[data-recurring-toggle-income]"
      )
      .forEach(
        button => {
          button.onclick =
            () =>
              toggleRecurringItem(
                "income",
                button.dataset
                  .recurringToggleIncome
              );
        }
      );
  }

  /* =========================================================
     RENDER EXPENSE CARDS
  ========================================================= */

  function renderExpenseList() {
    const target =
      document.getElementById(
        "smcRecurringExpenseList"
      );

    if (!target) {
      return;
    }

    if (
      !recurringExpenses.length
    ) {
      target.innerHTML =
        recurringEmptyState(
          "expense"
        );

      bindEmptyButtons();

      return;
    }

    target.innerHTML =
      recurringExpenses
        .map(
          item => {
            const active =
              item.active !==
              false;

            const next =
              active
                ? nextExpenseOccurrence(
                    item
                  )
                : null;

            return `
              <article
                class="
                  smc-recurring-card
                  ${
                    active
                      ? ""
                      : "paused"
                  }
                "
              >

                <div
                  class="smc-recurring-card-top"
                >

                  <div
                    class="smc-recurring-card-main"
                  >

                    <div
                      class="smc-recurring-icon"
                    >
                      🧾
                    </div>

                    <div
                      class="smc-recurring-card-title-wrap"
                    >

                      <div
                        class="smc-recurring-card-title"
                      >
                        ${esc(
                          item.expense_name
                        )}
                      </div>

                      <div
                        class="smc-recurring-card-frequency"
                      >
                        ${esc(
                          expenseScheduleText(
                            item
                          )
                        )}
                      </div>

                    </div>

                  </div>

                  <div
                    class="
                      smc-recurring-status
                      ${
                        active
                          ? ""
                          : "paused"
                      }
                    "
                  >
                    ${
                      active
                        ? "Active"
                        : "Paused"
                    }
                  </div>

                </div>

                <div
                  class="smc-recurring-amount"
                >
                  ${currency(
                    item.amount
                  )}
                </div>

                <div
                  class="smc-recurring-amount-label"
                >
                  Per Expense
                </div>

                <div
                  class="smc-recurring-card-details"
                >

                  <div
                    class="smc-recurring-detail"
                  >

                    <div
                      class="smc-recurring-detail-label"
                    >
                      Priority
                    </div>

                    <div
                      class="smc-recurring-detail-value"
                    >
                      ${esc(
                        priorityLabel(
                          item.priority
                        )
                      )}
                    </div>

                  </div>

                  <div
                    class="smc-recurring-detail"
                  >

                    <div
                      class="smc-recurring-detail-label"
                    >
                      Next Due
                    </div>

                    <div
                      class="smc-recurring-detail-value"
                    >
                      ${
                        active
                          ? formatDate(
                              next
                            )
                          : "Paused"
                      }
                    </div>

                  </div>

                  <div
                    class="smc-recurring-detail"
                  >

                    <div
                      class="smc-recurring-detail-label"
                    >
                      Type
                    </div>

                    <div
                      class="smc-recurring-detail-value"
                    >
                      ${esc(
                        expenseTypeLabel(
                          item.expense_type
                        )
                      )}
                    </div>

                  </div>

                  <div
                    class="smc-recurring-detail"
                  >

                    <div
                      class="smc-recurring-detail-label"
                    >
                      Frequency
                    </div>

                    <div
                      class="smc-recurring-detail-value"
                    >
                      ${esc(
                        frequencyLabel(
                          item.frequency
                        )
                      )}
                    </div>

                  </div>

                </div>

                <div
                  class="smc-recurring-card-actions"
                >

                  <button
                    class="smc-recurring-card-button"
                    type="button"
                    data-recurring-edit-expense="${
                      item.id
                    }"
                  >
                    Manage
                  </button>

                  <button
                    class="smc-recurring-card-button pause"
                    type="button"
                    data-recurring-toggle-expense="${
                      item.id
                    }"
                  >
                    ${
                      active
                        ? "Pause"
                        : "Resume"
                    }
                  </button>

                </div>

              </article>
            `;
          }
        )
        .join("");

    target
      .querySelectorAll(
        "[data-recurring-edit-expense]"
      )
      .forEach(
        button => {
          button.onclick =
            () => {
              const item =
                recurringExpenses.find(
                  entry =>
                    Number(
                      entry.id
                    ) ===
                    Number(
                      button.dataset
                        .recurringEditExpense
                    )
                );

              if (item) {
                showRecurringForm(
                  "expense",
                  item
                );
              }
            };
        }
      );

    target
      .querySelectorAll(
        "[data-recurring-toggle-expense]"
      )
      .forEach(
        button => {
          button.onclick =
            () =>
              toggleRecurringItem(
                "expense",
                button.dataset
                  .recurringToggleExpense
              );
        }
      );
  }

  /* =========================================================
     EMPTY BUTTONS
  ========================================================= */

  function bindEmptyButtons() {
    document
      .querySelectorAll(
        "[data-recurring-empty-add]"
      )
      .forEach(
        button => {
          button.onclick =
            () =>
              showRecurringForm(
                button.dataset
                  .recurringEmptyAdd
              );
        }
      );
  }

  /* =========================================================
     UPCOMING TIMELINE
  ========================================================= */

  function renderTimeline() {
    const target =
      document.getElementById(
        "smcRecurringTimeline"
      );

    if (!target) {
      return;
    }

    const occurrences =
      upcomingOccurrences(
        todayLocal(),
        3
      );

    if (
      !occurrences.length
    ) {
      target.innerHTML = `
        <div
          class="smc-recurring-empty"
        >
          <div
            class="smc-recurring-empty-icon"
          >
            📅
          </div>

          <h3>
            Nothing scheduled yet
          </h3>

          <p>
            Add recurring income and expenses above and your upcoming money timeline will appear here.
          </p>
        </div>
      `;

      return;
    }

    target.innerHTML =
      occurrences
        .slice(
          0,
          30
        )
        .map(
          occurrence => `
            <div
              class="smc-recurring-event"
            >

              <div
                class="smc-recurring-event-date"
              >
                ${formatShortDate(
                  occurrence.date
                )}
              </div>

              <div
                class="smc-recurring-event-main"
              >

                <div
                  class="smc-recurring-event-name"
                >
                  ${esc(
                    occurrence.name
                  )}
                </div>

                <div
                  class="smc-recurring-event-type"
                >
                  ${
                    occurrence.kind ===
                    "income"
                      ? "Income"
                      : `${
                          priorityLabel(
                            occurrence.priority
                          )
                        } expense`
                  }
                  •
                  ${esc(
                    frequencyLabel(
                      occurrence.frequency
                    )
                  )}
                </div>

              </div>

              <div
                class="
                  smc-recurring-event-amount
                  ${
                    occurrence.kind
                  }
                "
              >
                ${
                  occurrence.kind ===
                  "income"
                    ? "+"
                    : "−"
                }${currency(
                  occurrence.amount
                )}
              </div>

            </div>
          `
        )
        .join("");
  }

  /* =========================================================
     MAIN RENDER
  ========================================================= */

  function renderRecurring() {
    renderSummary();
    renderIncomeList();
    renderExpenseList();
    renderTimeline();
  }

  /* =========================================================
     SCHEDULE FIELDS
  ========================================================= */

  function scheduleFieldsHtml(
    kind,
    frequency,
    item = null
  ) {
    const income =
      kind ===
      "income";

    if (
      frequency ===
        "weekly" ||
      frequency ===
        "biweekly"
    ) {
      return `
        <div
          class="smc-recurring-field"
        >
          <label>
            ${
              income
                ? "Next payday"
                : "Next due date"
            }
          </label>

          <input
            id="smcRecurringNextDate"
            type="date"
            value="${esc(
              item?.next_date ||
              ""
            )}"
          >

          <div
            class="smc-recurring-field-note"
          >
            Choose one real upcoming date. Stretch My Check will calculate the repeating schedule from there.
          </div>
        </div>
      `;
    }

    if (
      frequency ===
      "monthly"
    ) {
      if (
        income
      ) {
        return `
          <div
            class="smc-recurring-field"
          >
            <label>
              Next payday
            </label>

            <input
              id="smcRecurringNextDate"
              type="date"
              value="${esc(
                item?.next_date ||
                ""
              )}"
            >

            <div
              class="smc-recurring-field-note"
            >
              The day of this date becomes the normal monthly payday.
            </div>
          </div>
        `;
      }

      return `
        <div
          class="smc-recurring-field"
        >
          <label>
            Normal due day
          </label>

          <input
            id="smcRecurringDueDay"
            type="number"
            min="1"
            max="31"
            step="1"
            value="${esc(
              item?.due_day ||
              ""
            )}"
            placeholder="1"
          >

          <div
            class="smc-recurring-field-note"
          >
            If you choose the 29th, 30th, or 31st, shorter months automatically use their final valid day.
          </div>
        </div>
      `;
    }

    if (
      frequency ===
      "semimonthly"
    ) {
      return `
        <div
          class="smc-recurring-grid-2"
        >

          <div
            class="smc-recurring-field"
          >
            <label>
              First day
            </label>

            <input
              id="smcRecurringFirstDay"
              type="number"
              min="1"
              max="31"
              step="1"
              value="${esc(
                income
                  ? (
                      item?.first_day ||
                      ""
                    )
                  : (
                      item?.due_day ||
                      ""
                    )
              )}"
              placeholder="11"
            >
          </div>

          <div
            class="smc-recurring-field"
          >
            <label>
              Second day
            </label>

            <input
              id="smcRecurringSecondDay"
              type="number"
              min="1"
              max="31"
              step="1"
              value="${esc(
                income
                  ? (
                      item?.second_day ||
                      ""
                    )
                  : (
                      item?.second_due_day ||
                      ""
                    )
              )}"
              placeholder="25"
            >
          </div>

        </div>

        <div
          class="smc-recurring-field-note"
        >
          Example: 11 and 25 means this happens twice each month on those dates.
        </div>
      `;
    }

    return "";
  }

  /* =========================================================
     REFRESH DYNAMIC SCHEDULE FIELDS
  ========================================================= */

  function refreshScheduleFields() {
    const frequency =
      document.getElementById(
        "smcRecurringFrequency"
      )?.value;

    const target =
      document.getElementById(
        "smcRecurringScheduleFields"
      );

    if (
      !frequency ||
      !target
    ) {
      return;
    }

    target.innerHTML =
      scheduleFieldsHtml(
        editingKind,
        frequency,
        editingItem
      );
  }

  /* =========================================================
     SHOW ADD / EDIT FORM
  ========================================================= */

  function showRecurringForm(
    kind,
    item = null
  ) {
    if (
      kind !==
        "income" &&
      kind !==
        "expense"
    ) {
      return;
    }

    buildModal();

    editingKind =
      kind;

    editingItem =
      item
        ? {
            ...item
          }
        : null;

    const income =
      kind ===
      "income";

    const existing =
      Boolean(
        item?.id
      );

    const frequency =
      item?.frequency ||
      (
        income
          ? "weekly"
          : "monthly"
      );

    recurringModalTitle.textContent =
      existing
        ? (
            income
              ? "Manage Recurring Income"
              : "Manage Recurring Expense"
          )
        : (
            income
              ? "Add Recurring Income"
              : "Add Recurring Expense"
          );

    recurringModalBody.innerHTML = `
      <div
        class="smc-recurring-field"
      >
        <label>
          ${
            income
              ? "Income name"
              : "Expense name"
          }
        </label>

        <input
          id="smcRecurringName"
          type="text"
          maxlength="80"
          value="${esc(
            income
              ? (
                  item?.income_name ||
                  ""
                )
              : (
                  item?.expense_name ||
                  ""
                )
          )}"
          placeholder="${
            income
              ? "Weekly Paycheck"
              : "Rent"
          }"
        >
      </div>

      <div
        class="smc-recurring-field"
      >
        <label>
          Amount
        </label>

        <input
          id="smcRecurringAmount"
          type="number"
          min="0"
          step="0.01"
          value="${esc(
            item?.amount ??
            ""
          )}"
          placeholder="${
            income
              ? "1100"
              : "1300"
          }"
        >
      </div>

      ${
        income
          ? ""
          : `
            <div
              class="smc-recurring-grid-2"
            >

              <div
                class="smc-recurring-field"
              >
                <label>
                  Expense type
                </label>

                <select
                  id="smcRecurringExpenseType"
                >
                  <option
                    value="fixed"
                    ${
                      (
                        item?.expense_type ||
                        "fixed"
                      ) ===
                      "fixed"
                        ? "selected"
                        : ""
                    }
                  >
                    Fixed
                  </option>

                  <option
                    value="flexible"
                    ${
                      item?.expense_type ===
                      "flexible"
                        ? "selected"
                        : ""
                    }
                  >
                    Flexible
                  </option>
                </select>
              </div>

              <div
                class="smc-recurring-field"
              >
                <label>
                  Priority
                </label>

                <select
                  id="smcRecurringPriority"
                >
                  <option
                    value="essential"
                    ${
                      (
                        item?.priority ||
                        "essential"
                      ) ===
                      "essential"
                        ? "selected"
                        : ""
                    }
                  >
                    Essential
                  </option>

                  <option
                    value="important"
                    ${
                      item?.priority ===
                      "important"
                        ? "selected"
                        : ""
                    }
                  >
                    Important
                  </option>

                  <option
                    value="lower"
                    ${
                      item?.priority ===
                      "lower"
                        ? "selected"
                        : ""
                    }
                  >
                    Lower Priority
                  </option>
                </select>
              </div>

            </div>
          `
      }

      <div
        class="smc-recurring-field"
      >
        <label>
          Frequency
        </label>

        <select
          id="smcRecurringFrequency"
        >
          <option
            value="weekly"
            ${
              frequency ===
              "weekly"
                ? "selected"
                : ""
            }
          >
            Weekly
          </option>

          <option
            value="biweekly"
            ${
              frequency ===
              "biweekly"
                ? "selected"
                : ""
            }
          >
            Every 2 Weeks
          </option>

          <option
            value="semimonthly"
            ${
              frequency ===
              "semimonthly"
                ? "selected"
                : ""
            }
          >
            Twice Monthly
          </option>

          <option
            value="monthly"
            ${
              frequency ===
              "monthly"
                ? "selected"
                : ""
            }
          >
            Monthly
          </option>
        </select>
      </div>

      <div
        id="smcRecurringScheduleFields"
        class="smc-recurring-schedule-fields"
      >
        ${scheduleFieldsHtml(
          kind,
          frequency,
          item
        )}
      </div>

      <div
        class="smc-recurring-field"
      >
        <label>
          Notes
          <span
            style="
              color:#829aa5;
              font-weight:500;
            "
          >
            (optional)
          </span>
        </label>

        <textarea
          id="smcRecurringNotes"
          maxlength="500"
          placeholder="Anything you want to remember about this item..."
        >${esc(
          item?.notes ||
          ""
        )}</textarea>
      </div>

      <div
        id="smcRecurringMessage"
        class="smc-recurring-message"
      ></div>

      <div
        class="smc-recurring-modal-actions"
      >

        ${
          existing
            ? `
              <button
                id="smcRecurringDelete"
                class="smc-recurring-delete"
                type="button"
              >
                Delete
              </button>
            `
            : ""
        }

        <button
          id="smcRecurringCancel"
          class="smc-recurring-cancel"
          type="button"
        >
          Cancel
        </button>

        <button
          id="smcRecurringSave"
          class="smc-recurring-save"
          type="button"
        >
          ${
            existing
              ? "Save Changes"
              : (
                  income
                    ? "Add Income"
                    : "Add Expense"
                )
          }
        </button>

      </div>
    `;

    recurringMessage =
      document.getElementById(
        "smcRecurringMessage"
      );

    document
      .getElementById(
        "smcRecurringFrequency"
      )
      ?.addEventListener(
        "change",
        () => {
          /*
            When changing frequency, don't reuse schedule fields
            from the previous frequency.
          */

          editingItem =
            editingItem
              ? {
                  ...editingItem,
                  next_date:
                    null,
                  first_day:
                    null,
                  second_day:
                    null,
                  due_day:
                    null,
                  second_due_day:
                    null
                }
              : null;

          refreshScheduleFields();
        }
      );

    document
      .getElementById(
        "smcRecurringCancel"
      )
      ?.addEventListener(
        "click",
        closeRecurringModal
      );

    document
      .getElementById(
        "smcRecurringSave"
      )
      ?.addEventListener(
        "click",
        saveRecurringItem
      );

    document
      .getElementById(
        "smcRecurringDelete"
      )
      ?.addEventListener(
        "click",
        deleteRecurringItem
      );

    clearRecurringMessage();

    openRecurringModal();

    window.setTimeout(
      () => {
        document
          .getElementById(
            "smcRecurringName"
          )
          ?.focus();
      },
      60
    );
  }

  /* =========================================================
     READ / VALIDATE SCHEDULE
  ========================================================= */

  function readScheduleValues(
    kind,
    frequency
  ) {
    const income =
      kind ===
      "income";

    const schedule = {
      next_date:
        null,

      first_day:
        null,

      second_day:
        null,

      due_day:
        null,

      second_due_day:
        null
    };

    if (
      frequency ===
        "weekly" ||
      frequency ===
        "biweekly"
    ) {
      const nextDate =
        document.getElementById(
          "smcRecurringNextDate"
        )?.value ||
        "";

      if (!nextDate) {
        return {
          error:
            income
              ? "Choose the next payday."
              : "Choose the next due date."
        };
      }

      schedule.next_date =
        nextDate;

      return {
        schedule
      };
    }

    if (
      frequency ===
      "monthly"
    ) {
      if (
        income
      ) {
        const nextDate =
          document.getElementById(
            "smcRecurringNextDate"
          )?.value ||
          "";

        if (!nextDate) {
          return {
            error:
              "Choose the next payday."
          };
        }

        schedule.next_date =
          nextDate;

        return {
          schedule
        };
      }

      const dueDay =
        parseInt(
          document.getElementById(
            "smcRecurringDueDay"
          )?.value ||
          "",
          10
        );

      if (
        !Number.isInteger(
          dueDay
        ) ||
        dueDay <
          1 ||
        dueDay >
          31
      ) {
        return {
          error:
            "Enter a due day between 1 and 31."
        };
      }

      schedule.due_day =
        dueDay;

      return {
        schedule
      };
    }

    if (
      frequency ===
      "semimonthly"
    ) {
      const firstDay =
        parseInt(
          document.getElementById(
            "smcRecurringFirstDay"
          )?.value ||
          "",
          10
        );

      const secondDay =
        parseInt(
          document.getElementById(
            "smcRecurringSecondDay"
          )?.value ||
          "",
          10
        );

      if (
        !Number.isInteger(
          firstDay
        ) ||
        firstDay <
          1 ||
        firstDay >
          31 ||
        !Number.isInteger(
          secondDay
        ) ||
        secondDay <
          1 ||
        secondDay >
          31
      ) {
        return {
          error:
            "Enter two valid days between 1 and 31."
        };
      }

      if (
        firstDay ===
        secondDay
      ) {
        return {
          error:
            "Choose two different days for a twice-monthly schedule."
        };
      }

      const ordered =
        [
          firstDay,
          secondDay
        ].sort(
          (
            a,
            b
          ) =>
            a - b
        );

      if (
        income
      ) {
        schedule.first_day =
          ordered[0];

        schedule.second_day =
          ordered[1];

      } else {
        schedule.due_day =
          ordered[0];

        schedule.second_due_day =
          ordered[1];
      }

      return {
        schedule
      };
    }

    return {
      error:
        "Choose a valid frequency."
    };
  }
    /* =========================================================
     SAVE RECURRING ITEM
  ========================================================= */

  async function saveRecurringItem() {
    clearRecurringMessage();

    const user =
      await currentUser();

    if (!user) {
      showRecurringMessage(
        "Sign in before saving recurring finances."
      );

      return;
    }

    const name =
      document
        .getElementById(
          "smcRecurringName"
        )
        ?.value
        .trim() ||
      "";

    const amount =
      roundMoney(
        document
          .getElementById(
            "smcRecurringAmount"
          )
          ?.value
      );

    const frequency =
      document
        .getElementById(
          "smcRecurringFrequency"
        )
        ?.value ||
      "";

    const notes =
      document
        .getElementById(
          "smcRecurringNotes"
        )
        ?.value
        .trim() ||
      "";

    if (!name) {
      showRecurringMessage(
        editingKind ===
          "income"
          ? "Enter a name for this income."
          : "Enter a name for this expense."
      );

      return;
    }

    if (
      !Number.isFinite(
        amount
      ) ||
      amount <= 0
    ) {
      showRecurringMessage(
        "Enter an amount greater than $0."
      );

      return;
    }

    const scheduleResult =
      readScheduleValues(
        editingKind,
        frequency
      );

    if (
      scheduleResult.error
    ) {
      showRecurringMessage(
        scheduleResult.error
      );

      return;
    }

    const schedule =
      scheduleResult.schedule;

    const existing =
      Boolean(
        editingItem?.id
      );

    /* =======================================================
       SAVE INCOME
    ======================================================= */

    if (
      editingKind ===
      "income"
    ) {
      const payload = {
        user_id:
          user.id,

        income_name:
          name,

        amount,

        frequency,

        next_date:
          schedule.next_date,

        first_day:
          schedule.first_day,

        second_day:
          schedule.second_day,

        active:
          existing
            ? editingItem.active !==
              false
            : true,

        notes:
          notes ||
          null,

        updated_at:
          new Date()
            .toISOString()
      };

      let error =
        null;

      if (
        existing
      ) {
        const result =
          await sb
            .from(
              "recurring_income"
            )
            .update(
              payload
            )
            .eq(
              "id",
              editingItem.id
            )
            .eq(
              "user_id",
              user.id
            );

        error =
          result.error;

      } else {
        const result =
          await sb
            .from(
              "recurring_income"
            )
            .insert(
              payload
            );

        error =
          result.error;
      }

      if (error) {
        console.error(
          "Recurring income save failed:",
          error
        );

        showRecurringMessage(
          error.message ||
          "Could not save this recurring income."
        );

        return;
      }

    /* =======================================================
       SAVE EXPENSE
    ======================================================= */

    } else if (
      editingKind ===
      "expense"
    ) {
      const expenseType =
        document
          .getElementById(
            "smcRecurringExpenseType"
          )
          ?.value ||
        "fixed";

      const priority =
        document
          .getElementById(
            "smcRecurringPriority"
          )
          ?.value ||
        "essential";

      const payload = {
        user_id:
          user.id,

        expense_name:
          name,

        amount,

        expense_type:
          expenseType,

        priority,

        frequency,

        next_date:
          schedule.next_date,

        due_day:
          schedule.due_day,

        second_due_day:
          schedule.second_due_day,

        active:
          existing
            ? editingItem.active !==
              false
            : true,

        notes:
          notes ||
          null,

        updated_at:
          new Date()
            .toISOString()
      };

      let error =
        null;

      if (
        existing
      ) {
        const result =
          await sb
            .from(
              "recurring_expenses"
            )
            .update(
              payload
            )
            .eq(
              "id",
              editingItem.id
            )
            .eq(
              "user_id",
              user.id
            );

        error =
          result.error;

      } else {
        const result =
          await sb
            .from(
              "recurring_expenses"
            )
            .insert(
              payload
            );

        error =
          result.error;
      }

      if (error) {
        console.error(
          "Recurring expense save failed:",
          error
        );

        showRecurringMessage(
          error.message ||
          "Could not save this recurring expense."
        );

        return;
      }

    } else {
      showRecurringMessage(
        "Could not determine what type of recurring item to save."
      );

      return;
    }

    closeRecurringModal();

    await loadRecurringFinances();
  }

  /* =========================================================
     DELETE RECURRING ITEM
  ========================================================= */

  async function deleteRecurringItem() {
    if (
      !editingItem?.id ||
      !editingKind
    ) {
      return;
    }

    const label =
      editingKind ===
        "income"
        ? (
            editingItem.income_name ||
            "this income"
          )
        : (
            editingItem.expense_name ||
            "this expense"
          );

    const confirmed =
      window.confirm(
        `Delete "${label}"? This cannot be undone.`
      );

    if (
      !confirmed
    ) {
      return;
    }

    const user =
      await currentUser();

    if (!user) {
      showRecurringMessage(
        "You are not signed in."
      );

      return;
    }

    const table =
      editingKind ===
        "income"
        ? "recurring_income"
        : "recurring_expenses";

    const {
      error
    } =
      await sb
        .from(
          table
        )
        .delete()
        .eq(
          "id",
          editingItem.id
        )
        .eq(
          "user_id",
          user.id
        );

    if (error) {
      console.error(
        "Recurring item delete failed:",
        error
      );

      showRecurringMessage(
        error.message ||
        "Could not delete this recurring item."
      );

      return;
    }

    closeRecurringModal();

    await loadRecurringFinances();
  }

  /* =========================================================
     PAUSE / RESUME
  ========================================================= */

  async function toggleRecurringItem(
    kind,
    id
  ) {
    const user =
      await currentUser();

    if (!user) {
      return;
    }

    const collection =
      kind ===
        "income"
        ? recurringIncome
        : recurringExpenses;

    const item =
      collection.find(
        entry =>
          Number(
            entry.id
          ) ===
          Number(
            id
          )
      );

    if (!item) {
      return;
    }

    const table =
      kind ===
        "income"
        ? "recurring_income"
        : "recurring_expenses";

    const newActive =
      item.active ===
        false;

    const {
      error
    } =
      await sb
        .from(
          table
        )
        .update({
          active:
            newActive,

          updated_at:
            new Date()
              .toISOString()
        })
        .eq(
          "id",
          item.id
        )
        .eq(
          "user_id",
          user.id
        );

    if (error) {
      console.error(
        "Recurring pause/resume failed:",
        error
      );

      window.alert(
        error.message ||
        "Could not update this recurring item."
      );

      return;
    }

    await loadRecurringFinances();
  }

  /* =========================================================
     LOAD RECURRING FINANCES
  ========================================================= */

  async function loadRecurringFinances() {
    const user =
      await currentUser();

    const signedOut =
      document.getElementById(
        "smcRecurringSignedOut"
      );

    const app =
      document.getElementById(
        "smcRecurringApp"
      );

    if (!user) {
      recurringIncome =
        [];

      recurringExpenses =
        [];

      if (
        signedOut
      ) {
        signedOut.style.display =
          "block";
      }

      if (
        app
      ) {
        app.style.display =
          "none";
      }

      return;
    }

    if (
      signedOut
    ) {
      signedOut.style.display =
        "none";
    }

    if (
      app
    ) {
      app.style.display =
        "";
    }

    const [
      incomeResult,
      expenseResult
    ] =
      await Promise.all([
        sb
          .from(
            "recurring_income"
          )
          .select("*")
          .eq(
            "user_id",
            user.id
          )
          .order(
            "updated_at",
            {
              ascending:
                false
            }
          ),

        sb
          .from(
            "recurring_expenses"
          )
          .select("*")
          .eq(
            "user_id",
            user.id
          )
          .order(
            "updated_at",
            {
              ascending:
                false
            }
          )
      ]);

    if (
      incomeResult.error
    ) {
      console.error(
        "Recurring income load failed:",
        incomeResult.error
      );

      recurringIncome =
        [];

    } else {
      recurringIncome =
        incomeResult.data ||
        [];
    }

    if (
      expenseResult.error
    ) {
      console.error(
        "Recurring expenses load failed:",
        expenseResult.error
      );

      recurringExpenses =
        [];

    } else {
      recurringExpenses =
        expenseResult.data ||
        [];
    }

    renderRecurring();

    window.dispatchEvent(
      new CustomEvent(
        "stretchmycheck:recurring-updated",
        {
          detail: {
            income:
              [
                ...recurringIncome
              ],

            expenses:
              [
                ...recurringExpenses
              ]
          }
        }
      )
    );
  }

  /* =========================================================
     PAGE VISIBILITY
  ========================================================= */

  function currentRoute() {
    return (
      window.location.hash
        .replace(
          "#",
          ""
        )
        .trim()
        .toLowerCase() ||
      "home"
    );
  }

  function updateRecurringVisibility() {
    if (
      !recurringPage
    ) {
      return;
    }

    recurringPage.style.display =
      currentRoute() ===
        "recurring"
        ? ""
        : "none";
  }

  /* =========================================================
     ADD RECURRING NAV ITEM

     This creates a sidebar button without requiring us to
     rewrite the working app-shell.js yet.
  ========================================================= */

  function installRecurringNavigation() {
    if (
      document.querySelector(
        '[data-smc-route="recurring"]'
      )
    ) {
      return true;
    }

    const planLink =
      document.querySelector(
        '[data-smc-route="plan"]'
      );

    const toolsLink =
      document.querySelector(
        '[data-smc-route="tools"]'
      );

    const reference =
      toolsLink ||
      planLink;

    if (
      !reference ||
      !reference.parentNode
    ) {
      return false;
    }

    const button =
      document.createElement(
        reference.tagName
      );

    /*
      Copy the existing navigation item's classes so this
      automatically matches the app shell.
    */

    button.className =
      reference.className;

    if (
      button.tagName
        .toLowerCase() ===
      "a"
    ) {
      button.href =
        "#recurring";
    } else {
      button.type =
        "button";

      button.onclick =
        () => {
          window.location.hash =
            "recurring";
        };
    }

    button.dataset.smcRoute =
      "recurring";

    button.innerHTML = `
      <span
        aria-hidden="true"
      >
        🔁
      </span>

      <span>
        Recurring
      </span>
    `;

    if (
      toolsLink
    ) {
      toolsLink.parentNode
        .insertBefore(
          button,
          toolsLink
        );

    } else {
      reference.parentNode
        .insertBefore(
          button,
          reference.nextSibling
        );
    }

    return true;
  }

  /* =========================================================
     ACTIVE NAV STATE
  ========================================================= */

  function updateRecurringNavigation() {
    const route =
      currentRoute();

    document
      .querySelectorAll(
        "[data-smc-route]"
      )
      .forEach(
        item => {
          const itemRoute =
            item.dataset
              .smcRoute;

          if (
            itemRoute ===
            "recurring"
          ) {
            item.classList.toggle(
              "active",
              route ===
                "recurring"
            );
          } else if (
            route ===
            "recurring"
          ) {
            item.classList.remove(
              "active"
            );
          }
        }
      );
  }

  /* =========================================================
     REFRESH PAGE
  ========================================================= */

  function refreshRecurringPage() {
    if (
      !initialized
    ) {
      return;
    }

    renderRecurring();

    updateRecurringVisibility();

    updateRecurringNavigation();
  }

  /* =========================================================
     INITIALIZE
  ========================================================= */

  function initRecurring() {
    if (
      initialized &&
      document.getElementById(
        "smcRecurringPage"
      )
    ) {
      installRecurringNavigation();

      updateRecurringVisibility();

      updateRecurringNavigation();

      return true;
    }

    if (
      !buildPage()
    ) {
      return false;
    }

    installRecurringNavigation();

    initialized =
      true;

    updateRecurringVisibility();

    updateRecurringNavigation();

    loadRecurringFinances();

    return true;
  }

  /* =========================================================
     WAIT FOR APP SHELL
  ========================================================= */

  if (
    !initRecurring()
  ) {
    const observer =
      new MutationObserver(
        () => {
          if (
            initRecurring()
          ) {
            observer.disconnect();
          }
        }
      );

    observer.observe(
      document.body,
      {
        childList:
          true,

        subtree:
          true
      }
    );

    window.setTimeout(
      initRecurring,
      700
    );
  }

  /* =========================================================
     ROUTE CHANGES
  ========================================================= */

  window.addEventListener(
    "hashchange",
    () => {
      window.setTimeout(
        () => {
          if (
            !initialized
          ) {
            initRecurring();

            return;
          }

          updateRecurringVisibility();

          updateRecurringNavigation();

          /*
            Refresh from Supabase when the user returns to the
            page so data stays current.
          */

          if (
            currentRoute() ===
            "recurring"
          ) {
            loadRecurringFinances();
          }
        },
        60
      );
    }
  );

  /* =========================================================
     AUTH CHANGES
  ========================================================= */

  sb.auth
    .onAuthStateChange(
      () => {
        window.setTimeout(
          () => {
            if (
              !initialized
            ) {
              initRecurring();

              return;
            }

            loadRecurringFinances();
          },
          180
        );
      }
    );

  /* =========================================================
     PROFILE / PLAN EVENTS
  ========================================================= */

  window.addEventListener(
    "stretchmycheck:profile-updated",
    () => {
      window.setTimeout(
        refreshRecurringPage,
        100
      );
    }
  );

  window.addEventListener(
    "stretchmycheck:plan-loaded",
    () => {
      window.setTimeout(
        refreshRecurringPage,
        100
      );
    }
  );

  /* =========================================================
     PUBLIC API

     We will use this in the NEXT stage to generate My Plan
     directly from recurring finances.
  ========================================================= */

  window.StretchMyCheckRecurring = {
    refresh:
      loadRecurringFinances,

    openAddIncome:
      () =>
        showRecurringForm(
          "income"
        ),

    openAddExpense:
      () =>
        showRecurringForm(
          "expense"
        ),

    getIncome:
      () =>
        recurringIncome.map(
          item => ({
            ...item
          })
        ),

    getExpenses:
      () =>
        recurringExpenses.map(
          item => ({
            ...item
          })
        ),

    getUpcoming:
      (
        monthsAhead = 3
      ) =>
        upcomingOccurrences(
          todayLocal(),
          monthsAhead
        ).map(
          item => ({
            ...item,
            date:
              dateKey(
                item.date
              )
          })
        ),

    getMonthlySummary:
      () => ({
        income:
          estimatedMonthlyIncome(),

        expenses:
          estimatedMonthlyExpenses(),

        room:
          estimatedMonthlyRoom(),

        activeIncome:
          activeIncomeCount(),

        activeExpenses:
          activeExpenseCount()
      }),

    getIncomeOccurrences:
      (
        item,
        startDate,
        endDate
      ) =>
        incomeOccurrences(
          item,
          startDate,
          endDate
        ).map(
          date =>
            dateKey(
              date
            )
        ),

    getExpenseOccurrences:
      (
        item,
        startDate,
        endDate
      ) =>
        expenseOccurrences(
          item,
          startDate,
          endDate
        ).map(
          date =>
            dateKey(
              date
            )
        )
  };

})();