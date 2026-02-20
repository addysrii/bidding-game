import React, { useMemo, useState, useEffect, useRef } from 'react';
import './Dashboard.css'; // Reuse basic dashboard layout styles
import './AdminPanel.css';
import PlayerCard from './components/PlayerCard';
import TeamGrid from './components/TeamGrid';
import SquadModal from './components/SquadModal';
import { useAuction } from './context/AuctionContext';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';

const ADMIN_NAME = 'Admin-1';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'https://ipl-auction-user.onrender.com';
const DEFAULT_BREAK_SECONDS = 300;

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
        highestBidder,
        auctionLogs,
        placeBid,
        sellPlayer,
        markUnsold,
        nextPlayer,
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
    const socketRef = useRef(null);

    const winningTeam = teams.find((team) => team.id === highestBidder) || null;
    const teamCardOptions = useMemo(() => getTeamCardOptions(winningTeam), [winningTeam]);
    const selectedCard = useMemo(
        () => teamCardOptions.find((card) => card.id === selectedCardId) || null,
        [teamCardOptions, selectedCardId]
    );

    const walletBefore = parseFloat((winningTeam?.funds || '0').replace(' Cr', '')) || 0;
    const bidInCr = (currentPlayer?.currentBid || 0) / 100;
    const hasInsufficientWallet = winningTeam ? walletBefore < bidInCr : false;
    const isPlayerLocked = currentPlayer?.isClosed;
    const isSold = currentPlayer?.status === 'SOLD';
    const isBreakActive = breakSecondsLeft > 0;

    useEffect(() => {
        document.documentElement.classList.add('admin-page');
        document.body.classList.add('admin-page');
        return () => {
            document.documentElement.classList.remove('admin-page');
            document.body.classList.remove('admin-page');
        };
    }, []);

    useEffect(() => {
        const socket = io(SOCKET_URL, {
            transports: ['websocket', 'polling']
        });

        socketRef.current = socket;

        socket.on('connect', () => setSocketStatus('CONNECTED'));
        socket.on('disconnect', () => setSocketStatus('DISCONNECTED'));
        socket.on('connect_error', () => setSocketStatus('ERROR'));
        socket.on('auction:dashboard-event', (event = {}) => {
            if (!event?.type) return;
            const eventLabel = event.type.replaceAll('_', ' ');
            setLastDashboardEvent(
                `${eventLabel} | ${event.teamName || event.teamId || 'Dashboard'}`
            );
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
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

    const getBidIncrement = (bid) => {
        if (bid >= 1000) return 100;
        if (bid >= 200) return 50;
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
            bidAmount: nextBidValue
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
                    `Insufficient wallet for ${winningTeam?.name}. Required ${bidInCr.toFixed(2)} Cr, available ${walletBefore.toFixed(2)} Cr.`
                );
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
        emitAdminEvent('UNSOLD');
    };

    const handleNextPlayer = () => {
        nextPlayer();
        emitAdminEvent('NEXT_PLAYER');
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

    return (
        <div className="dashboard-container admin-container">
            <header className="dashboard-header admin-header">
                <div className="header-left">
                    <h1>ADMIN</h1>
                    <span>Tournament Control Center</span>
                </div>
                <div className="header-right">
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

                        <div className="active-bid-entry">
                            <div className="active-bid-entry__meta">
                                <span>{currentPlayer?.name || 'No active player'}</span>
                                <span>{currentPlayer?.currentBid || 0} L</span>
                                <span>{winningTeam?.name || 'No bidder'}</span>
                                <span className={`bid-lock-state ${isPlayerLocked ? 'locked' : 'open'}`}>
                                    {isPlayerLocked ? 'LOCKED' : 'OPEN'}
                                </span>
                            </div>
                        </div>

                        <div className="admin-controls-bar">
                            <button
                                className="control-btn unsold-btn"
                                onClick={handleUnsold}
                                disabled={isPlayerLocked}
                            >
                                UNSOLD
                            </button>
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
                                        <span className="admin-log-price">{entry.soldAmount}</span>
                                        <span className="admin-log-team">{entry.teamName || '—'}</span>
                                        <span className="admin-log-meta">
                                            {entry.walletBefore != null ? `${entry.walletBefore.toFixed(2)} Cr -> ${entry.walletAfter.toFixed(2)} Cr` : 'Wallet: —'}
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
                            const purseNum = parseFloat((team.funds || '0').replace(' Cr', '')) || 0;
                            const initialPurse = 100;
                            const pursePercent = initialPurse > 0 ? (purseNum / initialPurse) * 100 : 0;
                            return (
                                <div key={team.id} className="team-purse-container">
                                    <div className="team-purse-display">
                                        <div className="purse-info">
                                            <span className="team-name-label" style={{ color: team.color }}>
                                                {team.name}
                                            </span>
                                            <div className="purse-amount">
                                                <span className="currency">₹</span>
                                                <span className="amount">{purseNum.toLocaleString('en-IN')}</span>
                                                <span className="label">Cr</span>
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
                                {currentPlayer?.name} to {winningTeam?.name} at {currentPlayer?.currentBid} L
                            </p>
                            <div className="sell-wallet-line">
                                Wallet: {walletBefore.toFixed(2)} Cr | Required: {bidInCr.toFixed(2)} Cr
                            </div>
                            {hasInsufficientWallet && (
                                <div className="sell-warning">
                                    Warning: insufficient wallet balance. Please adjust bidding before marking sold.
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
