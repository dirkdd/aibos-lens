import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ContextCard from "../../src/components/ContextCard";
import { useAppStore } from "../../src/store";

describe("ContextCard", () => {
  beforeEach(() => { useAppStore.getState().reset(); });

  it("renders nothing when no context card is set", () => {
    const { container } = render(<ContextCard />);
    expect(container.children).toHaveLength(0);
  });

  it("renders entity and summary when context card is set", () => {
    useAppStore.getState().setContextCard({
      id: "c1", entity: "London Alley", summary: "Active client, SOW pending",
      suggestedQuestion: "Ask about timeline", confidence: 0.87, timestamp: Date.now(),
    });
    render(<ContextCard />);
    expect(screen.getByText("London Alley")).toBeTruthy();
    expect(screen.getByText(/SOW pending/)).toBeTruthy();
    expect(screen.getByText(/Ask about timeline/)).toBeTruthy();
  });

  it("clears on dismiss", () => {
    useAppStore.getState().setContextCard({
      id: "c1", entity: "London Alley", summary: "Active client",
      suggestedQuestion: null, confidence: 0.87, timestamp: Date.now(),
    });
    render(<ContextCard />);
    fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(useAppStore.getState().contextCard).toBeNull();
  });
});
