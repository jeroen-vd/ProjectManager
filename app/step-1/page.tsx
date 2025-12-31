"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWizard } from "../wizard/WizardContext";
import WizardStepIndicator from "../wizard/WizardStepIndicator";

export default function StepOne() {
  const router = useRouter();
  const { projectInfo, setProjectInfo } = useWizard();
  const [form, setForm] = useState(projectInfo);

  const handleChange = (field: keyof typeof projectInfo, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const isValid = Object.values(form).every((value) => value.trim().length > 0);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isValid) {
      return;
    }
    setProjectInfo(form);
    router.push("/step-2");
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff7ed,_#f8fafc_45%,_#e2e8f0_100%)] px-6 py-16 text-slate-900">
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-10">
        <header className="space-y-3">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
            Project Manager
          </p>
          <h1 className="text-4xl font-semibold leading-tight">
            Stap 1 - Projectinformatie
          </h1>
          <p className="text-base text-slate-600">
            Vul de basisgegevens in om de wizard te starten.
          </p>
        </header>
        <WizardStepIndicator currentStep={1} />
        <form
          className="rounded-3xl border border-white/60 bg-white/70 p-8 shadow-xl shadow-slate-200 backdrop-blur"
          onSubmit={handleSubmit}
        >
          <div className="grid gap-6 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              Project nummer
              <input
                type="text"
                value={form.projectNumber}
                onChange={(event) =>
                  handleChange("projectNumber", event.target.value)
                }
                placeholder="Bijv. PR-2025-001"
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                required
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              Project naam
              <input
                type="text"
                value={form.projectName}
                onChange={(event) =>
                  handleChange("projectName", event.target.value)
                }
                placeholder="Bijv. Nieuwe klantportal"
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                required
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              Aannemer
              <input
                type="text"
                value={form.contractor}
                onChange={(event) =>
                  handleChange("contractor", event.target.value)
                }
                placeholder="Bijv. Bouwgroep Noord"
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                required
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              Eindklant
              <input
                type="text"
                value={form.endCustomer}
                onChange={(event) =>
                  handleChange("endCustomer", event.target.value)
                }
                placeholder="Bijv. Gemeente Stad"
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                required
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
              Werf adres
              <input
                type="text"
                value={form.siteAddress}
                onChange={(event) =>
                  handleChange("siteAddress", event.target.value)
                }
                placeholder="Straat en nummer, postcode, stad"
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                required
              />
            </label>
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="submit"
              disabled={!isValid}
              className="h-12 rounded-2xl bg-slate-900 px-8 text-base font-semibold text-white shadow-lg shadow-slate-300 transition hover:-translate-y-0.5 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-70"
            >
              Volgende stap
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
