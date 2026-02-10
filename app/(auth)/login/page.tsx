"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DUMMY_AUTH_COOKIE = "ct_dummy_auth";
const DUMMY_AUTH_MAX_AGE = 60 * 60 * 24; // 24 hours

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirectTo = useMemo(() => {
    const value = searchParams.get("redirectTo");
    return value && value.startsWith("/") ? value : "/dashboard";
  }, [searchParams]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    document.cookie = `${DUMMY_AUTH_COOKIE}=1; path=/; max-age=${DUMMY_AUTH_MAX_AGE}; SameSite=Lax`;
    router.replace(redirectTo);
    router.refresh();
    setIsSubmitting(false);
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-12">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <div className="mt-4 text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link
              className="underline"
              href={`/signup?redirectTo=${encodeURIComponent(redirectTo)}`}
            >
              Create one
            </Link>
            .
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
