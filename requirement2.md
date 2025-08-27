# 生成プロンプト（完全版）

**あなたは、Next.js v12（Pages Router）+ React 18 + TypeScript + MUI v5（DataGrid v5）+ SWR を使って、左右 2 ペイン SPA の最小実装を構築するシニア FE エンジニアです。**
このアプリの\*\*主目的は「画面 A の操作をトリガに、画面 B の保存を Context API 経由で同期的（await）に呼び出し、自動保存できることの検証」\*\*です。
**目的に無関係な箇所は簡略化**してください。**テストは不要**です。

## 0. 技術前提

- 言語: TypeScript / React 18
- フレームワーク: Next.js v12（Pages Router）
- UI: MUI v5（`@mui/material`, `@mui/x-data-grid`）
- データ取得: SWR（`revalidateOnFocus: false`）
- 状態管理: **Context API**（今回のキモ）。Recoil 等は不使用で OK。
- API: `/pages/api` に**インメモリ実装**（モジュールスコープ配列で十分）

## 1. ゴール／画面仕様（最小）

- ページ `/` に左右 2 ペイン

  - **画面 A（左）**: MUI DataGrid（列：`id` readonly, `name` editable, `status` editable: 'A'|'B'）

    - 行選択で右側の B の対象を切替
    - セル編集コミットで **即時 PATCH**
    - 「再読み込み」ボタンで一覧 `mutate`
    - いずれの操作も**直前に B の自動保存ゲート**を `await` 通過必須（NG なら中断）

  - **画面 B（右）**: プレーンフォーム（`name`, `status`, `note`）

    - 入力はローカル state（簡略で OK）
    - Dirty 判定：サーバ値とフォーム値の簡易比較
    - 「保存」ボタンで **PUT**
    - **Context に保存関数を登録**し、A から **await で呼べる**ようにする（詳細は後述）

> 目的：**A →（Context 越しに）→ B.saveIfDirty() を await** してから A 処理続行できること。

## 2. データモデル（最小）

```ts
export type Item = {
  id: string;
  name: string;
  status: "A" | "B";
  note?: string;
  updatedAt: string; // ISO
  version: number; // 競合は扱わなくてOK（インクリメントのみ）
};

export type ItemPatch = Partial<Pick<Item, "name" | "status" | "note">>;
export type ItemPut = Pick<Item, "id" | "name" | "status" | "note" | "version">;
```

## 3. API（インメモリ）

- `GET /api/items` → `{ data: Item[] }`
- `GET /api/items/[id]` → `Item`
- `PATCH /api/items/[id]` → 差分反映して `version++`, `updatedAt=now`, 返却：更新後 `Item`
- `PUT /api/items/[id]` → 全体保存して `version++`, `updatedAt=now`, 返却：更新後 `Item`

> 競合(409)の再現は不要。単純で OK。

## 4. SWR 設計（最小）

- `SWRConfig` で `revalidateOnFocus:false`
- 一覧キー：`['items']`
- 詳細キー：`['item', id]`
- A の PATCH 成功 → `mutate(['items'])`
- B の PUT 成功 → `mutate(['item', id]); mutate(['items'])`

## 5. **Autosave Context（単一 B 前提・トークン不要）**

**目的：** 画面 B が自分の「保存関数」を登録し、画面 A は Context から `saveIfDirty()` を await 呼び出しできる。

### 5-1. 型定義（厳守）

```ts
// AutosaveContext 契約
export type SaveResult = "saved" | "noop" | "failed";
type Saver = () => Promise<SaveResult>;

type AutosaveCtx = {
  /** 画面Bが保存関数を登録し、解除関数を受け取る（必ずクリーンアップで呼ぶ） */
  register: (saver: Saver) => () => void;
  /** 画面Aが保存を要求：true=続行OK / false=中断 */
  saveIfDirty: () => Promise<boolean>;
};
```

### 5-2. 実装要件

- Provider 内は**単一スロット**で OK：`saverRef: Saver | null`
- `register` は\*\*解除関数（disposer）\*\*を返し、**等価ガード**で安全に解除：

  ```ts
  const register = (s: Saver) => {
    saverRef.current = s;
    return () => {
      if (saverRef.current === s) saverRef.current = null;
    };
  };
  ```

- `saveIfDirty` は `saverRef.current` が無ければ `true` を返す（B 未マウント時はブロックしない方針）

## 6. 画面 B（右フォーム）の Context 登録（重要）

- **登録は一度だけ**：`useEffect(() => { const dispose = register(stableSaver); return dispose; }, [])`
- **保存本体は最新化**：

  - `const saverRef = useRef<Saver>(async () => 'noop')`
  - 依存変化ごとに `saverRef.current = async () => { if (!dirty) return 'noop'; await PUT; mutate(...); return 'saved'; }`
  - `const stableSaver = useMemo(() => () => saverRef.current(), [])` を **register** に渡す（再登録しない）

- UI は簡素で OK。保存中インジケータやバリデーションは省略可。

## 7. 画面 A（左 DataGrid）の自動保存ゲート

- `const { saveIfDirty } = useAutosaveBus()` を取得
- **行選択**（`onRowClick` or `onSelectionModelChange`）：

  ```ts
  if (!(await saveIfDirty())) return; // 中断
  setSelectedId(nextId);
  ```

- **セル編集コミット**（`processRowUpdate` の先頭）：

  ```ts
  if (!(await saveIfDirty())) throw new Error("autosave-blocked"); // ロールバック
  const patched = await api.patchItem(newRow.id, diff(oldRow, newRow));
  return patched;
  ```

- **再読み込み**ボタン：

  ```ts
  if (!(await saveIfDirty())) return;
  mutate(["items"]);
  ```

## 8. ファイル構成（最小）

#### 新ページ階層

```
/pages
  /index.tsx                       // ← 新：トップ（2ページへのリンク）
  /forward-ref/index.tsx           // ← 旧 /pages/index.tsx をここへ移動
  /context-api/index.tsx           // ← 新：ContextAPI 版の2ペイン
  /api/items/index.ts              // （共通）GET all
  /api/items/[id].ts               // （共通）GET one, PATCH, PUT
  /api/items/[id]/bump-version.ts  // （共通・任意）競合再現
/components
  /PaneA.tsx                       // （forwardRef 版のまま利用）
  /ItemDetailForm.tsx              // （forwardRef 版：useImperativeHandle でハンドル公開）
  /context/PaneAContext.tsx        // ← 新：ContextAPI 版のA（最小差分でOK）
  /context/ItemDetailFormContext.tsx // ← 新：ContextAPI 版のB（register する）
/context
  /AutosaveContext.tsx             // ← 新：ContextAPI 版の Provider & hook
/state
  /atoms.ts                        // （forwardRef 版のみ使用）
/lib
  /fetcher.ts                      // （共通）
  /apiClient.ts                    // （共通）
```

> ポイント
>
> - **API 配下（/pages/api）・/lib は共通**のまま。
> - forwardRef 版の A/B コンポーネント名はそのままにし、**Context 版は /components/context 配下に別ファイル**で作ると衝突しません。
> - forwardRef 版だけが /state/atoms.ts（Recoil）を使い続け、Context 版は Context だけで完結します。

### 変更手順

1. **旧 `/pages/index.tsx` を移動**

   - `/pages/index.tsx` → `/pages/forward-ref/index.tsx`
   - その中の import は基本そのままで OK（`../components/...` の相対パスにだけ注意）

2. **トップページを新規作成**（リンクのみ）

3. **ContextAPI 版のページを新規作成**：`/pages/context-api/index.tsx`

   - `AutosaveProvider` でラップして、`<PaneAContext />` と `<ItemDetailFormContext />` を左右に並べるだけの最小実装

## 9. 実装の注意

- **StrictMode**（開発時の二重マウント）でも安全：

  - B は登録 Effect の**クリーンアップで解除**、再マウントで再登録
  - 等価ガードで「古い解除が最新登録を消す」事故を防止

- **ステールクロージャ回避**：

  - 保存本体は `saverRef.current` に最新を格納、**stable な薄いラッパ**を一度だけ登録

- **SWR** は `revalidateOnFocus:false` で OK
- エラー処理は簡素で OK：`failed` のときは `alert('保存に失敗')` 程度

## 10. 出力要件

- すべて **TypeScript**。
- 上記ファイル構成に沿って **各ファイルの完全なコード** を提示。
- **README**（起動手順のみ）を含める：

  - `npm i`
  - `npm run dev`
  - open `http://localhost:3000/`

- スタイル/レイアウトは最小で OK。**目的（A から B の同期自動保存）のデモが明確**なら十分。

---

この要件に従って、**実行可能な最小リポ相当のコード**を一式生成してください。
