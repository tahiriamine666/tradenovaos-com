import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const BASE_URL = "https://tradenovaos.com";

const entries = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/pricing", changefreq: "weekly", priority: "0.9" },
  { path: "/supported-brokers", changefreq: "monthly", priority: "0.7" },
  { path: "/blog/fair-value-gaps-guide", lastmod: "2026-10-12", changefreq: "monthly", priority: "0.8" },
  { path: "/blog/weekly-trading-journal-review", lastmod: "2026-10-12", changefreq: "monthly", priority: "0.8" },
  { path: "/blog/stop-revenge-trading-after-loss", lastmod: "2026-10-12", changefreq: "monthly", priority: "0.8" },
  ...["trade-journal", "edge-analytics", "mind-journal", "playbook-lab", "ai-insights", "trading-calendar"].map(feature => ({ path: `/features/${feature}`, changefreq: "monthly", priority: "0.7" })),
  { path: "/resources/blog", changefreq: "weekly", priority: "0.7" },
  { path: "/cookies", changefreq: "yearly", priority: "0.3" },
  { path: "/resources/help-center", changefreq: "monthly", priority: "0.6" },
];

function generateSitemap(items) {
  const urls = items.map((entry) =>
    [
      "  <url>",
      `    <loc>${BASE_URL}${entry.path}</loc>`,
      entry.lastmod ? `    <lastmod>${entry.lastmod}</lastmod>` : null,
      entry.changefreq ? `    <changefreq>${entry.changefreq}</changefreq>` : null,
      entry.priority ? `    <priority>${entry.priority}</priority>` : null,
      "  </url>",
    ].filter(Boolean).join("\n")
  );

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
  ].join("\n");
}

writeFileSync(resolve("public/sitemap.xml"), generateSitemap(entries));
console.log(`sitemap.xml written (${entries.length} entries)`);
