import { ImageResponse } from "next/og";
import { db } from "@/lib/db";
import { workoutSessions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            backgroundColor: "#09090b",
            color: "#fafafa",
            fontFamily: "sans-serif",
          }}
        >
          <div style={{ fontSize: 64, fontWeight: 700, display: "flex", alignItems: "center", gap: 16 }}>
            TrainerGPT
          </div>
          <div style={{ fontSize: 28, color: "#a1a1aa", marginTop: 16 }}>
            AI-Powered Hypertrophy Coach
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }

  const id = parseInt(sessionId);
  const session = await db.query.workoutSessions.findFirst({
    where: eq(workoutSessions.id, id),
    with: {
      sets: {
        with: { exercise: true },
      },
    },
  });

  if (!session) {
    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            backgroundColor: "#09090b",
            color: "#fafafa",
            fontSize: 40,
            fontFamily: "sans-serif",
          }}
        >
          Workout not found
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }

  // Aggregate data
  const exerciseNames = [...new Set(session.sets.map((s) => s.exercise.name))];
  const totalSets = session.sets.length;
  const totalVolume = session.sets.reduce((sum, s) => sum + s.weight * s.reps, 0);
  const dateStr = new Date(session.date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          backgroundColor: "#09090b",
          color: "#fafafa",
          fontFamily: "sans-serif",
          padding: 60,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 40,
          }}
        >
          <div style={{ fontSize: 28, color: "#a1a1aa", display: "flex" }}>
            TrainerGPT
          </div>
          <div style={{ fontSize: 22, color: "#71717a", display: "flex" }}>
            {dateStr}
          </div>
        </div>

        {/* Session Name */}
        <div style={{ fontSize: 56, fontWeight: 700, marginBottom: 32, display: "flex" }}>
          {session.sessionName}
        </div>

        {/* Stats Row */}
        <div
          style={{
            display: "flex",
            gap: 48,
            marginBottom: 40,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 42, fontWeight: 700, display: "flex" }}>{totalSets}</div>
            <div style={{ fontSize: 20, color: "#a1a1aa", display: "flex" }}>Sets</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 42, fontWeight: 700, display: "flex" }}>
              {exerciseNames.length}
            </div>
            <div style={{ fontSize: 20, color: "#a1a1aa", display: "flex" }}>Exercises</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 42, fontWeight: 700, display: "flex" }}>
              {totalVolume.toLocaleString()}
            </div>
            <div style={{ fontSize: 20, color: "#a1a1aa", display: "flex" }}>Volume (lbs)</div>
          </div>
          {session.durationMinutes && (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 42, fontWeight: 700, display: "flex" }}>
                {session.durationMinutes}
              </div>
              <div style={{ fontSize: 20, color: "#a1a1aa", display: "flex" }}>Minutes</div>
            </div>
          )}
        </div>

        {/* Exercise List */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            marginTop: "auto",
          }}
        >
          {exerciseNames.slice(0, 8).map((name) => (
            <div
              key={name}
              style={{
                display: "flex",
                padding: "8px 20px",
                borderRadius: 9999,
                backgroundColor: "#27272a",
                color: "#e4e4e7",
                fontSize: 20,
              }}
            >
              {name}
            </div>
          ))}
          {exerciseNames.length > 8 && (
            <div
              style={{
                display: "flex",
                padding: "8px 20px",
                borderRadius: 9999,
                backgroundColor: "#27272a",
                color: "#71717a",
                fontSize: 20,
              }}
            >
              +{exerciseNames.length - 8} more
            </div>
          )}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
