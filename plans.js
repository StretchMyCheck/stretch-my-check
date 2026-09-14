(() => {
  "use strict";

  const supabaseClient =
    window.supabaseClient;

  if (!supabaseClient) {
    console.error(
      "Supabase client is not available. Load supabase-config.js before plans.js."
    );
    return;
  }

  /* =========================================================
     STYLES
  ========================================================= */

  const style =
    document.createElement(
      "style"
    );

  style.textContent = `
    .saved-plans-card {
      background: #fff;
      border-radius: 18px;
      padding: 22px;
      margin-bottom: 18px;
      box-shadow:
        0 8px 24px
        rgba(0,0,0,.055);
    }

    .saved-plans-card h2 {
      margin: 0 0 8px;
      font-size: 23px;
    }

    .saved-plans-card p {
      margin: 0 0 16px;
      color: #667681;
      line-height: 1.5;
    }

    .saved-plan-controls {
      display: grid;
      grid-template-columns:
        minmax(0,1fr)
        auto
        auto;
      gap: 10px;
      align-items: end;
    }

    .saved-plan-field {
      display: flex;
      flex-direction: column;
      gap: 7px;
    }

    .saved-plan-field label {
      font-size: 14px;
      font-weight: 750;
    }

    .saved-plan-field input {
      width: 100%;
      box-sizing: border-box;
      min-height: 45px;
      border:
        1px solid #d6e0e5;
      border-radius: 10px;
      padding: 12px 13px;
      font-size: 16px;
    }

    .saved-plan-btn {
      border: 0;
      border-radius: 10px;
      padding: 12px 15px;
      min-height: 45px;
      font-weight: 750;
      cursor: pointer;
    }

    .saved-plan-btn.primary {
      background: #247c8b;
      color: #fff;
    }

    .saved-plan-btn.secondary {
      background: #e9eff2;
      color: #17242c;
    }

    .saved-plan-btn.danger {
      background: #f8e5e5;
      color: #a12424;
    }

    .saved-plan-message {
      display: none;
      margin-top: 12px;
      padding: 11px 12px;
      border-radius: 10px;
      font-size: 14px;
      line-height: 1.45;
    }

    .saved-plan-message.show {
      display: block;
    }

    .saved-plan-message.good {
      background: #e9f8ef;
      border:
        1px solid #a9ddbc;
      color: #17663b;
    }

    .saved-plan-message.bad {
      background: #fff0f0;
      border:
        1px solid #efb4b4;
      color: #9b2828;
    }

    .saved-plan-message.info {
      background: #eef6f8;
      border:
        1px solid #bdd8df;
      color: #294d5f;
    }

    .saved-plans-modal-overlay {
      position: fixed;
      inset: 0;
      background:
        rgba(10,24,32,.75);
      display: none;
      align-items: center;
      justify-content: center;
      padding: 20px;
      z-index: 10000;
    }

    .saved-plans-modal-overlay.show {
      display: flex;
    }

    .saved-plans-modal {
      width: 100%;
      max-width: 650px;
      max-height: 82vh;
      overflow-y: auto;
      background: #fff;
      color: #17242c;
      border-radius: 18px;
      padding: 22px;
      box-shadow:
        0 20px 60px
        rgba(0,0,0,.3);
    }

    .saved-plans-modal-header {
      display: flex;
      justify-content:
        space-between;
      align-items: center;
      gap: 12px;
      margin-bottom: 15px;
    }

    .saved-plans-modal-header h2 {
      margin: 0;
    }

    .saved-plans-close {
      width: 42px;
      height: 42px;
      border: 0;
      border-radius: 9px;
      background: #edf2f4;
      cursor: pointer;
      font-size: 20px;
    }

    .saved-plan-list {
      display: grid;
      gap: 10px;
    }

    .saved-plan-item {
      border:
        1px solid #d6e0e5;
      border-radius: 12px;
      padding: 14px;
      display: grid;
      grid-template-columns:
        minmax(0,1fr)
        auto;
      gap: 12px;
      align-items: center;
    }

    .saved-plan-item h3 {
      margin: 0 0 5px;
      font-size: 17px;
    }

    .saved-plan-meta {
      color: #667681;
      font-size: 12px;
    }

    .saved-plan-actions {
      display: flex;
      gap: 7px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    @media (
      max-width: 800px
    ) {
      .saved-plan-controls {
        grid-template-columns:
          1fr;
      }

      .saved-plan-item {
        grid-template-columns:
          1fr;
      }

      .saved-plan-actions {
        justify-content:
          flex-start;
      }
    }

    @media print {
      .saved-plans-card,
      .saved-plans-modal-overlay {
        display: none !important;
      }
    }
  `;

  document.head.appendChild(
    style
  );

  /* =========================================================
     SAVED PLAN CARD
  ========================================================= */

  const intro =
    document.querySelector(
      ".intro-card"
    );

  const saveCard =
    document.createElement(
      "section"
    );

  saveCard.className =
    "saved-plans-card no-print";

  saveCard.innerHTML = `
    <h2>
      Saved Plans
    </h2>

    <p>
      Save your current plan to your
      account and come back to it later.
      Your most recently updated plan
      will automatically load when you
      sign in.
    </p>

    <div
      class="saved-plan-controls"
    >

      <div
        class="saved-plan-field"
      >
        <label
          for="savedPlanName"
        >
          Plan name
        </label>

        <input
          id="savedPlanName"
          type="text"
          maxlength="80"
          placeholder="Example: September Bills"
        >
      </div>

      <button
        id="saveCurrentPlanButton"
        class="saved-plan-btn primary"
        type="button"
      >
        Save My Plan
      </button>

      <button
        id="openSavedPlansButton"
        class="saved-plan-btn secondary"
        type="button"
      >
        My Saved Plans
      </button>

    </div>

    <div
      id="savedPlanMessage"
      class="saved-plan-message"
    ></div>
  `;

  if (
    intro &&
    intro.parentNode
  ) {
    intro.insertAdjacentElement(
      "afterend",
      saveCard
    );
  } else {
    document
      .querySelector(".app")
      ?.prepend(saveCard);
  }

  /* =========================================================
     MODAL
  ========================================================= */

  const modalOverlay =
    document.createElement(
      "div"
    );

  modalOverlay.className =
    "saved-plans-modal-overlay";

  modalOverlay.innerHTML = `
    <div
      class="saved-plans-modal"
    >

      <div
        class="saved-plans-modal-header"
      >

        <h2>
          My Saved Plans
        </h2>

        <button
          id="closeSavedPlansButton"
          class="saved-plans-close"
          type="button"
          aria-label="Close"
        >
          ×
        </button>

      </div>

      <div
        id="savedPlanList"
        class="saved-plan-list"
      ></div>

    </div>
  `;

  document.body.appendChild(
    modalOverlay
  );

  const planNameInput =
    document.getElementById(
      "savedPlanName"
    );

  const saveButton =
    document.getElementById(
      "saveCurrentPlanButton"
    );

  const openButton =
    document.getElementById(
      "openSavedPlansButton"
    );

  const messageBox =
    document.getElementById(
      "savedPlanMessage"
    );

  const planList =
    document.getElementById(
      "savedPlanList"
    );

  const closeModalButton =
    document.getElementById(
      "closeSavedPlansButton"
    );

  let editingPlanId =
    null;

  let lastAutoLoadedUserId =
    null;

  /* =========================================================
     MESSAGES
  ========================================================= */

  function showMessage(
    message,
    type = "info"
  ) {
    messageBox.textContent =
      message;

    messageBox.className =
      `saved-plan-message show ${type}`;
  }

  function clearMessage() {
    messageBox.textContent =
      "";

    messageBox.className =
      "saved-plan-message";
  }

  /* =========================================================
     USER
  ========================================================= */

  async function getUser() {
    const {
      data,
      error
    } =
      await supabaseClient.auth
        .getUser();

    if (error) {
      console.error(error);
      return null;
    }

    return data?.user || null;
  }

  /* =========================================================
     READ PLANNER
  ========================================================= */

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

  function buildPlanData() {
    return {
      version: 1,

      startingBalance:
        document.getElementById(
          "startingBalance"
        )?.value || "",

      protectedCushion:
        document.getElementById(
          "protectedCushion"
        )?.value || "",

      groceries: {
        amount:
          document.getElementById(
            "groceryAmount"
          )?.value || "",

        mode:
          document.getElementById(
            "groceryMode"
          )?.value ||
          "total"
      },

      gas: {
        amount:
          document.getElementById(
            "gasAmount"
          )?.value || "",

        mode:
          document.getElementById(
            "gasMode"
          )?.value ||
          "total"
      },

      other: {
        amount:
          document.getElementById(
            "otherAmount"
          )?.value || "",

        mode:
          document.getElementById(
            "otherMode"
          )?.value ||
          "total"
      },

      paychecks:
        readPaychecks(),

      bills:
        readBills()
    };
  }

  /* =========================================================
     LOAD PLANNER
  ========================================================= */

  function setValue(
    id,
    value
  ) {
    const element =
      document.getElementById(
        id
      );

    if (element) {
      element.value =
        value ?? "";
    }
  }

  function loadPlanIntoForm(
    plan
  ) {
    if (!plan) {
      return;
    }

    const data =
      plan.plan_data || {};

    setValue(
      "startingBalance",
      data.startingBalance
    );

    setValue(
      "protectedCushion",
      data.protectedCushion
    );

    setValue(
      "groceryAmount",
      data.groceries?.amount
    );

    setValue(
      "groceryMode",
      data.groceries?.mode ||
        "total"
    );

    setValue(
      "gasAmount",
      data.gas?.amount
    );

    setValue(
      "gasMode",
      data.gas?.mode ||
        "total"
    );

    setValue(
      "otherAmount",
      data.other?.amount
    );

    setValue(
      "otherMode",
      data.other?.mode ||
        "total"
    );

    /* PAYCHECKS */

    const paychecksContainer =
      document.getElementById(
        "paychecksContainer"
      );

    if (
      paychecksContainer
    ) {
      paychecksContainer.innerHTML =
        "";
    }

    const paychecks =
      Array.isArray(
        data.paychecks
      ) &&
      data.paychecks.length
        ? data.paychecks
        : [
            {
              name: "",
              date: "",
              amount: ""
            }
          ];

    paychecks.forEach(
      paycheck => {
        if (
          typeof window
            .addPaycheck ===
          "function"
        ) {
          window.addPaycheck(
            paycheck.name ||
              "",
            paycheck.date ||
              "",
            paycheck.amount ||
              ""
          );
        } else if (
          typeof addPaycheck ===
          "function"
        ) {
          addPaycheck(
            paycheck.name ||
              "",
            paycheck.date ||
              "",
            paycheck.amount ||
              ""
          );
        }
      }
    );

    /* BILLS */

    const billsContainer =
      document.getElementById(
        "billsContainer"
      );

    if (
      billsContainer
    ) {
      billsContainer.innerHTML =
        "";
    }

    const bills =
      Array.isArray(
        data.bills
      ) &&
      data.bills.length
        ? data.bills
        : [{}];

    bills.forEach(
      bill => {
        if (
          typeof window.addBill ===
          "function"
        ) {
          window.addBill();
        } else if (
          typeof addBill ===
          "function"
        ) {
          addBill();
        }

        const entry =
          billsContainer
            ?.lastElementChild;

        if (!entry) {
          return;
        }

        const name =
          entry.querySelector(
            ".bill-name"
          );

        const amount =
          entry.querySelector(
            ".bill-amount"
          );

        const type =
          entry.querySelector(
            ".bill-type"
          );

        const priority =
          entry.querySelector(
            ".bill-priority"
          );

        const dueDate =
          entry.querySelector(
            ".bill-due-date"
          );

        const flexRule =
          entry.querySelector(
            ".flex-rule"
          );

        const byDate =
          entry.querySelector(
            ".flex-by-date"
          );

        const startDate =
          entry.querySelector(
            ".flex-start-date"
          );

        const endDate =
          entry.querySelector(
            ".flex-end-date"
          );

        if (name) {
          name.value =
            bill.name || "";
        }

        if (amount) {
          amount.value =
            bill.amount || "";
        }

        if (type) {
          type.value =
            bill.type ||
            "fixed";

          type.dispatchEvent(
            new Event(
              "change"
            )
          );
        }

        if (priority) {
          priority.value =
            bill.priority ||
            "essential";
        }

        if (dueDate) {
          dueDate.value =
            bill.dueDate || "";
        }

        if (flexRule) {
          flexRule.value =
            bill.flexRule ||
            "any";

          flexRule.dispatchEvent(
            new Event(
              "change"
            )
          );
        }

        if (byDate) {
          byDate.value =
            bill.byDate || "";
        }

        if (startDate) {
          startDate.value =
            bill.startDate ||
            "";
        }

        if (endDate) {
          endDate.value =
            bill.endDate || "";
        }
      }
    );

    editingPlanId =
      plan.id;

    planNameInput.value =
      plan.plan_name || "";

    saveButton.textContent =
      "Update Saved Plan";

    document
      .getElementById(
        "plannerResults"
      )
      ?.classList.remove(
        "show"
      );

    clearMessage();

    showMessage(
      `Loaded "${plan.plan_name || "Untitled Plan"}".`,
      "good"
    );

    modalOverlay.classList.remove(
      "show"
    );

    window.dispatchEvent(
      new CustomEvent(
        "stretchmycheck:plan-loaded",
        {
          detail: {
            id:
              plan.id,

            name:
              plan.plan_name ||
              "Untitled Plan",

            updatedAt:
              plan.updated_at ||
              plan.created_at ||
              null
          }
        }
      )
    );

    /*
      Rebuild optimized planner,
      dashboard, and forecast.
    */

    window.setTimeout(
      () => {
        const optimizeButton =
          document.getElementById(
            "optimizeButton"
          );

        if (
          optimizeButton
        ) {
          optimizeButton.click();
        }

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
      },
      100
    );
  }

  /* =========================================================
     SAVE
  ========================================================= */

  async function savePlan() {
    clearMessage();

    const user =
      await getUser();

    if (!user) {
      showMessage(
        "Sign in before saving a plan.",
        "bad"
      );
      return;
    }

    const planName =
      planNameInput.value.trim();

    if (!planName) {
      showMessage(
        "Give this plan a name before saving it.",
        "bad"
      );

      planNameInput.focus();

      return;
    }

    const planData =
      buildPlanData();

    saveButton.disabled =
      true;

    saveButton.textContent =
      editingPlanId
        ? "Updating..."
        : "Saving...";

    try {
      if (
        editingPlanId
      ) {
        const {
          error
        } =
          await supabaseClient
            .from(
              "saved_plans"
            )
            .update({
              plan_name:
                planName,

              plan_data:
                planData,

              updated_at:
                new Date()
                  .toISOString()
            })
            .eq(
              "id",
              editingPlanId
            )
            .eq(
              "user_id",
              user.id
            );

        if (error) {
          throw error;
        }

        showMessage(
          `"${planName}" was updated.`,
          "good"
        );
      } else {
        const {
          data,
          error
        } =
          await supabaseClient
            .from(
              "saved_plans"
            )
            .insert({
              user_id:
                user.id,

              plan_name:
                planName,

              plan_data:
                planData,

              updated_at:
                new Date()
                  .toISOString()
            })
            .select("id")
            .single();

        if (error) {
          throw error;
        }

        editingPlanId =
          data.id;

        showMessage(
          `"${planName}" was saved to your account.`,
          "good"
        );
      }
    } catch (error) {
      console.error(error);

      showMessage(
        error.message ||
          "Could not save your plan.",
        "bad"
      );
    } finally {
      saveButton.disabled =
        false;

      saveButton.textContent =
        editingPlanId
          ? "Update Saved Plan"
          : "Save My Plan";
    }
  }

  /* =========================================================
     FETCH
  ========================================================= */

  async function fetchPlans() {
    const user =
      await getUser();

    if (!user) {
      return [];
    }

    const {
      data,
      error
    } =
      await supabaseClient
        .from(
          "saved_plans"
        )
        .select(
          "id, plan_name, plan_data, created_at, updated_at"
        )
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
      console.error(error);

      showMessage(
        error.message ||
          "Could not load your saved plans.",
        "bad"
      );

      return [];
    }

    return data || [];
  }

  /* =========================================================
     AUTO LOAD MOST RECENT
  ========================================================= */

  async function loadMostRecentPlan(
    force = false
  ) {
    const user =
      await getUser();

    if (!user) {
      return null;
    }

    if (
      !force &&
      lastAutoLoadedUserId ===
        user.id
    ) {
      return null;
    }

    const plans =
      await fetchPlans();

    lastAutoLoadedUserId =
      user.id;

    if (!plans.length) {
      window.dispatchEvent(
        new CustomEvent(
          "stretchmycheck:no-saved-plans"
        )
      );

      return null;
    }

    const newestPlan =
      plans[0];

    loadPlanIntoForm(
      newestPlan
    );

    return newestPlan;
  }

  /* =========================================================
     SAVED PLANS LIST
  ========================================================= */

  function formatDate(
    value
  ) {
    if (!value) {
      return "";
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "";
    }

    return date
      .toLocaleString(
        "en-US",
        {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit"
        }
      );
  }

  async function openSavedPlans() {
    clearMessage();

    const user =
      await getUser();

    if (!user) {
      showMessage(
        "Sign in to view saved plans.",
        "bad"
      );
      return;
    }

    modalOverlay.classList.add(
      "show"
    );

    planList.innerHTML = `
      <div
        class="saved-plan-meta"
      >
        Loading...
      </div>
    `;

    const plans =
      await fetchPlans();

    if (!plans.length) {
      planList.innerHTML = `
        <div
          class="saved-plan-meta"
        >
          You do not have any
          saved plans yet.
        </div>
      `;

      return;
    }

    planList.innerHTML =
      "";

    plans.forEach(
      plan => {
        const item =
          document.createElement(
            "div"
          );

        item.className =
          "saved-plan-item";

        const info =
          document.createElement(
            "div"
          );

        const title =
          document.createElement(
            "h3"
          );

        title.textContent =
          plan.plan_name ||
          "Untitled Plan";

        const meta =
          document.createElement(
            "div"
          );

        meta.className =
          "saved-plan-meta";

        meta.textContent =
          `Last updated ${
            formatDate(
              plan.updated_at ||
              plan.created_at
            )
          }`;

        info.append(
          title,
          meta
        );

        const actions =
          document.createElement(
            "div"
          );

        actions.className =
          "saved-plan-actions";

        const loadButton =
          document.createElement(
            "button"
          );

        loadButton.className =
          "saved-plan-btn primary";

        loadButton.type =
          "button";

        loadButton.textContent =
          "Load";

        loadButton.addEventListener(
          "click",
          () => {
            loadPlanIntoForm(
              plan
            );
          }
        );

        const deleteButton =
          document.createElement(
            "button"
          );

        deleteButton.className =
          "saved-plan-btn danger";

        deleteButton.type =
          "button";

        deleteButton.textContent =
          "Delete";

        deleteButton.addEventListener(
          "click",
          async () => {
            const confirmed =
              window.confirm(
                `Delete "${plan.plan_name}"? This cannot be undone.`
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
                  "saved_plans"
                )
                .delete()
                .eq(
                  "id",
                  plan.id
                )
                .eq(
                  "user_id",
                  user.id
                );

            if (error) {
              console.error(
                error
              );

              window.alert(
                error.message ||
                  "Could not delete this plan."
              );

              return;
            }

            if (
              editingPlanId ===
              plan.id
            ) {
              editingPlanId =
                null;

              planNameInput.value =
                "";

              saveButton.textContent =
                "Save My Plan";
            }

            await openSavedPlans();
          }
        );

        actions.append(
          loadButton,
          deleteButton
        );

        item.append(
          info,
          actions
        );

        planList.appendChild(
          item
        );
      }
    );
  }

  /* =========================================================
     BUTTONS
  ========================================================= */

  saveButton.addEventListener(
    "click",
    savePlan
  );

  openButton.addEventListener(
    "click",
    openSavedPlans
  );

  closeModalButton
    .addEventListener(
      "click",
      () => {
        modalOverlay
          .classList
          .remove(
            "show"
          );
      }
    );

  modalOverlay.addEventListener(
    "click",
    event => {
      if (
        event.target ===
        modalOverlay
      ) {
        modalOverlay
          .classList
          .remove(
            "show"
          );
      }
    }
  );

  /* =========================================================
     AUTH EVENTS
  ========================================================= */

  supabaseClient.auth
    .onAuthStateChange(
      (
        event,
        session
      ) => {
        if (
          !session?.user
        ) {
          editingPlanId =
            null;

          lastAutoLoadedUserId =
            null;

          planNameInput.value =
            "";

          saveButton.textContent =
            "Save My Plan";

          clearMessage();

          return;
        }

        if (
          event ===
          "SIGNED_IN"
        ) {
          window.setTimeout(
            () => {
              loadMostRecentPlan();
            },
            300
          );
        }
      }
    );

  /* =========================================================
     PUBLIC API
  ========================================================= */

  window.StretchMyCheckPlans = {

    fetchPlans,

    loadPlan:
      loadPlanIntoForm,

    loadLatest:
      () =>
        loadMostRecentPlan(
          true
        ),

    openSavedPlans
  };

  /* =========================================================
     INITIAL SESSION
  ========================================================= */

  (async () => {
    const {
      data
    } =
      await supabaseClient.auth
        .getSession();

    if (
      data?.session?.user
    ) {
      window.setTimeout(
        () => {
          loadMostRecentPlan();
        },
        350
      );
    }
  })();

})();