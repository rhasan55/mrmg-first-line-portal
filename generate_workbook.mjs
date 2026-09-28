import fs from "node:fs/promises";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { SpreadsheetFile, Workbook } = require("@oai/artifact-tool");

const [jsonPath, outputPath] = process.argv.slice(2);
if (!jsonPath || !outputPath) throw new Error("Usage: generate_workbook.mjs data.json output.xlsx");
const input = JSON.parse(await fs.readFile(jsonPath, "utf8"));

const wb = Workbook.create();
const sheet = wb.worksheets.add("Outcome Analysis");
sheet.showGridLines = false;

sheet.getRange("A1:B8").values = [
  ["Field", "Description"],
  ["Sample Size", input.sampleSize || ""],
  ["Performance Metric 1\n(Name & Description)", input.metric1 || ""],
  ["Rationale for Metric 1", input.metric1Rationale || ""],
  ["Performance Metric 1 Value", input.metric1Value || ""],
  ["Performance Metric 2\n(Name & Description)", input.metric2 || ""],
  ["Rationale for Metric 2", input.metric2Rationale || ""],
  ["Performance Metric 2 Value", input.metric2Value || ""],
];

sheet.getRange("A1:B8").format = {
  font: { name: "Arial", size: 11, color: "#333333" },
  verticalAlignment: "center",
  wrapText: true,
  borders: { preset: "all", style: "thin", color: "#7F7F7F" },
};
sheet.getRange("A1:B1").format = {
  fill: "#203864",
  font: { name: "Arial", size: 11, bold: true, color: "#FFFFFF" },
  horizontalAlignment: "center",
  verticalAlignment: "center",
  borders: { preset: "all", style: "thin", color: "#7F7F7F" },
};
sheet.getRange("A2:A8").format = {
  font: { name: "Arial", size: 11, bold: true, color: "#333333" },
  horizontalAlignment: "center",
  verticalAlignment: "center",
  wrapText: true,
  borders: { preset: "all", style: "thin", color: "#7F7F7F" },
};
sheet.getRange("B2:B8").format = {
  font: { name: "Arial", size: 11, color: "#333333" },
  horizontalAlignment: "left",
  verticalAlignment: "center",
  wrapText: true,
  borders: { preset: "all", style: "thin", color: "#7F7F7F" },
};

sheet.getRange("A1:A8").format.columnWidth = 31;
sheet.getRange("B1:B8").format.columnWidth = 92;
sheet.getRange("A1:B1").format.rowHeight = 27;
sheet.getRange("A2:B2").format.rowHeight = 38;
sheet.getRange("A3:B3").format.rowHeight = 55;
sheet.getRange("A4:B4").format.rowHeight = 92;
sheet.getRange("A5:B5").format.rowHeight = 42;
sheet.getRange("A6:B6").format.rowHeight = 55;
sheet.getRange("A7:B7").format.rowHeight = 92;
sheet.getRange("A8:B8").format.rowHeight = 82;
sheet.freezePanes.freezeRows(1);

wb.recalculate();
const inspect = await wb.inspect({ kind: "table", range: "Outcome Analysis!A1:B8", include: "values,formulas", tableMaxRows: 10, tableMaxCols: 4 });
console.log(inspect.ndjson);
const errors = await wb.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!", options: { useRegex: true, maxResults: 100 }, summary: "final formula error scan" });
console.log(errors.ndjson);
const preview = await wb.render({ sheetName: "Outcome Analysis", range: "A1:B8", scale: 1.25, format: "png" });
await fs.writeFile(`${outputPath}.preview.png`, new Uint8Array(await preview.arrayBuffer()));
const xlsx = await SpreadsheetFile.exportXlsx(wb);
await xlsx.save(outputPath);
