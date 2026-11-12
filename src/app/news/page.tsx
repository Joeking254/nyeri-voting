import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PublicPageShell } from "@/components/public-page-shell";

export const dynamic = "force-dynamic";

export default async function NewsPage() {
  const now = new Date();
  const articles = await prisma.newsArticle.findMany({ where: { isPublished: true, publishedAt: { lte: now } }, orderBy: { publishedAt: "desc" }, select: { id: true, slug: true, title: true, excerpt: true, imageUrl: true, publishedAt: true } }).catch(() => []);
  return <PublicPageShell eyebrow="From the awards" title="News and updates" description="Announcements, nominee highlights, event updates, and official winner news.">{articles.length ? <div className="grid gap-4 sm:grid-cols-2">{articles.map((article) => <article key={article.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">{article.imageUrl && <img src={article.imageUrl} alt="" className="aspect-[16/9] w-full object-cover" loading="lazy" />}<div className="p-5">{article.publishedAt && <p className="text-xs font-medium text-slate-500">{article.publishedAt.toLocaleDateString()}</p>}<h2 className="mt-2 text-lg font-bold text-slate-900"><Link href={`/news/${encodeURIComponent(article.slug)}`} className="hover:text-sky-700">{article.title}</Link></h2>{article.excerpt && <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{article.excerpt}</p>}<Link href={`/news/${encodeURIComponent(article.slug)}`} className="mt-4 inline-block text-sm font-semibold text-sky-700">Read update →</Link></div></article>)}</div> : <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">No news has been published yet.</p>}</PublicPageShell>;
}
