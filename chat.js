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
  doc,
  getDoc,
  collection,
  query,
  orderBy,
  onSnapshot,
  writeBatch,
  serverTimestamp,
  increment,
  updateDoc,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";


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


const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);


/* HELPERS */

const $ = selector =>
  document.querySelector(selector);


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

  if (
    typeof value.toMillis === "function"
  ) {
    return value.toMillis();
  }

  if (
    typeof value.seconds === "number"
  ) {
    return value.seconds * 1000;
  }

  return 0;
}


function timeText(value) {

  const ms = timestamp(value);

  if (!ms) return "Sending...";

  return new Date(ms)
    .toLocaleTimeString(
      [],
      {
        hour: "numeric",
        minute: "2-digit"
      }
    );
}


function dayKey(value) {

  const ms = timestamp(value);

  if (!ms) return "";

  const date = new Date(ms);

  return [
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  ].join("-");
}


function dayLabel(value) {

  const ms = timestamp(value);

  if (!ms) return "";

  const date = new Date(ms);

  const today =
    new Date();

  if (
    date.toDateString() ===
    today.toDateString()
  ) {
    return "Today";
  }

  const yesterday =
    new Date(today);

  yesterday.setDate(
    today.getDate() - 1
  );

  if (
    date.toDateString() ===
    yesterday.toDateString()
  ) {
    return "Yesterday";
  }

  return date.toLocaleDateString(
    [],
    {
      weekday: "short",
      day: "numeric",
      month: "short",
      year:
        date.getFullYear() !==
        today.getFullYear()
          ? "numeric"
          : undefined
    }
  );
}


/* URL */

const params =
  new URLSearchParams(
    location.search
  );

const conversationId =
  params.get("id");


/* STATE */

let currentUser = null;

let conversation = null;

let otherUser = null;

let messages = [];

let unsubscribeMessages = null;

let unsubscribeConversation = null;

let sending = false;

let markingRead = false;


/* ELEMENTS */

const messageList =
  $("#messageList");

const messagesArea =
  $("#messagesArea");

const input =
  $("#messageInput");

const sendButton =
  $("#sendButton");

const form =
  $("#messageForm");

const loading =
  $("#chatLoading");

const errorBox =
  $("#chatError");

const errorText =
  $("#chatErrorText");


/* ERROR */

function showError(message) {

  loading.hidden = true;

  messageList.hidden = true;

  errorBox.hidden = false;

  errorText.textContent =
    message;
}


/* COUNTERPART */

function resolveOtherUser(data) {

  if (data.isSupport === true) {

    return {
      uid:
        data.supportUid ||
        "support",

      name:
        data.supportName ||
        "Bazvor Support",

      photoURL:
        data.supportPhoto ||
        "",

      verified: true
    };
  }

  const participants =
    Array.isArray(data.participants)
      ? data.participants
      : [];

  const uid =
    participants.find(
      id =>
        id !== currentUser.uid
    );

  const profile =
    data.participantProfiles?.[
      uid
    ] || {};

  return {

    uid: uid || "",

    name:
      profile.name ||
      profile.displayName ||
      data.otherName ||
      data.sellerName ||
      data.shopName ||
      "Bazvor User",

    photoURL:
      profile.photoURL ||
      profile.photo ||
      data.otherPhoto ||
      data.sellerPhoto ||
      data.shopLogo ||
      "",

    verified:
      profile.verified === true ||
      data.verified === true
  };
}


/* HEADER */

function renderHeader() {

  if (!otherUser) return;

  $("#chatName").textContent =
    otherUser.name;

  $("#chatVerified").hidden =
    !(
      otherUser.verified ||
      conversation?.isSupport
    );

  const avatar =
    $("#chatAvatar");

  const initial =
    otherUser.name
      .trim()
      .charAt(0)
      .toUpperCase() ||
    "B";

  if (otherUser.photoURL) {

    avatar.innerHTML =
      `
        <img
          src="${escapeHTML(otherUser.photoURL)}"
          alt=""
        >
      `;

  } else {

    avatar.textContent =
      initial;
  }

  if (conversation?.isSupport) {

    $("#chatStatus").textContent =
      "Bazvor Support";

    return;
  }

  const online =
    conversation?.online === true ||
    conversation?.presence?.[
      otherUser.uid
    ] === "online";

  if (online) {

    $("#chatStatus").textContent =
      "Online";

    return;
  }

  const lastSeen =
    conversation?.lastSeen?.[
      otherUser.uid
    ];

  if (lastSeen) {

    const ms =
      timestamp(lastSeen);

    if (ms) {

      $("#chatStatus").textContent =
        `Last active ${
          new Date(ms)
            .toLocaleTimeString(
              [],
              {
                hour: "numeric",
                minute: "2-digit"
              }
            )
        }`;

      return;
    }
  }

  $("#chatStatus").textContent =
    "Bazvor conversation";
}


/* MESSAGE READ */

function messageReadByOther(message) {

  if (!otherUser?.uid) {
    return false;
  }

  if (
    Array.isArray(
      message.readBy
    )
  ) {

    return message.readBy
      .includes(
        otherUser.uid
      );
  }

  const readAt =
    conversation?.lastReadAt?.[
      otherUser.uid
    ];

  return (
    timestamp(readAt) >=
    timestamp(message.createdAt)
  );
}


/* BUBBLE */

function bubbleHTML(message) {

  if (
    message.type === "system"
  ) {

    return `
      <div class="system-message">
        ${escapeHTML(message.text)}
      </div>
    `;
  }

  const mine =
    message.senderId ===
    currentUser.uid;

  const read =
    mine &&
    messageReadByOther(message);

  const type =
    message.type || "text";

  let content = "";

  if (
    type === "image" &&
    message.imageURL
  ) {

    content += `
      <img
        class="message-image"
        src="${escapeHTML(message.imageURL)}"
        alt="Shared photo"
        loading="lazy"
      >
    `;
  }

  if (message.text) {

    content += `
      <div class="message-text">
        ${escapeHTML(message.text)}
      </div>
    `;
  }

  return `
    <div
      class="message-row ${
        mine
          ? "mine"
          : "theirs"
      }"
      data-message-id="${escapeHTML(message.id)}"
    >

      <div class="message-bubble">

        ${content}

        <div class="message-meta">

          <span>
            ${escapeHTML(timeText(message.createdAt))}
          </span>

          ${
            mine
              ? `
                <i
                  class="fa-solid fa-check-double read-check ${
                    read ? "read" : ""
                  }"
                ></i>
              `
              : ""
          }

        </div>

      </div>

    </div>
  `;
}


/* RENDER MESSAGES */

function renderMessages() {

  loading.hidden = true;
  errorBox.hidden = true;

  messageList.hidden = false;

  if (!messages.length) {

    messageList.innerHTML = `
      <div class="empty-chat">

        <div class="empty-chat-icon">
          <i class="fa-regular fa-comments"></i>
        </div>

        <h2>
          Start the conversation
        </h2>

        <p>
          Send a message to ${
            escapeHTML(
              otherUser?.name ||
              "this user"
            )
          }.
        </p>

      </div>
    `;

    return;
  }

  let html = "";
  let previousDay = "";

  messages.forEach(message => {

    const key =
      dayKey(
        message.createdAt
      );

    if (
      key &&
      key !== previousDay
    ) {

      html += `
        <div class="day-divider">
          <span>
            ${escapeHTML(
              dayLabel(
                message.createdAt
              )
            )}
          </span>
        </div>
      `;

      previousDay = key;
    }

    html +=
      bubbleHTML(message);
  });

  messageList.innerHTML =
    html;
}


/* SCROLL */

function scrollToBottom(smooth = false) {

  requestAnimationFrame(
    () => {

      messagesArea.scrollTo({
        top:
          messagesArea.scrollHeight,

        behavior:
          smooth
            ? "smooth"
            : "auto"
      });
    }
  );
}


/* MARK READ */

async function markConversationRead() {

  if (
    !currentUser ||
    !conversationId ||
    markingRead
  ) {
    return;
  }

  const hasUnreadFromOther =
    messages.some(
      message =>
        message.senderId &&
        message.senderId !==
          currentUser.uid &&
        !(
          Array.isArray(message.readBy) &&
          message.readBy.includes(
            currentUser.uid
          )
        )
    );

  const count =
    Number(
      conversation?.unreadCounts?.[
        currentUser.uid
      ] || 0
    );

  if (
    !hasUnreadFromOther &&
    count <= 0
  ) {
    return;
  }

  markingRead = true;

  try {

    const batch =
      writeBatch(db);

    const conversationRef =
      doc(
        db,
        "conversations",
        conversationId
      );

    batch.update(
      conversationRef,
      {
        [`unreadCounts.${currentUser.uid}`]:
          0,

        [`lastReadAt.${currentUser.uid}`]:
          serverTimestamp()
      }
    );

    messages.forEach(message => {

      if (
        !message.id ||
        message.senderId ===
          currentUser.uid ||
        message.type === "system"
      ) {
        return;
      }

      if (
        Array.isArray(message.readBy) &&
        message.readBy.includes(
          currentUser.uid
        )
      ) {
        return;
      }

      const messageRef =
        doc(
          db,
          "conversations",
          conversationId,
          "messages",
          message.id
        );

      batch.update(
        messageRef,
        {
          readBy:
            arrayUnion(
              currentUser.uid
            )
        }
      );
    });

    await batch.commit();

  } catch (error) {

    console.warn(
      "Mark read error:",
      error
    );

  } finally {

    markingRead = false;
  }
}


/* MESSAGE LISTENER */

function listenMessages() {

  if (
    typeof unsubscribeMessages ===
    "function"
  ) {
    unsubscribeMessages();
  }

  const q =
    query(
      collection(
        db,
        "conversations",
        conversationId,
        "messages"
      ),
      orderBy(
        "createdAt",
        "asc"
      )
    );

  let firstLoad = true;

  unsubscribeMessages =
    onSnapshot(
      q,

      snapshot => {

        messages =
          snapshot.docs.map(
            snap => ({
              id: snap.id,
              ...snap.data()
            })
          );

        renderMessages();

        scrollToBottom(
          !firstLoad
        );

        firstLoad = false;

        markConversationRead();
      },

      error => {

        console.error(
          "Messages listener:",
          error
        );

        showError(
          error.code ===
          "permission-denied"
            ? "You don't have permission to access this conversation."
            : "Unable to load messages."
        );
      }
    );
}


/* CONVERSATION LISTENER */

function listenConversation() {

  const ref =
    doc(
      db,
      "conversations",
      conversationId
    );

  unsubscribeConversation =
    onSnapshot(
      ref,

      snapshot => {

        if (!snapshot.exists()) {

          showError(
            "This conversation no longer exists."
          );

          return;
        }

        const data =
          snapshot.data();

        const participants =
          Array.isArray(
            data.participants
          )
            ? data.participants
            : [];

        if (
          !participants.includes(
            currentUser.uid
          )
        ) {

          showError(
            "You don't have access to this conversation."
          );

          return;
        }

        conversation = {
          id: snapshot.id,
          ...data
        };

        otherUser =
          resolveOtherUser(
            conversation
          );

        renderHeader();

        if (messages.length) {
          renderMessages();
        }
      },

      error => {

        console.error(
          "Conversation listener:",
          error
        );

        showError(
          "Unable to load this conversation."
        );
      }
    );
}


/* SEND TEXT */

async function sendText() {

  if (
    sending ||
    !currentUser ||
    !conversation ||
    !otherUser
  ) {
    return;
  }

  const text =
    input.value.trim();

  if (!text) return;

  if (
    text.length > 2000
  ) {
    return;
  }

  sending = true;

  sendButton.disabled = true;

  const originalText =
    input.value;

  input.value = "";

  resizeTextarea();

  try {

    const messageRef =
      doc(
        collection(
          db,
          "conversations",
          conversationId,
          "messages"
        )
      );

    const conversationRef =
      doc(
        db,
        "conversations",
        conversationId
      );

    const batch =
      writeBatch(db);

    batch.set(
      messageRef,
      {
        senderId:
          currentUser.uid,

        type:
          "text",

        text,

        createdAt:
          serverTimestamp(),

        readBy: [
          currentUser.uid
        ]
      }
    );

    const conversationUpdate = {

      lastMessage: {
        type: "text",
        text,
        senderId:
          currentUser.uid
      },

      lastMessageAt:
        serverTimestamp(),

      updatedAt:
        serverTimestamp(),

      [`unreadCounts.${currentUser.uid}`]:
        0,

      [`lastReadAt.${currentUser.uid}`]:
        serverTimestamp()
    };

    if (
      otherUser.uid &&
      otherUser.uid !== "support"
    ) {

      conversationUpdate[
        `unreadCounts.${otherUser.uid}`
      ] = increment(1);
    }

    batch.update(
      conversationRef,
      conversationUpdate
    );

    await batch.commit();

    scrollToBottom(true);

  } catch (error) {

    console.error(
      "Send error:",
      error
    );

    input.value =
      originalText;

    resizeTextarea();

    alert(
      "Message could not be sent. Please try again."
    );

  } finally {

    sending = false;

    updateSendButton();

    input.focus();
  }
}


/* SEND IMAGE */

async function sendImage(file) {

  if (
    !file ||
    !currentUser ||
    !conversation ||
    !otherUser
  ) {
    return;
  }

  if (
    !file.type.startsWith(
      "image/"
    )
  ) {

    alert(
      "Please select an image."
    );

    return;
  }

  const maxSize =
    8 * 1024 * 1024;

  if (
    file.size > maxSize
  ) {

    alert(
      "Image must be smaller than 8 MB."
    );

    return;
  }

  hideAttachmentSheet();

  try {

    const extension =
      (
        file.name
          .split(".")
          .pop() ||
        "jpg"
      )
        .replace(
          /[^a-zA-Z0-9]/g,
          ""
        );

    const path =
      `chat/${conversationId}/${currentUser.uid}/${Date.now()}-${crypto.randomUUID()}.${extension}`;

    const storageRef =
      ref(
        storage,
        path
      );

    const uploaded =
      await uploadBytes(
        storageRef,
        file,
        {
          contentType:
            file.type
        }
      );

    const imageURL =
      await getDownloadURL(
        uploaded.ref
      );

    const messageRef =
      doc(
        collection(
          db,
          "conversations",
          conversationId,
          "messages"
        )
      );

    const conversationRef =
      doc(
        db,
        "conversations",
        conversationId
      );

    const batch =
      writeBatch(db);

    batch.set(
      messageRef,
      {
        senderId:
          currentUser.uid,

        type:
          "image",

        imageURL,

        storagePath:
          path,

        text: "",

        createdAt:
          serverTimestamp(),

        readBy: [
          currentUser.uid
        ]
      }
    );

    const update = {

      lastMessage: {
        type: "image",
        text: "",
        senderId:
          currentUser.uid
      },

      lastMessageAt:
        serverTimestamp(),

      updatedAt:
        serverTimestamp(),

      [`unreadCounts.${currentUser.uid}`]:
        0,

      [`lastReadAt.${currentUser.uid}`]:
        serverTimestamp()
    };

    if (
      otherUser.uid &&
      otherUser.uid !== "support"
    ) {

      update[
        `unreadCounts.${otherUser.uid}`
      ] = increment(1);
    }

    batch.update(
      conversationRef,
      update
    );

    await batch.commit();

  } catch (error) {

    console.error(
      "Image upload:",
      error
    );

    alert(
      "Photo could not be sent."
    );
  }
}


/* INPUT */

function resizeTextarea() {

  input.style.height =
    "auto";

  input.style.height =
    `${Math.min(
      input.scrollHeight,
      120
    )}px`;
}


function updateSendButton() {

  sendButton.disabled =
    sending ||
    !input.value.trim();
}


input.addEventListener(
  "input",
  () => {

    resizeTextarea();

    updateSendButton();
  }
);


input.addEventListener(
  "keydown",
  event => {

    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.isComposing
    ) {

      event.preventDefault();

      if (
        input.value.trim()
      ) {
        form.requestSubmit();
      }
    }
  }
);


form.addEventListener(
  "submit",
  event => {

    event.preventDefault();

    sendText();
  }
);


/* ATTACHMENT SHEET */

function showAttachmentSheet() {

  $("#attachmentSheet").hidden =
    false;
}


function hideAttachmentSheet() {

  $("#attachmentSheet").hidden =
    true;
}


$("#attachButton")
  .addEventListener(
    "click",
    showAttachmentSheet
  );


$("#attachmentBackdrop")
  .addEventListener(
    "click",
    hideAttachmentSheet
  );


$("#cancelAttachment")
  .addEventListener(
    "click",
    hideAttachmentSheet
  );


$("#chooseImage")
  .addEventListener(
    "click",
    () => {

      $("#imageInput").click();
    }
  );


$("#imageInput")
  .addEventListener(
    "change",
    event => {

      const file =
        event.target.files?.[0];

      if (file) {
        sendImage(file);
      }

      event.target.value = "";
    }
  );


/* BACK */

$("#chatBack")
  .addEventListener(
    "click",
    () => {

      if (
        history.length > 1
      ) {

        history.back();

      } else {

        location.href =
          "message.html";
      }
    }
  );


/* INFO */

$("#chatInfoButton")
  .addEventListener(
    "click",
    () => {

      if (
        conversation?.shopId
      ) {

        location.href =
          `shop.html?id=${
            encodeURIComponent(
              conversation.shopId
            )
          }`;

        return;
      }

      if (
        conversation?.isSupport
      ) {

        location.href =
          "help.html";
      }
    }
  );


/* AUTH + INIT */

onAuthStateChanged(
  auth,
  async user => {

    if (!user) {

      location.replace(
        "auth.html?redirect=" +
        encodeURIComponent(
          location.pathname +
          location.search
        )
      );

      return;
    }

    currentUser = user;

    if (!conversationId) {

      showError(
        "Conversation ID is missing."
      );

      return;
    }

    try {

      /*
        Perform an initial get before
        starting the listeners.
      */

      const ref =
        doc(
          db,
          "conversations",
          conversationId
        );

      const snapshot =
        await getDoc(ref);

      if (!snapshot.exists()) {

        showError(
          "Conversation not found."
        );

        return;
      }

      const data =
        snapshot.data();

      if (
        !Array.isArray(
          data.participants
        ) ||
        !data.participants.includes(
          user.uid
        )
      ) {

        showError(
          "You don't have access to this conversation."
        );

        return;
      }

      conversation = {
        id:
          snapshot.id,
        ...data
      };

      otherUser =
        resolveOtherUser(
          conversation
        );

      renderHeader();

      listenConversation();

      listenMessages();

    } catch (error) {

      console.error(
        "Chat init:",
        error
      );

      showError(
        error.code ===
        "permission-denied"
          ? "You don't have permission to open this conversation."
          : "Unable to open this conversation."
      );
    }
  }
);


/* CLEANUP */

window.addEventListener(
  "beforeunload",
  () => {

    if (
      typeof unsubscribeMessages ===
      "function"
    ) {
      unsubscribeMessages();
    }

    if (
      typeof unsubscribeConversation ===
      "function"
    ) {
      unsubscribeConversation();
    }
  }
);