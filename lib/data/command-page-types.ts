export interface CommandPageSection {
  heading: string;
  /** Prose. Inline `code` spans are rendered as code. */
  body: string;
  /** Optional code block shown after the body. */
  code?: string;
}

export interface CommandPage {
  slug: string;
  /** H1, phrased the way people search. */
  title: string;
  metaDescription: string;
  /** Answer-first block at the top of the page. */
  tldr: {
    text: string;
    /** Keybinding(s) after the prefix, if any. */
    keys?: string;
    /** The command / shell line, copyable. */
    command: string;
  };
  sections: CommandPageSection[];
  /** Ready-to-paste .tmux.conf lines, if relevant. */
  conf?: string;
  /** Slugs of related pages. */
  related: string[];
}
