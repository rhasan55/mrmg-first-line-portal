import JSZip from "jszip";

const XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`;
const TODAY = () => new Date().toISOString().slice(0, 10);

function x(value) {
  return String(value ?? "").replace(/[&<>"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
}
function list(value) { return Array.isArray(value) ? value : value ? [value] : []; }
function slug(value) { return String(value || "submission").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "submission"; }

export function normalizedMetrics(data) {
  if (data.metricName) {
    const names = list(data.metricName), fields = ["metricName", "metricValue", "metricRationale", "metricGreen", "metricAmber", "metricRed"];
    return names.map((_, i) => Object.fromEntries(fields.map(field => [field, list(data[field])[i] || ""])));
  }
  return [1, 2].map(number => ({
    metricName: data[`metric${number}`] || "",
    metricValue: data[`metric${number}Value`] || "",
    metricRationale: data[`metric${number}Rationale`] || "",
    metricGreen: data[`metric${number}Green`] || "",
    metricAmber: data[`metric${number}Amber`] || "",
    metricRed: data[`metric${number}Red`] || "",
  })).filter(metric => metric.metricName);
}

function normalizedCalls(data) {
  const fields = ["promptCallName", "promptCallPurpose", "promptCallText", "promptCallConstraints", "promptCallOutputFormat", "promptCallExampleInput", "promptCallExampleOutput", "promptCallVersion"];
  const count = Math.max(0, ...fields.map(field => list(data[field]).length));
  return Array.from({ length: count }, (_, i) => Object.fromEntries(fields.map(field => [field, list(data[field])[i] || ""])));
}

function run(text, bold = false) {
  const lines = String(text ?? "").split(/\r?\n/);
  return lines.map((line, i) => `${i ? "<w:br/>" : ""}<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>${bold ? "<w:b/>" : ""}<w:sz w:val="22"/></w:rPr><w:t xml:space="preserve">${x(line)}</w:t></w:r>`).join("");
}
function paragraph(text, style = "Normal", bold = false) {
  return `<w:p><w:pPr><w:pStyle w:val="${style}"/><w:spacing w:after="120"/></w:pPr>${run(text, bold)}</w:p>`;
}
function table(rows, widths = [2400, 7000]) {
  return `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders><w:top w:val="single" w:sz="4" w:color="B7B7B7"/><w:left w:val="single" w:sz="4" w:color="B7B7B7"/><w:bottom w:val="single" w:sz="4" w:color="B7B7B7"/><w:right w:val="single" w:sz="4" w:color="B7B7B7"/><w:insideH w:val="single" w:sz="4" w:color="D9D9D9"/><w:insideV w:val="single" w:sz="4" w:color="D9D9D9"/></w:tblBorders></w:tblPr><w:tblGrid>${widths.map(width => `<w:gridCol w:w="${width}"/>`).join("")}</w:tblGrid>${rows.map((row, rowIndex) => `<w:tr>${row.map((cell, columnIndex) => `<w:tc><w:tcPr><w:tcW w:w="${widths[columnIndex] || 2000}" w:type="dxa"/>${rowIndex === 0 ? '<w:shd w:fill="203864"/>' : ""}</w:tcPr><w:p><w:pPr><w:spacing w:after="60"/></w:pPr>${rowIndex === 0 ? `<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:color w:val="FFFFFF"/><w:sz w:val="20"/></w:rPr><w:t>${x(cell)}</w:t></w:r>` : run(cell)}</w:p></w:tc>`).join("")}</w:tr>`).join("")}</w:tbl>`;
}
function pageBreak() { return `<w:p><w:r><w:br w:type="page"/></w:r></w:p>`; }

async function makeDocx(title, body) {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`);
  zip.folder("_rels").file(".rels", `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`);
  zip.folder("word").folder("_rels").file("document.xml.rels", `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
  zip.folder("word").file("styles.xml", `${XML}<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="22"/></w:rPr></w:rPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:color w:val="203864"/><w:sz w:val="40"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:color w:val="365C73"/><w:sz w:val="30"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:sz w:val="24"/></w:rPr></w:style></w:styles>`);
  zip.folder("word").file("document.xml", `${XML}<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraph(title, "Title")}${body}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="936" w:right="1296" w:bottom="936" w:left="1296" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr></w:body></w:document>`);
  const props = zip.folder("docProps");
  props.file("core.xml", `${XML}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${x(title)}</dc:title><dc:creator>MRMG First Line Portal</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created></cp:coreProperties>`);
  props.file("app.xml", `${XML}<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>MRMG First Line Portal</Application></Properties>`);
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}

function summaryRows(data) {
  return [
    ["Field", "Response"], ["Use case name", data.useCaseName], ["Model owner", data.modelOwner], ["Business unit", data.businessUnit], ["Implementation date", data.implementationDate],
    ["Markets", list(data.markets).join(", ")], ["Model", `${data.modelName || ""} ${data.modelVersion || ""}`.trim()], ["Hosting", data.hosting], ["Agentic AI", data.agentic],
  ];
}
function primaryBody(data, metrics) {
  let body = paragraph("Completed first-line model risk submission", "Heading1") + table(summaryRows(data));
  body += paragraph("Section 1: Model and intended use", "Heading1") + table([["Question", "Response"], ["Overview", data.overview], ["Model inputs", data.modelInputs], ["Generated outputs", data.generatedOutputs]]);
  body += paragraph("Impact routing", "Heading1") + table([["Field", "Response"], ["Solution type", data.solutionType], ["Regulatory reporting", data.regulatory || "Not applicable"], ["Purpose", data.purpose || "Not applicable"], ["Final impact", data.impactTier], ["MIC", data.assessmentScore == null ? "Not calculated — early-exit route" : Number(data.assessmentScore).toFixed(2)]]);
  if (data.section2Included) {
    const components = data.assessmentComponents || {};
    body += paragraph("Section 2: Model Impact Category Assessment", "Heading1") + table([["Field", "Response"], ["End users", data.endUsers], ["Business process", data.businessProcess], ["Quantitative driver", data.quantDriver], ["Impact threshold", data.impactThreshold], ["Reliance", data.reliance], ["Explainability feasible", data.explainable], ["Fine-tuned", data.fineTuned], ["Sequential calls", data.multiCall], ["Downstream interdependency", data.downstream], ["Components", `qn ${components.qn}; ql ${components.ql}; cx ${components.cx}; dd ${components.dd}`]]);
  } else body += paragraph("Section 2 omitted by the applicable VBA early-exit rule.");
  body += pageBreak() + paragraph("Outcome analysis and monitoring", "Heading1") + table([["Metric", "Observed value"], ...metrics.map(metric => [metric.metricName, metric.metricValue])]);
  body += paragraph("Supporting files in this package", "Heading2") + paragraph("Outcome Analysis.xlsx\nPrompt Submission Template.docx\nOngoing Monitoring Plan.docx\nB70+ Attestation Template.docx\nsubmission.json");
  return body;
}
function promptBody(data) {
  let body = paragraph("Model owner documentation guidance", "Heading1") + paragraph("Document the purpose, prompt structure, constraints, expected output, examples, and revision history for every LLM call.");
  normalizedCalls(data).forEach((call, i) => {
    if (i) body += pageBreak();
    body += paragraph(`LLM Call ${i + 1}: ${call.promptCallName}`, "Heading1") + table([["Section", "Details"], ["Prompt name", call.promptCallName], ["Purpose", call.promptCallPurpose], ["Prompt structure", call.promptCallText], ["Policies and constraints", call.promptCallConstraints], ["Output format", call.promptCallOutputFormat], ["Example input", call.promptCallExampleInput], ["Example output", call.promptCallExampleOutput], ["Version", call.promptCallVersion], ["Owner", data.modelOwner]]);
  });
  return body;
}
function monitoringBody(data, metrics) {
  let body = paragraph("Monitoring scope", "Heading1") + table([["Field", "Plan"], ["Frequency", data.monitoringFrequency], ["Sample size", data.sampleSize], ["Use case", data.useCaseName]]);
  metrics.forEach((metric, i) => {
    body += paragraph(`Metric ${i + 1}: ${metric.metricName}`, "Heading2") + table([["Field", "Details"], ["Observed value", metric.metricValue], ["Rationale", metric.metricRationale], ["Green", metric.metricGreen], ["Amber", metric.metricAmber], ["Red", metric.metricRed], ["Action plan", "Green: continue planned monitoring. Amber: investigate and increase review cadence. Red: perform root-cause analysis, escalate through governance, and remediate or restrict use."]]);
  });
  return body;
}
function attestationBody(data) {
  const statements = ["Information in the model documentation is accurate.", "EU use is not prohibited or high-risk, or EU is not applicable.", "Mandatory controls have been tested and will be implemented.", "Residual risk is understood, accepted, and within appetite.", "Use will remain within the documented intended scope."];
  return table([["Reference", "Details"], ["Use case", data.useCaseName], ["Business owner", data.businessOwnerName], ["Title", data.businessOwnerTitle], ["Date", TODAY()]]) + paragraph("Business owner attestations", "Heading1") + statements.map(statement => paragraph(`☒  ${statement}`)).join("") + paragraph("Ongoing attestation", "Heading2") + paragraph("The business owner will review these statements at least annually and whenever the use case changes materially.");
}

function cell(ref, value, style = 0) { return `<c r="${ref}" t="inlineStr" s="${style}"><is><t xml:space="preserve">${x(value)}</t></is></c>`; }
async function makeXlsx(data, metrics) {
  const rows = [["Field", "Description"], ["Sample Size", data.sampleSize]];
  metrics.forEach((metric, i) => rows.push([`Performance Metric ${i + 1} (Name & Description)`, metric.metricName], [`Rationale for Metric ${i + 1}`, metric.metricRationale], [`Performance Metric ${i + 1} Value`, metric.metricValue]));
  const zip = new JSZip();
  zip.file("[Content_Types].xml", `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`);
  zip.folder("_rels").file(".rels", `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`);
  zip.folder("xl").file("workbook.xml", `${XML}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Outcome Analysis" sheetId="1" r:id="rId1"/></sheets></workbook>`);
  zip.folder("xl").folder("_rels").file("workbook.xml.rels", `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
  zip.folder("xl").file("styles.xml", `${XML}<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Arial"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Arial"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF203864"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border/><border><left style="thin"><color rgb="FF7F7F7F"/></left><right style="thin"><color rgb="FF7F7F7F"/></right><top style="thin"><color rgb="FF7F7F7F"/></top><bottom style="thin"><color rgb="FF7F7F7F"/></bottom></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`);
  const sheetRows = rows.map((row, i) => `<row r="${i + 1}" ht="${i === 0 ? 26 : 44}" customHeight="1">${cell(`A${i + 1}`, row[0], i === 0 ? 1 : 2)}${cell(`B${i + 1}`, row[1], i === 0 ? 1 : 2)}</row>`).join("");
  zip.folder("xl").folder("worksheets").file("sheet1.xml", `${XML}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><sheetViews><sheetView workbookViewId="0" showGridLines="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="1" width="34" customWidth="1"/><col min="2" max="2" width="60" customWidth="1"/></cols><sheetData>${sheetRows}</sheetData><pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/><pageSetup orientation="landscape" paperSize="1" fitToWidth="1" fitToHeight="1"/></worksheet>`);
  const props = zip.folder("docProps");
  props.file("core.xml", `${XML}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Outcome Analysis</dc:title><dc:creator>MRMG First Line Portal</dc:creator></cp:coreProperties>`);
  props.file("app.xml", `${XML}<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>MRMG First Line Portal</Application></Properties>`);
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}

export async function generateBrowserPackage(data, supportingFiles = []) {
  const metrics = normalizedMetrics(data);
  if (!metrics.length) throw new Error("At least one performance metric is required.");
  const outer = new JSZip();
  const [primary, prompts, monitoring, attestation, workbook] = await Promise.all([
    makeDocx("GenAI Model Risk Tiering Framework", primaryBody(data, metrics)),
    makeDocx("LLM Prompt Documentation Template", promptBody(data)),
    makeDocx("Ongoing Monitoring Plan", monitoringBody(data, metrics)),
    makeDocx("B70+ Attestation Template", attestationBody(data)),
    makeXlsx(data, metrics),
  ]);
  outer.file("MRMG First Line Submission.docx", primary);
  outer.file("Prompt Submission Template.docx", prompts);
  outer.file("Ongoing Monitoring Plan.docx", monitoring);
  outer.file("B70+ Attestation Template.docx", attestation);
  outer.file("Outcome Analysis.xlsx", workbook);
  const safe = { ...data, metrics, supportingFileNames: supportingFiles.map(file => file.name) };
  delete safe.supportingFiles;
  outer.file("submission.json", JSON.stringify(safe, null, 2));
  for (const file of supportingFiles) outer.file(`Supporting Documents/${String(file.name).split(/[\\/]/).pop()}`, await file.arrayBuffer());
  const blob = await outer.generateAsync({ type: "blob", compression: "DEFLATE" });
  return { blob, filename: `${slug(data.useCaseName)}-mrmg-submission.zip`, summary: `Package created successfully with 4 Word documents, 1 Excel workbook, submission JSON${supportingFiles.length ? `, and ${supportingFiles.length} supporting file${supportingFiles.length === 1 ? "" : "s"}` : ""}.` };
}
