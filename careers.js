/* ============================================================
   BIONATURE — CAREERS MODULE (jobs.json driven)
   Job data lives in jobs.json — edit that file to add/remove
   jobs. No HTML or JS changes needed for new postings.
   ============================================================ */
(function () {
    'use strict';

    // ---------- STATE ----------
    var state = {
        jobs: [],          // all jobs from jobs.json (after shape normalization)
        openJobs: [],      // status === 'Open' only (what visitors see)
        results: [],       // current search/filter results
        query: '',
        filters: { type: '', location: '', department: '', experience: '' },
        ready: false,
        activeJobId: null
    };

    var DEPT_ICONS = {
        'Technology & Digital': 'fas fa-laptop-code',
        'Sales & Distribution': 'fas fa-chart-line',
        'Supply Chain & Operations': 'fas fa-warehouse',
        'Design & Creative': 'fas fa-pen-ruler',
        'Marketing': 'fas fa-bullhorn'
    };

    // ---------- SMALL HELPERS ----------
    function $(sel, root) { return (root || document).querySelector(sel); }
    function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

    function esc(str) {
        return String(str == null ? '' : str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function formatDate(iso) {
        if (!iso) return '';
        var d = new Date(iso);
        if (isNaN(d.getTime())) return String(iso);
        var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
    }

    function listToHtml(arr) {
        if (!Array.isArray(arr)) return '';
        return arr.map(function (item) { return '<li>' + esc(item) + '</li>'; }).join('');
    }

    function deptIcon(dept) { return DEPT_ICONS[dept] || 'fas fa-briefcase'; }

    // Scroll lock shared with product modals / cart (never fight over body overflow)
    function lockScroll() { document.body.style.overflow = 'hidden'; }
    function unlockScroll() {
        var productOpen = document.querySelector('.product-modal.open');
        var jobOpen = document.querySelector('.job-modal.open');
        var cart = document.getElementById('cartDrawer');
        var cartOpen = cart && cart.classList.contains('open');
        if (!productOpen && !jobOpen && !cartOpen) document.body.style.overflow = '';
    }

    // Reveal animation for dynamically injected cards
    var revealObserver = null;
    function observeReveals(root) {
        var els = $all('.reveal', root);
        if (!els.length) return;
        if (!('IntersectionObserver' in window)) {
            els.forEach(function (el) { el.classList.add('visible'); });
            return;
        }
        if (!revealObserver) {
            revealObserver = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                        revealObserver.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
        }
        els.forEach(function (el) { revealObserver.observe(el); });
    }

    // ---------- LOAD JOBS ----------
    function loadJobs() {
        var stateBox = document.getElementById('jobsState');
        if (stateBox) {
            stateBox.hidden = false;
            stateBox.className = 'jobs-state';
            stateBox.innerHTML = '<div class="jobs-spinner"></div><p>Loading available positions...</p>';
        }
        var grid = document.getElementById('jobsGrid');
        if (grid) grid.hidden = true;
        var empty = document.getElementById('jobsEmpty');
        if (empty) empty.hidden = true;

        fetch('./jobs.json', { cache: 'no-cache' })
            .then(function (res) {
                if (res.status === 404) { var e404 = new Error('jobs.json not found'); e404.kind = 'missing'; throw e404; }
                if (!res.ok) throw new Error('HTTP ' + res.status);
                return res.json();
            })
            .then(function (data) {
                if (!Array.isArray(data)) throw new Error('jobs.json must contain an array');
                state.jobs = data;
                state.openJobs = data.filter(function (j) { return j && String(j.status).toLowerCase() === 'open'; });
                state.ready = true;
                buildFilters();
                resetFilters(false);
                renderJobs();
            })
            .catch(function (err) {
                if (window.console) console.error('[careers] jobs.json load failed:', err);
                // opening index.html directly (file://) — browsers block fetch here
                var kind = (location.protocol === 'file:') ? 'file' : (err && err.kind) || 'generic';
                showLoadError(kind);
            });
    }

    var LOAD_ERROR_MESSAGES = {
        file: 'You are opening this website directly as a local file. For security, browsers cannot load <strong>jobs.json</strong> this way. Please open the site through a local server (e.g. VS Code <strong>Live Server</strong>) or upload it online — job listings will then appear.',
        missing: '<strong>jobs.json</strong> was not found on the server. Please upload the <strong>jobs.json</strong> file next to index.html and try again.',
        generic: 'Unable to load job openings. Please try again later.'
    };

    function showLoadError(kind) {
        var stateBox = document.getElementById('jobsState');
        if (!stateBox) return;
        var message = LOAD_ERROR_MESSAGES[kind] || LOAD_ERROR_MESSAGES.generic;
        stateBox.hidden = false;
        stateBox.className = 'jobs-state jobs-state-error';
        stateBox.innerHTML =
            '<div class="jobs-state-icon"><i class="fas fa-triangle-exclamation"></i></div>' +
            '<p>' + message + '</p>' +
            '<button type="button" class="btn btn-secondary" id="jobsRetryBtn"><i class="fas fa-rotate"></i> Try Again</button>';
        var retry = document.getElementById('jobsRetryBtn');
        if (retry) retry.addEventListener('click', loadJobs);
        var grid = document.getElementById('jobsGrid');
        if (grid) grid.hidden = true;
        var empty = document.getElementById('jobsEmpty');
        if (empty) empty.hidden = true;
        var count = document.getElementById('jobsCount');
        if (count) count.textContent = 'Job openings unavailable';
    }

    // ---------- FILTER OPTIONS (built from Open jobs) ----------
    function buildFilters() {
        fillSelect('filterType', 'type', 'All Job Types');
        fillSelect('filterLocation', 'location', 'All Locations');
        fillSelect('filterDepartment', 'department', 'All Departments');
        fillSelect('filterExperience', 'experience', 'All Experience Levels');
    }

    function fillSelect(id, key, placeholder) {
        var select = document.getElementById(id);
        if (!select) return;
        var values = [];
        state.openJobs.forEach(function (job) {
            var v = String(job[key] || '').trim();
            if (v && values.indexOf(v) === -1) values.push(v);
        });
        values.sort();
        var current = select.value;
        select.innerHTML = '';
        var ph = document.createElement('option');
        ph.value = '';
        ph.textContent = placeholder;
        select.appendChild(ph);
        values.forEach(function (v) {
            var opt = document.createElement('option');
            opt.value = v;
            opt.textContent = v;
            select.appendChild(opt);
        });
        if (current && values.indexOf(current) !== -1) select.value = current;
    }

    // ---------- SEARCH + FILTER ----------
    function matchesQuery(job, q) {
        if (!q) return true;
        var haystack = [
            job.title, job.department, job.location, job.type, job.experience,
            job.shortDescription, job.description
        ].concat(Array.isArray(job.skills) ? job.skills : [])
         .concat(Array.isArray(job.keywords) ? job.keywords : [])
         .join(' ').toLowerCase();
        return q.toLowerCase().split(/\s+/).every(function (word) {
            return haystack.indexOf(word) !== -1;
        });
    }

    function filterJobs() {
        var f = state.filters;
        return state.openJobs.filter(function (job) {
            if (!matchesQuery(job, state.query)) return false;
            if (f.type && String(job.type) !== f.type) return false;
            if (f.location && String(job.location) !== f.location) return false;
            if (f.department && String(job.department) !== f.department) return false;
            if (f.experience && String(job.experience) !== f.experience) return false;
            return true;
        });
    }

    function filtersActive() {
        return !!state.query || !!(state.filters.type || state.filters.location ||
            state.filters.department || state.filters.experience);
    }

    // ---------- RENDER ----------
    function renderJobs() {
        var grid = document.getElementById('jobsGrid');
        var stateBox = document.getElementById('jobsState');
        var empty = document.getElementById('jobsEmpty');
        var count = document.getElementById('jobsCount');
        if (!grid) return;

        state.results = filterJobs();

        if (stateBox) stateBox.hidden = true;
        grid.hidden = false;

        if (count) {
            count.textContent = filtersActive()
                ? 'Showing ' + state.results.length + ' of ' + state.openJobs.length + ' open positions'
                : state.openJobs.length + ' open position' + (state.openJobs.length === 1 ? '' : 's');
        }

        if (!state.results.length) {
            grid.hidden = true;
            if (empty) empty.hidden = false;
            return;
        }
        if (empty) empty.hidden = true;

        grid.innerHTML = state.results.map(jobCardHtml).join('');
        observeReveals(grid);
    }

    function jobCardHtml(job) {
        var delay = ' d' + ((state.results.indexOf(job) % 3) + 1);
        var skills = (Array.isArray(job.skills) ? job.skills : []).slice(0, 3);
        var skillChips = skills.map(function (s) {
            return '<span class="job-chip">' + esc(s) + '</span>';
        }).join('');
        var extraSkills = (Array.isArray(job.skills) && job.skills.length > 3)
            ? '<span class="job-chip job-chip-more">+' + (job.skills.length - 3) + '</span>' : '';

        return '' +
        '<article class="job-card reveal' + delay + '">' +
            '<div class="job-card-top">' +
                '<span class="job-dept"><i class="' + deptIcon(job.department) + '"></i> ' + esc(job.department) + '</span>' +
                '<span class="job-type-badge">' + esc(job.type) + '</span>' +
            '</div>' +
            '<h3 class="job-title">' + esc(job.title) + '</h3>' +
            '<div class="job-meta">' +
                '<span><i class="fas fa-location-dot"></i> ' + esc(job.location) + '</span>' +
                '<span><i class="fas fa-signal"></i> ' + esc(job.experience) + '</span>' +
                '<span><i class="far fa-calendar"></i> Posted ' + formatDate(job.postedDate) + '</span>' +
            '</div>' +
            '<p class="job-short">' + esc(job.shortDescription) + '</p>' +
            '<div class="job-chips">' + skillChips + extraSkills + '</div>' +
            '<div class="job-card-actions">' +
                '<button type="button" class="btn btn-secondary" data-job-details="' + esc(job.id) + '"><i class="fas fa-eye"></i> View Details</button>' +
                '<button type="button" class="btn btn-primary" data-job-apply="' + esc(job.id) + '"><i class="fas fa-paper-plane"></i> Apply Now</button>' +
            '</div>' +
        '</article>';
    }

    // ---------- JOB DETAILS MODAL ----------
    function findJob(id) {
        for (var i = 0; i < state.jobs.length; i++) {
            if (String(state.jobs[i].id) === String(id)) return state.jobs[i];
        }
        return null;
    }

    function openJobDetails(id) {
        var job = findJob(id);
        if (!job) return;
        state.activeJobId = job.id;

        var body = document.getElementById('jobDetailsBody');
        var modal = document.getElementById('jobDetailsModal');
        var overlay = document.getElementById('jobDetailsOverlay');
        if (!body || !modal) return;

        var meta = '' +
            '<div class="jm-meta-row">' +
                '<span class="jm-meta"><i class="fas fa-building"></i> ' + esc(job.department) + '</span>' +
                '<span class="jm-meta"><i class="fas fa-location-dot"></i> ' + esc(job.location) + '</span>' +
                '<span class="jm-meta"><i class="fas fa-clock"></i> ' + esc(job.type) + '</span>' +
                '<span class="jm-meta"><i class="fas fa-signal"></i> ' + esc(job.experience) + '</span>' +
                (job.salary ? '<span class="jm-meta jm-meta-salary"><i class="fas fa-money-bill-wave"></i> ' + esc(job.salary) + '</span>' : '') +
            '</div>';

        body.innerHTML = '' +
            '<div class="jm-head">' +
                '<div class="jm-head-top">' +
                    '<span class="jm-category"><i class="' + deptIcon(job.department) + '"></i> ' + esc(job.department) + '</span>' +
                    '<span class="jm-status' + (String(job.status).toLowerCase() === 'open' ? ' open' : ' closed') + '">' + esc(job.status) + '</span>' +
                '</div>' +
                '<h2>' + esc(job.title) + '</h2>' +
                meta +
                '<div class="jm-dates">' +
                    '<span><i class="far fa-calendar"></i> Posted: ' + formatDate(job.postedDate) + '</span>' +
                    '<span><i class="far fa-hourglass-half"></i> Apply by: ' + formatDate(job.deadline) + '</span>' +
                    '<span class="jm-jobid">Job ID: ' + esc(job.id) + '</span>' +
                '</div>' +
            '</div>' +
            '<div class="jm-body">' +
                '<p class="jm-desc">' + esc(job.description) + '</p>' +
                '<div class="jm-cols">' +
                    '<div class="jm-block"><h4><i class="fas fa-list-check"></i> Responsibilities</h4><ul class="jm-list">' + listToHtml(job.responsibilities) + '</ul></div>' +
                    '<div class="jm-block"><h4><i class="fas fa-user-check"></i> Requirements</h4><ul class="jm-list">' + listToHtml(job.requirements) + '</ul></div>' +
                '</div>' +
                '<div class="jm-block"><h4><i class="fas fa-code"></i> Required Skills</h4><div class="jm-skills">' +
                    (Array.isArray(job.skills) ? job.skills.map(function (s) { return '<span class="job-chip">' + esc(s) + '</span>'; }).join('') : '') +
                '</div></div>' +
                '<div class="jm-block"><h4><i class="fas fa-gift"></i> Benefits</h4><ul class="jm-list jm-list-check">' + listToHtml(job.benefits) + '</ul></div>' +
            '</div>' +
            '<div class="jm-actions">' +
                '<button type="button" class="btn btn-secondary" onclick="closeJobDetails()"><i class="fas fa-arrow-left"></i> Back to Jobs</button>' +
                (String(job.status).toLowerCase() === 'open'
                    ? '<button type="button" class="btn btn-primary" onclick="openApplyForm(\'' + esc(job.id) + '\')"><i class="fas fa-paper-plane"></i> Apply Now</button>'
                    : '<span class="jm-closed-note">Applications closed for this position</span>') +
            '</div>';

        if (overlay) overlay.classList.add('open');
        modal.classList.add('open');
        var modalContent = modal.querySelector('.job-modal-content');
        if (modalContent) modalContent.scrollTop = 0;
        lockScroll();
    }

    function closeJobDetails(keepScroll) {
        var modal = document.getElementById('jobDetailsModal');
        var overlay = document.getElementById('jobDetailsOverlay');
        if (modal) modal.classList.remove('open');
        if (overlay) overlay.classList.remove('open');
        if (!keepScroll) unlockScroll();
    }

    // ---------- APPLY FORM MODAL ----------
    function openApplyForm(id) {
        var job = findJob(id);
        if (!job) return;
        if (String(job.status).toLowerCase() !== 'open') {
            showToast('Applications for this position are closed.');
            return;
        }

        // if opened from inside details modal, close details first (frees scroll lock)
        closeJobDetails(true);
        state.activeJobId = job.id;

        var modal = document.getElementById('applyModal');
        var overlay = document.getElementById('applyOverlay');
        var form = document.getElementById('applyForm');
        var success = document.getElementById('applySuccess');

        var titleEl = document.getElementById('applyJobTitle');
        var idEl = document.getElementById('applyJobId');
        if (titleEl) titleEl.textContent = job.title;
        if (idEl) idEl.textContent = job.id;
        var titleField = document.getElementById('applyJobTitleField');
        var idField = document.getElementById('applyJobIdField');
        if (titleField) titleField.value = job.title;
        if (idField) idField.value = job.id;

        if (form) {
            form.hidden = false;
            form.reset();
            if (idField) idField.value = job.id;
            if (titleField) titleField.value = job.title;
            var subjectField = document.getElementById('applySubjectField');
            if (subjectField) subjectField.value = 'Job Application - ' + job.title + ' (' + job.id + ')';
        }
        if (success) success.hidden = true;

        if (overlay) overlay.classList.add('open');
        if (modal) {
            modal.classList.add('open');
            var content = modal.querySelector('.job-modal-content');
            if (content) content.scrollTop = 0;
        }
        lockScroll();
    }

    function closeApplyForm() {
        var modal = document.getElementById('applyModal');
        var overlay = document.getElementById('applyOverlay');
        if (modal) modal.classList.remove('open');
        if (overlay) overlay.classList.remove('open');
        unlockScroll();
    }

    function showFieldError(input, message) {
        var group = input.closest('.jf-group');
        if (!group) return;
        var err = group.querySelector('.jf-error');
        if (!err) return;
        err.textContent = message || '';
        input.classList.toggle('invalid', !!message);
    }

    function validateApplyForm(form) {
        var ok = true;
        var name = form.querySelector('#applyName');
        var email = form.querySelector('#applyEmail');
        var phone = form.querySelector('#applyPhone');
        var resume = form.querySelector('#applyResume');

        showFieldError(name, '');
        showFieldError(email, '');
        showFieldError(phone, '');
        showFieldError(resume, '');

        if (!name.value.trim()) { showFieldError(name, 'Please enter your full name.'); ok = false; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim())) { showFieldError(email, 'Please enter a valid email address.'); ok = false; }
        if (phone.value.replace(/\D/g, '').length < 7) { showFieldError(phone, 'Please enter a valid phone number.'); ok = false; }

        // Resume / CV share link (Formspree free plan does not accept file attachments)
        var resumeVal = resume.value.trim();
        if (!resumeVal) {
            showFieldError(resume, 'Please paste your Resume / CV link (Google Drive, Dropbox etc).');
            ok = false;
        } else {
            if (!/^https?:\/\//i.test(resumeVal)) {
                if (resumeVal.indexOf('.') !== -1) { resumeVal = 'https://' + resumeVal; resume.value = resumeVal; }
                else { showFieldError(resume, 'Please paste a valid link, e.g. https://drive.google.com/...'); ok = false; }
            }
        }

        if (!ok) {
            var firstInvalid = form.querySelector('.invalid');
            if (firstInvalid) firstInvalid.focus();
        }
        return ok;
    }

    function recordApplication(form) {
        // local audit trail (also useful until a backend/Formspree dashboard is checked)
        try {
            var stored = JSON.parse(localStorage.getItem('bionature_applications') || '[]');
            stored.push({
                jobId: (document.getElementById('applyJobIdField') || {}).value,
                jobTitle: (document.getElementById('applyJobTitleField') || {}).value,
                name: (form.querySelector('#applyName') || {}).value,
                email: (form.querySelector('#applyEmail') || {}).value,
                phone: (form.querySelector('#applyPhone') || {}).value,
                linkedin: (form.querySelector('#applyLinkedin') || {}).value,
                portfolio: (form.querySelector('#applyPortfolio') || {}).value,
                resumeLink: (form.querySelector('#applyResume') || {}).value,
                coverLetter: (form.querySelector('#applyCover') || {}).value,
                submittedAt: new Date().toISOString()
            });
            localStorage.setItem('bionature_applications', JSON.stringify(stored));
        } catch (err) { /* storage unavailable — UI flow still completes */ }
    }

    function handleApplySubmit(e) {
        e.preventDefault();
        var form = e.target;
        if (!validateApplyForm(form)) return;

        var endpoint = form.getAttribute('data-endpoint');
        var submitBtn = form.querySelector('[data-apply-submit]');
        var jobTitle = document.getElementById('applyJobTitle');
        var success = document.getElementById('applySuccess');
        var successTitle = document.getElementById('successJobTitle');

        function showSuccess() {
            recordApplication(form);
            form.hidden = true;
            if (success) success.hidden = false;
            if (successTitle && jobTitle) successTitle.textContent = jobTitle.textContent;
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Application';
            }
        }

        // Formspree endpoint (set data-endpoint on #applyForm) — emails the application.
        if (endpoint && window.fetch) {
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="jobs-spinner jobs-spinner-sm"></span> Submitting...';
            }
            fetch(endpoint, { method: 'POST', body: new FormData(form), headers: { 'Accept': 'application/json' } })
                .then(function (res) {
                    if (!res.ok) throw new Error('HTTP ' + res.status);
                    showSuccess();
                })
                .catch(function (err) {
                    if (window.console) console.error('[careers] application submit failed:', err);
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Application';
                    }
                    showToast('Could not submit application. Please try again.');
                });
        } else {
            // No endpoint configured — confirm the UI flow locally.
            showSuccess();
        }
    }

    // ---------- SHARED UI HELPERS ----------
    function showToast(msg) {
        if (typeof window.showToast === 'function') { window.showToast(msg); return; }
        var toast = document.getElementById('toast');
        if (!toast) return;
        toast.textContent = msg;
        toast.classList.add('show');
        clearTimeout(toast._t);
        toast._t = setTimeout(function () { toast.classList.remove('show'); }, 3000);
    }

    function resetFilters(rerender) {
        state.query = '';
        state.filters = { type: '', location: '', department: '', experience: '' };
        var search = document.getElementById('jobSearch');
        if (search) search.value = '';
        ['filterType', 'filterLocation', 'filterDepartment', 'filterExperience'].forEach(function (id) {
            var el = document.getElementById(id);
            if (el) el.value = '';
        });
        if (rerender !== false) renderJobs();
    }

    // ---------- INIT ----------
    function init() {
        // search
        var search = document.getElementById('jobSearch');
        if (search) {
            search.addEventListener('input', function () {
                state.query = search.value.trim();
                renderJobs();
            });
        }

        // filters
        [['filterType', 'type'], ['filterLocation', 'location'],
         ['filterDepartment', 'department'], ['filterExperience', 'experience']].forEach(function (pair) {
            var el = document.getElementById(pair[0]);
            if (el) el.addEventListener('change', function () {
                state.filters[pair[1]] = el.value;
                renderJobs();
            });
        });

        // reset
        var reset = document.getElementById('clearFilters');
        if (reset) reset.addEventListener('click', function () { resetFilters(true); });
        var emptyReset = document.getElementById('emptyResetBtn');
        if (emptyReset) emptyReset.addEventListener('click', function () { resetFilters(true); });

        // delegated card actions (works after every re-render)
        var grid = document.getElementById('jobsGrid');
        if (grid) grid.addEventListener('click', function (e) {
            var details = e.target.closest('[data-job-details]');
            if (details) { openJobDetails(details.getAttribute('data-job-details')); return; }
            var apply = e.target.closest('[data-job-apply]');
            if (apply) openApplyForm(apply.getAttribute('data-job-apply'));
        });

        // apply form
        var form = document.getElementById('applyForm');
        if (form) form.addEventListener('submit', handleApplySubmit);

        // overlay click close
        var detailsOverlay = document.getElementById('jobDetailsOverlay');
        if (detailsOverlay) detailsOverlay.addEventListener('click', function () { closeJobDetails(); });
        var applyOverlay = document.getElementById('applyOverlay');
        if (applyOverlay) applyOverlay.addEventListener('click', function () { closeApplyForm(); });

        // escape closes topmost careers modal
        document.addEventListener('keydown', function (e) {
            if (e.key !== 'Escape') return;
            var applyModal = document.getElementById('applyModal');
            if (applyModal && applyModal.classList.contains('open')) { closeApplyForm(); return; }
            var detailsModal = document.getElementById('jobDetailsModal');
            if (detailsModal && detailsModal.classList.contains('open')) closeJobDetails();
        });

        // load data
        loadJobs();
    }

    // public API (used by inline markup handlers)
    window.openJobDetails = openJobDetails;
    window.closeJobDetails = closeJobDetails;
    window.openApplyForm = openApplyForm;
    window.closeApplyForm = closeApplyForm;
    window.resetJobFilters = function () { resetFilters(true); };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
