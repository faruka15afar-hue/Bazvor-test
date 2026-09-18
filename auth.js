"use strict";

/* =========================================================
   BAZVOR AUTH
========================================================= */

import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


/* =========================================================
   FIREBASE
========================================================= */

const firebaseConfig = {
  apiKey: "AIzaSyCc1q9_taS8b-T3FxQmQ12BajjBgvtcmyM",
  authDomain: "bazvor-da3c4.firebaseapp.com",
  projectId: "bazvor-da3c4",
  storageBucket: "bazvor-da3c4.firebasestorage.app",
  messagingSenderId: "59852021286",
  appId: "1:59852021286:web:b6ad6eba476f853b1710e7",
  measurementId: "G-L6JFCT5RDD"
};

const app =
  initializeApp(firebaseConfig);

const auth =
  getAuth(app);

const db =
  getFirestore(app);


/* =========================================================
   ELEMENTS
========================================================= */

const $ = selector =>
  document.querySelector(selector);

const loginTab =
  $("#loginTab");

const registerTab =
  $("#registerTab");

const loginForm =
  $("#loginForm");

const registerForm =
  $("#registerForm");

const authTitle =
  $("#authTitle");

const authSubtitle =
  $("#authSubtitle");

const messageBox =
  $("#authMessage");


/* =========================================================
   MESSAGE
========================================================= */

function clearMessage() {

  messageBox.textContent = "";

  messageBox.className =
    "auth-message";
}


function showMessage(
  message,
  type = "error"
) {

  messageBox.textContent =
    message;

  messageBox.className =
    `auth-message ${type}`;

  messageBox.scrollIntoView({
    behavior: "smooth",
    block: "nearest"
  });
}


/* =========================================================
   CHANGE MODE
========================================================= */

function showLogin() {

  clearMessage();

  loginTab.classList.add(
    "active"
  );

  registerTab.classList.remove(
    "active"
  );

  loginForm.classList.remove(
    "hidden"
  );

  registerForm.classList.add(
    "hidden"
  );

  authTitle.textContent =
    "Welcome to Bazvor";

  authSubtitle.textContent =
    "Login to continue shopping";

  document.title =
    "Bazvor — Login";
}


function showRegister() {

  clearMessage();

  registerTab.classList.add(
    "active"
  );

  loginTab.classList.remove(
    "active"
  );

  registerForm.classList.remove(
    "hidden"
  );

  loginForm.classList.add(
    "hidden"
  );

  authTitle.textContent =
    "Create your account";

  authSubtitle.textContent =
    "Join Bazvor and start shopping";

  document.title =
    "Bazvor — Create Account";
}


loginTab.addEventListener(
  "click",
  showLogin
);

registerTab.addEventListener(
  "click",
  showRegister
);

$("#openRegister").addEventListener(
  "click",
  showRegister
);

$("#openLogin").addEventListener(
  "click",
  showLogin
);


/* =========================================================
   PASSWORD SHOW/HIDE
========================================================= */

document
  .querySelectorAll(
    "[data-password-target]"
  )
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        const input =
          document.getElementById(
            button.dataset.passwordTarget
          );

        if (!input) return;

        const visible =
          input.type === "text";

        input.type =
          visible
            ? "password"
            : "text";

        button.innerHTML =
          visible
            ? `<i class="fa-regular fa-eye"></i>`
            : `<i class="fa-regular fa-eye-slash"></i>`;

        button.setAttribute(
          "aria-label",
          visible
            ? "Show password"
            : "Hide password"
        );
      }
    );
  });


/* =========================================================
   FIREBASE ERRORS
========================================================= */

function getFirebaseError(error) {

  switch (error?.code) {

    case "auth/email-already-in-use":
      return "This email is already registered.";

    case "auth/invalid-email":
      return "Please enter a valid email address.";

    case "auth/weak-password":
      return "Password must be at least 6 characters.";

    case "auth/invalid-credential":
      return "Email or password is incorrect.";

    case "auth/user-not-found":
      return "No account was found with this email.";

    case "auth/wrong-password":
      return "Email or password is incorrect.";

    case "auth/too-many-requests":
      return "Too many attempts. Please try again later.";

    case "auth/network-request-failed":
      return "Please check your internet connection.";

    case "auth/operation-not-allowed":
      return "Email/password login is not enabled in Firebase.";

    default:
      console.error(
        "AUTH ERROR:",
        error
      );

      return "Something went wrong. Please try again.";
  }
}


/* =========================================================
   LOADING BUTTON
========================================================= */

function setButtonLoading(
  button,
  loading,
  normalText
) {

  button.disabled =
    loading;

  if (loading) {

    button.innerHTML = `
      <i class="fa-solid fa-spinner fa-spin"></i>
      Please wait...
    `;

  } else {

    button.innerHTML = `
      <span>${normalText}</span>
      <i class="fa-solid fa-arrow-right"></i>
    `;
  }
}


/* =========================================================
   REGISTER
========================================================= */

registerForm.addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    clearMessage();


    const name =
      $("#registerName")
        .value
        .trim();

    const phone =
      $("#registerPhone")
        .value
        .trim();

    const email =
      $("#registerEmail")
        .value
        .trim()
        .toLowerCase();

    const password =
      $("#registerPassword")
        .value;

    const confirm =
      $("#confirmPassword")
        .value;

    const terms =
      $("#termsCheckbox")
        .checked;


    if (name.length < 2) {

      showMessage(
        "Please enter your full name."
      );

      return;
    }


    if (!email) {

      showMessage(
        "Please enter your email address."
      );

      return;
    }


    if (password.length < 6) {

      showMessage(
        "Password must be at least 6 characters."
      );

      return;
    }


    if (
      password !== confirm
    ) {

      showMessage(
        "Passwords do not match."
      );

      return;
    }


    if (!terms) {

      showMessage(
        "Please accept the Terms & Conditions."
      );

      return;
    }


    const button =
      $("#registerButton");


    setButtonLoading(
      button,
      true,
      "Create Account"
    );


    try {

      /*
         1. Create Firebase Auth user
      */

      const credential =
        await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );


      const user =
        credential.user;


      /*
         2. Add display name to Firebase Auth
      */

      await updateProfile(
        user,
        {
          displayName: name
        }
      );


      /*
         3. Save profile to Firestore

         Collection:
         users

         Document ID:
         Firebase UID
      */

      await setDoc(
        doc(
          db,
          "users",
          user.uid
        ),
        {
          uid:
            user.uid,

          fullName:
            name,

          displayName:
            name,

          email:
            email,

          phone:
            phone,

          photoURL:
            "",

          role:
            "customer",

          status:
            "active",

          createdAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp()
        }
      );


      showMessage(
        "Account created successfully.",
        "success"
      );


      /*
         Firebase automatically signs in
         the newly created account.
      */

      setTimeout(
        () => {

          window.location.href =
            "account.html";

        },
        700
      );


    } catch (error) {

      showMessage(
        getFirebaseError(
          error
        )
      );

      setButtonLoading(
        button,
        false,
        "Create Account"
      );
    }
  }
);


/* =========================================================
   LOGIN
========================================================= */

loginForm.addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    clearMessage();


    const email =
      $("#loginEmail")
        .value
        .trim()
        .toLowerCase();

    const password =
      $("#loginPassword")
        .value;


    if (
      !email ||
      !password
    ) {

      showMessage(
        "Enter your email and password."
      );

      return;
    }


    const button =
      $("#loginButton");


    setButtonLoading(
      button,
      true,
      "Login"
    );


    try {

      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );


      showMessage(
        "Login successful.",
        "success"
      );


      setTimeout(
        () => {

          window.location.href =
            "account.html";

        },
        450
      );


    } catch (error) {

      showMessage(
        getFirebaseError(
          error
        )
      );

      setButtonLoading(
        button,
        false,
        "Login"
      );
    }
  }
);


/* =========================================================
   FORGOT PASSWORD
========================================================= */

$("#forgotPasswordButton")
  .addEventListener(
    "click",
    async () => {

      clearMessage();


      const email =
        $("#loginEmail")
          .value
          .trim()
          .toLowerCase();


      if (!email) {

        showMessage(
          "Enter your email first, then tap Forgot password."
        );

        $("#loginEmail")
          .focus();

        return;
      }


      try {

        await sendPasswordResetEmail(
          auth,
          email
        );


        showMessage(
          "Password reset email has been sent. Check your inbox.",
          "success"
        );


      } catch (error) {

        showMessage(
          getFirebaseError(
            error
          )
        );
      }
    }
  );


/* =========================================================
   BACK BUTTON
========================================================= */

$("#backButton")
  .addEventListener(
    "click",
    () => {

      if (
        document.referrer &&
        document.referrer !==
          location.href
      ) {

        history.back();

      } else {

        location.href =
          "home.html";
      }
    }
  );


/* =========================================================
   ALREADY LOGGED IN
========================================================= */

onAuthStateChanged(
  auth,
  user => {

    /*
       Don't automatically redirect here.

       Otherwise a newly registered user
       may redirect before Firestore profile
       is completely saved.

       Account page will handle logged-in state.
    */

    if (user) {

      console.log(
        "BAZVOR AUTH USER:",
        user.uid
      );
    }
  }
);