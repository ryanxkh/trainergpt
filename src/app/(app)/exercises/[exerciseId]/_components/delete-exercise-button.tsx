"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteCustomExercise } from "../../actions";

export function DeleteExerciseButton({
  exerciseId,
  exerciseName,
}: {
  exerciseId: number;
  exerciseName: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`Delete "${exerciseName}"? This cannot be undone.`)) return;

    startTransition(async () => {
      const result = await deleteCustomExercise(exerciseId);
      if (result.success) {
        toast.success(`${exerciseName} deleted`);
        router.push("/exercises");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleDelete}
      disabled={isPending}
      className="text-destructive hover:text-destructive"
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
    </Button>
  );
}
