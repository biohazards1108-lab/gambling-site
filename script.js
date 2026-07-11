// ------------------------------
// BASIC PLAYER STATE
// ------------------------------
let balance = 1000; // starting balance, change if needed

function updateBalanceDisplay() {
  const balanceEl = document.getElementById("balance");
  if (balanceEl) {
    balanceEl.textContent = `$${balance}`;
  }
}

// ------------------------------
// BACKEND CONNECTION
// ------------------------------
async function placeBet(amount) {
  try {
    const response = await fetch("https://gambling-site-production.up.railway.app/api/bet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount })
    });

    const data = await response.json();
    console.log("Backend result:", data);
    return data;

  } catch (err) {
    console.error("Backend error:", err);
    alert("Error contacting backend.");
    return null;
  }
}

// ------------------------------
// HANDLE BET BUTTON CLICK
// ------------------------------
async function handleBet() {
  const amountInput = document.getElementById("bet-amount");
  const amount = Number(amountInput.value);

  if (!amount || amount <= 0) {
    alert("Enter a valid bet amount.");
    return;
  }

  if (amount > balance) {
    alert("You cannot bet more than your balance.");
    return;
  }

  const result = await placeBet(amount);

  if (!result) {
    alert("Backend error — try again.");
    return;
  }

  if (result.result === "win") {
    balance += result.payout;
    alert(`You won! Payout: $${result.payout}`);
  } else {
    balance -= amount;
    alert(`You lost $${amount}`);
  }

  updateBalanceDisplay();
}

// ------------------------------
// INITIALIZE BUTTON LISTENER
// ------------------------------
document.addEventListener("DOMContentLoaded", () => {
  updateBalanceDisplay();

  const betButton = document.getElementById("bet-button");
  if (betButton) {
    betButton.addEventListener("click", handleBet);
  }
});
