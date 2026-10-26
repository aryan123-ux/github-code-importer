import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, Loader2, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { monitoredApiInput } from "@/lib/monitored-apis";

export function MonitoredApis({ onSignIn }: { onSignIn: () => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const ownerId = user?.id;
  const queryKey = ["monitored-apis", ownerId];
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [interval, setInterval] = useState("60");
  const [formError, setFormError] = useState<string | null>(null);
  const apis = useQuery({
    queryKey,
    enabled: Boolean(ownerId),
    queryFn: async () => {
      if (!ownerId) return [];
      const { data, error } = await supabase.from("monitored_apis").select("id, name, endpoint_url, check_interval, created_at").eq("user_id", ownerId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  useEffect(() => {
    if (!ownerId) { setOpen(false); return; }
    const channel = supabase.channel(`monitored-apis-${ownerId}-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "monitored_apis", filter: `user_id=eq.${ownerId}` }, () => {
        void queryClient.invalidateQueries({ queryKey: ["monitored-apis", ownerId] });
      }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [ownerId, queryClient]);
  const save = useMutation({
    mutationFn: async (input: ReturnType<typeof monitoredApiInput.parse>) => {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user || auth.user.id !== ownerId) throw new Error("Sign in again before saving.");
      const { data, error } = await supabase.from("monitored_apis").insert({ ...input, user_id: auth.user.id }).select("id").single();
      if (error) throw error;
      const readback = await supabase.from("monitored_apis").select("id").eq("id", data.id).eq("user_id", auth.user.id).single();
      if (readback.error) throw readback.error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey });
      setOpen(false); setName(""); setEndpoint(""); setInterval("60");
    },
    onError: () => setFormError("Could not save this API. Check your connection and try again."),
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (save.isPending) return;
    const result = monitoredApiInput.safeParse({ name, endpoint_url: endpoint, check_interval: Number(interval) });
    if (!result.success) { setFormError(result.error.issues[0]?.message ?? "Check the API details."); return; }
    setFormError(null); save.mutate(result.data);
  };
  return (
    <section aria-label="Monitored APIs">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold"><Activity className="size-4 text-silver" /> Monitored APIs</h3>
        <Button variant="terminal" size="sm" onClick={() => { setFormError(null); if (!user) onSignIn(); else setOpen(true); }}><Plus className="size-4" /> Add New API</Button>
      </header>
      {!user ? <p className="text-sm text-muted-foreground">Sign in to save your APIs.</p> : apis.isPending ? <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Loading APIs…</p> : apis.isError ? <div className="flex items-center gap-3 text-sm text-destructive">Could not load APIs.<Button variant="ghost" size="sm" onClick={() => void apis.refetch()}><RefreshCw className="size-4" /> Retry</Button></div> : !apis.data?.length ? <p className="text-sm text-muted-foreground">No APIs added yet.</p> : (
        <div className="space-y-4">
          {apis.data.map(api => <article key={api.id} className="min-w-0 border-b border-silver/20 pb-4">
            <h4 className="break-words text-sm font-semibold">{api.name}</h4>
            <p className="mt-2 break-all font-mono text-xs text-muted-foreground">{api.endpoint_url}</p>
            <div className="mt-4 flex flex-wrap justify-between gap-2 font-mono text-[10px] text-silver"><span>Interval · {api.check_interval}s</span><span className="text-muted-foreground">Not checked</span></div>
          </article>)}
        </div>
      )}
      <Dialog open={open} onOpenChange={value => { if (!save.isPending) setOpen(value); }}>
        <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-lg">
          <DialogHeader><DialogTitle>Add New API</DialogTitle><DialogDescription>API details</DialogDescription></DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2"><Label htmlFor="api-name">API Name</Label><Input id="api-name" required maxLength={100} value={name} onChange={event => setName(event.target.value)} disabled={save.isPending} /></div>
            <div className="space-y-2"><Label htmlFor="api-endpoint">Endpoint URL</Label><Input id="api-endpoint" type="url" required maxLength={2048} placeholder="https://api.example.com/health" value={endpoint} onChange={event => setEndpoint(event.target.value)} disabled={save.isPending} /></div>
            <div className="space-y-2"><Label htmlFor="api-interval">Check Interval (seconds)</Label><Input id="api-interval" type="number" required min={1} step={1} value={interval} onChange={event => setInterval(event.target.value)} disabled={save.isPending} /></div>
            {formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={save.isPending} onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" variant="sentinel" disabled={save.isPending}>{save.isPending && <Loader2 className="size-4 animate-spin" />} {save.isPending ? "Saving…" : "Save API"}</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}