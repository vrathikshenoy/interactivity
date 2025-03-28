// lib/xlsx-parser.ts
import * as XLSX from "xlsx";

export function parseXlsx(buffer: Buffer): string {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  let output = "";

  workbook.SheetNames.forEach((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    output += `Sheet: ${sheetName}\n`;

    const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    sheetData.forEach((row: any) => {
      output += row.join("\t") + "\n";
    });
    output += "\n";
  });

  return output;
}
