"use client";

import { Label } from "../ui/label";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
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
import { Textarea } from "../ui/textarea";
import { Search, Plus, Edit, Trash2, Tags, BookOpen } from "lucide-react";

const initialGenres = [
  {
    id: 1,
    name: "Fiction",
    description: "Literary works of imaginative narration",
    bookCount: 245,
    color: "bg-blue-100 text-blue-800",
  },
  {
    id: 2,
    name: "Non-Fiction",
    description: "Factual and informational books",
    bookCount: 189,
    color: "bg-green-100 text-green-800",
  },
  {
    id: 3,
    name: "Science",
    description: "Scientific and technical literature",
    bookCount: 156,
    color: "bg-purple-100 text-purple-800",
  },
  {
    id: 4,
    name: "History",
    description: "Historical accounts and biographies",
    bookCount: 134,
    color: "bg-orange-100 text-orange-800",
  },
  {
    id: 5,
    name: "Biography",
    description: "Life stories of notable individuals",
    bookCount: 98,
    color: "bg-pink-100 text-pink-800",
  },
  {
    id: 6,
    name: "Mystery",
    description: "Suspense and detective stories",
    bookCount: 87,
    color: "bg-gray-100 text-gray-800",
  },
];

export function GenresPage() {
  const [genres, setGenres] = useState(initialGenres);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingGenre, setEditingGenre] = useState(null);
  const [newGenre, setNewGenre] = useState({
    name: "",
    description: "",
    bookCount: 0,
    color: "bg-blue-100 text-blue-800",
  });

  const colorOptions = [
    "bg-blue-100 text-blue-800",
    "bg-green-100 text-green-800",
    "bg-purple-100 text-purple-800",
    "bg-orange-100 text-orange-800",
    "bg-pink-100 text-pink-800",
    "bg-yellow-100 text-yellow-800",
    "bg-red-100 text-red-800",
    "bg-gray-100 text-gray-800",
  ];

  const filteredGenres = genres.filter(
    (genre) =>
      genre.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      genre.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddGenre = () => {
    if (newGenre.name && newGenre.description) {
      const genre = {
        id: Math.max(...genres.map((g) => g.id)) + 1,
        name: newGenre.name,
        description: newGenre.description,
        bookCount: 0,
        color: newGenre.color || "bg-blue-100 text-blue-800",
      };
      setGenres([...genres, genre]);
      setNewGenre({
        name: "",
        description: "",
        bookCount: 0,
        color: "bg-blue-100 text-blue-800",
      });
      setIsAddDialogOpen(false);
    }
  };

  const handleEditGenre = (genre) => {
    setEditingGenre(genre);
    setNewGenre(genre);
  };

  const handleUpdateGenre = () => {
    if (editingGenre && newGenre.name && newGenre.description) {
      const updatedGenres = genres.map((genre) =>
        genre.id === editingGenre.id ? { ...genre, ...newGenre } : genre
      );
      setGenres(updatedGenres);
      setEditingGenre(null);
      setNewGenre({
        name: "",
        description: "",
        bookCount: 0,
        color: "bg-blue-100 text-blue-800",
      });
    }
  };

  const handleDeleteGenre = (id) => {
    setGenres(genres.filter((genre) => genre.id !== id));
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Genre Management
          </h1>
          <p className="text-gray-600">Organize and manage book categories</p>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-lg">
              <Plus className="h-4 w-4 mr-2" />
              Add Genre
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">
                Add New Genre
              </DialogTitle>
              <DialogDescription>
                Create a new book category for your library.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right font-medium">
                  Name
                </Label>
                <Input
                  id="name"
                  value={newGenre.name}
                  onChange={(e) =>
                    setNewGenre({ ...newGenre, name: e.target.value })
                  }
                  className="col-span-3 border-gray-200 focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right font-medium">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={newGenre.description}
                  onChange={(e) =>
                    setNewGenre({ ...newGenre, description: e.target.value })
                  }
                  className="col-span-3 border-gray-200 focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-medium">Color</Label>
                <div className="col-span-3 flex flex-wrap gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`w-6 h-6 rounded-full border-2 ${
                        newGenre.color === color
                          ? "border-gray-900"
                          : "border-gray-300"
                      } ${color.split(" ")[0]}`}
                      onClick={() => setNewGenre({ ...newGenre, color })}
                    />
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleAddGenre}
                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
              >
                Add Genre
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search genres..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 h-11 border-gray-200 focus:border-blue-500 bg-white"
        />
      </div>

      {/* Genres Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredGenres.map((genre) => (
          <Card
            key={genre.id}
            className="border-0 shadow-lg hover:shadow-xl transition-all duration-200 bg-white"
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-100 to-cyan-100 rounded-xl flex items-center justify-center">
                  <Tags className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditGenre(genre)}
                    className="h-8 w-8 p-0 hover:bg-gray-100"
                  >
                    <Edit className="h-4 w-4 text-gray-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteGenre(genre.id)}
                    className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Badge className={genre.color}>{genre.name}</Badge>
              <CardTitle className="text-lg font-semibold text-gray-900">
                {genre.name}
              </CardTitle>
              <CardDescription className="text-gray-600">
                {genre.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <BookOpen className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    Books in category
                  </span>
                </div>
                <span className="text-lg font-bold text-blue-600">
                  {genre.bookCount}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredGenres.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Tags className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No genres found
          </h3>
          <p className="text-gray-600 mb-6">
            Try adjusting your search criteria.
          </p>
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Genre
          </Button>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingGenre} onOpenChange={() => setEditingGenre(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Edit Genre
            </DialogTitle>
            <DialogDescription>Update the genre details.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right font-medium">
                Name
              </Label>
              <Input
                id="edit-name"
                value={newGenre.name}
                onChange={(e) =>
                  setNewGenre({ ...newGenre, name: e.target.value })
                }
                className="col-span-3 border-gray-200 focus:border-blue-500"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label
                htmlFor="edit-description"
                className="text-right font-medium"
              >
                Description
              </Label>
              <Textarea
                id="edit-description"
                value={newGenre.description}
                onChange={(e) =>
                  setNewGenre({ ...newGenre, description: e.target.value })
                }
                className="col-span-3 border-gray-200 focus:border-blue-500"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right font-medium">Color</Label>
              <div className="col-span-3 flex flex-wrap gap-2">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-6 h-6 rounded-full border-2 ${
                      newGenre.color === color
                        ? "border-gray-900"
                        : "border-gray-300"
                    } ${color.split(" ")[0]}`}
                    onClick={() => setNewGenre({ ...newGenre, color })}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleUpdateGenre}
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
            >
              Update Genre
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
