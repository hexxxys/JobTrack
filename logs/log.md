# 作業ログ

## 2026-05-03
- プロジェクト初期セットアップ
  - CLAUDE.md を作成
  - .gitignore を作成（秘密情報保護用）
  - logs/log.md を作成（作業履歴用）
  - README.md を作成（プロジェクト概要用）
  - docs/app-definition.md を作成（アプリ定義・技術スタック・アーキテクチャ）
  - docs/requirements.md を作成（要件定義書 v2.1）

## 2026-05-03（続き）
- Googleログイン機構を実装
  - frontend/ を作成（Next.js 16 + Auth.js v5 + Tailwind CSS）
  - backend/ を作成（FastAPI + SQLAlchemy + Alembic）
  - frontend/auth.ts：Google OAuth設定・Googleトークン自動更新・FastAPI用JWT生成
  - frontend/middleware.ts：未ログイン時リダイレクト
  - frontend/app/page.tsx：ログイン画面
  - frontend/app/kanban/page.tsx：ログイン後の仮画面
  - backend/app/core/security.py：NEXTAUTH_SECRETでJWT検証
  - backend/app/api/deps.py：ユーザー自動作成ロジック
  - backend/alembic/versions/20260503_0001_create_users_table.py：usersテーブル作成
  - alembic upgrade head 実行済み（jobtrack.db 生成）
