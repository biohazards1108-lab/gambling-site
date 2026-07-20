async function checkSession() {
    try {
        const response = await fetch("https://gambling-site-production.up.railway.app/session", {
            method: "GET",
            credentials: "include"
        });

        if (!response.ok) {
            window.location.href = "login.html";
            return;
        }

        const data = await response.json();

        if (data.valid === true) {
            // User is logged in
            console.log("Session OK");
        } else {
            window.location.href = "login.html";
        }

    } catch (err) {
        console.error("Session check failed:", err);
        window.location.href = "login.html";
    }
}

checkSession();
