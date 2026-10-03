"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type OrderInfo = {
  id: number;
  delivery_id: string;
  outlet_id: string;
  brand: string;
  district: string;
  temp_requirement: string;
  weight_kg: number;
  volume_m3: number;
  window_open: string | null;
  window_close: string | null;
};

type Stop = {
  stop_id: number;
  sequence: number;
  status: string;

  arrival_time?: string | null;
  window_open?: string | null;
  window_close?: string | null;
  waiting_minutes?: number;

  order: OrderInfo;
};

type Trip = {
  trip_id: number;
  vehicle_id: string;
  trip_number: number;
  brand: string;
  district: string;

  total_weight_kg: number;
  total_volume_m3: number;
  estimated_minutes: number;

  distance_km?: number;
  fuel_l?: number;

  trip_start?: string | null;
  trip_end?: string | null;

  status: string;

  stops: Stop[];
};

type Deferral = {
  id: number;
  delivery_id: string;
  outlet_id: string;
  brand: string;
  district: string;
  reason_code: string;
  explanation?: string | null;
  consecutive_deferrals?: number;
};

type Plan = {
  id: number;
  plan_date: string;
  depot: string;
  status: string;
  version: number;
  trip_count: number;
  deferral_count: number;
  trips: Trip[];
  deferrals: Deferral[];
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

function formatNumber(value: number, digits = 1) {
  return Number(value || 0).toLocaleString(undefined, {
    maximumFractionDigits: digits,
  });
}

function StatCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper?: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">
        {label}
      </p>

      <p className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">
        {value}
      </p>

      {helper && (
        <p className="mt-2 text-xs leading-5 text-neutral-500">
          {helper}
        </p>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();

  let classes =
    "border-neutral-200 bg-neutral-50 text-neutral-700";

  if (
    normalized === "planned" ||
    normalized === "confirmed" ||
    normalized === "completed"
  ) {
    classes =
      "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (normalized === "draft") {
    classes =
      "border-amber-200 bg-amber-50 text-amber-700";
  }

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${classes}`}
    >
      {status}
    </span>
  );
}

export default function DispatcherPage() {
  const [plan, setPlan] = useState<Plan | null>(null);

  const [loading, setLoading] = useState(true);
  const [replanning, setReplanning] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [expandedTrip, setExpandedTrip] = useState<number | null>(
    null,
  );

  const depot = "Peliyagoda";
  const planDate = "2025-10-02";

  const loadLatestPlan = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${API_BASE}/api/plans/latest?depot=${encodeURIComponent(
          depot,
        )}`,
        {
          cache: "no-store",
        },
      );

      if (!response.ok) {
        throw new Error(
          `Unable to load plan (${response.status})`,
        );
      }

      const data: Plan = await response.json();

      setPlan(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load the latest plan.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLatestPlan();
  }, [loadLatestPlan]);

  async function handleReplan() {
    try {
      setReplanning(true);
      setError(null);

      const response = await fetch(
        `${API_BASE}/api/planner/generate?plan_date=${planDate}&depot=${encodeURIComponent(
          depot,
        )}`,
        {
          method: "POST",
        },
      );

      if (!response.ok) {
        const text = await response.text();

        throw new Error(
          text || `Planner failed (${response.status})`,
        );
      }

      await loadLatestPlan();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to generate a new plan.",
      );
    } finally {
      setReplanning(false);
    }
  }

  const servedOrders = useMemo(() => {
    if (!plan) {
      return 0;
    }

    return plan.trips.reduce(
      (total, trip) => total + trip.stops.length,
      0,
    );
  }, [plan]);

  const totalOrders = servedOrders + (plan?.deferral_count ?? 0);

  const usedVehicles = useMemo(() => {
    if (!plan) {
      return 0;
    }

    return new Set(plan.trips.map((trip) => trip.vehicle_id)).size;
  }, [plan]);

  const totalDistance = useMemo(() => {
    if (!plan) {
      return 0;
    }

    return plan.trips.reduce(
      (sum, trip) => sum + Number(trip.distance_km ?? 0),
      0,
    );
  }, [plan]);

  const totalFuel = useMemo(() => {
    if (!plan) {
      return 0;
    }

    return plan.trips.reduce(
      (sum, trip) => sum + Number(trip.fuel_l ?? 0),
      0,
    );
  }, [plan]);

  if (loading) {
    return (
      <main className="min-h-screen bg-neutral-50">
        <div className="mx-auto max-w-7xl px-5 py-10">
          <div className="animate-pulse">
            <div className="h-8 w-64 rounded bg-neutral-200" />
            <div className="mt-3 h-4 w-96 rounded bg-neutral-200" />

            <div className="mt-8 grid gap-4 md:grid-cols-4">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="h-32 rounded-2xl bg-neutral-200"
                />
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!plan) {
    return (
      <main className="min-h-screen bg-neutral-50">
        <div className="mx-auto max-w-4xl px-5 py-16">
          <div className="rounded-3xl border border-neutral-200 bg-white p-8">
            <h1 className="text-2xl font-semibold">
              No delivery plan found
            </h1>

            <p className="mt-3 text-sm text-neutral-500">
              Generate the delivery plan for Peliyagoda.
            </p>

            {error && (
              <p className="mt-4 text-sm text-red-600">{error}</p>
            )}

            <button
              onClick={handleReplan}
              disabled={replanning}
              className="mt-6 rounded-xl bg-neutral-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {replanning ? "Generating..." : "Generate Plan"}
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f7f7] text-neutral-950">
      <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col gap-5 border-b border-neutral-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
                Waypoint Pulse
              </p>

              <StatusBadge status={plan.status} />
            </div>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
              Dispatcher Control Tower
            </h1>

            <p className="mt-2 text-sm text-neutral-500">
              {plan.depot} Depot · {plan.plan_date} · Plan v
              {plan.version}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={loadLatestPlan}
              className="rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium transition hover:bg-neutral-50"
            >
              Refresh
            </button>

            <button
              onClick={handleReplan}
              disabled={replanning}
              className="rounded-xl bg-neutral-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {replanning ? "Re-planning..." : "Generate New Plan"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Summary */}
        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard
            label="Orders"
            value={totalOrders}
            helper="Orders considered today"
          />

          <StatCard
            label="Served"
            value={servedOrders}
            helper={`${formatNumber(
              totalOrders ? (servedOrders / totalOrders) * 100 : 0,
              0,
            )}% service rate`}
          />

          <StatCard
            label="Deferred"
            value={plan.deferral_count}
            helper="Requires dispatcher review"
          />

          <StatCard
            label="Trips"
            value={plan.trip_count}
            helper={`${usedVehicles} vehicles used`}
          />

          <StatCard
            label="Distance"
            value={`${formatNumber(totalDistance, 0)} km`}
            helper="Estimated total route distance"
          />

          <StatCard
            label="Fuel"
            value={`${formatNumber(totalFuel, 1)} L`}
            helper="Estimated plan consumption"
          />
        </section>

        {/* Main content */}
        <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_360px]">
          {/* Trips */}
          <div className="min-w-0">
            <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
                <div>
                  <h2 className="text-base font-semibold">
                    Intelligent Delivery Plan
                  </h2>

                  <p className="mt-1 text-xs text-neutral-500">
                    Vehicle allocation, schedule, capacity and route
                    usage
                  </p>
                </div>

                <span className="text-xs text-neutral-500">
                  {plan.trip_count} trips
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[950px] text-left">
                  <thead className="border-b border-neutral-200 bg-neutral-50">
                    <tr className="text-[11px] uppercase tracking-[0.1em] text-neutral-500">
                      <th className="px-5 py-3 font-medium">
                        Vehicle
                      </th>
                      <th className="px-4 py-3 font-medium">Trip</th>
                      <th className="px-4 py-3 font-medium">Route</th>
                      <th className="px-4 py-3 font-medium">Stops</th>
                      <th className="px-4 py-3 font-medium">Load</th>
                      <th className="px-4 py-3 font-medium">Time</th>
                      <th className="px-4 py-3 font-medium">
                        Distance
                      </th>
                      <th className="px-4 py-3 font-medium">Fuel</th>
                      <th className="px-4 py-3 font-medium">
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {plan.trips.map((trip) => {
                      const expanded = expandedTrip === trip.trip_id;

                      return (
                        <Fragment key={trip.trip_id}>
                          <tr
                            onClick={() =>
                              setExpandedTrip(
                                expanded ? null : trip.trip_id,
                              )
                            }
                            className="cursor-pointer border-b border-neutral-100 transition hover:bg-neutral-50"
                          >
                            <td className="px-5 py-4">
                              <p className="text-sm font-semibold">
                                {trip.vehicle_id}
                              </p>
                            </td>

                            <td className="px-4 py-4 text-sm">
                              #{trip.trip_number}
                            </td>

                            <td className="px-4 py-4">
                              <p className="text-sm font-medium">
                                {trip.district}
                              </p>

                              <p className="mt-1 text-xs text-neutral-500">
                                {trip.brand}
                              </p>
                            </td>

                            <td className="px-4 py-4 text-sm">
                              {trip.stops.length}
                            </td>

                            <td className="px-4 py-4">
                              <p className="text-sm">
                                {formatNumber(
                                  trip.total_weight_kg,
                                  0,
                                )}{" "}
                                kg
                              </p>

                              <p className="mt-1 text-xs text-neutral-500">
                                {formatNumber(
                                  trip.total_volume_m3,
                                  1,
                                )}{" "}
                                m³
                              </p>
                            </td>

                            <td className="px-4 py-4">
                              <p className="text-sm">
                                {trip.trip_start ?? "—"} →{" "}
                                {trip.trip_end ?? "—"}
                              </p>

                              <p className="mt-1 text-xs text-neutral-500">
                                {trip.estimated_minutes} min
                              </p>
                            </td>

                            <td className="px-4 py-4 text-sm">
                              {formatNumber(trip.distance_km ?? 0, 0)}{" "}
                              km
                            </td>

                            <td className="px-4 py-4 text-sm">
                              {formatNumber(trip.fuel_l ?? 0, 1)} L
                            </td>

                            <td className="px-4 py-4">
                              <StatusBadge status={trip.status} />
                            </td>
                          </tr>

                          {expanded && (
                            <tr className="border-b border-neutral-100">
                              <td
                                colSpan={9}
                                className="bg-neutral-50 px-5 py-5"
                              >
                                <div className="grid gap-3">
                                  {trip.stops.map((stop) => (
                                    <div
                                      key={stop.stop_id}
                                      className="grid gap-4 rounded-xl border border-neutral-200 bg-white p-4 md:grid-cols-[55px_1.4fr_1fr_1fr_1fr]"
                                    >
                                      <div>
                                        <p className="text-xs text-neutral-400">
                                          Stop
                                        </p>

                                        <p className="mt-1 text-sm font-semibold">
                                          #{stop.sequence}
                                        </p>
                                      </div>

                                      <div>
                                        <p className="text-sm font-semibold">
                                          {stop.order.outlet_id}
                                        </p>

                                        <p className="mt-1 text-xs text-neutral-500">
                                          {stop.order.delivery_id}
                                        </p>
                                      </div>

                                      <div>
                                        <p className="text-xs text-neutral-400">
                                          Arrival
                                        </p>

                                        <p className="mt-1 text-sm font-medium">
                                          {stop.arrival_time ?? "—"}
                                        </p>
                                      </div>

                                      <div>
                                        <p className="text-xs text-neutral-400">
                                          Window
                                        </p>

                                        <p className="mt-1 text-sm">
                                          {stop.window_open ??
                                            stop.order.window_open ??
                                            "—"}{" "}
                                          –{" "}
                                          {stop.window_close ??
                                            stop.order.window_close ??
                                            "—"}
                                        </p>
                                      </div>

                                      <div>
                                        <p className="text-xs text-neutral-400">
                                          Requirement
                                        </p>

                                        <p className="mt-1 text-sm capitalize">
                                          {stop.order.temp_requirement}
                                        </p>

                                        {(stop.waiting_minutes ?? 0) >
                                          0 && (
                                          <p className="mt-1 text-xs text-amber-600">
                                            Wait{" "}
                                            {stop.waiting_minutes} min
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Deferrals */}
          <aside className="h-fit rounded-2xl border border-neutral-200 bg-white shadow-sm">
            <div className="border-b border-neutral-200 px-5 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold">
                    Explainable Deferrals
                  </h2>

                  <p className="mt-1 text-xs text-neutral-500">
                    Orders that could not be feasibly served
                  </p>
                </div>

                <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600">
                  {plan.deferral_count}
                </span>
              </div>
            </div>

            <div className="max-h-[850px] space-y-3 overflow-y-auto p-4">
              {plan.deferrals.length === 0 ? (
                <div className="rounded-xl bg-emerald-50 p-4">
                  <p className="text-sm font-medium text-emerald-700">
                    All orders served
                  </p>
                </div>
              ) : (
                plan.deferrals.map((deferral) => (
                  <article
                    key={deferral.id}
                    className="rounded-xl border border-neutral-200 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">
                          {deferral.delivery_id}
                        </p>

                        <p className="mt-1 text-xs text-neutral-500">
                          {deferral.outlet_id} · {deferral.brand} ·{" "}
                          {deferral.district}
                        </p>
                      </div>

                      <span className="rounded-full bg-red-50 px-2 py-1 text-[10px] font-medium text-red-700">
                        Deferred
                      </span>
                    </div>

                    <div className="mt-3 rounded-lg bg-neutral-50 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-400">
                        Reason
                      </p>

                      <p className="mt-1 break-words text-xs font-medium text-neutral-700">
                        {deferral.reason_code.replaceAll("_", " ")}
                      </p>
                    </div>

                    {deferral.explanation && (
                      <p className="mt-3 text-xs leading-5 text-neutral-500">
                        {deferral.explanation}
                      </p>
                    )}

                    {(deferral.consecutive_deferrals ?? 0) > 1 && (
                      <p className="mt-3 text-xs font-medium text-amber-600">
                        Deferred {deferral.consecutive_deferrals}{" "}
                        consecutive plans
                      </p>
                    )}
                  </article>
                ))
              )}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}