import { describe, it, expect } from "vitest";
import { formatMinorAmount, intervalLabel } from "./billingNative";

describe("billing native formatting", () => {
  it("formats cents from provider", () => expect(formatMinorAmount(599, "USD")).toBe("$5.99"));
  it("returns null when amount unknown", () => expect(formatMinorAmount(null, "USD")).toBeNull());
  it("returns null when currency unknown", () => expect(formatMinorAmount(599, null)).toBeNull());
  it("labels intervals", () => {
    expect(intervalLabel("Month", 1)).toBe("per month");
    expect(intervalLabel("Year", 1)).toBe("per year");
  });
});
