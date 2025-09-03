'use client';

import { useState, useEffect } from 'react'; // Import useEffect
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { GoogleIcon } from '@/components/icons/google-icon'; // Assuming GoogleIcon is in this path
import TravelFavicon from '@/components/icons/travel-favicon'; // Assuming TravelFavicon is in this path
import { useAppContext } from '@/contexts/app-context'; // Import useAppContext

const formSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

// Rename LoginForm to default export for consistency with Next.js App Router pages
export default function LoginForm() {
  const router = useRouter();
  const { t } = useAppContext();
  const { toast } = useToast();
  // Get signInAnonymously, user, and loading from appContext
  const { signInAnonymously, user, loading: appLoading } = useAppContext();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
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
      await signInWithEmailAndPassword(auth, values.email, values.password);
      toast({
        title: t('loginSuccessful'), // Assuming translated strings
        description: t('welcomeBack'), // Assuming translated strings
      });
      // Redirect is handled by the useEffect based on user state change
    } catch (error: any) {
      console.error('Login error:', error);
      toast({
        variant: 'destructive',
        title: t('loginFailed'), // Assuming translated strings
        description: error.message || t('loginError'), // Assuming translated strings and error handling
      });
    }
  }

  // Existing Google Sign-In logic
  async function handleGoogleSignIn() {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Update user profile (optional, depending on whether you want to set the display name)
      if (user.displayName) {
        await updateProfile(user, {
          displayName: user.displayName
        });
      }

      // Save user data to Firestore
      await setDoc(doc(db, "users", user.uid), {
        name: user.displayName,
        email: user.email,
      });
      // Redirect is handled by the useEffect based on user state change
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Google Sign-In Failed',
        description: error.
message,
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
        <CardTitle className="font-headline text-2xl">{t('loginTitle')}</CardTitle>
        <CardDescription>{t('loginSubtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
              {form.formState.isSubmitting ? 'Logging in...' : t('login')}
            </Button>
          </form>
        </Form>
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t"
 />
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

        {/* Keep or remove Google Sign-In button based on your needs */}
        <Button variant="outline" className="w-full mt-2" onClick={handleGoogleSignIn} disabled={appLoading}>
           <GoogleIcon className="mr-2 h-4 w-4" />
           Google
         </Button>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t('noAccount')}{' '}
          <Link href="/signup" className="font-semibold text-primary hover:underline">
            {t('signup')}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
