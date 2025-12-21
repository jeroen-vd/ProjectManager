"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import lottie from "lottie-web";

export default function BootPage() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (reduceMotion) {
      router.push("/intro");
      return () => {
        document.body.style.overflow = previousOverflow;
      };
    }

    if (containerRef.current) {
      const animation = lottie.loadAnimation({
        container: containerRef.current,
        renderer: "svg",
        loop: false,
        autoplay: true,
        path: "/lottie/boot.json",
      });

      const handleComplete = () => {
        router.push("/intro");
      };

      animation.addEventListener("complete", handleComplete);

      return () => {
        document.body.style.overflow = previousOverflow;
        animation.removeEventListener("complete", handleComplete);
        animation.destroy();
      };
    }

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [router]);

  return (
    <div
      className={
        "relative min-h-screen w-full overflow-hidden bg-[radial-gradient(circle_at_top,_#fff7ed,_#f8fafc_45%,_#e2e8f0_100%)]"
      }
    >
      <div className="flex min-h-screen items-center justify-center">
        <div
          ref={containerRef}
          className="h-[42vh] w-[42vw] max-w-[440px] drop-shadow-[0_30px_60px_rgba(15,23,42,0.22)]"
        />
      </div>
    </div>
  );
}
