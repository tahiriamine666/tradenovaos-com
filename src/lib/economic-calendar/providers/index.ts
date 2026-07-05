// Provider registry. Real fetch adapters plug in here later.
import type { EconomicEvent } from "../types";
import { forexFactoryProvider } from "./forexfactory";
import { tradingEconomicsProvider } from "./tradingeconomics";
import { fmpProvider } from "./fmp";
import { marketauxProvider } from "./marketaux";

export interface EventProvider {
  id: string;
  label: string;
  fetchEvents(range: { from: Date; to: Date }): Promise<EconomicEvent[]>;
}

export const PROVIDERS: EventProvider[] = [
  forexFactoryProvider,
  tradingEconomicsProvider,
  fmpProvider,
  marketauxProvider,
];
