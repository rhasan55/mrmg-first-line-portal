import assert from "node:assert/strict";
import { route, score, tierForMic } from "../static/scoring.js";

const earlyExits = [
  { solutionType: "general" },
  { solutionType: "custom", regulatory: "no", purpose: "customerExperience" },
  { solutionType: "custom", regulatory: "no", purpose: "efficiency" },
];
for (const data of earlyExits) {
  assert.equal(route(data).needsAssessment, false);
  assert.equal(score(data).tier, "Low");
  assert.equal(score(data).score, null);
  assert.equal(score(data).earlyExit, true);
}

const exactProfiles = [
  [{ solutionType: "custom", regulatory: "no", purpose: "core", impactThreshold: "small", reliance: "multiple", explainable: "yes", fineTuned: "no", multiCall: "no", downstream: "none" }, 0.9, "Low"],
  [{ solutionType: "custom", regulatory: "no", purpose: "core", impactThreshold: "small", reliance: "human", explainable: "no", fineTuned: "yes", multiCall: "no", downstream: "none" }, 1.5, "Medium"],
  [{ solutionType: "custom", regulatory: "no", purpose: "core", impactThreshold: "medium", reliance: "direct", explainable: "yes", fineTuned: "no", multiCall: "no", downstream: "none" }, 2.1, "High"],
  [{ solutionType: "custom", regulatory: "yes", purpose: "core", impactThreshold: "large", reliance: "direct", explainable: "no", fineTuned: "yes", multiCall: "yes", downstream: "many" }, 3, "Critical"],
];
for (const [data, mic, tier] of exactProfiles) {
  assert.equal(score(data).score, mic);
  assert.equal(score(data).tier, tier);
}

const assessedRoutes = [
  { regulatory: "no", purpose: "core" },
  { regulatory: "no", purpose: "peopleCompliance" },
  { regulatory: "yes", purpose: "core" },
  { regulatory: "yes", purpose: "peopleCompliance" },
  { regulatory: "yes", purpose: "customerExperience" },
  { regulatory: "yes", purpose: "efficiency" },
];
const impactThresholds = ["small", "medium", "large"];
const reliances = ["multiple", "human", "direct"];
const explainable = ["yes", "no"];
const fineTuned = ["no", "yes"];
const multiCall = ["no", "yes"];
const downstream = ["none", "some", "many"];
const observedTiers = new Set();
let minimum = Infinity;
let maximum = -Infinity;
let pathways = 0;

for (const routed of assessedRoutes) {
  for (const impactThreshold of impactThresholds) {
    for (const reliance of reliances) {
      for (const explainability of explainable) {
        for (const tuned of fineTuned) {
          for (const calls of multiCall) {
            for (const dependency of downstream) {
              const data = { solutionType: "custom", ...routed, impactThreshold, reliance, explainable: explainability, fineTuned: tuned, multiCall: calls, downstream: dependency };
              assert.equal(route(data).needsAssessment, true);
              const result = score(data);
              assert.equal(result.complete, true);
              assert.equal(result.tier, tierForMic(result.score));
              if (data.regulatory === "yes") assert.equal(result.components.qn, 3);
              observedTiers.add(result.tier);
              minimum = Math.min(minimum, result.score);
              maximum = Math.max(maximum, result.score);
              pathways += 1;
            }
          }
        }
      }
    }
  }
}

assert.deepEqual([...observedTiers].sort(), ["Critical", "High", "Low", "Medium"]);
assert.equal(minimum, 0.9);
assert.equal(maximum, 3);
assert.equal(pathways, 1296);
assert.deepEqual([1.19, 1.2, 1.79, 1.8, 2.19, 2.2].map(tierForMic), ["Low", "Medium", "Medium", "High", "High", "Critical"]);
console.log(`Scoring engine verified across ${pathways} assessed combinations and 3 early-exit pathways.`);
