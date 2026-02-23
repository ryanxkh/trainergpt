"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Dumbbell, User, Send, Check, ArrowRight } from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";

const QUICK_PROMPTS = [
  "What should I train today?",
  "Create a new program for me",
  "How's my volume looking this week?",
];

export default function CoachClient() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status } = useChat();

  const isLoading = status === "streaming" || status === "submitted";

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
    <div className="flex h-[calc(100dvh-9.5rem)] md:h-[calc(100vh-3rem)] flex-col">
      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-auto pb-4 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full space-y-6">
            <div className="text-center space-y-2">
              <Dumbbell className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="text-lg font-medium">What can I help you with?</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center max-w-md">
              {QUICK_PROMPTS.map((prompt) => (
                <Button
                  key={prompt}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickPrompt(prompt)}
                  disabled={isLoading}
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
            className={`flex gap-3 ${
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
          !messages.some(
            (m) =>
              m.role === "assistant" &&
              m.parts.some(
                (p) => p.type === "text" && p.text.length > 0
              )
          ) && (
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

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2 border-t pt-4">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your training..."
          disabled={isLoading}
          className="flex-1"
        />
        <Button
          type="submit"
          disabled={isLoading || !input.trim()}
          size="icon"
        >
          <Send className="h-4 w-4" />
        </Button>
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
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-sm">{r.sessionName}</p>
            <p className="text-xs text-muted-foreground">
              {r.exerciseCount} exercises, {r.totalSets} total sets
            </p>
          </div>
          <Link href="/workout">
            <Button size="sm" variant="outline">
              Go to Today
              <ArrowRight className="ml-1 h-3 w-3" />
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
