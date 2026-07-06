import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LESSONS } from "@/lib/data/lessons";
import { CodeBlock } from "@/components/CodeBlock";
import { InlineCode } from "@/components/Prose";

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return LESSONS.map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const lesson = LESSONS.find((l) => l.slug === slug);
  if (!lesson) return {};
  return {
    title: `${lesson.title} — learn tmux, lesson ${lesson.num}`,
    description: lesson.metaDescription,
    alternates: { canonical: `/tutorial/${lesson.slug}` },
  };
}

export default async function LessonPage({ params }: Props) {
  const { slug } = await params;
  const i = LESSONS.findIndex((l) => l.slug === slug);
  if (i === -1) notFound();
  const lesson = LESSONS[i];
  const prev = LESSONS[i - 1];
  const next = LESSONS[i + 1];

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-10 pb-16">
      <nav className="text-[12.5px] text-faint mb-6" aria-label="Breadcrumb">
        <Link href="/tutorial" className="hover:text-accent">
          learn
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-muted">
          lesson {lesson.num} of {LESSONS.length}
        </span>
      </nav>

      <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-4">
        {lesson.title}
      </h1>
      <p className="text-muted text-[14.5px] leading-relaxed mb-8">
        <InlineCode text={lesson.intro} />
      </p>

      {lesson.sections.map((s) => (
        <section key={s.heading} className="mb-7">
          <h2 className="text-[16px] font-semibold mb-2">{s.heading}</h2>
          <p className="text-muted text-[13.5px] leading-relaxed">
            <InlineCode text={s.body} />
          </p>
          {s.code && <CodeBlock code={s.code} label={s.codeLabel} />}
        </section>
      ))}

      <section className="border border-accent-dim bg-surface p-4 my-10">
        <h2 className="text-[13px] uppercase tracking-wide text-accent mb-2">
          Before moving on
        </h2>
        <ol className="space-y-1 text-[13.5px] text-muted list-decimal list-inside">
          {lesson.practice.map((p) => (
            <li key={p}>
              <InlineCode text={p} />
            </li>
          ))}
        </ol>
      </section>

      <nav className="flex justify-between text-[13.5px] border-t border-edge pt-5">
        {prev ? (
          <Link
            href={`/tutorial/${prev.slug}`}
            className="text-muted hover:text-accent"
          >
            ← {prev.title}
          </Link>
        ) : (
          <Link href="/tutorial" className="text-muted hover:text-accent">
            ← playground
          </Link>
        )}
        {next ? (
          <Link
            href={`/tutorial/${next.slug}`}
            className="text-accent hover:underline"
          >
            {next.title} →
          </Link>
        ) : (
          <Link href="/" className="text-accent hover:underline">
            the full cheat sheet →
          </Link>
        )}
      </nav>
    </main>
  );
}
