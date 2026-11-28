import { Inter, Sora, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import CursorFx from "@/components/ui/CursorFx";
import Spotlight from "@/components/ui/Spotlight";
import { ToastProvider } from "@/components/ui/Toast";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const sora = Sora({ subsets: ["latin"], variable: "--font-sora", display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });

export const metadata = {
  title: {
    default: "KIPS Campus Event Hub · KIPS College",
    template: "%s · KIPS Campus Event Hub",
  },
  description:
    "The official KIPS College campus platform — discover events, join societies, apply to recruitment drives, compete, chat with your team and collect verified certificates.",
  keywords: ["KIPS College", "campus events", "societies", "competitions", "certificates", "student portal"],
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/kips%20logo.png", type: "image/png", sizes: "447x447" },
    ],
    apple: [{ url: "/kips%20logo.png", sizes: "447x447" }],
  },
};

export const viewport = {
  themeColor: "#fbf9ff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${sora.variable} ${jetbrains.variable}`}>
      <body className="min-h-screen bg-ivory text-ink antialiased">
        <ToastProvider>
          <div className="aurora" aria-hidden="true">
            <span className="left-[-12%] top-[-10%] h-[420px] w-[420px] bg-[#c4b5fd]" />
            <span className="right-[-8%] top-[8%] h-[360px] w-[360px] bg-[#bfdbfe] [animation-delay:-6s]" />
            <span className="bottom-[-16%] left-[22%] h-[460px] w-[460px] bg-[#ddd6fe] [animation-delay:-11s]" />
          </div>
          <CursorFx />
          <Spotlight />
          <div className="relative z-10">{children}</div>
        </ToastProvider>
      </body>
    </html>
  );
}
