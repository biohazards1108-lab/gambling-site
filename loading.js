document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("token");

    // Delay so loading screen actually shows
    setTimeout(() => {
        if (!token) {
            window.location.href = "game/index.html";
        } else {
            window.location.href = "/index.htm;l";
        }
    }, 4500); // 4.5 seconds
});
