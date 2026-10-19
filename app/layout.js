import './globals.css';
import { QueryProvider } from '@/app/components/providers/QueryProvider';
import { ToastProvider } from '@/app/components/providers/ToastProvider';
import { AuthProvider } from '@/app/components/providers/AuthProvider';

export const metadata = { title: 'ERP', description: 'Manufacturing ERP' };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>
          <ToastProvider>
            <AuthProvider>{children}</AuthProvider>
          </ToastProvider>
        </QueryProvider>
      </body>
    </html>
  );
}