// blackjack.js
const createBlackjack = (io, pool) => {
    // --- Helpers: DB + auth ---
    async function getUserByToken(token) {
        const res = await pool.query(
            "SELECT id, username, balance FROM users WHERE token = $1",
            [token]
        );
        return res.rows[0] || null;
    }

    // --- Deck + hand logic ---
    function createDeck() {
        const suits = ["S", "H", "D", "C"];
        const ranks = ["A","2","3","4","5","6","7","8","9","0","J","Q","K"]; // 0 = 10
        const deck = [];
        for (const s of suits) {
            for (const r of ranks) {
                deck.push(r + s);
            }
        }
        return shuffle(deck);
    }

    function shuffle(deck) {
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        return deck;
    }

    function cardValue(rank) {
        if (rank === "A") return 11;
        if (["K","Q","J","0"].includes(rank)) return 10;
        return parseInt(rank, 10);
    }

    function handTotal(cards) {
        let total = 0;
        let aces = 0;
        for (const code of cards) {
            const rank = code[0];
            total += cardValue(rank);
            if (rank === "A") aces++;
        }
        while (total > 21 && aces > 0) {
            total -= 10;
            aces--;
        }
        return total;
    }

    // --- Single table state ---
    const table = {
        deck: createDeck(),
        dealer: { cards: [], total: 0 },
        players: [], // { socketId, userId, username, balance, seatIndex, hand, bet, standing, busted }
        seats: []    // { seatIndex, username }
    };

    function resetRound() {
        table.deck = createDeck();
        table.dealer = { cards: [], total: 0 };
        for (const p of table.players) {
            p.hand = { cards: [], total: 0 };
            p.bet = 0;
            p.standing = false;
            p.busted = false;
        }
    }

    function dealCard() {
        if (table.deck.length === 0) {
            table.deck = createDeck();
        }
        return table.deck.pop();
    }

    function broadcastState() {
        const state = {
            dealer: table.dealer,
            players: table.players.map(p => ({
                username: p.username,
                seatIndex: p.seatIndex,
                hand: p.hand,
                balance: p.balance
            })),
            seats: table.seats
        };
        io.emit("tableState", state);
    }

    async function updateBalance(userId, newBalance) {
        await pool.query("UPDATE users SET balance = $1 WHERE id = $2", [
            newBalance,
            userId
        ]);
    }

    // --- Socket auth ---
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth && socket.handshake.auth.token;
            if (!token) return next(new Error("No token"));
            const user = await getUserByToken(token);
            if (!user) return next(new Error("Invalid token"));
            socket.user = user;
            next();
        } catch (err) {
            next(err);
        }
    });

    io.on("connection", async socket => {
        const user = socket.user;

        // Find or create player
        let player = table.players.find(p => p.userId === user.id);
        if (!player) {
            player = {
                socketId: socket.id,
                userId: user.id,
                username: user.username,
                balance: user.balance,
                seatIndex: null,
                hand: { cards: [], total: 0 },
                bet: 0,
                standing: false,
                busted: false
            };
            table.players.push(player);
        } else {
            player.socketId = socket.id;
        }

        // ⭐ Refresh balance from DB so Blackjack matches dashboard
        const fresh = await pool.query(
            "SELECT balance FROM users WHERE id = $1",
            [user.id]
        );
        player.balance = fresh.rows[0].balance;

        socket.emit("message", `Welcome to Blackjack, ${user.username}`);
        broadcastState();

        socket.on("joinSeat", ({ seatIndex }) => {
            if (player.seatIndex !== null) return;
            if (table.seats.find(s => s.seatIndex === seatIndex)) return;

            player.seatIndex = seatIndex;
            table.seats.push({ seatIndex, username: player.username });
            socket.emit("message", `You joined seat ${seatIndex + 1}`);
            broadcastState();
        });

        socket.on("leaveSeat", () => {
            if (player.seatIndex === null) return;
            table.seats = table.seats.filter(s => s.username !== player.username);
            player.seatIndex = null;
            socket.emit("message", "You left your seat.");
            broadcastState();
        });

        socket.on("placeBet", async ({ amount }) => {
            amount = parseInt(amount, 10);
            if (!amount || amount <= 0) {
                socket.emit("errorMessage", "Invalid bet amount.");
                return;
            }
            if (player.seatIndex === null) {
                socket.emit("errorMessage", "Join a seat first.");
                return;
            }
            if (player.balance < amount) {
                socket.emit("errorMessage", "Insufficient balance.");
                return;
            }

            // Deduct and store bet
            player.balance -= amount;
            player.bet = amount;
            await updateBalance(player.userId, player.balance);

            // Refresh from DB again to keep in sync
            const fresh = await pool.query(
                "SELECT balance FROM users WHERE id = $1",
                [player.userId]
            );
            player.balance = fresh.rows[0].balance;

            // First active player starts round
            const activePlayers = table.players.filter(p => p.bet > 0);
            if (activePlayers.length === 1) {
                resetRound();
                table.dealer.cards = [dealCard(), dealCard()];
                table.dealer.total = handTotal(table.dealer.cards);
            }

            // Player initial hand
            player.hand.cards = [dealCard(), dealCard()];
            player.hand.total = handTotal(player.hand.cards);
            player.standing = false;
            player.busted = player.hand.total > 21;

            socket.emit("message", `Bet placed: ${amount}`);
            broadcastState();
            checkRoundEnd();
        });

        socket.on("hit", () => {
            if (player.bet <= 0) {
                socket.emit("errorMessage", "Place a bet first.");
                return;
            }
            if (player.standing || player.busted) return;

            player.hand.cards.push(dealCard());
            player.hand.total = handTotal(player.hand.cards);
            if (player.hand.total > 21) {
                player.busted = true;
                socket.emit("message", "You busted.");
            }
            broadcastState();
            checkRoundEnd();
        });

        socket.on("stand", () => {
            if (player.bet <= 0) return;
            player.standing = true;
            socket.emit("message", "You stand.");
            broadcastState();
            checkRoundEnd();
        });

        socket.on("double", async () => {
            if (player.bet <= 0) {
                socket.emit("errorMessage", "Place a bet first.");
                return;
            }
            if (player.balance < player.bet) {
                socket.emit("errorMessage", "Not enough balance to double.");
                return;
            }
            if (player.standing || player.busted) return;

            player.balance -= player.bet;
            player.bet *= 2;
            await updateBalance(player.userId, player.balance);

            const fresh = await pool.query(
                "SELECT balance FROM users WHERE id = $1",
                [player.userId]
            );
            player.balance = fresh.rows[0].balance;

            player.hand.cards.push(dealCard());
            player.hand.total = handTotal(player.hand.cards);
            if (player.hand.total > 21) {
                player.busted = true;
                socket.emit("message", "You busted on double.");
            } else {
                player.standing = true;
                socket.emit("message", "Double down and stand.");
            }
            broadcastState();
            checkRoundEnd();
        });

        socket.on("disconnect", () => {
            if (player.seatIndex !== null) {
                table.seats = table.seats.filter(s => s.username !== player.username);
                player.seatIndex = null;
            }
            broadcastState();
        });
    });

    async function checkRoundEnd() {
        const active = table.players.filter(p => p.bet > 0);
        if (active.length === 0) return;

        const allDone = active.every(p => p.standing || p.busted);
        if (!allDone) return;

        // Dealer plays
        while (table.dealer.total < 17) {
            table.dealer.cards.push(dealCard());
            table.dealer.total = handTotal(table.dealer.cards);
        }

        // Settle bets
        for (const p of active) {
            const pt = p.hand.total;
            const dt = table.dealer.total;

            let result;
            if (p.busted) {
                result = "lose";
            } else if (dt > 21) {
                result = "win";
            } else if (pt > dt) {
                result = "win";
            } else if (pt < dt) {
                result = "lose";
            } else {
                result = "push";
            }

            if (result === "win") {
                p.balance += p.bet * 2;
            } else if (result === "push") {
                p.balance += p.bet;
            }

            await updateBalance(p.userId, p.balance);

            const fresh = await pool.query(
                "SELECT balance FROM users WHERE id = $1",
                [p.userId]
            );
            p.balance = fresh.rows[0].balance;

            p.bet = 0;
            p.standing = false;
            p.busted = false;
        }

        io.emit("message", "Round finished.");
        broadcastState();
        resetRound();
    }
};

module.exports = { createBlackjack };
