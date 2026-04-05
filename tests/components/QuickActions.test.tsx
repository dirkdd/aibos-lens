import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import QuickActions from "../../src/components/QuickActions";
import { useAppStore } from "../../src/store";

describe("QuickActions", () => {
  beforeEach(() => { useAppStore.getState().reset(); });

  it("renders nothing when meeting not active", () => {
    const { container } = render(<QuickActions onAction={() => {}} />);
    expect(container.children).toHaveLength(0);
  });

  it("renders default actions when meeting is active", () => {
    useAppStore.getState().startMeeting({
      id: "m1", title: "Test", client: null, attendees: [],
      startedAt: Date.now(), firefliesConnected: false,
    });
    render(<QuickActions onAction={() => {}} />);
    expect(screen.getByText(/Action Item/)).toBeTruthy();
    expect(screen.getByText(/Note/)).toBeTruthy();
    expect(screen.getByText(/Soundbite/)).toBeTruthy();
  });

  it("renders Pi-generated actions alongside defaults", () => {
    useAppStore.getState().startMeeting({
      id: "m1", title: "Test", client: null, attendees: [],
      startedAt: Date.now(), firefliesConnected: false,
    });
    useAppStore.getState().setQuickActions([
      { id: "qa1", label: "Flag: Marcus Chen", action: "graph_upsert", params: {} },
    ]);
    render(<QuickActions onAction={() => {}} />);
    expect(screen.getByText(/Flag: Marcus Chen/)).toBeTruthy();
  });

  it("calls onAction with action details when clicked", () => {
    useAppStore.getState().startMeeting({
      id: "m1", title: "Test", client: null, attendees: [],
      startedAt: Date.now(), firefliesConnected: false,
    });
    const onAction = vi.fn();
    render(<QuickActions onAction={onAction} />);
    fireEvent.click(screen.getByText(/Action Item/));
    expect(onAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: "create_action_item" })
    );
  });
});
