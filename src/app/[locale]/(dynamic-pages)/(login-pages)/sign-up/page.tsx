import { Metadata } from "next";
import { z } from "zod";
import { SignUp } from "./Signup";

const SearchParamsSchema = z.object({
  next: z.string().optional(),
  nextActionType: z.string().optional(),
});

export const metadata: Metadata = {
  title: "Create your Aiva.io account – Start free",
  description:
    "Create your Aiva.io account to unify email, DMs, and calendar into a single AI-powered inbox.",
};

export default async function SignUpPage(props: {
  searchParams: Promise<unknown>;
}) {
  const searchParams = await props.searchParams;
  const { next, nextActionType } = SearchParamsSchema.parse(searchParams);
  return <SignUp next={next} nextActionType={nextActionType} />;
}
