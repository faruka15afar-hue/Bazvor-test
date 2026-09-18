"use strict";

/* =========================================================
   BAZVOR HOME.JS — FINAL COMPLETE REPLACEMENT
   ---------------------------------------------------------
   Firebase
   Products
   Search
   Categories
   Wishlist
   Flash Sell
   Quick Actions
   Mini Banner
   Mini Options
   Background Slider
   Auth
   Dynamic Background
========================================================= */

import { initializeApp } from
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getFirestore,
  collection,
  onSnapshot
} from
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  getAuth,
  onAuthStateChanged
} from
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";


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

let app = null;
let db = null;
let auth = null;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);

  console.log("BAZVOR FIREBASE INITIALIZED");
} catch (error) {
  console.error("BAZVOR FIREBASE INIT ERROR:", error);
}


/* =========================================================
   HELPERS
========================================================= */

const $ = selector =>
  document.querySelector(selector);

const $$ = selector =>
  document.querySelectorAll(selector);

const esc = value =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const num = value => {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return 0;
  }

  const n = Number(value);

  return Number.isFinite(n) ? n : 0;
};

const norm = value =>
  String(value ?? "")
    .trim()
    .toLowerCase();


const hiddenStatuses = [
  "draft",
  "deleted",
  "inactive",
  "disabled",
  "archived",
  "unpublished",
  "hidden"
];


function activeStatus(item = {}) {

  if (
    item.active === false ||
    item.isActive === false
  ) {
    return false;
  }

  const status =
    norm(item.status || "active");

  return !hiddenStatuses.includes(status);
}


function timestamp(item = {}) {

  const values = [
    item.createdAt,
    item.updatedAt,
    item.timestamp,
    item.createdDate
  ];

  for (const value of values) {

    if (value?.toMillis) {
      return value.toMillis();
    }

    if (
      typeof value?.seconds === "number"
    ) {
      return value.seconds * 1000;
    }

    if (typeof value === "string") {

      const date =
        Date.parse(value);

      if (Number.isFinite(date)) {
        return date;
      }
    }
  }

  return 0;
}


function scrollToProducts() {

  $(".all-products-section")?.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}


/* =========================================================
   ELEMENTS
========================================================= */

const searchInput =
  $("#searchInput");

const categoryButtons =
  $$(".top-category");

const promoSlider =
  $("#promoSlider");

const productGrid =
  $("#productGrid");

const flashProducts =
  $("#flashProducts");

const backgroundLayerA =
  $("#backgroundLayerA");

const backgroundLayerB =
  $("#backgroundLayerB");

const homeQuickActions =
  $("#homeQuickActions");

const quickCardLoading =
  $("#quickCardLoading");

const miniPromoBanner =
  $("#miniPromoBanner");

const miniOptionsContainer =
  $("#miniDiscoveryScroll");


/* =========================================================
   STATE
========================================================= */

let allProducts = [];

let currentCategory = "All";

let currentSearch = "";

let visibleProductCount = 20;


/* =========================================================
   WISHLIST
========================================================= */

let wishlistItems = [];

try {

  wishlistItems =
    JSON.parse(
      localStorage.getItem(
        "bazvor_wishlist"
      ) || "[]"
    );

  if (!Array.isArray(wishlistItems)) {
    wishlistItems = [];
  }

} catch {

  wishlistItems = [];
}


/* =========================================================
   QUICK ACTIONS
========================================================= */

let homeCards = [];


/* =========================================================
   BACKGROUND
========================================================= */

let backgroundItems = [];

let backgroundIndex = 0;

let backgroundTimer = null;

let activeBackgroundLayer = "A";

let backgroundTouchStartX = 0;


/* =========================================================
   MINI BANNERS
========================================================= */

let miniBanners = [];

let currentMiniBannerIndex = 0;

let miniBannerTimer = null;

let miniBannerTouchStartX = 0;


/* =========================================================
   MINI OPTIONS
========================================================= */

let miniOptions = [];


/* =========================================================
   PRODUCT HELPERS
========================================================= */

function productName(p) {

  return (
    p.productName ||
    p.name ||
    p.title ||
    "Unnamed Product"
  );
}


function productImage(p) {

  const direct = [
    p.mainImage,
    p.mainImageUrl,
    p.imageUrl,
    p.imageURL,
    p.image,
    p.photo,
    p.thumbnail
  ];

  for (const value of direct) {

    if (
      typeof value === "string" &&
      value.trim()
    ) {
      return value.trim();
    }
  }


  const arrays = [
    p.images,
    p.imageUrls,
    p.imageURLs,
    p.photos,
    p.mediaUrls,
    p.media
  ];

  for (const list of arrays) {

    if (!Array.isArray(list)) {
      continue;
    }

    for (const item of list) {

      if (
        typeof item === "string" &&
        item.trim()
      ) {
        return item.trim();
      }

      if (
        item &&
        typeof item === "object"
      ) {

        const url =
          item.url ||
          item.downloadURL ||
          item.imageUrl ||
          item.imageURL;

        if (
          typeof url === "string" &&
          url.trim()
        ) {
          return url.trim();
        }
      }
    }
  }

  return "";
}


function productPrice(p) {

  for (const value of [
    p.salePrice,
    p.discountPrice,
    p.price,
    p.sellingPrice,
    p.currentPrice,
    p.wholesalePrice
  ]) {

    const n = num(value);

    if (n > 0) {
      return n;
    }
  }

  return 0;
}


function oldPrice(p) {

  for (const value of [
    p.oldPrice,
    p.regularPrice,
    p.originalPrice,
    p.mrp,
    p.previousPrice
  ]) {

    const n = num(value);

    if (n > 0) {
      return n;
    }
  }

  return 0;
}


function discount(p) {

  const price =
    productPrice(p);

  const old =
    oldPrice(p);

  if (
    old > price &&
    price > 0
  ) {

    return Math.round(
      ((old - price) / old) * 100
    );
  }

  return num(
    p.discountPercentage ??
    p.discount ??
    0
  );
}


function isFlash(p) {

  const values = [
    p.productType,
    p.type
  ].map(norm);

  return (
    values.includes("flash sell") ||
    values.includes("flash sale") ||
    values.includes("flash") ||
    p.flashSale === true ||
    p.flashSell === true ||
    p.isFlashSale === true ||
    p.isFlashSell === true
  );
}


function visible(p) {
  return activeStatus(p);
}


function verified(p) {

  return (
    p.verified === true ||
    p.isVerified === true ||
    p.bazvorVerified === true ||
    p.statusVerified === true
  );
}


function rating(p) {

  return Math.max(
    0,
    Math.min(
      5,
      num(
        p.rating ??
        p.averageRating ??
        p.avgRating ??
        p.reviewRating ??
        0
      )
    )
  );
}


function reviews(p) {

  const count =
    num(
      p.reviewCount ??
      p.reviewsCount ??
      p.totalReviews ??
      0
    );

  if (count > 0) {
    return count;
  }

  return Array.isArray(p.reviews)
    ? p.reviews.length
    : 0;
}


function freeDelivery(p) {

  if (
    p.freeDelivery === true ||
    norm(p.freeDelivery) === "true"
  ) {
    return true;
  }

  return [
    p.shippingFee,
    p.deliveryFee,
    p.deliveryCharge
  ].some(
    value =>
      value !== undefined &&
      num(value) === 0
  );
}


function stars(ratingValue) {

  let html = "";

  for (let i = 1; i <= 5; i++) {

    html +=
      ratingValue >= i
        ? `<i class="fa-solid fa-star"></i>`
        : ratingValue >= i - 0.5
          ? `<i class="fa-solid fa-star-half-stroke"></i>`
          : `<i class="fa-regular fa-star"></i>`;
  }

  return html;
}


/* =========================================================
   PRODUCT CARD
========================================================= */

function productCard(p, flash = false) {

  const image =
    productImage(p);

  const name =
    productName(p);

  const price =
    productPrice(p);

  const old =
    oldPrice(p);

  const disc =
    discount(p);

  const wished =
    wishlistItems.includes(
      String(p.id)
    );

  const free =
    freeDelivery(p);


  if (flash) {

    return `
      <article
        class="flash-product-card"
        data-product-id="${esc(p.id)}"
      >

        <div class="flash-image-wrap">

          ${
            image
              ? `
                <img
                  src="${esc(image)}"
                  alt="${esc(name)}"
                  loading="lazy"
                  onerror="this.style.display='none'"
                >
              `
              : ""
          }

          <div class="card-badges-wrap">

            ${
              disc > 0
                ? `
                  <span class="flash-discount">
                    -${disc}%
                  </span>
                `
                : ""
            }

            ${
              free
                ? `
                  <span class="flash-free-delivery">
                    <i class="fa-solid fa-truck-fast"></i>
                    Free
                  </span>
                `
                : ""
            }

          </div>

          <button
            class="flash-wishlist ${wished ? "active" : ""}"
            data-wishlist="${esc(p.id)}"
            type="button"
          >
            <i class="${
              wished
                ? "fa-solid"
                : "fa-regular"
            } fa-heart"></i>
          </button>

        </div>

        <div class="flash-product-info">

          <h3 class="flash-product-name">
            ${esc(name)}
          </h3>

          <div class="flash-price-row">

            <strong class="flash-price">
              ৳${price.toLocaleString()}
            </strong>

            ${
              old > price
                ? `
                  <del class="flash-old-price">
                    ৳${old.toLocaleString()}
                  </del>
                `
                : ""
            }

          </div>

        </div>

      </article>
    `;
  }


  const r =
    rating(p);

  const reviewCount =
    reviews(p);


  return `
    <article
      class="product-card"
      data-product-id="${esc(p.id)}"
    >

      <div class="product-image-wrap">

        ${
          image
            ? `
              <img
                src="${esc(image)}"
                alt="${esc(name)}"
                class="product-image"
                loading="lazy"
                onerror="this.style.display='none'"
              >
            `
            : `
              <div class="product-no-image">
                <i class="fa-solid fa-image"></i>
              </div>
            `
        }

        <div class="card-badges-wrap">

          ${
            disc > 0
              ? `
                <span class="discount-badge">
                  -${disc}%
                </span>
              `
              : ""
          }

          ${
            free
              ? `
                <span class="free-delivery-badge">
                  <i class="fa-solid fa-truck-fast"></i>
                  Free
                </span>
              `
              : ""
          }

        </div>

        <button
          class="product-wishlist ${wished ? "active" : ""}"
          data-wishlist="${esc(p.id)}"
          type="button"
        >
          <i class="${
            wished
              ? "fa-solid"
              : "fa-regular"
          } fa-heart"></i>
        </button>

      </div>

      <div class="product-info">

        <h3 class="product-name">
          ${esc(name)}
        </h3>

        <div class="product-price-row">

          <strong>
            ৳${price.toLocaleString()}
          </strong>

          ${
            old > price
              ? `
                <del>
                  ৳${old.toLocaleString()}
                </del>
              `
              : ""
          }

        </div>

        <div class="product-bottom">

          <div class="product-rating">

            <span class="rating-stars">
              ${stars(r)}
            </span>

            <span class="rating-value">
              ${r > 0 ? r.toFixed(1) : "0.0"}
            </span>

            ${
              reviewCount > 0
                ? `
                  <span class="review-count">
                    (${reviewCount})
                  </span>
                `
                : ""
            }

          </div>

          ${
            verified(p)
              ? `
                <span class="product-verified">
                  <i class="fa-solid fa-circle-check"></i>
                  Verified
                </span>
              `
              : ""
          }

        </div>

      </div>

    </article>
  `;
}


/* =========================================================
   PRODUCT EVENTS
========================================================= */

function openProduct(id) {

  if (!id) return;

  location.href =
    `product-details.html?id=${
      encodeURIComponent(id)
    }`;
}


function attachProductEvents() {

  $$(".product-card,.flash-product-card")
    .forEach(card => {

      card.onclick = event => {

        if (
          !event.target.closest(
            "[data-wishlist]"
          )
        ) {
          openProduct(
            card.dataset.productId
          );
        }
      };
    });


  $$("[data-wishlist]")
    .forEach(button => {

      button.onclick = event => {

        event.preventDefault();
        event.stopPropagation();

        const id =
          String(
            button.dataset.wishlist || ""
          );

        if (!id) return;

        wishlistItems =
          wishlistItems.includes(id)
            ? wishlistItems.filter(
                item =>
                  String(item) !== id
              )
            : [
                ...wishlistItems,
                id
              ];

        localStorage.setItem(
          "bazvor_wishlist",
          JSON.stringify(
            wishlistItems
          )
        );

        renderProducts();

        renderFlash(
          allProducts
        );
      };
    });
}


/* =========================================================
   PRODUCT FILTER
========================================================= */

function filteredProducts() {

  return allProducts.filter(p => {

    if (
      !visible(p) ||
      isFlash(p)
    ) {
      return false;
    }


    if (
      currentCategory !== "All"
    ) {

      const category =
        norm(p.category);

      const wanted =
        norm(currentCategory);

      if (
        !category.includes(wanted) &&
        !wanted.includes(category)
      ) {
        return false;
      }
    }


    if (currentSearch) {

      const text = (
        productName(p) +
        " " +
        (p.brandName || "") +
        " " +
        (p.category || "") +
        " " +
        (p.shortDescription || "") +
        " " +
        (p.description || "")
      ).toLowerCase();

      if (
        !text.includes(
          currentSearch
        )
      ) {
        return false;
      }
    }

    return true;
  });
}


function renderProducts() {

  if (!productGrid) return;

  const list =
    filteredProducts();

  productGrid.classList.remove(
    "product-loading"
  );


  if (!list.length) {

    productGrid.innerHTML = `
      <div class="empty-state">

        <i
          class="fa-solid fa-box-open"
          style="
            font-size:24px;
            margin-bottom:8px;
            display:block
          "
        ></i>

        No products found

      </div>
    `;

    $("#loadMoreProducts")?.style.setProperty(
      "display",
      "none"
    );

    return;
  }


  const shown =
    list.slice(
      0,
      visibleProductCount
    );


  productGrid.innerHTML =
    shown
      .map(
        product =>
          productCard(product)
      )
      .join("");


  attachProductEvents();


  const loadMore =
    $("#loadMoreProducts");

  if (loadMore) {

    loadMore.style.display =
      shown.length < list.length
        ? "block"
        : "none";
  }
}


function renderTemporary(list) {

  if (!productGrid) return;

  productGrid.classList.remove(
    "product-loading"
  );

  productGrid.innerHTML =
    list.length
      ? list
          .slice(
            0,
            visibleProductCount
          )
          .map(
            product =>
              productCard(product)
          )
          .join("")
      : `
        <div class="empty-state">
          No products available
        </div>
      `;

  attachProductEvents();

  scrollToProducts();
}


function filterByText(text) {

  currentSearch =
    norm(text);

  currentCategory =
    "All";

  if (searchInput) {
    searchInput.value = text;
  }

  categoryButtons.forEach(
    button => {

      button.classList.toggle(
        "active",
        button.dataset.category ===
          "All"
      );
    }
  );

  visibleProductCount = 20;

  renderProducts();

  scrollToProducts();
}


/* =========================================================
   CATEGORY / SEARCH
========================================================= */

categoryButtons.forEach(
  button => {

    button.addEventListener(
      "click",
      () => {

        currentCategory =
          button.dataset.category ||
          "All";

        currentSearch = "";

        visibleProductCount = 20;

        if (searchInput) {
          searchInput.value = "";
        }

        categoryButtons.forEach(
          item =>
            item.classList.toggle(
              "active",
              item === button
            )
        );

        renderProducts();
      }
    );
  }
);


searchInput?.addEventListener(
  "input",
  event => {

    currentSearch =
      norm(event.target.value);

    visibleProductCount = 20;

    renderProducts();
  }
);


$("#loadMoreProducts")
  ?.addEventListener(
    "click",
    () => {

      visibleProductCount += 20;

      renderProducts();
    }
  );


/* =========================================================
   COMMON ACTIONS
========================================================= */

function showAction(type) {

  type = norm(type);


  if (
    [
      "flash",
      "flash-sale",
      "flash sell",
      "flashsale"
    ].includes(type)
  ) {

    $(".flash-sale-section")
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });

    return;
  }


  if (
    [
      "free-delivery",
      "free delivery",
      "freedelivery"
    ].includes(type)
  ) {

    return renderTemporary(
      allProducts.filter(
        product =>
          visible(product) &&
          freeDelivery(product) &&
          !isFlash(product)
      )
    );
  }


  if (
    [
      "new",
      "new-arrivals",
      "new arrivals",
      "newarrivals"
    ].includes(type)
  ) {

    return renderTemporary(
      [...allProducts]
        .filter(
          product =>
            visible(product) &&
            !isFlash(product)
        )
        .sort(
          (a, b) =>
            timestamp(b) -
            timestamp(a)
        )
    );
  }


  if (
    [
      "best-sellers",
      "best sellers",
      "bestsellers"
    ].includes(type)
  ) {

    return renderTemporary(
      [...allProducts]
        .filter(
          product =>
            visible(product) &&
            !isFlash(product)
        )
        .sort(
          (a, b) =>
            reviews(b) -
            reviews(a)
        )
    );
  }


  if (
    [
      "verified",
      "bazvor-verified",
      "authentic",
      "100% authentic"
    ].includes(type)
  ) {

    return renderTemporary(
      allProducts.filter(
        product =>
          visible(product) &&
          verified(product) &&
          !isFlash(product)
      )
    );
  }


  if (type === "beauty") {
    return filterByText("beauty");
  }


  if (type === "fashion") {
    return filterByText("fashion");
  }


  if (
    ["phone", "phones"].includes(type)
  ) {
    return filterByText("phones");
  }


  if (type === "home") {
    return filterByText("home");
  }


  if (
    [
      "lowest",
      "low-price",
      "low price",
      "lowest-price",
      "lowest price"
    ].includes(type)
  ) {

    return renderTemporary(
      [...allProducts]
        .filter(
          product =>
            visible(product) &&
            !isFlash(product) &&
            productPrice(product) > 0
        )
        .sort(
          (a, b) =>
            productPrice(a) -
            productPrice(b)
        )
    );
  }
}


/* =========================================================
   QUICK ACTION CARDS
========================================================= */

const defaultCardTypes = [
  "free-delivery",
  "flash-sale",
  "new-arrivals",
  "best-sellers",
  "authentic",
  "bazvor-verified"
];


function cardTitle(card) {

  return (
    card.title ||
    card.name ||
    card.cardTitle ||
    "Bazvor"
  );
}


function cardImage(card) {

  for (const value of [
    card.imageUrl,
    card.imageURL,
    card.image,
    card.photo,
    card.thumbnail,
    card.bannerUrl,
    card.bannerURL
  ]) {

    if (
      typeof value === "string" &&
      value.trim()
    ) {
      return value.trim();
    }
  }

  return "";
}


function cardType(card) {

  return norm(
    card.type ||
    card.cardType ||
    card.targetType ||
    ""
  );
}


function cardLink(card) {

  return (
    card.link ||
    card.url ||
    card.clickLink ||
    card.targetUrl ||
    ""
  );
}


function cardOrder(card) {

  return num(
    card.displayOrder ??
    card.order ??
    card.position ??
    card.sortOrder ??
    999999
  );
}


function createHomeCard(card) {

  const title =
    cardTitle(card);

  const image =
    cardImage(card);

  return `
    <button
      class="home-quick-action"
      type="button"
      data-card-id="${esc(card.id || "")}"
      data-card-type="${esc(cardType(card))}"
      data-card-link="${esc(cardLink(card))}"
    >

      <span class="quick-action-icon">

        ${
          image
            ? `
              <img
                src="${esc(image)}"
                alt="${esc(title)}"
                loading="lazy"
              >
            `
            : `
              <i class="fa-solid fa-image"></i>
            `
        }

      </span>

      <span class="quick-action-title">
        ${esc(title)}
      </span>

    </button>
  `;
}


function renderHomeCards() {

  if (!homeQuickActions) {
    return;
  }


  quickCardLoading?.remove();


  const sorted =
    [...homeCards].sort(
      (a, b) =>
        cardOrder(a) -
        cardOrder(b) ||
        String(a.id)
          .localeCompare(
            String(b.id)
          )
    );


  const selected = [];

  const used =
    new Set();


  for (
    const type of defaultCardTypes
  ) {

    const item =
      sorted.find(
        card =>
          !used.has(card.id) &&
          cardType(card) === type
      );

    if (item) {

      selected.push(item);

      used.add(item.id);
    }
  }


  for (const item of sorted) {

    if (
      selected.length >= 6
    ) {
      break;
    }

    if (!used.has(item.id)) {

      selected.push(item);

      used.add(item.id);
    }
  }


  homeQuickActions.innerHTML =
    selected.length
      ? selected
          .slice(0, 6)
          .map(createHomeCard)
          .join("")
      : `
        <div class="quick-card-empty">
          No active home cards available.
        </div>
      `;


  $$(".home-quick-action")
    .forEach(button => {

      button.onclick = event => {

        event.preventDefault();

        const link =
          button.dataset.cardLink?.trim();

        const type =
          button.dataset.cardType;


        if (link) {

          location.href = link;

        } else if (type) {

          showAction(type);
        }
      };
    });


  updateBackgroundHeight();
}


function loadHomeCards() {

  if (!db) return;


  onSnapshot(
    collection(
      db,
      "cards"
    ),

    snapshot => {

      homeCards = [];


      snapshot.forEach(
        document => {

          const card = {
            id: document.id,
            ...(document.data() || {})
          };


          if (
            activeStatus(card)
          ) {
            homeCards.push(card);
          }
        }
      );


      renderHomeCards();
    },

    error => {

      console.error(
        "BAZVOR CARDS ERROR:",
        error
      );

      if (homeQuickActions) {

        homeQuickActions.innerHTML =
          `
            <div class="quick-card-error">
              Unable to load home cards.
            </div>
          `;
      }

      updateBackgroundHeight();
    }
  );
}


/* =========================================================
   MINI BANNER
========================================================= */

function miniTimestamp(banner) {

  return timestamp({
    createdAt:
      banner.createdAt
  });
}


function renderMiniBanner() {

  if (!miniPromoBanner) {
    return;
  }


  if (!miniBanners.length) {

    miniPromoBanner.innerHTML =
      `
        <div class="mini-banner-empty">
          <span>No mini banner available</span>
        </div>
      `;

    return;
  }


  const banner =
    miniBanners[
      currentMiniBannerIndex
    ];


  const dots =
    miniBanners.length > 1
      ? `
        <div class="mini-banner-dots">

          ${
            miniBanners
              .map(
                (_, index) =>
                  `
                    <span
                      style="
                        width:${
                          index ===
                          currentMiniBannerIndex
                            ? "16px"
                            : "5px"
                        };
                        height:5px;
                        display:block;
                        border-radius:10px;
                        background:${
                          index ===
                          currentMiniBannerIndex
                            ? "#fff"
                            : "rgba(255,255,255,.55)"
                        };
                      "
                    ></span>
                  `
              )
              .join("")
          }

        </div>
      `
      : "";


  miniPromoBanner.innerHTML =
    `
      <div
        class="bazvor-mini-banner-slide"
        role="button"
        tabindex="0"
      >

        <img
          src="${esc(banner.imageUrl)}"
          alt="Bazvor Mini Banner"
          loading="eager"
          draggable="false"
        >

        ${dots}

      </div>
    `;


  const slide =
    miniPromoBanner.querySelector(
      ".bazvor-mini-banner-slide"
    );


  const open = () => {

    if (!banner.link) {
      return;
    }

    try {

      const url =
        new URL(
          banner.link,
          location.href
        );

      if (
        ["http:", "https:"]
          .includes(
            url.protocol
          )
      ) {

        location.href =
          url.href;
      }

    } catch (error) {

      console.error(
        "MINI BANNER LINK ERROR:",
        error
      );
    }
  };


  slide?.addEventListener(
    "click",
    open
  );


  slide?.addEventListener(
    "keydown",
    event => {

      if (
        event.key === "Enter" ||
        event.key === " "
      ) {

        event.preventDefault();

        open();
      }
    }
  );
}


function startMiniBannerRotation() {

  clearInterval(
    miniBannerTimer
  );


  if (
    miniBanners.length <= 1
  ) {
    return;
  }


  miniBannerTimer =
    setInterval(
      () => {

        currentMiniBannerIndex =
          (
            currentMiniBannerIndex +
            1
          ) %
          miniBanners.length;

        renderMiniBanner();

      },
      5000
    );
}


function loadMiniBanners() {

  if (
    !db ||
    !miniPromoBanner
  ) {
    return;
  }


  miniPromoBanner.innerHTML =
    `
      <div class="mini-banner-empty">
        <span>
          <i class="fa-solid fa-spinner fa-spin"></i>
          Loading...
        </span>
      </div>
    `;


  onSnapshot(
    collection(
      db,
      "miniBanners"
    ),

    snapshot => {

      miniBanners = [];


      snapshot.forEach(
        document => {

          const data =
            document.data() || {};

          const imageUrl =
            String(
              data.imageUrl ||
              data.imageURL ||
              data.bannerUrl ||
              data.bannerURL ||
              data.image ||
              ""
            ).trim();


          if (
            !imageUrl ||
            !activeStatus(data)
          ) {
            return;
          }


          miniBanners.push({

            id:
              document.id,

            imageUrl,

            link:
              String(
                data.link ||
                data.clickLink ||
                data.url ||
                ""
              ).trim(),

            createdAt:
              data.createdAt || null
          });
        }
      );


      miniBanners.sort(
        (a, b) =>
          miniTimestamp(b) -
          miniTimestamp(a)
      );


      currentMiniBannerIndex = 0;

      renderMiniBanner();

      startMiniBannerRotation();

      updateBackgroundHeight();
    },

    error => {

      console.error(
        "MINI BANNER ERROR:",
        error
      );

      clearInterval(
        miniBannerTimer
      );

      miniPromoBanner.innerHTML =
        `
          <div class="mini-banner-empty">
            Unable to load mini banners.
          </div>
        `;
    }
  );
}


/* =========================================================
   MINI BANNER SWIPE
========================================================= */

miniPromoBanner?.addEventListener(
  "touchstart",
  event => {

    miniBannerTouchStartX =
      event.changedTouches[0].screenX;

  },
  {
    passive: true
  }
);


miniPromoBanner?.addEventListener(
  "touchend",
  event => {

    if (
      miniBanners.length <= 1
    ) {
      return;
    }


    const distance =
      miniBannerTouchStartX -
      event.changedTouches[0].screenX;


    if (
      Math.abs(distance) < 40
    ) {
      return;
    }


    currentMiniBannerIndex =
      distance > 0
        ? (
            currentMiniBannerIndex +
            1
          ) %
          miniBanners.length
        : (
            currentMiniBannerIndex -
            1 +
            miniBanners.length
          ) %
          miniBanners.length;


    renderMiniBanner();

    startMiniBannerRotation();

  },
  {
    passive: true
  }
);


/* =========================================================
   MINI OPTIONS — FINAL
========================================================= */

function miniOptionTitle(option) {

  return (
    option.name ||
    option.title ||
    option.optionTitle ||
    "Bazvor"
  );
}


function miniOptionImage(option) {

  const images = [
    option.imageUrl,
    option.imageURL,
    option.image,
    option.photo,
    option.thumbnail,
    option.bannerUrl,
    option.bannerURL
  ];


  for (
    const image of images
  ) {

    if (
      typeof image === "string" &&
      image.trim()
    ) {

      return image.trim();
    }
  }


  return "";
}


function miniOptionLink(option) {

  return String(
    option.link ||
    option.url ||
    option.clickLink ||
    option.targetUrl ||
    ""
  ).trim();
}


function miniOptionRule(option) {

  return norm(
    option.automaticRule ||
    option.rule ||
    option.type ||
    option.optionType ||
    option.targetType ||
    ""
  );
}


function miniOptionOrder(option) {

  return num(
    option.displayOrder ??
    option.order ??
    option.position ??
    option.sortOrder ??
    999999
  );
}


function createMiniOption(option) {

  const title =
    miniOptionTitle(option);

  const image =
    miniOptionImage(option);


  return `
    <button
      type="button"
      class="bazvor-mini-option"
      data-mini-option-id="${esc(option.id)}"
      aria-label="${esc(title)}"
    >

      <span
        class="bazvor-mini-option-image"
      >

        ${
          image
            ? `
              <img
                src="${esc(image)}"
                alt="${esc(title)}"
                loading="lazy"
                draggable="false"
              >
            `
            : `
              <span
                class="bazvor-mini-option-placeholder"
              >
                <i class="fa-solid fa-image"></i>
              </span>
            `
        }

      </span>


      <span
        class="bazvor-mini-option-title"
      >
        ${esc(title)}
      </span>

    </button>
  `;
}


function runMiniOption(option) {

  if (!option) {
    return;
  }


  const link =
    miniOptionLink(option);


  /*
     Link has highest priority.
  */

  if (link) {

    try {

      const url =
        new URL(
          link,
          location.href
        );


      if (
        ["http:", "https:"]
          .includes(
            url.protocol
          )
      ) {

        location.href =
          url.href;

        return;
      }

    } catch (error) {

      console.error(
        "BAZVOR MINI OPTION LINK ERROR:",
        error
      );
    }
  }


  /*
     Automatic action.
  */

  const rule =
    miniOptionRule(option);


  if (rule) {

    showAction(rule);

    return;
  }


  console.log(
    "BAZVOR MINI OPTION CLICK:",
    option
  );
}


function renderMiniOptions() {

  /*
     ALWAYS use the real HTML
     container from your home.html.
  */

  const container =
    document.getElementById(
      "miniDiscoveryScroll"
    );


  if (!container) {

    console.error(
      "BAZVOR MINI OPTION: #miniDiscoveryScroll NOT FOUND."
    );

    return;
  }


  /*
     Remove old content.
  */

  container.innerHTML = "";


  /*
     No options.
  */

  if (!miniOptions.length) {

    container.innerHTML =
      `
        <div
          class="mini-discovery-empty"
        >
          No options available
        </div>
      `;

    updateBackgroundHeight();

    return;
  }


  /*
     Sort.
  */

  const list =
    [...miniOptions]
      .sort(
        (a, b) =>
          miniOptionOrder(a) -
          miniOptionOrder(b) ||
          String(a.id)
            .localeCompare(
              String(b.id)
            )
      )
      .slice(0, 5);


  /*
     Render.
  */

  container.innerHTML =
    list
      .map(createMiniOption)
      .join("");


  /*
     Click handlers.
  */

  container
    .querySelectorAll(
      ".bazvor-mini-option"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        event => {

          event.preventDefault();
          event.stopPropagation();


          const id =
            button.dataset
              .miniOptionId;


          const option =
            miniOptions.find(
              item =>
                String(item.id) ===
                String(id)
            );


          runMiniOption(
            option
          );
        }
      );
    });


  updateBackgroundHeight();


  console.log(
    "BAZVOR MINI OPTIONS RENDERED:",
    list.length
  );
}


function loadMiniOptions() {

  if (!db) {

    console.error(
      "BAZVOR MINI OPTION: FIREBASE DB NOT AVAILABLE."
    );

    return;
  }


  const container =
    document.getElementById(
      "miniDiscoveryScroll"
    );


  if (!container) {

    console.error(
      "BAZVOR MINI OPTION: HTML #miniDiscoveryScroll NOT FOUND."
    );

    return;
  }


  /*
     Initial loading.
  */

  container.innerHTML =
    `
      <div
        class="mini-discovery-loading"
      >

        <div
          class="mini-discovery-spinner"
        ></div>

        <span>
          Loading...
        </span>

      </div>
    `;


  console.log(
    "BAZVOR MINI OPTION: START FIREBASE LISTENER"
  );


  /*
     EXACT COLLECTION NAME:
     miniOption
  */

  onSnapshot(
    collection(
      db,
      "miniOption"
    ),

    snapshot => {

      miniOptions = [];


      console.log(
        "===================================="
      );

      console.log(
        "BAZVOR MINI OPTION SNAPSHOT:",
        snapshot.size
      );


      if (snapshot.empty) {

        console.warn(
          "BAZVOR MINI OPTION: COLLECTION IS EMPTY."
        );
      }


      snapshot.forEach(
        document => {

          const data =
            document.data() || {};


          console.log(
            "MINI OPTION DOCUMENT:",
            document.id,
            data
          );


          const imageUrl =
            String(
              data.imageUrl ||
              data.imageURL ||
              data.image ||
              data.photo ||
              data.thumbnail ||
              data.bannerUrl ||
              data.bannerURL ||
              ""
            ).trim();


          const option = {

            id:
              document.id,

            name:
              String(
                data.name ||
                data.title ||
                data.optionTitle ||
                "Bazvor"
              ).trim(),

            imageUrl,

            link:
              String(
                data.link ||
                data.url ||
                data.clickLink ||
                data.targetUrl ||
                ""
              ).trim(),

            automatic:
              data.automatic === true,

            automaticRule:
              String(
                data.automaticRule ||
                data.rule ||
                data.type ||
                data.optionType ||
                data.targetType ||
                ""
              ).trim(),

            type:
              String(
                data.type ||
                data.optionType ||
                data.targetType ||
                data.automaticRule ||
                ""
              ).trim(),

            displayOrder:
              data.displayOrder ??
              data.order ??
              data.position ??
              data.sortOrder ??
              999999,

            active:
              data.active,

            isActive:
              data.isActive,

            status:
              data.status,

            createdAt:
              data.createdAt || null,

            updatedAt:
              data.updatedAt || null
          };


          if (
            data.active === false ||
            data.isActive === false
          ) {

            console.log(
              "MINI OPTION SKIPPED — INACTIVE:",
              document.id
            );

            return;
          }


          if (
            data.status &&
            hiddenStatuses.includes(
              norm(data.status)
            )
          ) {

            console.log(
              "MINI OPTION SKIPPED — STATUS:",
              document.id,
              data.status
            );

            return;
          }


          miniOptions.push(
            option
          );
        }
      );


      console.log(
        "BAZVOR MINI OPTIONS FINAL:",
        miniOptions
      );


      renderMiniOptions();


      console.log(
        "===================================="
      );
    },


    error => {

      console.error(
        "===================================="
      );

      console.error(
        "BAZVOR MINI OPTION FIREBASE ERROR:",
        error
      );

      console.error(
        "ERROR CODE:",
        error?.code
      );

      console.error(
        "ERROR MESSAGE:",
        error?.message
      );

      console.error(
        "===================================="
      );


      container.innerHTML =
        `
          <div
            class="mini-discovery-empty"
          >
            Unable to load options.
          </div>
        `;


      updateBackgroundHeight();
    }
  );
}


/* =========================================================
   MINI OPTIONS CSS
========================================================= */

(function installMiniOptionsCSS() {

  const old =
    document.getElementById(
      "bazvorFinalMiniOptionsCSS"
    );

  if (old) {
    old.remove();
  }


  const style =
    document.createElement(
      "style"
    );


  style.id =
    "bazvorFinalMiniOptionsCSS";


  style.textContent = `

    #miniDiscoveryScroll{

      width:100%!important;

      display:grid!important;

      grid-template-columns:
        repeat(5,minmax(0,1fr))!important;

      gap:7px!important;

      padding:
        0 3px!important;

      margin:
        5px 0 10px!important;

      box-sizing:border-box!important;

      position:relative!important;

      z-index:30!important;

      overflow:visible!important;
    }


    #miniDiscoveryScroll
    .bazvor-mini-option{

      width:100%!important;

      min-width:0!important;

      height:auto!important;

      min-height:0!important;

      padding:0!important;

      margin:0!important;

      border:0!important;

      outline:none!important;

      background:transparent!important;

      box-shadow:none!important;

      display:flex!important;

      flex-direction:column!important;

      align-items:center!important;

      justify-content:flex-start!important;

      appearance:none!important;

      -webkit-appearance:none!important;

      cursor:pointer!important;

      font-family:inherit!important;

      color:inherit!important;
    }


    #miniDiscoveryScroll
    .bazvor-mini-option-image{

      width:100%!important;

      aspect-ratio:1 / 1!important;

      display:flex!important;

      align-items:center!important;

      justify-content:center!important;

      overflow:hidden!important;

      border-radius:9px!important;

      background:#f6f6f6!important;

      position:relative!important;

      flex:none!important;
    }


    #miniDiscoveryScroll
    .bazvor-mini-option-image img{

      display:block!important;

      width:100%!important;

      height:100%!important;

      object-fit:cover!important;

      object-position:center!important;

      margin:0!important;

      padding:0!important;

      border:0!important;

      outline:none!important;

      box-shadow:none!important;

      user-select:none!important;

      -webkit-user-drag:none!important;
    }


    #miniDiscoveryScroll
    .bazvor-mini-option-placeholder{

      width:100%!important;

      height:100%!important;

      display:flex!important;

      align-items:center!important;

      justify-content:center!important;

      color:#aaa!important;

      font-size:18px!important;
    }


    #miniDiscoveryScroll
    .bazvor-mini-option-title{

      width:100%!important;

      display:block!important;

      margin:
        4px 0 0!important;

      padding:
        0 1px!important;

      text-align:center!important;

      font-size:9px!important;

      line-height:12px!important;

      font-weight:600!important;

      color:#333!important;

      white-space:nowrap!important;

      overflow:hidden!important;

      text-overflow:ellipsis!important;

      box-sizing:border-box!important;
    }


    #miniDiscoveryScroll
    .bazvor-mini-option:active{

      transform:scale(.96)!important;
    }


    #miniDiscoveryScroll
    .mini-discovery-loading{

      grid-column:
        1 / -1!important;

      width:100%!important;

      min-height:55px!important;

      display:flex!important;

      align-items:center!important;

      justify-content:center!important;

      gap:6px!important;

      color:#999!important;

      font-size:10px!important;
    }


    #miniDiscoveryScroll
    .mini-discovery-empty{

      grid-column:
        1 / -1!important;

      width:100%!important;

      min-height:45px!important;

      display:flex!important;

      align-items:center!important;

      justify-content:center!important;

      color:#999!important;

      font-size:10px!important;
    }


    #miniDiscoveryScroll
    .mini-discovery-spinner{

      width:15px!important;

      height:15px!important;

      border:
        2px solid #eee!important;

      border-top-color:
        #e5006d!important;

      border-radius:50%!important;

      animation:
        bazvorMiniOptionSpin
        .7s linear infinite!important;
    }


    @keyframes bazvorMiniOptionSpin{

      to{
        transform:rotate(360deg);
      }

    }


    @media(max-width:600px){

      #miniDiscoveryScroll{

        grid-template-columns:
          repeat(5,minmax(0,1fr))!important;

        gap:6px!important;

        padding:
          0 2px!important;

        margin:
          5px 0 9px!important;
      }


      #miniDiscoveryScroll
      .bazvor-mini-option-image{

        border-radius:8px!important;
      }


      #miniDiscoveryScroll
      .bazvor-mini-option-title{

        font-size:8.5px!important;

        line-height:11px!important;

        margin-top:4px!important;
      }

    }


    @media(max-width:380px){

      #miniDiscoveryScroll{

        gap:5px!important;
      }


      #miniDiscoveryScroll
      .bazvor-mini-option-image{

        border-radius:7px!important;
      }


      #miniDiscoveryScroll
      .bazvor-mini-option-title{

        font-size:8px!important;

        line-height:10px!important;
      }

    }

  `;


  document.head.appendChild(
    style
  );

})();


/* =========================================================
   MAIN BACKGROUND
========================================================= */

function setBackgroundImage(
  url,
  instant = false
) {

  if (
    !url ||
    !backgroundLayerA ||
    !backgroundLayerB
  ) {
    return;
  }


  const next =
    activeBackgroundLayer === "A"
      ? backgroundLayerB
      : backgroundLayerA;


  const old =
    activeBackgroundLayer === "A"
      ? backgroundLayerA
      : backgroundLayerB;


  next.style.backgroundImage =
    `url("${String(url)
      .replace(/"/g, '\\"')}")`;


  next.classList.add(
    "active"
  );


  if (instant) {

    old.classList.remove(
      "active"
    );

  } else {

    requestAnimationFrame(
      () =>
        old.classList.remove(
          "active"
        )
    );
  }


  activeBackgroundLayer =
    activeBackgroundLayer === "A"
      ? "B"
      : "A";
}


function showBackground(index) {

  if (
    !backgroundItems.length
  ) {
    return;
  }


  backgroundIndex =
    (
      index +
      backgroundItems.length
    ) %
    backgroundItems.length;


  setBackgroundImage(
    backgroundItems[
      backgroundIndex
    ].imageUrl
  );
}


function startBackgroundRotation() {

  clearInterval(
    backgroundTimer
  );


  if (
    backgroundItems.length <= 1
  ) {
    return;
  }


  backgroundTimer =
    setInterval(
      () =>
        showBackground(
          backgroundIndex + 1
        ),
      5000
    );
}


function openBackgroundTarget() {

  const banner =
    backgroundItems[
      backgroundIndex
    ];


  if (!banner) {
    return;
  }


  if (banner.clickLink) {

    location.href =
      banner.clickLink;

    return;
  }


  if (
    banner.targetValue &&
    norm(
      banner.targetType ||
      "category"
    ) === "category"
  ) {

    currentSearch = "";

    currentCategory =
      banner.targetValue;


    if (searchInput) {
      searchInput.value = "";
    }


    categoryButtons.forEach(
      button => {

        button.classList.toggle(
          "active",
          norm(
            button.dataset.category
          ) ===
          norm(
            banner.targetValue
          )
        );
      }
    );


    renderProducts();

    scrollToProducts();
  }
}


function loadBanners() {

  if (
    !db ||
    !promoSlider
  ) {
    return;
  }


  onSnapshot(
    collection(
      db,
      "banners"
    ),

    snapshot => {

      backgroundItems = [];


      snapshot.forEach(
        document => {

          const data =
            document.data() || {};


          const imageUrl =
            String(
              data.imageUrl ||
              data.imageURL ||
              data.bannerUrl ||
              data.bannerURL ||
              data.image ||
              data.url ||
              ""
            ).trim();


          if (
            !imageUrl ||
            !activeStatus(data)
          ) {
            return;
          }


          backgroundItems.push({

            id:
              document.id,

            imageUrl,

            clickLink:
              data.clickLink ||
              data.link ||
              data.targetUrl ||
              "",

            targetType:
              data.targetType ||
              "category",

            targetValue:
              data.targetValue ||
              "",

            displayOrder:
              num(
                data.displayOrder
              )
          });
        }
      );


      backgroundItems.sort(
        (a, b) =>
          a.displayOrder -
          b.displayOrder
      );


      backgroundIndex = 0;


      if (
        backgroundItems.length
      ) {

        setBackgroundImage(
          backgroundItems[0]
            .imageUrl,
          true
        );

        startBackgroundRotation();
      }


      updateBackgroundHeight();
    },

    error => {

      console.error(
        "BAZVOR BANNERS ERROR:",
        error
      );
    }
  );
}


/* =========================================================
   BACKGROUND SWIPE
========================================================= */

promoSlider?.addEventListener(
  "touchstart",
  event => {

    backgroundTouchStartX =
      event.changedTouches[0]
        .screenX;

  },
  {
    passive: true
  }
);


promoSlider?.addEventListener(
  "touchend",
  event => {

    const distance =
      backgroundTouchStartX -
      event.changedTouches[0]
        .screenX;


    if (
      Math.abs(distance) < 50
    ) {
      return;
    }


    showBackground(
      backgroundIndex +
      (
        distance > 0
          ? 1
          : -1
      )
    );


    startBackgroundRotation();

  },
  {
    passive: true
  }
);


promoSlider?.addEventListener(
  "click",
  openBackgroundTarget
);


/* =========================================================
   PRODUCTS
========================================================= */

function loadProducts() {

  if (!db) {

    showFirebaseError(
      "Firebase could not be initialized."
    );

    return;
  }


  onSnapshot(
    collection(
      db,
      "products"
    ),

    snapshot => {

      allProducts = [];


      snapshot.forEach(
        document => {

          allProducts.push({

            id:
              document.id,

            ...(document.data() || {})
          });
        }
      );


      allProducts.sort(
        (a, b) =>
          timestamp(b) -
          timestamp(a)
      );


      visibleProductCount = 20;

      renderProducts();

      renderFlash(
        allProducts
      );
    },

    error => {

      console.error(
        "PRODUCTS ERROR:",
        error
      );

      showFirebaseError(
        firebaseError(error)
      );
    }
  );
}


function renderFlash(products) {

  if (!flashProducts) {
    return;
  }


  const flash =
    products.filter(
      product =>
        visible(product) &&
        isFlash(product)
    );


  flashProducts.classList.remove(
    "flash-loading"
  );


  flashProducts.innerHTML =
    flash.length
      ? flash
          .slice(0, 15)
          .map(
            product =>
              productCard(
                product,
                true
              )
          )
          .join("")
      : `
        <div
          style="
            width:100%;
            padding:18px 8px;
            text-align:center;
            color:rgba(255,255,255,.75);
            font-size:10px
          "
        >
          No Flash Sell products available
        </div>
      `;


  attachProductEvents();
}


/* =========================================================
   FIREBASE ERROR
========================================================= */

function firebaseError(error) {

  if (!error) {
    return "Unable to load products.";
  }


  if (
    error.code ===
    "permission-denied"
  ) {

    return (
      "Firestore permission denied. " +
      "Check your Firestore security rules."
    );
  }


  if (
    error.code ===
    "failed-precondition"
  ) {

    return (
      "Firestore configuration problem."
    );
  }


  if (
    error.code ===
    "unavailable"
  ) {

    return (
      "Firebase is temporarily unavailable."
    );
  }


  return (
    "Unable to load products from Firebase."
  );
}


function showFirebaseError(
  message
) {

  if (productGrid) {

    productGrid.classList.remove(
      "product-loading"
    );


    productGrid.innerHTML =
      `
        <div class="firebase-error">

          <i
            class="fa-solid fa-triangle-exclamation"
            style="
              font-size:22px;
              display:block;
              margin-bottom:8px
            "
          ></i>

          ${esc(message)}

        </div>
      `;
  }


  if (flashProducts) {

    flashProducts.classList.remove(
      "flash-loading"
    );

    flashProducts.innerHTML = "";
  }
}


/* =========================================================
   FLASH TIMER
========================================================= */

let flashSeconds =
  8 * 3600;


function updateFlashTimer() {

  const hours =
    Math.floor(
      flashSeconds / 3600
    );

  const minutes =
    Math.floor(
      (flashSeconds % 3600) /
      60
    );

  const seconds =
    flashSeconds % 60;


  const hour =
    $("#flashHours");

  const minute =
    $("#flashMinutes");

  const second =
    $("#flashSeconds");


  if (hour) {
    hour.textContent =
      String(hours)
        .padStart(2, "0");
  }


  if (minute) {
    minute.textContent =
      String(minutes)
        .padStart(2, "0");
  }


  if (second) {
    second.textContent =
      String(seconds)
        .padStart(2, "0");
  }


  flashSeconds--;


  if (
    flashSeconds < 0
  ) {

    flashSeconds =
      8 * 3600;
  }
}


updateFlashTimer();

setInterval(
  updateFlashTimer,
  1000
);


$("#flashSeeAll")
  ?.addEventListener(
    "click",
    () => {

      $(".flash-sale-section")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
    }
  );


/* =========================================================
   MINI PROMO BUTTON
========================================================= */

$(".mini-promo-button")
  ?.addEventListener(
    "click",
    () => {

      currentCategory =
        "All";

      currentSearch =
        "";


      if (searchInput) {
        searchInput.value = "";
      }


      categoryButtons.forEach(
        button =>
          button.classList.toggle(
            "active",
            button.dataset.category ===
              "All"
          )
      );


      visibleProductCount =
        20;


      renderProducts();

      scrollToProducts();
    }
  );


/* =========================================================
   BOTTOM NAVIGATION
========================================================= */

$$(".bottom-nav-item")
  .forEach(item => {

    item.addEventListener(
      "click",
      event => {

        event.preventDefault();


        if (
          item.dataset.page
        ) {

          location.href =
            item.dataset.page;
        }
      }
    );
  });


/* =========================================================
   AUTH
========================================================= */

if (auth) {

  onAuthStateChanged(
    auth,
    user => {

      console.log(
        user
          ? "BAZVOR User logged in"
          : "BAZVOR Guest user"
      );
    }
  );
}


/* =========================================================
   CAMERA
========================================================= */

$("#cameraButton")
  ?.addEventListener(
    "click",
    () => {

      console.log(
        "BAZVOR Visual Search clicked"
      );
    }
  );


/* =========================================================
   MINI BANNER CSS
========================================================= */

(function miniBannerCSS() {

  if (
    $("#bazvorMiniBannerFixedCSS")
  ) {
    return;
  }


  const style =
    document.createElement(
      "style"
    );


  style.id =
    "bazvorMiniBannerFixedCSS";


  style.textContent = `

    #miniPromoBanner{
      width:100%;
      height:100px;
      min-height:100px;
      max-height:100px;
      position:relative;
      overflow:hidden;
      border-radius:12px;
      margin:6px 0 4px;
      padding:0;
      background:transparent;
      box-sizing:border-box;
      isolation:isolate;
      touch-action:pan-y;
      line-height:0;
      border:0;
      box-shadow:none;
    }


    #miniPromoBanner
    .bazvor-mini-banner-slide{
      position:relative;
      width:100%;
      height:100%;
      overflow:hidden;
      border-radius:inherit;
      cursor:pointer;
      background:transparent;
      box-sizing:border-box;
      margin:0;
      padding:0;
      border:0;
    }


    #miniPromoBanner img{
      display:block;
      width:100%;
      height:100%;
      object-fit:cover;
      object-position:center;
      border:0;
      outline:0;
      margin:0;
      padding:0;
      user-select:none;
      -webkit-user-drag:none;
      box-shadow:none!important;
    }


    #miniPromoBanner::before,
    #miniPromoBanner::after,
    #miniPromoBanner
    .bazvor-mini-banner-slide::before{
      content:none!important;
      display:none!important;
    }


    #miniPromoBanner
    .bazvor-mini-banner-slide::after{
      content:"";
      position:absolute;
      inset:0;
      pointer-events:none;
      background:linear-gradient(
        180deg,
        rgba(0,0,0,0),
        rgba(0,0,0,.04)
      );
      z-index:1;
    }


    #miniPromoBanner
    .mini-banner-dots{
      position:absolute;
      left:50%;
      bottom:5px;
      transform:translateX(-50%);
      display:flex;
      align-items:center;
      gap:4px;
      padding:3px 6px;
      border-radius:20px;
      background:rgba(0,0,0,.2);
      backdrop-filter:blur(4px);
      z-index:4;
      pointer-events:none;
    }


    #miniPromoBanner
    .mini-banner-empty{
      width:100%;
      height:100%;
      display:flex;
      align-items:center;
      justify-content:center;
      border-radius:inherit;
      color:#999;
      font-size:12px;
      background:#f7f7f7;
      box-sizing:border-box;
    }


    @media(max-width:600px){

      #miniPromoBanner{
        height:88px;
        min-height:88px;
        max-height:88px;
        border-radius:10px;
        margin:5px 0 3px;
      }

    }


    @media(max-width:380px){

      #miniPromoBanner{
        height:82px;
        min-height:82px;
        max-height:82px;
        border-radius:9px;
      }

    }

  `;


  document.head.appendChild(
    style
  );

})();


/* =========================================================
   DYNAMIC BACKGROUND HEIGHT
========================================================= */

function updateBackgroundHeight() {

  const system =
    $(".home-background-system");

  const quick =
    $("#homeQuickActions");


  if (
    !system ||
    !quick
  ) {
    return;
  }


  Object.assign(
    system.style,
    {
      position: "fixed",
      top: "0",
      left: "0",
      right: "0",
      width: "100%",
      pointerEvents: "none",
      overflow: "hidden"
    }
  );


  const height =
    Math.max(
      0,
      Math.round(
        quick.getBoundingClientRect()
          .bottom + 2
      )
    );


  if (!height) {
    return;
  }


  system.style.height =
    `${height}px`;

  system.style.minHeight =
    `${height}px`;

  system.style.maxHeight =
    `${height}px`;


  [
    backgroundLayerA,
    backgroundLayerB
  ]
    .forEach(layer => {

      if (!layer) {
        return;
      }


      Object.assign(
        layer.style,
        {
          position: "absolute",
          top: "0",
          left: "0",
          right: "0",
          width: "100%",
          height: "100%",
          maxHeight: "100%",
          pointerEvents: "none"
        }
      );
    });


  quick.style.position =
    "relative";

  quick.style.zIndex =
    "10";
}


/* =========================================================
   BACKGROUND HEIGHT SYSTEM
========================================================= */

(function backgroundHeightSystem() {

  if (
    !$("#bazvorDynamicBackgroundHeightCSS")
  ) {

    const style =
      document.createElement(
        "style"
      );


    style.id =
      "bazvorDynamicBackgroundHeightCSS";


    style.textContent = `

      html,
      body{
        background:#fff!important;
      }


      .home-background-system{
        position:fixed!important;
        top:0!important;
        left:0!important;
        right:0!important;
        width:100%!important;
        overflow:hidden!important;
        background:transparent!important;
        pointer-events:none!important;
      }


      .home-background-system
      .home-background-layer{

        position:absolute!important;

        inset:0 auto auto 0!important;

        width:100%!important;

        height:100%!important;

        max-height:100%!important;

        pointer-events:none!important;
      }


      #homeQuickActions{

        position:relative!important;

        z-index:10!important;
      }


      .quick-actions-section{

        position:relative!important;

        z-index:20!important;
      }


      .mini-promo-section,
      .mini-discovery-section,
      .flash-sale-section,
      .all-products-section{

        position:relative;
      }


      .flash-sale-section,
      .all-products-section{

        background:#fff;
      }

    `;


    document.head.appendChild(
      style
    );
  }


  const refresh =
    () =>
      requestAnimationFrame(
        updateBackgroundHeight
      );


  window.addEventListener(
    "load",
    refresh
  );


  window.addEventListener(
    "resize",
    refresh
  );


  if (
    typeof ResizeObserver !==
    "undefined"
  ) {

    const observer =
      new ResizeObserver(
        refresh
      );


    const quick =
      $("#homeQuickActions");


    const mini =
      $("#miniDiscoveryScroll");


    if (quick) {
      observer.observe(quick);
    }


    if (mini) {
      observer.observe(mini);
    }
  }


  if (
    typeof MutationObserver !==
    "undefined"
  ) {

    const quick =
      $("#homeQuickActions");


    if (quick) {

      const observer =
        new MutationObserver(
          refresh
        );


      observer.observe(
        quick,
        {
          childList: true,
          subtree: true,
          attributes: true
        }
      );
    }
  }


  refresh();

})();


/* =========================================================
   INITIALIZE
========================================================= */

loadBanners();

loadHomeCards();

loadMiniBanners();

loadMiniOptions();

loadProducts();


setTimeout(
  updateBackgroundHeight,
  300
);

setTimeout(
  updateBackgroundHeight,
  800
);


console.log(
  "BAZVOR HOME — COMPLETE FIREBASE SYSTEM READY"
);
/* =========================================================
   BAZVOR — FINAL SMART HEADER
   ---------------------------------------------------------
   CARD MUST GO BEHIND HEADER

   NORMAL:
   Original Background
        ↓
   Quick Cards

   WHEN SCROLLING:
   Original Background
        ↓
   Quick Cards
        ↓
   HEADER ORIGINAL BACKGROUND
        ↓
   Header Content

   RESULT:
   Card + Card Background can NEVER appear
   above the Header.
========================================================= */

(function installBazvorFinalSmartHeader() {

  const STYLE_ID =
    "bazvorFinalSmartHeaderSystem";

  document.getElementById(STYLE_ID)?.remove();


  /* =======================================================
     HEADER FINDER
  ======================================================= */

  function getHeader() {

    const selectors = [
      "#homeHeader",
      ".home-header",
      ".top-header",
      ".main-header",
      "header"
    ];

    for (const selector of selectors) {

      const el =
        document.querySelector(selector);

      if (el) {
        return el;
      }
    }

    return null;
  }


  /* =======================================================
     STYLE
  ======================================================= */

  const style =
    document.createElement("style");

  style.id =
    STYLE_ID;


  style.textContent = `

    /* =====================================================
       BACKGROUND
    ===================================================== */

    .home-background-system {

      position: fixed !important;

      top: 0 !important;
      left: 0 !important;
      right: 0 !important;

      width: 100% !important;

      z-index: 1 !important;

      pointer-events: none !important;

      overflow: hidden !important;

      background: transparent !important;
    }


    .home-background-system
    .home-background-layer {

      position: absolute !important;

      top: 0 !important;
      left: 0 !important;

      width: 100% !important;
      height: 100% !important;

      z-index: 1 !important;

      pointer-events: none !important;
    }


    /* =====================================================
       HEADER — TOPMOST LAYER
       ===================================================== */

    header,
    #homeHeader,
    .home-header,
    .top-header,
    .main-header {

      position: sticky !important;

      top: 0 !important;

      z-index: 1000 !important;

      isolation: isolate !important;

      /*
         VERY IMPORTANT:
         Do NOT use transparent here.

         The pseudo background below will cover
         everything underneath the Header.
      */

      background: transparent !important;

      backdrop-filter: none !important;

      -webkit-backdrop-filter: none !important;

      box-shadow: none !important;

      overflow: hidden !important;
    }


    /* =====================================================
       HEADER BACKGROUND — ABOVE ALL PAGE CONTENT
       -----------------------------------------------------
       IMPORTANT FIX:

       z-index: 0
       NOT -1

       This makes the original background layer a real
       painted layer INSIDE the Header stacking context.

       Therefore cards cannot show through it.
    ===================================================== */

    header::before,
    #homeHeader::before,
    .home-header::before,
    .top-header::before,
    .main-header::before {

      content: "" !important;

      position: absolute !important;

      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;

      width: 100% !important;
      height: 100% !important;

      z-index: 0 !important;

      pointer-events: none !important;

      background-image:
        var(--bazvor-header-bg, none) !important;

      background-repeat:
        var(--bazvor-header-bg-repeat, no-repeat) !important;

      background-position:
        var(--bazvor-header-bg-position, center top) !important;

      background-size:
        var(--bazvor-header-bg-size, cover) !important;

      background-color: transparent !important;

      opacity: 1 !important;

      display: block !important;

      transform: translateZ(0) !important;
    }


    /* =====================================================
       HEADER CONTENT — ABOVE HEADER BACKGROUND
       ===================================================== */

    header > *,
    #homeHeader > *,
    .home-header > *,
    .top-header > *,
    .main-header > * {

      position: relative !important;

      z-index: 1 !important;
    }


    /* =====================================================
       SEARCH
       ===================================================== */

    #searchInput,
    .search-bar,
    .search-container,
    .search-section {

      position: relative !important;

      z-index: 2 !important;
    }


    /* =====================================================
       CATEGORIES
       ===================================================== */

    .top-categories,
    .category-menu,
    .categories {

      position: relative !important;

      z-index: 2 !important;
    }


    .top-category {

      position: relative !important;

      z-index: 3 !important;
    }


    /* =====================================================
       QUICK CARDS
       -----------------------------------------------------
       NEVER ABOVE HEADER
    ===================================================== */

    .quick-actions-section {

      position: relative !important;

      z-index: 20 !important;

      isolation: isolate !important;
    }


    #homeQuickActions {

      position: relative !important;

      z-index: 21 !important;
    }


    #homeQuickActions
    .home-quick-action {

      position: relative !important;

      z-index: 22 !important;
    }


    /* =====================================================
       MINI SECTIONS
       ===================================================== */

    .mini-promo-section,
    .mini-discovery-section {

      position: relative !important;

      z-index: 25 !important;
    }


    /* =====================================================
       LOWER WHITE SECTIONS
       ===================================================== */

    .flash-sale-section,
    .all-products-section {

      position: relative !important;

      z-index: 30 !important;

      background: #fff !important;
    }


    /* =====================================================
       SMART WHITE MASK
       -----------------------------------------------------
       BELOW HEADER
    ===================================================== */

    #bazvorScrollWhiteMask {

      position: fixed !important;

      left: 0 !important;
      right: 0 !important;

      z-index: 5 !important;

      pointer-events: none !important;

      background: #fff !important;

      box-sizing: border-box !important;
    }

  `;


  document.head.appendChild(style);


  /* =======================================================
     STATE
  ======================================================= */

  let originalCardTop = null;

  let ticking = false;


  /* =======================================================
     QUICK CARD
  ======================================================= */

  function getQuick() {

    return document.getElementById(
      "homeQuickActions"
    );
  }


  /* =======================================================
     MASK
  ======================================================= */

  function getOrCreateMask() {

    let mask =
      document.getElementById(
        "bazvorScrollWhiteMask"
      );


    if (mask) {
      return mask;
    }


    mask =
      document.createElement("div");

    mask.id =
      "bazvorScrollWhiteMask";


    Object.assign(
      mask.style,
      {
        position: "fixed",

        left: "0",
        right: "0",

        top: "0",

        height: "0px",

        background: "#fff",

        zIndex: "5",

        pointerEvents: "none",

        display: "none",

        boxSizing: "border-box"
      }
    );


    document.body.appendChild(mask);

    return mask;
  }


  /* =======================================================
     HEADER BACKGROUND SYNC
     ======================================================= */

  function syncHeaderBackground() {

    const header =
      getHeader();


    if (!header) {
      return;
    }


    const layers = [
      backgroundLayerA,
      backgroundLayerB
    ];


    let activeLayer = null;


    /*
       First find the currently active layer.
    */

    for (const layer of layers) {

      if (!layer) {
        continue;
      }


      const computed =
        getComputedStyle(layer);


      if (
        layer.classList.contains("active") &&
        computed.backgroundImage &&
        computed.backgroundImage !== "none"
      ) {

        activeLayer =
          layer;

        break;
      }
    }


    /*
       Fallback.
    */

    if (!activeLayer) {

      for (const layer of layers) {

        if (!layer) {
          continue;
        }


        const computed =
          getComputedStyle(layer);


        if (
          computed.backgroundImage &&
          computed.backgroundImage !== "none"
        ) {

          activeLayer =
            layer;

          break;
        }
      }
    }


    if (!activeLayer) {
      return;
    }


    const bg =
      getComputedStyle(
        activeLayer
      );


    /*
       Copy exact original background.
    */

    header.style.setProperty(
      "--bazvor-header-bg",
      bg.backgroundImage
    );


    header.style.setProperty(
      "--bazvor-header-bg-size",
      bg.backgroundSize || "cover"
    );


    header.style.setProperty(
      "--bazvor-header-bg-position",
      bg.backgroundPosition || "center top"
    );


    header.style.setProperty(
      "--bazvor-header-bg-repeat",
      bg.backgroundRepeat || "no-repeat"
    );
  }


  /* =======================================================
     SMART CHECK
     ======================================================= */

  function checkSmartSystem() {

    ticking = false;


    const header =
      getHeader();


    const quick =
      getQuick();


    const backgroundSystem =
      document.querySelector(
        ".home-background-system"
      );


    const mask =
      getOrCreateMask();


    /*
       ALWAYS sync header first.
    */

    syncHeaderBackground();


    if (
      !quick ||
      !backgroundSystem
    ) {

      mask.style.display =
        "none";

      return;
    }


    const cardRect =
      quick.getBoundingClientRect();


    const bgRect =
      backgroundSystem.getBoundingClientRect();


    /* =====================================================
       CAPTURE NORMAL CARD POSITION
    ===================================================== */

    if (
      originalCardTop === null &&
      cardRect.height > 0
    ) {

      originalCardTop =
        cardRect.top;
    }


    if (
      originalCardTop === null
    ) {

      mask.style.display =
        "none";

      return;
    }


    /* =====================================================
       CARD MOVEMENT
    ===================================================== */

    const movedUp =
      originalCardTop -
      cardRect.top;


    /*
       Card is normal.
    */

    if (
      movedUp <= 1
    ) {

      mask.style.display =
        "none";

      mask.style.height =
        "0px";

      return;
    }


    /* =====================================================
       HEADER BOTTOM
    ===================================================== */

    let headerBottom = 0;


    if (header) {

      const headerRect =
        header.getBoundingClientRect();


      headerBottom =
        Math.max(
          0,
          headerRect.bottom
        );
    }


    /* =====================================================
       WHITE PROTECTION STARTS BELOW HEADER
    ===================================================== */

    const maskTop =
      Math.max(
        headerBottom,
        Math.max(
          0,
          cardRect.top
        )
      );


    /* =====================================================
       WHITE PROTECTION BOTTOM
    ===================================================== */

    const maskBottom =
      Math.min(
        window.innerHeight,
        bgRect.bottom
      );


    const maskHeight =
      maskBottom -
      maskTop;


    if (
      maskHeight > 0
    ) {

      mask.style.display =
        "block";

      mask.style.top =
        `${maskTop}px`;

      mask.style.height =
        `${maskHeight}px`;

    } else {

      mask.style.display =
        "none";

      mask.style.height =
        "0px";
    }

  }


  /* =======================================================
     REQUEST
  ======================================================= */

  function requestSmartCheck() {

    if (ticking) {
      return;
    }


    ticking = true;


    requestAnimationFrame(
      checkSmartSystem
    );
  }


  /* =======================================================
     SCROLL
     ======================================================= */

  window.addEventListener(
    "scroll",
    requestSmartCheck,
    {
      passive: true
    }
  );


  /* =======================================================
     RESIZE
     ======================================================= */

  window.addEventListener(
    "resize",
    () => {

      originalCardTop = null;

      const mask =
        document.getElementById(
          "bazvorScrollWhiteMask"
        );


      if (mask) {

        mask.style.display =
          "none";

        mask.style.height =
          "0px";
      }


      requestSmartCheck();

    },
    {
      passive: true
    }
  );


  /* =======================================================
     QUICK CARD RESIZE
     ======================================================= */

  if (
    typeof ResizeObserver !==
    "undefined"
  ) {

    const observer =
      new ResizeObserver(
        () => {

          requestSmartCheck();

        }
      );


    const quick =
      getQuick();


    if (quick) {
      observer.observe(quick);
    }
  }


  /* =======================================================
     QUICK CARD DOM CHANGES
     ======================================================= */

  if (
    typeof MutationObserver !==
    "undefined"
  ) {

    const quick =
      getQuick();


    if (quick) {

      const observer =
        new MutationObserver(
          () => {

            if (
              originalCardTop === null
            ) {

              const rect =
                quick.getBoundingClientRect();


              if (
                rect.height > 0
              ) {

                originalCardTop =
                  rect.top;

              }
            }


            requestSmartCheck();

          }
        );


      observer.observe(
        quick,
        {
          childList: true,
          subtree: true,
          attributes: true
        }
      );
    }
  }


  /* =======================================================
     INITIAL
     ======================================================= */

  syncHeaderBackground();


  setTimeout(
    requestSmartCheck,
    100
  );


  setTimeout(
    requestSmartCheck,
    500
  );


  setTimeout(
    requestSmartCheck,
    1000
  );


  setTimeout(
    requestSmartCheck,
    1500
  );


  /*
     Keep header background synchronized
     with Firebase banner rotation.
  */

  setInterval(
    () => {

      syncHeaderBackground();

      requestSmartCheck();

    },
    500
  );


  console.log(
    "BAZVOR — HEADER IS NOW ABOVE SMART CARDS"
  );

})();