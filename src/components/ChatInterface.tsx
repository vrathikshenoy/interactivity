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
import {
  Bot,
  User,
  CornerDownLeft,
  Loader2,
  PanelLeft,
  Paperclip,
  FileText,
  X,
  Check,
  ChevronDown,
} from "lucide-react";
import { useLocalStorage } from "@/hooks/user-local-storage";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "model";
  content: string;
  mcqs?: McqData[];
  desmosExpressions?: string[];
  timestamp: number;
  attachments?: Attachment[];
}

interface Attachment {
  id: string;
  name: string;
  type: string;
  content: string;
}

interface McqData {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
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
  const [currentChatId, setCurrentChatId] = useLocalStorage(
    "currentChatId",
    uuidv4(),
  );
  const [chatHistory, setChatHistory] = useLocalStorage<
    Record<string, Message[]>
  >("chatHistory", {});
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mcqAnswers, setMcqAnswers] = useLocalStorage<Record<string, string>>(
    "mcqAnswers",
    {},
  );
  const [mcqResults, setMcqResults] = useLocalStorage<Record<string, boolean>>(
    "mcqResults",
    {},
  );
  const [expandedMcqs, setExpandedMcqs] = useLocalStorage<
    Record<string, boolean>
  >("expandedMcqs", {});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  const messages = chatHistory[currentChatId] || [];

  useEffect(() => {
    if (!chatHistory[currentChatId]) {
      setChatHistory((prev) => ({
        ...prev,
        [currentChatId]: [],
      }));
    }
  }, [currentChatId, chatHistory, setChatHistory]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      viewportRef.current?.scrollTo({
        top: viewportRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
  };

  const handleNewChat = () => {
    const newChatId = uuidv4();
    setCurrentChatId(newChatId);
    setShowSidebar(false);
  };

  const handleSelectChat = (id: string) => {
    setCurrentChatId(id);
    setShowSidebar(false);
  };

  const handleDeleteChat = (id: string) => {
    if (Object.keys(chatHistory).length <= 1) {
      handleNewChat();
    }
    const updatedHistory = { ...chatHistory };
    delete updatedHistory[id];
    setChatHistory(updatedHistory);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      let base64Content = content;

      // For non-image files, extract base64 content
      if (!selectedFile.type.startsWith("image/")) {
        base64Content = content.split(",")[1] || content;
      }

      const attachment: Attachment = {
        id: uuidv4(),
        name: selectedFile.name,
        type: selectedFile.type,
        content: base64Content,
      };

      const newUserMessage: Message = {
        id: uuidv4(),
        role: "user",
        content: `Please analyze this ${selectedFile.type.startsWith("image/") ? "image" : "file"}: ${selectedFile.name}`,
        attachments: [attachment],
        timestamp: Date.now(),
      };

      // Update chat history with user message first
      const updatedMessages = [
        ...(chatHistory[currentChatId] || []),
        newUserMessage,
      ];
      setChatHistory((prev) => ({
        ...prev,
        [currentChatId]: updatedMessages,
      }));

      setSelectedFile(null);
      setIsLoading(true);

      try {
        // Prepare history for API - ensure proper sequence
        const apiHistory = updatedMessages
          .filter((msg) => msg.role === "user" || msg.role === "model")
          .map(({ role, content }) => ({ role, content }));

        // Ensure the last message is from the user
        if (
          apiHistory.length > 0 &&
          apiHistory[apiHistory.length - 1].role !== "user"
        ) {
          throw new Error(
            "Invalid message sequence - last message must be from user",
          );
        }

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            history: apiHistory,
            message: `Please summarize this ${selectedFile.type.startsWith("image/") ? "image" : "file"}`,
            attachments: [
              {
                name: selectedFile.name,
                type: selectedFile.type,
                content: base64Content,
              },
            ],
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to process file");
        }

        const data = await response.json();
        const aiResponseMessage: Message = {
          id: uuidv4(),
          role: "model",
          content: data.reply || "Here's a summary of your file:",
          timestamp: Date.now(),
          mcqs: data.mcqData,
        };

        setChatHistory((prev) => ({
          ...prev,
          [currentChatId]: [...(prev[currentChatId] || []), aiResponseMessage],
        }));
      } catch (error: any) {
        console.error("File processing error:", error);
        toast.error("Failed to process file: " + error.message);

        // Remove the loading state but keep the user's message
        setIsLoading(false);
      }
    };

    // Read file based on type
    if (selectedFile.type.startsWith("image/")) {
      reader.readAsDataURL(selectedFile);
    } else {
      reader.readAsText(selectedFile);
    }
  };

  const handleSubmit = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    if (selectedFile) {
      await handleFileUpload();
      return;
    }

    const userMessageContent = input.trim();
    if (!userMessageContent || isLoading) return;

    // Canvas handling
    let canvasDataUrl: string | null = null;
    const requiresCanvas = userMessageContent.toLowerCase().includes("@canvas");
    if (requiresCanvas) {
      onToggleCanvas();
      await new Promise((resolve) => setTimeout(resolve, 150));
      if (getCanvasDataUrlFuncRef.current) {
        canvasDataUrl = getCanvasDataUrlFuncRef.current();
      }
    }

    // Graph handling
    if (userMessageContent.toLowerCase().includes("@graph")) {
      onToggleGraph();
    }

    const newUserMessage: Message = {
      id: uuidv4(),
      role: "user",
      content: userMessageContent,
      timestamp: Date.now(),
    };

    setChatHistory((prev) => ({
      ...prev,
      [currentChatId]: [...(prev[currentChatId] || []), newUserMessage],
    }));
    setInput("");
    setIsLoading(true);
    updateDesmosExpressions(null);

    try {
      // Prepare history for API - ensure proper sequence
      const apiHistory = [...(chatHistory[currentChatId] || []), newUserMessage]
        .filter((msg) => msg.role === "user" || msg.role === "model")
        .map(({ role, content }) => ({ role, content }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          history: apiHistory,
          message: userMessageContent,
          canvasDataUrl,
        }),
      });

      if (!response.ok) throw new Error(await response.text());

      const data = await response.json();
      const aiResponseMessage: Message = {
        id: uuidv4(),
        role: "model",
        content: data.reply || "Sorry, I couldn't generate a response.",
        mcqs: data.mcqData,
        desmosExpressions: data.desmosExpressions,
        timestamp: Date.now(),
      };

      setChatHistory((prev) => ({
        ...prev,
        [currentChatId]: [...(prev[currentChatId] || []), aiResponseMessage],
      }));

      if (data.desmosExpressions) {
        updateDesmosExpressions(data.desmosExpressions);
        onToggleGraph();
      }

      // Update chat title if it's the first message
      if (messages.length === 0) {
        const title = userMessageContent.slice(0, 50);
        const savedChats = JSON.parse(
          localStorage.getItem("chatSessions") || "[]",
        );
        localStorage.setItem(
          "chatSessions",
          JSON.stringify([
            ...savedChats.filter((chat: any) => chat.id !== currentChatId),
            { id: currentChatId, title },
          ]),
        );
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to get response from AI.");
      setChatHistory((prev) => ({
        ...prev,
        [currentChatId]: [
          ...(prev[currentChatId] || []),
          {
            id: uuidv4(),
            role: "model",
            content: `Error: ${error.message || "Could not connect to AI."}`,
            timestamp: Date.now(),
          },
        ],
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleMcqSelection = (
    messageId: string,
    mcqIndex: number,
    selectedOption: string,
  ) => {
    const message = messages.find((m) => m.id === messageId);
    const mcq = message?.mcqs?.[mcqIndex];
    if (!mcq) return;

    const mcqId = `${messageId}-${mcqIndex}`;
    setMcqAnswers((prev) => ({ ...prev, [mcqId]: selectedOption }));

    const isCorrect = selectedOption === mcq.correctAnswer;
    setMcqResults((prev) => ({ ...prev, [mcqId]: isCorrect }));

    toast.custom(
      (t) => (
        <div
          className={`p-4 rounded-md shadow-lg ${isCorrect ? "bg-green-100 border-green-300" : "bg-red-100 border-red-300"} border`}
        >
          <h3 className="font-medium mb-1">
            {isCorrect ? "✅ Correct!" : "❌ Incorrect"}
          </h3>
          <p className="text-sm">{mcq.explanation}</p>
        </div>
      ),
      { duration: 5000 },
    );
  };

  const toggleMcqExpansion = (mcqId: string) => {
    setExpandedMcqs((prev) => ({
      ...prev,
      [mcqId]: !prev[mcqId],
    }));
  };

  const calculateScore = (messageId: string) => {
    const message = messages.find((m) => m.id === messageId);
    if (!message?.mcqs) return { correct: 0, total: 0 };

    let correct = 0;
    message.mcqs.forEach((_, index) => {
      const mcqId = `${messageId}-${index}`;
      if (mcqResults[mcqId]) correct++;
    });

    return { correct, total: message.mcqs.length };
  };

  const renderAttachmentPreview = (attachment: Attachment) => {
    if (attachment.type.startsWith("image/")) {
      return (
        <div className="mt-2">
          <img
            src={`data:${attachment.type};base64,${attachment.content}`}
            alt={attachment.name}
            className="rounded-md max-h-40 object-contain border"
          />
        </div>
      );
    }
    return (
      <div className="mt-2 p-2 bg-muted/50 rounded-md text-sm">
        <p className="font-medium">{attachment.name}</p>
        <p className="text-muted-foreground">
          {attachment.type} - {Math.round(attachment.content.length / 1024)} KB
        </p>
      </div>
    );
  };

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <AnimatePresence>
        {showSidebar && (
          <motion.div
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: "spring", bounce: 0, duration: 0.3 }}
            className="hidden md:block w-64 border-r h-full bg-background"
          >
            <ChatHistory
              currentChatId={currentChatId}
              onNewChat={handleNewChat}
              onSelectChat={handleSelectChat}
              onDeleteChat={handleDeleteChat}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full relative bg-muted/50">
        {/* Mobile Sidebar Toggle */}
        <div className="md:hidden absolute top-2 left-2 z-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSidebar(!showSidebar)}
          >
            <PanelLeft size={20} />
          </Button>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-grow" viewportRef={viewportRef}>
          <div className="p-4 space-y-6 pb-20">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-[60vh] text-center text-muted-foreground">
                <Bot className="w-10 h-10 mb-4" />
                <h3 className="text-xl font-medium mb-2">
                  How can I help you today?
                </h3>
                <p className="max-w-md">
                  Ask anything about math, request graphs with @graph, draw on
                  the canvas with @canvas, or upload study materials.
                </p>
              </div>
            )}

            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  "flex gap-3",
                  message.role === "user" ? "justify-end" : "justify-start",
                )}
              >
                {message.role === "model" && (
                  <div className="flex-shrink-0 mt-1">
                    <Bot className="w-6 h-6 text-primary" />
                  </div>
                )}

                <div
                  className={cn(
                    "rounded-lg p-4 max-w-[85%] sm:max-w-[75%] break-words shadow-sm",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background border",
                  )}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>

                  {/* Render attachments */}
                  {message.attachments?.map((attachment) => (
                    <div key={attachment.id}>
                      {renderAttachmentPreview(attachment)}
                    </div>
                  ))}

                  {/* Render MCQs */}
                  {message.mcqs && message.mcqs.length > 0 && (
                    <Card className="mt-4 border shadow-sm">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-lg">
                            Quiz Questions
                          </CardTitle>
                          <div className="text-sm bg-primary/10 text-primary px-2 py-1 rounded-md">
                            Score: {calculateScore(message.id).correct}/
                            {calculateScore(message.id).total}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {message.mcqs.map((mcq, mcqIndex) => {
                          const mcqId = `${message.id}-${mcqIndex}`;
                          const selectedAnswer = mcqAnswers[mcqId];
                          const isCorrect = mcqResults[mcqId];
                          const isExpanded = expandedMcqs[mcqId];

                          return (
                            <div
                              key={mcqIndex}
                              className="space-y-2 border-b pb-4 last:border-0"
                            >
                              <div className="flex items-baseline gap-2">
                                <span className="font-medium">
                                  {mcqIndex + 1}.
                                </span>
                                <p className="font-medium">{mcq.question}</p>
                              </div>

                              <RadioGroup
                                value={selectedAnswer}
                                onValueChange={(value) =>
                                  handleMcqSelection(
                                    message.id,
                                    mcqIndex,
                                    value,
                                  )
                                }
                                className="space-y-2"
                              >
                                {mcq.options.map((option, optionIndex) => (
                                  <div
                                    key={optionIndex}
                                    className={cn(
                                      "flex items-center space-x-2 p-2 rounded-md border",
                                      selectedAnswer === option
                                        ? isCorrect
                                          ? "bg-green-50 border-green-300"
                                          : "bg-red-50 border-red-300"
                                        : "hover:bg-accent/50",
                                    )}
                                  >
                                    <RadioGroupItem
                                      value={option}
                                      id={`${mcqId}-opt${optionIndex}`}
                                    />
                                    <Label
                                      htmlFor={`${mcqId}-opt${optionIndex}`}
                                      className="text-sm font-normal cursor-pointer flex-1"
                                    >
                                      {option}
                                    </Label>
                                    {selectedAnswer === option && (
                                      <div
                                        className={cn(
                                          "text-xs px-2 py-1 rounded-full",
                                          isCorrect
                                            ? "bg-green-100 text-green-800"
                                            : "bg-red-100 text-red-800",
                                        )}
                                      >
                                        {isCorrect ? "Correct" : "Incorrect"}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </RadioGroup>

                              {selectedAnswer && (
                                <div className="mt-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-sm text-muted-foreground hover:text-primary"
                                    onClick={() => toggleMcqExpansion(mcqId)}
                                  >
                                    <ChevronDown
                                      className={cn(
                                        "w-4 h-4 mr-1 transition-transform",
                                        isExpanded ? "rotate-180" : "",
                                      )}
                                    />
                                    {isExpanded
                                      ? "Hide explanation"
                                      : "Show explanation"}
                                  </Button>
                                  {isExpanded && (
                                    <div className="text-sm p-3 rounded-md bg-muted/50 mt-1">
                                      <p className="font-medium">
                                        Explanation:
                                      </p>
                                      <p>{mcq.explanation}</p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>
                  )}

                  {/* Desmos indicator */}
                  {message.desmosExpressions && (
                    <div className="mt-2 text-xs text-muted-foreground italic">
                      (Graph expressions generated - view in Graph panel)
                    </div>
                  )}
                </div>

                {message.role === "user" && (
                  <div className="flex-shrink-0 mt-1">
                    <User className="w-6 h-6 text-primary" />
                  </div>
                )}
              </motion.div>
            ))}

            {isLoading && (
              <div className="flex gap-3">
                <Bot className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                <div className="rounded-lg p-4 bg-background border max-w-[75%]">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 border-t bg-background sticky bottom-0">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
            >
              <Paperclip className="w-4 h-4" />
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                className="hidden"
                accept=".pdf,.txt,.doc,.docx,.jpg,.jpeg,.png"
              />
            </Button>

            {selectedFile && (
              <div className="flex items-center gap-2 px-3 py-1 border rounded-md bg-accent/50">
                <FileText className="w-4 h-4" />
                <span className="text-sm truncate max-w-[120px]">
                  {selectedFile.name}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setSelectedFile(null)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-1 gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything or attach files..."
                className="flex-grow"
                disabled={isLoading}
              />
              <Button
                type="submit"
                disabled={isLoading || (!input.trim() && !selectedFile)}
              >
                <CornerDownLeft className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
