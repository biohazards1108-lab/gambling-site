document.addEventListener("DOMContentLoaded", () => {
  const chipContainer = document.getElementById("chip-container");
  const enterBtn = document.getElementById("enter-btn");

  const CHIP_COUNT = 24;
  for (let i = 0; i < CHIP_COUNT; i++) {
    const chip = document.createElement("div");
    chip.classList.add("chip");
    chip.style.left = Math.random() * 100 + "vw";
    chip.style.animationDelay = Math.random() * 3 + "s";
    chipContainer.appendChild(chip);
  }

  setTimeout(() => {
    enterBtn.classList.remove("hidden");
    enterBtn.classList.add("show");
  }, 3000);

  enterBtn.addEventListener("click", () => {
    window.location.href = "index.html";
  });
});
