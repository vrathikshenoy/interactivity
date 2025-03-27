import React, { useRef, useState, useEffect, forwardRef } from "react";
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
import { Pencil, Eraser, Palette, Download, Undo, Trash2 } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type Tool = "pen" | "eraser";
type LineData = {
  points: number[];
  tool: Tool;
  strokeWidth: number;
  color: string;
};

export const CanvasPanel = forwardRef<any, CanvasPanelProps>(
  ({ isOpen, onOpenChange, setCanvasGetter }, ref) => {
    const [lines, setLines] = useState<LineData[]>([]);
    const [history, setHistory] = useState<LineData[][]>([]);
    const [currentTool, setCurrentTool] = useState<Tool>("pen");
    const [currentColor, setCurrentColor] = useState("#df4b26");
    const [strokeWidth, setStrokeWidth] = useState(3);
    const isDrawing = useRef(false);
    const stageRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Increased canvas size
    const CANVAS_WIDTH = 2000;
    const CANVAS_HEIGHT = 2000;

    // Color palette
    const colorPalette = [
      "#df4b26", // Red
      "#000000", // Black
      "#0000FF", // Blue
      "#008000", // Green
      "#FFA500", // Orange
      "#800080", // Purple
    ];

    const handleMouseDown = (e: any) => {
      isDrawing.current = true;
      const pos = e.target.getStage().getPointerPosition();
      const newLine: LineData = {
        tool: currentTool,
        points: [pos.x, pos.y],
        strokeWidth: currentTool === "pen" ? strokeWidth : 10,
        color: currentTool === "pen" ? currentColor : "#ffffff",
      };

      setLines((prevLines) => [...prevLines, newLine]);
      setHistory((prevHistory) => [...prevHistory, lines]);
    };

    const handleMouseMove = (e: any) => {
      if (!isDrawing.current) return;
      const stage = e.target.getStage();
      const point = stage.getPointerPosition();
      const lastLine = lines[lines.length - 1];
      lastLine.points = lastLine.points.concat([point.x, point.y]);

      setLines((prevLines) => {
        const updatedLines = [...prevLines];
        updatedLines[updatedLines.length - 1] = lastLine;
        return updatedLines;
      });
    };

    const handleMouseUp = () => {
      isDrawing.current = false;
    };

    const clearCanvas = () => {
      setLines([]);
      setHistory([]);
    };

    const undo = () => {
      if (history.length > 0) {
        const lastState = history[history.length - 1];
        setLines(lastState);
        setHistory((prev) => prev.slice(0, -1));
      }
    };

    const downloadCanvas = () => {
      if (stageRef.current) {
        const dataUrl = stageRef.current.toDataURL({
          mimeType: "image/png",
          quality: 1.0,
        });
        const link = document.createElement("a");
        link.download = "canvas_drawing.png";
        link.href = dataUrl;
        link.click();
      }
    };

    useEffect(() => {
      const internalGetDataUrl = (): string | null => {
        if (stageRef.current) {
          try {
            return stageRef.current.toDataURL({
              mimeType: "image/png",
              quality: 0.8,
            });
          } catch (error) {
            console.error("CanvasPanel: Error getting data URL:", error);
            return null;
          }
        }
        return null;
      };

      setCanvasGetter(internalGetDataUrl);

      return () => {
        setCanvasGetter(null);
      };
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

          <div className="flex items-center space-x-2 mb-2">
            {/* Tool Selection */}
            <Button
              variant={currentTool === "pen" ? "default" : "outline"}
              size="icon"
              onClick={() => setCurrentTool("pen")}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant={currentTool === "eraser" ? "default" : "outline"}
              size="icon"
              onClick={() => setCurrentTool("eraser")}
            >
              <Eraser className="h-4 w-4" />
            </Button>

            {/* Color Palette Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon">
                  <Palette className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="flex space-x-2 p-2">
                {colorPalette.map((color) => (
                  <div
                    key={color}
                    className="w-6 h-6 rounded-full cursor-pointer"
                    style={{
                      backgroundColor: color,
                      border:
                        currentColor === color ? "2px solid black" : "none",
                    }}
                    onClick={() => {
                      setCurrentColor(color);
                      setCurrentTool("pen");
                    }}
                  />
                ))}
              </PopoverContent>
            </Popover>

            {/* Additional Actions */}
            <Button
              variant="outline"
              size="icon"
              onClick={undo}
              disabled={history.length === 0}
            >
              <Undo className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={downloadCanvas}>
              <Download className="h-4 w-4" />
            </Button>
          </div>

          <div
            ref={containerRef}
            className="flex-grow border rounded-md overflow-auto"
            style={{
              maxHeight: "500px",
              maxWidth: "100%",
            }}
          >
            <Stage
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              onMouseDown={handleMouseDown}
              onMousemove={handleMouseMove}
              onMouseup={handleMouseUp}
              onTouchStart={handleMouseDown}
              onTouchMove={handleMouseMove}
              onTouchEnd={handleMouseUp}
              ref={stageRef}
              style={{
                backgroundColor: "white",
                cursor: "crosshair",
                margin: 0,
                padding: 0,
              }}
            >
              <Layer>
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
            <Button variant="destructive" onClick={clearCanvas}>
              <Trash2 className="mr-2 h-4 w-4" /> Clear Canvas
            </Button>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    );
  },
);

CanvasPanel.displayName = "CanvasPanel";
