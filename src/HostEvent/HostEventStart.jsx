import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BackButton from '../components/BackButton';

export default function HostEventStart() {
    const [slug, setSlug] = useState("");
    const navigate = useNavigate();

    const handleContinue = () => {
        if (!slug.trim()) return;
        navigate(`/builder/${slug.trim()}`);
    };

    return (
        <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto', textAlign: 'center', backgroundColor: '#f9f9f9', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', marginTop: '50px' }}>
            <div style={{ textAlign: 'left' }}>
                <BackButton />
            </div>
            <h1 style={{ marginTop: '20px', color: '#333' }}>Host My Event</h1>
            <p style={{ color: '#666', fontSize: '18px' }}>Create a beautiful dynamic page for your event.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center', marginTop: '30px' }}>
                <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <span style={{ fontSize: '16px', color: '#888', backgroundColor: '#eee', padding: '12px', borderRadius: '6px 0 0 6px', border: '1px solid #ccc', borderRight: 'none' }}>
                        jungle-resort.com/
                    </span>
                    <input 
                        type="text" 
                        placeholder="my-awesome-party" 
                        value={slug}
                        onChange={(e) => setSlug(e.target.value.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase())}
                        style={{ padding: '12px', fontSize: '16px', borderRadius: '0 6px 6px 0', border: '1px solid #ccc', flex: 1, outline: 'none' }}
                    />
                </div>
                <button 
                    onClick={handleContinue}
                    disabled={!slug.trim()}
                    style={{ 
                        padding: '12px 30px', 
                        backgroundColor: slug.trim() ? '#4f46e5' : '#ccc', 
                        color: '#fff', 
                        border: 'none', 
                        borderRadius: '6px', 
                        cursor: slug.trim() ? 'pointer' : 'not-allowed', 
                        fontWeight: 'bold',
                        fontSize: '16px',
                        width: '100%',
                        transition: 'background-color 0.3s'
                    }}
                >
                    Start Building
                </button>
            </div>
        </div>
    );
}
