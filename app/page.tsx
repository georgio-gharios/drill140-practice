import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-6 p-6">
      <h1 className="text-3xl font-bold">Drill 140 (practice)</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Trainee call-taker practice: a panicked caller rings 140. Get the address and a callback number, then talk
        them into CPR.
      </p>
      <div className="flex gap-3">
        <Link href="/call" className="rounded bg-red-600 px-4 py-2 font-semibold text-white">
          Take a call
        </Link>
        <Link href="/board" className="rounded border px-4 py-2 font-semibold">
          Live board
        </Link>
      </div>
    </main>
  );
}
