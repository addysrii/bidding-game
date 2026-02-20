import React, { createContext, useRef, useState, useContext } from 'react';
import { livePlayer as initialPlayer, teams as initialTeams } from '../mockData';

const AuctionContext = createContext();

export const useAuction = () => useContext(AuctionContext);

const cloneState = (value) => {
    if (typeof structuredClone === 'function') {
        return structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value));
};

// Helper to generate next player (mock)
const getNextPlayer = (id) => ({
    ...initialPlayer,
    id: id + 1,
    name: `Player ${id + 1}`,
    role: ['Batsman', 'Bowler', 'All-Rounder', 'Wicket Keeper'][Math.floor(Math.random() * 4)],
    basePrice: "20 L",
    currentBid: "20 L",
    highestBidder: null,
    image: null,
    isClosed: false,
    status: 'OPEN',
    assignedCard: null
});

export const AuctionProvider = ({ children }) => {
    const [teams, setTeams] = useState(initialTeams.map((team) => ({
        ...team,
        roster: team.roster || []
    })));
    const [currentPlayer, setCurrentPlayer] = useState({
        ...initialPlayer,
        currentBid: 50, // Bid in Lakhs
        isClosed: false,
        status: 'OPEN',
        assignedCard: null
    });
    const [highestBidder, setHighestBidder] = useState(null);
    const [bidHistory, setBidHistory] = useState([]);
    const [auctionLogs, setAuctionLogs] = useState([]);
    const [, setHistoryVersion] = useState(0);
    const undoStackRef = useRef([]);
    const redoStackRef = useRef([]);

    const bumpHistoryVersion = () => setHistoryVersion((prev) => prev + 1);

    const getSnapshot = () => cloneState({
        teams,
        currentPlayer,
        highestBidder,
        bidHistory,
        auctionLogs
    });

    const applySnapshot = (snapshot) => {
        if (!snapshot) return;
        setTeams(snapshot.teams || []);
        setCurrentPlayer(snapshot.currentPlayer || null);
        setHighestBidder(snapshot.highestBidder ?? null);
        setBidHistory(snapshot.bidHistory || []);
        setAuctionLogs(snapshot.auctionLogs || []);
    };

    const runWithHistory = (callback) => {
        undoStackRef.current.push(getSnapshot());
        if (undoStackRef.current.length > 100) {
            undoStackRef.current.shift();
        }
        redoStackRef.current = [];
        bumpHistoryVersion();
        callback();
    };

    const getTeamById = (teamId) => teams.find((team) => team.id === teamId);
    const getFundsInCr = (funds) => parseFloat((funds || '0').replace(' Cr', '')) || 0;
    const toFundsLabel = (valueInCr) => `${Math.max(valueInCr, 0).toFixed(2)} Cr`;

    const placeBid = (teamId, amount) => {
        if (currentPlayer?.isClosed) return false;

        // Validation: verify team has enough funds
        const team = getTeamById(teamId);
        if (!team) return false;

        const currentFunds = getFundsInCr(team.funds);
        const bidInCr = amount / 100;

        if (currentFunds < bidInCr) {
            alert("Insufficient funds!");
            return false;
        }

        runWithHistory(() => {
            setCurrentPlayer(prev => ({
                ...prev,
                currentBid: amount
            }));
            setHighestBidder(teamId);
            setBidHistory(prev => [...prev, { teamId, amount, timestamp: new Date() }]);
        });
        return true;
    };

    const sellPlayer = ({ assignedCard, adminName = 'Admin' } = {}) => {
        if (!highestBidder) {
            return { success: false, reason: 'NO_BIDDER' };
        }

        if (currentPlayer?.isClosed) {
            return { success: false, reason: 'PLAYER_CLOSED' };
        }

        const winningTeam = getTeamById(highestBidder);
        if (!winningTeam) {
            return { success: false, reason: 'INVALID_TEAM' };
        }

        const walletBefore = getFundsInCr(winningTeam.funds);
        const costInCr = (currentPlayer.currentBid || 0) / 100;

        if (walletBefore < costInCr) {
            return {
                success: false,
                reason: 'INSUFFICIENT_FUNDS',
                walletBefore,
                costInCr
            };
        }

        const walletAfter = walletBefore - costInCr;
        const soldPlayer = {
            ...currentPlayer,
            soldPrice: `${currentPlayer.currentBid} L`,
            role: currentPlayer.role || 'Batsman',
            soldTo: highestBidder,
            status: 'SOLD',
            isClosed: true,
            assignedCard: assignedCard || null
        };

        runWithHistory(() => {
            setTeams(prevTeams => prevTeams.map(team => {
                if (team.id === highestBidder) {
                    return {
                        ...team,
                        funds: toFundsLabel(walletAfter),
                        players: team.players + 1,
                        roster: [...(team.roster || []), soldPlayer]
                    };
                }
                return team;
            }));

            setAuctionLogs((prev) => [{
                id: `${currentPlayer.id}-${Date.now()}`,
                type: 'SOLD',
                playerName: currentPlayer?.name || '—',
                soldAmount: `${currentPlayer.currentBid} L`,
                soldAmountInCr: costInCr,
                teamId: highestBidder,
                teamName: winningTeam.name,
                walletBefore,
                walletAfter,
                adminName,
                cardAssigned: assignedCard?.label || 'Default Team Card',
                cardId: assignedCard?.id || null,
                timestamp: new Date().toISOString()
            }, ...prev]);

            setCurrentPlayer((prev) => ({
                ...prev,
                status: 'SOLD',
                isClosed: true,
                assignedCard: assignedCard || null
            }));
            setHighestBidder(null);
            setBidHistory([]);
        });

        return {
            success: true,
            winningTeam,
            walletBefore,
            walletAfter
        };
    };

    const markUnsold = ({ adminName = 'Admin' } = {}) => {
        if (currentPlayer?.isClosed) return false;

        runWithHistory(() => {
            setAuctionLogs((prev) => [{
                id: `${currentPlayer.id}-${Date.now()}`,
                type: 'UNSOLD',
                playerName: currentPlayer?.name || '—',
                soldAmount: '—',
                soldAmountInCr: 0,
                teamId: null,
                teamName: '—',
                walletBefore: null,
                walletAfter: null,
                adminName,
                cardAssigned: null,
                cardId: null,
                timestamp: new Date().toISOString()
            }, ...prev]);

            setCurrentPlayer((prev) => ({
                ...prev,
                status: 'UNSOLD',
                isClosed: true,
                assignedCard: null
            }));
            setHighestBidder(null);
            setBidHistory([]);
        });
        return true;
    };

    const nextPlayer = () => {
        runWithHistory(() => {
            setCurrentPlayer(prev => ({
                ...getNextPlayer(prev.id),
                currentBid: 20
            }));
            setHighestBidder(null);
            setBidHistory([]);
        });
    };

    const undoLastAction = () => {
        const previousSnapshot = undoStackRef.current.pop();
        if (!previousSnapshot) return null;

        redoStackRef.current.push(getSnapshot());
        applySnapshot(previousSnapshot);
        bumpHistoryVersion();
        return previousSnapshot;
    };

    const redoLastAction = () => {
        const nextSnapshot = redoStackRef.current.pop();
        if (!nextSnapshot) return null;

        undoStackRef.current.push(getSnapshot());
        applySnapshot(nextSnapshot);
        bumpHistoryVersion();
        return nextSnapshot;
    };

    const syncAuctionState = (snapshot) => {
        if (!snapshot) return false;

        applySnapshot(cloneState(snapshot));
        undoStackRef.current = [];
        redoStackRef.current = [];
        bumpHistoryVersion();
        return true;
    };

    const getAuctionSnapshot = () => getSnapshot();

    return (
        <AuctionContext.Provider value={{
            teams,
            currentPlayer,
            highestBidder,
            bidHistory,
            auctionLogs,
            placeBid,
            sellPlayer,
            markUnsold,
            nextPlayer,
            undoLastAction,
            redoLastAction,
            syncAuctionState,
            getAuctionSnapshot,
            canUndo: undoStackRef.current.length > 0,
            canRedo: redoStackRef.current.length > 0
        }}>
            {children}
        </AuctionContext.Provider>
    );
};
