'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import TravelFavicon from '@/components/icons/travel-favicon';
import { useAppContext } from '@/contexts/app-context'; // Import useAppContext
import { createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, UserCredential, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { GoogleIcon } from '@/components/icons/google-icon';
import { useEffect } from 'react'; // Import useEffect


const formSchema = z.object({
  // Updated name schema to be optional for Google Sign-In
  name: z.string().optional(),
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

// Rename SignupForm to default export for consistency with Next.js App Router pages
export default function SignupForm() {
  console.log('SignupForm component rendered');
  const router = useRouter();
  const { t } = useAppContext();
  const { toast } = useToast();
  // Get signInAnonymously, user, and loading from appContext
  const { signInAnonymously, user, loading: appLoading } = useAppContext();


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '', // Keep default value for email/password signup
      email: '',
      password: '',
    },
  });

  // Redirect if user is already logged in (anonymous or registered)
  useEffect(() => {
    if (user && !appLoading) {
      router.push('/'); // Redirect to dashboard
    }
  }, [user, appLoading, router]); // Added dependencies

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const userCredential: UserCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      // Update the user's profile to include the display name
      await updateProfile(userCredential.user, {
        displayName: values.name,
      });

      // Create a document in the 'users' collection with the user's UID as the document ID
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        name: values.name,
        email: values.email,
        themePreference: 'system', // Set default theme preference on creation
      });
      // Redirect is handled by the useEffect based on user state change
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('signupFailed'), // Assuming translated strings
        description: error.message || t('signupError'), // Assuming translated strings and error handling
      });
    }
  }

  async function handleGoogleSignIn() {
    console.log('handleGoogleSignIn called');
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider)

      const user = result.user; // The signed-in user info.

      console.log('After signInWithPopup. User:', user);

      // Update the user's profile to include the display name from Google if available and not already set
      if (user.displayName) {
        await updateProfile(user, { displayName: user.displayName });
      }

      console.log('After updateProfile.');

      // Create or update a document in the 'users' collection with the user's UID as the document ID
      await setDoc(doc(db, 'users', user.uid), {
        name: user.displayName || '', // Use displayName from Google, or empty string if null/undefined
        email: user.email || '', // Use email from Google, or empty string if null/undefined
        themePreference: 'system', // Set default theme preference on creation
      });

      console.log('After setDoc.');
      // Redirect is handled by the useEffect based on user state change
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Google Sign-In Failed',
        description: error.message, // This will catch errors during signInWithPopup
      });
    }
  }

   // Handle click for Anonymous Sign-In
  const handleAnonymousClick = () => {
    signInAnonymously();
    // Redirect is handled by the useEffect based on user state change
  };


  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 h-16 w-16">
          <TravelFavicon size={64} className="mr-2" />
        </div>
        <CardTitle className="font-headline text-2xl">{t('signupTitle')}</CardTitle>
        <CardDescription>{t('signupSubtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('signupName')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('signupNamePlaceholder')} {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('email')}</FormLabel>
                  <FormControl>
                    <Input placeholder="you@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('password')}</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting || appLoading}>
              {form.formState.isSubmitting ? 'Signing up...' : t('signup')}
            </Button>
          </form>
        </Form>
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              {t('signupContinue')}
            </span>
          </div>
        </div>
        <Button variant="outline" className="w-full" onClick={handleAnonymousClick} disabled={appLoading}>
          {t('signupAnonymously')}
        </Button>
        <Button variant="outline" className="w-full mt-2" onClick={handleGoogleSignIn} disabled={appLoading}>
          <GoogleIcon className="mr-2 h-4 w-4" />
          Google
        </Button>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t('haveAccount')}{' '}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            {t('login')}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
