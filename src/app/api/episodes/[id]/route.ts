import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { episodes, speakers, segments, jobs } from "@/lib/db/schema";
import { eq, desc, asc } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const episode = await db.query.episodes.findFirst({
      where: eq(episodes.id, id),
    });

    if (!episode) {
      return Response.json({ error: "Episode not found" }, { status: 404 });
    }

    const [episodeSpeakers, episodeSegments, latestJob] = await Promise.all([
      db.query.speakers.findMany({
        where: eq(speakers.episodeId, id),
      }),
      db.query.segments.findMany({
        where: eq(segments.episodeId, id),
        orderBy: [asc(segments.seq)],
      }),
      db.query.jobs.findFirst({
        where: eq(jobs.episodeId, id),
        orderBy: [desc(jobs.createdAt)],
      }),
    ]);

    const speakerMap = new Map(
      episodeSpeakers.map((s) => [s.id, { label: s.label, name: s.name }])
    );

    return Response.json({
      episode: {
        id: episode.id,
        title: episode.title,
        source_url: episode.sourceUrl,
        duration_secs: episode.durationSecs ?? null,
        transcript_md: episode.transcriptMd ?? null,
        created_at: episode.createdAt.toISOString(),
        updated_at: episode.updatedAt.toISOString(),
      },
      speakers: episodeSpeakers.map((s) => ({
        id: s.id,
        label: s.label,
        name: s.name,
        confidence: s.confidence ?? null,
      })),
      segments: episodeSegments.map((seg) => {
        const speaker = speakerMap.get(seg.speakerId);
        return {
          id: seg.id,
          start_ms: seg.startMs,
          end_ms: seg.endMs,
          speaker_label: speaker?.label ?? "",
          speaker_name: speaker?.name ?? "",
          text: seg.text,
          seq: seg.seq,
        };
      }),
      job: latestJob
        ? {
            id: latestJob.id,
            status: latestJob.status,
            progress: latestJob.progress ?? 0,
            error_message: latestJob.errorMessage ?? null,
          }
        : null,
    });
  } catch (error) {
    console.error("Failed to fetch episode:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
