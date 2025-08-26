# React Autosave Sample

Next.js v12 + React 18 + TypeScript + MUI v5 + SWR + Recoil を使用した自動保存機能のサンプルアプリケーションです。

## 主な機能

- 左ペイン（画面A）: MUI DataGridによるアイテム一覧表示・編集
- 右ペイン（画面B）: 詳細フォームでの編集
- **自動保存機能**: 画面Aの操作時に画面Bの変更内容を自動保存
- 競合検出・処理機能
- Dirty状態の可視化

## 技術スタック

- **フレームワーク**: Next.js v12 (Pages Router)
- **言語**: TypeScript
- **UI**: Material-UI v5, DataGrid v5
- **状態管理**: Recoil
- **データフェッチ**: SWR
- **API**: インメモリ実装

## セットアップ・起動方法

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev
```

アプリケーションは http://localhost:3000 でアクセスできます。

## 使用方法

1. 左のDataGridでアイテムを選択
2. 右のフォームで詳細を編集（name, status, noteフィールド）
3. 左で行選択・セル編集・再読み込みを実行すると、右の変更内容が自動保存される
4. 「競合を発生させる」ボタンでバージョン競合のテストが可能

## 自動保存の仕組み

- forwardRef + useImperativeHandle による命令的ハンドル
- autoSaveGate によるA操作前の同期的な保存処理
- 競合・エラー時のA操作中断機能
- 再入防止機構

## ファイル構成

```
/pages
  /index.tsx              # メインページ
  /_app.tsx              # アプリケーション設定
  /_document.tsx         # HTML文書設定
  /api/items/            # API実装
/components
  /PaneA.tsx             # DataGrid（画面A）
  /ItemDetailForm.tsx    # フォーム（画面B）
/state
  /atoms.ts              # Recoil atoms
/lib
  /types.ts              # 型定義
  /fetcher.ts            # HTTP client
  /apiClient.ts          # API client
```