import { Helmet } from "react-helmet-async";

const SITE = "https://tradenovaos-com.lovable.app";

interface SeoHeadProps {
  title: string;
  description: string;
  path: string; // e.g. "/pricing"
  type?: "website" | "article";
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

/**
 * Per-route head metadata. Overrides the sitewide defaults from index.html
 * for title / description / canonical / og:* and emits optional JSON-LD.
 */
export default function SeoHead({ title, description, path, type = "website", jsonLd }: SeoHeadProps) {
  const url = `${SITE}${path}`;
  const ldArray = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {ldArray.map((obj, i) => (
        <script key={i} type="application/ld+json">{JSON.stringify(obj)}</script>
      ))}
    </Helmet>
  );
}
