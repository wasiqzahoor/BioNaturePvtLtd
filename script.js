// ============================================
// BIONATURE — MODERN INTERACTIONS
// ============================================

// NAVBAR SCROLL
const header = document.getElementById('header');
let lastScroll = 0;
window.addEventListener('scroll', () => {
    const currentScroll = window.scrollY;
    header.classList.toggle('scrolled', currentScroll > 50);
    lastScroll = currentScroll;
});

// MOBILE MENU
const hamburger = document.getElementById('hamburger');
const nav = document.getElementById('nav');
function toggleMenu() { hamburger.classList.toggle('active'); nav.classList.toggle('active'); document.body.style.overflow = nav.classList.contains('active') ? 'hidden' : ''; }
function closeMenu() { hamburger.classList.remove('active'); nav.classList.remove('active'); document.body.style.overflow = ''; }

// HERO VIDEO — eager autoplay for instant show (preloaded in <head>)
(function() {
    var video = document.getElementById('heroBgVideo');
    if (!video) return;
    var tryPlay = function() { var p = video.play(); if (p && p.catch) p.catch(function(){}); };
    tryPlay();
    document.addEventListener('touchend', tryPlay, { once: true });
})();

// DELAYED THIRD-PARTY (GA / GTM / Cookie / Formspree) — after window idle
(function() {
    var loaded = false;
    function loadThirdParty() {
        if (loaded) return; loaded = true;
        function add(src, attrs) {
            var s = document.createElement('script');
            s.src = src; s.async = true;
            if (attrs) for (var k in attrs) s.setAttribute(k, attrs[k]);
            document.head.appendChild(s);
        }
        // Google Analytics
        add('https://www.googletagmanager.com/gtag/js?id=G-GZP8Z1P0WH');
        window.dataLayer = window.dataLayer || [];
        window.gtag = window.gtag || function(){ window.dataLayer.push(arguments); };
        window.gtag('js', new Date());
        window.gtag('config', 'G-GZP8Z1P0WH');
        // Google Tag Manager
        (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-5FSL249T');
        // Cookie consent
        add('//cdn.cookie-script.com/s/474b9e3e6601ba2288ca5e6285508b23.js', { charset: 'UTF-8' });
        // Formspree AJAX + init (contact form)
        add('https://unpkg.com/@formspree/ajax@1', { defer: '' });
        var tries = 0;
        var t = setInterval(function() {
            tries++;
            if (window.formspree && document.querySelector('#contactForm')) {
                clearInterval(t);
                try { window.formspree('initForm', { formElement: '#contactForm', formId: 'xgawgaek' }); } catch(e){}
            } else if (tries > 40) clearInterval(t);
        }, 500);
    }
    function schedule() {
        if ('requestIdleCallback' in window) requestIdleCallback(loadThirdParty, { timeout: 5000 });
        else setTimeout(loadThirdParty, 3000);
    }
    if (document.readyState === 'complete') schedule();
    else window.addEventListener('load', schedule);
})();

// SCROLL REVEAL
const revealEls = document.querySelectorAll('.reveal');
const revealObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
revealEls.forEach(el => revealObs.observe(el));

// COUNTER ANIMATION
function animateCounters() {
    const counters = document.querySelectorAll('.stat-num');
    counters.forEach(counter => {
        if (counter.dataset.animated) return;
        const text = counter.textContent;
        const match = text.match(/(\d+)/);
        if (!match) return;
        const target = parseInt(match[1]);
        const suffix = text.replace(/\d+/, '');
        const duration = 1500;
        const start = performance.now();
        counter.dataset.animated = 'true';

        function update(now) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(target * eased);
            counter.textContent = current + suffix;
            if (progress < 1) requestAnimationFrame(update);
        }
        requestAnimationFrame(update);
    });
}

const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) animateCounters();
    });
}, { threshold: 0.5 });
document.querySelectorAll('.about-stats-row').forEach(el => statsObserver.observe(el));

// pH VISUALIZER — removed in redesign (replaced by #approach section)
// kept as no-op guard for older cached HTML
(function(){ var s=document.getElementById('phSlider'); if(!s) return; })();

// SMOOTH SCROLL
document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
    anchor.addEventListener('click', function(e) {
        var target = document.querySelector(this.getAttribute('href'));
        if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); closeMenu(); }
    });
});

// ==================== PRODUCT MODALS (Detail Popups, lazy images) ====================
function hydrateModalImages(modal) {
    modal.querySelectorAll('img[data-src]').forEach(function(img) {
        img.src = img.getAttribute('data-src');
        img.removeAttribute('data-src');
    });
}
function openProductModal(id) {
    closeProductModal(true);
    var overlay = document.getElementById('productModalOverlay');
    var modal = document.getElementById('modal-' + id);
    if (!modal) return;
    hydrateModalImages(modal);
    if (overlay) overlay.classList.add('open');
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    // reset right-side scroll to top, keep left gallery fixed
    var info = modal.querySelector('.pm-info');
    if (info) info.scrollTop = 0;
    var content = modal.querySelector('.product-modal-content');
    if (content) content.scrollTop = 0;
    // animate gallery main image
    var mainImg = modal.querySelector('.pm-main-img img');
    if (mainImg) { mainImg.style.opacity = '0'; setTimeout(function(){ mainImg.style.opacity = '1'; }, 50); }
}
// thumbnail switching (delegated, works with lazy data-full)
document.addEventListener('click', function(e) {
    var thumb = e.target && e.target.closest ? e.target.closest('.pm-thumbs img') : null;
    if (!thumb) return;
    var gallery = thumb.closest('.pm-gallery');
    if (!gallery) return;
    var main = gallery.querySelector('.pm-main-img img');
    var full = thumb.getAttribute('data-full') || thumb.getAttribute('data-src') || thumb.src;
    if (main && full) {
        if (main.getAttribute('data-src')) { main.src = main.getAttribute('data-src'); main.removeAttribute('data-src'); }
        main.src = full;
    }
    gallery.querySelectorAll('.pm-thumbs img').forEach(function(t){ t.classList.remove('active'); });
    thumb.classList.add('active');
});
// background-preload popup galleries after first paint (instant open, no flash)
(function() {
    var preloadModals = function() {
        document.querySelectorAll('.product-modal img[data-src]').forEach(function(img) {
            var src = img.getAttribute('data-src');
            var pre = new Image();
            pre.src = src;
            pre.decode && pre.decode().catch(function(){});
        });
    };
    if (document.readyState === 'complete') {
        if ('requestIdleCallback' in window) requestIdleCallback(preloadModals, { timeout: 4000 });
        else setTimeout(preloadModals, 2000);
    } else {
        window.addEventListener('load', function() {
            if ('requestIdleCallback' in window) requestIdleCallback(preloadModals, { timeout: 4000 });
            else setTimeout(preloadModals, 2000);
        });
    }
})();
function closeProductModal(silent) {
    var overlay = document.getElementById('productModalOverlay');
    if (overlay) overlay.classList.remove('open');
    document.querySelectorAll('.product-modal.open').forEach(function(m){ m.classList.remove('open'); });
    if (!silent) {
        // only restore scroll if cart is not open
        var cartDrawer = document.getElementById('cartDrawer');
        if (!cartDrawer || !cartDrawer.classList.contains('open')) document.body.style.overflow = '';
    }
}
document.addEventListener('keydown', function(e){ if (e.key === 'Escape') { closeProductModal(); closeCart(); } });

// ==================== CART SYSTEM (Price-Hide Mode) ====================
var cart = [];
try { cart = JSON.parse(localStorage.getItem('bionature_cart') || '[]'); } catch(e){ cart = []; }
// migrate old carts with price field
cart = cart.map(function(it){ return { id: it.id, name: it.name, variant: it.variant || '', img: (it.img || './logo.webp').replace('.png','.webp').replace('.jpeg','.webp'), qty: it.qty || 1 }; });

function saveCart() {
    localStorage.setItem('bionature_cart', JSON.stringify(cart));
    renderCart();
}

function addToCart(product) {
    var existing = cart.find(function(item) { return item.id === product.id; });
    if (existing) {
        existing.qty += 1;
    } else {
        cart.push({ id: product.id, name: product.name, variant: product.variant || '', img: product.img || './logo.webp', qty: 1 });
    }
    saveCart();
    showToast(product.name + ' (' + (product.variant || '') + ') added to cart!');
}

function removeFromCart(id) {
    cart = cart.filter(function(item) { return item.id !== id; });
    saveCart();
}

function changeQty(id, delta) {
    var item = cart.find(function(item) { return item.id === id; });
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) { removeFromCart(id); return; }
    saveCart();
}

function clearCart() {
    cart = [];
    saveCart();
    showToast('Cart cleared');
}

function getCartCount() {
    return cart.reduce(function(sum, item) { return sum + item.qty; }, 0);
}

function renderCart() {
    var body = document.getElementById('cartBody');
    var footer = document.getElementById('cartFooter');
    var badge = document.getElementById('cartBadge');
    var countEl = document.getElementById('cartCount');
    var totalEl = document.getElementById('cartTotal');
    if (!body || !footer || !badge) return;
    var count = getCartCount();

    badge.textContent = count > 0 ? count : '';
    badge.setAttribute('data-count', count);
    if (countEl) countEl.textContent = count > 0 ? '(' + count + ' item' + (count > 1 ? 's' : '') + ')' : '';

    if (cart.length === 0) {
        body.innerHTML = '<div class="cart-empty"><div class="empty-icon"><i class="fas fa-shopping-bag"></i></div><p>Your cart is empty</p></div>';
        footer.style.display = 'none';
        return;
    }

    footer.style.display = 'block';
    if (totalEl) totalEl.textContent = count + ' item' + (count > 1 ? 's' : '');

    var html = '';
    cart.forEach(function(item) {
        html += '<div class="cart-item">';
        html += '  <div class="cart-item-img">';
        html += '    <img src="' + item.img + '" alt="' + item.name + '" onerror="this.outerHTML=\'<div class=cif>' + item.name.substring(0,10) + '</div>\'">';
        html += '  </div>';
        html += '  <div class="cart-item-info">';
        html += '    <div class="name">' + item.name + '</div>';
        html += '    <div class="variant">' + item.variant + '</div>';
        html += '    <div class="item-price" style="color:var(--grey-400);font-weight:500;font-size:0.78rem;">Qty: ' + item.qty + ' — price on WhatsApp</div>';
        html += '  </div>';
        html += '  <div class="cart-item-qty">';
        html += '    <button class="qty-btn" onclick="changeQty(\'' + item.id + '\', -1)">&#8722;</button>';
        html += '    <span class="qty-val">' + item.qty + '</span>';
        html += '    <button class="qty-btn" onclick="changeQty(\'' + item.id + '\', 1)">+</button>';
        html += '  </div>';
        html += '  <button class="cart-item-remove" onclick="removeFromCart(\'' + item.id + '\')"><i class="fas fa-trash-alt"></i></button>';
        html += '</div>';
    });
    body.innerHTML = html;
}

function openCart() {
    document.getElementById('cartOverlay').classList.add('open');
    document.getElementById('cartDrawer').classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeCart() {
    document.getElementById('cartOverlay').classList.remove('open');
    document.getElementById('cartDrawer').classList.remove('open');
    var anyModal = document.querySelector('.product-modal.open');
    if (!anyModal) document.body.style.overflow = '';
}

function orderOnWhatsApp() {
    if (cart.length === 0) {
        showToast('Your cart is empty!');
        return;
    }
    var count = getCartCount();
    var lines = [];
    lines.push('Hi BioNature! I want to place an order:');
    lines.push('');
    lines.push('*Order Details:*');
    cart.forEach(function(item, i) {
        lines.push((i + 1) + '. ' + item.name + ' (' + item.variant + ') x ' + item.qty);
    });
    lines.push('');
    lines.push('*Total Items: ' + count + '*');
    lines.push('Please confirm price & delivery. Thank you!');

    var msg = encodeURIComponent(lines.join('\n'));
    window.open('https://wa.me/923365040776?text=' + msg, '_blank');
}

function showToast(msg) {
    var toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(function() { toast.classList.remove('show'); }, 2500);
}

// Initial render
renderCart();

// FAQ TOGGLE
function toggleFaq(btn) {
    var item = btn.closest('.faq-item');
    var isOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item.open').forEach(function(el) { el.classList.remove('open'); });
    if (!isOpen) item.classList.add('open');
}

// TESTIMONIALS INFINITE SCROLL
(function() {
    var track = document.getElementById('testTrack');
    if (!track) return;
    var cards = track.innerHTML;
    track.innerHTML = cards + cards;
})();

// HEADER HIDE ON SCROLL DOWN, SHOW ON SCROLL UP
let ticking = false;
window.addEventListener('scroll', function() {
    if (!ticking) {
        window.requestAnimationFrame(function() {
            ticking = false;
        });
        ticking = true;
    }
});

// CONTACT FORM - Handled by Formspree AJAX
