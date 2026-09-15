(() => {
  "use strict";

  /*
  ============================================================
   STRETCH MY CHECK
   CREATE NEXT PLAN
   Version 1
  ============================================================

   PURPOSE
   ------------------------------------------------------------
   Turns the already-working Next Plan preview into a real,
   saved Stretch My Check plan.

   FLOW
   ------------------------------------------------------------
   1. Uses the verified Forecast Ending Balance as rollover.
   2. Uses the existing rollover preview for next-period items.
   3. Creates a new row in saved_plans.
   4. Creates the source -> next relationship in plan_rollovers.
   5. Prevents duplicate rollover creation.
   6. Cleans up an orphaned saved plan if linking fails.
   7. Loads the newly created plan into My Plan.
   8. Runs Optimize My Money.
   9. Leaves the original source plan untouched.

   IMPORTANT
   ------------------------------------------------------------
   This file does NOT modify:
   - rollover.js
   - rollover-balance.js
   - recurring.js
   - recurring-planner.js
   - plans.js
   - forecast.js
   - goals.js
   - debt.js
  ============================================================
  */


  const CREATE_VERSION = "1.0.0";

  let createInProgress = false;


  /* ============================================================
     BASIC HELPERS
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


  function normalizeDate(value) {
    if (!value) {
      return "";
    }

    if (
      /^\d{4}-\d{2}-\d{2}$/.test(
        String(value)
      )
    ) {
      return String(value);
    }

    const date = new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "";
    }

    const year =
      date.getFullYear();

    const month =
      String(
        date.getMonth() + 1
      ).padStart(2, "0");

    const day =
      String(
        date.getDate()
      ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }


  function parseLocalDate(value) {
    const normalized =
      normalizeDate(value);

    if (!normalized) {
      return null;
    }

    const [year, month, day] =
      normalized
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
    const date =
      parseLocalDate(value);

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


  function getInputValue(id) {
    return (
      document.getElementById(id)
        ?.value ?? ""
    );
  }


  function getSupabase() {
    if (
      window.supabaseClient
    ) {
      return window.supabaseClient;
    }

    throw new Error(
      "Stretch My Check could not connect to Supabase."
    );
  }


  async function getUser() {
    const supabase =
      getSupabase();

    const {
      data,
      error
    } =
      await supabase.auth.getUser();

    if (error) {
      throw error;
    }

    if (!data?.user) {
      throw new Error(
        "Please sign in before creating your next plan."
      );
    }

    return data.user;
  }


  function sleep(ms) {
    return new Promise(
      resolve =>
        setTimeout(resolve, ms)
    );
  }


  /* ============================================================
     TOAST
  ============================================================ */

  function showToast(
    message,
    type = "success"
  ) {
    let host =
      document.getElementById(
        "smcRolloverCreateToastHost"
      );

    if (!host) {
      host =
        document.createElement("div");

      host.id =
        "smcRolloverCreateToastHost";

      host.style.cssText = `
        position: fixed;
        right: 22px;
        bottom: 22px;
        z-index: 999999;
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-width: min(420px, calc(100vw - 32px));
        pointer-events: none;
      `;

      document.body.appendChild(
        host
      );
    }

    const toast =
      document.createElement("div");

    const isError =
      type === "error";

    toast.style.cssText = `
      padding: 14px 16px;
      border-radius: 14px;
      border: 1px solid ${
        isError
          ? "rgba(255,107,120,.45)"
          : "rgba(61,222,190,.42)"
      };
      background: ${
        isError
          ? "#24141a"
          : "#0b2929"
      };
      color: #f4fbff;
      box-shadow: 0 18px 50px rgba(0,0,0,.35);
      font-size: 14px;
      font-weight: 700;
      line-height: 1.45;
      pointer-events: auto;
    `;

    toast.textContent =
      message;

    host.appendChild(
      toast
    );

    window.setTimeout(
      () => {
        toast.remove();
      },
      5000
    );
  }


  /* ============================================================
     CURRENT PLANNER DATA
  ============================================================ */

  function currentPaychecks() {
    return [
      ...document.querySelectorAll(
        ".paycheck-entry"
      )
    ]
      .map(entry => ({
        name:
          entry.querySelector(
            ".paycheck-name"
          )?.value?.trim() || "",

        date:
          normalizeDate(
            entry.querySelector(
              ".paycheck-date"
            )?.value
          ),

        amount:
          moneyNumber(
            entry.querySelector(
              ".paycheck-amount"
            )?.value
          )
      }))
      .filter(
        paycheck =>
          paycheck.date &&
          paycheck.amount > 0
      )
      .sort(
        (a, b) =>
          a.date.localeCompare(
            b.date
          )
      );
  }


  function currentBills() {
    return [
      ...document.querySelectorAll(
        ".bill-entry"
      )
    ]
      .map(entry => ({
        name:
          entry.querySelector(
            ".bill-name"
          )?.value?.trim() || "",

        amount:
          moneyNumber(
            entry.querySelector(
              ".bill-amount"
            )?.value
          ),

        type:
          entry.querySelector(
            ".bill-type"
          )?.value || "fixed",

        priority:
          entry.querySelector(
            ".bill-priority"
          )?.value || "essential",

        dueDate:
          normalizeDate(
            entry.querySelector(
              ".bill-due-date"
            )?.value
          ),

        flexRule:
          entry.querySelector(
            ".flex-rule"
          )?.value || "any",

        byDate:
          normalizeDate(
            entry.querySelector(
              ".flex-by-date"
            )?.value
          ),

        startDate:
          normalizeDate(
            entry.querySelector(
              ".flex-start-date"
            )?.value
          ),

        endDate:
          normalizeDate(
            entry.querySelector(
              ".flex-end-date"
            )?.value
          )
      }))
      .filter(
        bill =>
          bill.name ||
          bill.amount > 0
      );
  }


  function currentSettings() {
    return {
      protectedCushion:
        moneyNumber(
          getInputValue(
            "protectedCushion"
          )
        ),

      groceries: {
        amount:
          moneyNumber(
            getInputValue(
              "groceryAmount"
            )
          ),

        mode:
          getInputValue(
            "groceryMode"
          ) || "total"
      },

      gas: {
        amount:
          moneyNumber(
            getInputValue(
              "gasAmount"
            )
          ),

        mode:
          getInputValue(
            "gasMode"
          ) || "total"
      },

      other: {
        amount:
          moneyNumber(
            getInputValue(
              "otherAmount"
            )
          ),

        mode:
          getInputValue(
            "otherMode"
          ) || "total"
      }
    };
  }


  /* ============================================================
     CURRENT PLANNING PERIOD
  ============================================================ */

  function currentPeriod() {
    const paychecks =
      currentPaychecks();

    if (!paychecks.length) {
      throw new Error(
        "Your current plan needs at least one dated paycheck."
      );
    }

    const start =
      paychecks[0].date;

    /*
      The rollover preview already determines the true next
      period. This current-period fallback is used only for
      matching the current saved plan.
    */

    const end =
      paychecks[
        paychecks.length - 1
      ].date;

    return {
      start,
      end
    };
  }


  /* ============================================================
     VERIFIED ROLLOVER BALANCE
  ============================================================ */

  function getVerifiedEndingBalance() {
    if (
      !window
        .StretchMyCheckRolloverBalance ||
      typeof window
        .StretchMyCheckRolloverBalance
        .getEndingBalance !==
        "function"
    ) {
      throw new Error(
        "The verified rollover balance system is not available."
      );
    }

    const result =
      window
        .StretchMyCheckRolloverBalance
        .getEndingBalance();

    const amount =
      moneyNumber(
        result?.amount
      );

    if (
      !Number.isFinite(amount)
    ) {
      throw new Error(
        "Stretch My Check could not determine the current plan's ending balance."
      );
    }

    return {
      amount,
      source:
        result?.source ||
        "unknown"
    };
  }


  /* ============================================================
     GET EXISTING ROLLOVER PREVIEW
  ============================================================ */

  async function getRolloverPreview() {
    const rollover =
      window
        .StretchMyCheckRollover;

    if (
      !rollover ||
      typeof rollover.calculate !==
        "function"
    ) {
      throw new Error(
        "The Next Plan preview system is not ready."
      );
    }

    /*
      rollover-balance.js already established the correct
      ending balance. Temporarily expose it as endingBalance
      so the existing rollover calculator uses the same
      $ amount that the Home Forecast shows.
    */

    const ending =
      getVerifiedEndingBalance();

    const planner =
      window.latestPlannerData;

    let hadEndingBalance =
      false;

    let oldEndingBalance;

    if (planner) {
      hadEndingBalance =
        Object.prototype
          .hasOwnProperty
          .call(
            planner,
            "endingBalance"
          );

      oldEndingBalance =
        planner.endingBalance;

      planner.endingBalance =
        ending.amount;
    }

    try {
      const preview =
        await rollover.calculate();

      if (
        !preview ||
        preview.error
      ) {
        throw new Error(
          preview?.error ||
          "Next Plan preview could not be calculated."
        );
      }

      /*
        Force the verified amount into the creation payload.
      */

      preview.carriedBalance =
        ending.amount;

      preview.startingBalance =
        ending.amount;

      preview.rolloverBalance =
        ending.amount;

      return preview;

    } finally {
      if (planner) {
        if (
          hadEndingBalance
        ) {
          planner.endingBalance =
            oldEndingBalance;
        } else {
          delete planner
            .endingBalance;
        }
      }
    }
  }


  /* ============================================================
     NORMALIZE PREVIEW DATES
  ============================================================ */

  function getPreviewStart(
    preview
  ) {
    const candidates = [
      preview.nextPeriodStart,
      preview.next_period_start,
      preview.periodStart,
      preview.nextStart,
      preview.startDate,
      preview.next?.start,
      preview.nextPeriod?.start,
      preview.nextPlanningPeriod?.start
    ];

    for (
      const candidate of
      candidates
    ) {
      const date =
        normalizeDate(
          candidate
        );

      if (date) {
        return date;
      }
    }

    return "";
  }


  function getPreviewEnd(
    preview
  ) {
    const candidates = [
      preview.nextPeriodEnd,
      preview.next_period_end,
      preview.periodEnd,
      preview.nextEnd,
      preview.endDate,
      preview.next?.end,
      preview.nextPeriod?.end,
      preview.nextPlanningPeriod?.end
    ];

    for (
      const candidate of
      candidates
    ) {
      const date =
        normalizeDate(
          candidate
        );

      if (date) {
        return date;
      }
    }

    return "";
  }


  /* ============================================================
     PREVIEW ITEM NORMALIZATION
  ============================================================ */

  function firstArray(
    ...values
  ) {
    for (
      const value of values
    ) {
      if (
        Array.isArray(value)
      ) {
        return value;
      }
    }

    return [];
  }


  function normalizeIncomeItem(
    item
  ) {
    return {
      name:
        item?.name ||
        item?.item_name ||
        item?.incomeName ||
        item?.title ||
        item?.label ||
        "Recurring Income",

      date:
        normalizeDate(
          item?.date ||
          item?.payDate ||
          item?.pay_date ||
          item?.occurrenceDate ||
          item?.occurrence_date
        ),

      amount:
        Math.abs(
          moneyNumber(
            item?.amount
          )
        )
    };
  }


  function normalizeExpenseItem(
    item
  ) {
    const rawType =
      String(
        item?.type ||
        item?.billType ||
        item?.bill_type ||
        "fixed"
      ).toLowerCase();

    const type =
      rawType.includes(
        "flex"
      )
        ? "flexible"
        : "fixed";

    return {
      name:
        item?.name ||
        item?.item_name ||
        item?.expenseName ||
        item?.title ||
        item?.label ||
        "Recurring Expense",

      date:
        normalizeDate(
          item?.date ||
          item?.dueDate ||
          item?.due_date ||
          item?.occurrenceDate ||
          item?.occurrence_date
        ),

      amount:
        Math.abs(
          moneyNumber(
            item?.amount
          )
        ),

      type,

      priority:
        item?.priority ||
        item?.billPriority ||
        item?.bill_priority ||
        "essential",

      flexRule:
        item?.flexRule ||
        item?.flex_rule ||
        "any",

      byDate:
        normalizeDate(
          item?.byDate ||
          item?.by_date
        ),

      startDate:
        normalizeDate(
          item?.startDate ||
          item?.start_date
        ),

      endDate:
        normalizeDate(
          item?.endDate ||
          item?.end_date
        )
    };
  }


  function getPreviewIncome(
    preview
  ) {
    const raw =
      firstArray(
        preview.incomeItems,
        preview.recurringIncomeItems,
        preview.income,
        preview.paychecks,
        preview.nextPaychecks,
        preview.items?.income,
        preview.recurring?.income,
        preview.nextPeriod?.income,
        preview.nextPlanningPeriod?.income
      );

    return raw
      .map(
        normalizeIncomeItem
      )
      .filter(
        item =>
          item.date &&
          item.amount > 0
      )
      .sort(
        (a, b) =>
          a.date.localeCompare(
            b.date
          )
      );
  }


  function getPreviewExpenses(
    preview
  ) {
    const raw =
      firstArray(
        preview.expenseItems,
        preview.recurringExpenseItems,
        preview.expenses,
        preview.bills,
        preview.nextBills,
        preview.items?.expenses,
        preview.recurring?.expenses,
        preview.nextPeriod?.expenses,
        preview.nextPlanningPeriod?.expenses
      );

    return raw
      .map(
        normalizeExpenseItem
      )
      .filter(
        item =>
          item.date &&
          item.amount > 0
      )
      .sort(
        (a, b) =>
          a.date.localeCompare(
            b.date
          )
      );
  }


  /* ============================================================
     FALLBACK: READ VISIBLE PREVIEW MODAL
  ============================================================ */

  function getVisiblePreviewModal() {
    const headings = [
      ...document.querySelectorAll(
        "h1, h2, h3"
      )
    ];

    const heading =
      headings.find(
        element =>
          element.textContent
            ?.trim()
            .toLowerCase() ===
          "preview your next plan"
      );

    if (!heading) {
      return null;
    }

    let node =
      heading.parentElement;

    while (
      node &&
      node !== document.body
    ) {
      const text =
        node.textContent || "";

      if (
        text.includes(
          "Recurring Income"
        ) &&
        text.includes(
          "Recurring Expenses"
        ) &&
        text.includes(
          "Create Next Plan"
        )
      ) {
        return node;
      }

      node =
        node.parentElement;
    }

    return null;
  }


  function parsePreviewPeriodFromModal() {
    const modal =
      getVisiblePreviewModal();

    if (!modal) {
      return {
        start: "",
        end: ""
      };
    }

    const text =
      modal.textContent || "";

    /*
      Handles strings such as:
      Oct 16, 2026 – Nov 12, 2026
    */

    const months =
      "(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)";

    const regex =
      new RegExp(
        `${months}\\s+\\d{1,2},\\s+\\d{4}\\s*[–—-]\\s*${months}\\s+\\d{1,2},\\s+\\d{4}`,
        "g"
      );

    const matches =
      text.match(regex);

    if (
      !matches ||
      !matches.length
    ) {
      return {
        start: "",
        end: ""
      };
    }

    const target =
      matches[
        matches.length - 1
      ];

    const parts =
      target.split(
        /\s*[–—-]\s*/
      );

    return {
      start:
        normalizeDate(
          parts[0]
        ),

      end:
        normalizeDate(
          parts[1]
        )
    };
  }


  /* ============================================================
     CREATE PLAN_DATA
  ============================================================ */

  function buildNextPlanData(
    preview
  ) {
    const settings =
      currentSettings();

    const ending =
      getVerifiedEndingBalance();

    const paychecks =
      getPreviewIncome(
        preview
      );

    const expenses =
      getPreviewExpenses(
        preview
      );

    if (!paychecks.length) {
      throw new Error(
        "No recurring paychecks were found for the next planning period."
      );
    }

    const bills =
      expenses.map(
        expense => ({
          name:
            expense.name,

          amount:
            expense.amount,

          type:
            expense.type,

          priority:
            expense.priority,

          dueDate:
            expense.type ===
            "fixed"
              ? expense.date
              : "",

          flexRule:
            expense.type ===
            "flexible"
              ? expense.flexRule
              : "any",

          byDate:
            expense.byDate || "",

          startDate:
            expense.startDate || "",

          endDate:
            expense.endDate || ""
        })
      );

    /*
      IMPORTANT:
      This matches the existing plans.js plan_data structure.

      plans.js currently saves:
      {
        version,
        startingBalance,
        protectedCushion,
        groceries,
        gas,
        other,
        paychecks,
        bills
      }
    */

    return {
      version: 1,

      startingBalance:
        ending.amount,

      protectedCushion:
        settings.protectedCushion,

      groceries: {
        amount:
          settings.groceries.amount,

        mode:
          settings.groceries.mode
      },

      gas: {
        amount:
          settings.gas.amount,

        mode:
          settings.gas.mode
      },

      other: {
        amount:
          settings.other.amount,

        mode:
          settings.other.mode
      },

      paychecks:
        paychecks.map(
          paycheck => ({
            name:
              paycheck.name,

            date:
              paycheck.date,

            amount:
              paycheck.amount
          })
        ),

      bills
    };
  }


  /* ============================================================
     DETERMINE NEXT PERIOD
  ============================================================ */

  function determineNextPeriod(
    preview,
    planData
  ) {
    let start =
      getPreviewStart(
        preview
      );

    let end =
      getPreviewEnd(
        preview
      );

    if (
      !start ||
      !end
    ) {
      const modalPeriod =
        parsePreviewPeriodFromModal();

      start =
        start ||
        modalPeriod.start;

      end =
        end ||
        modalPeriod.end;
    }

    /*
      Final fallback:
      use first/last generated paycheck/bill dates.
    */

    const dates = [
      ...planData.paychecks.map(
        item => item.date
      ),

      ...planData.bills.map(
        item =>
          item.dueDate ||
          item.byDate ||
          item.endDate ||
          item.startDate
      )
    ]
      .filter(Boolean)
      .sort();

    if (
      !start &&
      dates.length
    ) {
      start =
        dates[0];
    }

    if (
      !end &&
      dates.length
    ) {
      end =
        dates[
          dates.length - 1
        ];
    }

    if (
      !start ||
      !end
    ) {
      throw new Error(
        "Stretch My Check could not determine the next planning period."
      );
    }

    return {
      start,
      end
    };
  }


  /* ============================================================
     PLAN NAME
  ============================================================ */

  function buildPlanName(
    period
  ) {
    const start =
      parseLocalDate(
        period.start
      );

    const end =
      parseLocalDate(
        period.end
      );

    if (
      !start ||
      !end
    ) {
      return "Next Paycheck Plan";
    }

    const startText =
      start.toLocaleDateString(
        "en-US",
        {
          month: "short",
          day: "numeric"
        }
      );

    const endText =
      end.toLocaleDateString(
        "en-US",
        {
          month: "short",
          day: "numeric",
          year: "numeric"
        }
      );

    return `${startText} – ${endText} Plan`;
  }


  /* ============================================================
     FIND CURRENT SOURCE SAVED PLAN
  ============================================================ */

  function paycheckSignature(
    paychecks
  ) {
    return paychecks
      .map(
        item =>
          [
            normalizeDate(
              item.date
            ),
            moneyNumber(
              item.amount
            ).toFixed(2)
          ].join("|")
      )
      .sort()
      .join(";");
  }


  function scoreSourcePlan(
    savedPlan,
    current
  ) {
    const data =
      savedPlan?.plan_data;

    if (!data) {
      return -1;
    }

    let score = 0;

    const savedPaychecks =
      Array.isArray(
        data.paychecks
      )
        ? data.paychecks
        : [];

    if (
      paycheckSignature(
        savedPaychecks
      ) ===
      paycheckSignature(
        current.paychecks
      )
    ) {
      score += 100;
    }

    if (
      moneyNumber(
        data.startingBalance
      ) ===
      current.startingBalance
    ) {
      score += 20;
    }

    if (
      moneyNumber(
        data.protectedCushion
      ) ===
      current.protectedCushion
    ) {
      score += 10;
    }

    /*
      Match bill dates/amounts as another signal.
    */

    const savedBillSignature =
      (
        Array.isArray(
          data.bills
        )
          ? data.bills
          : []
      )
        .map(
          bill =>
            [
              normalizeDate(
                bill.dueDate
              ),
              moneyNumber(
                bill.amount
              ).toFixed(2),
              String(
                bill.name || ""
              )
                .trim()
                .toLowerCase()
            ].join("|")
        )
        .sort()
        .join(";");

    const currentBillSignature =
      current.bills
        .map(
          bill =>
            [
              normalizeDate(
                bill.dueDate
              ),
              moneyNumber(
                bill.amount
              ).toFixed(2),
              String(
                bill.name || ""
              )
                .trim()
                .toLowerCase()
            ].join("|")
        )
        .sort()
        .join(";");

    if (
      savedBillSignature &&
      savedBillSignature ===
      currentBillSignature
    ) {
      score += 30;
    }

    return score;
  }


  async function findSourcePlan(
    userId
  ) {
    const supabase =
      getSupabase();

    const {
      data,
      error
    } =
      await supabase
        .from("saved_plans")
        .select(
          "id, plan_name, plan_data, created_at, updated_at"
        )
        .eq(
          "user_id",
          userId
        )
        .order(
          "updated_at",
          {
            ascending: false
          }
        );

    if (error) {
      throw error;
    }

    if (
      !Array.isArray(data) ||
      !data.length
    ) {
      throw new Error(
        "Save your current plan before creating the next one."
      );
    }

    const current = {
      startingBalance:
        moneyNumber(
          getInputValue(
            "startingBalance"
          )
        ),

      protectedCushion:
        moneyNumber(
          getInputValue(
            "protectedCushion"
          )
        ),

      paychecks:
        currentPaychecks(),

      bills:
        currentBills()
    };

    const ranked =
      data
        .map(
          plan => ({
            plan,
            score:
              scoreSourcePlan(
                plan,
                current
              )
          })
        )
        .sort(
          (a, b) => {
            if (
              b.score !==
              a.score
            ) {
              return (
                b.score -
                a.score
              );
            }

            return (
              new Date(
                b.plan.updated_at ||
                b.plan.created_at
              ).getTime() -
              new Date(
                a.plan.updated_at ||
                a.plan.created_at
              ).getTime()
            );
          }
        );

    /*
      Because plans.js auto-loads the most recently updated plan,
      the latest plan is normally the current source plan.

      The scoring above gives preference to an exact current-form
      match so we do not blindly assume that when another saved
      plan happens to exist.
    */

    const winner =
      ranked[0];

    if (
      !winner ||
      winner.score < 100
    ) {
      throw new Error(
        "I couldn't safely match the current planner to a saved plan. Save or update the current plan first, then try again."
      );
    }

    return winner.plan;
  }


  /* ============================================================
     DUPLICATE ROLLOVER CHECK
  ============================================================ */

  async function findExistingRollover(
    userId,
    sourcePlanId
  ) {
    const supabase =
      getSupabase();

    const {
      data,
      error
    } =
      await supabase
        .from(
          "plan_rollovers"
        )
        .select(
          "id, source_plan_id, next_plan_id, source_plan_name, next_plan_name, source_period_end, next_period_start, carried_balance, protected_cushion, status, created_at, updated_at"
        )
        .eq(
          "user_id",
          userId
        )
        .eq(
          "source_plan_id",
          sourcePlanId
        )
        .neq(
          "status",
          "cancelled"
        )
        .maybeSingle();

    if (error) {
      throw error;
    }

    return data || null;
  }


  /* ============================================================
     LOAD EXISTING NEXT PLAN
  ============================================================ */

  async function fetchSavedPlan(
    userId,
    planId
  ) {
    if (!planId) {
      return null;
    }

    const supabase =
      getSupabase();

    const {
      data,
      error
    } =
      await supabase
        .from(
          "saved_plans"
        )
        .select(
          "id, plan_name, plan_data, created_at, updated_at"
        )
        .eq(
          "user_id",
          userId
        )
        .eq(
          "id",
          planId
        )
        .maybeSingle();

    if (error) {
      throw error;
    }

    return data || null;
  }


  /* ============================================================
     CREATE SAVED PLAN
  ============================================================ */

  async function insertNextPlan(
    userId,
    planName,
    planData
  ) {
    const supabase =
      getSupabase();

    const now =
      new Date().toISOString();

    const {
      data,
      error
    } =
      await supabase
        .from(
          "saved_plans"
        )
        .insert({
          user_id:
            userId,

          plan_name:
            planName,

          plan_data:
            planData,

          updated_at:
            now
        })
        .select(
          "id, plan_name, plan_data, created_at, updated_at"
        )
        .single();

    if (error) {
      throw error;
    }

    if (!data?.id) {
      throw new Error(
        "The next plan was not returned after saving."
      );
    }

    return data;
  }


  /* ============================================================
     CREATE ROLLOVER LINK
  ============================================================ */

  async function insertRolloverLink({
    userId,
    sourcePlan,
    nextPlan,
    period,
    carriedBalance,
    protectedCushion
  }) {
    const supabase =
      getSupabase();

    const sourcePeriod =
      currentPeriod();

    const {
      data,
      error
    } =
      await supabase
        .from(
          "plan_rollovers"
        )
        .insert({
          user_id:
            userId,

          source_plan_id:
            sourcePlan.id,

          next_plan_id:
            nextPlan.id,

          source_plan_name:
            sourcePlan.plan_name ||
            "Current Plan",

          next_plan_name:
            nextPlan.plan_name,

          source_period_end:
            sourcePeriod.end,

          next_period_start:
            period.start,

          carried_balance:
            carriedBalance,

          protected_cushion:
            protectedCushion,

          status:
            "completed",

          updated_at:
            new Date().toISOString()
        })
        .select(
          "id, source_plan_id, next_plan_id, status"
        )
        .single();

    if (error) {
      throw error;
    }

    return data;
  }


  /* ============================================================
     CLEANUP ORPHAN
  ============================================================ */

  async function deleteSavedPlanQuietly(
    userId,
    planId
  ) {
    try {
      const supabase =
        getSupabase();

      await supabase
        .from(
          "saved_plans"
        )
        .delete()
        .eq(
          "user_id",
          userId
        )
        .eq(
          "id",
          planId
        );

    } catch (error) {
      console.error(
        "Could not clean up orphaned next plan:",
        error
      );
    }
  }


  /* ============================================================
     LOAD PLAN INTO MY PLAN
  ============================================================ */

  async function loadCreatedPlan(
    plan
  ) {
    if (
      window
        .StretchMyCheckPlans &&
      typeof window
        .StretchMyCheckPlans
        .loadPlan ===
        "function"
    ) {
      await window
        .StretchMyCheckPlans
        .loadPlan(
          plan
        );

      return true;
    }

    return false;
  }


  function goToMyPlan() {
    if (
      window.location.hash !==
      "#plan"
    ) {
      window.location.hash =
        "#plan";
    }
  }


  async function optimizeLoadedPlan() {
    await sleep(350);

    const button =
      document.getElementById(
        "optimizeButton"
      );

    if (button) {
      button.click();
    }

    await sleep(250);

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
  }


  /* ============================================================
     CLOSE PREVIEW MODAL
  ============================================================ */

  function closePreviewModal() {
    const modal =
      getVisiblePreviewModal();

    if (!modal) {
      return;
    }

    const buttons = [
      ...modal.querySelectorAll(
        "button"
      )
    ];

    const close =
      buttons.find(
        button => {
          const text =
            button.textContent
              ?.trim()
              .toLowerCase();

          return (
            text === "close" ||
            text === "×" ||
            text === "x"
          );
        }
      );

    if (close) {
      close.click();
    }
  }


  /* ============================================================
     EXISTING ROLLOVER HANDLER
  ============================================================ */

  async function handleExistingRollover(
    userId,
    existing
  ) {
    if (
      !existing?.next_plan_id
    ) {
      throw new Error(
        "This plan already has a rollover record, but its next plan could not be identified."
      );
    }

    const existingPlan =
      await fetchSavedPlan(
        userId,
        existing.next_plan_id
      );

    if (!existingPlan) {
      throw new Error(
        "This plan was already rolled forward, but the linked next plan is missing."
      );
    }

    const shouldOpen =
      window.confirm(
        `This plan already created "${existingPlan.plan_name}".\n\nOpen that plan instead?`
      );

    if (!shouldOpen) {
      return;
    }

    closePreviewModal();

    goToMyPlan();

    await sleep(120);

    const loaded =
      await loadCreatedPlan(
        existingPlan
      );

    if (!loaded) {
      throw new Error(
        "The existing next plan was found, but Stretch My Check could not load it."
      );
    }

    await optimizeLoadedPlan();

    showToast(
      `Opened ${existingPlan.plan_name}.`
    );
  }


  /* ============================================================
     MAIN CREATE FLOW
  ============================================================ */

  async function createNextPlan() {
    if (createInProgress) {
      return;
    }

    createInProgress =
      true;

    let newPlan =
      null;

    let user =
      null;

    try {
      user =
        await getUser();

      /*
        STEP 1
        Match the planner to its current saved source plan.
      */

      const sourcePlan =
        await findSourcePlan(
          user.id
        );


      /*
        STEP 2
        Check duplicate protection BEFORE inserting anything.
      */

      const existing =
        await findExistingRollover(
          user.id,
          sourcePlan.id
        );

      if (existing) {
        await handleExistingRollover(
          user.id,
          existing
        );

        return;
      }


      /*
        STEP 3
        Get the existing verified next-plan preview.
      */

      const preview =
        await getRolloverPreview();


      /*
        STEP 4
        Build the exact plan_data structure plans.js expects.
      */

      const planData =
        buildNextPlanData(
          preview
        );


      /*
        STEP 5
        Determine next planning period.
      */

      const period =
        determineNextPeriod(
          preview,
          planData
        );


      /*
        STEP 6
        Give the plan a readable name.
      */

      const planName =
        buildPlanName(
          period
        );


      /*
        STEP 7
        Create the new saved plan.
      */

      newPlan =
        await insertNextPlan(
          user.id,
          planName,
          planData
        );


      /*
        STEP 8
        Link source plan -> new plan.

        If this fails, the catch block deletes newPlan so we
        don't leave an orphan in Saved Plans.
      */

      await insertRolloverLink({
        userId:
          user.id,

        sourcePlan,

        nextPlan:
          newPlan,

        period,

        carriedBalance:
          planData.startingBalance,

        protectedCushion:
          planData.protectedCushion
      });


      /*
        STEP 9
        Close preview and load the newly created plan.
      */

      closePreviewModal();

      goToMyPlan();

      await sleep(150);

      const loaded =
        await loadCreatedPlan(
          newPlan
        );

      if (!loaded) {
        throw new Error(
          "The next plan was saved successfully, but Stretch My Check could not load it automatically."
        );
      }


      /*
        STEP 10
        Optimize the newly loaded plan.
      */

      await optimizeLoadedPlan();


      /*
        STEP 11
        Tell other modules a rollover was completed.
      */

      window.dispatchEvent(
        new CustomEvent(
          "stretchmycheck:rollover-created",
          {
            detail: {
              version:
                CREATE_VERSION,

              sourcePlanId:
                sourcePlan.id,

              nextPlanId:
                newPlan.id,

              nextPlanName:
                newPlan.plan_name,

              periodStart:
                period.start,

              periodEnd:
                period.end,

              carriedBalance:
                planData.startingBalance
            }
          }
        )
      );


      showToast(
        `${newPlan.plan_name} created successfully.`
      );


      console.info(
        "Stretch My Check next plan created:",
        {
          sourcePlanId:
            sourcePlan.id,

          nextPlanId:
            newPlan.id,

          nextPlanName:
            newPlan.plan_name,

          period,

          startingBalance:
            planData.startingBalance,

          paychecks:
            planData.paychecks.length,

          bills:
            planData.bills.length
        }
      );


    } catch (error) {
      console.error(
        "Stretch My Check Create Next Plan failed:",
        error
      );

      /*
        Only clean up when a new saved plan exists but the
        rollover relationship was NOT successfully completed.

        Check whether the link exists before deleting.
      */

      if (
        user?.id &&
        newPlan?.id
      ) {
        try {
          const supabase =
            getSupabase();

          const {
            data: linked
          } =
            await supabase
              .from(
                "plan_rollovers"
              )
              .select(
                "id"
              )
              .eq(
                "user_id",
                user.id
              )
              .eq(
                "next_plan_id",
                newPlan.id
              )
              .maybeSingle();

          if (!linked) {
            await deleteSavedPlanQuietly(
              user.id,
              newPlan.id
            );
          }

        } catch (
          cleanupCheckError
        ) {
          console.error(
            "Could not verify rollover cleanup state:",
            cleanupCheckError
          );
        }
      }

      showToast(
        error?.message ||
        "Stretch My Check couldn't create the next plan.",
        "error"
      );

    } finally {
      createInProgress =
        false;

      refreshCreateButtons();
    }
  }


  /* ============================================================
     BUTTON DETECTION
  ============================================================ */

  function isCreateButton(
    button
  ) {
    if (!button) {
      return false;
    }

    const text =
      button.textContent
        ?.replace(/\s+/g, " ")
        .trim()
        .toLowerCase();

    return (
      text ===
      "create next plan"
    );
  }


  function prepareButton(
    button
  ) {
    if (
      !isCreateButton(
        button
      )
    ) {
      return;
    }

    if (
      button.dataset
        .smcCreateNextPlan ===
      "true"
    ) {
      return;
    }

    button.dataset
      .smcCreateNextPlan =
      "true";

    /*
      rollover.js intentionally left this disabled while the
      feature was preview-only. It is now safe to activate.
    */

    button.disabled =
      false;

    button.removeAttribute(
      "disabled"
    );

    button.style.opacity =
      "1";

    button.style.cursor =
      "pointer";

    button.title =
      "Create and save your next paycheck plan";

    /*
      Capture phase lets this creator own the click even if
      the original preview-only module attached a listener.
    */

    button.addEventListener(
      "click",
      event => {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        if (
          createInProgress
        ) {
          return;
        }

        const confirmed =
          window.confirm(
            "Create this next plan?\n\nStretch My Check will save it as a new plan. Your current plan will stay unchanged."
          );

        if (!confirmed) {
          return;
        }

        createNextPlan();
      },
      true
    );
  }


  function refreshCreateButtons() {
    [
      ...document.querySelectorAll(
        "button"
      )
    ].forEach(
      prepareButton
    );
  }


  /* ============================================================
     OBSERVE MODALS
  ============================================================ */

  const observer =
    new MutationObserver(
      () => {
        refreshCreateButtons();
      }
    );


  /* ============================================================
     PUBLIC API
  ============================================================ */

  window.StretchMyCheckRolloverCreate = {
    create:
      createNextPlan,

    refresh:
      refreshCreateButtons,

    version:
      CREATE_VERSION
  };


  /* ============================================================
     START
  ============================================================ */

  function start() {
    refreshCreateButtons();

    observer.observe(
      document.documentElement,
      {
        childList: true,
        subtree: true
      }
    );

    console.info(
      `Stretch My Check Create Next Plan v${CREATE_VERSION} ready.`
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