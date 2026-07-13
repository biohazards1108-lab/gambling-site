document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("token");

    // Delay so loading screen actually shows
    setTimeout(() => {
        if (!token) {
            window.location.href = "login.html";
        } else {
            window.location.href = "game/index.html";
        }
    }, 4500); // 4.5 seconds
});
