"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Dumbbell, User, Send, Check, ArrowRight, AlertCircle, RotateCcw, Square } from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";

const QUICK_PROMPTS = [
  "What should I train today?",
  "Create a new program for me",
  "How's my volume looking this week?",
];

export default function CoachClient() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, error, clearError, regenerate, stop } = useChat();

  const isLoading = status === "streaming" || status === "submitted";
  const isError = status === "error";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage({ text: input });
    setInput("");
  };

  const handleQuickPrompt = (prompt: string) => {
    sendMessage({ text: prompt });
  };

  return (
    <div className="flex h-[calc(100dvh-8rem)] md:h-[calc(100vh-4rem)] flex-col">
      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-auto pb-4 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-end h-full space-y-4 pb-6">
            <div className="text-center space-y-2">
              <Dumbbell className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="text-lg font-medium">What can I help you with?</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center max-w-md px-4">
              {QUICK_PROMPTS.map((prompt) => (
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
              className={`max-w-[75%] rounded-lg px-4 py-2 text-sm ${
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
              <div className="rounded-lg bg-muted px-4 py-2">
                <div className="flex gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" />
                </div>
              </div>
            </div>
          )}
      </div>

      {/* Error banner */}
      {isError && error && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/50 bg-destructive/5 px-4 py-3">
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

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t border-border pt-3 md:pt-4">
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
          className="flex-1 min-h-11 max-h-32 py-2.5 resize-none"
        />
        {isLoading ? (
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={() => stop()}
            className="h-11 w-11 shrink-0"
          >
            <Square className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="submit"
            disabled={!input.trim()}
            size="icon"
            className="h-11 w-11 shrink-0"
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
