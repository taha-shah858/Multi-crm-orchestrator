import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ParticleWaveBackground from "@/components/ParticleWaveBackground";
import AdvancedWidget from "@/components/AdvancedWidget"; // Import globally
import { SpatialProvider } from "@/context/SpatialContext";
import { ThemeProvider } from "@/context/ThemeContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Multi-CRM Orchestrator",
  description: "Next-gen glassmorphic sales execution engine",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="antialiased min-h-[100dvh] bg-crm-base text-crm-text relative overflow-x-hidden selection:bg-primary-cyan selection:text-slate-950 font-sans">
        <ThemeProvider>
          <SpatialProvider>
            {/* Ambient Base Noise Overlay for High-End Texture */}
            <div className="pointer-events-none fixed inset-0 z-0 h-full w-full opacity-[0.03] mix-blend-overlay" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")" }} />

            {/* Deep Sea Undulating Particle Wave Mesh Background */}
            <ParticleWaveBackground />

            {/* Route groups provide their own dashboard or auth shell. */}
            <div className="relative z-10 flex flex-col min-h-screen bg-transparent">
              {children}
            </div>

            {/* Global Draggable Advanced Orchestrator Hub Orb */}
            <AdvancedWidget />
          </SpatialProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
