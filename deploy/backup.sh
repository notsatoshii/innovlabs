#!/usr/bin/env bash
# Weekly logical backup of the Supabase database (review finding P1-31).
# survey_response is the immutable baseline and exists nowhere else; a paused
# or deleted project must not be able to take it along.
#
#   SUPABASE_DB_URL=postgresql://... bash deploy/backup.sh
#
# Writes one custom-format dump of the `public` schema per run and keeps the
# newest BACKUP_KEEP files. The dump holds personal data (survey answers,
# names, emails in inquiry and waitlist): the directory is created 0700, and
# the off-site copy must go to storage that is encrypted and access-controlled.
# auth.users is not in the dump; Supabase's own daily backups (paid plan)
# cover it.
#
# Restore into an empty database:
#   pg_restore --no-owner --no-privileges --dbname "$TARGET_DB_URL" <file>.dump
#
# Cron example (Sundays 03:10 KST), with the URL in a root-only env file:
#   10 3 * * 0  . /root/.innovlabs-backup.env && bash /opt/funnel/deploy/backup.sh >> /var/log/innovlabs-backup.log 2>&1
#
# Needs pg_dump of the same major version as the server (apt install
# postgresql-client-17, or whichever `select version()` reports).
set -euo pipefail

: "${SUPABASE_DB_URL:?Set SUPABASE_DB_URL (Supabase dashboard -> Connect -> Session pooler).}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/innovlabs}"
BACKUP_KEEP="${BACKUP_KEEP:-8}"

umask 077
mkdir -p "$BACKUP_DIR"

file="$BACKUP_DIR/innovlabs-$(date -u +%Y%m%dT%H%M%SZ).dump"
pg_dump "$SUPABASE_DB_URL" \
  --format=custom \
  --schema=public \
  --no-owner \
  --no-privileges \
  --file "$file"

# A dump that pg_restore cannot list is not a backup.
pg_restore --list "$file" > /dev/null
echo "wrote $file ($(du -h "$file" | cut -f1))"

# Keep the newest BACKUP_KEEP dumps.
ls -1t "$BACKUP_DIR"/innovlabs-*.dump | tail -n +"$((BACKUP_KEEP + 1))" | while read -r old; do
  rm -f -- "$old"
  echo "removed $old"
done

# Off-site copy: add one line here once a destination exists, for example
#   rclone copy "$file" remote:innovlabs-backups/
