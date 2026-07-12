function showPage(page) {
    document.querySelectorAll(".page").forEach(p => p.classList.add("hidden"));
    document.getElementById(page).classList.remove("hidden");
}

/* -------------------------
   Fetch Site Overview
-------------------------- */
async function loadOverview() {
    document.getElementById("totalUsers").innerText = "Loading...";
    document.getElementById("totalBalance").innerText = "Loading...";
    document.getElementById("activeGames").innerText = "Loading...";

    // Replace with your backend endpoints
    const stats = await fetch("/admin/stats").then(r => r.json());

    document.getElementById("totalUsers").innerText = stats.totalUsers;
    document.getElementById("totalBalance").innerText = stats.totalBalance;
    document.getElementById("activeGames").innerText = stats.activeGames;
}

/* -------------------------
   User Management
-------------------------- */
async function loadUsers() {
    const users = await fetch("/admin/users").then(r => r.json());
    const list = document.getElementById("userList");
    list.innerHTML = "";

    users.forEach(u => {
        list.innerHTML += `
            <tr>
                <td>${u.id}</td>
                <td>${u.username}</td>
                <td>${u.balance}</td>
                <td>
                    <button onclick="editBalance(${u.id})">Edit</button>
                    <button onclick="banUser(${u.id})">Ban</button>
                </td>
            </tr>
        `;
    });
}

function searchUsers() {
    const term = document.getElementById("searchUser").value.toLowerCase();
    document.querySelectorAll("#userList tr").forEach(row => {
        row.style.display = row.innerText.toLowerCase().includes(term) ? "" : "none";
    });
}

/* -------------------------
   Game Toggles
-------------------------- */
async function toggleGame(game) {
    await fetch(`/admin/toggle-game/${game}`, { method: "POST" });
    alert(`${game} updated`);
}

/* -------------------------
   Security
-------------------------- */
function banUserPrompt() {
    const id = prompt("Enter user ID to ban:");
    if (id) banUser(id);
}

async function banUser(id) {
    await fetch(`/admin/ban/${id}`, { method: "POST" });
    alert("User banned");
}

function unbanUserPrompt() {
    const id = prompt("Enter user ID to unban:");
    if (id) unbanUser(id);
}

async function unbanUser(id) {
    await fetch(`/admin/unban/${id}`, { method: "POST" });
    alert("User unbanned");
}

async function toggleMaintenance() {
    await fetch("/admin/maintenance", { method: "POST" });
    alert("Maintenance mode toggled");
}

/* -------------------------
   Logs
-------------------------- */
async function loadLogs() {
    const logs = await fetch("/admin/logs").then(r => r.text());
    document.getElementById("logOutput").innerText = logs;
}

/* -------------------------
   Settings
-------------------------- */
async function clearCache() {
    await fetch("/admin/clear-cache", { method: "POST" });
    alert("Cache cleared");
}

async function restartBackend() {
    await fetch("/admin/restart", { method: "POST" });
    alert("Backend restarting...");
}

/* -------------------------
   Initial Load
-------------------------- */
loadOverview();
loadUsers();
loadLogs();
