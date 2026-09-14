(() => {
  "use strict";

  const sb =
    window.supabaseClient;

  if (!sb) {
    console.error(
      "Stretch My Check Goals: Supabase client is not available."
    );

    return;
  }

  let goals = [];

  let editingGoalId =
    null;

  let moneyGoal =
    null;

  let moneyMode =
    null;

  let selectedGoalId =
    null;

  let goalTransactions =
    [];

  /* =========================================================
     BASIC HELPERS
  ========================================================= */

  const money =
    value =>
      Number.isFinite(
        parseFloat(value)
      )
        ? parseFloat(value)
        : 0;

  const currency =
    value =>
      new Intl.NumberFormat(
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

  const esc =
    value =>
      String(
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

  const pct =
    (
      saved,
      target
    ) =>
      target > 0
        ? Math.max(
            0,
            Math.min(
              100,
              (
                saved /
                target
              ) *
                100
            )
          )
        : 0;

  function localDate(
    value
  ) {
    if (!value) {
      return null;
    }

    if (
      value instanceof Date
    ) {
      const date =
        new Date(
          value
        );

      date.setHours(
        0,
        0,
        0,
        0
      );

      return date;
    }

    const parts =
      String(
        value
      )
        .slice(
          0,
          10
        )
        .split("-")
        .map(
          Number
        );

    if (
      parts.length !==
        3 ||
      !parts.every(
        Number.isFinite
      )
    ) {
      return null;
    }

    const date =
      new Date(
        parts[0],
        parts[1] - 1,
        parts[2]
      );

    date.setHours(
      0,
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

  function key(
    value
  ) {
    const date =
      localDate(
        value
      );

    if (!date) {
      return "";
    }

    return `${
      date.getFullYear()
    }-${
      String(
        date.getMonth() +
          1
      ).padStart(
        2,
        "0"
      )
    }-${
      String(
        date.getDate()
      ).padStart(
        2,
        "0"
      )
    }`;
  }

  function formatDate(
    value
  ) {
    const date =
      localDate(
        value
      );

    return date
      ? date.toLocaleDateString(
          "en-US",
          {
            month:
              "short",

            day:
              "numeric",

            year:
              "numeric"
          }
        )
      : "No target date";
  }

  function formatMonthYear(
    value
  ) {
    const date =
      value instanceof Date
        ? value
        : new Date(
            value
          );

    if (
      !date ||
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

  function daysUntil(
    value
  ) {
    const date =
      localDate(
        value
      );

    if (!date) {
      return null;
    }

    const today =
      new Date();

    today.setHours(
      0,
      0,
      0,
      0
    );

    return Math.ceil(
      (
        date -
        today
      ) /
        86400000
    );
  }

  function monthsBetween(
    start,
    end
  ) {
    const startDate =
      new Date(
        start
      );

    const endDate =
      new Date(
        end
      );

    if (
      Number.isNaN(
        startDate.getTime()
      ) ||
      Number.isNaN(
        endDate.getTime()
      )
    ) {
      return 0;
    }

    return Math.max(
      1,
      (
        (
          endDate.getFullYear() -
          startDate.getFullYear()
        ) *
          12
      ) +
        (
          endDate.getMonth() -
          startDate.getMonth()
        ) +
        1
    );
  }

  function addMonths(
    date,
    months
  ) {
    const result =
      new Date(
        date
      );

    result.setMonth(
      result.getMonth() +
        months
    );

    return result;
  }

  function icon(
    goal
  ) {
    return (
      goal.icon &&
      goal.icon !==
        "target"
    )
      ? goal.icon
      : goal.goal_type ===
          "sinking"
        ? "💰"
        : "🎯";
  }

  async function user() {
    const {
      data,
      error
    } =
      await sb.auth
        .getUser();

    if (error) {
      console.error(
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
     PAYCHECK DATA
  ========================================================= */

  function currentPaychecks() {
    const today =
      new Date();

    today.setHours(
      0,
      0,
      0,
      0
    );

    return [
      ...document
        .querySelectorAll(
          ".paycheck-entry"
        )
    ]
      .map(
        (
          entry,
          index
        ) => {
          const dateValue =
            entry
              .querySelector(
                ".paycheck-date"
              )
              ?.value ||
            "";

          return {
            name:
              entry
                .querySelector(
                  ".paycheck-name"
                )
                ?.value
                ?.trim() ||
              `Paycheck ${
                index + 1
              }`,

            dateValue,

            date:
              localDate(
                dateValue
              ),

            amount:
              money(
                entry
                  .querySelector(
                    ".paycheck-amount"
                  )
                  ?.value
              )
          };
        }
      )
      .filter(
        paycheck =>
          paycheck.date &&
          paycheck.date >=
            today
      )
      .sort(
        (
          a,
          b
        ) =>
          a.date -
          b.date
      );
  }

  function optimizedMap() {
    const map =
      new Map();

    const paychecks =
      window
        .latestPlannerData
        ?.paychecks;

    if (
      !Array.isArray(
        paychecks
      )
    ) {
      return map;
    }

    paychecks.forEach(
      paycheck => {
        const dateKey =
          key(
            paycheck
              .dateValue ||
            paycheck.date
          );

        if (!dateKey) {
          return;
        }

        map.set(
          dateKey,
          {
            safeToSpend:
              Math.max(
                0,
                money(
                  paycheck
                    .safeToSpend
                )
              ),

            runningBalance:
              money(
                paycheck
                  .runningBalance
              ),

            name:
              paycheck.name ||
              ""
          }
        );
      }
    );

    return map;
  }

  /* =========================================================
     SMART PAYCHECK GOAL PLAN
  ========================================================= */

  function goalPlan(
    goal
  ) {
    const target =
      money(
        goal.target_amount
      );

    const saved =
      money(
        goal.saved_amount
      );

    const remaining =
      Math.max(
        target -
          saved,
        0
      );

    const targetDate =
      localDate(
        goal.target_date
      );

    if (
      target > 0 &&
      saved >= target
    ) {
      return {
        status:
          "Goal Reached",

        cls:
          "complete",

        headline:
          "You reached this goal.",

        detail:
          "This goal is fully funded.",

        rows:
          [],

        shortfall:
          0,

        totalPlanned:
          0
      };
    }

    if (!targetDate) {
      return {
        status:
          "Flexible Goal",

        cls:
          "neutral",

        headline:
          `${
            currency(
              remaining
            )
          } left to save`,

        detail:
          "Add a target date to build a paycheck-by-paycheck path.",

        rows:
          [],

        shortfall:
          remaining,

        totalPlanned:
          0
      };
    }

    const paychecks =
      currentPaychecks()
        .filter(
          paycheck =>
            paycheck.date <=
            targetDate
        );

    if (
      !paychecks.length
    ) {
      return {
        status:
          "Add Paychecks",

        cls:
          "neutral",

        headline:
          `${
            currency(
              remaining
            )
          } left to save`,

        detail:
          "Add upcoming paychecks in My Plan through this target date.",

        rows:
          [],

        shortfall:
          remaining,

        totalPlanned:
          0
      };
    }

    const optimized =
      optimizedMap();

    const hasOptimized =
      paychecks.some(
        paycheck =>
          optimized.has(
            key(
              paycheck.date
            )
          )
      );

    let left =
      remaining;

    const rows =
      [];

    if (
      hasOptimized
    ) {
      const eligible =
        paychecks.map(
          paycheck => ({
            ...paycheck,

            safe:
              optimized.get(
                key(
                  paycheck.date
                )
              )
                ?.safeToSpend ??
              0
          })
        );

      for (
        let index = 0;
        index <
        eligible.length;
        index++
      ) {
        const paycheck =
          eligible[index];

        const checksLeft =
          eligible.length -
          index;

        const evenNeed =
          checksLeft > 0
            ? left /
              checksLeft
            : left;

        const contribution =
          Math.min(
            paycheck.safe,
            Math.max(
              0,
              evenNeed
            ),
            left
          );

        rows.push({
          ...paycheck,

          contribution,

          skip:
            contribution <=
            0.004
        });

        left =
          Math.max(
            0,
            left -
              contribution
          );
      }

    } else {
      const each =
        remaining /
        paychecks.length;

      paychecks.forEach(
        (
          paycheck,
          index
        ) => {
          const contribution =
            index ===
            paychecks.length -
              1
              ? Math.max(
                  0,
                  remaining -
                    each *
                      (
                        paychecks.length -
                        1
                      )
                )
              : each;

          rows.push({
            ...paycheck,

            safe:
              null,

            contribution,

            skip:
              false
          });
        }
      );

      left =
        0;
    }

    const totalPlanned =
      rows.reduce(
        (
          total,
          row
        ) =>
          total +
          row.contribution,
        0
      );

    const shortfall =
      Math.max(
        0,
        remaining -
          totalPlanned
      );

    const onTrack =
      shortfall <
      0.01;

    const firstContribution =
      rows.find(
        row =>
          row.contribution >
          0
      );

    return {
      status:
        onTrack
          ? "On Track"
          : "Needs Attention",

      cls:
        onTrack
          ? "track"
          : "attention",

      headline:
        onTrack
          ? `${
              currency(
                firstContribution
                  ?.contribution ||
                  0
              )
            } next recommended`
          : `${
              currency(
                shortfall
              )
            } gap remains`,

      detail:
        hasOptimized
          ? "Built from your upcoming paychecks and current optimized safe-spending room."
          : "Built from your upcoming paychecks. Run Optimize My Money for safety-aware recommendations.",

      rows,

      shortfall,

      totalPlanned
    };
  }

  /* =========================================================
     SAVINGS PACE
  ========================================================= */

  function transactionsForGoal(
    goalId
  ) {
    return goalTransactions
      .filter(
        transaction =>
          Number(
            transaction.goal_id
          ) ===
          Number(
            goalId
          )
      )
      .sort(
        (
          a,
          b
        ) =>
          new Date(
            a.created_at
          ) -
          new Date(
            b.created_at
          )
      );
  }

  function netTransactionAmount(
    transaction
  ) {
    const amount =
      money(
        transaction.amount
      );

    return transaction
      .transaction_type ===
      "withdrawal"
        ? -amount
        : amount;
  }

  function thisMonthSaved(
    goalId = null
  ) {
    const now =
      new Date();

    const month =
      now.getMonth();

    const year =
      now.getFullYear();

    return goalTransactions
      .filter(
        transaction => {
          if (
            goalId !== null &&
            Number(
              transaction.goal_id
            ) !==
            Number(
              goalId
            )
          ) {
            return false;
          }

          const date =
            new Date(
              transaction.created_at
            );

          return (
            !Number.isNaN(
              date.getTime()
            ) &&
            date.getMonth() ===
              month &&
            date.getFullYear() ===
              year
          );
        }
      )
      .reduce(
        (
          total,
          transaction
        ) =>
          total +
          netTransactionAmount(
            transaction
          ),
        0
      );
  }

  function savingsPace(
    goal
  ) {
    const transactions =
      transactionsForGoal(
        goal.id
      );

    const deposits =
      transactions.filter(
        transaction =>
          transaction
            .transaction_type ===
          "deposit"
      );

    const target =
      money(
        goal.target_amount
      );

    const saved =
      money(
        goal.saved_amount
      );

    const remaining =
      Math.max(
        target -
          saved,
        0
      );

    const monthSaved =
      thisMonthSaved(
        goal.id
      );

    if (
      remaining <=
      0.004
    ) {
      return {
        ready:
          true,

        monthSaved,

        averageMonthly:
          0,

        projectedDate:
          null,

        status:
          "Goal Reached",

        cls:
          "complete",

        differenceDays:
          null,

        message:
          "This goal is fully funded."
      };
    }

    if (
      deposits.length <
      2
    ) {
      return {
        ready:
          false,

        monthSaved,

        averageMonthly:
          null,

        projectedDate:
          null,

        status:
          "Building History",

        cls:
          "neutral",

        differenceDays:
          null,

        message:
          "Keep adding money to this goal. Once you have more activity, Stretch My Check can estimate your savings pace."
      };
    }

    const firstActivity =
      new Date(
        transactions[0]
          .created_at
      );

    const now =
      new Date();

    const months =
      monthsBetween(
        firstActivity,
        now
      );

    const netSaved =
      transactions.reduce(
        (
          total,
          transaction
        ) =>
          total +
          netTransactionAmount(
            transaction
          ),
        0
      );

    const averageMonthly =
      Math.max(
        0,
        netSaved /
          months
      );

    if (
      averageMonthly <=
      0.004
    ) {
      return {
        ready:
          false,

        monthSaved,

        averageMonthly:
          0,

        projectedDate:
          null,

        status:
          "Needs Momentum",

        cls:
          "attention",

        differenceDays:
          null,

        message:
          "Your recent withdrawals are offsetting your savings. Add more money to create a reliable projection."
      };
    }

    const monthsNeeded =
      Math.ceil(
        remaining /
          averageMonthly
      );

    const projectedDate =
      addMonths(
        now,
        monthsNeeded
      );

    const targetDate =
      localDate(
        goal.target_date
      );

    let status =
      "Projected";

    let cls =
      "neutral";

    let differenceDays =
      null;

    let message =
      `At your current pace, you could reach this goal around ${formatMonthYear(
        projectedDate
      )}.`;

    if (
      targetDate
    ) {
      differenceDays =
        Math.round(
          (
            targetDate -
            projectedDate
          ) /
            86400000
        );

      if (
        projectedDate <=
        targetDate
      ) {
        status =
          "On Pace";

        cls =
          "track";

        if (
          differenceDays >=
          7
        ) {
          const weeks =
            Math.max(
              1,
              Math.round(
                differenceDays /
                  7
              )
            );

          message =
            `At your current pace, you could reach this goal about ${weeks} ${
              weeks === 1
                ? "week"
                : "weeks"
            } early.`;
        } else {
          message =
            "At your current pace, you are projected to reach this goal by your target date.";
        }

      } else {
        status =
          "Behind Pace";

        cls =
          "attention";

        const daysLate =
          Math.abs(
            differenceDays
          );

        const weeks =
          Math.max(
            1,
            Math.round(
              daysLate /
                7
            )
          );

        message =
          `At your current pace, this goal is projected about ${weeks} ${
            weeks === 1
              ? "week"
              : "weeks"
          } after your target date.`;
      }
    }

    return {
      ready:
        true,

      monthSaved,

      averageMonthly,

      projectedDate,

      status,

      cls,

      differenceDays,

      message
    };
  }
    /* =========================================================
     STYLES
  ========================================================= */

  const style =
    document.createElement(
      "style"
    );

  style.id =
    "smcGoalsStylesV4";

  style.textContent = `

    #smcGoalsPage {
      --g-border:
        rgba(132,175,192,.17);

      --g-muted:
        #8fa6b1;

      --g-teal:
        #45e1c0;
    }

    .smc-goals-shell {
      display:
        grid;

      gap:
        18px;
    }

    .smc-goals-summary {
      display:
        grid;

      grid-template-columns:
        repeat(
          5,
          minmax(0,1fr)
        );

      gap:
        14px;
    }

    .smc-goal-summary-card,
    .smc-goals-toolbar,
    .smc-goal-card,
    .smc-goal-plan-panel,
    .smc-goal-signed-out {
      background:
        linear-gradient(
          145deg,
          #11232d,
          #0d1a23
        );

      border:
        1px solid
        var(--g-border);

      border-radius:
        18px;
    }

    .smc-goal-summary-card {
      min-height:
        132px;

      padding:
        20px;
    }

    .smc-goal-summary-label {
      color:
        var(--g-muted);

      font-size:
        12px;

      margin-bottom:
        14px;
    }

    .smc-goal-summary-value {
      color:
        #fff;

      font-size:
        27px;

      font-weight:
        850;
    }

    .smc-goal-summary-value.good {
      color:
        #67e7c4;
    }

    .smc-goal-summary-note {
      color:
        #77909b;

      font-size:
        11px;

      margin-top:
        9px;
    }

    .smc-goals-toolbar {
      display:
        flex;

      justify-content:
        space-between;

      align-items:
        center;

      gap:
        16px;

      flex-wrap:
        wrap;

      padding:
        20px;
    }

    .smc-goals-toolbar h2 {
      margin:
        0;

      color:
        #fff;

      font-size:
        21px;
    }

    .smc-goals-toolbar p {
      margin:
        5px 0 0;

      color:
        var(--g-muted);

      font-size:
        12px;
    }

    .smc-goal-primary {
      min-height:
        43px;

      border:
        1px solid
        rgba(69,225,192,.35);

      border-radius:
        999px;

      padding:
        10px 18px;

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

    .smc-goals-workspace {
      display:
        grid;

      grid-template-columns:
        minmax(300px,390px)
        minmax(0,1fr);

      gap:
        15px;

      align-items:
        start;
    }

    .smc-goal-grid {
      display:
        grid;

      grid-template-columns:
        1fr;

      gap:
        15px;
    }

    .smc-goal-card {
      padding:
        20px;

      cursor:
        pointer;
    }

    .smc-goal-card.selected {
      border-color:
        rgba(69,225,192,.48);

      box-shadow:
        0 0 0 2px
        rgba(69,225,192,.08);
    }

    .smc-goal-top,
    .smc-goal-money-row,
    .smc-goal-guidance-head,
    .smc-goal-progress-line,
    .smc-goal-plan-top,
    .smc-goal-plan-row,
    .smc-goal-activity-row,
    .smc-goal-pace-head {
      display:
        flex;

      justify-content:
        space-between;

      gap:
        12px;
    }

    .smc-goal-icon {
      width:
        46px;

      height:
        46px;

      display:
        grid;

      place-items:
        center;

      border-radius:
        14px;

      background:
        rgba(69,225,192,.10);

      border:
        1px solid
        rgba(69,225,192,.17);

      font-size:
        24px;
    }

    .smc-goal-type,
    .smc-goal-status,
    .smc-plan-chip,
    .smc-goal-pace-chip {
      display:
        inline-flex;

      align-items:
        center;

      border-radius:
        999px;

      font-size:
        10px;

      font-weight:
        800;

      text-transform:
        uppercase;

      letter-spacing:
        .04em;
    }

    .smc-goal-type {
      padding:
        5px 9px;

      background:
        rgba(104,127,143,.12);

      color:
        #9ab0ba;
    }

    .smc-goal-name {
      margin:
        17px 0 4px;

      color:
        #fff;

      font-size:
        19px;

      font-weight:
        820;
    }

    .smc-goal-date {
      color:
        #7f98a4;

      font-size:
        11px;
    }

    .smc-goal-money-row {
      margin-top:
        19px;

      align-items:
        flex-end;
    }

    .smc-goal-saved {
      color:
        #fff;

      font-size:
        24px;

      font-weight:
        850;
    }

    .smc-goal-target {
      color:
        #8298a3;

      font-size:
        11px;

      text-align:
        right;
    }

    .smc-goal-progress-track {
      height:
        10px;

      margin-top:
        15px;

      border-radius:
        999px;

      overflow:
        hidden;

      background:
        #263640;
    }

    .smc-goal-progress-fill {
      height:
        100%;

      border-radius:
        inherit;

      background:
        linear-gradient(
          90deg,
          #27a892,
          #45e1c0
        );
    }

    .smc-goal-progress-line {
      margin-top:
        8px;

      color:
        #8da3ae;

      font-size:
        11px;
    }

    /* =====================================================
       SMART GUIDANCE
    ===================================================== */

    .smc-goal-guidance {
      margin-top:
        15px;

      padding:
        13px;

      border-radius:
        13px;

      background:
        #0d1d26;

      border:
        1px solid
        rgba(132,175,192,.13);
    }

    .smc-goal-guidance-title {
      color:
        #dce9ed;

      font-size:
        11px;

      font-weight:
        800;

      text-transform:
        uppercase;
    }

    .smc-goal-status {
      padding:
        4px 8px;
    }

    .smc-goal-status.track,
    .smc-goal-status.complete,
    .smc-plan-chip.good,
    .smc-goal-pace-chip.track,
    .smc-goal-pace-chip.complete {
      color:
        #73e6c9;

      background:
        rgba(31,121,103,.18);

      border:
        1px solid
        rgba(69,225,192,.20);
    }

    .smc-goal-status.attention,
    .smc-plan-chip.warn,
    .smc-goal-pace-chip.attention {
      color:
        #ffb071;

      background:
        rgba(142,79,30,.19);

      border:
        1px solid
        rgba(255,157,85,.20);
    }

    .smc-goal-status.neutral,
    .smc-goal-pace-chip.neutral {
      color:
        #a6bbc4;

      background:
        rgba(96,126,139,.14);

      border:
        1px solid
        rgba(132,175,192,.15);
    }

    .smc-goal-guidance-main {
      color:
        #fff;

      font-size:
        15px;

      font-weight:
        820;

      margin-top:
        7px;
    }

    .smc-goal-guidance-detail {
      margin-top:
        5px;

      color:
        #809aa6;

      font-size:
        10px;

      line-height:
        1.45;
    }

    /* =====================================================
       BUTTONS
    ===================================================== */

    .smc-goal-actions {
      display:
        grid;

      grid-template-columns:
        1fr 1fr 1fr;

      gap:
        8px;

      margin-top:
        17px;
    }

    .smc-goal-action {
      min-height:
        39px;

      border-radius:
        10px;

      border:
        1px solid
        rgba(132,175,192,.17);

      background:
        #132630;

      color:
        #e4eef1;

      font-weight:
        750;

      cursor:
        pointer;
    }

    .smc-goal-action.add {
      color:
        var(--g-teal);

      border-color:
        rgba(69,225,192,.27);

      background:
        rgba(30,112,101,.17);
    }

    .smc-goal-action.withdraw {
      color:
        #bba0ff;

      border-color:
        rgba(155,109,255,.22);

      background:
        rgba(90,61,150,.14);
    }

    /* =====================================================
       RIGHT-SIDE PLAN
    ===================================================== */

    .smc-goal-plan-panel {
      padding:
        22px;

      min-height:
        500px;

      position:
        sticky;

      top:
        18px;
    }

    .smc-goal-plan-top {
      align-items:
        flex-start;

      border-bottom:
        1px solid
        rgba(132,175,192,.12);

      padding-bottom:
        18px;
    }

    .smc-goal-plan-kicker {
      color:
        #45e1c0;

      font-size:
        10px;

      font-weight:
        850;

      text-transform:
        uppercase;

      letter-spacing:
        .08em;
    }

    .smc-goal-plan-title {
      color:
        #fff;

      font-size:
        24px;

      font-weight:
        850;

      margin:
        5px 0;
    }

    .smc-goal-plan-sub {
      color:
        #839ba6;

      font-size:
        11px;
    }

    .smc-goal-plan-summary {
      display:
        grid;

      grid-template-columns:
        repeat(
          3,
          minmax(0,1fr)
        );

      gap:
        10px;

      margin:
        18px 0;
    }

    .smc-goal-plan-stat {
      background:
        #0b1b24;

      border:
        1px solid
        rgba(132,175,192,.12);

      border-radius:
        12px;

      padding:
        13px;
    }

    .smc-goal-plan-stat small {
      display:
        block;

      color:
        #78909b;

      font-size:
        9px;

      text-transform:
        uppercase;
    }

    .smc-goal-plan-stat strong {
      display:
        block;

      color:
        #fff;

      margin-top:
        5px;

      font-size:
        15px;
    }

    .smc-goal-plan-list {
      display:
        grid;

      gap:
        9px;
    }

    .smc-goal-plan-row {
      align-items:
        center;

      padding:
        13px;

      border-radius:
        12px;

      background:
        #0b1b24;

      border:
        1px solid
        rgba(132,175,192,.11);
    }

    .smc-plan-date {
      color:
        #fff;

      font-weight:
        750;

      font-size:
        12px;
    }

    .smc-plan-name {
      color:
        #7e97a2;

      font-size:
        10px;

      margin-top:
        3px;
    }

    .smc-plan-amount {
      text-align:
        right;

      color:
        #45e1c0;

      font-weight:
        850;
    }

    .smc-plan-skip {
      color:
        #8fa6b1;
    }

    .smc-plan-safe {
      color:
        #6f8792;

      font-size:
        9px;

      margin-top:
        3px;
    }

    .smc-plan-chip {
      padding:
        4px 8px;

      margin-top:
        14px;
    }

    .smc-goal-plan-note {
      margin-top:
        14px;

      padding:
        12px;

      border-radius:
        11px;

      background:
        rgba(69,225,192,.06);

      border:
        1px solid
        rgba(69,225,192,.12);

      color:
        #89a5af;

      font-size:
        10px;

      line-height:
        1.5;
    }

    /* =====================================================
       SAVINGS PACE
    ===================================================== */

    .smc-goal-pace {
      margin-top:
        22px;

      padding-top:
        18px;

      border-top:
        1px solid
        rgba(132,175,192,.12);
    }

    .smc-goal-pace-head {
      align-items:
        center;

      margin-bottom:
        12px;
    }

    .smc-goal-pace-title {
      color:
        #fff;

      font-size:
        14px;

      font-weight:
        800;
    }

    .smc-goal-pace-chip {
      padding:
        5px 8px;
    }

    .smc-goal-pace-grid {
      display:
        grid;

      grid-template-columns:
        repeat(
          3,
          minmax(0,1fr)
        );

      gap:
        9px;
    }

    .smc-goal-pace-stat {
      padding:
        13px;

      border-radius:
        12px;

      background:
        #0b1b24;

      border:
        1px solid
        rgba(132,175,192,.11);
    }

    .smc-goal-pace-stat small {
      display:
        block;

      color:
        #758e99;

      font-size:
        9px;

      text-transform:
        uppercase;
    }

    .smc-goal-pace-stat strong {
      display:
        block;

      margin-top:
        5px;

      color:
        #fff;

      font-size:
        14px;
    }

    .smc-goal-pace-message {
      margin-top:
        10px;

      padding:
        12px;

      border-radius:
        11px;

      background:
        rgba(69,225,192,.05);

      border:
        1px solid
        rgba(69,225,192,.11);

      color:
        #89a5af;

      font-size:
        10px;

      line-height:
        1.5;
    }

    .smc-goal-pace-message.attention {
      background:
        rgba(147,87,39,.08);

      border-color:
        rgba(255,176,113,.13);

      color:
        #d7b393;
    }

    /* =====================================================
       RECENT ACTIVITY
    ===================================================== */

    .smc-goal-activity {
      margin-top:
        22px;

      padding-top:
        18px;

      border-top:
        1px solid
        rgba(132,175,192,.12);
    }

    .smc-goal-activity-head {
      display:
        flex;

      align-items:
        center;

      justify-content:
        space-between;

      gap:
        12px;

      margin-bottom:
        11px;
    }

    .smc-goal-activity-title {
      color:
        #fff;

      font-size:
        14px;

      font-weight:
        800;
    }

    .smc-goal-activity-count {
      color:
        #758e99;

      font-size:
        10px;
    }

    .smc-goal-activity-list {
      display:
        grid;

      gap:
        8px;
    }

    .smc-goal-activity-row {
      align-items:
        center;

      padding:
        12px;

      border-radius:
        12px;

      background:
        #0b1b24;

      border:
        1px solid
        rgba(132,175,192,.10);
    }

    .smc-goal-activity-left {
      display:
        flex;

      align-items:
        center;

      gap:
        10px;
    }

    .smc-goal-activity-icon {
      width:
        34px;

      height:
        34px;

      flex:
        0 0 34px;

      display:
        grid;

      place-items:
        center;

      border-radius:
        10px;

      font-size:
        17px;
    }

    .smc-goal-activity-icon.deposit {
      color:
        #67e7c4;

      background:
        rgba(36,139,115,.18);

      border:
        1px solid
        rgba(69,225,192,.17);
    }

    .smc-goal-activity-icon.withdrawal {
      color:
        #c2a8ff;

      background:
        rgba(105,70,171,.16);

      border:
        1px solid
        rgba(164,125,255,.16);
    }

    .smc-goal-activity-type {
      color:
        #e6eff2;

      font-size:
        11px;

      font-weight:
        750;
    }

    .smc-goal-activity-date {
      color:
        #718b96;

      font-size:
        9px;

      margin-top:
        3px;
    }

    .smc-goal-activity-amount {
      font-size:
        13px;

      font-weight:
        850;

      text-align:
        right;
    }

    .smc-goal-activity-amount.deposit {
      color:
        #67e7c4;
    }

    .smc-goal-activity-amount.withdrawal {
      color:
        #c2a8ff;
    }

    .smc-goal-activity-note {
      margin-top:
        3px;

      color:
        #718b96;

      font-size:
        9px;

      text-align:
        right;
    }

    .smc-goal-activity-empty {
      padding:
        18px;

      border-radius:
        12px;

      background:
        #0b1b24;

      border:
        1px dashed
        rgba(132,175,192,.12);

      color:
        #78919c;

      font-size:
        10px;

      line-height:
        1.5;

      text-align:
        center;
    }

    /* =====================================================
       EMPTY STATES
    ===================================================== */

    .smc-goal-empty,
    .smc-plan-empty {
      padding:
        34px 22px;

      text-align:
        center;

      color:
        #91a7b2;
    }

    .smc-plan-empty {
      display:
        grid;

      place-items:
        center;

      min-height:
        420px;
    }

    .smc-plan-empty h3 {
      color:
        #fff;

      margin:
        8px 0;
    }

    .smc-plan-empty p {
      max-width:
        460px;

      line-height:
        1.5;

      font-size:
        12px;
    }

    .smc-goal-signed-out {
      padding:
        32px;

      text-align:
        center;

      color:
        var(--g-muted);
    }

    /* =====================================================
       MODAL
    ===================================================== */

    .smc-goal-modal-overlay {
      position:
        fixed;

      inset:
        0;

      z-index:
        12000;

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

    .smc-goal-modal-overlay.show {
      display:
        flex;
    }

    .smc-goal-modal {
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

      border-radius:
        20px;

      background:
        linear-gradient(
          145deg,
          #132630,
          #0d1b24
        );

      border:
        1px solid
        rgba(132,175,192,.20);

      color:
        #fff;
    }

    .smc-goal-modal-head,
    .smc-goal-modal-actions {
      display:
        flex;

      align-items:
        center;

      gap:
        10px;
    }

    .smc-goal-modal-head {
      justify-content:
        space-between;

      margin-bottom:
        18px;
    }

    .smc-goal-modal-head h2 {
      margin:
        0;
    }

    .smc-goal-close {
      width:
        40px;

      height:
        40px;

      border-radius:
        10px;

      border:
        1px solid
        rgba(132,175,192,.17);

      background:
        #172a35;

      color:
        #fff;

      font-size:
        20px;

      cursor:
        pointer;
    }

    .smc-goal-field {
      display:
        flex;

      flex-direction:
        column;

      gap:
        7px;

      margin-bottom:
        14px;
    }

    .smc-goal-field label {
      color:
        #aec1ca;

      font-size:
        13px;

      font-weight:
        750;
    }

    .smc-goal-field input,
    .smc-goal-field select,
    .smc-goal-field textarea {
      width:
        100%;

      box-sizing:
        border-box;

      min-height:
        46px;

      padding:
        11px 12px;

      border-radius:
        11px;

      border:
        1px solid
        rgba(132,175,192,.22);

      background:
        #081923;

      color:
        #fff;

      font:
        inherit;
    }

    .smc-goal-field textarea {
      min-height:
        88px;
    }

    .smc-goal-grid-2 {
      display:
        grid;

      grid-template-columns:
        1fr 1fr;

      gap:
        12px;
    }

    .smc-goal-modal-actions {
      justify-content:
        flex-end;

      flex-wrap:
        wrap;

      margin-top:
        19px;
    }

    .smc-goal-cancel,
    .smc-goal-save,
    .smc-goal-delete {
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

    .smc-goal-cancel {
      border:
        1px solid
        rgba(132,175,192,.17);

      background:
        #172a35;

      color:
        #d7e4e9;
    }

    .smc-goal-save {
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

    .smc-goal-delete {
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

    .smc-goal-message {
      display:
        none;

      margin-top:
        12px;

      padding:
        11px;

      border-radius:
        10px;

      font-size:
        12px;
    }

    .smc-goal-message.show {
      display:
        block;
    }

    .smc-goal-message.bad {
      color:
        #ff9a9d;

      background:
        rgba(126,41,47,.17);
    }

    /* =====================================================
       RESPONSIVE
    ===================================================== */

    @media(
      max-width:1250px
    ) {

      .smc-goals-summary {
        grid-template-columns:
          repeat(
            3,
            minmax(0,1fr)
          );
      }
    }

    @media(
      max-width:1100px
    ) {

      .smc-goals-summary {
        grid-template-columns:
          repeat(
            2,
            1fr
          );
      }

      .smc-goals-workspace {
        grid-template-columns:
          1fr;
      }

      .smc-goal-plan-panel {
        position:
          static;
      }

      .smc-goal-grid {
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

      .smc-goals-summary,
      .smc-goal-grid,
      .smc-goal-grid-2,
      .smc-goal-plan-summary,
      .smc-goal-pace-grid {
        grid-template-columns:
          1fr;
      }

      .smc-goal-actions {
        grid-template-columns:
          1fr;
      }

      .smc-goals-toolbar {
        align-items:
          flex-start;

        flex-direction:
          column;
      }

      .smc-goal-primary {
        width:
          100%;
      }

      .smc-goal-activity-row {
        align-items:
          flex-start;
      }
    }
  `;

  document.head
    .appendChild(
      style
    );

  /* =========================================================
     MODAL SHELL
  ========================================================= */

  const modal =
    document.createElement(
      "div"
    );

  modal.className =
    "smc-goal-modal-overlay";

  modal.innerHTML = `
    <div
      class="smc-goal-modal"
    >

      <div
        class="smc-goal-modal-head"
      >

        <h2
          id="smcGoalModalTitle"
        >
          Add Goal
        </h2>

        <button
          id="smcGoalClose"
          class="smc-goal-close"
          type="button"
        >
          ×
        </button>

      </div>

      <div
        id="smcGoalModalBody"
      ></div>

      <div
        id="smcGoalMessage"
        class="smc-goal-message"
      ></div>

    </div>
  `;

  document.body
    .appendChild(
      modal
    );

  const modalTitle =
    document.getElementById(
      "smcGoalModalTitle"
    );

  const modalBody =
    document.getElementById(
      "smcGoalModalBody"
    );

  const modalMessage =
    document.getElementById(
      "smcGoalMessage"
    );

  function openModal() {
    modal.classList
      .add(
        "show"
      );
  }

  function closeModal() {
    modal.classList
      .remove(
        "show"
      );

    editingGoalId =
      null;

    moneyGoal =
      null;

    moneyMode =
      null;

    clearMessage();
  }

  function clearMessage() {
    modalMessage.textContent =
      "";

    modalMessage.className =
      "smc-goal-message";
  }

  function message(
    text
  ) {
    modalMessage.textContent =
      text;

    modalMessage.className =
      "smc-goal-message show bad";
  }

  document
    .getElementById(
      "smcGoalClose"
    )
    .onclick =
      closeModal;

  modal.addEventListener(
    "click",
    event => {
      if (
        event.target ===
        modal
      ) {
        closeModal();
      }
    }
  );
    /* =========================================================
     PAGE BUILD
  ========================================================= */

  function page() {
    return document.getElementById(
      "smcGoalsPage"
    );
  }

  function buildPage() {
    const goalsPage =
      page();

    if (!goalsPage) {
      return false;
    }

    goalsPage.innerHTML = `
      <div class="smc-page-heading">
        <div>
          <h1>Goals</h1>
          <p>
            Build savings one step
            at a time.
          </p>
        </div>
      </div>

      <div class="smc-goals-shell">

        <div
          id="smcGoalsSignedOut"
          class="smc-goal-signed-out"
          style="display:none"
        >
          <h3>
            Sign in to use Goals
          </h3>

          <p>
            Your savings goals and
            sinking funds are stored
            with your account.
          </p>
        </div>

        <div id="smcGoalsApp">

          <div class="smc-goals-summary">

            <article
              class="smc-goal-summary-card"
            >
              <div
                class="smc-goal-summary-label"
              >
                Total Saved
              </div>

              <div
                id="smcGoalsTotalSaved"
                class="smc-goal-summary-value"
              >
                $0.00
              </div>

              <div
                class="smc-goal-summary-note"
              >
                Across all active goals
              </div>
            </article>

            <article
              class="smc-goal-summary-card"
            >
              <div
                class="smc-goal-summary-label"
              >
                Saved This Month
              </div>

              <div
                id="smcGoalsThisMonth"
                class="smc-goal-summary-value good"
              >
                $0.00
              </div>

              <div
                class="smc-goal-summary-note"
              >
                Net goal activity this month
              </div>
            </article>

            <article
              class="smc-goal-summary-card"
            >
              <div
                class="smc-goal-summary-label"
              >
                Total Goal Amount
              </div>

              <div
                id="smcGoalsTotalTarget"
                class="smc-goal-summary-value"
              >
                $0.00
              </div>

              <div
                class="smc-goal-summary-note"
              >
                Combined target amount
              </div>
            </article>

            <article
              class="smc-goal-summary-card"
            >
              <div
                class="smc-goal-summary-label"
              >
                Overall Progress
              </div>

              <div
                id="smcGoalsOverall"
                class="smc-goal-summary-value"
              >
                0%
              </div>

              <div
                class="smc-goal-summary-note"
              >
                Progress toward all goals
              </div>
            </article>

            <article
              class="smc-goal-summary-card"
            >
              <div
                class="smc-goal-summary-label"
              >
                Closest Goal
              </div>

              <div
                id="smcGoalsClosest"
                class="smc-goal-summary-value"
                style="font-size:20px"
              >
                None yet
              </div>

              <div
                id="smcGoalsClosestNote"
                class="smc-goal-summary-note"
              >
                Create your first goal
              </div>
            </article>

          </div>

          <div class="smc-goals-toolbar">

            <div>
              <h2>
                My Goals
              </h2>

              <p>
                Select a goal to see its
                paycheck plan, savings pace,
                and recent activity.
              </p>
            </div>

            <button
              id="smcAddGoal"
              class="smc-goal-primary"
              type="button"
            >
              + Add Goal
            </button>

          </div>

          <div class="smc-goals-workspace">

            <div
              id="smcGoalsGrid"
              class="smc-goal-grid"
            ></div>

            <aside
              id="smcGoalPlanPanel"
              class="smc-goal-plan-panel"
            ></aside>

          </div>

        </div>

      </div>
    `;

    document
      .getElementById(
        "smcAddGoal"
      )
      .onclick =
        () =>
          showGoalForm();

    return true;
  }

  function setText(
    id,
    value
  ) {
    const element =
      document.getElementById(
        id
      );

    if (element) {
      element.textContent =
        value;
    }
  }

  /* =========================================================
     SUMMARY
  ========================================================= */

  function renderSummary() {
    const totalSaved =
      goals.reduce(
        (
          total,
          goal
        ) =>
          total +
          money(
            goal.saved_amount
          ),
        0
      );

    const totalTarget =
      goals.reduce(
        (
          total,
          goal
        ) =>
          total +
          money(
            goal.target_amount
          ),
        0
      );

    const savedThisMonth =
      thisMonthSaved();

    setText(
      "smcGoalsTotalSaved",
      currency(
        totalSaved
      )
    );

    setText(
      "smcGoalsThisMonth",
      currency(
        savedThisMonth
      )
    );

    setText(
      "smcGoalsTotalTarget",
      currency(
        totalTarget
      )
    );

    setText(
      "smcGoalsOverall",
      `${
        Math.round(
          pct(
            totalSaved,
            totalTarget
          )
        )
      }%`
    );

    const unfinished =
      goals
        .map(
          goal => ({
            ...goal,

            remaining:
              money(
                goal.target_amount
              ) -
              money(
                goal.saved_amount
              )
          })
        )
        .filter(
          goal =>
            goal.remaining >
            0
        )
        .sort(
          (
            a,
            b
          ) =>
            a.remaining -
            b.remaining
        );

    if (
      unfinished.length
    ) {
      const closest =
        unfinished[0];

      setText(
        "smcGoalsClosest",
        closest.goal_name
      );

      setText(
        "smcGoalsClosestNote",
        `${
          currency(
            closest.remaining
          )
        } left to reach it`
      );

    } else if (
      goals.length
    ) {
      setText(
        "smcGoalsClosest",
        "All Complete 🎉"
      );

      setText(
        "smcGoalsClosestNote",
        "You reached every current goal."
      );

    } else {
      setText(
        "smcGoalsClosest",
        "None yet"
      );

      setText(
        "smcGoalsClosestNote",
        "Create your first goal"
      );
    }
  }

  /* =========================================================
     ACTIVITY HELPERS
  ========================================================= */

  function formatActivityDate(
    value
  ) {
    if (!value) {
      return "";
    }

    const date =
      new Date(
        value
      );

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "";
    }

    return date
      .toLocaleDateString(
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

  function selectedTransactions() {
    return goalTransactions
      .filter(
        transaction =>
          Number(
            transaction.goal_id
          ) ===
          Number(
            selectedGoalId
          )
      )
      .sort(
        (
          a,
          b
        ) =>
          new Date(
            b.created_at
          ) -
          new Date(
            a.created_at
          )
      );
  }

  function renderActivity() {
    const transactions =
      selectedTransactions();

    if (
      !transactions.length
    ) {
      return `
        <div
          class="smc-goal-activity"
        >

          <div
            class="smc-goal-activity-head"
          >
            <div
              class="smc-goal-activity-title"
            >
              Recent Activity
            </div>

            <div
              class="smc-goal-activity-count"
            >
              No activity yet
            </div>
          </div>

          <div
            class="smc-goal-activity-empty"
          >
            Money you add or withdraw
            from this goal will appear here.
          </div>

        </div>
      `;
    }

    const latest =
      transactions.slice(
        0,
        8
      );

    const rows =
      latest
        .map(
          transaction => {
            const isDeposit =
              transaction
                .transaction_type ===
              "deposit";

            return `
              <div
                class="smc-goal-activity-row"
              >

                <div
                  class="smc-goal-activity-left"
                >

                  <div
                    class="
                      smc-goal-activity-icon
                      ${
                        isDeposit
                          ? "deposit"
                          : "withdrawal"
                      }
                    "
                  >
                    ${
                      isDeposit
                        ? "+"
                        : "−"
                    }
                  </div>

                  <div>

                    <div
                      class="smc-goal-activity-type"
                    >
                      ${
                        isDeposit
                          ? "Added to goal"
                          : "Withdrawn from goal"
                      }
                    </div>

                    <div
                      class="smc-goal-activity-date"
                    >
                      ${esc(
                        formatActivityDate(
                          transaction.created_at
                        )
                      )}
                    </div>

                  </div>

                </div>

                <div>

                  <div
                    class="
                      smc-goal-activity-amount
                      ${
                        isDeposit
                          ? "deposit"
                          : "withdrawal"
                      }
                    "
                  >
                    ${
                      isDeposit
                        ? "+"
                        : "−"
                    }${currency(
                      transaction.amount
                    )}
                  </div>

                  ${
                    transaction.note
                      ? `
                        <div
                          class="smc-goal-activity-note"
                        >
                          ${esc(
                            transaction.note
                          )}
                        </div>
                      `
                      : ""
                  }

                </div>

              </div>
            `;
          }
        )
        .join("");

    return `
      <div
        class="smc-goal-activity"
      >

        <div
          class="smc-goal-activity-head"
        >
          <div
            class="smc-goal-activity-title"
          >
            Recent Activity
          </div>

          <div
            class="smc-goal-activity-count"
          >
            ${
              transactions.length
            }
            ${
              transactions.length ===
              1
                ? "entry"
                : "entries"
            }
          </div>
        </div>

        <div
          class="smc-goal-activity-list"
        >
          ${rows}
        </div>

      </div>
    `;
  }

  /* =========================================================
     SAVINGS PACE DISPLAY
  ========================================================= */

  function renderSavingsPace(
    goal
  ) {
    const pace =
      savingsPace(
        goal
      );

    const estimated =
      pace.projectedDate
        ? formatMonthYear(
            pace.projectedDate
          )
        : pace.status ===
            "Goal Reached"
          ? "Complete"
          : "Not enough data";

    const average =
      pace.averageMonthly ===
        null ||
      pace.averageMonthly ===
        undefined
        ? "Learning"
        : currency(
            pace.averageMonthly
          );

    return `
      <div
        class="smc-goal-pace"
      >

        <div
          class="smc-goal-pace-head"
        >

          <div
            class="smc-goal-pace-title"
          >
            Savings Pace
          </div>

          <div
            class="
              smc-goal-pace-chip
              ${pace.cls}
            "
          >
            ${esc(
              pace.status
            )}
          </div>

        </div>

        <div
          class="smc-goal-pace-grid"
        >

          <div
            class="smc-goal-pace-stat"
          >
            <small>
              This Month
            </small>

            <strong>
              ${currency(
                pace.monthSaved
              )}
            </strong>
          </div>

          <div
            class="smc-goal-pace-stat"
          >
            <small>
              Avg. Monthly
            </small>

            <strong>
              ${esc(
                average
              )}
            </strong>
          </div>

          <div
            class="smc-goal-pace-stat"
          >
            <small>
              Est. Goal Date
            </small>

            <strong>
              ${esc(
                estimated
              )}
            </strong>
          </div>

        </div>

        <div
          class="
            smc-goal-pace-message
            ${
              pace.cls ===
              "attention"
                ? "attention"
                : ""
            }
          "
        >
          ${esc(
            pace.message
          )}
        </div>

      </div>
    `;
  }

  /* =========================================================
     RIGHT-SIDE GOAL PLAN PANEL
  ========================================================= */

  function renderPlanPanel() {
    const panel =
      document.getElementById(
        "smcGoalPlanPanel"
      );

    if (!panel) {
      return;
    }

    const goal =
      goals.find(
        item =>
          Number(
            item.id
          ) ===
          Number(
            selectedGoalId
          )
      );

    if (!goal) {
      panel.innerHTML = `
        <div
          class="smc-plan-empty"
        >

          <div>

            <div
              style="font-size:34px"
            >
              🧭
            </div>

            <h3>
              Your Goal Plan
            </h3>

            <p>
              Select a goal on the left.
              Stretch My Check will turn
              it into a paycheck-by-paycheck
              savings path and track your
              actual savings pace.
            </p>

          </div>

        </div>
      `;

      return;
    }

    const plan =
      goalPlan(
        goal
      );

    const remaining =
      Math.max(
        money(
          goal.target_amount
        ) -
        money(
          goal.saved_amount
        ),
        0
      );

    const days =
      daysUntil(
        goal.target_date
      );

    const paycheckRows =
      plan.rows.length
        ? plan.rows
            .map(
              row => `
                <div
                  class="smc-goal-plan-row"
                >

                  <div>

                    <div
                      class="smc-plan-date"
                    >
                      ${esc(
                        formatDate(
                          row.dateValue
                        )
                      )}
                    </div>

                    <div
                      class="smc-plan-name"
                    >
                      ${esc(
                        row.name
                      )}
                    </div>

                  </div>

                  <div>

                    <div
                      class="${
                        row.skip
                          ? "smc-plan-amount smc-plan-skip"
                          : "smc-plan-amount"
                      }"
                    >
                      ${
                        row.skip
                          ? "Skip this check"
                          : `Save ${
                              currency(
                                row.contribution
                              )
                            }`
                      }
                    </div>

                    ${
                      row.safe ===
                        null ||
                      row.safe ===
                        undefined
                        ? ""
                        : `
                          <div
                            class="smc-plan-safe"
                          >
                            Safe room:
                            ${currency(
                              row.safe
                            )}
                          </div>
                        `
                    }

                  </div>

                </div>
              `
            )
            .join("")
        : `
          <div
            class="smc-goal-plan-note"
          >
            ${esc(
              plan.detail
            )}
          </div>
        `;

    panel.innerHTML = `
      <div
        class="smc-goal-plan-top"
      >

        <div>

          <div
            class="smc-goal-plan-kicker"
          >
            Your Path to
            ${currency(
              goal.target_amount
            )}
          </div>

          <div
            class="smc-goal-plan-title"
          >
            ${esc(
              goal.goal_name
            )}
          </div>

          <div
            class="smc-goal-plan-sub"
          >
            ${esc(
              formatDate(
                goal.target_date
              )
            )}

            ${
              days === null
                ? ""
                : days >= 0
                  ? ` • ${days} days away`
                  : " • target date passed"
            }
          </div>

        </div>

        <div
          class="smc-goal-icon"
        >
          ${esc(
            icon(
              goal
            )
          )}
        </div>

      </div>

      <span
        class="
          smc-plan-chip
          ${
            plan.cls ===
            "attention"
              ? "warn"
              : "good"
          }
        "
      >
        ${esc(
          plan.status
        )}
      </span>

      <div
        class="smc-goal-plan-summary"
      >

        <div
          class="smc-goal-plan-stat"
        >
          <small>
            Saved
          </small>

          <strong>
            ${currency(
              goal.saved_amount
            )}
          </strong>
        </div>

        <div
          class="smc-goal-plan-stat"
        >
          <small>
            Still Needed
          </small>

          <strong>
            ${currency(
              remaining
            )}
          </strong>
        </div>

        <div
          class="smc-goal-plan-stat"
        >
          <small>
            Planned
          </small>

          <strong>
            ${currency(
              plan.totalPlanned
            )}
          </strong>
        </div>

      </div>

      <div
        style="
          color:#fff;
          font-weight:800;
          font-size:14px;
          margin-bottom:10px;
        "
      >
        Paycheck Plan
      </div>

      <div
        class="smc-goal-plan-list"
      >
        ${paycheckRows}
      </div>

      <div
        class="smc-goal-plan-note"
      >
        ${esc(
          plan.detail
        )}

        ${
          plan.shortfall > 0 &&
          plan.rows.length
            ? `
              <br><br>

              <strong
                style="color:#ffb071"
              >
                ${currency(
                  plan.shortfall
                )}
                is not currently covered
                by safe spending room.
              </strong>
            `
            : ""
        }
      </div>

      ${renderSavingsPace(
        goal
      )}

      ${renderActivity()}
    `;
  }

  /* =========================================================
     GOAL CARDS
  ========================================================= */

  function renderGoals() {
    renderSummary();

    const grid =
      document.getElementById(
        "smcGoalsGrid"
      );

    if (!grid) {
      return;
    }

    if (
      !goals.length
    ) {
      selectedGoalId =
        null;

      grid.innerHTML = `
        <div
          class="smc-goal-empty"
        >

          <div
            style="font-size:34px"
          >
            🎯
          </div>

          <h3
            style="color:#fff"
          >
            Start with one goal
          </h3>

          <p>
            Create a savings goal
            or sinking fund to begin.
          </p>

          <button
            id="smcEmptyAddGoal"
            class="smc-goal-primary"
            type="button"
          >
            + Add Your First Goal
          </button>

        </div>
      `;

      document
        .getElementById(
          "smcEmptyAddGoal"
        )
        .onclick =
          () =>
            showGoalForm();

      renderPlanPanel();

      return;
    }

    const selectedStillExists =
      goals.some(
        goal =>
          Number(
            goal.id
          ) ===
          Number(
            selectedGoalId
          )
      );

    if (
      !selectedStillExists
    ) {
      selectedGoalId =
        goals[0].id;
    }

    grid.innerHTML =
      goals
        .map(
          goal => {
            const saved =
              money(
                goal.saved_amount
              );

            const target =
              money(
                goal.target_amount
              );

            const progress =
              pct(
                saved,
                target
              );

            const remaining =
              Math.max(
                target -
                  saved,
                0
              );

            const plan =
              goalPlan(
                goal
              );

            const pace =
              savingsPace(
                goal
              );

            const selected =
              Number(
                goal.id
              ) ===
              Number(
                selectedGoalId
              );

            const days =
              daysUntil(
                goal.target_date
              );

            const dateText =
              `${
                formatDate(
                  goal.target_date
                )
              }${
                days === null
                  ? ""
                  : days > 0
                    ? ` • ${days} days away`
                    : days === 0
                      ? " • Today"
                      : " • Target date passed"
              }`;

            return `
              <article
                class="
                  smc-goal-card
                  ${
                    selected
                      ? "selected"
                      : ""
                  }
                "
                data-select-goal="${
                  goal.id
                }"
              >

                <div
                  class="smc-goal-top"
                >

                  <div
                    class="smc-goal-icon"
                  >
                    ${esc(
                      icon(
                        goal
                      )
                    )}
                  </div>

                  <div
                    class="smc-goal-type"
                  >
                    ${
                      goal.goal_type ===
                      "sinking"
                        ? "Sinking Fund"
                        : "Savings Goal"
                    }
                  </div>

                </div>

                <div
                  class="smc-goal-name"
                >
                  ${esc(
                    goal.goal_name
                  )}
                </div>

                <div
                  class="smc-goal-date"
                >
                  ${esc(
                    dateText
                  )}
                </div>

                <div
                  class="smc-goal-money-row"
                >

                  <div>

                    <div
                      class="smc-goal-saved"
                    >
                      ${currency(
                        saved
                      )}
                    </div>

                    <div
                      style="
                        color:#7f98a4;
                        font-size:10px;
                      "
                    >
                      saved
                    </div>

                  </div>

                  <div
                    class="smc-goal-target"
                  >
                    of
                    ${currency(
                      target
                    )}
                  </div>

                </div>

                <div
                  class="smc-goal-progress-track"
                >
                  <div
                    class="smc-goal-progress-fill"
                    style="
                      width:${progress}%;
                    "
                  ></div>
                </div>

                <div
                  class="smc-goal-progress-line"
                >
                  <span>
                    ${Math.round(
                      progress
                    )}%
                  </span>

                  <span>
                    ${
                      remaining <= 0
                        ? "Goal reached 🎉"
                        : `${
                            currency(
                              remaining
                            )
                          } left`
                    }
                  </span>
                </div>

                <div
                  class="smc-goal-guidance"
                >

                  <div
                    class="smc-goal-guidance-head"
                  >
                    <div
                      class="smc-goal-guidance-title"
                    >
                      Smart Savings Guidance
                    </div>

                    <div
                      class="
                        smc-goal-status
                        ${plan.cls}
                      "
                    >
                      ${esc(
                        plan.status
                      )}
                    </div>
                  </div>

                  <div
                    class="smc-goal-guidance-main"
                  >
                    ${esc(
                      plan.headline
                    )}
                  </div>

                  <div
                    class="smc-goal-guidance-detail"
                  >
                    ${esc(
                      plan.detail
                    )}
                  </div>

                </div>

                <div
                  class="smc-goal-guidance"
                >

                  <div
                    class="smc-goal-guidance-head"
                  >
                    <div
                      class="smc-goal-guidance-title"
                    >
                      Savings Pace
                    </div>

                    <div
                      class="
                        smc-goal-status
                        ${pace.cls}
                      "
                    >
                      ${esc(
                        pace.status
                      )}
                    </div>
                  </div>

                  <div
                    class="smc-goal-guidance-main"
                  >
                    ${
                      pace.projectedDate
                        ? esc(
                            formatMonthYear(
                              pace.projectedDate
                            )
                          )
                        : pace.status ===
                            "Goal Reached"
                          ? "Complete"
                          : "Still learning your pace"
                    }
                  </div>

                  <div
                    class="smc-goal-guidance-detail"
                  >
                    ${esc(
                      pace.message
                    )}
                  </div>

                </div>

                ${
                  goal.notes
                    ? `
                      <div
                        style="
                          color:#8da3ae;
                          font-size:11px;
                          margin-top:12px;
                        "
                      >
                        ${esc(
                          goal.notes
                        )}
                      </div>
                    `
                    : ""
                }

                <div
                  class="smc-goal-actions"
                >

                  <button
                    class="
                      smc-goal-action
                      add
                    "
                    data-add="${
                      goal.id
                    }"
                    type="button"
                  >
                    + Add Money
                  </button>

                  <button
                    class="
                      smc-goal-action
                      withdraw
                    "
                    data-withdraw="${
                      goal.id
                    }"
                    type="button"
                  >
                    − Withdraw
                  </button>

                  <button
                    class="smc-goal-action"
                    data-manage="${
                      goal.id
                    }"
                    type="button"
                  >
                    Manage
                  </button>

                </div>

              </article>
            `;
          }
        )
        .join("");

    grid
      .querySelectorAll(
        "[data-select-goal]"
      )
      .forEach(
        card => {
          card.addEventListener(
            "click",
            event => {
              if (
                event.target.closest(
                  "button"
                )
              ) {
                return;
              }

              selectedGoalId =
                Number(
                  card.dataset
                    .selectGoal
                );

              renderGoals();
            }
          );
        }
      );

    grid
      .querySelectorAll(
        "[data-add]"
      )
      .forEach(
        button => {
          button.onclick =
            () =>
              showMoneyChange(
                goals.find(
                  goal =>
                    Number(
                      goal.id
                    ) ===
                    Number(
                      button.dataset
                        .add
                    )
                ),
                "add"
              );
        }
      );

    grid
      .querySelectorAll(
        "[data-withdraw]"
      )
      .forEach(
        button => {
          button.onclick =
            () =>
              showMoneyChange(
                goals.find(
                  goal =>
                    Number(
                      goal.id
                    ) ===
                    Number(
                      button.dataset
                        .withdraw
                    )
                ),
                "withdraw"
              );
        }
      );

    grid
      .querySelectorAll(
        "[data-manage]"
      )
      .forEach(
        button => {
          button.onclick =
            () =>
              showGoalForm(
                goals.find(
                  goal =>
                    Number(
                      goal.id
                    ) ===
                    Number(
                      button.dataset
                        .manage
                    )
                )
              );
        }
      );

    renderPlanPanel();
  }
    /* =========================================================
     LOAD GOALS + TRANSACTIONS
  ========================================================= */

  async function loadGoals() {
    const currentUser =
      await user();

    const signedOut =
      document.getElementById(
        "smcGoalsSignedOut"
      );

    const app =
      document.getElementById(
        "smcGoalsApp"
      );

    if (!currentUser) {
      goals = [];
      goalTransactions = [];

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

    const [
      goalsResponse,
      transactionsResponse
    ] =
      await Promise.all([
        sb
          .from(
            "financial_goals"
          )
          .select("*")
          .eq(
            "user_id",
            currentUser.id
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
            "goal_transactions"
          )
          .select("*")
          .eq(
            "user_id",
            currentUser.id
          )
          .order(
            "created_at",
            {
              ascending:
                false
            }
          )
      ]);

    if (
      goalsResponse.error
    ) {
      console.error(
        goalsResponse.error
      );

      goals = [];
    } else {
      goals =
        goalsResponse.data ||
        [];
    }

    if (
      transactionsResponse.error
    ) {
      console.error(
        transactionsResponse.error
      );

      goalTransactions =
        [];
    } else {
      goalTransactions =
        transactionsResponse.data ||
        [];
    }

    renderGoals();
  }

  /* =========================================================
     ADD / EDIT GOAL
  ========================================================= */

  function showGoalForm(
    goal = null
  ) {
    const existing =
      Boolean(
        goal?.id
      );

    editingGoalId =
      existing
        ? goal.id
        : null;

    moneyGoal =
      null;

    moneyMode =
      null;

    modalTitle.textContent =
      existing
        ? "Manage Goal"
        : "Add Goal";

    modalBody.innerHTML = `
      <div
        class="smc-goal-field"
      >
        <label>
          Goal name
        </label>

        <input
          id="smcGoalName"
          maxlength="80"
          placeholder="Emergency Fund"
        >
      </div>

      <div
        class="smc-goal-grid-2"
      >

        <div
          class="smc-goal-field"
        >
          <label>
            Goal type
          </label>

          <select
            id="smcGoalType"
          >
            <option
              value="savings"
            >
              Savings Goal
            </option>

            <option
              value="sinking"
            >
              Sinking Fund
            </option>
          </select>
        </div>

        <div
          class="smc-goal-field"
        >
          <label>
            Icon
          </label>

          <select
            id="smcGoalIcon"
          >
            <option value="🎯">
              🎯 Goal
            </option>

            <option value="💰">
              💰 Savings
            </option>

            <option value="🚗">
              🚗 Car
            </option>

            <option value="🏠">
              🏠 Home
            </option>

            <option value="✈️">
              ✈️ Travel
            </option>

            <option value="🎂">
              🎂 Birthday
            </option>

            <option value="🎄">
              🎄 Holidays
            </option>

            <option value="🧯">
              🧯 Emergency
            </option>

            <option value="🎓">
              🎓 School
            </option>

            <option value="💻">
              💻 Technology
            </option>

            <option value="💳">
              💳 Debt
            </option>

            <option value="✨">
              ✨ Something Else
            </option>
          </select>
        </div>

      </div>

      <div
        class="smc-goal-grid-2"
      >

        <div
          class="smc-goal-field"
        >
          <label>
            Target amount
          </label>

          <input
            id="smcGoalTarget"
            type="number"
            min="0"
            step="0.01"
          >
        </div>

        <div
          class="smc-goal-field"
        >
          <label>
            Already saved
          </label>

          <input
            id="smcGoalSaved"
            type="number"
            min="0"
            step="0.01"
          >
        </div>

      </div>

      <div
        class="smc-goal-field"
      >
        <label>
          Target date
          <span
            style="
              color:#718a96;
              font-weight:500;
            "
          >
            (optional)
          </span>
        </label>

        <input
          id="smcGoalDate"
          type="date"
        >
      </div>

      <div
        class="smc-goal-field"
      >
        <label>
          Notes
          <span
            style="
              color:#718a96;
              font-weight:500;
            "
          >
            (optional)
          </span>
        </label>

        <textarea
          id="smcGoalNotes"
          maxlength="300"
          placeholder="What is this money for?"
        ></textarea>
      </div>

      <div
        class="smc-goal-modal-actions"
      >

        ${
          existing
            ? `
              <button
                id="smcDeleteGoal"
                class="smc-goal-delete"
                type="button"
              >
                Delete Goal
              </button>
            `
            : ""
        }

        <button
          id="smcCancelGoal"
          class="smc-goal-cancel"
          type="button"
        >
          Cancel
        </button>

        <button
          id="smcSaveGoal"
          class="smc-goal-save"
          type="button"
        >
          ${
            existing
              ? "Save Changes"
              : "Create Goal"
          }
        </button>

      </div>
    `;

    if (
      existing
    ) {
      document
        .getElementById(
          "smcGoalName"
        )
        .value =
          goal.goal_name ||
          "";

      document
        .getElementById(
          "smcGoalType"
        )
        .value =
          goal.goal_type ||
          "savings";

      const iconSelect =
        document.getElementById(
          "smcGoalIcon"
        );

      const currentIcon =
        icon(
          goal
        );

      if (
        [
          ...iconSelect.options
        ].some(
          option =>
            option.value ===
            currentIcon
        )
      ) {
        iconSelect.value =
          currentIcon;
      }

      document
        .getElementById(
          "smcGoalTarget"
        )
        .value =
          money(
            goal.target_amount
          );

      document
        .getElementById(
          "smcGoalSaved"
        )
        .value =
          money(
            goal.saved_amount
          );

      document
        .getElementById(
          "smcGoalDate"
        )
        .value =
          goal.target_date ||
          "";

      document
        .getElementById(
          "smcGoalNotes"
        )
        .value =
          goal.notes ||
          "";
    }

    document
      .getElementById(
        "smcCancelGoal"
      )
      .onclick =
        closeModal;

    document
      .getElementById(
        "smcSaveGoal"
      )
      .onclick =
        saveGoal;

    document
      .getElementById(
        "smcDeleteGoal"
      )
      ?.addEventListener(
        "click",
        deleteGoal
      );

    clearMessage();

    openModal();
  }

  /* =========================================================
     TRANSACTION RECORD HELPER
  ========================================================= */

  async function recordTransaction({
    userId,
    goalId,
    type,
    amount,
    note = null
  }) {
    if (
      !userId ||
      !goalId ||
      amount <= 0
    ) {
      return {
        error:
          new Error(
            "Invalid transaction data."
          )
      };
    }

    return await sb
      .from(
        "goal_transactions"
      )
      .insert({
        user_id:
          userId,

        goal_id:
          goalId,

        transaction_type:
          type,

        amount:
          amount,

        note:
          note ||
          null
      });
  }

  /* =========================================================
     SAVE GOAL
  ========================================================= */

  async function saveGoal() {
    clearMessage();

    const currentUser =
      await user();

    if (!currentUser) {
      message(
        "Sign in before saving a goal."
      );

      return;
    }

    const name =
      document
        .getElementById(
          "smcGoalName"
        )
        .value
        .trim();

    const target =
      money(
        document
          .getElementById(
            "smcGoalTarget"
          )
          .value
      );

    const saved =
      money(
        document
          .getElementById(
            "smcGoalSaved"
          )
          .value
      );

    if (!name) {
      message(
        "Give this goal a name."
      );

      return;
    }

    if (
      target <= 0
    ) {
      message(
        "Enter a target amount greater than $0."
      );

      return;
    }

    if (
      saved < 0
    ) {
      message(
        "Saved amount cannot be negative."
      );

      return;
    }

    const payload = {
      user_id:
        currentUser.id,

      goal_name:
        name,

      goal_type:
        document
          .getElementById(
            "smcGoalType"
          )
          .value,

      target_amount:
        target,

      saved_amount:
        saved,

      target_date:
        document
          .getElementById(
            "smcGoalDate"
          )
          .value ||
        null,

      icon:
        document
          .getElementById(
            "smcGoalIcon"
          )
          .value,

      notes:
        document
          .getElementById(
            "smcGoalNotes"
          )
          .value
          .trim() ||
        null,

      updated_at:
        new Date()
          .toISOString()
    };

    /* =====================================================
       EDIT EXISTING GOAL
    ===================================================== */

    if (
      editingGoalId
    ) {
      const existingGoal =
        goals.find(
          item =>
            Number(
              item.id
            ) ===
            Number(
              editingGoalId
            )
        );

      const previousSaved =
        money(
          existingGoal
            ?.saved_amount
        );

      const difference =
        saved -
        previousSaved;

      const updateResponse =
        await sb
          .from(
            "financial_goals"
          )
          .update(
            payload
          )
          .eq(
            "id",
            editingGoalId
          )
          .eq(
            "user_id",
            currentUser.id
          )
          .select("id");

      if (
        updateResponse.error
      ) {
        console.error(
          updateResponse.error
        );

        message(
          updateResponse.error
            .message ||
          "Could not save this goal."
        );

        return;
      }

      if (
        Math.abs(
          difference
        ) >=
        0.005
      ) {
        const transactionResponse =
          await recordTransaction({
            userId:
              currentUser.id,

            goalId:
              editingGoalId,

            type:
              difference > 0
                ? "deposit"
                : "withdrawal",

            amount:
              Math.abs(
                difference
              ),

            note:
              "Balance adjustment"
          });

        if (
          transactionResponse.error
        ) {
          console.error(
            transactionResponse.error
          );

          /*
            Restore the original saved
            amount if history recording fails.
          */

          await sb
            .from(
              "financial_goals"
            )
            .update({
              saved_amount:
                previousSaved,

              updated_at:
                new Date()
                  .toISOString()
            })
            .eq(
              "id",
              editingGoalId
            )
            .eq(
              "user_id",
              currentUser.id
            );

          message(
            "The balance adjustment could not be recorded, so the saved amount was restored."
          );

          return;
        }
      }

      selectedGoalId =
        editingGoalId;

      await loadGoals();

      closeModal();

      return;
    }

    /* =====================================================
       CREATE NEW GOAL
    ===================================================== */

    const createResponse =
      await sb
        .from(
          "financial_goals"
        )
        .insert(
          payload
        )
        .select("*")
        .single();

    if (
      createResponse.error
    ) {
      console.error(
        createResponse.error
      );

      message(
        createResponse.error
          .message ||
        "Could not create this goal."
      );

      return;
    }

    const newGoal =
      createResponse.data;

    if (
      saved >=
      0.005
    ) {
      const transactionResponse =
        await recordTransaction({
          userId:
            currentUser.id,

          goalId:
            newGoal.id,

          type:
            "deposit",

          amount:
            saved,

          note:
            "Starting balance"
        });

      if (
        transactionResponse.error
      ) {
        console.error(
          transactionResponse.error
        );

        /*
          Remove the new goal if its
          starting history cannot be recorded.
        */

        await sb
          .from(
            "financial_goals"
          )
          .delete()
          .eq(
            "id",
            newGoal.id
          )
          .eq(
            "user_id",
            currentUser.id
          );

        message(
          "The starting balance could not be recorded, so the goal was not created."
        );

        return;
      }
    }

    selectedGoalId =
      newGoal.id;

    await loadGoals();

    closeModal();
  }

  /* =========================================================
     ADD / WITHDRAW MONEY MODAL
  ========================================================= */

  function showMoneyChange(
    goal,
    mode
  ) {
    if (!goal) {
      return;
    }

    moneyGoal =
      goal;

    moneyMode =
      mode;

    editingGoalId =
      null;

    const isWithdraw =
      mode ===
      "withdraw";

    modalTitle.textContent =
      isWithdraw
        ? "Withdraw Money"
        : "Add Money";

    modalBody.innerHTML = `
      <div
        style="
          padding:15px;
          border-radius:14px;
          background:#10232d;
          border:
            1px solid
            rgba(132,175,192,.14);
          margin-bottom:16px;
        "
      >

        <div
          style="
            color:#8da5b0;
            font-size:11px;
          "
        >
          ${
            isWithdraw
              ? "Withdrawing from"
              : "Adding money to"
          }
        </div>

        <div
          style="
            color:#fff;
            font-size:20px;
            font-weight:800;
            margin-top:4px;
          "
        >
          ${esc(
            goal.goal_name
          )}
        </div>

        <div
          style="
            color:#8da5b0;
            font-size:11px;
            margin-top:7px;
          "
        >
          Currently saved:
          ${currency(
            goal.saved_amount
          )}
          of
          ${currency(
            goal.target_amount
          )}
        </div>

      </div>

      <div
        class="smc-goal-field"
      >
        <label>
          ${
            isWithdraw
              ? "Amount to withdraw"
              : "Amount to add"
          }
        </label>

        <input
          id="smcGoalMoneyAmount"
          type="number"
          min="0.01"
          step="0.01"
          placeholder="50"
        >
      </div>

      <div
        class="smc-goal-field"
      >
        <label>
          Note
          <span
            style="
              color:#718a96;
              font-weight:500;
            "
          >
            (optional)
          </span>
        </label>

        <input
          id="smcGoalMoneyNote"
          maxlength="120"
          placeholder="${
            isWithdraw
              ? "What was the money used for?"
              : "Where did this money come from?"
          }"
        >
      </div>

      <div
        class="smc-goal-modal-actions"
      >

        <button
          id="smcCancelMoney"
          class="smc-goal-cancel"
          type="button"
        >
          Cancel
        </button>

        <button
          id="smcSaveMoney"
          class="smc-goal-save"
          type="button"
        >
          ${
            isWithdraw
              ? "Withdraw Money"
              : "Add Money"
          }
        </button>

      </div>
    `;

    document
      .getElementById(
        "smcCancelMoney"
      )
      .onclick =
        closeModal;

    document
      .getElementById(
        "smcSaveMoney"
      )
      .onclick =
        applyMoneyChange;

    clearMessage();

    openModal();
  }

  /* =========================================================
     APPLY MONEY CHANGE + HISTORY
  ========================================================= */

  async function applyMoneyChange() {
    clearMessage();

    const currentUser =
      await user();

    if (
      !currentUser ||
      !moneyGoal
    ) {
      return;
    }

    const amount =
      money(
        document
          .getElementById(
            "smcGoalMoneyAmount"
          )
          .value
      );

    const note =
      document
        .getElementById(
          "smcGoalMoneyNote"
        )
        .value
        .trim();

    if (
      amount <= 0
    ) {
      message(
        "Enter an amount greater than $0."
      );

      return;
    }

    const currentSaved =
      money(
        moneyGoal
          .saved_amount
      );

    if (
      moneyMode ===
        "withdraw" &&
      amount >
        currentSaved
    ) {
      message(
        `You only have ${
          currency(
            currentSaved
          )
        } saved in this goal.`
      );

      return;
    }

    const newSaved =
      moneyMode ===
        "withdraw"
        ? currentSaved -
          amount
        : currentSaved +
          amount;

    const transactionType =
      moneyMode ===
        "withdraw"
        ? "withdrawal"
        : "deposit";

    const goalId =
      moneyGoal.id;

    const updateResponse =
      await sb
        .from(
          "financial_goals"
        )
        .update({
          saved_amount:
            newSaved,

          updated_at:
            new Date()
              .toISOString()
        })
        .eq(
          "id",
          goalId
        )
        .eq(
          "user_id",
          currentUser.id
        )
        .select("id");

    if (
      updateResponse.error
    ) {
      console.error(
        updateResponse.error
      );

      message(
        updateResponse.error
          .message ||
        "Could not update this goal."
      );

      return;
    }

    const transactionResponse =
      await recordTransaction({
        userId:
          currentUser.id,

        goalId,

        type:
          transactionType,

        amount,

        note:
          note ||
          null
      });

    if (
      transactionResponse.error
    ) {
      console.error(
        transactionResponse.error
      );

      const rollbackResponse =
        await sb
          .from(
            "financial_goals"
          )
          .update({
            saved_amount:
              currentSaved,

            updated_at:
              new Date()
                .toISOString()
          })
          .eq(
            "id",
            goalId
          )
          .eq(
            "user_id",
            currentUser.id
          );

      if (
        rollbackResponse.error
      ) {
        console.error(
          "Goal balance rollback failed:",
          rollbackResponse.error
        );
      }

      message(
        "The transaction could not be saved, so your goal balance was not changed."
      );

      return;
    }

    selectedGoalId =
      goalId;

    await loadGoals();

    closeModal();
  }

  /* =========================================================
     DELETE GOAL
  ========================================================= */

  async function deleteGoal() {
    if (
      !editingGoalId
    ) {
      return;
    }

    const goal =
      goals.find(
        item =>
          Number(
            item.id
          ) ===
          Number(
            editingGoalId
          )
      );

    const confirmed =
      window.confirm(
        `Delete "${
          goal?.goal_name ||
          "this goal"
        }"? This will also delete its activity history. This cannot be undone.`
      );

    if (!confirmed) {
      return;
    }

    const currentUser =
      await user();

    if (!currentUser) {
      return;
    }

    const {
      error
    } =
      await sb
        .from(
          "financial_goals"
        )
        .delete()
        .eq(
          "id",
          editingGoalId
        )
        .eq(
          "user_id",
          currentUser.id
        );

    if (error) {
      console.error(
        error
      );

      message(
        error.message ||
          "Could not delete this goal."
      );

      return;
    }

    if (
      Number(
        selectedGoalId
      ) ===
      Number(
        editingGoalId
      )
    ) {
      selectedGoalId =
        null;
    }

    closeModal();

    await loadGoals();
  }

  /* =========================================================
     REFRESH WHEN PLANNER CHANGES
  ========================================================= */

  function refreshSoon() {
    window.setTimeout(
      () => {
        if (
          goals.length
        ) {
          renderGoals();
        }
      },
      120
    );
  }

  window.addEventListener(
    "stretchmycheck:plan-loaded",
    refreshSoon
  );

  document.addEventListener(
    "change",
    event => {
      if (
        event.target.matches(
          ".paycheck-date, .paycheck-amount, .paycheck-name"
        )
      ) {
        refreshSoon();
      }
    }
  );

  /* =========================================================
     STARTUP
  ========================================================= */

  function init() {
    if (
      !buildPage()
    ) {
      window.setTimeout(
        init,
        250
      );

      return;
    }

    loadGoals();
  }

  sb.auth
    .onAuthStateChange(
      () => {
        window.setTimeout(
          () => {
            if (
              page()
            ) {
              loadGoals();
            }
          },
          200
        );
      }
    );

  window.StretchMyCheckGoals = {
    refresh:
      loadGoals,

    openAddGoal:
      () =>
        showGoalForm()
  };

  window.setTimeout(
    init,
    350
  );

})();