// ============================================================
  // 0-1. 페이지 로딩 화면
  // ============================================================
  var PAGE_LOADER_MAX_WAIT = 8000;
  var pageLoader = document.getElementById('pageLoader');

  // 로딩 화면이 사라진 뒤에 실행할 함수들을 모아두는 곳
  // onPageReady(fn) 으로 등록하면, 로딩 화면이 사라지는 순간 실행됩니다. (이미 사라졌으면 바로 실행)
  var isPageReady = false;
  var pageReadyCallbacks = [];

  function onPageReady(fn) {
    if (isPageReady) fn();
    else pageReadyCallbacks.push(fn);
  }

  function hidePageLoader() {
    if (isPageReady) return; // load 이벤트와 안전장치 타이머가 두 번 부르는 것을 방지
    isPageReady = true;
    if (pageLoader) {
      document.body.classList.remove('is-loading');
      pageLoader.classList.add('is-hidden');
    }
    pageReadyCallbacks.forEach(function (fn) { fn(); });
    pageReadyCallbacks = [];
  }

  if (pageLoader) {
    document.body.classList.add('is-loading'); // 로딩 중에는 스크롤 막기
    window.addEventListener('load', hidePageLoader);
    setTimeout(hidePageLoader, PAGE_LOADER_MAX_WAIT); // 안전장치
  } else {
    // 로딩 화면이 없으면 스크립트가 다 읽힌 뒤 바로 시작
    setTimeout(hidePageLoader, 0);
  }

  // ============================================================
  // 0. 모션 감소 설정 확인
  //    사용자가 "동작 줄이기(prefers-reduced-motion)"를 켜두었으면 아래 애니메이션들을 최대한 켜지 x.
  // ============================================================
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 섹션 이동(풀페이지 스크롤) 중인지 여부 — 9번에서 값을 바꾸고, 다른 효과들이 참고합니다.
  var isSectionMoving = false;

  // 여러 곳에서 재사용하는 함수: 짧은 시간 안에 여러 번 실행되는 걸 막아줍니다.
  // (예: 창 크기를 조절할 때 resize 이벤트가 너무 자주 발생하는 것을 방지)
  function debounce(fn, delay) {
    var timer;
    return function () {
      clearTimeout(timer);
      timer = setTimeout(fn, delay);
    };
  }

  // ------------------------------------------------------------
  // [성능] 섹션이 화면에 보일 때만 매 프레임 반복 실행하는 함수
  //   파티클·궤도·물결처럼 매 프레임 다시 그리는 효과는 화면 밖에 있어도 계속 돌면
  //   지금 보고 있는 섹션의 스크롤/애니메이션까지 버벅이게 만들어요.
  //   그래서 해당 섹션이 화면에 들어왔을 때만 돌리고, 나가면 멈춥니다.
  // ------------------------------------------------------------
  function runWhileVisible(section, frameFn) {
    var running = false;
    var rafId = null;

    var frameCount = 0;

    function loop() {
      frameCount++;
      // [성능] 섹션 이동(스크롤) 중에는 절반 프레임만 그려서 스크롤에 여유를 줍니다.
      if (!isSectionMoving || frameCount % 2 === 0) frameFn();
      rafId = requestAnimationFrame(loop);
    }
    function start() {
      if (running) return;
      running = true;
      rafId = requestAnimationFrame(loop);
    }
    function stop() {
      if (!running) return;
      running = false;
      cancelAnimationFrame(rafId);
    }

    if (!window.IntersectionObserver) { start(); return; }
    new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) start();
        else stop();
      });
    }, { threshold: 0 }).observe(section);
  }

  // [성능] 화면 밖 섹션에는 .is-offscreen 클래스를 붙여서
  //   CSS 반복 애니메이션(궤도 트레일, 화살표, 스크롤 마우스 등)을 일시정지합니다. (common.css 참고)
  if (window.IntersectionObserver) {
    var offscreenObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        entry.target.classList.toggle('is-offscreen', !entry.isIntersecting);
      });
    }, { threshold: 0 });
    document.querySelectorAll('main > section').forEach(function (section) {
      offscreenObserver.observe(section);
    });
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
          640: { slidesPerView: 2},
          876: { slidesPerView: 3},
          1080: { slidesPerView: 4},
          1440: { slidesPerView: 5}
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
  // 2. 섹션 진입 애니메이션 — 메인(#main)을 제외한 섹션
  //    섹션이 화면에 들어오면
  //    - .h2-desc : 아래에서 위로 살짝 올라오며 나타남
  //    - h2       : 줄마다 마스크 안에서 아래 → 위로 스르륵 올라옴 (<br> 기준으로 줄 나눔)
  //    - 그 외 콘텐츠 : opacity만 0 → 1 로 서서히 나타남
  //
  //    [성능] JS(GSAP)가 매 프레임 스타일을 바꾸는 방식 대신,
  //    JS는 섹션에 .is-intro-in 클래스만 붙이고 실제 움직임은 CSS transition이 담당합니다.
  //    opacity/transform 전환은 브라우저가 별도 스레드(컴포지터)에서 처리해서
  //    스크롤 중에도 메인 스레드를 거의 쓰지 않아요. 속도·곡선은 common.css의
  //    "섹션 진입 애니메이션" 영역에서 조절합니다.
  //
  //    SECTION_INTRO_OPTIONS
  //    - replay        : true면 섹션에 들어올 때마다 다시 재생, false면 처음 한 번만 재생
  //    - startLine     : 섹션 윗부분이 화면 위에서부터 몇 % 지점에 닿으면 시작할지
  //    - titleDelay    : h2-desc 다음 h2 첫 줄이 시작되는 시간(초)
  //    - lineStagger   : h2 줄과 줄 사이 간격(초)
  //    - fadeDelay     : 제목이 시작되고 몇 초 뒤에 나머지 콘텐츠를 보여줄지
  //    - stagger       : 여러 요소가 차례로 나타날 때 사이 간격(초)
  //    - staggerGroups : 묶음 안의 항목을 한 줄씩 차례로 보여줄 영역 { 묶음 선택자: 항목 선택자 }
  // ============================================================
  var SECTION_INTRO_OPTIONS = {
    replay: true,
    startLine: 75,
    titleDelay: 0.1,
    lineStagger: 0.1,
    fadeDelay: 0.35,
    stagger: 0.12,
    staggerGroups: {
      '.process-track': '.process-step',
      '.contact-card': '.card-step'
    }
  };

  var TITLE_SELECTOR = '.h2-desc, h2';

  // CSS에서 .content-box를 숨겨두었으므로, 박스 자체는 먼저 보이게 하고
  // 실제 숨김/등장은 박스 안쪽 요소들에 개별로 적용합니다.
  document.querySelectorAll('.content-box').forEach(function (item) {
    item.style.opacity = 1;
    item.style.transform = 'none';
  });

  // h2 안의 내용을 <br> 기준으로 줄마다 마스크(span)로 감싸줍니다.
  function splitTitleLines(title) {
    if (!title.dataset.introSplit) {
      title.innerHTML = title.innerHTML.split(/<br\s*\/?>/i).map(function (line) {
        return '<span class="intro-line"><span class="intro-line-inner">' + line.trim() + '</span></span>';
      }).join('');
      title.dataset.introSplit = 'true';
    }
    return Array.prototype.slice.call(title.querySelectorAll('.intro-line-inner'));
  }

  // 제목(h2-desc, h2)을 제외한 "나머지 콘텐츠"를 찾습니다.
  function collectFadeItems(parent, result) {
    Array.prototype.forEach.call(parent.children, function (child) {
      if (child.matches(TITLE_SELECTOR)) return;
      if (child.querySelector(TITLE_SELECTOR)) collectFadeItems(child, result);
      else result.push(child);
    });
    return result;
  }

  // staggerGroups에 해당하는 묶음은 안쪽 항목들로 풀어서 한 줄씩 차례로 나타나게 합니다.
  function expandStaggerGroups(items) {
    var singles = [];
    var steps = [];
    items.forEach(function (item) {
      var groupSteps = null;
      Object.keys(SECTION_INTRO_OPTIONS.staggerGroups).forEach(function (groupSelector) {
        if (groupSteps) return;
        var groupEl = item.matches(groupSelector) ? item : item.querySelector(groupSelector);
        if (groupEl) groupSteps = groupEl.querySelectorAll(SECTION_INTRO_OPTIONS.staggerGroups[groupSelector]);
      });
      if (groupSteps && groupSteps.length) steps = steps.concat(Array.prototype.slice.call(groupSteps));
      else singles.push(item);
    });
    return { singles: singles, steps: steps };
  }

  // 요소에 역할 클래스와 시작 지연 시간(transition-delay)을 붙입니다.
  function markIntro(elements, className, startDelay, gap) {
    elements.forEach(function (el, i) {
      el.classList.add(className);
      el.style.transitionDelay = (startDelay + i * gap).toFixed(2) + 's';
    });
  }

  function setupSectionIntro(section) {
    var inner = section.querySelector('.section-inner');
    if (!inner) return;

    var titleLines = [];
    inner.querySelectorAll('h2').forEach(function (h2) {
      titleLines = titleLines.concat(splitTitleLines(h2));
    });
    var fade = expandStaggerGroups(collectFadeItems(inner, []));

    markIntro(Array.prototype.slice.call(inner.querySelectorAll('.h2-desc')), 'intro-desc', 0, 0);
    markIntro(titleLines, 'intro-title', SECTION_INTRO_OPTIONS.titleDelay, SECTION_INTRO_OPTIONS.lineStagger);
    markIntro(fade.singles, 'intro-fade', SECTION_INTRO_OPTIONS.fadeDelay, SECTION_INTRO_OPTIONS.stagger);
    markIntro(fade.steps, 'intro-step', SECTION_INTRO_OPTIONS.fadeDelay + 0.15, SECTION_INTRO_OPTIONS.stagger);

    // 이 클래스가 붙은 섹션만 처음에 숨김 상태가 됩니다. (JS가 동작할 때만 숨김)
    section.classList.add('intro-ready');

    // ① 섹션 윗부분이 startLine에 닿으면 재생
    var playObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        section.classList.add('is-intro-in');
        if (!SECTION_INTRO_OPTIONS.replay) playObserver.disconnect();
      });
    }, { rootMargin: '0px 0px -' + (100 - SECTION_INTRO_OPTIONS.startLine) + '% 0px', threshold: 0 });

    // ② replay일 때: 섹션이 화면에서 완전히 사라지면 전환 없이 즉시 처음 상태로 되돌림
    if (SECTION_INTRO_OPTIONS.replay) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting || !section.classList.contains('is-intro-in')) return;
          section.classList.add('is-intro-reset');   // transition 끄기
          section.classList.remove('is-intro-in');
          void section.offsetWidth;                  // 숨김 상태를 바로 적용
          section.classList.remove('is-intro-reset');
        });
      }, { threshold: 0 }).observe(section);
    }

    // 로딩 화면이 사라진 뒤부터 감시를 시작해야 첫 화면 섹션의 모션이 가려지지 않아요.
    onPageReady(function () {
      playObserver.observe(section);
    });
  }

  if (!reduceMotion && window.IntersectionObserver) {
    document.querySelectorAll('main > section:not(#main)').forEach(setupSectionIntro);
  }
  // 동작 줄이기를 켠 사용자는 위 처리를 건너뛰므로 모든 콘텐츠가 바로 보입니다.

  // ============================================================
  // 3. 메인 화면 오빗(원형 궤도) — 기술 태그가 바깥 라인을 따라 돕니다
  //    CIRCLE_OPTIONS 값만 바꾸면 궤도 크기, 도는 속도를 조절할 수 있어요. (실제 회전은 CSS가 담당)
  //    - radiusRatio    : 1.0이면 가장 바깥 원(.circle)에 정확히 맞춰짐
  //    - speedPerFrame  : 한 프레임마다 도는 각도 (숫자가 클수록 빠르게 돎)
  // ============================================================
  var CIRCLE_OPTIONS = {
    radiusRatio: 0.97,
    speedPerFrame: 0.12
  };

  var circleBox = document.querySelector('.circle-wrap');
  var circleTags = document.querySelectorAll('.circle-tag');

  // [성능] 매 프레임 JS로 좌표를 계산하던 방식 대신,
  //   태그들을 .circle-orbit 상자에 담아 상자 자체를 CSS 애니메이션으로 돌립니다.
  //   (글자는 반대로 돌려서 항상 똑바로 보이게 함)
  //   브라우저가 별도 스레드에서 처리하므로 스크롤과 다른 애니메이션에 영향을 주지 않아요.
  //   구조: .circle-orbit > .circle-tag-pos(--a: 시작 각도) > .circle-tag
  if (circleBox && circleTags.length > 0) {
    var orbitEl = document.createElement('div');
    orbitEl.className = 'circle-orbit';

    circleTags.forEach(function (tag) {
      var pos = document.createElement('div');
      pos.className = 'circle-tag-pos';
      pos.style.setProperty('--a', (parseFloat(tag.dataset.angle) || 0) + 'deg');
      pos.appendChild(tag);
      orbitEl.appendChild(pos);
    });
    circleBox.appendChild(orbitEl);

    // 옵션 값을 CSS 변수로 넘겨줍니다.
    // speedPerFrame(프레임당 각도) → 한 바퀴 도는 시간(초)으로 변환 (60fps 기준)
    circleBox.style.setProperty('--orbit-radius', (CIRCLE_OPTIONS.radiusRatio * 50) + '%');
    circleBox.style.setProperty('--orbit-duration', (360 / (CIRCLE_OPTIONS.speedPerFrame * 60)).toFixed(1) + 's');
    // reduceMotion인 경우 common.css의 동작 줄이기 규칙 때문에 회전 없이 처음 위치에 고정됩니다.
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

    // [성능] mousemove는 1초에 수십~수백 번 발생하므로,
    //   좌표만 저장해두고 화면에는 프레임당 한 번만 반영합니다.
    //   CSS 변수도 섹션 전체가 아니라 실제로 쓰는 두 요소에만 넣어서 다시 계산하는 범위를 줄였어요.
    var spotlightTargets = mainSection.querySelectorAll('.main-spotlight, .main-grid');
    var pointerX = 0;
    var pointerY = 0;
    var spotlightFrame = null;

    function applySpotlight() {
      spotlightFrame = null;
      spotlightTargets.forEach(function (el) {
        el.style.setProperty('--spotlight-x', pointerX + 'px');
        el.style.setProperty('--spotlight-y', pointerY + 'px');
      });
    }

    mainSection.addEventListener('mousemove', function (e) {
      var box = mainSection.getBoundingClientRect();
      pointerX = e.clientX - box.left;
      pointerY = e.clientY - box.top;
      if (!spotlightFrame) spotlightFrame = requestAnimationFrame(applySpotlight);
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

    var typingSection = document.getElementById('main');

    function tick() {
      // [성능] 메인이 화면 밖에 있으면 글자를 바꾸지 않고 잠시 뒤 다시 확인만 합니다.
      if (typingSection && typingSection.classList.contains('is-offscreen')) {
        setTimeout(tick, 500);
        return;
      }
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

  // 섹션 크기가 바뀔 때마다 fn을 실행합니다.
  // window resize만으로는 로딩 화면이 사라지면서 세로 스크롤바가 생기는 경우(섹션 너비가 줄어듦)를
  // 잡지 못해서, 가능하면 ResizeObserver로 섹션 자체의 크기 변화를 감시합니다.
  function watchSectionSize(section, fn) {
    if (window.ResizeObserver) {
      new ResizeObserver(debounce(fn, 100)).observe(section);
    } else {
      window.addEventListener('resize', debounce(fn, 200));
      window.addEventListener('load', fn);
    }
  }

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
        var maxLineDistanceSq = options.maxLineDistance * options.maxLineDistance;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        for (var i = 0; i < dots.length; i++) {
          for (var j = i + 1; j < dots.length; j++) {
            var dx = dots[i].x - dots[j].x;
            var dy = dots[i].y - dots[j].y;
            var distanceSq = dx * dx + dy * dy;

            // [성능] 먼저 제곱값으로 걸러서, 선을 그릴 점들만 제곱근을 계산합니다.
            if (distanceSq < maxLineDistanceSq) {
              var distance = Math.sqrt(distanceSq);
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
    watchSectionSize(section, resizeCanvas);

    // [성능] 섹션이 화면에 보일 때만 그립니다.
    runWhileVisible(section, tick);
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
      watchSectionSize(rippleSection, resizeRippleCanvas);

      // [성능] 섹션이 화면에 보일 때만 그립니다.
      runWhileVisible(rippleSection, drawRings);
    }
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
  //    - scrollingSpeed : 한 섹션을 이동하는 데 걸리는 시간(ms) — 이동이 끝나야 다음 입력을 받음
  //    - wheelQuietTime : 섹션 이동 뒤, 휠 입력이 이 시간(ms)만큼 멈춰야 다음 이동을 받음
  //                       (트랙패드의 관성 스크롤 때문에 두 칸씩 넘어가거나 덜컥거리는 것을 방지)
  //    - useWheel       : 마우스/트랙패드 휠로도 다음·이전 섹션 이동할지 여부
  //    - useTouch       : 모바일 스와이프로도 다음·이전 섹션 이동할지 여부
  //    - minWheelWidth  : 이 화면 너비 이상에서만 휠 이동을 사용 (0이면 항상 사용)
  //    - minTouchWidth  : 이 화면 너비 이상에서만 터치 스와이프 이동을 사용 (이보다 좁으면 평소처럼 자유롭게 스크롤)
  //    - minWheelDelta      : 이 값보다 작은 휠 이동은 무시 (오작동 방지)
  //    - minSwipeDistance   : 이 값(px)보다 작은 터치 스와이프는 무시 (오작동 방지)
  // ============================================================
  var FULLPAGE_OPTIONS = {
    anchors: ['main', 'about', 'skills', 'projects', 'process', 'contact'],
    scrollingSpeed: 800,
    useWheel: true,
    useTouch: true,
    minWheelWidth: 1025,
    minTouchWidth: 1025,
    minWheelDelta: 12,
    minSwipeDistance: 50,
    wheelQuietTime: 180
  };

  // anchors 목록에 있는 id로 실제 섹션 요소를 찾아둡니다.
  var fullpageSections = [];
  FULLPAGE_OPTIONS.anchors.forEach(function (id) {
    var el = document.getElementById(id);
    if (el) fullpageSections.push(el);
  });


  // 목록의 index번째 섹션으로 이동하는 함수
  // GNB 클릭, 사이드 내비 클릭, 휠 스크롤, 터치 스와이프가 전부 이 함수를 사용합니다.
  // [성능] 브라우저 기본 smooth 스크롤은 브라우저마다 속도가 달라서 잠금 시간과 어긋나고,
  //   그 틈에 다음 입력이 끼어들어 덜컥거렸어요. 그래서 이동 시간을 직접 정해서 움직이고,
  //   실제 이동이 끝나는 순간에 잠금을 풉니다.
  var scrollFrameId = null;

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function goToSection(index) {
    if (index < 0 || index >= fullpageSections.length) return; // 범위 밖이면 아무것도 하지 않음

    var root = document.documentElement;
    var startY = window.scrollY;
    var targetY = fullpageSections[index].offsetTop;
    var distance = targetY - startY;

    cancelAnimationFrame(scrollFrameId);
    if (reduceMotion || Math.abs(distance) < 2) {
      window.scrollTo(0, targetY);
      return;
    }

    isSectionMoving = true;
    root.style.scrollBehavior = 'auto'; // CSS의 scroll-behavior:smooth가 매 프레임 이동을 방해하지 않도록 잠시 끔
    var startTime = null;

    function step(now) {
      if (startTime === null) startTime = now;
      var progress = Math.min((now - startTime) / FULLPAGE_OPTIONS.scrollingSpeed, 1);
      window.scrollTo(0, startY + distance * easeInOutCubic(progress));

      if (progress < 1) {
        scrollFrameId = requestAnimationFrame(step);
      } else {
        root.style.scrollBehavior = '';
        isSectionMoving = false;
      }
    }
    scrollFrameId = requestAnimationFrame(step);
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
    var lastWheelTime = 0;
    var waitWheelQuiet = false; // true면 "휠이 잠깐 멈출 때까지" 새 이동을 받지 않음

    window.addEventListener('wheel', function (e) {
      if (window.innerWidth < FULLPAGE_OPTIONS.minWheelWidth) return;
      if (e.ctrlKey) return;                                  // 트랙패드 확대/축소 제스처는 건드리지 않음
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;    // 가로 스크롤(캐러셀 등)은 그대로 둠

      var now = performance.now();
      var gap = now - lastWheelTime;
      lastWheelTime = now;

      var current = getCurrentSectionIndex();
      var next = e.deltaY > 0 ? current + 1 : current - 1;

      // 이동할 섹션이 없으면(맨 위/맨 아래) 그냥 자연 스크롤에 맡깁니다.
      // 이렇게 해야 마지막 섹션 아래에 있는 footer까지 스크롤할 수 있어요.
      if (!isSectionMoving && (next < 0 || next >= fullpageSections.length)) return;

      // [성능] 여기부터는 작은 휠 값도 기본 스크롤을 막습니다.
      //   예전에는 작은 값이 그대로 통과해서 화면이 살짝 밀렸다가 섹션 이동이 시작되는
      //   "덜컥" 하는 느낌이 생겼어요.
      e.preventDefault();

      if (isSectionMoving) return;
      if (waitWheelQuiet && gap < FULLPAGE_OPTIONS.wheelQuietTime) return; // 관성 스크롤 꼬리는 무시
      waitWheelQuiet = false;
      if (Math.abs(e.deltaY) < FULLPAGE_OPTIONS.minWheelDelta) return;

      waitWheelQuiet = true;
      goToSection(next);
    }, { passive: false });
  }

  // ---- 9-4. 터치 스와이프로 섹션 이동 (모바일) ----
  if (!reduceMotion && FULLPAGE_OPTIONS.useTouch) {
    var touchStartX = 0;
    var touchStartY = 0;
    var swipeDirection = null; // 'vertical' 또는 'horizontal'

    window.addEventListener('touchstart', function (e) {
      if (window.innerWidth < FULLPAGE_OPTIONS.minTouchWidth) return; // 좁은 화면(폰/태블릿)에서는 자유 스크롤
      if (isSectionMoving) return;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      swipeDirection = null;
    }, { passive: true });

    window.addEventListener('touchmove', function (e) {
      if (window.innerWidth < FULLPAGE_OPTIONS.minTouchWidth) return; // 여기서 막아야 기본 스크롤이 그대로 동작해요
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
      if (window.innerWidth < FULLPAGE_OPTIONS.minTouchWidth) { swipeDirection = null; return; }
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
          // 1024px 미만에서는 CSS로 "1 / 20" 형태로 노출
          customPaging: function (slider, i) {
            return '<button type="button">' +
                    '<span class="page-current">' + (i + 1) + '</span>' +
                    '<span class="page-sep"> / </span>' +
                    '<span class="page-total">' + slider.slideCount + '</span>' +
                  '</button>';
          },
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
  // 12. Contact 이메일 주소 복사
  //     버튼의 data-email 값을 클립보드에 복사합니다.
  //     navigator.clipboard를 쓸 수 없는 환경(http, 구형 브라우저)에서는
  //     execCommand('copy')로 한 번 더 시도합니다.
  // ============================================================
  var emailCopyBtn = document.getElementById('contactEmailCopy');
  if (emailCopyBtn) {
    var emailCopyText = emailCopyBtn.querySelector('.contact-mail-copy-text');
    var emailCopyNote = document.getElementById('contactEmailCopyNote');
    var emailCopyTimer = null;

    var copyFallback = function (text) {
      var temp = document.createElement('textarea');
      temp.value = text;
      temp.setAttribute('readonly', '');
      temp.style.position = 'fixed';
      temp.style.top = '-9999px';
      document.body.appendChild(temp);
      temp.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
      document.body.removeChild(temp);
      return ok;
    };

    var showCopyResult = function (ok) {
      clearTimeout(emailCopyTimer);
      if (ok) {
        emailCopyBtn.classList.add('is-copied');
        if (emailCopyText) emailCopyText.textContent = '복사됨';
        if (emailCopyNote) emailCopyNote.textContent = '이메일 주소(' + emailCopyBtn.getAttribute('data-email') + ')를 복사했어요.';
      } else {
        if (emailCopyNote) emailCopyNote.textContent = '복사하지 못했어요. 주소를 길게 누르거나 드래그해서 직접 복사해 주세요.';
      }
      emailCopyTimer = setTimeout(function () {
        emailCopyBtn.classList.remove('is-copied');
        if (emailCopyText) emailCopyText.textContent = '주소 복사';
        if (emailCopyNote) emailCopyNote.textContent = '';
      }, 2500);
    };

    emailCopyBtn.addEventListener('click', function () {
      var email = emailCopyBtn.getAttribute('data-email');
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(email)
          .then(function () { showCopyResult(true); })
          .catch(function () { showCopyResult(copyFallback(email)); });
      } else {
        showCopyResult(copyFallback(email));
      }
    });
  }