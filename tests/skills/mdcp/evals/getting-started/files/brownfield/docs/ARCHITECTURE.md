# Architecture

This monolith describes the inventory-sync service.

## Overview

inventory-sync pulls stock levels from warehouse APIs and writes them to the catalog database every 15 minutes.

## Components

- **Ingest worker** — polls partner feeds
- **Normalizer** — maps partner SKUs to catalog IDs
- **Writer** — upserts stock rows

## Non-goals

Do not document deployment runbooks here; those live in ops wikis.
