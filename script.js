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

// ===== BLACKJACK =====
games.blackjack = {
  name: "Blackjack",
  info: "Standard blackjack: bet 20 tokens, dealer hits until 17+. Closest to 21 without busting wins.",
  init() {
    clearGameArea();
    gameTitleEl.textContent = this.name;

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
    gameContainerEl.appendChild(controls);

    const playerRow = document.createElement("div");
    playerRow.className = "cards-row";
    const dealerRow = document.createElement("div");
    dealerRow.className = "cards-row";

    gameContainerEl.appendChild(document.createTextNode("Your hand:"));
    gameContainerEl.appendChild(playerRow);
    gameContainerEl.appendChild(document.createTextNode("Dealer hand:"));
    gameContainerEl.appendChild(dealerRow);

    gameInfoEl.textContent = this.info;

    let deck = [];
    let playerHand = [];
    let dealerHand = [];
    let inProgress = false;

    function startHand() {
      const bet = 20;
      if (getBalance() < bet) {
        gameLogEl.textContent = "Not enough tokens to play a hand.";
        return;
      }
      changeBalance(-bet);

      deck = createDeck();
      playerHand = [deck.pop(), deck.pop()];
      dealerHand = [deck.pop(), deck.pop()];
      inProgress = true;

      renderHand(playerHand, playerRow);
      renderHand(dealerHand, dealerRow);

      hitBtn.disabled = false;
      standBtn.disabled = false;

      const pVal = handValueBlackjack(playerHand);
      const dVal = handValueBlackjack(dealerHand);
      gameLogEl.textContent = `You: ${pVal} | Dealer: ${dVal} (dealer would normally hide one card).`;

      if (pVal === 21) {
        endHand("blackjack");
      }
    }

    function hit() {
      if (!inProgress) return;
      playerHand.push(deck.pop());
      renderHand(playerHand, playerRow);

      const pVal = handValueBlackjack(playerHand);
      const dVal = handValueBlackjack(dealerHand);
      gameLogEl.textContent = `You: ${pVal} | Dealer: ${dVal}`;

      if (pVal > 21) {
        endHand("player_bust");
      }
    }

    function stand() {
      if (!inProgress) return;
      while (handValueBlackjack(dealerHand) < 17) {
        dealerHand.push(deck.pop());
      }
      renderHand(dealerHand, dealerRow);

      const pVal = handValueBlackjack(playerHand);
      const dVal = handValueBlackjack(dealerHand);

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

      switch (result) {
        case "blackjack":
          payout = 40;
          msg = `BLACKJACK! You win +${payout} tokens.`;
          break;
        case "player_bust":
          msg = "You busted. Dealer wins.";
          break;
        case "dealer_bust":
          payout = 40;
          msg = `Dealer busts. You win +${payout} tokens.`;
          break;
        case "player_win":
          payout = 40;
          msg = `You beat the dealer! +${payout} tokens.`;
          break;
        case "dealer_win":
          msg = "Dealer wins this hand.";
          break;
        case "push":
          payout = 20;
          msg = "Push. Your bet is returned.";
          break;
      }

      if (payout > 0) changeBalance(payout);

      const pVal = handValueBlackjack(playerHand);
      const dVal = handValueBlackjack(dealerHand);
      gameLogEl.textContent = `${msg} Final: You ${pVal} vs Dealer ${dVal}.`;
    }
  }
};

// ===== 21 (variant) =====
games.twentyone = {
  name: "21",
  info: "Simple 21: you draw until you stand, dealer draws once. Closest to 21 wins. Bet 10 tokens.",
  init() {
    clearGameArea();
    gameTitleEl.textContent = this.name;

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
    gameContainerEl.appendChild(controls);

    const playerRow = document.createElement("div");
    playerRow.className = "cards-row";
    const dealerRow = document.createElement("div");
    dealerRow.className = "cards-row";

    gameContainerEl.appendChild(document.createTextNode("Your hand:"));
    gameContainerEl.appendChild(playerRow);
    gameContainerEl.appendChild(document.createTextNode("Dealer hand:"));
    gameContainerEl.appendChild(dealerRow);

    gameInfoEl.textContent = this.info;

    let deck = [];
    let playerHand = [];
    let dealerHand = [];
    let inProgress = false;

    function startHand() {
      const bet = 10;
      if (getBalance() < bet) {
        gameLogEl.textContent = "Not enough tokens.";
        return;
      }
      changeBalance(-bet);

      deck = createDeck();
      playerHand = [deck.pop(), deck.pop()];
      dealerHand = [deck.pop()];
      inProgress = true;

      renderHand(playerHand, playerRow);
      renderHand(dealerHand, dealerRow);

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
          payout = 20;
          msg = `You win +${payout} tokens.`;
          break;
        case "dealer_win":
          msg = "Dealer wins.";
          break;
        case "push":
          payout = 10;
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

// ===== TEXAS HOLD'EM (simplified heads-up) =====
games.texas = {
  name: "Texas Hold'em (Heads-Up)",
  info: "Heads-up Texas Hold'em: you and dealer get 2 cards, 5-card board. Best 5-card hand wins (simplified scoring). Bet 30 tokens.",
  init() {
    clearGameArea();
    gameTitleEl.textContent = this.name;

    const controls = document.createElement("div");
    controls.className = "game-controls";

    const dealBtn = makeButton("Deal (30)", startHand);
    const revealBtn = makeButton("Reveal Board", revealBoard);

    revealBtn.disabled = true;

    controls.appendChild(dealBtn);
    controls.appendChild(revealBtn);
    gameContainerEl.appendChild(controls);

    const playerRow = document.createElement("div");
    playerRow.className = "cards-row";
    const dealerRow = document.createElement("div");
    dealerRow.className = "cards-row";
    const boardRow = document.createElement("div");
    boardRow.className = "cards-row";

    gameContainerEl.appendChild(document.createTextNode("Your hole cards:"));
    gameContainerEl.appendChild(playerRow);
    gameContainerEl.appendChild(document.createTextNode("Dealer hole cards:"));
    gameContainerEl.appendChild(dealerRow);
    gameContainerEl.appendChild(document.createTextNode("Board:"));
    gameContainerEl.appendChild(boardRow);

    gameInfoEl.textContent = this.info;

    let deck = [];
    let playerHand = [];
    let dealerHand = [];
    let board = [];
    let inProgress = false;

    function startHand() {
      const bet = 30;
      if (getBalance() < bet) {
        gameLogEl.textContent = "Not enough tokens.";
        return;
      }
      changeBalance(-bet);

      deck = createDeck();
      playerHand = [deck.pop(), deck.pop()];
      dealerHand = [deck.pop(), deck.pop()];
      board = [deck.pop(), deck.pop(), deck.pop(), deck.pop(), deck.pop()];
      inProgress = true;

      renderHand(playerHand, playerRow);
      renderHand(dealerHand, dealerRow);
      boardRow.innerHTML = "";

      revealBtn.disabled = false;
      gameLogEl.textContent = "Board is face down. Click 'Reveal Board' to see who wins.";
    }

    function revealBoard() {
      if (!inProgress) return;
      renderHand(board, boardRow);

      const playerScore = evaluateHoldemHand(playerHand, board);
      const dealerScore = evaluateHoldemHand(dealerHand, board);

      let msg = "";
      let payout = 0;

      if (playerScore > dealerScore) {
        payout = 60;
        msg = `You win the pot! +${payout} tokens. (Score ${playerScore.toFixed(2)} vs ${dealerScore.toFixed(2)})`;
      } else if (playerScore < dealerScore) {
        msg = `Dealer wins. (Score ${playerScore.toFixed(2)} vs ${dealerScore.toFixed(2)})`;
      } else {
        payout = 30;
        msg = `Split pot. Bet returned. (Score ${playerScore.toFixed(2)} vs ${dealerScore.toFixed(2)})`;
      }

      if (payout > 0) changeBalance(payout);

      gameLogEl.textContent = msg;
      inProgress = false;
      revealBtn.disabled = true;
    }

    // Rough but structured scoring: pairs/trips/quads + high card
    function evaluateHoldemHand(hole, board) {
      const allCards = hole.concat(board);
      const rankCounts = {};
      allCards.forEach(c => {
        rankCounts[c.rank] = (rankCounts[c.rank] || 0) + 1;
      });

      let score = 0;
      Object.values(rankCounts).forEach(count => {
        if (count === 2) score += 2; // pair
        else if (count === 3) score += 5; // trips
        else if (count === 4) score += 10; // quads
      });

      const rankOrder = {
        "A": 14, "K": 13, "Q": 12, "J": 11,
        "10": 10, "9": 9, "8": 8, "7": 7,
        "6": 6, "5": 5, "4": 4, "3": 3, "2": 2
      };
      let high = 0;
      allCards.forEach(c => {
        high = Math.max(high, rankOrder[c.rank]);
      });
      score += high / 10;

      return score;
    }
  }
};

// ===== SLOTS (3, 5, High Roller) =====
const slotSymbols = ["🍒", "🍋", "⭐", "💎", "7"];

function makeSlotsGame(id, name, reelsCount, bet, jackpotPayout) {
  games[id] = {
    name,
    info: `${reelsCount}-reel slots. Bet ${bet} tokens per spin. All reels matching pay ${jackpotPayout}.`,
    init() {
      clearGameArea();
      gameTitleEl.textContent = name;

      const controls = document.createElement("div");
      controls.className = "game-controls";
      const spinBtn = makeButton(`Spin (${bet})`, spin);
      controls.appendChild(spinBtn);
      gameContainerEl.appendChild(controls);

      const row = document.createElement("div");
      row.className = "slots-row";
      const reels = [];
      for (let i = 0; i < reelsCount; i++) {
        const reel = document.createElement("div");
        reel.className = "slot-reel";
        reel.textContent = "?";
        row.appendChild(reel);
        reels.push(reel);
      }
      gameContainerEl.appendChild(row);

      gameInfoEl.textContent = this.info;

      function spin() {
        if (getBalance() < bet) {
          gameLogEl.textContent = "Not enough tokens to spin.";
          return;
        }
        changeBalance(-bet);

        const results = [];
        for (let i = 0; i < reelsCount; i++) {
          const symbol = slotSymbols[Math.floor(Math.random() * slotSymbols.length)];
          results.push(symbol);
          reels[i].textContent = symbol;
        }

        let log = `Spin: ${results.join(" ")}. `;
        const allSame = results.every(s => s === results[0]);
        if (allSame) {
          changeBalance(jackpotPayout);
          log += `JACKPOT! +${jackpotPayout} tokens.`;
        } else {
          log += "No win this time.";
        }
        gameLogEl.textContent = log;
      }
    }
  };
}

makeSlotsGame("slots3", "3-Reel Slots", 3, 10, 50);
makeSlotsGame("slots5", "5-Reel Slots", 5, 15, 80);
makeSlotsGame("highrollerSlots", "High Roller Slots", 3, 50, 300);

// ===== ROULETTE (EU / US) =====
function makeRouletteGame(id, name, zeroCount) {
  games[id] = {
    name,
    info: `${name}. Bet 10 tokens on Red or Black. Wheel has ${zeroCount} zero pocket(s).`,
    init() {
      clearGameArea();
      gameTitleEl.textContent = name;

      const controls = document.createElement("div");
      controls.className = "game-controls";

      const redBtn = makeButton("Bet Red (10)", () => spin("red"));
      const blackBtn = makeButton("Bet Black (10)", () => spin("black"));

      controls.appendChild(redBtn);
      controls.appendChild(blackBtn);
      gameContainerEl.appendChild(controls);

      const layout = document.createElement("div");
      layout.className = "roulette-layout";
      layout.textContent = "Result will show color and number.";
      gameContainerEl.appendChild(layout);

      gameInfoEl.textContent = this.info;

      function spin(choice) {
        const bet = 10;
        if (getBalance() < bet) {
          gameLogEl.textContent = "Not enough tokens.";
          return;
        }
        changeBalance(-bet);

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

// ===== VIDEO POKER (Jacks or Better, simplified) =====
games.videoPoker = {
  name: "Video Poker (Jacks or Better)",
  info: "Bet 15 tokens. Draw 5 cards. Pairs of Jacks or better pay 30, better hands pay more (simplified).",
  init() {
    clearGameArea();
    gameTitleEl.textContent = this.name;

    const controls = document.createElement("div");
    controls.className = "game-controls";
    const dealBtn = makeButton("Deal (15)", deal);
    controls.appendChild(dealBtn);
    gameContainerEl.appendChild(controls);

    const handRow = document.createElement("div");
    handRow.className = "cards-row";
    gameContainerEl.appendChild(handRow);

    gameInfoEl.textContent = this.info;

    function deal() {
      const bet = 15;
      if (getBalance() < bet) {
        gameLogEl.textContent = "Not enough tokens.";
        return;
      }
      changeBalance(-bet);

      const deck = createDeck();
      const hand = [deck.pop(), deck.pop(), deck.pop(), deck.pop(), deck.pop()];
      renderHand(hand, handRow);

      const payout = evaluateVideoPoker(hand);
      if (payout > 0) {
        changeBalance(payout);
        gameLogEl.textContent = `Winning hand! +${payout} tokens.`;
      } else {
        gameLogEl.textContent = "No winning combination.";
      }
    }

    function evaluateVideoPoker(hand) {
      const rankCounts = {};
      hand.forEach(c => {
        rankCounts[c.rank] = (rankCounts[c.rank] || 0) + 1;
      });

      const rankOrder = {
        "A": 14, "K": 13, "Q": 12, "J": 11,
        "10": 10, "9": 9, "8": 8, "7": 7,
        "6": 6, "5": 5, "4": 4, "3": 3, "2": 2
      };

      let hasPair = false;
      let highPair = 0;
      Object.entries(rankCounts).forEach(([rank, count]) => {
        if (count === 2) {
          hasPair = true;
          highPair = Math.max(highPair, rankOrder[rank]);
        }
      });

      if (!hasPair || highPair < 11) return 0; // need Jacks or better

      if (highPair >= 11 && highPair < 13) return 30; // J/Q
      if (highPair === 13) return 40; // K
      if (highPair === 14) return 50; // A
      return 0;
    }
  }
};

// ===== BACCARAT =====
games.baccarat = {
  name: "Baccarat (Player vs Banker)",
  info: "Bet 20 tokens on Player or Banker. Closest to 9 wins. Tens and face cards count as 0.",
  init() {
    clearGameArea();
    gameTitleEl.textContent = this.name;

    const controls = document.createElement("div");
    controls.className = "game-controls";
    const playerBtn = makeButton("Bet Player (20)", () => play("player"));
    const bankerBtn = makeButton("Bet Banker (20)", () => play("banker"));
    controls.appendChild(playerBtn);
    controls.appendChild(bankerBtn);
    gameContainerEl.appendChild(controls);

    const playerRow = document.createElement("div");
    playerRow.className = "cards-row";
    const bankerRow = document.createElement("div");
    bankerRow.className = "cards-row";

    gameContainerEl.appendChild(document.createTextNode("Player:"));
    gameContainerEl.appendChild(playerRow);
    gameContainerEl.appendChild(document.createTextNode("Banker:"));
    gameContainerEl.appendChild(bankerRow);

    gameInfoEl.textContent = this.info;

    function play(choice) {
      const bet = 20;
      if (getBalance() < bet) {
        gameLogEl.textContent = "Not enough tokens.";
        return;
      }
      changeBalance(-bet);

      const deck = createDeck();
      const playerHand = [deck.pop(), deck.pop()];
      const bankerHand = [deck.pop(), deck.pop()];

      renderHand(playerHand, playerRow);
      renderHand(bankerHand, bankerRow);

      const pVal = baccaratValue(playerHand);
      const bVal = baccaratValue(bankerHand);

      let winner;
      if (pVal > bVal) winner = "player";
      else if (bVal > pVal) winner = "banker";
      else winner = "tie";

      let log = `Player: ${pVal} | Banker: ${bVal}. `;
      if (winner === choice) {
        const payout = 40;
        changeBalance(payout);
        log += `You win +${payout} tokens.`;
      } else if (winner === "tie") {
        changeBalance(bet);
        log += "Tie. Bet returned.";
      } else {
        log += "You lose.";
      }
      gameLogEl.textContent = log;
    }

    function baccaratValue(hand) {
      let total = 0;
      hand.forEach(c => {
        let v;
        if (["10", "J", "Q", "K"].includes(c.rank)) v = 0;
        else if (c.rank === "A") v = 1;
        else v = parseInt(c.rank, 10);
        total += v;
      });
      return total % 10;
    }
  }
};

// ===== CRAPS (simplified pass line) =====
games.craps = {
  name: "Craps (Pass Line, simplified)",
  info: "Bet 10 tokens on Pass Line. First roll: 7/11 wins, 2/3/12 loses, otherwise point is set and you try to hit it before a 7.",
  init() {
    clearGameArea();
    gameTitleEl.textContent = this.name;

    const controls = document.createElement("div");
    controls.className = "game-controls";
    const rollBtn = makeButton("Roll (10)", start);
    controls.appendChild(rollBtn);
    gameContainerEl.appendChild(controls);

    const status = document.createElement("div");
    status.className = "roulette-layout";
    gameContainerEl.appendChild(status);

    gameInfoEl.textContent = this.info;

    let point = null;
    let inPointPhase = false;

    function start() {
      const bet = 10;
      if (!inPointPhase) {
        if (getBalance() < bet) {
          gameLogEl.textContent = "Not enough tokens.";
          return;
        }
        changeBalance(-bet);
      }

      const d1 = rollDie();
      const d2 = rollDie();
      const total = d1 + d2;

      if (!inPointPhase) {
        if (total === 7 || total === 11) {
          const payout = 20;
          changeBalance(payout);
          gameLogEl.textContent = `Come-out roll: ${total}. You win +${payout} tokens.`;
          point = null;
        } else if ([2, 3, 12].includes(total)) {
          gameLogEl.textContent = `Come-out roll: ${total}. Craps, you lose.`;
          point = null;
        } else {
          point = total;
          inPointPhase = true;
          status.textContent = `Point is set to ${point}. Roll again (no extra bet) to hit point before 7.`;
          gameLogEl.textContent = `Come-out roll: ${total}. Point established at ${point}.`;
        }
      } else {
        if (total === point) {
          const payout = 20;
          changeBalance(payout);
          gameLogEl.textContent = `You rolled ${total} and hit the point! +${payout} tokens.`;
          inPointPhase = false;
          point = null;
          status.textContent = "";
        } else if (total === 7) {
          gameLogEl.textContent = `You rolled 7 before the point. You lose.`;
          inPointPhase = false;
          point = null;
          status.textContent = "";
        } else {
          gameLogEl.textContent = `Roll: ${total}. Still chasing point ${point}.`;
        }
      }
    }

    function rollDie() {
      return Math.floor(Math.random() * 6) + 1;
    }
  }
};

// ===== COIN FLIP =====
games.coinFlip = {
  name: "Coin Flip",
  info: "Bet 5 tokens on Heads or Tails. 50/50. Win pays 10.",
  init() {
    clearGameArea();
    gameTitleEl.textContent = this.name;

    const controls = document.createElement("div");
    controls.className = "game-controls";
    const headsBtn = makeButton("Heads (5)", () => flip("heads"));
    const tailsBtn = makeButton("Tails (5)", () => flip("tails"));
    controls.appendChild(headsBtn);
    controls.appendChild(tailsBtn);
    gameContainerEl.appendChild(controls);

    gameInfoEl.textContent = this.info;

    function flip(choice) {
      const bet = 5;
      if (getBalance() < bet) {
        gameLogEl.textContent = "Not enough tokens.";
        return;
      }
      changeBalance(-bet);

      const result = Math.random() < 0.5 ? "heads" : "tails";
      let log = `Coin shows ${result}. `;
      if (result === choice) {
        const payout = 10;
        changeBalance(payout);
        log += `You win +${payout} tokens.`;
      } else {
        log += "You lose.";
      }
      gameLogEl.textContent = log;
    }
  }
};

// ===== DICE DUEL =====
games.diceDuel = {
  name: "Dice Duel",
  info: "Bet 10 tokens. You roll a die, dealer rolls a die. Higher roll wins 20.",
  init() {
    clearGameArea();
    gameTitleEl.textContent = this.name;

    const controls = document.createElement("div");
    controls.className = "game-controls";
    const rollBtn = makeButton("Roll (10)", duel);
    controls.appendChild(rollBtn);
    gameContainerEl.appendChild(controls);

    gameInfoEl.textContent = this.info;

    function duel() {
      const bet = 10;
      if (getBalance() < bet) {
        gameLogEl.textContent = "Not enough tokens.";
        return;
      }
      changeBalance(-bet);

      const you = rollDie();
      const dealer = rollDie();

      let log = `You roll ${you}, dealer rolls ${dealer}. `;
      if (you > dealer) {
        const payout = 20;
        changeBalance(payout);
        log += `You win +${payout} tokens.`;
      } else if (you < dealer) {
        log += "Dealer wins.";
      } else {
        changeBalance(bet);
        log += "Tie. Bet returned.";
      }
      gameLogEl.textContent = log;
    }

    function rollDie() {
      return Math.floor(Math.random() * 6) + 1;
    }
  }
};

// ===== KENO =====
games.keno = {
  name: "Keno (Simplified)",
  info: "Pick numbers 1–10, bet 10 tokens. 3 or more hits pay 30.",
  init() {
    clearGameArea();
    gameTitleEl.textContent = this.name;

    const controls = document.createElement("div");
    controls.className = "game-controls";
    const playBtn = makeButton("Play (10)", play);
    controls.appendChild(playBtn);
    gameContainerEl.appendChild(controls);

    const layout = document.createElement("div");
    layout.className = "roulette-layout";
    layout.textContent = "You automatically pick 5 random numbers, draw 10 numbers. 3+ matches pay.";
    gameContainerEl.appendChild(layout);

    gameInfoEl.textContent = this.info;

    function play() {
      const bet = 10;
      if (getBalance() < bet) {
        gameLogEl.textContent = "Not enough tokens.";
        return;
      }
      changeBalance(-bet);

      const picks = new Set();
      while (picks.size < 5) {
        picks.add(Math.floor(Math.random() * 10) + 1);
      }

      const draws = new Set();
      while (draws.size < 10) {
        draws.add(Math.floor(Math.random() * 10) + 1);
      }

      let hits = 0;
      picks.forEach(n => {
        if (draws.has(n)) hits++;
      });

      let log = `Your picks: ${Array.from(picks).join(", ")}. Draws: ${Array.from(draws).join(", ")}. Hits: ${hits}. `;
      if (hits >= 3) {
        const payout = 30;
        changeBalance(payout);
        log += `You win +${payout} tokens.`;
      } else {
        log += "No payout.";
      }
      gameLogEl.textContent = log;
    }
  }
};

// ===== WHEEL OF FORTUNE =====
games.wheel = {
  name: "Wheel of Fortune",
  info: "Bet 10 tokens. Spin a wheel with multipliers. Result multiplies your bet.",
  init() {
    clearGameArea();
    gameTitleEl.textContent = this.name;

    const controls = document.createElement("div");
    controls.className = "game-controls";
    const spinBtn = makeButton("Spin (10)", spin);
    controls.appendChild(spinBtn);
    gameContainerEl.appendChild(controls);

    const layout = document.createElement("div");
    layout.className = "wheel-layout";
    layout.textContent = "Wheel segments: 0x, 1x, 2x, 3x, 5x.";
    gameContainerEl.appendChild(layout);

    gameInfoEl.textContent = this.info;

    const segments = [0, 1, 2, 3, 5];

    function spin() {
      const bet = 10;
      if (getBalance() < bet) {
        gameLogEl.textContent = "Not enough tokens.";
        return;
      }
      changeBalance(-bet);

      const idx = Math.floor(Math.random() * segments.length);
      const mult = segments[idx];
      const payout = bet * mult;

      let log = `Wheel lands on ${mult}x. `;
      if (payout > 0) {
        changeBalance(payout);
        log += `You receive +${payout} tokens.`;
      } else {
        log += "No payout.";
      }
      gameLogEl.textContent = log;
    }
  }
};

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
