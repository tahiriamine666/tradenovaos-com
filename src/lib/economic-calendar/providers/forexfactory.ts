import type { EventProvider } from "./index";
export const forexFactoryProvider: EventProvider = {
  id: "forexfactory",
  label: "ForexFactory",
  async fetchEvents() { return []; },
};
