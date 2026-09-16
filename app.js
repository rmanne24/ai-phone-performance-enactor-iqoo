/**
 * KATSU // AI Phone Performance Enactor (iQOO 13 Flagship Edition)
 * Mobile-First Multi-Slide Navigation, Real-Time Dual-Mode ML,
 * Telemetry Simulation, and Live Session Stream.
 */

// Games Catalog
let games = [
  {
    name: 'Genshin Impact',
    spec: 'HIGH GPU · 5.2 GB RAM',
    color: '#6257ff',
    badge: 'DEMANDING',
    app_ram_gb: 5.2,
    app_storage_gb: 28.0,
    app_gpu_intensity: 0.94,
    app_cpu_intensity: 0.88,
    target_fps: 60,
    score: 74,
    fps: '48–60 FPS',
    verdict: 'PLAYABLE WITH CARE',
    title: 'Strong start. Watch the heat.',
    copy: 'You have enough power for a smooth session, but prolonged play may create thermal pressure.',
    ai: 'Your iQOO 13 can run Genshin Impact comfortably right now. Memory headroom is healthy, but the current 39°C device temperature means sustained high settings could cause a small FPS dip after 40 minutes.',
    gain: 8,
  },
  {
    name: 'Call of Duty: Mobile',
    spec: 'HIGH GPU · 3.8 GB RAM',
    color: '#ff783d',
    badge: 'COMPETITIVE',
    app_ram_gb: 3.8,
    app_storage_gb: 14.0,
    app_gpu_intensity: 0.72,
    app_cpu_intensity: 0.65,
    target_fps: 120,
    score: 89,
    fps: '90–120 FPS',
    verdict: 'OPTIMAL',
    title: 'Locked in for the win.',
    copy: 'Your device has excellent headroom for a responsive, high-frame-rate session.',
    ai: 'Your iQOO 13 is in an excellent state for Call of Duty: Mobile. The performance model predicts stable high refresh gameplay with a low thermal risk for the next hour.',
    gain: 4,
  },
  {
    name: 'Honkai: Star Rail',
    spec: 'HIGH GPU · 4.6 GB RAM',
    color: '#ed60b2',
    badge: 'DEMANDING',
    app_ram_gb: 4.6,
    app_storage_gb: 22.0,
    app_gpu_intensity: 0.86,
    app_cpu_intensity: 0.78,
    target_fps: 60,
    score: 76,
    fps: '52–60 FPS',
    verdict: 'PLAYABLE WITH CARE',
    title: 'Ready with room to breathe.',
    copy: 'A smooth experience is expected, with slight pressure during extended play.',
    ai: 'Honkai: Star Rail will run well now. Closing nonessential apps creates more memory headroom and helps keep your session smooth after the first 30 minutes.',
    gain: 6,
  },
  {
    name: 'PUBG Mobile',
    spec: 'MEDIUM GPU · 3.1 GB RAM',
    color: '#ffca52',
    badge: 'COMPETITIVE',
    app_ram_gb: 3.1,
    app_storage_gb: 12.0,
    app_gpu_intensity: 0.60,
    app_cpu_intensity: 0.58,
    target_fps: 90,
    score: 92,
    fps: '88–90 FPS',
    verdict: 'OPTIMAL',
    title: 'Battle-ready conditions.',
    copy: 'Thermals and memory are both in the ideal range for high frame-rate play.',
    ai: 'Your current device state is ideal for PUBG Mobile. KATSU expects stable frame pacing, low heat build-up, and plenty of battery headroom.',
    gain: 3,
  },
  {
    name: 'Wuthering Waves',
    spec: 'VERY HIGH GPU · 5.8 GB RAM',
    color: '#6ce1da',
    badge: 'EXTREME',
    app_ram_gb: 5.8,
    app_storage_gb: 26.0,
    app_gpu_intensity: 0.98,
    app_cpu_intensity: 0.92,
    target_fps: 60,
    score: 65,
    fps: '42–55 FPS',
    verdict: 'LIMITED HEADROOM',
    title: 'Powerful, but demanding.',
    copy: 'The game is supported, but high settings will push your current thermal envelope.',
    ai: 'Wuthering Waves is one of the most demanding workloads on your device. Lowering shadows to medium and optimizing first will give you the best sustained result.',
    gain: 10,
  },
  {
    name: 'Asphalt Legends',
    spec: 'MEDIUM GPU · 2.4 GB RAM',
    color: '#7e97ff',
    badge: 'ARCADE',
    app_ram_gb: 2.4,
    app_storage_gb: 6.5,
    app_gpu_intensity: 0.52,
    app_cpu_intensity: 0.45,
    target_fps: 90,
    score: 95,
    fps: '90 FPS',
    verdict: 'OPTIMAL',
    title: 'Smooth road ahead.',
    copy: 'This workload sits comfortably within your device’s current performance window.',
    ai: 'Asphalt Legends is a perfect match for the current state of your iQOO 13. Expect a fluid session with minimal battery and thermal impact.',
    gain: 2,
  },
];

// Telemetry State
const deviceTelemetry = {
  ram_gb: 12.0,
  ram_used_percent: 47.0,
  storage_used_percent: 74.0,
  temperature_c: 39.0,
  battery_percent: 78.0,
  is_charging: true,
  is_optimized: false,
};

let selected = games[0];
let optimized = false;
let sessionTimer = null;
let isSessionActive = false;
let liveFpsHistory = [54, 56, 55, 58, 57, 59, 58, 60, 58, 59, 57, 58];
let backendAvailable = false;
const BACKEND_URL = 'http://127.0.0.1:8000';

// Helpers
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

let toastTimer = null;
function toast(msg) {
  const t = $('#toast');
  if (!t) return;
  if (toastTimer) {
    clearTimeout(toastTimer);
    toastTimer = null;
  }
  t.textContent = msg;
  t.classList.add('show');
  toastTimer = setTimeout(() => {
    t.classList.remove('show');
    toastTimer = null;
  }, 2600);
}

function updateSessionDisplay() {
  const idle = $('#sessionIdleState');
  const active = $('#sessionActiveState');
  if (!idle || !active) return;
  if (isSessionActive) {
    idle.style.display = 'none';
    active.style.display = 'block';
  } else {
    idle.style.display = 'flex';
    active.style.display = 'none';
  }
}

// Render Lucide SVG icons inside a container (called after any innerHTML change)
function renderIcons(scope) {
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons(scope ? { attrs: {}, nameAttr: 'data-lucide' } : undefined);
  }
}
renderIcons();

// Navigation between major views (Dashboard, Analyze, Results, Session, History)
function show(id) {
  $$('.view').forEach((v) => v.classList.remove('active'));
  const target = $('#' + id);
  if (target) {
    target.classList.add('active');
    const viewport = $('.phone-screen-viewport');
    if (viewport) viewport.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Update bottom dock active state
  $$('.dock-item').forEach((item) => {
    item.classList.toggle('active', item.dataset.nav === id);
  });

  if (id === 'session') {
    updateSessionDisplay();
  }
}

// Multi-slide switching inside views
function switchSubSlide(slideId) {
  const targetSlide = $('#' + slideId);
  if (!targetSlide) return;

  const parentView = targetSlide.closest('.view');
  if (!parentView) return;

  // Toggle sub-slides inside this parent view
  parentView.querySelectorAll('.sub-slide').forEach((s) => s.classList.remove('active'));
  targetSlide.classList.add('active');

  // Update slide pills in this parent view
  parentView.querySelectorAll('.slide-pill').forEach((pill) => {
    pill.classList.toggle('active', pill.dataset.slideBtn === slideId);
  });

  const viewport = $('.phone-screen-viewport');
  if (viewport) viewport.scrollTo({ top: 0, behavior: 'smooth' });
}

// Wire Slide Switcher Buttons
function setupSlideButtons() {
  $$('[data-slide-btn]').forEach((btn) => {
    btn.onclick = () => {
      switchSubSlide(btn.dataset.slideBtn);
    };
  });
}

// Clock updates
function updateClock() {
  const now = new Date();
  const hrs = String(now.getHours()).padStart(2, '0');
  const mins = String(now.getMinutes()).padStart(2, '0');
  const el = $('#clockDisplay');
  if (el) el.textContent = `${hrs}:${mins}`;
}
setInterval(updateClock, 10000);
updateClock();

// Backend Health Check
async function checkBackend() {
  try {
    const res = await fetch(`${BACKEND_URL}/health`, { method: 'GET' });
    if (res.ok) {
      const data = await res.json();
      backendAvailable = true;
      const el = $('#backendStatus');
      if (el) {
        el.classList.remove('inactive');
        el.innerHTML = '<span class="pulse-dot"></span> ACTIVE';
        el.title = `Trained model loaded: ${data.model_type} (R²: ${data.metrics?.score_r2 || 0.96})`;
      }
      return;
    }
  } catch (e) {
    // Offline mode
  }
  backendAvailable = false;
  const el = $('#backendStatus');
  if (el) {
    el.classList.add('inactive');
    el.innerHTML = '<span class="pulse-dot" style="background:var(--danger);box-shadow:0 0 8px var(--danger)"></span> INACTIVE';
    el.title = 'Backend unavailable. Operating in fallback on-device mode.';
  }
}
checkBackend();

// On-Device ML Inference Engine
function computeOnDevicePrediction(game, telemetry, isOpt) {
  const effectiveTemp = isOpt ? Math.max(35.5, telemetry.temperature_c - 1.6) : telemetry.temperature_c;
  const effectiveRamPct = isOpt ? telemetry.ram_used_percent * 0.72 : telemetry.ram_used_percent;
  const availRam = telemetry.ram_gb * (1.0 - effectiveRamPct / 100.0);
  const ramMargin = availRam - game.app_ram_gb;

  let score = 96.0;
  if (ramMargin < 0) {
    score -= Math.abs(ramMargin) * 14.0;
  } else if (ramMargin < 1.2) {
    score -= (1.2 - ramMargin) * 7.5;
  }

  if (effectiveTemp > 41.5) {
    score -= (effectiveTemp - 41.5) * 8.0 + 10.0;
  } else if (effectiveTemp > 38.0) {
    score -= (effectiveTemp - 38.0) * 3.8;
  }

  if (telemetry.battery_percent < 20) {
    score -= (20 - telemetry.battery_percent) * 0.7;
  }

  const workloadPenalty = (game.app_gpu_intensity * 0.6 + game.app_cpu_intensity * 0.4) * 12.0;
  score -= workloadPenalty;

  if (isOpt) {
    score += game.gain;
  }

  const finalScore = Math.min(99, Math.max(18, Math.round(score)));
  const fpsRatio = finalScore / 100.0;
  const targetFps = game.target_fps || 60;
  const predFps = Math.round(Math.min(targetFps, targetFps * (0.58 + 0.42 * fpsRatio)));

  let fpsMin = Math.max(30, predFps - (targetFps >= 90 ? 12 : 7));
  let fpsMax = Math.min(targetFps, predFps + 2);
  if (isOpt) {
    fpsMin += Math.round(game.gain * 0.7);
    fpsMax = Math.min(targetFps, fpsMax + Math.round(game.gain * 0.4));
  }

  const thermalRisk = effectiveTemp >= 41.5 ? 'HIGH' : effectiveTemp >= 37.5 ? 'MEDIUM' : 'LOW';
  const batteryImpact = game.app_gpu_intensity >= 0.85 ? 'HIGH' : game.app_gpu_intensity >= 0.6 ? 'MEDIUM' : 'LOW';
  const ramPressure = availRam < game.app_ram_gb ? 'HIGH' : availRam < game.app_ram_gb + 1.2 ? 'MEDIUM' : 'LOW';

  let verdict = 'OPTIMAL';
  let title = 'Locked in for the win.';
  let copy = 'Your device has excellent headroom for a responsive, high-frame-rate session.';

  if (finalScore < 70) {
    verdict = 'LIMITED HEADROOM';
    title = 'High thermal stress predicted.';
    copy = 'Extended play will cause thermal throttling. We recommend optimizing before starting.';
  } else if (finalScore < 88) {
    verdict = isOpt ? 'OPTIMIZED FOR PLAY' : 'PLAYABLE WITH CARE';
    title = isOpt ? 'Clear the runway. You’re set.' : 'Strong start. Watch the heat.';
    copy = isOpt
      ? `Game Mode is active and background load is reduced. Stability increased by +${game.gain} pts.`
      : 'You have enough power for a smooth session, but prolonged play may create thermal pressure.';
  }

  const explanation = isOpt
    ? `KATSU has created additional headroom for ${game.name}. Background tasks are cleared and Monster Mode cooling is active, maintaining stable frame pacing for the next hour.`
    : `Your iQOO 13 can run ${game.name} ${finalScore >= 85 ? 'exceptionally well' : 'comfortably'} right now. Current device temperature (${effectiveTemp.toFixed(1)}°C) and memory margin indicate ${thermalRisk === 'HIGH' ? 'potential throttling after 25–30 minutes' : 'stable pacing with low thermal resistance'}.`;

  return {
    performance_score: finalScore,
    verdict_label: verdict,
    verdict_title: title,
    verdict_copy: copy,
    fps_range: `${fpsMin}–${fpsMax} FPS`,
    fps_min: fpsMin,
    fps_max: fpsMax,
    thermal_risk: thermalRisk,
    battery_impact: batteryImpact,
    ram_pressure: ramPressure,
    ai_explanation: explanation,
    confidence_score: 94,
    gain: game.gain,
  };
}

// Render Games Grid
function renderGames() {
  const grid = $('#gameGrid');
  if (!grid) return;
  grid.innerHTML = games
    .map(
      (g, i) => `
      <button class="game ${g === selected ? 'selected' : ''}" style="--game:${g.color}" data-i="${i}">
        <div class="game-art"></div>
        <div class="game-content">
          <span class="badge">${g.badge}</span>
          <h3>${g.name}</h3>
          <p>${g.spec}</p>
        </div>
      </button>`
    )
    .join('');

  $$('.game').forEach((x) => {
    x.onclick = () => {
      selected = games[x.dataset.i];
      optimized = false;
      renderGames();
      updateSelection();
    };
  });
  renderIcons(grid);
}

function updateSelection() {
  if (!$('#selectedName')) return;
  $('#selectedName').textContent = selected.name;
  $('#selectedSpecs').textContent = selected.spec;
}

// Risk Card Helper
function risk(title, state, text, color) {
  return `
    <article class="risk card">
      <span>${title}</span>
      <h3><i style="background:${color}"></i>${state}</h3>
      <p>${text}</p>
    </article>`;
}

// Calculate and Update Dashboard Metrics
function updateDashboardMetrics() {
  const ramUsedGb = ((deviceTelemetry.ram_gb * deviceTelemetry.ram_used_percent) / 100).toFixed(1);
  $('#ramText').textContent = `${ramUsedGb} / ${deviceTelemetry.ram_gb} GB`;
  $('#ramBar').style.width = `${deviceTelemetry.ram_used_percent}%`;

  $('#batteryText').textContent = `${Math.round(deviceTelemetry.battery_percent)}%`;
  const statusBat = $('#statusBattery');
  if (statusBat) statusBat.textContent = `${Math.round(deviceTelemetry.battery_percent)}%`;
  $('#tempText').innerHTML = `${deviceTelemetry.temperature_c.toFixed(1)}°C <i class="temp-ok" style="background:${deviceTelemetry.temperature_c > 41 ? '#ff5e5b' : '#b8ff58'}"></i>`;

  let readiness = 98 - (deviceTelemetry.temperature_c - 30) * 2.2 - (deviceTelemetry.ram_used_percent - 30) * 0.45;
  if (deviceTelemetry.battery_percent < 30) readiness -= (30 - deviceTelemetry.battery_percent) * 0.5;
  if (deviceTelemetry.is_optimized) readiness += 7;

  readiness = Math.min(99, Math.max(25, Math.round(readiness)));

  $('#readinessScore').textContent = readiness;
  const ring = $('#readinessRing');
  if (ring) {
    const col = readiness >= 80 ? '#b8ff58' : readiness >= 65 ? '#ffb25b' : '#ff5e5b';
    ring.style.background = `radial-gradient(circle at center, #101d30 58%, transparent 59%), conic-gradient(${col} 0 ${readiness}%, #26384e ${readiness}%)`;
  }

  if (readiness >= 80) {
    $('#readinessTitle').textContent = 'Ready to play';
    $('#readinessSub').textContent = 'Performance conditions are stable.';
    $('#tagThermal').textContent = 'THERMAL SAFE';
    $('#tagThermal').style.color = '#b8ff58';
    $('#tagMemory').textContent = 'MEMORY CLEAR';
    $('#tagMemory').style.color = '#b8ff58';
  } else if (readiness >= 65) {
    $('#readinessTitle').textContent = 'Moderate load';
    $('#readinessSub').textContent = 'Consider clearing memory before play.';
    $('#tagThermal').textContent = 'WARM HEADROOM';
    $('#tagThermal').style.color = '#ffb25b';
    $('#tagMemory').textContent = 'ELEVATED RAM';
    $('#tagMemory').style.color = '#ffb25b';
  } else {
    $('#readinessTitle').textContent = 'High thermal stress';
    $('#readinessSub').textContent = 'Device is hot. Throttling is likely.';
    $('#tagThermal').textContent = 'THROTTLE RISK';
    $('#tagThermal').style.color = '#ff5e5b';
    $('#tagMemory').textContent = 'RAM PRESSURE';
    $('#tagMemory').style.color = '#ff5e5b';
  }

  const playtimeMins = Math.round((deviceTelemetry.battery_percent / 100) * 165);
  const hrs = Math.floor(playtimeMins / 60);
  const mins = playtimeMins % 60;
  $('#intelPlaytime').textContent = `${hrs}h ${mins}m of playtime`;
  $('#intelThermal').textContent = deviceTelemetry.temperature_c > 41 ? 'Throttling in <15 mins' : 'Stable for 42 mins';
}

// Prediction & Results Display
async function renderResult() {
  $('#resultGame').textContent = selected.name.toUpperCase();

  let predictionData = null;

  if (backendAvailable) {
    try {
      const resp = await fetch(`${BACKEND_URL}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ram_gb: deviceTelemetry.ram_gb,
          ram_used_percent: deviceTelemetry.ram_used_percent,
          storage_used_percent: deviceTelemetry.storage_used_percent,
          temperature_c: deviceTelemetry.temperature_c,
          battery_percent: deviceTelemetry.battery_percent,
          app_name: selected.name,
          app_ram_gb: selected.app_ram_gb,
          app_storage_gb: selected.app_storage_gb || 20.0,
          app_gpu_intensity: selected.app_gpu_intensity || 0.85,
          app_cpu_intensity: selected.app_cpu_intensity || 0.8,
          target_fps: selected.target_fps || 60,
          is_optimized: optimized,
        }),
      });
      if (resp.ok) {
        predictionData = await resp.json();
      }
    } catch (e) {
      console.warn('Backend call failed, using on-device ML model', e);
    }
  }

  if (!predictionData) {
    predictionData = computeOnDevicePrediction(selected, deviceTelemetry, optimized);
  }

  const s = predictionData.performance_score ?? predictionData.score ?? 80;
  $('#performanceScore').textContent = s;
  $('#verdictLabel').textContent = predictionData.verdict_label ?? predictionData.verdict ?? 'PLAYABLE';
  $('#verdictTitle').textContent = predictionData.verdict_title ?? predictionData.title ?? '';
  $('#verdictCopy').textContent = predictionData.verdict_copy ?? predictionData.copy ?? '';
  $('#aiText').textContent = predictionData.ai_explanation ?? predictionData.ai_rationale ?? '';
  $('#fpsText').textContent = predictionData.fps_range ?? predictionData.estimatedFrameRate ?? `${Math.max(30, Math.round(s * 0.65))}–${Math.round(s * 0.75)} FPS`;

  const trackWidth = Math.min(100, Math.max(30, s));
  $('#fpsTrackBar').style.width = `${trackWidth}%`;

  $('#optimizeCopy').textContent = optimized
    ? 'Game Mode is active. KATSU has cleared 3 background processes and is prioritizing this session.'
    : `Close 3 background processes and activate Game Mode to gain an estimated ${selected.gain} FPS.`;
  $('#optimizeBtn').textContent = optimized ? '✓ PHONE OPTIMIZED' : 'OPTIMIZE FOR ME →';

  const tRisk = predictionData.thermal_risk || (s > 82 ? 'LOW' : s > 68 ? 'MEDIUM' : 'HIGH');
  const bImpact = predictionData.battery_impact || (s > 80 ? 'LOW' : 'MEDIUM');
  const rPressure = predictionData.ram_pressure || (s > 78 ? 'LOW' : 'MEDIUM');

  $('#risks').innerHTML =
    risk(
      'THERMAL RISK',
      tRisk,
      tRisk === 'LOW'
        ? 'Thermals remain comfortably stable.'
        : tRisk === 'MEDIUM'
        ? 'Heat may rise during sustained play.'
        : 'High thermal throttling risk.',
      tRisk === 'LOW' ? '#b8ff58' : tRisk === 'MEDIUM' ? '#ffb25b' : '#ff5e5b'
    ) +
    risk(
      'BATTERY IMPACT',
      bImpact,
      bImpact === 'LOW' ? 'Efficient workload.' : 'Expect roughly 17% per hr.',
      bImpact === 'LOW' ? '#b8ff58' : '#9e7aff'
    ) +
    risk(
      'RAM PRESSURE',
      rPressure,
      rPressure === 'LOW' ? 'Healthy headroom.' : 'Close background apps.',
      rPressure === 'LOW' ? '#b8ff58' : '#ffb25b'
    ) +
    risk('NETWORK COST', '1.3 GB / HR', 'Wi‑Fi recommended.', '#ffb25b');

  renderIcons($('#risks'));

  $('#featThermalVal').textContent = `${deviceTelemetry.temperature_c > 40 ? '−34.0%' : '−26.0%'}`;
  $('#featThermalDesc').textContent = `Device temp is ${deviceTelemetry.temperature_c.toFixed(1)}°C (throttle begins at 41.5°C).`;
  $('#featRamVal').textContent = `${deviceTelemetry.ram_used_percent > 65 ? '−24.5%' : '−18.0%'}`;
  $('#featRamDesc').textContent = `RAM allocation is at ${deviceTelemetry.ram_used_percent}%.`;
}

// Live Session Chart Streaming
function updateLiveChart(newFps) {
  liveFpsHistory.push(newFps);
  if (liveFpsHistory.length > 16) {
    liveFpsHistory.shift();
  }

  const minFps = 30;
  const maxFps = 90;
  const svgWidth = 800;
  const svgHeight = 180;
  const step = svgWidth / (liveFpsHistory.length - 1);

  const points = liveFpsHistory.map((fps, i) => {
    const x = Math.round(i * step);
    const clamped = Math.max(minFps, Math.min(maxFps, fps));
    const normalized = (clamped - minFps) / (maxFps - minFps);
    const y = Math.round(svgHeight - normalized * (svgHeight - 35) - 15);
    return { x, y };
  });

  const lineD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ');
  const areaD = `${lineD} L${svgWidth} ${svgHeight} L0 ${svgHeight} Z`;

  const chartLine = $('#chartLine');
  const chartArea = $('#chartArea');
  if (chartLine) chartLine.setAttribute('d', lineD);
  if (chartArea) chartArea.setAttribute('d', areaD);

  const avg = Math.round(liveFpsHistory.reduce((a, b) => a + b, 0) / liveFpsHistory.length);
  const sorted = [...liveFpsHistory].sort((a, b) => a - b);
  const onePctLow = sorted[0];

  const label = $('#fpsAvgLabel');
  if (label) label.textContent = `AVG ${avg} FPS · 1% LOW ${onePctLow}`;
}

// Initial Setup
renderGames();
updateSelection();
updateDashboardMetrics();
setupSlideButtons();
updateSessionDisplay();

const startBtn = $('#startNewSessionBtn');
if (startBtn) {
  startBtn.onclick = () => {
    show('analyze');
    switchSubSlide('analyze-slide-1');
  };
}

// Wire Bottom Dock Navigation Items
$$('[data-nav]').forEach((btn) => {
  btn.onclick = () => {
    show(btn.dataset.nav);
  };
});

// Wire Header & Link Buttons
$$('[data-go]').forEach((b) => {
  b.onclick = () => {
    show(b.dataset.go);
  };
});

// Run Prediction
$('#runAnalysis').onclick = async () => {
  await renderResult();
  show('results');
  switchSubSlide('res-slide-1');
};

$('#runCustomAnalysis').onclick = async () => {
  await renderResult();
  show('results');
  switchSubSlide('res-slide-1');
};

// Optimize Button
$('#optimizeBtn').onclick = () => {
  if (!optimized) {
    optimized = true;
    deviceTelemetry.is_optimized = true;
    deviceTelemetry.ram_used_percent = Math.max(28, deviceTelemetry.ram_used_percent - 15);
    deviceTelemetry.temperature_c = Math.max(34, deviceTelemetry.temperature_c - 1.4);

    updateDashboardMetrics();
    renderResult();

    const badge = $('#monsterBadge');
    if (badge) {
      badge.style.background = '#284d1a';
      badge.style.borderColor = '#b8ff58';
      badge.textContent = 'MONSTER ACTIVE';
    }

    toast(`OPTIMIZATION COMPLETE · +${selected.gain} FPS ESTIMATED · 3 APPS CLEARED`);
  } else {
    toast('GAME MODE & MONSTER PROFILE ALREADY ACTIVE');
  }
};

// "Why This Result?" Modal
$('#whyBtn').onclick = () => {
  $('#explainModal').classList.add('show');
};
$('#explainClose').onclick = () => {
  $('#explainModal').classList.remove('show');
};
$('#explainDone').onclick = () => {
  $('#explainModal').classList.remove('show');
};

// Audio Speech Synthesis
$('#speakBtn').onclick = () => {
  toast('KATSU AUDIO BRIEFING PLAYING');
  if ('speechSynthesis' in window) {
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance($('#aiText').textContent);
    utterance.rate = 1.05;
    utterance.pitch = 0.95;
    speechSynthesis.speak(utterance);
  }
};

// Launch Game / Live Session
$('#launchBtn').onclick = () => {
  isSessionActive = true;
  updateSessionDisplay();
  show('session');
  $('#sessionGame').textContent = selected.name;

  let baseFps = Math.max(48, selected.score - 14 + (optimized ? selected.gain : 0));
  let currentFps = baseFps;
  let currentTemp = optimized ? 38.6 : 40.1;
  let sessionBat = Math.round(deviceTelemetry.battery_percent);

  $('#liveFps').textContent = currentFps;
  $('#liveTemp').textContent = `${currentTemp.toFixed(1)}°`;
  $('#sessionBattery').textContent = `${sessionBat}%`;

  liveFpsHistory = Array(12)
    .fill(0)
    .map(() => baseFps + Math.round(Math.random() * 4 - 2));
  updateLiveChart(currentFps);

  clearInterval(sessionTimer);
  sessionTimer = setInterval(() => {
    const delta = Math.round(Math.random() * 4 - 2);
    currentFps = Math.max(35, Math.min(selected.target_fps || 60, currentFps + delta));
    currentTemp += Math.random() * 0.12;

    if (Math.random() > 0.75) {
      sessionBat = Math.max(1, sessionBat - 1);
      deviceTelemetry.battery_percent = sessionBat;
      $('#sessionBattery').textContent = `${sessionBat}%`;
      const statusBat = $('#statusBattery');
      if (statusBat) statusBat.textContent = `${sessionBat}%`;
    }

    $('#liveFps').textContent = currentFps;
    $('#liveTemp').textContent = `${currentTemp.toFixed(1)}°`;
    $('#liveTempDiff').textContent = `+${(currentTemp - 39.0).toFixed(1)}°`;

    updateLiveChart(currentFps);
  }, 1600);

  toast('GAME MODE ENGAGED · LIVE TELEMETRY STREAM');
};

// End Session
$('#endSession').onclick = () => {
  isSessionActive = false;
  clearInterval(sessionTimer);
  sessionTimer = null;
  updateSessionDisplay();
  toast('SESSION LOGGED TO 30-DAY DEGRADATION HISTORY');
  show('dashboard');
  switchSubSlide('dash-slide-1');
};

// Custom Game Workload Handler
$('#applyCustomGame').onclick = () => {
  const name = $('#customName').value.trim() || 'Custom Title';
  const ram = parseFloat($('#customRam').value) || 5.0;
  const gpu = parseFloat($('#customGpu').value) || 0.85;

  const customTitle = {
    name: name,
    spec: `CUSTOM GPU · ${ram} GB RAM`,
    color: '#00d4ff',
    badge: 'CUSTOM',
    app_ram_gb: ram,
    app_storage_gb: 20.0,
    app_gpu_intensity: gpu,
    app_cpu_intensity: Math.min(0.9, gpu * 0.95),
    target_fps: 60,
    score: Math.round(88 - ram * 3.5 - gpu * 10),
    fps: '45–60 FPS',
    verdict: 'EVALUATING',
    title: 'Custom Profile Configured',
    copy: 'Workload parameters modeled against live device telemetry.',
    ai: `Custom profile for ${name} loaded. Evaluated with ${ram} GB memory requirement and high rendering intensity.`,
    gain: 6,
  };

  games.unshift(customTitle);
  selected = customTitle;
  optimized = false;
  renderGames();
  updateSelection();
  toast(`CUSTOM PROFILE CONFIGURED: ${name}`);
};

// Telemetry Lab: readout chips, mode badge & sliders
function classifyThermalState(tempC) {
  if (tempC >= 42.5) return { label: 'CRITICAL', cls: 'crit' };
  if (tempC >= 40.5) return { label: 'ELEVATED', cls: 'warm' };
  if (tempC <= 34) return { label: 'COOL', cls: 'cool' };
  return { label: 'NOMINAL', cls: 'nominal' };
}

function updateSimReadout() {
  const temp = deviceTelemetry.temperature_c;
  const ram = Math.round(deviceTelemetry.ram_used_percent);
  const batt = Math.round(deviceTelemetry.battery_percent);

  $('#readoutTemp').textContent = `${temp.toFixed(1)}°C`;
  $('#readoutRam').textContent = `${ram}%`;
  $('#readoutBatt').textContent = `${batt}%`;

  const badge = $('#simModeBadge');
  if (badge) {
    const state = classifyThermalState(temp);
    badge.textContent = state.label;
    badge.className = `sim-mode-badge ${state.cls}`;
  }
}

function syncSimSliders() {
  $('#simTemp').value = deviceTelemetry.temperature_c;
  $('#simRam').value = Math.round(deviceTelemetry.ram_used_percent);
  $('#simBatt').value = Math.round(deviceTelemetry.battery_percent);
  $('#simTempLabel').textContent = `${deviceTelemetry.temperature_c.toFixed(1)}°C`;
  $('#simRamLabel').textContent = `${Math.round(deviceTelemetry.ram_used_percent)}%`;
  $('#simBattLabel').textContent = `${Math.round(deviceTelemetry.battery_percent)}%`;
}

$('#simToggle').onclick = () => {
  show('dashboard');
  switchSubSlide('dash-slide-2');
  toast('TELEMETRY LAB OPENED (SLIDE 2)');
};

$('#simTemp').oninput = (e) => {
  deviceTelemetry.temperature_c = parseFloat(e.target.value);
  syncSimSliders();
  updateSimReadout();
  updateDashboardMetrics();
};

$('#simRam').oninput = (e) => {
  deviceTelemetry.ram_used_percent = parseFloat(e.target.value);
  syncSimSliders();
  updateSimReadout();
  updateDashboardMetrics();
};

$('#simBatt').oninput = (e) => {
  deviceTelemetry.battery_percent = parseFloat(e.target.value);
  syncSimSliders();
  updateSimReadout();
  updateDashboardMetrics();
};

// Presets
$$('[data-preset]').forEach((btn) => {
  btn.onclick = () => {
    $$('[data-preset]').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    const p = btn.dataset.preset;

    if (p === 'nominal') {
      deviceTelemetry.temperature_c = 39.0;
      deviceTelemetry.ram_used_percent = 47.0;
      deviceTelemetry.battery_percent = 78.0;
      toast('NOMINAL STATE · 39.0°C · READY TO PLAY');
    } else if (p === 'hot') {
      deviceTelemetry.temperature_c = 43.5;
      deviceTelemetry.ram_used_percent = 84.0;
      deviceTelemetry.battery_percent = 32.0;
      toast('SIMULATING HIGH THROTTLE STATE (43.5°C)');
    } else if (p === 'cool') {
      deviceTelemetry.temperature_c = 32.0;
      deviceTelemetry.ram_used_percent = 34.0;
      deviceTelemetry.battery_percent = 92.0;
      toast('SIMULATING COOL IDLE (32.0°C)');
    }

    syncSimSliders();
    updateSimReadout();
    updateDashboardMetrics();
  };
});

// Initialize telemetry lab readout + sliders on load
syncSimSliders();
updateSimReadout();
