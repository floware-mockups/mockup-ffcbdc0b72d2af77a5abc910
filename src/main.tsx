import { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import rawSeed from "./spec.json";
type MockupData = {title:string;description:string;accent:string;theme?:{palette:string;fonts:string};resetPlacement?:string;navigation?:string;pages:{id:string;title:string;description:string;metrics:{label:string;value:string}[];columns:string[];rows:string[][];form:string[];sections?:string[];view?:string;statusColumn?:number;chartColumn?:number}[]};
const seed: MockupData = rawSeed;
import "./style.css";
import "./theme.css";
import {
  chartBars,
  chartColumnOf,
  distinctValues,
  emptyTableState,
  kanbanLanes,
  rowFromForm,
  statusColumnOf,
  toggleSort,
  viewOf,
  visibleRows,
  withNextStatus,
  type MockupTableState,
} from "./logic";
// WZ-2039: palette e font sono token CSS (theme.css); la struttura non cambia.
// Senza tema resta l'aspetto storico, con l'accento scelto dal modello.
const theme = Reflect.get(seed, "theme") as
  { palette: string; fonts: string } | undefined;
document.documentElement.dataset.accent = seed.accent;
if (theme) {
  document.documentElement.dataset.palette = theme.palette;
  document.documentElement.dataset.fonts = theme.fonts;
  // Solo la coppia scelta viene scaricata (font OFL incorporati, vedi fonts/OFL.txt).
  const fonts = import.meta.glob("./fonts/*.css");
  void fonts[`./fonts/${theme.fonts}.css`]?.();
}
const color = "bg-(--mk-primary) text-(--mk-on-primary)";
const card = "rounded-xl border border-(--mk-divider) bg-(--mk-surface) shadow-sm";
const field = "rounded-md border border-(--mk-border) bg-(--mk-surface) px-3 py-2";
// WZ-2037: campi opzionali della specifica; in assenza valgono ordine e
// posizione storici.
const defaultSections = ["metrics", "table", "form"];
const sectionsOf = (page: object): string[] => {
  const sections = (page as { sections?: unknown }).sections;
  return Array.isArray(sections) && sections.length === 3
    ? sections
    : defaultSections;
};
const resetPlacement =
  Reflect.get(seed, "resetPlacement") === "top" ? "top" : "bottom";
// WZ-2088: navigazione in alto o laterale (predefinita).
const topNavigation = Reflect.get(seed, "navigation") === "top";
function App() {
  const [pages, setPages] = useState(structuredClone(seed.pages));
  const [active, setActive] = useState(
    location.hash.slice(1) || seed.pages[0].id,
  );
  const [table, setTable] = useState<MockupTableState>(emptyTableState);
  const [detail, setDetail] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  useEffect(() => {
    const changed = () => {
      setActive(location.hash.slice(1));
      setTable(emptyTableState);
      setDetail(null);
      setMessage("");
    };
    window.addEventListener("hashchange", changed);
    return () => window.removeEventListener("hashchange", changed);
  }, []);
  useEffect(() => {
    if (detail === null) return;
    const close = (e: KeyboardEvent) => e.key === "Escape" && setDetail(null);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [detail]);
  const page = pages.find((p) => p.id === active) ?? pages[0];
  const setRows = (rows: string[][], done: string) => {
    setPages(pages.map((p) => (p.id === page.id ? { ...p, rows } : p)));
    setMessage(done);
  };
  const status = statusColumnOf(page);
  const statuses = distinctValues(page.rows, status);
  const items = visibleRows(page, table);
  const view = viewOf(page);
  const chart = chartColumnOf(page);
  const actions = (index: number) => (
    <div className="flex flex-wrap gap-3 text-sm">
      {status >= 0 && statuses.length > 1 && (
        <button
          className="font-medium text-(--mk-primary)"
          onClick={() => setRows(withNextStatus(page, index), "Stato aggiornato nella demo")}
        >
          Cambia stato
        </button>
      )}
      <button className="font-medium text-(--mk-primary)" onClick={() => setDetail(index)}>
        Dettaglio
      </button>
      <button
        className="font-medium text-(--mk-danger)"
        onClick={() => {
          setRows(page.rows.filter((_, i) => i !== index), "Elemento rimosso dalla demo");
          setDetail(null);
        }}
      >
        Rimuovi
      </button>
    </div>
  );
  const rowCard = (row: string[], index: number) => (
    <article key={index} className={`${card} grid gap-2 p-4`}>
      <h4 className="font-semibold">{row[0]}</h4>
      <dl className="grid gap-1 text-sm">
        {row.slice(1).map((cell, i) => (
          <div key={i} className="flex justify-between gap-3">
            <dt className="text-(--mk-muted)">{page.columns[i + 1]}</dt>
            <dd className="text-right">{cell}</dd>
          </div>
        ))}
      </dl>
      {actions(index)}
    </article>
  );
  const resetButton = (
    <button
      className="mt-4 rounded border border-(--mk-sidebar-muted) px-3 py-2 text-sm"
      onClick={() => {
        setPages(structuredClone(seed.pages));
        setTable(emptyTableState);
        setDetail(null);
        setMessage("Dati dimostrativi ripristinati");
      }}
    >
      Ripristina demo
    </button>
  );
  const navigation = (
    <nav
      aria-label="Schermate"
      className={topNavigation ? "flex flex-wrap gap-2" : "mt-8 flex flex-wrap gap-2 md:flex-col"}
    >
      {pages.map((p) => (
        <a
          key={p.id}
          href={`#${p.id}`}
          aria-current={page.id === p.id ? "page" : undefined}
          className={`rounded-lg px-4 py-3 text-sm font-medium ${page.id === p.id ? "bg-(--mk-nav-active) text-(--mk-on-nav-active)" : "hover:bg-(--mk-sidebar-hover)"}`}
        >
          {p.title}
        </a>
      ))}
    </nav>
  );
  const notice = (
    <p className={`${topNavigation ? "" : "mt-8 "}text-xs leading-relaxed text-(--mk-sidebar-muted)`}>
      Prototipo pubblico · Dati di esempio: Floware sostituisce i dati
      personali più comuni con dati inventati e maschera codici fiscali e
      IBAN. Le modifiche durano soltanto in questa sessione.
    </p>
  );
  const shown = detail === null ? undefined : page.rows[detail];
  return (
    <div className={`min-h-screen bg-(--mk-bg) text-(--mk-text) ${topNavigation ? "" : "md:flex"}`}>
      <aside
        className={
          topNavigation
            ? "border-b border-(--mk-divider) bg-(--mk-sidebar) px-6 py-4 text-(--mk-on-sidebar)"
            : "border-b border-(--mk-divider) bg-(--mk-sidebar) p-6 text-(--mk-on-sidebar) md:min-h-screen md:w-64 md:border-r"
        }
      >
        {resetPlacement === "top" && <div className="mb-5">{resetButton}</div>}
        <div className={topNavigation ? "flex flex-wrap items-center gap-x-6 gap-y-3" : ""}>
          <div
            className={`${topNavigation ? "" : "mb-5 "}inline-flex h-10 w-10 items-center justify-center rounded-xl font-bold ${color}`}
          >
            M
          </div>
          <div>
        <h1 data-testid="mockup-title" className="text-xl font-bold">{seed.title}</h1>
            <p className={`${topNavigation ? "" : "mt-2 "}text-sm text-(--mk-sidebar-muted)`}>
              {seed.description}
            </p>
          </div>
          {navigation}
        </div>
        {notice}
        {resetPlacement === "bottom" && resetButton}
      </aside>
      <main className="mx-auto w-full max-w-6xl p-5 md:p-10">
        <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-(--mk-primary)">
          Spazio dimostrativo ·{" "}
          <span data-testid="mockup-sample-data">Dati di esempio</span>
        </p>
        <h2 className="text-3xl font-bold">{page.title}</h2>
        <p className="mt-2 text-(--mk-muted)">{page.description}</p>
        {sectionsOf(page).map((section) => (
          <div key={section} data-section={section}>
            {section === "metrics" && (
              <div className="my-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {page.metrics.map((m, i) => (
                  <div key={i} className={`${card} p-5`}>
                    <p className="text-sm text-(--mk-muted)">{m.label}</p>
                    <p className="mt-3 text-3xl font-semibold">{m.value}</p>
                  </div>
                ))}
              </div>
            )}
            {section === "table" && page.columns.length > 0 && (
              <>
                {chart >= 0 && (
                  <section aria-label={`Grafico per ${page.columns[chart]}`} className={`${card} mb-6 p-5`}>
                    <h3 className="mb-4 font-semibold">{page.columns[chart]}</h3>
                    <div className="grid gap-2">
                      {chartBars(page.rows, chart).map((bar) => (
                        <div key={bar.label} className="grid grid-cols-[8rem_1fr_2rem] items-center gap-3 text-sm">
                          <span className="truncate">{bar.label}</span>
                          <span className="h-3 rounded bg-(--mk-subtle)">
                            <span className={`block h-3 rounded ${color}`} style={{ width: `${bar.percent}%` }} />
                          </span>
                          <span className="text-right">{bar.count}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
                <section className={`overflow-hidden ${card}`}>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-(--mk-divider) p-5">
                    <h3 className="font-semibold">Elenco</h3>
                    <div className="flex flex-wrap gap-3 text-sm">
                      <label>
                        Cerca{" "}
                        <input
                          className={`ml-2 ${field}`}
                          value={table.search}
                          onChange={(e) => setTable({ ...table, search: e.target.value })}
                          placeholder="Cerca nel prototipo"
                        />
                      </label>
                      {statuses.length > 1 && (
                        <label>
                          {page.columns[status]}{" "}
                          <select
                            className={`ml-2 ${field}`}
                            value={table.status}
                            onChange={(e) => setTable({ ...table, status: e.target.value })}
                          >
                            <option value="">Tutti</option>
                            {statuses.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                    </div>
                  </div>
                  {view === "table" && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-(--mk-subtle)">
                          <tr>
                            {page.columns.map((c, i) => (
                              <th
                                key={i}
                                className="px-5 py-3"
                                aria-sort={table.sort?.column === i ? (table.sort.direction === 1 ? "ascending" : "descending") : undefined}
                              >
                                <button onClick={() => setTable({ ...table, sort: toggleSort(table.sort, i) })}>
                                  {c}
                                  {table.sort?.column === i ? (table.sort.direction === 1 ? " ↑" : " ↓") : ""}
                                </button>
                              </th>
                            ))}
                            <th className="px-5 py-3">Azioni</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map(({ row, index }) => (
                            <tr key={index} className="border-t border-(--mk-divider)">
                              {row.map((cell, i) => (
                                <td key={i} className="px-5 py-4">
                                  {cell}
                                </td>
                              ))}
                              <td className="px-5 py-4">{actions(index)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {view === "cards" && (
                    <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
                      {items.map(({ row, index }) => rowCard(row, index))}
                    </div>
                  )}
                  {view === "kanban" && (
                    <div className="grid gap-4 overflow-x-auto p-5 md:grid-flow-col md:auto-cols-[minmax(14rem,1fr)]">
                      {kanbanLanes(page, items).map((lane) => (
                        <section key={lane.status} aria-label={lane.status} className="grid content-start gap-3 rounded-xl bg-(--mk-subtle) p-3">
                          <h4 className="font-semibold">
                            {lane.status} · {lane.items.length}
                          </h4>
                          {lane.items.map(({ row, index }) => rowCard(row, index))}
                        </section>
                      ))}
                    </div>
                  )}
                  {items.length === 0 && (
                    <p className="p-5 text-(--mk-muted)">Nessun elemento trovato.</p>
                  )}
                </section>
              </>
            )}
            {section === "form" && page.form.length > 0 && (
              <section className={`mt-6 ${card} p-5`}>
                <h3 className="mb-4 font-semibold">Aggiungi un esempio inventato</h3>
                <form
                  key={page.id}
                  className="grid gap-4 sm:grid-cols-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const data = new FormData(form);
                    const row = rowFromForm(
                      page,
                      page.form.map((_, i) => String(data.get(`field-${i}`) ?? "")),
                    );
                    setRows([...page.rows, row], "Esempio aggiunto nella sessione");
                    form.reset();
                  }}
                >
                  {page.form.map((f, i) => (
                    <label key={i} className="grid gap-2 text-sm">
                      {f}
                      <input required maxLength={120} name={`field-${i}`} className={field} autoComplete="off" />
                    </label>
                  ))}
                  <div className="sm:col-span-2">
                    <button type="submit" className={`rounded-lg px-5 py-2.5 font-medium ${color}`}>
                      Aggiungi
                    </button>
                  </div>
                </form>
              </section>
            )}
          </div>
        ))}
        <p role="status" className="mt-5 text-sm text-(--mk-muted)">
          {message}
        </p>
      </main>
      {shown && (
        <div className="fixed inset-0 z-10 grid place-items-center bg-black/40 p-4" onClick={() => setDetail(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Dettaglio di ${shown[0]}`}
            className={`${card} w-full max-w-md p-6`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 text-lg font-semibold">{shown[0]}</h3>
            <dl className="grid gap-2 text-sm">
              {page.columns.map((c, i) => (
                <div key={i} className="flex justify-between gap-3">
                  <dt className="text-(--mk-muted)">{c}</dt>
                  <dd className="text-right">{shown[i]}</dd>
                </div>
              ))}
            </dl>
            <button autoFocus className={`mt-6 rounded-lg px-4 py-2 ${color}`} onClick={() => setDetail(null)}>
              Chiudi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
