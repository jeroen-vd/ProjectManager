"use client";

import { useCallback, useState } from "react";

export type PopupTone = "info" | "success" | "warning" | "error";

export type PopupState = {
  title: string;
  message: string;
  tone: PopupTone;
};

export type NotifyOptions = {
  title?: string;
  tone?: PopupTone;
};

export type NotifyFn = (message: string, options?: NotifyOptions) => void;

export const useCenteredPopup = (defaultTitle = "Melding") => {
  const [popup, setPopup] = useState<PopupState | null>(null);

  const notify = useCallback<NotifyFn>(
    (message, options) => {
      setPopup({
        title: options?.title ?? defaultTitle,
        message,
        tone: options?.tone ?? "info",
      });
    },
    [defaultTitle]
  );

  const close = useCallback(() => setPopup(null), []);

  return { popup, notify, close };
};
