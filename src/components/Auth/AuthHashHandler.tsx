"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseUserClient } from '@/supabase-clients/user/createSupabaseUserClient';

/**
 * This component handles Supabase auth tokens that come in the URL hash.
 * 
 * When Supabase generates a magic link, it redirects to:
 * https://yoursite.com/#access_token=...&refresh_token=...&type=magiclink
 * 
 * The Supabase client auto-detects these on page load and sets up the session.
 * This component then redirects authenticated users to the dashboard.
 */
export function AuthHashHandler() {
  const router = useRouter();

  useEffect(() => {
    // Check if there are auth tokens in the URL hash
    if (typeof window === 'undefined') return;
    
    const hash = window.location.hash;
    
    // Check for Supabase auth tokens in hash
    if (hash && (hash.includes('access_token') || hash.includes('type=magiclink'))) {
      console.log('🔐 Auth hash detected, processing...');
      
      const supabase = createSupabaseUserClient();
      
      // Supabase client will automatically detect and process the hash tokens
      // We just need to wait for it and then redirect
      const handleAuth = async () => {
        try {
          // Wait a moment for Supabase to process the hash
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Check if we now have a session
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('Auth error:', error);
            return;
          }
          
          if (session) {
            console.log('✅ Session established, redirecting to dashboard...');
            
            // Clear the hash from the URL
            window.history.replaceState(null, '', window.location.pathname);
            
            // Redirect to dashboard
            router.replace('/en/dashboard?from=shopify');
          }
        } catch (err) {
          console.error('Auth handling error:', err);
        }
      };
      
      handleAuth();
    }
  }, [router]);

  // This component doesn't render anything
  return null;
}

