import React, { useEffect, useRef, useState } from 'react';
import './Dashboard.css';
import { useAuction } from './context/AuctionContext';
import { getSocket } from './socket';
import TeamGrid from './components/TeamGrid';
import SquadModal from './components/SquadModal';
import { motion, AnimatePresence } from 'framer-motion';

const Dashboard = () => {
    const ACTION_OVERLAY_DURATION_MS = 1500;

    function formatCategory(category) {
        if (!category) return '—';
        const c = String(category).trim();
        const bats = ['Star_Indian_Batter', 'Foreign_Batters', 'Normal_Indian_Batters'];
        const bowlers = ['Indian_Fast_Bowlers', 'Foreign_Fast_Bowlers', 'Indian_Spinners', 'Foreign_Spinners'];
        const allround = ['All_Rounders_Indian', 'Foreign_All_Rounders'];
        const keepers = ['Indian_Wicketkeepers', 'Foreign_Wicket_Keepers'];

        if (bats.includes(c)) return 'BATSMEN';
        if (bowlers.includes(c)) return 'BOWLER';
        if (allround.includes(c)) return 'ALL-ROUNDER';
        if (keepers.includes(c)) return 'WICKET-KEEPER';

        return c.toUpperCase();
    }

    const {
        teams,
        currentPlayer,
        selectedCategory,
        categoryPlayers,
        auctionSummary,
        highestBidder,
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
        refreshPlayerData
    } = useAuction();
    const [myTeamId] = useState("MUM"); // Hardcoded logged-in team
    const [breakEndsAt, setBreakEndsAt] = useState(null);
    const [breakSecondsLeft, setBreakSecondsLeft] = useState(0);
    const [showTeamsView, setShowTeamsView] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [notification, setNotification] = useState(null);
    const teamsSectionRef = useRef(null);
    const auctionActionsRef = useRef({});
    const overlayTimerRef = useRef(null);
    const [actionOverlay, setActionOverlay] = useState(null);

    const scrollToTeams = () => {
        teamsSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Derived state for My Team
    const myTeam = teams.find(t => t.id === "MUM") || { funds: "100 Cr", players: 0, roster: [] };
    const highestBidTeam = teams.find((team) => team.id === highestBidder) || null;

    const currentBidPoints = Number(currentPlayer?.currentBid || 0);

    useEffect(() => {
        auctionActionsRef.current = {
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
            refreshPlayerData
        };
    }, [placeBid, sellPlayer, markUnsold, redoSoldToUnsold, nextPlayer, previousPlayer, resetAuction, setActiveCategory, undoLastAction, redoLastAction, syncAuctionState, refreshPlayerData]);

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

    useEffect(() => {
        return () => {
            if (overlayTimerRef.current) {
                clearTimeout(overlayTimerRef.current);
            }
        };
    }, []);

    // Periodic refresh of player data - updates every 3 seconds


    const showActionAnimation = (type, message) => {
        if (overlayTimerRef.current) {
            clearTimeout(overlayTimerRef.current);
        }
        setActionOverlay({ type, message });
        overlayTimerRef.current = setTimeout(() => {
            setActionOverlay(null);
        }, ACTION_OVERLAY_DURATION_MS);
    };

    useEffect(() => {
        const socket = getSocket();

        const onConnect = () => {
            socket.emit('dashboard:auction-event', {
                type: 'DASHBOARD_CONNECTED',
                teamId: myTeamId,
                teamName: myTeam?.name || myTeamId,
                timestamp: new Date().toISOString()
            });
        };

    const onAdminEvent = (event = {}) => {
  if (!event?.type) return;

  const actions = auctionActionsRef.current;

  switch (event.type) {
    case 'BID':
      if (event.player) {
        actions.syncAuctionState?.({
          currentPlayer: event.player,
          highestBidder: event.teamId
        });
      }
      break;

    case 'SOLD':
      actions.sellPlayer?.({
        adminName: event.adminName || 'Admin',
        assignedCard: event.assignedCard,
        player: event.player,
        persist: false
      });
      showActionAnimation('SOLD', `SOLD TO ${event.teamName}`);
      break;

    case 'UNSOLD':
      actions.markUnsold?.({ persist: false });
      showActionAnimation('UNSOLD', 'PLAYER UNSOLD');
      break;

    case 'REDO_SOLD_TO_UNSOLD':
      actions.redoSoldToUnsold?.({ persist: false });
      showActionAnimation('REOPEN', 'PLAYER REOPENED');
      break;

    case 'NEXT_PLAYER':
      actions.nextPlayer?.();
      break;

    case 'PREVIOUS_PLAYER':
      actions.previousPlayer?.();
      break;

    case 'UNDO':
    case 'REDO':
    case 'RESET_AUCTION':
      if (event.stateSnapshot) {
        actions.syncAuctionState?.(event.stateSnapshot);
      }
      break;

    case 'BREAK_START':
      setBreakEndsAt(event.breakEndsAt);
      break;

    case 'BREAK_END':
      setBreakEndsAt(null);
      break;

    case 'CATEGORY_CHANGED':
      actions.setActiveCategory?.(event.category);
      break;

    default:
      break;
  }
};

        socket.on('connect', onConnect);
        socket.on('auction:admin-event', onAdminEvent);

        if (socket.connected) {
            onConnect();
        }

        return () => {
            socket.off('connect', onConnect);
            socket.off('auction:admin-event', onAdminEvent);
        };
    }, [refreshPlayerData]);

    const formatTimer = (totalSeconds) => {
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    const formatBasePrice = (basePrice) => {
        if (!basePrice) return '0 PTS';
        const match = String(basePrice).match(/([0-9.]+)/);
        const valuePoints = match ? Number(match[1]) : 0;
        return `${valuePoints.toLocaleString('en-IN')} PTS`;
    };

    return (
        <div className="dashboard-container projector-dashboard">
            <header className="dashboard-header">
                <div className="header-left">
                    <div className="logo-text">BIDDING <span>BATTLE</span></div>
                </div>

                <div className="header-right">
                    <div className="view-toggle-container">
                        <button
                            className={`view-toggle-btn ${showTeamsView ? 'back-btn' : ''}`}
                            onClick={() => setShowTeamsView(!showTeamsView)}
                        >
                            {showTeamsView ? '← BACK TO AUCTION' : (breakSecondsLeft > 0 ? `BREAK ${formatTimer(breakSecondsLeft)}` : 'SHOW TEAM SQUADS')}
                        </button>
                    </div>
                </div>
            </header>

            {showTeamsView ? (
                <div className="teams-view-screen">
                    <TeamGrid
                        teams={teams}
                        onTeamClick={setSelectedTeam}
                        title="TEAM SQUADS OVERVIEW"
                        hidePurse={true}
                    />
                </div>
            ) : (
                <>
                    <section className="dashboard-category-strip">
                        <div className="dashboard-category-head">
                            <span className="dashboard-category-title">
                                {selectedCategory} PLAYERS ({auctionSummary.total}) | SOLD: {auctionSummary.sold} | UNSOLD: {auctionSummary.unsold} | OPEN: {auctionSummary.open}
                            </span>
                        </div>

                    </section>

                    <div className="projector-main">
                        <div className="center-stage-wrapper" style={{ gridColumn: '1', position: 'relative' }}>
                            <AnimatePresence mode="wait">
                                <motion.section
                                    key={currentPlayer?.id || 'none'}
                                    className="player-details-panel"
                                    initial={{ opacity: 0, scale: 0.9, y: 50 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: -50 }}
                                    transition={{ duration: 0.2, type: "spring", stiffness: 300, damping: 25 }}
                                >
                                    <div className="player-image-frame">
                                        {currentPlayer?.image ? (
                                            <img src={currentPlayer.image} alt={currentPlayer?.name || 'Player'} />
                                        ) : (
                                            <div className="player-image-placeholder-modern">👤</div>
                                        )}
                                    </div>
                                    <div className="player-text-info">
                                        <h1>{(currentPlayer?.name || 'No Active Player').toUpperCase()}</h1>
                                        <div className="stats-grid">
                                            <div className="stat-item">
                                                <span className="stat-label">Base Price</span>
                                                <span className="stat-value">{formatBasePrice(currentPlayer?.basePrice)}</span>
                                            </div>
                                            {/* <div className="stat-item">
                                                <span className="stat-label">Country</span>
                                                <span className="stat-value">{(currentPlayer?.country || '—').toUpperCase()}</span>
                                            </div> */}
                                            <div className="stat-item">
                                                <span className="stat-label">Role</span>
                                                <span className="stat-value">{formatCategory(currentPlayer?.category)}</span>
                                            </div>
                                            <div className="stat-item">
                                                <span className="stat-label">Player Rating</span>
                                                <span className="stat-value">{currentPlayer?.rating || '9.5/10'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </motion.section>
                            </AnimatePresence>
                        </div>

                        <section className="bid-details-panel">
                            <div className="bid-box current-bid-box">
                                <span className="box-label">Current Bid</span>
                                <div className="bid-amount">{currentBidPoints} PTS</div>
                            </div>

                            <div className="bid-box team-box">
                                <span className="box-label">Highest Bid</span>
                                <div className="team-name">{highestBidTeam?.name || 'No Bidder Yet'}</div>
                                <div className="team-logo-small">{highestBidTeam?.code || '—'}</div>
                            </div>
                        </section>

                        <div className="projector-footer-hint">
                            Press 'S' for SOLD | Press 'U' for UNSOLD
                        </div>
                    </div>
                </>
            )}

            {selectedTeam && (
                <SquadModal
                    team={selectedTeam}
                    isMyTeam={false}
                    isAdmin={false} z
                    onClose={() => setSelectedTeam(null)}
                />
            )}

            <AnimatePresence>
                {actionOverlay && (
                    <motion.div
                        className={`dashboard-action-overlay ${actionOverlay.type.toLowerCase()}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div className="dashboard-action-overlay-card">
                            <div className="overlay-title">
                                {actionOverlay.type === 'SOLD' ? 'PLAYER SOLD' :
                                    actionOverlay.type === 'REOPEN' ? 'PLAYER REOPENED' : 'PLAYER UNSOLD'}
                            </div>
                            <div className="overlay-msg">{actionOverlay.message}</div>
                            {actionOverlay.type === 'SOLD' && currentPlayer && (
                                <div className="overlay-player">
                                    {currentPlayer.name}
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Dashboard;
