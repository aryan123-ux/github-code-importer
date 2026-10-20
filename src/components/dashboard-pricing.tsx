import { useState } from "react";
import { ArrowRight, Check, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { enterprisePlan, startupPlan } from "@/lib/dashboard";

export function DashboardPricing() {
  const [selected, setSelected] = useState<"Startup" | "Enterprise" | null>(null);
  return (
    <section aria-labelledby="pricing-title" className="mt-12 border-t border-silver/15 pt-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 id="pricing-title" className="text-xl font-bold">Plans</h2><span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Built for your next stage</span></div>
      <div className="grid gap-5 md:grid-cols-2">
        <article className="flex flex-col rounded-lg border border-primary/40 bg-terminal-panel p-6">
          <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-lg font-semibold">Startup Plan</h3><span className="rounded-sm border border-silver/25 px-2 py-1 font-mono text-[10px] uppercase text-silver">First {startupPlan.earlyUserLimit} users</span></div>
          <div className="mt-5 flex items-baseline gap-3"><s className="text-lg text-muted-foreground">${startupPlan.anchorPrice}</s><span className="text-4xl font-bold">${startupPlan.monthlyPrice}<span className="text-sm font-normal text-muted-foreground">/mo</span></span></div>
          <p className="mt-2 text-xs text-silver">{startupPlan.trialDays}-Day Free Trial</p>
          <ul className="my-6 space-y-2 text-xs text-muted-foreground">{["Continuous API surface monitoring", "PQC security lattice", "Distributed self-healing telemetry"].map(item => <li key={item} className="flex gap-2"><Check className="size-3.5 shrink-0 text-silver" />{item}</li>)}</ul>
          <Button variant="sentinel" className="mt-auto w-full" onClick={() => setSelected("Startup")}>Start 14-Day Free Trial <ArrowRight /></Button>
        </article>
        <article className="flex flex-col rounded-lg border border-silver/25 bg-terminal-panel p-6">
          <div className="flex items-center justify-between"><h3 className="text-lg font-semibold">Enterprise Plan</h3><Building2 className="size-5 text-silver" /></div>
          <div className="mt-5 text-4xl font-bold">${enterprisePlan.anchorPrice}<span className="ml-2 text-sm font-normal text-muted-foreground">anchor price</span></div>
          <p className="mt-2 text-xs text-silver">Enterprise scope &amp; terms by agreement</p>
          <ul className="my-6 space-y-2 text-xs text-muted-foreground">{["Organization-wide API coverage", "Dedicated security requirements", "Custom deployment scope"].map(item => <li key={item} className="flex gap-2"><Check className="size-3.5 shrink-0 text-silver" />{item}</li>)}</ul>
          <Button variant="outline" className="mt-auto w-full border-silver/30" onClick={() => setSelected("Enterprise")}>Enterprise inquiry <ArrowRight /></Button>
        </article>
      </div>
      <Dialog open={selected !== null} onOpenChange={open => { if (!open) setSelected(null); }}><DialogContent><DialogTitle>{selected} Plan</DialogTitle><DialogDescription>Payments and enterprise inquiries aren’t connected yet. No trial has started and no charge has been made.</DialogDescription><Button variant="outline" onClick={() => setSelected(null)}>Close</Button></DialogContent></Dialog>
    </section>
  );
}