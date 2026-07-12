document.getElementById("registerForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!username || !password) {
        alert("Please enter a username and password.");
        return;
    }

    try {
        const response = await fetch("https://your-backend-url/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.error) {
            alert(data.error);
            return;
        }

        // Store JWT token
        localStorage.setItem("token", data.token);

        // Redirect to games
        window.location.href = "games.html"; // change to your actual games page

    } catch (err) {
        console.error("Registration error:", err);
        alert("Something went wrong. Try again.");
    }
});
