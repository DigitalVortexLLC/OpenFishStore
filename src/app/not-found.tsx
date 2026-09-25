import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <p className="text-6xl" aria-hidden>
        🫧
      </p>
      <h1 className="text-2xl font-bold">This one swam away</h1>
      <p className="text-slate-600">We couldn’t find the page you were looking for.</p>
      <Link href="/" className="btn">
        Back to the store
      </Link>
    </div>
  );
}
