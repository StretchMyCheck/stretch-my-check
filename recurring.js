(() => {
"use strict";

const sb = window.supabaseClient;

if (!sb) {
  console.error("Recurring Finances: Supabase client missing.");
  return;
}

let incomes = [];
let expenses = [];
let editKind = null;
let editItem = null;
let page = null;
let ready = false;

const $ = (s, root = document) => root.querySelector(s);

const $$ = (s, root = document) =>
  [...root.querySelectorAll(s)];

const num = v =>
  Number.isFinite(parseFloat(v))
    ? parseFloat(v)
    : 0;

const cash = v =>
  new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",
      currency: "USD"
    }
  ).format(num(v));

const esc = v =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const pad = n =>
  String(n).padStart(2, "0");

const key = d =>
  `${d.getFullYear()}-${pad(
    d.getMonth() + 1
  )}-${pad(d.getDate())}`;

const parseDate = v => {
  if (!v) {
    return null;
  }

  if (v instanceof Date) {
    return new Date(
      v.getFullYear(),
      v.getMonth(),
      v.getDate()
    );
  }

  const p =
    String(v)
      .split("-")
      .map(Number);

  if (
    p.length === 3 &&
    p.every(Number.isFinite)
  ) {
    return new Date(
      p[0],
      p[1] - 1,
      p[2]
    );
  }

  const d =
    new Date(v);

  return Number.isNaN(
    d.getTime()
  )
    ? null
    : d;
};

const today = () => {
  const d =
    new Date();

  return new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate()
  );
};

const addDays = (
  d,
  n
) => {
  const x =
    new Date(d);

  x.setDate(
    x.getDate() + n
  );

  return x;
};

const addMonths = (
  d,
  n
) =>
  new Date(
    d.getFullYear(),
    d.getMonth() + n,
    1
  );

const dim = (
  y,
  m
) =>
  new Date(
    y,
    m + 1,
    0
  ).getDate();

const clamp = (
  y,
  m,
  d
) =>
  new Date(
    y,
    m,
    Math.min(
      Math.max(
        parseInt(d) || 1,
        1
      ),
      dim(y, m)
    )
  );

const shortDate = v => {
  const d =
    parseDate(v);

  return d
    ? new Intl.DateTimeFormat(
        "en-US",
        {
          month: "short",
          day: "numeric"
        }
      ).format(d)
    : "No date";
};

const freqLabel = v =>
  ({
    weekly: "Weekly",
    biweekly:
      "Every 2 Weeks",
    semimonthly:
      "Twice a Month",
    monthly: "Monthly",
    yearly: "Yearly"
  })[v] ||
  "Recurring";

const priority = v => {
  const value =
    String(
      v || "essential"
    )
      .toLowerCase()
      .replace(
        /[_ ]priority/g,
        ""
      );

  if (
    value === "lower"
  ) {
    return "lower";
  }

  if (
    value === "important"
  ) {
    return "important";
  }

  return "essential";
};

const priorityLabel = v =>
  priority(v) === "lower"
    ? "Lower Priority"
    : priority(v) ===
        "important"
      ? "Important"
      : "Essential";


async function user() {
  try {
    const {
      data: {
        user
      }
    } =
      await sb.auth
        .getUser();

    return user || null;
  } catch (e) {
    console.error(e);

    return null;
  }
}


function styles() {
  if (
    $("#smcRecurringStylesV2")
  ) {
    return;
  }

  const s =
    document.createElement(
      "style"
    );

  s.id =
    "smcRecurringStylesV2";

  s.textContent = `
#smcRecurringPage {
  padding-bottom: 48px;
}

.smc-r-shell {
  display: grid;
  gap: 24px;
}

.smc-r-summary {
  display: grid;
  grid-template-columns:
    repeat(
      4,
      minmax(0, 1fr)
    );
  gap: 16px;
}

.smc-r-card,
.smc-r-panel,
.smc-r-empty,
.smc-r-signed {
  background:
    linear-gradient(
      145deg,
      #11202a,
      #0b1820
    );

  border:
    1px solid
    rgba(
      132,
      175,
      192,
      .17
    );

  border-radius: 18px;

  color: #f4f8fa;
}

.smc-r-card {
  padding: 20px;
  min-height: 112px;
  box-sizing: border-box;
}

.smc-r-label {
  color: #a9bcc5;
  font-size: 12px;
  font-weight: 750;
}

.smc-r-value {
  margin-top: 13px;
  font-size: 26px;
  font-weight: 850;
  color: #fff;
}

.smc-r-card.in
.smc-r-value {
  color: #5ce7b1;
}

.smc-r-card.out
.smc-r-value,
.smc-r-value.bad {
  color: #ff8d91;
}

.smc-r-value.good {
  color: #45e1c0;
}

.smc-r-grid {
  display: grid;

  grid-template-columns:
    repeat(
      2,
      minmax(0, 1fr)
    );

  gap: 24px;
  align-items: start;
}

.smc-r-panel {
  overflow: hidden;
}

.smc-r-head {
  display: flex;
  align-items: center;
  justify-content:
    space-between;
  gap: 16px;

  padding:
    20px 22px;

  border-bottom:
    1px solid
    rgba(
      132,
      175,
      192,
      .13
    );
}

.smc-r-head h2 {
  margin: 0;
  color: #fff;
  font-size: 18px;
}

.smc-r-head p {
  margin:
    5px 0 0;

  color: #9bb0ba;
  font-size: 12px;
}

.smc-r-add,
.smc-r-primary {
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

  color: #fff;
  font-weight: 780;
  cursor: pointer;

  padding:
    9px 14px;
}

.smc-r-list {
  display: grid;
  gap: 12px;
  padding: 18px;
}

.smc-r-item {
  display: grid;

  grid-template-columns:
    minmax(0, 1fr)
    auto;

  gap: 16px;

  align-items: center;

  padding: 16px;

  border:
    1px solid
    rgba(
      132,
      175,
      192,
      .14
    );

  border-radius: 15px;

  background: #12242e;
}

.smc-r-item.paused {
  opacity: .65;
}

.smc-r-name {
  font-size: 14px;
  font-weight: 800;
  color: #fff;
}

.smc-r-meta {
  margin-top: 6px;
  color: #9eb2bc;
  font-size: 11px;
}

.smc-r-amount {
  font-size: 17px;
  font-weight: 820;
  text-align: right;
}

.smc-r-item.income
.smc-r-amount {
  color: #5ce7b1;
}

.smc-r-item.expense
.smc-r-amount {
  color: #ff8d91;
}

.smc-r-actions {
  display: flex;

  justify-content:
    flex-end;

  gap: 7px;
  margin-top: 9px;
}

.smc-r-small {
  border:
    1px solid
    rgba(
      132,
      175,
      192,
      .18
    );

  border-radius: 9px;

  padding:
    6px 9px;

  background:
    rgba(
      49,
      103,
      112,
      .16
    );

  color: #dce9ed;

  font-size: 10px;
  font-weight: 750;

  cursor: pointer;
}

.smc-r-empty {
  margin: 18px;

  padding:
    25px 20px;

  text-align: center;

  background:
    rgba(
      9,
      25,
      33,
      .7
    );
}

.smc-r-empty strong {
  display: block;

  color: #fff;

  margin-bottom: 6px;
}

.smc-r-empty span {
  color: #9eb2bc;
  font-size: 12px;
}

.smc-r-preview {
  padding:
    20px 22px 22px;
}

.smc-r-preview h2 {
  margin: 0;

  color: #fff;

  font-size: 18px;
}

.smc-r-preview > p {
  color: #9bb0ba;

  font-size: 12px;
}

.smc-r-months {
  display: grid;

  grid-template-columns:
    repeat(
      3,
      minmax(0, 1fr)
    );

  gap: 15px;

  margin-top: 18px;
}

.smc-r-month {
  border:
    1px solid
    rgba(
      132,
      175,
      192,
      .14
    );

  border-radius: 15px;

  background: #10212b;

  overflow: hidden;
}

.smc-r-monthhead {
  display: flex;

  justify-content:
    space-between;

  gap: 10px;

  padding:
    14px 15px;

  border-bottom:
    1px solid
    rgba(
      132,
      175,
      192,
      .12
    );
}

.smc-r-monthhead strong {
  font-size: 13px;
}

.smc-r-monthhead span {
  color: #8fa6b1;

  font-size: 10px;
}

.smc-r-occ {
  display: grid;

  grid-template-columns:
    48px 1fr auto;

  gap: 10px;

  padding:
    11px 14px;

  border-top:
    1px solid
    rgba(
      255,
      255,
      255,
      .055
    );

  font-size: 11px;
}

.smc-r-occ:first-child {
  border-top: 0;
}

.smc-r-date {
  color: #9db1bb;
}

.smc-r-occ
.income {
  color: #5ce7b1;

  font-weight: 800;
}

.smc-r-occ
.expense {
  color: #ff8d91;

  font-weight: 800;
}

.smc-r-signed {
  padding: 32px;

  text-align: center;
}

.smc-r-signed h2 {
  margin:
    0 0 8px;
}

.smc-r-signed p {
  margin: 0;

  color: #a2b5be;
}

.smc-r-modalbg {
  position: fixed;
  inset: 0;

  z-index: 12000;

  display: none;

  align-items: center;

  justify-content:
    center;

  padding: 20px;

  background:
    rgba(
      1,
      7,
      11,
      .78
    );

  backdrop-filter:
    blur(8px);
}

.smc-r-modalbg.show {
  display: flex;
}

.smc-r-modal {
  width:
    min(
      620px,
      100%
    );

  max-height:
    calc(
      100vh - 40px
    );

  overflow: auto;

  padding: 24px;

  box-sizing:
    border-box;

  border:
    1px solid
    rgba(
      132,
      175,
      192,
      .2
    );

  border-radius: 20px;

  background:
    linear-gradient(
      145deg,
      #12232d,
      #0b1820
    );

  color: #f4f8fa;
}

.smc-r-modalhead {
  display: flex;

  justify-content:
    space-between;

  gap: 20px;

  margin-bottom: 22px;
}

.smc-r-modalhead h2 {
  margin: 0;
}

.smc-r-modalhead p {
  margin:
    6px 0 0;

  color: #9eb2bc;

  font-size: 12px;
}

.smc-r-close {
  width: 36px;
  height: 36px;

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

.smc-r-form {
  display: grid;

  grid-template-columns:
    repeat(
      2,
      minmax(0, 1fr)
    );

  gap: 15px;
}

.smc-r-field {
  display: grid;

  gap: 7px;
}

.smc-r-field.full {
  grid-column:
    1 / -1;
}

.smc-r-field label {
  color: #b6c9d1;

  font-size: 12px;

  font-weight: 750;
}

.smc-r-field input,
.smc-r-field select,
.smc-r-field textarea {
  width: 100%;

  min-height: 44px;

  box-sizing:
    border-box;

  border:
    1px solid
    rgba(
      111,
      163,
      179,
      .27
    );

  border-radius: 11px;

  padding:
    10px 12px;

  background: #071923;

  color: #f7fbfc;

  font: inherit;

  font-size: 14px;
}

.smc-r-field textarea {
  min-height: 88px;

  resize: vertical;
}

.smc-r-note {
  color: #879faa;

  font-size: 10px;
}

.smc-r-msg {
  display: none;

  margin-top: 16px;

  padding:
    11px 13px;

  border:
    1px solid
    rgba(
      255,
      116,
      121,
      .25
    );

  border-radius: 11px;

  background:
    rgba(
      126,
      42,
      49,
      .16
    );

  color: #ffb0b3;

  font-size: 12px;
}

.smc-r-msg.show {
  display: block;
}

.smc-r-modalactions {
  display: flex;

  justify-content:
    space-between;

  gap: 12px;

  margin-top: 22px;
}

.smc-r-right {
  display: flex;

  gap: 9px;

  margin-left: auto;
}

.smc-r-secondary,
.smc-r-danger {
  border-radius: 999px;

  padding:
    9px 15px;

  font-weight: 750;

  cursor: pointer;
}

.smc-r-secondary {
  border:
    1px solid
    rgba(
      132,
      175,
      192,
      .2
    );

  background: #142731;

  color: #dce8ec;
}

.smc-r-danger {
  display: none;

  border:
    1px solid
    rgba(
      255,
      116,
      121,
      .3
    );

  background:
    rgba(
      155,
      48,
      56,
      .18
    );

  color: #ff9ba0;
}

.smc-r-danger.show {
  display: block;
}

.smc-r-badge {
  margin-left: 7px;

  padding:
    3px 7px;

  border:
    1px solid
    rgba(
      255,
      157,
      85,
      .26
    );

  border-radius: 999px;

  color: #ffb47b;

  font-size: 9px;
}

@media(
  max-width: 1050px
) {
  .smc-r-summary {
    grid-template-columns:
      repeat(
        2,
        1fr
      );
  }

  .smc-r-grid,
  .smc-r-months {
    grid-template-columns:
      1fr;
  }
}

@media(
  max-width: 760px
) {
  .smc-r-summary {
    grid-template-columns:
      1fr 1fr;

    gap: 11px;
  }

  .smc-r-card {
    padding: 16px;

    min-height: 100px;
  }

  .smc-r-value {
    font-size: 21px;
  }

  .smc-r-item {
    grid-template-columns:
      1fr;
  }

  .smc-r-amount {
    text-align: left;
  }

  .smc-r-actions {
    justify-content:
      flex-start;
  }

  .smc-r-form {
    grid-template-columns:
      1fr;
  }

  .smc-r-field.full {
    grid-column: auto;
  }

  .smc-r-modal {
    padding: 19px;
  }
}
`;

  document.head
    .appendChild(s);
}


function build() {
  const main =
    $(
      "#smcAppShell .smc-main"
    );

  if (!main) {
    return false;
  }

  page =
    $("#smcRecurringPage");

  if (page) {
    return true;
  }

  page =
    document.createElement(
      "section"
    );

  page.id =
    "smcRecurringPage";

  page.className =
    "smc-page";

  page.dataset.pageName =
    "recurring";

  page.innerHTML = `
<div class="smc-page-heading">
  <div>
    <h1>
      Recurring Finances
    </h1>

    <p>
      Set up the money that repeats so Stretch My Check can help you plan ahead.
    </p>
  </div>
</div>

<div
  id="smcRSigned"
  class="smc-r-signed"
  style="display:none"
>
  <h2>
    Sign in to use Recurring Finances
  </h2>

  <p>
    Your recurring paychecks and expenses are saved to your account.
  </p>
</div>

<div
  id="smcRApp"
  class="smc-r-shell"
  style="display:none"
>
  <div class="smc-r-summary">

    <div class="smc-r-card in">
      <div class="smc-r-label">
        Estimated Monthly Income
      </div>

      <div
        id="smcRIncome"
        class="smc-r-value"
      >
        $0.00
      </div>
    </div>

    <div class="smc-r-card out">
      <div class="smc-r-label">
        Estimated Monthly Expenses
      </div>

      <div
        id="smcRExpenses"
        class="smc-r-value"
      >
        $0.00
      </div>
    </div>

    <div class="smc-r-card">
      <div class="smc-r-label">
        Estimated Monthly Room
      </div>

      <div
        id="smcRRoom"
        class="smc-r-value good"
      >
        $0.00
      </div>
    </div>

    <div class="smc-r-card">
      <div class="smc-r-label">
        Active Recurring Items
      </div>

      <div
        id="smcRCount"
        class="smc-r-value"
      >
        0
      </div>
    </div>

  </div>

  <div class="smc-r-grid">

    <section class="smc-r-panel">
      <div class="smc-r-head">
        <div>
          <h2>
            Recurring Income
          </h2>

          <p>
            Paychecks and other money you receive on a schedule.
          </p>
        </div>

        <button
          id="smcRAddIncome"
          class="smc-r-add"
        >
          + Add Income
        </button>
      </div>

      <div
        id="smcRIncomeList"
      ></div>
    </section>

    <section class="smc-r-panel">
      <div class="smc-r-head">
        <div>
          <h2>
            Recurring Expenses
          </h2>

          <p>
            Bills and expenses that come back on a regular schedule.
          </p>
        </div>

        <button
          id="smcRAddExpense"
          class="smc-r-add"
        >
          + Add Expense
        </button>
      </div>

      <div
        id="smcRExpenseList"
      ></div>
    </section>

  </div>

  <section class="smc-r-panel">
    <div class="smc-r-preview">
      <h2>
        3-Month Preview
      </h2>

      <p>
        A look ahead at your active recurring income and expenses.
      </p>

      <div
        id="smcRPreview"
        class="smc-r-months"
      ></div>
    </div>
  </section>
</div>

<div
  id="smcRModalBg"
  class="smc-r-modalbg"
  aria-hidden="true"
>
  <div
    class="smc-r-modal"
    role="dialog"
    aria-modal="true"
  >
    <div class="smc-r-modalhead">
      <div>
        <h2 id="smcRTitle">
          Add Recurring Item
        </h2>

        <p id="smcRSub">
          Add money that repeats.
        </p>
      </div>

      <button
        id="smcRClose"
        class="smc-r-close"
        aria-label="Close"
      >
        ×
      </button>
    </div>

    <div class="smc-r-form">

      <div class="smc-r-field full">
        <label
          id="smcRNameLabel"
          for="smcRName"
        >
          Name
        </label>

        <input
          id="smcRName"
          maxlength="120"
        >
      </div>

      <div class="smc-r-field">
        <label
          for="smcRAmount"
        >
          Amount
        </label>

        <input
          id="smcRAmount"
          type="number"
          min=".01"
          step=".01"
        >
      </div>

      <div class="smc-r-field">
        <label
          for="smcRFrequency"
        >
          Frequency
        </label>

        <select
          id="smcRFrequency"
        >
          <option value="weekly">
            Weekly
          </option>

          <option value="biweekly">
            Every 2 Weeks
          </option>

          <option value="semimonthly">
            Twice a Month
          </option>

          <option value="monthly">
            Monthly
          </option>

          <option value="yearly">
            Yearly
          </option>
        </select>
      </div>

      <div class="smc-r-field">
        <label
          for="smcRNext"
        >
          Next Date
        </label>

        <input
          id="smcRNext"
          type="date"
        >

        <div class="smc-r-note">
          Use the next date this item will happen.
        </div>
      </div>

      <div
        id="smcRFirstWrap"
        class="smc-r-field"
        style="display:none"
      >
        <label
          for="smcRFirst"
        >
          First Day
        </label>

        <input
          id="smcRFirst"
          type="number"
          min="1"
          max="31"
        >
      </div>

      <div
        id="smcRSecondWrap"
        class="smc-r-field"
        style="display:none"
      >
        <label
          for="smcRSecond"
        >
          Second Day
        </label>

        <input
          id="smcRSecond"
          type="number"
          min="1"
          max="31"
        >
      </div>

      <div
        id="smcRTypeWrap"
        class="smc-r-field"
        style="display:none"
      >
        <label
          for="smcRType"
        >
          Expense Type
        </label>

        <select
          id="smcRType"
        >
          <option value="fixed">
            Fixed
          </option>

          <option value="flexible">
            Flexible
          </option>
        </select>
      </div>

      <div
        id="smcRPriorityWrap"
        class="smc-r-field"
        style="display:none"
      >
        <label
          for="smcRPriority"
        >
          Priority
        </label>

        <select
          id="smcRPriority"
        >
          <option value="essential">
            Essential
          </option>

          <option value="important">
            Important
          </option>

          <option value="lower">
            Lower Priority
          </option>
        </select>
      </div>

      <div class="smc-r-field full">
        <label
          for="smcRNotes"
        >
          Notes (optional)
        </label>

        <textarea
          id="smcRNotes"
          maxlength="500"
        ></textarea>
      </div>

    </div>

    <div
      id="smcRMsg"
      class="smc-r-msg"
    ></div>

    <div class="smc-r-modalactions">
      <button
        id="smcRDelete"
        class="smc-r-danger"
      >
        Delete
      </button>

      <div class="smc-r-right">
        <button
          id="smcRCancel"
          class="smc-r-secondary"
        >
          Cancel
        </button>

        <button
          id="smcRSave"
          class="smc-r-primary"
        >
          Save
        </button>
      </div>
    </div>

  </div>
</div>
`;

  const bottom =
    $(
      ".smc-bottom-nav",
      main
    );

  if (bottom) {
    main.insertBefore(
      page,
      bottom
    );
  } else {
    main.appendChild(
      page
    );
  }

  $("#smcRAddIncome")
    .onclick =
      () =>
        openForm(
          "income"
        );

  $("#smcRAddExpense")
    .onclick =
      () =>
        openForm(
          "expense"
        );

  $("#smcRClose")
    .onclick =
      closeForm;

  $("#smcRCancel")
    .onclick =
      closeForm;

  $("#smcRSave")
    .onclick =
      save;

  $("#smcRDelete")
    .onclick =
      remove;

  $("#smcRFrequency")
    .onchange =
      scheduleFields;

  $("#smcRModalBg")
    .onclick =
      e => {
        if (
          e.target.id ===
          "smcRModalBg"
        ) {
          closeForm();
        }
      };

  return true;
}


function nav() {
  const n =
    $(
      "#smcAppShell .smc-sidebar .smc-nav"
    );

  if (!n) {
    return false;
  }

  if (
    n.querySelector(
      '[data-page="recurring"]'
    )
  ) {
    return true;
  }

  const b =
    document.createElement(
      "button"
    );

  b.className =
    "smc-nav-button";

  b.type =
    "button";

  b.dataset.page =
    "recurring";

  b.innerHTML = `
<svg
  width="22"
  height="22"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="1.8"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  <rect
    x="3"
    y="5"
    width="18"
    height="16"
    rx="2"
  />

  <path
    d="M16 3v4"
  />

  <path
    d="M8 3v4"
  />

  <path
    d="M3 10h18"
  />

  <path
    d="M8 14h3"
  />

  <path
    d="M13 14h3"
  />
</svg>

<span>
  Recurring
</span>
`;

  const tools =
    n.querySelector(
      '[data-page="tools"]'
    );

  if (tools) {
    n.insertBefore(
      b,
      tools
    );
  } else {
    n.appendChild(
      b
    );
  }

  b.onclick =
    e => {
      e.preventDefault();

      openPage(true);
    };

  return true;
}


function openPage(
  hash = true
) {
  $$(
    "#smcAppShell .smc-page"
  ).forEach(
    p =>
      p.classList.remove(
        "active"
      )
  );

  page?.classList.add(
    "active"
  );

  $$(
    "#smcAppShell .smc-nav-button, #smcAppShell .smc-mobile-nav-button"
  ).forEach(
    b =>
      b.classList.toggle(
        "active",
        b.dataset.page ===
          "recurring"
      )
  );

  if (
    hash &&
    location.hash !==
      "#recurring"
  ) {
    history.replaceState(
      null,
      "",
      "#recurring"
    );
  }

  load();
}


function route() {
  if (
    location.hash
      .replace(
        "#",
        ""
      )
      .toLowerCase() ===
    "recurring"
  ) {
    openPage(false);
  }
}


function scheduleFields() {
  const semi =
    $("#smcRFrequency")
      .value ===
    "semimonthly";

  $("#smcRFirstWrap")
    .style.display =
      semi
        ? ""
        : "none";

  $("#smcRSecondWrap")
    .style.display =
      semi
        ? ""
        : "none";
}


function msg(
  t = ""
) {
  const e =
    $("#smcRMsg");

  e.textContent =
    t;

  e.classList.toggle(
    "show",
    !!t
  );
}


function closeForm() {
  $("#smcRModalBg")
    ?.classList.remove(
      "show"
    );

  editKind =
    null;

  editItem =
    null;

  msg();
}


function openForm(
  kind,
  item = null
) {
  editKind =
    kind;

  editItem =
    item
      ? {
          ...item
        }
      : null;

  const inc =
    kind ===
    "income";

  const editing =
    !!item?.id;

  $("#smcRTitle")
    .textContent =
      editing
        ? inc
          ? "Edit Recurring Income"
          : "Edit Recurring Expense"
        : inc
          ? "Add Recurring Income"
          : "Add Recurring Expense";

  $("#smcRSub")
    .textContent =
      inc
        ? "Save a paycheck or other income that repeats."
        : "Save a bill or expense that repeats.";

  $("#smcRNameLabel")
    .textContent =
      inc
        ? "Income Name"
        : "Expense Name";

  $("#smcRName")
    .value =
      inc
        ? item?.income_name ||
          ""
        : item?.expense_name ||
          "";

  $("#smcRAmount")
    .value =
      item?.amount ??
      "";

  $("#smcRFrequency")
    .value =
      item?.frequency ||
      "monthly";

  $("#smcRNext")
    .value =
      item?.next_date ||
      "";

  $("#smcRFirst")
    .value =
      inc
        ? item?.first_day ??
          ""
        : item?.due_day ??
          "";

  $("#smcRSecond")
    .value =
      inc
        ? item?.second_day ??
          ""
        : item?.second_due_day ??
          "";

  $("#smcRType")
    .value =
      item?.expense_type ||
      "fixed";

  $("#smcRPriority")
    .value =
      priority(
        item?.priority
      );

  $("#smcRNotes")
    .value =
      item?.notes ||
      "";

  $("#smcRTypeWrap")
    .style.display =
      inc
        ? "none"
        : "";

  $("#smcRPriorityWrap")
    .style.display =
      inc
        ? "none"
        : "";

  $("#smcRDelete")
    .classList.toggle(
      "show",
      editing
    );

  scheduleFields();

  msg();

  $("#smcRModalBg")
    .classList.add(
      "show"
    );

  setTimeout(
    () =>
      $("#smcRName")
        .focus(),
    30
  );
}


function schedule(
  kind,
  freq
) {
  const d =
    parseDate(
      $("#smcRNext")
        .value
    );

  if (!d) {
    return {
      error:
        "Choose the next date this recurring item will happen."
    };
  }

  if (
    freq ===
    "semimonthly"
  ) {
    const a =
      parseInt(
        $("#smcRFirst")
          .value
      );

    const b =
      parseInt(
        $("#smcRSecond")
          .value
      );

    if (
      !(
        a >= 1 &&
        a <= 31 &&
        b >= 1 &&
        b <= 31
      )
    ) {
      return {
        error:
          "Enter both monthly days from 1 to 31."
      };
    }

    if (
      a === b
    ) {
      return {
        error:
          "The two monthly days need to be different."
      };
    }

    const lo =
      Math.min(
        a,
        b
      );

    const hi =
      Math.max(
        a,
        b
      );

    return {
      value:
        kind ===
        "income"
          ? {
              next_date:
                key(d),

              first_day:
                lo,

              second_day:
                hi
            }
          : {
              next_date:
                key(d),

              due_day:
                lo,

              second_due_day:
                hi
            }
    };
  }

  return {
    value:
      kind ===
      "income"
        ? {
            next_date:
              key(d),

            first_day:
              freq ===
              "monthly"
                ? d.getDate()
                : null,

            second_day:
              null
          }
        : {
            next_date:
              key(d),

            due_day:
              freq ===
              "monthly"
                ? d.getDate()
                : null,

            second_due_day:
              null
          }
  };
}


async function save() {
  msg();

  const u =
    await user();

  if (!u) {
    msg(
      "Sign in before saving recurring finances."
    );

    return;
  }

  const name =
    $("#smcRName")
      .value
      .trim();

  const amount =
    Math.round(
      num(
        $("#smcRAmount")
          .value
      ) *
        100
    ) /
    100;

  const freq =
    $("#smcRFrequency")
      .value;

  const notes =
    $("#smcRNotes")
      .value
      .trim();

  if (!name) {
    msg(
      "Enter a name."
    );

    return;
  }

  if (
    !(amount > 0)
  ) {
    msg(
      "Enter an amount greater than $0."
    );

    return;
  }

  const sch =
    schedule(
      editKind,
      freq
    );

  if (
    sch.error
  ) {
    msg(
      sch.error
    );

    return;
  }

  const existing =
    !!editItem?.id;

  let table;
  let payload;

  if (
    editKind ===
    "income"
  ) {
    table =
      "recurring_income";

    payload = {
      user_id:
        u.id,

      income_name:
        name,

      amount,

      frequency:
        freq,

      ...sch.value,

      active:
        existing
          ? editItem.active !==
            false
          : true,

      notes:
        notes ||
        null,

      updated_at:
        new Date()
          .toISOString()
    };
  } else {
    table =
      "recurring_expenses";

    payload = {
      user_id:
        u.id,

      expense_name:
        name,

      amount,

      expense_type:
        $("#smcRType")
          .value,

      priority:
        priority(
          $("#smcRPriority")
            .value
        ),

      frequency:
        freq,

      ...sch.value,

      active:
        existing
          ? editItem.active !==
            false
          : true,

      notes:
        notes ||
        null,

      updated_at:
        new Date()
          .toISOString()
    };
  }

  const q =
    existing
      ? sb
          .from(table)
          .update(
            payload
          )
          .eq(
            "id",
            editItem.id
          )
          .eq(
            "user_id",
            u.id
          )
      : sb
          .from(table)
          .insert(
            payload
          );

  const {
    error
  } =
    await q;

  if (error) {
    console.error(
      error
    );

    msg(
      error.message ||
        "Could not save this recurring item."
    );

    return;
  }

  closeForm();

  await load();
}


async function remove() {
  if (
    !editItem?.id ||
    !editKind
  ) {
    return;
  }

  const label =
    editKind ===
    "income"
      ? editItem.income_name
      : editItem.expense_name;

  if (
    !confirm(
      `Delete "${label}"? This cannot be undone.`
    )
  ) {
    return;
  }

  const u =
    await user();

  if (!u) {
    return;
  }

  const table =
    editKind ===
    "income"
      ? "recurring_income"
      : "recurring_expenses";

  const {
    error
  } =
    await sb
      .from(table)
      .delete()
      .eq(
        "id",
        editItem.id
      )
      .eq(
        "user_id",
        u.id
      );

  if (error) {
    msg(
      error.message ||
        "Could not delete this item."
    );

    return;
  }

  closeForm();

  await load();
}


async function toggle(
  kind,
  id
) {
  const u =
    await user();

  if (!u) {
    return;
  }

  const arr =
    kind ===
    "income"
      ? incomes
      : expenses;

  const item =
    arr.find(
      x =>
        Number(x.id) ===
        Number(id)
    );

  if (!item) {
    return;
  }

  const table =
    kind ===
    "income"
      ? "recurring_income"
      : "recurring_expenses";

  const {
    error
  } =
    await sb
      .from(table)
      .update({
        active:
          item.active ===
          false,

        updated_at:
          new Date()
            .toISOString()
      })
      .eq(
        "id",
        id
      )
      .eq(
        "user_id",
        u.id
      );

  if (error) {
    alert(
      error.message ||
        "Could not update this item."
    );

    return;
  }

  await load();
}


function occurrences(
  item,
  kind,
  start,
  end
) {
  const anchor =
    parseDate(
      item.next_date
    );

  if (
    !anchor ||
    item.active ===
      false
  ) {
    return [];
  }

  const out = [];

  const push = d => {
    if (
      d >= start &&
      d <= end &&
      d >= anchor
    ) {
      out.push(d);
    }
  };

  const f =
    item.frequency;

  if (
    f === "weekly" ||
    f === "biweekly"
  ) {
    const step =
      f === "weekly"
        ? 7
        : 14;

    let d =
      new Date(
        anchor
      );

    while (
      d < start
    ) {
      d =
        addDays(
          d,
          step
        );
    }

    while (
      d <= end
    ) {
      push(
        new Date(d)
      );

      d =
        addDays(
          d,
          step
        );
    }
  } else if (
    f === "monthly"
  ) {
    const day =
      kind ===
      "income"
        ? parseInt(
            item.first_day
          ) ||
          anchor.getDate()
        : parseInt(
            item.due_day
          ) ||
          anchor.getDate();

    let m =
      new Date(
        start.getFullYear(),
        start.getMonth(),
        1
      );

    while (
      m <= end
    ) {
      push(
        clamp(
          m.getFullYear(),
          m.getMonth(),
          day
        )
      );

      m =
        addMonths(
          m,
          1
        );
    }
  } else if (
    f ===
    "semimonthly"
  ) {
    const a =
      kind ===
      "income"
        ? parseInt(
            item.first_day
          )
        : parseInt(
            item.due_day
          );

    const b =
      kind ===
      "income"
        ? parseInt(
            item.second_day
          )
        : parseInt(
            item.second_due_day
          );

    let m =
      new Date(
        start.getFullYear(),
        start.getMonth(),
        1
      );

    while (
      m <= end
    ) {
      push(
        clamp(
          m.getFullYear(),
          m.getMonth(),
          a
        )
      );

      push(
        clamp(
          m.getFullYear(),
          m.getMonth(),
          b
        )
      );

      m =
        addMonths(
          m,
          1
        );
    }
  } else if (
    f === "yearly"
  ) {
    for (
      let y =
        start.getFullYear();

      y <=
      end.getFullYear();

      y++
    ) {
      push(
        clamp(
          y,
          anchor.getMonth(),
          anchor.getDate()
        )
      );
    }
  }

  return [
    ...new Map(
      out.map(
        d => [
          key(d),
          d
        ]
      )
    ).values()
  ].sort(
    (a, b) =>
      a - b
  );
}


const monthly =
  item =>
    item.active ===
    false
      ? 0
      : ({
          weekly:
            num(
              item.amount
            ) *
            52 /
            12,

          biweekly:
            num(
              item.amount
            ) *
            26 /
            12,

          semimonthly:
            num(
              item.amount
            ) *
            2,

          monthly:
            num(
              item.amount
            ),

          yearly:
            num(
              item.amount
            ) /
            12
        })[
          item.frequency
        ] ||
        0;


const monthIncome =
  () =>
    incomes.reduce(
      (
        s,
        x
      ) =>
        s +
        monthly(x),
      0
    );


const monthExpenses =
  () =>
    expenses.reduce(
      (
        s,
        x
      ) =>
        s +
        monthly(x),
      0
    );


function upcoming(
  months = 3
) {
  const start =
    today();

  const end =
    addDays(
      addMonths(
        new Date(
          start.getFullYear(),
          start.getMonth(),
          1
        ),
        months
      ),
      -1
    );

  const out = [];

  incomes.forEach(
    x =>
      occurrences(
        x,
        "income",
        start,
        end
      ).forEach(
        d =>
          out.push({
            kind:
              "income",

            id:
              x.id,

            name:
              x.income_name,

            amount:
              num(
                x.amount
              ),

            date:
              d
          })
      )
  );

  expenses.forEach(
    x =>
      occurrences(
        x,
        "expense",
        start,
        end
      ).forEach(
        d =>
          out.push({
            kind:
              "expense",

            id:
              x.id,

            name:
              x.expense_name,

            amount:
              num(
                x.amount
              ),

            date:
              d,

            priority:
              x.priority,

            expense_type:
              x.expense_type
          })
      )
  );

  return out.sort(
    (
      a,
      b
    ) =>
      a.date -
      b.date
  );
}


function itemHTML(
  x,
  kind
) {
  const inc =
    kind ===
    "income";

  const name =
    inc
      ? x.income_name
      : x.expense_name;

  const paused =
    x.active ===
    false;

  const schedule =
    x.frequency ===
    "semimonthly"
      ? `${freqLabel(
          x.frequency
        )} • days ${
          inc
            ? x.first_day
            : x.due_day
        } & ${
          inc
            ? x.second_day
            : x.second_due_day
        }`
      : `${freqLabel(
          x.frequency
        )} • next ${shortDate(
          x.next_date
        )}`;

  const meta =
    inc
      ? schedule
      : `${schedule} • ${priorityLabel(
          x.priority
        )} • ${
          x.expense_type ===
          "flexible"
            ? "Flexible"
            : "Fixed"
        }`;

  return `
<article
  class="smc-r-item ${kind} ${
    paused
      ? "paused"
      : ""
  }"
>
  <div>
    <div class="smc-r-name">
      ${esc(name)}

      ${
        paused
          ? '<span class="smc-r-badge">PAUSED</span>'
          : ""
      }
    </div>

    <div class="smc-r-meta">
      ${esc(meta)}
    </div>
  </div>

  <div>
    <div class="smc-r-amount">
      ${
        inc
          ? "+"
          : "−"
      }${cash(
        x.amount
      )}
    </div>

    <div class="smc-r-actions">
      <button
        class="smc-r-small"
        data-a="toggle"
        data-k="${kind}"
        data-id="${x.id}"
      >
        ${
          paused
            ? "Resume"
            : "Pause"
        }
      </button>

      <button
        class="smc-r-small"
        data-a="edit"
        data-k="${kind}"
        data-id="${x.id}"
      >
        Edit
      </button>
    </div>
  </div>
</article>
`;
}


function list(
  kind
) {
  const target =
    $(
      kind ===
      "income"
        ? "#smcRIncomeList"
        : "#smcRExpenseList"
    );

  const arr =
    kind ===
    "income"
      ? incomes
      : expenses;

  if (
    !arr.length
  ) {
    target.innerHTML = `
<div class="smc-r-empty">
  <strong>
    No recurring ${
      kind ===
      "income"
        ? "income"
        : "expenses"
    } yet
  </strong>

  <span>
    ${
      kind ===
      "income"
        ? "Add a paycheck or other repeating income."
        : "Add rent, utilities, car payments, subscriptions, or other repeating expenses."
    }
  </span>
</div>
`;

    return;
  }

  target.innerHTML = `
<div class="smc-r-list">
  ${
    arr
      .map(
        x =>
          itemHTML(
            x,
            kind
          )
      )
      .join("")
  }
</div>
`;

  $$(
    "[data-a]",
    target
  ).forEach(
    b =>
      b.onclick =
        () => {
          const a =
            b.dataset.k ===
            "income"
              ? incomes
              : expenses;

          const x =
            a.find(
              v =>
                Number(
                  v.id
                ) ===
                Number(
                  b.dataset.id
                )
            );

          if (!x) {
            return;
          }

          if (
            b.dataset.a ===
            "edit"
          ) {
            openForm(
              b.dataset.k,
              x
            );
          } else {
            toggle(
              b.dataset.k,
              b.dataset.id
            );
          }
        }
  );
}


function render() {
  const mi =
    monthIncome();

  const me =
    monthExpenses();

  const room =
    mi - me;

  $("#smcRIncome")
    .textContent =
      cash(mi);

  $("#smcRExpenses")
    .textContent =
      cash(me);

  $("#smcRRoom")
    .textContent =
      cash(room);

  $("#smcRRoom")
    .className =
      `smc-r-value ${
        room >= 0
          ? "good"
          : "bad"
      }`;

  $("#smcRCount")
    .textContent =
      incomes.filter(
        x =>
          x.active !==
          false
      ).length +
      expenses.filter(
        x =>
          x.active !==
          false
      ).length;

  list(
    "income"
  );

  list(
    "expense"
  );

  const all =
    upcoming(3);

  const start =
    today();

  const months = [];

  for (
    let i = 0;
    i < 3;
    i++
  ) {
    const m =
      addMonths(
        new Date(
          start.getFullYear(),
          start.getMonth(),
          1
        ),
        i
      );

    const end =
      new Date(
        m.getFullYear(),
        m.getMonth() + 1,
        0
      );

    const items =
      all.filter(
        x =>
          x.date >= m &&
          x.date <= end
      );

    const inn =
      items
        .filter(
          x =>
            x.kind ===
            "income"
        )
        .reduce(
          (
            s,
            x
          ) =>
            s +
            x.amount,
          0
        );

    const out =
      items
        .filter(
          x =>
            x.kind ===
            "expense"
        )
        .reduce(
          (
            s,
            x
          ) =>
            s +
            x.amount,
          0
        );

    const label =
      new Intl.DateTimeFormat(
        "en-US",
        {
          month: "long",
          year: "numeric"
        }
      ).format(m);

    months.push(`
<div class="smc-r-month">

  <div class="smc-r-monthhead">
    <strong>
      ${label}
    </strong>

    <span>
      ${cash(
        inn
      )} in • ${cash(
        out
      )} out
    </span>
  </div>

  ${
    items.length
      ? items
          .map(
            x => `
<div class="smc-r-occ">
  <div class="smc-r-date">
    ${shortDate(
      x.date
    )}
  </div>

  <div>
    ${esc(
      x.name
    )}
  </div>

  <div class="${x.kind}">
    ${
      x.kind ===
      "income"
        ? "+"
        : "−"
    }${cash(
      x.amount
    )}
  </div>
</div>
`
          )
          .join("")
      : `
<div class="smc-r-empty">
  No active recurring items scheduled.
</div>
`
  }

</div>
`);
  }

  $("#smcRPreview")
    .innerHTML =
      months.join("");
}


async function load() {
  const u =
    await user();

  if (!u) {
    incomes = [];
    expenses = [];

    $("#smcRSigned")
      .style.display =
        "block";

    $("#smcRApp")
      .style.display =
        "none";

    return;
  }

  $("#smcRSigned")
    .style.display =
      "none";

  $("#smcRApp")
    .style.display =
      "";

  const [
    a,
    b
  ] =
    await Promise.all([
      sb
        .from(
          "recurring_income"
        )
        .select("*")
        .eq(
          "user_id",
          u.id
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
          u.id
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
    a.error
  ) {
    console.error(
      a.error
    );
  }

  if (
    b.error
  ) {
    console.error(
      b.error
    );
  }

  incomes =
    a.data ||
    [];

  expenses =
    b.data ||
    [];

  render();

  window.dispatchEvent(
    new CustomEvent(
      "stretchmycheck:recurring-updated",
      {
        detail: {
          income: [
            ...incomes
          ],

          expenses: [
            ...expenses
          ]
        }
      }
    )
  );
}


function init() {
  styles();

  if (
    !build() ||
    !nav()
  ) {
    return false;
  }

  ready = true;

  load()
    .then(
      route
    );

  return true;
}


function wait() {
  if (
    init()
  ) {
    return;
  }

  const o =
    new MutationObserver(
      () => {
        if (
          init()
        ) {
          o.disconnect();
        }
      }
    );

  o.observe(
    document.documentElement,
    {
      childList:
        true,

      subtree:
        true
    }
  );

  setTimeout(
    () => {
      if (
        !ready
      ) {
        init();
      }
    },
    1200
  );
}


if (
  location.hash ===
  "#recurring"
) {
  setTimeout(
    route,
    0
  );
}


window.addEventListener(
  "hashchange",
  route
);


sb.auth
  .onAuthStateChange(
    () =>
      setTimeout(
        () =>
          ready
            ? load()
            : init(),
        180
      )
  );


window.StretchMyCheckRecurring = {
  refresh:
    load,

  open:
    () =>
      openPage(
        true
      ),

  openAddIncome:
    () =>
      openForm(
        "income"
      ),

  openAddExpense:
    () =>
      openForm(
        "expense"
      ),

  getIncome:
    () =>
      incomes.map(
        x => ({
          ...x
        })
      ),

  getExpenses:
    () =>
      expenses.map(
        x => ({
          ...x
        })
      ),

  getUpcoming:
    (
      m = 3
    ) =>
      upcoming(m)
        .map(
          x => ({
            ...x,

            date:
              key(
                x.date
              )
          })
        ),

  getMonthlySummary:
    () => ({
      income:
        monthIncome(),

      expenses:
        monthExpenses(),

      room:
        monthIncome() -
        monthExpenses(),

      activeIncome:
        incomes.filter(
          x =>
            x.active !==
            false
        ).length,

      activeExpenses:
        expenses.filter(
          x =>
            x.active !==
            false
        ).length
    }),

  getIncomeOccurrences:
    (
      x,
      s,
      e
    ) =>
      occurrences(
        x,
        "income",
        parseDate(s),
        parseDate(e)
      ).map(
        key
      ),

  getExpenseOccurrences:
    (
      x,
      s,
      e
    ) =>
      occurrences(
        x,
        "expense",
        parseDate(s),
        parseDate(e)
      ).map(
        key
      )
};


wait();

})();