/**
 * explainer.js - Interactive Controller for BLE Demystified Field Guide
 *
 * Drives all 7 interactive tabs:
 * 1. Animated Radio Flow (Play/Pause, Step controls)
 * 2. Clickable GAP State Machine
 * 3. Dynamic GATT Tree Explorer with 16-bit/128-bit UUID inspector
 * 4. Parameter Tuner with live Chart.js/canvas wave & battery lifespan model
 * 5. Read vs Write vs Notify packet animator
 * 6. Plots gallery tooltips
 * 7. Interactive Quiz with instant explanations
 */

// Global State
const explainerState = {
  currentTab: 'tab-what',
  theme: 'dark',
  // Tab 1 Radio Animation State
  flowStep: 1,
  flowPlaying: false,
  flowTimer: null,
  // Tab 4 Simulator State
  connIntervalMs: 20,
  mtuBytes: 23,
  packetLossPct: 2,
  simChart: null,
  simTimer: null,
  simHistory: []
};

// =========================================================
// TAB SWITCHING & THEME
// =========================================================
function initNavigation() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  function switchTab(targetId) {
    tabBtns.forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    tabPanels.forEach(p => p.classList.remove('active'));

    const btn = Array.from(tabBtns).find(b => b.getAttribute('data-tab') === targetId);
    if (btn) {
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
    }
    const targetPanel = document.getElementById(targetId);
    if (targetPanel) {
      targetPanel.classList.add('active');
    }

    explainerState.currentTab = targetId;

    if (targetId === 'tab-simulator' && !explainerState.simChart) {
      initSimChart();
    }
  }

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-tab');
      switchTab(targetId);
      if (history.replaceState) {
        history.replaceState(null, '', '#' + targetId);
      }
    });
  });

  // Check URL hash on initial load
  if (window.location.hash) {
    const hash = window.location.hash.substring(1);
    if (document.getElementById(hash)) {
      switchTab(hash);
    }
  }

  // Theme Toggle
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      explainerState.theme = explainerState.theme === 'dark' ? 'light' : 'dark';
      document.body.setAttribute('data-theme', explainerState.theme);
      if (explainerState.simChart) {
        explainerState.simChart.destroy();
        explainerState.simChart = null;
        initSimChart();
      }
    });
  }
}

// =========================================================
// TAB 1: ANIMATED RADIO ARENA
// =========================================================
const FLOW_STEPS = [
  {
    step: 1,
    title: 'Step 1: Periodic Advertising (ADV_IND)',
    body: 'The peripheral wakes up every 100ms. It sends an ADV_IND packet on Channel 37 (2402 MHz), then immediately repeats on 38 and 39. The packet contains its MAC address, 4dBm TX power, and the 16-bit UUID for Heart Rate (0x180D).',
    centralState: 'SCANNING (Passive listener)',
    peripheralState: 'ADVERTISING (CH 37, 38, 39)',
    channel: 'Channel 37 (2402 MHz)',
    packetName: 'ADV_IND',
    packetPos: '25%', // flying left toward central
    packetColor: '#38bdf8'
  },
  {
    step: 2,
    title: 'Step 2: Central Active Scan Request (SCAN_REQ)',
    body: 'The Central phone hears the advertising chirp. In Active Scanning mode, the Central immediately replies on the exact same channel with a SCAN_REQ packet, asking: "Got any more details for me?"',
    centralState: 'TRANSMITTING SCAN_REQ',
    peripheralState: 'LISTENING ON RX WINDOW',
    channel: 'Channel 37 (2402 MHz)',
    packetName: 'SCAN_REQ',
    packetPos: '75%', // flying right toward peripheral
    packetColor: '#f59e0b'
  },
  {
    step: 3,
    title: 'Step 3: Peripheral Scan Response (SCAN_RSP)',
    body: 'Within 150 microseconds (T_IFS), the peripheral replies with SCAN_RSP containing its complete human-readable name: "PulseGlow BLE". Total on-air time was less than 2.5 milliseconds!',
    centralState: 'CACHING DEVICE NAME',
    peripheralState: 'SCAN_RSP TRANSMITTED',
    channel: 'Channel 37 (2402 MHz)',
    packetName: 'SCAN_RSP ("PulseGlow BLE")',
    packetPos: '25%',
    packetColor: '#10b981'
  },
  {
    step: 4,
    title: 'Step 4: Connection Request (CONNECT_IND)',
    body: 'User clicks Connect! The Central transmits a CONNECT_IND packet containing critical synchronization timing: Access Address, Connection Interval (20ms), Slave Latency (0), and Supervision Timeout (4000ms).',
    centralState: 'INITIATING (Sending CONNECT_IND)',
    peripheralState: 'RECEIVING TIMING PARAMS',
    channel: 'Channel 38 (2426 MHz)',
    packetName: 'CONNECT_IND',
    packetPos: '75%',
    packetColor: '#a855f7'
  },
  {
    step: 5,
    title: 'Step 5: Connected & Frequency Hopping (FHSS)',
    body: 'Both radios immediately leave advertising channels and jump to the 37 Data Channels (0 to 36). Every 20ms, they hop together to a pseudo-random channel to dodge interference. Point-to-point connection is locked!',
    centralState: 'CONNECTED (Master / Central)',
    peripheralState: 'CONNECTED (Slave / Peripheral)',
    channel: 'Data Channels 0-36 (FHSS Active)',
    packetName: 'DATA_PACKET (Anchor Lock)',
    packetPos: '50%',
    packetColor: '#10b981'
  }
];

function initRadioFlow() {
  const prevBtn = document.getElementById('flowPrevBtn');
  const nextBtn = document.getElementById('flowNextBtn');
  const playBtn = document.getElementById('flowPlayBtn');

  if (!prevBtn || !nextBtn || !playBtn) return;

  function renderStep(idx) {
    const data = FLOW_STEPS[idx - 1];
    document.getElementById('flowStepTitle').textContent = data.title;
    document.getElementById('flowStepBody').textContent = data.body;
    document.getElementById('centralStateBadge').textContent = data.centralState;
    document.getElementById('peripheralStateBadge').textContent = data.peripheralState;
    document.getElementById('channelIndicator').textContent = data.channel;

    const pktChip = document.getElementById('packetChip');
    const flyingPkt = document.getElementById('flyingPacket');

    pktChip.textContent = data.packetName;
    pktChip.style.backgroundColor = data.packetColor;
    flyingPkt.style.left = data.packetPos;

    prevBtn.disabled = idx === 1;
    nextBtn.disabled = idx === FLOW_STEPS.length;
  }

  prevBtn.addEventListener('click', () => {
    if (explainerState.flowStep > 1) {
      explainerState.flowStep--;
      renderStep(explainerState.flowStep);
    }
  });

  nextBtn.addEventListener('click', () => {
    if (explainerState.flowStep < FLOW_STEPS.length) {
      explainerState.flowStep++;
      renderStep(explainerState.flowStep);
    }
  });

  playBtn.addEventListener('click', () => {
    if (explainerState.flowPlaying) {
      clearInterval(explainerState.flowTimer);
      explainerState.flowPlaying = false;
      playBtn.textContent = '▶ Play Auto';
      playBtn.classList.remove('btn-secondary');
      playBtn.classList.add('btn-primary');
    } else {
      explainerState.flowPlaying = true;
      playBtn.textContent = '⏸ Pause';
      playBtn.classList.remove('btn-primary');
      playBtn.classList.add('btn-secondary');

      explainerState.flowTimer = setInterval(() => {
        explainerState.flowStep = (explainerState.flowStep % FLOW_STEPS.length) + 1;
        renderStep(explainerState.flowStep);
      }, 2400);
    }
  });

  renderStep(1);
}

// =========================================================
// TAB 2: GAP STATE MACHINE
// =========================================================
const GAP_STATES = {
  STANDBY: {
    title: 'Standby State',
    pill: 'STANDBY',
    desc: 'The radio transmitter and receiver are completely powered down. Power consumption is microamps (< 1.5 μA). The device can transition to either Advertising (to be found) or Scanning (to find others).',
    params: [
      'Current Draw: ~1.2 μA (RTC sleep clock only)',
      'Radio Channels: None (Oscillator OFF)',
      'Valid Next Transitions: ADVERTISING or SCANNING'
    ]
  },
  ADVERTISING: {
    title: 'Advertising State',
    pill: 'ADVERTISING',
    desc: 'The Peripheral broadcasts periodic advertisement packets (ADV_IND) on channels 37, 38, and 39. It can also listen briefly for SCAN_REQ or CONNECT_IND from scanners.',
    params: [
      'Current Draw: ~6-12 mA during 2ms transmit bursts, sleep in between',
      'Channels Used: 37, 38, 39 (Primary Advertisements)',
      'Standard Interval: 20ms to 10.24 seconds (default 100ms)'
    ]
  },
  SCANNING: {
    title: 'Scanning State',
    pill: 'SCANNING',
    desc: 'The Central listens for advertising packets on channels 37, 38, 39. In Active Scanning, it sends SCAN_REQ to retrieve extra advertising data (like complete device names).',
    params: [
      'Scan Window vs Scan Interval: Governs duty cycle',
      'Continuous Scan Draw: ~12 mA (radio receiver stays on)',
      'Can transition to: INITIATING state'
    ]
  },
  INITIATING: {
    title: 'Initiating State',
    pill: 'INITIATING',
    desc: 'A scanner decides to connect. It transmits CONNECT_IND to lock onto the peripheral. It assigns the 32-bit Access Address and connection intervals before jumping to data channels.',
    params: [
      'Duration: Typically under 5 milliseconds',
      'Transmits: Connection anchor timing, channel map, hop increment',
      'Transitions to: CONNECTED'
    ]
  },
  CONNECTED: {
    title: 'Connected State',
    pill: 'CONNECTED',
    desc: 'Both devices operate on a point-to-point link using Frequency Hopping Spread Spectrum (FHSS) across 37 data channels. Data packets are exchanged at fixed intervals (Connection Events).',
    params: [
      'Roles: Central (Master / Initiator) and Peripheral (Slave)',
      'Average Current Draw: ~30-80 μA (at 1000ms connection interval)',
      'Security: Encryption, pairing, and bonding take place here'
    ]
  }
};

function initGapStates() {
  const nodes = document.querySelectorAll('.gap-node');
  const titleEl = document.getElementById('detailStateTitle');
  const pillEl = document.getElementById('detailStatePill');
  const descEl = document.getElementById('detailStateDesc');
  const paramsEl = document.getElementById('detailStateParams');

  nodes.forEach(node => {
    node.addEventListener('click', () => {
      const stateKey = node.getAttribute('data-state');
      const data = GAP_STATES[stateKey];
      if (!data) return;

      nodes.forEach(n => n.classList.remove('active'));
      node.classList.add('active');

      titleEl.textContent = data.title;
      pillEl.textContent = data.pill;
      descEl.textContent = data.desc;

      paramsEl.innerHTML = data.params.map(p => `<li>${escapeHtml(p)}</li>`).join('');
    });
  });
}

// =========================================================
// TAB 3: GATT TREE EXPLORER
// =========================================================
const GATT_DATABASE = [
  {
    type: 'SERVICE',
    name: 'Generic Access Service',
    shortUuid: '0x1800',
    fullUuid: '00001800-0000-1000-8000-00805f9b34fb',
    props: ['READ'],
    value: 'Mandatory standard service containing basic device identity.',
    deepDive: 'Every compliant BLE device must expose Generic Access. It lets a scanner know the advertised name and appearance code without pairing.',
    characteristics: [
      {
        type: 'CHARACTERISTIC',
        name: 'Device Name',
        shortUuid: '0x2A00',
        fullUuid: '00002a00-0000-1000-8000-00805f9b34fb',
        props: ['READ'],
        value: '"PulseGlow BLE"',
        deepDive: 'UTF-8 string readable by Central without security authentication.'
      },
      {
        type: 'CHARACTERISTIC',
        name: 'Appearance',
        shortUuid: '0x2A01',
        fullUuid: '00002a01-0000-1000-8000-00805f9b34fb',
        props: ['READ'],
        value: '0x0340 (Generic Heart Rate Sensor icon)',
        deepDive: 'Standard 16-bit enumeration that tells the phone OS what icon to display in the Bluetooth settings tray.'
      }
    ]
  },
  {
    type: 'SERVICE',
    name: 'Battery Service',
    shortUuid: '0x180F',
    fullUuid: '0000180f-0000-1000-8000-00805f9b34fb',
    props: ['READ', 'NOTIFY'],
    value: 'Reports remaining battery percentage from 0 to 100%.',
    deepDive: 'Used by smartwatches, fitness trackers, and BLE beacons. Supports both polling via Read and automatic alerts via CCCD Notifications.',
    characteristics: [
      {
        type: 'CHARACTERISTIC',
        name: 'Battery Level',
        shortUuid: '0x2A19',
        fullUuid: '00002a19-0000-1000-8000-00805f9b34fb',
        props: ['READ', 'NOTIFY'],
        value: '92% (0x5C uint8)',
        deepDive: 'Single unsigned 8-bit integer representing percentage.',
        descriptors: [
          {
            type: 'DESCRIPTOR',
            name: 'Client Characteristic Configuration Descriptor (CCCD)',
            shortUuid: '0x2902',
            fullUuid: '00002902-0000-1000-8000-00805f9b34fb',
            props: ['READ', 'WRITE'],
            value: '0x0000 (Notifications Disabled)',
            deepDive: 'Writing 0x0001 turns on Notifications; writing 0x0002 turns on Indications; writing 0x0000 stops them.'
          }
        ]
      }
    ]
  },
  {
    type: 'SERVICE',
    name: 'Heart Rate Service',
    shortUuid: '0x180D',
    fullUuid: '0000180d-0000-1000-8000-00805f9b34fb',
    props: ['NOTIFY'],
    value: 'Standard medical/fitness profile for heart rate monitors.',
    deepDive: 'Defined by the Bluetooth SIG Heart Rate Profile (HRP). Adopted by Polar, Garmin, Apple Watch, and our simulator.',
    characteristics: [
      {
        type: 'CHARACTERISTIC',
        name: 'Heart Rate Measurement',
        shortUuid: '0x2A37',
        fullUuid: '00002a37-0000-1000-8000-00805f9b34fb',
        props: ['NOTIFY'],
        value: '[Flags: 0x16, BPM: 74, RR: 820ms]',
        deepDive: 'Byte 0 contains format flags (8-bit vs 16-bit BPM format, contact status, and RR interval presence).',
        descriptors: [
          {
            type: 'DESCRIPTOR',
            name: 'CCCD (Client Characteristic Configuration)',
            shortUuid: '0x2902',
            fullUuid: '00002902-0000-1000-8000-00805f9b34fb',
            props: ['READ', 'WRITE'],
            value: '0x0001 (Notifications Active)',
            deepDive: 'The gatekeeper for notifications. Central must write 0x0001 here before any heart rate packets will be transmitted.'
          }
        ]
      },
      {
        type: 'CHARACTERISTIC',
        name: 'Body Sensor Location',
        shortUuid: '0x2A38',
        fullUuid: '00002a38-0000-1000-8000-00805f9b34fb',
        props: ['READ'],
        value: '1 (Chest Strap)',
        deepDive: 'Enumerated value: 0=Other, 1=Chest, 2=Wrist, 3=Finger, 4=Hand, 5=Ear Lobe, 6=Foot.'
      },
      {
        type: 'CHARACTERISTIC',
        name: 'Heart Rate Control Point',
        shortUuid: '0x2A39',
        fullUuid: '00002a39-0000-1000-8000-00805f9b34fb',
        props: ['WRITE'],
        value: 'Ready for Reset command (0x01)',
        deepDive: 'Allows Central to write control commands like resetting cumulative energy expended in kilocalories.'
      }
    ]
  },
  {
    type: 'SERVICE',
    name: 'Custom Simulator Control Service',
    shortUuid: '0xFFF0',
    fullUuid: '0000fff0-0000-1000-8000-00805f9b34fb',
    props: ['READ', 'WRITE'],
    value: 'Vendor-specific service for controlling simulation modes.',
    deepDive: 'Demonstrates custom 128-bit vendor UUIDs used by IoT hardware developers when standard SIG profiles do not cover their needs.',
    characteristics: [
      {
        type: 'CHARACTERISTIC',
        name: 'Workout Mode / Stress Control',
        shortUuid: '0xFFF1',
        fullUuid: '0000fff1-0000-1000-8000-00805f9b34fb',
        props: ['READ', 'WRITE'],
        value: 'Mode 0 (Resting 72 BPM)',
        deepDive: 'Writing 0=Resting, 1=Cardio, 2=Sprint triggers synthetic physiological stress in the peripheral firmware.'
      }
    ]
  }
];

function initGattTree() {
  const treeContainer = document.getElementById('gattTree');
  if (!treeContainer) return;

  function renderTree() {
    treeContainer.innerHTML = '';

    GATT_DATABASE.forEach((service, sIdx) => {
      const servEl = document.createElement('div');
      servEl.className = 'tree-service';

      const header = document.createElement('div');
      header.className = 'tree-header';
      header.innerHTML = `
        <div class="tree-header-left">
          <span>📦</span>
          <span>${service.name}</span>
        </div>
        <span class="tree-uuid">${service.shortUuid}</span>
      `;

      header.addEventListener('click', () => {
        document.querySelectorAll('.tree-header, .tree-char-row').forEach(e => e.classList.remove('selected'));
        header.classList.add('selected');
        inspectGattNode(service);
      });

      const body = document.createElement('div');
      body.className = 'tree-body';

      service.characteristics.forEach(char => {
        const charRow = document.createElement('div');
        charRow.className = 'tree-char-row';
        charRow.innerHTML = `
          <span>🔹 ${char.name}</span>
          <span class="tree-uuid">${char.shortUuid}</span>
        `;

        charRow.addEventListener('click', (e) => {
          e.stopPropagation();
          document.querySelectorAll('.tree-header, .tree-char-row').forEach(el => el.classList.remove('selected'));
          charRow.classList.add('selected');
          inspectGattNode(char);
        });

        body.appendChild(charRow);

        if (char.descriptors) {
          char.descriptors.forEach(desc => {
            const descRow = document.createElement('div');
            descRow.className = 'tree-char-row';
            descRow.style.paddingLeft = '1.75rem';
            descRow.innerHTML = `
              <span>📜 ${desc.name}</span>
              <span class="tree-uuid">${desc.shortUuid}</span>
            `;
            descRow.addEventListener('click', (e) => {
              e.stopPropagation();
              document.querySelectorAll('.tree-header, .tree-char-row').forEach(el => el.classList.remove('selected'));
              descRow.classList.add('selected');
              inspectGattNode(desc);
            });
            body.appendChild(descRow);
          });
        }
      });

      servEl.appendChild(header);
      servEl.appendChild(body);
      treeContainer.appendChild(servEl);
    });
  }

  document.getElementById('expandAllBtn').addEventListener('click', () => {
    document.querySelectorAll('.tree-body').forEach(b => b.style.display = 'flex');
  });

  document.getElementById('collapseAllBtn').addEventListener('click', () => {
    document.querySelectorAll('.tree-body').forEach(b => b.style.display = 'none');
  });

  renderTree();
  // Select first item by default
  inspectGattNode(GATT_DATABASE[1].characteristics[0]);
}

function inspectGattNode(node) {
  document.getElementById('inspNodeType').textContent = node.type;
  document.getElementById('inspNodeName').textContent = node.name;
  document.getElementById('inspShortUuid').textContent = node.shortUuid;
  document.getElementById('inspFullUuid').textContent = node.fullUuid;
  document.getElementById('inspValue').textContent = node.value;
  document.getElementById('inspDeepDive').textContent = node.deepDive;

  const propsContainer = document.getElementById('inspProps');
  propsContainer.innerHTML = (node.props || []).map(p => `<span class="prop-tag">${p}</span>`).join('');
}

// =========================================================
// TAB 4: SIMULATOR & PARAMETER TUNER
// =========================================================
function initSimChart() {
  const canvas = document.getElementById('simChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const isDark = document.body.getAttribute('data-theme') !== 'light';
  const gridColor = isDark ? '#2a3754' : '#e2e8f0';
  const textColor = isDark ? '#94a3b8' : '#64748b';

  if (typeof Chart !== 'undefined') {
    explainerState.simChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: Array.from({ length: 25 }, (_, i) => `${i}s`),
        datasets: [{
          label: 'Inter-Arrival Latency (ms)',
          data: Array.from({ length: 25 }, () => 20),
          borderColor: '#38bdf8',
          backgroundColor: 'rgba(56, 189, 248, 0.12)',
          fill: true,
          tension: 0.25,
          borderWidth: 2,
          pointRadius: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        scales: {
          x: { grid: { color: gridColor }, ticks: { color: textColor, maxTicksLimit: 6 } },
          y: { min: 0, max: 250, grid: { color: gridColor }, ticks: { color: textColor } }
        },
        plugins: { legend: { display: false } }
      }
    });
  }

  // Hook Up Sliders
  const intervalSlider = document.getElementById('connIntervalSlider');
  const mtuSlider = document.getElementById('mtuSlider');
  const noiseSlider = document.getElementById('noiseSlider');

  function updateSimulatorModel() {
    const interval = parseFloat(intervalSlider.value);
    const mtu = parseInt(mtuSlider.value, 10);
    const noise = parseInt(noiseSlider.value, 10);

    explainerState.connIntervalMs = interval;
    explainerState.mtuBytes = mtu;
    explainerState.packetLossPct = noise;

    document.getElementById('connIntervalVal').textContent = `${interval.toFixed(1)} ms`;
    document.getElementById('mtuVal').textContent = `${mtu} bytes`;
    document.getElementById('noiseVal').textContent = `${noise}%`;

    // Throughput Calculation
    const packetsPerSec = 1000 / interval;
    const payloadPerPkt = mtu - 3; // ATT Header overhead
    const effectiveKbps = ((packetsPerSec * payloadPerPkt * 8) / 1000) * (1 - noise / 100);

    // Jitter calculation
    const jitter = (noise * 0.8) + (Math.random() * 0.9);

    document.getElementById('streamThroughput').textContent = `${effectiveKbps.toFixed(1)} kbps`;
    document.getElementById('streamJitter').textContent = `${jitter.toFixed(1)} ms`;

    // Battery lifespan model: based on CR2032 220mAh coin cell
    // Wakeup current = 8mA, Sleep current = 2uA
    const wakeFraction = (2.0 / interval) * 0.8;
    const avgCurrentMa = 0.002 + (8.0 * wakeFraction);
    const hours = 220 / avgCurrentMa;
    const months = Math.min(36, Math.max(1, Math.round(hours / (24 * 30.5))));

    document.getElementById('batteryLifeEstimate').innerHTML = `Estimated Coin Cell (CR2032) Life: <strong>~${months} months</strong> (Avg: ${(avgCurrentMa * 1000).toFixed(0)} &mu;A)`;
    const meterPct = Math.min(100, Math.max(5, (1 / months) * 100));
    document.getElementById('energyMeterBar').style.width = `${meterPct}%`;
  }

  intervalSlider.addEventListener('input', updateSimulatorModel);
  mtuSlider.addEventListener('input', updateSimulatorModel);
  noiseSlider.addEventListener('input', updateSimulatorModel);

  updateSimulatorModel();

  // Simulation tick loop
  if (explainerState.simTimer) clearInterval(explainerState.simTimer);
  explainerState.simTimer = setInterval(() => {
    if (explainerState.currentTab !== 'tab-simulator') return;

    let latency = explainerState.connIntervalMs;
    if (Math.random() * 100 < explainerState.packetLossPct) {
      latency *= 2; // retransmit delay
    } else {
      latency += (Math.random() - 0.5) * 1.5;
    }

    if (explainerState.simChart) {
      explainerState.simChart.data.datasets[0].data.push(latency);
      if (explainerState.simChart.data.datasets[0].data.length > 25) {
        explainerState.simChart.data.datasets[0].data.shift();
      }
      explainerState.simChart.update();
    }
  }, 400);
}

// =========================================================
// TAB 5: READ vs WRITE vs NOTIFY ANIMATOR
// =========================================================
function initActionAnimator() {
  const triggerReadBtn = document.getElementById('triggerReadBtn');
  const triggerWriteBtn = document.getElementById('triggerWriteBtn');
  const triggerNotifyBtn = document.getElementById('triggerNotifyBtn');

  // Read Animation
  triggerReadBtn.addEventListener('click', () => {
    triggerReadBtn.disabled = true;
    const req = document.getElementById('pktReadReq');
    const rsp = document.getElementById('pktReadRsp');

    req.classList.remove('hidden');
    req.style.left = '10%';
    setTimeout(() => { req.style.left = '75%'; }, 50);

    setTimeout(() => {
      req.classList.add('hidden');
      rsp.classList.remove('hidden');
      rsp.style.left = '75%';
      setTimeout(() => { rsp.style.left = '10%'; }, 50);
    }, 600);

    setTimeout(() => {
      rsp.classList.add('hidden');
      triggerReadBtn.disabled = false;
    }, 1250);
  });

  // Write Animation
  triggerWriteBtn.addEventListener('click', () => {
    triggerWriteBtn.disabled = true;
    const cmd = document.getElementById('pktWriteCmd');

    cmd.classList.remove('hidden');
    cmd.style.left = '10%';
    setTimeout(() => { cmd.style.left = '75%'; }, 50);

    setTimeout(() => {
      cmd.classList.add('hidden');
      triggerWriteBtn.disabled = false;
    }, 700);
  });

  // Notify Animation
  triggerNotifyBtn.addEventListener('click', () => {
    triggerNotifyBtn.disabled = true;
    const ntf = document.getElementById('pktNotifyPkt');

    ntf.classList.remove('hidden');
    ntf.style.left = '75%';
    setTimeout(() => { ntf.style.left = '10%'; }, 50);

    setTimeout(() => {
      ntf.classList.add('hidden');
      triggerNotifyBtn.disabled = false;
    }, 700);
  });
}

// =========================================================
// TAB 7: INTERACTIVE QUIZ
// =========================================================
const QUIZ_QUESTIONS = [
  {
    q: '1. Why does BLE use Channels 37, 38, and 39 specifically for Advertising?',
    options: [
      'They have higher radio power output allowed by law.',
      'They are strategically placed in the gaps between Wi-Fi channels 1, 6, and 11 to avoid interference.',
      'They operate on 5.0 GHz instead of 2.4 GHz.',
      'They use special copper antennas inside smartphones.'
    ],
    answer: 1,
    explanation: 'Correct! By spacing 37 (2402 MHz), 38 (2426 MHz), and 39 (2480 MHz) across the spectral gaps of common Wi-Fi channels, BLE ensures advertisement packets can be heard even in congested Wi-Fi environments.'
  },
  {
    q: '2. Which Descriptor MUST a Central write to before a Peripheral will stream Notifications?',
    options: [
      'Characteristic User Description (0x2901)',
      'Client Characteristic Configuration Descriptor (CCCD, 0x2902)',
      'Server Characteristic Configuration (0x2903)',
      'Characteristic Presentation Format (0x2904)'
    ],
    answer: 1,
    explanation: 'Correct! The CCCD (UUID 0x2902) is the gatekeeper. Writing 0x0001 enables notifications; writing 0x0002 enables indications; writing 0x0000 turns them off.'
  },
  {
    q: '3. What is the key architectural difference between a Notification and an Indication?',
    options: [
      'Indications require an application-layer confirmation (ATT_HANDLE_VALUE_CFM), while Notifications do not.',
      'Notifications are only allowed for battery levels.',
      'Indications transmit over audio channels.',
      'There is no difference; they are identical.'
    ],
    answer: 0,
    explanation: 'Spot on! Notifications are fire-and-forget for maximum throughput (like continuous heart rate streams). Indications require a handshake ACK (CFM) packet, making them reliable but slower.'
  },
  {
    q: '4. What happens when the Central and Peripheral negotiate a larger ATT MTU (e.g. from 23 to 247 bytes)?',
    options: [
      'Battery drains 10x faster immediately.',
      'Throughput increases dramatically because each packet carries far more payload without extra packet headers.',
      'The connection range drops to 1 meter.',
      'The device becomes incompatible with iOS.'
    ],
    answer: 1,
    explanation: 'Correct! Default 23-byte MTU only leaves 20 usable payload bytes after the 3-byte ATT header. Expanding to 247 bytes provides 244 usable bytes per packet, yielding over 10x higher effective throughput.'
  },
  {
    q: '5. In which GAP state is radio power consumption the lowest?',
    options: [
      'Scanning',
      'Standby',
      'Advertising',
      'Initiating'
    ],
    answer: 1,
    explanation: 'Correct! In Standby, both the transmitter (TX) and receiver (RX) are completely shut off, drawing less than 1.5 microamps from the battery.'
  }
];

function initQuiz() {
  const container = document.getElementById('quizContainer');
  const summary = document.getElementById('quizSummary');
  const scoreText = document.getElementById('quizScoreText');
  const resetBtn = document.getElementById('resetQuizBtn');

  if (!container) return;

  let score = 0;
  let answeredCount = 0;

  function renderQuiz() {
    container.innerHTML = '';
    score = 0;
    answeredCount = 0;
    summary.classList.add('hidden');

    QUIZ_QUESTIONS.forEach((item, qIdx) => {
      const card = document.createElement('div');
      card.className = 'quiz-card';

      const qTitle = document.createElement('div');
      qTitle.className = 'quiz-question';
      qTitle.textContent = item.q;

      const optsBox = document.createElement('div');
      optsBox.className = 'quiz-options';

      const feedback = document.createElement('div');
      feedback.className = 'quiz-feedback hidden';

      item.options.forEach((optText, optIdx) => {
        const btn = document.createElement('button');
        btn.className = 'quiz-opt-btn';
        btn.textContent = optText;

        btn.addEventListener('click', () => {
          optsBox.querySelectorAll('.quiz-opt-btn').forEach(b => b.disabled = true);
          answeredCount++;

          if (optIdx === item.answer) {
            btn.classList.add('correct');
            feedback.style.borderColor = 'var(--success)';
            feedback.innerHTML = `<strong>✔ Correct!</strong> ${item.explanation}`;
            score++;
          } else {
            btn.classList.add('wrong');
            optsBox.children[item.answer].classList.add('correct');
            feedback.style.borderColor = 'var(--danger)';
            feedback.innerHTML = `<strong>✖ Not quite.</strong> ${item.explanation}`;
          }

          feedback.classList.remove('hidden');

          if (answeredCount === QUIZ_QUESTIONS.length) {
            summary.classList.remove('hidden');
            scoreText.textContent = `You scored ${score} out of ${QUIZ_QUESTIONS.length}! ${score >= 4 ? '🎉 Excellent mastery of BLE fundamentals!' : 'Keep exploring the tabs and try again!'}`;
          }
        });

        optsBox.appendChild(btn);
      });

      card.appendChild(qTitle);
      card.appendChild(optsBox);
      card.appendChild(feedback);
      container.appendChild(card);
    });
  }

  resetBtn.addEventListener('click', renderQuiz);
  renderQuiz();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initRadioFlow();
  initGapStates();
  initGattTree();
  initActionAnimator();
  initQuiz();
});
