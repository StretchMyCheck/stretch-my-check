(() => {
  "use strict";

  /* =========================================================
     STRETCH MY CHECK
     MONEY DASHBOARD + MAKE IT TO PAYDAY
     dashboard.js
     ========================================================= */

  const money = value => {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const currency = value =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD"
    }).format(value || 0);

  function parseLocalDate(value) {
    if (!value) return null;

    const parts = value.split("-").map(Number);

    if (parts.length !== 3) {
      return null;
    }

    const [year, month, day] = parts;

    const date = new Date(
      year,
      month - 1,
      day,
      12,
      0,
      0,
      0
    );

    return Number.isNaN(date.getTime())
      ? null
      : date;
  }

  function todayDate() {
    const now = new Date();

    return new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      12,
      0,
      0,
      0
    );
  }

  function formatDate(date) {
    if (!date) return "Not entered";

    return date.toLocaleDateString(
      "en-US",
      {
        weekday: "short",
        month: "short",
        day: "numeric"
      }
    );
  }

  function daysBetween(from, to) {
    if (!from || !to) return 0;

    const oneDay =
      1000 * 60 * 60 * 24;

    return Math.max(
      0,
      Math.ceil(
        (to.getTime() - from.getTime()) /
        oneDay
      )
    );
  }

  /* =========================================================
     STYLES
     ========================================================= */

  const style =
    document.createElement("style");

  style.textContent = `
    .money-dashboard {
      margin-bottom: 20px;
      overflow: hidden;
      border-radius: 22px;
      background:
        linear-gradient(
          135deg,
          #173943 0%,
          #206677 55%,
          #2c8794 100%
        );
      color: white;
      box-shadow:
        0 12px 34px
        rgba(16, 48, 58, .18);
    }

    .money-dashboard-inner {
      padding: 26px;
    }

    .money-dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 18px;
      margin-bottom: 22px;
    }

    .money-dashboard-title {
      margin: 0;
      font-size: 27px;
      line-height: 1.15;
      font-weight: 850;
    }

    .money-dashboard-subtitle {
      margin: 7px 0 0;
      max-width: 650px;
      color:
        rgba(255,255,255,.82);
      line-height: 1.5;
      font-size: 14px;
    }

    .money-weather {
      flex-shrink: 0;
      border-radius: 999px;
      padding: 9px 13px;
      font-size: 13px;
      font-weight: 850;
      background:
        rgba(255,255,255,.14);
      border:
        1px solid
        rgba(255,255,255,.22);
      white-space: nowrap;
    }

    .money-weather.comfortable {
      background:
        rgba(46, 204, 113, .18);
    }

    .money-weather.tight {
      background:
        rgba(255, 193, 7, .20);
    }

    .money-weather.risk {
      background:
        rgba(255, 133, 27, .20);
    }

    .money-weather.shortfall {
      background:
        rgba(231, 76, 60, .22);
    }

    .dashboard-primary {
      display: grid;
      grid-template-columns:
        minmax(0, 1.25fr)
        minmax(0, .75fr);
      gap: 15px;
      margin-bottom: 15px;
    }

    .payday-main-card,
    .payday-next-card {
      border-radius: 18px;
      padding: 21px;
      background:
        rgba(255,255,255,.11);
      border:
        1px solid
        rgba(255,255,255,.18);
      backdrop-filter:
        blur(8px);
    }

    .dashboard-label {
      display: block;
      margin-bottom: 6px;
      color:
        rgba(255,255,255,.76);
      font-size: 13px;
      font-weight: 700;
    }

    .safe-money-number {
      display: block;
      margin:
        2px 0 5px;
      font-size: 42px;
      line-height: 1;
      letter-spacing: -1.5px;
      font-weight: 900;
    }

    .dashboard-small-copy {
      margin: 7px 0 0;
      color:
        rgba(255,255,255,.78);
      line-height: 1.45;
      font-size: 13px;
    }

    .next-payday-amount {
      display: block;
      margin-top: 8px;
      font-size: 25px;
      font-weight: 850;
    }

    .next-payday-date {
      margin-top: 4px;
      font-size: 14px;
      color:
        rgba(255,255,255,.84);
    }

    .dashboard-stats {
      display: grid;
      grid-template-columns:
        repeat(4, minmax(0,1fr));
      gap: 11px;
    }

    .dashboard-stat {
      min-width: 0;
      border-radius: 15px;
      padding: 15px;
      background:
        rgba(255,255,255,.09);
      border:
        1px solid
        rgba(255,255,255,.14);
    }

    .dashboard-stat span {
      display: block;
      color:
        rgba(255,255,255,.72);
      font-size: 12px;
      line-height: 1.3;
      margin-bottom: 5px;
    }

    .dashboard-stat strong {
      display: block;
      font-size: 20px;
      line-height: 1.2;
      overflow-wrap: anywhere;
    }

    .dashboard-explanation {
      margin-top: 17px;
      border-radius: 15px;
      padding: 15px 17px;
      background:
        rgba(4, 20, 26, .16);
      color:
        rgba(255,255,255,.88);
      line-height: 1.55;
      font-size: 14px;
    }

    .dashboard-explanation strong {
      color: white;
    }

    .dashboard-empty-note {
      color:
        rgba(255,255,255,.78);
    }

    @media (max-width: 850px) {
      .dashboard-primary {
        grid-template-columns: 1fr;
      }

      .dashboard-stats {
        grid-template-columns:
          repeat(2, minmax(0,1fr));
      }

      .money-dashboard-header {
        flex-direction: column;
      }
    }

    @media (max-width: 520px) {
      .money-dashboard-inner {
        padding: 19px;
      }

      .money-dashboard-title {
        font-size: 23px;
      }

      .safe-money-number {
        font-size: 36px;
      }

      .dashboard-stats {
        grid-template-columns: 1fr 1fr;
      }

      .dashboard-stat {
        padding: 13px;
      }

      .dashboard-stat strong {
        font-size: 17px;
      }
    }

    @media print {
      .money-dashboard {
        display: none !important;
      }
    }
  `;

  document.head.appendChild(style);

  /* =========================================================
     DASHBOARD HTML
     ========================================================= */

  const dashboard =
    document.createElement("section");

  dashboard.className =
    "money-dashboard no-print";

  dashboard.innerHTML = `
    <div class="money-dashboard-inner">

      <div class="money-dashboard-header">

        <div>
          <h2 class="money-dashboard-title">
            Make It to Payday
          </h2>

          <p class="money-dashboard-subtitle">
            See what needs to stay protected,
            what's coming up before your next
            paycheck, and what you can safely
            spend right now.
          </p>
        </div>

        <div
          id="moneyWeather"
          class="money-weather"
        >
          ⏳ Add your money
        </div>

      </div>

      <div class="dashboard-primary">

        <div class="payday-main-card">

          <span class="dashboard-label">
            SAFE TO SPEND UNTIL PAYDAY
          </span>

          <strong
            id="dashboardSafeToSpend"
            class="safe-money-number"
          >
            $0.00
          </strong>

          <p
            id="dashboardSafeMessage"
            class="dashboard-small-copy"
          >
            Add your money, paychecks,
            and bills below to get started.
          </p>

        </div>

        <div class="payday-next-card">

          <span class="dashboard-label">
            NEXT PAYDAY
          </span>

          <strong
            id="dashboardNextPaycheck"
            class="next-payday-amount"
          >
            —
          </strong>

          <div
            id="dashboardNextPaycheckDate"
            class="next-payday-date"
          >
            Add a paycheck date
          </div>

        </div>

      </div>

      <div class="dashboard-stats">

        <div class="dashboard-stat">
          <span>
            Money Available Now
          </span>
          <strong
            id="dashboardCurrentMoney"
          >
            $0.00
          </strong>
        </div>

        <div class="dashboard-stat">
          <span>
            Bills Before Payday
          </span>
          <strong
            id="dashboardBillsBeforePayday"
          >
            $0.00
          </strong>
        </div>

        <div class="dashboard-stat">
          <span>
            Protected Cushion
          </span>
          <strong
            id="dashboardCushion"
          >
            $0.00
          </strong>
        </div>

        <div class="dashboard-stat">
          <span>
            Daily Safe Spending
          </span>
          <strong
            id="dashboardDailySafe"
          >
            $0.00
          </strong>
        </div>

      </div>

      <div
        id="dashboardExplanation"
        class="dashboard-explanation"
      >
        <span class="dashboard-empty-note">
          Your personalized money forecast
          will appear here as you fill out
          the planner.
        </span>
      </div>

    </div>
  `;

  /* =========================================================
     INSERT DASHBOARD
     ========================================================= */

  const intro =
    document.querySelector(
      ".intro-card"
    );

  if (
    intro &&
    intro.parentNode
  ) {
    intro.insertAdjacentElement(
      "afterend",
      dashboard
    );
  } else {
    document
      .querySelector(".app")
      ?.prepend(dashboard);
  }

  /* =========================================================
     READ PAYCHECKS
     ========================================================= */

  function getPaychecks() {
    return [
      ...document.querySelectorAll(
        ".paycheck-entry"
      )
    ]
      .map(entry => {
        const dateValue =
          entry.querySelector(
            ".paycheck-date"
          )?.value || "";

        const amount =
          money(
            entry.querySelector(
              ".paycheck-amount"
            )?.value
          );

        return {
          date:
            parseLocalDate(dateValue),

          amount
        };
      })
      .filter(
        paycheck =>
          paycheck.date
      )
      .sort(
        (a, b) =>
          a.date - b.date
      );
  }

  /* =========================================================
     NEXT PAYCHECK
     ========================================================= */

  function getNextPaycheck(
    paychecks,
    today
  ) {
    return (
      paychecks.find(
        paycheck =>
          paycheck.date >= today
      ) ||
      null
    );
  }

  /* =========================================================
     BILLS BEFORE PAYDAY
     ========================================================= */

  function getBillsBeforePayday(
    today,
    payday
  ) {
    if (!payday) {
      return 0;
    }

    return [
      ...document.querySelectorAll(
        ".bill-entry"
      )
    ].reduce(
      (
        total,
        entry
      ) => {
        const type =
          entry.querySelector(
            ".bill-type"
          )?.value;

        const amount =
          money(
            entry.querySelector(
              ".bill-amount"
            )?.value
          );

        if (
          type !== "fixed" ||
          amount <= 0
        ) {
          return total;
        }

        const dueDate =
          parseLocalDate(
            entry.querySelector(
              ".bill-due-date"
            )?.value
          );

        if (!dueDate) {
          return total;
        }

        /*
          Bills due today or any day
          before the next paycheck must
          stay reserved.
        */

        if (
          dueDate >= today &&
          dueDate < payday
        ) {
          return total + amount;
        }

        return total;
      },
      0
    );
  }

  /* =========================================================
     LIVING MONEY BEFORE PAYDAY
     ========================================================= */

  function necessityForOnePeriod(
    amountId,
    modeId,
    paycheckCount
  ) {
    const amount =
      money(
        document.getElementById(
          amountId
        )?.value
      );

    const mode =
      document.getElementById(
        modeId
      )?.value || "total";

    if (amount <= 0) {
      return 0;
    }

    if (mode === "percheck") {
      return amount;
    }

    /*
      When the user entered a total
      for the whole planning period,
      reserve an equal share for the
      upcoming paycheck period.
    */

    const divisor =
      Math.max(
        paycheckCount,
        1
      );

    return amount / divisor;
  }

  function getLivingMoneyNeeded(
    paycheckCount
  ) {
    const groceries =
      necessityForOnePeriod(
        "groceryAmount",
        "groceryMode",
        paycheckCount
      );

    const gas =
      necessityForOnePeriod(
        "gasAmount",
        "gasMode",
        paycheckCount
      );

    const other =
      necessityForOnePeriod(
        "otherAmount",
        "otherMode",
        paycheckCount
      );

    return (
      groceries +
      gas +
      other
    );
  }

  /* =========================================================
     MONEY FORECAST
     ========================================================= */

  function getForecast(
    safeToSpend,
    daysUntilPayday,
    hasPaycheck
  ) {
    if (!hasPaycheck) {
      return {
        className: "",
        text:
          "⏳ Add your next payday"
      };
    }

    if (safeToSpend < 0) {
      return {
        className:
          "shortfall",
        text:
          "🔴 Shortfall Expected"
      };
    }

    if (safeToSpend === 0) {
      return {
        className:
          "risk",
        text:
          "🟠 At Risk"
      };
    }

    const days =
      Math.max(
        daysUntilPayday,
        1
      );

    const daily =
      safeToSpend / days;

    if (daily < 10) {
      return {
        className:
          "risk",
        text:
          "🟠 At Risk"
      };
    }

    if (daily < 25) {
      return {
        className:
          "tight",
        text:
          "🟡 Getting Tight"
      };
    }

    return {
      className:
        "comfortable",
      text:
        "🟢 Comfortable"
    };
  }

  /* =========================================================
     UPDATE DASHBOARD
     ========================================================= */

  function updateDashboard() {
    const startingBalance =
      money(
        document.getElementById(
          "startingBalance"
        )?.value
      );

    const cushion =
      money(
        document.getElementById(
          "protectedCushion"
        )?.value
      );

    const today =
      todayDate();

    const paychecks =
      getPaychecks();

    const nextPaycheck =
      getNextPaycheck(
        paychecks,
        today
      );

    const billsBeforePayday =
      getBillsBeforePayday(
        today,
        nextPaycheck?.date
      );

    const livingMoney =
      nextPaycheck
        ? getLivingMoneyNeeded(
            paychecks.length
          )
        : 0;

    const safeToSpend =
      startingBalance -
      cushion -
      billsBeforePayday -
      livingMoney;

    const displayedSafe =
      Math.max(
        safeToSpend,
        0
      );

    const daysUntilPayday =
      nextPaycheck
        ? daysBetween(
            today,
            nextPaycheck.date
          )
        : 0;

    const spendingDays =
      Math.max(
        daysUntilPayday,
        1
      );

    const dailySafe =
      nextPaycheck
        ? displayedSafe /
          spendingDays
        : 0;

    /* ------------------------- */
    /* MAIN NUMBERS */
    /* ------------------------- */

    const safeElement =
      document.getElementById(
        "dashboardSafeToSpend"
      );

    const currentElement =
      document.getElementById(
        "dashboardCurrentMoney"
      );

    const billsElement =
      document.getElementById(
        "dashboardBillsBeforePayday"
      );

    const cushionElement =
      document.getElementById(
        "dashboardCushion"
      );

    const dailyElement =
      document.getElementById(
        "dashboardDailySafe"
      );

    const paycheckElement =
      document.getElementById(
        "dashboardNextPaycheck"
      );

    const paycheckDateElement =
      document.getElementById(
        "dashboardNextPaycheckDate"
      );

    if (safeElement) {
      safeElement.textContent =
        currency(displayedSafe);
    }

    if (currentElement) {
      currentElement.textContent =
        currency(startingBalance);
    }

    if (billsElement) {
      billsElement.textContent =
        currency(
          billsBeforePayday
        );
    }

    if (cushionElement) {
      cushionElement.textContent =
        currency(cushion);
    }

    if (dailyElement) {
      dailyElement.textContent =
        nextPaycheck
          ? currency(dailySafe)
          : "—";
    }

    if (paycheckElement) {
      paycheckElement.textContent =
        nextPaycheck
          ? currency(
              nextPaycheck.amount
            )
          : "—";
    }

    if (paycheckDateElement) {
      paycheckDateElement.textContent =
        nextPaycheck
          ? (
              daysUntilPayday === 0
                ? `${formatDate(
                    nextPaycheck.date
                  )} • Payday is today`
                : `${formatDate(
                    nextPaycheck.date
                  )} • ${daysUntilPayday} day${
                    daysUntilPayday === 1
                      ? ""
                      : "s"
                  } away`
            )
          : "Add a future paycheck date";
    }

    /* ------------------------- */
    /* FORECAST */
    /* ------------------------- */

    const forecast =
      getForecast(
        safeToSpend,
        daysUntilPayday,
        Boolean(nextPaycheck)
      );

    const weather =
      document.getElementById(
        "moneyWeather"
      );

    if (weather) {
      weather.className =
        "money-weather";

      if (
        forecast.className
      ) {
        weather.classList.add(
          forecast.className
        );
      }

      weather.textContent =
        forecast.text;
    }

    /* ------------------------- */
    /* MAIN MESSAGE */
    /* ------------------------- */

    const safeMessage =
      document.getElementById(
        "dashboardSafeMessage"
      );

    if (safeMessage) {
      if (!nextPaycheck) {
        safeMessage.textContent =
          "Add your next paycheck date so Stretch My Check can calculate how far your current money needs to last.";
      } else if (
        safeToSpend < 0
      ) {
        safeMessage.textContent =
          `You're ${currency(
            Math.abs(safeToSpend)
          )} short of covering the money that needs to stay protected before payday.`;
      } else if (
        displayedSafe === 0
      ) {
        safeMessage.textContent =
          "Your current money is already needed for bills, necessities, or your protected cushion.";
      } else {
        safeMessage.textContent =
          `You can use about ${currency(
            dailySafe
          )} per day and still protect the money we've reserved.`;
      }
    }

    /* ------------------------- */
    /* EXPLANATION */
    /* ------------------------- */

    const explanation =
      document.getElementById(
        "dashboardExplanation"
      );

    if (!explanation) {
      return;
    }

    if (
      startingBalance <= 0 &&
      !nextPaycheck
    ) {
      explanation.innerHTML = `
        <span class="dashboard-empty-note">
          Your personalized money forecast
          will appear here as you fill out
          the planner.
        </span>
      `;

      return;
    }

    if (!nextPaycheck) {
      explanation.innerHTML = `
        You currently have
        <strong>${currency(
          startingBalance
        )}</strong> entered.
        Add your next payday and Stretch My Check
        will calculate what needs to stay reserved
        until that check arrives.
      `;

      return;
    }

    const parts = [];

    if (billsBeforePayday > 0) {
      parts.push(
        `<strong>${currency(
          billsBeforePayday
        )}</strong> for bills due before payday`
      );
    }

    if (livingMoney > 0) {
      parts.push(
        `<strong>${currency(
          livingMoney
        )}</strong> for groceries, gas, and other everyday needs`
      );
    }

    if (cushion > 0) {
      parts.push(
        `<strong>${currency(
          cushion
        )}</strong> protected as your cushion`
      );
    }

    if (!parts.length) {
      explanation.innerHTML = `
        Nothing is currently reserved before
        <strong>${formatDate(
          nextPaycheck.date
        )}</strong>.
        Based on the information entered,
        your available money is not currently
        assigned to a bill, living expense,
        or protected cushion.
      `;
    } else {
      explanation.innerHTML = `
        Before
        <strong>${formatDate(
          nextPaycheck.date
        )}</strong>,
        Stretch My Check is keeping
        ${parts.join(", ")}.
        That leaves
        <strong>${currency(
          displayedSafe
        )}</strong>
        available to spend safely.
      `;
    }
  }

  /* =========================================================
     LIVE UPDATES
     ========================================================= */

  document.addEventListener(
    "input",
    event => {
      if (
        event.target.closest(
          ".app"
        )
      ) {
        updateDashboard();
      }
    }
  );

  document.addEventListener(
    "change",
    event => {
      if (
        event.target.closest(
          ".app"
        )
      ) {
        updateDashboard();
      }
    }
  );

  document.addEventListener(
    "click",
    event => {
      const target =
        event.target;

      if (
        !(target instanceof Element)
      ) {
        return;
      }

      if (
        target.closest(
          "#addPaycheck"
        ) ||
        target.closest(
          "#addBill"
        ) ||
        target.closest(
          ".remove-paycheck"
        ) ||
        target.closest(
          ".remove-bill"
        ) ||
        target.closest(
          "#resetButton"
        ) ||
        target.closest(
          "#optimizeButton"
        ) ||
        target.textContent
          ?.trim() === "Load"
      ) {
        window.setTimeout(
          updateDashboard,
          100
        );
      }
    }
  );

  /*
    Watch for paycheck/bill rows being
    added or removed dynamically.
  */

  const observer =
    new MutationObserver(
      () => {
        window.setTimeout(
          updateDashboard,
          25
        );
      }
    );

  const app =
    document.querySelector(
      ".app"
    );

  if (app) {
    observer.observe(
      app,
      {
        childList: true,
        subtree: true
      }
    );
  }

  /* =========================================================
     PUBLIC REFRESH HOOK
     ========================================================= */

  window.StretchMyCheckDashboard = {
    refresh:
      updateDashboard
  };

  /* =========================================================
     INITIAL CALCULATION
     ========================================================= */

  window.setTimeout(
    updateDashboard,
    100
  );
})();