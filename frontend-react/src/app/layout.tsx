import type { Metadata } from "next";
import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google";
import { MotionProvider } from "@/lib/motion";
import { AuthProvider } from "@/providers/AuthProvider";
import { ToastProvider } from "@/providers/ToastProvider";
import "./globals.css";

/** Títulos: variable (wght 200–800, opsz, wdth) para animar el peso con font-variation-settings. */
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  axes: ["opsz"],
  display: "swap",
});

/** Texto: sans sobria, variable (wght 400–700). */
const instrument = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "INJUV — Voluntariado", template: "%s · INJUV Voluntariado" },
  description: "Plataforma de voluntariado del Instituto Nacional de la Juventud.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${bricolage.variable} ${instrument.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <MotionProvider>
          <AuthProvider>
            <ToastProvider>{children}</ToastProvider>
          </AuthProvider>
        </MotionProvider>
      </body>
    </html>
  );
}
