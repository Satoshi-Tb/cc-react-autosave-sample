# React Autosave Sample - 実装仕様書

## プロジェクト概要

Next.js v12（Pages Router）+ React 18 + TypeScript + MUI v5 + SWR + Recoil を使用した左右2ペイン構成のSPAです。
主目的は「画面Aの操作がトリガとなって画面Bの保存を同期的に発火させる自動保存機能」の検証です。

## 技術スタック

- **言語**: TypeScript, React 18
- **フレームワーク**: Next.js v12（Pages Router）
- **UI**: MUI v5（DataGrid v5）
- **データフェッチ**: SWR（`revalidateOnFocus: false`）
- **グローバルステート**: Recoil
- **API**: `/pages/api` にインメモリ実装でスタブ

## データモデル

```typescript
export type Item = {
  id: string;
  name: string;
  status: "A" | "B";
  note?: string;
  updatedAt: string; // ISO
  version: number; // 競合検出用（簡易）
};

export type ItemPatch = Partial<Pick<Item, "name" | "status" | "note">> & {
  version: number;
};

export type ItemPut = Pick<Item, "id" | "name" | "status" | "note" | "version">;
```

## API仕様

- `GET /api/items` → `{ data: Item[] }` (全件取得)
- `GET /api/items/:id` → `Item` (詳細取得)
- `PATCH /api/items/:id` (部分更新)
  - 受け取り: `ItemPatch`
  - バージョンチェック → 409 or 更新+version++
- `PUT /api/items/:id` (完全保存)
  - 受け取り: `ItemPut`
  - バージョンチェック → 409 or 更新+version++
- `POST /api/items/:id/bump-version` (競合再現用)

## 画面構成

### 画面A（左ペイン）- MUI DataGrid
- 項目一覧表示
- 行選択で右の詳細対象切り替え
- `name`と`status`のセル編集（編集コミット時に即PATCH）
- 「再読み込み」ボタン

### 画面B（右ペイン）- フォーム
- `name` / `status` / `note`編集
- 「保存」ボタン（PUT）
- Dirty状態の表示

## 自動保存の核心仕様

### DetailFormHandleインターフェース

```typescript
export type AutoSaveReason = "A_SELECT" | "A_EDIT_COMMIT" | "A_REFETCH";

export type DetailFormHandle = {
  saveIfDirty: (reason: AutoSaveReason) => Promise<"saved" | "noop" | "failed" | "conflict">;
  isDirty: () => boolean;
};
```

### 実装ポイント

1. **forwardRef + useImperativeHandle**でハンドル公開
2. **再入防止**機構（inFlightRef）
3. **autoSaveGate**で全A操作を同期的にガード
4. 競合・失敗時はA操作を中断

## Recoil設計

```typescript
export const selectedIdAtom: RecoilState<string | null>;
export const draftByIdAtomFamily: AtomFamily<Partial<Item> | undefined, string>;
```

## SWR設計

- キー: `['items']`, `['item', id]`
- 更新時: 対応するキーをmutate
- `revalidateOnFocus: false`

## ファイル構成

```
/pages
  /index.tsx              # メインページ（2ペイン配置）
  /api/items/index.ts     # 一覧API
  /api/items/[id].ts      # 詳細・更新API
  /api/items/[id]/bump-version.ts  # 競合再現用

/components
  /PaneA.tsx              # DataGrid（画面A）
  /ItemDetailForm.tsx     # フォーム（画面B、forwardRef実装）

/state
  /atoms.ts               # Recoil atoms

/lib
  /fetcher.ts             # fetch wrapper
  /apiClient.ts           # API client
```

## 開発・実行コマンド

```bash
# 依存関係インストール
npm install

# 開発サーバー起動
npm run dev

# アクセス
http://localhost:3000/
```

## 重要な実装ポイント

1. **自動保存の同期性**: 全てのA操作前に`await autoSaveGate()`を実行
2. **競合処理**: 409エラー時はA操作を中断（`throw`でロールバック）
3. **再入防止**: 保存中の重複実行を防ぐ
4. **Dirty状態管理**: サーバ値とドラフトの差分で判定
5. **エラーハンドリング**: 簡易なalert表示で十分

## テストケース

- 基本的な自動保存動作
- 競合発生時の中断処理
- 再入防止の動作確認
- Dirty状態の正確な判定