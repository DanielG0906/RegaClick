-- RegaClick — Supabase schema
-- Run this in: Supabase Dashboard → SQL Editor → Run

create extension if not exists "uuid-ossp";

-- ── Couples ─────────────────────────────────────────────
create table if not exists couples (
  id          uuid primary key default uuid_generate_v4(),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  email       text unique not null,
  bride_name  text,
  groom_name  text,
  wedding_date date,
  theme       text,
  font        text default 'cormorant',
  texture     text default 'none',
  font_color  text default '#3a2820',
  font_size   text default 'medium',
  font_weight text default '400',
  event_id    text unique,
  folder_id   text
);

-- ── OTP ─────────────────────────────────────────────────
create table if not exists otp (
  id         uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now(),
  email      text not null,
  otp        text not null,
  expiry     bigint not null,
  used       boolean default false,
  last_sent  bigint
);

-- ── Guests ──────────────────────────────────────────────
create table if not exists guests (
  id         uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now(),
  email      text,
  event_id   text,
  unique (email, event_id)
);

-- ── Device Emails ────────────────────────────────────────
create table if not exists device_emails (
  id          uuid primary key default uuid_generate_v4(),
  created_at  timestamptz default now(),
  fingerprint text unique not null,
  email       text,
  event_id    text
);

-- ── RLS: only service role (Edge Function) can access ───
alter table couples       enable row level security;
alter table otp           enable row level security;
alter table guests        enable row level security;
alter table device_emails enable row level security;

-- No public policies — all access goes through the Edge Function with service role key
