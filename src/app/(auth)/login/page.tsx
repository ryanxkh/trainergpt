import { LoginClient } from "./_components/login-client";
import { Dumbbell } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40">
      <div className="w-full max-w-md px-4">
        <div className="flex flex-col items-center mb-6">
          <Dumbbell className="h-12 w-12 mb-4" />
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome to TrainerGPT
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Your AI-powered hypertrophy training coach
          </p>
        </div>
        <LoginClient />
      </div>
    </div>
  );
}
