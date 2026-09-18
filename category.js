"use strict";

import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getFirestore,
  collection,
  onSnapshot
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

let db = null;

try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
} catch (error) {
  console.error(
    "Firebase initialization error:",
    error
  );
}


/* =========================================================
   HELPERS
========================================================= */

const $ = selector =>
  document.querySelector(selector);

const $$ = selector =>
  [...document.querySelectorAll(selector)];


function norm(value) {

  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}


function num(value) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return 0;
  }

  const n = Number(
    String(value)
      .replace(/[৳,\s]/g, "")
  );

  return Number.isFinite(n)
    ? n
    : 0;
}


function esc(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


/* =========================================================
   DOM
========================================================= */

const categoryGrid =
  $("#categoryGrid");

const productGrid =
  $("#productGrid");

const productsTitle =
  $("#productsTitle");

const productsCount =
  $("#productsCount");

const productsSection =
  $("#productsSection");

const filterButton =
  $("#filterButton");

const sortButton =
  $("#sortButton");

const loadMoreButton =
  $("#loadMoreButton");

const filterOverlay =
  $("#filterOverlay");

const filterDrawer =
  $("#filterDrawer");

const filterClose =
  $("#filterClose");

const sortOverlay =
  $("#sortOverlay");

const sortSheet =
  $("#sortSheet");

const sortClose =
  $("#sortClose");

const applyFilterButton =
  $("#applyFilter");

const clearFilterButton =
  $("#clearFilter");

const minPriceInput =
  $("#minPrice");

const maxPriceInput =
  $("#maxPrice");

const discountOnlyInput =
  $("#discountOnly");

const activeFilter =
  $("#activeFilter");

const activeFilterText =
  $("#activeFilterText");

const clearActiveFilter =
  $("#clearActiveFilter");

const backButton =
  $("#backButton");

const headerCartButton =
  $("#headerCartButton");

const headerCartBadge =
  $("#headerCartBadge");

const bazvorToast =
  $("#bazvorToast");


/* =========================================================
   CATEGORY DATA
   NO UPLOAD SYSTEM
   NO ALL PRODUCTS CARD
========================================================= */

const CATEGORY_DATA = [

  {
    name: "Electronics",
    image:
      "https://res.cloudinary.com/vtgcxluf/image/upload/v1788759812/1788758829976_hwifov.png"
  },

  {
    name: "Fashion",
    image:
      "https://res.cloudinary.com/vtgcxluf/image/upload/v1788759810/1788758872984_e8rhyv.png"
  },

  {
    name: "Phones",
    image:
      "https://res.cloudinary.com/vtgcxluf/image/upload/v1788759811/1788758909584_ipbf9a.png"
  },

  {
    name: "Watches",
    image:
      "https://res.cloudinary.com/vtgcxluf/image/upload/v1788759811/1788758941419_wum3ca.png"
  },

  {
    name: "Beauty",
    image:
      "https://res.cloudinary.com/vtgcxluf/image/upload/v1788759811/1788758977904_cuzjm3.png"
  },

  {
    name: "Home",
    image:
      "https://res.cloudinary.com/vtgcxluf/image/upload/v1788759812/1788759062770_woqi2e.png"
  },

  {
    name: "Grocery",
    image:
      "https://res.cloudinary.com/vtgcxluf/image/upload/v1788759815/1788759107057_bnj6ui.png"
  },

  {
    name: "Sports",
    image:
      "https://res.cloudinary.com/vtgcxluf/image/upload/v1788759813/1788759186889_hl0sti.png"
  },

  {
    name: "Baby & Kids",
    image:
      "https://res.cloudinary.com/vtgcxluf/image/upload/v1788759815/1788759272094_j6w1xk.png"
  },

  {
    name: "Fragrance",
    image:
      "https://res.cloudinary.com/vtgcxluf/image/upload/v1788759814/1788759301236_jlkdyt.png"
  },

  {
    name: "Books & Stationery",
    image:
      "https://res.cloudinary.com/vtgcxluf/image/upload/v1788759816/1788759361298_okvsai.png"
  },

  {
    name: "Car Accessories",
    image:
      "https://res.cloudinary.com/vtgcxluf/image/upload/v1788759814/1788759381071_yk92no.png"
  }

];


/* =========================================================
   STATE
========================================================= */

let allProducts = [];

let filteredProducts = [];

let currentCategory = "All";

let currentSort = "latest";

let visibleProductCount = 20;

let liveFilter = {
  minPrice: "",
  maxPrice: "",
  rating: 0,
  discountOnly: false
};


/* =========================================================
   PRODUCT HELPERS
========================================================= */

function timestamp(product = {}) {

  const values = [
    product.createdAt,
    product.updatedAt,
    product.timestamp,
    product.createdDate,
    product.date
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

    if (
      typeof value === "string"
    ) {

      const parsed =
        Date.parse(value);

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return 0;
}


function productName(product = {}) {

  return (
    product.productName ||
    product.name ||
    product.title ||
    "Unnamed Product"
  );
}


function productImage(product = {}) {

  const direct = [

    product.mainImage,
    product.mainImageUrl,
    product.imageUrl,
    product.imageURL,
    product.image,
    product.photo,
    product.thumbnail,
    product.productImage

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

    product.images,
    product.imageUrls,
    product.imageURLs,
    product.photos,
    product.mediaUrls,
    product.media

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
          item.imageURL ||
          item.src;

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


function productPrice(product = {}) {

  const values = [

    product.salePrice,
    product.discountPrice,
    product.price,
    product.sellingPrice,
    product.currentPrice,
    product.wholesalePrice

  ];

  for (const value of values) {

    const price = num(value);

    if (price > 0) {
      return price;
    }
  }

  return 0;
}


function oldPrice(product = {}) {

  const values = [

    product.oldPrice,
    product.regularPrice,
    product.originalPrice,
    product.mrp,
    product.previousPrice

  ];

  for (const value of values) {

    const price = num(value);

    if (price > 0) {
      return price;
    }
  }

  return 0;
}


function discount(product = {}) {

  const price =
    productPrice(product);

  const old =
    oldPrice(product);

  if (
    old > price &&
    price > 0
  ) {

    return Math.round(
      ((old - price) / old) * 100
    );
  }

  return num(
    product.discountPercentage ??
    product.discountPercent ??
    product.discount ??
    0
  );
}


function rating(product = {}) {

  return Math.max(
    0,
    Math.min(
      5,
      num(
        product.rating ??
        product.averageRating ??
        product.avgRating ??
        product.reviewRating ??
        0
      )
    )
  );
}


function reviewCount(product = {}) {

  const count =
    num(
      product.reviewCount ??
      product.reviewsCount ??
      product.totalReviews ??
      0
    );

  if (count > 0) {
    return count;
  }

  return Array.isArray(product.reviews)
    ? product.reviews.length
    : 0;
}


function stock(product = {}) {

  if (
    product.stock === undefined ||
    product.stock === null ||
    product.stock === ""
  ) {

    return 999999;
  }

  return Math.max(
    0,
    num(product.stock)
  );
}


function verified(product = {}) {

  return (
    product.verified === true ||
    product.isVerified === true ||
    product.bazvorVerified === true ||
    product.statusVerified === true
  );
}


function isFlash(product = {}) {

  const types = [
    product.productType,
    product.type
  ].map(norm);

  return (

    types.includes("flash sell") ||
    types.includes("flash sale") ||
    types.includes("flash") ||

    product.flashSale === true ||
    product.flashSell === true ||
    product.isFlashSale === true ||
    product.isFlashSell === true

  );
}


function activeStatus(product = {}) {

  if (
    product.active === false ||
    product.isActive === false
  ) {

    return false;
  }

  const hidden = [
    "draft",
    "deleted",
    "inactive",
    "disabled",
    "archived",
    "unpublished",
    "hidden"
  ];

  const status =
    norm(product.status || "active");

  return !hidden.includes(status);
}


/* =========================================================
   CATEGORY
========================================================= */

function productCategory(product = {}) {

  return norm(
    product.category ||
    product.categoryName ||
    product.catagory ||
    product.catagoryName ||
    product.category_name ||
    ""
  );
}


function categoryAliases(name) {

  const map = {

    electronics: [
      "electronics"
    ],

    fashion: [
      "fashion"
    ],

    phones: [
      "phones",
      "phone",
      "mobile",
      "mobiles",
      "smartphone"
    ],

    watches: [
      "watches",
      "watch"
    ],

    beauty: [
      "beauty",
      "beauty & personal care",
      "personal care"
    ],

    home: [
      "home",
      "home & living"
    ],

    grocery: [
      "grocery",
      "grocery & food",
      "food"
    ],

    sports: [
      "sports",
      "sports & fitness",
      "fitness"
    ],

    "baby & kids": [
      "baby & kids",
      "baby",
      "kids"
    ],

    fragrance: [
      "fragrance",
      "perfume",
      "perfumes"
    ],

    "books & stationery": [
      "books & stationery",
      "books",
      "stationery"
    ],

    "car accessories": [
      "car accessories",
      "car-accesorice",
      "car-accessories",
      "automotive",
      "auto",
      "automotive accessories"
    ]

  };

  return map[norm(name)] ||
    [norm(name)];
}


function categoryMatches(
  product,
  wanted
) {

  const category =
    productCategory(product);

  if (!category) {
    return false;
  }

  const aliases =
    categoryAliases(wanted);

  if (
    aliases.includes(category)
  ) {
    return true;
  }

  const parts =
    category
      .split(/[,/|>]+/)
      .map(norm)
      .filter(Boolean);

  return aliases.some(
    alias =>
      parts.includes(alias) ||
      category.includes(alias) ||
      alias.includes(category)
  );
}


/* =========================================================
   STARS
========================================================= */

function stars(value) {

  let html = "";

  for (
    let i = 1;
    i <= 5;
    i++
  ) {

    if (value >= i) {

      html +=
        `<i class="fa-solid fa-star"></i>`;

    } else if (
      value >= i - .5
    ) {

      html +=
        `<i class="fa-solid fa-star-half-stroke"></i>`;

    } else {

      html +=
        `<i class="fa-regular fa-star"></i>`;
    }
  }

  return html;
}


/* =========================================================
   CART
========================================================= */

function getCart() {

  try {

    const cart =
      JSON.parse(
        localStorage.getItem(
          "bazvorCart"
        ) || "[]"
      );

    return Array.isArray(cart)
      ? cart
      : [];

  } catch {

    return [];
  }
}


function saveCart(cart) {

  localStorage.setItem(
    "bazvorCart",
    JSON.stringify(cart)
  );
}


function cartCount() {

  return getCart().reduce(
    (total, item) =>
      total +
      (num(item.quantity) || 1),
    0
  );
}


function updateCartCount() {

  const count =
    cartCount();

  const text =
    count > 99
      ? "99+"
      : String(count);

  if (headerCartBadge) {
    headerCartBadge.textContent =
      text;
  }

  const shared =
    $("#cartBadge");

  if (shared) {
    shared.textContent =
      text;
  }
}


function addToCart(product) {

  if (!product?.id) {
    return;
  }

  if (stock(product) <= 0) {

    showToast(
      "Product is out of stock"
    );

    return;
  }

  const cart =
    getCart();

  const id =
    String(product.id);

  const existing =
    cart.find(
      item =>
        String(item.id) === id
    );

  if (existing) {

    existing.quantity =
      (num(existing.quantity) || 1) + 1;

  } else {

    const image =
      productImage(product);

    const price =
      productPrice(product);

    cart.push({

      id: product.id,

      productName:
        productName(product),

      name:
        productName(product),

      image,

      imageUrl: image,

      salePrice: price,

      price,

      oldPrice:
        oldPrice(product),

      brandName:
        product.brandName || "",

      category:
        product.category || "",

      quantity: 1

    });
  }

  saveCart(cart);

  updateCartCount();

  window.dispatchEvent(
    new Event(
      "bazvorCartUpdated"
    )
  );

  showToast(
    "Added to cart"
  );
}


/* =========================================================
   WISHLIST
========================================================= */

function getWishlist() {

  try {

    const list =
      JSON.parse(
        localStorage.getItem(
          "bazvor_wishlist"
        ) || "[]"
      );

    return Array.isArray(list)
      ? list.map(String)
      : [];

  } catch {

    return [];
  }
}


function saveWishlist(list) {

  localStorage.setItem(
    "bazvor_wishlist",
    JSON.stringify(list)
  );
}


function toggleWishlist(id) {

  const productId =
    String(id);

  let list =
    getWishlist();

  if (
    list.includes(productId)
  ) {

    list =
      list.filter(
        item =>
          item !== productId
      );

    showToast(
      "Removed from wishlist"
    );

  } else {

    list.push(productId);

    showToast(
      "Added to wishlist"
    );
  }

  saveWishlist(list);

  renderProducts();
}


/* =========================================================
   CATEGORY RENDER
   IMPORTANT:
   ALL PRODUCTS CARD REMOVED
========================================================= */

function renderCategories() {

  if (!categoryGrid) {
    return;
  }

  categoryGrid.innerHTML = "";

  /*
    IMPORTANT:
    এখানে কোনো "All Products" card তৈরি করা হচ্ছে না।
    শুধু CATEGORY_DATA-এর category cards থাকবে।
  */

  CATEGORY_DATA.forEach(
    category => {

      const active =
        norm(currentCategory) ===
        norm(category.name);

      const card =
        document.createElement("button");

      card.type = "button";

      card.className =
        "category-card" +
        (
          active
            ? " active"
            : ""
        );

      card.dataset.category =
        category.name;

      card.innerHTML = `

        <div class="category-image">

          <img
            src="${esc(category.image)}"
            alt="${esc(category.name)}"
            loading="lazy"
            draggable="false"
            onerror="
              this.onerror=null;
              this.style.opacity='0';
            "
          >

        </div>

        <div class="category-name">
          ${esc(category.name)}
        </div>

      `;

      card.addEventListener(
        "click",
        () => {

          currentCategory =
            category.name;

          visibleProductCount =
            20;

          updateURL();

          renderCategories();

          applyFilters();

          scrollToProducts();

        }
      );

      categoryGrid.appendChild(card);

    }
  );
}


/* =========================================================
   URL
========================================================= */

function readURL() {

  const params =
    new URLSearchParams(
      window.location.search
    );

  const value =
    params.get("category") ||
    params.get("cat") ||
    "";

  if (!value) {
    return "All";
  }

  const match =
    CATEGORY_DATA.find(
      category =>
        norm(category.name) ===
        norm(value)
    );

  return match
    ? match.name
    : "All";
}


function updateURL() {

  const url =
    new URL(
      window.location.href
    );

  if (
    currentCategory !== "All"
  ) {

    url.searchParams.set(
      "category",
      currentCategory
    );

  } else {

    url.searchParams.delete(
      "category"
    );
  }

  history.replaceState(
    null,
    "",
    url
  );
}


/* =========================================================
   FILTER
========================================================= */

function applyFilters() {

  let list =
    allProducts.filter(
      product => {

        if (
          !activeStatus(product)
        ) {
          return false;
        }

        if (
          isFlash(product)
        ) {
          return false;
        }

        return true;
      }
    );


  if (
    currentCategory !== "All"
  ) {

    list =
      list.filter(
        product =>
          categoryMatches(
            product,
            currentCategory
          )
      );
  }


  const min =
    num(
      liveFilter.minPrice
    );

  const max =
    num(
      liveFilter.maxPrice
    );


  if (min > 0) {

    list =
      list.filter(
        product =>
          productPrice(product) >= min
      );
  }


  if (max > 0) {

    list =
      list.filter(
        product =>
          productPrice(product) <= max
      );
  }


  if (
    liveFilter.rating > 0
  ) {

    list =
      list.filter(
        product =>
          rating(product) >=
          liveFilter.rating
      );
  }


  if (
    liveFilter.discountOnly
  ) {

    list =
      list.filter(
        product =>
          discount(product) > 0
      );
  }


  switch (currentSort) {

    case "price-low":

      list.sort(
        (a,b) =>
          productPrice(a) -
          productPrice(b)
      );

      break;


    case "price-high":

      list.sort(
        (a,b) =>
          productPrice(b) -
          productPrice(a)
      );

      break;


    case "rating":

      list.sort(
        (a,b) =>
          rating(b) -
          rating(a) ||
          reviewCount(b) -
          reviewCount(a)
      );

      break;


    case "discount":

      list.sort(
        (a,b) =>
          discount(b) -
          discount(a) ||
          timestamp(b) -
          timestamp(a)
      );

      break;


    default:

      list.sort(
        (a,b) =>
          timestamp(b) -
          timestamp(a)
      );

      break;
  }


  filteredProducts =
    list;

  renderProducts();

  updateProductHeader();

  updateActiveFilter();
}


/* =========================================================
   PRODUCT CARD
========================================================= */

function productCard(product) {

  const image =
    productImage(product);

  const name =
    productName(product);

  const price =
    productPrice(product);

  const old =
    oldPrice(product);

  const disc =
    discount(product);

  const r =
    rating(product);

  const reviews =
    reviewCount(product);

  const stockValue =
    stock(product);

  const wished =
    getWishlist().includes(
      String(product.id)
    );


  return `

    <article
      class="product-card"
      data-product-id="${esc(product.id)}"
    >

      <div class="product-image-wrap">

        ${
          image
            ? `
              <img
                class="product-image"
                src="${esc(image)}"
                alt="${esc(name)}"
                loading="lazy"
                draggable="false"
                onerror="
                  this.onerror=null;
                  this.style.display='none';
                "
              >
            `
            : `
              <div
                class="product-image"
                style="
                  display:grid;
                  place-items:center;
                  color:#aaa;
                  font-weight:800;
                "
              >
                BAZVOR
              </div>
            `
        }

        ${
          disc > 0
            ? `
              <span class="discount-badge">
                -${disc}%
              </span>
            `
            : ""
        }

        <button
          type="button"
          class="wishlist-button ${
            wished ? "active" : ""
          }"
          data-action="wishlist"
          aria-label="Wishlist"
        >
          <i class="${
            wished
              ? "fa-solid"
              : "fa-regular"
          } fa-heart"></i>
        </button>

        ${
          verified(product)
            ? `
              <span class="verified-badge">
                <i class="fa-solid fa-circle-check"></i>
                Verified
              </span>
            `
            : ""
        }

        ${
          stockValue <= 0
            ? `
              <div class="out-of-stock">
                Out of Stock
              </div>
            `
            : ""
        }

      </div>

      <div class="product-info">

        ${
          product.brandName
            ? `
              <div class="product-brand">
                ${esc(product.brandName)}
              </div>
            `
            : ""
        }

        <h3 class="product-name">
          ${esc(name)}
        </h3>

        <div class="product-price-row">

          <strong class="product-price">
            ৳${price.toLocaleString("en-BD")}
          </strong>

          ${
            old > price
              ? `
                <del class="old-price">
                  ৳${old.toLocaleString("en-BD")}
                </del>
              `
              : ""
          }

        </div>

        <div class="product-meta">

          <span class="rating-stars">
            ${stars(r)}
          </span>

          <span class="rating-number">
            ${r > 0 ? r.toFixed(1) : "0.0"}
          </span>

          ${
            reviews > 0
              ? `
                <span class="review-count">
                  (${reviews})
                </span>
              `
              : ""
          }

        </div>

        <button
          type="button"
          class="add-cart-button"
          data-action="cart"
          aria-label="Add to cart"
          ${
            stockValue <= 0
              ? "disabled"
              : ""
          }
        >
          <i class="fa-solid fa-cart-plus"></i>
        </button>

      </div>

    </article>

  `;
}


/* =========================================================
   PRODUCT RENDER
========================================================= */

function renderProducts() {

  if (!productGrid) {
    return;
  }


  if (
    filteredProducts.length === 0
  ) {

    productGrid.innerHTML = `

      <div class="empty-box">

        <div class="empty-icon">
          <i class="fa-solid fa-box-open"></i>
        </div>

        <strong>
          No products found
        </strong>

        <p>
          ${
            currentCategory === "All"
              ? "There are no products available right now."
              : `No products found in ${esc(
                  currentCategory
                )}.`
          }
        </p>

        <button
          type="button"
          id="emptyClearButton"
        >
          Show All Products
        </button>

      </div>

    `;

    loadMoreButton.hidden = true;

    $("#emptyClearButton")
      ?.addEventListener(
        "click",
        () => {

          currentCategory =
            "All";

          updateURL();

          renderCategories();

          clearAllFilters();

        }
      );

    return;
  }


  const shown =
    filteredProducts.slice(
      0,
      visibleProductCount
    );


  productGrid.innerHTML =
    shown
      .map(productCard)
      .join("");


  loadMoreButton.hidden =
    shown.length >=
    filteredProducts.length;


  attachProductEvents();
}


/* =========================================================
   PRODUCT EVENTS
========================================================= */

function attachProductEvents() {

  $$(".product-card")
    .forEach(card => {

      card.addEventListener(
        "click",
        event => {

          if (
            event.target.closest(
              "[data-action]"
            )
          ) {
            return;
          }

          const id =
            card.dataset.productId;

          if (!id) {
            return;
          }

          window.location.href =
            `product-details.html?id=${encodeURIComponent(id)}`;

        }
      );

    });


  $$("[data-action='wishlist']")
    .forEach(button => {

      button.addEventListener(
        "click",
        event => {

          event.preventDefault();
          event.stopPropagation();

          const card =
            button.closest(
              ".product-card"
            );

          const id =
            card?.dataset.productId;

          if (id) {
            toggleWishlist(id);
          }

        }
      );

    });


  $$("[data-action='cart']")
    .forEach(button => {

      button.addEventListener(
        "click",
        event => {

          event.preventDefault();
          event.stopPropagation();

          const card =
            button.closest(
              ".product-card"
            );

          const id =
            card?.dataset.productId;

          const product =
            allProducts.find(
              item =>
                String(item.id) ===
                String(id)
            );

          if (product) {
            addToCart(product);
          }

        }
      );

    });
}


/* =========================================================
   FIRESTORE
========================================================= */

function loadProducts() {

  if (!db) {

    showError(
      "Firebase could not be initialized."
    );

    return;
  }


  productGrid.innerHTML = `

    <div class="loading-box">

      <div class="loading-spinner"></div>

      <strong>
        Loading products
      </strong>

      <span>
        Connecting to BAZVOR marketplace...
      </span>

    </div>

  `;


  try {

    onSnapshot(

      collection(
        db,
        "products"
      ),

      snapshot => {

        allProducts = [];

        snapshot.forEach(
          doc => {

            allProducts.push({

              id: doc.id,

              ...doc.data()

            });

          }
        );

        applyFilters();

      },

      error => {

        console.error(
          "Products error:",
          error
        );

        showError(
          firebaseError(error)
        );

      }

    );

  } catch (error) {

    console.error(error);

    showError(
      "Could not connect to products."
    );
  }
}


/* =========================================================
   FIREBASE ERROR
========================================================= */

function firebaseError(error) {

  if (
    error?.code ===
    "permission-denied"
  ) {

    return (
      "Firebase permission denied. Check Firestore rules."
    );
  }

  return (
    error?.message ||
    "Products could not be loaded."
  );
}


/* =========================================================
   ERROR
========================================================= */

function showError(message) {

  productGrid.innerHTML = `

    <div class="empty-box">

      <div class="empty-icon">
        <i class="fa-solid fa-triangle-exclamation"></i>
      </div>

      <strong>
        Products could not be loaded
      </strong>

      <p>
        ${esc(message)}
      </p>

      <button
        type="button"
        id="retryProducts"
      >
        Try Again
      </button>

    </div>

  `;

  loadMoreButton.hidden = true;

  $("#retryProducts")
    ?.addEventListener(
      "click",
      loadProducts
    );
}


/* =========================================================
   PRODUCT HEADER
========================================================= */

function updateProductHeader() {

  if (productsTitle) {

    productsTitle.textContent =
      currentCategory === "All"
        ? "All Products"
        : currentCategory;
  }


  if (productsCount) {

    productsCount.textContent =
      `${filteredProducts.length} Products`;
  }
}


/* =========================================================
   ACTIVE FILTER
========================================================= */

function updateActiveFilter() {

  if (!activeFilter) {
    return;
  }

  const filters = [];


  if (
    currentCategory !== "All"
  ) {

    filters.push(
      currentCategory
    );
  }


  if (
    num(liveFilter.minPrice) > 0
  ) {

    filters.push(
      `Min ৳${num(
        liveFilter.minPrice
      ).toLocaleString("en-BD")}`
    );
  }


  if (
    num(liveFilter.maxPrice) > 0
  ) {

    filters.push(
      `Max ৳${num(
        liveFilter.maxPrice
      ).toLocaleString("en-BD")}`
    );
  }


  if (
    liveFilter.rating > 0
  ) {

    filters.push(
      `${liveFilter.rating}★+`
    );
  }


  if (
    liveFilter.discountOnly
  ) {

    filters.push(
      "Discount"
    );
  }


  if (filters.length) {

    activeFilter.hidden =
      false;

    activeFilterText.textContent =
      filters.join(" • ");

  } else {

    activeFilter.hidden =
      true;
  }
}


/* =========================================================
   FILTER
========================================================= */

function openFilter() {

  filterOverlay.hidden = false;

  requestAnimationFrame(
    () => {

      filterDrawer.classList.add(
        "open"
      );

    }
  );

  filterDrawer.setAttribute(
    "aria-hidden",
    "false"
  );

  document.body.style.overflow =
    "hidden";
}


function closeFilter() {

  filterDrawer.classList.remove(
    "open"
  );

  filterDrawer.setAttribute(
    "aria-hidden",
    "true"
  );

  setTimeout(
    () => {

      filterOverlay.hidden =
        true;

    },
    280
  );

  document.body.style.overflow =
    "";
}


function readFilterForm() {

  const selected =
    document.querySelector(
      "input[name='ratingFilter']:checked"
    );

  return {

    minPrice:
      minPriceInput?.value || "",

    maxPrice:
      maxPriceInput?.value || "",

    rating:
      num(
        selected?.value || 0
      ),

    discountOnly:
      Boolean(
        discountOnlyInput?.checked
      )

  };
}


function clearAllFilters() {

  liveFilter = {

    minPrice: "",
    maxPrice: "",
    rating: 0,
    discountOnly: false

  };


  if (minPriceInput) {
    minPriceInput.value = "";
  }

  if (maxPriceInput) {
    maxPriceInput.value = "";
  }

  if (discountOnlyInput) {
    discountOnlyInput.checked = false;
  }


  const allRating =
    document.querySelector(
      "input[name='ratingFilter'][value='0']"
    );

  if (allRating) {
    allRating.checked = true;
  }


  visibleProductCount = 20;

  applyFilters();
}


/* =========================================================
   SORT
========================================================= */

function openSort() {

  sortOverlay.hidden = false;

  requestAnimationFrame(
    () => {

      sortSheet.classList.add(
        "open"
      );

    }
  );

  sortSheet.setAttribute(
    "aria-hidden",
    "false"
  );

  document.body.style.overflow =
    "hidden";
}


function closeSort() {

  sortSheet.classList.remove(
    "open"
  );

  sortSheet.setAttribute(
    "aria-hidden",
    "true"
  );

  setTimeout(
    () => {

      sortOverlay.hidden =
        true;

    },
    280
  );

  document.body.style.overflow =
    "";
}


function selectSort(value) {

  currentSort = value;

  $$(".sort-item")
    .forEach(item => {

      item.classList.toggle(
        "active",
        item.dataset.sort === value
      );

    });

  visibleProductCount = 20;

  applyFilters();

  closeSort();
}


/* =========================================================
   TOAST
========================================================= */

let toastTimer = null;

function showToast(message) {

  if (!bazvorToast) {
    return;
  }

  bazvorToast.textContent =
    message;

  bazvorToast.classList.add(
    "show"
  );

  clearTimeout(toastTimer);

  toastTimer =
    setTimeout(
      () => {

        bazvorToast.classList.remove(
          "show"
        );

      },
      1800
    );
}


/* =========================================================
   SCROLL
========================================================= */

function scrollToProducts() {

  if (!productsSection) {
    return;
  }

  const header =
    document.querySelector(
      ".category-header"
    );

  const headerHeight =
    header?.offsetHeight || 58;

  const top =
    productsSection
      .getBoundingClientRect()
      .top +
    window.scrollY -
    headerHeight -
    7;

  window.scrollTo({

    top:
      Math.max(0, top),

    behavior:
      "smooth"

  });
}


/* =========================================================
   HEADER
========================================================= */

function setupHeaderNavigation() {

  backButton?.addEventListener(
    "click",
    () => {

      if (
        document.referrer &&
        document.referrer !==
          window.location.href
      ) {

        window.history.back();

      } else {

        window.location.href =
          "home.html";
      }

    }
  );


  headerCartButton?.addEventListener(
    "click",
    () => {

      window.location.href =
        "cart.html";

    }
  );

  updateCartCount();
}


/* =========================================================
   LOAD MORE
========================================================= */

loadMoreButton?.addEventListener(
  "click",
  () => {

    visibleProductCount += 20;

    renderProducts();

  }
);


/* =========================================================
   FILTER EVENTS
========================================================= */

filterButton?.addEventListener(
  "click",
  openFilter
);

filterClose?.addEventListener(
  "click",
  closeFilter
);

filterOverlay?.addEventListener(
  "click",
  event => {

    if (
      event.target ===
      filterOverlay
    ) {

      closeFilter();
    }

  }
);


applyFilterButton?.addEventListener(
  "click",
  () => {

    liveFilter =
      readFilterForm();

    visibleProductCount =
      20;

    applyFilters();

    closeFilter();

    scrollToProducts();

  }
);


clearFilterButton?.addEventListener(
  "click",
  clearAllFilters
);


clearActiveFilter?.addEventListener(
  "click",
  () => {

    currentCategory =
      "All";

    updateURL();

    renderCategories();

    clearAllFilters();

  }
);


/* =========================================================
   SORT EVENTS
========================================================= */

sortButton?.addEventListener(
  "click",
  openSort
);

sortClose?.addEventListener(
  "click",
  closeSort
);

sortOverlay?.addEventListener(
  "click",
  event => {

    if (
      event.target ===
      sortOverlay
    ) {

      closeSort();
    }

  }
);


$$(".sort-item")
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        selectSort(
          button.dataset.sort
        );

      }
    );

  });


/* =========================================================
   ESC
========================================================= */

document.addEventListener(
  "keydown",
  event => {

    if (
      event.key ===
      "Escape"
    ) {

      closeFilter();
      closeSort();

    }

  }
);


/* =========================================================
   CART EVENTS
========================================================= */

window.addEventListener(
  "storage",
  updateCartCount
);

window.addEventListener(
  "focus",
  updateCartCount
);

window.addEventListener(
  "bazvorCartUpdated",
  updateCartCount
);


/* =========================================================
   INITIALIZE
========================================================= */

function init() {

  currentCategory =
    readURL();

  /*
    Only category cards.
    No All Products card.
  */
  renderCategories();

  setupHeaderNavigation();

  updateCartCount();

  loadProducts();

}


if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    init,
    { once: true }
  );

} else {

  init();

}


/* =========================================================
   DEBUG API
========================================================= */

window.BAZVOR_CATEGORY = {

  getProducts:
    () => allProducts,

  getVisibleProducts:
    () => filteredProducts,

  refresh:
    loadProducts,

  selectCategory:
    category => {

      const match =
        CATEGORY_DATA.find(
          item =>
            norm(item.name) ===
            norm(category)
        );

      if (!match) {
        return;
      }

      currentCategory =
        match.name;

      visibleProductCount =
        20;

      updateURL();

      renderCategories();

      applyFilters();

      scrollToProducts();

    },

  selectSort:
    value => {

      currentSort =
        value;

      visibleProductCount =
        20;

      applyFilters();

    }

};