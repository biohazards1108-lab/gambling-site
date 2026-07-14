const API = "https://gambling-site-production.up.railway.app";

async function adminLogin() {
    const key = document.getElementById("adminKey").value;

    const res = await fetch(`${API}/api/admin/login`, {
        method: "GET",
        headers: {
            "x-admin-key": key
        }
    });

    const data = await res.json();

    if (data.message === "Admin authenticated") {
        localStorage.setItem("adminKey", key);
        window.location.href = "admin-dashboard.html";
    } else {
        alert("Invalid admin key");
    }
}
