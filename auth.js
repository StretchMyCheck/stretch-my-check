(() => {
  "use strict";

  const supabaseClient =
    window.supabaseClient;

  if (!supabaseClient) {
    console.error(
      "Supabase client is not available. Load supabase-config.js before auth.js."
    );
    return;
  }

  const SITE_URL =
    "https://stretchmycheck.github.io/stretch-my-check/";

  const accountArea =
    document.querySelector(
      ".account-buttons"
    );

  if (!accountArea) {
    console.error(
      "Could not find .account-buttons."
    );
    return;
  }

  /* =========================================================
     STYLES
  ========================================================= */

  const style =
    document.createElement("style");

  style.textContent = `
    .auth-header-wrap {
      position: relative;
      display: flex;
      align-items: center;
      gap: 10px;
      justify-content: flex-end;
      flex-wrap: wrap;
    }

    .auth-user-name {
      font-size: 14px;
      font-weight: 750;
    }

    .auth-menu {
      position: absolute;
      top: calc(100% + 10px);
      right: 0;
      width: 250px;
      background: #ffffff;
      color: #17242c;
      border: 1px solid #d6e0e5;
      border-radius: 14px;
      padding: 10px;
      box-shadow:
        0 18px 45px
        rgba(0,0,0,.22);
      display: none;
      z-index: 10020;
    }

    .auth-menu.show {
      display: block;
    }

    .auth-menu-email {
      padding: 8px 10px 11px;
      margin-bottom: 6px;
      border-bottom:
        1px solid #edf1f3;
      font-size: 12px;
      color: #667681;
      word-break: break-word;
    }

    .auth-menu button {
      width: 100%;
      border: 0;
      background: transparent;
      color: #17242c;
      text-align: left;
      padding: 11px 10px;
      border-radius: 9px;
      cursor: pointer;
      font-weight: 750;
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
      background:
        rgba(5,14,19,.78);
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
      background: #ffffff;
      color: #17242c;
      border-radius: 20px;
      padding: 24px;
      box-shadow:
        0 24px 70px
        rgba(0,0,0,.32);
    }

    .auth-modal-header {
      display: flex;
      justify-content:
        space-between;
      align-items: center;
      gap: 14px;
      margin-bottom: 18px;
    }

    .auth-modal-header h2 {
      margin: 0;
      font-size: 24px;
    }

    .auth-close {
      width: 40px;
      height: 40px;
      border: 0;
      border-radius: 10px;
      background: #edf2f4;
      color: #17242c;
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
      font-size: 14px;
      font-weight: 750;
    }

    .auth-field input {
      width: 100%;
      box-sizing: border-box;
      border:
        1px solid #d6e0e5;
      border-radius: 11px;
      min-height: 46px;
      padding: 12px 13px;
      font-size: 16px;
      color: #17242c;
      background: #fff;
    }

    .auth-field input:focus {
      outline: none;
      border-color: #247c8b;
      box-shadow:
        0 0 0 3px
        rgba(36,124,139,.12);
    }

    .auth-main-button {
      width: 100%;
      min-height: 47px;
      border: 0;
      border-radius: 11px;
      background: #247c8b;
      color: #fff;
      padding: 13px 15px;
      font-weight: 800;
      cursor: pointer;
      margin-top: 3px;
    }

    .auth-main-button:disabled {
      opacity: .65;
      cursor: wait;
    }

    .auth-secondary-row {
      display: flex;
      justify-content:
        space-between;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      margin-top: 11px;
    }

    .auth-link-button {
      border: 0;
      background: transparent;
      color: #247c8b;
      font-weight: 750;
      cursor: pointer;
      padding: 7px 0;
    }

    .auth-helper {
      color: #667681;
      font-size: 13px;
      line-height: 1.5;
    }

    .auth-message {
      display: none;
      margin-top: 14px;
      padding: 11px 12px;
      border-radius: 10px;
      font-size: 14px;
      line-height: 1.45;
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

    @media (
      max-width: 700px
    ) {
      .auth-header-wrap {
        justify-content:
          flex-start;
      }

      .auth-menu {
        left: 0;
        right: auto;
      }
    }

    @media print {
      .auth-modal-overlay,
      .auth-menu {
        display: none !important;
      }
    }
  `;

  document.head.appendChild(
    style
  );

  /* =========================================================
     MODAL
  ========================================================= */

  const overlay =
    document.createElement("div");

  overlay.className =
    "auth-modal-overlay";

  overlay.innerHTML = `
    <div class="auth-modal">

      <div class="auth-modal-header">

        <h2 id="authModalTitle">
          Account
        </h2>

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

  document.body.appendChild(
    overlay
  );

  const modalTitle =
    document.getElementById(
      "authModalTitle"
    );

  const modalBody =
    document.getElementById(
      "authModalBody"
    );

  const authMessage =
    document.getElementById(
      "authMessage"
    );

  const closeButton =
    document.getElementById(
      "authCloseButton"
    );

  function openModal(
    title,
    content
  ) {
    modalTitle.textContent =
      title;

    modalBody.innerHTML =
      content;

    clearMessage();

    closeButton.style.display =
      "";

    overlay.classList.add(
      "show"
    );
  }

  function closeModal() {
    overlay.classList.remove(
      "show"
    );

    clearMessage();

    closeButton.style.display =
      "";
  }

  function showMessage(
    message,
    type = "info"
  ) {
    authMessage.textContent =
      message;

    authMessage.className =
      `auth-message show ${type}`;
  }

  function clearMessage() {
    authMessage.textContent =
      "";

    authMessage.className =
      "auth-message";
  }

  closeButton.addEventListener(
    "click",
    closeModal
  );

  overlay.addEventListener(
    "click",
    event => {
      if (
        event.target === overlay
      ) {
        closeModal();
      }
    }
  );

  document.addEventListener(
    "keydown",
    event => {
      if (
        event.key === "Escape" &&
        overlay.classList
          .contains("show")
      ) {
        closeModal();
      }
    }
  );

  /* =========================================================
     PROFILE HELPERS
  ========================================================= */

  function getFirstName(user) {
    return String(
      user
        ?.user_metadata
        ?.first_name || ""
    ).trim();
  }

  function notifyProfile(
    user
  ) {
    window.dispatchEvent(
      new CustomEvent(
        "stretchmycheck:profile-updated",
        {
          detail: {
            user,
            firstName:
              getFirstName(user)
          }
        }
      )
    );
  }

  /* =========================================================
     CREATE ACCOUNT
  ========================================================= */

  function showSignUp() {
    openModal(
      "Create Account",
      `
        <p class="auth-helper">
          Create your Stretch My Check
          profile so your dashboard can
          greet you by name.
        </p>

        <div class="auth-field">
          <label
            for="signupFirstName"
          >
            First name
          </label>

          <input
            id="signupFirstName"
            type="text"
            maxlength="40"
            autocomplete="given-name"
            placeholder="What should we call you?"
          >
        </div>

        <div class="auth-field">
          <label
            for="signupEmail"
          >
            Email
          </label>

          <input
            id="signupEmail"
            type="email"
            autocomplete="email"
            placeholder="you@example.com"
          >
        </div>

        <div class="auth-field">
          <label
            for="signupPassword"
          >
            Password
          </label>

          <input
            id="signupPassword"
            type="password"
            autocomplete="new-password"
            placeholder="At least 6 characters"
          >
        </div>

        <div class="auth-field">
          <label
            for="signupConfirm"
          >
            Confirm password
          </label>

          <input
            id="signupConfirm"
            type="password"
            autocomplete="new-password"
            placeholder="Enter it again"
          >
        </div>

        <button
          id="signupSubmit"
          class="auth-main-button"
          type="button"
        >
          Create Account
        </button>

        <div
          class="auth-secondary-row"
        >
          <span
            class="auth-helper"
          >
            Already have an account?
          </span>

          <button
            id="signupToSignin"
            class="auth-link-button"
            type="button"
          >
            Sign In
          </button>
        </div>
      `
    );

    document
      .getElementById(
        "signupToSignin"
      )
      .addEventListener(
        "click",
        showSignIn
      );

    document
      .getElementById(
        "signupSubmit"
      )
      .addEventListener(
        "click",
        createAccount
      );
  }

  async function createAccount() {
    clearMessage();

    const firstName =
      document
        .getElementById(
          "signupFirstName"
        )
        .value
        .trim();

    const email =
      document
        .getElementById(
          "signupEmail"
        )
        .value
        .trim();

    const password =
      document
        .getElementById(
          "signupPassword"
        )
        .value;

    const confirm =
      document
        .getElementById(
          "signupConfirm"
        )
        .value;

    if (!firstName) {
      showMessage(
        "Enter your first name.",
        "bad"
      );
      return;
    }

    if (!email) {
      showMessage(
        "Enter your email address.",
        "bad"
      );
      return;
    }

    if (
      password.length < 6
    ) {
      showMessage(
        "Your password must be at least 6 characters.",
        "bad"
      );
      return;
    }

    if (
      password !== confirm
    ) {
      showMessage(
        "The passwords do not match.",
        "bad"
      );
      return;
    }

    const button =
      document.getElementById(
        "signupSubmit"
      );

    button.disabled = true;
    button.textContent =
      "Creating Account...";

    const {
      data,
      error
    } =
      await supabaseClient.auth
        .signUp({
          email,
          password,

          options: {
            emailRedirectTo:
              SITE_URL,

            data: {
              first_name:
                firstName
            }
          }
        });

    button.disabled = false;
    button.textContent =
      "Create Account";

    if (error) {
      showMessage(
        error.message ||
          "Could not create your account.",
        "bad"
      );
      return;
    }

    if (data?.session) {
      showMessage(
        "Account created. You're signed in!",
        "good"
      );

      setTimeout(
        closeModal,
        700
      );

      return;
    }

    showMessage(
      "Account created! Check your email and click the confirmation link before signing in.",
      "good"
    );
  }

  /* =========================================================
     SIGN IN
  ========================================================= */

  function showSignIn() {
    openModal(
      "Sign In",
      `
        <div class="auth-field">
          <label
            for="signinEmail"
          >
            Email
          </label>

          <input
            id="signinEmail"
            type="email"
            autocomplete="email"
            placeholder="you@example.com"
          >
        </div>

        <div class="auth-field">
          <label
            for="signinPassword"
          >
            Password
          </label>

          <input
            id="signinPassword"
            type="password"
            autocomplete="current-password"
            placeholder="Your password"
          >
        </div>

        <button
          id="signinSubmit"
          class="auth-main-button"
          type="button"
        >
          Sign In
        </button>

        <div
          class="auth-secondary-row"
        >

          <button
            id="forgotPassword"
            class="auth-link-button"
            type="button"
          >
            Forgot Password?
          </button>

          <button
            id="signinToSignup"
            class="auth-link-button"
            type="button"
          >
            Create Account
          </button>

        </div>
      `
    );

    document
      .getElementById(
        "forgotPassword"
      )
      .addEventListener(
        "click",
        showForgotPassword
      );

    document
      .getElementById(
        "signinToSignup"
      )
      .addEventListener(
        "click",
        showSignUp
      );

    document
      .getElementById(
        "signinSubmit"
      )
      .addEventListener(
        "click",
        signIn
      );
  }

  async function signIn() {
    clearMessage();

    const email =
      document
        .getElementById(
          "signinEmail"
        )
        .value
        .trim();

    const password =
      document
        .getElementById(
          "signinPassword"
        )
        .value;

    if (
      !email ||
      !password
    ) {
      showMessage(
        "Enter your email and password.",
        "bad"
      );
      return;
    }

    const button =
      document.getElementById(
        "signinSubmit"
      );

    button.disabled = true;
    button.textContent =
      "Signing In...";

    const {
      error
    } =
      await supabaseClient.auth
        .signInWithPassword({
          email,
          password
        });

    button.disabled = false;
    button.textContent =
      "Sign In";

    if (error) {
      showMessage(
        error.message ||
          "Could not sign in.",
        "bad"
      );
      return;
    }

    showMessage(
      "Signed in successfully.",
      "good"
    );

    setTimeout(
      closeModal,
      600
    );
  }

  /* =========================================================
     FORGOT PASSWORD
  ========================================================= */

  function showForgotPassword() {
    openModal(
      "Reset Password",
      `
        <p class="auth-helper">
          Enter your account email.
          We'll send you a secure
          password reset link.
        </p>

        <div class="auth-field">
          <label
            for="resetEmail"
          >
            Email
          </label>

          <input
            id="resetEmail"
            type="email"
            autocomplete="email"
            placeholder="you@example.com"
          >
        </div>

        <button
          id="resetSubmit"
          class="auth-main-button"
          type="button"
        >
          Send Reset Link
        </button>

        <button
          id="resetBack"
          class="auth-link-button"
          type="button"
        >
          Back to Sign In
        </button>
      `
    );

    document
      .getElementById(
        "resetBack"
      )
      .addEventListener(
        "click",
        showSignIn
      );

    document
      .getElementById(
        "resetSubmit"
      )
      .addEventListener(
        "click",
        sendReset
      );
  }

  async function sendReset() {
    clearMessage();

    const email =
      document
        .getElementById(
          "resetEmail"
        )
        .value
        .trim();

    if (!email) {
      showMessage(
        "Enter your email address.",
        "bad"
      );
      return;
    }

    const button =
      document.getElementById(
        "resetSubmit"
      );

    button.disabled = true;
    button.textContent =
      "Sending...";

    const {
      error
    } =
      await supabaseClient.auth
        .resetPasswordForEmail(
          email,
          {
            redirectTo:
              SITE_URL
          }
        );

    button.disabled = false;
    button.textContent =
      "Send Reset Link";

    if (error) {
      showMessage(
        error.message ||
          "Could not send reset email.",
        "bad"
      );
      return;
    }

    showMessage(
      "Password reset email sent.",
      "good"
    );
  }

  /* =========================================================
     CHANGE PASSWORD
  ========================================================= */

  function showChangePassword(
    recovery = false
  ) {
    openModal(
      recovery
        ? "Choose a New Password"
        : "Change Password",
      `
        <div class="auth-field">
          <label
            for="newPassword"
          >
            New password
          </label>

          <input
            id="newPassword"
            type="password"
            autocomplete="new-password"
            placeholder="At least 6 characters"
          >
        </div>

        <div class="auth-field">
          <label
            for="confirmNewPassword"
          >
            Confirm new password
          </label>

          <input
            id="confirmNewPassword"
            type="password"
            autocomplete="new-password"
            placeholder="Enter it again"
          >
        </div>

        <button
          id="updatePassword"
          class="auth-main-button"
          type="button"
        >
          Save New Password
        </button>
      `
    );

    document
      .getElementById(
        "updatePassword"
      )
      .addEventListener(
        "click",
        updatePassword
      );
  }

  async function updatePassword() {
    clearMessage();

    const password =
      document
        .getElementById(
          "newPassword"
        )
        .value;

    const confirm =
      document
        .getElementById(
          "confirmNewPassword"
        )
        .value;

    if (
      password.length < 6
    ) {
      showMessage(
        "Password must be at least 6 characters.",
        "bad"
      );
      return;
    }

    if (
      password !== confirm
    ) {
      showMessage(
        "The passwords do not match.",
        "bad"
      );
      return;
    }

    const {
      error
    } =
      await supabaseClient.auth
        .updateUser({
          password
        });

    if (error) {
      showMessage(
        error.message ||
          "Could not update password.",
        "bad"
      );
      return;
    }

    showMessage(
      "Password updated successfully.",
      "good"
    );

    setTimeout(
      closeModal,
      700
    );
  }

  /* =========================================================
     PROFILE
  ========================================================= */

  function showProfile(
    user,
    required = false
  ) {
    const currentName =
      getFirstName(user);

    openModal(
      required
        ? "Finish Your Profile"
        : "Your Profile",
      `
        <p class="auth-helper">
          ${
            required
              ? "Before we open your dashboard, tell us what name Stretch My Check should call you."
              : "Change the name Stretch My Check uses on your dashboard."
          }
        </p>

        <div class="auth-field">
          <label
            for="profileFirstName"
          >
            First name
          </label>

          <input
            id="profileFirstName"
            type="text"
            maxlength="40"
            autocomplete="given-name"
            placeholder="Your first name"
          >
        </div>

        <button
          id="saveProfile"
          class="auth-main-button"
          type="button"
        >
          Save Profile
        </button>
      `
    );

    const input =
      document.getElementById(
        "profileFirstName"
      );

    input.value =
      currentName;

    if (required) {
      closeButton.style.display =
        "none";
    }

    document
      .getElementById(
        "saveProfile"
      )
      .addEventListener(
        "click",
        async () => {
          clearMessage();

          const firstName =
            input.value.trim();

          if (!firstName) {
            showMessage(
              "Enter your first name.",
              "bad"
            );
            return;
          }

          const button =
            document.getElementById(
              "saveProfile"
            );

          button.disabled = true;
          button.textContent =
            "Saving...";

          const {
            data,
            error
          } =
            await supabaseClient.auth
              .updateUser({
                data: {
                  first_name:
                    firstName
                }
              });

          button.disabled = false;
          button.textContent =
            "Save Profile";

          if (error) {
            showMessage(
              error.message ||
                "Could not save your profile.",
              "bad"
            );
            return;
          }

          const updatedUser =
            data?.user || user;

          renderSignedIn(
            updatedUser
          );

          notifyProfile(
            updatedUser
          );

          showMessage(
            "Profile saved.",
            "good"
          );

          setTimeout(
            closeModal,
            600
          );
        }
      );
  }

  function requireProfile(
    user
  ) {
    if (
      user &&
      !getFirstName(user)
    ) {
      setTimeout(
        () => {
          showProfile(
            user,
            true
          );
        },
        200
      );
    }
  }

  /* =========================================================
     HEADER
  ========================================================= */

  function renderSignedOut() {
    accountArea.innerHTML = `
      <div
        class="auth-header-wrap"
      >
        <button
          id="createAccountButton"
          class="account-button"
          type="button"
        >
          Create Account
        </button>

        <button
          id="signInButton"
          class="account-button"
          type="button"
        >
          Sign In
        </button>
      </div>
    `;

    document
      .getElementById(
        "createAccountButton"
      )
      .addEventListener(
        "click",
        showSignUp
      );

    document
      .getElementById(
        "signInButton"
      )
      .addEventListener(
        "click",
        showSignIn
      );
  }

  function renderSignedIn(
    user
  ) {
    const email =
      user?.email ||
      "Signed in";

    const firstName =
      getFirstName(user);

    accountArea.innerHTML = `
      <div
        class="auth-header-wrap"
      >

        <span
          class="auth-user-name"
        ></span>

        <button
          id="accountMenuButton"
          class="account-button"
          type="button"
        >
          Account ▾
        </button>

        <div
          id="accountMenu"
          class="auth-menu"
        >

          <div
            id="accountMenuEmail"
            class="auth-menu-email"
          ></div>

          <button
            id="profileButton"
            type="button"
          >
            Profile
          </button>

          <button
            id="changePasswordButton"
            type="button"
          >
            Change Password
          </button>

          <button
            id="signOutButton"
            class="auth-danger"
            type="button"
          >
            Sign Out
          </button>

        </div>

      </div>
    `;

    accountArea
      .querySelector(
        ".auth-user-name"
      )
      .textContent =
        firstName
          ? `Hi, ${firstName}`
          : email;

    document
      .getElementById(
        "accountMenuEmail"
      )
      .textContent =
        email;

    const menu =
      document.getElementById(
        "accountMenu"
      );

    const menuButton =
      document.getElementById(
        "accountMenuButton"
      );

    menuButton.addEventListener(
      "click",
      event => {
        event.stopPropagation();

        menu.classList.toggle(
          "show"
        );
      }
    );

    document
      .getElementById(
        "profileButton"
      )
      .addEventListener(
        "click",
        () => {
          menu.classList.remove(
            "show"
          );

          showProfile(
            user,
            false
          );
        }
      );

    document
      .getElementById(
        "changePasswordButton"
      )
      .addEventListener(
        "click",
        () => {
          menu.classList.remove(
            "show"
          );

          showChangePassword(
            false
          );
        }
      );

    document
      .getElementById(
        "signOutButton"
      )
      .addEventListener(
        "click",
        async () => {
          menu.classList.remove(
            "show"
          );

          const {
            error
          } =
            await supabaseClient.auth
              .signOut();

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
          "accountMenu"
        );

      const button =
        document.getElementById(
          "accountMenuButton"
        );

      if (
        menu &&
        button &&
        !menu.contains(
          event.target
        ) &&
        !button.contains(
          event.target
        )
      ) {
        menu.classList.remove(
          "show"
        );
      }
    }
  );

  /* =========================================================
     AUTH STATE
  ========================================================= */

  async function refreshHeader() {
    const {
      data,
      error
    } =
      await supabaseClient.auth
        .getSession();

    if (error) {
      console.error(error);
      renderSignedOut();
      return;
    }

    const user =
      data?.session?.user;

    if (user) {
      renderSignedIn(user);
      requireProfile(user);
      notifyProfile(user);
    } else {
      renderSignedOut();
    }
  }

  supabaseClient.auth
    .onAuthStateChange(
      (
        event,
        session
      ) => {
        const user =
          session?.user;

        if (user) {
          renderSignedIn(
            user
          );

          if (
            event ===
              "SIGNED_IN" ||
            event ===
              "USER_UPDATED"
          ) {
            requireProfile(
              user
            );

            notifyProfile(
              user
            );
          }
        } else {
          renderSignedOut();
        }

        if (
          event ===
          "PASSWORD_RECOVERY"
        ) {
          setTimeout(
            () => {
              showChangePassword(
                true
              );
            },
            150
          );
        }
      }
    );

  /* =========================================================
     PUBLIC API
  ========================================================= */

  window.StretchMyCheckAuth = {

    showProfile:
      async () => {
        const {
          data
        } =
          await supabaseClient.auth
            .getUser();

        if (
          data?.user
        ) {
          showProfile(
            data.user,
            false
          );
        }
      },

    getDisplayName:
      async () => {
        const {
          data
        } =
          await supabaseClient.auth
            .getUser();

        return getFirstName(
          data?.user
        );
      },

    refreshHeader
  };

  refreshHeader();

})();