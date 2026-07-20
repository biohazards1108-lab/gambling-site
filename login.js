async function login() {
    const user = document.getElementById("user").value.trim();
    const pass = document.getElementById("pass").value.trim();
    const errorBox = document.getElementById("error");

    try {
        const response = await fetch("https://gambling-site-production.up.railway.app/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ username: user, password: pass })
        });

        const data = await response.json();

        if (data.success === true) {
            window.location.href = "./dashboard.html";
        } else {
            errorBox.innerText = "Invalid username or password";
        }

    } catch (err) {
        errorBox.innerText = "Login failed";
        console.error(err);
    }
}
