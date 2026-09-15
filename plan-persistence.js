(() => {
  "use strict";

  /*
  =========================================================
   STRETCH MY CHECK
   My Plan Automatic Persistence
   Version 1
  =========================================================

   Purpose:
   - Tracks the currently loaded saved plan.
   - Watches for recurring-finance imports.
   - Saves the newly imported paycheck/bill rows into
     the SAME saved plan in Supabase.
   - Makes recurring imports survive hard refresh.
   - Does NOT create duplicate saved plans.
   - Does NOT automatically create a saved plan when
     the user is working on an unsaved planner.
   - Does NOT change Goals, Debt, Recurring templates,
     Dashboard, or Forecast.
  =========================================================
  */


  /* =======================================================
     SUPABASE
  ======================================================= */

  const supabaseClient =
    window.supabaseClient;

  if (!supabaseClient) {
    console.error(
      "Stretch My Check Plan Persistence: Supabase client is unavailable."
    );

    return;
  }


  /* =======================================================
     STATE
  ======================================================= */

  let currentPlanId = null;

  let currentPlanName = "";

  let saveInProgress = false;

  let queuedSave = false;


  /* =======================================================
     HELPERS
  ======================================================= */

  function getValue(id) {
    return (
      document.getElementById(id)
        ?.value || ""
    );
  }


  function readPaychecks() {
    return [
      ...document.querySelectorAll(
        ".paycheck-entry"
      )
    ].map(
      entry => ({
        name:
          entry.querySelector(
            ".paycheck-name"
          )?.value || "",

        date:
          entry.querySelector(
            ".paycheck-date"
          )?.value || "",

        amount:
          entry.querySelector(
            ".paycheck-amount"
          )?.value || ""
      })
    );
  }


  function readBills() {
    return [
      ...document.querySelectorAll(
        ".bill-entry"
      )
    ].map(
      entry => ({
        name:
          entry.querySelector(
            ".bill-name"
          )?.value || "",

        amount:
          entry.querySelector(
            ".bill-amount"
          )?.value || "",

        type:
          entry.querySelector(
            ".bill-type"
          )?.value ||
          "fixed",

        priority:
          entry.querySelector(
            ".bill-priority"
          )?.value ||
          "essential",

        dueDate:
          entry.querySelector(
            ".bill-due-date"
          )?.value || "",

        flexRule:
          entry.querySelector(
            ".flex-rule"
          )?.value ||
          "any",

        byDate:
          entry.querySelector(
            ".flex-by-date"
          )?.value || "",

        startDate:
          entry.querySelector(
            ".flex-start-date"
          )?.value || "",

        endDate:
          entry.querySelector(
            ".flex-end-date"
          )?.value || ""
      })
    );
  }


  /* =======================================================
     BUILD PLAN DATA

     This intentionally matches the structure used by
     plans.js so the normal saved-plan loader can restore
     everything after a refresh.
  ======================================================= */

  function buildPlanData() {
    return {
      version: 1,

      startingBalance:
        getValue(
          "startingBalance"
        ),

      protectedCushion:
        getValue(
          "protectedCushion"
        ),

      groceries: {
        amount:
          getValue(
            "groceryAmount"
          ),

        mode:
          getValue(
            "groceryMode"
          ) ||
          "total"
      },

      gas: {
        amount:
          getValue(
            "gasAmount"
          ),

        mode:
          getValue(
            "gasMode"
          ) ||
          "total"
      },

      other: {
        amount:
          getValue(
            "otherAmount"
          ),

        mode:
          getValue(
            "otherMode"
          ) ||
          "total"
      },

      paychecks:
        readPaychecks(),

      bills:
        readBills()
    };
  }


  /* =======================================================
     USER
  ======================================================= */

  async function getUser() {
    try {
      const {
        data,
        error
      } =
        await supabaseClient.auth
          .getUser();

      if (error) {
        console.error(
          "Plan Persistence getUser error:",
          error
        );

        return null;
      }

      return (
        data?.user ||
        null
      );

    } catch (error) {
      console.error(
        "Plan Persistence could not read user:",
        error
      );

      return null;
    }
  }


  /* =======================================================
     SAVE CURRENT LOADED PLAN
  ======================================================= */

  async function persistCurrentPlan(
    reason = "automatic"
  ) {

    /*
      Never create a new saved plan automatically.

      We only persist when plans.js has told us that
      an existing saved plan is currently loaded.
    */

    if (!currentPlanId) {
      console.info(
        "Stretch My Check: planner changes were not automatically persisted because no saved plan is currently loaded."
      );

      window.dispatchEvent(
        new CustomEvent(
          "stretchmycheck:plan-persistence-skipped",
          {
            detail: {
              reason:
                "no-saved-plan"
            }
          }
        )
      );

      return {
        success: false,
        skipped: true,
        reason: "no-saved-plan"
      };
    }


    /*
      If another automatic save is already running,
      queue one final save.

      This prevents overlapping Supabase updates.
    */

    if (saveInProgress) {
      queuedSave = true;

      return {
        success: false,
        queued: true
      };
    }


    saveInProgress = true;


    try {

      const user =
        await getUser();


      if (!user) {
        console.warn(
          "Stretch My Check: automatic plan persistence skipped because the user is not signed in."
        );

        return {
          success: false,
          skipped: true,
          reason: "not-signed-in"
        };
      }


      /*
        Give any final input/change handlers a moment
        to finish before reading the planner.
      */

      await new Promise(
        resolve =>
          setTimeout(
            resolve,
            100
          )
      );


      const planData =
        buildPlanData();


      const {
        data,
        error
      } =
        await supabaseClient
          .from(
            "saved_plans"
          )
          .update({
            plan_data:
              planData,

            updated_at:
              new Date()
                .toISOString()
          })
          .eq(
            "id",
            currentPlanId
          )
          .eq(
            "user_id",
            user.id
          )
          .select(
            "id, plan_name, updated_at"
          )
          .maybeSingle();


      if (error) {
        throw error;
      }


      if (!data) {
        throw new Error(
          "The loaded saved plan could not be found."
        );
      }


      if (
        data.plan_name
      ) {
        currentPlanName =
          data.plan_name;
      }


      console.info(
        `Stretch My Check: "${currentPlanName || "Saved Plan"}" automatically updated after ${reason}.`
      );


      window.dispatchEvent(
        new CustomEvent(
          "stretchmycheck:plan-auto-saved",
          {
            detail: {
              id:
                currentPlanId,

              name:
                currentPlanName,

              reason,

              updatedAt:
                data.updated_at
            }
          }
        )
      );


      return {
        success: true,
        skipped: false,
        data
      };

    } catch (error) {

      console.error(
        "Stretch My Check automatic plan persistence failed:",
        error
      );


      window.dispatchEvent(
        new CustomEvent(
          "stretchmycheck:plan-auto-save-error",
          {
            detail: {
              id:
                currentPlanId,

              name:
                currentPlanName,

              reason,

              message:
                error?.message ||
                "Unknown save error"
            }
          }
        )
      );


      return {
        success: false,
        skipped: false,
        error
      };

    } finally {

      saveInProgress = false;


      /*
        If another save request happened while
        Supabase was busy, run one final save using
        the newest planner state.
      */

      if (queuedSave) {
        queuedSave = false;

        window.setTimeout(
          () => {
            persistCurrentPlan(
              "queued planner update"
            );
          },
          100
        );
      }
    }
  }


  /* =======================================================
     TRACK PLAN LOADS
  ======================================================= */

  window.addEventListener(
    "stretchmycheck:plan-loaded",
    event => {

      const id =
        event.detail?.id;

      if (
        id === undefined ||
        id === null
      ) {
        return;
      }


      currentPlanId =
        id;


      currentPlanName =
        event.detail?.name ||
        "";


      console.info(
        `Stretch My Check Plan Persistence: tracking saved plan "${currentPlanName || currentPlanId}".`
      );


      window.dispatchEvent(
        new CustomEvent(
          "stretchmycheck:plan-persistence-ready",
          {
            detail: {
              id:
                currentPlanId,

              name:
                currentPlanName
            }
          }
        )
      );
    }
  );


  /* =======================================================
     RECURRING IMPORT
  ======================================================= */

  window.addEventListener(
    "stretchmycheck:recurring-imported",
    event => {

      const income =
        Number(
          event.detail?.income ||
          0
        );

      const expenses =
        Number(
          event.detail?.expenses ||
          0
        );


      /*
        Don't save if the import didn't actually add
        anything.

        Example:
        User opens preview and every item is already
        a duplicate.
      */

      if (
        income <= 0 &&
        expenses <= 0
      ) {
        return;
      }


      /*
        recurring-planner.js has already created and
        populated the rows before this event fires.

        Wait briefly, then save the complete planner
        state into the currently loaded saved plan.
      */

      window.setTimeout(
        () => {
          persistCurrentPlan(
            "recurring finance import"
          );
        },
        250
      );
    }
  );


  /* =======================================================
     SIGN OUT
  ======================================================= */

  supabaseClient.auth
    .onAuthStateChange(
      (
        event,
        session
      ) => {

        if (
          !session?.user
        ) {
          currentPlanId =
            null;

          currentPlanName =
            "";

          saveInProgress =
            false;

          queuedSave =
            false;

          return;
        }


        /*
          We intentionally do NOT guess the current
          saved plan after sign-in.

          plans.js will auto-load the newest saved plan
          and dispatch stretchmycheck:plan-loaded.
          That event gives us the authoritative ID.
        */
      }
    );


  /* =======================================================
     PUBLIC API
  ======================================================= */

  window.StretchMyCheckPlanPersistence = {

    save:
      reason =>
        persistCurrentPlan(
          reason ||
          "manual API request"
        ),

    getCurrentPlan:
      () => ({
        id:
          currentPlanId,

        name:
          currentPlanName
      }),

    buildPlanData:
      () =>
        buildPlanData()
  };


  console.info(
    "Stretch My Check Plan Persistence ready."
  );

})();