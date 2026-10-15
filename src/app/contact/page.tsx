"use client";

import { useState } from "react";
import { Button, Input, Textarea } from "@/components/ui";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !message.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError("Please fill in your name, a valid email and a message.");
      return;
    }
    setError("");
    // Mock send — in production this posts to the support mailbox.
    setSent(true);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-display text-3xl font-extrabold">Contact us</h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
        Questions about an order, a product or selling on ShopFusion? Send us a note —
        we reply within one business day.
      </p>

      {sent ? (
        <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center dark:border-emerald-900 dark:bg-emerald-950" role="status">
          <p className="font-display text-lg font-bold text-emerald-800 dark:text-emerald-200">Message received ✓</p>
          <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-300">
            Thanks {name.trim().split(" ")[0]} — our support team will get back to you at {email} shortly.
          </p>
          <Button variant="secondary" size="sm" className="mt-4" onClick={() => { setSent(false); setName(""); setEmail(""); setMessage(""); }}>
            Send another message
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-8 space-y-4">
          <Input label="Your name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Priya Sharma" autoComplete="name" />
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
          <Textarea label="Message" rows={6} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="How can we help?" />
          {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
          <Button type="submit" size="lg">Send message</Button>
        </form>
      )}

      <div className="mt-10 rounded-2xl border border-slate-200 p-5 text-sm dark:border-slate-800">
        <p className="font-semibold">Prefer email?</p>
        <p className="mt-1 text-slate-600 dark:text-slate-300">
          Write to us directly at{" "}
          <a href="mailto:support@shopfusion.example" className="font-medium text-fusion-700 hover:underline dark:text-fusion-300">
            support@shopfusion.example
          </a>
        </p>
      </div>
    </div>
  );
}
