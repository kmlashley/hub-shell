"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteAdvisorButton({
  advisorId,
  advisorName,
}: {
  advisorId: string;
  advisorName: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    await fetch(`/api/advisors/${advisorId}`, { method: "DELETE" });
    router.push("/intelligence/advisors");
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2 shrink-0">
        <p className="text-xs text-muted">Remove {advisorName}?</p>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-xs bg-accent text-white px-3 py-1.5 hover:bg-accent-hover disabled:opacity-40 transition-colors"
        >
          {deleting ? "Removing…" : "Yes, remove"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-xs text-muted hover:text-dark"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-xs text-muted hover:text-accent transition-colors shrink-0"
    >
      Remove advisor
    </button>
  );
}
