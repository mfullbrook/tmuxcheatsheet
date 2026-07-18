import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { COMMAND_PAGES, getCommandPage } from "@/lib/data/command-pages";
import { CodeBlock } from "@/components/CodeBlock";
import { InlineCode } from "@/components/Prose";
import { CopyLine } from "@/components/CopyLine";
import { YourBinding } from "@/components/YourBinding";

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return COMMAND_PAGES.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = getCommandPage(slug);
  if (!page) return {};
  return {
    title: page.title,
    description: page.metaDescription,
    alternates: { canonical: `/commands/${page.slug}` },
  };
}

export default async function CommandPage({ params }: Props) {
  const { slug } = await params;
  const page = getCommandPage(slug);
  if (!page) notFound();

  const related = page.related
    .map((r) => getCommandPage(r))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: page.title,
    description: page.metaDescription,
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
        <Link href="/commands" className="hover:text-accent">
          commands
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-muted">{page.slug}</span>
      </nav>

      <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-6">
        {page.title}
      </h1>

      <div className="border border-accent-dim bg-surface p-4 mb-8">
        <p className="text-muted text-[13.5px] mb-2">
          <InlineCode text={page.tldr.text} />
        </p>
        {page.tldr.keys && (
          <p className="mb-2 text-[15px]">
            <span className="text-faint text-[12px] mr-2">keys</span>
            <span className="text-accent font-medium">
              prefix + {page.tldr.keys}
            </span>
          </p>
        )}
        <CopyLine text={page.tldr.command} />
        <YourBinding bindingIds={page.bindingIds} />
      </div>

      {page.sections.map((s) => (
        <section key={s.heading} className="mb-7">
          <h2 className="text-[16px] font-semibold mb-2 text-fg">
            {s.heading}
          </h2>
          <p className="text-muted text-[13.5px] leading-relaxed">
            <InlineCode text={s.body} />
          </p>
          {s.code && <CodeBlock code={s.code} label="~/.tmux.conf" />}
        </section>
      ))}

      {page.conf && (
        <section className="mb-7">
          <h2 className="text-[16px] font-semibold mb-2">
            Related config
          </h2>
          <CodeBlock code={page.conf} label="~/.tmux.conf" />
        </section>
      )}

      {related.length > 0 && (
        <section className="border-t border-edge pt-6 mt-10">
          <h2 className="text-[13px] text-faint mb-3 uppercase tracking-wide">
            Related
          </h2>
          <ul className="grid sm:grid-cols-2 gap-1.5 text-[13.5px]">
            {related.map((r) => (
              <li key={r.slug}>
                <Link
                  href={`/commands/${r.slug}`}
                  className="text-accent hover:underline"
                >
                  → {r.title.replace(/^How to /, "")}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-faint text-[12px] mt-10">
        Verified against tmux 3.6 · updated July 2026 ·{" "}
        <Link href="/" className="hover:text-accent">
          back to the full cheat sheet
        </Link>
      </p>
    </main>
  );
}
