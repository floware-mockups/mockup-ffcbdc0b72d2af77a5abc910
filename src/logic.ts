// WZ-2088: logica pura dei controlli del prototipo. La usano sia il template
// pubblicato (main.tsx) sia l'anteprima di FlowareHub, così i due si
// comportano allo stesso modo. Solo dati in memoria: nessuna rete, nessun backend.

export type MockupRow = string[];
export type MockupPageData = {
  columns: string[];
  rows: MockupRow[];
  view?: string;
  statusColumn?: number;
  chartColumn?: number;
};
export type MockupSort = { column: number; direction: 1 | -1 } | null;
export type MockupTableState = { search: string; status: string; sort: MockupSort };
export const emptyTableState: MockupTableState = { search: "", status: "", sort: null };

const statusName = /^(stato|status|fase|esito|priorit[aà])\b/i;
const valid = (index: unknown, length: number) =>
  typeof index === "number" && Number.isInteger(index) && index >= 0 && index < length;

/** Colonna degli stati: quella indicata, altrimenti la prima chiamata «Stato» (o simile). -1 se nessuna. */
export function statusColumnOf(page: MockupPageData): number {
  if (valid(page.statusColumn, page.columns.length)) return page.statusColumn as number;
  return page.columns.findIndex((c) => statusName.test(c.trim()));
}
/** Colonna del grafico a barre, -1 se la pagina non ha un grafico. */
export function chartColumnOf(page: MockupPageData): number {
  return valid(page.chartColumn, page.columns.length) ? (page.chartColumn as number) : -1;
}
/** Vista delle righe; il kanban senza colonna degli stati ricade sulle card. */
export function viewOf(page: MockupPageData): "table" | "cards" | "kanban" {
  if (page.view === "kanban") return statusColumnOf(page) >= 0 ? "kanban" : "cards";
  return page.view === "cards" ? "cards" : "table";
}

/** Valori distinti di una colonna, nell'ordine in cui compaiono. */
export function distinctValues(rows: readonly MockupRow[], column: number): string[] {
  if (column < 0) return [];
  const seen: string[] = [];
  for (const row of rows) {
    const value = (row[column] ?? "").trim();
    if (value && !seen.includes(value)) seen.push(value);
  }
  return seen;
}
/** Stato successivo nel ciclo dei valori presenti (il cambio stato di una riga). */
export function nextStatus(values: readonly string[], current: string): string {
  if (!values.length) return current;
  const at = values.indexOf(current.trim());
  return values[(at + 1) % values.length];
}

const fold = (text: string) =>
  text.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
const compare = (a: string, b: string) => {
  const na = Number(a.replace(/\./g, "").replace(",", "."));
  const nb = Number(b.replace(/\./g, "").replace(",", "."));
  if (a.trim() && b.trim() && Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
  return a.localeCompare(b, "it", { numeric: true, sensitivity: "base" });
};

/** Righe visibili con il loro indice originale: ricerca, filtro per stato, ordinamento. */
export function visibleRows(page: MockupPageData, state: MockupTableState) {
  const search = fold(state.search.trim());
  const status = statusColumnOf(page);
  const list = page.rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => !search || fold(row.join(" ")).includes(search))
    .filter(({ row }) => !state.status || status < 0 || (row[status] ?? "").trim() === state.status);
  const sort = state.sort;
  if (sort && valid(sort.column, page.columns.length))
    list.sort((a, b) => compare(a.row[sort.column] ?? "", b.row[sort.column] ?? "") * sort.direction || a.index - b.index);
  return list;
}
/** Clic sull'intestazione: crescente, decrescente, nessun ordinamento. */
export function toggleSort(sort: MockupSort, column: number): MockupSort {
  if (!sort || sort.column !== column) return { column, direction: 1 };
  return sort.direction === 1 ? { column, direction: -1 } : null;
}

/** Barre del grafico: quante righe per valore della colonna (al massimo 8 valori). */
export function chartBars(rows: readonly MockupRow[], column: number) {
  const counts = new Map<string, number>();
  for (const value of distinctValues(rows, column)) counts.set(value, 0);
  for (const row of rows) {
    const value = (row[column] ?? "").trim();
    if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  const bars = [...counts].slice(0, 8).map(([label, count]) => ({ label, count }));
  const max = Math.max(1, ...bars.map((b) => b.count));
  return bars.map((b) => ({ ...b, percent: Math.round((b.count / max) * 100) }));
}
/** Colonne del kanban: una per stato, con le righe visibili di quello stato. */
export function kanbanLanes(page: MockupPageData, items: ReturnType<typeof visibleRows>) {
  const status = statusColumnOf(page);
  return distinctValues(page.rows, status).map((value) => ({
    status: value,
    items: items.filter(({ row }) => (row[status] ?? "").trim() === value),
  }));
}

/** Righe dopo il cambio di stato della riga `index`. */
export function withNextStatus(page: MockupPageData, index: number): MockupRow[] {
  const status = statusColumnOf(page);
  if (status < 0) return page.rows;
  const values = distinctValues(page.rows, status);
  return page.rows.map((row, i) =>
    i === index ? row.map((cell, c) => (c === status ? nextStatus(values, cell) : cell)) : row,
  );
}
/** Riga nuova dal form: i campi riempiono le prime colonne, le altre prendono un valore sensato. */
export function rowFromForm(page: MockupPageData, fields: readonly string[]): MockupRow {
  const status = statusColumnOf(page);
  const first = distinctValues(page.rows, status)[0];
  return page.columns.map((_, i) => {
    const value = (fields[i] ?? "").trim();
    if (value) return value.slice(0, 120);
    return i === status && first ? first : "—";
  });
}
