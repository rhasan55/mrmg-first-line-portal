export const businessRules = {
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

export function route(data = {}) {
  if (!data.solutionType) return { complete: false, needsAssessment: false, tier: "Pending", reason: "Select a solution type." };
  if (data.solutionType === "general") return { complete: true, needsAssessment: false, tier: "Low", reason: "General-purpose solutions route directly to Low impact and Section 1." };
  if (!data.regulatory || !data.purpose) return { complete: false, needsAssessment: false, tier: "Pending", reason: "Complete Questions 2 and 3." };
  if (data.regulatory === "no" && data.purpose === "customerExperience") return { complete: true, needsAssessment: false, tier: "Low", reason: "A customized solution with no regulatory-reporting use that enhances customer experience without direct impact on AXP's core business routes to Low impact and does not require Section 2." };
  if (data.regulatory === "no" && data.purpose === "efficiency") return { complete: true, needsAssessment: false, tier: "Low", reason: "A customized solution with no regulatory-reporting use that creates colleague process efficiencies without direct impact on AXP's core business routes to Low impact and does not require Section 2." };
  return { complete: true, needsAssessment: true, tier: "Assessment required", reason: "The selected use requires the Section 2 impact assessment." };
}

export function tierForMic(mic) {
  return mic < 1.2 ? "Low" : mic < 1.8 ? "Medium" : mic < 2.2 ? "High" : "Critical";
}

export function score(data = {}) {
  const routed = route(data);
  if (!routed.needsAssessment) return { complete: routed.complete, tier: routed.complete ? "Low" : "Pending", score: null, earlyExit: routed.complete, components: null, reason: routed.reason };
  if (["impactThreshold", "reliance", "explainable", "fineTuned", "multiCall", "downstream"].some(name => !data[name])) return { complete: false, tier: "Pending", score: null, earlyExit: false, components: null, reason: "Complete the scored Section 2 questions." };
  const qn = data.regulatory === "yes" ? 3 : ({ small: 1, medium: 2, large: 3 }[data.impactThreshold] || 0);
  const qualitative = ({ direct: 3, human: 2, multiple: 1 }[data.reliance] || 0) + (["core", "peopleCompliance"].includes(data.purpose) ? 2 : 1);
  const ql = qualitative === 5 ? 3 : qualitative === 4 ? 2 : 1;
  const cx = Number(data.explainable === "no") + Number(data.fineTuned === "yes") + Number(data.multiCall === "yes");
  const dd = ({ none: 1, some: 2, many: 3 }[data.downstream] || 0);
  const mic = Number((0.4 * qn + 0.4 * ql + 0.1 * cx + 0.1 * dd).toFixed(2));
  return { complete: true, tier: tierForMic(mic), score: mic, earlyExit: false, components: { qn, ql, cx, dd }, reason: "MIC calculated with the approved impact formula." };
}
