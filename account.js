"use strict";

/* =========================================================
   BAZVOR — PREMIUM ACCOUNT V2
========================================================= */

import {
  initializeApp
} from
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";


import {
  getAuth,
  onAuthStateChanged,
  signOut
} from
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";


import {
  getFirestore,
  doc,
  getDoc,
  collection,
  query,
  where,
  onSnapshot
} from
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


/* =========================================================
   FIREBASE
========================================================= */

const firebaseConfig = {

  apiKey:
    "AIzaSyCc1q9_taS8b-T3FxQmQ12BajjBgvtcmyM",

  authDomain:
    "bazvor-da3c4.firebaseapp.com",

  projectId:
    "bazvor-da3c4",

  storageBucket:
    "bazvor-da3c4.firebasestorage.app",

  messagingSenderId:
    "59852021286",

  appId:
    "1:59852021286:web:b6ad6eba476f853b1710e7",

  measurementId:
    "G-L6JFCT5RDD"
};


const app =
  initializeApp(firebaseConfig);


const auth =
  getAuth(app);


const db =
  getFirestore(app);


/* =========================================================
   HELPERS
========================================================= */

const $ = selector =>
  document.querySelector(selector);


const $$ = selector =>
  document.querySelectorAll(selector);


function go(page) {

  if (!page) return;

  window.location.href =
    page;
}


/* =========================================================
   STATE
========================================================= */

let currentUser = null;

let unsubscribeOrders = null;


/* =========================================================
   ELEMENTS
========================================================= */

const headerProfile =
  $("#headerProfile");


const profileDropdown =
  $("#profileDropdown");


const headerProfileName =
  $("#headerProfileName");


const headerProfileSub =
  $("#headerProfileSub");


const loggedInProfile =
  $("#loggedInProfile");


const guestProfile =
  $("#guestProfile");


const profileName =
  $("#profileName");


const profileEmail =
  $("#profileEmail");


const profilePhone =
  $("#profilePhone");


const profileInitial =
  $("#profileInitial");


const profileImage =
  $("#profileImage");


const dropdownAvatar =
  $("#dropdownAvatar");


const accountActionText =
  $("#accountActionText");


const accountActionIcon =
  $("#accountActionIcon");


/* =========================================================
   PROFILE DROPDOWN
========================================================= */

function closeProfileDropdown() {

  if (!profileDropdown) return;


  profileDropdown.hidden =
    true;


  headerProfile?.classList.remove(
    "active"
  );


  headerProfile?.setAttribute(
    "aria-expanded",
    "false"
  );
}


function toggleProfileDropdown() {

  if (!profileDropdown) return;


  const shouldOpen =
    profileDropdown.hidden;


  profileDropdown.hidden =
    !shouldOpen;


  headerProfile?.classList.toggle(
    "active",
    shouldOpen
  );


  headerProfile?.setAttribute(
    "aria-expanded",
    String(shouldOpen)
  );
}


headerProfile?.addEventListener(
  "click",
  event => {

    event.stopPropagation();

    toggleProfileDropdown();

  }
);


profileDropdown?.addEventListener(
  "click",
  event => {

    /*
      Prevent document click from closing
      while interacting with dropdown.
    */

    event.stopPropagation();

  }
);


document.addEventListener(
  "click",
  () => {

    closeProfileDropdown();

  }
);


document.addEventListener(
  "keydown",
  event => {

    if (
      event.key ===
      "Escape"
    ) {

      closeProfileDropdown();
    }

  }
);


/* =========================================================
   WISHLIST
========================================================= */

function updateWishlist() {

  let wishlist = [];


  try {

    const saved =
      localStorage.getItem(
        "bazvor_wishlist"
      );


    const parsed =
      JSON.parse(
        saved || "[]"
      );


    if (
      Array.isArray(parsed)
    ) {

      wishlist =
        parsed;
    }

  } catch (error) {

    wishlist = [];
  }


  const count =
    $("#wishlistCount");


  if (count) {

    count.textContent =
      wishlist.length > 99
        ? "99+"
        : String(
            wishlist.length
          );
  }

}


/* =========================================================
   STOP ORDER LISTENER
========================================================= */

function stopOrderListener() {

  if (
    typeof unsubscribeOrders ===
    "function"
  ) {

    unsubscribeOrders();

    unsubscribeOrders =
      null;
  }

}


/* =========================================================
   GUEST
========================================================= */

function renderGuest() {

  currentUser =
    null;


  stopOrderListener();


  /*
    Header
  */

  headerProfileName.textContent =
    "Account";


  headerProfileSub.textContent =
    "Login or create account";


  /*
    Avatar
  */

  profileImage.hidden =
    true;


  profileImage.removeAttribute(
    "src"
  );


  profileInitial.innerHTML =
    `<i class="fa-regular fa-user"></i>`;


  /*
    Dropdown
  */

  loggedInProfile.hidden =
    true;


  guestProfile.hidden =
    false;


  if (dropdownAvatar) {

    dropdownAvatar.textContent =
      "B";
  }


  /*
    Bottom account action
  */

  accountActionText.textContent =
    "Login / Sign Up";


  accountActionIcon.className =
    "fa-solid fa-arrow-right-to-bracket";


  /*
    Counters
  */

  const ordersCount =
    $("#ordersCount");


  const reviewsCount =
    $("#reviewsCount");


  const couponsCount =
    $("#couponsCount");


  if (ordersCount) {
    ordersCount.textContent = "0";
  }


  if (reviewsCount) {
    reviewsCount.textContent = "0";
  }


  if (couponsCount) {
    couponsCount.textContent = "0";
  }


  updateWishlist();

}


/* =========================================================
   LOGGED IN USER
========================================================= */

async function renderUser(user) {

  currentUser =
    user;


  let profile = {};


  /*
    Read Firestore profile
  */

  try {

    const snapshot =
      await getDoc(
        doc(
          db,
          "users",
          user.uid
        )
      );


    if (
      snapshot.exists()
    ) {

      profile =
        snapshot.data() || {};
    }

  } catch (error) {

    console.warn(
      "BAZVOR PROFILE LOAD ERROR:",
      error
    );

  }


  /*
    Profile values
  */

  const name =
    profile.fullName ||
    profile.displayName ||
    user.displayName ||
    "Bazvor User";


  const email =
    profile.email ||
    user.email ||
    "No email added";


  const phone =
    profile.phone ||
    user.phoneNumber ||
    "Add mobile number";


  const photo =
    profile.photoURL ||
    user.photoURL ||
    "";


  const initial =
    String(name)
      .trim()
      .charAt(0)
      .toUpperCase() ||
    "B";


  /*
    Header info
  */

  headerProfileName.textContent =
    name;


  headerProfileSub.textContent =
    email;


  /*
    Dropdown info
  */

  profileName.textContent =
    name;


  profileEmail.textContent =
    email;


  profilePhone.textContent =
    phone;


  dropdownAvatar.textContent =
    initial;


  /*
    Main avatar
  */

  profileInitial.textContent =
    initial;


  if (photo) {

    profileImage.src =
      photo;


    profileImage.hidden =
      false;


    profileImage.onerror =
      () => {

        profileImage.hidden =
          true;

      };

  } else {

    profileImage.hidden =
      true;

  }


  /*
    Show correct dropdown
  */

  guestProfile.hidden =
    true;


  loggedInProfile.hidden =
    false;


  /*
    Logout button
  */

  accountActionText.textContent =
    "Logout";


  accountActionIcon.className =
    "fa-solid fa-arrow-right-from-bracket";


  updateWishlist();


  listenForOrders(
    user
  );

}


/* =========================================================
   PROTECTED NAVIGATION
========================================================= */

function protectedGo(page) {

  if (!page) return;


  if (!currentUser) {

    go(
      `auth.html?redirect=${
        encodeURIComponent(page)
      }`
    );

    return;
  }


  go(page);

}


/* =========================================================
   PROTECTED BUTTONS
========================================================= */

$$("[data-protected-link]")
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        protectedGo(
          button.dataset
            .protectedLink
        );

      }
    );

  });


/* =========================================================
   PUBLIC LINKS
========================================================= */

$$("[data-link]")
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        go(
          button.dataset.link
        );

      }
    );

  });


/* =========================================================
   LOGIN FROM PROFILE DROPDOWN
========================================================= */

$("#loginProfileBtn")
  ?.addEventListener(
    "click",
    () => {

      closeProfileDropdown();


      go(
        "auth.html?redirect=account.html"
      );

    }
  );


/* =========================================================
   EDIT PROFILE
========================================================= */

$("#editProfileBtn")
  ?.addEventListener(
    "click",
    () => {

      closeProfileDropdown();


      protectedGo(
        "edit-profile.html"
      );

    }
  );


/* =========================================================
   SETTINGS
========================================================= */

$("#headerSettings")
  ?.addEventListener(
    "click",
    event => {

      event.stopPropagation();


      closeProfileDropdown();


      protectedGo(
        "settings.html"
      );

    }
  );


/* =========================================================
   TRACK ORDER
========================================================= */

$("#trackOrder")
  ?.addEventListener(
    "click",
    () => {

      protectedGo(
        "orders.html?track=1"
      );

    }
  );


/* =========================================================
   SELLER
========================================================= */

$("#sellerButton")
  ?.addEventListener(
    "click",
    () => {

      protectedGo(
        "seller-register.html"
      );

    }
  );


/* =========================================================
   ORDERS
========================================================= */

function listenForOrders(user) {

  stopOrderListener();


  try {

    const orderQuery =
      query(
        collection(
          db,
          "orders"
        ),

        where(
          "userId",
          "==",
          user.uid
        )
      );


    unsubscribeOrders =
      onSnapshot(

        orderQuery,

        snapshot => {

          /*
            Total orders
          */

          const ordersCount =
            $("#ordersCount");


          if (ordersCount) {

            ordersCount.textContent =
              snapshot.size > 99
                ? "99+"
                : String(
                    snapshot.size
                  );
          }


          /*
            Orders waiting for review
          */

          let reviewCount =
            0;


          snapshot.forEach(
            item => {

              const order =
                item.data() || {};


              const status =
                String(
                  order.status || ""
                )
                .trim()
                .toLowerCase();


              if (
                status === "delivered" &&
                order.reviewed !== true
              ) {

                reviewCount++;

              }

            }
          );


          const reviewsCount =
            $("#reviewsCount");


          if (reviewsCount) {

            reviewsCount.textContent =
              reviewCount > 99
                ? "99+"
                : String(
                    reviewCount
                  );

          }

        },


        error => {

          console.warn(
            "BAZVOR ORDER COUNT ERROR:",
            error
          );


          const ordersCount =
            $("#ordersCount");


          const reviewsCount =
            $("#reviewsCount");


          if (ordersCount) {
            ordersCount.textContent = "0";
          }


          if (reviewsCount) {
            reviewsCount.textContent = "0";
          }

        }

      );

  } catch (error) {

    console.warn(
      "BAZVOR ORDER LISTENER ERROR:",
      error
    );

  }

}


/* =========================================================
   ACCOUNT ACTION
   GUEST -> LOGIN
   USER  -> LOGOUT
========================================================= */

$("#accountActionButton")
  ?.addEventListener(
    "click",
    async () => {

      /*
        Guest
      */

      if (!currentUser) {

        go(
          "auth.html?redirect=account.html"
        );

        return;
      }


      /*
        Logged in
      */

      const button =
        $("#accountActionButton");


      button.disabled =
        true;


      accountActionIcon.className =
        "fa-solid fa-spinner fa-spin";


      accountActionText.textContent =
        "Logging out...";


      try {

        await signOut(auth);


        /*
          No redirect required.

          onAuthStateChanged will
          call renderGuest().
        */

      } catch (error) {

        console.error(
          "BAZVOR LOGOUT ERROR:",
          error
        );


        accountActionIcon.className =
          "fa-solid fa-arrow-right-from-bracket";


        accountActionText.textContent =
          "Logout";

      } finally {

        button.disabled =
          false;

      }

    }
  );


/* =========================================================
   AUTH STATE
========================================================= */

onAuthStateChanged(
  auth,

  async user => {

    closeProfileDropdown();


    if (user) {

      await renderUser(
        user
      );

    } else {

      renderGuest();

    }

  }
);


/* =========================================================
   STORAGE UPDATE
========================================================= */

window.addEventListener(
  "storage",
  event => {

    if (
      event.key ===
      "bazvor_wishlist"
    ) {

      updateWishlist();

    }

  }
);


/* =========================================================
   PAGE FOCUS
========================================================= */

window.addEventListener(
  "focus",
  () => {

    updateWishlist();

  }
);


/* =========================================================
   INITIAL
========================================================= */

updateWishlist();