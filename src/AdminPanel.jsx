import React, { useState, useEffect } from 'react';
import './Dashboard.css'; // Reuse basic dashboard layout styles
import './AdminPanel.css';
import PlayerCard from './components/PlayerCard';
import TeamGrid from './components/TeamGrid';
import SquadModal from './components/SquadModal';
import AuctionTimer from './components/AuctionTimer';
import { useAuction } from './context/AuctionContext';
import { motion, AnimatePresence } from 'framer-motion';

const AdminPanel = () => {
    const { teams, currentPlayer, highestBidder, sellPlayer, markUnsold, nextPlayer } = useAuction();
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [notification, setNotification] = useState(null);
    const [timerDuration, setTimerDuration] = useState(60);
    const [timerKey, setTimerKey] = useState(0);

    const handleSell = () => {
        if (!highestBidder) return;
        const winningTeam = teams.find(t => t.id === highestBidder);

        // Show notification
        setNotification({
            type: 'SOLD',
            message: `SOLD TO ${winningTeam ? winningTeam.name.toUpperCase() : highestBidder}`,
            color: winningTeam?.color || '#22c55e'
        });

        // Perform Sell
        sellPlayer();

        // Clear after 2 seconds
        setTimeout(() => {
            setNotification(null);
        }, 2000);
    };

    const handleTimerChange = (seconds) => {
        setTimerDuration(Math.max(10, Math.min(300, seconds))); // Min 10s, Max 5min
        setTimerKey(prev => prev + 1); // Reset timer
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

                {/* ye timmer kai liyai hai commenting for now as of no use */}

                {/* <div className="timer-wrapper">
                    <AuctionTimer 
                        key={timerKey}
                        initialSeconds={timerDuration}
                        onTimerChange={handleTimerChange}
                    />
                </div> */}
                <div className="center-stage">
                    <div className="card-animation-container" style={{ position: 'relative', width: '100%', minHeight: '400px', display: 'flex', justifyContent: 'center' }}>
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentPlayer ? currentPlayer.id : 'empty'}
                                initial={{ opacity: 0, scale: 0.9, y: 50 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -50 }}
                                transition={{ duration: 0.2, type: "spring", stiffness: 300, damping: 25 }}
                                style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
                            >
                                <PlayerCard
                                    player={currentPlayer}
                                    currentBid={currentPlayer.currentBid}
                                    highestBidder={highestBidder}
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
                            onClick={markUnsold}
                        >
                            UNSOLD
                        </button>
                    </div>
                </div>
                

                <div className="teams-section-full">
                    <h2>Team Overview</h2>
                    <TeamGrid
                        teams={teams}
                        onTeamClick={(team) => setSelectedTeam(team)}
                        title={null}
                    />
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
