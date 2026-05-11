# DB設計書

## プロジェクト名
就活選考管理システム（JobTrack）

## 作成日
2026-04-23

## 改訂履歴
| バージョン | 日付 | 内容 |
|-----------|------|------|
| 1.0 | 2026-04-23 | 初版作成 |
| 1.1 | 2026-04-23 | DBMS を MySQL → SQLite に変更。Docker 不要構成へ移行 |
| 1.2 | 2026-04-26 | user_settings テーブル追加。companies に login_id 追加 |
| 1.3 | 2026-04-27 | statuses デフォルトに「説明会」追加。本番DB を PostgreSQL（Neon）に移行 |

---

## 1. 使用技術

| 項目 | 内容 |
|------|------|
| DBMS（本番） | PostgreSQL（Neon、ap-southeast-1） |
| DBMS（ローカル） | SQLite 3（`backend/jobtrack.db`、`.gitignore` 対象） |
| ORM | SQLAlchemy 2.x |
| マイグレーション | Alembic |

> **切り替え方法:** `DATABASE_URL` 環境変数を変更するだけでローカル（SQLite）↔ 本番（PostgreSQL）を切り替え可能（SQLAlchemy の抽象化による）。

---

## 2. ER図

```mermaid
erDiagram
    users {
        CHAR(36)    id           PK
        VARCHAR(255) email       UK
        VARCHAR(255) name
        VARCHAR(512) image
        VARCHAR(255) google_id   UK
        DATETIME    created_at
        DATETIME    updated_at
    }

    statuses {
        CHAR(36)    id           PK
        CHAR(36)    user_id      FK
        VARCHAR(100) name
        VARCHAR(7)  color
        INT         position
        BOOLEAN     is_default
        BOOLEAN     is_archive
        DATETIME    created_at
        DATETIME    updated_at
    }

    companies {
        CHAR(36)    id           PK
        CHAR(36)    user_id      FK
        CHAR(36)    status_id    FK
        VARCHAR(255) name
        VARCHAR(100) industry
        TINYINT     priority
        TEXT        notes
        VARCHAR(512) url
        VARCHAR(255) login_id
        DATETIME    created_at
        DATETIME    updated_at
    }

    user_settings {
        CHAR(36)    user_id                  PK FK
        BOOLEAN     show_archived_statuses
        BOOLEAN     compact_cards
        INT         upcoming_refresh_minutes
        BOOLEAN     calendar_sync_enabled
        DATETIME    created_at
        DATETIME    updated_at
    }

    events {
        CHAR(36)    id           PK
        CHAR(36)    company_id   FK
        VARCHAR(50)  type
        VARCHAR(200) title
        DATETIME    scheduled_at
        TEXT        notes
        VARCHAR(255) google_event_id
        DATETIME    created_at
        DATETIME    updated_at
    }

    users       ||--o{ statuses       : "保有する"
    users       ||--o{ companies      : "登録する"
    users       ||--|| user_settings  : "持つ"
    statuses    ||--o{ companies      : "分類する"
    companies   ||--o{ events         : "持つ"
```

---

## 3. テーブル定義

### 3.1 users（ユーザー）

Googleアカウントでログインしたユーザー情報を管理する。

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|-----|------|-----------|------|
| id | CHAR(36) | NOT NULL | — | PK / UUID v4 |
| email | VARCHAR(255) | NOT NULL | — | Googleアカウントのメールアドレス |
| name | VARCHAR(255) | NOT NULL | — | 表示名 |
| image | VARCHAR(512) | NULL | NULL | プロフィール画像URL |
| google_id | VARCHAR(255) | NOT NULL | — | Google OAuth の sub クレーム |
| created_at | DATETIME | NOT NULL | CURRENT_TIMESTAMP | レコード作成日時 |
| updated_at | DATETIME | NOT NULL | CURRENT_TIMESTAMP | レコード更新日時（ON UPDATE） |

**制約・インデックス**

| 種別 | 対象カラム | 名称 |
|------|-----------|------|
| PRIMARY KEY | id | pk_users |
| UNIQUE | email | uq_users_email |
| UNIQUE | google_id | uq_users_google_id |

**DDL**
```sql
CREATE TABLE users (
    id         CHAR(36)     NOT NULL,
    email      VARCHAR(255) NOT NULL,
    name       VARCHAR(255) NOT NULL,
    image      VARCHAR(512)     NULL DEFAULT NULL,
    google_id  VARCHAR(255) NOT NULL,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP, -- updated_at は ORM (onupdate) で自動更新
    PRIMARY KEY (id),
    UNIQUE KEY uq_users_email    (email),
    UNIQUE KEY uq_users_google_id (google_id)
) -- SQLite では ENGINE/CHARSET 指定は不要（Alembic が自動生成）
```

---

### 3.2 statuses（選考ステータス）

カンバンボードのカラム定義。システムデフォルトとユーザーカスタムの両方を管理する。

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|-----|------|-----------|------|
| id | CHAR(36) | NOT NULL | — | PK / UUID v4 |
| user_id | CHAR(36) | NOT NULL | — | FK → users.id |
| name | VARCHAR(100) | NOT NULL | — | ステータス表示名 |
| color | VARCHAR(7) | NOT NULL | '#6B7280' | カラムヘッダー色（HEXカラーコード） |
| position | INT | NOT NULL | 0 | カンバン列の表示順（昇順） |
| is_default | BOOLEAN | NOT NULL | FALSE | TRUE = システム定義ステータス |
| is_archive | BOOLEAN | NOT NULL | FALSE | TRUE = アーカイブ扱い（不合格・辞退） |
| created_at | DATETIME | NOT NULL | CURRENT_TIMESTAMP | レコード作成日時 |
| updated_at | DATETIME | NOT NULL | CURRENT_TIMESTAMP | レコード更新日時 |

**制約・インデックス**

| 種別 | 対象カラム | 名称 |
|------|-----------|------|
| PRIMARY KEY | id | pk_statuses |
| FOREIGN KEY | user_id → users.id | fk_statuses_user |
| INDEX | (user_id, position) | idx_statuses_user_position |

**DDL**
```sql
CREATE TABLE statuses (
    id         CHAR(36)     NOT NULL,
    user_id    CHAR(36)     NOT NULL,
    name       VARCHAR(100) NOT NULL,
    color      VARCHAR(7)   NOT NULL DEFAULT '#6B7280',
    position   INT          NOT NULL DEFAULT 0,
    is_default BOOLEAN      NOT NULL DEFAULT FALSE,
    is_archive BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP, -- updated_at は ORM (onupdate) で自動更新
    PRIMARY KEY (id),
    KEY idx_statuses_user_position (user_id, position),
    CONSTRAINT fk_statuses_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) -- SQLite では ENGINE/CHARSET 指定は不要（Alembic が自動生成）
```

**デフォルトステータスの初期データ**

新規ユーザー作成時に以下をシードする（`is_default = TRUE`）。

| position | name | color | is_archive |
|---------|------|-------|-----------|
| 1 | 説明会 | #06B6D4 | FALSE |
| 2 | エントリー | #3B82F6 | FALSE |
| 3 | ES提出 | #8B5CF6 | FALSE |
| 4 | 書類選考 | #F59E0B | FALSE |
| 5 | 一次面接 | #F97316 | FALSE |
| 6 | 二次面接 | #EF4444 | FALSE |
| 7 | 最終面接 | #EC4899 | FALSE |
| 8 | 内定 | #10B981 | FALSE |
| 9 | 不合格 | #6B7280 | TRUE |
| 10 | 辞退 | #9CA3AF | TRUE |

---

### 3.3 companies（企業エントリー）

ユーザーが登録した企業の選考情報（カンバンカード1枚 = 1レコード）。

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|-----|------|-----------|------|
| id | CHAR(36) | NOT NULL | — | PK / UUID v4 |
| user_id | CHAR(36) | NOT NULL | — | FK → users.id |
| status_id | CHAR(36) | NOT NULL | — | FK → statuses.id（現在のカンバン列） |
| name | VARCHAR(255) | NOT NULL | — | 企業名 |
| industry | VARCHAR(100) | NULL | NULL | 業界 |
| priority | TINYINT | NOT NULL | 3 | 志望度（1=最高〜5=最低） |
| notes | TEXT | NULL | NULL | メモ・備考 |
| url | VARCHAR(512) | NULL | NULL | 企業サイト・マイページURL |
| login_id | VARCHAR(255) | NULL | NULL | マイページのログインID |
| created_at | DATETIME | NOT NULL | CURRENT_TIMESTAMP | レコード作成日時 |
| updated_at | DATETIME | NOT NULL | CURRENT_TIMESTAMP | レコード更新日時 |

**制約・インデックス**

| 種別 | 対象カラム | 名称 |
|------|-----------|------|
| PRIMARY KEY | id | pk_companies |
| FOREIGN KEY | user_id → users.id | fk_companies_user |
| FOREIGN KEY | status_id → statuses.id | fk_companies_status |
| INDEX | (user_id, status_id) | idx_companies_user_status |
| INDEX | (user_id, updated_at DESC) | idx_companies_user_updated |

**DDL**
```sql
CREATE TABLE companies (
    id         CHAR(36)     NOT NULL,
    user_id    CHAR(36)     NOT NULL,
    status_id  CHAR(36)     NOT NULL,
    name       VARCHAR(255) NOT NULL,
    industry   VARCHAR(100)     NULL DEFAULT NULL,
    priority   TINYINT      NOT NULL DEFAULT 3,
    notes      TEXT             NULL DEFAULT NULL,
    url        VARCHAR(512)     NULL DEFAULT NULL,
    login_id   VARCHAR(255)     NULL DEFAULT NULL,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP, -- updated_at は ORM (onupdate) で自動更新
    PRIMARY KEY (id),
    KEY idx_companies_user_status  (user_id, status_id),
    KEY idx_companies_user_updated (user_id, updated_at DESC),
    CONSTRAINT fk_companies_user   FOREIGN KEY (user_id)   REFERENCES users    (id) ON DELETE CASCADE,
    CONSTRAINT fk_companies_status FOREIGN KEY (status_id) REFERENCES statuses (id)
)
```

> **Note:** `status_id` の FK は `ON DELETE RESTRICT`（デフォルト）。ステータス削除前に companies をリジェクトし、UIで企業の移動先確認を促す。

---

### 3.4 events（イベント・日程）

企業に紐づくES締切・面接・説明会などの日程を管理する。カウントダウン表示の根拠となる。

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|-----|------|-----------|------|
| id | CHAR(36) | NOT NULL | — | PK / UUID v4 |
| company_id | CHAR(36) | NOT NULL | — | FK → companies.id |
| type | VARCHAR(50) | NOT NULL | — | イベント種別（後述） |
| title | VARCHAR(200) | NOT NULL | — | 表示タイトル（例：「一次面接」「ES提出期限」） |
| scheduled_at | DATETIME | NOT NULL | — | 日時（UTC保存 / 表示時にブラウザのTZで変換） |
| notes | TEXT | NULL | NULL | 備考・場所・URL等 |
| google_event_id | VARCHAR(255) | NULL | NULL | GoogleカレンダーイベントID（Phase 2で利用） |
| created_at | DATETIME | NOT NULL | CURRENT_TIMESTAMP | レコード作成日時 |
| updated_at | DATETIME | NOT NULL | CURRENT_TIMESTAMP | レコード更新日時 |

**イベント種別（type）の値一覧**

| 値 | 説明 |
|----|----|
| `es_deadline` | ESエントリーシート提出期限 |
| `interview_1st` | 一次面接 |
| `interview_2nd` | 二次面接 |
| `interview_final` | 最終面接 |
| `briefing` | 会社説明会 |
| `offer` | 内定通知・オファー面談 |
| `other` | その他 |

**制約・インデックス**

| 種別 | 対象カラム | 名称 |
|------|-----------|------|
| PRIMARY KEY | id | pk_events |
| FOREIGN KEY | company_id → companies.id | fk_events_company |
| INDEX | (company_id, scheduled_at) | idx_events_company_schedule |
| INDEX | (scheduled_at) | idx_events_schedule（直近締切サマリー用） |

**DDL**
```sql
CREATE TABLE events (
    id              CHAR(36)     NOT NULL,
    company_id      CHAR(36)     NOT NULL,
    type            VARCHAR(50)  NOT NULL,
    title           VARCHAR(200) NOT NULL,
    scheduled_at    DATETIME     NOT NULL,
    notes           TEXT             NULL DEFAULT NULL,
    google_event_id VARCHAR(255)     NULL DEFAULT NULL,
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP, -- updated_at は ORM (onupdate) で自動更新
    PRIMARY KEY (id),
    KEY idx_events_company_schedule (company_id, scheduled_at),
    KEY idx_events_schedule         (scheduled_at),
    CONSTRAINT fk_events_company FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE
)
```

---

### 3.5 user_settings（ユーザー設定）

ユーザーごとのUI設定を管理する。`user_id` が PK であり、1ユーザー1レコード。

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|-----|------|-----------|------|
| user_id | CHAR(36) | NOT NULL | — | PK / FK → users.id |
| show_archived_statuses | BOOLEAN | NOT NULL | FALSE | 不合格・辞退列の表示 |
| compact_cards | BOOLEAN | NOT NULL | FALSE | カンバンカードのコンパクト表示 |
| upcoming_refresh_minutes | INT | NOT NULL | 10 | 直近予定の自動更新間隔（1 / 5 / 10 分） |
| calendar_sync_enabled | BOOLEAN | NOT NULL | TRUE | Googleカレンダー同期の有効・無効 |
| created_at | DATETIME | NOT NULL | CURRENT_TIMESTAMP | レコード作成日時 |
| updated_at | DATETIME | NOT NULL | CURRENT_TIMESTAMP | レコード更新日時 |

**制約・インデックス**

| 種別 | 対象カラム | 名称 |
|------|-----------|------|
| PRIMARY KEY | user_id | pk_user_settings |
| FOREIGN KEY | user_id → users.id | fk_user_settings_user |

**DDL**
```sql
CREATE TABLE user_settings (
    user_id                  CHAR(36) NOT NULL,
    show_archived_statuses   BOOLEAN  NOT NULL DEFAULT FALSE,
    compact_cards            BOOLEAN  NOT NULL DEFAULT FALSE,
    upcoming_refresh_minutes INT      NOT NULL DEFAULT 10,
    calendar_sync_enabled    BOOLEAN  NOT NULL DEFAULT TRUE,
    created_at               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id),
    CONSTRAINT fk_user_settings_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
)
```

---

## 4. リレーション一覧

| 親テーブル | 子テーブル | 参照カラム | ON DELETE |
|-----------|-----------|-----------|-----------|
| users | statuses | user_id | CASCADE |
| users | companies | user_id | CASCADE |
| users | user_settings | user_id | CASCADE |
| statuses | companies | status_id | RESTRICT |
| companies | events | company_id | CASCADE |

> **設計方針：** ユーザー削除時はすべての関連データを連鎖削除（CASCADE）。ただし `statuses → companies` のみ RESTRICT とし、ステータス削除前に企業の移動先選択をUIで強制する。

---

## 5. SQLAlchemy モデル概要

```python
# backend/app/models/user.py
class User(Base):
    __tablename__ = "users"
    id         = Column(CHAR(36), primary_key=True, default=lambda: str(uuid4()))
    email      = Column(String(255), nullable=False, unique=True)
    name       = Column(String(255), nullable=False)
    image      = Column(String(512))
    google_id  = Column(String(255), nullable=False, unique=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())

    statuses  = relationship("Status",  back_populates="user", cascade="all, delete-orphan")
    companies = relationship("Company", back_populates="user", cascade="all, delete-orphan")

# backend/app/models/status.py
class Status(Base):
    __tablename__ = "statuses"
    id         = Column(CHAR(36), primary_key=True, default=lambda: str(uuid4()))
    user_id    = Column(CHAR(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name       = Column(String(100), nullable=False)
    color      = Column(String(7), nullable=False, default="#6B7280")
    position   = Column(Integer, nullable=False, default=0)
    is_default = Column(Boolean, nullable=False, default=False)
    is_archive = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())

    user      = relationship("User",    back_populates="statuses")
    companies = relationship("Company", back_populates="status")

# backend/app/models/company.py
class Company(Base):
    __tablename__ = "companies"
    id         = Column(CHAR(36), primary_key=True, default=lambda: str(uuid4()))
    user_id    = Column(CHAR(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status_id  = Column(CHAR(36), ForeignKey("statuses.id"), nullable=False)
    name       = Column(String(255), nullable=False)
    industry   = Column(String(100))
    priority   = Column(SmallInteger, nullable=False, default=3)
    notes      = Column(Text)
    url        = Column(String(512))
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())

    user   = relationship("User",   back_populates="companies")
    status = relationship("Status", back_populates="companies")
    events = relationship("Event",  back_populates="company", cascade="all, delete-orphan")

# backend/app/models/event.py
class Event(Base):
    __tablename__ = "events"
    id              = Column(CHAR(36), primary_key=True, default=lambda: str(uuid4()))
    company_id      = Column(CHAR(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    type            = Column(String(50), nullable=False)
    title           = Column(String(200), nullable=False)
    scheduled_at    = Column(DateTime, nullable=False)
    notes           = Column(Text)
    google_event_id = Column(String(255))
    created_at      = Column(DateTime, nullable=False, server_default=func.now())
    updated_at      = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())

    company = relationship("Company", back_populates="events")
```

---

## 6. Alembic マイグレーション方針

| 項目 | 方針 |
|------|------|
| マイグレーションファイル管理 | `backend/alembic/versions/` にコミット |
| 命名規則 | `YYYYMMDD_HHMM_<説明>.py`（例: `20260423_1200_create_initial_tables.py`） |
| 本番適用 | `alembic upgrade head` をデプロイスクリプトに組み込む |
| ロールバック | `alembic downgrade -1` で1世代戻し可能なよう `downgrade()` を必ず実装 |
| データマイグレーション | スキーマ変更と同一ファイルに記述。大量データの場合はバッチ処理 |

---

## 7. 設計上の注意点

| # | 注意点 | 理由 |
|---|--------|------|
| 1 | `scheduled_at` はUTCでDB保存 | タイムゾーン変換をアプリ層（ブラウザ）に一元化し、夏時間問題を回避 |
| 2 | PK に UUID v4（CHAR(36)）を使用 | 連番IDによる他ユーザーのリソース推測を防止 |
| 3 | `google_event_id` を初期から設置 | Phase 2 でGoogleカレンダー連携時のマイグレーションコストをゼロにする |
| 4 | `statuses.is_default` フラグ | デフォルトステータスはUI上で削除・名称変更を制限（誤操作防止） |
| 5 | `updated_at` 自動更新は ORM で処理 | SQLite は `ON UPDATE CURRENT_TIMESTAMP` 非対応のため、SQLAlchemy の `onupdate=func.now()` で対応 |
| 6 | SQLite 外部キーを明示的に有効化 | SQLite はデフォルトで外部キー無効のため `PRAGMA foreign_keys=ON` を接続時に実行 |
| 7 | 全テーブルに `created_at` / `updated_at` | Alembic でのデータ追跡・デバッグ・監査ログの基礎 |
