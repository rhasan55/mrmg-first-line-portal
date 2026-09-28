import JSZip from "jszip";

const XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`;
const COLORS = { blue: "365C73", navy: "203864", ink: "111111", gray: "666666", lightBlue: "D9E2F3", line: "7F7F7F", yellow: "FFF200", magenta: "C000A0" };
const ATTESTATIONS = [
  "All information provided regarding the use case in the model documentation is accurate.",
  "If the use case is used in the EU market, its usage does not fall under Prohibited AI practices or High-risk AI systems as defined by the EU AI Act.",
  "Mandatory controls have been tested for effectiveness and will be implemented in production.",
  "The residual risk is understood, acceptable, and within the business risk appetite.",
  "Model will be used within the intended scope only as described in this document.",
];
const B70_ATTACHMENTS = [
  "Completed model documentation with use case overview",
  "Outcome testing results of the use-case with reported model performance",
  "Ongoing Monitoring Plan* for annual monitoring and reporting of the use case",
];
const B70_APPLICABILITY_NOTE = "*Not applicable for Medium impact Customer Facing Pilot use cases";
const MANDATORY_CONTROLS = [
  "User access control",
  "Disclaimers to inform use of AI",
  "Incident reporting OR backup options in case of discontinuation or disruption of service",
  "Usage of approved upstream models (if applicable)",
  "Prevention of sensitive data leakage and blocking of harmful content, e.g., AI Firewall, etc.",
  "Robust implementation and change management control (segregated dev/test/prod; approvals for releases; rollback path)",
];
function b70FormalAttestations() {
  return [
    ["Use Within Scope", "The application will be used strictly as described in this document and the attached model documentation. The usage is bounded within the defined scope and intended purpose."],
    ["Mandatory Control Effectiveness and Implementation", "Appropriate risk controls would be implemented and effective in production."],
    ["Testing Effectiveness", "Testing and validation activities performed are sufficient and demonstrate that the model performance is acceptable for business usage."],
    ["Residual Risk Acceptance", "Considering the implemented controls, and testing results, the residual risk associated with this use case is acceptable and within the business risk appetite."],
    ["Ongoing Monitoring*", "Ongoing monitoring of the application will be conducted at an appropriate frequency (at least annually), with defined metrics and thresholds aligned to the business use of the application."],
  ];
}
const BUSINESS_RULES = {
  "Credit and Fraud Risk": {
    "Account Receivable / Billed Business": ["≤ $1B", "$1B–$10B", "> $10B"],
    "Adverse Action Volume": ["≤ 1M", "1M–3M", "> 3M"],
    "Write-off": ["≤ $4M", "$4M–$50M", "> $50M"],
  },
  Marketing: {
    "Gross Contribution Margin": ["≤ $5M", "$5M–$11M", "> $11M"],
    "Pre-Tax Income": ["≤ $5M", "$5M–$11M", "> $11M"],
    "Customers / Prospects Scored": ["≤ 1M", "1M–3M", "> 3M"],
  },
  "Technology and Servicing": {
    "Pre-Tax Income": ["≤ $5M", "$5M–$11M", "> $11M"],
    "Customers / Prospects Scored": ["≤ 1M", "1M–3M", "> 3M"],
  },
  "Finance and Treasury": {
    "Account Receivable / Billed Business": ["≤ $1B", "$1B–$10B", "> $10B"],
    "Balance Sheet": ["≤ $1B", "$1B–$10B", "> $10B"],
    "Write-off": ["≤ $4M", "$4M–$50M", "> $50M"],
  },
  "Compliance and Financial Crimes": {
    "Alert Volume": ["≤ 1M", "1M–3M", "> 3M"],
    "Compliance Review Volume": ["≤ 1M", "1M–3M", "> 3M"],
  },
  Other: {
    "Customers / Prospects Scored": ["≤ 1M", "1M–3M", "> 3M"],
    "Pre-Tax Income": ["≤ $5M", "$5M–$11M", "> $11M"],
  },
};
const FOOTNOTES = [
  "Customer-facing GenAI use cases are assessed based on whether the model output is used for direct decisioning in AXP’s core lending and payments business, as such models may lead to potential customer impact or harm. The extent of impact is determined through the structured risk assessment in Section 2, while non-core business use cases that do not affect customers’ ability to access credit or make payments are considered to have minimal customer impact or harm.",
  "Mandatory controls include but are not limited to: User access control; disclaimers to inform use of AI; incident reporting or backup options in case of discontinuation or disruption of service; usage of approved upstream models (if applicable); prevention of sensitive data leakage and blocking of harmful content, e.g., AI Firewall; and robust implementation and change management controls, including segregated development, test, and production environments, release approvals, and a rollback path.",
  "Model outputs that directly inform or result in a business decision or action must be subject to review by a subject-matter expert for each applicable case prior to use. For outputs that are informational, advisory, or otherwise do not drive business decisions or actions, subject-matter expert review may be performed on a sample to ascertain model accuracy.",
];

function x(value) {
  return String(value ?? "").replace(/[&<>\"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
}
function list(value) { return Array.isArray(value) ? value : value ? [value] : []; }
function slug(value) { return String(value || "submission").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "submission"; }
function todayDisplay() { return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }
function formatDate(value) {
  if (!value) return "";
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.valueOf()) ? String(value) : new Intl.DateTimeFormat("en-US", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}
function label(value, choices) { return choices[value] || value || ""; }

export function normalizedMetrics(data) {
  if (data.metricName) {
    const names = list(data.metricName), fields = ["metricName", "metricValue", "metricRationale", "metricGreen", "metricAmber", "metricRed"];
    return names.map((_, i) => Object.fromEntries(fields.map(field => [field, list(data[field])[i] || ""])));
  }
  return [1, 2].map(number => ({
    metricName: data[`metric${number}`] || "", metricValue: data[`metric${number}Value`] || "",
    metricRationale: data[`metric${number}Rationale`] || "", metricGreen: data[`metric${number}Green`] || "",
    metricAmber: data[`metric${number}Amber`] || "", metricRed: data[`metric${number}Red`] || "",
  })).filter(metric => metric.metricName);
}

function normalizedCalls(data) {
  const fields = ["promptCallName", "promptCallPurpose", "promptCallText", "promptCallConstraints", "promptCallOutputFormat", "promptCallExampleInput", "promptCallExampleOutput", "promptCallVersion"];
  const count = Math.max(0, ...fields.map(field => list(data[field]).length));
  return Array.from({ length: count }, (_, i) => Object.fromEntries(fields.map(field => [field, list(data[field])[i] || ""])));
}

function r(text, options = {}) {
  const props = [
    `<w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>`, options.bold ? "<w:b/>" : "", options.italic ? "<w:i/>" : "",
    options.underline ? '<w:u w:val="single"/>' : "", options.color ? `<w:color w:val="${options.color}"/>` : "",
    options.highlight ? `<w:shd w:fill="${options.highlight}"/>` : "", `<w:sz w:val="${Math.round((options.size || 10.5) * 2)}"/>`,
  ].join("");
  return String(text ?? "").split(/\r?\n/).map((line, i) => `${i ? "<w:br/>" : ""}<w:r><w:rPr>${props}</w:rPr><w:t xml:space="preserve">${x(line)}</w:t></w:r>`).join("");
}
function p(content = "", options = {}) {
  const runs = options.raw ? content : r(content, options);
  const pPr = [
    options.style ? `<w:pStyle w:val="${options.style}"/>` : "",
    `<w:spacing w:before="${options.before ?? 0}" w:after="${options.after ?? 100}" w:line="${options.line ?? 240}" w:lineRule="auto"/>`,
    options.keepNext ? "<w:keepNext/>" : "", options.pageBreakBefore ? "<w:pageBreakBefore/>" : "",
    options.indent ? `<w:ind w:left="${options.indent}" w:hanging="${options.hanging || 0}"/>` : "",
    options.align ? `<w:jc w:val="${options.align}"/>` : "",
    options.leftBorder ? `<w:pBdr><w:left w:val="single" w:sz="16" w:space="7" w:color="${COLORS.magenta}"/></w:pBdr>` : "",
    options.bottomBorder ? `<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="7" w:color="7F7F7F"/></w:pBdr>` : "",
  ].join("");
  return `<w:p><w:pPr>${pPr}</w:pPr>${runs}</w:p>`;
}
function heading(text, level = 1) { return p(text, { style: level === 1 ? "Heading1" : "Heading2", before: level === 1 ? 180 : 120, after: 100, keepNext: true }); }
function prompt(number, text) { return p(r(`${number}.   ${text}`, { bold: true }), { raw: true, before: 150, after: 80, keepNext: true }); }
function option(selected, text, italic = false, keepNext = false) { return p(`${selected ? "☒" : "☐"}   ${text}`, { italic, indent: 480, hanging: 60, after: 65, leftBorder: selected, keepNext }); }
function bullet(text, options = {}) { return p(r("•  ", { bold: options.bold }) + r(text, options), { raw: true, indent: 520, hanging: 260, after: 65 }); }
function pageBreak() { return `<w:p><w:r><w:br w:type="page"/></w:r></w:p>`; }

function tc(value, options = {}) {
  const fill = options.fill ? `<w:shd w:fill="${options.fill}"/>` : "";
  const borders = options.noBorders ? "" : `<w:tcBorders><w:top w:val="single" w:sz="5" w:color="${options.border || COLORS.line}"/><w:left w:val="single" w:sz="5" w:color="${options.border || COLORS.line}"/><w:bottom w:val="single" w:sz="5" w:color="${options.border || COLORS.line}"/><w:right w:val="single" w:sz="5" w:color="${options.border || COLORS.line}"/></w:tcBorders>`;
  const bottom = options.bottom ? `<w:tcBorders><w:bottom w:val="single" w:sz="6" w:color="595959"/><w:left w:val="single" w:sz="14" w:color="${COLORS.magenta}"/></w:tcBorders>` : "";
  const cellP = p(value, { bold: options.bold, color: options.color, size: options.size || 9.5, align: options.align, after: 0, line: 220 });
  return `<w:tc><w:tcPr><w:tcW w:w="${options.width || 2000}" w:type="dxa"/>${fill}${bottom || borders}<w:tcMar><w:top w:w="80" w:type="dxa"/><w:left w:w="90" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:right w:w="90" w:type="dxa"/></w:tcMar><w:vAlign w:val="center"/></w:tcPr>${cellP}</w:tc>`;
}
function table(rows, options = {}) {
  const widths = options.widths || rows[0].map(() => Math.floor(9400 / rows[0].length));
  const grid = widths.map(width => `<w:gridCol w:w="${width}"/>`).join("");
  const tr = rows.map((row, rowIndex) => `<w:tr><w:trPr><w:cantSplit/>${rowIndex === 0 ? "<w:tblHeader/>" : ""}</w:trPr>${row.map((value, columnIndex) => tc(value, {
    width: widths[columnIndex], fill: rowIndex === 0 ? (options.headerFill || COLORS.lightBlue) : "",
    bold: rowIndex === 0 || (options.boldFirstColumn && columnIndex === 0),
    color: rowIndex === 0 && options.headerFill === COLORS.navy ? "FFFFFF" : COLORS.ink,
    align: rowIndex === 0 ? "center" : undefined,
  })).join("")}</w:tr>`).join("");
  return `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>${grid}</w:tblGrid>${tr}</w:tbl>`;
}
function lineValue(labelText, value, labelWidth = 2200) {
  return `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid><w:gridCol w:w="${labelWidth}"/><w:gridCol w:w="${9400 - labelWidth}"/></w:tblGrid><w:tr>${tc(labelText, { width: labelWidth, noBorders: true, size: 10.5 })}${tc(value, { width: 9400 - labelWidth, bottom: true, size: 10.5 })}</w:tr></w:tbl>`;
}
function attachmentCard(filename, description) {
  return `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid><w:gridCol w:w="800"/><w:gridCol w:w="8600"/></w:tblGrid><w:tr>${tc("FILE", { width: 800, fill: "E7E6E6", bold: true, color: COLORS.blue, size: 8, align: "center" })}${tc(filename + "\n" + description, { width: 8600, size: 9 })}</w:tr></w:tbl>`;
}

function footnoteReference(id) {
  return `<w:r><w:rPr><w:rStyle w:val="FootnoteReference"/></w:rPr><w:footnoteReference w:id="${id}"/></w:r>`;
}

function embeddedObject(index, filename, description) {
  const shapeId = `_x0000_i${1100 + index}`;
  const extension = filename.split(".").pop().toUpperCase();
  return `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid><w:gridCol w:w="1450"/><w:gridCol w:w="7950"/></w:tblGrid><w:tr><w:tc><w:tcPr><w:tcW w:w="1450" w:type="dxa"/><w:tcBorders><w:top w:val="single" w:sz="5" w:color="BFBFBF"/><w:left w:val="single" w:sz="5" w:color="BFBFBF"/><w:bottom w:val="single" w:sz="5" w:color="BFBFBF"/><w:right w:val="single" w:sz="5" w:color="BFBFBF"/></w:tcBorders><w:shd w:fill="E7E6E6"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="0"/></w:pPr><w:r><w:object w:dxaOrig="1200" w:dyaOrig="650"><v:shape id="${shapeId}" type="#_x0000_t75" style="width:60pt;height:34pt" o:ole=""><v:fill color="E7E6E6"/><v:stroke color="7F7F7F"/><v:textbox inset="2pt,2pt,2pt,2pt"><w:txbxContent><w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="0"/></w:pPr>${r(extension, { bold: true, color: COLORS.blue, size: 8 })}</w:p></w:txbxContent></v:textbox></v:shape><o:OLEObject Type="Embed" ProgID="${extension === "XLSX" ? "Excel.Sheet.12" : extension === "DOCX" ? "Word.Document.12" : "Package"}" ShapeID="${shapeId}" DrawAspect="Icon" ObjectID="_${1200000000 + index}" r:id="rIdEmbed${index}"/></w:object></w:r></w:p></w:tc>${tc(filename + "\n" + description + "\nDouble-click the object icon to open the embedded file.", { width: 7950, size: 9 })}</w:tr></w:tbl>`;
}

function businessImpactTable(data) {
  const rows = [["Business Process", "Quantitative Driver (annual)", "Quantitative Threshold"]];
  for (const [process, drivers] of Object.entries(BUSINESS_RULES)) {
    for (const [driver, bands] of Object.entries(drivers)) {
      [["Large", bands[2], "large"], ["Medium", bands[1], "medium"], ["Small", bands[0], "small"]].forEach(([band, threshold, key]) => {
        const chosen = process === data.businessProcess && driver === data.quantDriver;
        rows.push([
          `${chosen ? "☒" : "☐"} ${process}`,
          `${chosen ? "☒" : "☐"} ${driver}`,
          `${chosen && data.impactThreshold === key ? "☒" : "☐"} ${band}: ${threshold}`,
        ]);
      });
    }
  }
  return table(rows, { widths: [2700, 3100, 3600], headerFill: COLORS.lightBlue });
}

function mimeFor(filename) {
  const ext = filename.split(".").pop().toLowerCase();
  return ({ docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", pdf: "application/pdf", txt: "text/plain", csv: "text/csv", json: "application/json" })[ext] || "application/octet-stream";
}

function footnotesXml(notes = []) {
  const note = (id, text) => `<w:footnote w:id="${id}"><w:p><w:pPr><w:pStyle w:val="FootnoteText"/></w:pPr><w:r><w:rPr><w:rStyle w:val="FootnoteReference"/></w:rPr><w:footnoteReference/></w:r>${r(" " + text, { size: 9 })}</w:p></w:footnote>`;
  return `${XML}<w:footnotes xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:footnote w:type="separator" w:id="-1"><w:p><w:r><w:separator/></w:r></w:p></w:footnote><w:footnote w:type="continuationSeparator" w:id="0"><w:p><w:r><w:continuationSeparator/></w:r></w:p></w:footnote>${notes.map((text, index) => note(index + 1, text)).join("")}</w:footnotes>`;
}

async function makeDocx(title, body, embeddings = [], footnotes = [], options = {}) {
  const zip = new JSZip();
  const embeddedTypes = embeddings.map((item, index) => `<Override PartName="/word/embeddings/embedded${index + 1}.${x(item.filename.split(".").pop().toLowerCase())}" ContentType="${x(item.contentType || mimeFor(item.filename))}"/>`).join("");
  zip.file("[Content_Types].xml", `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/><Override PartName="/word/footnotes.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>${embeddedTypes}</Types>`);
  zip.folder("_rels").file(".rels", `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`);
  const embeddedRels = embeddings.map((item, index) => `<Relationship Id="rIdEmbed${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/package" Target="embeddings/embedded${index + 1}.${x(item.filename.split(".").pop().toLowerCase())}"/>`).join("");
  zip.folder("word").folder("_rels").file("document.xml.rels", `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/><Relationship Id="rIdFootnotes" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footnotes" Target="footnotes.xml"/>${embeddedRels}</Relationships>`);
  zip.folder("word").file("settings.xml", `${XML}<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:zoom w:percent="100"/><w:defaultTabStop w:val="720"/><w:compat/></w:settings>`);
  zip.folder("word").file("styles.xml", `${XML}<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:color w:val="${COLORS.ink}"/><w:sz w:val="21"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="100" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="100"/></w:pPr><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:color w:val="${COLORS.blue}"/><w:sz w:val="40"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:keepNext/><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:color w:val="${COLORS.blue}"/><w:sz w:val="31"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:keepNext/><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:color w:val="${COLORS.ink}"/><w:sz w:val="24"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="FootnoteText"><w:name w:val="footnote text"/><w:basedOn w:val="Normal"/><w:rPr><w:sz w:val="18"/></w:rPr></w:style><w:style w:type="character" w:styleId="FootnoteReference"><w:name w:val="footnote reference"/><w:rPr><w:vertAlign w:val="superscript"/><w:sz w:val="16"/></w:rPr></w:style></w:styles>`);
  zip.folder("word").file("footnotes.xml", footnotesXml(footnotes));
  const titleBlock = options.renderTitle === false ? "" : p(title, { style: "Title", after: 100 });
  zip.folder("word").file("document.xml", `${XML}<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office"><w:body>${titleBlock}${body}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="936" w:right="1296" w:bottom="936" w:left="1296" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr></w:body></w:document>`);
  for (const [index, item] of embeddings.entries()) zip.folder("word").folder("embeddings").file(`embedded${index + 1}.${item.filename.split(".").pop().toLowerCase()}`, item.data);
  const props = zip.folder("docProps");
  props.file("core.xml", `${XML}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${x(title)}</dc:title><dc:creator>MRMG First Line Portal</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created></cp:coreProperties>`);
  props.file("app.xml", `${XML}<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>MRMG First Line Portal</Application></Properties>`);
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}

function primaryBody(data) {
  const markets = list(data.markets);
  const purposeOptions = [
    ["core", "Model decision has direct impact on AXP's core business, e.g., payment and lending decisions."],
    ["peopleCompliance", "Model is used in applications that affect employment, compliance, legal, or regulatory decisions."],
    ["customerExperience", "Model enhances customer experience, communications, or service interactions."],
    ["efficiency", "Model creates productivity or efficiency within AXP's core business, e.g., code suggestions or colleague support."],
  ];
  let body = p(r("Who should complete: ", { bold: true, italic: true }) + r("Use-case owner or modeling lead (B40+)", { italic: true }), { raw: true, after: 80 });
  body += p(r("Instructions: ", { bold: true, italic: true }) + r("For each question, choose the single best option. If unsure, choose the higher-impact option.", { italic: true }), { raw: true });
  body += prompt(1, "Which of the following types of GenAI solution fits this use case best? (Select one)");
  body += option(data.solutionType === "general", "General-purpose AI capability or tool, e.g., ChatGPT, Microsoft Office Copilot, coding accelerators, or another capability without a specific business purpose.");
  body += option(data.solutionType === "custom", "Customized solution for a specific business purpose or use, e.g., task generation, control recommender, help-desk assistant, etc.");
  if (data.solutionType !== "general") {
    body += prompt(2, "Is the model output used as an input to any regulatory reporting (e.g., CCAR, CECL, SAR filings, stress testing, capital or liquidity reporting, etc.)?");
    body += option(data.regulatory === "yes", "Yes") + option(data.regulatory === "no", "No");
    body += prompt(3, "What is the purpose and business usage of the model?");
    for (const [key, text] of purposeOptions) body += option(data.purpose === key, text, true);
  }
  const nextStep = data.section2Included
    ? " Model Impact Category assessment required. Complete Section 1 and Section 2, then submit the document on Model Store and contact MRMG for next steps."
    : " It is a Low Impact model. Proceed to fill in Section 1. Submit this document to Model Store after completing Section 1.";
  body += p(r("Next Step:", { bold: true, highlight: COLORS.yellow }) + r(nextStep, { bold: true, color: data.section2Included ? COLORS.blue : "548235" }), { raw: true, before: 140, after: 120 });

  body += pageBreak() + heading("Section 1: GenAI Low Impact Model Document Questionnaire") + heading("Model Details", 2);
  body += p("Select all markets in which the model is currently used or expected to be used at go-live (select all that apply):", { bold: true });
  body += option(markets.includes("US"), "US") + option(markets.includes("EU"), "EU*") + option(markets.includes("Other"), `Other – Please specify: ${markets.includes("Other") ? data.otherMarket || "" : ""}`);
  body += p(r("Customer-facing routing and impact are evaluated under the framework", { italic: true, size: 9 }) + footnoteReference(1), { raw: true });
  body += prompt(1, "Please provide the name and an overview of the use case along with a summary of model inputs and outputs.");
  body += lineValue("Use Case Name:", data.useCaseName) + lineValue("Overview:", data.overview);
  body += table([["Model Inputs", "Generated Outputs"], [data.modelInputs, data.generatedOutputs]], { widths: [4700, 4700], headerFill: COLORS.lightBlue });
  body += p("Optional Supporting documents", { bold: true, before: 120, after: 60 });
  body += p("If applicable, attach supporting workflow, control, or use-case documentation. " + (list(data.supportingFileNames).length ? `Included in this ZIP: ${list(data.supportingFileNames).join(", ")}.` : "No optional supporting files were supplied."));
  list(data.supportingFileNames).forEach((name, index) => { body += embeddedObject(index + 5, name, "Optional supporting evidence supplied with this submission"); });
  body += prompt(2, "GenAI technology: Please provide the Generative AI model leveraged, hosting location, and whether the use case is implemented as an Agentic AI.");
  body += lineValue("Model Name:", data.modelName) + lineValue("Model Version:", data.modelVersion);
  body += lineValue("Hosting Location:", data.hosting === "axp" ? "Model inference runs within an AXP-governed platform" : "Third-party governed platform where data handling is governed outside AXP");
  body += p("Agentic AI?", { bold: true, before: 100, after: 40 }) + option(data.agentic === "yes", "Yes") + option(data.agentic === "no", "No");
  body += prompt(3, "Please attach the model validation results, including:");
  for (const item of ["Prompts (applicable for in-house developed use cases)", "Sample size reviewed", "Performance indicators used (e.g., model accuracy, output quality, user acceptance)", "Outcome analysis"]) body += bullet(item);
  body += embeddedObject(1, "Outcome Analysis.xlsx", "Completed validation results and metric rationale") + embeddedObject(2, "Prompt Submission Template.docx", "Completed prompt wording, constraints, outputs, and revision history");
  body += prompt(4, "What is the planned implementation date for the use case?") + lineValue("Implementation Date:", formatDate(data.implementationDate));

  body += heading("5. Additional Details Required") + heading("B70+ Business Attestation", 2);
  body += p("Attach an email from the business B70+ confirming that:");
  for (const item of ATTESTATIONS) body += bullet(item);
  body += embeddedObject(3, "B70+ Attestation Template.docx", "Formal attestation for the named B70+ business owner to review and approve");
  body += p("The attestation may be provided by the primary B70+ business owner. Where there is no single owner, such as for a foundational capability, a B70+ owner who uses the capability or owns the relevant process may provide the attestation.", { italic: true, size: 9 });
  body += heading("Ongoing Monitoring Plan", 2) + p("Submit the ongoing monitoring plan with defined metrics, thresholds, cadence, action triggers, and evidence-retention expectations.");
  body += embeddedObject(4, "Ongoing Monitoring Plan.docx", "Completed monitoring cadence, thresholds, and action plan");
  body += pageBreak() + heading("Mandatory Controls", 2) + p(r("The following controls are required", { bold: true }) + footnoteReference(2), { raw: true });
  for (const item of ["User access controls and appropriate AI-use disclaimers.", "Incident reporting, fallback, and backup options.", "Approved upstream models and governed hosting arrangements.", "Controls preventing sensitive-data leakage and harmful content.", "Robust implementation, testing, monitoring, and change-management controls."]) body += bullet(item);

  if (data.section2Included) {
    const components = data.assessmentComponents || {};
    body += pageBreak() + heading("Section 2: Model Risk Tier Assessment");
    body += p("Who are the intended end users of this use case? (Select one)", { bold: true });
    body += option(data.endUsers === "none", "No direct end users / foundational capability") + option(data.endUsers === "customer", "Customer-facing or applied to customer-impacting decisions") + option(data.endUsers === "internal", "Internal colleagues");
    body += heading("A. Business Impact (Quantitative)", 2) + businessImpactTable(data);
    body += p("All quantitative driver metrics—including action volume, gross contribution margin, pre-tax income, and related measures—are measured on an annual basis.", { italic: true, size: 9 });
    body += p("Adverse Action Volume is the number of customers adversely impacted (for example, pended or declined transactions or applications). Alert Volume is measured by entities screened for screening models and by alerts or cases evaluated for true-match/false-positive models. If no traditional metric is available, estimate and report pre-tax income impact.", { italic: true, size: 9 });
    body += heading("B. Business Importance (Qualitative)", 2) + option(data.reliance === "direct", "Direct reliance / automated decision") + option(data.reliance === "human", "Human review or fallback") + option(data.reliance === "multiple", "Multiple reviews / recommendation only");
    body += p(r("Subject-matter expert review requirements apply to model outputs", { italic: true, size: 9 }) + footnoteReference(3), { raw: true });
    body += heading("C. Model Complexity", 2) + p("C1 – Explainability feasible?", { bold: true, keepNext: true }) + option(data.explainable === "yes", "Yes", false, true) + option(data.explainable === "no", "No");
    body += p("C2 – Foundational model fine-tuned?", { bold: true, keepNext: true }) + option(data.fineTuned === "yes", "Yes", false, true) + option(data.fineTuned === "no", "No");
    body += p("C3 – More than two sequential LLM calls?", { bold: true, keepNext: true }) + option(data.multiCall === "yes", "Yes", false, true) + option(data.multiCall === "no", "No");
    body += heading("D. Interdependency", 2) + option(data.downstream === "none", "0–1 downstream dependencies") + option(data.downstream === "some", "2–5 downstream dependencies") + option(data.downstream === "many", "6+ downstream dependencies");
    body += table([["qn (40%)", "ql (40%)", "cx (10%)", "dd (10%)", "MIC"], [components.qn, components.ql, components.cx, components.dd, Number(data.assessmentScore).toFixed(2)]], { widths: [1880, 1880, 1880, 1880, 1880], headerFill: COLORS.lightBlue });
    body += p(r("Model Impact Category: ", { bold: true }) + r(data.impactTier, { bold: true }), { raw: true, leftBorder: true, before: 120 });
    body += p("MIC = 0.4 × qn + 0.4 × ql + 0.1 × cx + 0.1 × dd. Bands: Low < 1.2; Medium < 1.8; High < 2.2; Critical ≥ 2.2.", { italic: true, size: 9 });
  }

  body += pageBreak() + heading("Appendix: Sample Pre-Tax Income Estimation") + p("For productivity and efficiency use cases, estimate annual pre-tax income impact using documented time saved, affected colleague or customer volumes, adoption, and applicable loaded cost or value assumptions. Retain the calculation and assumptions with the submission.");
  body += heading("Supporting Files in Submission ZIP", 2) + p("These completed artifacts are included as separate, usable files in the submission ZIP:");
  for (const name of ["Outcome Analysis.xlsx", "Prompt Submission Template.docx", "Ongoing Monitoring Plan.docx", "B70+ Attestation Template.docx", "B70+ Attestation Email.eml", "submission.json"]) body += bullet(name, { bold: true });
  return body;
}

function promptBody(data) {
  let body = p("A Guide for Model Owners to Structure and Document Prompts for LLM Calls", { color: COLORS.gray, size: 12, after: 180 });
  body += heading("Model Owner Documentation Guidance");
  const guidance = [
    ["Purpose", "Clearly define the objective of each LLM call and why it is used in the workflow."],
    ["Prompt Structure", "Document the prompt wording, expected context, and any placeholders (e.g., {{user_input}})."],
    ["Policy and Constraints", "List relevant company policies, content guidelines, or operational rules the LLM must enforce or check."],
    ["Output Format", "Specify the expected LLM output format to ensure consistency and easy integration."],
    ["Examples", "Provide sample user messages and sample outputs for each prompt to illustrate expected behavior."],
    ["Revision History", "Track changes and updates to the prompt documentation for traceability."],
  ];
  for (const [name, text] of guidance) body += bullet(`${name}: ${text}`);
  body += p("Model owners are encouraged to regularly review and update prompt documentation to reflect evolving business requirements, policy changes, and improvements in LLM capabilities. Thorough documentation helps ensure transparency, reproducibility, and responsible AI deployment.");
  normalizedCalls(data).forEach((call, i) => {
    body += pageBreak() + heading(`LLM Call ${i + 1}: ${call.promptCallName}`);
    body += table([["Section", "Details"], ["Prompt Name", call.promptCallName], ["Purpose", call.promptCallPurpose], ["Prompt Structure", call.promptCallText], ["Policy and Constraints", call.promptCallConstraints], ["Output Format", call.promptCallOutputFormat], ["Example Input", call.promptCallExampleInput], ["Example Output", call.promptCallExampleOutput]], { widths: [2350, 7050], headerFill: "F2F2F2", boldFirstColumn: true });
    body += heading("Revision History", 2) + table([["Version", "Date", "Change", "Owner"], [call.promptCallVersion, todayDisplay(), "Submitted through First Line intake", data.modelOwner]], { widths: [1100, 1600, 4500, 2200], headerFill: "7F7F7F" });
  });
  return body;
}

function monitoringBody(data, metrics) {
  let body = p("Example for Ongoing Monitoring Plan", { bold: true, underline: true, size: 14, after: 160 });
  body += p(`Please specify the ${String(data.monitoringFrequency || "annual").toLowerCase()} ongoing monitoring plan and include details (for e.g. sample size, performance metrics like accuracy / hallucination rate / acceptance rate / user satisfaction, etc.).`);
  body += p("Model performance metric(s):", { bold: true, before: 100 });
  metrics.forEach((metric, i) => { body += p(`${i + 1}. ${metric.metricName} — ${metric.metricValue}`, { indent: 360, after: 45 }); });
  body += p("Note: In case the performance metrics being tracked are not aligned with model outcomes analysis, please provide a rationale for the choice of model performance metric(s).", { italic: true, size: 9.5 });
  body += p(r("Rationale for model performance metrics: ", { bold: true }) + r(metrics.map(metric => metric.metricRationale).join(" ")), { raw: true });
  body += p("Sample size:", { bold: true, before: 160 }) + p(`For model performance monitoring, ${data.sampleSize} records from production data will be used.`);
  body += p("Thresholds and Action Plan:", { bold: true, before: 160 });
  const rows = [["Metric", "Status", "Threshold of the Testing / Metric", "Action Plan"]];
  const actions = { Red: "Root Cause Analysis (RCA)\nFormal governance escalation\nRemediate, redevelop, or temporarily restrict use", Amber: "Increase review cadence\nInvestigate persistent deterioration\nDocument rationale, controls, and next steps", Green: "Continue planned monitoring\nRetain testing evidence and reviewer conclusions" };
  for (const metric of metrics) for (const status of ["Red", "Amber", "Green"]) rows.push([metric.metricName, status, metric[`metric${status}`], actions[status]]);
  body += table(rows, { widths: [1600, 1000, 2800, 4000], headerFill: COLORS.navy });
  return body;
}

function attestationBody(data) {
  let body = p("Reference Template for B70+ Attestation", { bold: true, underline: true, size: 12, after: 180 });
  body += p(r("Subject: ", { bold: true }) + r(`B70+ Attestation for GenAI Use Case - ${data.useCaseName}`), { raw: true });
  body += p(`Dear ${data.businessOwnerName},`) + p(`To proceed with model risk certification for the GenAI use case ${data.useCaseName}, a formal attestation from the business owner (B70+) is required.`);
  body += p("This attestation serves as confirmation that:");
  body += bullet(ATTESTATIONS[0]);
  body += bullet(ATTESTATIONS[1]);
  body += p(r("•  ") + r("Mandatory controls¹") + r(" have been tested for effectiveness and will be implemented in production."), { raw: true, indent: 520, hanging: 260, after: 65 });
  body += bullet(ATTESTATIONS[3]);
  body += bullet(ATTESTATIONS[4]);
  body += p("Please find attached:", { bold: true });
  B70_ATTACHMENTS.forEach(item => { body += bullet(item); });
  body += p(B70_APPLICABILITY_NOTE, { italic: true, size: 8.5 });
  body += p("Attestation", { bold: true, size: 12, before: 160, keepNext: true }) + p("As the designated business owner (B70+), I confirm the following:");
  b70FormalAttestations().forEach(([name, text], i) => { body += p(r(`${i + 1}. ${name}\n`, { bold: true }) + r(text), { raw: true, indent: 240, hanging: 240 }); });
  body += p(B70_APPLICABILITY_NOTE, { italic: true, size: 8.5 });
  body += p("", { bottomBorder: true, after: 100 });
  body += p("¹ Mandatory controls include but are not limited to:", { size: 9, before: 180 });
  MANDATORY_CONTROLS.forEach(item => { body += bullet(item, { size: 9 }); });
  body += p("Thanks,", { bold: true, before: 160 });
  return body;
}

function base64Lines(bytes) {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  return btoa(binary).match(/.{1,76}/g).join("\r\n");
}

function makeB70Email(data, attachments) {
  const safeHeader = value => String(value || "").replace(/[\r\n]+/g, " ").trim();
  const plainBody = [
    `Dear ${safeHeader(data.businessOwnerName)},`, "",
    `To proceed with model risk certification for the GenAI use case ${safeHeader(data.useCaseName)}, a formal attestation from the business owner (B70+) is required.`, "",
    "This attestation serves as confirmation that:",
    `- ${ATTESTATIONS[0]}`,
    `- ${ATTESTATIONS[1]}`,
    "- Mandatory controls¹ have been tested for effectiveness and will be implemented in production.",
    `- ${ATTESTATIONS[3]}`,
    `- ${ATTESTATIONS[4]}`, "",
    "Please find attached:",
    ...B70_ATTACHMENTS.map(item => `- ${item}`),
    B70_APPLICABILITY_NOTE, "",
    "Attestation", "",
    "As the designated business owner (B70+), I confirm the following:", "",
    ...b70FormalAttestations().flatMap(([name, text], i) => [`${i + 1}. ${name}`, text, ""]),
    B70_APPLICABILITY_NOTE, "",
    "------------------------------------------------------------", "",
    "¹ Mandatory controls include but are not limited to:",
    ...MANDATORY_CONTROLS.map(item => `- ${item}`), "",
    "Thanks,", "",
  ].join("\r\n");
  const htmlList = items => `<ul>${items.map(item => `<li>${x(item)}</li>`).join("")}</ul>`;
  const htmlBody = `<!doctype html><html><body style="margin:0;background:#ffffff;color:#111111;font-family:Arial,sans-serif;font-size:11pt;line-height:1.35"><div style="max-width:720px;margin:0;padding:8px 4px"><p>Dear ${x(safeHeader(data.businessOwnerName))},</p><p>To proceed with <strong>model risk certification</strong> for the GenAI use case ${x(safeHeader(data.useCaseName))}, a formal attestation from the business owner (B70+) is required.</p><p><strong>This attestation serves as confirmation that:</strong></p>${htmlList([ATTESTATIONS[0], ATTESTATIONS[1], "Mandatory controls¹ have been tested for effectiveness and will be implemented in production.", ATTESTATIONS[3], ATTESTATIONS[4]])}<p><strong>Please find attached:</strong></p>${htmlList(B70_ATTACHMENTS)}<p style="font-size:9pt"><em>${x(B70_APPLICABILITY_NOTE)}</em></p><p style="font-size:13pt"><strong>Attestation</strong></p><p>As the designated business owner (B70+), I confirm the following:</p>${b70FormalAttestations().map(([name, text], i) => `<p style="margin-left:18px"><strong>${i + 1}. ${x(name)}</strong><br>${x(text)}</p>`).join("")}<p style="font-size:9pt"><em>${x(B70_APPLICABILITY_NOTE)}</em></p><hr style="border:0;border-top:1px solid #777;margin:18px 0"><p><sup>1</sup> <strong>Mandatory controls</strong> include but are not limited to:</p>${htmlList(MANDATORY_CONTROLS)}<p><strong>Thanks,</strong></p></div></body></html>`;
  const boundary = `----MRMG-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const alternativeBoundary = `${boundary}-alternative`;
  const parts = [
    `--${boundary}`, `Content-Type: multipart/alternative; boundary="${alternativeBoundary}"`, "",
    `--${alternativeBoundary}`, "Content-Type: text/plain; charset=UTF-8", "Content-Transfer-Encoding: 8bit", "", plainBody,
    `--${alternativeBoundary}`, "Content-Type: text/html; charset=UTF-8", "Content-Transfer-Encoding: 8bit", "", htmlBody,
    `--${alternativeBoundary}--`, "",
  ];
  for (const item of attachments) parts.push(
    `--${boundary}`,
    `Content-Type: ${item.contentType}; name="${safeHeader(item.filename)}"`,
    "Content-Transfer-Encoding: base64",
    `Content-Disposition: attachment; filename="${safeHeader(item.filename)}"`, "", base64Lines(item.data),
  );
  parts.push(`--${boundary}--`, "");
  return [`From: ${safeHeader(data.modelOwner)} <${safeHeader(data.modelOwnerEmail)}>`, `To: ${safeHeader(data.businessOwnerName)} <${safeHeader(data.businessOwnerEmail)}>`, `Subject: B70+ Attestation for GenAI Use Case - ${safeHeader(data.useCaseName)}`, "Date: " + new Date().toUTCString(), "MIME-Version: 1.0", `Content-Type: multipart/mixed; boundary="${boundary}"`, "X-Unsent: 1", "", ...parts].join("\r\n");
}

function cell(ref, value, style = 0) { return `<c r="${ref}" t="inlineStr" s="${style}"><is><t xml:space="preserve">${x(value)}</t></is></c>`; }
async function makeXlsx(data, metrics) {
  const rows = [
    ["Outcome Analysis", ""], ["Use Case", data.useCaseName], ["Model", `${data.modelName || ""} ${data.modelVersion || ""}`.trim()],
    ["Field", "Description"], ["Sample Size", data.sampleSize],
  ];
  metrics.forEach((metric, i) => rows.push(
    [`Performance Metric ${i + 1}\n(Name & Description)`, metric.metricName],
    [`Rationale for Metric ${i + 1}`, metric.metricRationale],
    [`Performance Metric ${i + 1} Value`, metric.metricValue],
    [`Performance Metric ${i + 1} Green Threshold`, metric.metricGreen],
    [`Performance Metric ${i + 1} Amber Threshold`, metric.metricAmber],
    [`Performance Metric ${i + 1} Red Threshold`, metric.metricRed],
  ));
  const zip = new JSZip();
  zip.file("[Content_Types].xml", `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`);
  zip.folder("_rels").file(".rels", `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`);
  zip.folder("xl").file("workbook.xml", `${XML}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Outcome Analysis" sheetId="1" r:id="rId1"/></sheets></workbook>`);
  zip.folder("xl").folder("_rels").file("workbook.xml.rels", `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
  zip.folder("xl").file("styles.xml", `${XML}<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="4"><font><sz val="10"/><name val="Arial"/><color rgb="FF333333"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="10"/><name val="Arial"/></font><font><b/><color rgb="FF365C73"/><sz val="15"/><name val="Arial"/></font><font><b/><color rgb="FF333333"/><sz val="10"/><name val="Arial"/></font></fonts><fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF203864"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFD9E2F3"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border/><border><left style="thin"><color rgb="FF7F7F7F"/></left><right style="thin"><color rgb="FF7F7F7F"/></right><top style="thin"><color rgb="FF7F7F7F"/></top><bottom style="thin"><color rgb="FF7F7F7F"/></bottom></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="6"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="3" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="3" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`);
  const sheetRows = rows.map((row, i) => {
    const styleA = i === 0 ? 3 : i === 3 ? 1 : i < 3 ? 5 : 4;
    const styleB = i === 0 ? 3 : i === 3 ? 1 : 2;
    const height = i === 0 ? 30 : i === 3 ? 27 : i < 3 ? 24 : 44;
    return `<row r="${i + 1}" ht="${height}" customHeight="1">${cell(`A${i + 1}`, row[0], styleA)}${cell(`B${i + 1}`, row[1], styleB)}</row>`;
  }).join("");
  zip.folder("xl").folder("worksheets").file("sheet1.xml", `${XML}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><sheetViews><sheetView workbookViewId="0" showGridLines="0"><pane ySplit="4" topLeftCell="A5" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="1" width="41" customWidth="1"/><col min="2" max="2" width="80" customWidth="1"/></cols><sheetData>${sheetRows}</sheetData><mergeCells count="1"><mergeCell ref="A1:B1"/></mergeCells><pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/><pageSetup orientation="portrait" paperSize="1" fitToWidth="1" fitToHeight="0"/></worksheet>`);
  const props = zip.folder("docProps");
  props.file("core.xml", `${XML}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Outcome Analysis</dc:title><dc:creator>MRMG First Line Portal</dc:creator></cp:coreProperties>`);
  props.file("app.xml", `${XML}<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>MRMG First Line Portal</Application></Properties>`);
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}

export async function generateBrowserPackage(data, supportingFiles = []) {
  const metrics = normalizedMetrics(data);
  if (!metrics.length) throw new Error("At least one performance metric is required.");
  const safe = { ...data, metrics, supportingFileNames: supportingFiles.map(file => file.name) };
  delete safe.supportingFiles;
  const outer = new JSZip();
  const [prompts, monitoring, attestation, workbook] = await Promise.all([
    makeDocx("LLM Prompt Documentation Template", promptBody(safe)),
    makeDocx("Ongoing Monitoring Plan", monitoringBody(safe, metrics)),
    makeDocx("Reference Template for B70+ Attestation", attestationBody(safe), [], [], { renderTitle: false }),
    makeXlsx(safe, metrics),
  ]);
  const supportingEmbeddings = [];
  for (const file of supportingFiles) supportingEmbeddings.push({ filename: String(file.name).split(/[\\/]/).pop(), data: new Uint8Array(await file.arrayBuffer()), contentType: file.type || mimeFor(file.name) });
  const primaryEmbeddings = [
    { filename: "Outcome Analysis.xlsx", data: workbook },
    { filename: "Prompt Submission Template.docx", data: prompts },
    { filename: "B70+ Attestation Template.docx", data: attestation },
    { filename: "Ongoing Monitoring Plan.docx", data: monitoring },
    ...supportingEmbeddings,
  ];
  const primary = await makeDocx("GenAI Model Risk Tiering Framework", primaryBody(safe), primaryEmbeddings, FOOTNOTES);
  outer.file("MRMG First Line Submission.docx", primary);
  outer.file("Prompt Submission Template.docx", prompts);
  outer.file("Ongoing Monitoring Plan.docx", monitoring);
  outer.file("B70+ Attestation Template.docx", attestation);
  outer.file("B70+ Attestation Email.eml", makeB70Email(safe, [
    { filename: "MRMG First Line Submission.docx", data: primary, contentType: mimeFor("MRMG First Line Submission.docx") },
    { filename: "Outcome Analysis.xlsx", data: workbook, contentType: mimeFor("Outcome Analysis.xlsx") },
    { filename: "Ongoing Monitoring Plan.docx", data: monitoring, contentType: mimeFor("Ongoing Monitoring Plan.docx") },
  ]));
  outer.file("Outcome Analysis.xlsx", workbook);
  outer.file("submission.json", JSON.stringify(safe, null, 2));
  for (const item of supportingEmbeddings) outer.file(`Supporting Documents/${item.filename}`, item.data);
  const blob = await outer.generateAsync({ type: "blob", compression: "DEFLATE" });
  return { blob, filename: `${slug(data.useCaseName)}-mrmg-submission.zip`, summary: `Package created successfully with 4 Word documents, 1 Excel workbook, 1 B70+ draft email, submission JSON${supportingFiles.length ? `, and ${supportingFiles.length} supporting file${supportingFiles.length === 1 ? "" : "s"}` : ""}.` };
}
