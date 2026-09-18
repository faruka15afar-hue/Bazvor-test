"use strict";


import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";


import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  limit,
  getDocs,
  onSnapshot,
  runTransaction,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";


/* FIREBASE */

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


const db =
  getFirestore(app);


const auth =
  getAuth(app);


/* CONFIG */

const CART_KEY =
  "bazvorCart";


const WISHLIST_KEY =
  "bazvor_wishlist";


const DELIVERY_KEY =
  "bazvor_delivery_location";


/*
  Used only when product document
  has no delivery charge at all.
*/

const DEFAULT_DELIVERY = {

  dhaka: 60,

  chattogram: 100,

  outsideDhaka: 120

};


const COLORS = {

  black: "#111111",
  white: "#ffffff",
  gray: "#808080",
  grey: "#808080",
  silver: "#c0c0c0",

  red: "#ef4444",
  blue: "#2563eb",
  green: "#16a34a",
  yellow: "#facc15",

  orange: "#f97316",
  pink: "#ec4899",
  purple: "#9333ea",
  violet: "#8b5cf6",

  brown: "#8b4513",
  gold: "#d4af37",
  beige: "#f5f5dc",

  navy: "#001f5b",
  teal: "#008080",
  cyan: "#06b6d4",
  maroon: "#800000"

};


const $ = id =>
  document.getElementById(id);


/* STATE */

let productId = "";

let product = null;

let currentUser = null;

let sellerId = "";

let seller = {};

let variants = [];

let colors = [];

let sizes = [];

let selectedColor = "";

let selectedSize = "";

let selectedVariant = null;

let galleryImages = [];

let currentImage = 0;

let quantity = 1;

let reviews = [];

let selectedReviewRating = 0;

let unsubscribeReviews = null;

let touchStart = 0;

let toastTimer = null;


let deliveryLocation =
  localStorage.getItem(
    DELIVERY_KEY
  ) ||
  "Dhaka";


/* BASIC HELPERS */

function str(
  value,
  fallback = ""
) {

  if (
    value === undefined ||
    value === null
  ) {
    return fallback;
  }


  const result =
    String(value).trim();


  return result || fallback;
}


function num(
  value,
  fallback = 0
) {

  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }


  if (
    typeof value === "string"
  ) {

    const cleaned =
      value.replace(
        /[৳,\s]/g,
        ""
      );


    const result =
      Number(cleaned);


    return Number.isFinite(result)
      ? result
      : fallback;
  }


  const result =
    Number(value);


  return Number.isFinite(result)
    ? result
    : fallback;
}


function norm(value) {

  return str(value)
    .toLowerCase();
}


function money(value) {

  return (
    "৳" +
    num(value)
      .toLocaleString("en-BD")
  );
}


function esc(value) {

  return String(value ?? "")

    .replace(/&/g, "&amp;")

    .replace(/</g, "&lt;")

    .replace(/>/g, "&gt;")

    .replace(/"/g, "&quot;")

    .replace(/'/g, "&#039;");
}


function unique(list) {

  const result = [];

  const found =
    new Set();


  list.forEach(item => {

    const value =
      str(item);


    const key =
      norm(value);


    if (
      !key ||
      found.has(key)
    ) {
      return;
    }


    found.add(key);

    result.push(value);

  });


  return result;
}


function toast(message) {

  $("toast").textContent =
    message;


  $("toast").hidden =
    false;


  clearTimeout(
    toastTimer
  );


  toastTimer =
    setTimeout(
      () => {

        $("toast").hidden =
          true;

      },
      2200
    );
}


/* PRODUCT ID */

function readProductId() {

  const params =
    new URLSearchParams(
      location.search
    );


  return (
    params.get("id") ||
    params.get("productId") ||
    params.get("product") ||
    ""
  );
}


/* IMAGES */

function imageValue(value) {

  if (
    typeof value ===
    "string"
  ) {
    return value.trim();
  }


  if (
    value &&
    typeof value ===
    "object" &&
    !Array.isArray(value)
  ) {

    return str(
      value.url ||
      value.src ||
      value.imageURL ||
      value.imageUrl ||
      value.downloadURL
    );
  }


  return "";
}


function getImages(
  item = {}
) {

  const result = [];


  [
    item.mainImage,
    item.mainImageUrl,
    item.image,
    item.imageURL,
    item.imageUrl,
    item.photo,
    item.thumbnail

  ].forEach(value => {

    const image =
      imageValue(value);


    if (image) {
      result.push(image);
    }

  });


  [
    item.images,
    item.imageURLs,
    item.imageUrls,
    item.photos,
    item.media

  ].forEach(list => {

    if (!Array.isArray(list)) {
      return;
    }


    list.forEach(value => {

      const image =
        imageValue(value);


      if (image) {
        result.push(image);
      }

    });

  });


  return [
    ...new Set(result)
  ];
}


/* PRICES */

function salePrice(
  item = product
) {

  if (!item) return 0;


  const fields = [

    item.salePrice,
    item.discountPrice,
    item.price,
    item.sellingPrice,
    item.currentPrice,
    item.wholesalePrice

  ];


  for (
    const field of fields
  ) {

    const value =
      num(field);


    if (value > 0) {
      return value;
    }
  }


  return 0;
}


function comparePrice(
  item = product
) {

  if (!item) return 0;


  const fields = [

    item.oldPrice,
    item.regularPrice,
    item.originalPrice,
    item.mrp,
    item.compareAtPrice,
    item.previousPrice

  ];


  for (
    const field of fields
  ) {

    const value =
      num(field);


    if (value > 0) {
      return value;
    }
  }


  return 0;
}


/* STOCK */

function inventory(
  item = product
) {

  if (!item) {
    return 0;
  }


  const raw =
    item.stock ??
    item.quantity ??
    item.inventory ??
    item.availableStock;


  /*
    Legacy products without a stock field
    remain purchasable.
  */

  if (
    raw === undefined ||
    raw === null ||
    raw === ""
  ) {
    return 999;
  }


  return Math.max(
    0,
    num(raw)
  );
}


/* ARRAYS */

function valueArray(value) {

  if (Array.isArray(value)) {
    return value;
  }


  if (
    typeof value ===
    "string"
  ) {

    return value
      .split(/\s*[,|/]\s*/)
      .map(value =>
        value.trim()
      )
      .filter(Boolean);
  }


  return [];
}


/* VARIANTS */

function readVariants() {

  const source =
    product.variants ||
    product.variantList ||
    product.skuList ||
    [];


  if (!Array.isArray(source)) {
    return [];
  }


  return source
    .map(
      (item, index) => {

        if (
          typeof item ===
          "string"
        ) {

          return {

            id:
              `variant-${index}`,

            color:
              item,

            size:
              "",

            price:
              salePrice(product),

            oldPrice:
              comparePrice(product),

            stock:
              inventory(product),

            sku:
              "",

            images:
              []

          };
        }


        return {

          id:
            str(
              item.id ||
              item.sku,
              `variant-${index}`
            ),

          color:
            str(
              item.color ||
              item.colour ||
              item.colorName ||
              item.colorValue
            ),

          size:
            str(
              item.size ||
              item.option ||
              item.storage ||
              item.ram ||
              item.variant ||
              item.value
            ),

          price:
            salePrice(item) ||
            salePrice(product),

          oldPrice:
            comparePrice(item) ||
            comparePrice(product),

          stock:
            (
              item.stock !== undefined ||
              item.quantity !== undefined ||
              item.inventory !== undefined ||
              item.availableStock !== undefined
            )
              ? inventory(item)
              : inventory(product),

          sku:
            str(
              item.sku ||
              item.SKU
            ),

          images:
            getImages(item)

        };

      }
    );
}


/* COLOR EXTRACTION */

function objectOptionName(item) {

  if (
    typeof item ===
    "string"
  ) {
    return str(item);
  }


  if (
    item &&
    typeof item ===
    "object"
  ) {

    return str(
      item.name ||
      item.label ||
      item.title ||
      item.value ||
      item.color ||
      item.colorName
    );
  }


  return "";
}


function readColors() {

  /*
    Priority 1:
    Actual variants
  */

  const fromVariants =
    unique(
      variants
        .map(item =>
          item.color
        )
        .filter(Boolean)
    );


  if (fromVariants.length) {
    return fromVariants;
  }


  /*
    Priority 2:
    Multiple legacy/new field names.
  */

  const sources = [

    product.colors,

    product.colours,

    product.colorOptions,

    product.colourOptions,

    product.availableColors,

    product.availableColours,

    product.productColors,

    product.productColours,

    product.variantColors,

    product.color,

    product.colour

  ];


  for (
    const source of sources
  ) {

    const values =
      valueArray(source)
        .map(
          objectOptionName
        )
        .filter(Boolean);


    /*
      A single string field e.g.
      color: "Gray" is also valid.
    */

    if (
      !values.length &&
      typeof source ===
        "object" &&
      source &&
      !Array.isArray(source)
    ) {

      const value =
        objectOptionName(source);


      if (value) {
        values.push(value);
      }
    }


    if (values.length) {
      return unique(values);
    }
  }


  return [];
}


/* SIZE EXTRACTION */

function readSizes() {

  const fromVariants =
    unique(
      variants
        .map(item =>
          item.size
        )
        .filter(Boolean)
    );


  if (fromVariants.length) {
    return fromVariants;
  }


  const sources = [

    product.sizes,
    product.sizeOptions,
    product.availableSizes,
    product.productSizes,
    product.storageOptions,
    product.size

  ];


  for (
    const source of sources
  ) {

    const values =
      valueArray(source)
        .map(
          objectOptionName
        )
        .filter(Boolean);


    if (values.length) {
      return unique(values);
    }
  }


  return [];
}


/* FIND VARIANT */

function findVariant() {

  if (!variants.length) {
    return null;
  }


  return variants.find(item => {

    const colorOK =
      !selectedColor ||
      !item.color ||
      norm(item.color) ===
        norm(selectedColor);


    const sizeOK =
      !selectedSize ||
      !item.size ||
      norm(item.size) ===
        norm(selectedSize);


    return (
      colorOK &&
      sizeOK
    );

  }) || null;
}


function currentPrice() {

  return (
    num(
      selectedVariant?.price
    ) ||
    salePrice(product)
  );
}


function currentComparePrice() {

  return (
    num(
      selectedVariant?.oldPrice
    ) ||
    comparePrice(product)
  );
}


function currentStock() {

  return selectedVariant
    ? selectedVariant.stock
    : inventory(product);
}


/* COLOR CSS */

function colorCSS(name) {

  const value =
    norm(name);


  if (
    COLORS[value]
  ) {
    return COLORS[value];
  }


  if (
    value.startsWith("#") ||
    value.startsWith("rgb") ||
    value.startsWith("hsl")
  ) {
    return value;
  }


  /*
    Browser-supported CSS color names.
  */

  const test =
    document.createElement(
      "span"
    );


  test.style.color =
    value;


  if (
    test.style.color
  ) {
    return value;
  }


  return "#d7dce0";
}


/* STARS */

function stars(rating) {

  const value =
    Math.max(
      0,
      Math.min(
        5,
        num(rating)
      )
    );


  let output = "";


  for (
    let star = 1;
    star <= 5;
    star++
  ) {

    if (
      value >= star
    ) {

      output +=
        '<i class="fa-solid fa-star"></i>';

    } else if (
      value >= star - 0.5
    ) {

      output +=
        '<i class="fa-solid fa-star-half-stroke"></i>';

    } else {

      output +=
        '<i class="fa-regular fa-star"></i>';
    }
  }


  return output;
}


/* GALLERY */

function renderGallery() {

  if (!galleryImages.length) {

    $("mainImage")
      .removeAttribute("src");


    $("thumbnailList")
      .innerHTML = "";


    $("imageCount")
      .textContent =
        "0 / 0";


    return;
  }


  currentImage =
    Math.min(
      currentImage,
      galleryImages.length - 1
    );


  $("thumbnailList")
    .innerHTML =
      galleryImages.map(
        (url, index) => `

          <button
            type="button"
            class="thumbnail ${
              index === currentImage
                ? "active"
                : ""
            }"
            data-image="${index}"
          >

            <img
              src="${esc(url)}"
              alt=""
              loading="lazy"
            >

          </button>

        `
      )
      .join("");


  document
    .querySelectorAll(
      "[data-image]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          setImage(
            num(
              button.dataset.image
            )
          );

        }
      );

    });


  setImage(
    currentImage
  );
}


function setImage(index) {

  if (!galleryImages.length) {
    return;
  }


  currentImage =
    (
      index +
      galleryImages.length
    ) %
    galleryImages.length;


  $("mainImage").src =
    galleryImages[
      currentImage
    ];


  $("imageCount")
    .textContent =
      `${
        currentImage + 1
      } / ${
        galleryImages.length
      }`;


  document
    .querySelectorAll(
      ".thumbnail"
    )
    .forEach(
      (button, index) => {

        button.classList.toggle(
          "active",
          index ===
            currentImage
        );

      }
    );
}


/* COLOR UI */

function renderColors() {

  $("colorSection").hidden =
    !colors.length;


  if (!colors.length) {

    selectedColor =
      "";

    return;
  }


  /*
    Prefer first in-stock variant color.
  */

  const firstAvailable =
    colors.find(color => {

      if (!variants.length) {
        return true;
      }


      return variants.some(
        variant =>
          norm(
            variant.color
          ) ===
            norm(color) &&
          variant.stock > 0
      );
    });


  selectedColor =
    firstAvailable ||
    colors[0];


  $("colorOptions")
    .innerHTML =
      colors.map(color => {

        let available =
          true;


        if (variants.length) {

          available =
            variants.some(
              variant =>
                norm(
                  variant.color
                ) ===
                  norm(color) &&
                variant.stock > 0
            );
        }


        return `

          <button
            type="button"
            class="color-choice ${
              available
                ? ""
                : "disabled"
            }"
            data-color="${esc(color)}"
          >

            <span class="color-swatch-wrap">

              <span
                class="color-swatch"
                style="background:${
                  esc(
                    colorCSS(color)
                  )
                }"
              ></span>

            </span>

            <span>
              ${esc(color)}
            </span>

          </button>

        `;

      })
      .join("");


  document
    .querySelectorAll(
      "[data-color]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          selectedColor =
            button.dataset.color;


          /*
            If selected size is unavailable
            for new color, choose first
            available size.
          */

          if (
            variants.length &&
            selectedSize
          ) {

            const exact =
              variants.find(
                variant =>
                  norm(
                    variant.color
                  ) ===
                    norm(
                      selectedColor
                    ) &&
                  norm(
                    variant.size
                  ) ===
                    norm(
                      selectedSize
                    ) &&
                  variant.stock > 0
              );


            if (!exact) {

              selectedSize =
                variants.find(
                  variant =>
                    norm(
                      variant.color
                    ) ===
                      norm(
                        selectedColor
                      ) &&
                    variant.stock > 0 &&
                    variant.size
                )?.size ||
                "";
            }
          }


          updateVariant();

        }
      );

    });
}


/* SIZE UI */

function renderSizes() {

  $("sizeSection").hidden =
    !sizes.length;


  if (!sizes.length) {

    selectedSize =
      "";

    return;
  }


  let availableSizes =
    sizes;


  if (
    variants.length &&
    selectedColor
  ) {

    const filtered =
      unique(
        variants
          .filter(
            item =>
              norm(
                item.color
              ) ===
                norm(
                  selectedColor
                ) &&
              item.stock > 0
          )
          .map(item =>
            item.size
          )
          .filter(Boolean)
      );


    if (filtered.length) {
      availableSizes =
        filtered;
    }
  }


  if (
    !selectedSize ||
    !availableSizes.some(
      item =>
        norm(item) ===
        norm(
          selectedSize
        )
    )
  ) {

    selectedSize =
      availableSizes[0] ||
      sizes[0];
  }


  $("sizeOptions")
    .innerHTML =
      sizes.map(size => {

        let available =
          true;


        if (variants.length) {

          available =
            variants.some(
              variant => {

                const colorOK =
                  !selectedColor ||
                  !variant.color ||
                  norm(
                    variant.color
                  ) ===
                    norm(
                      selectedColor
                    );


                return (
                  colorOK &&
                  norm(
                    variant.size
                  ) ===
                    norm(size) &&
                  variant.stock > 0
                );

              }
            );
        }


        return `

          <button
            type="button"
            class="size-choice ${
              available
                ? ""
                : "disabled"
            }"
            data-size="${esc(size)}"
          >
            ${esc(size)}
          </button>

        `;

      })
      .join("");


  document
    .querySelectorAll(
      "[data-size]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          selectedSize =
            button.dataset.size;


          updateVariant();

        }
      );

    });
}


/* UPDATE VARIANT */

function updateVariant() {

  selectedVariant =
    findVariant();


  $("selectedColorLabel")
    .textContent =
      selectedColor ||
      "—";


  $("selectedSizeLabel")
    .textContent =
      selectedSize ||
      "—";


  document
    .querySelectorAll(
      "[data-color]"
    )
    .forEach(button => {

      button.classList.toggle(
        "active",
        norm(
          button.dataset.color
        ) ===
          norm(
            selectedColor
          )
      );

    });


  renderSizes();


  document
    .querySelectorAll(
      "[data-size]"
    )
    .forEach(button => {

      button.classList.toggle(
        "active",
        norm(
          button.dataset.size
        ) ===
          norm(
            selectedSize
          )
      );

    });


  selectedVariant =
    findVariant();


  quantity = 1;


  galleryImages =
    selectedVariant
      ?.images
      ?.length
        ? selectedVariant.images
        : getImages(product);


  currentImage =
    0;


  renderGallery();


  renderPriceStock();
}


/* PRICE / STOCK */

function renderPriceStock() {

  const price =
    currentPrice();


  const old =
    currentComparePrice();


  const stock =
    currentStock();


  $("productPrice")
    .textContent =
      money(price);


  if (
    old > price &&
    price > 0
  ) {

    $("oldPrice").hidden =
      false;


    $("oldPrice")
      .textContent =
        money(old);


    const discount =
      Math.round(
        (
          (
            old - price
          ) /
          old
        ) *
        100
      );


    $("discountBadge")
      .textContent =
        `${discount}% OFF`;


    $("discountSmall")
      .textContent =
        `${discount}% OFF`;


    $("discountBadge").hidden =
      false;


    $("discountSmall").hidden =
      false;

  } else {

    $("oldPrice").hidden =
      true;


    $("discountBadge").hidden =
      true;


    $("discountSmall").hidden =
      true;
  }


  $("stockStatus")
    .classList.remove(
      "out",
      "low"
    );


  if (stock <= 0) {

    $("stockStatus")
      .textContent =
        "Out of Stock";


    $("stockStatus")
      .classList.add("out");


    $("availableStock")
      .textContent =
        "Currently unavailable";

  } else if (
    stock <= 5
  ) {

    $("stockStatus")
      .textContent =
        `Only ${stock} left`;


    $("stockStatus")
      .classList.add("low");


    $("availableStock")
      .textContent =
        `${stock} available`;

  } else {

    $("stockStatus")
      .textContent =
        "In Stock";


    $("availableStock")
      .textContent =
        stock >= 999
          ? "Available"
          : `${stock} available`;
  }


  const sku =
    str(
      selectedVariant?.sku ||
      product.sku
    );


  $("sku").hidden =
    !sku;


  $("sku").textContent =
    sku
      ? `SKU: ${sku}`
      : "";


  if (
    stock > 0 &&
    quantity < 1
  ) {
    quantity = 1;
  }


  if (
    stock < 999 &&
    quantity > stock
  ) {

    quantity =
      Math.max(
        1,
        stock
      );
  }


  $("quantityValue")
    .textContent =
      quantity;


  $("minusQuantity")
    .disabled =
      quantity <= 1;


  $("plusQuantity")
    .disabled =
      stock <= 0 ||
      (
        stock < 999 &&
        quantity >= stock
      );


  $("totalPrice")
    .textContent =
      money(
        price *
        Math.max(
          1,
          quantity
        )
      );


  const canPurchase =
    price > 0 &&
    stock > 0;


  $("addCart").disabled =
    !canPurchase;


  $("buyNow").disabled =
    !canPurchase;
}


/* DELIVERY FIX */

function explicitDeliveryValue(...values) {

  for (
    const value of values
  ) {

    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {

      const parsed =
        num(value, NaN);


      if (
        Number.isFinite(parsed)
      ) {
        return parsed;
      }
    }
  }


  return null;
}


function deliveryCharge() {

  if (
    product.freeDelivery === true ||
    norm(
      product.freeDelivery
    ) === "true"
  ) {
    return 0;
  }


  const charges =
    product.deliveryCharges ||
    product.shippingCharges ||
    {};


  const location =
    norm(
      deliveryLocation
    );


  let value = null;


  if (
    location === "dhaka"
  ) {

    value =
      explicitDeliveryValue(

        charges.dhaka,

        charges.insideDhaka,

        product.dhakaDeliveryCharge,

        product.insideDhakaDeliveryCharge,

        product.deliveryChargeDhaka,

        product.shippingDhaka,

        product.deliveryCharge,

        product.deliveryFee,

        product.shippingFee

      );


    return value ??
      DEFAULT_DELIVERY.dhaka;
  }


  if (
    location === "chattogram"
  ) {

    value =
      explicitDeliveryValue(

        charges.chattogram,

        charges.chittagong,

        charges.outsideDhaka,

        product.chattogramDeliveryCharge,

        product.chittagongDeliveryCharge,

        product.outsideDhakaDeliveryCharge,

        product.deliveryChargeOutsideDhaka,

        product.deliveryCharge,

        product.deliveryFee,

        product.shippingFee

      );


    return value ??
      DEFAULT_DELIVERY.chattogram;
  }


  value =
    explicitDeliveryValue(

      charges.outsideDhaka,

      charges.outside,

      product.outsideDhakaDeliveryCharge,

      product.deliveryChargeOutsideDhaka,

      product.outsideDeliveryCharge,

      product.deliveryCharge,

      product.deliveryFee,

      product.shippingFee

    );


  return value ??
    DEFAULT_DELIVERY.outsideDhaka;
}


function renderDelivery() {

  const charge =
    deliveryCharge();


  $("locationText")
    .textContent =
      deliveryLocation;


  $("deliveryCharge")
    .textContent =
      charge === 0
        ? "FREE"
        : money(charge);


  $("deliveryTitle")
    .textContent =
      charge === 0
        ? "Free Delivery"
        : "Standard Delivery";


  const customTime =
    str(
      product.deliveryTime ||
      product.estimatedDelivery ||
      product.deliveryEstimate
    );


  if (customTime) {

    $("deliveryTime")
      .textContent =
        customTime;

  } else {

    const location =
      norm(
        deliveryLocation
      );


    $("deliveryTime")
      .textContent =
        location === "dhaka"
          ? "Estimated 1–3 business days"
          : "Estimated 2–5 business days";
  }


  const returnValue =
    str(
      product.returnDays ||
      product.returnPolicy
    );


  $("returnText")
    .textContent =
      returnValue
        ? /^\d+$/.test(
            returnValue
          )
          ? `${returnValue} Days Return`
          : returnValue
        : "7 Days Return";
}


/* SELLER */

function findSellerId() {

  const embedded =
    product.seller ||
    product.sellerInfo ||
    {};


  return str(

    product.sellerId ||

    product.sellerUid ||

    product.sellerUID ||

    product.ownerId ||

    product.createdBy ||

    embedded.id ||

    embedded.uid ||

    embedded.sellerId

  );
}


async function loadSeller() {

  sellerId =
    findSellerId();


  seller =
    product.seller ||
    product.sellerInfo ||
    {};


  if (sellerId) {

    /*
      First try sellers/{id}
    */

    try {

      const sellerDocument =
        await getDoc(
          doc(
            db,
            "sellers",
            sellerId
          )
        );


      if (
        sellerDocument.exists()
      ) {

        seller = {

          ...seller,

          ...sellerDocument.data(),

          id:
            sellerDocument.id

        };

      } else {

        /*
          Some projects store seller
          profile in users/{uid}.
        */

        const userDocument =
          await getDoc(
            doc(
              db,
              "users",
              sellerId
            )
          );


        if (
          userDocument.exists()
        ) {

          seller = {

            ...seller,

            ...userDocument.data(),

            id:
              userDocument.id

          };
        }
      }

    } catch (error) {

      console.warn(
        "Seller load:",
        error
      );
    }
  }


  renderSeller();
}


function renderSeller() {

  const name =
    str(

      seller.storeName ||

      seller.shopName ||

      seller.businessName ||

      seller.displayName ||

      seller.name ||

      seller.sellerName ||

      product.storeName ||

      product.shopName ||

      product.sellerName,

      "Bazvor Seller"

    );


  $("sellerName")
    .textContent =
      name;


  const rating =
    num(
      seller.rating ||
      seller.sellerRating ||
      product.sellerRating
    );


  $("sellerRating")
    .textContent =
      rating
        ? rating.toFixed(1)
        : "—";


  const positive =
    num(
      seller.positiveRating ||
      seller.positivePercent
    );


  $("sellerPositive")
    .textContent =
      positive
        ? `${positive}% positive`
        : "Active seller";


  $("sellerProducts")
    .textContent =
      num(
        seller.productCount ||
        seller.productsCount ||
        product.sellerProductCount
      ) ||
      "—";


  $("sellerVerified")
    .hidden =
      !(
        seller.verified === true ||
        seller.isVerified === true ||
        product.sellerVerified === true
      );


  const logo =
    imageValue(
      seller.logo ||
      seller.storeLogo ||
      seller.image ||
      seller.photo ||
      seller.photoURL ||
      seller.avatar ||
      product.sellerLogo ||
      product.sellerImage
    );


  if (logo) {

    $("sellerLogo")
      .innerHTML =
        `<img src="${esc(logo)}" alt="">`;
  }
}


/* PRODUCT DETAILS */

function renderBasicProduct() {

  const name =
    str(
      product.productName ||
      product.name ||
      product.title,
      "Product"
    );


  document.title =
    `${name} — Bazvor`;


  $("productName")
    .textContent =
      name;


  $("mainImage").alt =
    name;


  $("verifiedProduct")
    .hidden =
      !(
        product.verified === true ||
        product.isVerified === true ||
        product.bazvorVerified === true
      );


  $("soldCount")
    .textContent =
      num(
        product.soldCount ??
        product.totalSold ??
        product.ordersCount
      )
        .toLocaleString(
          "en-BD"
        );


  $("description")
    .textContent =
      str(
        product.description ||
        product.shortDescription,
        "No description available for this product."
      );


  variants =
    readVariants();


  colors =
    readColors();


  sizes =
    readSizes();


  renderColors();

  renderSizes();

  updateVariant();

  renderSpecifications();

  renderPolicies();

  renderDelivery();
}


/* SPECIFICATIONS */

function renderSpecifications() {

  const specs = [];


  const add = (
    label,
    value
  ) => {

    const clean =
      str(value);


    if (clean) {

      specs.push(
        [label, clean]
      );
    }
  };


  add(
    "Brand",
    product.brand ||
    product.brandName
  );


  add(
    "Category",
    product.categoryName ||
    product.category
  );


  add(
    "SKU",
    product.sku
  );


  add(
    "Condition",
    product.condition
  );


  add(
    "Origin",
    product.origin ||
    product.country
  );


  add(
    "Weight",
    product.weight
  );


  if (colors.length) {

    add(
      "Colors",
      colors.join(", ")
    );
  }


  if (sizes.length) {

    add(
      "Options",
      sizes.join(", ")
    );
  }


  if (
    product.specifications &&
    typeof product.specifications ===
      "object" &&
    !Array.isArray(
      product.specifications
    )
  ) {

    Object.entries(
      product.specifications
    )
      .forEach(
        ([key, value]) => {

          add(
            key,
            value
          );

        }
      );
  }


  $("specifications")
    .innerHTML =
      specs.length
        ? specs
            .map(
              ([label,value]) => `

                <div class="spec-row">

                  <span>
                    ${esc(label)}
                  </span>

                  <span>
                    ${esc(value)}
                  </span>

                </div>

              `
            )
            .join("")
        : `

            <div class="spec-row">

              <span>
                Information
              </span>

              <span>
                No specifications available
              </span>

            </div>

          `;
}


/* POLICY */

function renderPolicies() {

  const returnPolicy =
    str(
      product.returnPolicy ||
      product.returnDays
    );


  const warranty =
    str(
      product.warranty ||
      product.warrantyPolicy
    );


  const rows = [];


  if (returnPolicy) {

    rows.push(`

      <div class="policy-item">

        <i class="fa-solid fa-rotate-left"></i>

        <div>

          <strong>
            Return Policy
          </strong>

          <span>
            ${
              /^\d+$/.test(returnPolicy)
                ? `${esc(returnPolicy)} days return`
                : esc(returnPolicy)
            }
          </span>

        </div>

      </div>

    `);

  }


  if (warranty) {

    rows.push(`

      <div class="policy-item">

        <i class="fa-solid fa-shield-halved"></i>

        <div>

          <strong>
            Warranty
          </strong>

          <span>
            ${esc(warranty)}
          </span>

        </div>

      </div>

    `);

  }


  $("policyAccordion").hidden =
    !rows.length;


  $("policyList")
    .innerHTML =
      rows.join("");
}


/* REVIEWS */

function timestamp(value) {

  if (!value) return 0;


  if (
    typeof value.toMillis ===
    "function"
  ) {
    return value.toMillis();
  }


  if (
    typeof value.seconds ===
    "number"
  ) {
    return value.seconds * 1000;
  }


  return 0;
}


function reviewDate(value) {

  const time =
    timestamp(value);


  if (!time) return "";


  return new Date(time)
    .toLocaleDateString(
      "en-BD",
      {
        day: "numeric",
        month: "short",
        year: "numeric"
      }
    );
}


/* This keeps product-level rating fields synced.
   Home page cards can use these fields. */

async function syncProductRating() {

  try {

    const reviewsSnapshot =
      await getDocs(
        collection(
          db,
          "products",
          productId,
          "reviews"
        )
      );


    let total = 0;

    let count = 0;


    reviewsSnapshot.forEach(
      snapshot => {

        const rating =
          num(
            snapshot.data()
              ?.rating
          );


        if (
          rating >= 1 &&
          rating <= 5
        ) {

          total += rating;

          count++;
        }

      }
    );


    const average =
      count
        ? Number(
            (
              total /
              count
            ).toFixed(2)
          )
        : 0;


    await setDoc(
      doc(
        db,
        "products",
        productId
      ),
      {

        /*
          New preferred names
        */

        ratingAverage:
          average,

        ratingCount:
          count,

        reviewCount:
          count,


        /*
          Legacy compatibility names
          so current home product cards
          can still read rating.
        */

        rating:
          average,

        averageRating:
          average,

        avgRating:
          average,

        reviewsCount:
          count,

        totalReviews:
          count

      },
      {
        merge: true
      }
    );


    /*
      Keep current local product synced.
    */

    product.ratingAverage =
      average;

    product.averageRating =
      average;

    product.rating =
      average;

    product.avgRating =
      average;

    product.reviewCount =
      count;

    product.ratingCount =
      count;

    product.reviewsCount =
      count;

    product.totalReviews =
      count;


  } catch (error) {

    console.warn(
      "Rating aggregate sync:",
      error
    );
  }
}


function listenReviews() {

  if (
    typeof unsubscribeReviews ===
    "function"
  ) {
    unsubscribeReviews();
  }


  unsubscribeReviews =
    onSnapshot(
      collection(
        db,
        "products",
        productId,
        "reviews"
      ),

      snapshot => {

        reviews =
          snapshot.docs
            .map(doc => ({
              id: doc.id,
              ...doc.data()
            }))
            .sort(
              (a,b) =>
                timestamp(
                  b.createdAt
                ) -
                timestamp(
                  a.createdAt
                )
            );


        renderReviews();

      },

      error => {

        console.warn(
          "Review listener:",
          error
        );


        reviews =
          Array.isArray(
            product.reviews
          )
            ? product.reviews
            : [];


        renderReviews();
      }
    );
}


function calculateReviewStats() {

  if (reviews.length) {

    let total = 0;


    reviews.forEach(review => {

      total +=
        num(
          review.rating
        );

    });


    return {

      average:
        total /
        reviews.length,

      count:
        reviews.length

    };
  }


  return {

    average:
      num(
        product.ratingAverage ??
        product.averageRating ??
        product.rating ??
        product.avgRating
      ),

    count:
      num(
        product.reviewCount ??
        product.ratingCount ??
        product.reviewsCount ??
        product.totalReviews
      )

  };
}


function renderReviews() {

  const stats =
    calculateReviewStats();


  const average =
    Math.max(
      0,
      Math.min(
        5,
        stats.average
      )
    );


  $("summaryStars")
    .innerHTML =
      stars(average);


  $("reviewStars")
    .innerHTML =
      stars(average);


  $("summaryRating")
    .textContent =
      average.toFixed(1);


  $("summaryReviews")
    .textContent =
      `(${stats.count} review${
        stats.count === 1
          ? ""
          : "s"
      })`;


  $("reviewAverage")
    .textContent =
      average.toFixed(1);


  $("reviewCountText")
    .textContent =
      stats.count
        ? `${stats.count} customer review${
            stats.count === 1
              ? ""
              : "s"
          }`
        : "No reviews yet";


  $("reviewsDescription")
    .textContent =
      stats.count
        ? `${stats.count} customer review${
            stats.count === 1
              ? ""
              : "s"
          }`
        : "Ratings from customers";


  if (!reviews.length) {

    $("reviewList")
      .innerHTML = `

        <div class="no-reviews">

          <i class="fa-regular fa-comment-dots"></i>

          <strong>
            No reviews yet
          </strong>

          <span>
            Be the first customer to review this product.
          </span>

        </div>

      `;

    return;
  }


  $("reviewList")
    .innerHTML =
      reviews.map(review => {

        const name =
          str(
            review.userName ||
            review.customerName ||
            review.name,
            "Customer"
          );


        const avatar =
          imageValue(
            review.userPhoto ||
            review.photoURL
          );


        return `

          <article class="review-item">

            <div class="review-top">

              <div class="review-avatar">

                ${
                  avatar
                    ? `
                      <img
                        src="${esc(avatar)}"
                        alt=""
                      >
                    `
                    : esc(
                        name
                          .charAt(0)
                          .toUpperCase()
                      )
                }

              </div>

              <div class="review-user">

                <strong>
                  ${esc(name)}
                </strong>

                <span>
                  ${esc(
                    reviewDate(
                      review.createdAt
                    )
                  )}
                </span>

              </div>

            </div>


            <div>

              <span class="stars">
                ${stars(
                  review.rating
                )}
              </span>

              ${
                review.verifiedPurchase ===
                true
                  ? `
                    <span class="verified-review">
                      ✓ Verified Purchase
                    </span>
                  `
                  : ""
              }

            </div>


            ${
              str(
                review.comment ||
                review.text ||
                review.review
              )
                ? `
                  <p class="review-comment">
                    ${esc(
                      review.comment ||
                      review.text ||
                      review.review
                    )}
                  </p>
                `
                : ""
            }

          </article>

        `;

      })
      .join("");
}


function updateReviewPicker() {

  document
    .querySelectorAll(
      "[data-review-rating]"
    )
    .forEach(button => {

      const value =
        num(
          button.dataset
            .reviewRating
        );


      const active =
        value <=
        selectedReviewRating;


      button.classList.toggle(
        "active",
        active
      );


      button.querySelector("i")
        .className =
          active
            ? "fa-solid fa-star"
            : "fa-regular fa-star";

    });
}


function openReview() {

  if (!currentUser) {

    location.href =
      `auth.html?redirect=${
        encodeURIComponent(
          location.href
        )
      }`;

    return;
  }


  $("reviewForm").hidden =
    false;


  $("reviewForm")
    .scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
}


function closeReview() {

  selectedReviewRating =
    0;


  $("reviewComment").value =
    "";


  $("reviewForm").hidden =
    true;


  updateReviewPicker();
}


async function submitReview() {

  if (!currentUser) {
    return;
  }


  if (
    selectedReviewRating < 1
  ) {

    toast(
      "Please select a rating"
    );

    return;
  }


  const comment =
    $("reviewComment")
      .value
      .trim();


  if (!comment) {

    toast(
      "Please write your review"
    );

    return;
  }


  $("submitReview").disabled =
    true;


  try {

    /*
      User UID = review document ID.
      Updating review doesn't create
      duplicates.
    */

    const reviewRef =
      doc(
        db,
        "products",
        productId,
        "reviews",
        currentUser.uid
      );


    const existing =
      await getDoc(
        reviewRef
      );


    const createdAt =
      existing.exists()
        ? existing.data()
            .createdAt ||
          serverTimestamp()
        : serverTimestamp();


    await setDoc(
      reviewRef,
      {

        userId:
          currentUser.uid,

        userName:
          currentUser.displayName ||
          "Customer",

        userPhoto:
          currentUser.photoURL ||
          "",

        rating:
          selectedReviewRating,

        comment,

        verifiedPurchase:
          existing.exists()
            ? existing.data()
                .verifiedPurchase ===
                  true
            : false,

        createdAt,

        updatedAt:
          serverTimestamp()

      },
      {
        merge: true
      }
    );


    /*
      Critical fix:
      Write the new aggregate back
      to products/{productId}.
      Home cards can now show it.
    */

    await syncProductRating();


    closeReview();


    toast(
      existing.exists()
        ? "Review updated"
        : "Review submitted"
    );

  } catch (error) {

    console.error(
      "Review submit:",
      error
    );


    toast(
      error.code ===
        "permission-denied"
        ? "Review permission denied"
        : "Unable to submit review"
    );

  } finally {

    $("submitReview")
      .disabled =
        false;
  }
}


/* CHAT: GO TO MESSAGE PAGE */

function openChat() {

  if (!sellerId) {

    toast(
      "Seller chat is unavailable"
    );

    return;
  }


  /*
    You requested:
    Chat button -> message page.

    Message page receives enough
    information to open/create
    seller conversation later.
  */

  const url =
    new URL(
      "message.html",
      location.href
    );


  url.searchParams.set(
    "sellerId",
    sellerId
  );


  url.searchParams.set(
    "productId",
    productId
  );


  url.searchParams.set(
    "action",
    "chat"
  );


  location.href =
    url.href;
}


/* VISIT STORE */

function visitStore() {

  if (!sellerId) {

    toast(
      "Seller store is unavailable"
    );

    return;
  }


  location.href =
    `store.html?sellerId=${
      encodeURIComponent(
        sellerId
      )
    }`;
}


/* WISHLIST */

function getWishlist() {

  try {

    const data =
      JSON.parse(
        localStorage.getItem(
          WISHLIST_KEY
        ) ||
        "[]"
      );


    return Array.isArray(data)
      ? data.map(String)
      : [];

  } catch {

    return [];
  }
}


function renderWishlist() {

  const active =
    getWishlist()
      .includes(
        String(productId)
      );


  [
    $("headerWishlist"),
    $("galleryWishlist"),
    $("infoWishlist")
  ].forEach(button => {

    button.classList.toggle(
      "active",
      active
    );


    const icon =
      button.querySelector("i");


    icon.className =
      active
        ? "fa-solid fa-heart"
        : "fa-regular fa-heart";

  });


  $("infoWishlist")
    .querySelector("span")
    .textContent =
      active
        ? "Saved"
        : "Wishlist";
}


function toggleWishlist() {

  const id =
    String(productId);


  let list =
    getWishlist();


  if (list.includes(id)) {

    list =
      list.filter(
        item => item !== id
      );


    toast(
      "Removed from wishlist"
    );

  } else {

    list.push(id);


    toast(
      "Added to wishlist"
    );
  }


  localStorage.setItem(
    WISHLIST_KEY,
    JSON.stringify(list)
  );


  renderWishlist();
}


/* CART */

function cart() {

  try {

    const data =
      JSON.parse(
        localStorage.getItem(
          CART_KEY
        ) ||
        "[]"
      );


    return Array.isArray(data)
      ? data
      : [];

  } catch {

    return [];
  }
}


function saveCart(data) {

  localStorage.setItem(
    CART_KEY,
    JSON.stringify(data)
  );


  renderCartCount();


  window.dispatchEvent(
    new CustomEvent(
      "bazvorCartUpdated"
    )
  );
}


function renderCartCount() {

  const count =
    cart().reduce(
      (total,item) =>
        total +
        Math.max(
          1,
          num(
            item.quantity,
            1
          )
        ),
      0
    );


  $("cartCount").hidden =
    count <= 0;


  $("cartCount")
    .textContent =
      count > 99
        ? "99+"
        : count;
}


function validatePurchase() {

  if (
    currentStock() <= 0
  ) {

    toast(
      "Product is out of stock"
    );

    return false;
  }


  if (
    colors.length &&
    !selectedColor
  ) {

    toast(
      "Please select a color"
    );


    $("colorSection")
      .scrollIntoView({
        behavior: "smooth"
      });


    return false;
  }


  if (
    sizes.length &&
    !selectedSize
  ) {

    toast(
      "Please select an option"
    );

    return false;
  }


  if (
    variants.length &&
    !selectedVariant
  ) {

    toast(
      "Selected combination is unavailable"
    );

    return false;
  }


  return true;
}


function buildCartItem() {

  return {

    id:
      productId,

    productId,

    variantId:
      selectedVariant?.id ||
      "",

    name:
      str(
        product.productName ||
        product.name,
        "Product"
      ),

    productName:
      str(
        product.productName ||
        product.name,
        "Product"
      ),

    image:
      galleryImages[0] ||
      getImages(product)[0] ||
      "",

    price:
      currentPrice(),

    quantity,

    color:
      selectedColor ||
      null,

    size:
      selectedSize ||
      null,

    sellerId:
      sellerId ||
      null,

    deliveryLocation,

    deliveryCharge:
      deliveryCharge(),

    freeDelivery:
      deliveryCharge() === 0,

    addedAt:
      Date.now()

  };
}


function addToCart() {

  if (!validatePurchase()) {
    return;
  }


  const list =
    cart();


  const newItem =
    buildCartItem();


  const existing =
    list.find(item =>

      String(
        item.productId ||
        item.id
      ) ===
        String(productId) &&

      String(
        item.variantId ||
        ""
      ) ===
        String(
          newItem.variantId ||
          ""
        ) &&

      norm(item.color) ===
        norm(
          newItem.color
        ) &&

      norm(item.size) ===
        norm(
          newItem.size
        )

    );


  if (existing) {

    const maximum =
      currentStock();


    const total =
      num(
        existing.quantity,
        1
      ) +
      quantity;


    existing.quantity =
      maximum >= 999
        ? total
        : Math.min(
            maximum,
            total
          );

  } else {

    list.push(
      newItem
    );
  }


  saveCart(list);


  toast(
    "Added to cart"
  );
}


function buyNow() {

  if (!validatePurchase()) {
    return;
  }


  localStorage.setItem(
    "bazvorBuyNow",
    JSON.stringify(
      buildCartItem()
    )
  );


  location.href =
    "checkout.html";
}


/* SHARE */

async function share() {

  const name =
    str(
      product.productName ||
      product.name,
      "Bazvor Product"
    );


  if (navigator.share) {

    try {

      await navigator.share({

        title:
          `${name} — Bazvor`,

        text:
          `Check out ${name} on Bazvor`,

        url:
          location.href

      });

    } catch {}

    return;
  }


  try {

    await navigator.clipboard
      .writeText(
        location.href
      );


    toast(
      "Product link copied"
    );

  } catch {

    toast(
      "Unable to share product"
    );
  }
}


/* RELATED */

async function loadRelated() {

  let list = [];


  const categoryId =
    str(
      product.categoryId
    );


  const category =
    str(
      product.category
    );


  try {

    if (categoryId) {

      const snapshot =
        await getDocs(
          query(
            collection(
              db,
              "products"
            ),
            where(
              "categoryId",
              "==",
              categoryId
            ),
            limit(12)
          )
        );


      list =
        snapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

    } else if (category) {

      const snapshot =
        await getDocs(
          query(
            collection(
              db,
              "products"
            ),
            where(
              "category",
              "==",
              category
            ),
            limit(12)
          )
        );


      list =
        snapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
    }


    if (!list.length) {

      const snapshot =
        await getDocs(
          query(
            collection(
              db,
              "products"
            ),
            limit(12)
          )
        );


      list =
        snapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
    }


    list =
      list.filter(
        item =>
          item.id !==
          productId
      );


    renderRelated(list);

  } catch (error) {

    console.warn(
      "Related:",
      error
    );
  }
}


function renderRelated(list) {

  $("relatedProducts")
    .innerHTML =
      list.slice(0,10)
        .map(item => {

          const name =
            str(
              item.productName ||
              item.name,
              "Product"
            );


          const image =
            getImages(item)[0] ||
            "";


          return `

            <article
              class="related-card"
              data-related="${esc(
                item.id
              )}"
            >

              <div class="related-image">

                ${
                  image
                    ? `
                      <img
                        src="${esc(image)}"
                        alt="${esc(name)}"
                        loading="lazy"
                      >
                    `
                    : ""
                }

              </div>

              <div class="related-card-content">

                <div class="related-name">
                  ${esc(name)}
                </div>

                <div class="related-price">
                  ${money(
                    salePrice(item)
                  )}
                </div>

              </div>

            </article>

          `;

        })
        .join("");


  document
    .querySelectorAll(
      "[data-related]"
    )
    .forEach(card => {

      card.addEventListener(
        "click",
        () => {

          location.href =
            `product-details.html?id=${
              encodeURIComponent(
                card.dataset
                  .related
              )
            }`;

        }
      );

    });
}


/* ACCORDIONS */

function setupAccordions() {

  document
    .querySelectorAll(
      "[data-panel]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const panel =
            $(
              button.dataset
                .panel
            );


          const open =
            panel.classList
              .contains("open");


          panel.classList.toggle(
            "open",
            !open
          );


          button.classList.toggle(
            "open",
            !open
          );

        }
      );

    });
}


/* LOAD PRODUCT */

async function loadProduct() {

  productId =
    readProductId();


  if (!productId) {

    showError(
      "No product ID was provided."
    );

    return;
  }


  try {

    const snapshot =
      await getDoc(
        doc(
          db,
          "products",
          productId
        )
      );


    if (!snapshot.exists()) {

      showError(
        "This product may have been removed."
      );

      return;
    }


    product = {

      id:
        snapshot.id,

      ...snapshot.data()

    };


    galleryImages =
      getImages(product);


    renderBasicProduct();

    renderGallery();

    renderWishlist();

    await loadSeller();

    listenReviews();

    loadRelated();


    $("loading").hidden =
      true;


    $("productContent").hidden =
      false;


    $("buybar").hidden =
      false;


  } catch (error) {

    console.error(
      "Product load:",
      error
    );


    showError(
      "Unable to load this product."
    );
  }
}


function showError(message) {

  $("loading").hidden =
    true;


  $("productContent").hidden =
    true;


  $("buybar").hidden =
    true;


  $("errorState").hidden =
    false;


  $("errorText")
    .textContent =
      message;
}


/* EVENTS */

function setupEvents() {

  setupAccordions();

  renderCartCount();


  $("backButton")
    .addEventListener(
      "click",
      () => {

        if (
          history.length > 1
        ) {

          history.back();

        } else {

          location.href =
            "home.html";
        }
      }
    );


  $("homeButton")
    .addEventListener(
      "click",
      () => {

        location.href =
          "home.html";

      }
    );


  $("cartButton")
    .addEventListener(
      "click",
      () => {

        location.href =
          "cart.html";

      }
    );


  [
    $("headerWishlist"),
    $("galleryWishlist"),
    $("infoWishlist")
  ].forEach(button => {

    button.addEventListener(
      "click",
      toggleWishlist
    );

  });


  $("shareButton")
    .addEventListener(
      "click",
      share
    );


  $("previousImage")
    .addEventListener(
      "click",
      () => {

        setImage(
          currentImage - 1
        );

      }
    );


  $("nextImage")
    .addEventListener(
      "click",
      () => {

        setImage(
          currentImage + 1
        );

      }
    );


  $("mainImageArea")
    .addEventListener(
      "touchstart",
      event => {

        touchStart =
          event.changedTouches[0]
            .clientX;

      },
      {
        passive: true
      }
    );


  $("mainImageArea")
    .addEventListener(
      "touchend",
      event => {

        const distance =
          touchStart -
          event.changedTouches[0]
            .clientX;


        if (
          Math.abs(distance) <
          45
        ) {
          return;
        }


        setImage(
          currentImage +
          (
            distance > 0
              ? 1
              : -1
          )
        );

      },
      {
        passive: true
      }
    );


  $("mainImage")
    .addEventListener(
      "click",
      () => {

        if (!galleryImages.length) {
          return;
        }


        $("viewerImage").src =
          galleryImages[
            currentImage
          ];


        $("imageViewer").hidden =
          false;

      }
    );


  $("closeViewer")
    .addEventListener(
      "click",
      () => {

        $("imageViewer").hidden =
          true;

      }
    );


  $("imageViewer")
    .addEventListener(
      "click",
      event => {

        if (
          event.target ===
          $("imageViewer")
        ) {

          $("imageViewer").hidden =
            true;
        }
      }
    );


  $("minusQuantity")
    .addEventListener(
      "click",
      () => {

        if (
          quantity > 1
        ) {

          quantity--;

          renderPriceStock();
        }
      }
    );


  $("plusQuantity")
    .addEventListener(
      "click",
      () => {

        const stock =
          currentStock();


        if (
          stock >= 999 ||
          quantity < stock
        ) {

          quantity++;

          renderPriceStock();
        }
      }
    );


  $("addCart")
    .addEventListener(
      "click",
      addToCart
    );


  $("buyNow")
    .addEventListener(
      "click",
      buyNow
    );


  /*
    CHAT -> MESSAGE PAGE
  */

  $("chatButton")
    .addEventListener(
      "click",
      openChat
    );


  $("storeButton")
    .addEventListener(
      "click",
      visitStore
    );


  $("ratingSummary")
    .addEventListener(
      "click",
      () => {

        $("reviewsSection")
          .scrollIntoView({
            behavior: "smooth"
          });

      }
    );


  $("writeReview")
    .addEventListener(
      "click",
      openReview
    );


  $("closeReview")
    .addEventListener(
      "click",
      closeReview
    );


  $("cancelReview")
    .addEventListener(
      "click",
      closeReview
    );


  document
    .querySelectorAll(
      "[data-review-rating]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          selectedReviewRating =
            num(
              button.dataset
                .reviewRating
            );


          updateReviewPicker();

        }
      );

    });


  $("submitReview")
    .addEventListener(
      "click",
      submitReview
    );


  $("locationButton")
    .addEventListener(
      "click",
      () => {

        $("locationSheet").hidden =
          false;

      }
    );


  $("sheetBackdrop")
    .addEventListener(
      "click",
      () => {

        $("locationSheet").hidden =
          true;

      }
    );


  document
    .querySelectorAll(
      "[data-delivery-location]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          deliveryLocation =
            button.dataset
              .deliveryLocation;


          localStorage.setItem(
            DELIVERY_KEY,
            deliveryLocation
          );


          $("locationSheet").hidden =
            true;


          renderDelivery();


          toast(
            `Delivery area: ${deliveryLocation}`
          );

        }
      );

    });


  $("seeAllRelated")
    .addEventListener(
      "click",
      () => {

        const category =
          str(
            product?.categoryId ||
            product?.category
          );


        location.href =
          category
            ? `home.html?category=${
                encodeURIComponent(
                  category
                )
              }`
            : "home.html";

      }
    );
}


/* AUTH */

onAuthStateChanged(
  auth,
  user => {

    currentUser =
      user || null;

  }
);


/* INIT */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    setupEvents();

    loadProduct();

  }
);


/* CLEANUP */

window.addEventListener(
  "beforeunload",
  () => {

    if (
      typeof unsubscribeReviews ===
      "function"
    ) {

      unsubscribeReviews();
    }

  }
);