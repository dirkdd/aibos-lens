import { describe, it, expect, vi, beforeEach } from "vitest";
import { FirefliesService } from "../../src/services/fireflies";

vi.mock("socket.io-client", () => ({
  io: vi.fn(() => ({
    on: vi.fn(), emit: vi.fn(), disconnect: vi.fn(), connected: false,
  })),
}));

global.fetch = vi.fn();

describe("FirefliesService", () => {
  let service: FirefliesService;
  beforeEach(() => {
    vi.clearAllMocks();
    service = new FirefliesService("test-api-key", "https://api.fireflies.ai/graphql");
  });

  it("initializes in disconnected state", () => {
    expect(service.getStatus()).toBe("disconnected");
  });

  it("polls for active meetings via GraphQL", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        data: { active_meetings: [{ id: "meeting-1", title: "London Alley Sync", started_at: "2026-04-04T14:00:00Z" }] },
      }),
    });
    const meetings = await service.getActiveMeetings();
    expect(meetings).toHaveLength(1);
    expect(meetings[0].id).toBe("meeting-1");
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.fireflies.ai/graphql",
      expect.objectContaining({ method: "POST", headers: expect.objectContaining({ Authorization: "Bearer test-api-key" }) })
    );
  });

  it("returns empty array when no active meetings", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true, json: () => Promise.resolve({ data: { active_meetings: [] } }),
    });
    const meetings = await service.getActiveMeetings();
    expect(meetings).toHaveLength(0);
  });

  it("handles GraphQL fetch errors gracefully", async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));
    const meetings = await service.getActiveMeetings();
    expect(meetings).toHaveLength(0);
  });

  it("can create a live action item", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true, json: () => Promise.resolve({ data: { createLiveActionItem: { id: "ai-1" } } }),
    });
    const result = await service.createActionItem("meeting-1", "Follow up with Marcus");
    expect(result).toBeTruthy();
  });
});
