import React from "react";
import GlassCard from "@/components/GlassCard";
import { LucideIcon } from "lucide-react";

interface MetricWidgetProps {
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
  icon: LucideIcon;
}

export default function MetricWidget({
  title,
  value,
  change,
  isPositive,
  icon: Icon,
}: MetricWidgetProps) {
  return (
    <GlassCard className="p-5 flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </span>
        <div className="p-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-600">
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="mt-4 flex items-baseline justify-between">
        <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight font-sans">
          {value}
        </h3>
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-md border font-sans ${
            isPositive
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-rose-50 text-rose-700 border-rose-200"
          }`}
        >
          {change}
        </span>
      </div>
    </GlassCard>
  );
}
