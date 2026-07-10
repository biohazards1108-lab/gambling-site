// ===== AUDIO =====
const bgMusic = document.getElementById("bgMusic");
const chipSound = document.getElementById("chipSound");
const cardSound = document.getElementById("cardSound");
const spinSound = document.getElementById("spinSound");
const startAudioBtn = document.getElementById("startAudioBtn");

let audioInitialized = false;

startAudioBtn.addEventListener("click", () => {
  if (!audioInitialized) {
    bgMusic.volume = 0.4;
    bgMusic.play().catch(() => {});
    audioInitialized = true;
    startAudioBtn.textContent = "Casino Active";
    startAudioBtn.disabled = true;
  }
});

function playChip() {
  if (!audioInitialized || !chipSound) return;
  chipSound.currentTime = 0;
  chipSound.play().catch(() => {});
}

function playCard() {
  if (!audioInitialized || !cardSound) return;
  cardSound.currentTime = 0;
  cardSound.play().catch(() => {});
}

function playSpin() {
  if (!audioInitialized || !spinSound) return;
  spinSound.currentTime = 0;
  spinSound.play().catch(() => {});
}

// ===== PLAYER WALLETS =====
const BALANCE_PREFIX = "highRollerBalance_";
let currentPlayer = "player1";

const balanceEl = document.getElementById("balance");
const playerSelectEl = document.getElementById("playerSelect");

function getBalanceKey() {
  return BALANCE_PREFIX + currentPlayer;
}

function getBalance() {
  const key = getBalanceKey();
  const stored = localStorage.getItem(key);
  if (stored === null) {
    localStorage.setItem(key, "200");
    return 200;
  }
  return parseInt(stored, 10);
}

function setBalance(value) {
  const key = getBalanceKey();
  localStorage.setItem(key, String(value));
  balanceEl.textContent = value;
}

function changeBalance(delta) {
  const newBal = getBalance() + delta;
  setBalance(Math.max(newBal, 0));
  if (delta !== 0) playChip();
}

// init
setBalance(getBalance());

document.getElementById("resetBalanceBtn").onclick = () => {
  setBalance(200);
};

playerSelectEl.addEventListener("change", () => {
  currentPlayer = playerSelectEl.value;
  setBalance(getBalance());
});

// ===== GAME REGISTRY =====
const gameTitleEl = document.getElementById("gameTitle");
const gameContainerEl = document.getElementById("gameContainer");
const gameLogEl = document.getElementById("gameLog");
const gameInfoEl = document.getElementById("gameInfo");

const games = {};

function clearGameArea() {
  gameContainerEl.innerHTML = "";
  gameLogEl.textContent = "";
  gameInfoEl.textContent = "";
}

function makeButton(label, onClick) {
  const btn = document.createElement("button");
  btn.textContent = label;
  btn.onclick = onClick;
  return btn;
}

// ===== CARD UTILITIES =====
const suits = ["♠", "♥", "♦", "♣"];
const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

function createDeck() {
  const deck = [];
  for (const s of suits) {
    for (const r of ranks) {
      deck.push({ rank: r, suit: s });
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function cardValueBlackjack(card) {
  if (card.rank === "A") return 11;
  if (["J", "Q", "K"].includes(card.rank)) return 10;
  return parseInt(card.rank, 10);
}

function handValueBlackjack(hand) {
  let total = 0;
  let aces = 0;
  for (const c of hand) {
    total += cardValueBlackjack(c);
    if (c.rank === "A") aces++;
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}

function renderHand(hand, container) {
  container.innerHTML = "";
  hand.forEach(card => {
    const div = document.createElement("div");
    div.className = "card-face";
    div.textContent = `${card.rank}${card.suit}`;
    container.appendChild(div);
  });
}

// ===== BLACKJACK (real flow) =====
games.blackjack = {
  name: "Blackjack",
  info: "Standard casino blackjack: dealer hits until 17 (including soft 17). Bet 20 tokens.",
  init() {
    clearGameArea();
    gameTitleEl.textContent = this.name;

    const table = document.createElement("div");
    table.className = "table-surface";
    gameContainerEl.appendChild(table);

    const controls = document.createElement("div");
    controls.className = "game-controls";

    const dealBtn = makeButton("Deal (20)", startHand);
    const hitBtn = makeButton("Hit", hit);
    const standBtn = makeButton("Stand", stand);

    hitBtn.disabled = true;
    standBtn.disabled = true;

    controls.appendChild(dealBtn);
    controls.appendChild(hitBtn);
    controls.appendChild(standBtn);
    table.appendChild(controls);

    const playerRow = document.createElement("div");
    playerRow.className = "cards-row";
    const dealerRow = document.createElement("div");
    dealerRow.className = "cards-row";

    table.appendChild(document.createTextNode("Player:"));
    table.appendChild(playerRow);
    table.appendChild(document.createTextNode("Dealer:"));
    table.appendChild(dealerRow);

    gameInfoEl.textContent = this.info;

    let deck = [];
    let playerHand = [];
    let dealerHand = [];
    let inProgress = false;
    let bet = 20;

    function startHand() {
      if (getBalance() < bet) {
        gameLogEl.textContent = "Not enough tokens to place bet.";
        return;
      }
      changeBalance(-bet);
      playChip();

      deck = createDeck();
      playerHand = [deck.pop(), deck.pop()];
      dealerHand = [deck.pop(), deck.pop()];
      inProgress = true;

      renderHand(playerHand, playerRow);
      renderHand([dealerHand[0]], dealerRow); // show one dealer card

      playCard();
      playCard();

      hitBtn.disabled = false;
      standBtn.disabled = false;

      const pVal = handValueBlackjack(playerHand);
      gameLogEl.textContent = `Your total: ${pVal}. Dealer shows: ${cardValueBlackjack(dealerHand[0])}.`;

      if (pVal === 21) {
        endHand("blackjack");
      }
    }

    function hit() {
      if (!inProgress) return;
      playerHand.push(deck.pop());
      renderHand(playerHand, playerRow);
      playCard();

      const pVal = handValueBlackjack(playerHand);
      if (pVal > 21) {
        endHand("player_bust");
      } else {
        gameLogEl.textContent = `Your total: ${pVal}.`;
      }
    }

    function stand() {
      if (!inProgress) return;

      // Reveal dealer hand and play out dealer according to rules
      renderHand(dealerHand, dealerRow);

      let dVal = handValueBlackjack(dealerHand);
      while (dVal < 17) {
        dealerHand.push(deck.pop());
        renderHand(dealerHand, dealerRow);
        playCard();
        dVal = handValueBlackjack(dealerHand);
      }

      const pVal = handValueBlackjack(playerHand);

      if (dVal > 21) {
        endHand("dealer_bust");
      } else if (pVal > dVal) {
        endHand("player_win");
      } else if (pVal < dVal) {
        endHand("dealer_win");
      } else {
        endHand("push");
      }
    }

    function endHand(result) {
      inProgress = false;
      hitBtn.disabled = true;
      standBtn.disabled = true;

      let msg = "";
      let payout = 0;

      const pVal = handValueBlackjack(playerHand);
      const dVal = handValueBlackjack(dealerHand);

      switch (result) {
        case "blackjack":
          payout = Math.round(bet * 2.5); // 3:2 payout
          msg = `BLACKJACK! You win +${payout} tokens.`;
          break;
        case "player_bust":
          msg = `You bust with ${pVal}. Dealer wins.`;
          break;
        case "dealer_bust":
          payout = bet * 2;
          msg = `Dealer busts with ${dVal}. You win +${payout} tokens.`;
          break;
        case "player_win":
          payout = bet * 2;
          msg = `You win with ${pVal} vs dealer ${dVal}. +${payout} tokens.`;
          break;
        case "dealer_win":
          msg = `Dealer wins with ${dVal} vs your ${pVal}.`;
          break;
        case "push":
          payout = bet;
          msg = `Push: ${pVal} vs ${dVal}. Bet returned.`;
          break;
      }

      if (payout > 0) changeBalance(payout);
      gameLogEl.textContent = msg;
    }
  }
};

// ===== 21 (simple variant, still real target 21) =====
games.twentyone = {
  name: "21",
  info: "Target 21: you draw until you stand, dealer draws once. Bet 10 tokens.",
  init() {
    clearGameArea();
    gameTitleEl.textContent = this.name;

    const table = document.createElement("div");
    table.className = "table-surface";
    gameContainerEl.appendChild(table);

    const controls = document.createElement("div");
    controls.className = "game-controls";

    const dealBtn = makeButton("Deal (10)", startHand);
    const hitBtn = makeButton("Hit", hit);
    const standBtn = makeButton("Stand", stand);

    hitBtn.disabled = true;
    standBtn.disabled = true;

    controls.appendChild(dealBtn);
    controls.appendChild(hitBtn);
    controls.appendChild(standBtn);
    table.appendChild(controls);

    const playerRow = document.createElement("div");
    playerRow.className = "cards-row";
    const dealerRow = document.createElement("div");
    dealerRow.className = "cards-row";

    table.appendChild(document.createTextNode("Player:"));
    table.appendChild(playerRow);
    table.appendChild(document.createTextNode("Dealer:"));
    table.appendChild(dealerRow);

    gameInfoEl.textContent = this.info;

    let deck = [];
    let playerHand = [];
    let dealerHand = [];
    let inProgress = false;
    const bet = 10;

    function startHand() {
      if (getBalance() < bet) {
        gameLogEl.textContent = "Not enough tokens.";
        return;
      }
      changeBalance(-bet);
      playChip();

      deck = createDeck();
      playerHand = [deck.pop(), deck.pop()];
      dealerHand = [deck.pop()];
      inProgress = true;

      renderHand(playerHand, playerRow);
      renderHand(dealerHand, dealerRow);
      playCard();
      playCard();

      hitBtn.disabled = false;
      standBtn.disabled = false;

      const pVal = handValueBlackjack(playerHand);
      const dVal = handValueBlackjack(dealerHand);
      gameLogEl.textContent = `You: ${pVal} | Dealer: ${dVal}`;
    }

    function hit() {
      if (!inProgress) return;
      playerHand.push(deck.pop());
      renderHand(playerHand, playerRow);
      playCard();

      const pVal = handValueBlackjack(playerHand);
      const dVal = handValueBlackjack(dealerHand);
      gameLogEl.textContent = `You: ${pVal} | Dealer: ${dVal}`;

      if (pVal > 21) {
        endHand("player_bust");
      }
    }

    function stand() {
      if (!inProgress) return;
      dealerHand.push(deck.pop());
      renderHand(dealerHand, dealerRow);
      playCard();

      const pVal = handValueBlackjack(playerHand);
      const dVal = handValueBlackjack(dealerHand);

      if (pVal > 21) {
        endHand("player_bust");
      } else if (dVal > 21 || pVal > dVal) {
        endHand("player_win");
      } else if (pVal < dVal) {
        endHand("dealer_win");
      } else {
        endHand("push");
      }
    }

    function endHand(result) {
      inProgress = false;
      hitBtn.disabled = true;
      standBtn.disabled = true;

      let msg = "";
      let payout = 0;

      switch (result) {
        case "player_bust":
          msg = "You bust. Dealer wins.";
          break;
        case "player_win":
          payout = bet * 2;
          msg = `You win +${payout} tokens.`;
          break;
        case "dealer_win":
          msg = "Dealer wins.";
          break;
        case "push":
          payout = bet;
          msg = "Push. Bet returned.";
          break;
      }

      if (payout > 0) changeBalance(payout);

      const pVal = handValueBlackjack(playerHand);
      const dVal = handValueBlackjack(dealerHand);
      gameLogEl.textContent = `${msg} Final: You ${pVal} vs Dealer ${dVal}.`;
    }
  }
};

// ===== TEXAS HOLD'EM (heads-up, simplified scoring but real dealing) =====
// (same as before, just keep your version; scoring is still simplified)

// ... keep your Texas Hold'em, slots, video poker, keno, dice duel, coin flip, wheel code as before ...

// ===== ROULETTE (EU / US) with wheel animation =====
function makeRouletteGame(id, name, zeroCount) {
  games[id] = {
    name,
    info: `${name}. Bet 10 tokens on Red or Black. Wheel has ${zeroCount} zero pocket(s).`,
    init() {
      clearGameArea();
      gameTitleEl.textContent = name;

      const table = document.createElement("div");
      table.className = "table-surface";
      gameContainerEl.appendChild(table);

      const controls = document.createElement("div");
      controls.className = "game-controls";

      const redBtn = makeButton("Bet Red (10)", () => spin("red"));
      const blackBtn = makeButton("Bet Black (10)", () => spin("black"));

      controls.appendChild(redBtn);
      controls.appendChild(blackBtn);
      table.appendChild(controls);

      const wheel = document.createElement("div");
      wheel.className = "wheel-graphic";
      const pointer = document.createElement("div");
      pointer.className = "wheel-pointer";
      wheel.appendChild(pointer);
      table.appendChild(wheel);

      const layout = document.createElement("div");
      layout.className = "roulette-layout";
      layout.textContent = "Result will show color and number.";
      table.appendChild(layout);

      gameInfoEl.textContent = this.info;

      function spin(choice) {
        const bet = 10;
        if (getBalance() < bet) {
          gameLogEl.textContent = "Not enough tokens.";
          return;
        }
        changeBalance(-bet);
        playChip();
        playSpin();

        wheel.classList.remove("spin-anim");
        void wheel.offsetWidth;
        wheel.classList.add("spin-anim");

        const numbers = [];
        const colors = [];
        const totalSlots = 36 + zeroCount;
        for (let i = 0; i < totalSlots; i++) {
          if (i < 36) {
            numbers.push(i + 1);
            colors.push(i % 2 === 0 ? "red" : "black");
          } else {
            numbers.push(0);
            colors.push("green");
          }
        }

        const idx = Math.floor(Math.random() * totalSlots);
        const num = numbers[idx];
        const col = colors[idx];

        let log = `Ball lands on ${num} (${col}). `;
        if (col === choice) {
          const payout = 20;
          changeBalance(payout);
          log += `You win +${payout} tokens.`;
        } else {
          log += "You lose.";
        }
        gameLogEl.textContent = log;
      }
    }
  };
}

makeRouletteGame("rouletteEU", "European Roulette", 1);
makeRouletteGame("rouletteUS", "American Roulette", 2);

// ===== BACCARAT, CRAPS, SLOTS, etc. =====
// keep the logic from the previous version (they already follow real flow, just tokens)

// ===== NAV BAR WIRING =====
document.querySelectorAll(".nav-bar button").forEach(btn => {
  btn.addEventListener("click", () => {
    const gameId = btn.getAttribute("data-game");
    const game = games[gameId];
    if (!game) {
      gameTitleEl.textContent = "Unknown game";
      gameContainerEl.innerHTML = "";
      gameLogEl.textContent = "Game not implemented.";
      gameInfoEl.textContent = "";
      return;
    }
    game.init();
  });
});
