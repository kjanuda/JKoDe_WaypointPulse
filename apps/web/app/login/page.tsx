
"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth/AuthProvider";
import { rolePath } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();

  const {
    user,
    loading: authLoading,
    signIn,
  } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      router.replace(rolePath(user.role));
    }
  }, [
    authLoading,
    user,
    router,
  ]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const signedInUser = await signIn(
        email,
        password
      );

      router.replace(
        rolePath(signedInUser.role)
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to sign in"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-6 py-12">
        <div className="grid w-full max-w-5xl overflow-hidden rounded-[32px] border border-white/10 bg-zinc-900 shadow-2xl lg:grid-cols-[1.1fr_0.9fr]">
          <section className="hidden min-h-[650px] flex-col justify-between bg-gradient-to-br from-zinc-800 to-black p-12 lg:flex">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                Team JKoDe
              </p>

              <h1 className="mt-6 max-w-md text-5xl font-semibold leading-tight">
                Waypoint Pulse
              </h1>

              <p className="mt-5 max-w-md text-base leading-7 text-zinc-400">
                Explainable delivery planning,
                resilient execution and connected
                logistics operations.
              </p>
            </div>

            <div>
              <p className="text-sm text-zinc-500">
                Plan. Explain. Deliver. Recover.
              </p>
            </div>
          </section>

          <section className="flex min-h-[650px] items-center p-7 sm:p-10 lg:p-12">
            <div className="w-full">
              <div className="mb-10">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">
                  Secure access
                </p>

                <h2 className="mt-3 text-3xl font-semibold">
                  Sign in
                </h2>

                <p className="mt-3 text-sm leading-6 text-zinc-400">
                  Use your assigned Waypoint role account.
                </p>
              </div>

              <form
                onSubmit={handleSubmit}
                className="space-y-5"
              >
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm text-zinc-300"
                  >
                    Email
                  </label>

                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    placeholder="name@waypoint.demo"
                    className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3.5 text-sm outline-none transition placeholder:text-zinc-600 focus:border-white/30"
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm text-zinc-300"
                  >
                    Password
                  </label>

                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    placeholder="Enter your password"
                    className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3.5 text-sm outline-none transition placeholder:text-zinc-600 focus:border-white/30"
                  />
                </div>

                {error && (
                  <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || authLoading}
                  className="w-full rounded-2xl bg-white px-5 py-3.5 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading
                    ? "Signing in..."
                    : "Sign in"}
                </button>
              </form>

              <div className="mt-10 border-t border-white/10 pt-6">
                <p className="text-xs leading-5 text-zinc-500">
                  Access is restricted according to
                  your assigned operational role.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

