import { initBilling, purchasePlan, billing } from './billing.js'

const state = {
  view: 'home',
  borough: 'Rosemont-La Petite-Patrie',
  address: '6360 rue Saint-Hubert',
  language: 'English',
  plan: 'Free',
  query: '',
  lastAnswer: null,
  selectedProject: 'Fence permit readiness'
}

const modules = [
  { id: 'assistant', icon: '✦', title: 'Municipal Assistant', body: 'Ask, upload, or search. Answers stay source-backed and action-first.', tags: ['AI', 'Sources', 'Borough aware'] },
  { id: 'waste', icon: '♻', title: 'Waste + Ecocentre', body: 'Classify items, plan trips, and avoid wrong disposal routes.', tags: ['Paint', 'Microwave', 'Renovation debris'] },
  { id: 'permits', icon: '⌂', title: 'Permit Readiness', body: 'Guided interview, missing documents, risk flags, exportable packet.', tags: ['Fence', 'Deck', 'Shed'] },
  { id: 'parking', icon: 'Ⓟ', title: 'Parking + Streets', body: 'Street cleaning, snow alerts, moving truck and sign interpretation.', tags: ['No guarantee', 'Reminders'] },
  { id: 'router', icon: '311', title: '311 Router', body: 'Prepare clean reports for potholes, graffiti, lights, water, noise, and snow.', tags: ['Summary', 'Follow-up'] },
  { id: 'pro', icon: '▣', title: 'Pro Console', body: 'Multiple addresses, client reports, project folders, and saved proof.', tags: ['PDF', 'Paid'] }
]

const projects = [
  { title: 'Fence permit readiness', type: 'Permit', status: '3 missing items', progress: 62, due: 'Ready in 2 steps', icon: '⌂' },
  { title: 'July moving plan', type: 'Move', status: 'Parking check needed', progress: 47, due: 'Next Saturday', icon: '↔' },
  { title: 'Basement cleanup', type: 'Waste', status: 'Ecocentre trip drafted', progress: 80, due: 'This week', icon: '♻' },
  { title: 'Broken streetlight file', type: '311', status: 'Follow-up reminder set', progress: 34, due: 'In 5 days', icon: '!' }
]

const reminders = [
  ['Tomorrow', 'Recycling collection', 'Put bin out after 7 PM'],
  ['Wed', 'Street cleaning', 'Vehicle profile has a possible restriction'],
  ['Fri', 'Permit packet', 'Confirm dimensions and property photo'],
  ['Next Sat', 'Moving checklist', 'Parking occupation guidance pending']
]

const sources = [
  { label: 'Official City service page', date: 'Retrieved today', confidence: 'High' },
  { label: 'Borough-specific guidance', date: 'Needs address check', confidence: 'Medium' },
  { label: 'Municipal form or PDF', date: 'Verify before submission', confidence: 'Guarded' }
]

const services = [
  ['Ecocentre', 'La Petite-Patrie', '28 min', '70%', '43%'],
  ['Bureau Accès Montréal', 'Rosemont', '15 min', '35%', '32%'],
  ['Library', 'Marc-Favreau', '9 min', '58%', '58%'],
  ['Cooling centre', 'Seasonal', 'Check status', '30%', '72%']
]

function inferAnswer(query) {
  const q = query.toLowerCase()
  if (q.includes('paint') || q.includes('microwave') || q.includes('battery') || q.includes('dispose')) {
    return {
      title: 'Likely waste or ecocentre route',
      confidence: '82%',
      summary: 'The pattern suggests this should be handled through an ecocentre or a special disposal stream, not regular garbage. Add it to a disposal trip and verify preparation rules before leaving.',
      steps: ['Confirm item type', 'Check nearest ecocentre', 'Prepare item safely', 'Save disposal proof'],
      warning: 'The app should verify the official source before giving final disposal instructions.'
    }
  }
  if (q.includes('permit') || q.includes('fence') || q.includes('deck') || q.includes('shed') || q.includes('renovation')) {
    return {
      title: 'Permit readiness workflow started',
      confidence: '74%',
      summary: 'The record shows this depends on borough, property type, dimensions, and whether the work changes the exterior. The app should produce a readiness packet, not claim approval certainty.',
      steps: ['Confirm borough', 'Describe project', 'Collect dimensions', 'Generate document checklist', 'Export packet'],
      warning: 'Do not submit work without checking official borough guidance.'
    }
  }
  if (q.includes('park') || q.includes('parking') || q.includes('snow') || q.includes('street')) {
    return {
      title: 'Street rule guidance, not a legal guarantee',
      confidence: '68%',
      summary: 'The app can explain resident parking, street cleaning, moving truck guidance, and snow alerts. It must not guarantee that parking is legal because posted signage and enforcement notices are final.',
      steps: ['Save vehicle profile', 'Check address zone', 'Review posted signage', 'Set reminder'],
      warning: 'Final authority remains official signage and city enforcement rules.'
    }
  }
  if (q.includes('pothole') || q.includes('graffiti') || q.includes('light') || q.includes('noise') || q.includes('311')) {
    return {
      title: '311 report summary prepared',
      confidence: '86%',
      summary: 'The app should classify the issue, prepare a clean report summary, attach photo and timestamp, link to the official reporting path, and schedule follow-up.',
      steps: ['Classify issue', 'Add location', 'Attach photo', 'Copy report summary', 'Save case file'],
      warning: 'The app should route to the official city form rather than pretending to file directly.'
    }
  }
  return {
    title: 'Civic pathway identified',
    confidence: '71%',
    summary: 'The app needs an address or borough when rules vary. It should retrieve official municipal information, explain what is known, mark uncertainty, and suggest the next action.',
    steps: ['Confirm address or borough', 'Retrieve official source', 'Explain in plain language', 'Save answer', 'Create reminder if useful'],
    warning: 'Current rules must come from indexed official sources, not model memory.'
  }
}

function setView(view) {
  state.view = view
  render()
}

function askNow(seed) {
  state.view = 'assistant'
  state.query = seed || state.query || 'I need a fence permit in Rosemont'
  state.lastAnswer = inferAnswer(state.query)
  render()
}

function startProject(title) {
  state.selectedProject = title
  state.view = 'projects'
  render()
}

async function upgrade(plan) {
  if (plan === 'Free') {
    state.plan = 'Free'
    render()
    return
  }
  // Native build: launch a real Google Play subscription. The plan is applied
  // by the billing callback (applyPlan) only after the purchase is verified.
  if (billing.available) {
    await purchasePlan(plan)
    return
  }
  // Browser / PWA preview: keep the demo unlock so the web build stays usable.
  state.plan = plan
  render()
}

// Called by billing.js when an owned entitlement is detected or changes.
function applyPlan(plan) {
  state.plan = plan
  render()
}

function icon(name) {
  const map = { home: '⌂', assistant: '✦', projects: '▣', map: '⌖', profile: '☻' }
  return map[name] || '•'
}

function shell(inner) {
  const tabs = [
    ['home', 'Home'],
    ['assistant', 'Ask'],
    ['projects', 'Projects'],
    ['map', 'Map'],
    ['profile', 'Profile']
  ]
  return `
    <main class="app-shell">
      <section class="phone-card">
        <div class="header">
          <div class="status-bar">
            <div class="brand-lockup"><div class="logo">M+</div><strong>Montréal+</strong></div>
            <span>${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div class="top-row">
            <div>
              <div class="eyebrow">Civic operating assistant</div>
              <h1>${titleForView()}</h1>
            </div>
            <button class="pill" data-action="profile">${state.plan}</button>
          </div>
        </div>
        <div class="content">${inner}</div>
      </section>
      <nav class="nav">
        ${tabs.map(([id, label]) => `<button class="${state.view === id ? 'active' : ''}" data-view="${id}"><b>${icon(id)}</b><span>${label}</span></button>`).join('')}
      </nav>
    </main>
  `
}

function titleForView() {
  const titles = {
    home: 'Solve city problems in under two minutes.',
    assistant: 'Ask the city, get an action plan.',
    projects: 'Your proof, packets, and reminders.',
    map: 'Nearby civic services.',
    profile: 'Household and professional plans.'
  }
  return titles[state.view]
}

function homeView() {
  return shell(`
    <section class="hero full">
      <h2>Address-aware help for ${state.borough}</h2>
      <p>Ask about waste, permits, parking, moving, municipal notices, or 311 reports. Paid value comes from saved evidence, reminders, and exportable packets.</p>
      <div class="hero-actions">
        <button class="btn primary" data-ask="Where do I dispose of paint?">Ask a question</button>
        <button class="btn green" data-project="Fence permit readiness">Start project</button>
      </div>
      <div class="meta">
        <span class="tag">${state.address}</span>
        <span class="tag">${state.language}</span>
        <span class="tag">Source confidence layer</span>
      </div>
    </section>
    <section class="grid full">
      ${modules.map(module => `
        <button class="card" data-module="${module.id}">
          <div class="icon">${module.icon}</div>
          <div><h3>${module.title}</h3><p>${module.body}</p></div>
          <div class="meta">${module.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>
        </button>
      `).join('')}
    </section>
    <section class="card full">
      <h2>Today</h2>
      <div class="list">
        ${reminders.slice(0, 3).map(item => `<div class="item"><div class="icon">•</div><div><strong>${item[0]} · ${item[1]}</strong><small>${item[2]}</small></div></div>`).join('')}
      </div>
    </section>
  `)
}

function assistantView() {
  const answer = state.lastAnswer
  return shell(`
    <section class="input-panel full">
      <h2>Municipal assistant</h2>
      <p>Type a civic problem. The MVP simulates intent detection, borough awareness, official-source warnings, and next steps.</p>
      <div class="form-grid">
        <textarea id="query" placeholder="Example: I am moving next Saturday and need parking guidance">${state.query}</textarea>
        <select id="borough">
          ${['Rosemont-La Petite-Patrie', 'Plateau-Mont-Royal', 'Ville-Marie', 'Villeray-Saint-Michel-Parc-Extension', 'Ahuntsic-Cartierville'].map(b => `<option ${b === state.borough ? 'selected' : ''}>${b}</option>`).join('')}
        </select>
        <button class="btn primary" data-run-assistant="true">Generate civic plan</button>
      </div>
    </section>
    ${answer ? answerCard(answer) : quickPrompts()}
  `)
}

function answerCard(answer) {
  return `
    <section class="answer full">
      <div>
        <div class="eyebrow">Draft answer</div>
        <h2>${answer.title}</h2>
      </div>
      <p>${answer.summary}</p>
      <div class="list">
        ${answer.steps.map((step, index) => `<div class="item"><div class="icon">${index + 1}</div><div><strong>${step}</strong><small>Saved to the project folder when the user upgrades or confirms.</small></div></div>`).join('')}
      </div>
      <p class="notice">${answer.warning}</p>
      <div class="source-row">
        <div><strong>Confidence</strong><small style="display:block;color:var(--muted)">Official-source check required before final advice</small></div>
        <div class="confidence">${answer.confidence}</div>
      </div>
      <div class="list">
        ${sources.map(source => `<div class="item"><div class="icon">↗</div><div><strong>${source.label}</strong><small>${source.date} · ${source.confidence}</small></div></div>`).join('')}
      </div>
      <button class="btn green" data-project="${answer.title}">Save as project</button>
    </section>
  `
}

function quickPrompts() {
  const prompts = ['Where do I dispose of paint?', 'Can I park here tonight?', 'I need a fence permit', 'Report a broken streetlight']
  return `<section class="grid full">${prompts.map(prompt => `<button class="card" data-ask="${prompt}"><div class="icon">✦</div><h3>${prompt}</h3><p>Generate an action plan with source warnings.</p></button>`).join('')}</section>`
}

function projectsView() {
  const selected = projects.find(project => project.title === state.selectedProject) || projects[0]
  return shell(`
    <section class="card full">
      <div class="top-row"><h2>Active projects</h2><span class="pill">${projects.length} files</span></div>
      <div class="list">
        ${projects.map(project => `
          <button class="item" data-project="${project.title}">
            <div class="icon">${project.icon}</div>
            <div style="flex:1"><strong>${project.title}</strong><small>${project.type} · ${project.status} · ${project.due}</small><div class="progress"><span style="width:${project.progress}%"></span></div></div>
          </button>
        `).join('')}
      </div>
    </section>
    <section class="report-preview full">
      <div class="eyebrow" style="color:#0a7cff">Client-ready export preview</div>
      <h2>${selected.title}</h2>
      <p>Project folder includes the address, borough context, checklist, source links, missing documents, reminders, photos, and unresolved questions for the city.</p>
      <div class="list">
        <div class="item" style="background:white;border-color:#dbe3ef"><div class="icon">1</div><div><strong>Known</strong><small>Borough and project type are identified.</small></div></div>
        <div class="item" style="background:white;border-color:#dbe3ef"><div class="icon">2</div><div><strong>Missing</strong><small>Dimensions, property photo, and final official form check.</small></div></div>
        <div class="item" style="background:white;border-color:#dbe3ef"><div class="icon">3</div><div><strong>Export</strong><small>Permit Readiness Packet is a paid output.</small></div></div>
      </div>
      <button class="btn primary" data-upgrade="Pro">Unlock PDF export</button>
    </section>
  `)
}

function mapView() {
  return shell(`
    <section class="mapbox full">
      ${services.map(service => `<button class="pin" style="left:${service[3]};top:${service[4]}">${service[0]}<small>${service[2]}</small></button>`).join('')}
    </section>
    <section class="card full">
      <h2>Nearby services</h2>
      <div class="list">
        ${services.map(service => `<div class="item"><div class="icon">⌖</div><div><strong>${service[0]}</strong><small>${service[1]} · ${service[2]} · Opens in Apple Maps or Google Maps</small></div></div>`).join('')}
      </div>
    </section>
  `)
}

function profileView() {
  return shell(`
    <section class="card full">
      <h2>Profile</h2>
      <div class="form-grid">
        <input id="address" value="${state.address}" />
        <select id="language"><option ${state.language === 'English' ? 'selected' : ''}>English</option><option ${state.language === 'French' ? 'selected' : ''}>French</option></select>
        <button class="btn primary" data-save-profile="true">Save profile</button>
      </div>
    </section>
    <section class="grid full">
      ${planCard('Free', '$0', 'Basic questions, waste search, permit guidance, official links, limited reminders.')}
      ${planCard('Household', '$9.99/mo', 'Saved projects, document explanation, moving planner, parking reminders, exportable household checklists.')}
      ${planCard('Pro', '$49/mo', 'Multiple addresses, permit packets, 311 case files, client-facing reports, photos, PDF summaries.')}
      ${planCard('Team', '$199+/mo', 'Shared workspace, roles, templates, team activity, onboarding, priority support.')}
    </section>
    <section class="card full locked">
      <h2>Admin quality layer</h2>
      <p>Internal dashboard tracks indexed sources, stale pages, failed ingestion, low-confidence answers, popular queries, and feedback review.</p>
    </section>
  `)
}

function planCard(name, price, body) {
  return `<button class="card ${state.plan === name ? 'answer' : ''}" data-upgrade="${name}"><div class="icon">${name[0]}</div><h3>${name}</h3><p><strong>${price}</strong></p><p>${body}</p></button>`
}

function render() {
  const views = { home: homeView, assistant: assistantView, projects: projectsView, map: mapView, profile: profileView }
  document.getElementById('app').innerHTML = views[state.view]()
  bind()
}

function bind() {
  document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => setView(button.dataset.view)))
  document.querySelectorAll('[data-action="profile"]').forEach(button => button.addEventListener('click', () => setView('profile')))
  document.querySelectorAll('[data-ask]').forEach(button => button.addEventListener('click', () => askNow(button.dataset.ask)))
  document.querySelectorAll('[data-module]').forEach(button => button.addEventListener('click', () => setView(button.dataset.module === 'pro' ? 'profile' : 'assistant')))
  document.querySelectorAll('[data-project]').forEach(button => button.addEventListener('click', () => startProject(button.dataset.project)))
  document.querySelectorAll('[data-upgrade]').forEach(button => button.addEventListener('click', () => upgrade(button.dataset.upgrade)))
  const run = document.querySelector('[data-run-assistant]')
  if (run) {
    run.addEventListener('click', () => {
      state.query = document.getElementById('query').value.trim()
      state.borough = document.getElementById('borough').value
      state.lastAnswer = inferAnswer(state.query)
      render()
    })
  }
  const saveProfile = document.querySelector('[data-save-profile]')
  if (saveProfile) {
    saveProfile.addEventListener('click', () => {
      state.address = document.getElementById('address').value.trim() || state.address
      state.language = document.getElementById('language').value
      state.view = 'home'
      render()
    })
  }
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {})
}

// Wire Google Play billing. In the native app cordova plugins are ready at
// `deviceready`; in the browser there is no bridge, so billing stays a no-op.
if (typeof window !== 'undefined' && window.cordova) {
  document.addEventListener('deviceready', () => initBilling(applyPlan), { once: true })
} else {
  initBilling(applyPlan)
}

render()
