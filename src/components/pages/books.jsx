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
import { Input } from "../ui/input";
import { Label } from "../ui/label";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Textarea } from "../ui/textarea";
import { Search, Plus, Edit, Trash2, BookOpen, Filter } from "lucide-react";
import { apiClient } from "../../lib/api";

export function BooksPage() {
  const [books, setBooks] = useState([]);
  const [genres, setGenres] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("all");

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingBook, setEditingBook] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const emptyForm = useMemo(
    () => ({
      title: "",
      author: "",
      // UI-only (not sent to API)
      isbn: "",
      description: "",
      // API-bound fields
      genreId: "", // maps to genre_id
      availableCopies: 1, // maps to available_copies
      publishedYear: 2000, // maps to published_year
    }),
    []
  );

  const [newBook, setNewBook] = useState(emptyForm);

  /** ---------- Helpers & Normalizers ---------- */
  const toInt = (v, fallback = 0) => {
    const n = Number.parseInt(v, 10);
    return Number.isFinite(n) ? n : fallback;
  };

  const normalizeBook = (b) => {
    // Accept snake_case and camelCase; only show fields your API actually returns
    const id = b.id ?? b._id ?? crypto.randomUUID();
    const title = b.title ?? "Untitled";
    const author = b.author ?? "Unknown";

    // Display-only if present
    const isbn = b.isbn ?? b.ISBN ?? "";
    const description = b.description ?? "";

    // API canonical fields (snake_case from backend)
    const availableCopies = toInt(
      b.available_copies ?? b.availableCopies ?? 0,
      0
    );
    const publishedYear = toInt(b.published_year ?? b.publishedYear ?? 0, 0);

    // genre display
    const genre =
      b.genre?.name ??
      b.genre_name ??
      b.genre ??
      (genres.find((g) => g.id === (b.genre_id ?? b.genreId))?.name ||
        "Unknown");

    return {
      id,
      title,
      author,
      isbn,
      description,
      availableCopies,
      publishedYear,
      genre,
      genreId: b.genre_id ?? b.genreId ?? "", // for editing convenience
    };
  };

  const normalizeBooks = (payload) => {
    const arr = Array.isArray(payload?.books) ? payload.books : payload;
    if (!Array.isArray(arr)) return [];
    return arr.map(normalizeBook);
  };

  const normalizeGenres = (arr) => {
    if (!Array.isArray(arr)) return [];
    return arr.map((g, i) =>
      typeof g === "string"
        ? { id: i + 1, name: g }
        : { id: g.id ?? i + 1, name: g.name ?? String(g.title ?? "Unknown") }
    );
  };

  // Without total copies, keep a simple color scheme:
  // 0 => red, 1-2 => yellow, >=3 => green
  const getAvailabilityColor = (available = 0) => {
    if (available <= 0) return "bg-red-100 text-red-700 border-red-200";
    if (available <= 2)
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    return "bg-green-100 text-green-700 border-green-200";
  };

  /** ---------- Data Loaders ---------- */
  const loadBooks = useCallback(async () => {
    try {
      const data = await apiClient.getBooks({
        search: searchTerm || undefined,
        genre: selectedGenre !== "all" ? selectedGenre : undefined,
      });
      setBooks(normalizeBooks(data));
    } catch (error) {
      console.error("Failed to load books:", error);
      // Fallback demo (fields aligned to what we display)
      setBooks(
        normalizeBooks([
          {
            id: 1,
            title: "The Great Gatsby",
            author: "F. Scott Fitzgerald",
            isbn: "978-0-7432-7356-5",
            genre: "Fiction",
            available_copies: 3,
            published_year: 1925,
            description: "A classic American novel set in the Jazz Age.",
          },
          {
            id: 2,
            title: "To Kill a Mockingbird",
            author: "Harper Lee",
            genre: "Fiction",
            available_copies: 2,
            published_year: 1960,
          },
          {
            id: 3,
            title: "1984",
            author: "George Orwell",
            genre: "Science Fiction",
            available_copies: 0,
            published_year: 1949,
          },
        ])
      );
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, selectedGenre, genres]);

  const loadGenres = useCallback(async () => {
    try {
      const data = await apiClient.getGenres();
      setGenres(normalizeGenres(data));
    } catch (error) {
      console.error("Failed to load genres:", error);
      setGenres(
        normalizeGenres([
          { id: 1, name: "Fiction" },
          { id: 2, name: "Non-Fiction" },
          { id: 3, name: "Science Fiction" },
          { id: 4, name: "Mystery" },
          { id: 5, name: "Biography" },
        ])
      );
    }
  }, []);

  useEffect(() => {
    loadGenres();
  }, [loadGenres]);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      loadBooks();
    }, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm, selectedGenre, loadBooks]);

  /** ---------- Validation & Payload (no total_copies) ---------- */
  const validateForm = (f) => {
    if (!f.title?.trim()) return "Title is required";
    if (!f.author?.trim()) return "Author is required";
    if (!f.genreId) return "Genre is required";

    const available = toInt(f.availableCopies, 0);
    const year = toInt(f.publishedYear, 0);

    if (available < 1) return "Available copies must be at least 1";
    if (!year || year < 1800)
      return "Published year must be a number not less than 1800";

    return "";
  };

  // Only include allowed fields in API payload (NO total_copies)
  const buildPayload = (f) => ({
    title: f.title.trim(),
    author: f.author.trim(),
    published_year: toInt(f.publishedYear, new Date().getFullYear()),
    available_copies: toInt(f.availableCopies, 1),
    genre_id: toInt(f.genreId, 0),
  });

  /** ---------- CRUD Handlers ---------- */
  const handleEditBook = (book) => {
    setFormError("");
    setEditingBook(book);
    setNewBook({
      title: book.title ?? "",
      author: book.author ?? "",
      // UI-only
      isbn: book.isbn ?? "",
      description: book.description ?? "",
      // API-bound
      genreId:
        book.genreId || genres.find((g) => g.name === book.genre)?.id || "",
      availableCopies: book.availableCopies ?? 1,
      publishedYear: book.publishedYear || new Date().getFullYear(),
    });
  };

  const handleAddBook = async () => {
    setFormError("");
    const err = validateForm(newBook);
    if (err) {
      setFormError(err);
      return;
    }

    try {
      setSaving(true);
      await apiClient.createBook(buildPayload(newBook));
      setIsAddDialogOpen(false);
      setNewBook(emptyForm);
      await loadBooks();
    } catch (error) {
      console.error("Failed to add book:", error);
      setFormError(error?.message || "Failed to add book");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateBook = async () => {
    if (!editingBook) return;
    setFormError("");

    const err = validateForm(newBook);
    if (err) {
      setFormError(err);
      return;
    }

    try {
      setSaving(true);
      await apiClient.updateBook(editingBook.id, buildPayload(newBook));
      setEditingBook(null);
      setNewBook(emptyForm);
      await loadBooks();
    } catch (error) {
      console.error("Failed to update book:", error);
      setFormError(error?.message || "Failed to update book");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBook = async (id) => {
    if (confirm("Are you sure you want to delete this book?")) {
      try {
        await apiClient.deleteBook(id);
        await loadBooks();
      } catch (error) {
        console.error("Failed to delete book:", error);
      }
    }
  };

  /** ---------- UI ---------- */
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
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
            Book Management
          </h1>
          <p className="text-gray-600">
            Manage your library&apos;s book collection and inventory
          </p>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-lg">
              <Plus className="h-4 w-4 mr-2" />
              Add New Book
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">
                Add New Book
              </DialogTitle>
              <DialogDescription>
                Enter the details of the new book to add to the library.
              </DialogDescription>
            </DialogHeader>

            {formError && (
              <div className="text-sm text-red-600 border border-red-200 bg-red-50 rounded-md p-2">
                {formError}
              </div>
            )}

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="title" className="text-right font-medium">
                  Title
                </Label>
                <Input
                  id="title"
                  value={newBook.title}
                  onChange={(e) =>
                    setNewBook({ ...newBook, title: e.target.value })
                  }
                  className="col-span-3 border-gray-200 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="author" className="text-right font-medium">
                  Author
                </Label>
                <Input
                  id="author"
                  value={newBook.author}
                  onChange={(e) =>
                    setNewBook({ ...newBook, author: e.target.value })
                  }
                  className="col-span-3 border-gray-200 focus:border-blue-500"
                />
              </div>

              {/* UI-only fields (NOT sent) */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="isbn" className="text-right font-medium">
                  ISBN (optional)
                </Label>
                <Input
                  id="isbn"
                  value={newBook.isbn}
                  onChange={(e) =>
                    setNewBook({ ...newBook, isbn: e.target.value })
                  }
                  className="col-span-3 border-gray-200 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="genre" className="text-right font-medium">
                  Genre
                </Label>
                <Select
                  value={String(newBook.genreId ?? "")}
                  onValueChange={(value) =>
                    setNewBook({ ...newBook, genreId: value })
                  }
                >
                  <SelectTrigger className="col-span-3 border-gray-200 focus:border-blue-500">
                    <SelectValue placeholder="Select genre" />
                  </SelectTrigger>
                  <SelectContent>
                    {genres.map((genre) => (
                      <SelectItem key={genre.id} value={String(genre.id)}>
                        {genre.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="available" className="text-right font-medium">
                  Available Copies
                </Label>
                <Input
                  id="available"
                  type="number"
                  min="1"
                  value={newBook.availableCopies}
                  onChange={(e) =>
                    setNewBook({
                      ...newBook,
                      availableCopies: toInt(e.target.value, 1),
                    })
                  }
                  className="col-span-3 border-gray-200 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="year" className="text-right font-medium">
                  Published Year
                </Label>
                <Input
                  id="year"
                  type="number"
                  value={newBook.publishedYear}
                  onChange={(e) =>
                    setNewBook({
                      ...newBook,
                      publishedYear: toInt(
                        e.target.value,
                        new Date().getFullYear()
                      ),
                    })
                  }
                  className="col-span-3 border-gray-200 focus:border-blue-500"
                />
              </div>

              {/* UI-only (NOT sent) */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right font-medium">
                  Description (optional)
                </Label>
                <Textarea
                  id="description"
                  value={newBook.description}
                  onChange={(e) =>
                    setNewBook({ ...newBook, description: e.target.value })
                  }
                  className="col-span-3 border-gray-200 focus:border-blue-500"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                onClick={handleAddBook}
                disabled={saving}
                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
              >
                {saving ? "Adding..." : "Add Book"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search books by title or author..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-11 border-gray-200 focus:border-blue-500 bg-white"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <Select value={selectedGenre} onValueChange={setSelectedGenre}>
            <SelectTrigger className="w-full sm:w-[200px] h-11 border-gray-200 focus:border-blue-500">
              <SelectValue placeholder="Filter by genre" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Genres</SelectItem>
              {genres.map((genre) => (
                <SelectItem key={genre.id} value={genre.name}>
                  {genre.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Books Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {books.map((book) => (
          <Card
            key={book.id}
            className="border-0 shadow-lg hover:shadow-xl transition-all duration-200 bg-white"
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-100 to-cyan-100 rounded-xl flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditBook(book)}
                    className="h-8 w-8 p-0 hover:bg-gray-100"
                  >
                    <Edit className="h-4 w-4 text-gray-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteBook(book.id)}
                    className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Badge
                className={`${getAvailabilityColor(
                  book.availableCopies ?? 0
                )} w-fit font-medium`}
              >
                {Math.max(0, book.availableCopies ?? 0)} Available
              </Badge>
              <CardTitle className="text-lg font-semibold text-gray-900 line-clamp-2">
                {book.title}
              </CardTitle>
              <CardDescription className="text-gray-600">
                by {book.author}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Genre:</span>
                  <span className="font-medium text-gray-900">
                    {book.genre || "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Published:</span>
                  <span className="font-medium text-gray-900">
                    {book.publishedYear || "—"}
                  </span>
                </div>
                {book.isbn && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">ISBN:</span>
                    <span className="font-medium text-gray-900">
                      {book.isbn}
                    </span>
                  </div>
                )}
                {book.description && (
                  <p className="text-gray-600 text-xs mt-3 line-clamp-2">
                    {book.description}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {books.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No books found
          </h3>
          <p className="text-gray-600 mb-6">
            Try adjusting your search or filter criteria.
          </p>
          <Button
            onClick={() => {
              setFormError("");
              setNewBook(emptyForm);
              setIsAddDialogOpen(true);
            }}
            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Book
          </Button>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog
        open={!!editingBook}
        onOpenChange={(open) => {
          if (!open) setEditingBook(null);
        }}
      >
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Edit Book
            </DialogTitle>
            <DialogDescription>Update the book details.</DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="text-sm text-red-600 border border-red-200 bg-red-50 rounded-md p-2">
              {formError}
            </div>
          )}

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-title" className="text-right font-medium">
                Title
              </Label>
              <Input
                id="edit-title"
                value={newBook.title}
                onChange={(e) =>
                  setNewBook({ ...newBook, title: e.target.value })
                }
                className="col-span-3 border-gray-200 focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-author" className="text-right font-medium">
                Author
              </Label>
              <Input
                id="edit-author"
                value={newBook.author}
                onChange={(e) =>
                  setNewBook({ ...newBook, author: e.target.value })
                }
                className="col-span-3 border-gray-200 focus:border-blue-500"
              />
            </div>

            {/* UI-only */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-isbn" className="text-right font-medium">
                ISBN (optional)
              </Label>
              <Input
                id="edit-isbn"
                value={newBook.isbn}
                onChange={(e) =>
                  setNewBook({ ...newBook, isbn: e.target.value })
                }
                className="col-span-3 border-gray-200 focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-genre" className="text-right font-medium">
                Genre
              </Label>
              <Select
                value={String(newBook.genreId ?? "")}
                onValueChange={(value) =>
                  setNewBook({ ...newBook, genreId: value })
                }
              >
                <SelectTrigger className="col-span-3 border-gray-200 focus:border-blue-500">
                  <SelectValue placeholder="Select genre" />
                </SelectTrigger>
                <SelectContent>
                  {genres.map((genre) => (
                    <SelectItem key={genre.id} value={String(genre.id)}>
                      {genre.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label
                htmlFor="edit-available"
                className="text-right font-medium"
              >
                Available Copies
              </Label>
              <Input
                id="edit-available"
                type="number"
                min="1"
                value={newBook.availableCopies}
                onChange={(e) =>
                  setNewBook({
                    ...newBook,
                    availableCopies: toInt(e.target.value, 1),
                  })
                }
                className="col-span-3 border-gray-200 focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-year" className="text-right font-medium">
                Published Year
              </Label>
              <Input
                id="edit-year"
                type="number"
                value={newBook.publishedYear}
                onChange={(e) =>
                  setNewBook({
                    ...newBook,
                    publishedYear: toInt(
                      e.target.value,
                      new Date().getFullYear()
                    ),
                  })
                }
                className="col-span-3 border-gray-200 focus:border-blue-500"
              />
            </div>

            {/* UI-only */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label
                htmlFor="edit-description"
                className="text-right font-medium"
              >
                Description (optional)
              </Label>
              <Textarea
                id="edit-description"
                value={newBook.description}
                onChange={(e) =>
                  setNewBook({ ...newBook, description: e.target.value })
                }
                className="col-span-3 border-gray-200 focus:border-blue-500"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={handleUpdateBook}
              disabled={saving}
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
            >
              {saving ? "Updating..." : "Update Book"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
