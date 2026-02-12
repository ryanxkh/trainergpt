"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Dumbbell, User, Send } from "lucide-react";

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

  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col">
      <h1 className="mb-4 text-3xl font-bold">AI Coach</h1>

      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-auto pb-4">
        {messages.length === 0 && (
          <Card className="mx-auto max-w-lg p-6 text-center">
            <Dumbbell className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h2 className="mb-2 text-lg font-semibold">
              Welcome to TrainerGPT
            </h2>
            <p className="text-sm text-muted-foreground">
              Ask me about your training — I can help with workout programming,
              exercise selection, volume management, progressive overload, and
              recovery.
            </p>
          </Card>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {message.role === "assistant" && (
              <Avatar className="flex h-8 w-8 items-center justify-center bg-primary text-primary-foreground">
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
                  return (
                    <p key={i} className="whitespace-pre-wrap">
                      {part.text}
                    </p>
                  );
                }
                return null;
              })}
            </div>
            {message.role === "user" && (
              <Avatar className="flex h-8 w-8 items-center justify-center bg-muted">
                <User className="h-4 w-4" />
              </Avatar>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <Avatar className="flex h-8 w-8 items-center justify-center bg-primary text-primary-foreground">
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
        <Button type="submit" disabled={isLoading || !input.trim()} size="icon">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
