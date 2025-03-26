// app/page.tsx
"use client"; // Needed for state, refs, and dynamic imports on client

import React, { useState, useRef, useCallback } from "react";
import dynamic from "next/dynamic"; // Import dynamic
import { ChatInterface } from "@/components/ChatInterface";
// Remove direct import: import { CanvasPanel } from '@/components/CanvasPanel';
import { GraphPanel } from "@/components/GraphPanel"; // Keep direct or make dynamic if needed
import { PenTool, LineChart, Loader2 } from "lucide-react"; // Added Loader2
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet"; // For Loading state structure

// Dynamically import CanvasPanel, disabling SSR
const CanvasPanel = dynamic(
  () => import("@/components/CanvasPanel").then((mod) => mod.CanvasPanel),
  {
    ssr: false, // Crucial: Don't render this on the server
    loading: () => (
      // Optional: Show a loading indicator matching Sheet structure
      <Sheet open={true}>
        <SheetContent
          side="right"
          className="w-[400px] sm:w-[540px] md:w-[700px] flex items-center justify-center"
        >
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </SheetContent>
      </Sheet>
    ),
  },
);

export default function Home() {
  const [isCanvasOpen, setIsCanvasOpen] = useState(false);
  const [isGraphOpen, setIsGraphOpen] = useState(false);
  const [currentGraphData, setCurrentGraphData] = useState<any | null>(null);

  // Ref to hold the function from CanvasPanel to get its data URL
  const getCanvasDataUrlFuncRef = useRef<(() => string | null) | null>(null);

  const handleToggleCanvas = useCallback(() => {
    setIsCanvasOpen((prev) => !prev);
  }, []);

  const handleToggleGraph = useCallback(() => {
    setIsGraphOpen((prev) => !prev);
  }, []);

  // Callback for ChatInterface to update graph data in this parent component
  const updateGraphData = useCallback((data: any | null) => {
    setCurrentGraphData(data);
  }, []);

  // Function passed to CanvasPanel to allow it to expose its internal getDataURL method
  const exposeCanvasGetter = useCallback(
    (getter: (() => string | null) | null) => {
      console.log(
        "Parent (page.tsx): exposeCanvasGetter called. Getter is now:",
        getter ? "function" : "null",
      );
      getCanvasDataUrlFuncRef.current = getter;
    },
    [],
  ); // No dependencies needed, just sets the ref

  return (
    <main className="flex h-screen w-screen flex-col relative overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b bg-background z-10">
        <h1 className="text-xl font-semibold">Interactivity</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleToggleCanvas}
            aria-label="Toggle Canvas"
          >
            <PenTool className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleToggleGraph}
            aria-label="Toggle Graph"
          >
            <LineChart className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-grow relative">
        {" "}
        {/* Ensure chat takes remaining space */}
        <ChatInterface
          onToggleCanvas={handleToggleCanvas}
          onToggleGraph={handleToggleGraph}
          getCanvasDataUrlFuncRef={getCanvasDataUrlFuncRef} // Pass the ref object directly
          updateGraphData={updateGraphData}
        />
      </div>

      {/* Slide-in Panels */}
      {/* CanvasPanel is dynamically loaded, pass the exposure function */}
      <CanvasPanel
        isOpen={isCanvasOpen}
        onOpenChange={setIsCanvasOpen}
        setCanvasGetter={exposeCanvasGetter} // Pass the callback function
      />

      {/* GraphPanel can remain directly rendered or be made dynamic too */}
      <GraphPanel
        isOpen={isGraphOpen}
        onOpenChange={setIsGraphOpen}
        graphData={currentGraphData}
      />
    </main>
  );
}
