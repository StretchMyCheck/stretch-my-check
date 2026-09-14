(() => {
  "use strict";

  /* =========================================================
     STRETCH MY CHECK
     MONEY FORECAST
     ========================================================= */

  const money = value => {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const currency = value =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD"
    }).format(Number.isFinite(value) ? value : 0);

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
    if (!date) return "";

    return date.toLocaleDateString(
      "en-US",
      {
        month: "short",
        day: "numeric",
        year: "numeric"
      }
    );
  }

  function sameDay(a, b) {
    if (!a || !b) return false;

    return (
      a.getFullYear() === b.getFullYear()
      &&
      a.getMonth() === b.getMonth()
      &&
      a.getDate() === b.getDate()
    );
  }

  /* =========================================================
     STYLES
     ========================================================= */

  const style =
    document.createElement("style");

  style.textContent = `
    .money-forecast-card {
      margin: 0 0 20px;
      padding: 24px;
      border-radius: 22px;
      background: #ffffff;
      color: #17242c;
      box-shadow:
        0 10px 30px
        rgba(16, 48, 58, .10);
      border: 1px solid #e3ecef;
    }

    .money-forecast-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 18px;
      margin-bottom: 19px;
    }

    .money-forecast-title {
      margin: 0;
      font-size: 26px;
      font-weight: 850;
      color: #173943;
    }

    .money-forecast-subtitle {
      margin: 7px 0 0;
      max-width: 680px;
      color: #687984;
      font-size: 14px;
      line-height: 1.5;
    }

    .forecast-badge {
      flex-shrink: 0;
      border-radius: 999px;
      padding: 8px 12px;
      font-size: 12px;
      font-weight: 800;
      background: #eef5f6;
      color: #246b77;
    }

    .forecast-summary {
      display: grid;
      grid-template-columns:
        repeat(3, minmax(0,1fr));
      gap: 11px;
      margin-bottom: 22px;
    }

    .forecast-summary-box {
      background: #f6f9fa;
      border: 1px solid #e0e9ec;
      border-radius: 14px;
      padding: 15px;
    }

    .forecast-summary-box span {
      display: block;
      margin-bottom: 5px;
      color: #72828b;
      font-size: 12px;
      font-weight: 650;
    }

    .forecast-summary-box strong {
      display: block;
      color: #173943;
      font-size: 21px;
    }

    .forecast-timeline {
      position: relative;
      margin-top: 10px;
    }

    .forecast-event {
      position: relative;
      display: grid;
      grid-template-columns:
        92px 22px minmax(0,1fr);
      gap: 10px;
      padding-bottom: 20px;
    }

    .forecast-event:last-child {
      padding-bottom: 0;
    }

    .forecast-date {
      padding-top: 3px;
      color: #667781;
      font-size: 12px;
      font-weight: 750;
      text-align: right;
    }

    .forecast-track {
      position: relative;
      display: flex;
      justify-content: center;
    }

    .forecast-track::after {
      content: "";
      position: absolute;
      top: 19px;
      bottom: -21px;
      width: 2px;
      background: #dce7ea;
    }

    .forecast-event:last-child
    .forecast-track::after {
      display: none;
    }

    .forecast-dot {
      position: relative;
      z-index: 2;
      width: 14px;
      height: 14px;
      margin-top: 4px;
      border-radius: 50%;
      background: #247c8b;
      border: 3px solid #e7f4f6;
    }

    .forecast-event.bill .forecast-dot {
      background: #d67a2c;
      border-color: #fff0df;
    }

    .forecast-event.warning .forecast-dot {
      background: #c43c3c;
      border-color: #fde7e7;
    }

    .forecast-event.living .forecast-dot {
      background: #8267b7;
      border-color: #eee9f8;
    }

    .forecast-event.today .forecast-dot {
      background: #173943;
      border-color: #dde8ea;
    }

    .forecast-event-card {
      border-radius: 14px;
      padding: 14px 15px;
      background: #f7fafb;
      border: 1px solid #e0e8eb;
    }

    .forecast-event-card h4 {
      margin: 0 0 4px;
      font-size: 15px;
      color: #17242c;
    }

    .forecast-event-card p {
      margin: 0;
      color: #71808a;
      font-size: 13px;
      line-height: 1.45;
    }

    .forecast-event-amount {
      margin-top: 9px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      flex-wrap: wrap;
    }

    .forecast-event-amount strong {
      font-size: 17px;
      color: #173943;
    }

    .forecast-balance {
      font-size: 12px;
      font-weight: 750;
      color: #667781;
    }

    .forecast-balance.negative {
      color: #b52f2f;
    }

    .forecast-note {
      margin-top: 19px;
      padding: 13px 15px;
      border-radius: 12px;
      background: #f6f8f9;
      color: #697981;
      font-size: 12px;
      line-height: 1.5;
    }

    .forecast-empty {
      padding: 22px;
      text-align: center;
      border-radius: 14px;
      background: #f7f9fa;
      color: #697981;
      font-size: 14px;
    }

    @media (max-width: 700px) {
      .money-forecast-header {
        flex-direction: column;
      }

      .forecast-summary {
        grid-template-columns: 1fr;
      }

      .forecast-event {
        grid-template-columns:
          65px 18px minmax(0,1fr);
        gap: 7px;
      }

      .forecast-date {
        font-size: 11px;
      }
    }

    @media print {
      .money-forecast-card {
        display: none !important;
      }
    }
  `;

  document.head.appendChild(style);

  /* =========================================================
     BUILD SECTION
     ========================================================= */

  const section =
    document.createElement("section");

  section.className =
    "money-forecast-card no-print";

  section.innerHTML = `
    <div class="money-forecast-header">

      <div>
        <h2 class="money-forecast-title">
          Money Forecast
        </h2>

        <p class="money-forecast-subtitle">
          See how your money is expected to move
          over the next few paydays as income,
          bills, and everyday expenses come through.
        </p>
      </div>

      <div class="forecast-badge">
        YOUR MONEY TIMELINE
      </div>

    </div>

    <div
      id="forecastSummary"
      class="forecast-summary"
    ></div>

    <div
      id="forecastTimeline"
      class="forecast-timeline"
    ></div>

    <div
      id="forecastNote"
      class="forecast-note"
      style="display:none;"
    ></div>
  `;

  const dashboard =
    document.querySelector(
      ".money-dashboard"
    );

  if (dashboard) {
    dashboard.insertAdjacentElement(
      "afterend",
      section
    );
  } else {
    document
      .querySelector(".app")
      ?.prepend(section);
  }

  /* =========================================================
     READ PLANNER DATA
     ========================================================= */

  function getPaychecks() {
    return [
      ...document.querySelectorAll(
        ".paycheck-entry"
      )
    ]
      .map((entry, index) => {
        const date =
          parseLocalDate(
            entry.querySelector(
              ".paycheck-date"
            )?.value
          );

        const amount =
          money(
            entry.querySelector(
              ".paycheck-amount"
            )?.value
          );

        const name =
          entry.querySelector(
            ".paycheck-name"
          )?.value.trim()
          ||
          `Paycheck ${index + 1}`;

        return {
          name,
          date,
          amount
        };
      })
      .filter(
        item =>
          item.date
          &&
          item.amount > 0
      )
      .sort(
        (a, b) =>
          a.date - b.date
      );
  }

  function getFixedBills() {
    return [
      ...document.querySelectorAll(
        ".bill-entry"
      )
    ]
      .map((entry, index) => {
        const type =
          entry.querySelector(
            ".bill-type"
          )?.value;

        if (type !== "fixed") {
          return null;
        }

        const amount =
          money(
            entry.querySelector(
              ".bill-amount"
            )?.value
          );

        const date =
          parseLocalDate(
            entry.querySelector(
              ".bill-due-date"
            )?.value
          );

        const name =
          entry.querySelector(
            ".bill-name"
          )?.value.trim()
          ||
          `Bill ${index + 1}`;

        if (
          !date
          ||
          amount <= 0
        ) {
          return null;
        }

        return {
          name,
          date,
          amount
        };
      })
      .filter(Boolean);
  }

  function getFlexibleBillTotal() {
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

        if (type !== "flexible") {
          return total;
        }

        return (
          total
          +
          money(
            entry.querySelector(
              ".bill-amount"
            )?.value
          )
        );
      },
      0
    );
  }

  function necessityPerPaycheck(
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
      )?.value
      ||
      "total";

    if (amount <= 0) {
      return 0;
    }

    if (mode === "percheck") {
      return amount;
    }

    return (
      amount
      /
      Math.max(
        paycheckCount,
        1
      )
    );
  }

  function getLivingPerPaycheck(
    paycheckCount
  ) {
    return (
      necessityPerPaycheck(
        "groceryAmount",
        "groceryMode",
        paycheckCount
      )
      +
      necessityPerPaycheck(
        "gasAmount",
        "gasMode",
        paycheckCount
      )
      +
      necessityPerPaycheck(
        "otherAmount",
        "otherMode",
        paycheckCount
      )
    );
  }

  /* =========================================================
     CREATE FORECAST
     ========================================================= */

  function createForecast() {
    const today =
      todayDate();

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

    const paychecks =
      getPaychecks()
        .filter(
          paycheck =>
            paycheck.date >= today
        )
        .slice(0, 4);

    const fixedBills =
      getFixedBills()
        .filter(
          bill =>
            bill.date >= today
        );

    const flexibleTotal =
      getFlexibleBillTotal();

    const livingPerPaycheck =
      getLivingPerPaycheck(
        paychecks.length
      );

    const summary =
      document.getElementById(
        "forecastSummary"
      );

    const timeline =
      document.getElementById(
        "forecastTimeline"
      );

    const note =
      document.getElementById(
        "forecastNote"
      );

    if (
      paychecks.length === 0
    ) {
      summary.innerHTML = `
        <div class="forecast-summary-box">
          <span>Available Now</span>
          <strong>
            ${currency(
              startingBalance
            )}
          </strong>
        </div>

        <div class="forecast-summary-box">
          <span>Protected Cushion</span>
          <strong>
            ${currency(
              cushion
            )}
          </strong>
        </div>

        <div class="forecast-summary-box">
          <span>Upcoming Paychecks</span>
          <strong>0</strong>
        </div>
      `;

      timeline.innerHTML = `
        <div class="forecast-empty">
          Add at least one future paycheck
          to see your money timeline.
        </div>
      `;

      note.style.display =
        "none";

      return;
    }

    const events = [];

    events.push({
      type:
        "today",

      date:
        today,

      title:
        "Where You Are Today",

      description:
        `You currently have ${currency(
          startingBalance
        )} available.`,

      amount:
        0,

      sortOrder:
        0
    });

    paychecks.forEach(
      paycheck => {
        events.push({
          type:
            "paycheck",

          date:
            paycheck.date,

          title:
            paycheck.name,

          description:
            "Paycheck arrives",

          amount:
            paycheck.amount,

          sortOrder:
            1
        });

        if (
          livingPerPaycheck > 0
        ) {
          events.push({
            type:
              "living",

            date:
              paycheck.date,

            title:
              "Everyday Living Money",

            description:
              "Planned groceries, gas, and other necessities",

            amount:
              -livingPerPaycheck,

            sortOrder:
              3
          });
        }
      }
    );

    fixedBills.forEach(
      bill => {
        events.push({
          type:
            "bill",

          date:
            bill.date,

          title:
            bill.name,

          description:
            "Fixed bill due",

          amount:
            -bill.amount,

          sortOrder:
            2
        });
      }
    );

    events.sort(
      (a, b) => {
        const dateDifference =
          a.date - b.date;

        if (
          dateDifference !== 0
        ) {
          return dateDifference;
        }

        return (
          a.sortOrder
          -
          b.sortOrder
        );
      }
    );

    let runningBalance =
      startingBalance;

    let lowestBalance =
      startingBalance;

    let totalIncoming = 0;

    events.forEach(
      event => {
        if (
          event.type !== "today"
        ) {
          runningBalance +=
            event.amount;
        }

        event.balance =
          runningBalance;

        lowestBalance =
          Math.min(
            lowestBalance,
            runningBalance
          );

        if (
          event.type === "paycheck"
        ) {
          totalIncoming +=
            event.amount;
        }
      }
    );

    const endingBalance =
      runningBalance;

    summary.innerHTML = `
      <div class="forecast-summary-box">
        <span>
          Available Today
        </span>

        <strong>
          ${currency(
            startingBalance
          )}
        </strong>
      </div>

      <div class="forecast-summary-box">
        <span>
          Upcoming Income
        </span>

        <strong>
          ${currency(
            totalIncoming
          )}
        </strong>
      </div>

      <div class="forecast-summary-box">
        <span>
          Forecast Ending Balance
        </span>

        <strong>
          ${currency(
            endingBalance
          )}
        </strong>
      </div>
    `;

    timeline.innerHTML =
      events.map(
        event => {
          let amountText =
            "";

          if (
            event.type === "today"
          ) {
            amountText =
              currency(
                startingBalance
              );
          }

          else if (
            event.amount > 0
          ) {
            amountText =
              `+${currency(
                event.amount
              )}`;
          }

          else {
            amountText =
              `-${currency(
                Math.abs(
                  event.amount
                )
              )}`;
          }

          const negative =
            event.balance <
            cushion;

          return `
            <div
              class="forecast-event
              ${event.type}
              ${
                negative
                ? "warning"
                : ""
              }"
            >

              <div class="forecast-date">
                ${
                  sameDay(
                    event.date,
                    today
                  )
                    ? "Today"
                    : formatDate(
                        event.date
                      )
                }
              </div>

              <div class="forecast-track">
                <div
                  class="forecast-dot"
                ></div>
              </div>

              <div class="forecast-event-card">

                <h4>
                  ${event.title}
                </h4>

                <p>
                  ${event.description}
                </p>

                <div
                  class="forecast-event-amount"
                >

                  <strong>
                    ${amountText}
                  </strong>

                  <span
                    class="
                      forecast-balance
                      ${
                        negative
                          ? "negative"
                          : ""
                      }
                    "
                  >
                    Projected:
                    ${currency(
                      event.balance
                    )}
                  </span>

                </div>

              </div>

            </div>
          `;
        }
      ).join("");

    const notes = [];

    if (
      flexibleTotal > 0
    ) {
      notes.push(
        `${currency(
          flexibleTotal
        )} of flexible bills are not pinned to a specific date in this timeline. Your main optimizer still decides the healthiest paycheck for those bills.`
      );
    }

    if (
      lowestBalance < cushion
    ) {
      notes.push(
        `At one point this forecast drops below your ${currency(
          cushion
        )} protected cushion. Check your recommended plan for the exact optimized bill placement.`
      );
    }

    if (
      notes.length > 0
    ) {
      note.style.display =
        "block";

      note.innerHTML =
        notes.join(
          "<br><br>"
        );
    } else {
      note.style.display =
        "none";

      note.innerHTML =
        "";
    }
  }

  /* =========================================================
     LIVE REFRESH
     ========================================================= */

  let refreshTimer = null;

  function scheduleRefresh() {
    window.clearTimeout(
      refreshTimer
    );

    refreshTimer =
      window.setTimeout(
        createForecast,
        80
      );
  }

  document.addEventListener(
    "input",
    event => {
      if (
        event.target.closest(
          ".money-forecast-card"
        )
      ) {
        return;
      }

      if (
        event.target.closest(
          ".app"
        )
      ) {
        scheduleRefresh();
      }
    }
  );

  document.addEventListener(
    "change",
    event => {
      if (
        event.target.closest(
          ".money-forecast-card"
        )
      ) {
        return;
      }

      if (
        event.target.closest(
          ".app"
        )
      ) {
        scheduleRefresh();
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
          "#optimizeButton"
        )
        ||
        target.closest(
          "#resetPlanner"
        )
        ||
        target.closest(
          "#addPaycheck"
        )
        ||
        target.closest(
          "#addBill"
        )
        ||
        target.closest(
          ".remove-paycheck"
        )
        ||
        target.closest(
          ".remove-bill"
        )
        ||
        target.textContent
          ?.trim() === "Load"
      ) {
        window.setTimeout(
          createForecast,
          150
        );
      }
    }
  );

  window.StretchMyCheckForecast = {
    refresh:
      createForecast
  };

  window.setTimeout(
    createForecast,
    150
  );

})();