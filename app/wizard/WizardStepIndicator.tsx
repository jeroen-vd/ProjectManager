"use client";

type StepId = 1 | 2 | 3 | 4;

type Step = {
  id: StepId;
  label: string;
  detail: string;
};

const steps: Step[] = [
  { id: 1, label: "Project", detail: "Basisinfo" },
  { id: 2, label: "Context", detail: "Categorie + opstelling" },
  { id: 3, label: "Vragen", detail: "Flowmap" },
  { id: 4, label: "Componenten", detail: "Opbouw" },
];

type WizardStepIndicatorProps = {
  currentStep: StepId;
};

export default function WizardStepIndicator({
  currentStep,
}: WizardStepIndicatorProps) {
  const currentIndex = steps.findIndex((step) => step.id === currentStep);
  const nextStep = steps[currentIndex + 1] ?? null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 px-5 py-4 text-sm text-slate-600 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          Voortgang
        </p>
        <p className="text-xs font-semibold text-slate-600">
          Stap {currentStep} van {steps.length}
        </p>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-4">
        {steps.map((step) => {
          const isActive = step.id === currentStep;
          const isDone = step.id < currentStep;
          const badgeClasses = isActive
            ? "border-slate-900 bg-slate-900 text-white"
            : isDone
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-slate-200 bg-white text-slate-500";
          return (
            <div
              key={step.id}
              className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2"
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold ${badgeClasses}`}
              >
                {step.id}
              </span>
              <div>
                <p className="text-xs font-semibold text-slate-700">
                  {step.label}
                </p>
                <p className="text-[11px] text-slate-400">{step.detail}</p>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] text-slate-500">
        {nextStep
          ? `Volgende stap: ${nextStep.label}`
          : "Laatste stap, je kunt afronden."}
      </p>
    </div>
  );
}
