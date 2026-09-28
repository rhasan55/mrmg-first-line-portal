import assert from "node:assert/strict";
import fs from "node:fs/promises";
import JSZip from "jszip";
import { generateBrowserPackage } from "../static/browser-generator.js";

const data = {
  useCaseName: "Browser Package QA", modelOwner: "Model Team", businessUnit: "Enterprise Services",
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

const result = await generateBrowserPackage(data, []);
if (process.env.BROWSER_QA_OUTPUT) await fs.writeFile(process.env.BROWSER_QA_OUTPUT, new Uint8Array(await result.blob.arrayBuffer()));
assert.equal(result.filename, "browser-package-qa-mrmg-submission.zip");
const outer = await JSZip.loadAsync(await result.blob.arrayBuffer());
const expected = ["MRMG First Line Submission.docx", "Prompt Submission Template.docx", "Ongoing Monitoring Plan.docx", "B70+ Attestation Template.docx", "B70+ Attestation Email.eml", "Outcome Analysis.xlsx", "submission.json"];
assert.deepEqual(Object.keys(outer.files).sort(), expected.sort());
const primary = await JSZip.loadAsync(await outer.file("MRMG First Line Submission.docx").async("uint8array"));
const primaryXml = await primary.file("word/document.xml").async("text");
assert.match(primaryXml, /Section 2: Model Impact Category Assessment/);
assert.match(primaryXml, /Browser Package QA/);
assert.match(primaryXml, /B70\+ Attestation Email\.eml/);
const monitoring = await JSZip.loadAsync(await outer.file("Ongoing Monitoring Plan.docx").async("uint8array"));
const monitoringXml = await monitoring.file("word/document.xml").async("text");
assert.match(monitoringXml, /User satisfaction/);
const workbook = await JSZip.loadAsync(await outer.file("Outcome Analysis.xlsx").async("uint8array"));
const sheetXml = await workbook.file("xl/worksheets/sheet1.xml").async("text");
assert.match(sheetXml, /Performance Metric 3/);
assert.match(sheetXml, /User satisfaction/);
assert.match(sheetXml, /Green Threshold/);
const email = await outer.file("B70+ Attestation Email.eml").async("text");
assert.match(email, /From: Avery Morgan <avery\.morgan@example\.com>/);
assert.match(email, /X-Unsent: 1/);
assert.match(email, /Residual risk is understood/);
const submission = JSON.parse(await outer.file("submission.json").async("text"));
assert.equal(submission.metrics.length, 3);

const lowRouteData = {
  ...data,
  useCaseName: "Low Route QA",
  solutionType: "general",
  regulatory: "no",
  purpose: "productivity",
  impactTier: "Low",
  assessmentScore: null,
  assessmentComponents: null,
  section2Included: false,
};
const lowRouteResult = await generateBrowserPackage(lowRouteData, []);
const lowOuter = await JSZip.loadAsync(await lowRouteResult.blob.arrayBuffer());
const lowPrimary = await JSZip.loadAsync(await lowOuter.file("MRMG First Line Submission.docx").async("uint8array"));
const lowPrimaryXml = await lowPrimary.file("word/document.xml").async("text");
assert.doesNotMatch(lowPrimaryXml, /Section 2: Model Impact Category Assessment/);
assert.match(lowPrimaryXml, /It is a Low Impact model\. Proceed to fill in Section 1\./);
console.log("Browser generator package verified:", expected.join(", "));
