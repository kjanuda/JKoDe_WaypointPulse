"use client";

import { useEffect, useMemo, useState } from "react";

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

type Plan = {
  id: number;
  plan_date: string;
  depot: string;
  status: string;
  version: number;
  trip_count: number;
  deferral_count: number;
  trips: Trip[];
};

type VerificationStatus =
  | "pending"
  | "verified"
  | "shortfall";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://127.0.0.1:8000";

function formatNumber(
  value: number,
  digits = 1,
) {
  return Number(value || 0).toLocaleString(
    undefined,
    {
      maximumFractionDigits: digits,
    },
  );
}

export default function LoaderPage() {
  const [plan, setPlan] =
    useState<Plan | null>(null);

  const [selectedTripId, setSelectedTripId] =
    useState<number | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [verification, setVerification] =
    useState<
      Record<number, VerificationStatus>
    >({});

  const [shortfallNotes, setShortfallNotes] =
    useState<Record<number, string>>({});

  const [readyTrips, setReadyTrips] =
    useState<Record<number, boolean>>({});

  useEffect(() => {
    async function loadPlan() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `${API_BASE}/api/plans/latest?depot=Peliyagoda`,
          {
            cache: "no-store",
          },
        );

        if (!response.ok) {
          throw new Error(
            `Unable to load plan (${response.status})`,
          );
        }

        const data: Plan =
          await response.json();

        setPlan(data);

        if (data.trips.length > 0) {
          setSelectedTripId(
            data.trips[0].trip_id,
          );
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load loader plan.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadPlan();
  }, []);

  const selectedTrip =
    plan?.trips.find(
      (trip) =>
        trip.trip_id === selectedTripId,
    ) ?? null;

  async function loadTripState(
    tripId: number,
  ) {
    try {
      const response = await fetch(
        `${API_BASE}/api/loader/trips/${tripId}`,
        {
          cache: "no-store",
        },
      );

      if (!response.ok) {
        throw new Error(
          `Unable to load trip state (${response.status})`,
        );
      }

      const data = await response.json();

      const nextVerification: Record<
        number,
        VerificationStatus
      > = {};

      const nextNotes: Record<
        number,
        string
      > = {};

      for (const stop of data.stops) {
        nextVerification[stop.stop_id] =
          stop.status === "verified" ||
          stop.status === "shortfall"
            ? stop.status
            : "pending";

        if (stop.loader_note) {
          nextNotes[stop.stop_id] =
            stop.loader_note;
        }
      }

      setVerification((current) => ({
        ...current,
        ...nextVerification,
      }));

      setShortfallNotes((current) => ({
        ...current,
        ...nextNotes,
      }));

      setReadyTrips((current) => ({
        ...current,
        [tripId]:
          data.status === "ready",
      }));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load trip state.",
      );
    }
  }

  useEffect(() => {
    if (!selectedTripId) {
      return;
    }

    loadTripState(selectedTripId);
  }, [selectedTripId]);

  const reverseLoadStops = useMemo(() => {
    if (!selectedTrip) {
      return [];
    }

    return [...selectedTrip.stops].sort(
      (a, b) =>
        b.sequence - a.sequence,
    );
  }, [selectedTrip]);

  const verifiedCount = useMemo(() => {
    if (!selectedTrip) {
      return 0;
    }

    return selectedTrip.stops.filter(
      (stop) =>
        verification[stop.stop_id] ===
        "verified",
    ).length;
  }, [selectedTrip, verification]);

  const shortfallCount = useMemo(() => {
    if (!selectedTrip) {
      return 0;
    }

    return selectedTrip.stops.filter(
      (stop) =>
        verification[stop.stop_id] ===
        "shortfall",
    ).length;
  }, [selectedTrip, verification]);

  const completedCount =
    verifiedCount + shortfallCount;

  const totalStops =
    selectedTrip?.stops.length ?? 0;

  const allChecked =
    totalStops > 0 &&
    completedCount === totalStops;

  const hasShortfall =
    shortfallCount > 0;

  async function markStop(
    stopId: number,
    status: VerificationStatus,
  ) {
    if (status === "pending") {
      return;
    }

    try {
      setError(null);

      const note =
        shortfallNotes[stopId]?.trim() ?? "";

      if (
        status === "shortfall" &&
        !note
      ) {
        setError(
          "Add a shortfall note before marking this item as shortfall.",
        );
        return;
      }

      const response = await fetch(
        `${API_BASE}/api/loader/stops/${stopId}`,
        {
          method: "PATCH",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            status,
            note:
              status === "shortfall"
                ? note
                : null,
          }),
        },
      );

      if (!response.ok) {
        const message =
          await response.text();

        throw new Error(
          message ||
            `Unable to update stop (${response.status})`,
        );
      }

      setVerification((current) => ({
        ...current,
        [stopId]: status,
      }));

      if (selectedTripId) {
        setReadyTrips((current) => ({
          ...current,
          [selectedTripId]: false,
        }));
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update load verification.",
      );
    }
  }

  async function handleMarkReady() {
    if (!selectedTrip) {
      return;
    }

    if (!allChecked || hasShortfall) {
      return;
    }

    try {
      setError(null);

      const response = await fetch(
        `${API_BASE}/api/loader/trips/${selectedTrip.trip_id}/ready`,
        {
          method: "PATCH",
        },
      );

      if (!response.ok) {
        const message =
          await response.text();

        throw new Error(
          message ||
            `Unable to release trip (${response.status})`,
        );
      }

      setReadyTrips((current) => ({
        ...current,
        [selectedTrip.trip_id]: true,
      }));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to mark vehicle ready.",
      );
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-neutral-100 p-6">
        <div className="mx-auto max-w-6xl">
          <div className="h-10 w-72 animate-pulse rounded bg-neutral-200" />

          <div className="mt-6 grid gap-5 lg:grid-cols-[320px_1fr]">
            <div className="h-[650px] animate-pulse rounded-3xl bg-neutral-200" />
            <div className="h-[650px] animate-pulse rounded-3xl bg-neutral-200" />
          </div>
        </div>
      </main>
    );
  }

  if (!plan || !selectedTrip) {
    return (
      <main className="min-h-screen bg-neutral-100 p-6">
        <div className="mx-auto max-w-4xl rounded-3xl bg-white p-8">
          <h1 className="text-2xl font-semibold">
            No load plan available
          </h1>

          {error && (
            <p className="mt-3 text-sm text-red-600">
              {error}
            </p>
          )}
        </div>
      </main>
    );
  }

  const tripReady =
    readyTrips[selectedTrip.trip_id];

  return (
    <main className="min-h-screen bg-[#f4f4f2] text-neutral-950">
      <div className="mx-auto max-w-[1350px] px-4 py-5 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="flex flex-col gap-4 border-b border-neutral-300 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
              Waypoint Pulse
            </p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Loader Console
            </h1>

            <p className="mt-1 text-sm text-neutral-500">
              {plan.depot} Depot ·{" "}
              {plan.plan_date} · Plan v
              {plan.version}
            </p>
          </div>

          <div className="rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm">
            {completedCount}/{totalStops} checked
          </div>
        </header>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-6 grid gap-5 lg:grid-cols-[320px_1fr]">
          {/* Trip selector */}
          <aside className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm">
            <div className="px-2 pb-4">
              <h2 className="text-base font-semibold">
                Assigned Trips
              </h2>

              <p className="mt-1 text-xs text-neutral-500">
                Select a vehicle trip to load
              </p>
            </div>

            <div className="max-h-[720px] space-y-2 overflow-y-auto">
              {plan.trips.map((trip) => {
                const active =
                  trip.trip_id ===
                  selectedTrip.trip_id;

                const ready =
                  readyTrips[trip.trip_id];

                return (
                  <button
                    key={trip.trip_id}
                    onClick={() =>
                      setSelectedTripId(
                        trip.trip_id,
                      )
                    }
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      active
                        ? "border-neutral-950 bg-neutral-950 text-white"
                        : "border-neutral-200 bg-white hover:bg-neutral-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">
                          {trip.vehicle_id}
                        </p>

                        <p
                          className={`mt-1 text-xs ${
                            active
                              ? "text-neutral-300"
                              : "text-neutral-500"
                          }`}
                        >
                          Trip #
                          {trip.trip_number}
                        </p>
                      </div>

                      {ready && (
                        <span
                          className={`rounded-full px-2 py-1 text-[10px] font-medium ${
                            active
                              ? "bg-white/15 text-white"
                              : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          Ready
                        </span>
                      )}
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">
                          {trip.district}
                        </p>

                        <p
                          className={`mt-1 text-xs ${
                            active
                              ? "text-neutral-300"
                              : "text-neutral-500"
                          }`}
                        >
                          {trip.brand}
                        </p>
                      </div>

                      <p className="text-sm">
                        {trip.stops.length} stops
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Load plan */}
          <section className="min-w-0">
            <div className="rounded-3xl border border-neutral-200 bg-white shadow-sm">
              <div className="border-b border-neutral-200 p-5 sm:p-6">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-semibold">
                        {selectedTrip.vehicle_id}
                      </h2>

                      <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs">
                        Trip #
                        {
                          selectedTrip.trip_number
                        }
                      </span>

                      <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs">
                        {selectedTrip.brand}
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-neutral-500">
                      {selectedTrip.district} ·{" "}
                      {selectedTrip.trip_start ??
                        "—"}{" "}
                      →{" "}
                      {selectedTrip.trip_end ??
                        "—"}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <div className="rounded-xl bg-neutral-50 px-4 py-3">
                      <p className="text-[10px] uppercase tracking-wider text-neutral-400">
                        Weight
                      </p>

                      <p className="mt-1 text-sm font-semibold">
                        {formatNumber(
                          selectedTrip.total_weight_kg,
                          0,
                        )}{" "}
                        kg
                      </p>
                    </div>

                    <div className="rounded-xl bg-neutral-50 px-4 py-3">
                      <p className="text-[10px] uppercase tracking-wider text-neutral-400">
                        Volume
                      </p>

                      <p className="mt-1 text-sm font-semibold">
                        {formatNumber(
                          selectedTrip.total_volume_m3,
                          1,
                        )}{" "}
                        m³
                      </p>
                    </div>

                    <div className="rounded-xl bg-neutral-50 px-4 py-3">
                      <p className="text-[10px] uppercase tracking-wider text-neutral-400">
                        Stops
                      </p>

                      <p className="mt-1 text-sm font-semibold">
                        {
                          selectedTrip.stops
                            .length
                        }
                      </p>
                    </div>

                    <div className="rounded-xl bg-neutral-50 px-4 py-3">
                      <p className="text-[10px] uppercase tracking-wider text-neutral-400">
                        Temp
                      </p>

                      <p className="mt-1 text-sm font-semibold capitalize">
                        {selectedTrip.stops.some(
                          (stop) =>
                            stop.order
                              .temp_requirement ===
                            "chilled",
                        )
                          ? "Reefer"
                          : "Ambient"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reverse load hint */}
              <div className="border-b border-neutral-200 bg-amber-50 px-5 py-4 sm:px-6">
                <p className="text-sm font-medium text-amber-900">
                  Reverse-sequence loading
                </p>

                <p className="mt-1 text-xs leading-5 text-amber-700">
                  Load the final delivery stop
                  first so the first delivery is
                  closest to the vehicle door.
                </p>
              </div>

              {/* Load rows */}
              <div className="space-y-3 p-4 sm:p-6">
                {reverseLoadStops.map(
                  (stop, index) => {
                    const status =
                      verification[
                        stop.stop_id
                      ] ?? "pending";

                    return (
                      <article
                        key={stop.stop_id}
                        className={`rounded-2xl border p-4 transition ${
                          status ===
                          "verified"
                            ? "border-emerald-200 bg-emerald-50/40"
                            : status ===
                                "shortfall"
                              ? "border-red-200 bg-red-50/40"
                              : "border-neutral-200 bg-white"
                        }`}
                      >
                        <div className="grid gap-4 xl:grid-cols-[80px_1fr_170px_210px] xl:items-center">
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                              Load
                            </p>

                            <p className="mt-1 text-2xl font-semibold">
                              #{index + 1}
                            </p>

                            <p className="mt-1 text-xs text-neutral-500">
                              Delivery stop #
                              {
                                stop.sequence
                              }
                            </p>
                          </div>

                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-base font-semibold">
                                {
                                  stop.order
                                    .outlet_id
                                }
                              </p>

                              <span className="rounded-full bg-neutral-100 px-2 py-1 text-[10px] capitalize text-neutral-600">
                                {
                                  stop.order
                                    .temp_requirement
                                }
                              </span>
                            </div>

                            <p className="mt-1 text-xs text-neutral-500">
                              {
                                stop.order
                                  .delivery_id
                              }{" "}
                              ·{" "}
                              {
                                stop.order
                                  .district
                              }
                            </p>

                            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-neutral-600">
                              <span>
                                {formatNumber(
                                  stop.order
                                    .weight_kg,
                                  0,
                                )}{" "}
                                kg
                              </span>

                              <span>
                                {formatNumber(
                                  stop.order
                                    .volume_m3,
                                  2,
                                )}{" "}
                                m³
                              </span>

                              <span>
                                Window{" "}
                                {stop.window_open ??
                                  stop.order
                                    .window_open ??
                                  "—"}{" "}
                                –{" "}
                                {stop.window_close ??
                                  stop.order
                                    .window_close ??
                                  "—"}
                              </span>
                            </div>
                          </div>

                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                              Verification
                            </p>

                            <p className="mt-2 text-sm font-medium capitalize">
                              {status}
                            </p>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() =>
                                markStop(
                                  stop.stop_id,
                                  "verified",
                                )
                              }
                              className={`flex-1 rounded-xl border px-3 py-2.5 text-xs font-medium transition ${
                                status ===
                                "verified"
                                  ? "border-emerald-600 bg-emerald-600 text-white"
                                  : "border-neutral-300 bg-white hover:bg-neutral-50"
                              }`}
                            >
                              Verified
                            </button>

                            <button
                              onClick={() =>
                                setVerification(
                                  (current) => ({
                                    ...current,
                                    [stop.stop_id]:
                                      "shortfall",
                                  }),
                                )
                              }
                              className={`flex-1 rounded-xl border px-3 py-2.5 text-xs font-medium transition ${
                                status ===
                                "shortfall"
                                  ? "border-red-600 bg-red-600 text-white"
                                  : "border-neutral-300 bg-white hover:bg-neutral-50"
                              }`}
                            >
                              Shortfall
                            </button>
                          </div>
                        </div>

                        {status ===
                          "shortfall" && (
                          <div className="mt-4 border-t border-red-100 pt-4">
                            <label className="text-xs font-medium text-red-700">
                              Shortfall / mismatch
                              note
                            </label>

                            <textarea
                              value={
                                shortfallNotes[
                                  stop.stop_id
                                ] ?? ""
                              }
                              onChange={(
                                event,
                              ) =>
                                setShortfallNotes(
                                  (
                                    current,
                                  ) => ({
                                    ...current,
                                    [stop.stop_id]:
                                      event
                                        .target
                                        .value,
                                  }),
                                )
                              }
                              placeholder="Example: 2 chilled cartons missing from pallet..."
                              className="mt-2 min-h-24 w-full rounded-xl border border-red-200 bg-white p-3 text-sm outline-none transition focus:border-red-400"
                            />

                            <button
                              onClick={() =>
                                markStop(
                                  stop.stop_id,
                                  "shortfall",
                                )
                              }
                              className="mt-3 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-medium text-white transition hover:bg-red-700"
                            >
                              Save Shortfall
                            </button>
                          </div>
                        )}
                      </article>
                    );
                  },
                )}
              </div>

              {/* Footer action */}
              <div className="sticky bottom-0 border-t border-neutral-200 bg-white/95 p-4 backdrop-blur sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    {tripReady ? (
                      <>
                        <p className="text-sm font-semibold text-emerald-700">
                          Vehicle ready for dispatch
                        </p>

                        <p className="mt-1 text-xs text-neutral-500">
                          All load items verified.
                        </p>
                      </>
                    ) : hasShortfall ? (
                      <>
                        <p className="text-sm font-semibold text-red-700">
                          Shortfall requires
                          resolution
                        </p>

                        <p className="mt-1 text-xs text-neutral-500">
                          Resolve all mismatches
                          before vehicle release.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-semibold">
                          {
                            completedCount
                          }
                          /{totalStops} load
                          items checked
                        </p>

                        <p className="mt-1 text-xs text-neutral-500">
                          Verify every order
                          before marking ready.
                        </p>
                      </>
                    )}
                  </div>

                  <button
                    onClick={handleMarkReady}
                    disabled={
                      !allChecked ||
                      hasShortfall ||
                      tripReady
                    }
                    className="rounded-xl bg-neutral-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {tripReady
                      ? "Vehicle Ready"
                      : "Mark Vehicle Ready"}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}