import { businessRules, route, score } from "./scoring.js";

const steps = [
  { id: "routing", label: "Impact routing", code: "01 · ROUTING" },
  { id: "details", label: "Model details", code: "02 · SECTION 1" },
  { id: "assessment", label: "Risk assessment", code: "03 · SECTION 2" },
  { id: "evidence", label: "Evidence package", code: "04 · EVIDENCE" },
  { id: "review", label: "Review & generate", code: "05 · REVIEW" },
];

const form = document.querySelector("#intakeForm");
const nav = document.querySelector("#stepNav");
const nextBtn = document.querySelector("#nextBtn");
const backBtn = document.querySelector("#backBtn");
const validationMessage = document.querySelector("#validationMessage");
const routingResult = document.querySelector("#routingResult");
const assessmentResult = document.querySelector("#assessmentResult");
const scoreBreakdown = document.querySelector("#scoreBreakdown");
const missingSummary = document.querySelector("#missingSummary");
const playground = document.querySelector("#scorePlayground");
const playgroundTrigger = document.querySelector("#playgroundTrigger");
const playgroundForm = document.querySelector("#playgroundForm");
const STATIC_MODE = new URLSearchParams(location.search).get("browser") === "1" || !["localhost", "127.0.0.1"].includes(location.hostname);
let index = 0;

const promptFields = ["promptCallName", "promptCallPurpose", "promptCallText", "promptCallConstraints", "promptCallOutputFormat", "promptCallExampleInput", "promptCallExampleOutput", "promptCallVersion"];
const metricFields = ["metricName", "metricValue", "metricRationale", "metricGreen", "metricAmber", "metricRed"];
const fieldLabels = {
  solutionType: "GenAI solution type", regulatory: "Regulatory reporting use", purpose: "Purpose and business usage",
  useCaseName: "Use case name", modelOwner: "Model owner", businessUnit: "Business unit", implementationDate: "Implementation date", markets: "At least one market", otherMarket: "Other market", overview: "Use case overview", modelInputs: "Model inputs", generatedOutputs: "Generated outputs", modelName: "Model name", modelVersion: "Model version", hosting: "Hosting location", agentic: "Agentic AI response",
  endUsers: "Intended end users", businessProcess: "Business process", quantDriver: "Valid quantitative driver", impactThreshold: "Annual impact threshold", reliance: "Business importance / reliance", explainable: "Explainability", fineTuned: "Fine-tuning", multiCall: "Sequential LLM calls", downstream: "Downstream interdependency",
  sampleSize: "Sample size", metrics: "At least one complete performance metric", promptCalls: "Complete documentation for every LLM call", monitoringFrequency: "Monitoring frequency", attestation: "All five B70+ attestations", businessOwnerName: "B70+ business owner", businessOwnerTitle: "B70+ title", businessOwnerEmail: "B70+ email",
};
const stepForField = Object.fromEntries([
  ["routing", ["solutionType", "regulatory", "purpose"]],
  ["details", ["useCaseName", "modelOwner", "businessUnit", "implementationDate", "markets", "otherMarket", "overview", "modelInputs", "generatedOutputs", "modelName", "modelVersion", "hosting", "agentic"]],
  ["assessment", ["endUsers", "businessProcess", "quantDriver", "impactThreshold", "reliance", "explainable", "fineTuned", "multiCall", "downstream"]],
  ["evidence", ["sampleSize", "metrics", "promptCalls", "monitoringFrequency", "attestation", "businessOwnerName", "businessOwnerTitle", "businessOwnerEmail"]],
].flatMap(([stepId, names]) => names.map(name => [name, stepId])));

function esc(value) { return String(value ?? "").replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char])); }
function values(value) { return Array.isArray(value) ? value : value ? [value] : []; }

function addMetric(seed = {}) {
  const card = document.createElement("fieldset");
  card.className = "metric-card";
  card.innerHTML = `<legend>Metric <span class="metric-number"></span></legend><button type="button" class="remove-metric">Remove</button><div class="grid two">
    <label>Metric name <span class="req">*</span><input name="metricName" value="${esc(seed.metricName || "")}" placeholder="e.g., Accuracy"></label>
    <label>Observed value <span class="req">*</span><input name="metricValue" value="${esc(seed.metricValue || "")}" placeholder="e.g., 82%"></label>
  </div><label>Why this metric fits the use case <span class="req">*</span><textarea name="metricRationale" rows="3">${esc(seed.metricRationale || "")}</textarea></label>
  <div class="grid two"><label>Green threshold <span class="req">*</span><input name="metricGreen" value="${esc(seed.metricGreen || "")}" placeholder="e.g., Accuracy ≥ 80%"></label><label>Amber threshold <span class="req">*</span><input name="metricAmber" value="${esc(seed.metricAmber || "")}" placeholder="e.g., 65% ≤ Accuracy &lt; 80%"></label><label>Red threshold <span class="req">*</span><input name="metricRed" value="${esc(seed.metricRed || "")}" placeholder="e.g., Accuracy &lt; 65%"></label></div>`;
  document.querySelector("#metrics").append(card);
  renumberMetrics();
}
function renumberMetrics() {
  const cards = [...document.querySelectorAll(".metric-card")];
  cards.forEach((card, i) => { card.querySelector(".metric-number").textContent = String(i + 1); card.querySelector(".remove-metric").hidden = cards.length === 1; });
}
function metricsFromData(data = formData()) {
  const fields = Object.fromEntries(metricFields.map(field => [field, values(data[field])]));
  const count = Math.max(0, ...metricFields.map(field => fields[field].length));
  return Array.from({ length: count }, (_, i) => Object.fromEntries(metricFields.map(field => [field, fields[field][i] || ""])));
}

function addPromptCall(seed = {}) {
  const card = document.createElement("fieldset");
  card.className = "prompt-call";
  card.innerHTML = `<legend>LLM call <span class="call-number"></span></legend><button type="button" class="remove-call">Remove</button><div class="grid two">
    <label>Prompt name <span class="req">*</span><input name="promptCallName" value="${esc(seed.promptCallName || "")}" placeholder="e.g., Retrieval answer"></label>
    <label>Purpose <span class="req">*</span><input name="promptCallPurpose" value="${esc(seed.promptCallPurpose || "")}" placeholder="Why this call exists"></label>
    <label>Version <span class="req">*</span><input name="promptCallVersion" value="${esc(seed.promptCallVersion || "1.0")}" placeholder="1.0"></label>
    <label>Output format <span class="req">*</span><input name="promptCallOutputFormat" value="${esc(seed.promptCallOutputFormat || "")}" placeholder="JSON, prose, table…"></label>
  </div><label>Prompt structure <span class="req">*</span><textarea name="promptCallText" rows="5" placeholder="Exact prompt, placeholders, and context">${esc(seed.promptCallText || "")}</textarea></label>
  <label>Policies and constraints <span class="req">*</span><textarea name="promptCallConstraints" rows="3" placeholder="Rules, safety constraints, and access boundaries">${esc(seed.promptCallConstraints || "")}</textarea></label>
  <div class="grid two"><label>Example input <span class="req">*</span><textarea name="promptCallExampleInput" rows="3">${esc(seed.promptCallExampleInput || "")}</textarea></label><label>Example output <span class="req">*</span><textarea name="promptCallExampleOutput" rows="3">${esc(seed.promptCallExampleOutput || "")}</textarea></label></div>`;
  document.querySelector("#promptCalls").append(card);
  renumberCalls();
}
function renumberCalls() {
  const cards = [...document.querySelectorAll(".prompt-call")];
  cards.forEach((card, i) => { card.querySelector(".call-number").textContent = String(i + 1); card.querySelector(".remove-call").hidden = cards.length === 1; });
}

function formData() {
  const data = {};
  new FormData(form).forEach((value, key) => {
    if (value instanceof File) return;
    if (Object.hasOwn(data, key)) data[key] = Array.isArray(data[key]) ? [...data[key], value] : [data[key], value];
    else data[key] = value;
  });
  return data;
}

function activeSteps() { const routed = route(); return routed.complete && !routed.needsAssessment ? steps.filter(step => step.id !== "assessment") : steps; }
function setNamed(name, value) {
  const elements = [...form.querySelectorAll(`[name="${name}"]`)];
  for (const [i, element] of elements.entries()) {
    if (["radio", "checkbox"].includes(element.type)) element.checked = element.value === value || (Array.isArray(value) && value.includes(element.value));
    else element.value = Array.isArray(value) ? (value[i] ?? "") : value;
  }
}

function updateDriverRules(preserve = true) {
  const process = form.elements.businessProcess.value;
  const select = form.elements.quantDriver;
  const prior = preserve ? select.value : "";
  const drivers = Object.keys(businessRules[process] || {});
  select.innerHTML = `<option value="">${drivers.length ? "Select" : "Choose a business process first"}</option>` + drivers.map(driver => `<option>${esc(driver)}</option>`).join("");
  if (drivers.includes(prior)) select.value = prior;
  const bands = businessRules[process]?.[select.value];
  [["smallBand", 0, 1], ["mediumBand", 1, 2], ["largeBand", 2, 3]].forEach(([id, band, qn]) => document.querySelector(`#${id}`).innerHTML = bands ? `${esc(bands[band])} · <code>qn = ${qn}</code>` : `<code>qn = ${qn}</code>`);
}

function syncApplicability() {
  const general = form.querySelector('[name="solutionType"]:checked')?.value === "general";
  for (const name of ["regulatory", "purpose"]) {
    const fieldset = form.querySelector(`fieldset[data-required="${name}"]`); fieldset.classList.toggle("not-applicable", general);
    fieldset.querySelectorAll("input").forEach(input => { input.disabled = general; if (general) input.checked = false; });
  }
  const other = form.querySelector('[name="markets"][value="Other"]')?.checked;
  form.elements.otherMarket.disabled = !other; form.elements.otherMarket.required = Boolean(other); document.querySelector("#otherMarketLabel").classList.toggle("not-applicable", !other);
}

function renderDecision() {
  const routed = route(); routingResult.hidden = !routed.complete;
  if (routed.complete) routingResult.innerHTML = `<strong>${esc(routed.tier)}</strong><p>${esc(routed.reason)}</p>`;
  const result = score(); assessmentResult.className = `decision-card ${result.tier.toLowerCase()}`;
  assessmentResult.innerHTML = !result.complete ? `<strong>MIC pending</strong><p>${esc(result.reason)}</p>` : result.earlyExit ? `<strong>Low</strong><p>Early-exit route; MIC is not calculated and Section 2 is omitted.</p>` : `<strong>${esc(result.tier)} · MIC ${result.score.toFixed(2)}</strong><p>0.4 × qn + 0.4 × ql + 0.1 × cx + 0.1 × dd</p>`;
  scoreBreakdown.innerHTML = result.components ? [["qn", result.components.qn, "40%", .4], ["ql", result.components.ql, "40%", .4], ["cx", result.components.cx, "10%", .1], ["dd", result.components.dd, "10%", .1]].map(([name, value, weight, factor]) => `<div><span>${name} · ${weight}</span><strong>${value}</strong><small>contributes ${(factor * value).toFixed(2)}</small></div>`).join("") : `<div class="score-empty"><span>MIC components</span><strong>—</strong><small>${esc(result.reason)}</small></div>`;
}

function requirementList(data = formData()) {
  const required = ["solutionType"];
  if (data.solutionType !== "general") required.push("regulatory", "purpose");
  required.push("useCaseName", "modelOwner", "businessUnit", "implementationDate", "markets", "overview", "modelInputs", "generatedOutputs", "modelName", "modelVersion", "hosting", "agentic");
  if (values(data.markets).includes("Other")) required.push("otherMarket");
  if (route(data).needsAssessment) required.push("endUsers", "businessProcess", "quantDriver", "impactThreshold", "reliance", "explainable", "fineTuned", "multiCall", "downstream");
  required.push("sampleSize", "metrics", "promptCalls", "monitoringFrequency", "attestation", "businessOwnerName", "businessOwnerTitle", "businessOwnerEmail");
  return required;
}

function missingFields(data = formData()) {
  const missing = [];
  for (const name of requirementList(data)) {
    if (name === "attestation" && !["accurate", "eu", "controls", "risk", "scope"].every(value => values(data.attestation).includes(value))) missing.push(name);
    else if (name === "markets" && !values(data.markets).length) missing.push(name);
    else if (name === "metrics") {
      const metrics = metricsFromData(data);
      if (!metrics.length || metrics.some(metric => metricFields.some(field => !String(metric[field]).trim()))) missing.push(name);
    } else if (name === "promptCalls") {
      const count = document.querySelectorAll(".prompt-call").length;
      if (!count || promptFields.some(field => values(data[field]).length !== count || values(data[field]).some(value => !String(value).trim())) || (data.multiCall === "yes" && count < 3)) missing.push(name);
    } else if (!String(data[name] ?? "").trim()) missing.push(name);
  }
  if (route(data).needsAssessment && !businessRules[data.businessProcess]?.[data.quantDriver]) missing.push("quantDriver");
  if (data.sampleSize && Number(data.sampleSize) < 1) missing.push("sampleSize");
  return [...new Set(missing)];
}

function markInvalid(missing) {
  form.querySelectorAll(".invalid").forEach(element => element.classList.remove("invalid")); form.querySelectorAll('[aria-invalid="true"]').forEach(element => element.removeAttribute("aria-invalid"));
  for (const name of missing) {
    if (name === "metrics") document.querySelector("#metrics").classList.add("invalid");
    if (name === "promptCalls") document.querySelector("#promptCalls").classList.add("invalid");
    const fieldset = form.querySelector(`fieldset[data-required="${name}"], fieldset[data-required-all="${name}"]`); if (fieldset) fieldset.classList.add("invalid");
    form.querySelectorAll(`[name="${name}"]`).forEach(element => element.setAttribute("aria-invalid", "true"));
  }
}
function showMissingSummary(missing) {
  if (!missing.length) { missingSummary.hidden = true; missingSummary.innerHTML = ""; return; }
  const grouped = {}; for (const name of missing) (grouped[stepForField[name]] ||= []).push(fieldLabels[name]);
  missingSummary.hidden = false; missingSummary.innerHTML = `<strong>${missing.length} required item${missing.length === 1 ? "" : "s"} remain</strong><p>Open a section below to complete it.</p><div>${Object.entries(grouped).map(([stepId, labels]) => `<button type="button" data-jump="${stepId}"><span>${esc(steps.find(step => step.id === stepId)?.label || stepId)}</span><small>${esc(labels.join(" · "))}</small></button>`).join("")}</div>`;
}

function updateNavigation() {
  const active = activeSteps(), missing = missingFields();
  for (const element of nav.querySelectorAll(".nav-step")) {
    const activeIndex = active.findIndex(step => step.id === element.dataset.nav); element.hidden = activeIndex < 0; element.classList.toggle("active", active[index]?.id === element.dataset.nav);
    const incomplete = missing.some(name => stepForField[name] === element.dataset.nav); element.classList.toggle("complete", activeIndex >= 0 && !incomplete && element.dataset.nav !== "review"); element.querySelector("i").textContent = activeIndex < 0 ? "—" : !incomplete && element.dataset.nav !== "review" ? "✓" : String(activeIndex + 1).padStart(2, "0");
  }
  const required = requirementList(), pct = required.length ? Math.round((required.length - missing.length) / required.length * 100) : 0, ring = document.querySelector("#progressRing"); ring.style.setProperty("--p", pct); ring.querySelector("span").textContent = `${pct}%`; ring.setAttribute("aria-label", `${pct}% of required fields complete`);
}
function review() {
  const data = formData(), routed = route(data), result = score(data), markets = values(data.markets).join(", ") || "—";
  document.querySelector("#reviewSummary").innerHTML = [["Use case", data.useCaseName || "—"], ["Model", `${data.modelName || "—"} ${data.modelVersion || ""}`], ["Routing", routed.tier], ["Final impact", result.score == null ? result.tier : `${result.tier} · MIC ${result.score.toFixed(2)}`], ["Section 2", routed.needsAssessment ? "Included and completed" : "Not required for this route"], ["Markets", markets], ["Metrics", document.querySelectorAll(".metric-card").length], ["LLM calls", document.querySelectorAll(".prompt-call").length], ["Output", "7 core files plus optional support"]].map(([key, value]) => `<div class="review-item"><span>${esc(key)}</span><strong>${esc(value)}</strong></div>`).join("");
  showMissingSummary(missingFields(data));
}
function render(scroll = true) {
  const active = activeSteps(); if (index >= active.length) index = active.length - 1; const current = active[index];
  document.querySelectorAll(".step").forEach(section => section.classList.toggle("active", section.dataset.step === current.id)); document.querySelector("#pageTitle").textContent = current.label; document.querySelector("#stepLabel").textContent = current.code; backBtn.style.visibility = index === 0 ? "hidden" : "visible"; nextBtn.style.display = current.id === "review" ? "none" : "block"; document.querySelector(".form-actions").style.display = current.id === "review" ? "none" : "grid"; validationMessage.textContent = ""; updateNavigation(); if (current.id === "review") review(); if (scroll) window.scrollTo({ top: 0, behavior: "smooth" });
}

function saveDraft() { localStorage.setItem("mrmg-first-line-draft", JSON.stringify(formData())); document.querySelector("#autosave").textContent = `Saved ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`; }
function restoreDraft() {
  const raw = localStorage.getItem("mrmg-first-line-draft"); if (!raw) return;
  try {
    const data = JSON.parse(raw), count = Math.max(1, values(data.promptCallName).length);
    const legacyMetrics = data.metricName ? null : [{ metricName: data.metric1, metricValue: data.metric1Value, metricRationale: data.metric1Rationale, metricGreen: data.metric1Green, metricAmber: data.metric1Amber, metricRed: data.metric1Red }, ...(data.metric2 ? [{ metricName: data.metric2, metricValue: data.metric2Value, metricRationale: data.metric2Rationale, metricGreen: data.metric2Green, metricAmber: data.metric2Amber, metricRed: data.metric2Red }] : [])];
    const metricCount = Math.max(1, legacyMetrics ? legacyMetrics.length : values(data.metricName).length);
    while (document.querySelectorAll(".prompt-call").length < count) addPromptCall();
    while (document.querySelectorAll(".metric-card").length < metricCount) addMetric();
    if (legacyMetrics) legacyMetrics.forEach((metric, i) => metricFields.forEach(field => { const element = form.querySelectorAll(`[name="${field}"]`)[i]; if (element) element.value = metric[field] || ""; }));
    for (const [name, value] of Object.entries(data)) if (name !== "quantDriver" && !name.startsWith("metric1") && !name.startsWith("metric2")) setNamed(name, value);
    updateDriverRules(false); setNamed("quantDriver", data.quantDriver || ""); updateDriverRules(true);
  } catch (_) { localStorage.removeItem("mrmg-first-line-draft"); }
}
function applyScenario(name) {
  const scenarios = { low: { impactThreshold: "small", reliance: "multiple", explainable: "yes", fineTuned: "no", multiCall: "no", downstream: "none" }, medium: { impactThreshold: "small", reliance: "human", explainable: "no", fineTuned: "yes", multiCall: "no", downstream: "none" }, high: { impactThreshold: "medium", reliance: "direct", explainable: "yes", fineTuned: "no", multiCall: "no", downstream: "none" }, critical: { impactThreshold: "large", reliance: "direct", explainable: "no", fineTuned: "yes", multiCall: "yes", downstream: "many" } };
  setNamed("solutionType", "custom"); setNamed("regulatory", name === "critical" ? "yes" : "no"); setNamed("purpose", "core"); setNamed("endUsers", name === "low" ? "none" : name === "medium" ? "internal" : "customer"); setNamed("businessProcess", "Credit and Fraud Risk"); updateDriverRules(false); setNamed("quantDriver", "Adverse Action Volume"); updateDriverRules(true); for (const [field, value] of Object.entries(scenarios[name])) setNamed(field, value); syncApplicability(); renderDecision(); saveDraft(); render(false);
}

const playgroundPresets = {
  general: { solutionType: "general", regulatory: "no", purpose: "efficiency", endUsers: "internal", impactThreshold: "small", reliance: "multiple", explainabilityRisk: false, fineTuned: false, multiCall: false, downstream: "none" },
  customLow: { solutionType: "custom", regulatory: "no", purpose: "customerExperience", endUsers: "customer", impactThreshold: "small", reliance: "multiple", explainabilityRisk: false, fineTuned: false, multiCall: false, downstream: "none" },
  scoredLow: { solutionType: "custom", regulatory: "no", purpose: "core", endUsers: "none", impactThreshold: "small", reliance: "multiple", explainabilityRisk: false, fineTuned: false, multiCall: false, downstream: "none" },
  medium: { solutionType: "custom", regulatory: "no", purpose: "core", endUsers: "internal", impactThreshold: "small", reliance: "human", explainabilityRisk: true, fineTuned: true, multiCall: false, downstream: "none" },
  high: { solutionType: "custom", regulatory: "no", purpose: "core", endUsers: "customer", impactThreshold: "medium", reliance: "direct", explainabilityRisk: false, fineTuned: false, multiCall: false, downstream: "none" },
  critical: { solutionType: "custom", regulatory: "yes", purpose: "core", endUsers: "customer", impactThreshold: "large", reliance: "direct", explainabilityRisk: true, fineTuned: true, multiCall: true, downstream: "many" },
};

function playgroundData() {
  const values = Object.fromEntries(new FormData(playgroundForm));
  return {
    solutionType: values.simSolutionType,
    regulatory: values.simRegulatory,
    purpose: values.simPurpose,
    endUsers: values.simEndUsers,
    impactThreshold: values.simImpactThreshold,
    reliance: values.simReliance,
    explainable: playgroundForm.elements.simExplainabilityRisk.checked ? "no" : "yes",
    fineTuned: playgroundForm.elements.simFineTuned.checked ? "yes" : "no",
    multiCall: playgroundForm.elements.simMultiCall.checked ? "yes" : "no",
    downstream: values.simDownstream,
  };
}

function setPlaygroundPreset(name) {
  const preset = playgroundPresets[name];
  if (!preset) return;
  playgroundForm.elements.simSolutionType.value = preset.solutionType;
  playgroundForm.elements.simRegulatory.value = preset.regulatory;
  playgroundForm.elements.simPurpose.value = preset.purpose;
  playgroundForm.elements.simEndUsers.value = preset.endUsers;
  playgroundForm.elements.simImpactThreshold.value = preset.impactThreshold;
  playgroundForm.elements.simReliance.value = preset.reliance;
  playgroundForm.elements.simExplainabilityRisk.checked = preset.explainabilityRisk;
  playgroundForm.elements.simFineTuned.checked = preset.fineTuned;
  playgroundForm.elements.simMultiCall.checked = preset.multiCall;
  playgroundForm.elements.simDownstream.value = preset.downstream;
  renderPlayground();
  document.querySelectorAll("[data-playground-preset]").forEach(button => button.classList.toggle("active", button.dataset.playgroundPreset === name));
}

function renderPlayground() {
  const data = playgroundData();
  const routed = route(data);
  const result = score(data);
  const earlyExit = result.earlyExit;
  const routeDependent = playgroundForm.querySelector(".sim-route-dependent");
  const assessmentControls = document.querySelector("#simAssessmentControls");
  routeDependent.hidden = data.solutionType === "general";
  assessmentControls.classList.toggle("is-muted", earlyExit);
  assessmentControls.setAttribute("aria-disabled", String(earlyExit));
  document.querySelector("#simRegulatoryNote").hidden = data.regulatory !== "yes" || earlyExit;
  document.querySelectorAll("[data-playground-preset]").forEach(button => button.classList.remove("active"));

  const tier = result.complete ? result.tier : "Pending";
  const orbit = document.querySelector("#simTierOrbit");
  orbit.className = `sim-tier-orbit ${tier.toLowerCase()}`;
  document.querySelector("#simTier").textContent = tier;
  document.querySelector("#simResultMode").textContent = earlyExit ? "Routing outcome" : "Scored pathway";
  document.querySelector("#simSectionOutcome").textContent = earlyExit ? "Section 2 omitted" : "Section 2 required";
  document.querySelector("#simScore").textContent = earlyExit ? "—" : result.score.toFixed(2);
  document.querySelector("#simScoreCaption").textContent = earlyExit ? "MIC not calculated" : "calculated MIC";
  document.querySelector("#simMobileTier").textContent = tier;
  document.querySelector("#simMobileScore").textContent = earlyExit ? "Section 1 only" : result.score.toFixed(2);
  document.querySelector("#simResultCopy").textContent = earlyExit
    ? `${routed.reason} The model still completes Section 1 and the evidence package.`
    : `The weighted inputs produce a ${result.score.toFixed(2)} MIC, which falls in the ${result.tier} band.`;

  const scale = document.querySelector("#simScaleWrap");
  scale.hidden = earlyExit;
  if (!earlyExit) document.querySelector("#simMarker").style.left = `${Math.max(0, Math.min(100, result.score / 3 * 100))}%`;

  const components = document.querySelector("#simComponents");
  if (earlyExit) {
    components.className = "sim-components is-empty";
    components.innerHTML = `<div class="sim-component"><span>Scoring bypassed</span><strong>Section 1 only</strong><small>No qn, ql, cx, or dd components are calculated on an early-exit route.</small></div>`;
  } else {
    components.className = "sim-components";
    components.innerHTML = [["qn", result.components.qn, "40%", .4], ["ql", result.components.ql, "40%", .4], ["cx", result.components.cx, "10%", .1], ["dd", result.components.dd, "10%", .1]].map(([name, value, weight, factor]) => `<div class="sim-component"><span>${name} · ${weight}</span><strong>${value}</strong><small>adds ${(value * factor).toFixed(2)}</small></div>`).join("");
  }

  const purposeLabels = { core: "core payments or lending", peopleCompliance: "people, compliance, legal, or regulatory", customerExperience: "customer experience", efficiency: "colleague efficiency" };
  const trace = data.solutionType === "general" ? [
    "General-purpose capability selected.",
    "Regulatory-use and business-purpose questions are bypassed.",
    "Low Impact route: complete Section 1; Section 2 is omitted.",
  ] : earlyExit ? [
    "Customized business solution selected.",
    `No regulatory-reporting use and ${purposeLabels[data.purpose]} purpose qualify for the early exit.`,
    "Low Impact route: complete Section 1; Section 2 is omitted.",
  ] : [
    "Customized solution does not qualify for an early exit.",
    data.regulatory === "yes" ? "Regulatory-reporting use forces qn to 3." : `The ${purposeLabels[data.purpose]} purpose proceeds to the weighted assessment.`,
    `qn ${result.components.qn} + ql ${result.components.ql} + cx ${result.components.cx} + dd ${result.components.dd} produces ${result.score.toFixed(2)} (${result.tier}).`,
  ];
  document.querySelector("#simTrace").innerHTML = trace.map(item => `<li>${esc(item)}</li>`).join("");
  document.querySelector("#simApplyStatus").textContent = "The playground is isolated from your saved draft until you use this button.";
}

function applyPlaygroundToIntake() {
  const data = playgroundData();
  setNamed("solutionType", data.solutionType);
  if (data.solutionType === "custom") { setNamed("regulatory", data.regulatory); setNamed("purpose", data.purpose); }
  if (route(data).needsAssessment) {
    setNamed("endUsers", data.endUsers); setNamed("impactThreshold", data.impactThreshold); setNamed("reliance", data.reliance); setNamed("explainable", data.explainable); setNamed("fineTuned", data.fineTuned); setNamed("multiCall", data.multiCall); setNamed("downstream", data.downstream);
    setNamed("businessProcess", "Credit and Fraud Risk"); updateDriverRules(false); setNamed("quantDriver", "Adverse Action Volume"); updateDriverRules(true);
  }
  syncApplicability(); renderDecision(); saveDraft(); index = 0; render();
  document.querySelector("#simApplyStatus").textContent = "Scenario copied to the intake routing and assessment fields.";
  setTimeout(() => playground.close(), 450);
}

async function payloadWithFiles() {
  const data = formData(), files = [...document.querySelector("#supportingFiles").files];
  if (files.some(file => file.size > 8_000_000) || files.reduce((sum, file) => sum + file.size, 0) > 20_000_000) throw new Error("Supporting files must be 8 MB or less each and 20 MB or less in total.");
  data.supportingFiles = await Promise.all(files.map(file => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onerror = () => reject(reader.error); reader.onload = () => resolve({ name: file.name, data: String(reader.result).split(",")[1] }); reader.readAsDataURL(file); })));
  return data;
}
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = filename; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

nav.innerHTML = steps.map(step => `<button type="button" class="nav-step" data-nav="${step.id}"><i>01</i><span>${esc(step.label)}</span></button>`).join(""); addMetric(); addPromptCall();
nav.addEventListener("click", event => { const button = event.target.closest("[data-nav]"); if (!button) return; const target = activeSteps().findIndex(step => step.id === button.dataset.nav); if (target >= 0) { index = target; render(); } });
form.addEventListener("change", event => { if (["solutionType", "markets"].includes(event.target.name)) syncApplicability(); if (event.target.name === "businessProcess") updateDriverRules(false); if (event.target.name === "quantDriver") updateDriverRules(true); renderDecision(); saveDraft(); render(false); });
form.addEventListener("input", event => { event.target.removeAttribute("aria-invalid"); event.target.closest("fieldset")?.classList.remove("invalid"); document.querySelector("#metrics").classList.remove("invalid"); document.querySelector("#promptCalls").classList.remove("invalid"); saveDraft(); updateNavigation(); if (activeSteps()[index]?.id === "review") review(); });
document.querySelector("#addMetric").addEventListener("click", () => { addMetric(); saveDraft(); updateNavigation(); });
document.querySelector("#metrics").addEventListener("click", event => { const button = event.target.closest(".remove-metric"); if (!button) return; button.closest(".metric-card").remove(); renumberMetrics(); saveDraft(); updateNavigation(); });
document.querySelector("#addPromptCall").addEventListener("click", () => { addPromptCall(); saveDraft(); updateNavigation(); });
document.querySelector("#promptCalls").addEventListener("click", event => { const button = event.target.closest(".remove-call"); if (!button) return; button.closest(".prompt-call").remove(); renumberCalls(); saveDraft(); updateNavigation(); });
nextBtn.addEventListener("click", () => { const current = activeSteps()[index], left = missingFields().filter(name => stepForField[name] === current.id).length; if (left) validationMessage.textContent = `${left} required item${left === 1 ? "" : "s"} remain here; you can return later.`; index = Math.min(index + 1, activeSteps().length - 1); render(); });
backBtn.addEventListener("click", () => { index = Math.max(0, index - 1); render(); });
document.querySelectorAll("[data-scenario]").forEach(button => button.addEventListener("click", () => applyScenario(button.dataset.scenario)));
function openPlayground() {
  if (!playground.open) playground.showModal();
  playgroundTrigger.setAttribute("aria-expanded", "true"); renderPlayground();
  if (location.hash !== "#score-playground") history.replaceState(null, "", `${location.pathname}${location.search}#score-playground`);
  document.querySelector("#playgroundClose").focus();
}
playgroundTrigger.addEventListener("click", openPlayground);
document.querySelector("#playgroundClose").addEventListener("click", () => playground.close());
playground.addEventListener("close", () => { playgroundTrigger.setAttribute("aria-expanded", "false"); if (location.hash === "#score-playground") history.replaceState(null, "", `${location.pathname}${location.search}`); playgroundTrigger.focus(); });
playground.addEventListener("click", event => { if (event.target === playground) playground.close(); });
playgroundForm.addEventListener("input", renderPlayground);
playgroundForm.addEventListener("change", renderPlayground);
document.querySelectorAll("[data-playground-preset]").forEach(button => button.addEventListener("click", () => setPlaygroundPreset(button.dataset.playgroundPreset)));
document.querySelector("#applyPlayground").addEventListener("click", applyPlaygroundToIntake);
missingSummary.addEventListener("click", event => { const button = event.target.closest("[data-jump]"); if (!button) return; const target = activeSteps().findIndex(step => step.id === button.dataset.jump); if (target >= 0) { index = target; render(); } });
document.querySelector("#resetBtn").addEventListener("click", () => { if (!confirm("Reset the locally saved draft?")) return; form.reset(); document.querySelector("#metrics").innerHTML = ""; document.querySelector("#promptCalls").innerHTML = ""; addMetric(); addPromptCall(); localStorage.removeItem("mrmg-first-line-draft"); index = 0; updateDriverRules(false); syncApplicability(); renderDecision(); render(); });
document.querySelector("#generateBtn").addEventListener("click", async () => {
  const button = document.querySelector("#generateBtn"), status = document.querySelector("#generationStatus"), missing = missingFields(); markInvalid(missing); showMissingSummary(missing);
  if (missing.length) { status.textContent = "Generation paused until all applicable required fields are complete."; missingSummary.scrollIntoView({ behavior: "smooth", block: "center" }); return; }
  button.disabled = true;
  try {
    if (STATIC_MODE) { status.textContent = "Creating the Word, Excel, email, JSON, and ZIP package on this device…"; const { generateBrowserPackage } = await import("./browser-generator.js"); const result = await generateBrowserPackage({ ...formData(), impactTier: score().tier, assessmentScore: score().score, assessmentComponents: score().components, section2Included: route().needsAssessment }, [...document.querySelector("#supportingFiles").files]); downloadBlob(result.blob, result.filename); status.textContent = result.summary; }
    else { status.textContent = "Generating and validating the document, workbook, and email package…"; const response = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(await payloadWithFiles()) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || "Generation failed"); status.innerHTML = `Package generated successfully. <a href="${esc(result.download)}">Download ${esc(result.filename)}</a><br>${esc(result.summary)}`; }
  } catch (error) { status.textContent = `Could not generate: ${error.message}`; } finally { button.disabled = false; }
});

if (STATIC_MODE) { const button = document.querySelector("#generateBtn"); button.querySelector("span").textContent = "Generate submission package"; button.querySelector("small").textContent = "Word + Excel + email + JSON + ZIP · stays on this device"; }
restoreDraft(); updateDriverRules(true); syncApplicability(); renderDecision(); render(false); setPlaygroundPreset("high"); if (location.hash === "#score-playground") openPlayground();
