// app/api/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { generativeModel } from "@/lib/gemini";
import mammoth from "mammoth";
import pdf2json from "pdf2json";
import { parseXlsx } from "@/lib/xlsx";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileExtension = file.name.split(".").pop()?.toLowerCase();

    let extractedText = "";
    let summary = "";

    switch (fileExtension) {
      case "docx":
        const docxResult = await mammoth.extractRawText({ buffer });
        extractedText = docxResult.value;
        break;

      case "pdf":
        const pdfParser = new pdf2json();
        extractedText = await new Promise((resolve, reject) => {
          pdfParser.parseBuffer(buffer);
          pdfParser.on("pdfParser_dataReady", (pdfData) => {
            const texts = pdfData.Pages.map((page) =>
              page.Texts.map((text) => decodeURIComponent(text.R[0].T)).join(
                " ",
              ),
            );
            resolve(texts.join("\n"));
          });
          pdfParser.on("error", reject);
        });
        break;

      case "xlsx":
      case "xls":
        extractedText = await parseXlsx(buffer);
        break;

      case "ppt":
      case "pptx":
        extractedText = "PowerPoint parsing not yet implemented";
        break;

      default:
        return NextResponse.json(
          { error: "Unsupported file type" },
          { status: 400 },
        );
    }

    // Generate summary using Gemini
    const chat = generativeModel.startChat({
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    });

    const systemPrompt = `You are an educational AI assistant focused on helping students understand their documents:

    - Provide a clear, concise summary of the document
    - Highlight key concepts and important takeaways
    - Break down complex ideas into digestible explanations
    - Offer potential study strategies or additional context
    - Use markdown formatting for better readability`;

    const prompt = `${systemPrompt}\n\nDocument Content:\n${extractedText.slice(0, 10000)}`;

    const result = await chat.sendMessage(prompt);
    summary = result.response.text();

    return NextResponse.json({
      fileName: file.name,
      fileType: fileExtension,
      summary: summary,
      rawText: extractedText.slice(0, 5000), // Limit raw text for safety
    });
  } catch (error: any) {
    console.error("Document upload error:", error);
    return NextResponse.json(
      { error: "Document processing failed", details: error.message },
      { status: 500 },
    );
  }
}
