<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Fake Casino</title>
  <style>
    body {
      font-family: system-ui, sans-serif;
      background: radial-gradient(circle at top, #145, #012);
      color: #f5f5f5;
      margin: 0;
      padding: 0;
    }
    header {
      text-align: center;
      padding: 20px;
      background: rgba(0,0,0,0.5);
      border-bottom: 1px solid #333;
    }
    .balance {
      font-size: 1.2rem;
      margin-top: 10px;
    }
    main {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 20px;
      padding: 20px;
    }
    .card {
      background: rgba(0,0,0,0.6);
      border-radius: 10px;
      padding: 15px;
      width: 320px;
      box-shadow: 0 0 10px rgba(0,0,0,0.7);
    }
    .card h2 {
      margin-top: 0;
      border-bottom: 1px solid #444;
      padding-bottom: 5px;
    }
    button {
      background: #e0b000;
      border: none;
      padding: 8px 14px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      margin: 4px 2px;
    }
    button:disabled {
      background: #555;
      cursor: not-allowed;
    }
    .slots-row {
      display: flex;
      justify-content: center;
      gap: 10px;
      margin: 10px 0;
    }
    .slot {
      width: 60px;
      height: 60px;
      border-radius: 8px;
      background: #222;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.4rem;
      border: 2px solid #888;
    }
    .log {
      font-size: 0.9rem;
      min-height: 40px;
      margin-top: 8px;
    }
    .cards-row {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      margin: 8px 0;
    }
    .card-face {
      width: 40px;
      height: 60px;
      border-radius: 6px;
      background: #fff;
      color: #000;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.8rem;
      border: 1px solid #333;
    }
    .controls {
      margin-top: 8px;
    }
    .small {
      font-size: 0.8rem;
      opacity: 0.8;
    }
  </style>
</head>
<body>
  <header>
    <h1>Fake Casino Lounge</h1>
    <div class="balance">
      Tokens: <span id="balance">0</span>
      <button id="resetBalanceBtn">Reset to 200</button>
    </div>
    <div class="small">
      All tokens are fake. Just for fun between you two. 🙂
    </div>
  </header>

  <main>
    <!-- SLOTS -->
    <section class="card" id="slots">
      <h2>Slots</h2>
      <div class="small">Bet: 10 tokens per spin. 3 of a kind pays 50.</div>
      <div class="slots-row">
        <div class="slot" id="slot1">?</div>
        <div class="slot" id="slot2">?</div>
        <div class="slot" id="slot3">?</div>
      </div>
      <button id="spinBtn">Spin</button>
      <div class="log" id="slotsLog"></div>
    </section>

    <!-- BLACKJACK / 21 -->
    <section class="card" id="blackjack">
      <h2>Blackjack (21)</h2>
      <div class="small">
        Bet: 20 tokens per hand. Dealer hits until 17+. Closest to 21 wins.
      </div>

      <div class="controls">
        <button id="bjDealBtn">Deal</button>
        <button id="bjHitBtn" disabled>Hit</button>
        <button id="bjStandBtn" disabled>Stand</button>
      </div>

      <div class="small">Your hand:</div>
      <div class="cards-row" id="playerCards"></div>
      <div class="small">Dealer hand:</div>
      <div class="cards-row" id="dealerCards"></div>

      <div class="log" id="bjLog"></div>
    </section>
  </main>

  <script>
    // ===== TOKEN SYSTEM =====
    const BALANCE_KEY = "fakeCasinoBalance";

    function getBalance() {
      const stored = localStorage.getItem(BALANCE_KEY);
      if (stored === null) {
        localStorage.setItem(BALANCE_KEY, "200");
        return 200;
      }
      return parseInt(stored, 10);
    }

    function setBalance(value) {
      localStorage.setItem(BALANCE_KEY, String(value));
      document.getElementById("balance").textContent = value;
    }

    function changeBalance(delta) {
      const newBal = getBalance() + delta;
      setBalance(Math.max(newBal, 0));
    }

    // Init balance display
    setBalance(getBalance());

    document.getElementById("resetBalanceBtn").onclick = () => {
      setBalance(200);
    };

    // ===== SLOTS GAME =====
    const symbols = ["🍒", "🍋", "⭐", "💎", "7"];

    function spinSlots() {
      const bet = 10;
      if (getBalance() < bet) {
        document.getElementById("slotsLog").textContent =
          "Not enough tokens to spin.";
        return;
      }
      changeBalance(-bet);

      const s1 = symbols[Math.floor(Math.random() * symbols.length)];
      const s2 = symbols[Math.floor(Math.random() * symbols.length)];
      const s3 = symbols[Math.floor(Math.random() * symbols.length)];

      document.getElementById("slot1").textContent = s1;
      document.getElementById("slot2").textContent = s2;
      document.getElementById("slot3").textContent = s3;

      let log = `You spun: ${s1} ${s2} ${s3}. `;
      if (s1 === s2 && s2 === s3) {
        const win = 50;
        changeBalance(win);
        log += `JACKPOT! +${win} tokens.`;
      } else {
        log += "No win this time.";
      }
      document.getElementById("slotsLog").textContent = log;
    }

    document.getElementById("spinBtn").onclick = spinSlots;

    // ===== BLACKJACK / 21 =====
    const suits = ["♠", "♥", "♦", "♣"];
    const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

    function createDeck() {
      const deck = [];
      for (const s of suits) {
        for (const r of ranks) {
          deck.push({ rank: r, suit: s });
        }
      }
      // shuffle
      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }
      return deck;
    }

    function cardValue(card) {
      if (card.rank === "A") return 11;
      if (["J", "Q", "K"].includes(card.rank)) return 10;
      return parseInt(card.rank, 10);
    }

    function handValue(hand) {
      let total = 0;
      let aces = 0;
      for (const c of hand) {
        total += cardValue(c);
        if (c.rank === "A") aces++;
      }
      // adjust Aces from 11 to 1 if needed
      while (total > 21 && aces > 0) {
        total -= 10;
        aces--;
      }
      return total;
    }

    let deck = [];
    let playerHand = [];
    let dealerHand = [];
    let bjInProgress = false;

    const bjDealBtn = document.getElementById("bjDealBtn");
    const bjHitBtn = document.getElementById("bjHitBtn");
    const bjStandBtn = document.getElementById("bjStandBtn");
    const bjLog = document.getElementById("bjLog");
    const playerCardsDiv = document.getElementById("playerCards");
    const dealerCardsDiv = document.getElementById("dealerCards");

    function renderHand(hand, container) {
      container.innerHTML = "";
      hand.forEach(card => {
        const div = document.createElement("div");
        div.className = "card-face";
        div.textContent = `${card.rank}${card.suit}`;
        container.appendChild(div);
      });
    }

    function startBlackjack() {
      const bet = 20;
      if (getBalance() < bet) {
        bjLog.textContent = "Not enough tokens to deal a hand.";
        return;
      }
      changeBalance(-bet);

      deck = createDeck();
      playerHand = [deck.pop(), deck.pop()];
      dealerHand = [deck.pop(), deck.pop()];
      bjInProgress = true;

      renderHand(playerHand, playerCardsDiv);
      renderHand(dealerHand, dealerCardsDiv);

      bjHitBtn.disabled = false;
      bjStandBtn.disabled = false;

      const pVal = handValue(playerHand);
      const dVal = handValue(dealerHand);
      bjLog.textContent = `You: ${pVal} | Dealer: ${dVal} (dealer hidden in real casinos, but we show for fun).`;

      if (pVal === 21) {
        endBlackjack("blackjack");
      }
    }

    function playerHit() {
      if (!bjInProgress) return;
      playerHand.push(deck.pop());
      renderHand(playerHand, playerCardsDiv);

      const pVal = handValue(playerHand);
      const dVal = handValue(dealerHand);
      bjLog.textContent = `You: ${pVal} | Dealer: ${dVal}`;

      if (pVal > 21) {
        endBlackjack("player_bust");
      }
    }

    function playerStand() {
      if (!bjInProgress) return;

      // Dealer plays: hit until 17+
      while (handValue(dealerHand) < 17) {
        dealerHand.push(deck.pop());
      }
      renderHand(dealerHand, dealerCardsDiv);

      const pVal = handValue(playerHand);
      const dVal = handValue(dealerHand);

      if (dVal > 21) {
        endBlackjack("dealer_bust");
      } else if (pVal > dVal) {
        endBlackjack("player_win");
      } else if (pVal < dVal) {
        endBlackjack("dealer_win");
      } else {
        endBlackjack("push");
      }
    }

    function endBlackjack(result) {
      bjInProgress = false;
      bjHitBtn.disabled = true;
      bjStandBtn.disabled = true;

      let msg = "";
      let payout = 0;

      switch (result) {
        case "blackjack":
          payout = 40; // simple 2x payout
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
          payout = 20; // return bet
          msg = "Push. Your bet is returned.";
          break;
      }

      if (payout > 0) changeBalance(payout);

      const pVal = handValue(playerHand);
      const dVal = handValue(dealerHand);
      bjLog.textContent = `${msg} Final: You ${pVal} vs Dealer ${dVal}.`;
    }

    bjDealBtn.onclick = startBlackjack;
    bjHitBtn.onclick = playerHit;
    bjStandBtn.onclick = playerStand;
  </script>
</body>
</html>
