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
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
          {title}
        </span>
        <div className="p-2 rounded-xl bg-primary-cyan/10 border border-primary-cyan/20 text-primary-cyan">
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="mt-4 flex items-baseline justify-between">
        <h3 className="text-2xl font-bold text-slate-100 font-mono tracking-tight">
          {value}
        </h3>
        <span
          className={`text-xs font-mono px-2 py-0.5 rounded-full border ${
            isPositive
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              : "bg-rose-500/10 text-rose-400 border-rose-500/20"
          }`}
        >
          {change}
        </span>
      </div>
    </GlassCard>
  );
}
