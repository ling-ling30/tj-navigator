---
id: 4
title: What a web app can do to alert a traveller during a trip
labels: [wayfinder:research]
mode: AFK
status: closed
assignee: antigravity-gemini
blocked_by: []
blocks: [8]
map: ../map.md
---

# #4 What a web app can do to alert a traveller during a trip

## Question

The owner wants people to subscribe to a ride and be told what to do: transit ahead, destination near. The app is a static PWA with no server. What can it really do on a phone that is in a pocket?

## Cover (current browser documentation, 2025 to 2026; link each)

- Location while the screen is off or the app is in the background: Android Chrome and iOS Safari, installed PWA and browser tab.
- Notifications without a push server (service worker showNotification), with a push server (Web Push), vibration, sound, Screen Wake Lock.
- What breaks when the operating system suspends the page.
- Ways out: Trusted Web Activity, Capacitor or another native wrapper with background location; cost and effort of each.

## Resolved when

A table of what works where, and a recommended path in two steps (web first, native wrapper if needed) with the trade-off of each.

## Resolution

### Capability × Platform Matrix

Evaluated for the core question: *what can a static web app do while the phone is in a pocket (screen off or app backgrounded)?*

| Capability | Android Chrome (Tab) | Android Chrome (Installed PWA) | iOS Safari (Tab) | iOS Safari (Installed PWA) | Primary Reference & Date |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Geolocation tracking** (`watchPosition`) | works only while the page is visible | works only while the page is visible | works only while the page is visible | works only while the page is visible | [MDN: Geolocation API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API) (2024–2026) |
| **Notifications without push server** (`registration.showNotification`) | works only while the page is visible | works only while the page is visible | does not work | works only while the page is visible | [MDN: ServiceWorkerRegistration.showNotification](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/showNotification) (2024–2026); [WebKit: Web Push on iOS](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/) (2024 update) |
| **Web Push notifications** (with external push server) | works | works | does not work | works | [WebKit: Web Push on iOS](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/) (Safari 16.4+, iOS 16.4–18, 2024–2026) |
| **Vibration** (`navigator.vibrate`) | works only while the page is visible | works only while the page is visible | does not work | does not work | [MDN: Vibration API](https://developer.mozilla.org/en-US/docs/Web/API/Vibration_API) (2024–2026) |
| **Audio / Sound alert playback** (`<audio>`, Web Audio) | works only while the page is visible | works only while the page is visible | works only while the page is visible | works only while the page is visible | [Chrome for Developers: Autoplay Policy](https://developer.chrome.com/blog/autoplay/) (2024); [WebKit: AudioSession](https://developer.apple.com/documentation/webkit/) (2024–2026) |
| **Screen Wake Lock** (`navigator.wakeLock`) | works only while the page is visible | works only while the page is visible | works only while the page is visible | works only while the page is visible | [web.dev: Stay awake with Screen Wake Lock](https://web.dev/articles/wake-lock) (2024); [WebKit: Safari 16.4 / 18.4](https://webkit.org/blog/13966/webkit-features-in-safari-16-4/) (2024–2025) |

---

### Detailed Findings by Capability

#### 1. Location While Screen is Off or App in Background
* **Standard Web Behavior:** `navigator.geolocation.watchPosition` runs only in the window/browsing context. It is strictly unavailable in Web Workers and Service Workers ([MDN: Geolocation API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API), 2024–2026).
* **Android Chrome (v120–v134, 2024–2026):** Moving the tab to the background or locking the screen places the document in the `hidden` state and subsequently `frozen`. Chrome throttles timers and suspends location callbacks to conserve battery.
* **iOS Safari (iOS 17.0–18.4, 2024–2026):** WebKit suspends all JavaScript execution within a few seconds of locking the screen or leaving the app. Location updates cease immediately.
* **The "Silent Audio Loop" Hack:** Playing an active loop of silent audio via `<audio>` or Web Audio API can temporarily trick iOS into treating the page as an active media player, keeping JS execution and `watchPosition` alive longer ([WebKit: HTMLMediaElement](https://webkit.org/blog/), 2024). However, this is an undocumented hack: any incoming call, audio interruption, or system memory pressure immediately terminates playback and suspends tracking.

#### 2. Notifications: With vs Without Push Server
* **Without a Push Server (Static PWA with No Backend):**
  * **Android Chrome:** Calling `ServiceWorkerRegistration.showNotification()` works while the page is open, but when the screen is locked, page-level timers (`setTimeout`) are paused. Service workers are event-driven and terminate when idle (~30 seconds). Chrome explored an offline scheduling mechanism via the [Notification Triggers API](https://developer.chrome.com/docs/web-platform/notification-triggers) (`showTrigger: new TimestampTrigger(...)`), but as of 2024–2026 it remains an experimental origin trial and is **not standardized or available** in stable browsers.
  * **iOS Safari Browser Tab:** `window.Notification` and `PushManager` are completely disabled in standard Safari tabs ([WebKit: Web Push on iOS](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/), 2024).
  * **iOS Safari Installed PWA:** Service worker notifications (`showNotification`) are supported starting in iOS 16.4, but *only* in response to an event (such as an APNs push). Without a server push event, a backgrounded/locked PWA has no thread to trigger `showNotification()`.
* **With a Push Server (Web Push):**
  * Android Chrome (Tab & PWA) and iOS Safari (Installed PWA only, iOS 16.4+) can wake the service worker in the background on incoming Web Push via APNs/FCM and display a system lock-screen notification.
  * **Constraint for TJ-Navigator:** TJ-Navigator is a static client-side app with no server. Web Push is unavailable without deploying and paying for an ongoing push server infrastructure that tracks vehicle telemetry and dispatches targeted push notifications.

#### 3. Vibration (`navigator.vibrate`)
* **iOS Safari (All versions through iOS 18, 2024–2026):** `navigator.vibrate` is not implemented in WebKit due to privacy and fingerprinting policies ([MDN: Vibration API Compatibility](https://developer.mozilla.org/en-US/docs/Web/API/Vibration_API), 2024–2026). It does not work in either browser tabs or installed PWAs.
* **Android Chrome (Chrome 32+, 2024–2026):** Supported, but strictly gated by document visibility and user interaction. Calls to `navigator.vibrate()` fail silently or return `false` if `document.visibilityState === 'hidden'`. Vibration in the pocket while screen is off does not work from the web page.

#### 4. Sound / Audio Playback
* Modern browser autoplay policies require prior user activation ([Chrome for Developers: Autoplay Policy Changes](https://developer.chrome.com/blog/autoplay/), 2024).
* A web page cannot spontaneously start playing an alert sound while in the pocket if it has been suspended. Pre-existing continuous audio (e.g. streaming audio session) may continue playing across screen lock, but ad-hoc audio cues at geofence arrival fail once the page is frozen.

#### 5. Screen Wake Lock API (`navigator.wakeLock`)
* Supported in Android Chrome (Chrome 84+, 2020) and iOS Safari (Safari 16.4+, March 2023; standalone PWA wake lock reliability resolved in Safari 18.4, 2024–2025; [WebKit Bug 254545](https://bugs.webkit.org/show_bug.cgi?id=254545); [web.dev: Stay awake with Screen Wake Lock](https://web.dev/articles/wake-lock), 2024).
* `navigator.wakeLock.request('screen')` successfully prevents the screen from automatically sleeping or dimming while the page is in the foreground.
* **Crucial Behavior:** If the user manually presses the hardware power button to turn off the screen and put the phone in their pocket, the browser automatically releases the wake lock (`visibilitychange` fires `hidden`), immediately freezing the page.

#### 6. What Breaks When the Operating System Suspends the Page
When the screen is turned off or the browser is minimized, the [Page Lifecycle API](https://developer.chrome.com/docs/web-platform/page-lifecycle-api/) (Chrome Docs, updated 2024) transitions the page through `hidden` to `frozen`:
1. **JavaScript Event Loop:** `setTimeout`, `setInterval`, and `requestAnimationFrame` stop executing.
2. **Network Connections:** Active WebSockets and MQTT connections (such as the live bus telemetry stream) are severed or stalled.
3. **Hardware Sensors:** GPS updates (`watchPosition`) stop dispatching.
4. **Locks:** `ScreenWakeLock` is released immediately by the browser.

---

### Ways Out: Native Wrappers with Background Location

To track location and alert a user while their phone is in a pocket with the screen off, an operating system foreground service (Android) or background location capability (iOS) is mandatory.

#### 1. Trusted Web Activity (TWA)
* **Platform:** Android only (no iOS equivalent; [Chrome for Developers: TWA](https://developer.chrome.com/docs/android/trusted-web-activity), 2024–2026).
* **How It Works:** Wraps the web app inside Chrome Custom Tabs and allows Play Store distribution via Google Bubblewrap.
* **Background Location Reality:** The web layer inside TWA is still Chrome and still suspends when the screen turns off. To track location in the background, developers must write custom native Android code (Kotlin/Java) running an Android 14+ Foreground Service with `android:foregroundServiceType="location"` and a persistent ongoing notification ([Android Developers: Foreground Service Types](https://developer.android.com/about/versions/14/changes/fgs-types-required#location), 2024). Bridging location data between native service and web PWA is cumbersome.
* **Cost & Effort:**
  * One-time Google Play Developer fee: $25.
  * Effort: High if writing custom Android foreground services and native-to-web IPC; Low if only publishing as a standard PWA shell without background capabilities.

#### 2. Capacitor (Recommended Native Wrapper)
* **Platform:** Cross-platform (Android and iOS; [Capacitor Documentation](https://capacitorjs.com/docs/apis/geolocation), 2024–2026).
* **How It Works:** Wraps web code in native WebViews (`WKWebView` on iOS, `Android WebView`) with a two-way native bridge and plugin ecosystem.
* **Background Execution & Alerts:**
  * Uses background location plugins (e.g., [`@capacitor-community/background-geolocation`](https://capacitorjs.com/plugins/@capacitor-community/background-geolocation) or Transistor Software Background Geolocation).
  * **Android:** Automatically manages an Android Foreground Service with a sticky notification (`FOREGROUND_SERVICE_LOCATION`), tracking GPS coordinates continuously with screen locked.
  * **iOS:** Configures `UIBackgroundModes` with `location` and sets `allowsBackgroundLocationUpdates = true` on `CLLocationManager` ([Apple Developer: Core Location](https://developer.apple.com/documentation/corelocation/cllocationmanager/allowsbackgroundlocationupdates), 2024–2026).
  * **Local Alerts:** Triggers on-device local notifications (`@capacitor/local-notifications`) and native haptics (`@capacitor/haptics`) **without needing a push server or backend**.
* **Cost & Effort:**
  * Google Play Developer Account: $25 one-time.
  * Apple Developer Program: $99 / year recurring.
  * Development hardware: Requires a Mac and Xcode for iOS builds.
  * Effort: Moderate (1–2 weeks to integrate Capacitor, configure permissions in `AndroidManifest.xml` and `Info.plist`, set up local notification triggers, and pass App Store / Google Play background location safety reviews).

---

### Recommended Two-Step Path

#### Step 1: Web-First — Foreground Active Journey Mode (Immediate, $0 Cost, Zero Server)
Build the trip companion as a pure client-side PWA designed to be used with the screen awake:
* **Implementation:** When the user taps "Start Trip", acquire a Screen Wake Lock via `navigator.wakeLock.request('screen')`.
* **In-App Guidance:** Keep the screen on while mounted on an ojek, held in hand, or sitting on the bus. Use `navigator.geolocation.watchPosition` to update trip progress, playing in-app audio chimes (Web Audio) and displaying visual banner alerts when the transit stop or destination approaches.
* **User Warning:** If `document.visibilitychange` detects that the page is hidden (user locked screen or switched apps), display a prominent warning prompt upon return: *"Tracking was paused while the screen was locked. Keep TJ-Navigator open to receive arrival alerts."*
* **Trade-off:**
  * *Pros:* 100% free to run, zero server infrastructure, works on both Android and iOS immediately without app store distribution.
  * *Cons:* Cannot alert the user while the phone is locked in their pocket. Keeping the screen on in a pocket risks accidental touches and drains battery faster.

#### Step 2: Native Wrapper — Capacitor App for Pocket & Lock-Screen Alerts (If Required)
If real-world testing proves that commuters insist on putting the phone in their pocket with the screen off:
* **Implementation:** Wrap the existing TJ-Navigator codebase in Capacitor. Add `@capacitor-community/background-geolocation` and `@capacitor/local-notifications`.
* **Lock-Screen Operation:** When a trip starts, the app spins up a native location foreground service. When the device enters the arrival geofence (e.g. 300m before halte or transit point), it schedules a native local notification that rings, vibrates, and lights up the lock screen—without requiring any remote push server.
* **Trade-off:**
  * *Pros:* Reliable pocket tracking and arrival alerts on both iOS and Android; no push server required (local notifications fire directly on-device).
  * *Cons:* Incurs $99/year Apple Developer fee + $25 Google Play fee; requires native build maintenance (Xcode/Android Studio), App Store review justification for background GPS, and battery drain from continuous native GPS.

---

### What Stayed Unverified
1. **Silent Audio Loop Keep-Alive Longevity on iOS 18:** While verified as functional in community tests on iOS 16–17, the exact maximum duration iOS 18 permits background JS execution via silent audio before terminating the WebKit process under memory pressure or Low Power Mode remains undocumented by Apple and needs device verification.
2. **Capacitor Community Plugin Battery Optimization on Aggressive Android OEMs:** Behavior of `@capacitor-community/background-geolocation` on aggressive Android OEM skins (e.g. Xiaomi HyperOS, Samsung One UI, Transsion) without manual user whitelisting under "Battery Unrestricted" needs device verification.

