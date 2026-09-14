(() => {
  const supabaseClient = window.supabaseClient;

  if (!supabaseClient) {
    console.error(
      "Supabase client is not available. Load supabase-config.js before auth.js."
    );
    return;
  }

  const SITE_URL =
    "https://stretchmycheck.github.io/stretch-my-check/";

  const accountArea =
    document.querySelector(".account-buttons");

  if (!accountArea) {
    console.error("Could not find .account-buttons in index.html.");
    return;
  }

  /* =========================================================
     STYLES
  ========================================================= */

  const style = document.createElement("style");

  style.textContent = `
    .auth-header-wrap {
      position: relative;
      display: flex;
      align-items: center;
      gap: 9px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    .auth-email-small {
      font-size: 12px;
      opacity: .9;
      max-width: 220px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .auth-menu {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      width: 250px;
      background: white;
      color: #17242c;
      border-radius: 12px;
      padding: 10px;
      box-shadow: 0 14px 38px rgba(0,0,0,.22);
      z-index: 10020;
      display: none;
      border: 1px solid #d6e0e5;
    }

    .auth-menu.show {
      display: block;
    }

    .auth-menu-email {
      font-size: 12px;
      color: #667681;
      padding: 8px 9px 10px;
      border-bottom: 1px solid #edf1f3;
      margin-bottom: 6px;
      word-break: break-word;
    }

    .auth-menu button {
      width: 100%;
      border: 0;
      background: transparent;
      color: #17242c;
      text-align: left;
      border-radius: 8px;
      padding: 10px;
      cursor: pointer;
      font-weight: 700;
    }

    .auth-menu button:hover {
      background: #f2f6f8;
    }

    .auth-menu button.auth-danger {
      color: #a12424;
    }

    .auth-modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(10,24,32,.72);
      display: none;
      align-items: center;
      justify-content: center;
      padding: 18px;
      z-index: 10050;
    }

    .auth-modal-overlay.show {
      display: flex;
    }

    .auth-modal {
      width: 100%;
      max-width: 460px;
      background: #fff;
      color: #17242c;
      border-radius: 18px;
      padding: 22px;
      box-shadow: 0 20px 60px rgba(0,0,0,.28);
    }

    .auth-modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 16px;
    }

    .auth-modal-header h2 {
      margin: 0;
      font-size: 23px;
    }

    .auth-close {
      width: 40px;
      height: 40px;
      border: 0;
      border-radius: 9px;
      background: #edf2f4;
      cursor: pointer;
      font-size: 20px;
      color: #17242c;
    }

    .auth-field {
      display: flex;
      flex-direction: column;
      gap: 7px;
      margin-bottom: 13px;
    }

    .auth-field label {
      font-size: 14px;
      font-weight: 750;
    }

    .auth-field input {
      width: 100%;
      border: 1px solid #d6e0e5;
      border-radius: 10px;
      padding: 12px 13px;
      min-height: 45px;
      color: #17242c;
      background: #fff;
    }

    .auth-main-button {
      width: 100%;
      border: 0;
      border-radius: 10px;
      padding: 13px 15px;
      min-height: 46px;
      cursor: pointer;
      background: #247c8b;
      color: white;
      font-weight: 800;
      margin-top: 4px;
    }

    .auth-main-button:disabled {
      opacity: .65;
      cursor: not-allowed;
    }

    .auth-link-button {
      border: 0;
      background: transparent;
      color: #247c8b;
      font-weight: 750;
      cursor: pointer;
      padding: 8px 0 0;
    }

    .auth-secondary-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      margin-top: 10px;
    }

    .auth-message {
      display: none;
      margin-top: 14px;
      padding: 11px 12px;
      border-radius: 10px;
      line-height: 1.45;
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

    .auth-message.info {
      background: #eef6f8;
      border: 1px solid #bdd8df;
      color: #294d5f;
    }

    .auth-helper {
      color: #667681;
      font-size: 12px;
      line-height: 1.45;
      margin-top: -4px;
      margin-bottom: 10px;
    }

    @media (max-width: 700px) {
      .auth-header-wrap {
        width: 100%;
        justify-content: flex-start;
      }

      .auth-menu {
        left: 0;
        right: auto;
      }

      .auth-email-small {
        max-width: 180px;
      }
    }

    @media print {
      .auth-modal-overlay,
      .auth-menu {
        display: none !important;
      }
    }
  `;

  document.head.appendChild(style);

  /* =========================================================
     MODAL
  ========================================================= */

  const overlay = document.createElement("div");
  overlay.className = "auth-modal-overlay";

  overlay.innerHTML = `
    <div class="auth-modal">
      <div class="auth-modal-header">
        <h2 id="authModalTitle">Account</h2>

        <button
          id="authCloseButton"
          class="auth-close"
          type="button"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <div id="authModalBody"></div>

      <div
        id="authMessage"
        class="auth-message"
      ></div>
    </div>
  `;

  document.body.appendChild(overlay);

  const modalTitle =
    document.getElementById("authModalTitle");

  const modalBody =
    document.getElementById("authModalBody");

  const authMessage =
    document.getElementById("authMessage");

  const authCloseButton =
    document.getElementById("authCloseButton");

  function openModal(title, html) {
    modalTitle.textContent = title;
    modalBody.innerHTML = html;
    clearAuthMessage();
    overlay.classList.add("show");
  }

  function closeModal() {
    overlay.classList.remove("show");
    clearAuthMessage();
  }

  function showAuthMessage(message, type = "info") {
    authMessage.textContent = message;
    authMessage.className =
      `auth-message show ${type}`;
  }

  function clearAuthMessage() {
    authMessage.textContent = "";
    authMessage.className = "auth-message";
  }

  authCloseButton.addEventListener(
    "click",
    closeModal
  );

  overlay.addEventListener(
    "click",
    event => {
      if (event.target === overlay) {
        closeModal();
      }
    }
  );

  document.addEventListener(
    "keydown",
    event => {
      if (
        event.key === "Escape" &&
        overlay.classList.contains("show")
      ) {
        closeModal();
      }
    }
  );

  /* =========================================================
     SIGN-UP MODAL
  ========================================================= */

  function showSignUpModal() {
    openModal(
      "Create Account",
      `
        <div class="auth-field">
          <label for="authSignupEmail">Email</label>
          <input
            id="authSignupEmail"
            type="email"
            autocomplete="email"
            placeholder="you@example.com"
          >
        </div>

        <div class="auth-field">
          <label for="authSignupPassword">Password</label>
          <input
            id="authSignupPassword"
            type="password"
            autocomplete="new-password"
            placeholder="At least 6 characters"
          >
        </div>

        <div class="auth-field">
          <label for="authSignupConfirmPassword">
            Confirm password
          </label>
          <input
            id="authSignupConfirmPassword"
            type="password"
            autocomplete="new-password"
            placeholder="Enter it again"
          >
        </div>

        <button
          id="authSignupSubmit"
          class="auth-main-button"
          type="button"
        >
          Create Account
        </button>

        <div class="auth-secondary-row">
          <span class="auth-helper">
            Already have an account?
          </span>

          <button
            id="authSwitchToSignin"
            class="auth-link-button"
            type="button"
          >
            Sign In
          </button>
        </div>
      `
    );

    document
      .getElementById("authSwitchToSignin")
      .addEventListener("click", showSignInModal);

    document
      .getElementById("authSignupSubmit")
      .addEventListener("click", createAccount);
  }

  async function createAccount() {
    clearAuthMessage();

    const email =
      document
        .getElementById("authSignupEmail")
        .value
        .trim();

    const password =
      document
        .getElementById("authSignupPassword")
        .value;

    const confirmPassword =
      document
        .getElementById("authSignupConfirmPassword")
        .value;

    if (!email) {
      showAuthMessage(
        "Enter your email address.",
        "bad"
      );
      return;
    }

    if (password.length < 6) {
      showAuthMessage(
        "Your password must be at least 6 characters.",
        "bad"
      );
      return;
    }

    if (password !== confirmPassword) {
      showAuthMessage(
        "The passwords do not match.",
        "bad"
      );
      return;
    }

    const button =
      document.getElementById(
        "authSignupSubmit"
      );

    button.disabled = true;
    button.textContent = "Creating Account...";

    const {
      data,
      error
    } =
      await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: SITE_URL
        }
      });

    button.disabled = false;
    button.textContent = "Create Account";

    if (error) {
      showAuthMessage(
        error.message ||
          "Could not create your account.",
        "bad"
      );
      return;
    }

    if (data?.session) {
      showAuthMessage(
        "Your account was created and you are signed in.",
        "good"
      );

      setTimeout(
        closeModal,
        900
      );

      return;
    }

    showAuthMessage(
      "Account created! Check your email and click the confirmation link before signing in.",
      "good"
    );
  }

  /* =========================================================
     SIGN-IN MODAL
  ========================================================= */

  function showSignInModal() {
    openModal(
      "Sign In",
      `
        <div class="auth-field">
          <label for="authSigninEmail">Email</label>
          <input
            id="authSigninEmail"
            type="email"
            autocomplete="email"
            placeholder="you@example.com"
          >
        </div>

        <div class="auth-field">
          <label for="authSigninPassword">Password</label>
          <input
            id="authSigninPassword"
            type="password"
            autocomplete="current-password"
            placeholder="Your password"
          >
        </div>

        <button
          id="authSigninSubmit"
          class="auth-main-button"
          type="button"
        >
          Sign In
        </button>

        <div class="auth-secondary-row">
          <button
            id="authForgotPassword"
            class="auth-link-button"
            type="button"
          >
            Forgot Password?
          </button>

          <button
            id="authSwitchToSignup"
            class="auth-link-button"
            type="button"
          >
            Create Account
          </button>
        </div>
      `
    );

    document
      .getElementById("authForgotPassword")
      .addEventListener(
        "click",
        showForgotPasswordModal
      );

    document
      .getElementById("authSwitchToSignup")
      .addEventListener(
        "click",
        showSignUpModal
      );

    document
      .getElementById("authSigninSubmit")
      .addEventListener(
        "click",
        signIn
      );
  }

  async function signIn() {
    clearAuthMessage();

    const email =
      document
        .getElementById("authSigninEmail")
        .value
        .trim();

    const password =
      document
        .getElementById("authSigninPassword")
        .value;

    if (!email || !password) {
      showAuthMessage(
        "Enter your email and password.",
        "bad"
      );
      return;
    }

    const button =
      document.getElementById(
        "authSigninSubmit"
      );

    button.disabled = true;
    button.textContent = "Signing In...";

    const {
      error
    } =
      await supabaseClient.auth
        .signInWithPassword({
          email,
          password
        });

    button.disabled = false;
    button.textContent = "Sign In";

    if (error) {
      showAuthMessage(
        error.message ||
          "Could not sign in.",
        "bad"
      );
      return;
    }

    showAuthMessage(
      "Signed in successfully.",
      "good"
    );

    setTimeout(
      closeModal,
      650
    );
  }

  /* =========================================================
     FORGOT PASSWORD
  ========================================================= */

  function showForgotPasswordModal() {
    openModal(
      "Reset Password",
      `
        <p class="auth-helper">
          Enter the email address for your Stretch My Check account.
          We'll send you a secure password-reset link.
        </p>

        <div class="auth-field">
          <label for="authResetEmail">Email</label>
          <input
            id="authResetEmail"
            type="email"
            autocomplete="email"
            placeholder="you@example.com"
          >
        </div>

        <button
          id="authResetSubmit"
          class="auth-main-button"
          type="button"
        >
          Send Reset Link
        </button>

        <button
          id="authBackToSignin"
          class="auth-link-button"
          type="button"
        >
          Back to Sign In
        </button>
      `
    );

    document
      .getElementById("authBackToSignin")
      .addEventListener(
        "click",
        showSignInModal
      );

    document
      .getElementById("authResetSubmit")
      .addEventListener(
        "click",
        sendResetLink
      );
  }

  async function sendResetLink() {
    clearAuthMessage();

    const email =
      document
        .getElementById("authResetEmail")
        .value
        .trim();

    if (!email) {
      showAuthMessage(
        "Enter your email address.",
        "bad"
      );
      return;
    }

    const button =
      document.getElementById(
        "authResetSubmit"
      );

    button.disabled = true;
    button.textContent = "Sending...";

    const {
      error
    } =
      await supabaseClient.auth
        .resetPasswordForEmail(
          email,
          {
            redirectTo: SITE_URL
          }
        );

    button.disabled = false;
    button.textContent = "Send Reset Link";

    if (error) {
      showAuthMessage(
        error.message ||
          "Could not send the reset email.",
        "bad"
      );
      return;
    }

    showAuthMessage(
      "Password reset email sent. Open the link in that email to choose a new password.",
      "good"
    );
  }

  /* =========================================================
     SET / CHANGE PASSWORD
  ========================================================= */

  function showChangePasswordModal(
    isRecovery = false
  ) {
    openModal(
      isRecovery
        ? "Choose a New Password"
        : "Change Password",
      `
        <div class="auth-field">
          <label for="authNewPassword">
            New password
          </label>

          <input
            id="authNewPassword"
            type="password"
            autocomplete="new-password"
            placeholder="At least 6 characters"
          >
        </div>

        <div class="auth-field">
          <label for="authConfirmNewPassword">
            Confirm new password
          </label>

          <input
            id="authConfirmNewPassword"
            type="password"
            autocomplete="new-password"
            placeholder="Enter it again"
          >
        </div>

        <button
          id="authUpdatePasswordSubmit"
          class="auth-main-button"
          type="button"
        >
          ${
            isRecovery
              ? "Save New Password"
              : "Update Password"
          }
        </button>
      `
    );

    document
      .getElementById(
        "authUpdatePasswordSubmit"
      )
      .addEventListener(
        "click",
        updatePassword
      );
  }

  async function updatePassword() {
    clearAuthMessage();

    const password =
      document
        .getElementById(
          "authNewPassword"
        )
        .value;

    const confirmPassword =
      document
        .getElementById(
          "authConfirmNewPassword"
        )
        .value;

    if (password.length < 6) {
      showAuthMessage(
        "Your new password must be at least 6 characters.",
        "bad"
      );
      return;
    }

    if (password !== confirmPassword) {
      showAuthMessage(
        "The passwords do not match.",
        "bad"
      );
      return;
    }

    const button =
      document.getElementById(
        "authUpdatePasswordSubmit"
      );

    button.disabled = true;
    button.textContent = "Saving...";

    const {
      error
    } =
      await supabaseClient.auth.updateUser({
        password
      });

    button.disabled = false;
    button.textContent = "Update Password";

    if (error) {
      showAuthMessage(
        error.message ||
          "Could not update your password.",
        "bad"
      );
      return;
    }

    showAuthMessage(
      "Your password was updated successfully.",
      "good"
    );

    if (
      window.history &&
      window.location.hash
    ) {
      window.history.replaceState(
        null,
        document.title,
        window.location.pathname
      );
    }

    setTimeout(
      closeModal,
      900
    );
  }

  /* =========================================================
     HEADER ACCOUNT AREA
  ========================================================= */

  function renderSignedOut() {
    accountArea.innerHTML = `
      <div class="auth-header-wrap">
        <button
          id="authCreateAccountButton"
          class="account-button"
          type="button"
        >
          Create Account
        </button>

        <button
          id="authSignInButton"
          class="account-button"
          type="button"
        >
          Sign In
        </button>
      </div>
    `;

    document
      .getElementById(
        "authCreateAccountButton"
      )
      .addEventListener(
        "click",
        showSignUpModal
      );

    document
      .getElementById(
        "authSignInButton"
      )
      .addEventListener(
        "click",
        showSignInModal
      );
  }

  function renderSignedIn(user) {
    const email =
      user?.email || "Signed in";

    accountArea.innerHTML = `
      <div class="auth-header-wrap">
        <span class="auth-email-small"></span>

        <button
          id="authAccountMenuButton"
          class="account-button"
          type="button"
          aria-expanded="false"
        >
          Account ▾
        </button>

        <div
          id="authAccountMenu"
          class="auth-menu"
        >
          <div
            id="authAccountMenuEmail"
            class="auth-menu-email"
          ></div>

          <button
            id="authChangePasswordButton"
            type="button"
          >
            Change Password
          </button>

          <button
            id="authSignOutButton"
            class="auth-danger"
            type="button"
          >
            Sign Out
          </button>
        </div>
      </div>
    `;

    accountArea
      .querySelector(".auth-email-small")
      .textContent = email;

    document
      .getElementById(
        "authAccountMenuEmail"
      )
      .textContent = email;

    const menu =
      document.getElementById(
        "authAccountMenu"
      );

    const menuButton =
      document.getElementById(
        "authAccountMenuButton"
      );

    menuButton.addEventListener(
      "click",
      event => {
        event.stopPropagation();

        const isOpen =
          menu.classList.toggle("show");

        menuButton.setAttribute(
          "aria-expanded",
          String(isOpen)
        );
      }
    );

    document
      .getElementById(
        "authChangePasswordButton"
      )
      .addEventListener(
        "click",
        () => {
          menu.classList.remove("show");
          showChangePasswordModal(false);
        }
      );

    document
      .getElementById(
        "authSignOutButton"
      )
      .addEventListener(
        "click",
        async () => {
          menu.classList.remove("show");

          const {
            error
          } =
            await supabaseClient.auth.signOut();

          if (error) {
            window.alert(
              error.message ||
                "Could not sign out."
            );
          }
        }
      );
  }

  document.addEventListener(
    "click",
    event => {
      const menu =
        document.getElementById(
          "authAccountMenu"
        );

      const menuButton =
        document.getElementById(
          "authAccountMenuButton"
        );

      if (
        menu &&
        menuButton &&
        !menu.contains(event.target) &&
        !menuButton.contains(event.target)
      ) {
        menu.classList.remove("show");
        menuButton.setAttribute(
          "aria-expanded",
          "false"
        );
      }
    }
  );

  /* =========================================================
     INITIAL SESSION
  ========================================================= */

  async function refreshHeader() {
    const {
      data,
      error
    } =
      await supabaseClient.auth.getSession();

    if (error) {
      console.error(error);
      renderSignedOut();
      return;
    }

    if (data?.session?.user) {
      renderSignedIn(
        data.session.user
      );
    } else {
      renderSignedOut();
    }
  }

  /* =========================================================
     AUTH EVENTS
  ========================================================= */

  supabaseClient.auth.onAuthStateChange(
    (event, session) => {
      if (session?.user) {
        renderSignedIn(session.user);
      } else {
        renderSignedOut();
      }

      if (event === "PASSWORD_RECOVERY") {
        setTimeout(
          () => {
            showChangePasswordModal(true);
          },
          150
        );
      }
    }
  );

  refreshHeader();

})();