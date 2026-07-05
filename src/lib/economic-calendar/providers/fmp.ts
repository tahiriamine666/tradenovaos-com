import type { EventProvider } from "./index";
export const fmpProvider: EventProvider = {
  id: "fmp",
  label: "Financial Modeling Prep",
  async fetchEvents() { return []; },
};
