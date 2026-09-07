import React, { useState, useEffect } from 'react';
import { db } from "../firebaseConfig";
import { collection, onSnapshot, doc, updateDoc, setDoc } from "firebase/firestore";
import BackButton from '../components/BackButton';

export default function InfluencersTab() {
  const [influencers, setInfluencers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "influencers"), (snap) => {
      const data = [];
      snap.forEach(doc => {
        data.push({ id: doc.id, ...doc.data() });
      });
      // Sort by newest first
      data.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setInfluencers(data);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleAccept = async (inf) => {
    if (window.confirm("Are you sure you want to Accept this influencer? This will generate a free Pool Party ticket for them.")) {
      try {
        // Update influencer status
        await updateDoc(doc(db, "influencers", inf.id), {
          status: "accepted"
        });

        // Generate Pool Party Ticket in WaterPark collection
        const visitMonth = "2026-07"; // Pool Party month
        const bookingId = Date.now().toString() + Math.floor(Math.random() * 1000);
        
        const newTicket = {
            [bookingId]: {
                name: inf.name,
                phone: inf.phone,
                visitDate: "2026-07-17",
                createdAt: new Date().toLocaleDateString("en-IN"),
                paymentStatus: "paid",
                paymentId: "FREE_INFLUENCER_PASS",
                total: 0,
                tickets: {
                    pp_stag: 1 // Free pass assigned
                }
            }
        };
        
        await setDoc(doc(db, "WaterPark", visitMonth), newTicket, { merge: true });

        // Open WhatsApp
        const msg = encodeURIComponent("Welcome to Jungle Resort! Please download your ticket from https://jungleresort.netlify.app/pool-party. You can easily download your ticket by just filling your phone number after the ticket section.");
        window.open(`https://wa.me/91${inf.phone}?text=${msg}`, '_blank');
      } catch (err) {
        console.error("Error accepting influencer:", err);
        alert("Error updating database.");
      }
    }
  };

  const handleDecline = async (inf) => {
    if (window.confirm("Are you sure you want to Decline this influencer?")) {
      try {
        // Update influencer status
        await updateDoc(doc(db, "influencers", inf.id), {
          status: "declined"
        });

        // Open WhatsApp
        const msg = encodeURIComponent("You are not eligible for this pass. Please download your ticket now https://jungleresort.netlify.app/pool-party");
        window.open(`https://wa.me/91${inf.phone}?text=${msg}`, '_blank');
      } catch (err) {
        console.error("Error declining influencer:", err);
        alert("Error updating database.");
      }
    }
  };

  if (loading) {
    return <div style={{ padding: 20 }}>Loading...</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif', marginTop: '50px' }}>
      <div style={{ marginBottom: '20px' }}>
        <BackButton />
      </div>
      <h2>Influencer Applications</h2>
      
      {influencers.length === 0 ? (
        <p>No applications found.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {influencers.map(inf => (
            <div key={inf.id} style={{ 
              border: '1px solid #ddd', 
              borderRadius: '8px', 
              padding: '15px',
              backgroundColor: inf.status === 'accepted' ? '#f0fff4' : inf.status === 'declined' ? '#fff0f0' : '#fff'
            }}>
              <div style={{ marginBottom: '10px' }}>
                <h3 style={{ margin: '0 0 5px 0' }}>{inf.name}</h3>
                <p style={{ margin: '0 0 5px 0', color: '#555' }}>📞 {inf.phone}</p>
                <a 
                  href={inf.instagram} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ 
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: '#E1306C', 
                    textDecoration: 'none',
                    fontSize: '13px',
                    wordBreak: 'break-all',
                    margin: '0 0 8px 0'
                  }}
                >
                  📸 {inf.instagram}
                </a>
                <p style={{ margin: 0, fontWeight: 'bold', color: inf.status === 'accepted' ? 'green' : inf.status === 'declined' ? 'red' : 'orange' }}>
                  Status: {inf.status.toUpperCase()}
                </p>
              </div>

              {inf.status !== 'accepted' && inf.status !== 'declined' && (
                <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                  <button 
                    onClick={() => handleAccept(inf)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      backgroundColor: '#4CAF50',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    Accept
                  </button>
                  <button 
                    onClick={() => handleDecline(inf)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      backgroundColor: '#f44336',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    Decline
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
