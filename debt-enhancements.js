(() => {
  "use strict";

  /* =========================================================
     STRETCH MY CHECK
     DEBT PAYOFF ENHANCEMENTS

     Adds:
     - Add Another Debt button above debt cards
     - Debt count
     - Easy access even after scrolling
     - Automatically refreshes as debts change
  ========================================================= */

  const STYLE_ID =
    "smcDebtEnhancementStyles";

  /* =========================================================
     STYLES
  ========================================================= */

  if (
    !document.getElementById(
      STYLE_ID
    )
  ) {
    const style =
      document.createElement(
        "style"
      );

    style.id =
      STYLE_ID;

    style.textContent = `

      .smc-debt-list-toolbar {
        display: flex;

        align-items: center;

        justify-content: space-between;

        gap: 14px;

        margin-bottom: 14px;

        padding: 14px 16px;

        border: 1px solid
          rgba(132,175,192,.15);

        border-radius: 14px;

        background:
          linear-gradient(
            145deg,
            #11232d,
            #0d1a23
          );
      }

      .smc-debt-list-toolbar-left {
        min-width: 0;
      }

      .smc-debt-list-toolbar-title {
        color: #ffffff;

        font-size: 15px;

        font-weight: 820;
      }

      .smc-debt-list-toolbar-count {
        margin-top: 4px;

        color: #9eb3bc;

        font-size: 11px;

        line-height: 1.45;
      }

      .smc-debt-add-another {
        flex: 0 0 auto;

        min-height: 41px;

        padding: 9px 15px;

        border: 1px solid
          rgba(69,225,192,.30);

        border-radius: 999px;

        background:
          rgba(33,128,113,.15);

        color: #65e7c8;

        font-size: 12px;

        font-weight: 800;

        cursor: pointer;

        transition:
          background .15s ease,
          border-color .15s ease,
          transform .15s ease;
      }

      .smc-debt-add-another:hover {
        background:
          rgba(33,128,113,.25);

        border-color:
          rgba(69,225,192,.50);

        transform:
          translateY(-1px);
      }

      .smc-debt-list-wrap {
        min-width: 0;
      }

      @media (
        max-width: 720px
      ) {

        .smc-debt-list-toolbar {
          align-items: stretch;

          flex-direction: column;
        }

        .smc-debt-add-another {
          width: 100%;
        }

      }

    `;

    document.head
      .appendChild(
        style
      );
  }

  /* =========================================================
     GET DEBT COUNT
  ========================================================= */

  function getDebtCount() {
    try {
      if (
        window.StretchMyCheckDebt &&
        typeof window
          .StretchMyCheckDebt
          .getDebts ===
          "function"
      ) {
        const debts =
          window
            .StretchMyCheckDebt
            .getDebts();

        return Array.isArray(
          debts
        )
          ? debts.length
          : 0;
      }
    } catch (
      error
    ) {
      console.error(
        "Could not read debt count:",
        error
      );
    }

    return 0;
  }

  /* =========================================================
     OPEN ADD DEBT
  ========================================================= */

  function openAddDebt() {
    if (
      window.StretchMyCheckDebt &&
      typeof window
        .StretchMyCheckDebt
        .openAddDebt ===
        "function"
    ) {
      window
        .StretchMyCheckDebt
        .openAddDebt();
    }
  }

  /* =========================================================
     BUILD / UPDATE TOOLBAR
  ========================================================= */

  function updateToolbar() {
    const debtList =
      document.getElementById(
        "smcDebtList"
      );

    if (!debtList) {
      return false;
    }

    let wrapper =
      document.getElementById(
        "smcDebtListWrap"
      );

    if (!wrapper) {
      wrapper =
        document.createElement(
          "div"
        );

      wrapper.id =
        "smcDebtListWrap";

      wrapper.className =
        "smc-debt-list-wrap";

      debtList.parentNode
        .insertBefore(
          wrapper,
          debtList
        );

      wrapper.appendChild(
        debtList
      );
    }

    let toolbar =
      document.getElementById(
        "smcDebtListToolbar"
      );

    if (!toolbar) {
      toolbar =
        document.createElement(
          "div"
        );

      toolbar.id =
        "smcDebtListToolbar";

      toolbar.className =
        "smc-debt-list-toolbar";

      wrapper.insertBefore(
        toolbar,
        debtList
      );
    }

    const count =
      getDebtCount();

    const label =
      count === 1
        ? "1 debt added"
        : `${count} debts added`;

    toolbar.innerHTML = `
      <div
        class="smc-debt-list-toolbar-left"
      >
        <div
          class="smc-debt-list-toolbar-title"
        >
          Your Debts
        </div>

        <div
          class="smc-debt-list-toolbar-count"
        >
          ${label}
        </div>
      </div>

      <button
        id="smcDebtAddAnother"
        class="smc-debt-add-another"
        type="button"
      >
        + Add Another Debt
      </button>
    `;

    document
      .getElementById(
        "smcDebtAddAnother"
      )
      .onclick =
        openAddDebt;

    return true;
  }

  /* =========================================================
     WATCH DEBT TOOL
  ========================================================= */

  let updateQueued =
    false;

  function queueUpdate() {
    if (
      updateQueued
    ) {
      return;
    }

    updateQueued =
      true;

    window.requestAnimationFrame(
      () => {
        updateQueued =
          false;

        updateToolbar();
      }
    );
  }

  const observer =
    new MutationObserver(
      mutations => {
        const relevant =
          mutations.some(
            mutation => {
              const target =
                mutation.target;

              if (
                !(target instanceof Element)
              ) {
                return false;
              }

              return Boolean(
                target.closest(
                  "#smcDebtTool"
                )
              );
            }
          );

        if (
          relevant
        ) {
          queueUpdate();
        }
      }
    );

  observer.observe(
    document.body,
    {
      childList: true,
      subtree: true
    }
  );

  /* =========================================================
     INITIAL LOAD
  ========================================================= */

  function initialize() {
    if (
      updateToolbar()
    ) {
      return;
    }

    window.setTimeout(
      initialize,
      300
    );
  }

  initialize();

  /* =========================================================
     EVENTS
  ========================================================= */

  window.addEventListener(
    "hashchange",
    () => {
      window.setTimeout(
        updateToolbar,
        100
      );
    }
  );

  window.addEventListener(
    "stretchmycheck:plan-loaded",
    () => {
      window.setTimeout(
        updateToolbar,
        150
      );
    }
  );

})();