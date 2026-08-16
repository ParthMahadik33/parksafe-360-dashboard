import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Cpu, Database, FolderTree, Server, TerminalSquare } from "lucide-react";
import { useState } from "react";
import { AppLayout } from "@/components/safepark/AppLayout";
import { StatusBadge } from "@/components/safepark/StatusBadge";
import { useSafepark } from "@/hooks/useSafepark";
import { DB_STRUCTURE, ESP32_SNIPPET, FLASK_SNIPPET, HARDWARE, RULES } from "@/lib/safepark/docs";

export const Route = createFileRoute("/setup")({
  head: () => ({
    meta: [
      { title: "Setup & Hardware — SAFEPARK 360" },
      {
        name: "description",
        content:
          "Firebase database structure, ESP32 wiring and firmware, Flask backend and step-by-step run instructions for SAFEPARK 360.",
      },
      { property: "og:title", content: "Setup & Hardware — SAFEPARK 360" },
      {
        property: "og:description",
        content: "Everything needed to wire the ESP32, configure Firebase and run the SAFEPARK 360 dashboard.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Setup,
});

function CodeBlock({ title, code }: { title: string; code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="card-elevated overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <p className="truncate text-xs font-semibold">{title}</p>
        <button
          onClick={() => {
            void navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground hover:border-primary hover:text-primary"
        >
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto bg-surface-2/50 p-4 font-mono text-[11px] leading-relaxed text-muted-foreground">
        {code}
      </pre>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Cpu;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-primary" />
        <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Setup() {
  const s = useSafepark();

  return (
    <AppLayout title="Setup & Hardware" subtitle="Firebase, ESP32 and backend configuration guide">
      <div className="card-elevated p-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone={s.source === "firebase" ? "success" : "warning"}>
            {s.source === "firebase" ? "Firebase connected" : "Simulation mode active"}
          </StatusBadge>
          <p className="text-xs text-muted-foreground">
            Paste your credentials in{" "}
            <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono">
              src/lib/safepark/firebase-config.ts
            </code>{" "}
            — the dashboard switches to live Firebase data automatically.
          </p>
        </div>
      </div>

      <Section icon={Database} title="1. Firebase setup">
        <ol className="card-elevated space-y-2 p-4 text-xs text-muted-foreground">
          <li>1. Create a project at console.firebase.google.com.</li>
          <li>2. Build → Realtime Database → Create database (test mode for the demo).</li>
          <li>3. Project settings → Web app (&lt;/&gt;) → copy the firebaseConfig object.</li>
          <li>
            4. Paste it into <span className="font-mono text-foreground">src/lib/safepark/firebase-config.ts</span>{" "}
            (including <span className="font-mono text-foreground">databaseURL</span>).
          </li>
          <li>5. Authentication → Sign-in method → enable Email/Password and add a device user for the ESP32.</li>
          <li>6. Apply the security rules below so the dashboard can read and the device can write.</li>
        </ol>
        <CodeBlock title="Realtime Database rules" code={RULES} />
        <CodeBlock title="Database structure — SAFEPARK360" code={DB_STRUCTURE} />
      </Section>

      <Section icon={Cpu} title="2. ESP32 hardware & firmware">
        <div className="card-elevated overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-xs">
              <thead className="bg-surface-2/60 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">Component</th>
                  <th className="px-4 py-3 font-semibold">ESP32 pins</th>
                  <th className="px-4 py-3 font-semibold">Purpose</th>
                </tr>
              </thead>
              <tbody>
                {HARDWARE.map(([c, p, u]) => (
                  <tr key={c} className="border-t border-border/60">
                    <td className="px-4 py-3 font-semibold">{c}</td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">{p}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card-elevated p-4 text-xs text-muted-foreground">
          <p className="font-semibold text-foreground">Arduino libraries</p>
          <p className="mt-1">
            Firebase ESP Client (mobizt) · MFRC522 · ESP32Servo · LiquidCrystal_I2C · RTClib (optional).
            Board: “ESP32 Dev Module”, upload speed 115200. Full sketch:{" "}
            <span className="font-mono text-foreground">esp32/safepark360.ino</span>.
          </p>
        </div>
        <CodeBlock title="esp32/safepark360.ino (key sections)" code={ESP32_SNIPPET} />
      </Section>

      <Section icon={Server} title="3. Python (Flask) backend — optional">
        <div className="card-elevated p-4 text-xs text-muted-foreground">
          <p>
            <span className="font-semibold text-foreground">Where Python is NOT needed:</span> live slot
            status, vehicle records, alerts and charts — the dashboard subscribes to Firebase directly and
            updates without refreshing.
          </p>
          <p className="mt-2">
            <span className="font-semibold text-foreground">Where Python helps:</span> service-account
            (admin) access, report generation, RFID card registration and any scheduled server logic. Files:{" "}
            <span className="font-mono text-foreground">backend/app.py</span>,{" "}
            <span className="font-mono text-foreground">backend/firebase_config.py</span>,{" "}
            <span className="font-mono text-foreground">backend/requirements.txt</span>.
          </p>
        </div>
        <CodeBlock title="backend/app.py (excerpt)" code={FLASK_SNIPPET} />
      </Section>

      <Section icon={FolderTree} title="4. Project structure">
        <CodeBlock
          title="Repository layout"
          code={`SAFEPARK360/
├── src/                       # dashboard (HTML5 + CSS3 + JavaScript/React)
│   ├── routes/                # dashboard, vehicles, alerts, safety, analytics, setup
│   ├── components/safepark/   # layout, slot cards, stat cards, status badges
│   ├── lib/safepark/          # firebase-config.ts, store.ts, simulator.ts, types.ts
│   └── styles.css             # design system (colors, cards, badges)
├── backend/                   # optional Python API
│   ├── app.py
│   ├── firebase_config.py
│   └── requirements.txt
├── esp32/
│   └── safepark360.ino        # complete ESP32 firmware
└── README.md`}
        />
      </Section>

      <Section icon={TerminalSquare} title="5. Run, test and data flow">
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="card-elevated p-4 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">Run the dashboard</p>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-surface-2/60 p-3 font-mono text-[11px]">
{`npm install
npm run dev      # open the preview URL`}
            </pre>
            <p className="mt-3 font-semibold text-foreground">Run the optional backend</p>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-surface-2/60 p-3 font-mono text-[11px]">
{`cd backend
pip install -r requirements.txt
python app.py    # http://localhost:5000/api/health`}
            </pre>
          </div>
          <div className="card-elevated p-4 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">Test without hardware</p>
            <p className="mt-1">
              Leave the placeholder credentials in place: the built-in simulator generates realistic RFID
              entries, exits, reserved-slot violations and MQ-2 readings every 4 seconds — ideal for a demo.
            </p>
            <p className="mt-3 font-semibold text-foreground">Real data flow</p>
            <p className="mt-1">
              Sensors → ESP32 (reads every 2 s) → Firebase Realtime Database → websocket push → dashboard
              re-renders instantly. Nothing is polled and no refresh is required.
            </p>
            <p className="mt-3 font-semibold text-foreground">Troubleshooting</p>
            <ul className="mt-1 list-disc space-y-1 pl-4">
              <li>ESP32 offline badge → check Wi-Fi credentials and the 30 s heartbeat.</li>
              <li>Empty tables → verify the database URL and that rules allow read.</li>
              <li>Wrong occupancy → recalibrate OCCUPIED_CM for your slot height.</li>
              <li>Wrong times → set the NTP offset to 19800 for IST.</li>
            </ul>
          </div>
        </div>
      </Section>
    </AppLayout>
  );
}
