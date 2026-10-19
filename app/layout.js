import './globals.css';
import { QueryProvider } from '@/app/components/providers/QueryProvider';
import { AuthProvider } from '@/app/components/providers/AuthProvider';

export const metadata = { title: 'ERP', description: 'Manufacturing ERP' };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>
          <AuthProvider>{children}</AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}