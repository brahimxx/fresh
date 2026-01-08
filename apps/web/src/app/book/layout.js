import { Geist } from 'next/font/google';
import '../globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

export const metadata = {
  title: 'Book Appointment',
  description: 'Book your appointment online',
};

export default function BookingLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} antialiased bg-gray-50 min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
