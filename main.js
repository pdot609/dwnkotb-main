/* ================================================
   DANNY WOOD — Main JS
   ================================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ---------- Mobile Nav Toggle ---------- */
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.getElementById('mainNav');
  if (toggle && nav) {
    const closeNav = () => {
      toggle.classList.remove('open');
      nav.classList.remove('open');
      document.body.classList.remove('nav-open');
      toggle.setAttribute('aria-expanded', 'false');
    };
    const openNav = () => {
      toggle.classList.add('open');
      nav.classList.add('open');
      document.body.classList.add('nav-open');
      toggle.setAttribute('aria-expanded', 'true');
    };

    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', 'mainNav');

    toggle.addEventListener('click', () => {
      if (nav.classList.contains('open')) closeNav();
      else openNav();
    });

    nav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', closeNav);
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 640) closeNav();
    });
  }

  /* Keep page content below the fixed header */
  const header = document.querySelector('.site-header');
  const syncHeaderOffset = () => {
    if (!header) return;
    const h = Math.ceil(header.getBoundingClientRect().height);
    document.documentElement.style.setProperty('--nav-h', `${h}px`);
  };
  syncHeaderOffset();
  window.addEventListener('resize', syncHeaderOffset);

  /* ---------- Header scroll shadow ---------- */
  if (header) {
    window.addEventListener('scroll', () => {
      header.classList.toggle('scrolled', window.scrollY > 10);
    }, { passive: true });
  }

  /* ---------- Event Filters ---------- */
  const filterBtns = document.querySelectorAll('.filter-btn');

  function applyEventFilter() {
    const active = document.querySelector('.filter-btn.active');
    const filter = active?.dataset.filter || 'all';
    document.querySelectorAll('.event-card').forEach(card => {
      card.classList.toggle('hide', !(filter === 'all' || card.dataset.type === filter));
    });
    document.querySelectorAll('[data-filter-group]').forEach(group => {
      group.classList.toggle('hide', !(filter === 'all' || group.dataset.filterGroup === filter));
    });
  }

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyEventFilter();
    });
  });

  /* ---------- NKOTB show dates (live from nkotb.com) ---------- */
  const nkotbShowsEl = document.getElementById('nkotbShows');
  const NKOTB_EVENTS_URL = 'https://www.nkotb.com/events';
  const NKOTB_CACHE_KEY = 'nkotb-shows-v1';

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
  }

  function safeHttpsUrl(url) {
    try {
      const parsed = new URL(url, NKOTB_EVENTS_URL);
      if (parsed.protocol !== 'https:') return '';
      return parsed.href;
    } catch (_) {
      return '';
    }
  }

  function normalizeShow(raw) {
    const dateText = (raw.dateText || '').replace(/\s+/g, ' ').trim();
    const date = new Date(dateText);
    if (isNaN(date.getTime())) return null;
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    if (end < new Date()) return null;
    return {
      dateText,
      venue: (raw.venue || '').replace(/\s+/g, ' ').trim(),
      location: (raw.location || '').replace(/\s+/g, ' ').trim(),
      tickets: safeHttpsUrl(raw.tickets || ''),
      month: date.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
      day: String(date.getDate()).padStart(2, '0'),
      year: String(date.getFullYear())
    };
  }

  function parseNkotbShows(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return [...doc.querySelectorAll('.tour_card')]
      .map(card => ({
        dateText: card.querySelector('.tour_date-text')?.textContent || '',
        venue: card.querySelector('.tour_date-event-text')?.textContent || '',
        location: card.querySelector('.tour_date-location-text')?.textContent || '',
        tickets: card.querySelector('a[href*="ticketmaster"]')?.getAttribute('href')
          || card.querySelector('a.button_tour')?.getAttribute('href')
          || ''
      }))
      .map(normalizeShow)
      .filter(Boolean);
  }

  function showCardHtml(show) {
    const venueLine = [show.venue, show.location].filter(Boolean).join(' · ');
    const tickets = show.tickets
      ? `<a class="btn btn-outline btn-sm" href="${escapeHtml(show.tickets)}" target="_blank" rel="noopener noreferrer">Official tickets</a>`
      : '<span class="event-note">Dates only</span>';
    return `
      <div class="event-card" data-type="show">
        <div class="event-date">
          <span class="month">${escapeHtml(show.month)}</span>
          <span class="day">${escapeHtml(show.day)}</span>
          <span class="year">${escapeHtml(show.year)}</span>
        </div>
        <div class="event-info">
          <h3>THE RIGHT STUFF REMIXED</h3>
          <p class="event-venue">${escapeHtml(venueLine)}</p>
          <p class="event-meta">Doors 7pm · Show 8pm · Final Vegas residency dates</p>
        </div>
        <div class="event-actions">${tickets}</div>
      </div>`;
  }

  function renderNkotbShows(shows, sourceLabel) {
    if (!nkotbShowsEl) return;
    if (!shows.length) {
      nkotbShowsEl.innerHTML = '<p class="nkotb-empty">No upcoming NKOTB shows listed right now. Check <a href="https://www.nkotb.com/events" target="_blank" rel="noopener noreferrer">nkotb.com</a>.</p>';
    } else {
      nkotbShowsEl.innerHTML = shows.map(showCardHtml).join('');
    }
    const source = document.getElementById('nkotbSource');
    if (source) {
      source.innerHTML = `${escapeHtml(sourceLabel)} · <a href="https://www.nkotb.com/events" target="_blank" rel="noopener noreferrer">View calendar</a>`;
    }
    applyEventFilter();
  }

  async function fetchWithTimeout(url, ms) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ms);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res;
    } finally {
      clearTimeout(timer);
    }
  }

  async function loadNkotbShows() {
    if (!nkotbShowsEl) return;

    try {
      const cached = JSON.parse(localStorage.getItem(NKOTB_CACHE_KEY) || 'null');
      if (cached?.shows?.length) {
        renderNkotbShows(cached.shows.map(normalizeShow).filter(Boolean), 'Show dates from nkotb.com');
      }
    } catch (_) { /* ignore bad cache */ }

    const encoded = encodeURIComponent(NKOTB_EVENTS_URL);
    const sources = [
      async () => {
        const res = await fetchWithTimeout(NKOTB_EVENTS_URL, 8000);
        return res.text();
      },
      async () => {
        const res = await fetchWithTimeout(`https://api.allorigins.win/raw?url=${encoded}`, 10000);
        return res.text();
      },
      async () => {
        const res = await fetchWithTimeout(`https://api.allorigins.win/get?url=${encoded}`, 10000);
        const data = await res.json();
        return data.contents || '';
      },
      async () => {
        const res = await fetchWithTimeout(`https://corsproxy.io/?${encoded}`, 10000);
        return res.text();
      }
    ];

    for (const source of sources) {
      try {
        const html = await source();
        const shows = parseNkotbShows(html);
        if (!shows.length) continue;
        renderNkotbShows(shows, 'Updated from nkotb.com');
        try {
          localStorage.setItem(NKOTB_CACHE_KEY, JSON.stringify({ shows, savedAt: Date.now() }));
        } catch (_) { /* quota */ }
        return;
      } catch (_) {
        continue;
      }
    }
  }

  loadNkotbShows();

  /* ---------- Payment method tabs ---------- */
  const methodBtns = document.querySelectorAll('.pay-method');
  const payPanels = document.querySelectorAll('.pay-panel');
  let activeMethod = 'crypto';

  methodBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      setPayMethod(btn.dataset.method);
    });
  });

  function setPayMethod(method) {
    activeMethod = method;
    methodBtns.forEach(b => {
      const on = b.dataset.method === method;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    payPanels.forEach(panel => {
      panel.classList.toggle('active', panel.dataset.panel === method);
    });
  }

  const wallets = {
    btc: {
      label: 'BTC Wallet',
      address: 'bc1qrjgh4ypfrv0hma5ff82guwn96ugwnpvcuqz66x'
    },
    eth: {
      label: 'ETH Wallet',
      address: '0x3b55834831c25AbFED110707829bd3348b32DE65'
    },
    usdt: {
      label: 'USDT Wallet (ERC-20)',
      address: '0x3b55834831c25AbFED110707829bd3348b32DE65'
    }
  };

  const coinBtns = document.querySelectorAll('.coin-btn');
  const cryptoLabel = document.getElementById('cryptoLabel');
  const cryptoAddress = document.getElementById('cryptoAddress');
  const cryptoQrEl = document.getElementById('cryptoQr');
  const cryptoNetwork = document.getElementById('cryptoNetwork');
  let activeCoin = 'btc';
  let cryptoQr = null;

  function walletUri(coin, address) {
    if (coin === 'btc') return `bitcoin:${address}`;
    if (coin === 'eth' || coin === 'usdt') return `ethereum:${address}`;
    return address;
  }

  function renderCryptoQr(coin, address) {
    if (!cryptoQrEl) return;
    const uri = walletUri(coin, address);
    cryptoQrEl.setAttribute('aria-label', `QR code for ${wallets[coin].label}`);

    if (typeof QRCode === 'undefined') {
      cryptoQrEl.innerHTML = `<img alt="QR code" width="148" height="148" src="https://api.qrserver.com/v1/create-qr-code/?size=148x148&data=${encodeURIComponent(uri)}">`;
      return;
    }

    if (!cryptoQr) {
      cryptoQrEl.innerHTML = '';
      cryptoQr = new QRCode(cryptoQrEl, {
        text: uri,
        width: 148,
        height: 148,
        colorDark: '#0A0A0A',
        colorLight: '#FFFFFF',
        correctLevel: QRCode.CorrectLevel.M
      });
      return;
    }

    cryptoQr.makeCode(uri);
  }

  function showWallet(coin) {
    const wallet = wallets[coin];
    if (!wallet) return;
    activeCoin = coin;
    if (cryptoLabel) cryptoLabel.textContent = wallet.label;
    if (cryptoAddress) cryptoAddress.textContent = wallet.address;
    if (cryptoNetwork) cryptoNetwork.classList.toggle('hidden', coin !== 'usdt');
    renderCryptoQr(coin, wallet.address);
  }

  coinBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      coinBtns.forEach(b => {
        b.classList.toggle('active', b === btn);
        b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
      });
      showWallet(btn.dataset.coin);
    });
  });

  if (cryptoQrEl) showWallet(activeCoin);

  async function copyText(text, btn) {
    const original = btn.textContent;
    try {
      await navigator.clipboard.writeText(text);
      btn.textContent = 'Copied!';
    } catch (_) {
      btn.textContent = 'Copy failed';
    }
    setTimeout(() => { btn.textContent = original; }, 1500);
  }

  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.copy === 'bank') {
        const details = [
          `Account name: ${document.getElementById('bankName')?.textContent || ''}`,
          `Bank: ${document.getElementById('bankBank')?.textContent || ''}`,
          `Account number: ${document.getElementById('bankAccount')?.textContent || ''}`,
          `Routing number: ${document.getElementById('bankRouting')?.textContent || ''}`
        ];
        const swift = document.getElementById('bankSwift')?.textContent?.trim();
        if (swift) details.push(`SWIFT / BIC: ${swift}`);
        copyText(details.join('\n'), btn);
        return;
      }
      const target = document.getElementById(btn.dataset.copy);
      if (target) copyText(target.textContent.trim(), btn);
    });
  });

  /* ---------- Donation Amount Buttons ---------- */
  const amountBtns = document.querySelectorAll('.amount-btn');
  const customWrap = document.getElementById('customAmountWrap');
  const customInput = document.getElementById('customAmount');
  const payBtn = document.getElementById('payBtn');
  let selectedAmount = 100;

  function updatePayBtn() {
    if (payBtn) {
      payBtn.textContent = selectedAmount
        ? `DONATE $${selectedAmount}`
        : 'DONATE';
    }
  }

  amountBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      amountBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      if (btn.dataset.amount === 'custom') {
        customWrap && customWrap.classList.remove('hidden');
        selectedAmount = customInput ? parseInt(customInput.value) || 0 : 0;
      } else {
        customWrap && customWrap.classList.add('hidden');
        selectedAmount = parseInt(btn.dataset.amount);
      }
      updatePayBtn();
    });
  });

  if (customInput) {
    customInput.addEventListener('input', () => {
      selectedAmount = parseInt(customInput.value) || 0;
      updatePayBtn();
    });
  }

  const TEAM_EMAIL = 'contact@dwnkotb.com';

  function openTeamMail(subject, body) {
    window.location.href = `mailto:${TEAM_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  /* ---------- Donate Form Submit ---------- */
  const donateForm = document.getElementById('donateForm');
  const donateSuccess = document.getElementById('donateSuccess');

  if (donateForm) {
    donateForm.addEventListener('submit', (e) => {
      e.preventDefault();

      if (!selectedAmount || selectedAmount < 1) {
        alert('Please select or enter a donation amount.');
        return;
      }

      if (activeMethod === 'crypto') {
        const tx = document.getElementById('cryptoTx');
        if (tx && !tx.value.trim()) {
          alert('Please paste your crypto transaction ID.');
          return;
        }
      }
      if (activeMethod === 'bank') {
        const ref = document.getElementById('bankRef');
        if (ref && !ref.value.trim()) {
          alert('Please enter your bank transfer reference.');
          return;
        }
      }

      const name = document.getElementById('donorName')?.value.trim() || '';
      const email = document.getElementById('donorEmail')?.value.trim() || '';
      const proof = activeMethod === 'crypto'
        ? `Transaction ID: ${document.getElementById('cryptoTx')?.value.trim() || ''}`
        : `Bank reference: ${document.getElementById('bankRef')?.value.trim() || ''}`;

      openTeamMail(
        `Remember Betty donation — $${selectedAmount}`,
        `Please confirm this donation and match the receipt.\n\nName: ${name}\nEmail: ${email}\nAmount: $${selectedAmount}\nMethod: ${activeMethod === 'crypto' ? 'Crypto' : 'Bank transfer'}\n${proof}\n\nAttach the payment receipt if your mail app allows it.`
      );

      donateForm.classList.add('hidden');
      donateSuccess && donateSuccess.classList.remove('hidden');
    });
  }

  /* ---------- Purchase modal (Meet & Greet / Virtual only) ---------- */
  const modal = document.getElementById('purchaseModal');
  const purchaseForm = document.getElementById('purchaseForm');
  const purchaseSuccess = document.getElementById('purchaseSuccess');
  const purchaseTitle = document.getElementById('purchaseTitle');
  const purchaseSummary = document.getElementById('purchaseSummary');
  const purchaseBtn = document.getElementById('purchaseBtn');
  let purchasePrice = 0;
  let purchaseName = '';

  function openPurchaseModal(btn) {
    if (!modal) return;
    purchaseName = btn.dataset.event || 'Event';
    const type = btn.dataset.type || '';
    const cryptoOnly = /meet/i.test(type);
    const fromPrice = cryptoOnly || /virtual/i.test(type);
    purchasePrice = parseInt(btn.dataset.price, 10) || 0;
    if (purchaseTitle) purchaseTitle.textContent = type.toUpperCase();
    if (purchaseSummary) {
      purchaseSummary.textContent = fromPrice
        ? `${purchaseName} — from $${purchasePrice}`
        : `${purchaseName} — $${purchasePrice}`;
    }
    if (purchaseBtn) {
      purchaseBtn.textContent = fromPrice
        ? `PAY FROM $${purchasePrice}`
        : `PAY $${purchasePrice}`;
    }
    if (purchaseForm) {
      purchaseForm.reset();
      purchaseForm.classList.remove('hidden');
    }
    if (purchaseSuccess) purchaseSuccess.classList.add('hidden');
    modal.classList.toggle('crypto-only', cryptoOnly);
    setPayMethod('crypto');
    const note = document.getElementById('purchaseNote');
    if (note) {
      note.textContent = cryptoOnly
        ? 'Meet & Greet passes are paid in BTC, ETH, or USDT only. After you pay, email your receipt to contact@dwnkotb.com for confirmation.'
        : 'Pay with BTC, ETH, USDT, or bank transfer. After you pay, email your receipt to contact@dwnkotb.com for confirmation.';
    }
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    showWallet(activeCoin);
  }

  function closePurchaseModal() {
    if (!modal) return;
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  document.querySelectorAll('.buy-btn').forEach(btn => {
    btn.addEventListener('click', () => openPurchaseModal(btn));
  });

  const modalClose = document.getElementById('modalClose');
  const purchaseDone = document.getElementById('purchaseDone');
  if (modalClose) modalClose.addEventListener('click', closePurchaseModal);
  if (purchaseDone) purchaseDone.addEventListener('click', closePurchaseModal);
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closePurchaseModal();
    });
  }

  if (purchaseForm) {
    purchaseForm.addEventListener('submit', (e) => {
      e.preventDefault();

      if (activeMethod === 'crypto') {
        const tx = document.getElementById('cryptoTx');
        if (tx && !tx.value.trim()) {
          alert('Please paste your crypto transaction ID.');
          return;
        }
      }
      if (activeMethod === 'bank') {
        const ref = document.getElementById('bankRef');
        if (ref && !ref.value.trim()) {
          alert('Please enter your bank transfer reference.');
          return;
        }
      }

      const buyer = document.getElementById('buyerName')?.value.trim() || '';
      const email = document.getElementById('buyerEmail')?.value.trim() || '';
      const proof = activeMethod === 'crypto'
        ? `Transaction ID: ${document.getElementById('cryptoTx')?.value.trim() || ''}`
        : `Bank reference: ${document.getElementById('bankRef')?.value.trim() || ''}`;

      openTeamMail(
        `Payment receipt — ${purchaseName}`,
        `Please confirm this payment.\n\nName: ${buyer}\nEmail: ${email}\nItem: ${purchaseName}\nAmount: from $${purchasePrice}\nMethod: ${activeMethod === 'crypto' ? 'Crypto' : 'Bank transfer'}\n${proof}\n\nAttach the payment receipt if your mail app allows it.`
      );

      purchaseForm.classList.add('hidden');
      if (purchaseSuccess) purchaseSuccess.classList.remove('hidden');
      const msg = document.getElementById('purchaseSuccessMsg');
      if (msg) {
        msg.textContent = `Send that email to ${TEAM_EMAIL} with your receipt so the team can confirm ${purchaseName}.`;
      }
    });
  }

  /* ---------- Contact page ---------- */
  const contactTabs = document.querySelectorAll('[data-contact]');
  const contactPanels = document.querySelectorAll('[data-contact-panel]');

  function showContactPanel(name) {
    contactTabs.forEach(btn => {
      const on = btn.dataset.contact === name;
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    contactPanels.forEach(panel => {
      panel.classList.toggle('active', panel.dataset.contactPanel === name);
    });
  }

  contactTabs.forEach(btn => {
    btn.addEventListener('click', () => {
      showContactPanel(btn.dataset.contact);
      if (btn.dataset.contact === 'meet') {
        history.replaceState(null, '', '#meet');
      } else {
        history.replaceState(null, '', 'contact.html');
      }
    });
  });

  if (contactPanels.length) {
    const meetDate = document.getElementById('meetDate');
    if (meetDate) {
      const today = new Date();
      const iso = today.toISOString().slice(0, 10);
      meetDate.min = iso;
    }
    if (location.hash === '#meet') showContactPanel('meet');
  }

  const teamForm = document.getElementById('teamForm');
  if (teamForm) {
    teamForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('teamName').value.trim();
      const email = document.getElementById('teamEmail').value.trim();
      const topicEl = document.getElementById('teamTopic');
      const topic = topicEl.options[topicEl.selectedIndex]?.text || 'Message';
      const message = document.getElementById('teamMessage').value.trim();
      openTeamMail(
        `Write the team — ${topic}`,
        `Name: ${name}\nReply-to: ${email}\nTopic: ${topic}\n\n${message}`
      );
      teamForm.classList.add('hidden');
      document.getElementById('teamSuccess')?.classList.remove('hidden');
    });
  }

  const meetForm = document.getElementById('meetForm');
  if (meetForm) {
    meetForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('meetName').value.trim();
      const email = document.getElementById('meetEmail').value.trim();
      const phone = document.getElementById('meetPhone')?.value.trim() || '—';
      const guestsEl = document.getElementById('meetGuests');
      const guests = guestsEl.options[guestsEl.selectedIndex]?.text || '';
      const date = document.getElementById('meetDate').value;
      const whereEl = document.getElementById('meetWhere');
      const where = whereEl.options[whereEl.selectedIndex]?.text || '';
      const notes = document.getElementById('meetNotes')?.value.trim() || '—';
      openTeamMail(
        `Meet & Greet request — ${date}`,
        `Private Meet & Greet request (from $450).\n\nName: ${name}\nEmail: ${email}\nPhone: ${phone}\nGuests: ${guests}\nDate: ${date}\nWhere: ${where}\n\nNotes:\n${notes}`
      );
      meetForm.classList.add('hidden');
      document.getElementById('meetSuccess')?.classList.remove('hidden');
    });
  }

  document.querySelectorAll('[data-reset-form]').forEach(btn => {
    btn.addEventListener('click', () => {
      const which = btn.dataset.resetForm;
      const form = document.getElementById(`${which}Form`);
      const success = document.getElementById(`${which}Success`);
      if (form) {
        form.reset();
        form.classList.remove('hidden');
      }
      if (success) success.classList.add('hidden');
    });
  });

  /* ---------- Fade-in on scroll ---------- */
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.section').forEach(sec => {
    // Keep video section visible so the player isn't stuck at opacity 0
    if (sec.classList.contains('section-video')) return;
    sec.style.opacity = '0';
    sec.style.transform = 'translateY(30px)';
    sec.style.transition = 'opacity .6s ease, transform .6s ease';
    observer.observe(sec);
  });

});
