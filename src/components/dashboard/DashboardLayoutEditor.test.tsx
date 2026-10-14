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
    fireEvent.click(screen.getByRole("button", { name: "Hide Psychology" }));
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
    fireEvent.click(screen.getByRole("button", { name: "Hide Equity Curve" }));
    fireEvent.click(screen.getByRole("button", { name: "Save Layout" }));
    await screen.findByRole("alert");
    expect(close).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Show Equity Curve" })).toHaveAttribute("aria-pressed", "false");
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("renders inline (no dialog) with live preview, drag reorder via CSS order and restorable hidden widgets", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    render(<DashboardLayoutEditor initial={{ ...DEFAULT_LAYOUT, hidden: ["psych"] }} onSave={save} onClose={vi.fn()}
      widgets={{ pnl: <p>PNL PREVIEW</p> }} />);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText("PNL PREVIEW")).toBeInTheDocument();
    const node = (id: string) => document.querySelector(`[data-dashboard-widget="${id}"]`) as HTMLElement;
    const pnl = node("pnl"), calendar = node("calendar");
    const dt = { setData: vi.fn(), effectAllowed: "" };
    fireEvent.dragStart(calendar, { dataTransfer: dt });
    fireEvent.dragOver(pnl, { dataTransfer: dt });
    fireEvent.dragEnd(calendar, { dataTransfer: dt });
    expect(node("calendar")).toBe(calendar);
    expect(Number(calendar.style.order)).toBeLessThan(Number(pnl.style.order));
    fireEvent.click(screen.getByRole("button", { name: "Show Psychology" }));
    fireEvent.click(screen.getByRole("button", { name: "Save Layout" }));
    await waitFor(() => expect(save).toHaveBeenCalled());
    const saved = save.mock.calls[0][0];
    expect(saved.hidden).toEqual([]);
    expect(saved.order.indexOf("calendar")).toBe(DEFAULT_LAYOUT.order.indexOf("pnl"));
    expect(saved.order).toHaveLength(DEFAULT_LAYOUT.order.length);
  });
});
