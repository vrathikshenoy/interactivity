// components/CanvasPanel.tsx
import React, { useRef, useState, useEffect, forwardRef } from "react"; // Added forwardRef, useEffect
import { Stage, Layer, Line } from "react-konva";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
interface CanvasPanelProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  // Function provided by parent to receive the internal getter function
  setCanvasGetter: (getter: (() => string | null) | null) => void;
}

type LineData = {
  points: number[];
  tool: "pen" | "eraser";
  strokeWidth: number;
  color: string;
};

// Use forwardRef for good practice, although not strictly needed for this prop-based approach
export const CanvasPanel = forwardRef<any, CanvasPanelProps>(
  ({ isOpen, onOpenChange, setCanvasGetter }, ref) => {
    // Added ref param
    const [lines, setLines] = useState<LineData[]>([]);
    const [tool] = useState<"pen" | "eraser">("pen");
    const isDrawing = useRef(false);
    const stageRef = useRef<any>(null); // Konva Stage ref

    const handleMouseDown = (e: any) => {
      isDrawing.current = true;
      const pos = e.target.getStage().getPointerPosition();
      setLines([
        ...lines,
        {
          tool,
          points: [pos.x, pos.y],
          strokeWidth: tool === "pen" ? 3 : 10,
          color: tool === "pen" ? "#df4b26" : "#ffffff",
        },
      ]);
    };

    const handleMouseMove = (e: any) => {
      if (!isDrawing.current) return;
      const stage = e.target.getStage();
      const point = stage.getPointerPosition();
      const lastLine = lines[lines.length - 1];
      lastLine.points = lastLine.points.concat([point.x, point.y]);
      lines.splice(lines.length - 1, 1, lastLine);
      setLines(lines.concat());
    };

    const handleMouseUp = () => {
      isDrawing.current = false;
    };

    const clearCanvas = () => {
      setLines([]);
    };

    // Use useEffect to pass the internal getter function UP to the parent
    // via the setCanvasGetter prop.
    useEffect(() => {
      // Define the function that knows how to get the data URL from the stage ref
      const internalGetDataUrl = (): string | null => {
        if (stageRef.current) {
          console.log("CanvasPanel: internalGetDataUrl called via parent ref.");
          try {
            // Ensure stage has dimensions before capturing if necessary
            if (
              stageRef.current.width() === 0 ||
              stageRef.current.height() === 0
            ) {
              console.warn(
                "CanvasPanel: Stage dimensions are zero, data URL might be empty.",
              );
            }
            const dataUrl = stageRef.current.toDataURL({
              mimeType: "image/png",
              quality: 0.8,
            });
            // Optional: Check if data URL is just the blank canvas placeholder
            // const blankCanvasCheck = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
            // if (dataUrl === blankCanvasCheck) return null; // Treat blank as null if desired
            return dataUrl;
          } catch (error) {
            console.error("CanvasPanel: Error getting data URL:", error);
            return null;
          }
        }
        console.warn(
          "CanvasPanel: internalGetDataUrl called but stageRef is not ready.",
        );
        return null;
      };

      // Call the function passed from the parent (exposeCanvasGetter in page.tsx)
      // to give it access to our internal function.
      setCanvasGetter(internalGetDataUrl);
      console.log("CanvasPanel: useEffect finished, setCanvasGetter called.");

      // Cleanup: Clear the getter function in the parent when the component unmounts or prop changes
      return () => {
        console.log(
          "CanvasPanel: Cleanup effect, calling setCanvasGetter(null).",
        );
        setCanvasGetter(null);
      };
      // Dependency array: Re-run if the parent provides a different setter function (shouldn't happen often)
      // or if the stageRef instance changes (also unlikely).
    }, [setCanvasGetter, stageRef]);

    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-[400px] sm:w-[540px] md:w-[700px] flex flex-col"
        >
          <SheetHeader>
            <SheetTitle>Canvas</SheetTitle>
            <SheetDescription>
              Draw diagrams or write notes. Tag @canvas in chat to discuss.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-grow border rounded-md overflow-hidden mt-4">
            {/* Set explicit dimensions for the Stage if SheetContent doesn't guarantee them */}
            <Stage
              width={700} // Match expected width or calculate dynamically
              height={500} // Set appropriate height
              onMouseDown={handleMouseDown}
              onMousemove={handleMouseMove}
              onMouseup={handleMouseUp}
              onTouchStart={handleMouseDown} // Basic touch support
              onTouchMove={handleMouseMove}
              onTouchEnd={handleMouseUp}
              ref={stageRef}
              style={{ backgroundColor: "white", cursor: "crosshair" }} // Ensure bg for data URL
            >
              <Layer>
                {/* Optional: Add a white background rect if needed */}
                {/* <Rect x={0} y={0} width={700} height={500} fill="white" /> */}
                {lines.map((line, i) => (
                  <Line
                    key={i}
                    points={line.points}
                    stroke={line.color}
                    strokeWidth={line.strokeWidth}
                    tension={0.5}
                    lineCap="round"
                    lineJoin="round"
                    globalCompositeOperation={
                      line.tool === "eraser" ? "destination-out" : "source-over"
                    }
                  />
                ))}
              </Layer>
            </Stage>
          </div>
          <SheetFooter className="mt-4 flex justify-between items-center">
            <Button variant="outline" onClick={clearCanvas}>
              Clear Canvas
            </Button>
            {/* Add tool selection here maybe */}
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    );
  },
);

CanvasPanel.displayName = "CanvasPanel"; // Good practice with forwardRef
