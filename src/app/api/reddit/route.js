import imagesGetter from "../../../Helpers/imagesGetter";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const subreddit = (searchParams.get("subreddit") || "").trim();
  const limit = searchParams.get("limit") || "100";
  const after = searchParams.get("after");
  const before = searchParams.get("before");

  if (!subreddit) {
    return Response.json(
      { error: "Missing required subreddit parameter." },
      { status: 400 }
    );
  }

  const redditUrl = new URL(
    `https://www.reddit.com/r/${encodeURIComponent(subreddit)}/new.json`
  );
  redditUrl.searchParams.set("limit", limit);
  if (after) {
    redditUrl.searchParams.set("after", after);
  }
  if (before) {
    redditUrl.searchParams.set("before", before);
  }

  try {
    const res = await fetch(redditUrl.toString(), {
      cache: "no-store",
      headers: {
        "User-Agent": "reddit-image-viewer/1.0",
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      return Response.json(
        { error: errorText || "Reddit request failed." },
        { status: res.status }
      );
    }

    const data = await res.json();
    const images = imagesGetter(data?.data?.children || []);

    return Response.json({
      images,
      after: data?.data?.after ?? null,
      before: data?.data?.before ?? null,
    });
  } catch (error) {
    return Response.json(
      { error: error?.message || "Reddit request failed." },
      { status: 500 }
    );
  }
}
