// https://github.com/vercel/next.js/issues/58272
import { PageTitleNavbar } from "@/components/navbar/PageTitleNavbar";

export async function generateMetadata() {
    return {
    title: "Aiva.io",
    description: "Your unified AI communication hub",
    };
  }

export async function WorkspaceNavbar() {
  return (
    <div className="flex items-center">
      <PageTitleNavbar />
    </div>
  );
}
