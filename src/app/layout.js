import "./globals.css";

export const metadata = {
  title: "BizBill Manager",
  description: "Manage your business invoices easily",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
