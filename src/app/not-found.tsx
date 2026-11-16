import Link from "next/link";
import { Header } from "@/components/header";
import { AlertCircle, Home } from "lucide-react";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Header />
      <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 text-center">
        <div className="grid size-16 place-items-center rounded-2xl bg-slate-100 text-slate-500 shadow-sm dark:bg-slate-900 dark:text-slate-400">
          <AlertCircle className="size-8" />
        </div>
        <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white">
          404 - Page Not Found
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-500"
        >
          <Home className="size-4" />
          <span>Return Home</span>
        </Link>
      </div>
    </main>
  );
}
