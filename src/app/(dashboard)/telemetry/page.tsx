"use client";

import { useState } from "react";
import {
  Activity,
  Printer,
  Search,
  Edit3,
  Check,
  X,
  BarChart3,
  Table as TableIcon,
  Calendar,
  DollarSign,
  Clock,
  Building2,
  TrendingUp,
  Box,
  ArrowUpRight,
  Sparkles,
  Zap,
} from "lucide-react";
import { MultiCrmCard, MultiCrmTag } from "@/components/ui/MultiCrmCard";

interface BrandPerformanceRecord {
  id: string;
  brand: string;
  assignedRep: string;
  hoursSpent: number;
  hourlyRate: number;
  expectedRevenue: number;
  receivedRevenue: number;
  expectedInstallations: number;
  receivedInstallations: number;
  upcomingInstallationsQ4: number; // Upcoming months forecast
  status: "Optimized" | "Margin Danger" | "Under-allocated";
}

const initialBrandData: BrandPerformanceRecord[] = [
  {
    id: "B-2026-01",
    brand: "Acme Corp",
    assignedRep: "Alex Mercer",
    hoursSpent: 42.5,
    hourlyRate: 120,
    expectedRevenue: 185000,
    receivedRevenue: 180000,
    expectedInstallations: 150,
    receivedInstallations: 142,
    upcomingInstallationsQ4: 210,
    status: "Optimized",
  },
  {
    id: "B-2026-02",
    brand: "Cyberdyne Systems",
    assignedRep: "Marcus Vance",
    hoursSpent: 85.0,
    hourlyRate: 140,
    expectedRevenue: 420000,
    receivedRevenue: 310000,
    expectedInstallations: 300,
    receivedInstallations: 210,
    upcomingInstallationsQ4: 450,
    status: "Margin Danger",
  },
  {
    id: "B-2026-03",
    brand: "Stark Tech",
    assignedRep: "Elena Rostova",
    hoursSpent: 18.0,
    hourlyRate: 110,
    expectedRevenue: 95000,
    receivedRevenue: 95000,
    expectedInstallations: 80,
    receivedInstallations: 80,
    upcomingInstallationsQ4: 130,
    status: "Optimized",
  },
  {
    id: "B-2026-04",
    brand: "Aperture Labs",
    assignedRep: "Sophia Chen",
    hoursSpent: 38.0,
    hourlyRate: 125,
    expectedRevenue: 110000,
    receivedRevenue: 64000,
    expectedInstallations: 110,
    receivedInstallations: 65,
    upcomingInstallationsQ4: 180,
    status: "Under-allocated",
  },
];

export default function BrandProfitabilityHub() {
  const [brands, setBrands] =
    useState<BrandPerformanceRecord[]>(initialBrandData);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"matrix" | "profitability">(
    "matrix"
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<BrandPerformanceRecord>>({});

  const filteredBrands = brands.filter(
    (b) =>
      b.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.assignedRep.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Aggregation Calculations
  const totalHours = filteredBrands.reduce((acc, b) => acc + b.hoursSpent, 0);
  const totalExpectedRev = filteredBrands.reduce(
    (acc, b) => acc + b.expectedRevenue,
    0
  );
  const totalReceivedRev = filteredBrands.reduce(
    (acc, b) => acc + b.receivedRevenue,
    0
  );
  const totalExpectedInst = filteredBrands.reduce(
    (acc, b) => acc + b.expectedInstallations,
    0
  );
  const totalReceivedInst = filteredBrands.reduce(
    (acc, b) => acc + b.receivedInstallations,
    0
  );
  const totalUpcomingInst = filteredBrands.reduce(
    (acc, b) => acc + b.upcomingInstallationsQ4,
    0
  );

  // Profitability metric: Effective Hourly Yield = Net Received Revenue / Hours Spent
  const calculatedBrands = filteredBrands.map((b) => {
    const laborCost = b.hoursSpent * b.hourlyRate;
    const netProfit = b.receivedRevenue - laborCost;
    const hourlyYield = b.hoursSpent > 0 ? netProfit / b.hoursSpent : 0;
    const revenueFulfillmentRate =
      b.expectedRevenue > 0
        ? Math.round((b.receivedRevenue / b.expectedRevenue) * 100)
        : 0;
    const installationFulfillmentRate =
      b.expectedInstallations > 0
        ? Math.round((b.receivedInstallations / b.expectedInstallations) * 100)
        : 0;

    return {
      ...b,
      laborCost,
      netProfit,
      hourlyYield,
      revenueFulfillmentRate,
      installationFulfillmentRate,
    };
  });

  // Most profitable brand determination
  const topProfitBrand = [...calculatedBrands].sort(
    (a, b) => b.hourlyYield - a.hourlyYield
  )[0];

  const handleStartEdit = (record: BrandPerformanceRecord) => {
    setEditingId(record.id);
    setEditForm(record);
  };

  const handleSaveEdit = (id: string) => {
    setBrands((prev) =>
      prev.map((item) =>
        item.id === id
          ? ({ ...item, ...editForm } as BrandPerformanceRecord)
          : item
      )
    );
    setEditingId(null);
  };

  return (
    <div className="space-y-6 text-crm-text font-sans print:p-0 print:bg-white print:text-black">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary-cyan" />
            <h1 className="text-2xl font-bold tracking-tight">
              Brand Profitability & Installation Intelligence
            </h1>
          </div>
          <p className="text-xs text-crm-text-muted font-mono mt-1">
            Real-time tracking for revenue realization, installation forecasts,
            agency labor hours, and yield efficiency.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-crm-inner p-1 rounded-xl border border-crm-border-strong font-mono text-xs">
            <button
              onClick={() => setViewMode("matrix")}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer ${
                viewMode === "matrix"
                  ? "bg-primary-cyan/20 text-primary-cyan font-bold border border-primary-cyan/30"
                  : "text-crm-text-muted"
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" /> Full Matrix
            </button>
            <button
              onClick={() => setViewMode("profitability")}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer ${
                viewMode === "profitability"
                  ? "bg-primary-cyan/20 text-primary-cyan font-bold border border-primary-cyan/30"
                  : "text-crm-text-muted"
              }`}
            >
              <Zap className="w-3.5 h-3.5" /> Yield Analysis
            </button>
          </div>
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 rounded-xl bg-crm-surface hover:bg-crm-inner border border-crm-border-strong text-xs font-mono text-crm-text-muted flex items-center gap-2"
          >
            <Printer className="w-3.5 h-3.5 text-secondary-pink" /> Print Audit
          </button>
        </div>
      </div>

      {/* Standout Insight Banner: Most Profitable Brand */}
      {topProfitBrand && (
        <MultiCrmCard className="p-4 bg-linear-to-r from-emerald-950/40 via-crm-surface to-slate-900 border-emerald-500/30 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider block">
                Top Performing Brand (Yield / Hour)
              </span>
              <h2 className="text-lg font-bold text-crm-text flex items-center gap-2">
                {topProfitBrand.brand}
                <span className="text-xs text-crm-text-muted font-normal">
                  ({topProfitBrand.assignedRep})
                </span>
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-6 font-mono text-xs">
            <div>
              <span className="text-crm-text-muted block text-[10px]">
                Effective Hourly Yield
              </span>
              <span className="text-emerald-400 font-bold text-sm">
                ${Math.round(topProfitBrand.hourlyYield).toLocaleString()}/hr
              </span>
            </div>
            <div>
              <span className="text-crm-text-muted block text-[10px]">
                Revenue Realization
              </span>
              <span className="text-primary-cyan font-bold text-sm">
                {topProfitBrand.revenueFulfillmentRate}%
              </span>
            </div>
            <div>
              <span className="text-crm-text-muted block text-[10px]">
                Upcoming Installations
              </span>
              <span className="text-purple-300 font-bold text-sm">
                +{topProfitBrand.upcomingInstallationsQ4} units
              </span>
            </div>
          </div>
        </MultiCrmCard>
      )}

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MultiCrmCard className="p-4 space-y-2">
          <span className="text-[11px] font-mono text-crm-text-muted flex items-center justify-between">
            Expected vs Received Revenue
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </span>
          <div className="text-lg font-bold font-mono text-crm-text">
            ${totalReceivedRev.toLocaleString()}{" "}
            <span className="text-xs font-normal text-slate-500">
              / ${totalExpectedRev.toLocaleString()}
            </span>
          </div>
          <span className="text-[10px] font-mono text-emerald-400">
            {totalExpectedRev > 0
              ? Math.round((totalReceivedRev / totalExpectedRev) * 100)
              : 0}
            % Realized
          </span>
        </MultiCrmCard>

        <MultiCrmCard className="p-4 space-y-2">
          <span className="text-[11px] font-mono text-crm-text-muted flex items-center justify-between">
            Received vs Expected Installs
            <Box className="w-4 h-4 text-primary-cyan" />
          </span>
          <div className="text-lg font-bold font-mono text-primary-cyan">
            {totalReceivedInst}{" "}
            <span className="text-xs font-normal text-slate-500">
              / {totalExpectedInst} units
            </span>
          </div>
          <span className="text-[10px] font-mono text-crm-text-muted">
            {totalExpectedInst > 0
              ? Math.round((totalReceivedInst / totalExpectedInst) * 100)
              : 0}
            % Target Complete
          </span>
        </MultiCrmCard>

        <MultiCrmCard className="p-4 space-y-2">
          <span className="text-[11px] font-mono text-crm-text-muted flex items-center justify-between">
            Upcoming Month Projections
            <TrendingUp className="w-4 h-4 text-purple-400" />
          </span>
          <div className="text-lg font-bold font-mono text-purple-300">
            +{totalUpcomingInst} units
          </div>
          <span className="text-[10px] font-mono text-purple-400">
            Pipeline installation forecast
          </span>
        </MultiCrmCard>

        <MultiCrmCard className="p-4 space-y-2">
          <span className="text-[11px] font-mono text-crm-text-muted flex items-center justify-between">
            Total Agency Labor
            <Clock className="w-4 h-4 text-secondary-pink" />
          </span>
          <div className="text-lg font-bold font-mono text-secondary-pink">
            {totalHours} hrs logged
          </div>
          <span className="text-[10px] font-mono text-crm-text-muted">
            Multi-brand team allocation
          </span>
        </MultiCrmCard>
      </div>

      {/* MATRIX VIEW */}
      {viewMode === "matrix" && (
        <MultiCrmCard className="overflow-hidden p-0">
          <div className="p-4 bg-crm-inner border-b border-crm-border-strong flex items-center justify-between font-mono text-xs">
            <span className="text-crm-text-muted font-bold flex items-center gap-2">
              <TableIcon className="w-4 h-4 text-primary-cyan" /> Brand Revenue,
              Installation & Time Audit
            </span>
            <div className="relative w-48">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-crm-surface border border-crm-border-strong rounded-lg pl-8 pr-2 py-1 text-[11px] text-crm-text"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="bg-crm-surface/80 text-crm-text-muted text-[11px] border-b border-crm-border-strong">
                  <th className="p-3 pl-4">Brand & Lead Rep</th>
                  <th className="p-3 text-right">Hours</th>
                  <th className="p-3 text-right">Expected Revenue</th>
                  <th className="p-3 text-right">Received Revenue</th>
                  <th className="p-3 text-right">Expected Installs</th>
                  <th className="p-3 text-right">Received Installs</th>
                  <th className="p-3 text-right text-purple-300">
                    Upcoming Forecast
                  </th>
                  <th className="p-3 text-right">Hourly Yield</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {calculatedBrands.map((b) => {
                  const isEditing = editingId === b.id;

                  return (
                    <tr
                      key={b.id}
                      className="hover:bg-white/5 transition-colors text-[11px]"
                    >
                      <td className="p-3 pl-4">
                        <span className="font-bold text-crm-text block">
                          {b.brand}
                        </span>
                        <span className="text-[10px] text-crm-text-muted">
                          {b.assignedRep}
                        </span>
                      </td>

                      {/* Hours */}
                      <td className="p-3 text-right text-primary-cyan font-bold">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editForm.hoursSpent || 0}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                hoursSpent: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-16 bg-black border border-primary-cyan/50 rounded p-1 text-right"
                          />
                        ) : (
                          `${b.hoursSpent}h`
                        )}
                      </td>

                      {/* Expected Revenue */}
                      <td className="p-3 text-right text-crm-text-muted">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editForm.expectedRevenue || 0}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                expectedRevenue:
                                  parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-20 bg-black border border-primary-cyan/50 rounded p-1 text-right"
                          />
                        ) : (
                          `$${b.expectedRevenue.toLocaleString()}`
                        )}
                      </td>

                      {/* Received Revenue */}
                      <td className="p-3 text-right font-bold text-emerald-400">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editForm.receivedRevenue || 0}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                receivedRevenue:
                                  parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-20 bg-black border border-primary-cyan/50 rounded p-1 text-right"
                          />
                        ) : (
                          `$${b.receivedRevenue.toLocaleString()}`
                        )}
                      </td>

                      {/* Expected Installs */}
                      <td className="p-3 text-right text-crm-text-muted">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editForm.expectedInstallations || 0}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                expectedInstallations:
                                  parseInt(e.target.value) || 0,
                              })
                            }
                            className="w-16 bg-black border border-primary-cyan/50 rounded p-1 text-right"
                          />
                        ) : (
                          b.expectedInstallations
                        )}
                      </td>

                      {/* Received Installs */}
                      <td className="p-3 text-right font-bold text-crm-text">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editForm.receivedInstallations || 0}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                receivedInstallations:
                                  parseInt(e.target.value) || 0,
                              })
                            }
                            className="w-16 bg-black border border-primary-cyan/50 rounded p-1 text-right"
                          />
                        ) : (
                          b.receivedInstallations
                        )}
                      </td>

                      {/* Upcoming Forecast */}
                      <td className="p-3 text-right font-bold text-purple-300">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editForm.upcomingInstallationsQ4 || 0}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                upcomingInstallationsQ4:
                                  parseInt(e.target.value) || 0,
                              })
                            }
                            className="w-16 bg-black border border-primary-cyan/50 rounded p-1 text-right"
                          />
                        ) : (
                          `+${b.upcomingInstallationsQ4}`
                        )}
                      </td>

                      {/* Hourly Yield */}
                      <td className="p-3 text-right font-bold text-emerald-300">
                        ${Math.round(b.hourlyYield).toLocaleString()}/h
                      </td>

                      {/* Status */}
                      <td className="p-3 text-center">
                        <MultiCrmTag
                          variant={
                            b.status === "Optimized"
                              ? "cyan"
                              : b.status === "Margin Danger"
                              ? "magenta"
                              : "purple"
                          }
                        >
                          {b.status}
                        </MultiCrmTag>
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleSaveEdit(b.id)}
                              className="p-1 text-emerald-400 hover:bg-emerald-500/20 rounded"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1 text-rose-400 hover:bg-rose-500/20 rounded"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleStartEdit(b)}
                            className="p-1 text-crm-text-muted hover:text-primary-cyan"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </MultiCrmCard>
      )}

      {/* YIELD ANALYSIS VIEW */}
      {viewMode === "profitability" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-mono text-xs">
          {/* Brand Hourly Profitability Ranking */}
          <MultiCrmCard className="p-6 space-y-4">
            <h3 className="text-sm font-bold text-crm-text flex items-center gap-2 border-b border-crm-border-strong pb-3">
              <Zap className="w-4 h-4 text-emerald-400" /> Brand Profitability
              Ranking ($ Net Yield / Hour)
            </h3>

            <div className="space-y-4">
              {[...calculatedBrands]
                .sort((a, b) => b.hourlyYield - a.hourlyYield)
                .map((b, rank) => (
                  <div
                    key={b.id}
                    className="p-3 bg-crm-inner rounded-xl border border-crm-border space-y-2"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-crm-text">
                        #{rank + 1} {b.brand}
                      </span>
                      <span className="text-emerald-400 font-bold">
                        ${Math.round(b.hourlyYield).toLocaleString()} / hour
                      </span>
                    </div>
                    <div className="flex justify-between text-[10px] text-crm-text-muted">
                      <span>Hours Logged: {b.hoursSpent}h</span>
                      <span>Net Profit: ${b.netProfit.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
            </div>
          </MultiCrmCard>

          {/* Installation Velocity & Upcoming Pipeline */}
          <MultiCrmCard className="p-6 space-y-4">
            <h3 className="text-sm font-bold text-crm-text flex items-center gap-2 border-b border-crm-border-strong pb-3">
              <Box className="w-4 h-4 text-primary-cyan" /> Installation
              Fulfillment vs. Upcoming Growth
            </h3>

            <div className="space-y-4">
              {calculatedBrands.map((b) => (
                <div key={b.id} className="space-y-1.5">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-crm-text">{b.brand}</span>
                    <span className="text-crm-text-muted">
                      {b.receivedInstallations} / {b.expectedInstallations}{" "}
                      Completed (
                      <span className="text-purple-300">
                        +{b.upcomingInstallationsQ4} Pipeline
                      </span>
                      )
                    </span>
                  </div>
                  <div className="w-full bg-crm-inner h-2.5 rounded-full overflow-hidden border border-crm-border">
                    <div
                      style={{
                        width: `${Math.min(
                          b.installationFulfillmentRate,
                          100
                        )}%`,
                      }}
                      className="h-full bg-primary-cyan"
                    />
                  </div>
                </div>
              ))}
            </div>
          </MultiCrmCard>
        </div>
      )}
    </div>
  );
}
