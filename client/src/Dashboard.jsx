import React, { useEffect, useRef, useState } from 'react';
import './Dashboard.css';
import { useAuction } from './context/AuctionContext';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'https://ipl-auction-user.onrender.com';

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
    const [myTeamId] = useState("MUM"); // Hardcoded logged-in team
    const [breakEndsAt, setBreakEndsAt] = useState(null);
    const [breakSecondsLeft, setBreakSecondsLeft] = useState(0);
    const socketRef = useRef(null);

    // Derived state for My Team
    const myTeam = teams.find(t => t.id === "MUM") || { funds: "100 Cr", players: 0, roster: [] };
    const highestBidTeam = teams.find((team) => team.id === highestBidder) || null;

    const currentBidLakhs = Number(currentPlayer?.currentBid || 0);
    const currentBidCr = (currentBidLakhs / 100).toFixed(2);

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
            socket.emit('dashboard:auction-event', {
                type: 'DASHBOARD_CONNECTED',
                teamId: myTeamId,
                teamName: myTeam?.name || myTeamId,
                timestamp: new Date().toISOString()
            });
        });

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
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, []);

    const formatTimer = (totalSeconds) => {
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    const formatBasePrice = (basePrice) => {
        if (!basePrice) return '₹ 0.00 CR';
        const match = String(basePrice).match(/([0-9.]+)/);
        const valueLakhs = match ? Number(match[1]) : 0;
        return `₹ ${(valueLakhs / 100).toFixed(2)} CR`;
    };

    return (
        <div className="dashboard-container projector-dashboard">
            <header className="dashboard-header">
                <div className="header-left">
                    <div className="logo-text">BIDDING <span>BATTLE</span></div>
                </div>

                <div className="header-right">
                    <div className={`live-indicator ${breakSecondsLeft > 0 ? 'break' : ''}`}>
                        {breakSecondsLeft > 0 ? `BREAK ${formatTimer(breakSecondsLeft)}` : 'BIDDING OPEN'}
                    </div>
                </div>
            </header>

            <div className="projector-main">
                <section className="player-details-panel">
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
                            <div className="stat-item">
                                <span className="stat-label">Country</span>
                                <span className="stat-value">{(currentPlayer?.country || '—').toUpperCase()}</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">Role</span>
                                <span className="stat-value">{(currentPlayer?.role || '—').toUpperCase()}</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">Player Rating</span>
                                <span className="stat-value">{currentPlayer?.rating || '9.5/10'}</span>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="bid-details-panel">
                    <div className="bid-box current-bid-box">
                        <span className="box-label">Current Bid</span>
                        <div className="bid-amount">₹ {currentBidCr} CR</div>
                    </div>

                    <div className="bid-box team-box">
                        <span className="box-label">Highest Bid</span>
                        <div className="team-name">{highestBidTeam?.name || 'No Bidder Yet'}</div>
                        <div className="team-logo-small">{highestBidTeam?.code || '—'}</div>
                    </div>
                </section>
            </div>
            <div className="projector-footer-hint">
                Press 'S' for SOLD | Press 'U' for UNSOLD
            </div>
        </div>
    );
};

export default Dashboard;
