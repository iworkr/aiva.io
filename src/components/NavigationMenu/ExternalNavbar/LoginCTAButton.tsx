"use client";

import { ExternalNavigationCTAButton } from "@/components/NavigationMenu/ExternalNavbar/ExternalNavigationCTAButton";
import { supabaseUserClientComponent } from "@/supabase-clients/user/supabaseUserClientComponent";
import { useQuery } from "@tanstack/react-query";

export function LoginCTAButton() {
  const { data: isLoggedIn, isLoading, isFetching, isSuccess } = useQuery({
    queryKey: ["isLoggedInHome"],
    queryFn: async () => {
      const response = await supabaseUserClientComponent.auth.getUser();
      return Boolean(response.data.user?.id);
    },
    initialData: false,
    refetchOnMount: true,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchIntervalInBackground: false,
    staleTime: 0,
  });

  // Only show loading state during initial load, not during refetches
  // This prevents the "Please wait..." state from persisting after login
  const showLoading = isLoading && !isSuccess;

  return (
    <ExternalNavigationCTAButton
      isLoading={showLoading}
      isLoggedIn={isLoggedIn}
    />
  );
}
