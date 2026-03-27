"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Battery, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { createDeloadWeek, rerunMesocycle } from "../meso-complete-actions";
import Link from "next/link";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mesoId: number;
  mesoName: string;
};

type Step = "deload" | "rerun";

export function MesoCompleteDialog({
  open,
  onOpenChange,
  mesoId,
  mesoName,
}: Props) {
  const [step, setStep] = useState<Step>("deload");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleDeload = (yes: boolean) => {
    if (yes) {
      startTransition(async () => {
        const result = await createDeloadWeek(mesoId);
        if (result.success && result.mesocycleId) {
          toast.success("Deload week created");
          onOpenChange(false);
          router.push(`/program/${result.mesocycleId}`);
        } else {
          toast.error(result.error ?? "Failed to create deload week");
        }
      });
    } else {
      setStep("rerun");
    }
  };

  const handleRerun = () => {
    startTransition(async () => {
      const result = await rerunMesocycle(mesoId);
      if (result.success && result.mesocycleId) {
        toast.success("New block started — progressive overload!");
        onOpenChange(false);
        router.push(`/program/${result.mesocycleId}`);
      } else {
        toast.error(result.error ?? "Failed to start new block");
      }
    });
  };

  const handleClose = () => {
    setStep("deload");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        {step === "deload" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Battery className="h-5 w-5" />
                Take a Deload Week?
              </DialogTitle>
              <DialogDescription asChild>
                <div className="space-y-3 pt-2">
                  <p>
                    You just finished <strong>{mesoName}</strong>. Nice work.
                  </p>
                  <div className="rounded-xl bg-muted p-3 text-xs text-foreground space-y-2">
                    <p className="font-semibold">What is a deload?</p>
                    <p>
                      A deload is a planned low-intensity week (50% volume, higher
                      RIR) that lets your body recover from accumulated fatigue.
                      It doesn&apos;t mean you stop training — you just pull back
                      so your muscles, joints, and nervous system can fully
                      recover.
                    </p>
                    <p>
                      After a deload, you typically come back stronger and more
                      responsive to training stimulus. Research suggests a deload
                      every 4-8 weeks for optimal long-term growth.
                    </p>
                  </div>
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-row gap-2 sm:flex-row">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => handleDeload(false)}
                disabled={isPending}
              >
                Skip Deload
              </Button>
              <Button
                className="flex-1"
                onClick={() => handleDeload(true)}
                disabled={isPending}
              >
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Battery className="mr-2 h-4 w-4" />
                )}
                Take Deload
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "rerun" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Run Another Block?
              </DialogTitle>
              <DialogDescription asChild>
                <div className="space-y-3 pt-2">
                  <p>
                    Ready for another round of <strong>{mesoName}</strong>?
                  </p>
                  <div className="rounded-xl bg-muted p-3 text-xs text-foreground space-y-2">
                    <p className="font-semibold">Same exercises, progressive overload</p>
                    <p>
                      Your exercises carry forward (including any swaps you made).
                      Your previous performance is pre-loaded so you know exactly
                      what to beat. RIR resets: Week 1 starts at RIR 3 and ramps
                      back down to RIR 0 by the final week.
                    </p>
                    <p>
                      The goal is simple: do a little more than last time. One more
                      rep, a little more weight — that&apos;s progressive overload, and
                      it&apos;s how you grow.
                    </p>
                  </div>
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-row gap-2 sm:flex-row">
              <Link href="/program/templates" className="flex-1">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleClose}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  New Program
                </Button>
              </Link>
              <Button
                className="flex-1"
                onClick={handleRerun}
                disabled={isPending}
              >
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Run Again
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
