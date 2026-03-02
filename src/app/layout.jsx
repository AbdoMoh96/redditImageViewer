import "./globals.css";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";

export const metadata = {
  title: "Reddit Image Viewer",
  description: "Browse subreddit images with a fast swiper UI.",
};

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${spaceGrotesk.variable} ${jetBrainsMono.variable} bg-slate-950 text-slate-100 font-[var(--font-space-grotesk)]`}
      >
        {children}
      </body>
    </html>
  );
}
