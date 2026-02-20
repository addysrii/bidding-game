import React, { useState } from 'react';
import './Dashboard.css';
import PlayerCard from './components/PlayerCard';
import TeamGrid from './components/TeamGrid';
import PurseMeter from './components/PurseMeter';
import SquadModal from './components/SquadModal';
import { useAuction } from './context/AuctionContext';

const Dashboard = () => {
    const { teams, currentPlayer, highestBidder, placeBid } = useAuction();
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [myTeamId] = useState("MUM"); // Hardcoded logged-in team

    // Derived state for My Team
    const myTeam = teams.find(t => t.id === "MUM") || { funds: "100 Cr", players: 0, roster: [] };

    // Calculate spent for My Team
    const totalPurse = 100; // Cr
    const currentFunds = parseFloat(myTeam.funds.replace(' Cr', ''));
    const spent = (totalPurse - currentFunds).toFixed(1);

    const handleBid = () => {
        // Logic to increment bid. State is managed in context.
        // Assuming fixed increment for now, or dynamic based on current price
        let increment = 20;
        if (currentPlayer.currentBid >= 200) increment = 50;
        if (currentPlayer.currentBid >= 1000) increment = 100;

        placeBid(myTeamId, currentPlayer.currentBid + increment);
    };

    const handleSkip = () => {
        console.log("Player skipped");
        // Add logic if needed, e.g., move to next player if admin allows or just mark local skip
    };

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <div className="header-left">
                    <h1>MUM</h1>
                    <span>Mumbai Mavericks - Team Owner Dashboard</span>
                </div>

                <div className="header-right">
                    <PurseMeter total="100 Cr" spent={`${spent} Cr`} remaining={myTeam.funds} />
                </div>
            </header>

            <div className="player-card-container">
                <PlayerCard
                    player={currentPlayer}
                    currentBid={currentPlayer.currentBid}
                    highestBidder={highestBidder}
                    onBid={handleBid}
                    onSkip={handleSkip}
                    // onSold moved to Admin Panel
                    isMyTeamBid={highestBidder === myTeamId}
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
