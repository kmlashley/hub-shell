import FirecrawlApp from "@mendable/firecrawl-js";

// ─── Tavily (Primary Search API) ────────────────────────────────────────────
// Tavily is the default for this shell — free tier, no upfront credits.
// Sign up at tavily.com and set TAVILY_API_KEY in your .env.local

interface TavilySearchOptions {
  searchDepth?: "basic" | "advanced";
  maxResults?: number;
  includeAnswer?: boolean;
  includeDomains?: string[];
  excludeDomains?: string[];
}

export interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
  publishedDate?: string;
}

export interface TavilyResponse {
  answer?: string;
  results: TavilyResult[];
  query: string;
}

export async function searchWithTavily(
  query: string,
  options: TavilySearchOptions = {}
): Promise<TavilyResponse> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) throw new Error("TAVILY_API_KEY is not set in environment variables");

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: options.searchDepth ?? "basic",
      max_results: options.maxResults ?? 5,
      include_answer: options.includeAnswer ?? true,
      include_domains: options.includeDomains,
      exclude_domains: options.excludeDomains,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Tavily error ${response.status}: ${body.slice(0, 200)}`);
  }

  return response.json() as Promise<TavilyResponse>;
}


// ─── Firecrawl (Web Scraping) ────────────────────────────────────────────────
// Used for scraping competitor pages, landing pages, blog posts.
// Sign up at firecrawl.dev and set FIRECRAWL_API_KEY in your .env.local

let _firecrawl: FirecrawlApp | null = null;

function getFirecrawl(): FirecrawlApp {
  if (!_firecrawl) {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) throw new Error("FIRECRAWL_API_KEY is not set in environment variables");
    _firecrawl = new FirecrawlApp({ apiKey });
  }
  return _firecrawl;
}

export async function scrapeWithFirecrawl(url: string): Promise<string> {
  const app = getFirecrawl();
  const result = await app.scrapeUrl(url, { formats: ["markdown"] });
  if (!result.success) throw new Error(`Firecrawl failed to scrape ${url}`);
  return (result as { markdown?: string }).markdown ?? "";
}


// ─── Perplexity (Optional Alternative to Tavily) ────────────────────────────
// Uncomment this block if you prefer Perplexity over Tavily.
// Set PERPLEXITY_API_KEY in your .env.local (requires purchased credits).
// Then replace calls to searchWithTavily() with searchWithPerplexity().

// export async function searchWithPerplexity(query: string): Promise<string> {
//   const apiKey = process.env.PERPLEXITY_API_KEY;
//   if (!apiKey) throw new Error("PERPLEXITY_API_KEY is not set");
//
//   const response = await fetch("https://api.perplexity.ai/chat/completions", {
//     method: "POST",
//     headers: {
//       "Authorization": `Bearer ${apiKey}`,
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify({
//       model: "llama-3.1-sonar-small-128k-online",
//       messages: [{ role: "user", content: query }],
//     }),
//   });
//
//   if (!response.ok) {
//     const body = await response.text().catch(() => "");
//     throw new Error(`Perplexity error ${response.status}: ${body.slice(0, 200)}`);
//   }
//
//   const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
//   return data.choices?.[0]?.message?.content ?? "";
// }


// ─── Utility ─────────────────────────────────────────────────────────────────

// Extracts valid JSON from Claude responses that may include markdown code fences.
export function extractJsonFromClaude(text: string): unknown | null {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]+?)```/);
  const raw = fenceMatch ? fenceMatch[1] : text;

  try {
    return JSON.parse(raw.trim());
  } catch {
    // Fall back to extracting the first { } or [ ] block
    const objMatch = raw.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (!objMatch) return null;
    try {
      return JSON.parse(objMatch[1]);
    } catch {
      return null;
    }
  }
}
