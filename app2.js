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
  liveMapCanvas: document.querySelector("#liveMapCanvas"),
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
  toastRoot: document.querySelector("#toastRoot"),
  languageButtons: document.querySelectorAll("[data-lang-button]")
};

const appState = {
  lang: localStorage.getItem("sentrivest:lang") || "tr",
  baseUrl: "",
  eventsReady: false,
  eventHistory: [],
  lastEventId: 0,
  lastStatus: null,
  lastMapKey: "",
  soundEnabled: localStorage.getItem("sentrivest:sound") === "1",
  audioContext: null,
  polling: null
};

const POLL_MS = 2000;
const MAX_EVENTS = 30;
const MAP_ZOOM = 16;
const TILE_SIZE = 256;

const I18N = {
  tr: {
    appTitle: "Akilli Takip ve Tespit Yelegi",
    waitingConnection: "Baglanti bekleniyor",
    refresh: "Yenile",
    deviceApi: "Cihaz API adresi",
    connect: "Baglan",
    connectionHelpInitial: "Canli durum icin ESP32 ile ayni Wi-Fi/hotspot aginda olunmali.",
    liveArmor: "Canli harita",
    vestTracking: "Yelek uzerinden takip",
    waitingData: "Veri bekleniyor",
    gpsTracking: "GPS takibi",
    waitingLocation: "Konum bekleniyor",
    gpsHint: "Fix alindiginda harita baglantisi aktif olur.",
    lastUpdate: "Son guncelleme",
    zones: "Bolgeler",
    zoneStatus: "Kisim durumlari",
    location: "Konum",
    gpsInfo: "GPS bilgisi",
    map: "Harita",
    latitude: "Enlem",
    longitude: "Boylam",
    satellite: "Uydu",
    speed: "Hiz",
    lastFix: "Son fix",
    liveLocationTracking: "Canli konum takibi",
    waitingGps: "GPS bekleniyor",
    mapWaiting: "GPS fix geldiginde harita burada canli guncellenecek.",
    commands: "Komutlar",
    workMode: "Calisma modu",
    tracking: "Izleme",
    system: "Sistem",
    enableNotifications: "Bildirimleri ac",
    notificationsOpen: "Bildirim acik",
    notificationsClosed: "Bildirim kapali",
    notificationsUnavailable: "Bildirim yok",
    enableSound: "Sesi ac",
    soundOn: "Ses acik",
    notifications: "Bildirimler",
    eventFeed: "Olay akisi",
    noNotifications: "Henuz bildirim yok",
    cloudConnected: "Bulut bagli",
    connected: "Bagli",
    connectionLost: "Baglanti yok",
    cloudNoData: "Bulut veri yok",
    cloudSource: "Bulut uzerinden herkese acik canli veri aliniyor.",
    localSource: "Yerel veri {source} adresinden aliniyor.",
    cloudMissing: "Bulutta veri yok. ESP32 acik olmali, Wi-Fi'ye baglanmali ve Firebase adresi .ino icinde dogru olmali.",
    localMissing: "Durum gorunmuyorsa ESP32 ile ayni Wi-Fi/hotspot aginda ac ve Serial Monitor'daki IP adresini Cihaz API adresi alanina yaz.",
    firebaseActive: "Firebase bulut modu aktif",
    publicReady: "Public link modu hazir. ESP32 Firebase'e veri gonderdiginde herkes bu panelden gorecek.",
    localMode: "Firebase adresi girilmedigi icin yerel ESP32 API modu kullaniliyor.",
    alert: "UYARI",
    normal: "NORMAL",
    affected: "Etkilenen",
    healthy: "Saglam",
    wifiOnline: "Bagli",
    wifiOffline: "Kopuk",
    noIp: "IP yok",
    fix: "Fix var",
    noFix: "Fix yok",
    waitingPosition: "Konum bekleniyor",
    deviceOpen: "Cihaz acik",
    allHealthy: "Tumu saglam",
    alarmCount: "{count} alarm",
    noZoneData: "Bolge verisi yok",
    broken: "KOPUK / VURULDU",
    solid: "SAGLAM",
    trackingNormal: "Takip normal",
    risk: "Risk",
    gpsActive: "GPS fix aktif",
    mapLive: "Konum: {lat}, {lng} - son fix {age} once",
    record: "kayit",
    ago: "once",
    commandSent: "Komut buluta gonderildi",
    commandSentBody: "{name} {state} istegi ESP32 tarafindan okunacak.",
    open: "ac",
    close: "kapat",
    commandFailed: "Komut gonderilemedi",
    seconds: "sn",
    minutes: "dk"
  },
  en: {
    appTitle: "Smart Tracking and Detection Vest",
    waitingConnection: "Waiting for connection",
    refresh: "Refresh",
    deviceApi: "Device API address",
    connect: "Connect",
    connectionHelpInitial: "For local live status, use the same Wi-Fi/hotspot as the ESP32.",
    liveArmor: "Live armor",
    vestTracking: "Vest visual tracking",
    waitingData: "Waiting for data",
    gpsTracking: "GPS tracking",
    waitingLocation: "Waiting for location",
    gpsHint: "The map becomes active after a GPS fix.",
    lastUpdate: "Last update",
    zones: "Zones",
    zoneStatus: "Section status",
    location: "Location",
    gpsInfo: "GPS info",
    map: "Map",
    latitude: "Latitude",
    longitude: "Longitude",
    satellite: "Satellites",
    speed: "Speed",
    lastFix: "Last fix",
    liveLocationTracking: "Live location tracking",
    waitingGps: "Waiting for GPS",
    mapWaiting: "The live map will update here after a GPS fix.",
    commands: "Commands",
    workMode: "Work mode",
    tracking: "Tracking",
    system: "System",
    enableNotifications: "Enable notifications",
    notificationsOpen: "Notifications on",
    notificationsClosed: "Notifications off",
    notificationsUnavailable: "Unavailable",
    enableSound: "Enable sound",
    soundOn: "Sound on",
    notifications: "Notifications",
    eventFeed: "Event feed",
    noNotifications: "No notifications yet",
    cloudConnected: "Cloud online",
    connected: "Connected",
    connectionLost: "No connection",
    cloudNoData: "No cloud data",
    cloudSource: "Receiving public live data through the cloud.",
    localSource: "Receiving local data from {source}.",
    cloudMissing: "No cloud data. ESP32 must be powered, online, and configured with the Firebase URL.",
    localMissing: "If status is missing, open this on the same Wi-Fi/hotspot as the ESP32 and enter the Serial Monitor IP.",
    firebaseActive: "Firebase cloud mode active",
    publicReady: "Public link mode is ready. Everyone will see the panel when ESP32 sends data to Firebase.",
    localMode: "Firebase URL is missing, so local ESP32 API mode is active.",
    alert: "ALERT",
    normal: "NORMAL",
    affected: "Affected",
    healthy: "Healthy",
    wifiOnline: "Online",
    wifiOffline: "Offline",
    noIp: "No IP",
    fix: "Fix active",
    noFix: "No fix",
    waitingPosition: "Waiting for location",
    deviceOpen: "Device uptime",
    allHealthy: "All healthy",
    alarmCount: "{count} alarm",
    noZoneData: "No zone data",
    broken: "BROKEN / HIT",
    solid: "SOLID",
    trackingNormal: "Tracking normal",
    risk: "Risk",
    gpsActive: "GPS fix active",
    mapLive: "Location: {lat}, {lng} - last fix {age} ago",
    record: "records",
    ago: "ago",
    commandSent: "Command sent to cloud",
    commandSentBody: "{name} {state} request will be read by ESP32.",
    open: "on",
    close: "off",
    commandFailed: "Command failed",
    seconds: "s",
    minutes: "min"
  }
};

function t(key, values = {}) {
  let text = I18N[appState.lang]?.[key] || I18N.tr[key] || key;
  Object.entries(values).forEach(([name, value]) => {
    text = text.replaceAll(`{${name}}`, value);
  });
  return text;
}

function applyLanguage() {
  document.documentElement.lang = appState.lang;

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });

  selectors.languageButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.langButton === appState.lang);
  });

  selectors.soundButton.textContent = appState.soundEnabled ? t("soundOn") : t("enableSound");
  if (cloudEnabled()) {
    selectors.deviceBase.value = t("firebaseActive");
  }

  if ("Notification" in window) {
    selectors.notifyButton.textContent = Notification.permission === "granted" ? t("notificationsOpen") : t("enableNotifications");
  } else {
    selectors.notifyButton.textContent = t("notificationsUnavailable");
  }

  if (appState.lastStatus) {
    renderStatus(appState.lastStatus);
  }
  renderEvents();
}

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

function localizeEventText(value) {
  let text = String(value ?? "");
  if (appState.lang !== "en") return text;

  const replacements = [
    ["Sistem basladi", "System started"],
    ["Cihaz aktif", "Device active"],
    ["SISTEM DURUMU", "SYSTEM STATUS"],
    ["UYARI: Vurulma / kopma algilandi", "ALERT: Hit / break detected"],
    ["UYARI DEVAM EDIYOR", "ALERT CONTINUES"],
    ["Tum hatlar normale dondu", "All lines returned to normal"],
    ["Bilgi: Tum hatlar normale dondu", "Info: All lines returned to normal"],
    ["Canli konum guncelleme", "Live location update"],
    ["CANLI KONUM GUNCELLEME", "LIVE LOCATION UPDATE"],
    ["Sistem calisiyor", "System running"],
    ["SISTEM CALISIYOR", "SYSTEM RUNNING"],
    ["Alarm durumu", "Alarm state"],
    ["Alarm", "Alarm"],
    ["AKTIF", "ACTIVE"],
    ["NORMAL", "NORMAL"],
    ["Izleme", "Tracking"],
    ["Sistem", "System"],
    ["ACIK", "ON"],
    ["KAPALI", "OFF"],
    ["Etkilenen kisimlar", "Affected sections"],
    ["Saglam kisimlar", "Healthy sections"],
    ["Kisim durumlari", "Section status"],
    ["Sol gogus", "Left chest"],
    ["Sag kisim", "Right side"],
    ["Sirt", "Back"],
    ["KOPUK / VURULDU", "BROKEN / HIT"],
    ["SAGLAM", "SOLID"],
    ["Konum", "Location"],
    ["Uydu", "Satellites"],
    ["Hiz", "Speed"],
    ["Son fix", "Last fix"],
    ["Gecerli GPS konumu henuz yok", "No valid GPS location yet"],
    ["Harita", "Map"],
    ["sn once", "s ago"]
  ];

  replacements.forEach(([from, to]) => {
    text = text.replaceAll(from, to);
  });
  return text;
}

function setPill(element, text, tone) {
  if (!element) return;
  element.textContent = text;
  element.className = `pill ${tone}`;
}

function sourceText() {
  if (cloudEnabled()) return t("cloudSource");
  return t("localSource", { source: appState.baseUrl || location.origin });
}

function setConnection(connected, detail = "") {
  if (connected) {
    setPill(selectors.connectionPill, cloudEnabled() ? t("cloudConnected") : t("connected"), "ok");
    if (selectors.connectionHelp) selectors.connectionHelp.textContent = sourceText();
  } else {
    setPill(selectors.connectionPill, detail || t("connectionLost"), "danger");
    if (selectors.connectionHelp) {
      selectors.connectionHelp.textContent = cloudEnabled()
        ? t("cloudMissing")
        : t("localMissing");
    }
  }
}

function secondsText(seconds) {
  if (seconds === null || seconds === undefined || Number.isNaN(Number(seconds))) return "-";
  const value = Math.max(0, Number(seconds));
  if (value < 60) return `${Math.floor(value)} ${t("seconds")}`;
  const minutes = Math.floor(value / 60);
  const rest = Math.floor(value % 60);
  return `${minutes} ${t("minutes")} ${rest} ${t("seconds")}`;
}

function eventAge(event) {
  if (event.createdAt) {
    return Math.floor((Date.now() - Number(event.createdAt)) / 1000);
  }
  return Number(event.ageSeconds || 0);
}

function lonToTile(lng, zoom) {
  return ((Number(lng) + 180) / 360) * Math.pow(2, zoom);
}

function latToTile(lat, zoom) {
  const radians = Number(lat) * Math.PI / 180;
  return ((1 - Math.log(Math.tan(radians) + 1 / Math.cos(radians)) / Math.PI) / 2) * Math.pow(2, zoom);
}

function tileUrl(x, y, zoom) {
  const subdomain = ["a", "b", "c"][Math.abs(x + y) % 3];
  return `https://${subdomain}.tile.openstreetmap.org/${zoom}/${x}/${y}.png`;
}

function renderTileMap(lat, lng) {
  const canvas = selectors.liveMapCanvas;
  if (!canvas) return;

  const zoom = MAP_ZOOM;
  const centerX = lonToTile(lng, zoom);
  const centerY = latToTile(lat, zoom);
  const baseX = Math.floor(centerX);
  const baseY = Math.floor(centerY);
  const key = `${zoom}:${baseX}:${baseY}`;
  const width = canvas.clientWidth || 900;
  const height = canvas.clientHeight || 420;

  appState.lastMapKey = key;
  canvas.innerHTML = "";

  for (let dx = -2; dx <= 2; dx++) {
    for (let dy = -2; dy <= 2; dy++) {
      const tileX = baseX + dx;
      const tileY = baseY + dy;
      const img = document.createElement("img");
      img.className = "map-tile";
      img.alt = "";
      img.decoding = "async";
      img.loading = "eager";
      img.src = tileUrl(tileX, tileY, zoom);
      img.style.left = `${width / 2 + (tileX - centerX) * TILE_SIZE}px`;
      img.style.top = `${height / 2 + (tileY - centerY) * TILE_SIZE}px`;
      canvas.append(img);
    }
  }
}

function updateMap(gps) {
  if (!selectors.mapStatus) return;

  if (gps.fixValid) {
    const lat = Number(gps.lat);
    const lng = Number(gps.lng);
    renderTileMap(lat, lng);
    selectors.liveMapCanvas?.closest(".map-shell")?.classList.add("has-fix");
    selectors.mapStatus.textContent = t("mapLive", {
      lat: lat.toFixed(6),
      lng: lng.toFixed(6),
      age: secondsText(gps.fixAgeSeconds)
    });
    selectors.mapStatus.classList.add("is-live");
    setPill(selectors.mapCoord, `${lat.toFixed(4)}, ${lng.toFixed(4)}`, "ok");
  } else {
    selectors.liveMapCanvas?.closest(".map-shell")?.classList.remove("has-fix");
    selectors.mapStatus.textContent = t("mapWaiting");
    selectors.mapStatus.classList.remove("is-live");
    setPill(selectors.mapCoord, t("waitingGps"), "muted");
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
    brokenZones.length ? `${t("risk")}: ${brokenZones.join(", ")}` : t("trackingNormal"),
    brokenZones.length ? "danger" : "ok"
  );

  if (selectors.satBadge) selectors.satBadge.textContent = String(gps.satellites ?? 0);

  if (selectors.visualGpsState && selectors.visualGpsHint) {
    if (gps.fixValid) {
      selectors.visualGpsState.textContent = t("gpsActive");
      selectors.visualGpsHint.textContent = `${Number(gps.lat).toFixed(5)}, ${Number(gps.lng).toFixed(5)} - ${secondsText(gps.fixAgeSeconds)} ${t("ago")}`;
    } else {
      selectors.visualGpsState.textContent = t("waitingLocation");
      selectors.visualGpsHint.textContent = t("gpsHint");
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

  selectors.alarmValue.textContent = alarmActive ? t("alert") : t("normal");
  selectors.alarmDetail.textContent = alarmActive
    ? `${t("affected")}: ${brokenZones.map((zone) => zone.name).join(", ") || "-"}`
    : `${t("healthy")}: ${healthyZones.map((zone) => zone.name).join(", ") || "-"}`;
  selectors.alarmValue.closest(".metric").classList.toggle("is-danger", alarmActive);
  selectors.alarmValue.closest(".metric").classList.toggle("is-ok", !alarmActive);

  selectors.wifiValue.textContent = data.wifiConnected ? t("wifiOnline") : t("wifiOffline");
  selectors.ipValue.textContent = data.ip ? `IP: ${data.ip}` : (data.apIp ? `AP: ${data.apIp}` : t("noIp"));

  selectors.gpsValue.textContent = gps.fixValid ? t("fix") : t("noFix");
  selectors.gpsDetail.textContent = gps.fixValid ? `${gps.satellites ?? 0} ${t("satellite").toLowerCase()}` : t("waitingPosition");
  updateVisualTracking(zones, gps, alarmActive);
  updateMap(gps);

  selectors.updatedValue.textContent = new Date().toLocaleTimeString("tr-TR");
  selectors.deviceTimeValue.textContent = `${t("deviceOpen")}: ${secondsText(Math.floor((data.deviceMillis || 0) / 1000))}`;

  setPill(
    selectors.zoneSummary,
    brokenZones.length ? t("alarmCount", { count: brokenZones.length }) : t("allHealthy"),
    brokenZones.length ? "danger" : "ok"
  );

  selectors.zoneList.innerHTML = zones.map((zone) => {
    const tone = zone.alarm ? "danger" : "ok";
    const state = zone.alarm ? t("broken") : t("solid");
    return `
      <div class="zone-item ${tone}">
        <strong>${escapeHtml(zone.name)}</strong>
        <span class="zone-state">${state}</span>
      </div>
    `;
  }).join("") || `<div class="empty-state">${t("noZoneData")}</div>`;

  selectors.izlemeToggle.checked = Boolean(data.izlemeMode);
  selectors.sistemToggle.checked = Boolean(data.sistemMode);

  if (gps.fixValid) {
    selectors.latValue.textContent = Number(gps.lat).toFixed(6);
    selectors.lngValue.textContent = Number(gps.lng).toFixed(6);
    selectors.satValue.textContent = String(gps.satellites ?? 0);
    selectors.speedValue.textContent = `${Number(gps.speedKmph || 0).toFixed(2)} km/h`;
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
  selectors.eventCount.textContent = `${appState.eventHistory.length} ${t("record")}`;

  if (!appState.eventHistory.length) {
    selectors.eventList.innerHTML = `<li class="empty-state">${t("noNotifications")}</li>`;
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
            <span>${escapeHtml(localizeEventText(event.title || "Bildirim"))}</span>
            <time>${secondsText(eventAge(event))} ${t("ago")}</time>
          </div>
          <div class="event-message">${escapeHtml(localizeEventText(event.message || ""))}</div>
        </li>
      `;
    })
    .join("");
}

function showToast(event) {
  const toast = document.createElement("div");
  toast.className = `toast ${event.critical ? "danger" : ""}`;
  toast.innerHTML = `
    <strong>${escapeHtml(localizeEventText(event.title || "Bildirim"))}</strong>
    <p>${escapeHtml(localizeEventText(event.message || ""))}</p>
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
    const notification = new Notification(localizeEventText(event.title || "SentriVest"), {
      body: localizeEventText(event.message || "").slice(0, 220),
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
    setConnection(false, cloudEnabled() ? t("cloudNoData") : t("connectionLost"));
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
        title: t("commandSent"),
        message: t("commandSentBody", { name, state: enabled ? t("open") : t("close") }),
        critical: false
      });
    } else {
      await localGet(`/api/control?${name}=${enabled ? 1 : 0}`);
    }
    await refreshAll();
  } catch (error) {
    showToast({ title: t("commandFailed"), message: error.message, critical: true });
    await refreshAll();
  }
}

async function requestNotifications() {
  ensureAudio();

  if (!("Notification" in window)) {
    selectors.notifyButton.textContent = t("notificationsUnavailable");
    return;
  }

  try {
    const permission = await Notification.requestPermission();
    selectors.notifyButton.textContent = permission === "granted" ? t("notificationsOpen") : t("notificationsClosed");
  } catch (error) {
    selectors.notifyButton.textContent = t("notificationsClosed");
  }
}

function toggleSound() {
  appState.soundEnabled = !appState.soundEnabled;
  localStorage.setItem("sentrivest:sound", appState.soundEnabled ? "1" : "0");
  selectors.soundButton.textContent = appState.soundEnabled ? t("soundOn") : t("enableSound");
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
  selectors.deviceBase.value = cloudEnabled() ? t("firebaseActive") : appState.baseUrl;
  selectors.deviceBase.disabled = cloudEnabled();
  selectors.apiForm.querySelector("button").disabled = cloudEnabled();
  selectors.soundButton.textContent = appState.soundEnabled ? t("soundOn") : t("enableSound");

  if (selectors.connectionHelp) {
    selectors.connectionHelp.textContent = cloudEnabled()
      ? t("publicReady")
      : t("localMode");
  }

  if ("Notification" in window) {
    selectors.notifyButton.textContent = Notification.permission === "granted" ? t("notificationsOpen") : t("enableNotifications");
  } else {
    selectors.notifyButton.textContent = t("notificationsUnavailable");
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
  selectors.languageButtons.forEach((button) => {
    button.addEventListener("click", () => {
      appState.lang = button.dataset.langButton;
      localStorage.setItem("sentrivest:lang", appState.lang);
      applyLanguage();
    });
  });

  applyLanguage();
  startPolling();
}

init();
