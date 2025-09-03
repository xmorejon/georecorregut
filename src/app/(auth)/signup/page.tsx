import SignupForm from '@/components/auth/signup-form'; // Import as a default export
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign Up | GeoRecorregut',
  description: 'Create a new GeoRecorregut account',
};

export default function SignupPage() {
  return <SignupForm />;
}