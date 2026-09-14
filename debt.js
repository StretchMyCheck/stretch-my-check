(() => {
  "use strict";

  /* =========================================================
     STRETCH MY CHECK
     DEBT PAYOFF TOOL
     PART 1 — STATE + HELPERS + PAYOFF ENGINE
  ========================================================= */

  const sb =
    window.supabaseClient;

  if (!sb) {
    console.error(
      "Stretch My Check Debt: Supabase client is not available."
    );

    return;
  }

  let debts =
    [];

  let editingDebtId =
    null;

  let selectedStrategy =
    "snowball";

  let extraPayment =
    0;

  let initialized =
    false;

  /* =========================================================
     BASIC HELPERS
  ========================================================= */

  function money(
    value
  ) {
    const number =
      parseFloat(
        value
      );

    return Number.isFinite(
      number
    )
      ? number
      : 0;
  }

  function roundMoney(
    value
  ) {
    return Math.round(
      (
        money(
          value
        ) +
        Number.EPSILON
      ) *
        100
    ) /
      100;
  }

  function currency(
    value
  ) {
    return new Intl.NumberFormat(
      "en-US",
      {
        style:
          "currency",

        currency:
          "USD"
      }
    ).format(
      money(
        value
      )
    );
  }

  function esc(
    value
  ) {
    return String(
      value ??
        ""
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

  function percent(
    value
  ) {
    const amount =
      money(
        value
      );

    return `${
      amount.toFixed(
        amount % 1 ===
        0
          ? 0
          : 2
      )
    }%`;
  }

  function formatMonthYear(
    value
  ) {
    if (!value) {
      return "";
    }

    const date =
      value instanceof
      Date
        ? value
        : new Date(
            value
          );

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "";
    }

    return date.toLocaleDateString(
      "en-US",
      {
        month:
          "long",

        year:
          "numeric"
      }
    );
  }

  function addMonths(
    value,
    count
  ) {
    const date =
      value instanceof
      Date
        ? new Date(
            value
          )
        : new Date();

    date.setMonth(
      date.getMonth() +
        count
    );

    return date;
  }

  function debtTypeLabel(
    type
  ) {
    const labels = {
      credit_card:
        "Credit Card",

      loan:
        "Loan",

      medical:
        "Medical",

      student_loan:
        "Student Loan",

      auto:
        "Auto Loan",

      personal:
        "Personal Loan",

      other:
        "Other"
    };

    return (
      labels[
        type
      ] ||
      "Debt"
    );
  }

  function debtIcon(
    type
  ) {
    const icons = {
      credit_card:
        "💳",

      loan:
        "💵",

      medical:
        "🩺",

      student_loan:
        "🎓",

      auto:
        "🚗",

      personal:
        "📄",

      other:
        "💰"
    };

    return (
      icons[
        type
      ] ||
      "💰"
    );
  }

  function clamp(
    value,
    minimum,
    maximum
  ) {
    return Math.min(
      Math.max(
        value,
        minimum
      ),
      maximum
    );
  }

  async function currentUser() {
    const {
      data,
      error
    } =
      await sb.auth
        .getUser();

    if (error) {
      console.error(
        "Debt user lookup failed:",
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
     SUMMARY CALCULATIONS
  ========================================================= */

  function totalDebt() {
    return debts.reduce(
      (
        total,
        debt
      ) =>
        total +
        money(
          debt.balance
        ),
      0
    );
  }

  function totalMinimums() {
    return debts.reduce(
      (
        total,
        debt
      ) =>
        total +
        money(
          debt.minimum_payment
        ),
      0
    );
  }

  function weightedAverageApr() {
    const balance =
      totalDebt();

    if (
      balance <=
      0
    ) {
      return 0;
    }

    const weighted =
      debts.reduce(
        (
          total,
          debt
        ) =>
          total +
          (
            money(
              debt.balance
            ) *
            money(
              debt.apr
            )
          ),
        0
      );

    return (
      weighted /
      balance
    );
  }

  function highestAprDebt() {
    if (
      !debts.length
    ) {
      return null;
    }

    return [
      ...debts
    ].sort(
      (
        a,
        b
      ) =>
        money(
          b.apr
        ) -
        money(
          a.apr
        )
    )[0];
  }

  function smallestBalanceDebt() {
    if (
      !debts.length
    ) {
      return null;
    }

    return [
      ...debts
    ]
      .filter(
        debt =>
          money(
            debt.balance
          ) >
          0
      )
      .sort(
        (
          a,
          b
        ) =>
          money(
            a.balance
          ) -
          money(
            b.balance
          )
      )[0] ||
      null;
  }

  /* =========================================================
     STRATEGY ORDER
  ========================================================= */

  function strategyOrder(
    sourceDebts,
    strategy =
      selectedStrategy
  ) {
    const list =
      sourceDebts
        .filter(
          debt =>
            money(
              debt.balance
            ) >
            0
        )
        .map(
          debt => ({
            ...debt
          })
        );

    if (
      strategy ===
      "avalanche"
    ) {
      list.sort(
        (
          a,
          b
        ) => {
          const aprDifference =
            money(
              b.apr
            ) -
            money(
              a.apr
            );

          if (
            Math.abs(
              aprDifference
            ) >
            0.0001
          ) {
            return aprDifference;
          }

          return (
            money(
              a.balance
            ) -
            money(
              b.balance
            )
          );
        }
      );

      return list;
    }

    list.sort(
      (
        a,
        b
      ) => {
        const balanceDifference =
          money(
            a.balance
          ) -
          money(
            b.balance
          );

        if (
          Math.abs(
            balanceDifference
          ) >
          0.004
        ) {
          return balanceDifference;
        }

        return (
          money(
            b.apr
          ) -
          money(
            a.apr
          )
        );
      }
    );

    return list;
  }

  /* =========================================================
     MONTHLY INTEREST
  ========================================================= */

  function monthlyInterest(
    balance,
    apr
  ) {
    const principal =
      Math.max(
        0,
        money(
          balance
        )
      );

    const annualRate =
      Math.max(
        0,
        money(
          apr
        )
      ) /
      100;

    if (
      principal <=
        0 ||
      annualRate <=
        0
    ) {
      return 0;
    }

    return roundMoney(
      principal *
        (
          annualRate /
          12
        )
    );
  }

  /* =========================================================
     PAYOFF SIMULATION
  ========================================================= */

  function simulatePayoff(
    strategy =
      selectedStrategy,
    extra =
      extraPayment
  ) {
    const activeDebts =
      debts
        .filter(
          debt =>
            money(
              debt.balance
            ) >
            0
        )
        .map(
          debt => ({
            id:
              debt.id,

            debt_name:
              debt.debt_name,

            debt_type:
              debt.debt_type,

            balance:
              roundMoney(
                debt.balance
              ),

            apr:
              money(
                debt.apr
              ),

            minimum_payment:
              roundMoney(
                debt.minimum_payment
              ),

            original_balance:
              roundMoney(
                debt.balance
              ),

            paid_off_month:
              null,

            total_interest:
              0,

            total_paid:
              0
          })
        );

    if (
      !activeDebts.length
    ) {
      return {
        strategy,

        extraPayment:
          0,

        months:
          0,

        payoffDate:
          new Date(),

        totalInterest:
          0,

        totalPaid:
          0,

        totalStartingDebt:
          0,

        monthlyMinimum:
          0,

        order:
          [],

        timeline:
          [],

        warning:
          null,

        success:
          true
      };
    }

    const startingTotal =
      activeDebts.reduce(
        (
          total,
          debt
        ) =>
          total +
          debt.balance,
        0
      );

    const startingMinimums =
      activeDebts.reduce(
        (
          total,
          debt
        ) =>
          total +
          debt.minimum_payment,
        0
      );

    const originalMinimumMap =
      new Map();

    activeDebts.forEach(
      debt => {
        originalMinimumMap.set(
          debt.id,
          debt.minimum_payment
        );
      }
    );

    const extraAmount =
      Math.max(
        0,
        roundMoney(
          extra
        )
      );

    let month =
      0;

    let totalInterest =
      0;

    let totalPaid =
      0;

    let rolloverMinimums =
      0;

    let previousActiveIds =
      new Set(
        activeDebts.map(
          debt =>
            debt.id
        )
      );

    const payoffOrder =
      [];

    const timeline =
      [];

    let warning =
      null;

    const MAX_MONTHS =
      1200;

    while (
      activeDebts.some(
        debt =>
          debt.balance >
          0.004
      ) &&
      month <
        MAX_MONTHS
    ) {
      month +=
        1;

      const monthStartBalances =
        new Map();

      activeDebts.forEach(
        debt => {
          monthStartBalances.set(
            debt.id,
            debt.balance
          );
        }
      );

      /* -----------------------------------------------------
         1. ADD MONTHLY INTEREST
      ----------------------------------------------------- */

      activeDebts.forEach(
        debt => {
          if (
            debt.balance <=
            0.004
          ) {
            return;
          }

          const interest =
            monthlyInterest(
              debt.balance,
              debt.apr
            );

          debt.balance =
            roundMoney(
              debt.balance +
                interest
            );

          debt.total_interest =
            roundMoney(
              debt.total_interest +
                interest
            );

          totalInterest =
            roundMoney(
              totalInterest +
                interest
            );
        }
      );

      /* -----------------------------------------------------
         2. PAY MINIMUMS
      ----------------------------------------------------- */

      let unusedMinimumMoney =
        0;

      activeDebts.forEach(
        debt => {
          if (
            debt.balance <=
            0.004
          ) {
            return;
          }

          const minimum =
            Math.max(
              0,
              debt.minimum_payment
            );

          if (
            minimum <=
            0
          ) {
            return;
          }

          const payment =
            Math.min(
              debt.balance,
              minimum
            );

          debt.balance =
            roundMoney(
              debt.balance -
                payment
            );

          debt.total_paid =
            roundMoney(
              debt.total_paid +
                payment
            );

          totalPaid =
            roundMoney(
              totalPaid +
                payment
            );

          if (
            payment <
            minimum
          ) {
            unusedMinimumMoney =
              roundMoney(
                unusedMinimumMoney +
                  (
                    minimum -
                    payment
                  )
              );
          }
        }
      );

      /* -----------------------------------------------------
         3. EXTRA PAYMENT POOL

         Includes:
         - User-entered extra payment
         - Minimums freed from debts paid in prior months
         - Any unused portion of a minimum payment this month
      ----------------------------------------------------- */

      let attackPool =
        roundMoney(
          extraAmount +
            rolloverMinimums +
            unusedMinimumMoney
        );

      const ordered =
        strategyOrder(
          activeDebts.filter(
            debt =>
              debt.balance >
              0.004
          ),
          strategy
        );

      for (
        const orderedDebt
        of ordered
      ) {
        if (
          attackPool <=
          0.004
        ) {
          break;
        }

        const debt =
          activeDebts.find(
            item =>
              Number(
                item.id
              ) ===
              Number(
                orderedDebt.id
              )
          );

        if (
          !debt ||
          debt.balance <=
          0.004
        ) {
          continue;
        }

        const attackPayment =
          Math.min(
            debt.balance,
            attackPool
          );

        debt.balance =
          roundMoney(
            debt.balance -
              attackPayment
          );

        debt.total_paid =
          roundMoney(
            debt.total_paid +
              attackPayment
          );

        totalPaid =
          roundMoney(
            totalPaid +
              attackPayment
          );

        attackPool =
          roundMoney(
            attackPool -
              attackPayment
          );
      }

      /* -----------------------------------------------------
         4. DETECT NEWLY PAID-OFF DEBTS
      ----------------------------------------------------- */

      const currentlyActiveIds =
        new Set(
          activeDebts
            .filter(
              debt =>
                debt.balance >
                0.004
            )
            .map(
              debt =>
                debt.id
            )
        );

      activeDebts.forEach(
        debt => {
          const wasActive =
            previousActiveIds.has(
              debt.id
            );

          const isActive =
            currentlyActiveIds.has(
              debt.id
            );

          if (
            wasActive &&
            !isActive &&
            debt.paid_off_month ===
              null
          ) {
            debt.balance =
              0;

            debt.paid_off_month =
              month;

            payoffOrder.push({
              id:
                debt.id,

              name:
                debt.debt_name,

              month,

              payoffDate:
                addMonths(
                  new Date(),
                  month
                ),

              totalInterest:
                debt.total_interest,

              totalPaid:
                debt.total_paid
            });
          }
        }
      );

      /* -----------------------------------------------------
         5. ROLL FREED MINIMUMS INTO NEXT MONTH
      ----------------------------------------------------- */

      rolloverMinimums =
        activeDebts.reduce(
          (
            total,
            debt
          ) => {
            if (
              debt.balance >
              0.004
            ) {
              return total;
            }

            const originalMinimum =
              originalMinimumMap.get(
                debt.id
              ) ||
              0;

            return (
              total +
              originalMinimum
            );
          },
          0
        );

      rolloverMinimums =
        roundMoney(
          rolloverMinimums
        );

      previousActiveIds =
        currentlyActiveIds;

      /* -----------------------------------------------------
         6. SAVE TIMELINE SNAPSHOT
      ----------------------------------------------------- */

      const remainingBalance =
        roundMoney(
          activeDebts.reduce(
            (
              total,
              debt
            ) =>
              total +
              Math.max(
                0,
                debt.balance
              ),
            0
          )
        );

      timeline.push({
        month,

        date:
          addMonths(
            new Date(),
            month
          ),

        remainingBalance,

        totalInterest:
          roundMoney(
            totalInterest
          ),

        debts:
          activeDebts.map(
            debt => ({
              id:
                debt.id,

              name:
                debt.debt_name,

              startingBalance:
                monthStartBalances.get(
                  debt.id
                ) ||
                0,

              balance:
                Math.max(
                  0,
                  debt.balance
                )
            })
          )
      });

      /* -----------------------------------------------------
         7. DETECT A PLAN THAT CANNOT MAKE PROGRESS
      ----------------------------------------------------- */

      if (
        month >=
        3
      ) {
        const recent =
          timeline.slice(
            -3
          );

        const first =
          recent[0]
            ?.remainingBalance;

        const last =
          recent[
            recent.length -
              1
          ]
            ?.remainingBalance;

        if (
          Number.isFinite(
            first
          ) &&
          Number.isFinite(
            last
          ) &&
          last >=
            first -
              0.01
        ) {
          warning =
            "At the current payment amounts, this debt may not be decreasing because interest is using most or all of the payment.";

          break;
        }
      }
    }

    const remaining =
      activeDebts.reduce(
        (
          total,
          debt
        ) =>
          total +
          Math.max(
            0,
            debt.balance
          ),
        0
      );

    const success =
      remaining <
      0.01;

    if (
      !success &&
      !warning
    ) {
      warning =
        "The payoff estimate exceeded 100 years. Increase your monthly payment to build a realistic payoff plan.";
    }

    return {
      strategy,

      extraPayment:
        extraAmount,

      months:
        month,

      payoffDate:
        success
          ? addMonths(
              new Date(),
              month
            )
          : null,

      totalInterest:
        roundMoney(
          totalInterest
        ),

      totalPaid:
        roundMoney(
          totalPaid
        ),

      totalStartingDebt:
        roundMoney(
          startingTotal
        ),

      monthlyMinimum:
        roundMoney(
          startingMinimums
        ),

      remainingBalance:
        roundMoney(
          remaining
        ),

      order:
        payoffOrder,

      timeline,

      warning,

      success
    };
  }

  /* =========================================================
     STRATEGY COMPARISON
  ========================================================= */

  function strategyComparison() {
    const snowball =
      simulatePayoff(
        "snowball",
        extraPayment
      );

    const avalanche =
      simulatePayoff(
        "avalanche",
        extraPayment
      );

    let interestSavings =
      0;

    if (
      snowball.success &&
      avalanche.success
    ) {
      interestSavings =
        roundMoney(
          snowball.totalInterest -
            avalanche.totalInterest
        );
    }

    let monthDifference =
      0;

    if (
      snowball.success &&
      avalanche.success
    ) {
      monthDifference =
        snowball.months -
        avalanche.months;
    }

    return {
      snowball,
      avalanche,
      interestSavings,
      monthDifference
    };
  }

  /* =========================================================
     CURRENT STRATEGY RESULT
  ========================================================= */

  function currentResult() {
    return simulatePayoff(
      selectedStrategy,
      extraPayment
    );
  }

  /* =========================================================
     NEXT DEBT TO ATTACK
  ========================================================= */

  function nextDebtToAttack() {
    const ordered =
      strategyOrder(
        debts,
        selectedStrategy
      );

    return (
      ordered[0] ||
      null
    );
  }
    /* =========================================================
     DEBT PAYOFF STYLES
  ========================================================= */

  const debtStyle =
    document.createElement(
      "style"
    );

  debtStyle.id =
    "smcDebtStylesV1";

  debtStyle.textContent = `

    /* =====================================================
       MAIN DEBT TOOL SHELL
    ===================================================== */

    .smc-debt-tool {
      display:
        grid;

      gap:
        24px;

      margin-top:
        24px;

      padding-top:
        24px;

      border-top:
        1px solid
        rgba(132,175,192,.13);
    }

    .smc-debt-header {
      display:
        flex;

      justify-content:
        space-between;

      align-items:
        flex-start;

      gap:
        18px;

      flex-wrap:
        wrap;
    }

    .smc-debt-header h2 {
      margin:
        0;

      color:
        #fff;

      font-size:
        24px;

      font-weight:
        850;
    }

    .smc-debt-header p {
      margin:
        7px 0 0;

      max-width:
        680px;

      color:
        #8da4af;

      font-size:
        12px;

      line-height:
        1.6;
    }

    .smc-debt-add-button {
      min-height:
        44px;

      padding:
        10px 18px;

      border:
        1px solid
        rgba(69,225,192,.34);

      border-radius:
        999px;

      background:
        linear-gradient(
          90deg,
          #177d74,
          #258f87
        );

      color:
        #fff;

      font-weight:
        800;

      cursor:
        pointer;
    }

    /* =====================================================
       DEBT SUMMARY
    ===================================================== */

    .smc-debt-summary {
      display:
        grid;

      grid-template-columns:
        repeat(
          4,
          minmax(0,1fr)
        );

      gap:
        15px;
    }

    .smc-debt-summary-card {
      padding:
        19px;

      min-height:
        116px;

      border:
        1px solid
        rgba(132,175,192,.15);

      border-radius:
        16px;

      background:
        linear-gradient(
          145deg,
          #11232d,
          #0d1a23
        );
    }

    .smc-debt-summary-label {
      color:
        #8299a4;

      font-size:
        10px;

      font-weight:
        750;

      text-transform:
        uppercase;

      letter-spacing:
        .05em;
    }

    .smc-debt-summary-value {
      margin-top:
        10px;

      color:
        #fff;

      font-size:
        25px;

      font-weight:
        850;
    }

    .smc-debt-summary-value.good {
      color:
        #55e3c2;
    }

    .smc-debt-summary-note {
      margin-top:
        8px;

      color:
        #718a96;

      font-size:
        10px;

      line-height:
        1.45;
    }

    /* =====================================================
       STRATEGY CONTROLS
    ===================================================== */

    .smc-debt-controls {
      display:
        grid;

      grid-template-columns:
        minmax(0,1fr)
        minmax(260px,340px);

      gap:
        18px;

      padding:
        20px;

      border:
        1px solid
        rgba(132,175,192,.15);

      border-radius:
        18px;

      background:
        linear-gradient(
          145deg,
          #11232d,
          #0d1a23
        );
    }

    .smc-debt-strategy-title,
    .smc-debt-extra-title {
      color:
        #fff;

      font-size:
        14px;

      font-weight:
        800;
    }

    .smc-debt-strategy-sub,
    .smc-debt-extra-sub {
      margin-top:
        5px;

      color:
        #8299a4;

      font-size:
        10px;

      line-height:
        1.5;
    }

    .smc-debt-strategy-buttons {
      display:
        grid;

      grid-template-columns:
        1fr 1fr;

      gap:
        10px;

      margin-top:
        14px;
    }

    .smc-debt-strategy-button {
      min-height:
        52px;

      padding:
        11px 13px;

      border:
        1px solid
        rgba(132,175,192,.16);

      border-radius:
        12px;

      background:
        #0a1b24;

      color:
        #9bb0b9;

      cursor:
        pointer;

      text-align:
        left;
    }

    .smc-debt-strategy-button strong {
      display:
        block;

      color:
        #eaf2f4;

      font-size:
        12px;
    }

    .smc-debt-strategy-button span {
      display:
        block;

      margin-top:
        3px;

      color:
        #778f9a;

      font-size:
        9px;

      line-height:
        1.4;
    }

    .smc-debt-strategy-button.active {
      border-color:
        rgba(69,225,192,.42);

      background:
        rgba(33,128,113,.16);

      box-shadow:
        0 0 0 1px
        rgba(69,225,192,.08);
    }

    .smc-debt-strategy-button.active strong {
      color:
        #55e3c2;
    }

    .smc-debt-extra-box {
      display:
        flex;

      flex-direction:
        column;

      justify-content:
        center;
    }

    .smc-debt-extra-input-row {
      display:
        flex;

      align-items:
        center;

      gap:
        10px;

      margin-top:
        14px;
    }

    .smc-debt-extra-input {
      flex:
        1;

      min-height:
        46px;

      padding:
        10px 12px;

      border:
        1px solid
        rgba(132,175,192,.20);

      border-radius:
        11px;

      background:
        #081923;

      color:
        #fff;

      font:
        inherit;
    }

    .smc-debt-extra-input:focus {
      outline:
        none;

      border-color:
        rgba(69,225,192,.55);

      box-shadow:
        0 0 0 3px
        rgba(69,225,192,.07);
    }

    /* =====================================================
       MAIN DEBT WORKSPACE
    ===================================================== */

    .smc-debt-workspace {
      display:
        grid;

      grid-template-columns:
        minmax(300px,390px)
        minmax(0,1fr);

      gap:
        22px;

      align-items:
        start;
    }

    .smc-debt-list {
      display:
        grid;

      gap:
        16px;
    }

    .smc-debt-card {
      padding:
        18px;

      border:
        1px solid
        rgba(132,175,192,.15);

      border-radius:
        16px;

      background:
        linear-gradient(
          145deg,
          #11232d,
          #0d1a23
        );
    }

    .smc-debt-card.attack {
      border-color:
        rgba(69,225,192,.42);

      box-shadow:
        0 0 0 2px
        rgba(69,225,192,.06);
    }

    .smc-debt-card-top {
      display:
        flex;

      align-items:
        flex-start;

      justify-content:
        space-between;

      gap:
        12px;
    }

    .smc-debt-card-left {
      display:
        flex;

      align-items:
        center;

      gap:
        12px;
    }

    .smc-debt-icon {
      width:
        45px;

      height:
        45px;

      display:
        grid;

      place-items:
        center;

      flex:
        0 0 45px;

      border-radius:
        13px;

      background:
        rgba(69,225,192,.09);

      border:
        1px solid
        rgba(69,225,192,.15);

      font-size:
        21px;
    }

    .smc-debt-name {
      color:
        #fff;

      font-size:
        15px;

      font-weight:
        820;
    }

    .smc-debt-type {
      margin-top:
        4px;

      color:
        #78919c;

      font-size:
        9px;

      text-transform:
        uppercase;

      letter-spacing:
        .04em;
    }

    .smc-debt-attack-chip {
      display:
        inline-flex;

      align-items:
        center;

      padding:
        5px 8px;

      border:
        1px solid
        rgba(69,225,192,.22);

      border-radius:
        999px;

      background:
        rgba(33,128,113,.15);

      color:
        #55e3c2;

      font-size:
        9px;

      font-weight:
        850;

      text-transform:
        uppercase;
    }

    .smc-debt-balance {
      margin-top:
        18px;

      color:
        #fff;

      font-size:
        25px;

      font-weight:
        850;
    }

    .smc-debt-balance-label {
      margin-top:
        3px;

      color:
        #718a96;

      font-size:
        9px;

      text-transform:
        uppercase;
    }

    .smc-debt-detail-grid {
      display:
        grid;

      grid-template-columns:
        repeat(
          3,
          minmax(0,1fr)
        );

      gap:
        9px;

      margin-top:
        16px;
    }

    .smc-debt-detail {
      padding:
        10px;

      border:
        1px solid
        rgba(132,175,192,.10);

      border-radius:
        10px;

      background:
        #0a1b24;
    }

    .smc-debt-detail small {
      display:
        block;

      color:
        #718a96;

      font-size:
        8px;

      text-transform:
        uppercase;
    }

    .smc-debt-detail strong {
      display:
        block;

      margin-top:
        5px;

      color:
        #e6eff2;

      font-size:
        11px;
    }

    .smc-debt-card-actions {
      display:
        grid;

      grid-template-columns:
        1fr;

      gap:
        9px;

      margin-top:
        16px;
    }

    .smc-debt-manage {
      min-height:
        39px;

      border:
        1px solid
        rgba(132,175,192,.15);

      border-radius:
        10px;

      background:
        #132630;

      color:
        #e5eef1;

      font-weight:
        750;

      cursor:
        pointer;
    }

    /* =====================================================
       PAYOFF PLAN PANEL
    ===================================================== */

    .smc-debt-plan-panel {
      padding:
        23px;

      min-height:
        520px;

      position:
        sticky;

      top:
        18px;

      border:
        1px solid
        rgba(132,175,192,.15);

      border-radius:
        18px;

      background:
        linear-gradient(
          145deg,
          #11232d,
          #0d1a23
        );
    }

    .smc-debt-plan-head {
      display:
        flex;

      justify-content:
        space-between;

      gap:
        14px;

      padding-bottom:
        18px;

      border-bottom:
        1px solid
        rgba(132,175,192,.12);
    }

    .smc-debt-plan-kicker {
      color:
        #55e3c2;

      font-size:
        9px;

      font-weight:
        850;

      text-transform:
        uppercase;

      letter-spacing:
        .07em;
    }

    .smc-debt-plan-title {
      margin-top:
        5px;

      color:
        #fff;

      font-size:
        23px;

      font-weight:
        850;
    }

    .smc-debt-plan-sub {
      margin-top:
        6px;

      color:
        #7d95a0;

      font-size:
        10px;

      line-height:
        1.5;
    }

    .smc-debt-plan-summary {
      display:
        grid;

      grid-template-columns:
        repeat(
          3,
          minmax(0,1fr)
        );

      gap:
        11px;

      margin:
        20px 0;
    }

    .smc-debt-plan-stat {
      padding:
        13px;

      border:
        1px solid
        rgba(132,175,192,.10);

      border-radius:
        11px;

      background:
        #0a1b24;
    }

    .smc-debt-plan-stat small {
      display:
        block;

      color:
        #718a96;

      font-size:
        8px;

      text-transform:
        uppercase;
    }

    .smc-debt-plan-stat strong {
      display:
        block;

      margin-top:
        6px;

      color:
        #fff;

      font-size:
        14px;
    }

    .smc-debt-section-title {
      margin:
        22px 0 11px;

      color:
        #fff;

      font-size:
        14px;

      font-weight:
        820;
    }

    /* =====================================================
       ATTACK ORDER
    ===================================================== */

    .smc-debt-order {
      display:
        grid;

      gap:
        10px;
    }

    .smc-debt-order-row {
      display:
        flex;

      justify-content:
        space-between;

      align-items:
        center;

      gap:
        12px;

      padding:
        12px;

      border:
        1px solid
        rgba(132,175,192,.10);

      border-radius:
        11px;

      background:
        #0a1b24;
    }

    .smc-debt-order-left {
      display:
        flex;

      align-items:
        center;

      gap:
        10px;
    }

    .smc-debt-order-number {
      width:
        30px;

      height:
        30px;

      flex:
        0 0 30px;

      display:
        grid;

      place-items:
        center;

      border-radius:
        50%;

      background:
        rgba(69,225,192,.11);

      color:
        #55e3c2;

      font-size:
        10px;

      font-weight:
        850;
    }

    .smc-debt-order-name {
      color:
        #e8f0f2;

      font-size:
        11px;

      font-weight:
        750;
    }

    .smc-debt-order-meta {
      margin-top:
        3px;

      color:
        #718a96;

      font-size:
        9px;
    }

    .smc-debt-order-balance {
      color:
        #fff;

      font-size:
        12px;

      font-weight:
        800;

      text-align:
        right;
    }

    /* =====================================================
       STRATEGY COMPARISON
    ===================================================== */

    .smc-debt-compare {
      display:
        grid;

      grid-template-columns:
        1fr 1fr;

      gap:
        11px;
    }

    .smc-debt-compare-card {
      padding:
        14px;

      border:
        1px solid
        rgba(132,175,192,.10);

      border-radius:
        12px;

      background:
        #0a1b24;
    }

    .smc-debt-compare-card.active {
      border-color:
        rgba(69,225,192,.25);

      background:
        rgba(33,128,113,.09);
    }

    .smc-debt-compare-name {
      color:
        #fff;

      font-size:
        12px;

      font-weight:
        820;
    }

    .smc-debt-compare-row {
      display:
        flex;

      justify-content:
        space-between;

      gap:
        10px;

      margin-top:
        9px;

      color:
        #7f98a4;

      font-size:
        9px;
    }

    .smc-debt-compare-row strong {
      color:
        #e7f0f2;

      font-size:
        10px;
    }

    .smc-debt-savings-note {
      margin-top:
        12px;

      padding:
        12px;

      border:
        1px solid
        rgba(69,225,192,.14);

      border-radius:
        11px;

      background:
        rgba(69,225,192,.05);

      color:
        #8fa7b1;

      font-size:
        10px;

      line-height:
        1.55;
    }

    /* =====================================================
       WARNING
    ===================================================== */

    .smc-debt-warning {
      margin-top:
        16px;

      padding:
        13px;

      border:
        1px solid
        rgba(255,176,113,.18);

      border-radius:
        11px;

      background:
        rgba(147,87,39,.08);

      color:
        #ddb697;

      font-size:
        10px;

      line-height:
        1.55;
    }

    /* =====================================================
       EMPTY STATE
    ===================================================== */

    .smc-debt-empty {
      padding:
        34px 22px;

      border:
        1px dashed
        rgba(132,175,192,.15);

      border-radius:
        16px;

      background:
        rgba(10,27,36,.55);

      color:
        #879ea8;

      text-align:
        center;
    }

    .smc-debt-empty-icon {
      font-size:
        34px;
    }

    .smc-debt-empty h3 {
      margin:
        10px 0 6px;

      color:
        #fff;

      font-size:
        17px;
    }

    .smc-debt-empty p {
      margin:
        0 auto 15px;

      max-width:
        420px;

      font-size:
        11px;

      line-height:
        1.6;
    }

    /* =====================================================
       MODAL
    ===================================================== */

    .smc-debt-modal-overlay {
      position:
        fixed;

      inset:
        0;

      z-index:
        13000;

      display:
        none;

      align-items:
        center;

      justify-content:
        center;

      padding:
        18px;

      background:
        rgba(3,10,14,.82);

      backdrop-filter:
        blur(7px);
    }

    .smc-debt-modal-overlay.show {
      display:
        flex;
    }

    .smc-debt-modal {
      width:
        100%;

      max-width:
        560px;

      max-height:
        90vh;

      overflow:
        auto;

      padding:
        23px;

      border:
        1px solid
        rgba(132,175,192,.20);

      border-radius:
        20px;

      background:
        linear-gradient(
          145deg,
          #132630,
          #0d1b24
        );

      color:
        #fff;
    }

    .smc-debt-modal-head {
      display:
        flex;

      justify-content:
        space-between;

      align-items:
        center;

      gap:
        12px;

      margin-bottom:
        18px;
    }

    .smc-debt-modal-head h2 {
      margin:
        0;

      font-size:
        21px;
    }

    .smc-debt-modal-close {
      width:
        40px;

      height:
        40px;

      border:
        1px solid
        rgba(132,175,192,.17);

      border-radius:
        10px;

      background:
        #172a35;

      color:
        #fff;

      font-size:
        20px;

      cursor:
        pointer;
    }

    .smc-debt-field {
      display:
        flex;

      flex-direction:
        column;

      gap:
        7px;

      margin-bottom:
        14px;
    }

    .smc-debt-field label {
      color:
        #aec1ca;

      font-size:
        12px;

      font-weight:
        750;
    }

    .smc-debt-field input,
    .smc-debt-field select {
      width:
        100%;

      box-sizing:
        border-box;

      min-height:
        46px;

      padding:
        11px 12px;

      border:
        1px solid
        rgba(132,175,192,.22);

      border-radius:
        11px;

      background:
        #081923;

      color:
        #fff;

      font:
        inherit;
    }

    .smc-debt-grid-2 {
      display:
        grid;

      grid-template-columns:
        1fr 1fr;

      gap:
        12px;
    }

    .smc-debt-modal-actions {
      display:
        flex;

      align-items:
        center;

      justify-content:
        flex-end;

      gap:
        10px;

      flex-wrap:
        wrap;

      margin-top:
        19px;
    }

    .smc-debt-cancel,
    .smc-debt-save,
    .smc-debt-delete {
      min-height:
        43px;

      padding:
        10px 17px;

      border-radius:
        10px;

      font-weight:
        750;

      cursor:
        pointer;
    }

    .smc-debt-cancel {
      border:
        1px solid
        rgba(132,175,192,.17);

      background:
        #172a35;

      color:
        #d7e4e9;
    }

    .smc-debt-save {
      border:
        1px solid
        rgba(69,225,192,.32);

      background:
        linear-gradient(
          90deg,
          #177d74,
          #258f87
        );

      color:
        #fff;
    }

    .smc-debt-delete {
      margin-right:
        auto;

      border:
        1px solid
        rgba(255,116,121,.25);

      background:
        rgba(133,42,49,.17);

      color:
        #ff969a;
    }

    .smc-debt-message {
      display:
        none;

      margin-top:
        12px;

      padding:
        11px;

      border-radius:
        10px;

      font-size:
        11px;
    }

    .smc-debt-message.show {
      display:
        block;
    }

    .smc-debt-message.bad {
      color:
        #ff9a9d;

      background:
        rgba(126,41,47,.17);
    }

    /* =====================================================
       SIGNED OUT
    ===================================================== */

    .smc-debt-signed-out {
      padding:
        28px;

      border:
        1px solid
        rgba(132,175,192,.15);

      border-radius:
        16px;

      background:
        linear-gradient(
          145deg,
          #11232d,
          #0d1a23
        );

      color:
        #8da4af;

      text-align:
        center;
    }

    .smc-debt-signed-out h3 {
      margin:
        0 0 7px;

      color:
        #fff;
    }

    /* =====================================================
       RESPONSIVE
    ===================================================== */

    @media(
      max-width:1200px
    ) {

      .smc-debt-summary {
        grid-template-columns:
          repeat(
            2,
            minmax(0,1fr)
          );
      }

    }

    @media(
      max-width:1050px
    ) {

      .smc-debt-controls {
        grid-template-columns:
          1fr;
      }

      .smc-debt-workspace {
        grid-template-columns:
          1fr;
      }

      .smc-debt-plan-panel {
        position:
          static;
      }

      .smc-debt-list {
        grid-template-columns:
          repeat(
            2,
            minmax(0,1fr)
          );
      }

    }

    @media(
      max-width:720px
    ) {

      .smc-debt-tool {
        gap:
          18px;
      }

      .smc-debt-summary,
      .smc-debt-list,
      .smc-debt-strategy-buttons,
      .smc-debt-plan-summary,
      .smc-debt-compare,
      .smc-debt-grid-2 {
        grid-template-columns:
          1fr;
      }

      .smc-debt-header {
        flex-direction:
          column;
      }

      .smc-debt-add-button {
        width:
          100%;
      }

      .smc-debt-detail-grid {
        grid-template-columns:
          1fr;
      }

      .smc-debt-plan-panel {
        padding:
          18px;
      }

    }

  `;

  document.head
    .appendChild(
      debtStyle
    );

  /* =========================================================
     MODAL SHELL
  ========================================================= */

  const debtModal =
    document.createElement(
      "div"
    );

  debtModal.className =
    "smc-debt-modal-overlay";

  debtModal.innerHTML = `
    <div
      class="smc-debt-modal"
    >

      <div
        class="smc-debt-modal-head"
      >

        <h2
          id="smcDebtModalTitle"
        >
          Add Debt
        </h2>

        <button
          id="smcDebtModalClose"
          class="smc-debt-modal-close"
          type="button"
        >
          ×
        </button>

      </div>

      <div
        id="smcDebtModalBody"
      ></div>

      <div
        id="smcDebtMessage"
        class="smc-debt-message"
      ></div>

    </div>
  `;

  document.body
    .appendChild(
      debtModal
    );

  const debtModalTitle =
    document.getElementById(
      "smcDebtModalTitle"
    );

  const debtModalBody =
    document.getElementById(
      "smcDebtModalBody"
    );

  const debtMessage =
    document.getElementById(
      "smcDebtMessage"
    );

  function openDebtModal() {
    debtModal.classList
      .add(
        "show"
      );
  }

  function closeDebtModal() {
    debtModal.classList
      .remove(
        "show"
      );

    editingDebtId =
      null;

    clearDebtMessage();
  }

  function clearDebtMessage() {
    debtMessage.textContent =
      "";

    debtMessage.className =
      "smc-debt-message";
  }

  function showDebtMessage(
    text
  ) {
    debtMessage.textContent =
      text;

    debtMessage.className =
      "smc-debt-message show bad";
  }

  document
    .getElementById(
      "smcDebtModalClose"
    )
    .onclick =
      closeDebtModal;

  debtModal.addEventListener(
    "click",
    event => {
      if (
        event.target ===
        debtModal
      ) {
        closeDebtModal();
      }
    }
  );
    /* =========================================================
     FIND MONEY TOOLS PAGE
  ========================================================= */

  function moneyToolsPage() {
    return document.getElementById(
      "smcToolsPage"
    );
  }

  function debtMountPoint() {
    const toolsPage =
      moneyToolsPage();

    if (!toolsPage) {
      return null;
    }

    let mount =
      document.getElementById(
        "smcDebtTool"
      );

    if (
      !mount
    ) {
      mount =
        document.createElement(
          "section"
        );

      mount.id =
        "smcDebtTool";

      mount.className =
        "smc-debt-tool";

      toolsPage
        .appendChild(
          mount
        );
    }

    return mount;
  }

  /* =========================================================
     BUILD TOOL
  ========================================================= */

  function buildDebtTool() {
    const mount =
      debtMountPoint();

    if (!mount) {
      return false;
    }

    mount.innerHTML = `
      <div
        class="smc-debt-header"
      >

        <div>

          <h2>
            Debt Payoff
          </h2>

          <p>
            Build a payoff plan using
            either the Debt Snowball
            or Debt Avalanche method,
            compare your options, and
            see which debt should get
            your extra money first.
          </p>

        </div>

        <button
          id="smcAddDebt"
          class="smc-debt-add-button"
          type="button"
        >
          + Add Debt
        </button>

      </div>

      <div
        id="smcDebtSignedOut"
        class="smc-debt-signed-out"
        style="display:none"
      >

        <h3>
          Sign in to use Debt Payoff
        </h3>

        <p>
          Your debts and payoff plan
          are stored with your account.
        </p>

      </div>

      <div
        id="smcDebtApp"
      >

        <div
          class="smc-debt-summary"
        >

          <div
            class="smc-debt-summary-card"
          >

            <div
              class="smc-debt-summary-label"
            >
              Total Debt
            </div>

            <div
              id="smcDebtTotal"
              class="smc-debt-summary-value"
            >
              $0.00
            </div>

            <div
              class="smc-debt-summary-note"
            >
              Combined balance
            </div>

          </div>

          <div
            class="smc-debt-summary-card"
          >

            <div
              class="smc-debt-summary-label"
            >
              Minimum Payments
            </div>

            <div
              id="smcDebtMinimums"
              class="smc-debt-summary-value"
            >
              $0.00
            </div>

            <div
              class="smc-debt-summary-note"
            >
              Total required each month
            </div>

          </div>

          <div
            class="smc-debt-summary-card"
          >

            <div
              class="smc-debt-summary-label"
            >
              Average APR
            </div>

            <div
              id="smcDebtAverageApr"
              class="smc-debt-summary-value"
            >
              0%
            </div>

            <div
              class="smc-debt-summary-note"
            >
              Weighted by balance
            </div>

          </div>

          <div
            class="smc-debt-summary-card"
          >

            <div
              class="smc-debt-summary-label"
            >
              Estimated Payoff
            </div>

            <div
              id="smcDebtPayoffDate"
              class="smc-debt-summary-value good"
            >
              —
            </div>

            <div
              id="smcDebtPayoffNote"
              class="smc-debt-summary-note"
            >
              Add debts to calculate
            </div>

          </div>

        </div>

        <div
          class="smc-debt-controls"
        >

          <div>

            <div
              class="smc-debt-strategy-title"
            >
              Payoff Strategy
            </div>

            <div
              class="smc-debt-strategy-sub"
            >
              Snowball gives you faster
              small wins. Avalanche targets
              the highest interest first.
            </div>

            <div
              class="smc-debt-strategy-buttons"
            >

              <button
                id="smcDebtSnowball"
                class="
                  smc-debt-strategy-button
                  active
                "
                type="button"
              >
                <strong>
                  Debt Snowball
                </strong>

                <span>
                  Smallest balance first
                </span>
              </button>

              <button
                id="smcDebtAvalanche"
                class="smc-debt-strategy-button"
                type="button"
              >
                <strong>
                  Debt Avalanche
                </strong>

                <span>
                  Highest APR first
                </span>
              </button>

            </div>

          </div>

          <div
            class="smc-debt-extra-box"
          >

            <div
              class="smc-debt-extra-title"
            >
              Extra Monthly Payment
            </div>

            <div
              class="smc-debt-extra-sub"
            >
              Enter any amount you can
              consistently add on top of
              minimum payments.
            </div>

            <div
              class="smc-debt-extra-input-row"
            >

              <input
                id="smcDebtExtraPayment"
                class="smc-debt-extra-input"
                type="number"
                min="0"
                step="0.01"
                value="0"
                placeholder="100"
              >

            </div>

          </div>

        </div>

        <div
          class="smc-debt-workspace"
        >

          <div
            id="smcDebtList"
            class="smc-debt-list"
          ></div>

          <div
            id="smcDebtPlanPanel"
            class="smc-debt-plan-panel"
          ></div>

        </div>

      </div>
    `;

    document
      .getElementById(
        "smcAddDebt"
      )
      .onclick =
        () =>
          showDebtForm();

    document
      .getElementById(
        "smcDebtSnowball"
      )
      .onclick =
        () => {
          selectedStrategy =
            "snowball";

          renderDebtTool();
        };

    document
      .getElementById(
        "smcDebtAvalanche"
      )
      .onclick =
        () => {
          selectedStrategy =
            "avalanche";

          renderDebtTool();
        };

    document
      .getElementById(
        "smcDebtExtraPayment"
      )
      .addEventListener(
        "input",
        event => {
          extraPayment =
            Math.max(
              0,
              money(
                event.target.value
              )
            );

          renderDebtTool(
            false
          );
        }
      );

    return true;
  }

  /* =========================================================
     SUMMARY RENDER
  ========================================================= */

  function renderDebtSummary() {
    const total =
      totalDebt();

    const minimums =
      totalMinimums();

    const averageApr =
      weightedAverageApr();

    const result =
      currentResult();

    const totalElement =
      document.getElementById(
        "smcDebtTotal"
      );

    const minimumElement =
      document.getElementById(
        "smcDebtMinimums"
      );

    const aprElement =
      document.getElementById(
        "smcDebtAverageApr"
      );

    const payoffElement =
      document.getElementById(
        "smcDebtPayoffDate"
      );

    const payoffNote =
      document.getElementById(
        "smcDebtPayoffNote"
      );

    if (
      totalElement
    ) {
      totalElement.textContent =
        currency(
          total
        );
    }

    if (
      minimumElement
    ) {
      minimumElement.textContent =
        currency(
          minimums
        );
    }

    if (
      aprElement
    ) {
      aprElement.textContent =
        percent(
          averageApr
        );
    }

    if (
      payoffElement
    ) {
      if (
        !debts.length
      ) {
        payoffElement.textContent =
          "—";

      } else if (
        result.success &&
        result.payoffDate
      ) {
        payoffElement.textContent =
          formatMonthYear(
            result.payoffDate
          );

      } else {
        payoffElement.textContent =
          "Needs Adjustment";
      }
    }

    if (
      payoffNote
    ) {
      if (
        !debts.length
      ) {
        payoffNote.textContent =
          "Add debts to calculate";

      } else if (
        result.success
      ) {
        payoffNote.textContent =
          `${result.months} ${
            result.months ===
            1
              ? "month"
              : "months"
          } using ${
            selectedStrategy ===
            "snowball"
              ? "Snowball"
              : "Avalanche"
          }`;

      } else {
        payoffNote.textContent =
          "Current payments need more room";
      }
    }
  }

  /* =========================================================
     STRATEGY BUTTONS
  ========================================================= */

  function renderStrategyButtons() {
    const snowball =
      document.getElementById(
        "smcDebtSnowball"
      );

    const avalanche =
      document.getElementById(
        "smcDebtAvalanche"
      );

    if (
      snowball
    ) {
      snowball.classList.toggle(
        "active",
        selectedStrategy ===
          "snowball"
      );
    }

    if (
      avalanche
    ) {
      avalanche.classList.toggle(
        "active",
        selectedStrategy ===
          "avalanche"
      );
    }
  }

  /* =========================================================
     DEBT CARDS
  ========================================================= */

  function renderDebtCards() {
    const list =
      document.getElementById(
        "smcDebtList"
      );

    if (!list) {
      return;
    }

    if (
      !debts.length
    ) {
      list.innerHTML = `
        <div
          class="smc-debt-empty"
        >

          <div
            class="smc-debt-empty-icon"
          >
            💳
          </div>

          <h3>
            Add your first debt
          </h3>

          <p>
            Enter your current balances,
            APRs, and minimum payments.
            Stretch My Check will build
            your payoff order automatically.
          </p>

          <button
            id="smcDebtEmptyAdd"
            class="smc-debt-add-button"
            type="button"
          >
            + Add Debt
          </button>

        </div>
      `;

      document
        .getElementById(
          "smcDebtEmptyAdd"
        )
        .onclick =
          () =>
            showDebtForm();

      return;
    }

    const attackDebt =
      nextDebtToAttack();

    list.innerHTML =
      debts
        .sort(
          (
            a,
            b
          ) =>
            money(
              b.balance
            ) -
            money(
              a.balance
            )
        )
        .map(
          debt => {
            const isAttack =
              attackDebt &&
              Number(
                attackDebt.id
              ) ===
              Number(
                debt.id
              );

            return `
              <article
                class="
                  smc-debt-card
                  ${
                    isAttack
                      ? "attack"
                      : ""
                  }
                "
              >

                <div
                  class="smc-debt-card-top"
                >

                  <div
                    class="smc-debt-card-left"
                  >

                    <div
                      class="smc-debt-icon"
                    >
                      ${debtIcon(
                        debt.debt_type
                      )}
                    </div>

                    <div>

                      <div
                        class="smc-debt-name"
                      >
                        ${esc(
                          debt.debt_name
                        )}
                      </div>

                      <div
                        class="smc-debt-type"
                      >
                        ${esc(
                          debtTypeLabel(
                            debt.debt_type
                          )
                        )}
                      </div>

                    </div>

                  </div>

                  ${
                    isAttack
                      ? `
                        <div
                          class="smc-debt-attack-chip"
                        >
                          Pay First
                        </div>
                      `
                      : ""
                  }

                </div>

                <div
                  class="smc-debt-balance"
                >
                  ${currency(
                    debt.balance
                  )}
                </div>

                <div
                  class="smc-debt-balance-label"
                >
                  Current Balance
                </div>

                <div
                  class="smc-debt-detail-grid"
                >

                  <div
                    class="smc-debt-detail"
                  >

                    <small>
                      APR
                    </small>

                    <strong>
                      ${percent(
                        debt.apr
                      )}
                    </strong>

                  </div>

                  <div
                    class="smc-debt-detail"
                  >

                    <small>
                      Minimum
                    </small>

                    <strong>
                      ${currency(
                        debt.minimum_payment
                      )}
                    </strong>

                  </div>

                  <div
                    class="smc-debt-detail"
                  >

                    <small>
                      Due Day
                    </small>

                    <strong>
                      ${
                        debt.due_day
                          ? `Day ${
                              debt.due_day
                            }`
                          : "Not set"
                      }
                    </strong>

                  </div>

                </div>

                <div
                  class="smc-debt-card-actions"
                >

                  <button
                    class="smc-debt-manage"
                    data-manage-debt="${
                      debt.id
                    }"
                    type="button"
                  >
                    Manage Debt
                  </button>

                </div>

              </article>
            `;
          }
        )
        .join("");

    list
      .querySelectorAll(
        "[data-manage-debt]"
      )
      .forEach(
        button => {
          button.onclick =
            () => {
              const debt =
                debts.find(
                  item =>
                    Number(
                      item.id
                    ) ===
                    Number(
                      button.dataset
                        .manageDebt
                    )
                );

              showDebtForm(
                debt
              );
            };
        }
      );
  }

  /* =========================================================
     ATTACK ORDER
  ========================================================= */

  function renderAttackOrder() {
    const ordered =
      strategyOrder(
        debts,
        selectedStrategy
      );

    if (
      !ordered.length
    ) {
      return `
        <div
          class="smc-debt-empty"
        >
          Add debts to build
          your payoff order.
        </div>
      `;
    }

    return `
      <div
        class="smc-debt-order"
      >
        ${ordered
          .map(
            (
              debt,
              index
            ) => `
              <div
                class="smc-debt-order-row"
              >

                <div
                  class="smc-debt-order-left"
                >

                  <div
                    class="smc-debt-order-number"
                  >
                    ${index + 1}
                  </div>

                  <div>

                    <div
                      class="smc-debt-order-name"
                    >
                      ${esc(
                        debt.debt_name
                      )}
                    </div>

                    <div
                      class="smc-debt-order-meta"
                    >
                      ${percent(
                        debt.apr
                      )}
                      APR
                      •
                      ${currency(
                        debt.minimum_payment
                      )}
                      minimum
                    </div>

                  </div>

                </div>

                <div
                  class="smc-debt-order-balance"
                >
                  ${currency(
                    debt.balance
                  )}
                </div>

              </div>
            `
          )
          .join("")}
      </div>
    `;
  }

  /* =========================================================
     COMPARISON
  ========================================================= */

  function renderComparison() {
    const comparison =
      strategyComparison();

    const snowball =
      comparison.snowball;

    const avalanche =
      comparison.avalanche;

    const snowballDate =
      snowball.success &&
      snowball.payoffDate
        ? formatMonthYear(
            snowball.payoffDate
          )
        : "Needs adjustment";

    const avalancheDate =
      avalanche.success &&
      avalanche.payoffDate
        ? formatMonthYear(
            avalanche.payoffDate
          )
        : "Needs adjustment";

    let note =
      "Both methods use the same minimum payments and extra monthly payment.";

    if (
      snowball.success &&
      avalanche.success
    ) {
      if (
        comparison.interestSavings >
        0.01
      ) {
        note =
          `Avalanche is estimated to save about ${
            currency(
              comparison.interestSavings
            )
          } in interest compared with Snowball.`;

      } else if (
        comparison.interestSavings <
        -0.01
      ) {
        note =
          `Snowball is estimated to save about ${
            currency(
              Math.abs(
                comparison.interestSavings
              )
            )
          } in this particular payoff plan.`;

      } else {
        note =
          "Both strategies are currently producing nearly the same estimated interest cost.";
      }
    }

    return `
      <div
        class="smc-debt-compare"
      >

        <div
          class="
            smc-debt-compare-card
            ${
              selectedStrategy ===
              "snowball"
                ? "active"
                : ""
            }
          "
        >

          <div
            class="smc-debt-compare-name"
          >
            Snowball
          </div>

          <div
            class="smc-debt-compare-row"
          >
            <span>
              Payoff
            </span>

            <strong>
              ${esc(
                snowballDate
              )}
            </strong>
          </div>

          <div
            class="smc-debt-compare-row"
          >
            <span>
              Months
            </span>

            <strong>
              ${
                snowball.success
                  ? snowball.months
                  : "—"
              }
            </strong>
          </div>

          <div
            class="smc-debt-compare-row"
          >
            <span>
              Est. Interest
            </span>

            <strong>
              ${
                snowball.success
                  ? currency(
                      snowball.totalInterest
                    )
                  : "—"
              }
            </strong>
          </div>

        </div>

        <div
          class="
            smc-debt-compare-card
            ${
              selectedStrategy ===
              "avalanche"
                ? "active"
                : ""
            }
          "
        >

          <div
            class="smc-debt-compare-name"
          >
            Avalanche
          </div>

          <div
            class="smc-debt-compare-row"
          >
            <span>
              Payoff
            </span>

            <strong>
              ${esc(
                avalancheDate
              )}
            </strong>
          </div>

          <div
            class="smc-debt-compare-row"
          >
            <span>
              Months
            </span>

            <strong>
              ${
                avalanche.success
                  ? avalanche.months
                  : "—"
              }
            </strong>
          </div>

          <div
            class="smc-debt-compare-row"
          >
            <span>
              Est. Interest
            </span>

            <strong>
              ${
                avalanche.success
                  ? currency(
                      avalanche.totalInterest
                    )
                  : "—"
              }
            </strong>
          </div>

        </div>

      </div>

      <div
        class="smc-debt-savings-note"
      >
        ${esc(
          note
        )}
      </div>
    `;
  }

  /* =========================================================
     PLAN PANEL
  ========================================================= */

  function renderDebtPlan() {
    const panel =
      document.getElementById(
        "smcDebtPlanPanel"
      );

    if (!panel) {
      return;
    }

    if (
      !debts.length
    ) {
      panel.innerHTML = `
        <div
          class="smc-debt-empty"
          style="
            min-height:400px;
            display:grid;
            place-items:center;
          "
        >

          <div>

            <div
              class="smc-debt-empty-icon"
            >
              🧭
            </div>

            <h3>
              Your Debt Payoff Plan
            </h3>

            <p>
              Add your debts on the left.
              Your payoff order, estimated
              payoff date, and strategy
              comparison will appear here.
            </p>

          </div>

        </div>
      `;

      return;
    }

    const result =
      currentResult();

    const attackDebt =
      nextDebtToAttack();

    const strategyName =
      selectedStrategy ===
      "snowball"
        ? "Debt Snowball"
        : "Debt Avalanche";

    panel.innerHTML = `
      <div
        class="smc-debt-plan-head"
      >

        <div>

          <div
            class="smc-debt-plan-kicker"
          >
            Your Payoff Plan
          </div>

          <div
            class="smc-debt-plan-title"
          >
            ${strategyName}
          </div>

          <div
            class="smc-debt-plan-sub"
          >
            ${
              selectedStrategy ===
              "snowball"
                ? "Smallest balance first for faster wins."
                : "Highest APR first to reduce interest."
            }
          </div>

        </div>

        <div
          class="smc-debt-icon"
        >
          ${
            selectedStrategy ===
            "snowball"
              ? "❄️"
              : "⚡"
          }
        </div>

      </div>

      <div
        class="smc-debt-plan-summary"
      >

        <div
          class="smc-debt-plan-stat"
        >
          <small>
            Total Debt
          </small>

          <strong>
            ${currency(
              result.totalStartingDebt
            )}
          </strong>
        </div>

        <div
          class="smc-debt-plan-stat"
        >
          <small>
            Monthly Plan
          </small>

          <strong>
            ${currency(
              result.monthlyMinimum +
                result.extraPayment
            )}
          </strong>
        </div>

        <div
          class="smc-debt-plan-stat"
        >
          <small>
            Payoff Date
          </small>

          <strong>
            ${
              result.success &&
              result.payoffDate
                ? formatMonthYear(
                    result.payoffDate
                  )
                : "Needs adjustment"
            }
          </strong>
        </div>

      </div>

      ${
        attackDebt
          ? `
            <div
              class="smc-debt-savings-note"
              style="
                margin-top:0;
                margin-bottom:20px;
              "
            >
              <strong
                style="
                  color:#55e3c2;
                "
              >
                Focus debt:
                ${esc(
                  attackDebt.debt_name
                )}
              </strong>

              <br><br>

              Keep paying minimums on
              every debt and send your
              extra
              ${currency(
                extraPayment
              )}
              toward this one first.
            </div>
          `
          : ""
      }

      <div
        class="smc-debt-section-title"
      >
        Payoff Order
      </div>

      ${renderAttackOrder()}

      <div
        class="smc-debt-section-title"
      >
        Snowball vs Avalanche
      </div>

      ${renderComparison()}

      ${
        result.success
          ? `
            <div
              class="smc-debt-savings-note"
            >
              At this pace, your estimated
              total interest is
              <strong
                style="
                  color:#fff;
                "
              >
                ${currency(
                  result.totalInterest
                )}
              </strong>
              and your estimated total paid
              is
              <strong
                style="
                  color:#fff;
                "
              >
                ${currency(
                  result.totalPaid
                )}
              </strong>.
            </div>
          `
          : ""
      }

      ${
        result.warning
          ? `
            <div
              class="smc-debt-warning"
            >
              <strong>
                Heads up:
              </strong>

              ${esc(
                result.warning
              )}
            </div>
          `
          : ""
      }
    `;
  }

  /* =========================================================
     MAIN RENDER
  ========================================================= */

  function renderDebtTool(
    updateInput =
      true
  ) {
    renderDebtSummary();
    renderStrategyButtons();
    renderDebtCards();
    renderDebtPlan();

    if (
      updateInput
    ) {
      const extraInput =
        document.getElementById(
          "smcDebtExtraPayment"
        );

      if (
        extraInput
      ) {
        extraInput.value =
          extraPayment;
      }
    }
  }
    /* =========================================================
     LOAD DEBTS
  ========================================================= */

  async function loadDebts() {
    const user =
      await currentUser();

    const signedOut =
      document.getElementById(
        "smcDebtSignedOut"
      );

    const app =
      document.getElementById(
        "smcDebtApp"
      );

    if (!user) {
      debts = [];

      if (signedOut) {
        signedOut.style.display =
          "block";
      }

      if (app) {
        app.style.display =
          "none";
      }

      return;
    }

    if (signedOut) {
      signedOut.style.display =
        "none";
    }

    if (app) {
      app.style.display =
        "";
    }

    const {
      data,
      error
    } =
      await sb
        .from(
          "debts"
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
        );

    if (error) {
      console.error(
        "Debt load failed:",
        error
      );

      debts = [];

      renderDebtTool();

      return;
    }

    debts =
      data ||
      [];

    renderDebtTool();
  }

  /* =========================================================
     ADD / EDIT DEBT FORM
  ========================================================= */

  function showDebtForm(
    debt = null
  ) {
    const existing =
      Boolean(
        debt?.id
      );

    editingDebtId =
      existing
        ? debt.id
        : null;

    debtModalTitle.textContent =
      existing
        ? "Manage Debt"
        : "Add Debt";

    debtModalBody.innerHTML = `
      <div
        class="smc-debt-field"
      >
        <label>
          Debt name
        </label>

        <input
          id="smcDebtName"
          maxlength="80"
          placeholder="Capital One"
        >
      </div>

      <div
        class="smc-debt-field"
      >
        <label>
          Debt type
        </label>

        <select
          id="smcDebtType"
        >
          <option
            value="credit_card"
          >
            Credit Card
          </option>

          <option
            value="loan"
          >
            Loan
          </option>

          <option
            value="medical"
          >
            Medical
          </option>

          <option
            value="student_loan"
          >
            Student Loan
          </option>

          <option
            value="auto"
          >
            Auto Loan
          </option>

          <option
            value="personal"
          >
            Personal Loan
          </option>

          <option
            value="other"
          >
            Other
          </option>
        </select>
      </div>

      <div
        class="smc-debt-grid-2"
      >

        <div
          class="smc-debt-field"
        >
          <label>
            Current balance
          </label>

          <input
            id="smcDebtBalance"
            type="number"
            min="0"
            step="0.01"
            placeholder="2500"
          >
        </div>

        <div
          class="smc-debt-field"
        >
          <label>
            APR %
          </label>

          <input
            id="smcDebtApr"
            type="number"
            min="0"
            step="0.001"
            placeholder="24.99"
          >
        </div>

      </div>

      <div
        class="smc-debt-grid-2"
      >

        <div
          class="smc-debt-field"
        >
          <label>
            Minimum payment
          </label>

          <input
            id="smcDebtMinimum"
            type="number"
            min="0"
            step="0.01"
            placeholder="75"
          >
        </div>

        <div
          class="smc-debt-field"
        >
          <label>
            Due day
          </label>

          <input
            id="smcDebtDueDay"
            type="number"
            min="1"
            max="31"
            step="1"
            placeholder="15"
          >
        </div>

      </div>

      <div
        class="smc-debt-modal-actions"
      >

        ${
          existing
            ? `
              <button
                id="smcDeleteDebt"
                class="smc-debt-delete"
                type="button"
              >
                Delete Debt
              </button>
            `
            : ""
        }

        <button
          id="smcDebtCancel"
          class="smc-debt-cancel"
          type="button"
        >
          Cancel
        </button>

        <button
          id="smcDebtSave"
          class="smc-debt-save"
          type="button"
        >
          ${
            existing
              ? "Save Changes"
              : "Add Debt"
          }
        </button>

      </div>
    `;

    if (
      existing
    ) {
      document
        .getElementById(
          "smcDebtName"
        )
        .value =
          debt.debt_name ||
          "";

      document
        .getElementById(
          "smcDebtType"
        )
        .value =
          debt.debt_type ||
          "credit_card";

      document
        .getElementById(
          "smcDebtBalance"
        )
        .value =
          money(
            debt.balance
          );

      document
        .getElementById(
          "smcDebtApr"
        )
        .value =
          money(
            debt.apr
          );

      document
        .getElementById(
          "smcDebtMinimum"
        )
        .value =
          money(
            debt.minimum_payment
          );

      document
        .getElementById(
          "smcDebtDueDay"
        )
        .value =
          debt.due_day ||
          "";
    }

    document
      .getElementById(
        "smcDebtCancel"
      )
      .onclick =
        closeDebtModal;

    document
      .getElementById(
        "smcDebtSave"
      )
      .onclick =
        saveDebt;

    document
      .getElementById(
        "smcDeleteDebt"
      )
      ?.addEventListener(
        "click",
        deleteDebt
      );

    clearDebtMessage();

    openDebtModal();
  }

  /* =========================================================
     SAVE DEBT
  ========================================================= */

  async function saveDebt() {
    clearDebtMessage();

    const user =
      await currentUser();

    if (!user) {
      showDebtMessage(
        "Sign in before saving a debt."
      );

      return;
    }

    const name =
      document
        .getElementById(
          "smcDebtName"
        )
        .value
        .trim();

    const type =
      document
        .getElementById(
          "smcDebtType"
        )
        .value;

    const balance =
      roundMoney(
        document
          .getElementById(
            "smcDebtBalance"
          )
          .value
      );

    const apr =
      money(
        document
          .getElementById(
            "smcDebtApr"
          )
          .value
      );

    const minimum =
      roundMoney(
        document
          .getElementById(
            "smcDebtMinimum"
          )
          .value
      );

    const dueValue =
      document
        .getElementById(
          "smcDebtDueDay"
        )
        .value;

    const dueDay =
      dueValue ===
        ""
        ? null
        : parseInt(
            dueValue,
            10
          );

    if (!name) {
      showDebtMessage(
        "Enter a name for this debt."
      );

      return;
    }

    if (
      balance <
      0
    ) {
      showDebtMessage(
        "Balance cannot be negative."
      );

      return;
    }

    if (
      apr <
      0
    ) {
      showDebtMessage(
        "APR cannot be negative."
      );

      return;
    }

    if (
      minimum <
      0
    ) {
      showDebtMessage(
        "Minimum payment cannot be negative."
      );

      return;
    }

    if (
      dueDay !==
        null &&
      (
        !Number.isInteger(
          dueDay
        ) ||
        dueDay <
          1 ||
        dueDay >
          31
      )
    ) {
      showDebtMessage(
        "Due day must be between 1 and 31."
      );

      return;
    }

    const payload = {
      user_id:
        user.id,

      debt_name:
        name,

      debt_type:
        type,

      balance,

      apr,

      minimum_payment:
        minimum,

      due_day:
        dueDay,

      updated_at:
        new Date()
          .toISOString()
    };

    if (
      editingDebtId
    ) {
      const {
        error
      } =
        await sb
          .from(
            "debts"
          )
          .update(
            payload
          )
          .eq(
            "id",
            editingDebtId
          )
          .eq(
            "user_id",
            user.id
          );

      if (error) {
        console.error(
          "Debt update failed:",
          error
        );

        showDebtMessage(
          error.message ||
          "Could not save this debt."
        );

        return;
      }

    } else {
      const {
        error
      } =
        await sb
          .from(
            "debts"
          )
          .insert(
            payload
          );

      if (error) {
        console.error(
          "Debt insert failed:",
          error
        );

        showDebtMessage(
          error.message ||
          "Could not add this debt."
        );

        return;
      }
    }

    closeDebtModal();

    await loadDebts();
  }

  /* =========================================================
     DELETE DEBT
  ========================================================= */

  async function deleteDebt() {
    if (
      !editingDebtId
    ) {
      return;
    }

    const debt =
      debts.find(
        item =>
          Number(
            item.id
          ) ===
          Number(
            editingDebtId
          )
      );

    const confirmed =
      window.confirm(
        `Delete "${
          debt?.debt_name ||
          "this debt"
        }"? This cannot be undone.`
      );

    if (
      !confirmed
    ) {
      return;
    }

    const user =
      await currentUser();

    if (!user) {
      return;
    }

    const {
      error
    } =
      await sb
        .from(
          "debts"
        )
        .delete()
        .eq(
          "id",
          editingDebtId
        )
        .eq(
          "user_id",
          user.id
        );

    if (error) {
      console.error(
        "Debt delete failed:",
        error
      );

      showDebtMessage(
        error.message ||
        "Could not delete this debt."
      );

      return;
    }

    closeDebtModal();

    await loadDebts();
  }

  /* =========================================================
     PAGE REFRESH
  ========================================================= */

  function refreshDebtTool() {
    if (
      !initialized
    ) {
      return;
    }

    if (
      !document.getElementById(
        "smcDebtTool"
      )
    ) {
      initialized =
        false;

      initDebtTool();

      return;
    }

    renderDebtTool();
  }

  /* =========================================================
     INITIALIZATION
  ========================================================= */

  function initDebtTool() {
    if (
      initialized &&
      document.getElementById(
        "smcDebtTool"
      )
    ) {
      return true;
    }

    const tools =
      moneyToolsPage();

    if (!tools) {
      return false;
    }

    if (
      !buildDebtTool()
    ) {
      return false;
    }

    initialized =
      true;

    loadDebts();

    return true;
  }

  /* =========================================================
     WAIT FOR APP SHELL
  ========================================================= */

  if (
    !initDebtTool()
  ) {
    const pageObserver =
      new MutationObserver(
        () => {
          if (
            initDebtTool()
          ) {
            pageObserver
              .disconnect();
          }
        }
      );

    pageObserver.observe(
      document.body,
      {
        childList:
          true,

        subtree:
          true
      }
    );

    window.setTimeout(
      () => {
        initDebtTool();
      },
      700
    );
  }

  /* =========================================================
     AUTH CHANGES
  ========================================================= */

  sb.auth
    .onAuthStateChange(
      () => {
        window.setTimeout(
          () => {
            if (
              initialized
            ) {
              loadDebts();
            } else {
              initDebtTool();
            }
          },
          200
        );
      }
    );

  /* =========================================================
     APP EVENTS
  ========================================================= */

  window.addEventListener(
    "hashchange",
    () => {
      window.setTimeout(
        () => {
          if (
            !initialized
          ) {
            initDebtTool();
          } else {
            refreshDebtTool();
          }
        },
        80
      );
    }
  );

  window.addEventListener(
    "stretchmycheck:plan-loaded",
    () => {
      window.setTimeout(
        refreshDebtTool,
        120
      );
    }
  );

  window.addEventListener(
    "stretchmycheck:profile-updated",
    () => {
      window.setTimeout(
        refreshDebtTool,
        120
      );
    }
  );

  /* =========================================================
     PUBLIC API
  ========================================================= */

  window.StretchMyCheckDebt = {
    refresh:
      loadDebts,

    openAddDebt:
      () =>
        showDebtForm(),

    getDebts:
      () =>
        [
          ...debts
        ],

    getPayoffPlan:
      () =>
        currentResult(),

    setStrategy:
      strategy => {
        if (
          strategy !==
            "snowball" &&
          strategy !==
            "avalanche"
        ) {
          return;
        }

        selectedStrategy =
          strategy;

        renderDebtTool();
      }
  };

})();