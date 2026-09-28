import JSZip from "jszip";
import { SECOND_LINE_GROUPS, extractFieldsFromSubmissionJson, extractFieldsFromText, mergeExtractedFields } from "./second-line-fields.js";
import { generateValidationReport, validationReportFilename } from "./second-line-generator.js";

const dialog = document.querySelector("#secondLinePortal");
const trigger = document.querySelector("#secondLineTrigger");
const gate = document.querySelector("#secondLineGate");
const workspace = document.querySelector("#secondLineWorkspace");
const accessForm = document.querySelector("#secondLineAccessForm");
const fieldForm = document.querySelector("#secondLineFields");
const panels = [...document.querySelectorAll("[data-second-line-panel]")];
const navButtons = [...document.querySelectorAll("[data-second-line-stage]")];
const stageOrder = ["evidence", "review", "generate"];
let stageIndex = 0;
let fields = {};
let evidence = [];

function esc(value) {
  return String(value ?? "").replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}

function formatBytes(size) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function nonblankCount() { return Object.values(fields).filter(value => String(value || "").trim()).length; }
function fieldCount(values) { return Object.values(values || {}).filter(value => String(value ?? "").trim()).length; }

function inputMarkup(name, label, type, options) {
  const current = String(fields[name] || "");
  const wide = type === "textarea" ? " wide" : "";
  if (type === "textarea") return `<label class="${wide.trim()}">${esc(label)}<textarea name="${esc(name)}" rows="3" placeholder="Leave blank if evidence is unavailable">${esc(current)}</textarea></label>`;
  if (type === "select") return `<label>${esc(label)}<select name="${esc(name)}">${options.map(option => `<option value="${esc(option)}"${current === option ? " selected" : ""}>${esc(option || "Leave blank")}</option>`).join("")}</select></label>`;
  return `<label>${esc(label)}<input name="${esc(name)}" type="${type === "date" ? "date" : "text"}" value="${esc(current)}" placeholder="Leave blank if unavailable"></label>`;
}

function renderFields() {
  fieldForm.innerHTML = SECOND_LINE_GROUPS.map((group, index) => {
    const count = group.fields.filter(([name]) => String(fields[name] || "").trim()).length;
    return `<details class="second-line-field-group"${index === 0 ? " open" : ""}><summary><div><strong>${esc(group.title)}</strong><small>${esc(group.description)}</small></div><span>${count} / ${group.fields.length} populated</span></summary><div class="second-line-field-grid">${group.fields.map(([name, label, type = "text", options = []]) => inputMarkup(name, label, type, options)).join("")}</div></details>`;
  }).join("");
  updateCounts();
}

function updateCounts() {
  const count = nonblankCount();
  document.querySelector("#secondLineFieldCount").textContent = String(count);
  document.querySelector("#secondLineGreenCount").textContent = String(count);
  document.querySelector("#secondLineFilename").textContent = validationReportFilename(fields);
}

function renderEvidence() {
  const list = document.querySelector("#secondLineEvidenceList");
  list.innerHTML = evidence.map(item => `<div class="evidence-item${item.ok ? "" : " failed"}"><span>${esc(item.extension)}</span><div><strong>${esc(item.name)}</strong><small>${esc(item.detail)}</small></div><i>${item.ok ? `${item.recognized} recognized · ${item.added} added` : "Review needed"}</i></div>`).join("");
}

function renderStage() {
  const stage = stageOrder[stageIndex];
  panels.forEach(panel => panel.classList.toggle("active", panel.dataset.secondLinePanel === stage));
  navButtons.forEach(button => button.classList.toggle("active", button.dataset.secondLineStage === stage));
  document.querySelector("#secondLineBack").style.visibility = stageIndex === 0 ? "hidden" : "visible";
  const next = document.querySelector("#secondLineNext");
  next.style.visibility = stageIndex === stageOrder.length - 1 ? "hidden" : "visible";
  document.querySelector("#secondLineStageLabel").textContent = ({ evidence: "Evidence intake", review: "Review fields", generate: "Generate report" })[stage];
  if (stage === "review") renderFields();
  if (stage === "generate") updateCounts();
}

function setUnlocked(unlocked) {
  gate.hidden = unlocked;
  workspace.hidden = !unlocked;
  if (unlocked) renderStage();
}

function openSecondLine() {
  document.querySelectorAll("dialog[open]").forEach(openDialog => { if (openDialog !== dialog) openDialog.close(); });
  if (!dialog.open) dialog.showModal();
  trigger.setAttribute("aria-expanded", "true");
  setUnlocked(sessionStorage.getItem("mrmg-second-line-unlocked") === "1");
  if (location.hash !== "#second-line") history.replaceState(null, "", `${location.pathname}${location.search}#second-line`);
  requestAnimationFrame(() => (workspace.hidden ? document.querySelector("#secondLinePassword") : document.querySelector("#secondLineFiles")).focus());
}

function decodeXml(value) {
  return new DOMParser().parseFromString(`<root>${value}</root>`, "application/xml").documentElement.textContent || "";
}

function xmlToText(xml) {
  return decodeXml(xml.replace(/<w:tab\s*\/>/g, "\t").replace(/<w:br\s*\/>/g, "\n").replace(/<\/w:p>/g, "\n").replace(/<\/w:tr>/g, "\n").replace(/<[^>]+>/g, ""));
}

async function docxText(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const documentXml = zip.file("word/document.xml");
  if (!documentXml) throw new Error("The Word file does not contain document text.");
  return xmlToText(await documentXml.async("text"));
}

async function xlsxText(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const sharedFile = zip.file("xl/sharedStrings.xml");
  const shared = sharedFile ? [...(await sharedFile.async("text")).matchAll(/<si[^>]*>([\s\S]*?)<\/si>/g)].map(match => xmlToText(match[1])) : [];
  const sheets = Object.values(zip.files).filter(file => /^xl\/worksheets\/sheet\d+\.xml$/.test(file.name));
  const rows = [];
  for (const sheet of sheets) {
    const xml = await sheet.async("text");
    for (const row of xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
      const cells = [];
      for (const cell of row[1].matchAll(/<c([^>]*)>([\s\S]*?)<\/c>/g)) {
        const type = cell[1].match(/\bt="([^"]+)"/)?.[1] || "";
        const raw = cell[2].match(/<v[^>]*>([\s\S]*?)<\/v>/)?.[1] ?? cell[2].match(/<t[^>]*>([\s\S]*?)<\/t>/)?.[1] ?? "";
        cells.push(type === "s" ? (shared[Number(raw)] || "") : decodeXml(raw));
      }
      if (cells.some(Boolean)) rows.push(cells.length === 2 ? `${cells[0]}: ${cells[1]}` : cells.join(" | "));
    }
  }
  return rows.join("\n");
}

async function pdfText(buffer) {
  const [{ getDocument, GlobalWorkerOptions }, { default: workerUrl }] = await Promise.all([
    import("pdfjs-dist/legacy/build/pdf.mjs"),
    import("pdfjs-dist/legacy/build/pdf.worker.mjs?url"),
  ]);
  GlobalWorkerOptions.workerSrc = workerUrl;
  const pdf = await getDocument({ data: new Uint8Array(buffer) }).promise;
  const pages = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(content.items.map(item => item.str).join(" "));
  }
  const text = pages.join("\n").trim();
  if (!text) throw new Error("No searchable text was found. Review the fields manually or use an OCR-searchable PDF.");
  return text;
}

async function fileText(file) {
  const extension = file.name.split(".").pop().toLowerCase();
  if (["txt", "csv", "json", "md"].includes(extension)) return file.text();
  const buffer = await file.arrayBuffer();
  if (["docx", "docm"].includes(extension)) return docxText(buffer);
  if (extension === "xlsx") return xlsxText(buffer);
  if (extension === "pdf") return pdfText(buffer);
  throw new Error("Unsupported file type.");
}

async function fieldsFromZip(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const supported = /\.(?:docx|docm|xlsx|pdf|csv|json|md|txt)$/i;
  const entries = Object.values(zip.files).filter(entry => !entry.dir && supported.test(entry.name) && !entry.name.startsWith("__MACOSX/")).slice(0, 30);
  if (!entries.length) throw new Error("No supported evidence files were found in this ZIP.");
  let extracted = {};
  let authoritative = {};
  let reviewed = 0;
  for (const entry of entries) {
    const extension = entry.name.split(".").pop().toLowerCase();
    const bytes = await entry.async("uint8array");
    let textValue = "";
    if (["docx", "docm"].includes(extension)) textValue = await docxText(bytes);
    else if (extension === "xlsx") textValue = await xlsxText(bytes);
    else if (extension === "pdf") textValue = await pdfText(bytes);
    else textValue = new TextDecoder().decode(bytes);
    let entryFields = extractFieldsFromText(textValue);
    if (extension === "json") {
      const submissionFields = extractFieldsFromSubmissionJson(textValue);
      entryFields = { ...entryFields, ...submissionFields };
      authoritative = { ...authoritative, ...submissionFields };
    }
    extracted = mergeExtractedFields(extracted, entryFields);
    reviewed += 1;
  }
  return { fields: { ...extracted, ...authoritative }, detail: `${reviewed} compatible file${reviewed === 1 ? "" : "s"} read from the package` };
}

async function extractFileFields(file) {
  const extension = file.name.split(".").pop().toLowerCase();
  if (extension === "zip") return fieldsFromZip(await file.arrayBuffer());
  const textValue = await fileText(file);
  let extracted = extractFieldsFromText(textValue);
  if (extension === "json") extracted = { ...extracted, ...extractFieldsFromSubmissionJson(textValue) };
  return { fields: extracted, detail: "text read locally" };
}

async function processFiles() {
  const files = [...document.querySelector("#secondLineFiles").files];
  const status = document.querySelector("#secondLineEvidenceStatus");
  if (!files.length) { status.textContent = "Choose at least one evidence file first."; return; }
  if (files.some(file => file.size > 15_000_000) || files.reduce((sum, file) => sum + file.size, 0) > 40_000_000) { status.textContent = "Files must be 15 MB or less each and 40 MB or less in total."; return; }
  const button = document.querySelector("#processSecondLineFiles");
  button.disabled = true; status.textContent = `Reading ${files.length} file${files.length === 1 ? "" : "s"} on this device…`; evidence = [];
  let mapped = 0; let recognizedTotal = 0;
  try {
    for (const file of files) {
      const extension = file.name.split(".").pop().toUpperCase();
      try {
        const result = await extractFileFields(file); const recognized = fieldCount(result.fields);
        const before = nonblankCount(); fields = mergeExtractedFields(fields, result.fields); const added = nonblankCount() - before; mapped += added; recognizedTotal += recognized;
        evidence.push({ name: file.name, extension, detail: `${formatBytes(file.size)} · ${result.detail}`, recognized, added, ok: true });
      } catch (error) {
        evidence.push({ name: file.name, extension, detail: error.message, recognized: 0, added: 0, ok: false });
      }
    }
    renderEvidence(); renderFields();
    status.textContent = recognizedTotal
      ? mapped
        ? `${files.length} file${files.length === 1 ? "" : "s"} reviewed; ${recognizedTotal} field${recognizedTotal === 1 ? "" : "s"} recognized and ${mapped} added to previously blank fields. Confirm every value in Review fields.`
        : `${files.length} file${files.length === 1 ? "" : "s"} reviewed; ${recognizedTotal} field${recognizedTotal === 1 ? "" : "s"} recognized, but none were added because those report fields already had values. Use Clear report data for a fresh extraction.`
      : `${files.length} file${files.length === 1 ? "" : "s"} reviewed, but no labeled fields were recognized. Upload the complete First Line ZIP or its submission.json for the most reliable mapping.`;
  } finally { button.disabled = false; }
}

function resetSecondLineData() {
  fields = {}; evidence = []; stageIndex = 0;
  document.querySelector("#secondLineFiles").value = "";
  document.querySelector("#secondLineEvidenceStatus").textContent = "Report data cleared. Choose a First Line ZIP or evidence files to begin.";
  document.querySelector("#secondLineGenerationStatus").textContent = "";
  renderEvidence(); renderFields(); renderStage();
}

const example = {
  omniId: "OMNI-48217", reportDate: "2026-09-28", modelName: "Knowledge Assist", modelVersion: "2.1", impactTier: "Medium", impactSubtype: "Medium Impact",
  businessVp: "Jordan Lee, EVP", modelOwner: "Taylor Morgan, Director", mrmgVp: "Casey Patel, VP", validators: "Avery Chen, Lead Validator", market: "US / EU", validationStatus: "Approved with Findings",
  businessUnit: "Enterprise Services", businessProblem: "reduce time required to locate approved servicing procedures", specificSolution: "intelligent document question answering",
  modelInputs: "colleague questions and approved policy documents", modelOutputs: "grounded draft responses with citations", regulatoryReporting: "not", llmNames: "GPT-5.1", outputTypes: "generates a single response type",
  scopeAssessment: "clearly defined", documentConsistency: "consistent", deploymentScope: "servicing teams", enhancementTarget: "colleague productivity", upstreamUse: "does not",
  intendedUsers: "servicing colleagues", userBase: "1,200", outputConsumption: "a draft for human review", businessValue: "improve response consistency and reduce research time",
  quantitativeDetails: "No direct financial or regulatory reporting impact", quantitativeScore: "1", qualitativeDetails: "Human review is required before use", qualitativeScore: "2",
  complexityDetails: "One LLM call with grounded retrieval and feasible explainability", complexityScore: "1", interdependenceDetails: "No downstream model dependence", interdependenceScore: "1", finalScore: "1.50", impactThreshold: "1.80",
  hosting: "internally", modelDetailsAssessment: "accurately stated", hostingAssessment: "appropriate", promptProvided: "provided", promptApproach: "appropriate", supportSufficiency: "sufficient",
  implementationDate: "2026-10-15", rolloutStrategy: "phased", validationSampleSize: "450", validationMetrics: "accuracy of 91%, hallucination rate of 2.1%", testingMethodology: "adequate", sampleAssessment: "representative", metricsAssessment: "meets",
  dataFlows: "does", controlsRequired: "were", controlStatement: "Data quality controls for input from reliable and trusted sources are implemented.", controlType: "control", controlAdequacy: "adequate",
  monitoringMetric: "Accuracy", monitoringDefinition: "correct responses divided by total evaluated responses", monitoringRationale: "aligned with the validation outcome", monitoringSampleSize: "150", monitoringFrequency: "Quarterly",
  greenThreshold: "Accuracy ≥ 88%", amberThreshold: "Accuracy between 80% and 88%", amberAction: "If degradation persists, a Root Cause Analysis is initiated and next steps are documented for governance review.",
  failThreshold: "Accuracy < 80%", redAction: "formal escalation through governance channels and immediate model remediation actions until the issue is resolved.", metricAppropriateness: "appropriate",
  monitoringSampleAssessment: "sufficient", thresholdAssessment: "well-structured", planAdequacy: "adequate", businessAttester: "Jordan Lee, EVP", documentationAssessment: "appropriately", validationSatisfaction: "satisfactory",
  findingClosure: "the closure of identified findings", overallStatus: "Approved with Findings", findingSeverity: "L", findingNumber: "01", findingTitle: "Expand edge-case testing", findingDescription: "Testing did not include two low-volume servicing scenarios.",
  mrmgChallenge: "Confirm coverage before enterprise-wide rollout.", mtResponse: "The scenarios will be added before phase two.", mrmgAssessment: "The remediation plan is adequate and the finding remains open until evidence is provided.", conclusionFindings: "L-01 remains open through phase one.",
};

function loadExample() {
  fields = { ...example }; const count = nonblankCount(); evidence = [{ name: "Example validation package", extension: "DEMO", detail: "Synthetic demonstration data · no file uploaded", recognized: count, added: count, ok: true }];
  renderEvidence(); renderFields(); document.querySelector("#secondLineEvidenceStatus").textContent = "Example case loaded. Open Review fields to see how populated values appear in green in the report.";
}

function download(bytes, filename) {
  const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
  const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = filename; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

trigger.addEventListener("click", openSecondLine);
document.querySelector("#secondLineClose").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); });
dialog.addEventListener("close", () => { trigger.setAttribute("aria-expanded", "false"); if (location.hash === "#second-line") history.replaceState(null, "", `${location.pathname}${location.search}`); trigger.focus(); });
accessForm.addEventListener("submit", event => {
  event.preventDefault(); const password = document.querySelector("#secondLinePassword"); const status = document.querySelector("#secondLineAccessStatus");
  if (password.value === "MRMG") { sessionStorage.setItem("mrmg-second-line-unlocked", "1"); password.value = ""; status.textContent = ""; setUnlocked(true); document.querySelector("#secondLineFiles").focus(); }
  else { status.textContent = "That access word did not match."; password.select(); }
});
navButtons.forEach(button => button.addEventListener("click", () => { stageIndex = stageOrder.indexOf(button.dataset.secondLineStage); renderStage(); }));
document.querySelector("#secondLineNext").addEventListener("click", () => { stageIndex = Math.min(stageOrder.length - 1, stageIndex + 1); renderStage(); });
document.querySelector("#secondLineBack").addEventListener("click", () => { stageIndex = Math.max(0, stageIndex - 1); renderStage(); });
document.querySelector("#processSecondLineFiles").addEventListener("click", processFiles);
document.querySelector("#loadSecondLineExample").addEventListener("click", loadExample);
document.querySelector("#resetSecondLineData").addEventListener("click", resetSecondLineData);
fieldForm.addEventListener("input", event => { fields[event.target.name] = event.target.value; updateCounts(); });
fieldForm.addEventListener("change", event => { fields[event.target.name] = event.target.value; updateCounts(); });
document.querySelector("#generateSecondLineReport").addEventListener("click", async () => {
  const button = document.querySelector("#generateSecondLineReport"), status = document.querySelector("#secondLineGenerationStatus"); button.disabled = true;
  try { status.textContent = "Building the five-page Word report on this device…"; const bytes = await generateValidationReport(fields); const filename = validationReportFilename(fields); download(bytes, filename); status.textContent = `${filename} was created. Populated values are green; unsupported fields remain blank.`; }
  catch (error) { status.textContent = `Could not generate the report: ${error.message}`; }
  finally { button.disabled = false; }
});

renderFields(); renderStage(); if (location.hash === "#second-line") openSecondLine();
