import Header from "@/components/Header";
import MobileNavigation from "@/components/MobileNavigation";
import Sidebar from "@/components/Sidebar";
import { Toaster } from "@/components/ui/toaster";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { redirect } from "next/navigation";
import React from "react";

export const dynamic = "force-dynamic"; // this ensures the homepage is rendered on the server for each request due to cookie usage, preventing static rendering

const Layout = async ({ children }: { children: React.ReactNode }) => {
  // fetch the current user
  const currentUser = await getCurrentUser();

  if (!currentUser) return redirect("/sign-in"); // if there is no user, redirect to the sign in page

  return (
    <main className="flex h-screen">
      <Sidebar {...currentUser} />
      <section className="flex h-full flex-1 flex-col">
        <MobileNavigation {...currentUser} />
        <Header userId={currentUser.$id} accountId={currentUser.accountId} />
        <div className="main-content">{children}</div>
      </section>
      <Toaster />
    </main>
  );
};

export default Layout;
