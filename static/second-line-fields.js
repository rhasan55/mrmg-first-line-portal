export const SECOND_LINE_GROUPS = [
  {
    id: "identity",
    title: "Report identity",
    description: "Header, ownership, market, and disposition fields.",
    fields: [
      ["omniId", "OMNI ID"], ["reportDate", "Date", "date"], ["modelName", "Model name"], ["modelVersion", "Model version"],
      ["impactTier", "Impact tier", "select", ["", "Low", "Medium"]],
      ["impactSubtype", "Impact route", "select", ["", "Productivity Tool", "Non-core AXP Business Tool", "Other Low Impact", "Medium Impact", "Medium Impact Customer-facing Pilot"]],
      ["businessVp", "Business VP+"], ["modelOwner", "Model Owner (B40+)"], ["mrmgVp", "MRMG VP+"],
      ["validators", "Lead Validator / Validators"], ["market", "Market (US/EU/Other)"],
      ["validationStatus", "Validation status", "select", ["", "Approved", "Approved with Findings", "Approved for Limited Use", "Rejected"]],
    ],
  },
  {
    id: "overview",
    title: "Model overview",
    description: "Purpose, workflow, users, model technology, and scope assessment.",
    fields: [
      ["businessUnit", "Business unit / team"], ["businessProblem", "Business problem being addressed", "textarea"],
      ["specificSolution", "Specific solution", "textarea"], ["modelInputs", "Model inputs", "textarea"],
      ["modelOutputs", "Generated outputs", "textarea"], ["regulatoryReporting", "Regulatory reporting use", "select", ["", "not", "is"]],
      ["llmNames", "Large language model(s)"], ["outputTypes", "Output type(s)", "textarea"],
      ["scopeAssessment", "Scope assessment", "select", ["", "clearly defined", "requiring clarification"]],
      ["scopeClarification", "Scope clarification", "textarea"], ["documentConsistency", "Overview / process-flow consistency", "select", ["", "consistent", "inconsistent"]],
      ["deploymentScope", "Deployment scope"], ["enhancementTarget", "Productivity / experience enhanced"],
      ["upstreamUse", "Uses upstream-model output", "select", ["", "does", "does not"]], ["upstreamModel", "Upstream model and Model Store ID"],
      ["intendedUsers", "Intended users"], ["userBase", "Estimated user base"], ["outputConsumption", "How output is consumed", "textarea"],
      ["businessValue", "Expected business value / outcome", "textarea"],
    ],
  },
  {
    id: "impact",
    title: "Impact categorization",
    description: "The four-pillar matrix and computed outcome.",
    fields: [
      ["quantitativeDetails", "Quantitative impact details", "textarea"], ["quantitativeScore", "Quantitative score"],
      ["qualitativeDetails", "Qualitative impact details", "textarea"], ["qualitativeScore", "Qualitative score"],
      ["complexityDetails", "Complexity details", "textarea"], ["complexityScore", "Complexity score"],
      ["interdependenceDetails", "Interdependence details", "textarea"], ["interdependenceScore", "Interdependence score"],
      ["finalScore", "Final impact score"], ["impactThreshold", "Tier threshold"],
    ],
  },
  {
    id: "assessment",
    title: "Validation assessment",
    description: "Model details, prompts, readiness, testing, and data controls.",
    fields: [
      ["hosting", "Hosting arrangement"], ["modelDetailsAssessment", "Model details assessment", "select", ["", "accurately stated", "require correction"]],
      ["modelCorrection", "Model detail correction", "textarea"], ["hostingAssessment", "Hosting assessment", "select", ["", "appropriate", "raises concerns"]],
      ["hostingConcern", "Hosting concern", "textarea"], ["promptProvided", "Prompt files", "select", ["", "provided", "not provided"]],
      ["promptApproach", "Prompt design assessment", "select", ["", "appropriate", "not suitable"]], ["supportSufficiency", "Supporting documentation", "select", ["", "sufficient", "insufficient"]],
      ["implementationDate", "Implementation date", "date"], ["rolloutStrategy", "Roll-out strategy", "select", ["", "pilot", "phased", "full roll-out"]],
      ["validationSampleSize", "Validation sample size"], ["validationMetrics", "Reported validation metrics", "textarea"],
      ["testingMethodology", "Testing methodology", "select", ["", "adequate", "inadequate"]], ["testingIssue", "Testing issue", "textarea"],
      ["sampleAssessment", "Sample-size assessment", "select", ["", "representative", "insufficient"]], ["metricsAssessment", "Metric threshold assessment", "select", ["", "meets", "does not meet"]],
      ["dataFlows", "Data flows systematically", "select", ["", "does", "does not"]], ["controlsRequired", "Data quality controls", "select", ["", "were", "were not"]],
      ["controlStatement", "Data quality control statement", "textarea"], ["controlLimitation", "Data quality limitation", "textarea"],
      ["controlType", "Control type", "select", ["", "control", "interim control"]], ["controlAdequacy", "Control adequacy", "select", ["", "adequate", "inadequate"]],
    ],
  },
  {
    id: "monitoring",
    title: "Ongoing monitoring plan",
    description: "Metric, cadence, thresholds, escalation actions, and MRMG assessment.",
    fields: [
      ["monitoringMetric", "Performance metric"], ["monitoringDefinition", "Definition / formula", "textarea"], ["monitoringRationale", "Rationale", "textarea"],
      ["monitoringSampleSize", "Observations per cycle"], ["monitoringFrequency", "Monitoring frequency"],
      ["greenThreshold", "Satisfactory threshold"], ["amberThreshold", "Warning threshold"], ["amberAction", "Warning action / governance step", "textarea"],
      ["failThreshold", "Fail threshold"], ["redAction", "Fail action / governance step", "textarea"],
      ["metricAppropriateness", "Selected metric(s)", "select", ["", "appropriate", "not comprehensive enough"]], ["monitoringCoverageGap", "Coverage gap", "textarea"],
      ["monitoringSampleAssessment", "Monitoring sample size", "select", ["", "sufficient", "insufficient"]],
      ["thresholdAssessment", "Threshold framework", "select", ["", "well-structured", "requires refinement"]], ["thresholdRefinement", "Threshold refinement", "textarea"],
      ["planAdequacy", "Monitoring plan conclusion", "select", ["", "adequate", "adequate with observations", "inadequate"]],
    ],
  },
  {
    id: "findings",
    title: "Findings and conclusion",
    description: "Leave finding fields blank when no finding was identified.",
    fields: [
      ["findingSeverity", "Finding severity", "select", ["", "H", "M", "L"]], ["findingNumber", "Finding number"], ["findingTitle", "Finding title"],
      ["findingDescription", "Finding description", "textarea"], ["mrmgChallenge", "MRMG challenge", "textarea"], ["mtResponse", "Modeling team response", "textarea"],
      ["mrmgAssessment", "MRMG assessment", "textarea"], ["businessAttester", "Business B70+ name / title"],
      ["pilotMonths", "Approved pilot duration (months)"], ["documentationAssessment", "Documentation and controls assessment", "select", ["", "appropriately", "not appropriately"]],
      ["validationSatisfaction", "Validation assessment", "select", ["", "satisfactory", "not satisfactory"]],
      ["findingClosure", "Finding outcome", "select", ["", "the closure of identified findings", "the absence of material findings"]],
      ["overallStatus", "Overall validation status", "select", ["", "Approved", "Approved with Findings", "Approved for Limited Use", "Rejected"]],
      ["conclusionFindings", "Findings summary", "textarea"],
    ],
  },
];

export const SECOND_LINE_FIELDS = SECOND_LINE_GROUPS.flatMap(group => group.fields.map(([name, label, type = "text", options = []]) => ({ name, label, type, options, group: group.id })));

const aliases = {
  omniId: ["omni id", "model store id", "omni"], reportDate: ["report date", "validation date", "date"], modelName: ["model name", "use case name", "use case"], modelVersion: ["model version", "version"],
  impactTier: ["impact tier", "impact classification", "impact categorization"], businessVp: ["business vp", "business vp+"], modelOwner: ["model owner", "model owner (b40+)"],
  mrmgVp: ["mrmg vp", "mrmg vp+"], validators: ["lead validator", "validators"], market: ["market", "markets"], validationStatus: ["validation status", "status"],
  businessUnit: ["business unit", "business team", "team"], businessProblem: ["business problem", "problem being addressed"], specificSolution: ["specific solution", "solution"],
  modelInputs: ["model inputs", "inputs"], modelOutputs: ["generated outputs", "model outputs", "outputs"], llmNames: ["llm", "large language model", "foundation model"],
  intendedUsers: ["intended users", "user group"], userBase: ["estimated user base", "number of users", "user base"], outputConsumption: ["output consumption", "output is consumed", "consumed as"],
  businessValue: ["business value", "expected outcome"], quantitativeDetails: ["quantitative impact", "financial & regulatory", "financial and regulatory"], qualitativeDetails: ["qualitative impact", "business criticality"],
  complexityDetails: ["complexity", "explainability"], interdependenceDetails: ["interdependence", "downstream dependence"], finalScore: ["final score", "mic score", "impact score"],
  hosting: ["hosting arrangement", "hosting location", "hosted"], implementationDate: ["implementation date", "deployment date", "go-live date", "go live date"],
  validationSampleSize: ["validation sample size", "test sample size", "sample size"], validationMetrics: ["reported metrics", "validation metrics", "performance metrics"],
  monitoringMetric: ["monitoring metric", "performance metric tracking", "performance metric"], monitoringDefinition: ["metric definition", "definition/formula", "definition"],
  monitoringRationale: ["metric rationale", "rationale"], monitoringSampleSize: ["monitoring sample size", "observations per monitoring cycle"], monitoringFrequency: ["monitoring frequency", "frequency"],
  greenThreshold: ["green threshold", "satisfactory threshold"], amberThreshold: ["amber threshold", "warning threshold"], failThreshold: ["red threshold", "fail threshold"],
  findingTitle: ["finding title"], findingDescription: ["finding description"], mrmgChallenge: ["mrmg challenge"], mtResponse: ["mt response", "modeling team response"], mrmgAssessment: ["mrmg assessment"],
  businessAttester: ["b70+", "business attester", "business owner"], pilotMonths: ["pilot duration", "approved months"], overallStatus: ["overall validation status", "overall status"],
};

function clean(value) {
  return String(value || "").replace(/^[-–—:\s]+|[\s,;]+$/g, "").replace(/\s+/g, " ").trim();
}

function escaped(pattern) {
  return pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function labeledValue(text, labels) {
  for (const label of labels) {
    const expression = new RegExp(`(?:^|\\n)\\s*${escaped(label)}\\s*(?:[:=]|-\\s+)\\s*([^\\n]{1,500})`, "i");
    const match = text.match(expression);
    if (match) return clean(match[1]);
  }
  return "";
}

function firstMatch(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return clean(match[1]);
  }
  return "";
}

export function extractFieldsFromText(rawText) {
  const text = String(rawText || "").replace(/\r/g, "\n").replace(/\u00a0/g, " ");
  const fields = {};
  for (const [name, labels] of Object.entries(aliases)) {
    const value = labeledValue(text, labels);
    if (value) fields[name] = value;
  }

  const tier = firstMatch(text, [/(?:impact tier|impact categorization|impact classification)\s*(?:[:=-]|is)?\s*(low|medium)\b/i, /\b(low|medium)\s+impact\b/i]);
  if (tier) fields.impactTier = tier[0].toUpperCase() + tier.slice(1).toLowerCase();
  if (/customer[-\s]facing\s+pilot/i.test(text)) fields.impactSubtype = "Medium Impact Customer-facing Pilot";
  else if (/productivity tool/i.test(text)) fields.impactSubtype = "Productivity Tool";
  else if (/non[-\s]core\s+axp\s+business\s+tool/i.test(text)) fields.impactSubtype = "Non-core AXP Business Tool";
  else if (fields.impactTier === "Medium") fields.impactSubtype = "Medium Impact";
  else if (fields.impactTier === "Low") fields.impactSubtype = "Other Low Impact";

  const status = firstMatch(text, [/(approved with findings|approved for limited use|approved|rejected)/i]);
  if (status) fields.validationStatus = status.replace(/\b\w/g, letter => letter.toUpperCase());
  const market = firstMatch(text, [/(?:market|markets)\s*(?:[:=-]|is)?\s*((?:US|EU|Other)(?:\s*[,/&]\s*(?:US|EU|Other))*)/i]);
  if (market) fields.market = market.toUpperCase();
  const date = firstMatch(text, [/(?:implementation|deployment|go[- ]?live) date\s*(?:[:=-]|is)?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2})/i]);
  if (date) fields.implementationDate = date;
  const reportDate = firstMatch(text, [/(?:report|validation) date\s*(?:[:=-]|is)?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2})/i]);
  if (reportDate) fields.reportDate = reportDate;

  const score = firstMatch(text, [/(?:final|mic|impact) score\s*(?:[:=-]|is)?\s*([0-9]+(?:\.[0-9]+)?)/i]);
  if (score) fields.finalScore = score;
  for (const [name, label] of [["quantitativeScore", "quantitative"], ["qualitativeScore", "qualitative"], ["complexityScore", "complexity"], ["interdependenceScore", "interdependence"]]) {
    const value = firstMatch(text, [new RegExp(`${label}(?: impact)?(?: score)?\\s*(?:[:=-]|is)?\\s*([0-3](?:\\.[0-9]+)?)`, "i")]);
    if (value) fields[name] = value;
  }

  const sample = firstMatch(text, [/(?:tested|evaluated|validated).{0,80}?sample of\s+([0-9,]+)/i, /sample size\s*(?:[:=-]|is)?\s*([0-9,]+)/i]);
  if (sample) fields.validationSampleSize = sample;
  const metrics = [...text.matchAll(/\b(accuracy|hallucination rate|acceptance rate|precision|recall|f1(?: score)?|user satisfaction)\b\s*(?:[:=]|of)?\s*([0-9.]+\s*%?)/gi)]
    .map(match => `${match[1]} ${match[2]}`);
  const workbookMetricNames = [...text.matchAll(/performance metric\s+(\d+)(?:\s*\([^\n]*\))?\s*:\s*([^\n]+)/gi)];
  const workbookMetricValues = new Map([...text.matchAll(/performance metric\s+(\d+)\s+value\s*:\s*([^\n]+)/gi)].map(match => [match[1], clean(match[2])]));
  for (const match of workbookMetricNames) {
    const metric = clean(match[2]); const metricValue = workbookMetricValues.get(match[1]);
    if (metric) metrics.push(metricValue ? `${metric} ${metricValue}` : metric);
  }
  if (metrics.length) fields.validationMetrics = [...new Set(metrics)].join(", ");
  if (!fields.monitoringMetric && metrics[0]) fields.monitoringMetric = metrics[0].replace(/\s+[0-9.]+\s*%?$/, "");
  if (!fields.monitoringRationale) fields.monitoringRationale = firstMatch(text, [/rationale for metric\s+1\s*:\s*([^\n]+)/i]);
  if (!fields.greenThreshold) fields.greenThreshold = firstMatch(text, [/performance metric\s+1\s+green threshold\s*:\s*([^\n]+)/i]);
  if (!fields.amberThreshold) fields.amberThreshold = firstMatch(text, [/performance metric\s+1\s+amber threshold\s*:\s*([^\n]+)/i]);
  if (!fields.failThreshold) fields.failThreshold = firstMatch(text, [/performance metric\s+1\s+red threshold\s*:\s*([^\n]+)/i]);

  const frequency = firstMatch(text, [/(?:monitoring frequency|frequency)\s*(?:[:=-]|is)?\s*(monthly|quarterly|semi[-\s]annual(?:ly)?|annual(?:ly)?)/i]);
  if (frequency) fields.monitoringFrequency = frequency;
  const hosting = firstMatch(text, [/hosted\s+(internally|externally(?:\s+via\s+[^.;\n]+)?)/i]);
  if (hosting) fields.hosting = hosting;
  const upstream = firstMatch(text, [/\b(does not|does)\s+use output from an upstream model/i]);
  if (upstream) fields.upstreamUse = upstream.toLowerCase();

  return fields;
}

export function mergeExtractedFields(current, extracted) {
  const merged = { ...current };
  for (const [key, value] of Object.entries(extracted || {})) if (!String(merged[key] || "").trim() && String(value || "").trim()) merged[key] = value;
  return merged;
}
