import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <Image
            src="/logo-vibrato.png"
            alt="Vibrato Motos"
            width={160}
            height={160}
            priority
            className="h-32 w-auto"
          />
          <p className="mt-2 text-sm text-muted">Gestão da locadora</p>
        </div>
        {children}
      </div>
    </div>
  );
}
