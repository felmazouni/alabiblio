-- Migration 0004: Add destination_node_id column to center_transport_nodes
-- This column was referenced in INSERT and JOIN queries but missing from the table schema.
ALTER TABLE center_transport_nodes ADD COLUMN destination_node_id TEXT;
