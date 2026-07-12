document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("token");

    setTimeout(() => {
        if (!token) {
            window.location.href = "login.html";
        } else {
            window.location.href = "game/index.html";
        }
    }, 2000); // 2-second loading animation
});
