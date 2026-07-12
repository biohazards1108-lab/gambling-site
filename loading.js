// FIXED LOADING LOGIC

const token = localStorage.getItem("token");

// If no token → user is not logged in → send to login
if (!token) {
    window.location.href = "login.html";
} else {
    // Token exists → send to games
    window.location.href = "game/index.html"; // or your actual games page
}
