const API = "https://gambling-site-production.up.railway.app";

const key = localStorage.getItem("adminKey");
if (!key) window.location.href = "admin.html";

// ----------------------
// Load Stats
// ----------------------
async function loadStats() {
    const res = await fetch(`${API}/api/admin/stats`, {
        headers: { "x-admin-key": key }
    });

    const data = await res.json();

    document.getElementById("totalUsers").innerText = data.users;
    document.getElementById("totalBalance").innerText = data.totalBalance;

    // Placeholder until backend tracks wins/losses
    document.getElementById("totalWon").innerText = "Coming Soon";
    document.getElementById("totalLost").innerText = "Coming Soon";
}

// ----------------------
// Load Active Users
// ----------------------
async function loadActiveUsers() {
    const res = await fetch(`${API}/api/admin/users`, {
        headers: { "x-admin-key": key }
    });

    const users = await res.json();

    let html = `
        <tr>
            <th>ID</th>
            <th>Username</th>
            <th>Balance</th>
            <th>Game</th>
            <th>Ban</th>
            <th>Actions</th>
        </tr>
    `;

    users.forEach(u => {
        html += `
            <tr>
                <td>${u.id}</td>
                <td>${u.username}</td>
                <td>${u.balance}</td>
                <td>${u.current_game || "None"}</td>
                <td>
                    <select onchange="banUser(${u.id}, this.value)">
                        <option value="">Select</option>
                        <option value="5">5 mins</option>
                        <option value="10">10 mins</option>
                        <option value="20">20 mins</option>
                        <option value="40">40 mins</option>
                        <option value="60">1 hour</option>
                        <option value="9999">Permanent</option>
                    </select>
                </td>
                <td>
                    <button onclick="updateBalance(${u.id})">Balance</button>
                    <button onclick="unban(${u.id})">Unban</button>
                </td>
            </tr>
        `;
    });

    document.getElementById("activeTable").innerHTML = html;
}

// ----------------------
// Ban User
// ----------------------
async function banUser(id, minutes) {
    await fetch(`${API}/api/admin/ban/${id}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-admin-key": key
        },
        body: JSON.stringify({ minutes })
    });

    loadActiveUsers();
}

// ----------------------
// Unban User
// ----------------------
async function unban(id) {
    await fetch(`${API}/api/admin/unban/${id}`, {
        method: "POST",
        headers: { "x-admin-key": key }
    });

    loadActiveUsers();
}

// ----------------------
// Update Balance
// ----------------------
async function updateBalance(id) {
    const newBalance = prompt("Enter new balance:");

    await fetch(`${API}/api/admin/balance/${id}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-admin-key": key
        },
        body: JSON.stringify({ balance: newBalance })
    });

    loadActiveUsers();
}

// ----------------------
// Load Games
// ----------------------
async function loadGames() {
    const res = await fetch(`${API}/api/admin/games`, {
        headers: { "x-admin-key": key }
    });

    const games = await res.json();

    let html = `
        <tr>
            <th>Name</th>
            <th>Enabled</th>
            <th>Toggle</th>
        </tr>
    `;

    games.forEach(g => {
        html += `
            <tr>
                <td>${g.name}</td>
                <td>${g.enabled}</td>
                <td>
                    <button onclick="toggleGame('${g.name}', ${!g.enabled})">
                        Set ${!g.enabled}
                    </button>
                </td>
            </tr>
        `;
    });

    document.getElementById("gameTable").innerHTML = html;
}

// ----------------------
// Toggle Game
// ----------------------
async function toggleGame(name, enabled) {
    await fetch(`${API}/api/admin/games`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-admin-key": key
        },
        body: JSON.stringify({ name, enabled })
    });

    loadGames();
}

// ----------------------
// Load Everything
// ----------------------
loadStats();
loadActiveUsers();
loadGames();
