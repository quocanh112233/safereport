import { Providers } from "./providers";
import './globals.css';

export const metadata = {
  title: "SafeReport — A safer place to speak",
  description: "Confidential incident reporting with Tide-protected identity and browser-side content encryption.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
