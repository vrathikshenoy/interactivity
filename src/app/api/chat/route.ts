import { type NextRequest, NextResponse } from "next/server";
import { generativeModel } from "@/lib/gemini";
import type { Part } from "@google/generative-ai";

export async function POST(req: NextRequest) {
  try {
    const { message, canvasDataUrl, attachmentData } = await req.json();

    if (!message && !attachmentData) {
      return NextResponse.json(
        { error: "Message or attachment is required" },
        { status: 400 },
      );
    }

    // Log request details for debugging
    console.log("Request received:", {
      messageLength: message?.length || 0,
      hasCanvas: !!canvasDataUrl,
      hasAttachment: !!attachmentData,
    });

    // System Instruction with clear rules for canvas, graph, and document handling
    const systemInstruction = `You are Turing, an AI Mathematics Physics and Computer Science Tutor focused on accelerating student learning.

- For general queries, provide concise, clear, and engaging responses using markdown formatting where appropriate.
- When the user mentions '@graph' or explicitly asks for a graph, or when explaining mathematical concepts that benefit from visualization, generate Desmos-compatible graph expressions in the specified JSON format.
- When the user mentions '@canvas', focus on analyzing the provided image (e.g., notes or drawings). Only generate graph expressions if the image contains mathematical functions or equations that would benefit from visualization.
- If the user mentions '@mcq' or 'generate mcqs', provide multiple-choice questions in the specified JSON format.
- When the user uploads a document (PDF, PPT, DOC), analyze its content and provide a helpful summary, explanation, or answer questions about it.

Graph Generation Guidelines:
- Use precise Desmos syntax for graph expressions.
- Provide clear, educational descriptions for the graphs.

Output Format for Graphs:
\`\`\`json
{
  "desmos_expressions": ["expression1", "expression2"],
  "description": "Brief educational explanation"
}
\`\`\`

Output Format for MCQs:
\`\`\`json
{
  "mcqs": [{"question": "Q1?", "options": ["A", "B", "C"], "correctAnswer": "A"}]
}
\`\`\``;

    // Prepare Current Message Parts
    const currentMessageParts: Part[] = [];

    // Handle Canvas Data
    if (canvasDataUrl) {
      try {
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
          }
        } else {
          console.warn("Invalid canvasDataUrl format");
        }
      } catch (error) {
        console.error("Error processing canvas data:", error);
      }
    }

    // Handle Attachment Data
    if (attachmentData) {
      try {
        if (attachmentData.mimeType && attachmentData.base64Data) {
          // For images, we can send them directly to Gemini
          if (attachmentData.mimeType.startsWith("image/")) {
            currentMessageParts.push({
              inlineData: {
                mimeType: attachmentData.mimeType,
                data: attachmentData.base64Data,
              },
            });
          }
          // For non-image files, we need a different approach
          else {
            // Instead of trying to send the file directly, we'll just tell the model about it
            currentMessageParts.push({
              text: `The user has uploaded a ${attachmentData.fileType} file named "${attachmentData.fileName}". Please provide general guidance on how to approach this type of document for studying.`,
            });
          }
        }
      } catch (error) {
        console.error("Error processing attachment data:", error);
      }
    }

    // Detect triggers
    const isCanvasQuery = message?.toLowerCase().includes("@canvas") || false;
    const isDocumentQuery = !!attachmentData;
    const graphTriggers = [
      "@graph",
      "graph",
      "plot",
      "equation",
      "function",
      "sine wave",
      "linear function",
      "quadratic",
      "trigonometric",
    ];
    const isGraphQuery = message
      ? graphTriggers.some((trigger) => message.toLowerCase().includes(trigger))
      : false;

    // Modify message based on triggers
    let processedMessage = message || "";
    if (isGraphQuery) {
      processedMessage +=
        "\n\nProvide Desmos-compatible expressions in JSON format as specified in system instructions.";
    }

    if (isCanvasQuery && !isGraphQuery) {
      processedMessage += `
    **Objective:** Act as a friendly and engaging tutor to help the student understand the content in the provided image, explain it step-by-step, and encourage their learning with a supportive tone.

    **Instructions:**

    1. **Identify and Describe:**
        - Quickly note the main elements in the image (e.g., numbers, symbols, style) to set the scene for the student.
        - Keep it simple and relatable, like pointing out what it reminds you of (e.g., "This looks like something you'd see on a whiteboard!").
        - Avoid mentioning the color scheme or layout (e.g., avoid saying it's written in bright orange on a black background).

    2. **Teach and Explain:**
        - **Mathematical Expressions/Problems:** If the image shows a math problem, state it clearly, then walk through solving it step-by-step in an easy-to-follow way. Use a conversational tone (e.g., "Let's figure this out together!").
        - **Equations:** If the image contains an equation, solve it and explain each step.
        - **Break It Down:** Explain the concept behind the problem (e.g., what addition or an equation means) in a brief and fun way.
        - **Answer the Question:** If the problem is incomplete, give the answer and explain why it makes sense. Encourage the student by asking them to try it too (e.g., "What do you think the answer is?").

    3. **Subject-Specific Notes:** 
        - **Computer Science Notes:** If the image includes computer science content, explain it clearly, focusing on the core concepts in the notes. Offer examples or analogies where helpful.
        - **Physics Notes:** If the image includes physics content, explain the key principles behind it and answer any questions posed by the notes.

    4. **Engage and Encourage:**
        - Wrap up with a positive summary of what they've learned from the image (e.g., "See how easy that was?").
        - Add a fun, supportive comment or question to keep them motivated (e.g., "You're already mastering this—want to try another one?").

    **Constraint:** Keep explanations simple and avoid overcomplicating things (e.g., no graphs or advanced terms unless the image needs it). Focus on tutoring basics in a way that builds confidence.
  `;
    }

    if (isDocumentQuery) {
      processedMessage += `
    **Objective:** Analyze the uploaded document and provide a helpful summary, explanation, or answer questions about it.
    
    **Instructions:**
    1. Identify the type of document and its main topic.
    2. Provide a concise summary of the key points.
    3. Explain complex concepts in a clear, student-friendly way.
    4. If the document contains problems or exercises, work through examples step-by-step.
    5. Highlight important formulas, definitions, or principles.
    
    **Response Format:** Use markdown formatting for clarity. Include headings, bullet points, and code blocks where appropriate.
    `;
    }

    try {
      // Combine system instruction with user message
      const fullPrompt = `${systemInstruction}\n\nUser: ${processedMessage}`;

      // Add the text prompt as the first part
      currentMessageParts.unshift({ text: fullPrompt });

      console.log("Sending message to Gemini:", {
        partsCount: currentMessageParts.length,
        firstPartPreview:
          currentMessageParts[0]?.text?.substring(0, 100) + "..." ||
          "No text part",
      });

      // Send Message directly to the model without chat history
      const result = await generativeModel.generateContent(currentMessageParts);
      const response = result.response;
      const text = response.text();

      console.log("Received response from Gemini:", {
        responseLength: text.length,
        responsePreview: text.substring(0, 100) + "...",
      });

      // Extract Structured Data
      let desmosExpressions: string[] = [];
      let description = "";
      let mcqData = null;

      // Regex to find JSON blocks
      const jsonRegex = /```json\s*(\{[\s\S]*?\})\s*```/g;
      let match;
      while ((match = jsonRegex.exec(text)) !== null) {
        try {
          const jsonContent = match[1];
          const parsedJson = JSON.parse(jsonContent);

          if (
            parsedJson.desmos_expressions &&
            Array.isArray(parsedJson.desmos_expressions)
          ) {
            desmosExpressions = parsedJson.desmos_expressions;
            description = parsedJson.description || "";
          }
          if (parsedJson.mcqs && Array.isArray(parsedJson.mcqs)) {
            mcqData = parsedJson.mcqs;
          }
        } catch (parseError) {
          console.warn("JSON parsing error:", parseError);
        }
      }

      return NextResponse.json({
        reply: text,
        desmosExpressions:
          desmosExpressions.length > 0 ? desmosExpressions : null,
        description: description || null,
        mcqData: mcqData,
      });
    } catch (error: any) {
      console.error("Gemini API error:", error);
      return NextResponse.json(
        {
          error: "AI model error",
          details: error.message,
          suggestion:
            "Please try again with a simpler query or without attachments.",
        },
        { status: 500 },
      );
    }
  } catch (error: any) {
    console.error("Chat processing error:", error);
    return NextResponse.json(
      {
        error: "Processing failed",
        details: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    );
  }
}
