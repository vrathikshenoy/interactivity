// components/ChatInterface.tsx
"use client"; // This component uses hooks
import { toast } from "sonner"; // Import your toast library
import React, { useState, useRef, useEffect } from "react";
import { v4 as uuidv4 } from "uuid"; // For unique keys
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
  graphData?: any;
}

interface McqData {
  question: string;
  options: string[];
  correctAnswer: string;
}

interface ChatInterfaceProps {
  onToggleCanvas: () => void;
  onToggleGraph: () => void;
  // This prop now holds the ref object from the parent (page.tsx)
  // which contains the function to get canvas data (or null)
  getCanvasDataUrlFuncRef: React.MutableRefObject<(() => string | null) | null>;
  updateGraphData: (data: any | null) => void; // Function to update graph panel
}

export function ChatInterface({
  onToggleCanvas,
  onToggleGraph,
  getCanvasDataUrlFuncRef,
  updateGraphData,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

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
      onToggleCanvas(); // Ensure canvas is open or opening

      // Give React a moment to potentially update state and refs if panel was just opened
      // Adjust delay if needed, or explore more robust state synchronization
      await new Promise((resolve) => setTimeout(resolve, 100)); // 100ms delay

      // Now try to get canvas data using the function stored in the ref
      if (getCanvasDataUrlFuncRef.current) {
        console.log(
          "ChatInterface: Calling function from getCanvasDataUrlFuncRef.current()",
        );
        try {
          canvasDataUrl = getCanvasDataUrlFuncRef.current(); // Call the function VIA the ref
          if (canvasDataUrl) {
            console.log(
              "ChatInterface: Successfully got canvas data URL (length:",
              canvasDataUrl.length,
              ")",
            );
            // Optional: Check if it's just a blank canvas placeholder?
          } else {
            console.warn(
              "ChatInterface: Got null/empty data URL from canvas getter.",
            );
            // Don't show error toast here, maybe the canvas *is* blank intentionally.
            // The AI will just not receive image data.
            // Optionally inform user: toast({ title: "Canvas Empty?", description: "Sending message without canvas image." });
          }
        } catch (error) {
          console.error(
            "ChatInterface: Error calling getCanvasDataUrl function:",
            error,
          );
          toast({
            variant: "destructive",
            title: "Canvas Error",
            description: "Failed to capture canvas image data.",
          });
          // Decide if you want to proceed without canvas data or stop submission
          // For now, we'll proceed without it
          canvasDataUrl = null;
        }
      } else {
        console.warn(
          "ChatInterface: getCanvasDataUrlFuncRef.current is null. Canvas component might still be loading or getter wasn't set.",
        );
        toast({
          variant: "destructive",
          title: "Canvas Not Ready",
          description: "Try sending the message again in a moment.",
        });
        // Stop submission if canvas was required but not ready
        return;
      }
    }
    // --- End Canvas Tag Handling ---

    // --- Graph Tag Handling ---
    if (userMessageContent.toLowerCase().includes("@graph")) {
      console.log("ChatInterface: Detected @graph tag.");
      onToggleGraph(); // Open the graph panel
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
    updateGraphData(null); // Clear previous graph data

    const historyForAPI = messages.map(({ role, content }) => ({
      role,
      content,
    }));

    try {
      console.log(
        "ChatInterface: Sending to /api/chat with canvasDataUrl:",
        canvasDataUrl ? `Present (length: ${canvasDataUrl.length})` : "null",
      );
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          history: historyForAPI,
          message: userMessageContent,
          canvasDataUrl: canvasDataUrl, // Send data URL (or null)
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`,
        );
      }

      const data = await response.json();
      console.log("ChatInterface: Received response from /api/chat:", data);

      const aiResponseMessage: Message = {
        id: uuidv4(),
        role: "model",
        content: data.reply || "Sorry, I couldn't generate a response.",
        mcqs: data.mcqData,
        graphData: data.graphData,
      };

      setMessages((prevMessages) => [...prevMessages, aiResponseMessage]);

      if (data.graphData) {
        console.log(
          "ChatInterface: Received graph data, updating panel:",
          data.graphData,
        );
        updateGraphData(data.graphData);
        onToggleGraph(); // Ensure graph panel is open if data arrives
      }
    } catch (error: any) {
      console.error(
        "ChatInterface: Failed to send message or process response:",
        error,
      );
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
    // ... (MCQ handling logic - no changes needed from previous version) ...
    console.log(
      `MCQ Selection on message ${messageId}, MCQ ${mcqIndex}: ${selectedOption}`,
    );
    const message = messages.find((m) => m.id === messageId);
    const mcq = message?.mcqs?.[mcqIndex];
    if (mcq) {
      if (selectedOption === mcq.correctAnswer) {
        toast({
          title: "Correct!",
          description: `Your answer "${selectedOption}" is right.`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Incorrect",
          description: `The correct answer was "${mcq.correctAnswer}".`,
        });
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-muted/50">
      {/* Chat Messages Area */}
      <ScrollArea className="flex-grow p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start gap-3 ${message.role === "user" ? "justify-end" : ""}`}
            >
              {message.role === "model" && (
                <Bot className="w-6 h-6 text-primary flex-shrink-0" />
              )}
              <div
                className={`rounded-lg p-3 max-w-[75%] break-words ${message.role === "user" ? "bg-primary text-primary-foreground" : "bg-background border"}`}
              >
                {/* Basic rendering - consider react-markdown for full support */}
                <p className="whitespace-pre-wrap">{message.content}</p>

                {/* Render MCQs */}
                {message.mcqs && message.mcqs.length > 0 && (
                  <Card className="mt-4 bg-muted">
                    {/* ... MCQ Card Content ... */}
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Quiz Time!</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {message.mcqs.map((mcq, mcqIndex) => (
                        <div key={mcqIndex}>
                          <p className="font-medium mb-2">
                            {mcqIndex + 1}. {mcq.question}
                          </p>
                          <RadioGroup
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
                                />
                                <Label
                                  htmlFor={`${message.id}-mcq${mcqIndex}-opt${optionIndex}`}
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

                {/* Indicate graph data */}
                {message.graphData && (
                  <div className="mt-2 text-xs text-muted-foreground italic">
                    (Graph data generated - view in Graph panel)
                  </div>
                )}
              </div>
              {message.role === "user" && (
                <User className="w-6 h-6 text-primary flex-shrink-0" />
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex items-start gap-3">
              <Bot className="w-6 h-6 text-primary flex-shrink-0" />
              <div className="rounded-lg p-3 bg-background border">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-4 border-t bg-background">
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
