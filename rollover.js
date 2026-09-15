(() => {
  "use strict";

  /*
  =========================================================
   STRETCH MY CHECK
   NEXT PLAN / AUTOMATIC ROLLOVER
   Version 1 — Preview Engine
  =========================================================

   PURPOSE
   ---------------------------------------------------------
   - Adds a "Prepare Next Plan" card to My Plan.
   - Reads the CURRENT planner.
   - Determines the next planning period.
   - Calculates the balance to carry forward.
   - Carries forward:
       • Protected cushion
       • Living-expense settings
   - Pulls recurring income and expenses for the NEXT period.
   - Does NOT carry ordinary one-time bills forward.
   - Shows everything in a preview modal.
   - Does NOT create or modify a saved plan yet.

   IMPORTANT
   ---------------------------------------------------------
   This module intentionally does NOT write to:
   - saved_plans
   - plan_rollovers
   - recurring finances
   - goals
   - debts

   Creation comes only after the preview passes testing.
  =========================================================
  */


  /* =======================================================
     SHORTCUTS / STATE
  ======================================================= */

  const $ = (
    selector,
    root = document
  ) =>
    root.querySelector(selector);

  const $$ = (
    selector,
    root = document
  ) =>
    [...root.querySelectorAll(selector)];


  let initialized = false;

  let rolloverCard = null;

  let rolloverModal = null;

  let currentPreview = null;


  /* =======================================================
     GENERAL HELPERS
  ======================================================= */

  function numberValue(value) {
    const parsed =
      parseFloat(value);

    return Number.isFinite(parsed)
      ? parsed
      : 0;
  }


  function money(value) {
    return new Intl.NumberFormat(
      "en-US",
      {
        style: "currency",
        currency: "USD"
      }
    ).format(
      numberValue(value)
    );
  }


  function escapeHTML(value) {
    return String(
      value ?? ""
    )
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }


  function parseLocalDate(value) {
    if (!value) {
      return null;
    }

    if (
      value instanceof Date
    ) {
      return new Date(
        value.getFullYear(),
        value.getMonth(),
        value.getDate()
      );
    }

    const text =
      String(value)
        .trim();

    const isoMatch =
      text.match(
        /^(\d{4})-(\d{2})-(\d{2})$/
      );

    if (isoMatch) {
      return new Date(
        Number(
          isoMatch[1]
        ),
        Number(
          isoMatch[2]
        ) - 1,
        Number(
          isoMatch[3]
        )
      );
    }

    const slashMatch =
      text.match(
        /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
      );

    if (slashMatch) {
      return new Date(
        Number(
          slashMatch[3]
        ),
        Number(
          slashMatch[1]
        ) - 1,
        Number(
          slashMatch[2]
        )
      );
    }

    const date =
      new Date(text);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return null;
    }

    return new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );
  }


  function dateKey(value) {
    const date =
      parseLocalDate(value);

    if (!date) {
      return "";
    }

    const year =
      date.getFullYear();

    const month =
      String(
        date.getMonth() + 1
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

    return (
      `${year}-${month}-${day}`
    );
  }


  function displayDate(value) {
    const date =
      parseLocalDate(value);

    if (!date) {
      return "—";
    }

    return new Intl.DateTimeFormat(
      "en-US",
      {
        month: "short",
        day: "numeric",
        year: "numeric"
      }
    ).format(date);
  }


  function addDays(
    value,
    amount
  ) {
    const date =
      parseLocalDate(value);

    if (!date) {
      return null;
    }

    const copy =
      new Date(date);

    copy.setDate(
      copy.getDate() +
      amount
    );

    return copy;
  }


  function daysBetween(
    start,
    end
  ) {
    const first =
      parseLocalDate(start);

    const second =
      parseLocalDate(end);

    if (
      !first ||
      !second
    ) {
      return 0;
    }

    return Math.max(
      0,
      Math.round(
        (
          second.getTime() -
          first.getTime()
        ) /
        86400000
      )
    );
  }


  function getValue(id) {
    return (
      document.getElementById(id)
        ?.value || ""
    );
  }


  function getSelectText(id) {
    const select =
      document.getElementById(id);

    if (!select) {
      return "";
    }

    return (
      select.options[
        select.selectedIndex
      ]?.textContent ||
      select.value ||
      ""
    );
  }


  function wait(milliseconds) {
    return new Promise(
      resolve =>
        setTimeout(
          resolve,
          milliseconds
        )
    );
  }


  /* =======================================================
     STYLES
  ======================================================= */

  function installStyles() {
    if (
      $("#smcRolloverStyles")
    ) {
      return;
    }

    const style =
      document.createElement(
        "style"
      );

    style.id =
      "smcRolloverStyles";

    style.textContent = `

/* =========================================================
   NEXT PLAN CARD
========================================================= */

#smcRolloverCard {
  margin-top: 24px;
  margin-bottom: 24px;
}

.smc-roll-card {
  position: relative;
  overflow: hidden;

  padding: 22px;

  border:
    1px solid
    rgba(132, 175, 192, .17);

  border-radius: 18px;

  background:
    linear-gradient(
      145deg,
      #11202a,
      #0b1820
    );

  color: #f5f9fb;
}

.smc-roll-card::before {
  content: "";

  position: absolute;

  top: 0;
  left: 0;
  bottom: 0;

  width: 3px;

  background:
    linear-gradient(
      180deg,
      #42e1c0,
      #278eae
    );
}

.smc-roll-card-top {
  display: flex;

  align-items: center;

  justify-content:
    space-between;

  gap: 20px;
}

.smc-roll-eyebrow {
  margin-bottom: 7px;

  color: #4ce1c1;

  font-size: 11px;

  font-weight: 850;

  letter-spacing: .07em;

  text-transform: uppercase;
}

.smc-roll-title {
  margin: 0;

  color: #ffffff;

  font-size: 19px;

  line-height: 1.25;

  font-weight: 850;
}

.smc-roll-description {
  max-width: 720px;

  margin:
    7px 0 0;

  color: #a9bdc6;

  font-size: 12px;

  line-height: 1.55;
}

.smc-roll-button {
  flex: 0 0 auto;

  padding:
    10px 17px;

  border:
    1px solid
    rgba(69, 225, 192, .35);

  border-radius: 999px;

  background:
    linear-gradient(
      90deg,
      #187b74,
      #258f87
    );

  color: #ffffff;

  font-size: 12px;

  font-weight: 850;

  cursor: pointer;

  transition:
    transform .15s ease,
    filter .15s ease;
}

.smc-roll-button:hover {
  transform:
    translateY(-1px);

  filter:
    brightness(1.08);
}

.smc-roll-button:disabled {
  opacity: .55;

  cursor: not-allowed;

  transform: none;
}

.smc-roll-mini-grid {
  display: grid;

  grid-template-columns:
    repeat(
      3,
      minmax(0, 1fr)
    );

  gap: 12px;

  margin-top: 18px;
}

.smc-roll-mini {
  padding:
    13px 14px;

  border:
    1px solid
    rgba(132, 175, 192, .12);

  border-radius: 13px;

  background:
    rgba(
      5,
      20,
      27,
      .48
    );
}

.smc-roll-mini-label {
  margin-bottom: 6px;

  color: #94aab4;

  font-size: 10px;

  font-weight: 750;
}

.smc-roll-mini-value {
  color: #f7fbfc;

  font-size: 14px;

  font-weight: 850;
}

.smc-roll-mini-value.good {
  color: #58e5b0;
}

.smc-roll-help {
  display: flex;

  align-items: center;

  gap: 8px;

  margin-top: 15px;

  color: #8fa6b1;

  font-size: 11px;

  line-height: 1.45;
}

.smc-roll-help-icon {
  display: inline-flex;

  align-items: center;

  justify-content: center;

  width: 18px;

  height: 18px;

  flex: 0 0 18px;

  border-radius: 50%;

  background:
    rgba(
      69,
      225,
      192,
      .11
    );

  color: #4de0c1;

  font-size: 11px;

  font-weight: 850;
}


/* =========================================================
   MODAL
========================================================= */

.smc-roll-modal-bg {
  position: fixed;

  inset: 0;

  z-index: 15000;

  display: none;

  align-items: center;

  justify-content: center;

  padding: 20px;

  background:
    rgba(
      1,
      7,
      11,
      .82
    );

  backdrop-filter:
    blur(8px);
}

.smc-roll-modal-bg.show {
  display: flex;
}

.smc-roll-modal {
  width:
    min(
      900px,
      100%
    );

  max-height:
    calc(
      100vh - 40px
    );

  overflow-y: auto;

  box-sizing:
    border-box;

  padding: 25px;

  border:
    1px solid
    rgba(132, 175, 192, .20);

  border-radius: 20px;

  background:
    linear-gradient(
      145deg,
      #12232d,
      #0b1820
    );

  color: #f4f8fa;

  box-shadow:
    0 30px 80px
    rgba(
      0,
      0,
      0,
      .42
    );
}

.smc-roll-modal-head {
  display: flex;

  align-items: flex-start;

  justify-content:
    space-between;

  gap: 20px;

  margin-bottom: 20px;
}

.smc-roll-modal-head h2 {
  margin: 0;

  color: #ffffff;

  font-size: 22px;

  line-height: 1.25;
}

.smc-roll-modal-head p {
  margin:
    7px 0 0;

  color: #9eb2bc;

  font-size: 12px;

  line-height: 1.55;
}

.smc-roll-close {
  width: 36px;

  height: 36px;

  flex: 0 0 36px;

  border:
    1px solid
    rgba(132, 175, 192, .18);

  border-radius: 50%;

  background: #132731;

  color: #dce7eb;

  font-size: 20px;

  cursor: pointer;
}


/* =========================================================
   HERO
========================================================= */

.smc-roll-period {
  display: flex;

  align-items: center;

  justify-content:
    space-between;

  gap: 20px;

  padding:
    16px 17px;

  margin-bottom: 16px;

  border:
    1px solid
    rgba(69, 225, 192, .18);

  border-radius: 14px;

  background:
    rgba(
      31,
      119,
      107,
      .10
    );
}

.smc-roll-period-label {
  color: #91a8b2;

  font-size: 10px;

  font-weight: 750;
}

.smc-roll-period-value {
  margin-top: 4px;

  color: #ffffff;

  font-size: 14px;

  font-weight: 850;
}

.smc-roll-period-arrow {
  color: #4ce1c1;

  font-size: 22px;

  font-weight: 850;
}


/* =========================================================
   SUMMARY
========================================================= */

.smc-roll-summary {
  display: grid;

  grid-template-columns:
    repeat(
      4,
      minmax(0, 1fr)
    );

  gap: 11px;

  margin-bottom: 18px;
}

.smc-roll-summary-card {
  padding:
    14px;

  border:
    1px solid
    rgba(132, 175, 192, .13);

  border-radius: 13px;

  background: #10222c;
}

.smc-roll-summary-label {
  margin-bottom: 7px;

  color: #92a8b2;

  font-size: 10px;

  font-weight: 750;
}

.smc-roll-summary-value {
  color: #ffffff;

  font-size: 16px;

  font-weight: 850;
}

.smc-roll-summary-value.green {
  color: #58e5b0;
}

.smc-roll-summary-value.red {
  color: #ff9297;
}

.smc-roll-summary-value.teal {
  color: #4ce1c1;
}


/* =========================================================
   SECTIONS
========================================================= */

.smc-roll-section {
  margin-top: 17px;

  padding: 17px;

  border:
    1px solid
    rgba(132, 175, 192, .13);

  border-radius: 15px;

  background:
    rgba(
      5,
      20,
      27,
      .42
    );
}

.smc-roll-section-head {
  display: flex;

  align-items: flex-start;

  justify-content:
    space-between;

  gap: 15px;

  margin-bottom: 13px;
}

.smc-roll-section-title {
  margin: 0;

  color: #ffffff;

  font-size: 15px;

  font-weight: 850;
}

.smc-roll-section-sub {
  margin-top: 4px;

  color: #91a8b2;

  font-size: 10px;

  line-height: 1.45;
}

.smc-roll-count {
  flex: 0 0 auto;

  padding:
    4px 8px;

  border:
    1px solid
    rgba(132, 175, 192, .15);

  border-radius: 999px;

  color: #a9bdc6;

  font-size: 9px;

  font-weight: 800;
}


/* =========================================================
   ITEMS
========================================================= */

.smc-roll-items {
  display: grid;

  gap: 8px;
}

.smc-roll-item {
  display: grid;

  grid-template-columns:
    86px
    minmax(0, 1fr)
    auto;

  align-items: center;

  gap: 12px;

  padding:
    11px 12px;

  border:
    1px solid
    rgba(132, 175, 192, .10);

  border-radius: 11px;

  background: #10222c;
}

.smc-roll-item-date {
  color: #9ec0cc;

  font-size: 10px;
}

.smc-roll-item-name {
  color: #ffffff;

  font-size: 12px;

  font-weight: 800;
}

.smc-roll-item-meta {
  margin-top: 3px;

  color: #8fa6b1;

  font-size: 9px;
}

.smc-roll-item-amount {
  text-align: right;

  font-size: 13px;

  font-weight: 850;
}

.smc-roll-item-amount.income {
  color: #58e5b0;
}

.smc-roll-item-amount.expense {
  color: #ff9297;
}


/* =========================================================
   SETTINGS
========================================================= */

.smc-roll-settings {
  display: grid;

  grid-template-columns:
    repeat(
      2,
      minmax(0, 1fr)
    );

  gap: 9px;
}

.smc-roll-setting {
  display: flex;

  align-items: center;

  justify-content:
    space-between;

  gap: 15px;

  padding:
    11px 12px;

  border:
    1px solid
    rgba(132, 175, 192, .10);

  border-radius: 11px;

  background: #10222c;
}

.smc-roll-setting-name {
  color: #9eb2bc;

  font-size: 10px;
}

.smc-roll-setting-value {
  color: #ffffff;

  font-size: 11px;

  font-weight: 800;

  text-align: right;
}


/* =========================================================
   NOTICE
========================================================= */

.smc-roll-notice {
  display: flex;

  gap: 10px;

  margin-top: 17px;

  padding:
    13px 14px;

  border:
    1px solid
    rgba(255, 196, 102, .17);

  border-radius: 12px;

  background:
    rgba(
      142,
      101,
      32,
      .09
    );
}

.smc-roll-notice-icon {
  color: #ffc46b;

  font-size: 15px;

  font-weight: 850;
}

.smc-roll-notice strong {
  display: block;

  margin-bottom: 3px;

  color: #f6d39b;

  font-size: 11px;
}

.smc-roll-notice span {
  color: #b8aa91;

  font-size: 10px;

  line-height: 1.5;
}


/* =========================================================
   EMPTY / ERROR
========================================================= */

.smc-roll-empty {
  padding:
    28px 20px;

  border:
    1px solid
    rgba(132, 175, 192, .12);

  border-radius: 13px;

  background: #10222c;

  text-align: center;
}

.smc-roll-empty strong {
  display: block;

  margin-bottom: 6px;

  color: #ffffff;

  font-size: 13px;
}

.smc-roll-empty span {
  color: #91a8b2;

  font-size: 10px;

  line-height: 1.5;
}


/* =========================================================
   ACTIONS
========================================================= */

.smc-roll-actions {
  display: flex;

  align-items: center;

  justify-content:
    space-between;

  gap: 12px;

  margin-top: 20px;
}

.smc-roll-actions-note {
  color: #8fa6b1;

  font-size: 10px;
}

.smc-roll-actions-right {
  display: flex;

  gap: 9px;

  margin-left: auto;
}

.smc-roll-secondary {
  padding:
    9px 15px;

  border:
    1px solid
    rgba(132, 175, 192, .20);

  border-radius: 999px;

  background: #142731;

  color: #dce8ec;

  font-size: 12px;

  font-weight: 750;

  cursor: pointer;
}

.smc-roll-disabled-create {
  padding:
    9px 16px;

  border:
    1px solid
    rgba(69, 225, 192, .20);

  border-radius: 999px;

  background:
    linear-gradient(
      90deg,
      #17645f,
      #1d7771
    );

  color: #ffffff;

  font-size: 12px;

  font-weight: 800;

  opacity: .48;

  cursor: not-allowed;
}


/* =========================================================
   MOBILE
========================================================= */

@media (
  max-width: 800px
) {

  .smc-roll-card-top {
    align-items:
      flex-start;

    flex-direction:
      column;
  }

  .smc-roll-button {
    width: 100%;
  }

  .smc-roll-mini-grid {
    grid-template-columns:
      1fr;
  }

  .smc-roll-summary {
    grid-template-columns:
      repeat(
        2,
        minmax(0, 1fr)
      );
  }

  .smc-roll-settings {
    grid-template-columns:
      1fr;
  }

  .smc-roll-item {
    grid-template-columns:
      70px
      minmax(0, 1fr);
  }

  .smc-roll-item-amount {
    grid-column: 2;

    text-align: left;
  }

  .smc-roll-period {
    align-items:
      flex-start;

    flex-direction:
      column;
  }

  .smc-roll-period-arrow {
    transform:
      rotate(90deg);
  }

  .smc-roll-actions {
    align-items:
      stretch;

    flex-direction:
      column;
  }

  .smc-roll-actions-right {
    width: 100%;

    margin-left: 0;
  }

  .smc-roll-secondary,
  .smc-roll-disabled-create {
    flex: 1;
  }
}

@media (
  max-width: 520px
) {

  .smc-roll-summary {
    grid-template-columns:
      1fr;
  }

  .smc-roll-modal {
    padding: 18px;
  }
}
`;

    document.head
      .appendChild(style);
  }


  /* =======================================================
     PLANNER INFORMATION
  ======================================================= */

  function getPlannerPaychecks() {
    return $$(".paycheck-entry")
      .map(
        entry => ({
          name:
            $(
              ".paycheck-name",
              entry
            )?.value || "",

          date:
            dateKey(
              $(
                ".paycheck-date",
                entry
              )?.value
            ),

          amount:
            numberValue(
              $(
                ".paycheck-amount",
                entry
              )?.value
            )
        })
      )
      .filter(
        item =>
          item.date
      )
      .sort(
        (a, b) =>
          parseLocalDate(
            a.date
          ) -
          parseLocalDate(
            b.date
          )
      );
  }


  function getPlannerBills() {
    return $$(".bill-entry")
      .map(
        entry => ({
          name:
            $(
              ".bill-name",
              entry
            )?.value || "",

          amount:
            numberValue(
              $(
                ".bill-amount",
                entry
              )?.value
            ),

          type:
            $(
              ".bill-type",
              entry
            )?.value ||
            "fixed",

          priority:
            $(
              ".bill-priority",
              entry
            )?.value ||
            "essential",

          dueDate:
            dateKey(
              $(
                ".bill-due-date",
                entry
              )?.value
            )
        })
      );
  }


  function getLivingSettings() {
    return {
      groceries: {
        amount:
          numberValue(
            getValue(
              "groceryAmount"
            )
          ),

        mode:
          getValue(
            "groceryMode"
          ) ||
          "total",

        modeText:
          getSelectText(
            "groceryMode"
          )
      },

      gas: {
        amount:
          numberValue(
            getValue(
              "gasAmount"
            )
          ),

        mode:
          getValue(
            "gasMode"
          ) ||
          "total",

        modeText:
          getSelectText(
            "gasMode"
          )
      },

      other: {
        amount:
          numberValue(
            getValue(
              "otherAmount"
            )
          ),

        mode:
          getValue(
            "otherMode"
          ) ||
          "total",

        modeText:
          getSelectText(
            "otherMode"
          )
      }
    };
  }


  /* =======================================================
     CURRENT PLAN END
  ======================================================= */

  function determineCurrentPeriod() {
    const paychecks =
      getPlannerPaychecks();

    if (
      !paychecks.length
    ) {
      return null;
    }

    const first =
      parseLocalDate(
        paychecks[0].date
      );

    const last =
      parseLocalDate(
        paychecks[
          paychecks.length - 1
        ].date
      );

    if (
      !first ||
      !last
    ) {
      return null;
    }

    /*
      Match the recurring-planner behavior:
      the planning period extends 13 days beyond
      the final paycheck currently in My Plan.
    */

    const end =
      addDays(
        last,
        13
      );

    return {
      start:
        first,

      end,

      paychecks
    };
  }


  /* =======================================================
     DETERMINE NEXT PERIOD
  ======================================================= */

  function determineNextPeriod(
    currentPeriod
  ) {
    if (!currentPeriod) {
      return null;
    }

    /*
      Start the NEXT period on the day after the
      current planning period ends.
    */

    const nextStart =
      addDays(
        currentPeriod.end,
        1
      );

    /*
      Use the same overall length as the current
      planning period.

      Example:
      Current period = 28 days
      Next period = another 28-day window.

      This makes rollover adaptive instead of
      assuming everyone budgets monthly.
    */

    let length =
      daysBetween(
        currentPeriod.start,
        currentPeriod.end
      );

    /*
      Keep strange test data from creating an
      unusably short/long preview.
    */

    if (
      length < 13
    ) {
      length = 27;
    }

    if (
      length > 62
    ) {
      length = 30;
    }

    const nextEnd =
      addDays(
        nextStart,
        length
      );

    return {
      start:
        nextStart,

      end:
        nextEnd,

      length
    };
  }


  /* =======================================================
     ENDING BALANCE
  ======================================================= */

  function getEndingBalance() {
    /*
      Preferred source:
      latestPlannerData generated by the optimizer.

      The existing planner already calculates the
      complete plan. We should reuse that answer
      instead of independently recreating the entire
      optimizer here.
    */

    const planner =
      window.latestPlannerData;

    if (planner) {

      /*
        Check likely ending-balance fields first.
      */

      const directCandidates = [
        planner.endingBalance,
        planner.forecastEndingBalance,
        planner.finalBalance,
        planner.safeRemaining
      ];

      for (
        const candidate of
        directCandidates
      ) {
        const parsed =
          Number(candidate);

        if (
          Number.isFinite(parsed)
        ) {
          return {
            amount:
              parsed,

            source:
              "optimized"
          };
        }
      }


      /*
        If per-paycheck results contain a final
        running balance, use the last one.
      */

      const possibleArrays = [
        planner.results,
        planner.paycheckResults,
        planner.weeks,
        planner.plan
      ];

      for (
        const array of
        possibleArrays
      ) {
        if (
          Array.isArray(array) &&
          array.length
        ) {
          const last =
            array[
              array.length - 1
            ];

          const candidates = [
            last?.runningBalance,
            last?.endingBalance,
            last?.balance,
            last?.remaining
          ];

          for (
            const candidate of
            candidates
          ) {
            const parsed =
              Number(candidate);

            if (
              Number.isFinite(parsed)
            ) {
              return {
                amount:
                  parsed,

                source:
                  "optimized"
              };
            }
          }
        }
      }
    }


    /*
      Fallback calculation.

      This is only used when the user has not generated
      an optimized plan or the planner result structure
      does not expose the ending balance.

      Starting money
      + paychecks
      - bills
      - living expenses
    */

    const starting =
      numberValue(
        getValue(
          "startingBalance"
        )
      );

    const paychecks =
      getPlannerPaychecks();

    const bills =
      getPlannerBills();

    const living =
      getLivingSettings();


    const income =
      paychecks.reduce(
        (
          sum,
          item
        ) =>
          sum +
          item.amount,
        0
      );


    const billsTotal =
      bills.reduce(
        (
          sum,
          item
        ) =>
          sum +
          item.amount,
        0
      );


    const paycheckCount =
      Math.max(
        1,
        paychecks.length
      );


    function livingTotal(
      item
    ) {
      if (
        item.mode ===
        "perPaycheck" ||
        item.mode ===
        "per_paycheck" ||
        item.mode ===
        "paycheck"
      ) {
        return (
          item.amount *
          paycheckCount
        );
      }

      return item.amount;
    }


    const livingTotalAmount =
      livingTotal(
        living.groceries
      ) +
      livingTotal(
        living.gas
      ) +
      livingTotal(
        living.other
      );


    return {
      amount:
        starting +
        income -
        billsTotal -
        livingTotalAmount,

      source:
        "calculated"
    };
  }


  /* =======================================================
     RECURRING API
  ======================================================= */

  function getRecurringAPI() {
    return (
      window
        .StretchMyCheckRecurring ||
      null
    );
  }


  async function refreshRecurring() {
    const api =
      getRecurringAPI();

    if (!api) {
      return false;
    }

    if (
      typeof api.refresh ===
      "function"
    ) {
      try {
        await api.refresh();

      } catch (error) {
        console.error(
          "Rollover recurring refresh failed:",
          error
        );
      }
    }

    return true;
  }


  /* =======================================================
     RECURRING OCCURRENCES
  ======================================================= */

  function collectNextRecurring(
    start,
    end
  ) {
    const api =
      getRecurringAPI();

    if (!api) {
      return [];
    }


    const results = [];


    const incomes =
      typeof api.getIncome ===
      "function"
        ? api.getIncome()
        : [];


    const expenses =
      typeof api.getExpenses ===
      "function"
        ? api.getExpenses()
        : [];


    incomes.forEach(
      item => {

        if (
          item.active ===
          false
        ) {
          return;
        }

        if (
          typeof api
            .getIncomeOccurrences !==
          "function"
        ) {
          return;
        }


        const dates =
          api.getIncomeOccurrences(
            item,
            dateKey(start),
            dateKey(end)
          ) || [];


        dates.forEach(
          date => {

            results.push({
              kind:
                "income",

              sourceId:
                item.id,

              name:
                item.income_name ||
                item.item_name ||
                "Recurring Income",

              amount:
                numberValue(
                  item.amount
                ),

              date:
                dateKey(date),

              frequency:
                item.frequency ||
                "",

              recurring:
                item
            });

          }
        );

      }
    );


    expenses.forEach(
      item => {

        if (
          item.active ===
          false
        ) {
          return;
        }

        if (
          typeof api
            .getExpenseOccurrences !==
          "function"
        ) {
          return;
        }


        const dates =
          api.getExpenseOccurrences(
            item,
            dateKey(start),
            dateKey(end)
          ) || [];


        dates.forEach(
          date => {

            results.push({
              kind:
                "expense",

              sourceId:
                item.id,

              name:
                item.expense_name ||
                item.item_name ||
                "Recurring Expense",

              amount:
                numberValue(
                  item.amount
                ),

              date:
                dateKey(date),

              frequency:
                item.frequency ||
                "",

              expenseType:
                item.expense_type ||
                item.bill_type ||
                "fixed",

              priority:
                item.priority ||
                item.bill_priority ||
                "essential",

              recurring:
                item
            });

          }
        );

      }
    );


    return results.sort(
      (a, b) => {

        const dateCompare =
          parseLocalDate(
            a.date
          ) -
          parseLocalDate(
            b.date
          );

        if (
          dateCompare !== 0
        ) {
          return dateCompare;
        }


        if (
          a.kind !==
          b.kind
        ) {
          return (
            a.kind ===
            "income"
              ? -1
              : 1
          );
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
  }


  /* =======================================================
     BUILD PREVIEW
  ======================================================= */

  async function buildPreview() {
    await refreshRecurring();

    const currentPeriod =
      determineCurrentPeriod();

    if (!currentPeriod) {
      return {
        error:
          "Add at least one dated paycheck to My Plan before preparing the next plan."
      };
    }


    const nextPeriod =
      determineNextPeriod(
        currentPeriod
      );


    if (!nextPeriod) {
      return {
        error:
          "Stretch My Check could not determine the next planning period."
      };
    }


    const ending =
      getEndingBalance();


    const protectedCushion =
      numberValue(
        getValue(
          "protectedCushion"
        )
      );


    const living =
      getLivingSettings();


    const recurring =
      collectNextRecurring(
        nextPeriod.start,
        nextPeriod.end
      );


    const income =
      recurring.filter(
        item =>
          item.kind ===
          "income"
      );


    const expenses =
      recurring.filter(
        item =>
          item.kind ===
          "expense"
      );


    const recurringIncome =
      income.reduce(
        (
          sum,
          item
        ) =>
          sum +
          item.amount,
        0
      );


    const recurringExpenses =
      expenses.reduce(
        (
          sum,
          item
        ) =>
          sum +
          item.amount,
        0
      );


    /*
      This is NOT the final optimized ending balance
      for the next plan.

      It is simply the starting rollover + known
      recurring money in/out before the next planner
      optimization runs.
    */

    const preliminaryRoom =
      ending.amount +
      recurringIncome -
      recurringExpenses;


    return {
      error: null,

      currentPeriod,

      nextPeriod,

      carriedBalance:
        ending.amount,

      carriedBalanceSource:
        ending.source,

      protectedCushion,

      living,

      recurring,

      income,

      expenses,

      recurringIncome,

      recurringExpenses,

      preliminaryRoom,

      oneTimeBillsExcluded:
        getPlannerBills()
          .filter(
            bill =>
              String(
                bill.name ||
                ""
              ).trim()
          )
    };
  }


  /* =======================================================
     MAIN CARD
  ======================================================= */

  function getPlanPage() {
    return (
      $("#smcPlanPage") ||
      $(
        '#smcAppShell [data-page-name="plan"]'
      )
    );
  }


  function findInsertPoint(
    planPage
  ) {
    /*
      Put Next Plan directly after the working
      Recurring Finances integration card.
    */

    const recurringCard =
      $("#smcRecurringPlannerCard");

    if (
      recurringCard &&
      recurringCard.parentElement ===
      planPage
    ) {
      return {
        type:
          "after",

        element:
          recurringCard
      };
    }


    const heading =
      $(
        ".smc-page-heading",
        planPage
      );


    if (heading) {
      return {
        type:
          "after",

        element:
          heading
      };
    }


    return {
      type:
        "prepend",

      element:
        planPage
    };
  }


  function buildCard() {
    const planPage =
      getPlanPage();

    if (!planPage) {
      return false;
    }


    rolloverCard =
      $("#smcRolloverCard");

    if (rolloverCard) {
      return true;
    }


    rolloverCard =
      document.createElement(
        "section"
      );

    rolloverCard.id =
      "smcRolloverCard";


    rolloverCard.innerHTML = `

<div class="smc-roll-card">

  <div class="smc-roll-card-top">

    <div>

      <div class="smc-roll-eyebrow">
        Plan Ahead
      </div>

      <h2 class="smc-roll-title">
        Prepare Your Next Plan
      </h2>

      <p class="smc-roll-description">
        See what your next payday period could look like using your ending balance and recurring finances.
      </p>

    </div>


    <button
      id="smcRolloverPreviewButton"
      class="smc-roll-button"
      type="button"
    >
      Preview Next Plan
    </button>

  </div>


  <div class="smc-roll-mini-grid">

    <div class="smc-roll-mini">

      <div class="smc-roll-mini-label">
        Carry Forward
      </div>

      <div
        id="smcRolloverCarryMini"
        class="smc-roll-mini-value good"
      >
        —
      </div>

    </div>


    <div class="smc-roll-mini">

      <div class="smc-roll-mini-label">
        Protected Cushion
      </div>

      <div
        id="smcRolloverCushionMini"
        class="smc-roll-mini-value"
      >
        —
      </div>

    </div>


    <div class="smc-roll-mini">

      <div class="smc-roll-mini-label">
        Next Period
      </div>

      <div
        id="smcRolloverPeriodMini"
        class="smc-roll-mini-value"
      >
        —
      </div>

    </div>

  </div>


  <div class="smc-roll-help">

    <span class="smc-roll-help-icon">
      ✓
    </span>

    <span>
      Preview only — your current plan will not be changed.
    </span>

  </div>

</div>
`;


    const point =
      findInsertPoint(
        planPage
      );


    if (
      point.type ===
      "after"
    ) {
      point.element.insertAdjacentElement(
        "afterend",
        rolloverCard
      );

    } else {
      planPage.prepend(
        rolloverCard
      );
    }


    $(
      "#smcRolloverPreviewButton"
    )?.addEventListener(
      "click",
      openPreview
    );


    refreshCard();

    return true;
  }


  /* =======================================================
     REFRESH CARD
  ======================================================= */

  function refreshCard() {
    if (!rolloverCard) {
      return;
    }


    const current =
      determineCurrentPeriod();


    const carry =
      getEndingBalance();


    const cushion =
      numberValue(
        getValue(
          "protectedCushion"
        )
      );


    const carryEl =
      $("#smcRolloverCarryMini");

    const cushionEl =
      $("#smcRolloverCushionMini");

    const periodEl =
      $("#smcRolloverPeriodMini");


    if (carryEl) {
      carryEl.textContent =
        money(
          carry.amount
        );
    }


    if (cushionEl) {
      cushionEl.textContent =
        money(
          cushion
        );
    }


    if (
      periodEl &&
      current
    ) {
      const next =
        determineNextPeriod(
          current
        );

      periodEl.textContent =
        next
          ? `${displayDate(
              next.start
            )} – ${displayDate(
              next.end
            )}`
          : "—";
    }


    if (
      periodEl &&
      !current
    ) {
      periodEl.textContent =
        "Add paychecks first";
    }
  }


  /* =======================================================
     MODAL
  ======================================================= */

  function buildModal() {
    rolloverModal =
      $("#smcRolloverModal");

    if (rolloverModal) {
      return true;
    }


    rolloverModal =
      document.createElement(
        "div"
      );

    rolloverModal.id =
      "smcRolloverModal";

    rolloverModal.className =
      "smc-roll-modal-bg";

    rolloverModal.setAttribute(
      "aria-hidden",
      "true"
    );


    rolloverModal.innerHTML = `

<div
  class="smc-roll-modal"
  role="dialog"
  aria-modal="true"
  aria-labelledby="smcRolloverModalTitle"
>

  <div class="smc-roll-modal-head">

    <div>

      <h2 id="smcRolloverModalTitle">
        Preview Your Next Plan
      </h2>

      <p>
        Review what Stretch My Check would carry into your next planning period.
      </p>

    </div>


    <button
      id="smcRolloverClose"
      class="smc-roll-close"
      type="button"
      aria-label="Close"
    >
      ×
    </button>

  </div>


  <div id="smcRolloverPreviewBody">
  </div>


  <div class="smc-roll-actions">

    <div class="smc-roll-actions-note">
      Preview mode — nothing will be saved yet.
    </div>


    <div class="smc-roll-actions-right">

      <button
        id="smcRolloverCancel"
        class="smc-roll-secondary"
        type="button"
      >
        Close
      </button>


      <button
        class="smc-roll-disabled-create"
        type="button"
        disabled
        title="We'll enable this after the preview passes testing."
      >
        Create Next Plan
      </button>

    </div>

  </div>

</div>
`;


    document.body
      .appendChild(
        rolloverModal
      );


    $(
      "#smcRolloverClose"
    )?.addEventListener(
      "click",
      closePreview
    );


    $(
      "#smcRolloverCancel"
    )?.addEventListener(
      "click",
      closePreview
    );


    rolloverModal
      .addEventListener(
        "click",
        event => {

          if (
            event.target ===
            rolloverModal
          ) {
            closePreview();
          }

        }
      );


    return true;
  }


  function closePreview() {
    rolloverModal
      ?.classList.remove(
        "show"
      );

    rolloverModal
      ?.setAttribute(
        "aria-hidden",
        "true"
      );
  }


  /* =======================================================
     PREVIEW ITEM HTML
  ======================================================= */

  function recurringItemHTML(
    item
  ) {
    const typeText =
      item.kind ===
      "income"
        ? "Recurring income"
        : (
            item.expenseType ===
            "flexible"
              ? "Flexible recurring expense"
              : "Fixed recurring expense"
          );


    return `

<div class="smc-roll-item">

  <div class="smc-roll-item-date">
    ${escapeHTML(
      displayDate(
        item.date
      )
    )}
  </div>


  <div>

    <div class="smc-roll-item-name">
      ${escapeHTML(
        item.name
      )}
    </div>

    <div class="smc-roll-item-meta">
      ${escapeHTML(
        typeText
      )}
    </div>

  </div>


  <div
    class="smc-roll-item-amount ${item.kind}"
  >
    ${
      item.kind ===
      "income"
        ? "+"
        : "−"
    }${money(
      item.amount
    )}
  </div>

</div>
`;
  }


  /* =======================================================
     RENDER PREVIEW
  ======================================================= */

  function renderPreview(
    preview
  ) {
    const body =
      $("#smcRolloverPreviewBody");

    if (!body) {
      return;
    }


    if (
      preview.error
    ) {
      body.innerHTML = `

<div class="smc-roll-empty">

  <strong>
    Next Plan isn't ready yet.
  </strong>

  <span>
    ${escapeHTML(
      preview.error
    )}
  </span>

</div>
`;

      return;
    }


    const incomeHTML =
      preview.income.length
        ? preview.income
            .map(
              recurringItemHTML
            )
            .join("")
        : `

<div class="smc-roll-empty">

  <strong>
    No recurring income found.
  </strong>

  <span>
    There are no active recurring income occurrences inside this next planning period.
  </span>

</div>
`;


    const expenseHTML =
      preview.expenses.length
        ? preview.expenses
            .map(
              recurringItemHTML
            )
            .join("")
        : `

<div class="smc-roll-empty">

  <strong>
    No recurring expenses found.
  </strong>

  <span>
    There are no active recurring expense occurrences inside this next planning period.
  </span>

</div>
`;


    const excludedCount =
      preview
        .oneTimeBillsExcluded
        .length;


    body.innerHTML = `

<div class="smc-roll-period">

  <div>

    <div class="smc-roll-period-label">
      Current Planning Period
    </div>

    <div class="smc-roll-period-value">
      ${escapeHTML(
        displayDate(
          preview
            .currentPeriod
            .start
        )
      )}
      –
      ${escapeHTML(
        displayDate(
          preview
            .currentPeriod
            .end
        )
      )}
    </div>

  </div>


  <div class="smc-roll-period-arrow">
    →
  </div>


  <div>

    <div class="smc-roll-period-label">
      Next Planning Period
    </div>

    <div class="smc-roll-period-value">
      ${escapeHTML(
        displayDate(
          preview
            .nextPeriod
            .start
        )
      )}
      –
      ${escapeHTML(
        displayDate(
          preview
            .nextPeriod
            .end
        )
      )}
    </div>

  </div>

</div>


<div class="smc-roll-summary">

  <div class="smc-roll-summary-card">

    <div class="smc-roll-summary-label">
      Starting Rollover
    </div>

    <div class="smc-roll-summary-value teal">
      ${money(
        preview.carriedBalance
      )}
    </div>

  </div>


  <div class="smc-roll-summary-card">

    <div class="smc-roll-summary-label">
      Recurring Income
    </div>

    <div class="smc-roll-summary-value green">
      +${money(
        preview.recurringIncome
      )}
    </div>

  </div>


  <div class="smc-roll-summary-card">

    <div class="smc-roll-summary-label">
      Recurring Expenses
    </div>

    <div class="smc-roll-summary-value red">
      −${money(
        preview.recurringExpenses
      )}
    </div>

  </div>


  <div class="smc-roll-summary-card">

    <div class="smc-roll-summary-label">
      Before Living Expenses
    </div>

    <div class="smc-roll-summary-value">
      ${money(
        preview.preliminaryRoom
      )}
    </div>

  </div>

</div>


<div class="smc-roll-section">

  <div class="smc-roll-section-head">

    <div>

      <h3 class="smc-roll-section-title">
        Recurring Income
      </h3>

      <div class="smc-roll-section-sub">
        Paychecks and other repeating income scheduled for the next period.
      </div>

    </div>

    <div class="smc-roll-count">
      ${preview.income.length}
      ${
        preview.income.length ===
        1
          ? "item"
          : "items"
      }
    </div>

  </div>


  <div class="smc-roll-items">
    ${incomeHTML}
  </div>

</div>


<div class="smc-roll-section">

  <div class="smc-roll-section-head">

    <div>

      <h3 class="smc-roll-section-title">
        Recurring Expenses
      </h3>

      <div class="smc-roll-section-sub">
        Only repeating expenses are brought into the next plan.
      </div>

    </div>

    <div class="smc-roll-count">
      ${preview.expenses.length}
      ${
        preview.expenses.length ===
        1
          ? "item"
          : "items"
      }
    </div>

  </div>


  <div class="smc-roll-items">
    ${expenseHTML}
  </div>

</div>


<div class="smc-roll-section">

  <div class="smc-roll-section-head">

    <div>

      <h3 class="smc-roll-section-title">
        Settings Carried Forward
      </h3>

      <div class="smc-roll-section-sub">
        These planning preferences would stay the same in your next plan.
      </div>

    </div>

  </div>


  <div class="smc-roll-settings">

    <div class="smc-roll-setting">

      <span class="smc-roll-setting-name">
        Protected Cushion
      </span>

      <strong class="smc-roll-setting-value">
        ${money(
          preview.protectedCushion
        )}
      </strong>

    </div>


    <div class="smc-roll-setting">

      <span class="smc-roll-setting-name">
        Groceries
      </span>

      <strong class="smc-roll-setting-value">
        ${money(
          preview.living
            .groceries
            .amount
        )}
        ${
          preview.living
            .groceries
            .modeText
            ? ` • ${escapeHTML(
                preview.living
                  .groceries
                  .modeText
              )}`
            : ""
        }
      </strong>

    </div>


    <div class="smc-roll-setting">

      <span class="smc-roll-setting-name">
        Gas
      </span>

      <strong class="smc-roll-setting-value">
        ${money(
          preview.living
            .gas
            .amount
        )}
        ${
          preview.living
            .gas
            .modeText
            ? ` • ${escapeHTML(
                preview.living
                  .gas
                  .modeText
              )}`
            : ""
        }
      </strong>

    </div>


    <div class="smc-roll-setting">

      <span class="smc-roll-setting-name">
        Other Living Expenses
      </span>

      <strong class="smc-roll-setting-value">
        ${money(
          preview.living
            .other
            .amount
        )}
        ${
          preview.living
            .other
            .modeText
            ? ` • ${escapeHTML(
                preview.living
                  .other
                  .modeText
              )}`
            : ""
        }
      </strong>

    </div>

  </div>

</div>


<div class="smc-roll-notice">

  <div class="smc-roll-notice-icon">
    ↻
  </div>

  <div>

    <strong>
      One-time bills stay behind.
    </strong>

    <span>
      ${excludedCount}
      ${
        excludedCount === 1
          ? "bill currently in this plan is"
          : "bills currently in this plan are"
      }
      not automatically copied forward. Only items saved in Recurring Finances appear in the next-plan preview.
    </span>

  </div>

</div>
`;
  }


  /* =======================================================
     OPEN PREVIEW
  ======================================================= */

  async function openPreview() {
    const button =
      $(
        "#smcRolloverPreviewButton"
      );


    if (button) {
      button.disabled =
        true;

      button.textContent =
        "Building Preview...";
    }


    try {

      /*
        Let any recent planner changes settle.
      */

      await wait(100);


      currentPreview =
        await buildPreview();


      renderPreview(
        currentPreview
      );


      rolloverModal
        .classList.add(
          "show"
        );


      rolloverModal
        .setAttribute(
          "aria-hidden",
          "false"
        );


    } catch (error) {

      console.error(
        "Next Plan preview failed:",
        error
      );


      currentPreview = {
        error:
          error?.message ||
          "Stretch My Check could not build the next-plan preview."
      };


      renderPreview(
        currentPreview
      );


      rolloverModal
        .classList.add(
          "show"
        );


      rolloverModal
        .setAttribute(
          "aria-hidden",
          "false"
        );

    } finally {

      if (button) {
        button.disabled =
          false;

        button.textContent =
          "Preview Next Plan";
      }

    }
  }


  /* =======================================================
     LIVE REFRESH
  ======================================================= */

  function scheduleRefresh() {
    window.setTimeout(
      refreshCard,
      100
    );
  }


  window.addEventListener(
    "stretchmycheck:plan-loaded",
    scheduleRefresh
  );


  window.addEventListener(
    "stretchmycheck:recurring-imported",
    scheduleRefresh
  );


  window.addEventListener(
    "stretchmycheck:plan-auto-saved",
    scheduleRefresh
  );


  window.addEventListener(
    "stretchmycheck:recurring-updated",
    scheduleRefresh
  );


  /*
    Refresh when planner inputs change.
  */

  document.addEventListener(
    "change",
    event => {

      if (
        event.target.closest(
          "#smcPlanPage"
        )
      ) {
        scheduleRefresh();
      }

    }
  );


  /* =======================================================
     INITIALIZE
  ======================================================= */

  async function init() {
    if (initialized) {
      return true;
    }


    installStyles();


    const cardReady =
      buildCard();


    const modalReady =
      buildModal();


    if (
      !cardReady ||
      !modalReady
    ) {
      return false;
    }


    initialized =
      true;


    await refreshRecurring();


    refreshCard();


    console.info(
      "Stretch My Check Next Plan preview ready."
    );


    return true;
  }


  function waitForApp() {
    init()
      .then(
        success => {

          if (success) {
            return;
          }


          const observer =
            new MutationObserver(
              async () => {

                const ready =
                  await init();


                if (ready) {
                  observer.disconnect();
                }

              }
            );


          observer.observe(
            document.documentElement,
            {
              childList: true,
              subtree: true
            }
          );


          window.setTimeout(
            async () => {

              if (!initialized) {
                await init();
              }

            },
            1600
          );

        }
      );
  }


  /* =======================================================
     PUBLIC API
  ======================================================= */

  window.StretchMyCheckRollover = {

    refresh:
      refreshCard,

    preview:
      openPreview,

    getPreview:
      () =>
        currentPreview
          ? structuredClone(
              currentPreview
            )
          : null,

    calculate:
      buildPreview
  };


  /* =======================================================
     START
  ======================================================= */

  waitForApp();

})();