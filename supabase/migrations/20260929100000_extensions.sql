-- pgvector for chunk embeddings; Supabase keeps extensions in the `extensions` schema.
create extension if not exists vector with schema extensions;
