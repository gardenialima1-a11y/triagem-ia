import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "Triagem IA — Talent Screening",
  description: "Triagem, análise e ranqueamento estratégico de currículos com IA",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <header className="border-b border-gray-200 bg-white">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-white font-bold text-sm">
                TI
              </div>
              <span className="font-semibold text-gray-900">Triagem IA</span>
              <span className="text-xs text-gray-400 hidden sm:inline">Talent Screening</span>
            </Link>
            <Link href="/vagas/nova" className="btn-primary text-sm">
              + Nova vaga
            </Link>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
