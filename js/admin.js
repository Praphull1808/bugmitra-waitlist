// =========================================================
// BugMitra — Admin Dashboard
// Access is gated by Supabase Auth + the `admins` allowlist table.
// All queries rely on the RLS policies defined in schema.sql —
// a non-admin authenticated user gets zero rows back, not an error.
// =========================================================
import { supabase } from "./supabaseClient.js";

const loginScreen = document.getElementById("loginScreen");
const dashboard = document.getElementById("dashboard");
const loginError = document.getElementById("loginError");

let allUsers = [];

// ---------- Auth ----------
document.getElementById("loginBtn").addEventListener("click", async () => {
  const email = document.getElementById("adminEmail").value.trim();
  const password = document.getElementById("adminPassword").value;
  loginError.style.display = "none";

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    loginError.textContent = "Invalid credentials.";
    loginError.style.display = "block";
    return;
  }
  await boot();
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await supabase.auth.signOut();
  location.reload();
});

async function boot() {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    loginScreen.style.display = "flex";
    dashboard.style.display = "none";
    return;
  }

  // Admin-only RLS: if this returns zero rows for a non-admin, they'll just see an empty dashboard.
  const { data, error } = await supabase.from("waitlist").select("*").limit(1);
  if (error) {
    loginError.textContent = "Not authorized as admin.";
    loginError.style.display = "block";
    await supabase.auth.signOut();
    return;
  }

  loginScreen.style.display = "none";
  dashboard.style.display = "block";
  await loadAll();
}

// ---------- Data loading ----------
async function loadAll() {
  const { data, error } = await supabase
    .from("waitlist")
    .select("id, full_name, email, skill_level, coding_problem, referral_code, referral_count, badge, position, joined_at")
    .order("joined_at", { ascending: true });

  if (error) {
    console.error(error);
    return;
  }
  allUsers = data;

  renderStats(allUsers);
  renderLeaderboard(allUsers);
  renderUsersTable(allUsers);
}

function renderStats(users) {
  const total = users.length;
  const todayStr = new Date().toISOString().slice(0, 10);
  const today = users.filter((u) => u.joined_at.slice(0, 10) === todayStr).length;
  const totalReferrals = users.reduce((sum, u) => sum + (u.referral_count || 0), 0);
  const top = [...users].sort((a, b) => (b.referral_count || 0) - (a.referral_count || 0))[0];

  document.getElementById("statTotal").textContent = total.toLocaleString("en-IN");
  document.getElementById("statToday").textContent = today.toLocaleString("en-IN");
  document.getElementById("statReferrals").textContent = totalReferrals.toLocaleString("en-IN");
  document.getElementById("statTopReferrer").textContent =
    top && top.referral_count > 0 ? `${top.full_name} (${top.referral_count})` : "—";
}

function renderLeaderboard(users) {
  const top10 = [...users]
    .filter((u) => u.referral_count > 0)
    .sort((a, b) => b.referral_count - a.referral_count)
    .slice(0, 10);

  const body = document.getElementById("leaderboardBody");
  body.innerHTML = top10.length
    ? top10.map((u) => `
        <tr>
          <td class="name">${escapeHtml(u.full_name)}</td>
          <td>${u.referral_count}</td>
          <td>${u.badge ? `<span class="badge-pill">${escapeHtml(u.badge)}</span>` : "—"}</td>
        </tr>
      `).join("")
    : `<tr><td colspan="3" style="text-align:center;color:var(--text-dimmer);">No referrals yet.</td></tr>`;
}

function renderUsersTable(users) {
  const body = document.getElementById("usersBody");
  body.innerHTML = users.map((u, i) => `
    <tr data-id="${u.id}">
      <td>${i + 1}</td>
      <td class="name">${escapeHtml(u.full_name)}</td>
      <td>${escapeHtml(u.email)}</td>
      <td>${escapeHtml(u.skill_level)}</td>
      <td>${escapeHtml(u.coding_problem)}</td>
      <td>${u.referral_count}</td>
      <td>${new Date(u.joined_at).toLocaleDateString("en-IN")}</td>
      <td><button class="del-btn" data-id="${u.id}"><i class="fa-solid fa-trash"></i></button></td>
    </tr>
  `).join("");

  body.querySelectorAll(".del-btn").forEach((btn) => {
    btn.addEventListener("click", () => deleteUser(btn.dataset.id));
  });
}

function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ---------- Search ----------
document.getElementById("userSearch").addEventListener("input", (e) => {
  const q = e.target.value.toLowerCase().trim();
  const filtered = allUsers.filter(
    (u) => u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
  );
  renderUsersTable(filtered);
});

// ---------- Delete ----------
async function deleteUser(id) {
  if (!confirm("Delete this user permanently?")) return;
  const { error } = await supabase.from("waitlist").delete().eq("id", id);
  if (error) {
    alert("Delete failed: " + error.message);
    return;
  }
  await loadAll();
}

// ---------- CSV export ----------
document.getElementById("exportCsvBtn").addEventListener("click", () => {
  const headers = ["Name", "Email", "Skill Level", "Coding Problem", "Referral Code", "Referrals", "Joined At"];
  const rows = allUsers.map((u) => [
    u.full_name, u.email, u.skill_level, u.coding_problem, u.referral_code, u.referral_count, u.joined_at,
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `bugmitra-waitlist-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
});

// ---------- Bulk email ----------
document.getElementById("sendBulkBtn").addEventListener("click", async () => {
  const subject = document.getElementById("bulkSubject").value.trim();
  const message = document.getElementById("bulkMessage").value.trim();
  const status = document.getElementById("bulkStatus");

  if (!subject || !message) {
    status.textContent = "Subject and message are required.";
    return;
  }

  status.textContent = "Sending...";
  const { data, error } = await supabase.functions.invoke("email-all-users", {
    body: { subject, message },
  });

  if (error) {
    status.textContent = "Failed: " + error.message;
    return;
  }
  status.textContent = `Sent ${data.sent}/${data.total} (${data.failed} failed).`;
});

// ---------- Boot ----------
boot();
