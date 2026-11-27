"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "../lib/api";

type AuthResponse = {
  token: string;
  user: { id: number; name: string; email: string };
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const login = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    try {
      const result = await apiRequest<AuthResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      localStorage.setItem("authToken", result.token);
      localStorage.setItem("authUser", JSON.stringify(result.user));
      router.push("/");
      router.refresh();
    } catch {
      setError("メールアドレスまたはパスワードが正しくありません");
    }
  };

  return (
    <main className="container">
      <h1>🔐 ログイン</h1>
      <section className="card">
        <form onSubmit={login}>
          <input
            type="email"
            placeholder="メールアドレス"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <input
            type="password"
            placeholder="パスワード"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          {error && <p className="form-error">{error}</p>}
          <button type="submit">ログイン</button>
        </form>
        <p><a href="/register">新規登録はこちら</a></p>
      </section>
    </main>
  );
}
