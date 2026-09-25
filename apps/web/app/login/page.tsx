"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ApiClientError } from "@/lib/api-client";
import { Card, Input, Label, Button, ErrorText } from "@/components/ui";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      router.push("/");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm">
      <Card>
        <h1 className="text-heading1">Log in to FLARE</h1>
        <form onSubmit={onSubmit} className="mt-md flex flex-col gap-sm">
          <div>
            <Label>Email</Label>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label>Password</Label>
            <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <ErrorText>{error}</ErrorText>
          <Button type="submit" disabled={submitting} className="mt-xs">
            {submitting ? "Logging in…" : "Log in"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
