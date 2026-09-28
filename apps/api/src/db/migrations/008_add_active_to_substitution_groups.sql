ALTER TABLE substitution_groups
  ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER description,
  ADD KEY substitution_groups_is_active_index (is_active);
