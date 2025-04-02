import { convertToCoreMessages, Message, streamText } from "ai";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { geminiProModel } from "@/ai";
import { auth } from "@/app/(auth)/auth";
import { deleteChatById, getChatById, saveChat } from "@/db/queries";
import { generateUUID } from "@/lib/utils";

import type { Part } from "@google/generative-ai";

export async function POST(request: Request) {
  const { id, messages, canvasDataUrl, attachmentData } = await request.json();

  const session = await auth();

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Filter out empty messages before converting to core messages
  const coreMessages = convertToCoreMessages(messages).filter(
    (message) => message.content && message.content.length > 0,
  );

  // Prepare additional parts from canvas or attachments
  const additionalParts: Part[] = [];

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
          additionalParts.push({
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
        // For images, we can send them directly
        if (attachmentData.mimeType.startsWith("image/")) {
          additionalParts.push({
            inlineData: {
              mimeType: attachmentData.mimeType,
              data: attachmentData.base64Data,
            },
          });
        }
      }
    } catch (error) {
      console.error("Error processing attachment data:", error);
    }
  }

  // Make sure we have valid messages to process
  if (!coreMessages.length) {
    return new Response("No valid messages to process", { status: 400 });
  }

  // Extract the latest message for processing
  const latestMessage = coreMessages[coreMessages.length - 1];
  const userMessage = latestMessage?.content || "";

  // Make sure userMessage is a string before calling toLowerCase()
  const userMessageString =
    typeof userMessage === "string" ? userMessage : String(userMessage);

  // Detect triggers for special handling
  const isCanvasQuery =
    userMessageString.toLowerCase().includes("@canvas") || canvasDataUrl;
  const isDocumentQuery = !!attachmentData;
  const isMCQQuery =
    userMessageString.toLowerCase().includes("@mcq") ||
    userMessageString.toLowerCase().includes("generate mcqs");
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
  const isGraphQuery = graphTriggers.some((trigger) =>
    userMessageString.toLowerCase().includes(trigger),
  );

  try {
    const result = await streamText({
      model: geminiProModel,
      system: `You are Turing, an AI Mathematics, Physics and Computer Science Tutor focused on accelerating student learning.

- For general queries, provide concise, clear, and engaging responses using markdown formatting where appropriate.
- When the user mentions '@graph' or explicitly asks for a graph, or when explaining mathematical concepts that benefit from visualization, generate Desmos-compatible graph expressions in the specified JSON format.
- When the user mentions '@canvas', focus on analyzing the provided image (e.g., notes or drawings). Only generate graph expressions if the image contains mathematical functions or equations that would benefit from visualization.
- If the user mentions '@mcq' or 'generate mcqs', provide multiple-choice questions in the specified JSON format.
- When the user uploads a document (PDF, PPT, DOC), analyze its content and provide a helpful summary, explanation, or answer questions about it.
- Keep your explanations clear and educational.
- Today's date is ${new Date().toLocaleDateString()}.
      `,
      messages: coreMessages,
      tools: {
        generateDesmosGraph: {
          description: "Generate Desmos-compatible graph expressions",
          parameters: z.object({
            expressions: z
              .array(z.string())
              .describe("Array of Desmos-compatible expressions"),
            description: z
              .string()
              .describe("Brief educational explanation of the graph"),
          }),
          execute: async ({ expressions, description }) => {
            return {
              desmosExpressions: expressions,
              description,
            };
          },
        },
        generateMCQs: {
          description: "Generate multiple-choice questions on the given topic",
          parameters: z.object({
            mcqs: z
              .array(
                z.object({
                  question: z.string().describe("The question text"),
                  options: z.array(z.string()).describe("Array of options"),
                  correctAnswer: z.string().describe("The correct answer"),
                }),
              )
              .describe("Array of multiple-choice questions"),
          }),
          execute: async ({ mcqs }) => {
            return { mcqs };
          },
        },
        analyzeCanvas: {
          description: "Analyze content from a canvas drawing or written notes",
          parameters: z.object({
            analysis: z.string().describe("Analysis of the canvas content"),
            suggestions: z
              .array(z.string())
              .describe("Suggested next steps or improvements"),
          }),
          execute: async ({ analysis, suggestions }) => {
            return { analysis, suggestions };
          },
        },
        analyzeDocument: {
          description: "Analyze content from an uploaded document",
          parameters: z.object({
            documentType: z
              .string()
              .describe("Type of document (PDF, PPT, DOC, etc.)"),
            summary: z.string().describe("Summary of the document content"),
            keyPoints: z
              .array(z.string())
              .describe("Key points from the document"),
          }),
          execute: async ({ documentType, summary, keyPoints }) => {
            return { documentType, summary, keyPoints };
          },
        },
      },
      onFinish: async ({ responseMessages }) => {
        if (session.user && session.user.id) {
          try {
            await saveChat({
              id,
              messages: [...coreMessages, ...responseMessages],
              userId: session.user.id,
            });
          } catch (error) {
            console.error("Failed to save chat");
          }
        }
      },
      experimental_telemetry: {
        isEnabled: true,
        functionId: "stream-text",
      },
    });

    return result.toDataStreamResponse({});
  } catch (error) {
    console.error("Error in AI processing:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to process request",
        details: error.message,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new Response("Not Found", { status: 404 });
  }

  const session = await auth();

  if (!session || !session.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const chat = await getChatById({ id });

    if (chat.userId !== session.user.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    await deleteChatById({ id });

    return new Response("Chat deleted", { status: 200 });
  } catch (error) {
    return new Response("An error occurred while processing your request", {
      status: 500,
    });
  }
}
