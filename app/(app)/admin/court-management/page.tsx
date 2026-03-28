"use client";

import { useMemo, useState, useEffect } from "react";
import {
  useCourts,
  useCreateCourt,
  useDeleteCourt,
  useSports,
  useLocations,
  useBookableLocations,
} from "@/lib/queries";
import { useAuth } from "@/lib/auth-store";
import { useAdmin } from "../admin-context";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { AdminFilter, AdminTable, AdminPagination } from "../components";
import type { Court } from "@/types";

const COURTS_PAGE_SIZE = 10;

export default function AdminCourtManagementPage() {
  const { user } = useAuth();
  const { locationId } = useAdmin();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [courtFormLocationId, setCourtFormLocationId] = useState("");
  const [name, setName] = useState("");
  const [sportCode, setSportCode] = useState("tennis");

  const { data: allLocations = [] } = useLocations();
  const { data: bookableLocs = [] } = useBookableLocations(user?.role === "super_user");
  const locations =
    user?.role === "super_user" && bookableLocs.length > 0 ? bookableLocs : allLocations;
  const { data: sports = [] } = useSports();
  const { data: courts = [], isLoading: courtsLoading } = useCourts({
    locationId: locationId !== "all" ? locationId : undefined,
    search: search || undefined,
  });
  const createCourt = useCreateCourt();
  const deleteCourt = useDeleteCourt();

  const courtsForUi = useMemo(() => {
    if (user?.role !== "super_user" || bookableLocs.length === 0) return courts;
    const allowed = new Set(bookableLocs.map((l) => l.id));
    return courts.filter((c) => Boolean(c.locationId && allowed.has(c.locationId)));
  }, [courts, bookableLocs, user?.role]);

  const filtered = useMemo(
    () =>
      courtsForUi.filter(
        (c) =>
          !search.trim() ||
          c.name.toLowerCase().includes(search.trim().toLowerCase()),
      ),
    [courtsForUi, search],
  );

  const [courtsPage, setCourtsPage] = useState(1);
  useEffect(() => {
    setCourtsPage(1);
  }, [search, locationId]);

  const paginatedCourts = useMemo(
    () =>
      filtered.slice(
        (courtsPage - 1) * COURTS_PAGE_SIZE,
        courtsPage * COURTS_PAGE_SIZE,
      ),
    [filtered, courtsPage],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Court Management</h1>
        <Button
          onClick={() => {
            setCourtFormLocationId(
              locationId !== "all" ? locationId : (locations[0]?.id ?? ""),
            );
            setModalOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Court
        </Button>
      </div>

      <AdminFilter
        title="Filters"
        description="Courts are scoped by Location in the sidebar. Manage court master data (name + sport) per venue."
        searchPlaceholder="Search by court name..."
        searchValue={search}
        onSearchChange={setSearch}
      />

      <Card>
        <CardContent className="pt-6">
          <AdminTable<Court>
            data={paginatedCourts}
            keyExtractor={(c) => c.id}
            emptyMessage="No courts."
            isLoading={courtsLoading}
            loadingNode={
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            }
            columns={[
          { key: "name", label: "Court Name", render: (c) => <span className="font-medium">{c.name}</span> },
          { key: "sport", label: "Sport", render: (c) => c.sport },
          { key: "locationName", label: "Location Child", render: (c) => c.locationName ?? "—" },
          {
            key: "actions",
            label: "Actions",
            className: "text-right",
            headClassName: "text-right",
            render: (c) => (
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive"
                onClick={() => deleteCourt.mutate(c.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            ),
          } as {
            key: string;
            label: string;
            className?: string;
            headClassName?: string;
            render: (row: Court) => React.ReactNode;
          },
        ]}
          />
          {!courtsLoading && filtered.length > 0 && (
            <AdminPagination
              page={courtsPage}
              pageSize={COURTS_PAGE_SIZE}
              total={filtered.length}
              onPageChange={setCourtsPage}
              className="mt-4 border-t pt-4"
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Court</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Location Child</Label>
              <Select
                value={courtFormLocationId || locations[0]?.id}
                onValueChange={setCourtFormLocationId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location child" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Court Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <Label>Sport</Label>
              <Select value={sportCode} onValueChange={setSportCode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sports.map((s) => (
                    <SelectItem key={s.id} value={s.code}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={async () => {
                const loc = courtFormLocationId || locations[0]?.id;
                if (!loc || !name.trim()) return;
                await createCourt.mutateAsync({
                  locationId: loc,
                  name: name.trim(),
                  sport: sportCode,
                });
                setName("");
                setModalOpen(false);
              }}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
