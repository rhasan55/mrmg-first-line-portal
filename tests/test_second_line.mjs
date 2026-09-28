import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import { extractFieldsFromText, mergeExtractedFields } from "../static/second-line-fields.js";
import { generateValidationReport, validationReportFilename } from "../static/second-line-generator.js";

const complete = {
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

const sourceText = `
OMNI ID: OMNI-48217
Model Name: Knowledge Assist
Model Version: 2.1
Impact Tier: Medium
Business VP+: Jordan Lee, EVP
Model Owner: Taylor Morgan, Director
Market: US / EU
Validation Status: Approved with Findings
Business Unit: Enterprise Services
Model Inputs: colleague questions and approved policy documents
Generated Outputs: grounded draft responses with citations
Implementation Date: 10/15/2026
Final Score: 1.50
The modeling team tested the use case on a sample of 450 test cases. Accuracy 91%. Hallucination rate 2.1%.
Monitoring Frequency: Quarterly
Green Threshold: Accuracy >= 88%
Warning Threshold: Accuracy between 80% and 88%
Fail Threshold: Accuracy < 80%
`;
const extracted = extractFieldsFromText(sourceText);
assert.equal(extracted.omniId, "OMNI-48217");
assert.equal(extracted.modelName, "Knowledge Assist");
assert.equal(extracted.modelVersion, "2.1");
assert.equal(extracted.impactTier, "Medium");
assert.equal(extracted.impactSubtype, "Medium Impact");
assert.equal(extracted.finalScore, "1.50");
assert.equal(extracted.validationSampleSize, "450");
assert.match(extracted.validationMetrics, /accuracy 91%/i);
assert.equal(extracted.monitoringFrequency, "Quarterly");
assert.equal(mergeExtractedFields({ modelName: "Reviewed Name" }, extracted).modelName, "Reviewed Name");

const workbookExtracted = extractFieldsFromText(`
Use Case: Knowledge Assist
Sample Size: 450
Performance Metric 1 (required): Accuracy
Performance Metric 1 Value: 91%
Rationale for Metric 1: Accuracy directly measures whether the answer is correct.
Performance Metric 1 Green Threshold: >= 88%
Performance Metric 1 Amber Threshold: 80% to 87.9%
Performance Metric 1 Red Threshold: < 80%
Performance Metric 2 (optional): Hallucination rate
Performance Metric 2 Value: 2.1%
`);
assert.equal(workbookExtracted.modelName, "Knowledge Assist");
assert.equal(workbookExtracted.validationSampleSize, "450");
assert.match(workbookExtracted.validationMetrics, /Accuracy 91%/);
assert.match(workbookExtracted.validationMetrics, /Hallucination rate 2.1%/);
assert.equal(workbookExtracted.monitoringMetric, "Accuracy");
assert.equal(workbookExtracted.monitoringRationale, "Accuracy directly measures whether the answer is correct.");
assert.equal(workbookExtracted.greenThreshold, ">= 88%");
assert.equal(workbookExtracted.amberThreshold, "80% to 87.9%");
assert.equal(workbookExtracted.failThreshold, "< 80%");

async function inspectCase(name, data, expectations) {
  const bytes = await generateValidationReport(data);
  const zip = await JSZip.loadAsync(bytes);
  const xml = await zip.file("word/document.xml").async("text");
  assert.equal((xml.match(/w:type="page"/g) || []).length, 4, `${name} should contain four explicit page breaks`);
  assert.match(xml, /Model Overview/);
  assert.match(xml, /Validation Assessment/);
  assert.match(xml, /Finding Details/);
  assert.match(xml, /Validation Conclusion/);
  assert.match(xml, /Table 1: Model Impact Categorization Matrix/);
  assert.doesNotMatch(xml, />undefined</);
  for (const value of expectations.green) {
    const encoded = value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    assert.match(xml, new RegExp(`<w:color w:val="548235"\/>[\\s\\S]{0,180}<w:t xml:space="preserve">${encoded.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`), `${name}: ${value} should be green`);
  }
  for (const absent of expectations.absent || []) assert.doesNotMatch(xml, new RegExp(absent));
  if (process.env.SECOND_LINE_QA_DIR) {
    await fs.mkdir(process.env.SECOND_LINE_QA_DIR, { recursive: true });
    await fs.writeFile(path.join(process.env.SECOND_LINE_QA_DIR, `${name}.docx`), bytes);
  }
  return xml;
}

await inspectCase("complete-medium", complete, { green: ["OMNI-48217", "Knowledge Assist", "1.50", "Accuracy ≥ 88%", "Expand edge-case testing"] });

await inspectCase("partial-low", {
  omniId: "OMNI-10001", modelName: "Colleague Draft", modelVersion: "1.0", impactTier: "Low", impactSubtype: "Productivity Tool",
  businessUnit: "Operations", modelInputs: "user-authored prompts", modelOutputs: "draft summaries", regulatoryReporting: "not", llmNames: "Enterprise LLM",
  implementationDate: "2026-12-01", validationSampleSize: "75", validationMetrics: "acceptance rate of 86%", testingMethodology: "adequate", sampleAssessment: "representative", metricsAssessment: "meets",
  monitoringMetric: "Acceptance rate", monitoringSampleSize: "50", monitoringFrequency: "Annually", overallStatus: "Approved",
}, { green: ["OMNI-10001", "Colleague Draft", "Acceptance rate"], absent: ["Expand edge-case testing"] });

const sparseXml = await inspectCase("sparse", { modelName: "Sparse Evidence Model" }, { green: ["Sparse Evidence Model"], absent: ["OMNI-48217", "Jordan Lee"] });
assert.match(sparseXml, /No findings were identified as a part of this validation/);
assert.equal(validationReportFilename({ omniId: "OMNI 7", modelName: "My Model" }), "OMNI-7-My-Model-Validation-Report.docx");
console.log("Second Line extraction and three validation-report cases verified.");
