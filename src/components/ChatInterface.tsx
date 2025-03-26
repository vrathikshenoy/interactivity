//ChatInterface.tsx
"use client";
import { toast } from "sonner";
import React, { useState, useRef, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Bot, User, CornerDownLeft, Loader2 } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "model";
  content: string;
  mcqs?: McqData[];
  desmosExpressions?: string[]; // *** CHANGED ***
}

interface McqData {
  question: string;
  options: string[];
  correctAnswer: string;
}

interface ChatInterfaceProps {
  onToggleCanvas: () => void;
  onToggleGraph: () => void;
  getCanvasDataUrlFuncRef: React.MutableRefObject<(() => string | null) | null>;
  updateDesmosExpressions: (expressions: string[] | null) => void; // *** RENAMED prop ***
}

export function ChatInterface({
  onToggleCanvas,
  onToggleGraph,
  getCanvasDataUrlFuncRef,
  updateDesmosExpressions, // *** Use RENAMED prop ***
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  // Ref for the viewport element *within* ScrollArea for scrolling control
  const viewportRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    const viewport = viewportRef.current;
    if (viewport) {
      // Use requestAnimationFrame for smoother scrolling after render
      requestAnimationFrame(() => {
        viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
      });
    }
  }, [messages]); // Trigger only when messages array changes

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInput(event.target.value);
  };

  const handleSubmit = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const userMessageContent = input.trim();
    if (!userMessageContent || isLoading) return;

    console.log("ChatInterface: handleSubmit called.");

    // --- Canvas Tag Handling ---
    let canvasDataUrl: string | null = null;
    const requiresCanvas = userMessageContent.toLowerCase().includes("@canvas");
    if (requiresCanvas) {
      console.log("ChatInterface: Detected @canvas tag.");
      onToggleCanvas();
      await new Promise((resolve) => setTimeout(resolve, 150)); // Slightly increased delay

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
          // Proceed without canvas data
          canvasDataUrl = null;
        }
      } else {
        console.warn("ChatInterface: Canvas getter function not available.");
        toast({
          variant: "destructive",
          title: "Canvas Not Ready",
          description: "Please wait a moment and try again.",
        });
        // Don't submit if canvas required but not ready
        return;
      }
    }
    // --- End Canvas Tag Handling ---

    // --- Graph Tag Handling ---
    if (userMessageContent.toLowerCase().includes("@graph")) {
      console.log("ChatInterface: Detected @graph tag.");
      onToggleGraph(); // Open graph panel speculatively
    }
    // --- End Graph Tag Handling ---

    const newUserMessage: Message = {
      id: uuidv4(),
      role: "user",
      content: userMessageContent,
    };

    setMessages((prevMessages) => [...prevMessages, newUserMessage]);
    setInput("");
    setIsLoading(true);
    // *** Clear previous Desmos expressions ***
    updateDesmosExpressions(null);

    const historyForAPI = messages.map(({ role, content }) => ({
      role,
      content,
    }));

    try {
      console.log("ChatInterface: Sending to /api/chat...");
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          history: historyForAPI,
          message: userMessageContent,
          canvasDataUrl: canvasDataUrl,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`,
        );
      }

      const data = await response.json();
      console.log("ChatInterface: Received response:", data);

      const aiResponseMessage: Message = {
        id: uuidv4(),
        role: "model",
        content: data.reply || "Sorry, I couldn't generate a response.",
        mcqs: data.mcqData,
        desmosExpressions: data.desmosExpressions, // *** Store Desmos expressions ***
      };

      setMessages((prevMessages) => [...prevMessages, aiResponseMessage]);

      // *** Update Desmos panel if expressions received ***
      if (data.desmosExpressions) {
        console.log(
          "ChatInterface: Received Desmos expressions, updating panel:",
          data.desmosExpressions,
        );
        updateDesmosExpressions(data.desmosExpressions);
        onToggleGraph(); // Ensure graph panel is open
      }
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
    // (MCQ logic remains the same)
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
    // Ensure this component fills height and allows ScrollArea to grow
    <div className="flex flex-col h-full bg-muted/50">
      {/* Chat Messages Area - Make ScrollArea grow */}
      {/* Pass viewportRef to ScrollArea */}
      <ScrollArea className="flex-grow p-4" viewportRef={viewportRef}>
        <div className="space-y-4 pr-4">
          {" "}
          {/* Added padding-right to prevent scrollbar overlap */}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start gap-3 ${message.role === "user" ? "justify-end" : ""}`}
            >
              {message.role === "model" && (
                <Bot className="w-6 h-6 text-primary flex-shrink-0 mt-1" /> // Added mt-1 for alignment
              )}
              <div
                className={`rounded-lg p-3 max-w-[85%] sm:max-w-[75%] break-words shadow-sm ${message.role === "user" ? "bg-primary text-primary-foreground" : "bg-background border"}`}
              >
                <p className="whitespace-pre-wrap text-sm">{message.content}</p>

                {/* Render MCQs */}
                {message.mcqs && message.mcqs.length > 0 && (
                  <Card className="mt-3 bg-card/50 border shadow-none">
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
                            // Disable after selection or add state to track selection? (optional)
                            onValueChange={(value) =>
                              handleMcqSelection(mcqIndex, message.id, value)
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
                                  className="text-xs font-normal" // Smaller label
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
                <User className="w-6 h-6 text-primary flex-shrink-0 mt-1" /> // Added mt-1 for alignment
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex items-start gap-3">
              <Bot className="w-6 h-6 text-primary flex-shrink-0" />
              <div className="rounded-lg p-3 bg-background border">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area - Should not grow */}
      <div className="p-4 border-t bg-background flex-shrink-0">
        {" "}
        {/* Added flex-shrink-0 */}
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <Input
            type="text"
            placeholder="Ask anything... Use @canvas or @graph..."
            value={input}
            onChange={handleInputChange}
            className="flex-grow"
            disabled={isLoading}
            aria-label="Chat input"
          />
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            size="icon"
            aria-label="Send message"
          >
            <CornerDownLeft className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
