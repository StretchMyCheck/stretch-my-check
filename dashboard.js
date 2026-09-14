(() => {
  "use strict";

  /* =========================================================
     STRETCH MY CHECK
     DASHBOARD + MAKE IT TO PAYDAY + CAN I AFFORD THIS?
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

    if (parts.length !== 3) return null;

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

    .afford-card {
      margin-top: 18px;
      border-radius: 18px;
      padding: 20px;
      background: white;
      color: #17242c;
    }

    .afford-card h3 {
      margin: 0 0 6px;
      font-size: 21px;
    }

    .afford-card p {
      margin: 0 0 15px;
      color: #667681;
      line-height: 1.45;
      font-size: 14px;
    }

    .afford-grid {
      display: grid;
      grid-template-columns:
        1fr 1fr auto;
      gap: 10px;
      align-items: end;
    }

    .afford-field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .afford-field label {
      font-size: 13px;
      font-weight: 750;
    }

    .afford-field input {
      width: 100%;
      border: 1px solid #d6e0e5;
      border-radius: 10px;
      padding: 12px 13px;
      min-height: 45px;
    }

    .afford-button {
      border: 0;
      border-radius: 10px;
      min-height: 45px;
      padding: 12px 16px;
      font-weight: 800;
      cursor: pointer;
      background: #247c8b;
      color: white;
    }

    .afford-result {
      display: none;
      margin-top: 14px;
      border-radius: 13px;
      padding: 14px 15px;
      line-height: 1.5;
      font-size: 14px;
    }

    .afford-result.show {
      display: block;
    }

    .afford-result.good {
      background: #e9f8ef;
      border: 1px solid #a9ddbc;
      color: #17663b;
    }

    .afford-result.tight {
      background: #fff7df;
      border: 1px solid #ebd187;
      color: #765a07;
    }

    .afford-result.bad {
      background: #fff0f0;
      border: 1px solid #efb4b4;
      color: #9b2828;
    }

    .afford-result strong {
      display: block;
      margin-bottom: 4px;
      font-size: 16px;
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

      .afford-grid {
        grid-template-columns: 1fr;
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
          <span>Money Available Now</span>
          <strong id="dashboardCurrentMoney">
            $0.00
          </strong>
        </div>

        <div class="dashboard-stat">
          <span>Bills Before Payday</span>
          <strong id="dashboardBillsBeforePayday">
            $0.00
          </strong>
        </div>

        <div class="dashboard-stat">
          <span>Protected Cushion</span>
          <strong id="dashboardCushion">
            $0.00
          </strong>
        </div>

        <div class="dashboard-stat">
          <span>Daily Safe Spending</span>
          <strong id="dashboardDailySafe">
            $0.00
          </strong>
        </div>

      </div>

      <div
        id="dashboardExplanation"
        class="dashboard-explanation"
      >
        Your personalized money forecast
        will appear here as you fill out
        the planner.
      </div>

      <div class="afford-card">

        <h3>
          Can I Afford This?
        </h3>

        <p>
          Enter a purchase you're thinking about.
          Stretch My Check will show you how it
          affects your money before payday.
        </p>

        <div class="afford-grid">

          <div class="afford-field">
            <label for="affordName">
              What are you buying?
            </label>

            <input
              id="affordName"
              type="text"
              placeholder="Example: Birthday party"
            >
          </div>

          <div class="afford-field">
            <label for="affordAmount">
              Cost
            </label>

            <input
              id="affordAmount"
              type="number"
              min="0"
              step="0.01"
              placeholder="Example: 175"
            >
          </div>

          <button
            id="affordButton"
            class="afford-button"
            type="button"
          >
            CHECK IT
          </button>

        </div>

        <div
          id="affordResult"
          class="afford-result"
        ></div>

      </div>

    </div>
  `;

  const intro =
    document.querySelector(
      ".intro-card"
    );

  if (intro && intro.parentNode) {
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
     DATA HELPERS
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

        return {
          date:
            parseLocalDate(dateValue),

          amount:
            money(
              entry.querySelector(
                ".paycheck-amount"
              )?.value
            )
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

  function getNextPaycheck(
    paychecks,
    today
  ) {
    return (
      paychecks.find(
        paycheck =>
          paycheck.date >= today
      ) || null
    );
  }

  function getBillsBeforePayday(
    today,
    payday
  ) {
    if (!payday) return 0;

    return [
      ...document.querySelectorAll(
        ".bill-entry"
      )
    ].reduce(
      (total, entry) => {
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

    return (
      amount /
      Math.max(
        paycheckCount,
        1
      )
    );
  }

  function getLivingMoneyNeeded(
    paycheckCount
  ) {
    return (
      necessityForOnePeriod(
        "groceryAmount",
        "groceryMode",
        paycheckCount
      )
      +
      necessityForOnePeriod(
        "gasAmount",
        "gasMode",
        paycheckCount
      )
      +
      necessityForOnePeriod(
        "otherAmount",
        "otherMode",
        paycheckCount
      )
    );
  }

  function getDashboardState() {
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
      startingBalance
      - cushion
      - billsBeforePayday
      - livingMoney;

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

    return {
      startingBalance,
      cushion,
      today,
      paychecks,
      nextPaycheck,
      billsBeforePayday,
      livingMoney,
      safeToSpend,
      displayedSafe,
      daysUntilPayday,
      dailySafe
    };
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
    const state =
      getDashboardState();

    const {
      startingBalance,
      cushion,
      nextPaycheck,
      billsBeforePayday,
      livingMoney,
      safeToSpend,
      displayedSafe,
      daysUntilPayday,
      dailySafe
    } = state;

    document.getElementById(
      "dashboardSafeToSpend"
    ).textContent =
      currency(displayedSafe);

    document.getElementById(
      "dashboardCurrentMoney"
    ).textContent =
      currency(startingBalance);

    document.getElementById(
      "dashboardBillsBeforePayday"
    ).textContent =
      currency(billsBeforePayday);

    document.getElementById(
      "dashboardCushion"
    ).textContent =
      currency(cushion);

    document.getElementById(
      "dashboardDailySafe"
    ).textContent =
      nextPaycheck
        ? currency(dailySafe)
        : "—";

    document.getElementById(
      "dashboardNextPaycheck"
    ).textContent =
      nextPaycheck
        ? currency(nextPaycheck.amount)
        : "—";

    document.getElementById(
      "dashboardNextPaycheckDate"
    ).textContent =
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

    weather.className =
      "money-weather";

    if (forecast.className) {
      weather.classList.add(
        forecast.className
      );
    }

    weather.textContent =
      forecast.text;

    const safeMessage =
      document.getElementById(
        "dashboardSafeMessage"
      );

    if (!nextPaycheck) {
      safeMessage.textContent =
        "Add your next paycheck date so Stretch My Check can calculate how far your current money needs to last.";
    }

    else if (safeToSpend < 0) {
      safeMessage.textContent =
        `You're ${currency(
          Math.abs(safeToSpend)
        )} short of covering the money that needs to stay protected before payday.`;
    }

    else if (displayedSafe === 0) {
      safeMessage.textContent =
        "Your current money is already needed for bills, necessities, or your protected cushion.";
    }

    else {
      safeMessage.textContent =
        `You can use about ${currency(
          dailySafe
        )} per day and still protect the money we've reserved.`;
    }

    const explanation =
      document.getElementById(
        "dashboardExplanation"
      );

    if (
      startingBalance <= 0 &&
      !nextPaycheck
    ) {
      explanation.textContent =
        "Your personalized money forecast will appear here as you fill out the planner.";

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

    explanation.innerHTML =
      parts.length
        ? `
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
        `
        : `
          Nothing is currently reserved before
          <strong>${formatDate(
            nextPaycheck.date
          )}</strong>.
          Based on the information entered,
          your current money is not assigned
          to bills, necessities, or your cushion.
        `;
  }

  /* =========================================================
     CAN I AFFORD THIS?
     ========================================================= */

  function checkAffordability() {
    const result =
      document.getElementById(
        "affordResult"
      );

    const name =
      document.getElementById(
        "affordName"
      ).value.trim()
      || "this purchase";

    const amount =
      money(
        document.getElementById(
          "affordAmount"
        ).value
      );

    result.className =
      "afford-result";

    if (amount <= 0) {
      result.classList.add(
        "show",
        "bad"
      );

      result.innerHTML = `
        <strong>
          Enter a purchase amount first.
        </strong>
        Add the cost so Stretch My Check
        can compare it to your current plan.
      `;

      return;
    }

    const state =
      getDashboardState();

    if (!state.nextPaycheck) {
      result.classList.add(
        "show",
        "bad"
      );

      result.innerHTML = `
        <strong>
          Add your next payday first.
        </strong>
        Stretch My Check needs to know how long
        your current money has to last.
      `;

      return;
    }

    const remainingSafe =
      state.safeToSpend - amount;

    const days =
      Math.max(
        state.daysUntilPayday,
        1
      );

    const newDaily =
      Math.max(
        remainingSafe,
        0
      ) / days;

    if (remainingSafe < 0) {
      result.classList.add(
        "show",
        "bad"
      );

      result.innerHTML = `
        <strong>
          Not safely right now.
        </strong>

        ${name} costs
        <strong>${currency(amount)}</strong>.

        That is
        <strong>${currency(
          Math.abs(remainingSafe)
        )}</strong>
        more than your current safe-to-spend amount.

        Buying it now would cut into money
        being protected for bills, necessities,
        or your cushion.
      `;

      return;
    }

    if (
      remainingSafe === 0 ||
      newDaily < 10
    ) {
      result.classList.add(
        "show",
        "tight"
      );

      result.innerHTML = `
        <strong>
          You could buy it, but things would be very tight.
        </strong>

        After spending
        <strong>${currency(amount)}</strong>
        on ${name}, you would have
        <strong>${currency(
          remainingSafe
        )}</strong>
        of safe money left until payday.

        That is about
        <strong>${currency(
          newDaily
        )} per day</strong>.
      `;

      return;
    }

    if (newDaily < 25) {
      result.classList.add(
        "show",
        "tight"
      );

      result.innerHTML = `
        <strong>
          Yes — but watch your spending afterward.
        </strong>

        After spending
        <strong>${currency(amount)}</strong>
        on ${name}, you would still have
        <strong>${currency(
          remainingSafe
        )}</strong>
        safe to spend.

        Your new daily safe amount would be about
        <strong>${currency(
          newDaily
        )}</strong>.
      `;

      return;
    }

    result.classList.add(
      "show",
      "good"
    );

    result.innerHTML = `
      <strong>
        Yes — this fits your current plan.
      </strong>

      After spending
      <strong>${currency(amount)}</strong>
      on ${name}, you would still have
      <strong>${currency(
        remainingSafe
      )}</strong>
      safe to spend before payday.

      That leaves about
      <strong>${currency(
        newDaily
      )} per day</strong>.
    `;
  }

  document
    .getElementById(
      "affordButton"
    )
    .addEventListener(
      "click",
      checkAffordability
    );

  document
    .getElementById(
      "affordAmount"
    )
    .addEventListener(
      "keydown",
      event => {
        if (
          event.key === "Enter"
        ) {
          checkAffordability();
        }
      }
    );

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
        target.closest("#addPaycheck")
        ||
        target.closest("#addBill")
        ||
        target.closest(".remove-paycheck")
        ||
        target.closest(".remove-bill")
        ||
        target.closest("#resetPlanner")
        ||
        target.closest("#optimizeButton")
        ||
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

  window.StretchMyCheckDashboard = {
    refresh:
      updateDashboard
  };

  window.setTimeout(
    updateDashboard,
    100
  );
})();