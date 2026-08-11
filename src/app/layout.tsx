import type { Metadata } from "next";
import "./globals.css";
import ParticleWaveBackground from "@/components/ParticleWaveBackground";
import ClientLayoutWrapper from "@/components/ClientLayoutWrapper";
import AdvancedWidget from "@/components/AdvancedWidget"; // Import globally
import { SpatialProvider } from "@/context/SpatialContext";
import { ThemeProvider } from "@/context/ThemeContext";

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
    <html lang="en" className="dark">
      <body className="antialiased min-h-screen bg-crm-base text-slate-100 relative overflow-x-hidden selection:bg-primary-cyan selection:text-slate-950">
        <ThemeProvider>
          <SpatialProvider>
            {/* Deep Sea Undulating Particle Wave Mesh Background */}
            <ParticleWaveBackground />

            {/* Client Wrapper handles Sidebar/Header vs Auth routes globally */}
            <div className="relative z-10 flex flex-col min-h-screen bg-transparent">
              <ClientLayoutWrapper>{children}</ClientLayoutWrapper>
            </div>

            {/* Global Draggable Advanced Orchestrator Hub Orb */}
            <AdvancedWidget />
          </SpatialProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
