/**
 * NFSU Student Attendance Portal Client
 * Supports:
 * - Direct camera scan from projector (opens webpage with ?sid=...&w=...&h=...)
 * - Automatic instant attendance marking if profile is saved
 * - 1-tap first-time roll number registration if profile is not yet saved
 * - Device hardware fingerprint locking (anti-proxy)
 */

const BACKEND_URL = "https://script.google.com/macros/s/AKfycbzRau2SYCTdz-ZVORKM5neTShBJZ9Oh0CUbvA14wYCXb7UIdSTsYM7zYKegX3QCle1o/exec";

// Master Roster of 46 NFSU Students
const ROSTER = [
  { roll: 1,  eno: "4001", name: "ROHIT GUPTA" },
  { roll: 2,  eno: "4002", name: "VISHAL KUMAR" },
  { roll: 3,  eno: "4003", name: "INDRANIL DEBNATH" },
  { roll: 4,  eno: "4004", name: "HIMUL DAS" },
  { roll: 5,  eno: "4005", name: "DIVYANSHI SHUKLA" },
  { roll: 6,  eno: "4006", name: "SHIVANI KUMARI" },
  { roll: 7,  eno: "4007", name: "SUBHAJIT MONDAL" },
  { roll: 8,  eno: "4008", name: "RISHIRAJ SINGH" },
  { roll: 9,  eno: "4009", name: "BARLA JASHWANTH" },
  { roll: 10, eno: "4010", name: "SATYAM SUNDAR DUTTA" },
  { roll: 11, eno: "4011", name: "ANAS KHALIL" },
  { roll: 12, eno: "4012", name: "BHAVESH SHARMA" },
  { roll: 13, eno: "4013", name: "PULKIT JAIN" },
  { roll: 14, eno: "4014", name: "PARSAPU SATISH KUMAR" },
  { roll: 15, eno: "4015", name: "BHUMIKA DIGAMBAR PATIL" },
  { roll: 16, eno: "4016", name: "RAMRAJE LAXMAN SONVANE" },
  { roll: 17, eno: "4017", name: "YUVRAJ KARAN SINGH" },
  { roll: 18, eno: "4018", name: "TANVI RAJESH JADHAV" },
  // Roll 19 skipped
  { roll: 20, eno: "4020", name: "ANURIMA MAITY" },
  { roll: 21, eno: "4021", name: "TANVI S NAIK" },
  { roll: 22, eno: "4022", name: "NIVEDITA KANWAR" },
  { roll: 23, eno: "4023", name: "RASHIKA MEENA" },
  { roll: 24, eno: "4024", name: "IHA MEENA" },
  { roll: 25, eno: "4025", name: "AARYA SINGH" },
  { roll: 26, eno: "4026", name: "CHHAVI CHHABRA" },
  { roll: 27, eno: "4027", name: "NEHA KASHYAP" },
  { roll: 28, eno: "4028", name: "KHUSHI SAINI" },
  { roll: 29, eno: "4029", name: "NAINA NIXON MIRANDA" },
  { roll: 30, eno: "4030", name: "SHUBHANGI RASTOGI" },
  { roll: 31, eno: "4031", name: "RAJANALA SAI DHANUSH" },
  { roll: 32, eno: "4032", name: "SREEJOYEE GONOPADHYAY" },
  { roll: 33, eno: "4033", name: "ISHA GHOSH" },
  { roll: 34, eno: "4034", name: "PIYUSH ANAND" },
  { roll: 35, eno: "4035", name: "NANDINI RANA" },
  { roll: 36, eno: "4036", name: "VAISHNAVI" },
  { roll: 37, eno: "4037", name: "NANCY" },
  { roll: 38, eno: "4038", name: "KATCHA KIRAN" },
  { roll: 39, eno: "4039", name: "DOLLY KUMARI" },
  { roll: 40, eno: "4040", name: "PRIYANSHU GUPTA" },
  { roll: 41, eno: "4041", name: "ADRIKA SAHA" },
  { roll: 42, eno: "4042", name: "HOPE KADZO MANGI" },
  { roll: 43, eno: "4043", name: "MUNDHIR MAKAME ALI" },
  { roll: 44, eno: "4044", name: "ISHIMWE JEAN D AMOUR" },
  { roll: 45, eno: "4045", name: "THEERTHA SREEKUMAR" },
  { roll: 46, eno: "4046", name: "TANVI RAJENDRA JOG" },
  { roll: 47, eno: "4047", name: "LAVANYA VIVEKANAND BHONSLE" }
];

// DOM Elements
const editProfileBtn = document.getElementById("editProfileBtn");
const profileDisplay = document.getElementById("profileDisplay");
const profileForm = document.getElementById("profileForm");
const inputRoll = document.getElementById("inputRoll");
const inputName = document.getElementById("inputName");
const displayRoll = document.getElementById("displayRoll");
const displayName = document.getElementById("displayName");
const displayFullId = document.getElementById("displayFullId");
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
let currentHardwareId = null;
let pendingToken = null; // Stores { sid, w, h } if student needs to pick roll first

document.addEventListener("DOMContentLoaded", () => {
  initRosterDropdown();
  initDeviceFingerprint();
  loadSavedProfile();
  checkForUrlTokens();
  setupEventListeners();
});

function initRosterDropdown() {
  inputRoll.innerHTML = '<option value="">Select your roll number...</option>';
  ROSTER.forEach(s => {
    const pad = s.roll < 10 ? "0" + s.roll : s.roll;
    const opt = document.createElement("option");
    opt.value = s.roll;
    opt.textContent = `Roll #${pad} — ${s.name} (${s.eno})`;
    inputRoll.appendChild(opt);
  });

  inputRoll.addEventListener("change", () => {
    const selected = ROSTER.find(s => s.roll === parseInt(inputRoll.value, 10));
    if (selected && !inputName.value) {
      inputName.value = selected.name;
    }
  });
}

/**
 * Generates an immutable hardware fingerprint based on physical device characteristics:
 * - WebGL unmasked GPU vendor & renderer
 * - 2D Canvas rendering & antialiasing signature
 * - Physical display geometry & color depth
 * - CPU core count & platform
 * 
 * Stays identical even across Incognito/Private tabs and browser data clearing.
 */
function getHardwareFingerprint() {
  const parts = [];

  const scr = window.screen;
  parts.push(scr ? `${scr.width}x${scr.height}x${scr.colorDepth}` : "scr_na");
  parts.push(`dpr:${window.devicePixelRatio || 1}`);
  parts.push(`cpu:${navigator.hardwareConcurrency || 0}`);
  parts.push(`plat:${navigator.platform || ""}`);
  parts.push(`tz:${Intl.DateTimeFormat().resolvedOptions().timeZone || ""}`);
  parts.push(`lang:${navigator.language || ""}`);

  // WebGL GPU Chipset
  try {
    const glCanvas = document.createElement("canvas");
    const gl = glCanvas.getContext("webgl") || glCanvas.getContext("experimental-webgl");
    if (gl) {
      const dbg = gl.getExtension("WEBGL_debug_renderer_info");
      if (dbg) {
        parts.push(`gpu_v:${gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL)}`);
        parts.push(`gpu_r:${gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)}`);
      }
    }
  } catch (e) {}

  // 2D Canvas Antialiasing Signature
  try {
    const c2d = document.createElement("canvas");
    c2d.width = 240;
    c2d.height = 60;
    const ctx = c2d.getContext("2d");
    if (ctx) {
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = "#f60";
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = "#069";
      ctx.font = "14px 'Arial', sans-serif";
      ctx.fillText("NFSU_PROXY_SHIELD_2026", 4, 18);
      ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
      ctx.font = "16px 'Times New Roman', serif";
      ctx.fillText("NFSU_PROXY_SHIELD_2026", 6, 20);
      parts.push(`c2d:${c2d.toDataURL().slice(-60)}`);
    }
  } catch (e) {}

  const rawStr = parts.join("|#|");
  let h1 = 0xdeadbeef, h2 = 0x41c64e6d;
  for (let i = 0; i < rawStr.length; i++) {
    const ch = rawStr.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const finalHash = 4294967296 * (2097151 & h2) + (h1 >>> 0);

  return "HW_" + Math.abs(finalHash).toString(16) + "_" + (scr ? `${scr.width}x${scr.height}` : "0x0");
}

function initDeviceFingerprint() {
  currentHardwareId = getHardwareFingerprint();

  let devId = localStorage.getItem("STUDENT_DEVICE_UUID");
  if (!devId) {
    const randomBytes = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
    devId = `DEV_${randomBytes}`;
    localStorage.setItem("STUDENT_DEVICE_UUID", devId);
  }
  currentDeviceId = `${currentHardwareId}|${devId}`;
  if (deviceSummary) {
    deviceSummary.textContent = "Hardware Locked";
  }
}

function loadSavedProfile() {
  const savedRoll = localStorage.getItem("STUDENT_ROLL");
  const savedName = localStorage.getItem("STUDENT_NAME");

  if (savedRoll && savedName) {
    const rInt = parseInt(savedRoll, 10);
    const item = ROSTER.find(s => s.roll === rInt);
    const eno = item ? item.eno : ("40" + (rInt < 10 ? "0" + rInt : rInt));
    displayRoll.textContent = `#${rInt < 10 ? '0' + rInt : rInt}`;
    displayName.textContent = savedName;
    if (displayFullId) displayFullId.textContent = `E.NO: ${eno} • 25042300${eno}`;
    inputRoll.value = savedRoll;
    inputName.value = savedName;
    profileDisplay.classList.remove("hidden");
    profileForm.classList.add("hidden");

    if (editProfileBtn) {
      editProfileBtn.textContent = "🔒 Locked";
      editProfileBtn.classList.add("text-slate-400");
    }
  } else {
    profileDisplay.classList.add("hidden");
    profileForm.classList.remove("hidden");
    if (editProfileBtn) {
      editProfileBtn.textContent = "Setup";
    }
  }
}

function setupEventListeners() {
  editProfileBtn.addEventListener("click", () => {
    const savedRoll = localStorage.getItem("STUDENT_ROLL");
    if (savedRoll) {
      alert(`🔒 Device Locked to Roll #${savedRoll} (${localStorage.getItem("STUDENT_NAME")})\n\nTo prevent proxy attendance, device re-registration is locked. If you changed your mobile phone, please contact the CR to reset your binding.`);
      return;
    }
    profileDisplay.classList.toggle("hidden");
    profileForm.classList.toggle("hidden");
  });

  profileForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const roll = inputRoll.value.trim();
    const name = inputName.value.trim();

    if (!roll) {
      alert("Please select your Roll Number.");
      return;
    }

    const studentObj = ROSTER.find(s => s.roll === parseInt(roll, 10));
    const finalName = name || (studentObj ? studentObj.name : `Student ${roll}`);

    localStorage.setItem("STUDENT_ROLL", roll);
    localStorage.setItem("STUDENT_NAME", finalName);
    loadSavedProfile();

    // If student just scanned a projector QR code and had to fill profile first, submit now!
    if (pendingToken) {
      submitAttendancePayload(pendingToken.sid, pendingToken.w, pendingToken.h);
      pendingToken = null;
    }
  });

  startScanBtn.addEventListener("click", startCameraScanner);
  stopScanBtn.addEventListener("click", stopCameraScanner);
  if (scanAgainBtn) {
    scanAgainBtn.addEventListener("click", resetToScanner);
  }
  retryBtn.addEventListener("click", resetToScanner);
}

/**
 * Automatically handle URL when student scans QR code using phone camera
 * Supports: ?sid=...&w=...&h=...
 */
function checkForUrlTokens() {
  const params = new URLSearchParams(window.location.search);
  const sid = params.get("sid");
  const w = params.get("w");
  const h = params.get("h") || params.get("hash");

  if (sid && w && h) {
    window.history.replaceState({}, document.title, window.location.pathname);
    const savedRoll = localStorage.getItem("STUDENT_ROLL");
    const completedRoll = localStorage.getItem("ATTENDANCE_COMPLETED_" + sid) || sessionStorage.getItem("ATTENDANCE_COMPLETED_" + sid);

    if (completedRoll) {
      const savedName = localStorage.getItem("STUDENT_NAME") || `Roll #${completedRoll}`;
      showSuccess({
        rollNumber: completedRoll,
        studentName: savedName,
        sessionId: sid,
        subject: "Active Lecture",
        timestamp: "Already Recorded ✓"
      });
      return;
    }

    if (savedRoll) {
      // Student already set up: Instant 1-tap submission!
      submitAttendancePayload(sid, w, h);
    } else {
      // First time: Prompt to select roll number
      pendingToken = { sid, w, h };
      profileDisplay.classList.add("hidden");
      profileForm.classList.remove("hidden");
      alert("Welcome! Please select your Roll Number once to register your phone.");
    }
  }
}

function startCameraScanner() {
  const roll = localStorage.getItem("STUDENT_ROLL");
  if (!roll) {
    alert("Please select your Roll Number first.");
    profileDisplay.classList.add("hidden");
    profileForm.classList.remove("hidden");
    return;
  }

  scanModeBox.classList.remove("hidden");
  readerWrapper.classList.remove("hidden");
  startScanBtn.classList.add("hidden");
  stopScanBtn.classList.remove("hidden");

  html5QrScanner = new Html5Qrcode("reader");
  const config = { fps: 15, qrbox: { width: 240, height: 240 } };

  html5QrScanner.start(
    { facingMode: "environment" },
    config,
    onQrCodeScanned,
    () => {}
  ).catch(err => {
    alert("Camera permission denied.");
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

function onQrCodeScanned(decodedText) {
  stopCameraScanner();
  try {
    let sid, w, h;
    if (decodedText.includes("sid=")) {
      const url = new URL(decodedText);
      sid = url.searchParams.get("sid");
      w = url.searchParams.get("w");
      h = url.searchParams.get("h") || url.searchParams.get("hash");
    } else if (decodedText.startsWith("{")) {
      const obj = JSON.parse(decodedText);
      sid = obj.sid;
      w = obj.w;
      h = obj.h || obj.hash;
    }

    if (!sid || !w || !h) {
      showError("Invalid Code", "Scanned QR code is not a valid attendance token.");
      return;
    }

    submitAttendancePayload(sid, w, h);
  } catch (e) {
    showError("Parse Failed", "Unable to read token: " + e.message);
  }
}

async function submitAttendancePayload(sessionId, windowVal, hashVal) {
  const roll = localStorage.getItem("STUDENT_ROLL");
  const name = localStorage.getItem("STUDENT_NAME") || `Roll ${roll}`;

  if (!roll) {
    showError("Roll Required", "Please configure your Roll Number in your profile first.");
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
    deviceId: currentDeviceId,
    hardwareId: currentHardwareId
  };

  try {
    const response = await fetch(BACKEND_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (result.success) {
      if (navigator.vibrate) navigator.vibrate([80, 40, 80]);
      // Attach sessionId if missing in response for storage locking
      if (!result.sessionId) result.sessionId = sessionId;
      showSuccess(result);
    } else {
      if (navigator.vibrate) navigator.vibrate([250]);
      showError(
        result.error.includes("PROXY") || result.error.includes("MISMATCH") ? "Proxy Blocked" : "Verification Failed",
        result.error
      );
    }
  } catch (err) {
    showError("Connection Failed", "Unable to reach server. Please check internet connection.");
  }
}

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

  // Lock this session on device storage to prevent re-scanning for other students
  if (data.sessionId) {
    localStorage.setItem("ATTENDANCE_COMPLETED_" + data.sessionId, data.rollNumber);
    sessionStorage.setItem("ATTENDANCE_COMPLETED_" + data.sessionId, data.rollNumber);
  }

  const rInt = parseInt(data.rollNumber, 10);
  const studentObj = ROSTER.find(s => s.roll === rInt);
  const eno = studentObj ? studentObj.eno : ("40" + (rInt < 10 ? "0" + rInt : rInt));

  successDetails.textContent = `Roll #${data.rollNumber < 10 ? '0' + data.rollNumber : data.rollNumber} • ${data.studentName} (E.NO: ${eno})`;
  successSubject.textContent = data.subject || "Active Lecture";
  successTime.textContent = data.timestamp || new Date().toLocaleTimeString();

  // Prevent rescanning: Hide or lock the scan-again button for this session
  if (scanAgainBtn) {
    scanAgainBtn.textContent = "Attendance Recorded ✓";
    scanAgainBtn.disabled = true;
    scanAgainBtn.classList.add("opacity-50", "pointer-events-none");
  }
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
