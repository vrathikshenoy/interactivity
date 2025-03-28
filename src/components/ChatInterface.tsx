"use client";
import { toast } from "sonner";
import type React from "react";
import { useState, useRef, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Bot,
  User,
  CornerDownLeft,
  Loader2,
  PaperclipIcon,
  X,
  FileImage,
  type File,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

interface Message {
  id: string;
  role: "user" | "model";
  content: string;
  mcqs?: McqData[];
  desmosExpressions?: string[];
  attachmentName?: string;
}

interface McqData {
  question: string;
  options: string[];
  correctAnswer: string;
}

interface AttachmentData {
  mimeType: string;
  base64Data: string;
  fileType: string;
  fileName: string;
}

interface ChatInterfaceProps {
  onToggleCanvas: () => void;
  onToggleGraph: () => void;
  getCanvasDataUrlFuncRef: React.MutableRefObject<(() => string | null) | null>;
  updateDesmosExpressions: (expressions: string[] | null) => void;
}

export function ChatInterface({
  onToggleCanvas,
  onToggleGraph,
  getCanvasDataUrlFuncRef,
  updateDesmosExpressions,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentData, setAttachmentData] = useState<AttachmentData | null>(
    null,
  );
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  // Refs
  const viewportRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: uuidv4(),
          role: "model",
          content:
            "👋 Hi! I'm Turing, your AI tutor for math, physics, and computer science. How can I help you today?\n\n- Ask me questions about any topic\n- Use @canvas to analyze your handwritten notes\n- Use @graph to visualize mathematical concepts\n- Upload images for me to analyze",
        },
      ]);
    }
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    const viewport = viewportRef.current;
    if (viewport) {
      requestAnimationFrame(() => {
        viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
      });
    }
  }, [messages]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInput(event.target.value);
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    // Check file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Please upload a file smaller than 5MB.",
      });
      return;
    }

    // Check file type - only allow images for now
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      toast({
        variant: "destructive",
        title: "Unsupported file type",
        description: "Please upload an image file (JPEG, PNG).",
      });
      return;
    }

    setAttachment(file);

    // Process file
    setIsProcessingFile(true);
    try {
      const reader = new FileReader();

      reader.onload = (e) => {
        if (e.target?.result) {
          // Ensure we're handling the result correctly
          const result = e.target.result;
          let base64Data = "";

          if (typeof result === "string") {
            // Handle string result (DataURL)
            const parts = result.split(",");
            base64Data = parts.length > 1 ? parts[1] : "";
          } else {
            // Handle ArrayBuffer result
            const bytes = new Uint8Array(result);
            let binary = "";
            for (let i = 0; i < bytes.byteLength; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            base64Data = btoa(binary);
          }

          if (!base64Data) {
            throw new Error("Failed to extract base64 data");
          }

          setAttachmentData({
            mimeType: file.type,
            base64Data: base64Data,
            fileType: "Image",
            fileName: file.name,
          });
        } else {
          throw new Error("File reader result is null");
        }
        setIsProcessingFile(false);
      };

      reader.onerror = (error) => {
        console.error("FileReader error:", error);
        toast({
          variant: "destructive",
          title: "File Error",
          description: "Failed to read the file.",
        });
        setIsProcessingFile(false);
        setAttachment(null);
      };

      // Use readAsDataURL for all file types
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("File processing error:", error);
      toast({
        variant: "destructive",
        title: "File Error",
        description: "Failed to process the file.",
      });
      setIsProcessingFile(false);
      setAttachment(null);
    }
  };

  const removeAttachment = () => {
    setAttachment(null);
    setAttachmentData(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const getFileIcon = (file: File) => {
    return <FileImage className="w-4 h-4" />;
  };

  const handleSubmit = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const userMessageContent = input.trim();

    // Check if we have either text input or an attachment
    if ((!userMessageContent && !attachment) || isLoading) return;

    console.log("ChatInterface: handleSubmit called.");

    // --- Canvas Tag Handling ---
    let canvasDataUrl: string | null = null;
    const requiresCanvas = userMessageContent.toLowerCase().includes("@canvas");
    if (requiresCanvas) {
      console.log("ChatInterface: Detected @canvas tag.");
      onToggleCanvas();
      await new Promise((resolve) => setTimeout(resolve, 150));

      if (getCanvasDataUrlFuncRef.current) {
        try {
          canvasDataUrl = getCanvasDataUrlFuncRef.current();
          if (canvasDataUrl) {
            console.log("ChatInterface: Got canvas data URL.");
          } else {
            console.warn("ChatInterface: Got null/empty data URL from canvas.");
          }
        } catch (error) {
          console.error("ChatInterface: Error getting canvas data:", error);
          toast({
            variant: "destructive",
            title: "Canvas Error",
            description: "Failed to get canvas data.",
          });
          canvasDataUrl = null;
        }
      } else {
        console.warn("ChatInterface: Canvas getter function not available.");
        toast({
          variant: "destructive",
          title: "Canvas Not Ready",
          description: "Please wait a moment and try again.",
        });
        return;
      }
    }

    // --- Graph Tag Handling ---
    if (userMessageContent.toLowerCase().includes("@graph")) {
      console.log("ChatInterface: Detected @graph tag.");
      onToggleGraph();
    }

    // Create user message
    const newUserMessage: Message = {
      id: uuidv4(),
      role: "user",
      content:
        userMessageContent ||
        (attachment ? `Analyze this image: ${attachment.name}` : ""),
      attachmentName: attachment?.name,
    };

    setMessages((prevMessages) => [...prevMessages, newUserMessage]);
    setInput("");
    setIsLoading(true);
    updateDesmosExpressions(null);

    try {
      console.log("ChatInterface: Sending to /api/chat...");

      // Log what we're sending for debugging
      console.log("Sending data:", {
        messageLength: userMessageContent?.length || 0,
        hasAttachment: !!attachmentData,
        attachmentType: attachmentData?.fileType || "none",
      });

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessageContent,
          canvasDataUrl: canvasDataUrl,
          attachmentData: attachmentData,
        }),
      });

      // Check for non-JSON responses
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error(`Received non-JSON response: ${contentType}`);
      }

      if (!response.ok) {
        const errorData = await response.json();
        console.error("API error response:", errorData);
        throw new Error(
          errorData.error ||
            errorData.details ||
            `HTTP error! status: ${response.status}`,
        );
      }

      const data = await response.json();
      console.log("ChatInterface: Received response:", data);

      const aiResponseMessage: Message = {
        id: uuidv4(),
        role: "model",
        content: data.reply || "Sorry, I couldn't generate a response.",
        mcqs: data.mcqData,
        desmosExpressions: Array.isArray(data.desmosExpressions)
          ? data.desmosExpressions
              .map((expr) =>
                typeof expr === "object" && expr !== null && "latex" in expr
                  ? expr.latex
                  : expr,
              )
              .filter((expr) => typeof expr === "string")
          : undefined,
      };

      setMessages((prevMessages) => [...prevMessages, aiResponseMessage]);

      // Update Desmos panel if expressions received
      if (data.desmosExpressions) {
        console.log(
          "ChatInterface: Received Desmos expressions, updating panel:",
          data.desmosExpressions,
        );
        updateDesmosExpressions(data.desmosExpressions);
        onToggleGraph();
      }

      // Clear attachment after sending
      removeAttachment();
    } catch (error: any) {
      console.error("ChatInterface: API call failed:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to get response from AI.",
      });
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          id: uuidv4(),
          role: "model",
          content: `Error: ${error.message || "Could not connect to AI."}`,
        },
      ]);
    } finally {
      setIsLoading(false);
      console.log("ChatInterface: Finished processing submit.");
    }
  };

  const handleMcqSelection = (
    mcqIndex: number,
    messageId: string,
    selectedOption: string,
  ) => {
    console.log(
      `MCQ Selection: msg ${messageId}, mcq ${mcqIndex}, opt ${selectedOption}`,
    );
    const message = messages.find((m) => m.id === messageId);
    const mcq = message?.mcqs?.[mcqIndex];
    if (mcq) {
      if (selectedOption === mcq.correctAnswer) {
        toast({
          title: "Correct!",
          description: `Answer "${selectedOption}" is right.`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Incorrect",
          description: `Correct answer: "${mcq.correctAnswer}".`,
        });
      }
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background w-full">
      {/* Scrollable area with relative positioning */}
      <div className="flex-grow overflow-auto relative pb-24">
        <ScrollArea className="h-full p-4" viewportRef={viewportRef}>
          <div className="space-y-6 pr-4 max-w-3xl mx-auto">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className={`flex items-start gap-3 max-w-[85%]`}>
                  {message.role === "model" && (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-5 h-5 text-primary" />
                    </div>
                  )}

                  <div
                    className={cn(
                      "rounded-lg p-4 break-words shadow-sm",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-none"
                        : "bg-muted rounded-tl-none",
                    )}
                  >
                    {message.attachmentName && (
                      <div className="mb-2 flex items-center gap-2 text-xs p-2 bg-background/50 rounded">
                        <FileImage className="w-4 h-4" />
                        <span className="font-medium">
                          {message.attachmentName}
                        </span>
                      </div>
                    )}

                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>

                    {/* Render MCQs */}
                    {message.mcqs && message.mcqs.length > 0 && (
                      <Card className="mt-4 bg-card/50 border shadow-none">
                        <CardHeader className="pb-2 pt-3">
                          <CardTitle className="text-sm font-medium">
                            Quiz Time!
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 pb-3 text-sm">
                          {message.mcqs.map((mcq, mcqIndex) => (
                            <div key={mcqIndex}>
                              <p className="font-medium mb-2">
                                {mcqIndex + 1}. {mcq.question}
                              </p>
                              <RadioGroup
                                onValueChange={(value) =>
                                  handleMcqSelection(
                                    mcqIndex,
                                    message.id,
                                    value,
                                  )
                                }
                              >
                                {mcq.options.map((option, optionIndex) => (
                                  <div
                                    key={optionIndex}
                                    className="flex items-center space-x-2"
                                  >
                                    <RadioGroupItem
                                      value={option}
                                      id={`${message.id}-mcq${mcqIndex}-opt${optionIndex}`}
                                      className="h-3.5 w-3.5"
                                    />
                                    <Label
                                      htmlFor={`${message.id}-mcq${mcqIndex}-opt${optionIndex}`}
                                      className="text-xs font-normal"
                                    >
                                      {option}
                                    </Label>
                                  </div>
                                ))}
                              </RadioGroup>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}

                    {/* Indicate Desmos graph data */}
                    {message.desmosExpressions && (
                      <div className="mt-2 text-xs text-muted-foreground italic">
                        (Desmos expressions generated - view in Graph panel)
                      </div>
                    )}
                  </div>

                  {message.role === "user" && (
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-primary-foreground" />
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5 text-primary" />
                </div>
                <div className="rounded-lg p-4 bg-muted rounded-tl-none min-w-[60px] flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Absolutely positioned input at bottom */}
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-background p-4 border-t">
        <div className="max-w-3xl mx-auto">
          {attachment && (
            <div className="mb-2 flex items-center gap-2 p-2 bg-muted rounded-md">
              <FileImage className="w-4 h-4" />
              <span className="text-sm truncate flex-1">{attachment.name}</span>
              {isProcessingFile ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={removeAttachment}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 w-full bg-background rounded-lg border shadow-sm"
          >
            <Input
              type="text"
              placeholder={
                attachment
                  ? "Ask about this image or type a message..."
                  : "Ask anything... Use @canvas or @graph..."
              }
              value={input}
              onChange={handleInputChange}
              className="flex-grow border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              disabled={isLoading}
              aria-label="Chat input"
            />

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept="image/*" // Only accept images
            />

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={triggerFileInput}
              disabled={isLoading || !!attachment}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Attach file"
            >
              <PaperclipIcon className="w-5 h-5" />
            </Button>

            <Button
              type="submit"
              disabled={isLoading || (!input.trim() && !attachment)}
              size="icon"
              className="mr-1"
              aria-label="Send message"
            >
              <CornerDownLeft className="w-5 h-5" />
            </Button>
          </form>

          <div className="mt-2 text-xs text-center text-muted-foreground">
            Turing can analyze images to help with your studies
          </div>
        </div>
      </div>
    </div>
  );
}
