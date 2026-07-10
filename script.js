// script.js

// ---------------------------
// GLOBAL STATE & CONSTANTS
// ---------------------------

const PLAYER_KEYS = {
  player1: "lucky13_player1",
  player2: "lucky13_player2",
};

const DEFAULT_PLAYER_DATA = {
  balance: 200,
  wins: 0,
  losses: 0,
  lastGame: "None",
};

let currentPlayerKey = PLAYER_KEYS.player1;
let currentPlayerData = null;

// Audio elements (created in JS to ensure user gesture)
let audioInitialized = false;
let bgMusic = null;
let sfxChip = null;
let sfxCard = null;
let sfxRoulette = null;
let sfxSlot = null;
let sfxDice = null;

// Roulette configuration
const ROULETTE_EU_NUMBERS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24,
  16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];

const ROULETTE_US_NUMBERS = [
  "0", "00", 1, 13, 36, 24, 3, 15, 34, 22, 5, 17, 32, 20, 7, 11, 30, 26, 9, 28,
  0, 2, 14, 35, 23, 4, 16, 33, 21, 6, 18, 31, 19, 8, 12, 29, 25, 10, 27,
];

// Color mapping for roulette (European)
const ROULETTE_COLORS = {
  0: "green",
  32: "red",
  15: "black",
  19: "red",
  4: "black",
  21: "red",
  2: "black",
  25: "red",
  17: "black",
  34: "red",
  6: "black",
  27: "red",
  13: "black",
  36: "red",
  11: "black",
  30: "red",
  8: "black",
  23: "red",
  10: "black",
  5: "red",
  24: "black",
  16: "red",
  33: "black",
  1: "red",
  20: "black",
  14: "red",
  31: "black",
  9: "red",
  22: "black",
  18: "red",
  29: "black",
  7: "red",
  28: "black",
  12: "red",
  35: "black",
  3: "red",
  26: "black",
};

// Card deck
const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

// ---------------------------
// UTILITIES
// ---------------------------

function loadPlayerData(key) {
  const raw = localStorage.getItem(key);
  if (!raw) {
    localStorage.setItem(key, JSON.stringify(DEFAULT_PLAYER_DATA));
    return { ...DEFAULT_PLAYER_DATA };
  }
  try {
    return JSON.parse(raw);
  } catch {
    localStorage.setItem(key, JSON.stringify(DEFAULT_PLAYER_DATA));
    return { ...DEFAULT_PLAYER_DATA };
  }
}

function savePlayerData(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function updatePlayerUI() {
  document.getElementById("player-balance").textContent = currentPlayerData.balance;
  document.getElementById("player-wins").textContent = currentPlayerData.wins;
  document.getElementById("player-losses").textContent = currentPlayerData.losses;
  document.getElementById("player-last-game").textContent = currentPlayerData.lastGame;
}

function adjustBalance(amountChange, gameName, didWin) {
  currentPlayerData.balance += amountChange;
  if (didWin === true) currentPlayerData.wins += 1;
  if (didWin === false) currentPlayerData.losses += 1;
  currentPlayerData.lastGame = gameName;
  savePlayerData(currentPlayerKey, currentPlayerData);
  updatePlayerUI();
}

// Create a shuffled deck
function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  // Shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function cardValueForBlackjack(card) {
  if (card.rank === "A") return 11;
  if (["K", "Q", "J"].includes(card.rank)) return 10;
  return parseInt(card.rank, 10);
}

function handValueBlackjack(hand) {
  let total = 0;
  let aces = 0;
  for (const card of hand) {
    const v = cardValueForBlackjack(card);
    total += v;
    if (card.rank === "A") aces++;
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}

// ---------------------------
// AUDIO SYSTEM
// ---------------------------

function initAudio() {
  if (audioInitialized) return;

  bgMusic = new Audio("assets/audio/casino-bg-music.mp3");
  bgMusic.loop = true;

  sfxChip = new Audio("assets/audio/chip-bet.wav");
  sfxCard = new Audio("assets/audio/card-deal.wav");
  sfxRoulette = new Audio("assets/audio/roulette-spin.wav");
  sfxSlot = new Audio("assets/audio/slot-spin.wav");
  sfxDice = new Audio("assets/audio/dice-roll.wav");

  // Start background music only after user gesture
  bgMusic.play().then(() => {
    audioInitialized = true;
    document.getElementById("audio-state-label").textContent = "Audio: On";
  }).catch(() => {
    // If autoplay fails, user can click again
  });
}

function playSfx(sound) {
  if (!audioInitialized) return;
  if (sound && sound.currentTime !== undefined) {
    sound.currentTime = 0;
    sound.play();
  }
}

// ---------------------------
// GAME SWITCHING
// ---------------------------

function showGame(gameId) {
  const tables = document.querySelectorAll(".game-table");
  tables.forEach((t) => t.classList.add("hidden"));

  switch (gameId) {
    case "blackjack":
      document.getElementById("blackjack-table").classList.remove("hidden");
      break;
    case "roulette-eu":
    case "roulette-us":
      document.getElementById("roulette-table").classList.remove("hidden");
      setupRoulette(gameId === "roulette-eu" ? "EU" : "US");
      break;
    case "craps":
      document.getElementById("craps-table").classList.remove("hidden");
      break;
    case "baccarat":
      document.getElementById("baccarat-table").classList.remove("hidden");
      break;
    case "holdem":
      document.getElementById("holdem-table").classList.remove("hidden");
      break;
    case "slots":
      document.getElementById("slots-area").classList.remove("hidden");
      break;
  }
}

// ---------------------------
// BLACKJACK IMPLEMENTATION
// ---------------------------

let blackjackDeck = [];
let blackjackPlayerHand = [];
let blackjackDealerHand = [];
let blackjackInRound = false;

function renderCard(container, card, faceDown = false) {
  const cardDiv = document.createElement("div");
  cardDiv.classList.add("card");

  const front = document.createElement("div");
  front.classList.add("card-face", "card-front");
  front.textContent = `${card.rank}${card.suit}`;

  const back = document.createElement("div");
  back.classList.add("card-face", "card-back");

  cardDiv.appendChild(front);
  cardDiv.appendChild(back);

  if (faceDown) {
    // Start as back, then flip when needed
    cardDiv.classList.add("flip");
  }

  container.appendChild(cardDiv);

  // Card flip animation (deal)
  setTimeout(() => {
    cardDiv.classList.toggle("flip");
  }, 50);
}

function updateBlackjackUI() {
  const dealerContainer = document.getElementById("dealer-cards");
  const playerContainer = document.getElementById("player-cards");
  dealerContainer.innerHTML = "";
  playerContainer.innerHTML = "";

  blackjackDealerHand.forEach((card, index) => {
    // First dealer card face down until stand
    const faceDown = index === 0 && blackjackInRound;
    renderCard(dealerContainer, card, faceDown);
  });

  blackjackPlayerHand.forEach((card) => {
    renderCard(playerContainer, card, false);
  });

  const dealerValue = blackjackInRound
    ? cardValueForBlackjack(blackjackDealerHand[1]) // show partial
    : handValueBlackjack(blackjackDealerHand);
  const playerValue = handValueBlackjack(blackjackPlayerHand);

  document.getElementById("dealer-value").textContent = dealerValue;
  document.getElementById("player-value").textContent = playerValue;
}

function startBlackjackRound() {
  const betInput = document.getElementById("blackjack-bet");
  const status = document.getElementById("blackjack-status");
  const bet = parseInt(betInput.value, 10);

  if (isNaN(bet) || bet <= 0) {
    status.textContent = "Enter a valid bet.";
    return;
  }
  if (bet > currentPlayerData.balance) {
    status.textContent = "Insufficient balance.";
    return;
  }

  playSfx(sfxChip);

  blackjackDeck = createDeck();
  blackjackPlayerHand = [];
  blackjackDealerHand = [];
  blackjackInRound = true;

  // Deal initial cards: player, dealer, player, dealer
  blackjackPlayerHand.push(blackjackDeck.pop());
  blackjackDealerHand.push(blackjackDeck.pop());
  blackjackPlayerHand.push(blackjackDeck.pop());
  blackjackDealerHand.push(blackjackDeck.pop());

  playSfx(sfxCard);

  updateBlackjackUI();

  document.getElementById("blackjack-hit").disabled = false;
  document.getElementById("blackjack-stand").disabled = false;
  status.textContent = "Round started. Hit or Stand.";
}

function blackjackHit() {
  if (!blackjackInRound) return;
  const status = document.getElementById("blackjack-status");

  blackjackPlayerHand.push(blackjackDeck.pop());
  playSfx(sfxCard);
  updateBlackjackUI();

  const playerValue = handValueBlackjack(blackjackPlayerHand);
  if (playerValue > 21) {
    // Bust
    blackjackInRound = false;
    document.getElementById("blackjack-hit").disabled = true;
    document.getElementById("blackjack-stand").disabled = true;

    const bet = parseInt(document.getElementById("blackjack-bet").value, 10);
    adjustBalance(-bet, "Blackjack", false);
    status.textContent = "Player busts. Dealer wins.";
    // Reveal dealer hand
    updateBlackjackUI();
  }
}

function blackjackStand() {
  if (!blackjackInRound) return;
  const status = document.getElementById("blackjack-status");
  const bet = parseInt(document.getElementById("blackjack-bet").value, 10);

  // Reveal dealer hand and play out dealer logic
  blackjackInRound = false;
  updateBlackjackUI();

  let dealerValue = handValueBlackjack(blackjackDealerHand);
  let playerValue = handValueBlackjack(blackjackPlayerHand);

  // Dealer hits soft 17: if dealer has 17 with an Ace counted as 11, must hit
  function isSoft17(hand) {
    let total = 0;
    let aces = 0;
    for (const card of hand) {
      const v = cardValueForBlackjack(card);
      total += v;
      if (card.rank === "A") aces++;
    }
    // Soft 17: total == 17 and at least one Ace counted as 11
    return total === 17 && aces > 0;
  }

  while (dealerValue < 17 || isSoft17(blackjackDealerHand)) {
    blackjackDealerHand.push(blackjackDeck.pop());
    playSfx(sfxCard);
    dealerValue = handValueBlackjack(blackjackDealerHand);
    updateBlackjackUI();
  }

  playerValue = handValueBlackjack(blackjackPlayerHand);
  dealerValue = handValueBlackjack(blackjackDealerHand);

  // Determine outcome
  if (dealerValue > 21) {
    // Dealer busts, player wins
    adjustBalance(bet, "Blackjack", true);
    status.textContent = "Dealer busts. Player wins.";
  } else if (playerValue > dealerValue) {
    // Check for blackjack (3:2 payout)
    const isPlayerBlackjack = blackjackPlayerHand.length === 2 && playerValue === 21;
    if (isPlayerBlackjack) {
      const payout = Math.floor(bet * 1.5);
      adjustBalance(payout, "Blackjack", true);
      status.textContent = `Blackjack! Player wins ${payout} tokens (3:2).`;
    } else {
      adjustBalance(bet, "Blackjack", true);
      status.textContent = "Player wins.";
    }
  } else if (playerValue < dealerValue) {
    adjustBalance(-bet, "Blackjack", false);
    status.textContent = "Dealer wins.";
  } else {
    status.textContent = "Push. Bet returned.";
  }

  document.getElementById("blackjack-hit").disabled = true;
  document.getElementById("blackjack-stand").disabled = true;
}

function blackjackReset() {
  blackjackDeck = [];
  blackjackPlayerHand = [];
  blackjackDealerHand = [];
  blackjackInRound = false;
  document.getElementById("dealer-cards").innerHTML = "";
  document.getElementById("player-cards").innerHTML = "";
  document.getElementById("dealer-value").textContent = "0";
  document.getElementById("player-value").textContent = "0";
  document.getElementById("blackjack-status").textContent = "New round ready.";
  document.getElementById("blackjack-hit").disabled = true;
  document.getElementById("blackjack-stand").disabled = true;
}

// ---------------------------
// ROULETTE IMPLEMENTATION
// ---------------------------

let currentRouletteVariant = "EU"; // or "US"
let rouletteSpinning = false;

function setupRoulette(variant) {
  currentRouletteVariant = variant;
  const label = document.getElementById("roulette-variant-label");
  const grid = document.getElementById("roulette-grid");
  grid.innerHTML = "";

  if (variant === "EU") {
    label.textContent = "European Roulette (Single Zero)";
    ROULETTE_EU_NUMBERS.forEach((num) => {
      const cell = document.createElement("div");
      cell.classList.add("roulette-cell");
      const color = ROULETTE_COLORS[num];
      cell.classList.add(color);
      cell.textContent = num.toString();
      grid.appendChild(cell);
    });
  } else {
    label.textContent = "American Roulette (Double Zero)";
    ROULETTE_US_NUMBERS.forEach((num) => {
      const cell = document.createElement("div");
      cell.classList.add("roulette-cell");
      let color = "green";
      if (typeof num === "number") {
        // Basic color mapping: even black, odd red (not exact wheel order, but color mapping real enough)
        color = num === 0 ? "green" : num % 2 === 0 ? "black" : "red";
      }
      cell.classList.add(color);
      cell.textContent = num.toString();
      grid.appendChild(cell);
    });
  }
}

function spinRoulette() {
  if (rouletteSpinning) return;
  const status = document.getElementById("roulette-status");
  const betNumberInput = document.getElementById("roulette-bet-number");
  const betAmountInput = document.getElementById("roulette-bet-amount");
  const betAmount = parseInt(betAmountInput.value, 10);
  const betTarget = betNumberInput.value.trim().toLowerCase();

  if (!betTarget) {
    status.textContent = "Enter a bet (number, red, black).";
    return;
  }
  if (isNaN(betAmount) || betAmount <= 0) {
    status.textContent = "Enter a valid bet amount.";
    return;
  }
  if (betAmount > currentPlayerData.balance) {
    status.textContent = "Insufficient balance.";
    return;
  }

  playSfx(sfxRoulette);

  rouletteSpinning = true;
  status.textContent = "Wheel spinning...";
  const wheel = document.getElementById("roulette-wheel");
  const ball = document.getElementById("roulette-ball");

  // Random result
  let resultNumber;
  if (currentRouletteVariant === "EU") {
    resultNumber = ROULETTE_EU_NUMBERS[Math.floor(Math.random() * ROULETTE_EU_NUMBERS.length)];
  } else {
    resultNumber = ROULETTE_US_NUMBERS[Math.floor(Math.random() * ROULETTE_US_NUMBERS.length)];
  }

  // Spin animation (CSS transform)
  const rotations = 5 + Math.random() * 3;
  wheel.style.transition = "transform 3s cubic-bezier(0.25, 0.1, 0.25, 1)";
  wheel.style.transform = `rotate(${rotations * 360}deg)`;

  // Ball animation (simple orbit)
  ball.style.transition = "transform 3s cubic-bezier(0.25, 0.1, 0.25, 1)";
  ball.style.transform = `translate(-50%, -50%) rotate(${rotations * 360}deg)`;

  setTimeout(() => {
    rouletteSpinning = false;
    wheel.style.transition = "";
    ball.style.transition = "";

    // Determine color
    let color = "green";
    if (currentRouletteVariant === "EU") {
      color = ROULETTE_COLORS[resultNumber];
    } else {
      if (typeof resultNumber === "number") {
        color = resultNumber === 0 ? "green" : resultNumber % 2 === 0 ? "black" : "red";
      } else {
        color = "green"; // 0/00
      }
    }

    // Evaluate bet
    let win = false;
    if (betTarget === "red" || betTarget === "black" || betTarget === "green") {
      if (betTarget === color) win = true;
    } else {
      // Number bet
      if (betTarget === resultNumber.toString().toLowerCase()) {
        win = true;
      }
    }

    if (win) {
      // Simple payout: 1:1 for color, 35:1 for straight number
      let payout = betAmount;
      if (betTarget === "red" || betTarget === "black" || betTarget === "green") {
        payout = betAmount; // 1:1
      } else {
        payout = betAmount * 35;
      }
      adjustBalance(payout, "Roulette", true);
      status.textContent = `Result: ${resultNumber} (${color}). You win ${payout} tokens.`;
    } else {
      adjustBalance(-betAmount, "Roulette", false);
      status.textContent = `Result: ${resultNumber} (${color}). You lose ${betAmount} tokens.`;
    }
  }, 3000);
}

// ---------------------------
// CRAPS IMPLEMENTATION (PASS LINE)
// ---------------------------

let crapsPoint = null;

function rollCraps() {
  const status = document.getElementById("craps-status");
  const betInput = document.getElementById("craps-pass-bet");
  const bet = parseInt(betInput.value, 10);

  if (isNaN(bet) || bet <= 0) {
    status.textContent = "Enter a valid Pass Line bet.";
    return;
  }
  if (bet > currentPlayerData.balance) {
    status.textContent = "Insufficient balance.";
    return;
  }

  playSfx(sfxDice);

  const die1 = Math.floor(Math.random() * 6) + 1;
  const die2 = Math.floor(Math.random() * 6) + 1;
  const total = die1 + die2;

  const die1Div = document.getElementById("die1");
  const die2Div = document.getElementById("die2");
  die1Div.textContent = die1;
  die2Div.textContent = die2;

  // Random rotation for dice physics feel
  die1Div.style.transform = `rotate(${Math.random() * 360}deg)`;
  die2Div.style.transform = `rotate(${Math.random() * 360}deg)`;

  if (crapsPoint === null) {
    // Come-out roll
    if (total === 7 || total === 11) {
      adjustBalance(bet, "Craps", true);
      status.textContent = `Come-out roll ${total}. Pass Line wins.`;
    } else if ([2, 3, 12].includes(total)) {
      adjustBalance(-bet, "Craps", false);
      status.textContent = `Come-out roll ${total}. Pass Line loses.`;
    } else {
      crapsPoint = total;
      status.textContent = `Point established: ${crapsPoint}. Roll again.`;
    }
  } else {
    // Point phase
    if (total === crapsPoint) {
      adjustBalance(bet, "Craps", true);
      status.textContent = `Rolled the point ${crapsPoint}. Pass Line wins. Point cleared.`;
      crapsPoint = null;
    } else if (total === 7) {
      adjustBalance(-bet, "Craps", false);
      status.textContent = `Rolled 7 before point. Pass Line loses. Point cleared.`;
      crapsPoint = null;
    } else {
      status.textContent = `Rolled ${total}. Point is ${crapsPoint}. Roll again.`;
    }
  }
}

// ---------------------------
// BACCARAT IMPLEMENTATION
// ---------------------------

function baccaratCardValue(card) {
  const rank = card.rank;
  if (["10", "J", "Q", "K"].includes(rank)) return 0;
  if (rank === "A") return 1;
  return parseInt(rank, 10);
}

function baccaratHandValue(hand) {
  let total = 0;
  for (const card of hand) {
    total += baccaratCardValue(card);
  }
  return total % 10;
}

function dealBaccarat() {
  const status = document.getElementById("baccarat-status");
  const betSide = document.getElementById("baccarat-bet-side").value;
  const betAmount = parseInt(document.getElementById("baccarat-bet-amount").value, 10);

  if (isNaN(betAmount) || betAmount <= 0) {
    status.textContent = "Enter a valid bet amount.";
    return;
  }
  if (betAmount > currentPlayerData.balance) {
    status.textContent = "Insufficient balance.";
    return;
  }

  playSfx(sfxCard);

  const deck = createDeck();
  const playerHand = [deck.pop(), deck.pop()];
  const bankerHand = [deck.pop(), deck.pop()];

  const playerContainer = document.getElementById("baccarat-player-cards");
  const bankerContainer = document.getElementById("baccarat-banker-cards");
  playerContainer.innerHTML = "";
  bankerContainer.innerHTML = "";

  playerHand.forEach((card) => renderCard(playerContainer, card, false));
  bankerHand.forEach((card) => renderCard(bankerContainer, card, false));

  let playerValue = baccaratHandValue(playerHand);
  let bankerValue = baccaratHandValue(bankerHand);

  document.getElementById("baccarat-player-value").textContent = playerValue;
  document.getElementById("baccarat-banker-value").textContent = bankerValue;

  // Natural
  if (playerValue >= 8 || bankerValue >= 8) {
    // No third card
  } else {
    // Player third card rule
    let playerThird = null;
    if (playerValue <= 5) {
      playerThird = deck.pop();
      playerHand.push(playerThird);
      renderCard(playerContainer, playerThird, false);
      playerValue = baccaratHandValue(playerHand);
      document.getElementById("baccarat-player-value").textContent = playerValue;
    }

    // Banker third card rule (complex)
    let bankerThird = null;
    const bankerInitial = bankerValue;
    const playerThirdValue = playerThird ? baccaratCardValue(playerThird) : null;

    if (!playerThird) {
      // Player stood
      if (bankerInitial <= 5) {
        bankerThird = deck.pop();
      }
    } else {
      // Banker rules based on bankerInitial and playerThirdValue
      if (bankerInitial <= 2) {
        bankerThird = deck.pop();
      } else if (bankerInitial === 3 && playerThirdValue !== 8) {
        bankerThird = deck.pop();
      } else if (bankerInitial === 4 && playerThirdValue >= 2 && playerThirdValue <= 7) {
        bankerThird = deck.pop();
      } else if (bankerInitial === 5 && playerThirdValue >= 4 && playerThirdValue <= 7) {
        bankerThird = deck.pop();
      } else if (bankerInitial === 6 && playerThirdValue >= 6 && playerThirdValue <= 7) {
        bankerThird = deck.pop();
      }
    }

    if (bankerThird) {
      bankerHand.push(bankerThird);
      renderCard(bankerContainer, bankerThird, false);
    }

    bankerValue = baccaratHandValue(bankerHand);
    document.getElementById("baccarat-banker-value").textContent = bankerValue;
  }

  // Determine winner
  let winner = "tie";
  if (playerValue > bankerValue) winner = "player";
  else if (bankerValue > playerValue) winner = "banker";

  if (winner === betSide) {
    let payout = betAmount;
    if (betSide === "banker") {
      // Banker usually pays 0.95:1 (commission), but we can keep 1:1 for simplicity or mention commission
      payout = Math.floor(betAmount * 0.95);
    } else if (betSide === "tie") {
      payout = betAmount * 8;
    }
    adjustBalance(payout, "Baccarat", true);
    status.textContent = `Player: ${playerValue}, Banker: ${bankerValue}. You win ${payout} tokens.`;
  } else {
    adjustBalance(-betAmount, "Baccarat", false);
    status.textContent = `Player: ${playerValue}, Banker: ${bankerValue}. You lose ${betAmount} tokens.`;
  }
}

// ---------------------------
// TEXAS HOLD’EM IMPLEMENTATION (HEADS-UP)
// ---------------------------

let holdemStage = "idle"; // idle, preflop, flop, turn, river, showdown
let holdemDeck = [];
let holdemPlayerHand = [];
let holdemDealerHand = [];
let holdemBoard = [];
let holdemBetAmount = 0;

function dealHoldem() {
  const status = document.getElementById("holdem-status");
  const betInput = document.getElementById("holdem-bet");
  const bet = parseInt(betInput.value, 10);

  if (isNaN(bet) || bet <= 0) {
    status.textContent = "Enter a valid bet.";
    return;
  }
  if (bet > currentPlayerData.balance) {
    status.textContent = "Insufficient balance.";
    return;
  }

  playSfx(sfxCard);

  holdemDeck = createDeck();
  holdemPlayerHand = [holdemDeck.pop(), holdemDeck.pop()];
  holdemDealerHand = [holdemDeck.pop(), holdemDeck.pop()];
  holdemBoard = [];
  holdemBetAmount = bet;
  holdemStage = "preflop";

  renderHoldemHands();
  status.textContent = "Preflop dealt. Click Next Stage for Flop.";
  document.getElementById("holdem-next-stage").disabled = false;
}

function renderHoldemHands() {
  const playerContainer = document.getElementById("holdem-player-cards");
  const dealerContainer = document.getElementById("holdem-dealer-cards");
  const boardContainer = document.getElementById("holdem-board-cards");

  playerContainer.innerHTML = "";
  dealerContainer.innerHTML = "";
  boardContainer.innerHTML = "";

  holdemPlayerHand.forEach((card) => renderCard(playerContainer, card, false));
  holdemDealerHand.forEach((card) => renderCard(dealerContainer, card, false));
  holdemBoard.forEach((card) => renderCard(boardContainer, card, false));
}

function nextHoldemStage() {
  const status = document.getElementById("holdem-status");

  if (holdemStage === "preflop") {
    // Flop
    holdemBoard.push(holdemDeck.pop(), holdemDeck.pop(), holdemDeck.pop());
    holdemStage = "flop";
    renderHoldemHands();
    status.textContent = "Flop revealed. Click Next Stage for Turn.";
  } else if (holdemStage === "flop") {
    // Turn
    holdemBoard.push(holdemDeck.pop());
    holdemStage = "turn";
    renderHoldemHands();
    status.textContent = "Turn revealed. Click Next Stage for River.";
  } else if (holdemStage === "turn") {
    // River
    holdemBoard.push(holdemDeck.pop());
    holdemStage = "river";
    renderHoldemHands();
    status.textContent = "River revealed. Click Next Stage for Showdown.";
  } else if (holdemStage === "river") {
    // Showdown
    holdemStage = "showdown";
    renderHoldemHands();
    const playerRank = evaluateHoldemHand(holdemPlayerHand, holdemBoard);
    const dealerRank = evaluateHoldemHand(holdemDealerHand, holdemBoard);

    if (playerRank.score > dealerRank.score) {
      adjustBalance(holdemBetAmount, "Texas Hold’em", true);
      status.textContent = `Player wins with ${playerRank.name}. Dealer has ${dealerRank.name}.`;
    } else if (dealerRank.score > playerRank.score) {
      adjustBalance(-holdemBetAmount, "Texas Hold’em", false);
      status.textContent = `Dealer wins with ${dealerRank.name}. Player has ${playerRank.name}.`;
    } else {
      status.textContent = `Tie: both have ${playerRank.name}. Bet returned.`;
    }

    document.getElementById("holdem-next-stage").disabled = true;
  }
}

// Simple hand ranking system (full ranking, but not fully optimized)
// Score hierarchy: Royal Flush > Straight Flush > Four of a Kind > Full House > Flush > Straight > Three of a Kind > Two Pair > One Pair > High Card
function evaluateHoldemHand(hand, board) {
  const cards = hand.concat(board);
  // For brevity, we’ll implement a basic ranking that distinguishes major categories.
  // You can expand this with full combinatorial evaluation.

  // Convert ranks to numeric values
  const rankMap = {
    A: 14,
    K: 13,
    Q: 12,
    J: 11,
    "10": 10,
    "9": 9,
    "8": 8,
    "7": 7,
    "6": 6,
    "5": 5,
    "4": 4,
    "3": 3,
    "2": 2,
  };

  const values = cards.map((c) => rankMap[c.rank]).sort((a, b) => b - a);
  const suits = cards.map((c) => c.suit);

  function isFlush() {
    const suitCounts = {};
    for (const s of suits) {
      suitCounts[s] = (suitCounts[s] || 0) + 1;
      if (suitCounts[s] >= 5) return true;
    }
    return false;
  }

  function isStraight(vals) {
    const unique = [...new Set(vals)].sort((a, b) => b - a);
    let streak = 1;
    for (let i = 0; i < unique.length - 1; i++) {
      if (unique[i] === unique[i + 1] + 1) {
        streak++;
        if (streak >= 5) return true;
      } else {
        streak = 1;
      }
    }
    // Wheel straight (A-2-3-4-5)
    if (unique.includes(14) && unique.includes(5) && unique.includes(4) && unique.includes(3) && unique.includes(2)) {
      return true;
    }
    return false;
  }

  function countRanks(vals) {
    const counts = {};
    for (const v of vals) {
      counts[v] = (counts[v] || 0) + 1;
    }
    return counts;
  }

  const flush = isFlush();
  const straight = isStraight(values);
  const counts = countRanks(values);

  const countValues = Object.values(counts).sort((a, b) => b - a);
  const maxCount = countValues[0];

  let name = "High Card";
  let score = 1;

  if (flush && straight) {
    // Check for royal
    if (values.includes(14) && values.includes(13) && values.includes(12) && values.includes(11) && values.includes(10)) {
      name = "Royal Flush";
      score = 10;
    } else {
      name = "Straight Flush";
      score = 9;
    }
  } else if (maxCount === 4) {
    name = "Four of a Kind";
    score = 8;
  } else if (maxCount === 3 && countValues.includes(2)) {
    name = "Full House";
    score = 7;
  } else if (flush) {
    name = "Flush";
    score = 6;
  } else if (straight) {
    name = "Straight";
    score = 5;
  } else if (maxCount === 3) {
    name = "Three of a Kind";
    score = 4;
  } else if (countValues.filter((c) => c === 2).length >= 2) {
    name = "Two Pair";
    score = 3;
  } else if (maxCount === 2) {
    name = "One Pair";
    score = 2;
  }

  return { name, score };
}

// ---------------------------
// SLOTS IMPLEMENTATION
// ---------------------------

const SLOT_SYMBOLS = [
  "assets/images/slot-cherry.png",
  "assets/images/slot-bar.png",
  "assets/images/slot-seven.png",
  "assets/images/slot-bell.png",
  "assets/images/slot-diamond.png",
];

function spinSlot(slotType) {
  const statusId = slotType === 3 ? "slot-status-3" : "slot-status-5";
  const status = document.getElementById(statusId);
  const betInputId = slotType === 3 ? "slot-bet-3" : "slot-bet-5";
  const betInput = document.getElementById(betInputId);
  const bet = parseInt(betInput.value, 10);

  if (isNaN(bet) || bet <= 0) {
    status.textContent = "Enter a valid bet.";
    return;
  }
  if (bet > currentPlayerData.balance) {
    status.textContent = "Insufficient balance.";
    return;
  }

  playSfx(sfxSlot);

  const reelsId = slotType === 3 ? "slot-reels-3" : "slot-reels-5";
  const reelsContainer = document.getElementById(reelsId);
  const reels = Array.from(reelsContainer.querySelectorAll(".slot-reel"));

  // Clear previous symbols
  reels.forEach((reel) => {
    reel.innerHTML = "";
    reel.style.transition = "transform 1s ease-out";
    reel.style.transform = "translateY(100%)";
  });

  setTimeout(() => {
    reels.forEach((reel) => {
      reel.style.transition = "";
      reel.style.transform = "translateY(0)";
      const symbol = document.createElement("div");
      symbol.classList.add("slot-symbol");
      const img = SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];
      symbol.style.backgroundImage = `url("${img}")`;
      reel.appendChild(symbol);
    });

    // Simple win: all reels same symbol
    const symbols = reels.map((reel) => reel.querySelector(".slot-symbol").style.backgroundImage);
    const allSame = symbols.every((s) => s === symbols[0]);

    if (allSame) {
      const payout = bet * (slotType === 3 ? 10 : 20);
      adjustBalance(payout, "Slots", true);
      status.textContent = `Jackpot! All symbols match. You win ${payout} tokens.`;
      // Win line highlight
      const winLine = document.createElement("div");
      winLine.classList.add("slot-win-line");
      reelsContainer.appendChild(winLine);
      setTimeout(() => {
        winLine.remove();
      }, 1000);
    } else {
      adjustBalance(-bet, "Slots", false);
      status.textContent = `No win. You lose ${bet} tokens.`;
    }
  }, 1000);
}

// ---------------------------
// INIT
// ---------------------------

document.addEventListener("DOMContentLoaded", () => {
  // Load initial player
  currentPlayerData = loadPlayerData(currentPlayerKey);
  updatePlayerUI();

  // Player selector
  document.getElementById("player-select").addEventListener("change", (e) => {
    currentPlayerKey = PLAYER_KEYS[e.target.value];
    currentPlayerData = loadPlayerData(currentPlayerKey);
    updatePlayerUI();
  });

  // Audio init button (must be user gesture)
  document.getElementById("audio-init-btn").addEventListener("click", () => {
    initAudio();
  });

  // Game menu buttons
  document.querySelectorAll(".game-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const game = btn.getAttribute("data-game");
      showGame(game);
    });
  });

  // Blackjack events
  document.getElementById("blackjack-deal").addEventListener("click", startBlackjackRound);
  document.getElementById("blackjack-hit").addEventListener("click", blackjackHit);
  document.getElementById("blackjack-stand").addEventListener("click", blackjackStand);
  document.getElementById("blackjack-reset").addEventListener("click", blackjackReset);

  // Roulette events
  document.getElementById("roulette-spin").addEventListener("click", spinRoulette);

  // Craps events
  document.getElementById("craps-roll").addEventListener("click", rollCraps);

  // Baccarat events
  document.getElementById("baccarat-deal").addEventListener("click", dealBaccarat);

  // Hold’em events
  document.getElementById("holdem-deal").addEventListener("click", dealHoldem);
  document.getElementById("holdem-next-stage").addEventListener("click", nextHoldemStage);

  // Slots events
  document.querySelectorAll(".slot-spin-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const type = parseInt(btn.getAttribute("data-slot"), 10);
      spinSlot(type);
    });
  });

  // Default game
  showGame("blackjack");
});
