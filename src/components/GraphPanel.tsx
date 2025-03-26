import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Loader2 } from "lucide-react";

interface GraphPanelProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  desmosExpressions: string[] | null; // Expects an array of Desmos expression strings
}

export function GraphPanel({
  isOpen,
  onOpenChange,
  desmosExpressions,
}: GraphPanelProps) {
  const desmosContainerRef = useRef<HTMLDivElement>(null);
  const calculatorRef = useRef<any>(null); // Holds the Desmos calculator instance
  const [isDesmosLoading, setIsDesmosLoading] = useState(true);

  // Effect: Initialize Desmos when the panel opens or expressions change
  useEffect(() => {
    let checkInterval: NodeJS.Timeout;

    if (isOpen) {
      // Poll until the Desmos API is available
      checkInterval = setInterval(() => {
        if (window.Desmos && window.Desmos.GraphingCalculator) {
          clearInterval(checkInterval);
          setIsDesmosLoading(false);
          if (desmosContainerRef.current && !calculatorRef.current) {
            try {
              const elt = desmosContainerRef.current;
              elt.innerHTML = ""; // Clear any previous content
              const options = {
                keypad: true,
                expressions: false, // We'll manage expressions manually
                settingsMenu: true,
              };
              console.log("Initializing Desmos Calculator...");
              calculatorRef.current = window.Desmos.GraphingCalculator(
                elt,
                options,
              );

              // Apply initial expressions if provided
              if (desmosExpressions && desmosExpressions.length > 0) {
                setDesmosExpressions(desmosExpressions);
              }
            } catch (error) {
              console.error("Error initializing Desmos Calculator:", error);
            }
          }
        }
      }, 100);
    }

    return () => {
      clearInterval(checkInterval);
    };
  }, [isOpen, desmosExpressions]);

  // Effect: Update expressions if they change while the panel is open
  useEffect(() => {
    if (calculatorRef.current && isOpen && desmosExpressions) {
      console.log("Updating Desmos expressions:", desmosExpressions);
      setDesmosExpressions(desmosExpressions);
    }
  }, [desmosExpressions, isOpen]);

  // Set Desmos expressions
  const setDesmosExpressions = (expressions: string[]) => {
    if (calculatorRef.current) {
      calculatorRef.current.setBlank(); // Clear any previous expressions
      const expressionsArray = expressions.map((expr, index) => ({
        id: `expr-${index}`,
        latex: expr,
      }));
      console.log("Setting Desmos expressions:", expressionsArray);
      calculatorRef.current.setExpressions(expressionsArray);
    }
  };

  // Effect: Cleanup and destroy the calculator when the panel closes
  useEffect(() => {
    if (!isOpen && calculatorRef.current) {
      console.log("Destroying Desmos Calculator instance...");
      try {
        calculatorRef.current.destroy();
      } catch (error) {
        console.error("Error destroying Desmos instance:", error);
      }
      calculatorRef.current = null;
      if (desmosContainerRef.current) {
        desmosContainerRef.current.innerHTML = "";
      }
    }
  }, [isOpen]);

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[400px] sm:w-[540px] md:w-[700px] flex flex-col"
      >
        <SheetHeader>
          <SheetTitle>Desmos Graph</SheetTitle>
          <SheetDescription>
            Interactive graph based on chat. Tag @graph to generate or discuss.
          </SheetDescription>
        </SheetHeader>
        {/* Container for Desmos */}
        <div className="flex-grow border rounded-md overflow-hidden mt-4 relative min-h-[400px]">
          {isDesmosLoading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading
              Desmos...
            </div>
          ) : (
            <div
              ref={desmosContainerRef}
              className="absolute inset-0 w-full h-full"
            >
              {!desmosExpressions && (
                <div className="flex items-center justify-center h-full text-muted-foreground p-4 text-center">
                  Desmos loaded. Use @graph in chat to plot expressions.
                </div>
              )}
            </div>
          )}
        </div>
        <SheetFooter className="mt-4 flex-shrink-0">
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
