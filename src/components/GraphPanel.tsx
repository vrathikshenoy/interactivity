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
import {
  Loader2,
  Plus,
  ZoomIn,
  ZoomOut,
  Save,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface GraphPanelProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  desmosExpressions?: string[];
}

export function GraphPanel({
  isOpen,
  onOpenChange,
  desmosExpressions,
}: GraphPanelProps) {
  const desmosContainerRef = useRef<HTMLDivElement>(null);
  const calculatorRef = useRef<any>(null);
  const [isDesmosLoading, setIsDesmosLoading] = useState(true);
  const [customExpression, setCustomExpression] = useState("");
  const [isCustomExpressionDialogOpen, setIsCustomExpressionDialogOpen] =
    useState(false);
  const [currentExpressions, setCurrentExpressions] = useState<string[]>([]);

  useEffect(() => {
    let checkInterval: NodeJS.Timeout;

    if (isOpen) {
      checkInterval = setInterval(() => {
        if (window.Desmos && window.Desmos.GraphingCalculator) {
          clearInterval(checkInterval);
          setIsDesmosLoading(false);
          if (desmosContainerRef.current && !calculatorRef.current) {
            try {
              const elt = desmosContainerRef.current;
              elt.innerHTML = "";
              const options = {
                keypad: true,
                expressions: true,
                settingsMenu: true,
                zoomButtons: true,
                lockViewport: false,
              };
              calculatorRef.current = window.Desmos.GraphingCalculator(
                elt,
                options,
              );

              if (desmosExpressions && desmosExpressions.length > 0) {
                setDesmosExpressions(desmosExpressions);
              }
            } catch (error) {
              console.error("Error initializing Desmos Calculator:", error);
              toast.error("Failed to initialize Desmos Calculator", {
                description: String(error),
              });
            }
          }
        }
      }, 100);
    }

    return () => {
      clearInterval(checkInterval);
    };
  }, [isOpen, desmosExpressions]);

  const setDesmosExpressions = (expressions: string[]) => {
    if (calculatorRef.current) {
      try {
        calculatorRef.current.setBlank();
        const expressionsArray = expressions.map((expr, index) => ({
          id: `expr-${index}`,
          latex: expr,
        }));
        calculatorRef.current.setExpressions(expressionsArray);
        setCurrentExpressions(expressions);
      } catch (error) {
        console.error("Error setting Desmos expressions:", error);
        toast.error("Failed to set graph expressions", {
          description: String(error),
        });
      }
    }
  };

  const handleAddCustomExpression = () => {
    if (calculatorRef.current && customExpression.trim()) {
      try {
        const newExpression = {
          id: `custom-${Date.now()}`,
          latex: customExpression.trim(),
        };
        calculatorRef.current.setExpression(newExpression);

        // Update current expressions state
        setCurrentExpressions((prev) => [...prev, customExpression.trim()]);

        setCustomExpression("");
        setIsCustomExpressionDialogOpen(false);

        toast.success("Expression added successfully");
      } catch (error) {
        console.error("Error adding custom expression:", error);
        toast.error("Failed to add expression", {
          description: String(error),
        });
      }
    }
  };

  const handleZoomIn = () => {
    if (calculatorRef.current) {
      try {
        const currentMagnification = calculatorRef.current.getMagnification();
        calculatorRef.current.setMagnification(currentMagnification * 1.5);
      } catch (error) {
        toast.error("Zoom in failed", { description: String(error) });
      }
    }
  };

  const handleZoomOut = () => {
    if (calculatorRef.current) {
      try {
        const currentMagnification = calculatorRef.current.getMagnification();
        calculatorRef.current.setMagnification(currentMagnification / 1.5);
      } catch (error) {
        toast.error("Zoom out failed", { description: String(error) });
      }
    }
  };

  const handleReset = () => {
    if (calculatorRef.current) {
      try {
        // Completely clear the calculator
        calculatorRef.current.setBlank();

        // If original expressions exist, reload them
        if (desmosExpressions && desmosExpressions.length > 0) {
          const expressionsArray = desmosExpressions.map((expr, index) => ({
            id: `expr-${index}`,
            latex: expr,
          }));
          calculatorRef.current.setExpressions(expressionsArray);
          setCurrentExpressions(desmosExpressions);
        } else {
          // Clear current expressions state if no original expressions
          setCurrentExpressions([]);
        }

        toast.success("Graph reset successfully");
      } catch (error) {
        console.error("Reset failed:", error);
        toast.error("Failed to reset graph", { description: String(error) });
      }
    }
  };

  const handleClearAll = () => {
    if (calculatorRef.current) {
      try {
        calculatorRef.current.setBlank();
        setCurrentExpressions([]);
        toast.success("All expressions cleared");
      } catch (error) {
        console.error("Clear all failed:", error);
        toast.error("Failed to clear expressions", {
          description: String(error),
        });
      }
    }
  };

  const handleSaveGraph = () => {
    if (calculatorRef.current) {
      try {
        const screenshot = calculatorRef.current.screenshot();
        const link = document.createElement("a");
        link.href = screenshot;
        link.download = `desmos_graph_${new Date().toISOString().replace(/[:.]/g, "-")}.png`;
        link.click();

        toast.success("Graph saved successfully");
      } catch (error) {
        console.error("Save graph failed:", error);
        toast.error("Failed to save graph", { description: String(error) });
      }
    }
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-[95vw] max-w-[1200px] sm:w-[90vw] md:w-[85vw] lg:w-[80vw] xl:w-[75vw] flex flex-col"
        >
          <SheetHeader>
            <SheetTitle>Desmos Graph</SheetTitle>
            <SheetDescription>
              Interactive graphing calculator. Tag @graph to generate
              expressions.
            </SheetDescription>
          </SheetHeader>

          <div className="flex space-x-2 mb-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsCustomExpressionDialogOpen(true)}
              title="Add Custom Expression"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleZoomIn}
              title="Zoom In"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleZoomOut}
              title="Zoom Out"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleReset}
              title="Reset to Original Expressions"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleClearAll}
              title="Clear All Expressions"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleSaveGraph}
              title="Save Graph"
            >
              <Save className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-grow border rounded-md overflow-hidden relative min-h-[400px]">
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
                {currentExpressions.length === 0 && (
                  <div className="flex items-center justify-center h-full text-muted-foreground p-4 text-center">
                    Desmos loaded. Use @graph in chat or add custom expressions.
                  </div>
                )}
              </div>
            )}
          </div>

          {currentExpressions.length > 0 && (
            <div className="mt-2 text-xs text-muted-foreground">
              Current Expressions:
              {currentExpressions.map((expr, index) => (
                <span key={index} className="ml-2 bg-muted rounded px-1">
                  {expr}
                </span>
              ))}
            </div>
          )}

          <SheetFooter className="mt-4 flex-shrink-0">
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Custom Expression Dialog */}
      <Dialog
        open={isCustomExpressionDialogOpen}
        onOpenChange={setIsCustomExpressionDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Custom Expression</DialogTitle>
            <DialogDescription>
              Enter a valid Desmos mathematical expression
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="e.g., y = x^2, sin(x)"
            value={customExpression}
            onChange={(e) => setCustomExpression(e.target.value)}
          />
          <DialogFooter>
            <Button
              variant="default"
              onClick={handleAddCustomExpression}
              disabled={!customExpression.trim()}
            >
              Add Expression
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
