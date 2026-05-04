// Public web mode:
// Firebase Realtime Database URL'ini iki yerde ayni gir:
// 1) Bu dosyada CLOUD_DATABASE_URL
// 2) SentriVest_ESP32_Web.ino icinde firebaseDatabaseURL
const CLOUD_DATABASE_URL = "https://sentrivestesp32web-default-rtdb.europe-west1.firebasedatabase.app";
const CLOUD_DEVICE_ID = "sentrivest-main";

const selectors = {
  apiForm: document.querySelector("#apiForm"),
  deviceBase: document.querySelector("#deviceBase"),
  connectionHelp: document.querySelector("#connectionHelp"),
  connectionPill: document.querySelector("#connectionPill"),
  refreshButton: document.querySelector("#refreshButton"),
  alarmValue: document.querySelector("#alarmValue"),
  alarmDetail: document.querySelector("#alarmDetail"),
  wifiValue: document.querySelector("#wifiValue"),
  ipValue: document.querySelector("#ipValue"),
  gpsValue: document.querySelector("#gpsValue"),
  gpsDetail: document.querySelector("#gpsDetail"),
  updatedValue: document.querySelector("#updatedValue"),
  deviceTimeValue: document.querySelector("#deviceTimeValue"),
  vestStage: document.querySelector("#vestStage"),
  visualRisk: document.querySelector("#visualRisk"),
  visualGpsState: document.querySelector("#visualGpsState"),
  visualGpsHint: document.querySelector("#visualGpsHint"),
  satBadge: document.querySelector("#satBadge"),
  zoneSummary: document.querySelector("#zoneSummary"),
  zoneList: document.querySelector("#zoneList"),
  mapLink: document.querySelector("#mapLink"),
  mapCoord: document.querySelector("#mapCoord"),
  mapStatus: document.querySelector("#mapStatus"),
  liveMapFrame: document.querySelector("#liveMapFrame"),
  latValue: document.querySelector("#latValue"),
  lngValue: document.querySelector("#lngValue"),
  satValue: document.querySelector("#satValue"),
  speedValue: document.querySelector("#speedValue"),
  fixAgeValue: document.querySelector("#fixAgeValue"),
  izlemeToggle: document.querySelector("#izlemeToggle"),
  sistemToggle: document.querySelector("#sistemToggle"),
  notifyButton: document.querySelector("#notifyButton"),
  soundButton: document.querySelector("#soundButton"),
  eventCount: document.querySelector("#eventCount"),
  eventList: document.querySelector("#eventList"),
  toastRoot: document.querySelector("#toastRoot")
};

const appState = {
  baseUrl: "",
  eventsReady: false,
  eventHistory: [],
  lastEventId: 0,
  lastStatus: null,
  soundEnabled: localStorage.getItem("sentrivest:sound") === "1",
  audioContext: null,
  polling: null
};

const POLL_MS = 2000;
const MAX_EVENTS = 30;

function cloudEnabled() {
  return CLOUD_DATABASE_URL.startsWith("https://") && !CLOUD_DATABASE_URL.includes("BURAYA_");
}

function cloudBase() {
  return CLOUD_DATABASE_URL.replace(/\/+$/, "");
}

function cloudPath(path, query = "") {
  const suffix = query ? `?${query}` : "";
  return `${cloudBase()}/devices/${encodeURIComponent(CLOUD_DEVICE_ID)}/${path}.json${suffix}`;
}

function defaultBaseUrl() {
  if (cloudEnabled()) return "";

  const isHttp = location.protocol === "http:" || location.protocol === "https:";
  const isLocal = ["localhost", "127.0.0.1", ""].includes(location.hostname);

  if (isHttp && !isLocal && location.protocol === "http:") {
    return location.origin;
  }

  const stored = localStorage.getItem("sentrivest:deviceBase") || "";
  if (stored && stored !== "http://192.168.4.1") return stored;

  if (location.protocol === "file:") {
    return "http://sentrivest.local";
  }

  return "";
}

function normalizeBaseUrl(value) {
  return value.trim().replace(/\/+$/, "");
}

function apiUrl(path) {
  if (!appState.baseUrl && location.protocol === "file:") {
    throw new Error("Cihaz API adresi gerekli.");
  }
  return `${appState.baseUrl}${path}`;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, { cache: "no-store", ...options });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function localGet(path) {
  return fetchJson(apiUrl(path));
}

async function cloudGet(path, query = "") {
  return fetchJson(cloudPath(path, query));
}

async function cloudPut(path, payload) {
  return fetchJson(cloudPath(path), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

async function readStatus() {
  if (cloudEnabled()) {
    const status = await cloudGet("status");
    if (!status) throw new Error("Bulutta cihaz verisi yok");
    return status;
  }
  return localGet("/api/status");
}

function normalizeCloudEvents(raw) {
  if (!raw || typeof raw !== "object") return [];

  return Object.entries(raw)
    .map(([key, event]) => ({
      id: Number(event?.id || key || 0),
      ...event
    }))
    .sort((a, b) => Number(a.id || 0) - Number(b.id || 0))
    .slice(-MAX_EVENTS);
}

async function readEvents(after) {
  if (cloudEnabled()) {
    const raw = await cloudGet("events", "orderBy=%22$key%22&limitToLast=30");
    return normalizeCloudEvents(raw).filter((event) => Number(event.id || 0) > after);
  }
  const payload = await localGet(`/api/events?after=${after}`);
  return Array.isArray(payload.events) ? payload.events : [];
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setPill(element, text, tone) {
  if (!element) return;
  element.textContent = text;
  element.className = `pill ${tone}`;
}

function sourceText() {
  if (cloudEnabled()) return "Bulut uzerinden herkese acik canli veri aliniyor.";
  return `Yerel veri ${appState.baseUrl || location.origin} adresinden aliniyor.`;
}

function setConnection(connected, detail = "") {
  if (connected) {
    setPill(selectors.connectionPill, cloudEnabled() ? "Bulut bagli" : "Bagli", "ok");
    if (selectors.connectionHelp) selectors.connectionHelp.textContent = sourceText();
  } else {
    setPill(selectors.connectionPill, detail || "Baglanti yok", "danger");
    if (selectors.connectionHelp) {
      selectors.connectionHelp.textContent = cloudEnabled()
        ? "Bulutta veri yok. ESP32 acik olmali, Wi-Fi'ye baglanmali ve Firebase adresi .ino icinde dogru olmali."
        : "Durum gorunmuyorsa ESP32 ile ayni Wi-Fi/hotspot aginda ac ve Serial Monitor'daki IP adresini Cihaz API adresi alanina yaz.";
    }
  }
}

function secondsText(seconds) {
  if (seconds === null || seconds === undefined || Number.isNaN(Number(seconds))) return "-";
  const value = Math.max(0, Number(seconds));
  if (value < 60) return `${Math.floor(value)} sn`;
  const minutes = Math.floor(value / 60);
  const rest = Math.floor(value % 60);
  return `${minutes} dk ${rest} sn`;
}

function eventAge(event) {
  if (event.createdAt) {
    return Math.floor((Date.now() - Number(event.createdAt)) / 1000);
  }
  return Number(event.ageSeconds || 0);
}

function mapEmbedUrl(lat, lng) {
  const latitude = Number(lat);
  const longitude = Number(lng);
  const delta = 0.012;
  const bbox = [
    longitude - delta,
    latitude - delta,
    longitude + delta,
    latitude + delta
  ].join(",");

  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${latitude},${longitude}`;
}

function updateMap(gps) {
  if (!selectors.liveMapFrame || !selectors.mapStatus) return;

  if (gps.fixValid) {
    const lat = Number(gps.lat);
    const lng = Number(gps.lng);
    const nextSrc = mapEmbedUrl(lat, lng);

    if (selectors.liveMapFrame.dataset.src !== nextSrc) {
      selectors.liveMapFrame.src = nextSrc;
      selectors.liveMapFrame.dataset.src = nextSrc;
    }

    selectors.mapStatus.textContent = `Konum: ${lat.toFixed(6)}, ${lng.toFixed(6)} - son fix ${secondsText(gps.fixAgeSeconds)} once`;
    selectors.mapStatus.classList.add("is-live");
    setPill(selectors.mapCoord, `${lat.toFixed(4)}, ${lng.toFixed(4)}`, "ok");
  } else {
    selectors.liveMapFrame.removeAttribute("src");
    selectors.liveMapFrame.dataset.src = "";
    selectors.mapStatus.textContent = "GPS fix geldiginde harita burada canli guncellenecek.";
    selectors.mapStatus.classList.remove("is-live");
    setPill(selectors.mapCoord, "GPS bekleniyor", "muted");
  }
}

function updateVisualTracking(zones, gps, alarmActive) {
  selectors.vestStage?.classList.toggle("is-danger", alarmActive);

  zones.forEach((zone, index) => {
    const tone = zone.alarm ? "danger" : "ok";
    const zoneShape = document.querySelector(`#visualZone${index}`);
    const zoneDot = document.querySelector(`#visualDot${index}`);

    zoneShape?.classList.remove("ok", "danger");
    zoneShape?.classList.add(tone);
    zoneDot?.classList.remove("ok", "danger");
    zoneDot?.classList.add(tone);
  });

  const brokenZones = zones.filter((zone) => zone.alarm).map((zone) => zone.name);
  setPill(
    selectors.visualRisk,
    brokenZones.length ? `Risk: ${brokenZones.join(", ")}` : "Takip normal",
    brokenZones.length ? "danger" : "ok"
  );

  if (selectors.satBadge) selectors.satBadge.textContent = String(gps.satellites ?? 0);

  if (selectors.visualGpsState && selectors.visualGpsHint) {
    if (gps.fixValid) {
      selectors.visualGpsState.textContent = "GPS fix aktif";
      selectors.visualGpsHint.textContent = `${Number(gps.lat).toFixed(5)}, ${Number(gps.lng).toFixed(5)} - ${secondsText(gps.fixAgeSeconds)} once`;
    } else {
      selectors.visualGpsState.textContent = "Konum bekleniyor";
      selectors.visualGpsHint.textContent = "Fix alindiginda harita baglantisi aktif olur.";
    }
  }
}

function renderStatus(data) {
  const alarmActive = Boolean(data.alarm);
  const zones = Array.isArray(data.zones) ? data.zones : [];
  const brokenZones = zones.filter((zone) => zone.alarm);
  const healthyZones = zones.filter((zone) => !zone.alarm);
  const gps = data.gps || {};

  appState.lastStatus = data;

  selectors.alarmValue.textContent = alarmActive ? "UYARI" : "NORMAL";
  selectors.alarmDetail.textContent = alarmActive
    ? `Etkilenen: ${brokenZones.map((zone) => zone.name).join(", ") || "-"}`
    : `Saglam: ${healthyZones.map((zone) => zone.name).join(", ") || "-"}`;
  selectors.alarmValue.closest(".metric").classList.toggle("is-danger", alarmActive);
  selectors.alarmValue.closest(".metric").classList.toggle("is-ok", !alarmActive);

  selectors.wifiValue.textContent = data.wifiConnected ? "Bagli" : "Kopuk";
  selectors.ipValue.textContent = data.ip ? `IP: ${data.ip}` : (data.apIp ? `AP: ${data.apIp}` : "IP yok");

  selectors.gpsValue.textContent = gps.fixValid ? "Fix var" : "Fix yok";
  selectors.gpsDetail.textContent = gps.fixValid ? `${gps.satellites ?? 0} uydu` : "Konum bekleniyor";
  updateVisualTracking(zones, gps, alarmActive);
  updateMap(gps);

  selectors.updatedValue.textContent = new Date().toLocaleTimeString("tr-TR");
  selectors.deviceTimeValue.textContent = `Cihaz acik: ${secondsText(Math.floor((data.deviceMillis || 0) / 1000))}`;

  setPill(
    selectors.zoneSummary,
    brokenZones.length ? `${brokenZones.length} alarm` : "Tumu saglam",
    brokenZones.length ? "danger" : "ok"
  );

  selectors.zoneList.innerHTML = zones.map((zone) => {
    const tone = zone.alarm ? "danger" : "ok";
    const state = zone.alarm ? "KOPUK / VURULDU" : "SAGLAM";
    return `
      <div class="zone-item ${tone}">
        <strong>${escapeHtml(zone.name)}</strong>
        <span class="zone-state">${state}</span>
      </div>
    `;
  }).join("") || `<div class="empty-state">Bolge verisi yok</div>`;

  selectors.izlemeToggle.checked = Boolean(data.izlemeMode);
  selectors.sistemToggle.checked = Boolean(data.sistemMode);

  if (gps.fixValid) {
    selectors.latValue.textContent = Number(gps.lat).toFixed(6);
    selectors.lngValue.textContent = Number(gps.lng).toFixed(6);
    selectors.satValue.textContent = String(gps.satellites ?? 0);
    selectors.speedValue.textContent = `${Number(gps.speedKmph || 0).toFixed(2)} km/s`;
    selectors.fixAgeValue.textContent = secondsText(gps.fixAgeSeconds);
    selectors.mapLink.href = `https://maps.google.com/?q=${gps.lat},${gps.lng}`;
    selectors.mapLink.classList.remove("disabled");
  } else {
    selectors.latValue.textContent = "-";
    selectors.lngValue.textContent = "-";
    selectors.satValue.textContent = String(gps.satellites ?? 0);
    selectors.speedValue.textContent = "-";
    selectors.fixAgeValue.textContent = "-";
    selectors.mapLink.href = "#";
    selectors.mapLink.classList.add("disabled");
  }
}

function renderEvents() {
  selectors.eventCount.textContent = `${appState.eventHistory.length} kayit`;

  if (!appState.eventHistory.length) {
    selectors.eventList.innerHTML = `<li class="empty-state">Henuz bildirim yok</li>`;
    return;
  }

  selectors.eventList.innerHTML = appState.eventHistory
    .slice()
    .reverse()
    .map((event) => {
      const tone = event.critical ? "danger" : "";
      return `
        <li class="event-item ${tone}">
          <div class="event-title">
            <span>${escapeHtml(event.title || "Bildirim")}</span>
            <time>${secondsText(eventAge(event))} once</time>
          </div>
          <div class="event-message">${escapeHtml(event.message || "")}</div>
        </li>
      `;
    })
    .join("");
}

function showToast(event) {
  const toast = document.createElement("div");
  toast.className = `toast ${event.critical ? "danger" : ""}`;
  toast.innerHTML = `
    <strong>${escapeHtml(event.title || "Bildirim")}</strong>
    <p>${escapeHtml(event.message || "")}</p>
  `;
  selectors.toastRoot.append(toast);
  window.setTimeout(() => toast.remove(), event.critical ? 9000 : 5200);
}

function ensureAudio() {
  if (!appState.audioContext) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) appState.audioContext = new AudioContext();
  }
  if (appState.audioContext?.state === "suspended") appState.audioContext.resume();
}

function playAlarmTone() {
  if (!appState.soundEnabled) return;
  ensureAudio();
  const audio = appState.audioContext;
  if (!audio) return;

  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  const now = audio.currentTime;

  oscillator.type = "square";
  oscillator.frequency.setValueAtTime(880, now);
  oscillator.frequency.setValueAtTime(660, now + 0.22);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.62);

  oscillator.connect(gain);
  gain.connect(audio.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.65);
}

function browserNotify(event) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  try {
    const notification = new Notification(event.title || "SentriVest", {
      body: String(event.message || "").slice(0, 220),
      tag: `sentrivest-${event.type || "event"}`,
      renotify: Boolean(event.critical)
    });
    window.setTimeout(() => notification.close(), 9000);
  } catch (error) {
    // Browser izinleri veya guvenli baglam eksikse panel ici bildirim devam eder.
  }
}

function handleNewEvent(event) {
  showToast(event);
  browserNotify(event);
  if (event.critical) playAlarmTone();
}

async function refreshEvents() {
  const after = appState.eventsReady ? appState.lastEventId : 0;
  const events = await readEvents(after);

  if (!appState.eventsReady) {
    appState.eventHistory = events.slice(-MAX_EVENTS);
    const lastEvent = appState.eventHistory.length ? appState.eventHistory[appState.eventHistory.length - 1] : null;
    appState.lastEventId = Number(lastEvent?.id || 0);
    appState.eventsReady = true;
    renderEvents();
    return;
  }

  for (const event of events) {
    const id = Number(event.id || 0);
    if (id > appState.lastEventId) {
      appState.eventHistory.push(event);
      appState.eventHistory = appState.eventHistory.slice(-MAX_EVENTS);
      appState.lastEventId = id;
      handleNewEvent(event);
    }
  }

  renderEvents();
}

async function refreshAll() {
  try {
    const status = await readStatus();
    renderStatus(status);
    await refreshEvents();
    setConnection(true);
  } catch (error) {
    setConnection(false, cloudEnabled() ? "Bulut veri yok" : "Baglanti yok");
    selectors.updatedValue.textContent = "-";
    selectors.deviceTimeValue.textContent = error.message;
  }
}

async function setMode(name, enabled) {
  try {
    if (cloudEnabled()) {
      await cloudPut("command", {
        id: Math.floor(Date.now() % 2000000000),
        name,
        enabled,
        createdAt: Date.now()
      });
      showToast({
        title: "Komut buluta gonderildi",
        message: `${name} ${enabled ? "ac" : "kapat"} istegi ESP32 tarafindan okunacak.`,
        critical: false
      });
    } else {
      await localGet(`/api/control?${name}=${enabled ? 1 : 0}`);
    }
    await refreshAll();
  } catch (error) {
    showToast({ title: "Komut gonderilemedi", message: error.message, critical: true });
    await refreshAll();
  }
}

async function requestNotifications() {
  ensureAudio();

  if (!("Notification" in window)) {
    selectors.notifyButton.textContent = "Bildirim yok";
    return;
  }

  try {
    const permission = await Notification.requestPermission();
    selectors.notifyButton.textContent = permission === "granted" ? "Bildirim acik" : "Bildirim kapali";
  } catch (error) {
    selectors.notifyButton.textContent = "Bildirim kapali";
  }
}

function toggleSound() {
  appState.soundEnabled = !appState.soundEnabled;
  localStorage.setItem("sentrivest:sound", appState.soundEnabled ? "1" : "0");
  selectors.soundButton.textContent = appState.soundEnabled ? "Ses acik" : "Sesi ac";
  if (appState.soundEnabled) {
    ensureAudio();
    playAlarmTone();
  }
}

function startPolling() {
  window.clearInterval(appState.polling);
  refreshAll();
  appState.polling = window.setInterval(refreshAll, POLL_MS);
}

function init() {
  appState.baseUrl = normalizeBaseUrl(defaultBaseUrl());
  selectors.deviceBase.value = cloudEnabled() ? "Firebase bulut modu aktif" : appState.baseUrl;
  selectors.deviceBase.disabled = cloudEnabled();
  selectors.apiForm.querySelector("button").disabled = cloudEnabled();
  selectors.soundButton.textContent = appState.soundEnabled ? "Ses acik" : "Sesi ac";

  if (selectors.connectionHelp) {
    selectors.connectionHelp.textContent = cloudEnabled()
      ? "Public link modu hazir. ESP32 Firebase'e veri gonderdiginde herkes bu panelden gorecek."
      : "Firebase adresi girilmedigi icin yerel ESP32 API modu kullaniliyor.";
  }

  if ("Notification" in window) {
    selectors.notifyButton.textContent = Notification.permission === "granted" ? "Bildirim acik" : "Bildirimleri ac";
  } else {
    selectors.notifyButton.textContent = "Bildirim yok";
  }

  selectors.apiForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (cloudEnabled()) return;
    appState.baseUrl = normalizeBaseUrl(selectors.deviceBase.value);
    localStorage.setItem("sentrivest:deviceBase", appState.baseUrl);
    appState.eventsReady = false;
    appState.lastEventId = 0;
    startPolling();
  });

  selectors.refreshButton.addEventListener("click", refreshAll);
  selectors.izlemeToggle.addEventListener("change", () => setMode("izleme", selectors.izlemeToggle.checked));
  selectors.sistemToggle.addEventListener("change", () => setMode("sistem", selectors.sistemToggle.checked));
  selectors.notifyButton.addEventListener("click", requestNotifications);
  selectors.soundButton.addEventListener("click", toggleSound);

  startPolling();
}

init();
