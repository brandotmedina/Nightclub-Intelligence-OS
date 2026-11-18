import AdminVipView from "./AdminVipView";

export const dynamic = "force-dynamic";

export const metadata = { title: "VIP Bookings" };

// Gate lives client-side (same as /admin/photos): passcode form → /api/staff/auth,
// then every /api/staff/vip/* call re-checks the passcode server-side.
export default function AdminVipPage() {
  return <AdminVipView />;
}
