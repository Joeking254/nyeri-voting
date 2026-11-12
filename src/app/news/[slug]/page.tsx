import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PublicPageShell } from "@/components/public-page-shell";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };

export default async function NewsArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = await prisma.newsArticle.findFirst({ where: { slug, isPublished: true, publishedAt: { lte: new Date() } } });
  if (!article) notFound();
  return <PublicPageShell eyebrow={article.publishedAt?.toLocaleDateString() || "News"} title={article.title} description={article.excerpt || undefined}><article className="overflow-hidden rounded-xl border border-slate-200 bg-white">{article.imageUrl && <img src={article.imageUrl} alt="" className="max-h-[480px] w-full object-cover" />}<div className="whitespace-pre-line px-5 py-6 text-sm leading-7 text-slate-700 sm:px-8">{article.body}</div></article></PublicPageShell>;
}
