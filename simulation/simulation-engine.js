// AP3X INTELLIGENT EMERGENCY RESPONSE SIMULATION SYSTEM
// simulation/simulation-engine.js
// SIMULATION ENGINE — Global event bus, incident generator, driver state machine
// SIMULATION ONLY — NOT real operational guidance. No real emergency instructions.

// ─────────────────────────────────────────────
// SIMULATION STATE STORE (shared across all systems via localStorage + BroadcastChannel)
// ─────────────────────────────────────────────

const AP3X_KEY = "ap3x_sim_state";
const AP3X_CHANNEL = "ap3x_broadcast";

let _bc = null;
try { _bc = new BroadcastChannel(AP3X_CHANNEL); } catch {}

const _listeners = new Set();

function _getState() {
  try { return JSON.parse(localStorage.getItem(AP3X_KEY)) || _defaultState(); }
  catch { return _defaultState(); }
}

function _setState(next) {
  localStorage.setItem(AP3X_KEY, JSON.stringify(next));
  _listeners.forEach(fn => fn(next));
  if (_bc) _bc.postMessage({ type: "STATE_UPDATE", state: next });
}

function _defaultState() {
  return {
    running: false,
    paused: false,
    tick: 0,
    incidents: [],
    drivers: [],
    events: [],
    aiMessages: [],
    systemStatus: "STANDBY",
    startedAt: null,
    stats: { total: 0, resolved: 0, active: 0, critical: 0 }
  };
}

// ─────────────────────────────────────────────
// PUBLIC STATE API
// ─────────────────────────────────────────────

export function getSimState() { return _getState(); }

export function onSimStateChange(fn) {
  _listeners.add(fn);
  if (_bc) {
    const handler = (e) => { if (e.data?.type === "STATE_UPDATE") fn(e.data.state); };
    _bc.addEventListener("message", handler);
    return () => { _listeners.delete(fn); _bc.removeEventListener("message", handler); };
  }
  return () => _listeners.delete(fn);
}

// ─────────────────────────────────────────────
// DATA BANKS
// ─────────────────────────────────────────────

const INCIDENT_TYPES = [
  "Structure Fire",
  "Road Traffic Collision",
  "Medical Emergency",
  "Hazardous Material Spill",
  "Flood Event",
  "Building Collapse",
  "Gas Leak",
  "Cardiac Arrest",
  "Multi-Vehicle Incident",
  "Industrial Accident",
  "Severe Weather Event",
  "Mass Casualty Incident",
  "Bridge Failure",
  "Chemical Exposure",
  "Power Grid Failure"
];

const LOCATIONS = [
  { name: "Central District",    lat: 51.505, lng: -0.09 },
  { name: "North Industrial Zone", lat: 51.530, lng: -0.12 },
  { name: "East Residential",   lat: 51.510, lng: -0.07 },
  { name: "West Commerce Hub",  lat: 51.512, lng: -0.14 },
  { name: "South Harbour",      lat: 51.490, lng: -0.10 },
  { name: "Midtown Grid",       lat: 51.518, lng: -0.095 },
  { name: "Airport Corridor",   lat: 51.478, lng: -0.105 },
  { name: "University Quarter", lat: 51.524, lng: -0.083 },
  { name: "Rail Junction",      lat: 51.531, lng: -0.124 },
  { name: "Riverside Zone",     lat: 51.497, lng: -0.073 }
];

const DRIVER_NAMES = [
  "Unit A1 — Rho", "Unit A2 — Sigma", "Unit B1 — Delta",
  "Unit B2 — Echo", "Unit C1 — Foxtrot", "Unit C2 — Gamma",
  "Unit D1 — Kilo", "Unit D2 — Lima", "Unit E1 — Nova", "Unit E2 — Orion"
];

const SEVERITY_LEVELS = ["low", "medium", "high", "critical"];
const SEVERITY_WEIGHTS = [0.30, 0.35, 0.22, 0.13]; // probability distribution

// ─────────────────────────────────────────────
// TIMER HANDLES
// ─────────────────────────────────────────────

let _incidentInterval = null;
let _progressInterval = null;
let _config = { incidentIntervalSec: 12 };

// ─────────────────────────────────────────────
// SIMULATION CONTROLS
// ─────────────────────────────────────────────

export function startSimulation(config = {}) {
  _config = { incidentIntervalSec: config.incidentIntervalSec || 12 };

  const drivers = DRIVER_NAMES.map((name, i) => ({
    driver_id: `drv_${i}`,
    name,
    status: "available", // available | assigned | en_route | on_scene
    incident_id: null,
    last_updated: new Date().toISOString()
  }));

  const base = _defaultState();
  _setState({
    ...base,
    running: true,
    paused: false,
    drivers,
    systemStatus: "OPERATIONAL",
    startedAt: new Date().toISOString()
  });

  _appendEvent("SYS", "AP3X Simulation initialised. All units standing by.", "system");
  _appendAI("AP3X RESPONSE INTELLIGENCE ENGINE online. Simulation active. All systems nominal.");

  _startLoops();
  return getSimState();
}

export function pauseSimulation() {
  const s = _getState();
  if (!s.running) return;
  _setState({ ...s, paused: !s.paused, systemStatus: s.paused ? "OPERATIONAL" : "PAUSED" });
  _clearLoops();
  if (!s.paused) {
    _appendEvent("SYS", "Simulation paused by operator.", "system");
  } else {
    _appendEvent("SYS", "Simulation resumed.", "system");
    _startLoops();
  }
}

export function resetSimulation() {
  _clearLoops();
  const fresh = _defaultState();
  _setState(fresh);
  _appendEvent("SYS", "Simulation reset. State cleared.", "system");
}

// ─────────────────────────────────────────────
// INTERNAL LOOPS
// ─────────────────────────────────────────────

function _startLoops() {
  _clearLoops();
  _incidentInterval = setInterval(_generateIncident, _config.incidentIntervalSec * 1000);
  _progressInterval = setInterval(_progressDrivers, 8000); // advance driver states every 8s
}

function _clearLoops() {
  clearInterval(_incidentInterval);
  clearInterval(_progressInterval);
  _incidentInterval = null;
  _progressInterval = null;
}

// ─────────────────────────────────────────────
// INCIDENT GENERATOR
// ─────────────────────────────────────────────

function _weightedSeverity() {
  const r = Math.random();
  let cum = 0;
  for (let i = 0; i < SEVERITY_WEIGHTS.length; i++) {
    cum += SEVERITY_WEIGHTS[i];
    if (r < cum) return SEVERITY_LEVELS[i];
  }
  return "medium";
}

function _generateIncident() {
  const s = _getState();
  if (!s.running || s.paused) return;

  const type = INCIDENT_TYPES[Math.floor(Math.random() * INCIDENT_TYPES.length)];
  const location = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];
  const severity = _weightedSeverity();

  const incident = {
    incident_id: `INC-${Date.now().toString(36).toUpperCase()}`,
    type,
    severity,
    status: "open", // open | assigned | active | resolved
    location: location.name,
    lat: location.lat + (Math.random() - 0.5) * 0.02,
    lng: location.lng + (Math.random() - 0.5) * 0.02,
    assigned_driver: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    resolved_at: null
  };

  const incidents = [incident, ...s.incidents].slice(0, 60);
  const newStats = _calcStats(incidents);
  const updated = { ...s, incidents, stats: newStats };
  _setState(updated);

  _appendEvent("INCIDENT", `[${severity.toUpperCase()}] ${type} reported at ${location.name}`, incident.incident_id);

  // Auto-assign available driver
  _assignDriver(incident.incident_id);

  // AI response to incident
  _appendAI(_aiIncidentResponse(incident));
}

// ─────────────────────────────────────────────
// DRIVER ASSIGNMENT ENGINE
// ─────────────────────────────────────────────

function _assignDriver(incident_id) {
  const s = _getState();
  const available = s.drivers.filter(d => d.status === "available");
  if (!available.length) {
    _appendEvent("ASSIGN", `No available units for ${incident_id}. Incident queued.`, incident_id);
    _appendAI(`Resource constraint detected. No available units for incident ${incident_id}. Recommend escalation review.`);
    return;
  }

  const driver = available[Math.floor(Math.random() * available.length)];
  const now = new Date().toISOString();

  const drivers = s.drivers.map(d =>
    d.driver_id === driver.driver_id
      ? { ...d, status: "assigned", incident_id, last_updated: now }
      : d
  );

  const incidents = s.incidents.map(inc =>
    inc.incident_id === incident_id
      ? { ...inc, status: "assigned", assigned_driver: driver.driver_id, updated_at: now }
      : inc
  );

  const newStats = _calcStats(incidents);
  _setState({ ...s, drivers, incidents, stats: newStats });
  _appendEvent("ASSIGN", `${driver.name} assigned to ${incident_id}. Status: EN ROUTE`, incident_id);
  _appendAI(_aiAssignmentResponse(driver.name, incident_id));

  // Transition to en_route after 2s
  setTimeout(() => {
    const s2 = _getState();
    if (!s2.running || s2.paused) return;
    const d2 = s2.drivers.find(d => d.driver_id === driver.driver_id);
    if (!d2 || d2.incident_id !== incident_id) return;

    const drivers2 = s2.drivers.map(d =>
      d.driver_id === driver.driver_id ? { ...d, status: "en_route", last_updated: new Date().toISOString() } : d
    );
    const incidents2 = s2.incidents.map(inc =>
      inc.incident_id === incident_id ? { ...inc, status: "active", updated_at: new Date().toISOString() } : inc
    );
    _setState({ ...s2, drivers: drivers2, incidents: incidents2, stats: _calcStats(incidents2) });
    _appendEvent("ROUTE", `${driver.name} en route to ${incident_id}`, incident_id);
  }, 2500);
}

// ─────────────────────────────────────────────
// DRIVER STATE PROGRESSION
// ─────────────────────────────────────────────

function _progressDrivers() {
  const s = _getState();
  if (!s.running || s.paused) return;

  let incidents = [...s.incidents];
  let drivers = [...s.drivers];
  let changed = false;

  drivers = drivers.map(d => {
    if (d.status === "en_route") {
      // ~60% chance to arrive on scene each tick
      if (Math.random() < 0.6) {
        changed = true;
        _appendEvent("SCENE", `${d.name} arrived on scene at incident ${d.incident_id}`, d.incident_id);
        _appendAI(_aiOnSceneResponse(d.name, d.incident_id));
        return { ...d, status: "on_scene", last_updated: new Date().toISOString() };
      }
    } else if (d.status === "on_scene") {
      // ~45% chance to resolve each tick
      if (Math.random() < 0.45) {
        changed = true;
        const incId = d.incident_id;
        incidents = incidents.map(inc =>
          inc.incident_id === incId
            ? { ...inc, status: "resolved", updated_at: new Date().toISOString(), resolved_at: new Date().toISOString() }
            : inc
        );
        _appendEvent("RESOLVE", `${d.name} resolved incident ${incId}. Unit returning to standby.`, incId);
        _appendAI(_aiResolvedResponse(d.name, incId));
        return { ...d, status: "available", incident_id: null, last_updated: new Date().toISOString() };
      }
    }
    return d;
  });

  if (changed) {
    _setState({ ...s, drivers, incidents, stats: _calcStats(incidents) });
  }
}

// ─────────────────────────────────────────────
// STATS CALCULATOR
// ─────────────────────────────────────────────

function _calcStats(incidents) {
  return {
    total: incidents.length,
    resolved: incidents.filter(i => i.status === "resolved").length,
    active: incidents.filter(i => i.status !== "resolved").length,
    critical: incidents.filter(i => i.severity === "critical" && i.status !== "resolved").length
  };
}

// ─────────────────────────────────────────────
// EVENT LOG
// ─────────────────────────────────────────────

function _appendEvent(tag, message, ref = null) {
  const s = _getState();
  const entry = {
    id: crypto.randomUUID(),
    tag,
    message,
    ref,
    timestamp: new Date().toISOString()
  };
  const events = [entry, ...s.events].slice(0, 200);
  _setState({ ...s, events });
}

export function clearEventLog() {
  const s = _getState();
  _setState({ ...s, events: [] });
}

// ─────────────────────────────────────────────
// AI RESPONSE ENGINE — AP3X RESPONSE INTELLIGENCE ENGINE
// SIMULATION ONLY. No real operational authority. No real emergency instructions.
// ─────────────────────────────────────────────

function _appendAI(message) {
  const s = _getState();
  const entry = {
    id: crypto.randomUUID(),
    message,
    timestamp: new Date().toISOString()
  };
  const aiMessages = [entry, ...s.aiMessages].slice(0, 100);
  _setState({ ...s, aiMessages });
}

function _aiIncidentResponse(incident) {
  const { severity, type, location } = incident;
  const map = {
    critical: `⚠️ CRITICAL priority incident detected: ${type} at ${location}. Recommend immediate multi-unit assignment and escalation to command level.`,
    high:     `🔴 High severity: ${type} at ${location}. Recommend priority assignment. Risk score elevated — monitor closely.`,
    medium:   `🟡 Medium priority: ${type} at ${location}. Standard response protocol initiated. Assign next available unit.`,
    low:      `🟢 Low severity: ${type} at ${location}. Single unit assignment sufficient. Situation appears contained.`
  };
  return map[severity] || `New incident registered: ${type} at ${location}.`;
}

function _aiAssignmentResponse(driverName, incidentId) {
  const options = [
    `${driverName} assigned to ${incidentId}. Route calculated. Estimated response within operational parameters.`,
    `Unit dispatch confirmed: ${driverName} → ${incidentId}. Monitoring transit status.`,
    `${driverName} mobilised for ${incidentId}. Command should maintain comms throughout approach.`
  ];
  return options[Math.floor(Math.random() * options.length)];
}

function _aiOnSceneResponse(driverName, incidentId) {
  const options = [
    `${driverName} confirmed on scene at ${incidentId}. Situation assessment phase initiated.`,
    `On-scene arrival confirmed: ${driverName} at ${incidentId}. Awaiting status report.`,
    `${driverName} has reached ${incidentId}. Risk score recalibrating based on proximity data.`
  ];
  return options[Math.floor(Math.random() * options.length)];
}

function _aiResolvedResponse(driverName, incidentId) {
  const options = [
    `Incident ${incidentId} resolved. ${driverName} returning to standby. System stability improving.`,
    `${incidentId} closed by ${driverName}. Excellent response time recorded. Unit now available for redeployment.`,
    `Resolution confirmed for ${incidentId}. ${driverName} returning to base. Incident logged.`
  ];
  return options[Math.floor(Math.random() * options.length)];
}

// ─────────────────────────────────────────────
// MANUAL CONTROLS (for PWA driver interface)
// ─────────────────────────────────────────────

export function driverAcceptIncident(driver_id) {
  const s = _getState();
  const driver = s.drivers.find(d => d.driver_id === driver_id);
  if (!driver || driver.status !== "assigned") return;

  const drivers = s.drivers.map(d =>
    d.driver_id === driver_id ? { ...d, status: "en_route", last_updated: new Date().toISOString() } : d
  );
  _setState({ ...s, drivers });
  _appendEvent("DRIVER", `${driver.name} accepted and is en route to ${driver.incident_id}`, driver.incident_id);
}

export function driverUpdateStatus(driver_id, newStatus) {
  const s = _getState();
  const driver = s.drivers.find(d => d.driver_id === driver_id);
  if (!driver) return;

  let incidents = s.incidents;

  if (newStatus === "on_scene") {
    incidents = s.incidents.map(inc =>
      inc.incident_id === driver.incident_id ? { ...inc, status: "active", updated_at: new Date().toISOString() } : inc
    );
    _appendEvent("DRIVER", `${driver.name} marked ON SCENE`, driver.incident_id);
    _appendAI(_aiOnSceneResponse(driver.name, driver.incident_id));
  }

  if (newStatus === "completed") {
    incidents = s.incidents.map(inc =>
      inc.incident_id === driver.incident_id
        ? { ...inc, status: "resolved", resolved_at: new Date().toISOString(), updated_at: new Date().toISOString() }
        : inc
    );
    _appendEvent("DRIVER", `${driver.name} completed response for ${driver.incident_id}`, driver.incident_id);
    _appendAI(_aiResolvedResponse(driver.name, driver.incident_id));
    const drivers = s.drivers.map(d =>
      d.driver_id === driver_id ? { ...d, status: "available", incident_id: null, last_updated: new Date().toISOString() } : d
    );
    _setState({ ...s, drivers, incidents, stats: _calcStats(incidents) });
    return;
  }

  const drivers = s.drivers.map(d =>
    d.driver_id === driver_id ? { ...d, status: newStatus, last_updated: new Date().toISOString() } : d
  );
  _setState({ ...s, drivers, incidents, stats: _calcStats(incidents) });
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

export function formatTimestamp(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function severityClass(severity) {
  return { critical: "critical", high: "high", medium: "medium", low: "low" }[severity] || "low";
}

export function statusClass(status) {
  return { resolved: "resolved", active: "active", assigned: "assigned", open: "open" }[status] || "open";
}
