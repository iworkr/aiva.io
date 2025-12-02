import { Metadata } from "next";
import { z } from "zod";
import { Login } from "./Login";

const SearchParamsSchema = z.object({
  next: z.string().optional(),
  nextActionType: z.string().optional(),
});

export const metadata: Metadata = {
  title: "Log in | Aiva.io – AI Inbox & Communication Hub",
  description:
    "Log in to Aiva.io to manage your unified inbox, messages, and calendar with AI assistance.",
};

export default async function LoginPage(props: {
  searchParams: Promise<unknown>;
}) {
  const searchParams = await props.searchParams;
  const { next, nextActionType } = SearchParamsSchema.parse(searchParams);
  return <Login next={next} nextActionType={nextActionType} />;
}
