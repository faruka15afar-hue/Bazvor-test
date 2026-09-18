"use strict";

import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


/* FIREBASE */

const firebaseConfig = {
  apiKey: "AIzaSyCc1q9_taS8b-T3FxQmQ12BajjBgvtcmyM",
  authDomain: "bazvor-da3c4.firebaseapp.com",
  projectId: "bazvor-da3c4",
  storageBucket: "bazvor-da3c4.firebasestorage.app",
  messagingSenderId: "59852021286",
  appId: "1:59852021286:web:b6ad6eba476f853b1710e7",
  measurementId: "G-L6JFCT5RDD"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


/* HELPERS */

const $ = selector =>
  document.querySelector(selector);


function go(url) {
  location.href = url;
}


function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function timestamp(value) {

  if (!value) return 0;

  if (typeof value.toMillis === "function") {
    return value.toMillis();
  }

  if (typeof value.seconds === "number") {
    return value.seconds * 1000;
  }

  const parsed = Date.parse(value);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}


function formatTime(value) {

  const ms = timestamp(value);

  if (!ms) return "";

  const date = new Date(ms);
  const now = new Date();

  if (
    date.toDateString() ===
    now.toDateString()
  ) {
    return date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit"
    });
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (
    date.toDateString() ===
    yesterday.toDateString()
  ) {
    return "Yesterday";
  }

  const days =
    Math.floor(
      (now - date) /
      86400000
    );

  if (days < 7) {
    return date.toLocaleDateString([], {
      weekday: "short"
    });
  }

  return date.toLocaleDateString([], {
    day: "numeric",
    month: "short"
  });
}


/* STATE */

let currentUser = null;
let conversations = [];
let searchValue = "";
let unsubscribe = null;


/* ELEMENTS */

const loadingState = $("#loadingState");
const guestState = $("#guestState");

const conversationSection =
  $("#conversationSection");

const conversationList =
  $("#conversationList");

const emptyState = $("#emptyState");

const searchEmptyState =
  $("#searchEmptyState");

const errorState = $("#errorState");

const searchSection =
  $("#searchSection");

const searchInput =
  $("#searchInput");

const clearSearch =
  $("#clearSearch");


/* VIEW STATE */

function hideViews() {

  loadingState.hidden = true;
  guestState.hidden = true;

  conversationSection.hidden = true;

  emptyState.hidden = true;
  searchEmptyState.hidden = true;
  errorState.hidden = true;
}


/* COUNTERPART */

function getOtherParticipant(item) {

  if (!currentUser) return null;

  if (item.isSupport === true) {
    return {
      uid: item.supportUid || "support",
      name: item.supportName || "Bazvor Support",
      photoURL: item.supportPhoto || "",
      verified: true
    };
  }

  const participants =
    Array.isArray(item.participants)
      ? item.participants
      : [];

  const otherUid =
    participants.find(
      uid => uid !== currentUser.uid
    );

  if (!otherUid) {

    return {
      uid: "",
      name:
        item.otherName ||
        item.sellerName ||
        item.shopName ||
        "Bazvor User",

      photoURL:
        item.otherPhoto ||
        item.sellerPhoto ||
        item.shopLogo ||
        "",

      verified:
        item.verified === true
    };
  }

  const profile =
    item.participantProfiles?.[otherUid] || {};

  return {
    uid: otherUid,

    name:
      profile.name ||
      profile.displayName ||
      item.otherName ||
      item.sellerName ||
      item.shopName ||
      "Bazvor User",

    photoURL:
      profile.photoURL ||
      profile.photo ||
      item.otherPhoto ||
      item.sellerPhoto ||
      item.shopLogo ||
      "",

    verified:
      profile.verified === true ||
      item.verified === true
  };
}


function unreadCount(item) {

  if (!currentUser) return 0;

  const value =
    item.unreadCounts?.[
      currentUser.uid
    ];

  const fallback =
    value ?? item.unreadCount ?? 0;

  const number =
    Number(fallback);

  return Number.isFinite(number)
    ? Math.max(0, number)
    : 0;
}


function lastMessageText(item) {

  if (
    item.lastMessage &&
    typeof item.lastMessage === "object"
  ) {

    switch (item.lastMessage.type) {

      case "image":
        return "📷 Photo";

      case "product":
        return "🛍️ Product";

      case "order":
        return "📦 Order";

      default:
        return (
          item.lastMessage.text ||
          "Start a conversation"
        );
    }
  }

  return (
    item.lastMessageText ||
    item.lastMessage ||
    "Start a conversation"
  );
}


function lastSenderId(item) {

  return (
    item.lastMessage?.senderId ||
    item.lastSenderId ||
    ""
  );
}


function isLastMessageRead(item) {

  const other =
    getOtherParticipant(item);

  if (!other?.uid) {
    return false;
  }

  const messageTime =
    timestamp(
      item.lastMessageAt ||
      item.updatedAt
    );

  const readTime =
    timestamp(
      item.lastReadAt?.[
        other.uid
      ]
    );

  if (readTime && messageTime) {
    return readTime >= messageTime;
  }

  return item.lastMessageRead === true;
}


/* FILTER */

function filteredItems() {

  if (!searchValue) {
    return conversations;
  }

  return conversations.filter(item => {

    const other =
      getOtherParticipant(item);

    const haystack =
      `${other?.name || ""} ${lastMessageText(item)}`
        .toLowerCase();

    return haystack.includes(searchValue);
  });
}


/* CARD */

function conversationHTML(item) {

  const other =
    getOtherParticipant(item);

  const name =
    other?.name || "Bazvor User";

  const photo =
    other?.photoURL || "";

  const unread =
    unreadCount(item);

  const initial =
    name.trim().charAt(0).toUpperCase() || "B";

  const senderId =
    lastSenderId(item);

  const sentByMe =
    senderId === currentUser?.uid;

  const read =
    sentByMe &&
    isLastMessageRead(item);

  const online =
    item.online === true ||
    item.presence?.[other?.uid] === "online";

  return `
    <button
      type="button"
      class="conversation-item ${unread ? "unread" : ""}"
      data-conversation="${escapeHTML(item.id)}"
      aria-label="Open conversation with ${escapeHTML(name)}"
    >

      <span class="avatar-wrap">

        <span class="avatar">

          ${
            photo
              ? `
                <img
                  src="${escapeHTML(photo)}"
                  alt=""
                  loading="lazy"
                  referrerpolicy="no-referrer"
                >
              `
              : escapeHTML(initial)
          }

        </span>

        ${
          online
            ? `<span class="online-dot"></span>`
            : ""
        }

      </span>


      <span class="conversation-body">

        <span class="conversation-top">

          <strong class="conversation-name">
            ${escapeHTML(name)}
          </strong>

          ${
            other?.verified ||
            item.isSupport === true
              ? `
                <i
                  class="fa-solid fa-circle-check verified"
                  aria-label="Verified"
                ></i>
              `
              : ""
          }

          <time class="conversation-time">
            ${escapeHTML(
              formatTime(
                item.lastMessageAt ||
                item.updatedAt
              )
            )}
          </time>

        </span>


        <span class="conversation-bottom">

          <span class="last-message">

            ${
              sentByMe
                ? `
                  <i
                    class="fa-solid fa-check-double message-check ${
                      read ? "read" : ""
                    }"
                  ></i>
                `
                : ""
            }

            ${escapeHTML(lastMessageText(item))}

          </span>

          ${
            unread
              ? `
                <span class="unread-badge">
                  ${unread > 99 ? "99+" : unread}
                </span>
              `
              : ""
          }

        </span>

      </span>

    </button>
  `;
}


/* UNREAD HEADER */

function renderUnread() {

  const total =
    conversations.reduce(
      (sum, item) =>
        sum + unreadCount(item),
      0
    );

  const header =
    $("#headerUnread");

  const markAll =
    $("#markAllRead");

  if (total > 0) {

    header.hidden = false;

    header.textContent =
      `${total > 99 ? "99+" : total} unread`;

    markAll.hidden = false;

  } else {

    header.hidden = true;
    markAll.hidden = true;
  }
}


/* RENDER */

function render() {

  hideViews();

  renderUnread();

  if (!conversations.length) {
    emptyState.hidden = false;
    return;
  }

  const items =
    filteredItems();

  if (!items.length) {
    searchEmptyState.hidden = false;
    return;
  }

  conversationSection.hidden = false;

  $("#conversationSummary").textContent =
    `${conversations.length} conversation${
      conversations.length === 1
        ? ""
        : "s"
    }`;

  conversationList.innerHTML =
    items
      .map(conversationHTML)
      .join("");

  conversationList
    .querySelectorAll(
      "[data-conversation]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const id =
            button.dataset.conversation;

          go(
            `chat.html?id=${encodeURIComponent(id)}`
          );
        }
      );
    });
}


/* FIRESTORE LISTENER */

function listenForConversations(user) {

  if (typeof unsubscribe === "function") {
    unsubscribe();
  }

  hideViews();
  loadingState.hidden = false;

  const q = query(
    collection(db, "conversations"),

    where(
      "participants",
      "array-contains",
      user.uid
    )
  );

  unsubscribe =
    onSnapshot(
      q,

      snapshot => {

        conversations =
          snapshot.docs.map(snap => ({
            id: snap.id,
            ...snap.data()
          }));

        conversations.sort(
          (a, b) =>
            timestamp(
              b.lastMessageAt ||
              b.updatedAt ||
              b.createdAt
            )
            -
            timestamp(
              a.lastMessageAt ||
              a.updatedAt ||
              a.createdAt
            )
        );

        render();
      },

      error => {

        console.error(
          "Conversation listener:",
          error
        );

        hideViews();

        errorState.hidden = false;

        $("#errorText").textContent =
          error.code === "permission-denied"
            ? "You don't have permission to access these conversations."
            : "Unable to load your conversations right now.";
      }
    );
}


/* SEARCH */

searchInput.addEventListener(
  "input",
  event => {

    searchValue =
      event.target.value
        .trim()
        .toLowerCase();

    clearSearch.hidden =
      !searchValue;

    if (currentUser) {
      render();
    }
  }
);


clearSearch.addEventListener(
  "click",
  () => {

    searchInput.value = "";
    searchValue = "";

    clearSearch.hidden = true;

    render();

    searchInput.focus();
  }
);


/* MARK ALL READ */

$("#markAllRead").addEventListener(
  "click",
  async () => {

    if (!currentUser) return;

    const unread =
      conversations.filter(
        item => unreadCount(item) > 0
      );

    if (!unread.length) return;

    const batch =
      writeBatch(db);

    unread.forEach(item => {

      const ref =
        doc(
          db,
          "conversations",
          item.id
        );

      batch.update(ref, {
        [`unreadCounts.${currentUser.uid}`]: 0
      });
    });

    try {
      await batch.commit();
    } catch (error) {
      console.error(
        "Mark all read:",
        error
      );
    }
  }
);


/* SUPPORT */

function openSupport() {

  if (!currentUser) {
    go("help.html");
    return;
  }

  /*
    You can later replace this with your
    fixed Bazvor support conversation ID.
  */

  go("help.html");
}


$("#supportHeaderButton")
  .addEventListener(
    "click",
    openSupport
  );


$("#floatingSupport")
  .addEventListener(
    "click",
    openSupport
  );


$("#guestHelpButton")
  .addEventListener(
    "click",
    openSupport
  );


/* NAVIGATION */

$("#shopButton").addEventListener(
  "click",
  () => go("home.html")
);


$("#loginButton").addEventListener(
  "click",
  () =>
    go(
      "auth.html?redirect=" +
      encodeURIComponent("message.html")
    )
);


$("#backButton").addEventListener(
  "click",
  () => {

    if (history.length > 1) {
      history.back();
    } else {
      go("home.html");
    }
  }
);


$("#retryButton").addEventListener(
  "click",
  () => {

    if (currentUser) {
      listenForConversations(currentUser);
    }
  }
);


/* AUTH */

onAuthStateChanged(
  auth,
  user => {

    if (!user) {

      currentUser = null;
      conversations = [];

      if (typeof unsubscribe === "function") {
        unsubscribe();
        unsubscribe = null;
      }

      hideViews();

      searchSection.hidden = true;

      guestState.hidden = false;

      return;
    }

    currentUser = user;

    searchSection.hidden = false;

    listenForConversations(user);
  }
);


/* CLEANUP */

window.addEventListener(
  "beforeunload",
  () => {

    if (typeof unsubscribe === "function") {
      unsubscribe();
    }
  }
);