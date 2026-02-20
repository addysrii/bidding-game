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

                {/* Central Team Login Card */}
                <div className="login-card">
                    <h1 className="gdg-font-gradient">TEAM LOGIN</h1>

                    <form onSubmit={handleLogin}>
                        <div className="input-field">
                            <span className="icon">👤</span>
                            <input type="text" placeholder="Username" />
                        </div>
                        <div className="input-field">
                            <span className="icon">🔒</span>
                            <input type="password" placeholder="Password" />
                        </div>
                        <button className="login-btn">LOGIN</button>
                    </form>

                    <div className="divider">OR</div>

                    {/* Fixed Google Button with Logo */}
                    <button className="google-btn" onClick={handleLogin}>
                        <div className="google-btn-inner">
                            <img
                                src="https://fonts.gstatic.com/s/i/productlogos/googleg/v6/24px.svg"
                                alt="Google Logo"
                                className="google-icon"
                            />
                            <span className="btn-text">Sign in with Google</span>
                        </div>
                    </button>

                    <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                        <a href="#" onClick={(e) => { e.preventDefault(); navigate('/admin'); }} style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: '0.8rem' }}>
                            Admin Access
                        </a>
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
