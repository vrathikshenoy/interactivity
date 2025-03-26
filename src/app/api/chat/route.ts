// app/api/chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import { generativeModel } from "@/lib/gemini";
import { Content, Part } from "@google/generative-ai";

export async function POST(req: NextRequest) {
  try {
    const { history, message, canvasDataUrl } = await req.json();

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 },
      );
    }

    // --- Prepare History for Gemini ---
    const geminiHistory: Content[] = history.map(
      (msg: { role: "user" | "model"; content: string }) => ({
        role: msg.role,
        parts: [{ text: msg.content }],
      }),
    );

    // --- Prepare Current Message Parts ---
    const currentMessageParts: Part[] = [{ text: message }];

    // --- Handle Canvas Data ---
    if (canvasDataUrl) {
      const imageRegex = /^data:image\/(png|jpeg|jpg|webp);base64,/;
      if (imageRegex.test(canvasDataUrl)) {
        const mimeType = canvasDataUrl
          .match(imageRegex)?.[0]
          ?.replace("data:", "")
          .replace(";base64,", "");
        const base64Data = canvasDataUrl.split(",")[1];
        if (mimeType && base64Data) {
          currentMessageParts.push({
            inlineData: {
              mimeType: mimeType,
              data: base64Data,
            },
          });
          currentMessageParts.push({
            text: "\n\n(Instruction: Analyze or explain the provided canvas image contextually.)",
          });
        }
      } else {
        console.warn(
          "Received canvasDataUrl, but it wasn't a valid image data URL format.",
        );
      }
    }

    // --- Prepare Prompt Instructions ---
    let systemInstruction =
      "You are Interactivity, a helpful AI assistant focused on accelerating student learning. Be concise, clear, and engaging. Use markdown formatting where appropriate.";

    // *** MODIFIED FOR DESMOS ***
    if (message.toLowerCase().includes("@graph")) {
      systemInstruction +=
        ' If asked to generate or explain a graph, provide the necessary mathematical expressions suitable for Desmos graphing calculator in a structured JSON format like: `{"desmos_expressions": ["y=x^2", "f(x)=sin(x)"]}`. Ensure expressions are valid Desmos syntax. Explain the graph clearly in your text response.';
    }
    if (
      message.toLowerCase().includes("@mcq") ||
      message.toLowerCase().includes("generate mcqs")
    ) {
      systemInstruction +=
        ' If asked to generate MCQs based on the preceding conversation, provide them in a structured JSON format like: `{"mcqs":[{"question":"Q1?","options":["A","B","C"],"correctAnswer":"A"}, {"question":"Q2?","options":["X","Y","Z"],"correctAnswer":"Y"}]}`.';
    }

    // --- Start Chat Session ---
    const chat = generativeModel.startChat({
      history: geminiHistory,
      generationConfig: { temperature: 0.7 },
    });

    const prompt =
      geminiHistory.length === 0
        ? `${systemInstruction}\n\n${message}`
        : message;
    const messagePartsToSend =
      geminiHistory.length === 0
        ? [{ text: prompt }, ...currentMessageParts.slice(1)]
        : currentMessageParts;

    // --- Send Message to Gemini ---
    const result = await chat.sendMessage(messagePartsToSend);
    const response = result.response;
    const text = response.text();

    // --- Check for Structured Data (Desmos/MCQ) ---
    let desmosExpressions: string[] | null = null; // *** CHANGED ***
    let mcqData = null;

    try {
      const jsonRegex = /```json\s*([\s\S]*?)\s*```|({[\s\S]*})/;
      const match = text.match(jsonRegex);

      if (match) {
        const jsonString = match[1] || match[2];
        const parsedJson = JSON.parse(jsonString);

        // *** MODIFIED TO LOOK FOR desmos_expressions ***
        if (
          parsedJson.desmos_expressions &&
          Array.isArray(parsedJson.desmos_expressions)
        ) {
          desmosExpressions = parsedJson.desmos_expressions;
          console.log("Extracted Desmos expressions:", desmosExpressions);
        } else if (parsedJson.mcqs && Array.isArray(parsedJson.mcqs)) {
          mcqData = parsedJson.mcqs;
          console.log("Extracted MCQ data:", mcqData);
        }
      }
    } catch (parseError) {
      console.warn(
        "Could not parse potential JSON in AI response:",
        parseError,
      );
    }

    // --- Return Response ---
    return NextResponse.json({
      reply: text,
      desmosExpressions: desmosExpressions, // *** CHANGED ***
      mcqData: mcqData,
    });
  } catch (error: any) {
    console.error("Error in /api/chat:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get response from AI" },
      { status: 500 },
    );
  }
}
