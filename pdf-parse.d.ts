declare module "pdf-parse" {
  // Define the shape of the result object
  export interface PdfParseResult {
    text: string; // Extracted text from the PDF
    numPages: number; // Number of pages in the PDF
    // Add other properties as needed (e.g., info, version) based on documentation
  }

  // Define the default export function
  export default function pdfParse(data: Buffer): Promise<PdfParseResult>;
}
