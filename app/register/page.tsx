"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "../lib/api";

type AuthResponse = {
  token: string;
  user: { id: number; name: string; email: string };
};

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const register = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    try {
      const result = await apiRequest<AuthResponse>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });

      localStorage.setItem("authToken", result.token);
      localStorage.setItem("authUser", JSON.stringify(result.user));
      router.push("/");
      router.refresh();
    } catch {
      setError("登録に失敗しました。入力内容を確認してください");
    }
  };

  return (
    <main className="container">
      <h1>📝 新規登録</h1>
      <section className="card">
        <form onSubmit={register}>
          <input
            type="text"
            placeholder="名前"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
          <input
            type="email"
            placeholder="メールアドレス"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <input
            type="password"
            placeholder="パスワード（6文字以上）"
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          {error && <p className="form-error">{error}</p>}
          <button type="submit">登録</button>
        </form>
        <p><a href="/login">ログインはこちら</a></p>
      </section>
    </main>
  );
}
