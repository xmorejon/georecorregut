'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Languages, LogOut, Settings, User, Sun } from 'lucide-react';
import { Logo } from '@/components/icons/logo';
import { useAppContext } from '@/contexts/app-context';
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { useTheme } from 'next-themes';
import type { Language } from '@/lib/types';
import { auth, deleteUser, deleteUserDocument } from '@/lib/firebase';
import { signOut, type User as FirebaseAuthUser } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { toast, useToast } from '@/hooks/use-toast';

export default function DashboardHeader() {
  const { isMobile } = useSidebar(); // Assuming useSidebar provides isMobile
  const { theme, setTheme } = useTheme(); // Get theme and setTheme from next-themes
  const { t, language, setLanguage, user, mode, setMode } = useAppContext();
  const router = useRouter();

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang as Language);
  };

  const handleDelUser = async () => {
    if (!user) return;
    try {
      await deleteUserDocument(user.uid); // Delete user document from Firestore
      await deleteUser(user);
      router.push('/login');
      toast({
        title: t('accountDeletedSuccess'),
        variant: "default"
      });
    } catch (error) {
        console.error("Deleting user failed", error);
      toast({
        title: t('accountDeletedError'),
        description:
          typeof error === 'object' && error !== null && 'message' in error
          ? (error as any).message // Explicitly cast to any to access message
          : 'An unknown error occurred',
        variant: "destructive"
      });
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const handleModeChange = (mode: string) => {
    setTheme(mode); // Use setTheme from next-themes
  };

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
      {isMobile && <SidebarTrigger />}
      <Link href="/" className="flex items-center gap-2">
        <Logo className="h-8 w-8" />
        <span className="hidden text-lg font-semibold md:block font-headline">{t('appName')}</span>
      </Link>
      <div className="ml-auto flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
              <Settings className="h-9 w-9" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>{user?.displayName && user?.email ? `${user.displayName} - ${user.email}` : user?.displayName || user?.email || 'My Account'}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Sun className="mr-2 h-4 w-4" />
                <span>{t('view')}</span>
                </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  <DropdownMenuRadioGroup value={mode} onValueChange={handleModeChange}>
                    <DropdownMenuRadioItem value="light">{t('light')}</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="dark">{t('dark')}</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Languages className="mr-2 h-4 w-4" />
                <span>{t('language')}</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  <DropdownMenuRadioGroup value={language} onValueChange={handleLanguageChange}>
                    <DropdownMenuRadioItem value="ca">{t('catalan')}</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="es">{t('spanish')}</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="en">{t('english')}</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
 <AlertDialog>
 <AlertDialogTrigger asChild>
 <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
 <User className="mr-2 h-4 w-4" />
 <span>{t('delprofile')}</span>
 </DropdownMenuItem>
 </AlertDialogTrigger>
 <AlertDialogContent>
 <AlertDialogHeader>
 <AlertDialogTitle>{t('confirmDelAccount')}</AlertDialogTitle>
 <AlertDialogDescription>
 {t('confirmDelAccountDesc')}
 </AlertDialogDescription>
 </AlertDialogHeader>
 <AlertDialogFooter>
 <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
 <AlertDialogAction onClick={handleDelUser}>{t('continue')}</AlertDialogAction>
 </AlertDialogFooter>
 </AlertDialogContent>
 </AlertDialog>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>{t('logout')}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
