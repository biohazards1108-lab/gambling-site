function login() {
    const user = document.getElementById("user").value.trim();
    const pass = document.getElementById("pass").value.trim();
    const errorBox = document.getElementById("error");

    const correctUser = "admin";
    const correctPass = "1234";

    if (user === correctUser && pass === correctPass) {
        window.location.href = "./dashboard.html";
    } else {
        errorBox.innerText = "Invalid username or password";
    }
}
