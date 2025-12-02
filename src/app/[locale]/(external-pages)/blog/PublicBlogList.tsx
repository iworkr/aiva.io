import { Link } from "@/components/intl-link";
import { T } from "@/components/ui/Typography";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { anonGetMarketingAuthorById } from "@/data/anon/marketing-authors";
import { DBTable } from "@/types";
import { CalendarDays, Bell, MessageSquare } from "lucide-react";
import moment from "moment";
import { Fragment } from "react";
import { AuthorProfileImage } from "./AuthorProfileImage";
import { BlogPostImage } from "./BlogPostImage";

function AuthorProfileSkeleton() {
  return (
    <div className="flex items-center gap-2">
      <Skeleton className="w-8 h-8 rounded-full" />
      <Skeleton className="h-4 w-24" />
    </div>
  );
}

async function AuthorProfile({ authorId }: { authorId: string }) {
  if (!authorId) return null;

  const author = await anonGetMarketingAuthorById(authorId);

  return (
    <div className="flex items-center text-sm text-muted-foreground">
      <AuthorProfileImage
        avatarUrl={author.avatar_url}
        name={author.display_name}
      />
      <div className="relative ml-2 h-4">
        <div className="absolute inset-0 bg-gray-100 animate-pulse rounded" />
        <span>{author.display_name}</span>
      </div>
    </div>
  );
}

export function PublicBlogList({
  blogPosts,
}: {
  blogPosts: Array<
    DBTable<"marketing_blog_posts"> & {
      marketing_blog_author_posts: Array<
        DBTable<"marketing_blog_author_posts">
      >;
    }
  >;
}) {
  return (
    <Fragment>
      {blogPosts.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-6">
          {blogPosts.map((post) => {
            const authorId = post.marketing_blog_author_posts[0]?.author_id;
            return (
              <Link
                href={`/blog/${post.slug}`}
                key={post.id}
                className="hover:opacity-80 transition-opacity"
              >
                <Card className="h-full">
                  <div className="aspect-video relative overflow-hidden rounded-t-lg">
                    <BlogPostImage
                      src={post.cover_image ?? "/images/nextbase-logo.png"}
                      alt={post.title}
                    />
                  </div>
                  <CardHeader className="space-y-2">
                    <CardTitle className="text-lg font-medium line-clamp-2">
                      {post.title}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {post.summary}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <CalendarDays className="w-4 h-4 mr-2" />
                      <span>
                        {moment(post.created_at).format("MMM D, YYYY")}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 mb-6">
            <CalendarDays className="h-10 w-10 text-primary" />
          </div>
          <h3 className="text-2xl font-bold mb-3">Blog Coming Soon</h3>
          <p className="text-base text-muted-foreground max-w-lg mb-8">
            We're working on sharing our insights about AI-powered communication, productivity tips, and product updates. Be the first to know when we publish!
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button asChild size="lg" className="shadow-lg hover:shadow-xl transition-all h-11 px-6 font-semibold">
              <Link href="/feedback">
                <MessageSquare className="mr-2 h-5 w-5" />
                Share Your Ideas
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-11 px-6 font-medium border-2">
              <Link href="/roadmap">
                <Bell className="mr-2 h-5 w-5" />
                View Roadmap
              </Link>
            </Button>
          </div>
        </div>
      )}
    </Fragment>
  );
}
