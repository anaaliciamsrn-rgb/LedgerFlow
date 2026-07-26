import type { ReactNode } from 'react';

export default function AuthLayout({
  children,
}: {
  readonly children: ReactNode;
}): ReactNode {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}