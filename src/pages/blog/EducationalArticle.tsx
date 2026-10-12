import { Link, useNavigate, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import MarketingNavbar from '@/components/MarketingNavbar';
import SeoHead from '@/components/SeoHead';
import { Button } from '@/components/ui/button';
import { BLOG_ARTICLES, articleJsonLd, articlePath } from './articles';

export default function EducationalArticle() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const article = BLOG_ARTICLES.find(item => item.slug === slug && item.body);
  if (!article) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SeoHead path={articlePath(article)} title={`${article.title} — TradeNova OS`} description={article.description} type="article" jsonLd={articleJsonLd(article)} />
      <MarketingNavbar onLogin={() => navigate('/login')} onSignup={() => navigate('/signup')} />
      <main id="main-content" className="max-w-3xl mx-auto px-5 sm:px-8 pt-32 pb-24">
        <Button asChild variant="link" className="px-0 text-muted-foreground mb-8"><Link to="/resources/blog"><ArrowLeft /> Back to blog</Link></Button>
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="flex flex-wrap items-center gap-3 mb-6 text-xs">
            <span className="font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{article.tag}</span>
            <time dateTime={article.published}>{new Date(`${article.published}T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}</time>
            <span>{article.read} read</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black mb-6 leading-tight">{article.title}</h1>
          <article className="prose prose-invert max-w-none prose-headings:text-foreground prose-headings:font-black prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-4 prose-p:text-foreground prose-li:text-foreground prose-strong:text-foreground prose-a:text-primary">
            <ReactMarkdown components={{ a: ({ href, children }) => href?.startsWith('/') ? <Link to={href}>{children}</Link> : <a href={href}>{children}</a> }}>{article.body}</ReactMarkdown>
          </article>
        </motion.div>
      </main>
    </div>
  );
}