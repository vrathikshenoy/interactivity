// components/GraphPanel.tsx
import React, { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { X, LineChart } from "lucide-react"; // Use your icons
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
);

interface GraphPanelProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  graphData: any | null; // Expects data structure from AI: { type: 'line', data: { labels: [], datasets: [{ label: '', data: [] }] } }
}

export function GraphPanel({
  isOpen,
  onOpenChange,
  graphData,
}: GraphPanelProps) {
  const chartRef = useRef<ChartJS<"line", number[], string>>(null);

  // Default options or customize as needed
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: "Graph Visualization",
      },
    },
  };

  // Prepare data in Chart.js format, handle null/empty cases
  const chartJsData: ChartData<"line", number[], string> = graphData?.data ?? {
    labels: [],
    datasets: [],
  };

  // Optional: Force chart update when data changes significantly
  useEffect(() => {
    chartRef.current?.update();
  }, [graphData]);

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[400px] sm:w-[540px] md:w-[700px] flex flex-col"
      >
        <SheetHeader>
          <SheetTitle>Graph Visualization</SheetTitle>
          <SheetDescription>
            Visual representation based on chat. Tag @graph to generate or
            discuss.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-grow border rounded-md overflow-hidden mt-4 p-4 relative h-[400px]">
          {" "}
          {/* Added relative + height */}
          {graphData ? (
            <Line ref={chartRef} options={options} data={chartJsData} />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No graph data available. Use @graph in chat.
            </div>
          )}
        </div>
        <SheetFooter className="mt-4">
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
