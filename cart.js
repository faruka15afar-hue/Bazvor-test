"use strict";


/* =========================================================
   FIREBASE
========================================================= */

import {
  initializeApp,
  getApps,
  getApp
} from
"https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";


import {
  getAuth,
  onAuthStateChanged
} from
"https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";


import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp
} from
"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


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
    "1:59852021286:web:b6ad6eba476f853b1710e7"

};


const firebaseApp =
  getApps().length
    ? getApp()
    : initializeApp(
        firebaseConfig
      );


const auth =
  getAuth(
    firebaseApp
  );


const db =
  getFirestore(
    firebaseApp
  );


/* =========================================================
   CONFIG
========================================================= */

const CART_KEY =
  "bazvorCart";


const CHECKOUT_KEY =
  "bazvorCheckout";


/*
  BANGLADESH LOCATION DATABASE

  This database contains:

  8 Divisions
  64 Districts
  Upazilas
  Unions
  Pourashavas

  Bangla names are available through bn_name.
*/

const LOCATION_FILE =
  "https://iqbalhasandev.github.io/bangladesh-geo-json/bangladesh-geo.json";


/*
  নিজের আসল payment number বসাবে।
*/

const PAYMENT_CONFIG = {

  bkash: {

    name:
      "bKash",

    number:
      "01XXXXXXXXX"

  },


  nagad: {

    name:
      "Nagad",

    number:
      "01XXXXXXXXX"

  },


  cod: {

    name:
      "Cash on Delivery",

    number:
      ""

  }

};



/* =========================================================
   STATE
========================================================= */

let cart =
  [];


let selectedIndexes =
  new Set();


let appliedCoupon =
  "";


let couponDiscount =
  0;


let checkoutData =
  null;


let customerPhone =
  "";


let selectedPayment =
  "";


let currentUser =
  null;


let placingOrder =
  false;


let toastTimer;



/* =========================================================
   LOCATION STATE
========================================================= */

let bangladeshLocations =
  [];


let locationDatabaseLoaded =
  false;


let locationDatabaseLoading =
  false;


const selectedLocation = {

  division:
    "",

  district:
    "",

  upazila:
    "",

  union:
    ""

};



/* =========================================================
   HELPERS
========================================================= */

const $ = selector =>
  document.querySelector(
    selector
  );


function money(value) {

  return "৳" +
    (
      Number(value) ||
      0
    )
    .toLocaleString(
      "en-BD"
    );

}


function setText(
  selector,
  value
) {

  const element =
    $(selector);


  if (
    element
  ) {

    element.textContent =
      value;

  }

}


function escapeHTML(value) {

  return String(
    value ?? ""
  )
  .replace(
    /&/g,
    "&amp;"
  )
  .replace(
    /</g,
    "&lt;"
  )
  .replace(
    />/g,
    "&gt;"
  )
  .replace(
    /"/g,
    "&quot;"
  )
  .replace(
    /'/g,
    "&#039;"
  );

}


function showToast(message) {

  const toast =
    $("#toast");


  if (
    !toast
  ) {

    return;

  }


  toast.textContent =
    message;


  toast.classList.add(
    "show"
  );


  clearTimeout(
    toastTimer
  );


  toastTimer =
    setTimeout(
      () => {

        toast.classList.remove(
          "show"
        );

      },
      2200
    );

}



/* =========================================================
   PRODUCT HELPERS
========================================================= */

function getProductName(item) {

  return (
    item?.name ||
    item?.productName ||
    item?.title ||
    "Product"
  );

}


function getPrice(item) {

  return Number(

    item?.price ??
    item?.salePrice ??
    item?.discountPrice ??
    item?.sellingPrice ??
    0

  ) || 0;

}


function getOldPrice(item) {

  return Number(

    item?.oldPrice ??
    item?.regularPrice ??
    item?.originalPrice ??
    0

  ) || 0;

}


function getQuantity(item) {

  const quantity =
    Number(
      item?.quantity
    );


  return quantity > 0
    ? quantity
    : 1;

}


function getImage(item) {

  const images =
    item?.images ||
    item?.productImages ||
    item?.photos;


  if (
    Array.isArray(
      images
    ) &&
    images.length
  ) {

    const first =
      images[0];


    if (
      typeof first ===
      "string"
    ) {

      return first;

    }


    if (
      first?.url
    ) {

      return first.url;

    }


    if (
      first?.imageUrl
    ) {

      return first.imageUrl;

    }

  }


  return (
    item?.image ||
    item?.imageUrl ||
    item?.imageURL ||
    item?.thumbnail ||
    item?.photo ||
    ""
  );

}



/* =========================================================
   LOAD CART
========================================================= */

function loadCart() {

  try {

    const stored =
      localStorage.getItem(
        CART_KEY
      );


    cart =
      stored
        ? JSON.parse(
            stored
          )
        : [];


    if (
      !Array.isArray(
        cart
      )
    ) {

      cart =
        [];

    }

  } catch (
    error
  ) {

    console.error(
      "CART LOAD:",
      error
    );


    cart =
      [];

  }


  selectedIndexes =
    new Set(

      cart.map(
        (_, index) =>
          index
      )

    );

}



/* =========================================================
   SAVE CART
========================================================= */

function saveCart() {

  localStorage.setItem(
    CART_KEY,
    JSON.stringify(
      cart
    )
  );


  window.dispatchEvent(
    new CustomEvent(
      "bazvorCartUpdated"
    )
  );

}



/* =========================================================
   SELECTED ITEMS
========================================================= */

function getSelectedItems() {

  return [
    ...selectedIndexes
  ]
  .sort(
    (a,b) =>
      a-b
  )
  .map(
    index =>
      cart[index]
  )
  .filter(Boolean);

}



/* =========================================================
   CALCULATIONS
========================================================= */

function calculate() {

  const items =
    getSelectedItems();


  const subtotal =
    items.reduce(
      (total,item) =>

        total +

        getPrice(item) *
        getQuantity(item),

      0
    );


  const savings =
    items.reduce(
      (total,item) => {

        const difference =
          Math.max(

            0,

            getOldPrice(item) -
            getPrice(item)

          );


        return (
          total +
          difference *
          getQuantity(item)
        );

      },
      0
    );


  const delivery =
    items.length
      ? 60
      : 0;


  const total =
    Math.max(

      0,

      subtotal +
      delivery -
      couponDiscount

    );


  const quantity =
    items.reduce(
      (total,item) =>

        total +
        getQuantity(item),

      0
    );


  return {

    items,
    subtotal,
    savings,
    delivery,
    total,
    quantity

  };

}



/* =========================================================
   RENDER CART
========================================================= */

function renderCart() {

  const cartCount =
    cart.reduce(
      (total,item) =>

        total +
        getQuantity(item),

      0
    );


  setText(

    "#cartCount",

    `${cartCount} ${
      cartCount === 1
        ? "item"
        : "items"
    }`

  );


  const container =
    $("#cartItems");


  if (
    !container
  ) {

    return;

  }


  if (
    !cart.length
  ) {

    container.innerHTML =
      "";


    $("#cartContent")
      ?.classList.add(
        "hidden"
      );


    $("#emptyCart")
      ?.classList.remove(
        "hidden"
      );


    updateSummary();


    return;

  }


  $("#cartContent")
    ?.classList.remove(
      "hidden"
    );


  $("#emptyCart")
    ?.classList.add(
      "hidden"
    );


  container.innerHTML =

    cart.map(
      (item,index) => {

        const checked =
          selectedIndexes.has(
            index
          );


        return `

          <article class="cart-item">

            <label class="item-select">

              <input
                class="item-checkbox"
                type="checkbox"
                data-index="${index}"
                ${checked ? "checked" : ""}
              >

              <span class="item-check-ui"></span>

            </label>


            <div class="item-image-wrap">

              <img
                class="item-image"

                src="${escapeHTML(
                  getImage(item)
                )}"

                alt="${escapeHTML(
                  getProductName(item)
                )}"

                onerror="
                  this.onerror=null;
                  this.src='https://via.placeholder.com/300x300?text=BAZVOR';
                "
              >

            </div>


            <div class="item-info">

              <div class="item-name">

                ${escapeHTML(
                  getProductName(item)
                )}

              </div>


              <div class="item-variant">

                ${escapeHTML(

                  item?.selectedColor ||

                  item?.selectedSize ||

                  "Standard"

                )}

              </div>


              <strong class="item-price">

                ${money(
                  getPrice(item)
                )}

              </strong>


              <div class="item-controls">

                <div class="quantity-control">

                  <button
                    class="quantity-minus"
                    data-index="${index}"
                    type="button"
                  >
                    −
                  </button>


                  <span>

                    ${getQuantity(
                      item
                    )}

                  </span>


                  <button
                    class="quantity-plus"
                    data-index="${index}"
                    type="button"
                  >
                    +
                  </button>

                </div>


                <button
                  class="remove-item"
                  data-index="${index}"
                  type="button"
                >

                  <i class="fa-regular fa-trash-can"></i>

                </button>

              </div>

            </div>

          </article>

        `;

      }
    )
    .join("");


  bindCartItemEvents();

  updateSelection();

  updateSummary();

}



/* =========================================================
   CART ITEM EVENTS
========================================================= */

function bindCartItemEvents() {

  document
    .querySelectorAll(
      ".item-checkbox"
    )
    .forEach(
      checkbox => {

        checkbox.addEventListener(
          "change",
          () => {

            const index =
              Number(
                checkbox.dataset.index
              );


            if (
              checkbox.checked
            ) {

              selectedIndexes.add(
                index
              );

            } else {

              selectedIndexes.delete(
                index
              );

            }


            updateSelection();

            updateSummary();

          }
        );

      }
    );


  document
    .querySelectorAll(
      ".quantity-minus"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            const index =
              Number(
                button.dataset.index
              );


            const item =
              cart[index];


            if (
              !item
            ) {

              return;

            }


            item.quantity =
              Math.max(

                1,

                getQuantity(
                  item
                ) - 1

              );


            saveCart();

            renderCart();

          }
        );

      }
    );


  document
    .querySelectorAll(
      ".quantity-plus"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            const index =
              Number(
                button.dataset.index
              );


            const item =
              cart[index];


            if (
              !item
            ) {

              return;

            }


            item.quantity =
              getQuantity(
                item
              ) + 1;


            saveCart();

            renderCart();

          }
        );

      }
    );


  document
    .querySelectorAll(
      ".remove-item"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            const index =
              Number(
                button.dataset.index
              );


            if (
              !cart[index]
            ) {

              return;

            }


            cart.splice(
              index,
              1
            );


            selectedIndexes =
              new Set(

                cart.map(
                  (_,i) =>
                    i
                )

              );


            saveCart();

            renderCart();

          }
        );

      }
    );

}



/* =========================================================
   SELECTION
========================================================= */

function updateSelection() {

  const count =
    selectedIndexes.size;


  setText(
    "#selectedCount",
    `${count} selected`
  );


  const selectAll =
    $("#selectAll");


  if (
    selectAll
  ) {

    selectAll.checked =

      cart.length > 0 &&

      count ===
      cart.length;


    selectAll.indeterminate =

      count > 0 &&

      count <
      cart.length;

  }


  if (
    $("#checkoutButton")
  ) {

    $("#checkoutButton").disabled =
      count === 0;

  }


  if (
    $("#desktopCheckoutButton")
  ) {

    $("#desktopCheckoutButton").disabled =
      count === 0;

  }

}



/* =========================================================
   SUMMARY
========================================================= */

function updateSummary() {

  const data =
    calculate();


  setText(
    "#subtotal",
    money(
      data.subtotal
    )
  );


  setText(
    "#productDiscount",
    "-" +
    money(
      data.savings
    )
  );


  setText(
    "#couponDiscountText",
    "-" +
    money(
      couponDiscount
    )
  );


  setText(
    "#delivery",
    money(
      data.delivery
    )
  );


  setText(
    "#total",
    money(
      data.total
    )
  );


  setText(
    "#bottomTotal",
    money(
      data.total
    )
  );


  setText(

    "#itemText",

    `(${data.quantity} ${
      data.quantity === 1
        ? "item"
        : "items"
    })`

  );


  if (
    $("#couponSummaryRow")
  ) {

    $("#couponSummaryRow").hidden =
      couponDiscount <= 0;

  }


  if (
    data.items.length
  ) {

    setText(

      "#deliveryText",

      `Delivery charge: ${
        money(
          data.delivery
        )
      }`

    );


    setText(

      "#deliveryEstimate",

      "Calculated from selected products"

    );

  } else {

    setText(

      "#deliveryText",

      "Select products to calculate"

    );


    setText(

      "#deliveryEstimate",

      "No products selected"

    );

  }

}



/* =========================================================
   COUPON
========================================================= */

function applyCoupon() {

  const code =
    $("#couponInput")
      ?.value
      .trim()
      .toUpperCase() ||
    "";


  const subtotal =
    calculate()
      .subtotal;


  if (
    code ===
    "BAZVOR10"
  ) {

    appliedCoupon =
      code;


    couponDiscount =
      Math.round(
        subtotal *
        .10
      );


  } else if (
    code ===
    "WELCOME50"
  ) {

    appliedCoupon =
      code;


    couponDiscount =
      Math.min(
        subtotal,
        50
      );


  } else {

    appliedCoupon =
      "";


    couponDiscount =
      0;


    setText(
      "#couponMessage",
      "Invalid coupon code"
    );


    setText(
      "#couponStatus",
      "Voucher or promo code"
    );


    updateSummary();


    return;

  }


  setText(
    "#couponStatus",
    `${code} applied`
  );


  setText(

    "#couponMessage",

    `${money(
      couponDiscount
    )} discount applied`

  );


  updateSummary();

}



/* =========================================================
   PHONE NORMALIZER
========================================================= */

function normalizePhone(value) {

  let phone =
    String(
      value ||
      ""
    )
    .replace(
      /\D/g,
      ""
    );


  if (
    phone.startsWith(
      "880"
    )
  ) {

    phone =
      phone.slice(3);

  }


  if (
    phone.startsWith(
      "0"
    )
  ) {

    phone =
      phone.slice(1);

  }


  if (
    !/^1[3-9]\d{8}$/
      .test(phone)
  ) {

    return "";

  }


  return (
    "+880" +
    phone
  );

}



/* =========================================================
   OPEN CHECKOUT
========================================================= */

function openCheckout() {

  const data =
    calculate();


  if (
    !data.items.length
  ) {

    showToast(
      "Select a product first"
    );


    return;

  }


  checkoutData = {

    items:
      data.items,

    subtotal:
      data.subtotal,

    savings:
      data.savings,

    delivery:
      data.delivery,

    total:
      data.total,

    couponCode:
      appliedCoupon,

    couponDiscount

  };


  localStorage.setItem(

    CHECKOUT_KEY,

    JSON.stringify(
      checkoutData
    )

  );


  if (
    $("#checkoutBackdrop")
  ) {

    $("#checkoutBackdrop").hidden =
      false;

  }


  const sheet =
    $("#checkoutSheet");


  sheet
    ?.classList.add(
      "open",
      "phone-size"
    );


  sheet
    ?.classList.remove(
      "detail-size"
    );


  sheet
    ?.setAttribute(
      "aria-hidden",
      "false"
    );


  document.body
    .classList.add(
      "checkout-open"
    );


  showStep(
    "phone"
  );


  setTimeout(
    () => {

      $("#customerPhone")
        ?.focus();

    },
    250
  );

}



/* =========================================================
   CLOSE CHECKOUT
========================================================= */

function closeCheckout() {

  if (
    $("#checkoutBackdrop")
  ) {

    $("#checkoutBackdrop").hidden =
      true;

  }


  const sheet =
    $("#checkoutSheet");


  sheet
    ?.classList.remove(
      "open",
      "detail-size"
    );


  sheet
    ?.classList.add(
      "phone-size"
    );


  sheet
    ?.setAttribute(
      "aria-hidden",
      "true"
    );


  document.body
    .classList.remove(
      "checkout-open"
    );

}



/* =========================================================
   CHECKOUT STEP
========================================================= */

function showStep(step) {

  const steps = {

    phone:
      "#phoneStep",

    location:
      "#locationStep",

    method:
      "#methodStep",

    final:
      "#finalStep"

  };


  Object
    .values(
      steps
    )
    .forEach(
      selector => {

        $(selector)
          ?.classList.remove(
            "active"
          );

      }
    );


  $(steps[step])
    ?.classList.add(
      "active"
    );


  const sheet =
    $("#checkoutSheet");


  if (
    step ===
    "phone"
  ) {

    sheet
      ?.classList.add(
        "phone-size"
      );


    sheet
      ?.classList.remove(
        "detail-size"
      );

  } else {

    sheet
      ?.classList.remove(
        "phone-size"
      );


    sheet
      ?.classList.add(
        "detail-size"
      );

  }


  if (
    step ===
    "final"
  ) {

    renderFinal();

  }

}



/* =========================================================
   LOCATION HELPERS
========================================================= */

/*
  Get the display name.

  Dataset provides:

  name     = English
  bn_name  = Bangla

  Bazvor checkout will show Bangla.
*/

function getLocationName(
  location
) {

  if (
    !location
  ) {

    return "";

  }


  if (
    typeof location ===
    "string"
  ) {

    return location;

  }


  return (

    location.bn_name ||

    location.name ||

    ""

  );

}



/*
  Normalize the dataset.

  This keeps the existing Bazvor
  location logic compatible.
*/

function normalizeLocationDatabase(
  data
) {

  if (
    !Array.isArray(
      data
    )
  ) {

    return [];

  }


  return data
    .filter(
      division =>

        division &&

        (
          division.name ||
          division.bn_name
        ) &&

        Array.isArray(
          division.districts
        )
    )
    .map(
      division => ({

        ...division,

        name:
          getLocationName(
            division
          ),

        districts:
          division.districts
            .filter(
              district =>

                district &&

                (
                  district.name ||
                  district.bn_name
                )
            )
            .map(
              district => ({

                ...district,

                name:
                  getLocationName(
                    district
                  ),

                upazilas:

                  Array.isArray(
                    district.upazilas
                  )

                    ? district.upazilas
                        .filter(
                          upazila =>

                            upazila &&

                            (
                              upazila.name ||
                              upazila.bn_name
                            )
                        )
                        .map(
                          upazila => ({

                            ...upazila,

                            name:
                              getLocationName(
                                upazila
                              ),

                            unions:

                              Array.isArray(
                                upazila.unions
                              )
                                ? upazila.unions
                                : [],

                            pourashavas:

                              Array.isArray(
                                upazila.pourashavas
                              )
                                ? upazila.pourashavas
                                : []

                          })
                        )

                    : []

              })
            )

      })
    );

}



/* =========================================================
   LOCATION DATABASE
========================================================= */

async function loadBangladeshLocations() {

  if (
    locationDatabaseLoaded
  ) {

    renderDivisions();

    return true;

  }


  if (
    locationDatabaseLoading
  ) {

    return false;

  }


  locationDatabaseLoading =
    true;


  const loader =
    $("#locationLoader");


  if (
    loader
  ) {

    loader.hidden =
      false;


    loader.textContent =
      "Loading Bangladesh locations...";

  }


  try {

    console.log(
      "Loading Bangladesh location database:",
      LOCATION_FILE
    );


    const response =
      await fetch(
        LOCATION_FILE,
        {
          cache:
            "no-store"
        }
      );


    if (
      !response.ok
    ) {

      throw new Error(
        `Location database HTTP ${
          response.status
        }`
      );

    }


    const result =
      await response.json();


    const normalized =
      normalizeLocationDatabase(
        result
      );


    if (
      !normalized.length
    ) {

      throw new Error(
        "Bangladesh location database is empty or invalid"
      );

    }


    bangladeshLocations =
      normalized;


    locationDatabaseLoaded =
      true;


    renderDivisions();


    if (
      loader
    ) {

      loader.hidden =
        true;

    }


    /*
      Database statistics.
    */

    const districtCount =
      bangladeshLocations
        .reduce(
          (
            total,
            division
          ) =>

            total +
            division
              .districts
              .length,

          0
        );


    const upazilaCount =
      bangladeshLocations
        .reduce(
          (
            total,
            division
          ) =>

            total +

            division
              .districts
              .reduce(
                (
                  districtTotal,
                  district
                ) =>

                  districtTotal +

                  district
                    .upazilas
                    .length,

                0
              ),

          0
        );


    const unionCount =
      bangladeshLocations
        .reduce(
          (
            total,
            division
          ) =>

            total +

            division
              .districts
              .reduce(
                (
                  districtTotal,
                  district
                ) =>

                  districtTotal +

                  district
                    .upazilas
                    .reduce(
                      (
                        upazilaTotal,
                        upazila
                      ) =>

                        upazilaTotal +

                        upazila
                          .unions
                          .length,

                      0
                    ),

                0
              ),

          0
        );


    const pourashavaCount =
      bangladeshLocations
        .reduce(
          (
            total,
            division
          ) =>

            total +

            division
              .districts
              .reduce(
                (
                  districtTotal,
                  district
                ) =>

                  districtTotal +

                  district
                    .upazilas
                    .reduce(
                      (
                        upazilaTotal,
                        upazila
                      ) =>

                        upazilaTotal +

                        upazila
                          .pourashavas
                          .length,

                      0
                    ),

                0
              ),

          0
        );


    console.log(
      "Bangladesh location database loaded:",
      {
        divisions:
          bangladeshLocations.length,

        districts:
          districtCount,

        upazilas:
          upazilaCount,

        unions:
          unionCount,

        pourashavas:
          pourashavaCount
      }
    );


    return true;


  } catch (
    error
  ) {

    console.error(
      "BANGLADESH LOCATION DATABASE ERROR:",
      error
    );


    if (
      loader
    ) {

      loader.hidden =
        false;


      loader.textContent =
        "Location data couldn't load";

    }


    showToast(
      "Bangladesh location data couldn't load"
    );


    return false;


  } finally {

    locationDatabaseLoading =
      false;

  }

}



/* =========================================================
   RENDER DIVISIONS
========================================================= */

function renderDivisions() {

  const select =
    $("#divisionSelect");


  if (
    !select
  ) {

    return;

  }


  select.innerHTML =

    `

      <option value="">
        বিভাগ নির্বাচন করুন
      </option>

    `

    +

    bangladeshLocations
      .map(
        (
          division,
          index
        ) => `

          <option
            value="${index}"
          >

            ${escapeHTML(
              division.name
            )}

          </option>

        `
      )
      .join("");


  select.disabled =
    false;


  resetLocationSelect(
    "#districtSelect",
    "জেলা নির্বাচন করুন"
  );


  resetLocationSelect(
    "#upazilaSelect",
    "উপজেলা নির্বাচন করুন"
  );


  resetLocationSelect(
    "#unionSelect",
    "ইউনিয়ন / পৌরসভা নির্বাচন করুন"
  );

}



/* =========================================================
   RESET LOCATION SELECT
========================================================= */

function resetLocationSelect(
  selector,
  placeholder
) {

  const select =
    $(selector);


  if (
    !select
  ) {

    return;

  }


  select.innerHTML =
    `

      <option value="">
        ${escapeHTML(
          placeholder
        )}
      </option>

    `;


  select.disabled =
    true;

}



/* =========================================================
   DIVISION CHANGED
========================================================= */

function divisionChanged() {

  const select =
    $("#divisionSelect");


  const value =
    select?.value ??
    "";


  selectedLocation.division =
    "";


  selectedLocation.district =
    "";


  selectedLocation.upazila =
    "";


  selectedLocation.union =
    "";


  resetLocationSelect(
    "#districtSelect",
    "জেলা নির্বাচন করুন"
  );


  resetLocationSelect(
    "#upazilaSelect",
    "উপজেলা নির্বাচন করুন"
  );


  resetLocationSelect(
    "#unionSelect",
    "ইউনিয়ন / পৌরসভা নির্বাচন করুন"
  );


  if (
    value ===
    ""
  ) {

    return;

  }


  const divisionIndex =
    Number(
      value
    );


  const division =
    bangladeshLocations[
      divisionIndex
    ];


  if (
    !division
  ) {

    return;

  }


  selectedLocation.division =
    division.name;


  const districts =
    Array.isArray(
      division.districts
    )

      ? division.districts

      : [];


  const districtSelect =
    $("#districtSelect");


  districtSelect.innerHTML =

    `

      <option value="">
        জেলা নির্বাচন করুন
      </option>

    `

    +

    districts
      .map(
        (
          district,
          index
        ) => `

          <option
            value="${index}"
          >

            ${escapeHTML(
              district.name
            )}

          </option>

        `
      )
      .join("");


  districtSelect.disabled =
    !districts.length;

}



/* =========================================================
   DISTRICT CHANGED
========================================================= */

function districtChanged() {

  const divisionValue =
    $("#divisionSelect")
      ?.value ??
    "";


  const districtValue =
    $("#districtSelect")
      ?.value ??
    "";


  selectedLocation.district =
    "";


  selectedLocation.upazila =
    "";


  selectedLocation.union =
    "";


  resetLocationSelect(
    "#upazilaSelect",
    "উপজেলা নির্বাচন করুন"
  );


  resetLocationSelect(
    "#unionSelect",
    "ইউনিয়ন / পৌরসভা নির্বাচন করুন"
  );


  if (
    divisionValue ===
      "" ||

    districtValue ===
      ""
  ) {

    return;

  }


  const divisionIndex =
    Number(
      divisionValue
    );


  const districtIndex =
    Number(
      districtValue
    );


  const district =

    bangladeshLocations[
      divisionIndex
    ]
    ?.districts?.[
      districtIndex
    ];


  if (
    !district
  ) {

    return;

  }


  selectedLocation.district =
    district.name ||
    "";


  const list =
    Array.isArray(
      district.upazilas
    )

      ? district.upazilas

      : [];


  const select =
    $("#upazilaSelect");


  select.innerHTML =

    `

      <option value="">
        উপজেলা নির্বাচন করুন
      </option>

    `

    +

    list
      .map(
        (
          upazila,
          index
        ) => `

          <option
            value="${index}"
          >

            ${escapeHTML(
              upazila.name
            )}

          </option>

        `
      )
      .join("");


  select.disabled =
    !list.length;

}



/* =========================================================
   UPAZILA CHANGED
========================================================= */

function upazilaChanged() {

  const divisionValue =
    $("#divisionSelect")
      ?.value ??
    "";


  const districtValue =
    $("#districtSelect")
      ?.value ??
    "";


  const upazilaValue =
    $("#upazilaSelect")
      ?.value ??
    "";


  selectedLocation.upazila =
    "";


  selectedLocation.union =
    "";


  resetLocationSelect(
    "#unionSelect",
    "ইউনিয়ন / পৌরসভা নির্বাচন করুন"
  );


  if (
    divisionValue ===
      "" ||

    districtValue ===
      "" ||

    upazilaValue ===
      ""
  ) {

    return;

  }


  const divisionIndex =
    Number(
      divisionValue
    );


  const districtIndex =
    Number(
      districtValue
    );


  const upazilaIndex =
    Number(
      upazilaValue
    );


  const upazila =

    bangladeshLocations[
      divisionIndex
    ]
    ?.districts?.[
      districtIndex
    ]
    ?.upazilas?.[
      upazilaIndex
    ];


  if (
    !upazila
  ) {

    return;

  }


  selectedLocation.upazila =
    upazila.name ||
    "";


  /*
    Get both:

    Union
    +
    Pourashava

    So a location won't disappear
    simply because it is a municipality.
  */

  const unions =

    Array.isArray(
      upazila.unions
    )

      ? upazila.unions

      : [];


  const pourashavas =

    Array.isArray(
      upazila.pourashavas
    )

      ? upazila.pourashavas

      : [];


  const combined =
    [];


  unions.forEach(
    union => {

      const name =
        getLocationName(
          union
        );


      if (
        name
      ) {

        combined.push({

          name,

          type:
            "ইউনিয়ন"

        });

      }

    }
  );


  pourashavas.forEach(
    municipality => {

      const name =
        getLocationName(
          municipality
        );


      if (
        name
      ) {

        combined.push({

          name,

          type:
            "পৌরসভা"

        });

      }

    }
  );


  const unionSelect =
    $("#unionSelect");


  if (
    !combined.length
  ) {

    /*
      Some urban locations may not
      have a union record.

      In that case we don't block
      checkout unnecessarily.
    */

    unionSelect.innerHTML =

      `

        <option value="">
          ইউনিয়ন / পৌরসভা প্রযোজ্য নয়
        </option>

      `;


    unionSelect.disabled =
      true;


    selectedLocation.union =
      "";


    return;

  }


  unionSelect.innerHTML =

    `

      <option value="">
        ইউনিয়ন / পৌরসভা নির্বাচন করুন
      </option>

    `

    +

    combined
      .map(
        (
          location,
          index
        ) => `

          <option
            value="${index}"
          >

            ${escapeHTML(
              location.name
            )}

            —

            ${escapeHTML(
              location.type
            )}

          </option>

        `
      )
      .join("");


  unionSelect.disabled =
    false;


  /*
    Store the combined location list
    temporarily for unionChanged().
  */

  unionSelect._locationOptions =
    combined;

}



/* =========================================================
   UNION / POURASHAVA CHANGED
========================================================= */

function unionChanged() {

  const select =
    $("#unionSelect");


  const value =
    select?.value ??
    "";


  selectedLocation.union =
    "";


  if (
    value ===
    ""
  ) {

    return;

  }


  const options =
    select?._locationOptions ||
    [];


  const selected =
    options[
      Number(
        value
      )
    ];


  if (
    !selected
  ) {

    return;

  }


  selectedLocation.union =
    selected.name ||
    "";

}



/* =========================================================
   ADDRESS VALIDATION
========================================================= */

function addressValid() {

  return Boolean(

    selectedLocation.division &&

    selectedLocation.district &&

    selectedLocation.upazila &&

    $("#receiverName")
      ?.value
      .trim() &&

    $("#addressDetails")
      ?.value
      .trim()

  );

}


function fullAddress() {

  return [

    $("#addressDetails")
      ?.value
      .trim(),

    selectedLocation.union,

    selectedLocation.upazila,

    selectedLocation.district,

    selectedLocation.division

  ]
  .filter(Boolean)
  .join(", ");

}



/* =========================================================
   PAYMENT METHOD
========================================================= */

function choosePayment(
  method
) {

  if (
    !PAYMENT_CONFIG[
      method
    ]
  ) {

    return;

  }


  selectedPayment =
    method;


  document
    .querySelectorAll(
      ".payment-option"
    )
    .forEach(
      button => {

        button.classList.toggle(

          "active",

          button.dataset.payment ===
          method

        );

      }
    );


  if (
    $("#methodContinue")
  ) {

    $("#methodContinue").disabled =
      false;

  }

}



/* =========================================================
   FINAL PAYMENT
========================================================= */

function renderFinal() {

  const cod =
    selectedPayment ===
    "cod";


  if (
    $("#manualPayment")
  ) {

    $("#manualPayment").hidden =
      cod;

  }


  if (
    $("#codConfirmation")
  ) {

    $("#codConfirmation").hidden =
      !cod;

  }


  if (
    cod
  ) {

    setText(
      "#finalTitle",
      "Confirm order"
    );


    setText(
      "#finalSubtitle",
      "Cash on Delivery"
    );


    setText(
      "#codAmount",
      money(
        checkoutData.total
      )
    );


    return;

  }


  const payment =
    PAYMENT_CONFIG[
      selectedPayment
    ];


  if (
    !payment
  ) {

    return;

  }


  setText(
    "#finalTitle",
    `Pay with ${payment.name}`
  );


  setText(
    "#finalSubtitle",
    "Complete payment"
  );


  setText(
    "#selectedPaymentName",
    payment.name
  );


  setText(
    "#paymentNumber",
    payment.number
  );


  setText(
    "#paymentAmount",
    money(
      checkoutData.total
    )
  );


  updatePaidOrderButton();

}



/* =========================================================
   TRANSACTION ID
========================================================= */

function validTransaction() {

  const value =
    $("#transactionId")
      ?.value
      .trim() ||
    "";


  return (
    /^[A-Za-z0-9_-]{6,40}$/
      .test(value)
  );

}


function updatePaidOrderButton() {

  const button =
    $("#placePaidOrder");


  if (
    !button
  ) {

    return;

  }


  button.disabled =

    placingOrder ||

    !validTransaction();

}



/* =========================================================
   ORDER ID
========================================================= */

function makeOrderId() {

  const now =
    new Date();


  const date =

    now.getFullYear() +

    String(
      now.getMonth() + 1
    )
    .padStart(
      2,
      "0"
    )

    +

    String(
      now.getDate()
    )
    .padStart(
      2,
      "0"
    );


  const random =
    Math.random()
      .toString(36)
      .slice(2,7)
      .toUpperCase();


  return (
    `BZV-${date}-${random}`
  );

}



/* =========================================================
   PLACE ORDER
========================================================= */

async function placeOrder() {

  if (
    placingOrder
  ) {

    return;

  }


  if (
    !currentUser
  ) {

    localStorage.setItem(

      CHECKOUT_KEY,

      JSON.stringify(
        checkoutData
      )

    );


    window.location.href =
      "auth.html?redirect=cart.html";


    return;

  }


  if (
    !customerPhone ||
    !addressValid() ||
    !selectedPayment
  ) {

    showToast(
      "Complete checkout information"
    );


    return;

  }


  const cod =
    selectedPayment ===
    "cod";


  if (
    !cod &&
    !validTransaction()
  ) {

    showToast(
      "Enter a valid Transaction ID"
    );


    return;

  }


  placingOrder =
    true;


  if (
    $("#orderLoading")
  ) {

    $("#orderLoading").hidden =
      false;

  }


  updatePaidOrderButton();


  const orderId =
    makeOrderId();


  const items =
    checkoutData.items
      .map(
        item => {

          const itemPrice =
            getPrice(item);


          const itemQuantity =
            getQuantity(item);


          return {

            productId:
              String(

                item?.productId ??
                item?.id ??
                item?.sku ??
                ""

              ),

            name:
              getProductName(
                item
              ),

            image:
              getImage(
                item
              ),

            price:
              itemPrice,

            quantity:
              itemQuantity,

            total:
              itemPrice *
              itemQuantity

          };

        }
      );


  const order = {

    orderId,


    userId:
      currentUser.uid,


    customer: {

      email:
        currentUser.email ||
        ""

    },


    receiver: {

      name:
        $("#receiverName")
          .value
          .trim(),

      phone:
        customerPhone,

      phoneVerified:
        false

    },


    address: {

      division:
        selectedLocation.division,

      district:
        selectedLocation.district,

      upazila:
        selectedLocation.upazila,

      union:
        selectedLocation.union,

      details:
        $("#addressDetails")
          .value
          .trim(),

      fullAddress:
        fullAddress()

    },


    items,


    pricing: {

      subtotal:
        checkoutData.subtotal,

      productSavings:
        checkoutData.savings,

      couponDiscount:
        couponDiscount,

      deliveryCharge:
        checkoutData.delivery,

      total:
        checkoutData.total

    },


    couponCode:
      appliedCoupon ||
      "",


    deliveryMethod:
      "standard",


    paymentMethod:
      selectedPayment,


    paymentProvider:

      cod

        ? "cash_on_delivery"

        : selectedPayment,


    paymentNumber:

      cod

        ? ""

        : PAYMENT_CONFIG[
            selectedPayment
          ].number,


    transactionId:

      cod

        ? ""

        : $("#transactionId")
            .value
            .trim(),


    paymentStatus:

      cod

        ? "cash_on_delivery"

        : "verification_pending",


    status:
      "pending",


    createdAt:
      serverTimestamp(),


    updatedAt:
      serverTimestamp()

  };


  try {

    const result =
      await addDoc(

        collection(
          db,
          "orders"
        ),

        order

      );


    [
      ...selectedIndexes
    ]
    .sort(
      (a,b) =>
        b-a
    )
    .forEach(
      index => {

        cart.splice(
          index,
          1
        );

      }
    );


    saveCart();


    localStorage.setItem(

      "bazvorLastOrder",

      JSON.stringify({

        firestoreId:
          result.id,

        orderId,

        total:
          checkoutData.total,

        paymentMethod:
          selectedPayment,

        paymentStatus:

          cod

            ? "cash_on_delivery"

            : "verification_pending",

        createdAt:
          Date.now()

      })

    );


    localStorage.removeItem(
      CHECKOUT_KEY
    );


    window.location.replace(

      `order-success.html?orderId=${
        encodeURIComponent(
          orderId
        )
      }`

    );


  } catch (
    error
  ) {

    console.error(
      "ORDER ERROR:",
      error
    );


    placingOrder =
      false;


    if (
      $("#orderLoading")
    ) {

      $("#orderLoading").hidden =
        true;

    }


    updatePaidOrderButton();


    showToast(
      "Couldn't place the order. Please try again."
    );

  }

}



/* =========================================================
   AUTH
========================================================= */

onAuthStateChanged(
  auth,
  user => {

    currentUser =
      user ||
      null;


    if (
      user &&
      $("#receiverName") &&
      !$("#receiverName").value
    ) {

      $("#receiverName").value =

        user.displayName ||
        "";

    }

  }
);



/* =========================================================
   INIT
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    loadCart();

    renderCart();


    /* =====================================================
       SELECT ALL
    ====================================================== */

    $("#selectAll")
      ?.addEventListener(
        "change",
        event => {

          selectedIndexes =

            event.target.checked

              ? new Set(

                  cart.map(
                    (_,index) =>
                      index
                  )

                )

              : new Set();


          renderCart();

        }
      );


    /* =====================================================
       DELETE SELECTED
    ====================================================== */

    $("#deleteSelected")
      ?.addEventListener(
        "click",
        () => {

          if (
            !selectedIndexes.size
          ) {

            showToast(
              "Select a product first"
            );


            return;

          }


          [
            ...selectedIndexes
          ]
          .sort(
            (a,b) =>
              b-a
          )
          .forEach(
            index => {

              cart.splice(
                index,
                1
              );

            }
          );


          selectedIndexes =
            new Set(

              cart.map(
                (_,index) =>
                  index
              )

            );


          saveCart();

          renderCart();

        }
      );


    /* =====================================================
       COUPON
    ====================================================== */

    $("#couponTrigger")
      ?.addEventListener(
        "click",
        () => {

          $("#couponPanel").hidden =
            !$("#couponPanel").hidden;

        }
      );


    $("#applyCoupon")
      ?.addEventListener(
        "click",
        applyCoupon
      );


    $("#couponInput")
      ?.addEventListener(
        "keydown",
        event => {

          if (
            event.key ===
            "Enter"
          ) {

            applyCoupon();

          }

        }
      );


    /* =====================================================
       CHECKOUT
    ====================================================== */

    $("#checkoutButton")
      ?.addEventListener(
        "click",
        openCheckout
      );


    $("#desktopCheckoutButton")
      ?.addEventListener(
        "click",
        openCheckout
      );


    /* =====================================================
       CLOSE
    ====================================================== */

    $("#closePhoneCheckout")
      ?.addEventListener(
        "click",
        closeCheckout
      );


    $("#locationClose")
      ?.addEventListener(
        "click",
        closeCheckout
      );


    $("#methodClose")
      ?.addEventListener(
        "click",
        closeCheckout
      );


    $("#finalClose")
      ?.addEventListener(
        "click",
        closeCheckout
      );


    $("#checkoutBackdrop")
      ?.addEventListener(
        "click",
        closeCheckout
      );


    /* =====================================================
       PHONE
    ====================================================== */

    $("#customerPhone")
      ?.addEventListener(
        "input",
        event => {

          event.target.value =

            event.target.value

            .replace(
              /\D/g,
              ""
            )

            .slice(
              0,
              11
            );


          const valid =
            Boolean(

              normalizePhone(
                event.target.value
              )

            );


          $("#phoneContinue").disabled =
            !valid;

        }
      );


    $("#customerPhone")
      ?.addEventListener(
        "keydown",
        event => {

          if (
            event.key ===
              "Enter" &&
            !$("#phoneContinue")
              ?.disabled
          ) {

            $("#phoneContinue")
              ?.click();

          }

        }
      );


    $("#phoneContinue")
      ?.addEventListener(
        "click",
        async () => {

          const phone =
            normalizePhone(
              $("#customerPhone")
                ?.value
            );


          if (
            !phone
          ) {

            showToast(
              "Enter a valid Bangladesh mobile number"
            );


            return;

          }


          customerPhone =
            phone;


          showStep(
            "location"
          );


          await loadBangladeshLocations();

        }
      );


    /* =====================================================
       LOCATION BACK
    ====================================================== */

    $("#locationBack")
      ?.addEventListener(
        "click",
        () => {

          showStep(
            "phone"
          );

        }
      );


    /* =====================================================
       LOCATION
    ====================================================== */

    $("#divisionSelect")
      ?.addEventListener(
        "change",
        divisionChanged
      );


    $("#districtSelect")
      ?.addEventListener(
        "change",
        districtChanged
      );


    $("#upazilaSelect")
      ?.addEventListener(
        "change",
        upazilaChanged
      );


    $("#unionSelect")
      ?.addEventListener(
        "change",
        unionChanged
      );


    $("#locationContinue")
      ?.addEventListener(
        "click",
        () => {

          if (
            !addressValid()
          ) {

            showToast(
              "Select Division, District, Upazila and enter delivery details"
            );


            return;

          }


          showStep(
            "method"
          );

        }
      );


    /* =====================================================
       PAYMENT METHOD
    ====================================================== */

    $("#methodBack")
      ?.addEventListener(
        "click",
        () => {

          showStep(
            "location"
          );

        }
      );


    document
      .querySelectorAll(
        ".payment-option"
      )
      .forEach(
        button => {

          button.addEventListener(
            "click",
            () => {

              choosePayment(
                button.dataset.payment
              );

            }
          );

        }
      );


    $("#methodContinue")
      ?.addEventListener(
        "click",
        () => {

          if (
            !selectedPayment
          ) {

            showToast(
              "Choose a payment method"
            );


            return;

          }


          showStep(
            "final"
          );

        }
      );


    /* =====================================================
       FINAL BACK
    ====================================================== */

    $("#finalBack")
      ?.addEventListener(
        "click",
        () => {

          showStep(
            "method"
          );

        }
      );


    /* =====================================================
       COPY PAYMENT NUMBER
    ====================================================== */

    $("#copyPaymentNumber")
      ?.addEventListener(
        "click",
        async () => {

          if (
            selectedPayment ===
            "cod"
          ) {

            return;

          }


          const number =
            PAYMENT_CONFIG[
              selectedPayment
            ]?.number;


          if (
            !number
          ) {

            return;

          }


          try {

            await navigator
              .clipboard
              .writeText(
                number
              );


            showToast(
              "Payment number copied"
            );


          } catch {

            showToast(
              number
            );

          }

        }
      );


    /* =====================================================
       TRANSACTION
    ====================================================== */

    $("#transactionId")
      ?.addEventListener(
        "input",
        event => {

          event.target.value =

            event.target.value

            .replace(
              /\s+/g,
              ""
            )

            .slice(
              0,
              40
            );


          updatePaidOrderButton();

        }
      );


    /* =====================================================
       ORDER
    ====================================================== */

    $("#placePaidOrder")
      ?.addEventListener(
        "click",
        placeOrder
      );


    $("#placeCodOrder")
      ?.addEventListener(
        "click",
        placeOrder
      );


    /* =====================================================
       PAGE BACK
    ====================================================== */

    $("#backButton")
      ?.addEventListener(
        "click",
        () => {

          if (
            $("#checkoutSheet")
              ?.classList
              .contains(
                "open"
              )
          ) {

            closeCheckout();

            return;

          }


          if (
            history.length >
            1
          ) {

            history.back();

          } else {

            window.location.href =
              "home.html";

          }

        }
      );

  }
);