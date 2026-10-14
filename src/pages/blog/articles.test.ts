/// <reference types="node" />
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { BLOG_ARTICLES, articleJsonLd, articlePath } from './articles';

describe('public article SEO integrity', () => {
  it('registers no more than two new educational articles', () => {
    expect(BLOG_ARTICLES.filter(article => article.body).map(article => article.slug)).toEqual([
      'weekly-trading-journal-review', 'stop-revenge-trading-after-loss',
    ]);
  });

  it('keeps every real article in the generated sitemap with matching modification dates', () => {
    const sitemap = readFileSync('public/sitemap.xml', 'utf8');
    for (const article of BLOG_ARTICLES) {
      const location = `https://tradenovaos.com${articlePath(article)}`;
      const block = sitemap.split('<url>').find(entry => entry.includes(`<loc>${location}</loc>`));
      expect(block).toBeDefined();
      expect(block).toContain(`<lastmod>${article.modified}</lastmod>`);
      expect(sitemap.split(`<loc>${location}</loc>`)).toHaveLength(2);
    }
  });

  it('uses self-referencing article URLs and ISO publication dates in structured data', () => {
    for (const article of BLOG_ARTICLES) {
      const schema = articleJsonLd(article);
      expect(schema.url).toBe(`https://tradenovaos.com/blog/${article.slug}`);
      expect(schema.mainEntityOfPage).toBe(schema.url);
      expect(schema.datePublished).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(schema.dateModified >= schema.datePublished).toBe(true);
    }
  });

  it('excludes placeholder families from the public sitemap', () => {
    const sitemap = readFileSync('public/sitemap.xml', 'utf8');
    const paths = [...sitemap.matchAll(/<loc>https:\/\/tradenovaos.com([^<]*)<\/loc>/g)].map(match => match[1]);
    expect(paths.filter(path => /^\/(products|compare|solutions)\//.test(path))).toEqual([]);
    expect(paths).not.toContain('/blog');
  });
});