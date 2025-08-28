// components/pages/MembersPage.jsx
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Plus, Edit, Trash2, User, Mail, Phone, Calendar } from "lucide-react";
import { apiClient } from "../../lib/api";

export function MembersPage() {
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const emptyForm = useMemo(
    () => ({
      name: "",
      email: "",
      phone: "",
      joinDate: new Date().toISOString(),
    }),
    []
  );
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [newMember, setNewMember] = useState(emptyForm);
  const [editingMember, setEditingMember] = useState(null);

  // ---------- helpers ----------
  const text = (v, fallback = "—") => {
    if (v === null || v === undefined) return fallback;
    if (typeof v === "object") return fallback; // never render raw objects
    return String(v);
  };

  const toInt = (v, fallback = 0) => {
    const n = Number.parseInt(v, 10);
    return Number.isFinite(n) ? n : fallback;
  };

  const safeDate = (d) => {
    try {
      const dt = new Date(d);
      return isNaN(dt.getTime()) ? "—" : dt.toLocaleDateString();
    } catch {
      return "—";
    }
  };

  const normalizeMember = (m, idx = 0) => {
    if (!m || typeof m !== "object")
      return {
        id: idx + 1,
        name: "Unknown Member",
        email: "—",
        phone: "—",
        status: "Active",
        membershipType: "Public",
        joinDate: null,
        booksIssued: 0,
        maxBooks: 5,
      };

    const id = m.id ?? m.member_id ?? m._id ?? idx + 1;
    const name =
      (m.name ??
        m.full_name ??
        [m.first_name, m.last_name].filter(Boolean).join(" ")) ||
      "Unknown Member";
    const email = m.email ?? m.email_address ?? "—";
    const phone = m.phone ?? m.phone_number ?? "—";
    const status = m.status ?? (m.is_active === false ? "Inactive" : "Active");
    const membershipType =
      m.membershipType ?? m.type ?? m.membership_type ?? "Public";
    const joinDate =
      m.join_date ?? m.joinDate ?? m.joined_at ?? m.created_at ?? null;
    const booksIssued = toInt(
      m.booksIssued ?? m.active_loans ?? m.issued_count ?? 0,
      0
    );
    const maxBooks = Math.max(toInt(m.maxBooks ?? m.max_books ?? 0, 0) || 5, 1);

    return {
      id,
      name,
      email,
      phone,
      status,
      membershipType,
      joinDate,
      booksIssued,
      maxBooks,
    };
  };

  const normalizeMembers = (payload) => {
    // Accept a lot of shapes:
    // - [ {...}, {...} ]
    // - { members: [...] }
    // - { members: {...} }
    // - { id, name, ... } (single)
    if (Array.isArray(payload))
      return payload.map((m, i) => normalizeMember(m, i));

    const maybe = payload?.members ?? payload?.data ?? payload;
    if (Array.isArray(maybe)) return maybe.map((m, i) => normalizeMember(m, i));
    if (maybe && typeof maybe === "object") return [normalizeMember(maybe, 0)];

    return [];
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-800";
      case "Inactive":
        return "bg-gray-100 text-gray-800";
      case "Suspended":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };
  const getMembershipTypeColor = (type) => {
    switch (type) {
      case "Student":
        return "bg-blue-100 text-blue-800";
      case "Faculty":
        return "bg-purple-100 text-purple-800";
      case "Public":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // ---------- data ----------
  const loadMembers = useCallback(async () => {
    try {
      const data = await apiClient.getMembers();
      setMembers(normalizeMembers(data));
    } catch (error) {
      console.error("Failed to load members:", error);
      setMembers(
        normalizeMembers([
          {
            id: 1,
            name: "John Doe",
            email: "john@example.com",
            phone: "+1 555-111",
            type: "Student",
            is_active: true,
            join_date: "2024-01-15T00:00:00.000Z",
            active_loans: 2,
            max_books: 5,
          },
        ])
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  // ---------- validation & payload ----------
  const validateMember = (f) => {
    if (!f.name?.trim()) return "Name is required";
    if (!f.email?.trim()) return "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim()))
      return "Please enter a valid email";
    if (!f.phone?.trim()) return "Phone is required";
    return "";
  };

  // Create: send only { name, email, phone, join_date }
  const buildCreatePayload = (f) => ({
    name: f.name.trim(),
    email: f.email.trim(),
    phone: f.phone.trim(),
    join_date: f.joinDate, // ISO string
  });

  // Update: send only { name, email, phone }
  const buildUpdatePayload = (f) => ({
    name: f.name.trim(),
    email: f.email.trim(),
    phone: f.phone.trim(),
  });

  // ---------- add ----------
  const openAdd = () => {
    setFormError("");
    setNewMember(emptyForm);
    setIsAddOpen(true);
  };

  const handleCreate = async () => {
    setFormError("");
    const err = validateMember(newMember);
    if (err) return setFormError(err);
    try {
      setSaving(true);
      await apiClient.createMember(buildCreatePayload(newMember));
      setIsAddOpen(false);
      setNewMember(emptyForm);
      await loadMembers();
    } catch (e) {
      setFormError(e?.message || "Failed to create member");
    } finally {
      setSaving(false);
    }
  };

  // ---------- edit ----------
  const openEdit = (m) => {
    setFormError("");
    setEditingMember(m);
    setNewMember({
      name: m.name ?? "",
      email: m.email ?? "",
      phone: m.phone ?? "",
      joinDate: m.joinDate ?? new Date().toISOString(),
    });
    setIsEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingMember) return;
    setFormError("");
    const err = validateMember(newMember);
    if (err) return setFormError(err);
    try {
      setSaving(true);
      await apiClient.updateMember(
        editingMember.id,
        buildUpdatePayload(newMember)
      );
      setIsEditOpen(false);
      setEditingMember(null);
      setNewMember(emptyForm);
      await loadMembers();
    } catch (e) {
      setFormError(e?.message || "Failed to update member");
    } finally {
      setSaving(false);
    }
  };

  // ---------- delete ----------
  const handleDelete = async (id) => {
    if (!confirm("Delete this member?")) return;
    try {
      await apiClient.deleteMember(id);
      await loadMembers();
    } catch (e) {
      console.error("Delete member failed:", e);
    }
  };

  // ---------- UI ----------
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Member Management
          </h1>
          <p className="text-gray-600">Manage library members</p>
        </div>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={openAdd}
              className="bg-gradient-to-r from-blue-600 to-cyan-600"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New Member
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">
                Add Member
              </DialogTitle>
              <DialogDescription>Enter the member details.</DialogDescription>
            </DialogHeader>

            {formError && (
              <div className="text-sm text-red-600 border border-red-200 bg-red-50 rounded-md p-2 mb-2">
                {formError}
              </div>
            )}

            <div className="grid gap-4 py-2">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-medium">Name</Label>
                <Input
                  value={newMember.name}
                  onChange={(e) =>
                    setNewMember({ ...newMember, name: e.target.value })
                  }
                  className="col-span-3 border-gray-200 focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-medium">Email</Label>
                <Input
                  type="email"
                  value={newMember.email}
                  onChange={(e) =>
                    setNewMember({ ...newMember, email: e.target.value })
                  }
                  className="col-span-3 border-gray-200 focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-medium">Phone</Label>
                <Input
                  value={newMember.phone}
                  onChange={(e) =>
                    setNewMember({ ...newMember, phone: e.target.value })
                  }
                  className="col-span-3 border-gray-200 focus:border-blue-500"
                />
              </div>
            </div>

            <DialogFooter>
              <Button onClick={handleCreate} disabled={saving}>
                {saving ? "Saving..." : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {members.map((m) => {
          const issued = toInt(m.booksIssued, 0);
          const capacity = Math.max(toInt(m.maxBooks, 0), 1);
          const pct = Math.min(100, Math.max(0, (issued / capacity) * 100));

          return (
            <Card
              key={m.id}
              className="border-0 shadow-lg hover:shadow-xl transition-all duration-200 bg-white"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-100 to-cyan-100 rounded-xl flex items-center justify-center">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(m)}
                      className="h-8 w-8 p-0 hover:bg-gray-100"
                    >
                      <Edit className="h-4 w-4 text-gray-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(m.id)}
                      className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* display-only badges if provided */}
                <div className="flex flex-col space-y-2 mb-3">
                  <Badge className={getStatusColor(m.status)}>
                    {text(m.status, "Active")}
                  </Badge>
                  <Badge className={getMembershipTypeColor(m.membershipType)}>
                    {text(m.membershipType, "Public")}
                  </Badge>
                </div>

                <CardTitle className="text-lg font-semibold text-gray-900">
                  {text(m.name)}
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Member ID: {text(m.id)}
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="space-y-3 text-sm">
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-900">{text(m.email)}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-900">{text(m.phone)}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-900">
                      Joined: {safeDate(m.joinDate)}
                    </span>
                  </div>

                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Books Issued</p>
                    <p className="font-medium text-gray-900">
                      {issued} / {capacity}
                    </p>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Edit Dialog */}
      <Dialog
        open={isEditOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsEditOpen(false);
            setEditingMember(null);
            setNewMember(emptyForm);
            setFormError("");
          }
        }}
      >
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Edit Member
            </DialogTitle>
            <DialogDescription>Update member details.</DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="text-sm text-red-600 border border-red-200 bg-red-50 rounded-md p-2 mb-2">
              {formError}
            </div>
          )}

          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right font-medium">Name</Label>
              <Input
                value={newMember.name}
                onChange={(e) =>
                  setNewMember({ ...newMember, name: e.target.value })
                }
                className="col-span-3 border-gray-200 focus:border-blue-500"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right font-medium">Email</Label>
              <Input
                type="email"
                value={newMember.email}
                onChange={(e) =>
                  setNewMember({ ...newMember, email: e.target.value })
                }
                className="col-span-3 border-gray-200 focus:border-blue-500"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right font-medium">Phone</Label>
              <Input
                value={newMember.phone}
                onChange={(e) =>
                  setNewMember({ ...newMember, phone: e.target.value })
                }
                className="col-span-3 border-gray-200 focus:border-blue-500"
              />
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleUpdate} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
