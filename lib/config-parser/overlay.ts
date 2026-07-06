/**
 * Overlay model — the single source of truth consumed by the cheat sheet,
 * palette, command pages, and diff view.
 *
 * Given a ParseResult and the default-bindings dataset, computes for every
 * dataset binding whether it is default / rebound / remapped / modified /
 * unbound in the user's config, plus the user's bindings that match no
 * dataset entry ("Your other bindings").
 *
 * Browser-safe: no platform APIs.
 */

import { ALL_BINDINGS } from "@/lib/data/keybindings";
import type { KeyBinding } from "@/lib/data/types";
import { canonicalKey, matchesDataset, parseCommandString } from "./normalize";
import type { ParsedBinding, ParseResult } from "./parse";

export type OverlayStatus =
  | "default"
  | "rebound"
  | "remapped"
  | "modified"
  | "unbound";

/** One dataset (table, key, command) atom, expanded from a KeyBinding row. */
export interface DatasetAtom {
  bindingId: string;
  table: string;
  key: string;
  command: string;
}

export interface AtomOverlay {
  atom: DatasetAtom;
  status: OverlayStatus;
  /** The user's effective key for this atom (differs when rebound). */
  userKey?: string;
  /** True when the user's binding needs no prefix (root table, -n). */
  noPrefix?: boolean;
  /**
   * For status "unbound": true when the unbind came from `unbind -a`
   * (collapsed-group rendering, T9) rather than an explicit `unbind <key>`
   * (individually struck per contract).
   */
  viaUnbindAll?: boolean;
  annotations: string[];
}

/** Aggregated per dataset entry (one KeyBinding row). */
export interface BindingOverlay {
  bindingId: string;
  /** Worst/most-informative status across the row's atoms. */
  status: OverlayStatus;
  atoms: AtomOverlay[];
  /** The user's effective key(s) for this entry, deduplicated. */
  userKeys: string[];
  /** True when the user's matching binding needs no prefix (root, -n). */
  noPrefix: boolean;
  /** For status "unbound": every unbound atom was wiped by `unbind -a`. */
  viaUnbindAll: boolean;
  annotations: string[];
}

/** A user binding that matched no dataset entry. */
export interface CustomBinding {
  table: string;
  key: string;
  command: string;
  /** True for -n/root-table bindings ("no prefix needed" group). */
  noPrefix: boolean;
  note?: string;
  chained: boolean;
  braceBlock: boolean;
  lineNo: number;
}

export interface OverlayModel {
  prefix: string;
  /** One entry per dataset KeyBinding, keyed by binding id. */
  entries: Map<string, BindingOverlay>;
  customBindings: CustomBinding[];
  /** Tables wiped by `unbind -a` (T9 collapsed group + banner). */
  unbindAllTables: Set<string>;
  /** Count of user bindings accounted for (matched or custom) — T5/QA. */
  accounted: number;
}

/**
 * Expand dataset rows into atoms per the matchKeys/matchCommands convention:
 * a single matchCommands entry applies to every key; otherwise the arrays
 * are parallel.
 */
export function datasetAtoms(
  bindings: KeyBinding[] = ALL_BINDINGS,
): DatasetAtom[] {
  const atoms: DatasetAtom[] = [];
  for (const b of bindings) {
    b.matchKeys.forEach((key, i) => {
      const command =
        b.matchCommands.length === 1 ? b.matchCommands[0] : b.matchCommands[i];
      atoms.push({ bindingId: b.id, table: b.table, key, command });
    });
  }
  return atoms;
}

const STATUS_PRIORITY: Record<OverlayStatus, number> = {
  default: 0,
  unbound: 1,
  rebound: 2,
  remapped: 3,
  modified: 4,
};

/** Build the overlay model from a parse result and the dataset. */
export function buildOverlay(
  parsed: ParseResult,
  bindings: KeyBinding[] = ALL_BINDINGS,
): OverlayModel {
  const atoms = datasetAtoms(bindings);
  const atomOverlays = new Map<DatasetAtom, AtomOverlay>();
  for (const atom of atoms) {
    atomOverlays.set(atom, { atom, status: "default", annotations: [] });
  }
  const byTableKey = new Map<string, DatasetAtom[]>();
  for (const atom of atoms) {
    const k = `${atom.table} ${canonicalKey(atom.key)}`;
    const list = byTableKey.get(k) ?? [];
    list.push(atom);
    byTableKey.set(k, list);
  }

  const customBindings: CustomBinding[] = [];
  /** Atoms claimed by a user binding (matched by command). */
  const claimed = new Set<DatasetAtom>();
  let accounted = 0;

  const userBindings: ParsedBinding[] = [...parsed.bindings.values()];

  for (const ub of userBindings) {
    const tableKey = `${ub.table} ${ub.key}`;
    const parsedCmd = ub.braceBlock ? null : parseCommandString(ub.command);

    // Find the best command match among dataset atoms.
    let matchedAtom: DatasetAtom | null = null;
    let matchAnnotations: string[] = [];
    if (parsedCmd) {
      // Prefer an atom on the same (table, key); then same table; then any.
      const candidates = [...atoms].sort((a, b) => {
        const score = (x: DatasetAtom) =>
          (x.table === ub.table && canonicalKey(x.key) === ub.key ? 0 : x.table === ub.table ? 1 : 2);
        return score(a) - score(b);
      });
      for (const atom of candidates) {
        if (claimed.has(atom) && !(atom.table === ub.table && canonicalKey(atom.key) === ub.key)) continue;
        const res = matchesDataset(parsedCmd, atom.command);
        if (res.match) {
          matchedAtom = atom;
          matchAnnotations = res.annotations;
          break;
        }
      }
    }

    if (matchedAtom) {
      claimed.add(matchedAtom);
      accounted++;
      const ov = atomOverlays.get(matchedAtom)!;
      const sameKey =
        matchedAtom.table === ub.table &&
        canonicalKey(matchedAtom.key) === ub.key;
      const dirty =
        ub.chained || matchAnnotations.length > 0 || ub.braceBlock;
      ov.userKey = ub.key;
      ov.noPrefix = ub.table === "root" && matchedAtom.table !== "root";
      ov.annotations.push(...matchAnnotations);
      if (ub.chained) {
        ov.annotations.push(
          `+${ub.chainedCount} chained command${ub.chainedCount === 1 ? "" : "s"}`,
        );
      }
      // Chained bindings are never clean matches (T10).
      ov.status = dirty ? "modified" : sameKey ? "default" : "rebound";
      continue;
    }

    // No command match: does the user's key shadow a dataset key?
    const shadowed = byTableKey.get(tableKey) ?? [];
    for (const atom of shadowed) {
      const ov = atomOverlays.get(atom)!;
      if (ov.status === "default" || ov.status === "unbound") {
        ov.status = "remapped";
        ov.userKey = ub.key;
      }
    }
    customBindings.push({
      table: ub.table,
      key: ub.key,
      command: ub.command,
      noPrefix: ub.table === "root",
      note: ub.note,
      chained: ub.chained,
      braceBlock: ub.braceBlock,
      lineNo: ub.lineNo,
    });
    accounted++;
  }

  // Explicit unbinds and unbind -a strike out unclaimed defaults.
  for (const atom of atoms) {
    const ov = atomOverlays.get(atom)!;
    if (ov.status !== "default" || claimed.has(atom)) continue;
    const k = `${atom.table} ${canonicalKey(atom.key)}`;
    if (parsed.unbinds.has(k)) {
      ov.status = "unbound";
    } else if (parsed.unbindAllTables.has(atom.table)) {
      ov.status = "unbound";
      ov.viaUnbindAll = true;
    }
  }

  // Aggregate atoms per dataset entry.
  const entries = new Map<string, BindingOverlay>();
  for (const b of bindings) {
    const rowAtoms = atoms
      .filter((a) => a.bindingId === b.id)
      .map((a) => atomOverlays.get(a)!);
    let status: OverlayStatus = "default";
    for (const a of rowAtoms) {
      if (STATUS_PRIORITY[a.status] > STATUS_PRIORITY[status]) {
        status = a.status;
      }
    }
    const userKeys = [
      ...new Set(
        rowAtoms.map((a) => a.userKey ?? canonicalKey(a.atom.key)),
      ),
    ];
    const annotations = [...new Set(rowAtoms.flatMap((a) => a.annotations))];
    const unboundAtoms = rowAtoms.filter((a) => a.status === "unbound");
    entries.set(b.id, {
      bindingId: b.id,
      status,
      atoms: rowAtoms,
      userKeys,
      noPrefix: rowAtoms.length > 0 && rowAtoms.every((a) => a.noPrefix),
      viaUnbindAll:
        status === "unbound" &&
        unboundAtoms.length > 0 &&
        unboundAtoms.every((a) => a.viaUnbindAll),
      annotations,
    });
  }

  return {
    prefix: parsed.prefix,
    entries,
    customBindings,
    unbindAllTables: parsed.unbindAllTables,
    accounted,
  };
}
