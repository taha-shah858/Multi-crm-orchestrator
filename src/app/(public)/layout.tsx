import Link from "next/link";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-white text-slate-900">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:block focus:p-4">Skip to content</a>
      <header className="border-b border-slate-200">
        <nav aria-label="Main navigation" className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-6">
          <Link href="/home" className="text-lg font-semibold tracking-tight">MultiCRM Orchestrator</Link>
          <div className="flex items-center gap-5 text-sm">
            <Link href="/privacy" className="underline-offset-4 hover:underline">Privacy</Link>
            <Link href="/login" className="rounded-lg bg-blue-700 px-4 py-2.5 font-medium text-white hover:bg-blue-800">Sign in</Link>
          </div>
        </nav>
      </header>
      <main id="main-content">{children}</main>
      <footer className="border-t border-slate-200">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-4 px-6 py-8 text-sm text-slate-600">
          <span>MultiCRM Orchestrator</span>
          <div className="flex flex-wrap gap-6">
            <Link href="/privacy" className="underline underline-offset-4">Privacy policy</Link>
            <a href="mailto:shahtaha111@gmail.com" className="underline underline-offset-4">Contact support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
