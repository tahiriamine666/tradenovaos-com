import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import DashboardLayoutEditor from "./DashboardLayoutEditor";
import { DEFAULT_LAYOUT } from "@/lib/dashboard/layout";

describe("Dashboard layout editor", () => {
  it("reorders and hides only on explicit save", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const close = vi.fn();
    render(<DashboardLayoutEditor initial={DEFAULT_LAYOUT} onSave={save} onClose={close} />);
    fireEvent.click(screen.getByRole("button", { name: "Move Total P&L up" }));
    fireEvent.click(screen.getByRole("switch", { name: "Show Psychology" }));
    expect(save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Save Layout" }));
    await waitFor(() => expect(close).toHaveBeenCalled());
    expect(save.mock.calls[0][0].order[0]).toBe("pnl");
    expect(save.mock.calls[0][0].hidden).toEqual(["psych"]);
  });
  it("cancel never writes and reset is saved explicitly", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const close = vi.fn();
    const view = render(<DashboardLayoutEditor initial={{ ...DEFAULT_LAYOUT, hidden: ["psych"] }} onSave={save} onClose={close} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(save).not.toHaveBeenCalled();
    view.unmount();
    render(<DashboardLayoutEditor initial={{ ...DEFAULT_LAYOUT, hidden: ["psych"] }} onSave={save} onClose={close} />);
    fireEvent.click(screen.getByRole("button", { name: "Reset to Default" }));
    expect(save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Save Layout" }));
    await waitFor(() => expect(save).toHaveBeenCalledWith(DEFAULT_LAYOUT));
  });
  it("retains edits when saving fails", async () => {
    const save = vi.fn().mockRejectedValue(new Error("offline"));
    const close = vi.fn();
    render(<DashboardLayoutEditor initial={DEFAULT_LAYOUT} onSave={save} onClose={close} />);
    fireEvent.click(screen.getByRole("switch", { name: "Show Equity Curve" }));
    fireEvent.click(screen.getByRole("button", { name: "Save Layout" }));
    await screen.findByRole("alert");
    expect(close).not.toHaveBeenCalled();
    expect(screen.getByRole("switch", { name: "Show Equity Curve" })).toHaveAttribute("aria-checked", "false");
    expect(save).toHaveBeenCalledTimes(1);
  });
});