import React, { useEffect, useRef, useState } from 'react';
import grapesjs from 'grapesjs';
import gjsPresetWebpage from 'grapesjs-preset-webpage';
import gjsCustomCode from 'grapesjs-custom-code';
import gjsTouch from 'grapesjs-touch';
import gjsParserPostcss from 'grapesjs-parser-postcss';

import 'grapesjs/dist/css/grapes.min.css';
import { useParams, useNavigate } from 'react-router-dom';
import { loadProBlocks } from './BlocksLibrary';
import gjsTuiImageEditor from 'grapesjs-tui-image-editor';

export default function PageBuilder() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const editorRef = useRef(null);
    const [editor, setEditor] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [showDevMode, setShowDevMode] = useState(false);
    const [showTemplates, setShowTemplates] = useState(false);
    const [devTab, setDevTab] = useState('react');
    const [devCode, setDevCode] = useState({ react: '', html: '', css: '', json: '' });
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isFreeDrag, setIsFreeDrag] = useState(true);
    const [contextMenu, setContextMenu] = useState({ show: false, x: 0, y: 0 });

    useEffect(() => {
        if (!editorRef.current) return;

        const e = grapesjs.init({
            container: editorRef.current,
            height: '100%',
            width: 'auto',
            plugins: [
                gjsPresetWebpage,
                gjsCustomCode,
                gjsTouch,
                gjsParserPostcss,
                gjsTuiImageEditor
            ],
            pluginsOpts: {
                'grapesjs-tui-image-editor': {
                    config: {
                        includeUI: {
                            initMenu: 'crop'
                        }
                    }
                },
                [gjsPresetWebpage]: {
                    blocksBasicOpts: {
                        flexGrid: true,
                    },
                    navbarOpts: false,
                    countdownOpts: false,
                    formsOpts: false,
                    exportOpts: false,
                    aviaryOpts: false,
                    filestackOpts: false,
                },
            },
            layerManager: {
                appendTo: '#layers-container'
            },
            storageManager: {
                type: 'local',
                autosave: true,
                autoload: true,
                stepsBeforeSave: 1,
                options: {
                    local: { key: `gjs-v3-${slug}` }
                }
            },
            assetManager: {
                // Enable local image uploads (Base64 for MVP)
                upload: false, // We handle uploads locally in the browser for now
                uploadText: 'Drop images here or click to upload',
                handleAdd: (textFromInput) => {
                    editor.AssetManager.add(textFromInput);
                }
            },
            canvas: {
                styles: [
                    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap',
                    'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap',
                ],
            },
            deviceManager: {
                devices: [
                    { name: 'Desktop', width: '' },
                    { name: 'Tablet', width: '768px', widthMedia: '992px' },
                    { name: 'Mobile portrait', width: '375px', widthMedia: '480px' },
                ]
            },
            styleManager: {
                sectors: [
                    {
                        name: 'Size',
                        open: true,
                        properties: [
                            { extend: 'width', min: 0 },
                            'min-width',
                            'max-width',
                            { extend: 'height', min: 0 },
                            'min-height',
                            'max-height',
                        ]
                    },
                    {
                        name: 'Spacing',
                        open: true,
                        properties: ['padding', 'margin']
                    },
                    {
                        name: 'Text',
                        open: false,
                        properties: [
                            'font-family',
                            'font-size',
                            'font-weight',
                            'letter-spacing',
                            'color',
                            'line-height',
                            'text-align',
                            'text-decoration',
                            'text-transform',
                        ]
                    },
                    {
                        name: 'Background',
                        open: false,
                        properties: ['background-color', 'background'],
                    },
                    {
                        name: 'Border',
                        open: false,
                        properties: ['border-radius', 'border', 'box-shadow'],
                    },
                    {
                        name: 'Layout (Flexbox)',
                        open: true,
                        properties: ['display', 'flex-direction', 'justify-content', 'align-items', 'flex-wrap', 'gap', 'overflow'],
                    },
                    {
                        name: 'Position',
                        open: false,
                        properties: ['position', 'top', 'right', 'bottom', 'left', 'z-index'],
                    },
                    {
                        name: 'Effects',
                        open: false,
                        properties: ['opacity', 'transition', 'transform'],
                    },
                ]
            },
        });

        // --- CUSTOM BLOCKS & RESPONSIVE FIX ---
        e.on('load', () => {
            // INJECT RESPONSIVE CSS INTO CANVAS IFRAME
            const canvasDoc = e.Canvas.getDocument();
            if (canvasDoc) {
                const meta = canvasDoc.createElement('meta');
                meta.name = 'viewport';
                meta.content = 'width=device-width, initial-scale=1.0';
                canvasDoc.head.appendChild(meta);

                const style = canvasDoc.createElement('style');
                style.textContent = `
                    * { box-sizing: border-box !important; }
                    body { 
                        margin: 0 !important; 
                        padding: 0 0 200px 0 !important; 
                        width: 100% !important; 
                        overflow-x: hidden !important; 
                    }
                    img { max-width: 100% !important; height: auto !important; }
                    
                    @media (max-width: 768px) {
                        [style*="display:flex"], [style*="display: flex"] { flex-direction: column !important; }
                        [style*="min-width:300px"], [style*="min-width: 300px"],
                        [style*="min-width:250px"], [style*="min-width: 250px"] { min-width: 100% !important; max-width: 100% !important; }
                    }
                    @media (max-width: 480px) {
                        [style*="padding:80px"], [style*="padding: 80px"] { padding: 40px 16px !important; }
                        [style*="padding:60px"], [style*="padding: 60px"] { padding: 32px 16px !important; }
                        [style*="font-size: 56px"], [style*="font-size:56px"],
                        [style*="font-size: 64px"], [style*="font-size:64px"] { font-size: 32px !important; }
                    }
                `;
                canvasDoc.head.appendChild(style);
            }

            const bm = e.BlockManager;

            // Use 'translate' drag mode by default so it never changes 'position' to absolute automatically
            e.setDragMode('translate');

            // Enable Canva-style resizing for all elements when selected
            e.on('component:selected', (component) => {
                if (!component.is('text') && !component.get('resizable')) {
                    component.set('resizable', {
                        // All 8 handles enabled
                        tl: 1, tc: 1, tr: 1,
                        cl: 1, cr: 1,
                        bl: 1, bc: 1, br: 1,
                        keepRatio: false // False means corner handles can change width and height independently
                    });
                }
            });

            // Force Layer Manager to render in our left sidebar
            e.on('load', () => {
                const layersContainer = document.getElementById('layers-container');
                const layerManagerEl = e.LayerManager.render();
                if (layersContainer && layerManagerEl) {
                    layersContainer.appendChild(layerManagerEl);
                    layerManagerEl.style.display = 'block';
                    layerManagerEl.style.height = '100%';
                    layerManagerEl.style.width = '100%';
                }

                // Also trigger an update so it populates
                e.LayerManager.setVisible(true);
            });

            // Add Context Menu Event Listener
            const doc = e.Canvas.getDocument();
            doc.addEventListener('contextmenu', (evt) => {
                evt.preventDefault();
                const wrapperRect = e.Canvas.getElement().getBoundingClientRect();
                setContextMenu({
                    show: true,
                    x: evt.clientX + wrapperRect.left,
                    y: evt.clientY + wrapperRect.top
                });
            });

            // Close context menu on click
            document.addEventListener('click', () => setContextMenu({ show: false, x: 0, y: 0 }));
            doc.addEventListener('click', () => setContextMenu({ show: false, x: 0, y: 0 }));

            // Add Custom Command for Canva-style 1-click Dark Overlay
            e.Commands.add('add-overlay', {
                run(editor) {
                    const selected = editor.getSelected();
                    if (!selected) {
                        alert('Please select a section or image container first!');
                        return;
                    }

                    const style = selected.getStyle();
                    let currentBg = style['background-image'] || '';

                    // If already has our gradient, remove it (Toggle)
                    if (currentBg.includes('linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6))')) {
                        style['background-image'] = currentBg.replace(/linear-gradient\(rgba\(0, 0, 0, 0\.6\), rgba\(0, 0, 0, 0\.6\)\)(, )?/, '');
                    } else {
                        // Add overlay
                        if (currentBg) {
                            style['background-image'] = `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), ${currentBg}`;
                        } else {
                            style['background-image'] = `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6))`;
                        }
                    }

                    selected.setStyle(style);
                }
            });

            // Remove some confusing default blocks
            bm.remove('map');

            // Load all our Pro Blocks from the library!
            loadProBlocks(e);

            // Keep only utility blocks in PageBuilder
            bm.add('spacer-block', {
                label: '↕️ Spacer',
                category: '7. Utility',
                content: `<div style="width:100%;height:60px;"></div>`
            });

            bm.add('divider-block', {
                label: '➖ Divider',
                category: '7. Utility',
                content: `<div style="width:100%;padding:0 24px;box-sizing:border-box;"><hr style="border:none;border-top:1px solid #e2e8f0;margin:0;"></div>`
            });

            // Layout / Grids for Side-by-Side dragging
            bm.add('layout-2-col', {
                label: '🔲 2 Columns',
                category: '8. Layout (Grid)',
                content: `
                <div style="display:flex;flex-wrap:wrap;width:100%;min-height:100px;box-sizing:border-box;">
                    <div style="flex:1;min-width:300px;padding:20px;border:1px dashed #ccc;">Column 1 (Drag items here)</div>
                    <div style="flex:1;min-width:300px;padding:20px;border:1px dashed #ccc;">Column 2 (Drag items here)</div>
                </div>
                `
            });

            bm.add('layout-3-col', {
                label: '🔲 3 Columns',
                category: '8. Layout (Grid)',
                content: `
                <div style="display:flex;flex-wrap:wrap;width:100%;min-height:100px;box-sizing:border-box;">
                    <div style="flex:1;min-width:250px;padding:20px;border:1px dashed #ccc;">Column 1</div>
                    <div style="flex:1;min-width:250px;padding:20px;border:1px dashed #ccc;">Column 2</div>
                    <div style="flex:1;min-width:250px;padding:20px;border:1px dashed #ccc;">Column 3</div>
                </div>
                `
            });

            bm.add('empty-section', {
                label: '📦 Empty Container',
                category: '8. Layout (Grid)',
                content: `
                <div style="width:100%;min-height:150px;padding:40px 20px;box-sizing:border-box;border:2px dashed #0393a7;background-color:#f8fafc;">
                    <p style="text-align:center;color:#0393a7;font-family:sans-serif;">Drag your elements inside this section!</p>
                </div>
                `
            });
        });

        // Enable resize on selected components
        e.on('component:selected', (model) => {
            if (model && model.get('type') !== 'wrapper') {
                model.set('resizable', {
                    cl: 1, cr: 1, bc: 1, br: 1,
                    ratioDefault: false,
                    minDim: 20,
                });
            }
        });

        // Add default template if canvas is empty
        e.on('load', () => {
            const wrapper = e.getWrapper();
            if (wrapper.components().length === 0) {
                e.addComponents(`
                    <div style="width:100%;box-sizing:border-box;padding:80px 24px;text-align:center;background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#0393a7 100%);font-family:Inter,sans-serif;">
                        <h1 style="font-size:clamp(32px,6vw,64px);color:#fff;margin:0 0 16px 0;font-weight:800;line-height:1.1;">Your Amazing Event</h1>
                        <p style="font-size:clamp(16px,2.5vw,22px);color:rgba(255,255,255,0.85);max-width:600px;margin:0 auto 32px auto;line-height:1.6;">Join us for an unforgettable experience filled with excitement and memories.</p>
                        <a style="display:inline-block;background:#0393a7;color:#fff;padding:14px 36px;border-radius:8px;font-weight:600;font-size:16px;text-decoration:none;box-shadow:0 4px 15px rgba(3,147,167,0.4);">Book Now →</a>
                    </div>
                `);
            }
        });

        setEditor(e);

        return () => {
            if (e) e.destroy();
        };
    }, [slug]);

    const responsiveBaseCSS = `
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; width: 100%; overflow-x: hidden; }
        img { max-width: 100%; height: auto; }
        @media (max-width: 768px) {
            [style*="display:flex"], [style*="display: flex"] { flex-direction: column !important; }
            [style*="min-width:300px"], [style*="min-width: 300px"],
            [style*="min-width:250px"], [style*="min-width: 250px"] { min-width: 100% !important; max-width: 100% !important; }
        }
        @media (max-width: 480px) {
            [style*="padding:80px"], [style*="padding: 80px"] { padding: 40px 16px !important; }
            [style*="padding:60px"], [style*="padding: 60px"] { padding: 32px 16px !important; }
            [style*="font-size: 56px"], [style*="font-size:56px"] { font-size: 32px !important; }
        }
    `;

    const handleSave = () => {
        if (!editor) return;
        setIsSaving(true);
        editor.store();
        const html = editor.getHtml();
        const css = responsiveBaseCSS + '\n' + editor.getCss();
        localStorage.setItem(`event_page_${slug}_html`, html);
        localStorage.setItem(`event_page_${slug}_css`, css);
        setTimeout(() => {
            setIsSaving(false);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        }, 400);
    };

    const handleDevMode = () => {
        if (!editor) return;
        const html = editor.getHtml();
        const css = responsiveBaseCSS + '\n' + editor.getCss();
        const json = JSON.stringify(editor.getComponents(), null, 2);

        // Basic HTML to JSX Converter
        let jsx = html
            .replace(/class=/g, 'className=')
            .replace(/for=/g, 'htmlFor=')
            .replace(/<img(.*?)>/g, '<img$1 />')
            .replace(/<input(.*?)>/g, '<input$1 />')
            .replace(/<hr(.*?)>/g, '<hr$1 />')
            .replace(/<br(.*?)>/g, '<br$1 />');

        jsx = jsx.replace(/style="([^"]*)"/g, (match, styleString) => {
            const styleObj = {};
            styleString.split(';').forEach(rule => {
                if (!rule.trim()) return;
                const [key, value] = rule.split(':');
                if (key && value) {
                    const camelKey = key.trim().replace(/-([a-z])/g, g => g[1].toUpperCase());
                    styleObj[camelKey] = value.trim();
                }
            });
            const styleEntries = Object.entries(styleObj).map(([k, v]) => `${k}: "${v}"`).join(', ');
            return `style={{ ${styleEntries} }}`;
        });

        const reactComponent = `import React from 'react';\nimport './styles.css';\n\nexport default function GeneratedPage() {\n    return (\n        <div>\n            ${jsx.replace(/\n/g, '\n            ')}\n        </div>\n    );\n}`;

        setDevCode({
            react: reactComponent,
            html: html,
            css: css,
            json: json
        });
        setDevTab('react');
        setShowDevMode(true);
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        alert('Code copied to clipboard!');
    };

    const handleLoadTemplate = (templateHtml) => {
        if (editor && window.confirm("This will replace your current canvas. Are you sure?")) {
            editor.setComponents(templateHtml);
            setShowTemplates(false);
        }
    };

    const handleZoom = (amount) => {
        if (!editor) return;
        const currentZoom = editor.Canvas.getZoom();
        // Limit zoom between 20% and 400%
        let newZoom = currentZoom + amount;
        if (newZoom < 20) newZoom = 20;
        if (newZoom > 400) newZoom = 400;
        editor.Canvas.setZoom(newZoom);
    };

    const handleContextMenuCommand = (command) => {
        if (!editor) return;
        setContextMenu({ show: false, x: 0, y: 0 });
        if (command === 'bring-forward') {
            const selected = editor.getSelected();
            if (selected) {
                const currentZ = parseInt(selected.getStyle()['z-index'] || 0);
                selected.addStyle({ 'z-index': currentZ + 1 });
            }
        } else if (command === 'send-backward') {
            const selected = editor.getSelected();
            if (selected) {
                const currentZ = parseInt(selected.getStyle()['z-index'] || 0);
                selected.addStyle({ 'z-index': currentZ - 1 });
            }
        } else if (command === 'delete') {
            const selected = editor.getSelected();
            if (selected) selected.remove();
        } else {
            editor.runCommand(command);
        }
    };

    const handleAIGenerate = () => {
        if (!aiPrompt.trim() || !editor) return;
        setIsGenerating(true);

        // Simulate AI thinking and assembling a page from blocks
        setTimeout(() => {
            const prompt = aiPrompt.toLowerCase();
            let generatedHtml = '';

            // VERY BASIC AI SIMULATION FOR MVP
            // It parses keywords and strings together a full page in 1 second.
            if (prompt.includes('saas') || prompt.includes('tech') || prompt.includes('business')) {
                generatedHtml = `
                    <nav style="display:flex; justify-content:space-between; align-items:center; padding:20px 40px; background:#ffffff; border-bottom:1px solid #eaeaea; font-family:Inter, sans-serif;"><div style="font-size:24px; font-weight:800; color:#111827;">SaaS<span style="color:#0393a7;">.</span></div><div style="display:flex; gap:24px; align-items:center;"><a href="#" style="text-decoration:none; color:#4b5563; font-weight:500;">Features</a><a href="#" style="background:#111827; color:#ffffff; padding:10px 20px; border-radius:6px; text-decoration:none; font-weight:600;">Login</a></div></nav>
                    <section style="display:flex; flex-wrap:wrap; align-items:center; padding:120px 40px; background:#f8fafc; font-family:Inter, sans-serif;"><div style="flex:1; min-width:300px; padding-right:40px;"><h1 style="font-size:64px; font-weight:800; color:#0f172a; line-height:1.1; margin-bottom:24px;">The modern way to work.</h1><p style="font-size:20px; color:#475569; margin-bottom:32px; line-height:1.6;">Automate your workflow and scale your business instantly.</p><button style="background:#0393a7; color:#fff; padding:16px 32px; border:none; border-radius:8px; font-size:16px; font-weight:600; cursor:pointer;">Start Free Trial</button></div><div style="flex:1; min-width:300px;"><img src="https://images.unsplash.com/photo-1551434678-e076c223a692?q=80&w=2850&auto=format&fit=crop" style="width:100%; border-radius:16px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);" /></div></section>
                    <section style="padding:100px 40px; background:#ffffff; font-family:Inter, sans-serif; text-align:center;"><h2 style="font-size:40px; font-weight:800; color:#0f172a; margin-bottom:60px;">Why choose us?</h2><div style="display:flex; flex-wrap:wrap; gap:32px; justify-content:center;"><div style="flex:1; min-width:280px; padding:40px; background:#f8fafc; border-radius:16px;"><div style="font-size:40px; margin-bottom:20px;">⚡</div><h3 style="font-size:24px; font-weight:700; margin-bottom:16px;">Lightning Fast</h3><p style="color:#64748b;">Our servers run at maximum speed.</p></div><div style="flex:1; min-width:280px; padding:40px; background:#f8fafc; border-radius:16px;"><div style="font-size:40px; margin-bottom:20px;">🛡️</div><h3 style="font-size:24px; font-weight:700; margin-bottom:16px;">Secure</h3><p style="color:#64748b;">Enterprise grade security built in.</p></div></div></section>
                    <section style="padding:80px 40px; background:#f8fafc; font-family:Inter, sans-serif;"><div style="display:flex; justify-content:center; gap:24px;"><div style="background:#fff; padding:40px; border-radius:16px; width:300px; text-align:center;"><h3 style="font-size:24px;">Pro</h3><div style="font-size:48px; font-weight:800; margin:20px 0;">$29</div><button style="width:100%; padding:12px; background:#0f172a; color:#fff; border:none; border-radius:8px; font-weight:600;">Upgrade</button></div></div></section>
                `;
            } else if (prompt.includes('portfolio') || prompt.includes('dark') || prompt.includes('agency')) {
                generatedHtml = `
                    <nav style="display:flex; justify-content:space-between; align-items:center; padding:30px 60px; background:#09090b; color:#fff; font-family:Inter, sans-serif;"><div style="font-size:24px; font-weight:800;">Studio.</div><div style="display:flex; gap:30px;"><a href="#" style="color:#a1a1aa; text-decoration:none;">Work</a><a href="#" style="color:#a1a1aa; text-decoration:none;">Contact</a></div></nav>
                    <section style="padding:150px 60px; background:#09090b; color:#fff; font-family:Inter, sans-serif;"><h1 style="font-size:80px; font-weight:900; line-height:1; max-width:800px; margin-bottom:40px;">We create <span style="color:#a855f7;">digital</span> experiences.</h1><p style="font-size:24px; color:#a1a1aa; max-width:600px;">Award winning design agency based in New York.</p></section>
                    <section style="padding:100px 60px; background:#18181b; color:#fff; font-family:Inter, sans-serif;"><h2 style="font-size:48px; font-weight:800; margin-bottom:60px;">Selected Work</h2><div style="display:flex; gap:40px; flex-wrap:wrap;"><div style="flex:1; min-width:300px; height:400px; background:#27272a; border-radius:12px; background-image:url(https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2864&auto=format&fit=crop); background-size:cover;"></div><div style="flex:1; min-width:300px; height:400px; background:#27272a; border-radius:12px; background-image:url(https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2940&auto=format&fit=crop); background-size:cover;"></div></div></section>
                `;
            } else {
                generatedHtml = `
                    <nav style="display:flex; justify-content:space-between; align-items:center; padding:20px 40px; background:#ffffff; border-bottom:1px solid #eaeaea; font-family:Inter, sans-serif;"><div style="font-size:24px; font-weight:800; color:#111827;">MySite</div><div style="display:flex; gap:24px; align-items:center;"><a href="#" style="text-decoration:none; color:#4b5563; font-weight:500;">Home</a><a href="#" style="background:#0393a7; color:#ffffff; padding:10px 20px; border-radius:6px; text-decoration:none; font-weight:600;">Contact</a></div></nav>
                    <section style="display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:120px 20px; background:linear-gradient(135deg, #0393a7, #1e3a5f); color:#fff; font-family:Inter, sans-serif;"><h1 style="font-size:56px; font-weight:800; margin-bottom:20px;">Welcome to your new site</h1><p style="font-size:20px; max-width:600px; margin-bottom:40px;">This layout was generated by AI based on your prompt: "${aiPrompt}"</p><button style="background:#fff; color:#1e3a5f; padding:16px 32px; border:none; border-radius:8px; font-size:16px; font-weight:700;">Explore More</button></section>
                `;
            }

            editor.setComponents(generatedHtml);
            setIsGenerating(false);
            setAiPrompt('');
        }, 1200);
    };

    const handlePreview = () => {
        if (editor) {
            editor.store();
            const html = editor.getHtml();
            const css = responsiveBaseCSS + '\n' + editor.getCss();
            localStorage.setItem(`event_page_${slug}_html`, html);
            localStorage.setItem(`event_page_${slug}_css`, css);
        }
        window.open(`/event/${slug}`, '_blank');
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 40px)', marginTop: '40px', overflow: 'hidden' }}>
            <style>{`
                /* ===== CANVA-STYLE DARK THEME ===== */
                .gjs-one-bg { background-color: #18181b !important; }
                .gjs-two-color { color: #e4e4e7 !important; }
                .gjs-three-bg { background-color: #27272a !important; color: #e4e4e7 !important; }
                .gjs-four-color, .gjs-four-color-h:hover { color: #0393a7 !important; }

                .gjs-pn-panel { background-color: #18181b !important; color: #e4e4e7 !important; }
                .gjs-pn-btn { color: #a1a1aa !important; border-radius: 6px !important; padding: 6px !important; margin: 2px !important; }
                .gjs-pn-btn:hover { color: #fff !important; background-color: #27272a !important; }
                .gjs-pn-btn.gjs-pn-active { color: #fff !important; background-color: #0393a7 !important; }

                .gjs-block { 
                    border: 1px solid #3f3f46 !important; color: #d4d4d8 !important; 
                    box-shadow: none !important; background-color: #27272a !important; 
                    border-radius: 8px !important; min-height: 60px !important;
                    font-size: 12px !important;
                }
                .gjs-block:hover { background-color: #3f3f46 !important; border-color: #0393a7 !important; }
                .gjs-block svg { fill: #a1a1aa !important; }

                .gjs-category-title { background-color: #18181b !important; color: #a1a1aa !important; border-bottom: 1px solid #27272a !important; font-size: 11px !important; text-transform: uppercase !important; letter-spacing: 1px !important; }
                
                .gjs-sm-sector .gjs-sm-sector-title { background-color: #27272a !important; color: #d4d4d8 !important; border: none !important; font-size: 12px !important; }
                .gjs-sm-property { background-color: transparent !important; }
                .gjs-field { background-color: #27272a !important; color: #e4e4e7 !important; border: 1px solid #3f3f46 !important; border-radius: 6px !important; }
                .gjs-field:focus-within { border-color: #0393a7 !important; }
                .gjs-sm-clear { color: #a1a1aa !important; }
                .gjs-clm-tags { background: #18181b !important; }
                .gjs-clm-tag { background: #27272a !important; color: #d4d4d8 !important; border-radius: 4px !important; }

                /* Canvas */
                .gjs-cv-canvas { background-color: #09090b !important; }
                .gjs-frame-wrapper { box-shadow: 0 0 40px rgba(0,0,0,0.5) !important; }

                /* Resize handles */
                .gjs-resizer-h {
                    width: 10px !important; height: 10px !important;
                    background-color: #fff !important; border: 2px solid #0393a7 !important;
                    border-radius: 50% !important; box-shadow: 0 0 4px rgba(0,0,0,0.4) !important;
                }
                .gjs-selected { outline: 2px solid #0393a7 !important; }

                /* Layer Manager */
                .gjs-layer { background: #18181b !important; color: #d4d4d8 !important; }
                .gjs-layer:hover { background: #27272a !important; }
                .gjs-layer.gjs-selected { background: #0393a7 !important; color: #fff !important; }
                .gjs-layers { display: block !important; width: 100% !important; height: 100% !important; }
                #layers-container .gjs-layer-name { font-size: 12px !important; }

                /* Toolbar */
                .gjs-toolbar { background: #18181b !important; border-radius: 6px !important; box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important; }
                .gjs-toolbar-item { color: #d4d4d8 !important; }
                .gjs-toolbar-item:hover { color: #0393a7 !important; }

                /* Scrollbar */
                .gjs-pn-views-container::-webkit-scrollbar, .gjs-blocks-c::-webkit-scrollbar { width: 4px !important; }
                .gjs-pn-views-container::-webkit-scrollbar-thumb, .gjs-blocks-c::-webkit-scrollbar-thumb { background: #3f3f46 !important; border-radius: 4px !important; }
                /* Top Bar Scrollbar */
                .top-bar-scroll::-webkit-scrollbar { height: 6px; }
                .top-bar-scroll::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 4px; }
                .top-bar-scroll::-webkit-scrollbar-track { background: transparent; }
            `}</style>

            {/* TOP BAR */}
            <div className="top-bar-scroll" style={{ padding: '8px 16px', backgroundColor: '#18181b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '16px', borderBottom: '1px solid #27272a', flexShrink: 0, overflowX: 'auto', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                    <button onClick={() => navigate(-1)} style={{ background: '#27272a', border: 'none', color: '#d4d4d8', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
                        ← Back
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '16px' }}>✨</span>
                        <span style={{ fontSize: '15px', fontWeight: '600', color: '#e4e4e7' }}>Page Builder</span>
                        <span style={{ fontSize: '11px', background: '#0393a7', padding: '2px 10px', borderRadius: '12px', color: '#fff', fontWeight: '500' }}>{slug}</span>
                    </div>
                </div>

                {/* AI GENERATOR INPUT */}
                <div style={{ flexShrink: 0, width: '400px', display: 'flex', alignItems: 'center', background: '#09090b', borderRadius: '8px', padding: '4px 4px 4px 16px', border: '1px solid #3f3f46' }}>
                    <span style={{ fontSize: '18px', marginRight: '8px' }}>🪄</span>
                    <input
                        type="text"
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAIGenerate() }}
                        placeholder="E.g. Build a dark mode portfolio for an agency..."
                        style={{ flex: 1, background: 'transparent', border: 'none', color: '#fff', fontSize: '14px', outline: 'none' }}
                        disabled={isGenerating}
                    />
                    <button
                        onClick={handleAIGenerate}
                        disabled={isGenerating || !aiPrompt.trim()}
                        style={{
                            background: isGenerating ? '#3f3f46' : '#a855f7',
                            color: '#fff',
                            border: 'none',
                            padding: '6px 16px',
                            borderRadius: '6px',
                            cursor: (isGenerating || !aiPrompt.trim()) ? 'not-allowed' : 'pointer',
                            fontSize: '13px',
                            fontWeight: '600',
                            transition: 'all 0.2s',
                            opacity: (isGenerating || !aiPrompt.trim()) ? 0.7 : 1
                        }}
                    >
                        {isGenerating ? 'Generating...' : 'Generate'}
                    </button>
                </div>

                {/* ADVANCED DEVELOPER TOOLBAR */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 16px', borderLeft: '1px solid #3f3f46', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', background: '#27272a', borderRadius: '4px', overflow: 'hidden', border: '1px solid #3f3f46' }}>
                        <button onClick={() => handleZoom(-10)} title="Zoom Out" style={{ background: 'transparent', border: 'none', color: '#d4d4d8', cursor: 'pointer', padding: '4px 8px', borderRight: '1px solid #3f3f46' }}>-</button>
                        <span style={{ fontSize: '12px', padding: '0 8px', color: '#a1a1aa' }}>{editor ? Math.round(editor.Canvas.getZoom()) : 100}%</span>
                        <button onClick={() => handleZoom(10)} title="Zoom In" style={{ background: 'transparent', border: 'none', color: '#d4d4d8', cursor: 'pointer', padding: '4px 8px', borderLeft: '1px solid #3f3f46' }}>+</button>
                    </div>
                    <div style={{ width: '1px', height: '24px', background: '#3f3f46', margin: '0 4px' }}></div>
                    <button
                        onClick={() => {
                            if (editor) {
                                const newMode = !isFreeDrag;
                                editor.setDragMode(newMode ? 'translate' : '');
                                setIsFreeDrag(newMode);
                            }
                        }}
                        title={isFreeDrag ? "Free Drag ON (Transform)" : "Flow Drag ON"}
                        style={{ background: isFreeDrag ? '#0393a7' : 'transparent', border: '1px solid ' + (isFreeDrag ? '#0393a7' : '#3f3f46'), color: '#fff', cursor: 'pointer', fontSize: '13px', padding: '4px 10px', borderRadius: '4px', fontWeight: '600' }}
                    >
                        {isFreeDrag ? '✨ Free Drag' : '📦 Flow Drag'}
                    </button>
                    <div style={{ width: '1px', height: '24px', background: '#3f3f46', margin: '0 4px' }}></div>
                    <button onClick={() => editor && editor.runCommand('core:copy')} title="Copy (Ctrl+C)" style={{ background: 'transparent', border: 'none', color: '#d4d4d8', cursor: 'pointer', fontSize: '18px', padding: '4px 8px', borderRadius: '4px' }} onMouseEnter={e => e.target.style.background = '#3f3f46'} onMouseLeave={e => e.target.style.background = 'transparent'}>
                        📄
                    </button>
                    <button onClick={() => editor && editor.runCommand('core:paste')} title="Paste (Ctrl+V)" style={{ background: 'transparent', border: 'none', color: '#d4d4d8', cursor: 'pointer', fontSize: '18px', padding: '4px 8px', borderRadius: '4px' }} onMouseEnter={e => e.target.style.background = '#3f3f46'} onMouseLeave={e => e.target.style.background = 'transparent'}>
                        📋
                    </button>
                    <button onClick={() => editor && editor.runCommand('core:clone')} title="Duplicate" style={{ background: 'transparent', border: 'none', color: '#d4d4d8', cursor: 'pointer', fontSize: '18px', padding: '4px 8px', borderRadius: '4px' }} onMouseEnter={e => e.target.style.background = '#3f3f46'} onMouseLeave={e => e.target.style.background = 'transparent'}>
                        👯
                    </button>
                    <div style={{ width: '1px', height: '24px', background: '#3f3f46', margin: '0 4px' }}></div>
                    <button onClick={() => editor && editor.runCommand('add-overlay')} title="Toggle Dark Overlay" style={{ background: 'transparent', border: 'none', color: '#d4d4d8', cursor: 'pointer', fontSize: '18px', padding: '4px 8px', borderRadius: '4px' }} onMouseEnter={e => e.target.style.background = '#3f3f46'} onMouseLeave={e => e.target.style.background = 'transparent'}>
                        🌓
                    </button>
                    <div style={{ width: '1px', height: '24px', background: '#3f3f46', margin: '0 4px' }}></div>
                    <button onClick={() => editor && editor.UndoManager.undo()} title="Undo (Ctrl+Z)" style={{ background: 'transparent', border: 'none', color: '#d4d4d8', cursor: 'pointer', fontSize: '18px', padding: '4px 8px', borderRadius: '4px' }} onMouseEnter={e => e.target.style.background = '#3f3f46'} onMouseLeave={e => e.target.style.background = 'transparent'}>
                        ↩️
                    </button>
                    <button onClick={() => editor && editor.UndoManager.redo()} title="Redo (Ctrl+Y)" style={{ background: 'transparent', border: 'none', color: '#d4d4d8', cursor: 'pointer', fontSize: '18px', padding: '4px 8px', borderRadius: '4px' }} onMouseEnter={e => e.target.style.background = '#3f3f46'} onMouseLeave={e => e.target.style.background = 'transparent'}>
                        ↪️
                    </button>
                    <button onClick={() => { if (editor && window.confirm('Are you sure you want to clear the entire canvas?')) editor.DomComponents.clear(); }} title="Clear Canvas" style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '18px', padding: '4px 8px', borderRadius: '4px' }} onMouseEnter={e => e.target.style.background = '#3f3f46'} onMouseLeave={e => e.target.style.background = 'transparent'}>
                        🗑️
                    </button>
                    <div style={{ width: '1px', height: '24px', background: '#3f3f46', margin: '0 4px' }}></div>
                    <button onClick={() => editor && editor.runCommand('core:component-outline')} title="Toggle Outlines" style={{ background: 'transparent', border: 'none', color: '#d4d4d8', cursor: 'pointer', fontSize: '18px', padding: '4px 8px', borderRadius: '4px' }} onMouseEnter={e => e.target.style.background = '#3f3f46'} onMouseLeave={e => e.target.style.background = 'transparent'}>
                        📐
                    </button>
                    <button onClick={() => editor && editor.runCommand('open-assets')} title="Asset Manager (Images)" style={{ background: 'transparent', border: 'none', color: '#d4d4d8', cursor: 'pointer', fontSize: '18px', padding: '4px 8px', borderRadius: '4px' }} onMouseEnter={e => e.target.style.background = '#3f3f46'} onMouseLeave={e => e.target.style.background = 'transparent'}>
                        🖼️
                    </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
                    <button onClick={() => setShowTemplates(true)} style={{ background: '#27272a', border: '1px solid #3f3f46', color: '#d4d4d8', padding: '7px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
                        📑 Templates
                    </button>
                    <button onClick={handleDevMode} style={{ background: '#27272a', border: '1px solid #3f3f46', color: '#a855f7', padding: '7px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                        &lt;/&gt; Code
                    </button>
                    <button onClick={handlePreview} style={{ background: '#27272a', border: '1px solid #3f3f46', color: '#d4d4d8', padding: '7px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
                        👁️ Preview
                    </button>
                    <button
                        onClick={handleSave}
                        style={{ padding: '7px 20px', backgroundColor: saved ? '#10b981' : '#0393a7', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px', transition: 'all 0.2s' }}
                    >
                        {isSaving ? '⏳ Saving...' : saved ? '✅ Saved!' : '💾 Save & Publish'}
                    </button>
                </div>
            </div>

            {/* EDITOR */}
            <div id="gjs" ref={editorRef} style={{ flex: 1 }}></div>

            {/* DEVELOPER MODE MODAL */}
            {showDevMode && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px' }}>
                    <div style={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: '12px', width: '100%', maxWidth: '900px', height: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
                        <div style={{ padding: '16px 24px', borderBottom: '1px solid #27272a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#09090b' }}>
                            <h3 style={{ margin: 0, color: '#e4e4e7', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ color: '#a855f7' }}>&lt;/&gt;</span> Developer Export
                            </h3>
                            <button onClick={() => setShowDevMode(false)} style={{ background: 'transparent', border: 'none', color: '#a1a1aa', cursor: 'pointer', fontSize: '20px' }}>×</button>
                        </div>

                        <div style={{ display: 'flex', borderBottom: '1px solid #27272a', backgroundColor: '#18181b' }}>
                            <button onClick={() => setDevTab('react')} style={{ flex: 1, padding: '12px', background: devTab === 'react' ? '#27272a' : 'transparent', border: 'none', color: devTab === 'react' ? '#a855f7' : '#a1a1aa', cursor: 'pointer', fontWeight: '600' }}>React (JSX)</button>
                            <button onClick={() => setDevTab('html')} style={{ flex: 1, padding: '12px', background: devTab === 'html' ? '#27272a' : 'transparent', border: 'none', color: devTab === 'html' ? '#38bdf8' : '#a1a1aa', cursor: 'pointer', fontWeight: '600' }}>Raw HTML/CSS</button>
                            <button onClick={() => setDevTab('json')} style={{ flex: 1, padding: '12px', background: devTab === 'json' ? '#27272a' : 'transparent', border: 'none', color: devTab === 'json' ? '#fbbf24' : '#a1a1aa', cursor: 'pointer', fontWeight: '600' }}>Design AST (JSON)</button>
                        </div>

                        <div style={{ flex: 1, padding: '24px', overflow: 'auto', backgroundColor: '#18181b', position: 'relative' }}>
                            {devTab === 'react' && (
                                <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                        <p style={{ color: '#a1a1aa', fontSize: '13px', margin: 0 }}>Paste this into a .jsx file</p>
                                        <button onClick={() => copyToClipboard(devCode.react)} style={{ background: '#a855f7', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Copy React Code</button>
                                    </div>
                                    <pre style={{ margin: 0, background: '#09090b', padding: '20px', borderRadius: '8px', color: '#a855f7', fontSize: '13px', overflowX: 'auto', border: '1px solid #27272a', fontFamily: 'monospace' }}>
                                        <code>{devCode.react}</code>
                                    </pre>
                                    <p style={{ color: '#a1a1aa', fontSize: '13px', margin: '24px 0 8px 0' }}>Styles (styles.css)</p>
                                    <pre style={{ margin: 0, background: '#09090b', padding: '20px', borderRadius: '8px', color: '#38bdf8', fontSize: '13px', overflowX: 'auto', border: '1px solid #27272a', fontFamily: 'monospace' }}>
                                        <code>{devCode.css}</code>
                                    </pre>
                                </>
                            )}
                            {devTab === 'html' && (
                                <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                        <p style={{ color: '#a1a1aa', fontSize: '13px', margin: 0 }}>Raw HTML Output</p>
                                        <button onClick={() => copyToClipboard(devCode.html)} style={{ background: '#38bdf8', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Copy HTML</button>
                                    </div>
                                    <pre style={{ margin: 0, background: '#09090b', padding: '20px', borderRadius: '8px', color: '#38bdf8', fontSize: '13px', overflowX: 'auto', border: '1px solid #27272a', fontFamily: 'monospace' }}>
                                        <code>{devCode.html}</code>
                                    </pre>
                                    <p style={{ color: '#a1a1aa', fontSize: '13px', margin: '24px 0 8px 0' }}>Raw CSS Output</p>
                                    <pre style={{ margin: 0, background: '#09090b', padding: '20px', borderRadius: '8px', color: '#38bdf8', fontSize: '13px', overflowX: 'auto', border: '1px solid #27272a', fontFamily: 'monospace' }}>
                                        <code>{devCode.css}</code>
                                    </pre>
                                </>
                            )}
                            {devTab === 'json' && (
                                <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                        <p style={{ color: '#a1a1aa', fontSize: '13px', margin: 0 }}>GrapesJS Component Tree (AST)</p>
                                        <button onClick={() => copyToClipboard(devCode.json)} style={{ background: '#fbbf24', color: '#000', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Copy JSON</button>
                                    </div>
                                    <pre style={{ margin: 0, background: '#09090b', padding: '20px', borderRadius: '8px', color: '#fbbf24', fontSize: '13px', overflowX: 'auto', border: '1px solid #27272a', fontFamily: 'monospace' }}>
                                        <code>{devCode.json}</code>
                                    </pre>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* TEMPLATES MODAL */}
            {showTemplates && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px' }}>
                    <div style={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: '12px', width: '100%', maxWidth: '800px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
                        <div style={{ padding: '16px 24px', borderBottom: '1px solid #27272a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#09090b' }}>
                            <h3 style={{ margin: 0, color: '#e4e4e7', fontSize: '16px' }}>📑 Choose a Template</h3>
                            <button onClick={() => setShowTemplates(false)} style={{ background: 'transparent', border: 'none', color: '#a1a1aa', cursor: 'pointer', fontSize: '20px' }}>×</button>
                        </div>
                        <div style={{ flex: 1, padding: '24px', overflow: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div
                                onClick={() => handleLoadTemplate(`<div style="width:100%;padding:100px 20px;text-align:center;background:#0f172a;color:#fff;"><h1 style="font-size:48px;">SaaS Platform</h1><p>The modern way to manage your business.</p><button style="background:#3b82f6;color:#fff;padding:12px 24px;border:none;border-radius:6px;margin-top:20px;">Start Free Trial</button></div>`)}
                                style={{ background: '#27272a', padding: '20px', borderRadius: '8px', cursor: 'pointer', border: '1px solid #3f3f46', textAlign: 'center' }}
                            >
                                <div style={{ fontSize: '40px', marginBottom: '10px' }}>🚀</div>
                                <h4 style={{ margin: 0, color: '#fff' }}>SaaS Landing Page</h4>
                            </div>
                            <div
                                onClick={() => handleLoadTemplate(`<div style="width:100%;padding:80px 20px;text-align:center;background:#fff;color:#000;"><h1 style="font-size:40px;color:#0393a7;">Jungle Resort Event</h1><p>Join us for the ultimate party.</p><div style="background:#0393a7;color:#fff;padding:40px;border-radius:12px;display:inline-block;margin-top:20px;"><h2>Ticket: ₹999</h2></div></div>`)}
                                style={{ background: '#27272a', padding: '20px', borderRadius: '8px', cursor: 'pointer', border: '1px solid #3f3f46', textAlign: 'center' }}
                            >
                                <div style={{ fontSize: '40px', marginBottom: '10px' }}>🎉</div>
                                <h4 style={{ margin: 0, color: '#fff' }}>Event Page</h4>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Right Click Context Menu */}
            {contextMenu.show && (
                <div style={{
                    position: 'absolute',
                    top: contextMenu.y,
                    left: contextMenu.x,
                    background: '#18181b',
                    border: '1px solid #3f3f46',
                    borderRadius: '8px',
                    padding: '4px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                    zIndex: 9999,
                    minWidth: '180px',
                    display: 'flex',
                    flexDirection: 'column',
                    fontFamily: 'Inter, sans-serif'
                }}>
                    <button onClick={() => handleContextMenuCommand('core:copy')} style={{ background: 'transparent', border: 'none', color: '#e4e4e7', padding: '8px 12px', textAlign: 'left', cursor: 'pointer', borderRadius: '4px', fontSize: '13px' }} onMouseEnter={e => e.target.style.background = '#27272a'} onMouseLeave={e => e.target.style.background = 'transparent'}>📄 Copy</button>
                    <button onClick={() => handleContextMenuCommand('core:paste')} style={{ background: 'transparent', border: 'none', color: '#e4e4e7', padding: '8px 12px', textAlign: 'left', cursor: 'pointer', borderRadius: '4px', fontSize: '13px' }} onMouseEnter={e => e.target.style.background = '#27272a'} onMouseLeave={e => e.target.style.background = 'transparent'}>📋 Paste</button>
                    <button onClick={() => handleContextMenuCommand('core:clone')} style={{ background: 'transparent', border: 'none', color: '#e4e4e7', padding: '8px 12px', textAlign: 'left', cursor: 'pointer', borderRadius: '4px', fontSize: '13px' }} onMouseEnter={e => e.target.style.background = '#27272a'} onMouseLeave={e => e.target.style.background = 'transparent'}>👯 Duplicate</button>
                    <div style={{ height: '1px', background: '#3f3f46', margin: '4px 0' }}></div>
                    <button onClick={() => handleContextMenuCommand('bring-forward')} style={{ background: 'transparent', border: 'none', color: '#e4e4e7', padding: '8px 12px', textAlign: 'left', cursor: 'pointer', borderRadius: '4px', fontSize: '13px' }} onMouseEnter={e => e.target.style.background = '#27272a'} onMouseLeave={e => e.target.style.background = 'transparent'}>🔼 Bring Forward</button>
                    <button onClick={() => handleContextMenuCommand('send-backward')} style={{ background: 'transparent', border: 'none', color: '#e4e4e7', padding: '8px 12px', textAlign: 'left', cursor: 'pointer', borderRadius: '4px', fontSize: '13px' }} onMouseEnter={e => e.target.style.background = '#27272a'} onMouseLeave={e => e.target.style.background = 'transparent'}>🔽 Send Backward</button>
                    <div style={{ height: '1px', background: '#3f3f46', margin: '4px 0' }}></div>
                    <button onClick={() => handleContextMenuCommand('add-overlay')} style={{ background: 'transparent', border: 'none', color: '#38bdf8', padding: '8px 12px', textAlign: 'left', cursor: 'pointer', borderRadius: '4px', fontSize: '13px' }} onMouseEnter={e => e.target.style.background = '#27272a'} onMouseLeave={e => e.target.style.background = 'transparent'}>🌓 Toggle Dark Overlay</button>
                    <button onClick={() => handleContextMenuCommand('delete')} style={{ background: 'transparent', border: 'none', color: '#ef4444', padding: '8px 12px', textAlign: 'left', cursor: 'pointer', borderRadius: '4px', fontSize: '13px' }} onMouseEnter={e => e.target.style.background = '#450a0a'} onMouseLeave={e => e.target.style.background = 'transparent'}>🗑️ Delete</button>
                </div>
            )}
        </div>
    );
}
