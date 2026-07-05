import type { EventProvider } from "./index";
export const marketauxProvider: EventProvider = {
  id: "marketaux",
  label: "Marketaux News",
  async fetchEvents() { return []; },
};
