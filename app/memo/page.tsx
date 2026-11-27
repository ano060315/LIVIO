"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiRequest } from "../lib/api";

type Memo = {
  id: number;
  title: string;
  content: string;
  updatedAt: string;
};

export default function MemoPage() {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  const loadMemos = async () => {
    try {
      setMemos(await apiRequest<Memo[]>("/api/memos"));
    } catch (error) {
      console.error("メモの読み込みに失敗しました", error);
    }
  };

  useEffect(() => {
    void loadMemos();
  }, []);

  const submitMemo = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();
    if (!trimmedTitle && !trimmedContent) return;

    try {
      if (editingId !== null) {
        await apiRequest<Memo>(`/api/memos/${editingId}`, {
          method: "PUT",
          body: JSON.stringify({
            title: trimmedTitle || "無題のメモ",
            content: trimmedContent,
          }),
        });
        setEditingId(null);
      } else {
        await apiRequest<Memo>("/api/memos", {
          method: "POST",
          body: JSON.stringify({
            title: trimmedTitle || "無題のメモ",
            content: trimmedContent,
          }),
        });
      }

      await loadMemos();
    } catch (error) {
      console.error("メモの保存に失敗しました", error);
    } finally {
      setTitle("");
      setContent("");
    }
  };

  const startEditing = (memo: Memo) => {
    setEditingId(memo.id);
    setTitle(memo.title);
    setContent(memo.content);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setTitle("");
    setContent("");
  };

  const deleteMemo = async (id: number) => {
    if (!window.confirm("本当に削除しますか？")) return;

    try {
      await apiRequest<void>(`/api/memos/${id}`, { method: "DELETE" });
      await loadMemos();
    } catch (error) {
      console.error("メモの削除に失敗しました", error);
    }
  };

  const filteredMemos = memos.filter((memo) => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return true;

    return (
      memo.title.toLowerCase().includes(keyword) ||
      memo.content.toLowerCase().includes(keyword)
    );
  });

  return (
    <main className="container">
      <h1>📝 メモ</h1>

      <section className="card">
        <h2>{editingId === null ? "メモを作成" : "メモを編集"}</h2>

        <form onSubmit={submitMemo}>
          <input
            type="text"
            placeholder="タイトル"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <textarea
            placeholder="メモを入力"
            value={content}
            onChange={(event) => setContent(event.target.value)}
          />

          <button type="submit">{editingId === null ? "保存" : "更新"}</button>
          {editingId !== null && (
            <button type="button" className="secondary-button" onClick={cancelEditing}>キャンセル</button>
          )}
        </form>
      </section>

      <section className="card">
        <h2>メモ一覧</h2>
        <input
          type="search"
          placeholder="タイトルや本文を検索"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />

        {filteredMemos.length === 0 ? (
          <p>メモはありません</p>
        ) : (
          <div className="memo-list">
            {filteredMemos.map((memo) => (
              <article className="item-card" key={memo.id}>
                <div className="memo-card">
                  <div>
                    <h3>{memo.title}</h3>
                    {memo.content && <p>{memo.content}</p>}
                    <small>{new Date(memo.updatedAt).toLocaleString("ja-JP")}</small>
                  </div>
                  <div className="item-actions">
                    <button type="button" className="edit-button" onClick={() => startEditing(memo)}>編集</button>
                    <button type="button" className="delete-button" onClick={() => deleteMemo(memo.id)}>削除</button>
                  </div>
                </div>

                {editingId === memo.id && (
                  <form className="inline-editor" onSubmit={submitMemo}>
                    <input type="text" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="タイトル" aria-label="メモのタイトル" autoFocus />
                    <textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder="メモを入力" />
                    <div className="inline-editor-actions">
                      <button type="submit">更新</button>
                      <button type="button" className="secondary-button" onClick={cancelEditing}>キャンセル</button>
                    </div>
                  </form>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
