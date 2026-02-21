import React from 'react';
import { useNavigate } from 'react-router-dom';
import './App.css';

function Login() {
    const navigate = useNavigate();

    const handleLogin = (e) => {
        e.preventDefault();
        navigate('/dashboard');
    };

    return (
        <div className="login-wrapper">
            {/* Background GDG Tilted Stripes */}
            <div className="bg-stripes">
                <div className="stripe blue"></div>
                <div className="stripe red"></div>
                <div className="stripe yellow"></div>
                <div className="stripe green"></div>
            </div>

            <div className="main-layout">
                {/* Left Side: Red and Blue Chevrons */}
                <div className="chevron-side">
                    <div className="chevron-bar red-chevron"></div>
                    <div className="chevron-bar blue-chevron"></div>
                </div>

                {/* Central Navigation Card */}
                <div className="login-card nav-card">
                    <h1 className="gdg-font-gradient">WELCOME</h1>

                    <div className="nav-buttons-container">
                        <button
                            className="nav-btn auction-btn"
                            onClick={() => navigate('/dashboard')}
                        >
                            <span className="btn-label">PROJECT</span>
                            <span className="btn-title">THE AUCTION</span>
                        </button>

                        <button
                            className="nav-btn admin-btn"
                            onClick={() => navigate('/admin')}
                        >
                            <span className="btn-label">ADMIN PANEL</span>
                            <span className="btn-title">ADMIN CONTROL</span>
                        </button>
                    </div>
                </div>

                {/* Right Side: Green and Yellow Chevrons */}
                <div className="chevron-side right-side">
                    <div className="chevron-bar green-chevron"></div>
                    <div className="chevron-bar yellow-chevron"></div>
                </div>
            </div>
        </div>
    );
}

export default Login;
