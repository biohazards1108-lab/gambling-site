async function login() {
    const user = document.getElementById("user").value.trim();
    const pass = document.getElementById("pass").value.trim();
    const errorBox = document.getElementById("error");

    if (!user || !pass) {
        errorBox.innerText = "Please enter both username and password";
        return;
    }

    try {
        const response = await fetch("https://gambling-site-production.up.railway.app/api/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",  // REQUIRED for cookies
            body: JSON.stringify({
                username: user,
                password: pass
            })
        });

        const data = await response.json();

        if (data.success === true) {
            window.location.href = "./dashboard.html";
        } else {
            errorBox.innerText = data.message || "Invalid username or password";
        }

    } catch (err) {
        console.error("Login error:", err);
        errorBox.innerText = "Connection failed";
    }
}
