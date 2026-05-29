// AP3X INTELLIGENT EMERGENCY RESPONSE SIMULATION SYSTEM
// driver-pwa/driver-pwa.js — Mobile Driver Interface
// SIMULATION ONLY — Not a real emergency response tool. No real operational instructions.

import {
  getSimState,
  onSimStateChange,
  startSimulation,
  driverAcceptIncident,
  driverUpdateStatus,
  formatTimestamp,
  severityClass,
  statusClass
} from "../simulation/simulation-engine.js";

// ─────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────

let _root = null;
let _selectedDriverId = null;
let _currentTab = "task"; // task | status | events

const WORKFLOW_STEPS = [
  { id: "accept",    label: "Accept Assignment", sub: "Confirm you are available and responding", action: "en_route",  icon: "✅" },
  { id: "navigate",  label: "Navigate to Scene",  sub: "En route — follow simulated route",        action: "navigate",  icon: "🗺️" },
  { id: "on_scene",  label: "Arrive On Scene",     sub: "Confirm arrival and begin assessment",     action: "on_scene",  icon: "📍" },
  { id: "complete",  label: "Complete Response",   sub: "Incident resolved — return to standby",   action: "completed", icon: "✓" }
];

// ─────────────────────────────────────────────
// MOUNT
// ─────────────────────────────────────────────

export function mountDriverPWA(root) {
  _root = root;

  // Restore saved driver ID
  const saved = localStorage.getItem("ap3x_selected_driver");
  if (saved) _selectedDriverId = saved;

  _render();
  onSimStateChange(() => _render());
}

// ─────────────────────────────────────────────
// MAIN RENDER
// ─────────────────────────────────────────────

function _render() {
  if (!_root) return;
  const state = getSimState();

  _root.className = "ap3x-pwa-app ap3x-fade-in";
  _root.innerHTML = "";

  // If simulation not started
  if (!state.running && !state.incidents.length) {
    _root.appendChild(_buildNotStarted());
    return;
  }

  // If no driver selected
  const driver = _selectedDriverId
    ? state.drivers.find(d => d.driver_id === _selectedDriverId)
    : null;

  if (!driver) {
    _root.appendChild(_buildDriverSelection(state));
    return;
  }

  // Full driver interface
  _root.appendChild(_buildTopBar(driver, state));

  const content = document.createElement("div");
  content.className = "ap3x-pwa-content";
  _root.appendChild(content);

  switch (_currentTab) {
    case "task":   content.appendChild(_buildTaskTab(driver, state)); break;
    case "status": content.appendChild(_buildStatusTab(driver, state)); break;
    case "events": content.appendChild(_buildEventsTab(state)); break;
  }

  content.appendChild(_buildDisclaimer());
  _root.appendChild(_buildBottomNav());
}

// ─────────────────────────────────────────────
// NOT STARTED
// ─────────────────────────────────────────────

function _buildNotStarted() {
  const div = document.createElement("div");
  div.className = "ap3x-driver-select";
  div.innerHTML = `
    <div style="font-size:3rem">🛡️</div>
    <div class="ap3x-driver-select__title">AP3X Driver Interface</div>
    <div class="ap3x-driver-select__sub">Simulation not active. Start from the Demo Hub or Control OS.</div>
  `;
  const btn = document.createElement("button");
  btn.className = "ap3x-btn ap3x-btn--primary";
  btn.textContent = "▶ Start Simulation";
  btn.onclick = () => startSimulation({ incidentIntervalSec: 10 });
  div.appendChild(btn);
  return div;
}

// ─────────────────────────────────────────────
// DRIVER SELECTION
// ─────────────────────────────────────────────

function _buildDriverSelection(state) {
  const wrap = document.createElement("div");
  wrap.className = "ap3x-pwa-app";

  const header = document.createElement("header");
  header.className = "ap3x-topbar";
  header.innerHTML = `
    <div class="ap3x-topbar__brand">
      <div class="ap3x-topbar__indicator"></div>
      AP3X Driver
    </div>
    <div style="font-size:0.65rem;color:var(--ap3x-text-muted)">Select Unit</div>
  `;
  wrap.appendChild(header);

  const body = document.createElement("div");
  body.className = "ap3x-driver-select";

  body.innerHTML = `
    <div class="ap3x-driver-select__title">Select Your Unit</div>
    <div class="ap3x-driver-select__sub">Choose your assigned unit to begin</div>
  `;

  const list = document.createElement("div");
  list.className = "ap3x-driver-list";

  state.drivers.forEach(driver => {
    const btn = document.createElement("button");
    btn.className = "ap3x-driver-option";
    btn.innerHTML = `
      <div class="ap3x-driver__indicator ${driver.status}" style="width:10px;height:10px;flex-shrink:0;border-radius:50%;"></div>
      <div>
        <div class="ap3x-driver-option__name">${driver.name}</div>
        <div class="ap3x-driver-option__status">${driver.status.replace(/_/g," ")}${driver.incident_id ? ` · ${driver.incident_id}` : ""}</div>
      </div>
      <span class="ap3x-badge ${driver.status === 'available' ? 'available' : driver.status === 'en_route' ? 'en_route' : 'assigned'}" style="margin-left:auto;">${driver.status.replace(/_/g," ")}</span>
    `;
    btn.onclick = () => {
      _selectedDriverId = driver.driver_id;
      localStorage.setItem("ap3x_selected_driver", driver.driver_id);
      _render();
    };
    list.appendChild(btn);
  });

  body.appendChild(list);
  wrap.appendChild(body);
  return wrap;
}

// ─────────────────────────────────────────────
// TOP BAR
// ─────────────────────────────────────────────

function _buildTopBar(driver, state) {
  const bar = document.createElement("header");
  bar.className = "ap3x-topbar";

  const statusCls = driver.status === "on_scene" ? "critical" : driver.status === "available" ? "" : "";

  bar.innerHTML = `
    <div class="ap3x-topbar__brand">
      <div class="ap3x-topbar__indicator ${statusCls}"></div>
      AP3X
    </div>
    <div style="font-size:0.72rem;color:var(--ap3x-text-sub);text-align:center;">
      <div>${driver.name}</div>
    </div>
    <button style="background:none;border:none;color:var(--ap3x-text-muted);font-size:0.7rem;cursor:pointer;padding:4px 8px;border:1px solid var(--ap3x-border);border-radius:4px;" id="switch-unit">Switch</button>
  `;

  bar.querySelector("#switch-unit").onclick = () => {
    _selectedDriverId = null;
    localStorage.removeItem("ap3x_selected_driver");
    _render();
  };

  return bar;
}

// ─────────────────────────────────────────────
// TASK TAB
// ─────────────────────────────────────────────

function _buildTaskTab(driver, state) {
  const frag = document.createDocumentFragment();

  const incident = driver.incident_id
    ? state.incidents.find(i => i.incident_id === driver.incident_id)
    : null;

  if (!incident || incident.status === "resolved") {
    // No active assignment
    const noTask = document.createElement("div");
    noTask.className = "ap3x-no-task";
    noTask.innerHTML = `
      <div class="ap3x-no-task__icon">📡</div>
      <div class="ap3x-no-task__title">No Active Assignment</div>
      <div class="ap3x-no-task__sub">You are on standby. The simulation will assign you to an incident automatically.</div>
      <div style="margin-top:var(--sp-md);">
        <span class="ap3x-badge available">● STANDBY</span>
      </div>
    `;
    frag.appendChild(noTask);
    return frag;
  }

  // Task header
  const taskHeader = document.createElement("div");
  taskHeader.className = "ap3x-task-card ${incident.severity}";
  taskHeader.innerHTML = `
    <div class="ap3x-task-card__header" style="background:var(--ap3x-card);border:1px solid var(--ap3x-border);border-radius:var(--r-lg);padding:var(--sp-md);margin-bottom:var(--sp-md);">
      <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
        <span class="ap3x-badge ${severityClass(incident.severity)}">${incident.severity}</span>
        <span class="ap3x-badge ${statusClass(incident.status)}">${incident.status.replace(/_/g," ")}</span>
      </div>
      <div style="font-size:1.05rem;font-weight:800;color:var(--ap3x-text-bright);margin-bottom:4px;">${incident.type}</div>
      <div style="font-size:0.75rem;color:var(--ap3x-text-sub);">📍 ${incident.location}</div>
      <div style="font-size:0.65rem;color:var(--ap3x-text-muted);font-family:var(--font-mono);margin-top:4px;">${incident.incident_id}</div>
    </div>
  `;
  frag.appendChild(taskHeader);

  // Simulated map
  const mapPlaceholder = document.createElement("div");
  mapPlaceholder.className = "ap3x-map-placeholder";
  mapPlaceholder.innerHTML = `
    <div style="font-size:1.5rem;opacity:0.4;">🗺️</div>
    <div class="ap3x-map-placeholder__label">SIMULATED ROUTE</div>
    <div style="font-size:0.7rem;color:var(--ap3x-text-muted);">→ ${incident.location}</div>
  `;
  frag.appendChild(mapPlaceholder);

  // Workflow steps
  const stepsTitle = document.createElement("div");
  stepsTitle.className = "ap3x-section-title";
  stepsTitle.style.marginTop = "var(--sp-md)";
  stepsTitle.textContent = "Response Workflow";
  frag.appendChild(stepsTitle);

  const stepsList = document.createElement("div");
  stepsList.className = "ap3x-steps-list";

  const currentStepIndex = _getStepIndex(driver.status);

  WORKFLOW_STEPS.forEach((step, i) => {
    const isActive = i === currentStepIndex;
    const isComplete = i < currentStepIndex;

    const stepEl = document.createElement("div");
    stepEl.className = `ap3x-workflow-step ${isActive ? "active-step" : isComplete ? "completed-step" : ""}`;
    stepEl.innerHTML = `
      <div class="ap3x-workflow-step__num">${isComplete ? "✓" : i + 1}</div>
      <div style="flex:1;">
        <div class="ap3x-workflow-step__label">${step.icon} ${step.label}</div>
        <div class="ap3x-workflow-step__sub">${step.sub}</div>
      </div>
    `;

    if (isActive && step.action !== "navigate") {
      const actionBtn = document.createElement("button");
      actionBtn.className = `ap3x-btn ap3x-btn--${step.action === "completed" ? "success" : "primary"}`;
      actionBtn.style.fontSize = "0.75rem";
      actionBtn.textContent = step.label;
      actionBtn.onclick = () => {
        if (step.action === "en_route") driverAcceptIncident(driver.driver_id);
        else driverUpdateStatus(driver.driver_id, step.action);
      };
      stepEl.appendChild(actionBtn);
    }

    if (isActive && step.action === "navigate") {
      const info = document.createElement("div");
      info.style.cssText = "font-size:0.7rem;color:var(--ap3x-teal);padding:4px 8px;background:var(--ap3x-teal-glow);border-radius:4px;";
      info.textContent = "In transit…";
      stepEl.appendChild(info);
    }

    stepsList.appendChild(stepEl);
  });

  frag.appendChild(stepsList);

  // AI guidance
  const latestAI = state.aiMessages.find(m => m.message.includes(driver.incident_id));
  if (latestAI) {
    const aiBlock = document.createElement("div");
    aiBlock.className = "ap3x-ai-message";
    aiBlock.style.marginTop = "var(--sp-md)";
    aiBlock.innerHTML = `
      <div class="ap3x-ai-message__label">AP3X RIE — Guidance for this Incident</div>
      <div class="ap3x-ai-message__text">${latestAI.message}</div>
      <div class="ap3x-ai-message__time">${formatTimestamp(latestAI.timestamp)}</div>
    `;
    frag.appendChild(aiBlock);
  }

  return frag;
}

function _getStepIndex(status) {
  const map = { assigned: 0, en_route: 1, on_scene: 2, available: 3 };
  return map[status] ?? 0;
}

// ─────────────────────────────────────────────
// STATUS TAB
// ─────────────────────────────────────────────

function _buildStatusTab(driver, state) {
  const frag = document.createDocumentFragment();

  const title = document.createElement("div");
  title.className = "ap3x-section-title";
  title.textContent = "Unit Status";
  frag.appendChild(title);

  const grid = document.createElement("div");
  grid.className = "ap3x-grid ap3x-grid-2";

  [
    { label: "Unit",   value: driver.name },
    { label: "Status", value: driver.status.replace(/_/g," ") },
    { label: "Assignment", value: driver.incident_id || "None" },
    { label: "Last Update", value: formatTimestamp(driver.last_updated) }
  ].forEach(({ label, value }) => {
    const block = document.createElement("div");
    block.className = "ap3x-status-block";
    block.innerHTML = `<div class="ap3x-status-block__label">${label}</div><div class="ap3x-status-block__value" style="font-size:0.85rem;">${value}</div>`;
    grid.appendChild(block);
  });

  frag.appendChild(grid);

  // System stats
  const statsTitle = document.createElement("div");
  statsTitle.className = "ap3x-section-title";
  statsTitle.style.marginTop = "var(--sp-md)";
  statsTitle.textContent = "System Status";
  frag.appendChild(statsTitle);

  const statsGrid = document.createElement("div");
  statsGrid.className = "ap3x-grid ap3x-grid-2";

  [
    { label: "Active Incidents", value: state.stats.active, color: "var(--ap3x-amber)" },
    { label: "Critical",         value: state.stats.critical, color: "var(--ap3x-red)" },
    { label: "Resolved",         value: state.stats.resolved, color: "var(--ap3x-green)" },
    { label: "Units Available",  value: state.drivers.filter(d=>d.status==="available").length, color: "var(--ap3x-blue)" }
  ].forEach(({ label, value, color }) => {
    const block = document.createElement("div");
    block.className = "ap3x-status-block";
    block.innerHTML = `
      <div class="ap3x-status-block__label">${label}</div>
      <div class="ap3x-status-block__value" style="color:${color};">${value}</div>
    `;
    statsGrid.appendChild(block);
  });

  frag.appendChild(statsGrid);

  return frag;
}

// ─────────────────────────────────────────────
// EVENTS TAB
// ─────────────────────────────────────────────

function _buildEventsTab(state) {
  const frag = document.createDocumentFragment();

  const title = document.createElement("div");
  title.className = "ap3x-section-title";
  title.textContent = "Event Stream";
  frag.appendChild(title);

  const list = document.createElement("div");
  const events = state.events.slice(0, 30);

  if (!events.length) {
    list.innerHTML = `<div class="ap3x-empty"><div class="ap3x-empty__icon">📡</div><div>No events yet</div></div>`;
  } else {
    events.forEach(ev => {
      const item = document.createElement("div");
      item.className = "ap3x-event";
      item.innerHTML = `
        <span class="ap3x-event__time">${formatTimestamp(ev.timestamp)}</span>
        <span class="ap3x-event__tag ${ev.tag}">${ev.tag}</span>
        <span class="ap3x-event__msg">${ev.message}</span>
      `;
      list.appendChild(item);
    });
  }

  frag.appendChild(list);
  return frag;
}

// ─────────────────────────────────────────────
// BOTTOM NAV
// ─────────────────────────────────────────────

function _buildBottomNav() {
  const nav = document.createElement("nav");
  nav.className = "ap3x-pwa-bottom";

  const tabs = [
    { id: "task",   icon: "🎯", label: "Task" },
    { id: "status", icon: "📊", label: "Status" },
    { id: "events", icon: "📡", label: "Events" }
  ];

  tabs.forEach(({ id, icon, label }) => {
    const btn = document.createElement("button");
    btn.className = `ap3x-pwa-tab${_currentTab === id ? " active" : ""}`;
    btn.innerHTML = `<span class="ap3x-pwa-tab__icon">${icon}</span>${label}`;
    btn.onclick = () => { _currentTab = id; _render(); };
    nav.appendChild(btn);
  });

  return nav;
}

// ─────────────────────────────────────────────
// DISCLAIMER
// ─────────────────────────────────────────────

function _buildDisclaimer() {
  const d = document.createElement("div");
  d.className = "ap3x-disclaimer";
  d.style.marginTop = "var(--sp-md)";
  d.textContent = "⚠️ SIMULATION ONLY — Not a real emergency response tool. No real instructions.";
  return d;
}
