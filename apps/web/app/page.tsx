"use client";

import Link from "next/link";

const roles = [
  {
    title: "Dispatcher",
    route: "/dispatcher",
    eyebrow: "Plan",
    description:
      "Generate delivery plans, review trips, monitor utilization, and understand deferrals.",
    meta: "Control tower",
  },
  {
    title: "Loader",
    route: "/loader",
    eyebrow: "Verify",
    description:
      "Check assigned loads, verify stock, record shortfalls, and release vehicles for dispatch.",
    meta: "Depot operations",
  },
  {
    title: "Driver",
    route: "/driver",
    eyebrow: "Deliver",
    description:
      "Follow the route, record arrivals, capture proof of delivery, and continue working offline.",
    meta: "Mobile delivery",
  },
  {
    title: "Store Manager",
    route: "/store",
    eyebrow: "Confirm",
    description:
      "Review delivered orders, inspect delivery details, and confirm receipt at the outlet.",
    meta: "Store receiving",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f4f4f2] text-neutral-950">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* HERO */}
        <section className="overflow-hidden rounded-[36px] bg-neutral-950 text-white">
          <div className="px-6 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-400">
                  Waypoint Pulse
                </p>

                <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
                  Plan. Explain.
                  <br />
                  Deliver. Recover.
                </h1>

                <p className="mt-5 max-w-2xl text-sm leading-6 text-neutral-400 sm:text-base">
                  A connected logistics
                  control tower for
                  planning, loading,
                  delivery, offline
                  recovery, and store
                  receipt confirmation.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
                <Stat
                  label="Roles"
                  value="4"
                />

                <Stat
                  label="Workflow"
                  value="End-to-end"
                />

                <Stat
                  label="Offline"
                  value="Enabled"
                />

                <Stat
                  label="Status"
                  value="Live"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 px-6 py-4 sm:px-8 lg:px-12">
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-neutral-400">
              <span>
                Dispatcher
              </span>

              <span>
                Loader
              </span>

              <span>
                Driver
              </span>

              <span>
                Store Manager
              </span>
            </div>
          </div>
        </section>

        {/* INTRO */}
        <section className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">
              Workspace
            </p>

            <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">
              Choose your role
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
              Each role sees only the
              workflow required for its
              operational task while all
              updates remain connected
              through the same plan.
            </p>
          </div>

          <div className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-xs font-medium text-neutral-600 shadow-sm">
            Peliyagoda demo flow
          </div>
        </section>

        {/* ROLE CARDS */}
        <section className="mt-6 grid gap-4 md:grid-cols-2">
          {roles.map(
            (role, index) => (
              <Link
                key={role.route}
                href={role.route}
                className="group rounded-[30px] border border-neutral-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-neutral-300 hover:shadow-md sm:p-7"
              >
                <div className="flex items-start justify-between gap-5">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
                      {role.eyebrow}
                    </p>

                    <h3 className="mt-2 text-2xl font-semibold">
                      {role.title}
                    </h3>
                  </div>

                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-950 text-sm font-medium text-white transition group-hover:translate-x-1">
                    →
                  </div>
                </div>

                <p className="mt-5 max-w-xl text-sm leading-6 text-neutral-500">
                  {
                    role.description
                  }
                </p>

                <div className="mt-7 flex items-center justify-between border-t border-neutral-100 pt-4">
                  <span className="text-xs text-neutral-400">
                    {
                      role.meta
                    }
                  </span>

                  <span className="text-xs font-medium text-neutral-700">
                    Open workspace
                  </span>
                </div>

                <div className="mt-4 flex h-1 overflow-hidden rounded-full bg-neutral-100">
                  <div
                    className="h-full bg-neutral-950"
                    style={{
                      width:
                        index === 0
                          ? "100%"
                          : index === 1
                            ? "82%"
                            : index === 2
                              ? "64%"
                              : "46%",
                    }}
                  />
                </div>
              </Link>
            ),
          )}
        </section>

        {/* WORKFLOW */}
        <section className="mt-8 rounded-[32px] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">
                Workflow
              </p>

              <h2 className="mt-2 text-2xl font-semibold">
                One connected delivery loop
              </h2>
            </div>

            <span className="text-xs text-neutral-400">
              Waypoint Pulse
            </span>
          </div>

          <div className="mt-7 grid gap-3 md:grid-cols-4">
            <WorkflowStep
              number="01"
              title="Plan"
              text="Dispatcher generates and reviews feasible delivery plans."
            />

            <WorkflowStep
              number="02"
              title="Load"
              text="Loader verifies stock and marks the vehicle ready."
            />

            <WorkflowStep
              number="03"
              title="Deliver"
              text="Driver completes the route with offline recovery."
            />

            <WorkflowStep
              number="04"
              title="Confirm"
              text="Store manager confirms receipt and closes the loop."
            />
          </div>
        </section>

        {/* FOOTER */}
        <footer className="mt-8 flex flex-col gap-2 border-t border-neutral-200 py-6 text-xs text-neutral-400 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Waypoint Pulse
          </span>

          <span>
            Tech-Triathlon 2026 · Team JKoDe
          </span>
        </footer>
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-[120px] rounded-2xl bg-white/10 p-4">
      <p className="text-[9px] uppercase tracking-wider text-neutral-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold text-white">
        {value}
      </p>
    </div>
  );
}

function WorkflowStep({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-3xl bg-neutral-50 p-5">
      <p className="text-xs font-semibold text-neutral-400">
        {number}
      </p>

      <h3 className="mt-3 text-lg font-semibold">
        {title}
      </h3>

      <p className="mt-2 text-xs leading-5 text-neutral-500">
        {text}
      </p>
    </div>
  );
}