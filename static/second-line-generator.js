import JSZip from "jszip";

const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const COLORS = { navy: "1F3A68", green: "548235", gray: "A6A6A6", line: "5B6572", black: "000000", white: "FFFFFF" };

function x(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function clean(value) { return String(value ?? "").trim(); }
function normalizeDate(value) {
  const raw = clean(value);
  if (!raw) return "";
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return iso ? `${iso[2]}/${iso[3]}/${iso[1]}` : raw;
}
function titleFor(data) {
  const core = [clean(data.omniId), clean(data.modelName), clean(data.modelVersion)].filter(Boolean).join(" ");
  return `${core || "Validation"} - Validation Report`;
}
function isMedium(data) { return /^medium/i.test(clean(data.impactTier)) || /^medium/i.test(clean(data.impactSubtype)); }
function isPilot(data) { return /customer[-\s]facing pilot/i.test(clean(data.impactSubtype)); }
function isProductivity(data) { return /productivity tool/i.test(clean(data.impactSubtype)); }
function isNonCore(data) { return /non-core/i.test(clean(data.impactSubtype)); }

function run(text, options = {}) {
  if (text === "" || text == null) return "";
  const props = [
    `<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/>`,
    options.bold ? "<w:b/>" : "",
    options.italic ? "<w:i/>" : "",
    options.color ? `<w:color w:val="${options.color}"/>` : "",
    `<w:sz w:val="${Math.round((options.size || 9.5) * 2)}"/>`,
    `<w:szCs w:val="${Math.round((options.size || 9.5) * 2)}"/>`,
  ].join("");
  return `<w:r><w:rPr>${props}</w:rPr><w:t xml:space="preserve">${x(text)}</w:t></w:r>`;
}
function label(text, options = {}) { return run(text, { ...options, color: options.color || COLORS.black }); }
function value(text, options = {}) { return run(clean(text), { ...options, color: COLORS.green, bold: options.bold ?? true }); }

function paragraph(runs, options = {}) {
  const spacing = `<w:spacing w:before="${options.before ?? 0}" w:after="${options.after ?? 95}" w:line="${options.line ?? 240}" w:lineRule="auto"/>`;
  const align = options.align ? `<w:jc w:val="${options.align}"/>` : "";
  const indent = options.indent ? `<w:ind w:left="${options.indent}"${options.hanging ? ` w:hanging="${options.hanging}"` : ""}/>` : "";
  const keep = options.keepNext ? "<w:keepNext/>" : "";
  const border = options.bottomBorder ? `<w:pBdr><w:bottom w:val="single" w:sz="${options.borderSize || 8}" w:space="4" w:color="${options.borderColor || COLORS.line}"/></w:pBdr>` : "";
  return `<w:p><w:pPr>${spacing}${align}${indent}${keep}${border}</w:pPr>${Array.isArray(runs) ? runs.join("") : runs}</w:p>`;
}
function textParagraph(text, options = {}) { return paragraph(label(text, options), options); }
function titleHeader(data) {
  return paragraph(label(titleFor(data), { color: COLORS.gray, size: 9 }), { align: "center", after: 155, bottomBorder: true, borderSize: 14, borderColor: "7F7F7F" });
}
function sectionHeading(text) {
  return paragraph(label(text, { bold: true, size: 13, color: COLORS.navy }), { before: 80, after: 150, keepNext: true, bottomBorder: true, borderSize: 7, borderColor: COLORS.navy });
}
function applicability(text) {
  return paragraph(label(`<${text}>`, { italic: true, size: 9.5 }), { after: 55, keepNext: true });
}
function pageBreak() { return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'; }
function bullet(runs, level = 0, options = {}) {
  return paragraph([label(level ? "o   " : "•   ", { size: 9.5 }), ...(Array.isArray(runs) ? runs : [runs])], { indent: level ? 720 : 360, hanging: 220, after: options.after ?? 55, line: 230 });
}

function cell(runs, options = {}) {
  const borders = `<w:tcBorders><w:top w:val="single" w:sz="5" w:color="BFBFBF"/><w:left w:val="single" w:sz="5" w:color="BFBFBF"/><w:bottom w:val="single" w:sz="5" w:color="BFBFBF"/><w:right w:val="single" w:sz="5" w:color="BFBFBF"/></w:tcBorders>`;
  const fill = options.fill ? `<w:shd w:fill="${options.fill}"/>` : "";
  const margin = `<w:tcMar><w:top w:w="72" w:type="dxa"/><w:left w:w="92" w:type="dxa"/><w:bottom w:w="72" w:type="dxa"/><w:right w:w="92" w:type="dxa"/></w:tcMar>`;
  const content = paragraph(Array.isArray(runs) ? runs : [runs], { after: 0, line: 215, align: options.align });
  return `<w:tc><w:tcPr><w:tcW w:w="${options.width || 2350}" w:type="dxa"/>${fill}${borders}${margin}<w:vAlign w:val="center"/></w:tcPr>${content}</w:tc>`;
}
function row(cells, options = {}) { return `<w:tr><w:trPr><w:cantSplit/>${options.header ? "<w:tblHeader/>" : ""}</w:trPr>${cells.join("")}</w:tr>`; }
function table(rows, widths) {
  return `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>${widths.map(width => `<w:gridCol w:w="${width}"/>`).join("")}</w:tblGrid>${rows.join("")}</w:tbl>`;
}
function metadataTable(data) {
  const labelCell = text => cell(label(text, { bold: true, color: COLORS.white, size: 9 }), { fill: COLORS.navy, width: 2350 });
  const valueCell = text => cell(value(text, { size: 9.5 }), { width: 2350 });
  const tier = [clean(data.impactTier) ? `${clean(data.impactTier)} Impact` : "", clean(data.impactSubtype)].filter(Boolean).join(" - ");
  return table([
    row([labelCell("OMNI ID"), valueCell(data.omniId), labelCell("Date"), valueCell(normalizeDate(data.reportDate))]),
    row([labelCell("Model Name"), valueCell(data.modelName), labelCell("Impact Tier"), valueCell(tier)]),
    row([labelCell("Business VP+"), valueCell(data.businessVp), labelCell("MRMG VP+"), valueCell(data.mrmgVp)]),
    row([labelCell("Model Owner (B40+)"), valueCell(data.modelOwner), labelCell("Lead Validator/ Validators"), valueCell(data.validators)]),
    row([labelCell("Market"), valueCell(data.market), labelCell("Validation Status"), valueCell(data.validationStatus || data.overallStatus)]),
  ], [2350, 2350, 2350, 2350]);
}
function matrixTable(data) {
  const headerCell = text => cell(label(text, { bold: true, color: COLORS.white, size: 9 }), { fill: COLORS.navy, width: text === "Details" ? 5900 : 1750, align: "center" });
  const standardCell = (text, width, dynamic = false) => cell(dynamic ? value(text, { size: 8.8 }) : label(text, { size: 8.8 }), { width });
  return table([
    row([headerCell("Pillar"), headerCell("Details"), headerCell("Score")], { header: true }),
    row([standardCell("Quantitative Impact", 1750), standardCell(data.quantitativeDetails, 5900, true), standardCell(data.quantitativeScore, 1750, true)]),
    row([standardCell("Qualitative Impact", 1750), standardCell(data.qualitativeDetails, 5900, true), standardCell(data.qualitativeScore, 1750, true)]),
    row([standardCell("Complexity", 1750), standardCell(data.complexityDetails, 5900, true), standardCell(data.complexityScore, 1750, true)]),
    row([standardCell("Interdependence", 1750), standardCell(data.interdependenceDetails, 5900, true), standardCell(data.interdependenceScore, 1750, true)]),
    row([cell(label("Final Score", { bold: true, size: 8.8 }), { width: 1750 }), cell("", { width: 5900 }), cell(value(data.finalScore, { size: 8.8 }), { width: 1750 })]),
  ], [1750, 5900, 1750]);
}

function pageOne(data) {
  const classification = isProductivity(data) ? "general-purpose AI-powered productivity tool" : isNonCore(data) ? "non-core AXP business tool" : "";
  const enhancement = clean(data.enhancementTarget);
  let body = titleHeader(data) + metadataTable(data) + sectionHeading("Model Overview");
  body += applicability("Applicable for Low Impact Productivity Tools/ Non-core AXP Business Tools");
  body += paragraph([
    label("The "), value(data.businessUnit), label(" plans to utilize Generative AI to addresses the business problem of "), value(data.businessProblem),
    label(". The use case takes "), value(data.modelInputs), label(" as input and generates "), value(data.modelOutputs),
    label(" as output. The model output is "), value(data.regulatoryReporting), label(" used as an input to any regulatory reporting."),
  ]);
  body += paragraph([
    label("The use case employs "), value(data.llmNames || data.modelName), label(" as the large language model. The LLM "), value(data.outputTypes),
    label(". MRMG finds the use case scope to be "), value(data.scopeAssessment), clean(data.scopeClarification) ? label(" on ") : "", value(data.scopeClarification),
    label(" and "), value(data.documentConsistency), label(" with the attached overview document and process flow."),
  ]);
  body += paragraph([
    value(data.modelName), label(" is a "), value(classification), label(" deployed across "), value(data.deploymentScope),
    label(" in the enterprise to enhance "), value(enhancement), label(" with no impact to core AXP business."),
  ]);
  if (isProductivity(data) || !clean(data.impactSubtype)) body += paragraph([
    label("<If Productivity tool> ", { italic: true }), label("Unlike models designed for specific business processes, "), value(data.modelName),
    label(" use-case is designed for open-ended, user-driven interactions and offer broad functionalities without being tailored to a single, predefined use case or workflow. Accordingly, MRMG has categorized this as Productivity Tool and has applied the corresponding validation approach."),
  ]);
  if (isNonCore(data) || !clean(data.impactSubtype)) body += paragraph([
    label("<If Non-core AXP business tool> ", { italic: true }), value(data.modelName), label(" use-case is designed for non-core business needs, enhancing "),
    value(data.enhancementTarget), label(". Accordingly, MRMG has categorized this as Non-core AXP business tool and has applied the corresponding validation approach."),
  ]);
  return body;
}

function pageTwo(data) {
  let body = titleHeader(data) + applicability("Applicable for Other Low or Medium Impact Models");
  body += paragraph([
    label("The "), value(data.businessUnit), label(" plans to leverage Generative AI to enable "), value(data.specificSolution || data.businessProblem),
    label(". The use case takes "), value(data.modelInputs), label(" as input and generates "), value(data.modelOutputs), label(" as output."),
  ]);
  body += paragraph([
    label("<For Medium Impact models> ", { italic: true }), label("The model "), value(data.upstreamUse), label(" use output from an upstream model as a direct input"),
    clean(data.upstreamModel) ? label("; specifically, ") : "", value(data.upstreamModel), label(". The intended users are "), value(data.intendedUsers),
    label(", with an estimated user base of "), value(data.userBase), label(" users and the generated output is consumed as "), value(data.outputConsumption),
    label(". The use case is expected to "), value(data.businessValue), label(". MRMG finds the use case scope to be "), value(data.scopeAssessment),
    clean(data.scopeClarification) ? label(" on ") : "", value(data.scopeClarification), label(" and "), value(data.documentConsistency), label(" with the attached overview document."),
  ]);
  body += paragraph([
    label("<For Other Low Impact models> ", { italic: true }), label("The intended users are "), value(data.intendedUsers),
    label(" and the generated output is consumed as "), value(data.outputConsumption), label(". MRMG finds the use case scope to be "), value(data.scopeAssessment),
    clean(data.scopeClarification) ? label(" on ") : "", value(data.scopeClarification), label(" and "), value(data.documentConsistency), label(" with the attached overview document."),
  ]);
  body += textParagraph("The use case was assessed against the Model Impact Categorization across four key pillars. The scores are summarized below:");
  body += matrixTable(data);
  body += paragraph(label("Table 1: Model Impact Categorization Matrix", { italic: true, size: 9 }), { align: "center", before: 55, after: 90 });
  body += paragraph([
    label("The final computed score of "), value(data.finalScore), label(" falls at / below the threshold of "), value(data.impactThreshold),
    label(" established for the Low impact tier. Accordingly, MRMG categorizes this use case as "), value(data.impactTier),
    label(" Impact and has applied the corresponding validation approach."),
  ]);
  return body;
}

function pageThree(data) {
  let body = titleHeader(data) + sectionHeading("Validation Assessment");
  body += paragraph([
    label("<For All models> ", { italic: true }), label("GenAI Model Details: ", { bold: true }), label("The use case employs "), value(data.modelName),
    label(", version "), value(data.modelVersion), label(", hosted "), value(data.hosting), label(". MRMG ascertains that the model details are "),
    value(data.modelDetailsAssessment), clean(data.modelCorrection) ? label(" on ") : "", value(data.modelCorrection), label(" and the hosting arrangement is "),
    value(data.hostingAssessment), clean(data.hostingConcern) ? label(" regarding ") : "", value(data.hostingConcern), label("."),
  ]);
  body += paragraph([
    label("<For Medium Impact models> ", { italic: true }), label("Prompt Design: ", { bold: true }), label("Modeling team has "), value(data.promptProvided),
    label(" prompt file(s). MRMG concludes that the prompt design approach is "), value(data.promptApproach),
    label(" for the stated use case and supporting documentation is "), value(data.supportSufficiency), label("."),
  ], { before: 110 });
  body += paragraph([
    label("<For Medium Impact models> ", { italic: true }), label("Implementation Date: ", { bold: true }), label("The use case is targeted for deployment on "),
    value(normalizeDate(data.implementationDate)), label(" with a "), value(data.rolloutStrategy), label(" deployment strategy. MRMG ascertains that the implementation timeline is reasonable and the roll-out plan is adequate to the current validation status."),
  ], { before: 110 });
  body += paragraph([
    label("<For Low Impact models> ", { italic: true }), label("Implementation Date: ", { bold: true }), label("The use case is targeted for deployment on "),
    value(normalizeDate(data.implementationDate)), label(". MRMG ascertains that the implementation timeline is reasonable."),
  ], { before: 110 });
  body += paragraph([
    label("<For All models> ", { italic: true }), label("Validation Results: ", { bold: true }), label("The modeling team tested the use case on a sample of "),
    value(data.validationSampleSize), label(" test cases. Reported metrics include "), value(data.validationMetrics),
    label(". MRMG finds the testing methodology to be "), value(data.testingMethodology), clean(data.testingIssue) ? label(" due to ") : "", value(data.testingIssue),
    label(", the sample size "), value(data.sampleAssessment), label(", and reported metrics "), value(data.metricsAssessment), label(" acceptable thresholds."),
  ], { before: 110 });
  body += paragraph([
    label("<For Medium Impact models> ", { italic: true }), label("Data Quality Controls: ", { bold: true }), label("Since data "), value(data.dataFlows),
    label(" flow systematically into the model, data quality controls "), value(data.controlsRequired), label(" required to be implemented. "),
    value(data.controlStatement), clean(data.controlLimitation) ? label(" ") : "", value(data.controlLimitation),
    label(" MRMG assessed the identified "), value(data.controlType), label(" is commensurate with the risk and is "), value(data.controlAdequacy), label(" to mitigate the associated risk."),
  ], { before: 110 });
  body += applicability("Ongoing monitoring is not applicable for Medium Impact Customer-facing Pilot use-cases");
  body += paragraph([label("Ongoing Monitoring Plan: ", { bold: true }), label("The modeling team has established an ongoing monitoring plan for the use case. The key components are as follows:")], { after: 60 });
  body += bullet([label("Performance metric Tracking: ", { bold: true }), label("Model performance is tracked via "), value(data.monitoringMetric), label(". Definition: "), value(data.monitoringDefinition), label(". Rationale: "), value(data.monitoringRationale)]);
  body += bullet([label("Sample size: ", { bold: true }), value(data.monitoringSampleSize), label(" observations per monitoring cycle")]);
  body += bullet([label("Monitoring Frequency: ", { bold: true }), value(data.monitoringFrequency)]);
  return body;
}

function pageFour(data) {
  let body = titleHeader(data);
  body += bullet([label("Threshold Framework:", { bold: true })]);
  body += bullet([label("Green (Satisfactory): ", { bold: true }), label("Performance metric meets or exceeds "), value(data.greenThreshold), label(". The use case operates within expected thresholds and no remedial action is required.")], 1);
  body += bullet([label("Amber (Warning): ", { bold: true }), label("Performance metric breaches "), value(data.amberThreshold), label(". This triggers heightened monitoring with continued tracking over additional periods. "), value(data.amberAction)], 1);
  body += bullet([label("Red (Fail): ", { bold: true }), label("Performance metric breaches "), value(data.failThreshold), label(". This triggers a mandatory Root Cause Analysis (RCA), "), value(data.redAction)], 1);
  body += paragraph([
    label("MRMG reviewed the monitoring plan and finds the selected metric(s) to be "), value(data.metricAppropriateness), clean(data.monitoringCoverageGap) ? label(" to capture ") : "", value(data.monitoringCoverageGap),
    label(" for the use case. The sample size is "), value(data.monitoringSampleAssessment), label(" for meaningful monitoring, and the threshold framework with associated escalation actions is "),
    value(data.thresholdAssessment), clean(data.thresholdRefinement) ? label(" on ") : "", value(data.thresholdRefinement), label(". MRMG concludes that the ongoing monitoring plan is "),
    value(isPilot(data) ? "" : data.planAdequacy), label(" to detect performance degradation in a timely manner."),
  ], { before: 95 });
  body += sectionHeading("Finding Details");
  if (!clean(data.findingTitle) && !clean(data.findingDescription)) {
    body += paragraph(label("No findings were identified as a part of this validation.", { italic: true }), { after: 90 });
  } else {
    body += paragraph([label("Finding ", { bold: true }), value(`${clean(data.findingSeverity)}${clean(data.findingNumber) ? `-${clean(data.findingNumber)}` : ""}`), label(": ", { bold: true }), value(data.findingTitle)], { keepNext: true });
    body += paragraph(value(data.findingDescription));
    body += paragraph([label("MRMG Challenge: ", { bold: true }), value(data.mrmgChallenge)]);
    body += paragraph([label("MT Response: ", { bold: true }), value(data.mtResponse)]);
    body += paragraph([label("MRMG Assessment: ", { bold: true }), value(data.mrmgAssessment)]);
  }
  body += sectionHeading("Validation Conclusion");
  body += paragraph([label("MRMG has completed its assessment of the "), value(data.modelName), label(" use case.")]);
  body += paragraph([
    label("<For Low Impact Productivity Tools/ Non-core AXP Business Tools> ", { italic: true }), label("Given the "),
    value(isProductivity(data) ? "general-purpose nature" : isNonCore(data) ? "non-core AXP business impact" : ""), label(" of the tool and its deployment across "),
    value(data.deploymentScope), label(", MRMG applied the validation approach followed for "), value(isProductivity(data) ? "Productivity Tools" : isNonCore(data) ? "Non-core AXP Business Tools" : ""), label("."),
  ], { before: 100 });
  return body;
}

function pageFive(data) {
  const tier = clean(data.impactTier);
  const status = clean(data.overallStatus || data.validationStatus);
  let body = titleHeader(data);
  body += paragraph([
    label("<For Other Low or Medium Impact Models> ", { italic: true }), label("The final impact score of "), value(data.finalScore), label(" confirms the "), value(tier),
    label(" impact categorization under the Model Impact Categorization criteria, hence MRMG applied the validation approach followed for "),
    value(tier === "Medium" ? "Moderate Impact Models" : tier ? `${tier} Impact Models` : ""), label("."),
  ]);
  body += paragraph([
    label("MRMG independently assessed the use case scope and definition, risk identification and compensating controls, model selection and design approach, validation testing and performance metrics, mandatory controls framework, implementation readiness and the ongoing monitoring plan are "),
    value(data.documentationAssessment), label(" documented and is "), value(data.validationSatisfaction), label("."),
  ]);
  body += paragraph([label("Further, the business B70+ ("), value(data.businessAttester), label(") has provided attestation confirming that:")], { after: 55 });
  body += bullet(label("All information provided regarding the use case in the model documentation is accurate,"), 0);
  body += bullet(label("If the use case is used in the EU market, its usage does not fall under prohibited AI practices or high-risk AI systems as defined by the EU AI Act,"), 0);
  body += bullet(label("Mandatory controls are effective and will be implemented,"), 0);
  body += bullet(label("Residual risk associated with the use case is acceptable and within the established business risk appetite, and"), 0);
  body += bullet(label("The use case will be operated solely as described in this document."), 0);
  body += paragraph(label("[Attach evidence]", { italic: true }), { after: 90 });
  if (isPilot(data) || !clean(data.impactSubtype)) body += paragraph([
    label("<Applicable for Medium Impact Customer-facing Pilot use-cases> ", { italic: true }), label("In addition to attestation from B70+, modeling team has also secured and provided an approval for a pilot run from Model Risk Committee. The pilot launch has been granted approval from MRMG for "),
    value(data.pilotMonths), label(" months. [Attach evidence]."),
  ]);
  body += paragraph([
    label("Taking into consideration the impact categorization, the validation outcomes across each assessment area, the adequacy of the established controls framework, "),
    value(data.findingClosure), label(", the business attestation on residual risk acceptance"),
    isPilot(data) ? label(", and MRC approval for pilot launch") : "", label(", MRMG concludes that "), value(data.modelName),
    label(" is validated and the overall validation status is "), value(status), clean(data.pilotMonths) && /limited use/i.test(status) ? label(" for ") : "",
    /limited use/i.test(status) ? value(data.pilotMonths) : "", clean(data.pilotMonths) && /limited use/i.test(status) ? label(" months") : "", label("."),
  ]);
  body += paragraph([label("Findings, if any: ", { bold: true }), value(data.conclusionFindings)]);
  return body;
}

function stylesXml() {
  return `${XML}<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="19"/><w:szCs w:val="19"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="95" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>`;
}

export async function generateValidationReport(data = {}) {
  const zip = new JSZip();
  const title = titleFor(data);
  zip.file("[Content_Types].xml", `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`);
  zip.folder("_rels").file(".rels", `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`);
  zip.folder("word").folder("_rels").file("document.xml.rels", `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/></Relationships>`);
  zip.folder("word").file("styles.xml", stylesXml());
  zip.folder("word").file("settings.xml", `${XML}<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:zoom w:percent="100"/><w:compat/></w:settings>`);
  const body = [pageOne(data), pageBreak(), pageTwo(data), pageBreak(), pageThree(data), pageBreak(), pageFour(data), pageBreak(), pageFive(data)].join("");
  zip.folder("word").file("document.xml", `${XML}<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${body}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="720" w:right="1080" w:bottom="720" w:left="1080" w:header="360" w:footer="360" w:gutter="0"/></w:sectPr></w:body></w:document>`);
  zip.folder("docProps").file("core.xml", `${XML}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${x(title)}</dc:title><dc:creator>MRMG Second Line Portal</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created></cp:coreProperties>`);
  zip.folder("docProps").file("app.xml", `${XML}<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>MRMG Second Line Portal</Application></Properties>`);
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}

export function validationReportFilename(data = {}) {
  const slug = [data.omniId, data.modelName, data.modelVersion].map(value => clean(value).replace(/[^a-z0-9._-]+/gi, "-").replace(/^-+|-+$/g, "")).filter(Boolean).join("-") || "validation";
  return `${slug}-Validation-Report.docx`;
}
