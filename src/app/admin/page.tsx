'use client';

/**
 * Admin Dashboard Page
 *
 * Protected admin dashboard requiring authentication and admin privileges.
 */

import { AdminGuard } from '@/components/admin/AdminGuard';
import AdminDashboard from '@/components/admin/AdminDashboard';

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-surface">
      <AdminGuard>
        <AdminDashboard />
      </AdminGuard>
    </div>
  );
}
