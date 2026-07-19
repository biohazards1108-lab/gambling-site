export default function blackjack(io, pool) {

    async function getUserByToken(token) {
        const res = await pool.query(
            "SELECT id, username, balance FROM users WHERE token = $1",
            [token]
        );
        return res.rows[0] || null;
    }

    function createDeck() {
        const suits = ["S","H","D","C"];
        const ranks = ["A","2","3","4","5","6","7","8","9","0","J","Q","K"];
        const deck = [];
        for (const s of suits) {
            for (const r of ranks) deck.push(r + s);
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
        return parseInt(rank);
    }

    function handTotal(cards) {
        let total = 0;
        let aces = 0;
        for (const c of cards) {
            const r = c[0];
            total += cardValue(r);
            if (r === "A") aces++;
        }
        while (total > 21 && aces > 0) {
            total -= 10;
            aces--;
        }
        return total;
    }

    const table = {
        deck: createDeck(),
        dealer: { cards: [], total: 0 },
        players: [],
        seats: []
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
        if (table.deck.length === 0) table.deck = createDeck();
        return table.deck.pop();
    }

    function broadcast() {
        io.emit("tableState", {
            dealer: table.dealer,
            players: table.players.map(p => ({
                username: p.username,
                seatIndex: p.seatIndex,
                hand: p.hand,
                balance: p.balance
            })),
            seats: table.seats
        });
    }

    async function updateBalance(id, bal) {
        await pool.query("UPDATE users SET balance = $1 WHERE id = $2", [bal, id]);
    }

    io.use(async (socket, next) => {
        const token = socket.handshake.auth?.token;
        if (!token) return next(new Error("No token"));
        const user = await getUserByToken(token);
        if (!user) return next(new Error("Invalid token"));
        socket.user = user;
        next();
    });

    io.on("connection", async socket => {
        const user = socket.user;

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
        }

        const fresh = await pool.query("SELECT balance FROM users WHERE id = $1", [user.id]);
        player.balance = fresh.rows[0].balance;

        socket.emit("message", `Welcome to Blackjack, ${user.username}`);
        broadcast();

        socket.on("joinSeat", ({ seatIndex }) => {
            if (player.seatIndex !== null) return;
            if (table.seats.find(s => s.seatIndex === seatIndex)) return;

            player.seatIndex = seatIndex;
            table.seats.push({ seatIndex, username: player.username });
            broadcast();
        });

        socket.on("leaveSeat", () => {
            table.seats = table.seats.filter(s => s.username !== player.username);
            player.seatIndex = null;
            broadcast();
        });

        socket.on("placeBet", async ({ amount }) => {
            amount = parseInt(amount);
            if (amount <= 0) return socket.emit("errorMessage", "Invalid bet");
            if (player.balance < amount) return socket.emit("errorMessage", "Not enough balance");

            player.balance -= amount;
            player.bet = amount;
            await updateBalance(player.userId, player.balance);

            const fresh = await pool.query("SELECT balance FROM users WHERE id = $1", [player.userId]);
            player.balance = fresh.rows[0].balance;

            const active = table.players.filter(p => p.bet > 0);
            if (active.length === 1) {
                resetRound();
                table.dealer.cards = [dealCard(), dealCard()];
                table.dealer.total = handTotal(table.dealer.cards);
            }

            player.hand.cards = [dealCard(), dealCard()];
            player.hand.total = handTotal(player.hand.cards);

            broadcast();
            checkEnd();
        });

        socket.on("hit", () => {
            if (player.bet <= 0) return;
            player.hand.cards.push(dealCard());
            player.hand.total = handTotal(player.hand.cards);
            if (player.hand.total > 21) player.busted = true;
            broadcast();
            checkEnd();
        });

        socket.on("stand", () => {
            player.standing = true;
            broadcast();
            checkEnd();
        });

        socket.on("double", async () => {
            if (player.balance < player.bet) return socket.emit("errorMessage", "Not enough balance");

            player.balance -= player.bet;
            player.bet *= 2;
            await updateBalance(player.userId, player.balance);

            const fresh = await pool.query("SELECT balance FROM users WHERE id = $1", [player.userId]);
            player.balance = fresh.rows[0].balance;

            player.hand.cards.push(dealCard());
            player.hand.total = handTotal(player.hand.cards);
            player.standing = true;

            broadcast();
            checkEnd();
        });
    });

    async function checkEnd() {
        const active = table.players.filter(p => p.bet > 0);
        if (active.length === 0) return;

        const done = active.every(p => p.standing || p.busted);
        if (!done) return;

        while (table.dealer.total < 17) {
            table.dealer.cards.push(dealCard());
            table.dealer.total = handTotal(table.dealer.cards);
        }

        for (const p of active) {
            const pt = p.hand.total;
            const dt = table.dealer.total;

            let result = "lose";
            if (p.busted) result = "lose";
            else if (dt > 21) result = "win";
            else if (pt > dt) result = "win";
            else if (pt === dt) result = "push";

            if (result === "win") p.balance += p.bet * 2;
            else if (result === "push") p.balance += p.bet;

            await updateBalance(p.userId, p.balance);

            const fresh = await pool.query("SELECT balance FROM users WHERE id = $1", [p.userId]);
            p.balance = fresh.rows[0].balance;

            p.bet = 0;
            p.standing = false;
            p.busted = false;
        }
        broadcast();
        resetRound();
    }  
