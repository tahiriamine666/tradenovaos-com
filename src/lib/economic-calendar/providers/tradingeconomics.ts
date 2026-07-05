import type { EventProvider } from "./index";
export const tradingEconomicsProvider: EventProvider = {
  id: "tradingeconomics",
  label: "TradingEconomics",
  async fetchEvents() { return []; },
};
