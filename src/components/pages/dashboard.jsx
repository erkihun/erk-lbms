"use client";

import { useState, useEffect } from "react";
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
  BookOpen,
  Users,
  TrendingUp,
  AlertCircle,
  Plus,
  ArrowUpRight,
  Calendar,
} from "lucide-react";
import { apiClient } from "../../lib/api";

/** Format numbers safely */
const fmtNum = (v) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n.toLocaleString() : "0";
};

/** Normalize transactions */
const normalizeTransactions = (arr = []) => {
  return arr.map((t, idx) => {
    const id = t.id ?? t.transactionId ?? idx + 1;
    const memberName = t.memberName ?? t.member?.name ?? "Unknown Member";
    const bookTitle = t.bookTitle ?? t.book?.title ?? "Unknown Book";

    const rawDate =
      t.date ?? t.borrowDate ?? t.createdAt ?? new Date().toISOString();

    let action = t.action;
    let status = t.status;

    if (!action) {
      if (t.returnDate || /returned/i.test(status ?? "")) action = "Returned";
      else if (t.renewedDate || /renew/i.test(status ?? "")) action = "Renewed";
      else action = "Borrowed";
    }

    if (!status) {
      let derivedStatus = "Active";
      const due = t.dueDate ? new Date(t.dueDate) : null;
      const returned = !!t.returnDate;
      if (!returned && due && isFinite(due) && due.getTime() < Date.now()) {
        derivedStatus = "Overdue";
      } else if (returned) {
        derivedStatus = "Completed";
      }
      status = derivedStatus;
    }

    return { id, memberName, bookTitle, action, date: rawDate, status };
  });
};

const getStatusColor = (status) => {
  switch (status) {
    case "Active":
      return "bg-blue-100 text-blue-800";
    case "Completed":
      return "bg-green-100 text-green-800";
    case "Overdue":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getActionColor = (action) => {
  switch (action) {
    case "Borrowed":
      return "bg-blue-100 text-blue-800";
    case "Returned":
      return "bg-green-100 text-green-800";
    case "Renewed":
      return "bg-yellow-100 text-yellow-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export function DashboardPage() {
  const [stats, setStats] = useState({
    totalBooks: 0,
    totalMembers: 0,
    activeLoans: 0,
    overdueBooks: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Fetch raw data from backend
      const [books, members, borrows] = await Promise.all([
        apiClient.getBooks().catch(() => []),
        apiClient.getMembers().catch(() => []),
        apiClient.getTransactions().catch(() => []),
      ]);

      // Calculate stats manually
      const totalBooks = books.length;
      const totalMembers = members.length;
      const activeLoans = borrows.filter((b) => b.status === "Active").length;
      const overdueBooks = borrows.filter((b) => b.status === "Overdue").length;

      setStats({ totalBooks, totalMembers, activeLoans, overdueBooks });
      setRecentTransactions(normalizeTransactions(borrows.slice(0, 10)));
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = [
    {
      name: "Add New Book",
      icon: BookOpen,
      color: "bg-blue-500",
      action: () => {},
    },
    {
      name: "Register Member",
      icon: Users,
      color: "bg-green-500",
      action: () => {},
    },
    {
      name: "Issue Book",
      icon: Plus,
      color: "bg-purple-500",
      action: () => {},
    },
    {
      name: "View Reports",
      icon: TrendingUp,
      color: "bg-orange-500",
      action: () => {},
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-8 bg-gray-200 rounded w-1/2" />
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
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-cyan-50 hover:shadow-xl transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">
              Total Books
            </CardTitle>
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <BookOpen className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {fmtNum(stats.totalBooks)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50 hover:shadow-xl transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-600">
              Total Members
            </CardTitle>
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <Users className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {fmtNum(stats.totalMembers)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-violet-50 hover:shadow-xl transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-600">
              Active Loans
            </CardTitle>
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {fmtNum(stats.activeLoans)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-red-50 to-pink-50 hover:shadow-xl transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-600">
              Overdue Books
            </CardTitle>
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {fmtNum(stats.overdueBooks)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-900">
            Quick Actions
          </CardTitle>
          <CardDescription className="text-gray-600">
            Frequently used operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <Button
                key={index}
                variant="outline"
                className="h-20 flex-col space-y-2 border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 bg-transparent"
                onClick={action.action}
              >
                <div
                  className={`w-8 h-8 ${action.color} rounded-lg flex items-center justify-center`}
                >
                  <action.icon className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {action.name}
                </span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl font-semibold text-gray-900">
                Recent Transactions
              </CardTitle>
              <CardDescription className="text-gray-600">
                Latest borrowing and return activities
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-gray-200 hover:bg-gray-50 bg-transparent"
            >
              <ArrowUpRight className="h-4 w-4 mr-1" />
              View All
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTransactions.map((transaction) => {
                let dateStr = "—";
                try {
                  const d = new Date(transaction.date);
                  if (!isNaN(d.getTime())) {
                    dateStr = d.toLocaleDateString();
                  }
                } catch {}

                return (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <Badge className={getStatusColor(transaction.status)}>
                          {transaction.status}
                        </Badge>
                        <Badge className={getActionColor(transaction.action)}>
                          {transaction.action}
                        </Badge>
                      </div>
                      <p className="font-medium text-gray-900">
                        {transaction.memberName}
                      </p>
                      <p className="text-sm text-gray-600">
                        {transaction.bookTitle}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="h-3 w-3 mr-1" />
                        {dateStr}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-900">
              System Status
            </CardTitle>
            <CardDescription className="text-gray-600">
              Current system health and alerts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="font-medium text-green-800">
                    Database Connection
                  </span>
                </div>
                <span className="text-sm text-green-600">Healthy</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                  <span className="font-medium text-yellow-800">
                    Backup Status
                  </span>
                </div>
                <span className="text-sm text-yellow-600">Pending</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  <span className="font-medium text-blue-800">
                    API Response Time
                  </span>
                </div>
                <span className="text-sm text-blue-600">125ms</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center space-x-3">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className="font-medium text-red-800">
                    Overdue Notifications
                  </span>
                </div>
                <span className="text-sm text-red-600">
                  {fmtNum(stats.overdueBooks)} pending
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
