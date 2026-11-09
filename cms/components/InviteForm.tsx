"use client";

import { useState, useTransition } from "react";
import { inviteAction } from "./inviteActions";

type Words = {
  name: string; email: string; role: string; owner: string; manager: string; send: string;
  /** "{email}" is replaced with the address. */
  sent: string; manual: string; copy: string; copied: string;
  errors: Record<"invalid" | "forbidden" | "exists" | "generic", string>;
};

/** Name, email, role; then either "sent" or the link to pass on by hand. */
export function InviteForm({ w }: { w: Words }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ link: string; sent: boolean; email: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const submit = (form: FormData) =>
    start(async () => {
      setError(null);
      setResult(null);
      setCopied(false);
      const email = String(form.get("email") ?? "");
      const r = await inviteAction({ name: String(form.get("name") ?? ""), email, role: String(form.get("role")) as "manager" }).catch(() => ({ ok: false as const, error: "generic" }));
      if (r.ok) setResult({ link: r.link, sent: r.sent, email });
      else setError(w.errors[(r.error as keyof Words["errors"]) in w.errors ? (r.error as keyof Words["errors"]) : "generic"]);
    });
  return (
    <form action={submit} className="md-form">
      <label>
        <span>{w.name}</span>
        <input name="name" required maxLength={80} autoComplete="off" />
      </label>
      <label>
        <span>{w.email}</span>
        <input name="email" type="email" required maxLength={200} autoComplete="off" />
      </label>
      <fieldset>
        <legend>{w.role}</legend>
        <label className="md-radio"><input type="radio" name="role" value="manager" defaultChecked /> {w.manager}</label>
        <label className="md-radio"><input type="radio" name="role" value="owner" /> {w.owner}</label>
      </fieldset>
      <button type="submit" disabled={pending}>{w.send}</button>
      <div role="status" className="md-result">
        {error ? <p>{error}</p> : null}
        {result?.sent ? <p>{w.sent.replace("{email}", result.email)}</p> : null}
        {result && !result.sent ? (
          <>
            <p>{w.manual}</p>
            <p className="md-link">{result.link}</p>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(result.link).then(() => setCopied(true)).catch(() => undefined)}
            >
              {copied ? w.copied : w.copy}
            </button>
          </>
        ) : null}
      </div>
    </form>
  );
}
