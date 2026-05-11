# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

就活選考管理システム「就勝つ（Syukatu）」。企業ごとの選考ステータス・締切をカンバンボードで一元管理し、Googleカレンダー連携・Gmail取り込み（Claude AI解析）まで備えたWebアプリ。

**本番環境**
- フロントエンド: Vercel (`https://job-track-neon.vercel.app`)
- バックエンド: Render (`https://jobtrack-api-rs0s.onrender.com`)
- DB: Neon（PostgreSQL, ap-southeast-1）

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| フロントエンド | Next.js 15.5 (App Router) / TypeScript / Tailwind CSS / TanStack Query v5 / dnd-kit / Auth.js v5 |
| バックエンド | FastAPI / SQLAlchemy 2.0 / Alembic / Python 3.11 |
| DB | PostgreSQL（本番: Neon） / SQLite（ローカル開発） |
| AI | Anthropic Claude Sonnet 4.6（Gmail メール解析） |
| 外部API | Gmail API / Google Calendar API v3 |
| モバイル | Expo (React Native) ※開発中 |

## 開発コマンド

### バックエンド（`backend/`）

```bash
cd backend
source venv/Scripts/activate   # Windows: venv\Scripts\activate
uvicorn app.main:app --reload  # http://localhost:8000
```

マイグレーション:
```bash
alembic upgrade head            # 最新に適用
alembic revision --autogenerate -m "説明"  # 新しいマイグレーション作成
alembic downgrade -1            # 1世代ロールバック
```

### フロントエンド（`frontend/`）

```bash
cd frontend
npm run dev    # http://localhost:3000
npm run build
npm run lint
```

### モバイル（`mobile/`）

```bash
cd mobile
npx expo start
```

## アーキテクチャ

### 認証フロー

Auth.js v5（`frontend/auth.ts`）がGoogle OAuthを処理し、JWTセッションを発行する。セッション内に**Auth.js独自のHS256署名JWT**（`session.accessToken`）を生成し、全FastAPIリクエストの`Authorization: Bearer`ヘッダーに付与する。FastAPI側（`backend/app/api/deps.py`）でこのJWTを`NEXTAUTH_SECRET`で検証し、ユーザーを特定する。初回ログイン時は`get_current_user`依存関数がユーザーとデフォルトステータス10件+`UserSettings`を自動作成する。

GoogleのアクセストークンはAuth.js JWTに埋め込んで引き回し（`token.google_access_token`）、期限切れ時は`auth.ts`のjwtコールバック内で自動リフレッシュする。

### バックエンド構造

```
backend/app/
  main.py              # FastAPI app, CORS設定
  core/
    config.py          # pydantic-settings（DATABASE_URL, NEXTAUTH_SECRET, CORS_ORIGINS）
    database.py        # SQLAlchemy engine / get_db
    security.py        # JWT検証（decode_nextauth_token）
    google_calendar.py # Google Calendar API操作
  api/
    deps.py            # get_current_user 依存関数（ユーザー自動作成ロジック含む）
    v1/
      router.py        # /api プレフィックスで全ルーターをまとめる
      companies.py / events.py / statuses.py / calendar.py / dashboard.py / user_settings.py
  models/              # SQLAlchemy ORM モデル
  schemas/             # Pydantic スキーマ（Request/Response）
  alembic/versions/    # マイグレーションファイル（命名: YYYYMMDD_NNNN_説明.py）
```

### フロントエンド構造

```
frontend/
  auth.ts              # Auth.js設定（Google OAuth, JWTコールバック, カスタムJWT発行）
  middleware.ts        # 認証必須ルートの保護
  app/
    layout.tsx / providers.tsx  # TanStack Query Provider, SessionProvider
    page.tsx           # ログイン画面（/）
    kanban/            # カンバンボード（dnd-kit によるD&D）
    dashboard/         # 統計サマリー・直近スケジュール
    companies/         # 企業一覧・詳細
    settings/          # ユーザー設定
    api/
      auth/[...nextauth]/ # Auth.js ハンドラ
      mail/es-deadlines/  # Gmail読取 + Claude AI解析エンドポイント
  lib/
    api.ts             # createApi(token) — FastAPIへのfetchラッパー
    settings.ts        # ユーザー設定のAPI関数
  hooks/               # TanStack Queryフック（useCompanies, useEvents, useStatuses, useDashboard等）
  types/               # TypeScript型定義
```

### データモデル

`users` → `statuses`（カンバン列）、`users` → `companies`（企業カード）、`companies` → `events`（日程・締切）の4テーブル構成。全PKはUUID v4。`scheduled_at`はUTC保存。

### Gmail取り込みフロー

`app/api/mail/es-deadlines/route.ts`（Next.js API Route）で直接Gmail APIを呼び出し、`Syukatu-ES-BOX`ラベルのメールを取得してAnthropic Claude Sonnet 4.6で企業名・日時・イベント種別・URLを抽出。確認UI経由でFastAPIの`POST /api/companies`→`POST /api/companies/{id}/events`を呼び出してカンバンに追加。取り込み後はGmail APIでラベルを除去（再取り込み防止）。

## 環境変数

バックエンド（`backend/.env`）:
```
DATABASE_URL=sqlite:///./jobtrack.db   # 本番は postgresql://...（Neon）
NEXTAUTH_SECRET=...                    # Auth.jsと共通のシークレット
CORS_ORIGINS=http://localhost:3000
```

フロントエンド（`frontend/.env.local`）:
```
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
NEXT_PUBLIC_API_URL=http://localhost:8000
ANTHROPIC_API_KEY=...                  # Gmail取り込み機能で必要
```

## 重要な注意点

- **JWT検証**: FastAPIはAuth.jsが`NEXTAUTH_SECRET`で署名したJWTを検証する。フロントとバックで`NEXTAUTH_SECRET`を必ず一致させること。
- **マイグレーション命名**: `YYYYMMDD_NNNN_説明.py` の形式を守る（例: `20260423_0001_create_initial_tables.py`）。
- **ローカルDB**: `backend/jobtrack.db`は`.gitignore`対象。ローカルはSQLite、本番はNeon（PostgreSQL）。`DATABASE_URL`の切り替えだけで動作する。
- **Renderスリープ**: 無料プランは15分無操作でスリープ。初回アクセスに30〜60秒かかる。
- **Googleスコープ**: OAuth認証時に`gmail.modify`と`calendar.events`スコープを要求する（`auth.ts`）。スコープ変更時はユーザーに再認証を促す必要がある。
