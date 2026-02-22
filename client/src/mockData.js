export const livePlayer = {
  id: 1,
  name: "Rassie van Berg",
  country: "SA",
  role: "Batsman",
  matches: 55,
  runs: 1600,
  wickets: 0,
  average: 32.7,
  strikeRate: 144.9,
  basePrice: "50 L",
  currentBid: "50 L",
  highestBidder: null,
  image: null,
};

export const teams = [
  { id: "MUM", name: "Mumbai Mavericks", code: "MUM", funds: "100 Cr", players: 0, color: "#3b82f6" }, // Blue
  { id: "DEL", name: "Delhi Dynamos", code: "DEL", funds: "100 Cr", players: 0, color: "#ef4444" }, // Red
  { id: "CHE", name: "Chennai Chargers", code: "CHE", funds: "100 Cr", players: 0, color: "#eab308" }, // Yellow
  { id: "KOL", name: "Kolkata Knights", code: "KOL", funds: "100 Cr", players: 0, color: "#a855f7" }, // Purple
  { id: "BLR", name: "Bangalore Blasters", code: "BLR", funds: "100 Cr", players: 0, color: "#ef4444" }, // Red
  { id: "HYD", name: "Hyderabad Hawks", code: "HYD", funds: "100 Cr", players: 0, color: "#f97316" }, // Orange
  { id: "RAJ", name: "Rajasthan Royals", code: "RAJ", funds: "100 Cr", players: 0, color: "#ec4899" }, // Pink
  { id: "PUN", name: "Punjab Panthers", code: "PUN", funds: "100 Cr", players: 0, color: "#ef4444" }, // Red
  { id: "GUJ", name: "Gujarat Gladiators", code: "GUJ", funds: "100 Cr", players: 0, color: "#3b82f6" }, // Blue
  { id: "LKN", name: "Lucknow Lions", code: "LKN", funds: "100 Cr", players: 0, color: "#06b6d4" }, // Cyan
  { id: "AHM", name: "Ahmedabad Aces", code: "AHM", funds: "100 Cr", players: 0, color: "#6366f1" }, // Indigo
  { id: "JAI", name: "Jaipur Jaguars", code: "JAI", nameShort: "JAI", funds: "100 Cr", players: 0, color: "#ec4899" },
  { id: "KOC", name: "Kochi Kings", code: "KOC", funds: "100 Cr", players: 0, color: "#a855f7" },
  { id: "PNE", name: "Pune Predators", code: "PNE", funds: "100 Cr", players: 0, color: "#06b6d4" },
  { id: "IND", name: "Indore Infernos", code: "IND", funds: "100 Cr", players: 0, color: "#f97316" },
  { id: "GUW", name: "Guwahati Griffins", code: "GUW", funds: "100 Cr", players: 0, color: "#22c55e" },
  { id: "VIZ", name: "Vizag Vikings", code: "VIZ", funds: "100 Cr", players: 0, color: "#3b82f6" },
  { id: "CHD", name: "Chandigarh Cavaliers", code: "CHD", funds: "100 Cr", players: 0, color: "#ef4444" },
  { id: "DHR", name: "Dharamshala Dragons", code: "DHR", funds: "100 Cr", players: 0, color: "#8b5cf6" },
  { id: "RAN", name: "Ranchi Renegades", code: "RAN", funds: "100 Cr", players: 0, color: "#14b8a6" },
  { id: "SUR", name: "Surat Strikers", code: "SUR", funds: "100 Cr", players: 0, color: "#3b82f6" },
  { id: "NAG", name: "Nagpur Ninjas", code: "NAG", funds: "100 Cr", players: 0, color: "#ef4444" },
  { id: "KAN", name: "Kanpur Kings", code: "KAN", funds: "100 Cr", players: 0, color: "#eab308" },
  { id: "BHO", name: "Bhopal Bulls", code: "BHO", funds: "100 Cr", players: 0, color: "#a855f7" },
  { id: "PAT", name: "Patna Prowlers", code: "PAT", funds: "100 Cr", players: 0, color: "#ef4444" },
  { id: "COI", name: "Coimbatore Crushers", code: "COI", funds: "100 Cr", players: 0, color: "#f97316" },
  { id: "MAD", name: "Madurai Masters", code: "MAD", funds: "100 Cr", players: 0, color: "#ec4899" },
  { id: "TRI", name: "Trichy Tigers", code: "TRI", funds: "100 Cr", players: 0, color: "#ef4444" },
  { id: "SAL", name: "Salem Stallions", code: "SAL", funds: "100 Cr", players: 0, color: "#3b82f6" },
  { id: "TIR", name: "Tirupati Titans", code: "TIR", funds: "100 Cr", players: 0, color: "#06b6d4" },
  { id: "NEL", name: "Nellai Nightingales", code: "NEL", funds: "100 Cr", players: 0, color: "#6366f1" },
  { id: "JOD", name: "Jodhpur Juggernauts", code: "JOD", funds: "100 Cr", players: 0, color: "#ec4899" },
  { id: "UDA", name: "Udaipur Ultra", code: "UDA", funds: "100 Cr", players: 0, color: "#a855f7" },
  { id: "AJM", name: "Ajmer Aces", code: "AJM", funds: "100 Cr", players: 0, color: "#06b6d4" },
  { id: "SHI", name: "Shimla Storm", code: "SHI", funds: "100 Cr", players: 0, color: "#f97316" },
  { id: "SRI", name: "Srinagar Stars", code: "SRI", funds: "100 Cr", players: 0, color: "#22c55e" },
  { id: "JAM", name: "Jammu Jets", code: "JAM", funds: "100 Cr", players: 0, color: "#3b82f6" },
  { id: "LEH", name: "Leh Legends", code: "LEH", funds: "100 Cr", players: 0, color: "#ef4444" },
  { id: "GOR", name: "Gorakhpur Gladiators", code: "GOR", funds: "100 Cr", players: 0, color: "#8b5cf6" },
  { id: "VAR", name: "Varanasi Vanguards", code: "VAR", funds: "100 Cr", players: 0, color: "#14b8a6" },
];
