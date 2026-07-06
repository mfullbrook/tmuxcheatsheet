import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GUIDES } from "@/lib/data/guides";
import { CodeBlock } from "@/components/CodeBlock";
import { InlineCode } from "@/components/Prose";

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const guide = GUIDES.find((g) => g.slug === slug);
  if (!guide) return {};
  return {
    title: guide.title,
    description: guide.metaDescription,
    alternates: { canonical: `/guides/${guide.slug}` },
  };
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const guide = GUIDES.find((g) => g.slug === slug);
  if (!guide) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: guide.title,
    description: guide.metaDescription,
    dateModified: "2026-07-05",
    author: { "@type": "Organization", name: "tmuxlab" },
  };

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-10 pb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav className="text-[12.5px] text-faint mb-6" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-accent">
          cheatsheet
        </Link>
        <span className="mx-1.5">/</span>
        <Link href="/guides" className="hover:text-accent">
          guides
        </Link>
      </nav>

      <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-4">
        {guide.title}
      </h1>
      <p className="text-muted text-[14.5px] leading-relaxed mb-8 border-l-2 border-accent-dim pl-4">
        <InlineCode text={guide.hook} />
      </p>

      {guide.sections.map((s) => (
        <section key={s.heading} className="mb-8">
          <h2 className="text-[17px] font-semibold mb-2">{s.heading}</h2>
          <p className="text-muted text-[13.5px] leading-relaxed">
            <InlineCode text={s.body} />
          </p>
          {s.code && <CodeBlock code={s.code} label={s.codeLabel} />}
        </section>
      ))}

      <p className="text-faint text-[12px] mt-10 border-t border-edge pt-5">
        Verified against tmux 3.6 · updated July 2026 ·{" "}
        <Link href="/guides" className="hover:text-accent">
          more guides
        </Link>{" "}
        ·{" "}
        <Link href="/" className="hover:text-accent">
          cheat sheet
        </Link>
      </p>
    </main>
  );
}
