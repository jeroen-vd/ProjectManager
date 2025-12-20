export default function Home() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff7ed,_#f8fafc_45%,_#e2e8f0_100%)] px-6 py-16 text-slate-900">
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-10">
        <header className="space-y-3">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
            Project Manager
          </p>
          <h1 className="text-4xl font-semibold leading-tight">
            Start een nieuw project.
          </h1>
          <p className="text-base text-slate-600">
            Geef een naam op zodat we direct een basis kunnen aanmaken.
          </p>
        </header>
        <form className="rounded-3xl border border-white/60 bg-white/70 p-8 shadow-xl shadow-slate-200 backdrop-blur">
          <label
            htmlFor="projectName"
            className="text-sm font-medium text-slate-700"
          >
            Projectnaam
          </label>
          <div className="mt-3 flex flex-col gap-4 sm:flex-row">
            <input
              id="projectName"
              name="projectName"
              type="text"
              placeholder="Bijv. Nieuwe klantportal"
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            />
            <button
              type="submit"
              className="h-12 shrink-0 rounded-2xl bg-slate-900 px-6 text-base font-semibold text-white shadow-lg shadow-slate-300 transition hover:-translate-y-0.5 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              Opslaan
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
