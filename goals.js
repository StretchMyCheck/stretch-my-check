(() => {
  "use strict";

  /* =========================================================
     STRETCH MY CHECK
     GOALS & SINKING FUNDS
     Smart guidance + add/withdraw money
  ========================================================= */

  const supabaseClient =
    window.supabaseClient;

  if (!supabaseClient) {
    console.error(
      "Stretch My Check Goals: Supabase client is not available."
    );
    return;
  }

  let goals = [];

  let editingGoalId =
    null;

  let activeMoneyGoal =
    null;

  let activeMoneyMode =
    null;

  /* =========================================================
     HELPERS
  ========================================================= */

  function money(value) {
    const number =
      parseFloat(value);

    return Number.isFinite(number)
      ? number
      : 0;
  }

  function currency(value) {
    return new Intl.NumberFormat(
      "en-US",
      {
        style: "currency",
        currency: "USD"
      }
    ).format(
      Number.isFinite(
        Number(value)
      )
        ? Number(value)
        : 0
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

  function percent(
    saved,
    target
  ) {
    if (target <= 0) {
      return 0;
    }

    return Math.max(
      0,
      Math.min(
        100,
        (
          saved /
          target
        ) *
        100
      )
    );
  }

  function parseLocalDate(
    value
  ) {
    if (!value) {
      return null;
    }

    if (
      value instanceof Date
    ) {
      const copy =
        new Date(value);

      copy.setHours(
        0,
        0,
        0,
        0
      );

      return copy;
    }

    const clean =
      String(value)
        .slice(
          0,
          10
        );

    const parts =
      clean
        .split("-")
        .map(Number);

    if (
      parts.length !== 3 ||
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

  function formatDate(
    value
  ) {
    const date =
      parseLocalDate(
        value
      );

    if (!date) {
      return "No target date";
    }

    return date
      .toLocaleDateString(
        "en-US",
        {
          month: "short",
          day: "numeric",
          year: "numeric"
        }
      );
  }

  function daysUntil(
    value
  ) {
    const target =
      parseLocalDate(
        value
      );

    if (!target) {
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
        target -
        today
      ) /
      86400000
    );
  }

  function getIcon(goal) {
    if (
      goal.icon &&
      goal.icon !== "target"
    ) {
      return goal.icon;
    }

    return goal.goal_type ===
      "sinking"
        ? "💰"
        : "🎯";
  }

  async function getUser() {
    const {
      data,
      error
    } =
      await supabaseClient.auth
        .getUser();

    if (error) {
      console.error(
        error
      );

      return null;
    }

    return data?.user ||
      null;
  }

  function dateKey(value) {
    const date =
      parseLocalDate(
        value
      );

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

  /* =========================================================
     PAYCHECK / GUIDANCE DATA
  ========================================================= */

  function collectCurrentPaychecks() {
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
          const name =
            entry
              .querySelector(
                ".paycheck-name"
              )
              ?.value
              ?.trim()
            ||
            `Paycheck ${
              index + 1
            }`;

          const dateValue =
            entry
              .querySelector(
                ".paycheck-date"
              )
              ?.value ||
            "";

          const date =
            parseLocalDate(
              dateValue
            );

          const amount =
            money(
              entry
                .querySelector(
                  ".paycheck-amount"
                )
                ?.value
            );

          return {
            name,
            date,
            dateValue,
            amount
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

  function optimizedPaycheckMap() {
    const map =
      new Map();

    const optimized =
      window.latestPlannerData
        ?.paychecks;

    if (
      !Array.isArray(
        optimized
      )
    ) {
      return map;
    }

    optimized.forEach(
      paycheck => {
        const key =
          dateKey(
            paycheck.dateValue ||
            paycheck.date
          );

        if (!key) {
          return;
        }

        map.set(
          key,
          {
            safeToSpend:
              money(
                paycheck
                  .safeToSpend
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

  function buildGoalGuidance(
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
      parseLocalDate(
        goal.target_date
      );

    if (
      target > 0 &&
      saved >= target
    ) {
      return {
        status:
          "Goal Reached",

        className:
          "complete",

        headline:
          "You reached this goal.",

        detail:
          "Nice work — this goal is fully funded.",

        amountPerCheck:
          null
      };
    }

    if (!targetDate) {
      return {
        status:
          "Flexible Goal",

        className:
          "neutral",

        headline:
          `${currency(
            remaining
          )} left to save`,

        detail:
          "Add a target date if you want Stretch My Check to calculate a per-paycheck savings target.",

        amountPerCheck:
          null
      };
    }

    const days =
      daysUntil(
        goal.target_date
      );

    if (
      days !== null &&
      days < 0
    ) {
      return {
        status:
          "Past Target Date",

        className:
          "attention",

        headline:
          `${currency(
            remaining
          )} still needed`,

        detail:
          "Your target date has passed. Update the date or adjust the goal amount to rebuild your savings plan.",

        amountPerCheck:
          null
      };
    }

    const paychecks =
      collectCurrentPaychecks()
        .filter(
          paycheck =>
            paycheck.date <=
            targetDate
        );

    if (!paychecks.length) {
      return {
        status:
          "Add Paychecks",

        className:
          "neutral",

        headline:
          `${currency(
            remaining
          )} left to save`,

        detail:
          "Add upcoming paychecks in My Plan through this target date to get a per-paycheck recommendation.",

        amountPerCheck:
          null
      };
    }

    const amountPerCheck =
      remaining /
      paychecks.length;

    const optimizedMap =
      optimizedPaycheckMap();

    let optimizedChecks =
      0;

    let totalSafeCapacity =
      0;

    paychecks.forEach(
      paycheck => {
        const optimized =
          optimizedMap.get(
            dateKey(
              paycheck.date
            )
          );

        if (optimized) {
          optimizedChecks++;

          totalSafeCapacity +=
            Math.max(
              0,
              optimized
                .safeToSpend
            );
        }
      }
    );

    const checkWord =
      paychecks.length === 1
        ? "paycheck"
        : "paychecks";

    if (
      optimizedChecks > 0
    ) {
      const canFit =
        totalSafeCapacity >=
        remaining;

      return {
        status:
          canFit
            ? "On Track"
            : "Needs Attention",

        className:
          canFit
            ? "track"
            : "attention",

        headline:
          `${currency(
            amountPerCheck
          )} per paycheck`,

        detail:
          `Based on ${
            paychecks.length
          } upcoming ${checkWord} currently in My Plan. Your optimized plan shows about ${
            currency(
              totalSafeCapacity
            )
          } of safe spending room across the matched checks.`,

        amountPerCheck
      };
    }

    return {
      status:
        "Savings Target",

      className:
        "neutral",

      headline:
        `${currency(
          amountPerCheck
        )} per paycheck`,

      detail:
        `Based on ${
          paychecks.length
        } upcoming ${checkWord} currently entered in My Plan. Run Optimize My Money to compare this goal against your safe spending room.`,

      amountPerCheck
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
    "smcGoalsStyles";

  style.textContent = `

    #smcGoalsPage {
      --goal-card: #101f29;
      --goal-card-soft: #132630;
      --goal-border:
        rgba(132,175,192,.17);
      --goal-text: #f4f8fa;
      --goal-muted: #8fa6b1;
      --goal-teal: #45e1c0;
      --goal-purple: #9b6dff;
      --goal-orange: #ff9d55;
      --goal-red: #ff7479;
    }

    .smc-goals-shell {
      display: grid;
      gap: 18px;
    }

    .smc-goals-summary {
      display: grid;

      grid-template-columns:
        repeat(
          4,
          minmax(0, 1fr)
        );

      gap: 14px;
    }

    .smc-goal-summary-card {
      min-height: 132px;

      padding: 20px;

      border-radius: 18px;

      background:
        linear-gradient(
          145deg,
          #11232d,
          #0d1a23
        );

      border:
        1px solid
        var(--goal-border);

      box-shadow:
        0 14px 35px
        rgba(0,0,0,.10);
    }

    .smc-goal-summary-label {
      color:
        var(--goal-muted);

      font-size: 12px;

      margin-bottom: 14px;
    }

    .smc-goal-summary-value {
      color: white;

      font-size: 27px;

      font-weight: 850;

      line-height: 1;
    }

    .smc-goal-summary-note {
      color: #77909b;

      font-size: 11px;

      margin-top: 9px;

      line-height: 1.45;
    }

    .smc-goals-toolbar {
      display: flex;

      align-items: center;

      justify-content:
        space-between;

      gap: 16px;

      flex-wrap: wrap;

      padding: 20px;

      border-radius: 18px;

      border:
        1px solid
        var(--goal-border);

      background:
        linear-gradient(
          145deg,
          #101f29,
          #0c1921
        );
    }

    .smc-goals-toolbar h2 {
      margin: 0;

      color: white;

      font-size: 21px;
    }

    .smc-goals-toolbar p {
      margin: 5px 0 0;

      color:
        var(--goal-muted);

      font-size: 12px;
    }

    .smc-goal-primary {
      min-height: 43px;

      border:
        1px solid
        rgba(69,225,192,.35);

      border-radius: 999px;

      padding: 10px 18px;

      background:
        linear-gradient(
          90deg,
          #177d74,
          #258f87
        );

      color: white;

      font-weight: 800;

      cursor: pointer;
    }

    .smc-goal-primary:hover {
      filter:
        brightness(1.08);
    }

    .smc-goal-grid {
      display: grid;

      grid-template-columns:
        repeat(
          3,
          minmax(0, 1fr)
        );

      gap: 15px;
    }

    .smc-goal-card {
      position: relative;

      padding: 20px;

      border-radius: 19px;

      border:
        1px solid
        var(--goal-border);

      background:
        radial-gradient(
          circle at 90% 5%,
          rgba(69,225,192,.08),
          transparent 35%
        ),
        linear-gradient(
          145deg,
          #11232d,
          #0d1a23
        );

      overflow: hidden;
    }

    .smc-goal-card.completed {
      border-color:
        rgba(69,225,192,.32);

      background:
        radial-gradient(
          circle at 100% 0%,
          rgba(69,225,192,.16),
          transparent 38%
        ),
        linear-gradient(
          145deg,
          #12322f,
          #0d1d24
        );
    }

    .smc-goal-top {
      display: flex;

      justify-content:
        space-between;

      gap: 12px;

      align-items:
        flex-start;
    }

    .smc-goal-icon {
      width: 46px;

      height: 46px;

      display: grid;

      place-items: center;

      border-radius: 14px;

      background:
        rgba(69,225,192,.10);

      border:
        1px solid
        rgba(69,225,192,.17);

      font-size: 24px;
    }

    .smc-goal-type {
      display: inline-flex;

      align-items: center;

      padding: 5px 9px;

      border-radius: 999px;

      background:
        rgba(104,127,143,.12);

      color: #9ab0ba;

      font-size: 10px;

      font-weight: 750;

      text-transform:
        uppercase;

      letter-spacing: .04em;
    }

    .smc-goal-name {
      margin: 17px 0 4px;

      color: white;

      font-size: 19px;

      font-weight: 820;

      line-height: 1.2;
    }

    .smc-goal-date {
      color: #7f98a4;

      font-size: 11px;
    }

    .smc-goal-money-row {
      display: flex;

      justify-content:
        space-between;

      gap: 12px;

      margin-top: 19px;

      align-items:
        flex-end;
    }

    .smc-goal-saved {
      color: white;

      font-size: 24px;

      font-weight: 850;
    }

    .smc-goal-target {
      color: #8298a3;

      font-size: 11px;

      text-align: right;
    }

    .smc-goal-progress-track {
      position: relative;

      height: 10px;

      margin-top: 15px;

      border-radius: 999px;

      overflow: hidden;

      background: #263640;
    }

    .smc-goal-progress-fill {
      height: 100%;

      border-radius: inherit;

      background:
        linear-gradient(
          90deg,
          #27a892,
          #45e1c0
        );

      transition:
        width .35s ease;
    }

    .smc-goal-progress-line {
      display: flex;

      justify-content:
        space-between;

      gap: 12px;

      margin-top: 8px;

      color: #8da3ae;

      font-size: 11px;
    }

    /* =======================================================
       SMART SAVINGS GUIDANCE
    ======================================================= */

    .smc-goal-guidance {
      margin-top: 15px;

      padding: 13px;

      border-radius: 13px;

      background: #0d1d26;

      border:
        1px solid
        rgba(132,175,192,.13);
    }

    .smc-goal-guidance-head {
      display: flex;

      align-items: center;

      justify-content:
        space-between;

      gap: 10px;

      margin-bottom: 7px;
    }

    .smc-goal-guidance-title {
      color: #dce9ed;

      font-size: 11px;

      font-weight: 800;

      text-transform:
        uppercase;

      letter-spacing: .04em;
    }

    .smc-goal-status {
      padding: 4px 8px;

      border-radius: 999px;

      font-size: 9px;

      font-weight: 850;

      text-transform:
        uppercase;

      letter-spacing: .04em;
    }

    .smc-goal-status.track,
    .smc-goal-status.complete {
      color: #73e6c9;

      background:
        rgba(31,121,103,.18);

      border:
        1px solid
        rgba(69,225,192,.20);
    }

    .smc-goal-status.attention {
      color: #ffb071;

      background:
        rgba(142,79,30,.19);

      border:
        1px solid
        rgba(255,157,85,.20);
    }

    .smc-goal-status.neutral {
      color: #a6bbc4;

      background:
        rgba(96,126,139,.14);

      border:
        1px solid
        rgba(132,175,192,.15);
    }

    .smc-goal-guidance-main {
      color: white;

      font-size: 15px;

      font-weight: 820;
    }

    .smc-goal-guidance-detail {
      margin-top: 5px;

      color: #809aa6;

      font-size: 10px;

      line-height: 1.45;
    }

    .smc-goal-notes {
      min-height: 26px;

      margin-top: 12px;

      color: #8da3ae;

      font-size: 11px;

      line-height: 1.5;
    }

    /* =======================================================
       GOAL BUTTONS
    ======================================================= */

    .smc-goal-actions {
      display: grid;

      grid-template-columns:
        1fr 1fr 1fr;

      gap: 8px;

      margin-top: 17px;
    }

    .smc-goal-action {
      min-height: 39px;

      border-radius: 10px;

      border:
        1px solid
        rgba(132,175,192,.17);

      background: #132630;

      color: #e4eef1;

      font-weight: 750;

      cursor: pointer;
    }

    .smc-goal-action.add {
      border-color:
        rgba(69,225,192,.27);

      color:
        var(--goal-teal);

      background:
        rgba(30,112,101,.17);
    }

    .smc-goal-action.withdraw {
      border-color:
        rgba(155,109,255,.22);

      color: #bba0ff;

      background:
        rgba(90,61,150,.14);
    }

    .smc-goal-action:hover {
      filter:
        brightness(1.08);
    }

    /* =======================================================
       EMPTY GOALS
    ======================================================= */

    .smc-goal-empty {
      grid-column: 1 / -1;

      padding: 42px 24px;

      text-align: center;

      border-radius: 18px;

      background:
        linear-gradient(
          145deg,
          #101f29,
          #0c1921
        );

      border:
        1px dashed
        rgba(132,175,192,.23);

      color: #91a7b2;
    }

    .smc-goal-empty-icon {
      width: 64px;

      height: 64px;

      display: grid;

      place-items: center;

      margin: 0 auto 13px;

      border-radius: 50%;

      background:
        rgba(69,225,192,.08);

      color:
        var(--goal-teal);

      font-size: 30px;
    }

    .smc-goal-empty h3 {
      margin: 0 0 7px;

      color: white;

      font-size: 20px;
    }

    .smc-goal-empty p {
      margin:
        0 auto 18px;

      max-width: 480px;

      line-height: 1.55;

      font-size: 12px;
    }

    /* =======================================================
       MODAL
    ======================================================= */

    .smc-goal-modal-overlay {
      position: fixed;

      inset: 0;

      z-index: 12000;

      display: none;

      align-items: center;

      justify-content: center;

      padding: 18px;

      background:
        rgba(3,10,14,.82);

      backdrop-filter:
        blur(7px);
    }

    .smc-goal-modal-overlay.show {
      display: flex;
    }

    .smc-goal-modal {
      width: 100%;

      max-width: 560px;

      max-height: 90vh;

      overflow-y: auto;

      padding: 23px;

      border-radius: 20px;

      background:
        linear-gradient(
          145deg,
          #132630,
          #0d1b24
        );

      border:
        1px solid
        rgba(132,175,192,.20);

      box-shadow:
        0 28px 80px
        rgba(0,0,0,.45);

      color: white;
    }

    .smc-goal-modal-head {
      display: flex;

      justify-content:
        space-between;

      align-items: center;

      gap: 15px;

      margin-bottom: 18px;
    }

    .smc-goal-modal-head h2 {
      margin: 0;

      color: white;

      font-size: 23px;
    }

    .smc-goal-close {
      width: 40px;

      height: 40px;

      border-radius: 10px;

      border:
        1px solid
        rgba(132,175,192,.17);

      background: #172a35;

      color: white;

      font-size: 20px;

      cursor: pointer;
    }

    .smc-goal-field {
      display: flex;

      flex-direction: column;

      gap: 7px;

      margin-bottom: 14px;
    }

    .smc-goal-field label {
      color: #aec1ca;

      font-size: 13px;

      font-weight: 750;
    }

    .smc-goal-field input,
    .smc-goal-field select,
    .smc-goal-field textarea {
      width: 100%;

      box-sizing: border-box;

      min-height: 46px;

      padding: 11px 12px;

      border-radius: 11px;

      border:
        1px solid
        rgba(132,175,192,.22);

      background: #081923;

      color: white;

      font: inherit;
    }

    .smc-goal-field textarea {
      min-height: 88px;

      resize: vertical;
    }

    .smc-goal-field input:focus,
    .smc-goal-field select:focus,
    .smc-goal-field textarea:focus {
      outline: none;

      border-color:
        var(--goal-teal);

      box-shadow:
        0 0 0 3px
        rgba(69,225,192,.10);
    }

    .smc-goal-grid-2 {
      display: grid;

      grid-template-columns:
        repeat(
          2,
          minmax(0,1fr)
        );

      gap: 12px;
    }

    .smc-goal-modal-actions {
      display: flex;

      gap: 10px;

      justify-content:
        flex-end;

      flex-wrap: wrap;

      margin-top: 19px;
    }

    .smc-goal-cancel,
    .smc-goal-save,
    .smc-goal-delete {
      min-height: 43px;

      padding: 10px 17px;

      border-radius: 10px;

      font-weight: 750;

      cursor: pointer;
    }

    .smc-goal-cancel {
      border:
        1px solid
        rgba(132,175,192,.17);

      background: #172a35;

      color: #d7e4e9;
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

      color: white;

      font-weight: 800;
    }

    .smc-goal-delete {
      margin-right: auto;

      border:
        1px solid
        rgba(255,116,121,.25);

      background:
        rgba(133,42,49,.17);

      color: #ff969a;
    }

    .smc-goal-message {
      display: none;

      margin-top: 12px;

      padding: 11px 12px;

      border-radius: 10px;

      font-size: 12px;

      line-height: 1.45;
    }

    .smc-goal-message.show {
      display: block;
    }

    .smc-goal-message.good {
      color: #91dfc1;

      background:
        rgba(29,102,74,.16);

      border:
        1px solid
        rgba(92,231,177,.20);
    }

    .smc-goal-message.bad {
      color: #ff9a9d;

      background:
        rgba(126,41,47,.17);

      border:
        1px solid
        rgba(255,116,121,.22);
    }

    .smc-goal-message.info {
      color: #a9c7d2;

      background:
        rgba(64,108,123,.15);

      border:
        1px solid
        rgba(132,175,192,.17);
    }

    .smc-goal-signed-out {
      padding: 32px;

      border-radius: 18px;

      text-align: center;

      background:
        linear-gradient(
          145deg,
          #101f29,
          #0c1921
        );

      border:
        1px solid
        var(--goal-border);

      color:
        var(--goal-muted);
    }

    .smc-goal-signed-out h3 {
      color: white;

      margin: 0 0 8px;
    }

    /* =======================================================
       RESPONSIVE
    ======================================================= */

    @media (
      max-width: 1100px
    ) {

      .smc-goals-summary {
        grid-template-columns:
          repeat(
            2,
            minmax(0,1fr)
          );
      }

      .smc-goal-grid {
        grid-template-columns:
          repeat(
            2,
            minmax(0,1fr)
          );
      }
    }

    @media (
      max-width: 720px
    ) {

      .smc-goals-summary,
      .smc-goal-grid,
      .smc-goal-grid-2 {
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
        width: 100%;
      }

      .smc-goal-actions {
        grid-template-columns:
          1fr;
      }
    }
  `;

  document.head
    .appendChild(
      style
    );

  /* =========================================================
     MODAL
  ========================================================= */

  const modalOverlay =
    document.createElement(
      "div"
    );

  modalOverlay.className =
    "smc-goal-modal-overlay";

  modalOverlay.innerHTML = `
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
          aria-label="Close"
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
      modalOverlay
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
    modalOverlay
      .classList
      .add(
        "show"
      );
  }

  function closeModal() {
    modalOverlay
      .classList
      .remove(
        "show"
      );

    editingGoalId =
      null;

    activeMoneyGoal =
      null;

    activeMoneyMode =
      null;

    clearMessage();
  }

  function showMessage(
    message,
    type = "info"
  ) {
    modalMessage.textContent =
      message;

    modalMessage.className =
      `smc-goal-message show ${type}`;
  }

  function clearMessage() {
    modalMessage.textContent =
      "";

    modalMessage.className =
      "smc-goal-message";
  }

  document
    .getElementById(
      "smcGoalClose"
    )
    .addEventListener(
      "click",
      closeModal
    );

  modalOverlay
    .addEventListener(
      "click",
      event => {

        if (
          event.target ===
          modalOverlay
        ) {
          closeModal();
        }
      }
    );

  document
    .addEventListener(
      "keydown",
      event => {

        if (
          event.key ===
            "Escape" &&
          modalOverlay
            .classList
            .contains(
              "show"
            )
        ) {
          closeModal();
        }
      }
    );  
      /* =========================================================
     PAGE
  ========================================================= */

  function getGoalsPage() {
    return document
      .getElementById(
        "smcGoalsPage"
      );
  }

  function buildGoalsPage() {
    const page =
      getGoalsPage();

    if (!page) {
      return false;
    }

    page.innerHTML = `
      <div
        class="smc-page-heading"
      >

        <div>

          <h1>
            Goals
          </h1>

          <p>
            Build savings one step
            at a time.
          </p>

        </div>

      </div>

      <div
        class="smc-goals-shell"
      >

        <div
          id="smcGoalsSignedOut"
          class="smc-goal-signed-out"
          style="display:none;"
        >

          <h3>
            Sign in to use Goals
          </h3>

          <p>
            Your savings goals and
            sinking funds are stored
            securely with your account.
          </p>

        </div>

        <div
          id="smcGoalsApp"
        >

          <div
            class="smc-goals-summary"
          >

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
                style="
                  font-size:20px;
                  line-height:1.2;
                "
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

          <div
            class="smc-goals-toolbar"
          >

            <div>

              <h2>
                My Goals
              </h2>

              <p>
                Savings goals and sinking
                funds all in one place.
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

          <div
            id="smcGoalsGrid"
            class="smc-goal-grid"
          ></div>

        </div>

      </div>
    `;

    document
      .getElementById(
        "smcAddGoal"
      )
      ?.addEventListener(
        "click",
        showGoalForm
      );

    return true;
  }

  /* =========================================================
     LOAD GOALS
  ========================================================= */

  async function loadGoals() {
    const user =
      await getUser();

    const signedOut =
      document.getElementById(
        "smcGoalsSignedOut"
      );

    const app =
      document.getElementById(
        "smcGoalsApp"
      );

    if (!user) {
      goals = [];

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
      await supabaseClient
        .from(
          "financial_goals"
        )
        .select(
          "id, user_id, goal_name, goal_type, target_amount, saved_amount, target_date, icon, notes, created_at, updated_at"
        )
        .eq(
          "user_id",
          user.id
        )
        .order(
          "updated_at",
          {
            ascending: false
          }
        );

    if (error) {
      console.error(
        error
      );

      goals = [];

      renderGoals();

      return;
    }

    goals =
      data || [];

    renderGoals();
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

    const overall =
      percent(
        totalSaved,
        totalTarget
      );

    const set =
      (
        id,
        value
      ) => {
        const element =
          document.getElementById(
            id
          );

        if (element) {
          element.textContent =
            value;
        }
      };

    set(
      "smcGoalsTotalSaved",
      currency(
        totalSaved
      )
    );

    set(
      "smcGoalsTotalTarget",
      currency(
        totalTarget
      )
    );

    set(
      "smcGoalsOverall",
      `${
        Math.round(
          overall
        )
      }%`
    );

    const unfinished =
      goals
        .filter(
          goal =>
            money(
              goal.target_amount
            ) >
            money(
              goal.saved_amount
            )
        )
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

      set(
        "smcGoalsClosest",
        closest.goal_name
      );

      set(
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
      set(
        "smcGoalsClosest",
        "All Complete 🎉"
      );

      set(
        "smcGoalsClosestNote",
        "You reached every current goal."
      );

    } else {
      set(
        "smcGoalsClosest",
        "None yet"
      );

      set(
        "smcGoalsClosestNote",
        "Create your first goal"
      );
    }
  }

  /* =========================================================
     RENDER GOALS
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

    if (!goals.length) {
      grid.innerHTML = `
        <div
          class="smc-goal-empty"
        >

          <div
            class="smc-goal-empty-icon"
          >
            🎯
          </div>

          <h3>
            Start with one goal
          </h3>

          <p>
            Whether you're saving for
            an emergency fund, a trip,
            birthdays, car repairs or
            something bigger, Stretch
            My Check can help you keep
            track of your progress.
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
        ?.addEventListener(
          "click",
          showGoalForm
        );

      return;
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
              percent(
                saved,
                target
              );

            const remaining =
              Math.max(
                target -
                saved,
                0
              );

            const complete =
              target > 0 &&
              saved >= target;

            const days =
              daysUntil(
                goal.target_date
              );

            let dateNote =
              formatDate(
                goal.target_date
              );

            if (
              days !== null
            ) {
              if (
                days > 0
              ) {
                dateNote +=
                  ` • ${days} day${
                    days === 1
                      ? ""
                      : "s"
                  } away`;

              } else if (
                days === 0
              ) {
                dateNote +=
                  " • Today";

              } else {
                dateNote +=
                  " • Target date passed";
              }
            }

            const guidance =
              buildGoalGuidance(
                goal
              );

            return `
              <article
                class="
                  smc-goal-card
                  ${
                    complete
                      ? "completed"
                      : ""
                  }
                "
              >

                <div
                  class="smc-goal-top"
                >

                  <div
                    class="smc-goal-icon"
                  >
                    ${escapeHTML(
                      getIcon(
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
                  ${escapeHTML(
                    goal.goal_name
                  )}
                </div>

                <div
                  class="smc-goal-date"
                >
                  ${escapeHTML(
                    dateNote
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
                        margin-top:3px;
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
                      width:
                      ${progress}%;
                    "
                  ></div>

                </div>

                <div
                  class="smc-goal-progress-line"
                >

                  <span>
                    ${
                      Math.round(
                        progress
                      )
                    }%
                  </span>

                  <span>
                    ${
                      complete
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
                        ${
                          guidance.className
                        }
                      "
                    >
                      ${escapeHTML(
                        guidance.status
                      )}
                    </div>

                  </div>

                  <div
                    class="smc-goal-guidance-main"
                  >
                    ${escapeHTML(
                      guidance.headline
                    )}
                  </div>

                  <div
                    class="smc-goal-guidance-detail"
                  >
                    ${escapeHTML(
                      guidance.detail
                    )}
                  </div>

                </div>

                <div
                  class="smc-goal-notes"
                >
                  ${
                    goal.notes
                      ? escapeHTML(
                          goal.notes
                        )
                      : "&nbsp;"
                  }
                </div>

                <div
                  class="smc-goal-actions"
                >

                  <button
                    class="
                      smc-goal-action
                      add
                    "
                    type="button"
                    data-add-money="${
                      goal.id
                    }"
                  >
                    + Add Money
                  </button>

                  <button
                    class="
                      smc-goal-action
                      withdraw
                    "
                    type="button"
                    data-withdraw-money="${
                      goal.id
                    }"
                  >
                    − Withdraw
                  </button>

                  <button
                    class="smc-goal-action"
                    type="button"
                    data-manage-goal="${
                      goal.id
                    }"
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
        "[data-add-money]"
      )
      .forEach(
        button => {
          button
            .addEventListener(
              "click",
              () => {
                const id =
                  Number(
                    button
                      .dataset
                      .addMoney
                  );

                const goal =
                  goals.find(
                    item =>
                      Number(
                        item.id
                      ) === id
                  );

                if (goal) {
                  showMoneyChange(
                    goal,
                    "add"
                  );
                }
              }
            );
        }
      );

    grid
      .querySelectorAll(
        "[data-withdraw-money]"
      )
      .forEach(
        button => {
          button
            .addEventListener(
              "click",
              () => {
                const id =
                  Number(
                    button
                      .dataset
                      .withdrawMoney
                  );

                const goal =
                  goals.find(
                    item =>
                      Number(
                        item.id
                      ) === id
                  );

                if (goal) {
                  showMoneyChange(
                    goal,
                    "withdraw"
                  );
                }
              }
            );
        }
      );

    grid
      .querySelectorAll(
        "[data-manage-goal]"
      )
      .forEach(
        button => {
          button
            .addEventListener(
              "click",
              () => {
                const id =
                  Number(
                    button
                      .dataset
                      .manageGoal
                  );

                const goal =
                  goals.find(
                    item =>
                      Number(
                        item.id
                      ) === id
                  );

                if (goal) {
                  showGoalForm(
                    goal
                  );
                }
              }
            );
        }
      );
  }

  /* =========================================================
     GOAL FORM
  ========================================================= */

  function showGoalForm(
    goal = null
  ) {
    const existing =
      Boolean(
        goal &&
        goal.id
      );

    editingGoalId =
      existing
        ? goal.id
        : null;

    activeMoneyGoal =
      null;

    activeMoneyMode =
      null;

    modalTitle.textContent =
      existing
        ? "Manage Goal"
        : "Add Goal";

    modalBody.innerHTML = `

      <div
        class="smc-goal-field"
      >

        <label
          for="smcGoalName"
        >
          Goal name
        </label>

        <input
          id="smcGoalName"
          type="text"
          maxlength="80"
          placeholder="Example: Emergency Fund"
        >

      </div>

      <div
        class="smc-goal-grid-2"
      >

        <div
          class="smc-goal-field"
        >

          <label
            for="smcGoalType"
          >
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

          <label
            for="smcGoalIcon"
          >
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

          <label
            for="smcGoalTarget"
          >
            Target amount
          </label>

          <input
            id="smcGoalTarget"
            type="number"
            min="0"
            step="0.01"
            placeholder="5000"
          >

        </div>

        <div
          class="smc-goal-field"
        >

          <label
            for="smcGoalSaved"
          >
            Already saved
          </label>

          <input
            id="smcGoalSaved"
            type="number"
            min="0"
            step="0.01"
            placeholder="0"
          >

        </div>

      </div>

      <div
        class="smc-goal-field"
      >

        <label
          for="smcGoalDate"
        >
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

        <label
          for="smcGoalNotes"
        >
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

    if (existing) {
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

      const goalIcon =
        getIcon(
          goal
        );

      const optionExists =
        [
          ...iconSelect.options
        ].some(
          option =>
            option.value ===
            goalIcon
        );

      iconSelect.value =
        optionExists
          ? goalIcon
          : "🎯";

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
      .addEventListener(
        "click",
        closeModal
      );

    document
      .getElementById(
        "smcSaveGoal"
      )
      .addEventListener(
        "click",
        saveGoal
      );

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
     SAVE GOAL
  ========================================================= */

  async function saveGoal() {
    clearMessage();

    const user =
      await getUser();

    if (!user) {
      showMessage(
        "Sign in before saving a goal.",
        "bad"
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

    const type =
      document
        .getElementById(
          "smcGoalType"
        )
        .value;

    const icon =
      document
        .getElementById(
          "smcGoalIcon"
        )
        .value;

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

    const targetDate =
      document
        .getElementById(
          "smcGoalDate"
        )
        .value ||
      null;

    const notes =
      document
        .getElementById(
          "smcGoalNotes"
        )
        .value
        .trim();

    if (!name) {
      showMessage(
        "Give this goal a name.",
        "bad"
      );

      return;
    }

    if (target <= 0) {
      showMessage(
        "Enter a target amount greater than $0.",
        "bad"
      );

      return;
    }

    if (saved < 0) {
      showMessage(
        "Saved amount cannot be negative.",
        "bad"
      );

      return;
    }

    const saveButton =
      document
        .getElementById(
          "smcSaveGoal"
        );

    saveButton.disabled =
      true;

    saveButton.textContent =
      "Saving...";

    const payload = {
      user_id:
        user.id,

      goal_name:
        name,

      goal_type:
        type,

      target_amount:
        target,

      saved_amount:
        saved,

      target_date:
        targetDate,

      icon,

      notes:
        notes || null,

      updated_at:
        new Date()
          .toISOString()
    };

    let error =
      null;

    if (
      editingGoalId
    ) {
      const response =
        await supabaseClient
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
            user.id
          );

      error =
        response.error;

    } else {
      const response =
        await supabaseClient
          .from(
            "financial_goals"
          )
          .insert(
            payload
          );

      error =
        response.error;
    }

    saveButton.disabled =
      false;

    saveButton.textContent =
      editingGoalId
        ? "Save Changes"
        : "Create Goal";

    if (error) {
      console.error(
        error
      );

      showMessage(
        error.message ||
          "Could not save this goal.",
        "bad"
      );

      return;
    }

    showMessage(
      editingGoalId
        ? "Goal updated."
        : "Goal created.",
      "good"
    );

    await loadGoals();

    window.setTimeout(
      closeModal,
      450
    );
  }

  /* =========================================================
     ADD / WITHDRAW MONEY
  ========================================================= */

  function showMoneyChange(
    goal,
    mode
  ) {
    activeMoneyGoal =
      goal;

    activeMoneyMode =
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
            color:white;
            font-size:20px;
            font-weight:800;
            margin-top:4px;
          "
        >
          ${escapeHTML(
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
          ${
            currency(
              goal.saved_amount
            )
          }
          of
          ${
            currency(
              goal.target_amount
            )
          }
        </div>

      </div>

      <div
        class="smc-goal-field"
      >

        <label
          for="smcGoalMoneyAmount"
        >
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
          autofocus
        >

      </div>

      ${
        isWithdraw
          ? `
            <div
              style="
                color:#8fa6b1;
                font-size:11px;
                line-height:1.5;
                margin-top:-4px;
              "
            >
              Use this when you spend
              money from a sinking fund
              or need to correct the
              saved balance.
            </div>
          `
          : ""
      }

      <div
        class="smc-goal-modal-actions"
      >

        <button
          id="smcCancelMoneyChange"
          class="smc-goal-cancel"
          type="button"
        >
          Cancel
        </button>

        <button
          id="smcSaveMoneyChange"
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
        "smcCancelMoneyChange"
      )
      .addEventListener(
        "click",
        closeModal
      );

    document
      .getElementById(
        "smcSaveMoneyChange"
      )
      .addEventListener(
        "click",
        applyMoneyChange
      );

    document
      .getElementById(
        "smcGoalMoneyAmount"
      )
      .addEventListener(
        "keydown",
        event => {
          if (
            event.key ===
            "Enter"
          ) {
            applyMoneyChange();
          }
        }
      );

    clearMessage();

    openModal();
  }

  async function applyMoneyChange() {
    if (
      !activeMoneyGoal ||
      !activeMoneyMode
    ) {
      return;
    }

    clearMessage();

    const user =
      await getUser();

    if (!user) {
      showMessage(
        "Sign in before updating a goal.",
        "bad"
      );

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

    if (amount <= 0) {
      showMessage(
        "Enter an amount greater than $0.",
        "bad"
      );

      return;
    }

    const currentSaved =
      money(
        activeMoneyGoal
          .saved_amount
      );

    const isWithdraw =
      activeMoneyMode ===
      "withdraw";

    if (
      isWithdraw &&
      amount >
        currentSaved
    ) {
      showMessage(
        `You only have ${
          currency(
            currentSaved
          )
        } saved in this goal.`,
        "bad"
      );

      return;
    }

    const newSaved =
      isWithdraw
        ? currentSaved - amount
        : currentSaved + amount;

    const button =
      document
        .getElementById(
          "smcSaveMoneyChange"
        );

    button.disabled =
      true;

    button.textContent =
      isWithdraw
        ? "Withdrawing..."
        : "Adding...";

    const {
      error
    } =
      await supabaseClient
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
          activeMoneyGoal.id
        )
        .eq(
          "user_id",
          user.id
        );

    button.disabled =
      false;

    button.textContent =
      isWithdraw
        ? "Withdraw Money"
        : "Add Money";

    if (error) {
      console.error(
        error
      );

      showMessage(
        error.message ||
          "Could not update this goal.",
        "bad"
      );

      return;
    }

    showMessage(
      isWithdraw
        ? `${
            currency(
              amount
            )
          } withdrawn.`
        : `${
            currency(
              amount
            )
          } added.`,
      "good"
    );

    await loadGoals();

    window.setTimeout(
      closeModal,
      450
    );
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
        }"? This cannot be undone.`
      );

    if (!confirmed) {
      return;
    }

    const user =
      await getUser();

    if (!user) {
      return;
    }

    const {
      error
    } =
      await supabaseClient
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
          user.id
        );

    if (error) {
      console.error(
        error
      );

      showMessage(
        error.message ||
          "Could not delete this goal.",
        "bad"
      );

      return;
    }

    closeModal();

    await loadGoals();
  }

  /* =========================================================
     REFRESH SMART GUIDANCE
  ========================================================= */

  function refreshGoalGuidanceSoon() {
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
    refreshGoalGuidanceSoon
  );

  document
    .addEventListener(
      "change",
      event => {
        if (
          event.target
            .matches(
              ".paycheck-date, .paycheck-amount, .paycheck-name"
            )
        ) {
          refreshGoalGuidanceSoon();
        }
      }
    );

  /* =========================================================
     STARTUP
  ========================================================= */

  function initialize() {
    if (
      !buildGoalsPage()
    ) {
      window.setTimeout(
        initialize,
        250
      );

      return;
    }

    loadGoals();
  }

  supabaseClient.auth
    .onAuthStateChange(
      () => {
        window.setTimeout(
          () => {
            if (
              getGoalsPage()
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
      showGoalForm
  };

  window.setTimeout(
    initialize,
    350
  );

})();