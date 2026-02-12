import React, { createContext, useState, useContext } from 'react';
import { livePlayer as initialPlayer, teams as initialTeams } from '../mockData';

const AuctionContext = createContext();

export const useAuction = () => useContext(AuctionContext);

// Helper to generate next player (mock)
const getNextPlayer = (id) => ({
    ...initialPlayer,
    id: id + 1,
    name: `Player ${id + 1}`,
    role: ['Batsman', 'Bowler', 'All-Rounder', 'Wicket Keeper'][Math.floor(Math.random() * 4)],
    basePrice: "20 L",
    currentBid: "20 L",
    highestBidder: null,
    image: null,
});

export const AuctionProvider = ({ children }) => {
    const [teams, setTeams] = useState(initialTeams);
    const [currentPlayer, setCurrentPlayer] = useState({ ...initialPlayer, currentBid: 50 }); // Bid in Lakhs
    const [highestBidder, setHighestBidder] = useState(null);
    const [bidHistory, setBidHistory] = useState([]);

    const placeBid = (teamId, amount) => {
        // Validation: verify team has enough funds
        const team = teams.find(t => t.id === teamId);
        if (!team) return;

        const currentFunds = parseFloat(team.funds.replace(' Cr', ''));
        const bidInCr = amount / 100;

        if (currentFunds < bidInCr) {
            alert("Insufficient funds!");
            return;
        }

        setCurrentPlayer(prev => ({
            ...prev,
            currentBid: amount
        }));
        setHighestBidder(teamId);
        setBidHistory(prev => [...prev, { teamId, amount, timestamp: new Date() }]);
    };

    const sellPlayer = () => {
        if (!highestBidder) return;

        setTeams(prevTeams => prevTeams.map(team => {
            if (team.id === highestBidder) {
                const currentFunds = parseFloat(team.funds.replace(' Cr', ''));
                const cost = currentPlayer.currentBid / 100; // Convert Lakhs to Cr
                const newFunds = (currentFunds - cost).toFixed(2) + " Cr";

                return {
                    ...team,
                    funds: newFunds,
                    players: team.players + 1,
                    roster: [...(team.roster || []), {
                        ...currentPlayer,
                        soldPrice: `${currentPlayer.currentBid} L`,
                        role: currentPlayer.role || 'Batsman'
                    }]
                };
            }
            return team;
        }));

        // Move to next player automatically or wait? 
        // For now, let's just clear the sold state and let Admin trigger next
        setHighestBidder(null);
        setBidHistory([]);
        // Optional: Mark current player as sold in some history list?
    };

    const markUnsold = () => {
        // Logic to mark unsold
        setHighestBidder(null);
        setBidHistory([]);
        nextPlayer();
    };

    const nextPlayer = () => {
        setCurrentPlayer(prev => ({
            ...getNextPlayer(prev.id),
            currentBid: 20
        }));
        setHighestBidder(null);
        setBidHistory([]);
    };

    return (
        <AuctionContext.Provider value={{
            teams,
            currentPlayer,
            highestBidder,
            bidHistory,
            placeBid,
            sellPlayer,
            markUnsold,
            nextPlayer
        }}>
            {children}
        </AuctionContext.Provider>
    );
};
