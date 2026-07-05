import { CalendarIcon, Search } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { EventFilters, ImpactLevel } from "@/lib/economic-calendar/types";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  "Inflation", "Interest Rates", "Employment", "GDP",
  "Manufacturing", "Consumer Confidence", "Trade", "Retail",
  "Housing", "Central Bank", "Other",
];

interface Props {
  filters: EventFilters;
  onChange: (patch: Partial<EventFilters>) => void;
  countries: string[];
  currencies: string[];
}

export function FiltersBar({ filters, onChange, countries, currencies }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card/60 p-3 backdrop-blur">
      {/* Date range */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className={cn("h-9 gap-2", !filters.from && "text-muted-foreground")}>
            <CalendarIcon className="h-3.5 w-3.5" />
            {format(filters.from, "MMM d")} – {format(filters.to, "MMM d")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
          <Calendar
            mode="range"
            selected={{ from: filters.from, to: filters.to }}
            onSelect={(r) => r?.from && r?.to && onChange({ from: r.from, to: r.to })}
            numberOfMonths={2}
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>

      <Select value={filters.country} onValueChange={(v) => onChange({ country: v })}>
        <SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="Country" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Countries</SelectItem>
          {countries.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={filters.currency} onValueChange={(v) => onChange({ currency: v })}>
        <SelectTrigger className="h-9 w-[130px]"><SelectValue placeholder="Currency" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Currencies</SelectItem>
          {currencies.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={filters.impact} onValueChange={(v) => onChange({ impact: v as ImpactLevel | "all" })}>
        <SelectTrigger className="h-9 w-[130px]"><SelectValue placeholder="Impact" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Impact</SelectItem>
          <SelectItem value="high">High</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="low">Low</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.category} onValueChange={(v) => onChange({ category: v })}>
        <SelectTrigger className="h-9 w-[170px]"><SelectValue placeholder="Category" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
        </SelectContent>
      </Select>

      <div className="relative ml-auto min-w-[220px] flex-1 sm:flex-none">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={filters.search}
          onChange={(e) => onChange({ search: e.target.value })}
          placeholder="Search events…"
          className="h-9 pl-8"
        />
      </div>
    </div>
  );
}
