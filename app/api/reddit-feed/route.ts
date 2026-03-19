export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const subreddit = searchParams.get("subreddit") || "quittingvaping";
  try {
    const url = `https://www.reddit.com/r/${subreddit}/hot.json?limit=10`;
    const res = await fetch(url, {
      headers: { "User-Agent": "MissionControl/2.0 (compatible; +http://localhost)" },
      next: { revalidate: 300 },
    });
    if (!res.ok) return Response.json([], { status: 200 });
    const data = await res.json();
    const posts = (data?.data?.children || []).map((post: Record<string, Record<string, unknown>>) => ({
      id: post.data.id,
      title: post.data.title,
      score: post.data.score,
      author: post.data.author,
      created_utc: post.data.created_utc,
      url: `https://reddit.com${post.data.permalink}`,
    }));
    return Response.json(posts);
  } catch {
    return Response.json([], { status: 200 });
  }
}
