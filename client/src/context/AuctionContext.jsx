import React, { createContext, useEffect, useRef, useState, useContext } from 'react';
import { teams as initialTeams } from '../mockData';
import { resolveSocketUrl } from '../socketUrl';

const AuctionContext = createContext();

export const useAuction = () => useContext(AuctionContext);

const cloneState = (value) => {
    if (typeof structuredClone === 'function') {
        return structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value));
};

const parseLakhs = (value, fallback = 0) => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    const match = String(value || '').match(/([0-9.]+)/);
    return match ? Number(match[1]) : fallback;
};

const getPlayerCategory = (player) => {
    const rawCategory = player?.category || player?.role || 'Uncategorized';
    return String(rawCategory).trim() || 'Uncategorized';
};

const getAvailableCategories = (players = []) => {
    const categories = new Set();
    players.forEach((player) => categories.add(getPlayerCategory(player)));
    return Array.from(categories);
};

const playerMatchesCategory = (player, category) => {
    if (!category || category === 'ALL') return true;
    return getPlayerCategory(player) === category;
};

const toAuctionPlayer = (player) => {
    const basePriceLakhs = parseLakhs(player?.basePrice, 0);
    const currentBidLakhs = parseLakhs(player?.currentBid, basePriceLakhs);

    return {
        id: player?._id || player?.id,
        name: player?.name || 'Unknown Player',
        country: player?.country || 'IND',
        role: player?.role || 'Batsman',
        matches: player?.matches ?? 0,
        runs: player?.runs ?? 0,
        wickets: player?.wickets ?? 0,
        average: player?.average ?? 0,
        strikeRate: player?.strikeRate ?? 0,
        rating: player?.rating ?? 'N/A',
        basePrice: basePriceLakhs,
        currentBid: currentBidLakhs,
        highestBidder: player?.highestBidder ?? null,
        category: getPlayerCategory(player),
        image: player?.profilePicture || player?.image || null,
        isClosed: Boolean(player?.isClosed),
        status: player?.status || 'OPEN',
        assignedCard: player?.assignedCard || null
    };
};

export const AuctionProvider = ({ children }) => {
    const [playerPool, setPlayerPool] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('ALL');
    const [activePlayerIndex, setActivePlayerIndex] = useState(0);
    const [teams, setTeams] = useState(initialTeams.map((team) => ({
        ...team,
        roster: team.roster || []
    })));
    const [highestBidder, setHighestBidder] = useState(null);
    const [bidHistory, setBidHistory] = useState([]);
    const [auctionLogs, setAuctionLogs] = useState([]);
    const [, setHistoryVersion] = useState(0);
    const undoStackRef = useRef([]);
    const redoStackRef = useRef([]);

    // Compute currentPlayer dynamically from playerPool and activePlayerIndex
    // This ensures the player card always displays the latest player data including any updates
    const currentPlayer = playerPool[activePlayerIndex] ? toAuctionPlayer(playerPool[activePlayerIndex]) : null;

    useEffect(() => {
        let ignore = false;
        const apiBaseUrl = resolveSocketUrl();

        const loadPlayers = async () => {
            try {
                const response = await fetch(`${apiBaseUrl}/api/players`);
                if (!response.ok) {
                    throw new Error(`Failed to fetch players: ${response.status}`);
                }

                const data = await response.json();
                if (!Array.isArray(data) || ignore) return;

                const categories = getAvailableCategories(data);
                const initialCategory = categories[0] || 'ALL';
                const firstCategoryIndex = data.findIndex((player) =>
                    playerMatchesCategory(player, initialCategory)
                );

                setPlayerPool(data);
                setSelectedCategory(initialCategory);
                setActivePlayerIndex(firstCategoryIndex >= 0 ? firstCategoryIndex : 0);
                setHighestBidder(null);
                setBidHistory([]);
            } catch (error) {
                console.error('Unable to load players from database.', error);
                setPlayerPool([]);
                setSelectedCategory('ALL');
            }
        };

        loadPlayers();

        return () => {
            ignore = true;
        };
    }, []);

    const bumpHistoryVersion = () => setHistoryVersion((prev) => prev + 1);

    const getSnapshot = () => cloneState({
        playerPool,
        selectedCategory,
        activePlayerIndex,
        teams,
        currentPlayer,
        highestBidder,
        bidHistory,
        auctionLogs
    });

    const applySnapshot = (snapshot) => {
        if (!snapshot) return;
        setPlayerPool(snapshot.playerPool || []);
        setSelectedCategory(snapshot.selectedCategory || 'ALL');
        setActivePlayerIndex(snapshot.activePlayerIndex ?? 0);
        setTeams(snapshot.teams || []);
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
    const availableCategories = getAvailableCategories(playerPool);
    const categoriesWithFallback = availableCategories.length > 0 ? availableCategories : ['ALL'];
    const categoryPlayers = playerPool
        .filter((player) => playerMatchesCategory(player, selectedCategory))
        .map((player) => toAuctionPlayer(player));

    const placeBid = (teamId, amount) => {
        if (!currentPlayer) return false;
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
            // Update the current player in playerPool with the new bid amount
            setPlayerPool(prevPool => {
                const updatedPool = [...prevPool];
                if (updatedPool[activePlayerIndex]) {
                    updatedPool[activePlayerIndex] = {
                        ...updatedPool[activePlayerIndex],
                        currentBid: amount
                    };
                }
                return updatedPool;
            });
            setHighestBidder(teamId);
            setBidHistory(prev => [...prev, { teamId, amount, timestamp: new Date() }]);
        });
        return true;
    };

    const sellPlayer = ({ assignedCard, adminName = 'Admin' } = {}) => {
        if (!currentPlayer) {
            return { success: false, reason: 'NO_ACTIVE_PLAYER' };
        }

        if (!highestBidder) {
            return { success: false, reason: 'NO_BIDDER' };
        }

        if (currentPlayer?.isClosed) {
            return { success: false, reason: 'PLAYER_CLOSED' };
        }

        const winningTeamId = highestBidder;
        const bidAmount = currentPlayer.currentBid;
        const winningTeam = getTeamById(winningTeamId);
        if (!winningTeam) {
            return { success: false, reason: 'INVALID_TEAM' };
        }

        const walletBefore = getFundsInCr(winningTeam.funds);
        const costInCr = bidAmount / 100;

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
            currentBid: bidAmount,
            soldPrice: `${bidAmount} L`,
            role: currentPlayer.role || 'Batsman',
            soldTo: winningTeamId,
            status: 'SOLD',
            isClosed: true,
            assignedCard: assignedCard || null
        };

        runWithHistory(() => {
            setTeams(prevTeams => prevTeams.map(team => {
                if (team.id === winningTeamId) {
                    return {
                        ...team,
                        funds: toFundsLabel(walletAfter),
                        players: (team.players || 0) + 1,
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
                teamId: winningTeamId,
                teamName: winningTeam.name,
                walletBefore,
                walletAfter,
                adminName,
                cardAssigned: assignedCard?.label || 'Default Team Card',
                cardId: assignedCard?.id || null,
                timestamp: new Date().toISOString()
            }, ...prev]);

            // Update the current player in playerPool with sold status
            setPlayerPool(prevPool => {
                const updatedPool = [...prevPool];
                if (updatedPool[activePlayerIndex]) {
                    updatedPool[activePlayerIndex] = {
                        ...updatedPool[activePlayerIndex],
                        status: 'SOLD',
                        isClosed: true,
                        assignedCard: assignedCard || null
                    };
                }
                return updatedPool;
            });
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
        if (!currentPlayer) return false;
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

            // Update the current player in playerPool with unsold status
            setPlayerPool(prevPool => {
                const updatedPool = [...prevPool];
                if (updatedPool[activePlayerIndex]) {
                    updatedPool[activePlayerIndex] = {
                        ...updatedPool[activePlayerIndex],
                        status: 'UNSOLD',
                        isClosed: true,
                        assignedCard: null
                    };
                }
                return updatedPool;
            });
            setHighestBidder(null);
            setBidHistory([]);
        });
        return true;
    };

    const setActiveCategory = (category, options = {}) => {
        const nextCategory = categoriesWithFallback.includes(category) ? category : 'ALL';
        const nextCategoryIndices = playerPool
            .map((player, index) => (playerMatchesCategory(player, nextCategory) ? index : -1))
            .filter((index) => index !== -1);

        const applyCategory = () => {
            setSelectedCategory(nextCategory);

            if (nextCategoryIndices.length === 0) {
                setActivePlayerIndex(0);
                setHighestBidder(null);
                setBidHistory([]);
                return;
            }

            const firstIndex = nextCategoryIndices[0];
            setActivePlayerIndex(firstIndex);
            setHighestBidder(null);
            setBidHistory([]);
        };

        if (options.withHistory) {
            runWithHistory(applyCategory);
        } else {
            applyCategory();
        }

        return true;
    };

    const nextPlayer = (overridePlayer = null) => {
        let newPlayer;
        runWithHistory(() => {
            if (playerPool.length === 0) {
                setHighestBidder(null);
                setBidHistory([]);
                return;
            }

            const categoryIndices = playerPool
                .map((player, index) => (playerMatchesCategory(player, selectedCategory) ? index : -1))
                .filter((index) => index !== -1);

            if (categoryIndices.length === 0) {
                setHighestBidder(null);
                setBidHistory([]);
                return;
            }

            const currentPosition = categoryIndices.indexOf(activePlayerIndex);
            const nextPosition = currentPosition === -1 ? 0 : (currentPosition + 1) % categoryIndices.length;
            const nextIndex = categoryIndices[nextPosition];
            newPlayer = toAuctionPlayer(playerPool[nextIndex]);
            setActivePlayerIndex(nextIndex);
            setHighestBidder(null);
            setBidHistory([]);
        });
        return newPlayer;
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

    const refreshPlayerData = async () => {
        try {
            const apiBaseUrl = resolveSocketUrl();
            const response = await fetch(`${apiBaseUrl}/api/players`);
            if (!response.ok) {
                console.error('Failed to refresh player data');
                return false;
            }

            const updatedPlayers = await response.json();
            if (!Array.isArray(updatedPlayers)) {
                return false;
            }

            // Merge latest server player details while preserving local auction state.
            setPlayerPool((prevPool) => {
                const prevById = new Map(
                    prevPool.map((player) => [player?._id || player?.id, player])
                );

                return updatedPlayers.map((serverPlayer) => {
                    const playerId = serverPlayer?._id || serverPlayer?.id;
                    const previous = prevById.get(playerId);
                    if (!previous) return serverPlayer;

                    return {
                        ...serverPlayer,
                        currentBid: previous.currentBid ?? parseLakhs(previous.basePrice, 0),
                        highestBidder: previous.highestBidder ?? null,
                        status: previous.status ?? 'OPEN',
                        isClosed: previous.isClosed ?? false,
                        assignedCard: previous.assignedCard ?? null,
                        soldPrice: previous.soldPrice ?? null,
                        soldTo: previous.soldTo ?? null
                    };
                });
            });
            return true;
        } catch (error) {
            console.error('Error refreshing player data:', error);
            return false;
        }
    };

    const getAuctionSnapshot = () => getSnapshot();

    return (
        <AuctionContext.Provider value={{
            teams,
            currentPlayer,
            selectedCategory,
            availableCategories: categoriesWithFallback,
            categoryPlayers,
            highestBidder,
            bidHistory,
            auctionLogs,
            placeBid,
            sellPlayer,
            markUnsold,
            nextPlayer,
            setActiveCategory,
            undoLastAction,
            redoLastAction,
            syncAuctionState,
            getAuctionSnapshot,
            refreshPlayerData,
            canUndo: undoStackRef.current.length > 0,
            canRedo: redoStackRef.current.length > 0
        }}>
            {children}
        </AuctionContext.Provider>
    );
};
