"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function UserAgentCell({ value }: { value: string | null }) {
  const [open, setOpen] = useState(false);

  if (!value) return <span className="text-xs text-muted-foreground">-</span>;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="max-w-[120px] truncate text-xs text-muted-foreground hover:text-foreground cursor-pointer text-left"
      >
        {value}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User Agent</DialogTitle>
          </DialogHeader>
          <p className="text-sm break-all">{value}</p>
        </DialogContent>
      </Dialog>
    </>
  );
}
