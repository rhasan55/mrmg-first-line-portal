import fs from "node:fs/promises";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { SpreadsheetFile, Workbook } = require("@oai/artifact-tool");

const [jsonPath, outputPath] = process.argv.slice(2);
if (!jsonPath || !outputPath) throw new Error("Usage: generate_workbook.mjs data.json output.xlsx");
const input = JSON.parse(await fs.readFile(jsonPath, "utf8"));
const metrics = input.metrics?.length ? input.metrics : [1, 2].map(number => ({
  metricName: input[`metric${number}`] || "",
  metricValue: input[`metric${number}Value`] || "",
  metricRationale: input[`metric${number}Rationale`] || "",
})).filter(metric => metric.metricName);

const rows = [["Field", "Description"], ["Sample Size", input.sampleSize || ""]];
metrics.forEach((metric, index) => rows.push(
  [`Performance Metric ${index + 1}\n(Name & Description)`, metric.metricName],
  [`Rationale for Metric ${index + 1}`, metric.metricRationale],
  [`Performance Metric ${index + 1} Value`, metric.metricValue],
));
const lastRow = rows.length;

const wb = Workbook.create();
const sheet = wb.worksheets.add("Outcome Analysis");
sheet.showGridLines = false;
sheet.getRange(`A1:B${lastRow}`).values = rows;
sheet.getRange(`A1:B${lastRow}`).format = {
  font: { name: "Arial", size: 11, color: "#333333" },
  verticalAlignment: "center", wrapText: true,
  borders: { preset: "all", style: "thin", color: "#7F7F7F" },
};
sheet.getRange("A1:B1").format = {
  fill: "#203864", font: { name: "Arial", size: 11, bold: true, color: "#FFFFFF" },
  horizontalAlignment: "center", verticalAlignment: "center",
  borders: { preset: "all", style: "thin", color: "#7F7F7F" },
};
sheet.getRange(`A2:A${lastRow}`).format = {
  font: { name: "Arial", size: 11, bold: true, color: "#333333" },
  horizontalAlignment: "center", verticalAlignment: "center", wrapText: true,
  borders: { preset: "all", style: "thin", color: "#7F7F7F" },
};
sheet.getRange(`B2:B${lastRow}`).format = {
  font: { name: "Arial", size: 11, color: "#333333" },
  horizontalAlignment: "left", verticalAlignment: "center", wrapText: true,
  borders: { preset: "all", style: "thin", color: "#7F7F7F" },
};
sheet.getRange(`A1:A${lastRow}`).format.columnWidth = 31;
sheet.getRange(`B1:B${lastRow}`).format.columnWidth = 92;
sheet.getRange("A1:B1").format.rowHeight = 27;
sheet.getRange(`A2:B${lastRow}`).format.rowHeight = 55;
sheet.freezePanes.freezeRows(1);

wb.recalculate();
const inspect = await wb.inspect({ kind: "table", range: `Outcome Analysis!A1:B${lastRow}`, include: "values,formulas", tableMaxRows: Math.max(lastRow, 10), tableMaxCols: 4 });
console.log(inspect.ndjson);
const errors = await wb.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!", options: { useRegex: true, maxResults: 100 }, summary: "final formula error scan" });
console.log(errors.ndjson);
const preview = await wb.render({ sheetName: "Outcome Analysis", range: `A1:B${lastRow}`, scale: 1.25, format: "png" });
await fs.writeFile(`${outputPath}.preview.png`, new Uint8Array(await preview.arrayBuffer()));
const xlsx = await SpreadsheetFile.exportXlsx(wb);
await xlsx.save(outputPath);
