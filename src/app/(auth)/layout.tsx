export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative z-10 w-full min-h-screen flex flex-col items-center justify-center bg-transparent">
      {children}
    </main>
  );
}
