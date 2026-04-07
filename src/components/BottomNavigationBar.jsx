import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FaHome,
    // FaFolderOpen,
    FaUserTie,
    FaEnvelopeOpenText,
} from "react-icons/fa";

const getNavConfig = (userAppType) => {

    let navItems = [
        { icon: '', path: '/leadstabcontainer' },
        // { label: "Home", icon: <FaHome />, path: '/' },
        // { icon: '', path: '/leadstabcontainer' },
    ];

    let centralAction = {
        label: "Enquiry",
        icon: <FaEnvelopeOpenText />,
        path: '/EnquiryForm',
        isCentral: true
    };

    switch (userAppType) {

        case 'A':
            navItems = [
                { label: "Home", icon: <FaHome />, path: '/' },
                { label: "Profile", icon: <FaUserTie />, path: '/AdminProfile' },
            ];

            centralAction = {
                label: "Enquiry",
                icon: <FaEnvelopeOpenText />,
                path: '/EnquiryForm',
                isCentral: true
            };

            break;

        default:
            break;
    }

    return { navItems, centralAction };
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
            {/* LEFT (sirf first item → Home) */}
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
