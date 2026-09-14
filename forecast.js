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

  function escapeHTML(text) {
    return String(text ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function parseLocalDate(value) {
    if (!value) return null;

    if (value instanceof Date) {
      return Number.isNaN(value.getTime())
        ? null
        : value;
    }

    const text = String(value);

    const parts =
      text.split("-").map(Number);

    if (
      parts.length === 3
      &&
      parts.every(Number.isFinite)
    ) {
      const [year, month, day] =
        parts;

      const date = new Date(
        year,
        month - 1,
        day,
        12,
        0,
        0,
        0
      );

      return Number.isNaN(
        date.getTime()
      )
        ? null
        : date;
    }

    const fallback =
      new Date(text);

    return Number.isNaN(
      fallback.getTime()
    )
      ? null
      : fallback;
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
    if (!a || !b) {
      return false;
    }

    return (
      a.getFullYear() ===
        b.getFullYear()
      &&
      a.getMonth() ===
        b.getMonth()
      &&
      a.getDate() ===
        b.getDate()
    );
  }

  function normalizeText(value) {
    return String(
      value ?? ""
    )
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  }

  function almostSameMoney(a, b) {
    return (
      Math.abs(
        money(a) - money(b)
      ) < 0.01
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
        repeat(3, minmax(0, 1fr));
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

    .forecast-event.bill
    .forecast-dot {
      background: #d67a2c;
      border-color: #fff0df;
    }

    .forecast-event.flexible
    .forecast-dot {
      background: #2e8b79;
      border-color: #dff3ed;
    }

    .forecast-event.living
    .forecast-dot {
      background: #8267b7;
      border-color: #eee9f8;
    }

    .forecast-event.today
    .forecast-dot {
      background: #173943;
      border-color: #dde8ea;
    }

    .forecast-event.warning
    .forecast-dot {
      background: #c43c3c;
      border-color: #fde7e7;
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
      justify-content: space-between;
      align-items: center;
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

    .forecast-note.success {
      background: #edf8f3;
      border: 1px solid #c8e6d7;
      color: #306b55;
    }

    .forecast-note.warning {
      background: #fff7e5;
      border: 1px solid #ecd89b;
      color: #735d20;
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

  document.head.appendChild(
    style
  );

  /* =========================================================
     SECTION
     ========================================================= */

  const section =
    document.createElement(
      "section"
    );

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
     FORM DATA
     ========================================================= */

  function getPaychecks() {
    return [
      ...document.querySelectorAll(
        ".paycheck-entry"
      )
    ]
      .map(
        (entry, index) => {
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
            entry,
            name,
            date,
            amount
          };
        }
      )
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

  function getBills() {
    return [
      ...document.querySelectorAll(
        ".bill-entry"
      )
    ]
      .map(
        (entry, index) => {
          const type =
            entry.querySelector(
              ".bill-type"
            )?.value
            ||
            "fixed";

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

          return {
            entry,
            index,
            name,
            amount,
            type,
            date
          };
        }
      )
      .filter(
        bill =>
          bill.amount > 0
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
      amount /
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
     OPTIMIZED PLAN ACCESS
     ========================================================= */

  function getLatestPlanData() {
    try {
      if (
        typeof latestPlannerData !==
          "undefined"
        &&
        latestPlannerData
      ) {
        return latestPlannerData;
      }
    } catch (error) {
      // Ignore and try window fallback.
    }

    if (
      window.latestPlannerData
    ) {
      return window.latestPlannerData;
    }

    return null;
  }

  function getPossibleAssignedArrays(
    paycheck
  ) {
    if (
      !paycheck
      ||
      typeof paycheck !==
        "object"
    ) {
      return [];
    }

    const possibleKeys = [
      "assignedBills",
      "bills",
      "billAssignments",
      "assigned",
      "obligations",
      "expenses",
      "assignedExpenses"
    ];

    const arrays = [];

    possibleKeys.forEach(
      key => {
        if (
          Array.isArray(
            paycheck[key]
          )
        ) {
          arrays.push(
            paycheck[key]
          );
        }
      }
    );

    return arrays;
  }

  function readBillName(item) {
    if (
      !item
      ||
      typeof item !==
        "object"
    ) {
      return "";
    }

    return (
      item.name
      ??
      item.billName
      ??
      item.title
      ??
      item.label
      ??
      item.bill?.name
      ??
      ""
    );
  }

  function readBillAmount(item) {
    if (
      !item
      ||
      typeof item !==
        "object"
    ) {
      return 0;
    }

    return money(
      item.amount
      ??
      item.billAmount
      ??
      item.value
      ??
      item.cost
      ??
      item.bill?.amount
      ??
      0
    );
  }

  function readBillType(item) {
    if (
      !item
      ||
      typeof item !==
        "object"
    ) {
      return "";
    }

    return normalizeText(
      item.type
      ??
      item.billType
      ??
      item.bill?.type
      ??
      ""
    );
  }

  function readPaycheckDate(
    item,
    fallbackPaychecks,
    index
  ) {
    if (
      item
      &&
      typeof item === "object"
    ) {
      const possibleDate =
        item.date
        ??
        item.payDate
        ??
        item.paycheckDate;

      const parsed =
        parseLocalDate(
          possibleDate
        );

      if (parsed) {
        return parsed;
      }
    }

    return (
      fallbackPaychecks[index]
        ?.date
      ||
      null
    );
  }

  function matchFlexibleBill(
    assignment,
    flexibleBills,
    usedIndexes
  ) {
    const assignedName =
      normalizeText(
        readBillName(
          assignment
        )
      );

    const assignedAmount =
      readBillAmount(
        assignment
      );

    const assignedType =
      readBillType(
        assignment
      );

    for (
      let index = 0;
      index <
      flexibleBills.length;
      index += 1
    ) {
      if (
        usedIndexes.has(index)
      ) {
        continue;
      }

      const bill =
        flexibleBills[index];

      const nameMatches =
        assignedName
        &&
        normalizeText(
          bill.name
        ) ===
          assignedName;

      const amountMatches =
        assignedAmount > 0
        &&
        almostSameMoney(
          assignedAmount,
          bill.amount
        );

      const explicitlyFlexible =
        assignedType.includes(
          "flex"
        );

      if (
        nameMatches
        &&
        (
          amountMatches
          ||
          assignedAmount <= 0
        )
      ) {
        return index;
      }

      if (
        explicitlyFlexible
        &&
        amountMatches
      ) {
        return index;
      }
    }

    return -1;
  }

  function getOptimizedFlexibleAssignments(
    paychecks,
    flexibleBills
  ) {
    const result = [];
    const usedIndexes =
      new Set();

    const plan =
      getLatestPlanData();

    if (
      !plan
      ||
      flexibleBills.length === 0
    ) {
      return {
        assignments:
          result,
        matched:
          0
      };
    }

    const possiblePaycheckArrays = [
      plan.paychecks,
      plan.payPeriods,
      plan.periods,
      plan.balanceResult
        ?.paychecks,
      plan.balanceResult
        ?.periods
    ].filter(
      Array.isArray
    );

    for (
      const planPaychecks
      of possiblePaycheckArrays
    ) {
      planPaychecks.forEach(
        (
          paycheck,
          paycheckIndex
        ) => {
          const payday =
            readPaycheckDate(
              paycheck,
              paychecks,
              paycheckIndex
            );

          if (!payday) {
            return;
          }

          const assignedArrays =
            getPossibleAssignedArrays(
              paycheck
            );

          assignedArrays.forEach(
            assignedArray => {
              assignedArray.forEach(
                assignment => {
                  const matchIndex =
                    matchFlexibleBill(
                      assignment,
                      flexibleBills,
                      usedIndexes
                    );

                  if (
                    matchIndex === -1
                  ) {
                    return;
                  }

                  const bill =
                    flexibleBills[
                      matchIndex
                    ];

                  usedIndexes.add(
                    matchIndex
                  );

                  result.push({
                    name:
                      bill.name,
                    amount:
                      bill.amount,
                    date:
                      payday,
                    source:
                      "optimizer"
                  });
                }
              );
            }
          );
        }
      );

      if (
        usedIndexes.size ===
        flexibleBills.length
      ) {
        break;
      }
    }

    return {
      assignments:
        result,
      matched:
        usedIndexes.size
    };
  }

  /* =========================================================
     FALLBACK SMART PLACEMENT
     ========================================================= */

  function chooseFallbackFlexiblePlacement(
    bill,
    paychecks
  ) {
    if (
      paychecks.length === 0
    ) {
      return null;
    }

    /*
      If optimizer data is unavailable,
      place an undated flexible bill on the
      latest paycheck in the visible plan.

      This mirrors the idea of delaying a
      flexible expense when possible instead
      of reducing earlier available money.
    */

    return (
      paychecks[
        paychecks.length - 1
      ].date
    );
  }

  /* =========================================================
     FORECAST
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

    const allPaychecks =
      getPaychecks();

    const paychecks =
      allPaychecks
        .filter(
          paycheck =>
            paycheck.date >= today
        )
        .slice(
          0,
          4
        );

    const bills =
      getBills();

    const fixedBills =
      bills.filter(
        bill =>
          bill.type ===
            "fixed"
          &&
          bill.date
          &&
          bill.date >=
            today
      );

    const flexibleBills =
      bills.filter(
        bill =>
          bill.type ===
            "flexible"
      );

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
          <span>
            Available Now
          </span>

          <strong>
            ${currency(
              startingBalance
            )}
          </strong>
        </div>

        <div class="forecast-summary-box">
          <span>
            Protected Cushion
          </span>

          <strong>
            ${currency(
              cushion
            )}
          </strong>
        </div>

        <div class="forecast-summary-box">
          <span>
            Upcoming Paychecks
          </span>

          <strong>
            0
          </strong>
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

    /* =======================================================
       FIND OPTIMIZED FLEXIBLE BILL PLACEMENT
       ======================================================= */

    const optimized =
      getOptimizedFlexibleAssignments(
        allPaychecks,
        flexibleBills
      );

    const flexibleAssignments =
      [...optimized.assignments];

    const alreadyAssignedNames =
      new Set(
        flexibleAssignments.map(
          item =>
            `${normalizeText(
              item.name
            )}|${item.amount.toFixed(
              2
            )}`
        )
      );

    let fallbackCount = 0;

    flexibleBills.forEach(
      bill => {
        const key =
          `${normalizeText(
            bill.name
          )}|${bill.amount.toFixed(
            2
          )}`;

        if (
          alreadyAssignedNames.has(
            key
          )
        ) {
          return;
        }

        const fallbackDate =
          chooseFallbackFlexiblePlacement(
            bill,
            paychecks
          );

        if (!fallbackDate) {
          return;
        }

        flexibleAssignments.push({
          name:
            bill.name,
          amount:
            bill.amount,
          date:
            fallbackDate,
          source:
            "fallback"
        });

        fallbackCount += 1;
      }
    );

    /* =======================================================
       BUILD EVENTS
       ======================================================= */

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

    flexibleAssignments
      .filter(
        assignment =>
          assignment.date >=
            today
      )
      .forEach(
        assignment => {
          events.push({
            type:
              "flexible",

            date:
              assignment.date,

            title:
              assignment.name,

            description:
              assignment.source ===
                "optimizer"
                ? "Flexible bill • Smart placement"
                : "Flexible bill • Planned placement",

            amount:
              -assignment.amount,

            sortOrder:
              3
          });
        }
      );

    paychecks.forEach(
      paycheck => {
        if (
          livingPerPaycheck <= 0
        ) {
          return;
        }

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
            4
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
          a.sortOrder -
          b.sortOrder
        );
      }
    );

    /* =======================================================
       RUNNING BALANCE
       ======================================================= */

    let runningBalance =
      startingBalance;

    let lowestBalance =
      startingBalance;

    let totalIncoming = 0;

    let totalOutgoing = 0;

    events.forEach(
      event => {
        if (
          event.type !==
            "today"
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
          event.amount > 0
        ) {
          totalIncoming +=
            event.amount;
        }

        if (
          event.amount < 0
        ) {
          totalOutgoing +=
            Math.abs(
              event.amount
            );
        }
      }
    );

    const endingBalance =
      runningBalance;

    /* =======================================================
       SUMMARY
       ======================================================= */

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

    /* =======================================================
       TIMELINE
       ======================================================= */

    timeline.innerHTML =
      events.map(
        event => {
          let amountText =
            "";

          if (
            event.type ===
              "today"
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

          const belowCushion =
            event.balance <
            cushion;

          return `
            <div
              class="
                forecast-event
                ${event.type}
                ${
                  belowCushion
                    ? "warning"
                    : ""
                }
              "
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

              <div
                class="forecast-event-card"
              >

                <h4>
                  ${escapeHTML(
                    event.title
                  )}
                </h4>

                <p>
                  ${escapeHTML(
                    event.description
                  )}
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
                        belowCushion
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

    /* =======================================================
       FORECAST NOTE
       ======================================================= */

    const notes = [];

    let noteClass =
      "forecast-note";

    if (
      flexibleBills.length > 0
      &&
      fallbackCount === 0
    ) {
      notes.push(
        `Flexible bills are included using your optimized Stretch My Check placement.`
      );

      noteClass +=
        " success";
    }

    else if (
      fallbackCount > 0
    ) {
      notes.push(
        `${fallbackCount} flexible bill${
          fallbackCount === 1
            ? ""
            : "s"
        } could not be read directly from the latest optimizer result, so Stretch My Check placed ${
          fallbackCount === 1
            ? "it"
            : "them"
        } on the latest available paycheck for this forecast.`
      );

      notes.push(
        `Run OPTIMIZE MY MONEY after changing bills or paychecks to refresh the smartest placement.`
      );

      noteClass +=
        " warning";
    }

    if (
      lowestBalance <
      cushion
    ) {
      notes.push(
        `At one point the projected balance falls below your ${currency(
          cushion
        )} protected cushion. Check the recommended plan before treating that money as available to spend.`
      );

      if (
        !noteClass.includes(
          "warning"
        )
      ) {
        noteClass =
          "forecast-note warning";
      }
    }

    if (
      notes.length > 0
    ) {
      note.className =
        noteClass;

      note.style.display =
        "block";

      note.innerHTML =
        notes.join(
          "<br><br>"
        );
    } else {
      note.className =
        "forecast-note";

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
          ?.trim() ===
          "Load"
      ) {
        window.setTimeout(
          createForecast,
          180
        );
      }
    }
  );

  function watchPlannerContainer(
    id
  ) {
    const container =
      document.getElementById(id);

    if (!container) {
      return;
    }

    const observer =
      new MutationObserver(
        scheduleRefresh
      );

    observer.observe(
      container,
      {
        childList:
          true,
        subtree:
          false
      }
    );
  }

  watchPlannerContainer(
    "paychecksContainer"
  );

  watchPlannerContainer(
    "billsContainer"
  );

  window
    .StretchMyCheckForecast = {
      refresh:
        createForecast
    };

  window.setTimeout(
    createForecast,
    180
  );

})();