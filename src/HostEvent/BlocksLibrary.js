export const loadProBlocks = (editor) => {
    const bm = editor.BlockManager;

    const categoryNav = '1. Navigation';
    const categoryHero = '2. Hero Sections';
    const categoryFeatures = '3. Features';
    const categorySocial = '4. Social Proof';
    const categoryPricing = '5. Pricing';
    const categoryFooter = '6. Footers';
    const categoryMedia = '7. Media & Emojis';

    // --- NAVIGATION ---
    bm.add('nav-modern', {
        label: 'Modern Navbar',
        category: categoryNav,
        content: `
            <nav style="display:flex; justify-content:space-between; align-items:center; padding:20px 40px; background:#ffffff; border-bottom:1px solid #eaeaea; font-family:Inter, sans-serif;">
                <div style="font-size:24px; font-weight:800; color:#111827;">Brand<span style="color:#0393a7;">.</span></div>
                <div style="display:flex; gap:24px; align-items:center;">
                    <a href="#" style="text-decoration:none; color:#4b5563; font-weight:500;">Features</a>
                    <a href="#" style="text-decoration:none; color:#4b5563; font-weight:500;">Pricing</a>
                    <a href="#" style="text-decoration:none; color:#4b5563; font-weight:500;">About</a>
                    <a href="#" style="background:#111827; color:#ffffff; padding:10px 20px; border-radius:6px; text-decoration:none; font-weight:600;">Get Started</a>
                </div>
            </nav>
        `
    });

    // --- HERO SECTIONS ---
    bm.add('hero-split', {
        label: 'Split Hero',
        category: categoryHero,
        content: `
            <section style="display:flex; flex-wrap:wrap; align-items:center; padding:80px 40px; background:#f8fafc; font-family:Inter, sans-serif; min-height:80vh;">
                <div style="flex:1; min-width:300px; padding-right:40px;">
                    <h1 style="font-size:56px; font-weight:800; color:#0f172a; line-height:1.1; margin-bottom:24px;">Build your next big idea faster.</h1>
                    <p style="font-size:18px; color:#475569; margin-bottom:32px; line-height:1.6;">The ultimate platform for creating stunning websites in minutes without writing a single line of code.</p>
                    <div style="display:flex; gap:16px;">
                        <button style="background:#0393a7; color:#fff; padding:16px 32px; border:none; border-radius:8px; font-size:16px; font-weight:600; cursor:pointer;">Start Building</button>
                        <button style="background:#fff; color:#0f172a; border:2px solid #e2e8f0; padding:16px 32px; border-radius:8px; font-size:16px; font-weight:600; cursor:pointer;">Watch Demo</button>
                    </div>
                </div>
                <div style="flex:1; min-width:300px;">
                    <img src="https://images.unsplash.com/photo-1498050108023-c5249f4df085?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" style="width:100%; border-radius:16px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);" />
                </div>
            </section>
        `
    });

    // --- FEATURES ---
    bm.add('features-grid', {
        label: '3x3 Features Grid',
        category: categoryFeatures,
        content: `
            <section style="padding:80px 40px; background:#ffffff; font-family:Inter, sans-serif;">
                <div style="text-align:center; max-width:600px; margin:0 auto 60px auto;">
                    <h2 style="font-size:36px; font-weight:800; color:#0f172a; margin-bottom:16px;">Everything you need</h2>
                    <p style="font-size:18px; color:#64748b;">Powerful features to help you manage your events and grow your business.</p>
                </div>
                <div style="display:flex; flex-wrap:wrap; gap:32px; justify-content:center;">
                    <div style="flex:1; min-width:280px; padding:32px; background:#f8fafc; border-radius:12px; border:1px solid #e2e8f0;">
                        <div style="font-size:32px; margin-bottom:16px;">🚀</div>
                        <h3 style="font-size:20px; font-weight:700; color:#0f172a; margin-bottom:12px;">Fast Performance</h3>
                        <p style="color:#64748b; line-height:1.6;">Built on modern architecture ensuring lightning fast load times.</p>
                    </div>
                    <div style="flex:1; min-width:280px; padding:32px; background:#f8fafc; border-radius:12px; border:1px solid #e2e8f0;">
                        <div style="font-size:32px; margin-bottom:16px;">🔒</div>
                        <h3 style="font-size:20px; font-weight:700; color:#0f172a; margin-bottom:12px;">Secure Data</h3>
                        <p style="color:#64748b; line-height:1.6;">Your data is encrypted and stored safely with enterprise-grade security.</p>
                    </div>
                    <div style="flex:1; min-width:280px; padding:32px; background:#f8fafc; border-radius:12px; border:1px solid #e2e8f0;">
                        <div style="font-size:32px; margin-bottom:16px;">📱</div>
                        <h3 style="font-size:20px; font-weight:700; color:#0f172a; margin-bottom:12px;">Mobile Ready</h3>
                        <p style="color:#64748b; line-height:1.6;">Looks perfect on every device, from massive desktops to tiny phones.</p>
                    </div>
                </div>
            </section>
        `
    });

    // --- TESTIMONIALS ---
    bm.add('testimonial-cards', {
        label: 'Testimonial Cards',
        category: categorySocial,
        content: `
            <section style="padding:80px 40px; background:#0f172a; font-family:Inter, sans-serif;">
                <h2 style="font-size:36px; font-weight:800; color:#ffffff; text-align:center; margin-bottom:60px;">Loved by creators</h2>
                <div style="display:flex; flex-wrap:wrap; gap:24px; justify-content:center;">
                    <div style="flex:1; min-width:300px; background:#1e293b; padding:32px; border-radius:12px;">
                        <div style="color:#fbbf24; font-size:20px; margin-bottom:16px;">★★★★★</div>
                        <p style="color:#e2e8f0; font-size:16px; line-height:1.6; margin-bottom:24px;">"This platform completely changed how we handle our events. It's incredibly intuitive and fast."</p>
                        <div style="display:flex; align-items:center; gap:12px;">
                            <div style="width:40px; height:40px; background:#334155; border-radius:50%;"></div>
                            <div>
                                <h4 style="color:#fff; margin:0; font-size:14px;">Sarah Jenkins</h4>
                                <p style="color:#94a3b8; margin:0; font-size:12px;">Event Manager</p>
                            </div>
                        </div>
                    </div>
                    <div style="flex:1; min-width:300px; background:#1e293b; padding:32px; border-radius:12px;">
                        <div style="color:#fbbf24; font-size:20px; margin-bottom:16px;">★★★★★</div>
                        <p style="color:#e2e8f0; font-size:16px; line-height:1.6; margin-bottom:24px;">"I was able to build my entire website in under 5 minutes. Highly recommended!"</p>
                        <div style="display:flex; align-items:center; gap:12px;">
                            <div style="width:40px; height:40px; background:#334155; border-radius:50%;"></div>
                            <div>
                                <h4 style="color:#fff; margin:0; font-size:14px;">Mike Ross</h4>
                                <p style="color:#94a3b8; margin:0; font-size:12px;">Entrepreneur</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        `
    });

    // --- PRICING ---
    bm.add('pricing-tables', {
        label: 'Pricing 3-Tiers',
        category: categoryPricing,
        content: `
            <section style="padding:80px 40px; background:#f8fafc; font-family:Inter, sans-serif;">
                <div style="text-align:center; margin-bottom:60px;">
                    <h2 style="font-size:36px; font-weight:800; color:#0f172a; margin-bottom:16px;">Simple, transparent pricing</h2>
                    <p style="font-size:18px; color:#64748b;">No hidden fees. Cancel anytime.</p>
                </div>
                <div style="display:flex; flex-wrap:wrap; gap:24px; justify-content:center; align-items:center;">
                    <!-- Basic -->
                    <div style="flex:1; min-width:280px; max-width:350px; background:#fff; padding:40px; border-radius:16px; box-shadow:0 10px 15px -3px rgba(0,0,0,0.1);">
                        <h3 style="font-size:20px; color:#0f172a; margin-bottom:16px;">Basic</h3>
                        <div style="font-size:48px; font-weight:800; color:#0f172a; margin-bottom:24px;">$9<span style="font-size:16px; color:#64748b; font-weight:400;">/mo</span></div>
                        <ul style="list-style:none; padding:0; margin:0 0 32px 0; color:#475569; line-height:2;">
                            <li>✓ 1 Project</li>
                            <li>✓ Basic Analytics</li>
                            <li>✓ 24hr Support</li>
                        </ul>
                        <button style="width:100%; padding:12px; background:#f1f5f9; color:#0f172a; border:none; border-radius:8px; font-weight:600; cursor:pointer;">Choose Basic</button>
                    </div>
                    <!-- Pro -->
                    <div style="flex:1; min-width:280px; max-width:350px; background:#0f172a; padding:48px 40px; border-radius:16px; box-shadow:0 20px 25px -5px rgba(0,0,0,0.2); transform:scale(1.05);">
                        <div style="background:#0393a7; color:#fff; padding:4px 12px; border-radius:12px; font-size:12px; font-weight:700; display:inline-block; margin-bottom:16px;">MOST POPULAR</div>
                        <h3 style="font-size:20px; color:#fff; margin-bottom:16px;">Professional</h3>
                        <div style="font-size:48px; font-weight:800; color:#fff; margin-bottom:24px;">$29<span style="font-size:16px; color:#94a3b8; font-weight:400;">/mo</span></div>
                        <ul style="list-style:none; padding:0; margin:0 0 32px 0; color:#cbd5e1; line-height:2;">
                            <li>✓ Unlimited Projects</li>
                            <li>✓ Advanced Analytics</li>
                            <li>✓ Priority Support</li>
                            <li>✓ Custom Domain</li>
                        </ul>
                        <button style="width:100%; padding:12px; background:#0393a7; color:#fff; border:none; border-radius:8px; font-weight:600; cursor:pointer;">Choose Pro</button>
                    </div>
                </div>
            </section>
        `
    });

    // --- FOOTER ---
    bm.add('footer-large', {
        label: 'Large Footer',
        category: categoryFooter,
        content: `
            <footer style="background:#09090b; color:#a1a1aa; padding:80px 40px 40px 40px; font-family:Inter, sans-serif;">
                <div style="display:flex; flex-wrap:wrap; gap:40px; justify-content:space-between; margin-bottom:60px;">
                    <div style="flex:2; min-width:250px;">
                        <h2 style="font-size:24px; color:#fff; font-weight:800; margin-bottom:20px;">Brand.</h2>
                        <p style="line-height:1.6; max-width:300px;">Making the world a better place through constructing elegant hierarchies.</p>
                    </div>
                    <div style="flex:1; min-width:150px;">
                        <h4 style="color:#fff; font-weight:600; margin-bottom:20px;">Solutions</h4>
                        <p style="margin-bottom:12px;"><a href="#" style="color:#a1a1aa; text-decoration:none;">Marketing</a></p>
                        <p style="margin-bottom:12px;"><a href="#" style="color:#a1a1aa; text-decoration:none;">Analytics</a></p>
                        <p style="margin-bottom:12px;"><a href="#" style="color:#a1a1aa; text-decoration:none;">Commerce</a></p>
                    </div>
                    <div style="flex:1; min-width:150px;">
                        <h4 style="color:#fff; font-weight:600; margin-bottom:20px;">Support</h4>
                        <p style="margin-bottom:12px;"><a href="#" style="color:#a1a1aa; text-decoration:none;">Pricing</a></p>
                        <p style="margin-bottom:12px;"><a href="#" style="color:#a1a1aa; text-decoration:none;">Documentation</a></p>
                        <p style="margin-bottom:12px;"><a href="#" style="color:#a1a1aa; text-decoration:none;">Guides</a></p>
                    </div>
                </div>
                <div style="border-top:1px solid #27272a; padding-top:32px; display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center;">
                    <p style="margin:0;">© 2026 Brand Inc. All rights reserved.</p>
                    <div style="display:flex; gap:16px;">
                        <span>Twitter</span>
                        <span>GitHub</span>
                        <span>Dribbble</span>
                    </div>
                </div>
            </footer>
        `
    });
    // --- MEDIA & EMOJIS ---
    bm.add('image-upload', {
        label: '🖼️ Image Upload',
        category: categoryMedia,
        content: { type: 'image' }, // Built-in GrapesJS image type triggers asset manager
    });

    bm.add('emoji-sticker', {
        label: '😀 Emoji Sticker',
        category: categoryMedia,
        content: `
            <div style="font-size:120px; text-align:center; display:inline-block; line-height:1; user-select:none; cursor:pointer; padding:20px;">
                🚀
            </div>
        `
    });

};
