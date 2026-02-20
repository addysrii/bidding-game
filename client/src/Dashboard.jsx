import React, { useEffect, useRef, useState } from 'react';
import './Dashboard.css';
import PlayerCard from './components/PlayerCard';
import TeamGrid from './components/TeamGrid';
import PurseMeter from './components/PurseMeter';
import SquadModal from './components/SquadModal';
import { useAuction } from './context/AuctionContext';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

const Dashboard = () => {
    const {
        teams,
        currentPlayer,
        highestBidder,
        placeBid,
        sellPlayer,
        markUnsold,
        nextPlayer,
        undoLastAction,
        redoLastAction,
        syncAuctionState
    } = useAuction();
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [myTeamId] = useState("MUM"); // Hardcoded logged-in team
    const [socketStatus, setSocketStatus] = useState('CONNECTING');
    const [lastAdminEvent, setLastAdminEvent] = useState('Waiting for admin activity...');
    const [breakEndsAt, setBreakEndsAt] = useState(null);
    const [breakSecondsLeft, setBreakSecondsLeft] = useState(0);
    const socketRef = useRef(null);

    // Derived state for My Team
    const myTeam = teams.find(t => t.id === "MUM") || { funds: "100 Cr", players: 0, roster: [] };

    // Calculate spent for My Team
    const totalPurse = 100; // Cr
    const currentFunds = parseFloat(myTeam.funds.replace(' Cr', ''));
    const spent = (totalPurse - currentFunds).toFixed(1);

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
        const socket = io(SOCKET_URL, {
            transports: ['websocket', 'polling']
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            setSocketStatus('CONNECTED');
            socket.emit('dashboard:auction-event', {
                type: 'DASHBOARD_CONNECTED',
                teamId: myTeamId,
                teamName: myTeam?.name || myTeamId,
                timestamp: new Date().toISOString()
            });
        });
        socket.on('disconnect', () => setSocketStatus('DISCONNECTED'));
        socket.on('connect_error', () => setSocketStatus('ERROR'));

        socket.on('auction:admin-event', (event = {}) => {
            if (!event?.type) return;

            if (event.type === 'BID' && event.teamId && Number.isFinite(Number(event.bidAmount))) {
                placeBid(event.teamId, Number(event.bidAmount));
            }
            if (event.type === 'SOLD') {
                sellPlayer({
                    adminName: event.adminName || 'Admin',
                    assignedCard: event.assignedCard || null
                });
            }
            if (event.type === 'UNSOLD') {
                markUnsold({ adminName: event.adminName || 'Admin' });
            }
            if (event.type === 'NEXT_PLAYER') {
                nextPlayer();
            }
            if (event.type === 'UNDO') {
                if (event.stateSnapshot) {
                    syncAuctionState(event.stateSnapshot);
                } else {
                    undoLastAction();
                }
            }
            if (event.type === 'REDO') {
                if (event.stateSnapshot) {
                    syncAuctionState(event.stateSnapshot);
                } else {
                    redoLastAction();
                }
            }
            if (event.type === 'BREAK_START') {
                const nextBreakEndsAt = Number(event.breakEndsAt) || (Date.now() + ((Number(event.durationSeconds) || 300) * 1000));
                setBreakEndsAt(nextBreakEndsAt);
            }
            if (event.type === 'BREAK_END') {
                setBreakEndsAt(null);
            }

            const eventLabel = event.type.replaceAll('_', ' ');
            setLastAdminEvent(
                `${eventLabel} | ${event.playerName || 'Player'}${event.teamName ? ` | ${event.teamName}` : ''}`
            );
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, []);

    const emitDashboardEvent = (type, extra = {}) => {
        const socket = socketRef.current;
        if (!socket || !socket.connected) return;

        socket.emit('dashboard:auction-event', {
            type,
            teamId: myTeamId,
            teamName: myTeam?.name || myTeamId,
            playerId: currentPlayer?.id || null,
            playerName: currentPlayer?.name || null,
            timestamp: new Date().toISOString(),
            ...extra
        });
    };

    const handleBid = () => {
        // Logic to increment bid. State is managed in context.
        // Assuming fixed increment for now, or dynamic based on current price
        let increment = 20;
        if (currentPlayer.currentBid >= 200) increment = 50;
        if (currentPlayer.currentBid >= 1000) increment = 100;

        const nextBid = currentPlayer.currentBid + increment;
        const ok = placeBid(myTeamId, nextBid);
        if (!ok) return;

        emitDashboardEvent('BID', { bidAmount: nextBid });
    };

    const handleSkip = () => {
        emitDashboardEvent('SKIP');
    };

    const formatTimer = (totalSeconds) => {
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <div className="header-left">
                    <h1>MUM</h1>
                    <span>Mumbai Mavericks - Team Owner Dashboard</span>
                </div>

                <div className="header-right">
                    <div className="socket-banner">
                        <span className={`socket-pill socket-pill--${socketStatus.toLowerCase()}`}>{socketStatus}</span>
                        <span className="socket-event">{lastAdminEvent}</span>
                    </div>
                    <PurseMeter total="100 Cr" spent={`${spent} Cr`} remaining={myTeam.funds} />
                </div>
            </header>

            {breakSecondsLeft > 0 && (
                <div className="break-banner">
                    <span className="break-banner-label">Break In Progress</span>
                    <strong className="break-banner-time">{formatTimer(breakSecondsLeft)}</strong>
                </div>
            )}

            <div className="player-card-container">
                <PlayerCard
                    player={currentPlayer}
                    currentBid={currentPlayer.currentBid}
                    highestBidder={highestBidder}
                    onBid={handleBid}
                    onSkip={handleSkip}
                    // onSold moved to Admin Panel
                    isMyTeamBid={highestBidder === myTeamId}
                    cardTheme={currentPlayer?.status === 'SOLD' ? currentPlayer?.assignedCard?.style : null}
                />
            </div>

            <button className="my-squad-btn" onClick={() => setSelectedTeam(myTeam)}>
                MY SQUAD ({myTeam.players})
            </button>

            <div className="team-section">
                <TeamGrid
                    teams={teams.filter(t => t.id !== myTeamId)}
                    onTeamClick={(team) => setSelectedTeam(team)}
                />
            </div>

            {selectedTeam && (
                <SquadModal
                    team={selectedTeam}
                    isMyTeam={selectedTeam.id === myTeamId}
                    onClose={() => setSelectedTeam(null)}
                />
            )}
        </div>
    );
};

export default Dashboard;
