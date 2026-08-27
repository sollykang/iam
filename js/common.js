
  // ============================================================
  // 0. 모션 감소 설정 확인
  //    사용자가 "동작 줄이기(prefers-reduced-motion)"를 켜두었으면 아래 애니메이션들을 최대한 켜지 않습니다.
  // ============================================================
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 여러 곳에서 재사용하는 함수: 짧은 시간 안에 여러 번 실행되는 걸 막아줍니다.
  // (예: 창 크기를 조절할 때 resize 이벤트가 너무 자주 발생하는 것을 방지)
  function debounce(fn, delay) {
    var timer;
    return function () {
      clearTimeout(timer);
      timer = setTimeout(fn, delay);
    };
  }

  // ============================================================
  // 1. Skills 캐러셀 (Swiper 라이브러리)
  //    Swiper가 로드되지 않으면 이 줄에서 멈추지 않도록 존재 여부를 먼저 확인.
  // ============================================================
  if (window.Swiper) {
    try {
      var skillsSwiper = new Swiper('.skills-swiper', {
        slidesPerView: 1.15,
        spaceBetween: 20,
        breakpoints: {
          640: { slidesPerView: 2, spaceBetween: 20 },
          1080: { slidesPerView: 3, spaceBetween: 20 },
          1440: { slidesPerView: 5, spaceBetween: 20 }
        },
        pagination: { el: '.swiper-pagination', clickable: true },
        navigation: { nextEl: '#skillsNext', prevEl: '#skillsPrev' },
        a11y: { enabled: true },
        keyboard: { enabled: true }
      });
    } catch (error) {
      console.warn('Skills 캐러셀 초기화에 실패했습니다.', error);
    }
  } else {
    console.warn('Swiper 라이브러리를 불러오지 못했습니다. Skills 캐러셀은 비활성화되고, 나머지 기능은 정상 동작합니다.');
  }

  // ============================================================
  // 1-1. Recented Project 카드 안 이미지 슬라이드 (Swiper 라이브러리)
  // ============================================================
  if (window.Swiper) {
    var projectMediaSwipers = document.querySelectorAll('.project-media-swiper');
    projectMediaSwipers.forEach(function (el, index) {
      try {
        new Swiper(el, {
          loop: true,
          speed: 500,
          autoplay: false,       // 자동으로 넘어가지 않음
          allowTouchMove: false, // 드래그/스와이프로 넘어가지 않음 — 버튼으로만 이동
          navigation: {
            prevEl: '#projectMediaPrev' + index,
            nextEl: '#projectMediaNext' + index
          }
        });
      } catch (error) {
        console.warn('프로젝트 카드 이미지 슬라이드(' + index + '번) 초기화에 실패했습니다.', error);
      }
    });
  }

  // ============================================================
  // 2. 스크롤하면 서서히 나타나는 효과 (class="content-box"가 붙은 요소들)
  // ============================================================
  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
  }

  var contentBoxItems = document.querySelectorAll('.content-box');

  if (!reduceMotion && window.gsap && window.ScrollTrigger) {
    contentBoxItems.forEach(function (item) {
      gsap.to(item, {
        opacity: 1,
        y: 0,
        duration: 0.9,
        ease: 'power2.out',
        scrollTrigger: { trigger: item, start: 'top 82%' }
      });
    });
  } else {
    // GSAP이 없거나 모션을 줄이고 싶어하는 사용자는 애니메이션 없이 바로 다 보여줍니다.
    contentBoxItems.forEach(function (item) {
      item.style.opacity = 1;
      item.style.transform = 'none';
    });
  }

  // ============================================================
  // 3. 메인 화면 오빗(원형 궤도) — 기술 태그가 바깥 라인을 따라 돕니다
  //    CIRCLE_OPTIONS 값만 바꾸면 궤도 크기, 도는 속도를 조절할 수 있어요.
  //    - radiusRatio    : 1.0이면 가장 바깥 원(.circle)에 정확히 맞춰짐
  //    - speedPerFrame  : 한 프레임마다 도는 각도 (숫자가 클수록 빠르게 돎)
  // ============================================================
  var CIRCLE_OPTIONS = {
    radiusRatio: 0.97,
    speedPerFrame: 0.12
  };

  var circleBox = document.querySelector('.circle-wrap');
  var circleTags = document.querySelectorAll('.circle-tag');

  function updateCircleTagPositions(angle) {
    var box = circleBox.getBoundingClientRect();
    var centerX = box.width / 2;
    var centerY = box.height / 2;
    var radius = (Math.min(box.width, box.height) / 2) * CIRCLE_OPTIONS.radiusRatio;

    circleTags.forEach(function (tag) {
      var startAngle = parseFloat(tag.dataset.angle) || 0;
      var currentAngle = (startAngle + angle) * (Math.PI / 180);
      var x = centerX + radius * Math.cos(currentAngle);
      var y = centerY + radius * Math.sin(currentAngle);
      tag.style.left = x + 'px';
      tag.style.top = y + 'px';
    });
  }

  if (circleBox && circleTags.length > 0) {
    var circleAngle = 0;

    updateCircleTagPositions(circleAngle);
    window.addEventListener('resize', debounce(function () {
      updateCircleTagPositions(circleAngle);
    }, 200));

    if (!reduceMotion && window.gsap) {
      gsap.ticker.add(function () {
        circleAngle = (circleAngle + CIRCLE_OPTIONS.speedPerFrame) % 360;
        updateCircleTagPositions(circleAngle);
      });
    }
    // reduceMotion인 경우 회전 없이 처음 위치에 고정된 상태로만 보여줍니다.
  }

  // ============================================================
  // 3-1. 메인 배경 포인트 — 켜고 끄기 + 마우스 스포트라이트 + 타이핑 코드
  //    MAIN_BG_EFFECTS 값을 false로 바꾸면 해당 효과만 끌 수 있어요.
  //    - spotlight   : 마우스 따라오는 은은한 빛 (③ 그리드 하이라이트와 좌표를 공유)
  //    - grid        : 배경 그리드 라인
  //    - typingCode  : 배경에서 타이핑되는 코드 한 줄
  //    - circleTrail : 궤도를 도는 그라디언트 트레일 (CSS의 .circle-trail이 실제 효과를 담당,
  //                    여기서는 껐을 때 요소를 지우는 역할만 합니다)
  // ============================================================
  var MAIN_BG_EFFECTS = {
    spotlight: true,
    grid: true,
    typingCode: true,
    circleTrail: true
  };

  // ① + ③ 마우스 위치를 따라 스포트라이트와 그리드 하이라이트를 함께 움직입니다.
  (function setupMainSpotlight() {
    if (!MAIN_BG_EFFECTS.spotlight) {
      var spotlightEl = document.querySelector('.main-spotlight');
      if (spotlightEl) spotlightEl.remove();
    }
    if (!MAIN_BG_EFFECTS.grid) {
      var gridEl = document.querySelector('.main-grid');
      if (gridEl) gridEl.remove();
    }
    if (!MAIN_BG_EFFECTS.spotlight && !MAIN_BG_EFFECTS.grid) return;

    var mainSection = document.getElementById('main');
    if (!mainSection) return;

    mainSection.addEventListener('mousemove', function (e) {
      var box = mainSection.getBoundingClientRect();
      var x = e.clientX - box.left;
      var y = e.clientY - box.top;
      mainSection.style.setProperty('--spotlight-x', x + 'px');
      mainSection.style.setProperty('--spotlight-y', y + 'px');
    });
  })();

  // ② 배경에 코드 한 줄이 타이핑되었다가 지워지기를 반복합니다.
  //    문구를 바꾸고 싶으면 아래 CODE_LINES 배열만 수정하면 됩니다.
  (function setupMainTypingCode() {
    var el = document.querySelector('.main-typing-code');
    if (!el) return;

    if (!MAIN_BG_EFFECTS.typingCode || reduceMotion) {
      el.remove();
      return;
    }

    var CODE_LINES = [
      '<div class="kang">',
      'const publisher = new KangSolly();',
      '.web-standard { display: flex; }'
    ];
    var textEl = document.getElementById('mainTypingText');
    var lineIndex = 0;
    var charIndex = 0;
    var isDeleting = false;

    function tick() {
      var currentLine = CODE_LINES[lineIndex];

      if (!isDeleting) {
        charIndex++;
        textEl.textContent = currentLine.slice(0, charIndex);
        if (charIndex === currentLine.length) {
          isDeleting = true;
          setTimeout(tick, 1400); // 다 타이핑한 뒤 잠깐 멈춤
          return;
        }
      } else {
        charIndex--;
        textEl.textContent = currentLine.slice(0, charIndex);
        if (charIndex === 0) {
          isDeleting = false;
          lineIndex = (lineIndex + 1) % CODE_LINES.length;
        }
      }

      setTimeout(tick, isDeleting ? 35 : 65);
    }

    tick();
  })();

  // ④ 궤도 트레일 — 꺼져 있으면 요소를 지웁니다 (실제 회전 효과는 CSS가 담당).
  if (!MAIN_BG_EFFECTS.circleTrail) {
    var circleTrailEl = document.querySelector('.circle-trail');
    if (circleTrailEl) circleTrailEl.remove();
  }
  if (reduceMotion) {
    var circleTrailElForReduceMotion = document.querySelector('.circle-trail');
    if (circleTrailElForReduceMotion) circleTrailElForReduceMotion.style.animation = 'none';
  }

  // ============================================================
  // 4. 배경 파티클 — Home, Contact 섹션
  //    작은 점들이 캔버스 위에서 움직이는 단순한 애니메이션입니다.
  //    PARTICLE_OPTIONS에서 섹션별로 다르게 설정할 수 있어요.
  //    - count           : 점 개수
  //    - speed           : 이동 속도
  //    - connectLines    : 가까운 점끼리 선을 이을지 여부
  //    - maxLineDistance : 선을 잇는 최대 거리(px)
  //    - moveRandomly    : true면 일직선이 아니라 방향을 조금씩 바꾸며 움직임
  // ============================================================
  var PARTICLE_OPTIONS = {
    home: { count: 60, speed: 0.18, connectLines: true, maxLineDistance: 118, moveRandomly: false },
    contact: { count: 40, speed: 0.09, connectLines: false, maxLineDistance: 0, moveRandomly: true }
  };

  function startParticles(canvas, options) {
    var ctx = canvas.getContext('2d');
    var section = canvas.closest('section');
    var dots = [];

    function resizeCanvas() {
      var box = section.getBoundingClientRect();
      canvas.width = box.width;
      canvas.height = box.height;

      dots = [];
      for (var i = 0; i < options.count; i++) {
        dots.push({
          x: Math.random() * box.width,
          y: Math.random() * box.height,
          vx: (Math.random() - 0.5) * options.speed,
          vy: (Math.random() - 0.5) * options.speed,
          radius: Math.random() * 1.3 + 0.6
        });
      }
    }

    function moveDots() {
      for (var i = 0; i < dots.length; i++) {
        var dot = dots[i];

        if (options.moveRandomly) {
          // 매 프레임 속도에 작은 무작위 값을 더해서 방향을 서서히 바꿉니다.
          dot.vx += (Math.random() - 0.5) * 0.02;
          dot.vy += (Math.random() - 0.5) * 0.02;

          var currentSpeed = Math.sqrt(dot.vx * dot.vx + dot.vy * dot.vy);
          if (currentSpeed > options.speed) {
            dot.vx = (dot.vx / currentSpeed) * options.speed;
            dot.vy = (dot.vy / currentSpeed) * options.speed;
          }
        }

        dot.x += dot.vx;
        dot.y += dot.vy;

        // 화면 가장자리에 닿으면 반대쪽에서 다시 나타나게 합니다.
        if (dot.x < 0) dot.x = canvas.width;
        if (dot.x > canvas.width) dot.x = 0;
        if (dot.y < 0) dot.y = canvas.height;
        if (dot.y > canvas.height) dot.y = 0;
      }
    }

    function drawDots() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ffffff';

      for (var i = 0; i < dots.length; i++) {
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.arc(dots[i].x, dots[i].y, dots[i].radius, 0, Math.PI * 2);
        ctx.fill();
      }

      if (options.connectLines) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        for (var i = 0; i < dots.length; i++) {
          for (var j = i + 1; j < dots.length; j++) {
            var dx = dots[i].x - dots[j].x;
            var dy = dots[i].y - dots[j].y;
            var distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < options.maxLineDistance) {
              ctx.globalAlpha = (1 - distance / options.maxLineDistance) * 0.3;
              ctx.beginPath();
              ctx.moveTo(dots[i].x, dots[i].y);
              ctx.lineTo(dots[j].x, dots[j].y);
              ctx.stroke();
            }
          }
        }
      }
      ctx.globalAlpha = 1;
    }

    function tick() {
      moveDots();
      drawDots();
    }

    resizeCanvas();
    window.addEventListener('resize', debounce(resizeCanvas, 200));

    if (window.gsap) {
      gsap.ticker.add(tick);
    } else {
      // GSAP을 못 불러왔을 때를 대비한 기본 애니메이션 반복
      function loop() { tick(); requestAnimationFrame(loop); }
      loop();
    }
  }

  if (reduceMotion) {
    // 모션을 줄이고 싶어하는 사용자에게는 배경 캔버스를 아예 없앱니다.
    document.querySelectorAll('.section-particles').forEach(function (canvas) {
      canvas.remove();
    });
  } else {
    var homeParticleCanvas = document.getElementById('particles-home');
    if (homeParticleCanvas) startParticles(homeParticleCanvas, PARTICLE_OPTIONS.home);

    var contactParticleCanvas = document.getElementById('particles-contact');
    if (contactParticleCanvas) startParticles(contactParticleCanvas, PARTICLE_OPTIONS.contact);
  }

  // ============================================================
  // 5. Publishing Process — 가운데에서 점점 커지는 원(ripple) 배경
  //    RIPPLE_OPTIONS 값만 바꾸면 링 개수, 속도, 색상, 최대 크기를 조절할 수 있어요.
  // ============================================================
  var RIPPLE_OPTIONS = {
      ringCount: 4,
      maxRadiusRatio: 0.62,
      speed: 0.55,
      color: '#C2833C',
      lineWidth: 1.5,
      maxOpacity: 0.32
  };

  if (!reduceMotion) {
    var rippleCanvas = document.getElementById('particles-process');

    if (rippleCanvas) {
      var rippleCtx = rippleCanvas.getContext('2d');
      var rippleSection = rippleCanvas.closest('section');
      var rippleTime = 0;

      var resizeRippleCanvas = function () {
        var box = rippleSection.getBoundingClientRect();
        rippleCanvas.width = box.width;
        rippleCanvas.height = box.height;
      };

      var drawRings = function () {
        rippleCtx.clearRect(0, 0, rippleCanvas.width, rippleCanvas.height);

        var centerX = rippleCanvas.width / 2;
        var centerY = rippleCanvas.height / 2;
        var diagonal = Math.sqrt(rippleCanvas.width * rippleCanvas.width + rippleCanvas.height * rippleCanvas.height);
        var maxRadius = (diagonal / 2) * RIPPLE_OPTIONS.maxRadiusRatio;

        rippleTime += RIPPLE_OPTIONS.speed * 0.0025;

        for (var i = 0; i < RIPPLE_OPTIONS.ringCount; i++) {
          var progress = (rippleTime + i / RIPPLE_OPTIONS.ringCount) % 1; // 0에서 1까지 반복
          var radius = progress * maxRadius;

          rippleCtx.globalAlpha = RIPPLE_OPTIONS.maxOpacity * (1 - progress); // 커질수록 옅어짐
          rippleCtx.strokeStyle = RIPPLE_OPTIONS.color;
          rippleCtx.lineWidth = RIPPLE_OPTIONS.lineWidth;
          rippleCtx.beginPath();
          rippleCtx.arc(centerX, centerY, radius, 0, Math.PI * 2);
          rippleCtx.stroke();
        }
        rippleCtx.globalAlpha = 1;
      };

      resizeRippleCanvas();
      window.addEventListener('resize', debounce(resizeRippleCanvas, 200));

      if (window.gsap) {
        gsap.ticker.add(drawRings);
      } else {
        (function loop() { drawRings(); requestAnimationFrame(loop); })();
      }
    }
  }

  // ============================================================
  // 6. Publishing Process — 카드가 순서대로 나타나기 + 진행선 채우기
  // ============================================================
  var processSteps = document.querySelectorAll('.process-step');
  var progressLine = document.querySelector('.process-line-fill');

  if (!reduceMotion && window.gsap && window.ScrollTrigger) {
    gsap.set(processSteps, { opacity: 0, y: 24 });
    gsap.to(processSteps, {
      opacity: 1,
      y: 0,
      duration: 0.7,
      ease: 'power2.out',
      stagger: 0.12,
      scrollTrigger: { trigger: '.process-track', start: 'top 78%' }
    });

    if (progressLine) {
      gsap.fromTo(progressLine, { scaleX: 0 }, {
        scaleX: 1,
        ease: 'none',
        scrollTrigger: { trigger: '.process-track', start: 'top 75%', end: 'bottom 55%', scrub: 0.6 }
      });
    }
  } else {
    processSteps.forEach(function (step) {
      step.style.opacity = 1;
      step.style.transform = 'none';
    });
    if (progressLine) progressLine.style.transform = 'scaleX(1)';
  }

  // ============================================================
  // 7. Skills — 배경에 큰 글자(워터마크)가 스크롤해서 들어오면 옅게 나타남
  //    글자 색상/크기는 CSS의 "#skills { --skills-bg-text-... }" 값에서 조절합니다.
  // ============================================================
  var skillsBgText = document.querySelector('.skills-bg-text');

  if (skillsBgText) {
    var skillsSection = document.getElementById('skills');

    var skillsObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          skillsBgText.classList.add('is-visible');
        } else {
          // 이 else 블록을 지우면 "한 번 나타난 뒤 계속 유지"로 동작이 바뀝니다.
          skillsBgText.classList.remove('is-visible');
        }
      });
    }, { threshold: 0.4 });

    skillsObserver.observe(skillsSection);
  }

  // ============================================================
  // 8. Recented Project — 가로 방향 그라데이션 배경 (고정)
  //    GRADIENT_OPTIONS.colors 배열만 바꾸면 색상이 자동으로 바뀝니다.
  //    처음부터 고정으로 보이도록 등장 애니메이션 없이 바로 적용합니다.
  // ============================================================
  var GRADIENT_OPTIONS = {
    colors: ['#F1DFC2', '#EAD8BC', '#DFCFB7', '#D2CBB8', '#C3C9BA', '#E1E9DE'],
    direction: 'to right'
  };

  var gradientBox = document.querySelector('.projects-bg-gradient');

  if (gradientBox) {
    gradientBox.style.background = 'linear-gradient(' + GRADIENT_OPTIONS.direction + ', ' + GRADIENT_OPTIONS.colors.join(', ') + ')';
  }

  // ============================================================
  // 9. FULLPAGE 내비게이션
  //    상단 GNB와 왼쪽 사이드 내비게이션이 같은 설정을 보고 똑같이 동작하도록 하나로 묶어둠. 
  //
  //    FULLPAGE_OPTIONS 값만 바꾸면 아래 항목들을 조절할 수 있음.
  //    - anchors        : 섹션 id를 순서대로 나열한 목록 (GNB·사이드 내비가 그대로 사용)
  //    - scrollingSpeed : 한 섹션 이동 후 다음 입력을 받기까지 기다리는 시간(ms)
  //    - useWheel       : 마우스/트랙패드 휠로도 다음·이전 섹션 이동할지 여부
  //    - useTouch       : 모바일 스와이프로도 다음·이전 섹션 이동할지 여부
  //    - minWheelWidth  : 이 화면 너비 이상에서만 휠 이동을 사용 (0이면 항상 사용)
  //    - minWheelDelta      : 이 값보다 작은 휠 이동은 무시 (오작동 방지)
  //    - minSwipeDistance   : 이 값(px)보다 작은 터치 스와이프는 무시 (오작동 방지)
  // ============================================================
  var FULLPAGE_OPTIONS = {
    anchors: ['main', 'about', 'skills', 'projects', 'process', 'contact'],
    scrollingSpeed: 900,
    useWheel: true,
    useTouch: true,
    minWheelWidth: 1025,
    minWheelDelta: 12,
    minSwipeDistance: 50
  };

  // anchors 목록에 있는 id로 실제 섹션 요소를 찾아둡니다.
  var fullpageSections = [];
  FULLPAGE_OPTIONS.anchors.forEach(function (id) {
    var el = document.getElementById(id);
    if (el) fullpageSections.push(el);
  });

  var isSectionMoving = false;

  // 목록의 index번째 섹션으로 이동하는 함수
  // GNB 클릭, 사이드 내비 클릭, 휠 스크롤, 터치 스와이프가 전부 이 함수를 사용합니다.
  function goToSection(index) {
    if (index < 0 || index >= fullpageSections.length) return; // 범위 밖이면 아무것도 하지 않음
    isSectionMoving = true;
    fullpageSections[index].scrollIntoView({ behavior: 'smooth' });
    setTimeout(function () {
      isSectionMoving = false;
    }, FULLPAGE_OPTIONS.scrollingSpeed);
  }

  // 지금 화면 가운데에 어떤 섹션이 보이고 있는지 찾는 함수
  function getCurrentSectionIndex() {
    var middleOfScreen = window.scrollY + window.innerHeight / 2;
    for (var i = 0; i < fullpageSections.length; i++) {
      var top = fullpageSections[i].offsetTop;
      var bottom = top + fullpageSections[i].offsetHeight;
      if (middleOfScreen >= top && middleOfScreen < bottom) return i;
    }
    return 0;
  }

  // ---- 9-1. 전역 API 등록 ----
  // HTML의 onclick="fullpage_api.moveTo(2)" 처럼 바깥에서 바로 호출할 수 있도록
  // window 객체에 등록해둡니다. 
  // (실제 fullPage.js도 이런 방식의 API를 제공합니다)
  // moveTo는 fullPage.js와 동일하게 1번부터 세는 섹션 번호를 받습니다.
  window.fullpage_api = {
    moveTo: function (sectionNumber) {
      goToSection(sectionNumber - 1);
    }
  };

  // 모바일 GNB 드롭다운을 열고 닫는 전역 API
  // forceOpen에 true/false를 넘기면 그 상태로 강제 설정하고, 아무것도 넘기지 않으면 토글합니다.
  window.commonUI = {
    headerToggle: function (forceOpen) {
      var gnbEl = document.querySelector('.gnb');
      var menuToggleEl = document.querySelector('.menu-toggle');
      var isOpen = gnbEl.classList.contains('is-open');
      var nextOpen = (typeof forceOpen === 'boolean') ? forceOpen : !isOpen;

      gnbEl.classList.toggle('is-open', nextOpen);
      menuToggleEl.setAttribute('aria-expanded', String(nextOpen));
    }
  };

  // ---- 9-2. 스크롤 위치에 맞춰 GNB / 사이드 내비 활성 표시 갱신 ----
  var allNavLinks = document.querySelectorAll('.btn-gnb-nav, .btn-side-nav');

  var sectionObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;

      var currentId = entry.target.id;
      allNavLinks.forEach(function (link) {
        if (link.dataset.anchor === currentId) {
          link.setAttribute('aria-current', 'true');
        } else {
          link.removeAttribute('aria-current');
        }
      });
    });
  }, { threshold: 0.55 });

  fullpageSections.forEach(function (section) {
    sectionObserver.observe(section);
  });

  // ---- 9-3. 마우스/트랙패드 휠로 섹션 이동 (PC) ----
  if (!reduceMotion && FULLPAGE_OPTIONS.useWheel) {
    window.addEventListener('wheel', function (e) {
      if (window.innerWidth < FULLPAGE_OPTIONS.minWheelWidth) return;
      if (Math.abs(e.deltaY) < FULLPAGE_OPTIONS.minWheelDelta) return;
      if (isSectionMoving) { e.preventDefault(); return; }

      var current = getCurrentSectionIndex();
      var next = e.deltaY > 0 ? current + 1 : current - 1;

      // 이동할 섹션이 없으면(맨 위/맨 아래) 그냥 자연 스크롤에 맡깁니다.
      // 이렇게 해야 마지막 섹션 아래에 있는 footer까지 스크롤할 수 있어요.
      if (next < 0 || next >= fullpageSections.length) return;

      e.preventDefault();
      goToSection(next);
    }, { passive: false });
  }

  // ---- 9-4. 터치 스와이프로 섹션 이동 (모바일) ----
  if (!reduceMotion && FULLPAGE_OPTIONS.useTouch) {
    var touchStartX = 0;
    var touchStartY = 0;
    var swipeDirection = null; // 'vertical' 또는 'horizontal'

    window.addEventListener('touchstart', function (e) {
      if (isSectionMoving) return;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      swipeDirection = null;
    }, { passive: true });

    window.addEventListener('touchmove', function (e) {
      if (isSectionMoving || e.touches.length === 0) return;

      var diffX = e.touches[0].clientX - touchStartX;
      var diffY = e.touches[0].clientY - touchStartY;

      // 스와이프가 시작되면 방향을 한 번만 판단합니다.
      // 세로 방향이면 페이지 전환에 사용하고, 가로 방향이면 그대로 두어
      // Skills 캐러셀 · Recented Project 슬라이더 · Publishing Process 가로 스크롤과
      // 충돌하지 않게 합니다.
      if (!swipeDirection && (Math.abs(diffX) > 10 || Math.abs(diffY) > 10)) {
        swipeDirection = Math.abs(diffY) > Math.abs(diffX) ? 'vertical' : 'horizontal';
      }

      if (swipeDirection === 'vertical') e.preventDefault();
    }, { passive: false });

    window.addEventListener('touchend', function (e) {
      if (isSectionMoving || swipeDirection !== 'vertical') {
        swipeDirection = null;
        return;
      }

      var diffY = e.changedTouches[0].clientY - touchStartY;
      swipeDirection = null;
      if (Math.abs(diffY) < FULLPAGE_OPTIONS.minSwipeDistance) return;

      var current = getCurrentSectionIndex();
      var next = diffY < 0 ? current + 1 : current - 1; // 위로 스와이프하면 다음 섹션
      if (next < 0 || next >= fullpageSections.length) return;

      goToSection(next);
    }, { passive: true });
  }

  // 키보드(Space, PageUp/Down, 방향키)와 스크린리더는 위 이벤트들이 가로채지 않으므로
  // 그대로 자연스럽게 동작합니다.

  // ============================================================
  // 10. Recented Project — slick.js 슬라이더
  //     - infinite       : 마지막 카드 다음에 다시 처음 카드로 이어짐(무한 반복)
  //     - slidesToShow   : 한 화면에 보여줄 카드 개수
  //     - slidesToScroll : 화살표를 한 번 누를 때 넘어가는 카드 개수
  //     - arrows         : false로 두고, 대신 직접 만든 화살표 버튼(#projectsPrev/#projectsNext)을 사용
  //     - dots           : 아래쪽 점 페이지네이션 표시 여부
  //     - responsive     : 화면이 1024px(태블릿) 이하가 되면 한 장씩만 보여줌
  //
  //     버튼 연결 방식: slick의 prevArrow/nextArrow 옵션(자동 연결)은 버튼이
  //     슬라이더 바깥(다른 위치)에 있을 때 간헐적으로 클릭이 안 먹는 경우가 있어서,
  //     대신 버튼에 직접 클릭 이벤트를 걸고 그 안에서 slick의 API 메서드
  //     (.slick('slickPrev') / .slick('slickNext'))를 호출하는 방식으로 바꿨습니다.
  //     이 방식이 더 안정적이고, slick 공식 문서에도 나와 있는 표준적인 방법이에요.
  // ============================================================
  if (window.jQuery) {
    jQuery(document).ready(function ($) {
      try {
        var $projectGrid = $('.project-grid');

        $projectGrid.slick({
          infinite: true,
          slidesToShow: 4,
          slidesToScroll: 1,
          speed: 500,
          arrows: false,
          dots: true,
          responsive: [
            { breakpoint: 1440, settings: { slidesToShow: 3 } },
            { breakpoint: 1080, settings: { slidesToShow: 2 } },
            { breakpoint: 768, settings: { slidesToShow: 1 } }
          ]
        });

        var projectsPrevBtn = document.getElementById('projectsPrev');
        var projectsNextBtn = document.getElementById('projectsNext');

        if (projectsPrevBtn) {
          projectsPrevBtn.addEventListener('click', function () {
            $projectGrid.slick('slickPrev');
          });
        }
        if (projectsNextBtn) {
          projectsNextBtn.addEventListener('click', function () {
            $projectGrid.slick('slickNext');
          });
        }
      } catch (error) {
        console.warn('Recented Project 슬라이더 초기화에 실패했습니다.', error);
      }
    });
  }

  // ============================================================
  // 11. 모바일 메뉴 버튼
  //     실제 열고 닫는 동작은 HTML의 onclick="commonUI.headerToggle()"이 담당하므로
  //     여기서는 별도 처리가 필요 없습니다.
  // ============================================================

  // ============================================================
  // 12. Contact 문의폼
  //     별도 서버 없이도 동작하도록, 제출하면 입력한 내용을 담아
  //     이메일 앱(mailto)을 열어줍니다. 받는 주소를 바꾸려면
  //     CONTACT_FORM_EMAIL 값만 수정하면 됩니다.
  // ============================================================
  var CONTACT_FORM_EMAIL = 'solly17@naver.com';

  var contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();

      var name = document.getElementById('contactName').value.trim();
      var email = document.getElementById('contactEmail').value.trim();
      var message = document.getElementById('contactMessage').value.trim();

      if (!name || !email || !message) return; // required 속성이 있지만 한 번 더 확인

      var subject = encodeURIComponent('[포트폴리오 문의] ' + name + '님의 메시지');
      var body = encodeURIComponent(
        '이름: ' + name + '\n' +
        '이메일: ' + email + '\n\n' +
        message
      );

      window.location.href = 'mailto:' + CONTACT_FORM_EMAIL + '?subject=' + subject + '&body=' + body;

      var note = document.getElementById('contactFormNote');
      if (note) note.classList.add('is-visible');
    });
  }