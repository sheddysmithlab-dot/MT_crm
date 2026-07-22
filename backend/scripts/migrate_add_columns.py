"""Add missing columns for job-flow tables (safe ALTER). Run inside API container."""
from sqlalchemy import text, inspect

from app.db.session import engine, Base
from app.db import models, models_extra, models_jobflow, registry  # noqa: F401


def main():
    insp = inspect(engine)
    with engine.begin() as conn:
        for table in Base.metadata.sorted_tables:
            if not insp.has_table(table.name):
                table.create(bind=conn)
                print(f"CREATED {table.name}")
                continue
            existing = {c["name"] for c in insp.get_columns(table.name)}
            for col in table.columns:
                if col.name in existing:
                    continue
                col_type = col.type.compile(dialect=engine.dialect)
                nullable = "NULL" if col.nullable else "NULL"  # additive cols always nullable
                sql = f"ALTER TABLE `{table.name}` ADD COLUMN `{col.name}` {col_type} {nullable}"
                try:
                    conn.execute(text(sql))
                    print(f"ADDED {table.name}.{col.name}")
                except Exception as e:  # noqa: BLE001
                    print(f"SKIP {table.name}.{col.name}: {e}")
    print("DONE")


if __name__ == "__main__":
    main()
