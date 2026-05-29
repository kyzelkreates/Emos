// AP3X INTELLIGENT EMERGENCY RESPONSE SIMULATION SYSTEM
// demo-hub/demo-hub.js — Live Simulation Controller & Showcase
// SIMULATION ONLY — Not a real emergency response system

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
// STATE
// ─────────────────────────────────────────────

let _root = null;
let _incidentInterval = 10; // seconds, for the UI speed slider
let _watchMode = false;
let _clockInterval = null;

// ─────────────────────────────────────────────
// MOUNT
// ─────────────────────────────────────────────

export function mountDemoHub(root) {
  _root = root;
  _render();
  onSimStateChange(() => _render());

  // Live clock tick (for topbar time)
  _clockInterval = setInterval(() => {
    const timeEl = document.getElementById("ap3x-demo-clock");
    if (timeEl) timeEl.textContent = _getTime();
  }, 1000);
}

// ─────────────────────────────────────────────
// MAIN RENDER
// ─────────────────────────────────────────────

function _render() {
  if (!_root) return;
  const state = getSimState();

  _root.className = "ap3x-demo-shell ap3x-fade-in";
  _root.innerHTML = "";

  _root.appendChild(_buildTopBar(state));
  _root.appendChild(_buildHero(state));

  const overview = document.createElement("div");
  overview.className = "ap3x-demo-overview";

  // Live overview cards
  overview.appendChild(_buildLiveCards(state));

  if (state.running || state.incidents.length > 0) {
    // Main content grid
    overview.appendChild(_buildMainGrid(state));
  }

  overview.appendChild(_buildSystemLinks());
  overview.appendChild(_buildDisclaimer());

  _root.appendChild(overview);
}

// ─────────────────────────────────────────────
// TOP BAR
// ─────────────────────────────────────────────

function _buildTopBar(state) {
  const bar = document.createElement("header");
  bar.className = "ap3x-topbar";

  const statusCls = !state.running ? "standby" : state.paused ? "paused" : "";

  bar.innerHTML = `
    <div class="ap3x-topbar__brand">
      <div class="ap3x-topbar__indicator ${statusCls}"></div>
      AP3X DEMO HUB
    </div>
    <div class="ap3x-topbar__center">
      <span id="ap3x-demo-clock" style="font-family:var(--font-mono)">${_getTime()}</span>
      <span class="ap3x-status-pill ${!state.running ? "standby" : state.paused ? "paused" : "operational"}">
        ${!state.running ? "STANDBY" : state.paused ? "PAUSED" : "LIVE"}
      </span>
    </div>
    <div class="ap3x-topbar__right" style="font-size:0.7rem;color:var(--ap3x-text-muted);">
      AP3X SIMULATION v2.0
    </div>
  `;
  return bar;
}

// ─────────────────────────────────────────────
// HERO — Main control section
// ─────────────────────────────────────────────

function _buildHero(state) {
  const hero = document.createElement("div");
  hero.className = "ap3x-demo-hero";

  hero.innerHTML = `
    <div class="ap3x-demo-hero__eyebrow">Live Simulation Controller</div>
    <div class="ap3x-demo-hero__title">
      AP3X <span>INTELLIGENT EMERGENCY</span><br>RESPONSE SIMULATION
    </div>
    <div class="ap3x-demo-hero__sub">
      A real-time adaptive simulation platform with AI-driven incident generation,
      cross-device coordination, and live operational dashboard behaviour.
    </div>
  `;

  const controls = document.createElement("div");
  controls.className = "ap3x-demo-hero__controls";

  if (!state.running) {
    // Speed control
    const speedWrap = document.createElement("div");
    speedWrap.className = "ap3x-speed-control";
    speedWrap.innerHTML = `
      <span>Incident Rate:</span>
      <input type="range" id="speed-slider" min="5" max="30" step="1" value="${_incidentInterval}" />
      <span id="speed-label">${_incidentInterval}s</span>
    `;
    controls.appendChild(speedWrap);

    const startBtn = document.createElement("button");
    startBtn.className = "ap3x-btn ap3x-btn--primary";
    startBtn.style.padding = "12px 32px; font-size: 0.9rem;";
    startBtn.innerHTML = "▶ &nbsp;Start Simulation";
    startBtn.onclick = () => {
      const slider = document.getElementById("speed-slider");
      const interval = slider ? parseInt(slider.value) : _incidentInterval;
      startSimulation({ incidentIntervalSec: interval });
    };
    controls.appendChild(startBtn);

    // Bind slider
    setTimeout(() => {
      const slider = document.getElementById("speed-slider");
      const label = document.getElementById("speed-label");
      if (slider && label) {
        slider.oninput = () => {
          _incidentInterval = parseInt(slider.value);
          label.textContent = `${_incidentInterval}s`;
        };
      }
    }, 0);
  } else {
    const pauseBtn = document.createElement("button");
    pauseBtn.className = `ap3x-btn ap3x-btn--${state.paused ? "primary" : "amber"}`;
    pauseBtn.style.padding = "12px 24px";
    pauseBtn.innerHTML = state.paused ? "▶ Resume" : "⏸ Pause";
    pauseBtn.onclick = pauseSimulation;
    controls.appendChild(pauseBtn);

    const resetBtn = document.createElement("button");
    resetBtn.className = "ap3x-btn ap3x-btn--ghost";
    resetBtn.innerHTML = "↺ Reset";
    resetBtn.onclick = () => {
      if (confirm("Reset simulation? All data will be cleared.")) resetSimulation();
    };
    controls.appendChild(resetBtn);

    const watchBtn = document.createElement("button");
    watchBtn.className = `ap3x-btn ap3x-btn--${_watchMode ? "danger" : "ghost"}`;
    watchBtn.innerHTML = _watchMode ? "✕ Exit Watch Mode" : "👁 Watch System Live";
    watchBtn.onclick = () => { _watchMode = !_watchMode; _render(); };
    controls.appendChild(watchBtn);
  }

  const statusInfo = document.createElement("div");
  statusInfo.className = "ap3x-demo-hero__status";
  statusInfo.innerHTML = `
    <div class="ap3x-topbar__indicator ${state.running && !state.paused ? "" : "standby"}" style="width:6px;height:6px;"></div>
    ${state.running ? (state.paused ? "SIMULATION PAUSED" : `SIMULATION RUNNING — ${state.incidents.filter(i => i.status !== "resolved").length} active incident${state.incidents.filter(i=>i.status!=="resolved").length !== 1 ? "s" : ""}`) : "SIMULATION READY"}
  `;
  controls.appendChild(statusInfo);

  hero.appendChild(controls);
  return hero;
}

// ─────────────────────────────────────────────
// LIVE OVERVIEW CARDS
// ─────────────────────────────────────────────

function _buildLiveCards(state) {
  const grid = document.createElement("div");
  grid.className = "ap3x-live-cards";

  const cards = [
    {
      icon: "🔴",
      value: state.stats.active,
      label: "Active Incidents",
      color: state.stats.active > 0 ? "amber" : "blue",
      pulse: false
    },
    {
      icon: "⚠️",
      value: state.stats.critical,
      label: "Critical",
      color: state.stats.critical > 0 ? "red" : "blue",
      pulse: state.stats.critical > 0
    },
    {
      icon: "✅",
      value: state.stats.resolved,
      label: "Resolved",
      color: "green"
    },
    {
      icon: "🚗",
      value: state.drivers.filter(d => d.status !== "available").length,
      label: "Units Deployed",
      color: "blue"
    },
    {
      icon: "🟢",
      value: state.drivers.filter(d => d.status === "available").length,
      label: "Units Available",
      color: "green"
    },
    {
      icon: "🤖",
      value: state.aiMessages.length,
      label: "AI Responses",
      color: "purple"
    }
  ];

  cards.forEach(({ icon, value, label, color, pulse }) => {
    const card = document.createElement("div");
    card.className = `ap3x-live-card ${color}${pulse ? " pulse" : ""}`;
    card.innerHTML = `
      <div class="ap3x-live-card__icon">${icon}</div>
      <div class="ap3x-live-card__value">${value}</div>
      <div class="ap3x-live-card__label">${label}</div>
    `;
    grid.appendChild(card);
  });

  return grid;
}

// ─────────────────────────────────────────────
// MAIN GRID
// ─────────────────────────────────────────────

function _buildMainGrid(state) {
  if (_watchMode) {
    return _buildWatchMode(state);
  }

  const grid = document.createElement("div");
  grid.className = "ap3x-demo-grid";

  // Left: Incident Feed
  grid.appendChild(_buildDemoIncidentFeed(state));

  // Middle: Driver Status
  grid.appendChild(_buildDemoDriverFeed(state));

  // Right: AI + Events
  grid.appendChild(_buildDemoRightPanel(state));

  return grid;
}

// ─────────────────────────────────────────────
// WATCH MODE — Full-screen live view
// ─────────────────────────────────────────────

function _buildWatchMode(state) {
  const wrap = document.createElement("div");
  wrap.className = "ap3x-panel";

  const header = document.createElement("div");
  header.className = "ap3x-watch-live__header";
  header.innerHTML = `
    <div class="ap3x-watch-live__title">
      <div class="ap3x-live-dot"></div>
      WATCH SYSTEM LIVE — Real-Time Simulation Stream
    </div>
    <span style="font-size:0.65rem;color:var(--ap3x-text-muted)">SIMULATION ONLY</span>
  `;
  wrap.appendChild(header);

  const body = document.createElement("div");
  body.className = "ap3x-watch-mode-content";

  // Show the full rolling event log as "watch mode"
  const events = state.events.slice(0, 60);

  if (!events.length) {
    body.innerHTML = `<div class="ap3x-empty"><div class="ap3x-empty__icon">📡</div><div>Waiting for events…</div></div>`;
  } else {
    events.forEach((ev, i) => {
      const item = document.createElement("div");
      item.className = "ap3x-event";
      item.style.animationDelay = `${i * 0.02}s`;
      item.innerHTML = `
        <span class="ap3x-event__time">${formatTimestamp(ev.timestamp)}</span>
        <span class="ap3x-event__tag ${ev.tag}">${ev.tag}</span>
        <span class="ap3x-event__msg">${ev.message}</span>
      `;
      body.appendChild(item);
    });
  }

  wrap.appendChild(body);
  return wrap;
}

// ─────────────────────────────────────────────
// DEMO INCIDENT FEED
// ─────────────────────────────────────────────

function _buildDemoIncidentFeed(state) {
  const panel = document.createElement("div");
  panel.className = "ap3x-watch-live";

  const header = document.createElement("div");
  header.className = "ap3x-watch-live__header";
  header.innerHTML = `
    <div class="ap3x-watch-live__title">
      ${state.running && !state.paused ? '<div class="ap3x-live-dot"></div>' : ""}
      Incident Feed
    </div>
    <span style="font-size:0.68rem;font-family:var(--font-mono);color:var(--ap3x-text-muted)">${state.incidents.length} total</span>
  `;
  panel.appendChild(header);

  const body = document.createElement("div");
  body.className = "ap3x-watch-mode-content";

  const active = state.incidents.filter(i => i.status !== "resolved");
  const resolved = state.incidents.filter(i => i.status === "resolved");
  const display = [...active, ...resolved].slice(0, 20);

  if (!display.length) {
    body.innerHTML = `<div class="ap3x-empty"><div class="ap3x-empty__icon">📡</div><div>Awaiting first incident…</div></div>`;
  } else {
    display.forEach(inc => {
      const item = document.createElement("div");
      item.className = "ap3x-incident";
      item.innerHTML = `
        <div class="ap3x-incident__sev ${severityClass(inc.severity)}"></div>
        <div class="ap3x-incident__body">
          <div class="ap3x-incident__type">${inc.type}</div>
          <div class="ap3x-incident__meta">📍 ${inc.location}</div>
          <div class="ap3x-incident__id">${inc.incident_id} · ${formatTimestamp(inc.created_at)}</div>
        </div>
        <div class="ap3x-incident__right">
          <span class="ap3x-badge ${severityClass(inc.severity)}">${inc.severity}</span>
          <span class="ap3x-badge ${statusClass(inc.status)}">${inc.status.replace(/_/g," ")}</span>
        </div>
      `;
      body.appendChild(item);
    });
  }

  panel.appendChild(body);
  return panel;
}

// ─────────────────────────────────────────────
// DEMO DRIVER FEED
// ─────────────────────────────────────────────

function _buildDemoDriverFeed(state) {
  const panel = document.createElement("div");
  panel.className = "ap3x-watch-live";

  const header = document.createElement("div");
  header.className = "ap3x-watch-live__header";
  header.innerHTML = `
    <div class="ap3x-watch-live__title">
      ${state.running && !state.paused ? '<div class="ap3x-live-dot"></div>' : ""}
      Unit Status
    </div>
    <span style="font-size:0.68rem;color:var(--ap3x-green);font-family:var(--font-mono)">${state.drivers.filter(d=>d.status==="available").length} available</span>
  `;
  panel.appendChild(header);

  const body = document.createElement("div");
  body.className = "ap3x-watch-mode-content";

  if (!state.drivers.length) {
    body.innerHTML = `<div class="ap3x-empty"><div class="ap3x-empty__icon">🚗</div><div>Start simulation to deploy units</div></div>`;
  } else {
    state.drivers.forEach(driver => {
      const item = document.createElement("div");
      item.className = `ap3x-driver ${driver.status}`;
      item.style.marginBottom = "6px";
      item.innerHTML = `
        <div class="ap3x-driver__indicator ${driver.status}"></div>
        <div style="flex:1;">
          <div class="ap3x-driver__name" style="font-size:0.75rem;">${driver.name}</div>
          <div class="ap3x-driver__meta">
            ${driver.status.replace(/_/g," ")}
            ${driver.incident_id ? ` · <span style="font-family:var(--font-mono);font-size:0.62rem;">${driver.incident_id}</span>` : ""}
          </div>
        </div>
        <span class="ap3x-badge ${driver.status === 'en_route' ? 'en_route' : driver.status === 'on_scene' ? 'on_scene' : driver.status === 'assigned' ? 'assigned' : 'available'}">${driver.status.replace(/_/g," ")}</span>
      `;
      body.appendChild(item);
    });
  }

  panel.appendChild(body);
  return panel;
}

// ─────────────────────────────────────────────
// RIGHT PANEL — AI + Events
// ─────────────────────────────────────────────

function _buildDemoRightPanel(state) {
  const wrap = document.createElement("div");
  wrap.style.cssText = "display:flex;flex-direction:column;gap:var(--sp-md);";

  // AI Messages
  const aiPanel = document.createElement("div");
  aiPanel.className = "ap3x-watch-live";

  const aiHeader = document.createElement("div");
  aiHeader.className = "ap3x-watch-live__header";
  aiHeader.innerHTML = `
    <div class="ap3x-watch-live__title" style="color:var(--ap3x-purple)">
      ${state.running && !state.paused ? '<div class="ap3x-live-dot" style="background:var(--ap3x-purple);"></div>' : ""}
      AP3X RIE
    </div>
    <span style="font-size:0.6rem;color:var(--ap3x-text-muted);">AI ENGINE</span>
  `;
  aiPanel.appendChild(aiHeader);

  const aiBody = document.createElement("div");
  aiBody.className = "ap3x-watch-mode-content";

  const msgs = state.aiMessages.slice(0, 5);
  if (!msgs.length) {
    aiBody.innerHTML = `<div class="ap3x-empty" style="padding:var(--sp-md)"><div class="ap3x-empty__icon">🧠</div><div>AI engine online</div></div>`;
  } else {
    msgs.forEach(msg => {
      const item = document.createElement("div");
      item.className = "ap3x-ai-message";
      item.innerHTML = `
        <div class="ap3x-ai-message__label">AP3X RIE</div>
        <div class="ap3x-ai-message__text">${msg.message}</div>
        <div class="ap3x-ai-message__time">${formatTimestamp(msg.timestamp)}</div>
      `;
      aiBody.appendChild(item);
    });
  }
  aiPanel.appendChild(aiBody);
  wrap.appendChild(aiPanel);

  // Event log
  const evPanel = document.createElement("div");
  evPanel.className = "ap3x-watch-live";

  const evHeader = document.createElement("div");
  evHeader.className = "ap3x-watch-live__header";
  evHeader.innerHTML = `
    <div class="ap3x-watch-live__title">
      ${state.running && !state.paused ? '<div class="ap3x-live-dot"></div>' : ""}
      Event Stream
    </div>
    <span style="font-family:var(--font-mono);font-size:0.65rem;color:var(--ap3x-text-muted);">${state.events.length}</span>
  `;
  evPanel.appendChild(evHeader);

  const evBody = document.createElement("div");
  evBody.className = "ap3x-watch-mode-content";

  const events = state.events.slice(0, 15);
  if (!events.length) {
    evBody.innerHTML = `<div class="ap3x-empty" style="padding:var(--sp-md)"><div>No events yet</div></div>`;
  } else {
    events.forEach(ev => {
      const item = document.createElement("div");
      item.className = "ap3x-event";
      item.innerHTML = `
        <span class="ap3x-event__time">${formatTimestamp(ev.timestamp)}</span>
        <span class="ap3x-event__tag ${ev.tag}">${ev.tag}</span>
        <span class="ap3x-event__msg">${ev.message}</span>
      `;
      evBody.appendChild(item);
    });
  }
  evPanel.appendChild(evBody);
  wrap.appendChild(evPanel);

  return wrap;
}

// ─────────────────────────────────────────────
// SYSTEM LINKS
// ─────────────────────────────────────────────

function _buildSystemLinks() {
  const wrap = document.createElement("div");

  const title = document.createElement("div");
  title.className = "ap3x-section-title";
  title.style.marginBottom = "var(--sp-sm)";
  title.textContent = "System Access";
  wrap.appendChild(title);

  const grid = document.createElement("div");
  grid.className = "ap3x-system-links";

  const systems = [
    {
      href: "../control-os/index.html",
      icon: "🖥️",
      title: "Control OS",
      desc: "AP3X Emergency Response Command Centre — full dashboard with live incident feed, unit grid, AI panel, and timeline"
    },
    {
      href: "../driver-pwa/index.html",
      icon: "📱",
      title: "Driver Interface",
      desc: "AP3X Driver PWA — mobile-first response workflow, task assignment, step-by-step navigation and AI guidance"
    }
  ];

  systems.forEach(({ href, icon, title, desc }) => {
    const link = document.createElement("a");
    link.className = "ap3x-system-link";
    link.href = href;
    link.innerHTML = `
      <div class="ap3x-system-link__icon">${icon}</div>
      <div class="ap3x-system-link__title">${title}</div>
      <div class="ap3x-system-link__desc">${desc}</div>
      <div class="ap3x-system-link__arrow">Open system →</div>
    `;
    grid.appendChild(link);
  });

  wrap.appendChild(grid);
  return wrap;
}

// ─────────────────────────────────────────────
// DISCLAIMER
// ─────────────────────────────────────────────

function _buildDisclaimer() {
  const d = document.createElement("div");
  d.className = "ap3x-disclaimer";
  d.style.marginTop = "var(--sp-sm)";
  d.innerHTML = `
    ⚠️ <strong>SIMULATION ONLY</strong> — AP3X is a training and demonstration platform.
    This is not a real emergency response system. No operational authority.
    No real emergency instructions. For educational and showcase purposes only.
  `;
  return d;
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function _getTime() {
  return new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
