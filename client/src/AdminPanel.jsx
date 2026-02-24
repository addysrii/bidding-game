import React, { useMemo, useState, useEffect, useRef } from 'react';
import './Dashboard.css'; // Reuse basic dashboard layout styles
import './AdminPanel.css';
import PlayerCard from './components/PlayerCard';
import TeamGrid from './components/TeamGrid';
import SquadModal from './components/SquadModal';
import { useAuction } from './context/AuctionContext';
import { motion, AnimatePresence } from 'framer-motion';
import { getSocket } from './socket';

const ADMIN_NAME = 'Admin-1';
const DEFAULT_BREAK_SECONDS = 300;
const PLAYER_NAME_CACHE_KEY = 'admin_player_name_cache_v1';
const INITIAL_POINTS = 1000000;

const parseFundsCr = (funds) => parseFloat(String(funds || '0').replace(/[^0-9.\-]/g, '')) || 0;
const toPoints = (valueCr) => Math.round(Number(valueCr || 0) * 100);
const formatPoints = (value) => `${Number(value || 0).toLocaleString('en-IN')} PTS`;

const getTeamCardOptions = (team) => {
    if (!team) return [];
    return [
        {
            id: `${team.id}-classic`,
            label: `${team.code} Classic`,
            style: {
                background: '#fafafa',
                border: `2px solid ${team.color}`,
                color: '#111111'
            }
        },
        {
            id: `${team.id}-gradient`,
            label: `${team.code} Gradient`,
            style: {
                background: `linear-gradient(135deg, ${team.color}22, #fafafa 70%)`,
                border: `2px solid ${team.color}`,
                color: '#111111'
            }
        },
        {
            id: `${team.id}-dark`,
            label: `${team.code} Night`,
            style: {
                background: `linear-gradient(140deg, #111111, ${team.color}99)`,
                border: `2px solid ${team.color}`,
                color: '#ffffff'
            }
        }
    ];
};

const AdminPanel = () => {
    const {
        teams,
        currentPlayer,
        selectedCategory,
        availableCategories,
        categoryPlayers,
        auctionSummary,
        highestBidder,
        auctionLogs,
        placeBid,
        sellPlayer,
        markUnsold,
        redoSoldToUnsold,
        refreshPlayerData,
        nextPlayer,
        previousPlayer,
        resetAuction,
        setActiveCategory,
        undoLastAction,
        redoLastAction,
        canUndo,
        canRedo
    } = useAuction();
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [notification, setNotification] = useState(null);
    const [showSellModal, setShowSellModal] = useState(false);
    const [selectedCardId, setSelectedCardId] = useState(null);
    const [sellError, setSellError] = useState('');
    const [socketStatus, setSocketStatus] = useState('CONNECTING');
    const [lastDashboardEvent, setLastDashboardEvent] = useState('No dashboard events yet');
    const [breakEndsAt, setBreakEndsAt] = useState(null);
    const [breakSecondsLeft, setBreakSecondsLeft] = useState(0);
    const [playerNameCache, setPlayerNameCache] = useState({});
    const socketRef = useRef(null);

    const winningTeam = teams.find((team) => team.id === highestBidder) || null;
    const teamCardOptions = useMemo(() => getTeamCardOptions(winningTeam), [winningTeam]);
    const selectedCard = useMemo(
        () => teamCardOptions.find((card) => card.id === selectedCardId) || null,
        [teamCardOptions, selectedCardId]
    );

    const walletBefore = parseFundsCr(winningTeam?.funds);
    const bidInCr = (currentPlayer?.currentBid || 0) / 100;
    const hasInsufficientWallet = winningTeam ? walletBefore < bidInCr : false;
    const walletBeforePoints = toPoints(walletBefore);
    const bidPoints = Number(currentPlayer?.currentBid || 0);
    const currentSoldStatus = String(currentPlayer?.soldStatus || currentPlayer?.status || 'OPEN').toUpperCase();
    const isPlayerLocked = currentSoldStatus !== 'OPEN';
    const isSold = currentSoldStatus === 'SOLD';
    const canReopenPlayer = currentSoldStatus === 'SOLD' || currentSoldStatus === 'UNSOLD';
    const isBreakActive = breakSecondsLeft > 0;

    useEffect(() => {
        try {
            const saved = window.localStorage.getItem(PLAYER_NAME_CACHE_KEY);
            if (!saved) return;
            const parsed = JSON.parse(saved);
            if (parsed && typeof parsed === 'object') {
                setPlayerNameCache(parsed);
            }
        } catch (error) {
            console.error('Failed to load cached player names.', error);
        }
    }, []);

    useEffect(() => {
        setPlayerNameCache((prev) => {
            const next = { ...prev };
            let changed = false;

            categoryPlayers.forEach((player) => {
                if (!player?.id) return;
                if (!next[player.id] && player?.name) {
                    next[player.id] = player.name;
                    changed = true;
                }
            });

            if (changed) {
                window.localStorage.setItem(PLAYER_NAME_CACHE_KEY, JSON.stringify(next));
                return next;
            }
            return prev;
        });
    }, [categoryPlayers]);

    useEffect(() => {
        document.documentElement.classList.add('admin-page');
        document.body.classList.add('admin-page');
        return () => {
            document.documentElement.classList.remove('admin-page');
            document.body.classList.remove('admin-page');
        };
    }, []);

    useEffect(() => {
        const socket = getSocket();
        socketRef.current = socket;

        const onConnect = () => setSocketStatus('CONNECTED');
        const onDisconnect = () => setSocketStatus('DISCONNECTED');
        const onConnectError = () => setSocketStatus('ERROR');
        const onDashboardEvent = (event = {}) => {
            if (!event?.type) return;
            const eventLabel = event.type.replaceAll('_', ' ');
            setLastDashboardEvent(
                `${eventLabel} | ${event.teamName || event.teamId || 'Dashboard'}`
            );
        };

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('connect_error', onConnectError);
        socket.on('auction:dashboard-event', onDashboardEvent);

        if (socket.connected) {
            setSocketStatus('CONNECTED');
        } else {
            setSocketStatus('CONNECTING');
        }

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('connect_error', onConnectError);
            socket.off('auction:dashboard-event', onDashboardEvent);
            if (socketRef.current === socket) {
                socketRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (!breakEndsAt) {
            setBreakSecondsLeft(0);
            return;
        }

        const updateCountdown = () => {
            const remaining = Math.max(0, Math.ceil((breakEndsAt - Date.now()) / 1000));
            setBreakSecondsLeft(remaining);
            if (remaining <= 0) {
                setBreakEndsAt(null);
            }
        };

        updateCountdown();
        const timerId = setInterval(updateCountdown, 1000);
        return () => clearInterval(timerId);
    }, [breakEndsAt]);

    const parsePriceToLakhs = (value) => {
        if (value == null) return NaN;
        if (typeof value === 'number') return value;
        if (typeof value === 'string') {
            const s = value.trim().toUpperCase();
            // e.g. "50 L", "1 CR", "0.5 CR"
            if (s.endsWith('L')) {
                const n = parseFloat(s.replace(/[^0-9.\-]/g, ''));
                return Number.isFinite(n) ? n : NaN;
            }
            if (s.endsWith('CR') || s.endsWith('CR.')) {
                const n = parseFloat(s.replace(/[^0-9.\-]/g, ''));
                return Number.isFinite(n) ? n * 100 : NaN;
            }
            // Fallback: try number parse
            const n = parseFloat(s.replace(/[^0-9.\-]/g, ''));
            return Number.isFinite(n) ? n : NaN;
        }
        return NaN;
    };

    const getBidIncrement = (bid) => {
        // bid is expected in lakhs (L). Prefer bid-driven increments.
        const b = Number(bid || 0);
        if (Number.isFinite(b)) {
            if (b >= 1000) return 100; // 10 Cr+
            if (b >= 200) return 50;   // 2 Cr+
            if (b >= 100) return 10;   // 1 Cr - 2 Cr
            if (b >= 80) return 5;     // 80L - 1 Cr
        }
        // Fallback default
        return 20;
    };

    const emitAdminEvent = (type, extra = {}) => {
        const socket = socketRef.current;
        if (!socket || !socket.connected) return;

        socket.emit('admin:auction-event', {
            type,
            adminName: ADMIN_NAME,
            playerId: currentPlayer?.id || null,
            playerName: currentPlayer?.name || null,
            player: currentPlayer, // FULL PLAYER OBJECT FOR SYNC
            currentBid: currentPlayer?.currentBid || 0,
            highestBidder,
            ...extra,
            timestamp: new Date().toISOString()
        });
    };

    const handleHighestBid = (teamId) => {
        if (isPlayerLocked) return;
        const currentBidValue = Number(currentPlayer?.currentBid || 0);
        const nextBidValue = currentBidValue + getBidIncrement(currentBidValue);
        const ok = placeBid(teamId, nextBidValue);
        if (!ok) return;

        const bidTeam = teams.find((team) => team.id === teamId);
        emitAdminEvent('BID', {
            teamId,
            teamName: bidTeam?.name || teamId,
            bidAmount: nextBidValue,
            player: { ...currentPlayer, currentBid: nextBidValue } // Sync updated bid
        });
        
        // Emit player update event to refresh player data on dashboards
        emitAdminEvent('PLAYER_UPDATED', {
            playerId: currentPlayer?.id,
            playerName: currentPlayer?.name
        });
    };

    const openSellModal = (teamId = highestBidder) => {
        if (!teamId || isPlayerLocked) return;
        if (teamId !== highestBidder) return;
        setSelectedCardId(teamCardOptions[0]?.id || null);
        setSellError('');
        setShowSellModal(true);
    };

    const handleConfirmSell = () => {
        if (!selectedCard) {
            setSellError('Select a card template before confirming.');
            return;
        }

        const result = sellPlayer({
            assignedCard: selectedCard,
            adminName: ADMIN_NAME
        });

        if (!result.success) {
            if (result.reason === 'INSUFFICIENT_FUNDS') {
                setSellError(
                    `Insufficient points for ${winningTeam?.name}. Required ${formatPoints(bidPoints)}, available ${formatPoints(walletBeforePoints)}.`
                );
                return;
            }
            if (result.reason === 'TEAM_FULL') {
                setSellError(`${winningTeam?.name || 'Selected team'} already has 6 players. Team limit reached.`);
                return;
            }
            setSellError('Could not finalize this sale.');
            return;
        }

        setShowSellModal(false);
        emitAdminEvent('SOLD', {
            teamId: winningTeam?.id || highestBidder,
            teamName: winningTeam?.name || null,
            soldAmount: currentPlayer?.currentBid || 0,
            assignedCard: selectedCard || null
        });
    };

    const handleUnsold = () => {
        if (isPlayerLocked) return;
        markUnsold({ adminName: ADMIN_NAME });
        emitAdminEvent('UNSOLD', { playerName: currentPlayer?.name });
    };

    const handleRedoSoldToUnsold = () => {
        if (!canReopenPlayer) return;
        const changed = redoSoldToUnsold({ adminName: ADMIN_NAME });
        if (!changed) return;
        emitAdminEvent('REDO_SOLD_TO_UNSOLD', { playerName: currentPlayer?.name, soldStatus: 'OPEN' });
        refreshPlayerData?.();
    };

    const handleNextPlayer = () => {
        const newPlayer = nextPlayer();
        emitAdminEvent('NEXT_PLAYER', { player: newPlayer });
    };

    const handlePreviousPlayer = () => {
        const newPlayer = previousPlayer();
        emitAdminEvent('PREVIOUS_PLAYER', { player: newPlayer });
    };

    const handleResetAuction = async () => {
        const shouldReset = window.confirm('Reset all auction data? This will clear sold status, bids, logs and team rosters.');
        if (!shouldReset) return;

        const result = await resetAuction();
        if (!result?.success) {
            window.alert('Failed to reset auction data.');
            return;
        }

        setSelectedTeam(null);
        setShowSellModal(false);
        setSellError('');
        setPlayerNameCache({});
        window.localStorage.removeItem(PLAYER_NAME_CACHE_KEY);

        emitAdminEvent('RESET_AUCTION', {
            stateSnapshot: result.snapshot || null
        });
    };

    const handleUndo = () => {
        const snapshot = undoLastAction();
        if (!snapshot) return;
        emitAdminEvent('UNDO', { stateSnapshot: snapshot });
    };

    const handleRedo = () => {
        const snapshot = redoLastAction();
        if (!snapshot) return;
        emitAdminEvent('REDO', { stateSnapshot: snapshot });
    };

    const formatTimer = (totalSeconds) => {
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    const handleStartBreak = () => {
        const nextBreakEndsAt = Date.now() + (DEFAULT_BREAK_SECONDS * 1000);
        setBreakEndsAt(nextBreakEndsAt);
        emitAdminEvent('BREAK_START', {
            durationSeconds: DEFAULT_BREAK_SECONDS,
            breakEndsAt: nextBreakEndsAt
        });
    };

    const handleEndBreak = () => {
        setBreakEndsAt(null);
        emitAdminEvent('BREAK_END');
    };

    const handleCategoryChange = (event) => {
        const nextCategory = event.target.value;
        setActiveCategory(nextCategory, { withHistory: true });
        emitAdminEvent('CATEGORY_CHANGED', { category: nextCategory });
    };

    return (
        <div className="dashboard-container admin-container">
            <header className="dashboard-header admin-header">
                <div className="header-left">
                    <h1>ADMIN</h1>
                    <span>Tournament Control Center</span>
                </div>
                <div className="header-right">
                    <div className="category-switcher">
                        <label htmlFor="admin-category">Category</label>
                        <select
                            id="admin-category"
                            value={selectedCategory}
                            onChange={handleCategoryChange}
                        >
                            {availableCategories.map((category) => (
                                <option key={category} value={category}>
                                    {category}
                                </option>
                            ))}
                        </select>
                    </div>
                    <span className={`socket-status socket-status--${socketStatus.toLowerCase()}`}>
                        {socketStatus}
                    </span>
                    <span className="socket-peer-event">{lastDashboardEvent}</span>
                    <button
                        className={`control-btn break-btn ${isBreakActive ? 'active' : ''}`}
                        onClick={isBreakActive ? handleEndBreak : handleStartBreak}
                    >
                        {isBreakActive ? `END BREAK ${formatTimer(breakSecondsLeft)}` : 'START BREAK'}
                    </button>
                    <button className="control-btn prev-btn" onClick={handlePreviousPlayer}>
                        PREVIOUS PLAYER
                    </button>
                    <button className="control-btn next-btn" onClick={handleNextPlayer}>
                        NEXT PLAYER
                    </button>
                </div>
            </header>

            <div className="admin-main-layout centered-layout">
                <div className="admin-stage-row">
                    <div className="center-stage">
                        <div className="card-animation-container">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={currentPlayer ? currentPlayer.id : 'empty'}
                                    initial={{ opacity: 0, scale: 0.9, y: 50 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: -50 }}
                                    transition={{ duration: 0.2, type: "spring", stiffness: 300, damping: 25 }}
                                    style={{ width: '100%' }}
                                >
                                    <PlayerCard
                                        player={currentPlayer}
                                        currentBid={currentPlayer?.currentBid}
                                        highestBidder={highestBidder ? (teams.find(t => t.id === highestBidder)?.name ?? highestBidder) : null}
                                        isAdmin={true}
                                        cardTheme={isSold ? currentPlayer?.assignedCard?.style : null}
                                    />
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        <div className="admin-controls-bar">
                            <button
                                className="control-btn unsold-btn"
                                onClick={handleUnsold}
                                disabled={isPlayerLocked}
                            >
                                UNSOLD
                            </button>
                            <button
                                className="control-btn redo-unsold-btn"
                                onClick={handleRedoSoldToUnsold}
                                disabled={!canReopenPlayer}
                            >
                                REOPEN PLAYER
                            </button>
                        </div>

                        <div className="category-player-strip">
                            <div className="category-player-strip__title">
                                {selectedCategory} Players ({auctionSummary.total}) | Sold: {auctionSummary.sold} | Unsold: {auctionSummary.unsold} | Open: {auctionSummary.open}
                            </div>
                            <div className="category-player-strip__list">
                                {categoryPlayers.length === 0 ? (
                                    <span className="category-player-chip empty">No players in this category.</span>
                                ) : (
                                    categoryPlayers.map((player) => {
                                        const soldStatus = String(player?.soldStatus || player?.status || 'OPEN').toUpperCase();
                                        const playerName = playerNameCache[player.id] || player.name;
                                        return (
                                            <span
                                                key={player.id}
                                                className={`category-player-chip status-${soldStatus.toLowerCase()} ${currentPlayer?.id === player.id ? 'active' : ''}`}
                                            >
                                                <span>{playerName}</span>
                                                <span className="category-player-chip__status">{soldStatus}</span>
                                            </span>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="admin-log-card">
                        <div className="admin-log-head">
                            <h3 className="admin-log-title">Auction Log</h3>
                            <div className="admin-log-actions">
                                <button
                                    type="button"
                                    className="admin-log-btn"
                                    onClick={handleUndo}
                                    disabled={!canUndo}
                                >
                                    UNDO
                                </button>
                                <button
                                    type="button"
                                    className="admin-log-btn"
                                    onClick={handleRedo}
                                    disabled={!canRedo}
                                >
                                    REDO
                                </button>
                            </div>
                        </div>
                        <div className="admin-log-list">
                            {auctionLogs.length === 0 ? (
                                <p className="admin-log-empty">No activity yet.</p>
                            ) : (
                                auctionLogs.map(entry => (
                                    <div key={entry.id} className={`admin-log-entry admin-log-entry--${entry.type.toLowerCase()}`}>
                                        <span className="admin-log-player">{entry.playerName}</span>
                                        <span className="admin-log-status">{entry.type}</span>
                                        <span className="admin-log-price">{formatPoints(parseFloat(String(entry.soldAmount || 0).replace(/[^0-9.\-]/g, '')) || 0)}</span>
                                        <span className="admin-log-team">{entry.teamName || '—'}</span>
                                        <span className="admin-log-meta">
                                            {entry.walletBefore != null ? `${formatPoints(toPoints(entry.walletBefore))} -> ${formatPoints(toPoints(entry.walletAfter))}` : 'Points: —'}
                                        </span>
                                        <span className="admin-log-meta">Card: {entry.cardAssigned || '—'}</span>
                                        <span className="admin-log-meta">By: {entry.adminName || 'Admin'}</span>
                                        <span className="admin-log-meta">
                                            {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : '—'}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <div className="teams-section-full">
                    <h2>Team Overview</h2>
                    <div className="teams-with-purse">
                        {teams.map(team => {
                            const purseNum = parseFundsCr(team.funds);
                            const pursePoints = toPoints(purseNum);
                            const pursePercent = INITIAL_POINTS > 0 ? (pursePoints / INITIAL_POINTS) * 100 : 0;
                            return (
                                <div key={team.id} className="team-purse-container">
                                    <div className="team-purse-display">
                                        <div className="purse-info">
                                            <span className="team-name-label" style={{ color: team.color }}>
                                                {team.name}
                                            </span>
                                            <div className="purse-amount">
                                                <span className="amount">{pursePoints.toLocaleString('en-IN')}</span>
                                                <span className="label">PTS</span>
                                            </div>
                                            <div className="purse-bar">
                                                <div
                                                    className="purse-fill"
                                                    style={{
                                                        width: `${Math.min(pursePercent, 100)}%`,
                                                        background: `linear-gradient(90deg, ${team.color}dd, ${team.color})`
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div
                                        className="team-card-wrapper"
                                        onClick={() => setSelectedTeam(team)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <TeamGrid
                                            teams={[team]}
                                            onTeamClick={(t) => setSelectedTeam(t)}
                                            title={null}
                                        />
                                    </div>
                                    <div className="team-card-actions">
                                        <button
                                            type="button"
                                            className="team-action-btn team-action-btn--highest"
                                            onClick={() => handleHighestBid(team.id)}
                                            disabled={isPlayerLocked}
                                        >
                                            HIGHEST BID
                                        </button>
                                        <button
                                            type="button"
                                            className="team-action-btn team-action-btn--sold"
                                            onClick={() => openSellModal(team.id)}
                                            disabled={isPlayerLocked || highestBidder !== team.id}
                                        >
                                            MARK AS SOLD
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="admin-footer-actions">
                <button className="control-btn reset-btn" onClick={handleResetAuction}>
                    RESET AUCTION DATA
                </button>
            </div>

            <AnimatePresence>
                {notification && (
                    <motion.div
                        className="notification-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="notification-content"
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1.2, opacity: 1 }}
                            exit={{ scale: 1.5, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        >
                            <h1 style={{ color: notification.color, textShadow: `0 0 50px ${notification.color}` }}>
                                {notification.message}
                            </h1>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showSellModal && (
                    <motion.div
                        className="modal-backdrop sell-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowSellModal(false)}
                    >
                        <motion.div
                            className="sell-modal"
                            initial={{ y: 24, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 24, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3>Finalize Sale</h3>
                            <p>
                                {currentPlayer?.name} to {winningTeam?.name} at {formatPoints(currentPlayer?.currentBid || 0)}
                            </p>
                            <div className="sell-wallet-line">
                                Points: {formatPoints(walletBeforePoints)} | Required: {formatPoints(bidPoints)}
                            </div>
                            {hasInsufficientWallet && (
                                <div className="sell-warning">
                                    Warning: insufficient points balance. Please adjust bidding before marking sold.
                                </div>
                            )}

                            <div className="card-template-grid">
                                {teamCardOptions.map((card) => (
                                    <button
                                        type="button"
                                        key={card.id}
                                        className={`card-template-item ${selectedCardId === card.id ? 'selected' : ''}`}
                                        onClick={() => setSelectedCardId(card.id)}
                                    >
                                        <span>{card.label}</span>
                                    </button>
                                ))}
                            </div>

                            <div className="card-preview">
                                <div className="card-preview-shell" style={selectedCard?.style || {}}>
                                    <strong>{currentPlayer?.name}</strong>
                                    <span>{winningTeam?.code} PLAYER CARD</span>
                                </div>
                            </div>

                            {sellError && <div className="sell-error">{sellError}</div>}

                            <div className="sell-actions">
                                <button className="control-btn unsold-btn" onClick={() => setShowSellModal(false)}>
                                    Cancel
                                </button>
                                <button
                                    className="control-btn sold-btn"
                                    onClick={handleConfirmSell}
                                    disabled={hasInsufficientWallet}
                                >
                                    Confirm SOLD
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {selectedTeam && (
                <SquadModal
                    team={selectedTeam}
                    isMyTeam={false}
                    isAdmin={true}
                    onClose={() => setSelectedTeam(null)}
                />
            )}
        </div>
    );
};

export default AdminPanel;
