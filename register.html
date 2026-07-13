const API = "https://gambling-site-production.up.railway.app";

async function login() {
    const username = document.getElementById("user").value;
    const password = document.getElementById("pass").value;

    const res = await fetch(`${API}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (data.success && data.token) {
        localStorage.setItem("userToken", data.token);
        window.location.href = "dashboard.html";
    } else {
        alert(data.message || "Login failed");
    }
}
