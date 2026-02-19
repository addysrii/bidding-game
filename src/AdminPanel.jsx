import React, { useState, useEffect } from 'react';
import './Dashboard.css'; // Reuse basic dashboard layout styles
import './AdminPanel.css';
import PlayerCard from './components/PlayerCard';
import TeamGrid from './components/TeamGrid';
import SquadModal from './components/SquadModal';
import { useAuction } from './context/AuctionContext';
import { motion, AnimatePresence } from 'framer-motion';

const AdminPanel = () => {
    const { teams, currentPlayer, highestBidder, sellPlayer, markUnsold, nextPlayer } = useAuction();
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [notification, setNotification] = useState(null);
    const [auctionLog, setAuctionLog] = useState([]);

    useEffect(() => {
        document.documentElement.classList.add('admin-page');
        document.body.classList.add('admin-page');
        return () => {
            document.documentElement.classList.remove('admin-page');
            document.body.classList.remove('admin-page');
        };
    }, []);

    const handleSell = () => {
        if (!highestBidder) return;
        const winningTeam = teams.find(t => t.id === highestBidder);
        const price = currentPlayer?.currentBid != null ? `${currentPlayer.currentBid} L` : '—';

        setAuctionLog(prev => [{
            id: Date.now(),
            playerName: currentPlayer?.name || '—',
            status: 'SOLD',
            price,
            teamName: winningTeam?.name || highestBidder,
        }, ...prev]);

        setNotification({
            type: 'SOLD',
            message: `SOLD TO ${winningTeam ? winningTeam.name.toUpperCase() : highestBidder}`,
            color: winningTeam?.color || '#22c55e'
        });

        sellPlayer();

        setTimeout(() => {
            setNotification(null);
        }, 2000);
    };

    const handleUnsold = () => {
        setAuctionLog(prev => [{
            id: Date.now(),
            playerName: currentPlayer?.name || '—',
            status: 'UNSOLD',
            price: '—',
            teamName: '—',
        }, ...prev]);
        markUnsold();
    };

    return (
        <div className="dashboard-container admin-container">
            <header className="dashboard-header admin-header">
                <div className="header-left">
                    <h1>ADMIN</h1>
                    <span>Tournament Control Center</span>
                </div>
                <div className="header-right">
                    <button className="control-btn next-btn" onClick={nextPlayer}>
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
                                    />
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        <div className="admin-controls-bar">
                            <button
                                className="control-btn sold-btn"
                                onClick={handleSell}
                                disabled={!highestBidder}
                            >
                                SOLD
                            </button>
                            <button
                                className="control-btn unsold-btn"
                                onClick={handleUnsold}
                            >
                                UNSOLD
                            </button>
                        </div>
                    </div>

                    <div className="admin-log-card">
                        <h3 className="admin-log-title">Auction Log</h3>
                        <div className="admin-log-list">
                            {auctionLog.length === 0 ? (
                                <p className="admin-log-empty">No activity yet.</p>
                            ) : (
                                auctionLog.map(entry => (
                                    <div key={entry.id} className={`admin-log-entry admin-log-entry--${entry.status.toLowerCase()}`}>
                                        <span className="admin-log-player">{entry.playerName}</span>
                                        <span className="admin-log-status">{entry.status}</span>
                                        <span className="admin-log-price">{entry.price}</span>
                                        {entry.teamName && entry.teamName !== '—' && (
                                            <span className="admin-log-team">{entry.teamName}</span>
                                        )}
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