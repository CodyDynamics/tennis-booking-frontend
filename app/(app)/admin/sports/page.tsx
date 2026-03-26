"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { AdminTable } from "../components";
import {
  useSports,
  useCreateSport,
  useUpdateSport,
  useDeleteSport,
} from "@/lib/queries";
import type { SportApi } from "@/lib/api/endpoints/sports";

export default function AdminSportsPage() {
  const { data: sports = [], isLoading } = useSports();
  const createSport = useCreateSport();
  const updateSport = useUpdateSport();
  const deleteSport = useDeleteSport();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SportApi | null>(null);
  const [form, setForm] = useState({
    code: "",
    name: "",
    description: "",
    imageUrl: "",
  });

  const reset = () => {
    setEditing(null);
    setForm({ code: "", name: "", description: "", imageUrl: "" });
  };

  const onCreate = () => {
    reset();
    setOpen(true);
  };

  const onEdit = (row: SportApi) => {
    setEditing(row);
    setForm({
      code: row.code,
      name: row.name,
      description: row.description ?? "",
      imageUrl: row.imageUrl ?? "",
    });
    setOpen(true);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = {
      code: form.code.trim(),
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      imageUrl: form.imageUrl.trim() || undefined,
    };
    if (editing) {
      await updateSport.mutateAsync({ id: editing.id, body }).catch(() => {});
    } else {
      await createSport.mutateAsync(body).catch(() => {});
    }
    setOpen(false);
    reset();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Sports</h1>
        <Button onClick={onCreate} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="mr-2 h-4 w-4" />
          Add Sport
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <AdminTable<SportApi>
            data={sports}
            keyExtractor={(s) => s.id}
            emptyMessage="No sports found."
            isLoading={isLoading}
            loadingNode={
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            }
            columns={[
              { key: "code", label: "Code", render: (s) => s.code },
              { key: "name", label: "Name", render: (s) => <span className="font-medium">{s.name}</span> },
              { key: "description", label: "Description", render: (s) => s.description ?? "—" },
              {
                key: "actions",
                label: "Actions",
                className: "text-right",
                headClassName: "text-right",
                render: (s) => (
                  <>
                    <Button variant="ghost" size="icon" onClick={() => onEdit(s)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => deleteSport.mutate(s.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                ),
              },
            ]}
          />
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Sport" : "Create Sport"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label>Code</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                placeholder="ball-machine"
                required
              />
            </div>
            <div>
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ball Machine"
                required
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Optional"
              />
            </div>
            <div>
              <Label>Image URL</Label>
              <Input
                value={form.imageUrl}
                onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                placeholder="https://..."
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">{editing ? "Save" : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

