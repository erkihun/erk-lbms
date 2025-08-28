"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Plus, Edit, Trash2, User, Mail, Phone, Shield } from "lucide-react";
import { apiClient } from "../../lib/api";

/* ------------------- helpers (safe rendering & mapping) ------------------- */
const s = (v, fallback = "—") => {
  if (v === null || v === undefined) return fallback;
  if (typeof v === "object") return fallback;
  return String(v);
};

const errStr = (e, fallback = "Something went wrong") => {
  if (!e) return fallback;
  if (typeof e === "string") return e;
  if (e?.message && typeof e.message === "string") return e.message;
  try {
    return JSON.stringify(e);
  } catch {
    return fallback;
  }
};

const safeDate = (d) => {
  if (!d) return "—";
  try {
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? "—" : dt.toLocaleDateString();
  } catch {
    return "—";
  }
};

// Normalize one staff record coming from many possible shapes
const normalizeStaff = (m, fallbackId) => {
  const id = m?.id ?? m?.staff_id ?? fallbackId ?? crypto.randomUUID();
  const name =
    s(m?.name) !== "—"
      ? m.name
      : s([m?.first_name, m?.last_name].filter(Boolean).join(" "), "Unknown");
  const email = s(m?.email, "");
  const phone =
    s(m?.phone) !== "—" ? m.phone : s(m?.phone_number ?? m?.mobile ?? "", "");
  const role = s(m?.role, "librarian"); // default to librarian
  const department = s(m?.department ?? m?.dept ?? "", "");
  const joinDate =
    m?.join_date ?? m?.joined_at ?? m?.created_at ?? m?.createdAt ?? null; // render-only; not sent to API
  // status is often not part of backend; render Active by default
  const status = s(m?.status, "Active");

  return { id, name, email, phone, role, department, joinDate, status };
};

const mapCreatePayload = (form) => ({
  name: String(form.name || "").trim(),
  email: String(form.email || "").trim(),
  phone: String(form.phone || "").trim(),
  role: String(form.role || "librarian").trim(),
  department: form.department ? String(form.department).trim() : undefined,
});

const mapUpdatePayload = (form) => ({
  name: form.name !== undefined ? String(form.name).trim() : undefined,
  email: form.email !== undefined ? String(form.email).trim() : undefined,
  phone: form.phone !== undefined ? String(form.phone).trim() : undefined,
  role: form.role !== undefined ? String(form.role).trim() : undefined,
  department:
    form.department !== undefined ? String(form.department).trim() : undefined,
});

/* -------------------------------- component ------------------------------- */
export function StaffPage() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [globalError, setGlobalError] = useState("");

  // Add/Edit dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null); // normalized staff object or null
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "librarian",
    department: "",
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Delete confirmation
  const [deletingId, setDeletingId] = useState(null);

  const getStatusColor = (status) => {
    return s(status) === "Active"
      ? "bg-green-100 text-green-800"
      : "bg-gray-100 text-gray-800";
  };

  const getRoleColor = (role) => {
    return s(role) === "admin"
      ? "bg-purple-100 text-purple-800"
      : "bg-blue-100 text-blue-800";
  };

  const loadStaff = async () => {
    setGlobalError("");
    setLoading(true);
    try {
      const data = await apiClient.getStaff();
      // Accept many shapes: array, {staff: [...]}, {data: [...]}
      const list = Array.isArray(data?.staff)
        ? data.staff
        : Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
        ? data.data
        : [];
      const normalized = list.map((m, i) => normalizeStaff(m, i + 1));
      if (normalized.length === 0) {
        // fallback demo
        const demo = [
          {
            id: 1,
            name: "Admin User",
            email: "admin@library.com",
            phone: "+1 (555) 000-0001",
            role: "admin",
            status: "Active",
            joinDate: "2023-01-15",
            department: "Administration",
          },
          {
            id: 2,
            name: "John Librarian",
            email: "librarian@library.com",
            phone: "+1 (555) 000-0002",
            role: "librarian",
            status: "Active",
            joinDate: "2023-03-20",
            department: "Circulation",
          },
        ];
        setStaff(demo.map((m, i) => normalizeStaff(m, i + 1)));
      } else {
        setStaff(normalized);
      }
    } catch (e) {
      console.error("Failed to load staff:", e);
      setGlobalError(errStr(e, "Failed to load staff"));
      // fallback demo
      const demo = [
        {
          id: 1,
          name: "Admin User",
          email: "admin@library.com",
          phone: "+1 (555) 000-0001",
          role: "admin",
          status: "Active",
          joinDate: "2023-01-15",
          department: "Administration",
        },
        {
          id: 2,
          name: "John Librarian",
          email: "librarian@library.com",
          phone: "+1 (555) 000-0002",
          role: "librarian",
          status: "Active",
          joinDate: "2023-03-20",
          department: "Circulation",
        },
      ];
      setStaff(demo.map((m, i) => normalizeStaff(m, i + 1)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({
      name: "",
      email: "",
      phone: "",
      role: "librarian",
      department: "",
    });
    setFormError("");
    setIsDialogOpen(true);
  };

  const openEdit = (member) => {
    setEditing(member);
    setForm({
      name: s(member.name, ""),
      email: s(member.email, ""),
      phone: s(member.phone, ""),
      role: s(member.role, "librarian"),
      department: s(member.department, ""),
    });
    setFormError("");
    setIsDialogOpen(true);
  };

  const validateForm = () => {
    if (!form.name.trim()) return "Name is required";
    if (!form.email.trim()) return "Email is required";
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
    if (!emailOk) return "Please provide a valid email address";
    // phone optional
    // role limited to admin/librarian for now
    if (!["admin", "librarian"].includes(form.role)) return "Invalid role";
    return "";
  };

  const handleSave = async () => {
    setFormError("");
    const v = validateForm();
    if (v) {
      setFormError(v);
      return;
    }

    try {
      setSaving(true);
      if (editing) {
        await apiClient.updateStaff(editing.id, mapUpdatePayload(form));
      } else {
        await apiClient.createStaff(mapCreatePayload(form));
      }
      setIsDialogOpen(false);
      setEditing(null);
      setForm({
        name: "",
        email: "",
        phone: "",
        role: "librarian",
        department: "",
      });
      await loadStaff();
    } catch (e) {
      setFormError(errStr(e, "Failed to save staff member"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this staff member?")) return;
    setDeletingId(id);
    try {
      await apiClient.deleteStaff(id);
      await loadStaff();
    } catch (e) {
      alert(errStr(e, "Failed to delete staff member"));
    } finally {
      setDeletingId(null);
    }
  };

  /* --------------------------------- UI ---------------------------------- */
  if (loading) {
    return (
      <div className="space-y-6">
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
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Staff Management
          </h1>
          <p className="text-gray-600">
            Manage library staff and their permissions
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={openAdd}
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-lg"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Staff Member
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">
                {editing ? "Edit Staff Member" : "Add Staff Member"}
              </DialogTitle>
              <DialogDescription>
                {editing
                  ? "Update staff member details."
                  : "Enter the new staff member details."}
              </DialogDescription>
            </DialogHeader>

            {s(formError) !== "—" && (
              <div className="text-sm text-red-600 border border-red-200 bg-red-50 rounded-md p-2 mb-2">
                {s(formError)}
              </div>
            )}

            <div className="grid gap-4 py-2">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-medium">Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  className="col-span-3 border-gray-200 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-medium">Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                  className="col-span-3 border-gray-200 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-medium">Phone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, phone: e.target.value }))
                  }
                  className="col-span-3 border-gray-200 focus:border-blue-500"
                  placeholder="+1 (555) 000-0000"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-medium">Role</Label>
                <Select
                  value={form.role}
                  onValueChange={(val) => setForm((f) => ({ ...f, role: val }))}
                >
                  <SelectTrigger className="col-span-3 border-gray-200 focus:border-blue-500">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="librarian">Librarian</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-medium">Department</Label>
                <Input
                  value={form.department}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, department: e.target.value }))
                  }
                  className="col-span-3 border-gray-200 focus:border-blue-500"
                  placeholder="e.g., Circulation"
                />
              </div>
            </div>

            <DialogFooter>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : editing ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {s(globalError) !== "—" && (
        <div className="text-sm text-red-600 border border-red-200 bg-red-50 rounded-md p-3">
          {s(globalError)}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {staff.map((member) => (
          <Card
            key={s(member.id)}
            className="border-0 shadow-lg hover:shadow-xl transition-all duration-200 bg-white"
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-100 to-blue-100 rounded-xl flex items-center justify-center">
                  <Shield className="h-5 w-5 text-purple-600" />
                </div>
                <div className="flex space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-gray-100"
                    onClick={() => openEdit(member)}
                  >
                    <Edit className="h-4 w-4 text-gray-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                    onClick={() => handleDelete(member.id)}
                    disabled={deletingId === member.id}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex flex-col space-y-2 mb-3">
                <Badge className={getStatusColor(member.status)}>
                  {s(member.status)}
                </Badge>
                <Badge className={getRoleColor(member.role)}>
                  {s(member.role)}
                </Badge>
              </div>
              <CardTitle className="text-lg font-semibold text-gray-900">
                {s(member.name, "Unnamed")}
              </CardTitle>
              <CardDescription className="text-gray-600">
                {s(member.department, "")}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3 text-sm">
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-900">{s(member.email, "—")}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-900">{s(member.phone, "—")}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-900">
                    Joined: {safeDate(member.joinDate)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
