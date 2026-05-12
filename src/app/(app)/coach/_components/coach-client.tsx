"use client";

import { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Dumbbell, User, Send, Check, ArrowRight, AlertCircle, RotateCcw, Square } from "lucide-react";
import { LoadingDots } from "@/components/ui/loading-dots";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { SuggestionCard } from "@/lib/coach-suggestions";

const ReactMarkdown = dynamic(() => import("react-markdown"), { ssr: false });

const FOLLOWUP_PROMPTS = [
  "What should I train today?",
  "Create a new program for me",
  "How's my volume looking this week?",
];

type CoachClientProps = {
  initialSuggestions?: SuggestionCard[];
};

export default function CoachClient({ initialSuggestions = [] }: CoachClientProps) {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, error, clearError, regenerate, stop } = useChat();

  const isLoading = status === "streaming" || status === "submitted";
  const isError = status === "error";
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change or during streaming
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage({ text: input });
    setInput("");
  };

  const handleQuickPrompt = (prompt: string) => {
    sendMessage({ text: prompt });
  };

  const hasSuggestions = initialSuggestions.length > 0;

  return (
    <div className="flex h-[calc(100dvh-4.75rem-env(safe-area-inset-bottom))] md:h-[calc(100dvh-3rem)] flex-col">
      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-auto pb-4 min-h-0 -mx-4 px-4">
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-end h-full space-y-5 pb-4">
            <div className="text-center space-y-2">
              <Avatar className="mx-auto flex h-12 w-12 items-center justify-center bg-primary text-primary-foreground">
                <Dumbbell className="h-5 w-5" />
              </Avatar>
              <p className="text-lg font-medium">What can I help you with?</p>
              {hasSuggestions && (
                <p className="text-xs text-muted-foreground">
                  Tap a suggestion to get started.
                </p>
              )}
            </div>
            {hasSuggestions ? (
              <div className="w-full max-w-md grid gap-2 px-1 sm:grid-cols-2">
                {initialSuggestions.map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => handleQuickPrompt(card.prompt)}
                    disabled={isLoading}
                    className="group flex flex-col items-start gap-1.5 rounded-xl border border-border bg-card p-3 text-left transition-all hover:border-primary/40 hover:shadow-sm active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none"
                  >
                    {card.badge && (
                      <Badge variant="secondary" className="text-[10px] font-medium">
                        {card.badge}
                      </Badge>
                    )}
                    <span className="text-sm font-medium leading-snug">
                      {card.title}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 justify-center max-w-md px-4">
                {FOLLOWUP_PROMPTS.map((prompt) => (
                  <Button
                    key={prompt}
                    variant="outline"
                    onClick={() => handleQuickPrompt(prompt)}
                    disabled={isLoading}
                    className="min-h-11 h-auto px-4 py-2.5 text-sm font-medium"
                  >
                    {prompt}
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 animate-message-in ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {message.role === "assistant" && (
              <Avatar className="flex h-8 w-8 shrink-0 items-center justify-center bg-primary text-primary-foreground">
                <Dumbbell className="h-4 w-4" />
              </Avatar>
            )}
            <div
              className={`max-w-[85%] md:max-w-[75%] rounded-xl px-4 py-2.5 text-sm ${
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              {message.parts.map((part, i) => {
                if (part.type === "text") {
                  if (message.role === "assistant") {
                    return (
                      <div key={i} className="prose prose-sm dark:prose-invert max-w-none [&>p]:my-1 [&>ul]:my-1 [&>ol]:my-1 [&>h1]:text-base [&>h2]:text-sm [&>h3]:text-sm">
                        <ReactMarkdown>{part.text}</ReactMarkdown>
                      </div>
                    );
                  }
                  return (
                    <p key={i} className="whitespace-pre-wrap">
                      {part.text}
                    </p>
                  );
                }
                if (part.type.startsWith("tool-")) {
                  const toolPart = part as unknown as {
                    type: string;
                    toolCallId: string;
                    state: string;
                    output?: unknown;
                  };
                  const toolName = toolPart.type.replace(/^tool-/, "");
                  return (
                    <ToolResultCard
                      key={i}
                      toolName={toolName}
                      state={toolPart.state}
                      result={
                        toolPart.state === "output-available"
                          ? toolPart.output
                          : undefined
                      }
                    />
                  );
                }
                return null;
              })}
            </div>
            {message.role === "user" && (
              <Avatar className="flex h-8 w-8 shrink-0 items-center justify-center bg-muted">
                <User className="h-4 w-4" />
              </Avatar>
            )}
          </div>
        ))}

        {isLoading &&
          messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex gap-3">
              <Avatar className="flex h-8 w-8 shrink-0 items-center justify-center bg-primary text-primary-foreground">
                <Dumbbell className="h-4 w-4" />
              </Avatar>
              <div className="rounded-xl bg-muted px-4 py-2">
                <LoadingDots className="text-muted-foreground" />
              </div>
            </div>
          )}
        {/* Follow-up prompts after the coach's first reply to a card */}
        {messages.length === 2 && !isLoading && (
          <div className="flex flex-wrap gap-2 justify-center py-2">
            {FOLLOWUP_PROMPTS.map((prompt) => (
              <Button
                key={prompt}
                variant="outline"
                onClick={() => handleQuickPrompt(prompt)}
                disabled={isLoading}
                className="min-h-9 h-auto px-3 py-2 text-xs font-medium"
              >
                {prompt}
              </Button>
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error banner */}
      {isError && error && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/50 bg-destructive/5 px-4 py-3">
          <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
          <p className="text-sm text-destructive flex-1">
            Something went wrong. {error.message || "Please try again."}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              clearError();
              regenerate();
            }}
          >
            <RotateCcw className="mr-1.5 h-3 w-3" />
            Retry
          </Button>
        </div>
      )}

      {/* Input — iMessage-style */}
      <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t border-border pt-2 pb-1 md:pt-3">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          placeholder="Ask about your training..."
          disabled={isLoading}
          aria-label="Message your coach"
          rows={1}
          className="flex-1 min-h-[44px] max-h-28 py-2.5 px-3.5 resize-none rounded-xl text-base md:text-sm"
        />
        {isLoading ? (
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={() => stop()}
            className="h-11 w-11 shrink-0 rounded-full"
          >
            <Square className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="submit"
            disabled={!input.trim()}
            size="icon"
            className="h-11 w-11 shrink-0 rounded-full"
          >
            <Send className="h-4 w-4" />
          </Button>
        )}
      </form>
    </div>
  );
}

// ─── Tool Result Cards ──────────────────────────────────────────────

function ToolResultCard({
  toolName,
  state,
  result,
}: {
  toolName: string;
  state: string;
  result?: unknown;
}) {
  if (state !== "output-available") {
    const labels: Record<string, string> = {
      getWorkoutHistory: "Checking workout history...",
      getVolumeThisWeek: "Checking volume...",
      getProgressionTrend: "Analyzing progression...",
      getUserProfile: "Loading your profile...",
      getExerciseLibrary: "Searching exercises...",
      prescribeWorkout: "Creating workout...",
      logWorkoutSet: "Logging set...",
      completeWorkoutSession: "Completing session...",
      updateUserProfile: "Updating your profile...",
      createProgram: "Generating your program...",
      advanceWeek: "Advancing to next week...",
    };
    return (
      <div className="my-1 text-xs text-muted-foreground italic">
        {labels[toolName] || `Running ${toolName}...`}
      </div>
    );
  }

  // prescribeWorkout — show workout card (only on success)
  if (toolName === "prescribeWorkout" && result) {
    const r = result as {
      success: boolean;
      sessionId?: number;
      sessionName?: string;
      exerciseCount?: number;
      totalSets?: number;
      message?: string;
      error?: string;
    };
    if (!r.success) return null;
    return (
      <Card className="my-2 p-3 bg-background">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm">{r.sessionName}</p>
            <p className="text-xs text-muted-foreground">
              {r.exerciseCount} exercises, {r.totalSets} total sets
            </p>
          </div>
          <Link href="/workout">
            <Button size="sm" variant="outline" className="min-h-9 shrink-0">
              Go to Today
              <ArrowRight className="ml-1.5 h-3 w-3" />
            </Button>
          </Link>
        </div>
      </Card>
    );
  }

  // logWorkoutSet — show compact confirmation
  if (toolName === "logWorkoutSet" && result) {
    const r = result as {
      success: boolean;
      exercise?: string;
      setNumber?: number;
      weight?: number;
      reps?: number;
      rir?: number | null;
      error?: string;
    };
    if (!r.success) return null;
    return (
      <Badge variant="secondary" className="my-1 gap-1">
        <Check className="h-3 w-3" />
        Set {r.setNumber}: {r.exercise} {r.weight}lbs x {r.reps}
        {r.rir !== null && r.rir !== undefined ? ` @ ${r.rir} RIR` : ""}
      </Badge>
    );
  }

  // completeWorkoutSession — show session summary badge
  if (toolName === "completeWorkoutSession" && result) {
    const r = result as {
      success: boolean;
      sessionName?: string;
      status?: string;
      durationMinutes?: number | null;
      totalSets?: number;
    };
    if (!r.success) return null;
    return (
      <Badge variant="secondary" className="my-1 gap-1">
        <Check className="h-3 w-3" />
        {r.sessionName} {r.status === "completed" ? "completed" : "abandoned"}
        {r.durationMinutes ? ` (${r.durationMinutes}min)` : ""} — {r.totalSets} sets
      </Badge>
    );
  }

  // createProgram — show program card
  if (toolName === "createProgram" && result) {
    const r = result as {
      success: boolean;
      mesocycleId?: number;
      name?: string;
      totalWeeks?: number;
      week1Sessions?: { sessionName: string }[];
      error?: string;
    };
    if (!r.success) return null;
    return (
      <Card className="my-2 p-3 bg-background">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm">{r.name}</p>
            <p className="text-xs text-muted-foreground">
              {r.totalWeeks} weeks, {r.week1Sessions?.length ?? 0} sessions this week
            </p>
          </div>
          <Link href={`/program/${r.mesocycleId}`}>
            <Button size="sm" variant="outline" className="min-h-9 shrink-0">
              View Program
              <ArrowRight className="ml-1.5 h-3 w-3" />
            </Button>
          </Link>
        </div>
      </Card>
    );
  }

  // advanceWeek — show week advancement badge
  if (toolName === "advanceWeek" && result) {
    const r = result as {
      success: boolean;
      completed?: boolean;
      currentWeek?: number;
      isDeload?: boolean;
      mesocycleName?: string;
    };
    if (!r.success) return null;
    return (
      <Badge variant="secondary" className="my-1 gap-1">
        <Check className="h-3 w-3" />
        {r.completed
          ? `${r.mesocycleName} completed!`
          : `Advanced to Week ${r.currentWeek}${r.isDeload ? " (Deload)" : ""}`}
      </Badge>
    );
  }

  // updateUserProfile — show profile update badge
  if (toolName === "updateUserProfile" && result) {
    const r = result as {
      success: boolean;
      updatedFields?: string[];
      landmarksReSeeded?: boolean;
    };
    if (!r.success) return null;
    return (
      <Badge variant="secondary" className="my-1 gap-1">
        <Check className="h-3 w-3" />
        Profile updated: {r.updatedFields?.join(", ")}
        {r.landmarksReSeeded ? " (volume landmarks re-seeded)" : ""}
      </Badge>
    );
  }

  // All other tools — no visible card (the AI will reference the data in its response)
  return null;
}
