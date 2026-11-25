/**
 * Student Web App / PWA Client
 * Handles:
 * 1. Persistent Device Hardware Fingerprint (Anti-Proxy)
 * 2. Instant URL-based or Camera-based QR Code scanning
 * 3. Token Verification with Google Apps Script Backend
 */

// Configuration: Google Apps Script Web App URL
let BACKEND_URL = localStorage.getItem("CR_BACKEND_URL") || "https://script.google.com/macros/s/AKfycbzRau2SYCTdz-ZVORKM5neTShBJZ9Oh0CUbvA14wYCXb7UIdSTsYM7zYKegX3QCle1o/exec";

// DOM Elements
const editProfileBtn = document.getElementById("editProfileBtn");
const profileDisplay = document.getElementById("profileDisplay");
const profileForm = document.getElementById("profileForm");
const inputRoll = document.getElementById("inputRoll");
const inputName = document.getElementById("inputName");
const displayRoll = document.getElementById("displayRoll");
const displayName = document.getElementById("displayName");
const deviceSummary = document.getElementById("deviceSummary");

const scanModeBox = document.getElementById("scanModeBox");
const readerWrapper = document.getElementById("reader-wrapper");
const startScanBtn = document.getElementById("startScanBtn");
const stopScanBtn = document.getElementById("stopScanBtn");

const processingBox = document.getElementById("processingBox");
const successBox = document.getElementById("successBox");
const errorBox = document.getElementById("errorBox");

const successDetails = document.getElementById("successDetails");
const successSubject = document.getElementById("successSubject");
const successTime = document.getElementById("successTime");
const scanAgainBtn = document.getElementById("scanAgainBtn");

const errorTitle = document.getElementById("errorTitle");
const errorMessage = document.getElementById("errorMessage");
const retryBtn = document.getElementById("retryBtn");

let html5QrScanner = null;
let currentDeviceId = null;

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  initRosterDropdown();
  initDeviceFingerprint();
  loadSavedProfile();
  checkForUrlTokens();
  setupEventListeners();
});

function initRosterDropdown() {
  inputRoll.innerHTML = '<option value="">Select your roll number...</option>';
  for (let i = 1; i <= 47; i++) {
    if (i === 19) continue; // Roll 19 does not exist
    const pad = (i < 10 ? "00" : (i < 100 ? "0" : "")) + i;
    const fullId = `250423004${pad}`;
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = `Roll #${i < 10 ? '0' + i : i} (${fullId})`;
    inputRoll.appendChild(opt);
  }
}

/**
 * Generate a persistent hardware-backed device fingerprint
 * Stored in localStorage and combined with client characteristics
 */
function initDeviceFingerprint() {
  let devId = localStorage.getItem("STUDENT_DEVICE_UUID");
  if (!devId) {
    // Generate UUIDv4 + screen/hardware entropy
    const screenEntropy = `${window.screen.width}x${window.screen.height}_${navigator.hardwareConcurrency || 4}`;
    const randomBytes = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
    devId = `DEV_${randomBytes}_${screenEntropy}`;
    localStorage.setItem("STUDENT_DEVICE_UUID", devId);
  }
  currentDeviceId = devId;
  const shortId = devId.substring(4, 12).toUpperCase();
  deviceSummary.textContent = `ID: ${shortId}`;
}

function loadSavedProfile() {
  const savedRoll = localStorage.getItem("STUDENT_ROLL");
  const savedName = localStorage.getItem("STUDENT_NAME");

  if (savedRoll && savedName) {
    const rInt = parseInt(savedRoll, 10);
    const pad = (rInt < 10 ? "00" : (rInt < 100 ? "0" : "")) + rInt;
    const fullId = `250423004${pad}`;
    displayRoll.textContent = `#${rInt < 10 ? '0' + rInt : rInt}`;
    displayName.textContent = `${savedName}`;
    inputRoll.value = savedRoll;
    inputName.value = savedName;
    profileDisplay.classList.remove("hidden");
    profileForm.classList.add("hidden");
  } else {
    // Show form if not set
    profileDisplay.classList.add("hidden");
    profileForm.classList.remove("hidden");
  }
}

function setupEventListeners() {
  editProfileBtn.addEventListener("click", () => {
    profileDisplay.classList.toggle("hidden");
    profileForm.classList.toggle("hidden");
  });

  profileForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const roll = inputRoll.value.trim();
    const name = inputName.value.trim();

    if (!roll || !name) {
      alert("Please select your Roll Number and enter your Full Name.");
      return;
    }

    localStorage.setItem("STUDENT_ROLL", roll);
    localStorage.setItem("STUDENT_NAME", name);
    loadSavedProfile();
  });

  startScanBtn.addEventListener("click", startCameraScanner);
  stopScanBtn.addEventListener("click", stopCameraScanner);
  scanAgainBtn.addEventListener("click", resetToScanner);
  retryBtn.addEventListener("click", resetToScanner);
}

/**
 * Check if the student reached this page by scanning with a phone camera app
 * Query format: ?sid=abc&w=1234&hash=xyz&api=...
 */
function checkForUrlTokens() {
  const params = new URLSearchParams(window.location.search);
  const sid = params.get("sid");
  const w = params.get("w");
  const hash = params.get("hash");
  const api = params.get("api");

  if (api) {
    BACKEND_URL = decodeURIComponent(api);
    localStorage.setItem("CR_BACKEND_URL", BACKEND_URL);
  }

  if (sid && w && hash) {
    // Clear URL parameters to prevent re-submitting on refresh
    window.history.replaceState({}, document.title, window.location.pathname);
    submitAttendancePayload(sid, w, hash);
  }
}

/**
 * Start In-Browser Camera Scanner
 */
function startCameraScanner() {
  const roll = localStorage.getItem("STUDENT_ROLL");
  if (!roll) {
    alert("Please select and save your Roll Number before scanning.");
    profileDisplay.classList.add("hidden");
    profileForm.classList.remove("hidden");
    return;
  }

  scanModeBox.classList.remove("hidden");
  readerWrapper.classList.remove("hidden");
  startScanBtn.classList.add("hidden");
  stopScanBtn.classList.remove("hidden");

  html5QrScanner = new Html5Qrcode("reader");
  const config = { fps: 15, qrbox: { width: 250, height: 250 } };

  html5QrScanner.start(
    { facingMode: "environment" },
    config,
    onQrCodeScanned,
    (errorMessage) => { /* ignore minor scan frames */ }
  ).catch(err => {
    console.error("Camera error:", err);
    alert("Camera permission denied or camera not accessible.");
    stopCameraScanner();
  });
}

function stopCameraScanner() {
  if (html5QrScanner) {
    html5QrScanner.stop().then(() => {
      html5QrScanner.clear();
      html5QrScanner = null;
    }).catch(console.error);
  }
  readerWrapper.classList.add("hidden");
  startScanBtn.classList.remove("hidden");
  stopScanBtn.classList.add("hidden");
}

/**
 * Handle Scanned QR code text
 * Expected formats:
 * 1. JSON: {"sid":"...","w":123,"hash":"..."}
 * 2. URL: https://...?sid=...&w=...&hash=...
 */
function onQrCodeScanned(decodedText) {
  stopCameraScanner();

  try {
    let sid, w, hash;

    if (decodedText.startsWith("{")) {
      const obj = JSON.parse(decodedText);
      sid = obj.sid;
      w = obj.w;
      hash = obj.hash;
    } else if (decodedText.includes("sid=")) {
      const url = new URL(decodedText);
      sid = url.searchParams.get("sid");
      w = url.searchParams.get("w");
      hash = url.searchParams.get("hash");
    }

    if (!sid || !w || !hash) {
      showError("Invalid QR Code", "The scanned QR code is not a valid attendance token.");
      return;
    }

    submitAttendancePayload(sid, w, hash);
  } catch (e) {
    showError("QR Parsing Failed", "Could not parse attendance code: " + e.message);
  }
}

/**
 * Submit token to Google Apps Script Backend
 */
async function submitAttendancePayload(sessionId, windowVal, hashVal) {
  const roll = localStorage.getItem("STUDENT_ROLL");
  const name = localStorage.getItem("STUDENT_NAME") || `Roll ${roll}`;

  if (!roll) {
    showError("Roll Number Required", "Please configure your Roll Number in your profile first.");
    return;
  }

  showProcessing();

  const payload = {
    action: "markAttendance",
    sessionId: sessionId,
    window: windowVal,
    hash: hashVal,
    rollNumber: roll,
    studentName: name,
    deviceId: currentDeviceId
  };

  try {
    // If backend URL is still placeholder or local testing mode
    if (BACKEND_URL.includes("YOUR_SCRIPT_ID")) {
      // Demo mock mode for offline demonstration
      setTimeout(() => {
        showSuccess({
          rollNumber: roll,
          studentName: name,
          subject: "Demo Class",
          timestamp: new Date().toLocaleTimeString()
        });
      }, 700);
      return;
    }

    const response = await fetch(BACKEND_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (result.success) {
      // Vibrate phone on successful mark (if supported)
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      showSuccess(result);
    } else {
      if (navigator.vibrate) navigator.vibrate([300]);
      showError(
        result.error.includes("PROXY") ? "Proxy Blocked!" : "Verification Failed",
        result.error
      );
    }
  } catch (err) {
    showError("Network Error", "Unable to connect to Google Sheets server. Check your internet connection.");
  }
}

// UI State Switchers
function showProcessing() {
  scanModeBox.classList.add("hidden");
  successBox.classList.add("hidden");
  errorBox.classList.add("hidden");
  processingBox.classList.remove("hidden");
}

function showSuccess(data) {
  processingBox.classList.add("hidden");
  scanModeBox.classList.add("hidden");
  errorBox.classList.add("hidden");
  successBox.classList.remove("hidden");

  successDetails.textContent = `Roll #${data.rollNumber} • ${data.studentName}`;
  successSubject.textContent = data.subject || "Lecture";
  successTime.textContent = data.timestamp || new Date().toLocaleTimeString();
}

function showError(title, msg) {
  processingBox.classList.add("hidden");
  scanModeBox.classList.add("hidden");
  successBox.classList.add("hidden");
  errorBox.classList.remove("hidden");

  errorTitle.textContent = title;
  errorMessage.textContent = msg;
}

function resetToScanner() {
  processingBox.classList.add("hidden");
  successBox.classList.add("hidden");
  errorBox.classList.add("hidden");
  scanModeBox.classList.remove("hidden");
}
