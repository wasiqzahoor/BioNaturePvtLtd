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

// HERO VIDEO AUTOPLAY
(function() {
    var video = document.getElementById('heroBgVideo');
    if (!video) return;
    video.play().catch(function(){});
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

// pH VISUALIZER
const phSlider = document.getElementById('phSlider');
const phMarker = document.getElementById('phMarker');
const phMarkerLabel = document.getElementById('phMarkerLabel');
const phResult = document.getElementById('phResult');
const phOptimalZone = document.getElementById('phOptimalZone');

function updatePH() {
    const val = parseFloat(phSlider.value);
    const pct = (val / 14) * 100;
    phMarker.style.left = 'calc(' + pct + '% - 2px)';
    phMarkerLabel.textContent = 'pH ' + val.toFixed(1);
    const zoneStart = (3.5 / 14) * 100;
    const zoneEnd = (4.5 / 14) * 100;
    phOptimalZone.style.left = zoneStart + '%';
    phOptimalZone.style.width = (zoneEnd - zoneStart) + '%';
    var result = '';
    if (val >= 3.5 && val <= 4.5) {
        result = '<i class="fas fa-check-circle"></i> <strong>Optimal Range!</strong> Healthy acidic pH for intimate areas. GYN-GUARD is formulated at this level.';
        phResult.style.background = 'linear-gradient(135deg, #F0FFF4, #DCFCE7)';
        phResult.style.color = '#166534';
    } else if (val < 3.5) {
        result = '<i class="fas fa-exclamation-triangle"></i> <strong>Too Acidic.</strong> May cause irritation. Our wash stays within the safe zone.';
        phResult.style.background = 'linear-gradient(135deg, #FFFBEB, #FEF3C7)';
        phResult.style.color = '#92400E';
    } else if (val <= 6) {
        result = '<i class="fas fa-exclamation-triangle"></i> <strong>Slightly Acidic to Neutral.</strong> Not ideal for intimate care. Regular body washes fall here.';
        phResult.style.background = 'linear-gradient(135deg, #FFF5F5, #FEE2E2)';
        phResult.style.color = '#991B1B';
    } else {
        result = '<i class="fas fa-times-circle"></i> <strong>Alkaline &mdash; Harmful!</strong> Ordinary soaps (pH 9-10) disrupt natural flora and increase infection risk.';
        phResult.style.background = 'linear-gradient(135deg, #FEE2E2, #FECACA)';
        phResult.style.color = '#DC2626';
    }
    phResult.innerHTML = result;
}
if (phSlider) {
    phSlider.addEventListener('input', updatePH);
    updatePH();
}

// SMOOTH SCROLL
document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
    anchor.addEventListener('click', function(e) {
        var target = document.querySelector(this.getAttribute('href'));
        if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); closeMenu(); }
    });
});

// ==================== CART SYSTEM ====================
var cart = JSON.parse(localStorage.getItem('bionature_cart') || '[]');

function saveCart() {
    localStorage.setItem('bionature_cart', JSON.stringify(cart));
    renderCart();
}

function addToCart(product) {
    var existing = cart.find(function(item) { return item.id === product.id; });
    if (existing) {
        existing.qty += 1;
    } else {
        cart.push({ id: product.id, name: product.name, variant: product.variant, price: product.price, img: product.img, qty: 1 });
    }
    saveCart();
    showToast(product.name + ' (' + product.variant + ') added to cart!');
    var btns = document.querySelectorAll('.btn-add-cart, .fp-add-cart');
    btns.forEach(function(btn) {
        var onclick = btn.getAttribute('onclick') || '';
        if (onclick.indexOf(product.id) !== -1) {
            btn.classList.add('added');
            var originalHTML = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check"></i> Added';
            setTimeout(function() { btn.classList.remove('added'); btn.innerHTML = originalHTML; }, 1500);
        }
    });
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

function getCartTotal() {
    return cart.reduce(function(sum, item) { return sum + (item.price * item.qty); }, 0);
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
    var count = getCartCount();
    var total = getCartTotal();

    badge.textContent = count > 0 ? count : '';
    badge.setAttribute('data-count', count);
    countEl.textContent = count > 0 ? '(' + count + ' item' + (count > 1 ? 's' : '') + ')' : '';

    if (cart.length === 0) {
        body.innerHTML = '<div class="cart-empty"><div class="empty-icon"><i class="fas fa-shopping-bag"></i></div><p>Your cart is empty</p></div>';
        footer.style.display = 'none';
        return;
    }

    footer.style.display = 'block';
    totalEl.textContent = 'PKR ' + total.toLocaleString();

    var html = '';
    cart.forEach(function(item) {
        html += '<div class="cart-item">';
        html += '  <div class="cart-item-img">';
        html += '    <img src="' + item.img + '" alt="' + item.name + '" onerror="this.outerHTML=\'<div class=cif>' + item.name.substring(0,10) + '</div>\'">';
        html += '  </div>';
        html += '  <div class="cart-item-info">';
        html += '    <div class="name">' + item.name + '</div>';
        html += '    <div class="variant">' + item.variant + '</div>';
        html += '    <div class="item-price">PKR ' + (item.price * item.qty).toLocaleString() + '</div>';
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
    document.body.style.overflow = '';
}

function orderOnWhatsApp() {
    if (cart.length === 0) {
        showToast('Your cart is empty!');
        return;
    }
    var total = getCartTotal();
    var count = getCartCount();
    var lines = [];
    lines.push('Hi! I want to place an order from BioNature (Pvt) Ltd');
    lines.push('');
    lines.push('*Order Details:*');
    lines.push('---');
    cart.forEach(function(item, i) {
        lines.push((i + 1) + '. ' + item.name + ' (' + item.variant + ')');
        lines.push('   Qty: ' + item.qty + ' x PKR ' + item.price.toLocaleString() + ' = PKR ' + (item.price * item.qty).toLocaleString());
    });
    lines.push('---');
    lines.push('*Total Items: ' + count + '*');
    lines.push('*Total Amount: PKR ' + total.toLocaleString() + '*');
    lines.push('');
    lines.push('Please confirm my order. Thank you!');

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
