# Admin Panel Setup Guide
# Exactly what to copy/paste in Lovable to make Admin Panel visible

# ════════════════════════════════════════════════════════════════
# STEP 1 — Copy these 3 files into Lovable
# ════════════════════════════════════════════════════════════════

# File 1: /src/hooks/useProfile.ts          (from outputs/hooks/)
# File 2: /src/components/AppLayout.tsx     (from outputs/components/)
# File 3: /src/pages/AdminPanel.tsx         (from outputs/pages/)

# ════════════════════════════════════════════════════════════════
# STEP 2 — Wrap app with ProfileProvider in main.tsx or App.tsx
# ════════════════════════════════════════════════════════════════

# Find your main.tsx or App.tsx (wherever your root render is)
# Add this import at top:
from:
  import { BrowserRouter } from 'react-router-dom'

to (add these imports):
  import { ProfileProvider } from '@/hooks/useProfile'
  import { PlanProvider } from '@/hooks/usePlan'

# Then wrap your app:
BEFORE:
  <BrowserRouter>
    <App />
  </BrowserRouter>

AFTER:
  <BrowserRouter>
    <ProfileProvider>
      <PlanProvider>
        <App />
      </PlanProvider>
    </ProfileProvider>
  </BrowserRouter>

# ════════════════════════════════════════════════════════════════
# STEP 3 — Add admin route in Index.tsx
# ════════════════════════════════════════════════════════════════

# At the TOP of Index.tsx, add this import:
import AdminPanel from '@/pages/AdminPanel';
import { useProfile } from '@/hooks/useProfile';

# Inside TradingDashboard component, add this line near other hooks:
const { isAdmin } = useProfile();

# Find the section with all your {active === 'xxx' && ...} blocks
# Add this line ANYWHERE in that section:
{active === 'admin' && <AdminPanel />}

# ════════════════════════════════════════════════════════════════
# STEP 4 — Update AppLayout usage in Index.tsx
# ════════════════════════════════════════════════════════════════

# If you're already using AppLayout, just make sure you pass onNavigate:
<AppLayout
  active={active}
  onNavigate={setActive}       # ← this is what lets sidebar nav work
  dark={dark}
  onToggleTheme={...}
  onLogout={handleLogout}
  topBar={<TopBar ... onNavigate={setActive} />}
>

# ════════════════════════════════════════════════════════════════
# STEP 5 — Test it works
# ════════════════════════════════════════════════════════════════

# 1. Login with tahiria740@gmail.com
# 2. Look at sidebar — you should see "Admin Panel" with red ADMIN badge
#    at the bottom of the nav, separated by a line
# 3. Click it → AdminPanel page loads
# 4. You'll see your own account in the users list
# 5. To test upgrade: click "Manage" next to your account → select "pro" → click Upgrade

# ════════════════════════════════════════════════════════════════
# QUICK CHECK — if admin item still not showing
# ════════════════════════════════════════════════════════════════

# The admin check uses get_my_profile() RPC.
# Test it manually: go to Supabase → SQL Editor → run:
#   SELECT public.get_my_profile();
# Look for "is_admin": true in the result.
# If it shows false, run:
#   SELECT * FROM public.admin_users;
# Make sure your user ID is there.
