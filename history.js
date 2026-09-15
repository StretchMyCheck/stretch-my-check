(() => {
  "use strict";

  /*
  ============================================================
   STRETCH MY CHECK
   PLAN HISTORY
   Version 1.0
  ============================================================

   - Uses existing saved_plans
   - Uses existing plan_rollovers
   - Does NOT create or modify financial records
   - Adds History to the app navigation
   - Creates #history route
   - Shows newest/current plan
   - Shows plan timeline
   - Calculates plan financial summaries
   - Shows rollover relationships
   - Opens existing plans through plans.js
  ============================================================
  */

  const VERSION = "1.0.0";

  let plans = [];
  let rollovers = [];
  let currentUserId = null;
  let loading = false;

  /* ============================================================
     HELPERS
  ============================================================ */

  function moneyNumber(value) {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return 0;
    }

    if (typeof value === "number") {
      return Number.isFinite(value)
        ? Math.round(value * 100) / 100
        : 0;
    }

    const cleaned = String(value)
      .replace(/[$,\s]/g, "")
      .replace(/[^\d.-]/g, "");

    const parsed = Number(cleaned);

    return Number.isFinite(parsed)
      ? Math.round(parsed * 100) / 100
      : 0;
  }

  function money(value) {
    return moneyNumber(value).toLocaleString(
      "en-US",
      {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }
    );
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normalizeDate(value) {
    if (!value) {
      return "";
    }

    const text = String(value);

    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      return text;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    const year = date.getFullYear();

    const month = String(
      date.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
      date.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function localDate(value) {
    const normalized = normalizeDate(value);

    if (!normalized) {
      return null;
    }

    const [year, month, day] = normalized
      .split("-")
      .map(Number);

    return new Date(
      year,
      month - 1,
      day,
      12,
      0,
      0,
      0
    );
  }

  function formatDate(value) {
    const date = localDate(value);

    if (!date) {
      return "";
    }

    return date.toLocaleDateString(
      "en-US",
      {
        month: "short",
        day: "numeric",
        year: "numeric"
      }
    );
  }

  function formatShortDate(value) {
    const date = localDate(value);

    if (!date) {
      return "";
    }

    return date.toLocaleDateString(
      "en-US",
      {
        month: "short",
        day: "numeric"
      }
    );
  }

  function getSupabase() {
    if (!window.supabaseClient) {
      throw new Error(
        "Stretch My Check could not connect to Supabase."
      );
    }

    return window.supabaseClient;
  }

  async function getUser() {
    const supabase = getSupabase();

    const {
      data,
      error
    } = await supabase.auth.getUser();

    if (error) {
      throw error;
    }

    return data?.user || null;
  }

  function sleep(ms) {
    return new Promise(resolve => {
      setTimeout(resolve, ms);
    });
  }

  /* ============================================================
     PLAN DATA NORMALIZATION
  ============================================================ */

  function getPlanData(plan) {
    const data = plan?.plan_data;

    if (!data) {
      return {};
    }

    if (typeof data === "object") {
      return data;
    }

    try {
      return JSON.parse(data);
    } catch (error) {
      console.error(
        "Could not parse plan_data:",
        error
      );

      return {};
    }
  }

  function getPaychecks(plan) {
    const data = getPlanData(plan);

    if (!Array.isArray(data.paychecks)) {
      return [];
    }

    return data.paychecks
      .map(item => ({
        name:
          item?.name ||
          item?.paycheckName ||
          item?.title ||
          "Paycheck",

        date:
          normalizeDate(
            item?.date ||
            item?.payDate ||
            item?.pay_date
          ),

        amount:
          moneyNumber(item?.amount)
      }))
      .filter(item => {
        return item.date || item.amount > 0;
      })
      .sort((a, b) => {
        return a.date.localeCompare(b.date);
      });
  }

  function getBills(plan) {
    const data = getPlanData(plan);

    if (!Array.isArray(data.bills)) {
      return [];
    }

    return data.bills.map(item => ({
      name:
        item?.name ||
        item?.billName ||
        item?.title ||
        "Bill",

      amount:
        moneyNumber(item?.amount),

      type:
        item?.type ||
        item?.billType ||
        "fixed",

      priority:
        item?.priority ||
        "essential",

      dueDate:
        normalizeDate(
          item?.dueDate ||
          item?.due_date
        )
    }));
  }

  function livingCategory(
    data,
    key
  ) {
    const item = data?.[key];

    if (
      item &&
      typeof item === "object"
    ) {
      return {
        amount:
          moneyNumber(item.amount),

        mode:
          item.mode || "total"
      };
    }

    return {
      amount:
        moneyNumber(item),
      mode: "total"
    };
  }

  function getLiving(plan) {
    const data = getPlanData(plan);

    return {
      groceries:
        livingCategory(
          data,
          "groceries"
        ),

      gas:
        livingCategory(
          data,
          "gas"
        ),

      other:
        livingCategory(
          data,
          "other"
        )
    };
  }

  /* ============================================================
     PLAN CALCULATIONS
  ============================================================ */

  function calculateLivingTotal(plan) {
    const living = getLiving(plan);

    const paycheckCount =
      Math.max(
        getPaychecks(plan).length,
        1
      );

    function categoryTotal(category) {
      if (
        String(category.mode)
          .toLowerCase()
          .includes("paycheck")
      ) {
        return (
          category.amount *
          paycheckCount
        );
      }

      return category.amount;
    }

    return moneyNumber(
      categoryTotal(living.groceries) +
      categoryTotal(living.gas) +
      categoryTotal(living.other)
    );
  }

  function calculatePlan(plan) {
    const data = getPlanData(plan);

    const paychecks = getPaychecks(plan);
    const bills = getBills(plan);

    const startingBalance =
      moneyNumber(
        data.startingBalance ??
        data.starting_balance ??
        0
      );

    const protectedCushion =
      moneyNumber(
        data.protectedCushion ??
        data.protected_cushion ??
        0
      );

    const income =
      moneyNumber(
        paychecks.reduce(
          (sum, item) =>
            sum + item.amount,
          0
        )
      );

    const billTotal =
      moneyNumber(
        bills.reduce(
          (sum, item) =>
            sum + item.amount,
          0
        )
      );

    const livingTotal =
      calculateLivingTotal(plan);

    const needsTotal =
      moneyNumber(
        billTotal +
        livingTotal
      );

    /*
      Ending balance is the amount actually remaining after
      income, bills and living expenses.

      Protected cushion is NOT subtracted here because it is
      a reserve floor, not an expense.
    */

    const endingBalance =
      moneyNumber(
        startingBalance +
        income -
        needsTotal
      );

    const safeRemaining =
      moneyNumber(
        Math.max(
          endingBalance -
          protectedCushion,
          0
        )
      );

    return {
      startingBalance,
      protectedCushion,
      income,
      billTotal,
      livingTotal,
      needsTotal,
      endingBalance,
      safeRemaining,
      paycheckCount:
        paychecks.length,
      billCount:
        bills.length
    };
  }

  /* ============================================================
     PLAN PERIOD
  ============================================================ */

  function getIncomingRollover(planId) {
    return rollovers.find(item => {
      return Number(item.next_plan_id) ===
        Number(planId);
    }) || null;
  }

  function getOutgoingRollover(planId) {
    return rollovers.find(item => {
      return Number(item.source_plan_id) ===
        Number(planId);
    }) || null;
  }

  function getPlanPeriod(plan) {
    const paychecks = getPaychecks(plan);

    const incoming =
      getIncomingRollover(plan.id);

    let start =
      normalizeDate(
        incoming?.next_period_start
      );

    if (
      !start &&
      paychecks.length
    ) {
      start = paychecks[0].date;
    }

    let end = "";

    const outgoing =
      getOutgoingRollover(plan.id);

    if (outgoing?.source_period_end) {
      end = normalizeDate(
        outgoing.source_period_end
      );
    }

    /*
      If the plan hasn't rolled forward yet, use its final
      paycheck as the visible period endpoint.
    */

    if (
      !end &&
      paychecks.length
    ) {
      end =
        paychecks[
          paychecks.length - 1
        ].date;
    }

    return {
      start,
      end
    };
  }

  function periodLabel(plan) {
    const period = getPlanPeriod(plan);

    if (
      period.start &&
      period.end
    ) {
      return `${formatShortDate(
        period.start
      )} – ${formatDate(
        period.end
      )}`;
    }

    if (period.start) {
      return `Starting ${formatDate(
        period.start
      )}`;
    }

    return plan.plan_name ||
      "Saved Plan";
  }

  /* ============================================================
     DATABASE
  ============================================================ */

  async function fetchHistory() {
    const user = await getUser();

    if (!user) {
      currentUserId = null;
      plans = [];
      rollovers = [];

      return {
        plans,
        rollovers
      };
    }

    currentUserId = user.id;

    const supabase = getSupabase();

    const [
      planResult,
      rolloverResult
    ] = await Promise.all([
      supabase
        .from("saved_plans")
        .select(
          "id, plan_name, plan_data, created_at, updated_at"
        )
        .eq(
          "user_id",
          user.id
        )
        .order(
          "created_at",
          {
            ascending: true
          }
        ),

      supabase
        .from("plan_rollovers")
        .select(
          "id, source_plan_id, next_plan_id, source_plan_name, next_plan_name, source_period_end, next_period_start, carried_balance, protected_cushion, status, created_at, updated_at"
        )
        .eq(
          "user_id",
          user.id
        )
        .order(
          "created_at",
          {
            ascending: true
          }
        )
    ]);

    if (planResult.error) {
      throw planResult.error;
    }

    if (rolloverResult.error) {
      throw rolloverResult.error;
    }

    plans =
      Array.isArray(planResult.data)
        ? planResult.data
        : [];

    rollovers =
      Array.isArray(
        rolloverResult.data
      )
        ? rolloverResult.data
        : [];

    return {
      plans,
      rollovers
    };
  }

  /* ============================================================
     CURRENT PLAN
  ============================================================ */

  function newestPlan() {
    if (!plans.length) {
      return null;
    }

    /*
      A plan with no outgoing rollover is the end of the
      current rollover chain.

      If multiple unrelated plans exist, newest created plan
      wins among those.
    */

    const candidates =
      plans.filter(plan => {
        return !getOutgoingRollover(
          plan.id
        );
      });

    const source =
      candidates.length
        ? candidates
        : plans;

    return [...source].sort(
      (a, b) => {
        return (
          new Date(
            b.created_at ||
            b.updated_at ||
            0
          ).getTime() -
          new Date(
            a.created_at ||
            a.updated_at ||
            0
          ).getTime()
        );
      }
    )[0];
  }

  /* ============================================================
     SUMMARY
  ============================================================ */

  function historySummary() {
    const current = newestPlan();

    if (!current) {
      return {
        planCount: 0,
        currentBalance: 0,
        totalIncome: 0,
        totalNeeds: 0
      };
    }

    const currentCalc =
      calculatePlan(current);

    const totals =
      plans.reduce(
        (result, plan) => {
          const calc =
            calculatePlan(plan);

          result.income +=
            calc.income;

          result.needs +=
            calc.needsTotal;

          return result;
        },
        {
          income: 0,
          needs: 0
        }
      );

    return {
      planCount:
        plans.length,

      currentBalance:
        currentCalc.endingBalance,

      totalIncome:
        moneyNumber(
          totals.income
        ),

      totalNeeds:
        moneyNumber(
          totals.needs
        )
    };
  }

  /* ============================================================
     CSS
  ============================================================ */

  function injectStyles() {
    if (
      document.getElementById(
        "smcHistoryStyles"
      )
    ) {
      return;
    }

    const style =
      document.createElement(
        "style"
      );

    style.id =
      "smcHistoryStyles";

    style.textContent = `
      #smcHistoryPage {
        width: 100%;
        padding-bottom: 48px;
      }

      #smcHistoryPage * {
        box-sizing: border-box;
      }

      .smc-history-heading {
        margin-bottom: 26px;
      }

      .smc-history-heading h1 {
        margin: 0 0 7px;
        color: #f5fbff;
        font-size: clamp(26px, 3vw, 34px);
        line-height: 1.15;
      }

      .smc-history-heading p {
        margin: 0;
        color: #9db7c4;
        font-size: 14px;
        line-height: 1.55;
      }

      .smc-history-summary {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 16px;
        margin-bottom: 28px;
      }

      .smc-history-summary-card {
        min-height: 112px;
        padding: 20px;
        border: 1px solid #1e3c48;
        border-radius: 17px;
        background: #0d2029;
      }

      .smc-history-summary-label {
        margin-bottom: 10px;
        color: #a8c0cb;
        font-size: 12px;
        font-weight: 700;
      }

      .smc-history-summary-value {
        color: #f5fbff;
        font-size: 25px;
        font-weight: 900;
        line-height: 1.1;
      }

      .smc-history-summary-value.green {
        color: #42e5be;
      }

      .smc-history-section {
        padding: 24px;
        border: 1px solid #1e3c48;
        border-radius: 18px;
        background: #0c1c24;
      }

      .smc-history-section-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 18px;
        margin-bottom: 24px;
      }

      .smc-history-section-head h2 {
        margin: 0 0 6px;
        color: #f5fbff;
        font-size: 20px;
      }

      .smc-history-section-head p {
        margin: 0;
        color: #9db7c4;
        font-size: 13px;
        line-height: 1.5;
      }

      .smc-history-count {
        flex: 0 0 auto;
        padding: 7px 11px;
        border: 1px solid #244550;
        border-radius: 999px;
        background: #0a1a21;
        color: #a8c0cb;
        font-size: 11px;
        font-weight: 800;
      }

      .smc-history-timeline {
        position: relative;
        display: flex;
        flex-direction: column;
        gap: 22px;
      }

      .smc-history-item {
        position: relative;
        display: grid;
        grid-template-columns: 34px minmax(0, 1fr);
        gap: 16px;
      }

      .smc-history-line-area {
        position: relative;
        display: flex;
        justify-content: center;
      }

      .smc-history-line {
        position: absolute;
        top: 27px;
        bottom: -27px;
        width: 2px;
        background: #1d4650;
      }

      .smc-history-item:last-child
      .smc-history-line {
        display: none;
      }

      .smc-history-dot {
        position: relative;
        z-index: 2;
        width: 18px;
        height: 18px;
        margin-top: 21px;
        border: 4px solid #0c1c24;
        border-radius: 50%;
        background: #68828d;
        box-shadow:
          0 0 0 2px #294a55;
      }

      .smc-history-item.current
      .smc-history-dot {
        background: #42e5be;
        box-shadow:
          0 0 0 2px #1d8174,
          0 0 18px rgba(66,229,190,.25);
      }

      .smc-history-card {
        overflow: hidden;
        border: 1px solid #21414c;
        border-radius: 17px;
        background: #10242d;
      }

      .smc-history-card.current {
        border-color: #1d8174;
        box-shadow:
          inset 3px 0 0 #42e5be;
      }

      .smc-history-card-top {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 20px;
        padding: 20px 20px 17px;
        border-bottom: 1px solid #1d3944;
      }

      .smc-history-title-row {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 9px;
        margin-bottom: 5px;
      }

      .smc-history-title {
        margin: 0;
        color: #f5fbff;
        font-size: 18px;
        font-weight: 900;
      }

      .smc-history-badge {
        display: inline-flex;
        align-items: center;
        min-height: 23px;
        padding: 4px 8px;
        border-radius: 999px;
        border: 1px solid #247f72;
        background: rgba(30, 153, 134, .13);
        color: #52e7c3;
        font-size: 9px;
        font-weight: 900;
        letter-spacing: .04em;
        text-transform: uppercase;
      }

      .smc-history-period {
        color: #9db7c4;
        font-size: 12px;
        line-height: 1.45;
      }

      .smc-history-open {
        flex: 0 0 auto;
        min-height: 39px;
        padding: 0 15px;
        border: 1px solid #2b5864;
        border-radius: 11px;
        background: #122f39;
        color: #f5fbff;
        font: inherit;
        font-size: 12px;
        font-weight: 900;
        cursor: pointer;
        transition:
          transform .15s ease,
          border-color .15s ease,
          background .15s ease;
      }

      .smc-history-open:hover {
        transform: translateY(-1px);
        border-color: #37bfa9;
        background: #17434a;
      }

      .smc-history-metrics {
        display: grid;
        grid-template-columns:
          repeat(5, minmax(0, 1fr));
        gap: 1px;
        background: #1d3944;
        border-bottom: 1px solid #1d3944;
      }

      .smc-history-metric {
        min-width: 0;
        padding: 16px;
        background: #0e2028;
      }

      .smc-history-metric-label {
        display: block;
        margin-bottom: 7px;
        color: #91aab5;
        font-size: 10px;
        font-weight: 700;
      }

      .smc-history-metric-value {
        display: block;
        overflow: hidden;
        color: #f5fbff;
        font-size: 15px;
        font-weight: 900;
        text-overflow: ellipsis;
      }

      .smc-history-metric-value.income {
        color: #42e5be;
      }

      .smc-history-metric-value.expense {
        color: #ff7b86;
      }

      .smc-history-card-bottom {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 15px;
        padding: 14px 20px;
        color: #9db7c4;
        font-size: 11px;
      }

      .smc-history-rollover {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }

      .smc-history-rollover-icon {
        color: #42e5be;
        font-size: 16px;
        font-weight: 900;
      }

      .smc-history-rollover strong {
        color: #dceaf0;
      }

      .smc-history-created {
        flex: 0 0 auto;
        color: #78939f;
        text-align: right;
      }

      .smc-history-empty {
        padding: 45px 20px;
        border: 1px dashed #284650;
        border-radius: 15px;
        background: #091920;
        text-align: center;
      }

      .smc-history-empty-icon {
        margin-bottom: 12px;
        color: #42e5be;
        font-size: 30px;
      }

      .smc-history-empty h3 {
        margin: 0 0 7px;
        color: #f5fbff;
        font-size: 16px;
      }

      .smc-history-empty p {
        max-width: 480px;
        margin: 0 auto;
        color: #9db7c4;
        font-size: 12px;
        line-height: 1.55;
      }

      .smc-history-error {
        padding: 18px;
        border: 1px solid rgba(255,123,134,.35);
        border-radius: 14px;
        background: rgba(95,31,40,.2);
        color: #ffadb4;
        font-size: 13px;
        line-height: 1.5;
      }

      .smc-history-loading {
        padding: 40px 20px;
        color: #9db7c4;
        text-align: center;
        font-size: 13px;
      }

      @media (max-width: 1100px) {
        .smc-history-summary {
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
        }

        .smc-history-metrics {
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
        }

        .smc-history-metric:last-child {
          grid-column: span 2;
        }
      }

      @media (max-width: 700px) {
        #smcHistoryPage {
          padding-bottom: 95px;
        }

        .smc-history-heading {
          margin-bottom: 20px;
        }

        .smc-history-summary {
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 20px;
        }

        .smc-history-summary-card {
          min-height: 96px;
          padding: 15px;
        }

        .smc-history-summary-value {
          font-size: 20px;
        }

        .smc-history-section {
          padding: 16px;
        }

        .smc-history-section-head {
          margin-bottom: 18px;
        }

        .smc-history-item {
          grid-template-columns:
            24px minmax(0, 1fr);
          gap: 9px;
        }

        .smc-history-dot {
          width: 15px;
          height: 15px;
          margin-top: 19px;
          border-width: 3px;
        }

        .smc-history-card-top {
          flex-direction: column;
          gap: 13px;
          padding: 17px;
        }

        .smc-history-open {
          width: 100%;
        }

        .smc-history-metrics {
          grid-template-columns: 1fr 1fr;
        }

        .smc-history-metric {
          padding: 13px;
        }

        .smc-history-metric:last-child {
          grid-column: span 2;
        }

        .smc-history-card-bottom {
          flex-direction: column;
          align-items: flex-start;
          padding: 13px 17px;
        }

        .smc-history-created {
          text-align: left;
        }
      }

      @media (max-width: 430px) {
        .smc-history-summary {
          grid-template-columns: 1fr;
        }

        .smc-history-metrics {
          grid-template-columns: 1fr;
        }

        .smc-history-metric:last-child {
          grid-column: auto;
        }
      }
    `;

    document.head.appendChild(style);
  }

  /* ============================================================
     ICON
  ============================================================ */

  function historyIcon() {
    return `
      <svg
        viewBox="0 0 24 24"
        width="20"
        height="20"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M3 12a9 9 0 1 0 3-6.7"/>
        <path d="M3 4v5h5"/>
        <path d="M12 7v5l3 2"/>
      </svg>
    `;
  }

  /* ============================================================
     FIND APP SHELL
  ============================================================ */

  function getShell() {
    return document.getElementById(
      "smcAppShell"
    );
  }

  function findSidebar() {
    const shell = getShell();

    if (!shell) {
      return null;
    }

    const accountCandidates = [
      ...shell.querySelectorAll(
        "a, button"
      )
    ];

    const accountButton =
      accountCandidates.find(item => {
        return item.textContent
          ?.trim()
          .toLowerCase() ===
          "account";
      });

    if (!accountButton) {
      return null;
    }

    return {
      accountButton,
      parent:
        accountButton.parentElement
    };
  }

  /* ============================================================
     ADD SIDEBAR NAV
  ============================================================ */

  function createHistoryNav() {
    if (
      document.getElementById(
        "smcHistoryNav"
      )
    ) {
      return;
    }

    const sidebar = findSidebar();

    if (!sidebar?.accountButton) {
      return;
    }

    const account =
      sidebar.accountButton;

    const nav =
      account.cloneNode(true);

    nav.id =
      "smcHistoryNav";

    /*
      Remove any shell-specific active state copied from Account.
    */

    nav.classList.remove(
      "active",
      "is-active",
      "selected"
    );

    nav.removeAttribute(
      "aria-current"
    );

    if (
      nav.tagName.toLowerCase() ===
      "a"
    ) {
      nav.setAttribute(
        "href",
        "#history"
      );
    }

    nav.dataset.route =
      "history";

    const textElements = [
      ...nav.querySelectorAll("*")
    ];

    const textNode =
      textElements.find(element => {
        return element.textContent
          ?.trim()
          .toLowerCase() ===
          "account";
      });

    if (textNode) {
      /*
        If this node contains the icon too, replacing
        textContent would destroy it. Only replace simple
        text-only nodes.
      */

      if (
        textNode.children.length === 0
      ) {
        textNode.textContent =
          "History";
      }
    }

    /*
      Fallback for common nav structures.
    */

    const spans = [
      ...nav.querySelectorAll(
        "span"
      )
    ];

    const accountSpan =
      spans.find(span => {
        return span.textContent
          ?.trim()
          .toLowerCase() ===
          "account";
      });

    if (accountSpan) {
      accountSpan.textContent =
        "History";
    }

    /*
      Replace cloned Account icon.
    */

    const svg =
      nav.querySelector("svg");

    if (svg) {
      const holder =
        document.createElement(
          "span"
        );

      holder.innerHTML =
        historyIcon();

      svg.replaceWith(
        holder.firstElementChild
      );
    }

    /*
      Last-resort rebuild if cloning did not expose separate
      text/icon elements.
    */

    if (
      nav.textContent
        ?.trim()
        .toLowerCase() ===
      "account"
    ) {
      nav.innerHTML = `
        ${historyIcon()}
        <span>History</span>
      `;
    }

    nav.addEventListener(
      "click",
      event => {
        event.preventDefault();

        window.location.hash =
          "#history";

        renderRoute();
      }
    );

    account.parentNode.insertBefore(
      nav,
      account
    );
  }

  /* ============================================================
     FIND MAIN CONTENT AREA
  ============================================================ */

  function findPageHost() {
    const shell = getShell();

    if (!shell) {
      return null;
    }

    /*
      app-shell.js already creates route pages. We find the
      existing #plan page and use its parent as the page host.
    */

    const knownPages = [
      document.getElementById(
        "smcPlanPage"
      ),

      document.getElementById(
        "smcHomePage"
      ),

      document.getElementById(
        "smcGoalsPage"
      ),

      document.getElementById(
        "smcAccountPage"
      )
    ].filter(Boolean);

    if (knownPages.length) {
      return knownPages[0].parentElement;
    }

    /*
      Fallback: find main element inside shell.
    */

    return (
      shell.querySelector("main") ||
      shell.querySelector(
        '[role="main"]'
      )
    );
  }

  /* ============================================================
     CREATE PAGE
  ============================================================ */

  function ensureHistoryPage() {
    let page =
      document.getElementById(
        "smcHistoryPage"
      );

    if (page) {
      return page;
    }

    const host =
      findPageHost();

    if (!host) {
      return null;
    }

    page =
      document.createElement(
        "section"
      );

    page.id =
      "smcHistoryPage";

    page.dataset.smcRoute =
      "history";

    page.style.display =
      "none";

    host.appendChild(page);

    return page;
  }

  /* ============================================================
     RENDER PLAN CARD
  ============================================================ */

  function renderPlanCard(
    plan,
    isCurrent
  ) {
    const calc =
      calculatePlan(plan);

    const incoming =
      getIncomingRollover(
        plan.id
      );

    const outgoing =
      getOutgoingRollover(
        plan.id
      );

    const period =
      periodLabel(plan);

    let rolloverText = "";

    if (outgoing) {
      rolloverText = `
        <span class="smc-history-rollover-icon">
          →
        </span>

        <span>
          Rolled forward
          <strong>
            ${money(
              outgoing.carried_balance
            )}
          </strong>
          into
          <strong>
            ${escapeHtml(
              outgoing.next_plan_name ||
              "next plan"
            )}
          </strong>
        </span>
      `;
    } else if (incoming) {
      rolloverText = `
        <span class="smc-history-rollover-icon">
          ✓
        </span>

        <span>
          Started with
          <strong>
            ${money(
              incoming.carried_balance
            )}
          </strong>
          carried forward
        </span>
      `;
    } else {
      rolloverText = `
        <span class="smc-history-rollover-icon">
          •
        </span>

        <span>
          Original saved plan
        </span>
      `;
    }

    const created =
      plan.created_at
        ? new Date(
            plan.created_at
          ).toLocaleDateString(
            "en-US",
            {
              month: "short",
              day: "numeric",
              year: "numeric"
            }
          )
        : "";

    return `
      <div
        class="smc-history-item ${
          isCurrent
            ? "current"
            : ""
        }"
      >
        <div class="smc-history-line-area">
          <div class="smc-history-dot"></div>
          <div class="smc-history-line"></div>
        </div>

        <article
          class="smc-history-card ${
            isCurrent
              ? "current"
              : ""
          }"
        >
          <div class="smc-history-card-top">
            <div>
              <div class="smc-history-title-row">
                <h3 class="smc-history-title">
                  ${escapeHtml(
                    plan.plan_name ||
                    "Saved Plan"
                  )}
                </h3>

                ${
                  isCurrent
                    ? `
                      <span class="smc-history-badge">
                        Current Plan
                      </span>
                    `
                    : ""
                }
              </div>

              <div class="smc-history-period">
                ${escapeHtml(period)}
              </div>
            </div>

            <button
              type="button"
              class="smc-history-open"
              data-history-open-plan="${Number(
                plan.id
              )}"
            >
              Open Plan
            </button>
          </div>

          <div class="smc-history-metrics">
            <div class="smc-history-metric">
              <span class="smc-history-metric-label">
                Starting Money
              </span>

              <span class="smc-history-metric-value">
                ${money(
                  calc.startingBalance
                )}
              </span>
            </div>

            <div class="smc-history-metric">
              <span class="smc-history-metric-label">
                Income
              </span>

              <span class="smc-history-metric-value income">
                +${money(
                  calc.income
                )}
              </span>
            </div>

            <div class="smc-history-metric">
              <span class="smc-history-metric-label">
                Bills & Needs
              </span>

              <span class="smc-history-metric-value expense">
                −${money(
                  calc.needsTotal
                )}
              </span>
            </div>

            <div class="smc-history-metric">
              <span class="smc-history-metric-label">
                Protected Cushion
              </span>

              <span class="smc-history-metric-value">
                ${money(
                  calc.protectedCushion
                )}
              </span>
            </div>

            <div class="smc-history-metric">
              <span class="smc-history-metric-label">
                Ending Balance
              </span>

              <span class="smc-history-metric-value ${
                calc.endingBalance >= 0
                  ? "income"
                  : "expense"
              }">
                ${money(
                  calc.endingBalance
                )}
              </span>
            </div>
          </div>

          <div class="smc-history-card-bottom">
            <div class="smc-history-rollover">
              ${rolloverText}
            </div>

            ${
              created
                ? `
                  <div class="smc-history-created">
                    Saved ${escapeHtml(
                      created
                    )}
                  </div>
                `
                : ""
            }
          </div>
        </article>
      </div>
    `;
  }

  /* ============================================================
     RENDER PAGE
  ============================================================ */

  function renderHistoryContent() {
    const page =
      ensureHistoryPage();

    if (!page) {
      return;
    }

    if (loading) {
      page.innerHTML = `
        <div class="smc-history-heading">
          <h1>Plan History</h1>
          <p>
            See how your paycheck plans have changed over time.
          </p>
        </div>

        <div class="smc-history-loading">
          Loading your plan history...
        </div>
      `;

      return;
    }

    if (!currentUserId) {
      page.innerHTML = `
        <div class="smc-history-heading">
          <h1>Plan History</h1>
          <p>
            See how your paycheck plans have changed over time.
          </p>
        </div>

        <div class="smc-history-empty">
          <div class="smc-history-empty-icon">
            ◷
          </div>

          <h3>Sign in to see your history</h3>

          <p>
            Your saved paycheck plans and rollover history
            will appear here after you sign in.
          </p>
        </div>
      `;

      return;
    }

    if (!plans.length) {
      page.innerHTML = `
        <div class="smc-history-heading">
          <h1>Plan History</h1>
          <p>
            See how your paycheck plans have changed over time.
          </p>
        </div>

        <div class="smc-history-empty">
          <div class="smc-history-empty-icon">
            ◷
          </div>

          <h3>No plan history yet</h3>

          <p>
            Save your first paycheck plan and it will appear
            here automatically.
          </p>
        </div>
      `;

      return;
    }

    const current =
      newestPlan();

    const summary =
      historySummary();

    const orderedPlans =
      [...plans].sort(
        (a, b) => {
          const aPeriod =
            getPlanPeriod(a);

          const bPeriod =
            getPlanPeriod(b);

          const aDate =
            aPeriod.start ||
            normalizeDate(
              a.created_at
            );

          const bDate =
            bPeriod.start ||
            normalizeDate(
              b.created_at
            );

          return String(
            bDate
          ).localeCompare(
            String(aDate)
          );
        }
      );

    page.innerHTML = `
      <div class="smc-history-heading">
        <h1>Plan History</h1>

        <p>
          Follow your money from one paycheck plan to the next.
        </p>
      </div>

      <div class="smc-history-summary">
        <div class="smc-history-summary-card">
          <div class="smc-history-summary-label">
            Saved Plans
          </div>

          <div class="smc-history-summary-value">
            ${summary.planCount}
          </div>
        </div>

        <div class="smc-history-summary-card">
          <div class="smc-history-summary-label">
            Current Ending Balance
          </div>

          <div class="smc-history-summary-value green">
            ${money(
              summary.currentBalance
            )}
          </div>
        </div>

        <div class="smc-history-summary-card">
          <div class="smc-history-summary-label">
            Income Across Plans
          </div>

          <div class="smc-history-summary-value green">
            ${money(
              summary.totalIncome
            )}
          </div>
        </div>

        <div class="smc-history-summary-card">
          <div class="smc-history-summary-label">
            Bills & Needs Across Plans
          </div>

          <div class="smc-history-summary-value">
            ${money(
              summary.totalNeeds
            )}
          </div>
        </div>
      </div>

      <section class="smc-history-section">
        <div class="smc-history-section-head">
          <div>
            <h2>Your Plan Timeline</h2>

            <p>
              Your newest plan appears first. Older plans stay
              available whenever you want to review them.
            </p>
          </div>

          <div class="smc-history-count">
            ${plans.length}
            ${
              plans.length === 1
                ? "plan"
                : "plans"
            }
          </div>
        </div>

        <div class="smc-history-timeline">
          ${orderedPlans
            .map(plan => {
              return renderPlanCard(
                plan,
                Number(plan.id) ===
                  Number(current?.id)
              );
            })
            .join("")}
        </div>
      </section>
    `;

    bindOpenButtons();
  }

  /* ============================================================
     OPEN PLAN
  ============================================================ */

  async function openPlan(planId) {
    const plan =
      plans.find(item => {
        return Number(item.id) ===
          Number(planId);
      });

    if (!plan) {
      window.alert(
        "Stretch My Check could not find that saved plan."
      );

      return;
    }

    if (
      !window.StretchMyCheckPlans ||
      typeof window
        .StretchMyCheckPlans
        .loadPlan !==
        "function"
    ) {
      window.alert(
        "The saved-plan loader is not ready."
      );

      return;
    }

    try {
      window.location.hash =
        "#plan";

      await sleep(100);

      await window
        .StretchMyCheckPlans
        .loadPlan(plan);

      await sleep(250);

      const optimizeButton =
        document.getElementById(
          "optimizeButton"
        );

      if (optimizeButton) {
        optimizeButton.click();
      }

      await sleep(200);

      if (
        window
          .StretchMyCheckDashboard &&
        typeof window
          .StretchMyCheckDashboard
          .refresh ===
          "function"
      ) {
        window
          .StretchMyCheckDashboard
          .refresh();
      }

      if (
        window
          .StretchMyCheckForecast &&
        typeof window
          .StretchMyCheckForecast
          .refresh ===
          "function"
      ) {
        window
          .StretchMyCheckForecast
          .refresh();
      }

    } catch (error) {
      console.error(
        "Could not open history plan:",
        error
      );

      window.alert(
        error?.message ||
        "Stretch My Check could not open that plan."
      );
    }
  }

  function bindOpenButtons() {
    const page =
      document.getElementById(
        "smcHistoryPage"
      );

    if (!page) {
      return;
    }

    page
      .querySelectorAll(
        "[data-history-open-plan]"
      )
      .forEach(button => {
        if (
          button.dataset.bound ===
          "true"
        ) {
          return;
        }

        button.dataset.bound =
          "true";

        button.addEventListener(
          "click",
          () => {
            openPlan(
              button.dataset
                .historyOpenPlan
            );
          }
        );
      });
  }

  /* ============================================================
     ROUTING
  ============================================================ */

  function hideOtherPages() {
    const historyPage =
      document.getElementById(
        "smcHistoryPage"
      );

    if (!historyPage) {
      return;
    }

    const host =
      historyPage.parentElement;

    if (!host) {
      return;
    }

    [
      ...host.children
    ].forEach(child => {
      if (
        child === historyPage
      ) {
        return;
      }

      /*
        Only hide app-shell route/page containers.
        Do not hide unrelated global overlays/modals.
      */

      if (
        child.id &&
        /Page$/i.test(child.id)
      ) {
        child.style.display =
          "none";
      }
    });
  }

  function showHistoryPage() {
    const page =
      ensureHistoryPage();

    if (!page) {
      return;
    }

    hideOtherPages();

    page.style.display =
      "";

    setNavActive();

    refresh();
  }

  function setNavActive() {
    const historyNav =
      document.getElementById(
        "smcHistoryNav"
      );

    if (!historyNav) {
      return;
    }

    const parent =
      historyNav.parentElement;

    if (parent) {
      [
        ...parent.children
      ].forEach(item => {
        item.classList.remove(
          "active",
          "is-active",
          "selected"
        );

        item.removeAttribute(
          "aria-current"
        );
      });
    }

    historyNav.classList.add(
      "active"
    );

    historyNav.setAttribute(
      "aria-current",
      "page"
    );
  }

  function renderRoute() {
    const route =
      window.location.hash
        .replace("#", "")
        .trim()
        .toLowerCase();

    if (route === "history") {
      showHistoryPage();
      return;
    }

    const page =
      document.getElementById(
        "smcHistoryPage"
      );

    if (page) {
      page.style.display =
        "none";
    }
  }

  /* ============================================================
     REFRESH
  ============================================================ */

  async function refresh() {
    if (loading) {
      return;
    }

    loading = true;

    renderHistoryContent();

    try {
      await fetchHistory();

    } catch (error) {
      console.error(
        "Could not load Plan History:",
        error
      );

      const page =
        ensureHistoryPage();

      if (page) {
        page.innerHTML = `
          <div class="smc-history-heading">
            <h1>Plan History</h1>

            <p>
              See how your paycheck plans have changed over time.
            </p>
          </div>

          <div class="smc-history-error">
            ${
              escapeHtml(
                error?.message ||
                "Stretch My Check could not load your plan history."
              )
            }
          </div>
        `;
      }

      return;

    } finally {
      loading = false;
    }

    renderHistoryContent();
  }

  /* ============================================================
     SHELL REPAIR / INITIALIZATION
  ============================================================ */

  function ensureFeature() {
    injectStyles();
    createHistoryNav();
    ensureHistoryPage();

    if (
      window.location.hash ===
      "#history"
    ) {
      renderRoute();
    }
  }

  let repairTimer = null;

  function scheduleRepair() {
    if (repairTimer) {
      clearTimeout(
        repairTimer
      );
    }

    repairTimer =
      setTimeout(
        () => {
          ensureFeature();
        },
        80
      );
  }

  const observer =
    new MutationObserver(
      () => {
        scheduleRepair();
      }
    );

  /* ============================================================
     EVENTS
  ============================================================ */

  window.addEventListener(
    "hashchange",
    () => {
      ensureFeature();
      renderRoute();
    }
  );

  window.addEventListener(
    "stretchmycheck:rollover-created",
    () => {
      refresh();
    }
  );

  window.addEventListener(
    "stretchmycheck:plan-loaded",
    () => {
      if (
        window.location.hash ===
        "#history"
      ) {
        refresh();
      }
    }
  );

  window.addEventListener(
    "stretchmycheck:profile-updated",
    () => {
      if (
        window.location.hash ===
        "#history"
      ) {
        refresh();
      }
    }
  );

  /* ============================================================
     AUTH EVENT
  ============================================================ */

  function bindAuth() {
    try {
      const supabase =
        getSupabase();

      supabase.auth.onAuthStateChange(
        () => {
          currentUserId = null;

          if (
            window.location.hash ===
            "#history"
          ) {
            setTimeout(
              refresh,
              100
            );
          }
        }
      );

    } catch (error) {
      console.warn(
        "History auth listener not ready:",
        error
      );
    }
  }

  /* ============================================================
     PUBLIC API
  ============================================================ */

  window.StretchMyCheckHistory = {
    refresh,
    openPlan,
    getPlans: () => [...plans],
    getRollovers: () => [...rollovers],
    version: VERSION
  };

  /* ============================================================
     START
  ============================================================ */

  function start() {
    ensureFeature();
    bindAuth();

    observer.observe(
      document.documentElement,
      {
        childList: true,
        subtree: true
      }
    );

    if (
      window.location.hash ===
      "#history"
    ) {
      renderRoute();
    }

    console.info(
      `Stretch My Check Plan History v${VERSION} ready.`
    );
  }

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      start,
      {
        once: true
      }
    );
  } else {
    start();
  }

})();