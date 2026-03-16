"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Users, Shield } from "lucide-react";

export default function AdminOverviewPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Admin</h1>
      <p className="text-muted-foreground">Manage courts, users, and permissions.</p>
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/admin/courts">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center gap-2">
              <MapPin className="h-5 w-5" />
              <CardTitle className="text-lg">Courts</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>Create, edit, and delete courts. Filter by branch and status.</CardDescription>
              <Button variant="link" className="p-0 mt-2">Manage courts →</Button>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/users">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center gap-2">
              <Users className="h-5 w-5" />
              <CardTitle className="text-lg">Users</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>Manage users and filter by role. Full CRUD.</CardDescription>
              <Button variant="link" className="p-0 mt-2">Manage users →</Button>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/roles">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center gap-2">
              <Shield className="h-5 w-5" />
              <CardTitle className="text-lg">Roles & Permissions</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>RBAC: assign which pages and actions each role can access.</CardDescription>
              <Button variant="link" className="p-0 mt-2">Manage permissions →</Button>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
