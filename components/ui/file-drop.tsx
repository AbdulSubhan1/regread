"use client";

import { useState } from "react";
import { Icon } from "./icon";

type Props = {
  id: string;
  accept: string;
  disabled?: boolean;
  onFile: (file: File) => void;
  title: string;
  hint: string;
};

export function FileDrop({ id, accept, disabled, onFile, title, hint }: Props) {
  const [over, setOver] = useState(false);
  return (
    <label
      data-ui="FileDrop"
      htmlFor={id}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const file = e.dataTransfer.files[0];
        if (file && !disabled) onFile(file);
      }}
      className={`flex flex-col items-center justify-center gap-2 rounded-box border-2 border-dashed px-4 py-8 text-center transition-colors ${
        disabled
          ? "cursor-not-allowed border-line bg-paper text-ink-soft"
          : over
            ? "cursor-pointer border-brand bg-brand-soft"
            : "cursor-pointer border-ink-soft/40 bg-card hover:border-brand"
      }`}
    >
      <Icon name="upload" className="size-7 text-brand" />
      <span className="font-semibold">{title}</span>
      <span className="text-sm text-ink-soft">{hint}</span>
      <input
        id={id}
        type="file"
        accept={accept}
        disabled={disabled}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) onFile(file);
        }}
      />
    </label>
  );
}
