import LoginForm from '@/components/auth/login-form'; // Import as a default export
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login | GeoRecorregut',
  description: 'Login to your GeoRecorregut account',
};

export default function LoginPage() {
  return <LoginForm />;
}