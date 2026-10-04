"use client";



import {

  useCallback,

  useEffect,

  useMemo,

  useState,

} from "react";



import { apiFetch } from "@/lib/api";

import { LogoutButton } from "@/components/auth/LogoutButton";



type OrderInfo = {

  delivery_id: string;

  outlet_id: string;

  brand: string;

  district: string;

  temp_requirement: string;

  weight_kg: number;

  volume_m3: number;

};



type DriverStop = {

  stop_id: number;

  sequence: number;



  loader_status: string;

  driver_status: string;



  receiver_name?: string | null;

  delivery_note?: string | null;

  delivered_at?: string | null;



  arrival_time?: string | null;

  window_open?: string | null;

  window_close?: string | null;



  order: OrderInfo;

};



type DriverTrip = {

  trip_id: number;

  vehicle_id: string;

  trip_number: number;

  brand: string;

  district: string;



  status: string;



  distance_km?: number | null;



  trip_start?: string | null;

  trip_end?: string | null;



  delivered_count: number;

  total_stops: number;



  stops: DriverStop[];

};



type PlanTrip = {

  trip_id: number;

  vehicle_id: string;

  trip_number: number;

  brand: string;

  district: string;

  status: string;

};



type LatestPlan = {

  id: number;

  plan_date: string;

  depot: string;

  version: number;

  trips: PlanTrip[];

};



type PendingDelivery = {

  id: string;



  type:

    | "arrived"

    | "delivered";



  stopId: number;



  receiverName?: string;

  note?: string;



  createdAt: string;

};



const API_BASE =

  process.env.NEXT_PUBLIC_API_URL ??

  "http://127.0.0.1:8000";



const QUEUE_KEY =

  "waypoint-driver-sync-queue";



const TRIP_CACHE_KEY =

  "waypoint-driver-trip-cache";



function loadQueue(): PendingDelivery[] {

  if (

    typeof window === "undefined"

  ) {

    return [];

  }



  try {

    const raw =

      localStorage.getItem(

        QUEUE_KEY,

      );



    if (!raw) {

      return [];

    }



    return JSON.parse(raw);

  } catch {

    return [];

  }

}



function saveQueue(

  queue: PendingDelivery[],

) {

  if (

    typeof window === "undefined"

  ) {

    return;

  }



  localStorage.setItem(

    QUEUE_KEY,

    JSON.stringify(queue),

  );

}



function saveTripCache(

  trip: DriverTrip,

) {

  if (

    typeof window === "undefined"

  ) {

    return;

  }



  localStorage.setItem(

    TRIP_CACHE_KEY,

    JSON.stringify(trip),

  );

}



function loadTripCache():

  | DriverTrip

  | null {

  if (

    typeof window === "undefined"

  ) {

    return null;

  }



  try {

    const raw =

      localStorage.getItem(

        TRIP_CACHE_KEY,

      );



    if (!raw) {

      return null;

    }



    return JSON.parse(raw);

  } catch {

    return null;

  }

}



export default function DriverPage() {

  const [

    trip,

    setTrip,

  ] =

    useState<DriverTrip | null>(

      null,

    );



  const [

    selectedStopId,

    setSelectedStopId,

  ] =

    useState<number | null>(

      null,

    );



  const [

    receiverName,

    setReceiverName,

  ] =

    useState("");



  const [

    deliveryNote,

    setDeliveryNote,

  ] =

    useState("");



  const [

    queue,

    setQueue,

  ] =

    useState<

      PendingDelivery[]

    >([]);



  const [

    isOnline,

    setIsOnline,

  ] =

    useState(true);



  const [

    loading,

    setLoading,

  ] =

    useState(true);



  const [

    syncing,

    setSyncing,

  ] =

    useState(false);



  const [

    completingTrip,

    setCompletingTrip,

  ] =

    useState(false);



  const [

    error,

    setError,

  ] =

    useState<

      string | null

    >(null);



  const updateQueue =

    useCallback(

      (

        nextQueue:

          PendingDelivery[],

      ) => {

        setQueue(nextQueue);

        saveQueue(nextQueue);

      },

      [],

    );



  const updateStopLocally =

    useCallback(

      (

        stopId: number,

        patch:

          Partial<DriverStop>,

      ) => {

        setTrip((current) => {

          if (!current) {

            return current;

          }



          const stops =

            current.stops.map(

              (stop) =>

                stop.stop_id ===

                stopId

                  ? {

                      ...stop,

                      ...patch,

                    }

                  : stop,

            );



          const deliveredCount =

            stops.filter(

              (stop) =>

                stop.driver_status ===

                "delivered",

            ).length;



          const nextTrip = {

            ...current,

            stops,

            delivered_count:

              deliveredCount,

          };



          saveTripCache(

            nextTrip,

          );



          return nextTrip;

        });

      },

      [],

    );



  const loadDriverTrip =

    useCallback(

      async () => {

        setLoading(true);

        setError(null);



        try {

          const cachedTrip =

            loadTripCache();



          const planResponse =

            await apiFetch(

              "/api/plans/latest?depot=Peliyagoda",

              {

                cache: "no-store",

              },

            );



          if (

            !planResponse.ok

          ) {

            throw new Error(

              "Unable to load latest plan.",

            );

          }



          const plan:

            LatestPlan =

            await planResponse.json();



          /*

           * Priority:

           *

           * 1. Current cached trip if it

           *    still exists and is ready

           *    or completed.

           *

           * 2. First ready trip.

           *

           * This lets a completed trip

           * survive refresh instead of

           * disappearing immediately.

           */

          const currentPlanTrip =

            cachedTrip

              ? plan.trips.find(

                  (item) =>

                    item.trip_id ===

                      cachedTrip.trip_id &&

                    (

                      item.status ===

                        "ready" ||

                      item.status ===

                        "completed"

                    ),

                )

              : undefined;



          const selectedPlanTrip =

            currentPlanTrip ??

            plan.trips.find(

              (item) =>

                item.status ===

                "ready",

            );



          if (

            !selectedPlanTrip

          ) {

            throw new Error(

              "No ready trip available.",

            );

          }



          const response =

            await apiFetch(

              `/api/driver/trips/${selectedPlanTrip.trip_id}`,

              {

                cache: "no-store",

              },

            );



          if (

            !response.ok

          ) {

            throw new Error(

              "Unable to load driver trip.",

            );

          }



          const data:

            DriverTrip =

            await response.json();



          setTrip(data);



          saveTripCache(

            data,

          );



          const firstIncomplete =

            [...data.stops]

              .sort(

                (a, b) =>

                  a.sequence -

                  b.sequence,

              )

              .find(

                (stop) =>

                  stop.driver_status !==

                  "delivered",

              ) ??

            data.stops[0];



          if (

            firstIncomplete

          ) {

            setSelectedStopId(

              firstIncomplete.stop_id,

            );

          }

        } catch (err) {

          const cached =

            loadTripCache();



          if (cached) {

            setTrip(cached);



            const firstIncomplete =

              [...cached.stops]

                .sort(

                  (a, b) =>

                    a.sequence -

                    b.sequence,

                )

                .find(

                  (stop) =>

                    stop.driver_status !==

                    "delivered",

                ) ??

              cached.stops[0];



            if (

              firstIncomplete

            ) {

              setSelectedStopId(

                firstIncomplete.stop_id,

              );

            }



            setError(

              "Network unavailable. Loaded cached route.",

            );

          } else {

            setError(

              err instanceof Error

                ? err.message

                : "Unable to load route.",

            );

          }

        } finally {

          setLoading(false);

        }

      },

      [],

    );



  const syncPending =

    useCallback(

      async () => {

        if (

          !navigator.onLine

        ) {

          return;

        }



        const currentQueue =

          loadQueue();



        if (

          currentQueue.length ===

          0

        ) {

          return;

        }



        setSyncing(true);



        const remaining:

          PendingDelivery[] =

          [];



        for (

          const item

          of currentQueue

        ) {

          try {

            if (

              item.type ===

              "arrived"

            ) {

              const response =

                await apiFetch(

                  `/api/driver/stops/${item.stopId}/arrived`,

                  {

                    method: "PATCH",

                  },

                );



              if (

                !response.ok

              ) {

                throw new Error(

                  "Arrival sync failed.",

                );

              }



              updateStopLocally(

                item.stopId,

                {

                  driver_status:

                    "arrived",

                },

              );

            }



            if (

              item.type ===

              "delivered"

            ) {

              const response =

                await apiFetch(

                  `/api/driver/stops/${item.stopId}/delivered`,

                  {

                    method: "PATCH",

                    headers: {

                      "Content-Type":

                        "application/json",

                    },

                    body:

                      JSON.stringify({

                        receiver_name:

                          item.receiverName,



                        note:

                          item.note ||

                          null,

                      }),

                  },

                );



              if (

                !response.ok

              ) {

                throw new Error(

                  "Delivery sync failed.",

                );

              }



              const data =

                await response.json();



              updateStopLocally(

                item.stopId,

                {

                  driver_status:

                    "delivered",



                  receiver_name:

                    data.receiver_name,



                  delivery_note:

                    data.delivery_note,



                  delivered_at:

                    data.delivered_at,

                },

              );

            }

          } catch {

            remaining.push(

              item,

            );

          }

        }



        updateQueue(

          remaining,

        );



        setSyncing(false);



        if (

          remaining.length ===

          0

        ) {

          try {

            await loadDriverTrip();

          } catch {

            // Cache remains available.

          }

        }

      },

      [

        loadDriverTrip,

        updateQueue,

        updateStopLocally,

      ],

    );



  useEffect(() => {

    setQueue(

      loadQueue(),

    );



    setIsOnline(

      navigator.onLine,

    );



    loadDriverTrip();



    function handleOnline() {

      setIsOnline(true);

    }



    function handleOffline() {

      setIsOnline(false);

    }



    window.addEventListener(

      "online",

      handleOnline,

    );



    window.addEventListener(

      "offline",

      handleOffline,

    );



    return () => {

      window.removeEventListener(

        "online",

        handleOnline,

      );



      window.removeEventListener(

        "offline",

        handleOffline,

      );

    };

  }, [loadDriverTrip]);



  useEffect(() => {

    if (

      isOnline &&

      queue.length > 0

    ) {

      syncPending();

    }

  }, [

    isOnline,

    queue.length,

    syncPending,

  ]);



  const routeStops =

    useMemo(() => {

      if (!trip) {

        return [];

      }



      return [

        ...trip.stops,

      ].sort(

        (a, b) =>

          a.sequence -

          b.sequence,

      );

    }, [trip]);



  const selectedStop =

    routeStops.find(

      (stop) =>

        stop.stop_id ===

        selectedStopId,

    ) ?? null;



  useEffect(() => {

    if (!selectedStop) {

      return;

    }



    setReceiverName(

      selectedStop.receiver_name ??

        "",

    );



    setDeliveryNote(

      selectedStop.delivery_note ??

        "",

    );

  }, [selectedStop]);



  async function markArrived() {

    if (!selectedStop) {

      return;

    }



    setError(null);



    if (

      !navigator.onLine

    ) {

      const event:

        PendingDelivery =

        {

          id:

            `arrived-${selectedStop.stop_id}-${Date.now()}`,



          type:

            "arrived",



          stopId:

            selectedStop.stop_id,



          createdAt:

            new Date().toISOString(),

        };



      updateQueue([

        ...loadQueue(),

        event,

      ]);



      updateStopLocally(

        selectedStop.stop_id,

        {

          driver_status:

            "arrived",

        },

      );



      return;

    }



    try {

      const response =

        await apiFetch(

          `/api/driver/stops/${selectedStop.stop_id}/arrived`,

          {

            method: "PATCH",

          },

        );



      if (

        !response.ok

      ) {

        throw new Error(

          "Unable to mark arrival.",

        );

      }



      updateStopLocally(

        selectedStop.stop_id,

        {

          driver_status:

            "arrived",

        },

      );

    } catch {

      const event:

        PendingDelivery =

        {

          id:

            `arrived-${selectedStop.stop_id}-${Date.now()}`,



          type:

            "arrived",



          stopId:

            selectedStop.stop_id,



          createdAt:

            new Date().toISOString(),

        };



      updateQueue([

        ...loadQueue(),

        event,

      ]);



      updateStopLocally(

        selectedStop.stop_id,

        {

          driver_status:

            "arrived",

        },

      );



      setError(

        "Connection failed. Arrival saved offline.",

      );

    }

  }



  async function completeDelivery() {

    if (!selectedStop) {

      return;

    }



    const cleanName =

      receiverName.trim();



    if (!cleanName) {

      setError(

        "Receiver name is required.",

      );



      return;

    }



    setError(null);



    const localPatch:

      Partial<DriverStop> =

      {

        driver_status:

          "delivered",



        receiver_name:

          cleanName,



        delivery_note:

          deliveryNote.trim() ||

          null,



        delivered_at:

          new Date().toISOString(),

      };



    if (

      !navigator.onLine

    ) {

      const event:

        PendingDelivery =

        {

          id:

            `delivered-${selectedStop.stop_id}-${Date.now()}`,



          type:

            "delivered",



          stopId:

            selectedStop.stop_id,



          receiverName:

            cleanName,



          note:

            deliveryNote.trim(),



          createdAt:

            new Date().toISOString(),

        };



      const existing =

        loadQueue().filter(

          (item) =>

            !(

              item.stopId ===

                selectedStop.stop_id &&

              item.type ===

                "delivered"

            ),

        );



      updateQueue([

        ...existing,

        event,

      ]);



      updateStopLocally(

        selectedStop.stop_id,

        localPatch,

      );



      moveToNextStop(

        selectedStop.stop_id,

      );



      return;

    }



    try {

      const response =

        await apiFetch(

          `/api/driver/stops/${selectedStop.stop_id}/delivered`,

          {

            method: "PATCH",

            headers: {

              "Content-Type":

                "application/json",

            },

            body:

              JSON.stringify({

                receiver_name:

                  cleanName,



                note:

                  deliveryNote.trim() ||

                  null,

              }),

          },

        );



      if (

        !response.ok

      ) {

        throw new Error(

          "Unable to complete delivery.",

        );

      }



      const data =

        await response.json();



      updateStopLocally(

        selectedStop.stop_id,

        {

          driver_status:

            "delivered",



          receiver_name:

            data.receiver_name,



          delivery_note:

            data.delivery_note,



          delivered_at:

            data.delivered_at,

        },

      );



      moveToNextStop(

        selectedStop.stop_id,

      );

    } catch {

      const event:

        PendingDelivery =

        {

          id:

            `delivered-${selectedStop.stop_id}-${Date.now()}`,



          type:

            "delivered",



          stopId:

            selectedStop.stop_id,



          receiverName:

            cleanName,



          note:

            deliveryNote.trim(),



          createdAt:

            new Date().toISOString(),

        };



      const existing =

        loadQueue().filter(

          (item) =>

            !(

              item.stopId ===

                selectedStop.stop_id &&

              item.type ===

                "delivered"

            ),

        );



      updateQueue([

        ...existing,

        event,

      ]);



      updateStopLocally(

        selectedStop.stop_id,

        localPatch,

      );



      moveToNextStop(

        selectedStop.stop_id,

      );



      setError(

        "Connection failed. Delivery saved offline.",

      );

    }

  }



  function moveToNextStop(

    currentStopId: number,

  ) {

    const index =

      routeStops.findIndex(

        (stop) =>

          stop.stop_id ===

          currentStopId,

      );



    const next =

      routeStops[index + 1];



    if (next) {

      setSelectedStopId(

        next.stop_id,

      );

    }

  }



  async function completeTrip() {

    if (!trip) {

      return;

    }



    setError(null);



    /*

     * Never complete the trip while

     * offline events are still waiting

     * to reach the server.

     */

    if (!navigator.onLine) {

      setError(

        "Go online before completing the trip.",

      );



      return;

    }



    if (

      loadQueue().length > 0

    ) {

      setError(

        "Sync all pending delivery updates before completing the trip.",

      );



      return;

    }



    if (

      trip.delivered_count !==

      trip.total_stops

    ) {

      setError(

        "All stops must be delivered before completing the trip.",

      );



      return;

    }



    try {

      setCompletingTrip(true);



      const response =

        await apiFetch(

          `/api/driver/trips/${trip.trip_id}/complete`,

          {

            method: "PATCH",

          },

        );



      if (

        !response.ok

      ) {

        let message =

          "Unable to complete trip.";



        try {

          const data =

            await response.json();



          if (

            typeof data.detail ===

            "string"

          ) {

            message =

              data.detail;

          } else if (

            data.detail?.message

          ) {

            message =

              data.detail.message;

          }

        } catch {

          // Keep default message.

        }



        throw new Error(

          message,

        );

      }



      const data =

        await response.json();



      setTrip((current) => {

        if (!current) {

          return current;

        }



        const nextTrip = {

          ...current,

          status:

            data.status ??

            "completed",

        };



        saveTripCache(

          nextTrip,

        );



        return nextTrip;

      });

    } catch (err) {

      setError(

        err instanceof Error

          ? err.message

          : "Unable to complete trip.",

      );

    } finally {

      setCompletingTrip(false);

    }

  }



  if (loading) {

    return (

      <main className="min-h-screen bg-[#f4f4f2] p-4">

        <div className="mx-auto max-w-md">

          <div className="rounded-3xl bg-neutral-950 p-6 text-white">

            Loading driver route...

          </div>

        </div>

      </main>

    );

  }



  if (!trip) {

    return (

      <main className="min-h-screen bg-[#f4f4f2] p-4">

        <div className="mx-auto max-w-md rounded-3xl bg-white p-6">

          <h1 className="text-xl font-semibold">

            No route available

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



  const pendingForSelected =

    queue.some(

      (item) =>

        item.stopId ===

        selectedStop?.stop_id,

    );



  const allStopsDelivered =

    trip.total_stops > 0 &&

    trip.delivered_count ===

      trip.total_stops;



  const canCompleteTrip =

    allStopsDelivered &&

    trip.status !==

      "completed" &&

    isOnline &&

    queue.length === 0;



  return (

    <main className="min-h-screen bg-[#f4f4f2] text-neutral-950">

      <div className="mx-auto max-w-md px-4 py-4">

        {/* HEADER */}

        <header className="rounded-3xl bg-neutral-950 p-5 text-white">

          <div className="flex items-start justify-between gap-4">

            <div>

              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400">

                Waypoint Pulse

              </p>



              <h1 className="mt-2 text-2xl font-semibold">

                Driver Route

              </h1>



              <p className="mt-1 text-sm text-neutral-400">

                {trip.vehicle_id}

                {" · "}

                Trip #

                {

                  trip.trip_number

                }

              </p>

            </div>



            <div className="flex flex-col items-end gap-2">
              <LogoutButton />

              <span

                className={`rounded-full px-3 py-1.5 text-xs font-medium ${

                  isOnline

                    ? "bg-emerald-500/20 text-emerald-300"

                    : "bg-amber-500/20 text-amber-300"

                }`}

              >

                {isOnline

                  ? "Online"

                  : "Offline"}

              </span>



              {trip.status ===

                "completed" && (

                <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">

                  Completed

                </span>

              )}

            </div>

          </div>



          <div className="mt-5 grid grid-cols-3 gap-2">

            <div className="rounded-2xl bg-white/10 p-3">

              <p className="text-[10px] uppercase tracking-wider text-neutral-400">

                Stops

              </p>



              <p className="mt-1 text-lg font-semibold">

                {

                  trip.delivered_count

                }

                /

                {

                  trip.total_stops

                }

              </p>

            </div>



            <div className="rounded-2xl bg-white/10 p-3">

              <p className="text-[10px] uppercase tracking-wider text-neutral-400">

                Distance

              </p>



              <p className="mt-1 text-lg font-semibold">

                {trip.distance_km ??

                  0}

                km

              </p>

            </div>



            <div className="rounded-2xl bg-white/10 p-3">

              <p className="text-[10px] uppercase tracking-wider text-neutral-400">

                Sync

              </p>



              <p className="mt-1 text-lg font-semibold">

                {queue.length}

              </p>

            </div>

          </div>

        </header>



        {/* OFFLINE MESSAGE */}

        {!isOnline && (

          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">

            <p className="text-sm font-semibold text-amber-800">

              Offline mode

            </p>



            <p className="mt-1 text-xs leading-5 text-amber-700">

              Route data is cached.

              Delivery actions will be

              stored locally until the

              connection returns.

            </p>

          </div>

        )}



        {/* ERROR */}

        {error && (

          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">

            {error}

          </div>

        )}



        {/* SYNC */}

        {isOnline &&

          queue.length > 0 && (

            <button

              onClick={

                syncPending

              }

              disabled={

                syncing

              }

              className="mt-4 w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white disabled:opacity-50"

            >

              {syncing

                ? "Syncing..."

                : `Sync ${queue.length} pending update${

                    queue.length ===

                    1

                      ? ""

                      : "s"

                  }`}

            </button>

          )}



        {/* TRIP COMPLETION */}

        {allStopsDelivered &&

          trip.status !==

            "completed" && (

            <section className="mt-4 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">

              <div className="flex items-start gap-3">

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-lg text-emerald-700">

                  ✓

                </div>



                <div>

                  <h2 className="text-sm font-semibold">

                    All deliveries completed

                  </h2>



                  <p className="mt-1 text-xs leading-5 text-neutral-500">

                    All{" "}

                    {

                      trip.total_stops

                    }{" "}

                    stops have been delivered.

                    Complete the trip to send

                    the final status to the

                    control tower.

                  </p>

                </div>

              </div>



              {queue.length > 0 && (

                <div className="mt-4 rounded-2xl bg-amber-50 p-3 text-xs text-amber-700">

                  {

                    queue.length

                  }{" "}

                  pending update

                  {queue.length ===

                  1

                    ? ""

                    : "s"}{" "}

                  must be synced before the

                  trip can be completed.

                </div>

              )}



              {!isOnline && (

                <div className="mt-4 rounded-2xl bg-amber-50 p-3 text-xs text-amber-700">

                  Reconnect to the network

                  before completing the trip.

                </div>

              )}



              <button

                onClick={

                  completeTrip

                }

                disabled={

                  !canCompleteTrip ||

                  completingTrip

                }

                className="mt-4 w-full rounded-2xl bg-neutral-950 px-4 py-3.5 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-neutral-500"

              >

                {completingTrip

                  ? "Completing Trip..."

                  : "Complete Trip"}

              </button>

            </section>

          )}



        {/* COMPLETED */}

        {trip.status ===

          "completed" && (

          <section className="mt-4 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-center">

            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-xl font-semibold text-white">

              ✓

            </div>



            <p className="mt-3 text-base font-semibold text-emerald-800">

              Trip completed

            </p>



            <p className="mt-1 text-xs leading-5 text-emerald-700">

              All deliveries were completed

              successfully and the control

              tower has been updated.

            </p>



            <div className="mt-4 rounded-2xl bg-white/70 p-3">

              <p className="text-xs text-neutral-500">

                {trip.vehicle_id}

                {" · "}

                Trip #

                {

                  trip.trip_number

                }

              </p>



              <p className="mt-1 text-sm font-semibold text-neutral-900">

                {

                  trip.delivered_count

                }

                /

                {

                  trip.total_stops

                }{" "}

                stops delivered

              </p>

            </div>

          </section>

        )}



        {/* ROUTE STOPS */}

        <section className="mt-5">

          <div className="mb-3 flex items-center justify-between">

            <h2 className="text-sm font-semibold">

              Route Stops

            </h2>



            <span className="text-xs text-neutral-500">

              {trip.district}

            </span>

          </div>



          <div className="flex gap-2 overflow-x-auto pb-2">

            {routeStops.map(

              (stop) => {

                const active =

                  stop.stop_id ===

                  selectedStopId;



                const delivered =

                  stop.driver_status ===

                  "delivered";



                const arrived =

                  stop.driver_status ===

                  "arrived";



                const pending =

                  queue.some(

                    (item) =>

                      item.stopId ===

                      stop.stop_id,

                  );



                return (

                  <button

                    key={

                      stop.stop_id

                    }

                    onClick={() =>

                      setSelectedStopId(

                        stop.stop_id,

                      )

                    }

                    className={`min-w-[135px] rounded-2xl border p-3 text-left ${

                      active

                        ? "border-neutral-950 bg-neutral-950 text-white"

                        : delivered

                          ? "border-emerald-200 bg-emerald-50"

                          : "border-neutral-200 bg-white"

                    }`}

                  >

                    <p className="text-xs font-medium">

                      Stop #

                      {

                        stop.sequence

                      }

                    </p>



                    <p className="mt-2 text-sm font-semibold">

                      {

                        stop.order

                          .outlet_id

                      }

                    </p>



                    <p

                      className={`mt-1 text-[11px] ${

                        active

                          ? "text-neutral-400"

                          : "text-neutral-500"

                      }`}

                    >

                      {stop.arrival_time ??

                        "—"}

                    </p>



                    {delivered && (

                      <p className="mt-2 text-[10px] font-medium text-emerald-600">

                        Delivered

                      </p>

                    )}



                    {!delivered &&

                      arrived && (

                        <p className="mt-2 text-[10px] font-medium text-amber-600">

                          Arrived

                        </p>

                      )}



                    {pending && (

                      <p className="mt-1 text-[10px] font-medium text-amber-500">

                        Pending sync

                      </p>

                    )}

                  </button>

                );

              },

            )}

          </div>

        </section>



        {/* SELECTED STOP */}

        {selectedStop && (

          <section className="mt-5 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">

            <div className="flex items-start justify-between gap-3">

              <div>

                <p className="text-xs uppercase tracking-wider text-neutral-400">

                  Stop #

                  {

                    selectedStop.sequence

                  }

                </p>



                <h2 className="mt-1 text-2xl font-semibold">

                  {

                    selectedStop

                      .order

                      .outlet_id

                  }

                </h2>



                <p className="mt-1 text-sm text-neutral-500">

                  {

                    selectedStop

                      .order

                      .delivery_id

                  }

                </p>

              </div>



              <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs capitalize">

                {

                  selectedStop

                    .order

                    .temp_requirement

                }

              </span>

            </div>



            <div className="mt-5 grid grid-cols-2 gap-3">

              <div className="rounded-2xl bg-neutral-50 p-4">

                <p className="text-[10px] uppercase tracking-wider text-neutral-400">

                  Arrival

                </p>



                <p className="mt-1 text-base font-semibold">

                  {selectedStop.arrival_time ??

                    "—"}

                </p>

              </div>



              <div className="rounded-2xl bg-neutral-50 p-4">

                <p className="text-[10px] uppercase tracking-wider text-neutral-400">

                  Window

                </p>



                <p className="mt-1 text-base font-semibold">

                  {selectedStop.window_open ??

                    "—"}

                  {" – "}

                  {selectedStop.window_close ??

                    "—"}

                </p>

              </div>



              <div className="rounded-2xl bg-neutral-50 p-4">

                <p className="text-[10px] uppercase tracking-wider text-neutral-400">

                  Weight

                </p>



                <p className="mt-1 text-base font-semibold">

                  {

                    selectedStop

                      .order

                      .weight_kg

                  }

                  kg

                </p>

              </div>



              <div className="rounded-2xl bg-neutral-50 p-4">

                <p className="text-[10px] uppercase tracking-wider text-neutral-400">

                  Volume

                </p>



                <p className="mt-1 text-base font-semibold">

                  {

                    selectedStop

                      .order

                      .volume_m3

                  }

                  m³

                </p>

              </div>

            </div>



            {/* PENDING */}

            {selectedStop.driver_status ===

              "pending" &&

              trip.status !==

                "completed" && (

                <button

                  onClick={

                    markArrived

                  }

                  className="mt-5 w-full rounded-2xl bg-neutral-950 px-4 py-3.5 text-sm font-medium text-white"

                >

                  Mark Arrived

                </button>

              )}



            {/* ARRIVED */}

            {selectedStop.driver_status ===

              "arrived" &&

              trip.status !==

                "completed" && (

                <div className="mt-5">

                  <div className="rounded-2xl bg-emerald-50 p-3 text-sm font-medium text-emerald-700">

                    Arrived at outlet

                  </div>



                  <div className="mt-4">

                    <label className="text-xs font-medium text-neutral-600">

                      Receiver name

                    </label>



                    <input

                      value={

                        receiverName

                      }

                      onChange={(

                        event,

                      ) =>

                        setReceiverName(

                          event

                            .target

                            .value,

                        )

                      }

                      placeholder="Enter receiver name"

                      className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 text-sm outline-none focus:border-neutral-950"

                    />

                  </div>



                  <div className="mt-4">

                    <label className="text-xs font-medium text-neutral-600">

                      Delivery note

                    </label>



                    <textarea

                      value={

                        deliveryNote

                      }

                      onChange={(

                        event,

                      ) =>

                        setDeliveryNote(

                          event

                            .target

                            .value,

                        )

                      }

                      placeholder="Optional note..."

                      className="mt-2 min-h-24 w-full rounded-2xl border border-neutral-300 p-4 text-sm outline-none focus:border-neutral-950"

                    />

                  </div>



                  <button

                    onClick={

                      completeDelivery

                    }

                    className="mt-4 w-full rounded-2xl bg-emerald-600 px-4 py-3.5 text-sm font-medium text-white"

                  >

                    Complete Delivery

                  </button>

                </div>

              )}



            {/* DELIVERED */}

            {selectedStop.driver_status ===

              "delivered" && (

              <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">

                <p className="text-sm font-semibold text-emerald-700">

                  Delivery complete

                </p>



                <p className="mt-1 text-xs text-emerald-700">

                  Receiver:{" "}

                  {selectedStop.receiver_name ??

                    "—"}

                </p>



                {selectedStop.delivery_note && (

                  <p className="mt-1 text-xs text-emerald-700">

                    Note:{" "}

                    {

                      selectedStop.delivery_note

                    }

                  </p>

                )}



                {selectedStop.delivered_at && (

                  <p className="mt-1 text-xs text-emerald-700">

                    Recorded:{" "}

                    {new Date(

                      selectedStop.delivered_at,

                    ).toLocaleString()}

                  </p>

                )}



                <p className="mt-2 text-xs text-neutral-600">

                  {pendingForSelected

                    ? "Saved offline · waiting for sync"

                    : "Synced with control tower"}

                </p>

              </div>

            )}

          </section>

        )}

      </div>

    </main>

  );

}
