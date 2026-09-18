import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLogout, type User } from "@/features/auth/session";

export function SignedInCard({ user }: { user: User }) {
  const logout = useLogout();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Signed in</CardTitle>
        <CardDescription>{user.email}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <p className="text-muted-foreground text-sm">
          The server vouched for you. Nothing in this page read a token to
          decide that — <code className="font-mono">document.cookie</code> is
          empty right now. Check it in the console.
        </p>
        <Button variant="outline" onClick={() => logout.mutate()} disabled={logout.isPending}>
          {logout.isPending ? "Signing out…" : "Sign out"}
        </Button>
      </CardContent>
    </Card>
  );
}
