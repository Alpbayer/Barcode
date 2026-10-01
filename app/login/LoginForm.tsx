"use client";

import { useFormState, useFormStatus } from "react-dom";
import { login, type LoginState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="bg-black px-4 py-2 text-white disabled:opacity-50">
      {pending ? "Kontrol ediliyor…" : "Giriş"}
    </button>
  );
}

export default function LoginForm({ next }: { next?: string }) {
  const [state, formAction] = useFormState<LoginState, FormData>(login, { error: null });
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="next" value={next ?? ""} />
      <label className="flex flex-col text-sm">
        Şifre
        <input
          name="password"
          type="password"
          required
          autoFocus
          autoComplete="current-password"
          className="border px-3 py-2 text-base"
        />
      </label>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
