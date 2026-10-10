// Run only in the current Lovable checkout after merging this feature's files.
// Preserve every existing migration entry rather than replacing a newer journal
// with the stale GitHub mirror (which currently stops at 0009).
import { readFileSync, writeFileSync } from 'node:fs';
const file = new URL('../drizzle/migrations/meta/_journal.json', import.meta.url);
const journal = JSON.parse(readFileSync(file, 'utf8'));
const tag = '0021_plan_welcome_emails';
if (journal.entries.some(entry => entry.tag === tag)) {
  console.log('Welcome migration already registered.');
} else {
  if (journal.entries.at(-1)?.idx !== 20) {
    throw new Error('Expected the current Lovable migration history through 0020. Sync the source history first.');
  }
  journal.entries.push({ idx:21, version:'7', when:1791630900000, tag, breakpoints:true });
  writeFileSync(file, JSON.stringify(journal, null, 2) + '\n');
  console.log('Registered welcome migration without modifying earlier entries.');
}
