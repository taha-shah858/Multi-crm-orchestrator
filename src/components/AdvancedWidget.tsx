"use client";

import { useState, useRef, useEffect } from "react";
import {
  Sliders,
  Palette,
  Sparkles,
  Monitor,
  Check,
  RefreshCw,
  X,
  ArrowLeft,
  ChevronRight,
  Activity,
  KeyRound,
  ShieldCheck,
  Layers,
} from "lucide-react";
import GlassCard from "@/components/GlassCard";
import { useTheme } from "@/context/ThemeContext";

type MainView = "home" | "themes" | "telemetry" | "api" | "security" | "fx";
type ThemeSubView = "menu" | "default" | "presets" | "custom-user";

export default function AdvancedWidget() {
  const { currentTheme, setTheme, presets, colors, updateColor } = useTheme();

  const [isOpen, setIsOpen] = useState(false);
  const [currentView, setCurrentView] = useState<MainView>("home");
  const [themeSubView, setThemeSubView] = useState<ThemeSubView>("menu");
  const [particleDensity, setParticleDensity] = useState<string>("Balanced");

  // Draggable position state
  const [position, setPosition] = useState({ x: 800, y: 600 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    posX: number;
    posY: number;
    hasMoved: boolean;
  }>({
    startX: 0,
    startY: 0,
    posX: 0,
    posY: 0,
    hasMoved: false,
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPosition({
        x: window.innerWidth - 90,
        y: window.innerHeight - 100,
      });
    }
  }, []);

  // Broadcast particle density changes to the background canvas component
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("particle-density-change", { detail: particleDensity })
      );
    }
  }, [particleDensity]);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: position.x,
      posY: position.y,
      hasMoved: false,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      dragRef.current.hasMoved = true;
    }

    setPosition({
      x: Math.max(
        30,
        Math.min(window.innerWidth - 80, dragRef.current.posX + dx)
      ),
      y: Math.max(
        30,
        Math.min(window.innerHeight - 80, dragRef.current.posY + dy)
      ),
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);

    if (!dragRef.current.hasMoved) {
      setIsOpen((prev) => !prev);
    }

    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const activePreset = presets[currentTheme] || presets["obsidian"];

  const handleBack = () => {
    if (currentView === "themes") {
      if (themeSubView !== "menu") {
        setThemeSubView("menu");
      } else {
        setCurrentView("home");
      }
    } else {
      setCurrentView("home");
    }
  };

  return (
    <>
      {/* Floating Draggable Circular Trigger Orb */}
      <div
        style={{ left: `${position.x}px`, top: `${position.y}px` }}
        className="fixed z-50 touch-none select-none cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div
          style={{
            borderColor: `${colors.primaryCyan}66`,
            backgroundColor: colors.crmSurface,
          }}
          className={`relative group flex items-center justify-center w-14 h-14 rounded-full border shadow-2xl backdrop-blur-xl transition-all duration-200 hover:scale-105 ${
            isOpen ? "scale-105" : ""
          }`}
          title="Drag to reposition • Click to open Hub"
        >
          <div
            className="absolute inset-0 rounded-full animate-ping pointer-events-none opacity-20"
            style={{ backgroundColor: colors.primaryCyan }}
          />

          {isOpen ? (
            <X className="w-5 h-5" style={{ color: colors.primaryCyan }} />
          ) : (
            <div className="relative flex items-center justify-center">
              <Sliders
                className="w-5 h-5 transition-transform group-hover:rotate-45"
                style={{ color: colors.primaryCyan }}
              />
              <span
                className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-slate-950 animate-pulse"
                style={{ backgroundColor: colors.primaryCyan }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Expanded Floating Modal Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-2xl">
            <GlassCard
              className="space-y-6 relative overflow-hidden shadow-2xl border"
              style={{ borderColor: `${colors.primaryCyan}40` }}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                <div className="flex items-center gap-3">
                  {currentView !== "home" && (
                    <button
                      onClick={handleBack}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-all cursor-pointer"
                      title="Go Back"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                  )}
                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 shadow-inner">
                    <Sliders
                      className="w-4 h-4"
                      style={{ color: colors.primaryCyan }}
                    />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-slate-200 tracking-wide uppercase font-mono">
                      Advanced Orchestrator Control Hub
                    </h3>
                    <p className="text-[10px] font-mono text-slate-400">
                      Modular UI Engine • Active Theme:{" "}
                      <span style={{ color: colors.primaryCyan }}>
                        {activePreset?.label || currentTheme}
                      </span>
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* DYNAMIC VIEWS */}
              <div className="min-h-70">
                {/* 1. HOME / MAIN MENU VIEW */}
                {currentView === "home" && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                        Select Control Module
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        System Online
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5">
                      {[
                        {
                          id: "themes",
                          title: "Theme & UI Customization",
                          desc: "Configure default, pre-designed, and custom user color palettes.",
                          icon: Palette,
                        },
                        {
                          id: "telemetry",
                          title: "Telemetry & Diagnostics",
                          desc: "Monitor live CRM bridge latency, sync errors, and throughput rates.",
                          icon: Activity,
                        },
                        {
                          id: "api",
                          title: "API Gateway Configuration",
                          desc: "Manage Salesforce, HubSpot, and Zoho OAuth tokens and webhooks.",
                          icon: KeyRound,
                        },
                        {
                          id: "security",
                          title: "Security & Audit Logs",
                          desc: "Inspect collision resolution logs and bi-directional deduplication history.",
                          icon: ShieldCheck,
                        },
                        {
                          id: "fx",
                          title: "Particle FX Engine",
                          desc: "Control dynamic background canvas effects and matrix particle density.",
                          icon: Sparkles,
                        },
                      ].map((item) => {
                        const IconComponent = item.icon;
                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              setCurrentView(item.id as MainView);
                              if (item.id === "themes") setThemeSubView("menu");
                            }}
                            className="w-full p-3.5 rounded-xl bg-slate-950/60 hover:bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all flex items-center justify-between group cursor-pointer shadow-inner text-left"
                          >
                            <div className="flex items-center gap-3.5">
                              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 group-hover:scale-105 transition-transform">
                                <IconComponent
                                  className="w-4 h-4"
                                  style={{ color: colors.primaryCyan }}
                                />
                              </div>
                              <div>
                                <h4 className="text-xs font-semibold text-slate-200 group-hover:text-slate-100 transition-colors">
                                  {item.title}
                                </h4>
                                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                                  {item.desc}
                                </p>
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors shrink-0" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. THEME & UI CUSTOMIZATION SUB-MENU */}
                {currentView === "themes" && themeSubView === "menu" && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="text-xs font-mono text-slate-300">
                      Select Theme Customization Tier
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {[
                        {
                          id: "default",
                          title: "Default System Theme",
                          desc: "Obsidian Factory core layout with standard slate and cyan styling.",
                          icon: Layers,
                        },
                        {
                          id: "presets",
                          title: "Custom Pre-designed Themes",
                          desc: "Select from curated high-performance themes like Matrix Terminal and Solar Plasma.",
                          icon: Palette,
                        },
                        {
                          id: "custom-user",
                          title: "User-Defined Custom Theme",
                          desc: "Configure live color overrides, accent hex codes, and surface opacities.",
                          icon: Sliders,
                        },
                      ].map((sub) => {
                        const SubIcon = sub.icon;
                        return (
                          <button
                            key={sub.id}
                            onClick={() =>
                              setThemeSubView(sub.id as ThemeSubView)
                            }
                            className="w-full p-4 rounded-xl bg-slate-950/60 hover:bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all flex items-center justify-between group cursor-pointer shadow-inner text-left"
                          >
                            <div className="flex items-center gap-3.5">
                              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                                <SubIcon
                                  className="w-4 h-4"
                                  style={{ color: colors.primaryCyan }}
                                />
                              </div>
                              <div>
                                <h4 className="text-xs font-semibold text-slate-200 group-hover:text-slate-100 transition-colors">
                                  {sub.title}
                                </h4>
                                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                                  {sub.desc}
                                </p>
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Theme Sub-View: Default System Theme */}
                {currentView === "themes" && themeSubView === "default" && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-slate-300">
                        Default System Theme Configuration
                      </span>
                      <span
                        className="text-[10px] font-mono px-2 py-0.5 rounded border"
                        style={{
                          borderColor: `${colors.primaryCyan}40`,
                          color: colors.primaryCyan,
                        }}
                      >
                        Active Tier
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-semibold text-slate-100 font-mono">
                            Obsidian Factory (Standard)
                          </h4>
                          <p className="text-[11px] text-slate-400 font-mono">
                            The baseline high-contrast enterprise design layout.
                          </p>
                        </div>
                        <button
                          onClick={() => setTheme("obsidian")}
                          className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                            currentTheme === "obsidian"
                              ? "font-bold"
                              : "bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700"
                          }`}
                          style={{
                            backgroundColor:
                              currentTheme === "obsidian"
                                ? colors.primaryCyan
                                : undefined,
                            color:
                              currentTheme === "obsidian"
                                ? "#020617"
                                : undefined,
                          }}
                        >
                          {currentTheme === "obsidian"
                            ? "Applied"
                            : "Apply Default"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Theme Sub-View: Custom Pre-designed Themes */}
                {currentView === "themes" && themeSubView === "presets" && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-slate-300">
                        Select Global CRM Theme Presets
                      </span>
                      <span
                        className="text-[10px] font-mono"
                        style={{ color: colors.primaryCyan }}
                      >
                        Instant Global Apply
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {Object.entries(presets).map(([key, preset]) => {
                        const isSelected = currentTheme === key;
                        return (
                          <div
                            key={key}
                            onClick={() => setTheme(key)}
                            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                              isSelected
                                ? "bg-slate-900/90 shadow-lg"
                                : "bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/40"
                            }`}
                            style={{
                              borderColor: isSelected
                                ? preset.colors.primaryCyan
                                : undefined,
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-slate-200 font-mono">
                                {preset.label}
                              </span>
                              {isSelected && (
                                <span
                                  className="p-1 rounded-full bg-slate-800"
                                  style={{ color: preset.colors.primaryCyan }}
                                >
                                  <Check className="w-3 h-3" />
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 pt-1">
                              <span
                                className="w-4 h-4 rounded-full border border-slate-700"
                                style={{
                                  backgroundColor: preset.colors.crmBase,
                                }}
                              />
                              <span
                                className="w-4 h-4 rounded-full border border-slate-700"
                                style={{
                                  backgroundColor: preset.colors.primaryCyan,
                                }}
                              />
                              <span
                                className="w-4 h-4 rounded-full border border-slate-700"
                                style={{
                                  backgroundColor: preset.colors.secondaryPink,
                                }}
                              />
                              <span
                                className="w-4 h-4 rounded-full border border-slate-700"
                                style={{
                                  backgroundColor: preset.colors.tertiaryPurple,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Theme Sub-View: User Defined Custom Theme */}
                {currentView === "themes" && themeSubView === "custom-user" && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-slate-300">
                        Custom User Theme Overrides
                      </span>
                      <span
                        className="text-[10px] font-mono px-2 py-0.5 rounded border"
                        style={{
                          borderColor: `${colors.secondaryPink}40`,
                          color: colors.secondaryPink,
                        }}
                      >
                        Advanced
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
                      <div className="space-y-1">
                        <label className="text-[11px] font-mono text-slate-400 flex justify-between">
                          <span>Primary Cyan / Accent</span>
                          <span
                            className="font-mono"
                            style={{ color: colors.primaryCyan }}
                          >
                            {colors.primaryCyan}
                          </span>
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={colors.primaryCyan}
                            onChange={(e) =>
                              updateColor("primaryCyan", e.target.value)
                            }
                            className="w-10 h-8 bg-slate-900 border border-slate-700 rounded cursor-pointer"
                          />
                          <input
                            type="text"
                            value={colors.primaryCyan}
                            onChange={(e) =>
                              updateColor("primaryCyan", e.target.value)
                            }
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs font-mono text-slate-200"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-mono text-slate-400 flex justify-between">
                          <span>Secondary Pink / Accent</span>
                          <span
                            className="font-mono"
                            style={{ color: colors.secondaryPink }}
                          >
                            {colors.secondaryPink}
                          </span>
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={colors.secondaryPink}
                            onChange={(e) =>
                              updateColor("secondaryPink", e.target.value)
                            }
                            className="w-10 h-8 bg-slate-900 border border-slate-700 rounded cursor-pointer"
                          />
                          <input
                            type="text"
                            value={colors.secondaryPink}
                            onChange={(e) =>
                              updateColor("secondaryPink", e.target.value)
                            }
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs font-mono text-slate-200"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-mono text-slate-400 flex justify-between">
                          <span>Card Surface Color</span>
                          <span className="font-mono text-slate-300">
                            {colors.crmCard}
                          </span>
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={colors.crmCard}
                            onChange={(e) =>
                              updateColor("crmCard", e.target.value)
                            }
                            className="w-10 h-8 bg-slate-900 border border-slate-700 rounded cursor-pointer"
                          />
                          <input
                            type="text"
                            value={colors.crmCard}
                            onChange={(e) =>
                              updateColor("crmCard", e.target.value)
                            }
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs font-mono text-slate-200"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-mono text-slate-400 flex justify-between">
                          <span>Base Background Color</span>
                          <span className="font-mono text-slate-300">
                            {colors.crmBase}
                          </span>
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={colors.crmBase}
                            onChange={(e) =>
                              updateColor("crmBase", e.target.value)
                            }
                            className="w-10 h-8 bg-slate-900 border border-slate-700 rounded cursor-pointer"
                          />
                          <input
                            type="text"
                            value={colors.crmBase}
                            onChange={(e) =>
                              updateColor("crmBase", e.target.value)
                            }
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs font-mono text-slate-200"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. PLACEHOLDER VIEWS FOR OTHER MODULES */}
                {currentView === "telemetry" && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <h3 className="text-xs font-semibold text-slate-200 font-mono uppercase tracking-wider">
                      Telemetry & Bridge Diagnostics
                    </h3>
                    <p className="text-xs text-slate-400 font-mono bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
                      Live WebSocket and CRM sync diagnostics dashboard
                      placeholder.
                    </p>
                  </div>
                )}

                {currentView === "api" && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <h3 className="text-xs font-semibold text-slate-200 font-mono uppercase tracking-wider">
                      API Gateway & OAuth Vault
                    </h3>
                    <p className="text-xs text-slate-400 font-mono bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
                      Manage secure connector credentials and webhook secret
                      keys placeholder.
                    </p>
                  </div>
                )}

                {currentView === "security" && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <h3 className="text-xs font-semibold text-slate-200 font-mono uppercase tracking-wider">
                      Security & Collision Audit Logs
                    </h3>
                    <p className="text-xs text-slate-400 font-mono bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
                      View bi-directional deduplication records and security
                      event audit trails placeholder.
                    </p>
                  </div>
                )}

                {currentView === "fx" && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="text-xs font-mono text-slate-300">
                      3D Particle Mesh Background Density Controls
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      {["Low", "Balanced", "Ultra"].map((density) => (
                        <button
                          key={density}
                          onClick={() => setParticleDensity(density)}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            particleDensity === density
                              ? "bg-slate-950 shadow-inner"
                              : "bg-slate-950/60 border-slate-800/80 text-slate-400 hover:border-slate-700"
                          }`}
                          style={{
                            borderColor:
                              particleDensity === density
                                ? colors.primaryCyan
                                : undefined,
                          }}
                        >
                          <Monitor
                            className="w-4 h-4 mb-2"
                            style={{ color: colors.primaryCyan }}
                          />
                          <p className="text-xs font-semibold text-slate-200 font-mono">
                            {density}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-800/80">
                <button
                  onClick={() => {
                    setTheme("obsidian");
                    setParticleDensity("Balanced");
                    setCurrentView("home");
                    setThemeSubView("menu");
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer shadow-inner"
                >
                  <RefreshCw
                    className="w-3 h-3"
                    style={{ color: colors.primaryCyan }}
                  />
                  Reset Defaults
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-1.5 rounded-xl border text-xs font-mono transition-all cursor-pointer"
                  style={{
                    backgroundColor: `${colors.primaryCyan}20`,
                    borderColor: `${colors.primaryCyan}40`,
                    color: colors.primaryCyan,
                  }}
                >
                  Close Hub
                </button>
              </div>
            </GlassCard>
          </div>
        </div>
      )}
    </>
  );
}
