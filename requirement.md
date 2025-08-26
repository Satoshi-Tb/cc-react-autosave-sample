# 生成プロンプト

**あなたは、Next.js v12（Pages Router）+ React 18 + TypeScript + MUI v5 + SWR + Recoil を用いて、左右 2 ペインの SPA の最小実装を構築するシニア FE エンジニアです。**
このアプリの**主目的は「画面 A の操作がトリガになって、画面 B の保存を同期的に（await）発火させる自動保存」を安全に検証すること**です。
自動保存以外の点は**簡略化**してください（見た目・バリデーション・アクセシビリティ・エラーメッセージ等は最小限で OK）。**テストの実装は不要**です。

## 0. 前提（バージョンなど）

- 言語: TypeScript, React 18
- フレームワーク: Next.js v12（Pages Router）
- UI: MUI v5（DataGrid v5）
- データフェッチ: SWR（`revalidateOnFocus: false`）
- グローバルステート: Recoil
- API は **`/pages/api`** に**インメモリ実装**でスタブします（永続化不要）

## 1. 画面要件（最小）

- ルート `/` に左右 2 ペイン構成

  - 左：**画面 A** … MUI DataGrid の一覧

    - 行選択で右の詳細対象が切り替わる
    - `name` と `status` をセル編集でき、**編集コミットで即 PATCH**
    - 「再読み込み」ボタンあり（一覧の SWR を `mutate`）

  - 右：**画面 B** … プレーンなフォーム

    - `name` / `status` / `note` を編集
    - 「保存」ボタン（PUT）あり（手動保存も可能にしておく）
    - **Dirty 状態**を把握できる（サーバデータとの差分があれば Dirty）

> 本アプリの主目的は**A→B の自動保存**の挙動確認。UI は最小で OK。

## 2. データモデル（最小）

```ts
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

## 3. API（インメモリで OK）

- `GET /api/items` → `{ data: Item[] }`（全件で OK、ページング不要）
- `GET /api/items/:id` → `Item`
- `PATCH /api/items/:id`

  - 受け取り：`ItemPatch`
  - サーバ側は `version` をチェックし、**違っていれば 409**、合えば更新＋`version++`
  - 返却：更新後 `Item`

- `PUT /api/items/:id`

  - 受け取り：`ItemPut`（完全保存）
  - `version` をチェックし、**違っていれば 409**、合えば更新＋`version++`
  - 返却：更新後 `Item`

- 初期データは数件で OK。**競合再現用**として、**「サーバ側で対象アイテムの version を+1 する」簡易エンドポイント**を 1 つ用意（例：`POST /api/items/:id/bump-version`）。UI に「競合を発生させる」ボタンを置いてデモできるように。

> 競合 UI のフル実装は不要。409 時は簡易なダイアログ or `alert` で「競合発生」を知らせ、**A 側の操作は中断**されることが分かれば OK。

## 4. SWR 設計（最小）

- SWRConfig: `revalidateOnFocus: false`
- 一覧キー：`['items']`
- 詳細キー：`['item', id]`
- A の PATCH 成功時：`mutate(['items'])`
- B の PUT 成功時：`mutate(['item', id]); mutate(['items'])`

## 5. Recoil 設計（最小）

```ts
// state/atoms.ts
export const selectedIdAtom: RecoilState<string | null>;
export const draftByIdAtomFamily: AtomFamily<Partial<Item> | undefined, string>; // Bの編集中ドラフト保持（undefinedは未編集）
```

- Dirty 判定は「`GET /item` の値」と「`draft`」の差分があれば true。
  表示値は**サーバ値にドラフトをオーバーレイ**（ドラフト優先）。

## 6. “A→B 自動保存”の中核仕様（必須・詳細）

**forwardRef + useImperativeHandle** で、B フォームが**命令的ハンドル**を公開します。

```ts
// components/ItemDetailForm.tsx
export type AutoSaveReason = "A_SELECT" | "A_EDIT_COMMIT" | "A_REFETCH";

export type DetailFormHandle = {
  /** Dirtyなら保存。結果を返す（A側はこれで続行/中断を判断） */
  saveIfDirty: (
    reason: AutoSaveReason
  ) => Promise<"saved" | "noop" | "failed" | "conflict">;
  /** 現在Dirtyかどうか */
  isDirty: () => boolean;
};
```

### B フォームの動作（必須）

- `forwardRef` + `useImperativeHandle` で `saveIfDirty` と `isDirty` を公開
- **再入防止**：`inFlightRef: Promise<...> | null` を持ち、連打時は同じ Promise を返す
- `saveIfDirty` のフロー

  1. Dirty でなければ `'noop'` 即返し
  2. Dirty なら `PUT /api/items/:id` を実行（`version` 必須）
  3. 成功 → `draftByIdAtomFamily(id)` をクリア、`mutate(['item', id])` と `mutate(['items'])`、`'saved'`
  4. 409 → `'conflict'` を返す（ここでは簡易に `alert('競合が発生しました')` で通知）
  5. その他エラー → `'failed'`（簡易に `alert`）

> B 画面の「手動保存」ボタンは `saveIfDirty('A_REFETCH')` を流用して OK。

### 親コンポーネント（2 ペインレイアウト）が行うこと（必須）

- `const detailRef = useRef<DetailFormHandle>(null);`
- **自動保存ゲート**を用意（A の操作前に必ず await）

```ts
const autoSaveGate = useCallback(async (reason: AutoSaveReason) => {
  const r = await detailRef.current?.saveIfDirty(reason);
  return r === "saved" || r === "noop"; // これ以外は続行しない
}, []);
```

- A の**行選択**・**セル編集コミット**・**再読み込み**の**直前**に `await autoSaveGate(...)` を必ず通す。
  続行条件を満たさない場合は**操作中断**（DataGrid のコミットは `throw` でロールバック）。

## 7. 画面 A（最小実装）

- MUI DataGrid v5、列：`id`（readonly）、`name`（editable）、`status`（editable: singleSelect 'A'/'B'）
- `getRowId={(r)=>r.id}`
- **行選択**（`onRowClick` か `onSelectionModelChange`のどちらでも可）：

  - `await autoSaveGate('A_SELECT')`
  - OK なら `selectedIdAtom` を更新

- **セル編集コミット**（`processRowUpdate`）：

  - 先頭で `await autoSaveGate('A_EDIT_COMMIT')`
  - OK なら差分で `PATCH /api/items/:id` 実行
  - 成功：返却行を返す（DataGrid が反映）
  - 失敗/409：`throw` してロールバック（簡易に `alert` で通知）

- **再読み込みボタン**：

  - `await autoSaveGate('A_REFETCH')`
  - OK なら `mutate(['items'])`

## 8. 画面 B（最小実装）

- プレーンなフォーム：`<TextField name="name"/>`, `<Select name="status" options A/B>`, `<TextField multiline name="note">`
- 入力ハンドラで `draftByIdAtomFamily(id)` を更新（`setDraft({...prev, [field]: value})`）
- Dirty の可視化は簡易で OK（例：`<Chip label="Dirty" color="warning" />`）
- 「保存」ボタン：`await detailRef.current?.saveIfDirty('A_REFETCH')`
- **`forwardRef + useImperativeHandle`** 実装を忘れないこと

## 9. ファイル構成（例）

```
/pages
  /index.tsx           // 2ペイン親（A/B配置、autoSaveGate、ref保持）
  /api/items/index.ts  // GET all
  /api/items/[id].ts   // GET one, PATCH, PUT
  /api/items/[id]/bump-version.ts // 競合再現用（任意）
/components
  /PaneA.tsx           // DataGrid（一覧、編集、選択、再読み込み）
  /ItemDetailForm.tsx  // forwardRef + useImperativeHandle でハンドル公開
/state
  /atoms.ts            // selectedIdAtom, draftByIdAtomFamily
/lib
  /fetcher.ts          // 共通fetch（jsonラッパ）
  /apiClient.ts        // items API呼び出し（get/patch/put/bump）
```

## 10. 実装の注意（最小）

- SWR は `SWRConfig` で `revalidateOnFocus:false`。
- 409 時は**A の操作を中断**できるように、`processRowUpdate` 内で `throw` を必ず行う。
- `updatedAt` は毎回更新して返す（見た目で更新が分かるため）。
- 競合再現ボタン（任意）：B 側に「競合を発生させる」ボタンを置き、`bump-version` を叩いてから A で操作 → 自動保存が `'conflict'` を返し、A が続行中断されることを確認できる。

## 11. 依存インストールと起動手順（出力に含めること）

- `package.json` に必要な依存を記載（react, react-dom, next\@12, swr, @mui/material, @mui/x-data-grid, recoil など）
- 実行手順を README に明記：

  - `npm i`
  - `npm run dev`
  - `http://localhost:3000/` にアクセス

## 12. 簡素な UI だが挙動が分かる工夫（軽くで OK）

- 右上か B フォーム付近に「保存中…」インジケータ（state で制御・任意）
- Dirty 時は小さな注意表記（Chip や小さな Text で OK）
- 競合/失敗時は `alert` で十分

---

**出力フォーマット要件**

- すべて TypeScript。
- 上記ファイル構成に沿って、**各ファイルの完全なソースコード**を提示。
- README 簡易版（起動手順）も提示。
- コメントは最小限で良いが、**A→B 自動保存の呼び出し箇所**と**B の命令的ハンドル**部分には分かるコメントを。

---

この要件に従い、**動く最小リポ**相当のコードを一式生成してください。
