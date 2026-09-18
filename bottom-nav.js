"use strict";

/* =========================================================
   BAZVOR — SHARED BOTTOM NAVIGATION
   FINAL FIXED VERSION
========================================================= */

(function () {

  /* =======================================================
     PAGE NAMES
  ======================================================= */

  const PAGES = {

    home: "home.html",

    categories: "category.html",

    message: "message.html",

    cart: "cart.html",

    account: "account.html"

  };


  /* =======================================================
     CURRENT PAGE
  ======================================================= */

  const currentPage =
    (
      window.location.pathname
        .split("/")
        .pop() || PAGES.home
    ).toLowerCase();


  /* =======================================================
     NAVIGATION HTML
  ======================================================= */

  const navigationHTML = `

    <nav
      class="bottom-navigation"
      aria-label="Main navigation"
    >


      <!-- HOME -->

      <a
        href="${PAGES.home}"
        class="bottom-nav-item"
        data-page="${PAGES.home}"
        aria-label="Home"
      >

        <i class="fa-solid fa-house"></i>

        <span>
          Home
        </span>

      </a>


      <!-- CATEGORIES -->

      <a
        href="${PAGES.categories}"
        class="bottom-nav-item"
        data-page="${PAGES.categories}"
        aria-label="Categories"
      >

        <i class="fa-solid fa-table-cells-large"></i>

        <span>
          Categories
        </span>

      </a>


      <!-- MESSAGE -->

      <a
        href="${PAGES.message}"
        class="bottom-nav-item"
        data-page="${PAGES.message}"
        aria-label="Message"
      >

        <i class="fa-regular fa-message"></i>

        <span>
          Message
        </span>

      </a>


      <!-- CART -->

      <a
        href="${PAGES.cart}"
        class="bottom-nav-item"
        data-page="${PAGES.cart}"
        aria-label="Cart"
      >

        <span class="bottom-cart-icon">

          <i class="fa-solid fa-cart-shopping"></i>

          <b
            class="cart-badge"
            id="cartBadge"
          >
            0
          </b>

        </span>

        <span>
          Cart
        </span>

      </a>


      <!-- ACCOUNT -->

      <a
        href="${PAGES.account}"
        class="bottom-nav-item"
        data-page="${PAGES.account}"
        aria-label="Account"
      >

        <i class="fa-regular fa-user"></i>

        <span>
          Account
        </span>

      </a>


    </nav>

  `;


  /* =======================================================
     INSERT NAVIGATION
  ======================================================= */

  function insertNavigation() {

    if (!document.body) return;


    const existing =
      document.querySelector(
        ".bottom-navigation"
      );


    if (existing) {

      existing.remove();

    }


    document.body.insertAdjacentHTML(
      "beforeend",
      navigationHTML
    );

  }


  /* =======================================================
     ACTIVE PAGE
  ======================================================= */

  function setActivePage() {

    const navItems =
      document.querySelectorAll(
        ".bottom-nav-item"
      );


    navItems.forEach(item => {

      const page =
        (
          item.dataset.page || ""
        )
          .split("/")
          .pop()
          .toLowerCase();


      if (page === currentPage) {

        item.classList.add("active");

        item.setAttribute(
          "aria-current",
          "page"
        );

      } else {

        item.classList.remove("active");

        item.removeAttribute(
          "aria-current"
        );

      }

    });

  }


  /* =======================================================
     NAVIGATION CLICK
  ======================================================= */

  function setupNavigation() {

    const navItems =
      document.querySelectorAll(
        ".bottom-nav-item"
      );


    navItems.forEach(item => {

      item.addEventListener(
        "click",
        function (event) {

          event.preventDefault();


          const page =
            this.dataset.page;


          if (!page) return;


          /*
             Build the URL relative to
             the CURRENT HTML file.

             Example:

             /bazvor/home.html
             +
             catagory.html

             becomes:

             /bazvor/catagory.html
          */

          const target =
            new URL(
              page,
              window.location.href
            );


          const targetFile =
            target.pathname
              .split("/")
              .pop()
              .toLowerCase();


          /*
             Don't reload the same page.
          */

          if (
            targetFile === currentPage &&
            target.search ===
              window.location.search
          ) {

            return;

          }


          window.location.assign(
            target.href
          );

        }
      );

    });

  }


  /* =======================================================
     CART BADGE
  ======================================================= */

  function updateSharedCartBadge() {

    const badge =
      document.getElementById(
        "cartBadge"
      );


    if (!badge) return;


    let cart = [];


    try {

      const savedCart =
        localStorage.getItem(
          "bazvorCart"
        );


      if (savedCart) {

        const parsed =
          JSON.parse(savedCart);


        if (Array.isArray(parsed)) {

          cart = parsed;

        }

      }

    } catch (error) {

      cart = [];

    }


    let count = 0;


    cart.forEach(item => {

      if (!item) return;


      const quantity =
        Number(item.quantity);


      if (
        Number.isFinite(quantity) &&
        quantity > 0
      ) {

        count += quantity;

      } else {

        count += 1;

      }

    });


    badge.textContent =
      count > 99
        ? "99+"
        : String(count);


    if (count <= 0) {

      badge.style.display =
        "none";

    } else {

      badge.style.display =
        "flex";

    }

  }


  /* =======================================================
     CART EVENTS
  ======================================================= */

  window.addEventListener(
    "storage",
    function (event) {

      if (
        event.key === "bazvorCart" ||
        event.key === null
      ) {

        updateSharedCartBadge();

      }

    }
  );


  window.addEventListener(
    "bazvorCartUpdated",
    function () {

      updateSharedCartBadge();

    }
  );


  /* =======================================================
     INITIALIZE
  ======================================================= */

  function initBottomNavigation() {

    insertNavigation();

    setActivePage();

    setupNavigation();

    updateSharedCartBadge();

  }


  /* =======================================================
     START
  ======================================================= */

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      initBottomNavigation
    );

  } else {

    initBottomNavigation();

  }

})();