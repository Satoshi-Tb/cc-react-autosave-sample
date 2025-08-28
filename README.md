# React Autosave Sample

Next.js v12 + React 18 + TypeScript + MUI v5 + SWR を使用した左右2ペイン構成のSPAです。
主目的は「画面Aの操作がトリガとなって画面Bの保存を同期的に発火させる自動保存機能」の検証です。

## 機能

このアプリケーションでは、3つの異なる方法で自動保存機能を実装しています：

1. **forwardRef + useImperativeHandle 版** (`/forward-ref`)
   - Recoil を使った状態管理
   - forwardRef で画面間通信を実装

2. **Context API 版** (`/context-api`)  
   - Context API を使って画面間の自動保存通信を実装
   - より軽量でシンプルな実装

3. **親子ウィンドウ postMessage 版** (`/parent-child-window/parent`)
   - postMessage API を使った親子ウィンドウ間での同期的な保存処理通信
   - 別ウィンドウでの保存処理を親ウィンドウから制御

## 技術スタック

- **言語**: TypeScript, React 18
- **フレームワーク**: Next.js v12（Pages Router）
- **UI**: MUI v5（DataGrid v5）
- **データフェッチ**: SWR（`revalidateOnFocus: false`）
- **グローバルステート**: Recoil (forwardRef版) / Context API (Context API版)
- **API**: `/pages/api` にインメモリ実装でスタブ

## 起動手順

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev

# ブラウザでアクセス
open http://localhost:3000/
```

## 自動保存の仕組み

### forwardRef版 / Context API版
- **画面A（左ペイン）**: MUI DataGridでアイテム一覧表示、行選択・セル編集が可能
- **画面B（右ペイン）**: 選択されたアイテムの詳細編集フォーム
- 画面Aの操作（行選択、セル編集、再読み込み）の前に、画面Bの保存処理が自動的に実行される
- 保存に失敗した場合は、画面Aの操作がキャンセルされる

### 親子ウィンドウ postMessage版
- **親ウィンドウ（画面A）**: 子ウィンドウを開き、保存リクエストを送信
- **子ウィンドウ（画面B）**: フォーム編集と保存処理を実行
- 親から子へpostMessageで同期的に保存リクエストを送信
- 子からの保存結果（`saved`/`noop`/`error`）をawaitで受信
- 5秒のタイムアウト処理とイベントリスナーの自動クリーンアップを実装

## ページ構成

```
/                          # トップページ（3つの実装へのリンク）
├── /forward-ref           # forwardRef + useImperativeHandle版
├── /context-api           # Context API版  
└── /parent-child-window/
    ├── parent             # 親ウィンドウ（画面A）
    └── child              # 子ウィンドウ（画面B）
```