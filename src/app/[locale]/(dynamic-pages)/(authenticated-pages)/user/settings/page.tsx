import { getUserProfile } from "@/data/user/user";
import {
  serverGetLoggedInUserVerified
} from "@/utils/server/serverGetLoggedInUser";
import { AccountSettings } from "./AccountSettings";
import { redirect } from "next/navigation";

export default async function AccountSettingsPage() {
  const user = await serverGetLoggedInUserVerified();
  const userProfile = await getUserProfile(user.id);

  if (!userProfile) {
    redirect("/onboarding");
  }

  return <AccountSettings userProfile={userProfile} userEmail={user.email} />;
}
