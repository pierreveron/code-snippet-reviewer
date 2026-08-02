"use client";

import { useState } from "react";

import { CreateSnippetModal } from "@/components/CreateSnippetModal";

type NewSnippetButtonProps = {
  className?: string;
  children?: React.ReactNode;
};

export function NewSnippetButton({
  className,
  children = "New snippet",
}: NewSnippetButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ??
          "inline-flex h-10 items-center justify-center rounded-lg bg-accent px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        }
      >
        {children}
      </button>
      <CreateSnippetModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
