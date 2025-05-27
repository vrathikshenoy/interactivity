import { NextRequest, NextResponse } from "next/server";
import { generativeModel } from "@/lib/gemini";
import { Content, Part } from "@google/generative-ai";

export async function POST(req: NextRequest) {
  try {
    const { history, message, canvasDataUrl, attachments } = await req.json();

    // Validate input
    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 },
      );
    }

    // Validate history sequence
    if (history.length > 0) {
      for (let i = 0; i < history.length; i++) {
        const expectedRole = i % 2 === 0 ? "user" : "model";
        if (history[i].role !== expectedRole) {
          throw new Error(
            `Invalid message sequence at position ${i}. Expected ${expectedRole}, got ${history[i].role}`,
          );
        }
      }
    }

    const systemInstruction = `You are GraphMentor, an AI tutor specializing in mathematics and science. Follow these rules:

1. Always start with user message
2. For file attachments:
   - Summarize key points in bullet points
   - Extract important formulas/theorems
   - Create study guides
3. For @mcq requests:
   - Generate 3-5 high-quality MCQs
   - Include detailed explanations
   - Format as JSON
4. For math questions:
   - Provide step-by-step solutions
   - Use LaTeX for equations
5. For graphs:
   - Generate Desmos expressions when appropriate
   - Format as JSON`;

    // Handle attachments
    let attachmentContent = "";
    if (attachments?.length > 0) {
      const attachment = attachments[0];
      if (attachment.type.startsWith("image/")) {
        attachmentContent = `[Image attachment: ${attachment.name}]`;
      } else {
        try {
          const textContent = Buffer.from(
            attachment.content,
            "base64",
          ).toString("utf-8");
          attachmentContent = `[File content]:\n${textContent.substring(0, 2000)}`;
        } catch (e) {
          console.error("Error decoding attachment:", e);
          attachmentContent = `[Could not decode file: ${attachment.name}]`;
        }
      }
    }

    // Prepare message parts
    const messageParts: Part[] = [
      {
        text: systemInstruction + "\n\n" + message + "\n\n" + attachmentContent,
      },
    ];

    // Add canvas image if provided
    if (canvasDataUrl) {
      const imageRegex = /^data:image\/(png|jpeg|jpg|webp);base64,/;
      if (imageRegex.test(canvasDataUrl)) {
        const mimeType = canvasDataUrl.match(imageRegex)?.[1];
        const base64Data = canvasDataUrl.split(",")[1];
        if (mimeType && base64Data) {
          messageParts.push({
            inlineData: {
              mimeType: `image/${mimeType}`,
              data: base64Data,
            },
          });
        }
      }
    }

    // Start new chat session if no history
    if (history.length === 0) {
      const chat = generativeModel.startChat({
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        },
      });

      const result = await chat.sendMessage(messageParts);
      const response = result.response;
      const text = response.text();

      return NextResponse.json({
        reply: text,
        mcqData: extractMCQs(text),
        desmosExpressions: extractDesmosExpressions(text),
      });
    }

    // Continue existing chat
    const chat = generativeModel.startChat({
      history: history.map((msg) => ({
        role: msg.role,
        parts: [{ text: msg.content }],
      })),
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    });

    const result = await chat.sendMessage(messageParts);
    const response = result.response;
    const text = response.text();

    return NextResponse.json({
      reply: text,
      mcqData: extractMCQs(text),
      desmosExpressions: extractDesmosExpressions(text),
    });
  } catch (error: any) {
    console.error("Chat processing error:", error);
    return NextResponse.json(
      { error: "Processing failed", details: error.message },
      { status: 500 },
    );
  }
}

// Helper function to extract MCQs from response text
function extractMCQs(text: string) {
  const jsonRegex = /```json\s*({[\s\S]*?})\s*```/;
  const match = text.match(jsonRegex);
  if (match) {
    try {
      const data = JSON.parse(match[1]);
      if (data.mcqs && Array.isArray(data.mcqs)) {
        return data.mcqs.map((mcq: any) => ({
          question: mcq.question,
          options: mcq.options || [],
          correctAnswer: mcq.correctAnswer,
          explanation:
            mcq.explanation ||
            `The correct answer is ${mcq.correctAnswer} because...`,
        }));
      }
    } catch (e) {
      console.warn("Failed to parse MCQs", e);
    }
  }
  return null;
}

// Helper function to extract Desmos expressions from response text
function extractDesmosExpressions(text: string) {
  const jsonRegex = /```json\s*({[\s\S]*?})\s*```/;
  const match = text.match(jsonRegex);
  if (match) {
    try {
      const data = JSON.parse(match[1]);
      if (data.desmos_expressions && Array.isArray(data.desmos_expressions)) {
        return data.desmos_expressions.filter(
          (expr: string) => expr.trim().length > 0,
        );
      }
    } catch (e) {
      console.warn("Failed to parse Desmos expressions", e);
    }
  }
  return null;
}
