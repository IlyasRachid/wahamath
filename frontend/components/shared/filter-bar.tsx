'use client';

import { SlidersHorizontal } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type FilterOption = { label: string; value: string };

type FilterProps = {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (v: string) => void;
};

function Filter({ label, value, options, onChange }: FilterProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-auto min-w-[130px] bg-card text-sm">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value} className="text-sm">
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

type Props = {
  filters: FilterProps[];
  className?: string;
};

export function FilterBar({ filters, className }: Props) {
  return (
    <div className={className}>
      {/* Desktop */}
      <div className="hidden items-center gap-2 sm:flex">
        <SlidersHorizontal className="h-4 w-4 shrink-0 text-muted-foreground" />
        {filters.map((f) => (
          <Filter key={f.label} {...f} />
        ))}
      </div>
      {/* Mobile: horizontal scroll */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar sm:hidden">
        <SlidersHorizontal className="h-4 w-4 shrink-0 text-muted-foreground" />
        {filters.map((f) => (
          <Filter key={f.label} {...f} />
        ))}
      </div>
    </div>
  );
}
