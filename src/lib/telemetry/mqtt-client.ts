import mqtt, { type MqttClient } from 'mqtt';
import { liveSegmentEngine, type VehicleTelemetryPing } from './live-segment-engine';

export type ConnectionStatus = 'CONNECTING' | 'LIVE' | 'OFFLINE_FALLBACK' | 'PAUSED';

type TelemetryListener = (vehicles: VehicleTelemetryPing[]) => void;
type StatusListener = (status: ConnectionStatus) => void;

class JakartaTransitTelemetryClient {
  private client: MqttClient | null = null;
  private subscribedCorridors = new Set<string>();
  private activeStatus: ConnectionStatus = 'CONNECTING';
  private telemetryListeners = new Set<TelemetryListener>();
  private statusListeners = new Set<StatusListener>();

  // In-memory telemetry buffer flushed at 1.5s interval
  private pendingPings = new Map<string, VehicleTelemetryPing>();
  private flushTimer: number | null = null;
  private simulationTimer: number | null = null;
  private lastHeartbeatMs = 0;
  private watchdogTimer: number | null = null;

  constructor() {
    this.setupPageVisibility();
    this.startThrottledFlush();
  }

  public getStatus(): ConnectionStatus {
    return this.activeStatus;
  }

  private setStatus(status: ConnectionStatus) {
    if (this.activeStatus !== status) {
      this.activeStatus = status;
      this.statusListeners.forEach(listener => listener(status));
    }
  }

  public subscribeStatus(listener: StatusListener) {
    this.statusListeners.add(listener);
    listener(this.activeStatus);
    return () => this.statusListeners.delete(listener);
  }

  public subscribeTelemetry(listener: TelemetryListener) {
    this.telemetryListeners.add(listener);
    // Push current known positions immediately
    listener(liveSegmentEngine.getVehicles());
    return () => this.telemetryListeners.delete(listener);
  }

  public connect(brokerUrl = 'wss://mqtt.tj.co.id:8084/mqtt') {
    if (this.client) return;

    this.setStatus('CONNECTING');
    if (import.meta.env?.DEV) {
      console.log(`[MQTT] Connecting to Transjakarta live broker: ${brokerUrl}`);
    }

    try {
      this.client = mqtt.connect(brokerUrl, {
        keepalive: 30,
        protocolId: 'MQTT',
        protocolVersion: 4,
        clean: true,
        reconnectPeriod: 5000,
        connectTimeout: 4000
      });

      this.client.on('connect', () => {
        if (import.meta.env?.DEV) {
          console.log('[MQTT] Connected to live Transjakarta broker.');
        }
        this.setStatus('LIVE');
        this.lastHeartbeatMs = Date.now();
        this.resubscribeTopics();
        this.stopSimulation();
      });

      this.client.on('message', (topic, payload) => {
        this.lastHeartbeatMs = Date.now();
        this.handleMessage(topic, payload.toString());
      });

      this.client.on('error', (err) => {
        console.warn(`⚠️ [MQTT] Broker connection error (${err.message}). Live radar offline.`);
        this.setStatus('OFFLINE_FALLBACK');
      });

      this.client.on('offline', () => {
        this.setStatus('OFFLINE_FALLBACK');
      });
    } catch {
      this.setStatus('OFFLINE_FALLBACK');
    }

    this.startWatchdog();
  }

  /**
   * Lazy Corridor Scoping (Capped at 6 active topics to preserve bandwidth)
   */
  public scopeToCorridors(corridorCodes: string[]) {
    const limited = corridorCodes.slice(0, 6);
    this.subscribedCorridors.clear();
    limited.forEach(c => this.subscribedCorridors.add(c));

    if (this.client && this.client.connected) {
      this.resubscribeTopics();
    }
  }

  private resubscribeTopics() {
    if (!this.client || !this.client.connected) return;
    this.subscribedCorridors.forEach(code => {
      const topic = `tj/corridor/${code}/#`;
      this.client?.subscribe(topic, { qos: 0 }, (err) => {
        if (!err && import.meta.env?.DEV) console.log(`[MQTT] Subscribed to topic: ${topic}`);
      });
    });
  }

  private handleMessage(topic: string, message: string) {
    try {
      const data = JSON.parse(message);
      if (data && data.vehicle_id) {
        const ping: VehicleTelemetryPing = {
          vehicleId: data.vehicle_id,
          routeId: data.route_id || 'tj:feeder-6c',
          routeShortName: data.route_short_name || '6C',
          lat: Number(data.latitude),
          lon: Number(data.longitude),
          speedKmh: Number(data.speed || 18),
          bearingDeg: Number(data.bearing || 0),
          timestampMs: Date.now(),
          occupancyPercent: data.occupancy || 68,
          isElectric: Boolean(data.is_electric)
        };
        this.pendingPings.set(ping.vehicleId, ping);
      }
    } catch {}
  }

  private startThrottledFlush() {
    if (this.flushTimer) return;
    this.flushTimer = window.setInterval(() => {
      if (this.pendingPings.size > 0) {
        this.pendingPings.forEach(ping => {
          liveSegmentEngine.ingestVehiclePing(ping);
        });
        this.pendingPings.clear();
        const currentVehicles = liveSegmentEngine.getVehicles();
        this.telemetryListeners.forEach(listener => listener(currentVehicles));
      }
    }, 1500); // 1.5-second throttled state flush
  }

  private setupPageVisibility() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (import.meta.env?.DEV) {
          console.log('[Page Visibility] Document hidden. Pausing MQTT streaming to save battery.');
        }
        if (this.client && this.client.connected) {
          this.client.end(false);
          this.client = null;
        }
        this.stopSimulation();
        this.setStatus('PAUSED');
      } else {
        if (import.meta.env?.DEV) {
          console.log('[Page Visibility] Document visible. Resuming live telemetry stream.');
        }
        this.connect();
      }
    });
  }

  private startWatchdog() {
    if (this.watchdogTimer) clearInterval(this.watchdogTimer);
    this.watchdogTimer = window.setInterval(() => {
      const now = Date.now();
      // If 15 seconds without pings, kick off simulation / fallback
      if (this.activeStatus === 'LIVE' && now - this.lastHeartbeatMs > 15000) {
        console.warn('⚠️ [MQTT Watchdog] Heartbeat expired (>15s). Switching to offline status.');
        this.setStatus('OFFLINE_FALLBACK');
      }
    }, 5000);
  }

  /**
   * Deterministic Real-Time Jakarta Bus Radar Simulation
   * Simulates real buses progressing along Corridor 1 and Feeder 6C (Tebet - Kuningan - Tosari)
   */
  private startSimulation() {
    if (this.simulationTimer) return;

    // Initial bus cohort
    let tick = 0;
    const initialBuses: VehicleTelemetryPing[] = [
      {
        vehicleId: 'TJ-0842',
        routeId: 'tj:feeder-6c',
        routeShortName: '6C',
        lat: -6.2235, // Near Mega Kuningan / Casablanca bottleneck
        lon: 106.8285,
        speedKmh: 12,
        bearingDeg: 315,
        timestampMs: Date.now(),
        occupancyPercent: 74,
        isElectric: true
      },
      {
        vehicleId: 'TJ-0619',
        routeId: 'tj:feeder-6c',
        routeShortName: '6C',
        lat: -6.2265, // Near Stasiun Tebet
        lon: 106.8584,
        speedKmh: 24,
        bearingDeg: 270,
        timestampMs: Date.now(),
        occupancyPercent: 45,
        isElectric: false
      },
      {
        vehicleId: 'TJ-0105',
        routeId: 'tj:corridor-1',
        routeShortName: '1',
        lat: -6.2088, // Karet Sudirman
        lon: 106.8219,
        speedKmh: 28,
        bearingDeg: 0,
        timestampMs: Date.now(),
        occupancyPercent: 82,
        isElectric: true
      },
      {
        vehicleId: 'TJ-0188',
        routeId: 'tj:corridor-1',
        routeShortName: '1',
        lat: -6.1955, // Tosari (Grand Indonesia)
        lon: 106.8231,
        speedKmh: 0,
        bearingDeg: 0,
        timestampMs: Date.now(),
        occupancyPercent: 60,
        isElectric: false
      }
    ];

    initialBuses.forEach(b => liveSegmentEngine.ingestVehiclePing(b));
    this.telemetryListeners.forEach(listener => listener(initialBuses));

    this.simulationTimer = window.setInterval(() => {
      tick++;
      // Progress TJ-0842 towards Tosari
      const bus = liveSegmentEngine.getVehicles().find(v => v.vehicleId === 'TJ-0842');
      if (bus) {
        // Slow crawl through Casablanca bottleneck, then speed up on Sudirman
        const inBottleneck = tick % 8 < 5;
        const dLat = inBottleneck ? 0.00015 : 0.0004;
        const dLon = inBottleneck ? -0.0001 : -0.00025;
        
        const updatedPing: VehicleTelemetryPing = {
          ...bus,
          lat: Math.min(-6.1955, bus.lat + dLat),
          lon: Math.max(106.8231, bus.lon + dLon),
          speedKmh: inBottleneck ? 9 : 28,
          timestampMs: Date.now(),
          occupancyPercent: Math.min(92, 70 + (tick % 15))
        };

        // Reset if reached Tosari
        if (updatedPing.lat >= -6.1956) {
          updatedPing.lat = -6.2235;
          updatedPing.lon = 106.8285;
        }

        this.pendingPings.set(updatedPing.vehicleId, updatedPing);
      }
    }, 2000);
  }

  private stopSimulation() {
    if (this.simulationTimer) {
      clearInterval(this.simulationTimer);
      this.simulationTimer = null;
    }
  }

  public disconnect() {
    this.stopSimulation();
    if (this.flushTimer) clearInterval(this.flushTimer);
    if (this.watchdogTimer) clearInterval(this.watchdogTimer);
    if (this.client) {
      this.client.end(true);
      this.client = null;
    }
  }
}

export const jakartaTelemetry = new JakartaTransitTelemetryClient();
