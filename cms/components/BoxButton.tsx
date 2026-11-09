"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markCollectedAction, markShippedAction } from "./boxActions";

/** One action on one box: "posted" or "handed over". Refreshes the list after. */
export function BoxButton({ orderId, kind, label, failed }: { orderId: number; kind: "shipped" | "collected"; label: string; failed: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState(false);
  return (
    <span className="md-boxbtn">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(false);
            const r = await (kind === "shipped" ? markShippedAction(orderId) : markCollectedAction(orderId)).catch(() => ({ ok: false }));
            if (r.ok) router.refresh();
            else setError(true);
          })
        }
      >
        {label}
      </button>
      {error ? <span role="status">{failed}</span> : null}
    </span>
  );
}
