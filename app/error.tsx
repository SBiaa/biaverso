"use client";

import { ErrorScreen } from "@/components/layout/ErrorScreen";

// Só pega o que fica fora do grupo `(app)` (login, manifesto). As telas do app
// têm o próprio `app/(app)/error.tsx`, que mantém a barra lateral de pé.
export default function RootError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorScreen {...props} />;
}
