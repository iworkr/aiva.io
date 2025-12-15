1. Caching & Data Fetching

a) HTTP / browser caching

Set proper cache headers on your API/static assets:
• Cache-Control: public, max-age=31536000, immutable for versioned JS/CSS
• ETag / Last-Modified for APIs so responses can be 304’d instead of fully re-sent.

(This is mostly server/config, but it massively improves perceived speed.)

⸻

b) Client-side data caching (SWR / React Query etc.)

Instead of manually fetching and re-fetching, use a data layer that:
• Caches responses in memory
• De-duplicates in-flight requests
• Revalidates in the background

Example with React Query:

// api.ts
const fetchUser = async () => {
const res = await fetch("/api/user");
if (!res.ok) throw new Error("Network error");
return res.json();
};

// component
import { useQuery } from "@tanstack/react-query";

function UserProfile() {
const { data, isLoading, error } = useQuery({
queryKey: ["user"],
queryFn: fetchUser,
staleTime: 1000 \* 60, // 1 minute
});

if (isLoading) return <p>Loading…</p>;
if (error) return <p>Something went wrong</p>;

return <div>{data.name}</div>;
}

Benefits: cached, instant on revisits, smarter refetching.

⸻

c) Local persistence (localStorage / IndexedDB)

For data that rarely changes:
• Store user prefs, filters, last-opened items.
• Hydrate initial state from storage to avoid extra API calls.

function useLocalStorageState<T>(key: string, defaultValue: T) {
const [state, setState] = React.useState<T>(() => {
const stored = window.localStorage.getItem(key);
return stored ? JSON.parse(stored) : defaultValue;
});

React.useEffect(() => {
window.localStorage.setItem(key, JSON.stringify(state));
}, [key, state]);

return [state, setState] as const;
}

⸻

d) Service worker / offline cache (PWA)
• Cache static assets and certain API responses.
• Show cached content instantly, then update in background.
• Great for dashboards, CRMs, etc.

(Usually handled with Workbox, Next.js PWA plugin, Vite plugins, etc.)

⸻

2. Reducing Bundle Size

The less JS, the faster the app loads & hydrates.

a) Code splitting & lazy loading

Use React.lazy and Suspense for routes / heavy components:

const SettingsPage = React.lazy(() => import("./SettingsPage"));

function App() {
return (
<Suspense fallback={<div>Loading…</div>}>
<Routes>
<Route path="/settings" element={<SettingsPage />} />
</Routes>
</Suspense>
);
}

Only load what the user actually hits.

⸻

b) Tree shaking & dead code elimination
• Use ES modules everywhere.
• Avoid importing whole libraries:

// bad
import \_ from "lodash";

// better
import debounce from "lodash/debounce";

    •	Prefer smaller alternatives: dayjs instead of moment, zod instead of massive schema libs, etc.

⸻

c) Remove unnecessary polyfills & legacy code
• Don’t ship polyfills for browsers you don’t support.
• Use your bundler’s browserslist / target so it only includes what’s necessary.

⸻

d) Split vendor vs app bundles
• Let the bundler separate rarely-changing vendor code from your app code.
• Browsers can cache vendor bundle for longer.

⸻

3. Optimizing Rendering (React-level)

a) Avoid unnecessary re-renders

Use React’s memoization tools where it actually helps:
• React.memo for pure functional components
• useCallback for stable function references
• useMemo for expensive calculations

const ListItem = React.memo(function ListItem({ item }: { item: Item }) {
console.log("render item", item.id);
return <li>{item.name}</li>;
});

function List({ items }: { items: Item[] }) {
return (

<ul>
{items.map(i => (
<ListItem key={i.id} item={i} />
))}
</ul>
);
}

Don’t spam memoization everywhere—use it for:
• Big lists
• Components with heavy children
• Components that re-render due to parent updates but rarely change themselves

⸻

b) Virtualize long lists

Rendering 5,000 rows will kill performance. Use react-window / react-virtualized:

import { FixedSizeList as List } from "react-window";

function BigList({ items }) {
return (
<List
      height={500}
      itemCount={items.length}
      itemSize={40}
      width={300}
    >
{({ index, style }) => (

<div style={style}>{items[index].label}</div>
)}
</List>
);
}

Only what’s visible is rendered to the DOM.

⸻

c) Split state logically
• Local state should live as low as possible in the tree.
• Global state (Redux/Zustand/etc.) should be sliced to avoid every subscriber re-rendering for everything.

Bad pattern: one giant AppContext with everything in it → tiny change = whole app re-renders.

Better:
• Separate contexts: Auth, Theme, Settings, etc.
• Use selector-based hooks in Zustand / Redux.

⸻

d) useTransition & useDeferredValue (Concurrent React)

For expensive UI updates (filters, search):

const [query, setQuery] = useState("");
const [isPending, startTransition] = useTransition();

function handleChange(e) {
const value = e.target.value;
setQuery(value);
startTransition(() => {
// update expensive state or filtered list
setFiltered(expensiveFilter(hugeList, value));
});
}

Keeps the UI responsive while heavy work happens.

⸻

4. Network & API Performance

a) Batch and paginate
• Combine multiple tiny requests into one.
• Always paginate big datasets.
• Use query parameters for filtering/sorting server-side so you send less data.

⸻

b) Compress & optimize responses
• Enable gzip/brotli compression on server.
• Avoid sending unnecessary fields in JSON.

⸻

c) Preload critical data

For known routes or flows:
• “Warm up” an API call before user navigates.
• Use <link rel="preload"> or a “fetch on hover” pattern.

⸻

5. Asset Optimization

a) Image optimization
• Serve responsive images (srcset, sizes).
• Compress and resize at build time or via an image CDN.
• Use modern formats: WebP/AVIF where supported.

b) Fonts
• Use system fonts where possible (no extra downloads).
• If using web fonts, preload key fonts and use font-display: swap to avoid blocking rendering.

⸻

c) Static vs dynamic content
• Serve what you can as static (SSG/ISR in Next.js, etc.).
• Use CDN for JS/CSS/images.

⸻

6. Rendering Strategy: SSR, SSG, CSR, RSC

Depending on your stack (Next.js, Remix, plain CRA/Vite + React):
• SSR (server-side rendering): first paint is faster, better SEO; hydrate on client.
• SSG (static site generation): pre-render pages at build time, super fast via CDN.
• ISR (incremental static regeneration): static + periodic re-render after N seconds.
• React Server Components (RSC): move heavy logic/data fetching to the server so the client ships less JS.

For data-heavy dashboards, server-rendered shells + client fetch can feel faster than pure CSR.

⸻

7. Build & Tooling Tweaks
   • Use Vite / Next / Remix / modern tooling for faster dev & better prod outputs by default.
   • Turn on production optimizations:
   • Minification
   • Terser/ESBuild
   • Source maps off (or separate)
   • Analyze bundles with tools (webpack-bundle-analyzer, rollup-plugin-visualizer, etc.) and hunt big dependencies.

⸻

8. UX Tricks that Make It Feel Faster

Sometimes perception beats raw ms:
• Skeleton screens instead of spinners
• Optimistic UI updates (assume success, roll back on error)
• Prefetch routes on hover/visible
• Store “last state” so navigation back is instant (no full refetch flash)
