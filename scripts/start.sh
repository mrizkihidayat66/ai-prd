#!/bin/sh
if [ ! -f /app/data/prod.db ]; then
  cp /app/prisma/template.db /app/data/prod.db
else
  # Idempotent migrations for existing databases
  sqlite3 /app/data/prod.db "ALTER TABLE Project ADD COLUMN metadata TEXT;" 2>/dev/null || true
  sqlite3 /app/data/prod.db "CREATE TABLE IF NOT EXISTS Template (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT NOT NULL DEFAULT 'FileText',
    category TEXT NOT NULL DEFAULT 'custom',
    prompt TEXT NOT NULL,
    structure TEXT,
    sourceProjectId TEXT,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );" 2>/dev/null || true
  sqlite3 /app/data/prod.db "CREATE TABLE IF NOT EXISTS Integration (
    id TEXT PRIMARY KEY,
    enabled INTEGER NOT NULL DEFAULT 0,
    token TEXT,
    baseUrl TEXT,
    metadata TEXT,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );" 2>/dev/null || true
  sqlite3 /app/data/prod.db "CREATE TABLE IF NOT EXISTS Comment (
    id TEXT PRIMARY KEY,
    projectId TEXT NOT NULL,
    section TEXT NOT NULL,
    content TEXT NOT NULL,
    author TEXT NOT NULL DEFAULT 'Anonymous',
    resolved INTEGER NOT NULL DEFAULT 0,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );" 2>/dev/null || true
  sqlite3 /app/data/prod.db "CREATE TABLE IF NOT EXISTS Review (
    id TEXT PRIMARY KEY,
    projectId TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'draft',
    reviewer TEXT,
    notes TEXT,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );" 2>/dev/null || true
fi
exec node server.js
