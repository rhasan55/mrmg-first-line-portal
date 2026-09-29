import assert from "node:assert/strict";
import fs from "node:fs/promises";
import JSZip from "jszip";
import { generateBrowserPackage } from "../static/browser-generator.js";

const data = {
  useCaseName: "Browser Package QA", modelOwner: "Model Team", modelOwnerEmail: "model.team@example.com", businessUnit: "Enterprise Services",
  implementationDate: "2026-09-30", markets: ["US"], modelName: "OpenAI GPT", modelVersion: "5.1",
  hosting: "axp", agentic: "no", overview: "Answers approved knowledge questions.",
  modelInputs: "User query and approved documents", generatedOutputs: "Grounded response",
  solutionType: "custom", regulatory: "no", purpose: "core", impactTier: "High", assessmentScore: 2.1,
  assessmentComponents: { qn: 2, ql: 3, cx: 0, dd: 1 }, section2Included: true,
  endUsers: "customer", businessProcess: "Credit and Fraud Risk", quantDriver: "Adverse Action Volume",
  impactThreshold: "medium", reliance: "direct", explainable: "yes", fineTuned: "no", multiCall: "no", downstream: "none",
  sampleSize: "1447", monitoringFrequency: "Quarterly",
  metricName: ["Accuracy", "Hallucination rate", "User satisfaction"],
  metricValue: ["82%", "3%", "4.5/5"], metricRationale: ["Correctness", "Unsupported claims", "Utility"],
  metricGreen: [">=80%", "<=3%", ">=4/5"], metricAmber: ["65-79%", "3-5%", "3-3.9/5"], metricRed: ["<65%", ">5%", "<3/5"],
  promptCallName: "Retrieval answer", promptCallPurpose: "Answer from approved context", promptCallText: "Use only context.",
  promptCallConstraints: "No outside knowledge.", promptCallOutputFormat: "Grounded prose", promptCallExampleInput: "What is policy?",
  promptCallExampleOutput: "Policy says…", promptCallVersion: "1.0", businessOwnerName: "Avery Morgan", businessOwnerTitle: "SVP", businessOwnerEmail: "avery.morgan@example.com",
};

const support = { name: "supporting-evidence.txt", type: "text/plain", async arrayBuffer() { return new TextEncoder().encode("evidence").buffer; } };
const result = await generateBrowserPackage(data, [support]);
if (process.env.BROWSER_QA_OUTPUT) await fs.writeFile(process.env.BROWSER_QA_OUTPUT, new Uint8Array(await result.blob.arrayBuffer()));
assert.equal(result.filename, "browser-package-qa-mrmg-submission.zip");
const outer = await JSZip.loadAsync(await result.blob.arrayBuffer());
const expected = ["MRMG First Line Submission.docx", "Prompt Submission Template.docx", "Ongoing Monitoring Plan.docx", "B70+ Attestation Template.docx", "B70+ Attestation Email.eml", "Outcome Analysis.xlsx", "submission.json", "Supporting Documents/supporting-evidence.txt"];
assert.deepEqual(Object.values(outer.files).filter(item => !item.dir).map(item => item.name).sort(), expected.sort());
const primary = await JSZip.loadAsync(await outer.file("MRMG First Line Submission.docx").async("uint8array"));
const primaryXml = await primary.file("word/document.xml").async("text");
assert.match(primaryXml, /Section 2: Model Risk Tier Assessment/);
assert.match(primaryXml, /A\. Business Impact \(Quantitative\)/);
assert.match(primaryXml, /B\. Business Importance \(Qualitative\)/);
assert.match(primaryXml, /C\. Model Complexity/);
assert.match(primaryXml, /D\. Interdependency/);
assert.match(primaryXml, /Browser Package QA/);
assert.match(primaryXml, /Which of the following types of GenAI solution fits this use-case best\?/);
assert.match(primaryXml, /deck generation, control recommender, tech care support/);
assert.match(primaryXml, /Models used for enhancing customer experience with no direct impact on AXP's core business/);
assert.match(primaryXml, /Models used to create process efficiencies for colleagues with no direct impact on AXP's core business/);
assert.match(primaryXml, /o:OLEObject/);
assert.ok(primary.file("word/footnotes.xml"));
assert.equal(Object.keys(primary.files).filter(name => name.startsWith("word/embeddings/") && !name.endsWith("/")).length, 5);
assert.ok(primary.file("word/embeddings/embedded1.xlsx"));
assert.ok(primary.file("word/embeddings/embedded5.txt"));
const monitoring = await JSZip.loadAsync(await outer.file("Ongoing Monitoring Plan.docx").async("uint8array"));
const monitoringXml = await monitoring.file("word/document.xml").async("text");
assert.match(monitoringXml, /User satisfaction/);
const attestation = await JSZip.loadAsync(await outer.file("B70+ Attestation Template.docx").async("uint8array"));
const attestationXml = await attestation.file("word/document.xml").async("text");
assert.match(attestationXml, /Reference Template for B70\+ Attestation/);
assert.match(attestationXml, /If the use case is used in the EU market/);
assert.match(attestationXml, /Ongoing Monitoring\*/);
assert.match(attestationXml, /Not applicable for Medium impact Customer Facing Pilot use cases/);
assert.match(attestationXml, /Incident reporting OR backup options/);
assert.match(attestationXml, /Thanks,/);
assert.doesNotMatch(attestationXml, /Approval/);
const workbook = await JSZip.loadAsync(await outer.file("Outcome Analysis.xlsx").async("uint8array"));
const sheetXml = await workbook.file("xl/worksheets/sheet1.xml").async("text");
assert.match(sheetXml, /Performance Metric 3/);
assert.match(sheetXml, /User satisfaction/);
assert.match(sheetXml, /Green Threshold/);
const email = await outer.file("B70+ Attestation Email.eml").async("text");
assert.match(email, /From: Model Team <model\.team@example\.com>/);
assert.match(email, /To: Avery Morgan <avery\.morgan@example\.com>/);
assert.match(email, /X-Unsent: 1/);
assert.match(email, /multipart\/alternative/);
assert.match(email, /To proceed with model risk certification for the GenAI use case Browser Package QA/);
assert.match(email, /If the use case is used in the EU market/);
assert.match(email, /As the designated business owner \(B70\+\), I confirm the following/);
assert.match(email, /Ongoing Monitoring\*/);
assert.match(email, /Not applicable for Medium impact Customer Facing Pilot use cases/);
assert.match(email, /Incident reporting OR backup options/);
assert.match(email, /Robust implementation and change management control/);
assert.match(email, /Thanks,/);
assert.doesNotMatch(email, /Please reply confirming your approval/);
assert.doesNotMatch(email, /Regards,/);
assert.match(email, /Content-Disposition: attachment; filename="MRMG First Line Submission\.docx"/);
const submission = JSON.parse(await outer.file("submission.json").async("text"));
assert.equal(submission.metrics.length, 3);

for (const [name, routeData] of Object.entries({
  general: { solutionType: "general", regulatory: "no", purpose: "efficiency" },
  customizedCustomerExperience: { solutionType: "custom", regulatory: "no", purpose: "customerExperience" },
  customizedEfficiency: { solutionType: "custom", regulatory: "no", purpose: "efficiency" },
})) {
  const lowRouteData = { ...data, ...routeData, useCaseName: `Low Route QA ${name}`, impactTier: "Low", assessmentScore: null, assessmentComponents: null, section2Included: false };
  const lowRouteResult = await generateBrowserPackage(lowRouteData, []);
  const lowOuter = await JSZip.loadAsync(await lowRouteResult.blob.arrayBuffer());
  const lowPrimaryBytes = await lowOuter.file("MRMG First Line Submission.docx").async("uint8array");
  if (name === "customizedCustomerExperience" && process.env.LOW_BROWSER_QA_OUTPUT) await fs.writeFile(process.env.LOW_BROWSER_QA_OUTPUT, lowPrimaryBytes);
  const lowPrimary = await JSZip.loadAsync(lowPrimaryBytes);
  const lowPrimaryXml = await lowPrimary.file("word/document.xml").async("text");
  assert.doesNotMatch(lowPrimaryXml, /Section 2: Model Risk Tier Assessment/, `${name} must omit Section 2`);
  assert.match(lowPrimaryXml, /It is a Low Impact model\. Proceed to fill in Section 1\./);
}
console.log("Browser generator package verified:", expected.join(", "));
