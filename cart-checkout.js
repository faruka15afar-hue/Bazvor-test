"use strict";


/* =========================================================
   PAYMENT CONFIG
   CHANGE ONLY THESE NUMBERS
========================================================= */

const PAYMENT_CONFIG = {

  bkash:{
    name:"bKash Personal",

    // CHANGE
    number:"01XXXXXXXXX"
  },

  nagad:{
    name:"Nagad Personal",

    // CHANGE
    number:"01XXXXXXXXX"
  }

};



/* =========================================================
   IMPORTANT:
   CREATE API IMMEDIATELY.

   This means Checkout button works even while
   Firebase modules are still downloading.
========================================================= */

let firebaseReady =
  false;

let firebaseLoadError =
  null;

let auth =
  null;

let db =
  null;

let Firebase = {};


let checkoutData =
  null;

let currentUser =
  null;

let addresses =
  [];

let selectedAddress =
  null;

let verifiedPhone =
  "";

let verificationId =
  "";

let recaptchaVerifier =
  null;

let resendTimer =
  null;

let selectedPayment =
  "bkash";

let placingOrder =
  false;

let currentStep =
  "phone";


const CHECKOUT_KEY =
  "bazvorCheckout";

const CART_KEY =
  "bazvorCart";

const ADDRESS_KEY =
  "bazvorAddresses";


const $ = selector =>
  document.querySelector(
    selector
  );


/* =========================================================
   GLOBAL API
========================================================= */

window.BazvorCheckout = {

  open(data){

    checkoutData =
      data ||
      readCheckout();

    if(
      !checkoutData?.items?.length
    ){
      toast(
        "No products selected"
      );
      return;
    }

    const panel =
      $("#inlineCheckout");

    if(!panel){
      console.error(
        "inlineCheckout element missing"
      );
      return;
    }

    panel.classList.add(
      "open"
    );

    panel.setAttribute(
      "aria-hidden",
      "false"
    );

    document.body.classList.add(
      "checkout-flow-open"
    );

    renderTotal();

    /*
      Every new opening starts cleanly.
    */

    if(
      selectedAddress &&
      verifiedPhone
    ){
      setStep("payment");
    }else if(
      verifiedPhone
    ){
      setStep("location");
    }else{
      setStep("phone");
    }
  },


  close(){

    $("#inlineCheckout")
      ?.classList.remove(
        "open",
        "expanded"
      );

    $("#inlineCheckout")
      ?.setAttribute(
        "aria-hidden",
        "true"
      );

    document.body.classList.remove(
      "checkout-flow-open",
      "checkout-flow-expanded"
    );

    stopResendTimer();
  }

};



/* =========================================================
   FIREBASE LOAD

   Dynamic import means failure does NOT prevent
   checkout panel from opening.
========================================================= */

async function loadFirebase(){

  try{

    const appModule =
      await import(
        "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"
      );

    const authModule =
      await import(
        "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"
      );

    const firestoreModule =
      await import(
        "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"
      );


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
      appModule.getApps().length
        ? appModule.getApp()
        : appModule.initializeApp(
            firebaseConfig
          );


    auth =
      authModule.getAuth(
        app
      );


    db =
      firestoreModule.getFirestore(
        app
      );


    Firebase = {

      RecaptchaVerifier:
        authModule.RecaptchaVerifier,

      PhoneAuthProvider:
        authModule.PhoneAuthProvider,

      linkWithCredential:
        authModule.linkWithCredential,

      updatePhoneNumber:
        authModule.updatePhoneNumber,

      collection:
        firestoreModule.collection,

      addDoc:
        firestoreModule.addDoc,

      getDocs:
        firestoreModule.getDocs,

      query:
        firestoreModule.query,

      where:
        firestoreModule.where,

      serverTimestamp:
        firestoreModule.serverTimestamp

    };


    authModule.onAuthStateChanged(
      auth,
      async user=>{

        currentUser =
          user ||
          null;


        if(user){

          if(
            $("#receiverName") &&
            !$("#receiverName").value
          ){

            $("#receiverName").value =
              user.displayName ||
              "";
          }


          /*
            Existing Firebase verified
            phone can be reused.
          */

          if(
            user.phoneNumber
          ){

            verifiedPhone =
              user.phoneNumber;

            renderVerifiedPhone();
          }

        }


        await loadAddresses();

        updatePlaceOrder();
      }
    );


    firebaseReady =
      true;


  }catch(error){

    firebaseLoadError =
      error;

    console.error(
      "FIREBASE LOAD ERROR:",
      error
    );
  }

}


/*
  Start background loading.
*/

loadFirebase();



/* =========================================================
   STORAGE
========================================================= */

function readCheckout(){

  try{

    return JSON.parse(
      localStorage.getItem(
        CHECKOUT_KEY
      ) ||
      "null"
    );

  }catch{
    return null;
  }
}


function loadLocalAddresses(){

  try{

    const result =
      JSON.parse(
        localStorage.getItem(
          ADDRESS_KEY
        ) ||
        "[]"
      );

    return Array.isArray(result)
      ? result
      : [];

  }catch{
    return [];
  }
}


function saveLocalAddresses(){

  localStorage.setItem(
    ADDRESS_KEY,
    JSON.stringify(addresses)
  );
}



/* =========================================================
   UI HELPERS
========================================================= */

function money(value){

  return "৳" +
    (Number(value)||0)
      .toLocaleString(
        "en-BD"
      );
}


function setText(selector,value){

  const element =
    $(selector);

  if(element){
    element.textContent =
      value;
  }
}


function toast(message){

  const element =
    $("#toast");

  if(!element){
    return;
  }

  element.textContent =
    message;

  element.classList.add(
    "show"
  );

  clearTimeout(
    toast.timer
  );

  toast.timer =
    setTimeout(
      ()=>{
        element.classList.remove(
          "show"
        );
      },
      2200
    );
}


function escapeHTML(value){

  return String(value ?? "")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");
}


function renderTotal(){

  const total =
    Number(
      checkoutData?.total
    ) ||
    0;

  setText(
    "#paymentAmount",
    money(total)
  );

  setText(
    "#finalOrderTotal",
    money(total)
  );
}



/* =========================================================
   STEP FLOW
========================================================= */

const steps = [
  "phone",
  "location",
  "payment"
];


function setExpanded(value){

  $("#inlineCheckout")
    ?.classList.toggle(
      "expanded",
      value
    );

  document.body
    .classList.toggle(
      "checkout-flow-expanded",
      value
    );
}


function setStep(step){

  if(
    step==="location" &&
    !verifiedPhone
  ){
    step="phone";
  }

  if(
    step==="payment" &&
    !selectedAddress
  ){
    step =
      verifiedPhone
        ? "location"
        : "phone";
  }

  currentStep =
    step;


  $("#phoneStep")
    ?.classList.toggle(
      "active",
      step==="phone"
    );

  $("#locationStep")
    ?.classList.toggle(
      "active",
      step==="location"
    );

  $("#paymentStep")
    ?.classList.toggle(
      "active",
      step==="payment"
    );


  const currentIndex =
    steps.indexOf(step);


  document
    .querySelectorAll(
      ".flow-progress-step"
    )
    .forEach(
      (element,index)=>{

        element.classList.toggle(
          "active",
          index===currentIndex
        );

        element.classList.toggle(
          "complete",
          index<currentIndex
        );
      }
    );


  document
    .querySelectorAll(
      ".flow-progress-line"
    )
    .forEach(
      (line,index)=>{

        line.classList.toggle(
          "complete",
          index<currentIndex
        );

      }
    );


  const titles = {

    phone:
      "Verify phone",

    location:
      "Delivery location",

    payment:
      "Complete payment"
  };


  setText(
    "#flowTitle",
    titles[step]
  );


  $("#flowBackButton").hidden =
    step==="phone";


  /*
    Initial phone field remains 20–25%.
    Larger forms get usable space.
  */

  const otpOpen =
    !$("#otpPanel")?.hidden;

  setExpanded(
    step!=="phone" ||
    otpOpen
  );


  if(step==="location"){
    renderSavedAddresses();
  }

  if(step==="payment"){
    renderPayment();
  }


  $("#flowScroller")
    ?.scrollTo({
      top:0,
      behavior:"smooth"
    });
}



/* =========================================================
   PHONE
========================================================= */

function normalizePhone(value){

  let phone =
    String(value||"")
      .replace(/\D/g,"");


  if(phone.startsWith("880")){
    phone =
      phone.slice(3);
  }


  if(phone.startsWith("0")){
    phone =
      phone.slice(1);
  }


  if(
    !/^1[3-9]\d{8}$/
      .test(phone)
  ){
    return "";
  }


  return "+880"+phone;
}


function displayPhone(phone){

  const value =
    String(phone||"");

  if(
    value.startsWith("+880")
  ){
    return "0"+value.slice(4);
  }

  return value;
}



/* =========================================================
   RECAPTCHA
========================================================= */

function clearRecaptcha(){

  if(recaptchaVerifier){

    try{
      recaptchaVerifier.clear();
    }catch{}

    recaptchaVerifier=null;
  }
}


function setupRecaptcha(){

  if(recaptchaVerifier){
    return;
  }

  recaptchaVerifier =
    new Firebase.RecaptchaVerifier(
      auth,
      "recaptcha-container",
      {
        size:"invisible"
      }
    );
}



/* =========================================================
   OTP
========================================================= */

async function sendOtp(){

  if(!firebaseReady){

    toast(
      firebaseLoadError
        ? "Phone service unavailable"
        : "Phone service is loading. Try again."
    );

    return;
  }


  if(!currentUser){

    /*
      User returns to same Cart page.
    */

    location.href =
      "auth.html?redirect=cart.html";

    return;
  }


  const phone =
    normalizePhone(
      $("#checkoutPhone")
        .value
    );


  if(!phone){

    toast(
      "Enter a valid Bangladesh mobile number"
    );

    return;
  }


  const button =
    $("#sendOtpButton");


  button.disabled =
    true;


  const oldText =
    button.textContent;


  button.textContent =
    "Sending...";


  try{

    clearRecaptcha();

    setupRecaptcha();


    const provider =
      new Firebase.PhoneAuthProvider(
        auth
      );


    verificationId =
      await provider.verifyPhoneNumber(
        phone,
        recaptchaVerifier
      );


    setText(
      "#otpPhone",
      displayPhone(phone)
    );


    $("#otpPanel").hidden =
      false;


    clearOtp();

    setExpanded(true);

    startResendTimer();


    setTimeout(
      ()=>{
        document
          .querySelector(
            ".otp-digit"
          )
          ?.focus();
      },
      100
    );


    toast(
      "OTP sent successfully"
    );


  }catch(error){

    console.error(
      "OTP SEND:",
      error
    );

    clearRecaptcha();

    toast(
      phoneError(error)
    );

  }finally{

    button.disabled =
      false;

    button.textContent =
      oldText;
  }
}


function setupOtpInputs(){

  const inputs =
    [
      ...document
        .querySelectorAll(
          ".otp-digit"
        )
    ];


  inputs.forEach(
    (input,index)=>{

      input.addEventListener(
        "input",
        ()=>{

          input.value =
            input.value
              .replace(/\D/g,"")
              .slice(0,1);


          if(
            input.value &&
            index<inputs.length-1
          ){

            inputs[index+1]
              .focus();
          }

        }
      );


      input.addEventListener(
        "keydown",
        event=>{

          if(
            event.key==="Backspace" &&
            !input.value &&
            index>0
          ){

            inputs[index-1]
              .focus();
          }

        }
      );


      input.addEventListener(
        "paste",
        event=>{

          const value =
            (
              event.clipboardData
                ?.getData("text") ||
              ""
            )
            .replace(/\D/g,"")
            .slice(0,6);


          if(value.length!==6){
            return;
          }


          event.preventDefault();


          value
            .split("")
            .forEach(
              (number,i)=>{
                if(inputs[i]){
                  inputs[i].value =
                    number;
                }
              }
            );

        }
      );

    }
  );
}


function getOtp(){

  return [
    ...document
      .querySelectorAll(
        ".otp-digit"
      )
  ]
  .map(input=>input.value)
  .join("");
}


function clearOtp(){

  document
    .querySelectorAll(
      ".otp-digit"
    )
    .forEach(input=>{
      input.value="";
    });
}



/* =========================================================
   VERIFY OTP
========================================================= */

async function verifyOtp(){

  if(
    !firebaseReady ||
    !currentUser
  ){
    return;
  }


  const code =
    getOtp();


  if(
    !verificationId ||
    !/^\d{6}$/.test(code)
  ){

    toast(
      "Enter the 6-digit OTP"
    );

    return;
  }


  const phone =
    normalizePhone(
      $("#checkoutPhone").value
    );


  if(!phone){
    return;
  }


  const button =
    $("#verifyOtpButton");


  button.disabled =
    true;


  button.textContent =
    "Verifying...";


  try{

    const credential =
      Firebase.PhoneAuthProvider
        .credential(
          verificationId,
          code
        );


    const hasPhone =
      currentUser
        .providerData
        .some(
          provider=>
            provider.providerId===
            "phone"
        );


    /*
      Preserves your previous Firebase
      account behaviour.
    */

    if(hasPhone){

      await Firebase
        .updatePhoneNumber(
          currentUser,
          credential
        );

    }else{

      await Firebase
        .linkWithCredential(
          currentUser,
          credential
        );

    }


    verifiedPhone =
      phone;


    renderVerifiedPhone();


    $("#otpPanel").hidden =
      true;


    stopResendTimer();

    clearRecaptcha();


    toast(
      "Mobile number verified"
    );


    setTimeout(
      ()=>setStep("location"),
      180
    );


  }catch(error){

    console.error(
      "OTP VERIFY:",
      error
    );


    toast(
      phoneError(error)
    );


  }finally{

    button.disabled =
      false;


    button.innerHTML =
      `Verify & Continue
       <i class="fa-solid fa-arrow-right"></i>`;
  }
}


function renderVerifiedPhone(){

  if(!verifiedPhone){
    return;
  }


  $("#phoneInputState").hidden =
    true;


  $("#verifiedPhoneState").hidden =
    false;


  $("#continueLocationButton").hidden =
    false;


  setText(
    "#verifiedPhone",
    displayPhone(
      verifiedPhone
    )
  );
}


function changePhone(){

  verifiedPhone="";
  verificationId="";
  selectedAddress=null;


  stopResendTimer();

  clearRecaptcha();


  $("#phoneInputState").hidden =
    false;


  $("#verifiedPhoneState").hidden =
    true;


  $("#continueLocationButton").hidden =
    true;


  $("#otpPanel").hidden =
    true;


  $("#checkoutPhone").disabled =
    false;


  setStep("phone");


  setTimeout(
    ()=>$("#checkoutPhone")?.focus(),
    100
  );
}



/* =========================================================
   RESEND
========================================================= */

function startResendTimer(){

  stopResendTimer();


  let seconds=45;


  $("#resendOtpButton").disabled =
    true;


  setText(
    "#resendTimer",
    `Resend in ${seconds}s`
  );


  resendTimer =
    setInterval(
      ()=>{

        seconds--;


        if(seconds<=0){

          stopResendTimer();

          setText(
            "#resendTimer",
            ""
          );

          $("#resendOtpButton").disabled =
            false;

          return;
        }


        setText(
          "#resendTimer",
          `Resend in ${seconds}s`
        );

      },
      1000
    );
}


function stopResendTimer(){

  if(resendTimer){

    clearInterval(
      resendTimer
    );

    resendTimer=null;
  }
}


function phoneError(error){

  const code =
    String(
      error?.code ||
      ""
    );


  if(
    code.includes(
      "invalid-phone-number"
    )
  ){
    return "Invalid phone number";
  }


  if(
    code.includes(
      "invalid-verification-code"
    )
  ){
    return "Incorrect OTP";
  }


  if(
    code.includes(
      "code-expired"
    )
  ){
    return "OTP expired. Send a new code";
  }


  if(
    code.includes(
      "too-many-requests"
    )
  ){
    return "Too many attempts. Try again later";
  }


  if(
    code.includes(
      "credential-already-in-use"
    )
  ){
    return "This phone number is linked to another account";
  }


  return "Phone verification failed";
}



/* =========================================================
   ADDRESSES
========================================================= */

function fullAddress(address){

  return [
    address?.addressLine,
    address?.area,
    address?.city
  ]
  .filter(Boolean)
  .join(", ");
}


async function loadAddresses(){

  addresses =
    loadLocalAddresses();


  if(
    !firebaseReady ||
    !currentUser
  ){

    renderSavedAddresses();
    return;
  }


  try{

    const snapshot =
      await Firebase.getDocs(

        Firebase.query(

          Firebase.collection(
            db,
            "addresses"
          ),

          Firebase.where(
            "userId",
            "==",
            currentUser.uid
          )

        )
      );


    const cloud=[];


    snapshot.forEach(doc=>{

      cloud.push({
        id:doc.id,
        ...(doc.data()||{})
      });

    });


    if(cloud.length){
      addresses=cloud;
    }


  }catch(error){

    console.warn(
      "ADDRESS LOAD:",
      error
    );
  }


  selectedAddress =
    addresses.find(
      address=>
        address.isDefault===true &&
        address.phoneVerified===true
    )
    ||
    addresses.find(
      address=>
        address.phoneVerified===true
    )
    ||
    null;


  renderSavedAddresses();
}


function renderSavedAddresses(){

  const container =
    $("#savedAddressList");

  const section =
    $("#savedAddressSection");

  if(
    !container ||
    !section
  ){
    return;
  }


  const list =
    addresses.filter(
      address=>
        address.phoneVerified===true
    );


  section.hidden =
    !list.length;


  container.innerHTML =
    list.map(address=>{

      const index =
        addresses.indexOf(address);

      const active =
        selectedAddress &&
        String(selectedAddress.id)===
        String(address.id);

      return `
        <button
          type="button"
          class="saved-address-button ${active ? "active" : ""}"
          data-index="${index}"
        >

          <span class="saved-location-icon">
            <i class="fa-solid fa-location-dot"></i>
          </span>

          <span class="saved-address-copy">

            <strong>
              ${escapeHTML(
                address.name ||
                "Delivery Address"
              )}
            </strong>

            <span>
              ${escapeHTML(
                fullAddress(address)
              )}
            </span>

          </span>

          <span class="saved-address-check">

            <i class="fa-solid ${
              active
                ? "fa-circle-check"
                : "fa-chevron-right"
            }"></i>

          </span>

        </button>
      `;

    }).join("");


  container
    .querySelectorAll(
      ".saved-address-button"
    )
    .forEach(button=>{

      button.addEventListener(
        "click",
        ()=>{

          const address =
            addresses[
              Number(
                button.dataset.index
              )
            ];


          if(!address){
            return;
          }


          selectedAddress =
            address;


          /*
            Saved address number was
            previously verified.
          */

          if(
            address.phoneVerified &&
            address.phone
          ){

            verifiedPhone =
              address.phone;

            renderVerifiedPhone();
          }


          renderSavedAddresses();

          setStep("payment");
        }
      );

    });
}



/* =========================================================
   SAVE ADDRESS
========================================================= */

async function saveAddress(event){

  event.preventDefault();


  if(!currentUser){

    location.href =
      "auth.html?redirect=cart.html";

    return;
  }


  if(!verifiedPhone){

    toast(
      "Verify your phone number first"
    );

    setStep("phone");

    return;
  }


  const name =
    $("#receiverName")
      .value
      .trim();


  const addressLine =
    $("#addressLine")
      .value
      .trim();


  const area =
    $("#addressArea")
      .value
      .trim();


  const city =
    $("#addressCity")
      .value
      .trim();


  if(
    !name ||
    !addressLine ||
    !city
  ){

    toast(
      "Complete all required address fields"
    );

    return;
  }


  const isDefault =
    $("#defaultAddress").checked ||
    addresses.length===0;


  if(isDefault){

    addresses =
      addresses.map(
        address=>({
          ...address,
          isDefault:false
        })
      );
  }


  const address = {

    id:
      "ADDR-"+Date.now(),

    userId:
      currentUser.uid,

    name,

    phone:
      verifiedPhone,

    phoneVerified:
      true,

    phoneVerifiedAt:
      Date.now(),

    addressLine,

    area,

    city,

    isDefault
  };


  addresses.unshift(
    address
  );


  selectedAddress =
    address;


  saveLocalAddresses();


  if(firebaseReady){

    try{

      const result =
        await Firebase.addDoc(

          Firebase.collection(
            db,
            "addresses"
          ),

          {
            ...address,

            createdAt:
              Firebase.serverTimestamp(),

            phoneVerifiedAt:
              Firebase.serverTimestamp()
          }
        );


      address.id =
        result.id;


      selectedAddress.id =
        result.id;


      addresses[0].id =
        result.id;


      saveLocalAddresses();


    }catch(error){

      console.warn(
        "ADDRESS SAVE:",
        error
      );
    }
  }


  renderSavedAddresses();


  toast(
    "Delivery address saved"
  );


  setStep("payment");
}



/* =========================================================
   PAYMENT
========================================================= */

function renderPayment(){

  document
    .querySelectorAll(
      ".payment-method"
    )
    .forEach(button=>{

      button.classList.toggle(
        "active",
        button.dataset.payment===
        selectedPayment
      );

    });


  const payment =
    PAYMENT_CONFIG[
      selectedPayment
    ];


  setText(
    "#paymentAccountType",
    payment.name
  );


  setText(
    "#paymentNumber",
    payment.number
  );


  renderTotal();


  if(selectedAddress){

    setText(
      "#paymentReceiver",
      selectedAddress.name ||
      "Delivery Address"
    );

    setText(
      "#paymentAddress",
      fullAddress(
        selectedAddress
      )
    );
  }


  updatePlaceOrder();
}


function selectPayment(method){

  if(!PAYMENT_CONFIG[method]){
    return;
  }

  selectedPayment =
    method;

  renderPayment();
}


async function copyPaymentNumber(){

  const number =
    PAYMENT_CONFIG[
      selectedPayment
    ].number;


  try{

    await navigator
      .clipboard
      .writeText(number);

    toast(
      "Payment number copied"
    );


  }catch{

    toast(number);
  }
}


function validTransaction(){

  const value =
    $("#transactionId")
      ?.value
      .trim() ||
    "";

  return /^[A-Za-z0-9_-]{6,40}$/
    .test(value);
}


function updatePlaceOrder(){

  const button =
    $("#placeOrderButton");

  if(!button){
    return;
  }


  button.disabled =
    placingOrder ||
    !currentUser ||
    !verifiedPhone ||
    !selectedAddress ||
    !validTransaction() ||
    !checkoutData?.items?.length;
}



/* =========================================================
   ORDER PRODUCT HELPERS
========================================================= */

function itemPrice(item){

  return Number(
    item?.price ??
    item?.salePrice ??
    item?.discountPrice ??
    item?.sellingPrice ??
    0
  ) || 0;
}


function itemQty(item){

  const q =
    Number(item?.quantity);

  return q>0
    ? q
    : 1;
}


function itemName(item){

  return (
    item?.name ||
    item?.productName ||
    item?.title ||
    "Product"
  );
}


function itemColor(item){

  return String(
    item?.selectedColor ??
    item?.color ??
    ""
  ).trim();
}


function itemSize(item){

  return String(
    item?.selectedSize ??
    item?.size ??
    ""
  ).trim();
}


function itemImage(item){

  const images =
    item?.images ||
    item?.productImages ||
    item?.photos;


  if(
    Array.isArray(images) &&
    images.length
  ){

    const first =
      images[0];

    if(typeof first==="string"){
      return first;
    }

    return (
      first?.url ||
      first?.imageUrl ||
      ""
    );
  }


  return (
    item?.image ||
    item?.imageUrl ||
    item?.thumbnail ||
    ""
  );
}



/* =========================================================
   ORDER ID
========================================================= */

function makeOrderId(){

  const now =
    new Date();

  const date =
    now.getFullYear() +
    String(
      now.getMonth()+1
    ).padStart(2,"0") +
    String(
      now.getDate()
    ).padStart(2,"0");

  const random =
    Math.random()
      .toString(36)
      .slice(2,7)
      .toUpperCase();

  return `BZV-${date}-${random}`;
}



/* =========================================================
   CART CLEANUP
========================================================= */

function identity(item){

  return [

    String(
      item?.productId ??
      item?.id ??
      item?.sku ??
      ""
    ),

    itemColor(item)
      .toLowerCase(),

    itemSize(item)
      .toLowerCase(),

    String(
      itemPrice(item)
    )

  ].join("|");
}


function removePurchasedItems(){

  try{

    const currentCart =
      JSON.parse(
        localStorage.getItem(
          CART_KEY
        ) ||
        "[]"
      );


    if(
      !Array.isArray(currentCart)
    ){
      return;
    }


    const needed =
      new Map();


    checkoutData.items
      .forEach(item=>{

        const key =
          identity(item);

        needed.set(
          key,
          (needed.get(key)||0) +
          itemQty(item)
        );

      });


    const remaining=[];


    currentCart.forEach(item=>{

      const key =
        identity(item);

      const requested =
        needed.get(key)||0;


      if(requested<=0){

        remaining.push(item);
        return;
      }


      const qty =
        itemQty(item);


      if(qty<=requested){

        needed.set(
          key,
          requested-qty
        );

        return;
      }


      remaining.push({
        ...item,
        quantity:qty-requested
      });


      needed.set(
        key,
        0
      );

    });


    localStorage.setItem(
      CART_KEY,
      JSON.stringify(remaining)
    );


    window.dispatchEvent(
      new CustomEvent(
        "bazvorCartUpdated"
      )
    );


  }catch(error){

    console.warn(
      "CART CLEANUP:",
      error
    );
  }
}



/* =========================================================
   PLACE ORDER
========================================================= */

async function placeOrder(){

  if(placingOrder){
    return;
  }


  if(!firebaseReady){

    toast(
      "Order service is loading. Try again."
    );

    return;
  }


  if(!currentUser){

    location.href =
      "auth.html?redirect=cart.html";

    return;
  }


  if(!verifiedPhone){

    setStep("phone");
    return;
  }


  if(!selectedAddress){

    setStep("location");
    return;
  }


  if(!validTransaction()){

    toast(
      "Enter a valid Transaction ID"
    );

    return;
  }


  if(
    !checkoutData?.items?.length
  ){

    toast(
      "Checkout is empty"
    );

    return;
  }


  placingOrder=true;

  updatePlaceOrder();


  $("#orderLoading").hidden =
    false;


  const orderId =
    makeOrderId();


  const transactionId =
    $("#transactionId")
      .value
      .trim();


  const items =
    checkoutData.items.map(
      item=>{

        const price =
          itemPrice(item);

        const quantity =
          itemQty(item);

        return {

          productId:
            String(
              item?.productId ??
              item?.id ??
              item?.sku ??
              ""
            ),

          name:
            itemName(item),

          image:
            itemImage(item),

          color:
            itemColor(item),

          size:
            itemSize(item),

          price,

          quantity,

          total:
            price*quantity
        };
      }
    );


  const payment =
    PAYMENT_CONFIG[
      selectedPayment
    ];


  const order = {

    orderId,

    userId:
      currentUser.uid,


    customer:{
      email:
        currentUser.email ||
        ""
    },


    receiver:{

      name:
        selectedAddress.name,

      phone:
        verifiedPhone,

      phoneVerified:
        true
    },


    address:{

      addressId:
        selectedAddress.id ||
        "",

      addressLine:
        selectedAddress.addressLine,

      area:
        selectedAddress.area ||
        "",

      city:
        selectedAddress.city
    },


    items,


    pricing:{

      subtotal:
        Number(
          checkoutData.subtotal
        ) || 0,

      productSavings:
        Number(
          checkoutData.productDiscount
        ) || 0,

      couponDiscount:
        Number(
          checkoutData.couponDiscount
        ) || 0,

      deliveryCharge:
        Number(
          checkoutData.deliveryCharge
        ) || 0,

      total:
        Number(
          checkoutData.total
        ) || 0
    },


    couponCode:
      checkoutData.couponCode ||
      "",


    deliveryMethod:
      "standard",


    paymentMethod:
      "manual",


    paymentProvider:
      selectedPayment,


    paymentNumber:
      payment.number,


    transactionId,


    /*
      Important:
      Transaction ID submission alone
      does NOT mark payment paid.
    */

    paymentStatus:
      "verification_pending",


    status:
      "pending",


    createdAt:
      Firebase.serverTimestamp(),

    updatedAt:
      Firebase.serverTimestamp()
  };


  try{

    const result =
      await Firebase.addDoc(

        Firebase.collection(
          db,
          "orders"
        ),

        order
      );


    removePurchasedItems();


    localStorage.setItem(

      "bazvorLastOrder",

      JSON.stringify({

        firestoreId:
          result.id,

        orderId,

        total:
          checkoutData.total,

        paymentProvider:
          selectedPayment,

        paymentStatus:
          "verification_pending",

        createdAt:
          Date.now()
      })
    );


    localStorage.removeItem(
      CHECKOUT_KEY
    );


    localStorage.removeItem(
      "bazvorBuyNow"
    );


    location.replace(
      `order-success.html?orderId=${
        encodeURIComponent(orderId)
      }`
    );


  }catch(error){

    console.error(
      "ORDER ERROR:",
      error
    );


    placingOrder=false;


    $("#orderLoading").hidden =
      true;


    updatePlaceOrder();


    toast(
      "Couldn't place the order. Please try again."
    );
  }
}



/* =========================================================
   EVENTS
========================================================= */

function setupEvents(){

  $("#closeCheckoutFlow")
    ?.addEventListener(
      "click",
      ()=>window
        .BazvorCheckout
        .close()
    );


  $("#flowBackButton")
    ?.addEventListener(
      "click",
      ()=>{

        if(currentStep==="payment"){

          setStep("location");

        }else if(
          currentStep==="location"
        ){

          setStep("phone");
        }
      }
    );


  $("#sendOtpButton")
    ?.addEventListener(
      "click",
      sendOtp
    );


  $("#verifyOtpButton")
    ?.addEventListener(
      "click",
      verifyOtp
    );


  $("#resendOtpButton")
    ?.addEventListener(
      "click",
      sendOtp
    );


  $("#changePhoneButton")
    ?.addEventListener(
      "click",
      changePhone
    );


  $("#continueLocationButton")
    ?.addEventListener(
      "click",
      ()=>{

        if(verifiedPhone){
          setStep("location");
        }
      }
    );


  $("#addressForm")
    ?.addEventListener(
      "submit",
      saveAddress
    );


  document
    .querySelectorAll(
      ".payment-method"
    )
    .forEach(button=>{

      button.addEventListener(
        "click",
        ()=>selectPayment(
          button.dataset.payment
        )
      );

    });


  $("#copyPaymentNumber")
    ?.addEventListener(
      "click",
      copyPaymentNumber
    );


  $("#editAddressButton")
    ?.addEventListener(
      "click",
      ()=>setStep("location")
    );


  $("#transactionId")
    ?.addEventListener(
      "input",
      event=>{

        event.target.value =
          event.target.value
            .replace(/\s+/g,"")
            .slice(0,40);

        updatePlaceOrder();
      }
    );


  $("#placeOrderButton")
    ?.addEventListener(
      "click",
      placeOrder
    );


  document.addEventListener(
    "keydown",
    event=>{

      if(
        event.key==="Escape" &&
        document.body
          .classList
          .contains(
            "checkout-flow-open"
          )
      ){

        window
          .BazvorCheckout
          .close();
      }
    }
  );
}



/* =========================================================
   DOM READY
========================================================= */

if(
  document.readyState===
  "loading"
){

  document.addEventListener(
    "DOMContentLoaded",
    ()=>{
      setupEvents();
      setupOtpInputs();
      renderPayment();
    }
  );

}else{

  setupEvents();
  setupOtpInputs();
  renderPayment();
}