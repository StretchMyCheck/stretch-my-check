(() => {
  "use strict";

  /* =========================================================
     STRETCH MY CHECK
     DARK APP SHELL
  ========================================================= */

  if (document.getElementById("smcAppShell")) {
    return;
  }

  const money = value => {
    const number = parseFloat(value);
    return Number.isFinite(number) ? number : 0;
  };

  const currency = value =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD"
    }).format(
      Number.isFinite(Number(value))
        ? Number(value)
        : 0
    );

  const escapeHTML = value =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  function icon(name, size = 22) {
    const common = `
      width="${size}"
      height="${size}"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    `;

    const icons = {
      home: `
        <svg ${common}>
          <path d="M3 11.5 12 4l9 7.5"/>
          <path d="M5.5 10v10h13V10"/>
          <path d="M9.5 20v-6h5v6"/>
        </svg>
      `,

      plan: `
        <svg ${common}>
          <rect x="5" y="4" width="14" height="17" rx="2"/>
          <path d="M9 4.5V3h6v1.5"/>
          <path d="M8 9h8"/>
          <path d="M8 13h8"/>
          <path d="M8 17h5"/>
        </svg>
      `,

      tools: `
        <svg ${common}>
          <rect x="4" y="3" width="16" height="18" rx="2"/>
          <path d="M7 7h10"/>
          <path d="M8 11h1"/>
          <path d="M12 11h1"/>
          <path d="M16 11h1"/>
          <path d="M8 15h1"/>
          <path d="M12 15h1"/>
          <path d="M16 15h1"/>
          <path d="M8 18h1"/>
          <path d="M12 18h5"/>
        </svg>
      `,

      goals: `
        <svg ${common}>
          <circle cx="12" cy="12" r="8"/>
          <circle cx="12" cy="12" r="4"/>
          <path d="m14.8 9.2 5-5"/>
          <path d="M16.5 4.2h3.3v3.3"/>
        </svg>
      `,

      user: `
        <svg ${common}>
          <circle cx="12" cy="8" r="4"/>
          <path d="M4.5 21c.7-4.2 3.2-6.3 7.5-6.3S18.8 16.8 19.5 21"/>
        </svg>
      `,

      wallet: `
        <svg ${common}>
          <path d="M4 7.5V6a2 2 0 0 1 2-2h11"/>
          <rect x="3" y="6" width="18" height="14" rx="3"/>
          <path d="M16 11h5v5h-5a2.5 2.5 0 1 1 0-5Z"/>
        </svg>
      `,

      calendar: `
        <svg ${common}>
          <rect x="3" y="5" width="18" height="16" rx="2"/>
          <path d="M16 3v4"/>
          <path d="M8 3v4"/>
          <path d="M3 10h18"/>
        </svg>
      `,

      chart: `
        <svg ${common}>
          <path d="M4 20V10"/>
          <path d="M10 20V4"/>
          <path d="M16 20v-7"/>
          <path d="M22 20V7"/>
        </svg>
      `,

      money: `
        <svg ${common}>
          <circle cx="12" cy="12" r="9"/>
          <path d="M15 8.5c-.8-.7-1.8-1-3-1-1.7 0-3 .8-3 2s1 1.8 3 2.2 3 1 3 2.4-1.3 2.4-3 2.4c-1.2 0-2.4-.4-3.2-1.1"/>
          <path d="M12 5.5v13"/>
        </svg>
      `,

      bill: `
        <svg ${common}>
          <path d="M6 3h9l4 4v14H6z"/>
          <path d="M15 3v5h5"/>
          <path d="M9 13h7"/>
          <path d="M9 17h5"/>
        </svg>
      `,

      cart: `
        <svg ${common}>
          <circle cx="9" cy="20" r="1"/>
          <circle cx="18" cy="20" r="1"/>
          <path d="M3 4h2l2.4 11h10.8l2-7H6"/>
        </svg>
      `,

      chevron: `
        <svg ${common}>
          <path d="m9 18 6-6-6-6"/>
        </svg>
      `,

      moon: `
        <svg ${common}>
          <path d="M20 15.5A8 8 0 0 1 8.5 4a8.5 8.5 0 1 0 11.5 11.5Z"/>
        </svg>
      `,

      logout: `
        <svg ${common}>
          <path d="M10 5H5v14h5"/>
          <path d="m14 8 4 4-4 4"/>
          <path d="M18 12H9"/>
        </svg>
      `,

      search: `
        <svg ${common}>
          <circle cx="11" cy="11" r="7"/>
          <path d="m20 20-4-4"/>
        </svg>
      `
    };

    return icons[name] || "";
  }

  /* =========================================================
     STYLES
  ========================================================= */

  const style = document.createElement("style");
  style.id = "smcShellStyles";

  style.textContent = `
    :root {
      --smc-bg: #071016;
      --smc-bg-soft: #0a151d;
      --smc-sidebar: #09151c;
      --smc-card: #101c25;
      --smc-card-2: #14232d;
      --smc-card-3: #0c1922;
      --smc-input: #071923;
      --smc-border: rgba(132,175,192,.17);
      --smc-border-strong: rgba(83,205,190,.26);
      --smc-text: #f4f8fa;
      --smc-muted: #91a7b2;
      --smc-muted-2: #6f8793;
      --smc-teal: #45e1c0;
      --smc-teal-dark: #177f75;
      --smc-blue: #55c7ea;
      --smc-purple: #9b6dff;
      --smc-orange: #ff9d55;
      --smc-red: #ff7479;
      --smc-green: #5ce7b1;
      --smc-radius: 18px;
      --smc-sidebar-width: 230px;
    }

    html {
      background: var(--smc-bg);
      color-scheme: dark;
    }

    body {
      margin: 0 !important;
      min-height: 100vh;
      background:
        radial-gradient(
          circle at 55% -10%,
          rgba(50,118,122,.12),
          transparent 32%
        ),
        var(--smc-bg) !important;

      color: var(--smc-text) !important;

      font-family:
        Inter,
        ui-sans-serif,
        system-ui,
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        sans-serif;
    }

    body.smc-shell-ready > .app {
      display: none !important;
    }

    #smcAppShell {
      min-height: 100vh;

      display: grid;

      grid-template-columns:
        var(--smc-sidebar-width)
        minmax(0,1fr);

      background: transparent;
    }

    /* =========================================================
       SIDEBAR
    ========================================================= */

    .smc-sidebar {
      position: fixed;
      inset: 0 auto 0 0;

      width: var(--smc-sidebar-width);

      box-sizing: border-box;

      padding: 24px 15px 20px;

      background:
        linear-gradient(
          180deg,
          rgba(9,23,30,.99),
          rgba(6,15,21,.99)
        );

      border-right:
        1px solid
        rgba(84,177,186,.18);

      display: flex;
      flex-direction: column;

      z-index: 9000;
    }

    .smc-brand {
      display: flex;
      align-items: center;
      gap: 11px;

      padding:
        0 8px 24px;
    }

    .smc-logo {
      width: 52px;
      height: 52px;

      flex: 0 0 52px;

      display: grid;
      place-items: center;

      border-radius: 50%;

      border:
        3px solid
        var(--smc-teal);

      color:
        var(--smc-teal);

      font-size:
        27px;

      font-weight:
        850;

      box-shadow:
        0 0 22px
        rgba(69,225,192,.2);
    }

    .smc-brand-name {
      font-size: 17px;
      font-weight: 850;
      line-height: 1.03;
      letter-spacing: .05em;
    }

    .smc-brand-tag {
      color: #71cabb;

      margin-top: 6px;

      font-size: 8px;
      font-weight: 800;
      letter-spacing: .18em;
    }

    .smc-nav {
      display: grid;
      gap: 6px;
    }

    .smc-nav-button {
      appearance: none;
      border: 0;

      width: 100%;

      display: flex;
      align-items: center;
      gap: 14px;

      padding: 12px 14px;

      border-radius: 14px;

      background: transparent;

      color: #bdcbd2;

      font-size: 14px;
      font-weight: 650;

      text-align: left;

      cursor: pointer;

      transition: .18s ease;
    }

    .smc-nav-button:hover {
      background:
        rgba(62,133,139,.12);

      color: white;
    }

    .smc-nav-button.active {
      color: #dffdf7;

      background:
        linear-gradient(
          90deg,
          rgba(20,119,110,.5),
          rgba(56,195,168,.27)
        );

      box-shadow:
        inset 0 0 0 1px
        rgba(69,225,192,.36);
    }

    .smc-nav-button.active svg {
      color: var(--smc-teal);
    }

    .smc-sidebar-bottom {
      margin-top: auto;

      display: grid;
      gap: 8px;
    }

    .smc-sidebar-small {
      color: #8297a2;

      display: flex;
      align-items: center;
      gap: 12px;

      padding: 10px 13px;

      font-size: 13px;
    }

    /* =========================================================
       MAIN
    ========================================================= */

    .smc-main {
      grid-column: 2;

      min-width: 0;

      padding:
        20px 28px 38px;
    }

    .smc-topbar {
      min-height: 68px;

      display: flex;
      align-items: center;
      justify-content: space-between;

      gap: 22px;

      margin-bottom: 24px;
    }

    .smc-search {
      width: min(540px,50vw);
      height: 48px;

      display: flex;
      align-items: center;
      gap: 12px;

      padding: 0 17px;

      box-sizing: border-box;

      border-radius: 16px;

      border:
        1px solid
        var(--smc-border);

      background:
        rgba(17,30,40,.84);

      color:
        var(--smc-muted);
    }

    .smc-search input {
      width: 100%;

      border: 0 !important;
      outline: 0 !important;
      box-shadow: none !important;

      background: transparent !important;

      color: white !important;

      font-size: 14px !important;

      padding: 0 !important;
    }

    .smc-search input::placeholder {
      color: #748995;
    }

    .smc-user-header {
      min-width: 0;
    }

    .smc-user-header .account-buttons {
      display: block;
      margin: 0;
    }

    .smc-user-header .account-button {
      background:
        rgba(20,41,51,.9) !important;

      border:
        1px solid
        rgba(101,170,180,.25) !important;

      color:
        white !important;

      border-radius:
        12px !important;
    }

    .smc-user-header .auth-user-name {
      color: white !important;
    }

    /* =========================================================
       PAGE SYSTEM
    ========================================================= */

    .smc-page {
      display: none;
    }

    .smc-page.active {
      display: block;

      animation:
        smcFade .18s ease;
    }

    @keyframes smcFade {
      from {
        opacity: 0;
        transform: translateY(4px);
      }

      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .smc-page-heading {
      margin-bottom: 22px;

      display: flex;
      align-items: flex-end;
      justify-content: space-between;

      gap: 20px;
    }

    .smc-page-heading h1 {
      margin: 0;

      color:
        var(--smc-text);

      font-size:
        clamp(
          27px,
          3vw,
          37px
        );

      line-height: 1.1;
    }

    .smc-page-heading p {
      margin: 7px 0 0;

      color:
        var(--smc-muted);

      font-size: 15px;
    }

    .smc-date-block {
      text-align: right;

      color: #a8bac3;

      font-size: 13px;
      line-height: 1.5;
    }

    /* =========================================================
       HOME
    ========================================================= */

    .smc-home-grid {
      display: grid;

      grid-template-columns:
        repeat(
          12,
          minmax(0,1fr)
        );

      gap: 14px;
    }

    .smc-dashboard-card {
      background:
        linear-gradient(
          145deg,
          rgba(19,34,44,.97),
          rgba(12,24,32,.98)
        );

      border:
        1px solid
        var(--smc-border);

      border-radius:
        var(--smc-radius);

      box-shadow:
        0 18px 45px
        rgba(0,0,0,.12);

      overflow: hidden;
    }

    .smc-card-pad {
      padding: 20px;
    }

    .smc-card-title {
      display: flex;
      align-items: center;
      gap: 10px;

      color: #f1f7f8;

      font-size: 14px;
      font-weight: 760;
    }

    .smc-icon-teal {
      color: var(--smc-teal);
    }

    .smc-available-card {
      grid-column: span 4;

      background:
        radial-gradient(
          circle at 15% 10%,
          rgba(22,116,100,.3),
          transparent 55%
        ),
        linear-gradient(
          145deg,
          rgba(14,48,47,.9),
          rgba(12,25,33,.98)
        );
    }

    .smc-safe-card {
      grid-column: span 4;
    }

    .smc-payday-card {
      grid-column: span 4;
    }

    .smc-main-money {
      margin: 30px 0 23px;

      font-size:
        clamp(
          34px,
          4vw,
          48px
        );

      font-weight: 850;
      letter-spacing: -.035em;
    }

    .smc-detail-row {
      display: flex;
      justify-content: space-between;

      gap: 15px;

      padding: 10px 0;

      border-top:
        1px solid
        rgba(255,255,255,.07);

      color: #b6c5cc;

      font-size: 13px;
    }

    .smc-detail-row strong {
      color: white;
    }

    .smc-safe-ring-wrap {
      display: grid;
      place-items: center;

      padding: 12px 0 4px;
    }

    .smc-safe-ring {
      --progress: 25%;

      width: 158px;
      height: 158px;

      display: grid;
      place-items: center;

      position: relative;

      border-radius: 50%;

      background:
        conic-gradient(
          var(--smc-teal)
          0 var(--progress),

          #263746
          var(--progress)
          100%
        );
    }

    .smc-safe-ring::before {
      content: "";

      position: absolute;
      inset: 16px;

      border-radius: 50%;

      background: #0d1922;
    }

    .smc-safe-ring-content {
      position: relative;
      z-index: 2;

      text-align: center;
    }

    .smc-safe-ring-amount {
      display: block;

      font-size: 30px;
      font-weight: 850;
    }

    .smc-safe-ring-label {
      color: #9cb0bb;

      font-size: 12px;
    }

    .smc-daily-safe {
      text-align: center;

      margin-top: 10px;

      color: white;

      font-size: 16px;
      font-weight: 750;
    }

    .smc-safe-note {
      margin-top: 6px;

      text-align: center;

      color: #8297a3;

      font-size: 12px;
      line-height: 1.45;
    }

    .smc-payday-date {
      margin-top: 24px;

      color: white;

      font-size: 19px;
      font-weight: 750;
    }

    .smc-payday-amount {
      margin: 12px 0 5px;

      font-size: 36px;
      font-weight: 850;
    }

    .smc-payday-days {
      color: #c3ced3;

      font-size: 16px;
    }

    .smc-action-button {
      width: 100%;

      margin-top: 24px;

      min-height: 43px;

      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;

      border:
        1px solid
        var(--smc-teal);

      border-radius: 999px;

      background:
        linear-gradient(
          90deg,
          rgba(20,127,117,.75),
          rgba(41,149,139,.72)
        );

      color: white;

      font-weight: 760;

      cursor: pointer;
    }

    .smc-forecast-card {
      grid-column: span 8;
    }

    .smc-upcoming-card {
      grid-column: span 4;
    }

    .smc-forecast-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;

      gap: 16px;

      margin-bottom: 14px;
    }

    .smc-subtitle {
      color: #81949f;

      font-size: 12px;

      margin-top: 5px;
    }

    .smc-chart-area {
      min-height: 220px;

      display: grid;

      grid-template-columns:
        minmax(0,1fr)
        190px;

      gap: 18px;

      align-items: center;
    }

    #smcForecastSvg {
      width: 100%;
      height: 190px;

      overflow: visible;
    }

    .smc-chart-grid {
      stroke:
        rgba(135,165,179,.12);

      stroke-width: 1;
    }

    .smc-chart-line {
      fill: none;

      stroke:
        var(--smc-teal);

      stroke-width: 3;

      stroke-linecap: round;
      stroke-linejoin: round;

      filter:
        drop-shadow(
          0 0 6px
          rgba(69,225,192,.25)
        );
    }

    .smc-chart-fill {
      fill: url(#smcAreaGradient);
    }

    .smc-chart-dot {
      fill: var(--smc-teal);

      stroke: #cffff5;

      stroke-width: 1;
    }

    .smc-forecast-result {
      background:
        rgba(9,23,30,.62);

      border:
        1px solid
        rgba(71,150,155,.18);

      border-radius: 15px;

      padding: 18px;

      text-align: center;
    }

    .smc-forecast-result span {
      display: block;

      color: #96a9b3;

      font-size: 11px;

      margin-bottom: 8px;
    }

    .smc-forecast-result strong {
      display: block;

      font-size: 27px;
    }

    .smc-upcoming-list {
      margin-top: 12px;

      display: grid;
    }

    .smc-upcoming-item {
      display: grid;

      grid-template-columns:
        42px
        1fr
        auto;

      gap: 10px;

      align-items: center;

      padding: 11px 0;

      border-top:
        1px solid
        rgba(255,255,255,.065);
    }

    .smc-upcoming-date {
      color: #a8bac3;

      font-size: 10px;

      text-align: center;

      text-transform: uppercase;
    }

    .smc-upcoming-date strong {
      display: block;

      color: white;

      font-size: 17px;
    }

    .smc-upcoming-name {
      font-size: 12px;

      color: #d8e1e5;
    }

    .smc-income {
      color: var(--smc-green);

      font-weight: 750;
    }

    .smc-expense {
      color: var(--smc-red);

      font-weight: 750;
    }

    .smc-small-stat {
      grid-column: span 4;

      min-height: 140px;
    }

    .smc-small-stat-number {
      margin-top: 22px;

      font-size: 27px;
      font-weight: 820;
    }

    .smc-small-stat-note {
      color: #879ba6;

      margin-top: 4px;

      font-size: 12px;
    }

    .smc-status-card {
      grid-column: span 8;

      padding: 17px 19px;

      display: flex;
      align-items: center;
      justify-content: space-between;

      gap: 18px;

      border-color:
        rgba(255,157,85,.35);

      background:
        linear-gradient(
          90deg,
          rgba(116,61,18,.3),
          rgba(47,30,19,.45)
        );
    }

    .smc-status-left {
      display: flex;
      align-items: center;

      gap: 14px;
    }

    .smc-warning-icon {
      width: 39px;
      height: 39px;

      display: grid;
      place-items: center;

      border-radius: 50%;

      flex: 0 0 auto;

      background:
        var(--smc-orange);

      color: #27170b;

      font-weight: 900;

      font-size: 22px;
    }

    .smc-status-title {
      color: var(--smc-orange);

      font-size: 16px;
      font-weight: 800;
    }

    .smc-status-text {
      color: #b7c1c6;

      margin-top: 4px;

      font-size: 11px;
      line-height: 1.45;
    }

    .smc-progress-card {
      grid-column: span 4;

      padding: 19px;

      background:
        radial-gradient(
          circle at 100% 100%,
          rgba(50,125,89,.22),
          transparent 60%
        ),
        linear-gradient(
          145deg,
          #112029,
          #101b23
        );
    }

    .smc-progress-card h3 {
      margin: 13px 0 8px;

      font-size: 18px;
    }

    .smc-progress-card p {
      margin: 0;

      color: #9aadb7;

      font-size: 13px;
      line-height: 1.55;
    }

    /* =========================================================
       LEGACY PLANNER DARK CONVERSION
    ========================================================= */

    .smc-section-wrap {
      display: grid;
      gap: 18px;
    }

    #smcPlanPage .intro-card,
    #smcPlanPage .card,
    #smcPlanPage .saved-plans-card,
    #smcPlanPage .planner-results,
    #smcPlanPage .results,
    #smcPlanPage section,

    #smcToolsPage section,
    #smcToolsPage article,
    #smcToolsPage .card,
    #smcToolsPage [class*="tool"],
    #smcToolsPage [class*="afford"],
    #smcToolsPage [class*="replan"],

    #smcAccountPage .saved-plans-card {

      background:
        linear-gradient(
          145deg,
          var(--smc-card),
          #0c1821
        ) !important;

      color:
        var(--smc-text) !important;

      border:
        1px solid
        var(--smc-border) !important;

      box-shadow:
        none !important;

      border-radius:
        18px !important;
    }

    /* WHITE PAYCHECK/BILL ROWS */

    #smcPlanPage .row-card,
    #smcPlanPage .paycheck-entry,
    #smcPlanPage .bill-entry,
    #smcPlanPage .necessity-row,
    #smcPlanPage .bill-item,
    #smcPlanPage .summary-tile,
    #smcPlanPage .reserve-box,
    #smcPlanPage .cushion-box,
    #smcPlanPage .safe-spend-box,
    #smcPlanPage .money-breakdown,
    #smcPlanPage .result-card,
    #smcPlanPage .paycheck-result,
    #smcPlanPage .step,

    #smcToolsPage .row-card,
    #smcToolsPage .tool-card,
    #smcToolsPage .dashboard-tool,
    #smcToolsPage .dashboard-tool-card,
    #smcToolsPage .afford-card,
    #smcToolsPage .replan-card,
    #smcToolsPage .replan-option,
    #smcToolsPage .replan-result,
    #smcToolsPage .afford-result {

      background:
        var(--smc-card-2) !important;

      color:
        var(--smc-text) !important;

      border:
        1px solid
        var(--smc-border) !important;

      box-shadow:
        none !important;
    }

    /* INTRO STEP BOXES */

    #smcPlanPage .steps {
      gap: 10px !important;
    }

    #smcPlanPage .step {
      color:
        #b8c8cf !important;

      border-radius:
        12px !important;

      padding:
        14px !important;

      text-align:
        center !important;

      font-weight:
        700 !important;
    }

    /* HEADINGS */

    #smcPlanPage h1,
    #smcPlanPage h2,
    #smcPlanPage h3,
    #smcPlanPage h4,

    #smcToolsPage h1,
    #smcToolsPage h2,
    #smcToolsPage h3,
    #smcToolsPage h4,

    #smcAccountPage h1,
    #smcAccountPage h2,
    #smcAccountPage h3 {

      color:
        var(--smc-text) !important;
    }

    /* REGULAR TEXT */

    #smcPlanPage p,
    #smcPlanPage .helper,
    #smcPlanPage .bill-meta,
    #smcPlanPage .safe-spend-note,
    #smcPlanPage .result-note,

    #smcToolsPage p,
    #smcToolsPage .helper,
    #smcToolsPage .tool-helper,

    #smcAccountPage p {

      color:
        var(--smc-muted) !important;
    }

    #smcPlanPage label,
    #smcToolsPage label,
    #smcAccountPage label {

      color:
        #adc1ca !important;

      font-weight:
        700 !important;
    }

    /* INPUTS */

    #smcPlanPage input,
    #smcPlanPage select,
    #smcPlanPage textarea,

    #smcToolsPage input,
    #smcToolsPage select,
    #smcToolsPage textarea,

    #smcAccountPage input,
    #smcAccountPage select {

      background:
        var(--smc-input) !important;

      color:
        #f7fbfc !important;

      border:
        1px solid
        rgba(111,163,179,.26) !important;

      border-radius:
        11px !important;

      box-shadow:
        inset 0 0 0 1px
        rgba(0,0,0,.12) !important;
    }

    #smcPlanPage input:focus,
    #smcPlanPage select:focus,
    #smcPlanPage textarea:focus,

    #smcToolsPage input:focus,
    #smcToolsPage select:focus,
    #smcToolsPage textarea:focus {

      outline: none !important;

      border-color:
        var(--smc-teal) !important;

      box-shadow:
        0 0 0 3px
        rgba(69,225,192,.11) !important;
    }

    #smcPlanPage input::placeholder,
    #smcToolsPage input::placeholder {

      color:
        #55717e !important;

      opacity: 1 !important;
    }

    #smcPlanPage input[type="date"],
    #smcToolsPage input[type="date"] {
      color-scheme: dark;
    }

    /* AUTOFILL */

    #smcPlanPage input:-webkit-autofill,
    #smcToolsPage input:-webkit-autofill {

      -webkit-text-fill-color:
        white !important;

      box-shadow:
        0 0 0 1000px
        var(--smc-input)
        inset !important;

      transition:
        background-color
        9999s ease-in-out
        0s;
    }

    /* REMOVE BUTTONS */

    #smcPlanPage .remove-button,
    #smcPlanPage .btn-danger,
    #smcPlanPage button[class*="remove"],
    #smcPlanPage button[class*="danger"] {

      background:
        rgba(155,48,56,.16) !important;

      color:
        #ff8d91 !important;

      border:
        1px solid
        rgba(255,116,121,.28) !important;

      border-radius:
        10px !important;

      box-shadow:
        none !important;
    }

    #smcPlanPage .remove-button:hover,
    #smcPlanPage .btn-danger:hover,
    #smcPlanPage button[class*="remove"]:hover {

      background:
        rgba(194,60,68,.25) !important;
    }

    /* ADD / SECONDARY BUTTONS */

    #smcPlanPage .btn-secondary,
    #smcPlanPage button[class*="secondary"],
    #smcPlanPage .add-button,
    #smcPlanPage button[id*="add"],
    #smcPlanPage button[id*="Add"] {

      background:
        rgba(49,103,112,.18) !important;

      color:
        #d5e6eb !important;

      border:
        1px solid
        rgba(111,163,179,.25) !important;

      border-radius:
        11px !important;

      box-shadow:
        none !important;
    }

    /* PRIMARY BUTTONS */

    #smcPlanPage .btn-primary,
    #smcPlanPage button[id*="optimize"],
    #smcPlanPage button[id*="Optimize"],

    #smcToolsPage .btn-primary,
    #smcToolsPage button[id*="afford"],
    #smcToolsPage button[id*="Afford"],
    #smcToolsPage button[id*="replan"],
    #smcToolsPage button[id*="Replan"] {

      background:
        linear-gradient(
          90deg,
          #187b74,
          #258f87
        ) !important;

      color:
        white !important;

      border:
        1px solid
        rgba(69,225,192,.35) !important;

      box-shadow:
        none !important;

      border-radius:
        11px !important;
    }

    /* TOOL CHOICE BUTTONS */

    #smcToolsPage button:not(.smc-action-button) {

      background:
        #13242e !important;

      color:
        #dce8ec !important;

      border:
        1px solid
        rgba(122,166,181,.20) !important;

      box-shadow:
        none !important;
    }

    #smcToolsPage button:not(.smc-action-button):hover {

      background:
        #17303a !important;

      border-color:
        rgba(69,225,192,.32) !important;
    }

    /* SAVED PLANS */

    #smcAccountPage .saved-plan-item {

      background:
        var(--smc-card-2) !important;

      border:
        1px solid
        var(--smc-border) !important;

      color:
        var(--smc-text) !important;
    }

    #smcAccountPage .saved-plan-meta {

      color:
        var(--smc-muted) !important;
    }

    /* RESULT STATUS */

    #smcPlanPage .status {

      background:
        #13242e !important;

      color:
        #dce8ec !important;

      border:
        1px solid
        var(--smc-border) !important;

      border-radius:
        14px !important;
    }

    #smcPlanPage .status.good {

      background:
        rgba(37,122,91,.14) !important;

      border-color:
        rgba(92,231,177,.24) !important;
    }

    #smcPlanPage .status.warning {

      background:
        rgba(151,91,33,.16) !important;

      border-color:
        rgba(255,157,85,.25) !important;
    }

    #smcPlanPage .status.bad {

      background:
        rgba(158,55,62,.15) !important;

      border-color:
        rgba(255,116,121,.25) !important;
    }

    /* SUMMARY TILES */

    #smcPlanPage .summary-tile strong {
      color:
        white !important;
    }

    #smcPlanPage .summary-tile span {
      color:
        #91a7b2 !important;
    }

    #smcPlanPage .summary-tile.safe {

      background:
        rgba(28,107,95,.22) !important;

      border-color:
        rgba(69,225,192,.25) !important;
    }

    /* RESULT BILL LINES */

    #smcPlanPage .bill-item {

      border-radius:
        11px !important;

      margin-bottom:
        7px !important;
    }

    /* SAFE SPEND */

    #smcPlanPage .safe-spend-box {

      background:
        linear-gradient(
          145deg,
          rgba(20,89,81,.26),
          rgba(17,36,45,.92)
        ) !important;

      border-color:
        rgba(69,225,192,.25) !important;
    }

    #smcPlanPage .safe-spend-number {

      color:
        var(--smc-teal) !important;
    }

    /* TOOL CARD FIX */

    #smcToolsPage > div,
    #smcToolsContent > div {

      color:
        var(--smc-text);
    }

    #smcToolsPage .dashboard-section,
    #smcToolsPage .dashboard-card,
    #smcToolsPage .tool-section,
    #smcToolsPage .afford-section,
    #smcToolsPage .replan-section {

      background:
        var(--smc-card) !important;

      border:
        1px solid
        var(--smc-border) !important;

      color:
        var(--smc-text) !important;
    }

    /* =========================================================
       ACCOUNT
    ========================================================= */

    .smc-account-grid {
      display: grid;

      grid-template-columns:
        repeat(
          2,
          minmax(0,1fr)
        );

      gap: 15px;

      margin-bottom: 16px;
    }

    .smc-account-action {
      padding: 22px;

      border:
        1px solid
        var(--smc-border);

      border-radius: 18px;

      background:
        linear-gradient(
          145deg,
          #10202a,
          #0d1922
        );

      color: white;
    }

    .smc-account-action h3 {
      margin: 12px 0 6px;

      font-size: 17px;
    }

    .smc-account-action p {
      min-height: 38px;

      margin: 0 0 15px;

      color: #8fa2ae;

      font-size: 12px;
      line-height: 1.5;
    }

    .smc-account-action button {
      border:
        1px solid
        rgba(69,225,192,.35);

      border-radius: 999px;

      padding: 9px 15px;

      background:
        rgba(37,133,122,.18);

      color:
        var(--smc-teal);

      font-weight: 750;

      cursor: pointer;
    }

    .smc-placeholder-card {
      background:
        linear-gradient(
          145deg,
          rgba(17,31,40,.98),
          rgba(12,23,31,.98)
        );

      border:
        1px solid
        var(--smc-border);

      border-radius: 18px;

      padding: 28px;

      color: #a3b5be;
    }

    .smc-placeholder-card h2 {
      color: white;

      margin: 0 0 8px;
    }

    /* =========================================================
       MOBILE
    ========================================================= */

    .smc-bottom-nav {
      display: none;
    }

    @media (max-width: 1050px) {

      :root {
        --smc-sidebar-width:
          205px;
      }

      .smc-main {
        padding:
          18px 20px 35px;
      }

      .smc-available-card,
      .smc-safe-card,
      .smc-payday-card {
        grid-column:
          span 6;
      }

      .smc-payday-card {
        grid-column:
          span 12;
      }

      .smc-forecast-card {
        grid-column:
          span 12;
      }

      .smc-upcoming-card {
        grid-column:
          span 12;
      }
    }

    @media (max-width: 760px) {

      #smcAppShell {
        display: block;
      }

      .smc-sidebar {
        display: none;
      }

      .smc-main {
        padding:
          14px 14px 90px;
      }

      .smc-topbar {
        min-height: 54px;

        margin-bottom: 17px;
      }

      .smc-search {
        display: none;
      }

      .smc-user-header {
        margin-left: auto;
      }

      .smc-page-heading {
        align-items: flex-start;
      }

      .smc-page-heading h1 {
        font-size: 28px;
      }

      .smc-date-block {
        display: none;
      }

      .smc-home-grid {
        grid-template-columns: 1fr;
      }

      .smc-available-card,
      .smc-safe-card,
      .smc-payday-card,
      .smc-forecast-card,
      .smc-upcoming-card,
      .smc-small-stat,
      .smc-status-card,
      .smc-progress-card {
        grid-column: 1;
      }

      .smc-chart-area {
        grid-template-columns: 1fr;
      }

      .smc-account-grid {
        grid-template-columns: 1fr;
      }

      .smc-status-card {
        align-items: flex-start;
        flex-direction: column;
      }

      .smc-bottom-nav {
        position: fixed;

        left: 0;
        right: 0;
        bottom: 0;

        display: grid;

        grid-template-columns:
          repeat(5,1fr);

        z-index: 9500;

        padding:
          7px 7px
          max(
            7px,
            env(safe-area-inset-bottom)
          );

        background:
          rgba(7,16,22,.96);

        backdrop-filter:
          blur(18px);

        border-top:
          1px solid
          rgba(98,160,172,.18);
      }

      .smc-mobile-nav-button {
        border: 0;
        background: transparent;

        color: #718792;

        display: grid;
        place-items: center;

        gap: 3px;

        font-size: 9px;

        padding: 5px 1px;

        cursor: pointer;
      }

      .smc-mobile-nav-button svg {
        width: 21px;
        height: 21px;
      }

      .smc-mobile-nav-button.active {
        color: var(--smc-teal);
      }
    }

    @media print {

      .smc-sidebar,
      .smc-topbar,
      .smc-bottom-nav,
      .smc-page-heading {
        display: none !important;
      }

      #smcAppShell {
        display: block;
      }

      .smc-main {
        padding: 0;
      }
    }
  `;

  document.head.appendChild(style);

  /* =========================================================
     FINAL DARK OVERRIDES
     Catches planner result cards that are created dynamically
     after Optimize My Money runs.
  ========================================================= */

  const finalDarkStyle =
    document.createElement("style");

  finalDarkStyle.id =
    "smcFinalDarkOverrides";

  finalDarkStyle.textContent = `

    /* ---------------------------------------------------------
       OPTIMIZER / RECOMMENDED PLAN
    --------------------------------------------------------- */

    #smcAppShell #smcPlanPage #plannerResults,
    #smcAppShell #smcPlanPage .results,
    #smcAppShell #smcPlanPage .results.show {
      background:
        linear-gradient(
          145deg,
          #101f29,
          #0b1820
        ) !important;

      color:
        #f4f8fa !important;

      border:
        1px solid
        rgba(132,175,192,.17) !important;

      box-shadow:
        none !important;
    }

    #smcAppShell #smcPlanPage #plannerResults > h2 {
      color:
        #f5fbfc !important;
    }

    /* Main Week 1 / Week 2 cards */

    #smcAppShell #smcPlanPage .week-card {
      background:
        linear-gradient(
          145deg,
          #11232d,
          #0c1922
        ) !important;

      color:
        #f4f8fa !important;

      border:
        1px solid
        rgba(122,170,184,.18) !important;

      border-radius:
        16px !important;

      box-shadow:
        0 12px 28px
        rgba(0,0,0,.15) !important;
    }

    #smcAppShell #smcPlanPage .week-card.negative {
      background:
        linear-gradient(
          145deg,
          rgba(87,31,38,.42),
          #0d1921
        ) !important;

      border-color:
        rgba(255,116,121,.28) !important;
    }

    #smcAppShell #smcPlanPage .week-heading {
      border-bottom:
        1px solid
        rgba(132,175,192,.12) !important;

      padding-bottom:
        13px !important;
    }

    #smcAppShell #smcPlanPage .week-heading h3 {
      color:
        #f5fbfc !important;

      font-size:
        20px !important;
    }

    #smcAppShell #smcPlanPage .week-date {
      color:
        #91a9b4 !important;
    }

    #smcAppShell #smcPlanPage .running-balance {
      color:
        #f1fafb !important;
    }

    /* Result summary tiles */

    #smcAppShell #smcPlanPage .result-summary .summary-tile,
    #smcAppShell #smcPlanPage .week-card .summary-tile {
      background:
        #122630 !important;

      color:
        #f4f8fa !important;

      border:
        1px solid
        rgba(132,175,192,.14) !important;

      box-shadow:
        none !important;
    }

    #smcAppShell #smcPlanPage .result-summary .summary-tile span,
    #smcAppShell #smcPlanPage .week-card .summary-tile span {
      color:
        #8da5b0 !important;
    }

    #smcAppShell #smcPlanPage .result-summary .summary-tile strong,
    #smcAppShell #smcPlanPage .week-card .summary-tile strong {
      color:
        #ffffff !important;
    }

    #smcAppShell #smcPlanPage .result-summary .summary-tile.safe {
      background:
        linear-gradient(
          145deg,
          rgba(19,72,67,.72),
          #10252a
        ) !important;

      border-color:
        rgba(69,225,192,.25) !important;
    }

    #smcAppShell #smcPlanPage .result-summary .summary-tile.safe strong {
      color:
        #45e1c0 !important;
    }

    /* Bill list inside results */

    #smcAppShell #smcPlanPage .week-card .bill-list {
      border-color:
        rgba(132,175,192,.13) !important;
    }

    #smcAppShell #smcPlanPage .week-card .bill-item {
      background:
        #112630 !important;

      color:
        #f2f8fa !important;

      border:
        1px solid
        rgba(132,175,192,.13) !important;

      border-radius:
        10px !important;

      padding:
        11px 12px !important;

      margin-bottom:
        7px !important;
    }

    #smcAppShell #smcPlanPage .week-card .bill-item strong {
      color:
        #ffffff !important;
    }

    #smcAppShell #smcPlanPage .week-card .bill-meta {
      color:
        #83a0ad !important;
    }

    /* Reserve + cushion */

    #smcAppShell #smcPlanPage .week-card .reserve-box,
    #smcAppShell #smcPlanPage .week-card .cushion-box {
      background:
        #10232d !important;

      color:
        #f3f9fa !important;

      border:
        1px solid
        rgba(132,175,192,.14) !important;

      box-shadow:
        none !important;
    }

    #smcAppShell #smcPlanPage .week-card .reserve-box span,
    #smcAppShell #smcPlanPage .week-card .cushion-box span {
      color:
        #859eaa !important;
    }

    #smcAppShell #smcPlanPage .week-card .reserve-box strong,
    #smcAppShell #smcPlanPage .week-card .cushion-box strong {
      color:
        #ffffff !important;
    }

    /* Safe to spend */

    #smcAppShell #smcPlanPage .week-card .safe-spend-box {
      background:
        radial-gradient(
          circle at 0% 0%,
          rgba(69,225,192,.12),
          transparent 48%
        ),
        linear-gradient(
          145deg,
          #10312f,
          #10232b
        ) !important;

      border:
        1px solid
        rgba(69,225,192,.28) !important;

      color:
        #e8faf6 !important;
    }

    #smcAppShell #smcPlanPage .week-card .safe-spend-label {
      color:
        #91dfcf !important;
    }

    #smcAppShell #smcPlanPage .week-card .safe-spend-number {
      color:
        #45e1c0 !important;
    }

    #smcAppShell #smcPlanPage .week-card .safe-spend-note {
      color:
        #8ca7b0 !important;
    }

    /* Status messages */

    #smcAppShell #smcPlanPage .status {
      color:
        #dce9ed !important;

      border-radius:
        13px !important;
    }

    #smcAppShell #smcPlanPage .status.good {
      background:
        rgba(26,91,73,.23) !important;

      border:
        1px solid
        rgba(92,231,177,.25) !important;
    }

    #smcAppShell #smcPlanPage .status.warning {
      background:
        rgba(126,79,27,.24) !important;

      border:
        1px solid
        rgba(255,157,85,.28) !important;
    }

    #smcAppShell #smcPlanPage .status.bad {
      background:
        rgba(116,39,46,.25) !important;

      border:
        1px solid
        rgba(255,116,121,.28) !important;
    }

    /* ---------------------------------------------------------
       PLANNER ENTRY CARDS — EXTRA CATCH-ALL
    --------------------------------------------------------- */

    #smcAppShell #smcPlanPage .row-card,
    #smcAppShell #smcPlanPage .paycheck-entry,
    #smcAppShell #smcPlanPage .bill-entry,
    #smcAppShell #smcPlanPage .necessity-row {
      background:
        #13242e !important;

      color:
        #f4f8fa !important;

      border-color:
        rgba(132,175,192,.16) !important;
    }

    /* ---------------------------------------------------------
       MONEY TOOLS — NEVER ALLOW LARGE WHITE PANELS
    --------------------------------------------------------- */

    #smcAppShell #smcToolsPage section,
    #smcAppShell #smcToolsPage article,
    #smcAppShell #smcToolsPage .card,
    #smcAppShell #smcToolsPage .tool-card,
    #smcAppShell #smcToolsPage .dashboard-tool,
    #smcAppShell #smcToolsPage .dashboard-tool-card,
    #smcAppShell #smcToolsPage .afford-card,
    #smcAppShell #smcToolsPage .replan-card {
      background:
        linear-gradient(
          145deg,
          #12242e,
          #0f1f28
        ) !important;

      color:
        #f4f8fa !important;

      border:
        1px solid
        rgba(132,175,192,.17) !important;

      box-shadow:
        none !important;
    }

    /* ---------------------------------------------------------
       ACCOUNT / SAVED PLANS
    --------------------------------------------------------- */

    #smcAppShell #smcAccountPage .saved-plans-card,
    #smcAppShell #smcAccountPage .saved-plan-item {
      background:
        linear-gradient(
          145deg,
          #12242e,
          #0e1d26
        ) !important;

      color:
        #f4f8fa !important;

      border:
        1px solid
        rgba(132,175,192,.17) !important;

      box-shadow:
        none !important;
    }

    #smcAppShell #smcAccountPage .saved-plan-meta {
      color:
        #8fa6b1 !important;
    }

    /* ---------------------------------------------------------
       GENERIC LEGACY LIGHT BACKGROUNDS INSIDE APP PAGES
       These selectors intentionally stay inside the new shell.
    --------------------------------------------------------- */

    #smcAppShell #smcPlanPage .card,
    #smcAppShell #smcPlanPage .intro-card,
    #smcAppShell #smcToolsPage .card,
    #smcAppShell #smcAccountPage .card {
      background-color:
        #101f29 !important;
    }

  `;

  document.head.appendChild(
    finalDarkStyle
  );


  /* =========================================================
     SHELL
  ========================================================= */

  const shell = document.createElement("div");

  shell.id = "smcAppShell";

  shell.innerHTML = `

    <aside class="smc-sidebar">

      <div class="smc-brand">

        <div class="smc-logo">
          $
        </div>

        <div>

          <div class="smc-brand-name">
            STRETCH<br>
            MY CHECK
          </div>

          <div class="smc-brand-tag">
            PLAN SMARTER<br>
            LIVE BRIGHTER
          </div>

        </div>

      </div>

      <nav class="smc-nav">

        <button
          class="smc-nav-button active"
          data-page="home"
          type="button"
        >
          ${icon("home")}
          <span>Home</span>
        </button>

        <button
          class="smc-nav-button"
          data-page="plan"
          type="button"
        >
          ${icon("plan")}
          <span>My Plan</span>
        </button>

        <button
          class="smc-nav-button"
          data-page="tools"
          type="button"
        >
          ${icon("tools")}
          <span>Money Tools</span>
        </button>

        <button
          class="smc-nav-button"
          data-page="goals"
          type="button"
        >
          ${icon("goals")}
          <span>Goals</span>
        </button>

        <button
          class="smc-nav-button"
          data-page="account"
          type="button"
        >
          ${icon("user")}
          <span>Account</span>
        </button>

      </nav>

      <div class="smc-sidebar-bottom">

        <div class="smc-sidebar-small">
          ${icon("moon",18)}
          Dark Mode
        </div>

        <div class="smc-sidebar-small">
          ${icon("logout",18)}
          Secure Account
        </div>

      </div>

    </aside>

    <main class="smc-main">

      <header class="smc-topbar">

        <div class="smc-search">

          ${icon("search",19)}

          <input
            id="smcPlanSearch"
            type="text"
            placeholder="Search your plans..."
            autocomplete="off"
          >

        </div>

        <div
          id="smcUserHeader"
          class="smc-user-header"
        ></div>

      </header>

      <section
        id="smcHomePage"
        class="smc-page active"
        data-page-name="home"
      >

        <div class="smc-page-heading">

          <div>

            <h1>
              Good evening,
              <span id="smcGreetingName">
                there
              </span>
            </h1>

            <p>
              Here's how your money is
              looking right now.
            </p>

          </div>

          <div class="smc-date-block">

            <div id="smcCurrentDate">
            </div>

            <div>
              Small steps still make
              big progress.
            </div>

          </div>

        </div>

        <div class="smc-home-grid">

          <article
            class="
              smc-dashboard-card
              smc-available-card
              smc-card-pad
            "
          >

            <div class="smc-card-title">

              <span class="smc-icon-teal">
                ${icon("wallet")}
              </span>

              Available Now

            </div>

            <div
              id="smcAvailableNow"
              class="smc-main-money"
            >
              $0.00
            </div>

            <div class="smc-detail-row">

              <span>
                Protected Cushion
              </span>

              <strong id="smcCushion">
                $0.00
              </strong>

            </div>

            <div class="smc-detail-row">

              <span>
                Bills Before Payday
              </span>

              <strong id="smcBillsBeforePayday">
                $0.00
              </strong>

            </div>

          </article>

          <article
            class="
              smc-dashboard-card
              smc-safe-card
              smc-card-pad
            "
          >

            <div class="smc-card-title">

              <span class="smc-icon-teal">
                ${icon("money")}
              </span>

              Safe to Spend
              Until Payday

            </div>

            <div class="smc-safe-ring-wrap">

              <div
                id="smcSafeRing"
                class="smc-safe-ring"
              >

                <div class="smc-safe-ring-content">

                  <span
                    id="smcSafeAmount"
                    class="smc-safe-ring-amount"
                  >
                    $0.00
                  </span>

                  <span class="smc-safe-ring-label">
                    Left to spend
                  </span>

                </div>

              </div>

            </div>

            <div
              id="smcDailySafe"
              class="smc-daily-safe"
            >
              $0.00 per day
            </div>

            <div
              id="smcSafeNote"
              class="smc-safe-note"
            >
              Add your money and next
              payday to see your safe
              spending amount.
            </div>

          </article>

          <article
            class="
              smc-dashboard-card
              smc-payday-card
              smc-card-pad
            "
          >

            <div class="smc-card-title">

              <span style="color:var(--smc-blue);">
                ${icon("calendar")}
              </span>

              Next Payday

            </div>

            <div
              id="smcPaydayDate"
              class="smc-payday-date"
            >
              Add a payday
            </div>

            <div
              id="smcPaydayAmount"
              class="smc-payday-amount"
            >
              $0.00
            </div>

            <div
              id="smcPaydayDays"
              class="smc-payday-days"
            >
              —
            </div>

            <button
              class="smc-action-button"
              data-go-page="plan"
              type="button"
            >
              View My Plan
              ${icon("chevron",17)}
            </button>

          </article>

          <article
            class="
              smc-dashboard-card
              smc-forecast-card
              smc-card-pad
            "
          >

            <div class="smc-forecast-header">

              <div>

                <div class="smc-card-title">

                  <span class="smc-icon-teal">
                    ${icon("chart")}
                  </span>

                  Money Forecast

                </div>

                <div class="smc-subtitle">
                  See how your money is
                  expected to move over
                  the next few paychecks.
                </div>

              </div>

            </div>

            <div class="smc-chart-area">

              <svg
                id="smcForecastSvg"
                viewBox="0 0 500 190"
                preserveAspectRatio="none"
              ></svg>

              <div class="smc-forecast-result">

                <span>
                  Forecast Ending Balance
                </span>

                <strong id="smcForecastEnding">
                  $0.00
                </strong>

              </div>

            </div>

          </article>

          <article
            class="
              smc-dashboard-card
              smc-upcoming-card
              smc-card-pad
            "
          >

            <div class="smc-card-title">

              <span style="color:var(--smc-purple);">
                ${icon("calendar")}
              </span>

              Upcoming

            </div>

            <div
              id="smcUpcomingList"
              class="smc-upcoming-list"
            ></div>

          </article>

          <article
            class="
              smc-dashboard-card
              smc-small-stat
              smc-card-pad
            "
          >

            <div class="smc-card-title">

              <span class="smc-icon-teal">
                ${icon("money")}
              </span>

              Income

            </div>

            <div
              id="smcIncomeTotal"
              class="smc-small-stat-number"
            >
              $0.00
            </div>

            <div class="smc-small-stat-note">
              Upcoming paychecks
            </div>

          </article>

          <article
            class="
              smc-dashboard-card
              smc-small-stat
              smc-card-pad
            "
          >

            <div class="smc-card-title">

              <span style="color:var(--smc-orange);">
                ${icon("bill")}
              </span>

              Bills

            </div>

            <div
              id="smcBillTotal"
              class="smc-small-stat-number"
            >
              $0.00
            </div>

            <div class="smc-small-stat-note">
              This planning period
            </div>

          </article>

          <article
            class="
              smc-dashboard-card
              smc-small-stat
              smc-card-pad
            "
          >

            <div class="smc-card-title">

              <span style="color:var(--smc-purple);">
                ${icon("cart")}
              </span>

              Living Expenses

            </div>

            <div
              id="smcLivingTotal"
              class="smc-small-stat-number"
            >
              $0.00
            </div>

            <div class="smc-small-stat-note">
              This planning period
            </div>

          </article>

          <article
            class="
              smc-dashboard-card
              smc-status-card
            "
          >

            <div class="smc-status-left">

              <div class="smc-warning-icon">
                !
              </div>

              <div>

                <div
                  id="smcStatusTitle"
                  class="smc-status-title"
                >
                  Build Your Plan
                </div>

                <div
                  id="smcStatusText"
                  class="smc-status-text"
                >
                  Add your money,
                  paychecks and bills to
                  see your payday outlook.
                </div>

              </div>

            </div>

            <button
              class="smc-action-button"
              data-go-page="tools"
              type="button"
              style="
                width:auto;
                margin:0;
                padding:0 20px;
              "
            >
              Open Money Tools
              ${icon("chevron",16)}
            </button>

          </article>

          <article
            class="
              smc-dashboard-card
              smc-progress-card
            "
          >

            <div
              style="
                color:var(--smc-green);
                font-size:24px;
              "
            >
              ♧
            </div>

            <h3>
              Progress Over Perfection
            </h3>

            <p>
              You've got this.
              Every plan is a step
              toward a more stable you.
            </p>

          </article>

        </div>

      </section>

      <section
        id="smcPlanPage"
        class="smc-page"
        data-page-name="plan"
      >

        <div class="smc-page-heading">

          <div>
            <h1>My Plan</h1>

            <p>
              Build, optimize and update
              your paycheck plan.
            </p>
          </div>

        </div>

        <div
          id="smcPlanContent"
          class="smc-section-wrap"
        ></div>

      </section>

      <section
        id="smcToolsPage"
        class="smc-page"
        data-page-name="tools"
      >

        <div class="smc-page-heading">

          <div>
            <h1>Money Tools</h1>

            <p>
              Quick answers when your
              money situation changes.
            </p>
          </div>

        </div>

        <div
          id="smcToolsContent"
          class="smc-section-wrap"
        ></div>

      </section>

      <section
        id="smcGoalsPage"
        class="smc-page"
        data-page-name="goals"
      >

        <div class="smc-page-heading">

          <div>
            <h1>Goals</h1>

            <p>
              Build toward the things
              that matter to you.
            </p>
          </div>

        </div>

        <div class="smc-placeholder-card">

          <h2>
            Goals & Sinking Funds
          </h2>

          This page is ready for our
          savings goals, sinking funds
          and debt payoff tools.

        </div>

      </section>

      <section
        id="smcAccountPage"
        class="smc-page"
        data-page-name="account"
      >

        <div class="smc-page-heading">

          <div>
            <h1>Account</h1>

            <p>
              Manage your profile and
              saved money plans.
            </p>
          </div>

        </div>

        <div class="smc-account-grid">

          <article class="smc-account-action">

            <div style="color:var(--smc-teal);">
              ${icon("user",27)}
            </div>

            <h3>
              My Profile
            </h3>

            <p>
              Change the name Stretch
              My Check uses when it
              greets you.
            </p>

            <button
              id="smcOpenProfile"
              type="button"
            >
              Edit Profile
            </button>

          </article>

          <article class="smc-account-action">

            <div style="color:var(--smc-purple);">
              ${icon("plan",27)}
            </div>

            <h3>
              My Saved Plans
            </h3>

            <p>
              Open, switch or manage
              plans saved to your account.
            </p>

            <button
              id="smcOpenPlans"
              type="button"
            >
              View Saved Plans
            </button>

          </article>

        </div>

        <div
          id="smcAccountContent"
          class="smc-section-wrap"
        ></div>

      </section>

    </main>

    <nav class="smc-bottom-nav">

      <button
        class="smc-mobile-nav-button active"
        data-page="home"
        type="button"
      >
        ${icon("home")}
        <span>Home</span>
      </button>

      <button
        class="smc-mobile-nav-button"
        data-page="plan"
        type="button"
      >
        ${icon("plan")}
        <span>Plan</span>
      </button>

      <button
        class="smc-mobile-nav-button"
        data-page="tools"
        type="button"
      >
        ${icon("tools")}
        <span>Tools</span>
      </button>

      <button
        class="smc-mobile-nav-button"
        data-page="goals"
        type="button"
      >
        ${icon("goals")}
        <span>Goals</span>
      </button>

      <button
        class="smc-mobile-nav-button"
        data-page="account"
        type="button"
      >
        ${icon("user")}
        <span>Account</span>
      </button>

    </nav>
  `;

  document.body.appendChild(shell);

  /* =========================================================
     NAVIGATION
  ========================================================= */

  function openPage(pageName) {

    document
      .querySelectorAll(".smc-page")
      .forEach(page => {

        page.classList.toggle(
          "active",
          page.dataset.pageName === pageName
        );

      });

    document
      .querySelectorAll(
        ".smc-nav-button, .smc-mobile-nav-button"
      )
      .forEach(button => {

        button.classList.toggle(
          "active",
          button.dataset.page === pageName
        );

      });

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

    window.location.hash =
      pageName === "home"
        ? ""
        : pageName;
  }

  document
    .querySelectorAll("[data-page]")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {
          openPage(button.dataset.page);
        }
      );

    });

  document
    .querySelectorAll("[data-go-page]")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {
          openPage(
            button.dataset.goPage
          );
        }
      );

    });

  window.StretchMyCheckApp = {
    openPage
  };

  /* =========================================================
     MOVE EXISTING CONTENT
  ========================================================= */

  const legacyApp =
    document.querySelector(
      "body > .app"
    );

  const planContent =
    document.getElementById(
      "smcPlanContent"
    );

  const toolsContent =
    document.getElementById(
      "smcToolsContent"
    );

  const accountContent =
    document.getElementById(
      "smcAccountContent"
    );

  function topLegacyChild(element) {

    if (!element || !legacyApp) {
      return null;
    }

    let node = element;

    while (
      node.parentElement &&
      node.parentElement !== legacyApp
    ) {
      node = node.parentElement;
    }

    return node;
  }

  function moveTopLevelById(
    id,
    destination
  ) {

    const element =
      document.getElementById(id);

    const node =
      topLegacyChild(element);

    if (
      node &&
      destination &&
      node.parentElement !== destination
    ) {
      destination.appendChild(node);
      return node;
    }

    return null;
  }

  function moveClosestUseful(
    id,
    destination
  ) {

    const element =
      document.getElementById(id);

    if (!element || !destination) {
      return null;
    }

    const selectors = [
      ".replan-card",
      ".afford-card",
      ".tool-card",
      ".dashboard-tool",
      ".dashboard-tool-card",
      "section",
      ".card"
    ];

    let node = null;

    for (const selector of selectors) {

      const candidate =
        element.closest(selector);

      if (
        candidate &&
        candidate !== legacyApp
      ) {
        node = candidate;
        break;
      }
    }

    if (
      node &&
      node.parentElement !== destination
    ) {
      destination.appendChild(node);
    }

    return node;
  }

  function moveExistingContent() {

    if (!legacyApp) {
      return;
    }

    const oldHeader =
      legacyApp.querySelector(
        ".topbar"
      );

    const accountArea =
      oldHeader?.querySelector(
        ".account-buttons"
      );

    if (accountArea) {

      document
        .getElementById(
          "smcUserHeader"
        )
        .appendChild(accountArea);

    }

    const intro =
      legacyApp.querySelector(
        ".intro-card"
      );

    if (intro) {
      planContent.appendChild(intro);
    }

    moveTopLevelById(
      "startingBalance",
      planContent
    );

    moveTopLevelById(
      "paychecksContainer",
      planContent
    );

    moveTopLevelById(
      "billsContainer",
      planContent
    );

    moveTopLevelById(
      "groceryAmount",
      planContent
    );

    moveTopLevelById(
      "plannerResults",
      planContent
    );

    const savedCard =
      document.querySelector(
        ".saved-plans-card"
      );

    if (savedCard) {
      accountContent.appendChild(
        savedCard
      );
    }

    moveClosestUseful(
      "affordButton",
      toolsContent
    );

    moveClosestUseful(
      "replanPreviewButton",
      toolsContent
    );

    moveClosestUseful(
      "replanAmount",
      toolsContent
    );

    legacyApp.setAttribute(
      "aria-hidden",
      "true"
    );

    document.body.classList.add(
      "smc-shell-ready"
    );
  }

  /* =========================================================
     PROFILE
  ========================================================= */

  let displayName = "";

  function greetingForTime() {

    const hour =
      new Date().getHours();

    if (hour < 12) {
      return "Good morning";
    }

    if (hour < 17) {
      return "Good afternoon";
    }

    return "Good evening";
  }

  function renderGreeting() {

    const heading =
      document.querySelector(
        "#smcHomePage .smc-page-heading h1"
      );

    if (!heading) {
      return;
    }

    heading.innerHTML = `
      ${greetingForTime()},
      <span id="smcGreetingName">
        ${escapeHTML(displayName || "there")}
      </span>
    `;
  }

  async function loadName() {

    if (
      window.StretchMyCheckAuth &&
      typeof window
        .StretchMyCheckAuth
        .getDisplayName ===
        "function"
    ) {

      try {

        displayName =
          await window
            .StretchMyCheckAuth
            .getDisplayName() || "";

      } catch (error) {
        console.error(error);
      }
    }

    renderGreeting();
  }

  window.addEventListener(
    "stretchmycheck:profile-updated",
    event => {

      displayName =
        event.detail?.firstName || "";

      renderGreeting();

    }
  );

  /* =========================================================
     DATE
  ========================================================= */

  function updateDate() {

    const element =
      document.getElementById(
        "smcCurrentDate"
      );

    if (!element) {
      return;
    }

    element.textContent =
      new Date().toLocaleDateString(
        "en-US",
        {
          weekday: "long",
          month: "short",
          day: "numeric",
          year: "numeric"
        }
      );
  }

  /* =========================================================
     PLANNER DATA
  ========================================================= */

  function readPaychecks() {

    return [
      ...document.querySelectorAll(
        ".paycheck-entry"
      )
    ]
      .map(entry => ({
        name:
          entry.querySelector(
            ".paycheck-name"
          )?.value?.trim() ||
          "Paycheck",

        date:
          entry.querySelector(
            ".paycheck-date"
          )?.value || "",

        amount:
          money(
            entry.querySelector(
              ".paycheck-amount"
            )?.value
          )
      }))
      .filter(
        paycheck =>
          paycheck.date ||
          paycheck.amount
      )
      .sort(
        (a,b) =>
          String(a.date)
            .localeCompare(
              String(b.date)
            )
      );
  }

  function readBills() {

    return [
      ...document.querySelectorAll(
        ".bill-entry"
      )
    ].map(entry => ({
      name:
        entry.querySelector(
          ".bill-name"
        )?.value?.trim() ||
        "Bill",

      amount:
        money(
          entry.querySelector(
            ".bill-amount"
          )?.value
        ),

      date:
        entry.querySelector(
          ".bill-due-date"
        )?.value || ""
    }));
  }

  function readLivingTotal() {

    const fields = [
      {
        amount: "groceryAmount",
        mode: "groceryMode"
      },
      {
        amount: "gasAmount",
        mode: "gasMode"
      },
      {
        amount: "otherAmount",
        mode: "otherMode"
      }
    ];

    const paycheckCount =
      Math.max(
        readPaychecks().length,
        1
      );

    return fields.reduce(
      (total,field) => {

        const value =
          money(
            document.getElementById(
              field.amount
            )?.value
          );

        const mode =
          document.getElementById(
            field.mode
          )?.value || "total";

        return total +
          (
            mode === "percheck"
              ? value * paycheckCount
              : value
          );
      },
      0
    );
  }

  function getSnapshot() {

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

    let dashboard = null;

    try {

      dashboard =
        window
          .StretchMyCheckDashboard
          ?.getSnapshot?.() ||
        null;

    } catch (error) {
      dashboard = null;
    }

    const paychecks =
      readPaychecks();

    const bills =
      readBills();

    const livingTotal =
      readLivingTotal();

    const billTotal =
      bills.reduce(
        (total,bill) =>
          total + bill.amount,
        0
      );

    const incomeTotal =
      paychecks.reduce(
        (total,paycheck) =>
          total + paycheck.amount,
        0
      );

    const safe =
      Number.isFinite(
        dashboard?.displayedSafe
      )
        ? dashboard.displayedSafe
        : Math.max(
            startingBalance -
            cushion,
            0
          );

    const dailySafe =
      Number.isFinite(
        dashboard?.dailySafe
      )
        ? dashboard.dailySafe
        : 0;

    const billsBefore =
      Number.isFinite(
        dashboard?.billsBeforePayday
      )
        ? dashboard.billsBeforePayday
        : 0;

    let nextPaycheck =
      dashboard?.nextPaycheck ||
      null;

    if (
      !nextPaycheck &&
      paychecks.length
    ) {

      const today =
        new Date();

      today.setHours(
        0,0,0,0
      );

      nextPaycheck =
        paychecks.find(
          paycheck => {

            if (!paycheck.date) {
              return false;
            }

            const date =
              new Date(
                `${paycheck.date}T00:00:00`
              );

            return date >= today;
          }
        ) ||
        paychecks[0];
    }

    const optimized =
      window.latestPlannerData ||
      null;

    const endingBalance =
      Number.isFinite(
        optimized
          ?.balanceResult
          ?.finalBalance
      )
        ? optimized
            .balanceResult
            .finalBalance
        : (
            startingBalance +
            incomeTotal -
            billTotal -
            livingTotal
          );

    return {
      startingBalance,
      cushion,
      safe,
      dailySafe,
      billsBefore,
      nextPaycheck,
      paychecks,
      bills,
      livingTotal,
      billTotal,
      incomeTotal,
      endingBalance,
      optimized
    };
  }

  /* =========================================================
     CHART
  ========================================================= */

  function drawChart(snapshot) {

    const svg =
      document.getElementById(
        "smcForecastSvg"
      );

    if (!svg) {
      return;
    }

    const values = [
      snapshot.startingBalance
    ];

    if (
      snapshot.optimized
        ?.paychecks
        ?.length
    ) {

      snapshot.optimized.paychecks
        .forEach(paycheck => {

          if (
            Number.isFinite(
              paycheck.runningBalance
            )
          ) {
            values.push(
              paycheck.runningBalance
            );
          }
        });

    } else {

      let running =
        snapshot.startingBalance;

      snapshot.paychecks
        .forEach(paycheck => {

          running +=
            paycheck.amount;

          values.push(running);
        });

      values[
        values.length - 1
      ] =
        snapshot.endingBalance;
    }

    if (values.length === 1) {
      values.push(values[0]);
    }

    const width = 500;
    const height = 190;
    const padding = 18;

    const max =
      Math.max(
        ...values,
        100
      );

    const min =
      Math.min(
        ...values,
        0
      );

    const range =
      Math.max(
        max - min,
        1
      );

    const points =
      values.map(
        (value,index) => {

          const x =
            padding +
            (
              index /
              Math.max(
                values.length - 1,
                1
              )
            ) *
            (
              width -
              padding * 2
            );

          const y =
            height -
            padding -
            (
              (
                value - min
              ) /
              range
            ) *
            (
              height -
              padding * 2
            );

          return {
            x,
            y,
            value
          };
        }
      );

    const line =
      points
        .map(
          (point,index) =>
            `${
              index === 0
                ? "M"
                : "L"
            } ${point.x} ${point.y}`
        )
        .join(" ");

    const fill = `
      ${line}
      L ${
        points[
          points.length - 1
        ].x
      } ${
        height - padding
      }
      L ${
        points[0].x
      } ${
        height - padding
      }
      Z
    `;

    const gridLines =
      [0,1,2,3]
        .map(index => {

          const y =
            padding +
            index *
            (
              (
                height -
                padding * 2
              ) /
              3
            );

          return `
            <line
              class="smc-chart-grid"
              x1="${padding}"
              y1="${y}"
              x2="${width-padding}"
              y2="${y}"
            />
          `;
        })
        .join("");

    const dots =
      points
        .map(point => `
          <circle
            class="smc-chart-dot"
            cx="${point.x}"
            cy="${point.y}"
            r="4.5"
          />
        `)
        .join("");

    svg.innerHTML = `

      <defs>

        <linearGradient
          id="smcAreaGradient"
          x1="0"
          x2="0"
          y1="0"
          y2="1"
        >

          <stop
            offset="0%"
            stop-color="#45e1c0"
            stop-opacity=".25"
          />

          <stop
            offset="100%"
            stop-color="#45e1c0"
            stop-opacity="0"
          />

        </linearGradient>

      </defs>

      ${gridLines}

      <path
        class="smc-chart-fill"
        d="${fill}"
      />

      <path
        class="smc-chart-line"
        d="${line}"
      />

      ${dots}
    `;
  }

  /* =========================================================
     UPCOMING
  ========================================================= */

  function formatShortDate(dateValue) {

    if (!dateValue) {
      return {
        month: "--",
        day: "--"
      };
    }

    const date =
      dateValue instanceof Date
        ? dateValue
        : new Date(
            `${
              String(dateValue)
                .slice(0,10)
            }T00:00:00`
          );

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return {
        month: "--",
        day: "--"
      };
    }

    return {
      month:
        date.toLocaleDateString(
          "en-US",
          {
            month: "short"
          }
        ),

      day:
        date.getDate()
    };
  }

  function renderUpcoming(snapshot) {

    const container =
      document.getElementById(
        "smcUpcomingList"
      );

    if (!container) {
      return;
    }

    const items = [];

    if (
      snapshot.optimized
        ?.paychecks
        ?.length
    ) {

      snapshot.optimized.paychecks
        .forEach(paycheck => {

          items.push({
            type: "income",
            date: paycheck.date,
            name:
              paycheck.name ||
              "Paycheck",
            amount:
              paycheck.amount
          });

          paycheck.bills
            ?.forEach(bill => {

              items.push({
                type: "expense",
                date: paycheck.date,
                name: bill.name,
                amount: bill.amount
              });

            });

          if (
            paycheck.necessities > 0
          ) {

            items.push({
              type: "expense",
              date: paycheck.date,
              name:
                "Living Expenses",
              amount:
                paycheck.necessities
            });

          }
        });

    } else {

      snapshot.paychecks
        .forEach(paycheck => {

          items.push({
            type: "income",
            date: paycheck.date,
            name: paycheck.name,
            amount: paycheck.amount
          });

        });
    }

    if (!items.length) {

      container.innerHTML = `
        <div
          style="
            color:#81949f;
            font-size:12px;
            padding:18px 0;
          "
        >
          Add paychecks and bills
          to see what's coming up.
        </div>
      `;

      return;
    }

    container.innerHTML =
      items
        .slice(0,6)
        .map(item => {

          const date =
            formatShortDate(
              item.date
            );

          const sign =
            item.type === "income"
              ? "+"
              : "-";

          return `
            <div
              class="smc-upcoming-item"
            >

              <div
                class="smc-upcoming-date"
              >
                ${escapeHTML(date.month)}

                <strong>
                  ${escapeHTML(date.day)}
                </strong>
              </div>

              <div
                class="smc-upcoming-name"
              >
                ${escapeHTML(item.name)}
              </div>

              <div
                class="${
                  item.type === "income"
                    ? "smc-income"
                    : "smc-expense"
                }"
                style="font-size:11px;"
              >
                ${sign}${currency(item.amount)}
              </div>

            </div>
          `;
        })
        .join("");
  }

  /* =========================================================
     HOME
  ========================================================= */

  function renderHome() {

    const snapshot =
      getSnapshot();

    const set =
      (id,value) => {

        const element =
          document.getElementById(id);

        if (element) {
          element.textContent =
            value;
        }
      };

    set(
      "smcAvailableNow",
      currency(
        snapshot.startingBalance
      )
    );

    set(
      "smcCushion",
      currency(
        snapshot.cushion
      )
    );

    set(
      "smcBillsBeforePayday",
      currency(
        snapshot.billsBefore
      )
    );

    set(
      "smcSafeAmount",
      currency(
        snapshot.safe
      )
    );

    set(
      "smcDailySafe",
      `${currency(
        snapshot.dailySafe
      )} per day`
    );

    set(
      "smcForecastEnding",
      currency(
        snapshot.endingBalance
      )
    );

    set(
      "smcIncomeTotal",
      currency(
        snapshot.incomeTotal
      )
    );

    set(
      "smcBillTotal",
      currency(
        snapshot.billTotal
      )
    );

    set(
      "smcLivingTotal",
      currency(
        snapshot.livingTotal
      )
    );

    const ring =
      document.getElementById(
        "smcSafeRing"
      );

    const usable =
      Math.max(
        snapshot.startingBalance -
        snapshot.cushion,
        1
      );

    const percent =
      Math.max(
        0,
        Math.min(
          100,
          (
            snapshot.safe /
            usable
          ) *
          100
        )
      );

    if (ring) {
      ring.style.setProperty(
        "--progress",
        `${
          Number.isFinite(percent)
            ? percent
            : 0
        }%`
      );
    }

    const safeNote =
      document.getElementById(
        "smcSafeNote"
      );

    const title =
      document.getElementById(
        "smcStatusTitle"
      );

    const statusText =
      document.getElementById(
        "smcStatusText"
      );

    if (snapshot.safe <= 0) {

      if (safeNote) {
        safeNote.textContent =
          "There isn't extra spending room before payday right now.";
      }

      if (title) {
        title.textContent =
          "No Extra Room";
      }

      if (statusText) {
        statusText.textContent =
          "Your available money is currently being used to protect bills, necessities or your cushion.";
      }

    } else if (
      snapshot.dailySafe < 10
    ) {

      if (safeNote) {
        safeNote.textContent =
          "You're covered, but spending room is very limited.";
      }

      if (title) {
        title.textContent =
          "At Risk";
      }

      if (statusText) {
        statusText.textContent =
          "Your plan can work, but keep a close eye on spending until your next payday.";
      }

    } else if (
      snapshot.dailySafe < 25
    ) {

      if (safeNote) {
        safeNote.textContent =
          "You're covered, but spending room is limited.";
      }

      if (title) {
        title.textContent =
          "Getting Tight";
      }

      if (statusText) {
        statusText.textContent =
          "You're on track, but your safe spending room is limited until payday.";
      }

    } else {

      if (safeNote) {
        safeNote.textContent =
          "Your current plan leaves you some breathing room.";
      }

      if (title) {
        title.textContent =
          "Comfortable";
      }

      if (statusText) {
        statusText.textContent =
          "Your current plan leaves room above your protected money.";
      }
    }

    const paycheck =
      snapshot.nextPaycheck;

    if (paycheck) {

      const dateValue =
        paycheck.date ||
        paycheck.dateValue;

      let date = null;

      if (
        dateValue instanceof Date
      ) {
        date = dateValue;

      } else if (dateValue) {

        date =
          new Date(
            `${
              String(dateValue)
                .slice(0,10)
            }T00:00:00`
          );
      }

      if (
        date &&
        !Number.isNaN(
          date.getTime()
        )
      ) {

        set(
          "smcPaydayDate",
          date.toLocaleDateString(
            "en-US",
            {
              weekday: "short",
              month: "short",
              day: "numeric"
            }
          )
        );

        const today =
          new Date();

        today.setHours(
          0,0,0,0
        );

        const payday =
          new Date(date);

        payday.setHours(
          0,0,0,0
        );

        const days =
          Math.max(
            0,
            Math.ceil(
              (
                payday -
                today
              ) /
              86400000
            )
          );

        set(
          "smcPaydayDays",
          days === 0
            ? "Payday is today"
            : `${
                days
              } day${
                days === 1
                  ? ""
                  : "s"
              } away`
        );
      }

      set(
        "smcPaydayAmount",
        currency(
          money(
            paycheck.amount
          )
        )
      );

    } else {

      set(
        "smcPaydayDate",
        "Add a payday"
      );

      set(
        "smcPaydayAmount",
        "$0.00"
      );

      set(
        "smcPaydayDays",
        "—"
      );
    }

    drawChart(snapshot);

    renderUpcoming(snapshot);
  }

  /* =========================================================
     ACCOUNT BUTTONS
  ========================================================= */

  document
    .getElementById(
      "smcOpenProfile"
    )
    ?.addEventListener(
      "click",
      () => {

        window
          .StretchMyCheckAuth
          ?.showProfile?.();

      }
    );

  document
    .getElementById(
      "smcOpenPlans"
    )
    ?.addEventListener(
      "click",
      () => {

        window
          .StretchMyCheckPlans
          ?.openSavedPlans?.();

      }
    );

  /* =========================================================
     SEARCH
  ========================================================= */

  const search =
    document.getElementById(
      "smcPlanSearch"
    );

  search?.addEventListener(
    "keydown",
    event => {

      if (event.key !== "Enter") {
        return;
      }

      const query =
        search.value
          .trim()
          .toLowerCase();

      if (!query) {
        return;
      }

      if (
        query.includes("bill") ||
        query.includes("pay") ||
        query.includes("plan")
      ) {
        openPage("plan");
      }

      else if (
        query.includes("afford") ||
        query.includes("replan") ||
        query.includes("tool")
      ) {
        openPage("tools");
      }

      else if (
        query.includes("goal") ||
        query.includes("save") ||
        query.includes("debt")
      ) {
        openPage("goals");
      }

      else if (
        query.includes("account") ||
        query.includes("profile")
      ) {
        openPage("account");
      }

      else {
        openPage("home");
      }
    }
  );

  /* =========================================================
     LIVE REFRESH
  ========================================================= */

  function scheduleRefresh() {

    window.setTimeout(
      renderHome,
      60
    );
  }

  document.addEventListener(
    "input",
    event => {

      if (
        event.target.matches(
          "input, select"
        )
      ) {
        scheduleRefresh();
      }
    }
  );

  document.addEventListener(
    "change",
    scheduleRefresh
  );

  window.addEventListener(
    "stretchmycheck:plan-loaded",
    () => {

      window.setTimeout(
        renderHome,
        250
      );
    }
  );

  window.addEventListener(
    "stretchmycheck:profile-updated",
    scheduleRefresh
  );

  /* =========================================================
     START
  ========================================================= */

  function start() {

    moveExistingContent();

    updateDate();

    loadName();

    renderHome();

    window.setTimeout(
      renderHome,
      500
    );

    window.setTimeout(
      renderHome,
      1200
    );

    const requested =
      window.location.hash
        .replace("#","");

    if (
      [
        "home",
        "plan",
        "tools",
        "goals",
        "account"
      ].includes(requested)
    ) {
      openPage(requested);
    }
  }

  window.setTimeout(
    start,
    180
  );

})();