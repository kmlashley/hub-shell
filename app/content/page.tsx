import { createServerClient } from "@/lib/supabase-server";
import { fmtDate } from "@/lib/fmt-date";
import Link from "next/link";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-border text-muted",
  review: "bg-gold/10 text-gold",
  approved: "bg-accent/10 text-accent",
  published: "bg-primary/10 text-primary",
};

async function getPosts() {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("blog_posts")
    .select("id, title, status, primary_keyword, score, created_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(50);
  return data ?? [];
}

export default async function ContentPage() {
  const posts = await getPosts();

  const byStatus = {
    draft: posts.filter((p) => p.status === "draft"),
    review: posts.filter((p) => p.status === "review"),
    approved: posts.filter((p) => p.status === "approved"),
    published: posts.filter((p) => p.status === "published"),
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-serif text-dark mb-1">Content</h1>
          <p className="text-sm text-muted">Blog posts in your pipeline.</p>
        </div>
        <Link
          href="/content/post-scorer"
          className="text-sm bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
        >
          Score a draft
        </Link>
      </div>

      {/* Status tabs summary */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {Object.entries(byStatus).map(([status, items]) => (
          <div key={status} className="bg-white border border-border rounded-xl p-4">
            <p className="text-2xl font-bold text-dark">{items.length}</p>
            <p className="text-xs text-muted capitalize">{status}</p>
          </div>
        ))}
      </div>

      {/* Posts table */}
      {posts.length === 0 ? (
        <div className="bg-white border border-border rounded-xl p-12 text-center">
          <p className="text-sm text-muted">No posts yet.</p>
          <p className="text-xs text-muted mt-1">
            Approve a brief in the{" "}
            <Link href="/review" className="text-primary hover:underline">
              Review Queue
            </Link>
            , then use the Content Draft agent to write it.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-light">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted">Title</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted">Keyword</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted">Score</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {posts.map((post) => (
                <tr key={post.id} className="hover:bg-light transition-colors">
                  <td className="px-4 py-3 font-medium text-dark max-w-[280px]">
                    <p className="truncate">{post.title}</p>
                  </td>
                  <td className="px-4 py-3 text-muted text-xs">{post.primary_keyword ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[post.status] ?? "bg-border text-muted"}`}>
                      {post.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted text-xs">{post.score ?? "—"}</td>
                  <td className="px-4 py-3 text-muted text-xs">{fmtDate(post.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
