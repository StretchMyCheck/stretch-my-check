(() => {
  "use strict";

  /*
  =========================================================
   STRETCH MY CHECK
   ROLLOVER BALANCE BRIDGE
   Version 1
  =========================================================

   PURPOSE
   ---------------------------------------------------------
   Gives the rollover system one authoritative method for
   determining the CURRENT plan's true ending cash balance.

   Priority:
   1. Forecast API ending balance
   2. Optimizer's explicit ending/final balance
   3. Last optimizer running balance
   4. Mathematical fallback from the current planner

   IMPORTANT:
   safeRemaining is intentionally NOT used as the rollover
   balance because "safe to spend" and "cash remaining at
   the end of the plan" are different concepts.
  =========================================================
  */


  /* =======================================================
     HELPERS
  ======================================================= */

  function numberOrNull(value) {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return null;
    }

    const parsed =
      Number(value);

    return Number.isFinite(parsed)
      ? parsed
      : null;
  }


  function numberValue(value) {
    const parsed =
      parseFloat(value);

    return Number.isFinite(parsed)
      ? parsed
      : 0;
  }


  function getValue(id) {
    return (
      document.getElementById(id)
        ?.value || ""
    );
  }


  function getPlannerPaychecks() {
    return [
      ...document.querySelectorAll(
        ".paycheck-entry"
      )
    ]
      .map(
        entry => ({
          amount:
            numberValue(
              entry.querySelector(
                ".paycheck-amount"
              )?.value
            ),

          date:
            entry.querySelector(
              ".paycheck-date"
            )?.value || ""
        })
      )
      .filter(
        item =>
          item.date
      );
  }


  function getPlannerBills() {
    return [
      ...document.querySelectorAll(
        ".bill-entry"
      )
    ]
      .map(
        entry => ({
          amount:
            numberValue(
              entry.querySelector(
                ".bill-amount"
              )?.value
            ),

          name:
            entry.querySelector(
              ".bill-name"
            )?.value || ""
        })
      )
      .filter(
        item =>
          item.name ||
          item.amount
      );
  }


  function getLivingExpenseTotal(
    paycheckCount
  ) {
    const livingItems = [
      {
        amount:
          numberValue(
            getValue(
              "groceryAmount"
            )
          ),

        mode:
          getValue(
            "groceryMode"
          )
      },

      {
        amount:
          numberValue(
            getValue(
              "gasAmount"
            )
          ),

        mode:
          getValue(
            "gasMode"
          )
      },

      {
        amount:
          numberValue(
            getValue(
              "otherAmount"
            )
          ),

        mode:
          getValue(
            "otherMode"
          )
      }
    ];


    return livingItems.reduce(
      (
        total,
        item
      ) => {

        const perPaycheck =
          item.mode === "perPaycheck" ||
          item.mode === "per_paycheck" ||
          item.mode === "paycheck";


        return (
          total +
          (
            perPaycheck
              ? item.amount *
                Math.max(
                  paycheckCount,
                  1
                )
              : item.amount
          )
        );

      },
      0
    );
  }


  /* =======================================================
     FORECAST API
  ======================================================= */

  function readForecastAPI() {
    const forecast =
      window.StretchMyCheckForecast;

    if (!forecast) {
      return null;
    }


    /*
      We support several possible public API names so this
      bridge remains compatible with the existing forecast
      module without requiring us to rewrite forecast.js.
    */

    const methods = [
      "getSnapshot",
      "getForecast",
      "getState",
      "calculate"
    ];


    for (
      const method of methods
    ) {

      if (
        typeof forecast[method] !==
        "function"
      ) {
        continue;
      }


      try {

        const result =
          forecast[method]();


        /*
          This bridge only consumes synchronous snapshots.
          Ignore Promises if a future Forecast version
          becomes asynchronous.
        */

        if (
          result &&
          typeof result.then ===
          "function"
        ) {
          continue;
        }


        if (result) {
          const balance =
            extractEndingBalance(
              result
            );

          if (
            balance !== null
          ) {
            return {
              amount:
                balance,

              source:
                "forecast"
            };
          }
        }

      } catch (error) {

        console.warn(
          `Stretch My Check rollover could not read forecast.${method}():`,
          error
        );

      }
    }


    /*
      Some versions may expose the current snapshot directly.
    */

    const directObjects = [
      forecast.snapshot,
      forecast.state,
      forecast.currentForecast,
      forecast.latestForecast
    ];


    for (
      const object of directObjects
    ) {

      if (!object) {
        continue;
      }


      const balance =
        extractEndingBalance(
          object
        );


      if (
        balance !== null
      ) {
        return {
          amount:
            balance,

          source:
            "forecast"
        };
      }
    }


    return null;
  }


  /* =======================================================
     GENERIC ENDING-BALANCE EXTRACTION
  ======================================================= */

  function extractEndingBalance(
    object
  ) {
    if (!object) {
      return null;
    }


    const directFields = [
      "forecastEndingBalance",
      "endingBalance",
      "finalBalance",
      "projectedEndingBalance",
      "projectedBalance",
      "endBalance"
    ];


    for (
      const field of directFields
    ) {

      const value =
        numberOrNull(
          object[field]
        );


      if (
        value !== null
      ) {
        return value;
      }
    }


    /*
      Search common nested summary objects.
    */

    const nestedObjects = [
      object.summary,
      object.totals,
      object.forecast,
      object.result,
      object.resultsSummary
    ];


    for (
      const nested of nestedObjects
    ) {

      if (!nested) {
        continue;
      }


      for (
        const field of directFields
      ) {

        const value =
          numberOrNull(
            nested[field]
          );


        if (
          value !== null
        ) {
          return value;
        }
      }
    }


    return null;
  }


  /* =======================================================
     OPTIMIZER DATA
  ======================================================= */

  function readOptimizerData() {
    const planner =
      window.latestPlannerData;

    if (!planner) {
      return null;
    }


    /*
      Explicit ending balance fields are safe.
      Notice safeRemaining is NOT in this list.
    */

    const explicit =
      extractEndingBalance(
        planner
      );


    if (
      explicit !== null
    ) {
      return {
        amount:
          explicit,

        source:
          "optimizer"
      };
    }


    /*
      Try the final paycheck/result card.
    */

    const arrays = [
      planner.results,
      planner.paycheckResults,
      planner.weeks,
      planner.plan,
      planner.timeline
    ];


    for (
      const array of arrays
    ) {

      if (
        !Array.isArray(array) ||
        !array.length
      ) {
        continue;
      }


      const last =
        array[
          array.length - 1
        ];


      const candidates = [
        last?.endingBalance,
        last?.finalBalance,
        last?.runningBalance,
        last?.balance,
        last?.remainingBalance
      ];


      for (
        const candidate of
        candidates
      ) {

        const value =
          numberOrNull(
            candidate
          );


        if (
          value !== null
        ) {
          return {
            amount:
              value,

            source:
              "optimizer-running-balance"
          };
        }
      }
    }


    return null;
  }


  /* =======================================================
     MATHEMATICAL FALLBACK
  ======================================================= */

  function calculateFallback() {
    const startingBalance =
      numberValue(
        getValue(
          "startingBalance"
        )
      );


    const paychecks =
      getPlannerPaychecks();


    const bills =
      getPlannerBills();


    const income =
      paychecks.reduce(
        (
          total,
          paycheck
        ) =>
          total +
          paycheck.amount,
        0
      );


    const expenses =
      bills.reduce(
        (
          total,
          bill
        ) =>
          total +
          bill.amount,
        0
      );


    const living =
      getLivingExpenseTotal(
        paychecks.length
      );


    /*
      Protected cushion is NOT subtracted here.

      The cushion is money that remains in the user's cash
      balance. It is protected from spending, but it does
      not disappear from the account.

      Therefore:

      ending cash =
      starting cash
      + income
      - bills
      - living expenses
    */

    const amount =
      startingBalance +
      income -
      expenses -
      living;


    return {
      amount,
      source:
        "planner-math",

      details: {
        startingBalance,
        income,
        expenses,
        living
      }
    };
  }


  /* =======================================================
     AUTHORITATIVE BALANCE
  ======================================================= */

  function getEndingBalance() {
    /*
      FIRST:
      Money Forecast.

      Forecast is the preferred source because the rollover
      should start with the same amount the user already sees
      as "Forecast Ending Balance."
    */

    const forecast =
      readForecastAPI();


    if (forecast) {
      return forecast;
    }


    /*
      SECOND:
      Planner optimizer.
    */

    const optimizer =
      readOptimizerData();


    if (optimizer) {
      return optimizer;
    }


    /*
      THIRD:
      Exact current-form math fallback.
    */

    return calculateFallback();
  }


  /* =======================================================
     PATCH ROLLOVER PREVIEW
  ======================================================= */

  async function calculateCorrectedPreview() {
    const rollover =
      window.StretchMyCheckRollover;


    if (
      !rollover ||
      typeof rollover.calculate !==
      "function"
    ) {
      throw new Error(
        "The Next Plan module is not ready yet."
      );
    }


    /*
      Get the already-working rollover preview.

      We keep:
      - dates
      - recurring occurrences
      - settings
      - one-time bill exclusion

      We replace ONLY its carry-forward amount.
    */

    const preview =
      await rollover.calculate();


    if (
      !preview ||
      preview.error
    ) {
      return preview;
    }


    const ending =
      getEndingBalance();


    preview.carriedBalance =
      ending.amount;


    preview.carriedBalanceSource =
      ending.source;


    preview.preliminaryRoom =
      ending.amount +
      numberValue(
        preview.recurringIncome
      ) -
      numberValue(
        preview.recurringExpenses
      );


    preview.balanceDetails =
      ending.details || null;


    return preview;
  }


  /* =======================================================
     CARD DISPLAY PATCH
  ======================================================= */

  function updateCardBalance() {
    const target =
      document.getElementById(
        "smcRolloverCarryMini"
      );


    if (!target) {
      return;
    }


    const ending =
      getEndingBalance();


    target.textContent =
      new Intl.NumberFormat(
        "en-US",
        {
          style: "currency",
          currency: "USD"
        }
      ).format(
        ending.amount
      );


    target.dataset.balanceSource =
      ending.source;
  }


  /* =======================================================
     PREVIEW BUTTON INTERCEPTION
  ======================================================= */

  function installPreviewOverride() {
    const oldButton =
      document.getElementById(
        "smcRolloverPreviewButton"
      );


    if (!oldButton) {
      return false;
    }


    if (
      oldButton.dataset
        .balanceBridgeInstalled ===
      "true"
    ) {
      return true;
    }


    /*
      Clone removes the original rollover.js click listener.

      The button keeps all styling and IDs, but this bridge
      now controls preview creation.
    */

    const button =
      oldButton.cloneNode(
        true
      );


    button.dataset
      .balanceBridgeInstalled =
      "true";


    oldButton.replaceWith(
      button
    );


    button.addEventListener(
      "click",
      async () => {

        button.disabled =
          true;

        button.textContent =
          "Building Preview...";


        try {

          const preview =
            await calculateCorrectedPreview();


          /*
            rollover.js already owns the modal renderer,
            but renderPreview is private. To avoid rewriting
            the entire working modal here, temporarily patch
            the data returned by rollover.calculate and call
            rollover.preview().
          */

          const rollover =
            window.StretchMyCheckRollover;


          const originalCalculate =
            rollover.calculate;


          rollover.calculate =
            async () =>
              preview;


          try {

            await rollover.preview();

          } finally {

            rollover.calculate =
              originalCalculate;

          }


        } catch (error) {

          console.error(
            "Corrected Next Plan preview failed:",
            error
          );


          alert(
            "Stretch My Check couldn't calculate the next-plan balance. Please optimize the current plan and try again."
          );


        } finally {

          button.disabled =
            false;

          button.textContent =
            "Preview Next Plan";
        }

      }
    );


    return true;
  }


  /* =======================================================
     IMPORTANT:
     DIRECT PREVIEW OVERRIDE
  ======================================================= */

  /*
    rollover.js's private openPreview() calls its private
    buildPreview(), so changing the public calculate method
    alone cannot change that internal call.

    We therefore replace the public preview method with a
    small corrected version that updates the underlying
    latestPlannerData fields BEFORE rollover.js builds the
    preview.

    But we do NOT want to mutate safeRemaining.

    The cleaner solution is to expose the corrected ending
    balance globally and let the patched button temporarily
    supply an explicit endingBalance field.
  */


  async function openCorrectedPreview() {
    const rollover =
      window.StretchMyCheckRollover;


    if (
      !rollover ||
      typeof rollover.preview !==
      "function"
    ) {
      return;
    }


    const ending =
      getEndingBalance();


    /*
      rollover.js checks endingBalance BEFORE safeRemaining.

      We temporarily provide endingBalance to its existing
      preview engine, then restore the original object state.

      This leaves every other planner calculation untouched.
    */

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

      await rollover.preview();

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


  function installFinalButtonOverride() {
    const oldButton =
      document.getElementById(
        "smcRolloverPreviewButton"
      );


    if (!oldButton) {
      return false;
    }


    if (
      oldButton.dataset
        .endingBalanceOverride ===
      "true"
    ) {
      return true;
    }


    const button =
      oldButton.cloneNode(
        true
      );


    button.dataset
      .endingBalanceOverride =
      "true";


    oldButton.replaceWith(
      button
    );


    button.addEventListener(
      "click",
      openCorrectedPreview
    );


    return true;
  }


  /* =======================================================
     REFRESH
  ======================================================= */

  function refresh() {
    updateCardBalance();

    installFinalButtonOverride();
  }


  const events = [
    "stretchmycheck:plan-loaded",
    "stretchmycheck:plan-auto-saved",
    "stretchmycheck:recurring-imported",
    "stretchmycheck:recurring-updated"
  ];


  events.forEach(
    eventName => {

      window.addEventListener(
        eventName,
        () => {

          window.setTimeout(
            refresh,
            120
          );

        }
      );

    }
  );


  document.addEventListener(
    "change",
    event => {

      if (
        event.target.closest(
          "#smcPlanPage"
        )
      ) {

        window.setTimeout(
          refresh,
          80
        );

      }

    }
  );


  /* =======================================================
     PUBLIC API
  ======================================================= */

  window.StretchMyCheckRolloverBalance = {

    getEndingBalance,

    calculateFallback,

    refresh,

    getSource:
      () =>
        getEndingBalance()
          .source

  };


  /* =======================================================
     START
  ======================================================= */

  function start() {
    if (
      installFinalButtonOverride()
    ) {
      refresh();

      console.info(
        "Stretch My Check rollover balance bridge ready."
      );

      return;
    }


    const observer =
      new MutationObserver(
        () => {

          if (
            installFinalButtonOverride()
          ) {
            refresh();

            observer.disconnect();

            console.info(
              "Stretch My Check rollover balance bridge ready."
            );
          }

        }
      );


    observer.observe(
      document.documentElement,
      {
        childList: true,
        subtree: true
      }
    );
  }


  start();

})();