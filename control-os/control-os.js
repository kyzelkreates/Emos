// AP3X INTELLIGENT EMERGENCY RESPONSE SIMULATION SYSTEM
// control-os/control-os.js — Command Centre Dashboard
// ADDS new simulation layer on top of existing NDOS architecture
// SIMULATION ONLY — Not a real operational system

import {
  getSimState,
  onSimStateChange,
  startSimulation,
  pauseSimulation,
  resetSimulation,
  formatTimestamp,
  severityClass,
  statusClass
} from "../simulation/simulation-engine.js";

// ─────────────────────────────────────────────
// MOUNT
// ─────────────────────────────────────────────

let _root = null;
let _currentView = "dashboard"; // dashboard | incidents | drivers | ai | timeline

export function mountControlOS(root) {
  _root = root;
  _render();
  onSimStateChange(() => _render());
}

// ─────────────────────────────────────────────
// MAIN RENDER
// ─────────────────────────────────────────────

function _render() {
  if (!_root) return;
  const state = getSimState();

  _root.className = "ap3x-shell ap3x-fade-in";
  _root.innerHTML = "";

  _root.appendChild(_buildTopBar(state));

  const body = document.createElement("div");
  body.className = "ap3x-body";

  body.appendChild(_buildSidebar(state));

  const main = document.createElement("main");
  main.className = "ap3x-main";
  main.style.cssText = "display:flex;flex-direction:column;min-height:0;overflow:hidden;";

  if (!state.running && !state.incidents.length) {
    main.appendChild(_buildStandby());
  } else {
    switch (_currentView) {
      case "dashboard":  main.appendChild(_buildDashboard(state)); break;
      case "incidents":  main.appendChild(_buildIncidentsView(state)); break;
      case "drivers":    main.appendChild(_buildDriversView(state)); break;
      case "ai":         main.appendChild(_buildAIView(state)); break;
      case "timeline":   main.appendChild(_buildTimelineView(state)); break;
      default:           main.appendChild(_buildDashboard(state));
    }
  }

  main.appendChild(_buildDisclaimer());
  body.appendChild(main);
  _root.appendChild(body);
}

// ─────────────────────────────────────────────
// TOP BAR
// ─────────────────────────────────────────────

function _buildTopBar(state) {
  const bar = document.createElement("header");
  bar.className = "ap3x-topbar";

  const now = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const statusCls = !state.running ? "standby" : state.paused ? "paused" : state.stats?.critical > 0 ? "critical" : "";
  const statusLabel = !state.running ? "STANDBY" : state.paused ? "PAUSED" : "OPERATIONAL";

  bar.innerHTML = `
    <div class="ap3x-topbar__brand">
      <div class="ap3x-topbar__indicator ${statusCls}"></div>
      AP3X — CONTROL OS
    </div>
    <div class="ap3x-topbar__center">
      <span>🕐 ${now}</span>
      <span class="ap3x-status-pill ${statusLabel.toLowerCase()}">${statusLabel}</span>
      ${state.running ? `
        <span style="color:var(--ap3x-text-muted);font-size:0.68rem;">
          Active: <strong style="color:var(--ap3x-amber)">${state.stats.active}</strong> &nbsp;
          Critical: <strong style="color:var(--ap3x-red)">${state.stats.critical}</strong>
        </span>
      ` : ""}
    </div>
    <div class="ap3x-topbar__right" id="topbar-controls"></div>
  `;

  const controls = bar.querySelector("#topbar-controls");

  if (!state.running) {
    const btn = document.createElement("button");
    btn.className = "ap3x-btn ap3x-btn--primary";
    btn.innerHTML = "▶ Start Simulation";
    btn.onclick = () => startSimulation({ incidentIntervalSec: 10 });
    controls.appendChild(btn);
  } else {
    const pauseBtn = document.createElement("button");
    pauseBtn.className = `ap3x-btn ap3x-btn--${state.paused ? "primary" : "amber"}`;
    pauseBtn.textContent = state.paused ? "▶ Resume" : "⏸ Pause";
    pauseBtn.onclick = pauseSimulation;
    controls.appendChild(pauseBtn);

    const resetBtn = document.createElement("button");
    resetBtn.className = "ap3x-btn ap3x-btn--ghost";
    resetBtn.textContent = "↺ Reset";
    resetBtn.onclick = () => { if (confirm("Reset simulation? All data will be cleared.")) resetSimulation(); };
    controls.appendChild(resetBtn);
  }

  return bar;
}

// ─────────────────────────────────────────────
// SIDEBAR
// ─────────────────────────────────────────────

function _buildSidebar(state) {
  const nav = [
    { id: "dashboard", icon: "⬛", label: "Dashboard" },
    { id: "incidents", icon: "🔴", label: "Incidents" },
    { id: "drivers",   icon: "🚗", label: "Units" },
    { id: "ai",        icon: "🤖", label: "AI Engine" },
    { id: "timeline",  icon: "📋", label: "Timeline" }
  ];

  const sidebar = document.createElement("aside");
  sidebar.className = "ap3x-sidebar";

  const sectionLabel = document.createElement("div");
  sectionLabel.className = "ap3x-nav-section";
  sectionLabel.textContent = "Command";
  sidebar.appendChild(sectionLabel);

  nav.forEach(({ id, icon, label }) => {
    const btn = document.createElement("button");
    btn.className = `ap3x-nav-item${_currentView === id ? " active" : ""}`;
    btn.innerHTML = `<span class="ap3x-nav-item__icon">${icon}</span> ${label}`;
    btn.onclick = () => { _currentView = id; _render(); };
    sidebar.appendChild(btn);
  });

  if (state.running) {
    const systemLabel = document.createElement("div");
    systemLabel.className = "ap3x-nav-section";
    systemLabel.textContent = "Live Stats";
    sidebar.appendChild(systemLabel);

    const stats = [
      { label: "Total", value: state.stats.total, color: "var(--ap3x-text)" },
      { label: "Active", value: state.stats.active, color: "var(--ap3x-amber)" },
      { label: "Resolved", value: state.stats.resolved, color: "var(--ap3x-green)" },
      { label: "Critical", value: state.stats.critical, color: "var(--ap3x-red)" }
    ];

    stats.forEach(({ label, value, color }) => {
      const item = document.createElement("div");
      item.style.cssText = `display:flex;justify-content:space-between;padding:5px 10px;font-size:0.72rem;`;
      item.innerHTML = `<span style="color:var(--ap3x-text-muted)">${label}</span><strong style="color:${color};font-family:var(--font-mono)">${value}</strong>`;
      sidebar.appendChild(item);
    });
  }

  return sidebar;
}

// ─────────────────────────────────────────────
// STANDBY STATE
// ─────────────────────────────────────────────

function _buildStandby() {
  const div = document.createElement("div");
  div.className = "ap3x-standby";
  div.innerHTML = `
    <div class="ap3x-standby__icon">🛡️</div>
    <div class="ap3x-standby__title">AP3X Control OS</div>
    <div class="ap3x-standby__sub">Emergency Response Simulation System — Ready</div>
    <div class="ap3x-standby__sub" style="margin-top:8px;font-size:0.7rem;">Press "Start Simulation" to begin.</div>
  `;
  return div;
}

// ─────────────────────────────────────────────
// DASHBOARD VIEW — Main command view
// ─────────────────────────────────────────────

function _buildDashboard(state) {
  const frag = document.createDocumentFragment();

  // ── Stat Row ──────────────────────────────
  const statsRow = document.createElement("div");
  statsRow.className = "ap3x-grid ap3x-grid-4";
  statsRow.style.flexShrink = "0";

  const statDefs = [
    { label: "Total Incidents",   value: state.stats.total,    color: "blue",   sub: "all time" },
    { label: "Active Incidents",  value: state.stats.active,   color: "amber",  sub: state.stats.active > 0 ? "requires response" : "clear" },
    { label: "Critical",          value: state.stats.critical, color: state.stats.critical > 0 ? "red" : "blue", sub: state.stats.critical > 0 ? "immediate action" : "none", pulse: state.stats.critical > 0 },
    { label: "Resolved",          value: state.stats.resolved, color: "green",  sub: "closed successfully" }
  ];

  statDefs.forEach(({ label, value, color, sub, pulse }) => {
    const card = document.createElement("div");
    card.className = `ap3x-stat ${color}${pulse ? " critical" : ""}`;
    card.innerHTML = `
      <div class="ap3x-stat__label">${label}</div>
      <div class="ap3x-stat__value">${value}</div>
      <div class="ap3x-stat__sub">${sub}</div>
    `;
    statsRow.appendChild(card);
  });

  frag.appendChild(statsRow);

  // ── Critical Banner ───────────────────────
  if (state.stats.critical > 0) {
    const banner = document.createElement("div");
    banner.className = "ap3x-status-banner visible";
    banner.innerHTML = `<div class="ap3x-status-banner__dot"></div> ${state.stats.critical} critical incident${state.stats.critical > 1 ? "s" : ""} requires immediate attention`;
    frag.appendChild(banner);
  }

  // ── Command Layout ────────────────────────
  const layout = document.createElement("div");
  layout.className = "ap3x-command-layout";
  layout.style.cssText = "flex:1;min-height:0;";

  // Left: Incidents + Drivers
  const left = document.createElement("div");
  left.className = "ap3x-command-left";

  left.appendChild(_buildIncidentsPanel(state));
  left.appendChild(_buildDriversPanel(state));

  // Right: AI + Events
  const right = document.createElement("div");
  right.className = "ap3x-command-right";

  right.appendChild(_buildAIPanel(state));
  right.appendChild(_buildEventsPanel(state));

  layout.appendChild(left);
  layout.appendChild(right);
  frag.appendChild(layout);

  return frag;
}

// ─────────────────────────────────────────────
// INCIDENTS PANEL
// ─────────────────────────────────────────────

function _buildIncidentsPanel(state) {
  const panel = document.createElement("div");
  panel.className = "ap3x-panel ap3x-incidents-panel ap3x-scan-effect";

  const header = document.createElement("div");
  header.className = "ap3x-panel__header";
  header.innerHTML = `
    <div class="ap3x-panel__title">🔴 Live Incident Feed</div>
    <div style="font-size:0.68rem;font-family:var(--font-mono);color:var(--ap3x-text-muted)">
      ${state.incidents.filter(i => i.status !== "resolved").length} active
    </div>
  `;
  panel.appendChild(header);

  const body = document.createElement("div");
  body.className = "ap3x-panel__body ap3x-scroll-list";
  panel.appendChild(body);

  const active = state.incidents.filter(i => i.status !== "resolved");
  const resolved = state.incidents.filter(i => i.status === "resolved");
  const display = [...active, ...resolved].slice(0, 40);

  if (!display.length) {
    body.innerHTML = `<div class="ap3x-empty"><div class="ap3x-empty__icon">📡</div><div>No incidents yet. Simulation running…</div></div>`;
  } else {
    display.forEach(inc => body.appendChild(_buildIncidentRow(inc)));
  }

  return panel;
}

function _buildIncidentRow(inc) {
  const row = document.createElement("div");
  row.className = "ap3x-incident";

  const sev = document.createElement("div");
  sev.className = `ap3x-incident__sev ${severityClass(inc.severity)}`;
  row.appendChild(sev);

  const body = document.createElement("div");
  body.className = "ap3x-incident__body";
  body.innerHTML = `
    <div class="ap3x-incident__type">${inc.type}</div>
    <div class="ap3x-incident__meta">📍 ${inc.location} · ${formatTimestamp(inc.created_at)}</div>
    <div class="ap3x-incident__id">${inc.incident_id}</div>
  `;
  row.appendChild(body);

  const right = document.createElement("div");
  right.className = "ap3x-incident__right";
  right.innerHTML = `
    <span class="ap3x-badge ${severityClass(inc.severity)}">${inc.severity}</span>
    <span class="ap3x-badge ${statusClass(inc.status)}">${inc.status.replace("_", " ")}</span>
  `;
  row.appendChild(right);

  return row;
}

// ─────────────────────────────────────────────
// DRIVERS PANEL
// ─────────────────────────────────────────────

function _buildDriversPanel(state) {
  const panel = document.createElement("div");
  panel.className = "ap3x-panel ap3x-drivers-panel";

  const available = state.drivers.filter(d => d.status === "available").length;

  const header = document.createElement("div");
  header.className = "ap3x-panel__header";
  header.innerHTML = `
    <div class="ap3x-panel__title">🚗 Unit Status Grid</div>
    <div style="font-size:0.68rem;color:var(--ap3x-green);font-family:var(--font-mono)">${available} available</div>
  `;
  panel.appendChild(header);

  const body = document.createElement("div");
  body.className = "ap3x-panel__body";

  const grid = document.createElement("div");
  grid.className = "ap3x-drivers-grid";

  state.drivers.forEach(driver => {
    const item = document.createElement("div");
    item.className = `ap3x-driver ${driver.status}`;
    item.innerHTML = `
      <div class="ap3x-driver__indicator ${driver.status}"></div>
      <div>
        <div class="ap3x-driver__name" style="font-size:0.7rem;">${driver.name}</div>
        <div class="ap3x-driver__meta">${driver.status.replace("_", " ")}${driver.incident_id ? ` · ${driver.incident_id}` : ""}</div>
      </div>
    `;
    grid.appendChild(item);
  });

  body.appendChild(grid);
  panel.appendChild(body);
  return panel;
}

// ─────────────────────────────────────────────
// AI PANEL
// ─────────────────────────────────────────────

function _buildAIPanel(state) {
  const panel = document.createElement("div");
  panel.className = "ap3x-panel ap3x-ai-panel";

  const header = document.createElement("div");
  header.className = "ap3x-panel__header";
  header.innerHTML = `
    <div class="ap3x-panel__title" style="color:var(--ap3x-purple)">🤖 AP3X RESPONSE INTELLIGENCE ENGINE</div>
    <div style="font-size:0.6rem;color:var(--ap3x-text-muted)">SIM ONLY</div>
  `;
  panel.appendChild(header);

  const body = document.createElement("div");
  body.className = "ap3x-panel__body ap3x-scroll-list";
  panel.appendChild(body);

  const messages = state.aiMessages.slice(0, 12);
  if (!messages.length) {
    body.innerHTML = `<div class="ap3x-empty"><div class="ap3x-empty__icon">🧠</div><div>AI engine initialising…</div></div>`;
  } else {
    messages.forEach(msg => {
      const item = document.createElement("div");
      item.className = "ap3x-ai-message";
      item.innerHTML = `
        <div class="ap3x-ai-message__label">AP3X RIE</div>
        <div class="ap3x-ai-message__text">${msg.message}</div>
        <div class="ap3x-ai-message__time">${formatTimestamp(msg.timestamp)}</div>
      `;
      body.appendChild(item);
    });
  }

  return panel;
}

// ─────────────────────────────────────────────
// EVENTS PANEL
// ─────────────────────────────────────────────

function _buildEventsPanel(state) {
  const panel = document.createElement("div");
  panel.className = "ap3x-panel ap3x-events-panel";

  const header = document.createElement("div");
  header.className = "ap3x-panel__header";
  header.innerHTML = `<div class="ap3x-panel__title">📡 Event Log Stream</div>`;
  panel.appendChild(header);

  const body = document.createElement("div");
  body.className = "ap3x-panel__body ap3x-scroll-list";
  panel.appendChild(body);

  const events = state.events.slice(0, 40);
  if (!events.length) {
    body.innerHTML = `<div class="ap3x-empty"><div class="ap3x-empty__icon">📡</div><div>Awaiting events…</div></div>`;
  } else {
    events.forEach(ev => {
      const item = document.createElement("div");
      item.className = "ap3x-event";
      item.innerHTML = `
        <span class="ap3x-event__time">${formatTimestamp(ev.timestamp)}</span>
        <span class="ap3x-event__tag ${ev.tag}">${ev.tag}</span>
        <span class="ap3x-event__msg">${ev.message}</span>
      `;
      body.appendChild(item);
    });
  }

  return panel;
}

// ─────────────────────────────────────────────
// FULL INCIDENTS VIEW
// ─────────────────────────────────────────────

function _buildIncidentsView(state) {
  const frag = document.createDocumentFragment();

  const header = document.createElement("div");
  header.className = "ap3x-section-header";
  header.innerHTML = `
    <div class="ap3x-section-title">All Incidents — ${state.incidents.length} total</div>
    <div style="display:flex;gap:8px;font-size:0.72rem;">
      <span style="color:var(--ap3x-red)">■ Critical: ${state.incidents.filter(i=>i.severity==="critical").length}</span>
      <span style="color:var(--ap3x-amber)">■ High: ${state.incidents.filter(i=>i.severity==="high").length}</span>
      <span style="color:var(--ap3x-green)">■ Resolved: ${state.stats.resolved}</span>
    </div>
  `;
  frag.appendChild(header);

  const panel = document.createElement("div");
  panel.className = "ap3x-panel";
  panel.style.cssText = "flex:1;display:flex;flex-direction:column;min-height:0;";

  const body = document.createElement("div");
  body.className = "ap3x-panel__body ap3x-scroll-list";
  body.style.flex = "1";
  panel.appendChild(body);

  if (!state.incidents.length) {
    body.innerHTML = `<div class="ap3x-empty"><div class="ap3x-empty__icon">📡</div><div>No incidents logged yet.</div></div>`;
  } else {
    // Sort: open/active first, then by severity
    const sevOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const sorted = [...state.incidents].sort((a, b) => {
      if (a.status === "resolved" && b.status !== "resolved") return 1;
      if (a.status !== "resolved" && b.status === "resolved") return -1;
      return (sevOrder[a.severity] ?? 3) - (sevOrder[b.severity] ?? 3);
    });
    sorted.forEach(inc => body.appendChild(_buildIncidentRow(inc)));
  }

  frag.appendChild(panel);
  return frag;
}

// ─────────────────────────────────────────────
// FULL DRIVERS VIEW
// ─────────────────────────────────────────────

function _buildDriversView(state) {
  const frag = document.createDocumentFragment();

  const header = document.createElement("div");
  header.className = "ap3x-section-header";
  header.innerHTML = `<div class="ap3x-section-title">Unit Status — ${state.drivers.length} units</div>`;
  frag.appendChild(header);

  const grid = document.createElement("div");
  grid.className = "ap3x-grid ap3x-grid-auto";

  state.drivers.forEach(driver => {
    const card = document.createElement("div");
    card.className = `ap3x-panel`;
    card.style.padding = "var(--sp-md)";

    const incident = driver.incident_id
      ? state.incidents.find(i => i.incident_id === driver.incident_id)
      : null;

    card.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
        <div class="ap3x-driver__indicator ${driver.status}" style="width:10px;height:10px;"></div>
        <div style="font-weight:700;font-size:0.85rem;color:var(--ap3x-text)">${driver.name}</div>
      </div>
      <div style="margin-bottom:8px;"><span class="ap3x-badge ${driver.status === 'en_route' ? 'en_route' : driver.status === 'on_scene' ? 'on_scene' : driver.status === 'assigned' ? 'assigned' : 'available'}">${driver.status.replace(/_/g, " ")}</span></div>
      ${incident ? `
        <div style="font-size:0.72rem;color:var(--ap3x-text-muted);">
          <div>📋 ${incident.type}</div>
          <div>📍 ${incident.location}</div>
          <div style="font-family:var(--font-mono);margin-top:3px;">${incident.incident_id}</div>
          <div style="margin-top:3px;"><span class="ap3x-badge ${severityClass(incident.severity)}">${incident.severity}</span></div>
        </div>
      ` : `<div style="font-size:0.72rem;color:var(--ap3x-text-muted);">No active assignment</div>`}
      <div style="font-size:0.62rem;color:var(--ap3x-text-muted);margin-top:8px;font-family:var(--font-mono);">Updated ${formatTimestamp(driver.last_updated)}</div>
    `;
    grid.appendChild(card);
  });

  frag.appendChild(grid);
  return frag;
}

// ─────────────────────────────────────────────
// AI VIEW
// ─────────────────────────────────────────────

function _buildAIView(state) {
  const frag = document.createDocumentFragment();

  const header = document.createElement("div");
  header.className = "ap3x-section-header";
  header.innerHTML = `
    <div class="ap3x-section-title" style="color:var(--ap3x-purple)">🤖 AP3X Response Intelligence Engine — Full Log</div>
    <div style="font-size:0.65rem;color:var(--ap3x-text-muted);padding:2px 8px;background:rgba(139,92,246,0.1);border:1px solid rgba(139,92,246,0.2);border-radius:4px;">SIMULATION ONLY</div>
  `;
  frag.appendChild(header);

  const panel = document.createElement("div");
  panel.className = "ap3x-panel";
  panel.style.cssText = "flex:1;display:flex;flex-direction:column;min-height:0;";

  const body = document.createElement("div");
  body.className = "ap3x-panel__body ap3x-scroll-list";
  body.style.flex = "1";

  if (!state.aiMessages.length) {
    body.innerHTML = `<div class="ap3x-empty"><div class="ap3x-empty__icon">🧠</div><div>AI engine will generate responses as incidents occur.</div></div>`;
  } else {
    state.aiMessages.forEach(msg => {
      const item = document.createElement("div");
      item.className = "ap3x-ai-message";
      item.innerHTML = `
        <div class="ap3x-ai-message__label">AP3X RESPONSE INTELLIGENCE ENGINE</div>
        <div class="ap3x-ai-message__text">${msg.message}</div>
        <div class="ap3x-ai-message__time">${new Date(msg.timestamp).toLocaleTimeString("en-GB")}</div>
      `;
      body.appendChild(item);
    });
  }

  panel.appendChild(body);
  frag.appendChild(panel);
  return frag;
}

// ─────────────────────────────────────────────
// TIMELINE VIEW (simulation history)
// ─────────────────────────────────────────────

function _buildTimelineView(state) {
  const frag = document.createDocumentFragment();

  const header = document.createElement("div");
  header.className = "ap3x-section-header";
  header.innerHTML = `
    <div class="ap3x-section-title">📋 Simulation Timeline — Event Replay</div>
    <div style="font-size:0.7rem;color:var(--ap3x-text-muted);">${state.events.length} events logged</div>
  `;
  frag.appendChild(header);

  // Summary stats
  const summary = document.createElement("div");
  summary.className = "ap3x-grid ap3x-grid-3";
  summary.style.cssText = "flex-shrink:0;margin-bottom:var(--sp-md);";
  [
    { label: "Session Started",   value: state.startedAt ? new Date(state.startedAt).toLocaleTimeString("en-GB") : "—", color: "blue" },
    { label: "Events Logged",     value: state.events.length, color: "blue" },
    { label: "Resolution Rate",   value: state.stats.total ? `${Math.round((state.stats.resolved/state.stats.total)*100)}%` : "—", color: "green" }
  ].forEach(({ label, value, color }) => {
    const card = document.createElement("div");
    card.className = `ap3x-stat ${color}`;
    card.innerHTML = `<div class="ap3x-stat__label">${label}</div><div class="ap3x-stat__value" style="font-size:1.2rem;">${value}</div>`;
    summary.appendChild(card);
  });
  frag.appendChild(summary);

  const panel = document.createElement("div");
  panel.className = "ap3x-panel";
  panel.style.cssText = "flex:1;display:flex;flex-direction:column;min-height:0;";

  const body = document.createElement("div");
  body.className = "ap3x-panel__body ap3x-scroll-list";
  body.style.flex = "1";

  if (!state.events.length) {
    body.innerHTML = `<div class="ap3x-empty"><div class="ap3x-empty__icon">📋</div><div>No events recorded yet.</div></div>`;
  } else {
    state.events.forEach(ev => {
      const item = document.createElement("div");
      item.className = "ap3x-timeline-item";
      item.innerHTML = `
        <div class="ap3x-timeline-dot ${ev.tag === "RESOLVE" ? "resolved" : ev.tag === "INCIDENT" ? "critical" : "active"}"></div>
        <div style="flex:1;">
          <div style="display:flex;align-items:center;gap:6px;">
            <span class="ap3x-event__tag ${ev.tag}">${ev.tag}</span>
            <span style="font-size:0.72rem;color:var(--ap3x-text)">${ev.message}</span>
          </div>
          <div style="font-size:0.62rem;color:var(--ap3x-text-muted);margin-top:2px;font-family:var(--font-mono);">${new Date(ev.timestamp).toLocaleTimeString("en-GB")}</div>
        </div>
      `;
      body.appendChild(item);
    });
  }

  panel.appendChild(body);
  frag.appendChild(panel);
  return frag;
}

// ─────────────────────────────────────────────
// DISCLAIMER
// ─────────────────────────────────────────────

function _buildDisclaimer() {
  const d = document.createElement("div");
  d.className = "ap3x-disclaimer";
  d.textContent = "⚠️ SIMULATION ONLY — This is a training and demonstration system. Not a real emergency response tool. No operational authority. No real emergency instructions.";
  return d;
}
