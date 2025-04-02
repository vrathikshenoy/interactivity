"use client";
import { PenTool, LineChart, Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useState, useRef, useCallback } from "react";

import { handleSignOut } from "@/ai/authAction";
import { auth } from "@/app/(auth)/auth";

// Import the server action

import { History } from "./history";
import { SlashIcon } from "./icons";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Sheet, SheetContent } from "../ui/sheet";

// Dynamically import CanvasPanel and GraphPanel
const CanvasPanel = dynamic(
  () => import("@/components/custom/Canvas").then((mod) => mod.CanvasPanel),
  {
    ssr: false,
    loading: () => (
      <Sheet open={true}>
        <SheetContent
          side="right"
          className="w-[400px] sm:w-[540px] md:w-[700px] flex items-center justify-center"
        >
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </SheetContent>
      </Sheet>
    ),
  },
);

const GraphPanel = dynamic(
  () => import("@/components/custom/graph").then((mod) => mod.GraphPanel),
  {
    ssr: false,
    loading: () => (
      <Sheet open={true}>
        <SheetContent
          side="right"
          className="w-[400px] sm:w-[540px] md:w-[700px] flex items-center justify-center"
        >
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </SheetContent>
      </Sheet>
    ),
  },
);

export const Navbar = ({ user }) => {
  // State for canvas and graph panels
  const [isCanvasOpen, setIsCanvasOpen] = useState(false);
  const [isGraphOpen, setIsGraphOpen] = useState(false);
  const [currentDesmosExpressions, setCurrentDesmosExpressions] =
    useState(null);
  const getCanvasDataUrlFuncRef = useRef(null);

  // Toggle functions
  const handleToggleCanvas = useCallback(() => {
    setIsCanvasOpen((prev) => !prev);
  }, []);

  const handleToggleGraph = useCallback(() => {
    setIsGraphOpen((prev) => !prev);
  }, []);

  // Helper functions for canvas and graph
  const updateDesmosExpressions = useCallback((expressions) => {
    if (Array.isArray(expressions)) {
      const stringExpressions = expressions
        .map((expr) =>
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
  }, []);

  const exposeCanvasGetter = useCallback((getter) => {
    getCanvasDataUrlFuncRef.current = getter;
  }, []);

  return (
    <>
      <div className="bg-background absolute top-0 left-0 w-dvw py-2 px-3 justify-between flex flex-row items-center z-30">
        <div className="flex flex-row gap-3 items-center">
          <History user={user} />
          <div className="flex flex-row gap-2 items-center">
            <Image
              src="/images/gemini-logo.png"
              height={20}
              width={20}
              alt="gemini logo"
            />
            <div className="text-zinc-500">
              <SlashIcon size={16} />
            </div>
            <div className="text-sm dark:text-zinc-300 truncate w-28 md:w-fit">
              Interactivity
            </div>
          </div>
        </div>

        {/* Canvas and Graph buttons */}
        <div className="flex gap-2 mx-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleToggleCanvas}
            aria-label="Toggle Canvas"
            className={`transition-transform duration-200 hover:scale-110 ${isCanvasOpen ? "bg-primary/20" : ""}`}
          >
            <PenTool className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleToggleGraph}
            aria-label="Toggle Graph"
            className={`transition-transform duration-200 hover:scale-110 ${isGraphOpen ? "bg-primary/20" : ""}`}
          >
            <LineChart className="size-4" />
          </Button>
        </div>

        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className="py-1.5 px-2 h-fit font-normal"
                variant="secondary"
              >
                {user.email}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <ThemeToggle />
              </DropdownMenuItem>
              <DropdownMenuItem className="p-1 z-50">
                <form className="w-full" action={handleSignOut}>
                  <button
                    type="submit"
                    className="w-full text-left px-1 py-0.5 text-red-500"
                  >
                    Sign out
                  </button>
                </form>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button className="py-1.5 px-2 h-fit font-normal text-white" asChild>
            <Link href="/login">Login</Link>
          </Button>
        )}
      </div>

      {/* Canvas and Graph panels */}
      {isCanvasOpen && (
        <CanvasPanel
          isOpen={isCanvasOpen}
          onOpenChange={setIsCanvasOpen}
          setCanvasGetter={exposeCanvasGetter}
        />
      )}

      {isGraphOpen && (
        <GraphPanel
          isOpen={isGraphOpen}
          onOpenChange={setIsGraphOpen}
          desmosExpressions={currentDesmosExpressions || undefined}
        />
      )}
    </>
  );
};
