import React, { createContext, useEffect, useRef, useState, useContext } from 'react';
import { teams as initialTeams } from '../mockData';
import { resolveSocketUrl } from '../socketUrl';

const AuctionContext = createContext();

const TEAMS_CACHE_KEY = 'auction_teams_cache_v1';

const getDefaultTeams = () => initialTeams.map((team) => ({
    ...team,
    roster: team.roster || []
}));

const hydrateTeamsFromStorage = () => {
    const defaultTeams = getDefaultTeams();

    if (typeof window === 'undefined') {
        return defaultTeams;
    }

    try {
        const savedTeams = window.localStorage.getItem(TEAMS_CACHE_KEY);
        if (!savedTeams) return defaultTeams;

        const parsedTeams = JSON.parse(savedTeams);
        if (!Array.isArray(parsedTeams)) return defaultTeams;

        const cachedById = new Map(parsedTeams
            .filter((team) => team && team.id)
            .map((team) => [team.id, team]));

        return defaultTeams.map((team) => {
            const cachedTeam = cachedById.get(team.id);
            if (!cachedTeam) return team;

            return {
                ...team,
                ...cachedTeam,
                roster: Array.isArray(cachedTeam.roster) ? cachedTeam.roster : []
            };
        });
    } catch (error) {
        console.error('Failed to load cached team data.', error);
        return defaultTeams;
    }
};

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

const getStandardRole = (category) => {
    if (!category) return 'BATSMEN';
    const c = String(category).trim();
    const bats = ['Star_Indian_Batter', 'Foreign_Batters', 'Normal_Indian_Batters'];
    const bowlers = ['Indian_Fast_Bowlers', 'Foreign_Fast_Bowlers', 'Indian_Spinners', 'Foreign_Spinners'];
    const allround = ['All_Rounders_Indian', 'Foreign_All_Rounders'];
    const keepers = ['Indian_Wicketkeepers', 'Foreign_Wicket_Keepers'];

    if (bats.includes(c)) return 'BATSMEN';
    if (bowlers.includes(c)) return 'BOWLER';
    if (allround.includes(c)) return 'ALL-ROUNDER';
    if (keepers.includes(c)) return 'WICKET-KEEPER';

    return 'BATSMEN'; // Default fallback
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

const normalizeSoldStatus = (value) => {
    const normalized = String(value || 'OPEN').trim().toUpperCase();
    if (normalized === 'SOLD' || normalized === 'UNSOLD') return normalized;
    return 'OPEN';
};

const toAuctionPlayer = (player) => {
    const basePriceLakhs = parseLakhs(player?.basePrice, 0);
    const currentBidLakhs = parseLakhs(player?.currentBid, basePriceLakhs);
    const soldStatus = normalizeSoldStatus(player?.soldStatus || player?.status);

    const standardRole = getStandardRole(player?.category);

    return {
        id: player?._id || player?.id,
        name: player?.name || 'Unknown Player',
        country: player?.country || 'IND',
        role: standardRole,
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
        isClosed: soldStatus !== 'OPEN',
        soldStatus,
        status: soldStatus,
        soldTo: player?.soldTo ?? null,
        soldPrice: player?.soldPrice ?? null,
        assignedCard: player?.assignedCard || null
    };
};

export const AuctionProvider = ({ children }) => {
    const [playerPool, setPlayerPool] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('ALL');
    const [activePlayerIndex, setActivePlayerIndex] = useState(0);
    const [teams, setTeams] = useState(() => hydrateTeamsFromStorage());
    const [highestBidder, setHighestBidder] = useState(null);
    const [bidHistory, setBidHistory] = useState([]);
    const [auctionLogs, setAuctionLogs] = useState([]);
    const [, setHistoryVersion] = useState(0);
    const undoStackRef = useRef([]);
    const redoStackRef = useRef([]);
    const refreshPlayerDataPromiseRef = useRef(null);

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
                setHighestBidder(
                    firstCategoryIndex >= 0
                        ? toAuctionPlayer(data[firstCategoryIndex])?.highestBidder ?? null
                        : null
                );
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

    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            window.localStorage.setItem(TEAMS_CACHE_KEY, JSON.stringify(teams));
        } catch (error) {
            console.error('Failed to cache team data.', error);
        }
    }, [teams]);

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

    const auctionSummary = categoryPlayers.reduce((acc, player) => {
        const soldStatus = normalizeSoldStatus(player?.soldStatus || player?.status);
        if (soldStatus === 'SOLD') acc.sold += 1;
        else if (soldStatus === 'UNSOLD') acc.unsold += 1;
        else acc.open += 1;
        acc.total += 1;
        return acc;
    }, { total: 0, sold: 0, unsold: 0, open: 0 });

    const persistAuctionState = async (playerId, payload) => {
        if (!playerId) return false;
        try {
            const apiBaseUrl = resolveSocketUrl();
            const response = await fetch(`${apiBaseUrl}/api/players/${playerId}/auction`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            return response.ok;
        } catch (error) {
            console.error('Could not persist auction state.', error);
            return false;
        }
    };

    // AuctionContext.js
const placeBid = async (teamId, bidAmount, options = {}) => {
  if (!currentPlayer) return null;

  // optimistic local update
  setState(prev => ({
    ...prev,
    currentPlayer: {
      ...prev.currentPlayer,
      currentBid: bidAmount,
      highestBidder: teamId
    },
    highestBidder: teamId
  }));

  // persist unless explicitly disabled
  if (options.persist === false) {
    return {
      ...currentPlayer,
      currentBid: bidAmount,
      highestBidder: teamId
    };
  }

  try {
    const res = await fetch(`/api/players/${currentPlayer.id}/auction`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentBid: bidAmount,
        highestBidder: teamId
      })
    });

    const updatedPlayer = await res.json();

    // sync final DB truth
    setState(prev => ({
      ...prev,
      currentPlayer: updatedPlayer,
      highestBidder: updatedPlayer.highestBidder
    }));

    return updatedPlayer;
  } catch (err) {
    console.error('Bid persist failed', err);
    return null;
  }
};

    const sellPlayer = ({ assignedCard, adminName = 'Admin', persist = true } = {}) => {
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

        const currentSquadCount = Array.isArray(winningTeam.roster)
            ? winningTeam.roster.length
            : Number(winningTeam.players || 0);
        if (currentSquadCount >= 6) {
            return {
                success: false,
                reason: 'TEAM_FULL'
            };
        }

        const walletAfter = walletBefore - costInCr;
        const soldPlayer = {
            ...currentPlayer,
            currentBid: bidAmount,
            soldPrice: `${bidAmount} L`,
            role: currentPlayer.role,
            soldTo: winningTeamId,
            soldStatus: 'SOLD',
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
                        currentBid: bidAmount,
                        highestBidder: null,
                        soldStatus: 'SOLD',
                        status: 'SOLD',
                        soldTo: winningTeamId,
                        soldPrice: `${bidAmount} L`,
                        isClosed: true,
                        assignedCard: assignedCard || null
                    };
                }
                return updatedPool;
            });
            setHighestBidder(null);
            setBidHistory([]);
        });

        if (persist) {
            persistAuctionState(currentPlayer.id, {
                currentBid: bidAmount,
                highestBidder: null,
                soldStatus: 'SOLD',
                soldTo: winningTeamId,
                soldPrice: bidAmount,
                assignedCard: assignedCard || null,
                isClosed: true
            });
        }

        return {
            success: true,
            winningTeam,
            walletBefore,
            walletAfter
        };
    };

    const markUnsold = ({ adminName = 'Admin', persist = true } = {}) => {
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
                        highestBidder: null,
                        soldStatus: 'UNSOLD',
                        status: 'UNSOLD',
                        soldTo: null,
                        soldPrice: null,
                        isClosed: true,
                        assignedCard: null
                    };
                }
                return updatedPool;
            });
            setHighestBidder(null);
            setBidHistory([]);
        });

        if (persist) {
            persistAuctionState(currentPlayer.id, {
                highestBidder: null,
                soldStatus: 'UNSOLD',
                soldTo: null,
                soldPrice: null,
                assignedCard: null,
                isClosed: true
            });
        }
        return true;
    };

    const redoSoldToUnsold = ({ adminName = 'Admin', persist = true } = {}) => {
        if (!currentPlayer) return false;
        const currentSoldStatus = normalizeSoldStatus(currentPlayer?.soldStatus || currentPlayer?.status);
        if (currentSoldStatus === 'OPEN') return false;

        runWithHistory(() => {
            const soldTeamId = currentSoldStatus === 'SOLD' ? currentPlayer?.soldTo : null;
            const soldLakhs = parseLakhs(currentPlayer?.soldPrice, currentPlayer?.currentBid || 0);
            const refundInCr = soldLakhs / 100;

            if (soldTeamId) {
                setTeams((prevTeams) => prevTeams.map((team) => {
                    if (team.id !== soldTeamId) return team;
                    return {
                        ...team,
                        funds: toFundsLabel(getFundsInCr(team.funds) + refundInCr),
                        players: Math.max((team.players || 0) - 1, 0),
                        roster: (team.roster || []).filter(
                            (rosterPlayer) => String(rosterPlayer?.id || rosterPlayer?._id) !== String(currentPlayer.id)
                        )
                    };
                }));
            }

            setAuctionLogs((prev) => [{
                id: `${currentPlayer.id}-${Date.now()}`,
                type: 'REOPEN',
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

            setPlayerPool((prevPool) => {
                const updatedPool = [...prevPool];
                if (updatedPool[activePlayerIndex]) {
                    updatedPool[activePlayerIndex] = {
                        ...updatedPool[activePlayerIndex],
                        highestBidder: null,
                        soldStatus: 'OPEN',
                        status: 'OPEN',
                        soldTo: null,
                        soldPrice: null,
                        isClosed: false,
                        assignedCard: null
                    };
                }
                return updatedPool;
            });

            setHighestBidder(null);
            setBidHistory([]);
        });

        if (persist) {
            persistAuctionState(currentPlayer.id, {
                highestBidder: null,
                soldStatus: 'OPEN',
                soldTo: null,
                soldPrice: null,
                assignedCard: null,
                isClosed: false
            });
        }
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

    const previousPlayer = () => {
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
            const previousPosition = currentPosition <= 0 ? categoryIndices.length - 1 : currentPosition - 1;
            const previousIndex = categoryIndices[currentPosition === -1 ? 0 : previousPosition];
            newPlayer = toAuctionPlayer(playerPool[previousIndex]);
            setActivePlayerIndex(previousIndex);
            setHighestBidder(null);
            setBidHistory([]);
        });
        return newPlayer;
    };

    const resetAuction = async () => {
        try {
            const apiBaseUrl = resolveSocketUrl();
            const resetResponse = await fetch(`${apiBaseUrl}/api/players/reset`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!resetResponse.ok) {
                console.error('Failed to reset auction data:', resetResponse.status);
                return { success: false };
            }

            const resetPayload = await resetResponse.json();
            const nextPlayers = Array.isArray(resetPayload?.players) ? resetPayload.players : [];
            const categories = getAvailableCategories(nextPlayers);
            const nextCategory = categories[0] || 'ALL';
            const nextActiveIndex = nextPlayers.findIndex((player) =>
                playerMatchesCategory(player, nextCategory)
            );
            const normalizedActiveIndex = nextActiveIndex >= 0 ? nextActiveIndex : 0;
            const nextHighestBidder = nextActiveIndex >= 0
                ? toAuctionPlayer(nextPlayers[nextActiveIndex])?.highestBidder ?? null
                : null;
            const nextTeams = getDefaultTeams();

            if (typeof window !== 'undefined') {
                window.localStorage.removeItem(TEAMS_CACHE_KEY);
            }

            setPlayerPool(nextPlayers);
            setSelectedCategory(nextCategory);
            setActivePlayerIndex(normalizedActiveIndex);
            setTeams(nextTeams);
            setHighestBidder(nextHighestBidder);
            setBidHistory([]);
            setAuctionLogs([]);
            undoStackRef.current = [];
            redoStackRef.current = [];
            bumpHistoryVersion();

            return {
                success: true,
                snapshot: {
                    playerPool: nextPlayers,
                    selectedCategory: nextCategory,
                    activePlayerIndex: normalizedActiveIndex,
                    teams: nextTeams,
                    currentPlayer: nextPlayers[normalizedActiveIndex] ? toAuctionPlayer(nextPlayers[normalizedActiveIndex]) : null,
                    highestBidder: nextHighestBidder,
                    bidHistory: [],
                    auctionLogs: []
                }
            };
        } catch (error) {
            console.error('Error resetting auction data:', error);
            return { success: false };
        }
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
  if (!snapshot) return;

  setState(prev => ({
    ...prev,
    ...snapshot
  }));
};
    const refreshPlayerData = async () => {
        if (refreshPlayerDataPromiseRef.current) {
            return refreshPlayerDataPromiseRef.current;
        }

        refreshPlayerDataPromiseRef.current = (async () => {
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
                            currentBid: serverPlayer.currentBid ?? previous.currentBid ?? parseLakhs(previous.basePrice, 0),
                            highestBidder: serverPlayer.highestBidder ?? previous.highestBidder ?? null,
                            soldStatus: normalizeSoldStatus(serverPlayer.soldStatus ?? previous.soldStatus ?? previous.status),
                            status: normalizeSoldStatus(serverPlayer.soldStatus ?? previous.soldStatus ?? previous.status),
                            isClosed: normalizeSoldStatus(serverPlayer.soldStatus ?? previous.soldStatus ?? previous.status) !== 'OPEN',
                            assignedCard: serverPlayer.assignedCard ?? previous.assignedCard ?? null,
                            soldPrice: serverPlayer.soldPrice ?? previous.soldPrice ?? null,
                            soldTo: serverPlayer.soldTo ?? previous.soldTo ?? null
                        };
                    });
                });
                return true;
            } catch (error) {
                console.error('Error refreshing player data:', error);
                return false;
            } finally {
                refreshPlayerDataPromiseRef.current = null;
            }
        })();

        return refreshPlayerDataPromiseRef.current;
    };

    const getAuctionSnapshot = () => getSnapshot();

    return (
        <AuctionContext.Provider value={{
            teams,
            currentPlayer,
            selectedCategory,
            availableCategories: categoriesWithFallback,
            categoryPlayers,
            auctionSummary,
            highestBidder,
            bidHistory,
            auctionLogs,
            placeBid,
            sellPlayer,
            markUnsold,
            redoSoldToUnsold,
            nextPlayer,
            previousPlayer,
            resetAuction,
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
