import { T } from "@/components/ui/Typography";
import {
  anonGetAllBlogTags,
  anonGetPublishedBlogPosts,
} from "@/data/anon/marketing-blog";
import { unstable_setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { PublicBlogList } from "../PublicBlogList";
import { TagsNav } from "../TagsNav";

export const metadata = {
  title: "Aiva.io Blog – Product updates, ideas, and best practices",
  description:
    "Read the latest product updates, ideas, and best practices from the Aiva.io team.",
  icons: {
    icon: "/images/favicon.ico",
  },
};

async function Tags() {
  const tags = await anonGetAllBlogTags();
  return <TagsNav tags={tags} />;
}

async function BlogList() {
  const blogPosts = await anonGetPublishedBlogPosts();
  return <PublicBlogList blogPosts={blogPosts} />;
}

export default async function BlogListPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const params = await props.params;

  const { locale } = params;

  unstable_setRequestLocale(locale);
  return (
    <div className="space-y-8 w-full">
      <div className="flex items-center flex-col space-y-4">
        <div className="space-y-2 text-center">
          <T.Subtle>Aiva.io Blog</T.Subtle>
          <T.H1>All posts from the Aiva.io team</T.H1>
          <T.P className="text-xl leading-[30px] text-muted-foreground">
            Here is a collection of the latest articles, guides, and product
            updates from the team behind Aiva.io.
          </T.P>
        </div>
        <Suspense fallback={<T.Subtle>Loading tags...</T.Subtle>}>
          <Tags />
        </Suspense>
      </div>
      <Suspense fallback={<T.Subtle>Loading posts...</T.Subtle>}>
        <BlogList />
      </Suspense>
    </div>
  );
}
