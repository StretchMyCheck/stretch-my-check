(() => {
  "use strict";

  /* =========================================================
     STRETCH MY CHECK
     GLOBAL READABILITY UPGRADE
     
     Purpose:
     - Increase tiny secondary text
     - Improve muted-text contrast
     - Improve form readability
     - Keep existing layout/design intact
     - Preserve desktop + mobile responsiveness
  ========================================================= */

  const STYLE_ID =
    "smcGlobalReadabilityV1";

  if (
    document.getElementById(
      STYLE_ID
    )
  ) {
    return;
  }

  const style =
    document.createElement(
      "style"
    );

  style.id =
    STYLE_ID;

  style.textContent = `

    /* =====================================================
       BASE APP READABILITY
    ===================================================== */

    #smcAppShell {
      font-size: 15px;
    }

    #smcAppShell p {
      line-height: 1.6;
    }

    /* =====================================================
       PAGE HEADINGS
    ===================================================== */

    #smcAppShell .smc-page-heading h1 {
      font-size: clamp(
        28px,
        2.2vw,
        34px
      ) !important;

      line-height: 1.15 !important;
    }

    #smcAppShell .smc-page-heading p {
      font-size: 13px !important;

      line-height: 1.6 !important;

      color: #9eb3bc !important;
    }

    /* =====================================================
       SIDEBAR
    ===================================================== */

    #smcAppShell nav a,
    #smcAppShell nav button {
      font-size: 13px !important;
    }

    #smcAppShell .smc-sidebar a,
    #smcAppShell .smc-sidebar button {
      font-size: 13px !important;
    }

    /* =====================================================
       GENERAL LABELS / HELPER TEXT
    ===================================================== */

    #smcAppShell label {
      font-size: 12px !important;

      line-height: 1.45 !important;

      color: #b5c6cd !important;
    }

    #smcAppShell small {
      font-size: 11px !important;

      line-height: 1.45 !important;

      color: #93aab4;
    }

    /* =====================================================
       FORM CONTROLS
    ===================================================== */

    #smcAppShell input,
    #smcAppShell select,
    #smcAppShell textarea {
      font-size: 14px !important;

      color: #f4f8f9 !important;
    }

    #smcAppShell input::placeholder,
    #smcAppShell textarea::placeholder {
      color: #78929e !important;

      opacity: 1 !important;
    }

    #smcAppShell button {
      font-size: 13px;
    }

    /* =====================================================
       COMMON MUTED TEXT
    ===================================================== */

    #smcAppShell .muted,
    #smcAppShell .helper,
    #smcAppShell .subtext,
    #smcAppShell .description,
    #smcAppShell .subtitle {
      color: #96adb7 !important;

      font-size: 12px !important;

      line-height: 1.55 !important;
    }

    /* =====================================================
       HOME DASHBOARD
    ===================================================== */

    #smcHomePage p,
    #smcHomePage small {
      color: #9eb2bb !important;
    }

    #smcHomePage small {
      font-size: 11px !important;
    }

    #smcHomePage .smc-home-card p,
    #smcHomePage .smc-home-card small {
      font-size: 11px !important;

      line-height: 1.5 !important;
    }

    /* =====================================================
       MY PLAN
    ===================================================== */

    #smcPlanPage p {
      color: #9db1ba;
    }

    #smcPlanPage label {
      font-size: 12px !important;

      color: #b8c8ce !important;
    }

    #smcPlanPage .step p,
    #smcPlanPage .intro-card p,
    #smcPlanPage .row-card p {
      font-size: 12px !important;

      line-height: 1.55 !important;

      color: #9eb3bc !important;
    }

    #smcPlanPage .bill-meta,
    #smcPlanPage .week-date,
    #smcPlanPage .safe-spend-note {
      font-size: 11px !important;

      line-height: 1.5 !important;

      color: #96adb7 !important;
    }

    #smcPlanPage .safe-spend-label {
      font-size: 11px !important;

      color: #a9bec6 !important;
    }

    /* =====================================================
       MONEY TOOLS
    ===================================================== */

    #smcToolsPage p {
      color: #9db2bb;
    }

    #smcToolsPage label {
      font-size: 12px !important;

      color: #b8c9cf !important;
    }

    #smcToolsPage .smc-tool-card p {
      font-size: 12px !important;

      line-height: 1.55 !important;

      color: #9eb3bc !important;
    }

    /* =====================================================
       GOALS
       Only typography/contrast.
       Do NOT alter approved spacing/layout.
    ===================================================== */

    #smcGoalsPage .smc-goals-toolbar p {
      font-size: 12px !important;

      line-height: 1.55 !important;

      color: #9db3bc !important;
    }

    #smcGoalsPage .smc-goal-card small {
      font-size: 11px !important;

      color: #95abb5 !important;
    }

    #smcGoalsPage .smc-goal-plan-panel small {
      font-size: 11px !important;

      color: #95abb5 !important;
    }

    #smcGoalsPage .smc-goal-activity {
      font-size: 12px;
    }

    #smcGoalsPage .smc-goal-pace {
      font-size: 12px;
    }

    #smcGoalsPage .smc-goal-catchup {
      font-size: 12px;
    }

    /* =====================================================
       ACCOUNT
    ===================================================== */

    #smcAccountPage p,
    #smcAccountPage small {
      color: #9eb3bc !important;
    }

    #smcAccountPage small {
      font-size: 11px !important;
    }

    /* =====================================================
       DEBT PAYOFF
    ===================================================== */

    #smcDebtTool .smc-debt-header p {
      font-size: 12px !important;

      line-height: 1.6 !important;

      color: #a1b5bd !important;
    }

    #smcDebtTool .smc-debt-summary-label {
      font-size: 11px !important;

      color: #a3b8c0 !important;

      letter-spacing: .045em;
    }

    #smcDebtTool .smc-debt-summary-note {
      font-size: 11px !important;

      line-height: 1.5 !important;

      color: #91a9b3 !important;
    }

    #smcDebtTool .smc-debt-strategy-title,
    #smcDebtTool .smc-debt-extra-title {
      font-size: 14px !important;
    }

    #smcDebtTool .smc-debt-strategy-sub,
    #smcDebtTool .smc-debt-extra-sub {
      font-size: 11px !important;

      line-height: 1.55 !important;

      color: #99afb8 !important;
    }

    #smcDebtTool .smc-debt-strategy-button strong {
      font-size: 13px !important;
    }

    #smcDebtTool .smc-debt-strategy-button span {
      font-size: 11px !important;

      line-height: 1.45 !important;

      color: #92a9b3 !important;
    }

    #smcDebtTool .smc-debt-type {
      font-size: 10px !important;

      color: #94aab4 !important;
    }

    #smcDebtTool .smc-debt-balance-label {
      font-size: 10px !important;

      color: #95abb5 !important;
    }

    #smcDebtTool .smc-debt-detail small {
      font-size: 10px !important;

      color: #94aab4 !important;
    }

    #smcDebtTool .smc-debt-detail strong {
      font-size: 12px !important;
    }

    #smcDebtTool .smc-debt-attack-chip {
      font-size: 10px !important;
    }

    #smcDebtTool .smc-debt-plan-kicker {
      font-size: 10px !important;
    }

    #smcDebtTool .smc-debt-plan-sub {
      font-size: 11px !important;

      line-height: 1.55 !important;

      color: #99afb8 !important;
    }

    #smcDebtTool .smc-debt-plan-stat small {
      font-size: 10px !important;

      color: #95abb5 !important;
    }

    #smcDebtTool .smc-debt-plan-stat strong {
      font-size: 14px !important;
    }

    #smcDebtTool .smc-debt-order-name {
      font-size: 12px !important;
    }

    #smcDebtTool .smc-debt-order-meta {
      font-size: 10px !important;

      line-height: 1.45 !important;

      color: #92a9b3 !important;
    }

    #smcDebtTool .smc-debt-order-balance {
      font-size: 13px !important;
    }

    #smcDebtTool .smc-debt-compare-name {
      font-size: 13px !important;
    }

    #smcDebtTool .smc-debt-compare-row {
      font-size: 10px !important;

      color: #96adb7 !important;
    }

    #smcDebtTool .smc-debt-compare-row strong {
      font-size: 11px !important;
    }

    #smcDebtTool .smc-debt-savings-note,
    #smcDebtTool .smc-debt-warning {
      font-size: 11px !important;

      line-height: 1.6 !important;

      color: #a3b7bf !important;
    }

    #smcDebtTool .smc-debt-empty p {
      font-size: 12px !important;

      line-height: 1.6 !important;

      color: #9fb3bc !important;
    }

    /* =====================================================
       DEBT MODAL
    ===================================================== */

    .smc-debt-modal label {
      font-size: 12px !important;

      color: #bacbd1 !important;
    }

    .smc-debt-modal input,
    .smc-debt-modal select {
      font-size: 14px !important;
    }

    .smc-debt-message {
      font-size: 12px !important;

      line-height: 1.5 !important;
    }

    /* =====================================================
       GENERAL CARD DESCRIPTION TEXT
    ===================================================== */

    #smcAppShell [class*="note"],
    #smcAppShell [class*="meta"],
    #smcAppShell [class*="sub"] {
      line-height: 1.5;
    }

    /* =====================================================
       BUTTON READABILITY
    ===================================================== */

    #smcAppShell button,
    .smc-debt-modal button {
      font-weight: 750;
    }

    #smcDebtTool button {
      font-size: 12px;
    }

    /* =====================================================
       MOBILE
    ===================================================== */

    @media (max-width: 720px) {

      #smcAppShell {
        font-size: 15px;
      }

      #smcAppShell .smc-page-heading h1 {
        font-size: 27px !important;
      }

      #smcAppShell .smc-page-heading p {
        font-size: 13px !important;
      }

      #smcAppShell label {
        font-size: 12px !important;
      }

      #smcAppShell input,
      #smcAppShell select,
      #smcAppShell textarea {
        font-size: 16px !important;
      }

      #smcDebtTool .smc-debt-header p,
      #smcDebtTool .smc-debt-empty p {
        font-size: 12px !important;
      }

      #smcDebtTool .smc-debt-strategy-sub,
      #smcDebtTool .smc-debt-extra-sub,
      #smcDebtTool .smc-debt-plan-sub {
        font-size: 11px !important;
      }

    }

  `;

  document.head
    .appendChild(
      style
    );

})();