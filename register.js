const API = "https://gambling-site-production.up.railway.app";

async function register() {
    const username = document.getElementById("user").value;
    const password = document.getElementById("pass").value;

    const res = await fetch(`${API}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (data.success) {
        alert("Account created. You can now log in.");
        window.location.href = "login.html";
    } else {
        alert(data.message || "Registration failed");
    }
}
