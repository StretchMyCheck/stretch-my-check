# Stretch My Check

Stretch My Check is a browser-based personal finance application focused on paycheck planning and practical day-to-day money decisions.

## Features

- Paycheck-based planning
- Safe-to-spend calculations
- Protected cushion planning
- Bills and recurring expenses
- Forecasting across pay periods
- Debt payoff tools
- Savings goals
- Plan history and rollover support
- Account/authentication support through Supabase

## Technology

The application uses HTML, CSS, and vanilla JavaScript. It is a static web application and does not require a compilation step.

Supabase is used for account/authentication functionality. The repository includes the client configuration used by the browser application. A buyer who deploys their own version should configure and manage their own Supabase project as appropriate.

## Run locally

1. Install Node.js and npm.
2. Run `npm install`.
3. Run `npm start`.
4. Open the local URL printed by the development server.

The application can also be served by any ordinary static web server.

## Build

There is no compilation or production build step. The source files are the deployable web application.

## Project structure

- `index.html` — main application page and styles
- `app-shell.js` — application shell/navigation
- `auth.js` — authentication/account behavior
- `dashboard.js` — dashboard functionality
- `plans.js` and `plan-persistence.js` — planning and persistence
- `forecast.js` — forecasting
- `debt.js` and `debt-enhancements.js` — debt tools
- `goals.js` — savings goals
- `recurring.js` and `recurring-planner.js` — recurring finances
- `rollover*.js` — rollover/carry-forward behavior
- `history.js` — plan history
- `supabase-config.js` — Supabase browser client configuration

## Marketplace note

This repository is offered through marketplace licensing. Purchasing a marketplace license does not transfer ownership of the original Stretch My Check project unless a separate written agreement explicitly says otherwise.
