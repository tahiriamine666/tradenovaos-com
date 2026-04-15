

## Plan: Create Playbook with Supabase CRUD in Playbook Lab

### What changes

Replace the hardcoded `playbooks` array and static Playbook Lab section with a dynamic component that fetches from Supabase, supports creating new playbooks via a modal form, and includes edit/delete, loading, and empty states.

### Steps

1. **Create `src/pages/PlaybookLab.tsx`** — a standalone component:
   - Fetch playbooks from `playbooks` table filtered by `user_id`, ordered by `created_at desc`
   - "New Playbook" button at top opens a Dialog with fields: `title`, `description`, `rules`
   - On submit: insert into Supabase with `user_id` from auth, re-fetch list
   - Edit button per card: opens same Dialog pre-filled, updates on submit
   - Delete button per card: deletes from Supabase, re-fetches
   - Loading state with Skeleton cards
   - Empty state: "No playbooks yet — create your first one"
   - Card layout: title (bold), description (muted), rules (in a muted background block), edit/delete buttons

2. **Update `src/pages/Index.tsx`**:
   - Remove the hardcoded `playbooks` array (lines 46-50)
   - Import `PlaybookLab` component
   - Replace lines 723-742 (static playbooks section) with `<PlaybookLab />`

### Technical details

- Uses existing UI components: Card, Dialog, Button, Input, Textarea, Badge, Skeleton, toast
- Query: `supabase.from('playbooks').select('*').eq('user_id', user.id).order('created_at', { ascending: false })`
- No database changes needed — `playbooks` table, columns, and RLS policies all exist
- Follows same CRUD pattern as TradeVault

### Files changed
- `src/pages/PlaybookLab.tsx` (new)
- `src/pages/Index.tsx` (remove static data, import new component)

