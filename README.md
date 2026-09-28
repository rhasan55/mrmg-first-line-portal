# MRMG First Line Intake

A step-by-step GenAI model-risk intake that implements the approved questionnaire routing and scoring rules.

## What the portal implements

- Q1 general-purpose solutions route directly to Low Impact and omit Section 2.
- Customized solutions with no regulatory-reporting use and a customer-experience or efficiency purpose also route directly to Low Impact.
- All other cases use `MIC = 0.4 × qn + 0.4 × ql + 0.1 × cx + 0.1 × dd`.
- Bands are Low `< 1.2`, Medium `1.2–<1.8`, High `1.8–<2.2`, and Critical `≥ 2.2`.
- Regulatory-reporting use forces the quantitative component to 3.
- Business-process choices constrain the available quantitative drivers and display the matching annual Small, Medium, and Large thresholds.
- “More than 2 sequential LLM calls” requires at least three fully documented prompt-call records.
- The first outcome-analysis metric is required; users can add any number of additional metrics. Every added metric requires a value, rationale, and Green/Amber/Red thresholds.

## Local package generation

Run:

```bash
python3 server.py
```

Then open <http://127.0.0.1:8765>.

Local mode creates a ZIP containing:

- the completed questionnaire (`.docx`, or `.docm` when an original DOCM template is supplied);
- `Outcome Analysis.xlsx`;
- `Prompt Submission Template.docx`;
- `Ongoing Monitoring Plan.docx`;
- `B70+ Attestation Template.docx`;
- `submission.json`; and
- optional supporting files in `Supporting Documents/`.

## GitHub Pages

The public Pages portal supports the complete intake, routing, scoring, validation, local draft storage, and full submission-package generation. Because GitHub Pages cannot execute the Python service, a browser-side generator creates four Word documents, the Outcome Analysis Excel workbook, submission JSON, optional supporting documents, and the final ZIP entirely on the user's device. Answers and attachments are not transmitted to GitHub or another server.

The workflow in `.github/workflows/pages.yml` installs the browser dependencies, builds the static application with Vite, and publishes only `dist/`. It does not commit or deploy source scans, documents, spreadsheets, PDFs, images, user submissions, or generated packages.

Build locally with:

```bash
pnpm install
pnpm build
```

## Optional DOCM source template

To retain an original DOCM package locally, place the source file at `templates/source.docm`. That file is ignored by Git and will never be pushed. The local generator preserves its package parts, appends the completed response, and emits a `.docm`. Without it, the generator emits a standards-compliant `.docx`.

The generated supporting files are separate usable files in the ZIP. True clickable OLE embedding requires the original Word template and a Word-compatible authoring environment; the portal does not make a false embedding claim.

## Tests

```bash
python3 -m unittest discover -s tests -v
```

The suite covers routing, MIC bands and exact boundaries, process/driver validation, repeatable metrics, prompt-call count rules, Section 2 inclusion/omission, Word and Excel generation, B70+ Word output, ZIP integrity, optional DOCM package preservation, and HTTP generation/download. The browser package builder has a separate Node test:

```bash
pnpm test:browser-generator
```
