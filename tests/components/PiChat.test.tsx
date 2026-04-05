import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PiChat from "../../src/components/PiChat";
import { useAppStore } from "../../src/store";

describe("PiChat", () => {
  beforeEach(() => { useAppStore.getState().reset(); });

  it("renders nothing when chat is closed", () => {
    const { container } = render(<PiChat onSend={() => {}} />);
    expect(container.querySelector("[data-testid='pi-chat-panel']")).toBeNull();
  });

  it("renders chat panel when open", () => {
    useAppStore.getState().togglePiChat();
    render(<PiChat onSend={() => {}} />);
    expect(screen.getByPlaceholderText(/ask pi anything/i)).toBeTruthy();
  });

  it("renders message history", () => {
    useAppStore.getState().togglePiChat();
    useAppStore.getState().addPiMessage({
      id: "m1", role: "user", content: "Tell me about London Alley", timestamp: Date.now(),
    });
    useAppStore.getState().addPiMessage({
      id: "m2", role: "assistant", content: "London Alley is an active client.", timestamp: Date.now(),
    });
    render(<PiChat onSend={() => {}} />);
    expect(screen.getByText(/Tell me about London Alley/)).toBeTruthy();
    expect(screen.getByText(/active client/)).toBeTruthy();
  });

  it("calls onSend when submitting a message", () => {
    useAppStore.getState().togglePiChat();
    const onSend = vi.fn();
    render(<PiChat onSend={onSend} />);
    const input = screen.getByPlaceholderText(/ask pi anything/i);
    fireEvent.change(input, { target: { value: "What about the SOW?" } });
    fireEvent.submit(input.closest("form")!);
    expect(onSend).toHaveBeenCalledWith("What about the SOW?");
  });
});
