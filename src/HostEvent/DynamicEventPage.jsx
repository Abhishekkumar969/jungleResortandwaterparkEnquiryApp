import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

export default function DynamicEventPage() {
    const { slug } = useParams();
    const [html, setHtml] = useState('');
    const [css, setCss] = useState('');

    useEffect(() => {
        const savedHtml = localStorage.getItem(`event_page_${slug}_html`);
        const savedCss = localStorage.getItem(`event_page_${slug}_css`);

        if (savedHtml) {
            setHtml(savedHtml);
        } else {
            setHtml('<div style="padding: 100px 20px; text-align: center; font-family: Inter, sans-serif;"><h2 style="font-size:28px;color:#1a1a1a;">Page Not Found</h2><p style="color:#666;font-size:16px;">This event page does not exist or has not been published yet.</p></div>');
        }

        if (savedCss) {
            setCss(savedCss);
        }
    }, [slug]);

    // Responsive CSS that makes all sections work on mobile
    const responsiveCSS = `
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; }
        img { max-width: 100%; height: auto; }
        
        @media (max-width: 768px) {
            div[style*="display:flex"], 
            div[style*="display: flex"] {
                flex-direction: column !important;
            }
            div[style*="min-width:300px"],
            div[style*="min-width: 300px"] {
                min-width: 100% !important;
            }
            div[style*="max-width:280px"],
            div[style*="max-width: 280px"] {
                max-width: 100% !important;
            }
        }
        
        @media (max-width: 480px) {
            div[style*="padding:80px"],
            div[style*="padding: 80px"] {
                padding: 40px 16px !important;
            }
            div[style*="padding:60px"],
            div[style*="padding: 60px"] {
                padding: 32px 16px !important;
            }
            div[style*="padding:48px"],
            div[style*="padding: 48px"] {
                padding: 24px 16px !important;
            }
        }
    `;

    return (
        <div style={{ width: '100%', minHeight: '100vh', overflow: 'hidden' }}>
            {/* Responsive base CSS */}
            <style dangerouslySetInnerHTML={{ __html: responsiveCSS }} />

            {/* GrapesJS generated CSS */}
            <style dangerouslySetInnerHTML={{ __html: css }} />

            {/* GrapesJS generated HTML */}
            <div dangerouslySetInnerHTML={{ __html: html }} />
        </div>
    );
}
