"use client";



import {

  useCallback,

  useEffect,

  useMemo,

  useState,

} from "react";



import { apiFetch } from "@/lib/api";

import { LogoutButton } from "@/components/auth/LogoutButton";



type Delivery = {

  stop_id: number;

  delivery_id: string;

  outlet_id: string;



  brand: string;

  district: string;

  temp_requirement: string;



  weight_kg: number;

  volume_m3: number;



  vehicle_id: string;

  trip_number: number;



  trip_status: string;

  driver_status: string;



  receiver_name?: string | null;

  delivery_note?: string | null;

  delivered_at?: string | null;



  receipt_status: string;

  receipt_note?: string | null;

  receipt_confirmed_by?: string | null;

  receipt_confirmed_at?: string | null;

};



type StoreResponse = {

  outlet_id: string;

  delivery_count: number;

  pending_receipts: number;

  deliveries: Delivery[];

};



type Outlet = {

  outlet_id: string;

  brand: string;

  district: string;

  depot: string;

  dock_type: string;

  parking_constraint: string;

  mall_window?: string | null;

  window_open_time: string;

  window_close_time: string;

};



export default function StorePage() {

  const [

    outletId,

    setOutletId,

  ] = useState("OUT013");



  const [

    activeOutletId,

    setActiveOutletId,

  ] = useState("OUT013");



  const [

    outlet,

    setOutlet,

  ] = useState<Outlet | null>(

    null,

  );



  const [

    data,

    setData,

  ] = useState<StoreResponse | null>(

    null,

  );



  const [

    selectedStopId,

    setSelectedStopId,

  ] = useState<number | null>(

    null,

  );



  const [

    confirmedBy,

    setConfirmedBy,

  ] = useState("");



  const [

    receiptNote,

    setReceiptNote,

  ] = useState("");



  const [

    loading,

    setLoading,

  ] = useState(true);



  const [

    confirming,

    setConfirming,

  ] = useState(false);



  const [

    error,

    setError,

  ] = useState<string | null>(

    null,

  );



  const loadStore = useCallback(

    async (

      targetOutlet: string,

    ) => {

      const cleanOutlet =

        targetOutlet

          .trim()

          .toUpperCase();



      if (!cleanOutlet) {

        return;

      }



      setLoading(true);

      setError(null);



      try {

        const [

          outletResponse,

          deliveriesResponse,

        ] = await Promise.all([

          apiFetch(

            `/api/outlets/${cleanOutlet}`,

            {

              cache: "no-store",

            },

          ),



          apiFetch(

            `/api/store/deliveries?outlet_id=${encodeURIComponent(

              cleanOutlet,

            )}`,

            {

              cache: "no-store",

            },

          ),

        ]);



        if (!outletResponse.ok) {

          throw new Error(

            `Outlet ${cleanOutlet} not found.`,

          );

        }



        if (!deliveriesResponse.ok) {

          throw new Error(

            "Unable to load deliveries.",

          );

        }



        const outletData:

          Outlet =

          await outletResponse.json();



        const deliveryData:

          StoreResponse =

          await deliveriesResponse.json();



        setOutlet(

          outletData,

        );



        setData(

          deliveryData,

        );



        setActiveOutletId(

          cleanOutlet,

        );



        setOutletId(

          cleanOutlet,

        );



        const firstPending =

          deliveryData.deliveries.find(

            (delivery) =>

              delivery.receipt_status !==

              "confirmed",

          );



        const firstDelivery =

          firstPending ??

          deliveryData.deliveries[0];



        if (firstDelivery) {

          setSelectedStopId(

            firstDelivery.stop_id,

          );

        } else {

          setSelectedStopId(

            null,

          );

        }

      } catch (err) {

        setOutlet(null);

        setData(null);

        setSelectedStopId(

          null,

        );



        setError(

          err instanceof Error

            ? err.message

            : "Unable to load store data.",

        );

      } finally {

        setLoading(false);

      }

    },

    [],

  );



  useEffect(() => {

    loadStore(

      "OUT013",

    );

  }, [loadStore]);



  const deliveries =

    useMemo(() => {

      return (

        data?.deliveries ??

        []

      );

    }, [data]);



  const selectedDelivery =

    deliveries.find(

      (delivery) =>

        delivery.stop_id ===

        selectedStopId,

    ) ?? null;



  useEffect(() => {

    if (!selectedDelivery) {

      setConfirmedBy("");

      setReceiptNote("");

      return;

    }



    setConfirmedBy(

      selectedDelivery

        .receipt_confirmed_by ??

        "",

    );



    setReceiptNote(

      selectedDelivery

        .receipt_note ??

        "",

    );

  }, [

    selectedDelivery,

  ]);



  async function confirmReceipt() {

    if (!selectedDelivery) {

      return;

    }



    const cleanName =

      confirmedBy.trim();



    if (!cleanName) {

      setError(

        "Enter the store manager name.",

      );



      return;

    }



    setError(null);

    setConfirming(true);



    try {

      const response =

        await apiFetch(

          `/api/store/deliveries/${selectedDelivery.stop_id}/confirm`,

          {

            method: "PATCH",



            headers: {

              "Content-Type":

                "application/json",

            },



            body:

              JSON.stringify(

                {

                  confirmed_by:

                    cleanName,



                  note:

                    receiptNote.trim() ||

                    null,

                },

              ),

          },

        );



      if (!response.ok) {

        let message =

          "Unable to confirm receipt.";



        try {

          const result =

            await response.json();



          if (

            typeof result.detail ===

            "string"

          ) {

            message =

              result.detail;

          }

        } catch {

          // use default message

        }



        throw new Error(

          message,

        );

      }



      await loadStore(

        activeOutletId,

      );

    } catch (err) {

      setError(

        err instanceof Error

          ? err.message

          : "Unable to confirm receipt.",

      );

    } finally {

      setConfirming(false);

    }

  }



  function formatDate(

    value?: string | null,

  ) {

    if (!value) {

      return "—";

    }



    try {

      return new Date(

        value,

      ).toLocaleString();

    } catch {

      return value;

    }

  }



  return (

    <main className="min-h-screen bg-[#f5f5f3] text-neutral-950">

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">

        {/* HEADER */}

        <header className="rounded-[32px] bg-neutral-950 px-6 py-6 text-white sm:px-8">

          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-400">

                Waypoint Pulse

              </p>



              <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">

                Store Manager

              </h1>



              <p className="mt-2 text-sm text-neutral-400">

                Confirm received

                deliveries and close

                the delivery loop.

              </p>

            </div>



            <div className="flex flex-wrap items-start gap-3 sm:justify-end">
              <div className="rounded-2xl bg-white/10 px-4 py-3">
                <p className="text-[10px] uppercase tracking-wider text-neutral-400">
                  Outlet
                </p>

                <p className="mt-1 text-lg font-semibold">
                  {activeOutletId}
                </p>
              </div>

              <LogoutButton />
            </div>

          </div>



          <div className="mt-6 flex flex-col gap-2 sm:flex-row">

            <input

              value={

                outletId

              }

              onChange={(

                event,

              ) =>

                setOutletId(

                  event.target

                    .value,

                )

              }

              onKeyDown={(

                event,

              ) => {

                if (

                  event.key ===

                  "Enter"

                ) {

                  loadStore(

                    outletId,

                  );

                }

              }}

              placeholder="OUT013"

              className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white outline-none placeholder:text-neutral-500 focus:border-white/30"

            />



            <button

              onClick={() =>

                loadStore(

                  outletId,

                )

              }

              className="rounded-2xl bg-white px-5 py-3 text-sm font-medium text-neutral-950"

            >

              Load Outlet

            </button>

          </div>

        </header>



        {/* ERROR */}

        {error && (

          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">

            {error}

          </div>

        )}



        {loading ? (

          <div className="mt-6 rounded-3xl bg-white p-6 shadow-sm">

            Loading store

            deliveries...

          </div>

        ) : (

          <>

            {/* OUTLET INFO */}

            {outlet && (

              <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

                <div className="rounded-3xl bg-white p-5 shadow-sm">

                  <p className="text-[10px] uppercase tracking-wider text-neutral-400">

                    Brand

                  </p>



                  <p className="mt-2 text-lg font-semibold">

                    {

                      outlet.brand

                    }

                  </p>

                </div>



                <div className="rounded-3xl bg-white p-5 shadow-sm">

                  <p className="text-[10px] uppercase tracking-wider text-neutral-400">

                    District

                  </p>



                  <p className="mt-2 text-lg font-semibold">

                    {

                      outlet.district

                    }

                  </p>

                </div>



                <div className="rounded-3xl bg-white p-5 shadow-sm">

                  <p className="text-[10px] uppercase tracking-wider text-neutral-400">

                    Delivery window

                  </p>



                  <p className="mt-2 text-lg font-semibold">

                    {

                      outlet.window_open_time

                    }

                    {" – "}

                    {

                      outlet.window_close_time

                    }

                  </p>

                </div>



                <div className="rounded-3xl bg-white p-5 shadow-sm">

                  <p className="text-[10px] uppercase tracking-wider text-neutral-400">

                    Dock

                  </p>



                  <p className="mt-2 text-lg font-semibold capitalize">

                    {outlet.dock_type.replaceAll(

                      "_",

                      " ",

                    )}

                  </p>

                </div>

              </section>

            )}



            {/* SUMMARY */}

            {data && (

              <section className="mt-6 grid grid-cols-2 gap-3">

                <div className="rounded-3xl bg-neutral-950 p-5 text-white">

                  <p className="text-[10px] uppercase tracking-wider text-neutral-400">

                    Delivered

                  </p>



                  <p className="mt-2 text-3xl font-semibold">

                    {

                      data.delivery_count

                    }

                  </p>



                  <p className="mt-1 text-xs text-neutral-400">

                    delivery records

                  </p>

                </div>



                <div className="rounded-3xl bg-white p-5 shadow-sm">

                  <p className="text-[10px] uppercase tracking-wider text-neutral-400">

                    Pending receipt

                  </p>



                  <p className="mt-2 text-3xl font-semibold">

                    {

                      data.pending_receipts

                    }

                  </p>



                  <p className="mt-1 text-xs text-neutral-500">

                    require confirmation

                  </p>

                </div>

              </section>

            )}



            {deliveries.length ===

            0 ? (

              <section className="mt-6 rounded-3xl bg-white p-8 text-center shadow-sm">

                <p className="text-lg font-semibold">

                  No delivered

                  orders yet

                </p>



                <p className="mt-2 text-sm text-neutral-500">

                  Completed driver

                  deliveries for this

                  outlet will appear

                  here.

                </p>

              </section>

            ) : (

              <section className="mt-6 grid gap-5 lg:grid-cols-[340px_1fr]">

                {/* DELIVERY LIST */}

                <aside className="rounded-3xl bg-white p-4 shadow-sm">

                  <div className="px-2 pb-3">

                    <h2 className="text-base font-semibold">

                      Deliveries

                    </h2>



                    <p className="mt-1 text-xs text-neutral-500">

                      Select a

                      delivery to review.

                    </p>

                  </div>



                  <div className="space-y-2">

                    {deliveries.map(

                      (

                        delivery,

                      ) => {

                        const active =

                          selectedStopId ===

                          delivery.stop_id;



                        const confirmed =

                          delivery.receipt_status ===

                          "confirmed";



                        return (

                          <button

                            key={

                              delivery.stop_id

                            }

                            onClick={() =>

                              setSelectedStopId(

                                delivery.stop_id,

                              )

                            }

                            className={`w-full rounded-2xl border p-4 text-left transition ${

                              active

                                ? "border-neutral-950 bg-neutral-950 text-white"

                                : confirmed

                                  ? "border-emerald-200 bg-emerald-50"

                                  : "border-neutral-200 bg-white hover:bg-neutral-50"

                            }`}

                          >

                            <div className="flex items-start justify-between gap-3">

                              <div>

                                <p className="text-xs font-medium">

                                  {

                                    delivery.delivery_id

                                  }

                                </p>



                                <p className="mt-1 text-lg font-semibold">

                                  {

                                    delivery.vehicle_id

                                  }

                                  {" · "}

                                  Trip #

                                  {

                                    delivery.trip_number

                                  }

                                </p>

                              </div>



                              <span

                                className={`rounded-full px-2 py-1 text-[10px] font-medium ${

                                  confirmed

                                    ? "bg-emerald-100 text-emerald-700"

                                    : active

                                      ? "bg-white/10 text-white"

                                      : "bg-amber-100 text-amber-700"

                                }`}

                              >

                                {confirmed

                                  ? "Confirmed"

                                  : "Pending"}

                              </span>

                            </div>



                            <p

                              className={`mt-3 text-xs ${

                                active

                                  ? "text-neutral-400"

                                  : "text-neutral-500"

                              }`}

                            >

                              Delivered{" "}

                              {formatDate(

                                delivery.delivered_at,

                              )}

                            </p>

                          </button>

                        );

                      },

                    )}

                  </div>

                </aside>



                {/* DETAILS */}

                {selectedDelivery && (

                  <div className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

                      <div>

                        <p className="text-xs uppercase tracking-wider text-neutral-400">

                          Delivery

                        </p>



                        <h2 className="mt-1 text-2xl font-semibold">

                          {

                            selectedDelivery.delivery_id

                          }

                        </h2>



                        <p className="mt-1 text-sm text-neutral-500">

                          {

                            selectedDelivery.outlet_id

                          }

                          {" · "}

                          {

                            selectedDelivery.district

                          }

                        </p>

                      </div>



                      <span

                        className={`w-fit rounded-full px-3 py-1.5 text-xs font-medium ${

                          selectedDelivery.receipt_status ===

                          "confirmed"

                            ? "bg-emerald-100 text-emerald-700"

                            : "bg-amber-100 text-amber-700"

                        }`}

                      >

                        {selectedDelivery.receipt_status ===

                        "confirmed"

                          ? "Receipt Confirmed"

                          : "Awaiting Receipt"}

                      </span>

                    </div>



                    {/* DELIVERY DETAILS */}

                    <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">

                      <InfoBox

                        label="Vehicle"

                        value={

                          selectedDelivery.vehicle_id

                        }

                      />



                      <InfoBox

                        label="Trip"

                        value={`#${selectedDelivery.trip_number}`}

                      />



                      <InfoBox

                        label="Weight"

                        value={`${selectedDelivery.weight_kg} kg`}

                      />



                      <InfoBox

                        label="Volume"

                        value={`${selectedDelivery.volume_m3} m³`}

                      />

                    </div>



                    {/* TIMELINE */}

                    <div className="mt-6 rounded-3xl bg-neutral-50 p-5">

                      <h3 className="text-sm font-semibold">

                        Delivery timeline

                      </h3>



                      <div className="mt-5 space-y-5">

                        <TimelineItem

                          title="Driver delivery completed"

                          detail={

                            formatDate(

                              selectedDelivery.delivered_at,

                            )

                          }

                          complete

                        />



                        <TimelineItem

                          title="Received by"

                          detail={

                            selectedDelivery.receiver_name ||

                            "Receiver name not recorded"

                          }

                          complete

                        />



                        <TimelineItem

                          title="Store receipt"

                          detail={

                            selectedDelivery.receipt_status ===

                            "confirmed"

                              ? `Confirmed by ${

                                  selectedDelivery.receipt_confirmed_by ??

                                  "Store manager"

                                }`

                              : "Waiting for store manager confirmation"

                          }

                          complete={

                            selectedDelivery.receipt_status ===

                            "confirmed"

                          }

                        />

                      </div>

                    </div>



                    {/* DRIVER NOTE */}

                    {selectedDelivery.delivery_note && (

                      <div className="mt-5 rounded-2xl border border-neutral-200 p-4">

                        <p className="text-[10px] uppercase tracking-wider text-neutral-400">

                          Driver note

                        </p>



                        <p className="mt-2 text-sm text-neutral-700">

                          {

                            selectedDelivery.delivery_note

                          }

                        </p>

                      </div>

                    )}



                    {/* CONFIRMATION FORM */}

                    {selectedDelivery.receipt_status !==

                    "confirmed" ? (

                      <div className="mt-6 border-t border-neutral-200 pt-6">

                        <div>

                          <h3 className="text-base font-semibold">

                            Confirm receipt

                          </h3>



                          <p className="mt-1 text-xs text-neutral-500">

                            Confirm that

                            this delivery

                            was received at

                            the outlet.

                          </p>

                        </div>



                        <div className="mt-5">

                          <label className="text-xs font-medium text-neutral-600">

                            Confirmed by

                          </label>



                          <input

                            value={

                              confirmedBy

                            }

                            onChange={(

                              event,

                            ) =>

                              setConfirmedBy(

                                event.target

                                  .value,

                              )

                            }

                            placeholder="Store manager name"

                            className="mt-2 w-full rounded-2xl border border-neutral-300 px-4 py-3 text-sm outline-none focus:border-neutral-950"

                          />

                        </div>



                        <div className="mt-4">

                          <label className="text-xs font-medium text-neutral-600">

                            Receipt note

                          </label>



                          <textarea

                            value={

                              receiptNote

                            }

                            onChange={(

                              event,

                            ) =>

                              setReceiptNote(

                                event.target

                                  .value,

                              )

                            }

                            placeholder="Goods received in good condition..."

                            className="mt-2 min-h-24 w-full rounded-2xl border border-neutral-300 p-4 text-sm outline-none focus:border-neutral-950"

                          />

                        </div>



                        <button

                          onClick={

                            confirmReceipt

                          }

                          disabled={

                            confirming

                          }

                          className="mt-4 w-full rounded-2xl bg-emerald-600 px-4 py-3.5 text-sm font-medium text-white disabled:opacity-50"

                        >

                          {confirming

                            ? "Confirming..."

                            : "Confirm Receipt"}

                        </button>

                      </div>

                    ) : (

                      <div className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-5">

                        <div className="flex items-start gap-3">

                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-lg text-white">

                            ✓

                          </div>



                          <div>

                            <p className="text-sm font-semibold text-emerald-800">

                              Receipt

                              confirmed

                            </p>



                            <p className="mt-1 text-xs text-emerald-700">

                              Confirmed by{" "}

                              {

                                selectedDelivery.receipt_confirmed_by

                              }

                            </p>



                            <p className="mt-1 text-xs text-emerald-700">

                              {formatDate(

                                selectedDelivery.receipt_confirmed_at,

                              )}

                            </p>

                          </div>

                        </div>



                        {selectedDelivery.receipt_note && (

                          <div className="mt-4 rounded-2xl bg-white/70 p-3">

                            <p className="text-xs text-neutral-600">

                              {

                                selectedDelivery.receipt_note

                              }

                            </p>

                          </div>

                        )}

                      </div>

                    )}

                  </div>

                )}

              </section>

            )}

          </>

        )}

      </div>

    </main>

  );

}



function InfoBox({

  label,

  value,

}: {

  label: string;

  value: string;

}) {

  return (

    <div className="rounded-2xl bg-neutral-50 p-4">

      <p className="text-[10px] uppercase tracking-wider text-neutral-400">

        {label}

      </p>



      <p className="mt-1 text-sm font-semibold">

        {value}

      </p>

    </div>

  );

}



function TimelineItem({

  title,

  detail,

  complete,

}: {

  title: string;

  detail: string;

  complete: boolean;

}) {

  return (

    <div className="flex gap-3">

      <div

        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${

          complete

            ? "bg-emerald-600 text-white"

            : "bg-neutral-200 text-neutral-500"

        }`}

      >

        {complete

          ? "✓"

          : "•"}

      </div>



      <div>

        <p className="text-sm font-medium">

          {title}

        </p>



        <p className="mt-1 text-xs text-neutral-500">

          {detail}

        </p>

      </div>

    </div>

  );

}
