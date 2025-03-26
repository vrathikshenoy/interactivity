"use client";
import React, { useState, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import Head from "next/head";
import Script from "next/script";
import { ChatInterface } from "@/components/ChatInterface";
import { GraphPanel } from "@/components/GraphPanel";
import { PenTool, LineChart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";

// Dynamically import CanvasPanel, disabling SSR
const CanvasPanel = dynamic(
  () => import("@/components/CanvasPanel").then((mod) => mod.CanvasPanel),
  {
    ssr: false,
    loading: () => (
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
  // State for Desmos Expressions
  const [currentDesmosExpressions, setCurrentDesmosExpressions] = useState<
    string[] | null
  >(null);

  const getCanvasDataUrlFuncRef = useRef<(() => string | null) | null>(null);

  const handleToggleCanvas = useCallback(() => {
    setIsCanvasOpen((prev) => !prev);
  }, []);

  const handleToggleGraph = useCallback(() => {
    setIsGraphOpen((prev) => !prev);
  }, []);

  // Callback for ChatInterface to update Desmos expressions
  const updateDesmosExpressions = useCallback(
    (expressions: string[] | null) => {
      setCurrentDesmosExpressions(expressions);
      if (expressions && expressions.length > 0) {
        setIsGraphOpen(true); // Open graph panel if we receive expressions
      }
    },
    [],
  );

  const exposeCanvasGetter = useCallback(
    (getter: (() => string | null) | null) => {
      console.log(
        "Parent (page.tsx): exposeCanvasGetter called. Getter is now:",
        getter ? "function" : "null",
      );
      getCanvasDataUrlFuncRef.current = getter;
    },
    [],
  );

  return (
    <>
      {/* Using Next.js Script component to load the Desmos API */}
      <Head>
        <title>Interactivity</title>
      </Head>
      <Script
        src="https://www.desmos.com/api/v1.8/calculator.js?apiKey=dcb31709b452b1cf9dc26972add0fda6"
        strategy="beforeInteractive"
        onLoad={() => console.log("Desmos script loaded")}
      />
      <main className="flex h-screen w-screen flex-col relative">
        {/* Header */}
        <header className="flex items-center justify-between p-4 border-b bg-background z-10 flex-shrink-0">
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
        <div className="flex-grow relative overflow-y-auto">
          <ChatInterface
            onToggleCanvas={handleToggleCanvas}
            onToggleGraph={handleToggleGraph}
            getCanvasDataUrlFuncRef={getCanvasDataUrlFuncRef}
            updateDesmosExpressions={updateDesmosExpressions}
          />
        </div>

        {/* Slide-in Panels */}
        <CanvasPanel
          isOpen={isCanvasOpen}
          onOpenChange={setIsCanvasOpen}
          setCanvasGetter={exposeCanvasGetter}
        />

        <GraphPanel
          isOpen={isGraphOpen}
          onOpenChange={setIsGraphOpen}
          desmosExpressions={currentDesmosExpressions}
        />
      </main>
    </>
  );
}
