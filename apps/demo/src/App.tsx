import { useState } from "react";
import { DodoCheckout } from "./dodo-checkout";

type LogEntry = {
  id: number;
  time: string;
  type: string;
  message?: string;
};

function App() {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = (type: string, message?: string) => {
    setLogs((previous) => [
      ...previous,
      {
        id: Date.now() + Math.random(),
        time: new Date().toLocaleTimeString(),
        type,
        message,
      },
    ]);
  };

  const handleBuy = () => {
    addLog("checkout.opened");

    DodoCheckout.open({
      productId: "prod_123",

      onSuccess: ({ sessionId }) => {
        addLog("payment.success", sessionId);
      },

      onClose: ({ reason }) => {
        addLog("checkout.closed", reason);
      },

      onError: ({ code, message }) => {
        addLog(`payment.error · ${code}`, message);
      },
    });
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-5xl px-6 py-16">
        {/* Header */}
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-slate-400">
            Dodo Checkout
          </p>

          <h1 className="mt-3 text-4xl font-semibold tracking-tight">
            Embeddable checkout
          </h1>

          <p className="mt-4 text-lg leading-8 text-slate-400">
            A tiny checkout that lives on the merchant's website
            without exposing payment details to the host page.
          </p>
        </div>

        {/* Product */}
        <section className="mt-12 grid gap-6 md:grid-cols-[1fr_320px]">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8">
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="text-sm font-medium text-slate-400">
                  Product
                </p>

                <h2 className="mt-2 text-2xl font-semibold">
                  Premium Developer Plan
                </h2>

                <p className="mt-3 max-w-lg text-sm leading-6 text-slate-400">
                  Everything you need to get started with the
                  premium experience.
                </p>
              </div>

              <div className="text-right">
                <p className="text-2xl font-semibold">$49</p>
                <p className="text-sm text-slate-500">USD</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleBuy}
              className="mt-8 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
            >
              Buy Premium
            </button>
          </div>

          {/* Architecture */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm font-medium text-slate-400">
              Integration
            </p>

            <div className="mt-4 space-y-4 text-sm">
              <div>
                <p className="text-slate-500">Product ID</p>
                <p className="mt-1 font-mono text-slate-200">
                  prod_123
                </p>
              </div>

              <div>
                <p className="text-slate-500">Checkout</p>
                <p className="mt-1 text-slate-200">
                  Cross-origin iframe
                </p>
              </div>

              <div>
                <p className="text-slate-500">Communication</p>
                <p className="mt-1 text-slate-200">
                  postMessage
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Event Log */}
        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
            <div>
              <h2 className="font-semibold">Callback log</h2>

              <p className="mt-1 text-xs text-slate-500">
                Events received from the checkout SDK
              </p>
            </div>

            <button
              type="button"
              onClick={clearLogs}
              className="text-xs font-medium text-slate-400 transition hover:text-white"
            >
              Clear
            </button>
          </div>

          <div className="min-h-48">
            {logs.length === 0 ? (
              <div className="flex min-h-48 items-center justify-center px-6 text-sm text-slate-600">
                No events yet. Click "Buy Premium" to start.
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-4 px-6 py-4"
                  >
                    <span className="shrink-0 font-mono text-xs text-slate-600">
                      {log.time}
                    </span>

                    <div className="min-w-0">
                      <p className="font-mono text-sm text-slate-200">
                        {log.type}
                      </p>

                      {log.message && (
                        <p className="mt-1 break-all text-xs text-slate-500">
                          {log.message}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

export default App;