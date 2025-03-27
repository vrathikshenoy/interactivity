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
import Bg from "@/components/Bg";

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

  const updateDesmosExpressions = useCallback(
    (expressions: string[] | null) => {
      // Ensure we're passing an array of strings
      if (Array.isArray(expressions)) {
        const stringExpressions = expressions
          .map((expr) =>
            // If expr is an object with a 'latex' property, extract it
            typeof expr === "object" && expr !== null && "latex" in expr
              ? expr.latex
              : expr,
          )
          .filter((expr) => typeof expr === "string");

        setCurrentDesmosExpressions(stringExpressions);

        if (stringExpressions.length > 0) {
          setIsGraphOpen(true);
        }
      } else {
        setCurrentDesmosExpressions(null);
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
      <Head>
        <title>Interactivity</title>
      </Head>
      <Script
        src="https://www.desmos.com/api/v1.8/calculator.js?apiKey=dcb31709b452b1cf9dc26972add0fda6"
        strategy="beforeInteractive"
        onLoad={() => console.log("Desmos script loaded")}
      />
      <main className="flex h-screen flex-col relative">
        <Bg />
        {/* Rest of the component remains the same */}
        <header className="relative z-10 flex items-center justify-between p-4 border-b bg-gray-900 text-white border-gray-700 flex-shrink-0 shadow-md animate-fade-in">
          <h1 className="text-xl font-semibold absolute left-1/2 transform -translate-x-1/2">
            Interactivity
          </h1>
          <div className="flex gap-2 ml-auto">
            <Button
              variant="outline"
              size="icon"
              onClick={handleToggleCanvas}
              aria-label="Toggle Canvas"
              className="transition-transform duration-200 hover:scale-110 hover:bg-gray-800"
            >
              <PenTool className="h-5 w-5 text-white" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleToggleGraph}
              aria-label="Toggle Graph"
              className="transition-transform duration-200 hover:scale-110 hover:bg-gray-800"
            >
              <LineChart className="h-5 w-5 text-white" />
            </Button>
          </div>
        </header>
        <div className="flex-grow relative overflow-hidden">
          <ChatInterface
            onToggleCanvas={handleToggleCanvas}
            onToggleGraph={handleToggleGraph}
            getCanvasDataUrlFuncRef={getCanvasDataUrlFuncRef}
            updateDesmosExpressions={updateDesmosExpressions}
          />
        </div>
        <CanvasPanel
          isOpen={isCanvasOpen}
          onOpenChange={setIsCanvasOpen}
          setCanvasGetter={exposeCanvasGetter}
        />
        <GraphPanel
          isOpen={isGraphOpen}
          onOpenChange={setIsGraphOpen}
          desmosExpressions={currentDesmosExpressions || undefined}
        />
      </main>
    </>
  );
}
