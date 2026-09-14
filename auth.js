const authRedirectUrl =
  "https://stretchmycheck.github.io/stretch-my-check/";

let currentUser = null;

/* =========================
   ADD AUTH STYLES
========================= */

const authStyle = document.createElement("style");

authStyle.textContent = `
  .auth-overlay {
    position: fixed;
    inset: 0;
    background: rgba(10, 24, 32, 0.72);
    display: none;
    align-items: center;
    justify-content: center;
    padding: 20px;
    z-index: 9999;
  }

  .auth-overlay.show {
    display: flex;
  }

  .auth-modal {
    width: 100%;
    max-width: 430px;
    background: white;
    border-radius: 18px;
    padding: 24px;
    color: #17242c;
    box-shadow: 0 18px 50px rgba(0,0,0,.25);
  }

  .auth-modal-header {
    display: flex;
    justify-content: space-between;
    gap: 15px;
    align-items: center;
    margin-bottom: 18px;
  }

  .auth-modal-header h2 {
    margin: 0;
    font-size: 24px;
  }

  .auth-close {
    background: #edf2f4;
    border: 0;
    border-radius: 9px;
    width: 42px;
    height: 42px;
    cursor: pointer;
    font-size: 20px;
  }

  .auth-field {
    display: flex;
    flex-direction: column;
    gap: 7px;
    margin-bottom: 14px;
  }

  .auth-field label {
    font-weight: 700;
    font-size: 14px;
  }

  .auth-field input {
    width: 100%;
    border: 1px solid #d6e0e5;
    border-radius: 10px;
    padding: 12px 13px;
    min-height: 46px;
    font-size: 16px;
  }

  .auth-submit {
    width: 100%;
    border: 0;
    border-radius: 10px;
    padding: 14px;
    background: #247c8b;
    color: white;
    font-weight: 800;
    cursor: pointer;
    font-size: 16px;
  }

  .auth-switch {
    width: 100%;
    margin-top: 10px;
    border: 0;
    background: transparent;
    color: #247c8b;
    cursor: pointer;
    font-weight: 700;
  }

  .auth-message {
    display: none;
    margin-bottom: 14px;
    padding: 11px;
    border-radius: 9px;
    line-height: 1.4;
    font-size: 14px;
  }

  .auth-message.show {
    display: block;
  }

  .auth-message.good {
    background: #e9f8ef;
    border: 1px solid #a9ddbc;
    color: #17663b;
  }

  .auth-message.bad {
    background: #fff0f0;
    border: 1px solid #efb4b4;
    color: #9b2828;
  }

  .auth-user-email {
    color: white;
    font-size: 13px;
    opacity: .9;
    align-self: center;
  }

  .auth-active-button {
    background: rgba(255,255,255,.13);
    color: white;
    border: 1px solid rgba(255,255,255,.28);
    border-radius: 10px;
    padding: 11px 14px;
    font-weight: 700;
    cursor: pointer;
  }
`;

document.head.appendChild(authStyle);


/* =========================
   CREATE AUTH MODAL
========================= */

const authOverlay =
  document.createElement("div");

authOverlay.className =
  "auth-overlay";

authOverlay.innerHTML = `
  <div class="auth-modal">

    <div class="auth-modal-header">
      <h2 id="authTitle">
        Create Account
      </h2>

      <button
        id="authClose"
        class="auth-close"
        type="button"
        aria-label="Close"
      >
        ×
      </button>
    </div>

    <div
      id="authMessage"
      class="auth-message"
    ></div>

    <form id="authForm">

      <div class="auth-field">
        <label for="authEmail">
          Email
        </label>

        <input
          id="authEmail"
          type="email"
          autocomplete="email"
          required
        >
      </div>

      <div class="auth-field">
        <label for="authPassword">
          Password
        </label>

        <input
          id="authPassword"
          type="password"
          minlength="8"
          autocomplete="current-password"
          required
        >
      </div>

      <button
        id="authSubmit"
        class="auth-submit"
        type="submit"
      >
        Create Account
      </button>

    </form>

    <button
      id="authSwitch"
      class="auth-switch"
      type="button"
    >
      Already have an account? Sign in
    </button>

  </div>
`;

document.body.appendChild(
  authOverlay
);


/* =========================
   AUTH STATE
========================= */

let authMode =
  "signup";


const authTitle =
  document.getElementById(
    "authTitle"
  );

const authMessage =
  document.getElementById(
    "authMessage"
  );

const authEmail =
  document.getElementById(
    "authEmail"
  );

const authPassword =
  document.getElementById(
    "authPassword"
  );

const authSubmit =
  document.getElementById(
    "authSubmit"
  );

const authSwitch =
  document.getElementById(
    "authSwitch"
  );

const authForm =
  document.getElementById(
    "authForm"
  );


function showAuthMessage(
  message,
  type
) {

  authMessage.textContent =
    message;

  authMessage.className =
    `auth-message show ${type}`;

}


function clearAuthMessage() {

  authMessage.textContent =
    "";

  authMessage.className =
    "auth-message";

}


function updateAuthMode() {

  clearAuthMessage();

  authPassword.value =
    "";


  if (
    authMode ===
    "signup"
  ) {

    authTitle.textContent =
      "Create Account";

    authSubmit.textContent =
      "Create Account";

    authSwitch.textContent =
      "Already have an account? Sign in";

    authPassword.autocomplete =
      "new-password";

  }

  else {

    authTitle.textContent =
      "Sign In";

    authSubmit.textContent =
      "Sign In";

    authSwitch.textContent =
      "Need an account? Create one";

    authPassword.autocomplete =
      "current-password";

  }

}


function openAuth(
  mode
) {

  authMode =
    mode;

  updateAuthMode();

  authOverlay.classList.add(
    "show"
  );

  setTimeout(
    () => {
      authEmail.focus();
    },
    50
  );

}


function closeAuth() {

  authOverlay.classList.remove(
    "show"
  );

  clearAuthMessage();

  authPassword.value =
    "";

}


/* =========================
   FIND EXISTING HEADER BUTTONS
========================= */

function getHeaderButtons() {

  return [
    ...document.querySelectorAll(
      ".account-button"
    )
  ];

}


function configureHeaderButtons() {

  const buttons =
    getHeaderButtons();


  if (
    buttons.length < 2
  ) {

    console.warn(
      "Stretch My Check auth buttons were not found."
    );

    return;

  }


  const createButton =
    buttons[0];

  const signInButton =
    buttons[1];


  createButton.disabled =
    false;

  signInButton.disabled =
    false;


  createButton.textContent =
    "Create Account";

  signInButton.textContent =
    "Sign In";


  createButton.addEventListener(
    "click",
    () => {

      openAuth(
        "signup"
      );

    }
  );


  signInButton.addEventListener(
    "click",
    () => {

      openAuth(
        "signin"
      );

    }
  );

}


/* =========================
   LOGGED-IN HEADER
========================= */

function showLoggedInHeader(
  user
) {

  const container =
    document.querySelector(
      ".account-buttons"
    );


  if (!container) {
    return;
  }


  container.innerHTML =
    "";


  const email =
    document.createElement(
      "span"
    );

  email.className =
    "auth-user-email";

  email.textContent =
    user.email;


  const signOut =
    document.createElement(
      "button"
    );

  signOut.className =
    "auth-active-button";

  signOut.type =
    "button";

  signOut.textContent =
    "Sign Out";


  signOut.addEventListener(
    "click",
    async () => {

      const {
        error
      } =
        await window
          .supabaseClient
          .auth
          .signOut();


      if (error) {

        alert(
          error.message
        );

        return;

      }


      window.location.reload();

    }
  );


  container.appendChild(
    email
  );

  container.appendChild(
    signOut
  );

}


/* =========================
   SIGNED-OUT HEADER
========================= */

function showSignedOutHeader() {

  const container =
    document.querySelector(
      ".account-buttons"
    );


  if (!container) {
    return;
  }


  container.innerHTML = `

    <button
      id="liveCreateAccount"
      class="auth-active-button"
      type="button"
    >
      Create Account
    </button>

    <button
      id="liveSignIn"
      class="auth-active-button"
      type="button"
    >
      Sign In
    </button>

  `;


  document
    .getElementById(
      "liveCreateAccount"
    )
    .addEventListener(
      "click",
      () => {

        openAuth(
          "signup"
        );

      }
    );


  document
    .getElementById(
      "liveSignIn"
    )
    .addEventListener(
      "click",
      () => {

        openAuth(
          "signin"
        );

      }
    );

}


/* =========================
   CREATE ACCOUNT / SIGN IN
========================= */

authForm.addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    clearAuthMessage();


    const email =
      authEmail
        .value
        .trim();


    const password =
      authPassword
        .value;


    if (
      !email
      ||
      !password
    ) {

      showAuthMessage(
        "Enter your email and password.",
        "bad"
      );

      return;

    }


    if (
      password.length < 8
    ) {

      showAuthMessage(
        "Your password must be at least 8 characters.",
        "bad"
      );

      return;

    }


    authSubmit.disabled =
      true;


    authSubmit.textContent =
      authMode === "signup"
        ? "Creating Account..."
        : "Signing In...";


    try {

      if (
        authMode ===
        "signup"
      ) {

        const {
          data,
          error
        } =
          await window
            .supabaseClient
            .auth
            .signUp(
              {
                email,
                password,

                options: {
                  emailRedirectTo:
                    authRedirectUrl
                }
              }
            );


        if (error) {

          showAuthMessage(
            error.message,
            "bad"
          );

          return;

        }


        if (
          data.session
        ) {

          showAuthMessage(
            "Your account was created and you are signed in.",
            "good"
          );

        }

        else {

          showAuthMessage(
            "Account created! Check your email and click the confirmation link before signing in.",
            "good"
          );

        }

      }

      else {

        const {
          data,
          error
        } =
          await window
            .supabaseClient
            .auth
            .signInWithPassword(
              {
                email,
                password
              }
            );


        if (error) {

          showAuthMessage(
            error.message,
            "bad"
          );

          return;

        }


        if (
          data.user
        ) {

          currentUser =
            data.user;

          closeAuth();

          showLoggedInHeader(
            data.user
          );

        }

      }

    }

    catch (error) {

      showAuthMessage(
        error.message ||
        "Something went wrong. Please try again.",
        "bad"
      );

    }

    finally {

      authSubmit.disabled =
        false;

      authSubmit.textContent =
        authMode === "signup"
          ? "Create Account"
          : "Sign In";

    }

  }
);


/* =========================
   MODAL CONTROLS
========================= */

document
  .getElementById(
    "authClose"
  )
  .addEventListener(
    "click",
    closeAuth
  );


authSwitch.addEventListener(
  "click",
  () => {

    authMode =
      authMode === "signup"
        ? "signin"
        : "signup";

    updateAuthMode();

  }
);


authOverlay.addEventListener(
  "click",
  event => {

    if (
      event.target ===
      authOverlay
    ) {

      closeAuth();

    }

  }
);


/* =========================
   LOAD CURRENT SESSION
========================= */

async function initializeAuth() {

  if (
    !window.supabaseClient
  ) {

    console.error(
      "Supabase client was not loaded."
    );

    return;

  }


  const {
    data,
    error
  } =
    await window
      .supabaseClient
      .auth
      .getSession();


  if (error) {

    console.error(
      error
    );

  }


  currentUser =
    data?.session?.user ||
    null;


  if (
    currentUser
  ) {

    showLoggedInHeader(
      currentUser
    );

  }

  else {

    showSignedOutHeader();

  }


  window
    .supabaseClient
    .auth
    .onAuthStateChange(
      (
        event,
        session
      ) => {

        currentUser =
          session?.user ||
          null;


        if (
          currentUser
        ) {

          showLoggedInHeader(
            currentUser
          );

        }

        else {

          showSignedOutHeader();

        }

      }
    );

}


configureHeaderButtons();

initializeAuth();