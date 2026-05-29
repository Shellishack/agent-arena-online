import "./styles.css";

export const metadata = {
  title: "Agent Arena Online",
  description: "Real-time monitor for agent arena sessions"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
