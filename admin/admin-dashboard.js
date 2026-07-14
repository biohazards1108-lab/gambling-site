const API = "https://gambling-site-production.up.railway.app";

const key = localStorage.getItem("adminKey");
if (!key) window.location.href = "admin.html";

async function loadStats() {
    const res = await fetch(`${API}/api/admin/stats`, {
        headers: { "x-admin-key": key }
    });

    const data = await res.json();

    document.getElementById("totalUsers").innerText = data.users;
    document.getElementById("totalBalance").innerText = data.totalBalance;
}

async function loadUsers() {
    const res = await fetch(`${API}/api/admin/users`, {
        headers: { "x-admin-key": key }
    });

    const users = await res.json();

    const table = document.getElementById("userTable");
    table.innerHTML = `
        <tr>
            <th>ID</th>
            <th>Username</th>
            <th>Balance</th>
            <th>Actions</th>
        </tr>
    `;

    users.forEach(u => {
        table.innerHTML += `
            <tr>
                <td>${u.id}</td>
                <td>${u.username}</td>
                <td>${u.balance}</td>
                <td>
                    <button onclick="updateBalance(${u.id})">Update Balance</button>
                    <button onclick="unban(${u.id})">Unban</button>
                </td>
            </tr>
        `;
    });
}

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

    loadUsers();
}

async function unban(id) {
    await fetch(`${API}/api/admin/unban/${id}`, {
        method: "POST",
        headers: { "x-admin-key": key }
    });

    loadUsers();
}

async function loadGames() {
    const res = await fetch(`${API}/api/admin/games`, {
        headers: { "x-admin-key": key }
    });

    const games = await res.json();

    const table = document.getElementById("gameTable");
    table.innerHTML = `
        <tr>
            <th>Name</th>
            <th>Enabled</th>
            <th>Toggle</th>
        </tr>
    `;

    games.forEach(g => {
        table.innerHTML += `
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
}

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

loadStats();
loadUsers();
loadGames();
