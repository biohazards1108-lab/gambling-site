const API = "https://gambling-site-production.up.railway.app";

async function adminLogin() {
    const username = document.getElementById("adminUser").value;
    const password = document.getElementById("adminPass").value;

    const res = await fetch(`${API}/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (data.success && data.token) {
        localStorage.setItem("adminToken", data.token);
        window.location.href = "dashboard.html";
    } else {
        alert(data.message || "Admin login failed");
    }
}
