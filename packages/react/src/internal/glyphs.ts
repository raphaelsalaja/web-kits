export type Role = "digit" | "group" | "decimal" | "text";

export type Part = {
  readonly key: string;
  readonly char: string;
  readonly role: Role;
};

const segmenter = new Intl.Segmenter();

export function graphemes(text: string): string[] {
  return Array.from(segmenter.segment(text), (segment) => segment.segment);
}

export function sameParts(a: readonly Part[], b: readonly Part[]) {
  return (
    a.length === b.length &&
    a.every((part, i) => part.key === b[i].key && part.char === b[i].char)
  );
}

/** Index pairs of a longest common subsequence, in order. */
export function lcs<T>(a: readonly T[], b: readonly T[]): [number, number][] {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const table = new Uint16Array(rows * cols);
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      table[i * cols + j] =
        a[i] === b[j]
          ? table[(i + 1) * cols + j + 1] + 1
          : Math.max(table[(i + 1) * cols + j], table[i * cols + j + 1]);
    }
  }
  const pairs: [number, number][] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      pairs.push([i, j]);
      i++;
      j++;
    } else if (table[(i + 1) * cols + j] >= table[i * cols + j + 1]) i++;
    else j++;
  }
  return pairs;
}

function other(
  part: Intl.NumberFormatPart,
  seen: Map<string, number>,
  out: Part[],
) {
  const n = seen.get(part.type) ?? 0;
  seen.set(part.type, n + 1);
  graphemes(part.value).forEach((char, i) => {
    out.push({ key: `${part.type}${n}:${i}`, char, role: "text" });
  });
}

/**
 * Keys each glyph by its place: integer digits count from the decimal point
 * leftwards, fraction digits rightwards, so 9 → 10 changes the units, rolls
 * the tens in and keeps every other digit where it is.
 */
export function byPlace(formatted: readonly Intl.NumberFormatPart[]): Part[] {
  const integers = formatted
    .filter((part) => part.type === "integer")
    .reduce((n, part) => n + graphemes(part.value).length, 0);
  const seen = new Map<string, number>();
  const out: Part[] = [];
  let integer = 0;
  let fraction = 0;
  for (const part of formatted) {
    if (part.type === "integer") {
      for (const char of graphemes(part.value)) {
        out.push({ key: `i${integers - 1 - integer++}`, char, role: "digit" });
      }
    } else if (part.type === "fraction") {
      for (const char of graphemes(part.value)) {
        out.push({ key: `f${fraction++}`, char, role: "digit" });
      }
    } else if (part.type === "group") {
      out.push({
        key: `g${integers - integer}`,
        char: part.value,
        role: "group",
      });
    } else if (part.type === "decimal") {
      out.push({ key: "d", char: part.value, role: "decimal" });
    } else other(part, seen, out);
  }
  return out;
}

/**
 * Keys digits the way a keypad types them: digits shared with the previous
 * amount keep their key, and separators are keyed by the digits before them,
 * so a group separator that moves leaves and comes back at its new place.
 */
export function byTyping(
  previous: readonly Part[],
  formatted: readonly Intl.NumberFormatPart[],
  generation: number,
): Part[] {
  const seen = new Map<string, number>();
  const out: Part[] = [];
  const digits: number[] = [];
  let before = 0;
  for (const part of formatted) {
    if (part.type === "integer" || part.type === "fraction") {
      for (const char of graphemes(part.value)) {
        digits.push(out.length);
        out.push({ key: "", char, role: "digit" });
        before++;
      }
    } else if (part.type === "group" || part.type === "decimal") {
      out.push({
        key: `${part.type}@${before}`,
        char: part.value,
        role: part.type,
      });
    } else other(part, seen, out);
  }
  const old = previous.filter((part) => part.role === "digit");
  const kept = new Map(
    lcs(
      old.map((part) => part.char),
      digits.map((index) => out[index].char),
    ).map(([i, j]) => [j, old[i].key]),
  );
  digits.forEach((index, j) => {
    out[index] = { ...out[index], key: kept.get(j) ?? `${generation}:${j}` };
  });
  return out;
}

/** Keys characters by a diff with the previous text, so shared ones stay put. */
export function byDiff(
  previous: readonly Part[],
  text: string,
  generation: number,
): Part[] {
  const chars = graphemes(text);
  const kept = new Map(
    lcs(
      previous.map((part) => part.char),
      chars,
    ).map(([i, j]) => [j, previous[i].key]),
  );
  return chars.map((char, j) => ({
    key: kept.get(j) ?? `${generation}:${j}`,
    char,
    role: "text",
  }));
}

export function digitCount(parts: readonly Part[]) {
  return parts.filter((part) => part.role === "digit").length;
}
