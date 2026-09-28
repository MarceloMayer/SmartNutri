SET @sqlstmt := (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME = 'status'
    ),
    'SELECT 1',
    'ALTER TABLE users ADD COLUMN status ENUM(\'active\', \'inactive\') NOT NULL DEFAULT \'active\' AFTER role'
  )
);
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
