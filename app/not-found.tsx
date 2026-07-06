import Link from "next/link";

export default function NotFound() {
  return (
    <main className="max-w-2xl mx-auto px-6 pt-24 pb-16">
      <pre className="text-accent text-[13px] mb-6">{`$ tmux attach -t this-page
no session found: this-page (404)`}</pre>
      <p className="text-muted mb-6">
        This page doesn&apos;t exist — maybe it was killed, maybe it never
        attached. Everything useful is one of these:
      </p>
      <ul className="space-y-2 text-[14px]">
        <li>
          <Link href="/" className="text-accent hover:underline">
            → the cheat sheet
          </Link>
        </li>
        <li>
          <Link href="/commands" className="text-accent hover:underline">
            → commands by task
          </Link>
        </li>
        <li>
          <Link href="/tutorial" className="text-accent hover:underline">
            → learn tmux in your browser
          </Link>
        </li>
      </ul>
      <p className="text-faint text-[12.5px] mt-8">
        or press <kbd>/</kbd> and search for what you wanted.
      </p>
    </main>
  );
}
