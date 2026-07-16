async function login() {
    const username = document.getElementById("user").value.trim();
    const password = document.getElementById("pass").value.trim();
    const errorBox = document.getElementById("error");

    errorBox.textContent = "";

    if (!username || !password) {
        errorBox.textContent = "Please enter both username and password.";
        return;
    }

    try {
        const res = await fetch("https://gambling-site-production.up.railway.app/api/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();

        if (!res.ok) {
            errorBox.textContent = data.error || "Login failed.";
            return;
        }

        // Save token for future API calls
        localStorage.setItem("authToken", data.token);

        // Redirect to dashboard
        window.location.href = "/dashboard.html";

    } catch (err) {
        errorBox.textContent = "Server error. Try again.";
    }
}
