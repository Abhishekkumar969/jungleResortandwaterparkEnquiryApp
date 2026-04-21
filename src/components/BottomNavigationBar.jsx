import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHome, FaFolderOpen, FaEnvelopeOpenText, } from "react-icons/fa";

const getNavConfig = () => {
    return {
        navItems: [
            { label: "Home", icon: <FaHome />, path: '/' },
            { label: "Reports", icon: <FaFolderOpen />, path: '/leadstabcontainer' },
        ],
        centralAction: {
            label: "Enquiry",
            icon: <FaEnvelopeOpenText />,
            path: '/EnquiryForm',
            isCentral: true
        }
    };
};

const BottomNavigationBar = ({ userAppType }) => {
    const navigate = useNavigate();

    const { navItems, centralAction } = getNavConfig(userAppType);

    const isActive = (path) => {
        const currentPath = window.location.pathname.replace(/\/$/, '');
        const normalizedPath = path.replace(/\/$/, '');
        return currentPath === normalizedPath;
    };

    const handleNavigation = (path) => {
        navigate(path);
    };

    return (
        <div className="bottom-nav-bar">
            {navItems.slice(0, 1).map(item => (
                <div
                    key={item.label}
                    className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
                    onClick={() => handleNavigation(item.path)}
                >
                    <span className="nav-icon">{item.icon}</span>
                    <span className="nav-label">{item.label}</span>
                </div>
            ))}

            {/* CENTER (Enquiry) */}
            <div
                className={`nav-item central-action ${isActive(centralAction.path) ? 'central-active' : ''}`}
                onClick={() => handleNavigation(centralAction.path)}
            >
                <div className="central-icon-bg">
                    <span className="central-icon" style={{ fontSize: "22px", color: "#ffffff" }}>
                        {centralAction.icon}
                    </span>
                </div>
                <span className="nav-label">{centralAction.label}</span>
            </div>

            {/* RIGHT (second item → Profile) */}
            {navItems.slice(1).map(item => (
                <div
                    key={item.label}
                    className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
                    onClick={() => handleNavigation(item.path)}
                >
                    <span className="nav-icon">{item.icon}</span>
                    <span className="nav-label">{item.label}</span>
                </div>
            ))}
        </div>
    );
};

export default BottomNavigationBar;
