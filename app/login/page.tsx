import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default function LoginPage({ searchParams }: { searchParams: { next?: string } }) {
  return (
    <main className="mx-auto mt-16 max-w-xs space-y-4">
      <h1 className="text-2xl font-bold">Barcode</h1>
      <LoginForm next={searchParams.next} />
    </main>
  );
}
