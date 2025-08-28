"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { DashboardPage } from "../../components/pages/dashboard";
import { BooksPage } from "../../components/pages/books";
import { MembersPage } from "../../components/pages/members";
import { BorrowReturnPage } from "../../components/pages/borrow-return";
import { StaffPage } from "../../components/pages/staff";
import { ReportsPage } from "../../components/pages/reports";
import { GenresPage } from "../../components/pages/genres";

const pageConfig = {
  dashboard: {
    title: "Dashboard",
    subtitle: "Overview of your library system",
    component: DashboardPage,
  },
  books: {
    title: "Books",
    subtitle: "Manage your book collection",
    component: BooksPage,
  },
  members: {
    title: "Members",
    subtitle: "Manage library members",
    component: MembersPage,
  },
  "borrow-return": {
    title: "Borrow & Return",
    subtitle: "Manage book transactions",
    component: BorrowReturnPage,
  },
  genres: {
    title: "Genres",
    subtitle: "Manage book categories",
    component: GenresPage,
  },
  staff: {
    title: "Staff",
    subtitle: "Manage library staff",
    component: StaffPage,
  },
  reports: {
    title: "Reports",
    subtitle: "View analytics and reports",
    component: ReportsPage,
  },
};

export function AppLayout() {
  const [currentPage, setCurrentPage] = useState("dashboard");

  const config = pageConfig[currentPage];
  const PageComponent = config.component;

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />
      <div className="lg:ml-64">
        <Header title={config.title} subtitle={config.subtitle} />
        <main className="py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <PageComponent />
          </div>
        </main>
      </div>
    </div>
  );
}
