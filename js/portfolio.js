
var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Swiper skills
var skillsSwiper = new Swiper('.skills-swiper', {
    slidesPerView: 1.15,
    spaceBetween: 22,
    breakpoints: {
        640:{ slidesPerView: 2, spaceBetween: 20 },
        1024:{ slidesPerView: 3, spaceBetween: 22 },
        1440:{ slidesPerView: 4, spaceBetween: 24 }
    },
    pagination: { 
        el: '.swiper-pagination', 
        clickable: true 
    },
    navigation: { 
        nextEl: '#skillsNext', 
        prevEl: '#skillsPrev' 
    },
    a11y: { 
        enabled: true 
    },
    keyboard: { 
        enabled: true 
    }
});

// GSAP scroll reveals + orbit motion 
if (!reduceMotion && window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);

    document.querySelectorAll('.reveal').forEach(function (el) {
        gsap.to(el, {
        opacity: 1, y: 0, duration: 0.9, ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 82%' }
        });
    });

    gsap.to('.orbit-ring', { rotation: 360, duration: 60, repeat: -1, ease: 'none', transformOrigin: '50% 50%' });
    gsap.to('.orbit-ring-inner', { rotation: -360, duration: 40, repeat: -1, ease: 'none', transformOrigin: '50% 50%' });
    } else {
        document.querySelectorAll('.reveal').forEach(function (el) {
            el.style.opacity = 1; el.style.transform = 'none';
    });
}

  /* ----------------------------------------------------------------------------
     main — 기술 태그가 가장 바깥 원(outer ring) 라인을 따라 실제로 공전하도록 처리
     ORBIT_MOTION_CONFIG 값만 바꾸면 궤도 반지름 비율, 회전 속도를 조절할 수 있습니다.
     - radiusRatio      : 1.0 = 가장 바깥 라인(.orbit-ring)에 정확히 맞춤 / 값이 작아질수록 안쪽 궤도로 이동
     - speedDegPerFrame : 프레임당 회전 각도(값이 클수록 빠르게 돎)
     각 태그의 시작 위치(각도)는 HTML의 data-angle 값으로 지정되어 있어요 (0°=오른쪽, 시계방향, -90°=위쪽).
  ---------------------------------------------------------------------------- */
  var ORBIT_MOTION_CONFIG = { radiusRatio: 0.97, speedDegPerFrame: 0.12 };

  (function initOrbitMotion() {
    var orbitEl = document.querySelector('.orbit');
    var orbitTags = document.querySelectorAll('.orbit-tag');
        if (!orbitEl || !orbitTags.length) return;

    var angleOffset = 0;

    function position() {
        var rect = orbitEl.getBoundingClientRect();
        var cx = rect.width / 2, cy = rect.height / 2;
        var radius = Math.min(rect.width, rect.height) / 2 * ORBIT_MOTION_CONFIG.radiusRatio;
            orbitTags.forEach(function (tag) {
        var base = parseFloat(tag.dataset.angle) || 0;
        var rad = (base + angleOffset) * (Math.PI / 180);
        tag.style.left = (cx + radius * Math.cos(rad)) + 'px';
        tag.style.top = (cy + radius * Math.sin(rad)) + 'px';
    });
    }

    position();
    window.addEventListener('resize', debounce(position, 200));

    if (!reduceMotion && window.gsap) {
        gsap.ticker.add(function () {
        angleOffset = (angleOffset + ORBIT_MOTION_CONFIG.speedDegPerFrame) % 360;
            position();
        });
    }
    // reduceMotion인 경우 회전 루프 없이 초기 위치에 고정된 상태로 표시됩니다.
    })();

    /* ============================================================================
        배경 장식 요소 총괄 스크립트
        - 공통 유틸(debounce, dot-field 생성기)을 만들어두고
        - 섹션마다 필요한 옵션만 CONFIG 객체로 관리합니다.
        - 모든 캔버스는 prefers-reduced-motion 사용자에게는 아예 렌더링되지 않습니다.
        (debounce는 함수 선언이라 호이스팅되어 위쪽 orbit 초기화에서도 바로 사용할 수 있습니다)
    ============================================================================ */
    function debounce(fn, wait) {
        var t;
        return function () { clearTimeout(t); t = setTimeout(fn, wait); };
    }

    /* ----------------------------------------------------------------------------
        1) main / CONTACT — 점(dot) 파티클
        아래 DOT_FIELD_CONFIGS 값만 바꾸면 섹션별로 파티클 밀도/속도/연결선 여부를
        따로 조절할 수 있습니다. (About은 파티클을 사용하지 않도록 제외했습니다)
        - density     : 숫자가 작을수록 파티클이 촘촘해짐 (면적 ÷ density)
        - maxCount    : 파티클 개수 상한(성능 보호용)
        - speed       : 이동 속도 (wander:true일 때는 "최대" 속도로 사용됨)
        - connect     : 가까운 점끼리 선으로 이을지 여부
        - connectDist : 선을 연결하는 최대 거리(px)
        - wander      : true면 일직선이 아니라 불특정 방향으로 서서히 방향을 바꾸며 움직임(랜덤워크)
    ---------------------------------------------------------------------------- */
    var DOT_FIELD_CONFIGS = {
        main:    { density: 24000, maxCount: 70, speed: 0.18, connect: true,  connectDist: 118, wander: false },
        contact: { density: 32000, maxCount: 46, speed: 0.09, connect: false, connectDist: 0,   wander: true }
    };

    function createDotField(canvas, cfg) {
        var ctx = canvas.getContext('2d');
        var section = canvas.closest('section');
        var DPR = Math.min(window.devicePixelRatio || 1, 2);
        var particles = [];

    function resize() {
        var rect = section.getBoundingClientRect();
        var w = rect.width, h = rect.height;
            canvas.width = w * DPR; canvas.height = h * DPR;
            canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
            ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    var count = Math.min(cfg.maxCount, Math.round((w * h) / cfg.density));
        particles = [];
        for (var i = 0; i < count; i++) {
            particles.push({
                x: Math.random() * w, y: Math.random() * h,
                vx: (Math.random() - 0.5) * cfg.speed,
                vy: (Math.random() - 0.5) * cfg.speed,
                r: Math.random() * 1.3 + 0.6
            });
        }
    }

    function draw() {
        var w = canvas.clientWidth, h = canvas.clientHeight;
            ctx.clearRect(0, 0, w, h);

        for (var i = 0; i < particles.length; i++) {
            var p = particles[i];

        if (cfg.wander) {
        // 매 프레임 속도에 작은 무작위 값을 더해 불특정 경로로 서서히 방향을 바꾸게 함
            p.vx += (Math.random() - 0.5) * 0.02;
            p.vy += (Math.random() - 0.5) * 0.02;
            var sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
                if (sp > cfg.speed) { p.vx = (p.vx / sp) * cfg.speed; p.vy = (p.vy / sp) * cfg.speed; }
        }

        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
    }

    ctx.fillStyle = '#ffffff';
        for (var i = 0; i < particles.length; i++) {
            var p = particles[i];
                ctx.globalAlpha = 0.85;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
        }

        if (cfg.connect) {
            ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
                for (var i = 0; i < particles.length; i++) {
                for (var j = i + 1; j < particles.length; j++) {
                    var a = particles[i], b = particles[j];
                    var dx = a.x - b.x, dy = a.y - b.y;
                    var dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist < cfg.connectDist) {
                            ctx.globalAlpha = (1 - dist / cfg.connectDist) * 0.3;
                            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
                        }
                    }
                }
            }
            ctx.globalAlpha = 1;
        }

    resize();
        window.addEventListener('resize', debounce(resize, 200));
        if (window.gsap) { gsap.ticker.add(draw); }
        else { (function loop() { draw(); requestAnimationFrame(loop); })(); }
    }

    /* ----------------------------------------------------------------------------
        2) PUBLISHING PROCESS — 가운데에서 점점 커지는 원(ripple) 배경
        PROCESS_RIPPLE_CONFIG 값만 바꾸면 링의 개수·속도·색상·굵기·최대 크기를 조절할 수 있습니다.
        - ringCount     : 동시에 퍼지는 원의 개수 (많을수록 더 촘촘하게 반복 재생)
        - maxRadiusRatio: 캔버스 대각선 길이 대비 원이 커지는 최대 비율 (0~1)
        - speed         : 원이 커지는 속도 (숫자가 클수록 빠름)
        - color         : 원 테두리 색상 (기본: accent, --sage 등 다른 브랜드 컬러로 교체 가능)
        - lineWidth     : 원 테두리 두께
        - maxOpacity    : 원이 막 생겼을 때의 투명도 (커질수록 자동으로 옅어지다 사라짐)
    ---------------------------------------------------------------------------- */
    var PROCESS_RIPPLE_CONFIG = {
        ringCount: 4,
        maxRadiusRatio: 0.62,
        speed: 0.55,
        color: '#C2833C',
        lineWidth: 1.5,
        maxOpacity: 0.32
    };

    function createRippleField(canvas, cfg) {
        var ctx = canvas.getContext('2d');
        var section = canvas.closest('section');
        var DPR = Math.min(window.devicePixelRatio || 1, 2);
        var t = 0;

        function resize() {
            var rect = section.getBoundingClientRect();
            var w = rect.width, h = rect.height;
            canvas.width = w * DPR; canvas.height = h * DPR;
            canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
            ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        }

        function draw() {
            var w = canvas.clientWidth, h = canvas.clientHeight;
            ctx.clearRect(0, 0, w, h);
            var cx = w / 2, cy = h / 2;
            var maxRadius = (Math.sqrt(w * w + h * h) / 2) * cfg.maxRadiusRatio;

            t += cfg.speed * 0.0025; // 속도를 바꾸고 싶다면 이 배율(0.0025) 대신 cfg.speed 값을 조절하세요.

            for (var i = 0; i < cfg.ringCount; i++) {
                var progress = (t + i / cfg.ringCount) % 1;
                var radius = progress * maxRadius;
                ctx.globalAlpha = cfg.maxOpacity * (1 - progress);
                ctx.strokeStyle = cfg.color;
                ctx.lineWidth = cfg.lineWidth;
                ctx.beginPath();
                ctx.arc(cx, cy, radius, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
        }

        resize();
        window.addEventListener('resize', debounce(resize, 200));
        if (window.gsap) { gsap.ticker.add(draw); }
        else { (function loop() { draw(); requestAnimationFrame(loop); })(); }
    }

  /* ----------------------------------------------------------------------------
     캔버스 초기화 — reduced motion 사용자는 모든 배경 캔버스를 완전히 제거합니다.
  ---------------------------------------------------------------------------- */
    if (reduceMotion) {
        document.querySelectorAll('.section-particles').forEach(function (c) { c.remove(); });
    } else {
    ['main', 'contact'].forEach(function (key) {
        var canvas = document.getElementById('particles-' + key);
        if (canvas) createDotField(canvas, DOT_FIELD_CONFIGS[key]);
    });
    var rippleCanvas = document.getElementById('particles-process');
    if (rippleCanvas) createRippleField(rippleCanvas, PROCESS_RIPPLE_CONFIG);
  }

  // Publishing Process — staggered card reveal + animated progress line
    var processSteps = document.querySelectorAll('.process-step');
    var lineFill = document.querySelector('.process-line-fill');
    if (!reduceMotion && window.gsap && window.ScrollTrigger) {
    gsap.set(processSteps, { opacity: 0, y: 24 });
    gsap.to(processSteps, {
        opacity: 1, y: 0, duration: 0.7, ease: 'power2.out', stagger: 0.12,
        scrollTrigger: { trigger: '.process-track', start: 'top 78%' }
    });
    if (lineFill) {
        gsap.fromTo(lineFill, { scaleX: 0 }, {
        scaleX: 1, ease: 'none',
        scrollTrigger: { trigger: '.process-track', start: 'top 75%', end: 'bottom 55%', scrub: 0.6 }
        });
    }
    } else {
    processSteps.forEach(function (el) { el.style.opacity = 1; el.style.transform = 'none'; });
    if (lineFill) lineFill.style.transform = 'scaleX(1)';
    }

    /* ----------------------------------------------------------------------------
        3) SKILLS — 배경 워터마크 텍스트 노출/숨김 (색상·크기는 CSS #skills 변수에서 조절)
        아래 else 블록(화면을 벗어났을 때 다시 지우는 부분)을 삭제하면
        "한 번 나타난 뒤 계속 유지"로 동작이 바뀝니다.
    ---------------------------------------------------------------------------- */
    var skillsBgText = document.querySelector('.skills-bg-text');
    if (skillsBgText) {
    var skillsObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
        if (entry.isIntersecting) { skillsBgText.classList.add('is-visible'); }
        else { skillsBgText.classList.remove('is-visible'); }
        });
    }, { threshold: 0.4 });
    skillsObserver.observe(document.getElementById('skills'));
    }

  /* ----------------------------------------------------------------------------
     4) RECENTED PROJECT — 가로 방향 그라데이션 배경
     GRADIENT_CONFIG.colors 배열만 수정하면 그라데이션 색상·색상 개수가 자동으로 바뀝니다.
     linear-gradient가 색상 사이를 자동으로 부드럽게 섞어주기 때문에 별도 처리가 필요 없습니다.
     - direction : 그라데이션 방향 (예: 'to right' = 가로, 'to bottom' = 세로, '135deg' = 대각선)
     - duration  : 왼쪽에서 오른쪽으로 펼쳐지는 데 걸리는 시간(초)
     - ease      : GSAP 이징 값 (예: 'power2.out', 'none' 등)
  ---------------------------------------------------------------------------- */
    var GRADIENT_CONFIG = {
        colors: ['#F1DFC2', '#EAD8BC', '#DFCFB7', '#D2CBB8', '#C3C9BA', '#E1E9DE'],
        direction: 'to right',
        duration: 1.1,
        ease: 'power2.out'
    };

    (function initProjectGradient() {
        var el = document.querySelector('.projects-bg-gradient');
        if (!el) return;

        el.style.background = 'linear-gradient(' + GRADIENT_CONFIG.direction + ', ' + GRADIENT_CONFIG.colors.join(', ') + ')';

        if (!reduceMotion && window.gsap && window.ScrollTrigger) {
            gsap.to(el, {
            scaleX: 1, duration: GRADIENT_CONFIG.duration, ease: GRADIENT_CONFIG.ease,
            scrollTrigger: { trigger: '#projects', start: 'top 70%' }
            });
        } else {
            el.style.transform = 'scaleX(1)';
        }
    })();

    // Active side-nav state via IntersectionObserver
    var navLinks = document.querySelectorAll('[data-nav]');
    var sections = document.querySelectorAll('main section[id]');
    var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
        if (entry.isIntersecting) {
        navLinks.forEach(function (l) { l.removeAttribute('aria-current'); });
        var active = document.querySelector('[data-nav][href="#' + entry.target.id + '"]');
        if (active) active.setAttribute('aria-current', 'true');
        }
    });
    }, { threshold: 0.55 });
    sections.forEach(function (s) { observer.observe(s); });

    /* ----------------------------------------------------------------------------
        FULLPAGE 스크롤 — 휠 한 번 / 스와이프 한 번 = 다음(또는 이전) 섹션으로 이동
        FULLPAGE_CONFIG 값만 바꾸면 동작 조건을 조절할 수 있습니다.
        - enableWheel          : PC 마우스/트랙패드 휠 스크롤에 적용할지 여부
        - enableTouch          : 모바일/터치 스와이프에도 적용할지 여부 (요청에 따라 true)
        - minViewportWidthForWheel : 이 너비 이상에서만 휠 스크롤을 가로챔 (0으로 하면 항상 적용)
        - cooldown             : 한 번 이동한 뒤 다음 입력을 받기까지 대기 시간(ms) — 트랙패드 관성 스크롤로
                                여러 섹션이 한 번에 넘어가는 것을 방지
        - minDelta             : 이 값보다 작은 휠 이동은 무시 (오작동 방지)
        - minSwipeDistance     : 이 값(px)보다 작은 터치 스와이프는 무시 (오작동 방지)
        동작 원칙:
        - 마지막 섹션(Contact)에서 한 번 더 아래로 스크롤하면 페이지 최하단의 footer로
        자연스럽게 이어지도록, "더 이동할 섹션이 없을 때"는 가로채지 않고 기본 스크롤을 허용합니다.
        - 터치의 경우 세로 스와이프만 페이지 전환으로 처리하고, 가로 스와이프는 그대로 두어
        Skills 캐러셀(Swiper) · Recented Project 슬라이더(slick) · Publishing Process 가로 스크롤과
        충돌하지 않도록 했습니다.
        - 키보드 스크롤(Space, PageUp/Down, 방향키)과 스크린리더는 가로채지 않습니다.
        - prefers-reduced-motion 사용자에게는 이 기능 자체를 켜지 않습니다(자연 스크롤 유지).
    ---------------------------------------------------------------------------- */
    var FULLPAGE_CONFIG = {
        enableWheel: true,
        enableTouch: true,
        minViewportWidthForWheel: 1025,
        cooldown: 900,
        minDelta: 12,
        minSwipeDistance: 50
    };

    (function initFullpageScroll() {
        if (reduceMotion) return;

        var sectionsArr = Array.prototype.slice.call(sections);
        var isAnimating = false;

        function getCurrentIndex() {
            var mid = window.scrollY + window.innerHeight / 2;
                for (var i = 0; i < sectionsArr.length; i++) {
            var top = sectionsArr[i].offsetTop;
            var bottom = top + sectionsArr[i].offsetHeight;
                if (mid >= top && mid < bottom) return i;
            }
            return 0;
        }

        function goTo(index) {
            isAnimating = true;
            sectionsArr[index].scrollIntoView({ behavior: 'smooth' });
            setTimeout(function () { isAnimating = false; }, FULLPAGE_CONFIG.cooldown);
        }

        // ---- 휠(PC 마우스/트랙패드) ----
        if (FULLPAGE_CONFIG.enableWheel) {
            window.addEventListener('wheel', function (e) {
                if (window.innerWidth < FULLPAGE_CONFIG.minViewportWidthForWheel) return;
                if (Math.abs(e.deltaY) < FULLPAGE_CONFIG.minDelta) return;
                if (isAnimating) { e.preventDefault(); return; }

                var current = getCurrentIndex();
                var target = e.deltaY > 0 ? current + 1 : current - 1;
                // 더 이동할 섹션이 없으면(맨 위/맨 아래) 가로채지 않고 자연 스크롤 허용
                // → 마지막 섹션 아래로는 footer까지 자연스럽게 스크롤됩니다.
                    if (target < 0 || target >= sectionsArr.length) return;

                e.preventDefault();
                goTo(target);
            }, { passive: false });
        }

        // ---- 터치(모바일 스와이프) ----
        if (FULLPAGE_CONFIG.enableTouch) {
        var startX = 0, startY = 0, lockDirection = null;

        window.addEventListener('touchstart', function (e) {
            if (isAnimating) return;
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            lockDirection = null;
        }, { passive: true });

        window.addEventListener('touchmove', function (e) {
            if (isAnimating || !e.touches.length) return;
            var dx = e.touches[0].clientX - startX;
            var dy = e.touches[0].clientY - startY;

            if (!lockDirection && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
            // 제스처 초반에 방향을 한 번만 판정 — 세로 위주면 페이지 전환, 가로 위주면 캐러셀/가로스크롤에 양보
            lockDirection = Math.abs(dy) > Math.abs(dx) ? 'vertical' : 'horizontal';
            }
            if (lockDirection === 'vertical') e.preventDefault();
        }, { passive: false });

        window.addEventListener('touchend', function (e) {
            if (isAnimating || lockDirection !== 'vertical') { lockDirection = null; return; }
            var dy = (e.changedTouches[0].clientY - startY);
            lockDirection = null;
            if (Math.abs(dy) < FULLPAGE_CONFIG.minSwipeDistance) return;

            var current = getCurrentIndex();
            var target = dy < 0 ? current + 1 : current - 1; // 위로 스와이프(dy<0) = 다음 섹션
            if (target < 0 || target >= sectionsArr.length) return; // 경계에서는 자연 스크롤 허용
            goTo(target);
        }, { passive: true });
        }
    })();

    /* ----------------------------------------------------------------------------
        RECENTED PROJECT — slick.js 슬라이더 옵션
        - slidesToShow : 데스크톱 기본 노출 장수
        - infinite     : true = 12개 카드가 끝까지 가면 처음으로 자연스럽게 loop
        - responsive[].breakpoint : "이 값 이하일 때" 아래 settings 적용 (slick 규칙)
        현재 1024px(태블릿 시작 지점) 이하에서는 슬라이드 1장만 보이도록 설정되어 있습니다.
        태블릿 구간에서만 다르게 하고 싶다면 breakpoint 768 항목을 추가하면 됩니다.
    ---------------------------------------------------------------------------- */
    var PROJECTS_SLIDER_CONFIG = {
        slidesToShow: 3,
        infinite: true,
        speed: 500,
        responsive: [
            { breakpoint: 1024, settings: { slidesToShow: 1 } } // 태블릿 해상도부터 1장
        ]
    };

    // Selected Works slider (slick.js)
    if (window.jQuery) {
        jQuery(function ($) {
            $('.project-grid').slick({
                slidesToShow: PROJECTS_SLIDER_CONFIG.slidesToShow,
                slidesToScroll: 1,
                arrows: false,
                dots: true,
                infinite: PROJECTS_SLIDER_CONFIG.infinite,
                speed: PROJECTS_SLIDER_CONFIG.speed,
                adaptiveHeight: false,
                prevArrow: $('#projectsPrev'),
                nextArrow: $('#projectsNext'),
                responsive: PROJECTS_SLIDER_CONFIG.responsive
            });
        });
    }

    // Mobile menu toggle (visual only in this mockup)
    var menuToggle = document.querySelector('.menu-toggle');
    var gnb = document.querySelector('.gnb');
        menuToggle && menuToggle.addEventListener('click', function () {
    var expanded = menuToggle.getAttribute('aria-expanded') === 'true';
        menuToggle.setAttribute('aria-expanded', String(!expanded));
});