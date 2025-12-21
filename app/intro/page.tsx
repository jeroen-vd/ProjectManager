"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const TITLE_FADE_IN_MS = 500;
const TITLE_VISIBLE_MS = 1200;
const BLANK_DELAY_MS = 500;

export default function IntroPage() {
  const router = useRouter();
  const [titleVisible, setTitleVisible] = useState(false);
  const [showBlank, setShowBlank] = useState(false);

  useEffect(() => {
    const timeouts: number[] = [];
    timeouts.push(window.setTimeout(() => setTitleVisible(true), 60));
    timeouts.push(
      window.setTimeout(() => setTitleVisible(false), TITLE_VISIBLE_MS)
    );
    timeouts.push(
      window.setTimeout(() => setShowBlank(true), TITLE_VISIBLE_MS + TITLE_FADE_IN_MS)
    );
    timeouts.push(
      window.setTimeout(
        () => router.push("/step-1"),
        TITLE_VISIBLE_MS + TITLE_FADE_IN_MS + BLANK_DELAY_MS
      )
    );

    return () => {
      timeouts.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, [router]);

  return (
    <div
      className={
        "relative min-h-screen w-full overflow-hidden " +
        (showBlank
          ? "bg-white"
          : "bg-[radial-gradient(circle_at_top,_#fff7ed,_#f8fafc_45%,_#e2e8f0_100%)]")
      }
    >
      {!showBlank && (
        <div
          className="fixed inset-0 text-center"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <h1
            className={
              "text-4xl font-semibold uppercase tracking-[0.24em] text-slate-500 transition-opacity duration-500 sm:text-5xl " +
              (titleVisible ? "opacity-100" : "opacity-0")
            }
            style={{
              margin: 0,
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
            }}
          >
            Project Manager
          </h1>
        </div>
      )}
    </div>
  );
}
