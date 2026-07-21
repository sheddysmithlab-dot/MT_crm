"""Generate backend/sql/malwa_crm_Data_base.sql from SQLAlchemy models."""
from pathlib import Path

from sqlalchemy.schema import CreateTable
from sqlalchemy.dialects import mysql

from app.db.session import Base
from app.db import models, models_extra, registry  # noqa: F401


def main():
    out_dir = Path(__file__).resolve().parents[1] / "sql"
    out_dir.mkdir(exist_ok=True)
    path = out_dir / "malwa_crm_Data_base.sql"

    dialect = mysql.dialect()
    lines: list[str] = []
    lines.append("-- =========================================================================")
    lines.append("-- Malwa CRM - MySQL Database Schema (Option B)")
    lines.append("-- Aligned with BACKEND_COMPLETE_ARCHITECTURE module/store map")
    lines.append("--")
    lines.append("-- HOSTINGER / shared hosting:")
    lines.append("--   1. hPanel -> Databases -> create DB (e.g. uXXXX_Malwa_crm)")
    lines.append("--   2. phpMyAdmin -> SELECT that database (left sidebar)")
    lines.append("--   3. Import THIS file (do NOT run CREATE DATABASE)")
    lines.append("--   This file has no CREATE DATABASE (avoids error #1044)")
    lines.append("--")
    lines.append("-- Local MySQL (full control):")
    lines.append("--   CREATE DATABASE malwa_crm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
    lines.append("--   USE malwa_crm;")
    lines.append("--   then import this file")
    lines.append("--")
    lines.append("-- After import:")
    lines.append("--   update backend/.env DATABASE_URL with your Hostinger DB name/user/pass")
    lines.append("--   python -m scripts.seed_admin")
    lines.append("-- =========================================================================")
    lines.append("")
    lines.append("-- NOTE: No CREATE DATABASE / USE here — Hostinger users lack that privilege.")
    lines.append("-- Make sure your target database is already selected in phpMyAdmin.")
    lines.append("")
    lines.append("SET NAMES utf8mb4;")
    lines.append("SET FOREIGN_KEY_CHECKS = 0;")
    lines.append("")

    for table in Base.metadata.sorted_tables:
        lines.append("-- -------------------------------------------------------------------------")
        lines.append(f"-- Table: {table.name}")
        lines.append("-- -------------------------------------------------------------------------")
        ddl = str(CreateTable(table).compile(dialect=dialect))
        ddl = ddl.replace("CREATE TABLE ", "CREATE TABLE IF NOT EXISTS ", 1)
        lines.append(ddl.rstrip() + ";")
        lines.append("")

    lines.append("SET FOREIGN_KEY_CHECKS = 1;")
    lines.append("")
    lines.append(f"-- Done. Tables created: {len(Base.metadata.tables)}")
    lines.append("-- Next: python -m scripts.seed_admin")

    path.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {path}")
    print(f"Tables: {len(Base.metadata.tables)}")


if __name__ == "__main__":
    main()
