(() => {
"use strict";

/*
  Stretch My Check
  Recurring Finances -> My Plan Integration

  Purpose:
  - Adds a Recurring Finances card to My Plan.
  - Reads recurring items from window.StretchMyCheckRecurring.
  - Determines the current planner date range.
  - Previews recurring items before importing.
  - Imports recurring income as paychecks.
  - Imports recurring expenses as bills.
  - Prevents duplicate imports.
  - Does not modify Goals or Debt Payoff.
*/

const $ = (selector, root = document) =>
  root.querySelector(selector);

const $$ = (selector, root = document) =>
  [...root.querySelectorAll(selector)];

let integrationCard = null;
let previewModal = null;
let previewItems = [];
let initialized = false;


/* =========================================================
   BASIC HELPERS
========================================================= */

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


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


function parseLocalDate(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return new Date(
      value.getFullYear(),
      value.getMonth(),
      value.getDate()
    );
  }

  const parts =
    String(value)
      .split("-")
      .map(Number);

  if (
    parts.length === 3 &&
    parts.every(Number.isFinite)
  ) {
    return new Date(
      parts[0],
      parts[1] - 1,
      parts[2]
    );
  }

  const date =
    new Date(value);

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

  return `${year}-${month}-${day}`;
}


function displayDate(value) {
  const date =
    parseLocalDate(value);

  if (!date) {
    return "";
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


function today() {
  const date =
    new Date();

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
}


function addDays(
  date,
  amount
) {
  const copy =
    new Date(date);

  copy.setDate(
    copy.getDate() +
    amount
  );

  return copy;
}


/* =========================================================
   STYLES
========================================================= */

function installStyles() {
  if (
    $("#smcRecurringPlannerStyles")
  ) {
    return;
  }

  const style =
    document.createElement(
      "style"
    );

  style.id =
    "smcRecurringPlannerStyles";

  style.textContent = `
#smcRecurringPlannerCard {
  margin-bottom: 24px;
}

.smc-rp-card {
  position: relative;

  overflow: hidden;

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

  color: #f4f8fa;

  padding: 22px;
}

.smc-rp-card::before {
  content: "";

  position: absolute;

  left: 0;
  top: 0;
  bottom: 0;

  width: 3px;

  background:
    linear-gradient(
      180deg,
      #42e1c0,
      #1d9287
    );
}

.smc-rp-top {
  display: flex;

  align-items: center;

  justify-content:
    space-between;

  gap: 20px;
}

.smc-rp-title-wrap {
  min-width: 0;
}

.smc-rp-eyebrow {
  color: #50dfc2;

  font-size: 11px;

  font-weight: 800;

  letter-spacing: .07em;

  text-transform: uppercase;

  margin-bottom: 7px;
}

.smc-rp-title {
  margin: 0;

  color: #ffffff;

  font-size: 19px;

  line-height: 1.25;

  font-weight: 850;
}

.smc-rp-description {
  margin:
    7px 0 0;

  color: #a9bdc6;

  font-size: 12px;

  line-height: 1.55;
}

.smc-rp-button {
  flex: 0 0 auto;

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

  font-weight: 800;

  padding:
    10px 16px;

  cursor: pointer;

  transition:
    transform .15s ease,
    filter .15s ease;
}

.smc-rp-button:hover {
  transform:
    translateY(-1px);

  filter:
    brightness(1.08);
}

.smc-rp-button:disabled {
  cursor: not-allowed;

  opacity: .55;

  transform: none;
}

.smc-rp-stats {
  display: grid;

  grid-template-columns:
    repeat(
      3,
      minmax(0, 1fr)
    );

  gap: 12px;

  margin-top: 18px;
}

.smc-rp-stat {
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

.smc-rp-stat-label {
  color: #94aab4;

  font-size: 10px;

  font-weight: 750;

  margin-bottom: 6px;
}

.smc-rp-stat-value {
  color: #f7fbfc;

  font-size: 14px;

  font-weight: 820;
}

.smc-rp-stat-value.income {
  color: #58e5b0;
}

.smc-rp-stat-value.expense {
  color: #ff9297;
}

.smc-rp-help {
  display: flex;

  align-items: center;

  gap: 8px;

  margin-top: 15px;

  color: #8fa6b1;

  font-size: 11px;

  line-height: 1.45;
}

.smc-rp-help-icon {
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


/* MODAL */

.smc-rp-modal-bg {
  position: fixed;

  inset: 0;

  z-index: 14000;

  display: none;

  align-items: center;

  justify-content: center;

  padding: 20px;

  background:
    rgba(
      1,
      7,
      11,
      .80
    );

  backdrop-filter:
    blur(8px);
}

.smc-rp-modal-bg.show {
  display: flex;
}

.smc-rp-modal {
  width:
    min(
      760px,
      100%
    );

  max-height:
    calc(
      100vh - 40px
    );

  overflow: auto;

  box-sizing:
    border-box;

  padding: 24px;

  border:
    1px solid
    rgba(
      132,
      175,
      192,
      .20
    );

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
      .40
    );
}

.smc-rp-modal-head {
  display: flex;

  align-items: flex-start;

  justify-content:
    space-between;

  gap: 20px;

  margin-bottom: 20px;
}

.smc-rp-modal-head h2 {
  margin: 0;

  color: #ffffff;

  font-size: 21px;
}

.smc-rp-modal-head p {
  margin:
    7px 0 0;

  color: #9eb2bc;

  font-size: 12px;

  line-height: 1.5;
}

.smc-rp-close {
  width: 36px;

  height: 36px;

  flex: 0 0 36px;

  border:
    1px solid
    rgba(
      132,
      175,
      192,
      .18
    );

  border-radius: 50%;

  background: #132731;

  color: #dce7eb;

  font-size: 20px;

  cursor: pointer;
}

.smc-rp-range {
  display: flex;

  justify-content:
    space-between;

  gap: 15px;

  padding:
    14px 15px;

  margin-bottom: 16px;

  border:
    1px solid
    rgba(
      132,
      175,
      192,
      .12
    );

  border-radius: 13px;

  background:
    rgba(
      5,
      20,
      27,
      .48
    );
}

.smc-rp-range span {
  color: #9eb2bc;

  font-size: 11px;
}

.smc-rp-range strong {
  color: #ffffff;

  font-size: 12px;
}

.smc-rp-preview-list {
  display: grid;

  gap: 10px;
}

.smc-rp-preview-item {
  display: grid;

  grid-template-columns:
    34px
    minmax(0, 1fr)
    auto;

  gap: 12px;

  align-items: center;

  padding:
    13px 14px;

  border:
    1px solid
    rgba(
      132,
      175,
      192,
      .13
    );

  border-radius: 13px;

  background: #10222c;
}

.smc-rp-preview-item.duplicate {
  opacity: .58;
}

.smc-rp-check {
  width: 18px;

  height: 18px;

  accent-color: #29b7a5;

  cursor: pointer;
}

.smc-rp-item-name {
  color: #ffffff;

  font-size: 13px;

  font-weight: 800;
}

.smc-rp-item-meta {
  margin-top: 4px;

  color: #98adb7;

  font-size: 10px;
}

.smc-rp-item-amount {
  text-align: right;

  font-size: 14px;

  font-weight: 850;
}

.smc-rp-item-amount.income {
  color: #58e5b0;
}

.smc-rp-item-amount.expense {
  color: #ff9297;
}

.smc-rp-duplicate {
  display: inline-block;

  margin-left: 7px;

  padding:
    2px 6px;

  border:
    1px solid
    rgba(
      255,
      184,
      91,
      .24
    );

  border-radius: 999px;

  color: #ffc37e;

  font-size: 8px;

  font-weight: 800;

  vertical-align: middle;
}

.smc-rp-empty {
  padding:
    30px 20px;

  border:
    1px solid
    rgba(
      132,
      175,
      192,
      .13
    );

  border-radius: 14px;

  background:
    rgba(
      5,
      20,
      27,
      .48
    );

  text-align: center;
}

.smc-rp-empty strong {
  display: block;

  color: #ffffff;

  font-size: 14px;

  margin-bottom: 7px;
}

.smc-rp-empty span {
  color: #9eb2bc;

  font-size: 11px;

  line-height: 1.5;
}

.smc-rp-message {
  display: none;

  margin-top: 15px;

  padding:
    11px 13px;

  border:
    1px solid
    rgba(
      69,
      225,
      192,
      .20
    );

  border-radius: 11px;

  background:
    rgba(
      31,
      119,
      107,
      .12
    );

  color: #a9eee1;

  font-size: 11px;

  line-height: 1.45;
}

.smc-rp-message.show {
  display: block;
}

.smc-rp-modal-actions {
  display: flex;

  align-items: center;

  justify-content:
    space-between;

  gap: 12px;

  margin-top: 20px;
}

.smc-rp-modal-actions-left {
  color: #91a7b1;

  font-size: 10px;
}

.smc-rp-modal-actions-right {
  display: flex;

  gap: 9px;

  margin-left: auto;
}

.smc-rp-secondary {
  border:
    1px solid
    rgba(
      132,
      175,
      192,
      .20
    );

  border-radius: 999px;

  background: #142731;

  color: #dce8ec;

  padding:
    9px 15px;

  font-size: 12px;

  font-weight: 750;

  cursor: pointer;
}

.smc-rp-primary {
  border:
    1px solid
    rgba(
      69,
      225,
      192,
      .35
    );

  border-radius: 999px;

  background:
    linear-gradient(
      90deg,
      #187b74,
      #258f87
    );

  color: #ffffff;

  padding:
    9px 16px;

  font-size: 12px;

  font-weight: 800;

  cursor: pointer;
}

.smc-rp-primary:disabled {
  opacity: .5;

  cursor: not-allowed;
}

@media (
  max-width: 760px
) {
  .smc-rp-top {
    align-items:
      flex-start;

    flex-direction:
      column;
  }

  .smc-rp-button {
    width: 100%;
  }

  .smc-rp-stats {
    grid-template-columns:
      1fr;
  }

  .smc-rp-preview-item {
    grid-template-columns:
      28px
      minmax(0, 1fr);
  }

  .smc-rp-item-amount {
    grid-column: 2;

    text-align: left;
  }

  .smc-rp-range {
    flex-direction:
      column;
  }

  .smc-rp-modal-actions {
    align-items:
      stretch;

    flex-direction:
      column;
  }

  .smc-rp-modal-actions-right {
    width: 100%;

    margin-left: 0;
  }

  .smc-rp-secondary,
  .smc-rp-primary {
    flex: 1;
  }
}
`;

  document.head
    .appendChild(style);
}


/* =========================================================
   FIND MY PLAN PAGE
========================================================= */

function getPlanPage() {
  return (
    $("#smcPlanPage") ||
    $(
      '#smcAppShell [data-page-name="plan"]'
    )
  );
}


function getPlanHeading(
  planPage
) {
  if (!planPage) {
    return null;
  }

  return (
    $(
      ".smc-page-heading",
      planPage
    ) ||
    planPage.firstElementChild
  );
}


/* =========================================================
   PLANNER DATE RANGE
========================================================= */

function collectPlannerPaycheckDates() {
  return $$(".paycheck-entry")
    .map(entry => {
      const input =
        $(
          ".paycheck-date",
          entry
        );

      return parseLocalDate(
        input?.value
      );
    })
    .filter(Boolean)
    .sort(
      (a, b) =>
        a - b
    );
}


function getPlanningRange() {
  const paycheckDates =
    collectPlannerPaycheckDates();

  const now =
    today();

  /*
    If the planner already has paychecks,
    use those dates as the planning window.

    Give the end a small extension so bills
    immediately after the final paycheck can
    still be considered.
  */

  if (
    paycheckDates.length
  ) {
    const first =
      paycheckDates[0];

    const last =
      paycheckDates[
        paycheckDates.length - 1
      ];

    return {
      start:
        first < now
          ? now
          : first,

      end:
        addDays(
          last,
          13
        ),

      source:
        "planner"
    };
  }

  /*
    If there are no paycheck dates yet,
    use today through 45 days ahead.

    This lets recurring income populate
    an empty plan.
  */

  return {
    start:
      now,

    end:
      addDays(
        now,
        45
      ),

    source:
      "default"
  };
}


/* =========================================================
   EXISTING PLANNER DATA
========================================================= */

function existingPaychecks() {
  return $$(".paycheck-entry")
    .map(entry => ({
      name:
        String(
          $(
            ".paycheck-name",
            entry
          )?.value ||
          ""
        )
          .trim()
          .toLowerCase(),

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
    }));
}


function existingBills() {
  return $$(".bill-entry")
    .map(entry => ({
      name:
        String(
          $(
            ".bill-name",
            entry
          )?.value ||
          ""
        )
          .trim()
          .toLowerCase(),

      date:
        dateKey(
          $(
            ".bill-due-date",
            entry
          )?.value
        ),

      amount:
        numberValue(
          $(
            ".bill-amount",
            entry
          )?.value
        )
    }));
}


function amountsMatch(
  a,
  b
) {
  return (
    Math.abs(
      numberValue(a) -
      numberValue(b)
    ) <
    0.005
  );
}


function isDuplicate(
  item
) {
  if (
    item.kind ===
    "income"
  ) {
    return existingPaychecks()
      .some(existing =>
        existing.name ===
          String(
            item.name
          )
            .trim()
            .toLowerCase() &&
        existing.date ===
          dateKey(
            item.date
          ) &&
        amountsMatch(
          existing.amount,
          item.amount
        )
      );
  }

  return existingBills()
    .some(existing =>
      existing.name ===
        String(
          item.name
        )
          .trim()
          .toLowerCase() &&
      existing.date ===
        dateKey(
          item.date
        ) &&
      amountsMatch(
        existing.amount,
        item.amount
      )
    );
}


/* =========================================================
   GET RECURRING ITEMS
========================================================= */

function getRecurringAPI() {
  return (
    window
      .StretchMyCheckRecurring ||
    null
  );
}


async function ensureRecurringLoaded() {
  const api =
    getRecurringAPI();

  if (
    !api
  ) {
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
        "Recurring Planner refresh failed:",
        error
      );
    }
  }

  return true;
}


function collectRecurringForRange(
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

  incomes.forEach(item => {
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

    dates.forEach(date => {
      results.push({
        key:
          `income:${item.id}:${date}`,

        kind:
          "income",

        sourceId:
          item.id,

        name:
          item.income_name,

        amount:
          numberValue(
            item.amount
          ),

        date:
          dateKey(date),

        frequency:
          item.frequency,

        recurring:
          item
      });
    });
  });

  expenses.forEach(item => {
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

    dates.forEach(date => {
      results.push({
        key:
          `expense:${item.id}:${date}`,

        kind:
          "expense",

        sourceId:
          item.id,

        name:
          item.expense_name,

        amount:
          numberValue(
            item.amount
          ),

        date:
          dateKey(date),

        frequency:
          item.frequency,

        expenseType:
          item.expense_type ||
          "fixed",

        priority:
          item.priority ||
          "essential",

        recurring:
          item
      });
    });
  });

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
}


/* =========================================================
   CARD
========================================================= */

function buildCard() {
  const planPage =
    getPlanPage();

  if (!planPage) {
    return false;
  }

  integrationCard =
    $("#smcRecurringPlannerCard");

  if (
    integrationCard
  ) {
    return true;
  }

  integrationCard =
    document.createElement(
      "section"
    );

  integrationCard.id =
    "smcRecurringPlannerCard";

  integrationCard.innerHTML = `
<div class="smc-rp-card">

  <div class="smc-rp-top">

    <div class="smc-rp-title-wrap">

      <div class="smc-rp-eyebrow">
        Save Time
      </div>

      <h2 class="smc-rp-title">
        Recurring Finances
      </h2>

      <p class="smc-rp-description">
        Pull your repeating paychecks and bills into this plan instead of entering them again.
      </p>

    </div>

    <button
      id="smcRecurringPlannerOpen"
      class="smc-rp-button"
      type="button"
    >
      Add Recurring Items
    </button>

  </div>

  <div class="smc-rp-stats">

    <div class="smc-rp-stat">
      <div class="smc-rp-stat-label">
        Active Income
      </div>

      <div
        id="smcRPIncomeCount"
        class="smc-rp-stat-value income"
      >
        0
      </div>
    </div>

    <div class="smc-rp-stat">
      <div class="smc-rp-stat-label">
        Active Expenses
      </div>

      <div
        id="smcRPExpenseCount"
        class="smc-rp-stat-value expense"
      >
        0
      </div>
    </div>

    <div class="smc-rp-stat">
      <div class="smc-rp-stat-label">
        Import Protection
      </div>

      <div class="smc-rp-stat-value">
        Duplicate Safe
      </div>
    </div>

  </div>

  <div class="smc-rp-help">
    <span class="smc-rp-help-icon">
      ✓
    </span>

    <span>
      You'll preview everything before it is added to My Plan.
    </span>
  </div>

</div>
`;

  const heading =
    getPlanHeading(
      planPage
    );

  if (
    heading &&
    heading.nextSibling
  ) {
    planPage.insertBefore(
      integrationCard,
      heading.nextSibling
    );
  } else if (
    heading
  ) {
    planPage.appendChild(
      integrationCard
    );
  } else {
    planPage.prepend(
      integrationCard
    );
  }

  $("#smcRecurringPlannerOpen")
    .addEventListener(
      "click",
      openPreview
    );

  refreshCard();

  return true;
}


/* =========================================================
   MODAL
========================================================= */

function buildModal() {
  previewModal =
    $("#smcRecurringPlannerModal");

  if (
    previewModal
  ) {
    return true;
  }

  previewModal =
    document.createElement(
      "div"
    );

  previewModal.id =
    "smcRecurringPlannerModal";

  previewModal.className =
    "smc-rp-modal-bg";

  previewModal.setAttribute(
    "aria-hidden",
    "true"
  );

  previewModal.innerHTML = `
<div
  class="smc-rp-modal"
  role="dialog"
  aria-modal="true"
  aria-labelledby="smcRPModalTitle"
>

  <div class="smc-rp-modal-head">

    <div>
      <h2 id="smcRPModalTitle">
        Add Recurring Items to My Plan
      </h2>

      <p>
        Review the upcoming repeating income and expenses below. Nothing is added until you confirm.
      </p>
    </div>

    <button
      id="smcRPClose"
      class="smc-rp-close"
      type="button"
      aria-label="Close"
    >
      ×
    </button>

  </div>

  <div
    id="smcRPRange"
    class="smc-rp-range"
  ></div>

  <div
    id="smcRPPreviewList"
    class="smc-rp-preview-list"
  ></div>

  <div
    id="smcRPMessage"
    class="smc-rp-message"
  ></div>

  <div class="smc-rp-modal-actions">

    <div
      id="smcRPSelectedText"
      class="smc-rp-modal-actions-left"
    >
    </div>

    <div class="smc-rp-modal-actions-right">

      <button
        id="smcRPCancel"
        class="smc-rp-secondary"
        type="button"
      >
        Cancel
      </button>

      <button
        id="smcRPImport"
        class="smc-rp-primary"
        type="button"
      >
        Add Selected to My Plan
      </button>

    </div>

  </div>

</div>
`;

  document.body
    .appendChild(
      previewModal
    );

  $("#smcRPClose")
    .addEventListener(
      "click",
      closePreview
    );

  $("#smcRPCancel")
    .addEventListener(
      "click",
      closePreview
    );

  $("#smcRPImport")
    .addEventListener(
      "click",
      importSelected
    );

  previewModal
    .addEventListener(
      "click",
      event => {
        if (
          event.target ===
          previewModal
        ) {
          closePreview();
        }
      }
    );

  return true;
}


function showMessage(
  text = ""
) {
  const box =
    $("#smcRPMessage");

  if (!box) {
    return;
  }

  box.textContent =
    text;

  box.classList.toggle(
    "show",
    !!text
  );
}


function closePreview() {
  previewModal
    ?.classList.remove(
      "show"
    );

  previewModal
    ?.setAttribute(
      "aria-hidden",
      "true"
    );

  previewItems = [];

  showMessage();
}


/* =========================================================
   CARD COUNTS
========================================================= */

function refreshCard() {
  const api =
    getRecurringAPI();

  if (
    !integrationCard ||
    !api
  ) {
    return;
  }

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

  const incomeCount =
    incomes.filter(
      item =>
        item.active !==
        false
    ).length;

  const expenseCount =
    expenses.filter(
      item =>
        item.active !==
        false
    ).length;

  const incomeEl =
    $("#smcRPIncomeCount");

  const expenseEl =
    $("#smcRPExpenseCount");

  if (
    incomeEl
  ) {
    incomeEl.textContent =
      incomeCount;
  }

  if (
    expenseEl
  ) {
    expenseEl.textContent =
      expenseCount;
  }
}


/* =========================================================
   OPEN PREVIEW
========================================================= */

async function openPreview() {
  showMessage();

  const button =
    $("#smcRecurringPlannerOpen");

  if (
    button
  ) {
    button.disabled =
      true;

    button.textContent =
      "Loading...";
  }

  const available =
    await ensureRecurringLoaded();

  if (
    button
  ) {
    button.disabled =
      false;

    button.textContent =
      "Add Recurring Items";
  }

  if (
    !available
  ) {
    alert(
      "Recurring Finances is not available yet. Make sure recurring.js is loaded before recurring-planner.js."
    );

    return;
  }

  refreshCard();

  const range =
    getPlanningRange();

  previewItems =
    collectRecurringForRange(
      range.start,
      range.end
    ).map(item => ({
      ...item,

      duplicate:
        isDuplicate(
          item
        )
    }));

  renderPreview(
    range
  );

  previewModal
    .classList.add(
      "show"
    );

  previewModal
    .setAttribute(
      "aria-hidden",
      "false"
    );
}


/* =========================================================
   PREVIEW RENDER
========================================================= */

function renderPreview(
  range
) {
  const rangeBox =
    $("#smcRPRange");

  const list =
    $("#smcRPPreviewList");

  const importButton =
    $("#smcRPImport");

  if (
    !rangeBox ||
    !list ||
    !importButton
  ) {
    return;
  }

  rangeBox.innerHTML = `
<div>
  <span>
    Planning period
  </span>

  <strong>
    ${escapeHTML(
      displayDate(
        range.start
      )
    )}
    –
    ${escapeHTML(
      displayDate(
        range.end
      )
    )}
  </strong>
</div>

<div>
  <span>
    Found
  </span>

  <strong>
    ${previewItems.length}
    recurring ${
      previewItems.length ===
      1
        ? "item"
        : "items"
    }
  </strong>
</div>
`;

  if (
    !previewItems.length
  ) {
    list.innerHTML = `
<div class="smc-rp-empty">

  <strong>
    Nothing recurring falls inside this planning period.
  </strong>

  <span>
    You can add or adjust recurring income and expenses from the Recurring page.
  </span>

</div>
`;

    importButton.disabled =
      true;

    updateSelectedText();

    return;
  }

  list.innerHTML =
    previewItems
      .map(
        (
          item,
          index
        ) => {
          const duplicate =
            item.duplicate;

          const typeLabel =
            item.kind ===
            "income"
              ? "Income"
              : (
                  item.expenseType ===
                  "flexible"
                    ? "Flexible Expense"
                    : "Fixed Expense"
                );

          return `
<label
  class="smc-rp-preview-item ${
    duplicate
      ? "duplicate"
      : ""
  }"
>

  <input
    class="smc-rp-check"
    type="checkbox"
    data-rp-index="${index}"
    ${
      duplicate
        ? "disabled"
        : "checked"
    }
  >

  <div>

    <div class="smc-rp-item-name">

      ${escapeHTML(
        item.name
      )}

      ${
        duplicate
          ? `
<span class="smc-rp-duplicate">
  ALREADY IN PLAN
</span>
`
          : ""
      }

    </div>

    <div class="smc-rp-item-meta">

      ${escapeHTML(
        displayDate(
          item.date
        )
      )}
      •
      ${escapeHTML(
        typeLabel
      )}

    </div>

  </div>

  <div
    class="smc-rp-item-amount ${item.kind}"
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

</label>
`;
        }
      )
      .join("");

  $$(
    ".smc-rp-check",
    list
  ).forEach(
    checkbox => {
      checkbox.addEventListener(
        "change",
        updateSelectedText
      );
    }
  );

  importButton.disabled =
    false;

  updateSelectedText();
}


function selectedItems() {
  return $$(
    "#smcRPPreviewList .smc-rp-check:checked"
  )
    .map(
      checkbox =>
        previewItems[
          Number(
            checkbox.dataset
              .rpIndex
          )
        ]
    )
    .filter(Boolean);
}


function updateSelectedText() {
  const text =
    $("#smcRPSelectedText");

  const button =
    $("#smcRPImport");

  if (
    !text ||
    !button
  ) {
    return;
  }

  const selected =
    selectedItems();

  const duplicateCount =
    previewItems.filter(
      item =>
        item.duplicate
    ).length;

  let message =
    `${selected.length} selected`;

  if (
    duplicateCount
  ) {
    message +=
      ` • ${duplicateCount} ${
        duplicateCount ===
        1
          ? "duplicate"
          : "duplicates"
      } skipped`;
  }

  text.textContent =
    message;

  button.disabled =
    selected.length ===
    0;
}


/* =========================================================
   ADD PAYCHECK TO PLANNER
========================================================= */

function addIncomeToPlanner(
  item
) {
  /*
    Preferred path:
    the existing planner already has addPaycheck().
  */

  if (
    typeof window.addPaycheck ===
    "function"
  ) {
    window.addPaycheck(
      item.name,
      item.date,
      item.amount
    );

    return true;
  }

  /*
    Some browsers/scripts may expose the function
    globally without it appearing as an own property
    of window. Try direct global resolution safely.
  */

  try {
    if (
      typeof addPaycheck ===
      "function"
    ) {
      addPaycheck(
        item.name,
        item.date,
        item.amount
      );

      return true;
    }
  } catch (_) {
    // continue to fallback
  }

  /*
    Fallback:
    click the existing Add Paycheck control,
    then fill the newest paycheck row.
  */

  const before =
    $$(".paycheck-entry")
      .length;

  const addButton =
    $("#addPaycheck") ||
    $("#addPaycheckButton") ||
    $(
      '[data-action="add-paycheck"]'
    );

  if (
    addButton
  ) {
    addButton.click();
  }

  const entries =
    $$(".paycheck-entry");

  if (
    entries.length <=
    before
  ) {
    return false;
  }

  const entry =
    entries[
      entries.length - 1
    ];

  const name =
    $(
      ".paycheck-name",
      entry
    );

  const date =
    $(
      ".paycheck-date",
      entry
    );

  const amount =
    $(
      ".paycheck-amount",
      entry
    );

  if (
    name
  ) {
    name.value =
      item.name;

    dispatchInput(
      name
    );
  }

  if (
    date
  ) {
    date.value =
      item.date;

    dispatchInput(
      date
    );
  }

  if (
    amount
  ) {
    amount.value =
      item.amount;

    dispatchInput(
      amount
    );
  }

  return true;
}


/* =========================================================
   ADD EXPENSE TO PLANNER
========================================================= */

function addExpenseToPlanner(
  item
) {
  const before =
    $$(".bill-entry")
      .length;

  /*
    Existing planner's addBill() takes no parameters.
  */

  if (
    typeof window.addBill ===
    "function"
  ) {
    window.addBill();
  } else {
    try {
      if (
        typeof addBill ===
        "function"
      ) {
        addBill();
      }
    } catch (_) {
      // continue
    }
  }

  let entries =
    $$(".bill-entry");

  /*
    Fallback to the planner's Add Bill button
    if addBill() was not globally exposed.
  */

  if (
    entries.length <=
    before
  ) {
    const addButton =
      $("#addBill") ||
      $("#addBillButton") ||
      $(
        '[data-action="add-bill"]'
      );

    if (
      addButton
    ) {
      addButton.click();
    }

    entries =
      $$(".bill-entry");
  }

  if (
    entries.length <=
    before
  ) {
    return false;
  }

  const entry =
    entries[
      entries.length - 1
    ];

  const name =
    $(
      ".bill-name",
      entry
    );

  const amount =
    $(
      ".bill-amount",
      entry
    );

  const type =
    $(
      ".bill-type",
      entry
    );

  const priority =
    $(
      ".bill-priority",
      entry
    );

  const dueDate =
    $(
      ".bill-due-date",
      entry
    );

  if (
    name
  ) {
    name.value =
      item.name;

    dispatchInput(
      name
    );
  }

  if (
    amount
  ) {
    amount.value =
      item.amount;

    dispatchInput(
      amount
    );
  }

  if (
    type
  ) {
    type.value =
      item.expenseType ===
      "flexible"
        ? "flexible"
        : "fixed";

    dispatchChange(
      type
    );
  }

  if (
    priority
  ) {
    setPriorityValue(
      priority,
      item.priority
    );

    dispatchChange(
      priority
    );
  }

  /*
    For recurring expenses we know the actual
    generated occurrence date, so use that date.

    This keeps recurring monthly/semi-monthly
    bills tied to the correct occurrence.
  */

  if (
    dueDate
  ) {
    dueDate.value =
      item.date;

    dispatchInput(
      dueDate
    );

    dispatchChange(
      dueDate
    );
  }

  /*
    If the recurring bill was saved as Flexible,
    make sure its generated occurrence still has
    a usable timing constraint.

    The planner may reveal the flex controls only
    after the type change event above.
  */

  if (
    item.expenseType ===
    "flexible"
  ) {
    const flexRule =
      $(
        ".flex-rule",
        entry
      );

    if (
      flexRule
    ) {
      /*
        "bydate" is the safest import behavior:
        the bill can be optimized but must still
        be handled by its recurring occurrence date.
      */

      const byDateOption =
        [...flexRule.options]
          .some(
            option =>
              option.value ===
              "bydate"
          );

      if (
        byDateOption
      ) {
        flexRule.value =
          "bydate";

        dispatchChange(
          flexRule
        );
      }
    }

    const flexByDate =
      $(
        ".flex-by-date",
        entry
      );

    if (
      flexByDate
    ) {
      flexByDate.value =
        item.date;

      dispatchInput(
        flexByDate
      );

      dispatchChange(
        flexByDate
      );
    }
  }

  return true;
}


function setPriorityValue(
  select,
  requested
) {
  if (!select) {
    return;
  }

  const wanted =
    String(
      requested ||
      "essential"
    )
      .trim()
      .toLowerCase();

  const aliases = {
    essential: [
      "essential"
    ],

    important: [
      "important"
    ],

    lower: [
      "lower",
      "lower_priority",
      "lower priority"
    ]
  };

  const candidates =
    aliases[wanted] ||
    [
      wanted
    ];

  const match =
    [...select.options]
      .find(option =>
        candidates.includes(
          String(
            option.value
          )
            .trim()
            .toLowerCase()
        )
      );

  if (
    match
  ) {
    select.value =
      match.value;

    return;
  }

  /*
    Last fallback:
    compare visible option text.
  */

  const textMatch =
    [...select.options]
      .find(option =>
        String(
          option.textContent
        )
          .trim()
          .toLowerCase()
          .includes(
            wanted ===
            "lower"
              ? "lower"
              : wanted
          )
      );

  if (
    textMatch
  ) {
    select.value =
      textMatch.value;
  }
}


/* =========================================================
   EVENT HELPERS
========================================================= */

function dispatchInput(
  element
) {
  element.dispatchEvent(
    new Event(
      "input",
      {
        bubbles: true
      }
    )
  );
}


function dispatchChange(
  element
) {
  element.dispatchEvent(
    new Event(
      "change",
      {
        bubbles: true
      }
    )
  );
}


/* =========================================================
   IMPORT
========================================================= */

async function importSelected() {
  showMessage();

  const items =
    selectedItems();

  if (
    !items.length
  ) {
    return;
  }

  const button =
    $("#smcRPImport");

  if (
    button
  ) {
    button.disabled =
      true;

    button.textContent =
      "Adding...";
  }

  let addedIncome = 0;
  let addedExpenses = 0;
  let skipped = 0;
  let failed = 0;

  for (
    const item of items
  ) {
    /*
      Check duplicates again immediately before
      importing. This protects against double-clicks
      and planner changes while the modal is open.
    */

    if (
      isDuplicate(
        item
      )
    ) {
      skipped++;

      continue;
    }

    let success =
      false;

    if (
      item.kind ===
      "income"
    ) {
      success =
        addIncomeToPlanner(
          item
        );

      if (
        success
      ) {
        addedIncome++;
      }
    } else {
      success =
        addExpenseToPlanner(
          item
        );

      if (
        success
      ) {
        addedExpenses++;
      }
    }

    if (
      !success
    ) {
      failed++;
    }
  }

  /*
    Give dynamic planner controls a moment to finish
    their own change handlers before optimizing.
  */

  await new Promise(
    resolve =>
      setTimeout(
        resolve,
        180
      )
  );

  const optimize =
    $("#optimizeButton");

  if (
    optimize &&
    (
      addedIncome >
        0 ||
      addedExpenses >
        0
    )
  ) {
    optimize.click();
  }

  /*
    Refresh other live components if available.
  */

  try {
    window
      .StretchMyCheckDashboard
      ?.refresh?.();
  } catch (_) {}

  try {
    window
      .StretchMyCheckForecast
      ?.refresh?.();
  } catch (_) {}

  window.dispatchEvent(
    new CustomEvent(
      "stretchmycheck:recurring-imported",
      {
        detail: {
          income:
            addedIncome,

          expenses:
            addedExpenses,

          skipped,

          failed
        }
      }
    )
  );

  if (
    button
  ) {
    button.textContent =
      "Add Selected to My Plan";
  }

  const parts = [];

  if (
    addedIncome
  ) {
    parts.push(
      `${addedIncome} ${
        addedIncome ===
        1
          ? "paycheck"
          : "paychecks"
      } added`
    );
  }

  if (
    addedExpenses
  ) {
    parts.push(
      `${addedExpenses} ${
        addedExpenses ===
        1
          ? "expense"
          : "expenses"
      } added`
    );
  }

  if (
    skipped
  ) {
    parts.push(
      `${skipped} ${
        skipped ===
        1
          ? "duplicate"
          : "duplicates"
      } skipped`
    );
  }

  if (
    failed
  ) {
    parts.push(
      `${failed} could not be added`
    );
  }

  showMessage(
    parts.length
      ? `${parts.join(" • ")}.`
      : "Nothing needed to be added."
  );

  /*
    Re-check every preview row so successfully
    imported items immediately show as duplicates.
  */

  previewItems =
    previewItems.map(
      item => ({
        ...item,

        duplicate:
          isDuplicate(
            item
          )
      })
    );

  /*
    Re-render after a short delay so the user can
    see exactly what was imported and what is now
    protected from duplication.
  */

  setTimeout(
    () => {
      const range =
        getPlanningRange();

      renderPreview(
        range
      );

      showMessage(
        parts.length
          ? `${parts.join(" • ")}.`
          : "Nothing needed to be added."
      );
    },
    120
  );
}


/* =========================================================
   LIVE REFRESH
========================================================= */

window.addEventListener(
  "stretchmycheck:recurring-updated",
  () => {
    refreshCard();
  }
);


window.addEventListener(
  "stretchmycheck:plan-loaded",
  () => {
    setTimeout(
      refreshCard,
      100
    );
  }
);


window.addEventListener(
  "stretchmycheck:profile-updated",
  () => {
    setTimeout(
      refreshCard,
      100
    );
  }
);


/* =========================================================
   INITIALIZE
========================================================= */

async function init() {
  if (
    initialized
  ) {
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

  await ensureRecurringLoaded();

  refreshCard();

  return true;
}


function waitForApp() {
  if (
    init()
  ) {
    return;
  }

  const observer =
    new MutationObserver(
      () => {
        if (
          init()
        ) {
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

  setTimeout(
    () => {
      if (
        !initialized
      ) {
        init();
      }
    },
    1500
  );
}


window.StretchMyCheckRecurringPlanner = {
  refresh:
    refreshCard,

  open:
    openPreview,

  getPlanningRange:
    () => {
      const range =
        getPlanningRange();

      return {
        start:
          dateKey(
            range.start
          ),

        end:
          dateKey(
            range.end
          ),

        source:
          range.source
      };
    },

  getPreview:
    () =>
      previewItems.map(
        item => ({
          ...item
        })
      )
};


waitForApp();

})();