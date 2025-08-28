"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import {
  Search,
  Plus,
  BookOpen,
  User,
  Calendar,
  CheckCircle,
} from "lucide-react";
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
import { apiClient } from "../../lib/api";

export function BorrowReturnPage() {
  const [transactions, setTransactions] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  // Issue dialog state
  const [isIssueOpen, setIsIssueOpen] = useState(false);
  const [members, setMembers] = useState([]);
  const [books, setBooks] = useState([]);
  const [issuing, setIssuing] = useState(false);
  const [issueError, setIssueError] = useState("");
  const [issueForm, setIssueForm] = useState({
    memberId: "",
    bookId: "",
    dueDate: "", // yyyy-mm-dd
  });

  useEffect(() => {
    loadTransactions();
  }, []);

  /* ---------------- helpers ---------------- */
  // Strict stringifier for JSX text nodes: never return objects
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

  const toISOEndOfDay = (yyyyMmDd) => {
    // backend expects ISO; we’ll set 23:59:59 local time
    if (!yyyyMmDd) return new Date().toISOString();
    const [y, m, d] = yyyyMmDd.split("-").map((n) => parseInt(n, 10));
    if (!y || !m || !d) return new Date().toISOString();
    const dt = new Date(y, m - 1, d, 23, 59, 59, 0);
    return dt.toISOString();
  };

  const pickMemberName = (member) => {
    if (!member) return undefined;
    if (typeof member === "string") return member;
    if (typeof member === "object") {
      if (member.name) return member.name;
      const combined = [member.first_name, member.last_name]
        .filter(Boolean)
        .join(" ");
      if (combined) return combined;
      if (member.email) return member.email;
      if (member.id !== undefined) return `Member #${member.id}`;
    }
    return undefined;
  };

  const pickBookTitle = (book) => {
    if (!book) return undefined;
    if (typeof book === "string") return book;
    if (typeof book === "object") {
      return (
        book.title ||
        book.name ||
        (book.id !== undefined ? `Book #${book.id}` : undefined)
      );
    }
    return undefined;
  };

  const pickBookAuthor = (book) => {
    if (!book) return undefined;
    if (typeof book === "string") return undefined;
    if (typeof book === "object") {
      return book.author || book.writer || undefined;
    }
    return undefined;
  };

  // Make sure we always have a plain numeric/string id for the borrow record
  const pickRecordId = (t) =>
    t.id ??
    t.record_id ??
    t.borrow_record_id ??
    t.transactionId ??
    t.transaction_id;

  // Convert backend payload to a UI-friendly shape, handling nested objects
  const normalizeTx = (t) => {
    const id = pickRecordId(t) ?? crypto.randomUUID();

    // member fields (string or object)
    const memberObj = t.member ?? t.member_obj ?? t.user ?? t.borrower;
    const memberNameRaw =
      t.memberName ?? t.member_name ?? pickMemberName(memberObj);

    // book fields (string or object)
    const bookObj = t.book ?? t.book_obj ?? t.item;
    const bookTitleRaw = t.bookTitle ?? t.book_title ?? pickBookTitle(bookObj);
    const bookAuthorRaw =
      t.bookAuthor ?? t.book_author ?? pickBookAuthor(bookObj);

    const issueDate =
      t.issueDate ?? t.issued_at ?? t.borrow_date ?? t.created_at ?? null;
    const dueDate = t.dueDate ?? t.due_date ?? null;
    const returnDate = t.returnDate ?? t.return_date ?? null;

    const rawStatus = t.status ?? (returnDate ? "returned" : "borrowed");

    const status = (() => {
      const str = typeof rawStatus === "string" ? rawStatus.toLowerCase() : "";
      if (str.includes("return")) return "Returned";
      const due = dueDate ? new Date(dueDate) : null;
      if (!returnDate && due && !isNaN(due.getTime()) && due < new Date())
        return "Overdue";
      return "Active";
    })();

    return {
      id, // borrow_record_id we’ll send back for return
      memberName: memberNameRaw ?? "Unknown Member",
      bookTitle: bookTitleRaw ?? "Untitled",
      bookAuthor: bookAuthorRaw ?? "Unknown",
      issueDate,
      dueDate,
      returnDate,
      status,
    };
  };

  const normalizeList = (payload) => {
    // Accept many shapes: array, {transactions: [...]}, {data: [...]}, single object
    if (Array.isArray(payload)) return payload.map(normalizeTx);

    const maybe = payload?.transactions ?? payload?.data ?? payload;
    if (Array.isArray(maybe)) return maybe.map(normalizeTx);
    if (maybe && typeof maybe === "object") return [normalizeTx(maybe)];

    return [];
  };

  const loadTransactions = async () => {
    setErrorMsg("");
    try {
      const data = await apiClient.getTransactions();
      setTransactions(normalizeList(data));
    } catch (error) {
      console.error("Failed to load transactions:", error);
      // Fallback demo
      setTransactions(
        normalizeList([
          {
            id: 1,
            member: { id: 10, name: "John Doe", email: "john@example.com" },
            book: {
              id: 3,
              title: "The Great Gatsby",
              author: "F. Scott Fitzgerald",
            },
            borrow_date: "2024-01-15",
            due_date: "2024-01-29",
            status: "borrowed",
          },
          {
            id: 2,
            member_name: "Jane Smith",
            book_title: "To Kill a Mockingbird",
            book_author: "Harper Lee",
            borrow_date: "2024-01-10",
            due_date: "2024-01-24",
            return_date: "2024-01-22",
            status: "returned",
          },
        ])
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Active":
        return "bg-blue-100 text-blue-800";
      case "Returned":
        return "bg-green-100 text-green-800";
      case "Overdue":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Local filter by member name / book title / author
  const filteredTransactions = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return transactions;
    return transactions.filter((tx) => {
      return (
        String(tx.memberName || "")
          .toLowerCase()
          .includes(q) ||
        String(tx.bookTitle || "")
          .toLowerCase()
          .includes(q) ||
        String(tx.bookAuthor || "")
          .toLowerCase()
          .includes(q)
      );
    });
  }, [transactions, searchTerm]);

  /* ---------------- Issue Book flow ---------------- */
  const openIssue = async () => {
    setIssueError("");
    setIssueForm({ memberId: "", bookId: "", dueDate: "" });
    setIsIssueOpen(true);

    // Load members and books for selects (lightweight; handle any shape)
    try {
      const [mRes, bRes] = await Promise.allSettled([
        apiClient.getMembers().catch(() => []),
        apiClient.getBooks().catch(() => []),
      ]);

      const rawMembers = mRes.status === "fulfilled" ? mRes.value : [];
      const mArr = Array.isArray(rawMembers?.members)
        ? rawMembers.members
        : Array.isArray(rawMembers)
        ? rawMembers
        : rawMembers?.data && Array.isArray(rawMembers.data)
        ? rawMembers.data
        : [];

      const rawBooks = bRes.status === "fulfilled" ? bRes.value : [];
      const bArr = Array.isArray(rawBooks?.books)
        ? rawBooks.books
        : Array.isArray(rawBooks)
        ? rawBooks
        : rawBooks?.data && Array.isArray(rawBooks.data)
        ? rawBooks.data
        : [];

      const normMembers = mArr.map((m, i) => ({
        id: m.id ?? m.member_id ?? i + 1,
        name: pickMemberName(m) ?? m.name ?? `Member #${i + 1}`,
      }));

      const normBooks = bArr.map((b, i) => ({
        id: b.id ?? b.book_id ?? i + 1,
        title: pickBookTitle(b) ?? b.title ?? `Book #${i + 1}`,
        author: pickBookAuthor(b) ?? b.author ?? "",
      }));

      // Fallback demos if nothing came through
      setMembers(
        normMembers.length
          ? normMembers
          : [
              { id: 1, name: "John Doe" },
              { id: 2, name: "Jane Smith" },
            ]
      );
      setBooks(
        normBooks.length
          ? normBooks
          : [
              {
                id: 3,
                title: "The Great Gatsby",
                author: "F. Scott Fitzgerald",
              },
              { id: 4, title: "1984", author: "George Orwell" },
            ]
      );
    } catch {
      // Very defensive fallback
      setMembers([
        { id: 1, name: "John Doe" },
        { id: 2, name: "Jane Smith" },
      ]);
      setBooks([
        { id: 3, title: "The Great Gatsby", author: "F. Scott Fitzgerald" },
        { id: 4, title: "1984", author: "George Orwell" },
      ]);
    }
  };

  const validateIssue = () => {
    if (!issueForm.memberId) return "Select a member";
    if (!issueForm.bookId) return "Select a book";
    if (!issueForm.dueDate) return "Choose a due date";
    return "";
  };

  const handleIssue = async () => {
    setIssueError("");
    const err = validateIssue();
    if (err) {
      setIssueError(err);
      return;
    }
    try {
      setIssuing(true);
      await apiClient.borrowBook(
        Number(issueForm.memberId),
        Number(issueForm.bookId),
        toISOEndOfDay(issueForm.dueDate)
      ); // sends { member_id, book_id, due_date }
      setIsIssueOpen(false);
      setIssueForm({ memberId: "", bookId: "", dueDate: "" });
      await loadTransactions();
    } catch (e) {
      setIssueError(errStr(e, "Failed to issue book"));
    } finally {
      setIssuing(false);
    }
  };

  /* ---------------- Return action ---------------- */
  const handleReturn = async (borrowRecordId) => {
    setErrorMsg("");
    setActionLoadingId(borrowRecordId);
    try {
      await apiClient.returnBook(borrowRecordId); // sends {borrow_record_id}
      await loadTransactions();
    } catch (e) {
      console.error("Return failed:", e);
      setErrorMsg(errStr(e, "Failed to return the book"));
    } finally {
      setActionLoadingId(null);
    }
  };

  /* ---------------- UI ---------------- */
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Transaction Management
          </h1>
          <p className="text-gray-600">Manage book borrowing and returns</p>
        </div>

        <Dialog open={isIssueOpen} onOpenChange={setIsIssueOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={openIssue}
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-lg"
            >
              <Plus className="h-4 w-4 mr-2" />
              Issue Book
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">
                Issue Book
              </DialogTitle>
              <DialogDescription>
                Select a member, a book, and the due date.
              </DialogDescription>
            </DialogHeader>

            {s(issueError) !== "—" && (
              <div className="text-sm text-red-600 border border-red-200 bg-red-50 rounded-md p-2 mb-2">
                {s(issueError)}
              </div>
            )}

            <div className="grid gap-4 py-2">
              <div className="grid grid-cols-4 items-center gap-4">
                <span className="text-right font-medium">Member</span>
                <Select
                  value={String(issueForm.memberId)}
                  onValueChange={(val) =>
                    setIssueForm((f) => ({ ...f, memberId: val }))
                  }
                >
                  <SelectTrigger className="col-span-3 border-gray-200 focus:border-blue-500">
                    <SelectValue placeholder="Select member" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((m) => (
                      <SelectItem key={m.id} value={String(m.id)}>
                        {s(m.name, `Member #${m.id}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <span className="text-right font-medium">Book</span>
                <Select
                  value={String(issueForm.bookId)}
                  onValueChange={(val) =>
                    setIssueForm((f) => ({ ...f, bookId: val }))
                  }
                >
                  <SelectTrigger className="col-span-3 border-gray-200 focus:border-blue-500">
                    <SelectValue placeholder="Select book" />
                  </SelectTrigger>
                  <SelectContent>
                    {books.map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>
                        {s(b.title, `Book #${b.id}`)}
                        {b.author ? ` — ${s(b.author)}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <span className="text-right font-medium">Due Date</span>
                <Input
                  type="date"
                  value={issueForm.dueDate}
                  onChange={(e) =>
                    setIssueForm((f) => ({ ...f, dueDate: e.target.value }))
                  }
                  className="col-span-3 border-gray-200 focus:border-blue-500"
                />
              </div>
            </div>

            <DialogFooter>
              <Button onClick={handleIssue} disabled={issuing}>
                {issuing ? "Issuing..." : "Issue"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search by member name, book title, or author..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 h-11 border-gray-200 focus:border-blue-500 bg-white"
        />
      </div>

      {s(errorMsg) !== "—" && (
        <div className="text-sm text-red-600 border border-red-200 bg-red-50 rounded-md p-3">
          {s(errorMsg)}
        </div>
      )}

      <div className="space-y-4">
        {filteredTransactions.map((tx) => (
          <Card
            key={s(tx.id)}
            className="border-0 shadow-lg hover:shadow-xl transition-all duration-200 bg-white"
          >
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center space-x-3">
                    <Badge className={getStatusColor(s(tx.status))}>
                      {s(tx.status)}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="font-medium text-gray-900">
                          {s(tx.memberName, "Unknown Member")}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <BookOpen className="h-4 w-4 text-gray-400" />
                        <div>
                          <span className="font-medium text-gray-900">
                            {s(tx.bookTitle, "Untitled")}
                          </span>
                          <p className="text-sm text-gray-500">
                            by {s(tx.bookAuthor, "Unknown")}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-900">
                          Issued: {safeDate(s(tx.issueDate))}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-900">
                          Due: {safeDate(s(tx.dueDate))}
                        </span>
                      </div>
                      {tx.returnDate && (
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm text-gray-900">
                            Returned: {safeDate(s(tx.returnDate))}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {s(tx.status) === "Active" && (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      size="sm"
                      disabled={actionLoadingId === tx.id}
                      onClick={() => handleReturn(tx.id)}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                    >
                      {actionLoadingId === tx.id ? "Returning..." : "Return"}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
