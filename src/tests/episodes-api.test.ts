import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/episodes/[id]/route";
import { NextRequest } from "next/server";

const mockFindFirst = vi.fn();
const mockFindMany = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      episodes: { findFirst: (...args: unknown[]) => mockFindFirst(...args) },
      speakers: { findMany: (...args: unknown[]) => mockFindMany(...args) },
      segments: { findMany: (...args: unknown[]) => mockFindMany(...args) },
      jobs: { findFirst: (...args: unknown[]) => mockFindFirst(...args) },
    },
  },
}));

function makeRequest(id: string) {
  const req = new NextRequest(`http://localhost:3000/api/episodes/${id}`);
  const params = Promise.resolve({ id });
  return { req, params };
}

const EPISODE = {
  id: "ep_abc123",
  sourceUrl: "https://example.com/ep1",
  audioUrl: null,
  title: "Test Episode",
  description: null,
  publishedAt: null,
  durationSecs: 3600,
  transcriptMd: "# Transcript",
  searchVector: null,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-02T00:00:00Z"),
};

const SPEAKERS = [
  { id: "sp_1", episodeId: "ep_abc123", label: "SPEAKER_00", name: "Alice", confidence: "metadata" },
  { id: "sp_2", episodeId: "ep_abc123", label: "SPEAKER_01", name: "Bob", confidence: null },
];

const SEGMENTS = [
  { id: "seg_1", episodeId: "ep_abc123", speakerId: "sp_1", startMs: 0, endMs: 5000, text: "Hello", seq: 0 },
  { id: "seg_2", episodeId: "ep_abc123", speakerId: "sp_2", startMs: 5000, endMs: 10000, text: "Hi there", seq: 1 },
];

const JOB = {
  id: "job_1",
  episodeId: "ep_abc123",
  batchId: null,
  runpodId: null,
  status: "completed",
  progress: 100,
  errorMessage: null,
  startedAt: null,
  completedAt: null,
  createdAt: new Date("2026-01-01T00:00:00Z"),
};

describe("GET /api/episodes/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 for non-existent episode", async () => {
    mockFindFirst.mockResolvedValueOnce(undefined);

    const { req, params } = makeRequest("nonexistent");
    const res = await GET(req, { params });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("Episode not found");
  });

  it("returns full episode data with speakers, segments, and job", async () => {
    // First findFirst = episode lookup
    mockFindFirst.mockResolvedValueOnce(EPISODE);
    // findMany calls: speakers, then segments
    mockFindMany
      .mockResolvedValueOnce(SPEAKERS)
      .mockResolvedValueOnce(SEGMENTS);
    // Second findFirst = latest job
    mockFindFirst.mockResolvedValueOnce(JOB);

    const { req, params } = makeRequest("ep_abc123");
    const res = await GET(req, { params });
    const body = await res.json();

    expect(res.status).toBe(200);

    expect(body.episode).toEqual({
      id: "ep_abc123",
      title: "Test Episode",
      source_url: "https://example.com/ep1",
      duration_secs: 3600,
      transcript_md: "# Transcript",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-02T00:00:00.000Z",
    });

    expect(body.speakers).toHaveLength(2);
    expect(body.speakers[0]).toEqual({
      id: "sp_1",
      label: "SPEAKER_00",
      name: "Alice",
      confidence: "metadata",
    });
    expect(body.speakers[1].confidence).toBeNull();

    expect(body.segments).toHaveLength(2);
    expect(body.segments[0]).toEqual({
      id: "seg_1",
      start_ms: 0,
      end_ms: 5000,
      speaker_label: "SPEAKER_00",
      speaker_name: "Alice",
      text: "Hello",
      seq: 0,
    });
    expect(body.segments[1].speaker_name).toBe("Bob");

    expect(body.job).toEqual({
      id: "job_1",
      status: "completed",
      progress: 100,
      error_message: null,
    });
  });

  it("returns null job when no jobs exist", async () => {
    mockFindFirst.mockResolvedValueOnce(EPISODE);
    mockFindMany
      .mockResolvedValueOnce(SPEAKERS)
      .mockResolvedValueOnce([]);
    mockFindFirst.mockResolvedValueOnce(undefined);

    const { req, params } = makeRequest("ep_abc123");
    const res = await GET(req, { params });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.job).toBeNull();
    expect(body.segments).toEqual([]);
  });

  it("returns 500 on database error", async () => {
    mockFindFirst.mockRejectedValueOnce(new Error("DB connection failed"));

    const { req, params } = makeRequest("ep_abc123");
    const res = await GET(req, { params });
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Internal server error");
  });

  it("maps speaker_id to speaker label and name in segments", async () => {
    mockFindFirst.mockResolvedValueOnce(EPISODE);
    mockFindMany
      .mockResolvedValueOnce(SPEAKERS)
      .mockResolvedValueOnce([
        { id: "seg_x", episodeId: "ep_abc123", speakerId: "sp_2", startMs: 0, endMs: 1000, text: "Test", seq: 0 },
      ]);
    mockFindFirst.mockResolvedValueOnce(undefined);

    const { req, params } = makeRequest("ep_abc123");
    const res = await GET(req, { params });
    const body = await res.json();

    expect(body.segments[0].speaker_label).toBe("SPEAKER_01");
    expect(body.segments[0].speaker_name).toBe("Bob");
  });
});
