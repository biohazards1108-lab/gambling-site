// loading.js

document.addEventListener("DOMContentLoaded", () => {
  const chipContainer = document.getElementById("chip-container");
  const enterBtn = document.getElementById("enter-btn");

  // Create falling chips
  const CHIP_COUNT = 20;
  for (let i = 0; i < CHIP_COUNT; i++) {
    const chip = document.createElement("div");
    chip.classList.add("chip");
    chip.style.left = Math.random() * 100 + "vw";
    chip.style.animationDelay = Math.random() * 3 + "s";
    chipContainer.appendChild(chip);
  }

  // Show button after 3 seconds
  setTimeout(() => {
    enterBtn.classList.remove("hidden");
    enterBtn.classList.add("show");
  }, 3000);

  // On click, go to main casino (index.html) and start audio there
  enterBtn.addEventListener("click", () => {
    // We rely on index.html to start audio on first user interaction
    window.location.href = "index.html";
  });
});
