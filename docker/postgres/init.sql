-- Runs once, on first initialization of the pgdata volume.
-- Enables pgvector in the main database and provisions a test database for Pest.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE DATABASE afaq_testing;
\connect afaq_testing
CREATE EXTENSION IF NOT EXISTS vector;
